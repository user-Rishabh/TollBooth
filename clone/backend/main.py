import uuid
import random
import json
from pathlib import Path
from datetime import datetime, timedelta, timezone
from typing import Optional, Dict, Any
from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

try:
    from .models import User, OtpVerification
    from .database import get_db, init_db, hash_password, verify_password, DEFAULT_SEED_ACCOUNTS
except (ImportError, ValueError):
    from models import User, OtpVerification
    from database import get_db, init_db, hash_password, verify_password, DEFAULT_SEED_ACCOUNTS

app = FastAPI(
    title="RailBook Backend API",
    description="Clone Tatkal Booking Target with Mock Aadhaar OTP Authentication",
    version="0.1.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("startup")
def on_startup():
    init_db()

# --- Pydantic Schemas ---

class RegisterRequest(BaseModel):
    username: str = Field(..., min_length=3, max_length=64)
    password: str = Field(..., min_length=6)
    aadhaar_linked_mobile: str = Field(..., min_length=10, max_length=15)

class RegisterResponse(BaseModel):
    user_id: str
    username: str
    aadhaar_linked_mobile: str
    message: str

class LoginRequest(BaseModel):
    username: str
    password: str

class LoginResponse(BaseModel):
    user_id: str
    username: str
    aadhaar_linked_mobile: str
    masked_mobile: str
    otp_code: str
    otp_expires_at: str
    message: str

class SendOtpRequest(BaseModel):
    user_id: str

class SendOtpResponse(BaseModel):
    user_id: str
    otp_code: str
    otp_expires_at: str
    message: str

class VerifyOtpRequest(BaseModel):
    user_id: str
    otp_code: str
    client_timing_metadata: Optional[Dict[str, Any]] = None

class VerifyOtpResponse(BaseModel):
    session_token: str
    user_id: str
    username: str
    message: str

# --- Helper Functions ---

def get_fixed_otp_for_user(username: str) -> Optional[str]:
    """Checks if username belongs to seed test accounts in accounts.json or defaults."""
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
                    accounts = json.load(f)
                for acc in accounts:
                    if acc.get("username") == username:
                        return acc.get("fixed_otp", "123456")
            except Exception:
                pass

    for acc in DEFAULT_SEED_ACCOUNTS:
        if acc.get("username") == username:
            return acc.get("fixed_otp", "123456")
    return None

def generate_mock_otp(username: str) -> str:
    fixed = get_fixed_otp_for_user(username)
    if fixed:
        return fixed
    return f"{random.randint(100000, 999999)}"

def mask_mobile(mobile: str) -> str:
    if len(mobile) >= 4:
        return "XXXXXX" + mobile[-4:]
    return "XXXXXX"

# --- Endpoints ---

@app.get("/health")
def health_check():
    return {"status": "ok", "service": "clone-backend"}

@app.post("/api/register", response_model=RegisterResponse, status_code=status.HTTP_201_CREATED)
def register(req: RegisterRequest, db: Session = Depends(get_db)):
    existing = db.query(User).filter(User.username == req.username).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Username already registered"
        )
    
    user = User(
        username=req.username,
        password_hash=hash_password(req.password),
        aadhaar_linked_mobile=req.aadhaar_linked_mobile,
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    return RegisterResponse(
        user_id=user.id,
        username=user.username,
        aadhaar_linked_mobile=user.aadhaar_linked_mobile,
        message="User registered successfully"
    )

@app.post("/api/login", response_model=LoginResponse)
def login(req: LoginRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.username == req.username).first()
    if not user or not verify_password(req.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid username or password"
        )
    
    otp_code = generate_mock_otp(user.username)
    expires_at = datetime.now(timezone.utc) + timedelta(minutes=5)

    otp_record = OtpVerification(
        user_id=user.id,
        otp_code=otp_code,
        expires_at=expires_at,
        attempt_count=0
    )
    db.add(otp_record)
    db.commit()

    return LoginResponse(
        user_id=user.id,
        username=user.username,
        aadhaar_linked_mobile=user.aadhaar_linked_mobile,
        masked_mobile=mask_mobile(user.aadhaar_linked_mobile),
        otp_code=otp_code,
        otp_expires_at=expires_at.isoformat(),
        message="Mock OTP generated and sent to Aadhaar-linked mobile"
    )

@app.post("/api/send-otp", response_model=SendOtpResponse)
def send_otp(req: SendOtpRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.id == req.user_id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    otp_code = generate_mock_otp(user.username)
    expires_at = datetime.now(timezone.utc) + timedelta(minutes=5)

    otp_record = OtpVerification(
        user_id=user.id,
        otp_code=otp_code,
        expires_at=expires_at,
        attempt_count=0
    )
    db.add(otp_record)
    db.commit()

    return SendOtpResponse(
        user_id=user.id,
        otp_code=otp_code,
        otp_expires_at=expires_at.isoformat(),
        message="Mock OTP generated successfully"
    )

@app.post("/api/verify-otp", response_model=VerifyOtpResponse)
def verify_otp(req: VerifyOtpRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.id == req.user_id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    # Fetch most recent OTP verification for user
    otp_record = (
        db.query(OtpVerification)
        .filter(OtpVerification.user_id == req.user_id)
        .order_by(OtpVerification.requested_at.desc())
        .first()
    )

    if not otp_record:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No OTP requested. Please request an OTP first."
        )

    if otp_record.verified_at is not None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="OTP has already been verified and used. Please request a new OTP."
        )
    
    now = datetime.now(timezone.utc)
    # Ensure timezone awareness
    record_expires = otp_record.expires_at
    if record_expires.tzinfo is None:
        record_expires = record_expires.replace(tzinfo=timezone.utc)

    if now > record_expires:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="OTP has expired. Please request a new one."
        )
    
    if otp_record.attempt_count >= 5:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Maximum OTP verification attempts exceeded. Request a new OTP."
        )
    
    if otp_record.otp_code != req.otp_code.strip():
        otp_record.attempt_count += 1
        db.commit()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid OTP code. Please try again."
        )
    
    otp_record.verified_at = now
    db.commit()

    session_token = f"rb_session_{uuid.uuid4().hex}"

    return VerifyOtpResponse(
        session_token=session_token,
        user_id=user.id,
        username=user.username,
        message="OTP verified successfully"
    )

if __name__ == "__main__":
    import uvicorn
    try:
        uvicorn.run("clone.backend.main:app", host="0.0.0.0", port=8000, reload=True)
    except Exception:
        uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
