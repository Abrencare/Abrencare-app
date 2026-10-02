# chat/views.py

from asgiref.sync import async_to_sync
from channels.layers import get_channel_layer

from django.contrib.auth import get_user_model
from django.db.models import Prefetch, Subquery, OuterRef

from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.parsers import FormParser, MultiPartParser

from .services.message_services import MessageService
from .services.conversation_services import ConversationService

from .models import (
    Conversation,
    ConversationParticipant,
    Message,
)

from .serializers import (
    ConversationSerializer,
    MessageSerializer,
)

User = get_user_model()


def infer_message_type(uploaded_file):
    content_type = uploaded_file.content_type or ""
    if content_type.startswith("image/"):
        return "image"
    if content_type.startswith("audio/"):
        return "audio"
    if content_type.startswith("video/"):
        return "video"
    return "file"


def broadcast_message(conversation_id, payload):
    """
    Fan a serialized message out to every socket bound to this conversation.
    Kept as a tiny helper so upload / edit / delete paths stay symmetric.
    """
    channel_layer = get_channel_layer()
    async_to_sync(channel_layer.group_send)(
        f"chat_{conversation_id}",
        {
            "type": "chat_message",
            "message": payload,
        },
    )


def broadcast_message_update(conversation_id, payload):
    """
    Separate event type for edits/deletes so clients can distinguish an
    updated payload from a newly-created one.
    """
    channel_layer = get_channel_layer()
    async_to_sync(channel_layer.group_send)(
        f"chat_{conversation_id}",
        {
            "type": "message_updated",
            "message": payload,
        },
    )


# ---------------------------------------------------------------------- #
# uploads
# ---------------------------------------------------------------------- #

class ConversationMessageUploadView(APIView):
    permission_classes = [IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser]

    def post(self, request, pk):
        is_participant = ConversationParticipant.objects.filter(
            conversation_id=pk,
            user=request.user,
        ).exists()

        if not is_participant:
            return Response(
                {"detail": "Conversation not found."},
                status=status.HTTP_404_NOT_FOUND,
            )

        uploaded_file = request.FILES.get("file")
        if not uploaded_file:
            return Response(
                {"detail": "file is required."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        conversation = Conversation.objects.filter(id=pk).first()
        if conversation is None:
            return Response(
                {"detail": "Conversation not found."},
                status=status.HTTP_404_NOT_FOUND,
            )

        message_type = (
            request.data.get("message_type")
            or infer_message_type(uploaded_file)
        )

        try:
            message = MessageService.create_message(
                conversation=conversation,
                sender=request.user,
                content=request.data.get("content", ""),
                message_type=message_type,
                file=uploaded_file,
            )
        except ValueError as exc:
            return Response(
                {"detail": str(exc)},
                status=status.HTTP_400_BAD_REQUEST,
            )

        serializer = MessageSerializer(
            message,
            context={"request": request},
        )

        broadcast_message(pk, serializer.data)

        return Response(
            serializer.data,
            status=status.HTTP_201_CREATED,
        )


# ---------------------------------------------------------------------- #
# conversations
# ---------------------------------------------------------------------- #

class ConversationListCreateView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        # Fetch the latest message id per conversation via a correlated
        # subquery, then prefetch just that one row. Avoids loading every
        # message for every conversation just to show a preview.
        latest_message_id = (
            Message.objects
            .filter(conversation=OuterRef("pk"))
            .order_by("-created_at")
            .values("id")[:1]
        )

        conversations = (
            Conversation.objects
            .filter(participants__user=request.user)
            .prefetch_related(
                "participants__user",
                Prefetch(
                    "messages",
                    queryset=(
                        Message.objects
                        .filter(id__in=Subquery(latest_message_id))
                        .select_related("sender")
                    ),
                    to_attr="recent_messages",
                ),
            )
            .distinct()
            .order_by("-updated_at")
        )

        serializer = ConversationSerializer(
            conversations,
            many=True,
            context={"request": request},
        )

        return Response(serializer.data)

    def post(self, request):
        conversation_type = request.data.get(
            "conversation_type",
            "private",
        )

        if conversation_type == "private":
            other_user_id = request.data.get("user_id")

            if not other_user_id:
                return Response(
                    {"detail": "user_id is required."},
                    status=status.HTTP_400_BAD_REQUEST,
                )

            try:
                other_user = User.objects.get(id=other_user_id)
            except User.DoesNotExist:
                return Response(
                    {"detail": "User not found."},
                    status=status.HTTP_404_NOT_FOUND,
                )

            try:
                conversation = (
                    ConversationService
                    .create_private_conversation(
                        user=request.user,
                        other_user=other_user,
                    )
                )
            except ValueError as exc:
                return Response(
                    {"detail": str(exc)},
                    status=status.HTTP_400_BAD_REQUEST,
                )

        else:
            name = request.data.get("name")
            participant_ids = request.data.get("participant_ids", [])

            if not name:
                return Response(
                    {"detail": "Group name is required."},
                    status=status.HTTP_400_BAD_REQUEST,
                )

            if not isinstance(participant_ids, list):
                return Response(
                    {"detail": "participant_ids must be a list."},
                    status=status.HTTP_400_BAD_REQUEST,
                )

            try:
                conversation = (
                    ConversationService
                    .create_group_conversation(
                        user=request.user,
                        name=name,
                        participant_ids=participant_ids,
                    )
                )
            except ValueError as exc:
                return Response(
                    {"detail": str(exc)},
                    status=status.HTTP_400_BAD_REQUEST,
                )

        # Re-fetch with participants prefetched so the serializer's
        # `other_user` and `participants` fields don't trigger queries.
        conversation = (
            Conversation.objects
            .prefetch_related("participants__user")
            .get(id=conversation.id)
        )

        serializer = ConversationSerializer(
            conversation,
            context={"request": request},
        )

        return Response(
            serializer.data,
            status=status.HTTP_201_CREATED,
        )


class ConversationDetailView(APIView):
    permission_classes = [IsAuthenticated]

    def get_conversation(self, request, pk):
        return (
            Conversation.objects
            .prefetch_related("participants__user")
            .filter(
                id=pk,
                participants__user=request.user,
            )
            .distinct()
            .first()
        )

    def get(self, request, pk):
        conversation = self.get_conversation(request, pk)

        if not conversation:
            return Response(
                {"detail": "Conversation not found."},
                status=status.HTTP_404_NOT_FOUND,
            )

        serializer = ConversationSerializer(
            conversation,
            context={"request": request},
        )

        return Response(serializer.data)


# ---------------------------------------------------------------------- #
# messages
# ---------------------------------------------------------------------- #

class ConversationMessagesView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, pk):
        is_participant = (
            ConversationParticipant.objects
            .filter(
                conversation_id=pk,
                user=request.user,
            )
            .exists()
        )

        if not is_participant:
            return Response(
                {"detail": "Conversation not found."},
                status=status.HTTP_404_NOT_FOUND,
            )

        messages = (
            Message.objects
            .filter(
                conversation_id=pk,
                is_deleted=False,
            )
            .select_related("sender")
            .order_by("created_at")
        )

        serializer = MessageSerializer(
            messages,
            many=True,
            context={"request": request},
        )

        return Response(serializer.data)


class MessageDetailView(APIView):
    """
    PATCH  → edit a text message (sender only)
    DELETE → soft-delete a message (sender only)
    """

    permission_classes = [IsAuthenticated]

    def _get_message_for_user(self, request, pk):
        message = (
            Message.objects
            .select_related("sender", "conversation")
            .filter(id=pk, conversation__participants__user=request.user)
            .distinct()
            .first()
        )
        return message

    def patch(self, request, pk):
        message = self._get_message_for_user(request, pk)

        if message is None:
            return Response(
                {"detail": "Message not found."},
                status=status.HTTP_404_NOT_FOUND,
            )

        try:
            message = MessageService.update_message(
                message=message,
                editor=request.user,
                content=request.data.get("content", ""),
            )
        except ValueError as exc:
            return Response(
                {"detail": str(exc)},
                status=status.HTTP_400_BAD_REQUEST,
            )

        serializer = MessageSerializer(
            message,
            context={"request": request},
        )

        broadcast_message_update(message.conversation_id, serializer.data)

        return Response(serializer.data)

    def delete(self, request, pk):
        message = self._get_message_for_user(request, pk)

        if message is None:
            return Response(
                {"detail": "Message not found."},
                status=status.HTTP_404_NOT_FOUND,
            )

        try:
            MessageService.delete_message(
                message=message,
                actor=request.user,
            )
        except ValueError as exc:
            return Response(
                {"detail": str(exc)},
                status=status.HTTP_400_BAD_REQUEST,
            )

        serializer = MessageSerializer(
            message,
            context={"request": request},
        )

        broadcast_message_update(message.conversation_id, serializer.data)

        return Response(status=status.HTTP_204_NO_CONTENT)
    