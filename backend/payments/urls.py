from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import PaymentStatusView, PaymentViewSet, RefundViewSet

router = DefaultRouter()
router.register(r"payments", PaymentViewSet, basename="payment")
router.register(r"refunds", RefundViewSet, basename="refund")

urlpatterns = [
    path("", include(router.urls)),
    path(
        "payments/<uuid:reference>/status/",
        PaymentStatusView.as_view(),
        name="payment-status",
    ),
]