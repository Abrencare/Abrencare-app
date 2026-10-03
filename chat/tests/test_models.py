# chat/tests/test_models.py

from django.db import IntegrityError
from django.test import TestCase

from ..models import Conversation, ConversationParticipant, Message
from .factories import make_user, make_private_conversation


class ConversationModelTests(TestCase):
    def test_default_type_is_private(self):
        conv = Conversation.objects.create()
        self.assertEqual(conv.conversation_type, "private")

    def test_str_via_participant(self):
        a = make_user("a")
        b = make_user("b")
        conv = make_private_conversation(a, b)
        participant = conv.participants.first()
        self.assertIn("Conversation", str(participant))


class ConversationParticipantTests(TestCase):
    def test_unique_participant_per_conversation(self):
        a = make_user("a")
        b = make_user("b")
        conv = make_private_conversation(a, b)

        with self.assertRaises(IntegrityError):
            ConversationParticipant.objects.create(
                conversation=conv, user=a
            )


class MessageModelTests(TestCase):
    def setUp(self):
        self.a = make_user("a")
        self.b = make_user("b")
        self.conv = make_private_conversation(self.a, self.b)

    def test_ordering_is_ascending_by_created_at(self):
        m1 = Message.objects.create(
            conversation=self.conv, sender=self.a, content="one"
        )
        m2 = Message.objects.create(
            conversation=self.conv, sender=self.a, content="two"
        )
        self.assertEqual(
            list(Message.objects.values_list("id", flat=True)),
            [m1.id, m2.id],
        )

    def test_default_message_type_is_text(self):
        m = Message.objects.create(
            conversation=self.conv, sender=self.a, content="hi"
        )
        self.assertEqual(m.message_type, "text")

    def test_default_flags(self):
        m = Message.objects.create(
            conversation=self.conv, sender=self.a, content="hi"
        )
        self.assertFalse(m.is_edited)
        self.assertFalse(m.is_deleted)