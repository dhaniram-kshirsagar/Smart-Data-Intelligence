#!/bin/bash

# Default values
HOST=${HOST:-127.0.0.1}
PORT=${PORT:-9090}

# Parse command line arguments
while [[ "$#" -gt 0 ]]; do
  case $1 in
    --host=*) HOST="${1#*=}"; shift ;;
    --port=*) PORT="${1#*=}"; shift ;;
    *) echo "Unknown parameter: $1"; exit 1 ;;
  esac
done

# Check if the static directory exists
if [ ! -d "api/static" ] || [ ! -f "api/static/index.html" ]; then
  echo "Static files not found. Building frontend..."
  bash build-frontend.sh
fi

# Start the FastAPI server
echo "Starting combined server on ${HOST}:${PORT}..."
HOST=${HOST} PORT=${PORT} python -m api.run
