"""Walk the full onboarding → dashboard → emergency → resolve flow."""

from unittest.mock import patch

from django.test import TransactionTestCase
from django.urls import reverse
from django.utils import timezone
from rest_framework.test import APIClient 
from executive.tests.factories import (
    CareTeamMemberFactory,
    ReadingFactory,
    ServiceFactory,
    UserFactory,
    UserServiceFactory,
)

WS_PATH = (
    "notifications.services.websocket_service."
    "WebSocketService.send_notification"
)


class FullExecutiveFlowTests(TransactionTestCase):

    reset_sequences = True

    def setUp(self):
        self.user = UserFactory()
        UserServiceFactory(user=self.user, service=ServiceFactory())
        self.client = APIClient()
        self.client.force_authenticate(user=self.user)

    def test_end_to_end(self):
        # 1. Not enrolled yet
        resp = self.client.get(reverse("executive:me"))
        self.assertFalse(resp.data["enrolled"])

        # 2. Onboard
        with patch(WS_PATH):
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

        # 3. Now enrolled
        resp = self.client.get(reverse("executive:me"))
        self.assertTrue(resp.data["enrolled"])

        # 4. Dashboard is empty but valid
        resp = self.client.get(reverse("executive:dashboard"))
        self.assertEqual(resp.status_code, 200)
        self.assertEqual(resp.data["readings"], [])

        # 5. Populate some readings + care team + a physician
        from executive.models import ExecutiveProfile
        profile = ExecutiveProfile.objects.get(user_service__user=self.user)
        ReadingFactory(executive_profile=profile, metric="bp")
        ReadingFactory(executive_profile=profile, metric="heartRate")
        CareTeamMemberFactory(
            executive_profile=profile, role="manager", full_name="Nurse Sarah",
        )
        CareTeamMemberFactory(
            executive_profile=profile, role="physician", full_name="Dr. Ada",
        )

        # 6. Dashboard reflects state
        resp = self.client.get(reverse("executive:dashboard"))
        self.assertEqual(len(resp.data["readings"]), 2)
        self.assertEqual(resp.data["manager"]["full_name"], "Nurse Sarah")
        self.assertEqual(resp.data["physician"]["full_name"], "Dr. Ada")

        # 7. Emergency activate → dashboard + emergency view reflect it
        with patch(WS_PATH) as m:
            resp = self.client.get(reverse("executive:emergency"))
            self.assertIsNone(resp.data["event"])

            from executive.services import ExecutiveProfileService
            event = ExecutiveProfileService.activate_emergency(
                user=self.user,
                response_id="EMG-E2E-001",
                eta_minutes=10,
                timeline=[
                    {"label": "Emergency activated", "status": "completed"},
                ],
            )
            self.assertEqual(event.status, "active")
            self.assertTrue(m.called)

            resp = self.client.get(reverse("executive:emergency"))
            self.assertEqual(
                resp.data["event"]["responseId"], "EMG-E2E-001",
            )
            self.assertEqual(
                len(resp.data["event"]["timeline"]), 1,
            )

        # 8. Resolve emergency
        with patch(WS_PATH):
            ExecutiveProfileService.resolve_emergency(
                user=self.user, response_id="EMG-E2E-001",
            )
        resp = self.client.get(reverse("executive:emergency"))
        self.assertIsNone(resp.data["event"])