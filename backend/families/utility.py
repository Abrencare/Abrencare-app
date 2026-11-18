# backend/families/utils.py

import hashlib
import hmac
import secrets


def create_invitation_token() -> tuple[str, str]:
    """
    Return (raw_token, token_hash).

    The raw token is emailed/SMSed to the invitee; only the hash is stored.
    Verify with `verify_invitation_token()`.
    """
    raw_token = secrets.token_urlsafe(32)
    token_hash = hashlib.sha256(raw_token.encode("utf-8")).hexdigest()
    return raw_token, token_hash


def verify_invitation_token(raw_token: str, stored_hash: str) -> bool:
    """Constant-time comparison of a raw token against a stored hash."""
    candidate = hashlib.sha256(raw_token.encode("utf-8")).hexdigest()
    return hmac.compare_digest(candidate, stored_hash)


def create_otp() -> tuple[str, str]:
    """
    Six-digit OTP. Returns (raw_otp, otp_hash).
    Use `verify_otp()` to check.
    """
    raw_otp = f"{secrets.randbelow(1_000_000):06d}"
    otp_hash = hashlib.sha256(raw_otp.encode("utf-8")).hexdigest()
    return raw_otp, otp_hash


def verify_otp(raw_otp: str, stored_hash: str) -> bool:
    candidate = hashlib.sha256(raw_otp.encode("utf-8")).hexdigest()
    return hmac.compare_digest(candidate, stored_hash)