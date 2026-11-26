import io
import base64
import pyotp
import qrcode
from app.core.config import settings

def generate_totp_secret() -> str:
    """Generate a random Base32 TOTP secret."""
    return pyotp.random_base32()

def get_totp_uri(username: str, secret: str) -> str:
    """Generate the provisioning URI for Google Authenticator."""
    totp = pyotp.TOTP(secret)
    return totp.provisioning_uri(
        name=username,
        issuer_name=settings.APP_NAME
    )

def generate_qr_code_data_url(provisioning_uri: str) -> str:
    """Generate a base64 Data URL of the QR code PNG image."""
    qr = qrcode.QRCode(
        version=1,
        error_correction=qrcode.constants.ERROR_CORRECT_M,
        box_size=8,
        border=3,
    )
    qr.add_data(provisioning_uri)
    qr.make(fit=True)

    img = qr.make_image(fill_color="#00ffcc", back_color="#0b0f19") # Dark futuristic theme QR
    buffer = io.BytesIO()
    img.save(buffer, format="PNG")
    img_b64 = base64.b64encode(buffer.getvalue()).decode("utf-8")
    return f"data:image/png;base64,{img_b64}"

def verify_totp_code(secret: str, code: str) -> bool:
    """
    Verify the 6-digit TOTP code.
    valid_window=1 allows for a +/- 30 second clock drift.
    """
    if not secret or not code:
        return False
    totp = pyotp.TOTP(secret)
    # Strip spaces or dashes
    cleaned_code = code.replace(" ", "").replace("-", "").strip()
    return bool(totp.verify(cleaned_code, valid_window=1))
