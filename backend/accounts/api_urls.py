"""Mobile-facing auth routes under /api/auth/.

Keeps legacy /auth/* mounts in accounts/urls.py for admin and older clients,
while the Expo app talks to /api/auth/* (including token/refresh).
"""

from django.urls import path
from rest_framework_simplejwt.views import TokenRefreshView

from .views import (
    CustomTokenObtainPairView,
    DeactivateAccountView,
    EnhancedChangePasswordView,
    LogoutUserView,
    RegisterUserView,
    ResetPasswordView,
    SendResetCodeView,
    ServiceEnrollView,
    UserProfileView,
    VerifyResetCodeView,
)

urlpatterns = [
    path("login/", CustomTokenObtainPairView.as_view(), name="api-login"),
    path("register/", RegisterUserView.as_view(), name="api-register"),
    path("logout/", LogoutUserView.as_view(), name="api-logout"),
    path("refresh/", TokenRefreshView.as_view(), name="api-token-refresh"),
    # Mobile client path used by session.ts
    path("token/refresh/", TokenRefreshView.as_view(), name="api-token-refresh-alias"),
    path("services/enroll/", ServiceEnrollView.as_view(), name="api-service-enroll"),
    path("profile/", UserProfileView.as_view(), name="api-profile"),
    path("password/change/", EnhancedChangePasswordView.as_view(), name="api-change-password"),
    path(
        "password/reset/request/",
        SendResetCodeView.as_view(),
        name="api-password-reset-request",
    ),
    path(
        "password/reset/verify/",
        VerifyResetCodeView.as_view(),
        name="api-password-reset-verify",
    ),
    path(
        "password/reset/confirm/",
        ResetPasswordView.as_view(),
        name="api-password-reset-confirm",
    ),
    path(
        "account/deactivate/",
        DeactivateAccountView.as_view(),
        name="api-account-deactivate",
    ),
]
