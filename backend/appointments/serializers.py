from datetime import datetime, timedelta

from django.utils import timezone
from rest_framework import serializers

from doctors.models import Doctor

from .models import Appointment, AppointmentCheckIn

# ---------------------------------------------------------------------------
# App <-> API vocabulary
# ---------------------------------------------------------------------------

API_TO_APP_TYPE = {
    "doctor_visit": "doctorVisit",
    "home_visit": "homeVisit",
    "nurse_check": "nurseCheck",
    "lab_sample": "labSample",
}
APP_TO_API_TYPE = {v: k for k, v in API_TO_APP_TYPE.items()}

# Non-doctor visits have no doctor-configured duration.
DEFAULT_DURATION_MINUTES = {
    "doctor_visit": 30,
    "home_visit": 60,
    "nurse_check": 30,
    "lab_sample": 15,
}

MAX_REMINDER_MINUTES = 7 * 24 * 60  # one week

ACTIVE_STATUSES = [Appointment.Status.PENDING, Appointment.Status.CONFIRMED]

# The app's field names differ from the model's; remap error keys to match.
_ERROR_KEY_MAP = {"appointment_date": "date", "appointment_time": "time"}


# ---------------------------------------------------------------------------
# Shared validation helpers
# ---------------------------------------------------------------------------

def get_appointment_window(date, time, duration_minutes):
    start = datetime.combine(date, time)
    return start, start + timedelta(minutes=duration_minutes)


def doctor_duration_minutes(doctor):
    """The two codebases use different attribute names; accept either."""
    for attr in ("consultation_duration_minutes", "consultation_duration"):
        value = getattr(doctor, attr, None)
        if value:
            return value
    return None


def validate_not_in_past(appointment_date, appointment_time=None):
    today = timezone.localdate()
    if appointment_date < today:
        raise serializers.ValidationError(
            {"appointment_date": "Appointment date cannot be in the past."}
        )
    if appointment_date == today and appointment_time is not None:
        if appointment_time < timezone.localtime().time():
            raise serializers.ValidationError(
                {"appointment_time": "Appointment time cannot be in the past."}
            )


def validate_fits_doctor_availability(doctor, appointment_date, appointment_time, duration_minutes):
    weekday = appointment_date.strftime("%A").lower()
    windows = doctor.availability.filter(day=weekday, is_available=True)

    if not windows.exists():
        raise serializers.ValidationError(
            {"appointment_time": "Doctor has no availability on this day."}
        )

    start, end = get_appointment_window(appointment_date, appointment_time, duration_minutes)

    for window in windows:
        window_start = datetime.combine(appointment_date, window.start_time)
        window_end = datetime.combine(appointment_date, window.end_time)
        if start >= window_start and end <= window_end:
            return

    raise serializers.ValidationError(
        {"appointment_time": "The selected appointment does not fit within the doctor's available hours."}
    )


def _first_overlap(queryset, appointment_date, start, end):
    for appt in queryset.only("id", "appointment_time", "duration_minutes").iterator(chunk_size=50):
        existing_start, existing_end = get_appointment_window(
            appointment_date, appt.appointment_time, appt.duration_minutes
        )
        if existing_start < end and existing_end > start:
            return appt
    return None


def validate_no_overlap(doctor, appointment_date, appointment_time, duration_minutes, exclude_pk=None):
    start, end = get_appointment_window(appointment_date, appointment_time, duration_minutes)
    qs = Appointment.objects.filter(
        doctor=doctor, appointment_date=appointment_date, status__in=ACTIVE_STATUSES
    )
    if exclude_pk:
        qs = qs.exclude(pk=exclude_pk)
    if _first_overlap(qs, appointment_date, start, end):
        raise serializers.ValidationError(
            {"appointment_time": "The selected time overlaps with another appointment."}
        )


def validate_patient_no_overlap(
    patient, appointment_date, appointment_time, duration_minutes,
    exclude_pk=None, field="appointment_time",
):
    """A patient can't be in two places at once (used for non-doctor visits)."""
    start, end = get_appointment_window(appointment_date, appointment_time, duration_minutes)
    qs = Appointment.objects.filter(
        patient=patient, appointment_date=appointment_date, status__in=ACTIVE_STATUSES
    )
    if exclude_pk:
        qs = qs.exclude(pk=exclude_pk)
    if _first_overlap(qs, appointment_date, start, end):
        raise serializers.ValidationError({field: "You already have an appointment at this time."})


# ---------------------------------------------------------------------------
# Nested
# ---------------------------------------------------------------------------

class AppointmentCheckInSerializer(serializers.ModelSerializer):
    class Meta:
        model = AppointmentCheckIn
        fields = ["checked_in_at", "latitude", "longitude", "gps_verified", "created_at"]
        read_only_fields = fields


# ---------------------------------------------------------------------------
# Mobile app shape  ->  {id, date, time, type, withName, reminderMinutes}
# ---------------------------------------------------------------------------

class AppointmentMobileSerializer(serializers.ModelSerializer):
    id = serializers.CharField(read_only=True)
    date = serializers.DateField(source="appointment_date", read_only=True)
    time = serializers.TimeField(source="appointment_time", format="%H:%M", read_only=True)
    type = serializers.SerializerMethodField()
    withName = serializers.SerializerMethodField()
    reminderMinutes = serializers.IntegerField(
        source="reminder_minutes", read_only=True, allow_null=True
    )

    class Meta:
        model = Appointment
        fields = ["id", "date", "time", "type", "withName", "reminderMinutes", "status"]
        read_only_fields = fields

    def get_type(self, obj):
        return API_TO_APP_TYPE.get(obj.appointment_type, "doctorVisit")

    def get_withName(self, obj):
        if obj.provider_name:
            return obj.provider_name
        if obj.doctor_id:
            return obj.doctor.user.full_name
        return ""


class AppointmentMobileCreateSerializer(serializers.Serializer):
    """Body the app posts: {date, time, type, withName, reminderMinutes}."""

    date = serializers.DateField()
    time = serializers.TimeField(input_formats=["%H:%M", "%H:%M:%S", "iso-8601"])
    type = serializers.ChoiceField(choices=list(APP_TO_API_TYPE))
    withName = serializers.CharField(required=False, allow_blank=True, max_length=150, default="")
    reminderMinutes = serializers.IntegerField(
        required=False, allow_null=True, min_value=0, max_value=MAX_REMINDER_MINUTES, default=None
    )

    def validate(self, attrs):
        appointment_type = APP_TO_API_TYPE[attrs["type"]]
        duration = DEFAULT_DURATION_MINUTES[appointment_type]

        try:
            validate_not_in_past(attrs["date"], attrs["time"])
        except serializers.ValidationError as exc:
            raise serializers.ValidationError(
                {_ERROR_KEY_MAP.get(k, k): v for k, v in exc.detail.items()}
            )

        validate_patient_no_overlap(
            self.context["patient"], attrs["date"], attrs["time"], duration, field="time"
        )

        attrs["appointment_type"] = appointment_type
        attrs["duration_minutes"] = duration
        return attrs


class AppointmentReminderSerializer(serializers.Serializer):
    """PATCH body: {reminderMinutes: number | null}."""

    reminderMinutes = serializers.IntegerField(
        allow_null=True, min_value=0, max_value=MAX_REMINDER_MINUTES
    )


# ---------------------------------------------------------------------------
# Full read serializer (doctor app / staff)
# ---------------------------------------------------------------------------

class AppointmentSerializer(serializers.ModelSerializer):
    patient_name = serializers.CharField(source="patient.user.full_name", read_only=True)
    doctor = serializers.PrimaryKeyRelatedField(read_only=True)
    doctor_name = serializers.CharField(source="doctor.user.full_name", read_only=True, default=None)
    doctor_specialty = serializers.CharField(
        source="doctor.specialty.name", read_only=True, default=None
    )
    cancelled_by_name = serializers.CharField(
        source="cancelled_by.full_name", read_only=True, default=None
    )
    status_display = serializers.CharField(source="get_status_display", read_only=True)
    end_time = serializers.TimeField(read_only=True)
    check_in = AppointmentCheckInSerializer(read_only=True)
    consultation_id = serializers.IntegerField(source="consultation.id", read_only=True, allow_null=True)
    is_upcoming = serializers.SerializerMethodField()
    can_cancel = serializers.SerializerMethodField()
    can_confirm = serializers.SerializerMethodField()
    can_complete = serializers.SerializerMethodField()
    can_mark_no_show = serializers.SerializerMethodField()

    class Meta:
        model = Appointment
        fields = [
            "id", "patient", "patient_name", "doctor", "doctor_name", "doctor_specialty",
            "appointment_type", "provider_name", "reminder_minutes", "consultation_id",
            "appointment_date", "appointment_time", "end_time", "duration_minutes",
            "status", "status_display", "reason_for_visit",
            "confirmed_at", "completed_at", "cancelled_at", "cancelled_by",
            "cancelled_by_name", "cancellation_reason", "check_in",
            "is_upcoming", "can_cancel", "can_confirm", "can_complete", "can_mark_no_show",
            "created_at", "updated_at",
        ]
        read_only_fields = fields

    def get_is_upcoming(self, obj):
        today = timezone.localdate()
        if obj.appointment_date > today:
            return True
        if obj.appointment_date == today:
            return obj.appointment_time >= timezone.localtime().time()
        return False

    def _request_user(self):
        request = self.context.get("request")
        if request and request.user.is_authenticated:
            return request.user
        return None

    def _user_is_doctor_of(self, obj):
        user = self._request_user()
        return bool(
            user
            and obj.doctor_id
            and hasattr(user, "doctor")
            and obj.doctor.user_id == user.id
        )

    def _user_is_patient_of(self, obj):
        user = self._request_user()
        return bool(user and obj.patient_id == user.id)

    def get_can_cancel(self, obj):
        if obj.status in (
            Appointment.Status.COMPLETED,
            Appointment.Status.CANCELLED,
            Appointment.Status.NO_SHOW,
        ):
            return False
        user = self._request_user()
        return bool(
            user
            and (user.is_staff or self._user_is_doctor_of(obj) or self._user_is_patient_of(obj))
        )

    def get_can_confirm(self, obj):
        user = self._request_user()
        return bool(
            user
            and obj.status == Appointment.Status.PENDING
            and (user.is_staff or self._user_is_doctor_of(obj))
        )

    def get_can_complete(self, obj):
        user = self._request_user()
        return bool(
            user
            and obj.status == Appointment.Status.CONFIRMED
            and (user.is_staff or self._user_is_doctor_of(obj))
        )

    def get_can_mark_no_show(self, obj):
        return self.get_can_complete(obj)


# ---------------------------------------------------------------------------
# Doctor-app create serializer (unchanged contract)
# ---------------------------------------------------------------------------

class AppointmentCreateSerializer(serializers.ModelSerializer):
    doctor = serializers.PrimaryKeyRelatedField(
        queryset=Doctor.objects.filter(approval_status=Doctor.ApprovalStatus.APPROVED)
    )

    class Meta:
        model = Appointment
        fields = ["doctor", "appointment_date", "appointment_time"]

    def validate(self, attrs):
        doctor = attrs["doctor"]
        appointment_date = attrs["appointment_date"]
        appointment_time = attrs["appointment_time"]

        duration = doctor_duration_minutes(doctor)
        if not duration or duration <= 0:
            raise serializers.ValidationError(
                {"doctor": "Doctor does not have a valid consultation duration configured."}
            )

        validate_not_in_past(appointment_date, appointment_time)
        validate_fits_doctor_availability(doctor, appointment_date, appointment_time, duration)
        validate_no_overlap(doctor, appointment_date, appointment_time, duration)

        attrs["duration_minutes"] = duration   # ← consistent key
        return attrs

    def create(self, validated_data):
        validated_data["duration_minutes"] = validated_data.pop("duration_minutes")
        return super().create(validated_data)


# ---------------------------------------------------------------------------
# Action inputs
# ---------------------------------------------------------------------------

class AppointmentCancelSerializer(serializers.Serializer):
    cancellation_reason = serializers.CharField(
        required=False, allow_blank=True, max_length=1000, default=""
    )


class AppointmentRescheduleSerializer(serializers.Serializer):
    appointment_date = serializers.DateField()
    appointment_time = serializers.TimeField()
    reason_for_visit = serializers.CharField(required=False, allow_blank=True, max_length=2000)

    def validate(self, attrs):
        appointment = self.context["appointment"]
        duration = appointment.duration_minutes
        date, time = attrs["appointment_date"], attrs["appointment_time"]

        validate_not_in_past(date, time)

        if appointment.doctor_id:
            validate_fits_doctor_availability(appointment.doctor, date, time, duration)
            validate_no_overlap(appointment.doctor, date, time, duration, exclude_pk=appointment.pk)
        else:
            validate_patient_no_overlap(
                appointment.patient, date, time, duration, exclude_pk=appointment.pk
            )
        return attrs