# chat/tests/test_views_messages.py

from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from chat.tests.factories import (
    make_message,
    make_private_conversation,
    make_user,
)


AUTH_FAILURE = (status.HTTP_401_UNAUTHORIZED, status.HTTP_403_FORBIDDEN)


class ConversationMessagesListTests(APITestCase):
    def setUp(self):
        self.a = make_user("a")
        self.b = make_user("b")
        self.outsider = make_user("out")
        self.conv = make_private_conversation(self.a, self.b)
        self.url = reverse(
            "conversation-messages", kwargs={"pk": self.conv.id}
        )

    def test_requires_auth(self):
        resp = self.client.get(self.url)
        self.assertIn(resp.status_code, AUTH_FAILURE)

    def test_outsider_404(self):
        self.client.force_authenticate(self.outsider)
        resp = self.client.get(self.url)
        self.assertEqual(resp.status_code, status.HTTP_404_NOT_FOUND)

    def test_returns_messages_excluding_deleted(self):
        live = make_message(self.conv, self.a, "live")
        dead = make_message(self.conv, self.a, "dead")
        dead.is_deleted = True
        dead.content = ""
        dead.save()

        self.client.force_authenticate(self.a)
        resp = self.client.get(self.url)

        ids = [m["id"] for m in resp.data]
        self.assertIn(live.id, ids)
        self.assertNotIn(dead.id, ids)

    def test_ordered_ascending(self):
        m1 = make_message(self.conv, self.a, "1")
        m2 = make_message(self.conv, self.b, "2")

        self.client.force_authenticate(self.a)
        resp = self.client.get(self.url)

        self.assertEqual([m["id"] for m in resp.data], [m1.id, m2.id])


class MessageDetailEditDeleteTests(APITestCase):
    def setUp(self):
        self.a = make_user("a")
        self.b = make_user("b")
        self.outsider = make_user("out")
        self.conv = make_private_conversation(self.a, self.b)
        self.msg = make_message(self.conv, self.a, "original")
        self.url = reverse(
            "message-detail", kwargs={"pk": self.msg.id}
        )

    def test_patch_requires_auth(self):
        resp = self.client.patch(
            self.url, {"content": "x"}, format="json"
        )
        self.assertIn(resp.status_code, AUTH_FAILURE)

    def test_patch_sender_succeeds(self):
        self.client.force_authenticate(self.a)
        resp = self.client.patch(
            self.url, {"content": "edited"}, format="json"
        )
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertEqual(resp.data["content"], "edited")
        self.assertTrue(resp.data["is_edited"])

    def test_patch_non_sender_400(self):
        self.client.force_authenticate(self.b)
        resp = self.client.patch(
            self.url, {"content": "hijack"}, format="json"
        )
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)

    def test_patch_outsider_404(self):
        self.client.force_authenticate(self.outsider)
        resp = self.client.patch(
            self.url, {"content": "x"}, format="json"
        )
        self.assertEqual(resp.status_code, status.HTTP_404_NOT_FOUND)

    def test_patch_empty_content_rejected(self):
        self.client.force_authenticate(self.a)
        resp = self.client.patch(
            self.url, {"content": "   "}, format="json"
        )
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)

    def test_patch_deleted_message_rejected(self):
        self.client.force_authenticate(self.a)
        self.client.delete(self.url)
        resp = self.client.patch(
            self.url, {"content": "x"}, format="json"
        )
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)

    def test_delete_sender_204(self):
        self.client.force_authenticate(self.a)
        resp = self.client.delete(self.url)
        self.assertEqual(resp.status_code, status.HTTP_204_NO_CONTENT)
        self.msg.refresh_from_db()
        self.assertTrue(self.msg.is_deleted)

    def test_delete_non_sender_400(self):
        self.client.force_authenticate(self.b)
        resp = self.client.delete(self.url)
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)

    def test_delete_outsider_404(self):
        self.client.force_authenticate(self.outsider)
        resp = self.client.delete(self.url)
        self.assertEqual(resp.status_code, status.HTTP_404_NOT_FOUND)

    def test_delete_idempotent_from_http(self):
        self.client.force_authenticate(self.a)
        self.client.delete(self.url)
        resp = self.client.delete(self.url)
        self.assertEqual(resp.status_code, status.HTTP_204_NO_CONTENT)