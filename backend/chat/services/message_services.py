# chat/services/message_services.py

import os

from django.db import transaction
from django.utils import timezone

from chat.models import ConversationParticipant, Message


MAX_ATTACHMENT_SIZE = 25 * 1024 * 1024  # 25 MB

ALLOWED_MESSAGE_TYPES = {"text", "image", "file", "audio", "video"}
FILE_REQUIRED_TYPES = {"image", "file", "audio", "video"}

# Extension allow-list per message type. Deliberately conservative;
# widen as needed. Empty set means "no extension restrictions".
ALLOWED_EXTENSIONS = {
    "image": {".jpg", ".jpeg", ".png", ".gif", ".webp", ".bmp"},
    "audio": {".mp3", ".wav", ".ogg", ".m4a", ".aac", ".flac"},
    "video": {".mp4", ".webm", ".mov", ".avi", ".mkv"},
    "file": {
        ".pdf", ".doc", ".docx", ".xls", ".xlsx", ".ppt", ".pptx",
        ".txt", ".csv", ".zip", ".rar", ".7z", ".json", ".xml",
    },
}

# MIME prefix required for each typed upload. "file" accepts anything
# that passes the extension check.
ALLOWED_MIME_PREFIXES = {
    "image": ("image/",),
    "audio": ("audio/",),
    "video": ("video/",),
    "file": None,  # any
}


class MessageService:

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

        if not ConversationParticipant.objects.filter(
            conversation=conversation,
            user=sender,
        ).exists():
            raise ValueError("Sender is not a participant.")

        if file is not None:
            _validate_attachment(file, message_type)

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

        conversation.__class__.objects.filter(pk=conversation.pk).update(
            updated_at=timezone.now()
        )

        return message

    @staticmethod
    @transaction.atomic
    def update_message(*, message, editor, content):
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

        # Don't list updated_at in update_fields: auto_now is only
        # honoured reliably across versions when Django performs the
        # save itself. Assign explicitly for deterministic behaviour.
        message.updated_at = timezone.now()
        message.save(
            update_fields=["content", "is_edited", "updated_at"]
        )

        # An edit is activity — bump the conversation so list views
        # sort the conversation to the top.
        message.conversation.__class__.objects.filter(
            pk=message.conversation_id
        ).update(updated_at=timezone.now())

        return message

    @staticmethod
    @transaction.atomic
    def delete_message(*, message, actor):
        if message.sender_id != actor.id:
            raise ValueError("Only the sender can delete this message.")

        if message.is_deleted:
            return message

        message.is_deleted = True
        message.content = ""
        # Clear the file reference so the serializer can't leak a URL
        # to a "deleted" attachment.
        message.file = None
        message.file_name = ""
        message.file_size = None
        message.updated_at = timezone.now()
        message.save(
            update_fields=[
                "is_deleted",
                "content",
                "file",
                "file_name",
                "file_size",
                "updated_at",
            ]
        )

        return message

    @staticmethod
    @transaction.atomic
    def mark_read(*, conversation, user, up_to_message_id=None):
        raise NotImplementedError


# ---------------------------------------------------------------------- #
# helpers
# ---------------------------------------------------------------------- #

def _validate_attachment(file, message_type):
    """
    Enforce size, extension, and MIME-prefix rules for the given
    message type. Raises ValueError for uniform error handling.
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

    name = (file.name or "").lower()
    ext = os.path.splitext(name)[1]

    allowed_exts = ALLOWED_EXTENSIONS.get(message_type)
    if allowed_exts is not None and ext not in allowed_exts:
        raise ValueError(
            f"Extension '{ext}' not allowed for message_type "
            f"'{message_type}'."
        )

    allowed_prefixes = ALLOWED_MIME_PREFIXES.get(message_type)
    if allowed_prefixes is not None:
        content_type = (getattr(file, "content_type", "") or "").lower()
        if not any(content_type.startswith(p) for p in allowed_prefixes):
            raise ValueError(
                f"Content type '{content_type}' not allowed for "
                f"message_type '{message_type}'."
            )