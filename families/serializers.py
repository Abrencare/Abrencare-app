from django.utils import timezone
from rest_framework import serializers

from .models import (
    FamilyMembership,
    FamilyProfile,
    FamilyMember,
    FamilyReading,
    CarePlanItem,
    CareVisit,
    FamilyCareTeamMember,
    FamilyAttentionFlag,
    FamilyInvitation,
    InvitationDelivery,
    FamilyReport,
    FamilyReportRead,
    FamilyPrescription,
    FamilyLabResult,
    FamilyHistoryEntry,
    FamilyAuditLog,
    Tone,
    Severity,
    Relationship,
)


# ============================================================
# HELPERS
# ============================================================

def _format_date_label(dt) -> str:
    """Portable strftime('%-d') / ('%#d') — works on Windows too."""
    return f"{dt:%b} {dt.day}, {dt.year}"


def _format_day_label(dt) -> str:
    return str(dt.day)


def _initials(full_name: str) -> str:
    return "".join(part[0].upper() for part in full_name.split()[:2])

class MembershipPermissionUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model = FamilyMembership
        fields = [
            "can_view_readings", "can_view_care_plan", "can_view_visits",
            "can_view_reports", "can_view_prescriptions", "can_view_lab_results",
            "can_view_history", "can_view_attention", "can_view_care_team",
        ]
        
# ============================================================
# FAMILY / MEMBER
# ============================================================

class FamilyMemberSerializer(serializers.ModelSerializer):
    """
    Wire format is camelCase to match FamilyContext.normalizeMember().

    Server field        →  Wire field
    ----------------------------------
    full_name           →  name
    date_of_birth       →  dateOfBirth
    emergency_phone     →  emergencyPhone
    pk                  →  id (as string)
    """

    id = serializers.CharField(source="pk", read_only=True)
    name = serializers.CharField(source="full_name")
    dateOfBirth = serializers.DateField(
        source="date_of_birth", allow_null=True, required=False,
    )
    emergencyPhone = serializers.CharField(
        source="emergency_phone", allow_blank=True, required=False,
    )
    is_primary = serializers.BooleanField(required=False)

    class Meta:
        model = FamilyMember
        fields = [
            "id",
            "name",
            "relationship",
            "dateOfBirth",
            "phone",
            "city",
            "address",
            "emergencyPhone",
            "notes",
            "is_primary",
        ]

    def validate_name(self, value):
        value = value.strip()
        if not value:
            raise serializers.ValidationError("Name cannot be blank.")
        return value

    def validate_relationship(self, value):
        valid = {c[0] for c in Relationship.choices}
        if value not in valid:
            raise serializers.ValidationError("Invalid relationship.")
        return value


class FamilyProfileSerializer(serializers.ModelSerializer):
    """
    Read/write serializer for GET/PUT /family/profile/.

    Wire shape:
      { "onboarded": bool, "members": [ {...}, ... ] }
    """

    onboarded = serializers.SerializerMethodField()
    members = FamilyMemberSerializer(many=True, required=False)

    class Meta:
        model = FamilyProfile
        fields = ["id", "name", "onboarded", "members"]
        read_only_fields = ["id"]

    def get_onboarded(self, obj):
        return bool(getattr(obj.user_service, "onboarded", False))


# ============================================================
# READINGS
# ============================================================

class FamilyReadingSerializer(serializers.ModelSerializer):
    kind_display = serializers.CharField(source="get_kind_display", read_only=True)

    class Meta:
        model = FamilyReading
        fields = [
            "id",
            "kind",
            "kind_display",
            "value",
            "unit",
            "status",
            "tone",
            "note",
            "recorded_at",
        ]
        read_only_fields = ["id", "recorded_at"]


# ============================================================
# CARE PLAN
# ============================================================

class CarePlanItemSerializer(serializers.ModelSerializer):
    status_display = serializers.CharField(source="get_status_display", read_only=True)

    class Meta:
        model = CarePlanItem
        fields = [
            "id",
            "title",
            "scheduled_time",
            "status",
            "status_display",
            "done",
            "order",
            "completed_at",
            "created_at",
        ]
        read_only_fields = ["id", "created_at", "completed_at"]


# ============================================================
# VISITS
# ============================================================

class CareVisitSerializer(serializers.ModelSerializer):
    state_display = serializers.CharField(source="get_state_display", read_only=True)
    clinician_name = serializers.SerializerMethodField()

    class Meta:
        model = CareVisit
        fields = [
            "id",
            "clinician",
            "clinician_name",
            "nurse_name",
            "state",
            "state_display",
            "scheduled_at",
            "started_at",
            "ended_at",
            "summary",
            "created_at",
        ]
        read_only_fields = ["id", "created_at"]

    def get_clinician_name(self, obj):
        if not obj.clinician:
            return obj.nurse_name or None
        return obj.clinician.full_name() or obj.clinician.get_username()


# ============================================================
# CARE TEAM
# ============================================================

class FamilyCareTeamMemberSerializer(serializers.ModelSerializer):
    role_display = serializers.CharField(source="get_role_display", read_only=True)
    is_active = serializers.BooleanField(read_only=True)
    profile_picture_url = serializers.SerializerMethodField()

    class Meta:
        model = FamilyCareTeamMember
        fields = [
            "id",
            "staff",
            "role",
            "role_display",
            "full_name",
            "phone",
            "is_primary",
            "is_active",
            "available_now",
            "on_visit",
            "profile_picture_url",
        ]

    def get_profile_picture_url(self, obj):
        return getattr(obj.staff, "profile_picture_url", None) if obj.staff else None


# ============================================================
# ATTENTION FLAGS
# ============================================================

class FamilyAttentionFlagSerializer(serializers.ModelSerializer):
    severity_display = serializers.CharField(
        source="get_severity_display", read_only=True,
    )
    is_open = serializers.BooleanField(read_only=True)

    class Meta:
        model = FamilyAttentionFlag
        fields = [
            "id",
            "member",
            "label",
            "title",
            "body",
            "severity",
            "severity_display",
            "tone",
            "source",
            "resolved",
            "is_open",
            "resolved_at",
            "created_at",
        ]
        read_only_fields = ["id", "created_at", "resolved_at"]


# ============================================================
# REPORTS
# ============================================================

class FamilyReportSerializer(serializers.ModelSerializer):
    date_label = serializers.SerializerMethodField()
    day_label = serializers.SerializerMethodField()
    description = serializers.CharField(source="summary")
    is_new = serializers.SerializerMethodField()

    class Meta:
        model = FamilyReport
        fields = [
            "id",
            "kind",
            "title",
            "description",
            "tone",
            "date_label",
            "day_label",
            "is_new",
            "published_at",
        ]

    def get_date_label(self, obj):
        return _format_date_label(obj.published_at)

    def get_day_label(self, obj):
        return _format_day_label(obj.published_at)

    def get_is_new(self, obj):
        request = self.context.get("request")
        if not request or not request.user.is_authenticated:
            return False
        return not FamilyReportRead.objects.filter(
            report=obj, user=request.user,
        ).exists()


# ============================================================
# PRESCRIPTIONS / LABS / HISTORY
# ============================================================

class FamilyPrescriptionSerializer(serializers.ModelSerializer):
    doctor = serializers.CharField(source="prescribed_by")
    refill = serializers.CharField(source="refill_note", allow_blank=True)
    status_display = serializers.CharField(
        source="get_status_display", read_only=True,
    )

    class Meta:
        model = FamilyPrescription
        fields = [
            "id",
            "name",
            "dose",
            "doctor",
            "refill",
            "status",
            "status_display",
            "tone",
            "started_at",
            "ended_at",
        ]


class FamilyLabResultSerializer(serializers.ModelSerializer):
    date = serializers.SerializerMethodField()
    status_display = serializers.CharField(
        source="get_status_display", read_only=True,
    )

    class Meta:
        model = FamilyLabResult
        fields = [
            "id",
            "name",
            "date",
            "value",
            "status",
            "status_display",
            "tone",
            "file_url",
        ]

    def get_date(self, obj):
        return _format_date_label(obj.collected_at)


class FamilyHistoryEntrySerializer(serializers.ModelSerializer):
    class Meta:
        model = FamilyHistoryEntry
        fields = ["id", "title", "detail", "year", "icon", "tone"]


# ============================================================
# AGGREGATE — ONE CALL FOR THE FAMILY DASHBOARD
# ============================================================

class FamilyMemberOverviewSerializer(serializers.ModelSerializer):
    """
    Aggregated payload that maps 1:1 to FamilyOverview.tsx for a single member.
    Everything the dashboard needs is nested here.
    """

    readings = serializers.SerializerMethodField()
    care_plan_items = serializers.SerializerMethodField()
    care_plan_progress = serializers.SerializerMethodField()
    active_visit = serializers.SerializerMethodField()
    visits = CareVisitSerializer(many=True, read_only=True)
    open_attention_flags = serializers.SerializerMethodField()
    care_team = serializers.SerializerMethodField()
    prescriptions = FamilyPrescriptionSerializer(many=True, read_only=True)
    lab_results = FamilyLabResultSerializer(many=True, read_only=True)
    history = FamilyHistoryEntrySerializer(
        source="history_entries", many=True, read_only=True,
    )
    reports = FamilyReportSerializer(many=True, read_only=True)
    initials = serializers.SerializerMethodField()

    class Meta:
        model = FamilyMember
        fields = [
            "id",
            "full_name",
            "initials",
            "relationship",
            "date_of_birth",
            "phone",
            "city",
            "address",
            "emergency_phone",
            "notes",
            "is_primary",
            "readings",
            "care_plan_items",
            "care_plan_progress",
            "active_visit",
            "visits",
            "open_attention_flags",
            "care_team",
            "prescriptions",
            "lab_results",
            "history",
            "reports",
        ]

    def get_initials(self, obj):
        return _initials(obj.full_name)

    # ---------- readings ----------

    def get_readings(self, obj):
        """Latest reading per kind, in the dashboard's tile order."""
        preferred = [
            FamilyReading.Kind.BP,
            FamilyReading.Kind.MEDICATION,
            FamilyReading.Kind.BLOOD_SAMPLE,
            FamilyReading.Kind.ANKLE_SWELLING,
            FamilyReading.Kind.HEART_RATE,
            FamilyReading.Kind.SPO2,
            FamilyReading.Kind.WEIGHT,
            FamilyReading.Kind.TEMPERATURE,
            FamilyReading.Kind.BLOOD_GLUCOSE,
        ]
        seen: dict[str, FamilyReading] = {}
        for reading in obj.readings.all().order_by("-recorded_at"):
            seen.setdefault(reading.kind, reading)

        rows = []
        for kind in preferred + [FamilyReading.Kind.OTHER]:
            reading = seen.get(kind)
            if not reading:
                continue
            rows.append(FamilyReadingSerializer(reading).data)
        return rows

    # ---------- care plan ----------

    def _todays_items(self, obj):
        today = timezone.localdate()
        return obj.care_plan_items.filter(created_at__date=today)

    def get_care_plan_items(self, obj):
        qs = self._todays_items(obj).order_by("order", "scheduled_time")
        return CarePlanItemSerializer(qs, many=True).data

    def get_care_plan_progress(self, obj):
        qs = self._todays_items(obj)
        total = qs.count()
        done = qs.filter(done=True).count()
        return {
            "done": done,
            "total": total,
            "percent": round((done / total) * 100) if total else 0,
        }

    # ---------- visits ----------

    def get_active_visit(self, obj):
        visit = (
            obj.visits
            .filter(state=CareVisit.State.IN_PROGRESS)
            .select_related("clinician")
            .order_by("-started_at")
            .first()
        )
        return CareVisitSerializer(visit).data if visit else None

    # ---------- attention ----------

    def get_open_attention_flags(self, obj):
        qs = (
            obj.attention_flags
            .filter(resolved=False)
            .order_by("-created_at")
        )
        return FamilyAttentionFlagSerializer(qs, many=True).data

    # ---------- care team ----------

    def get_care_team(self, obj):
        qs = (
            FamilyCareTeamMember.objects
            .filter(family=obj.family, ended_at__isnull=True)
            .select_related("staff")
            .order_by("-is_primary", "role", "full_name")
        )
        return FamilyCareTeamMemberSerializer(qs, many=True).data


# ============================================================
# INVITATIONS (read-only + create)
# ============================================================

class InvitationDeliverySerializer(serializers.ModelSerializer):
    class Meta:
        model = InvitationDelivery
        fields = [
            "id", "channel", "destination", "status",
            "provider_message_id", "sent_at", "created_at",
        ]
        read_only_fields = fields


class FamilyInvitationSerializer(serializers.ModelSerializer):
    is_expired = serializers.BooleanField(read_only=True)

    class Meta:
        model = FamilyInvitation
        fields = [
            "id",
            "family",         # read-only
            "invited_by",     # read-only
            "invitation_type",
            "name", "email", "phone_number",
            # ... can_view_* fields ...
            "status",         # read-only
            "expires_at",     # read-only — computed by the service
            "is_expired",     # read-only
            "accepted_by",    # read-only
            "accepted_at",    # read-only
            "contact_verified_at",  # read-only
            "created_at",
        ]
        read_only_fields = [
            "id",
            "family",
            "invited_by",
            "status",
            "expires_at",
            "is_expired",
            "accepted_by",
            "accepted_at",
            "contact_verified_at",
            "created_at",
        ]

    def validate(self, attrs):
        if not attrs.get("email") and not attrs.get("phone_number"):
            raise serializers.ValidationError(
                "Either email or phone_number must be provided."
            )
        return attrs

    def create(self, validated_data):
        from django.utils import timezone
        from datetime import timedelta
        from .services.constants import INVITATION_EXPIRY_DAYS
        validated_data.setdefault(
            "expires_at",
            timezone.now() + timedelta(days=INVITATION_EXPIRY_DAYS),
        )
        return super().create(validated_data)


class FamilyMembershipSerializer(serializers.ModelSerializer):
    user_full_name = serializers.SerializerMethodField()
    user_email = serializers.EmailField(source="user.email", read_only=True)

    class Meta:
        model = FamilyMembership
        fields = [
            "id", "family", "user", "user_full_name", "user_email",
            "role",
            "can_view_readings", "can_view_care_plan", "can_view_visits",
            "can_view_reports", "can_view_prescriptions", "can_view_lab_results",
            "can_view_history", "can_view_attention", "can_view_care_team",
            "can_write", "joined_at", "revoked_at",
        ]
        read_only_fields = ["id", "family", "user", "role", "joined_at", "revoked_at"]

    def get_user_full_name(self, obj):
        return obj.user.full_name or obj.user.get_username()
    
# ============================================================
# AUDIT LOG (read-only)
# ============================================================

class FamilyAuditLogSerializer(serializers.ModelSerializer):
    class Meta:
        model = FamilyAuditLog
        fields = [
            "id", "family", "actor", "action",
            "invitation", 
            "metadata", "ip_address", "user_agent", "created_at",
        ]
        read_only_fields = fields