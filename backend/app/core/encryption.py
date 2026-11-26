import os
import base64
import hashlib
from typing import Tuple
from cryptography.hazmat.primitives.ciphers.aead import AESGCM
from app.core.config import settings

def get_encryption_key() -> bytes:
    """Decode and validate the 32-byte (256-bit) AES key from base64."""
    key = base64.b64decode(settings.ENCRYPTION_KEY)
    if len(key) != 32:
        raise ValueError(f"AES-256 key must be 32 bytes (got {len(key)} bytes)")
    return key

def calculate_sha256(data: bytes) -> str:
    """Calculate SHA-256 hex digest for data integrity verification."""
    sha = hashlib.sha256()
    sha.update(data)
    return sha.hexdigest()

def encrypt_file_data(plaintext: bytes) -> Tuple[bytes, str, str]:
    """
    Encrypt plaintext bytes using AES-256-GCM.
    Returns:
        (ciphertext, nonce_hex, tag_hex)
    Note: AESGCM in cryptography package returns ciphertext + 16-byte tag appended.
    We split them or keep them for explicit auditability.
    """
    key = get_encryption_key()
    aesgcm = AESGCM(key)
    # 96-bit (12 bytes) standard recommended nonce for AES-GCM
    nonce = os.urandom(12)
    # aesgcm.encrypt produces ciphertext with 16-byte authentication tag appended at the end
    encrypted = aesgcm.encrypt(nonce, plaintext, None)
    tag = encrypted[-16:]
    raw_ciphertext = encrypted[:-16]

    return raw_ciphertext, nonce.hex(), tag.hex()

def decrypt_file_data(ciphertext: bytes, nonce_hex: str, tag_hex: str) -> bytes:
    """
    Decrypt ciphertext using AES-256-GCM and verify authentication tag.
    Raises Exception if tag does not match (tampering detected).
    """
    key = get_encryption_key()
    aesgcm = AESGCM(key)
    nonce = bytes.fromhex(nonce_hex)
    tag = bytes.fromhex(tag_hex)
    # Reassemble ciphertext + tag for AESGCM decrypt
    combined = ciphertext + tag
    return aesgcm.decrypt(nonce, combined, None)
