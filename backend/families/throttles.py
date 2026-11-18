# backend/families/throttles.py

from rest_framework.throttling import AnonRateThrottle, UserRateThrottle


# --- anonymous (invitation acceptance flows) ---

class InvitationLookupThrottle(AnonRateThrottle):
    scope = "invitation_lookup"


class InvitationContactThrottle(AnonRateThrottle):
    scope = "invitation_contact"


class InvitationOTPThrottle(AnonRateThrottle):
    scope = "invitation_otp"


class InvitationRegistrationThrottle(AnonRateThrottle):
    scope = "invitation_registration"


# --- authenticated (family owners) ---

class FamilyInvitationCreateThrottle(UserRateThrottle):
    scope = "family_invitation_create"


class FamilyMemberWriteThrottle(UserRateThrottle):
    """Bursts of member-create / roster-replace / reading-create."""
    scope = "family_member_write"


class FamilyOverviewThrottle(UserRateThrottle):
    """The aggregate dashboard endpoint; usually cheap, but cap it anyway."""
    scope = "family_overview"