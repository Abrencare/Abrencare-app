from decimal import Decimal

from django.contrib.contenttypes.models import ContentType
from django.utils import timezone
from rest_framework import serializers

from .models import Payment, PaymentEvent, Refund
from .payables import resolve, spec_for

# ── Small reusable serializers ──────────────────────────────


class PaymentEventSerializer(serializers.ModelSerializer):
    actor_display = serializers.StringRelatedField(source="actor", read_only=True)

    class Meta:
        model = PaymentEvent
        fields = [
            "id", "event_type", "from_status", "to_status",
            "payload", "actor", "actor_display", "created_at",
        ]
        read_only_fields = fields


class RefundSerializer(serializers.ModelSerializer):
    requested_by_display = serializers.StringRelatedField(
        source="requested_by", read_only=True,
    )

    class Meta:
        model = Refund
        fields = [
            "id", "reference", "payment", "amount", "reason",
            "status",
            "requested_by", "requested_by_display",
            "metadata", "created_at", "updated_at", "completed_at",
        ]
        read_only_fields = fields

class RefundStaffSerializer(RefundSerializer):
    class Meta(RefundSerializer.Meta):
        fields = RefundSerializer.Meta.fields + [
            "payment", "provider_reference", "failure_reason",
            "requested_by", "metadata", "updated_at",
        ]

# ── Read serializer ─────────────────────────────────────────


class PaymentSerializer(serializers.ModelSerializer):
    """Read-only representation of a Payment."""

    refunds = RefundSerializer(many=True, read_only=True)
    events = PaymentEventSerializer(many=True, read_only=True)
    payer_display = serializers.StringRelatedField(source="payer", read_only=True)
    patient_display = serializers.StringRelatedField(
        source="patient", read_only=True,
    )
    recorded_by_display = serializers.StringRelatedField(
        source="recorded_by", read_only=True,
    )
    refundable_amount = serializers.DecimalField(
        max_digits=12, decimal_places=2, read_only=True,
    )
    is_paid = serializers.BooleanField(read_only=True)
    is_terminal = serializers.BooleanField(read_only=True)

    class Meta:
        model = Payment
        fields = [
            "id", "reference", "provider", "provider_reference",
            "idempotency_key",
            "amount", "currency", "amount_refunded", "refundable_amount",
            "payer", "payer_display",
            "patient", "patient_display",
            "recorded_by", "recorded_by_display",
            "content_type", "object_id", "description",
            "status", "failure_code", "failure_reason", "checkout_url",
            "is_paid", "is_terminal",
            "created_at", "updated_at", "paid_at", "expires_at",
            "metadata",
            "refunds", "events",
        ]
        read_only_fields = fields


class PaymentPublicSerializer(serializers.ModelSerializer):
    """User-facing representation. No provider internals, no raw errors.

    Exposes a `failure_code` the client can map to UI, but never the raw
    `failure_reason` (which may carry provider text and PII).
    """

    class Meta:
        model = Payment
        fields = [
            "reference", "provider", "amount", "currency",
            "amount_refunded", "status",
            "failure_code",       # machine-readable, safe to show
            "created_at", "paid_at", "expires_at",
            "description",
        ]
        read_only_fields = fields

# ── Write serializers ───────────────────────────────────────


class PaymentCreateSerializer(serializers.Serializer):
    """Create a payment for a registered payable.

    The client sends `payable_type` and `payable_id`. The server resolves
    the payable, derives the amount from it, and authorizes the payer.

    `amount` is deliberately NOT a field on this serializer. The amount is
    a server-side property of the payable, not a client-supplied value.
    """

    provider = serializers.ChoiceField(choices=Payment.Provider.choices)
    payable_type = serializers.CharField(max_length=64)
    payable_id = serializers.CharField(max_length=64)
    currency = serializers.CharField(max_length=3, default="ETB")
    patient = serializers.PrimaryKeyRelatedField(
        queryset=Payment._meta.get_field("patient").remote_field.model.objects.all(),
        required=False, allow_null=True,
    )
    idempotency_key = serializers.CharField(
        max_length=64, required=False, allow_blank=True, allow_null=True,
    )
    expires_at = serializers.DateTimeField(required=False, allow_null=True)
    metadata = serializers.JSONField(required=False, default=dict)

    def validate(self, attrs):
        request = self.context["request"]
        payer = request.user

        payable_type = attrs.get("payable_type")
        payable_id = attrs.get("payable_id")
        if not payable_type or not payable_id:
            raise serializers.ValidationError(
                {"payable_type": ["payable_type and payable_id are required."]}
            )

        try:
            spec = spec_for(payable_type)
            payable = resolve(payable_type, payable_id)
        except LookupError as exc:
            raise serializers.ValidationError(
                {"payable_id": [str(exc)]}
            ) from exc

        if not spec.authorize(payer, payable):
            raise serializers.ValidationError(
                {"payable_id": ["You are not authorized to pay for this."]}
            )

        amount = spec.amount_of(payable)
        if not isinstance(amount, Decimal):
            amount = Decimal(str(amount))
        if amount <= 0:
            raise serializers.ValidationError(
                {"payable_id": ["Payable has no amount due."]}
            )

        ct = ContentType.objects.get_for_model(spec.model)
        attrs["amount"] = amount
        attrs["currency"] = attrs.get("currency", "ETB")
        attrs["content_type"] = ct
        attrs["object_id"] = payable.pk
        attrs["description"] = spec.description_of(payable)
        attrs["payer"] = payer

        if attrs["provider"] == Payment.Provider.MANUAL:
            attrs["recorded_by"] = payer
            if not getattr(payer, "is_staff", False):
                raise serializers.ValidationError(
                    {"provider": ["Only staff can record manual payments."]}
                )

        return attrs
    
class RefundRequestSerializer(serializers.Serializer):
    """Input for requesting a refund against a payment."""

    amount = serializers.DecimalField(max_digits=12, decimal_places=2)
    reason = serializers.CharField(
        max_length=255, required=False, allow_blank=True, default="",
    )

    def validate_amount(self, value: Decimal) -> Decimal:
        if value <= 0:
            raise serializers.ValidationError("Refund amount must be positive.")
        return value

    def validate_amount_against_payment(self, payment: Payment) -> Decimal:
        """Call from the view after resolving `payment`."""
        available = payment.available_for_refund()
        amount = self.validated_data["amount"]
        if amount > available:
            raise serializers.ValidationError(
                {"amount": f"Only {available} {payment.currency} is available."},
            )
        return amount


class ManualPaymentSettleSerializer(serializers.Serializer):
    """Input for marking a manual payment as received."""

    provider_reference = serializers.CharField(
        max_length=128, required=False, allow_blank=True, default="",
    )
    paid_at = serializers.DateTimeField(required=False)
    metadata = serializers.JSONField(required=False, default=dict)
    