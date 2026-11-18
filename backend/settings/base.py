# settings/base.py
import os
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent

TELEBIRR_MERCHANT_APP_ID = os.environ.get("TELEBIRR_MERCHANT_APP_ID", "")
TELEBIRR_APP_SECRET = os.environ.get("TELEBIRR_APP_SECRET", "")
TELEBIRR_SHORT_CODE = os.environ.get("TELEBIRR_SHORT_CODE", "")
TELEBIRR_BASE_URL = os.environ.get(
    "TELEBIRR_BASE_URL",
    "https://telebirrappcube.ethiomobilemoney.et:38443/apiaccess/payment/gateway",
)
TELEBIRR_NOTIFY_URL = os.environ.get("TELEBIRR_NOTIFY_URL", "")
TELEBIRR_RETURN_URL = os.environ.get("TELEBIRR_RETURN_URL", "")
TELEBIRR_RETURN_REDIRECT_URL = os.environ.get(
    "TELEBIRR_RETURN_REDIRECT_URL", "/payments/status/",
)

# Loaded from files (not env) so PEM newlines survive.
def _read_pem(path: str) -> str:
    if not path:
        return ""
    with open(path, "r") as fh:
        return fh.read()

TELEBIRR_PUBLIC_KEY = _read_pem(os.environ.get("TELEBIRR_PUBLIC_KEY_PATH", ""))
TELEBIRR_PRIVATE_KEY = _read_pem(os.environ.get("TELEBIRR_PRIVATE_KEY_PATH", ""))

# Fail loud in production, silent in dev.
TELEBIRR_MODE = os.environ.get("TELEBIRR_MODE", "mock")  # "mock" | "live"
