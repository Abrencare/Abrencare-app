"""Public / authenticated invitation acceptance endpoints.

Mounted at /api/invitations/<token>/... so the mobile app never needs the
raw token outside the request path.
"""

from django.core.exceptions import ValidationError as DjangoValidationError
from rest_framework import permissions, status
from rest_framework.response import Response
from rest_framework.throttling import ScopedRateThrottle
from rest_framework.views import APIView

from .models import FamilyInvitation, FamilyMembership
from .serializers import FamilyMembershipSerializer
from .services.contact_masking import _mask_contact
from .services.invitations import (
    accept_invitation,
    complete_invitation_registration,
    request_invitation_contact_verification,
    verify_invitation_otp,
)
from .services.lookup import get_invitation_by_token


def _http_error(exc: Exception):
    message = str(exc) or "Request failed."
    lowered = message.lower()
    if "expired" in lowered:
        return Response({"detail": message}, status=status.HTTP_410_GONE)
    if "locked" in lowered:
        return Response({"detail": message}, status=status.HTTP_423_LOCKED)
    if "cooldown" in lowered or "retry" in lowered or "too many" in lowered:
        response = Response({"detail": message}, status=status.HTTP_429_TOO_MANY_REQUESTS)
        response["Retry-After"] = "60"
        return response
    if "invalid invitation" in lowered or "not found" in lowered:
        return Response({"detail": message}, status=status.HTTP_404_NOT_FOUND)
    return Response({"detail": message}, status=status.HTTP_400_BAD_REQUEST)


def _preflight_payload(invitation: FamilyInvitation):
    channel = "email" if invitation.email else "phone"
    destination = invitation.email or invitation.phone_number or ""
    needs_registration = True
    if invitation.email:
        from django.contrib.auth import get_user_model

        User = get_user_model()
        needs_registration = not User.objects.filter(
            email__iexact=invitation.email
        ).exists()

    return {
        "invitation_id": invitation.id,
        "family_name": invitation.family.name,
        "invited_by_name": (
            invitation.invited_by.full_name
            if invitation.invited_by_id
            else ""
        ),
        "invitee_name": invitation.name,
        "contact_masked": _mask_contact(destination, channel) if destination else "",
        "status": invitation.status,
        "expires_at": invitation.expires_at.isoformat() if invitation.expires_at else None,
        "contact_verified": bool(invitation.contact_verified_at),
        "needs_registration": needs_registration,
    }


class InvitationPreflightView(APIView):
    permission_classes = [permissions.AllowAny]
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = "invitation_lookup"

    def get(self, request, token):
        try:
            invitation = get_invitation_by_token(token)
        except ValueError as exc:
            return _http_error(exc)

        if invitation.status == FamilyInvitation.Status.EXPIRED:
            return Response(
                {"detail": "This invitation has expired."},
                status=status.HTTP_410_GONE,
            )
        return Response(_preflight_payload(invitation))


class InvitationOtpRequestView(APIView):
    permission_classes = [permissions.AllowAny]
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = "invitation_otp"

    def post(self, request, token):
        try:
            payload = request_invitation_contact_verification(token=token)
        except ValueError as exc:
            return _http_error(exc)
        # Never return the raw OTP to the client.
        payload.pop("_raw_otp", None)
        return Response(payload)


class InvitationOtpVerifyView(APIView):
    permission_classes = [permissions.AllowAny]
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = "invitation_otp"

    def post(self, request, token):
        otp = request.data.get("otp", "")
        try:
            invitation = verify_invitation_otp(token=token, otp=otp)
        except ValueError as exc:
            return _http_error(exc)
        return Response(
            {
                "verified": True,
                "verified_at": (
                    invitation.contact_verified_at.isoformat()
                    if invitation.contact_verified_at
                    else None
                ),
            }
        )


class InvitationRegisterView(APIView):
    permission_classes = [permissions.AllowAny]
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = "invitation_registration"

    def post(self, request, token):
        try:
            user, membership = complete_invitation_registration(
                token=token,
                validated_data=request.data,
            )
        except (ValueError, DjangoValidationError) as exc:
            if isinstance(exc, DjangoValidationError):
                return Response(
                    {"detail": list(exc.messages) if hasattr(exc, "messages") else str(exc)},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            return _http_error(exc)

        return Response(
            {
                "user": {
                    "id": user.id,
                    "email": user.email,
                    "username": user.username,
                },
                "membership": FamilyMembershipSerializer(membership).data,
            },
            status=status.HTTP_201_CREATED,
        )


class InvitationAcceptView(APIView):
    permission_classes = [permissions.IsAuthenticated]
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = "invitation_contact"

    def post(self, request, token):
        try:
            membership = accept_invitation(token=token, user=request.user)
        except ValueError as exc:
            return _http_error(exc)
        return Response({"membership": FamilyMembershipSerializer(membership).data})
