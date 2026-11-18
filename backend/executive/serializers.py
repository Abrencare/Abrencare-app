from datetime import date as date_cls, datetime

from django.contrib.auth import get_user_model
from django.db import transaction
from django.utils import timezone
from django.utils.dateparse import parse_date
from rest_framework import serializers

from .models import (
    CareTeamMember,
    EmergencyEvent,
    EmergencyTimelineStep,
    ExecutiveProfile,
    HealthAlert,
    HealthProgrammeItem,
    HealthScoreSnapshot,
    LabResult,
    Medication,
    MedicationAlert,
    MedicationSchedule,
    MonitorFrequency,
    MonitorMetric,
    Reading,
    Severity,
    UpcomingCare,
    WeeklyReport,
)

User = get_user_model()


# ============================================================================
# VOCABULARY NORMALIZATION (frontend ⇄ backend)
# ============================================================================

GENDER_FRONT_TO_BACK = {
    "male": "male",
    "female": "female",
    "other": "other",
    "preferNot": "prefer_not",
    "prefer_not": "prefer_not",
}

GENDER_BACK_TO_FRONT = {
    "male": "male",
    "female": "female",
    "other": "other",
    "prefer_not": "preferNot",
}


# ============================================================================
# REUSABLE FIELD TYPES
# ============================================================================

class FlexibleDecimalField(serializers.DecimalField):
    """Accepts '172.5', 172.5, '' / None and returns Decimal or None."""

    def __init__(self, **kwargs):
        kwargs.setdefault("max_digits", 6)
        kwargs.setdefault("decimal_places", 2)
        super().__init__(**kwargs)

    def to_internal_value(self, data):
        if data in ("", None):
            return None
        if isinstance(data, str):
            data = data.strip()
            if data == "":
                return None
        try:
            return super().to_internal_value(data)
        except Exception:
            raise serializers.ValidationError("Must be a number.")


class FlexibleDateField(serializers.DateField):
    """Accepts ISO plus common human formats; returns date or None."""

    INPUT_FORMATS = [
        "%Y-%m-%d", "%Y/%m/%d",
        "%d-%m-%Y", "%d/%m/%Y", "%m/%d/%Y",
        "%d.%m.%Y",
        "%b %d, %Y", "%B %d, %Y",
        "%d %b %Y", "%d %B %Y",
        "%Y%m%d",
    ]

    def to_internal_value(self, data):
        if data in ("", None):
            return None
        if isinstance(data, date_cls):
            return data

        value = str(data).strip()
        if value == "":
            return None

        iso = parse_date(value)
        if iso is not None:
            return iso

        for fmt in self.INPUT_FORMATS:
            try:
                return datetime.strptime(value, fmt).date()
            except ValueError:
                continue

        raise serializers.ValidationError(
            "Date must be in YYYY-MM-DD format (e.g. 1990-05-12)."
        )


class CamelCaseMixin:
    """Map snake_case model fields to camelCase output keys."""

    CAMEL_MAP: dict[str, str] = {}

    def to_representation(self, instance):
        data = super().to_representation(instance)
        for snake, camel in self.CAMEL_MAP.items():
            if snake in data:
                data[camel] = data.pop(snake)
        return data


# ============================================================================
# EXECUTIVE PROFILE
# ============================================================================

class ExecutiveProfileSerializer(serializers.ModelSerializer):
    """Read/write serializer for ExecutiveProfileScreen.

    Nesting into `user_service.user` on update is done in `update()` via
    `source=` dotted fields. Reverse accessor is `executive_profile`
    (singular — it's a OneToOne).
    """

    # Write-through nested user fields
    dateOfBirth = FlexibleDateField(
        source="user_service.user.date_of_birth",
        required=False, allow_null=True,
    )
    gender = serializers.CharField(required=False, allow_null=True)
    heightCm = FlexibleDecimalField(
        source="user_service.user.height",
        required=False, allow_null=True,
    )
    weightKg = FlexibleDecimalField(
        source="user_service.user.weight",
        required=False, allow_null=True,
    )

    # Own fields
    monitoring = serializers.ListField(
        child=serializers.ChoiceField(choices=MonitorMetric.choices),
        required=False, allow_empty=True,
    )
    frequency = serializers.ChoiceField(
        choices=MonitorFrequency.choices, required=False,
    )

    class Meta:
        model = ExecutiveProfile
        fields = [
            "id", "name", "monitoring", "frequency",
            "dateOfBirth", "gender", "heightCm", "weightKg",
            "created_at", "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at"]

    def validate_gender(self, value):
        if value is None:
            return value
        normalized = GENDER_FRONT_TO_BACK.get(value)
        if not normalized:
            raise serializers.ValidationError(
                f"Invalid gender '{value}'. Expected one of: "
                f"{', '.join(GENDER_FRONT_TO_BACK)}"
            )
        return normalized

    def to_representation(self, instance):
        data = super().to_representation(instance)
        user = instance.user_service.user

        data["gender"] = GENDER_BACK_TO_FRONT.get(user.gender, user.gender)
        data["dateOfBirth"] = (
            user.date_of_birth.isoformat() if user.date_of_birth else ""
        )
        data["heightCm"] = f"{user.height:g}" if user.height is not None else ""
        data["weightKg"] = f"{user.weight:g}" if user.weight is not None else ""
        data["name"] = instance.name or user.full_name
        return data

    @transaction.atomic
    def update(self, instance, validated_data):
        us_data = validated_data.pop("user_service", {})
        user_data = us_data.pop("user", {}) if us_data else {}

        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()

        user = instance.user_service.user
        dirty = []
        for attr, value in user_data.items():
            if getattr(user, attr) != value:
                setattr(user, attr, value)
                dirty.append(attr)
        if dirty:
            user.save(update_fields=dirty)

        return instance


class ExecutiveProfileCreateSerializer(serializers.Serializer):
    """First POST from ExecutiveProfileScreen."""

    dateOfBirth = FlexibleDateField(required=True)
    gender = serializers.CharField(required=True)
    heightCm = FlexibleDecimalField(required=True)
    weightKg = FlexibleDecimalField(required=True)

    def validate_gender(self, value):
        normalized = GENDER_FRONT_TO_BACK.get(value)
        if not normalized:
            raise serializers.ValidationError(f"Invalid gender '{value}'.")
        return normalized


class ExecutiveCareSerializer(serializers.Serializer):
    """ExecutiveMonitorScreen write payload."""

    monitoring = serializers.ListField(
        child=serializers.ChoiceField(choices=MonitorMetric.choices),
        allow_empty=False,
    )
    frequency = serializers.ChoiceField(choices=MonitorFrequency.choices)


class ExecutiveOnboardingCompleteSerializer(serializers.Serializer):
    """Accepts camelCase OR snake_case; collapses to snake_case in validate()."""

    dateOfBirth = FlexibleDateField(required=False, allow_null=True)
    date_of_birth = FlexibleDateField(required=False, allow_null=True)

    gender = serializers.CharField(
        required=False, allow_null=True, allow_blank=True,
    )

    heightCm = FlexibleDecimalField(required=False, allow_null=True)
    height_cm = FlexibleDecimalField(required=False, allow_null=True)

    weightKg = FlexibleDecimalField(required=False, allow_null=True)
    weight_kg = FlexibleDecimalField(required=False, allow_null=True)

    monitoring = serializers.ListField(
        child=serializers.ChoiceField(choices=MonitorMetric.choices),
        allow_empty=False,
    )
    frequency = serializers.ChoiceField(choices=MonitorFrequency.choices)

    def validate_gender(self, value):
        if not value:
            return None
        normalized = GENDER_FRONT_TO_BACK.get(value)
        if not normalized:
            raise serializers.ValidationError(f"Invalid gender '{value}'.")
        return normalized

    def validate(self, attrs):
        dob = attrs.get("dateOfBirth") or attrs.get("date_of_birth")
        height = attrs.get("heightCm") or attrs.get("height_cm")
        weight = attrs.get("weightKg") or attrs.get("weight_kg")

        errors = {}
        if dob is None:
            errors["dateOfBirth"] = "Required."
        if height is None:
            errors["heightCm"] = "Required."
        if weight is None:
            errors["weightKg"] = "Required."
        if errors:
            raise serializers.ValidationError(errors)

        attrs["date_of_birth"] = dob
        attrs["height_cm"] = height
        attrs["weight_kg"] = weight
        return attrs


# ============================================================================
# READINGS / SCORES / ALERTS
# ============================================================================

class ReadingSerializer(CamelCaseMixin, serializers.ModelSerializer):
    """Frontend keeps consuming a plain `value` string."""

    class Meta:
        model = Reading
        fields = [
            "id", "metric", "display_value", "value_numeric",
            "value_secondary", "unit", "status", "recorded_at",
        ]
        read_only_fields = fields

    def to_representation(self, instance):
        data = super().to_representation(instance)
        # `display_value` is the canonical UI string, but fall back to
        # the legacy key name so older clients don't break.
        data["value"] = data.get("display_value") or ""
        return data


class HealthScoreSerializer(CamelCaseMixin, serializers.ModelSerializer):
    class Meta:
        model = HealthScoreSnapshot
        fields = ["id", "score", "caption", "recorded_at"]


class HealthAlertSerializer(CamelCaseMixin, serializers.ModelSerializer):
    class Meta:
        model = HealthAlert
        fields = [
            "id", "severity", "title", "body",
            "resolved", "resolved_at", "created_at",
        ]


# ============================================================================
# CARE TEAM / UPCOMING CARE
# ============================================================================

class CareTeamMemberSerializer(CamelCaseMixin, serializers.ModelSerializer):
    class Meta:
        model = CareTeamMember
        fields = [
            "id", "role", "full_name", "title",
            "phone", "available", "created_at",
        ]
        read_only_fields = ["id", "created_at"]

    # Alias so older frontend consumers keep working
    def to_representation(self, instance):
        data = super().to_representation(instance)
        data["name"] = data.get("full_name", "")
        data["initials"] = self._initials(data.get("full_name", ""))
        data["verified"] = True
        return data

    @staticmethod
    def _initials(name: str) -> str:
        parts = [p for p in (name or "").split() if p]
        if not parts:
            return ""
        if len(parts) == 1:
            return parts[0][:2].upper()
        return (parts[0][0] + parts[-1][0]).upper()


class UpcomingCareSerializer(CamelCaseMixin, serializers.ModelSerializer):
    class Meta:
        model = UpcomingCare
        fields = ["id", "title", "scheduled_for", "provided_by", "created_at"]
        read_only_fields = ["id", "created_at"]


# ============================================================================
# EXECUTIVE OVERVIEW AGGREGATE
# ============================================================================

class ExecutiveDashboardSerializer(serializers.Serializer):
    """Read-only aggregate consumed by ExecutiveOverview."""

    score = HealthScoreSerializer(allow_null=True)
    alert = HealthAlertSerializer(allow_null=True)
    attention = HealthAlertSerializer(allow_null=True)
    manager = CareTeamMemberSerializer(allow_null=True)
    physician = CareTeamMemberSerializer(allow_null=True)
    readings = ReadingSerializer(many=True)
    monitoring = serializers.ListField(child=serializers.CharField())
    frequency = serializers.CharField()
    lastMonitoredAt = serializers.DateTimeField(allow_null=True)
    upToDate = serializers.BooleanField()
    upcomingCare = UpcomingCareSerializer(allow_null=True)


# ============================================================================
# EMERGENCY
# ============================================================================

class EmergencyTimelineStepSerializer(serializers.ModelSerializer):
    class Meta:
        model = EmergencyTimelineStep
        fields = ["id", "label", "status", "happened_at", "order"]

    def to_representation(self, instance):
        data = super().to_representation(instance)
        data["text"] = data.pop("label")
        data["time"] = (
            timezone.localtime(instance.happened_at).strftime("%H:%M")
            if instance.happened_at else ""
        )
        return data


class EmergencyEventSerializer(serializers.ModelSerializer):
    timeline = EmergencyTimelineStepSerializer(many=True, read_only=True)

    class Meta:
        model = EmergencyEvent
        fields = [
            "id", "response_id", "status", "eta_minutes",
            "activated_at", "resolved_at", "timeline",
        ]

    def to_representation(self, instance):
        data = super().to_representation(instance)
        data["responseId"] = data.pop("response_id")
        data["etaMinutes"] = data.pop("eta_minutes")
        data["activatedAt"] = data.pop("activated_at")
        data["etaValue"] = f"{instance.eta_minutes} min"
        data["arrivalValue"] = f"{instance.eta_minutes} minutes"
        return data


class ExecutiveEmergencySerializer(serializers.Serializer):
    """Backs executive/emergency.tsx."""

    event = EmergencyEventSerializer(allow_null=True)
    coordinator = CareTeamMemberSerializer(allow_null=True)
    physician = CareTeamMemberSerializer(allow_null=True)


# ============================================================================
# MEDICATIONS
# ============================================================================

class MedicationScheduleSerializer(serializers.ModelSerializer):
    name = serializers.CharField(source="medication.name", read_only=True)
    purpose = serializers.CharField(source="medication.purpose", read_only=True)
    dosage = serializers.CharField(source="medication.dosage", read_only=True)

    class Meta:
        model = MedicationSchedule
        fields = [
            "id", "scheduled_for", "status",
            "taken_at", "name", "purpose", "dosage",
        ]

    def to_representation(self, instance):
        data = super().to_representation(instance)
        # `time_label` is now a property on the model
        data["time"] = instance.time_label
        data["time_label"] = instance.time_label
        return data


class MedicationAlertSerializer(serializers.ModelSerializer):
    medication_name = serializers.CharField(
        source="medication.name", read_only=True, default="",
    )

    class Meta:
        model = MedicationAlert
        fields = [
            "id", "priority", "message",
            "medication_name", "created_at", "resolved",
        ]

    def to_representation(self, instance):
        data = super().to_representation(instance)
        data["medication"] = data.pop("medication_name")
        data["time"] = timezone.localtime(instance.created_at).strftime("%H:%M")
        data["priority"] = instance.get_priority_display().upper()
        return data


class MedicationSerializer(serializers.ModelSerializer):
    class Meta:
        model = Medication
        fields = ["id", "name", "purpose", "dosage", "active", "created_at"]
        read_only_fields = ["id", "created_at"]


# ============================================================================
# HEALTH PROGRAMME
# ============================================================================

class HealthProgrammeItemSerializer(serializers.ModelSerializer):
    class Meta:
        model = HealthProgrammeItem
        fields = [
            "id", "title", "subtitle", "status",
            "icon_key", "order", "next_due", "created_at",
        ]
        read_only_fields = ["id", "created_at"]

    def to_representation(self, instance):
        data = super().to_representation(instance)
        data["icon"] = data.pop("icon_key")
        return data


class ExecutiveProgrammeSerializer(serializers.Serializer):
    """Backs ExecutiveProgramme.tsx."""

    medications = MedicationScheduleSerializer(many=True)
    medicationAlerts = MedicationAlertSerializer(many=True)
    programmeItems = HealthProgrammeItemSerializer(many=True)
    physician = CareTeamMemberSerializer(allow_null=True)

    takenCount = serializers.IntegerField()
    medicationCount = serializers.IntegerField()
    onTrackCount = serializers.IntegerField()
    programmeCount = serializers.IntegerField()


# ============================================================================
# REPORTS
# ============================================================================

class LabResultSerializer(serializers.ModelSerializer):
    class Meta:
        model = LabResult
        fields = [
            "id", "category", "name", "value",
            "value_numeric", "unit", "tone", "recorded_at",
        ]


class WeeklyReportSerializer(serializers.ModelSerializer):
    """WeeklyReport payload.

    `labs` is attached by the view (usually the Labs tied to the
    same period). Report is treated as an immutable snapshot.
    """

    labs = serializers.SerializerMethodField()

    class Meta:
        model = WeeklyReport
        fields = [
            "id", "period",
            "period_start", "period_end",
            "label", "range_label",
            "physician_name", "nurse_name", "last_reviewed",
            "status_title", "status_summary",
            "vitals", "trends", "highlights", "next_steps",
            "labs", "generated_at",
        ]

    def get_labs(self, instance):
        # View can prefetch and stash on the instance
        labs = getattr(instance, "_labs", None)
        if labs is None:
            labs = (
                LabResult.objects
                .filter(
                    executive_profile=instance.executive_profile,
                    recorded_at__date__gte=instance.period_start,
                    recorded_at__date__lte=instance.period_end,
                )
                .order_by("-recorded_at")
            )
        return LabResultSerializer(labs, many=True).data

    def to_representation(self, instance):
        data = super().to_representation(instance)
        data["range"] = data.pop("range_label")
        data["physician"] = data.pop("physician_name")
        data["nurse"] = data.pop("nurse_name")
        data["lastReviewed"] = data.pop("last_reviewed")
        data["statusTitle"] = data.pop("status_title")
        data["statusSummary"] = data.pop("status_summary")
        data["nextSteps"] = data.pop("next_steps")
        data["periodStart"] = data.pop("period_start")
        data["periodEnd"] = data.pop("period_end")
        data["trendTitle"] = "Trends"
        return data


class ExecutiveReportsSerializer(serializers.Serializer):
    """Backs ExecutiveReports.tsx."""

    report = WeeklyReportSerializer(allow_null=True)
    availablePeriods = serializers.ListField(child=serializers.CharField())


# ============================================================================
# SOFT DELETE / RESOLUTION HELPERS
# ============================================================================

class ResolveAlertSerializer(serializers.Serializer):
    """Shared payload for resolving HealthAlert / MedicationAlert."""

    resolved = serializers.BooleanField(default=True)

    def update(self, instance, validated_data):
        instance.resolved = validated_data["resolved"]
        instance.resolved_at = timezone.now() if instance.resolved else None
        instance.save(update_fields=["resolved", "resolved_at", "updated_at"])
        return instance

    def create(self, validated_data):
        raise NotImplementedError