"""Executive app URL configuration.

All routes are namespaced under `executive:` so reverse() calls stay
readable:

    reverse("executive:dashboard")
    reverse("executive:emergency")
    reverse("executive:health-alert-resolve", args=[alert.pk])
"""

from django.urls import include, path

from .views import (
    # Onboarding / profile
    ExecutiveCareTeamView,
    ExecutiveCareView,
    ExecutiveCompleteView,
    ExecutiveMeView,
    ExecutiveOnboardingCompleteView,
    ExecutiveProfileView,
    # Screens
    ExecutiveDashboardView,
    ExecutiveEmergencyView,
    ExecutiveProgrammeView,
    ExecutiveReportsView,
    # Alert resolution
    HealthAlertResolveView,
    MedicationAlertResolveView,
)

app_name = "executive"


# ---------------------------------------------------------------------------
# Onboarding + profile
# ---------------------------------------------------------------------------
onboarding_patterns = [
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
]


# ---------------------------------------------------------------------------
# Screen aggregates
# ---------------------------------------------------------------------------
screen_patterns = [
    path("dashboard/", ExecutiveDashboardView.as_view(), name="dashboard"),
    path("emergency/", ExecutiveEmergencyView.as_view(), name="emergency"),
    path("programme/", ExecutiveProgrammeView.as_view(), name="programme"),
    path(
        "reports/",
        ExecutiveReportsView.as_view(),
        name="reports",
    ),
    path(
        "reports/<str:period>/",
        ExecutiveReportsView.as_view(),
        name="reports-by-period",
    ),
]


# ---------------------------------------------------------------------------
# Alert resolution (write endpoints)
# ---------------------------------------------------------------------------
alert_patterns = [
    path(
        "alerts/<int:pk>/resolve/",
        HealthAlertResolveView.as_view(),
        name="health-alert-resolve",
    ),
    path(
        "medication-alerts/<int:pk>/resolve/",
        MedicationAlertResolveView.as_view(),
        name="medication-alert-resolve",
    ),
]


urlpatterns = [
    *onboarding_patterns,
    *screen_patterns,
    *alert_patterns,
]