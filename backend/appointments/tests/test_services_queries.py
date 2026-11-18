import pytest
from datetime import time, timedelta
from django.utils import timezone

from appointments.models import Appointment
from appointments.services import (
    base_queryset,
    filter_list,
    user_can_access,
    user_can_manage,
    visible_to,
)
from .factories import AppointmentFactory, DoctorFactory, UserFactory

pytestmark = pytest.mark.django_db


class TestVisibleTo:
    def test_staff_sees_all(self, staff_user):
        AppointmentFactory.create_batch(3)
        assert visible_to(staff_user).count() == 3

    def test_doctor_sees_own_only(self, appointment):
        other_doctor = DoctorFactory()
        AppointmentFactory(doctor=other_doctor)
        qs = visible_to(appointment.doctor.user)
        assert qs.count() == 1
        assert qs.first() == appointment

    def test_patient_sees_own_only(self, appointment):
        AppointmentFactory()  # another patient's
        qs = visible_to(appointment.patient)
        assert qs.count() == 1
        assert qs.first() == appointment


class TestFilterList:
    def test_filter_by_status(self, appointment):
        AppointmentFactory(status=Appointment.Status.CANCELLED)
        qs = filter_list(base_queryset(), {"status": "pending"})
        assert qs.count() == 1

    def test_filter_by_date(self, appointment):
        AppointmentFactory(
            appointment_date=appointment.appointment_date + timedelta(days=5)
        )
        qs = filter_list(base_queryset(), {"date": str(appointment.appointment_date)})
        assert qs.count() == 1

    def test_filter_from_to(self, appointment):
        AppointmentFactory(
            appointment_date=appointment.appointment_date + timedelta(days=10)
        )
        qs = filter_list(
            base_queryset(),
            {
                "from": str(appointment.appointment_date),
                "to": str(appointment.appointment_date + timedelta(days=1)),
            },
        )
        assert qs.count() == 1

    def test_upcoming_flag_excludes_final_statuses(self, appointment):
        appointment.status = Appointment.Status.CANCELLED
        appointment.save()
        qs = filter_list(base_queryset(), {"upcoming": "true"})
        assert qs.count() == 0


class TestAccessControls:
    def test_patient_can_access_own(self, appointment):
        assert user_can_access(appointment.patient, appointment)

    def test_doctor_can_access_own(self, appointment):
        assert user_can_access(appointment.doctor.user, appointment)

    def test_staff_can_access_any(self, appointment, staff_user):
        assert user_can_access(staff_user, appointment)

    def test_stranger_cannot_access(self, appointment):
        stranger = UserFactory()
        assert not user_can_access(stranger, appointment)

    def test_patient_cannot_manage(self, appointment):
        assert not user_can_manage(appointment.patient, appointment)

    def test_doctor_can_manage(self, appointment):
        assert user_can_manage(appointment.doctor.user, appointment)

    def test_staff_can_manage(self, appointment, staff_user):
        assert user_can_manage(staff_user, appointment)