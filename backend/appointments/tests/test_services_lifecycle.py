import pytest

from appointments.exceptions import InvalidAppointmentTransition
from appointments.models import Appointment
from appointments.services import (
    assert_reschedulable,
    cancel_appointment,
    complete_appointment,
    confirm_appointment,
    mark_no_show,
)
from .factories import AppointmentFactory, UserFactory
from unittest.mock import MagicMock, PropertyMock
pytestmark = pytest.mark.django_db


class TestConfirm:
    def test_pending_to_confirmed(self, appointment):
        appointment = confirm_appointment(appointment)
        assert appointment.status == Appointment.Status.CONFIRMED
        assert appointment.confirmed_at is not None

    def test_confirmed_to_confirmed_raises(self, appointment):
        appointment.status = Appointment.Status.CONFIRMED
        appointment.save()
        with pytest.raises(InvalidAppointmentTransition):
            confirm_appointment(appointment)

    def test_completed_to_confirmed_raises(self, appointment):
        appointment.status = Appointment.Status.COMPLETED
        appointment.save()
        with pytest.raises(InvalidAppointmentTransition):
            confirm_appointment(appointment)


class TestComplete:
    def test_confirmed_to_completed(self, appointment):
        appointment.status = Appointment.Status.CONFIRMED
        appointment.save()
        appointment = complete_appointment(appointment)
        assert appointment.status == Appointment.Status.COMPLETED
        assert appointment.completed_at is not None

    def test_pending_to_completed_raises(self, appointment):
        with pytest.raises(InvalidAppointmentTransition):
            complete_appointment(appointment)


class TestNoShow:
    def test_confirmed_to_no_show(self, appointment):
        appointment.status = Appointment.Status.CONFIRMED
        appointment.save()
        appointment = mark_no_show(appointment)
        assert appointment.status == Appointment.Status.NO_SHOW

    def test_pending_to_no_show_raises(self, appointment):
        with pytest.raises(InvalidAppointmentTransition):
            mark_no_show(appointment)


class TestCancel:
    def test_pending_can_be_cancelled(self, appointment):
        cancelled = cancel_appointment(
            appointment=appointment, user=appointment.patient, reason="changed mind"
        )
        assert cancelled.status == Appointment.Status.CANCELLED
        assert cancelled.cancelled_by == appointment.patient
        assert cancelled.cancellation_reason == "changed mind"
        assert cancelled.cancelled_at is not None

    def test_confirmed_can_be_cancelled(self, appointment):
        appointment.status = Appointment.Status.CONFIRMED
        appointment.save()
        cancelled = cancel_appointment(
            appointment=appointment, user=appointment.patient
        )
        assert cancelled.status == Appointment.Status.CANCELLED

    def test_completed_cannot_be_cancelled(self, appointment):
        appointment.status = Appointment.Status.COMPLETED
        appointment.save()
        with pytest.raises(InvalidAppointmentTransition):
            cancel_appointment(appointment=appointment, user=appointment.patient)

    def test_cancel_is_idempotent_blocked(self, appointment):
        cancel_appointment(appointment=appointment, user=appointment.patient)
        with pytest.raises(InvalidAppointmentTransition):
            cancel_appointment(appointment=appointment, user=appointment.patient)

    def test_cancel_delegates_to_consultation_when_attached(self, appointment, mocker):
        fake_consultation = mocker.MagicMock()

        # Patch the reverse descriptor's __get__ so appointment.consultation
        # returns our fake without touching the DB.
        mocker.patch.object(
            type(appointment),
            "consultation",
            new_callable=PropertyMock,
            return_value=fake_consultation,
        )

        cancel_service = mocker.patch(
            "consultations.services.services.cancel_consultation",
            return_value=fake_consultation,
        )
        mocker.patch(
            "consultations.services.consultation_notification_service."
            "ConsultationNotificationService.consultation_cancelled"
        )

        cancel_appointment(appointment=appointment, user=appointment.patient)
        cancel_service.assert_called_once()


class TestAssertReschedulable:
    def test_pending_is_reschedulable(self, appointment):
        assert_reschedulable(appointment)  # no raise

    def test_confirmed_is_reschedulable(self, appointment):
        appointment.status = Appointment.Status.CONFIRMED
        assert_reschedulable(appointment)

    def test_completed_is_not_reschedulable(self, appointment):
        appointment.status = Appointment.Status.COMPLETED
        with pytest.raises(InvalidAppointmentTransition):
            assert_reschedulable(appointment)

    def test_with_consultation_is_not_reschedulable(self, appointment, mocker):
        mocker.patch.object(
            type(appointment), "consultation", mocker.MagicMock(), create=True
        )
        appointment.consultation = mocker.MagicMock()
        with pytest.raises(InvalidAppointmentTransition):
            assert_reschedulable(appointment)