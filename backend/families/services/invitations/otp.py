# backend/families/services/invitations/otp.py

import hmac
from datetime import timedelta

from django.db import transaction
from django.utils import timezone

from ..audit import _create_audit_log
from ..constants import (
    OTP_EXPIRY_MINUTES,
    OTP_MAX_ATTEMPTS,
    OTP_RESEND_COOLDOWN_SECONDS,
)
from ..contact_masking import _mask_contact
from ..crypto import generate_otp, hash_otp
from ..lookup import _get_invitation
from ...models import FamilyAuditLog, FamilyInvitation, InvitationDelivery


# ============================================================
# REQUEST OTP — unchanged, its atomic is fine because no failure path
# writes-then-raises.
# ============================================================

@transaction.atomic
def request_invitation_contact_verification(*, token):
    invitation = _get_invitation(token, for_update=True)
    if invitation.status != FamilyInvitation.Status.PENDING:
        raise ValueError("This invitation is no longer active.")

    now = timezone.now()

    if invitation.otp_sent_at:
        elapsed = (now - invitation.otp_sent_at).total_seconds()
        if elapsed < OTP_RESEND_COOLDOWN_SECONDS:
            remaining = max(int(OTP_RESEND_COOLDOWN_SECONDS - elapsed), 1)
            raise ValueError(
                f"Please wait {remaining} seconds before requesting another code."
            )

    if invitation.email:
        channel = InvitationDelivery.Channel.EMAIL
        destination = invitation.email
    elif invitation.phone_number:
        channel = InvitationDelivery.Channel.SMS
        destination = invitation.phone_number
    else:
        raise ValueError("This invitation has no contact information.")

    otp = generate_otp()
    invitation.otp_hash = hash_otp(otp)
    invitation.otp_expires_at = now + timedelta(minutes=OTP_EXPIRY_MINUTES)
    invitation.otp_sent_at = now
    invitation.otp_attempts = 0
    invitation.otp_locked_at = None
    invitation.save(update_fields=[
        "otp_hash", "otp_expires_at", "otp_sent_at",
        "otp_attempts", "otp_locked_at", "updated_at",
    ])

    delivery = InvitationDelivery.objects.create(
        invitation=invitation,
        channel=channel,
        destination=destination,
        status=InvitationDelivery.Status.PENDING,
    )

    _create_audit_log(
        family=invitation.family,
        action=FamilyAuditLog.Action.INVITATION_OTP_REQUESTED,
        invitation=invitation,
        metadata={"channel": channel, "delivery_id": delivery.id},
    )

    return {
        "channel": channel,
        "destination": _mask_contact(destination, channel),
        "expires_in": OTP_EXPIRY_MINUTES * 60,
        "delivery_id": delivery.id,
        "_raw_otp": otp,
    }


# ============================================================
# VERIFY OTP
# ============================================================

def verify_invitation_otp(*, token, otp):
    """
    Verify an OTP.

    Attempts are persisted before any failure is raised. Every write lives
    in its own `with transaction.atomic():` block that exits cleanly, so a
    later `raise` outside the block cannot roll it back.
    """
    # ---------------- Phase 1: lock + snapshot (its own atomic) ----------------
    with transaction.atomic():
        invitation = _get_invitation(token, for_update=True)

        if invitation.status == FamilyInvitation.Status.EXPIRED:
            raise ValueError("This invitation has expired.")
        if invitation.status != FamilyInvitation.Status.PENDING:
            raise ValueError("This invitation is no longer active.")

        snapshot = {
            "pk": invitation.pk,
            "otp_hash": invitation.otp_hash,
            "otp_expires_at": invitation.otp_expires_at,
            "otp_attempts": invitation.otp_attempts,
            "otp_locked_at": invitation.otp_locked_at,
        }
    # atomic exits cleanly → commit

    now = timezone.now()

    if snapshot["otp_locked_at"]:
        raise ValueError("Verification is locked. Please request a new code.")
    if not snapshot["otp_hash"]:
        raise ValueError("No verification code has been requested.")
    if not snapshot["otp_expires_at"] or snapshot["otp_expires_at"] <= now:
        raise ValueError(
            "The verification code has expired. Please request a new code."
        )
    if snapshot["otp_attempts"] >= OTP_MAX_ATTEMPTS:
        # Persist the lockout first, then raise (raise is outside the atomic).
        with transaction.atomic():
            inv = FamilyInvitation.objects.select_for_update().get(pk=snapshot["pk"])
            inv.otp_locked_at = now
            inv.save(update_fields=["otp_locked_at", "updated_at"])
            _create_audit_log(
                family=inv.family,
                action=FamilyAuditLog.Action.OTP_LOCKED,
                invitation=inv,
                metadata={"reason": "pre_exhausted"},
            )
        raise ValueError(
            "Too many verification attempts. Please request a new code."
        )

    # ---------------- Compare ----------------
    is_valid = hmac.compare_digest(
        hash_otp((otp or "").strip()),
        snapshot["otp_hash"],
    )

    # ---------------- Phase 2: invalid path ----------------
    if not is_valid:
        new_attempts = snapshot["otp_attempts"] + 1
        should_lock = new_attempts >= OTP_MAX_ATTEMPTS

        with transaction.atomic():
            inv = FamilyInvitation.objects.select_for_update().get(pk=snapshot["pk"])
            inv.otp_attempts = new_attempts
            if should_lock:
                inv.otp_locked_at = now
            inv.save(update_fields=["otp_attempts", "otp_locked_at", "updated_at"])
            if should_lock:
                _create_audit_log(
                    family=inv.family,
                    action=FamilyAuditLog.Action.OTP_LOCKED,
                    invitation=inv,
                    metadata={"reason": "max_attempts"},
                )
        # atomic exits cleanly → increment persists

        if should_lock:
            raise ValueError(
                "Too many verification attempts. Please request a new code."
            )
        remaining = OTP_MAX_ATTEMPTS - new_attempts
        raise ValueError(
            f"Invalid verification code. {remaining} attempts remaining."
        )

    # ---------------- Phase 3: success path ----------------
    with transaction.atomic():
        inv = FamilyInvitation.objects.select_for_update().get(pk=snapshot["pk"])
        inv.contact_verified_at = now
        inv.otp_hash = ""
        inv.otp_expires_at = None
        inv.otp_attempts = 0
        inv.otp_locked_at = None
        inv.save(update_fields=[
            "contact_verified_at", "otp_hash", "otp_expires_at",
            "otp_attempts", "otp_locked_at", "updated_at",
        ])
        _create_audit_log(
            family=inv.family,
            action=FamilyAuditLog.Action.INVITATION_CONTACT_VERIFIED,
            invitation=inv,
        )

    return {"verified": True, "verified_at": now}


def _persist_lockout(invitation_pk, family_id, *, reason):
    with transaction.atomic():
        FamilyInvitation.objects.filter(pk=invitation_pk).update(
            otp_locked_at=timezone.now(),
            updated_at=timezone.now(),
        )
        _create_audit_log(
            family_id=family_id,
            action=FamilyAuditLog.Action.OTP_LOCKED,
            metadata={"reason": reason},
        )