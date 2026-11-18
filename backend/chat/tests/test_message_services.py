# chat/tests/test_message_services.py

import io

from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import TestCase

from chat.models import Message
from chat.services.message_services import (
    MessageService,
    MAX_ATTACHMENT_SIZE,
)
from chat.tests.factories import (
    make_message,
    make_private_conversation,
    make_user,
)


def _png(name="x.png", size=None):
    """Tiny valid-ish PNG payload; size padded if requested."""
    base = b"\x89PNG\r\n\x1a\n" + b"\x00" * 16
    if size is not None:
        base = base + b"\x00" * max(0, size - len(base))
    return SimpleUploadedFile(name, base, content_type="image/png")


class CreateMessageTests(TestCase):
    def setUp(self):
        self.a = make_user("a")
        self.b = make_user("b")
        self.c = make_user("c")
        self.conv = make_private_conversation(self.a, self.b)

    def test_text_message_created(self):
        m = MessageService.create_message(
            conversation=self.conv,
            sender=self.a,
            content="  hello  ",
            message_type="text",
        )
        self.assertEqual(m.content, "hello")
        self.assertEqual(m.message_type, "text")
        self.assertEqual(m.sender, self.a)

    def test_empty_text_rejected(self):
        with self.assertRaises(ValueError):
            MessageService.create_message(
                conversation=self.conv,
                sender=self.a,
                content="   ",
                message_type="text",
            )

    def test_invalid_message_type_rejected(self):
        with self.assertRaises(ValueError):
            MessageService.create_message(
                conversation=self.conv,
                sender=self.a,
                content="x",
                message_type="telepathy",
            )

    def test_image_requires_file(self):
        with self.assertRaises(ValueError):
            MessageService.create_message(
                conversation=self.conv,
                sender=self.a,
                content="",
                message_type="image",
            )

    def test_non_participant_rejected(self):
        with self.assertRaises(ValueError):
            MessageService.create_message(
                conversation=self.conv,
                sender=self.c,
                content="hi",
            )

    def test_image_upload_success_sets_metadata(self):
        m = MessageService.create_message(
            conversation=self.conv,
            sender=self.a,
            message_type="image",
            file=_png("photo.png"),
        )
        self.assertEqual(m.message_type, "image")
        self.assertEqual(m.file_name, "photo.png")
        self.assertEqual(m.file_size, m.file.size)

    def test_upload_too_large_rejected(self):
        big = _png("big.png", size=MAX_ATTACHMENT_SIZE + 1)
        with self.assertRaises(ValueError):
            MessageService.create_message(
                conversation=self.conv,
                sender=self.a,
                message_type="image",
                file=big,
            )

    def test_upload_wrong_extension_rejected(self):
        bad = SimpleUploadedFile(
            "payload.exe",
            b"MZ\x00",
            content_type="image/png",
        )
        with self.assertRaises(ValueError):
            MessageService.create_message(
                conversation=self.conv,
                sender=self.a,
                message_type="image",
                file=bad,
            )

    def test_upload_wrong_mime_rejected(self):
        bad = SimpleUploadedFile(
            "photo.png",
            b"notreallyapng",
            content_type="application/octet-stream",
        )
        with self.assertRaises(ValueError):
            MessageService.create_message(
                conversation=self.conv,
                sender=self.a,
                message_type="image",
                file=bad,
            )

    def test_conversation_updated_at_bumped(self):
        original = self.conv.updated_at

        MessageService.create_message(
            conversation=self.conv,
            sender=self.a,
            content="hi",
        )
        self.conv.refresh_from_db()
        self.assertGreater(self.conv.updated_at, original)


class UpdateMessageTests(TestCase):
    def setUp(self):
        self.a = make_user("a")
        self.b = make_user("b")
        self.conv = make_private_conversation(self.a, self.b)
        self.msg = make_message(self.conv, self.a, "original")

    def test_sender_can_edit(self):
        updated = MessageService.update_message(
            message=self.msg, editor=self.a, content="edited"
        )
        self.assertEqual(updated.content, "edited")
        self.assertTrue(updated.is_edited)

    def test_non_sender_cannot_edit(self):
        with self.assertRaises(ValueError):
            MessageService.update_message(
                message=self.msg, editor=self.b, content="nope"
            )

    def test_empty_content_rejected(self):
        with self.assertRaises(ValueError):
            MessageService.update_message(
                message=self.msg, editor=self.a, content="   "
            )

    def test_non_text_message_cannot_be_edited(self):
        m = Message.objects.create(
            conversation=self.conv,
            sender=self.a,
            message_type="image",
            file=_png(),
            file_name="x.png",
            file_size=32,
        )
        with self.assertRaises(ValueError):
            MessageService.update_message(
                message=m, editor=self.a, content="edited"
            )

    def test_deleted_message_cannot_be_edited(self):
        MessageService.delete_message(message=self.msg, actor=self.a)
        with self.assertRaises(ValueError):
            MessageService.update_message(
                message=self.msg, editor=self.a, content="again"
            )

    def test_edit_bumps_conversation_updated_at(self):
        before = self.conv.updated_at
        MessageService.update_message(
            message=self.msg, editor=self.a, content="edited"
        )
        self.conv.refresh_from_db()
        self.assertGreater(self.conv.updated_at, before)


class DeleteMessageTests(TestCase):
    def setUp(self):
        self.a = make_user("a")
        self.b = make_user("b")
        self.conv = make_private_conversation(self.a, self.b)

    def test_sender_soft_deletes(self):
        m = make_message(self.conv, self.a, "bye")
        MessageService.delete_message(message=m, actor=self.a)
        m.refresh_from_db()
        self.assertTrue(m.is_deleted)
        self.assertEqual(m.content, "")

    def test_delete_clears_file_metadata(self):
        m = Message.objects.create(
            conversation=self.conv,
            sender=self.a,
            message_type="image",
            file=_png(),
            file_name="x.png",
            file_size=32,
        )
        MessageService.delete_message(message=m, actor=self.a)
        m.refresh_from_db()
        self.assertIsNone(m.file_size)
        self.assertEqual(m.file_name, "")
        self.assertFalse(bool(m.file))

    def test_non_sender_cannot_delete(self):
        m = make_message(self.conv, self.a, "bye")
        with self.assertRaises(ValueError):
            MessageService.delete_message(message=m, actor=self.b)

    def test_delete_is_idempotent(self):
        m = make_message(self.conv, self.a, "bye")
        MessageService.delete_message(message=m, actor=self.a)
        # Second call should not raise.
        MessageService.delete_message(message=m, actor=self.a)