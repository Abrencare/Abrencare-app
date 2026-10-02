"""Business logic for the executive workflow.

Rules of thumb:
- Views never touch the ORM directly.
- Services own writes; Selectors own reads.
- Everything that mutates more than one row is @transaction.atomic.
- Every write that has a corresponding notification emits it *after*
  the row is persisted. NotificationService defers the actual broadcast
  via transaction.on_commit, so nothing is sent for a rolled-back tx.
"""

from __future__ import annotations

import logging
from dataclasses import dataclass
from datetime import timedelta
from typing import Iterable, Sequence

from django.db import transaction
from django.db.models import Max, Q
from django.utils import timezone

from .exceptions import ExecutiveProfileMissing
from services.models import UserService

from ..models import (
    CareTeamMember,
    EmergencyEvent,
    EmergencyTimelineStep,
    ExecutiveProfile,
    HealthAlert,
    HealthProgrammeItem,
    HealthScoreSnapshot,
    MedicationAlert,
    MedicationSchedule,
    MonitorFrequency,
    Reading,
    UpcomingCare,
    WeeklyReport,
)
from .executive_notification_service import ExecutiveNotificationService

logger = logging.getLogger(__name__)


# ============================================================================
# EXCEPTIONS
# ============================================================================

class ExecutiveServiceError(Exception):
    """Raised by services for any domain-level failure."""

    def __init__(self, message: str, *, code: str = "executive_error"):
        super().__init__(message)
        self.code = code


class ExecutiveNotEnrolled(ExecutiveServiceError):
    def __init__(self, message="User is not enrolled in the executive service."):
        super().__init__(message, code="not_enrolled")

class ExecutiveProfileExists(ExecutiveServiceError):
    def __init__(self, message="Executive profile already exists."):
        super().__init__(message, code="profile_exists")


# ============================================================================
# NOTIFICATION HELPER
# ============================================================================

def _notify(fn, **kwargs) -> None:
    """Fire-and-log. Notification failures must never roll back medical writes."""
    try:
        fn(**kwargs)
    except Exception:  # noqa: BLE001 — deliberately broad
        logger.exception(
            "executive.notify.failed fn=%s profile_id=%s",
            fn.__qualname__, getattr(kwargs.get("profile"), "pk", None),
        )


# ============================================================================
# WRITE SERVICE — PROFILE & ONBOARDING
# ============================================================================

class ExecutiveProfileService:
    """All mutations on the executive profile + onboarding."""

    # ------------------------------------------------------------------ #
    # Internal helpers
    # ------------------------------------------------------------------ #

    @staticmethod
    def _get_user_service(user, *, lock: bool = False) -> UserService:
        qs = UserService.objects.select_related("user", "service").filter(
            user=user, service__code="executive",
        )
        if lock:
            qs = qs.select_for_update()
        us = qs.first()
        if us is None:
            raise ExecutiveNotEnrolled()
        return us

    # ------------------------------------------------------------------ #
    # Onboarding writes
    # ------------------------------------------------------------------ #

    @classmethod
    @transaction.atomic
    def save_profile(
        cls, *, user, date_of_birth, gender: str, height_cm, weight_kg,
    ) -> ExecutiveProfile:
        us = cls._get_user_service(user, lock=True)

        profile, created = (
            ExecutiveProfile.objects
            .select_for_update()
            .get_or_create(
                user_service=us,
                defaults={"created_by": user, "name": user.full_name or ""},
            )
        )

        user_updates = []
        for field, value in (
            ("date_of_birth", date_of_birth),
            ("gender", gender),
            ("height", height_cm),
            ("weight", weight_kg),
        ):
            if getattr(user, field) != value:
                setattr(user, field, value)
                user_updates.append(field)
        if user_updates:
            user.save(update_fields=user_updates)

        if not profile.name and user.full_name:
            profile.name = user.full_name
            profile.save(update_fields=["name", "updated_at"])

        logger.info(
            "executive.profile.saved user_id=%s created=%s", user.pk, created,
        )
        return profile

    @classmethod
    @transaction.atomic
    def save_care(
        cls, *, user, monitoring: Sequence[str], frequency: str | None,
    ) -> ExecutiveProfile:
        us = cls._get_user_service(user, lock=True)

        profile = (
            ExecutiveProfile.objects
            .select_for_update()
            .filter(user_service=us)
            .first()
        )
        if profile is None:
            raise ExecutiveProfileMissing(
                "Profile must be created before saving care preferences."
            )

        profile.monitoring = list(monitoring)
        profile.frequency = frequency or MonitorFrequency.MANAGED
        profile.save(update_fields=["monitoring", "frequency", "updated_at"])

        logger.info(
            "executive.care.saved user_id=%s metrics=%s freq=%s",
            user.pk, profile.monitoring, profile.frequency,
        )
        return profile

    @classmethod
    @transaction.atomic
    def mark_onboarded(cls, *, user) -> UserService:
        us = cls._get_user_service(user, lock=True)
        if not us.onboarded:
            us.onboarded = True
            us.save(update_fields=["onboarded"])
            logger.info("executive.onboarded user_id=%s", user.pk)
        return us

    # ------------------------------------------------------------------ #
    # Emergency state
    # ------------------------------------------------------------------ #

    @classmethod
    @transaction.atomic
    def activate_emergency(
        cls,
        *,
        user,
        response_id: str,
        eta_minutes: int = 15,
        timeline: Iterable[dict] | None = None,
    ) -> EmergencyEvent:
        profile = Selector.get_profile_for_user(user)

        if EmergencyEvent.objects.filter(
            executive_profile=profile, status=EmergencyEvent.Status.ACTIVE,
        ).exists():
            raise ExecutiveServiceError(
                "An emergency event is already active.",
                code="emergency_active",
            )

        event = EmergencyEvent.objects.create(
            executive_profile=profile,
            response_id=response_id,
            eta_minutes=eta_minutes,
            status=EmergencyEvent.Status.ACTIVE,
        )

        steps = list(timeline or [])
        if steps:
            EmergencyTimelineStep.objects.bulk_create([
                EmergencyTimelineStep(
                    event=event,
                    label=step["label"],
                    status=step.get(
                        "status", EmergencyTimelineStep.StepStatus.PENDING,
                    ),
                    order=step.get("order", i),
                    happened_at=step.get("happened_at"),
                )
                for i, step in enumerate(steps)
            ])

        logger.warning(
            "executive.emergency.activated user_id=%s response_id=%s",
            user.pk, response_id,
        )

        # 🔔 notify after persistence
        _notify(
            ExecutiveNotificationService.emergency_activated,
            profile=profile, event=event,
        )
        return event

    @classmethod
    @transaction.atomic
    def resolve_emergency(cls, *, user, response_id: str) -> EmergencyEvent:
        profile = Selector.get_profile_for_user(user)

        event = (
            EmergencyEvent.objects
            .select_for_update()
            .filter(
                executive_profile=profile,
                response_id=response_id,
                status=EmergencyEvent.Status.ACTIVE,
            )
            .first()
        )
        if event is None:
            raise ExecutiveServiceError(
                "No active emergency event with that response id.",
                code="emergency_not_found",
            )

        event.status = EmergencyEvent.Status.RESOLVED
        event.resolved_at = timezone.now()
        event.save(update_fields=["status", "resolved_at"])

        logger.warning(
            "executive.emergency.resolved user_id=%s response_id=%s",
            user.pk, response_id,
        )

        _notify(
            ExecutiveNotificationService.emergency_resolved,
            profile=profile, event=event,
        )
        return event

    # ------------------------------------------------------------------ #
    # Alerts
    # ------------------------------------------------------------------ #

    @classmethod
    @transaction.atomic
    def create_health_alert(
        cls,
        *,
        user,
        title: str,
        body: str = "",
        severity: str = HealthAlert.SeverityChoices.INFO,
    ) -> HealthAlert:
        profile = Selector.get_profile_for_user(user)

        alert = HealthAlert.objects.create(
            executive_profile=profile,
            severity=severity,
            title=title,
            body=body,
        )

        logger.info(
            "executive.health_alert.created user_id=%s alert_id=%s severity=%s",
            user.pk, alert.pk, severity,
        )

        # Route by severity — flag is louder
        if severity == HealthAlert.SeverityChoices.FLAG:
            _notify(
                ExecutiveNotificationService.health_alert_flagged,
                profile=profile, alert=alert,
            )
        else:
            _notify(
                ExecutiveNotificationService.health_alert_created,
                profile=profile, alert=alert,
            )
        return alert

    @classmethod
    @transaction.atomic
    def resolve_health_alert(cls, *, user, alert_id: int) -> HealthAlert:
        profile = Selector.get_profile_for_user(user)

        alert = (
            HealthAlert.objects
            .select_for_update()
            .filter(pk=alert_id, executive_profile=profile)
            .first()
        )
        if alert is None:
            raise ExecutiveServiceError("Alert not found.", code="alert_not_found")

        if not alert.resolved:
            alert.resolved = True
            alert.resolved_at = timezone.now()
            alert.save(update_fields=["resolved", "resolved_at", "updated_at"])

        # No notification on resolve — the UI just stops showing it.
        return alert

    @classmethod
    @transaction.atomic
    def create_medication_alert(
        cls,
        *,
        user,
        message: str,
        priority: str = MedicationAlert.Priority.REMINDER,
        medication_id: int | None = None,
    ) -> MedicationAlert:
        profile = Selector.get_profile_for_user(user)

        alert = MedicationAlert.objects.create(
            executive_profile=profile,
            medication_id=medication_id,
            priority=priority,
            message=message,
        )

        logger.info(
            "executive.med_alert.created user_id=%s alert_id=%s priority=%s",
            user.pk, alert.pk, priority,
        )

        _notify(
            ExecutiveNotificationService.medication_alert_created,
            profile=profile, alert=alert,
        )
        return alert

    @classmethod
    @transaction.atomic
    def resolve_medication_alert(
        cls, *, user, alert_id: int,
    ) -> MedicationAlert:
        profile = Selector.get_profile_for_user(user)

        alert = (
            MedicationAlert.objects
            .select_for_update()
            .filter(pk=alert_id, executive_profile=profile)
            .first()
        )
        if alert is None:
            raise ExecutiveServiceError("Alert not found.", code="alert_not_found")

        if not alert.resolved:
            alert.resolved = True
            alert.resolved_at = timezone.now()
            alert.save(update_fields=["resolved", "resolved_at", "updated_at"])
        return alert

    # ------------------------------------------------------------------ #
    # Medication adherence
    # ------------------------------------------------------------------ #

    @classmethod
    @transaction.atomic
    def mark_schedule_taken(
        cls, *, user, schedule_id: int,
    ) -> MedicationSchedule:
        profile = Selector.get_profile_for_user(user)

        schedule = (
            MedicationSchedule.objects
            .select_for_update()
            .select_related("medication")
            .filter(pk=schedule_id, medication__executive_profile=profile)
            .first()
        )
        if schedule is None:
            raise ExecutiveServiceError(
                "Medication schedule not found.", code="schedule_not_found",
            )

        if schedule.status == MedicationSchedule.Status.TAKEN:
            return schedule

        schedule.status = MedicationSchedule.Status.TAKEN
        schedule.taken_at = timezone.now()
        schedule.save(update_fields=["status", "taken_at"])

        # No notification on "taken" — it's a positive action.
        return schedule

    @classmethod
    @transaction.atomic
    def mark_schedule_missed(
        cls, *, user, schedule_id: int,
    ) -> MedicationSchedule:
        """Explicit — missed doses don't auto-fire on status change
        unless this service is called (typically by a scheduled task)."""
        profile = Selector.get_profile_for_user(user)

        schedule = (
            MedicationSchedule.objects
            .select_for_update()
            .select_related("medication")
            .filter(pk=schedule_id, medication__executive_profile=profile)
            .first()
        )
        if schedule is None:
            raise ExecutiveServiceError(
                "Medication schedule not found.", code="schedule_not_found",
            )

        if schedule.status == MedicationSchedule.Status.MISSED:
            return schedule

        schedule.status = MedicationSchedule.Status.MISSED
        schedule.save(update_fields=["status"])

        logger.info(
            "executive.med_schedule.missed user_id=%s schedule_id=%s",
            user.pk, schedule.pk,
        )

        _notify(
            ExecutiveNotificationService.medication_missed,
            profile=profile, schedule=schedule,
        )
        return schedule

    # ------------------------------------------------------------------ #
    # Readings
    # ------------------------------------------------------------------ #

    @classmethod
    @transaction.atomic
    def create_reading(
        cls,
        *,
        user,
        metric: str,
        value_numeric=None,
        value_secondary=None,
        unit: str = "",
        display_value: str = "",
        status: str = Reading.Status.NORMAL,
        recorded_at=None,
    ) -> Reading:
        profile = Selector.get_profile_for_user(user)

        reading = Reading.objects.create(
            executive_profile=profile,
            metric=metric,
            value_numeric=value_numeric,
            value_secondary=value_secondary,
            unit=unit,
            display_value=display_value,
            status=status,
            recorded_at=recorded_at or timezone.now(),
        )

        logger.info(
            "executive.reading.created user_id=%s reading_id=%s metric=%s status=%s",
            user.pk, reading.pk, metric, status,
        )

        # Only abnormal readings generate noise.
        if status not in (Reading.Status.NORMAL, Reading.Status.WATCH):
            _notify(
                ExecutiveNotificationService.reading_abnormal,
                profile=profile, reading=reading,
            )
        return reading

    # ------------------------------------------------------------------ #
    # Upcoming care
    # ------------------------------------------------------------------ #

    @classmethod
    @transaction.atomic
    def add_upcoming_care(
        cls, *, user, title: str, scheduled_for, provided_by: str = "",
    ) -> UpcomingCare:
        profile = Selector.get_profile_for_user(user)

        care = UpcomingCare.objects.create(
            executive_profile=profile,
            title=title,
            scheduled_for=scheduled_for,
            provided_by=provided_by,
        )
        logger.info(
            "executive.upcoming_care.created user_id=%s care_id=%s",
            user.pk, care.pk,
        )
        # No notification on creation — reminders are sent by a scheduled
        # task that calls `notify_upcoming_care` below.
        return care

    @classmethod
    def notify_upcoming_care(cls, *, care: UpcomingCare) -> None:
        """Called by a cron/celery task ~24h before `scheduled_for`."""
        now = timezone.now()
        if care.scheduled_for <= now:
            return
        hours = int((care.scheduled_for - now).total_seconds() // 3600)
        _notify(
            ExecutiveNotificationService.upcoming_care_soon,
            profile=care.executive_profile, care=care, hours_until=hours,
        )

    # ------------------------------------------------------------------ #
    # Reports
    # ------------------------------------------------------------------ #

    @classmethod
    @transaction.atomic
    def create_weekly_report(
        cls,
        *,
        user,
        period: str,
        period_start,
        period_end,
        label: str,
        range_label: str,
        **extra,
    ) -> WeeklyReport:
        profile = Selector.get_profile_for_user(user)

        report = WeeklyReport.objects.create(
            executive_profile=profile,
            period=period,
            period_start=period_start,
            period_end=period_end,
            label=label,
            range_label=range_label,
            **extra,
        )

        logger.info(
            "executive.report.created user_id=%s report_id=%s period=%s",
            user.pk, report.pk, period,
        )

        _notify(
            ExecutiveNotificationService.report_generated,
            profile=profile, report=report,
        )
        return report


# ============================================================================
# WRITE SERVICE — CARE TEAM
# ============================================================================

class CareTeamService:

    @classmethod
    @transaction.atomic
    def add_member(
        cls,
        *,
        user,
        role: str,
        full_name: str,
        title: str = "",
        phone: str = "",
        available: bool = True,
    ) -> CareTeamMember:
        profile = Selector.get_profile_for_user(user)
        return CareTeamMember.objects.create(
            executive_profile=profile,
            role=role,
            full_name=full_name,
            title=title,
            phone=phone,
            available=available,
        )

    @classmethod
    @transaction.atomic
    def update_member(cls, *, user, member_id: int, **fields) -> CareTeamMember:
        profile = Selector.get_profile_for_user(user)
        member = (
            CareTeamMember.objects
            .select_for_update()
            .filter(pk=member_id, executive_profile=profile)
            .first()
        )
        if member is None:
            raise ExecutiveServiceError("Care team member not found.")

        allowed = {"role", "full_name", "title", "phone", "available"}
        updates = []
        for k, v in fields.items():
            if k in allowed and getattr(member, k) != v:
                setattr(member, k, v)
                updates.append(k)
        if updates:
            member.save(update_fields=[*updates, "updated_at"])
        return member

    @classmethod
    @transaction.atomic
    def remove_member(cls, *, user, member_id: int) -> None:
        profile = Selector.get_profile_for_user(user)
        deleted, _ = CareTeamMember.objects.filter(
            pk=member_id, executive_profile=profile,
        ).delete()
        if not deleted:
            raise ExecutiveServiceError("Care team member not found.")


# ============================================================================
# SELECTORS — READ-ONLY QUERIES
# ============================================================================

class Selector:
    """Read-only queries. No writes; safe to cache; easy to test."""

    # ------------------------------------------------------------------ #
    # Profile lookup
    # ------------------------------------------------------------------ #

    @staticmethod
    def get_profile_for_user(user) -> ExecutiveProfile:
        profile = (
            ExecutiveProfile.objects
            .select_related("user_service__user", "created_by")
            .filter(user_service__user=user)
            .first()
        )
        if profile is None:
            raise ExecutiveProfileMissing()
        return profile

    @staticmethod
    def get_profile_for_user_or_none(user) -> ExecutiveProfile | None:
        try:
            return Selector.get_profile_for_user(user)
        except ExecutiveProfileMissing:
            return None

    # ------------------------------------------------------------------ #
    # Dashboard aggregate
    # ------------------------------------------------------------------ #

    @dataclass(frozen=True)
    class DashboardBundle:
        profile: ExecutiveProfile
        score: HealthScoreSnapshot | None
        info_alert: HealthAlert | None
        flag_alert: HealthAlert | None
        manager: CareTeamMember | None
        physician: CareTeamMember | None
        readings: list[Reading]
        last_monitored_at: object | None
        up_to_date: bool
        upcoming_care: UpcomingCare | None

    @staticmethod
    def build_dashboard(user, *, freshness_days: int = 2) -> "Selector.DashboardBundle":
        profile = Selector.get_profile_for_user(user)
        selected_metrics = [str(m) for m in (profile.monitoring or [])]

        readings = Selector._latest_readings_per_metric(profile, selected_metrics)
        last_at = max((r.recorded_at for r in readings), default=None)
        up_to_date = bool(
            last_at and last_at >= timezone.now() - timedelta(days=freshness_days)
        )

        return Selector.DashboardBundle(
            profile=profile,
            score=profile.health_scores.first(),
            info_alert=(
                profile.alerts
                .filter(resolved=False, severity=HealthAlert.SeverityChoices.INFO)
                .first()
            ),
            flag_alert=(
                profile.alerts
                .filter(resolved=False, severity=HealthAlert.SeverityChoices.FLAG)
                .first()
            ),
            manager=(
                profile.care_team
                .filter(role=CareTeamMember.Role.HEALTH_MANAGER)
                .first()
            ),
            physician=(
                profile.care_team
                .filter(role=CareTeamMember.Role.PHYSICIAN)
                .first()
            ),
            readings=readings,
            last_monitored_at=last_at,
            up_to_date=up_to_date,
            upcoming_care=(
                profile.upcoming_care
                .filter(scheduled_for__gte=timezone.now())
                .first()
            ),
        )

    @staticmethod
    def _latest_readings_per_metric(
        profile: ExecutiveProfile, metrics: list[str],
    ) -> list[Reading]:
        """Portable: one subquery per metric, no distinct-on dependency."""
        if not metrics:
            return []

        latest_ts = (
            Reading.objects
            .filter(executive_profile=profile, metric__in=metrics)
            .values("metric")
            .annotate(latest=Max("recorded_at"))
        )
        latest_map = {row["metric"]: row["latest"] for row in latest_ts}
        if not latest_map:
            return []

        q = Q()
        for metric, ts in latest_map.items():
            q |= Q(metric=metric, recorded_at=ts)

        rows = (
            Reading.objects
            .filter(executive_profile=profile)
            .filter(q)
            .order_by("-recorded_at")
        )

        by_metric: dict[str, Reading] = {}
        for r in rows:
            by_metric.setdefault(r.metric, r)
        return [by_metric[m] for m in metrics if m in by_metric]

    # ------------------------------------------------------------------ #
    # Emergency
    # ------------------------------------------------------------------ #

    @staticmethod
    def get_active_emergency(user) -> EmergencyEvent | None:
        profile = Selector.get_profile_for_user_or_none(user)
        if profile is None:
            return None
        return (
            EmergencyEvent.objects
            .filter(
                executive_profile=profile,
                status=EmergencyEvent.Status.ACTIVE,
            )
            .prefetch_related("timeline")
            .order_by("-activated_at")
            .first()
        )

    @staticmethod
    def get_care_team_members(user) -> list[CareTeamMember]:
        profile = Selector.get_profile_for_user_or_none(user)
        if profile is None:
            return []
        return list(profile.care_team.all())

    # ------------------------------------------------------------------ #
    # Programme
    # ------------------------------------------------------------------ #

    @dataclass(frozen=True)
    class ProgrammeBundle:
        medications: list[MedicationSchedule]
        medication_alerts: list[MedicationAlert]
        programme_items: list[HealthProgrammeItem]
        physician: CareTeamMember | None
        taken_count: int
        medication_count: int
        on_track_count: int
        programme_count: int

    @staticmethod
    def build_programme(user) -> "Selector.ProgrammeBundle":
        profile = Selector.get_profile_for_user(user)

        medications = list(
            MedicationSchedule.objects
            .select_related("medication")
            .filter(
                medication__executive_profile=profile,
                medication__active=True,
                medication__deleted_at__isnull=True,
            )
            .order_by("scheduled_for")
        )
        alerts = list(
            MedicationAlert.objects
            .select_related("medication")
            .filter(executive_profile=profile, resolved=False)
            .order_by("-created_at")
        )
        items = list(
            profile.programme_items.all().order_by("order", "title")
        )
        physician = (
            profile.care_team
            .filter(role=CareTeamMember.Role.PHYSICIAN)
            .first()
        )

        taken_count = sum(
            1 for m in medications
            if m.status == MedicationSchedule.Status.TAKEN
        )
        on_track_count = sum(
            1 for i in items if i.status != HealthProgrammeItem.Status.SOON
        )

        return Selector.ProgrammeBundle(
            medications=medications,
            medication_alerts=alerts,
            programme_items=items,
            physician=physician,
            taken_count=taken_count,
            medication_count=len(medications),
            on_track_count=on_track_count,
            programme_count=len(items),
        )

    # ------------------------------------------------------------------ #
    # Reports
    # ------------------------------------------------------------------ #

    @dataclass(frozen=True)
    class ReportBundle:
        report: WeeklyReport | None
        available_periods: list[str]

    @staticmethod
    def build_report(
        user, *, period: str = WeeklyReport.Period.WEEK,
    ) -> "Selector.ReportBundle":
        profile = Selector.get_profile_for_user(user)
        report = (
            profile.reports
            .filter(period=period)
            .order_by("-generated_at")
            .first()
        )
        return Selector.ReportBundle(
            report=report,
            available_periods=[c.value for c in WeeklyReport.Period],
        )