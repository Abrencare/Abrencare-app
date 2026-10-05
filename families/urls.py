from django.urls import path

from . import views

app_name = "families"

urlpatterns = [
    # ------------------------------------------------------------------
    # Profile / onboarding
    # ------------------------------------------------------------------
    path(
        "profile/",
        views.FamilyProfileView.as_view(),
        name="profile",
    ),
    path(
        "onboarding/complete/",
        views.FamilyOnboardingCompleteView.as_view(),
        name="onboarding-complete",
    ),

    # ------------------------------------------------------------------
    # Members
    # ------------------------------------------------------------------
    path(
        "members/",
        views.FamilyMemberListView.as_view(),
        name="member-list",
    ),
    path(
        "members/by-relationship/",
        views.FamilyMemberByRelationshipView.as_view(),
        name="member-by-relationship",
    ),
    path(
        "members/<int:pk>/",
        views.FamilyMemberDetailView.as_view(),
        name="member-detail",
    ),
    path(
        "members/<int:member_id>/overview/",
        views.FamilyMemberOverviewView.as_view(),
        name="member-overview",
    ),

    # ------------------------------------------------------------------
    # Per-member sections
    # ------------------------------------------------------------------
    path(
        "members/<int:member_id>/readings/",
        views.MemberReadingListView.as_view(),
        name="member-readings",
    ),
    path(
        "members/<int:member_id>/care-plan/",
        views.MemberCarePlanListView.as_view(),
        name="member-care-plan",
    ),
    path(
        "members/<int:member_id>/care-plan/<int:item_id>/complete/",
        views.CarePlanItemCompleteView.as_view(),
        name="member-care-plan-complete",
    ),
    path(
        "members/<int:member_id>/visits/",
        views.MemberVisitListView.as_view(),
        name="member-visits",
    ),
    path(
        "members/<int:member_id>/visits/<int:visit_id>/start/",
        views.MemberVisitStartView.as_view(),
        name="member-visit-start",
    ),
    path(
        "members/<int:member_id>/visits/<int:visit_id>/end/",
        views.MemberVisitEndView.as_view(),
        name="member-visit-end",
    ),
    path(
        "members/<int:member_id>/reports/",
        views.MemberReportListView.as_view(),
        name="member-reports",
    ),
    path(
        "members/<int:member_id>/prescriptions/",
        views.MemberPrescriptionListView.as_view(),
        name="member-prescriptions",
    ),
    path(
        "members/<int:member_id>/labs/",
        views.MemberLabResultListView.as_view(),
        name="member-labs",
    ),
    path(
        "members/<int:member_id>/history/",
        views.MemberHistoryListView.as_view(),
        name="member-history",
    ),

    # ------------------------------------------------------------------
    # Family-level cards
    # ------------------------------------------------------------------
    path(
        "care-team/",
        views.FamilyCareTeamView.as_view(),
        name="care-team",
    ),
    path(
        "attention/",
        views.FamilyAttentionFlagListView.as_view(),
        name="attention-list",
    ),
    path(
        "attention/<int:flag_id>/resolve/",
        views.FamilyAttentionFlagResolveView.as_view(),
        name="attention-resolve",
    ),
    path(
        "reports/<int:report_id>/read/",
        views.FamilyReportMarkReadView.as_view(),
        name="report-read",
    ),

    # ------------------------------------------------------------------
    # Memberships (owner-only access control)
    # ------------------------------------------------------------------
    path(
        "memberships/",
        views.FamilyMembershipListView.as_view(),
        name="membership-list",
    ),
    path(
        "memberships/<int:pk>/",
        views.FamilyMembershipDetailView.as_view(),
        name="membership-detail",
    ),
    path(
        "memberships/<int:pk>/revoke/",
        views.FamilyMembershipRevokeView.as_view(),
        name="membership-revoke",
    ),

    # ------------------------------------------------------------------
    # Invitations (owner-only)
    # ------------------------------------------------------------------
    path(
        "invitations/",
        views.FamilyInvitationListView.as_view(),
        name="invitation-list",
    ),
    path(
        "invitations/<int:pk>/",
        views.FamilyInvitationDetailView.as_view(),
        name="invitation-detail",
    ),
    path(
        "invitations/<int:pk>/cancel/",
        views.FamilyInvitationCancelView.as_view(),
        name="invitation-cancel",
    ),
]