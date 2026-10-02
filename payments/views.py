import logging

from django.db.models import Prefetch
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import ValidationError
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import InvalidTransition, Payment, Refund, RefundError
from .permissions import CanRequestRefund, IsPayerOrStaff
from .serializers import (
    ManualPaymentSettleSerializer,
    PaymentCreateSerializer,
    PaymentPublicSerializer,
    PaymentSerializer,
    RefundRequestSerializer,
    RefundSerializer,
)
from .services import (
    ProviderError,
    create_payment,
    request_refund,
    settle_manual_payment,
)

logger = logging.getLogger(__name__)


class PaymentViewSet(viewsets.ModelViewSet):
    """CRUD-ish endpoint for payments.

    We only expose list/retrieve/create plus custom actions. Update and
    destroy are disabled because status transitions must go through the
    state machine.
    """
    permission_classes = [IsAuthenticated, IsPayerOrStaff]
    lookup_field = "reference"
    http_method_names = ["get", "post", "head", "options"]

    def get_serializer_class(self):
        if self.request.user.is_staff:
            return PaymentSerializer
        return PaymentPublicSerializer
    
    def get_queryset(self):
        user = self.request.user
        qs = (
            Payment.objects
            .select_related("payer", "patient", "recorded_by", "content_type")
            .prefetch_related(
                Prefetch("refunds", queryset=Refund.objects.order_by("-created_at")),
                "events",
            )
        )
        if user.is_staff:
            return qs
        # Non-staff see only their own payments (as payer or patient).
        return qs.filter(
            models_q(user)  # defined below
        )

    # ── Create ──────────────────────────────────────────────

    def create(self, request, *args, **kwargs):
        input_ser = PaymentCreateSerializer(
            data=request.data, context={"request": request},
        )
        input_ser.is_valid(raise_exception=True)

        try:
            payment = create_payment(actor=request.user, data=input_ser.validated_data)
        except ProviderError as exc:
            return Response(
                {"detail": str(exc)},
                status=status.HTTP_502_BAD_GATEWAY,
            )

        out = PaymentPublicSerializer(payment, context={"request": request})
        return Response(out.data, status=status.HTTP_201_CREATED)

    # ── Custom actions ──────────────────────────────────────

    @action(
        detail=True, methods=["post"],
        permission_classes=[IsAuthenticated, CanRequestRefund],
    )
    def refund(self, request, reference=None):
        payment = self.get_object()
        ser = RefundRequestSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        amount = ser.validated_data["amount"]

        try:
            refund = request_refund(
                payment=payment,
                actor=request.user,
                amount=amount,
                reason=ser.validated_data.get("reason", ""),
            )
        except (RefundError, InvalidTransition) as exc:
            return Response({"detail": str(exc)}, status=status.HTTP_400_BAD_REQUEST)

        return Response(
            RefundSerializer(refund).data,
            status=status.HTTP_201_CREATED,
        )

    @action(
        detail=True, methods=["post"],
        permission_classes=[IsAuthenticated],
    )
    def settle_manual(self, request, reference=None):
        payment = self.get_object()
        if not (request.user.is_staff or request.user == payment.recorded_by):
            return Response(
                {"detail": "Not allowed."},
                status=status.HTTP_403_FORBIDDEN,
            )

        ser = ManualPaymentSettleSerializer(data=request.data)
        ser.is_valid(raise_exception=True)

        try:
            payment = settle_manual_payment(
                payment=payment, actor=request.user, data=ser.validated_data,
            )
        except InvalidTransition as exc:
            return Response({"detail": str(exc)}, status=status.HTTP_400_BAD_REQUEST)

        return Response(PaymentSerializer(payment).data)


# Small helper to keep the queryset readable.
def models_q(user):
    from django.db.models import Q
    return Q(payer=user) | Q(patient=user)


class RefundViewSet(viewsets.ReadOnlyModelViewSet):
    """Refunds are created via Payment.refund; here we only list/retrieve."""

    serializer_class = RefundSerializer
    permission_classes = [IsAuthenticated, IsPayerOrStaff]
    lookup_field = "reference"

    def get_queryset(self):
        user = self.request.user
        qs = Refund.objects.select_related("payment", "requested_by")
        if user.is_staff:
            return qs
        from django.db.models import Q
        return qs.filter(Q(payment__payer=user) | Q(payment__patient=user))


class PaymentStatusView(APIView):
    """Lightweight polling endpoint for frontends waiting on a redirect.

    Returns only the fields needed to render a "waiting / success / failed"
    screen, and is cheap enough to poll.
    """

    permission_classes = [IsAuthenticated]

    def get(self, request, reference):
        try:
            payment = Payment.objects.get(reference=reference)
        except Payment.DoesNotExist:
            return Response({"detail": "Not found."}, status=status.HTTP_404_NOT_FOUND)

        if not (
            request.user.is_staff
            or request.user in {payment.payer, payment.patient, payment.recorded_by}
        ):
            return Response({"detail": "Not allowed."}, status=status.HTTP_403_FORBIDDEN)

        return Response({
            "reference": str(payment.reference),
            "status": payment.status,
            "is_paid": payment.is_paid,
            "is_terminal": payment.is_terminal,
            "amount": str(payment.amount),
            "amount_refunded": str(payment.amount_refunded),
            "currency": payment.currency,
            "checkout_url": payment.checkout_url,
            "paid_at": payment.paid_at,
        })
    