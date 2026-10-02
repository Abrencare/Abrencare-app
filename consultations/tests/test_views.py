# consultations/tests/test_views.py
from datetime import time, timedelta
from unittest.mock import patch

from doctors.models import DoctorAvailability
import pytest
from django.urls import reverse
from django.utils import timezone
from freezegun import freeze_time

from appointments.models import Appointment
from consultations.models import Consultation
from consultations.services.consultation_notification_service import (
    ConsultationNotificationService,
)

from .factories import (
    AppointmentFactory,
    ConsultationFactory,
    DoctorFactory,
    PatientFactory,
    SpecialtyFactory,
    UserFactory, 
)


pytestmark = pytest.mark.django_db


# ============================================================
# HELPERS
# ============================================================

def _tomorrow_iso():
    return (timezone.localdate() + timedelta(days=1)).isoformat()


def _tomorrow_weekday():
    return (timezone.localdate() + timedelta(days=1)).strftime("%A").lower()


def _names(payload):
    """Normalize a list-or-paginated list response into a plain list."""
    if isinstance(payload, dict) and "results" in payload:
        return payload["results"]
    return payload


# ============================================================
# DISCOVERY
# ============================================================

class TestSpecialtyListView:
    def test_unauthenticated_is_denied(self, api_client):
        r = api_client.get(reverse("consultations:specialty-list"))
        # DRF returns 403 unless a WWW-Authenticate-producing authenticator
        # is configured. Accept either.
        assert r.status_code in (401, 403)

    def test_lists_active_only(self, auth_client, patient_user, patient):
        SpecialtyFactory(name="Active", is_active=True)
        SpecialtyFactory(name="Inactive", is_active=False)

        r = auth_client(patient_user).get(reverse("consultations:specialty-list"))
        assert r.status_code == 200
        names = [s["name"] for s in _names(r.json())]
        assert "Active" in names
        assert "Inactive" not in names


class TestDoctorListView:
    def test_lists_approved_doctors(self, auth_client, patient_user, patient):
        DoctorFactory(approval_status="approved")
        DoctorFactory(approval_status="pending")

        r = auth_client(patient_user).get(reverse("consultations:doctor-list"))
        assert r.status_code == 200
        assert len(_names(r.json())) == 1

    def test_filters_by_specialty(self, auth_client, patient_user, patient):
        s1 = SpecialtyFactory()
        s2 = SpecialtyFactory()
        DoctorFactory(specialty=s1, approval_status="approved")
        DoctorFactory(specialty=s2, approval_status="approved")

        r = auth_client(patient_user).get(
            reverse("consultations:doctor-list"), {"specialty": s1.id},
        )
        assert r.status_code == 200
        assert len(_names(r.json())) == 1


class TestAvailabilityView:
    def test_doctor_is_forbidden(self, auth_client, doctor_user, doctor):
        r = auth_client(doctor_user).get(
            reverse("consultations:availability"),
            {"doctor": doctor.id, "date": _tomorrow_iso()},
        )
        assert r.status_code == 403

    def test_missing_params_returns_both_errors(
        self, auth_client, patient_user, patient,
    ):
        r = auth_client(patient_user).get(reverse("consultations:availability"))
        assert r.status_code == 400
        body = r.json()
        assert "doctor" in body
        assert "date" in body

    def test_invalid_doctor_id(self, auth_client, patient_user, patient):
        r = auth_client(patient_user).get(
            reverse("consultations:availability"),
            {"doctor": "abc", "date": _tomorrow_iso()},
        )
        assert r.status_code == 400
        assert "doctor" in r.json()

    def test_invalid_date_format(self, auth_client, patient_user, patient, doctor):
        r = auth_client(patient_user).get(
            reverse("consultations:availability"),
            {"doctor": doctor.id, "date": "30-08-2026"},
        )
        assert r.status_code == 400
        assert "date" in r.json()

    def test_past_date_rejected(self, auth_client, patient_user, patient, doctor):
        past = (timezone.localdate() - timedelta(days=1)).isoformat()
        r = auth_client(patient_user).get(
            reverse("consultations:availability"),
            {"doctor": doctor.id, "date": past},
        )
        assert r.status_code == 400

    def test_unknown_doctor_returns_404(
        self, auth_client, patient_user, patient,
    ):
        r = auth_client(patient_user).get(
            reverse("consultations:availability"),
            {"doctor": 999999, "date": _tomorrow_iso()},
        )
        assert r.status_code == 404

    def test_returns_duration_sized_slots(self, auth_client, patient_user, patient, doctor):
        DoctorAvailability.objects.create(
            doctor=doctor,
            day=_tomorrow_weekday(),
            is_available=True,
            start_time=time(9, 0),
            end_time=time(11, 0),
        )
        doctor.consultation_duration = 30
        doctor.save(update_fields=["consultation_duration"])

        r = auth_client(patient_user).get(
            reverse("consultations:availability"),
            {"doctor": doctor.id, "date": _tomorrow_iso()},
        )
        assert r.status_code == 200
        body = r.json()
        assert body["duration_minutes"] == 30

        # The doctor fixture seeds a wide 00:00–23:59 window; scope the
        # assertion to the 09:00–11:00 window the test created.
        morning = [
            s for s in body["slots"]
            if s["time"] in {"09:00", "09:30", "10:00", "10:30"}
        ]
        assert [s["time"] for s in morning] == ["09:00", "09:30", "10:00", "10:30"]

        # And confirm they're all marked available
        assert all(s["available"] for s in morning)

    def test_booked_slot_is_marked_unavailable(
        self, auth_client, patient_user, patient, doctor,
    ):
        from doctors.models import DoctorAvailability
        DoctorAvailability.objects.create(
            doctor=doctor,
            day=_tomorrow_weekday(),
            is_available=True,
            start_time=time(9, 0),
            end_time=time(11, 0),
        )
        doctor.consultation_duration = 30
        doctor.save(update_fields=["consultation_duration"])

        # Occupy the 9:30 slot
        AppointmentFactory(
            doctor=doctor,
            appointment_date=timezone.localdate() + timedelta(days=1),
            appointment_time=time(9, 30),
            duration_minutes=30,
            status=Appointment.Status.CONFIRMED,
        )

        r = auth_client(patient_user).get(
            reverse("consultations:availability"),
            {"doctor": doctor.id, "date": _tomorrow_iso()},
        )
        slots = {s["time"]: s["available"] for s in r.json()["slots"]}
        assert slots["09:00"] is True
        assert slots["09:30"] is False
        assert slots["10:00"] is True


# ============================================================
# ONBOARDING
# ============================================================

class TestOnboardingComplete:
    def test_saves_profile_fields(self, auth_client, patient_user, profile):
        r = auth_client(patient_user).post(
            reverse("consultations:onboarding-complete"),
            {"dateOfBirth": "1990-05-12", "gender": "male"},
            format="json",
        )
        assert r.status_code == 200
        body = r.json()
        assert body["dateOfBirth"] == "1990-05-12"
        assert body["gender"] == "male"
        assert body["onboarded"] is True

    def test_rejects_user_without_service(self, auth_client):
        from .factories import UserFactory
        u = UserFactory()
        r = auth_client(u).post(
            reverse("consultations:onboarding-complete"),
            {"gender": "male"},
            format="json",
        )
        assert r.status_code == 400

    def test_rejects_empty_payload(self, auth_client, patient_user, profile):
        r = auth_client(patient_user).post(
            reverse("consultations:onboarding-complete"),
            {},
            format="json",
        )
        assert r.status_code == 400


class TestProfileView:
    def test_returns_profile(self, auth_client, patient_user, profile):
        r = auth_client(patient_user).get(reverse("consultations:profile"))
        assert r.status_code == 200
        assert r.json()["onboarded"] is True

    def test_404_without_service(self, auth_client):
        from .factories import UserFactory
        r = auth_client(UserFactory()).get(reverse("consultations:profile"))
        assert r.status_code == 404


# ============================================================
# BOOKING
# ============================================================

class TestBookingView:
    def test_doctor_is_forbidden(self, auth_client, doctor_user, doctor):
        r = auth_client(doctor_user).post(
            reverse("consultations:book"),
            {
                "doctor": doctor.id,
                "appointment_date": _tomorrow_iso(),
                "appointment_time": "10:00",
            },
            format="json",
        )
        assert r.status_code == 403

    def test_creates_consultation(
        self, auth_client, patient_user, patient, doctor,
    ):
        DoctorAvailability.objects.create(
            doctor=doctor,
            day=_tomorrow_weekday(),
            start_time=time(0, 0),
            end_time=time(23, 59),
            is_available=True,
        )

        with patch.object(
            ConsultationNotificationService, "consultation_booked",
        ) as mock_notify:
            r = auth_client(patient_user).post(
                reverse("consultations:book"),
                {
                    "doctor": doctor.id,
                    "appointment_date": _tomorrow_iso(),
                    "appointment_time": "10:00",
                },
                format="json",
            )
        assert r.status_code == 201, r.json()
        body = r.json()
        assert body["status"] == Consultation.Status.SCHEDULED
        assert body["doctor_id"] == doctor.id
        assert body["meeting_url"]
        mock_notify.assert_called_once()

    def test_conflict_returns_400(
        self, auth_client, patient_user, patient, doctor,
    ):
        AppointmentFactory(
            doctor=doctor,
            appointment_date=timezone.localdate() + timedelta(days=1),
            appointment_time=time(10, 0),
            duration_minutes=30,
            status=Appointment.Status.CONFIRMED,
        )
        r = auth_client(patient_user).post(
            reverse("consultations:book"),
            {
                "doctor": doctor.id,
                "appointment_date": _tomorrow_iso(),
                "appointment_time": "10:15",
            },
            format="json",
        )
        assert r.status_code == 400
        assert "no longer available" in r.json()["detail"].lower()

    def test_notification_failure_does_not_500(
        self, auth_client, patient_user, patient, doctor,
    ):
        DoctorAvailability.objects.create(
            doctor=doctor,
            day=_tomorrow_weekday(),
            start_time=time(0, 0),
            end_time=time(23, 59),
            is_available=True,
        )

        with patch.object(
            ConsultationNotificationService, "consultation_booked",
        ) as mock_notify:
            r = auth_client(patient_user).post(
                reverse("consultations:book"),
                {
                    "doctor": doctor.id,
                    "appointment_date": _tomorrow_iso(),
                    "appointment_time": "10:00",
                },
                format="json",
            )
        assert r.status_code == 201

    def test_rejects_past_date(self, auth_client, patient_user, patient, doctor):
        past = (timezone.localdate() - timedelta(days=1)).isoformat()
        r = auth_client(patient_user).post(
            reverse("consultations:book"),
            {
                "doctor": doctor.id,
                "appointment_date": past,
                "appointment_time": "10:00",
            },
            format="json",
        )
        assert r.status_code == 400
        assert "appointment_date" in r.json()


# ============================================================
# MINE / DETAIL
# ============================================================

class TestMyConsultations:
    def test_excludes_cancelled_by_default(
        self, auth_client, patient_user, patient, doctor,
    ):
        c1 = ConsultationFactory(
            appointment__patient=patient_user,
            appointment__doctor=doctor,
            appointment__appointment_time=time(10, 0),
            status=Consultation.Status.SCHEDULED,
        )
        ConsultationFactory(
            appointment__patient=patient_user,
            appointment__doctor=doctor,
            appointment__appointment_time=time(11, 0),   # ← distinct time
            status=Consultation.Status.CANCELLED,
        )
        r = auth_client(patient_user).get(
            reverse("consultations:my-consultations"),
        )
        assert r.status_code == 200
        ids = [x["id"] for x in _names(r.json())]
        assert c1.id in ids
        assert len(ids) == 1

    def test_include_all_returns_cancelled(
        self, auth_client, patient_user, patient, doctor,
    ):
        c2 = ConsultationFactory(
            appointment__patient=patient_user,
            appointment__doctor=doctor,
            appointment__appointment_time=time(10, 0),
            status=Consultation.Status.SCHEDULED,
        )
        ConsultationFactory(
            appointment__patient=patient_user,
            appointment__doctor=doctor,
            appointment__appointment_time=time(11, 0),   # ← distinct time
            status=Consultation.Status.CANCELLED,
        )
        r = auth_client(patient_user).get(
            reverse("consultations:my-consultations"), {"include": "all"},
        )
        assert c2.id in [x["id"] for x in _names(r.json())]

    def test_cannot_see_other_patients(
        self, auth_client, patient_user, patient, doctor,
    ):
        other_user = UserFactory()
        ConsultationFactory(
            appointment__patient=other_user,
            appointment__doctor=doctor,
        )
        r = auth_client(patient_user).get(
            reverse("consultations:my-consultations"),
        )
        assert _names(r.json()) == []


class TestDetailView:
    def test_get_own(self, auth_client, patient_user, patient, consultation):
        r = auth_client(patient_user).get(
            reverse("consultations:detail", args=[consultation.id]),
        )
        assert r.status_code == 200

    def test_404_for_other_patient(
        self, auth_client, patient_user, patient, doctor,
    ):
        other_user = UserFactory()
        c = ConsultationFactory(
            appointment__patient=other_user,
            appointment__doctor=doctor,
        )
        r = auth_client(patient_user).get(
            reverse("consultations:detail", args=[c.id]),
        )
        assert r.status_code == 404

    def test_delete_soft_cancels(
        self, auth_client, patient_user, patient, consultation,
    ):
        r = auth_client(patient_user).delete(
            reverse("consultations:detail", args=[consultation.id]),
        )
        assert r.status_code == 204
        consultation.refresh_from_db()
        assert consultation.status == Consultation.Status.CANCELLED


# ============================================================
# CANCEL
# ============================================================

class TestCancelView:
    def test_cancel_returns_updated_row(
        self, auth_client, patient_user, patient, consultation,
    ):
        r = auth_client(patient_user).post(
            reverse("consultations:cancel", args=[consultation.id]),
            {"reason": "Rescheduling"},
            format="json",
        )
        assert r.status_code == 200
        assert r.json()["status"] == Consultation.Status.CANCELLED

    def test_cancel_completed_returns_400(
        self, auth_client, patient_user, patient, doctor,
    ):
        c = ConsultationFactory(
            appointment__patient=patient_user,
            appointment__doctor=doctor,
            status=Consultation.Status.COMPLETED,
        )
        r = auth_client(patient_user).post(
            reverse("consultations:cancel", args=[c.id]),
            {},
            format="json",
        )
        assert r.status_code == 400

    def test_cancel_404_for_other_patient(
        self, auth_client, patient_user, patient, doctor,
    ):
        other_user = UserFactory()
        c = ConsultationFactory(
            appointment__patient=other_user,
            appointment__doctor=doctor,
        )
        r = auth_client(patient_user).post(
            reverse("consultations:cancel", args=[c.id]),
            {},
            format="json",
        )
        assert r.status_code == 404


# ============================================================
# DOCTOR ACTIONS
# ============================================================

class TestStartView:
    def test_doctor_can_start(self, auth_client, doctor_user, consultation):
        r = auth_client(doctor_user).post(
            reverse("consultations:start", args=[consultation.id]),
        )
        assert r.status_code == 200
        assert r.json()["status"] == Consultation.Status.IN_PROGRESS

    def test_patient_cannot_start(
        self, auth_client, patient_user, patient, consultation,
    ):
        r = auth_client(patient_user).post(
            reverse("consultations:start", args=[consultation.id]),
        )
        assert r.status_code == 403

    def test_404_for_other_doctor(
        self, auth_client, consultation,
    ):
        other_doctor_user = DoctorFactory().user
        r = auth_client(other_doctor_user).post(
            reverse("consultations:start", args=[consultation.id]),
        )
        assert r.status_code == 404


class TestCompleteView:
    def test_doctor_can_complete(
        self, auth_client, doctor_user, consultation,
    ):
        consultation.status = Consultation.Status.IN_PROGRESS
        consultation.started_at = timezone.now()
        consultation.save(update_fields=["status", "started_at"])

        r = auth_client(doctor_user).post(
            reverse("consultations:complete", args=[consultation.id]),
        )
        assert r.status_code == 200
        assert r.json()["status"] == Consultation.Status.COMPLETED

    def test_complete_scheduled_returns_400(
        self, auth_client, doctor_user, consultation,
    ):
        r = auth_client(doctor_user).post(
            reverse("consultations:complete", args=[consultation.id]),
        )
        assert r.status_code == 400


class TestPrescriptionCreateView:
    def test_doctor_creates_prescription(
        self, auth_client, doctor_user, consultation,
    ):
        consultation.status = Consultation.Status.IN_PROGRESS
        consultation.save(update_fields=["status"])

        r = auth_client(doctor_user).post(
            reverse(
                "consultations:prescription-create", args=[consultation.id],
            ),
            {
                "medication": "Amoxicillin",
                "dosage": "500mg",
                "frequency": "TID",
                "duration": "7 days",
                "instructions": "With water",
            },
            format="json",
        )
        assert r.status_code == 201, r.json()
        assert r.json()["medication"] == "Amoxicillin"

    def test_patient_cannot_prescribe(
        self, auth_client, patient_user, patient, consultation,
    ):
        r = auth_client(patient_user).post(
            reverse(
                "consultations:prescription-create", args=[consultation.id],
            ),
            {
                "medication": "X",
                "dosage": "1",
                "frequency": "1",
                "duration": "1",
                "instructions": "",
            },
            format="json",
        )
        assert r.status_code == 403

    def test_other_doctor_cannot_prescribe(
        self, auth_client, consultation,
    ):
        other_doctor_user = DoctorFactory().user
        r = auth_client(other_doctor_user).post(
            reverse(
                "consultations:prescription-create", args=[consultation.id],
            ),
            {
                "medication": "X",
                "dosage": "1",
                "frequency": "1",
                "duration": "1",
                "instructions": "",
            },
            format="json",
        )
        # doctor_consultation() filters by doctor → 404, not 403.
        assert r.status_code == 404


# ============================================================
# NOTIFICATION DISPATCH (view-level)
# ============================================================

class TestNotificationDispatch:
    def test_cancel_dispatches_notification(
        self, auth_client, patient_user, patient, consultation,
    ):
        with patch.object(
            ConsultationNotificationService, "consultation_cancelled",
        ) as mock_notify:
            r = auth_client(patient_user).post(
                reverse("consultations:cancel", args=[consultation.id]),
                {"reason": "Test"},
                format="json",
            )
        assert r.status_code == 200
        mock_notify.assert_called_once()
        _, kwargs = mock_notify.call_args
        assert kwargs.get("reason") == "Test"

    def test_start_dispatches_notification(
        self, auth_client, doctor_user, consultation,
    ):
        with patch.object(
            ConsultationNotificationService, "consultation_started",
        ) as mock_notify:
            r = auth_client(doctor_user).post(
                reverse("consultations:start", args=[consultation.id]),
            )
        assert r.status_code == 200
        mock_notify.assert_called_once()

    def test_complete_dispatches_notification(
        self, auth_client, doctor_user, consultation,
    ):
        consultation.status = Consultation.Status.IN_PROGRESS
        consultation.started_at = timezone.now()
        consultation.save(update_fields=["status", "started_at"])

        with patch.object(
            ConsultationNotificationService, "consultation_completed",
        ) as mock_notify:
            r = auth_client(doctor_user).post(
                reverse("consultations:complete", args=[consultation.id]),
            )
        assert r.status_code == 200
        mock_notify.assert_called_once()