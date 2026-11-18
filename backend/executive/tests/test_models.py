"""Model-level invariants."""

from datetime import timedelta

from django.core.exceptions import ValidationError
from django.db import IntegrityError, transaction
from django.test import TestCase
from django.utils import timezone

from executive.models import (
    EmergencyEvent,
    EmergencyTimelineStep,
    HealthAlert,
    MedicationSchedule,
    Reading,
    WeeklyReport,
)
from executive.tests.factories import (
    EmergencyEventFactory,
    ExecutiveProfileFactory,
    HealthAlertFactory,
    MedicationFactory,
    MedicationScheduleFactory,
    ReadingFactory,
    WeeklyReportFactory,
)


class ExecutiveProfileModelTests(TestCase):

    def test_str_prefers_name(self):
        profile = ExecutiveProfileFactory(name="Ada Lovelace")
        self.assertEqual(str(profile), "Ada Lovelace")

    def test_str_falls_back_to_full_name(self):
        profile = ExecutiveProfileFactory(name="")
        expected = profile.user_service.user.full_name
        self.assertEqual(str(profile), expected)


class ReadingModelTests(TestCase):

    def test_display_value_auto_built_when_blank(self):
        r = ReadingFactory(
            display_value="",
            value_numeric=118,
            value_secondary=76,
            unit="mmHg",
        )
        self.assertEqual(r.display_value, "118/76 mmHg")

    def test_display_value_respects_manual_override(self):
        r = ReadingFactory(display_value="CUSTOM")
        self.assertEqual(r.display_value, "CUSTOM")

    def test_systolic_only(self):
        r = ReadingFactory(
            display_value="", value_numeric=72,
            value_secondary=None, unit="BPM",
        )
        self.assertEqual(r.display_value, "72 BPM")

class HealthAlertConstraintTests(TestCase):

    def setUp(self):
        # Save the parent once — the child factories will reuse it
        self.profile = ExecutiveProfileFactory()

    def test_resolved_requires_resolved_at(self):
        alert = HealthAlertFactory.build(
            executive_profile=self.profile,   # ✅ saved FK
            resolved=True,
            resolved_at=None,
        )
        with self.assertRaises(IntegrityError):
            with transaction.atomic():
                alert.save()

    def test_unresolved_must_not_have_resolved_at(self):
        alert = HealthAlertFactory.build(
            executive_profile=self.profile,
            resolved=False,
            resolved_at=timezone.now(),
        )
        with self.assertRaises(IntegrityError):
            with transaction.atomic():
                alert.save()

    def test_valid_resolved(self):
        alert = HealthAlertFactory(
            executive_profile=self.profile,
            resolved=True,
            resolved_at=timezone.now(),
        )
        alert.refresh_from_db()
        self.assertTrue(alert.resolved)


class EmergencyEventConstraintTests(TestCase):

    def setUp(self):
        self.profile = ExecutiveProfileFactory()

    def test_resolved_requires_resolved_at(self):
        event = EmergencyEventFactory.build(
            executive_profile=self.profile,   # ✅ saved FK
            status=EmergencyEvent.Status.RESOLVED,
            resolved_at=None,
        )
        with self.assertRaises(IntegrityError):
            with transaction.atomic():
                event.save()

    def test_cancelled_does_not_require_resolved_at(self):
        event = EmergencyEventFactory(
            executive_profile=self.profile,
            status=EmergencyEvent.Status.CANCELLED,
            resolved_at=None,
        )
        event.refresh_from_db()
        self.assertEqual(event.status, EmergencyEvent.Status.CANCELLED)


class MedicationScheduleTests(TestCase):

    def setUp(self):
        self.profile = ExecutiveProfileFactory()
        self.med = MedicationFactory(executive_profile=self.profile)  # ✅ saved FK

    def test_time_label_derives_from_scheduled_for(self):
        when = timezone.now().replace(hour=8, minute=0, second=0, microsecond=0)
        schedule = MedicationScheduleFactory(
            medication=self.med, scheduled_for=when,
        )
        self.assertEqual(schedule.time_label, "08:00")

    def test_taken_requires_taken_at(self):
        schedule = MedicationScheduleFactory.build(
            medication=self.med,               # ✅ saved FK
            status=MedicationSchedule.Status.TAKEN,
            taken_at=None,
        )
        with self.assertRaises(IntegrityError):
            with transaction.atomic():
                schedule.save()

class EmergencyTimelineStepTests(TestCase):

    def test_unique_order_per_event(self):
        event = EmergencyEventFactory()
        EmergencyTimelineStep.objects.create(
            event=event, label="A", order=0,
        )
        with self.assertRaises(IntegrityError):
            with transaction.atomic():
                EmergencyTimelineStep.objects.create(
                    event=event, label="B", order=0,
                )

    def test_two_events_can_share_order(self):
        e1 = EmergencyEventFactory()
        e2 = EmergencyEventFactory()
        EmergencyTimelineStep.objects.create(event=e1, label="A", order=0)
        EmergencyTimelineStep.objects.create(event=e2, label="A", order=0)
        self.assertEqual(EmergencyTimelineStep.objects.count(), 2)


class WeeklyReportConstraintTests(TestCase):

    def test_period_end_before_start_rejected(self):
        profile = ExecutiveProfileFactory()
        with self.assertRaises(IntegrityError):
            with transaction.atomic():
                WeeklyReport.objects.create(
                    executive_profile=profile,
                    period="week",
                    period_start=timezone.now().date(),
                    period_end=timezone.now().date() - timedelta(days=1),
                    label="L", range_label="R",
                )

    def test_unique_period_start_per_profile(self):
        profile = ExecutiveProfileFactory()
        start = timezone.now().date() - timedelta(days=7)
        end = timezone.now().date()
        WeeklyReportFactory(
            executive_profile=profile, period="week",
            period_start=start, period_end=end,
        )
        with self.assertRaises(IntegrityError):
            with transaction.atomic():
                WeeklyReportFactory(
                    executive_profile=profile, period="week",
                    period_start=start, period_end=end,
                )


class SoftDeleteTests(TestCase):

    def test_soft_delete_sets_timestamp(self):
        profile = ExecutiveProfileFactory()
        profile.soft_delete()
        profile.refresh_from_db()
        self.assertIsNotNone(profile.deleted_at)

    def test_alive_queryset_excludes_deleted(self):
        p1 = ExecutiveProfileFactory()
        p2 = ExecutiveProfileFactory()
        p1.soft_delete()
        alive = list(type(p2).objects.alive())
        self.assertIn(p2, alive)
        self.assertNotIn(p1, alive)