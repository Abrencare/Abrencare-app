"""HTTP layer. No ORM. No business rules. Just wire-up."""

import logging

from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from accounts.serializers import UserSerializer

from .serializers import (
    CareTeamMemberSerializer,
    ExecutiveCareSerializer,
    ExecutiveDashboardSerializer,
    ExecutiveEmergencySerializer,
    ExecutiveOnboardingCompleteSerializer,
    ExecutiveProfileCreateSerializer,
    ExecutiveProfileSerializer,
    ExecutiveProgrammeSerializer,
    ExecutiveReportsSerializer,
    ResolveAlertSerializer,
)
from .services.services import (
    CareTeamService,
    ExecutiveNotEnrolled,
    ExecutiveProfileExists,
    ExecutiveProfileMissing,
    ExecutiveProfileService,
    ExecutiveServiceError,
    Selector,
)

logger = logging.getLogger(__name__)


# ============================================================================
# MIXIN — uniform error translation
# ============================================================================

class ExecutiveErrorMixin:
    """Map service exceptions → HTTP responses. Use on every executive view."""

    ERROR_STATUS = {
        ExecutiveNotEnrolled: status.HTTP_403_FORBIDDEN,
        ExecutiveProfileMissing: status.HTTP_404_NOT_FOUND,
    }

    def handle_service_error(self, exc: ExecutiveServiceError) -> Response:
        http_status = self.ERROR_STATUS.get(
            type(exc), status.HTTP_400_BAD_REQUEST,
        )
        return Response(
            {"detail": str(exc), "code": getattr(exc, "code", "error")},
            status=http_status,
        )

class ExecutiveErrorMixin:
    """Map service exceptions → HTTP responses. Use on every executive view."""

    ERROR_STATUS = {
        ExecutiveNotEnrolled: status.HTTP_403_FORBIDDEN,
        ExecutiveProfileMissing: status.HTTP_404_NOT_FOUND,
    }

    def handle_service_error(self, exc: ExecutiveServiceError) -> Response:
        http_status = self.ERROR_STATUS.get(
            type(exc), status.HTTP_400_BAD_REQUEST,
        )
        return Response(
            {"detail": str(exc), "code": getattr(exc, "code", "error")},
            status=http_status,
        )
        
# ============================================================================
# PROFILE + ONBOARDING
# ============================================================================

class ExecutiveMeView(ExecutiveErrorMixin, APIView):
    """GET /api/executive/me/ — current user's executive state."""

    permission_classes = [IsAuthenticated]

    def get(self, request):
        try:
            profile = Selector.get_profile_for_user(request.user)
        except ExecutiveProfileMissing:
            return Response({"enrolled": False, "profile": None})

        return Response({
            "enrolled": True,
            "profile": ExecutiveProfileSerializer(profile).data,
            "careTeam": CareTeamMemberSerializer(
                Selector.get_care_team_members(request.user), many=True,
            ).data,
        })


class ExecutiveProfileView(ExecutiveErrorMixin, APIView):
    """GET/POST /api/executive/profile/"""

    permission_classes = [IsAuthenticated]

    def get(self, request):
        try:
            profile = Selector.get_profile_for_user(request.user)
        except ExecutiveProfileMissing as exc:
            return self.handle_service_error(exc)
        return Response(ExecutiveProfileSerializer(profile).data)

    def post(self, request):
        serializer = ExecutiveProfileCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        try:
            profile = ExecutiveProfileService.save_profile(
                user=request.user,
                date_of_birth=data["dateOfBirth"],
                gender=data["gender"],
                height_cm=data["heightCm"],
                weight_kg=data["weightKg"],
            )
        except ExecutiveServiceError as exc:
            return self.handle_service_error(exc)

        return Response(ExecutiveProfileSerializer(profile).data)


class ExecutiveCareView(ExecutiveErrorMixin, APIView):
    """POST /api/executive/care/ — monitoring + frequency."""

    permission_classes = [IsAuthenticated]

    def post(self, request):
        serializer = ExecutiveCareSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        try:
            profile = ExecutiveProfileService.save_care(
                user=request.user,
                monitoring=serializer.validated_data["monitoring"],
                frequency=serializer.validated_data["frequency"],
            )
        except ExecutiveServiceError as exc:
            return self.handle_service_error(exc)

        return Response(ExecutiveProfileSerializer(profile).data)


class ExecutiveOnboardingCompleteView(ExecutiveErrorMixin, APIView):
    """POST /api/executive/onboarding/complete/ — atomic end-of-onboarding."""

    permission_classes = [IsAuthenticated]

    def post(self, request):
        serializer = ExecutiveOnboardingCompleteSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        try:
            ExecutiveProfileService.save_profile(
                user=request.user,
                date_of_birth=data["date_of_birth"],
                gender=data["gender"] or "prefer_not",
                height_cm=data["height_cm"],
                weight_kg=data["weight_kg"],
            )
            ExecutiveProfileService.save_care(
                user=request.user,
                monitoring=data["monitoring"],
                frequency=data["frequency"],
            )
            ExecutiveProfileService.mark_onboarded(user=request.user)
        except ExecutiveServiceError as exc:
            return self.handle_service_error(exc)

        request.user.refresh_from_db()
        return Response(UserSerializer(request.user).data)


class ExecutiveCompleteView(ExecutiveErrorMixin, APIView):
    """POST /api/executive/complete/ — legacy stub endpoint."""

    permission_classes = [IsAuthenticated]

    def post(self, request):
        try:
            ExecutiveProfileService.mark_onboarded(user=request.user)
        except ExecutiveServiceError as exc:
            return self.handle_service_error(exc)
        return Response({"completed": True})


# ============================================================================
# CARE TEAM
# ============================================================================

class ExecutiveCareTeamView(ExecutiveErrorMixin, APIView):
    """GET /api/executive/care-team/ — used by ExecutiveReadyScreen."""

    permission_classes = [IsAuthenticated]

    def get(self, request):
        return Response(
            CareTeamMemberSerializer(
                Selector.get_care_team_members(request.user), many=True,
            ).data,
        )


# ============================================================================
# DASHBOARD
# ============================================================================

class ExecutiveDashboardView(ExecutiveErrorMixin, APIView):
    """GET /api/executive/dashboard/ — everything ExecutiveOverview needs."""

    permission_classes = [IsAuthenticated]

    def get(self, request):
        try:
            bundle = Selector.build_dashboard(request.user)
        except ExecutiveProfileMissing as exc:
            return Response(
                {"detail": str(exc), "code": exc.code},
                status=status.HTTP_404_NOT_FOUND,
            )
        except ExecutiveServiceError as exc:
            return Response(
                {"detail": str(exc), "code": exc.code},
                status=status.HTTP_400_BAD_REQUEST,
            )

        payload = {
            "score": bundle.score,
            "alert": bundle.info_alert,
            "attention": bundle.flag_alert,
            "manager": bundle.manager,
            "physician": bundle.physician,
            "readings": bundle.readings,
            "monitoring": bundle.profile.monitoring or [],
            "frequency": bundle.profile.frequency,
            "lastMonitoredAt": bundle.last_monitored_at,
            "upToDate": bundle.up_to_date,
            "upcomingCare": bundle.upcoming_care,
        }
        return Response(ExecutiveDashboardSerializer(payload).data)


# ============================================================================
# EMERGENCY
# ============================================================================

class ExecutiveEmergencyView(ExecutiveErrorMixin, APIView):
    """GET /api/executive/emergency/ — hero + coordinator cards."""

    permission_classes = [IsAuthenticated]

    def get(self, request):
        try:
            profile = Selector.get_profile_for_user(request.user)
        except ExecutiveServiceError as exc:
            return self.handle_service_error(exc)

        event = Selector.get_active_emergency(request.user)
        team = list(profile.care_team.all())
        coordinator = next(
            (m for m in team if m.role == "manager"), None,
        )
        physician = next(
            (m for m in team if m.role == "physician"), None,
        )

        return Response(ExecutiveEmergencySerializer({
            "event": event,
            "coordinator": coordinator,
            "physician": physician,
        }).data)


# ============================================================================
# PROGRAMME
# ============================================================================

class ExecutiveProgrammeView(ExecutiveErrorMixin, APIView):
    """GET /api/executive/programme/ — medication + programme tiles."""

    permission_classes = [IsAuthenticated]

    def get(self, request):
        try:
            bundle = Selector.build_programme(request.user)
        except ExecutiveServiceError as exc:
            return self.handle_service_error(exc)

        return Response(ExecutiveProgrammeSerializer({
            "medications": bundle.medications,
            "medicationAlerts": bundle.medication_alerts,
            "programmeItems": bundle.programme_items,
            "physician": bundle.physician,
            "takenCount": bundle.taken_count,
            "medicationCount": bundle.medication_count,
            "onTrackCount": bundle.on_track_count,
            "programmeCount": bundle.programme_count,
        }).data)


# ============================================================================
# REPORTS
# ============================================================================

class ExecutiveReportsView(ExecutiveErrorMixin, APIView):
    """GET /api/executive/reports/?period=week — reports screen."""

    permission_classes = [IsAuthenticated]

    def get(self, request, period: str = "week"):
        try:
            bundle = Selector.build_report(request.user, period=period)
        except ExecutiveServiceError as exc:
            return self.handle_service_error(exc)

        return Response(ExecutiveReportsSerializer({
            "report": bundle.report,
            "availablePeriods": bundle.available_periods,
        }).data)


# ============================================================================
# ALERT RESOLUTION (small write endpoints)
# ============================================================================

class HealthAlertResolveView(ExecutiveErrorMixin, APIView):
    """POST /api/executive/alerts/<pk>/resolve/"""

    permission_classes = [IsAuthenticated]

    def post(self, request, pk: int):
        serializer = ResolveAlertSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        try:
            alert = ExecutiveProfileService.resolve_health_alert(
                user=request.user, alert_id=pk,
            )
        except ExecutiveServiceError as exc:
            return self.handle_service_error(exc)
        return Response({"id": alert.pk, "resolved": alert.resolved})


class MedicationAlertResolveView(ExecutiveErrorMixin, APIView):
    """POST /api/executive/medication-alerts/<pk>/resolve/"""

    permission_classes = [IsAuthenticated]

    def post(self, request, pk: int):
        serializer = ResolveAlertSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        try:
            alert = ExecutiveProfileService.resolve_medication_alert(
                user=request.user, alert_id=pk,
            )
        except ExecutiveServiceError as exc:
            return self.handle_service_error(exc)
        return Response({"id": alert.pk, "resolved": alert.resolved})