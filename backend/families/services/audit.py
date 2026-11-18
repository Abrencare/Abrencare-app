# backend/families/services/audit.py

from ..models import FamilyAuditLog


def _create_audit_log(
    *,
    family,
    action,
    actor=None,
    invitation=None,
    metadata=None,
    request=None,
) -> FamilyAuditLog:
    """
    Create a security audit event.

    Never place secrets or passwords in metadata.
    """
    ip_address = None
    user_agent = ""

    if request is not None:
        forwarded_for = request.META.get("HTTP_X_FORWARDED_FOR")
        if forwarded_for:
            ip_address = forwarded_for.split(",")[0].strip()
        else:
            ip_address = request.META.get("REMOTE_ADDR")

        user_agent = request.META.get("HTTP_USER_AGENT", "")

    return FamilyAuditLog.objects.create(
        family=family,
        actor=actor,
        action=action,
        invitation=invitation,
        metadata=metadata or {},
        ip_address=ip_address,
        user_agent=user_agent,
    )