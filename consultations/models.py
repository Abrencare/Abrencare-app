# consultations/models.py
from datetime import datetime, timedelta

from django.conf import settings
from django.core.exceptions import ValidationError
from django.db import models
from django.utils import timezone

from appointments.models import Appointment
from services.models import UserService


class ConsultationProfile(models.Model):
    """
    Per-user onboarding state for the consultation service.

    One row per UserService(code='consultation'). Created by
    `_bootstrap_profile` at signup. Filled in by onboarding.

    NOTE: `onboarded_at` uses `auto_now_add=True`, so it is populated
    the moment the row is created. That means `is_onboarded` is True
    as soon as the profile exists. If you later want "onboarding
    completed" semantics, add a separate boolean/field rather than
    changing this one.
    """

    class Gender(models.TextChoices):
        MALE = "male", "Male"
        FEMALE = "female", "Female"
        OTHER = "other", "Other"
        PREFER_NOT = "prefer_not", "Prefer not to say"

    user_service = models.OneToOneField(
        UserService,
        on_delete=models.CASCADE,
        related_name="consultation_profile",
    )

    date_of_birth = models.DateField(null=True, blank=True)
    gender = models.CharField(
        max_length=20,
        choices=Gender.choices,
        blank=True,
        default="",
    )
    onboarded_at = models.DateTimeField(auto_now_add=True, null=True, blank=True)

    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="+",
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"ConsultationProfile<user_service={self.user_service_id}>"

    @property
    def is_onboarded(self) -> bool:
        return self.onboarded_at is not None

    @property
    def user(self):
        return self.user_service.user


class Consultation(models.Model):
    """A single appointment-backed consultation. N per user."""

    class Type(models.TextChoices):
        VIDEO = "video", "Video"
        AUDIO = "audio", "Audio"

    class Language(models.TextChoices):
        ENGLISH = "en", "English"
        AMHARIC = "am", "Amharic"

    class Status(models.TextChoices):
        SCHEDULED = "scheduled", "Scheduled"
        WAITING = "waiting", "Waiting"
        IN_PROGRESS = "in_progress", "In Progress"
        COMPLETED = "completed", "Completed"
        CANCELLED = "cancelled", "Cancelled"
        NO_SHOW = "no_show", "No Show"

    ACTIVE_STATUSES = (Status.SCHEDULED, Status.WAITING, Status.IN_PROGRESS)
    JOIN_EARLY_MINUTES = 10
    JOIN_LATE_MINUTES = 30

    # Allowed status transitions. Enforced in `clean()`.
    ALLOWED_TRANSITIONS = {
        Status.SCHEDULED: {Status.WAITING, Status.IN_PROGRESS, Status.CANCELLED, Status.NO_SHOW},
        Status.WAITING: {Status.IN_PROGRESS, Status.CANCELLED, Status.NO_SHOW},
        Status.IN_PROGRESS: {Status.COMPLETED, Status.CANCELLED},
        Status.COMPLETED: set(),
        Status.CANCELLED: set(),
        Status.NO_SHOW: set(),
    }

    appointment = models.OneToOneField(
        Appointment,
        on_delete=models.CASCADE,
        related_name="consultation",
    )

    consultation_type = models.CharField(
        max_length=20,
        choices=Type.choices,
        default=Type.VIDEO,
    )
    language = models.CharField(
        max_length=10,
        choices=Language.choices,
        default=Language.ENGLISH,
    )
    status = models.CharField(
        max_length=20,
        choices=Status.choices,
        default=Status.SCHEDULED,
        db_index=True,
    )
    price = models.DecimalField(max_digits=10, decimal_places=2)
    currency = models.CharField(max_length=3, default="ETB")
    meeting_url = models.URLField(blank=True)
    started_at = models.DateTimeField(null=True, blank=True)
    ended_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["status", "created_at"]),
        ]

    def __str__(self):
        return f"Consultation #{self.pk} ({self.status})"

    # ------------------------------------------------------------------
    # Validation
    # ------------------------------------------------------------------
    def clean(self):
        super().clean()
        if self.pk and self.status:
            previous = (
                type(self).objects
                .filter(pk=self.pk)
                .values_list("status", flat=True)
                .first()
            )
            if previous and previous != self.status:
                allowed = self.ALLOWED_TRANSITIONS.get(previous, set())
                if self.status not in allowed:
                    raise ValidationError(
                        {"status": f"Cannot transition from '{previous}' to '{self.status}'."}
                    )

    # ------------------------------------------------------------------
    # Convenience accessors
    # ------------------------------------------------------------------
    @property
    def user(self):
        """The owning user, reached via the appointment chain."""
        return self.appointment.user_service.user

    # ------------------------------------------------------------------
    # Scheduling helpers
    # ------------------------------------------------------------------
    @property
    def starts_at(self):
        """
        Aware datetime of the appointment start, or None if the
        appointment lacks a date/time.
        """
        appt = self.appointment
        if not appt or not appt.appointment_date or not appt.appointment_time:
            return None
        naive = datetime.combine(appt.appointment_date, appt.appointment_time)
        if timezone.is_naive(naive):
            return timezone.make_aware(naive, timezone.get_current_timezone())
        return naive

    @property
    def ends_at(self):
        start = self.starts_at
        if start is None:
            return None
        # Assumes a fixed default duration; adjust if duration lives on Appointment.
        return start + timedelta(minutes=30)

    # ------------------------------------------------------------------
    # State helpers
    # ------------------------------------------------------------------
    @property
    def is_active(self) -> bool:
        return self.status in self.ACTIVE_STATUSES

    @property
    def can_join(self) -> bool:
        if not self.is_active or not self.meeting_url:
            return False
        if self.status == self.Status.IN_PROGRESS:
            return True
        start = self.starts_at
        if start is None:
            return False
        now = timezone.now()
        return (
            start - timedelta(minutes=self.JOIN_EARLY_MINUTES)
            <= now
            <= start + timedelta(minutes=self.JOIN_LATE_MINUTES)
        )

    @property
    def can_cancel(self) -> bool:
        return self.status in (self.Status.SCHEDULED, self.Status.WAITING)


class Prescription(models.Model):
    consultation = models.ForeignKey(
        Consultation,
        on_delete=models.CASCADE,
        related_name="prescriptions",
    )

    medication = models.CharField(max_length=200)
    dosage = models.CharField(max_length=100)
    frequency = models.CharField(max_length=100)
    duration = models.CharField(max_length=100)
    instructions = models.TextField(blank=True, default="")

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"Prescription #{self.pk} for Consultation #{self.consultation_id}"