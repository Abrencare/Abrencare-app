import logging
from decimal import Decimal
from django.conf import settings
from django.db import IntegrityError, transaction
from django.utils import timezone

from ..models import (
    InvalidTransition,
    Payment,
    PaymentEvent,
    Refund,
    RefundError,
)
from .providers.telebirr_client import TelebirrClient
from functools import lru_cache
logger = logging.getLogger(__name__)


# ── Provider client interface ───────────────────────────────
#
# Your real Chapa/Telebirr/CBE clients implement this shape. A stub is
# provided so this module is runnable in tests / dev.


class ProviderError(Exception):
    """Raised when the upstream provider returns an error."""


class BaseProviderClient:
    def initiate(self, payment: Payment) -> dict:
        """Return {"checkout_url": ..., "provider_reference": ...}."""
        raise NotImplementedError

    def execute_refund(self, refund: Refund) -> dict:
        """Return {"provider_reference": ...} on success."""
        raise NotImplementedError


class StubProviderClient(BaseProviderClient):
    """Dev / test stub. Immediately succeeds everything."""

    def initiate(self, payment):
        return {
            "checkout_url": f"https://example.test/pay/{payment.reference}",
            "provider_reference": f"stub-{payment.reference}",
        }

    def execute_refund(self, refund):
        return {"provider_reference": f"stub-refund-{refund.reference}"}


_PROVIDER_CLIENTS: dict[str, BaseProviderClient] = {
    Payment.Provider.CHAPA: StubProviderClient(),
    Payment.Provider.TELEBIRR: TelebirrClient(
        merchant_app_id=settings.TELEBIRR_MERCHANT_APP_ID,
        app_secret=settings.TELEBIRR_APP_SECRET,
        private_key_pem=settings.TELEBIRR_PRIVATE_KEY,
        short_code=settings.TELEBIRR_SHORT_CODE,
        notify_url=settings.TELEBIRR_NOTIFY_URL,
        return_url=settings.TELEBIRR_RETURN_URL,
        base_url=settings.TELEBIRR_BASE_URL,
        mock=(settings.TELEBIRR_MODE != "live"),
    ),
    Payment.Provider.CBE_BIRR: StubProviderClient(),
    Payment.Provider.MANUAL: StubProviderClient(),
}

@lru_cache(maxsize=None)
def get_provider_client(provider: str) -> BaseProviderClient:
    try:
        return _PROVIDER_CLIENTS[provider]
    except KeyError as exc:
        raise ProviderError(f"No client configured for provider {provider!r}.") from exc


# ── Create ──────────────────────────────────────────────────


def create_payment(*, actor, data: dict) -> Payment:
    """Create a Payment, honouring idempotency and (for non-manual providers)
    initiating a checkout with the upstream provider.

    `data` is the validated output of PaymentCreateSerializer.
    """
    idem = data.get("idempotency_key") or None
    payer = data["payer"]

    if idem:
        existing = Payment.objects.filter(payer=payer, idempotency_key=idem).first()
        if existing:
            logger.info("Idempotent payment hit: %s", existing.reference)
            return existing

    try:
        payment = Payment.objects.create(
            provider=data["provider"],
            amount=data["amount"],
            currency=data.get("currency", "ETB"),
            payer=payer,
            patient=data.get("patient"),
            recorded_by=data.get("recorded_by"),
            content_type=data.get("content_type"),
            object_id=data.get("object_id"),
            description=data.get("description", ""),
            idempotency_key=idem,
            expires_at=data.get("expires_at"),
            metadata=data.get("metadata", {}),
            status=Payment.Status.PENDING,
        )
    except IntegrityError:
        # Concurrent request with the same idempotency key won.
        if idem:
            return Payment.objects.get(payer=payer, idempotency_key=idem)
        raise

    PaymentEvent.objects.create(
        payment=payment,
        event_type="payment.created",
        payload={"provider": payment.provider, "amount": str(payment.amount)},
        actor=actor,
    )

    if payment.provider == Payment.Provider.MANUAL:
        return payment

    # Kick off hosted checkout; failure moves the payment to FAILED.
    client = get_provider_client(payment.provider)
    try:
        result = client.initiate(payment)
    except ProviderError as exc:
        payment.transition_to(
            Payment.Status.FAILED,
            event_type="payment.provider_init_failed",
            payload={"error": str(exc)},
            actor=actor,
            failure_reason=str(exc),
            failure_code="provider_init_failed",
        )
        raise

    payment.transition_to(
        Payment.Status.PROCESSING,
        event_type="payment.checkout_created",
        payload=result.raw,
        actor=actor,
        provider_reference=result.provider_reference,
        checkout_url=result.checkout_url,
        metadata={**payment.metadata, "out_trade_no": result.out_trade_no},
    )
    return payment


# ── Manual settlement ───────────────────────────────────────


def settle_manual_payment(*, payment: Payment, actor, data: dict) -> Payment:
    """Mark a manual/cash payment as SUCCEEDED."""
    if payment.provider != Payment.Provider.MANUAL:
        raise InvalidTransition("Only manual payments can be settled this way.")
    if payment.status not in {Payment.Status.PENDING, Payment.Status.PROCESSING}:
        raise InvalidTransition(
            f"Cannot settle payment in status {payment.status}."
        )

    payment.transition_to(
        Payment.Status.SUCCEEDED,
        event_type="payment.manual_settled",
        payload={
            "provider_reference": data.get("provider_reference", ""),
            **(data.get("metadata") or {}),
        },
        actor=actor,
        provider_reference=data.get("provider_reference", ""),
        paid_at=data.get("paid_at") or timezone.now(),
    )
    return payment


# ── Refunds ─────────────────────────────────────────────────


def request_refund(*, payment: Payment, actor, amount: Decimal, reason: str = "") -> Refund:
    """Reserve the refund against the payment and dispatch it to the provider.

    The reservation (Refund row in PENDING) is created first so concurrent
    requests can't over-refund. If the provider call fails we mark it FAILED.
    """
    refund = payment.request_refund(amount, reason=reason, requested_by=actor)

    client = get_provider_client(payment.provider)
    try:
        result = client.execute_refund(refund)
    except ProviderError as exc:
        refund.mark_failed(reason=str(exc), payload={"error": str(exc)})
        raise RefundError(str(exc)) from exc

    # Providers that settle synchronously: flip immediately.
    if result.succeeded:
        refund.mark_succeeded(
            provider_reference=result.provider_reference,
            payload=result.raw,
        )
    return refund


def settle_refund_from_webhook(
    *, refund: Refund, succeeded: bool, provider_reference: str = "",
    payload: dict | None = None, reason: str = "",
) -> bool:
    """Called from webhook handlers once signature and payment are resolved."""
    if succeeded:
        return refund.mark_succeeded(
            provider_reference=provider_reference, payload=payload,
        )
    return refund.mark_failed(reason=reason, payload=payload)
