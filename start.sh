#!/usr/bin/env bash
# Start script for Render deployment

echo "🚀 Starting application..."
echo "Current directory: $(pwd)"
echo "Directory contents:"
ls -la
echo ""

if [ -f "dist/index.js" ]; then
    echo "✅ dist/index.js found"
    echo "Starting server..."
    NODE_ENV=production node dist/index.js
else
    echo "❌ dist/index.js not found"
    echo "Looking for it in parent directories..."
    
    if [ -f "../dist/index.js" ]; then
        echo "Found in parent, starting from there"
        cd ..
        NODE_ENV=production node dist/index.js
    elif [ -f "/opt/render/project/src/dist/index.js" ]; then
        echo "Found at absolute path"
        NODE_ENV=production node /opt/render/project/src/dist/index.js
    else
        echo "ERROR: Cannot find dist/index.js anywhere"
        echo "Full directory tree:"
        find /opt/render/project -name "index.js" -type f 2>/dev/null | head -20
        exit 1
    fi
fi