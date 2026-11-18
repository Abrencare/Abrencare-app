# notifications/receivers.py
"""Wire payment events into the notification system.

Kept in the notifications app so the dependency points one way:
notifications → payments. Payments never imports notifications.
"""
import logging

from django.contrib.auth import get_user_model
from django.db import transaction
from django.dispatch import receiver

from payments.models import Payment, Refund
from payments.signals import payment_status_changed, refund_failed

from .services.notification_service import NotificationService

logger = logging.getLogger(__name__)
User = get_user_model()


# ── Message templates ───────────────────────────────────────
#
# Centralised so ops can review the user-facing copy in one place.
# Anything containing PII (amounts, references) is passed via `data` on
# the Notification, not embedded in the message text, so it can be
# rendered per-locale / per-surface on the client.

_PAYMENT_SUCCESS = {
    "title": "Payment received",
    "message": "Your payment has been processed successfully.",
    "notification_type": "payment_succeeded",
}

_PAYMENT_FAILED = {
    "title": "Payment failed",
    "message": "We couldn't process your payment. Please try again.",
    "notification_type": "payment_failed",
}

_REFUND_SUCCEEDED = {
    "title": "Refund processed",
    "message": "Your refund has been issued.",
    "notification_type": "refund_succeeded",
}

_REFUND_FAILED = {
    "title": "Refund couldn't be processed",
    "message": "Your refund could not be completed. We're looking into it.",
    "notification_type": "refund_failed",
}


@receiver(refund_failed, sender=Refund)
def on_refund_failed(*, refund, reason, actor, **kwargs):
    """Notify the payer (and optionally the requester) that a refund failed."""
    # The payer needs to know the refund didn't happen.
    NotificationService.create(
        user=refund.payment.payer,
        data={
            "refund_reference": str(refund.reference),
            "payment_reference": str(refund.payment.reference),
            "amount": str(refund.amount),
            "currency": refund.payment.currency,
        },
        **_REFUND_FAILED,
    )

    # The requester (staff) needs to know it needs manual follow-up.
    if refund.requested_by and refund.requested_by != refund.payment.payer:
        NotificationService.create(
            user=refund.requested_by,
            data={
                "refund_reference": str(refund.reference),
                "reason": reason,
            },
            title="Refund needs attention",
            message=f"Refund {refund.reference} failed: {reason}",
            notification_type="refund_failed_staff",
        )

# ── Helpers ─────────────────────────────────────────────────


def _payment_notification_data(payment: Payment) -> dict:
    """Non-secret payload the client can use to render the notification.

    Deliberately excludes provider_reference, failure_reason, and any
    metadata — those go to logs / staff, not the payer.
    """
    return {
        "payment_reference": str(payment.reference),
        "amount": str(payment.amount),
        "amount_refunded": str(payment.amount_refunded),
        "currency": payment.currency,
        "status": payment.status,
        "description": payment.description,
        "paid_at": payment.paid_at.isoformat() if payment.paid_at else None,
    }


# ── Receivers ───────────────────────────────────────────────


@receiver(payment_status_changed, sender=Payment)
def on_payment_status_changed(*, payment, event, old_status, new_status,
                              actor, **kwargs):
    """Dispatch the right notification for a given transition.

    Everything here runs inside the same transaction as the transition,
    because the signal is emitted from within Payment.transition_to. The
    NotificationService itself uses transaction.on_commit for the
    WebSocket send, so nothing user-visible happens until the row commits.
    """
    if new_status == Payment.Status.SUCCEEDED:
        NotificationService.create(
            user=payment.payer,
            data=_payment_notification_data(payment),
            **_PAYMENT_SUCCESS,
        )
        return

    if new_status == Payment.Status.FAILED:
        NotificationService.create(
            user=payment.payer,
            data=_payment_notification_data(payment),
            **_PAYMENT_FAILED,
        )
        return

    if new_status == Payment.Status.REFUNDED:
        # Full refund — the payer gets the "refund processed" notification.
        NotificationService.create(
            user=payment.payer,
            data=_payment_notification_data(payment),
            **_REFUND_SUCCEEDED,
        )
        return

    if new_status == Payment.Status.PARTIALLY_REFUNDED:
        # Each partial refund is a separate event worth notifying, because
        # the user may be receiving multiple refunds.
        NotificationService.create(
            user=payment.payer,
            data={
                **_payment_notification_data(payment),
                "refund_amount": str(
                    payment.refunds.filter(
                        status="succeeded",
                    ).order_by("-completed_at").values_list(
                        "amount", flat=True,
                    ).first() or "0.00"
                ),
            },
            title="Partial refund processed",
            message="A portion of your payment has been refunded.",
            notification_type="refund_partially_succeeded",
        )
        return

    # All other transitions (created, checkout_created, cancelled) are
    # internal; no user-facing notification.
    logger.debug(
        "Payment %s: %s → %s (no notification)",
        payment.reference, old_status, new_status,
    )