#!/bin/bash
set -e

echo "Starting Railway build process..."

# Clean npm cache if needed
echo "Cleaning npm cache..."
rm -rf node_modules/.cache 2>/dev/null || true
rm -rf /root/.npm/_logs 2>/dev/null || true

# Install dependencies with clean install
echo "Installing backend dependencies..."
npm ci --prefer-offline --no-audit --omit=dev || npm install --omit=dev

# Build TypeScript backend
echo "Building backend..."
npm run build

# Build frontend
echo "Building frontend..."
cd client

# Clean client cache
rm -rf node_modules/.cache 2>/dev/null || true
rm -rf .next/cache 2>/dev/null || true

# Install client dependencies
echo "Installing frontend dependencies..."
npm ci --prefer-offline --no-audit || npm install

npm run build
cd ..

# Copy client build to dist for serving
echo "Copying frontend build to dist..."
mkdir -p dist
cp -r client/out dist/client

# Initialize database based on type
if [ "$DATABASE_TYPE" = "postgresql" ] || [ -n "$DATABASE_URL" ]; then
    echo "Using PostgreSQL database..."
    # PostgreSQL schema will be created automatically when the app starts
    # If you have SQLite data to migrate, you can run:
    # npm run migrate:postgres
else
    # SQLite initialization
    if [ ! -f "data/fide_ratings.db" ]; then
        echo "Creating database directory..."
        mkdir -p data

        # Check if we have a database URL to download from
        if [ -n "$FIDE_DATABASE_URL" ]; then
            echo "Downloading FIDE database from provided URL..."
            curl -L -o data/fide_ratings.db "$FIDE_DATABASE_URL"
        else
            echo "Initializing SQLite database with sample data..."
            npm run init-sample-data
        fi
    else
        echo "SQLite database already exists, skipping initialization..."
    fi
fi

echo "Build completed successfully!"