import logging

from notifications.models import NotificationType
from notifications.services.notification_service import NotificationService

logger = logging.getLogger(__name__)


def _display_name(user):
    """Readable name for a user, without assuming which name API it has."""
    if user is None:
        return ""
    getter = getattr(user, "get_full_name", None)
    name = getter() if callable(getter) else getattr(user, "full_name", "")
    return (name or "").strip() or (getattr(user, "username", "") or "")


def _provider_label(appointment):
    """
    Who the visit is with.

    Doctor visits have a Doctor. Home visits, nurse checks and lab samples
    booked from the mobile app have no doctor, only a provider name.
    """
    doctor = appointment.doctor
    if doctor is not None:
        return f"Dr. {_display_name(doctor.user)}".strip()
    return (appointment.provider_name or "").strip() or "your care team"


def _doctor_user(appointment):
    doctor = appointment.doctor
    return doctor.user if doctor is not None else None


class AppointmentNotificationService:
    """
    Central place for all appointment-related notifications.
    Keep methods small and side-effect free except for the notification itself.

    These run from transaction.on_commit, after the appointment is already
    saved. Nothing here may raise: an error would turn a successful booking
    into a 500 for the caller.
    """

    @staticmethod
    def _safe_create(**kwargs):
        """Never let notification failures break the main business action."""
        if kwargs.get("user") is None:
            return
        try:
            NotificationService.create(**kwargs)
        except Exception:
            logger.exception("Failed to create appointment notification")

    @classmethod
    def _run(cls, event, appointment, build):
        try:
            build()
        except Exception:
            logger.exception(
                "Appointment notification failed event=%s appointment_id=%s",
                event,
                getattr(appointment, "pk", None),
            )

    @classmethod
    def notify_created(cls, appointment):
        cls._run("created", appointment, lambda: cls._created(appointment))

    @classmethod
    def notify_confirmed(cls, appointment):
        cls._run("confirmed", appointment, lambda: cls._confirmed(appointment))

    @classmethod
    def notify_cancelled(cls, appointment, cancelled_by=None):
        cls._run(
            "cancelled",
            appointment,
            lambda: cls._cancelled(appointment, cancelled_by=cancelled_by),
        )

    @classmethod
    def notify_rescheduled(cls, appointment, old_date=None, old_time=None):
        cls._run(
            "rescheduled",
            appointment,
            lambda: cls._rescheduled(
                appointment, old_date=old_date, old_time=old_time
            ),
        )

    @classmethod
    def notify_completed(cls, appointment):
        cls._run("completed", appointment, lambda: cls._completed(appointment))

    @classmethod
    def notify_no_show(cls, appointment):
        cls._run("no_show", appointment, lambda: cls._no_show(appointment))

    # ------------------------------------------------------------------
    # Builders
    # ------------------------------------------------------------------

    @classmethod
    def _created(cls, appointment):
        provider = _provider_label(appointment)
        patient_name = _display_name(appointment.patient)
        when = f"{appointment.appointment_date} at {appointment.appointment_time}"

        # Patient
        cls._safe_create(
            user=appointment.patient,
            title="Appointment Scheduled",
            message=(
                f"Your appointment with {provider} "
                f"has been scheduled for {when}."
            ),
            notification_type=NotificationType.APPOINTMENT,
            data={
                "appointment_id": appointment.id,
                "event": "created",
            },
        )

        # Doctor (only when the visit has one)
        cls._safe_create(
            user=_doctor_user(appointment),
            title="New Appointment Request",
            message=(
                f"New appointment request from {patient_name} "
                f"on {when}."
            ),
            notification_type=NotificationType.APPOINTMENT,
            data={
                "appointment_id": appointment.id,
                "event": "created",
            },
        )

    @classmethod
    def _confirmed(cls, appointment):
        provider = _provider_label(appointment)
        when = f"{appointment.appointment_date} at {appointment.appointment_time}"

        cls._safe_create(
            user=appointment.patient,
            title="Appointment Confirmed",
            message=(
                f"Your appointment with {provider} "
                f"on {when} has been confirmed."
            ),
            notification_type=NotificationType.APPOINTMENT,
            data={
                "appointment_id": appointment.id,
                "event": "confirmed",
            },
        )

    @classmethod
    def _cancelled(cls, appointment, cancelled_by=None):
        provider = _provider_label(appointment)
        patient_name = _display_name(appointment.patient)
        doctor_user = _doctor_user(appointment)
        when = f"{appointment.appointment_date} at {appointment.appointment_time}"

        actor = "the clinic"
        if cancelled_by is not None:
            if cancelled_by == appointment.patient:
                actor = "you"
            elif doctor_user is not None and cancelled_by == doctor_user:
                actor = provider

        # Patient
        cls._safe_create(
            user=appointment.patient,
            title="Appointment Cancelled",
            message=(
                f"Your appointment with {provider} "
                f"on {when} has been cancelled by {actor}."
            ),
            notification_type=NotificationType.APPOINTMENT,
            data={
                "appointment_id": appointment.id,
                "event": "cancelled",
            },
        )

        # Doctor (only when the visit has one)
        cls._safe_create(
            user=doctor_user,
            title="Appointment Cancelled",
            message=(
                f"The appointment with {patient_name} "
                f"on {when} has been cancelled."
            ),
            notification_type=NotificationType.APPOINTMENT,
            data={
                "appointment_id": appointment.id,
                "event": "cancelled",
            },
        )

    @classmethod
    def _rescheduled(cls, appointment, old_date=None, old_time=None):
        provider = _provider_label(appointment)
        patient_name = _display_name(appointment.patient)
        new_when = f"{appointment.appointment_date} at {appointment.appointment_time}"

        old_when = None
        if old_date and old_time:
            old_when = f"{old_date} at {old_time}"

        message_patient = (
            f"Your appointment with {provider} "
            f"has been rescheduled to {new_when}."
        )
        if old_when:
            message_patient = (
                f"Your appointment with {provider} "
                f"has been moved from {old_when} to {new_when}."
            )

        cls._safe_create(
            user=appointment.patient,
            title="Appointment Rescheduled",
            message=message_patient,
            notification_type=NotificationType.APPOINTMENT,
            data={
                "appointment_id": appointment.id,
                "event": "rescheduled",
            },
        )

        # Doctor (only when the visit has one)
        cls._safe_create(
            user=_doctor_user(appointment),
            title="Appointment Rescheduled",
            message=(
                f"The appointment with {patient_name} "
                f"has been rescheduled to {new_when}."
            ),
            notification_type=NotificationType.APPOINTMENT,
            data={
                "appointment_id": appointment.id,
                "event": "rescheduled",
            },
        )

    @classmethod
    def _completed(cls, appointment):
        # Usually only the patient cares
        cls._safe_create(
            user=appointment.patient,
            title="Appointment Completed",
            message="Your appointment has been marked as completed.",
            notification_type=NotificationType.APPOINTMENT,
            data={
                "appointment_id": appointment.id,
                "event": "completed",
            },
        )

    @classmethod
    def _no_show(cls, appointment):
        # Optional – some clinics notify the patient
        cls._safe_create(
            user=appointment.patient,
            title="Missed Appointment",
            message=(
                "You were marked as a no-show for your recent appointment. "
                "Please contact the clinic if this is incorrect."
            ),
            notification_type=NotificationType.APPOINTMENT,
            data={
                "appointment_id": appointment.id,
                "event": "no_show",
            },
        )
