import base64
import os

from cryptography.fernet import Fernet, InvalidToken
from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.kdf.pbkdf2 import PBKDF2HMAC
from dotenv import load_dotenv
from sqlalchemy.types import Text, TypeDecorator

load_dotenv()

_RAW_KEY = os.getenv("DATABASE_KEY")
if not _RAW_KEY:
    raise RuntimeError("DATABASE_KEY is not set. Add it to your .env file.")

_SALT = os.getenv("DATABASE_SALT", "daily-scheduling-v1").encode("utf-8")
_KDF = PBKDF2HMAC(
    algorithm=hashes.SHA256(),
    length=32,
    salt=_SALT,
    iterations=390000,
)
_FERNET_KEY = base64.urlsafe_b64encode(_KDF.derive(_RAW_KEY.encode("utf-8")))
_FERNET = Fernet(_FERNET_KEY)
_PREFIX = "enc$"


def encrypt_text(value: str | None) -> str | None:
    if value is None:
        return None
    text = str(value)
    if text.startswith(_PREFIX):
        return text
    token = _FERNET.encrypt(text.encode("utf-8")).decode("utf-8")
    return f"{_PREFIX}{token}"


def decrypt_text(value: str | None) -> str | None:
    if value is None:
        return None
    text = str(value)
    if not text.startswith(_PREFIX):
        # Backward compatible with existing plaintext rows.
        return text
    token = text[len(_PREFIX) :]
    try:
        return _FERNET.decrypt(token.encode("utf-8")).decode("utf-8")
    except InvalidToken:
        # Do not crash the whole app on a bad row.
        return text


class EncryptedString(TypeDecorator):
    impl = Text
    cache_ok = True

    def process_bind_param(self, value, dialect):
        return encrypt_text(value)

    def process_result_value(self, value, dialect):
        return decrypt_text(value)
