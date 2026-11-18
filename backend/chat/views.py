# chat/views.py

from asgiref.sync import async_to_sync
from channels.layers import get_channel_layer

from django.contrib.auth import get_user_model
from django.db.models import F, Prefetch, Subquery, OuterRef, Window

from django.db.models.functions import RowNumber
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


def _broadcast(event_type, conversation_id, payload):
    channel_layer = get_channel_layer()
    if channel_layer is None:
        return
    async_to_sync(channel_layer.group_send)(
        f"chat_{conversation_id}",
        {"type": event_type, "message": payload},
    )


def broadcast_message(conversation_id, payload):
    _broadcast("chat_message", conversation_id, payload)


def broadcast_message_update(conversation_id, payload):
    _broadcast("message_updated", conversation_id, payload)


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
        conversations = list(
            Conversation.objects
            .filter(participants__user=request.user)
            .prefetch_related("participants__user")
            .distinct()
            .order_by("-updated_at")
        )

        if conversations:
            conversation_ids = [c.id for c in conversations]

            # Rank messages within each conversation, newest first.
            ranked = (
                Message.objects
                .filter(conversation_id__in=conversation_ids)
                .annotate(
                    rn=Window(
                        expression=RowNumber(),
                        partition_by=[F("conversation_id")],
                        order_by=[F("created_at").desc(), F("id").desc()],
                    )
                )
            )

            # Fetch only the rank-1 rows.
            latest_messages = (
                Message.objects
                .filter(id__in=ranked.filter(rn=1).values("id"))
                .select_related("sender")
            )

            latest_by_conversation = {
                m.conversation_id: m for m in latest_messages
            }
            for conv in conversations:
                latest = latest_by_conversation.get(conv.id)
                conv.recent_messages = [latest] if latest else []

        serializer = ConversationSerializer(
            conversations,
            many=True,
            context={"request": request},
        )
        return Response(serializer.data)

    def post(self, request):
        conversation_type = request.data.get(
            "conversation_type", "private"
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
                    ConversationService.create_private_conversation(
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
                    ConversationService.create_group_conversation(
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
            .filter(id=pk, participants__user=request.user)
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
        is_participant = ConversationParticipant.objects.filter(
            conversation_id=pk, user=request.user
        ).exists()

        if not is_participant:
            return Response(
                {"detail": "Conversation not found."},
                status=status.HTTP_404_NOT_FOUND,
            )

        messages = (
            Message.objects
            .filter(conversation_id=pk, is_deleted=False)
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
    permission_classes = [IsAuthenticated]

    def _get_message_for_user(self, request, pk):
        return (
            Message.objects
            .select_related("sender", "conversation")
            .filter(id=pk, conversation__participants__user=request.user)
            .distinct()
            .first()
        )

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
        payload = MessageSerializer(
            message,
            context={"request": request},
        ).data
        broadcast_message_update(message.conversation_id, payload)
        return Response(status=status.HTTP_204_NO_CONTENT)