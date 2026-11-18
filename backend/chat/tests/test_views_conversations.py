# chat/tests/test_views_conversations.py

from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from chat.models import Conversation
from chat.tests.factories import (
    make_group_conversation,
    make_message,
    make_private_conversation,
    make_user,
)


class ConversationListCreateTests(APITestCase):
    def setUp(self):
        self.a = make_user("a")
        self.b = make_user("b")
        self.c = make_user("c")
        self.url = reverse("conversation-list-create")

    def test_requires_auth(self):
        resp = self.client.get(self.url)
        self.assertIn(
            resp.status_code,
            (status.HTTP_401_UNAUTHORIZED, status.HTTP_403_FORBIDDEN),
        )

    def test_list_only_shows_own_conversations(self):
        mine = make_private_conversation(self.a, self.b)
        theirs = make_private_conversation(self.b, self.c)

        self.client.force_authenticate(self.a)
        resp = self.client.get(self.url)

        ids = [row["id"] for row in resp.data]
        self.assertIn(mine.id, ids)
        self.assertNotIn(theirs.id, ids)

    def test_list_includes_last_message_and_other_user(self):
        conv = make_private_conversation(self.a, self.b)
        make_message(conv, self.a, "hi")

        self.client.force_authenticate(self.a)
        resp = self.client.get(self.url)

        row = next(r for r in resp.data if r["id"] == conv.id)
        self.assertEqual(row["last_message"]["content"], "hi")
        self.assertEqual(row["other_user"]["username"], "b")

    def test_list_orders_by_updated_at_desc(self):
        older = make_private_conversation(self.a, self.b)
        newer = make_private_conversation(self.a, self.c)
        make_message(older, self.a, "first")
        make_message(newer, self.a, "second")

        self.client.force_authenticate(self.a)
        resp = self.client.get(self.url)

        self.assertEqual(resp.data[0]["id"], newer.id)

    def test_create_private_requires_user_id(self):
        self.client.force_authenticate(self.a)
        resp = self.client.post(
            self.url, {"conversation_type": "private"}, format="json"
        )
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)

    def test_create_private_with_unknown_user(self):
        self.client.force_authenticate(self.a)
        resp = self.client.post(
            self.url,
            {"conversation_type": "private", "user_id": 999999},
            format="json",
        )
        self.assertEqual(resp.status_code, status.HTTP_404_NOT_FOUND)

    def test_create_private_with_self_rejected(self):
        self.client.force_authenticate(self.a)
        resp = self.client.post(
            self.url,
            {"conversation_type": "private", "user_id": self.a.id},
            format="json",
        )
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)

    def test_create_private_success(self):
        self.client.force_authenticate(self.a)
        resp = self.client.post(
            self.url,
            {"conversation_type": "private", "user_id": self.b.id},
            format="json",
        )
        self.assertEqual(resp.status_code, status.HTTP_201_CREATED)
        self.assertEqual(resp.data["conversation_type"], "private")
        self.assertEqual(len(resp.data["participants"]), 2)

    def test_create_group_requires_name(self):
        self.client.force_authenticate(self.a)
        resp = self.client.post(
            self.url,
            {
                "conversation_type": "group",
                "participant_ids": [self.b.id],
            },
            format="json",
        )
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)

    def test_create_group_rejects_non_list(self):
        self.client.force_authenticate(self.a)
        resp = self.client.post(
            self.url,
            {
                "conversation_type": "group",
                "name": "Team",
                "participant_ids": "not-a-list",
            },
            format="json",
        )
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)

    def test_create_group_rejects_unknown_ids(self):
        self.client.force_authenticate(self.a)
        resp = self.client.post(
            self.url,
            {
                "conversation_type": "group",
                "name": "Team",
                "participant_ids": [999999],
            },
            format="json",
        )
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)

    def test_create_group_success(self):
        self.client.force_authenticate(self.a)
        resp = self.client.post(
            self.url,
            {
                "conversation_type": "group",
                "name": "Team",
                "participant_ids": [self.b.id, self.c.id],
            },
            format="json",
        )
        self.assertEqual(resp.status_code, status.HTTP_201_CREATED)
        self.assertEqual(resp.data["conversation_type"], "group")


class ConversationDetailTests(APITestCase):
    def setUp(self):
        self.a = make_user("a")
        self.b = make_user("b")
        self.outsider = make_user("out")
        self.conv = make_private_conversation(self.a, self.b)
        self.url = reverse(
            "conversation-detail", kwargs={"pk": self.conv.id}
        )

    def test_participant_can_fetch(self):
        self.client.force_authenticate(self.a)
        resp = self.client.get(self.url)
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertEqual(resp.data["id"], self.conv.id)

    def test_outsider_gets_404(self):
        self.client.force_authenticate(self.outsider)
        resp = self.client.get(self.url)
        self.assertEqual(resp.status_code, status.HTTP_404_NOT_FOUND)

    def test_missing_conversation_404(self):
        self.client.force_authenticate(self.a)
        resp = self.client.get(
            reverse("conversation-detail", kwargs={"pk": 999999})
        )
        self.assertEqual(resp.status_code, status.HTTP_404_NOT_FOUND)