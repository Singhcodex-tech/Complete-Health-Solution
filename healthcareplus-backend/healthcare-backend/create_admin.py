"""
Creates an admin account, or resets the password if one already exists
with that email. Run this once from the backend folder.

Usage (PowerShell):
    .\venv\Scripts\Activate.ps1
    python create_admin.py
"""

from getpass import getpass

from app.core.security import hash_password
from app.database import SessionLocal
from app.models.user import User, UserRole


def main() -> None:
    full_name = input("Admin full name: ").strip() or "Admin"
    email = input("Admin email: ").strip()
    phone = input("Admin phone: ").strip()
    password = getpass("Admin password: ").strip()

    if not email or not phone or len(password) < 6:
        print("Email, phone, and a password of at least 6 characters are required.")
        return

    db = SessionLocal()
    try:
        existing = db.query(User).filter(User.email == email).first()
        if existing:
            existing.hashed_password = hash_password(password)
            existing.role = UserRole.ADMIN
            existing.is_active = True
            db.commit()
            print(f"Updated existing account '{email}' to admin with the new password.")
        else:
            admin = User(
                full_name=full_name,
                email=email,
                phone=phone,
                hashed_password=hash_password(password),
                role=UserRole.ADMIN,
            )
            db.add(admin)
            db.commit()
            print(f"Created new admin account: {email}")
    finally:
        db.close()


if __name__ == "__main__":
    main()
