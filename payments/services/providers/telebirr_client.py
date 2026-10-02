# payments/providers/telebirr_client.py
import base64
from decimal import Decimal
import logging
import time
import uuid
from typing import Any

from cryptography.hazmat.primitives import hashes, serialization
from cryptography.hazmat.primitives.asymmetric import padding, rsa
from .base import CheckoutResult, QueryResult, RefundResult
from ...models import Payment

logger = logging.getLogger(__name__)


class TelebirrClient:
    """Real client + a mock mode used in dev/test.

    In mock mode we don't call Telebirr; we produce a checkout URL and
    a signing capability so tests can build valid webhook payloads.
    """

    def __init__(
        self,
        *,
        merchant_app_id: str,
        app_secret: str,
        private_key_pem: str,
        short_code: str,
        notify_url: str,
        return_url: str,
        base_url: str,
        mock: bool = False,
    ):
        self.merchant_app_id = merchant_app_id
        self.app_secret = app_secret
        self.private_key_pem = private_key_pem
        self.short_code = short_code
        self.notify_url = notify_url
        self.return_url = return_url
        self.base_url = base_url
        self.mock = mock

    # ── Signing helpers (shared by real and mock paths) ────

    def _private_key(self) -> rsa.RSAPrivateKey:
        return serialization.load_pem_private_key(
            self.private_key_pem.encode(), password=None,
        )

    @staticmethod
    def _canonical(params: dict[str, Any], exclude: str = "sign") -> str:
        items = sorted(
            (k, str(v)) for k, v in params.items() if k != exclude
        )
        return "&".join(f"{k}={v}" for k, v in items)

    def sign(self, params: dict[str, Any]) -> str:
        """Sign params the same way the webhook verifier expects.

        Used both for real requests and for building test webhooks.
        """
        message = self._canonical(params).encode("utf-8")
        signature = self._private_key().sign(
            message,
            padding.PSS(
                mgf=padding.MGF1(hashes.SHA256()),
                salt_length=32,
            ),
            hashes.SHA256(),
        )
        return base64.b64encode(signature).decode("ascii")

    # ── Checkout ───────────────────────────────────────────

    def initiate(self, payment: Payment) -> CheckoutResult:
        if self.mock:
            raw = self._initiate_mock(payment)
        else:
            raw = self._initiate_live(payment)
        return CheckoutResult(
            checkout_url=raw["checkout_url"],
            out_trade_no=raw.get("out_trade_no", ""),
            provider_reference=raw["provider_reference"],
            raw=raw,
        )

    def _initiate_mock(self, payment: Payment) -> dict:
        out_trade_no = str(payment.reference)
        checkout_url = (
            f"{self.base_url}/pay?outTradeNo={out_trade_no}"
            f"&amount={payment.amount}"
        )
        return {
            "checkout_url": checkout_url,
            "provider_reference": f"MOCK-PREPAY-{uuid.uuid4().hex[:10]}",
            "out_trade_no": out_trade_no,
            "mock": True,
        }

    def _initiate_live(self, payment: Payment) -> dict:
        out_trade_no = str(payment.reference)
        params = {
            "appId": self.merchant_app_id,
            "outTradeNo": out_trade_no,
            "subject": payment.description or f"Payment {payment.reference}",
            "totalAmount": str(payment.amount),
            "shortCode": self.short_code,
            "notifyUrl": self.notify_url,
            "returnUrl": self.return_url,
            "timeoutExpress": "30",
            "timestamp": str(int(time.time() * 1000)),
            "nonce": uuid.uuid4().hex,
        }
        params["sign"] = self.sign(params)

        import requests
        resp = requests.post(
            f"{self.base_url}/payment/v1/merchant/order",
            json=params, timeout=15,
        )
        resp.raise_for_status()
        data = resp.json()
        return {
            "checkout_url": data["data"]["toPayUrl"],
            "provider_reference": data["data"]["prepayId"],
            "out_trade_no": out_trade_no,
        }


    def execute_refund(self, refund) -> RefundResult:
        """Ask Telebirr to refund `refund.payment` for `refund.amount`.

        Returns a dict the service layer uses to settle the Refund row:

            {
                "completed": bool,              # did Telebirr finish it now?
                "provider_reference": str,      # Telebirr's refund id
                ...any extra fields to log...
            }

        In mock mode we return a completed refund immediately so tests can
        exercise the full flow without a network call.
        """
        if self.mock:
            raw = self._execute_refund_mock(refund)
        else:
            raw = self._execute_refund_live(refund)
        return RefundResult(
            succeeded=raw.get("completed", False),
            provider_reference=raw.get("provider_reference", ""),
            raw=raw,
        )

    def _execute_refund_mock(self, refund) -> dict:
        return {
            "completed": True,
            "provider_reference": f"MOCK-REFUND-{uuid.uuid4().hex[:10]}",
            "mock": True,
            "amount": str(refund.amount),
            "payment_reference": str(refund.payment.reference),
        }

    def _execute_refund_live(self, refund) -> dict:
        """Real Telebirr refund call.

        Telebirr's refund endpoint accepts the original transaction id and
        the refund amount, and returns a refund transaction id. Fill in the
        signing and HTTP call to match the production spec you're given.
        """
        # NOTE: implement against Telebirr's refund API. The shape below is
        # what the service layer expects; adapt the response parsing.
        import requests

        params = {
            "appId": self.merchant_app_id,
            "outTradeNo": str(refund.payment.reference),
            "transId": refund.payment.provider_reference,
            "refundAmount": str(refund.amount),
            "refundReason": refund.reason or "refund",
            "outRefundNo": str(refund.reference),
            "timestamp": str(int(time.time() * 1000)),
            "nonce": uuid.uuid4().hex,
        }
        params["sign"] = self.sign(params)

        resp = requests.post(
            f"{self.base_url}/payment/v1/merchant/refund",
            json=params, timeout=15,
        )
        resp.raise_for_status()
        data = resp.json().get("data", {})
        return {
            "completed": data.get("refundStatus") == "SUCCESS",
            "provider_reference": data.get("refundTransId", ""),
            "raw": data,
        }

    def query(self, payment) -> QueryResult:
        """Ask Telebirr about a payment's current state.

        Called by the reconciliation job. In mock mode, returns `pending`
        so tests can drive the flow deliberately.
        """
        if self.mock:
            return QueryResult(status="pending", raw={"mock": True})

        import requests
        params = {
            "appId": self.merchant_app_id,
            "outTradeNo": str(payment.reference),
            "transId": payment.provider_reference,
            "timestamp": str(int(time.time() * 1000)),
            "nonce": uuid.uuid4().hex,
        }
        params["sign"] = self.sign(params)

        resp = requests.post(
            f"{self.base_url}/payment/v1/merchant/query",
            json=params, timeout=15,
        )
        resp.raise_for_status()
        data = resp.json().get("data", {})

        trade_status = data.get("trade_status", "")
        if trade_status in ("PAY_SUCCESS", "Completed"):
            status = "succeeded"
        elif trade_status in ("FAIL", "Failure"):
            status = "failed"
        elif trade_status in ("TIMEOUT", "Expired"):
            status = "failed"
        else:
            status = "pending"

        return QueryResult(
            status=status,
            provider_reference=data.get("transId", ""),
            amount=(
                Decimal(str(data["totalAmount"]))
                if data.get("totalAmount") else None
            ),
            currency=data.get("currency", ""),
            raw=data,
        )
    