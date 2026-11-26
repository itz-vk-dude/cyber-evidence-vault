# Cyber Evidence Vault

A secure digital evidence storage and integrity verification platform built with FastAPI, React, Supabase (PostgreSQL), and AES-256-GCM encryption.

---

## Architecture & Security Model

- **Frontend**: React (Vite) + Tailwind CSS + Lucide Icons + Axios
- **Backend API**: Python FastAPI + SQLAlchemy
- **Database**: Supabase (PostgreSQL)
- **Authentication**: JWT tokens + Argon2id password hashing + TOTP (Google Authenticator 2FA)
- **Encryption**: AES-256-GCM authenticated encryption for uploaded files
- **Integrity**: SHA-256 cryptographic hashing to detect any file tampering

---

## Project Structure

```text
CYBER-EVIDENCE-VAULT/
├── backend/
│   ├── app/
│   │   ├── core/         # Settings and configurations
│   │   ├── database/     # DB connection and models
│   │   ├── routes/       # API endpoints (Auth, Evidence)
│   │   ├── schemas/      # Pydantic request/response schemas
│   │   ├── services/     # Business logic, OTP, Encryption
│   │   └── main.py       # FastAPI application entry point
│   ├── storage/
│   │   └── encrypted/    # Encrypted evidence files storage
│   ├── .env.example      # Environment variables template
│   └── requirements.txt  # Python backend dependencies
├── frontend/
│   ├── src/
│   │   ├── components/   # Navbar, Sidebar, Protected routes
│   │   ├── pages/        # Login, 2FA, Dashboard, Vault
│   │   ├── services/     # API client
│   │   └── App.jsx
│   ├── package.json
│   └── vite.config.js
└── README.md
```

---

## Setup & Running

### 1. Backend Setup
```bash
cd backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1   # On Windows PowerShell
pip install -r requirements.txt
cp .env.example .env          # Configure your DATABASE_URL, secrets in .env
python -m uvicorn app.main:app --reload --port 8000
```
- API Docs: `http://localhost:8000/docs`

### 2. Frontend Setup
```bash
cd frontend
npm install
npm run dev
```
- Web Application: `http://localhost:5173`
