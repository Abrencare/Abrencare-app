from django.db import models
from django.conf import settings
from services.models import UserService


class MonitorMetric(models.TextChoices):
    BP = "bp", "Blood Pressure"
    HEART_RATE = "heartRate", "Heart Rate"
    OXYGEN = "oxygen", "Oxygen"
    WEIGHT = "weight", "Weight"
    GLUCOSE = "glucose", "Glucose"
    GENERAL = "general", "General"

class MonitorFrequency(models.TextChoices):
    WEEKLY = "weekly", "Weekly"
    TWICE = "twice", "Twice"
    MANAGED = "managed", "Managed"

class ExecutiveProfile(models.Model):
    name = models.CharField(max_length=150, null=True)
    user_service = models.OneToOneField(
        UserService,
        on_delete=models.PROTECT,
        related_name="executive_profiles"
    )
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name="created_executive_profiles",
    )
    monitoring = models.JSONField(default=list, blank=True)
    frequency = models.CharField(
        max_length=20, choices=MonitorFrequency.choices,
        default=MonitorFrequency.MANAGED,
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["name"]
        indexes = [
            models.Index(fields=["created_by"]),
        ]

    def __str__(self):
        return self.user_service.user.full_name


class HealthScoreSnapshot(models.Model):
    executive_profile = models.ForeignKey(
        ExecutiveProfile, on_delete=models.CASCADE,
        related_name="health_scores",
    )
    score = models.PositiveSmallIntegerField()
    caption = models.CharField(max_length=255, blank=True)
    recorded_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-recorded_at"]


class HealthAlert(models.Model):
    class Severity(models.TextChoices):
        INFO = "info", "Info"
        FLAG = "flag", "Flag"

    executive_profile = models.ForeignKey(
        ExecutiveProfile, on_delete=models.CASCADE,
        related_name="alerts",
    )
    severity = models.CharField(
        max_length=10, choices=Severity.choices, default=Severity.INFO,
    )
    title = models.CharField(max_length=150)
    body = models.CharField(max_length=255, blank=True)
    resolved = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]


class Reading(models.Model):
    """Powers the metric tiles + readings card on ExecutiveOverview."""

    class Metric(models.TextChoices):
        BP = "bp", "Blood Pressure"
        HEART_RATE = "heartRate", "Heart Rate"
        OXYGEN = "oxygen", "Oxygen"
        WEIGHT = "weight", "Weight"
        GLUCOSE = "glucose", "Glucose"

    class Status(models.TextChoices):
        NORMAL = "normal", "Normal"
        ELEVATED = "elevated", "Elevated"
        HIGH = "high", "High"
        LOW = "low", "Low"
        WATCH = "watch", "Watch"

    executive_profile = models.ForeignKey(
        ExecutiveProfile, on_delete=models.CASCADE,
        related_name="readings",
    )
    metric = models.CharField(max_length=20, choices=Metric.choices)
    value = models.CharField(max_length=32)          # "118/76", "72 BPM", "98%"
    status = models.CharField(
        max_length=20, choices=Status.choices, default=Status.NORMAL,
    )
    recorded_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-recorded_at"]
        indexes = [models.Index(fields=["executive_profile", "metric"])]


class CareTeamMember(models.Model):
    """Powers the health-manager card + physician card."""

    class Role(models.TextChoices):
        HEALTH_MANAGER = "manager", "Health Manager"
        PHYSICIAN = "physician", "Physician"
        NURSE = "nurse", "Nurse"

    executive_profile = models.ForeignKey(
        ExecutiveProfile, on_delete=models.CASCADE,
        related_name="care_team",
    )
    role = models.CharField(max_length=20, choices=Role.choices)
    full_name = models.CharField(max_length=150)
    title = models.CharField(max_length=150, blank=True)   # "Cardiologist"
    phone = models.CharField(max_length=20, blank=True)
    available = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["role", "full_name"]


class UpcomingCare(models.Model):
    """Powers the 'Upcoming care' card."""

    executive_profile = models.ForeignKey(
        ExecutiveProfile, on_delete=models.CASCADE,
        related_name="upcoming_care",
    )
    title = models.CharField(max_length=150)
    scheduled_for = models.DateTimeField()
    provided_by = models.CharField(max_length=150, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["scheduled_for"]


# ============================================================================
# EMERGENCY
# ============================================================================

class EmergencyEvent(models.Model):
    """Powers executive/emergency.tsx (the red hero + status card)."""

    class Status(models.TextChoices):
        ACTIVE = "active", "Active"
        RESOLVED = "resolved", "Resolved"
        CANCELLED = "cancelled", "Cancelled"

    executive_profile = models.ForeignKey(
        ExecutiveProfile, on_delete=models.CASCADE,
        related_name="emergency_events",
    )
    response_id = models.CharField(max_length=32, unique=True)  # "EMG-2024-0187"
    status = models.CharField(
        max_length=20, choices=Status.choices, default=Status.ACTIVE,
    )
    eta_minutes = models.PositiveSmallIntegerField(default=15)
    activated_at = models.DateTimeField(auto_now_add=True)
    resolved_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ["-activated_at"]
        indexes = [models.Index(fields=["executive_profile", "status"])]

    def __str__(self):
        return f"{self.response_id} ({self.status})"


class EmergencyTimelineStep(models.Model):
    """One row per line in the timeline card on the emergency screen."""

    class StepStatus(models.TextChoices):
        COMPLETED = "completed", "Completed"
        CURRENT = "current", "Current"
        PENDING = "pending", "Pending"

    event = models.ForeignKey(
        EmergencyEvent, on_delete=models.CASCADE,
        related_name="timeline",
    )
    label = models.CharField(max_length=150)     # "Family notified"
    status = models.CharField(
        max_length=20, choices=StepStatus.choices, default=StepStatus.PENDING,
    )
    happened_at = models.DateTimeField(null=True, blank=True)
    order = models.PositiveSmallIntegerField(default=0)

    class Meta:
        ordering = ["order", "id"]


# ============================================================================
# MEDICATIONS
# ============================================================================

class Medication(models.Model):
    """A prescribed drug. Feeds ExecutiveProgramme.medications."""

    executive_profile = models.ForeignKey(
        ExecutiveProfile, on_delete=models.CASCADE,
        related_name="medications",
    )
    name = models.CharField(max_length=150)
    purpose = models.CharField(max_length=150, blank=True)  # "Blood pressure"
    dosage = models.CharField(max_length=64, blank=True)    # "10mg"
    active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["name"]


class MedicationSchedule(models.Model):
    """A scheduled dose — the row inside 'Today's medications'."""

    class Status(models.TextChoices):
        TAKEN = "taken", "Taken"
        DUE = "due", "Due"
        UPCOMING = "upcoming", "Upcoming"
        MISSED = "missed", "Missed"

    medication = models.ForeignKey(
        Medication, on_delete=models.CASCADE,
        related_name="schedules",
    )
    time_label = models.CharField(max_length=16)   # "08:00"
    status = models.CharField(
        max_length=20, choices=Status.choices, default=Status.UPCOMING,
    )
    scheduled_for = models.DateTimeField(null=True, blank=True)
    taken_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ["scheduled_for", "time_label"]


class MedicationAlert(models.Model):
    """Red/amber banners under 'Medication alerts'."""

    class Priority(models.TextChoices):
        HIGH = "high", "High"
        REMINDER = "reminder", "Reminder"

    executive_profile = models.ForeignKey(
        ExecutiveProfile, on_delete=models.CASCADE,
        related_name="medication_alerts",
    )
    medication = models.ForeignKey(
        Medication, on_delete=models.CASCADE,
        related_name="alerts", null=True, blank=True,
    )
    priority = models.CharField(
        max_length=20, choices=Priority.choices, default=Priority.REMINDER,
    )
    message = models.CharField(max_length=255)
    created_at = models.DateTimeField(auto_now_add=True)
    resolved = models.BooleanField(default=False)

    class Meta:
        ordering = ["-created_at"]


# ============================================================================
# HEALTH PROGRAMME ITEMS
# ============================================================================

class HealthProgrammeItem(models.Model):
    """Each row in the 'Health programme' list card."""

    class Status(models.TextChoices):
        ON = "on", "On"
        SOON = "soon", "Soon"
        BOOKED = "booked", "Booked"
        ON_TRACK = "track", "On Track"
        SCHEDULED = "scheduled", "Scheduled"

    executive_profile = models.ForeignKey(
        ExecutiveProfile, on_delete=models.CASCADE,
        related_name="programme_items",
    )
    title = models.CharField(max_length=150)       # "Vital Monitoring"
    subtitle = models.CharField(max_length=200, blank=True)
    status = models.CharField(
        max_length=20, choices=Status.choices, default=Status.SCHEDULED,
    )
    icon_key = models.CharField(max_length=32, blank=True)  # "pulse-outline"
    order = models.PositiveSmallIntegerField(default=0)
    next_due = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ["order", "title"]


# ============================================================================
# REPORTS
# ============================================================================

class LabResult(models.Model):
    """One row in the 'Lab summary' card of ExecutiveReports."""

    class Tone(models.TextChoices):
        NORMAL = "normal", "Normal"
        ELEVATED = "elevated", "Elevated"
        HIGH = "high", "High"
        LOW = "low", "Low"
        WATCH = "watch", "Watch"

    executive_profile = models.ForeignKey(
        ExecutiveProfile, on_delete=models.CASCADE,
        related_name="lab_results",
    )
    category = models.CharField(max_length=80)     # "Metabolic"
    name = models.CharField(max_length=150)        # "HbA1c"
    value = models.CharField(max_length=64)        # "5.6 %"
    tone = models.CharField(
        max_length=20, choices=Tone.choices, default=Tone.NORMAL,
    )
    recorded_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-recorded_at"]
        indexes = [models.Index(fields=["executive_profile", "category"])]


class WeeklyReport(models.Model):
    """Snapshotted report for a given period (week/month).

    Trends, highlights, and next-steps are stored as JSON so the payload
    shape can evolve with the frontend without migrations.
    """

    class Period(models.TextChoices):
        WEEK = "week", "Week"
        MONTH = "month", "Month"

    executive_profile = models.ForeignKey(
        ExecutiveProfile, on_delete=models.CASCADE,
        related_name="reports",
    )
    period = models.CharField(
        max_length=10, choices=Period.choices, default=Period.WEEK,
    )
    label = models.CharField(max_length=80)         # "WEEKLY HEALTH REPORT"
    range_label = models.CharField(max_length=80)   # "Nov 11 – Nov 17, 2024"
    physician_name = models.CharField(max_length=150, blank=True)
    nurse_name = models.CharField(max_length=150, blank=True)
    last_reviewed = models.DateTimeField(null=True, blank=True)

    status_title = models.CharField(max_length=120, blank=True)
    status_summary = models.TextField(blank=True)

    # Free-form arrays matching the frontend shape exactly
    vitals = models.JSONField(default=list, blank=True)
    trends = models.JSONField(default=list, blank=True)
    highlights = models.JSONField(default=list, blank=True)
    next_steps = models.JSONField(default=list, blank=True)

    generated_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-generated_at"]
        unique_together = ("executive_profile", "period", "range_label")
        