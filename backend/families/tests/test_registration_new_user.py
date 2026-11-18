"""
New user registration from a verified invitation.
"""
import pytest

from django.contrib.auth import get_user_model

from ..models import FamilyAuditLog, FamilyInvitation, FamilyMembership
from ..services.crypto import hash_invitation_token
from ..services.invitations import complete_invitation_registration
from .factories import make_family_user, make_invitation

User = get_user_model()


def _bind_token(inv, raw="raw-token-xyz"):
    inv.token_hash = hash_invitation_token(raw)
    inv.save(update_fields=["token_hash"])
    return raw


@pytest.mark.django_db
def test_registration_creates_user_membership_and_password_history():
    from accounts.models import PasswordHistory  # adjust import if needed
    owner, profile, _ = make_family_user()
    inv = make_invitation(
        profile, invited_by=owner, email="new@example.com",
        permissions={"can_view_reports": False},
    )
    token = _bind_token(inv)

    user, m = complete_invitation_registration(
        token=token,
        validated_data={"password": "NewPass!2345", "first_name": "New"},
    )

    assert user.email == "new@example.com"
    assert user.account_status == "active"
    assert user.check_password("NewPass!2345")

    assert m.role == FamilyMembership.Role.OBSERVER
    assert m.can_view_reports is False
    assert m.can_view_readings is True

    # No UserService created.
    assert not user.user_services.filter(service__code="family").exists()
    # No FamilyMember created (members are people under care, not accounts).
    assert profile.members.count() == 0

    assert PasswordHistory.objects.filter(user=user).exists()

    inv.refresh_from_db()
    assert inv.status == FamilyInvitation.Status.ACCEPTED
    assert FamilyAuditLog.objects.filter(
        family=profile, action=FamilyAuditLog.Action.OBSERVER_REGISTERED,
    ).count() == 1


@pytest.mark.django_db
def test_registration_rejects_existing_email():
    owner, profile, _ = make_family_user()
    inv = make_invitation(profile, invited_by=owner, email="existing@example.com")
    token = _bind_token(inv)

    User.objects.create_user(
        username="existing", email="existing@example.com", password="x",
    )

    with pytest.raises(ValueError, match="already exists"):
        complete_invitation_registration(
            token=token,
            validated_data={"password": "NewPass!2345"},
        )


@pytest.mark.django_db
def test_registration_rejects_short_password():
    owner, profile, _ = make_family_user()
    inv = make_invitation(profile, invited_by=owner, email="new@example.com")
    token = _bind_token(inv)

    with pytest.raises(Exception):  # Django's ValidationError
        complete_invitation_registration(
            token=token,
            validated_data={"password": "short"},
        )


@pytest.mark.django_db
def test_registration_rejects_when_not_verified():
    owner, profile, _ = make_family_user()
    inv = make_invitation(
        profile, invited_by=owner, email="new@example.com", verified=False,
    )
    token = _bind_token(inv)

    with pytest.raises(ValueError, match="verification"):
        complete_invitation_registration(
            token=token, validated_data={"password": "NewPass!2345"},
        )
