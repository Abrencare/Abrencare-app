# payments/providers/telebirr_client.py
import base64
import logging
import time
import uuid
from typing import Any

from cryptography.hazmat.primitives import hashes, serialization
from cryptography.hazmat.primitives.asymmetric import padding, rsa

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

    def initiate(self, payment: Payment) -> dict:
        if self.mock:
            return self._initiate_mock(payment)
        return self._initiate_live(payment)

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