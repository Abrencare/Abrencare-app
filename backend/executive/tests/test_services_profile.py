"""Onboarding + profile write services."""

from django.test import TestCase

from ..services.services import (
    ExecutiveNotEnrolled,
    ExecutiveProfileMissing,
    ExecutiveProfileService,
)
from executive.tests.factories import (
    ExecutiveProfileFactory,
    ServiceFactory,
    UserFactory,
    UserServiceFactory,
)


class SaveProfileTests(TestCase):

    def setUp(self):
        self.user = UserFactory()
        UserServiceFactory(user=self.user, service=ServiceFactory())

    def test_creates_profile_and_updates_user(self):
        profile = ExecutiveProfileService.save_profile(
            user=self.user,
            date_of_birth="1990-05-12",
            gender="male",
            height_cm="180.5",
            weight_kg="75",
        )
        self.user.refresh_from_db()
        self.assertEqual(profile.user_service.user, self.user)
        self.assertEqual(str(self.user.date_of_birth), "1990-05-12")
        self.assertEqual(self.user.gender, "male")
        self.assertEqual(float(self.user.height), 180.5)
        self.assertEqual(float(self.user.weight), 75.0)

    def test_second_call_updates_existing_profile(self):
        p1 = ExecutiveProfileService.save_profile(
            user=self.user, date_of_birth="1990-05-12",
            gender="male", height_cm="180", weight_kg="75",
        )
        p2 = ExecutiveProfileService.save_profile(
            user=self.user, date_of_birth="1990-05-12",
            gender="male", height_cm="181", weight_kg="76",
        )
        self.assertEqual(p1.pk, p2.pk)

    def test_raises_when_not_enrolled(self):
        stranger = UserFactory()
        with self.assertRaises(ExecutiveNotEnrolled):
            ExecutiveProfileService.save_profile(
                user=stranger, date_of_birth="1990-05-12",
                gender="male", height_cm="180", weight_kg="75",
            )


class SaveCareTests(TestCase):

    def setUp(self):
        self.profile = ExecutiveProfileFactory()
        self.user = self.profile.user_service.user

    def test_persists_metrics_and_frequency(self):
        p = ExecutiveProfileService.save_care(
            user=self.user,
            monitoring=["bp", "weight"],
            frequency="weekly",
        )
        p.refresh_from_db()
        self.assertEqual(p.monitoring, ["bp", "weight"])
        self.assertEqual(p.frequency, "weekly")

    def test_defaults_frequency_when_none(self):
        p = ExecutiveProfileService.save_care(
            user=self.user, monitoring=["bp"], frequency=None,
        )
        self.assertEqual(p.frequency, "managed")

    def test_requires_profile(self):
        user = UserFactory()
        UserServiceFactory(user=user, service=ServiceFactory())
        with self.assertRaises(ExecutiveProfileMissing):
            ExecutiveProfileService.save_care(
                user=user, monitoring=["bp"], frequency="managed",
            )


class MarkOnboardedTests(TestCase):

    def test_sets_flag_once(self):
        profile = ExecutiveProfileFactory()
        us = ExecutiveProfileService.mark_onboarded(
            user=profile.user_service.user,
        )
        self.assertTrue(us.onboarded)
        # Idempotent
        us2 = ExecutiveProfileService.mark_onboarded(
            user=profile.user_service.user,
        )
        self.assertTrue(us2.onboarded)


class CareTeamServiceTests(TestCase):

    def setUp(self):
        self.profile = ExecutiveProfileFactory()
        self.user = self.profile.user_service.user

    def test_add_member(self):
        from executive.services import CareTeamService
        member = CareTeamService.add_member(
            user=self.user, role="physician",
            full_name="Dr. Ada", title="Cardiologist",
            phone="+1 555 0101",
        )
        self.assertEqual(member.executive_profile, self.profile)

    def test_update_member_ignores_disallowed_fields(self):
        from executive.services import CareTeamService
        member = CareTeamService.add_member(
            user=self.user, role="physician", full_name="Dr. Ada",
        )
        updated = CareTeamService.update_member(
            user=self.user, member_id=member.pk,
            full_name="Dr. Ada Lovelace",
            executive_profile=self.profile,  # not in allowlist
        )
        self.assertEqual(updated.full_name, "Dr. Ada Lovelace")

    def test_remove_member(self):
        from executive.services import CareTeamService
        member = CareTeamService.add_member(
            user=self.user, role="nurse", full_name="N",
        )
        CareTeamService.remove_member(user=self.user, member_id=member.pk)
        self.assertFalse(
            type(member).objects.filter(pk=member.pk).exists()
        )