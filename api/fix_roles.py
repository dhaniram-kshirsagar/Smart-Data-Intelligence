"""
Fix roles database script - adds missing columns and updates permissions
"""
import os
import sqlite3
import json
import sys
from datetime import datetime

def fix_roles_table():
    """Fix the roles table by adding missing columns and updating permissions"""
    print("Starting roles table fix...")
    
    # Get the database path
    db_path = os.path.join(os.path.dirname(__file__), "database.db")
    print(f"Database path: {db_path}")
    
    # Connect to the database
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    
    try:
        # Check if necessary columns exist in roles table
        cursor.execute("PRAGMA table_info(roles)")
        columns = cursor.fetchall()
        column_names = [column[1] for column in columns]
        print(f"Existing columns: {column_names}")
        
        # Add permissions column if it doesn't exist
        if "permissions" not in column_names:
            print("Adding permissions column to roles table")
            cursor.execute("ALTER TABLE roles ADD COLUMN permissions TEXT")
            conn.commit()
            print("Added permissions column to roles table")
        
        # Add is_system_role column if it doesn't exist
        if "is_system_role" not in column_names:
            print("Adding is_system_role column to roles table")
            cursor.execute("ALTER TABLE roles ADD COLUMN is_system_role BOOLEAN DEFAULT 0")
            conn.commit()
            print("Added is_system_role column to roles table")
        
        # Add created_at column if it doesn't exist
        if "created_at" not in column_names:
            print("Adding created_at column to roles table")
            cursor.execute("ALTER TABLE roles ADD COLUMN created_at TIMESTAMP")
            conn.commit()
            print("Added created_at column to roles table")
        
        # Add updated_at column if it doesn't exist
        if "updated_at" not in column_names:
            print("Adding updated_at column to roles table")
            cursor.execute("ALTER TABLE roles ADD COLUMN updated_at TIMESTAMP")
            conn.commit()
            print("Added updated_at column to roles table")
        
        # Define default permissions for roles
        default_permissions = {
            "admin": [
                "user:read", "user:write", "user:delete", "user:create",
                "role:read", "role:write", "role:delete", "role:create",
                "data:upload", "data:read", "data:write", "data:delete",
                "schema:read", "schema:write",
                "ingestion:create", "ingestion:read", "ingestion:cancel",
                "database:connect", "database:read", "database:write",
                "system:settings", "system:backup"
            ],
            "user": ["data:read"],
            "researcher": ["data:read", "data:write", "schema:read", "ingestion:read"]
        }
        
        # Current timestamp for all updates
        current_time = datetime.utcnow().isoformat()
        
        # Get all roles from the database
        cursor.execute("SELECT id, name FROM roles")
        roles = cursor.fetchall()
        print(f"Found {len(roles)} roles to update")
        
        # Update each role with default permissions
        for role_id, role_name in roles:
            # Get permissions for this role
            permissions = default_permissions.get(role_name, [])
            
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
            print(f"Updated role: {role_name} with permissions: {permissions}")
        
        # Commit all changes
        conn.commit()
        print("All roles updated successfully")
        
        # Verify the updates
        cursor.execute("SELECT id, name, permissions FROM roles")
        updated_roles = cursor.fetchall()
        for role_id, role_name, permissions in updated_roles:
            print(f"Role {role_name} (ID: {role_id}) has permissions: {permissions}")
        
        return True
    
    except Exception as e:
        print(f"Error fixing roles table: {str(e)}")
        return False
    
    finally:
        # Close the connection
        conn.close()

if __name__ == "__main__":
    success = fix_roles_table()
    sys.exit(0 if success else 1)
