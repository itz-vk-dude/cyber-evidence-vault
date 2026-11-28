from app.database.connection import SessionLocal
from app.database.models import User
from app.core.config import settings

def main():
    db = SessionLocal()
    try:
        user = db.query(User).filter(User.username == settings.ADMIN_USERNAME).first()
        if not user:
            print(f"Error: User '{settings.ADMIN_USERNAME}' not found.")
            return

        user.totp_secret = None
        user.is_totp_enabled = False
        db.commit()
        print("=" * 60)
        print(" 2FA has been successfully RESET for user: " + user.username)
        print("=" * 60)
        print("Next steps:")
        print("1. Go back to http://localhost:5173/login in your browser.")
        print("2. Log in with your admin credentials.")
        print("3. You will now see the QR code!")
        print("4. Scan the QR code with Google Authenticator on your phone.")
    finally:
        db.close()

if __name__ == "__main__":
    main()

