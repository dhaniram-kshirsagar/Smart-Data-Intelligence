from sqlalchemy import create_engine, Column, Integer, String, Boolean, DateTime, ForeignKey, Text, Index
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, relationship
import os
from datetime import datetime
import bcrypt
from typing import Generator
import pytz
import json

# Create database directory if it doesn't exist
os.makedirs(os.path.dirname(os.path.abspath(__file__)), exist_ok=True)

# Database setup
SQLALCHEMY_DATABASE_URL = f"sqlite:///{os.path.join(os.path.dirname(os.path.abspath(__file__)), 'database.db')}"
engine = create_engine(SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

# Dependency to get the database
def get_db() -> Generator:
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# Models
class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, index=True)
    email = Column(String, unique=True, index=True)
    hashed_password = Column(String)
    role = Column(String, default="user")
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    @staticmethod
    def get_password_hash(password: str) -> str:
        return bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

    def verify_password(self, password: str) -> bool:
        return bcrypt.checkpw(password.encode('utf-8'), self.hashed_password.encode('utf-8'))

class Role(Base):
    __tablename__ = "roles"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, unique=True, index=True)
    description = Column(String, nullable=True)
    permissions = Column(Text, nullable=True)  # Store permissions as JSON array
    is_system_role = Column(Boolean, default=False)  # Flag for system-defined roles
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    def get_permissions(self):
        """Get the list of permissions for this role"""
        if not self.permissions:
            return []
        try:
            return json.loads(self.permissions)
        except json.JSONDecodeError:
            return []
    
    def has_permission(self, permission):
        """Check if this role has a specific permission"""
        # Admin role always has all permissions
        if self.name == "admin":
            return True
            
        permissions = self.get_permissions()
        return permission in permissions

class ActivityLog(Base):
    __tablename__ = "activity_logs"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, index=True)
    action = Column(String, index=True)
    details = Column(Text, nullable=True)
    timestamp = Column(DateTime, index=True)
    ip_address = Column(String, nullable=True)
    user_agent = Column(String, nullable=True)
    page_url = Column(String, nullable=True)  # Added page_url field

    # Add an index on the timestamp column for faster queries
    __table_args__ = (
        Index('idx_activity_logs_timestamp', 'timestamp'),
    )

class UploadedFile(Base):
    __tablename__ = "uploaded_files"

    id = Column(String, primary_key=True, index=True)
    filename = Column(String, nullable=False)
    path = Column(String, nullable=False)
    type = Column(String, nullable=False)
    uploaded_by = Column(String, nullable=False)
    uploaded_at = Column(DateTime, nullable=False)
    chunk_size = Column(Integer, default=1000)
    schema = Column(Text, nullable=True)  # Store schema as JSON string

class IngestionJob(Base):
    __tablename__ = "ingestion_jobs"

    id = Column(String, primary_key=True, index=True)
    name = Column(String, nullable=False)
    type = Column(String, nullable=False)  # 'file' or 'database'
    status = Column(String, nullable=False)  # 'queued', 'running', 'completed', 'failed'
    progress = Column(Integer, default=0)
    start_time = Column(DateTime, nullable=False)
    end_time = Column(DateTime, nullable=True)
    details = Column(Text, nullable=True)
    error = Column(Text, nullable=True)
    duration = Column(String, nullable=True)
    config = Column(Text, nullable=True)  # Store config as JSON string

# Create tables
Base.metadata.create_all(bind=engine)
