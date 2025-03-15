#!/bin/bash
# Build the Next.js app
echo "Building Next.js frontend..."
npx next build

# Create the static directory in the API folder if it doesn't exist
mkdir -p api/static

# Copy the built files to the API static directory
echo "Copying built files to API static directory..."
cp -r out/* api/static/

echo "Frontend build complete and copied to API static directory!"

