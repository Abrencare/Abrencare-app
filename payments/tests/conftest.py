# payments/tests/conftest.py
import base64
import uuid
from decimal import Decimal

import pytest
from cryptography.hazmat.primitives import hashes, serialization
from cryptography.hazmat.primitives.asymmetric import padding, rsa
from django.contrib.auth import get_user_model
from django.test import override_settings
from .telebirr_factory import make_notify_payload 
from payments.models import Payment

from payments.payables import PayableSpec, register


@pytest.fixture
def test_payable(db):
    """Register a payable type backed by a real model.

    Uses `payments.TestPayable` so `ContentType.get_for_model()` works.
    The registry is mutated in place and restored after the test.
    """
    from payments.models import TestPayable
    from payments.payables import _REGISTRY

    def _amount(obj):
        return obj.amount

    def _desc(obj):
        return obj.description or "Test payable"

    def _authorize(payer, obj):
        return True

    spec = PayableSpec(
        model=TestPayable,
        amount_of=_amount,
        description_of=_desc,
        authorize=_authorize,
    )

    if "test" in _REGISTRY:
        pytest.skip("test payable already registered")

    register("test", spec)
    obj = TestPayable.objects.create(amount=Decimal("100.00"),
                                     description="Test payable")

    yield {"payable_type": "test", "payable_id": str(obj.pk)}

    _REGISTRY.pop("test", None)
    TestPayable.objects.all().delete()

# ── Signing keypair ─────────────────────────────────────────


@pytest.fixture(scope="session")
def telebirr_keypair():
    """A real RSA keypair used to sign test webhooks.

    Session-scoped: generating RSA keys is slow, and the key material is
    only used to sign/verify within the test process.
    """
    private_key = rsa.generate_private_key(
        public_exponent=65537, key_size=2048,
    )
    private_pem = private_key.private_bytes(
        encoding=serialization.Encoding.PEM,
        format=serialization.PrivateFormat.PKCS8,
        encryption_algorithm=serialization.NoEncryption(),
    ).decode()
    public_pem = private_key.public_key().public_bytes(
        encoding=serialization.Encoding.PEM,
        format=serialization.PublicFormat.SubjectPublicKeyInfo,
    ).decode()
    return {"private_pem": private_pem, "public_pem": public_pem}


@pytest.fixture(autouse=True)
def _wire_telebirr_settings(telebirr_keypair):
    """Override Telebirr settings for every test in this package."""
    with override_settings(
        TELEBIRR_MODE="mock",
        TELEBIRR_MERCHANT_APP_ID="test-app",
        TELEBIRR_APP_SECRET="test-secret",
        TELEBIRR_SHORT_CODE="123456",
        TELEBIRR_BASE_URL="http://mock-telebirr.test",
        TELEBIRR_NOTIFY_URL="http://testserver/webhooks/telebirr/notify/",
        TELEBIRR_RETURN_URL="http://testserver/webhooks/telebirr/return/",
        TELEBIRR_PUBLIC_KEY=telebirr_keypair["public_pem"],
        TELEBIRR_PRIVATE_KEY=telebirr_keypair["private_pem"],
    ):
        # Providers cache clients; clear so overridden settings apply.
        from payments.services import get_provider_client
        get_provider_client.cache_clear()
        yield
        get_provider_client.cache_clear()


# ── Users ───────────────────────────────────────────────────


@pytest.fixture
def user(db):
    return get_user_model().objects.create_user(
        username="payer", password="pw", email="payer@example.com",
    )


@pytest.fixture
def staff_user(db):
    return get_user_model().objects.create_user(
        username="staff", password="pw", is_staff=True,
    )


# ── Signing helper ──────────────────────────────────────────

def make_telebirr_notify(
    *,
    out_trade_no: str,
    amount: str,
    trans_id: str,
    private_pem: str,
    trade_status: str = "Completed",
) -> dict:
    payload = {
        "outTradeNo": out_trade_no,
        "transId": trans_id,
        "trade_status": trade_status,
        "totalAmount": amount,
        "currency": "ETB",
        "timestamp": "1730000000000",
        "nonce": uuid.uuid4().hex,
    }
    payload["sign"] = make_notify_payload(payload, private_pem)
    return payload