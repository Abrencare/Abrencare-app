# executive/management/commands/send_upcoming_care_reminders.py
from datetime import timedelta

from django.core.management.base import BaseCommand
from django.utils import timezone

from executive.models import UpcomingCare
from executive.services.executive_notification_service import (
    ExecutiveNotificationService,
)


class Command(BaseCommand):
    help = "Notify executives about appointments happening in the next 24h."

    def handle(self, *args, **options):
        window_start = timezone.now()
        window_end = window_start + timedelta(hours=24)

        qs = (
            UpcomingCare.objects
            .select_related("executive_profile__user_service__user")
            .filter(scheduled_for__range=(window_start, window_end))
        )
        for care in qs:
            hours = int((care.scheduled_for - window_start).total_seconds() // 3600)
            ExecutiveNotificationService.upcoming_care_soon(
                profile=care.executive_profile,
                care=care,
                hours_until=hours,
            )
        self.stdout.write(self.style.SUCCESS(f"Sent {qs.count()} reminders."))