# chat/serializers.py

from rest_framework import serializers

from .models import (
    Conversation,
    ConversationParticipant,
    Message,
)


class ConversationParticipantSerializer(serializers.ModelSerializer):
    user_id = serializers.IntegerField(
        source="user.id",
        read_only=True,
    )

    username = serializers.CharField(
        source="user.username",
        read_only=True,
    )

    full_name = serializers.SerializerMethodField()

    class Meta:
        model = ConversationParticipant
        fields = [
            "user_id",
            "username",
            "full_name",
            "is_admin",
            "joined_at",
        ]

    def get_full_name(self, obj):
        user = obj.user

        if hasattr(user, "get_full_name"):
            return user.get_full_name()

        return user.username


class MessageSerializer(serializers.ModelSerializer):
    sender_id = serializers.IntegerField(
        source="sender.id",
        read_only=True,
    )
    sender_username = serializers.CharField(
        source="sender.username",
        read_only=True,
    )
    file_url = serializers.SerializerMethodField()

    class Meta:
        model = Message
        fields = [
            "id",
            "conversation",
            "sender_id",
            "sender_username",
            "content",
            "message_type",
            "file_url",
            "file_name",
            "file_size",
            "created_at",
            "updated_at",
            "is_edited",
            "is_deleted",
        ]
        # Explicit is better than a comprehension that silently changes
        # meaning when a new field is added above.
        read_only_fields = [
            "id",
            "conversation",
            "sender_id",
            "sender_username",
            "message_type",
            "file_url",
            "file_name",
            "file_size",
            "created_at",
            "updated_at",
            "is_edited",
            "is_deleted",
        ]

    def get_file_url(self, obj):
        if not obj.file:
            return None
        request = self.context.get("request")
        if request:
            return request.build_absolute_uri(obj.file.url)
        return obj.file.url


class ConversationSerializer(serializers.ModelSerializer):
    participants = ConversationParticipantSerializer(
        many=True,
        read_only=True,
    )

    other_user = serializers.SerializerMethodField()

    last_message = serializers.SerializerMethodField()

    class Meta:
        model = Conversation
        fields = [
            "id",
            "conversation_type",
            "name",
            "participants",
            "other_user",
            "last_message",
            "created_at",
            "updated_at",
        ]

        read_only_fields = [
            "id",
            "participants",
            "other_user",
            "last_message",
            "created_at",
            "updated_at",
        ]

    def get_other_user(self, obj):
        if obj.conversation_type != "private":
            return None

        request = self.context.get("request")
        if request is None or not request.user.is_authenticated:
            return None

        for participant in obj.participants.all():
            if participant.user_id != request.user.id:
                return ConversationParticipantSerializer(
                    participant,
                    context=self.context,
                ).data

        return None

    def get_last_message(self, obj):
        recent = getattr(obj, "recent_messages", None)

        if recent is not None:
            message = recent[0] if recent else None
        else:
            message = (
                obj.messages
                .select_related("sender")
                .order_by("-created_at", "-id")   # ← tiebreak
                .first()
            )

        if message is None:
            return None

        return MessageSerializer(
            message,
            context=self.context,
        ).data
