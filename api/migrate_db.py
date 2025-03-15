import sqlite3
import os
import logging

def migrate_database():
    """
    Run database migrations to ensure the schema is up-to-date.
    This function adds any missing columns to existing tables.
    """
    try:
        # Get the database path
        db_path = os.path.join(os.path.dirname(__file__), "database.db")
        
        # Connect to the database
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()
        
        # Check if page_url column exists in activity_logs table
        cursor.execute("PRAGMA table_info(activity_logs)")
        columns = [column[1] for column in cursor.fetchall()]
        
        # Add page_url column if it doesn't exist
        if "page_url" not in columns:
            print("Adding page_url column to activity_logs table")
            cursor.execute("ALTER TABLE activity_logs ADD COLUMN page_url TEXT")
            conn.commit()
            print("Migration completed successfully")
        
        # Close the connection
        conn.close()
        
    except Exception as e:
        logging.error(f"Database migration failed: {str(e)}")
        raise

if __name__ == "__main__":
    try:
        migrate_database()
        sys.exit(0)
    except Exception:
        sys.exit(1)

