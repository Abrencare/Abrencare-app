# chat/consumers.py

import json

from channels.db import database_sync_to_async
from channels.generic.websocket import AsyncWebsocketConsumer

from accounts.models import User

from .models import (
    Conversation,
    ConversationParticipant,
    Message,
)


class ChatConsumer(AsyncWebsocketConsumer):

    async def connect(self):
        self.conversation_id = (
            self.scope["url_route"]["kwargs"]["conversation_id"]
        )

        self.room_group_name = f"chat_{self.conversation_id}"

        user = self.scope.get("user")

        if not user or user.is_anonymous:
            await self.close(code=4001)
            return

        # Cache the user object so handle_message doesn't re-fetch it.
        self.user = user
        self.user_id = user.id
        self.username = user.username

        is_participant = await self.check_participant(
            self.user_id,
            self.conversation_id,
        )

        if not is_participant:
            await self.close(code=4003)
            return

        await self.channel_layer.group_add(
            self.room_group_name,
            self.channel_name,
        )

        await self.accept()

        await self.send(
            text_data=json.dumps(
                {
                    "type": "connection",
                    "message": "Connected to chat.",
                    "conversation_id": int(self.conversation_id),
                }
            )
        )

    async def disconnect(self, close_code):
        # Only try to leave the group if we actually joined it.
        # If connect() aborted early (auth fail / not participant),
        # room_group_name may still exist but we never joined.
        if hasattr(self, "room_group_name"):
            await self.channel_layer.group_discard(
                self.room_group_name,
                self.channel_name,
            )

    async def receive(self, text_data):
        try:
            data = json.loads(text_data)
        except json.JSONDecodeError:
            await self.send_error("Invalid JSON.")
            return

        message_type = data.get("type")

        if message_type == "message":
            await self.handle_message(data)
            return

        if message_type == "typing":
            await self.handle_typing(data)
            return

        await self.send_error("Unknown message type.")

    async def handle_message(self, data):
        content = (data.get("content") or "").strip()

        if not content:
            await self.send_error("Message cannot be empty.")
            return

        # Re-check participation: a user could have been removed from
        # the conversation after the socket connected.
        still_participant = await self.check_participant(
            self.user_id,
            self.conversation_id,
        )

        if not still_participant:
            await self.send_error(
                "You are no longer a participant in this conversation."
            )
            await self.close(code=4003)
            return

        try:
            message = await self.create_message(
                self.user_id,
                self.conversation_id,
                content,
            )
        except (User.DoesNotExist, Conversation.DoesNotExist):
            await self.send_error("Conversation or user no longer exists.")
            return
        except ValueError as exc:
            await self.send_error(str(exc))
            return

        await self.channel_layer.group_send(
            self.room_group_name,
            {
                "type": "chat_message",
                "message": message,
            },
        )

    # ------------------------------------------------------------------ #
    # channel-layer event handlers
    # ------------------------------------------------------------------ #

    async def chat_message(self, event):
        await self.send(
            text_data=json.dumps(
                {
                    "type": "message",
                    "message": event["message"],
                }
            )
        )

    async def message_updated(self, event):
        # NEW: without this handler, edits/deletes broadcast from the
        # REST view were silently dropped for WebSocket clients.
        await self.send(
            text_data=json.dumps(
                {
                    "type": "message_updated",
                    "message": event["message"],
                }
            )
        )

    async def typing_status(self, event):
        # Don't echo the typing event back to its author.
        if event["user_id"] == self.user_id:
            return

        await self.send(
            text_data=json.dumps(
                {
                    "type": "typing",
                    "user_id": event["user_id"],
                    "username": event["username"],
                    "is_typing": event["is_typing"],
                }
            )
        )

    async def send_error(self, message):
        await self.send(
            text_data=json.dumps(
                {
                    "type": "error",
                    "message": message,
                }
            )
        )

    # ------------------------------------------------------------------ #
    # db helpers
    # ------------------------------------------------------------------ #

    @database_sync_to_async
    def check_participant(self, user_id, conversation_id):
        return (
            ConversationParticipant.objects
            .filter(
                user_id=user_id,
                conversation_id=conversation_id,
            )
            .exists()
        )

    @database_sync_to_async
    def create_message(self, user_id, conversation_id, content):
        from django.contrib.auth import get_user_model

        from .models import Conversation
        from .services.message_services import MessageService

        User = get_user_model()

        conversation = Conversation.objects.get(id=conversation_id)
        user = User.objects.get(id=user_id)

        message = MessageService.create_message(
            conversation=conversation,
            sender=user,
            content=content,
            message_type="text",
        )

        # Match the REST serializer shape so clients only need one parser.
        return {
            "id": message.id,
            "conversation": message.conversation_id,
            "sender_id": message.sender_id,
            "sender_username": message.sender.username,
            "content": message.content,
            "message_type": message.message_type,
            "file_url": None,
            "file_name": message.file_name or "",
            "file_size": message.file_size,
            "created_at": message.created_at.isoformat(),
            "updated_at": message.updated_at.isoformat(),
            "is_edited": message.is_edited,
            "is_deleted": message.is_deleted,
        }

    async def handle_typing(self, data):
        is_typing = bool(data.get("is_typing", False))

        await self.channel_layer.group_send(
            self.room_group_name,
            {
                "type": "typing_status",
                "user_id": self.user_id,
                "username": self.username,
                "is_typing": is_typing,
            },
        )