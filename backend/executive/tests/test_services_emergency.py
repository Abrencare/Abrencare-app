"""Emergency activation / resolution + notification wiring."""

from unittest.mock import patch

from django.test import TransactionTestCase
from django.utils import timezone

from executive.models import EmergencyEvent, EmergencyTimelineStep
from ..services.services import (
    ExecutiveProfileService,
    ExecutiveServiceError,
)
from executive.tests.factories import EmergencyEventFactory, ExecutiveProfileFactory


class ActivateEmergencyTests(TransactionTestCase):

    reset_sequences = True

    def setUp(self):
        self.profile = ExecutiveProfileFactory()
        self.user = self.profile.user_service.user

    @patch(
        "notifications.services.websocket_service.WebSocketService.send_notification"
    )
    def test_creates_event_and_timeline(self, mock_send):
        event = ExecutiveProfileService.activate_emergency(
            user=self.user,
            response_id="EMG-TEST-0001",
            eta_minutes=12,
            timeline=[
                {"label": "Emergency activated", "status": "completed"},
                {"label": "Family notified", "status": "current"},
            ],
        )
        self.assertEqual(event.status, EmergencyEvent.Status.ACTIVE)
        self.assertEqual(event.timeline.count(), 2)
        self.assertEqual(
            list(event.timeline.values_list("order", flat=True)), [0, 1],
        )
        # Notification dispatched post-commit
        self.assertTrue(mock_send.called)
        payload = mock_send.call_args[0][1]
        self.assertEqual(payload["type"], "emergency.activated")

    def test_second_active_event_rejected(self):
        EmergencyEventFactory(
            executive_profile=self.profile, status=EmergencyEvent.Status.ACTIVE,
        )
        with self.assertRaises(ExecutiveServiceError) as cm:
            ExecutiveProfileService.activate_emergency(
                user=self.user, response_id="EMG-TEST-0002",
            )
        self.assertEqual(cm.exception.code, "emergency_active")

    def test_timeline_order_defaults_to_index(self):
        event = ExecutiveProfileService.activate_emergency(
            user=self.user,
            response_id="EMG-TEST-0003",
            timeline=[{"label": "A"}, {"label": "B"}, {"label": "C"}],
        )
        orders = list(
            event.timeline.order_by("order").values_list("order", flat=True)
        )
        self.assertEqual(orders, [0, 1, 2])


class ResolveEmergencyTests(TransactionTestCase):

    def setUp(self):
        self.profile = ExecutiveProfileFactory()
        self.user = self.profile.user_service.user
        self.event = EmergencyEventFactory(
            executive_profile=self.profile,
            status=EmergencyEvent.Status.ACTIVE,
        )

    @patch(
        "notifications.services.websocket_service.WebSocketService.send_notification"
    )
    def test_resolves_and_emits(self, mock_send):
        event = ExecutiveProfileService.resolve_emergency(
            user=self.user, response_id=self.event.response_id,
        )
        self.assertEqual(event.status, EmergencyEvent.Status.RESOLVED)
        self.assertIsNotNone(event.resolved_at)
        payload = mock_send.call_args[0][1]
        self.assertEqual(payload["type"], "emergency.resolved")

    def test_unknown_response_id_raises(self):
        with self.assertRaises(ExecutiveServiceError) as cm:
            ExecutiveProfileService.resolve_emergency(
                user=self.user, response_id="DOES-NOT-EXIST",
            )
        self.assertEqual(cm.exception.code, "emergency_not_found")