import pytest
from datetime import time, timedelta
from django.core.exceptions import ValidationError
from django.db import IntegrityError, transaction
from django.utils import timezone

from appointments.models import Appointment, AppointmentCheckIn
from .factories import AppointmentFactory, DoctorFactory, UserFactory


pytestmark = pytest.mark.django_db


# ---------------------------------------------------------------------------
# Properties
# ---------------------------------------------------------------------------

class TestAppointmentProperties:
    def test_end_datetime_adds_duration(self, appointment):
        expected = appointment.start_datetime + timedelta(minutes=30)
        assert appointment.end_datetime == expected

    def test_end_time_reflects_duration(self, appointment):
        assert appointment.end_time.hour == 10
        assert appointment.end_time.minute == 30

    def test_is_active_true_for_pending_and_confirmed(self, appointment):
        appointment.status = Appointment.Status.PENDING
        assert appointment.is_active is True
        appointment.status = Appointment.Status.CONFIRMED
        assert appointment.is_active is True

    def test_is_active_false_for_terminal_statuses(self, appointment):
        for status in (
            Appointment.Status.COMPLETED,
            Appointment.Status.CANCELLED,
            Appointment.Status.NO_SHOW,
        ):
            appointment.status = status
            assert appointment.is_active is False

    def test_str_uses_provider_name_when_no_doctor(self, patient, next_weekday):
        appt = AppointmentFactory(
            patient=patient,
            doctor=None,
            provider_name="Nurse Joy",
            appointment_type=Appointment.AppointmentType.NURSE_CHECK,
            appointment_date=next_weekday,
            appointment_time="10:00",
        )
        assert "Nurse Joy" in str(appt)


# ---------------------------------------------------------------------------
# clean() — required fields
# ---------------------------------------------------------------------------

class TestAppointmentClean:
    def test_missing_date_raises(self, patient, doctor):
        appt = Appointment(
            patient=patient,
            doctor=doctor,
            appointment_time=time(10, 0),
            duration_minutes=30,
        )
        with pytest.raises(ValidationError) as exc:
            appt.clean()
        assert "appointment_date" in exc.value.message_dict

    def test_missing_time_raises(self, patient, doctor, next_weekday):
        appt = Appointment(
            patient=patient,
            doctor=doctor,
            appointment_date=next_weekday,
            duration_minutes=30,
        )
        with pytest.raises(ValidationError) as exc:
            appt.clean()
        assert "appointment_time" in exc.value.message_dict

    def test_missing_patient_raises(self, doctor, next_weekday):
        appt = Appointment(
            doctor=doctor,
            appointment_date=next_weekday,
            appointment_time=time(10, 0),
            duration_minutes=30,
        )
        with pytest.raises(ValidationError) as exc:
            appt.clean()
        assert "patient" in exc.value.message_dict

    def test_doctor_required_for_doctor_visit(self, patient, next_weekday):
        appt = Appointment(
            patient=patient,
            appointment_type=Appointment.AppointmentType.DOCTOR_VISIT,
            appointment_date=next_weekday,
            appointment_time=time(10, 0),
            duration_minutes=30,
        )
        with pytest.raises(ValidationError) as exc:
            appt.clean()
        assert "doctor" in exc.value.message_dict

    def test_doctor_optional_for_nurse_check(self, patient, next_weekday):
        appt = Appointment(
            patient=patient,
            appointment_type=Appointment.AppointmentType.NURSE_CHECK,
            provider_name="Nurse Joy",
            appointment_date=next_weekday,
            appointment_time=time(10, 0),
            duration_minutes=30,
        )
        # Should not raise
        appt.clean()


# ---------------------------------------------------------------------------
# clean() — business rules
# ---------------------------------------------------------------------------

class TestAppointmentCleanBusinessRules:
    def test_past_date_rejected(self, patient, doctor):
        yesterday = timezone.localdate() - timedelta(days=1)
        appt = Appointment(
            patient=patient,
            doctor=doctor,
            appointment_date=yesterday,
            appointment_time=time(10, 0),
            duration_minutes=30,
        )
        with pytest.raises(ValidationError) as exc:
            appt.clean()
        assert "appointment_date" in exc.value.message_dict

    def test_outside_availability_rejected(self, patient, doctor, next_weekday):
        # Doctor availability is 09:00–17:00; 06:00 is outside.
        appt = Appointment(
            patient=patient,
            doctor=doctor,
            appointment_date=next_weekday,
            appointment_time=time(6, 0),
            duration_minutes=30,
        )
        with pytest.raises(ValidationError) as exc:
            appt.clean()
        assert "appointment_time" in exc.value.message_dict

    def test_overlap_with_existing_rejected(self, appointment):
        overlapping = Appointment(
            patient=UserFactory(),
            doctor=appointment.doctor,
            appointment_date=appointment.appointment_date,
            appointment_time=time(10, 15),  # overlaps 10:00–10:30
            duration_minutes=30,
        )
        with pytest.raises(ValidationError) as exc:
            overlapping.clean()
        assert "appointment_time" in exc.value.message_dict

    def test_adjacent_appointment_allowed(self, appointment):
        # 10:30 starts exactly when 10:00–10:30 ends
        adjacent = Appointment(
            patient=UserFactory(),
            doctor=appointment.doctor,
            appointment_date=appointment.appointment_date,
            appointment_time=time(10, 30),
            duration_minutes=30,
        )
        adjacent.clean()  # should not raise


# ---------------------------------------------------------------------------
# Constraints
# ---------------------------------------------------------------------------

class TestAppointmentConstraints:
    def test_unique_active_slot_enforced(self, appointment):
        duplicate = Appointment(
            patient=UserFactory(),
            doctor=appointment.doctor,
            appointment_date=appointment.appointment_date,
            appointment_time=appointment.appointment_time,
            duration_minutes=30,
            status=Appointment.Status.PENDING,
        )
        with pytest.raises(IntegrityError):
            with transaction.atomic():
                duplicate.save(skip_clean=True) 

    def test_cancelled_slot_can_be_reused(self, appointment):
        appointment.status = Appointment.Status.CANCELLED
        appointment.save(skip_clean=True)

        # Same slot, new patient — should succeed at DB level.
        Appointment.objects.create(
            patient=UserFactory(),
            doctor=appointment.doctor,
            appointment_date=appointment.appointment_date,
            appointment_time=appointment.appointment_time,
            duration_minutes=30,
            status=Appointment.Status.PENDING,
        )


# ---------------------------------------------------------------------------
# save() auto-timestamps
# ---------------------------------------------------------------------------

class TestAppointmentSaveTimestamps:
    def test_confirmed_sets_confirmed_at(self, appointment):
        appointment.status = Appointment.Status.CONFIRMED
        appointment.save()
        assert appointment.confirmed_at is not None

    def test_completed_sets_completed_at(self, appointment):
        appointment.status = Appointment.Status.COMPLETED
        appointment.save()
        assert appointment.completed_at is not None

    def test_cancelled_sets_cancelled_at(self, appointment):
        appointment.status = Appointment.Status.CANCELLED
        appointment.save()
        assert appointment.cancelled_at is not None

    def test_timestamp_not_overwritten_on_resave(self, appointment):
        appointment.status = Appointment.Status.CONFIRMED
        appointment.save()
        first = appointment.confirmed_at
        appointment.save()
        assert appointment.confirmed_at == first


# ---------------------------------------------------------------------------
# initial_status_for
# ---------------------------------------------------------------------------

class TestInitialStatus:
    def test_auto_confirms_doctor_visit(self):
        assert (
            Appointment.initial_status_for("doctor_visit", auto_confirm=True)
            == Appointment.Status.CONFIRMED
        )

    def test_pending_when_auto_confirm_false(self):
        assert (
            Appointment.initial_status_for("doctor_visit", auto_confirm=False)
            == Appointment.Status.PENDING
        )

    def test_pending_for_types_not_auto_confirmed(self):
        # Adjust if you add more auto-confirm types
        assert (
            Appointment.initial_status_for("home_visit", auto_confirm=True)
            == Appointment.Status.PENDING
        )


# ---------------------------------------------------------------------------
# AppointmentCheckIn
# ---------------------------------------------------------------------------

class TestAppointmentCheckIn:

    def test_lat_lng_must_be_paired(self, appointment):
        from appointments.models import AppointmentCheckIn
        checkin = AppointmentCheckIn(
            appointment=appointment, latitude=9.0, longitude=None
        )
        with pytest.raises(ValidationError):
            checkin.full_clean()

    def test_default_checked_in_at_is_now(self, patient, doctor):
        today = timezone.localdate()
        appt = AppointmentFactory(
            patient=patient, doctor=doctor,
            appointment_date=today, appointment_time="10:00",
        )
        checkin = AppointmentCheckIn.objects.create(appointment=appt)
        assert checkin.checked_in_at is not None


    def test_gps_verified_auto_set_when_coords_present(self, patient, doctor):
        from decimal import Decimal
        today = timezone.localdate()
        appt = AppointmentFactory(
            patient=patient, doctor=doctor,
            appointment_date=today, appointment_time="10:00", 
        )
        checkin = AppointmentCheckIn.objects.create(
            appointment=appt,
            latitude=Decimal("9.012345"),
            longitude=Decimal("38.765432"),
        )
        checkin.refresh_from_db()
        assert checkin.gps_verified is True

    def test_cannot_check_in_before_appointment_date(self, appointment):
        from appointments.models import AppointmentCheckIn
        yesterday = timezone.now() - timedelta(days=2)
        checkin = AppointmentCheckIn(
            appointment=appointment, checked_in_at=yesterday
        )
        with pytest.raises(ValidationError):
            checkin.full_clean()