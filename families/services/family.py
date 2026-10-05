# families/services/family.py

from django.db import transaction
from django.db.models import Q

from services.models import UserService

from ..models import (
    FamilyAuditLog,
    FamilyMember,
    FamilyMembership,
    FamilyProfile,
    Relationship,
)


# ============================================================
# AUDIT (small helper, kept here so callers import one module)
# ============================================================

def _create_audit_log(*, family, action, actor=None, invitation=None,
                      member=None, metadata=None, request=None):
    """
    Create a security audit event.

    Never place secrets or passwords in metadata.
    """
    ip_address = None
    user_agent = ""

    if request is not None:
        forwarded_for = request.META.get("HTTP_X_FORWARDED_FOR")
        if forwarded_for:
            ip_address = forwarded_for.split(",")[0].strip()
        else:
            ip_address = request.META.get("REMOTE_ADDR")
        user_agent = request.META.get("HTTP_USER_AGENT", "")

    return FamilyAuditLog.objects.create(
        family=family,
        actor=actor,
        action=action,
        invitation=invitation,
        member=member,
        metadata=metadata or {},
        ip_address=ip_address,
        user_agent=user_agent,
    )


# ============================================================
# READ HELPERS
# ============================================================

def get_user_family_profile(user):
    """
    The family profile the user OWNS, or None.

    Owners are identified via FamilyProfile.user_service.user.
    Observers do NOT get a profile here — see families_for_user().
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


def user_has_family_service(user) -> bool:
    """
    Does the user OWN the family product?

    Observers return False — they don't own the SKU; they were invited.
    """
    if not user or not user.is_authenticated:
        return False
    return UserService.objects.filter(
        user=user, service__code="family",
    ).exists()


def user_can_access_family(user) -> bool:
    """Does the user own OR observe at least one family?"""
    return families_for_user(user).exists()


def families_for_user(user):
    """All FamilyProfiles the user can access (owner or active observer)."""
    if not user or not user.is_authenticated:
        return FamilyProfile.objects.none()
    return (
        FamilyProfile.objects
        .filter(
            Q(user_service__user=user)
            | Q(memberships__user=user, memberships__revoked_at__isnull=True)
        )
        .distinct()
    )


def user_family_members(user):
    """FamilyMember rows across every family the user can access."""
    if not user or not user.is_authenticated:
        return FamilyMember.objects.none()
    return (
        FamilyMember.objects
        .filter(family__in=families_for_user(user))
        .select_related("family")
    )


def is_owner(user, family: FamilyProfile) -> bool:
    if not user or not user.is_authenticated:
        return False
    if user.is_staff:
        return True
    return family.user_service.user_id == user.id


def active_membership(user, family: FamilyProfile):
    """The user's active membership in `family`, or None."""
    if not user or not user.is_authenticated:
        return None
    return FamilyMembership.objects.filter(
        family=family, user=user, revoked_at__isnull=True,
    ).first()


# ============================================================
# WRITE HELPERS
# ============================================================

@transaction.atomic
def bootstrap_family_owner(user, user_service) -> FamilyProfile:
    """
    Idempotently create the FamilyProfile + owner FamilyMembership
    for a user who has the family service. Called from
    accounts.serializers._bootstrap_profile on account creation, and
    from create_family_profile_for_user() on lazy creation.

    Invariants enforced:
      - exactly one FamilyProfile per UserService
      - exactly one active OWNER membership per family
      - FAMILY_CREATED audit logged once
    """
    profile, created = FamilyProfile.objects.get_or_create(
        user_service=user_service,
        defaults={
            "created_by": user,
            "name": f"{user.full_name or user.get_username()}'s family",
        },
    )

    FamilyMembership.objects.get_or_create(
        family=profile,
        user=user,
        revoked_at=None,
        defaults={
            "role": FamilyMembership.Role.OWNER,
            "can_write": True,
        },
    )

    if created:
        _create_audit_log(
            family=profile,
            action=FamilyAuditLog.Action.FAMILY_CREATED,
            actor=user,
        )

    return profile


@transaction.atomic
def create_family_profile_for_user(user, name: str | None = None) -> FamilyProfile:
    """
    Idempotent. Returns the existing profile if one is present.
    Otherwise creates the profile AND the owner membership.
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

    profile = bootstrap_family_owner(user, user_service)
    if name:
        profile.name = name
        profile.save(update_fields=["name", "updated_at"])
    return profile


@transaction.atomic
def replace_family_members(family_profile: FamilyProfile, members_data):
    """
    Full-replace the roster (PUT semantics from the mobile client).
    """
    family_profile.members.all().delete()
    return FamilyMember.objects.bulk_create([
        FamilyMember(family=family_profile, **m) for m in members_data
    ])


@transaction.atomic
def complete_family_onboarding(family_profile: FamilyProfile) -> UserService:
    """
    Flip UserService('family').onboarded. AuthContext.isOnboarded reads
    from here via /auth/profile/ services[].
    """
    user_service = family_profile.user_service
    if not user_service.onboarded:
        user_service.onboarded = True
        user_service.save(update_fields=["onboarded"])
    return user_service