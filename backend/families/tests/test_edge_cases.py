"""
The ugly stuff: races, empty families, revoked-then-reactivated,
partial permission sets, staff, unauthenticated callers.
"""
import pytest
from django.db import IntegrityError, transaction

from ..models import FamilyInvitation, FamilyMembership
from .factories import (
    make_family_user,
    make_invitation,
    make_member,
    make_observer,
)


@pytest.mark.django_db
def test_unique_active_membership_constraint():
    owner, profile, _ = make_family_user()
    obs, _ = make_observer(profile, invited_by=owner)

    with pytest.raises(IntegrityError):
        with transaction.atomic():
            FamilyMembership.objects.create(
                family=profile,
                user=obs,
                role=FamilyMembership.Role.OBSERVER,
            )


@pytest.mark.django_db
def test_revoked_then_reactivated():
    owner, profile, _ = make_family_user()
    obs, m = make_observer(profile, invited_by=owner)

    m.revoked_at = __import__("django.utils.timezone", fromlist=["now"]).now()
    m.save(update_fields=["revoked_at"])

    # Same user can be re-invited.
    m2 = FamilyMembership.objects.create(
        family=profile,
        user=obs,
        role=FamilyMembership.Role.OBSERVER,
    )
    assert m2.pk != m.pk


@pytest.mark.django_db
def test_owner_of_empty_family_sees_zero_members(api, auth):
    owner, profile, _ = make_family_user()
    auth(owner)
    r = api.get("/api/family/members/")
    assert r.status_code == 200
    assert r.data == []


@pytest.mark.django_db
def test_observer_of_empty_family_sees_zero_members(api, auth):
    owner, profile, _ = make_family_user()
    obs, _ = make_observer(profile, invited_by=owner)
    auth(obs)
    r = api.get("/api/family/members/")
    assert r.status_code == 200
    assert r.data == []


@pytest.mark.django_db
def test_unauthenticated_is_rejected(api):
    r = api.get("/api/family/profile/")
    assert r.status_code in (401, 403)


@pytest.mark.django_db
def test_staff_can_see_any_member(api, auth):
    from django.contrib.auth import get_user_model
    User = get_user_model()
    owner, profile, _ = make_family_user()
    member = make_member(profile)

    staff = User.objects.create_superuser(
        username="staff", email="staff@example.com", password="x",
    )
    auth(staff)

    r = api.get(f"/api/family/members/{member.id}/overview/")
    assert r.status_code == 200


@pytest.mark.django_db
def test_observer_with_all_flags_false_can_still_see_profile(api, auth):
    """
    /family/profile/ is a family-level read, not gated by a per-section flag.
    """
    owner, profile, _ = make_family_user()
    obs, m = make_observer(
        profile, invited_by=owner,
        permissions={
            "can_view_readings": False,
            "can_view_care_plan": False,
            "can_view_visits": False,
            "can_view_reports": False,
            "can_view_prescriptions": False,
            "can_view_lab_results": False,
            "can_view_history": False,
            "can_view_attention": False,
            "can_view_care_team": False,
        },
    )
    auth(obs)
    r = api.get("/api/family/profile/")
    assert r.status_code == 200

    # But any gated read is 403.
    for url in [
        "/api/family/care-team/",
        "/api/family/attention/",
    ]:
        rr = api.get(url)
        assert rr.status_code == 403


@pytest.mark.django_db
def test_invitation_expiry_is_lazy(api, auth):
    """
    Expiry only flips to EXPIRED when the row is touched by _get_invitation.
    Until then it stays PENDING in the DB.
    """
    from django.utils import timezone
    from datetime import timedelta
    owner, profile, _ = make_family_user()
    inv = make_invitation(profile, invited_by=owner, email="x@example.com")
    inv.expires_at = timezone.now() - timedelta(seconds=1)
    inv.save(update_fields=["expires_at"])

    # Not touched yet.
    inv.refresh_from_db()
    assert inv.status == FamilyInvitation.Status.PENDING

    # Touch it via the service.
    from families.services.lookup import get_invitation_by_token
    from families.services.crypto import hash_invitation_token
    from .factories import make_invitation as mi
    raw = "raw-x"
    inv.token_hash = hash_invitation_token(raw)
    inv.save(update_fields=["token_hash"])

    with pytest.raises(ValueError):
        get_invitation_by_token(raw)

    inv.refresh_from_db()
    assert inv.status == FamilyInvitation.Status.EXPIRED


@pytest.mark.django_db
def test_owner_cannot_be_demoted_via_patch(api, auth):
    """
    MembershipPermissionUpdateSerializer excludes `role` and `can_write`,
    so the owner role cannot be flipped through the PATCH endpoint.
    """
    owner, profile, _ = make_family_user()
    owner_m = FamilyMembership.objects.get(family=profile, user=owner)
    auth(owner)

    r = api.patch(
        f"/api/family/memberships/{owner_m.id}/",
        {"role": "observer", "can_write": False},
        format="json",
    )
    # Role and can_write are read-only in the serializer, so the request
    # succeeds but does not change them.
    assert r.status_code == 200
    owner_m.refresh_from_db()
    assert owner_m.role == FamilyMembership.Role.OWNER
    assert owner_m.can_write is True