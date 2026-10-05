# chat/services/conversation_services.py

from django.contrib.auth import get_user_model
from django.db import transaction

from chat.models import (
    Conversation,
    ConversationParticipant,
)

User = get_user_model()

MAX_GROUP_PARTICIPANTS = 250


class ConversationService:

    @staticmethod
    @transaction.atomic
    def create_private_conversation(user, other_user):
        if user.id == other_user.id:
            raise ValueError(
                "You cannot create a private conversation with yourself."
            )

        # Lock the participating rows so two concurrent requests can't
        # both miss the existing row and create duplicates. On SQLite
        # this degrades to a no-op but stays correct under Postgres/MySQL.
        existing_conversation = (
            Conversation.objects
            .select_for_update()
            .filter(
                conversation_type="private",
                participants__user=user,
            )
            .filter(
                participants__user=other_user,
            )
            .distinct()
            .first()
        )

        if existing_conversation:
            return existing_conversation

        conversation = Conversation.objects.create(
            conversation_type="private",
        )

        ConversationParticipant.objects.bulk_create(
            [
                ConversationParticipant(
                    conversation=conversation,
                    user=user,
                    is_admin=False,
                ),
                ConversationParticipant(
                    conversation=conversation,
                    user=other_user,
                    is_admin=False,
                ),
            ]
        )

        return conversation

    @staticmethod
    @transaction.atomic
    def create_group_conversation(user, name, participant_ids):
        # Normalise: drop the creator from the incoming list (they're
        # added explicitly below) and de-duplicate.
        requested_ids = {
            int(pid) for pid in participant_ids if pid is not None
        }
        requested_ids.discard(user.id)

        if not requested_ids:
            raise ValueError(
                "A group requires at least one other participant."
            )

        if len(requested_ids) + 1 > MAX_GROUP_PARTICIPANTS:
            raise ValueError(
                f"Group cannot exceed {MAX_GROUP_PARTICIPANTS} participants."
            )

        # Validate every requested user exists *before* inserting, so a
        # bad id produces a clean 400 instead of an IntegrityError.
        valid_ids = set(
            User.objects
            .filter(id__in=requested_ids)
            .values_list("id", flat=True)
        )

        invalid_ids = requested_ids - valid_ids
        if invalid_ids:
            raise ValueError(
                f"Unknown user ids: {sorted(invalid_ids)}."
            )

        conversation = Conversation.objects.create(
            conversation_type="group",
            name=name,
        )

        ConversationParticipant.objects.create(
            conversation=conversation,
            user=user,
            is_admin=True,
        )

        ConversationParticipant.objects.bulk_create(
            [
                ConversationParticipant(
                    conversation=conversation,
                    user_id=user_id,
                    is_admin=False,
                )
                for user_id in valid_ids
            ]
        )

        return conversation