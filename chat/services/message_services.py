# chat/services/message_services.py

from django.core.exceptions import ValidationError
from django.db import transaction
from django.utils import timezone

from chat.models import ConversationParticipant, Message


MAX_ATTACHMENT_SIZE = 25 * 1024 * 1024  # 25 MB

ALLOWED_MESSAGE_TYPES = {"text", "image", "file", "audio", "video"}
FILE_REQUIRED_TYPES = {"image", "file", "audio", "video"}


class MessageService:

    # ------------------------------------------------------------------ #
    # creation
    # ------------------------------------------------------------------ #

    @staticmethod
    @transaction.atomic
    def create_message(
        *,
        conversation,
        sender,
        content="",
        message_type="text",
        file=None,
    ):
        """
        Create a message inside a conversation.

        Raises ValueError for validation problems so the view layer can
        translate them into 400 responses without importing Django's
        ValidationError.
        """
        content = (content or "").strip()
        message_type = message_type or "text"

        if message_type not in ALLOWED_MESSAGE_TYPES:
            raise ValueError(
                f"Unsupported message_type: {message_type}."
            )

        if message_type == "text" and not content:
            raise ValueError("Text message cannot be empty.")

        if message_type in FILE_REQUIRED_TYPES and not file:
            raise ValueError(
                "A file is required for this message type."
            )

        # Only participants may post into a conversation. Cheap check,
        # and it protects against callers that bypassed the view's gate.
        if not ConversationParticipant.objects.filter(
            conversation=conversation,
            user=sender,
        ).exists():
            raise ValueError("Sender is not a participant.")

        if file is not None:
            _validate_attachment(file)

        message = Message.objects.create(
            conversation=conversation,
            sender=sender,
            content=content,
            message_type=message_type,
        )

        if file is not None:
            message.file = file
            message.file_name = file.name
            message.file_size = file.size
            message.save(
                update_fields=["file", "file_name", "file_size"]
            )

        # Bump the conversation so list views sort by recent activity.
        # Using .update() avoids a race with concurrent saves and skips
        # the auto_now machinery (which only fires on .save()).
        conversation.__class__.objects.filter(pk=conversation.pk).update(
            updated_at=timezone.now()
        )

        return message

    # ------------------------------------------------------------------ #
    # edits / deletes
    # ------------------------------------------------------------------ #

    @staticmethod
    @transaction.atomic
    def update_message(*, message, editor, content):
        """
        Update the text content of an existing message. Only the original
        sender may edit, and only text messages are editable.
        """
        if message.sender_id != editor.id:
            raise ValueError("Only the sender can edit this message.")

        if message.is_deleted:
            raise ValueError("Cannot edit a deleted message.")

        if message.message_type != "text":
            raise ValueError("Only text messages can be edited.")

        content = (content or "").strip()

        if not content:
            raise ValueError("Message content cannot be empty.")

        message.content = content
        message.is_edited = True
        message.save(update_fields=["content", "is_edited", "updated_at"])

        return message

    @staticmethod
    @transaction.atomic
    def delete_message(*, message, actor):
        """
        Soft-delete a message. Only the original sender may delete.
        Content is cleared so downstream clients that render tombstones
        cannot leak the original text.
        """
        if message.sender_id != actor.id:
            raise ValueError("Only the sender can delete this message.")

        if message.is_deleted:
            return message

        message.is_deleted = True
        message.content = ""
        message.save(
            update_fields=["is_deleted", "content", "updated_at"]
        )

        return message

    @staticmethod
    @transaction.atomic
    def mark_read(*, conversation, user, up_to_message_id=None):
        """
        Placeholder for read receipts. Wire this up when you add a
        `last_read_at` field on ConversationParticipant.
        """
        raise NotImplementedError


# ---------------------------------------------------------------------- #
# helpers
# ---------------------------------------------------------------------- #

def _validate_attachment(file):
    """
    Enforce the size cap the view used to own. Raises ValueError so the
    caller's error handling stays uniform.
    """
    size = getattr(file, "size", None)
    if size is None:
        raise ValueError("Uploaded file has no size.")

    if size <= 0:
        raise ValueError("Uploaded file is empty.")

    if size > MAX_ATTACHMENT_SIZE:
        raise ValueError(
            f"File too large (max {MAX_ATTACHMENT_SIZE // (1024 * 1024)}MB)."
        )
    