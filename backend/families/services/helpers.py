# backend/families/services/helpers.py

def _require_verified_invitation(invitation) -> None:
    """Ensure contact verification happened before accepting/registering."""
    if not invitation.contact_verified_at:
        raise ValueError(
            "Contact verification is required before completing this invitation."
        )

def _invitation_belongs_to_user(invitation, user) -> bool:
    invitation_email = (invitation.email or "").strip().lower()
    user_email = (getattr(user, "email", "") or "").strip().lower()

    invitation_phone = (invitation.phone_number or "").strip()
    user_phone = (getattr(user, "phone_number", "") or "").strip()

    return bool(
        (invitation_email and user_email and invitation_email == user_email)
        or (invitation_phone and user_phone and invitation_phone == user_phone)
    )