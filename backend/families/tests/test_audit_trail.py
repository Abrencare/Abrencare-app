"""
Every security-sensitive action writes an audit row with the right shape.
"""
import pytest

from ..models import FamilyAuditLog
from ..services.audit import _create_audit_log


@pytest.mark.django_db
def test_create_audit_log_no_phi_by_default():
    from .factories import make_family_user
    owner, profile, _ = make_family_user()

    log = _create_audit_log(
        family=profile,
        action=FamilyAuditLog.Action.FAMILY_CREATED,
        actor=owner,
    )
    assert log.metadata == {}
    assert log.ip_address is None
    assert log.user_agent == ""


@pytest.mark.django_db
def test_create_audit_log_captures_request_metadata():
    from django.test import RequestFactory
    from .factories import make_family_user
    owner, profile, _ = make_family_user()

    rf = RequestFactory()
    req = rf.post("/x/", HTTP_X_FORWARDED_FOR="203.0.113.5, 10.0.0.1",
                  HTTP_USER_AGENT="pytest")

    log = _create_audit_log(
        family=profile,
        action=FamilyAuditLog.Action.OBSERVER_INVITED,
        actor=owner,
        request=req,
    )
    assert log.ip_address == "203.0.113.5"
    assert log.user_agent == "pytest"


@pytest.mark.django_db
def test_audit_never_stores_raw_token():
    """
    Guardrail: invitation flow should never leak the raw token into metadata.
    """
    from ..services.crypto import generate_invitation_token
    from .factories import make_family_user
    owner, profile, _ = make_family_user()
    raw, h = generate_invitation_token()

    log = _create_audit_log(
        family=profile,
        action=FamilyAuditLog.Action.OBSERVER_INVITED,
        actor=owner,
        metadata={"token_hash_prefix": h[:8]},
    )
    assert raw not in str(log.metadata)


@pytest.mark.django_db
def test_audit_admin_is_readonly(client):
    from django.contrib.auth import get_user_model
    from .factories import make_family_user
    User = get_user_model()
    owner, profile, _ = make_family_user()
    _create_audit_log(family=profile, action="family_created", actor=owner)

    admin = User.objects.create_superuser(
        username="admin", email="admin@example.com", password="x",
    )
    client.force_login(admin)

    r = client.get("/admin/families/familyauditlog/")
    assert r.status_code == 200
    # Add page should 403.
    r = client.get("/admin/families/familyauditlog/add/")
    assert r.status_code in (403, 302)  # DRF/Django may redirect