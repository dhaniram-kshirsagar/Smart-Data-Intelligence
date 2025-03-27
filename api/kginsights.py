from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List, Dict, Any
import random

from .models import User, get_db
from .auth import get_current_active_user, has_role, has_permission
from .data_models import GraphNode, GraphEdge, GraphMetrics, KGraphDashboard

# Router
router = APIRouter(prefix="/api/kginsights", tags=["kginsights"])

# Generate sample data
def generate_graph_nodes():
    return [
        GraphNode(id=1, label="Person A", type="Person", color="#8B5CF6", x=150, y=100),
        GraphNode(id=2, label="Person B", type="Person", color="#8B5CF6", x=250, y=150),
        GraphNode(id=3, label="Organization X", type="Organization", color="#EC4899", x=100, y=200),
        GraphNode(id=4, label="Location Y", type="Location", color="#3B82F6", x=200, y=250),
        GraphNode(id=5, label="Event Z", type="Event", color="#10B981", x=300, y=100)
    ]

def generate_graph_edges():
    return [
        GraphEdge(id=1, from_node=1, to_node=2, label="knows"),
        GraphEdge(id=2, from_node=1, to_node=3, label="works at"),
        GraphEdge(id=3, from_node=2, to_node=4, label="lives in"),
        GraphEdge(id=4, from_node=3, to_node=5, label="hosts"),
        GraphEdge(id=5, from_node=4, to_node=5, label="location of")
    ]

def generate_graph_metrics():
    return GraphMetrics(
        total_nodes=1245,
        total_edges=3872,
        density=0.68,
        avg_degree=6.2
    )

def generate_graph_updates():
    return [
        {"action": "Graph updated", "time": "Today at 11:30 AM"},
        {"action": "New nodes added", "time": "Yesterday at 3:45 PM"},
        {"action": "Relationships modified", "time": "2 days ago at 9:20 AM"},
        {"action": "Data source connected", "time": "3 days ago at 2:15 PM"}
    ]

# API Routes
@router.get("/graph", response_model=Dict[str, Any])
async def get_graph_data(current_user: User = Depends(has_permission("kginsights:read"))):
    nodes = generate_graph_nodes()
    edges = generate_graph_edges()
    return {
        "nodes": [node.dict() for node in nodes],
        "edges": [edge.dict() for edge in edges]
    }

@router.get("/metrics", response_model=GraphMetrics)
async def get_graph_metrics(current_user: User = Depends(has_permission("kginsights:read"))):
    return generate_graph_metrics()

@router.get("/updates", response_model=List[Dict[str, str]])
async def get_graph_updates(current_user: User = Depends(has_permission("kginsights:read"))):
    return generate_graph_updates()

@router.get("/dashboard", response_model=Dict[str, Any])
async def get_kgraph_dashboard(current_user: User = Depends(has_permission("kginsights:read"))):
    nodes = generate_graph_nodes()
    edges = generate_graph_edges()
    metrics = generate_graph_metrics()
    updates = generate_graph_updates()
    
    return {
        "graph": {
            "nodes": [node.dict() for node in nodes],
            "edges": [edge.dict() for edge in edges]
        },
        "metrics": metrics.dict(),
        "updates": updates
    }
