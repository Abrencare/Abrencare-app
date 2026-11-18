# models.py
from decimal import Decimal

from django.conf import settings
from django.core.validators import MinValueValidator, MaxValueValidator
from django.db import models
from django.db.models import Q
from django.utils import timezone

from services.models import UserService


# ============================================================================
# SHARED ABSTRACT MODELS
# ============================================================================

class TimeStampedModel(models.Model):
    """Reusable created/updated audit fields."""

    created_at = models.DateTimeField(auto_now_add=True, db_index=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        abstract = True


class SoftDeleteQuerySet(models.QuerySet):
    def alive(self):
        return self.filter(deleted_at__isnull=True)

    def dead(self):
        return self.filter(deleted_at__isnull=False)


class SoftDeleteModel(models.Model):
    """Clinical records should rarely be hard-deleted."""

    deleted_at = models.DateTimeField(null=True, blank=True, db_index=True)

    objects = SoftDeleteQuerySet.as_manager()

    class Meta:
        abstract = True

    def soft_delete(self):
        self.deleted_at = timezone.now()
        self.save(update_fields=["deleted_at", "updated_at"])


# ============================================================================
# SHARED ENUMS  (single source of truth — avoids enum drift across models)
# ============================================================================

class Severity(models.TextChoices):
    NORMAL = "normal", "Normal"
    ELEVATED = "elevated", "Elevated"
    HIGH = "high", "High"
    LOW = "low", "Low"
    WATCH = "watch", "Watch"


class MonitorMetric(models.TextChoices):
    BP = "bp", "Blood Pressure"
    HEART_RATE = "heartRate", "Heart Rate"
    OXYGEN = "oxygen", "Oxygen"
    WEIGHT = "weight", "Weight"
    GLUCOSE = "glucose", "Glucose"
    GENERAL = "general", "General"


class MonitorFrequency(models.TextChoices):
    WEEKLY = "weekly", "Weekly"
    TWICE_WEEKLY = "twice", "Twice Weekly"
    MANAGED = "managed", "Managed"


# ============================================================================
# EXECUTIVE PROFILE
# ============================================================================

class ExecutiveProfile(TimeStampedModel, SoftDeleteModel):
    name = models.CharField(max_length=150, blank=True)
    user_service = models.OneToOneField(
        UserService,
        on_delete=models.PROTECT,
        related_name="executive_profile", 
    )
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name="created_executive_profiles",
    )
    monitoring = models.JSONField(default=list, blank=True)
    frequency = models.CharField(
        max_length=20,
        choices=MonitorFrequency.choices,
        default=MonitorFrequency.MANAGED,
    )

    class Meta:
        ordering = ["name"]
        indexes = [
            # implicit FK index on created_by already exists;
            # add one only for the (deleted_at) filter if used heavily.
            models.Index(fields=["deleted_at"]),
        ]
        constraints = [
            models.CheckConstraint(
                condition=Q(deleted_at__isnull=True) | Q(deleted_at__isnull=False),
                name="exec_profile_deleted_flag",  # placeholder, keeps migrations clean
            ),
        ]

    def __str__(self):
        # never assume user_service.user.full_name is non-null
        if self.name:
            return self.name
        user = getattr(self.user_service, "user", None)
        full_name = getattr(user, "full_name", None)
        return full_name or f"Executive #{self.pk}"


# ============================================================================
# HEALTH SCORE & ALERTS
# ============================================================================

class HealthScoreSnapshot(models.Model):
    executive_profile = models.ForeignKey(
        ExecutiveProfile,
        on_delete=models.CASCADE,
        related_name="health_scores",
    )
    score = models.PositiveSmallIntegerField(
        validators=[MinValueValidator(0), MaxValueValidator(100)],
    )
    caption = models.CharField(max_length=255, blank=True)
    # default=timezone.now so historical scores can be backfilled
    recorded_at = models.DateTimeField(default=timezone.now, db_index=True)

    class Meta:
        ordering = ["-recorded_at"]
        indexes = [models.Index(fields=["executive_profile", "-recorded_at"])]


class HealthAlert(TimeStampedModel, SoftDeleteModel):
    class SeverityChoices(models.TextChoices):
        INFO = "info", "Info"
        FLAG = "flag", "Flag"

    executive_profile = models.ForeignKey(
        ExecutiveProfile,
        on_delete=models.CASCADE,
        related_name="alerts",
    )
    severity = models.CharField(
        max_length=10,
        choices=SeverityChoices.choices,
        default=SeverityChoices.INFO,
    )
    title = models.CharField(max_length=150)
    body = models.TextField(blank=True)  # alert text is prose → TextField
    resolved = models.BooleanField(default=False, db_index=True)
    resolved_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["executive_profile", "resolved"]),
        ]
        constraints = [
            models.CheckConstraint(
                condition=(
                    Q(resolved=False, resolved_at__isnull=True)
                    | Q(resolved=True, resolved_at__isnull=False)
                ),
                name="health_alert_resolved_consistency",
            ),
        ]


# ============================================================================
# READINGS
# ============================================================================

class Reading(models.Model):
    """Metric tiles + readings card. Numeric storage, display derived."""

    Metric = MonitorMetric           # reuse the shared enum
    Status = Severity                # reuse the shared enum

    executive_profile = models.ForeignKey(
        ExecutiveProfile,
        on_delete=models.CASCADE,
        related_name="readings",
    )
    metric = models.CharField(max_length=20, choices=Metric.choices)

    # Numeric primitives — enable sorting, charting, alerting
    value_numeric = models.DecimalField(
        max_digits=8, decimal_places=2, null=True, blank=True,
    )
    value_secondary = models.DecimalField(
        max_digits=8, decimal_places=2, null=True, blank=True,
        help_text="e.g. diastolic when metric=bp",
    )
    unit = models.CharField(max_length=16, blank=True)  # mmHg, BPM, %, kg

    # Denormalized display string for the UI ("118/76", "72 BPM")
    display_value = models.CharField(max_length=32, blank=True)

    status = models.CharField(
        max_length=20, choices=Status.choices, default=Status.NORMAL,
    )
    recorded_at = models.DateTimeField(default=timezone.now, db_index=True)

    class Meta:
        ordering = ["-recorded_at"]
        indexes = [
            models.Index(fields=["executive_profile", "metric", "-recorded_at"]),
        ]

    def save(self, *args, **kwargs):
        # keep display_value coherent if it wasn't set manually
        if not self.display_value:
            self.display_value = self._build_display()
        super().save(*args, **kwargs)

    def _build_display(self) -> str:
        if self.value_numeric is None:
            return ""
        if self.value_secondary is not None:
            base = f"{self.value_numeric:g}/{self.value_secondary:g}"
        else:
            base = f"{self.value_numeric:g}"
        return f"{base} {self.unit}".strip()


# ============================================================================
# CARE TEAM / UPCOMING CARE
# ============================================================================

class CareTeamMember(TimeStampedModel):
    class Role(models.TextChoices):
        HEALTH_MANAGER = "manager", "Health Manager"
        PHYSICIAN = "physician", "Physician"
        NURSE = "nurse", "Nurse"

    executive_profile = models.ForeignKey(
        ExecutiveProfile,
        on_delete=models.CASCADE,
        related_name="care_team",
    )
    role = models.CharField(max_length=20, choices=Role.choices)
    full_name = models.CharField(max_length=150)
    title = models.CharField(max_length=150, blank=True)
    phone = models.CharField(max_length=32, blank=True)
    available = models.BooleanField(default=True)

    class Meta:
        ordering = ["role", "full_name"]
        indexes = [
            models.Index(fields=["executive_profile", "role"]),
        ]


class UpcomingCare(TimeStampedModel):
    executive_profile = models.ForeignKey(
        ExecutiveProfile,
        on_delete=models.CASCADE,
        related_name="upcoming_care",
    )
    title = models.CharField(max_length=150)
    scheduled_for = models.DateTimeField(db_index=True)
    provided_by = models.CharField(max_length=150, blank=True)

    class Meta:
        ordering = ["scheduled_for"]


# ============================================================================
# EMERGENCY
# ============================================================================

class EmergencyEvent(models.Model):
    class Status(models.TextChoices):
        ACTIVE = "active", "Active"
        RESOLVED = "resolved", "Resolved"
        CANCELLED = "cancelled", "Cancelled"

    executive_profile = models.ForeignKey(
        ExecutiveProfile,
        on_delete=models.CASCADE,
        related_name="emergency_events",
    )
    response_id = models.CharField(max_length=32, unique=True)  # "EMG-2024-0187"
    status = models.CharField(
        max_length=20, choices=Status.choices, default=Status.ACTIVE,
    )
    eta_minutes = models.PositiveSmallIntegerField(default=15)
    activated_at = models.DateTimeField(default=timezone.now, db_index=True)
    resolved_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ["-activated_at"]
        indexes = [
            models.Index(fields=["executive_profile", "status"]),
        ]
        constraints = [
            models.CheckConstraint(
                condition=(
                    Q(status="resolved", resolved_at__isnull=False)
                    | ~Q(status="resolved")
                ),
                name="emergency_resolved_requires_timestamp",
            ),
        ]

    def __str__(self):
        return f"{self.response_id} ({self.status})"


class EmergencyTimelineStep(models.Model):
    class StepStatus(models.TextChoices):
        COMPLETED = "completed", "Completed"
        CURRENT = "current", "Current"
        PENDING = "pending", "Pending"

    event = models.ForeignKey(
        EmergencyEvent,
        on_delete=models.CASCADE,
        related_name="timeline",
    )
    label = models.CharField(max_length=150)
    status = models.CharField(
        max_length=20,
        choices=StepStatus.choices,
        default=StepStatus.PENDING,
    )
    happened_at = models.DateTimeField(null=True, blank=True)
    order = models.PositiveSmallIntegerField()

    class Meta:
        ordering = ["order", "id"]
        constraints = [
            models.UniqueConstraint(
                fields=["event", "order"],
                name="emergency_step_unique_order_per_event",
            ),
        ]


# ============================================================================
# MEDICATIONS
# ============================================================================

class Medication(TimeStampedModel, SoftDeleteModel):
    executive_profile = models.ForeignKey(
        ExecutiveProfile,
        on_delete=models.CASCADE,
        related_name="medications",
    )
    name = models.CharField(max_length=150)
    purpose = models.CharField(max_length=150, blank=True)
    dosage = models.CharField(max_length=64, blank=True)
    active = models.BooleanField(default=True, db_index=True)

    class Meta:
        ordering = ["name"]
        indexes = [
            models.Index(fields=["executive_profile", "active"]),
        ]


class MedicationSchedule(models.Model):
    class Status(models.TextChoices):
        TAKEN = "taken", "Taken"
        DUE = "due", "Due"
        UPCOMING = "upcoming", "Upcoming"
        MISSED = "missed", "Missed"

    medication = models.ForeignKey(
        Medication,
        on_delete=models.CASCADE,
        related_name="schedules",
    )
    scheduled_for = models.DateTimeField(db_index=True)
    status = models.CharField(
        max_length=20,
        choices=Status.choices,
        default=Status.UPCOMING,
    )
    taken_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ["scheduled_for"]
        indexes = [
            models.Index(fields=["medication", "scheduled_for"]),
        ]
        constraints = [
            models.CheckConstraint(
                condition=(
                    Q(status="taken", taken_at__isnull=False)
                    | ~Q(status="taken")
                ),
                name="med_schedule_taken_requires_timestamp",
            ),
        ]

    @property
    def time_label(self) -> str:
        """Derived HH:MM label — replaces the stored string field."""
        local = timezone.localtime(self.scheduled_for)
        return local.strftime("%H:%M")


class MedicationAlert(TimeStampedModel, SoftDeleteModel):
    class Priority(models.TextChoices):
        HIGH = "high", "High"
        REMINDER = "reminder", "Reminder"

    executive_profile = models.ForeignKey(
        ExecutiveProfile,
        on_delete=models.CASCADE,
        related_name="medication_alerts",
    )
    medication = models.ForeignKey(
        Medication,
        on_delete=models.CASCADE,
        related_name="alerts",
        null=True,
        blank=True,
    )
    priority = models.CharField(
        max_length=20,
        choices=Priority.choices,
        default=Priority.REMINDER,
    )
    message = models.CharField(max_length=255)
    resolved = models.BooleanField(default=False, db_index=True)
    resolved_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ["-created_at"]
        constraints = [
            models.CheckConstraint(
                condition=(
                    Q(resolved=False, resolved_at__isnull=True)
                    | Q(resolved=True, resolved_at__isnull=False)
                ),
                name="med_alert_resolved_consistency",
            ),
        ]


# ============================================================================
# HEALTH PROGRAMME
# ============================================================================

class HealthProgrammeItem(TimeStampedModel):
    class Status(models.TextChoices):
        ON = "on", "On"
        SOON = "soon", "Soon"
        BOOKED = "booked", "Booked"
        ON_TRACK = "track", "On Track"
        SCHEDULED = "scheduled", "Scheduled"

    executive_profile = models.ForeignKey(
        ExecutiveProfile,
        on_delete=models.CASCADE,
        related_name="programme_items",
    )
    title = models.CharField(max_length=150)
    subtitle = models.CharField(max_length=200, blank=True)
    status = models.CharField(
        max_length=20,
        choices=Status.choices,
        default=Status.SCHEDULED,
    )
    icon_key = models.CharField(max_length=32, blank=True)
    order = models.PositiveSmallIntegerField(default=0)
    next_due = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ["order", "title"]
        indexes = [
            models.Index(fields=["executive_profile", "order"]),
        ]


# ============================================================================
# REPORTS
# ============================================================================

class LabResult(models.Model):
    Tone = Severity  # reuse shared enum

    executive_profile = models.ForeignKey(
        ExecutiveProfile,
        on_delete=models.CASCADE,
        related_name="lab_results",
    )
    category = models.CharField(max_length=80)   # "Metabolic"
    name = models.CharField(max_length=150)      # "HbA1c"
    value = models.CharField(max_length=64)      # "5.6 %" (display)
    value_numeric = models.DecimalField(
        max_digits=10, decimal_places=3, null=True, blank=True,
    )
    unit = models.CharField(max_length=16, blank=True)
    tone = models.CharField(
        max_length=20, choices=Tone.choices, default=Tone.NORMAL,
    )
    recorded_at = models.DateTimeField(default=timezone.now, db_index=True)

    class Meta:
        ordering = ["-recorded_at"]
        indexes = [
            models.Index(fields=["executive_profile", "category", "-recorded_at"]),
        ]


class WeeklyReport(models.Model):
    class Period(models.TextChoices):
        WEEK = "week", "Week"
        MONTH = "month", "Month"

    executive_profile = models.ForeignKey(
        ExecutiveProfile,
        on_delete=models.CASCADE,
        related_name="reports",
    )
    period = models.CharField(
        max_length=10, choices=Period.choices, default=Period.WEEK,
    )

    # explicit boundaries — the reliable uniqueness key
    period_start = models.DateField()
    period_end = models.DateField()

    label = models.CharField(max_length=80)          # "WEEKLY HEALTH REPORT"
    range_label = models.CharField(max_length=80)    # display only
    physician_name = models.CharField(max_length=150, blank=True)
    nurse_name = models.CharField(max_length=150, blank=True)
    last_reviewed = models.DateTimeField(null=True, blank=True)

    status_title = models.CharField(max_length=120, blank=True)
    status_summary = models.TextField(blank=True)

    # Free-form arrays matching the frontend contract exactly
    vitals = models.JSONField(default=list, blank=True)
    trends = models.JSONField(default=list, blank=True)
    highlights = models.JSONField(default=list, blank=True)
    next_steps = models.JSONField(default=list, blank=True)

    generated_at = models.DateTimeField(auto_now_add=True, db_index=True)

    class Meta:
        ordering = ["-generated_at"]
        constraints = [
            models.UniqueConstraint(
                fields=["executive_profile", "period", "period_start"],
                name="weekly_report_unique_period_start",
            ),
            models.CheckConstraint(
                condition=Q(period_end__gte=models.F("period_start")),
                name="weekly_report_period_end_after_start",
            ),
        ]