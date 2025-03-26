import sqlite3
import os
import logging
import sys

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

