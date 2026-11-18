import pytest
from rest_framework.test import APIClient

from .factories import make_family_user, make_member


@pytest.fixture
def api():
    return APIClient()


@pytest.fixture
def owner_ctx(db):
    """Owner + FamilyProfile + one member."""
    user, profile, us = make_family_user()
    member = make_member(profile, name="Owner's Mother")
    return {"user": user, "profile": profile, "us": us, "member": member}


@pytest.fixture
def auth(api):
    def _login(user):
        api.force_authenticate(user=user)
        return api
    return _login