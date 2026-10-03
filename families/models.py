import uuid

from django.conf import settings
from django.core.exceptions import ValidationError
from django.db import models
from django.db.models import F, Q
from django.utils import timezone

from services.models import UserService


# ---------------------------------------------------------------------------
# Shared enums (avoid drift across models)
# ---------------------------------------------------------------------------

class Tone(models.TextChoices):
    GOOD = "good", "Good"
    INFO = "info", "Info"
    FLAG = "flag", "Flag"


class Severity(models.TextChoices):
    INFO = "info", "Info"
    WARNING = "warning", "Warning"
    CRITICAL = "critical", "Critical"


class Relationship(models.TextChoices):
    SELF = "self", "Self"
    MOTHER = "mother", "Mother"
    FATHER = "father", "Father"
    PARENT = "parent", "Parent"
    SPOUSE = "spouse", "Spouse"
    CHILD = "child", "Child"
    SIBLING = "sibling", "Sibling"
    RELATIVE = "relative", "Relative"
    OTHER = "other", "Other"


# ---------------------------------------------------------------------------
# Family
# ---------------------------------------------------------------------------

class FamilyProfile(models.Model):
    """The household / care unit. Root of the family graph."""

    name = models.CharField(max_length=150, blank=True)
    user_service = models.ForeignKey(
        UserService,
        on_delete=models.PROTECT,
        related_name="family_profiles",
    )
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name="created_families",
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = [F("name").asc(nulls_last=True)]
        indexes = [
            models.Index(fields=["created_by"], name="fp_created_by_idx"),
            models.Index(fields=["user_service"], name="fp_user_service_idx"),
        ]

    def __str__(self):
        return self.name or self.user_service.user.get_username()


# ---------------------------------------------------------------------------
# Members
# ---------------------------------------------------------------------------

class FamilyMember(models.Model):
    """
    A person under care within a family.
    Owns readings, care-plan items, visits, prescriptions, labs, history.
    """

    family = models.ForeignKey(
        FamilyProfile,
        on_delete=models.CASCADE,
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
    is_primary = models.BooleanField(
        default=False,
        help_text="Primary member of the family (typically the account owner).",
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["full_name"]
        constraints = [
            models.UniqueConstraint(
                fields=["family"],
                condition=Q(is_primary=True),
                name="unique_primary_family_member",
            ),
        ]
        indexes = [
            models.Index(fields=["family", "relationship"], name="fm_family_rel_idx"),
            models.Index(fields=["family", "full_name"], name="fm_family_name_idx"),
        ]

    def __str__(self):
        return self.full_name

    def clean(self):
        if self.date_of_birth and self.date_of_birth > timezone.localdate():
            raise ValidationError({"date_of_birth": "Date of birth cannot be in the future."})


class FamilyMembership(models.Model):
    """
    An account's membership in a family profile.
    The owner has one; each invited observer has one.
    FamilyMembers (people under care) are NOT memberships —
    they are domain entities.
    """

    class Role(models.TextChoices):
        OWNER = "owner", "Owner"
        OBSERVER = "observer", "Observer"

    family = models.ForeignKey(
        FamilyProfile,
        on_delete=models.CASCADE,
        related_name="memberships",
    )
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="family_memberships",
    )
    role = models.CharField(max_length=20, choices=Role.choices)
    invited_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="family_memberships_invited",
    )
    invited_via = models.ForeignKey(
        "FamilyInvitation",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="resulting_memberships",
    )

    # Granular read permissions. Default for observers = all True.
    can_view_readings      = models.BooleanField(default=True)
    can_view_care_plan     = models.BooleanField(default=True)
    can_view_visits        = models.BooleanField(default=True)
    can_view_reports       = models.BooleanField(default=True)
    can_view_prescriptions = models.BooleanField(default=True)
    can_view_lab_results   = models.BooleanField(default=True)
    can_view_history       = models.BooleanField(default=True)
    can_view_attention     = models.BooleanField(default=True)
    can_view_care_team     = models.BooleanField(default=True)

    # Reserved for future "co-owner" promotion. Default False for observers.
    can_write              = models.BooleanField(default=False)

    joined_at = models.DateTimeField(default=timezone.now)
    revoked_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=["family", "user"],
                condition=Q(revoked_at__isnull=True),
                name="unique_active_family_membership",
            ),
        ]
        indexes = [
            models.Index(fields=["user", "revoked_at"], name="fmem_user_rev_idx"),
            models.Index(fields=["family", "role"], name="fmem_family_role_idx"),
        ]

    def __str__(self):
        return f"{self.user} · {self.family} · {self.role}"

    @property
    def is_active(self):
        return self.revoked_at is None

    @property
    def is_owner(self):
        return self.role == self.Role.OWNER

# ---------------------------------------------------------------------------
# Readings (BP, medication, blood sample, ankle, other)
# ---------------------------------------------------------------------------

class FamilyReading(models.Model):
    """A single point-in-time reading for a member."""

    class Kind(models.TextChoices):
        BP = "bp", "Blood Pressure"
        MEDICATION = "medication", "Medication"
        BLOOD_SAMPLE = "blood_sample", "Blood Sample"
        ANKLE_SWELLING = "ankle_swelling", "Ankle Swelling"
        HEART_RATE = "heart_rate", "Heart Rate"
        SPO2 = "spo2", "Oxygen Saturation"
        TEMPERATURE = "temperature", "Temperature"
        WEIGHT = "weight", "Weight"
        BLOOD_GLUCOSE = "blood_glucose", "Blood Glucose"
        OTHER = "other", "Other"

    member = models.ForeignKey(
        FamilyMember,
        on_delete=models.CASCADE,
        related_name="readings",
    )
    kind = models.CharField(max_length=32, choices=Kind.choices)
    value = models.CharField(max_length=64)                 # "128/82", "Taken", "Left foot"
    unit = models.CharField(max_length=16, blank=True)
    status = models.CharField(max_length=64, blank=True)    # free-form label
    tone = models.CharField(max_length=10, choices=Tone.choices, default=Tone.GOOD)
    note = models.TextField(blank=True)
    recorded_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="family_readings_recorded",
    )
    recorded_at = models.DateTimeField(default=timezone.now)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-recorded_at"]
        indexes = [
            models.Index(fields=["member", "kind", "-recorded_at"], name="fr_member_kind_idx"),
            models.Index(fields=["member", "-recorded_at"], name="fr_member_rec_idx"),
        ]

    def __str__(self):
        return f"{self.get_kind_display()}={self.value}"


# ---------------------------------------------------------------------------
# Care plan
# ---------------------------------------------------------------------------

class CarePlanItem(models.Model):
    """One line in today's care plan for a member."""

    class Status(models.TextChoices):
        UPCOMING = "upcoming", "Upcoming"
        DONE = "done", "Done"
        MISSED = "missed", "Missed"
        SKIPPED = "skipped", "Skipped"

    member = models.ForeignKey(
        FamilyMember,
        on_delete=models.CASCADE,
        related_name="care_plan_items",
    )
    title = models.CharField(max_length=150)
    scheduled_time = models.CharField(max_length=16, blank=True)  # "08:00"
    status = models.CharField(
        max_length=10, choices=Status.choices, default=Status.UPCOMING,
    )
    done = models.BooleanField(default=False)
    order = models.PositiveSmallIntegerField(default=0)
    completed_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="care_plan_items_completed",
    )
    completed_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["order", "scheduled_time"]
        indexes = [
            models.Index(fields=["member", "status"], name="cpi_member_status_idx"),
        ]

    def __str__(self):
        return f"{self.title} ({self.status})"


# ---------------------------------------------------------------------------
# Visits
# ---------------------------------------------------------------------------

class CareVisit(models.Model):
    """A nurse/clinician visit for a member."""

    class State(models.TextChoices):
        SCHEDULED = "scheduled", "Scheduled"
        IN_PROGRESS = "in_progress", "In Progress"
        COMPLETED = "completed", "Completed"
        CANCELLED = "cancelled", "Cancelled"

    member = models.ForeignKey(
        FamilyMember,
        on_delete=models.CASCADE,
        related_name="visits",
    )
    clinician = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="visits_conducted",
    )
    nurse_name = models.CharField(max_length=150, blank=True)
    state = models.CharField(
        max_length=20, choices=State.choices, default=State.SCHEDULED,
    )
    scheduled_at = models.DateTimeField(null=True, blank=True)
    started_at = models.DateTimeField(null=True, blank=True)
    ended_at = models.DateTimeField(null=True, blank=True)
    summary = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = [
            F("started_at").desc(nulls_last=True),
            F("scheduled_at").desc(nulls_last=True),
            "-created_at",
        ]
        indexes = [
            models.Index(fields=["member", "state"], name="cv_member_state_idx"),
        ]

    def __str__(self):
        return f"Visit({self.member_id}, {self.state})"

    def clean(self):
        if self.started_at and self.ended_at and self.ended_at < self.started_at:
            raise ValidationError({"ended_at": "End time cannot be before start time."})


# ---------------------------------------------------------------------------
# Care team
# ---------------------------------------------------------------------------

class FamilyCareTeamMember(models.Model):
    """A staff member assigned to a family (nurse, coordinator, physician)."""

    class Role(models.TextChoices):
        NURSE = "nurse", "Assigned Nurse"
        COORDINATOR = "coordinator", "Care Coordinator"
        PHYSICIAN = "physician", "Physician"

    family = models.ForeignKey(
        FamilyProfile,
        on_delete=models.CASCADE,
        related_name="care_team",
    )
    staff = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="family_care_assignments",
    )
    role = models.CharField(max_length=20, choices=Role.choices)
    full_name = models.CharField(max_length=150)
    phone = models.CharField(max_length=20, blank=True)
    is_primary = models.BooleanField(default=False)
    available_now = models.BooleanField(default=True)
    on_visit = models.BooleanField(default=False)
    started_at = models.DateTimeField(default=timezone.now)
    ended_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-is_primary", "role", "full_name"]
        constraints = [
            models.UniqueConstraint(
                fields=["family", "staff", "role"],
                condition=Q(ended_at__isnull=True),
                name="unique_active_care_team_assignment",
            ),
        ]
        indexes = [
            models.Index(fields=["family", "role"], name="fctm_family_role_idx"),
        ]

    @property
    def is_active(self):
        return self.ended_at is None

    def __str__(self):
        return f"{self.full_name} ({self.role})"


# ---------------------------------------------------------------------------
# Attention flags
# ---------------------------------------------------------------------------

class FamilyAttentionFlag(models.Model):
    """Amber 'needs attention' cards shown on the family dashboard."""

    family = models.ForeignKey(
        FamilyProfile,
        on_delete=models.CASCADE,
        related_name="attention_flags",
    )
    member = models.ForeignKey(
        FamilyMember,
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name="attention_flags",
    )
    label = models.CharField(max_length=64)
    title = models.CharField(max_length=150)
    body = models.CharField(max_length=255, blank=True)
    severity = models.CharField(
        max_length=10, choices=Severity.choices, default=Severity.WARNING,
    )
    tone = models.CharField(max_length=10, choices=Tone.choices, default=Tone.INFO)
    source = models.CharField(max_length=64, blank=True)   # "vitals", "nurse"
    resolved = models.BooleanField(default=False)
    resolved_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["family", "resolved"], name="faf_family_res_idx"),
            models.Index(fields=["member", "resolved"], name="faf_member_res_idx"),
        ]

    @property
    def is_open(self):
        return not self.resolved

    def __str__(self):
        return f"[{self.severity}] {self.title}"


# ---------------------------------------------------------------------------
# Invitations
# ---------------------------------------------------------------------------

class FamilyInvitation(models.Model):
    class InvitationType(models.TextChoices):
        OBSERVER = "observer", "Read-only observer"

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
        max_length=20,
        choices=InvitationType.choices,
        default=InvitationType.OBSERVER,
    )
    name = models.CharField(max_length=150)
    email = models.EmailField(blank=True)
    phone_number = models.CharField(max_length=20, blank=True)

    # Permission snapshot for the resulting FamilyMembership.
    can_view_readings      = models.BooleanField(default=True)
    can_view_care_plan     = models.BooleanField(default=True)
    can_view_visits        = models.BooleanField(default=True)
    can_view_reports       = models.BooleanField(default=True)
    can_view_prescriptions = models.BooleanField(default=True)
    can_view_lab_results   = models.BooleanField(default=True)
    can_view_history       = models.BooleanField(default=True)
    can_view_attention     = models.BooleanField(default=True)
    can_view_care_team     = models.BooleanField(default=True)

    token_hash = models.CharField(max_length=64, unique=True, editable=False)
    status = models.CharField(
        max_length=20, choices=Status.choices, default=Status.PENDING, db_index=True,
    )
    expires_at = models.DateTimeField()

    accepted_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True, blank=True,
        related_name="accepted_family_invitations",
    )
    accepted_at = models.DateTimeField(null=True, blank=True)

    otp_hash = models.CharField(max_length=64, blank=True, default="")
    otp_expires_at = models.DateTimeField(null=True, blank=True)
    otp_sent_at = models.DateTimeField(null=True, blank=True)
    otp_attempts = models.PositiveIntegerField(default=0)
    otp_locked_at = models.DateTimeField(null=True, blank=True)
    contact_verified_at = models.DateTimeField(null=True, blank=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["family", "status"], name="fi_family_status_idx"),
            models.Index(fields=["status", "expires_at"], name="fi_status_exp_idx"),
            models.Index(fields=["email", "status"], name="fi_email_status_idx"),
            models.Index(fields=["phone_number", "status"], name="fi_phone_status_idx"),
        ]

    def __str__(self):
        return f"{self.name} · {self.family_id} · {self.invitation_type}"

    @property
    def is_expired(self):
        return self.status == self.Status.PENDING and timezone.now() >= self.expires_at

    def clean(self):
        if not self.email and not self.phone_number:
            raise ValidationError("Either email or phone_number must be provided.")

    def seed_permissions(self) -> dict:
        """Return the permission dict to copy onto a FamilyMembership."""
        return {
            "can_view_readings":      self.can_view_readings,
            "can_view_care_plan":     self.can_view_care_plan,
            "can_view_visits":        self.can_view_visits,
            "can_view_reports":       self.can_view_reports,
            "can_view_prescriptions": self.can_view_prescriptions,
            "can_view_lab_results":   self.can_view_lab_results,
            "can_view_history":       self.can_view_history,
            "can_view_attention":     self.can_view_attention,
            "can_view_care_team":     self.can_view_care_team,
        }
    
class InvitationDelivery(models.Model):
    """One delivery attempt of an invitation."""

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
    channel = models.CharField(max_length=10, choices=Channel.choices)
    destination = models.CharField(max_length=255)
    status = models.CharField(
        max_length=20, choices=Status.choices, default=Status.PENDING,
    )
    provider_message_id = models.CharField(max_length=255, blank=True)
    error_message = models.TextField(blank=True)
    sent_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["invitation", "status"], name="id_inv_status_idx"),
        ]

    def __str__(self):
        return f"{self.channel} → {self.destination} ({self.status})"


# ---------------------------------------------------------------------------
# Reports
# ---------------------------------------------------------------------------

class FamilyReport(models.Model):
    """A periodic health summary for a member."""

    class Kind(models.TextChoices):
        WEEKLY = "weekly", "Weekly summary"
        MONTHLY = "monthly", "Monthly review"
        POST_VISIT = "post_visit", "Post-visit recap"
        AD_HOC = "ad_hoc", "Ad-hoc report"

    member = models.ForeignKey(
        FamilyMember,
        on_delete=models.CASCADE,
        related_name="reports",
    )
    kind = models.CharField(max_length=20, choices=Kind.choices, default=Kind.WEEKLY)
    title = models.CharField(max_length=200)
    summary = models.TextField(blank=True)
    tone = models.CharField(max_length=10, choices=Tone.choices, default=Tone.INFO)
    published_at = models.DateTimeField(default=timezone.now)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-published_at"]
        indexes = [
            models.Index(fields=["member", "-published_at"], name="frep_member_pub_idx"),
        ]

    def __str__(self):
        return f"{self.member.full_name} · {self.title}"


class FamilyReportRead(models.Model):
    """Tracks which user has read which report (per-user 'new' flag)."""

    report = models.ForeignKey(
        FamilyReport,
        on_delete=models.CASCADE,
        related_name="reads",
    )
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="family_report_reads",
    )
    read_at = models.DateTimeField(default=timezone.now)

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=["report", "user"],
                name="unique_report_read_per_user",
            ),
        ]
        indexes = [
            models.Index(fields=["user", "-read_at"], name="frr_user_read_idx"),
        ]

    def __str__(self):
        return f"{self.user} read {self.report_id}"


# ---------------------------------------------------------------------------
# Prescriptions
# ---------------------------------------------------------------------------

class FamilyPrescription(models.Model):
    class Status(models.TextChoices):
        ACTIVE = "active", "Active"
        REFILL_SOON = "refill_soon", "Refill soon"
        EXPIRED = "expired", "Expired"
        STOPPED = "stopped", "Stopped"

    member = models.ForeignKey(
        FamilyMember,
        on_delete=models.CASCADE,
        related_name="prescriptions",
    )
    name = models.CharField(max_length=200)
    dose = models.CharField(max_length=100)                  # "500 mg · twice daily"
    prescribed_by = models.CharField(max_length=200)
    refill_note = models.CharField(max_length=200, blank=True)
    status = models.CharField(
        max_length=20, choices=Status.choices, default=Status.ACTIVE,
    )
    tone = models.CharField(max_length=10, choices=Tone.choices, default=Tone.GOOD)
    started_at = models.DateField(default=timezone.localdate)
    ended_at = models.DateField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["member", "status"], name="fpres_member_status_idx"),
        ]

    def __str__(self):
        return f"{self.name} ({self.dose})"

    def clean(self):
        if self.ended_at and self.ended_at < self.started_at:
            raise ValidationError({"ended_at": "End date cannot be before start date."})


# ---------------------------------------------------------------------------
# Lab results
# ---------------------------------------------------------------------------

class FamilyLabResult(models.Model):
    class Status(models.TextChoices):
        NORMAL = "normal", "Normal"
        REVIEW = "review", "Review"
        ABNORMAL = "abnormal", "Abnormal"

    member = models.ForeignKey(
        FamilyMember,
        on_delete=models.CASCADE,
        related_name="lab_results",
    )
    name = models.CharField(max_length=200)                  # "Complete blood count"
    value = models.CharField(max_length=100, blank=True)     # "Normal range"
    collected_at = models.DateField()
    status = models.CharField(
        max_length=20, choices=Status.choices, default=Status.NORMAL,
    )
    tone = models.CharField(max_length=10, choices=Tone.choices, default=Tone.GOOD)
    file_url = models.URLField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-collected_at"]
        indexes = [
            models.Index(fields=["member", "-collected_at"], name="flr_member_coll_idx"),
            models.Index(fields=["member", "status"], name="flr_member_status_idx"),
        ]

    def __str__(self):
        return f"{self.name} ({self.status})"

    def clean(self):
        if self.collected_at and self.collected_at > timezone.localdate():
            raise ValidationError({"collected_at": "Collection date cannot be in the future."})


# ---------------------------------------------------------------------------
# History
# ---------------------------------------------------------------------------

class FamilyHistoryEntry(models.Model):
    member = models.ForeignKey(
        FamilyMember,
        on_delete=models.CASCADE,
        related_name="history_entries",
    )
    title = models.CharField(max_length=200)                 # "Hypertension"
    detail = models.CharField(max_length=300, blank=True)    # "Diagnosed 2018"
    year = models.PositiveSmallIntegerField(null=True, blank=True)
    icon = models.CharField(max_length=40, blank=True)
    tone = models.CharField(max_length=10, choices=Tone.choices, default=Tone.GOOD)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = [F("year").desc(nulls_last=True), "-created_at"]
        verbose_name_plural = "family history entries"
        indexes = [
            models.Index(fields=["member", "-year"], name="fhe_member_year_idx"),
        ]

    def __str__(self):
        return f"{self.title} ({self.year or '—'})"


# ---------------------------------------------------------------------------
# Audit log
# ---------------------------------------------------------------------------

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
        FAMILY_CREATED          = "family_created", "Family Created"
        MEMBER_CREATED          = "member_created", "Family Member Created"
        OBSERVER_INVITED        = "observer_invited", "Observer Invited"
        INVITATION_OTP_REQUESTED = "invitation_otp_requested", "Invitation OTP Requested"
        INVITATION_CONTACT_VERIFIED = "invitation_contact_verified", "Invitation Contact Verified"
        OBSERVER_ACCEPTED       = "observer_accepted", "Observer Accepted (existing user)"
        OBSERVER_REGISTERED     = "observer_registered", "Observer Registered (new user)"
        INVITATION_CANCELLED    = "invitation_cancelled", "Invitation Cancelled"
        INVITATION_EXPIRED      = "invitation_expired", "Invitation Expired"
        OTP_LOCKED              = "otp_locked", "OTP Verification Locked"
        MEMBERSHIP_REVOKED      = "membership_revoked", "Family Membership Revoked"
        MEMBERSHIP_PERMS_CHANGED = "membership_perms_changed", "Membership Permissions Changed"

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
    member = models.ForeignKey(
        "FamilyMember",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="audit_logs",
    )
    action = models.CharField(max_length=50, choices=Action.choices)
    invitation = models.ForeignKey(
        FamilyInvitation,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="audit_logs",
    )
    metadata = models.JSONField(default=dict, blank=True)
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    user_agent = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["family", "-created_at"], name="fa_family_created_idx"),
            models.Index(fields=["actor", "-created_at"], name="fa_actor_created_idx"),
            models.Index(fields=["action", "-created_at"], name="fa_action_created_idx"),
            models.Index(fields=["invitation", "-created_at"], name="fa_inv_created_idx"),
            models.Index(fields=["member", "-created_at"], name="fa_member_created_idx"),
        ]

    def __str__(self):
        return f"{self.family_id} · {self.action} · {self.created_at}"
    