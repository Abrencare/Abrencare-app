# executive/signals.py
from django.db import transaction
from django.db.models.signals import post_save
from django.dispatch import receiver

from .services.executive_notification_service import ExecutiveNotificationService


def _defer(fn, *args, **kwargs):
    transaction.on_commit(lambda: fn(*args, **kwargs))


@receiver(post_save, sender="executive.EmergencyEvent")
def on_emergency_event_saved(sender, instance, created, raw, **kwargs):
    if raw:
        return
    if created:
        _defer(
            ExecutiveNotificationService.emergency_activated,
            profile=instance.executive_profile, event=instance,
        )
    elif instance.status == "resolved" and instance.resolved_at:
        _defer(
            ExecutiveNotificationService.emergency_resolved,
            profile=instance.executive_profile, event=instance,
        )


@receiver(post_save, sender="executive.HealthAlert")
def on_health_alert_saved(sender, instance, created, raw, **kwargs):
    if raw or not created:
        return
    fn = (
        ExecutiveNotificationService.health_alert_flagged
        if instance.severity == "flag"
        else ExecutiveNotificationService.health_alert_created
    )
    _defer(fn, profile=instance.executive_profile, alert=instance)


@receiver(post_save, sender="executive.MedicationAlert")
def on_medication_alert_saved(sender, instance, created, raw, **kwargs):
    if raw or not created:
        return
    _defer(
        ExecutiveNotificationService.medication_alert_created,
        profile=instance.executive_profile, alert=instance,
    )


@receiver(post_save, sender="executive.MedicationSchedule")
def on_medication_schedule_saved(sender, instance, created, raw, **kwargs):
    if raw or created or instance.status != "missed":
        return
    profile = getattr(instance.medication, "executive_profile", None)
    if profile is None:
        return
    _defer(
        ExecutiveNotificationService.medication_missed,
        profile=profile, schedule=instance,
    )


@receiver(post_save, sender="executive.WeeklyReport")
def on_weekly_report_saved(sender, instance, created, raw, **kwargs):
    if raw or not created:
        return
    _defer(
        ExecutiveNotificationService.report_generated,
        profile=instance.executive_profile, report=instance,
    )


@receiver(post_save, sender="executive.Reading")
def on_reading_saved(sender, instance, created, raw, **kwargs):
    if raw or not created:
        return
    if instance.status in ("normal", "watch"):
        return
    _defer(
        ExecutiveNotificationService.reading_abnormal,
        profile=instance.executive_profile, reading=instance,
    )