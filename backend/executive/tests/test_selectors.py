"""Read-only query behaviour."""

from datetime import timedelta

from django.test import TestCase
from django.utils import timezone

from executive.services import ExecutiveProfileMissing, Selector
from executive.tests.factories import (
    CareTeamMemberFactory,
    ExecutiveProfileFactory,
    HealthAlertFactory,
    HealthProgrammeItemFactory,
    HealthScoreSnapshotFactory,
    MedicationAlertFactory,
    MedicationScheduleFactory,
    ReadingFactory,
    UpcomingCareFactory,
    UserFactory,
    WeeklyReportFactory,
)


class GetProfileTests(TestCase):

    def test_raises_when_missing(self):
        with self.assertRaises(ExecutiveProfileMissing):
            Selector.get_profile_for_user(UserFactory())

    def test_or_none_returns_none(self):
        self.assertIsNone(
            Selector.get_profile_for_user_or_none(UserFactory()),
        )


class DashboardTests(TestCase):

    def setUp(self):
        self.profile = ExecutiveProfileFactory(monitoring=["bp", "heartRate"])
        self.user = self.profile.user_service.user

    def test_empty_state(self):
        bundle = Selector.build_dashboard(self.user)
        self.assertEqual(bundle.readings, [])
        self.assertIsNone(bundle.score)
        self.assertFalse(bundle.up_to_date)

    def test_latest_reading_per_metric_kept(self):
        old = ReadingFactory(
            executive_profile=self.profile, metric="bp",
            recorded_at=timezone.now() - timedelta(days=3),
        )
        new = ReadingFactory(
            executive_profile=self.profile, metric="bp",
            recorded_at=timezone.now(),
        )
        ReadingFactory(
            executive_profile=self.profile, metric="heartRate",
        )
        bundle = Selector.build_dashboard(self.user)
        ids = {r.pk for r in bundle.readings}
        self.assertIn(new.pk, ids)
        self.assertNotIn(old.pk, ids)
        self.assertEqual(len(bundle.readings), 2)

    def test_readings_preserve_selection_order(self):
        ReadingFactory(executive_profile=self.profile, metric="heartRate")
        ReadingFactory(executive_profile=self.profile, metric="bp")
        bundle = Selector.build_dashboard(self.user)
        self.assertEqual(
            [r.metric for r in bundle.readings], ["bp", "heartRate"],
        )

    def test_up_to_date_within_window(self):
        ReadingFactory(
            executive_profile=self.profile, metric="bp",
            recorded_at=timezone.now(),
        )
        bundle = Selector.build_dashboard(self.user)
        self.assertTrue(bundle.up_to_date)

    def test_alerts_split_by_severity(self):
        info = HealthAlertFactory(
            executive_profile=self.profile, severity="info",
        )
        flag = HealthAlertFactory(
            executive_profile=self.profile, severity="flag",
        )
        bundle = Selector.build_dashboard(self.user)
        self.assertEqual(bundle.info_alert.pk, info.pk)
        self.assertEqual(bundle.flag_alert.pk, flag.pk)

    def test_upcoming_care_only_future(self):
        UpcomingCareFactory(
            executive_profile=self.profile,
            scheduled_for=timezone.now() - timedelta(days=1),
        )
        future = UpcomingCareFactory(
            executive_profile=self.profile,
            scheduled_for=timezone.now() + timedelta(days=1),
        )
        bundle = Selector.build_dashboard(self.user)
        self.assertEqual(bundle.upcoming_care.pk, future.pk)


class ProgrammeTests(TestCase):

    def setUp(self):
        self.profile = ExecutiveProfileFactory()
        self.user = self.profile.user_service.user

    def test_counts(self):
        MedicationScheduleFactory(
            medication__executive_profile=self.profile,
            taken=True,                              # ✅ trait sets taken_at too
        )
        MedicationScheduleFactory(
            medication__executive_profile=self.profile,
            status="upcoming",
        )
        HealthProgrammeItemFactory(
            executive_profile=self.profile, status="on",
        )
        HealthProgrammeItemFactory(
            executive_profile=self.profile, status="soon",
        )
        bundle = Selector.build_programme(self.user)
        self.assertEqual(bundle.medication_count, 2)
        self.assertEqual(bundle.taken_count, 1)
        self.assertEqual(bundle.programme_count, 2)
        self.assertEqual(bundle.on_track_count, 1)

    def test_excludes_inactive_medications(self):
        from executive.tests.factories import MedicationFactory
        MedicationFactory(executive_profile=self.profile, active=False)
        bundle = Selector.build_programme(self.user)
        self.assertEqual(bundle.medication_count, 0)

    def test_only_unresolved_alerts(self):
        MedicationAlertFactory(
            executive_profile=self.profile, resolved=False,
        )
        MedicationAlertFactory(
            executive_profile=self.profile, resolved=True,
            resolved_at=timezone.now(),
        )
        bundle = Selector.build_programme(self.user)
        self.assertEqual(len(bundle.medication_alerts), 1)


class ReportTests(TestCase):

    def setUp(self):
        self.profile = ExecutiveProfileFactory()
        self.user = self.profile.user_service.user

    def test_returns_latest_matching_period(self):
        WeeklyReportFactory(executive_profile=self.profile, period="week")
        new = WeeklyReportFactory(
            executive_profile=self.profile, period="week",
            period_start=timezone.now().date() - timedelta(days=1),
            period_end=timezone.now().date(),
        )
        bundle = Selector.build_report(self.user, period="week")
        self.assertEqual(bundle.report.pk, new.pk)

    def test_available_periods(self):
        bundle = Selector.build_report(self.user, period="week")
        self.assertEqual(set(bundle.available_periods), {"week", "month"})

    def test_no_report_returns_none(self):
        bundle = Selector.build_report(self.user, period="week")
        self.assertIsNone(bundle.report)
        