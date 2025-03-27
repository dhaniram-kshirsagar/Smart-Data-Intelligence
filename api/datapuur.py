from fastapi import APIRouter, Depends, HTTPException, status, Request, UploadFile, File, Form, BackgroundTasks, Query
from sqlalchemy.orm import Session
from typing import List, Dict, Any, Optional, Union
from fastapi.responses import FileResponse
import random
import uuid
from datetime import datetime, timedelta
import json
import csv
import os
import tempfile
import shutil
from pathlib import Path
import sqlalchemy
from sqlalchemy import create_engine, MetaData, Table, inspect, desc, func, and_, or_
import requests
import asyncio
import threading
import time
import logging
import pandas as pd
import numpy as np
from pydantic import BaseModel, Field

from .models import User, get_db, ActivityLog, Role, UploadedFile, IngestionJob
from .auth import get_current_active_user, has_role, has_permission, log_activity
from .data_models import DataSource, DataMetrics, Activity, DashboardData
from .models import get_db, SessionLocal

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Router
router = APIRouter(prefix="/api/datapuur", tags=["datapuur"])

# Create uploads directory if it doesn't exist
UPLOAD_DIR = Path(__file__).parent / "uploads"
UPLOAD_DIR.mkdir(exist_ok=True)

# Create data directory if it doesn't exist
DATA_DIR = Path(__file__).parent / "data"
DATA_DIR.mkdir(exist_ok=True)

# Functions to interact with the database
def get_uploaded_file(db, file_id):
    """Get uploaded file from database"""
    return db.query(UploadedFile).filter(UploadedFile.id == file_id).first()

def get_all_uploaded_files(db):
    """Get all uploaded files from database"""
    return db.query(UploadedFile).all()

def save_uploaded_file(db, file_id, file_data):
    """Save uploaded file to database"""
    # Check if file already exists
    existing_file = get_uploaded_file(db, file_id)
    
    if existing_file:
        # Update existing file
        for key, value in file_data.items():
            if key == 'schema' and value:
                setattr(existing_file, key, json.dumps(value))
            else:
                setattr(existing_file, key, value)
    else:
        # Create new file
        schema_json = json.dumps(file_data.get('schema')) if file_data.get('schema') else None
        new_file = UploadedFile(
            id=file_id,
            filename=file_data['filename'],
            path=file_data['path'],
            type=file_data['type'],
            uploaded_by=file_data['uploaded_by'],
            uploaded_at=datetime.fromisoformat(file_data['uploaded_at']),
            chunk_size=file_data.get('chunk_size', 1000),
            schema=schema_json
        )
        db.add(new_file)
    
    db.commit()
    return True

def get_ingestion_job(db, job_id):
    """Get ingestion job from database"""
    return db.query(IngestionJob).filter(IngestionJob.id == job_id).first()

def get_all_ingestion_jobs(db):
    """Get all ingestion jobs from database"""
    return db.query(IngestionJob).all()

def save_ingestion_job(db, job_id, job_data):
    """Save ingestion job to database"""
    # Check if job already exists
    existing_job = get_ingestion_job(db, job_id)
    
    if existing_job:
        # Update existing job
        for key, value in job_data.items():
            if key == 'config' and value:
                setattr(existing_job, key, json.dumps(value))
            elif key == 'start_time' and value:
                setattr(existing_job, key, datetime.fromisoformat(value))
            elif key == 'end_time' and value:
                setattr(existing_job, key, datetime.fromisoformat(value))
            else:
                setattr(existing_job, key, value)
    else:
        # Create new job
        config_json = json.dumps(job_data.get('config')) if job_data.get('config') else None
        new_job = IngestionJob(
            id=job_id,
            name=job_data['name'],
            type=job_data['type'],
            status=job_data['status'],
            progress=job_data.get('progress', 0),
            start_time=datetime.fromisoformat(job_data['start_time']),
            end_time=datetime.fromisoformat(job_data['end_time']) if job_data.get('end_time') else None,
            details=job_data.get('details'),
            error=job_data.get('error'),
            duration=job_data.get('duration'),
            config=config_json
        )
        db.add(new_job)
    
    db.commit()
    return True

# Models for API requests
class DatabaseConfig(BaseModel):
    type: str
    config: Dict[str, Any]
    chunk_size: int = 1000
    connection_name: str

class FileIngestionRequest(BaseModel):
    file_id: str
    file_name: str
    chunk_size: int = 1000

class JobStatus(BaseModel):
    id: str
    name: str
    type: str
    status: str
    progress: int
    start_time: str
    end_time: Optional[str] = None
    details: str
    error: Optional[str] = None
    duration: Optional[str] = None
    config: Optional[Dict[str, Any]] = None

# New models for ingestion history
class IngestionHistoryItem(BaseModel):
    id: str
    filename: str
    type: str
    size: int
    uploaded_at: str
    uploaded_by: str
    preview_url: Optional[str] = None
    download_url: Optional[str] = None
    status: str
    source_type: str
    database_info: Optional[Dict[str, str]] = None

class IngestionHistoryResponse(BaseModel):
    items: List[IngestionHistoryItem]
    total: int
    page: int
    limit: int

class SchemaResponse(BaseModel):
    fields: List[Dict[str, Any]]
    sample_values: Optional[List[Any]] = None

class PreviewResponse(BaseModel):
    data: Any
    headers: Optional[List[str]] = None
    filename: str
    type: str

class StatisticsResponse(BaseModel):
    row_count: int
    column_count: int
    null_percentage: float
    memory_usage: str
    processing_time: str
    data_density: Optional[float] = None
    completion_rate: Optional[float] = None
    error_rate: Optional[float] = None

# Helper functions
def detect_csv_schema(file_path, chunk_size=1000):
    """Detect schema from a CSV file"""
    schema = {"name": Path(file_path).stem, "fields": []}
    field_types = {}
    sample_values = {}
    
    with open(file_path, 'r', newline='', encoding='utf-8') as csvfile:
        # Read header
        reader = csv.reader(csvfile)
        headers = next(reader)
        
        # Initialize field types dictionary
        for header in headers:
            field_types[header] = set()
            sample_values[header] = None
        
        # Process rows in chunks
        row_count = 0
        for row in reader:
            if row_count >= chunk_size:
                break
                
            for i, value in enumerate(row):
                if i < len(headers):
                    header = headers[i]
                    
                    # Store sample value if not already set
                    if sample_values[header] is None and value:
                        sample_values[header] = value
                    
                    # Detect type
                    if not value:
                        continue
                    
                    # Try to convert to different types
                    try:
                        int(value)
                        field_types[header].add("integer")
                        continue
                    except ValueError:
                        pass
                    
                    try:
                        float(value)
                        field_types[header].add("float")
                        continue
                    except ValueError:
                        pass
                    
                    if value.lower() in ('true', 'false'):
                        field_types[header].add("boolean")
                        continue
                    
                    # Try date formats
                    try:
                        datetime.strptime(value, '%Y-%m-%d')
                        field_types[header].add("date")
                        continue
                    except ValueError:
                        pass
                    
                    try:
                        datetime.strptime(value, '%Y-%m-%dT%H:%M:%S')
                        field_types[header].add("datetime")
                        continue
                    except ValueError:
                        pass
                    
                    # Default to string
                    field_types[header].add("string")
            
            row_count += 1
    
    # Determine final type for each field
    for header in headers:
        types = field_types[header]
        if "string" in types:
            field_type = "string"
        elif "datetime" in types:
            field_type = "datetime"
        elif "date" in types:
            field_type = "date"
        elif "boolean" in types:
            field_type = "boolean"
        elif "float" in types:
            field_type = "float"
        elif "integer" in types:
            field_type = "integer"
        else:
            field_type = "string"  # Default
        
        schema["fields"].append({
            "name": header,
            "type": field_type,
            "nullable": True,  # Assume nullable by default
            "sample": sample_values[header]
        })
    
    return schema

def detect_json_schema(file_path, chunk_size=1000):
    """Detect schema from a JSON file"""
    with open(file_path, 'r', encoding='utf-8') as jsonfile:
        try:
            data = json.load(jsonfile)
        except json.JSONDecodeError:
            raise ValueError("Invalid JSON file")
    
    schema = {"name": Path(file_path).stem, "fields": []}
    
    # Handle array of objects
    if isinstance(data, list):
        if not data:
            return schema
        
        # Limit to chunk_size
        data = data[:chunk_size]
        
        # Use the first object to initialize field tracking
        first_obj = data[0]
        if not isinstance(first_obj, dict):
            schema["fields"].append({
                "name": "value",
                "type": get_json_type(first_obj),
                "nullable": False,
                "sample": first_obj
            })
            return schema
        
        field_types = {key: set() for key in first_obj.keys()}
        sample_values = {key: None for key in first_obj.keys()}
        
        # Process each object
        for obj in data:
            if not isinstance(obj, dict):
                continue
                
            for key, value in obj.items():
                if key in field_types:
                    field_types[key].add(get_json_type(value))
                    
                    # Store sample value if not already set
                    if sample_values[key] is None and value is not None:
                        sample_values[key] = value
        
        # Create schema fields
        for key in field_types:
            types = field_types[key]
            
            # Determine the most specific type
            if "object" in types:
                field_type = "object"
            elif "array" in types:
                field_type = "array"
            elif "string" in types:
                field_type = "string"
            elif "boolean" in types:
                field_type = "boolean"
            elif "float" in types:
                field_type = "float"
            elif "integer" in types:
                field_type = "integer"
            elif "null" in types:
                field_type = "null"
            else:
                field_type = "string"  # Default
            
            schema["fields"].append({
                "name": key,
                "type": field_type,
                "nullable": "null" in types,
                "sample": sample_values[key]
            })
    
    # Handle single object
    elif isinstance(data, dict):
        for key, value in data.items():
            schema["fields"].append({
                "name": key,
                "type": get_json_type(value),
                "nullable": value is None,
                "sample": value
            })
    
    return schema

def get_json_type(value):
    """Determine the JSON type of a value"""
    if value is None:
        return "null"
    elif isinstance(value, bool):
        return "boolean"
    elif isinstance(value, int):
        return "integer"
    elif isinstance(value, float):
        return "float"
    elif isinstance(value, str):
        # Check if it might be a date
        try:
            datetime.strptime(value, '%Y-%m-%d')
            return "date"
        except ValueError:
            pass
        
        try:
            datetime.strptime(value, '%Y-%m-%dT%H:%M:%S')
            return "datetime"
        except ValueError:
            pass
        
        return "string"
    elif isinstance(value, list):
        return "array"
    elif isinstance(value, dict):
        return "object"
    else:
        return "string"  # Default

def get_db_schema(db_type, config, chunk_size=1000):
    """Get schema from a database table"""
    connection_string = create_connection_string(db_type, config)
    
    try:
        engine = create_engine(connection_string)
        inspector = inspect(engine)
        
        # Check if table exists
        if config["table"] not in inspector.get_table_names():
            raise ValueError(f"Table '{config['table']}' not found in database")
        
        # Get table columns
        columns = inspector.get_columns(config["table"])
        
        # Get sample data
        with engine.connect() as connection:
            result = connection.execute(f"SELECT * FROM {config['table']} LIMIT 1").fetchone()
            sample_data = dict(result) if result else {}
        
        schema = {
            "name": config["table"],
            "fields": []
        }
        
        for column in columns:
            col_name = column["name"]
            col_type = str(column["type"]).lower()
            
            # Map SQL types to our schema types
            if "int" in col_type:
                field_type = "integer"
            elif "float" in col_type or "double" in col_type or "decimal" in col_type:
                field_type = "float"
            elif "bool" in col_type:
                field_type = "boolean"
            elif "date" in col_type and "time" in col_type:
                field_type = "datetime"
            elif "date" in col_type:
                field_type = "date"
            elif "json" in col_type:
                field_type = "object"
            else:
                field_type = "string"
            
            schema["fields"].append({
                "name": col_name,
                "type": field_type,
                "nullable": not column.get("nullable", True),
                "sample": sample_data.get(col_name) if col_name in sample_data else None
            })
        
        return schema
    
    except Exception as e:
        raise ValueError(f"Error connecting to database: {str(e)}")

def create_connection_string(db_type, config):
    """Create a database connection string"""
    if db_type == "mysql":
        return f"mysql+pymysql://{config['username']}:{config['password']}@{config['host']}:{config['port']}/{config['database']}"
    elif db_type == "postgresql":
        return f"postgresql://{config['username']}:{config['password']}@{config['host']}:{config['port']}/{config['database']}"
    elif db_type == "mssql":
        return f"mssql+pyodbc://{config['username']}:{config['password']}@{config['host']}:{config['port']}/{config['database']}?driver=ODBC+Driver+17+for+SQL+Server"
    else:
        raise ValueError(f"Unsupported database type: {db_type}")

# Process file ingestion with database
def process_file_ingestion_with_db(job_id, file_id, chunk_size, db):
    """Process file ingestion in a background thread with database access"""
    try:
        # Get a new database session
        db_session = SessionLocal()
        
        # Update job status
        job = get_ingestion_job(db_session, job_id)
        job.status = "running"
        job.progress = 0
        db_session.commit()
        
        # Get file info
        file_info = get_uploaded_file(db_session, file_id)
        if not file_info:
            raise ValueError(f"File with ID {file_id} not found")
        
        file_path = file_info.path
        file_type = file_info.type
        
        # Create output file path
        output_file = DATA_DIR / f"{job_id}.parquet"
        
        # Process file based on type
        if file_type == "csv":
            try:
                # Read CSV in chunks with all columns as string type initially
                chunk_iterator = pd.read_csv(
                    file_path, 
                    chunksize=chunk_size,
                    dtype=str,  # Read all columns as strings initially
                    keep_default_na=False  # Don't convert empty strings to NaN
                )
                
                total_rows = sum(1 for _ in open(file_path, 'r')) - 1  # Subtract header row
                processed_rows = 0
                
                # Process first chunk
                first_chunk = next(chunk_iterator)
                
                # Try to convert numeric columns safely
                for col in first_chunk.columns:
                    # Try to convert to numeric, but keep as string if it fails
                    if col in ['MonthlyCharges', 'TotalCharges']:
                        first_chunk[col] = pd.to_numeric(first_chunk[col], errors='coerce')
                
                first_chunk.to_parquet(output_file, index=False)
                processed_rows += len(first_chunk)
                
                # Update progress
                job.progress = min(int((processed_rows / total_rows) * 100), 99)
                db_session.commit()
                
                # Process remaining chunks
                for chunk in chunk_iterator:
                    # Try to convert numeric columns safely
                    for col in chunk.columns:
                        if col in ['MonthlyCharges', 'TotalCharges']:
                            chunk[col] = pd.to_numeric(chunk[col], errors='coerce')
                    
                    # Read existing parquet file
                    if os.path.exists(output_file):
                        existing_df = pd.read_parquet(output_file)
                        # Concatenate with new chunk
                        combined_df = pd.concat([existing_df, chunk], ignore_index=True)
                        # Write back to file
                        combined_df.to_parquet(output_file, index=False)
                    else:
                        chunk.to_parquet(output_file, index=False)
                        
                    processed_rows += len(chunk)
                    
                    # Update progress
                    job.progress = min(int((processed_rows / total_rows) * 100), 99)
                    db_session.commit()
                    
                    time.sleep(0.1)  # Simulate processing time
            except Exception as e:
                logger.error(f"Error processing CSV file: {str(e)}")
                raise ValueError(f"Error processing CSV file: {str(e)}")
        
        elif file_type == "json":
            # Read JSON
            with open(file_path, 'r') as f:
                data = json.load(f)
            
            # Convert to DataFrame
            if isinstance(data, list):
                df = pd.DataFrame(data)
            else:
                df = pd.DataFrame([data])
            
            # Save to parquet
            df.to_parquet(output_file, index=False)
            
            # Update progress
            for progress in range(0, 100, 10):
                job.progress = progress
                db_session.commit()
                time.sleep(0.2)  # Simulate processing time
        
        # Mark job as completed
        job.status = "completed"
        job.progress = 100
        job.end_time = datetime.now()
        
        # Calculate duration
        start_time = job.start_time
        end_time = job.end_time
        duration = end_time - start_time
        job.duration = str(duration)
        
        db_session.commit()
        
        logger.info(f"File ingestion completed for job {job_id}")
    
    except Exception as e:
        logger.error(f"Error processing file ingestion: {str(e)}")
        
        # Update job status to failed
        try:
            job = get_ingestion_job(db_session, job_id)
            job.status = "failed"
            job.error = str(e)
            job.end_time = datetime.now()
            db_session.commit()
        except:
            pass
    
    finally:
        # Close the database session
        db_session.close()

# Process database ingestion with database
def process_db_ingestion_with_db(job_id, db_type, db_config, chunk_size, db):
    """Process database ingestion in a background thread with database access"""
    try:
        # Get a new database session
        db_session = SessionLocal()
        
        # Update job status
        job = get_ingestion_job(db_session, job_id)
        job.status = "running"
        job.progress = 0
        db_session.commit()
        
        # Create connection string
        connection_string = create_connection_string(db_type, db_config)
        
        # Create output file path
        output_file = DATA_DIR / f"{job_id}.parquet"
        
        # Connect to database
        engine = create_engine(connection_string)
        
        try:
            # Get total row count
            with engine.connect() as conn:
                result = conn.execute(f"SELECT COUNT(*) FROM {db_config['table']}")
                total_rows = result.scalar()
            
            # Read data in chunks
            offset = 0
            processed_rows = 0
            
            while offset < total_rows:
                # Update progress
                job.progress = min(int((processed_rows / total_rows) * 100), 99)
                db_session.commit()
                
                # Read chunk
                query = f"SELECT * FROM {db_config['table']} LIMIT {chunk_size} OFFSET {offset}"
                chunk = pd.read_sql(query, engine)
                
                # Save chunk
                if offset == 0:
                    chunk.to_parquet(output_file, index=False)
                else:
                    # Read existing parquet file
                    if os.path.exists(output_file):
                        existing_df = pd.read_parquet(output_file)
                        # Concatenate with new chunk
                        combined_df = pd.concat([existing_df, chunk], ignore_index=True)
                        # Write back to file
                        combined_df.to_parquet(output_file, index=False)
                    else:
                        chunk.to_parquet(output_file, index=False)
                
                # Update counters
                processed_rows += len(chunk)
                offset += chunk_size
                
                # Simulate processing time
                time.sleep(0.2)
            
            # Mark job as completed
            job.status = "completed"
            job.progress = 100
            job.end_time = datetime.now()
            
            # Calculate duration
            start_time = job.start_time
            end_time = job.end_time
            duration = end_time - start_time
            job.duration = str(duration)
            
            db_session.commit()
            
            logger.info(f"Database ingestion completed for job {job_id}")
        
        finally:
            engine.dispose()
    
    except Exception as e:
        logger.error(f"Error processing database ingestion: {str(e)}")
        
        # Update job status to failed
        try:
            job = get_ingestion_job(db_session, job_id)
            job.status = "failed"
            job.error = str(e)
            job.end_time = datetime.now()
            db_session.commit()
        except:
            pass
    
    finally:
        # Close the database session
        db_session.close()

# API Routes
@router.post("/upload", status_code=status.HTTP_200_OK)
async def upload_file(
    file: UploadFile = File(...),
    chunkSize: int = Form(1000),
    current_user: User = Depends(has_permission("data:upload")),  # Ensure this matches the permission in roles
    db: Session = Depends(get_db)
):
    """Upload a file for data ingestion"""
    # Validate file type
    file_ext = file.filename.split('.')[-1].lower()
    if file_ext not in ['csv', 'json']:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Only CSV and JSON files are supported"
        )
    
    # Generate a unique file ID
    file_id = str(uuid.uuid4())
    file_path = UPLOAD_DIR / f"{file_id}.{file_ext}"
    
    # Save the file
    try:
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error saving file: {str(e)}"
        )
    finally:
        file.file.close()
    
    # Store file info in database
    file_data = {
        "filename": file.filename,
        "path": str(file_path),
        "type": file_ext,
        "uploaded_by": current_user.username,
        "uploaded_at": datetime.now().isoformat(),
        "chunk_size": chunkSize
    }
    save_uploaded_file(db, file_id, file_data)
    
    # Log activity
    log_activity(
        db=db,
        username=current_user.username,
        action="File upload",
        details=f"Uploaded file: {file.filename} ({file_ext.upper()})"
    )
    
    return {"file_id": file_id, "message": "File uploaded successfully"}

@router.get("/schema/{file_id}", status_code=status.HTTP_200_OK)
async def get_file_schema(
    file_id: str,
    current_user: User = Depends(has_permission("schema:read")),
    db: Session = Depends(get_db)
):
    """Get schema for an uploaded file"""
    file_info = get_uploaded_file(db, file_id)
    if not file_info:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="File not found"
        )
    
    file_path = file_info.path
    chunk_size = file_info.chunk_size
    
    try:
        if file_info.type == "csv":
            schema = detect_csv_schema(file_path, chunk_size)
        elif file_info.type == "json":
            schema = detect_json_schema(file_path, chunk_size)
        else:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Unsupported file type"
            )
        
        # Store schema in database
        file_data = {
            "schema": schema
        }
        save_uploaded_file(db, file_id, file_data)
        
        # Log activity
        log_activity(
            db=db,
            username=current_user.username,
            action="Schema detection",
            details=f"Detected schema for file: {file_info.filename}"
        )
        
        return {"schema": schema}
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error detecting schema: {str(e)}"
        )

@router.post("/test-connection", status_code=status.HTTP_200_OK)
async def test_database_connection(
    connection_info: dict,
    current_user: User = Depends(has_permission("database:connect")),
    db: Session = Depends(get_db)
):
    """Test a database connection"""
    try:
        db_type = connection_info.get("type")
        config = connection_info.get("config", {})
        
        # Validate required fields
        required_fields = ["host", "port", "database", "username"]
        for field in required_fields:
            if not config.get(field):
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Missing required field: {field}"
                )
        
        # Create connection string
        connection_string = create_connection_string(db_type, config)
        
        # Test connection
        engine = create_engine(connection_string)
        with engine.connect() as connection:
            # Just test the connection
            pass
        
        # Log activity
        log_activity(
            db=db,
            username=current_user.username,
            action="Database connection test",
            details=f"Tested connection to {db_type} database: {config['database']}"
        )
        
        return {"message": "Connection successful"}
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Connection failed: {str(e)}"
        )

@router.post("/db-schema", status_code=status.HTTP_200_OK)
async def get_database_schema(
    connection_info: dict,
    current_user: User = Depends(has_permission("database:read")),
    db: Session = Depends(get_db)
):
    """Get schema from a database table"""
    try:
        db_type = connection_info.get("type")
        config = connection_info.get("config", {})
        chunk_size = connection_info.get("chunkSize", 1000)
        
        # Validate required fields
        required_fields = ["host", "port", "database", "username", "table"]
        for field in required_fields:
            if not config.get(field):
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Missing required field: {field}"
                )
        
        # Get schema
        schema = get_db_schema(db_type, config, chunk_size)
        
        # Log activity
        log_activity(
            db=db,
            username=current_user.username,
            action="Database schema detection",
            details=f"Detected schema for table: {config['database']}.{config['table']}"
        )
        
        return {"schema": schema}
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Error fetching schema: {str(e)}"
        )

@router.post("/ingest-file", status_code=status.HTTP_200_OK)
async def ingest_file(
    request: FileIngestionRequest,
    background_tasks: BackgroundTasks,
    current_user: User = Depends(has_permission("ingestion:create")),
    db: Session = Depends(get_db)
):
    """Start file ingestion job"""
    try:
        file_id = request.file_id
        file_name = request.file_name
        chunk_size = request.chunk_size
        
        # Check if file exists
        file_info = get_uploaded_file(db, file_id)
        if not file_info:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="File not found"
            )
        
        # Generate job ID
        job_id = str(uuid.uuid4())
        
        # Create job in database
        job_data = {
            "id": job_id,
            "name": file_name,
            "type": "file",
            "status": "queued",
            "progress": 0,
            "start_time": datetime.now().isoformat(),
            "end_time": None,
            "details": f"File: {file_name}",
            "error": None,
            "duration": None,
            "config": {
                "file_id": file_id,
                "chunk_size": chunk_size
            }
        }
        save_ingestion_job(db, job_id, job_data)
        
        # Start background task with database session
        background_tasks.add_task(process_file_ingestion_with_db, job_id, file_id, chunk_size, db)
        
        # Log activity
        log_activity(
            db=db,
            username=current_user.username,
            action="File ingestion started",
            details=f"Started ingestion for file: {file_name}"
        )
        
        return {"job_id": job_id, "message": "File ingestion started"}
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error starting ingestion: {str(e)}"
        )

@router.post("/ingest-db", status_code=status.HTTP_200_OK)
async def ingest_database(
    request: DatabaseConfig,
    background_tasks: BackgroundTasks,
    current_user: User = Depends(has_permission("ingestion:create")),
    db: Session = Depends(get_db)
):
    """Start database ingestion job"""
    try:
        db_type = request.type
        db_config = request.config
        chunk_size = request.chunk_size
        connection_name = request.connection_name
        
        # Validate required fields
        required_fields = ["host", "port", "database", "username", "table"]
        for field in required_fields:
            if not db_config.get(field):
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Missing required field: {field}"
                )
        
        # Generate job ID
        job_id = str(uuid.uuid4())
        
        # Create job in database
        job_data = {
            "id": job_id,
            "name": connection_name,
            "type": "database",
            "status": "queued",
            "progress": 0,
            "start_time": datetime.now().isoformat(),
            "end_time": None,
            "details": f"DB: {db_config['database']}.{db_config['table']}",
            "error": None,
            "duration": None,
            "config": {
                "type": db_type,
                "database": db_config["database"],
                "table": db_config["table"]
            }
        }
        save_ingestion_job(db, job_id, job_data)
        
        # Start background task with database session
        background_tasks.add_task(process_db_ingestion_with_db, job_id, db_type, db_config, chunk_size, db)
        
        # Log activity
        log_activity(
            db=db,
            username=current_user.username,
            action="Database ingestion started",
            details=f"Started ingestion for table: {db_config['database']}.{db_config['table']}"
        )
        
        return {"job_id": job_id, "message": "Database ingestion started"}
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error starting ingestion: {str(e)}"
        )

@router.get("/job-status/{job_id}", response_model=JobStatus)
async def get_job_status(
    job_id: str,
    current_user: User = Depends(has_permission("ingestion:read")),
    db: Session = Depends(get_db)
):
    """Get status of an ingestion job"""
    job = get_ingestion_job(db, job_id)
    if not job:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Job not found"
        )
    
    # Convert database model to response model
    config = json.loads(job.config) if job.config else None
    
    return JobStatus(
        id=job.id,
        name=job.name,
        type=job.type,
        status=job.status,
        progress=job.progress,
        start_time=job.start_time.isoformat(),
        end_time=job.end_time.isoformat() if job.end_time else None,
        details=job.details,
        error=job.error,
        duration=job.duration,
        config=config
    )

@router.post("/cancel-job/{job_id}", status_code=status.HTTP_200_OK)
async def cancel_job(
    job_id: str,
    current_user: User = Depends(has_permission("ingestion:create")),
    db: Session = Depends(get_db)
):
    """Cancel an ingestion job"""
    job = get_ingestion_job(db, job_id)
    if not job:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Job not found"
        )
    
    # Only cancel running or queued jobs
    if job.status not in ["running", "queued"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Cannot cancel job with status: {job.status}"
        )
    
    # Update job status
    job.status = "failed"
    job.error = "Job cancelled by user"
    job.end_time = datetime.now()
    
    # Calculate duration
    start_time = job.start_time
    end_time = job.end_time
    duration = end_time - start_time
    job.duration = str(duration)
    
    db.commit()
    
    # Log activity
    log_activity(
        db=db,
        username=current_user.username,
        action="Job cancelled",
        details=f"Cancelled ingestion job: {job.name}"
    )
    
    # Convert database model to response model
    config = json.loads(job.config) if job.config else None
    
    return JobStatus(
        id=job.id,
        name=job.name,
        type=job.type,
        status=job.status,
        progress=job.progress,
        start_time=job.start_time.isoformat(),
        end_time=job.end_time.isoformat() if job.end_time else None,
        details=job.details,
        error=job.error,
        duration=job.duration,
        config=config
    )

@router.get("/ingestion-history", response_model=IngestionHistoryResponse)
async def get_ingestion_history(
    page: int = Query(1, ge=1),
    limit: int = Query(10, ge=1, le=100),
    sort: str = Query("newest"),
    type: str = Query(""),
    source: str = Query(""),
    status: str = Query(""),
    search: str = Query(""),
    current_user: User = Depends(has_permission("ingestion:read")),  # Ensure this matches the permission in roles
    db: Session = Depends(get_db)
):
    """Get history of ingestion jobs with filtering and pagination"""
    try:
        # Build query
        query = db.query(IngestionJob)
        
        # Apply filters
        if type:
            query = query.filter(IngestionJob.type == type)
        
        if source:
            source_type = "database" if source == "database" else "file"
            query = query.filter(IngestionJob.type == source_type)
        
        if status:
            query = query.filter(IngestionJob.status == status)
        
        if search:
            search_lower = f"%{search.lower()}%"
            query = query.filter(
                or_(
                    IngestionJob.name.ilike(search_lower),
                    IngestionJob.details.ilike(search_lower)
                )
            )
        
        # Apply sorting
        if sort == "newest":
            query = query.order_by(IngestionJob.start_time.desc())
        else:
            query = query.order_by(IngestionJob.start_time)
        
        # Get total count
        total = query.count()
        
        # Apply pagination
        offset = (page - 1) * limit
        query = query.offset(offset).limit(limit)
        
        # Execute query
        jobs = query.all()
        
        # Convert to response format
        items = []
        for job in jobs:
            # Get file info if it's a file ingestion
            file_info = None
            config = json.loads(job.config) if job.config else {}
            
            if job.type == "file" and config and "file_id" in config:
                file_id = config["file_id"]
                file_info = get_uploaded_file(db, file_id)
            
            # Create history item
            history_item = {
                "id": job.id,
                "filename": job.name,
                "type": "database" if job.type == "database" else file_info.type if file_info else "unknown",
                "size": os.path.getsize(file_info.path) if file_info and os.path.exists(file_info.path) else 0,
                "uploaded_at": job.start_time.isoformat(),
                "uploaded_by": current_user.username,
                "preview_url": f"/api/datapuur/ingestion-preview/{job.id}",
                "download_url": f"/api/datapuur/ingestion-download/{job.id}",
                "status": job.status if job.status != "queued" else "processing",
                "source_type": "database" if job.type == "database" else "file",
            }
            
            # Add database info if it's a database ingestion
            if job.type == "database" and config:
                history_item["database_info"] = {
                    "type": config.get("type", "unknown"),
                    "name": config.get("database", "unknown"),
                    "table": config.get("table", "unknown")
                }
            
            items.append(history_item)
        
        # Log activity
        log_activity(
            db=db,
            username=current_user.username,
            action="View ingestion history",
            details=f"Viewed ingestion history (page {page})"
        )
        
        return {
            "items": items,
            "total": total,
            "page": page,
            "limit": limit
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error fetching ingestion history: {str(e)}"
        )

@router.get("/ingestion-preview/{ingestion_id}", response_model=PreviewResponse)
async def get_ingestion_preview(
    ingestion_id: str,
    current_user: User = Depends(has_permission("ingestion:read")),
    db: Session = Depends(get_db)
):
    """Get preview data for an ingestion"""
    try:
        job = get_ingestion_job(db, ingestion_id)
        if not job:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Ingestion not found"
            )
        
        # Check if job is completed
        if job.status != "completed":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Cannot preview ingestion with status: {job.status}"
            )
        
        # Get the parquet file path
        parquet_path = DATA_DIR / f"{ingestion_id}.parquet"
        
        if not os.path.exists(parquet_path):
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Ingestion data file not found"
            )
        
        try:
            # Read the parquet file
            df = pd.read_parquet(parquet_path)
            
            # Limit to first 10 rows for preview
            preview_df = df.head(10)
            
            # Convert to appropriate format based on job type
            if job.type == "file":
                config = json.loads(job.config) if job.config else {}
                file_id = config.get("file_id")
                file_info = get_uploaded_file(db, file_id) if file_id else None
                file_type = file_info.type if file_info else "unknown"
                
                if file_type == "csv":
                    # For CSV, return as list of lists with headers
                    headers = preview_df.columns.tolist()
                    # Convert NumPy types to Python native types
                    rows = []
                    for row in preview_df.values:
                        python_row = []
                        for item in row:
                            if pd.isna(item):
                                python_row.append(None)
                            elif isinstance(item, (np.integer, np.floating)):
                                python_row.append(item.item())
                            else:
                                python_row.append(item)
                        rows.append(python_row)
                    
                    return {
                        "data": rows,
                        "headers": headers,
                        "filename": file_info.filename if file_info else f"file_{file_id}",
                        "type": "csv"
                    }
                elif file_type == "json":
                    # For JSON, return as list of dictionaries
                    # Convert DataFrame to records and then handle NumPy types
                    records = []
                    for record in preview_df.to_dict(orient='records'):
                        clean_record = {}
                        for key, value in record.items():
                            if pd.isna(value):
                                clean_record[key] = None
                            elif isinstance(value, (np.integer, np.floating)):
                                clean_record[key] = value.item()
                            else:
                                clean_record[key] = value
                        records.append(clean_record)
                    
                    return {
                        "data": records,
                        "headers": preview_df.columns.tolist(),
                        "filename": file_info.filename if file_info else f"file_{file_id}",
                        "type": "json"
                    }
                else:
                    # Generic table format
                    headers = preview_df.columns.tolist()
                    rows = []
                    for row in preview_df.values:
                        python_row = []
                        for item in row:
                            if pd.isna(item):
                                python_row.append(None)
                            elif isinstance(item, (np.integer, np.floating)):
                                python_row.append(item.item())
                            else:
                                python_row.append(item)
                        rows.append(python_row)
                    
                    return {
                        "data": rows,
                        "headers": headers,
                        "filename": file_info.filename if file_info else f"file_{file_id}",
                        "type": "table"
                    }
            elif job.type == "database":
                # For database, return as list of dictionaries
                config = json.loads(job.config) if job.config else {}
                connection_name = config.get("connection_name", "Database Connection")
                
                # Convert DataFrame to records and then handle NumPy types
                records = []
                for record in preview_df.to_dict(orient='records'):
                    clean_record = {}
                    for key, value in record.items():
                        if pd.isna(value):
                            clean_record[key] = None
                        elif isinstance(value, (np.integer, np.floating)):
                            clean_record[key] = value.item()
                        else:
                            clean_record[key] = value
                    records.append(clean_record)
                
                return {
                    "data": records,
                    "headers": preview_df.columns.tolist(),
                    "filename": connection_name,
                    "type": "database"
                }
            else:
                # Generic table format as fallback
                headers = preview_df.columns.tolist()
                rows = []
                for row in preview_df.values:
                    python_row = []
                    for item in row:
                        if pd.isna(item):
                            python_row.append(None)
                        elif isinstance(item, (np.integer, np.floating)):
                            python_row.append(item.item())
                        else:
                            python_row.append(item)
                    rows.append(python_row)
                
                return {
                    "data": rows,
                    "headers": headers,
                    "filename": f"ingestion_{ingestion_id}",
                    "type": "table"
                }
        except Exception as e:
            # Log the specific parquet reading error
            print(f"Error reading parquet file: {str(e)}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Error reading ingestion data: {str(e)}"
            )
    except HTTPException:
        # Re-raise HTTP exceptions as is
        raise
    except Exception as e:
        # Catch any other exceptions and return a 500 error
        print(f"Unexpected error in get_ingestion_preview: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Unexpected error processing preview: {str(e)}"
        )

@router.get("/ingestion-schema/{ingestion_id}", response_model=SchemaResponse)
async def get_ingestion_schema(
    ingestion_id: str,
    current_user: User = Depends(has_permission("schema:read")),
    db: Session = Depends(get_db)
):
    """Get schema for an ingestion"""
    job = get_ingestion_job(db, ingestion_id)
    if not job:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Ingestion not found"
        )
    
    # Check if job is completed
    if job.status != "completed":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Cannot get schema for ingestion with status: {job.status}"
        )
    
    try:
        # Get the parquet file path
        parquet_path = DATA_DIR / f"{ingestion_id}.parquet"
        
        if not os.path.exists(parquet_path):
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Ingestion data file not found"
            )
        
        # Read the parquet file metadata
        df = pd.read_parquet(parquet_path)
        
        # Generate schema
        fields = []
        sample_values = []
        
        for column in df.columns:
            dtype = df[column].dtype
            
            # Determine field type
            if pd.api.types.is_integer_dtype(dtype):
                field_type = "integer"
            elif pd.api.types.is_float_dtype(dtype):
                field_type = "float"
            elif pd.api.types.is_bool_dtype(dtype):
                field_type = "boolean"
            elif pd.api.types.is_datetime64_dtype(dtype):
                field_type = "datetime"
            else:
                field_type = "string"
            
            # Check nullability - convert numpy.bool_ to Python bool
            nullable = bool(df[column].isna().any())
            
            # Get sample value
            sample = None
            non_null_values = df[column].dropna()
            if not non_null_values.empty:
                sample_value = non_null_values.iloc[0]
                
                # Convert NumPy types to Python native types
                if isinstance(sample_value, (np.integer, np.floating)):
                    sample = sample_value.item()  # Convert NumPy scalar to Python native type
                elif isinstance(sample_value, np.bool_):
                    sample = bool(sample_value)  # Convert NumPy boolean to Python boolean
                elif pd.api.types.is_datetime64_dtype(dtype):
                    sample = str(sample_value)
                elif isinstance(sample_value, np.ndarray):
                    sample = sample_value.tolist()  # Convert NumPy array to list
                else:
                    sample = sample_value
            
            fields.append({
                "name": column,
                "type": field_type,
                "nullable": nullable
            })
            
            sample_values.append(sample)
        
        # Log the schema data being returned
        logger.info(f"Schema data for ingestion {ingestion_id}: {len(fields)} fields")
        
        # Return schema data - ensure all NumPy types are converted to Python native types
        def convert_numpy_types(obj):
            if isinstance(obj, np.bool_):
                return bool(obj)
            elif isinstance(obj, (np.integer, np.floating)):
                return obj.item()
            elif isinstance(obj, np.ndarray):
                return obj.tolist()
            elif isinstance(obj, dict):
                return {k: convert_numpy_types(v) for k, v in obj.items()}
            elif isinstance(obj, list):
                return [convert_numpy_types(i) for i in obj]
            else:
                return obj
                
        # Apply conversion to both fields and sample_values
        converted_fields = convert_numpy_types(fields)
        converted_sample_values = convert_numpy_types(sample_values)
        
        return {
            "fields": converted_fields,
            "sample_values": converted_sample_values
        }
    except Exception as e:
        logger.error(f"Error generating schema: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error generating schema: {str(e)}"
        )

@router.get("/debug-schema/{ingestion_id}")
async def debug_schema(
    ingestion_id: str,
    current_user: User = Depends(has_permission("schema:read")),
    db: Session = Depends(get_db)
):
    """Debug endpoint to check schema data directly"""
    try:
        # Get the parquet file path
        parquet_path = DATA_DIR / f"{ingestion_id}.parquet"
        
        if not os.path.exists(parquet_path):
            return {"error": "Ingestion data file not found"}
        
        # Read the parquet file metadata
        df = pd.read_parquet(parquet_path)
        
        # Get column info
        columns_info = []
        for column in df.columns:
            dtype = df[column].dtype
            
            # Determine field type
            if pd.api.types.is_integer_dtype(dtype):
                field_type = "integer"
            elif pd.api.types.is_float_dtype(dtype):
                field_type = "float"
            elif pd.api.types.is_bool_dtype(dtype):
                field_type = "boolean"
            elif pd.api.types.is_datetime64_dtype(dtype):
                field_type = "datetime"
            else:
                field_type = "string"
            
            # Check nullability - convert numpy.bool_ to Python bool
            nullable = bool(df[column].isna().any())
            
            # Get sample value
            sample = None
            non_null_values = df[column].dropna()
            if not non_null_values.empty:
                sample_value = non_null_values.iloc[0]
                
                # Convert NumPy types to Python native types
                if isinstance(sample_value, (np.integer, np.floating)):
                    sample = sample_value.item()  # Convert NumPy scalar to Python native type
                elif isinstance(sample_value, np.bool_):
                    sample = bool(sample_value)  # Convert NumPy boolean to Python boolean
                elif pd.api.types.is_datetime64_dtype(dtype):
                    sample = str(sample_value)
                elif isinstance(sample_value, np.ndarray):
                    sample = sample_value.tolist()  # Convert NumPy array to list
                elif isinstance(sample_value, pd.Timestamp):
                    sample = str(sample_value)
                else:
                    sample = sample_value
                    
            columns_info.append({
                "name": column,
                "dtype": str(dtype),
                "nullable": nullable,
                "sample": sample,
                "sample_type": type(sample).__name__
            })
        
        return {
            "columns_count": len(df.columns),
            "rows_count": len(df),
            "columns": columns_info
        }
    except Exception as e:
        return {"error": str(e)}

@router.get("/ingestion-statistics/{ingestion_id}", response_model=StatisticsResponse)
async def get_ingestion_statistics(
    ingestion_id: str,
    current_user: User = Depends(has_permission("schema:read")),
    db: Session = Depends(get_db)
):
    """Get statistics for an ingestion"""
    job = get_ingestion_job(db, ingestion_id)
    if not job:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Ingestion not found"
        )
    
    # Check if job is completed
    if job.status != "completed":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Cannot get statistics for ingestion with status: {job.status}"
        )
    
    try:
        # Get the parquet file path
        parquet_path = DATA_DIR / f"{ingestion_id}.parquet"
        
        if not os.path.exists(parquet_path):
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Ingestion data file not found"
            )
        
        # Read the parquet file
        df = pd.read_parquet(parquet_path)
        
        # Calculate statistics
        row_count = len(df)
        column_count = len(df.columns)
        
        # Calculate null percentage
        total_cells = row_count * column_count
        null_count = df.isna().sum().sum()
        null_percentage = (null_count / total_cells) * 100 if total_cells > 0 else 0
        
        # Convert null_percentage from NumPy type to Python native type if needed
        if isinstance(null_percentage, (np.integer, np.floating)):
            null_percentage = null_percentage.item()
        
        # Calculate memory usage
        memory_usage_bytes = df.memory_usage(deep=True).sum()
        if isinstance(memory_usage_bytes, (np.integer, np.floating)):
            memory_usage_bytes = memory_usage_bytes.item()
            
        if memory_usage_bytes < 1024:
            memory_usage = f"{memory_usage_bytes} B"
        elif memory_usage_bytes < 1024 * 1024:
            memory_usage = f"{memory_usage_bytes / 1024:.1f} KB"
        else:
            memory_usage = f"{memory_usage_bytes / (1024 * 1024):.1f} MB"
        
        # Get processing time from job
        processing_time = "Unknown"
        if job.duration:
            try:
                # Parse duration string like "0:00:05.123456"
                duration_parts = job.duration.split(":")
                if len(duration_parts) >= 3:
                    hours = int(duration_parts[0])
                    minutes = int(duration_parts[1])
                    seconds = float(duration_parts[2])
                    
                    if hours > 0:
                        processing_time = f"{hours}h {minutes}m {seconds:.1f}s"
                    elif minutes > 0:
                        processing_time = f"{minutes}m {seconds:.1f}s"
                    else:
                        processing_time = f"{seconds:.1f}s"
            except:
                pass
        
        # Calculate data density (rows per KB)
        data_density = (row_count / (memory_usage_bytes / 1024)) if memory_usage_bytes > 0 else 0
        if isinstance(data_density, (np.integer, np.floating)):
            data_density = data_density.item()
            
        completion_rate = 100 - null_percentage
        if isinstance(completion_rate, (np.integer, np.floating)):
            completion_rate = completion_rate.item()
        
        return {
            "row_count": row_count,
            "column_count": column_count,
            "null_percentage": null_percentage,
            "memory_usage": memory_usage,
            "processing_time": processing_time,
            "data_density": data_density,
            "completion_rate": completion_rate,
            "error_rate": 0  # Placeholder, could be calculated from data quality checks
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error generating statistics: {str(e)}"
        )

@router.get("/ingestion-download/{ingestion_id}")
async def download_ingestion(
    ingestion_id: str,
    format: str = Query("csv", regex="^(csv|json|parquet)$"),
    current_user: User = Depends(has_permission("ingestion:read")),
    db: Session = Depends(get_db)
):
    """Download ingestion data in specified format"""
    job = get_ingestion_job(db, ingestion_id)
    if not job:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Ingestion not found"
        )
    
    # Check if job is completed
    if job.status != "completed":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Cannot download ingestion with status: {job.status}"
        )
    
    try:
        # Get the parquet file path
        parquet_path = DATA_DIR / f"{ingestion_id}.parquet"
        
        if not os.path.exists(parquet_path):
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Ingestion data file not found"
            )
        
        # Read the parquet file
        df = pd.read_parquet(parquet_path)
        
        # Create a temporary file for the download
        with tempfile.NamedTemporaryFile(delete=False, suffix=f".{format}") as temp_file:
            temp_path = temp_file.name
            
            # Convert to requested format
            if format == "csv":
                df.to_csv(temp_path, index=False)
                media_type = "text/csv"
            elif format == "json":
                df.to_json(temp_path, orient="records", lines=False)
                media_type = "application/json"
            else:  # parquet
                df.to_parquet(temp_path, index=False)
                media_type = "application/octet-stream"
        
        # Log activity
        log_activity(
            db=db,
            username=current_user.username,
            action="Ingestion download",
            details=f"Downloaded ingestion data: {job.name} ({format})"
        )
        
        # Return the file
        return FileResponse(
            path=temp_path,
            filename=f"{job.name}.{format}",
            media_type=media_type,
            background=BackgroundTasks().add_task(lambda: os.unlink(temp_path))
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error downloading ingestion: {str(e)}"
        )

# Original routes from the template - updated to use database
@router.get("/sources", response_model=List[DataSource])
async def get_data_sources(
    current_user: User = Depends(has_permission("data:read")),
    db: Session = Depends(get_db)
):
    # Get real data sources from ingestion jobs
    sources = []
    
    # Query completed jobs
    completed_jobs = db.query(IngestionJob).filter(IngestionJob.status == "completed").all()
    
    # Add sources
    for job in completed_jobs:
        sources.append(
            DataSource(
                id=job.id,
                name=job.name,
                type="File" if job.type == "file" else "Database",
                last_updated=job.end_time.isoformat() if job.end_time else None,
                status="Active"
            )
        )
    
    # If no sources, return empty list
    if not sources:
        return []
    
    return sources

@router.get("/metrics", response_model=DataMetrics)
async def get_data_metrics(
    current_user: User = Depends(has_permission("data:read")),
    db: Session = Depends(get_db)
):
    # Calculate real metrics from ingestion jobs
    total_records = 0
    processed_records = 0
    failed_records = 0
    processing_time = 0.0
    
    # Query jobs
    completed_jobs = db.query(IngestionJob).filter(IngestionJob.status == "completed").all()
    failed_jobs = db.query(IngestionJob).filter(IngestionJob.status == "failed").all()
    
    # Estimate records based on job type
    for job in completed_jobs:
        # In a real system, you would get actual record counts
        # Here we're just estimating based on job type
        if job.type == "file":
            total_records += 10000
            processed_records += 10000
        elif job.type == "database":
            total_records += 5000
            processed_records += 5000
        
        # Calculate processing time
        if job.duration:
            try:
                # Parse duration string like "0:00:05.123456"
                duration_parts = job.duration.split(":")
                hours = int(duration_parts[0])
                minutes = int(duration_parts[1])
                seconds = float(duration_parts[2])
                job_time = hours * 3600 + minutes * 60 + seconds
                processing_time += job_time
            except:
                pass
    
    # Estimate failed records
    for job in failed_jobs:
        if job.type == "file":
            total_records += 10000
            failed_records += 10000
        elif job.type == "database":
            total_records += 5000
            failed_records += 5000
    
    # If no metrics, return default values
    if total_records == 0:
        return DataMetrics(
            total_records=0,
            processed_records=0,
            failed_records=0,
            processing_time=0.0
        )
    
    return DataMetrics(
        total_records=total_records,
        processed_records=processed_records,
        failed_records=failed_records,
        processing_time=round(processing_time, 2)
    )

@router.get("/activities", response_model=List[Activity])
async def get_activities(
    current_user: User = Depends(has_permission("data:read")),
    db: Session = Depends(get_db)
):
    # Get real activities from ingestion jobs
    activities = []
    
    # Query jobs
    jobs = db.query(IngestionJob).all()
    
    # Add job activities
    for job in jobs:
        status = "success" if job.status == "completed" else "error" if job.status == "failed" else "processing"
        
        activities.append(
            Activity(
                id=job.id,
                action=f"{job.type.capitalize()} ingestion: {job.name}",
                time=job.start_time.isoformat(),
                status=status
            )
        )
    
    # Sort activities by time (most recent first)
    sorted_activities = sorted(
        activities, 
        key=lambda x: datetime.fromisoformat(x.time), 
        reverse=True
    )
    
    return sorted_activities

@router.get("/dashboard", response_model=Dict[str, Any])
async def get_dashboard_data(
    current_user: User = Depends(has_permission("data:read")),
    db: Session = Depends(get_db)
):
    # Get real metrics and activities
    metrics = await get_data_metrics(current_user, db)
    activities = await get_activities(current_user, db)
    
    # Query jobs
    completed_jobs = db.query(IngestionJob).filter(IngestionJob.status == "completed").all()
    failed_jobs = db.query(IngestionJob).filter(IngestionJob.status == "failed").all()
    running_jobs = db.query(IngestionJob).filter(IngestionJob.status == "running").all()
    all_jobs = db.query(IngestionJob).all()
    
    # Count job types
    file_jobs = len([job for job in completed_jobs if job.type == "file"])
    db_jobs = len([job for job in completed_jobs if job.type == "database"])
    
    # Create chart data
    chart_data = {
        "bar_chart": [
            file_jobs * 10, 
            db_jobs * 10, 
            0,  # No API jobs 
            len(completed_jobs) * 10, 
            len(failed_jobs) * 10, 
            len(running_jobs) * 10, 
            len(all_jobs) * 5
        ],
        "pie_chart": [
            {"label": "File", "value": max(file_jobs, 1), "color": "#8B5CF6"},
            {"label": "Database", "value": max(db_jobs, 1), "color": "#EC4899"},
            {"label": "Other", "value": 1, "color": "#10B981"}
        ],
        "line_chart": {
            "current": [
                len(completed_jobs), 
                len(completed_jobs) + len(failed_jobs), 
                len(completed_jobs) + len(failed_jobs) + len(running_jobs), 
                len(all_jobs), 
                len(all_jobs) + 2, 
                len(all_jobs) + 5
            ],
            "previous": [
                max(len(completed_jobs) - 2, 0), 
                max(len(completed_jobs) + len(failed_jobs) - 3, 0), 
                max(len(completed_jobs) + len(failed_jobs) + len(running_jobs) - 4, 0), 
                max(len(all_jobs) - 5, 0), 
                max(len(all_jobs) - 3, 0), 
                max(len(all_jobs) - 1, 0)
            ]
        }
    }
    
    return {
        "metrics": metrics.dict(),
        "recent_activities": [a.dict() for a in sorted(
            activities, 
            key=lambda x: datetime.fromisoformat(x.time), 
            reverse=True
        )[:4]],
        "chart_data": chart_data
    }

@router.get("/file-history", status_code=status.HTTP_200_OK)
async def get_file_history(
    page: int = Query(1, ge=1),
    limit: int = Query(10, ge=1, le=100),
    current_user: User = Depends(has_permission("data:read")),
    db: Session = Depends(get_db)
):
    """Get history of uploaded files"""
    try:
        # Build query
        query = db.query(UploadedFile)
        
        # Apply sorting (newest first)
        query = query.order_by(UploadedFile.uploaded_at.desc())
        
        # Get total count
        total_files = query.count()
        
        # Apply pagination
        offset = (page - 1) * limit
        query = query.offset(offset).limit(limit)
        
        # Execute query
        files = query.all()
        
        # Convert to response format
        paginated_files = []
        for file in files:
            paginated_files.append({
                "id": file.id,
                "filename": file.filename,
                "type": file.type,
                "size": os.path.getsize(file.path) if os.path.exists(file.path) else 0,
                "uploaded_at": file.uploaded_at.isoformat(),
                "uploaded_by": file.uploaded_by,
                "preview_url": f"/api/datapuur/preview/{file.id}",
                "download_url": f"/api/datapuur/download/{file.id}",
                "status": "available"
            })
        
        # Log activity
        log_activity(
            db=db,
            username=current_user.username,
            action="View file history",
            details=f"Viewed file upload history (page {page})"
        )
        
        return {
            "files": paginated_files,
            "total": total_files,
            "page": page,
            "limit": limit
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error fetching file history: {str(e)}"
        )

@router.get("/preview/{file_id}", status_code=status.HTTP_200_OK)
async def preview_file(
    file_id: str,
    current_user: User = Depends(has_permission("data:read")),
    db: Session = Depends(get_db)
):
    """Preview a file"""
    file_info = get_uploaded_file(db, file_id)
    if not file_info:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="File not found"
        )
    
    file_path = file_info.path
    
    if not os.path.exists(file_path):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="File not found on disk"
        )
    
    try:
        # For CSV files
        if file_info.type == "csv":
            # Read first 10 rows
            with open(file_path, 'r', newline='', encoding='utf-8') as csvfile:
                reader = csv.reader(csvfile)
                headers = next(reader)
                rows = []
                for i, row in enumerate(reader):
                    if i >= 10:  # Limit to 10 rows
                        break
                    rows.append(row)
            
            # Log activity
            log_activity(
                db=db,
                username=current_user.username,
                action="File preview",
                details=f"Previewed file: {file_info.filename}"
            )
            
            return {
                "headers": headers,
                "rows": rows,
                "filename": file_info.filename,
                "type": "csv"
            }
        
        # For JSON files
        elif file_info.type == "json":
            with open(file_path, 'r', encoding='utf-8') as jsonfile:
                data = json.load(jsonfile)
            
            # If it's an array, limit to first 10 items
            if isinstance(data, list):
                preview_data = data[:10]
            else:
                preview_data = data
            
            # Log activity
            log_activity(
                db=db,
                username=current_user.username,
                action="File preview",
                details=f"Previewed file: {file_info.filename}"
            )
            
            return {
                "data": preview_data,
                "filename": file_info.filename,
                "type": "json"
            }
        
        else:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Unsupported file type for preview"
            )
    
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error previewing file: {str(e)}"
        )

@router.get("/download/{file_id}", status_code=status.HTTP_200_OK)
async def download_file(
    file_id: str,
    current_user: User = Depends(has_permission("data:read")),
    db: Session = Depends(get_db)
):
    """Download a file"""
    file_info = get_uploaded_file(db, file_id)
    if not file_info:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="File not found"
        )
    
    file_path = file_info.path
    
    if not os.path.exists(file_path):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="File not found on disk"
        )
    
    try:
        # Log activity
        log_activity(
            db=db,
            username=current_user.username,
            action="File download",
            details=f"Downloaded file: {file_info.filename}"
        )
        
        return FileResponse(
            path=file_path,
            filename=file_info.filename,
            media_type="application/octet-stream"
        )
    
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error downloading file: {str(e)}"
        )

# Create data directory if it doesn't exist
DATA_DIR.mkdir(exist_ok=True)
