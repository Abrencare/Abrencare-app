import logging
from datetime import datetime, timedelta

from django.db import IntegrityError, transaction
from django.utils import timezone

from rest_framework import serializers, status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from doctors.models import Doctor, Specialty

from .models import Consultation, ConsultationProfile
from .permissions import IsDoctorUser, IsPatientUser
from .serializers import (
    ConsultationBookingSerializer,
    ConsultationCancelSerializer,
    ConsultationDoctorSerializer,
    ConsultationOnboardingSerializer,
    ConsultationProfileSerializer,
    ConsultationSerializer,
    ConsultationSlotSerializer,
    PrescriptionCreateSerializer,
    PrescriptionSerializer,
    SpecialtySerializer,
)
from .services.services import (
    ACTIVE_APPOINTMENT_STATUSES,
    book_consultation,
    cancel_consultation,
    complete_consultation,
    create_prescription,
    start_consultation,
)
from .services.consultation_notification_service import ConsultationNotificationService

logger = logging.getLogger(__name__)


# ============================================================
# HELPERS
# ============================================================

def get_user_patient(user):
    return getattr(user, "patient_profile", None)


def get_user_doctor(user):
    # The two apps disagree on the reverse name; accept either.
    return getattr(user, "doctor_profile", None) or getattr(user, "doctor", None)


def get_consultation_profile(user):
    """The caller's ConsultationProfile, or None if they lack the service."""
    return (
        ConsultationProfile.objects
        .select_related("user_service")
        .filter(
            user_service__user=user,
            user_service__service__code="consultation",
        )
        .first()
    )


def consultation_queryset():
    return Consultation.objects.select_related(
        "appointment",
        "appointment__patient",
        "appointment__patient__user",
        "appointment__doctor",
        "appointment__doctor__user",
        "appointment__doctor__specialty",
    )


def notify(callback, *args, **kwargs):
    """A failed email/SMS must never turn a committed action into a 500."""
    try:
        callback(*args, **kwargs)
    except Exception:
        logger.exception("Consultation notification failed")


def patient_consultation(request, pk):
    patient = get_user_patient(request.user)
    if patient is None:
        return None
    return (
        consultation_queryset()
        .filter(pk=pk, appointment__patient=patient)
        .first()
    )


def doctor_consultation(request, pk):
    doctor = get_user_doctor(request.user)
    if doctor is None:
        return None
    return (
        consultation_queryset()
        .filter(pk=pk, appointment__doctor=doctor)
        .first()
    )


def cancel_for_patient(request, pk):
    """Shared by POST .../cancel/ and DELETE .../<pk>/. Returns (consultation, error)."""
    input_serializer = ConsultationCancelSerializer(data=request.data)
    input_serializer.is_valid(raise_exception=True)

    consultation = patient_consultation(request, pk)
    if consultation is None:
        return None, Response(
            {"detail": "Consultation not found."},
            status=status.HTTP_404_NOT_FOUND,
        )

    try:
        consultation = cancel_consultation(
            consultation=consultation,
            user=request.user,
            reason=input_serializer.validated_data["reason"],
        )
    except ValueError as exc:
        return None, Response(
            {"detail": str(exc)}, status=status.HTTP_400_BAD_REQUEST
        )

    # Notification runs after the service commits.
    notify(
        ConsultationNotificationService.consultation_cancelled,
        consultation,
        cancelled_by=request.user,
        reason=input_serializer.validated_data["reason"],
    )
    return consultation, None


# ============================================================
# SPECIALTIES
# ============================================================

class SpecialtyListView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        specialties = Specialty.objects.filter(is_active=True)
        return Response(SpecialtySerializer(specialties, many=True).data)


# ============================================================
# DOCTORS
# ============================================================

class ConsultationDoctorListView(APIView):
    """Approved doctors. Optional: ?specialty=<id>"""

    permission_classes = [IsAuthenticated]

    def get(self, request):
        queryset = Doctor.objects.filter(
            approval_status=Doctor.ApprovalStatus.APPROVED,
            specialty__is_active=True,
        ).select_related("user", "specialty")

        specialty_id = request.query_params.get("specialty")
        if specialty_id:
            queryset = queryset.filter(specialty_id=specialty_id)

        return Response(ConsultationDoctorSerializer(queryset, many=True).data)


# ============================================================
# AVAILABILITY   GET /api/consultations/availability/?doctor=12&date=2026-08-30
# ============================================================

class ConsultationAvailabilityView(APIView):
    permission_classes = [IsAuthenticated, IsPatientUser]

    def get(self, request):
        doctor_id = request.query_params.get("doctor")
        date_string = request.query_params.get("date")

        if not doctor_id:
            return Response({"doctor": "This parameter is required."}, status=400)
        if not date_string:
            return Response({"date": "This parameter is required."}, status=400)

        try:
            doctor_id = int(doctor_id)
        except ValueError:
            return Response({"doctor": "Must be a valid integer id."}, status=400)

        try:
            appointment_date = datetime.strptime(date_string, "%Y-%m-%d").date()
        except ValueError:
            return Response({"date": "Use YYYY-MM-DD format."}, status=400)

        if appointment_date < timezone.localdate():
            return Response({"date": "Date cannot be in the past."}, status=400)

        try:
            doctor = (
                Doctor.objects.select_related("user", "specialty")
                .get(pk=doctor_id, approval_status=Doctor.ApprovalStatus.APPROVED)
            )
        except Doctor.DoesNotExist:
            return Response(
                {"doctor": "Doctor not found or unavailable."},
                status=status.HTTP_404_NOT_FOUND,
            )

        weekday = appointment_date.strftime("%A").lower()
        windows = doctor.availability.filter(
            day=weekday, is_available=True
        ).order_by("start_time")

        active = doctor.appointments.filter(
            appointment_date=appointment_date,
            status__in=ACTIVE_APPOINTMENT_STATUSES,
        )
        booked = []
        for a in active:
            start = datetime.combine(appointment_date, a.appointment_time)
            booked.append(
                (start, start + timedelta(minutes=a.duration_minutes))
            )

        duration = doctor.consultation_duration
        now_local = timezone.localtime().replace(tzinfo=None)
        slots = []

        for window in windows:
            current = datetime.combine(appointment_date, window.start_time)
            window_end = datetime.combine(appointment_date, window.end_time)

            # Step by the consultation duration, NOT a fixed interval.
            # Otherwise a 45-min consultation produces overlapping slots.
            while current + timedelta(minutes=duration) <= window_end:
                slot_end = current + timedelta(minutes=duration)

                # Never offer a time that has already passed today.
                if current > now_local:
                    available = not any(
                        current < b_end and slot_end > b_start
                        for b_start, b_end in booked
                    )
                    slots.append(
                        {"time": current.time(), "available": available}
                    )

                current += timedelta(minutes=duration)

        return Response(
            {
                "doctor": {
                    "id": doctor.id,
                    "name": doctor.user.full_name,
                    "specialty": doctor.specialty.name,
                },
                "date": appointment_date,
                "duration_minutes": duration,
                "slots": ConsultationSlotSerializer(slots, many=True).data,
            }
        )


# ============================================================
# ONBOARDING   POST /api/consultations/onboarding/complete/
#              GET  /api/consultations/profile/
# ============================================================

class ConsultationOnboardingCompleteView(APIView):
    """
    Completes or edits the caller's consultation onboarding.

    Writes to the caller's ConsultationProfile (per UserService). Returns
    the full profile so the frontend can update its cache without a second
    round trip.
    """

    permission_classes = [IsAuthenticated]

    def post(self, request):
        serializer = ConsultationOnboardingSerializer(
            data=request.data, context={"request": request}
        )
        serializer.is_valid(raise_exception=True)

        try:
            profile = serializer.save()
        except serializers.ValidationError as exc:
            # `save()` raises when the user lacks the consultation service.
            return Response(exc.detail, status=status.HTTP_400_BAD_REQUEST)

        return Response(
            ConsultationProfileSerializer(profile).data,
            status=status.HTTP_200_OK,
        )


class ConsultationProfileView(APIView):
    """GET the caller's onboarding profile."""

    permission_classes = [IsAuthenticated]

    def get(self, request):
        profile = get_consultation_profile(request.user)
        if profile is None:
            return Response(
                {"detail": "This account is not enrolled in the consultation service."},
                status=status.HTTP_404_NOT_FOUND,
            )
        return Response(ConsultationProfileSerializer(profile).data)


# ============================================================
# BOOK   POST /api/consultations/
# ============================================================

class ConsultationBookingView(APIView):
    permission_classes = [IsAuthenticated, IsPatientUser]

    def post(self, request):
        serializer = ConsultationBookingSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        try:
            with transaction.atomic():
                consultation = book_consultation(
                    user=request.user,
                    doctor=data["doctor"],
                    appointment_date=data["appointment_date"],
                    appointment_time=data["appointment_time"],
                    consultation_type=data["consultation_type"],
                    language=data["language"],
                    reason_for_visit=data["reason_for_visit"],
                )
        except ValueError as exc:
            # `full_clean()` errors arrive as a dict; return them per-field
            # so the frontend's `describeError` renders each cleanly.
            if exc.args and isinstance(exc.args[0], dict):
                return Response(exc.args[0], status=status.HTTP_400_BAD_REQUEST)
            return Response({"detail": str(exc)}, status=status.HTTP_400_BAD_REQUEST)
        except IntegrityError:
            return Response(
                {"detail": "The selected slot is no longer available."},
                status=status.HTTP_409_CONFLICT,
            )

        # Notification runs AFTER the transaction has committed.
        notify(ConsultationNotificationService.consultation_booked, consultation)

        consultation = consultation_queryset().get(pk=consultation.pk)
        return Response(
            ConsultationSerializer(consultation).data,
            status=status.HTTP_201_CREATED,
        )


# ============================================================
# MINE   GET /api/consultations/mine/
# Cancelled consultations are hidden by default (the app removes them
# locally on cancel). Use ?include=all for history including cancelled.
# ============================================================

class MyConsultationsView(APIView):
    permission_classes = [IsAuthenticated, IsPatientUser]

    def get(self, request):
        patient = get_user_patient(request.user)
        if patient is None:
            return Response([])

        queryset = consultation_queryset().filter(appointment__patient=patient)
        if request.query_params.get("include") != "all":
            queryset = queryset.exclude(status=Consultation.Status.CANCELLED)

        return Response(ConsultationSerializer(queryset, many=True).data)


# ============================================================
# DETAIL   GET / DELETE /api/consultations/<pk>/
# DELETE is a soft cancel: the row and its prescriptions are kept.
# ============================================================

class ConsultationDetailView(APIView):
    permission_classes = [IsAuthenticated, IsPatientUser]

    def get(self, request, pk):
        consultation = patient_consultation(request, pk)
        if consultation is None:
            return Response(
                {"detail": "Consultation not found."},
                status=status.HTTP_404_NOT_FOUND,
            )
        return Response(ConsultationSerializer(consultation).data)

    def delete(self, request, pk):
        _, error = cancel_for_patient(request, pk)
        if error is not None:
            return error
        return Response(status=status.HTTP_204_NO_CONTENT)


# ============================================================
# CANCEL   POST /api/consultations/<pk>/cancel/
# ============================================================

class ConsultationCancelView(APIView):
    permission_classes = [IsAuthenticated, IsPatientUser]

    def post(self, request, pk):
        consultation, error = cancel_for_patient(request, pk)
        if error is not None:
            return error
        return Response(ConsultationSerializer(consultation).data)


# ============================================================
# DOCTOR ACTIONS
# ============================================================

class ConsultationStartView(APIView):
    permission_classes = [IsAuthenticated, IsDoctorUser]

    def post(self, request, pk):
        consultation = doctor_consultation(request, pk)
        if consultation is None:
            return Response(
                {"detail": "Consultation not found."},
                status=status.HTTP_404_NOT_FOUND,
            )

        try:
            consultation = start_consultation(
                consultation=consultation, user=request.user
            )
        except ValueError as exc:
            return Response(
                {"detail": str(exc)}, status=status.HTTP_400_BAD_REQUEST
            )

        notify(ConsultationNotificationService.consultation_started, consultation)
        return Response(ConsultationSerializer(consultation).data)


class ConsultationCompleteView(APIView):
    permission_classes = [IsAuthenticated, IsDoctorUser]

    def post(self, request, pk):
        consultation = doctor_consultation(request, pk)
        if consultation is None:
            return Response(
                {"detail": "Consultation not found."},
                status=status.HTTP_404_NOT_FOUND,
            )

        try:
            consultation = complete_consultation(
                consultation=consultation, user=request.user
            )
        except ValueError as exc:
            return Response(
                {"detail": str(exc)}, status=status.HTTP_400_BAD_REQUEST
            )

        notify(ConsultationNotificationService.consultation_completed, consultation)
        return Response(ConsultationSerializer(consultation).data)


class PrescriptionCreateView(APIView):
    permission_classes = [IsAuthenticated, IsDoctorUser]

    def post(self, request, pk):
        consultation = doctor_consultation(request, pk)
        if consultation is None:
            return Response(
                {"detail": "Consultation not found."},
                status=status.HTTP_404_NOT_FOUND,
            )

        serializer = PrescriptionCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        try:
            prescription = create_prescription(
                consultation=consultation,
                doctor=get_user_doctor(request.user),
                data=serializer.validated_data,
            )
        except ValueError as exc:
            return Response(
                {"detail": str(exc)}, status=status.HTTP_400_BAD_REQUEST
            )

        notify(
            ConsultationNotificationService.prescription_added,
            consultation,
            prescription,
        )
        return Response(
            PrescriptionSerializer(prescription).data,
            status=status.HTTP_201_CREATED,
        )
    