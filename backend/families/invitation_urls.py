from django.urls import path

from .invitation_public_views import (
    InvitationAcceptView,
    InvitationOtpRequestView,
    InvitationOtpVerifyView,
    InvitationPreflightView,
    InvitationRegisterView,
)

urlpatterns = [
    path("<str:token>/preflight/", InvitationPreflightView.as_view(), name="invite-preflight"),
    path("<str:token>/otp/request/", InvitationOtpRequestView.as_view(), name="invite-otp-request"),
    path("<str:token>/otp/verify/", InvitationOtpVerifyView.as_view(), name="invite-otp-verify"),
    path("<str:token>/register/", InvitationRegisterView.as_view(), name="invite-register"),
    path("<str:token>/accept/", InvitationAcceptView.as_view(), name="invite-accept"),
]
