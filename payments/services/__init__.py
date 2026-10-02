# payments/services/__init__.py
"""Public API for the payments services package.

Anything imported at this level is part of the module's stable surface.
Internal modules (payment_service, etc.) remain importable directly, but
callers should prefer `from payments.services import X`.
"""

from .payment_service import (
    BaseProviderClient,
    ProviderError,
    StubProviderClient,
    create_payment,
    get_provider_client,
    request_refund,
    settle_manual_payment,
    settle_refund_from_webhook,
)

__all__ = [
    "BaseProviderClient",
    "ProviderError",
    "StubProviderClient",
    "create_payment",
    "get_provider_client",
    "request_refund",
    "settle_manual_payment",
    "settle_refund_from_webhook",
]