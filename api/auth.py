from fastapi import APIRouter, Depends, HTTPException, status, Request, Response
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from typing import Optional, List
from datetime import datetime, timedelta
from jose import jwt
from pydantic import BaseModel, ConfigDict, Field
import pytz
import json

from api.models import User, get_db, ActivityLog, Role, SessionLocal

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
    permissions: List[str]

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

class RoleCreate(BaseModel):
    name: str
    description: str
    permissions: List[str]

class RoleUpdate(BaseModel):
    description: Optional[str] = None
    permissions: Optional[List[str]] = None

class RoleResponse(BaseModel):
    id: int
    name: str
    description: str
    permissions_list: List[str] = Field(alias="permissions")
    is_system_role: bool
    created_at: datetime
    updated_at: datetime
    
    model_config = ConfigDict(from_attributes=True)

# Predefined permissions
AVAILABLE_PERMISSIONS = [
    # Data permissions
    "data:read", "data:write", "data:delete", "data:upload",
    # Ingestion permissions
    "ingestion:create", "ingestion:read", "ingestion:update", "ingestion:delete",
    # Schema permissions
    "schema:read", "schema:write",
    # Database permissions
    "database:connect", "database:read", "database:write",
    # User management permissions
    "user:read", "user:create", "user:update", "user:delete",
    # Role management permissions
    "role:read", "role:create", "role:update", "role:delete",
    # KGInsights permissions
    "kginsights:read", "kginsights:write", "kginsights:manage"
]

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

def has_permission(permission: str):
    """
    Check if the current user has the specified permission.
    
    This function creates a dependency that can be used in FastAPI routes to
    check if the current user has the specified permission. If the user has
    the permission, the function returns the user object. Otherwise, it raises
    an HTTP 403 Forbidden exception.
    
    Args:
        permission: The permission to check for
        
    Returns:
        A dependency function that checks if the current user has the permission
    """
    def permission_checker(current_user: User = Depends(get_current_active_user), db: Session = Depends(get_db)):
        # Admin can access everything
        if current_user.role == "admin":
            return current_user
            
        # Get the role from the database
        role = db.query(Role).filter(Role.name == current_user.role).first()
        if not role:
            # If the role doesn't exist, try to create it with default permissions
            try:
                role = validate_role(current_user.role, db)
            except Exception as e:
                print(f"Error validating role: {str(e)}")
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail=f"User has an invalid role: {current_user.role}"
                )
        
        # Check if the role has the required permission
        try:
            role_permissions = []
            if role.permissions:
                try:
                    role_permissions = json.loads(role.permissions)
                except (json.JSONDecodeError, TypeError):
                    print(f"Error parsing permissions for role {role.name}: {role.permissions}")
            
            # Debug output
            print(f"Checking permission '{permission}' for user '{current_user.username}' with role '{role.name}'")
            print(f"Role permissions: {role_permissions}")
            
            # Special case for researcher role and kginsights permissions
            if current_user.role == "researcher" and permission.startswith("kginsights:"):
                return current_user
                
            if permission in role_permissions:
                return current_user
        except Exception as e:
            print(f"Error checking permissions: {str(e)}")
            # If there's an error parsing the permissions, deny access
            pass
            
        # If we get here, the user doesn't have the required permission
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"User does not have the required permission: {permission}"
        )
    
    return permission_checker

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
        
        # Add to database
        db.add(activity_log)
        db.commit()
        
        # Print success message
        print(f"Activity log created: id={activity_log.id}")
        
        return activity_log
    except Exception as e:
        # Print error message
        print(f"Error creating activity log: {str(e)}")
        
        # Don't raise the exception, just log it
        return None

def validate_role(role_name: str, db: Session):
    """
    Validate that a role exists, and create it if it doesn't.
    
    Args:
        role_name: The name of the role to validate
        db: Database session
        
    Returns:
        The validated role object
    """
    # Check if role exists
    role = db.query(Role).filter(Role.name == role_name).first()
    
    # If role doesn't exist, create it with default permissions
    if not role:
        # Default permissions based on role
        if role_name == "admin":
            # Admin has all permissions
            permissions = AVAILABLE_PERMISSIONS
        elif role_name == "user":
            # Regular user has basic data read permissions
            permissions = ["data:read"]
        else:
            # Other roles have no permissions by default
            permissions = []
            
        # Create role
        role = Role(
            name=role_name,
            description=f"Default {role_name} role",
            permissions=json.dumps(permissions),
            is_system_role=(role_name in ["admin", "user", "researcher"])
        )
        
        # Add to database
        db.add(role)
        db.commit()
        db.refresh(role)
        
    return role

def initialize_default_roles(db: Session):
    """
    Initialize default roles in the database and ensure they have the correct permissions.
    
    This function creates the following system roles if they don't exist:
    - admin: Has all permissions
    - user: Has basic data read permissions
    - researcher: Has data read/write and schema read permissions
    
    If the roles already exist, it ensures they have the correct permissions and system role flag.
    """
    # Create admin role if it doesn't exist
    admin_role = db.query(Role).filter(Role.name == "admin").first()
    if not admin_role:
        admin_role = Role(
            name="admin",
            description="Administrator with full access",
            permissions=json.dumps(AVAILABLE_PERMISSIONS),
            is_system_role=True
        )
        db.add(admin_role)
    else:
        # Update existing admin role to ensure it has all permissions
        admin_role.permissions = json.dumps(AVAILABLE_PERMISSIONS)
        admin_role.is_system_role = True
        admin_role.updated_at = datetime.utcnow()
    
    # Create user role if it doesn't exist
    user_role = db.query(Role).filter(Role.name == "user").first()
    if not user_role:
        user_role = Role(
            name="user",
            description="Regular user with limited access",
            permissions=json.dumps(["data:read"]),
            is_system_role=True
        )
        db.add(user_role)
    else:
        # Ensure user role has basic permissions
        try:
            user_permissions = json.loads(user_role.permissions) if user_role.permissions else []
            if "data:read" not in user_permissions:
                user_permissions.append("data:read")
            user_role.permissions = json.dumps(user_permissions)
        except (json.JSONDecodeError, TypeError):
            user_role.permissions = json.dumps(["data:read"])
        
        user_role.is_system_role = True
        user_role.updated_at = datetime.utcnow()
    
    # Create researcher role if it doesn't exist
    researcher_role = db.query(Role).filter(Role.name == "researcher").first()
    if not researcher_role:
        researcher_role = Role(
            name="researcher",
            description="Researcher with data access",
            permissions=json.dumps(["data:read", "data:write", "schema:read", "ingestion:read"]),
            is_system_role=True
        )
        db.add(researcher_role)
    else:
        # Ensure researcher role has appropriate permissions
        try:
            researcher_permissions = json.loads(researcher_role.permissions) if researcher_role.permissions else []
            default_permissions = ["data:read", "data:write", "schema:read", "ingestion:read"]
            for perm in default_permissions:
                if perm not in researcher_permissions:
                    researcher_permissions.append(perm)
            researcher_role.permissions = json.dumps(researcher_permissions)
        except (json.JSONDecodeError, TypeError):
            researcher_role.permissions = json.dumps(["data:read", "data:write", "schema:read", "ingestion:read"])
        
        researcher_role.is_system_role = True
        researcher_role.updated_at = datetime.utcnow()
    
    # Check for any other roles that might have been created with system role names
    # but are not properly marked as system roles
    system_role_names = ["admin", "user", "researcher"]
    other_system_roles = db.query(Role).filter(
        Role.name.in_(system_role_names),
        Role.id.notin_([r.id for r in [admin_role, user_role, researcher_role] if r])
    ).all()
    
    for role in other_system_roles:
        print(f"Found duplicate system role: {role.name} (ID: {role.id}). Marking as non-system.")
        role.is_system_role = False
        role.updated_at = datetime.utcnow()
    
    # Commit changes
    db.commit()
    print(f"Updated role permissions. Admin ID: {admin_role.id}, User ID: {user_role.id}, Researcher ID: {researcher_role.id}")

# Routes
@router.post("/token", response_model=Token)
async def login_for_access_token(
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: Session = Depends(get_db),
    request: Request = None
):
    # Find user by username
    user = db.query(User).filter(User.username == form_data.username).first()
    
    # Validate user and password
    if not user or not user.verify_password(form_data.password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    # Get user's role and permissions
    user_role = db.query(Role).filter(Role.name == user.role).first()
    permissions = []
    
    # If user has a role, get its permissions
    if user_role:
        permissions = user_role.get_permissions()
    
    # Admin role has all permissions
    if user.role == "admin":
        permissions = AVAILABLE_PERMISSIONS
    
    # Create access token
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": user.username}, expires_delta=access_token_expires
    )
    
    # Log login activity
    if request:
        ip_address = request.client.host if hasattr(request, 'client') else None
        user_agent = request.headers.get("user-agent")
        log_activity(
            db=db,
            username=user.username,
            action="login",
            details="User logged in",
            ip_address=ip_address,
            user_agent=user_agent
        )
    
    # Return token
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user_id": user.id,
        "username": user.username,
        "role": user.role,
        "permissions": permissions
    }

@router.post("/register", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
async def register_user(
    user_data: UserCreate,
    db: Session = Depends(get_db),
    request: Request = None,
    current_user: User = Depends(has_permission("user:create"))
):
    # Check if username already exists
    existing_user = db.query(User).filter(User.username == user_data.username).first()
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Username already registered"
        )
    
    # Check if email already exists
    existing_email = db.query(User).filter(User.email == user_data.email).first()
    if existing_email:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered"
        )
    
    # Validate role
    validate_role(user_data.role, db)
    
    # Create new user
    hashed_password = User.get_password_hash(user_data.password)
    new_user = User(
        username=user_data.username,
        email=user_data.email,
        hashed_password=hashed_password,
        role=user_data.role
    )
    
    # Add to database
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    
    # Log registration activity
    if request:
        ip_address = request.client.host if hasattr(request, 'client') else None
        user_agent = request.headers.get("user-agent")
        log_activity(
            db=db,
            username=current_user.username,
            action="register_user",
            details=f"Created new user: {new_user.username}",
            ip_address=ip_address,
            user_agent=user_agent
        )
    
    return new_user

@router.get("/users/me", response_model=UserResponse)
async def read_users_me(current_user: User = Depends(get_current_active_user)):
    return current_user

@router.post("/logout")
async def logout(
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
    request: Request = None
):
    # Log logout activity
    if request:
        ip_address = request.client.host if hasattr(request, 'client') else None
        user_agent = request.headers.get("user-agent")
        log_activity(
            db=db,
            username=current_user.username,
            action="logout",
            details="User logged out",
            ip_address=ip_address,
            user_agent=user_agent
        )
    
    # Return success message
    return {"message": "Successfully logged out"}

# Role management endpoints
@router.get("/roles", response_model=List[RoleResponse])
async def get_roles(
    current_user: User = Depends(has_permission("role:read")),
    db: Session = Depends(get_db)
):
    """Get all roles"""
    roles = db.query(Role).all()
    
    # Convert permissions from JSON string to list
    for role in roles:
        try:
            role.permissions_list = json.loads(role.permissions) if role.permissions else []
        except json.JSONDecodeError:
            role.permissions_list = []
    
    return roles

@router.get("/roles/{role_id}", response_model=RoleResponse)
async def get_role(
    role_id: int,
    current_user: User = Depends(has_permission("role:read")),
    db: Session = Depends(get_db)
):
    """Get a specific role by ID"""
    role = db.query(Role).filter(Role.id == role_id).first()
    if not role:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Role not found"
        )
    
    # Convert permissions from JSON string to list
    try:
        role.permissions_list = json.loads(role.permissions) if role.permissions else []
    except json.JSONDecodeError:
        role.permissions_list = []
    
    return role

@router.post("/admin/roles", response_model=RoleResponse)
async def create_role(
    role_create: RoleCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(has_permission("role:write")),
):
    """
    Create a new role.
    
    This endpoint allows users with the 'role:write' permission to create a new role.
    The role name must be unique and cannot be one of the system roles (admin, user, researcher).
    
    Args:
        role_create: The role data to create
        
    Returns:
        The created role
    """
    # Check if role name already exists
    existing_role = db.query(Role).filter(Role.name == role_create.name).first()
    if existing_role:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Role with name '{role_create.name}' already exists",
        )
    
    # Check if trying to create a system role
    system_roles = ["admin", "user", "researcher"]
    if role_create.name.lower() in [r.lower() for r in system_roles]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Cannot create a role with a system role name: {role_create.name}",
        )
    
    # Create the role
    try:
        # Create new role
        new_role = Role(
            name=role_create.name,
            description=role_create.description,
            permissions=json.dumps(role_create.permissions) if role_create.permissions else json.dumps([]),
            is_system_role=False,  # Custom roles are never system roles
            created_at=datetime.utcnow(),
            updated_at=datetime.utcnow(),
        )
        
        # Add to database
        db.add(new_role)
        db.commit()
        db.refresh(new_role)
        
        # Log the creation for debugging
        print(f"Created role {new_role.name} (ID: {new_role.id}) permissions: {new_role.permissions}")
        
        return new_role
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Error creating role: {str(e)}",
        )

@router.put("/admin/roles/{role_id}", response_model=RoleResponse)
async def update_role(
    role_id: int,
    role_update: RoleUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(has_permission("role:write")),
):
    """
    Update an existing role.
    
    This endpoint allows users with the 'role:write' permission to update an existing role.
    System roles (admin, user, researcher) cannot be modified.
    
    Args:
        role_id: The ID of the role to update
        role_update: The updated role data
        
    Returns:
        The updated role
    """
    # Get the role
    role = db.query(Role).filter(Role.id == role_id).first()
    if not role:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Role with ID {role_id} not found",
        )
    
    # Check if this is a system role
    if role.is_system_role:
        # Allow updating permissions of system roles, but not name or other attributes
        try:
            # Update permissions if provided
            if role_update.permissions is not None:
                role.permissions = json.dumps(role_update.permissions)
                role.updated_at = datetime.utcnow()
                db.commit()
                db.refresh(role)
                
                # Log the update for debugging
                print(f"Updated system role {role.name} (ID: {role.id}) permissions: {role.permissions}")
                
                # Check if any users have this role and log them
                users_with_role = db.query(User).filter(User.role == role.name).all()
                print(f"Users with role {role.name}: {[user.username for user in users_with_role]}")
                
                return role
        except Exception as e:
            db.rollback()
            print(f"Error updating system role permissions: {str(e)}")
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Error updating role permissions: {str(e)}",
            )
            
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Cannot modify system role attributes other than permissions",
        )
    
    # Update the role
    try:
        # Update basic attributes
        if role_update.name is not None:
            # Check if the new name already exists
            existing_role = db.query(Role).filter(Role.name == role_update.name).first()
            if existing_role and existing_role.id != role_id:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Role with name '{role_update.name}' already exists",
                )
            role.name = role_update.name
        
        if role_update.description is not None:
            role.description = role_update.description
        
        # Update permissions if provided
        if role_update.permissions is not None:
            role.permissions = json.dumps(role_update.permissions)
        
        # Update timestamp
        role.updated_at = datetime.utcnow()
        
        # Save changes
        db.commit()
        db.refresh(role)
        
        # Log the update for debugging
        print(f"Updated role {role.name} (ID: {role.id}) permissions: {role.permissions}")
        
        # Check if any users have this role and log them
        users_with_role = db.query(User).filter(User.role == role.name).all()
        print(f"Users with role {role.name}: {[user.username for user in users_with_role]}")
        
        return role
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Error updating role: {str(e)}",
        )

@router.delete("/admin/roles/{role_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_role(
    role_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(has_permission("role:write")),
):
    """
    Delete a role.
    
    This endpoint allows users with the 'role:write' permission to delete a role.
    System roles (admin, user, researcher) cannot be deleted.
    
    Args:
        role_id: The ID of the role to delete
    """
    # Get the role
    role = db.query(Role).filter(Role.id == role_id).first()
    if not role:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Role with ID {role_id} not found",
        )
    
    # Prevent deletion of system roles
    if role.is_system_role:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot delete system roles",
        )
    
    # Check if any users have this role
    users_with_role = db.query(User).filter(User.role == role.name).all()
    if users_with_role:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Cannot delete role '{role.name}' as it is assigned to {len(users_with_role)} users",
        )
    
    # Delete the role
    try:
        # Log the deletion for debugging
        print(f"Deleting role {role.name} (ID: {role.id})")
        
        # Delete the role
        db.delete(role)
        db.commit()
        
        return Response(status_code=status.HTTP_204_NO_CONTENT)
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Error deleting role: {str(e)}",
        )

@router.get("/permissions", response_model=List[str])
async def get_available_permissions(
    current_user: User = Depends(has_permission("role:read")),
):
    """
    Get all available permissions in the system.
    
    This endpoint returns a list of all permissions that can be assigned to roles.
    Users with the 'role:read' permission can access this endpoint.
    """
    return AVAILABLE_PERMISSIONS

@router.get("/admin/permissions", response_model=List[str])
async def get_admin_permissions(
    current_user: User = Depends(has_permission("role:read")),
):
    """
    Get all available permissions in the system for admin use.
    
    This endpoint returns a list of all permissions that can be assigned to roles.
    Users with the 'role:read' permission can access this endpoint.
    """
    return AVAILABLE_PERMISSIONS

# Initialize default roles
def startup_event():
    """
    Initialize default roles when the application starts.
    
    This function is called when the application starts to ensure that
    the default roles (admin, user, researcher) exist in the database
    and have the correct permissions.
    """
    db = SessionLocal()
    try:
        initialize_default_roles(db)
        print("Updated role permissions")
    except Exception as e:
        print(f"Error initializing default roles: {str(e)}")
    finally:
        db.close()

# Call startup event
startup_event()
