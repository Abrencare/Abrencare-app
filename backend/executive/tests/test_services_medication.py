"""Medication adherence + alerts."""

from unittest.mock import patch

from django.test import TransactionTestCase
from django.utils import timezone

from executive.models import MedicationSchedule
from ..services.services import ExecutiveProfileService, ExecutiveServiceError
from executive.tests.factories import (
    ExecutiveProfileFactory,
    MedicationAlertFactory,
    MedicationScheduleFactory,
)


class MarkScheduleTakenTests(TransactionTestCase):

    def setUp(self):
        self.profile = ExecutiveProfileFactory()
        self.user = self.profile.user_service.user
        self.schedule = MedicationScheduleFactory(
            medication__executive_profile=self.profile,
            status=MedicationSchedule.Status.UPCOMING,
        )

    def test_marks_taken_and_stamps_time(self):
        result = ExecutiveProfileService.mark_schedule_taken(
            user=self.user, schedule_id=self.schedule.pk,
        )
        self.assertEqual(result.status, MedicationSchedule.Status.TAKEN)
        self.assertIsNotNone(result.taken_at)

    def test_idempotent(self):
        ExecutiveProfileService.mark_schedule_taken(
            user=self.user, schedule_id=self.schedule.pk,
        )
        first = MedicationSchedule.objects.get(pk=self.schedule.pk)
        second = ExecutiveProfileService.mark_schedule_taken(
            user=self.user, schedule_id=self.schedule.pk,
        )
        self.assertEqual(first.taken_at, second.taken_at)


class MarkScheduleMissedTests(TransactionTestCase):

    def setUp(self):
        self.profile = ExecutiveProfileFactory()
        self.user = self.profile.user_service.user
        self.schedule = MedicationScheduleFactory(
            medication__executive_profile=self.profile,
        )

    @patch(
        "notifications.services.websocket_service.WebSocketService.send_notification"
    )
    def test_emits_missed_notification(self, mock_send):
        ExecutiveProfileService.mark_schedule_missed(
            user=self.user, schedule_id=self.schedule.pk,
        )
        self.assertTrue(mock_send.called)
        payload = mock_send.call_args[0][1]
        self.assertEqual(payload["type"], "medication.missed")

    def test_idempotent_no_duplicate_notification(self):
        ExecutiveProfileService.mark_schedule_missed(
            user=self.user, schedule_id=self.schedule.pk,
        )
        with patch(
            "notifications.services.websocket_service.WebSocketService.send_notification"
        ) as m:
            ExecutiveProfileService.mark_schedule_missed(
                user=self.user, schedule_id=self.schedule.pk,
            )
            self.assertFalse(m.called)


class MedicationAlertTests(TransactionTestCase):

    def setUp(self):
        self.profile = ExecutiveProfileFactory()
        self.user = self.profile.user_service.user

    @patch(
        "notifications.services.websocket_service.WebSocketService.send_notification"
    )
    def test_create_emits(self, mock_send):
        ExecutiveProfileService.create_medication_alert(
            user=self.user, message="Take with food",
        )
        payload = mock_send.call_args[0][1]
        self.assertEqual(payload["type"], "medication_alert.created")

    def test_resolve_sets_flags(self):
        alert = MedicationAlertFactory(executive_profile=self.profile)
        resolved = ExecutiveProfileService.resolve_medication_alert(
            user=self.user, alert_id=alert.pk,
        )
        self.assertTrue(resolved.resolved)
        self.assertIsNotNone(resolved.resolved_at)

    def test_resolve_unknown_raises(self):
        with self.assertRaises(ExecutiveServiceError) as cm:
            ExecutiveProfileService.resolve_medication_alert(
                user=self.user, alert_id=999_999,
            )
        self.assertEqual(cm.exception.code, "alert_not_found")