# settings/dev.py
from .base import *  # noqa

DEBUG = True
TELEBIRR_MODE = "mock"

TELEBIRR_MERCHANT_APP_ID = "dev-merchant-app-id"
TELEBIRR_APP_SECRET = "dev-app-secret"
TELEBIRR_SHORT_CODE = "123456"
TELEBIRR_BASE_URL = "http://localhost:9000/mock-telebirr"  # or leave real URL

TELEBIRR_NOTIFY_URL = "http://localhost:8000/webhooks/telebirr/notify/"
TELEBIRR_RETURN_URL = "http://localhost:8000/webhooks/telebirr/return/"
TELEBIRR_RETURN_REDIRECT_URL = "/payments/status/"

TELEBIRR_PUBLIC_KEY_PATH = str(BASE_DIR / "secrets" / "telebirr_dev_public.pem")
TELEBIRR_PRIVATE_KEY_PATH = str(BASE_DIR / "secrets" / "telebirr_dev_private.pem")

def _read_pem(path):
	try:
		with open(path, encoding="utf-8") as pem_file:
			return pem_file.read()
	except FileNotFoundError:
		return ""


TELEBIRR_PUBLIC_KEY = _read_pem(TELEBIRR_PUBLIC_KEY_PATH)
TELEBIRR_PRIVATE_KEY = _read_pem(TELEBIRR_PRIVATE_KEY_PATH)