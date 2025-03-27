import uvicorn
import os
import sys
from pathlib import Path

def check_static_files():
    static_dir = Path(__file__).parent / "static"
    if not static_dir.exists() or not (static_dir / "index.html").exists():
        print("Warning: Static files not found. The frontend will not be served.")
        print("Run 'bash build-frontend.sh' to build and copy the frontend files.")
        return False
    return True

if __name__ == "__main__":
    # Check if static files exist
    has_static = check_static_files()
    
    # Get host and port from environment variables or use defaults
    host = os.environ.get("HOST", "127.0.0.1")
    port = int(os.environ.get("PORT", 9090))
    
    print(f"Starting server on {host}:{port}")
    if has_static:
        print(f"Frontend will be served at http://{host}:{port}")
    print(f"API will be available at http://{host}:{port}/api")
    
    # Run the FastAPI app with uvicorn
    uvicorn.run("api.main:app", host=host, port=port, reload=True)
