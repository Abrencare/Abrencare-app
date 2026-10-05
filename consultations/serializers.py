# consultations/serializers.py
from datetime import date as date_cls, datetime

from django.utils import timezone
from django.utils.dateparse import parse_date
from rest_framework import serializers

from doctors.models import Doctor, Specialty

from .models import Consultation, ConsultationProfile, Prescription


# ============================================================
# FLEXIBLE DATE
# ============================================================

class FlexibleDateField(serializers.DateField):
    """
    Accepts ISO (YYYY-MM-DD) plus common human formats and returns a date.

    Ambiguity note: for values like "05/12/1990", day-first ("%d/%m/%Y")
    wins because it is tried before "%m/%d/%Y". If you have US users,
    prefer unambiguous inputs at the API boundary.
    """

    INPUT_FORMATS = [
        "%Y-%m-%d",
        "%Y/%m/%d",
        "%d-%m-%Y",
        "%d/%m/%Y",
        "%m/%d/%Y",
        "%d.%m.%Y",
        "%b %d, %Y",
        "%B %d, %Y",
        "%d %b %Y",
        "%d %B %Y",
        "%Y%m%d",
    ]

    default_error_messages = {
        "invalid": "Date must be a valid date (e.g. 1990-05-12).",
    }

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

        self.fail("invalid")


# ============================================================
# SPECIALTY
# ============================================================

class SpecialtySerializer(serializers.ModelSerializer):
    class Meta:
        model = Specialty
        fields = ["id", "name", "description"]


# ============================================================
# DOCTOR
# ============================================================

class ConsultationDoctorSerializer(serializers.ModelSerializer):
    name = serializers.CharField(source="user.full_name", read_only=True)
    specialty = serializers.CharField(source="specialty.name", read_only=True)

    class Meta:
        model = Doctor
        fields = [
            "id",
            "name",
            "specialty",
            "years_of_experience",
            "consultation_fee",
            "consultation_duration",
            "bio",
        ]
        read_only_fields = fields


class DoctorSummarySerializer(serializers.ModelSerializer):
    """Nested on a consultation so the UI can read `consultation.doctor.id`."""

    name = serializers.CharField(source="user.full_name", read_only=True)
    specialty = serializers.CharField(source="specialty.name", read_only=True)

    class Meta:
        model = Doctor
        fields = ["id", "name", "specialty"]
        read_only_fields = fields


# ============================================================
# AVAILABLE SLOT
# ============================================================

class ConsultationSlotSerializer(serializers.Serializer):
    time = serializers.TimeField(format="%H:%M")
    available = serializers.BooleanField()


# ============================================================
# ONBOARDING PROFILE
# ============================================================

class ConsultationProfileSerializer(serializers.ModelSerializer):
    """
    Read shape for onboarding state.

    Mirrors the frontend's camelCase (`dateOfBirth`) and exposes
    `onboarded` as a real boolean so `useAuth().isOnboarded('consultation')`
    has an unambiguous answer.
    """

    dateOfBirth = serializers.DateField(
        source="date_of_birth", allow_null=True, required=False,
    )
    gender = serializers.ChoiceField(
        choices=ConsultationProfile.Gender.choices,
        allow_blank=True,
        required=False,
    )
    onboarded = serializers.BooleanField(source="is_onboarded", read_only=True)

    class Meta:
        model = ConsultationProfile
        fields = [
            "id",
            "dateOfBirth",
            "gender",
            "onboarded",
            "onboarded_at",
            "created_at",
            "updated_at",
        ]
        read_only_fields = [
            "id",
            "onboarded",
            "onboarded_at",
            "created_at",
            "updated_at",
        ]


class ConsultationOnboardingSerializer(serializers.Serializer):
    """
    POST /api/consultations/onboarding/complete/

    Writes to the current user's ConsultationProfile. Per the model,
    `onboarded_at` is `auto_now_add`, so the profile row already has it
    populated. This serializer is purely an edit path for the fields the
    user actually controls.
    """

    dateOfBirth = FlexibleDateField(
        source="date_of_birth",
        required=False,
        allow_null=True,
    )
    gender = serializers.ChoiceField(
        choices=ConsultationProfile.Gender.choices,
        required=False,
        allow_blank=True,
    )

    # Frontend sometimes sends "preferNot".
    GENDER_ALIASES = {
        "preferNot": ConsultationProfile.Gender.PREFER_NOT,
        "prefer-not": ConsultationProfile.Gender.PREFER_NOT,
    }

    def to_internal_value(self, data):
        data = data.copy()

        gender = data.get("gender")
        if isinstance(gender, str):
            normalized = self.GENDER_ALIASES.get(gender.strip())
            if normalized is not None:
                data["gender"] = normalized

        return super().to_internal_value(data)

    def validate(self, attrs):
        if not attrs:
            raise serializers.ValidationError(
                "Provide at least one field to update."
            )
        return attrs

    def _get_profile(self):
        user = self.context["request"].user
        profile = (
            ConsultationProfile.objects
            .select_related("user_service")
            .filter(
                user_service__user=user,
                user_service__service__code="consultation",
            )
            .first()
        )
        if profile is None:
            raise serializers.ValidationError(
                "This account is not enrolled in the consultation service."
            )
        return profile

    def save(self, **kwargs):
        profile = self._get_profile()

        update_fields = set()

        if "date_of_birth" in self.validated_data:
            profile.date_of_birth = self.validated_data["date_of_birth"]
            update_fields.add("date_of_birth")

        if "gender" in self.validated_data:
            profile.gender = self.validated_data["gender"] or ""
            update_fields.add("gender")

        # Track the first writer as the creator, if not already set.
        if profile.created_by_id is None:
            profile.created_by = self.context["request"].user
            update_fields.add("created_by")

        if update_fields:
            update_fields.add("updated_at")
            profile.save(update_fields=sorted(update_fields))

        return profile


# ============================================================
# BOOKING
# ============================================================

class ConsultationBookingSerializer(serializers.Serializer):
    """
    POST /api/consultations/

    Payload mirrors the React `ConsultationContext.book()`:
        { doctor, appointment_date, appointment_time,
          consultation_type, language, reason_for_visit }

    Accepts `doctor_id` as an alias for `doctor`, and normalizes
    "english"/"amharic" to the model codes "en"/"am".
    """

    doctor = serializers.PrimaryKeyRelatedField(
        queryset=Doctor.objects.filter(
            approval_status=Doctor.ApprovalStatus.APPROVED,
            specialty__is_active=True,
        )
    )
    appointment_date = serializers.DateField()
    appointment_time = serializers.TimeField(
        input_formats=["%H:%M", "%H:%M:%S", "iso-8601"],
    )
    consultation_type = serializers.ChoiceField(
        choices=Consultation.Type.choices,
        default=Consultation.Type.VIDEO,
    )
    language = serializers.ChoiceField(
        choices=Consultation.Language.choices,
        default=Consultation.Language.ENGLISH,
    )
    reason_for_visit = serializers.CharField(
        required=False,
        allow_blank=True,
        max_length=2000,
        default="",
    )

    LANGUAGE_ALIASES = {
        "english": Consultation.Language.ENGLISH,
        "amharic": Consultation.Language.AMHARIC,
        "en": Consultation.Language.ENGLISH,
        "am": Consultation.Language.AMHARIC,
    }

    def to_internal_value(self, data):
        data = data.copy()

        if "doctor" not in data and "doctor_id" in data:
            data["doctor"] = data.pop("doctor_id")

        lang = data.get("language")
        if isinstance(lang, str):
            normalized = self.LANGUAGE_ALIASES.get(lang.strip().lower())
            if normalized is not None:
                data["language"] = normalized

        return super().to_internal_value(data)

    def validate(self, attrs):
        now = timezone.localtime()

        if attrs["appointment_date"] < now.date():
            raise serializers.ValidationError(
                {"appointment_date": "Appointment date cannot be in the past."}
            )

        if (
            attrs["appointment_date"] == now.date()
            and attrs["appointment_time"] < now.time()
        ):
            raise serializers.ValidationError(
                {"appointment_time": "Appointment time cannot be in the past."}
            )

        return attrs


# ============================================================
# CANCEL
# ============================================================

class ConsultationCancelSerializer(serializers.Serializer):
    reason = serializers.CharField(
        required=False,
        allow_blank=True,
        default="",
    )


# ============================================================
# CONSULTATION RESPONSE
# ============================================================

class ConsultationSerializer(serializers.ModelSerializer):
    """
    Read shape consumed by `ConsultationContext`.

      * `doctor.id` and `doctor_id` both present.
      * `appointment_time` is "HH:mm" (string-compatible with slot picker).
      * `can_join` / `can_cancel` are booleans sourced from the model.
    """

    patient_name = serializers.CharField(
        source="appointment.patient.full_name", read_only=True,
    )

    doctor = DoctorSummarySerializer(
        source="appointment.doctor", read_only=True,
    )
    doctor_id = serializers.IntegerField(
        source="appointment.doctor_id", read_only=True,
    )
    doctor_name = serializers.CharField(
        source="appointment.doctor.user.full_name", read_only=True,
    )
    specialty_name = serializers.CharField(
        source="appointment.doctor.specialty.name", read_only=True,
    )

    appointment_date = serializers.DateField(
        source="appointment.appointment_date", read_only=True,
    )
    appointment_time = serializers.TimeField(
        source="appointment.appointment_time",
        format="%H:%M",
        read_only=True,
    )
    duration_minutes = serializers.IntegerField(
        source="appointment.duration_minutes", read_only=True,
    )
    appointment_status = serializers.CharField(
        source="appointment.status", read_only=True,
    )
    reason_for_visit = serializers.CharField(
        source="appointment.reason_for_visit", read_only=True,
    )

    starts_at = serializers.DateTimeField(read_only=True)
    can_join = serializers.BooleanField(read_only=True)
    can_cancel = serializers.BooleanField(read_only=True)

    class Meta:
        model = Consultation
        fields = [
            "id",
            "appointment",
            "patient_name",
            "doctor",
            "doctor_id",
            "doctor_name",
            "specialty_name",
            "appointment_date",
            "appointment_time",
            "duration_minutes",
            "appointment_status",
            "reason_for_visit",
            "starts_at",
            "consultation_type",
            "language",
            "status",
            "can_join",
            "can_cancel",
            "price",
            "currency",
            "meeting_url",
            "started_at",
            "ended_at",
            "created_at",
            "updated_at",
        ]
        read_only_fields = fields


# ============================================================
# PRESCRIPTION
# ============================================================

class PrescriptionSerializer(serializers.ModelSerializer):
    patient_name = serializers.CharField(
        source="appointment.patient.get_full_name", read_only=True,
    )
    doctor_name = serializers.CharField(
        source="appointment.doctor.user.get_full_name",
        read_only=True,
    )

    class Meta:
        model = Prescription
        fields = [
            "id",
            "consultation",
            "patient_name",
            "doctor_name",
            "medication",
            "dosage",
            "frequency",
            "duration",
            "instructions",
            "created_at",
            "updated_at",
        ]
        read_only_fields = [
            "id",
            "consultation",
            "patient_name",
            "doctor_name",
            "created_at",
            "updated_at",
        ]


class PrescriptionCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Prescription
        fields = [
            "medication",
            "dosage",
            "frequency",
            "duration",
            "instructions",
        ]