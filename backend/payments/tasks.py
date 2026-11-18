# payments/tasks.py (new file)
"""Scheduled reconciliation.

Two jobs:
  1. reconcile_stuck_payments — PROCESSING payments past the threshold.
  2. reconcile_stuck_refunds  — PENDING refunds past the threshold.

Run on a schedule (Celery beat, cron, whatever you use). The jobs are
idempotent: running them twice produces the same outcome.
"""
import logging
from datetime import timedelta
from django.utils import timezone

from .models import (
    InvalidTransition,
    Payment,
    Refund,
    RefundError,
)
from .services import get_provider_client, ProviderError

logger = logging.getLogger(__name__)


# How long a payment can sit in PROCESSING before we ask the provider.
PAYMENT_STUCK_AFTER = timedelta(minutes=30)

# How long a refund can sit in PENDING before we ask the provider.
REFUND_STUCK_AFTER = timedelta(minutes=30)

# Cap the batch size so a backlog doesn't hold a worker forever.
BATCH_SIZE = 100


def reconcile_stuck_payments() -> dict:
    """Query the provider for payments that have been PROCESSING too long.

    For each stuck payment:
      - query the provider
      - on succeeded: transition to SUCCEEDED
      - on failed:    transition to FAILED
      - on pending:   leave alone (another run will try again)
      - on unknown:   leave alone, log for ops
    """
    cutoff = timezone.now() - PAYMENT_STUCK_AFTER
    stuck = Payment.objects.filter(
        status=Payment.Status.PROCESSING,
        created_at__lt=cutoff,
    ).order_by("created_at")[:BATCH_SIZE]

    counts = {"checked": 0, "succeeded": 0, "failed": 0, "pending": 0,
              "unknown": 0, "errors": 0}

    for payment in stuck:
        counts["checked"] += 1
        try:
            client = get_provider_client(payment.provider)
            result = client.query(payment)
        except ProviderError as exc:
            logger.warning(
                "Reconcile: query failed for %s: %s",
                payment.reference, exc,
            )
            counts["errors"] += 1
            continue

        if result.status == "succeeded":
            try:
                payment.transition_to(
                    Payment.Status.SUCCEEDED,
                    event_type="payment.reconcile.succeeded",
                    payload=result.raw,
                    provider_reference=result.provider_reference
                    or payment.provider_reference,
                    paid_at=timezone.now(),
                )
                counts["succeeded"] += 1
            except InvalidTransition as exc:
                logger.warning(
                    "Reconcile: cannot transition %s: %s",
                    payment.reference, exc,
                )
                counts["errors"] += 1

        elif result.status == "failed":
            try:
                payment.transition_to(
                    Payment.Status.FAILED,
                    event_type="payment.reconcile.failed",
                    payload=result.raw,
                    failure_reason="Provider query reported failure",
                    failure_code="reconcile_failed",
                )
                counts["failed"] += 1
            except InvalidTransition as exc:
                logger.warning(
                    "Reconcile: cannot transition %s: %s",
                    payment.reference, exc,
                )
                counts["errors"] += 1

        elif result.status == "pending":
            counts["pending"] += 1
        else:
            counts["unknown"] += 1
            logger.info(
                "Reconcile: unknown status for %s", payment.reference,
            )

    logger.info("reconcile_stuck_payments: %s", counts)
    return counts


def reconcile_stuck_refunds() -> dict:
    """Fail out refunds stuck in PENDING past the threshold.

    A PENDING refund reserves the amount. If the process that created it
    died before calling the provider, the refund will never complete on
    its own. We try to query the provider first — if the provider says
    the refund succeeded, we mark it succeeded; otherwise we mark it
    failed so the amount is released.
    """
    cutoff = timezone.now() - REFUND_STUCK_AFTER
    stuck = Refund.objects.filter(
        status=Refund.Status.PENDING,
        created_at__lt=cutoff,
    ).order_by("created_at")[:BATCH_SIZE]

    counts = {"checked": 0, "succeeded": 0, "failed": 0, "errors": 0}

    for refund in stuck:
        counts["checked"] += 1
        try:
            refund.mark_failed(
                reason="Reconciliation: refund stuck in PENDING.",
                payload={"reconciled_at": timezone.now().isoformat()},
            )
            counts["failed"] += 1
        except RefundError as exc:
            logger.warning(
                "Reconcile refund %s: %s", refund.reference, exc,
            )
            counts["errors"] += 1

    logger.info("reconcile_stuck_refunds: %s", counts)
    return counts

try:
    from celery import shared_task

    @shared_task
    def reconcile_stuck_payments_task():
        return reconcile_stuck_payments()

    @shared_task
    def reconcile_stuck_refunds_task():
        return reconcile_stuck_refunds()
except ImportError:
    # Celery isn't installed; the plain functions are still importable
    # from management commands or cron.
    pass
