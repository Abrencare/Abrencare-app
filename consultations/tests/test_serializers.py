# consultations/tests/test_serializers.py
from datetime import date, time, timedelta

import pytest
from django.utils import timezone
from freezegun import freeze_time
from rest_framework import serializers as drf
from rest_framework.test import APIRequestFactory

from consultations.serializers import (
    ConsultationBookingSerializer,
    ConsultationOnboardingSerializer,
    ConsultationSerializer,
    FlexibleDateField,
)

from .factories import (
    AppointmentFactory,
    ConsultationFactory,
    DoctorFactory,
    UserFactory,
    UserServiceFactory,
)


pytestmark = pytest.mark.django_db


# ============================================================
# FLEXIBLE DATE FIELD
# ============================================================

class TestFlexibleDateField:
    @pytest.mark.parametrize("raw, expected", [
        ("1990-05-12", date(1990, 5, 12)),
        ("1990/05/12", date(1990, 5, 12)),
        ("12/05/1990", date(1990, 5, 12)),   # day-first wins
        ("12-05-1990", date(1990, 5, 12)),
        ("May 12, 1990", date(1990, 5, 12)),
        ("12 May 1990", date(1990, 5, 12)),
        ("19900512", date(1990, 5, 12)),
    ])
    def test_accepts_formats(self, raw, expected):
        assert FlexibleDateField().run_validation(raw) == expected

    def test_empty_string_returns_none_when_allowed(self):
        assert FlexibleDateField(allow_null=True).run_validation("") is None

    def test_none_returns_none_when_allowed(self):
        assert FlexibleDateField(allow_null=True).run_validation(None) is None

    def test_rejects_garbage(self):
        with pytest.raises(drf.ValidationError):
            FlexibleDateField().run_validation("not-a-date")


# ============================================================
# BOOKING SERIALIZER
# ============================================================

class TestConsultationBookingSerializer:
    def _payload(self, doctor, **overrides):
        base = {
            "doctor": doctor.id,
            "appointment_date": (
                timezone.localdate() + timedelta(days=1)
            ).isoformat(),
            "appointment_time": "10:00",
        }
        base.update(overrides)
        return base

    def test_accepts_doctor_id_alias(self, doctor):
        payload = self._payload(doctor)
        payload.pop("doctor")
        payload["doctor_id"] = doctor.id

        s = ConsultationBookingSerializer(data=payload)
        assert s.is_valid(), s.errors
        assert s.validated_data["doctor"] == doctor

    def test_normalizes_language_aliases(self, doctor):
        s = ConsultationBookingSerializer(
            data=self._payload(doctor, language="amharic"),
        )
        assert s.is_valid(), s.errors
        assert s.validated_data["language"] == "am"

    def test_language_english_alias(self, doctor):
        s = ConsultationBookingSerializer(
            data=self._payload(doctor, language="English"),
        )
        assert s.is_valid(), s.errors
        assert s.validated_data["language"] == "en"

    def test_rejects_past_date(self, doctor):
        yesterday = (timezone.localdate() - timedelta(days=1)).isoformat()
        s = ConsultationBookingSerializer(
            data=self._payload(doctor, appointment_date=yesterday),
        )
        assert not s.is_valid()
        assert "appointment_date" in s.errors

    @freeze_time("2026-08-30 15:00:00")
    def test_rejects_past_time_today(self, doctor):
        # 10:00 is in the past relative to frozen 15:00
        s = ConsultationBookingSerializer(
            data=self._payload(
                doctor,
                appointment_date="2026-08-30",
                appointment_time="10:00",
            ),
        )
        assert not s.is_valid()
        assert "appointment_time" in s.errors

    def test_rejects_unapproved_doctor(self):
        d = DoctorFactory(approval_status=DoctorFactory._meta.model.ApprovalStatus.PENDING)
        s = ConsultationBookingSerializer(data=self._payload(d))
        assert not s.is_valid()
        assert "doctor" in s.errors


# ============================================================
# ONBOARDING SERIALIZER
# ============================================================

def _fake_request(user):
    req = APIRequestFactory().post("/")
    req.user = user
    return req


class TestConsultationOnboardingSerializer:
    def test_accepts_camel_case_date(self, patient_user, profile):
        s = ConsultationOnboardingSerializer(
            data={"dateOfBirth": "1990-05-12", "gender": "male"},
            context={"request": _fake_request(patient_user)},
        )
        assert s.is_valid(), s.errors
        saved = s.save()
        assert saved.date_of_birth == date(1990, 5, 12)
        assert saved.gender == "male"

    def test_normalizes_gender_alias(self, patient_user, profile):
        s = ConsultationOnboardingSerializer(
            data={"gender": "preferNot"},
            context={"request": _fake_request(patient_user)},
        )
        assert s.is_valid(), s.errors
        assert s.validated_data["gender"] == "prefer_not"

    def test_rejects_empty_payload(self, patient_user, profile):
        s = ConsultationOnboardingSerializer(
            data={},
            context={"request": _fake_request(patient_user)},
        )
        assert not s.is_valid()

    def test_rejects_user_without_service(self, db):
        u = UserFactory()  # no UserService / profile
        s = ConsultationOnboardingSerializer(
            data={"gender": "male"},
            context={"request": _fake_request(u)},
        )
        assert s.is_valid(), s.errors
        with pytest.raises(drf.ValidationError):
            s.save()

    def test_edit_does_not_overwrite_created_by(self, patient_user, profile):
        profile.created_by = UserFactory()
        original_creator = profile.created_by
        profile.save(update_fields=["created_by"])

        s = ConsultationOnboardingSerializer(
            data={"gender": "female"},
            context={"request": _fake_request(patient_user)},
        )
        assert s.is_valid(), s.errors
        s.save()
        profile.refresh_from_db()
        assert profile.created_by_id == original_creator.id


# ============================================================
# READ SERIALIZER
# ============================================================

class TestConsultationSerializer:
    def test_exposes_join_and_cancel_booleans(self, consultation):
        data = ConsultationSerializer(consultation).data
        assert "can_join" in data
        assert "can_cancel" in data
        assert "starts_at" in data
        assert isinstance(data["can_join"], bool)
        assert isinstance(data["can_cancel"], bool)

    def test_exposes_doctor_and_doctor_id(self, consultation):
        data = ConsultationSerializer(consultation).data
        doctor = consultation.appointment.doctor
        assert data["doctor"]["id"] == doctor.id
        assert data["doctor_id"] == doctor.id

    def test_doctor_name_uses_get_full_name(self, consultation):
        data = ConsultationSerializer(consultation).data
        expected = consultation.appointment.doctor.user.full_name
        assert data["doctor_name"] == expected

    def test_patient_name_uses_get_full_name(self, consultation):
        data = ConsultationSerializer(consultation).data
        expected = consultation.appointment.patient.full_name
        assert data["patient_name"] == expected

    def test_appointment_time_format_is_hhmm(self, consultation):
        data = ConsultationSerializer(consultation).data
        # "HH:mm" — exactly one colon, no seconds
        assert data["appointment_time"].count(":") == 1
        assert len(data["appointment_time"]) == 5

    def test_starts_at_is_populated(self, consultation):
        data = ConsultationSerializer(consultation).data
        assert data["starts_at"] is not None

    def test_all_fields_are_read_only(self):
        """
        Guards the contract that the read serializer is never used for writes.
        """
        s = ConsultationSerializer()
        for field_name in s.fields:
            assert s.fields[field_name].read_only, (
                f"{field_name} should be read-only on ConsultationSerializer"
            )