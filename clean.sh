#!/bin/bash

echo "Cleaning static files, cache, and build outputs..."

# Delete Next.js build output
if [ -d ".next" ]; then
    echo "Removing .next directory..."
    rm -rf .next
fi

# Delete static export output
if [ -d "out" ]; then
    echo "Removing out directory..."
    rm -rf out
fi

# Clean static directories - more comprehensive
echo "Cleaning all static directories..."
if [ -d "static" ]; then
    echo "Removing static directory..."
    rm -rf static
fi
if [ -d "public/static" ]; then
    echo "Removing public/static directory..."
    rm -rf public/static
fi
if [ -d "assets" ]; then
    echo "Removing assets directory..."
    rm -rf assets
fi
if [ -d "public/assets" ]; then
    echo "Removing public/assets directory..."
    rm -rf public/assets
fi
if [ -d "public/images" ]; then
    echo "Removing public/images directory..."
    rm -rf public/images
fi
if [ -d "images" ]; then
    echo "Removing images directory..."
    rm -rf images
fi
if [ -d "public" ]; then
    echo "Cleaning public directory static files..."
    rm -f public/*.jpg public/*.jpeg public/*.png public/*.gif public/*.svg public/*.ico public/*.webp public/*.pdf public/*.css 2>/dev/null
fi

# Recreate necessary static directories
echo "Creating essential static directories..."
mkdir -p static

# Clean data directory if it exists and has content
if [ -d "data" ]; then
    echo "Cleaning data directory..."
    rm -rf data
    mkdir -p data
fi

# Clean node_modules (optional - uncomment if you want to remove dependencies)
# echo "Removing node_modules..."
# if [ -d "node_modules" ]; then
#     rm -rf node_modules
# fi

# Clean package lock files
echo "Removing package lock files..."
rm -f package-lock.json yarn.lock

# Clean build artifacts and dist folders
if [ -d "dist" ]; then
    echo "Removing dist directory..."
    rm -rf dist
fi
if [ -d "build" ]; then
    echo "Removing build directory..."
    rm -rf build
fi

# Clean any cache files
echo "Cleaning cache files..."
if [ -d ".vscode" ]; then
    echo "Removing VS Code log files..."
    rm -f .vscode/*.log 2>/dev/null
fi

# Clean npm/yarn cache
echo "Cleaning npm cache..."
npm cache clean --force

# Clean browser cache files if they exist
if [ -d ".cache" ]; then
    echo "Removing .cache directory..."
    rm -rf .cache
fi

# Clean temporary files
if [ -d "temp" ]; then
    echo "Removing temp directory..."
    rm -rf temp
fi
if [ -d "tmp" ]; then
    echo "Removing tmp directory..."
    rm -rf tmp
fi

# Clean any generated files
echo "Cleaning generated files..."
rm -f *.generated.* 2>/dev/null

echo "Cleanup complete!"
echo ""
echo "Note: You may need to run 'npm install' or 'yarn' to reinstall dependencies."
read -p "Press Enter to continue..."
