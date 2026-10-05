# chat/tests/factories.py

from django.contrib.auth import get_user_model

from chat.models import (
    Conversation,
    ConversationParticipant,
    Message,
)

User = get_user_model()

import itertools

_user_counter = itertools.count(1)

def make_user(username=None, password="pw12345!", **kwargs):
    if username is None:
        username = f"user_{next(_user_counter)}"
    return User.objects.create_user(
        username=username, password=password, **kwargs
    )


def make_private_conversation(user_a, user_b):
    conv = Conversation.objects.create(conversation_type="private")
    ConversationParticipant.objects.bulk_create(
        [
            ConversationParticipant(conversation=conv, user=user_a),
            ConversationParticipant(conversation=conv, user=user_b),
        ]
    )
    return conv


def make_group_conversation(owner, members, name="Team"):
    conv = Conversation.objects.create(
        conversation_type="group", name=name
    )
    ConversationParticipant.objects.create(
        conversation=conv, user=owner, is_admin=True
    )
    ConversationParticipant.objects.bulk_create(
        [
            ConversationParticipant(conversation=conv, user=u)
            for u in members
        ]
    )
    return conv


def make_message(conversation, sender, content="hi", **kwargs):
    return Message.objects.create(
        conversation=conversation,
        sender=sender,
        content=content,
        **kwargs,
    )