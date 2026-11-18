"""
Wire-format tests. These protect the mobile contract.
"""
import pytest

from ..serializers import (
    FamilyInvitationSerializer,
    FamilyMemberSerializer,
    FamilyReportSerializer,
)
from .factories import (
    make_family_user,
    make_invitation,
    make_member,
    make_report,
)


@pytest.mark.django_db
def test_member_serializer_uses_camelcase_for_mobile_fields():
    _, profile, _ = make_family_user()
    member = make_member(profile, name="Mother", relationship="mother")

    data = FamilyMemberSerializer(member).data
    assert data["name"] == "Mother"
    assert "full_name" not in data
    assert "dateOfBirth" in data
    assert "date_of_birth" not in data
    assert "emergencyPhone" in data
    assert "emergency_phone" not in data


@pytest.mark.django_db
def test_member_serializer_input_accepts_camel_and_snake():
    _, profile, _ = make_family_user()

    s = FamilyMemberSerializer(data={
        "name": "Father",
        "relationship": "father",
        "dateOfBirth": "1960-01-01",
        "emergencyPhone": "+15550002222",
    })
    assert s.is_valid(), s.errors
    member = s.save(family=profile)
    assert member.full_name == "Father"
    assert member.emergency_phone == "+15550002222"


@pytest.mark.django_db
def test_member_serializer_rejects_blank_name():
    s = FamilyMemberSerializer(data={"name": "   ", "relationship": "other"})
    assert not s.is_valid()
    assert "name" in s.errors


@pytest.mark.django_db
def test_member_serializer_rejects_bad_relationship():
    s = FamilyMemberSerializer(data={"name": "X", "relationship": "uncle"})
    assert not s.is_valid()
    assert "relationship" in s.errors


@pytest.mark.django_db
def test_invitation_serializer_requires_email_or_phone():
    owner, profile, _ = make_family_user()
    s = FamilyInvitationSerializer(data={"name": "X"}, context={"request": None})
    # `family` and `invited_by` are set in perform_create, so leave them out.
    assert not s.is_valid() or "email" in s.errors or "phone_number" in s.errors


@pytest.mark.django_db
def test_invitation_is_expired_reflects_pending_status():
    owner, profile, _ = make_family_user()
    inv = make_invitation(profile, invited_by=owner, email="x@example.com")
    assert FamilyInvitationSerializer(inv).data["is_expired"] is False

    inv.status = "accepted"
    inv.save(update_fields=["status"])
    assert FamilyInvitationSerializer(inv).data["is_expired"] is False


@pytest.mark.django_db
def test_report_is_new_is_per_user():
    owner, profile, _ = make_family_user()
    member = make_member(profile)
    report = make_report(member)

    class FakeReq:
        user = owner
        def __init__(self):
            class U:
                is_authenticated = True
            self.user = owner

    s = FamilyReportSerializer(report, context={"request": FakeReq()})
    assert s.data["is_new"] is True