"""
Telebirr webhook views.

Endpoints:
  POST /webhooks/telebirr/notify/   — server-to-server payment notification
  GET  /webhooks/telebirr/return/   — user redirect after payment completion

Both legs are verified with the same public key, but use different
trade_status vocabularies and carry different fields. The view normalizes
them into a common shape before calling the service layer.
"""
import json
import logging
from datetime import timedelta
from decimal import Decimal, InvalidOperation

from django.conf import settings
from django.core.exceptions import ImproperlyConfigured
from django.db import IntegrityError, transaction
from django.http import HttpResponse, JsonResponse
from django.utils import timezone
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_http_methods

from .models import InvalidTransition, Payment, PaymentEvent, ProviderWebhookLog
from .services.providers.telebirr import (
    TELEBIRR_NOTIFY_EXPIRED,
    TELEBIRR_NOTIFY_FAILURE,
    TELEBIRR_NOTIFY_SUCCESS,
    parse_notify_time,
    unwrap_telebirr_payload,
    verify_telebirr_signature,
)

logger = logging.getLogger(__name__)


def _alert_signature_failure(log_row: ProviderWebhookLog) -> None:
    """Record an actionable alert when a webhook signature is invalid."""
    logger.error(
        "ALERT: webhook signature failure. log_id=%s provider=%s",
        log_row.pk, log_row.provider,
    )

def _alert_terminal_conflict(payment, exc):
    logger.error(
        "ALERT: terminal-state conflict on payment %s: %s",
        payment.reference, exc,
    )

class AmountMismatch(Exception):
    """The provider's notified amount doesn't match the stored amount."""

def _get_public_key() -> str:
    """Load the Telebirr public key from settings."""
    key = getattr(settings, "TELEBIRR_PUBLIC_KEY", None)
    if not key:
        raise ImproperlyConfigured("TELEBIRR_PUBLIC_KEY is not set.")
    return key




class AmountMismatch(Exception):
    """The provider's notified amount doesn't match the stored amount."""


def _check_notified_amount(
    payment: Payment, normalized: dict,
) -> None:
    """Raise AmountMismatch if the notified amount/currency differs.

    Telebirr sends `totalAmount` as a string. Parse it as Decimal (never
    float) and compare exactly. Also check currency if present.
    """
    raw = normalized.get("total_amount") or ""
    if not raw:
        raise AmountMismatch("Webhook carried no total_amount.")

    try:
        notified = Decimal(str(raw))
    except (InvalidOperation, ValueError) as exc:
        raise AmountMismatch(f"Unparseable amount: {raw!r}") from exc

    if notified != payment.amount:
        raise AmountMismatch(
            f"Notified amount {notified} != payment amount {payment.amount}"
        )

    # Currency check is best-effort: some payloads omit it.
    notified_currency = normalized["raw"].get("currency")
    if notified_currency and notified_currency.upper() != payment.currency.upper():
        raise AmountMismatch(
            f"Notified currency {notified_currency} != "
            f"payment currency {payment.currency}"
        )

def _log_webhook(
    *,
    provider: str,
    body: dict,
    headers: dict,
    raw_body: str,
    signature_valid: bool,
    payment: Payment | None = None,
    provider_event_id: str = "",
) -> ProviderWebhookLog:
    """Persist the raw webhook exactly as received, with sensitive headers
    scrubbed. Duplicate deliveries are logged too; dedupe at processing."""
    return ProviderWebhookLog.objects.create(
        provider=provider,
        provider_event_id=provider_event_id,
        payment=payment,
        headers=ProviderWebhookLog.scrub_headers(headers),
        raw_body=raw_body,
        body=body,
        signature_valid=signature_valid,
    )


def _normalize_telebirr_event(payload: dict) -> dict:
    """Map Telebirr's vocabulary into a provider-agnostic shape.

    Returns a dict with at least:
      status: "succeeded" | "failed" | "expired" | "pending"
      out_trade_no: merchant order id (your Payment.reference or similar)
      trans_id: Telebirr transaction id
      total_amount: amount as string
      raw: the original payload
    """
    trade_status = str(payload.get("trade_status", "")).strip()

    # Notify leg uses TitleCase; return leg uses PAY_SUCCESS.
    if trade_status in (TELEBIRR_NOTIFY_SUCCESS, "PAY_SUCCESS"):
        status = "succeeded"
    elif trade_status in (TELEBIRR_NOTIFY_FAILURE, "FAIL"):
        status = "failed"
    elif trade_status in (TELEBIRR_NOTIFY_EXPIRED, "TIMEOUT"):
        status = "expired"
    else:
        status = "pending"

    return {
        "status": status,
        "out_trade_no": (
            payload.get("outTradeNo")
            or payload.get("out_trade_no")
            or payload.get("merchant_order_id", "")
        ),
        "trans_id": payload.get("transId") or payload.get("trans_id", ""),
        "total_amount": str(
            payload.get("totalAmount") or payload.get("total_amount", "")
        ),
        "trade_status_raw": trade_status,
        "raw": payload,
    }


def _find_payment(normalized: dict) -> Payment | None:
    """Resolve the Payment from the normalized event.

    Prefer provider_reference (transId) first, then the merchant outTradeNo
    (which we store as Payment.provider_reference during checkout for
    Telebirr, or as metadata.out_trade_no).
    """
    trans_id = normalized.get("trans_id")
    if trans_id:
        payment = Payment.objects.filter(
            provider=Payment.Provider.TELEBIRR,
            provider_reference=trans_id,
        ).first()
        if payment:
            return payment

    out_trade_no = normalized.get("out_trade_no")
    if out_trade_no:
        # Try provider_reference (we may store outTradeNo there).
        payment = Payment.objects.filter(
            provider=Payment.Provider.TELEBIRR,
            provider_reference=out_trade_no,
        ).first()
        if payment:
            return payment
        # Fall back to metadata lookup.
        return Payment.objects.filter(
            provider=Payment.Provider.TELEBIRR,
            metadata__out_trade_no=out_trade_no,
        ).first()

    return None


@csrf_exempt
@require_http_methods(["POST"])
def telebirr_notify(request):
    """Server-to-server payment notification from Telebirr.

    Telebirr expects a JSON response. We return 200 with a small body on
    success so it doesn't retry; non-200 triggers retries.

    This view is idempotent: duplicate deliveries for an already-settled
    payment return 200 without re-settling.
    """
    raw_body = request.body.decode("utf-8", errors="replace")
    headers = {k: v for k, v in request.headers.items()}

    # ── Parse ──────────────────────────────────────────────
    try:
        body = json.loads(raw_body) if raw_body else {}
    except json.JSONDecodeError:
        logger.warning("Telebirr notify: unparseable JSON")
        ProviderWebhookLog.objects.create(
            provider="telebirr",
            headers=ProviderWebhookLog.scrub_headers(headers),
            raw_body=raw_body,
            body={},
            signature_valid=False,
            processing_error="unparseable JSON",
        )
        return JsonResponse({"code": "1", "msg": "bad request"}, status=400)

    payload = unwrap_telebirr_payload(body)

    # ── Verify signature ──────────────────────────────────
    try:
        public_key = _get_public_key()
        signature_valid = verify_telebirr_signature(payload, public_key)
    except Exception as exc:
        logger.exception("Telebirr notify: verification error")
        signature_valid = False
        public_key = None

    # ── Log raw delivery (always, even if invalid) ────────
    normalized_for_log = _normalize_telebirr_event(payload)
    payment_for_log = _find_payment(normalized_for_log) if signature_valid else None

    log_row = _log_webhook(
        provider="telebirr",
        body=body,
        headers=headers,
        raw_body=raw_body,
        signature_valid=signature_valid,
        payment=payment_for_log,
        provider_event_id=normalized_for_log.get("trans_id", ""),
    )

    if not signature_valid:
        log_row.processing_error = "signature verification failed"
        log_row.save(update_fields=["processing_error"])
        logger.warning(
            "Telebirr notify: signature invalid for event %s",
            normalized_for_log.get("trans_id", "<no-transid>"),
        )
        # Alert: this is either a key rotation (fixable) or an attack
        # (needs eyes). Fire whatever alerting you use.
        _alert_signature_failure(log_row)

        # Return 401 so Telebirr retries a bounded number of times. The
        # retry gives us a window to rotate the key and reprocess.
        return JsonResponse(
            {"code": "1", "msg": "signature invalid"}, status=401,
        )

    # ── Resolve payment ───────────────────────────────────
    payment = payment_for_log
    if payment is None:
        log_row.processing_error = "no matching payment"
        log_row.save(update_fields=["processing_error"])
        logger.warning(
            "Telebirr notify: no payment for outTradeNo=%s transId=%s",
            normalized_for_log.get("out_trade_no"),
            normalized_for_log.get("trans_id"),
        )
        # Return 200 to stop retries; we logged it for manual reconciliation.
        return JsonResponse({"code": "0", "msg": "ok"})

    # ── Idempotency: already settled? ─────────────────────
    if payment.status in {
        Payment.Status.SUCCEEDED,
        Payment.Status.PARTIALLY_REFUNDED,
        Payment.Status.REFUNDED,
    }:
        log_row.processed = True
        log_row.processed_at = timezone.now()
        log_row.save(update_fields=["processed", "processed_at"])
        return JsonResponse({"code": "0", "msg": "already settled"})

    # ── Apply the state transition ────────────────────────
    try:
        with transaction.atomic():
            if normalized_for_log["status"] == "succeeded":
                # Guard against a mismatched amount before we move money.
                try:
                    _check_notified_amount(payment, normalized_for_log)
                except AmountMismatch as exc:
                    # Leave the payment in PROCESSING, log the conflict,
                    # return 200 so Telebirr doesn't retry — this needs
                    # a human, not another delivery.
                    log_row.processing_error = f"amount mismatch: {exc}"
                    log_row.save(update_fields=["processing_error"])
                    PaymentEvent.objects.create(
                        payment=payment,
                        event_type="payment.telebirr.notify.amount_mismatch",
                        payload={
                            "notified_amount": normalized_for_log["total_amount"],
                            "payment_amount": str(payment.amount),
                            "raw": normalized_for_log["raw"],
                        },
                    )
                    logger.error(
                        "Telebirr notify: amount mismatch on %s: %s",
                        payment.reference, exc,
                    )
                    # In production, also fire an alert (Sentry, PagerDuty).
                    return JsonResponse({"code": "0", "msg": "ok"})
                _check_notified_amount(payment, normalized_for_log)
                payment.transition_to(
                    Payment.Status.SUCCEEDED,
                    event_type="payment.telebirr.notify.success",
                    payload=normalized_for_log["raw"],
                    provider_reference=normalized_for_log.get("trans_id", ""),
                    paid_at=timezone.now(),
                )
            elif normalized_for_log["status"] == "failed":
                payment.transition_to(
                    Payment.Status.FAILED,
                    event_type="payment.telebirr.notify.failed",
                    payload=normalized_for_log["raw"],
                    failure_reason=normalized_for_log["trade_status_raw"],
                    failure_code="telebirr_" + normalized_for_log["trade_status_raw"].lower(),
                )
            elif normalized_for_log["status"] == "expired":
                payment.transition_to(
                    Payment.Status.FAILED,
                    event_type="payment.telebirr.notify.expired",
                    payload=normalized_for_log["raw"],
                    failure_reason="Telebirr payment expired",
                    failure_code="telebirr_expired",
                )
            else:
                # Pending/unknown: don't transition, just log.
                logger.info(
                    "Telebirr notify: non-terminal status %s",
                    normalized_for_log["trade_status_raw"],
                )

        log_row.processed = True
        log_row.processed_at = timezone.now()
        log_row.payment = payment
        log_row.save(update_fields=["processed", "processed_at", "payment"])

    except AmountMismatch as exc:
        # Handled inside the branch above; this is a safety net.
        log_row.processing_error = f"amount mismatch: {exc}"
        log_row.save(update_fields=["processing_error"])
        return JsonResponse({"code": "0", "msg": "ok"})

    except InvalidTransition as exc:
        # Success webhook for a terminal non-success payment. Money was
        # taken but the payment is in a state we can't accept it from.
        # This needs a human: refund the user, or investigate why the
        # payment was cancelled.
        logger.error(
            "Telebirr notify: conflict on %s: %s",
            payment.reference, exc,
        )
        PaymentEvent.objects.create(
            payment=payment,
            event_type="payment.telebirr.notify.conflict",
            from_status=payment.status,
            to_status=normalized_for_log["status"],
            payload={
                "reason": str(exc),
                "webhook_raw": normalized_for_log["raw"],
            },
        )
        log_row.processing_error = f"terminal-state conflict: {exc}"
        log_row.processed = True
        log_row.processed_at = timezone.now()
        log_row.save(update_fields=[
            "processed", "processed_at", "processing_error",
        ])
        _alert_terminal_conflict(payment, exc)
        return JsonResponse({"code": "0", "msg": "conflict logged"})

    except Exception as exc:
        logger.exception("Telebirr notify: transition failed")
        log_row.processing_error = str(exc)
        log_row.save(update_fields=["processing_error"])
        return JsonResponse(
            {"code": "1", "msg": "internal error"}, status=500,
        )

    return JsonResponse({"code": "0", "msg": "ok"})


@require_http_methods(["GET"])
def telebirr_return(request):
    """User-facing redirect after Telebirr payment.

    This leg is informational: it may arrive before or after the notify
    webhook, and carries no transaction id (so signature verification is
    simpler). We never trust it for settlement — only the notify webhook
    settles a payment.

    We log it for debugging and redirect the user to a frontend page.
    """
    params = {k: v for k, v in request.GET.items()}

    # Verify signature on the return leg (no transId present, so the
    # trans_id alias issue doesn't apply).
    try:
        public_key = _get_public_key()
        signature_valid = verify_telebirr_signature(params, public_key)
    except Exception:
        signature_valid = False

    ProviderWebhookLog.objects.create(
        provider="telebirr",
        provider_event_id="",
        headers=ProviderWebhookLog.scrub_headers(
            {k: v for k, v in request.headers.items()}
        ),
        raw_body=request.get_full_path(),
        body=params,
        signature_valid=signature_valid,
        processed=True,  # informational only
        processed_at=timezone.now(),
    )

    # Try to resolve the payment for a nicer redirect.
    normalized = _normalize_telebirr_event(params)
    payment = _find_payment(normalized)

    redirect_base = getattr(
        settings, "TELEBIRR_RETURN_REDIRECT_URL",
        "/payments/status/",
    )
    if payment:
        from django.shortcuts import redirect
        return redirect(f"{redirect_base}?reference={payment.reference}")

    from django.shortcuts import redirect
    return redirect(redirect_base)
