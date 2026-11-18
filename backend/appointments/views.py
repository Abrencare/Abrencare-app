import logging

from django.shortcuts import get_object_or_404
from rest_framework import status
from rest_framework.pagination import PageNumberPagination
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from .exceptions import (
    AppointmentNotBookable,
    AppointmentPermissionDenied,
    AppointmentSlotTaken,
    InvalidAppointmentTransition,
)
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
from .services import (
    assert_reschedulable,
    base_queryset,
    book_appointment,
    cancel_appointment,
    complete_appointment,
    confirm_appointment,
    filter_list,
    mark_no_show,
    reschedule_appointment,
    user_can_access,
    user_can_manage,
    user_is_patient_of,
    visible_to,
)

logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Shared helpers
# ---------------------------------------------------------------------------

class AppointmentPagination(PageNumberPagination):
    page_size = 20
    page_size_query_param = "page_size"
    max_page_size = 100


def _domain_error_response(exc):
    """Translate a domain exception into a DRF Response."""
    if isinstance(exc, AppointmentPermissionDenied):
        return Response({"detail": exc.message}, status=status.HTTP_403_FORBIDDEN)
    if isinstance(exc, AppointmentSlotTaken):
        return Response({"detail": exc.message}, status=status.HTTP_409_CONFLICT)
    if isinstance(exc, InvalidAppointmentTransition):
        return Response({"detail": exc.message}, status=status.HTTP_400_BAD_REQUEST)
    if isinstance(exc, AppointmentNotBookable):
        # Prefer structured field errors when present.
        if exc.errors:
            return Response(exc.errors, status=status.HTTP_400_BAD_REQUEST)
        return Response({"detail": exc.message}, status=status.HTTP_400_BAD_REQUEST)
    raise exc


def _get_appointment_or_404(pk):
    return get_object_or_404(base_queryset(), pk=pk)


def _serialize(appointment, request, *, mobile=False):
    serializer_cls = AppointmentMobileSerializer if mobile else AppointmentSerializer
    return serializer_cls(appointment, context={"request": request}).data


# ---------------------------------------------------------------------------
# List + Create   /api/appointments/
# ---------------------------------------------------------------------------

class AppointmentListCreateView(APIView):
    permission_classes = [IsAuthenticated]
    pagination_class = AppointmentPagination

    def get(self, request):
        qs = filter_list(visible_to(request.user), request.query_params)
        paginator = self.pagination_class()
        page = paginator.paginate_queryset(qs, request, view=self)
        serializer = AppointmentSerializer(page, many=True, context={"request": request})
        return paginator.get_paginated_response(serializer.data)

    def post(self, request):
        if getattr(request.user, "doctor", None):
            return Response(
                {"detail": "Doctors cannot create patient appointments."},
                status=status.HTTP_403_FORBIDDEN,
            )

        # Route to the mobile shape when the payload uses mobile field names.
        if "date" in request.data and "appointment_date" not in request.data:
            return self._create_from_mobile(request)

        return self._create_from_staff(request)

    # ------------------------------------------------------------------
    # Create paths
    # ------------------------------------------------------------------

    def _create_from_staff(self, request):
        serializer = AppointmentCreateSerializer(
            data=request.data, context={"request": request}
        )
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        try:
            appointment = book_appointment(
                patient=request.user,
                doctor=data["doctor"],
                appointment_type=Appointment.AppointmentType.DOCTOR_VISIT,
                appointment_date=data["appointment_date"],
                appointment_time=data["appointment_time"],
                duration_minutes=data["duration_minutes"],
                auto_confirm=True,
            )
        except (AppointmentNotBookable, AppointmentSlotTaken) as exc:
            return _domain_error_response(exc)

        appointment = base_queryset().get(pk=appointment.pk)
        return Response(
            _serialize(appointment, request),
            status=status.HTTP_201_CREATED,
        )

    def _create_from_mobile(self, request):
        serializer = AppointmentMobileCreateSerializer(
            data=request.data, context={"patient": request.user, "request": request}
        )
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        try:
            appointment = book_appointment(
                patient=request.user,
                doctor=None,
                appointment_type=data["appointment_type"],
                appointment_date=data["date"],
                appointment_time=data["time"],
                duration_minutes=data["duration_minutes"],
                provider_name=data["withName"],
                reminder_minutes=data["reminderMinutes"],
                auto_confirm=True,
            )
        except (AppointmentNotBookable, AppointmentSlotTaken) as exc:
            return _domain_error_response(exc)

        return Response(
            _serialize(appointment, request, mobile=True),
            status=status.HTTP_201_CREATED,
        )


# ---------------------------------------------------------------------------
# Mine   GET /api/appointments/mine/
# ---------------------------------------------------------------------------

class AppointmentMineView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        qs = (
            base_queryset()
            .filter(
                patient=request.user,
                status__in=(
                    Appointment.Status.PENDING,
                    Appointment.Status.CONFIRMED,
                ),
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
        appointment = _get_appointment_or_404(pk)
        if not user_can_access(request.user, appointment):
            return Response(
                {"detail": "You do not have access to this appointment."},
                status=status.HTTP_403_FORBIDDEN,
            )
        return Response(_serialize(appointment, request))

    def patch(self, request, pk):
        appointment = _get_appointment_or_404(pk)
        if not (request.user.is_staff or user_is_patient_of(request.user, appointment)):
            return Response(
                {"detail": "You cannot change this appointment."},
                status=status.HTTP_403_FORBIDDEN,
            )

        serializer = AppointmentReminderSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        appointment.reminder_minutes = serializer.validated_data["reminderMinutes"]
        appointment.save(update_fields=["reminder_minutes", "updated_at"])
        return Response(_serialize(appointment, request, mobile=True))

    def delete(self, request, pk):
        appointment = _get_appointment_or_404(pk)
        if not user_can_access(request.user, appointment):
            return Response(
                {"detail": "You cannot cancel this appointment."},
                status=status.HTTP_403_FORBIDDEN,
            )

        try:
            cancel_appointment(appointment=appointment, user=request.user)
        except InvalidAppointmentTransition as exc:
            return _domain_error_response(exc)
        return Response(status=status.HTTP_204_NO_CONTENT)


# ---------------------------------------------------------------------------
# Cancel   POST /api/appointments/<pk>/cancel/
# ---------------------------------------------------------------------------

class AppointmentCancelView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, pk):
        appointment = _get_appointment_or_404(pk)
        if not user_can_access(request.user, appointment):
            return Response(
                {"detail": "You cannot cancel this appointment."},
                status=status.HTTP_403_FORBIDDEN,
            )

        serializer = AppointmentCancelSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        try:
            appointment = cancel_appointment(
                appointment=appointment,
                user=request.user,
                reason=serializer.validated_data["cancellation_reason"],
            )
        except (InvalidAppointmentTransition, AppointmentNotBookable) as exc:
            return _domain_error_response(exc)

        return Response(_serialize(appointment, request))


# ---------------------------------------------------------------------------
# Confirm / Complete / No-show
# ---------------------------------------------------------------------------

class _TransitionView(APIView):
    permission_classes = [IsAuthenticated]

    forbidden_message = ""
    transition = None  # set in subclasses

    def post(self, request, pk):
        appointment = _get_appointment_or_404(pk)

        if not user_can_manage(request.user, appointment):
            return Response(
                {"detail": self.forbidden_message},
                status=status.HTTP_403_FORBIDDEN,
            )

        try:
            appointment = self.transition(appointment)
        except InvalidAppointmentTransition as exc:
            return _domain_error_response(exc)

        return Response(_serialize(appointment, request))


class AppointmentConfirmView(_TransitionView):
    forbidden_message = "You cannot confirm this appointment."
    transition = staticmethod(confirm_appointment)


class AppointmentCompleteView(_TransitionView):
    forbidden_message = "You cannot complete this appointment."
    transition = staticmethod(complete_appointment)


class AppointmentNoShowView(_TransitionView):
    forbidden_message = "You cannot mark this appointment as no-show."
    transition = staticmethod(mark_no_show)


# ---------------------------------------------------------------------------
# Reschedule   POST /api/appointments/<pk>/reschedule/
# ---------------------------------------------------------------------------

class AppointmentRescheduleView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, pk):
        appointment = _get_appointment_or_404(pk)

        if not (request.user.is_staff or user_is_patient_of(request.user, appointment)):
            return Response(
                {"detail": "You cannot reschedule this appointment."},
                status=status.HTTP_403_FORBIDDEN,
            )

        try:
            assert_reschedulable(appointment)
        except InvalidAppointmentTransition as exc:
            return _domain_error_response(exc)

        serializer = AppointmentRescheduleSerializer(
            data=request.data,
            context={"appointment": appointment, "request": request},
        )
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        try:
            appointment = reschedule_appointment(
                appointment=appointment,
                appointment_date=data["appointment_date"],
                appointment_time=data["appointment_time"],
                reason_for_visit=data.get("reason_for_visit"),
            )
        except (AppointmentNotBookable, AppointmentSlotTaken, InvalidAppointmentTransition) as exc:
            return _domain_error_response(exc)

        appointment = base_queryset().get(pk=appointment.pk)
        return Response(_serialize(appointment, request))