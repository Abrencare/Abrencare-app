from django.db import transaction

from services.models import UserService
from .models import ExecutiveProfile, MonitorFrequency


class ExecutiveServiceError(Exception):
    pass


class ExecutiveProfileService:
    """All business logic for the executive workflow lives here."""

    @staticmethod
    def _get_or_create_user_service(user) -> UserService:
        user_service = UserService.objects.filter(
            user=user, service__code="executive"
        ).select_related("user", "service").first()

        if user_service is None:
            raise ExecutiveServiceError(
                "User is not enrolled in the executive service."
            )
        return user_service

    @classmethod
    @transaction.atomic
    def save_profile(cls, *, user, date_of_birth, gender, height_cm, weight_kg):
        user_service = cls._get_or_create_user_service(user)

        profile, _ = ExecutiveProfile.objects.select_for_update().get_or_create(
            user_service=user_service,
            defaults={"created_by": user, "name": user.full_name},
        )

        # Update user demographics
        user.date_of_birth = date_of_birth
        user.gender = gender
        user.height = height_cm
        user.weight = weight_kg
        user.save(
            update_fields=["date_of_birth", "gender", "height", "weight"]
        )

        if not profile.name:
            profile.name = user.full_name
            profile.save(update_fields=["name"])

        return profile

    @classmethod
    @transaction.atomic
    def save_care(cls, *, user, monitoring, frequency):
        user_service = cls._get_or_create_user_service(user)

        profile = ExecutiveProfile.objects.select_for_update().filter(
            user_service=user_service
        ).first()

        if profile is None:
            raise ExecutiveServiceError(
                "Profile must be created before saving care preferences."
            )

        profile.monitoring = list(monitoring)
        profile.frequency = frequency or MonitorFrequency.MANAGED
        profile.save(update_fields=["monitoring", "frequency", "updated_at"])

        return profile

    @classmethod
    def get_profile(cls, *, user) -> ExecutiveProfile | None:
        return (
            ExecutiveProfile.objects
            .select_related("user_service__user", "created_by")
            .filter(user_service__user=user)
            .first()
        )

    @classmethod
    def get_care_team(cls, *, user) -> list[dict]:
        """
        Placeholder — replace with a real query when the care-team model exists.
        Keeps the frontend's ExecutiveReadyScreen working.
        """
        return [
            {
                "id": "ns-001",
                "initials": "NS",
                "name": "Nurse Sarah",
                "role": "Primary Care Nurse",
                "verified": True,
            }
        ]

    @classmethod
    @transaction.atomic
    def mark_onboarded(cls, *, user) -> UserService:
        us = (
            UserService.objects
            .select_for_update()
            .filter(user=user, service__code="executive")
            .first()
        )
        if us is None:
            raise ExecutiveServiceError("User is not enrolled in executive service.")

        if hasattr(us, "onboarded") and not us.onboarded:
            us.onboarded = True
            us.save(update_fields=["onboarded"])
        return us
    