# families/views.py

from django.db import transaction
from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework import generics, permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView
from .services.notifications import notify
from .models import (
    CarePlanItem,
    CareVisit,
    FamilyAttentionFlag,
    FamilyAuditLog,
    FamilyCareTeamMember,
    FamilyHistoryEntry,
    FamilyInvitation,
    FamilyLabResult,
    FamilyMember,
    FamilyMembership,
    FamilyPrescription,
    FamilyProfile,
    FamilyReading,
    FamilyReport,
    FamilyReportRead,
)
from .permissions import HasFamilyAccess, IsFamilyOwner
from .serializers import (
    CarePlanItemSerializer,
    CareVisitSerializer,
    FamilyAttentionFlagSerializer,
    FamilyCareTeamMemberSerializer,
    FamilyHistoryEntrySerializer,
    FamilyInvitationSerializer,
    FamilyLabResultSerializer,
    FamilyMemberOverviewSerializer,
    FamilyMemberSerializer,
    FamilyMembershipSerializer,
    FamilyPrescriptionSerializer,
    FamilyProfileSerializer,
    FamilyReadingSerializer,
    FamilyReportSerializer,
    MembershipPermissionUpdateSerializer,
)
from .services.audit import _create_audit_log
from .services.family import (
    complete_family_onboarding,
    create_family_profile_for_user,
    families_for_user,
    get_user_family_profile,
    replace_family_members,
    user_family_members,
    user_has_family_service,
)


# ============================================================
# SHARED HELPERS
# ============================================================

EMPTY_PROFILE = {"onboarded": False, "members": []}


def _user_profile(user) -> FamilyProfile | None:
    """The family profile the user owns, if any."""
    return get_user_family_profile(user)


def _user_members(user):
    """All FamilyMember rows across families the user can access."""
    return user_family_members(user).order_by("full_name")


def _get_member_or_404(user, member_id) -> FamilyMember:
    """Fetch a FamilyMember the user is allowed to see."""
    if user.is_staff:
        return get_object_or_404(FamilyMember, pk=member_id)
    return get_object_or_404(_user_members(user), pk=member_id)


def _require_family_service(user):
    """
    Ensure the user either owns the family service or observes a family.
    Returns None on success, otherwise a 404 Response.
    """
    if user_has_family_service(user) or families_for_user(user).exists():
        return None
    return Response(
        {"detail": "This account does not have the family service."},
        status=status.HTTP_404_NOT_FOUND,
    )


# ============================================================
# FAMILY PROFILE
# ============================================================

class FamilyProfileView(APIView):
    """
    GET  /family/profile/   → current user's family profile + members + onboarded
    PUT  /family/profile/   → replace members roster (owner only)
    """

    def get_permissions(self):
        if self.request.method == "GET":
            return [permissions.IsAuthenticated(), HasFamilyAccess()]
        return [permissions.IsAuthenticated(), IsFamilyOwner()]

    def get(self, request):
        guard = _require_family_service(request.user)
        if guard:
            return guard

        profile = _user_profile(request.user)
        if profile is None:
            # Observer: return the first family they can access.
            family = families_for_user(request.user).first()
            if family is None:
                return Response(EMPTY_PROFILE)
            self.check_object_permissions(request, family)
            return Response(FamilyProfileSerializer(family).data)

        self.check_object_permissions(request, profile)
        return Response(FamilyProfileSerializer(profile).data)

    @transaction.atomic
    def put(self, request):
        profile = _user_profile(request.user)
        if profile is None:
            profile = create_family_profile_for_user(request.user)
        self.check_object_permissions(request, profile)

        member_ser = FamilyMemberSerializer(
            data=request.data.get("members", []), many=True,
        )
        member_ser.is_valid(raise_exception=True)
        replace_family_members(profile, member_ser.validated_data)

        profile.refresh_from_db()
        return Response(FamilyProfileSerializer(profile).data)


class FamilyOnboardingCompleteView(APIView):
    """POST /family/onboarding/complete/ — owner only."""

    permission_classes = [permissions.IsAuthenticated, IsFamilyOwner]

    def post(self, request):
        profile = _user_profile(request.user)
        if profile is None:
            return Response(
                {"detail": "Save your family members before completing onboarding."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        self.check_object_permissions(request, profile)
        complete_family_onboarding(profile)
        return Response({"onboarded": True})


# ============================================================
# FAMILY MEMBERS
# ============================================================

class FamilyMemberListView(generics.ListCreateAPIView):
    """
    GET  /family/members/   → list (owner or observer)
    POST /family/members/   → create (owner only)
    """

    serializer_class = FamilyMemberSerializer

    def get_permissions(self):
        if self.request.method == "GET":
            return [permissions.IsAuthenticated(), HasFamilyAccess()]
        return [permissions.IsAuthenticated(), IsFamilyOwner()]

    def get_queryset(self):
        return _user_members(self.request.user)

    def perform_create(self, serializer):
        profile = _user_profile(self.request.user)
        if profile is None:
            from rest_framework.exceptions import PermissionDenied
            raise PermissionDenied("Only the family owner can add members.")
        self.check_object_permissions(self.request, profile)
        
        member = serializer.save(family=profile)
        notify.family_member_created(
            family=profile,
            member=member,
            actor=self.request.user,
        )


class FamilyMemberDetailView(generics.RetrieveUpdateDestroyAPIView):
    """
    GET    /family/members/<pk>/   → read (owner or observer)
    PATCH  /family/members/<pk>/   → update (owner only)
    DELETE /family/members/<pk>/   → delete (owner only)
    """

    serializer_class = FamilyMemberSerializer

    def get_permissions(self):
        if self.request.method == "GET":
            return [permissions.IsAuthenticated(), HasFamilyAccess()]
        return [permissions.IsAuthenticated(), IsFamilyOwner()]

    def get_queryset(self):
        return _user_members(self.request.user)


class FamilyMemberByRelationshipView(generics.ListAPIView):
    """GET /family/members/by-relationship/?relationship=mother"""

    permission_classes = [permissions.IsAuthenticated, HasFamilyAccess]
    serializer_class = FamilyMemberSerializer

    def get_queryset(self):
        qs = _user_members(self.request.user)
        relationship = self.request.query_params.get("relationship")
        if relationship:
            qs = qs.filter(relationship=relationship)
        return qs


# ============================================================
# AGGREGATE — THE FAMILY DASHBOARD
# ============================================================

class FamilyMemberOverviewView(APIView):
    """GET /family/members/<member_id>/overview/ — owner or observer."""

    permission_classes = [permissions.IsAuthenticated, HasFamilyAccess]

    def get(self, request, member_id):
        member = _get_member_or_404(request.user, member_id)
        self.check_object_permissions(request, member)
        return Response(
            FamilyMemberOverviewSerializer(
                member, context={"request": request},
            ).data
        )


# ============================================================
# READINGS
# ============================================================

class MemberReadingListView(generics.ListCreateAPIView):
    """
    GET  /family/members/<member_id>/readings/   → observer (can_view_readings)
    POST /family/members/<member_id>/readings/   → owner only
    """

    serializer_class = FamilyReadingSerializer
    required_permission = "can_view_readings"

    def get_permissions(self):
        if self.request.method == "GET":
            return [permissions.IsAuthenticated(), HasFamilyAccess()]
        return [permissions.IsAuthenticated(), IsFamilyOwner()]

    def get_queryset(self):
        member = _get_member_or_404(self.request.user, self.kwargs["member_id"])
        self.check_object_permissions(self.request, member)
        qs = FamilyReading.objects.filter(member=member)
        kind = self.request.query_params.get("kind")
        if kind:
            qs = qs.filter(kind=kind)
        return qs.order_by("-recorded_at")

    def perform_create(self, serializer):
        member = _get_member_or_404(self.request.user, self.kwargs["member_id"])
        self.check_object_permissions(self.request, member)
        
        reading = serializer.save(member=member, recorded_by=self.request.user)

        notify.family_reading_recorded(
            family=member.family,
            member=member,
            reading=reading,
            actor=self.request.user,
        )


# ============================================================
# CARE PLAN
# ============================================================

class MemberCarePlanListView(generics.ListCreateAPIView):
    """
    GET  /family/members/<member_id>/care-plan/   → observer (can_view_care_plan)
    POST /family/members/<member_id>/care-plan/   → owner only
    """

    serializer_class = CarePlanItemSerializer
    required_permission = "can_view_care_plan"

    def get_permissions(self):
        if self.request.method == "GET":
            return [permissions.IsAuthenticated(), HasFamilyAccess()]
        return [permissions.IsAuthenticated(), IsFamilyOwner()]

    def get_queryset(self):
        member = _get_member_or_404(self.request.user, self.kwargs["member_id"])
        self.check_object_permissions(self.request, member)
        return (
            CarePlanItem.objects
            .filter(member=member)
            .order_by("order", "scheduled_time")
        )

    def perform_create(self, serializer):
        member = _get_member_or_404(self.request.user, self.kwargs["member_id"])
        self.check_object_permissions(self.request, member)
        serializer.save(member=member)


class CarePlanItemCompleteView(APIView):
    """POST /family/members/<member_id>/care-plan/<item_id>/complete/ — owner only."""

    permission_classes = [permissions.IsAuthenticated, IsFamilyOwner]

    def post(self, request, member_id, item_id):
        member = _get_member_or_404(request.user, member_id)
        self.check_object_permissions(request, member)
        item = get_object_or_404(CarePlanItem, pk=item_id, member=member)

        item.done = True
        item.status = CarePlanItem.Status.DONE
        item.completed_by = request.user
        item.completed_at = timezone.now()
        item.save(update_fields=["done", "status", "completed_by", "completed_at"])
        notify.family_care_plan_item_completed(
            family=member.family,
            member=member,
            item=item,
            actor=request.user,
        )
        return Response(CarePlanItemSerializer(item).data)


# ============================================================
# VISITS
# ============================================================

class MemberVisitListView(generics.ListCreateAPIView):
    """
    GET  /family/members/<member_id>/visits/   → observer (can_view_visits)
    POST /family/members/<member_id>/visits/   → owner only
    """

    serializer_class = CareVisitSerializer
    required_permission = "can_view_visits"

    def get_permissions(self):
        if self.request.method == "GET":
            return [permissions.IsAuthenticated(), HasFamilyAccess()]
        return [permissions.IsAuthenticated(), IsFamilyOwner()]

    def get_queryset(self):
        member = _get_member_or_404(self.request.user, self.kwargs["member_id"])
        self.check_object_permissions(self.request, member)
        return CareVisit.objects.filter(member=member).order_by("-created_at")

    def perform_create(self, serializer):
        member = _get_member_or_404(self.request.user, self.kwargs["member_id"])
        self.check_object_permissions(self.request, member)
        visit = serializer.save(member=member)
        notify.family_visit_scheduled(
            family=member.family, member=member, visit=visit, actor=self.request.user,
        )


class MemberVisitStartView(APIView):
    """POST /family/members/<member_id>/visits/<visit_id>/start/ — owner only."""

    permission_classes = [permissions.IsAuthenticated, IsFamilyOwner]

    def post(self, request, member_id, visit_id):
        member = _get_member_or_404(request.user, member_id)
        self.check_object_permissions(request, member)
        visit = get_object_or_404(CareVisit, pk=visit_id, member=member)

        if visit.state == CareVisit.State.IN_PROGRESS:
            return Response(
                {"detail": "Visit already in progress."},
                status=status.HTTP_409_CONFLICT,
            )
        if visit.state in (CareVisit.State.COMPLETED, CareVisit.State.CANCELLED):
            return Response(
                {"detail": "Cannot start a finished visit."},
                status=status.HTTP_409_CONFLICT,
            )

        visit.state = CareVisit.State.IN_PROGRESS
        visit.started_at = timezone.now()
        visit.save(update_fields=["state", "started_at"])
        notify.family_visit_started(
            family=member.family, member=member, visit=visit, actor=request.user,
        )
        return Response(CareVisitSerializer(visit).data)


class MemberVisitEndView(APIView):
    """POST /family/members/<member_id>/visits/<visit_id>/end/ — owner only."""

    permission_classes = [permissions.IsAuthenticated, IsFamilyOwner]

    def post(self, request, member_id, visit_id):
        member = _get_member_or_404(request.user, member_id)
        self.check_object_permissions(request, member)
        visit = get_object_or_404(CareVisit, pk=visit_id, member=member)

        if visit.state != CareVisit.State.IN_PROGRESS:
            return Response(
                {"detail": "Only in-progress visits can be ended."},
                status=status.HTTP_409_CONFLICT,
            )

        visit.state = CareVisit.State.COMPLETED
        visit.ended_at = timezone.now()
        visit.save(update_fields=["state", "ended_at"])
        visit.save(update_fields=["state", "ended_at"])
        notify.family_visit_ended(
            family=member.family, member=member, visit=visit, actor=request.user,
        )
        return Response(CareVisitSerializer(visit).data)


# ============================================================
# CARE TEAM
# ============================================================

class FamilyCareTeamView(generics.ListAPIView):
    """GET /family/care-team/ — observer (can_view_care_team)."""

    permission_classes = [permissions.IsAuthenticated, HasFamilyAccess]
    serializer_class = FamilyCareTeamMemberSerializer
    required_permission = "can_view_care_team"

    def get_queryset(self):
        profile = _user_profile(self.request.user) or families_for_user(
            self.request.user
        ).first()
        if profile is None:
            return FamilyCareTeamMember.objects.none()
        self.check_object_permissions(self.request, profile)
        return (
            FamilyCareTeamMember.objects
            .filter(family=profile, ended_at__isnull=True)
            .select_related("staff")
            .order_by("-is_primary", "role", "full_name")
        )


# ============================================================
# ATTENTION FLAGS
# ============================================================

class FamilyAttentionFlagListView(generics.ListAPIView):
    """GET /family/attention/?open=1 — observer (can_view_attention)."""

    permission_classes = [permissions.IsAuthenticated, HasFamilyAccess]
    serializer_class = FamilyAttentionFlagSerializer
    required_permission = "can_view_attention"

    def get_queryset(self):
        profile = _user_profile(self.request.user) or families_for_user(
            self.request.user
        ).first()
        if profile is None:
            return FamilyAttentionFlag.objects.none()
        self.check_object_permissions(self.request, profile)
        qs = FamilyAttentionFlag.objects.filter(family=profile)
        if self.request.query_params.get("open") in ("1", "true", "True"):
            qs = qs.filter(resolved=False)
        return qs.order_by("-created_at")


class FamilyAttentionFlagResolveView(APIView):
    """POST /family/attention/<flag_id>/resolve/ — owner only."""

    permission_classes = [permissions.IsAuthenticated, IsFamilyOwner]

    def post(self, request, flag_id):
        profile = _user_profile(request.user)
        if profile is None:
            return Response(
                {"detail": "No family profile."},
                status=status.HTTP_404_NOT_FOUND,
            )
        self.check_object_permissions(request, profile)
        flag = get_object_or_404(FamilyAttentionFlag, pk=flag_id, family=profile)
        flag.resolved = True
        flag.resolved_at = timezone.now()
        flag.save(update_fields=["resolved", "resolved_at"])
        notify.family_attention_flag_resolved(
            family=profile, flag=flag, actor=request.user,
        )
        return Response(FamilyAttentionFlagSerializer(flag).data)


# ============================================================
# REPORTS
# ============================================================

class MemberReportListView(generics.ListAPIView):
    """GET /family/members/<member_id>/reports/ — observer (can_view_reports)."""

    permission_classes = [permissions.IsAuthenticated, HasFamilyAccess]
    serializer_class = FamilyReportSerializer
    required_permission = "can_view_reports"

    def get_queryset(self):
        member = _get_member_or_404(self.request.user, self.kwargs["member_id"])
        self.check_object_permissions(self.request, member)
        return FamilyReport.objects.filter(member=member).order_by("-published_at")


class FamilyReportMarkReadView(APIView):
    """POST /family/reports/<report_id>/read/ — owner or observer."""

    permission_classes = [permissions.IsAuthenticated, HasFamilyAccess]

    def post(self, request, report_id):
        report = get_object_or_404(FamilyReport, pk=report_id)
        self.check_object_permissions(request, report.member)
        FamilyReportRead.objects.get_or_create(report=report, user=request.user)
        return Response({"read": True})


# ============================================================
# PRESCRIPTIONS / LABS / HISTORY
# ============================================================

class MemberPrescriptionListView(generics.ListAPIView):
    """GET /family/members/<member_id>/prescriptions/ — observer (can_view_prescriptions)."""

    permission_classes = [permissions.IsAuthenticated, HasFamilyAccess]
    serializer_class = FamilyPrescriptionSerializer
    required_permission = "can_view_prescriptions"

    def get_queryset(self):
        member = _get_member_or_404(self.request.user, self.kwargs["member_id"])
        self.check_object_permissions(self.request, member)
        return FamilyPrescription.objects.filter(member=member).order_by("-created_at")


class MemberLabResultListView(generics.ListAPIView):
    """GET /family/members/<member_id>/labs/ — observer (can_view_lab_results)."""

    permission_classes = [permissions.IsAuthenticated, HasFamilyAccess]
    serializer_class = FamilyLabResultSerializer
    required_permission = "can_view_lab_results"

    def get_queryset(self):
        member = _get_member_or_404(self.request.user, self.kwargs["member_id"])
        self.check_object_permissions(self.request, member)
        return FamilyLabResult.objects.filter(member=member).order_by("-collected_at")


class MemberHistoryListView(generics.ListAPIView):
    """GET /family/members/<member_id>/history/ — observer (can_view_history)."""

    permission_classes = [permissions.IsAuthenticated, HasFamilyAccess]
    serializer_class = FamilyHistoryEntrySerializer
    required_permission = "can_view_history"

    def get_queryset(self):
        member = _get_member_or_404(self.request.user, self.kwargs["member_id"])
        self.check_object_permissions(self.request, member)
        return (
            FamilyHistoryEntry.objects
            .filter(member=member)
            .order_by("-year", "-created_at")
        )


# ============================================================
# MEMBERSHIPS (owner-only access control)
# ============================================================

class FamilyMembershipListView(generics.ListAPIView):
    """GET /family/memberships/ — owner sees the access list."""

    permission_classes = [permissions.IsAuthenticated, IsFamilyOwner]
    serializer_class = FamilyMembershipSerializer

    def get_queryset(self):
        profile = _user_profile(self.request.user)
        if profile is None:
            return FamilyMembership.objects.none()
        self.check_object_permissions(self.request, profile)
        return (
            FamilyMembership.objects
            .filter(family=profile, revoked_at__isnull=True)
            .select_related("user")
            .order_by("role", "user__first_name")
        )


class FamilyMembershipDetailView(generics.RetrieveUpdateAPIView):
    """GET/PATCH /family/memberships/<pk>/ — owner adjusts observer permissions."""

    permission_classes = [permissions.IsAuthenticated, IsFamilyOwner]
    serializer_class = MembershipPermissionUpdateSerializer

    def get_queryset(self):
        profile = _user_profile(self.request.user)
        if profile is None:
            return FamilyMembership.objects.none()
        return FamilyMembership.objects.filter(
            family=profile, revoked_at__isnull=True,
        )

    def perform_update(self, serializer):
        membership = self.get_object()
        self.check_object_permissions(self.request, membership)

        old = {
            field: getattr(membership, field)
            for field in serializer.validated_data.keys()
        }
        obj = serializer.save()

        _create_audit_log(
            family=obj.family,
            action=FamilyAuditLog.Action.MEMBERSHIP_PERMS_CHANGED,
            actor=self.request.user,
            metadata={
                "membership_id": obj.id,
                "before": old,
                "after": serializer.validated_data,
            },
        )
        notify.family_membership_permissions_changed(
            family=obj.family,
            observer=obj.user,
            changed_by=self.request.user,
            changed_fields=list(serializer.validated_data.keys()),
        )


class FamilyMembershipRevokeView(APIView):
    """POST /family/memberships/<pk>/revoke/ — owner removes access."""

    permission_classes = [permissions.IsAuthenticated, IsFamilyOwner]

    def post(self, request, pk):
        profile = _user_profile(request.user)
        if profile is None:
            return Response(status=status.HTTP_404_NOT_FOUND)

        membership = get_object_or_404(
            FamilyMembership,
            pk=pk,
            family=profile,
            revoked_at__isnull=True,
        )
        self.check_object_permissions(request, membership)

        if membership.role == FamilyMembership.Role.OWNER:
            return Response(
                {"detail": "The owner membership cannot be revoked."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        membership.revoked_at = timezone.now()
        membership.save(update_fields=["revoked_at"])

        _create_audit_log(
            family=membership.family,
            action=FamilyAuditLog.Action.MEMBERSHIP_REVOKED,
            actor=request.user,
            metadata={"membership_id": membership.id},
        )
        notify.family_membership_revoked(
            family=membership.family,
            observer=membership.user,
            revoked_by=request.user,
        )
        return Response({"revoked": True})


# ============================================================
# INVITATIONS (owner-only)
# ============================================================

class FamilyInvitationListView(generics.ListCreateAPIView):
    """GET/POST /family/invitations/ — owner only."""

    permission_classes = [permissions.IsAuthenticated, IsFamilyOwner]
    serializer_class = FamilyInvitationSerializer

    def get_queryset(self):
        profile = _user_profile(self.request.user)
        if profile is None:
            return FamilyInvitation.objects.none()
        self.check_object_permissions(self.request, profile)
        return (
            FamilyInvitation.objects
            .filter(family=profile)
            .select_related("family", "invited_by", "accepted_by")
            .order_by("-created_at")
        )

    def perform_create(self, serializer):
        profile = _user_profile(self.request.user)
        if profile is None:
            profile = create_family_profile_for_user(self.request.user)
        self.check_object_permissions(self.request, profile)
        serializer.save(family=profile, invited_by=self.request.user)


class FamilyInvitationDetailView(generics.RetrieveAPIView):
    """GET /family/invitations/<pk>/ — owner only."""

    permission_classes = [permissions.IsAuthenticated, IsFamilyOwner]
    serializer_class = FamilyInvitationSerializer

    def get_queryset(self):
        profile = _user_profile(self.request.user)
        if profile is None:
            return FamilyInvitation.objects.none()
        return FamilyInvitation.objects.filter(family=profile)


class FamilyInvitationCancelView(APIView):
    """POST /family/invitations/<pk>/cancel/ — owner only."""

    permission_classes = [permissions.IsAuthenticated, IsFamilyOwner]

    def post(self, request, pk):
        profile = _user_profile(request.user)
        if profile is None:
            return Response(status=status.HTTP_404_NOT_FOUND)

        invitation = get_object_or_404(FamilyInvitation, pk=pk, family=profile)
        self.check_object_permissions(request, invitation.family)

        if invitation.status != FamilyInvitation.Status.PENDING:
            return Response(
                {"detail": "Only pending invitations can be cancelled."},
                status=status.HTTP_409_CONFLICT,
            )

        invitation.status = FamilyInvitation.Status.CANCELLED
        invitation.save(update_fields=["status", "updated_at"])

        _create_audit_log(
            family=invitation.family,
            action=FamilyAuditLog.Action.INVITATION_CANCELLED,
            actor=request.user,
            invitation=invitation,
        )
        return Response(FamilyInvitationSerializer(invitation).data)
    