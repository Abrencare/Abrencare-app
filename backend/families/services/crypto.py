# backend/families/services/crypto.py

import hashlib
import hmac
import secrets


# ============================================================
# INVITATION TOKENS
# ============================================================

def generate_invitation_token() -> tuple[str, str]:
    """
    Generate a cryptographically secure invitation token.

    Returns (raw_token, token_hash).
    Only the SHA-256 hash is persisted.
    """
    raw_token = secrets.token_urlsafe(32)
    token_hash = hashlib.sha256(raw_token.encode("utf-8")).hexdigest()
    return raw_token, token_hash


def hash_invitation_token(token: str) -> str:
    if not token:
        return ""
    return hashlib.sha256(token.encode("utf-8")).hexdigest()


def verify_invitation_token(raw_token: str, stored_hash: str) -> bool:
    """Constant-time verification."""
    return hmac.compare_digest(
        hash_invitation_token(raw_token),
        stored_hash or "",
    )


# ============================================================
# OTP
# ============================================================

def generate_otp() -> str:
    """Cryptographically secure 6-digit OTP."""
    return f"{secrets.randbelow(1_000_000):06d}"


def hash_otp(otp: str) -> str:
    if not otp:
        return ""
    return hashlib.sha256(otp.encode("utf-8")).hexdigest()


def verify_otp(raw_otp: str, stored_hash: str) -> bool:
    return hmac.compare_digest(
        hash_otp(raw_otp),
        stored_hash or "",
    )