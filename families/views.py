# backend/families/views.py

from django.db.models import Q
from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework import generics, permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import (
    FamilyMember,
    FamilyProfile,
    FamilyReading,
    CarePlanItem,
    CareVisit,
    FamilyCareTeamMember,
    FamilyAttentionFlag,
    FamilyReport,
    FamilyPrescription,
    FamilyLabResult,
    FamilyHistoryEntry
)
from .serializers import (
    FamilyMemberSerializer,
    FamilyProfileSerializer,
    FamilyMemberOverviewSerializer,
    FamilyReadingSerializer,
    CarePlanItemSerializer,
    CareVisitSerializer,
    FamilyCareTeamMemberSerializer,
    FamilyAttentionFlagSerializer,
    FamilyHistoryEntrySerializer,
    FamilyReportSerializer,
    FamilyPrescriptionSerializer,
    FamilyLabResultSerializer
)
from .services.family import (
    complete_family_onboarding,
    create_family_profile_for_user,
    get_user_family_profile,
    replace_family_members,
    user_has_family_service,
)


# ============================================================
# SHARED HELPERS
# ============================================================

def user_family_members(user):
    """
    All FamilyMember rows for the current user's family profile.

    Ownership path:
        FamilyMember.family_profile
            → FamilyProfile.user_service
                → UserService.user
                    → User
    """
    if not user or not user.is_authenticated:
        return FamilyMember.objects.none()

    return (
        FamilyMember.objects
        .filter(family_profile__user_service__user=user)
        .select_related("family_profile")
    )


def user_owns_member(user, member: FamilyMember) -> bool:
    """True if `user` owns the family profile this member belongs to."""
    if not user or not user.is_authenticated:
        return False
    if user.is_staff:
        return True
    return member.family_profile.user_service.user_id == user.id


def get_member_or_404(user, pk) -> FamilyMember:
    """Fetch a FamilyMember the given user is allowed to see."""
    return get_object_or_404(user_family_members(user), pk=pk)


EMPTY_PROFILE = {"onboarded": False, "members": []}


# ============================================================
# FAMILY PROFILE — ROSTER OF FamilyMember ROWS
# ============================================================

class FamilyProfileView(APIView):
    """
    GET  /family/profile/   → current user's family profile + members + onboarded
    PUT  /family/profile/   → replace members roster (full replace)
    """

    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        if not user_has_family_service(request.user):
            return Response(
                {"detail": "This account does not have the family service."},
                status=status.HTTP_404_NOT_FOUND,
            )

        profile = get_user_family_profile(request.user)
        if profile is None:
            return Response(EMPTY_PROFILE)

        return Response(FamilyProfileSerializer(profile).data)

    def put(self, request):
        if not user_has_family_service(request.user):
            return Response(
                {"detail": "This account does not have the family service."},
                status=status.HTTP_404_NOT_FOUND,
            )

        profile = get_user_family_profile(request.user)
        if profile is None:
            profile = create_family_profile_for_user(request.user)

        member_ser = FamilyMemberSerializer(
            data=request.data.get("members", []),
            many=True,
        )
        member_ser.is_valid(raise_exception=True)
        replace_family_members(profile, member_ser.validated_data)

        profile.refresh_from_db()
        return Response(FamilyProfileSerializer(profile).data)


class FamilyMemberListView(generics.ListCreateAPIView):
    """
    GET  /family/members/   → flat list of the current user's family members
    POST /family/members/   → add a single family member
    """

    permission_classes = [permissions.IsAuthenticated]
    serializer_class = FamilyMemberSerializer

    def get_queryset(self):
        return user_family_members(self.request.user).order_by("full_name")

    def perform_create(self, serializer):
        profile = get_user_family_profile(self.request.user)
        if profile is None:
            profile = create_family_profile_for_user(self.request.user)
        serializer.save(family_profile=profile)


class FamilyMemberDetailView(generics.RetrieveUpdateDestroyAPIView):
    """
    GET    /family/members/<pk>/
    PATCH  /family/members/<pk>/
    DELETE /family/members/<pk>/
    """

    permission_classes = [permissions.IsAuthenticated]
    serializer_class = FamilyMemberSerializer

    def get_queryset(self):
        return user_family_members(self.request.user)


class FamilyMemberByRelationshipView(generics.ListAPIView):
    """
    GET /family/members/by-relationship/?relationship=mother
    """

    permission_classes = [permissions.IsAuthenticated]
    serializer_class = FamilyMemberSerializer

    def get_queryset(self):
        qs = user_family_members(self.request.user)
        relationship = self.request.query_params.get("relationship")
        if relationship:
            qs = qs.filter(relationship=relationship)
        return qs.order_by("full_name")


class FamilyOnboardingCompleteView(APIView):
    """
    POST /family/onboarding/complete/
    """

    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        profile = get_user_family_profile(request.user)
        if profile is None:
            return Response(
                {"detail": "Save your family members before completing onboarding."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        complete_family_onboarding(profile)
        return Response({"onboarded": True})


# ============================================================
# AGGREGATE VIEW — THE FAMILY DASHBOARD
# ============================================================

class FamilyMemberOverviewView(APIView):
    """
    GET /family/members/<member_id>/overview/

    Single call that powers the family dashboard for one FamilyMember:
    readings, today's care plan, live visit, care team, attention flags.

    Replaces the old Patient-based FamilyOverviewView.
    """

    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, member_id):
        member = get_member_or_404(request.user, member_id)
        data = FamilyMemberOverviewSerializer(member).data
        return Response(data)


# ============================================================
# SECTION VIEWS (per FamilyMember)
# ============================================================

class MemberReadingListView(generics.ListCreateAPIView):
    """
    GET  /family/members/<member_id>/readings/
    POST /family/members/<member_id>/readings/
    """

    permission_classes = [permissions.IsAuthenticated]
    serializer_class = FamilyReadingSerializer

    def get_queryset(self):
        member = get_member_or_404(self.request.user, self.kwargs["member_id"])
        qs = FamilyReading.objects.filter(member=member)
        kind = self.request.query_params.get("kind")
        if kind:
            qs = qs.filter(kind=kind)
        return qs.order_by("-recorded_at")

    def perform_create(self, serializer):
        member = get_member_or_404(self.request.user, self.kwargs["member_id"])
        serializer.save(member=member)


class MemberCarePlanListView(generics.ListCreateAPIView):
    """
    GET  /family/members/<member_id>/care-plan/
    POST /family/members/<member_id>/care-plan/
    """

    permission_classes = [permissions.IsAuthenticated]
    serializer_class = CarePlanItemSerializer

    def get_queryset(self):
        member = get_member_or_404(self.request.user, self.kwargs["member_id"])
        return CarePlanItem.objects.filter(member=member).order_by(
            "order", "scheduled_time",
        )

    def perform_create(self, serializer):
        member = get_member_or_404(self.request.user, self.kwargs["member_id"])
        serializer.save(member=member)


class CarePlanItemCompleteView(APIView):
    """
    POST /family/members/<member_id>/care-plan/<item_id>/complete/
    """

    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, member_id, item_id):
        member = get_member_or_404(request.user, member_id)
        item = get_object_or_404(CarePlanItem, pk=item_id, member=member)
        item.done = True
        item.save(update_fields=["done"])
        return Response(CarePlanItemSerializer(item).data)


class MemberVisitListView(generics.ListCreateAPIView):
    """
    GET  /family/members/<member_id>/visits/
    POST /family/members/<member_id>/visits/
    """

    permission_classes = [permissions.IsAuthenticated]
    serializer_class = CareVisitSerializer

    def get_queryset(self):
        member = get_member_or_404(self.request.user, self.kwargs["member_id"])
        return CareVisit.objects.filter(member=member).order_by("-started_at")

    def perform_create(self, serializer):
        member = get_member_or_404(self.request.user, self.kwargs["member_id"])
        serializer.save(member=member)


class MemberVisitStartView(APIView):
    """
    POST /family/members/<member_id>/visits/<visit_id>/start/
    """

    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, member_id, visit_id):
        member = get_member_or_404(request.user, member_id)
        visit = get_object_or_404(CareVisit, pk=visit_id, member=member)
        visit.state = CareVisit.State.IN_PROGRESS
        visit.started_at = timezone.now()
        visit.save(update_fields=["state", "started_at"])
        return Response(CareVisitSerializer(visit).data)


class MemberVisitEndView(APIView):
    """
    POST /family/members/<member_id>/visits/<visit_id>/end/
    """

    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, member_id, visit_id):
        member = get_member_or_404(request.user, member_id)
        visit = get_object_or_404(CareVisit, pk=visit_id, member=member)
        visit.state = CareVisit.State.COMPLETED
        visit.ended_at = timezone.now()
        visit.save(update_fields=["state", "ended_at"])
        return Response(CareVisitSerializer(visit).data)


class FamilyCareTeamView(generics.ListAPIView):
    """
    GET /family/care-team/
    """

    permission_classes = [permissions.IsAuthenticated]
    serializer_class = FamilyCareTeamMemberSerializer

    def get_queryset(self):
        profile = get_user_family_profile(self.request.user)
        if profile is None:
            return FamilyCareTeamMember.objects.none()
        return FamilyCareTeamMember.objects.filter(
            family_profile=profile,
        ).order_by("role", "full_name")


class FamilyAttentionFlagListView(generics.ListAPIView):
    """
    GET /family/attention/?open=1
    """

    permission_classes = [permissions.IsAuthenticated]
    serializer_class = FamilyAttentionFlagSerializer

    def get_queryset(self):
        profile = get_user_family_profile(self.request.user)
        if profile is None:
            return FamilyAttentionFlag.objects.none()
        qs = FamilyAttentionFlag.objects.filter(family_profile=profile)
        only_open = self.request.query_params.get("open")
        if only_open in ("1", "true", "True"):
            qs = qs.filter(resolved=False)
        return qs.order_by("-created_at")


class FamilyAttentionFlagResolveView(APIView):
    """
    POST /family/attention/<flag_id>/resolve/
    """

    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, flag_id):
        profile = get_user_family_profile(request.user)
        if profile is None:
            return Response(
                {"detail": "No family profile."},
                status=status.HTTP_404_NOT_FOUND,
            )
        flag = get_object_or_404(
            FamilyAttentionFlag, pk=flag_id, family_profile=profile,
        )
        flag.resolved = True
        flag.save(update_fields=["resolved"])
        return Response(FamilyAttentionFlagSerializer(flag).data)

class MemberReportListView(generics.ListAPIView):
    """GET /family/members/<member_id>/reports/"""
    permission_classes = [permissions.IsAuthenticated]
    serializer_class = FamilyReportSerializer

    def get_queryset(self):
        member = get_member_or_404(self.request.user, self.kwargs["member_id"])
        return FamilyReport.objects.filter(member=member)


class MemberPrescriptionListView(generics.ListAPIView):
    """GET /family/members/<member_id>/prescriptions/"""
    permission_classes = [permissions.IsAuthenticated]
    serializer_class = FamilyPrescriptionSerializer

    def get_queryset(self):
        member = get_member_or_404(self.request.user, self.kwargs["member_id"])
        return FamilyPrescription.objects.filter(member=member)


class MemberLabResultListView(generics.ListAPIView):
    """GET /family/members/<member_id>/labs/"""
    permission_classes = [permissions.IsAuthenticated]
    serializer_class = FamilyLabResultSerializer

    def get_queryset(self):
        member = get_member_or_404(self.request.user, self.kwargs["member_id"])
        return FamilyLabResult.objects.filter(member=member)


class MemberHistoryListView(generics.ListAPIView):
    """GET /family/members/<member_id>/history/"""
    permission_classes = [permissions.IsAuthenticated]
    serializer_class = FamilyHistoryEntrySerializer

    def get_queryset(self):
        member = get_member_or_404(self.request.user, self.kwargs["member_id"])
        return FamilyHistoryEntry.objects.filter(member=member)
    