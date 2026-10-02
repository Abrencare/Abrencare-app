# payments/services/providers/chapa.py
import hashlib
import hmac
import logging
from decimal import Decimal

import requests
from django.conf import settings

from .base import BaseProvider, InitiateResult, RefundResult, VerifyResult

logger = logging.getLogger(__name__)

CHAPA_BASE = "https://api.chapa.co/v1"


class ChapaProvider(BaseProvider):
    name = "chapa"

    def __init__(self):
        self.secret_key = settings.CHAPA_SECRET_KEY
        self.webhook_secret = settings.CHAPA_WEBHOOK_SECRET
        self.callback_url = settings.CHAPA_CALLBACK_URL
        self.return_url = settings.CHAPA_RETURN_URL

    def _headers(self):
        return {
            "Authorization": f"Bearer {self.secret_key}",
            "Content-Type": "application/json",
        }

    def initiate(self, payment) -> InitiateResult:
        payload = {
            "amount": str(payment.amount),
            "currency": payment.currency,
            "tx_ref": str(payment.reference),
            "callback_url": self.callback_url,
            "return_url": self.return_url,
            "description": payment.description or "AbrenCare payment",
            "customer": {
                "email": payment.payer.email,
                "first_name": payment.payer.full_name.split(" ")[0] if payment.payer.full_name else "",
                "last_name":  payment.payer.full_name.split(" ")[-1] if payment.payer.full_name else "",
                "phone_number": getattr(payment.payer, "phone", ""),
            },
            "customization": {
                "title": "AbrenCare",
                "description": payment.description or "Care payment",
            },
        }
        resp = requests.post(
            f"{CHAPA_BASE}/transaction/initialize",
            json=payload, headers=self._headers(), timeout=20,
        )
        resp.raise_for_status()
        body = resp.json()
        if body.get("status") != "success":
            raise RuntimeError(f"Chapa initiate failed: {body}")

        return InitiateResult(
            provider_reference=body["data"].get("tx_ref", str(payment.reference)),
            checkout_url=body["data"]["checkout_url"],
            raw=body,
        )

    def verify(self, payment) -> VerifyResult:
        resp = requests.get(
            f"{CHAPA_BASE}/transaction/verify/{payment.reference}",
            headers=self._headers(), timeout=20,
        )
        resp.raise_for_status()
        body = resp.json()

        data = body.get("data") or {}
        succeeded = body.get("status") == "success" and data.get("status") == "success"

        return VerifyResult(
            succeeded=succeeded,
            provider_reference=data.get("tx_ref", str(payment.reference)),
            amount=Decimal(str(data["amount"])) if data.get("amount") else None,
            currency=data.get("currency"),
            raw=body,
        )

    def refund(self, refund) -> RefundResult:
        # Chapa refund support varies by account; implement when your
        # account is enabled. For now, raise so the caller knows.
        raise NotImplementedError("Chapa refunds not enabled for this account.")

    def parse_webhook(self, request) -> dict:
        # Chapa signs the body with HMAC-SHA256 using the webhook secret.
        signature = request.headers.get("Chapa-Signature", "")
        computed = hmac.new(
            self.webhook_secret.encode(),
            request.body,
            hashlib.sha256,
        ).hexdigest()

        if not hmac.compare_digest(signature, computed):
            raise ValueError("Invalid webhook signature.")

        body = request.data
        return {
            "provider_reference": body.get("tx_ref", ""),
            "status": body.get("status", ""),
            "amount": body.get("amount"),
            "currency": body.get("currency"),
            "raw": body,
        }