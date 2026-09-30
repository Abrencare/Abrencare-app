from django.utils import timezone
from rest_framework import serializers

from .models import (
    ServiceVisit,
    VitalReading,
    PatientObservation,
    PatientAlert,
    CareTask,
    CareTeamAssignment,
    Patient,
    FamilyMember, FamilyProfile,
    FamilyReading, CarePlanItem, CareVisit,
    FamilyCareTeamMember, FamilyAttentionFlag,
    FamilyHistoryEntry,
    FamilyLabResult,
    FamilyPrescription,
    FamilyReport
)

def _format_date_label(dt) -> str:
    """Portable equivalent of strftime('%-d')/('%#d') — works on Windows too."""
    return f"{dt:%b} {dt.day}, {dt.year}"


def _format_day_label(dt) -> str:
    return str(dt.day)

# ============================================================
# INDIVIDUAL SERIALIZERS
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

    Input also accepts snake_case where it's natural to do so — DRF's
    `source=` makes this transparent for reads, and toWire() sends
    snake_case for date_of_birth / emergency_phone, which `source=` picks
    up on the way in.
    """

    id = serializers.CharField(source="pk", read_only=True)
    name = serializers.CharField(source="full_name")
    dateOfBirth = serializers.DateField(
        source="date_of_birth", allow_null=True, required=False,
    )
    emergencyPhone = serializers.CharField(
        source="emergency_phone", allow_blank=True, required=False,
    )

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
        ]

    def validate_name(self, value):
        value = value.strip()
        if not value:
            raise serializers.ValidationError("Name cannot be blank.")
        return value

    def validate_relationship(self, value):
        valid = {c[0] for c in FamilyMember.Relationship.choices}
        if value not in valid:
            raise serializers.ValidationError("Invalid relationship.")
        return value


class FamilyProfileSerializer(serializers.ModelSerializer):
    """
    Read/write serializer for GET/PUT /family/profile/.

    Wire shape:
      { "onboarded": bool, "members": [ {...}, ... ] }

    `onboarded` is read-only here — it's owned by UserService and flipped
    only via POST /family/onboarding/complete/.
    """

    onboarded = serializers.SerializerMethodField()
    members = FamilyMemberSerializer(many=True, required=False)

    class Meta:
        model = FamilyProfile
        fields = ["onboarded", "members"]

    def get_onboarded(self, obj):
        return bool(obj.user_service.onboarded)


class FamilyMemberWriteSerializer(serializers.Serializer):
    """
    Used by FamilyProfileSerializer.update via `members` write input.
    Kept separate so read and write concerns don't leak into each other.
    """
    # Not strictly necessary if we just re-use FamilyMemberSerializer for
    # write, but keeping the hook here means swapping to upsert-by-id later
    # is a one-file change.
    pass

class ServiceVisitSerializer(serializers.ModelSerializer):
    clinician_name = serializers.SerializerMethodField()
    status_display = serializers.CharField(
        source="get_status_display", read_only=True,
    )

    class Meta:
        model = ServiceVisit
        fields = [
            "id", "patient", "clinician", "clinician_name",
            "status", "status_display",
            "started_at", "ended_at", "summary",
            "created_at", "updated_at",
        ]
        read_only_fields = fields

    def get_clinician_name(self, obj):
        if not obj.clinician:
            return None
        return obj.clinician.get_full_name() or obj.clinician.username


class VitalReadingSerializer(serializers.ModelSerializer):
    kind_display = serializers.CharField(
        source="get_kind_display", read_only=True,
    )
    status_display = serializers.CharField(
        source="get_status_display", read_only=True,
    )
    recorded_by_name = serializers.SerializerMethodField()

    class Meta:
        model = VitalReading
        fields = [
            "id", "patient", "kind", "kind_display",
            "value", "unit", "status", "status_display",
            "recorded_by", "recorded_by_name",
            "recorded_at", "created_at",
        ]
        read_only_fields = fields

    def get_recorded_by_name(self, obj):
        if not obj.recorded_by:
            return None
        return obj.recorded_by.get_full_name() or obj.recorded_by.username


class PatientObservationSerializer(serializers.ModelSerializer):
    kind_display = serializers.CharField(
        source="get_kind_display", read_only=True,
    )
    status_display = serializers.CharField(
        source="get_status_display", read_only=True,
    )

    class Meta:
        model = PatientObservation
        fields = [
            "id", "patient", "kind", "kind_display",
            "label", "status", "status_display", "note",
            "recorded_by", "recorded_at",
        ]
        read_only_fields = fields


class PatientAlertSerializer(serializers.ModelSerializer):
    severity_display = serializers.CharField(
        source="get_severity_display", read_only=True,
    )
    is_open = serializers.BooleanField(read_only=True)

    class Meta:
        model = PatientAlert
        fields = [
            "id", "patient", "severity", "severity_display",
            "title", "body", "source",
            "resolved_at", "is_open", "created_at",
        ]
        read_only_fields = fields


class CareTaskSerializer(serializers.ModelSerializer):
    status_display = serializers.CharField(
        source="get_status_display", read_only=True,
    )
    time = serializers.SerializerMethodField()

    class Meta:
        model = CareTask
        fields = [
            "id", "patient", "title",
            "scheduled_at", "time", "status", "status_display",
            "completed_by", "completed_at", "created_at",
        ]
        read_only_fields = fields

    def get_time(self, obj):
        # Match the Appointment.time shape (HH:mm, 24h).
        return timezone.localtime(obj.scheduled_at).strftime("%H:%M")


class CareTeamAssignmentSerializer(serializers.ModelSerializer):
    role_display = serializers.CharField(
        source="get_role_display", read_only=True,
    )
    full_name = serializers.SerializerMethodField()
    phone_number = serializers.CharField(
        source="staff.phone_number", read_only=True, default="",
    )
    profile_picture_url = serializers.SerializerMethodField()
    is_active = serializers.BooleanField(read_only=True)

    class Meta:
        model = CareTeamAssignment
        fields = [
            "id", "patient", "staff", "full_name", "phone_number",
            "profile_picture_url",
            "role", "role_display", "is_primary", "is_active",
            "started_at", "ended_at",
        ]
        read_only_fields = fields

    def get_full_name(self, obj):
        return obj.staff.get_full_name() or obj.staff.username

    def get_profile_picture_url(self, obj):
        return getattr(obj.staff, "profile_picture_url", None)


# ============================================================
# AGGREGATE — ONE CALL FOR THE FAMILY DASHBOARD
# ============================================================

def _tone_for(status: str) -> str:
    """Map backend status → frontend Tone union ('good' | 'info' | 'flag')."""
    return {"good": "good", "info": "info", "flag": "flag"}.get(status, "info")


# Order matters — this is the order tiles appear on the screen.
_DASHBOARD_VITAL_KINDS = [
    VitalReading.Kind.BLOOD_PRESSURE,
    VitalReading.Kind.HEART_RATE,
    VitalReading.Kind.SPO2,
    VitalReading.Kind.WEIGHT,
]


class PatientSummarySerializer(serializers.ModelSerializer):
    full_name = serializers.SerializerMethodField()
    initials = serializers.SerializerMethodField()
    phone_number = serializers.CharField(source="user.phone_number", default="")

    class Meta:
        model = Patient
        fields = ["id", "full_name", "initials", "phone_number"]

    def get_full_name(self, obj):
        return obj.user.get_full_name() or obj.user.username

    def get_initials(self, obj):
        name = self.get_full_name(obj)
        return "".join(p[0].upper() for p in name.split()[:2])


class FamilyOverviewSerializer(serializers.Serializer):
    """
    Aggregated payload that maps 1:1 to FamilyOverview.tsx.
    """

    patient = serializers.SerializerMethodField()
    active_visit = serializers.SerializerMethodField()
    open_alert = serializers.SerializerMethodField()
    readings = serializers.SerializerMethodField()
    care_plan = serializers.SerializerMethodField()
    care_plan_progress = serializers.SerializerMethodField()
    care_team = serializers.SerializerMethodField()

    # ---------- patient ----------

    def get_patient(self, patient):
        user = patient.user
        full_name = user.get_full_name() or user.username
        initials = "".join(
            part[0].upper() for part in full_name.split()[:2]
        )
        return {
            "id": patient.id,
            "user_id": user.id,
            "full_name": full_name,
            "initials": initials,
            "phone_number": getattr(user, "phone_number", ""),
        }

    # ---------- live visit ----------

    def get_active_visit(self, patient):
        visit = (
            patient.visits
            .filter(status=ServiceVisit.Status.IN_PROGRESS)
            .select_related("clinician")
            .order_by("-started_at")
            .first()
        )
        if not visit:
            return None
        return ServiceVisitSerializer(visit).data

    # ---------- top alert ----------

    def get_open_alert(self, patient):
        # Critical beats warning beats info.
        severity_rank = {
            PatientAlert.Severity.CRITICAL: 0,
            PatientAlert.Severity.WARNING: 1,
            PatientAlert.Severity.INFO: 2,
        }
        open_alerts = list(
            patient.alerts.filter(resolved_at__isnull=True)
        )
        if not open_alerts:
            return None
        open_alerts.sort(key=lambda a: severity_rank.get(a.severity, 99))
        return PatientAlertSerializer(open_alerts[0]).data

    # ---------- readings ----------

    def get_readings(self, patient):
        rows = []

        for kind in _DASHBOARD_VITAL_KINDS:
            reading = (
                patient.vital_readings
                .filter(kind=kind)
                .order_by("-recorded_at")
                .first()
            )
            if not reading:
                continue
            rows.append({
                "kind": reading.kind,
                "label": reading.get_kind_display(),
                "value": reading.value,
                "unit": reading.unit,
                "status": reading.status,
                "tone": _tone_for(reading.status),
                "recorded_at": reading.recorded_at,
            })

        # Latest observation rides along as an extra tile.
        latest_obs = (
            patient.observations.order_by("-recorded_at").first()
        )
        if latest_obs:
            rows.append({
                "kind": latest_obs.kind,
                "label": latest_obs.get_kind_display(),
                "value": latest_obs.label,
                "unit": "",
                "status": latest_obs.status,
                "tone": _tone_for(latest_obs.status),
                "recorded_at": latest_obs.recorded_at,
            })

        return rows

    # ---------- care plan ----------

    def _todays_tasks(self, patient):
        today = timezone.localdate()
        return patient.care_tasks.filter(scheduled_at__date=today)

    def get_care_plan(self, patient):
        qs = self._todays_tasks(patient).order_by("scheduled_at")
        return CareTaskSerializer(qs, many=True).data

    def get_care_plan_progress(self, patient):
        qs = self._todays_tasks(patient)
        total = qs.count()
        done = qs.filter(status=CareTask.Status.DONE).count()
        return {
            "done": done,
            "total": total,
            "percent": round((done / total) * 100) if total else 0,
        }

    # ---------- care team ----------

    def get_care_team(self, patient):
        qs = (
            patient.care_team
            .filter(ended_at__isnull=True)
            .select_related("staff")
        )
        return CareTeamAssignmentSerializer(qs, many=True).data


# ============================================================
# WRITE SERIALIZERS (staff side — nursing app)
# ============================================================

class VitalReadingCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = VitalReading
        fields = ["patient", "kind", "value", "unit", "status", "recorded_at"]
        extra_kwargs = {
            "recorded_at": {"required": False},
            "unit": {"required": False},
            "status": {"required": False},
        }


class CareTaskCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = CareTask
        fields = ["patient", "title", "scheduled_at", "status"]


class PatientAlertResolveSerializer(serializers.Serializer):
    resolved = serializers.BooleanField(default=True)


class FamilyReadingSerializer(serializers.ModelSerializer):
    class Meta:
        model = FamilyReading
        fields = ["id", "kind", "value", "status", "tone", "recorded_at"]
        read_only_fields = ["id", "recorded_at"]


class CarePlanItemSerializer(serializers.ModelSerializer):
    class Meta:
        model = CarePlanItem
        fields = ["id", "title", "scheduled_time", "done", "order", "created_at"]
        read_only_fields = ["id", "created_at"]


class CareVisitSerializer(serializers.ModelSerializer):
    class Meta:
        model = CareVisit
        fields = [
            "id", "nurse_name", "state",
            "started_at", "ended_at", "created_at",
        ]
        read_only_fields = ["id", "created_at"]


class FamilyCareTeamMemberSerializer(serializers.ModelSerializer):
    class Meta:
        model = FamilyCareTeamMember
        fields = [
            "id", "role", "full_name", "phone",
            "available_now", "on_visit",
        ]


class FamilyAttentionFlagSerializer(serializers.ModelSerializer):
    class Meta:
        model = FamilyAttentionFlag
        fields = [
            "id", "label", "title", "body",
            "tone", "resolved", "created_at",
        ]


class FamilyMemberOverviewSerializer(serializers.ModelSerializer):
    readings = FamilyReadingSerializer(many=True, read_only=True)
    care_plan_items = CarePlanItemSerializer(many=True, read_only=True)
    visits = CareVisitSerializer(many=True, read_only=True)
    care_team = serializers.SerializerMethodField()
    attention_flags = serializers.SerializerMethodField()

    class Meta:
        model = FamilyMember
        fields = [
            "id", "full_name", "relationship", "date_of_birth",
            "phone", "city", "address", "emergency_phone", "notes",
            "readings", "care_plan_items", "visits",
            "care_team", "attention_flags",
        ]

    def get_care_team(self, member):
        qs = FamilyCareTeamMember.objects.filter(
            family_profile=member.family_profile,
        )
        return FamilyCareTeamMemberSerializer(qs, many=True).data

    def get_attention_flags(self, member):
        qs = FamilyAttentionFlag.objects.filter(
            family_profile=member.family_profile,
            resolved=False,
        )
        return FamilyAttentionFlagSerializer(qs, many=True).data


class FamilyReportSerializer(serializers.ModelSerializer):
    date_label = serializers.SerializerMethodField()
    day_label = serializers.SerializerMethodField()
    description = serializers.CharField(source="summary")
    tone = serializers.CharField(source="status")   # if you standardize on the same enum
    is_new = serializers.BooleanField()

    class Meta:
        model = FamilyReport
        fields = ["id", "date_label", "day_label", "description", "tone", "is_new"]

    def get_date_label(self, obj):
        return _format_date_label(obj.published_at)

    def get_day_label(self, obj):
        return _format_day_label(obj.published_at)


class FamilyPrescriptionSerializer(serializers.ModelSerializer):
    doctor = serializers.CharField(source="prescribed_by")
    refill = serializers.CharField(source="refill_note")
    status = serializers.CharField(source="get_status_display", read_only=True)

    class Meta:
        model = FamilyPrescription
        fields = ["id", "name", "dose", "doctor", "refill", "status", "tone"]


class FamilyLabResultSerializer(serializers.ModelSerializer):
    date = serializers.SerializerMethodField()
    status = serializers.CharField(source="get_status_display", read_only=True)

    class Meta:
        model = FamilyLabResult
        fields = ["id", "name", "date", "value", "status", "tone"]

    def get_date(self, obj):
        return _format_date_label(obj.collected_at)


class FamilyHistoryEntrySerializer(serializers.ModelSerializer):
    class Meta:
        model = FamilyHistoryEntry
        fields = ["id", "title", "detail", "year", "icon", "tone"]

