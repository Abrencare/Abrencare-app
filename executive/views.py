from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from django.utils import timezone
from datetime import timedelta

from .models import (
    ExecutiveProfile, Reading, HealthScoreSnapshot,
    HealthAlert, CareTeamMember, UpcomingCare,
    EmergencyEvent, MedicationSchedule,
    MedicationAlert, HealthProgrammeItem, WeeklyReport,
)
from .serializers import (
    CareTeamMemberSerializer,
    ExecutiveCareSerializer,
    ExecutiveProfileCreateSerializer,
    ExecutiveProfileSerializer,
    ExecutiveOnboardingCompleteSerializer,ExecutiveDashboardSerializer,
    ExecutiveEmergencySerializer,
    ExecutiveProgrammeSerializer,
    ExecutiveReportsSerializer,
)
from .services import ExecutiveProfileService, ExecutiveServiceError
from accounts.serializers import UserSerializer

from datetime import timedelta
from django.db.models import Max


def _get_profile(user):
    return ExecutiveProfile.objects.filter(
        user_service__user=user,
    ).first()

def _error(message, code=status.HTTP_400_BAD_REQUEST):
    return Response({"detail": message}, status=code)


class ExecutiveMeView(APIView):
    """
    GET /api/executive/me/
    Returns the full executive state for the current user.
    """

    permission_classes = [IsAuthenticated]

    def get(self, request):
        profile = ExecutiveProfileService.get_profile(user=request.user)
        if profile is None:
            return Response(
                {"enrolled": False, "profile": None},
                status=status.HTTP_200_OK,
            )

        return Response(
            {
                "enrolled": True,
                "profile": ExecutiveProfileSerializer(profile).data,
                "careTeam": CareTeamMemberSerializer(
                    ExecutiveProfileService.get_care_team(user=request.user),
                    many=True,
                ).data,
            }
        )


class ExecutiveProfileView(APIView):
    """
    POST /api/executive/profile/
    Body: { dateOfBirth, gender, heightCm, weightKg }
    """

    permission_classes = [IsAuthenticated]

    def post(self, request):
        print(request.data)
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
            return _error(str(exc), status.HTTP_403_FORBIDDEN)

        return Response(
            ExecutiveProfileSerializer(profile).data,
            status=status.HTTP_200_OK,
        )

    def get(self, request):
        profile = ExecutiveProfileService.get_profile(user=request.user)
        if profile is None:
            return _error("Profile not found.", status.HTTP_404_NOT_FOUND)
        return Response(ExecutiveProfileSerializer(profile).data)


class ExecutiveCareView(APIView):
    """
    POST /api/executive/care/
    Body: { monitoring: [...], frequency: "managed" }
    """

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
            return _error(str(exc), status.HTTP_403_FORBIDDEN)

        return Response(
            ExecutiveProfileSerializer(profile).data,
            status=status.HTTP_200_OK,
        )


class ExecutiveCompleteView(APIView):
    """
    POST /api/executive/complete/
    Marks onboarding done. Currently a no-op stub — extend with a
    `completed_at` field on ExecutiveProfile when ready.
    """

    permission_classes = [IsAuthenticated]

    def post(self, request):
        profile = ExecutiveProfileService.get_profile(user=request.user)
        if profile is None:
            return _error("Profile not found.", status.HTTP_404_NOT_FOUND)

        # TODO: set profile.completed_at = timezone.now() when field exists
        return Response({"completed": True}, status=status.HTTP_200_OK)


class ExecutiveOnboardingCompleteView(APIView):
    """
    POST /api/executive/onboarding/complete/

    Accepts the combined executive onboarding payload, persists the
    demographics + care preferences, flips UserService.onboarded=True,
    and returns the fresh User object so AuthContext.applySession can
    hydrate executiveOnboarded on the client.
    """
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
            return _error(str(exc), status.HTTP_403_FORBIDDEN)

        # Refresh to pick up UserService.onboarded + profile changes
        request.user.refresh_from_db()
        return Response(
            UserSerializer(request.user).data,
            status=status.HTTP_200_OK,
        )

class ExecutiveCareTeamView(APIView):
    """
    GET /api/executive/care-team/
    Used by ExecutiveReadyScreen.
    """

    permission_classes = [IsAuthenticated]

    def get(self, request):
        members = ExecutiveProfileService.get_care_team(user=request.user)
        return Response(CareTeamMemberSerializer(members, many=True).data)


class ExecutiveDashboardView(APIView):
    """
    GET /api/executive/dashboard/
    Returns everything ExecutiveOverview needs in one call.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        profile = (
            ExecutiveProfile.objects
            .select_related("user_service__user")
            .filter(
                user_service__user=request.user,
                user_service__service__code="executive",
            )
            .first()
        )
        if profile is None:
            return Response(
                {"detail": "Executive profile not found."},
                status=status.HTTP_404_NOT_FOUND,
            )

        # ---- selected metrics (source of truth) ----
        # Cast to plain strings so comparisons against Reading.metric are
        # stable even if the enum class changes.
        selected_metrics = [str(m) for m in (profile.monitoring or [])]

        # ---- latest reading per selected metric ----
        # distinct("metric") requires PostgreSQL; falls back to per-metric
        # queries otherwise.
        latest_per_metric = (
            profile.readings
            .filter(metric__in=selected_metrics)
            .values("metric")
            .annotate(latest=Max("recorded_at"))
        )
        latest_at_map = {row["metric"]: row["latest"] for row in latest_per_metric}

        # Fetch the actual Reading rows once, indexed by metric.
        # Only the most recent reading per metric is needed.
        by_metric = {}
        for r in (
            profile.readings
            .filter(metric__in=selected_metrics)
            .order_by("-recorded_at")
        ):
            if r.metric not in by_metric and str(r.metric) in latest_at_map:
                by_metric[str(r.metric)] = r

        # Preserve the user's selection order.
        readings = [by_metric[m] for m in selected_metrics if m in by_metric]

        last_at = max((r.recorded_at for r in readings), default=None)
        up_to_date = bool(
            last_at and last_at >= timezone.now() - timedelta(days=2)
        )

        payload = {
            "score": profile.health_scores.first(),
            "alert": profile.alerts.filter(resolved=False, severity="info").first(),
            "attention": profile.alerts.filter(resolved=False, severity="flag").first(),
            "manager": profile.care_team.filter(role="manager").first(),
            "physician": profile.care_team.filter(role="physician").first(),
            "readings": readings,
            "monitoring": selected_metrics,
            "frequency": profile.frequency,
            "lastMonitoredAt": last_at,
            "upToDate": up_to_date,
            "upcomingCare": (
                profile.upcoming_care
                .filter(scheduled_for__gte=timezone.now())
                .first()
            ),
        }

        return Response(ExecutiveDashboardSerializer(payload).data)
    
class ExecutiveEmergencyView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        profile = _get_profile(request.user)
        event = (
            profile.emergency_events.filter(status="active")
            .order_by("-activated_at").first()
            if profile else None
        )
        team = profile.care_team.all() if profile else []
        coordinator = next((m for m in team if m.role == "manager"), None)
        physician = next((m for m in team if m.role == "physician"), None)
        return Response(ExecutiveEmergencySerializer({
            "event": event,
            "coordinator": coordinator,
            "physician": physician,
        }).data)


class ExecutiveProgrammeView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        profile = _get_profile(request.user)
        if profile is None:
            return Response({"detail": "No executive profile."}, status=404)

        meds = MedicationSchedule.objects.filter(
            medication__executive_profile=profile, medication__active=True,
        )
        alerts = MedicationAlert.objects.filter(
            executive_profile=profile, resolved=False,
        )
        items = profile.programme_items.all()
        physician = profile.care_team.filter(role="physician").first()

        taken = sum(1 for m in meds if m.status == "taken")
        on_track = sum(1 for i in items if i.status != "soon")

        return Response(ExecutiveProgrammeSerializer({
            "medications": meds,
            "medicationAlerts": alerts,
            "programmeItems": items,
            "physician": physician,
            "takenCount": taken,
            "medicationCount": meds.count(),
            "onTrackCount": on_track,
            "programmeCount": items.count(),
        }).data)


class ExecutiveReportsView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, period="week"):
        profile = _get_profile(request.user)
        if profile is None:
            return Response({"detail": "No executive profile."}, status=404)

        report = (
            profile.reports.filter(period=period)
            .order_by("-generated_at").first()
        )
        return Response(ExecutiveReportsSerializer({
            "report": report,
            "availablePeriods": ["week", "month"],
        }).data)
     