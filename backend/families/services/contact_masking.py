# backend/families/services/contact_masking.py

def _mask_contact(value: str, channel: str) -> str:
    """Mask email or phone before exposing to the frontend."""
    if not value:
        return ""

    if channel == "email":
        if "@" not in value:
            return "***"
        local, domain = value.split("@", 1)
        if len(local) <= 2:
            masked_local = "*" * len(local)
        else:
            masked_local = local[0] + "*" * (len(local) - 2) + local[-1]
        return f"{masked_local}@{domain}"

    # SMS / phone
    if len(value) <= 4:
        return "*" * len(value)
    return "*" * (len(value) - 4) + value[-4:]