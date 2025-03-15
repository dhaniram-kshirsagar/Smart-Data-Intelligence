#!/bin/bash

# Check if the static directory exists
if [ ! -d "api/static" ] || [ ! -f "api/static/index.html" ]; then
  echo "Static files not found. Building frontend..."
  bash build-frontend.sh
fi

# Start the FastAPI server
echo "Starting combined server..."
cd api
python -m api.run

