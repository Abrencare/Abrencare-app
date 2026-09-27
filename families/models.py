import uuid

from django.conf import settings
from django.db import models
from django.db.models import Q
from django.utils import timezone
from services.models import UserService
from patients.models import Patient


class FamilyProfile(models.Model):
    name = models.CharField(max_length=150, null=True)
    user_service = models.ForeignKey(
        UserService,
        on_delete=models.PROTECT,
        related_name="family_profile"
    )

    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name="created_families",
    )

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["name"]
        indexes = [
            models.Index(fields=["created_by"]),
        ]

    def __str__(self):
        return self.user_service.user.username


class FamilyMember(models.Model):
    """The 'under care' patient card + the care-plan checklist scope."""

    class Relationship(models.TextChoices):
        MOTHER = "mother", "Mother"
        FATHER = "father", "Father"
        PARENT = "parent", "Parent"
        SPOUSE = "spouse", "Spouse"
        CHILD = "child", "Child"
        OTHER = "other", "Other"

    family_profile = models.ForeignKey(
        FamilyProfile, on_delete=models.CASCADE,
        related_name="members",
    )
    full_name = models.CharField(max_length=150)
    relationship = models.CharField(max_length=20, choices=Relationship.choices)
    date_of_birth = models.DateField(null=True, blank=True)
    phone = models.CharField(max_length=20, blank=True)
    city = models.CharField(max_length=100, blank=True)
    address = models.CharField(max_length=255, blank=True)
    emergency_phone = models.CharField(max_length=20, blank=True)
    notes = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["full_name"]


class FamilyReading(models.Model):
    """The four live-reading tiles: BP, medication, blood sample, ankle."""

    class Kind(models.TextChoices):
        BP = "bp", "Blood Pressure"
        MEDICATION = "medication", "Medication"
        BLOOD_SAMPLE = "bloodSample", "Blood Sample"
        ANKLE_SWELLING = "ankleSwelling", "Ankle Swelling"
        OTHER = "other", "Other"

    class Tone(models.TextChoices):
        GOOD = "good", "Good"
        INFO = "info", "Info"
        FLAG = "flag", "Flag"

    member = models.ForeignKey(
        FamilyMember, on_delete=models.CASCADE,
        related_name="readings",
    )
    kind = models.CharField(max_length=20, choices=Kind.choices)
    value = models.CharField(max_length=64)          # "128/82", "Taken", "Left foot"
    status = models.CharField(max_length=64, blank=True)  # "Good", "Sent to lab"
    tone = models.CharField(max_length=10, choices=Tone.choices, default=Tone.GOOD)
    recorded_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-recorded_at"]


class CarePlanItem(models.Model):
    """The 'Today's care plan' checklist."""

    member = models.ForeignKey(
        FamilyMember, on_delete=models.CASCADE,
        related_name="care_plan_items",
    )
    title = models.CharField(max_length=150)
    scheduled_time = models.CharField(max_length=16, blank=True)  # "08:00"
    done = models.BooleanField(default=False)
    order = models.PositiveSmallIntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["order", "scheduled_time"]


class CareVisit(models.Model):
    """The 'live visit in progress' card."""

    class State(models.TextChoices):
        SCHEDULED = "scheduled", "Scheduled"
        IN_PROGRESS = "inProgress", "In Progress"
        COMPLETED = "completed", "Completed"

    member = models.ForeignKey(
        FamilyMember, on_delete=models.CASCADE,
        related_name="visits",
    )
    nurse_name = models.CharField(max_length=150)
    state = models.CharField(
        max_length=20, choices=State.choices, default=State.SCHEDULED,
    )
    started_at = models.DateTimeField(null=True, blank=True)
    ended_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-started_at"]


class FamilyCareTeamMember(models.Model):
    """The 'Care team' card with MG / MT."""

    class Role(models.TextChoices):
        NURSE = "nurse", "Assigned Nurse"
        COORDINATOR = "coordinator", "Care Coordinator"
        PHYSICIAN = "physician", "Physician"

    family_profile = models.ForeignKey(
        FamilyProfile, on_delete=models.CASCADE,
        related_name="care_team",
    )
    role = models.CharField(max_length=20, choices=Role.choices)
    full_name = models.CharField(max_length=150)
    phone = models.CharField(max_length=20, blank=True)
    available_now = models.BooleanField(default=True)
    on_visit = models.BooleanField(default=False)

    class Meta:
        ordering = ["role", "full_name"]


class FamilyAttentionFlag(models.Model):
    """The amber 'Needs attention' card."""

    class Tone(models.TextChoices):
        INFO = "info", "Info"
        FLAG = "flag", "Flag"

    family_profile = models.ForeignKey(
        FamilyProfile, on_delete=models.CASCADE,
        related_name="attention_flags",
    )
    label = models.CharField(max_length=64)
    title = models.CharField(max_length=150)
    body = models.CharField(max_length=255, blank=True)
    tone = models.CharField(max_length=10, choices=Tone.choices, default=Tone.INFO)
    resolved = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]


class FamilyPatient(models.Model):

    class Relationship(models.TextChoices):
        SELF = "self", "Self"
        SPOUSE = "spouse", "Spouse"
        PARENT = "parent", "Parent"
        CHILD = "child", "Child"
        SIBLING = "sibling", "Sibling"
        RELATIVE = "relative", "Relative"
        OTHER = "other", "Other"

    family = models.ForeignKey(
        FamilyProfile,
        on_delete=models.CASCADE,
        related_name="patients",
    )

    patient = models.ForeignKey(
        Patient,
        on_delete=models.PROTECT,
        related_name="family_relationships",
    )

    relationship = models.CharField(
        max_length=30,
        choices=Relationship.choices,
        default=Relationship.OTHER,
    )

    is_primary = models.BooleanField(default=False)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=["family", "patient"],
                name="unique_family_patient",
            ),
            models.UniqueConstraint(
                fields=["family"],
                condition=Q(is_primary=True),
                name="unique_primary_family_patient",
            ),
        ]

        indexes = [
            models.Index(fields=["family", "patient"]),
            models.Index(fields=["patient", "family"]),
        ]

    def __str__(self):
        return f"{self.patient} - {self.family}"

    
class FamilyInvitation(models.Model):

    class InvitationType(models.TextChoices):
        MEMBER = "member", "Family Member"
        PATIENT_CLAIM = "patient_claim", "Patient Account Claim"

    class Status(models.TextChoices):
        PENDING = "pending", "Pending"
        ACCEPTED = "accepted", "Accepted"
        EXPIRED = "expired", "Expired"
        CANCELLED = "cancelled", "Cancelled"

    family = models.ForeignKey(
        FamilyProfile,
        on_delete=models.CASCADE,
        related_name="invitations",
    )

    invited_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name="family_invitations_sent",
    )

    invitation_type = models.CharField(
        max_length=30,
        choices=InvitationType.choices,
    )

    name = models.CharField(
        max_length=150,
    )

    email = models.EmailField(
        blank=True,
    )

    phone_number = models.CharField(
        max_length=20,
        blank=True,
    )

    role = models.CharField(
        max_length=20,
        choices=FamilyMember.Relationship.choices,   # ✅
        blank=True,
    )

    patient = models.ForeignKey(
        Patient,
        on_delete=models.PROTECT,
        null=True,
        blank=True,
        related_name="claim_invitations",
    )

    token_hash = models.CharField(
        max_length=64,
        unique=True,
        editable=False,
    )

    status = models.CharField(
        max_length=20,
        choices=Status.choices,
        default=Status.PENDING,
        db_index=True,
    )

    expires_at = models.DateTimeField()

    accepted_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="accepted_family_invitations",
    )

    accepted_at = models.DateTimeField(
        null=True,
        blank=True,
    )

    otp_hash = models.CharField(
        max_length=64,
        blank=True,
        default="",
    )

    otp_expires_at = models.DateTimeField(
        null=True,
        blank=True,
    )

    otp_sent_at = models.DateTimeField(
        null=True,
        blank=True,
    )

    otp_attempts = models.PositiveIntegerField(
        default=0,
    )

    contact_verified_at = models.DateTimeField(
        null=True,
        blank=True,
    )

    otp_locked_at = models.DateTimeField(
        null=True,
        blank=True,
    )

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        indexes = [
            models.Index(fields=["family", "status"]),
            models.Index(fields=["status", "expires_at"]),
            models.Index(fields=["email", "status"]),
            models.Index(fields=["phone_number", "status"]),
        ]

    def __str__(self):
        return f"{self.name} - {self.family} - {self.invitation_type}"

    @property
    def is_expired(self):
        return timezone.now() >= self.expires_at


class InvitationDelivery(models.Model):

    class Channel(models.TextChoices):
        EMAIL = "email", "Email"
        SMS = "sms", "SMS"

    class Status(models.TextChoices):
        PENDING = "pending", "Pending"
        SENT = "sent", "Sent"
        FAILED = "failed", "Failed"

    invitation = models.ForeignKey(
        FamilyInvitation,
        on_delete=models.CASCADE,
        related_name="deliveries",
    )

    channel = models.CharField(
        max_length=10,
        choices=Channel.choices,
    )

    destination = models.CharField(
        max_length=255,
    )

    status = models.CharField(
        max_length=20,
        choices=Status.choices,
        default=Status.PENDING,
    )

    provider_message_id = models.CharField(
        max_length=255,
        blank=True,
    )

    error_message = models.TextField(
        blank=True,
    )

    sent_at = models.DateTimeField(
        null=True,
        blank=True,
    )

    created_at = models.DateTimeField(
        auto_now_add=True,
    )


class ServiceVisit(models.Model):
    """
    A nurse/doctor visit happening now or in the past.
    Drives the 'Live visit' card on the family dashboard.
    """
    class Status(models.TextChoices):
        SCHEDULED = "scheduled", "Scheduled"
        IN_PROGRESS = "in_progress", "In progress"
        COMPLETED = "completed", "Completed"
        CANCELLED = "cancelled", "Cancelled"

    patient = models.ForeignKey(
        "patients.Patient",
        on_delete=models.CASCADE,
        related_name="visits",
    )
    clinician = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name="visits_conducted",
    )
    status = models.CharField(
        max_length=20,
        choices=Status.choices,
        default=Status.SCHEDULED,
    )
    started_at = models.DateTimeField(null=True, blank=True)
    ended_at = models.DateTimeField(null=True, blank=True)
    summary = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-started_at", "-created_at"]
        indexes = [
            models.Index(fields=["patient", "status"]),
        ]

    def __str__(self):
        return f"Visit({self.patient_id}, {self.status})"


class VitalReading(models.Model):
    """
    A single reading: blood pressure, heart rate, SpO2, weight...
    Drives individual tiles on the family dashboard.
    """
    class Kind(models.TextChoices):
        BLOOD_PRESSURE = "blood_pressure", "Blood pressure"
        HEART_RATE = "heart_rate", "Heart rate"
        SPO2 = "spo2", "Oxygen saturation"
        TEMPERATURE = "temperature", "Temperature"
        WEIGHT = "weight", "Weight"
        BLOOD_GLUCOSE = "blood_glucose", "Blood glucose"

    class Status(models.TextChoices):
        GOOD = "good", "Good"
        INFO = "info", "Info"
        FLAG = "flag", "Needs attention"

    patient = models.ForeignKey(
        "patients.Patient",
        on_delete=models.CASCADE,
        related_name="vital_readings",
    )
    kind = models.CharField(max_length=32, choices=Kind.choices)
    value = models.CharField(max_length=64)   # "128/82", "72", "98%"
    unit = models.CharField(max_length=16, blank=True)
    status = models.CharField(
        max_length=8, choices=Status.choices, default=Status.GOOD,
    )
    recorded_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="vital_readings_recorded",
    )
    recorded_at = models.DateTimeField(default=timezone.now)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-recorded_at"]
        indexes = [
            models.Index(fields=["patient", "kind", "-recorded_at"]),
        ]

    def __str__(self):
        return f"{self.get_kind_display()}={self.value}"


class PatientObservation(models.Model):
    """
    Qualitative observations: swelling, mood, appetite, skin condition.
    Drives the 'ankle swelling' tile.
    """
    class Kind(models.TextChoices):
        SWELLING = "swelling", "Swelling"
        PAIN = "pain", "Pain"
        MOOD = "mood", "Mood"
        APPETITE = "appetite", "Appetite"
        SKIN = "skin", "Skin condition"
        OTHER = "other", "Other"

    class Status(models.TextChoices):
        GOOD = "good", "Good"
        INFO = "info", "Info"
        FLAG = "flag", "Needs attention"

    patient = models.ForeignKey(
        "patients.Patient",
        on_delete=models.CASCADE,
        related_name="observations",
    )
    kind = models.CharField(max_length=16, choices=Kind.choices)
    label = models.CharField(max_length=120)   # "Left foot"
    status = models.CharField(
        max_length=8, choices=Status.choices, default=Status.INFO,
    )
    note = models.TextField(blank=True)
    recorded_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="observations_recorded",
    )
    recorded_at = models.DateTimeField(default=timezone.now)

    class Meta:
        ordering = ["-recorded_at"]

    def __str__(self):
        return f"{self.get_kind_display()}: {self.label}"


class PatientAlert(models.Model):
    """
    Drives the 'Needs attention' card.
    """
    class Severity(models.TextChoices):
        INFO = "info", "Info"
        WARNING = "warning", "Warning"
        CRITICAL = "critical", "Critical"

    patient = models.ForeignKey(
        "patients.Patient",
        on_delete=models.CASCADE,
        related_name="alerts",
    )
    severity = models.CharField(
        max_length=10, choices=Severity.choices, default=Severity.WARNING,
    )
    title = models.CharField(max_length=150)
    body = models.TextField(blank=True)
    source = models.CharField(max_length=64, blank=True)  # "vitals", "nurse"
    resolved_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]
        indexes = [models.Index(fields=["patient", "resolved_at"])]

    @property
    def is_open(self):
        return self.resolved_at is None

    def __str__(self):
        return f"[{self.severity}] {self.title}"


class CareTask(models.Model):
    """
    One line in today's care plan.
    """
    class Status(models.TextChoices):
        UPCOMING = "upcoming", "Upcoming"
        DONE = "done", "Done"
        MISSED = "missed", "Missed"
        SKIPPED = "skipped", "Skipped"

    patient = models.ForeignKey(
        "patients.Patient",
        on_delete=models.CASCADE,
        related_name="care_tasks",
    )
    title = models.CharField(max_length=150)
    scheduled_at = models.DateTimeField()
    status = models.CharField(
        max_length=10, choices=Status.choices, default=Status.UPCOMING,
    )
    completed_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="care_tasks_completed",
    )
    completed_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["scheduled_at"]
        indexes = [
            models.Index(fields=["patient", "scheduled_at"]),
        ]

    def __str__(self):
        return f"{self.title} @ {self.scheduled_at:%H:%M}"


class CareTeamAssignment(models.Model):
    """
    Maps a staff user to a patient for a period of time.
    Replaces the hardcoded 'Meron Girma' / 'Marta Tesfaye' rows
    and the hardcoded CARE_PHONE.
    """
    class Role(models.TextChoices):
        NURSE = "nurse", "Assigned nurse"
        COORDINATOR = "coordinator", "Care coordinator"
        DOCTOR = "doctor", "Doctor"

    patient = models.ForeignKey(
        "patients.Patient",
        on_delete=models.CASCADE,
        related_name="care_team",
    )
    staff = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="care_assignments",
    )
    role = models.CharField(max_length=20, choices=Role.choices)
    is_primary = models.BooleanField(default=False)
    started_at = models.DateTimeField(default=timezone.now)
    ended_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-is_primary", "role"]
        constraints = [
            models.UniqueConstraint(
                fields=["patient", "staff", "role"],
                condition=models.Q(ended_at__isnull=True),
                name="unique_active_care_assignment",
            ),
        ]

    @property
    def is_active(self):
        return self.ended_at is None

    def __str__(self):
        return f"{self.staff} -> {self.patient} ({self.role})"
   

class FamilyAuditLog(models.Model):
    """
    Immutable audit trail for security-sensitive family operations.

    Never store:
        - raw invitation tokens
        - OTPs
        - passwords
        - authentication tokens
        - unnecessary PHI
    """

    class Action(models.TextChoices):
        FAMILY_CREATED = (
            "family_created",
            "Family Created",
        )

        PATIENT_CREATED = (
            "patient_created",
            "Patient Created",
        )

        MEMBER_INVITED = (
            "member_invited",
            "Family Member Invited",
        )

        PATIENT_CLAIM_INVITED = (
            "patient_claim_invited",
            "Patient Claim Invited",
        )

        INVITATION_OTP_REQUESTED = (
            "invitation_otp_requested",
            "Invitation OTP Requested",
        )

        INVITATION_CONTACT_VERIFIED = (
            "invitation_contact_verified",
            "Invitation Contact Verified",
        )

        MEMBER_ACCEPTED = (
            "member_accepted",
            "Family Membership Accepted",
        )

        MEMBER_REGISTERED = (
            "member_registered",
            "Family Member Registered",
        )

        PATIENT_CLAIMED = (
            "patient_claimed",
            "Patient Account Claimed",
        )

        INVITATION_CANCELLED = (
            "invitation_cancelled",
            "Invitation Cancelled",
        )

        INVITATION_EXPIRED = (
            "invitation_expired",
            "Invitation Expired",
        )

        OTP_LOCKED = (
            "otp_locked",
            "OTP Verification Locked",
        )

    family = models.ForeignKey(
        FamilyProfile,
        on_delete=models.PROTECT,
        related_name="audit_logs",
    )

    actor = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="family_audit_logs",
    )

    action = models.CharField(
        max_length=50,
        choices=Action.choices,
    )

    invitation = models.ForeignKey(
        FamilyInvitation,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="audit_logs",
    )

    patient = models.ForeignKey(
        Patient,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="family_audit_logs",
    )

    metadata = models.JSONField(
        default=dict,
        blank=True,
    )

    ip_address = models.GenericIPAddressField(
        null=True,
        blank=True,
    )

    user_agent = models.TextField(
        blank=True,
    )

    created_at = models.DateTimeField(
        auto_now_add=True,
    )

    class Meta:
        ordering = ["-created_at"]

        indexes = [
            models.Index(
                fields=["family", "-created_at"],
                name="fa_family_created_idx",
            ),
            models.Index(
                fields=["actor", "-created_at"],
                name="fa_actor_created_idx",
            ),
            models.Index(
                fields=["action", "-created_at"],
                name="fa_action_created_idx",
            ),
            models.Index(
                fields=["invitation", "-created_at"],
                name="fa_inv_created_idx",
            ),
            models.Index(
                fields=["patient", "-created_at"],
                name="fa_patient_created_idx",
            ),
        ]

    def __str__(self):
        return (
            f"{self.family} - "
            f"{self.action} - "
            f"{self.created_at}"
        )

