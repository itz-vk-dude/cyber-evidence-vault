import os
import uuid
from typing import List, Tuple
from fastapi import UploadFile, HTTPException, status
from sqlalchemy.orm import Session
from app.database.models import Evidence, User
from app.core.encryption import encrypt_file_data, decrypt_file_data, calculate_sha256

STORAGE_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))), "storage", "encrypted")

def get_storage_path(stored_filename: str) -> str:
    os.makedirs(STORAGE_DIR, exist_ok=True)
    return os.path.join(STORAGE_DIR, stored_filename)

def upload_and_encrypt_evidence(
    db: Session,
    user: User,
    file: UploadFile,
    title: str,
    description: str = ""
) -> Evidence:
    """
    1. Read unencrypted file bytes.
    2. Compute SHA-256 integrity hash.
    3. Encrypt file bytes with AES-256-GCM.
    4. Store ciphertext safely on disk in storage/encrypted.
    5. Save metadata, hash, nonce, and tag in Supabase.
    """
    file_bytes = file.file.read()
    if not file_bytes:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Uploaded file is empty")

    file_size = len(file_bytes)
    original_hash = calculate_sha256(file_bytes)

    # Encrypt with AES-256-GCM
    ciphertext, nonce_hex, tag_hex = encrypt_file_data(file_bytes)

    # Secure unique storage name
    stored_filename = f"{uuid.uuid4().hex}.enc"
    storage_path = get_storage_path(stored_filename)

    with open(storage_path, "wb") as f:
        f.write(ciphertext)

    # Create evidence record in Supabase
    evidence = Evidence(
        title=title or file.filename,
        description=description,
        original_filename=file.filename or "unknown_evidence",
        stored_filename=stored_filename,
        file_size=file_size,
        file_type=file.content_type or "application/octet-stream",
        file_hash=original_hash,
        nonce=nonce_hex,
        tag=tag_hex,
        owner_id=user.id
    )
    db.add(evidence)
    db.commit()
    db.refresh(evidence)
    return evidence

def get_user_evidences(db: Session, user: User) -> List[Evidence]:
    """Retrieve all evidence records belonging to the authenticated vault owner."""
    return db.query(Evidence).filter(Evidence.owner_id == user.id).order_by(Evidence.uploaded_at.desc()).all()

def get_evidence_by_id(db: Session, user: User, evidence_id: int) -> Evidence:
    """Retrieve single evidence record."""
    evidence = db.query(Evidence).filter(Evidence.id == evidence_id, Evidence.owner_id == user.id).first()
    if not evidence:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Evidence item not found")
    return evidence

def decrypt_and_retrieve_evidence(db: Session, user: User, evidence_id: int) -> Tuple[bytes, str, str]:
    """
    1. Retrieve evidence metadata.
    2. Read ciphertext from disk.
    3. Decrypt using stored nonce & tag via AES-256-GCM.
    4. Verify SHA-256 integrity against the original hash stored in database.
    5. Return (decrypted_bytes, original_filename, file_type).
    """
    evidence = get_evidence_by_id(db, user, evidence_id)
    storage_path = get_storage_path(evidence.stored_filename)

    if not os.path.exists(storage_path):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Encrypted file not found on storage disk")

    with open(storage_path, "rb") as f:
        ciphertext = f.read()

    try:
        decrypted_bytes = decrypt_file_data(ciphertext, evidence.nonce, evidence.tag)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Decryption failed: Authentication tag verification failed. File may be corrupted or tampered with ({str(e)})"
        )

    # SHA-256 integrity verification
    calculated_hash = calculate_sha256(decrypted_bytes)
    if calculated_hash.lower() != evidence.file_hash.lower():
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="INTEGRITY BREACH DETECTED: Decrypted file SHA-256 hash does not match original stored record!"
        )

    return decrypted_bytes, evidence.original_filename, evidence.file_type or "application/octet-stream"

def verify_evidence_integrity(db: Session, user: User, evidence_id: int) -> dict:
    """Perform integrity check without downloading."""
    evidence = get_evidence_by_id(db, user, evidence_id)
    storage_path = get_storage_path(evidence.stored_filename)

    if not os.path.exists(storage_path):
        return {
            "evidence_id": evidence_id,
            "status": "FILE_MISSING",
            "is_valid": False,
            "calculated_hash": "",
            "stored_hash": evidence.file_hash,
            "message": "Storage file missing from disk"
        }

    with open(storage_path, "rb") as f:
        ciphertext = f.read()

    try:
        decrypted_bytes = decrypt_file_data(ciphertext, evidence.nonce, evidence.tag)
        calculated_hash = calculate_sha256(decrypted_bytes)
        is_valid = (calculated_hash.lower() == evidence.file_hash.lower())
        return {
            "evidence_id": evidence_id,
            "status": "VERIFIED" if is_valid else "CORRUPTED",
            "is_valid": is_valid,
            "calculated_hash": calculated_hash,
            "stored_hash": evidence.file_hash,
            "message": "AES-256-GCM auth tag and SHA-256 integrity hash verified successfully!" if is_valid else "Hash mismatch: Data integrity check failed!"
        }
    except Exception as e:
        return {
            "evidence_id": evidence_id,
            "status": "TAMPERED",
            "is_valid": False,
            "calculated_hash": "",
            "stored_hash": evidence.file_hash,
            "message": f"Tampering detected: GCM authentication tag mismatch ({str(e)})"
        }

def delete_evidence_item(db: Session, user: User, evidence_id: int) -> bool:
    """Delete evidence from database and wipe encrypted file from disk."""
    evidence = get_evidence_by_id(db, user, evidence_id)
    storage_path = get_storage_path(evidence.stored_filename)

    if os.path.exists(storage_path):
        try:
            os.remove(storage_path)
        except OSError:
            pass

    db.delete(evidence)
    db.commit()
    return True
