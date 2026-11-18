# families/services/notifications/recipients.py

from django.db.models import Q
from families.models import FamilyMembership


def family_recipients(
    family,
    *,
    include_owner=True,
    require_permission: str | None = None,
):
    """
    Return the User queryset for everyone who should receive a notification
    about `family`.

    - include_owner:  whether the owner is in the recipient set
    - require_permission: an optional FamilyMembership permission field
      name (e.g. "can_view_attention"). When set, observers lacking that
      flag are excluded. The owner is always included when include_owner
      is True, regardless of the flag.
    """
    qs = FamilyMembership.objects.filter(
        family=family,
        revoked_at__isnull=True,
    ).select_related("user")

    if not include_owner:
        qs = qs.exclude(role=FamilyMembership.Role.OWNER)

    if require_permission:
        qs = qs.filter(
            Q(role=FamilyMembership.Role.OWNER)  # owner always passes
            | Q(**{require_permission: True})
        )

    return [m.user for m in qs]