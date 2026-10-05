import pytest
from datetime import time, timedelta
from django.utils import timezone

from appointments.models import Appointment
from appointments.serializers import (
    AppointmentCancelSerializer,
    AppointmentCreateSerializer,
    AppointmentMobileCreateSerializer,
    AppointmentMobileSerializer,
    AppointmentReminderSerializer,
    AppointmentRescheduleSerializer,
    AppointmentSerializer,
)

pytestmark = pytest.mark.django_db


# ---------------------------------------------------------------------------
# AppointmentMobileSerializer (read)
# ---------------------------------------------------------------------------

class TestMobileReadSerializer:
    def test_type_maps_to_camel_case(self, appointment):
        appointment.appointment_type = "doctor_visit"
        data = AppointmentMobileSerializer(appointment).data
        assert data["type"] == "doctorVisit"

    def test_withName_falls_back_to_provider_name(self, patient, next_weekday):
        appt = Appointment.objects.create(
            patient=patient,
            doctor=None,
            appointment_type="nurse_check",
            provider_name="Nurse Joy",
            appointment_date=next_weekday,
            appointment_time=time(10, 0),
            duration_minutes=30,
        )
        data = AppointmentMobileSerializer(appt).data
        assert data["withName"] == "Nurse Joy"

    def test_withName_uses_doctor_full_name(self, appointment):
        data = AppointmentMobileSerializer(appointment).data
        assert data["withName"] == appointment.doctor.user.full_name


# ---------------------------------------------------------------------------
# AppointmentMobileCreateSerializer
# ---------------------------------------------------------------------------

class TestMobileCreateSerializer:
    def test_valid_payload_maps_fields(self, patient, next_weekday):
        payload = {
            "date": str(next_weekday),
            "time": "10:00",
            "type": "doctorVisit",
            "withName": "Dr. Who",
            "reminderMinutes": 30,
        }
        s = AppointmentMobileCreateSerializer(
            data=payload, context={"patient": patient}
        )
        assert s.is_valid(), s.errors
        assert s.validated_data["appointment_type"] == "doctor_visit"
        assert s.validated_data["duration_minutes"] == 30

    def test_past_date_error_key_is_remapped(self, patient):
        yesterday = timezone.localdate() - timedelta(days=1)
        payload = {"date": str(yesterday), "time": "10:00", "type": "doctorVisit"}
        s = AppointmentMobileCreateSerializer(
            data=payload, context={"patient": patient}
        )
        assert not s.is_valid()
        assert "date" in s.errors
        assert "appointment_date" not in s.errors

    def test_past_time_today_rejected(self, patient):
        today = timezone.localdate()
        past_time = (timezone.localtime() - timedelta(hours=2)).time()
        payload = {
            "date": str(today),
            "time": past_time.strftime("%H:%M"),
            "type": "doctorVisit",
        }
        s = AppointmentMobileCreateSerializer(
            data=payload, context={"patient": patient}
        )
        assert not s.is_valid()
        assert "time" in s.errors

    def test_patient_double_booking_rejected(self, appointment):
        payload = {
            "date": str(appointment.appointment_date),
            "time": "10:15",
            "type": "doctorVisit",
        }
        s = AppointmentMobileCreateSerializer(
            data=payload, context={"patient": appointment.patient}
        )
        assert not s.is_valid()
        assert "time" in s.errors

    def test_reminderMinutes_out_of_range_rejected(self, patient, next_weekday):
        payload = {
            "date": str(next_weekday),
            "time": "10:00",
            "type": "doctorVisit",
            "reminderMinutes": 10_000_000,
        }
        s = AppointmentMobileCreateSerializer(
            data=payload, context={"patient": patient}
        )
        assert not s.is_valid()
        assert "reminderMinutes" in s.errors


# ---------------------------------------------------------------------------
# AppointmentCreateSerializer (staff/doctor)
# ---------------------------------------------------------------------------

class TestStaffCreateSerializer:
    def test_missing_doctor_duration_rejected(self, patient, next_weekday):
        from .factories import DoctorFactory
        d = DoctorFactory(consultation_duration=0)
        payload = {
            "doctor": d.pk,
            "appointment_date": str(next_weekday),
            "appointment_time": "10:00",
        }
        s = AppointmentCreateSerializer(data=payload)
        assert not s.is_valid()
        assert "doctor" in s.errors

    def test_outside_availability_rejected(self, patient, doctor, next_weekday):
        payload = {
            "doctor": doctor.pk,
            "appointment_date": str(next_weekday),
            "appointment_time": "06:00",
        }
        s = AppointmentCreateSerializer(data=payload)
        assert not s.is_valid()
        assert "appointment_time" in s.errors

    def test_overlap_rejected(self, appointment):
        payload = {
            "doctor": appointment.doctor.pk,
            "appointment_date": str(appointment.appointment_date),
            "appointment_time": "10:15",
        }
        s = AppointmentCreateSerializer(data=payload)
        assert not s.is_valid()
        assert "appointment_time" in s.errors

    def test_valid_payload_passes(self, doctor, next_weekday):
        payload = {
            "doctor": doctor.pk,
            "appointment_date": str(next_weekday),
            "appointment_time": "11:00",
        }
        s = AppointmentCreateSerializer(data=payload)
        assert s.is_valid(), s.errors
        assert s.validated_data["duration_minutes"] == 30


# ---------------------------------------------------------------------------
# AppointmentRescheduleSerializer
# ---------------------------------------------------------------------------

class TestRescheduleSerializer:
    def test_past_date_rejected(self, appointment):
        yesterday = timezone.localdate() - timedelta(days=1)
        s = AppointmentRescheduleSerializer(
            data={"appointment_date": str(yesterday), "appointment_time": "10:00"},
            context={"appointment": appointment},
        )
        assert not s.is_valid()

    def test_conflict_with_other_appointment_rejected(self, appointment):
        # Create another appointment at 11:00
        Appointment.objects.create(
            patient=appointment.patient,
            doctor=appointment.doctor,
            appointment_date=appointment.appointment_date,
            appointment_time=time(11, 0),
            duration_minutes=30,
        )
        s = AppointmentRescheduleSerializer(
            data={
                "appointment_date": str(appointment.appointment_date),
                "appointment_time": "11:15",
            },
            context={"appointment": appointment},
        )
        assert not s.is_valid()
        assert "appointment_time" in s.errors

    def test_reschedule_to_own_slot_is_allowed(self, appointment):
        s = AppointmentRescheduleSerializer(
            data={
                "appointment_date": str(appointment.appointment_date),
                "appointment_time": "10:00",
            },
            context={"appointment": appointment},
        )
        assert s.is_valid(), s.errors


# ---------------------------------------------------------------------------
# AppointmentSerializer (read)
# ---------------------------------------------------------------------------

class TestReadSerializerFlags:
    def test_can_cancel_true_for_patient(self, appointment, rf):
        request = rf.get("/")
        request.user = appointment.patient
        data = AppointmentSerializer(appointment, context={"request": request}).data
        assert data["can_cancel"] is True

    def test_can_cancel_false_for_completed(self, appointment, rf):
        appointment.status = Appointment.Status.COMPLETED
        appointment.save()
        request = rf.get("/")
        request.user = appointment.patient
        data = AppointmentSerializer(appointment, context={"request": request}).data
        assert data["can_cancel"] is False

    def test_can_confirm_only_for_doctor(self, appointment, rf):
        appointment.status = Appointment.Status.PENDING
        appointment.save()

        request = rf.get("/")
        request.user = appointment.patient
        data = AppointmentSerializer(appointment, context={"request": request}).data
        assert data["can_confirm"] is False

        request.user = appointment.doctor.user
        data = AppointmentSerializer(appointment, context={"request": request}).data
        assert data["can_confirm"] is True

    def test_can_complete_after_confirmed(self, appointment, rf):
        appointment.status = Appointment.Status.CONFIRMED
        appointment.save()

        request = rf.get("/")
        request.user = appointment.doctor.user
        data = AppointmentSerializer(appointment, context={"request": request}).data
        assert data["can_complete"] is True

    def test_anonymous_user_has_no_permissions(self, appointment, rf):
        from django.contrib.auth.models import AnonymousUser
        request = rf.get("/")
        request.user = AnonymousUser()
        data = AppointmentSerializer(appointment, context={"request": request}).data
        assert data["can_cancel"] is False
        assert data["can_confirm"] is False


# ---------------------------------------------------------------------------
# AppointmentReminderSerializer
# ---------------------------------------------------------------------------

class TestReminderSerializer:
    def test_null_allowed(self):
        s = AppointmentReminderSerializer(data={"reminderMinutes": None})
        assert s.is_valid()

    def test_negative_rejected(self):
        s = AppointmentReminderSerializer(data={"reminderMinutes": -1})
        assert not s.is_valid()

    def test_too_large_rejected(self):
        s = AppointmentReminderSerializer(data={"reminderMinutes": 10_000_000})
        assert not s.is_valid()