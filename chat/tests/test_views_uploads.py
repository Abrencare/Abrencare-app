# chat/tests/test_views_uploads.py

from django.core.files.uploadedfile import SimpleUploadedFile
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from chat.tests.factories import (
    make_private_conversation,
    make_user,
)


AUTH_FAILURE = (status.HTTP_401_UNAUTHORIZED, status.HTTP_403_FORBIDDEN)


def _png(name="x.png", content=b"\x89PNG\r\n\x1a\n" + b"\x00" * 16):
    return SimpleUploadedFile(name, content, content_type="image/png")


class UploadTests(APITestCase):
    def setUp(self):
        self.a = make_user("a")
        self.b = make_user("b")
        self.outsider = make_user("out")
        self.conv = make_private_conversation(self.a, self.b)
        self.url = reverse(
            "conversation-message-upload",
            kwargs={"pk": self.conv.id},
        )

    def test_requires_auth(self):
        resp = self.client.post(self.url, {}, format="multipart")
        self.assertIn(resp.status_code, AUTH_FAILURE)

    def test_outsider_404(self):
        self.client.force_authenticate(self.outsider)
        resp = self.client.post(
            self.url, {"file": _png()}, format="multipart"
        )
        self.assertEqual(resp.status_code, status.HTTP_404_NOT_FOUND)

    def test_missing_file_400(self):
        self.client.force_authenticate(self.a)
        resp = self.client.post(self.url, {}, format="multipart")
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)

    def test_image_upload_infers_type(self):
        self.client.force_authenticate(self.a)
        resp = self.client.post(
            self.url,
            {"file": _png("holiday.png")},
            format="multipart",
        )
        self.assertEqual(resp.status_code, status.HTTP_201_CREATED)
        self.assertEqual(resp.data["message_type"], "image")
        self.assertEqual(resp.data["file_name"], "holiday.png")
        self.assertIsNotNone(resp.data["file_url"])

    def test_bad_extension_400(self):
        bad = SimpleUploadedFile(
            "evil.exe", b"MZ", content_type="image/png"
        )
        self.client.force_authenticate(self.a)
        resp = self.client.post(
            self.url,
            {"file": bad, "message_type": "image"},
            format="multipart",
        )
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)