# appointments/services/appointment_payment_hooks.py
import logging

from appointments.models import Appointment

logger = logging.getLogger(__name__)


def on_appointment_paid(appointment: Appointment, payment) -> None:
    """
    A successful payment confirms the appointment, if it was still pending.
    """
    if appointment.status != Appointment.Status.PENDING:
        return

    appointment.status = Appointment.Status.CONFIRMED
    appointment.save(update_fields=["status", "updated_at"])
    logger.info(
        "Appointment %s confirmed after payment %s",
        appointment.pk, payment.reference,
    )