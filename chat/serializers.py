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
        read_only_fields = [f for f in fields if f != "content"]

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
        """
        For a private conversation, return the participant that is NOT
        the requesting user. Returns None for group conversations or if
        no request is available in the serializer context.
        """
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
        """
        Return the most recent message in this conversation, or None
        if the conversation has no messages yet.

        Prefers a prefetched `recent_messages` attribute (set via
        Prefetch(...) in the view) to avoid N+1 queries. Falls back
        to a single query per conversation otherwise.
        """
        recent = getattr(obj, "recent_messages", None)

        if recent is not None:
            message = recent[0] if recent else None
        else:
            message = (
                obj.messages
                .select_related("sender")
                .order_by("-created_at")
                .first()
            )

        if message is None:
            return None

        return MessageSerializer(
            message,
            context=self.context,
        ).data
    