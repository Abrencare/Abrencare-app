import pytest
from django.utils import timezone
from rest_framework.test import APIClient

from appointments.models import Appointment
from appointments.tests.factories import (
    AppointmentFactory,
    AvailabilityFactory,
    DoctorFactory,
    UserFactory,
)

@pytest.fixture(autouse=True)
def _db(db):
    """Give every test DB access by default."""
    pass

@pytest.fixture
def api_client():
    return APIClient()


@pytest.fixture
def patient(db):
    return UserFactory()


@pytest.fixture
def doctor(db):
    d = DoctorFactory()
    for day in ("monday", "tuesday", "wednesday", "thursday", "friday"):
        AvailabilityFactory(doctor=d, day=day, start_time="09:00", end_time="17:00")
    return d


@pytest.fixture
def staff_user(db):
    return UserFactory(is_staff=True)


@pytest.fixture
def next_weekday():
    today = timezone.localdate()
    days_ahead = (0 - today.weekday()) % 7 or 7
    return today + timezone.timedelta(days=days_ahead)


@pytest.fixture
def appointment(patient, doctor, next_weekday):
    return AppointmentFactory(
        patient=patient,
        doctor=doctor,
        appointment_date=next_weekday,
        appointment_time="10:00",
    )


@pytest.fixture
def auth_client(api_client):
    def _auth(user):
        api_client.force_authenticate(user=user)
        return api_client
    return _auth