# consultations/tests/test_permissions.py
import pytest
from rest_framework.test import APIRequestFactory

from consultations.permissions import IsDoctorUser, IsPatientUser

from .factories import DoctorFactory, PatientFactory, UserFactory


pytestmark = pytest.mark.django_db


def _req(user):
    r = APIRequestFactory().get("/")
    r.user = user
    return r


class TestIsPatientUser:
    def test_allows_patient(self, patient_user, patient):
        assert IsPatientUser().has_permission(_req(patient_user), None) is True

    def test_rejects_doctor(self, doctor_user, doctor):
        assert IsPatientUser().has_permission(_req(doctor_user), None) is False

    def test_rejects_anonymous(self):
        from django.contrib.auth.models import AnonymousUser
        assert IsPatientUser().has_permission(_req(AnonymousUser()), None) is False

    def test_rejects_unrelated_user(self):
        u = UserFactory()
        assert IsPatientUser().has_permission(_req(u), None) is False


class TestIsDoctorUser:
    def test_allows_doctor(self, doctor_user, doctor):
        assert IsDoctorUser().has_permission(_req(doctor_user), None) is True

    def test_rejects_patient(self, patient_user, patient):
        assert IsDoctorUser().has_permission(_req(patient_user), None) is False

    def test_rejects_anonymous(self):
        from django.contrib.auth.models import AnonymousUser
        assert IsDoctorUser().has_permission(_req(AnonymousUser()), None) is False