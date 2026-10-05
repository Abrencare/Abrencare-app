from django.utils import timezone

from ..models import Appointment

FINAL_STATUSES = (
    Appointment.Status.COMPLETED,
    Appointment.Status.CANCELLED,
    Appointment.Status.NO_SHOW,
)


def base_queryset():
    """Canonical queryset with all joins the serializers need."""
    return Appointment.objects.select_related(
        "patient", "doctor__user", "doctor__specialty", "cancelled_by"
    ).prefetch_related("check_in", "consultation")


def visible_to(user):
    """
    Appointments the user is allowed to see.

    * staff         -> everything
    * doctor        -> their own appointments
    * patient/user  -> their own appointments
    """
    qs = base_queryset()
    doctor = getattr(user, "doctor", None)

    if user.is_staff:
        return qs
    if doctor:
        return qs.filter(doctor=doctor)
    return qs.filter(patient=user)


def filter_list(qs, params):
    """Apply query-string filters to the appointment list."""
    if params.get("status"):
        statuses = [s.strip() for s in params["status"].split(",") if s.strip()]
        qs = qs.filter(status__in=statuses)

    if params.get("date"):
        qs = qs.filter(appointment_date=params["date"])
    if params.get("from"):
        qs = qs.filter(appointment_date__gte=params["from"])
    if params.get("to"):
        qs = qs.filter(appointment_date__lte=params["to"])

    if (params.get("upcoming") or "").lower() in ("1", "true", "yes"):
        qs = qs.filter(upcoming_q()).exclude(status__in=FINAL_STATUSES)

    return qs


def upcoming_q():
    from django.db.models import Q

    today = timezone.localdate()
    now_time = timezone.localtime().time()
    return Q(appointment_date__gt=today) | Q(
        appointment_date=today, appointment_time__gte=now_time
    )


# ---------------------------------------------------------------------------
# Access control
# ---------------------------------------------------------------------------

def user_is_patient_of(user, appointment) -> bool:
    return bool(user and appointment.patient_id == user.id)


def user_can_access(user, appointment) -> bool:
    if user.is_staff or user_is_patient_of(user, appointment):
        return True
    doctor = getattr(user, "doctor", None)
    return bool(doctor and appointment.doctor_id == doctor.id)


def user_can_manage(user, appointment) -> bool:
    """Doctor of the appointment, or staff."""
    if user.is_staff:
        return True
    doctor = getattr(user, "doctor", None)
    return bool(doctor and appointment.doctor_id == doctor.id)