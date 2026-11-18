# payments/tests/test_telebirr_webhook.py
import json

import pytest
from django.urls import reverse

from payments.models import Payment, PaymentEvent, ProviderWebhookLog
from .telebirr_factory import make_notify_payload


@pytest.mark.django_db
def test_notify_succeeds_payment(client, django_user_model, settings):
    settings.TELEBIRR_MODE = "mock"

    payer = django_user_model.objects.create_user("payer", password="x")
    payment = Payment.objects.create(
        provider=Payment.Provider.TELEBIRR,
        amount="100.00",
        payer=payer,
        status=Payment.Status.PROCESSING,
        provider_reference="MOCK-PREPAY-abc123",
        metadata={"out_trade_no": "out-123"},
    )

    payload = make_notify_payload(
        out_trade_no="out-123",
        amount="100.00",
        trans_id="MOCK-PREPAY-abc123",
        trade_status="Completed",
    )

    resp = client.post(
        reverse("telebirr-notify"),
        data=json.dumps(payload),
        content_type="application/json",
    )
    assert resp.status_code == 200
    assert resp.json()["code"] == "0"

    payment.refresh_from_db()
    assert payment.status == Payment.Status.SUCCEEDED
    assert payment.paid_at is not None

    log = ProviderWebhookLog.objects.latest("received_at")
    assert log.signature_valid is True
    assert log.processed is True

    # Event was appended, not mutated.
    assert PaymentEvent.objects.filter(
        payment=payment, event_type="payment.telebirr.notify.success",
    ).exists()


@pytest.mark.django_db
def test_notify_duplicate_is_idempotent(client, django_user_model, settings):
    settings.TELEBIRR_MODE = "mock"
    payer = django_user_model.objects.create_user("payer2", password="x")
    payment = Payment.objects.create(
        provider=Payment.Provider.TELEBIRR,
        amount="50.00", payer=payer,
        status=Payment.Status.PROCESSING,
        provider_reference="MOCK-PREPAY-xyz",
        metadata={"out_trade_no": "out-dup"},
    )
    payload = make_notify_payload(
        out_trade_no="out-dup", amount="50.00",
        trans_id="MOCK-PREPAY-xyz",
    )
    for _ in range(2):
        resp = client.post(
            reverse("telebirr-notify"),
            data=json.dumps(payload),
            content_type="application/json",
        )
        assert resp.status_code == 200

    # Only one transition event despite two deliveries.
    assert PaymentEvent.objects.filter(
        payment=payment, event_type="payment.telebirr.notify.success",
    ).count() == 1


@pytest.mark.django_db
class TestTelebirrWebhookSettlement:

    def _create_payment(self, client, user, test_payable):
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
        return Payment.objects.get(reference=resp.json()["reference"])

    def test_notify_settles_payment(
        self, client, user, test_payable, telebirr_keypair,
    ):
        payment = self._create_payment(client, user, test_payable)
        out_trade_no = payment.metadata["out_trade_no"]

        payload = make_notify_payload(
            out_trade_no=out_trade_no,
            amount="100.00",   # matches the fixture's payable amount
            trans_id=payment.provider_reference,
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
        self, client, user, test_payable, telebirr_keypair,
    ):
        payment = self._create_payment(client, user, test_payable)
        out_trade_no = payment.metadata["out_trade_no"]

        # Corrupt the signature.
        payload = make_notify_payload(
            out_trade_no=out_trade_no,
            amount="100.00",   # matches the fixture's payable amount
            trans_id=payment.provider_reference,
            private_pem=telebirr_keypair["private_pem"],
            trade_status="Completed",
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
        self, client, user,  test_payable,telebirr_keypair,
    ):
        payment = self._create_payment(client, user, test_payable)
        out_trade_no = payment.metadata["out_trade_no"]

        payload = make_notify_payload(
            out_trade_no=out_trade_no,
            amount="100.00",   # matches the fixture's payable amount
            trans_id=payment.provider_reference,
            private_pem=telebirr_keypair["private_pem"],
            trade_status="Completed",
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
        self, client, telebirr_keypair,
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
class TestAppendOnly:

    def test_event_cannot_be_updated(self, user):
        payment = Payment.objects.create(
            provider=Payment.Provider.MANUAL,
            amount="10.00", payer=user, recorded_by=user,
            status=Payment.Status.PENDING,
        )
        event = PaymentEvent.objects.create(
            payment=payment, event_type="test",
        )

        event.event_type = "mutated"
        from payments.models import ImmutableRecordError
        with pytest.raises(ImmutableRecordError):
            event.save()

    def test_event_queryset_update_blocked(self, user):
        payment = Payment.objects.create(
            provider=Payment.Provider.MANUAL,
            amount="10.00", payer=user, recorded_by=user,
        )
        PaymentEvent.objects.create(payment=payment, event_type="test")

        from payments.models import ImmutableRecordError
        with pytest.raises(ImmutableRecordError):
            PaymentEvent.objects.update(event_type="mutated")

    def test_event_queryset_delete_blocked(self, user):
        payment = Payment.objects.create(
            provider=Payment.Provider.MANUAL,
            amount="10.00", payer=user, recorded_by=user,
        )
        PaymentEvent.objects.create(payment=payment, event_type="test")

        from payments.models import ImmutableRecordError
        with pytest.raises(ImmutableRecordError):
            PaymentEvent.objects.all().delete()

@pytest.mark.django_db
class TestStatusEndpoint:

    def test_returns_own_payment(self, client, user):
        client.force_login(user)
        payment = Payment.objects.create(
            provider=Payment.Provider.MANUAL,
            amount="10.00", payer=user, recorded_by=user,
            status=Payment.Status.PENDING,
        )
        resp = client.get(
            reverse("payment-status", args=[str(payment.reference)]),
        )
        assert resp.status_code == 200, resp.json()
        body = resp.json()
        assert body["status"] == "pending"
        assert body["is_terminal"] is False

    def test_cannot_see_others_payment(self, client, user, staff_user):
        other = Payment.objects.create(
            provider=Payment.Provider.MANUAL,
            amount="10.00", payer=staff_user, recorded_by=staff_user,
            status=Payment.Status.PENDING,
        )
        client.force_login(user)
        resp = client.get(
            reverse("payment-status", args=[str(other.reference)]),
        )
        assert resp.status_code == 403, resp.json()

        