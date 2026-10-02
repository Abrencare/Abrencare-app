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


urlpatterns = [
    # ------------------------------------------------------
    # Discovery (read-only)
    # ------------------------------------------------------
    path(
        "specialties/",
        SpecialtyListView.as_view(),
        name="specialties",
    ),
    path(
        "doctors/",
        ConsultationDoctorListView.as_view(),
        name="doctors",
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
    # ------------------------------------------------------
    path(
        "<int:pk>/",
        ConsultationDetailView.as_view(),
        name="detail",
    ),
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
]
