#!/bin/bash
# Build script for Railway deployment

echo "Installing backend dependencies..."
npm install

echo "Building backend..."
npm run build

echo "Installing client dependencies..."
cd client
npm install

echo "Building client..."
npm run build

cd ..
echo "Build complete!"