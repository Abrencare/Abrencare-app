from django.urls import path

from .views import (
    AppointmentCancelView,
    AppointmentCompleteView,
    AppointmentConfirmView,
    AppointmentDetailView,
    AppointmentListCreateView,
    AppointmentMineView,
    AppointmentNoShowView,
    AppointmentRescheduleView,
)

app_name = "appointments"

urlpatterns = [
    # Collection: list + create
    path(
        "",
        AppointmentListCreateView.as_view(),
        name="list-create",
    ),

    # Convenience: the current user's active (non-consultation) appointments
    # in the mobile app's shape. Must come before <int:pk>/ so it doesn't
    # get swallowed by the detail route.
    path(
        "mine/",
        AppointmentMineView.as_view(),
        name="mine",
    ),

    # Detail: retrieve / update reminder / soft-cancel
    path(
        "<int:pk>/",
        AppointmentDetailView.as_view(),
        name="detail",
    ),

    # Lifecycle actions
    path(
        "<int:pk>/cancel/",
        AppointmentCancelView.as_view(),
        name="cancel",
    ),
    path(
        "<int:pk>/confirm/",
        AppointmentConfirmView.as_view(),
        name="confirm",
    ),
    path(
        "<int:pk>/complete/",
        AppointmentCompleteView.as_view(),
        name="complete",
    ),
    path(
        "<int:pk>/no-show/",
        AppointmentNoShowView.as_view(),
        name="no-show",
    ),

    # Reschedule
    path(
        "<int:pk>/reschedule/",
        AppointmentRescheduleView.as_view(),
        name="reschedule",
    ),
]