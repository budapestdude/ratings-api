#!/bin/bash
set -e

echo "Starting Railway build process..."

# Install dependencies
echo "Installing dependencies..."
npm ci

# Build TypeScript backend
echo "Building backend..."
npm run build

# Build frontend
echo "Building frontend..."
cd client
npm ci
npm run build
cd ..

# Copy client build to dist for serving
echo "Copying frontend build to dist..."
cp -r client/dist dist/client

# Initialize database if it doesn't exist
if [ ! -f "data/fide_ratings.db" ]; then
    echo "Creating database directory..."
    mkdir -p data

    # Check if we have a database URL to download from
    if [ -n "$FIDE_DATABASE_URL" ]; then
        echo "Downloading FIDE database from provided URL..."
        curl -L -o data/fide_ratings.db "$FIDE_DATABASE_URL"
    else
        echo "Initializing database with sample data..."
        npm run init-sample-data
    fi
else
    echo "Database already exists, skipping initialization..."
fi

echo "Build completed successfully!"