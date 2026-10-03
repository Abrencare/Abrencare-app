# chat/tests/test_permissions_matrix.py

from django.urls import reverse
from rest_framework.test import APITestCase

from chat.tests.factories import (
    make_message,
    make_private_conversation,
    make_user,
)


class PermissionMatrix(APITestCase):
    def setUp(self):
        self.sender = make_user("sender")
        self.other = make_user("other")
        self.outsider = make_user("outsider")
        self.conv = make_private_conversation(self.sender, self.other)
        self.msg = make_message(self.conv, self.sender, "hi")

        self.msg_list = reverse(
            "conversation-messages", kwargs={"pk": self.conv.id}
        )
        self.msg_detail = reverse(
            "message-detail", kwargs={"pk": self.msg.id}
        )

    def _matrix(self):
        anon = (401, 403)
        return [
            (None,          "get",    self.msg_list,   anon),
            (self.outsider, "get",    self.msg_list,   404),
            (self.other,    "get",    self.msg_list,   200),

            (None,          "patch",  self.msg_detail, anon),
            (self.outsider, "patch",  self.msg_detail, 404),
            (self.other,    "patch",  self.msg_detail, 400),
            (self.sender,   "patch",  self.msg_detail, 200),

            (None,          "delete", self.msg_detail, anon),
            (self.outsider, "delete", self.msg_detail, 404),
            (self.other,    "delete", self.msg_detail, 400),
            (self.sender,   "delete", self.msg_detail, 204),
        ]

    def test_matrix(self):
        for user, method, url, expected in self._matrix():
            with self.subTest(
                user=getattr(user, "username", "anon"),
                method=method,
                url=url,
            ):
                self.msg.is_deleted = False
                self.msg.content = "hi"
                self.msg.save()

                self.client.force_authenticate(user)
                call = getattr(self.client, method)
                if method in ("patch", "post", "put"):
                    resp = call(url, {"content": "x"}, format="json")
                else:
                    resp = call(url)

                valid = (
                    expected if isinstance(expected, (tuple, list, set))
                    else (expected,)
                )
                self.assertIn(
                    resp.status_code,
                    valid,
                    msg=f"{method.upper()} {url} as "
                        f"{getattr(user, 'username', 'anon')} "
                        f"→ {resp.status_code}, expected {valid}",
                )