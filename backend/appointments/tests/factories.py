import factory
from django.contrib.auth import get_user_model
from django.utils import timezone
from factory.django import DjangoModelFactory

from appointments.models import Appointment
from doctors.models import Doctor, Specialty


User = get_user_model()


class UserFactory(DjangoModelFactory):
    class Meta:
        model = User
        skip_postgeneration_save = True 

    username = factory.Sequence(lambda n: f"user{n}")
    email = factory.Sequence(lambda n: f"user{n}@example.com")
    first_name = "Test"
    last_name = factory.Sequence(lambda n: f"User{n}")
    password = factory.PostGenerationMethodCall("set_password", "pass1234")

class SpecialtyFactory(DjangoModelFactory):
    class Meta:
        model = Specialty

    name = factory.Sequence(lambda n: f"Specialty {n}")
    # Add any other required fields:
    # description = "Test specialty"

class DoctorFactory(DjangoModelFactory):
    class Meta:
        model = Doctor
        skip_postgeneration_save = True 

    user = factory.SubFactory(UserFactory)
    specialty = factory.SubFactory(SpecialtyFactory) 
    approval_status = Doctor.ApprovalStatus.APPROVED
    consultation_duration = 30 
    license_number = factory.Sequence(lambda n: f"LIC-{n:06d}") 

    @factory.post_generation
    def availability(self, create, extracted, **kwargs):
        if not create:
            return
        for day in ("monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"):
            AvailabilityFactory(doctor=self, day=day)


class AvailabilityFactory(DjangoModelFactory):
    class Meta:
        model = "doctors.DoctorAvailability"   # adjust app_label if needed

    doctor = factory.SubFactory(DoctorFactory)
    day = "monday"
    start_time = "09:00"
    end_time = "17:00"
    is_available = True


class AppointmentFactory(DjangoModelFactory):
    class Meta:
        model = Appointment
        skip_postgeneration_save = True

    patient = factory.SubFactory(UserFactory)
    doctor = factory.SubFactory(DoctorFactory)
    appointment_date = factory.LazyFunction(
        lambda: timezone.localdate() + timezone.timedelta(days=1)
    )
    appointment_time = "10:00"
    duration_minutes = 30
    appointment_type = Appointment.AppointmentType.DOCTOR_VISIT
    status = Appointment.Status.PENDING