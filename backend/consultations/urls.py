# consultations/urls.py
from django.urls import path

from .views import (
    ConsultationAvailabilityView,
    ConsultationBookingView,
    ConsultationCancelView,
    ConsultationCompleteView,
    ConsultationDetailView,
    ConsultationDoctorListView,
    ConsultationOnboardingCompleteView,
    ConsultationProfileView,
    ConsultationStartView,
    MyConsultationsView,
    PrescriptionCreateView,
    SpecialtyListView,
)

app_name = "consultations"

urlpatterns = [
    # ------------------------------------------------------
    # Discovery (read-only)
    # ------------------------------------------------------
    path(
        "specialties/",
        SpecialtyListView.as_view(),
        name="specialty-list",
    ),
    path(
        "doctors/",
        ConsultationDoctorListView.as_view(),
        name="doctor-list",
    ),
    path(
        "availability/",
        ConsultationAvailabilityView.as_view(),
        name="availability",
    ),

    # ------------------------------------------------------
    # Onboarding (per UserService)
    # ------------------------------------------------------
    path(
        "onboarding/complete/",
        ConsultationOnboardingCompleteView.as_view(),
        name="onboarding-complete",
    ),
    path(
        "profile/",
        ConsultationProfileView.as_view(),
        name="profile",
    ),

    # ------------------------------------------------------
    # Booking (collection-level)
    # ------------------------------------------------------
    path(
        "",
        ConsultationBookingView.as_view(),
        name="book",
    ),
    path(
        "mine/",
        MyConsultationsView.as_view(),
        name="my-consultations",
    ),

    # ------------------------------------------------------
    # Per-consultation actions (detail-level)
    #
    # Ordering matters: Django resolves top-to-bottom. `<int:pk>/` would
    # match `<int:pk>/cancel/` if placed first in some routers, but with
    # `path()` the trailing slash makes them distinct — still, we keep the
    # more specific routes above the bare detail route for readability.
    # ------------------------------------------------------
    path(
        "<int:pk>/cancel/",
        ConsultationCancelView.as_view(),
        name="cancel",
    ),
    path(
        "<int:pk>/start/",
        ConsultationStartView.as_view(),
        name="start",
    ),
    path(
        "<int:pk>/complete/",
        ConsultationCompleteView.as_view(),
        name="complete",
    ),
    path(
        "<int:pk>/prescriptions/",
        PrescriptionCreateView.as_view(),
        name="prescription-create",
    ),
    path(
        "<int:pk>/",
        ConsultationDetailView.as_view(),
        name="detail",
    ),
]