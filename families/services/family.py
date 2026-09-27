from django.db import transaction

from .audit import _create_audit_log
from ..models import FamilyProfile, FamilyAuditLog, FamilyMember

from services.models import UserService

from ..models import FamilyMember, FamilyProfile

# ============================================================
# FAMILY
# ============================================================

@transaction.atomic
def create_family(
    *,
    user,
    name,
):
    """
    Create a family and automatically create its owner.
    """

    family = FamilyProfile.objects.create(
        name=name,
        created_by=user,
    )

    FamilyMember.objects.create(
        family=family,
        user=user,
        role=FamilyMember.Role.OWNER,
        can_view_patient_records=True,
        can_manage_appointments=True,
        can_manage_medications=True,
        can_manage_family_members=True,
        can_manage_family_patients=True,
    )

    _create_audit_log(
        family=family,
        action=FamilyAuditLog.Action.FAMILY_CREATED,
        actor=user,
    )

    return family


def get_user_family_profile(user):
    """
    Return the FamilyProfile owned by this user via their UserService('family')
    row, or None if they don't have one.

    The mobile client assumes one family profile per user. If a user somehow
    has multiple, the most recently created wins — deterministic, and easy
    to change here if the product later supports multiple households.
    """
    if not user or not user.is_authenticated:
        return None

    return (
        FamilyProfile.objects
        .select_related("user_service", "user_service__user")
        .filter(user_service__user=user)
        .order_by("-created_at")
        .first()
    )


def user_has_family_service(user):
    """Cheap check used by the empty-shell branch and by onboarding."""
    return UserService.objects.filter(
        user=user, service__code="family",
    ).exists()


@transaction.atomic
def create_family_profile_for_user(user, name=None):
    """
    Create the FamilyProfile (and its UserService link is assumed to already
    exist from registration). Idempotent: returns the existing profile if
    one is present.
    """
    existing = get_user_family_profile(user)
    if existing:
        return existing

    user_service = (
        UserService.objects
        .select_related("service")
        .filter(user=user, service__code="family")
        .first()
    )
    if user_service is None:
        raise ValueError(
            "Cannot create a FamilyProfile for a user without the 'family' service."
        )

    return FamilyProfile.objects.create(
        user_service=user_service,
        created_by=user,
        name=name or f"{user.get_full_name() or user.username}'s family",
    )


@transaction.atomic
def replace_family_members(family_profile, members_data):
    """
    Full-replace the roster. Matches FamilyContext.save() semantics, which
    sends the entire members array on every PUT.
    """
    family_profile.members.all().delete()
    return FamilyMember.objects.bulk_create([
        FamilyMember(family_profile=family_profile, **m)
        for m in members_data
    ])


def complete_family_onboarding(family_profile):
    """
    Flip the UserService('family').onboarded flag. AuthContext.isOnboarded
    reads from here via /auth/profile/ services[], so this is the single
    place onboarding state lives.
    """
    user_service = family_profile.user_service
    if not user_service.onboarded:
        user_service.onboarded = True
        user_service.save(update_fields=["onboarded"])
    return user_service