import logging

from django.db import IntegrityError, transaction
from django.shortcuts import get_object_or_404
from django.utils import timezone

from rest_framework import status
from rest_framework.pagination import PageNumberPagination
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import Appointment
from .serializers import (
    AppointmentCancelSerializer,
    AppointmentCreateSerializer,
    AppointmentMobileCreateSerializer,
    AppointmentMobileSerializer,
    AppointmentReminderSerializer,
    AppointmentRescheduleSerializer,
    AppointmentSerializer,
)
from .services.appointment_notification_service import AppointmentNotificationService

logger = logging.getLogger(__name__)

FINAL_STATUSES = (
    Appointment.Status.COMPLETED,
    Appointment.Status.CANCELLED,
    Appointment.Status.NO_SHOW,
)


# ---------------------------------------------------------------------------
# Shared helpers
# ---------------------------------------------------------------------------

class AppointmentPagination(PageNumberPagination):
    page_size = 20
    page_size_query_param = "page_size"
    max_page_size = 100


def get_user_patient(user):
    return user


def get_user_doctor(user):
    return getattr(user, "doctor_profile", None)


def user_is_patient_of(user, appointment) -> bool:
    """The appointment's patient FK points at a User; compare directly."""
    return bool(user and appointment.patient_id == user.id)


def user_can_access_appointment(user, appointment) -> bool:
    if user.is_staff or user_is_patient_of(user, appointment):
        return True
    doctor = get_user_doctor(user)
    return bool(doctor and appointment.doctor_id == doctor.id)


def user_can_manage_appointment(user, appointment) -> bool:
    """Doctor of the appointment, or staff."""
    if user.is_staff:
        return True
    doctor = get_user_doctor(user)
    return bool(doctor and appointment.doctor_id == doctor.id)


def get_base_queryset():
    # prefetch_related works for reverse one-to-one and reverse FK alike.
    return Appointment.objects.select_related(
        "patient", "doctor__user", "doctor__specialty", "cancelled_by"
    ).prefetch_related("check_in", "consultation")


def notify(method_name, *args, **kwargs):
    """Notifications must never turn a committed change into a 500."""
    try:
        getattr(AppointmentNotificationService, method_name)(*args, **kwargs)
    except Exception:
        logger.exception("Appointment notification %s failed", method_name)


def try_cancel(request, appointment, reason=""):
    """
    Soft-cancel. Returns an error Response, or None on success.
    If the appointment belongs to a consultation, the consultation is
    cancelled through its own service so both records stay in sync.
    """
    if appointment.status in FINAL_STATUSES:
        return Response(
            {"detail": "This appointment cannot be cancelled."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    consultation = getattr(appointment, "consultation", None)
    if consultation is not None:
        # Imported lazily: consultations imports appointments.models.
        from consultations.services.consultation_notification_service import (
            ConsultationNotificationService,
        )
        from consultations.services.services import cancel_consultation

        try:
            consultation = cancel_consultation(
                consultation=consultation, user=request.user, reason=reason
            )
        except ValueError as exc:
            return Response({"detail": str(exc)}, status=status.HTTP_400_BAD_REQUEST)
        try:
            ConsultationNotificationService.consultation_cancelled(consultation)
        except Exception:
            logger.exception("Consultation cancel notification failed")
        appointment.refresh_from_db()
        return None

    appointment.status = Appointment.Status.CANCELLED
    appointment.cancelled_at = timezone.now()
    appointment.cancelled_by = request.user
    appointment.cancellation_reason = reason
    appointment.save(
        update_fields=["status", "cancelled_at", "cancelled_by", "cancellation_reason", "updated_at"]
    )
    notify("notify_cancelled", appointment, cancelled_by=request.user)
    return None


# ---------------------------------------------------------------------------
# List + Create   /api/appointments/
# ---------------------------------------------------------------------------

class AppointmentListCreateView(APIView):
    permission_classes = [IsAuthenticated]
    pagination_class = AppointmentPagination

    def get_queryset(self, request):
        qs = get_base_queryset()
        doctor = get_user_doctor(request.user)

        if doctor:
            qs = qs.filter(doctor=doctor)
        elif request.user.is_staff:
            pass 
        else:
            qs = qs.filter(patient=request.user)

        params = request.query_params

        if params.get("status"):
            statuses = [s.strip() for s in params["status"].split(",") if s.strip()]
            qs = qs.filter(status__in=statuses)
        if params.get("date"):
            qs = qs.filter(appointment_date=params["date"])
        if params.get("from"):
            qs = qs.filter(appointment_date__gte=params["from"])
        if params.get("to"):
            qs = qs.filter(appointment_date__lte=params["to"])

        if (params.get("upcoming") or "").lower() in ("1", "true", "yes"):
            from django.db.models import Q

            today = timezone.localdate()
            now_time = timezone.localtime().time()
            qs = qs.filter(
                Q(appointment_date__gt=today)
                | Q(appointment_date=today, appointment_time__gte=now_time)
            ).exclude(status__in=FINAL_STATUSES)

        return qs

    def get(self, request):
        paginator = self.pagination_class()
        page = paginator.paginate_queryset(self.get_queryset(request), request, view=self)
        serializer = AppointmentSerializer(page, many=True, context={"request": request})
        return paginator.get_paginated_response(serializer.data)

    def post(self, request):
        if get_user_doctor(request.user):
            return Response(
                {"detail": "Doctors cannot create patient appointments."},
                status=status.HTTP_403_FORBIDDEN,
            )

        if "date" in request.data and "appointment_date" not in request.data:
            return self._create_from_app(request, request.user)
        
        serializer = AppointmentCreateSerializer(data=request.data, context={"request": request})
        serializer.is_valid(raise_exception=True)

        try:
            with transaction.atomic():
                appointment = serializer.save(patient=request.user, status=Appointment.Status.PENDING)
        except IntegrityError:
            return Response(
                {"detail": "The selected appointment slot is no longer available."},
                status=status.HTTP_409_CONFLICT,
            )

        notify("notify_created", appointment)

        appointment = get_base_queryset().get(pk=appointment.pk)
        return Response(
            AppointmentSerializer(appointment, context={"request": request}).data,
            status=status.HTTP_201_CREATED,
        )

    def _create_from_app(self, request, patient):
        serializer = AppointmentMobileCreateSerializer(
            data=request.data, context={"patient": patient}
        )
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        try:
            with transaction.atomic():
                appointment = Appointment.objects.create(
                    patient=patient,
                    doctor=None,
                    appointment_date=data["date"],
                    appointment_time=data["time"],
                    duration_minutes=data["duration_minutes"],
                    appointment_type=data["appointment_type"],
                    provider_name=data["withName"],
                    reminder_minutes=data["reminderMinutes"],
                    status=Appointment.Status.PENDING,
                )
        except IntegrityError:
            return Response(
                {"detail": "The selected appointment slot is no longer available."},
                status=status.HTTP_409_CONFLICT,
            )

        notify("notify_created", appointment)
        return Response(
            AppointmentMobileSerializer(appointment).data, status=status.HTTP_201_CREATED
        )


# ---------------------------------------------------------------------------
# Mine   GET /api/appointments/mine/   (plain list in the app's shape)
#
# Only active (pending/confirmed) appointments that are NOT consultations —
# consultations are served by /api/consultations/mine/, so nothing is
# shown twice in the app.
# ---------------------------------------------------------------------------

class AppointmentMineView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        patient = get_user_patient(request.user)
        if patient is None:
            return Response([])

        qs = (
            get_base_queryset()
            .filter(
                patient=patient,
                status__in=[Appointment.Status.PENDING, Appointment.Status.CONFIRMED],
                consultation__isnull=True,
            )
            .order_by("appointment_date", "appointment_time")
        )
        return Response(AppointmentMobileSerializer(qs, many=True).data)


# ---------------------------------------------------------------------------
# Detail   GET / PATCH (reminder) / DELETE (soft cancel)
# ---------------------------------------------------------------------------

class AppointmentDetailView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, pk):
        appointment = get_object_or_404(get_base_queryset(), pk=pk)
        if not user_can_access_appointment(request.user, appointment):
            return Response(
                {"detail": "You do not have access to this appointment."},
                status=status.HTTP_403_FORBIDDEN,
            )
        return Response(AppointmentSerializer(appointment, context={"request": request}).data)

    def patch(self, request, pk):
        appointment = get_object_or_404(get_base_queryset(), pk=pk)
        if not (request.user.is_staff or user_is_patient_of(request.user, appointment)):
            return Response(
                {"detail": "You cannot change this appointment."},
                status=status.HTTP_403_FORBIDDEN,
            )

        serializer = AppointmentReminderSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        appointment.reminder_minutes = serializer.validated_data["reminderMinutes"]
        appointment.save(update_fields=["reminder_minutes", "updated_at"])
        return Response(AppointmentMobileSerializer(appointment).data)

    def delete(self, request, pk):
        appointment = get_object_or_404(get_base_queryset(), pk=pk)
        if not user_can_access_appointment(request.user, appointment):
            return Response(
                {"detail": "You cannot cancel this appointment."},
                status=status.HTTP_403_FORBIDDEN,
            )

        error = try_cancel(request, appointment)
        if error is not None:
            return error
        return Response(status=status.HTTP_204_NO_CONTENT)


# ---------------------------------------------------------------------------
# Cancel   POST /api/appointments/<pk>/cancel/
# ---------------------------------------------------------------------------

class AppointmentCancelView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, pk):
        appointment = get_object_or_404(get_base_queryset(), pk=pk)
        if not user_can_access_appointment(request.user, appointment):
            return Response(
                {"detail": "You cannot cancel this appointment."},
                status=status.HTTP_403_FORBIDDEN,
            )

        cancel_serializer = AppointmentCancelSerializer(data=request.data)
        cancel_serializer.is_valid(raise_exception=True)

        error = try_cancel(
            request, appointment, cancel_serializer.validated_data["cancellation_reason"]
        )
        if error is not None:
            return error

        return Response(AppointmentSerializer(appointment, context={"request": request}).data)


# ---------------------------------------------------------------------------
# Confirm / Complete / No-show  (one shared transition)
# ---------------------------------------------------------------------------

class _TransitionView(APIView):
    permission_classes = [IsAuthenticated]

    forbidden_message = ""
    invalid_message = ""
    from_status = None
    to_status = None
    timestamp_field = None
    notifier = ""

    def post(self, request, pk):
        appointment = get_object_or_404(get_base_queryset(), pk=pk)

        if not user_can_manage_appointment(request.user, appointment):
            return Response({"detail": self.forbidden_message}, status=status.HTTP_403_FORBIDDEN)

        if appointment.status != self.from_status:
            return Response({"detail": self.invalid_message}, status=status.HTTP_400_BAD_REQUEST)

        appointment.status = self.to_status
        fields = ["status", "updated_at"]
        if self.timestamp_field:
            setattr(appointment, self.timestamp_field, timezone.now())
            fields.append(self.timestamp_field)
        appointment.save(update_fields=fields)

        notify(self.notifier, appointment)
        return Response(AppointmentSerializer(appointment, context={"request": request}).data)


class AppointmentConfirmView(_TransitionView):
    forbidden_message = "You cannot confirm this appointment."
    invalid_message = "Only pending appointments can be confirmed."
    from_status = Appointment.Status.PENDING
    to_status = Appointment.Status.CONFIRMED
    timestamp_field = "confirmed_at"
    notifier = "notify_confirmed"


class AppointmentCompleteView(_TransitionView):
    forbidden_message = "You cannot complete this appointment."
    invalid_message = "Only confirmed appointments can be completed."
    from_status = Appointment.Status.CONFIRMED
    to_status = Appointment.Status.COMPLETED
    timestamp_field = "completed_at"
    notifier = "notify_completed"


class AppointmentNoShowView(_TransitionView):
    forbidden_message = "You cannot mark this appointment as no-show."
    invalid_message = "Only confirmed appointments can be marked as no-show."
    from_status = Appointment.Status.CONFIRMED
    to_status = Appointment.Status.NO_SHOW
    notifier = "notify_no_show"


# ---------------------------------------------------------------------------
# Reschedule   POST /api/appointments/<pk>/reschedule/
# ---------------------------------------------------------------------------

class AppointmentRescheduleView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, pk):
        appointment = get_object_or_404(get_base_queryset(), pk=pk)

        if not (request.user.is_staff or user_is_patient_of(request.user, appointment)):
            return Response(
                {"detail": "You cannot reschedule this appointment."},
                status=status.HTTP_403_FORBIDDEN,
            )

        if appointment.status not in (Appointment.Status.PENDING, Appointment.Status.CONFIRMED):
            return Response(
                {"detail": "Only pending or confirmed appointments can be rescheduled."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # A consultation carries a price and a meeting; move it by cancel + rebook.
        if getattr(appointment, "consultation", None) is not None:
            return Response(
                {"detail": "Consultations cannot be rescheduled. Cancel and book a new one."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        serializer = AppointmentRescheduleSerializer(
            data=request.data, context={"appointment": appointment, "request": request}
        )
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        old_date, old_time = appointment.appointment_date, appointment.appointment_time

        try:
            with transaction.atomic():
                appointment.appointment_date = data["appointment_date"]
                appointment.appointment_time = data["appointment_time"]
                if data.get("reason_for_visit"):
                    appointment.reason_for_visit = data["reason_for_visit"]
                if appointment.status == Appointment.Status.CONFIRMED:
                    appointment.status = Appointment.Status.PENDING
                    appointment.confirmed_at = None

                appointment.save(
                    update_fields=[
                        "appointment_date", "appointment_time", "reason_for_visit",
                        "status", "confirmed_at", "updated_at",
                    ]
                )
        except IntegrityError:
            return Response(
                {"detail": "The selected appointment slot is no longer available."},
                status=status.HTTP_409_CONFLICT,
            )

        notify("notify_rescheduled", appointment, old_date=old_date, old_time=old_time)

        appointment = get_base_queryset().get(pk=appointment.pk)
        return Response(AppointmentSerializer(appointment, context={"request": request}).data)