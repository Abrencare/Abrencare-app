# consultations/models.py
from django.conf import settings
from django.db import models
from django.utils import timezone

from datetime import datetime, timedelta

from appointments.models import Appointment
from services.models import UserService


class ConsultationProfile(models.Model):
    """
    Per-user onboarding state for the consultation service.

    One row per UserService(code='consultation'). Created by
    `_bootstrap_profile` at signup. Filled in by onboarding.
    """

    GENDER_CHOICES = [
        ("male", "Male"),
        ("female", "Female"),
        ("other", "Other"),
        ("prefer_not", "Prefer not to say"),
    ]

    user_service = models.OneToOneField(
        UserService,
        on_delete=models.CASCADE,
        related_name="consultation_profile",
    )

    date_of_birth = models.DateField(null=True, blank=True)
    gender = models.CharField(
        max_length=20, choices=GENDER_CHOICES, blank=True, default=""
    )
    onboarded_at = models.DateTimeField(auto_now_add=True, null=True, blank=True)

    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True, blank=True, related_name="+",
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    @property
    def is_onboarded(self) -> bool:
        return self.onboarded_at is not None


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

    # Remove the OneToOneField to UserService. Keep only the appointment FK.
    appointment = models.OneToOneField(
        Appointment,
        on_delete=models.CASCADE,
        related_name="consultation",
    )

    consultation_type = models.CharField(
        max_length=20, choices=Type.choices, default=Type.VIDEO
    )
    language = models.CharField(
        max_length=10, choices=Language.choices, default=Language.ENGLISH
    )
    status = models.CharField(
        max_length=20, choices=Status.choices,
        default=Status.SCHEDULED, db_index=True,
    )
    price = models.DecimalField(max_digits=10, decimal_places=2)
    currency = models.CharField(max_length=3, default="ETB")
    meeting_url = models.URLField(blank=True)
    started_at = models.DateTimeField(null=True, blank=True)
    ended_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = [
            "-appointment__appointment_date",
            "-appointment__appointment_time",
        ]

    def __str__(self):
        return f"Consultation #{self.pk} ({self.status})"

    # -- properties unchanged --
    @property
    def starts_at(self):
        appt = self.appointment
        naive = datetime.combine(appt.appointment_date, appt.appointment_time)
        return timezone.make_aware(naive) if timezone.is_naive(naive) else naive

    @property
    def is_active(self):
        return self.status in self.ACTIVE_STATUSES

    @property
    def can_join(self):
        if not self.is_active or not self.meeting_url:
            return False
        if self.status == self.Status.IN_PROGRESS:
            return True
        now = timezone.now()
        start = self.starts_at
        return (
            start - timedelta(minutes=self.JOIN_EARLY_MINUTES)
            <= now
            <= start + timedelta(minutes=self.JOIN_LATE_MINUTES)
        )

    @property
    def can_cancel(self):
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
    instructions = models.TextField()

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    