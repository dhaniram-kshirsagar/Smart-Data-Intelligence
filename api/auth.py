from fastapi import APIRouter, Depends, HTTPException, status, Request
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from typing import Optional
from datetime import datetime, timedelta
from jose import jwt
from pydantic import BaseModel, ConfigDict
import pytz

from .models import User, get_db, ActivityLog, Role

# Router
router = APIRouter(prefix="/api/auth", tags=["auth"])

# Configuration
SECRET_KEY = "your-secret-key"  # In production, use a secure key and store it in environment variables
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 30

# OAuth2 scheme
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/token")

# Models
class Token(BaseModel):
    access_token: str
    token_type: str
    user_id: int
    username: str
    role: str

class TokenData(BaseModel):
    username: Optional[str] = None

class UserCreate(BaseModel):
    username: str
    email: str
    password: str
    role: str = "user"

class UserResponse(BaseModel):
    id: int
    username: str
    email: str
    role: str
    is_active: bool
    
    model_config = ConfigDict(from_attributes=True)  # Updated from orm_mode

# Helper functions
def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        username: str = payload.get("sub")
        if username is None:
            raise credentials_exception
        token_data = TokenData(username=username)
    except jwt.JWTError:
        raise credentials_exception
    user = db.query(User).filter(User.username == token_data.username).first()
    if user is None:
        raise credentials_exception
    return user

def get_current_active_user(current_user: User = Depends(get_current_user)):
    if not current_user.is_active:
        raise HTTPException(status_code=400, detail="Inactive user")
    return current_user

def has_role(role: str):
    def role_checker(current_user: User = Depends(get_current_active_user)):
        # Admin can access everything
        if current_user.role == "admin":
            return current_user
            
        # Otherwise check for the specific role
        if current_user.role != role:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"User does not have the required role: {role}"
            )
        return current_user
    return role_checker

def log_activity(
    db: Session, 
    username: str, 
    action: str, 
    details: Optional[str] = None, 
    ip_address: Optional[str] = None, 
    user_agent: Optional[str] = None,
    page_url: Optional[str] = None
):
    """
    Log user activity in the database
    """
    try:
        # Get IST timezone
        ist = pytz.timezone('Asia/Kolkata')
        now = datetime.now(ist)
        
        # Print debug information
        print(f"Creating activity log: username={username}, action={action}, details={details}")
        
        # Ensure username is not empty
        if not username:
            username = "anonymous"
        
        # Create activity log
        activity_log = ActivityLog(
            username=username,
            action=action,
            details=details,
            timestamp=now,
            ip_address=ip_address,
            user_agent=user_agent,
            page_url=page_url
        )
        db.add(activity_log)
        db.commit()
        
        print(f"Activity log created successfully: {activity_log.id}")
    except Exception as e:
        import logging
        logging.error(f"Failed to log activity: {str(e)}")
        print(f"Error logging activity: {str(e)}")
        db.rollback()

def validate_role(role_name: str, db: Session):
    """
    Validate that a role exists, and create it if it doesn't
    """
    # Check if role exists
    role = db.query(Role).filter(Role.name == role_name).first()
    if not role:
        # Create the role
        new_role = Role(
            name=role_name,
            description=f"Auto-created role: {role_name}"
        )
        db.add(new_role)
        db.commit()
    return True

# Routes
@router.post("/token", response_model=Token)
async def login_for_access_token(
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: Session = Depends(get_db),
    request: Request = None
):
    user = db.query(User).filter(User.username == form_data.username).first()
    if not user or not user.verify_password(form_data.password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    # Log the login activity with the actual username
    ip = request.client.host if request else None
    user_agent = request.headers.get("user-agent") if request else None
    
    # Print debug information
    print(f"Logging login activity for user: {user.username}")
    
    # Explicitly use the user's username, not "system"
    log_activity(
        db=db,
        username=user.username,  # Use the actual username, not "system"
        action="Login",
        details=f"User {user.username} logged in successfully",
        ip_address=ip,
        user_agent=user_agent
    )
    
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": user.username}, expires_delta=access_token_expires
    )
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user_id": user.id,
        "username": user.username,
        "role": user.role
    }

@router.post("/register", response_model=UserResponse)
async def register_user(
    user_data: UserCreate,
    db: Session = Depends(get_db),
    request: Request = None
):
    # Check if username exists
    db_user = db.query(User).filter(User.username == user_data.username).first()
    if db_user:
        raise HTTPException(status_code=400, detail="Username already registered")
    
    # Check if email exists
    db_email = db.query(User).filter(User.email == user_data.email).first()
    if db_email:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    # Validate role
    validate_role(user_data.role, db)
    
    # Create new user
    hashed_password = User.get_password_hash(user_data.password)
    db_user = User(
        username=user_data.username,
        email=user_data.email,
        hashed_password=hashed_password,
        role=user_data.role
    )
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    
    # Log the registration activity
    ip = request.client.host if request else None
    user_agent = request.headers.get("user-agent") if request else None
    log_activity(
        db=db,
        username=db_user.username,
        action="Registration",
        details="User registered successfully",
        ip_address=ip,
        user_agent=user_agent
    )
    
    return db_user

@router.get("/me", response_model=UserResponse)
async def read_users_me(current_user: User = Depends(get_current_active_user)):
    return current_user

@router.post("/logout")
async def logout(
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
    request: Request = None
):
    # Log the logout activity
    ip = request.client.host if request else None
    user_agent = request.headers.get("user-agent") if request else None
    log_activity(
        db=db,
        username=current_user.username,
        action="Logout",
        details="User logged out",
        ip_address=ip,
        user_agent=user_agent
    )
    
    return {"message": "Logged out successfully"}

