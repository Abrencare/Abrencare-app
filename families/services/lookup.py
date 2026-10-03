# backend/families/services/lookup.py

from django.db import transaction
from django.utils import timezone

from ..models import FamilyAuditLog, FamilyInvitation
from .audit import _create_audit_log
from .crypto import hash_invitation_token


def _get_invitation(token, *, for_update: bool = False) -> FamilyInvitation:
    if not token:
        raise ValueError("Invitation token is required.")

    token_hash = hash_invitation_token(token)
    qs = FamilyInvitation.objects.select_related(
        "family", "invited_by", "accepted_by",
    )
    if for_update:
        qs = qs.select_for_update()

    invitation = qs.filter(token_hash=token_hash).first()
    if not invitation:
        raise ValueError("Invalid invitation.")

    now = timezone.now()

    if invitation.expires_at <= now:
        if invitation.status == FamilyInvitation.Status.PENDING:
            invitation.status = FamilyInvitation.Status.EXPIRED
            invitation.save(update_fields=["status", "updated_at"])
            _create_audit_log(
                family=invitation.family,
                action=FamilyAuditLog.Action.INVITATION_EXPIRED,
                invitation=invitation,
            )
        return invitation  # NO raise — caller decides

    if invitation.status != FamilyInvitation.Status.PENDING:
        raise ValueError("This invitation is no longer active.")

    return invitation

def get_invitation_by_token(token: str) -> FamilyInvitation:
    """Public, unlocked lookup (used by preflight screens)."""
    return _get_invitation(token, for_update=False)