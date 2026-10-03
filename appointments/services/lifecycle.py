from django.db import transaction
from django.utils import timezone

from ..exceptions import (
    AppointmentNotBookable,
    InvalidAppointmentTransition,
)
from ..models import Appointment
from .appointment_notification_service import AppointmentNotificationService

FINAL_STATUSES = (
    Appointment.Status.COMPLETED,
    Appointment.Status.CANCELLED,
    Appointment.Status.NO_SHOW,
)


# ---------------------------------------------------------------------------
# Simple transitions
# ---------------------------------------------------------------------------

def _transition(appointment, *, from_status, to_status, timestamp_field=None, notifier=None):
    if appointment.status != from_status:
        raise InvalidAppointmentTransition(
            f"Cannot transition from {appointment.status} to {to_status}."
        )

    appointment.status = to_status
    update_fields = ["status", "updated_at"]
    if timestamp_field:
        setattr(appointment, timestamp_field, timezone.now())
        update_fields.append(timestamp_field)

    appointment.save(update_fields=update_fields)

    if notifier:
        transaction.on_commit(lambda: getattr(AppointmentNotificationService, notifier)(appointment))
    return appointment


def confirm_appointment(appointment):
    return _transition(
        appointment,
        from_status=Appointment.Status.PENDING,
        to_status=Appointment.Status.CONFIRMED,
        timestamp_field="confirmed_at",
        notifier="notify_confirmed",
    )


def complete_appointment(appointment):
    return _transition(
        appointment,
        from_status=Appointment.Status.CONFIRMED,
        to_status=Appointment.Status.COMPLETED,
        timestamp_field="completed_at",
        notifier="notify_completed",
    )


def mark_no_show(appointment):
    return _transition(
        appointment,
        from_status=Appointment.Status.CONFIRMED,
        to_status=Appointment.Status.NO_SHOW,
        notifier="notify_no_show",
    )


# ---------------------------------------------------------------------------
# Cancellation
# ---------------------------------------------------------------------------

@transaction.atomic
def cancel_appointment(*, appointment, user, reason=""):
    """
    Soft-cancel. If a consultation is attached, cancel that too so both
    records stay in sync.
    """
    if appointment.status in FINAL_STATUSES:
        raise InvalidAppointmentTransition(
            "This appointment cannot be cancelled."
        )

    consultation = getattr(appointment, "consultation", None)
    if consultation is not None:
        return _cancel_via_consultation(
            appointment=appointment, consultation=consultation, user=user, reason=reason
        )

    appointment.status = Appointment.Status.CANCELLED
    appointment.cancelled_at = timezone.now()
    appointment.cancelled_by = user
    appointment.cancellation_reason = reason
    appointment.save(
        update_fields=[
            "status",
            "cancelled_at",
            "cancelled_by",
            "cancellation_reason",
            "updated_at",
        ]
    )

    transaction.on_commit(
        lambda: AppointmentNotificationService.notify_cancelled(
            appointment, cancelled_by=user
        )
    )
    return appointment


def _cancel_via_consultation(*, appointment, consultation, user, reason):
    # Lazy imports: consultations imports appointments.models.
    from consultations.services.consultation_notification_service import (
        ConsultationNotificationService,
    )
    from consultations.services.services import cancel_consultation

    try:
        consultation = cancel_consultation(
            consultation=consultation, user=user, reason=reason
        )
    except ValueError as exc:
        raise AppointmentNotBookable(str(exc)) from exc

    transaction.on_commit(
        lambda: ConsultationNotificationService.consultation_cancelled(consultation)
    )
    appointment.refresh_from_db()
    return appointment


# ---------------------------------------------------------------------------
# Reschedule guard: consultations cannot be moved
# ---------------------------------------------------------------------------

def assert_reschedulable(appointment):
    if appointment.status not in (
        Appointment.Status.PENDING,
        Appointment.Status.CONFIRMED,
    ):
        raise InvalidAppointmentTransition(
            "Only pending or confirmed appointments can be rescheduled."
        )
    if getattr(appointment, "consultation", None) is not None:
        raise InvalidAppointmentTransition(
            "Consultations cannot be rescheduled. Cancel and book a new one."
        )
    