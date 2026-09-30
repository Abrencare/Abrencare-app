from decimal import Decimal

from django.contrib.contenttypes.models import ContentType
from django.utils import timezone
from rest_framework import serializers

from .models import Payment, PaymentEvent, Refund


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
            "status", "provider_reference", "failure_reason",
            "requested_by", "requested_by_display",
            "metadata", "created_at", "updated_at", "completed_at",
        ]
        read_only_fields = [
            "id", "reference", "payment", "status", "provider_reference",
            "failure_reason", "requested_by", "created_at", "updated_at",
            "completed_at",
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


# ── Write serializers ───────────────────────────────────────


class PaymentCreateSerializer(serializers.Serializer):
    """Input for creating a payment (either provider-hosted checkout or
    manual/cash entry)."""

    provider = serializers.ChoiceField(choices=Payment.Provider.choices)
    amount = serializers.DecimalField(max_digits=12, decimal_places=2)
    currency = serializers.CharField(max_length=3, default="ETB")
    payer = serializers.PrimaryKeyRelatedField(
        queryset=Payment._meta.get_field("payer").remote_field.model.objects.all(),
        required=False,
        help_text="Defaults to request.user.",
    )
    patient = serializers.PrimaryKeyRelatedField(
        queryset=Payment._meta.get_field("patient").remote_field.model.objects.all(),
        required=False, allow_null=True,
    )
    recorded_by = serializers.PrimaryKeyRelatedField(
        queryset=Payment._meta.get_field("recorded_by").remote_field.model.objects.all(),
        required=False, allow_null=True,
    )
    content_type = serializers.PrimaryKeyRelatedField(
        queryset=ContentType.objects.all(),
        required=False, allow_null=True,
    )
    object_id = serializers.IntegerField(required=False, allow_null=True)
    description = serializers.CharField(
        max_length=255, required=False, allow_blank=True,
    )
    idempotency_key = serializers.CharField(
        max_length=64, required=False, allow_blank=True, allow_null=True,
    )
    expires_at = serializers.DateTimeField(required=False, allow_null=True)
    metadata = serializers.JSONField(required=False, default=dict)

    # ── Validation ──────────────────────────────────────────

    def validate_amount(self, value: Decimal) -> Decimal:
        if value <= 0:
            raise serializers.ValidationError("Amount must be positive.")
        return value

    def validate(self, attrs):
        provider = attrs["provider"]
        ct = attrs.get("content_type")
        obj_id = attrs.get("object_id")

        if (ct is None) != (obj_id is None):
            raise serializers.ValidationError(
                "content_type and object_id must be provided together.",
            )

        if provider == Payment.Provider.MANUAL:
            if not attrs.get("recorded_by"):
                raise serializers.ValidationError(
                    {"recorded_by": "Required for manual/cash payments."},
                )
        else:
            if attrs.get("recorded_by"):
                raise serializers.ValidationError(
                    {"recorded_by": "Only valid for manual payments."},
                )

        # Default payer to the requester when omitted.
        request = self.context.get("request")
        if not attrs.get("payer") and request and request.user.is_authenticated:
            attrs["payer"] = request.user

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
    