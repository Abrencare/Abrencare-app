"""
The spec test. Every endpoint × owner/observer × read/write.
"""
import pytest

from ..models import FamilyMembership
from .factories import (
    make_attention_flag,
    make_care_plan_item,
    make_care_team_member,
    make_family_user,
    make_history_entry,
    make_lab_result,
    make_member,
    make_observer,
    make_prescription,
    make_reading,
    make_report,
    make_visit,
)


@pytest.fixture
def ctx(db):
    owner, profile, _ = make_family_user()
    observer, _ = make_observer(profile, invited_by=owner)
    member = make_member(profile)
    reading = make_reading(member)
    plan_item = make_care_plan_item(member)
    visit = make_visit(member)
    report = make_report(member)
    prescription = make_prescription(member)
    lab = make_lab_result(member)
    history = make_history_entry(member)
    team = make_care_team_member(profile)
    flag = make_attention_flag(profile, member=member)
    return {
        "owner": owner,
        "observer": observer,
        "profile": profile,
        "member": member,
        "reading": reading,
        "plan_item": plan_item,
        "visit": visit,
        "report": report,
        "prescription": prescription,
        "lab": lab,
        "history": history,
        "team": team,
        "flag": flag,
    }


# ---------------------------------------------------------------------------
# GETs: owner + observer both 200 (observer has all permissions by default)
# ---------------------------------------------------------------------------

GET_ENDPOINTS = [
    ("/api/family/profile/", None),
    ("/api/family/members/", None),
    ("/api/family/members/{member}/overview/", "member"),
    ("/api/family/members/{member}/readings/", "member"),
    ("/api/family/members/{member}/care-plan/", "member"),
    ("/api/family/members/{member}/visits/", "member"),
    ("/api/family/members/{member}/reports/", "member"),
    ("/api/family/members/{member}/prescriptions/", "member"),
    ("/api/family/members/{member}/labs/", "member"),
    ("/api/family/members/{member}/history/", "member"),
    ("/api/family/care-team/", None),
    ("/api/family/attention/", None),
]


@pytest.mark.parametrize("url_template, pk_key", GET_ENDPOINTS)
@pytest.mark.parametrize("who", ["owner", "observer"])
def test_get_endpoints(api, auth, ctx, url_template, pk_key, who):
    user = ctx[who]
    auth(user)
    url = url_template.format(
        member=ctx["member"].id if "{member}" in url_template else None,
    )
    r = api.get(url)
    assert r.status_code == 200, (who, url, r.status_code, getattr(r, "data", None))


# ---------------------------------------------------------------------------
# Writes: owner 2xx, observer 403/404
# ---------------------------------------------------------------------------

WRITE_CALLS = [
    ("post", "/api/family/members/", lambda c: {"name": "New", "relationship": "other"}),
    ("patch", "/api/family/members/{member}/", lambda c: {"name": "Updated"}),
    ("delete", "/api/family/members/{member}/", None),
    ("post", "/api/family/members/{member}/readings/",
        lambda c: {"kind": "bp", "value": "120/80"}),
    ("post", "/api/family/members/{member}/care-plan/",
        lambda c: {"title": "Task"}),
    ("post", "/api/family/members/{member}/care-plan/{plan_item}/complete/", None),
    ("post", "/api/family/members/{member}/visits/",
        lambda c: {"nurse_name": "N", "state": "scheduled"}),
    ("post", "/api/family/members/{member}/visits/{visit}/start/", None),
    ("post", "/api/family/attention/{flag}/resolve/", None),
    ("post", "/api/family/memberships/{observer_membership}/revoke/", None),
    ("post", "/api/family/invitations/",
        lambda c: {"name": "X", "email": "x@example.com"}),
]


@pytest.mark.parametrize("method, url_template, payload_fn", WRITE_CALLS)
def test_writes_owner_allowed(api, auth, ctx, method, url_template, payload_fn):
    auth(ctx["owner"])
    membership_id = FamilyMembership.objects.get(
        family=ctx["profile"], user=ctx["observer"],
    ).id
    url = url_template.format(
        member=ctx["member"].id,
        plan_item=ctx["plan_item"].id,
        visit=ctx["visit"].id,
        flag=ctx["flag"].id,
        observer_membership=membership_id,
    )
    payload = payload_fn(ctx) if payload_fn else None
    fn = getattr(api, method)
    r = fn(url, payload, format="json") if payload is not None else fn(url)
    assert 200 <= r.status_code < 300, (method, url, r.status_code, r.data)


@pytest.mark.parametrize("method, url_template, payload_fn", WRITE_CALLS)
def test_writes_observer_forbidden(api, auth, ctx, method, url_template, payload_fn):
    auth(ctx["observer"])
    membership_id = FamilyMembership.objects.get(
        family=ctx["profile"], user=ctx["observer"],
    ).id
    url = url_template.format(
        member=ctx["member"].id,
        plan_item=ctx["plan_item"].id,
        visit=ctx["visit"].id,
        flag=ctx["flag"].id,
        observer_membership=membership_id,
    )
    payload = payload_fn(ctx) if payload_fn else None
    fn = getattr(api, method)
    r = fn(url, payload, format="json") if payload is not None else fn(url)
    assert r.status_code in (403, 404), (method, url, r.status_code)


# ---------------------------------------------------------------------------
# Per-section flag gating for observers
# ---------------------------------------------------------------------------

OBSERVER_FLAG_CASES = [
    # (permission field, url_template, method)
    ("can_view_readings",
        "/api/family/members/{member}/readings/", "get"),
    ("can_view_care_plan",
        "/api/family/members/{member}/care-plan/", "get"),
    ("can_view_visits",
        "/api/family/members/{member}/visits/", "get"),
    ("can_view_reports",
        "/api/family/members/{member}/reports/", "get"),
    ("can_view_prescriptions",
        "/api/family/members/{member}/prescriptions/", "get"),
    ("can_view_lab_results",
        "/api/family/members/{member}/labs/", "get"),
    ("can_view_history",
        "/api/family/members/{member}/history/", "get"),
    ("can_view_attention",
        "/api/family/attention/", "get"),
    ("can_view_care_team",
        "/api/family/care-team/", "get"),
]


@pytest.mark.parametrize("field, url_template, method", OBSERVER_FLAG_CASES)
def test_observer_permission_flag_gates_read(
    api, auth, ctx, field, url_template, method,
):
    membership = FamilyMembership.objects.get(
        family=ctx["profile"], user=ctx["observer"],
    )

    # Flag OFF → 403.
    setattr(membership, field, False)
    membership.save(update_fields=[field])

    auth(ctx["observer"])
    url = url_template.format(member=ctx["member"].id)
    r = getattr(api, method)(url)
    assert r.status_code == 403, (field, url, r.status_code)

    # Flag ON → 200.
    setattr(membership, field, True)
    membership.save(update_fields=[field])
    r2 = getattr(api, method)(url)
    assert r2.status_code == 200, (field, url, r2.status_code)


# ---------------------------------------------------------------------------
# Cross-family access: observer of family A cannot touch members in family B.
# ---------------------------------------------------------------------------

@pytest.mark.django_db
def test_cross_family_access_blocked(api, auth):
    owner_a, profile_a, _ = make_family_user()
    owner_b, profile_b, _ = make_family_user()
    member_b = make_member(profile_b, name="Not Yours")

    auth(owner_a)
    r = api.get(f"/api/family/members/{member_b.id}/overview/")
    assert r.status_code == 404


@pytest.mark.django_db
def test_observer_of_a_cannot_read_b(api, auth):
    owner_a, profile_a, _ = make_family_user()
    owner_b, profile_b, _ = make_family_user()
    observer_a, _ = make_observer(profile_a, invited_by=owner_a)
    member_b = make_member(profile_b, name="Not Yours")

    auth(observer_a)
    r = api.get(f"/api/family/members/{member_b.id}/overview/")
    assert r.status_code == 404
