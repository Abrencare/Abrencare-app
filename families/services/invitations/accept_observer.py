# backend/families/services/invitations/accept_observer.py

from django.db import transaction
from django.utils import timezone
from ..notifications import notify
from ..audit import _create_audit_log
from ..helpers import _invitation_belongs_to_user, _require_verified_invitation
from ..lookup import _get_invitation
from ...models import (
    FamilyAuditLog,
    FamilyInvitation,
    FamilyMembership,
)


def accept_invitation(*, token, user) -> FamilyMembership:
    """
    Accept an observer invitation as an existing authenticated user.

    Two phases:
      1. Lookup + optional expiry flip (its own atomic block).
      2. Accept logic (fresh atomic block).

    A raise in phase 2 cannot roll back a phase-1 EXPIRED flip, because
    phase 1's atomic block has already committed.
    """
    # -------- Phase 1: lookup + possibly mark EXPIRED --------
    invitation_pk = _resolve_invitation_pk(token)
    if invitation_pk is None:
        # The EXPIRED flip already committed inside _resolve_invitation_pk.
        raise ValueError("This invitation has expired.")

    # -------- Phase 2: accept, in a fresh transaction --------
    with transaction.atomic():
        invitation = (
            FamilyInvitation.objects
            .select_for_update()
            .select_related("family", "invited_by", "accepted_by")
            .get(pk=invitation_pk)
        )

        if invitation.invitation_type != FamilyInvitation.InvitationType.OBSERVER:
            raise ValueError("This invitation is not an observer invitation.")

        _require_verified_invitation(invitation)

        if not _invitation_belongs_to_user(invitation, user):
            raise ValueError(
                "This invitation was issued for a different contact."
            )

        if FamilyMembership.objects.filter(
            family=invitation.family, user=user, revoked_at__isnull=True,
        ).exists():
            raise ValueError("You already have access to this family.")

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
        invitation.save(
            update_fields=["status", "accepted_at", "accepted_by", "updated_at"]
        )

        _create_audit_log(
            family=invitation.family,
            actor=user,
            action=FamilyAuditLog.Action.OBSERVER_ACCEPTED,
            invitation=invitation,
            metadata={"membership_id": membership.id, "role": membership.role},
        )
        # tell the owner.
        notify.family_observer_accepted(
            family=invitation.family,
            observer=user,
        )

    return membership


def _resolve_invitation_pk(token) -> int | None:
    """
    Look up an invitation by token.

    Returns:
        - int pk if the invitation is valid and still PENDING
        - None  if it was PENDING but is now EXPIRED (flip already committed)
        - raises ValueError for invalid token or non-pending status
    """
    with transaction.atomic():
        invitation = _get_invitation(token, for_update=True)

        if invitation.status == FamilyInvitation.Status.EXPIRED:
            return None
        return invitation.pk