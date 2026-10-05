# chat/tests/conftest.py
import pytest
from channels.routing import URLRouter
from channels.auth import AuthMiddlewareStack

from chat.routing import websocket_urlpatterns


class _OverrideUser:
    def __init__(self, app, user):
        self.app = app
        self.user = user

    async def __call__(self, scope, receive, send):
        scope = dict(scope)
        scope["user"] = self.user
        return await self.app(scope, receive, send)


@pytest.fixture
def asgi_app():
    """
    Returns a factory so each test can build its own app with a
    specific user injected. Usage:
        comm = WebsocketCommunicator(
            asgi_app(user=some_user), f"/ws/chat/{conv.id}/"
        )
    """
    def _make(user=None):
        base = AuthMiddlewareStack(URLRouter(websocket_urlpatterns))
        if user is None:
            return base
        return _OverrideUser(base, user)
    return _make