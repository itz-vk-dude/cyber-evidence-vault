import sys
from app.database.connection import SessionLocal
from app.database.models import User
from app.core.config import settings
import pyotp

def main():
    db = SessionLocal()
    try:
        user = db.query(User).filter(User.username == settings.ADMIN_USERNAME).first()
        if not user:
            print(f"Error: User '{settings.ADMIN_USERNAME}' not found.")
            return

        if not user.totp_secret:
            print("TOTP is not configured yet. Log in to scan the QR code.")
            return

        totp = pyotp.TOTP(user.totp_secret)
        code = totp.now()
        print("=" * 45)
        print(f" Current 6-digit Authenticator Code: {code}")
        print("=" * 45)
        print("Enter this code in your browser to unlock the vault.")
    finally:
        db.close()

if __name__ == "__main__":
    main()

