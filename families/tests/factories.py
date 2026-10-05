"""
Factory helpers. No factory_boy dependency — plain functions so this
works in any project. Extend as your schema grows.
"""

import uuid
from datetime import timedelta

from django.contrib.auth import get_user_model
from django.utils import timezone

from ..models import (
    CarePlanItem,
    CareVisit,
    FamilyAttentionFlag,
    FamilyCareTeamMember,
    FamilyHistoryEntry,
    FamilyInvitation,
    FamilyLabResult,
    FamilyMember,
    FamilyMembership,
    FamilyPrescription,
    FamilyProfile,
    FamilyReading,
    FamilyReport,
    FamilyReportRead,
    Relationship,
)
from services.models import Service, UserService

User = get_user_model()


# ---------------------------------------------------------------------------
# Users / services
# ---------------------------------------------------------------------------

def make_user(*, email=None, phone=None, password="TestPass!2345", username=None, **extra):
    email = email or f"user-{uuid.uuid4().hex[:8]}@example.com"
    phone = phone or f"+1555{uuid.uuid4().hex[:7]}"
    username = username or f"user_{uuid.uuid4().hex[:8]}"

    user = User(
        username=username,
        email=email,
        phone_number=phone,
        first_name=extra.pop("first_name", "Test"),
        last_name=extra.pop("last_name", "User"),
        account_status="active",
        **extra,
    )
    user.set_password(password)
    user.save()
    return user


def make_family_service():
    service, _ = Service.objects.get_or_create(
        code="family",
        defaults={"name": "Family"},
    )
    return service


def make_family_user(*, onboarded=True):
    """User + UserService(family) + FamilyProfile + owner membership."""
    service = make_family_service()
    user = make_user()
    us = UserService.objects.create(user=user, service=service, onboarded=onboarded)

    profile = FamilyProfile.objects.create(
        user_service=us,
        created_by=user,
        name="Test Family",
    )
    FamilyMembership.objects.create(
        family=profile,
        user=user,
        role=FamilyMembership.Role.OWNER,
        can_write=True,
    )
    return user, profile, us


# ---------------------------------------------------------------------------
# Family members (people under care)
# ---------------------------------------------------------------------------

def make_member(family, *, name="Mother", relationship=Relationship.MOTHER, **extra):
    return FamilyMember.objects.create(
        family=family,
        full_name=name,
        relationship=relationship,
        **extra,
    )


# ---------------------------------------------------------------------------
# Observers
# ---------------------------------------------------------------------------

def make_observer(family, *, invited_by=None, permissions=None, role=FamilyMembership.Role.OBSERVER):
    """Directly creates an observer membership (bypasses the invite flow)."""
    user = make_user()
    membership = FamilyMembership.objects.create(
        family=family,
        user=user,
        role=role,
        invited_by=invited_by,
        can_write=False,
        **(permissions or {}),
    )
    return user, membership


# ---------------------------------------------------------------------------
# Invitations
# ---------------------------------------------------------------------------

def make_invitation(
    family,
    *,
    invited_by,
    email=None,
    phone=None,
    status=FamilyInvitation.Status.PENDING,
    expires_in_days=7,
    token_hash="a" * 64,
    verified=True,
    permissions=None,
):
    now = timezone.now()
    return FamilyInvitation.objects.create(
        family=family,
        invited_by=invited_by,
        invitation_type=FamilyInvitation.InvitationType.OBSERVER,
        name="Invited Observer",
        email=email or "",
        phone_number=phone or "",
        token_hash=token_hash,
        expires_at=now + timedelta(days=expires_in_days),
        status=status,
        contact_verified_at=now if verified else None,
        **(permissions or {}),
    )


# ---------------------------------------------------------------------------
# Clinical records
# ---------------------------------------------------------------------------

def make_reading(member, **extra):
    return FamilyReading.objects.create(
        member=member,
        kind=extra.pop("kind", FamilyReading.Kind.BP),
        value=extra.pop("value", "128/82"),
        **extra,
    )


def make_care_plan_item(member, **extra):
    return CarePlanItem.objects.create(
        member=member,
        title=extra.pop("title", "Morning meds"),
        **extra,
    )


def make_visit(member, **extra):
    return CareVisit.objects.create(
        member=member,
        state=extra.pop("state", CareVisit.State.SCHEDULED),
        nurse_name=extra.pop("nurse_name", "Nurse A"),
        **extra,
    )


def make_care_team_member(family, **extra):
    return FamilyCareTeamMember.objects.create(
        family=family,
        role=extra.pop("role", FamilyCareTeamMember.Role.NURSE),
        full_name=extra.pop("full_name", "Nurse A"),
        **extra,
    )


def make_attention_flag(family, *, member=None, **extra):
    return FamilyAttentionFlag.objects.create(
        family=family,
        member=member,
        label=extra.pop("label", "bp"),
        title=extra.pop("title", "BP elevated"),
        **extra,
    )


def make_report(member, **extra):
    return FamilyReport.objects.create(
        member=member,
        title=extra.pop("title", "Weekly summary"),
        **extra,
    )


def make_prescription(member, **extra):
    return FamilyPrescription.objects.create(
        member=member,
        name=extra.pop("name", "Amlodipine"),
        dose=extra.pop("dose", "5 mg daily"),
        prescribed_by=extra.pop("prescribed_by", "Dr. A"),
        **extra,
    )


def make_lab_result(member, **extra):
    return FamilyLabResult.objects.create(
        member=member,
        name=extra.pop("name", "CBC"),
        collected_at=extra.pop("collected_at", timezone.localdate()),
        **extra,
    )


def make_history_entry(member, **extra):
    return FamilyHistoryEntry.objects.create(
        member=member,
        title=extra.pop("title", "Hypertension"),
        **extra,
    )