"""
Telebirr-specific webhook parsing and signature verification.

Known quirks handled here:
  - Payload sometimes wrapped in a "data" envelope.
  - trade_status vocabulary: "Completed" for notify (vs "PAY_SUCCESS" for query).
  - Signature signed under "trans_id" but sent as "transId".
  - Base64 "+" arriving as space in form-decoded payloads.
  - Timestamps are epoch milliseconds.
"""
import base64
import json
import logging
from typing import Any

from cryptography.exceptions import InvalidSignature
from cryptography.hazmat.primitives import hashes, serialization
from cryptography.hazmat.primitives.asymmetric import padding, rsa

logger = logging.getLogger(__name__)


# Notify leg uses "Completed" (not "PAY_SUCCESS" like query/return legs).
TELEBIRR_NOTIFY_SUCCESS = "Completed"
TELEBIRR_NOTIFY_FAILURE = "Failure"
TELEBIRR_NOTIFY_EXPIRED = "Expired"


def _repair_base64(value: str) -> list[str]:
    """Telebirr's '+' arrives as a space in form-decoded payloads.

    Returns candidate decodings: raw, space->plus, and URL-safe variants.
    """
    if not isinstance(value, str) or not value:
        return []
    candidates = {value, value.replace(" ", "+")}
    # Also try stripping whitespace and padding repair.
    cleaned = value.replace(" ", "").strip()
    if cleaned and len(cleaned) % 4:
        cleaned = cleaned + "=" * (4 - len(cleaned) % 4)
    candidates.add(cleaned)
    return [c for c in candidates if c]


def _load_public_key(pem: str) -> rsa.RSAPublicKey:
    return serialization.load_pem_public_key(pem.encode())


def verify_telebirr_signature(
    payload: dict[str, Any],
    public_key_pem: str,
    *,
    signature_field: str = "sign",
    trans_id_aliases: tuple[str, ...] = ("transId", "trans_id"),
) -> bool:
    """Verify a Telebirr webhook/return signature.

    Telebirr signs a canonical string built from sorted key=value pairs
    (excluding the signature itself). It hashes the transaction id under
    `trans_id` but sends it as `transId`. We try both spellings.

    Also repairs base64 '+' mangling from form decoding.

    Returns True if any candidate verifies; False otherwise.
    """
    signature_raw = payload.get(signature_field)
    if not signature_raw:
        logger.warning("Telebirr webhook: no %s field", signature_field)
        return False

    # Build the canonical signed material: all keys except the signature,
    # sorted alphabetically, joined as key=value&key=value.
    def canonical(params: dict[str, Any]) -> str:
        items = sorted(
            (k, str(v)) for k, v in params.items() if k != signature_field
        )
        return "&".join(f"{k}={v}" for k, v in items)

    # Build candidates for the transaction id alias problem.
    trans_id_value = None
    for alias in trans_id_aliases:
        if alias in payload:
            trans_id_value = payload[alias]
            break

    candidate_payloads: list[dict[str, Any]] = [dict(payload)]

    if trans_id_value is not None:
        # Try the "aliased" spelling in the canonical string.
        for alias in trans_id_aliases:
            if alias in payload:
                continue  # already tried the actual spelling
            alt = dict(payload)
            alt.pop("transId", None)
            alt.pop("trans_id", None)
            alt["trans_id"] = trans_id_value
            candidate_payloads.append(alt)

    # Try each signature decoding candidate against each payload candidate.
    try:
        public_key = _load_public_key(public_key_pem)
    except Exception as exc:
        logger.error("Telebirr webhook: invalid public key: %s", exc)
        return False

    for sig_candidate in _repair_base64(signature_raw):
        try:
            signature_bytes = base64.b64decode(sig_candidate, validate=True)
        except Exception:
            continue

        for candidate in candidate_payloads:
            message = canonical(candidate).encode("utf-8")
            try:
                public_key.verify(
                    signature_bytes,
                    message,
                    padding.PSS(
                        mgf=padding.MGF1(hashes.SHA256()),
                        salt_length=32,
                    ),
                    hashes.SHA256(),
                )
                return True
            except InvalidSignature:
                # Also try PKCS1v15 for older integrations.
                try:
                    public_key.verify(
                        signature_bytes,
                        message,
                        padding.PKCS1v15(),
                        hashes.SHA256(),
                    )
                    return True
                except InvalidSignature:
                    continue
            except Exception:
                continue

    logger.warning("Telebirr webhook: signature verification failed")
    return False


def unwrap_telebirr_payload(body: dict[str, Any]) -> dict[str, Any]:
    """Unwrap the optional `data` envelope Telebirr sometimes sends.

    The signature is inside the envelope, so verification must run on the
    unwrapped dict.
    """
    if isinstance(body, dict) and "data" in body and isinstance(body["data"], dict):
        return body["data"]
    return body


def parse_notify_time(value: Any) -> int | None:
    """Parse Telebirr timestamp (epoch milliseconds) to Unix seconds.

    Returns None for formatted strings (return leg) rather than guessing.
    """
    if value is None:
        return None
    if isinstance(value, (int, float)):
        # Heuristic: if it looks like milliseconds, convert to seconds.
        if value > 1e12:
            return int(value / 1000)
        return int(value)
    if isinstance(value, str) and value.isdigit():
        n = int(value)
        return int(n / 1000) if n > 1e12 else n
    return None
