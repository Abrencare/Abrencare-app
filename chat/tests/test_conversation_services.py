# chat/tests/test_conversation_services.py

from django.test import TestCase

from chat.models import Conversation, ConversationParticipant
from chat.services.conversation_services import (
    ConversationService,
    MAX_GROUP_PARTICIPANTS,
)
from chat.tests.factories import make_user


class PrivateConversationTests(TestCase):
    def setUp(self):
        self.a = make_user("a")
        self.b = make_user("b")

    def test_creates_two_participants(self):
        conv = ConversationService.create_private_conversation(
            self.a, self.b
        )
        self.assertEqual(conv.conversation_type, "private")
        self.assertEqual(conv.participants.count(), 2)

    def test_idempotent(self):
        first = ConversationService.create_private_conversation(
            self.a, self.b
        )
        second = ConversationService.create_private_conversation(
            self.a, self.b
        )
        self.assertEqual(first.id, second.id)

    def test_order_independent(self):
        first = ConversationService.create_private_conversation(
            self.a, self.b
        )
        second = ConversationService.create_private_conversation(
            self.b, self.a
        )
        self.assertEqual(first.id, second.id)

    def test_self_conversation_rejected(self):
        with self.assertRaises(ValueError):
            ConversationService.create_private_conversation(
                self.a, self.a
            )


class GroupConversationTests(TestCase):
    def setUp(self):
        self.owner = make_user("owner")
        self.u1 = make_user("u1")
        self.u2 = make_user("u2")

    def test_creates_owner_as_admin(self):
        conv = ConversationService.create_group_conversation(
            self.owner, "Team", [self.u1.id, self.u2.id]
        )
        owner_p = conv.participants.get(user=self.owner)
        self.assertTrue(owner_p.is_admin)

    def test_owner_id_in_participant_ids_is_deduplicated(self):
        conv = ConversationService.create_group_conversation(
            self.owner, "Team", [self.owner.id, self.u1.id]
        )
        # Owner appears once, u1 appears once → total 2
        self.assertEqual(conv.participants.count(), 2)

    def test_duplicate_ids_collapsed(self):
        conv = ConversationService.create_group_conversation(
            self.owner, "Team", [self.u1.id, self.u1.id, self.u2.id]
        )
        self.assertEqual(conv.participants.count(), 3)  # owner + 2

    def test_empty_members_rejected(self):
        with self.assertRaises(ValueError):
            ConversationService.create_group_conversation(
                self.owner, "Team", []
            )

    def test_only_owner_in_members_rejected(self):
        with self.assertRaises(ValueError):
            ConversationService.create_group_conversation(
                self.owner, "Team", [self.owner.id]
            )

    def test_unknown_user_ids_rejected(self):
        with self.assertRaises(ValueError) as ctx:
            ConversationService.create_group_conversation(
                self.owner, "Team", [999999]
            )
        self.assertIn("Unknown user ids", str(ctx.exception))

    def test_group_size_cap(self):
        # Doesn't need real users — the size check fires before validation.
        too_many_ids = list(range(1, MAX_GROUP_PARTICIPANTS + 1))
        with self.assertRaises(ValueError):
            ConversationService.create_group_conversation(
                self.owner, "Huge", too_many_ids
            )

    def test_no_partial_creation_on_invalid_id(self):
        before = Conversation.objects.count()
        with self.assertRaises(ValueError):
            ConversationService.create_group_conversation(
                self.owner, "Team", [self.u1.id, 999999]
            )
        self.assertEqual(Conversation.objects.count(), before)