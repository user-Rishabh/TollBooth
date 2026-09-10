import os
import json
import hashlib
from pathlib import Path
from datetime import datetime, timezone
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, Session
try:
    from .models import Base, User
except (ImportError, ValueError):
    from models import Base, User

DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./railbook.db")

# In SQLite, check_same_thread=False allows multi-threaded requests in FastAPI
connect_args = {"check_same_thread": False} if DATABASE_URL.startswith("sqlite") else {}

engine = create_engine(DATABASE_URL, connect_args=connect_args)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

DEFAULT_SEED_ACCOUNTS = [
    {
        "username": "tatkal_runner_1",
        "password": "Password123!",
        "aadhaar_linked_mobile": "9876543210",
        "fixed_otp": "123456",
    },
    {
        "username": "tatkal_runner_2",
        "password": "Password123!",
        "aadhaar_linked_mobile": "9123456780",
        "fixed_otp": "123456",
    },
    {
        "username": "tatkal_runner_3",
        "password": "Password123!",
        "aadhaar_linked_mobile": "9988776655",
        "fixed_otp": "123456",
    },
]

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def hash_password(password: str) -> str:
    """Generates a salted SHA-256 hash."""
    salt = "tollbooth_static_salt_v1"
    return hashlib.sha256(f"{salt}{password}".encode("utf-8")).hexdigest()

def verify_password(plain_password: str, hashed_password: str) -> bool:
    return hash_password(plain_password) == hashed_password

def init_db():
    """Initializes schema and seeds test accounts from bots/config/accounts.json or built-in fallback."""
    Base.metadata.create_all(bind=engine)
    
    db: Session = SessionLocal()
    try:
        seed_accounts = None
        possible_paths = [
            Path(__file__).resolve().parent.parent.parent / "bots" / "config" / "accounts.json",
            Path("/bots/config/accounts.json"),
            Path("./bots/config/accounts.json"),
            Path(__file__).resolve().parent / "accounts.json",
        ]
        for p in possible_paths:
            if p.exists():
                try:
                    with open(p, "r", encoding="utf-8") as f:
                        seed_accounts = json.load(f)
                    break
                except Exception:
                    pass

        if not seed_accounts:
            seed_accounts = DEFAULT_SEED_ACCOUNTS
            
        for acc in seed_accounts:
            existing = db.query(User).filter(User.username == acc["username"]).first()
            if not existing:
                new_user = User(
                    username=acc["username"],
                    password_hash=hash_password(acc["password"]),
                    aadhaar_linked_mobile=acc["aadhaar_linked_mobile"],
                    created_at=datetime.now(timezone.utc)
                )
                db.add(new_user)
        db.commit()
    except Exception as e:
        print(f"Warning during DB init/seed: {e}")
        db.rollback()
    finally:
        db.close()
