import pytest
from datetime import time, timedelta
from django.urls import reverse
from django.utils import timezone

from appointments.models import Appointment
from .factories import AppointmentFactory, DoctorFactory, UserFactory

pytestmark = pytest.mark.django_db


# ---------------------------------------------------------------------------
# List + Create
# ---------------------------------------------------------------------------

class TestListCreateView:
    def test_unauthenticated_returns_403(self, api_client):
        resp = api_client.get(reverse("appointments:list-create"))
        assert resp.status_code == 403

    def test_unauthenticated_is_rejected(self, api_client):
        resp = api_client.get(reverse("appointments:list-create"))
        assert resp.status_code in (401, 403)

    def test_patient_sees_only_own(self, auth_client, appointment):
        other = AppointmentFactory()
        client = auth_client(appointment.patient)
        resp = client.get(reverse("appointments:list-create"))
        assert resp.status_code == 200
        assert resp.data["count"] == 1

    def test_doctor_sees_only_own(self, auth_client, appointment):
        AppointmentFactory()
        client = auth_client(appointment.doctor.user)
        resp = client.get(reverse("appointments:list-create"))
        assert resp.status_code == 200
        assert resp.data["count"] == 1

    def test_staff_sees_all(self, auth_client, appointment, staff_user):
        AppointmentFactory()
        client = auth_client(staff_user)
        resp = client.get(reverse("appointments:list-create"))
        assert resp.status_code == 200
        assert resp.data["count"] == 2

    def test_filter_by_status(self, auth_client, appointment):
        AppointmentFactory(status=Appointment.Status.CANCELLED)
        client = auth_client(appointment.patient)
        resp = client.get(
            reverse("appointments:list-create"), {"status": "pending"}
        )
        assert resp.status_code == 200
        assert resp.data["count"] == 1

    def test_doctor_cannot_create(self, auth_client, appointment):
        client = auth_client(appointment.doctor.user)
        resp = client.post(
            reverse("appointments:list-create"),
            {
                "doctor": appointment.doctor.pk,
                "appointment_date": str(appointment.appointment_date),
                "appointment_time": "15:00",
            },
        )
        assert resp.status_code == 403

    def test_patient_creates_doctor_visit_auto_confirmed(
        self, auth_client, patient, doctor, next_weekday
    ):
        client = auth_client(patient)
        resp = client.post(
            reverse("appointments:list-create"),
            {
                "doctor": doctor.pk,
                "appointment_date": str(next_weekday),
                "appointment_time": "14:00",
            },
        )
        assert resp.status_code == 201, resp.data
        assert resp.data["status"] == Appointment.Status.CONFIRMED

    def test_mobile_payload_shape_creates_appointment(self, auth_client, patient, next_weekday):
        client = auth_client(patient)
        resp = client.post(
            reverse("appointments:list-create"),
            {
                "date": str(next_weekday),
                "time": "14:00",
                "type": "nurseCheck",       # ← doesn't require a doctor
                "withName": "Nurse Joy",
                "reminderMinutes": 30,
            },
            format="json",
        )
        assert resp.status_code == 201, resp.data
        assert resp.data["withName"] == "Nurse Joy"
        assert resp.data["type"] == "nurseCheck"

    def test_overlap_returns_400(self, auth_client, appointment):
        client = auth_client(appointment.patient)
        resp = client.post(
            reverse("appointments:list-create"),
            {
                "doctor": appointment.doctor.pk,
                "appointment_date": str(appointment.appointment_date),
                "appointment_time": "10:15",
            },
        )
        assert resp.status_code == 400
        assert "appointment_time" in resp.data


# ---------------------------------------------------------------------------
# Mine
# ---------------------------------------------------------------------------

class TestMineView:
    def test_returns_only_active_non_consultations(
        self, auth_client, appointment
    ):
        # Cancelled should not appear
        AppointmentFactory(
            patient=appointment.patient, status=Appointment.Status.CANCELLED
        )
        client = auth_client(appointment.patient)
        resp = client.get(reverse("appointments:mine"))
        assert resp.status_code == 200
        assert len(resp.data) == 1

    def test_other_patient_gets_empty_list(self, auth_client, appointment):
        client = auth_client(UserFactory())
        resp = client.get(reverse("appointments:mine"))
        assert resp.status_code == 200
        assert resp.data == []


# ---------------------------------------------------------------------------
# Detail
# ---------------------------------------------------------------------------

class TestDetailView:
    def test_patient_retrieves_own(self, auth_client, appointment):
        client = auth_client(appointment.patient)
        resp = client.get(reverse("appointments:detail", args=[appointment.pk]))
        assert resp.status_code == 200

    def test_stranger_gets_403(self, auth_client, appointment):
        client = auth_client(UserFactory())
        resp = client.get(reverse("appointments:detail", args=[appointment.pk]))
        assert resp.status_code == 403

    def test_patch_reminder(self, auth_client, appointment):
        client = auth_client(appointment.patient)
        resp = client.patch(
            reverse("appointments:detail", args=[appointment.pk]),
            {"reminderMinutes": 15},
            format="json",
        )
        assert resp.status_code == 200
        appointment.refresh_from_db()
        assert appointment.reminder_minutes == 15

    def test_delete_soft_cancels(self, auth_client, appointment):
        client = auth_client(appointment.patient)
        resp = client.delete(reverse("appointments:detail", args=[appointment.pk]))
        assert resp.status_code == 204
        appointment.refresh_from_db()
        assert appointment.status == Appointment.Status.CANCELLED


# ---------------------------------------------------------------------------
# Cancel
# ---------------------------------------------------------------------------

class TestCancelView:
    def test_cancel_with_reason(self, auth_client, appointment):
        client = auth_client(appointment.patient)
        resp = client.post(
            reverse("appointments:cancel", args=[appointment.pk]),
            {"cancellation_reason": "flu"},
        )
        assert resp.status_code == 200
        appointment.refresh_from_db()
        assert appointment.cancellation_reason == "flu"
        assert appointment.status == Appointment.Status.CANCELLED

    def test_cancel_completed_returns_400(self, auth_client, appointment):
        appointment.status = Appointment.Status.COMPLETED
        appointment.save()
        client = auth_client(appointment.patient)
        resp = client.post(reverse("appointments:cancel", args=[appointment.pk]))
        assert resp.status_code == 400

    def test_stranger_cannot_cancel(self, auth_client, appointment):
        client = auth_client(UserFactory())
        resp = client.post(reverse("appointments:cancel", args=[appointment.pk]))
        assert resp.status_code == 403


# ---------------------------------------------------------------------------
# Confirm / Complete / No-show
# ---------------------------------------------------------------------------

class TestTransitionViews:
    def test_doctor_can_confirm(self, auth_client, appointment):
        client = auth_client(appointment.doctor.user)
        resp = client.post(reverse("appointments:confirm", args=[appointment.pk]))
        assert resp.status_code == 200
        appointment.refresh_from_db()
        assert appointment.status == Appointment.Status.CONFIRMED

    def test_patient_cannot_confirm(self, auth_client, appointment):
        client = auth_client(appointment.patient)
        resp = client.post(reverse("appointments:confirm", args=[appointment.pk]))
        assert resp.status_code == 403

    def test_confirm_when_already_confirmed_returns_400(
        self, auth_client, appointment
    ):
        appointment.status = Appointment.Status.CONFIRMED
        appointment.save()
        client = auth_client(appointment.doctor.user)
        resp = client.post(reverse("appointments:confirm", args=[appointment.pk]))
        assert resp.status_code == 400

    def test_complete_requires_confirmed(self, auth_client, appointment):
        client = auth_client(appointment.doctor.user)
        # pending -> complete should fail
        resp = client.post(reverse("appointments:complete", args=[appointment.pk]))
        assert resp.status_code == 400

        appointment.status = Appointment.Status.CONFIRMED
        appointment.save()
        resp = client.post(reverse("appointments:complete", args=[appointment.pk]))
        assert resp.status_code == 200
        appointment.refresh_from_db()
        assert appointment.status == Appointment.Status.COMPLETED

    def test_no_show_requires_confirmed(self, auth_client, appointment):
        appointment.status = Appointment.Status.CONFIRMED
        appointment.save()
        client = auth_client(appointment.doctor.user)
        resp = client.post(reverse("appointments:no-show", args=[appointment.pk]))
        assert resp.status_code == 200
        appointment.refresh_from_db()
        assert appointment.status == Appointment.Status.NO_SHOW


# ---------------------------------------------------------------------------
# Reschedule
# ---------------------------------------------------------------------------

class TestRescheduleView:
    def test_patient_can_reschedule(self, auth_client, appointment):
        client = auth_client(appointment.patient)
        resp = client.post(
            reverse("appointments:reschedule", args=[appointment.pk]),
            {
                "appointment_date": str(appointment.appointment_date),
                "appointment_time": "15:00",
                "reason_for_visit": "moved",
            },
        )
        assert resp.status_code == 200, resp.data
        appointment.refresh_from_db()
        assert appointment.appointment_time == time(15, 0)

    def test_doctor_cannot_reschedule(self, auth_client, appointment):
        client = auth_client(appointment.doctor.user)
        resp = client.post(
            reverse("appointments:reschedule", args=[appointment.pk]),
            {
                "appointment_date": str(appointment.appointment_date),
                "appointment_time": "15:00",
            },
        )
        assert resp.status_code == 403

    def test_reschedule_completed_returns_400(self, auth_client, appointment):
        appointment.status = Appointment.Status.COMPLETED
        appointment.save()
        client = auth_client(appointment.patient)
        resp = client.post(
            reverse("appointments:reschedule", args=[appointment.pk]),
            {
                "appointment_date": str(appointment.appointment_date),
                "appointment_time": "15:00",
            },
        )
        assert resp.status_code == 400

    def test_reschedule_to_conflicting_slot_returns_400(
        self, auth_client, appointment
    ):
        AppointmentFactory(
            patient=UserFactory(),
            doctor=appointment.doctor,
            appointment_date=appointment.appointment_date,
            appointment_time=time(11, 0),
        )
        client = auth_client(appointment.patient)
        resp = client.post(
            reverse("appointments:reschedule", args=[appointment.pk]),
            {
                "appointment_date": str(appointment.appointment_date),
                "appointment_time": "11:15",
            },
        )
        assert resp.status_code == 400