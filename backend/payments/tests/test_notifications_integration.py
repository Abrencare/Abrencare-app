import json

import pytest
from django.urls import reverse
from .test_telebirr_webhook import make_notify_payload

from notifications.models import Notification
from payments.models import Payment


def make_telebirr_payload(*args, **kwargs):
    from payments.tests.telebirr_factory import make_notify_payload
    return make_notify_payload(*args, **kwargs)


@pytest.mark.django_db
class TestPaymentNotifications:

    def test_success_notifies_payer(
        self, client, user, test_payable, telebirr_keypair,
    ):
        client.force_login(user)
        resp = client.post(
            reverse("payment-list"),
            data=json.dumps({
                "provider": "telebirr",
                "amount": "100.00",
                "currency": "ETB",
                **test_payable,
            }),
            content_type="application/json",
        )
        payment = Payment.objects.get(reference=resp.json()["reference"])

        # Settle via webhook.
        payload = make_notify_payload(
            out_trade_no=payment.metadata["out_trade_no"],
            amount="100.00",
            trans_id=payment.provider_reference,
            private_pem=telebirr_keypair["private_pem"],
        )
        client.post(
            reverse("telebirr-notify"),
            data=json.dumps(payload),
            content_type="application/json",
        )

        # The payer should have exactly one notification of the right type.
        notifications = Notification.objects.filter(
            user=user, notification_type="payment_succeeded",
        )
        assert notifications.count() == 1

        n = notifications.first()
        assert n.data["payment_reference"] == str(payment.reference)
        assert n.data["amount"] == "100.00"
        # Never leak provider internals to the user.
        assert "provider_reference" not in n.data
        assert "failure_reason" not in n.data

    def test_failed_payment_notifies_payer(
        self, client, user, test_payable, telebirr_keypair,
    ):
        client.force_login(user)
        resp = client.post(
            reverse("payment-list"),
            data=json.dumps({
                "provider": "telebirr",
                "amount": "100.00",
                "currency": "ETB",
                **test_payable,
            }),
            content_type="application/json",
        )
        payment = Payment.objects.get(reference=resp.json()["reference"])

        payload = make_notify_payload(
            out_trade_no=payment.metadata["out_trade_no"],
            amount="100.00",
            trans_id=payment.provider_reference,
            trade_status="Failure",
            private_pem=telebirr_keypair["private_pem"],
        )
        client.post(
            reverse("telebirr-notify"),
            data=json.dumps(payload),
            content_type="application/json",
        )

        assert Notification.objects.filter(
            user=user, notification_type="payment_failed",
        ).count() == 1

    def test_checkout_created_does_not_notify(
        self, client, user,
    ):
        """Internal transitions must not reach the user."""
        client.force_login(user)
        client.post(
            reverse("payment-list"),
            data=json.dumps({
                "provider": "telebirr", "amount": "10.00",
                "currency": "ETB",
            }),
            content_type="application/json",
        )
        # No user-facing notification yet.
        assert Notification.objects.filter(user=user).count() == 0

    def test_duplicate_webhook_does_not_duplicate_notification(
        self, client, user, test_payable, telebirr_keypair,
    ):
        client.force_login(user)
        resp = client.post(
            reverse("payment-list"),
            data=json.dumps({
                "provider": "telebirr",
                "currency": "ETB",
                **test_payable,
            }),
            content_type="application/json",
        )
        assert resp.status_code == 201, resp.json()
        payment = Payment.objects.get(reference=resp.json()["reference"])

        payload = make_notify_payload(
            out_trade_no=payment.metadata["out_trade_no"],
            amount="100.00",
            trans_id=payment.provider_reference,
            private_pem=telebirr_keypair["private_pem"],
        )
        for _ in range(3):
            client.post(
                reverse("telebirr-notify"),
                data=json.dumps(payload),
                content_type="application/json",
            )

        assert Notification.objects.filter(
            user=user, notification_type="payment_succeeded",
        ).count() == 1
