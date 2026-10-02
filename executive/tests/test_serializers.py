"""Serializer contract tests."""

from datetime import date

from django.test import TestCase

from executive.serializers import (
    CareTeamMemberSerializer,
    ExecutiveOnboardingCompleteSerializer,
    ExecutiveProfileCreateSerializer,
    ExecutiveProfileSerializer,
    ReadingSerializer,
    WeeklyReportSerializer,
)
from executive.tests.factories import (
    CareTeamMemberFactory,
    ExecutiveProfileFactory,
    ReadingFactory,
    WeeklyReportFactory,
)


class ReadingSerializerTests(TestCase):

    def test_exposes_value_alias(self):
        reading = ReadingFactory(display_value="118/76 mmHg")
        data = ReadingSerializer(reading).data
        self.assertEqual(data["value"], "118/76 mmHg")
        self.assertEqual(data["display_value"], "118/76 mmHg")


class CareTeamMemberSerializerTests(TestCase):

    def test_derives_initials_and_name(self):
        member = CareTeamMemberFactory(full_name="Dr. Ada Lovelace")
        data = CareTeamMemberSerializer(member).data
        self.assertEqual(data["name"], "Dr. Ada Lovelace")
        self.assertEqual(data["initials"], "DL")
        self.assertTrue(data["verified"])


class ExecutiveProfileSerializerTests(TestCase):

    def setUp(self):
        self.profile = ExecutiveProfileFactory(name="")
        self.user = self.profile.user_service.user
        self.user.date_of_birth = date(1990, 5, 12)
        self.user.gender = "male"
        self.user.height = 180
        self.user.weight = 75
        self.user.save()

    def test_gender_normalized_for_frontend(self):
        self.user.gender = "prefer_not"
        self.user.save()
        data = ExecutiveProfileSerializer(self.profile).data
        self.assertEqual(data["gender"], "preferNot")

    def test_numeric_fields_serialized_as_strings(self):
        data = ExecutiveProfileSerializer(self.profile).data
        self.assertIsInstance(data["heightCm"], str)
        self.assertIsInstance(data["weightKg"], str)


class ExecutiveProfileCreateSerializerTests(TestCase):

    def test_valid_payload(self):
        s = ExecutiveProfileCreateSerializer(data={
            "dateOfBirth": "1990-05-12",
            "gender": "male",
            "heightCm": "180.5",
            "weightKg": "75",
        })
        self.assertTrue(s.is_valid(), s.errors)

    def test_rejects_bad_gender(self):
        s = ExecutiveProfileCreateSerializer(data={
            "dateOfBirth": "1990-05-12",
            "gender": "alien",
            "heightCm": "180", "weightKg": "75",
        })
        self.assertFalse(s.is_valid())
        self.assertIn("gender", s.errors)

    def test_accepts_multiple_date_formats(self):
        for value in ("1990-05-12", "12/05/1990", "12 May 1990"):
            s = ExecutiveProfileCreateSerializer(data={
                "dateOfBirth": value, "gender": "male",
                "heightCm": "180", "weightKg": "75",
            })
            self.assertTrue(s.is_valid(), f"{value}: {s.errors}")


class OnboardingCompleteSerializerTests(TestCase):

    def test_camel_case(self):
        s = ExecutiveOnboardingCompleteSerializer(data={
            "dateOfBirth": "1990-05-12",
            "gender": "male",
            "heightCm": "180", "weightKg": "75",
            "monitoring": ["bp"], "frequency": "managed",
        })
        self.assertTrue(s.is_valid(), s.errors)
        self.assertIn("date_of_birth", s.validated_data)

    def test_snake_case(self):
        s = ExecutiveOnboardingCompleteSerializer(data={
            "date_of_birth": "1990-05-12",
            "gender": "male",
            "height_cm": "180", "weight_kg": "75",
            "monitoring": ["bp"], "frequency": "managed",
        })
        self.assertTrue(s.is_valid(), s.errors)

    def test_requires_demographics(self):
        s = ExecutiveOnboardingCompleteSerializer(data={
            "monitoring": ["bp"], "frequency": "managed",
        })
        self.assertFalse(s.is_valid())


class WeeklyReportSerializerTests(TestCase):

    def test_camel_case_projection(self):
        report = WeeklyReportFactory()
        data = WeeklyReportSerializer(report).data
        self.assertIn("periodStart", data)
        self.assertIn("periodEnd", data)
        self.assertIn("range", data)
        self.assertIn("physician", data)
        self.assertIn("nurse", data)
        self.assertIn("statusTitle", data)
        self.assertIn("nextSteps", data)
        self.assertIn("labs", data)