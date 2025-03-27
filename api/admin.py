from fastapi import APIRouter, Depends, HTTPException, status, Request, Query, BackgroundTasks
from sqlalchemy.orm import Session
from sqlalchemy import desc, func
from typing import List, Optional
from datetime import datetime, timedelta
import pytz
from pydantic import BaseModel, ConfigDict
import json

from .models import get_db, User, ActivityLog, Role
from .auth import get_current_user, has_role, log_activity, has_permission, AVAILABLE_PERMISSIONS

# Router
router = APIRouter(prefix="/api/admin", tags=["admin"])

# Models
class UserResponse(BaseModel):
    id: int
    username: str
    email: str
    role: str
    is_active: bool
    
    model_config = ConfigDict(from_attributes=True)  # Updated from orm_mode

class ActivityLogResponse(BaseModel):
    id: int
    username: str
    action: str
    details: Optional[str] = None
    timestamp: datetime
    ip_address: Optional[str] = None
    user_agent: Optional[str] = None
    page_url: Optional[str] = None
    
    model_config = ConfigDict(from_attributes=True)  # Updated from orm_mode

class SystemStatsResponse(BaseModel):
    total_users: int
    active_users: int
    total_activity_logs: int
    recent_activity: int  # Activity in the last 24 hours

class SystemStats(BaseModel):
    total_users: int
    active_users: int
    researchers: int
    regular_users: int
    system_uptime: str
    database_size: str

class UpdateUserRequest(BaseModel):
    is_active: Optional[bool] = None
    role: Optional[str] = None
    email: Optional[str] = None
    username: Optional[str] = None

# Add CreateUserRequest model after UpdateUserRequest
class CreateUserRequest(BaseModel):
    username: str
    email: str
    password: str
    role: str = "user"
    is_active: bool = True

class SystemSettingUpdate(BaseModel):
    maintenance_mode: Optional[bool] = None
    debug_mode: Optional[bool] = None
    api_rate_limiting: Optional[bool] = None

class SystemSettings(BaseModel):
    maintenance_mode: bool
    debug_mode: bool
    api_rate_limiting: bool
    last_backup: str

# In-memory storage for system settings (in a real app, this would be in the database)
ist = pytz.timezone('Asia/Kolkata')
system_settings = {
   "maintenance_mode": False,
   "debug_mode": True,
   "api_rate_limiting": True,
   "last_backup": (datetime.now(ist) - timedelta(days=2)).strftime("%Y-%m-%d %H:%M:%S")
}

# API Routes
# User management endpoints
@router.get("/users", response_model=List[UserResponse])
async def get_users(
    db: Session = Depends(get_db),
    current_user: User = Depends(has_role("admin"))
):
    users = db.query(User).all()
    return users

# Add the POST endpoint for creating users after the get_all_users endpoint
@router.post("/users", response_model=UserResponse)
async def create_user(
    user_data: dict,
    db: Session = Depends(get_db),
    current_user: User = Depends(has_role("admin"))
):
    # Check if username exists
    existing_user = db.query(User).filter(User.username == user_data["username"]).first()
    if existing_user:
        raise HTTPException(status_code=400, detail="Username already exists")
    
    # Check if email exists
    existing_email = db.query(User).filter(User.email == user_data["email"]).first()
    if existing_email:
        raise HTTPException(status_code=400, detail="Email already exists")
    
    # Validate role
    from .auth import validate_role
    validate_role(user_data["role"], db)
    
    # Create new user
    from datetime import datetime
    import pytz

    hashed_password = User.get_password_hash(user_data["password"])
    ist = pytz.timezone('Asia/Kolkata')
    now = datetime.now(ist)
    new_user = User(
        username=user_data["username"],
        email=user_data["email"],
        hashed_password=hashed_password,
        role=user_data["role"],
        is_active=user_data.get("is_active", True),
        created_at=now
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    
    # Log the activity
    log_activity(
        db=db,
        username=current_user.username,
        action="User created",
        details=f"Created user {new_user.username} (ID: {new_user.id})"
    )
    
    return new_user

@router.get("/users/{user_id}", response_model=UserResponse)
async def get_user(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(has_role("admin"))
):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user

@router.put("/users/{user_id}", response_model=UserResponse)
async def update_user(
    user_id: int,
    user_data: dict,
    db: Session = Depends(get_db),
    current_user: User = Depends(has_role("admin"))
):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Update user fields
    if "username" in user_data:
        user.username = user_data["username"]
    if "email" in user_data:
        user.email = user_data["email"]
    if "role" in user_data:
        # Validate role
        from .auth import validate_role
        validate_role(user_data["role"], db)
        user.role = user_data["role"]
    if "is_active" in user_data:
        user.is_active = user_data["is_active"]
    
    db.commit()
    db.refresh(user)
    
    # Log the activity
    log_activity(
        db=db,
        username=current_user.username,
        action="User updated",
        details=f"Updated user {user.username} (ID: {user.id})"
    )
    
    return user

@router.delete("/users/{user_id}")
async def delete_user(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(has_role("admin"))
):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Don't allow deleting yourself
    if user.id == current_user.id:
        raise HTTPException(status_code=400, detail="Cannot delete your own account")
    
    username = user.username
    db.delete(user)
    db.commit()
    
    # Log the activity
    log_activity(
        db=db,
        username=current_user.username,
        action="User deleted",
        details=f"Deleted user {username} (ID: {user_id})"
    )
    
    return {"message": "User deleted successfully"}

# Activity log endpoints
@router.get("/activity", response_model=List[ActivityLogResponse])
async def get_activity_logs(
    limit: int = Query(100, ge=1, le=1000),
    offset: int = Query(0, ge=0),
    username: Optional[str] = None,
    action: Optional[str] = None,
    page_url: Optional[str] = None,  # Add page_url filter
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(has_role("admin"))  # Only admin can view logs
):
    # Build query
    query = db.query(ActivityLog)
    
    # Apply filters
    if username:
        query = query.filter(ActivityLog.username == username)
    if action:
        query = query.filter(ActivityLog.action == action)
    if page_url:  # Add page_url filter
        query = query.filter(ActivityLog.page_url == page_url)
    
    # Apply date filters
    ist = pytz.timezone('Asia/Kolkata')
    if start_date:
        try:
            start_datetime = datetime.fromisoformat(start_date.replace('Z', '+00:00')).astimezone(ist)
            query = query.filter(ActivityLog.timestamp >= start_datetime)
        except ValueError:
            pass
    
    if end_date:
        try:
            end_datetime = datetime.fromisoformat(end_date.replace('Z', '+00:00')).astimezone(ist)
            query = query.filter(ActivityLog.timestamp <= end_datetime)
        except ValueError:
            pass
    
    # Order by timestamp (newest first)
    query = query.order_by(desc(ActivityLog.timestamp))
    
    # Apply pagination
    logs = query.offset(offset).limit(limit).all()
    
    # Print debug information
    print(f"Retrieved {len(logs)} activity logs")
    for log in logs[:5]:  # Print first 5 logs for debugging
        print(f"Log: id={log.id}, username={log.username}, action={log.action}")
    
    return logs

@router.post("/activity/log")
async def log_admin_activity(
    log_data: dict,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)  # Changed from has_role("admin") to get_current_user
):
    # Log the activity
    log_activity(
        db=db,
        username=current_user.username,
        action=log_data.get("action", "Admin action"),
        details=log_data.get("details"),
        ip_address=request.client.host,
        user_agent=request.headers.get("user-agent"),
        page_url=log_data.get("page_url")  # Include page_url
    )
    
    return {"message": "Activity logged successfully"}

# System statistics
@router.get("/stats", response_model=SystemStatsResponse)
async def get_system_stats(
    db: Session = Depends(get_db),
    current_user: User = Depends(has_role("admin"))
):
    # Get IST timezone
    ist = pytz.timezone('Asia/Kolkata')
    now = datetime.now(ist)
    yesterday = now - timedelta(days=1)
    
    # Calculate stats
    total_users = db.query(func.count(User.id)).scalar()
    active_users = db.query(func.count(User.id)).filter(User.is_active == True).scalar()
    total_logs = db.query(func.count(ActivityLog.id)).scalar()
    recent_logs = db.query(func.count(ActivityLog.id)).filter(ActivityLog.timestamp >= yesterday).scalar()
    
    return {
        "total_users": total_users,
        "active_users": active_users,
        "total_activity_logs": total_logs,
        "recent_activity": recent_logs
    }

# Role management
@router.get("/roles")
async def get_roles(
    db: Session = Depends(get_db),
    current_user: User = Depends(has_role("admin"))
):
    roles = db.query(Role).all()
    result = []
    
    import json
    for role in roles:
        # Extract permissions from the description if it's JSON
        try:
            if role.description and role.description.startswith('{'):
                description_data = json.loads(role.description)
                permissions = description_data.get("permissions", [])
                description_text = description_data.get("text", "")
            else:
                permissions = []
                description_text = role.description or ""
        except (json.JSONDecodeError, TypeError):
            permissions = []
            description_text = role.description or ""
        
        result.append({
            "id": role.id, 
            "name": role.name, 
            "description": description_text,
            "permissions": permissions
        })
    
    return result

@router.post("/roles")
async def create_role(
    role_data: dict,
    db: Session = Depends(get_db),
    current_user: User = Depends(has_role("admin"))
):
    # Check if role exists
    existing_role = db.query(Role).filter(Role.name == role_data["name"]).first()
    if existing_role:
        raise HTTPException(status_code=400, detail="Role already exists")
    
    # Create new role
    new_role = Role(
        name=role_data["name"],
        description=role_data.get("description", "")
    )
    db.add(new_role)
    db.commit()
    db.refresh(new_role)
    
    # Log the activity
    log_activity(
        db=db,
        username=current_user.username,
        action="Role created",
        details=f"Created role {new_role.name} (ID: {new_role.id})"
    )
    
    return {"id": new_role.id, "name": new_role.name, "description": new_role.description}

@router.put("/roles/{role_id}")
async def update_role(
    role_id: int,
    role_data: dict,
    db: Session = Depends(get_db),
    current_user: User = Depends(has_role("admin"))
):
    role = db.query(Role).filter(Role.id == role_id).first()
    if not role:
        raise HTTPException(status_code=404, detail="Role not found")
    
    # Update role fields
    if "name" in role_data:
        # Check if the new name already exists
        if role_data["name"] != role.name:
            existing_role = db.query(Role).filter(Role.name == role_data["name"]).first()
            if existing_role:
                raise HTTPException(status_code=400, detail="Role name already exists")
        role.name = role_data["name"]
    
    if "description" in role_data:
        role.description = role_data["description"]
    
    # Store permissions in the database
    # We'll use a JSON string in the description field for now
    # In a real app, you would have a separate permissions table
    if "permissions" in role_data:
        import json
        # Extract the existing description and permissions
        try:
            current_data = json.loads(role.description) if role.description and role.description.startswith('{') else {}
        except json.JSONDecodeError:
            current_data = {"text": role.description}
        
        # Update with new permissions
        current_data["permissions"] = role_data["permissions"]
        
        # Store back as JSON
        role.description = json.dumps(current_data)
    
    db.commit()
    db.refresh(role)
    
    # Log the activity
    log_activity(
        db=db,
        username=current_user.username,
        action="Role updated",
        details=f"Updated role {role.name} (ID: {role.id})"
    )
    
    # Extract permissions from the description for the response
    import json
    try:
        description_data = json.loads(role.description) if role.description and role.description.startswith('{') else {}
        permissions = description_data.get("permissions", [])
        description_text = description_data.get("text", role.description)
    except (json.JSONDecodeError, TypeError):
        permissions = []
        description_text = role.description
    
    return {
        "id": role.id, 
        "name": role.name, 
        "description": description_text,
        "permissions": permissions
    }

@router.delete("/roles/{role_id}")
async def delete_role(
    role_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(has_role("admin"))
):
    role = db.query(Role).filter(Role.id == role_id).first()
    if not role:
        raise HTTPException(status_code=404, detail="Role not found")
    
    # Check if role is in use
    users_with_role = db.query(User).filter(User.role == role.name).count()
    if users_with_role > 0:
        raise HTTPException(
            status_code=400, 
            detail=f"Cannot delete role that is assigned to {users_with_role} users"
        )
    
    role_name = role.name
    db.delete(role)
    db.commit()
    
    # Log the activity
    log_activity(
        db=db,
        username=current_user.username,
        action="Role deleted",
        details=f"Deleted role {role_name} (ID: {role_id})"
    )
    
    return {"message": "Role deleted successfully"}

@router.get("/permissions")
async def get_permissions(
    db: Session = Depends(get_db),
    current_user: User = Depends(has_role("admin"))
):
    return AVAILABLE_PERMISSIONS

@router.get("/settings", response_model=SystemSettings)
async def get_system_settings(current_user: User = Depends(has_role("admin"))):
    """Get system settings (admin only)"""
    return system_settings

# Add more logging to the settings update endpoint
@router.put("/settings", response_model=SystemSettings)
async def update_system_settings(
    settings: SystemSettingUpdate,
    current_user: User = Depends(has_role("admin")),
    db: Session = Depends(get_db),
    request: Request = None
):
    """Update system settings (admin only)"""
    changes = []
    
    if settings.maintenance_mode is not None:
        old_value = system_settings["maintenance_mode"]
        system_settings["maintenance_mode"] = settings.maintenance_mode
        if old_value != settings.maintenance_mode:
            changes.append(f"maintenance_mode: {old_value} -> {settings.maintenance_mode}")
    
    if settings.debug_mode is not None:
        old_value = system_settings["debug_mode"]
        system_settings["debug_mode"] = settings.debug_mode
        if old_value != settings.debug_mode:
            changes.append(f"debug_mode: {old_value} -> {settings.debug_mode}")
    
    if settings.api_rate_limiting is not None:
        old_value = system_settings["api_rate_limiting"]
        system_settings["api_rate_limiting"] = settings.api_rate_limiting
        if old_value != settings.debug_mode:
            changes.append(f"api_rate_limiting: {old_value} -> {settings.api_rate_limiting}")
    
    # Log the settings changes
    if changes:
        ip = request.client.host if request else None
        user_agent = request.headers.get("user-agent") if request else None
        log_activity(
            db=db,
            username=current_user.username,
            action="System settings updated",
            details=", ".join(changes),
            ip_address=ip,
            user_agent=user_agent
        )
    
    return system_settings

@router.post("/backup", status_code=200)
async def run_backup(
    background_tasks: BackgroundTasks,
    current_user: User = Depends(has_role("admin")),
    db: Session = Depends(get_db),
    request: Request = None
):
    """Run a database backup (admin only)"""
    # In a real system, you would run an actual backup process
    # For this demo, we'll just update the last backup time
    
    # Log the backup action
    ip = request.client.host if request else None
    user_agent = request.headers.get("user-agent") if request else None
    log_activity(
        db=db,
        username=current_user.username,
        action="Database backup initiated",
        details="Manual backup started by admin",
        ip_address=ip,
        user_agent=user_agent
    )
    
    def perform_backup():
        # Simulate a backup process
        import time
        time.sleep(2)  # Simulate a 2-second backup process
        ist = pytz.timezone('Asia/Kolkata')
        system_settings["last_backup"] = datetime.now(ist).strftime("%Y-%m-%d %H:%M:%S")
        
        # Log backup completion
        log_activity(
            db=db,
            username=current_user.username,
            action="Database backup completed",
            details="Backup completed successfully"
        )
    
    background_tasks.add_task(perform_backup)
    return {"message": "Backup started"}

@router.post("/export-data", status_code=200)
async def export_system_data(
    current_user: User = Depends(has_role("admin")),
    db: Session = Depends(get_db),
    request: Request = None
):
    """Export system data (admin only)"""
    # In a real system, you would generate and return actual export data
    # For this demo, we'll just return a success message
    
    # Log the export action
    ip = request.client.host if request else None
    user_agent = request.headers.get("user-agent") if request else None
    log_activity(
        db=db,
        username=current_user.username,
        action="Data export initiated",
        details="System data export started by admin",
        ip_address=ip,
        user_agent=user_agent
    )
    
    return {"message": "Data export initiated", "download_url": "/api/admin/download-export"}

@router.post("/cleanup-data", status_code=200)
async def cleanup_data(
    background_tasks: BackgroundTasks,
    current_user: User = Depends(has_role("admin"))
):
    """Clean up old or unused data (admin only)"""
    # In a real system, you would run an actual cleanup process
    # For this demo, we'll just return a success message
    
    def perform_cleanup():
        # Simulate a cleanup process
        import time
        time.sleep(3)  # Simulate a 3-second cleanup process
    
    background_tasks.add_task(perform_cleanup)
    return {"message": "Data cleanup started"}
