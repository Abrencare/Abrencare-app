"""
Existing user accepts an observer invitation.
"""
from ..models import FamilyAuditLog, FamilyInvitation, FamilyMembership
import pytest

from ..services.crypto import hash_invitation_token
from ..services.invitations import accept_invitation
from .factories import (
    make_family_user,
    make_invitation,
    make_user,
)


def _bind_token(inv, raw="raw-token-xyz"):
    inv.token_hash = hash_invitation_token(raw)
    inv.save(update_fields=["token_hash"])
    return raw


@pytest.mark.django_db
def test_accept_creates_membership_with_permissions():
    owner, profile, _ = make_family_user()
    inv = make_invitation(
        profile,
        invited_by=owner,
        email="sib@example.com",
        permissions={"can_view_reports": False, "can_view_readings": True},
    )
    token = _bind_token(inv)

    # Invitee must have matching email.
    invitee = make_user(email="sib@example.com", phone="+15550001111")

    m = accept_invitation(token=token, user=invitee)

    assert m.family_id == profile.id
    assert m.user_id == invitee.id
    assert m.role == FamilyMembership.Role.OBSERVER
    assert m.can_view_reports is False
    assert m.can_view_readings is True
    assert m.can_write is False

    inv.refresh_from_db()
    assert inv.status == FamilyInvitation.Status.ACCEPTED
    assert inv.accepted_by_id == invitee.id

    assert FamilyAuditLog.objects.filter(
        family=profile,
        actor=invitee,
        action=FamilyAuditLog.Action.OBSERVER_ACCEPTED,
    ).count() == 1


@pytest.mark.django_db
def test_accept_rejects_when_contact_does_not_match():
    owner, profile, _ = make_family_user()
    inv = make_invitation(profile, invited_by=owner, email="sib@example.com")
    token = _bind_token(inv)

    stranger = make_user(email="someone-else@example.com")

    with pytest.raises(ValueError, match="different contact"):
        accept_invitation(token=token, user=stranger)


@pytest.mark.django_db
def test_accept_requires_verified_contact():
    owner, profile, _ = make_family_user()
    inv = make_invitation(
        profile, invited_by=owner, email="sib@example.com", verified=False,
    )
    token = _bind_token(inv)
    invitee = make_user(email="sib@example.com")

    with pytest.raises(ValueError, match="verification"):
        accept_invitation(token=token, user=invitee)


@pytest.mark.django_db
def test_accept_rejects_already_a_member():
    owner, profile, _ = make_family_user()
    inv = make_invitation(profile, invited_by=owner, email="sib@example.com")
    token = _bind_token(inv)

    invitee = make_user(email="sib@example.com")
    accept_invitation(token=token, user=invitee)

    # Second invitation for same contact.
    inv2 = make_invitation(
        profile, invited_by=owner, email="sib@example.com",
        token_hash=hash_invitation_token("other"),
    )
    with pytest.raises(ValueError, match="already"):
        accept_invitation(token="other", user=invitee)


@pytest.mark.django_db
def test_accept_rejects_expired_invitation():
    from datetime import timedelta
    from django.utils import timezone
    owner, profile, _ = make_family_user()
    inv = make_invitation(profile, invited_by=owner, email="sib@example.com")
    inv.expires_at = timezone.now() - timedelta(seconds=1)
    inv.save(update_fields=["expires_at"])
    token = _bind_token(inv)

    invitee = make_user(email="sib@example.com")
    with pytest.raises(ValueError, match="expired"):
        accept_invitation(token=token, user=invitee)

    inv.refresh_from_db()
    assert inv.status == FamilyInvitation.Status.EXPIRED
    assert FamilyAuditLog.objects.filter(
        family=profile, action=FamilyAuditLog.Action.INVITATION_EXPIRED,
    ).count() == 1


@pytest.mark.django_db
def test_accept_rejects_cancelled():
    owner, profile, _ = make_family_user()
    inv = make_invitation(
        profile, invited_by=owner, email="sib@example.com",
        status=FamilyInvitation.Status.CANCELLED,
    )
    token = _bind_token(inv)
    invitee = make_user(email="sib@example.com")

    with pytest.raises(ValueError, match="no longer active"):
        accept_invitation(token=token, user=invitee)