"""HTTP tests for screen-level aggregate endpoints."""

from datetime import timedelta

from django.urls import reverse
from rest_framework.test import APITestCase
from django.utils import timezone

from executive.tests.factories import (
    CareTeamMemberFactory,
    EmergencyEventFactory,
    EmergencyTimelineStepFactory,
    ExecutiveProfileFactory,
    HealthAlertFactory,
    HealthProgrammeItemFactory,
    HealthScoreSnapshotFactory,
    MedicationAlertFactory,
    MedicationScheduleFactory,
    ReadingFactory,
    UpcomingCareFactory,
    WeeklyReportFactory,
)


class _AuthMixin:
    def auth(self, user):
        self.client.force_authenticate(user=user)


class ExecutiveDashboardViewTests(_AuthMixin, APITestCase):

    def setUp(self):
        self.profile = ExecutiveProfileFactory(monitoring=["bp", "heartRate"])
        self.user = self.profile.user_service.user
        self.auth(self.user)

    def test_full_payload(self):
        HealthScoreSnapshotFactory(executive_profile=self.profile)
        HealthAlertFactory(
            executive_profile=self.profile, severity="info",
        )
        HealthAlertFactory(
            executive_profile=self.profile, severity="flag",
        )
        CareTeamMemberFactory(
            executive_profile=self.profile, role="manager",
        )
        CareTeamMemberFactory(
            executive_profile=self.profile, role="physician",
        )
        ReadingFactory(executive_profile=self.profile, metric="bp")
        UpcomingCareFactory(executive_profile=self.profile)

        resp = self.client.get(reverse("executive:dashboard"))
        self.assertEqual(resp.status_code, 200)
        self.assertIsNotNone(resp.data["score"])
        self.assertIsNotNone(resp.data["alert"])
        self.assertIsNotNone(resp.data["attention"])
        self.assertEqual(len(resp.data["readings"]), 1)
        self.assertEqual(resp.data["monitoring"], ["bp", "heartRate"])

    def test_404_when_not_enrolled(self):
        from executive.tests.factories import UserFactory
        self.auth(UserFactory())
        resp = self.client.get(reverse("executive:dashboard"))
        self.assertEqual(resp.status_code, 404)


class ExecutiveEmergencyViewTests(_AuthMixin, APITestCase):

    def setUp(self):
        self.profile = ExecutiveProfileFactory()
        self.user = self.profile.user_service.user
        self.auth(self.user)

    def test_active_event_included(self):
        event = EmergencyEventFactory(
            executive_profile=self.profile,
            response_id="EMG-XYZ",
        )
        EmergencyTimelineStepFactory(event=event, label="Started")

        CareTeamMemberFactory(
            executive_profile=self.profile, role="manager",
        )
        CareTeamMemberFactory(
            executive_profile=self.profile, role="physician",
        )

        resp = self.client.get(reverse("executive:emergency"))
        self.assertEqual(resp.status_code, 200)
        self.assertEqual(resp.data["event"]["responseId"], "EMG-XYZ")
        self.assertEqual(len(resp.data["event"]["timeline"]), 1)
        self.assertIsNotNone(resp.data["coordinator"])
        self.assertIsNotNone(resp.data["physician"])

    def test_no_active_event(self):
        resp = self.client.get(reverse("executive:emergency"))
        self.assertEqual(resp.status_code, 200)
        self.assertIsNone(resp.data["event"])


class ExecutiveProgrammeViewTests(_AuthMixin, APITestCase):

    def setUp(self):
        self.profile = ExecutiveProfileFactory()
        self.user = self.profile.user_service.user
        self.auth(self.user)

    def test_counts_and_physician(self):
        MedicationScheduleFactory(
            medication__executive_profile=self.profile, taken=True,
        )
        MedicationAlertFactory(executive_profile=self.profile)
        HealthProgrammeItemFactory(
            executive_profile=self.profile, status="on",
        )
        CareTeamMemberFactory(
            executive_profile=self.profile,
            role="physician", full_name="Dr. Ada",
        )
        resp = self.client.get(reverse("executive:programme"))
        self.assertEqual(resp.status_code, 200)
        self.assertEqual(resp.data["takenCount"], 1)
        self.assertEqual(resp.data["medicationCount"], 1)
        self.assertEqual(resp.data["programmeCount"], 1)
        self.assertEqual(resp.data["physician"]["full_name"], "Dr. Ada")


class ExecutiveReportsViewTests(_AuthMixin, APITestCase):

    def setUp(self):
        self.profile = ExecutiveProfileFactory()
        self.user = self.profile.user_service.user
        self.auth(self.user)

    def test_default_period(self):
        WeeklyReportFactory(executive_profile=self.profile, period="week")
        resp = self.client.get(reverse("executive:reports"))
        self.assertEqual(resp.status_code, 200)
        self.assertIsNotNone(resp.data["report"])

    def test_period_kwarg(self):
        WeeklyReportFactory(executive_profile=self.profile, period="month")
        resp = self.client.get(
            reverse("executive:reports-by-period", kwargs={"period": "month"}),
        )
        self.assertEqual(resp.status_code, 200)
        self.assertEqual(resp.data["report"]["period"], "month")


class AlertResolveViewTests(_AuthMixin, APITestCase):

    def setUp(self):
        self.profile = ExecutiveProfileFactory()
        self.user = self.profile.user_service.user
        self.auth(self.user)

    def test_resolve_health_alert(self):
        alert = HealthAlertFactory(executive_profile=self.profile)
        resp = self.client.post(
            reverse("executive:health-alert-resolve", args=[alert.pk]),
            {"resolved": True}, format="json",
        )
        self.assertEqual(resp.status_code, 200)
        alert.refresh_from_db()
        self.assertTrue(alert.resolved)

    def test_resolve_medication_alert(self):
        alert = MedicationAlertFactory(executive_profile=self.profile)
        resp = self.client.post(
            reverse("executive:medication-alert-resolve", args=[alert.pk]),
            {"resolved": True}, format="json",
        )
        self.assertEqual(resp.status_code, 200)