# Research AI Platform

A modern web application for data processing and knowledge graph visualization.

## Project Structure

- `/app`: Next.js application routes and pages
- `/components`: React components
- `/lib`: Utility functions and API client
- `/api`: FastAPI backend

## Getting Started

### Combined Deployment (Frontend + Backend)

The easiest way to run the application is using the combined deployment:

1. Install dependencies:
   ```bash
   # Install frontend dependencies
   npm install
   
   # Install backend dependencies
   cd api
   pip install -r requirements.txt
   cd ..

