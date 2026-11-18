"""
Owner manages observers: list, permission toggle, revoke.
"""
import pytest
from django.utils import timezone

from ..models import FamilyAuditLog, FamilyMembership
from .factories import make_family_user, make_observer, make_member


@pytest.mark.django_db
def test_owner_lists_memberships(api, auth):
    owner, profile, _ = make_family_user()
    obs, _ = make_observer(profile, invited_by=owner)
    auth(owner)

    r = api.get("/api/family/memberships/")
    assert r.status_code == 200
    assert len(r.data) == 2
    roles = {row["role"] for row in r.data}
    assert roles == {"owner", "observer"}


@pytest.mark.django_db
def test_observer_cannot_list_memberships(api, auth):
    owner, profile, _ = make_family_user()
    obs, _ = make_observer(profile, invited_by=owner)
    auth(obs)

    r = api.get("/api/family/memberships/")
    assert r.status_code in (403, 404)


@pytest.mark.django_db
def test_owner_toggles_observer_permission(api, auth):
    owner, profile, _ = make_family_user()
    obs, membership = make_observer(
        profile, invited_by=owner, permissions={"can_view_reports": True},
    )
    auth(owner)

    r = api.patch(
        f"/api/family/memberships/{membership.id}/",
        {"can_view_reports": False},
        format="json",
    )
    assert r.status_code == 200

    membership.refresh_from_db()
    assert membership.can_view_reports is False

    assert FamilyAuditLog.objects.filter(
        family=profile,
        action=FamilyAuditLog.Action.MEMBERSHIP_PERMS_CHANGED,
    ).count() == 1


@pytest.mark.django_db
def test_owner_revokes_observer(api, auth):
    owner, profile, _ = make_family_user()
    obs, membership = make_observer(profile, invited_by=owner)
    auth(owner)

    r = api.post(f"/api/family/memberships/{membership.id}/revoke/")
    assert r.status_code == 200

    membership.refresh_from_db()
    assert membership.revoked_at is not None

    # Observer loses access.
    auth(obs)
    r2 = api.get("/api/family/members/")
    # Now sees nothing.
    assert r2.status_code in (200, 404)
    if r2.status_code == 200:
        assert r2.data == []

    assert FamilyAuditLog.objects.filter(
        family=profile,
        action=FamilyAuditLog.Action.MEMBERSHIP_REVOKED,
    ).count() == 1


@pytest.mark.django_db
def test_owner_membership_cannot_be_revoked(api, auth):
    owner, profile, _ = make_family_user()
    owner_m = FamilyMembership.objects.get(family=profile, user=owner)
    auth(owner)

    r = api.post(f"/api/family/memberships/{owner_m.id}/revoke/")
    assert r.status_code == 400