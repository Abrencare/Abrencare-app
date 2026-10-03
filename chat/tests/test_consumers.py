# chat/tests/test_consumers.py

import pytest
from channels.db import database_sync_to_async
from channels.testing import WebsocketCommunicator

from .conftest import asgi_app as asgi_app_fixture  # noqa
from chat.tests.factories import (
    make_private_conversation,
    make_user,
)


@pytest.mark.django_db(transaction=True)
@pytest.mark.asyncio
async def test_anonymous_socket_rejected(asgi_app):
    comm = WebsocketCommunicator(asgi_app(), "/ws/chat/1/")
    connected, code = await comm.connect()
    assert not connected
    assert code == 4001


@pytest.mark.django_db(transaction=True)
@pytest.mark.asyncio
async def test_non_participant_rejected(asgi_app):
    a = await database_sync_to_async(make_user)("a")
    b = await database_sync_to_async(make_user)("b")
    conv = await database_sync_to_async(make_private_conversation)(a, b)
    outsider = await database_sync_to_async(make_user)("out")

    comm = WebsocketCommunicator(
        asgi_app(user=outsider), f"/ws/chat/{conv.id}/"
    )
    connected, code = await comm.connect()
    assert not connected
    assert code == 4003


@pytest.mark.django_db(transaction=True)
@pytest.mark.asyncio
async def test_participant_connects_and_receives_message(asgi_app):
    a = await database_sync_to_async(make_user)("a")
    b = await database_sync_to_async(make_user)("b")
    conv = await database_sync_to_async(make_private_conversation)(a, b)

    comm_a = WebsocketCommunicator(
        asgi_app(user=a), f"/ws/chat/{conv.id}/"
    )
    connected, _ = await comm_a.connect()
    assert connected
    await comm_a.receive_json_from()   # "connection" banner

    comm_b = WebsocketCommunicator(
        asgi_app(user=b), f"/ws/chat/{conv.id}/"
    )
    connected, _ = await comm_b.connect()
    assert connected
    await comm_b.receive_json_from()

    await comm_a.send_json_to({"type": "message", "content": "hello"})

    payload_a = await comm_a.receive_json_from()
    payload_b = await comm_b.receive_json_from()

    assert payload_a["type"] == "message"
    assert payload_a["message"]["content"] == "hello"
    assert payload_b["message"]["content"] == "hello"
    assert "created_at" in payload_a["message"]

    await comm_a.disconnect()
    await comm_b.disconnect()


@pytest.mark.django_db(transaction=True)
@pytest.mark.asyncio
async def test_empty_message_rejected(asgi_app):
    a = await database_sync_to_async(make_user)("a")
    b = await database_sync_to_async(make_user)("b")
    conv = await database_sync_to_async(make_private_conversation)(a, b)

    comm = WebsocketCommunicator(
        asgi_app(user=a), f"/ws/chat/{conv.id}/"
    )
    await comm.connect()
    await comm.receive_json_from()

    await comm.send_json_to({"type": "message", "content": "   "})
    err = await comm.receive_json_from()
    assert err["type"] == "error"

    await comm.disconnect()


@pytest.mark.django_db(transaction=True)
@pytest.mark.asyncio
async def test_invalid_json_rejected(asgi_app):
    a = await database_sync_to_async(make_user)("a")
    b = await database_sync_to_async(make_user)("b")
    conv = await database_sync_to_async(make_private_conversation)(a, b)

    comm = WebsocketCommunicator(
        asgi_app(user=a), f"/ws/chat/{conv.id}/"
    )
    await comm.connect()
    await comm.receive_json_from()

    await comm.send_to(text_data="not json")
    err = await comm.receive_json_from()
    assert err["type"] == "error"

    await comm.disconnect()


@pytest.mark.django_db(transaction=True)
@pytest.mark.asyncio
async def test_typing_not_echoed_to_author(asgi_app):
    a = await database_sync_to_async(make_user)("a")
    b = await database_sync_to_async(make_user)("b")
    conv = await database_sync_to_async(make_private_conversation)(a, b)

    comm_a = WebsocketCommunicator(
        asgi_app(user=a), f"/ws/chat/{conv.id}/"
    )
    await comm_a.connect()
    await comm_a.receive_json_from()

    comm_b = WebsocketCommunicator(
        asgi_app(user=b), f"/ws/chat/{conv.id}/"
    )
    await comm_b.connect()
    await comm_b.receive_json_from()

    await comm_a.send_json_to({"type": "typing", "is_typing": True})

    # B should get the event.
    typing = await comm_b.receive_json_from()
    assert typing["type"] == "typing"
    assert typing["user_id"] == a.id

    # A should NOT get it back. `receive_nothing` waits up to `timeout`
    # for any output; returns True if the queue stayed empty.
    got_something = await comm_a.receive_nothing(timeout=0.3)
    assert got_something is True, (
        "typing event was echoed back to its author"
    )

    await comm_a.disconnect()
    await comm_b.disconnect()
    
@pytest.mark.django_db(transaction=True)
@pytest.mark.asyncio
async def test_message_updated_event_is_forwarded(asgi_app):
    """Regression test for the missing `message_updated` handler."""
    a = await database_sync_to_async(make_user)("a")
    b = await database_sync_to_async(make_user)("b")
    conv = await database_sync_to_async(make_private_conversation)(a, b)

    comm = WebsocketCommunicator(
        asgi_app(user=a), f"/ws/chat/{conv.id}/"
    )
    await comm.connect()
    await comm.receive_json_from()

    from channels.layers import get_channel_layer
    layer = get_channel_layer()
    await layer.group_send(
        f"chat_{conv.id}",
        {
            "type": "message_updated",
            "message": {"id": 1, "content": "edited", "is_edited": True},
        },
    )

    payload = await comm.receive_json_from()
    assert payload["type"] == "message_updated"
    assert payload["message"]["content"] == "edited"

    await comm.disconnect()