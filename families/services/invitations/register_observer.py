# backend/families/services/invitations/register_observer.py

import secrets

from django.contrib.auth import get_user_model
from django.contrib.auth.password_validation import validate_password
from django.db import transaction
from django.utils import timezone
from ..notifications import notify
from ..audit import _create_audit_log
from ..helpers import _require_verified_invitation
from ..lookup import _get_invitation
from ...models import (
    FamilyAuditLog,
    FamilyInvitation,
    FamilyMembership,
)

try:
    from accounts.models import PasswordHistory  # adjust to your app
except ImportError:
    PasswordHistory = None

User = get_user_model()


@transaction.atomic
def complete_invitation_registration(*, token, validated_data):
    """
    Register a brand-new observer from a verified invitation.
    Creates User + PasswordHistory + FamilyMembership atomically.
    Does NOT create a UserService, a FamilyProfile, or a FamilyMember.
    """
    invitation = _get_invitation(token, for_update=True)

    if invitation.invitation_type != FamilyInvitation.InvitationType.OBSERVER:
        raise ValueError("This invitation is not an observer invitation.")

    _require_verified_invitation(invitation)

    password = validated_data.get("password")
    if not password:
        raise ValueError("Password is required.")

    email = (invitation.email or "").strip().lower() or None
    phone = (invitation.phone_number or "").strip() or None

    if email and User.objects.filter(email__iexact=email).exists():
        raise ValueError("An account already exists for this email. Please sign in.")
    if phone and User.objects.filter(phone_number=phone).exists():
        raise ValueError("An account already exists for this phone number. Please sign in.")

    username = validated_data.get("username") or secrets.token_hex(8)
    if User.objects.filter(username=username).exists():
        raise ValueError("This username is already in use.")

    validate_password(password, user=None)

    first_name = validated_data.get("first_name") or (
        invitation.name.split(" ")[0] if invitation.name else ""
    )
    last_name = validated_data.get("last_name") or ""

    user = User(
        username=username,
        email=email,
        phone_number=phone,
        first_name=first_name,
        last_name=last_name,
        account_status="active",
    )
    user.set_password(password)
    user.save()

    if PasswordHistory is not None:
        PasswordHistory.objects.create(user=user, password=user.password)

    membership = FamilyMembership.objects.create(
        family=invitation.family,
        user=user,
        role=FamilyMembership.Role.OBSERVER,
        invited_by=invitation.invited_by,
        invited_via=invitation,
        can_write=False,
        **invitation.seed_permissions(),
    )

    now = timezone.now()
    invitation.accepted_by = user
    invitation.status = FamilyInvitation.Status.ACCEPTED
    invitation.accepted_at = now
    invitation.save(update_fields=["status", "accepted_at", "accepted_by", "updated_at"])

    _create_audit_log(
        family=invitation.family,
        actor=user,
        action=FamilyAuditLog.Action.OBSERVER_REGISTERED,
        invitation=invitation,
        metadata={"membership_id": membership.id},
    )
    notify.family_observer_registered(
        family=invitation.family,
        observer=user,
    )

    return user, membership