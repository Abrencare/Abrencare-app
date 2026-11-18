# consultations/services/services.py
from datetime import datetime, timedelta
import uuid

from django.core.exceptions import ValidationError as DjangoValidationError
from django.db import IntegrityError, transaction
from django.utils import timezone

from appointments.models import Appointment
from doctors.models import Doctor
from patients.models import Patient

from ..models import Consultation, Prescription


ACTIVE_APPOINTMENT_STATUSES = [
    Appointment.Status.PENDING,
    Appointment.Status.CONFIRMED,
]


# ============================================================
# INTERNAL HELPERS
# ============================================================

def _has_conflict(
    doctor,
    appointment_date,
    appointment_time,
    duration_minutes,
    *,
    exclude_appointment_id=None,
):
    """
    Detects overlapping bookings that don't share the exact same start time.

    The DB UniqueConstraint on Appointment only catches identical start times,
    so an existing 10:00–10:30 vs. a new 10:15 request still needs this check.

    `exclude_appointment_id` lets a future reschedule flow ignore the row
    it's updating.
    """
    slot_start = datetime.combine(appointment_date, appointment_time)
    slot_end = slot_start + timedelta(minutes=duration_minutes)

    conflicting = Appointment.objects.filter(
        doctor=doctor,
        appointment_date=appointment_date,
        status__in=ACTIVE_APPOINTMENT_STATUSES,
    ).only("id", "appointment_time", "duration_minutes")

    if exclude_appointment_id is not None:
        conflicting = conflicting.exclude(pk=exclude_appointment_id)

    for appointment in conflicting:
        existing_start = datetime.combine(
            appointment_date, appointment.appointment_time
        )
        existing_end = existing_start + timedelta(
            minutes=appointment.duration_minutes
        )
        if slot_start < existing_end and slot_end > existing_start:
            return True

    return False


def _generate_meeting_url() -> str:
    """
    Single place that produces a meeting URL.

    Replace the body with your provider's room-creation call (Zoom, Whereby,
    Jitsi, Daily, etc.). Keeping it here means `book_consultation` and
    `start_consultation` stay in sync and `can_join` is meaningful from the
    moment the consultation is created.
    """
    return f"https://meet.example.com/{uuid.uuid4()}"


def _get_patient_for(user):
    try:
        return Patient.objects.select_related("user").get(user=user)
    except Patient.DoesNotExist:
        raise ValueError("Only patients can book consultations.")


# ============================================================
# BOOK
# ============================================================

@transaction.atomic
def book_consultation(
    *,
    user,
    doctor,
    appointment_date,
    appointment_time,
    consultation_type=Consultation.Type.VIDEO,
    language=Consultation.Language.ENGLISH,
    reason_for_visit="",
):
    """
    Creates the Appointment + Consultation in one transaction.

    Optional choices are taken as keyword arguments so the view doesn't
    have to patch the row afterwards. Notification is dispatched by the view,
    after commit.
    """
    # Serialize concurrent bookings for the same doctor so the overlap check
    # below can't race with another request.
    doctor = (
        Doctor.objects
        .select_for_update()
        .select_related("user", "specialty")
        .get(pk=doctor.pk)
    )
    duration_minutes = doctor.consultation_duration

    if _has_conflict(doctor, appointment_date, appointment_time, duration_minutes):
        raise ValueError(
            "This slot is no longer available. Please choose another time."
        )

    appointment = Appointment(
        patient=user,
        doctor=doctor,
        appointment_date=appointment_date,
        appointment_time=appointment_time,
        duration_minutes=duration_minutes,
        status=Appointment.Status.CONFIRMED,
        confirmed_at=timezone.now(),
        reason_for_visit=reason_for_visit or "",
    )

    try:
        appointment.full_clean()
    except DjangoValidationError as exc:
        raise ValueError(exc.message_dict) from exc

    try:
        appointment.save()
    except IntegrityError:
        raise ValueError(
            "This slot was just booked by someone else. Please choose another time."
        )

    # `meeting_url` is populated at creation so `Consultation.can_join` is
    # meaningful immediately. `start_consultation` reuses the same URL.
    consultation = Consultation.objects.create(
        appointment=appointment,
        status=Consultation.Status.SCHEDULED,
        consultation_type=consultation_type,
        language=language,
        price=doctor.consultation_fee,
        currency="ETB",
        meeting_url=_generate_meeting_url(),
    )

    return consultation


# ============================================================
# CANCEL
# ============================================================

def cancel_consultation(*, consultation, user, reason=""):
    """
    Cancels the consultation and its underlying appointment.

    Uses the model's `ALLOWED_TRANSITIONS` indirectly via `full_clean()`
    so the transition rules live in one place.
    """
    with transaction.atomic():
        consultation = (
            Consultation.objects
            .select_for_update()
            .select_related("appointment")
            .get(pk=consultation.pk)
        )

        if consultation.status not in (
            Consultation.Status.SCHEDULED,
            Consultation.Status.WAITING,
        ):
            raise ValueError(
                f"Cannot cancel a consultation with status '{consultation.status}'."
            )

        consultation.status = Consultation.Status.CANCELLED
        consultation.full_clean()
        consultation.save(update_fields=["status", "updated_at"])

        appointment = consultation.appointment
        appointment.status = Appointment.Status.CANCELLED
        appointment.cancelled_at = timezone.now()
        appointment.cancelled_by = user
        appointment.cancellation_reason = reason or ""
        appointment.save(
            update_fields=[
                "status",
                "cancelled_at",
                "cancelled_by",
                "cancellation_reason",
                "updated_at",
            ]
        )

    return consultation


# ============================================================
# START
# ============================================================

def start_consultation(*, consultation, user):
    with transaction.atomic():
        consultation = (
            Consultation.objects
            .select_for_update()
            .select_related("appointment")
            .get(pk=consultation.pk)
        )

        if consultation.status not in (
            Consultation.Status.SCHEDULED,
            Consultation.Status.WAITING,
        ):
            raise ValueError(
                f"Cannot start a consultation with status '{consultation.status}'."
            )

        if consultation.appointment.status != Appointment.Status.CONFIRMED:
            raise ValueError("The underlying appointment is not confirmed.")

        consultation.status = Consultation.Status.IN_PROGRESS
        consultation.started_at = timezone.now()

        # Reuse the URL minted at booking; only generate if it's somehow blank.
        if not consultation.meeting_url:
            consultation.meeting_url = _generate_meeting_url()

        consultation.full_clean()
        consultation.save(
            update_fields=[
                "status",
                "started_at",
                "meeting_url",
                "updated_at",
            ]
        )

    return consultation


# ============================================================
# COMPLETE
# ============================================================

def complete_consultation(*, consultation, user):
    with transaction.atomic():
        consultation = (
            Consultation.objects
            .select_for_update()
            .select_related("appointment")
            .get(pk=consultation.pk)
        )

        if consultation.status != Consultation.Status.IN_PROGRESS:
            raise ValueError(
                f"Cannot complete a consultation with status '{consultation.status}'."
            )

        now = timezone.now()
        consultation.status = Consultation.Status.COMPLETED
        consultation.ended_at = now
        consultation.full_clean()
        consultation.save(update_fields=["status", "ended_at", "updated_at"])

        appointment = consultation.appointment
        appointment.status = Appointment.Status.COMPLETED
        appointment.completed_at = now
        appointment.save(update_fields=["status", "completed_at", "updated_at"])

    return consultation


# ============================================================
# PRESCRIPTION
# ============================================================

def create_prescription(*, consultation, doctor, data):
    if consultation.appointment.doctor_id != doctor.id:
        raise ValueError(
            "You are not authorized to prescribe for this consultation."
        )

    if consultation.status not in (
        Consultation.Status.IN_PROGRESS,
        Consultation.Status.COMPLETED,
    ):
        raise ValueError(
            "Prescriptions can only be created during or after the consultation."
        )

    return Prescription.objects.create(consultation=consultation, **data)