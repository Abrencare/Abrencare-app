from datetime import datetime, timedelta
import uuid

from django.core.exceptions import ValidationError as DjangoValidationError
from django.db import IntegrityError, transaction
from django.utils import timezone

from appointments.models import Appointment
from doctors.models import Doctor
from patients.models import Patient

from .consultation_notification_service import ConsultationNotificationService
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
    Catches overlapping bookings that don't share the exact same start time
    (e.g. an existing 10:00-10:30 appointment vs. a new 10:15 request).
    The DB UniqueConstraint on Appointment only catches identical start times,
    so this check is still needed even with that constraint in place.

    `exclude_appointment_id` lets a future reschedule flow ignore the row
    it's updating.
    """
    slot_start = datetime.combine(appointment_date, appointment_time)
    slot_end = slot_start + timedelta(minutes=duration_minutes)

    conflicting = Appointment.objects.filter(
        doctor=doctor,
        appointment_date=appointment_date,
        status__in=ACTIVE_APPOINTMENT_STATUSES,
    )
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
    Jitsi, Daily, etc.). Keeping it in one function means `book_consultation`
    and `start_consultation` stay in sync and `can_join` works from the moment
    the consultation is created.
    """
    return f"https://meet.example.com/{uuid.uuid4()}"


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

    Optional choices are taken as arguments so the view doesn't have to patch
    the row afterwards. Notification is dispatched by the view, after commit.
    """
    # select_for_update serializes concurrent bookings for the same doctor,
    # so the overlap check below can't race with another request.
    doctor = Doctor.objects.select_for_update().get(pk=doctor.id)
    duration_minutes = doctor.consultation_duration

    if _has_conflict(doctor, appointment_date, appointment_time, duration_minutes):
        raise ValueError(
            "This slot is no longer available. Please choose another time."
        )

    try:
        patient = Patient.objects.get(user=user)
    except Patient.DoesNotExist:
        raise ValueError("Only patients can book consultations.")

    appointment = Appointment(
        patient=patient,
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
    # meaningful immediately, rather than staying False until a doctor starts
    # the session. `start_consultation` reuses the same URL.
    consultation = Consultation.objects.create(
        appointment=appointment,
        status=Consultation.Status.SCHEDULED,
        consultation_type=consultation_type,
        language=language,
        price=doctor.consultation_fee,
        meeting_url=_generate_meeting_url(),
    )

    return consultation


# ============================================================
# CANCEL
# ============================================================

def cancel_consultation(*, consultation, user, reason):
    if consultation.status in (
        Consultation.Status.IN_PROGRESS,
        Consultation.Status.COMPLETED,
        Consultation.Status.CANCELLED,
        Consultation.Status.NO_SHOW,
    ):
        raise ValueError(
            f"Cannot cancel a consultation with status '{consultation.status}'."
        )

    with transaction.atomic():
        consultation.status = Consultation.Status.CANCELLED
        consultation.save(update_fields=["status", "updated_at"])

        appointment = consultation.appointment
        appointment.status = Appointment.Status.CANCELLED
        appointment.cancelled_at = timezone.now()
        appointment.cancelled_by = user
        appointment.cancellation_reason = reason
        appointment.save(
            update_fields=[
                "status", "cancelled_at", "cancelled_by",
                "cancellation_reason", "updated_at",
            ]
        )

    # Notification dispatched by the view, after commit.
    return consultation


# ============================================================
# START
# ============================================================

def start_consultation(*, consultation, user):
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

    consultation.save(
        update_fields=["status", "started_at", "meeting_url", "updated_at"]
    )

    return consultation


# ============================================================
# COMPLETE
# ============================================================

def complete_consultation(*, consultation, user):
    if consultation.status != Consultation.Status.IN_PROGRESS:
        raise ValueError(
            f"Cannot complete a consultation with status '{consultation.status}'."
        )

    with transaction.atomic():
        consultation.status = Consultation.Status.COMPLETED
        consultation.ended_at = timezone.now()
        consultation.save(update_fields=["status", "ended_at", "updated_at"])

        appointment = consultation.appointment
        appointment.status = Appointment.Status.COMPLETED
        appointment.completed_at = timezone.now()
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

    prescription = Prescription.objects.create(consultation=consultation, **data)
    return prescription
