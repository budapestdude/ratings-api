#!/usr/bin/env bash
# Build script for Render deployment

set -e  # Exit on error

echo "🚀 Starting Render build process..."
echo "Current directory: $(pwd)"

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

# Build client
echo "📦 Installing client dependencies..."
cd client
npm ci

echo "🎨 Building Next.js client..."
npm run build

cd ..

# Verify build outputs
echo "📂 Backend dist directory:"
ls -la dist/
echo "📂 Client out directory:"
ls -la client/out/ | head -20

# Create data directory if it doesn't exist
echo "📁 Setting up data directory..."
mkdir -p /var/data || true

echo "✅ Build complete!"