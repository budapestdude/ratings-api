#!/usr/bin/env bash
# Build script for Render deployment

set -e  # Exit on error

echo "🚀 Starting Render build process..."
echo "Current directory: $(pwd)"
echo "Directory contents:"
ls -la

# Install backend dependencies
echo "📦 Installing backend dependencies..."
npm ci

# Build backend
echo "🔨 Building backend..."
npm run build

# Copy schema file to dist
echo "📄 Copying database schema..."
mkdir -p dist/database
cp src/database/schema.sql dist/database/

# Verify build output
echo "📂 Checking dist directory..."
ls -la dist/
echo "dist/index.js exists: $(test -f dist/index.js && echo 'YES' || echo 'NO')"

# Skip client build for now - deploy API only
echo "📌 Skipping client build - API only deployment"

# Create data directory if it doesn't exist
echo "📁 Setting up data directory..."
mkdir -p /var/data || true

echo "✅ Build complete!"
echo "Final directory structure:"
ls -la dist/