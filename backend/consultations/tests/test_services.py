# consultations/tests/test_services.py
from datetime import time, timedelta

import pytest
from django.utils import timezone
from doctors.models import DoctorAvailability
from appointments.models import Appointment
from consultations.models import Consultation
from consultations.services.services import (
    book_consultation,
    cancel_consultation,
    complete_consultation,
    create_prescription,
    start_consultation,
)

from .factories import (
    AppointmentFactory,
    ConsultationFactory,
    DoctorFactory,
)


pytestmark = pytest.mark.django_db


def _tomorrow():
    return timezone.localdate() + timedelta(days=1)


class TestBookConsultation:
    def test_creates_appointment_and_consultation(self, patient_user, patient, doctor):
        weekday = _tomorrow().strftime("%A").lower()
        DoctorAvailability.objects.create(
            doctor=doctor,
            day=weekday,
            start_time=time(0, 0),
            end_time=time(23, 59),
            is_available=True,
        )

        c = book_consultation(
            user=patient_user,
            doctor=doctor,
            appointment_date=_tomorrow(),
            appointment_time=time(10, 0),
        )
        assert c.status == Consultation.Status.SCHEDULED
        assert c.appointment.status == Appointment.Status.CONFIRMED
        assert c.appointment.patient_id == patient.id
        assert c.appointment.doctor_id == doctor.id
        assert c.price == doctor.consultation_fee
        assert c.meeting_url  # minted at booking

    def test_rejects_overlap(self, patient_user, patient, doctor):
        AppointmentFactory(
            doctor=doctor,
            appointment_date=_tomorrow(),
            appointment_time=time(10, 0),
            duration_minutes=30,
            status=Appointment.Status.CONFIRMED,
        )
        with pytest.raises(ValueError, match="no longer available"):
            book_consultation(
                user=patient_user,
                doctor=doctor,
                appointment_date=_tomorrow(),
                appointment_time=time(10, 15),
            )

    def test_allows_non_overlapping_back_to_back(self, patient_user, doctor):
        AppointmentFactory(
            doctor=doctor,
            appointment_date=_tomorrow(),
            appointment_time=time(10, 0),
            duration_minutes=30,
            status=Appointment.Status.CONFIRMED,
        )
        c = book_consultation(
            user=patient_user,
            doctor=doctor,
            appointment_date=_tomorrow(),
            appointment_time=time(10, 30),
        )
        assert c.pk


class TestCancelConsultation:
    def test_cancels_scheduled(self, consultation, patient_user):
        c = cancel_consultation(
            consultation=consultation, user=patient_user, reason="Not feeling well",
        )
        assert c.status == Consultation.Status.CANCELLED
        assert c.appointment.status == Appointment.Status.CANCELLED
        assert c.appointment.cancellation_reason == "Not feeling well"

    @pytest.mark.parametrize("status", [
        Consultation.Status.IN_PROGRESS,
        Consultation.Status.COMPLETED,
        Consultation.Status.CANCELLED,
        Consultation.Status.NO_SHOW,
    ])
    def test_rejects_non_cancellable(self, consultation, patient_user, status):
        consultation.status = status
        consultation.save(update_fields=["status"])
        with pytest.raises(ValueError, match="Cannot cancel"):
            cancel_consultation(
                consultation=consultation, user=patient_user, reason="",
            )


class TestStartConsultation:
    def test_starts_scheduled(self, consultation, doctor_user):
        c = start_consultation(consultation=consultation, user=doctor_user)
        assert c.status == Consultation.Status.IN_PROGRESS
        assert c.started_at is not None
        assert c.meeting_url

    def test_rejects_completed(self, consultation, doctor_user):
        consultation.status = Consultation.Status.COMPLETED
        consultation.save(update_fields=["status"])
        with pytest.raises(ValueError, match="Cannot start"):
            start_consultation(consultation=consultation, user=doctor_user)

    def test_rejects_unconfirmed_appointment(self, consultation, doctor_user):
        consultation.appointment.status = Appointment.Status.CANCELLED
        consultation.appointment.save(update_fields=["status"])
        with pytest.raises(ValueError, match="not confirmed"):
            start_consultation(consultation=consultation, user=doctor_user)


class TestCompleteConsultation:
    def test_completes_in_progress(self, consultation, doctor_user):
        consultation.status = Consultation.Status.IN_PROGRESS
        consultation.started_at = timezone.now()
        consultation.save(update_fields=["status", "started_at"])

        c = complete_consultation(consultation=consultation, user=doctor_user)
        assert c.status == Consultation.Status.COMPLETED
        assert c.ended_at is not None
        assert c.appointment.status == Appointment.Status.COMPLETED

    def test_rejects_scheduled(self, consultation, doctor_user):
        with pytest.raises(ValueError, match="Cannot complete"):
            complete_consultation(consultation=consultation, user=doctor_user)


class TestCreatePrescription:
    def test_creates_during_in_progress(self, consultation, doctor):
        consultation.status = Consultation.Status.IN_PROGRESS
        consultation.save(update_fields=["status"])

        p = create_prescription(
            consultation=consultation,
            doctor=doctor,
            data={
                "medication": "Amoxicillin",
                "dosage": "500mg",
                "frequency": "TID",
                "duration": "7 days",
                "instructions": "With water",
            },
        )
        assert p.pk
        assert p.consultation_id == consultation.id

    def test_rejects_other_doctor(self, consultation, doctor):
        other = DoctorFactory()
        with pytest.raises(ValueError, match="not authorized"):
            create_prescription(
                consultation=consultation,
                doctor=other,
                data={"medication": "X", "dosage": "1", "frequency": "1",
                      "duration": "1", "instructions": ""},
            )

    def test_rejects_scheduled(self, consultation, doctor):
        consultation.status = Consultation.Status.SCHEDULED
        consultation.save(update_fields=["status"])
        with pytest.raises(ValueError, match="only be created"):
            create_prescription(
                consultation=consultation,
                doctor=doctor,
                data={"medication": "X", "dosage": "1", "frequency": "1",
                      "duration": "1", "instructions": ""},
            )