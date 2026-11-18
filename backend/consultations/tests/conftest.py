# consultations/tests/conftest.py
import pytest
from rest_framework.test import APIClient
from datetime import time, timedelta
from django.utils import timezone
from .factories import (
    ConsultationFactory,
    ConsultationProfileFactory,
    DoctorFactory,
    PatientFactory,
    UserFactory,
    UserServiceFactory,
)
from doctors.models import DoctorAvailability

@pytest.fixture
def api_client():
    return APIClient()


@pytest.fixture
def patient_user(db):
    return UserFactory()


@pytest.fixture
def patient(db, patient_user):
    """The Patient profile — some tests need it; IsPatientUser checks it."""
    return PatientFactory(user=patient_user)


@pytest.fixture
def doctor_user(db):
    return UserFactory()


@pytest.fixture
def doctor(db, doctor_user):
    return DoctorFactory(user=doctor_user)


@pytest.fixture
def auth_client(api_client):
    def _login(user):
        api_client.force_authenticate(user=user)
        return api_client
    return _login


@pytest.fixture
def consultation(db, patient_user, doctor):
    """
    A consultation linking `patient_user` (a User) to `doctor`.

    Appointment.patient is a User FK in this project, so we pass the user,
    not the Patient profile.
    """
    return ConsultationFactory(
        appointment__patient=patient_user,
        appointment__doctor=doctor,
    )


@pytest.fixture
def profile(db, patient_user):
    us = UserServiceFactory(user=patient_user)
    return ConsultationProfileFactory(user_service=us)
