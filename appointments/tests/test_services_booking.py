import pytest
from datetime import time, timedelta
from django.utils import timezone

from appointments.exceptions import AppointmentNotBookable, AppointmentSlotTaken
from appointments.models import Appointment
from appointments.services import book_appointment, reschedule_appointment
from .factories import AppointmentFactory, UserFactory

pytestmark = pytest.mark.django_db


class TestBookAppointment:
    def test_auto_confirms_valid_doctor_visit(self, patient, doctor, next_weekday):
        appt = book_appointment(
            patient=patient,
            doctor=doctor,
            appointment_type=Appointment.AppointmentType.DOCTOR_VISIT,
            appointment_date=next_weekday,
            appointment_time=time(10, 0),
            duration_minutes=30,
            auto_confirm=True,
        )
        assert appt.status == Appointment.Status.CONFIRMED
        assert appt.confirmed_at is not None

    def test_pending_when_auto_confirm_false(self, patient, doctor, next_weekday):
        appt = book_appointment(
            patient=patient,
            doctor=doctor,
            appointment_type=Appointment.AppointmentType.DOCTOR_VISIT,
            appointment_date=next_weekday,
            appointment_time=time(10, 0),
            duration_minutes=30,
            auto_confirm=False,
        )
        assert appt.status == Appointment.Status.PENDING

    def test_overlap_raises_not_bookable(self, patient, doctor, next_weekday):
        AppointmentFactory(
            patient=patient,
            doctor=doctor,
            appointment_date=next_weekday,
            appointment_time=time(10, 0),
            duration_minutes=30,
        )
        with pytest.raises(AppointmentNotBookable) as exc:
            book_appointment(
                patient=UserFactory(),
                doctor=doctor,
                appointment_type=Appointment.AppointmentType.DOCTOR_VISIT,
                appointment_date=next_weekday,
                appointment_time=time(10, 15),
                duration_minutes=30,
            )
        assert "appointment_time" in exc.value.errors

    def test_outside_availability_raises(self, patient, doctor, next_weekday):
        with pytest.raises(AppointmentNotBookable):
            book_appointment(
                patient=patient,
                doctor=doctor,
                appointment_type=Appointment.AppointmentType.DOCTOR_VISIT,
                appointment_date=next_weekday,
                appointment_time=time(3, 0),
                duration_minutes=30,
            )

    def test_past_date_raises(self, patient, doctor):
        yesterday = timezone.localdate() - timedelta(days=1)
        with pytest.raises(AppointmentNotBookable):
            book_appointment(
                patient=patient,
                doctor=doctor,
                appointment_type=Appointment.AppointmentType.DOCTOR_VISIT,
                appointment_date=yesterday,
                appointment_time=time(10, 0),
                duration_minutes=30,
            )

    def test_notification_fires_after_commit(
        self, patient, doctor, next_weekday, mocker, django_capture_on_commit_callbacks
    ):
        notify = mocker.patch(
            "appointments.services.booking.AppointmentNotificationService.notify_created"
        )
        with django_capture_on_commit_callbacks(execute=True):
            appt = book_appointment(
                patient=patient,
                doctor=doctor,
                appointment_type=Appointment.AppointmentType.DOCTOR_VISIT,
                appointment_date=next_weekday,
                appointment_time=time(10, 0),
                duration_minutes=30,
            )
        notify.assert_called_once_with(appt)

    def test_integrity_error_maps_to_slot_taken(self, patient, doctor, next_weekday, mocker):
        mocker.patch(
            "appointments.models.Appointment.save",
            side_effect=__import__("django").db.IntegrityError("dupe"),
        )
        with pytest.raises(AppointmentSlotTaken):
            book_appointment(
                patient=patient,
                doctor=doctor,
                appointment_type=Appointment.AppointmentType.DOCTOR_VISIT,
                appointment_date=next_weekday,
                appointment_time=time(10, 0),
                duration_minutes=30,
            )


class TestRescheduleAppointment:
    def test_moves_slot_and_reverts_to_pending(self, appointment, next_weekday):
        appointment.status = Appointment.Status.CONFIRMED
        appointment.save()
        new_date = appointment.appointment_date + timedelta(days=1)
        # ensure availability for the new weekday
        from .factories import AvailabilityFactory
        AvailabilityFactory(
            doctor=appointment.doctor,
            day=new_date.strftime("%A").lower(),
            start_time="08:00",
            end_time="18:00",
        )

        appt = reschedule_appointment(
            appointment=appointment,
            appointment_date=new_date,
            appointment_time=time(14, 0),
        )
        assert appt.appointment_date == new_date
        assert appt.status == Appointment.Status.PENDING
        assert appt.confirmed_at is None

    def test_conflict_raises_slot_taken(self, appointment):
        from appointments.exceptions import AppointmentNotBookable

        AppointmentFactory(
            patient=UserFactory(),
            doctor=appointment.doctor,
            appointment_date=appointment.appointment_date,
            appointment_time=time(11, 0),
            duration_minutes=30,
        )
        with pytest.raises(AppointmentNotBookable):
            reschedule_appointment(
                appointment=appointment,
                appointment_date=appointment.appointment_date,
                appointment_time=time(11, 0),
            )

    def test_notification_fires_after_commit(
        self, appointment, mocker, django_capture_on_commit_callbacks
    ):
        notify = mocker.patch(
            "appointments.services.booking.AppointmentNotificationService.notify_rescheduled"
        )
        with django_capture_on_commit_callbacks(execute=True):
            reschedule_appointment(
                appointment=appointment,
                appointment_date=appointment.appointment_date,
                appointment_time=time(14, 0),
            )
        assert notify.called
