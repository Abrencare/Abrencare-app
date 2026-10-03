# consultations/tests/factories.py
from datetime import time, timedelta

import factory
from django.contrib.auth import get_user_model
from django.utils import timezone

from appointments.models import Appointment
from consultations.models import Consultation, ConsultationProfile, Prescription
from doctors.models import Doctor, DoctorAvailability, Specialty
from patients.models import Patient
from services.models import Service, UserService

User = get_user_model()


# ============================================================
# USER
# ============================================================

class UserFactory(factory.django.DjangoModelFactory):
    """
    `full_name` on User is a @property (f"{first_name} {last_name}".strip()),
    so we do NOT pass it as a kwarg. get_or_create validates against real
    DB columns only.
    """

    class Meta:
        model = User
        django_get_or_create = ("username",)
        skip_postgeneration_save = True

    username = factory.Sequence(lambda n: f"user{n}")
    email = factory.LazyAttribute(lambda o: f"{o.username}@example.com")
    first_name = factory.Faker("first_name")
    last_name = factory.Faker("last_name")
    password = factory.PostGenerationMethodCall("set_password", "pw12345!")


# ============================================================
# SPECIALTY / DOCTOR / AVAILABILITY
# ============================================================

class SpecialtyFactory(factory.django.DjangoModelFactory):
    class Meta:
        model = Specialty

    name = factory.Sequence(lambda n: f"Specialty {n}")
    is_active = True


class DoctorFactory(factory.django.DjangoModelFactory):
    class Meta:
        model = Doctor

    user = factory.SubFactory(UserFactory)
    specialty = factory.SubFactory(SpecialtyFactory)
    approval_status = Doctor.ApprovalStatus.APPROVED
    license_number = factory.Sequence(lambda n: f"LIC-{n:06d}")
    consultation_fee = 500
    consultation_duration = 30
    years_of_experience = 5


class DoctorAvailabilityFactory(factory.django.DjangoModelFactory):
    class Meta:
        model = DoctorAvailability

    doctor = factory.SubFactory(DoctorFactory)
    day = factory.LazyFunction(
        lambda: (timezone.localdate() + timedelta(days=1)).strftime("%A").lower()
    )
    start_time = time(8, 0)
    end_time = time(18, 0)
    is_available = True


# ============================================================
# PATIENT PROFILE
# ============================================================
# Patient has `user = OneToOneField(User, related_name="patient_profile")`.
# Passing `PatientFactory(user=some_user)` links the profile to that user.

class PatientFactory(factory.django.DjangoModelFactory):
    class Meta:
        model = Patient          # ← Patient, not User

    user = factory.SubFactory(UserFactory)


# ============================================================
# SERVICES
# ============================================================

class ConsultationServiceFactory(factory.django.DjangoModelFactory):
    class Meta:
        model = Service
        django_get_or_create = ("code",)

    code = "consultation"
    name = "Consultation"


class UserServiceFactory(factory.django.DjangoModelFactory):
    class Meta:
        model = UserService

    user = factory.SubFactory(UserFactory)
    service = factory.SubFactory(ConsultationServiceFactory)


class ConsultationProfileFactory(factory.django.DjangoModelFactory):
    class Meta:
        model = ConsultationProfile

    user_service = factory.SubFactory(UserServiceFactory)


# ============================================================
# APPOINTMENT
# ============================================================
# Appointment.patient is a FK to AUTH_USER_MODEL (a User).
# Appointment.save() calls full_clean(), which requires the doctor to have
# a DoctorAvailability row covering the appointment weekday and time. The
# post-generation hook ensures that automatically.

class AppointmentFactory(factory.django.DjangoModelFactory):
    class Meta:
        model = Appointment
        skip_postgeneration_save = True

    patient = factory.SubFactory(UserFactory)
    doctor = factory.SubFactory(DoctorFactory)
    appointment_date = factory.LazyFunction(
        lambda: timezone.localdate() + timedelta(days=1)
    )
    appointment_time = time(10, 0)
    duration_minutes = 30
    status = Appointment.Status.CONFIRMED

    @classmethod
    def _create(cls, model_class, *args, **kwargs):
        # Ensure the doctor has availability BEFORE the model saves,
        # because Appointment.save() runs full_clean().
        doctor = kwargs.get("doctor")
        appointment_date = kwargs.get("appointment_date")
        appointment_time = kwargs.get("appointment_time")
        if doctor and appointment_date and appointment_time:
            weekday = appointment_date.strftime("%A").lower()
            already = DoctorAvailability.objects.filter(
                doctor=doctor,
                day=weekday,
                is_available=True,
                start_time__lte=appointment_time,
                end_time__gte=appointment_time,
            ).exists()
            if not already:
                DoctorAvailability.objects.create(
                    doctor=doctor,
                    day=weekday,
                    start_time=time(0, 0),
                    end_time=time(23, 59),
                    is_available=True,
                )
        return super()._create(model_class, *args, **kwargs)

# ============================================================
# CONSULTATION / PRESCRIPTION
# ============================================================

class ConsultationFactory(factory.django.DjangoModelFactory):
    class Meta:
        model = Consultation

    appointment = factory.SubFactory(AppointmentFactory)
    consultation_type = Consultation.Type.VIDEO
    language = Consultation.Language.ENGLISH
    status = Consultation.Status.SCHEDULED
    price = 500
    currency = "ETB"
    meeting_url = "https://meet.example.com/test-room"


class PrescriptionFactory(factory.django.DjangoModelFactory):
    class Meta:
        model = Prescription

    consultation = factory.SubFactory(ConsultationFactory)
    medication = "Paracetamol"
    dosage = "500mg"
    frequency = "TID"
    duration = "5 days"
    instructions = "After meals"