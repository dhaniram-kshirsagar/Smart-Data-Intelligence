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
    
    # Get port from environment variable or use default
    port = int(os.environ.get("PORT", 8080))
    
    print(f"Starting server on port {port}")
    if has_static:
        print("Frontend will be served at http://localhost:8080")
    print("API will be available at http://localhost:8080/api")
    
    # Run the FastAPI app with uvicorn
    uvicorn.run("api.main:app", host="localhost", port=port, reload=True)

