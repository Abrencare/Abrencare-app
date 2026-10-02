from django.contrib.auth import get_user_model
from django.db import transaction
from rest_framework import serializers
from datetime import datetime, date as date_cls
from django.utils.dateparse import parse_date

from .models import (
    ExecutiveProfile, MonitorFrequency, MonitorMetric,
    Reading, HealthScoreSnapshot, HealthAlert,
    CareTeamMember, UpcomingCare,
    EmergencyEvent, EmergencyTimelineStep,
    Medication, MedicationSchedule, MedicationAlert,
    HealthProgrammeItem,
    LabResult, WeeklyReport,
)

User = get_user_model()

# ---------------------------------------------------------------------------
# Gender normalization (frontend sends camelCase, DB stores snake_case)
# ---------------------------------------------------------------------------
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

# ---------------------------------------------------------------------------
# Reusable field types
# ---------------------------------------------------------------------------
class FlexibleDecimalField(serializers.DecimalField):
    """Accepts '172.5' or 172.5 and returns float-ish decimal."""

    def __init__(self, **kwargs):
        kwargs.setdefault("max_digits", 5)
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
    """
    Accepts ISO (YYYY-MM-DD) plus common human formats and returns a date.
    - 1990-05-12
    - 1990/05/12
    - 12/05/1990  (DD/MM/YYYY — assumed day-first, see note)
    - 05/12/1990  (ambiguous)
    - May 12, 1990
    - 12 May 1990
    """
    INPUT_FORMATS = [
        "%Y-%m-%d",
        "%Y/%m/%d",
        "%d-%m-%Y",
        "%d/%m/%Y",
        "%m/%d/%Y",     # fallback if day-first fails
        "%d.%m.%Y",
        "%b %d, %Y",
        "%B %d, %Y",
        "%d %b %Y",
        "%d %B %Y",
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

        # Fast path: ISO
        iso = parse_date(value)
        if iso is not None:
            return iso

        # Try known formats
        for fmt in self.INPUT_FORMATS:
            try:
                return datetime.strptime(value, fmt).date()
            except ValueError:
                continue

        raise serializers.ValidationError(
            "Date must be in YYYY-MM-DD format (e.g. 1990-05-12)."
        )
   
    
# ---------------------------------------------------------------------------
# ExecutiveProfile
# ---------------------------------------------------------------------------
class ExecutiveProfileSerializer(serializers.ModelSerializer):
    # Write-only user fields the frontend posts
    dateOfBirth = FlexibleDateField(
        source="user_service.user.date_of_birth",
        required=False,
        allow_null=True,
    )
    gender = serializers.CharField(required=False, allow_null=True)
    heightCm = FlexibleDecimalField(
        source="user_service.user.height",
        required=False,
        allow_null=True,
    )
    weightKg = FlexibleDecimalField(
        source="user_service.user.weight",
        required=False,
        allow_null=True,
    )

    # Read fields
    monitoring = serializers.ListField(
        child=serializers.ChoiceField(choices=MonitorMetric.choices),
        required=False,
        allow_empty=True,
    )
    frequency = serializers.ChoiceField(
        choices=MonitorFrequency.choices,
        required=False,
    )

    class Meta:
        model = ExecutiveProfile
        fields = [
            "id",
            "name",
            "monitoring",
            "frequency",
            "dateOfBirth",
            "gender",
            "heightCm",
            "weightKg",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at"]

    def validate_gender(self, value):
        if value is None:
            return value
        normalized = GENDER_FRONT_TO_BACK.get(value)
        if not normalized:
            raise serializers.ValidationError(
                f"Invalid gender '{value}'. Expected one of: "
                f"{', '.join(GENDER_FRONT_TO_BACK.keys())}"
            )
        return normalized

    def to_representation(self, instance):
        data = super().to_representation(instance)
        user = instance.user_service.user
        # Normalize gender back to frontend vocabulary
        data["gender"] = GENDER_BACK_TO_FRONT.get(user.gender, user.gender)
        # Consistent camelCase echo for the UI
        data["dateOfBirth"] = (
            user.date_of_birth.isoformat() if user.date_of_birth else ""
        )
        data["heightCm"] = str(user.height) if user.height is not None else ""
        data["weightKg"] = str(user.weight) if user.weight is not None else ""
        data["name"] = instance.name or user.full_name
        return data

    @transaction.atomic
    def update(self, instance, validated_data):
        # Pull out nested user payloads
        us_data = validated_data.pop("user_service", {})
        user_data = us_data.pop("user", {}) if us_data else {}

        # Update ExecutiveProfile
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()

        # Update the User
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
    """Used for the very first POST from ExecutiveProfileScreen."""

    dateOfBirth = FlexibleDateField(required=True)
    gender = serializers.CharField(required=True)
    heightCm = FlexibleDecimalField(required=True)
    weightKg = FlexibleDecimalField(required=True)

    def validate_gender(self, value):
        normalized = GENDER_FRONT_TO_BACK.get(value)
        if not normalized:
            raise serializers.ValidationError(
                f"Invalid gender '{value}'."
            )
        return normalized


class ExecutiveCareSerializer(serializers.Serializer):
    """Used by ExecutiveMonitorScreen."""

    monitoring = serializers.ListField(
        child=serializers.ChoiceField(choices=MonitorMetric.choices),
        allow_empty=False,
    )
    frequency = serializers.ChoiceField(choices=MonitorFrequency.choices)


class ExecutiveOnboardingCompleteSerializer(serializers.Serializer):
    """
    Accepts the combined payload posted by AuthContext.completeExecutiveOnboarding.
    Tolerates both snake_case and camelCase keys so the frontend can migrate freely.
    """
    # Accept both spellings — validate() collapses them
    dateOfBirth = FlexibleDateField(required=False, allow_null=True)
    date_of_birth = FlexibleDateField(required=False, allow_null=True)

    gender = serializers.CharField(required=False, allow_null=True, allow_blank=True)

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
            raise serializers.ValidationError(
                f"Invalid gender '{value}'. Expected one of: "
                f"{', '.join(GENDER_FRONT_TO_BACK.keys())}"
            )
        return normalized

    def validate(self, attrs):
        date_of_birth = attrs.get("dateOfBirth") or attrs.get("date_of_birth")
        height_cm = attrs.get("heightCm") or attrs.get("height_cm")
        weight_kg = attrs.get("weightKg") or attrs.get("weight_kg")

        if date_of_birth is None:
            raise serializers.ValidationError({"dateOfBirth": "Required."})
        if height_cm is None:
            raise serializers.ValidationError({"heightCm": "Required."})
        if weight_kg is None:
            raise serializers.ValidationError({"weightKg": "Required."})

        attrs["date_of_birth"] = date_of_birth
        attrs["height_cm"] = height_cm
        attrs["weight_kg"] = weight_kg
        return attrs
    
# ---------------------------------------------------------------------------
# Care team (placeholder for ExecutiveReadyScreen)
# ---------------------------------------------------------------------------
class CareTeamMemberSerializer(serializers.Serializer):
    id = serializers.CharField()
    initials = serializers.CharField()
    name = serializers.CharField()
    role = serializers.CharField()
    verified = serializers.BooleanField(default=True)


class ReadingSerializer(serializers.ModelSerializer):
    class Meta:
        model = Reading
        fields = ["id", "metric", "value", "status", "recorded_at"]


class HealthScoreSerializer(serializers.ModelSerializer):
    class Meta:
        model = HealthScoreSnapshot
        fields = ["score", "caption", "recorded_at"]


class HealthAlertSerializer(serializers.ModelSerializer):
    class Meta:
        model = HealthAlert
        fields = ["id", "severity", "title", "body", "created_at"]


class CareTeamMemberSerializer(serializers.ModelSerializer):
    class Meta:
        model = CareTeamMember
        fields = ["id", "role", "full_name", "title", "phone", "available"]


class UpcomingCareSerializer(serializers.ModelSerializer):
    class Meta:
        model = UpcomingCare
        fields = ["id", "title", "scheduled_for", "provided_by"]


class ExecutiveDashboardSerializer(serializers.Serializer):
    """
    Read-only aggregate consumed by ExecutiveOverview.
    """
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

# ---------------------------------------------------------------------------
# EMERGENCY
# ---------------------------------------------------------------------------
class EmergencyTimelineStepSerializer(serializers.ModelSerializer):
    class Meta:
        model = EmergencyTimelineStep
        fields = ["id", "label", "status", "happened_at", "order"]

    def to_representation(self, instance):
        data = super().to_representation(instance)
        data["text"] = data.pop("label")
        data["time"] = (
            instance.happened_at.strftime("%H:%M")
            if instance.happened_at
            else ""
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
        # Frontend expects camelCase + a few derived strings
        data["responseId"] = data.pop("response_id")
        data["etaMinutes"] = data.pop("eta_minutes")
        data["activatedAt"] = data.pop("activated_at")
        data["etaValue"] = f"{instance.eta_minutes} min"
        data["arrivalValue"] = f"{instance.eta_minutes} minutes"
        return data


# ---------------------------------------------------------------------------
# MEDICATIONS
# ---------------------------------------------------------------------------
class MedicationScheduleSerializer(serializers.ModelSerializer):
    name = serializers.CharField(source="medication.name", read_only=True)
    purpose = serializers.CharField(source="medication.purpose", read_only=True)

    class Meta:
        model = MedicationSchedule
        fields = ["id", "time_label", "status", "name", "purpose"]

    def to_representation(self, instance):
        data = super().to_representation(instance)
        data["time"] = data.pop("time_label")
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
        data["time"] = instance.created_at.strftime("%H:%M")
        data["priority"] = instance.get_priority_display().upper()
        return data


class MedicationSerializer(serializers.ModelSerializer):
    class Meta:
        model = Medication
        fields = ["id", "name", "purpose", "dosage", "active"]


# ---------------------------------------------------------------------------
# HEALTH PROGRAMME
# ---------------------------------------------------------------------------
class HealthProgrammeItemSerializer(serializers.ModelSerializer):
    class Meta:
        model = HealthProgrammeItem
        fields = [
            "id", "title", "subtitle", "status",
            "icon_key", "order", "next_due",
        ]

    def to_representation(self, instance):
        data = super().to_representation(instance)
        data["icon"] = data.pop("icon_key")
        return data


# ---------------------------------------------------------------------------
# REPORTS
# ---------------------------------------------------------------------------
class LabResultSerializer(serializers.ModelSerializer):
    class Meta:
        model = LabResult
        fields = ["id", "category", "name", "value", "tone", "recorded_at"]


class WeeklyReportSerializer(serializers.ModelSerializer):
    labs = LabResultSerializer(many=True, read_only=True)

    class Meta:
        model = WeeklyReport
        fields = [
            "id", "period", "label", "range_label",
            "physician_name", "nurse_name", "last_reviewed",
            "status_title", "status_summary",
            "vitals", "trends", "highlights", "next_steps",
            "labs", "generated_at",
        ]

    def to_representation(self, instance):
        data = super().to_representation(instance)
        data["range"] = data.pop("range_label")
        data["physician"] = data.pop("physician_name")
        data["nurse"] = data.pop("nurse_name")
        data["lastReviewed"] = data.pop("last_reviewed")
        data["statusTitle"] = data.pop("status_title")
        data["statusSummary"] = data.pop("status_summary")
        data["nextSteps"] = data.pop("next_steps")
        data["trendTitle"] = "Trends"  # localize on the frontend
        return data


# ---------------------------------------------------------------------------
# AGGREGATE — one serializer per screen
# ---------------------------------------------------------------------------
class ExecutiveEmergencySerializer(serializers.Serializer):
    """Backs executive/emergency.tsx."""

    event = EmergencyEventSerializer(allow_null=True)
    coordinator = CareTeamMemberSerializer(allow_null=True)
    physician = CareTeamMemberSerializer(allow_null=True)


class ExecutiveProgrammeSerializer(serializers.Serializer):
    """Backs ExecutiveProgramme.tsx."""

    medications = MedicationScheduleSerializer(many=True)
    medicationAlerts = MedicationAlertSerializer(many=True)
    programmeItems = HealthProgrammeItemSerializer(many=True)
    physician = CareTeamMemberSerializer(allow_null=True)

    # Lightweight counters the frontend already derives, but having
    # them server-side avoids drift.
    takenCount = serializers.IntegerField()
    medicationCount = serializers.IntegerField()
    onTrackCount = serializers.IntegerField()
    programmeCount = serializers.IntegerField()


class ExecutiveReportsSerializer(serializers.Serializer):
    """Backs ExecutiveReports.tsx."""

    report = WeeklyReportSerializer(allow_null=True)
    availablePeriods = serializers.ListField(child=serializers.CharField())
