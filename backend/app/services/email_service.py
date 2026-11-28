import smtplib
import secrets
import httpx
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from datetime import datetime, timedelta
from typing import Optional
from app.core.config import settings

# In-memory store for active email OTP codes: user_id -> {code, expires_at, email, attempts}
_EMAIL_OTP_STORE: dict[int, dict] = {}

def mask_email(email: str) -> str:
    """Mask email for display, e.g. user@example.com -> u***r@example.com."""
    try:
        if not email or "@" not in email:
            return email
        parts = email.split("@")
        if len(parts) != 2:
            return email
        name, domain = parts
        if len(name) <= 2:
            masked_name = name[0] + "***"
        else:
            masked_name = name[0] + "***" + name[-1]
        return f"{masked_name}@{domain}"
    except Exception:
        return email

def generate_email_otp(user_id: int, user_email: str) -> str:
    """Generate a 6-digit numeric OTP, save it with a 10-minute expiry, and dispatch."""
    code = f"{secrets.randbelow(900000) + 100000}"
    expires_at = datetime.utcnow() + timedelta(minutes=10)

    _EMAIL_OTP_STORE[user_id] = {
        "code": code,
        "expires_at": expires_at,
        "email": user_email,
        "attempts": 0
    }

    send_email_otp(user_email, code)
    return code

def verify_email_otp(user_id: int, submitted_code: str) -> tuple[bool, str]:
    """
    Verify submitted 6-digit code for the user.
    Returns (is_valid, error_message).
    """
    entry = _EMAIL_OTP_STORE.get(user_id)
    if not entry:
        return False, "No active verification code found. Please request a new code."

    # Check expiration
    if datetime.utcnow() > entry["expires_at"]:
        _EMAIL_OTP_STORE.pop(user_id, None)
        return False, "Verification code has expired. Please request a new code."

    # Rate limiting on incorrect attempts
    if entry["attempts"] >= 5:
        _EMAIL_OTP_STORE.pop(user_id, None)
        return False, "Too many failed attempts. Please request a new code."

    clean_code = str(submitted_code).strip().replace(" ", "").replace("-", "")

    if clean_code == entry["code"]:
        # Invalidate code on success
        _EMAIL_OTP_STORE.pop(user_id, None)
        return True, ""

    entry["attempts"] += 1
    remaining = 5 - entry["attempts"]
    return False, f"Invalid 6-digit code. {remaining} attempt(s) remaining."

def _send_via_brevo(to_email: str, code: str, html_content: str) -> bool:
    """
    Send email using Brevo (Sendinblue) Transactional Email API.
    Can deliver to ANY recipient email (Gmail, Outlook, Yahoo, etc.).
    """
    if not settings.BREVO_API_KEY:
        return False

    url = "https://api.brevo.com/v3/smtp/email"
    headers = {
        "accept": "application/json",
        "api-key": settings.BREVO_API_KEY,
        "content-type": "application/json"
    }

    sender_email = settings.BREVO_SENDER_EMAIL or settings.ADMIN_EMAIL or "vasanthakumar17032005@gmail.com"
    sender_name = settings.BREVO_SENDER_NAME or settings.APP_NAME

    payload = {
        "sender": {
            "name": sender_name,
            "email": sender_email
        },
        "to": [
            {
                "email": to_email,
                "name": to_email.split("@")[0]
            }
        ],
        "subject": f"[{settings.APP_NAME}] Your 6-Digit Verification Code: {code}",
        "htmlContent": html_content
    }

    try:
        with httpx.Client(timeout=10) as client:
            res = client.post(url, headers=headers, json=payload)
            if res.status_code in (200, 201):
                print(f"✅ Successfully sent verification email via Brevo to {to_email}")
                return True
            else:
                print(f"⚠️ Brevo API responded with {res.status_code}: {res.text}")
                return False
    except Exception as e:
        print(f"⚠️ Failed to send via Brevo API: {e}")
        return False

def _send_via_resend(to_email: str, code: str, html_content: str) -> bool:
    """Send email using the Resend API (fallback)."""
    if not settings.RESEND_API_KEY:
        return False

    url = "https://api.resend.com/emails"
    headers = {
        "Authorization": f"Bearer {settings.RESEND_API_KEY}",
        "Content-Type": "application/json"
    }
    payload = {
        "from": settings.RESEND_FROM_EMAIL,
        "to": [to_email],
        "subject": f"[{settings.APP_NAME}] Your 6-Digit Verification Code: {code}",
        "html": html_content
    }

    try:
        with httpx.Client(timeout=10) as client:
            res = client.post(url, headers=headers, json=payload)
            if res.status_code in (200, 201):
                print(f"✅ Successfully sent verification email via Resend to {to_email}")
                return True
            else:
                print(f"⚠️ Resend API responded with {res.status_code}: {res.text}")
                return False
    except Exception as e:
        print(f"⚠️ Failed to send via Resend API: {e}")
        return False

def _send_via_smtp(to_email: str, code: str, html_content: str) -> bool:
    """Fallback to standard SMTP if configured."""
    if not (settings.SMTP_HOST and settings.SMTP_USER and settings.SMTP_PASSWORD):
        return False

    try:
        msg = MIMEMultipart("alternative")
        msg["Subject"] = f"[{settings.APP_NAME}] Your 6-Digit Verification Code: {code}"
        msg["From"] = settings.SMTP_FROM_EMAIL
        msg["To"] = to_email

        part_text = MIMEText(f"Your verification code is: {code}. It expires in 10 minutes.", "plain")
        part_html = MIMEText(html_content, "html")
        msg.attach(part_text)
        msg.attach(part_html)

        if settings.SMTP_TLS:
            with smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT, timeout=10) as server:
                server.starttls()
                server.login(settings.SMTP_USER, settings.SMTP_PASSWORD)
                server.sendmail(settings.SMTP_FROM_EMAIL, [to_email], msg.as_string())
        else:
            with smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT, timeout=10) as server:
                server.login(settings.SMTP_USER, settings.SMTP_PASSWORD)
                server.sendmail(settings.SMTP_FROM_EMAIL, [to_email], msg.as_string())

        print(f"✅ Successfully sent verification email via SMTP to {to_email}")
        return True
    except Exception as e:
        print(f"⚠️ SMTP delivery error: {e}")
        return False

def send_email_otp(to_email: str, code: str):
    """
    Deliver the OTP code via Brevo API (can send to ANY Gmail/email address),
    with Resend and SMTP fallbacks.
    Always displays the code in the server terminal for instant access.
    """
    # Console notification banner
    print("\n" + "=" * 65)
    print(f"📧 [CYBER EVIDENCE VAULT - EMAIL 2FA VERIFICATION CODE]")
    print(f"   Recipient:    {to_email}")
    print(f"   6-DIGIT CODE: >>>  {code}  <<<")
    print(f"   Valid for:    10 minutes")
    print("=" * 65 + "\n")

    html_content = f"""
    <div style="font-family: Arial, sans-serif; background-color: #070b14; color: #f1f5f9; padding: 30px; border-radius: 10px; max-width: 500px; margin: auto;">
        <div style="text-align: center; margin-bottom: 20px;">
            <h2 style="color: #06b6d4; margin: 0; text-transform: uppercase; letter-spacing: 2px;">Cyber Evidence Vault</h2>
            <p style="color: #94a3b8; font-size: 13px; margin-top: 5px;">Two-Factor Authentication Code</p>
        </div>
        <div style="background-color: #0b101d; border: 1px solid rgba(6, 182, 212, 0.3); border-radius: 8px; padding: 25px; text-align: center;">
            <p style="color: #cbd5e1; font-size: 14px; margin-bottom: 15px;">Your 6-digit one-time security code is:</p>
            <div style="display: inline-block; background-color: #032030; color: #22d3ee; font-size: 32px; font-weight: bold; letter-spacing: 8px; padding: 12px 24px; border-radius: 6px; border: 1px solid #0891b2;">
                {code}
            </div>
            <p style="color: #64748b; font-size: 12px; margin-top: 15px;">This code will expire in <strong>10 minutes</strong>. Never share this code with anyone.</p>
        </div>
    </div>
    """

    # 1. Primary: Try Brevo API (Supports ANY email recipient without sandbox restrictions)
    if settings.BREVO_API_KEY:
        sent = _send_via_brevo(to_email, code, html_content)
        if sent:
            return

    # 2. Secondary: Try Resend API
    if settings.RESEND_API_KEY:
        sent = _send_via_resend(to_email, code, html_content)
        if sent:
            return

    # 3. Fallback: Try SMTP
    if settings.SMTP_HOST:
        _send_via_smtp(to_email, code, html_content)
