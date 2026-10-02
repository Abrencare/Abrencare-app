from django.urls import path

from .views import (
    ExecutiveCareTeamView,
    ExecutiveCareView,
    ExecutiveCompleteView,
    ExecutiveMeView,
    ExecutiveProfileView,
    ExecutiveOnboardingCompleteView, 
    ExecutiveDashboardView,
    ExecutiveEmergencyView,
    ExecutiveProgrammeView,
    ExecutiveReportsView,
)

app_name = "executive"

urlpatterns = [
    path("me/", ExecutiveMeView.as_view(), name="me"),
    path("profile/", ExecutiveProfileView.as_view(), name="profile"),
    path("care/", ExecutiveCareView.as_view(), name="care"),
    path("complete/", ExecutiveCompleteView.as_view(), name="complete"),
    path(
        "onboarding/complete/",
        ExecutiveOnboardingCompleteView.as_view(),
        name="onboarding-complete",
    ),
    path("care-team/", ExecutiveCareTeamView.as_view(), name="care-team"),
    path("dashboard/", ExecutiveDashboardView.as_view(), name="dashboard"),
    path("emergency/", ExecutiveEmergencyView.as_view()),
    path("programme/", ExecutiveProgrammeView.as_view()),
    path("reports/", ExecutiveReportsView.as_view()),
    path("reports/<str:period>/", ExecutiveReportsView.as_view()),
]