# backend/families/permissions.py

from rest_framework import permissions

from .models import FamilyMembership, FamilyMember, FamilyProfile


def family_of(obj) -> FamilyProfile | None:
    """Resolve the FamilyProfile that owns an arbitrary instance."""
    if obj is None:
        return None
    if isinstance(obj, FamilyProfile):
        return obj
    if isinstance(obj, FamilyMember):
        return obj.family
    if isinstance(obj, FamilyMembership):
        return obj.family
    if hasattr(obj, "family"):
        return obj.family
    if hasattr(obj, "member"):
        return obj.member.family
    return None


def is_owner(user, family: FamilyProfile) -> bool:
    if not user or not user.is_authenticated:
        return False
    if user.is_staff:
        return True
    return family.user_service.user_id == user.id


def active_membership(user, family: FamilyProfile) -> FamilyMembership | None:
    if not user or not user.is_authenticated:
        return None
    return FamilyMembership.objects.filter(
        family=family, user=user, revoked_at__isnull=True,
    ).first()


class IsFamilyOwner(permissions.BasePermission):
    """
    Owner-only permission for write and owner-only list views.
    Works for both list/create (no object) and detail (object) routes.
    """

    message = "Only the family owner can perform this action."

    def has_permission(self, request, view):
        # Anonymous → 401 (or 403, depending on authentication class).
        if not request.user or not request.user.is_authenticated:
            return False

        # Staff bypass.
        if request.user.is_staff:
            return True

        # For list/create routes, we verify ownership via the user's
        # active OWNER membership. If they own no family, they can't
        # reach list/create.
        from .models import FamilyMembership
        return FamilyMembership.objects.filter(
            user=request.user,
            role=FamilyMembership.Role.OWNER,
            revoked_at__isnull=True,
        ).exists()

    def has_object_permission(self, request, view, obj):
        family = family_of(obj)
        return bool(family) and is_owner(request.user, family)


class HasFamilyAccess(permissions.BasePermission):
    """
    Owner OR active observer with the required read permission.

    Set `required_permission` on the view (e.g. "can_view_readings")
    to gate observers on a specific flag. Owners bypass it.
    """

    message = "You do not have access to this family resource."

    def has_object_permission(self, request, view, obj):
        family = family_of(obj)
        if not family:
            return False
        if is_owner(request.user, family):
            return True

        m = active_membership(request.user, family)
        if not m:
            return False

        required = getattr(view, "required_permission", None)
        if required and not getattr(m, required, False):
            return False
        return True