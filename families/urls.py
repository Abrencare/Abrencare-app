# families/urls.py
from django.urls import path
from .views import (
    FamilyProfileView,
    FamilyMemberListView,
    FamilyMemberDetailView,
    FamilyMemberByRelationshipView,
    FamilyOnboardingCompleteView,
    FamilyMemberOverviewView,
    MemberReadingListView,
    MemberCarePlanListView,
    CarePlanItemCompleteView,
    MemberVisitListView,
    MemberVisitStartView,
    MemberVisitEndView,
    FamilyCareTeamView,
    FamilyAttentionFlagListView,
    FamilyAttentionFlagResolveView,
)

urlpatterns = [
    # Onboarding / roster
    path("profile/", FamilyProfileView.as_view()),
    path("members/", FamilyMemberListView.as_view()),
    path("members/by-relationship/", FamilyMemberByRelationshipView.as_view()),
    path("members/<int:pk>/", FamilyMemberDetailView.as_view()),
    path("onboarding/complete/", FamilyOnboardingCompleteView.as_view()),

    # Dashboard
    path("members/<int:member_id>/overview/", FamilyMemberOverviewView.as_view()),
    path("members/<int:member_id>/readings/", MemberReadingListView.as_view()),
    path("members/<int:member_id>/care-plan/", MemberCarePlanListView.as_view()),
    path("members/<int:member_id>/care-plan/<int:item_id>/complete/", CarePlanItemCompleteView.as_view()),
    path("members/<int:member_id>/visits/", MemberVisitListView.as_view()),
    path("members/<int:member_id>/visits/<int:visit_id>/start/", MemberVisitStartView.as_view()),
    path("members/<int:member_id>/visits/<int:visit_id>/end/", MemberVisitEndView.as_view()),
    path("care-team/", FamilyCareTeamView.as_view()),
    path("attention/", FamilyAttentionFlagListView.as_view()),
    path("attention/<int:flag_id>/resolve/", FamilyAttentionFlagResolveView.as_view()),
]
