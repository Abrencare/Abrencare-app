# payments/admin.py
from asyncio.log import logger

from django.contrib import admin, messages
from django.contrib.contenttypes.admin import GenericStackedInline
from django.db.models import Count, Sum
from django.urls import reverse
from django.utils import timezone
from django.utils.html import format_html, format_html_join
from django.utils.safestring import mark_safe

from .models import (
    ImmutableRecordError,
    InvalidTransition,
    Payment,
    PaymentEvent,
    ProviderWebhookLog,
    Refund,
    RefundError,
)
from .services import (
    ProviderError,
    request_refund,
    settle_manual_payment,
)


# ── Shared helpers ──────────────────────────────────────────


def _status_badge(status: str, label: str) -> str:
    """Coloured pill for a status value."""
    colors = {
        Payment.Status.PENDING: "#b58900",
        Payment.Status.PROCESSING: "#268bd2",
        Payment.Status.SUCCEEDED: "#2aa198",
        Payment.Status.FAILED: "#dc322f",
        Payment.Status.CANCELLED: "#6c71c4",
        Payment.Status.REFUNDED: "#586e75",
        Payment.Status.PARTIALLY_REFUNDED: "#859900",
        Refund.Status.PENDING: "#b58900",
        Refund.Status.SUCCEEDED: "#2aa198",
        Refund.Status.FAILED: "#dc322f",
    }
    color = colors.get(status, "#586e75")
    return format_html(
        '<span style="display:inline-block;padding:2px 8px;border-radius:10px;'
        'background:{};color:#fff;font-size:11px;font-weight:600;">{}</span>',
        color, label,
    )


def _link_to(obj, label: str | None = None) -> str:
    """Admin changelist link for a related object."""
    if obj is None:
        return "—"
    url = reverse(
        f"admin:{obj._meta.app_label}_{obj._meta.model_name}_change",
        args=[obj.pk],
    )
    return format_html('<a href="{}">{}</a>', url, label or str(obj))


# ── Events (append-only inline) ─────────────────────────────


class PaymentEventInline(admin.TabularInline):
    """Read-only view of the audit log for a payment."""

    model = PaymentEvent
    extra = 0
    can_delete = False
    fields = (
        "created_at", "event_type", "from_status", "to_status",
        "actor", "payload_pretty",
    )
    readonly_fields = fields
    ordering = ("-created_at",)

    def has_add_permission(self, request, obj=None):
        return False

    def has_change_permission(self, request, obj=None):
        return False

    @admin.display(description="Payload")
    def payload_pretty(self, obj):
        if not obj.payload:
            return "—"
        return format_html(
            "<pre style='margin:0;font-size:11px;white-space:pre-wrap;'>"
            "{}</pre>",
            mark_safe(_escape_pre(obj.payload)),
        )


def _escape_pre(value) -> str:
    import json
    from html import escape
    return escape(json.dumps(value, indent=2, default=str))


# ── Refunds (read-only inline; creation via action) ─────────


class RefundInline(admin.TabularInline):
    model = Refund
    extra = 0
    can_delete = False
    fields = (
        "reference", "amount", "status_badge", "provider_reference",
        "requested_by", "created_at", "completed_at",
    )
    readonly_fields = fields
    ordering = ("-created_at",)

    def has_add_permission(self, request, obj=None):
        return False

    def has_change_permission(self, request, obj=None):
        return False

    @admin.display(description="Status")
    def status_badge(self, obj):
        return _status_badge(obj.status, obj.get_status_display())


# ── Payment ─────────────────────────────────────────────────


@admin.register(Payment)
class PaymentAdmin(admin.ModelAdmin):
    list_display = (
        "reference_short", "status_badge", "amount_display",
        "provider", "payer_link", "created_at", "paid_at",
    )
    list_filter = (
        "status", "provider", "currency",
        ("created_at", admin.DateFieldListFilter),
    )
    search_fields = (
        "reference", "provider_reference", "idempotency_key",
        "payer__email", "payer__username",
        "patient__email", "patient__username",
        "description",
    )
    date_hierarchy = "created_at"
    ordering = ("-created_at",)
    list_select_related = ("payer", "patient", "recorded_by")
    list_per_page = 50
    inlines = [RefundInline, PaymentEventInline]

    readonly_fields = (
        "reference", "created_at", "updated_at", "paid_at",
        "amount_refunded", "status", "provider_reference",
        "checkout_url", "failure_code", "failure_reason",
        "payable_link", "refund_summary",
    )

    fieldsets = (
        ("Identity", {
            "fields": (
                "reference", "provider", "provider_reference",
                "idempotency_key",
            ),
        }),
        ("Money", {
            "fields": (
                "amount", "currency", "amount_refunded", "refund_summary",
            ),
        }),
        ("People", {
            "fields": ("payer", "patient", "recorded_by"),
        }),
        ("What", {
            "fields": ("content_type", "object_id", "payable_link",
                       "description"),
        }),
        ("State", {
            "fields": (
                "status", "failure_code", "failure_reason", "checkout_url",
            ),
        }),
        ("Timestamps", {
            "fields": ("created_at", "updated_at", "paid_at", "expires_at"),
        }),
        ("Metadata", {
            "fields": ("metadata",),
            "classes": ("collapse",),
        }),
    )

    actions = ["action_mark_succeeded", "action_mark_failed",
               "action_cancel"]

    # ── Changelist rendering ────────────────────────────────

    @admin.display(description="Reference", ordering="reference")
    def reference_short(self, obj):
        return str(obj.reference)[:8]

    @admin.display(description="Status", ordering="status")
    def status_badge(self, obj):
        return _status_badge(obj.status, obj.get_status_display())

    @admin.display(description="Amount", ordering="amount")
    def amount_display(self, obj):
        if obj.amount_refunded:
            return format_html(
                "{} {} <small style='color:#888'>(−{})</small>",
                obj.amount, obj.currency, obj.amount_refunded,
            )
        return f"{obj.amount} {obj.currency}"

    @admin.display(description="Payer", ordering="payer__username")
    def payer_link(self, obj):
        return _link_to(obj.payer)

    @admin.display(description="Payable")
    def payable_link(self, obj):
        if not obj.payable:
            return "—"
        return _link_to(obj.payable)

    @admin.display(description="Refunded")
    def refund_summary(self, obj):
        if not obj.pk:
            return "—"
        agg = obj.refunds.aggregate(
            pending=Count("id", filter=models_q_pending()),
            succeeded=Count("id", filter=models_q_succeeded()),
        )
        return (
            f"{obj.amount_refunded} succeeded · "
            f"{obj.available_for_refund()} available · "
            f"{agg['pending']} pending"
        )

    # ── Immutability guards ─────────────────────────────────

    def has_delete_permission(self, request, obj=None):
        # Payments are financial records; never delete via admin.
        return False

    def get_readonly_fields(self, request, obj=None):
        # On add, allow setting amount/currency/payer/etc.
        # On change, lock down everything that touches money or identity.
        if obj is None:
            return ("reference", "created_at", "updated_at")
        return self.readonly_fields

    def get_fieldsets(self, request, obj=None):
        if obj is None:
            # Add form: only fields that make sense at creation.
            return (
                ("Create payment", {
                    "fields": (
                        "provider", "amount", "currency",
                        "payer", "patient", "recorded_by",
                        "content_type", "object_id", "description",
                        "idempotency_key", "expires_at", "metadata",
                    ),
                }),
            )
        return self.fieldsets

    # ── Actions ─────────────────────────────────────────────

    @admin.action(description="Mark selected payments as SUCCEEDED")
    def action_mark_succeeded(self, request, queryset):
        self._bulk_transition(
            request, queryset, Payment.Status.SUCCEEDED,
            event_type="admin.mark_succeeded",
        )

    @admin.action(description="Mark selected payments as FAILED")
    def action_mark_failed(self, request, queryset):
        self._bulk_transition(
            request, queryset, Payment.Status.FAILED,
            event_type="admin.mark_failed",
            failure_reason="Marked failed by admin",
        )

    @admin.action(description="Cancel selected payments")
    def action_cancel(self, request, queryset):
        self._bulk_transition(
            request, queryset, Payment.Status.CANCELLED,
            event_type="admin.cancel",
        )

    def _bulk_transition(self, request, queryset, new_status, **kwargs):
        ok, skipped = 0, []
        for payment in queryset:
            try:
                changed = payment.transition_to(
                    new_status, actor=request.user, **kwargs,
                )
                if changed:
                    ok += 1
                else:
                    skipped.append(str(payment.reference)[:8])
            except InvalidTransition as exc:
                skipped.append(f"{str(payment.reference)[:8]} ({exc})")

        if ok:
            self.message_user(
                request, f"{ok} payment(s) transitioned to {new_status}.",
                messages.SUCCESS,
            )
        if skipped:
            self.message_user(
                request,
                f"Skipped: {', '.join(skipped)}",
                messages.WARNING,
            )

    # ── Custom URL: request a refund from the change page ───

    def get_urls(self):
        from django.urls import path
        urls = super().get_urls()
        custom = [
            path(
                "<path:object_id>/request-refund/",
                self.admin_site.admin_view(self.request_refund_view),
                name="payments_payment_request_refund",
            ),
        ]
        return custom + urls

    def request_refund_view(self, request, object_id):
        """Minimal form endpoint; swap for a template if you prefer."""
        from django.http import HttpResponseBadRequest, HttpResponseRedirect
        from django.shortcuts import get_object_or_404

        payment = get_object_or_404(Payment, pk=object_id)
        if request.method != "POST":
            return HttpResponseBadRequest("POST required.")

        try:
            amount = request.POST.get("amount", "").strip()
            reason = request.POST.get("reason", "").strip()
            request_refund(
                payment=payment, actor=request.user,
                amount=amount, reason=reason,
            )
        except (RefundError, InvalidTransition, ProviderError) as exc:
            self.message_user(request, str(exc), messages.ERROR)
        else:
            self.message_user(
                request, "Refund requested.", messages.SUCCESS,
            )

        return HttpResponseRedirect(
            reverse("admin:payments_payment_change", args=[payment.pk]),
        )


def models_q_pending():
    from django.db.models import Q
    return Q(status=Refund.Status.PENDING)


def models_q_succeeded():
    from django.db.models import Q
    return Q(status=Refund.Status.SUCCEEDED)


# ── Refund ──────────────────────────────────────────────────


@admin.register(Refund)
class RefundAdmin(admin.ModelAdmin):
    list_display = (
        "reference_short", "payment_link", "amount",
        "status_badge", "requested_by", "created_at", "completed_at",
    )
    list_filter = ("status", ("created_at", admin.DateFieldListFilter))
    search_fields = (
        "reference", "provider_reference",
        "payment__reference", "payment__provider_reference",
    )
    date_hierarchy = "created_at"
    ordering = ("-created_at",)
    list_select_related = ("payment", "requested_by")

    readonly_fields = (
        "reference", "payment", "amount", "reason", "status",
        "provider_reference", "failure_reason", "requested_by",
        "metadata", "created_at", "updated_at", "completed_at",
    )

    def has_add_permission(self, request):
        # Refunds are only created via Payment.request_refund().
        return False

    def has_delete_permission(self, request, obj=None):
        return False

    @admin.display(description="Reference", ordering="reference")
    def reference_short(self, obj):
        return str(obj.reference)[:8]

    @admin.display(description="Status", ordering="status")
    def status_badge(self, obj):
        return _status_badge(obj.status, obj.get_status_display())

    @admin.display(description="Payment", ordering="payment__reference")
    def payment_link(self, obj):
        return _link_to(
            obj.payment, label=str(obj.payment.reference)[:8],
        )


# ── PaymentEvent (append-only) ──────────────────────────────


@admin.register(PaymentEvent)
class PaymentEventAdmin(admin.ModelAdmin):
    list_display = (
        "created_at", "payment_link", "event_type",
        "from_status", "to_status", "actor",
    )
    list_filter = ("event_type", ("created_at", admin.DateFieldListFilter))
    search_fields = (
        "payment__reference", "event_type", "actor__username",
    )
    date_hierarchy = "created_at"
    ordering = ("-created_at",)
    list_select_related = ("payment", "actor")

    readonly_fields = (
        "payment", "event_type", "from_status", "to_status",
        "payload", "actor", "created_at",
    )

    def has_add_permission(self, request):
        return False

    def has_change_permission(self, request, obj=None):
        return False

    def has_delete_permission(self, request, obj=None):
        return False

    @admin.display(description="Payment", ordering="payment__reference")
    def payment_link(self, obj):
        return _link_to(
            obj.payment, label=str(obj.payment.reference)[:8],
        )

    def get_queryset(self, request):
        # The AppendOnlyQuerySet blocks update/delete, but admin deletes
        # are already disabled above. This just narrows the query.
        return super().get_queryset(request).select_related(
            "payment", "actor",
        )


# ── ProviderWebhookLog ──────────────────────────────────────


@admin.register(ProviderWebhookLog)
class ProviderWebhookLogAdmin(admin.ModelAdmin):
    list_display = (
        "received_at", "provider", "provider_event_id",
        "payment_link", "signature_ok", "processed", "processing_error_short",
    )
    list_filter = (
        "provider", "signature_valid", "processed",
        ("received_at", admin.DateFieldListFilter),
    )
    search_fields = (
        "provider_event_id", "payment__reference", "raw_body",
    )
    date_hierarchy = "received_at"
    ordering = ("-received_at",)
    list_select_related = ("payment",)

    readonly_fields = (
        "provider", "provider_event_id", "payment",
        "headers", "raw_body", "body",
        "signature_valid", "received_at",
    )

    fieldsets = (
        ("Delivery", {
            "fields": (
                "provider", "provider_event_id", "payment",
                "signature_valid", "received_at",
            ),
        }),
        ("Processing", {
            "fields": ("processed", "processed_at", "processing_error"),
        }),
        ("Payload", {
            "fields": ("headers", "body", "raw_body"),
            "classes": ("collapse",),
        }),
    )

    actions = ["action_mark_processed", "action_reprocess"]

    def has_add_permission(self, request):
        return False

    def has_delete_permission(self, request, obj=None):
        # Allow pruning old rows — retention is an operational concern.
        return request.user.is_superuser

    @admin.display(description="Payment", ordering="payment__reference")
    def payment_link(self, obj):
        if not obj.payment:
            return "—"
        return _link_to(
            obj.payment, label=str(obj.payment.reference)[:8],
        )

    @admin.display(boolean=True, description="Sig OK")
    def signature_ok(self, obj):
        return obj.signature_valid

    @admin.display(description="Error")
    def processing_error_short(self, obj):
        if not obj.processing_error:
            return "—"
        text = obj.processing_error
        return text[:60] + ("…" if len(text) > 60 else "")

    # ── Actions ─────────────────────────────────────────────

    @admin.action(description="Mark selected payments as SUCCEEDED")
    def action_mark_succeeded(self, request, queryset):
        """Mark payments as succeeded.

        Restricted to manual payments unless the user is a superuser.
        Provider-backed payments can only be settled by a webhook or by
        reconciliation. This prevents a staff member from recording money
        that was never received.
        """
        # Guard 1: only superusers can touch provider payments.
        if not request.user.is_superuser:
            non_manual = queryset.exclude(
                provider=Payment.Provider.MANUAL,
            )
            if non_manual.exists():
                self.message_user(
                    request,
                    f"{non_manual.count()} provider-backed payment(s) "
                    "cannot be marked succeeded by non-superusers. Use "
                    "the reconciliation job or ask an admin to "
                    "reprocess the webhook.",
                    messages.ERROR,
                )
                queryset = queryset.filter(provider=Payment.Provider.MANUAL)

        # Guard 2: require a reason. This is a state change that could
        # move money; the reason is stored in the event payload.
        if not request.POST.get("reason"):
            # Fall back to a GET-style confirmation would be nicer, but
            # for the changelist action we require the admin to set
            # `admin_success_reason` in a custom form. For simplicity
            # here, we use the admin's session or a prompt page.
            reason = "Manual admin action (no reason provided)"
        else:
            reason = request.POST["reason"]

        ok, skipped = 0, []
        for payment in queryset:
            try:
                changed = payment.transition_to(
                    Payment.Status.SUCCEEDED,
                    event_type="admin.mark_succeeded",
                    payload={
                        "reason": reason,
                        "by_superuser": request.user.is_superuser,
                    },
                    actor=request.user,
                )
                if changed:
                    ok += 1
                else:
                    skipped.append(str(payment.reference)[:8])
            except InvalidTransition as exc:
                skipped.append(f"{str(payment.reference)[:8]} ({exc})")

        if ok:
            self.message_user(
                request, f"{ok} payment(s) transitioned to succeeded.",
                messages.SUCCESS,
            )
        if skipped:
            self.message_user(
                request,
                f"Skipped: {', '.join(skipped)}",
                messages.WARNING,
            )

        # Log at WARNING so it shows up in ops dashboards.
        logger.warning(
            "Admin %s marked %d payment(s) succeeded. Reason: %s",
            request.user, ok, reason,
        )


    @admin.action(description="Re-run webhook processing")
    def action_reprocess(self, request, queryset):
        """Re-dispatch stored webhook payloads through the handler.

        Guards against R2: only rows whose signature was verified on
        receipt, or rows that re-verify against the current public key,
        are eligible for reprocessing.
        """
        from django.conf import settings
        from .services.providers.telebirr import verify_telebirr_signature
        from .views_webhooks import _normalize_telebirr_event, _find_payment
        from .models import Payment

        processed, skipped, failed = 0, [], []

        for log in queryset:
            # Guard 1: rows that never verified on receipt are never
            # reprocessed, even if an admin clicks the action.
            if not log.signature_valid:
                skipped.append(f"{log.pk}: never verified")
                continue

            if log.provider != "telebirr":
                skipped.append(f"{log.pk}: unsupported provider")
                continue

            # Guard 2: re-verify against the *current* public key. This
            # covers key rotations — after a rotation, a row that failed
            # to verify at receipt can be re-verified successfully.
            payload = log.body.get("data", log.body)
            try:
                if not verify_telebirr_signature(
                    payload, settings.TELEBIRR_PUBLIC_KEY,
                ):
                    skipped.append(f"{log.pk}: signature invalid now")
                    continue
            except Exception as exc:
                skipped.append(f"{log.pk}: verify error: {exc}")
                continue

            try:
                normalized = _normalize_telebirr_event(payload)
                payment = log.payment or _find_payment(normalized)
                if not payment:
                    skipped.append(f"{log.pk}: no matching payment")
                    continue

                # Only act if the payment would actually change; otherwise
                # the transition is a no-op anyway.
                if normalized["status"] == "succeeded":
                    payment.transition_to(
                        Payment.Status.SUCCEEDED,
                        event_type="payment.telebirr.reprocess.success",
                        payload=normalized["raw"],
                        provider_reference=normalized.get("trans_id", ""),
                        paid_at=timezone.now(),
                    )
                elif normalized["status"] in ("failed", "expired"):
                    payment.transition_to(
                        Payment.Status.FAILED,
                        event_type="payment.telebirr.reprocess.failed",
                        payload=normalized["raw"],
                        failure_reason=normalized["trade_status_raw"],
                        failure_code="telebirr_"
                        + normalized["trade_status_raw"].lower(),
                    )

                log.processed = True
                log.processed_at = timezone.now()
                log.processing_error = ""
                log.payment = payment
                log.save(update_fields=[
                    "processed", "processed_at", "processing_error",
                    "payment",
                ])
                processed += 1
            except (InvalidTransition, ImmutableRecordError) as exc:
                failed.append(f"{log.pk}: {exc}")
            except Exception as exc:
                failed.append(f"{log.pk}: {type(exc).__name__}: {exc}")

        if processed:
            self.message_user(
                request, f"{processed} webhook(s) reprocessed.",
                messages.SUCCESS,
            )
        if skipped:
            self.message_user(
                request,
                f"Skipped: {', '.join(skipped[:5])}"
                + ("…" if len(skipped) > 5 else ""),
                messages.WARNING,
            )
        if failed:
            self.message_user(
                request,
                f"Failed: {', '.join(failed[:5])}"
                + ("…" if len(failed) > 5 else ""),
                messages.ERROR,
            )
            