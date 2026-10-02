from django.core.exceptions import ValidationError
from django.db import IntegrityError, transaction
from django.utils import timezone

from ..exceptions import AppointmentNotBookable, AppointmentSlotTaken
from ..models import Appointment
from .appointment_notification_service import AppointmentNotificationService


def _translate_validation_error(exc: ValidationError) -> AppointmentNotBookable:
    errors = getattr(exc, "message_dict", None) or {"detail": exc.messages}
    return AppointmentNotBookable(errors=errors)


@transaction.atomic
def book_appointment(
    *,
    patient,
    appointment_type,
    appointment_date,
    appointment_time,
    duration_minutes,
    doctor=None,
    provider_name="",
    reason_for_visit="",
    reminder_minutes=None,
    auto_confirm=True,
) -> Appointment:
    """
    Create an appointment. Auto-confirms when the provider's calendar
    already guarantees the slot is valid.

    Raises AppointmentNotBookable or AppointmentSlotTaken.
    """
    status = Appointment.initial_status_for(
        appointment_type, auto_confirm=auto_confirm
    )

    appointment = Appointment(
        patient=patient,
        doctor=doctor,
        appointment_type=appointment_type,
        appointment_date=appointment_date,
        appointment_time=appointment_time,
        duration_minutes=duration_minutes,
        provider_name=provider_name,
        reason_for_visit=reason_for_visit,
        reminder_minutes=reminder_minutes,
        status=status,
    )

    try:
        appointment.full_clean()
    except ValidationError as exc:
        raise _translate_validation_error(exc) from exc

    try:
        appointment.save(skip_clean=True)
    except IntegrityError as exc:
        raise AppointmentSlotTaken(
            "The selected appointment slot is no longer available."
        ) from exc

    transaction.on_commit(
        lambda: AppointmentNotificationService.notify_created(appointment)
    )
    return appointment


@transaction.atomic
def reschedule_appointment(
    *,
    appointment: Appointment,
    appointment_date,
    appointment_time,
    reason_for_visit: str | None = None,
) -> Appointment:
    """
    Move an appointment to a new slot. Confirmed appointments drop back
    to pending so the doctor can re-confirm.
    """
    old_date, old_time = appointment.appointment_date, appointment.appointment_time

    appointment.appointment_date = appointment_date
    appointment.appointment_time = appointment_time
    if reason_for_visit:
        appointment.reason_for_visit = reason_for_visit

    if appointment.status == Appointment.Status.CONFIRMED:
        appointment.status = Appointment.Status.PENDING
        appointment.confirmed_at = None

    try:
        appointment.full_clean()
    except ValidationError as exc:
        raise _translate_validation_error(exc) from exc

    try:
        appointment.save(skip_clean=True)
    except IntegrityError as exc:
        raise AppointmentSlotTaken(
            "The selected appointment slot is no longer available."
        ) from exc

    transaction.on_commit(
        lambda: AppointmentNotificationService.notify_rescheduled(
            appointment, old_date=old_date, old_time=old_time
        )
    )
    return appointment