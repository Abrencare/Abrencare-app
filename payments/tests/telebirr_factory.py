# payments/tests/telebirr_factory.py
"""
Build a Telebirr notify payload signed with the dev private key, so the
webhook verifier accepts it. Mirrors Telebirr's real canonicalization.
"""
import base64
import json
import time
import uuid
from typing import Any

from cryptography.hazmat.primitives import hashes, serialization
from cryptography.hazmat.primitives.asymmetric import padding

from django.conf import settings


def _canonical(params: dict[str, Any], exclude: str = "sign") -> str:
    items = sorted((k, str(v)) for k, v in params.items() if k != exclude)
    return "&".join(f"{k}={v}" for k, v in items)


def _sign(params: dict[str, Any]) -> str:
    key = serialization.load_pem_private_key(
        settings.TELEBIRR_PRIVATE_KEY.encode(), password=None,
    )
    message = _canonical(params).encode("utf-8")
    sig = key.sign(
        message,
        padding.PSS(mgf=padding.MGF1(hashes.SHA256()), salt_length=32),
        hashes.SHA256(),
    )
    return base64.b64encode(sig).decode("ascii")


def make_notify_payload(
    *,
    out_trade_no: str,
    amount: str,
    trans_id: str | None = None,
    trade_status: str = "Completed",
    extra: dict | None = None,
) -> dict:
    """Build a signed notify payload ready to POST to the webhook."""
    payload: dict[str, Any] = {
        "outTradeNo": out_trade_no,
        "transId": trans_id or f"MOCK-TXN-{uuid.uuid4().hex[:12]}",
        "trade_status": trade_status,
        "totalAmount": amount,
        "currency": "ETB",
        "timestamp": str(int(time.time() * 1000)),
        "nonce": uuid.uuid4().hex,
    }
    if extra:
        payload.update(extra)
    payload["sign"] = _sign(payload)
    return payload
