from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime

class EvidenceBase(BaseModel):
    title: str
    description: Optional[str] = None

class EvidenceResponse(BaseModel):
    id: int
    title: str
    description: Optional[str]
    original_filename: str
    file_size: int
    file_type: Optional[str]
    file_hash: str
    nonce: str
    tag: str
    uploaded_at: datetime
    owner_id: int

    class Config:
        from_attributes = True

class EvidenceListResponse(BaseModel):
    total: int
    evidences: List[EvidenceResponse]

class IntegrityCheckResponse(BaseModel):
    evidence_id: int
    status: str
    is_valid: bool
    calculated_hash: str
    stored_hash: str
    message: str
