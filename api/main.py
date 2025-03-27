from fastapi import FastAPI, HTTPException, Depends, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
import os
from pathlib import Path

from api.models import get_db, User
from api.auth import router as auth_router
from api.datapuur import router as datapuur_router
from api.kginsights import router as kginsights_router
from api.admin import router as admin_router
from api.middleware import ActivityLoggerMiddleware

# # Run database migrations
# try:
#     migrate_database()
#     print("Database migrations completed successfully")
# except Exception as e:
#     print(f"Error running database migrations: {str(e)}")

app = FastAPI(title="Research AI API")

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, replace with specific origins
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Add activity logger middleware
app.add_middleware(ActivityLoggerMiddleware)

# Include routers
app.include_router(auth_router)
app.include_router(datapuur_router)
app.include_router(kginsights_router)
app.include_router(admin_router)

# Health check endpoint
@app.get("/api/health")
async def health_check():
    return {"status": "ok"}

# Create initial admin user if it doesn't exist
@app.on_event("startup")
async def startup_event():
    # Run database migrations
    #migrate_database() # Moved to before app instantiation
    
    db = next(get_db())
    
    # Create default users if they don't exist
    admin_user = db.query(User).filter(User.username == "admin").first()
    if not admin_user:
        hashed_password = User.get_password_hash("admin123")
        admin = User(
            username="admin",
            email="admin@example.com",
            hashed_password=hashed_password,
            role="admin"
        )
        db.add(admin)
        db.commit()
        print("Created initial admin user")
    
    # Create researcher user if it doesn't exist
    researcher_user = db.query(User).filter(User.username == "researcher").first()
    if not researcher_user:
        hashed_password = User.get_password_hash("password")
        researcher = User(
            username="researcher",
            email="researcher@example.com",
            hashed_password=hashed_password,
            role="researcher"
        )
        db.add(researcher)
        db.commit()
        print("Created initial researcher user")
    
    # Create regular user if it doesn't exist
    regular_user = db.query(User).filter(User.username == "user").first()
    if not regular_user:
        hashed_password = User.get_password_hash("password")
        user = User(
            username="user",
            email="user@example.com",
            hashed_password=hashed_password,
            role="user"
        )
        db.add(user)
        db.commit()
        print("Created initial regular user")
    
    # Ensure roles have proper permissions
    try:
        from api.migrate_db import setup_default_role_permissions
        setup_default_role_permissions(db)
        print("Updated role permissions")
    except Exception as e:
        print(f"Error updating role permissions: {str(e)}")

# Mount static files directory if it exists
static_dir = Path(__file__).parent / "static"
if static_dir.exists():
    app.mount("/", StaticFiles(directory=str(static_dir), html=True), name="static")

    # Serve index.html for all non-API routes to support client-side routing
    @app.get("/{full_path:path}")
    async def serve_frontend(request: Request, full_path: str):
        # Skip API routes
        if full_path.startswith("api/"):
            raise HTTPException(status_code=404, detail="Not Found")
            
        # Check if the path exists as a file
        file_path = static_dir / full_path
        if file_path.exists() and file_path.is_file():
            return FileResponse(str(file_path))
            
        # Otherwise serve index.html for client-side routing
        return FileResponse(str(static_dir / "index.html"))
