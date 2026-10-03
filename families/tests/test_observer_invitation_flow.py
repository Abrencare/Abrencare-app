"""
The invite path: owner creates an invitation, token is hashed, invitation
is pending, previous pending invites are cancelled, audit is written.
"""
import pytest

from ..models import FamilyAuditLog, FamilyInvitation
from ..services.invitations import invite_observer
from .factories import make_family_user, make_observer


@pytest.mark.django_db
def test_owner_can_invite_observer():
    owner, profile, _ = make_family_user()
    inv, raw_token = invite_observer(
        family=profile,
        invited_by=owner,
        validated_data={
            "name": "Sibling",
            "email": "sib@example.com",
            "can_view_reports": False,
        },
    )

    assert inv.status == FamilyInvitation.Status.PENDING
    assert inv.invitation_type == FamilyInvitation.InvitationType.OBSERVER
    assert inv.token_hash != raw_token
    assert len(inv.token_hash) == 64
    assert inv.can_view_reports is False
    assert inv.can_view_readings is True  # default
    assert FamilyAuditLog.objects.filter(
        family=profile, action=FamilyAuditLog.Action.OBSERVER_INVITED,
    ).count() == 1


@pytest.mark.django_db
def test_observer_cannot_invite():
    owner, profile, _ = make_family_user()
    observer, _ = make_observer(profile, invited_by=owner)

    with pytest.raises(PermissionError):
        invite_observer(
            family=profile,
            invited_by=observer,
            validated_data={"name": "X", "email": "x@example.com"},
        )


@pytest.mark.django_db
def test_invitation_requires_email_or_phone():
    owner, profile, _ = make_family_user()
    with pytest.raises(ValueError):
        invite_observer(
            family=profile,
            invited_by=owner,
            validated_data={"name": "X"},
        )


@pytest.mark.django_db
def test_previous_pending_invite_is_cancelled():
    owner, profile, _ = make_family_user()
    inv1, _ = invite_observer(
        family=profile, invited_by=owner,
        validated_data={"name": "Sibling", "email": "sib@example.com"},
    )
    inv2, _ = invite_observer(
        family=profile, invited_by=owner,
        validated_data={"name": "Sibling again", "email": "sib@example.com"},
    )

    inv1.refresh_from_db()
    assert inv1.status == FamilyInvitation.Status.CANCELLED
    assert inv2.status == FamilyInvitation.Status.PENDING
    assert FamilyInvitation.objects.filter(
        family=profile,
        email__iexact="sib@example.com",
        status=FamilyInvitation.Status.PENDING,
    ).count() == 1


@pytest.mark.django_db
def test_owner_cannot_invite_themselves():
    owner, profile, _ = make_family_user()
    with pytest.raises(ValueError):
        invite_observer(
            family=profile,
            invited_by=owner,
            validated_data={"name": "Me", "email": owner.email},
        )


@pytest.mark.django_db
def test_raw_token_never_persisted():
    owner, profile, _ = make_family_user()
    inv, raw_token = invite_observer(
        family=profile, invited_by=owner,
        validated_data={"name": "Sibling", "email": "sib@example.com"},
    )
    # No field on the row should contain the raw token.
    for field in inv._meta.fields:
        value = getattr(inv, field.attname, None)
        if isinstance(value, str):
            assert raw_token not in value
