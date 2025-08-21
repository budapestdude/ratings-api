#!/usr/bin/env bash
# Build script for Render deployment

set -e  # Exit on error

echo "🚀 Starting Render build process..."

# Install backend dependencies
echo "📦 Installing backend dependencies..."
npm ci

# Build backend
echo "🔨 Building backend..."
npm run build

# Install and build client
echo "📦 Installing client dependencies..."
cd client
npm ci

echo "🎨 Building client..."
npm run build

cd ..

# Create data directory if it doesn't exist
echo "📁 Setting up data directory..."
mkdir -p /var/data

echo "✅ Build complete!"