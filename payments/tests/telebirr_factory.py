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


def _sign(params: dict[str, Any], private_pem: str) -> str:
    """Sign `params` with the given PEM-encoded RSA private key.

    Uses RSA-PSS/SHA256 with salt length 32 — the padding scheme Telebirr's
    webhook signature verifier expects.
    """
    key = serialization.load_pem_private_key(
        private_pem.encode(), password=None,
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
    private_pem: str | None = None,
    extra: dict | None = None,
) -> dict:
    """Return a signed Telebirr notify payload.

    `private_pem` is optional: if omitted, `settings.TELEBIRR_PRIVATE_KEY`
    is used. Passing it explicitly makes the helper usable outside the
    test run (e.g., from a management command or a debug script).
    """
    if private_pem is None:
        private_pem = settings.TELEBIRR_PRIVATE_KEY
    if not private_pem:
        raise RuntimeError(
            "No Telebirr private key available. Pass private_pem=... or "
            "set settings.TELEBIRR_PRIVATE_KEY."
        )

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
    payload["sign"] = _sign(payload, private_pem)
    return payload
