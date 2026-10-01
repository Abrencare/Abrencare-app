# payments/services/providers/base.py
from dataclasses import dataclass, field
from decimal import Decimal
from typing import Any


@dataclass
class CheckoutResult:
    checkout_url: str
    provider_reference: str
    out_trade_no: str = ""
    raw: dict = field(default_factory=dict)

@dataclass
class InitiateResult:
    provider_reference: str
    checkout_url: str
    raw: dict[str, Any]


@dataclass
class VerifyResult:
    succeeded: bool
    provider_reference: str
    amount: Decimal | None = None
    currency: str | None = None
    raw: dict[str, Any] | None = None


@dataclass
class RefundResult:
    succeeded: bool
    provider_reference: str
    raw: dict[str, Any] | None = None


@dataclass
class QueryResult:
    """Result of asking the provider 'what happened with this payment?'"""
    status: str          # "succeeded" | "failed" | "pending" | "unknown"
    provider_reference: str = ""
    amount: Decimal | None = None
    currency: str = ""
    raw: dict = field(default_factory=dict)


class BaseProvider:
    """
    Every provider implements these four methods. Nothing else in the
    codebase should know which provider is in use.
    """

    name: str = ""

    def initiate(self, payment) -> InitiateResult:
        """
        Start a transaction. Return a checkout_url the user must visit,
        plus the provider's transaction id.
        """
        raise NotImplementedError

    def verify(self, payment) -> VerifyResult:
        """
        Ask the provider whether the payment has actually succeeded.
        Called from the webhook handler AND from a polling fallback.
        """
        raise NotImplementedError

    def refund(self, refund) -> RefundResult:
        raise NotImplementedError

    def parse_webhook(self, request) -> dict:
        """
        Validate the signature (if any) and return a normalized dict:
        {provider_reference, status, amount, currency, raw}.
        Raise ValueError on invalid signature.
        """
        raise NotImplementedError

    def query(self, payment) -> QueryResult:
        """Ask the provider about a payment's current state.

        Called by the reconciliation job when a payment has been stuck in
        PROCESSING past a threshold. Providers that don't support query
        return QueryResult(status='unknown').
        """
        return QueryResult(status="unknown")
    