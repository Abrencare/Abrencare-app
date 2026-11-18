# payments/tests/test_payment_flow.py
import json

import pytest
from decimal import Decimal
from django.urls import reverse
from .test_telebirr_webhook import make_notify_payload
from payments.models import Payment, PaymentEvent, Refund


@pytest.mark.django_db
class TestPaymentCreation:

    def test_create_payment_via_api(self, client, user, test_payable):
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

        body = resp.json()
        assert body["status"] == Payment.Status.PROCESSING
        assert body["provider"] == "telebirr"
        assert body["checkout_url"]
        assert body["payer"] == user.pk
        assert body["amount"] == "100.00"   # derived from payable, not client

        payment = Payment.objects.get(reference=body["reference"])
        assert payment.metadata.get("out_trade_no")

        # Audit log captured both the create and the checkout transition.
        events = list(payment.events.values_list("event_type", flat=True))
        assert "payment.created" in events
        assert "payment.checkout_created" in events

    def test_idempotent_create_returns_same_payment(
        self, client, user, test_payable,
    ):
        client.force_login(user)
        payload = {
            "provider": "telebirr",
            "currency": "ETB",
            "idempotency_key": "order-42",
            **test_payable,
        }
        r1 = client.post(
            reverse("payment-list"), data=json.dumps(payload),
            content_type="application/json",
        )
        r2 = client.post(
            reverse("payment-list"), data=json.dumps(payload),
            content_type="application/json",
        )
        assert r1.status_code == 201, r1.json()
        assert r2.status_code == 201, r2.json()
        assert r1.json()["reference"] == r2.json()["reference"]
        assert Payment.objects.count() == 1

    def test_manual_payment_requires_recorded_by(self, client, user):
        client.force_login(user)
        resp = client.post(
            reverse("payment-list"),
            data=json.dumps({
                "provider": "manual",
                "amount": "25.00",
            }),
            content_type="application/json",
        )
        assert resp.status_code == 400, resp.json()

    def test_manual_payment_succeeds_with_recorded_by(
        self, client, staff_user, test_payable,
    ):
        client.force_login(staff_user)
        resp = client.post(
            reverse("payment-list"),
            data=json.dumps({
                "provider": "manual",
                "currency": "ETB",
                **test_payable,
            }),
            content_type="application/json",
        )
        assert resp.status_code == 201, resp.json()
        assert resp.json()["status"] == Payment.Status.PENDING

    def test_manual_payment_requires_staff(self, client, user, test_payable):
        client.force_login(user)  # not staff
        resp = client.post(
            reverse("payment-list"),
            data=json.dumps({
                "provider": "manual",
                **test_payable,
            }),
            content_type="application/json",
        )
        assert resp.status_code == 400, resp.json()
        assert "provider" in resp.json()

@pytest.mark.django_db
class TestTelebirrWebhookSettlement:

    def _create_payment(self, client, user, test_payable):
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
        assert resp.status_code == 201, resp.json()
        return Payment.objects.get(reference=resp.json()["reference"])

    def test_notify_settles_payment(
        self, client, user, telebirr_keypair,test_payable
    ):
        payment = self._create_payment(client, user, test_payable)
        out_trade_no = payment.metadata["out_trade_no"]

        payload = make_notify_payload(
            out_trade_no=out_trade_no,
            amount="100.00",
            trans_id=payment.provider_reference,   # matches provider_reference
            private_pem=telebirr_keypair["private_pem"],
            trade_status="Completed",
        )

        resp = client.post(
            reverse("telebirr-notify"),
            data=json.dumps(payload),
            content_type="application/json",
        )
        assert resp.status_code == 200, resp.json()
        assert resp.json()["code"] == "0"

        payment.refresh_from_db()
        assert payment.status == Payment.Status.SUCCEEDED
        assert payment.paid_at is not None

        events = list(payment.events.values_list("event_type", flat=True))
        assert "payment.telebirr.notify.success" in events

    def test_notify_with_bad_signature_is_ignored(
        self, client, user, telebirr_keypair,test_payable
    ):
        payment = self._create_payment(client, user, test_payable)

        # Corrupt the signature.
        payload = make_notify_payload(
            out_trade_no=payment.metadata["out_trade_no"],
            amount="100.00",
            trans_id=payment.provider_reference,
            private_pem=telebirr_keypair["private_pem"],
        )
        payload["sign"] = "AAAA" + payload["sign"][4:]

        resp = client.post(
            reverse("telebirr-notify"),
            data=json.dumps(payload),
            content_type="application/json",
        )
        assert resp.status_code == 401, resp.json()
        assert resp.json() == {
            "code": "1",
            "msg": "signature invalid",
        }

        payment.refresh_from_db()
        assert payment.status != Payment.Status.SUCCEEDED

        from payments.models import ProviderWebhookLog
        log = ProviderWebhookLog.objects.latest("received_at")
        assert log.signature_valid is False

    def test_duplicate_notify_is_idempotent(
        self, client, user, telebirr_keypair,test_payable
    ):
        payment = self._create_payment(client, user, test_payable)
        payload = make_notify_payload(
            out_trade_no=payment.metadata["out_trade_no"],
            amount="100.00",
            trans_id=payment.provider_reference,
            private_pem=telebirr_keypair["private_pem"],
        )

        for _ in range(3):
            resp = client.post(
                reverse("telebirr-notify"),
                data=json.dumps(payload),
                content_type="application/json",
            )
            assert resp.status_code == 200, resp.json()

        # Only one success event despite three deliveries.
        assert payment.events.filter(
            event_type="payment.telebirr.notify.success",
        ).count() == 1

    def test_notify_for_unknown_order_is_logged_not_crashed(
        self, client, telebirr_keypair,test_payable
    ):
        payload = make_notify_payload(
            out_trade_no="does-not-exist",
            amount="10.00",
            trans_id="nowhere",
            private_pem=telebirr_keypair["private_pem"],
        )
        resp = client.post(
            reverse("telebirr-notify"),
            data=json.dumps(payload),
            content_type="application/json",
        )
        assert resp.status_code == 200, resp.json()

        from payments.models import ProviderWebhookLog
        log = ProviderWebhookLog.objects.latest("received_at")
        assert log.signature_valid is True
        assert "no matching payment" in log.processing_error

@pytest.mark.django_db
class TestRefundFlow:

    @pytest.fixture
    def settled_payment(self, client, user, test_payable, telebirr_keypair):
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
        settled_amount = str(payment.amount)          # read what was derived

        payload = make_notify_payload(
            out_trade_no=payment.metadata["out_trade_no"],
            amount=settled_amount,
            trans_id=payment.provider_reference,
            private_pem=telebirr_keypair["private_pem"],
        )
        webhook_resp = client.post(
            reverse("telebirr-notify"),
            data=json.dumps(payload),
            content_type="application/json",
        )
        assert webhook_resp.status_code == 200, webhook_resp.json()
        assert webhook_resp.json()["code"] == "0", webhook_resp.json()

        payment.refresh_from_db()
        assert payment.status == Payment.Status.SUCCEEDED, (
            f"Payment not settled: status={payment.status}, "
            f"events={list(payment.events.values_list('event_type', flat=True))}"
        )
        return payment
    
    def test_partial_refund_transitions_to_partially_refunded(
        self, client, staff_user, settled_payment, test_payable
    ):
        client.force_login(staff_user)
        resp = client.post(
            reverse("payment-refund", args=[str(settled_payment.reference)]),
            data=json.dumps({"amount": "50.00", "reason": "overpayment"}),
            content_type="application/json",
        )
        assert resp.status_code == 201, resp.json()

        settled_payment.refresh_from_db()
        # Mock client settles immediately.
        assert settled_payment.status == Payment.Status.PARTIALLY_REFUNDED
        assert settled_payment.amount_refunded == Decimal("50.00")
        assert settled_payment.available_for_refund() == Decimal("50.00")

        refund = Refund.objects.get(reference=resp.json()["reference"])
        assert refund.status == Refund.Status.SUCCEEDED

    def test_full_refund_transitions_to_refunded(
        self, client, staff_user, settled_payment, test_payable
    ):
        client.force_login(staff_user)
        resp = client.post(
            reverse("payment-refund", args=[str(settled_payment.reference)]),
            data=json.dumps({"amount": str(settled_payment.amount)}),
            content_type="application/json",
        )
        assert resp.status_code == 201, resp.json()

        settled_payment.refresh_from_db()
        assert settled_payment.status == Payment.Status.REFUNDED
        assert settled_payment.amount_refunded == Decimal("100.00")

    def test_over_refund_rejected(
        self, client, staff_user, settled_payment,
    ):
        client.force_login(staff_user)
        resp = client.post(
            reverse("payment-refund", args=[str(settled_payment.reference)]),
            data=json.dumps({"amount": "300.00"}),
            content_type="application/json",
        )
        assert resp.status_code == 400, resp.json()
        assert "available" in resp.json()["detail"].lower()

    def test_two_partial_refunds_then_full_rejected(
        self, client, staff_user, settled_payment,
    ):
        client.force_login(staff_user)
        url = reverse("payment-refund", args=[str(settled_payment.reference)])

        r1 = client.post(
            url,
            data=json.dumps({"amount": "40.00"}),
            content_type="application/json",
        )

        r2 = client.post(
            url,
            data=json.dumps({"amount": "40.00"}),
            content_type="application/json",
        )
        assert r1.status_code == r2.status_code == 201, (r1.json(), r2.json())

        settled_payment.refresh_from_db()
        assert settled_payment.amount_refunded == Decimal("80.00")
        assert settled_payment.available_for_refund() == Decimal("20.00")

        # Only 20 remains.
        r3 = client.post(
            url,
            data=json.dumps({"amount": "30.00"}),
            content_type="application/json",
        )

        assert r3.status_code == 400, r3.json()
        assert "available" in r3.json()["detail"].lower()

        # The remaining 20 can be refunded.
        r4 = client.post(
            url,
            data=json.dumps({"amount": "20.00"}),
            content_type="application/json",
        )

        assert r4.status_code == 201, r4.json()

        settled_payment.refresh_from_db()
        assert settled_payment.amount_refunded == Decimal("100.00")
        assert settled_payment.available_for_refund() == Decimal("0.00")
        assert settled_payment.status == Payment.Status.REFUNDED

import threading

from django.db import connection, connections

@pytest.mark.django_db(transaction=True)
@pytest.mark.skipif(
    connection.vendor == "sqlite",
    reason="SQLite doesn't support row-level locking; this test needs Postgres.",
)
@pytest.mark.django_db(transaction=True)  # real transactions, not test-wrap
class TestConcurrentRefunds:

    def test_parallel_refunds_cannot_exceed_amount(
        self, client, staff_user, telebirr_keypair,
    ):
        # Settle a payment for 100.
        client.force_login(staff_user)
        resp = client.post(
            reverse("payment-list"),
            data=json.dumps({
                "provider": "telebirr", "amount": "100.00",
                "currency": "ETB",
            }),
            content_type="application/json",
        )
        payment = Payment.objects.get(reference=resp.json()["reference"])

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
        payment.refresh_from_db()
        assert payment.status == Payment.Status.SUCCEEDED

        # Two threads each try to refund 80. Only one should succeed.
        results = []
        barrier = threading.Barrier(2)

        def worker():
            from payments.services import request_refund
            from payments.models import RefundError, InvalidTransition
            barrier.wait()
            try:
                request_refund(
                    payment=Payment.objects.get(pk=payment.pk),
                    actor=staff_user,
                    amount=Decimal("80.00"),
                )
                results.append("ok")
            except (RefundError, InvalidTransition) as exc:
                results.append(f"rejected: {exc}")
            finally:
                connections.close_all()

        threads = [threading.Thread(target=worker) for _ in range(2)]
        for t in threads: t.start()
        for t in threads: t.join()

        payment.refresh_from_db()
        assert payment.amount_refunded <= Decimal("100.00")
        assert sorted(results)[0].startswith("rejected")
        assert sorted(results)[1] == "ok"
