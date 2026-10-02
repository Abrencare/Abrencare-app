# consultations/permissions.py
from rest_framework.permissions import BasePermission


class IsPatientUser(BasePermission):
    message = "Only patients can access this resource."

    def has_permission(self, request, view):
        user = getattr(request, "user", None)
        if not user or not user.is_authenticated:
            return False
        return getattr(user, "patient_profile", None) is not None


class IsDoctorUser(BasePermission):
    """
    Allows access only to authenticated users linked to a Doctor profile.

    Accepts either reverse name — `user.doctor` or `user.doctor_profile` —
    because the two apps disagree and the views already try both.
    """

    message = "Only doctors can access this resource."

    def has_permission(self, request, view):
        user = getattr(request, "user", None)
        if not user or not user.is_authenticated:
            return False
        return (
            getattr(user, "doctor", None) is not None
            or getattr(user, "doctor", None) is not None
        )