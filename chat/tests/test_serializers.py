# chat/tests/test_serializers.py

from django.urls import reverse
from rest_framework.test import APITestCase

from chat.serializers import (
    ConversationSerializer,
    MessageSerializer,
)
from chat.tests.factories import (
    make_message,
    make_private_conversation,
    make_user,
)


class MessageSerializerTests(APITestCase):
    def setUp(self):
        self.a = make_user("a")
        self.b = make_user("b")
        self.conv = make_private_conversation(self.a, self.b)

    def test_file_url_none_when_no_file(self):
        m = make_message(self.conv, self.a, "hi")
        data = MessageSerializer(m).data
        self.assertIsNone(data["file_url"])

    def test_file_url_built_from_request(self):
        from django.core.files.uploadedfile import SimpleUploadedFile
        f = SimpleUploadedFile(
            "p.png", b"\x89PNG", content_type="image/png"
        )
        m = make_message(
            self.conv, self.a, "img",
            message_type="image", file=f,
            file_name="p.png", file_size=f.size,
        )

        class FakeReq:
            def build_absolute_uri(self, url):
                return f"https://cdn.example.com{url}"

        data = MessageSerializer(
            m, context={"request": FakeReq()}
        ).data
        self.assertTrue(
            data["file_url"].startswith("https://cdn.example.com")
        )


class ConversationSerializerTests(APITestCase):
    def setUp(self):
        self.a = make_user("a")
        self.b = make_user("b")
        self.conv = make_private_conversation(self.a, self.b)

    def test_other_user_is_not_requesting_user(self):
        class FakeUser:
            id = self.a.id
            is_authenticated = True

        class FakeReq:
            user = FakeUser()

        data = ConversationSerializer(
            self.conv, context={"request": FakeReq()}
        ).data
        self.assertEqual(data["other_user"]["username"], "b")

    def test_other_user_none_without_request(self):
        data = ConversationSerializer(self.conv).data
        self.assertIsNone(data["other_user"])

    def test_last_message_uses_prefetch(self):
        from django.db.models import Prefetch, Subquery, OuterRef
        from chat.models import Message, Conversation

        m = make_message(self.conv, self.a, "latest")

        latest_id = (
            Message.objects
            .filter(conversation=OuterRef("pk"))
            .order_by("-created_at")
            .values("id")[:1]
        )
        conv = (
            Conversation.objects
            .prefetch_related(
                "participants__user",
                Prefetch(
                    "messages",
                    queryset=(
                        Message.objects
                        .filter(id__in=Subquery(latest_id))
                        .select_related("sender")
                    ),
                    to_attr="recent_messages",
                ),
            )
            .get(id=self.conv.id)
        )

        with self.assertNumQueries(0):
            data = ConversationSerializer(conv).data
        self.assertEqual(data["last_message"]["id"], m.id)

    def test_last_message_none_when_empty(self):
        data = ConversationSerializer(self.conv).data
        self.assertIsNone(data["last_message"])

    def test_list_view_returns_last_message(self):
        """Regression: the list view must populate `last_message`."""
        make_message(self.conv, self.a, "hi")
        latest = make_message(self.conv, self.b, "there")

        self.client.force_authenticate(self.a)
        resp = self.client.get(reverse("conversation-list-create"))
        self.assertEqual(resp.status_code, 200)

        row = next(
            (r for r in resp.data if r["id"] == self.conv.id),
            None,
        )
        self.assertIsNotNone(row, "conversation missing from list response")
        self.assertIsNotNone(
            row["last_message"],
            "last_message is None — prefetch failed to attach recent_messages",
        )
        self.assertEqual(row["last_message"]["id"], latest.id)
        self.assertEqual(row["last_message"]["content"], "there")