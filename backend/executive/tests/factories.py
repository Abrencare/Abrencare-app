"""Factory fixtures for the executive test suite."""

import uuid
from datetime import timedelta

import factory
from django.contrib.auth import get_user_model
from django.utils import timezone

from executive.models import (
    CareTeamMember,
    EmergencyEvent,
    EmergencyTimelineStep,
    ExecutiveProfile,
    HealthAlert,
    HealthProgrammeItem,
    HealthScoreSnapshot,
    LabResult,
    Medication,
    MedicationAlert,
    MedicationSchedule,
    Reading,
    UpcomingCare,
    WeeklyReport,
)
from services.models import Service, UserService

User = get_user_model()


class UserFactory(factory.django.DjangoModelFactory):
    class Meta:
        model = User
        django_get_or_create = ("email",)

    email = factory.Sequence(lambda n: f"user{n}@example.com")
    first_name = "Test"
    last_name = factory.Sequence(lambda n: f"User{n}")
    password = factory.PostGenerationMethodCall("set_password", "testpass123")
    gender = "prefer_not"
    date_of_birth = None
    height = None
    weight = None


class ServiceFactory(factory.django.DjangoModelFactory):
    class Meta:
        model = Service
        django_get_or_create = ("code",)

    code = "executive"
    name = "Executive Health"


class UserServiceFactory(factory.django.DjangoModelFactory):
    class Meta:
        model = UserService

    user = factory.SubFactory(UserFactory)
    service = factory.SubFactory(ServiceFactory)
    onboarded = False


class ExecutiveProfileFactory(factory.django.DjangoModelFactory):
    class Meta:
        model = ExecutiveProfile

    user_service = factory.SubFactory(UserServiceFactory)
    created_by = factory.LazyAttribute(lambda o: o.user_service.user)
    name = factory.LazyAttribute(lambda o: o.user_service.user.full_name)
    monitoring = ["bp", "heartRate"]
    frequency = "managed"


# ---------------------------------------------------------------------------
# Clinical fixtures
# ---------------------------------------------------------------------------

class HealthScoreSnapshotFactory(factory.django.DjangoModelFactory):
    class Meta:
        model = HealthScoreSnapshot

    executive_profile = factory.SubFactory(ExecutiveProfileFactory)
    score = 87
    caption = "Stable"


class ReadingFactory(factory.django.DjangoModelFactory):
    class Meta:
        model = Reading

    executive_profile = factory.SubFactory(ExecutiveProfileFactory)
    metric = "bp"
    value_numeric = 118
    value_secondary = 76
    unit = "mmHg"
    display_value = "118/76 mmHg"
    status = "normal"


class HealthAlertFactory(factory.django.DjangoModelFactory):
    class Meta:
        model = HealthAlert

    executive_profile = factory.SubFactory(ExecutiveProfileFactory)
    severity = "info"
    title = "Routine alert"
    body = ""
    resolved = False


class CareTeamMemberFactory(factory.django.DjangoModelFactory):
    class Meta:
        model = CareTeamMember

    executive_profile = factory.SubFactory(ExecutiveProfileFactory)
    role = "manager"
    full_name = "Nurse Sarah"
    title = "Primary Care Nurse"
    phone = "+1 555 0100"
    available = True


class UpcomingCareFactory(factory.django.DjangoModelFactory):
    class Meta:
        model = UpcomingCare

    executive_profile = factory.SubFactory(ExecutiveProfileFactory)
    title = "Cardiology review"
    scheduled_for = factory.LazyFunction(
        lambda: timezone.now() + timedelta(days=3),
    )
    provided_by = "Dr. Ada"


# ---------------------------------------------------------------------------
# Emergency
# ---------------------------------------------------------------------------

class EmergencyEventFactory(factory.django.DjangoModelFactory):
    class Meta:
        model = EmergencyEvent

    executive_profile = factory.SubFactory(ExecutiveProfileFactory)
    response_id = factory.LazyFunction(
        lambda: f"EMG-{uuid.uuid4().hex[:8].upper()}"
    )
    status = "active"
    eta_minutes = 15


class EmergencyTimelineStepFactory(factory.django.DjangoModelFactory):
    class Meta:
        model = EmergencyTimelineStep

    event = factory.SubFactory(EmergencyEventFactory)
    label = "Emergency activated"
    status = "completed"
    order = 0


# ---------------------------------------------------------------------------
# Medication
# ---------------------------------------------------------------------------

class MedicationFactory(factory.django.DjangoModelFactory):
    class Meta:
        model = Medication

    executive_profile = factory.SubFactory(ExecutiveProfileFactory)
    name = "Lisinopril"
    purpose = "Blood pressure"
    dosage = "10mg"
    active = True


class MedicationScheduleFactory(factory.django.DjangoModelFactory):
    class Meta:
        model = MedicationSchedule

    medication = factory.SubFactory(MedicationFactory)
    scheduled_for = factory.LazyFunction(
        lambda: timezone.now() + timedelta(hours=2),
    )
    status = "upcoming"
    taken_at = None

    class Params:
        # Usage: MedicationScheduleFactory(taken=True)
        taken = factory.Trait(
            status="taken",
            taken_at=factory.LazyFunction(timezone.now),
        )


class MedicationAlertFactory(factory.django.DjangoModelFactory):
    class Meta:
        model = MedicationAlert

    executive_profile = factory.SubFactory(ExecutiveProfileFactory)
    medication = factory.SubFactory(
        MedicationFactory,
        executive_profile=factory.SelfAttribute("..executive_profile"),
    )
    priority = "reminder"
    message = "Take with food"
    resolved = False


# ---------------------------------------------------------------------------
# Programme / reports
# ---------------------------------------------------------------------------

class HealthProgrammeItemFactory(factory.django.DjangoModelFactory):
    class Meta:
        model = HealthProgrammeItem

    executive_profile = factory.SubFactory(ExecutiveProfileFactory)
    title = "Vital monitoring"
    subtitle = "Weekly check"
    status = "on"
    icon_key = "pulse-outline"
    order = 0


class LabResultFactory(factory.django.DjangoModelFactory):
    class Meta:
        model = LabResult

    executive_profile = factory.SubFactory(ExecutiveProfileFactory)
    category = "Metabolic"
    name = "HbA1c"
    value = "5.6 %"
    value_numeric = 5.6
    unit = "%"
    tone = "normal"


class WeeklyReportFactory(factory.django.DjangoModelFactory):
    class Meta:
        model = WeeklyReport

    executive_profile = factory.SubFactory(ExecutiveProfileFactory)
    period = "week"
    period_start = factory.LazyFunction(lambda: timezone.now().date() - timedelta(days=7))
    period_end = factory.LazyFunction(lambda: timezone.now().date())
    label = "WEEKLY HEALTH REPORT"
    range_label = "Nov 11 – Nov 17, 2024"
    status_title = "Stable"
    status_summary = "All metrics within range."