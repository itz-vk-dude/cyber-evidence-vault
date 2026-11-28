from io import BytesIO
from typing import List, Optional
from fastapi import APIRouter, Depends, UploadFile, File, Form, HTTPException, status
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from app.database.connection import get_db
from app.database.models import User
from app.schemas.evidence_schema import EvidenceResponse, EvidenceListResponse, IntegrityCheckResponse
from app.services.auth_service import get_current_user
from app.services.evidence_service import (
    upload_and_encrypt_evidence,
    get_user_evidences,
    get_evidence_by_id,
    decrypt_and_retrieve_evidence,
    verify_evidence_integrity,
    delete_evidence_item
)

router = APIRouter(prefix="/api/evidence", tags=["Evidence Vault"])

@router.post("/upload", response_model=EvidenceResponse)
async def upload_evidence(
    file: UploadFile = File(...),
    title: str = Form(...),
    description: Optional[str] = Form(""),
    group_name: Optional[str] = Form(None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Encrypt evidence file using AES-256-GCM, record SHA-256 integrity hash,
    and persist encrypted payload to vault storage.
    """
    evidence = upload_and_encrypt_evidence(
        db=db,
        user=current_user,
        file=file,
        title=title,
        description=description or "",
        group_name=group_name or None
    )
    return EvidenceResponse.model_validate(evidence)

@router.get("", response_model=List[EvidenceResponse])
def list_evidences(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """List all encrypted evidence items held in the vault."""
    evidences = get_user_evidences(db, current_user)
    return [EvidenceResponse.model_validate(e) for e in evidences]

@router.get("/{evidence_id}", response_model=EvidenceResponse)
def get_evidence(
    evidence_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Retrieve metadata for a specific evidence item."""
    evidence = get_evidence_by_id(db, current_user, evidence_id)
    return EvidenceResponse.model_validate(evidence)

@router.get("/{evidence_id}/verify", response_model=IntegrityCheckResponse)
def check_integrity(
    evidence_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Perform a real-time cryptographic integrity verification.
    Decrypts with AES-256-GCM, checks authentication tag, and validates SHA-256 digest.
    """
    result = verify_evidence_integrity(db, current_user, evidence_id)
    return IntegrityCheckResponse(**result)

@router.get("/{evidence_id}/download")
def download_evidence(
    evidence_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Decrypts the requested evidence on-the-fly and returns the original file.
    Enforces authentication tag check and SHA-256 integrity.
    """
    decrypted_bytes, filename, file_type = decrypt_and_retrieve_evidence(db, current_user, evidence_id)

    stream = BytesIO(decrypted_bytes)
    return StreamingResponse(
        stream,
        media_type=file_type,
        headers={
            "Content-Disposition": f'attachment; filename="{filename}"',
            "Content-Length": str(len(decrypted_bytes))
        }
    )

@router.delete("/{evidence_id}")
def delete_evidence(
    evidence_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Securely purge evidence file from encrypted storage and delete metadata."""
    delete_evidence_item(db, current_user, evidence_id)
    return {"message": f"Evidence {evidence_id} securely deleted from vault"}
