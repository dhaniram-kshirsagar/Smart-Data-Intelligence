from pydantic import BaseModel
from typing import List, Dict, Any, Optional
from datetime import datetime

# DataPuur models
class DataSource(BaseModel):
    id: str
    name: str
    type: str
    last_updated: str
    status: str

class DataMetrics(BaseModel):
    total_records: int
    processed_records: int
    failed_records: int
    processing_time: float

class Activity(BaseModel):
    id: str
    action: str
    time: str
    status: str

# KGInsights models
class GraphNode(BaseModel):
    id: int
    label: str
    type: str
    color: str
    x: float
    y: float

class GraphEdge(BaseModel):
    id: int
    from_node: int
    to_node: int
    label: str

class GraphMetrics(BaseModel):
    total_nodes: int
    total_edges: int
    density: float
    avg_degree: float

# Dashboard models
class DashboardData(BaseModel):
    metrics: DataMetrics
    recent_activities: List[Activity]
    chart_data: Dict[str, Any]

class KGraphDashboard(BaseModel):
    graph: Dict[str, Any]
    metrics: GraphMetrics
    updates: List[Dict[str, str]]

