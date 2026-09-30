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