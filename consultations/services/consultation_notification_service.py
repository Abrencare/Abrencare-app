# consultations/services/consultation_notification_service.py
"""
Owns every notification the Consultation module sends.

The service layer (consultations/services/services.py) calls one method here
per lifecycle event instead of building titles/messages/payloads inline. That
keeps:

  * copy and payload shape in one place, and
  * the state-machine functions focused on *what changed* rather than
    *how it is announced*.

Each method is a thin wrapper around
``notifications.services.notification_service.NotificationService.create``,
which is itself ``@transaction.atomic`` and defers the websocket push to
``transaction.on_commit``. Calling these from inside an outer
``@transaction.atomic`` block in the service layer is therefore safe: nothing
is broadcast if the outer transaction rolls back.
"""

from __future__ import annotations

from typing import TYPE_CHECKING

from notifications.services.notification_service import NotificationService

if TYPE_CHECKING:
    from consultations.models import Consultation, Prescription
    from accounts.models import User  # adjust to your actual user import


class ConsultationNotificationType:
    """
    Wire values for ``Notification.notification_type``.

    Centralized so the frontend guide and any future notification-preferences
    UI can reference the same constants this service uses, instead of
    duplicating string literals.
    """

    CONSULTATION_BOOKED = "consultation_booked"
    CONSULTATION_CANCELLED = "consultation_cancelled"
    CONSULTATION_STARTED = "consultation_started"
    CONSULTATION_COMPLETED = "consultation_completed"
    PRESCRIPTION_ADDED = "prescription_added"

    # Reserved for when the `waiting` status and a join endpoint exist.
    CONSULTATION_WAITING = "consultation_waiting"
    # Reserved for when a no-show sweep exists.
    CONSULTATION_NO_SHOW = "consultation_no_show"


class ConsultationNotificationService:
    """
    One classmethod per consultation lifecycle event.

    Call these from ``consultations.services.services`` at the point of each
    state transition, *after* the state has been persisted.
    """

    # ------------------------------------------------------------------
    # INTERNAL HELPERS
    # ------------------------------------------------------------------
    @staticmethod
    def _patient_user(consultation):
        return consultation.appointment.patient 

    @staticmethod
    def _doctor_user(consultation: "Consultation") -> "User":
        return consultation.appointment.doctor

    @staticmethod
    def _format_when(consultation: "Consultation") -> str:
        appt = consultation.appointment
        return f"{appt.appointment_date} at {appt.appointment_time}"

    # ------------------------------------------------------------------
    # LIFECYCLE EVENTS
    # ------------------------------------------------------------------
    @classmethod
    def consultation_booked(cls, consultation: "Consultation"):
        """Notify the doctor that a patient booked a consultation."""
        appointment = consultation.appointment
        patient_name = appointment.patient.user.full_name

        return NotificationService.create(
            user=cls._doctor_user(consultation),
            title="New consultation booked",
            message=(
                f"{patient_name} booked a {consultation.consultation_type} "
                f"consultation on {cls._format_when(consultation)}."
            ),
            notification_type=ConsultationNotificationType.CONSULTATION_BOOKED,
            data={
                "consultation_id": consultation.id,
                "appointment_date": str(appointment.appointment_date),
                "appointment_time": str(appointment.appointment_time),
                "consultation_type": consultation.consultation_type,
            },
        )

    @classmethod
    def consultation_cancelled(
        cls,
        consultation: "Consultation",
        *,
        cancelled_by: "User",
        reason: str = "",
    ):
        """
        Notify the other party that a consultation was cancelled.

        ``cancelled_by`` is the User who cancelled it — the notification goes
        to whichever side did NOT cancel, so a future doctor-initiated cancel
        notifies the patient instead of always notifying the doctor.
        """
        appointment = consultation.appointment
        patient_user = appointment.patient.user
        doctor_user = appointment.doctor.user

        if cancelled_by == patient_user:
            recipient = doctor_user
            canceller_label = "The patient"
        else:
            recipient = patient_user
            canceller_label = "The doctor"

        message = (
            f"{canceller_label} cancelled the consultation on "
            f"{cls._format_when(consultation)}."
        )
        if reason:
            message = f"{message} Reason: {reason}"

        return NotificationService.create(
            user=recipient,
            title="Consultation cancelled",
            message=message,
            notification_type=ConsultationNotificationType.CONSULTATION_CANCELLED,
            data={
                "consultation_id": consultation.id,
                "reason": reason,
                "cancelled_by_user_id": cancelled_by.id,
            },
        )

    @classmethod
    def consultation_started(cls, consultation: "Consultation"):
        """Notify the patient that the doctor has started the session."""
        doctor_name = consultation.appointment.doctor.user.full_name

        return NotificationService.create(
            user=cls._patient_user(consultation),
            title="Your consultation has started",
            message=(
                f"Dr. {doctor_name} is ready for your "
                f"{consultation.consultation_type} consultation."
            ),
            notification_type=ConsultationNotificationType.CONSULTATION_STARTED,
            data={
                "consultation_id": consultation.id,
                "meeting_url": consultation.meeting_url,
                "consultation_type": consultation.consultation_type,
            },
        )

    @classmethod
    def consultation_completed(cls, consultation: "Consultation"):
        """Notify the patient that the session has ended."""
        return NotificationService.create(
            user=cls._patient_user(consultation),
            title="Consultation completed",
            message=(
                "Your consultation has ended. "
                "Check your prescriptions if any were issued."
            ),
            notification_type=ConsultationNotificationType.CONSULTATION_COMPLETED,
            data={"consultation_id": consultation.id},
        )

    @classmethod
    def prescription_added(
        cls,
        consultation: "Consultation",
        prescription: "Prescription",
    ):
        """Notify the patient that a prescription was added."""
        return NotificationService.create(
            user=cls._patient_user(consultation),
            title="New prescription added",
            message=(
                f"{prescription.medication} was added to your consultation record."
            ),
            notification_type=ConsultationNotificationType.PRESCRIPTION_ADDED,
            data={
                "consultation_id": consultation.id,
                "prescription_id": prescription.id,
                "medication": prescription.medication,
            },
        )