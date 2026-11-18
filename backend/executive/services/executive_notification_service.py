"""Executive-domain notifications.

Thin wrapper over the generic NotificationService. Centralises
the title / message / type vocabulary for the executive workflow
so no other module has to know them.
"""

from __future__ import annotations

import logging

from notifications.services.notification_service import (
    NotificationService,
)

logger = logging.getLogger(__name__)


class ExecutiveNotificationType:
    """All notification_type strings emitted by the executive module."""

    EMERGENCY_ACTIVATED = "emergency.activated"
    EMERGENCY_RESOLVED = "emergency.resolved"
    HEALTH_ALERT_CREATED = "health_alert.created"
    HEALTH_ALERT_FLAGGED = "health_alert.flagged"
    MEDICATION_ALERT_CREATED = "medication_alert.created"
    MEDICATION_MISSED = "medication.missed"
    UPCOMING_CARE_SOON = "upcoming_care.soon"
    REPORT_GENERATED = "report.generated"
    READING_ABNORMAL = "reading.abnormal"


class ExecutiveNotificationService:
    """Convenience methods — one per executive event."""

    # ------------------------------------------------------------------ #
    # Internal helpers
    # ------------------------------------------------------------------ #

    @staticmethod
    def _owner(profile):
        """Return the auth User who owns an ExecutiveProfile, or None."""
        return getattr(getattr(profile, "user_service", None), "user", None)

    @classmethod
    def _notify(cls, profile, *, title, message, notification_type, data=None):
        user = cls._owner(profile)
        if user is None:
            logger.warning(
                "executive.notify.no_owner profile_id=%s type=%s",
                getattr(profile, "pk", None), notification_type,
            )
            return None
        class NotificationServiceError:
            ...

        try:
            return NotificationService.create(
                user=user,
                title=title,
                message=message,
                notification_type=notification_type,
                data=data or {},
            )
        except NotificationServiceError:
            logger.exception(
                "executive.notify.failed profile_id=%s type=%s",
                getattr(profile, "pk", None), notification_type,
            )
            return None

    # ------------------------------------------------------------------ #
    # EMERGENCY
    # ------------------------------------------------------------------ #

    @classmethod
    def emergency_activated(cls, *, profile, event):
        return cls._notify(
            profile,
            title="Emergency activated",
            message=(
                f"Emergency response {event.response_id} is active. "
                f"ETA {event.eta_minutes} minutes."
            ),
            notification_type=ExecutiveNotificationType.EMERGENCY_ACTIVATED,
            data={
                "event_id": event.pk,
                "response_id": event.response_id,
                "eta_minutes": event.eta_minutes,
            },
        )

    @classmethod
    def emergency_resolved(cls, *, profile, event):
        return cls._notify(
            profile,
            title="Emergency resolved",
            message=f"Emergency response {event.response_id} is resolved.",
            notification_type=ExecutiveNotificationType.EMERGENCY_RESOLVED,
            data={
                "event_id": event.pk,
                "response_id": event.response_id,
            },
        )

    # ------------------------------------------------------------------ #
    # HEALTH ALERTS
    # ------------------------------------------------------------------ #

    @classmethod
    def health_alert_created(cls, *, profile, alert):
        """Routine info alert."""
        return cls._notify(
            profile,
            title="New health alert",
            message=alert.title,
            notification_type=ExecutiveNotificationType.HEALTH_ALERT_CREATED,
            data={
                "alert_id": alert.pk,
                "severity": alert.severity,
                "body": alert.body,
            },
        )

    @classmethod
    def health_alert_flagged(cls, *, profile, alert):
        """High-severity flag — the frontend renders this in red."""
        return cls._notify(
            profile,
            title="Attention needed",
            message=alert.title,
            notification_type=ExecutiveNotificationType.HEALTH_ALERT_FLAGGED,
            data={
                "alert_id": alert.pk,
                "severity": alert.severity,
                "body": alert.body,
            },
        )

    # ------------------------------------------------------------------ #
    # MEDICATIONS
    # ------------------------------------------------------------------ #

    @classmethod
    def medication_alert_created(cls, *, profile, alert):
        return cls._notify(
            profile,
            title="Medication alert",
            message=alert.message,
            notification_type=ExecutiveNotificationType.MEDICATION_ALERT_CREATED,
            data={
                "alert_id": alert.pk,
                "priority": alert.priority,
                "medication_id": alert.medication_id,
            },
        )

    @classmethod
    def medication_missed(cls, *, profile, schedule):
        return cls._notify(
            profile,
            title="Missed dose",
            message=(
                f"{schedule.medication.name} was not taken at "
                f"{schedule.time_label}."
            ),
            notification_type=ExecutiveNotificationType.MEDICATION_MISSED,
            data={
                "schedule_id": schedule.pk,
                "medication_id": schedule.medication_id,
                "scheduled_for": schedule.scheduled_for.isoformat(),
            },
        )

    # ------------------------------------------------------------------ #
    # CARE / REPORTS / READINGS
    # ------------------------------------------------------------------ #

    @classmethod
    def upcoming_care_soon(cls, *, profile, care, hours_until: int):
        return cls._notify(
            profile,
            title="Upcoming appointment",
            message=(
                f"{care.title} is scheduled in {hours_until} hour(s)"
                + (f" with {care.provided_by}." if care.provided_by else ".")
            ),
            notification_type=ExecutiveNotificationType.UPCOMING_CARE_SOON,
            data={
                "care_id": care.pk,
                "scheduled_for": care.scheduled_for.isoformat(),
            },
        )

    @classmethod
    def report_generated(cls, *, profile, report):
        return cls._notify(
            profile,
            title="Your report is ready",
            message=f"{report.label} — {report.range_label}",
            notification_type=ExecutiveNotificationType.REPORT_GENERATED,
            data={
                "report_id": report.pk,
                "period": report.period,
                "range": report.range_label,
            },
        )

    @classmethod
    def reading_abnormal(cls, *, profile, reading):
        return cls._notify(
            profile,
            title="Abnormal reading",
            message=(
                f"{reading.get_metric_display()} "
                f"({reading.display_value}) is {reading.status}."
            ),
            notification_type=ExecutiveNotificationType.READING_ABNORMAL,
            data={
                "reading_id": reading.pk,
                "metric": reading.metric,
                "status": reading.status,
                "value": reading.display_value,
            },
        )