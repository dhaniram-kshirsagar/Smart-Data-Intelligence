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
from sqlalchemy import create_engine, MetaData, Table, inspect, desc, func
import requests
import asyncio
import threading
import time
import logging
import pandas as pd
from pydantic import BaseModel, Field
import numpy as np

from .models import User, get_db, ActivityLog, Role
from .auth import get_current_active_user, has_role, log_activity
from .data_models import DataSource, DataMetrics, Activity, DashboardData

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

# In-memory storage for uploaded files and their schemas
uploaded_files = {}

# In-memory storage for ingestion jobs
ingestion_jobs = {}

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

def process_file_ingestion(job_id, file_id, chunk_size):
    """Process file ingestion in a background thread"""
    try:
        # Update job status
        ingestion_jobs[job_id]["status"] = "running"
        ingestion_jobs[job_id]["progress"] = 0
        
        # Get file info
        file_info = uploaded_files.get(file_id)
        if not file_info:
            raise ValueError(f"File with ID {file_id} not found")
        
        file_path = file_info["path"]
        file_type = file_info["type"]
        
        # Create output file path
        output_file = DATA_DIR / f"{job_id}.parquet"
        
        # Process file based on type
        if file_type == "csv":
            # Read CSV in chunks
            chunk_iterator = pd.read_csv(file_path, chunksize=chunk_size)
            total_rows = sum(1 for _ in open(file_path, 'r')) - 1  # Subtract header row
            processed_rows = 0
            
            # Process first chunk
            first_chunk = next(chunk_iterator)
            first_chunk.to_parquet(output_file, index=False)
            processed_rows += len(first_chunk)
            ingestion_jobs[job_id]["progress"] = min(int((processed_rows / total_rows) * 100), 99)
            
            # Process remaining chunks
            for chunk in chunk_iterator:
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
                ingestion_jobs[job_id]["progress"] = min(int((processed_rows / total_rows) * 100), 99)
                time.sleep(0.1)  # Simulate processing time
        
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
                ingestion_jobs[job_id]["progress"] = progress
                time.sleep(0.2)  # Simulate processing time
        
        # Mark job as completed
        ingestion_jobs[job_id]["status"] = "completed"
        ingestion_jobs[job_id]["progress"] = 100
        ingestion_jobs[job_id]["end_time"] = datetime.now().isoformat()
        
        # Calculate duration
        start_time = datetime.fromisoformat(ingestion_jobs[job_id]["start_time"])
        end_time = datetime.fromisoformat(ingestion_jobs[job_id]["end_time"])
        duration = end_time - start_time
        ingestion_jobs[job_id]["duration"] = str(duration)
        
        logger.info(f"File ingestion completed for job {job_id}")
    
    except Exception as e:
        logger.error(f"Error processing file ingestion: {str(e)}")
        ingestion_jobs[job_id]["status"] = "failed"
        ingestion_jobs[job_id]["error"] = str(e)
        ingestion_jobs[job_id]["end_time"] = datetime.now().isoformat()

def process_db_ingestion(job_id, db_type, db_config, chunk_size):
    """Process database ingestion in a background thread"""
    try:
        # Update job status
        ingestion_jobs[job_id]["status"] = "running"
        ingestion_jobs[job_id]["progress"] = 0
        
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
                ingestion_jobs[job_id]["progress"] = min(int((processed_rows / total_rows) * 100), 99)
                
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
            ingestion_jobs[job_id]["status"] = "completed"
            ingestion_jobs[job_id]["progress"] = 100
            ingestion_jobs[job_id]["end_time"] = datetime.now().isoformat()
            
            # Calculate duration
            start_time = datetime.fromisoformat(ingestion_jobs[job_id]["start_time"])
            end_time = datetime.fromisoformat(ingestion_jobs[job_id]["end_time"])
            duration = end_time - start_time
            ingestion_jobs[job_id]["duration"] = str(duration)
            
            logger.info(f"Database ingestion completed for job {job_id}")
        
        finally:
            engine.dispose()
    
    except Exception as e:
        logger.error(f"Error processing database ingestion: {str(e)}")
        ingestion_jobs[job_id]["status"] = "failed"
        ingestion_jobs[job_id]["error"] = str(e)
        ingestion_jobs[job_id]["end_time"] = datetime.now().isoformat()

# API Routes
@router.post("/upload", status_code=status.HTTP_200_OK)
async def upload_file(
    file: UploadFile = File(...),
    chunkSize: int = Form(1000),
    current_user: User = Depends(has_role("researcher"))
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
    
    # Store file info
    uploaded_files[file_id] = {
        "filename": file.filename,
        "path": str(file_path),
        "type": file_ext,
        "uploaded_by": current_user.username,
        "uploaded_at": datetime.now().isoformat(),
        "chunk_size": chunkSize
    }
    
    # Log activity
    log_activity(
        db=next(get_db()),
        username=current_user.username,
        action="File upload",
        details=f"Uploaded file: {file.filename} ({file_ext.upper()})"
    )
    
    return {"file_id": file_id, "message": "File uploaded successfully"}

@router.get("/schema/{file_id}", status_code=status.HTTP_200_OK)
async def get_file_schema(
    file_id: str,
    current_user: User = Depends(has_role("researcher"))
):
    """Get schema for an uploaded file"""
    if file_id not in uploaded_files:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="File not found"
        )
    
    file_info = uploaded_files[file_id]
    file_path = file_info["path"]
    chunk_size = file_info.get("chunk_size", 1000)
    
    try:
        if file_info["type"] == "csv":
            schema = detect_csv_schema(file_path, chunk_size)
        elif file_info["type"] == "json":
            schema = detect_json_schema(file_path, chunk_size)
        else:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Unsupported file type"
            )
        
        # Store schema in file info
        file_info["schema"] = schema
        uploaded_files[file_id] = file_info
        
        # Log activity
        log_activity(
            db=next(get_db()),
            username=current_user.username,
            action="Schema detection",
            details=f"Detected schema for file: {file_info['filename']}"
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
    current_user: User = Depends(has_role("researcher"))
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
            db=next(get_db()),
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
    current_user: User = Depends(has_role("researcher"))
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
            db=next(get_db()),
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
    current_user: User = Depends(has_role("researcher"))
):
    """Start file ingestion job"""
    try:
        file_id = request.file_id
        file_name = request.file_name
        chunk_size = request.chunk_size
        
        # Check if file exists
        if file_id not in uploaded_files:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="File not found"
            )
        
        # Generate job ID
        job_id = str(uuid.uuid4())
        
        # Create job
        ingestion_jobs[job_id] = {
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
        
        # Start background task
        background_tasks.add_task(process_file_ingestion, job_id, file_id, chunk_size)
        
        # Log activity
        log_activity(
            db=next(get_db()),
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
    current_user: User = Depends(has_role("researcher"))
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
        
        # Create job
        ingestion_jobs[job_id] = {
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
        
        # Start background task
        background_tasks.add_task(process_db_ingestion, job_id, db_type, db_config, chunk_size)
        
        # Log activity
        log_activity(
            db=next(get_db()),
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
    current_user: User = Depends(has_role("researcher"))
):
    """Get status of an ingestion job"""
    if job_id not in ingestion_jobs:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Job not found"
        )
    
    return ingestion_jobs[job_id]

@router.post("/cancel-job/{job_id}", status_code=status.HTTP_200_OK)
async def cancel_job(
    job_id: str,
    current_user: User = Depends(has_role("researcher"))
):
    """Cancel an ingestion job"""
    if job_id not in ingestion_jobs:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Job not found"
        )
    
    job = ingestion_jobs[job_id]
    
    # Only cancel running or queued jobs
    if job["status"] not in ["running", "queued"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Cannot cancel job with status: {job['status']}"
        )
    
    # Update job status
    job["status"] = "failed"
    job["error"] = "Job cancelled by user"
    job["end_time"] = datetime.now().isoformat()
    
    # Calculate duration
    start_time = datetime.fromisoformat(job["start_time"])
    end_time = datetime.fromisoformat(job["end_time"])
    duration = end_time - start_time
    job["duration"] = str(duration)
    
    # Log activity
    log_activity(
        db=next(get_db()),
        username=current_user.username,
        action="Job cancelled",
        details=f"Cancelled ingestion job: {job['name']}"
    )
    
    return job

# New endpoints for the history tab
@router.get("/ingestion-history", response_model=IngestionHistoryResponse)
async def get_ingestion_history(
    page: int = Query(1, ge=1),
    limit: int = Query(10, ge=1, le=100),
    sort: str = Query("newest"),
    type: str = Query(""),
    source: str = Query(""),
    status: str = Query(""),
    search: str = Query(""),
    current_user: User = Depends(has_role("researcher"))
):
    """Get history of ingestion jobs with filtering and pagination"""
    try:
        # Convert ingestion jobs to list
        jobs_list = []
        
        for job_id, job in ingestion_jobs.items():
            # Skip jobs that don't match filters
            if type and job["type"] != type:
                continue
                
            if source:
                source_type = "database" if job["type"] == "database" else "file"
                if source_type != source:
                    continue
            
            if status and job.get("status") != status:
                continue
                
            if search:
                search_lower = search.lower()
                if search_lower not in job["name"].lower() and search_lower not in job.get("details", "").lower():
                    continue
            
            # Get file info if it's a file ingestion
            file_info = None
            if job["type"] == "file" and "config" in job and "file_id" in job["config"]:
                file_id = job["config"]["file_id"]
                file_info = uploaded_files.get(file_id)
            
            # Create history item
            history_item = {
                "id": job_id,
                "filename": job["name"],
                "type": "database" if job["type"] == "database" else file_info["type"] if file_info else "unknown",
                "size": os.path.getsize(file_info["path"]) if file_info and os.path.exists(file_info["path"]) else 0,
                "uploaded_at": job["start_time"],
                "uploaded_by": current_user.username,
                "preview_url": f"/api/datapuur/ingestion-preview/{job_id}",
                "download_url": f"/api/datapuur/ingestion-download/{job_id}",
                "status": job["status"] if job["status"] != "queued" else "processing",
                "source_type": "database" if job["type"] == "database" else "file",
            }
            
            # Add database info if it's a database ingestion
            if job["type"] == "database" and "config" in job:
                history_item["database_info"] = {
                    "type": job["config"].get("type", "unknown"),
                    "name": job["config"].get("database", "unknown"),
                    "table": job["config"].get("table", "unknown")
                }
            
            jobs_list.append(history_item)
        
        # Sort the list
        if sort == "newest":
            jobs_list.sort(key=lambda x: x["uploaded_at"], reverse=True)
        else:
            jobs_list.sort(key=lambda x: x["uploaded_at"])
        
        # Calculate total and apply pagination
        total = len(jobs_list)
        offset = (page - 1) * limit
        paginated_list = jobs_list[offset:offset + limit]
        
        # Log activity
        log_activity(
            db=next(get_db()),
            username=current_user.username,
            action="View ingestion history",
            details=f"Viewed ingestion history (page {page})"
        )
        
        return {
            "items": paginated_list,
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
    current_user: User = Depends(has_role("researcher"))
):
    """Get preview data for an ingestion"""
    if ingestion_id not in ingestion_jobs:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Ingestion not found"
        )
    
    job = ingestion_jobs[ingestion_id]
    
    # Check if job is completed
    if job["status"] != "completed":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Cannot preview ingestion with status: {job['status']}"
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
        
        # Limit to first 10 rows for preview
        preview_df = df.head(10)
        
        # Convert to appropriate format based on job type
        if job["type"] == "file":
            file_id = job["config"].get("file_id")
            file_info = uploaded_files.get(file_id, {})
            file_type = file_info.get("type", "unknown")
            
            if file_type == "csv":
                # For CSV, return as list of lists with headers
                headers = preview_df.columns.tolist()
                # Convert NumPy types to Python native types
                rows = []
                for row in preview_df.values:
                    python_row = []
                    for value in row:
                        if isinstance(value, (np.integer, np.floating)):
                            python_row.append(value.item())
                        elif isinstance(value, np.bool_):
                            python_row.append(bool(value))
                        elif pd.isna(value):
                            python_row.append(None)
                        elif isinstance(value, np.ndarray):
                            python_row.append(value.tolist())
                        elif isinstance(value, pd.Timestamp):
                            python_row.append(str(value))
                        else:
                            python_row.append(value)
                    rows.append(python_row)
                
                return {
                    "data": rows,
                    "headers": headers,
                    "filename": job["name"],
                    "type": "csv"
                }
            else:
                # For JSON, return as list of objects
                # Convert DataFrame to dict and handle NumPy types
                records = []
                for record in preview_df.to_dict(orient="records"):
                    python_record = {}
                    for key, value in record.items():
                        if isinstance(value, (np.integer, np.floating)):
                            python_record[key] = value.item()
                        elif isinstance(value, np.bool_):
                            python_record[key] = bool(value)
                        elif pd.isna(value):
                            python_record[key] = None
                        elif isinstance(value, np.ndarray):
                            python_record[key] = value.tolist()
                        elif isinstance(value, pd.Timestamp):
                            python_record[key] = str(value)
                        else:
                            python_record[key] = value
                    records.append(python_record)
                
                return {
                    "data": records,
                    "filename": job["name"],
                    "type": "json"
                }
        else:
            # For database, return as list of objects
            # Convert DataFrame to dict and handle NumPy types
            records = []
            for record in preview_df.to_dict(orient="records"):
                python_record = {}
                for key, value in record.items():
                    if isinstance(value, (np.integer, np.floating)):
                        python_record[key] = value.item()
                    elif isinstance(value, np.bool_):
                        python_record[key] = bool(value)
                    elif pd.isna(value):
                        python_record[key] = None
                    elif isinstance(value, np.ndarray):
                        python_record[key] = value.tolist()
                    elif isinstance(value, pd.Timestamp):
                        python_record[key] = str(value)
                    else:
                        python_record[key] = value
                records.append(python_record)
            
            return {
                "data": records,
                "filename": job["name"],
                "type": "database"
            }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error generating preview: {str(e)}"
        )

@router.get("/ingestion-schema/{ingestion_id}", response_model=SchemaResponse)
async def get_ingestion_schema(
    ingestion_id: str,
    current_user: User = Depends(has_role("researcher"))
):
    """Get schema for an ingestion"""
    if ingestion_id not in ingestion_jobs:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Ingestion not found"
        )
    
    job = ingestion_jobs[ingestion_id]
    
    # Check if job is completed
    if job["status"] != "completed":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Cannot get schema for ingestion with status: {job['status']}"
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
    current_user: User = Depends(has_role("researcher"))
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
            sample = None
            non_null_values = df[column].dropna()
            if not non_null_values.empty:
                sample_value = non_null_values.iloc[0]
                
                # Convert NumPy types to Python native types
                if isinstance(sample_value, (np.integer, np.floating)):
                    sample = sample_value.item()
                elif isinstance(sample_value, np.bool_):
                    sample = bool(sample_value)
                elif pd.api.types.is_datetime64_dtype(dtype):
                    sample = str(sample_value)
                elif isinstance(sample_value, np.ndarray):
                    sample = sample_value.tolist()
                elif isinstance(sample_value, pd.Timestamp):
                    sample = str(sample_value)
                else:
                    sample = sample_value
                    
            columns_info.append({
                "name": column,
                "dtype": str(dtype),
                "nullable": df[column].isna().any(),
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
    current_user: User = Depends(has_role("researcher"))
):
    """Get statistics for an ingestion"""
    if ingestion_id not in ingestion_jobs:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Ingestion not found"
        )
    
    job = ingestion_jobs[ingestion_id]
    
    # Check if job is completed
    if job["status"] != "completed":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Cannot get statistics for ingestion with status: {job['status']}"
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
        if job.get("duration"):
            try:
                # Parse duration string like "0:00:05.123456"
                duration_parts = job["duration"].split(":")
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
    current_user: User = Depends(has_role("researcher"))
):
    """Download ingestion data in specified format"""
    if ingestion_id not in ingestion_jobs:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Ingestion not found"
        )
    
    job = ingestion_jobs[ingestion_id]
    
    # Check if job is completed
    if job["status"] != "completed":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Cannot download ingestion with status: {job['status']}"
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
            db=next(get_db()),
            username=current_user.username,
            action="Ingestion download",
            details=f"Downloaded ingestion data: {job['name']} ({format})"
        )
        
        # Return the file
        return FileResponse(
            path=temp_path,
            filename=f"{job['name']}.{format}",
            media_type=media_type,
            background=BackgroundTasks().add_task(lambda: os.unlink(temp_path))
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error downloading ingestion: {str(e)}"
        )

# Original routes from the template
@router.get("/sources", response_model=List[DataSource])
async def get_data_sources(current_user: User = Depends(has_role("researcher"))):
    # Get real data sources from ingestion jobs
    sources = []
    
    # Add file sources
    for job_id, job in ingestion_jobs.items():
        if job["type"] == "file" and job["status"] == "completed":
            sources.append(
                DataSource(
                    id=job_id,
                    name=job["name"],
                    type="File",
                    last_updated=job["end_time"],
                    status="Active"
                )
            )
        elif job["type"] == "database" and job["status"] == "completed":
            sources.append(
                DataSource(
                    id=job_id,
                    name=job["name"],
                    type="Database",
                    last_updated=job["end_time"],
                    status="Active"
                )
            )
    
    # If no sources, return empty list
    if not sources:
        return []
    
    return sources

@router.get("/metrics", response_model=DataMetrics)
async def get_data_metrics(current_user: User = Depends(has_role("researcher"))):
    # Calculate real metrics from ingestion jobs
    total_records = 0
    processed_records = 0
    failed_records = 0
    processing_time = 0.0
    
    # Count completed jobs
    completed_jobs = [job for job_id, job in ingestion_jobs.items() if job["status"] == "completed"]
    failed_jobs = [job for job_id, job in ingestion_jobs.items() if job["status"] == "failed"]
    
    # Estimate records based on job type
    for job in completed_jobs:
        # In a real system, you would get actual record counts
        # Here we're just estimating based on job type
        if job["type"] == "file":
            total_records += 10000
            processed_records += 10000
        elif job["type"] == "database":
            total_records += 5000
            processed_records += 5000
        
        # Calculate processing time
        if job["duration"]:
            try:
                # Parse duration string like "0:00:05.123456"
                duration_parts = job["duration"].split(":")
                hours = int(duration_parts[0])
                minutes = int(duration_parts[1])
                seconds = float(duration_parts[2])
                job_time = hours * 3600 + minutes * 60 + seconds
                processing_time += job_time
            except:
                pass
    
    # Estimate failed records
    for job in failed_jobs:
        if job["type"] == "file":
            total_records += 10000
            failed_records += 10000
        elif job["type"] == "database":
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
async def get_activities(current_user: User = Depends(has_role("researcher"))):
    # Get real activities from ingestion jobs
    activities = []
    
    # Add job activities
    for job_id, job in ingestion_jobs.items():
        status = "success" if job["status"] == "completed" else "error" if job["status"] == "failed" else "processing"
        
        activities.append(
            Activity(
                id=job_id,
                action=f"{job['type'].capitalize()} ingestion: {job['name']}",
                time=job["start_time"],
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
async def get_dashboard_data(current_user: User = Depends(has_role("researcher"))):
    # Get real metrics and activities
    metrics = await get_data_metrics(current_user)
    activities = await get_activities(current_user)
    
    # Generate chart data based on real jobs
    completed_jobs = [job for job_id, job in ingestion_jobs.items() if job["status"] == "completed"]
    failed_jobs = [job for job_id, job in ingestion_jobs.items() if job["status"] == "failed"]
    running_jobs = [job for job_id, job in ingestion_jobs.items() if job["status"] == "running"]
    
    # Count job types
    file_jobs = len([job for job in completed_jobs if job["type"] == "file"])
    db_jobs = len([job for job in completed_jobs if job["type"] == "database"])
    
    # Create chart data
    chart_data = {
        "bar_chart": [
            file_jobs * 10, 
            db_jobs * 10, 
            0,  # No API jobs 
            len(completed_jobs) * 10, 
            len(failed_jobs) * 10, 
            len(running_jobs) * 10, 
            len(ingestion_jobs) * 5
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
                len(ingestion_jobs), 
                len(ingestion_jobs) + 2, 
                len(ingestion_jobs) + 5
            ],
            "previous": [
                max(len(completed_jobs) - 2, 0), 
                max(len(completed_jobs) + len(failed_jobs) - 3, 0), 
                max(len(completed_jobs) + len(failed_jobs) + len(running_jobs) - 4, 0), 
                max(len(ingestion_jobs) - 5, 0), 
                max(len(ingestion_jobs) - 3, 0), 
                max(len(ingestion_jobs) - 1, 0)
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
    current_user: User = Depends(has_role("researcher"))
):
    """Get history of uploaded files"""
    try:
        # Calculate offset for pagination
        offset = (page - 1) * limit
        
        # Get total count of files
        total_files = len(uploaded_files)
        
        # Get files for current page
        paginated_files = []
        
        # Convert dictionary to list and sort by upload time (newest first)
        files_list = sorted(
            [
                {
                    "id": file_id,
                    "filename": info["filename"],
                    "type": info["type"],
                    "size": os.path.getsize(info["path"]) if os.path.exists(info["path"]) else 0,
                    "uploaded_at": info["uploaded_at"],
                    "uploaded_by": info["uploaded_by"],
                    "preview_url": f"/api/datapuur/preview/{file_id}",
                    "download_url": f"/api/datapuur/download/{file_id}",
                    "status": "available"
                }
                for file_id, info in uploaded_files.items()
            ],
            key=lambda x: x["uploaded_at"],
            reverse=True
        )
        
        # Apply pagination
        paginated_files = files_list[offset:offset + limit]
        
        # Log activity
        log_activity(
            db=next(get_db()),
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
    current_user: User = Depends(has_role("researcher"))
):
    """Preview a file"""
    if file_id not in uploaded_files:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="File not found"
        )
    
    file_info = uploaded_files[file_id]
    file_path = file_info["path"]
    
    if not os.path.exists(file_path):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="File not found on disk"
        )
    
    try:
        # For CSV files
        if file_info["type"] == "csv":
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
                db=next(get_db()),
                username=current_user.username,
                action="File preview",
                details=f"Previewed file: {file_info['filename']}"
            )
            
            return {
                "headers": headers,
                "rows": rows,
                "filename": file_info["filename"],
                "type": "csv"
            }
        
        # For JSON files
        elif file_info["type"] == "json":
            with open(file_path, 'r', encoding='utf-8') as jsonfile:
                data = json.load(jsonfile)
            
            # If it's an array, limit to first 10 items
            if isinstance(data, list):
                preview_data = data[:10]
            else:
                preview_data = data
            
            # Log activity
            log_activity(
                db=next(get_db()),
                username=current_user.username,
                action="File preview",
                details=f"Previewed file: {file_info['filename']}"
            )
            
            return {
                "data": preview_data,
                "filename": file_info["filename"],
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
    current_user: User = Depends(has_role("researcher"))
):
    """Download a file"""
    if file_id not in uploaded_files:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="File not found"
        )
    
    file_info = uploaded_files[file_id]
    file_path = file_info["path"]
    
    if not os.path.exists(file_path):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="File not found on disk"
        )
    
    try:
        # Log activity
        log_activity(
            db=next(get_db()),
            username=current_user.username,
            action="File download",
            details=f"Downloaded file: {file_info['filename']}"
        )
        
        return FileResponse(
            path=file_path,
            filename=file_info["filename"],
            media_type="application/octet-stream"
        )
    
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error downloading file: {str(e)}"
        )

# Create data directory if it doesn't exist
DATA_DIR.mkdir(exist_ok=True)
