# 🔐 Cyber Evidence Vault

> **Secure Digital Forensics Evidence Storage Platform**  
> AES-256-GCM encryption · SHA-256 integrity ledger · Email 2FA OTP · Supabase PostgreSQL

---

## Table of Contents

1. [Overview](#overview)
2. [Features](#features)
3. [Tech Stack](#tech-stack)
4. [Project Structure](#project-structure)
5. [Prerequisites](#prerequisites)
6. [Environment Setup](#environment-setup)
7. [Backend Setup](#backend-setup)
8. [Frontend Setup](#frontend-setup)
9. [Running the Project](#running-the-project)
10. [Application Walkthrough](#application-walkthrough)
11. [API Reference](#api-reference)
12. [Security Architecture](#security-architecture)
13. [File Upload Details](#file-upload-details)
14. [Troubleshooting](#troubleshooting)

---

## Overview

Cyber Evidence Vault is a full-stack digital forensics platform that lets authorized users securely upload, encrypt, and manage digital evidence files. Every file is encrypted at rest using **AES-256-GCM** before being saved to disk. The platform enforces **Email OTP two-factor authentication** on every login and registration, and records **SHA-256 integrity hashes** so forensic authenticity can be cryptographically verified at any time.

---

## Features

| Feature | Detail |
|---|---|
| **Email OTP 2FA** | 6-digit code sent via Brevo API to any Gmail / email on every login & registration |
| **AES-256-GCM Encryption** | Every file encrypted with unique 96-bit nonce before storage |
| **SHA-256 Integrity Hash** | Hash stored at upload time; real-time cryptographic re-verification on demand |
| **GCM Auth Tag** | AESGCM authentication tag stored; any tampering is detected instantly |
| **User Registration** | Self-registration with username, email, password + email OTP confirmation |
| **Single File Upload** | Upload any file type with title, notes, and optional case group |
| **Multi-File Upload** | Upload multiple files in one session, each with its own metadata |
| **Folder Upload** | Entire folder auto-zipped client-side with JSZip then uploaded as a `.zip` |
| **Case / Group Tagging** | Assign a Case Name to group related evidence items in the vault |
| **Grouped Vault View** | Evidence organised by Case Name in collapsible sections |
| **In-Browser Preview** | Images (with zoom), video, audio, PDF, text, CSV table, XLSX table |
| **Decrypt & Download** | On-demand AES-256-GCM decryption; original file streamed back |
| **Integrity Verify** | One-click re-decrypt + SHA-256 re-hash + GCM tag check |
| **Secure Purge** | Delete removes both encrypted file on disk and DB metadata |
| **User Isolation** | Each user sees only their own evidence (`owner_id` scoped) |
| **JWT Auth** | 15-minute access tokens; all vault routes protected |
| **Supabase PostgreSQL** | Hosted, managed database; no local DB required |
| **Interactive API Docs** | FastAPI auto-generates Swagger UI at `/docs` |

---

## Tech Stack

### Backend
| Package | Purpose |
|---|---|
| **FastAPI** | REST API framework |
| **Uvicorn** | ASGI server |
| **SQLAlchemy** | ORM for PostgreSQL |
| **psycopg2-binary** | PostgreSQL driver |
| **Pydantic-Settings** | Settings management via `.env` |
| **PyJWT** | JWT token creation & validation |
| **argon2-cffi** | Password hashing (Argon2id) |
| **cryptography** | AES-256-GCM encryption/decryption |
| **pyotp** | TOTP/OTP generation |
| **httpx** | Async HTTP client for Brevo/Resend API calls |
| **python-multipart** | Multipart form/file upload parsing |
| **email-validator** | Email format validation |
| **python-dotenv** | `.env` file loading |

### Frontend
| Package | Purpose |
|---|---|
| **React 19** | UI framework |
| **Vite 8** | Build tool & dev server |
| **Tailwind CSS 4** | Utility-first styling |
| **React Router 7** | Client-side routing |
| **Axios** | HTTP client for API calls |
| **Lucide React** | Icon library |
| **JSZip** | Client-side folder → ZIP compression |
| **xlsx (SheetJS)** | Parse CSV/XLSX files for in-browser table preview |

### Services
| Service | Purpose |
|---|---|
| **Supabase** | Hosted PostgreSQL database |
| **Brevo (Sendinblue)** | Email OTP delivery — sends to **any** Gmail/email |
| **Resend** | Fallback email provider (free tier: own email only) |

---

## Project Structure

```
cyber_evidence_vault/
├── backend/
│   ├── app/
│   │   ├── core/
│   │   │   ├── config.py          # Settings from .env (Pydantic-Settings)
│   │   │   ├── encryption.py      # AES-256-GCM encrypt / decrypt helpers
│   │   │   └── security.py        # JWT create / decode, password hash/verify
│   │   ├── database/
│   │   │   ├── connection.py      # SQLAlchemy engine + session factory
│   │   │   └── models.py          # User & Evidence ORM models
│   │   ├── routes/
│   │   │   ├── auth_routes.py     # /api/auth/* endpoints
│   │   │   └── evidence_routes.py # /api/evidence/* endpoints
│   │   ├── schemas/
│   │   │   ├── auth_schema.py     # Request/response Pydantic models for auth
│   │   │   └── evidence_schema.py # Request/response Pydantic models for evidence
│   │   ├── services/
│   │   │   ├── auth_service.py    # Registration, login, OTP verify, JWT
│   │   │   ├── email_service.py   # Brevo → Resend → SMTP email OTP dispatch
│   │   │   ├── evidence_service.py# Upload/encrypt, decrypt, verify, delete
│   │   │   └── otp_service.py     # OTP code generation and validation
│   │   ├── __init__.py
│   │   └── main.py                # FastAPI app, CORS, lifespan startup
│   ├── storage/
│   │   └── encrypted/             # AES-256-GCM encrypted files stored here
│   ├── .env                       # 🔴 Secret — do NOT commit
│   ├── .gitignore
│   └── requirements.txt
│
├── frontend/
│   ├── src/
│   │   ├── assets/                # Static images
│   │   ├── components/
│   │   │   ├── Navbar.jsx         # Top navigation bar
│   │   │   └── ProtectedRoute.jsx # JWT-guard wrapper
│   │   ├── pages/
│   │   │   ├── Login.jsx          # Login form (username or email)
│   │   │   ├── Register.jsx       # New user registration form
│   │   │   ├── OTPVerification.jsx# Email OTP entry page
│   │   │   ├── Dashboard.jsx      # Post-login home / stats
│   │   │   ├── UploadEvidence.jsx # Single / Multi / Folder upload
│   │   │   └── EvidenceVault.jsx  # Grouped vault with preview modal
│   │   ├── services/
│   │   │   └── api.js             # Axios API client (authService, evidenceService)
│   │   ├── App.jsx                # Router + route declarations
│   │   └── main.jsx               # React entry point
│   ├── public/
│   ├── index.html
│   ├── vite.config.js
│   └── package.json
│
├── .gitignore
└── README.md
```

---

## Prerequisites

Make sure the following are installed on your machine before starting:

| Tool | Minimum Version | Download |
|---|---|---|
| **Python** | 3.10+ | https://www.python.org/downloads/ |
| **Node.js** | 18+ | https://nodejs.org/ |
| **npm** | 9+ | Comes with Node.js |
| **Git** | any | https://git-scm.com/ |

You also need accounts on:

| Service | Required for | Free tier |
|---|---|---|
| **Supabase** | PostgreSQL database | ✅ Yes |
| **Brevo (Sendinblue)** | Sending OTP emails to any address | ✅ Yes (300 emails/day) |

---

## Environment Setup

### 1. Clone the Repository

```bash
git clone https://github.com/your-username/cyber-evidence-vault.git
cd cyber_evidence_vault
```

---

### 2. Supabase Database Setup

1. Go to [supabase.com](https://supabase.com) → **New Project**
2. Note down:
   - **Project URL** (e.g. `db.xxxxxxxxxxxx.supabase.co`)
   - **Database Password** (set during project creation)
3. In Supabase → **SQL Editor**, run:

```sql
-- Add group_name column if not already present
ALTER TABLE evidences ADD COLUMN IF NOT EXISTS group_name VARCHAR(255);
```

> The `users` and `evidences` tables are **auto-created** by SQLAlchemy on first backend startup. You only need to run the `ALTER TABLE` for `group_name` if the app was set up before that feature was added.

---

### 3. Brevo API Key Setup

1. Go to [brevo.com](https://app.brevo.com) → Sign up / Log in
2. Navigate to **My Account → SMTP & API → API Keys**
3. Click **Generate a new API key** → copy the key
4. In **Senders & IP** → add your Gmail address as a **verified sender**
5. Use this API key as `BREVO_API_KEY` in your `.env`

> **Why Brevo?** Unlike Resend (which restricts free-tier sends to your own email), Brevo can send OTP emails to **any Gmail or email address** without domain verification.

---

### 4. Generate an AES-256 Encryption Key

Run this once to generate your 32-byte base64-encoded key:

```bash
python -c "import os, base64; print(base64.b64encode(os.urandom(32)).decode())"
```

Copy the output — this is your `ENCRYPTION_KEY`.

> ⚠️ **Never change this key after uploading evidence.** Doing so makes all previously encrypted files unrecoverable.

---

### 5. Create Backend `.env`

Create the file `backend/.env` with the following content:

```env
# ── Application ──────────────────────────────────────────────────
APP_NAME=Cyber Evidence Vault
APP_ENV=development

# ── Database (Supabase PostgreSQL) ───────────────────────────────
DATABASE_URL=postgresql+psycopg2://postgres:<YOUR_DB_PASSWORD>@db.<YOUR_PROJECT_REF>.supabase.co:5432/postgres?sslmode=require

# ── JWT Authentication ────────────────────────────────────────────
JWT_SECRET_KEY=<generate a long random hex string, e.g. openssl rand -hex 32>
JWT_ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=15

# ── AES-256-GCM File Encryption ──────────────────────────────────
ENCRYPTION_KEY=<your base64-encoded 32-byte key from step 4>

# ── Admin / Vault Owner Account ──────────────────────────────────
ADMIN_USERNAME=admin
ADMIN_EMAIL=your-email@gmail.com
ADMIN_PASSWORD=YourSecurePassword123!

# ── Frontend URL (for CORS) ───────────────────────────────────────
FRONTEND_URL=http://localhost:5173

# ── Brevo Email API (Primary — sends to ANY email) ───────────────
BREVO_API_KEY=xkeysib-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
BREVO_SENDER_EMAIL=your-verified-sender@gmail.com
BREVO_SENDER_NAME=Cyber Evidence Vault

# ── Resend API (Fallback — free tier: own email only) ────────────
RESEND_API_KEY=re_xxxxxxxxxxxxxxxxxxxx

# ── SMTP (Second Fallback — optional) ────────────────────────────
SMTP_HOST=
SMTP_PORT=587
SMTP_USER=
SMTP_PASSWORD=
SMTP_FROM_EMAIL=
```

---

## Backend Setup

```bash
# 1. Enter the backend directory
cd backend

# 2. Create a Python virtual environment
python -m venv .venv

# 3. Activate the virtual environment
# Windows (PowerShell):
.\.venv\Scripts\Activate.ps1

# macOS / Linux:
source .venv/bin/activate

# 4. Install all Python dependencies
pip install -r requirements.txt

# 5. Verify the .env file exists
#    backend/.env  ← must have all keys from the section above
```

---

## Frontend Setup

```bash
# 1. Enter the frontend directory
cd frontend

# 2. Install all Node.js dependencies
npm install

# This installs: React, Vite, Tailwind CSS, Axios,
# React Router, Lucide React, JSZip, xlsx (SheetJS)
```

---

## Running the Project

You need **two terminals** running simultaneously.

### Terminal 1 — Start the Backend

```bash
cd backend

# Activate virtual environment (Windows PowerShell)
.\.venv\Scripts\Activate.ps1

# Start FastAPI with hot-reload
python -m uvicorn app.main:app --reload --port 8000
```

**Backend is running at:** `http://localhost:8000`  
**Interactive API Docs:** `http://localhost:8000/docs`

On first startup the server will:
- Auto-create `users` and `evidences` tables in Supabase
- Create the admin vault owner account from your `.env`
- Print the admin credentials to the terminal

---

### Terminal 2 — Start the Frontend

```bash
cd frontend
npm run dev
```

**Frontend is running at:** `http://localhost:5173`

---

## Application Walkthrough

### Pages & Routes

| URL | Page | Access |
|---|---|---|
| `/login` | Login with username or email + password | Public |
| `/register` | Create a new account | Public |
| `/verify-otp` | Enter 6-digit email OTP | Public (after login/register) |
| `/dashboard` | Home page after login | 🔒 Protected |
| `/upload` | Upload evidence files | 🔒 Protected |
| `/vault` | Browse & manage evidence | 🔒 Protected |

---

### Authentication Flow

```
User fills login form
       ↓
POST /api/auth/login  (username + password)
       ↓
Backend verifies Argon2id password hash
       ↓
Brevo API sends 6-digit OTP to user's email
       ↓
Temporary JWT token returned (type: 2fa_pending)
       ↓
User enters OTP at /verify-otp
       ↓
POST /api/auth/verify-otp  (temp_token + otp_code)
       ↓
Backend verifies OTP (5-minute expiry)
       ↓
Full access JWT (15-minute) returned
       ↓
User lands on /dashboard
```

> **OTP always printed to backend terminal** as a fallback, even if email fails.

---

### Upload Evidence — 3 Modes

Navigate to `/upload` after logging in:

| Tab | What it does |
|---|---|
| **Single File** | Pick one file, set title + notes |
| **Multiple Files** | Pick many files; each gets its own title/notes row |
| **Folder** | Pick an entire folder; JSZip compresses it client-side into a `.zip` before upload |

All modes support an optional **Case / Group Name** field that groups the evidence in the vault.

---

### Evidence Vault — `/vault`

- Evidence is **grouped by Case Name** in collapsible sections
- **Uncategorized** items appear at the bottom
- Each card shows: filename, file type icon, size, upload date, group badge, SHA-256 hash, AES nonce, GCM auth tag

**Actions per evidence item:**

| Button | Action |
|---|---|
| **Preview** | Decrypt in-browser and show inline preview |
| **Verify Integrity** | Re-decrypt, re-hash, compare SHA-256 + GCM tag |
| **Decrypt & Download** | Decrypt and download original file |
| 🗑️ | Permanently delete from vault and storage |

**Preview supports:**

| File Type | Preview |
|---|---|
| Images (PNG, JPG, GIF, WebP, SVG…) | Full image with zoom in/out controls |
| Video (MP4, WebM, OGG…) | HTML5 video player |
| Audio (MP3, WAV, FLAC…) | HTML5 audio player |
| PDF | Embedded iframe viewer |
| Text / JSON / XML / MD / LOG | Scrollable code block |
| CSV | Paginated spreadsheet table (50 rows/page) |
| XLSX / XLS | SheetJS parsed → paginated spreadsheet table |
| ZIP / folder archives | Info message + download prompt |

---

## API Reference

### Authentication — `/api/auth`

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `POST` | `/api/auth/register` | None | Register new user; sends email OTP |
| `POST` | `/api/auth/login` | None | Step 1: verify password; sends email OTP |
| `POST` | `/api/auth/resend-otp` | None | Resend a fresh OTP code |
| `POST` | `/api/auth/verify-otp` | None | Step 2: submit OTP → get full JWT |
| `GET`  | `/api/auth/me` | Bearer JWT | Get current user profile |

### Evidence Vault — `/api/evidence`

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `POST` | `/api/evidence/upload` | Bearer JWT | Encrypt and upload a file |
| `GET`  | `/api/evidence` | Bearer JWT | List all your evidence items |
| `GET`  | `/api/evidence/{id}` | Bearer JWT | Get metadata for one item |
| `GET`  | `/api/evidence/{id}/verify` | Bearer JWT | Cryptographic integrity check |
| `GET`  | `/api/evidence/{id}/download` | Bearer JWT | Decrypt and download file |
| `DELETE` | `/api/evidence/{id}` | Bearer JWT | Permanently delete evidence |

### Upload Form Fields

```
POST /api/evidence/upload
Content-Type: multipart/form-data

file        (required) — the file binary
title       (required) — human-readable label
description (optional) — case notes
group_name  (optional) — case/group name for grouping in vault
```

### System

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/` | API welcome message |
| `GET` | `/health` | Health check |
| `GET` | `/docs` | Swagger interactive API docs |

---

## Security Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    USER BROWSER                             │
│  Login → Email OTP → JWT token stored in localStorage      │
│  Upload → File read in browser → sent to backend           │
│  Preview → Decrypt API call → objectURL in memory only     │
└──────────────────────────┬──────────────────────────────────┘
                           │ HTTPS (JWT Bearer token)
┌──────────────────────────▼──────────────────────────────────┐
│                   FASTAPI BACKEND                           │
│                                                             │
│  1. JWT verified on every protected request                 │
│  2. owner_id check — users only see their own evidence      │
│  3. Upload:                                                 │
│     a. Read file bytes                                      │
│     b. SHA-256(plaintext) → store as file_hash              │
│     c. AES-256-GCM encrypt:                                 │
│        - Random 96-bit nonce generated per file             │
│        - AESGCM.encrypt(nonce, plaintext) → ciphertext+tag  │
│        - nonce_hex + tag_hex stored in DB                   │
│        - ciphertext saved to disk                           │
│  4. Download/Preview:                                       │
│     a. Load ciphertext from disk                            │
│     b. AESGCM.decrypt(nonce, ciphertext+tag) → plaintext    │
│        (raises InvalidTag if tampered)                      │
│     c. SHA-256(plaintext) compared to stored hash           │
│     d. Original bytes streamed back                         │
└──────────────────────────┬──────────────────────────────────┘
                           │ psycopg2 / SSL
┌──────────────────────────▼──────────────────────────────────┐
│              SUPABASE POSTGRESQL                            │
│  users table:    id, username, email, password_hash, …     │
│  evidences table: id, owner_id, title, file_hash,          │
│                   nonce, tag, encrypted_filename,           │
│                   file_size, file_type, group_name, …      │
└─────────────────────────────────────────────────────────────┘
              Encrypted files on disk:
              backend/storage/encrypted/<uuid>.enc
```

### Key Security Decisions

| Decision | Reason |
|---|---|
| **AES-256-GCM** (not AES-CBC) | Authenticated encryption — detects tampering via GCM auth tag |
| **Random nonce per file** | Prevents nonce reuse attacks |
| **SHA-256 stored separately** | Independent integrity check on top of GCM auth tag |
| **Argon2id password hashing** | Memory-hard; resists GPU brute-force |
| **Email OTP on every login** | Even if password is stolen, attacker can't get in without email access |
| **15-minute JWT expiry** | Short-lived tokens limit stolen-token blast radius |
| **owner_id isolation** | No user can access another user's evidence, even with a valid token |
| **In-browser-only preview** | Decrypted bytes exist only in memory, never cached to disk |

---

## File Upload Details

### Single & Multi-File
- Files are sent as `multipart/form-data`
- Each file is a separate API call
- Per-file: title, description (notes), group_name
- Progress tracked per file in the UI

### Folder Upload
- Browser opens folder picker via `webkitdirectory` attribute (Chrome/Edge/Firefox)
- All files inside the folder are compressed client-side using **JSZip**
- The resulting `.zip` is uploaded as a single evidence item
- Folder name used as the zip filename (e.g. `MyCase_folder.zip`)

### Supported File Types (upload any file — preview support varies)
```
Images:  PNG, JPG, JPEG, GIF, WebP, BMP, SVG, ICO
Video:   MP4, WebM, OGG, MOV, AVI
Audio:   MP3, WAV, OGG, FLAC, M4A
Docs:    PDF
Text:    TXT, LOG, JSON, XML, MD
Data:    CSV, XLS, XLSX, XLSM, XLSB
Archive: ZIP, GZ, TAR, 7Z, RAR (folder uploads become ZIP)
Other:   Any binary file — stored encrypted, downloaded on demand
```

---

## Troubleshooting

### Backend won't start — `ModuleNotFoundError: No module named 'app'`

Run from inside the `backend/` directory with the venv active:

```bash
cd backend
.\.venv\Scripts\Activate.ps1
python -m uvicorn app.main:app --reload --port 8000
```

Do **not** run from the root `cyber_evidence_vault/` directory.

---

### OTP email not received

1. Check the **backend terminal** — the OTP code is always printed there as a fallback
2. Verify `BREVO_API_KEY` is set correctly in `backend/.env`
3. Confirm `BREVO_SENDER_EMAIL` is a verified sender in your Brevo dashboard
4. Check spam/junk folder
5. Brevo free tier allows 300 emails/day — check your quota

---

### `422 Unprocessable Entity` on login

The login endpoint expects JSON body:
```json
{ "username": "admin", "password": "YourPassword" }
```
Username field accepts both username string and email address.

---

### `401 Unauthorized` on API calls

- JWT token has expired (15-minute TTL) — log in again
- Token not being sent — check `Authorization: Bearer <token>` header
- Wrong credentials during login

---

### Folder upload not working (file picker opens instead of folder picker)

- Must use **Chrome, Edge, or Firefox** (Safari has limited support for `webkitdirectory`)
- Make sure you are on the **Folder** tab on the upload page
- The folder input uses a DOM `setAttribute` trick — if it reverts, hard refresh (`Ctrl+Shift+R`)

---

### Encrypted file cannot be decrypted — `InvalidTag`

This means the stored ciphertext was modified after encryption. Possible causes:
- Manual editing of files in `backend/storage/encrypted/`
- Disk corruption
- The `ENCRYPTION_KEY` in `.env` was changed after upload

> ⚠️ **Never change `ENCRYPTION_KEY` after uploading any files.** All previously encrypted evidence becomes permanently unrecoverable.

---

### Database tables don't exist

SQLAlchemy creates them automatically on startup. If they are missing:

1. Confirm `DATABASE_URL` in `.env` is correct (Supabase connection string with `?sslmode=require`)
2. Restart the backend — watch the startup logs for errors
3. As a last resort, check Supabase → Table Editor and create them manually using the SQL Editor

---

### CORS errors in browser console

Ensure the backend is running on port `8000` and frontend on port `5173`. The backend `main.py` already allows both. If you change either port, update `FRONTEND_URL` in `backend/.env` and restart the backend.

---

## Default Admin Account

On first backend startup, an admin account is created from your `.env` values:

| Field | Value from `.env` |
|---|---|
| Username | `ADMIN_USERNAME` |
| Email | `ADMIN_EMAIL` |
| Password | `ADMIN_PASSWORD` |

Change these to strong values before deploying. The admin account is the **sole vault owner** — additional accounts registered via `/register` are regular vault users.

---

## Development Commands

```bash
# Backend — activate venv and start dev server
cd backend
.\.venv\Scripts\Activate.ps1          # Windows
python -m uvicorn app.main:app --reload --port 8000

# Frontend — dev server with hot reload
cd frontend
npm run dev

# Frontend — production build (output to frontend/dist/)
cd frontend
npm run build

# Frontend — preview production build locally
cd frontend
npm run preview

# Install a new Python package
cd backend
pip install <package>
pip freeze > requirements.txt          # update requirements

# Install a new frontend package
cd frontend
npm install <package>
```

---

## License

This project is for educational and research purposes in digital forensics and cybersecurity.

---

*Built with FastAPI · React · Supabase · AES-256-GCM · Brevo*
