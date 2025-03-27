import os
import sys
from pathlib import Path

# Add the current directory to the Python path
current_dir = Path(__file__).parent
sys.path.append(str(current_dir))

# Now try to import from the api module
try:
    from api.run import check_static_files
    print("API module imported successfully!")
    
    # Check if static files exist
    has_static = check_static_files()
    
    # Get port from environment variable or use default
    port = int(os.environ.get("PORT", 9090))
    
    print(f"Starting server on port {port}")
    if has_static:
        print("Frontend will be served at http://172.104.129.10:9090")
    print("API will be available at http://172.104.129.10:9090/api")
    
    # Run the FastAPI app with uvicorn
    import uvicorn
    uvicorn.run("api.main:app", host="0.0.0.0", port=port, reload=True)
    
except ImportError as e:
    print(f"Error importing API module: {e}")
    print("\nPossible solutions:")
    print("1. Make sure you're running this script from the project root directory")
    print("2. Check if the 'api' directory exists and contains the required files")
    print("3. Make sure all Python dependencies are installed: pip install -r api/requirements.txt")
    sys.exit(1)

