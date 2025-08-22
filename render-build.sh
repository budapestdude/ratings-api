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

# Check if database exists and has data
if [ -f "/var/data/fide_ratings.db" ]; then
    PLAYER_COUNT=$(sqlite3 /var/data/fide_ratings.db "SELECT COUNT(*) FROM players" 2>/dev/null || echo "0")
    echo "📊 Database has $PLAYER_COUNT players"
    
    # If we only have sample data (less than 100 players), download the full database
    if [ "$PLAYER_COUNT" -lt "100" ]; then
        echo "📥 Only sample data found, downloading full database..."
        wget --no-check-certificate 'https://drive.google.com/uc?export=download&id=1ihWenMkIjmbzFIINzZ1c-VjoFC2pygKS' -O /var/data/fide_ratings_new.db
        
        if [ -f "/var/data/fide_ratings_new.db" ]; then
            mv /var/data/fide_ratings_new.db /var/data/fide_ratings.db
            echo "✅ Full database downloaded successfully!"
        else
            echo "⚠️ Download failed, keeping sample data"
        fi
    fi
else
    echo "📊 No database found"
    echo "📥 Downloading full FIDE database from Google Drive..."
    
    # Download the database from Google Drive
    wget --no-check-certificate 'https://drive.google.com/uc?export=download&id=1ihWenMkIjmbzFIINzZ1c-VjoFC2pygKS' -O /var/data/fide_ratings.db
    
    if [ -f "/var/data/fide_ratings.db" ]; then
        PLAYER_COUNT=$(sqlite3 /var/data/fide_ratings.db "SELECT COUNT(*) FROM players" 2>/dev/null || echo "0")
        echo "✅ Database downloaded! Total players: $PLAYER_COUNT"
    else
        echo "⚠️ Download failed, will use sample data on first start"
    fi
fi

echo "✅ Build complete!"