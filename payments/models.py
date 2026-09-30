# payments/models.py
#
# Requires Django 5.1+ (CheckConstraint / UniqueConstraint use `condition=`).
import uuid
from decimal import Decimal

from django.conf import settings
from django.contrib.contenttypes.fields import GenericForeignKey
from django.contrib.contenttypes.models import ContentType
from django.db import models, transaction
from django.db.models import Sum
from django.utils import timezone


# ── Exceptions ──────────────────────────────────────────────


class InvalidTransition(Exception):
    """Raised when a payment is asked to make a disallowed status change."""


class RefundError(Exception):
    """Raised when a refund cannot be requested or completed."""


class ImmutableRecordError(Exception):
    """Raised when code tries to update or delete an append-only row."""


class AppendOnlyQuerySet(models.QuerySet):
    """Blocks bulk update/delete. Inserts (create / bulk_create) still work."""

    def update(self, **kwargs):
        raise ImmutableRecordError("Append-only rows cannot be updated.")

    def delete(self):
        raise ImmutableRecordError("Append-only rows cannot be deleted.")

    def bulk_update(self, objs, fields, batch_size=None):
        raise ImmutableRecordError("Append-only rows cannot be updated.")


# ── Payment ─────────────────────────────────────────────────


class Payment(models.Model):

    class Status(models.TextChoices):
        PENDING = "pending", "Pending"
        PROCESSING = "processing", "Processing"
        SUCCEEDED = "succeeded", "Succeeded"
        FAILED = "failed", "Failed"
        CANCELLED = "cancelled", "Cancelled"
        REFUNDED = "refunded", "Refunded"
        PARTIALLY_REFUNDED = "partially_refunded", "Partially Refunded"

    class Provider(models.TextChoices):
        CHAPA = "chapa", "Chapa"
        TELEBIRR = "telebirr", "Telebirr"
        CBE_BIRR = "cbe_birr", "CBE Birr"
        MANUAL = "manual", "Manual / Cash"

    # Single source of truth for the state machine.
    # PARTIALLY_REFUNDED -> PARTIALLY_REFUNDED is allowed so that each
    # additional partial refund is logged as a transition.
    ALLOWED_TRANSITIONS = {
        Status.PENDING: frozenset({
            Status.PROCESSING, Status.SUCCEEDED,
            Status.FAILED, Status.CANCELLED,
        }),
        Status.PROCESSING: frozenset({
            Status.SUCCEEDED, Status.FAILED, Status.CANCELLED,
        }),
        Status.SUCCEEDED: frozenset({
            Status.PARTIALLY_REFUNDED, Status.REFUNDED,
        }),
        Status.PARTIALLY_REFUNDED: frozenset({
            Status.PARTIALLY_REFUNDED, Status.REFUNDED,
        }),
        Status.FAILED: frozenset(),
        Status.CANCELLED: frozenset(),
        Status.REFUNDED: frozenset(),
    }

    # Fields transition_to() may set alongside the status change.
    _TRANSITION_FIELDS = frozenset({
        "provider_reference", "checkout_url", "failure_reason",
        "failure_code", "paid_at", "amount_refunded", "metadata",
    })

    # ── Identity ────────────────────────────────────────────
    reference = models.UUIDField(
        default=uuid.uuid4, unique=True, editable=False,
    )
    provider = models.CharField(max_length=20, choices=Provider.choices)
    provider_reference = models.CharField(
        max_length=128, blank=True, default="",
        help_text="The provider's own transaction id / tx_ref.",
    )
    idempotency_key = models.CharField(
        max_length=64, null=True, blank=True,
        help_text="Client-supplied key so a retried checkout request "
                  "returns the existing payment instead of a new one.",
    )

    # ── Money ───────────────────────────────────────────────
    amount = models.DecimalField(max_digits=12, decimal_places=2)
    currency = models.CharField(max_length=3, default="ETB")
    amount_refunded = models.DecimalField(
        max_digits=12, decimal_places=2, default=Decimal("0.00"),
        help_text="Sum of SUCCEEDED refunds. Only change via "
                  "Refund.mark_succeeded().",
    )

    # ── Who ─────────────────────────────────────────────────
    payer = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name="payments_made",
    )
    patient = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name="payments_for",
        null=True, blank=True,
        help_text="Person receiving the care, if different from the payer.",
    )
    recorded_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name="payments_recorded",
        null=True, blank=True,
        help_text="Staff member who received the money. "
                  "Required for manual / cash payments.",
    )

    # ── What ────────────────────────────────────────────────
    content_type = models.ForeignKey(
        ContentType, on_delete=models.PROTECT, null=True, blank=True,
    )
    object_id = models.PositiveBigIntegerField(null=True, blank=True)
    payable = GenericForeignKey("content_type", "object_id")

    # Denormalised for reporting / receipts even if the payable is deleted.
    description = models.CharField(max_length=255, blank=True, default="")

    # ── State ───────────────────────────────────────────────
    status = models.CharField(
        max_length=20, choices=Status.choices, default=Status.PENDING,
    )
    failure_code = models.CharField(
        max_length=64, blank=True, default="",
        help_text="Provider's machine-readable failure code, for reporting.",
    )
    failure_reason = models.TextField(blank=True, default="")
    checkout_url = models.URLField(max_length=500, blank=True, default="")

    # ── Timestamps ──────────────────────────────────────────
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    paid_at = models.DateTimeField(null=True, blank=True)
    expires_at = models.DateTimeField(null=True, blank=True)

    # ── Extras ──────────────────────────────────────────────
    metadata = models.JSONField(
        default=dict, blank=True,
        help_text="Whitelisted, non-secret extras only. Raw provider "
                  "responses belong in PaymentEvent.payload or "
                  "ProviderWebhookLog.",
    )

    class Meta:
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["status", "created_at"]),
            models.Index(fields=["payer", "status"]),
            models.Index(fields=["content_type", "object_id"]),
        ]
        constraints = [
            models.CheckConstraint(
                condition=models.Q(amount__gt=0),
                name="payment_amount_positive",
            ),
            models.CheckConstraint(
                condition=(
                    models.Q(amount_refunded__gte=0)
                    & models.Q(amount_refunded__lte=models.F("amount"))
                ),
                name="payment_refunded_within_amount",
            ),
            models.UniqueConstraint(
                fields=["provider", "provider_reference"],
                condition=~models.Q(provider_reference=""),
                name="uniq_payment_provider_reference",
            ),
            models.UniqueConstraint(
                fields=["payer", "idempotency_key"],
                condition=models.Q(idempotency_key__isnull=False),
                name="uniq_payment_idempotency_key",
            ),
            models.CheckConstraint(
                condition=(
                    models.Q(content_type__isnull=True, object_id__isnull=True)
                    | models.Q(content_type__isnull=False,
                               object_id__isnull=False)
                ),
                name="payment_payable_both_or_neither",
            ),
            models.CheckConstraint(
                condition=(
                    ~models.Q(provider="manual")
                    | models.Q(recorded_by__isnull=False)
                ),
                name="payment_manual_requires_recorded_by",
            ),
        ]

    def __str__(self):
        return (
            f"{self.reference} · {self.amount} {self.currency} · {self.status}"
        )

    # ── Convenience ─────────────────────────────────────────

    @property
    def is_terminal(self) -> bool:
        """No further status changes are possible."""
        return not self.ALLOWED_TRANSITIONS[self.status]

    @property
    def is_paid(self) -> bool:
        """Money was collected (even if since refunded in whole or part)."""
        return self.status in {
            self.Status.SUCCEEDED,
            self.Status.PARTIALLY_REFUNDED,
            self.Status.REFUNDED,
        }

    @property
    def refundable_amount(self) -> Decimal:
        """Amount not yet refunded. Ignores in-flight (pending) refunds;
        use available_for_refund() before creating a new refund."""
        return self.amount - self.amount_refunded

    def available_for_refund(self) -> Decimal:
        """Refundable amount minus refunds that are still pending."""
        pending = self.refunds.filter(
            status=Refund.Status.PENDING,
        ).aggregate(total=Sum("amount"))["total"] or Decimal("0.00")
        return self.amount - self.amount_refunded - pending

    # ── State machine ───────────────────────────────────────

    def transition_to(
        self, new_status, *, event_type=None, payload=None, actor=None,
        **updates,
    ) -> bool:
        """Move to `new_status` atomically and write a PaymentEvent.

        Locks the row, reloads it (so unsaved changes on this instance are
        discarded), validates the move, applies `updates` (limited to
        _TRANSITION_FIELDS), then logs the event.

        Returns True if the status changed, False if the payment was already
        in `new_status` (safe for duplicate webhooks). Raises
        InvalidTransition for any disallowed move.
        """
        unknown = set(updates) - self._TRANSITION_FIELDS
        if unknown:
            raise ValueError(f"Fields not allowed in transition: {unknown}")

        with transaction.atomic():
            type(self).objects.select_for_update().get(pk=self.pk)
            self.refresh_from_db()

            old_status = self.status
            allowed = self.ALLOWED_TRANSITIONS[old_status]

            if new_status == old_status and new_status not in allowed:
                return False
            if new_status not in allowed:
                raise InvalidTransition(
                    f"Payment {self.reference}: {old_status} -> {new_status} "
                    "is not allowed."
                )

            self.status = new_status
            for name, value in updates.items():
                setattr(self, name, value)
            if (
                new_status == self.Status.SUCCEEDED
                and self.paid_at is None
            ):
                self.paid_at = timezone.now()

            self.save(update_fields={
                *updates, "status", "paid_at", "updated_at",
            })
            PaymentEvent.objects.create(
                payment=self,
                event_type=event_type or f"status.{new_status}",
                from_status=old_status,
                to_status=new_status,
                payload=payload or {},
                actor=actor,
            )
        return True

    def request_refund(
        self, amount, *, reason="", requested_by=None,
    ) -> "Refund":
        """Create a PENDING refund without over-refunding, even under
        concurrent requests. The caller then asks the provider to execute
        it and calls Refund.mark_succeeded() / mark_failed()."""
        amount = Decimal(amount)
        if amount <= 0:
            raise RefundError("Refund amount must be positive.")

        with transaction.atomic():
            type(self).objects.select_for_update().get(pk=self.pk)
            self.refresh_from_db()

            if self.status not in {
                self.Status.SUCCEEDED, self.Status.PARTIALLY_REFUNDED,
            }:
                raise RefundError(
                    f"Cannot refund a payment that is {self.status}."
                )
            available = self.available_for_refund()
            if amount > available:
                raise RefundError(
                    f"Requested {amount}, but only {available} is available."
                )

            refund = Refund.objects.create(
                payment=self, amount=amount, reason=reason,
                requested_by=requested_by,
            )
            PaymentEvent.objects.create(
                payment=self,
                event_type="refund.requested",
                payload={"refund": str(refund.reference),
                         "amount": str(amount)},
                actor=requested_by,
            )
        return refund


# ── Audit log ───────────────────────────────────────────────


class PaymentEvent(models.Model):
    """Append-only audit log. Rows can be inserted, never changed or removed.

    Enforced in Python here (model + queryset). For a hard guarantee also
    install the Postgres trigger described in the accompanying document.
    """

    payment = models.ForeignKey(
        Payment, on_delete=models.PROTECT, related_name="events",
    )
    event_type = models.CharField(max_length=60)
    from_status = models.CharField(max_length=20, blank=True, default="")
    to_status = models.CharField(max_length=20, blank=True, default="")
    payload = models.JSONField(default=dict, blank=True)
    actor = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT, null=True, blank=True,
        related_name="+",
        help_text="User who caused the event; null for system / webhooks.",
    )
    created_at = models.DateTimeField(auto_now_add=True)

    objects = AppendOnlyQuerySet.as_manager()

    class Meta:
        ordering = ["created_at", "id"]

    def __str__(self):
        return (
            f"{self.payment_id} · {self.event_type} · "
            f"{self.created_at:%Y-%m-%d %H:%M}"
        )

    def save(self, *args, **kwargs):
        if not self._state.adding:
            raise ImmutableRecordError("PaymentEvent rows are append-only.")
        super().save(*args, **kwargs)

    def delete(self, *args, **kwargs):
        raise ImmutableRecordError("PaymentEvent rows are append-only.")


# ── Refund ──────────────────────────────────────────────────


class Refund(models.Model):

    class Status(models.TextChoices):
        PENDING = "pending", "Pending"
        SUCCEEDED = "succeeded", "Succeeded"
        FAILED = "failed", "Failed"

    reference = models.UUIDField(
        default=uuid.uuid4, unique=True, editable=False,
    )
    payment = models.ForeignKey(
        Payment, on_delete=models.PROTECT, related_name="refunds",
    )
    amount = models.DecimalField(max_digits=12, decimal_places=2)
    reason = models.CharField(max_length=255, blank=True, default="")
    status = models.CharField(
        max_length=20, choices=Status.choices, default=Status.PENDING,
    )
    provider_reference = models.CharField(
        max_length=128, blank=True, default="",
    )
    failure_reason = models.TextField(blank=True, default="")
    requested_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT, null=True, blank=True,
        related_name="refunds_requested",
    )
    metadata = models.JSONField(default=dict, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    completed_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["payment", "status"]),
        ]
        constraints = [
            models.CheckConstraint(
                condition=models.Q(amount__gt=0),
                name="refund_amount_positive",
            ),
            models.UniqueConstraint(
                fields=["payment", "provider_reference"],
                condition=~models.Q(provider_reference=""),
                name="uniq_refund_provider_reference",
            ),
        ]

    def __str__(self):
        return f"{self.reference} · {self.amount} · {self.status}"

    def mark_succeeded(self, *, provider_reference="", payload=None) -> bool:
        """Complete the refund and update the payment in one transaction.

        Returns False if it was already succeeded (duplicate webhook).
        """
        with transaction.atomic():
            payment = Payment.objects.select_for_update().get(
                pk=self.payment_id,
            )
            self.refresh_from_db()

            if self.status == self.Status.SUCCEEDED:
                return False
            if self.status != self.Status.PENDING:
                raise RefundError(f"Refund is already {self.status}.")

            new_total = payment.amount_refunded + self.amount
            if new_total > payment.amount:
                raise RefundError("Refund would exceed the payment amount.")

            self.status = self.Status.SUCCEEDED
            self.completed_at = timezone.now()
            if provider_reference:
                self.provider_reference = provider_reference
            self.save(update_fields={
                "status", "completed_at", "provider_reference", "updated_at",
            })

            payment.transition_to(
                (
                    Payment.Status.REFUNDED
                    if new_total == payment.amount
                    else Payment.Status.PARTIALLY_REFUNDED
                ),
                event_type="refund.succeeded",
                payload={"refund": str(self.reference),
                         "amount": str(self.amount), **(payload or {})},
                actor=self.requested_by,
                amount_refunded=new_total,
            )
        return True

    def mark_failed(self, *, reason="", payload=None) -> bool:
        """Fail a pending refund, releasing its reserved amount."""
        with transaction.atomic():
            type(self).objects.select_for_update().get(pk=self.pk)
            self.refresh_from_db()

            if self.status == self.Status.FAILED:
                return False
            if self.status != self.Status.PENDING:
                raise RefundError(f"Refund is already {self.status}.")

            self.status = self.Status.FAILED
            self.failure_reason = reason
            self.completed_at = timezone.now()
            self.save(update_fields={
                "status", "failure_reason", "completed_at", "updated_at",
            })
            PaymentEvent.objects.create(
                payment=self.payment,
                event_type="refund.failed",
                payload={"refund": str(self.reference), "reason": reason,
                         **(payload or {})},
            )
        return True


# ── Webhooks ────────────────────────────────────────────────


class ProviderWebhookLog(models.Model):
    """Every webhook delivery, exactly as received. Essential for debugging
    provider disputes. Duplicate deliveries are logged too (dedupe by
    provider_event_id when *processing*, not when logging).

    Retention: bodies contain phone numbers and possibly health context.
    Decide a retention window and purge old rows on a schedule.
    """

    # Header names (lowercase) whose values must never be stored.
    # Signature headers are kept on purpose: they are HMACs of the body and
    # are what you need when a provider disputes validity.
    SENSITIVE_HEADER_MARKERS = (
        "authorization", "cookie", "api-key", "apikey", "secret", "token",
    )

    provider = models.CharField(max_length=20)
    provider_event_id = models.CharField(
        max_length=128, blank=True, default="",
    )
    payment = models.ForeignKey(
        Payment, on_delete=models.SET_NULL, null=True, blank=True,
        related_name="webhook_logs",
    )
    headers = models.JSONField(default=dict, blank=True)
    raw_body = models.TextField(
        blank=True, default="",
        help_text="Exact bytes received (decoded). Signatures are computed "
                  "over this, and it survives unparseable payloads.",
    )
    body = models.JSONField(default=dict, blank=True)
    signature_valid = models.BooleanField(default=False)
    processed = models.BooleanField(default=False)
    processed_at = models.DateTimeField(null=True, blank=True)
    processing_error = models.TextField(blank=True, default="")
    received_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-received_at"]
        indexes = [
            models.Index(fields=["processed", "received_at"]),
            models.Index(fields=["provider", "provider_event_id"]),
        ]

    def __str__(self):
        return f"{self.provider} · {self.received_at:%Y-%m-%d %H:%M:%S}"

    @classmethod
    def scrub_headers(cls, headers) -> dict:
        """Return a copy of `headers` with sensitive values redacted."""
        cleaned = {}
        for name, value in dict(headers).items():
            lowered = str(name).lower()
            if any(m in lowered for m in cls.SENSITIVE_HEADER_MARKERS):
                cleaned[name] = "[redacted]"
            else:
                cleaned[name] = value
        return cleaned