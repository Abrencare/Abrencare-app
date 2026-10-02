"""HTTP tests for onboarding endpoints."""

from unittest.mock import patch

from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from executive.models import ExecutiveProfile
from executive.tests.factories import (
    CareTeamMemberFactory,
    ExecutiveProfileFactory,
    ServiceFactory,
    UserFactory,
    UserServiceFactory,
)


class _AuthMixin:
    def auth(self, user):
        self.client.force_authenticate(user=user)


class ExecutiveMeViewTests(_AuthMixin, APITestCase):

    def test_not_enrolled(self):
        user = UserFactory()
        self.auth(user)
        resp = self.client.get(reverse("executive:me"))
        self.assertEqual(resp.status_code, 200)
        self.assertFalse(resp.data["enrolled"])
        self.assertIsNone(resp.data["profile"])

    def test_enrolled(self):
        profile = ExecutiveProfileFactory()
        CareTeamMemberFactory(executive_profile=profile)
        self.auth(profile.user_service.user)
        resp = self.client.get(reverse("executive:me"))
        self.assertEqual(resp.status_code, 200)
        self.assertTrue(resp.data["enrolled"])
        self.assertEqual(len(resp.data["careTeam"]), 1)

    def test_requires_auth(self):
        resp = self.client.get(reverse("executive:me"))
        self.assertIn(resp.status_code, (401, 403))


class ExecutiveProfileViewTests(_AuthMixin, APITestCase):

    def setUp(self):
        self.user = UserFactory()
        UserServiceFactory(user=self.user, service=ServiceFactory())

    def test_post_creates_profile(self):
        self.auth(self.user)
        resp = self.client.post(reverse("executive:profile"), {
            "dateOfBirth": "1990-05-12",
            "gender": "male",
            "heightCm": "180",
            "weightKg": "75",
        }, format="json")
        self.assertEqual(resp.status_code, 200, resp.data)
        self.assertTrue(
            ExecutiveProfile.objects.filter(
                user_service__user=self.user,
            ).exists()
        )

    def test_post_not_enrolled_403(self):
        stranger = UserFactory()
        self.auth(stranger)
        resp = self.client.post(reverse("executive:profile"), {
            "dateOfBirth": "1990-05-12",
            "gender": "male",
            "heightCm": "180", "weightKg": "75",
        }, format="json")
        self.assertEqual(resp.status_code, 403)
        self.assertEqual(resp.data["code"], "not_enrolled")

    def test_get_404_when_missing(self):
        self.auth(self.user)
        resp = self.client.get(reverse("executive:profile"))
        self.assertEqual(resp.status_code, 404)


class ExecutiveOnboardingCompleteViewTests(_AuthMixin, APITestCase):

    def setUp(self):
        self.user = UserFactory()
        self.us = UserServiceFactory(user=self.user, service=ServiceFactory())

    @patch(
        "notifications.services.websocket_service.WebSocketService.send_notification"
    )
    def test_full_onboarding(self, mock_send):
        self.auth(self.user)
        resp = self.client.post(
            reverse("executive:onboarding-complete"),
            {
                "dateOfBirth": "1990-05-12",
                "gender": "male",
                "heightCm": "180", "weightKg": "75",
                "monitoring": ["bp", "heartRate"],
                "frequency": "managed",
            },
            format="json",
        )
        self.assertEqual(resp.status_code, 200, resp.data)
        self.us.refresh_from_db()
        self.assertTrue(self.us.onboarded)
        profile = ExecutiveProfile.objects.get(user_service=self.us)
        self.assertEqual(profile.monitoring, ["bp", "heartRate"])

    def test_requires_monitoring(self):
        self.auth(self.user)
        resp = self.client.post(
            reverse("executive:onboarding-complete"),
            {
                "dateOfBirth": "1990-05-12", "gender": "male",
                "heightCm": "180", "weightKg": "75",
                "monitoring": [], "frequency": "managed",
            },
            format="json",
        )
        self.assertEqual(resp.status_code, 400)


class ExecutiveCareViewTests(_AuthMixin, APITestCase):

    def setUp(self):
        self.profile = ExecutiveProfileFactory()
        self.user = self.profile.user_service.user

    def test_saves_care(self):
        self.auth(self.user)
        resp = self.client.post(reverse("executive:care"), {
            "monitoring": ["bp"], "frequency": "weekly",
        }, format="json")
        self.assertEqual(resp.status_code, 200)
        self.profile.refresh_from_db()
        self.assertEqual(self.profile.frequency, "weekly")


class ExecutiveCareTeamViewTests(_AuthMixin, APITestCase):

    def test_lists_members(self):
        profile = ExecutiveProfileFactory()
        CareTeamMemberFactory(executive_profile=profile, full_name="A")
        CareTeamMemberFactory(executive_profile=profile, full_name="B")
        self.auth(profile.user_service.user)
        resp = self.client.get(reverse("executive:care-team"))
        self.assertEqual(resp.status_code, 200)
        self.assertEqual(len(resp.data), 2)