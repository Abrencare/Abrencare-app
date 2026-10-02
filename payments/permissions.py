from rest_framework import permissions


class IsPayerOrStaff(permissions.BasePermission):
    """Object-level: only the payer, the patient, or staff can read a payment."""

    message = "You do not have access to this payment."

    def has_object_permission(self, request, view, obj):
        user = request.user
        if not user or not user.is_authenticated:
            return False
        if user.is_staff:
            return True
        return user in {obj.payer, obj.patient, obj.recorded_by}


class CanRequestRefund(permissions.BasePermission):
    """Only staff can request refunds by default. Override to taste."""

    message = "Only staff can request refunds."

    def has_permission(self, request, view):
        return bool(request.user and request.user.is_staff)
    