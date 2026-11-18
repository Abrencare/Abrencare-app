import os

from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model


class Command(BaseCommand):
    help = "Create or update the deployment admin user."

    def handle(self, *args, **options):
        User = get_user_model()

        username = os.environ.get("ADMIN_USERNAME")
        email = os.environ.get("ADMIN_EMAIL")
        password = os.environ.get("ADMIN_PASSWORD")

        if not username or not email or not password:
            self.stdout.write(
                self.style.WARNING(
                    "ADMIN_USERNAME, ADMIN_EMAIL or ADMIN_PASSWORD not configured. Skipping admin creation."
                )
            )
            return

        user, created = User.objects.get_or_create(
            email=email,
            defaults={
                "username": username,
                "is_staff": True,
                "is_superuser": True,
                "is_active": True,
            },
        )

        user.is_staff = True
        user.is_superuser = True
        user.is_active = True
        user.set_password(password)
        user.save()

        if created:
            self.stdout.write(
                self.style.SUCCESS(f"Superuser created: {email}")
            )
        else:
            self.stdout.write(
                self.style.SUCCESS(f"Superuser updated: {email}")
            )