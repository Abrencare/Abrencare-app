"""
Ownership is defined as: FamilyProfile.user_service.user.
The owner membership must exist as soon as the family service is created.
"""
import pytest

from ..models import FamilyMembership, FamilyProfile
from ..services.family import (
    bootstrap_family_owner,
    families_for_user,
    is_owner,
    user_has_family_service,
)
from .factories import (
    make_family_service,
    make_user,
)
from services.models import UserService


@pytest.mark.django_db
def test_bootstrap_creates_profile_and_owner_membership():
    service = make_family_service()
    user = make_user()
    us = UserService.objects.create(user=user, service=service, onboarded=False)

    profile = bootstrap_family_owner(user, us)

    assert profile.user_service_id == us.id
    m = FamilyMembership.objects.get(family=profile, user=user, revoked_at__isnull=True)
    assert m.role == FamilyMembership.Role.OWNER
    assert m.can_write is True


@pytest.mark.django_db
def test_bootstrap_is_idempotent():
    service = make_family_service()
    user = make_user()
    us = UserService.objects.create(user=user, service=service)

    p1 = bootstrap_family_owner(user, us)
    p2 = bootstrap_family_owner(user, us)

    assert p1.pk == p2.pk
    assert FamilyProfile.objects.filter(user_service=us).count() == 1
    assert FamilyMembership.objects.filter(family=p1).count() == 1


@pytest.mark.django_db
def test_is_owner_true_only_for_owner():
    from .factories import make_family_user, make_observer
    user, profile, _ = make_family_user()
    observer, _ = make_observer(profile, invited_by=user)

    assert is_owner(user, profile) is True
    assert is_owner(observer, profile) is False


@pytest.mark.django_db
def test_user_has_family_service_reflects_ownership_not_observation():
    from .factories import make_family_user, make_observer
    user, profile, _ = make_family_user()
    observer, _ = make_observer(profile, invited_by=user)

    assert user_has_family_service(user) is True
    assert user_has_family_service(observer) is False  # observers don't own the SKU


@pytest.mark.django_db
def test_families_for_user_includes_owned_and_observed():
    from .factories import make_family_user, make_observer
    owner, profile_a, _ = make_family_user()
    observer, _ = make_observer(profile_a, invited_by=owner)

    # Observer sees profile_a
    assert profile_a in families_for_user(observer)

    # Owner of a second family: both should see profile_a plus their own
    owner2, profile_b, _ = make_family_user()
    assert list(families_for_user(owner2)) == [profile_b]