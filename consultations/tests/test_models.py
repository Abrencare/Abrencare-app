# consultations/tests/test_models.py
from freezegun import freeze_time

import pytest

from datetime import date, time, timedelta

from django.core.exceptions import ValidationError
from django.utils import timezone

from consultations.models import Consultation

from .factories import ConsultationFactory, AppointmentFactory


pytestmark = pytest.mark.django_db


class TestStartsAt:
    def test_returns_aware_datetime(self):
        appt = AppointmentFactory(
            appointment_date=timezone.localdate() + timedelta(days=1),
            appointment_time=time(10, 0),
        )
        c = ConsultationFactory(appointment=appt)
        assert c.starts_at is not None
        assert timezone.is_aware(c.starts_at)
        assert c.starts_at.hour == 10
        assert c.starts_at.minute == 0

    def test_returns_none_when_appointment_date_missing(self, consultation):
        consultation.appointment.appointment_date = None
        assert consultation.starts_at is None


class TestCanJoin:
    def _make(self, *, offset_minutes, status=Consultation.Status.SCHEDULED,
              meeting_url="https://meet.example.com/x"):
        now = timezone.localtime()
        target = now + timedelta(minutes=offset_minutes)
        appt = AppointmentFactory(
            appointment_date=target.date(),
            appointment_time=target.time().replace(second=0, microsecond=0),
        )
        return ConsultationFactory(
            appointment=appt, status=status, meeting_url=meeting_url,
        )


    @freeze_time("2026-08-30 10:05:00")
    def test_true_inside_early_window(self):
        # appointment at 10:10, join window opens 10:00 → still joinable
        appt = AppointmentFactory(
            appointment_date=date(2026, 8, 30),
            appointment_time=time(10, 10),
        )
        c = ConsultationFactory(appointment=appt)
        assert c.can_join is True

    @freeze_time("2026-08-30 10:05:00")
    def test_true_inside_late_window(self):
        c = self._make(offset_minutes=-15)
        assert c.can_join is True

    def test_false_too_early(self):
        c = self._make(offset_minutes=120)
        assert c.can_join is False

    def test_false_too_late(self):
        c = self._make(offset_minutes=-120)
        assert c.can_join is False

    def test_true_when_in_progress_regardless_of_time(self):
        c = self._make(offset_minutes=600, status=Consultation.Status.IN_PROGRESS)
        assert c.can_join is True

    def test_false_without_meeting_url(self):
        c = self._make(offset_minutes=5, meeting_url="")
        assert c.can_join is False

    def test_false_when_cancelled(self):
        c = self._make(
            offset_minutes=5, status=Consultation.Status.CANCELLED,
        )
        assert c.can_join is False


class TestCanCancel:
    @pytest.mark.parametrize("status, expected", [
        (Consultation.Status.SCHEDULED, True),
        (Consultation.Status.WAITING, True),
        (Consultation.Status.IN_PROGRESS, False),
        (Consultation.Status.COMPLETED, False),
        (Consultation.Status.CANCELLED, False),
        (Consultation.Status.NO_SHOW, False),
    ])
    def test_can_cancel_matrix(self, status, expected):
        c = ConsultationFactory(status=status)
        assert c.can_cancel is expected


class TestStatusTransitions:
    def test_scheduled_to_in_progress_is_allowed(self):
        c = ConsultationFactory(status=Consultation.Status.SCHEDULED)
        c.status = Consultation.Status.IN_PROGRESS
        c.full_clean()  # should not raise

    def test_completed_to_in_progress_is_rejected(self):
        c = ConsultationFactory(status=Consultation.Status.COMPLETED)
        c.status = Consultation.Status.IN_PROGRESS
        with pytest.raises(ValidationError):
            c.full_clean()

    def test_cancelled_to_in_progress_is_rejected(self):
        c = ConsultationFactory(status=Consultation.Status.CANCELLED)
        c.status = Consultation.Status.IN_PROGRESS
        with pytest.raises(ValidationError):
            c.full_clean()

    def test_same_status_is_allowed(self):
        c = ConsultationFactory(status=Consultation.Status.SCHEDULED)
        c.status = Consultation.Status.SCHEDULED
        c.full_clean()  # no-op transitions are fine