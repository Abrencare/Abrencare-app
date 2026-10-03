from datetime import datetime, timedelta

from django.conf import settings
from django.core.exceptions import ValidationError
from django.core.validators import MinValueValidator
from django.db import models
from django.db.models import Q
from django.utils import timezone

from doctors.models import Doctor


class AppointmentQuerySet(models.QuerySet):
    """Reusable querysets for appointments."""

    def active(self):
        return self.filter(
            status__in=[
                Appointment.Status.PENDING,
                Appointment.Status.CONFIRMED,
            ]
        )

    def upcoming(self):
        today = timezone.localdate()
        now = timezone.localtime()
        return self.filter(
            Q(appointment_date__gt=today)
            | Q(
                appointment_date=today,
                appointment_time__gte=now.time(),
            )
        ).active()

    def for_doctor(self, doctor):
        return self.filter(doctor=doctor)

    def for_patient(self, patient):
        return self.filter(patient=patient)


class AppointmentManager(models.Manager):
    def get_queryset(self):
        return AppointmentQuerySet(self.model, using=self._db)

    def active(self):
        return self.get_queryset().active()

    def upcoming(self):
        return self.get_queryset().upcoming()


class Appointment(models.Model):
    """
    A scheduled appointment between a patient and a provider
    (doctor, nurse, lab tech, etc.).
    """

    class AppointmentType(models.TextChoices):
        DOCTOR_VISIT = "doctor_visit", "Doctor Visit"
        HOME_VISIT = "home_visit", "Home Visit"
        NURSE_CHECK = "nurse_check", "Nurse Check"
        LAB_SAMPLE = "lab_sample", "Lab Sample"

    class Status(models.TextChoices):
        PENDING = "pending", "Pending"
        CONFIRMED = "confirmed", "Confirmed"
        COMPLETED = "completed", "Completed"
        CANCELLED = "cancelled", "Cancelled"
        NO_SHOW = "no_show", "No Show"

    # Statuses that block a doctor's slot.
    ACTIVE_STATUSES = (Status.PENDING, Status.CONFIRMED)

    AUTO_CONFIRM_TYPES = (
        "doctor_visit",
        "nurse_check",
    )
    # ------------------------------------------------------------------
    # Relationships
    # ------------------------------------------------------------------
    patient = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name="appointments",
    )

    doctor = models.ForeignKey(
        Doctor,
        on_delete=models.PROTECT,
        related_name="appointments",
        null=True,
        blank=True,
        help_text="Required for doctor visits; optional for nurse/lab visits.",
    )

    cancelled_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        null=True,
        blank=True,
        related_name="cancelled_appointments",
    )

    # ------------------------------------------------------------------
    # Scheduling
    # ------------------------------------------------------------------
    appointment_date = models.DateField(db_index=True)
    appointment_time = models.TimeField()
    duration_minutes = models.PositiveIntegerField(
        validators=[MinValueValidator(1)],
        help_text="Duration of the appointment in minutes.",
    )

    # ------------------------------------------------------------------
    # Classification
    # ------------------------------------------------------------------
    status = models.CharField(
        max_length=20,
        choices=Status.choices,
        default=Status.PENDING,
        db_index=True,
    )
    appointment_type = models.CharField(
        max_length=20,
        choices=AppointmentType.choices,
        default=AppointmentType.DOCTOR_VISIT,
        db_index=True,
    )
    provider_name = models.CharField(
        max_length=150,
        blank=True,
        default="",
        help_text="Display name for non-doctor visits (nurse, lab tech, etc.).",
    )

    # ------------------------------------------------------------------
    # Details
    # ------------------------------------------------------------------
    reason_for_visit = models.TextField(blank=True, default="")
    reminder_minutes = models.PositiveIntegerField(
        null=True,
        blank=True,
        default=None,
        help_text="How many minutes before the appointment to notify the patient.",
    )

    # ------------------------------------------------------------------
    # Lifecycle timestamps
    # ------------------------------------------------------------------
    confirmed_at = models.DateTimeField(null=True, blank=True)
    completed_at = models.DateTimeField(null=True, blank=True)
    cancelled_at = models.DateTimeField(null=True, blank=True)
    cancellation_reason = models.TextField(blank=True, default="")

    # ------------------------------------------------------------------
    # Audit timestamps
    # ------------------------------------------------------------------
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    # ------------------------------------------------------------------
    # Manager
    # ------------------------------------------------------------------
    objects = AppointmentManager()

    # ------------------------------------------------------------------
    # Meta
    # ------------------------------------------------------------------
    class Meta:
        ordering = ["appointment_date", "appointment_time"]

        indexes = [
            models.Index(
                fields=["doctor", "appointment_date", "appointment_time"],
                name="appt_doctor_date_time_idx",
            ),
            models.Index(
                fields=["patient", "appointment_date"],
                name="appt_patient_date_idx",
            ),
            models.Index(
                fields=["status", "appointment_date"],
                name="appt_status_date_idx",
            ),
            models.Index(
                fields=["appointment_type", "appointment_date"],
                name="appt_type_date_idx",
            ),
        ]

        constraints = [
            models.CheckConstraint(
                condition=Q(duration_minutes__gt=0),
                name="appointment_duration_positive",
            ),
            models.UniqueConstraint(
                fields=["doctor", "appointment_date", "appointment_time"],
                condition=Q(status__in=["pending", "confirmed"]),
                name="unique_active_doctor_appointment_slot",
            ),
        ]

    # ------------------------------------------------------------------
    # Dunder methods
    # ------------------------------------------------------------------
    def __str__(self):
        provider = self.doctor or self.provider_name or "—"
        patient = self.patient.full_name if self.patient else "—"
        return (
            f"{provider} - {patient} - "
            f"{self.appointment_date} {self.appointment_time}"
        )

    # ------------------------------------------------------------------
    # Derived properties
    # ------------------------------------------------------------------
    @property
    def start_datetime(self):
        """Naive datetime combining date + time (local time)."""
        return datetime.combine(self.appointment_date, self.appointment_time)

    @property
    def end_datetime(self):
        """Naive datetime representing the appointment end."""
        return self.start_datetime + timedelta(minutes=self.duration_minutes)

    @property
    def end_time(self):
        """End time of the appointment (may wrap past midnight — use end_datetime if needed)."""
        return self.end_datetime.time()

    @property
    def is_active(self):
        return self.status in self.ACTIVE_STATUSES

    @property
    def is_past(self):
        return self.appointment_date < timezone.localdate()

    # ------------------------------------------------------------------
    # Validation
    # ------------------------------------------------------------------
    def clean(self):
        errors = {}

        # --- Required fields -----------------------------------------
        if not self.appointment_date:
            errors["appointment_date"] = "Appointment date is required."
        if not self.appointment_time:
            errors["appointment_time"] = "Appointment time is required."
        if not self.duration_minutes or self.duration_minutes <= 0:
            errors["duration_minutes"] = "Duration must be greater than zero."

        # --- Patient -------------------------------------------------
        if not self.patient_id:
            errors["patient"] = "Patient is required."

        # --- Doctor requirement (conditional) ------------------------
        if self.appointment_type == self.AppointmentType.DOCTOR_VISIT:
            if not self.doctor_id:
                errors["doctor"] = "Doctor is required for doctor visits."

        # Bail early if we can't safely continue.
        if errors:
            raise ValidationError(errors)

        # --- Past date ----------------------------------------------
        today = timezone.localdate()
        if self.appointment_date < today:
            errors["appointment_date"] = (
                "Appointment date cannot be in the past."
            )

        # --- Availability window ------------------------------------
        if self.doctor_id:
            self._validate_availability(errors)

        # --- Overlap check ------------------------------------------
        if not errors:
            self._validate_no_overlap(errors)

        if errors:
            raise ValidationError(errors)

    def _validate_availability(self, errors):
        """Ensure the appointment fits inside a doctor availability window."""
        weekday = self.appointment_date.strftime("%A").lower()

        availability = self.doctor.availability.filter(
            day=weekday,
            is_available=True,
        )

        if not availability.exists():
            errors["appointment_date"] = (
                "Doctor is not available on this day."
            )
            return

        appointment_start = self.start_datetime
        appointment_end = self.end_datetime

        for window in availability:
            window_start = datetime.combine(
                self.appointment_date, window.start_time
            )
            window_end = datetime.combine(
                self.appointment_date, window.end_time
            )
            if (
                appointment_start >= window_start
                and appointment_end <= window_end
            ):
                return

        errors["appointment_time"] = (
            "The appointment does not fit within the doctor's available hours."
        )

    def _validate_no_overlap(self, errors):
        """Ensure no active appointment overlaps this one for the same doctor."""
        if not self.doctor_id:
            return

        overlapping = (
            Appointment.objects
            .filter(
                doctor_id=self.doctor_id,
                appointment_date=self.appointment_date,
                status__in=self.ACTIVE_STATUSES,
            )
            .exclude(pk=self.pk)
        )

        new_start = self.start_datetime
        new_end = self.end_datetime

        for appt in overlapping:
            if new_start < appt.end_datetime and new_end > appt.start_datetime:
                errors["appointment_time"] = (
                    f"Overlaps with an existing appointment "
                    f"at {appt.appointment_time} "
                    f"({appt.duration_minutes} min)."
                )
                return

    @classmethod
    def initial_status_for(cls, appointment_type, *, auto_confirm=True):
        """
        Return the status an appointment should start in.

        Auto-confirm is only applied for appointment types where the
        provider's calendar is the source of truth.
        """
        if auto_confirm and appointment_type in cls.AUTO_CONFIRM_TYPES:
            return cls.Status.CONFIRMED
        return cls.Status.PENDING
    # ------------------------------------------------------------------
    # Persistence
    # ------------------------------------------------------------------
    def save(self, *args, **kwargs):
        # Auto-manage lifecycle timestamps.
        now = timezone.now()

        if self.status == self.Status.CONFIRMED and not self.confirmed_at:
            self.confirmed_at = now

        if self.status == self.Status.COMPLETED and not self.completed_at:
            self.completed_at = now

        if self.status == self.Status.CANCELLED and not self.cancelled_at:
            self.cancelled_at = now

        # Skip validation on partial updates (e.g. status-only patches).
        if not kwargs.pop("skip_clean", False):
            self.full_clean()

        super().save(*args, **kwargs)

    # ------------------------------------------------------------------
    # Domain helpers
    # ------------------------------------------------------------------
    def cancel(self, *, by=None, reason=""):
        """Cancel the appointment and record who/why."""
        self.status = self.Status.CANCELLED
        self.cancelled_by = by
        self.cancellation_reason = reason or ""
        self.cancelled_at = timezone.now()
        self.save()

    def confirm(self):
        """Confirm the appointment."""
        self.status = self.Status.CONFIRMED
        self.save()

    def complete(self):
        """Mark the appointment as completed."""
        self.status = self.Status.COMPLETED
        self.save()

    def mark_no_show(self):
        """Mark the appointment as a no-show."""
        self.status = self.Status.NO_SHOW
        self.save()


class AppointmentCheckIn(models.Model):
    """
    Records a patient's physical check-in for an appointment,
    optionally with GPS coordinates for verification.
    """

    appointment = models.OneToOneField(
        Appointment,
        on_delete=models.CASCADE,
        related_name="check_in",
    )

    checked_in_at = models.DateTimeField(default=timezone.now)

    latitude = models.DecimalField(
        max_digits=9,
        decimal_places=6,
        null=True,
        blank=True,
    )
    longitude = models.DecimalField(
        max_digits=9,
        decimal_places=6,
        null=True,
        blank=True,
    )

    gps_verified = models.BooleanField(default=False)

    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = "Appointment Check-In"
        verbose_name_plural = "Appointment Check-Ins"

    def __str__(self):
        return f"Check-in for {self.appointment_id} at {self.checked_in_at}"

    def clean(self):
        errors = {}

        # Lat/lng must be provided together.
        if bool(self.latitude) ^ bool(self.longitude):
            errors["latitude"] = (
                "Latitude and longitude must be provided together."
            )

        # Cannot check in before the appointment date.
        if self.appointment_id and self.checked_in_at:
            appt_date = self.appointment.appointment_date
            if timezone.localtime(self.checked_in_at).date() < appt_date:
                errors["checked_in_at"] = (
                    "Cannot check in before the appointment date."
                )

        if errors:
            raise ValidationError(errors)

    def save(self, *args, **kwargs):
        # Auto-set gps_verified when coordinates are present, unless overridden.
        if not kwargs.pop("skip_gps_autoset", False):
            if self.latitude is not None and self.longitude is not None:
                self.gps_verified = True

        self.full_clean()
        super().save(*args, **kwargs)
