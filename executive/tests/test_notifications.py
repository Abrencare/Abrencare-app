"""Every service method that should emit a notification — asserts it does."""

from unittest.mock import patch

from django.test import TransactionTestCase

from ..services.services import (
    ExecutiveProfileService,
    CareTeamService,
)
from executive.tests.factories import (
    EmergencyEventFactory,
    ExecutiveProfileFactory,
    MedicationScheduleFactory,
)

WS_PATH = (
    "notifications.services.websocket_service."
    "WebSocketService.send_notification"
)


class NotificationEmissionTests(TransactionTestCase):
    """Each test patches the WS layer and inspects the outgoing payload."""

    def setUp(self):
        self.profile = ExecutiveProfileFactory()
        self.user = self.profile.user_service.user

    def _last_type(self, mock):
        return mock.call_args[0][1]["type"]

    def test_emergency_activated(self):
        with patch(WS_PATH) as m:
            ExecutiveProfileService.activate_emergency(
                user=self.user, response_id="EMG-N-1",
            )
            self.assertEqual(self._last_type(m), "emergency.activated")

    def test_emergency_resolved(self):
        event = EmergencyEventFactory(
            executive_profile=self.profile, status="active",
        )
        with patch(WS_PATH) as m:
            ExecutiveProfileService.resolve_emergency(
                user=self.user, response_id=event.response_id,
            )
            self.assertEqual(self._last_type(m), "emergency.resolved")

    def test_health_alert_info(self):
        with patch(WS_PATH) as m:
            ExecutiveProfileService.create_health_alert(
                user=self.user, title="Routine", severity="info",
            )
            self.assertEqual(self._last_type(m), "health_alert.created")

    def test_health_alert_flag(self):
        with patch(WS_PATH) as m:
            ExecutiveProfileService.create_health_alert(
                user=self.user, title="Urgent", severity="flag",
            )
            self.assertEqual(self._last_type(m), "health_alert.flagged")

    def test_medication_alert(self):
        with patch(WS_PATH) as m:
            ExecutiveProfileService.create_medication_alert(
                user=self.user, message="Check dosage",
            )
            self.assertEqual(
                self._last_type(m), "medication_alert.created",
            )

    def test_medication_missed(self):
        schedule = MedicationScheduleFactory(
            medication__executive_profile=self.profile,
        )
        with patch(WS_PATH) as m:
            ExecutiveProfileService.mark_schedule_missed(
                user=self.user, schedule_id=schedule.pk,
            )
            self.assertEqual(self._last_type(m), "medication.missed")

    def test_reading_abnormal_emits(self):
        with patch(WS_PATH) as m:
            ExecutiveProfileService.create_reading(
                user=self.user, metric="bp",
                value_numeric=180, value_secondary=120,
                unit="mmHg", status="high",
            )
            self.assertEqual(self._last_type(m), "reading.abnormal")

    def test_reading_normal_does_not_emit(self):
        with patch(WS_PATH) as m:
            ExecutiveProfileService.create_reading(
                user=self.user, metric="bp",
                value_numeric=118, value_secondary=76,
                unit="mmHg", status="normal",
            )
            self.assertFalse(m.called)

    def test_report_generated(self):
        from datetime import timedelta
        from django.utils import timezone
        with patch(WS_PATH) as m:
            ExecutiveProfileService.create_weekly_report(
                user=self.user,
                period="week",
                period_start=timezone.now().date() - timedelta(days=7),
                period_end=timezone.now().date(),
                label="WEEKLY",
                range_label="Nov 11 – Nov 17",
            )
            self.assertEqual(self._last_type(m), "report.generated")

    def test_care_team_writes_do_not_emit(self):
        with patch(WS_PATH) as m:
            CareTeamService.add_member(
                user=self.user, role="physician", full_name="Dr. Ada",
            )
            self.assertFalse(m.called)

    def test_resolve_does_not_emit(self):
        from executive.tests.factories import HealthAlertFactory
        alert = HealthAlertFactory(executive_profile=self.profile)
        with patch(WS_PATH) as m:
            ExecutiveProfileService.resolve_health_alert(
                user=self.user, alert_id=alert.pk,
            )
            self.assertFalse(m.called)


class PostCommitGuaranteeTests(TransactionTestCase):
    """Notification must NOT fire if the surrounding tx rolls back."""

    def setUp(self):
        self.profile = ExecutiveProfileFactory()
        self.user = self.profile.user_service.user

    def test_rollback_suppresses_notification(self):
        from django.db import transaction

        with patch(WS_PATH) as m:
            try:
                with transaction.atomic():
                    ExecutiveProfileService.create_health_alert(
                        user=self.user, title="Will roll back",
                    )
                    raise RuntimeError("boom")
            except RuntimeError:
                pass
            self.assertFalse(m.called)