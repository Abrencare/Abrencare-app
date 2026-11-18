# backend/families/services/invitations/create_observer.py

from datetime import timedelta

from django.db import transaction
from django.utils import timezone

from ..audit import _create_audit_log
from ..constants import INVITATION_EXPIRY_DAYS
from ..crypto import generate_invitation_token
from ..family import is_owner
from ...models import (
    FamilyAuditLog,
    FamilyInvitation,
    FamilyMembership,
)


PERMISSION_FIELDS = (
    "can_view_readings",
    "can_view_care_plan",
    "can_view_visits",
    "can_view_reports",
    "can_view_prescriptions",
    "can_view_lab_results",
    "can_view_history",
    "can_view_attention",
    "can_view_care_team",
)


@transaction.atomic
def invite_observer(*, family, invited_by, validated_data):
    """
    Create a read-only observer invitation.

    Only the family owner may invite.
    Permissions default to True and can be overridden per-invite.
    """
    if not is_owner(invited_by, family):
        raise PermissionError("Only the family owner can invite observers.")

    email = (validated_data.get("email") or "").strip().lower()
    phone = (validated_data.get("phone_number") or "").strip()
    if not email and not phone:
        raise ValueError("Email or phone number is required.")

    # Block inviting the owner themselves.
    if email and email == (family.user_service.user.email or "").lower():
        raise ValueError("The family owner is already a member.")
    if phone and phone == (family.user_service.user.phone_number or ""):
        raise ValueError("The family owner is already a member.")

    # Cancel previous pending invites for this contact in this family.
    pending = FamilyInvitation.objects.filter(
        family=family,
        invitation_type=FamilyInvitation.InvitationType.OBSERVER,
        status=FamilyInvitation.Status.PENDING,
    )
    pending = (
        pending.filter(email__iexact=email) if email
        else pending.filter(phone_number=phone)
    )
    cancelled_count = pending.update(status=FamilyInvitation.Status.CANCELLED)

    raw_token, token_hash = generate_invitation_token()

    perms = {f: validated_data.get(f, True) for f in PERMISSION_FIELDS}

    invitation = FamilyInvitation.objects.create(
        family=family,
        invited_by=invited_by,
        invitation_type=FamilyInvitation.InvitationType.OBSERVER,
        name=validated_data["name"],
        email=email,
        phone_number=phone,
        token_hash=token_hash,
        expires_at=timezone.now() + timedelta(days=INVITATION_EXPIRY_DAYS),
        **perms,
    )

    _create_audit_log(
        family=family,
        actor=invited_by,
        action=FamilyAuditLog.Action.OBSERVER_INVITED,
        invitation=invitation,
        metadata={
            "permissions": perms,
            "cancelled_previous_invitations": cancelled_count,
        },
    )

    return invitation, raw_token