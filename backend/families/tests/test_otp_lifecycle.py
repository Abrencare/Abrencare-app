"""
OTP: resend cooldown, expiry, attempt counting, lockout, success path.
"""
from datetime import timedelta

import pytest
from django.utils import timezone

from ..models import FamilyAuditLog, FamilyInvitation, InvitationDelivery
from ..services.crypto import hash_otp
from ..services.invitations import (
    request_invitation_contact_verification,
    verify_invitation_otp,
)
from .factories import make_family_user, make_invitation


def _token_for(inv, raw="raw-token-xyz"):
    """Helper: store hash_of(raw) on the invitation, return raw."""
    from families.services.crypto import hash_invitation_token
    inv.token_hash = hash_invitation_token(raw)
    inv.save(update_fields=["token_hash"])
    return raw


@pytest.mark.django_db
def test_request_otp_creates_delivery_and_audit():
    owner, profile, _ = make_family_user()
    inv = make_invitation(profile, invited_by=owner, email="sib@example.com")
    token = _token_for(inv)

    result = request_invitation_contact_verification(token=token)

    assert result["channel"] == "email"
    assert result["destination"].endswith("@example.com")
    assert "raw" not in result["destination"]
    assert "_raw_otp" in result  # view layer pops this before responding

    inv.refresh_from_db()
    assert inv.otp_hash
    assert inv.otp_expires_at > timezone.now()
    assert InvitationDelivery.objects.filter(invitation=inv).count() == 1
    assert FamilyAuditLog.objects.filter(
        invitation=inv,
        action=FamilyAuditLog.Action.INVITATION_OTP_REQUESTED,
    ).count() == 1


@pytest.mark.django_db
def test_otp_resend_cooldown():
    owner, profile, _ = make_family_user()
    inv = make_invitation(profile, invited_by=owner, email="sib@example.com")
    token = _token_for(inv)

    request_invitation_contact_verification(token=token)
    with pytest.raises(ValueError, match="Please wait"):
        request_invitation_contact_verification(token=token)


@pytest.mark.django_db
def test_otp_expiry():
    owner, profile, _ = make_family_user()
    inv = make_invitation(profile, invited_by=owner, email="sib@example.com")
    token = _token_for(inv)

    request_invitation_contact_verification(token=token)
    inv.refresh_from_db()
    inv.otp_expires_at = timezone.now() - timedelta(seconds=1)
    inv.save(update_fields=["otp_expires_at"])

    with pytest.raises(ValueError, match="expired"):
        verify_invitation_otp(token=token, otp="000000")


@pytest.mark.django_db
def test_otp_attempts_increment_then_lockout():
    owner, profile, _ = make_family_user()
    inv = make_invitation(profile, invited_by=owner, email="sib@example.com")
    token = _token_for(inv)

    result = request_invitation_contact_verification(token=token)
    real_otp = result["_raw_otp"]

    for i in range(5):
        with pytest.raises(ValueError):
            verify_invitation_otp(token=token, otp="000000")  # wrong

    inv.refresh_from_db()
    assert inv.otp_attempts == 5
    assert inv.otp_locked_at is not None

    # Correct OTP now also fails: row is locked.
    with pytest.raises(ValueError, match="locked|Too many"):
        verify_invitation_otp(token=token, otp=real_otp)

    assert FamilyAuditLog.objects.filter(
        action=FamilyAuditLog.Action.OTP_LOCKED, invitation=inv,
    ).count() >= 1


@pytest.mark.django_db
def test_otp_success_clears_state():
    owner, profile, _ = make_family_user()
    inv = make_invitation(profile, invited_by=owner, email="sib@example.com")
    token = _token_for(inv)

    result = request_invitation_contact_verification(token=token)
    real_otp = result["_raw_otp"]

    out = verify_invitation_otp(token=token, otp=real_otp)
    assert out["verified"] is True

    inv.refresh_from_db()
    assert inv.contact_verified_at is not None
    assert inv.otp_hash == ""
    assert inv.otp_expires_at is None
    assert inv.otp_attempts == 0
    assert inv.otp_locked_at is None
    