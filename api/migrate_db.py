import sqlite3
import os
import logging
import sys

def setup_default_role_permissions(db_session):
    """Set up default permissions for roles"""
    import json
    from .models import Role
    
    # Define default permissions for each role
    role_permissions = {
        "admin": {
            "text": "Administrator with full system access",
            "permissions": [
                "user:read", "user:write", "user:delete",
                "role:read", "role:write", "role:delete",
                "data:upload", "data:read", "data:write", "data:delete",
                "schema:read", "schema:write",
                "ingestion:create", "ingestion:read", "ingestion:cancel",
                "database:connect", "database:read", "database:write",
                "system:settings", "system:backup"
            ]
        },
        "researcher": {
            "text": "Researcher with data access",
            "permissions": [
                "data:upload", "data:read", "data:write",
                "schema:read", "schema:write",
                "ingestion:create", "ingestion:read", "ingestion:cancel",
                "database:connect", "database:read"
            ]
        },
        "user": {
            "text": "Regular user with limited access",
            "permissions": [
                "data:read",
                "schema:read",
                "ingestion:read"
            ]
        }
    }
    
    # Update or create roles with permissions
    for role_name, role_data in role_permissions.items():
        role = db_session.query(Role).filter(Role.name == role_name).first()
        if role:
            # Update existing role
            role.description = json.dumps(role_data)
            print(f"Updated permissions for role: {role_name}")
        else:
            # Create new role
            new_role = Role(name=role_name, description=json.dumps(role_data))
            db_session.add(new_role)
            print(f"Created new role: {role_name}")
        
        db_session.commit()

def migrate_database():
    """Run database migrations"""
    # Get the database path
    db_path = os.path.join(os.path.dirname(__file__), "database.db")
    
    # Connect to the database
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    
    try:
        # Import the actual database models and session
        from .models import SessionLocal, Base, engine
        
        # Create tables
        Base.metadata.create_all(bind=engine)
        print("Created database tables")
        
        # Create uploads directory
        uploads_dir = os.path.join(os.path.dirname(__file__), "uploads")
        os.makedirs(uploads_dir, exist_ok=True)
        print("Created uploads directory")
        
        # Create data directory
        data_dir = os.path.join(os.path.dirname(__file__), "data")
        os.makedirs(data_dir, exist_ok=True)
        print("Created data directory")
        
        # Check if page_url column exists in activity_logs table
        cursor.execute("PRAGMA table_info(activity_logs)")
        columns = [column[1] for column in cursor.fetchall()]
        
        # Add page_url column if it doesn't exist
        if "page_url" not in columns:
            print("Adding page_url column to activity_logs table")
            cursor.execute("ALTER TABLE activity_logs ADD COLUMN page_url TEXT")
            conn.commit()
            print("Added page_url column to activity_logs table")
        
        # Check if necessary columns exist in roles table
        cursor.execute("PRAGMA table_info(roles)")
        role_columns = [column[1] for column in cursor.fetchall()]
        
        # Add permissions column if it doesn't exist
        if "permissions" not in role_columns:
            print("Adding permissions column to roles table")
            cursor.execute("ALTER TABLE roles ADD COLUMN permissions TEXT")
            conn.commit()
            print("Added permissions column to roles table")
        
        # Add is_system_role column if it doesn't exist
        if "is_system_role" not in role_columns:
            print("Adding is_system_role column to roles table")
            cursor.execute("ALTER TABLE roles ADD COLUMN is_system_role BOOLEAN DEFAULT 0")
            conn.commit()
            print("Added is_system_role column to roles table")
        
        # Add created_at column if it doesn't exist
        if "created_at" not in role_columns:
            print("Adding created_at column to roles table")
            cursor.execute("ALTER TABLE roles ADD COLUMN created_at TIMESTAMP")
            conn.commit()
            print("Added created_at column to roles table")
        
        # Add updated_at column if it doesn't exist
        if "updated_at" not in role_columns:
            print("Adding updated_at column to roles table")
            cursor.execute("ALTER TABLE roles ADD COLUMN updated_at TIMESTAMP")
            conn.commit()
            print("Added updated_at column to roles table")
        
        # Import required modules
        import json
        from datetime import datetime
        
        # Get available permissions
        try:
            from .auth import AVAILABLE_PERMISSIONS
        except ImportError:
            # Default permissions if we can't import from auth
            AVAILABLE_PERMISSIONS = [
                "user:read", "user:write", "user:delete",
                "role:read", "role:write", "role:delete",
                "data:upload", "data:read", "data:write", "data:delete",
                "schema:read", "schema:write",
                "ingestion:create", "ingestion:read", "ingestion:cancel",
                "database:connect", "database:read", "database:write",
                "system:settings", "system:backup"
            ]
        
        # Get all roles directly from the database
        cursor.execute("SELECT id, name, description FROM roles")
        roles_data = cursor.fetchall()
        
        # Current timestamp for all updates
        current_time = datetime.utcnow().isoformat()
        
        print(f"Found {len(roles_data)} roles to update")
        
        # Update roles with default values
        for role_id, role_name, description in roles_data:
            print(f"Processing role: {role_name} (ID: {role_id})")
            
            # Set default permissions based on role name
            if role_name == "admin":
                permissions = AVAILABLE_PERMISSIONS
            elif role_name == "user":
                permissions = ["data:read"]
            elif role_name == "researcher":
                permissions = ["data:read", "data:write", "schema:read", "ingestion:read"]
            else:
                permissions = []
            
            # Try to extract permissions from description if it's in JSON format
            if description:
                try:
                    desc_data = json.loads(description)
                    if isinstance(desc_data, dict) and "permissions" in desc_data:
                        permissions = desc_data["permissions"]
                        print(f"  Extracted permissions from description for role: {role_name}")
                except (json.JSONDecodeError, TypeError):
                    # If description is not valid JSON, use default permissions
                    print(f"  Using default permissions for role: {role_name}")
            
            # Update the role
            cursor.execute(
                "UPDATE roles SET permissions = ?, is_system_role = ?, created_at = ?, updated_at = ? WHERE id = ?",
                (
                    json.dumps(permissions),
                    1 if role_name in ["admin", "user", "researcher"] else 0,
                    current_time,
                    current_time,
                    role_id
                )
            )
            print(f"  Updated role: {role_name}")
        
        conn.commit()
        print("Updated roles with default permissions and timestamps")
        
        # Now that we've added all the necessary columns, we can import and use the Role model
        from .models import Role
        
        # Create database session
        db_session = SessionLocal()
        
        # Set up default role permissions
        setup_default_role_permissions(db_session)
        
        # Check if uploaded_files table exists
        cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='uploaded_files'")
        if not cursor.fetchone():
            print("Creating uploaded_files table")
            cursor.execute("""
            CREATE TABLE uploaded_files (
                id TEXT PRIMARY KEY,
                filename TEXT NOT NULL,
                path TEXT NOT NULL,
                type TEXT NOT NULL,
                uploaded_by TEXT NOT NULL,
                uploaded_at TIMESTAMP NOT NULL,
                chunk_size INTEGER DEFAULT 1000,
                schema TEXT
            )
            """)
            conn.commit()
            print("Created uploaded_files table")
        
        # Check if ingestion_jobs table exists
        cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='ingestion_jobs'")
        if not cursor.fetchone():
            print("Creating ingestion_jobs table")
            cursor.execute("""
            CREATE TABLE ingestion_jobs (
                id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                type TEXT NOT NULL,
                status TEXT NOT NULL,
                progress INTEGER DEFAULT 0,
                start_time TIMESTAMP NOT NULL,
                end_time TIMESTAMP,
                details TEXT,
                error TEXT,
                duration TEXT,
                config TEXT
            )
            """)
            conn.commit()
            print("Created ingestion_jobs table")
        
        print("Migration completed successfully")
        
        # Close the connection
        conn.close()
        
    except Exception as e:
        print(f"Error during database migration: {str(e)}")
        logging.error(f"Database migration failed: {str(e)}")
        raise
    finally:
        db_session.close()

if __name__ == "__main__":
    try:
        migrate_database()
        sys.exit(0)
    except Exception:
        sys.exit(1)
