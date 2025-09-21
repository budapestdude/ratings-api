#!/bin/bash

echo "================================================"
echo "FIDE Database Migration to Railway PostgreSQL"
echo "================================================"
echo ""

# Check if DATABASE_URL is set
if [ -z "$DATABASE_URL" ]; then
    echo "ERROR: DATABASE_URL environment variable is not set!"
    echo ""
    echo "To get your DATABASE_URL from Railway:"
    echo "1. Go to your Railway project dashboard"
    echo "2. Click on your PostgreSQL service"
    echo "3. Go to the 'Connect' tab"
    echo "4. Copy the DATABASE_URL"
    echo "5. Run this script with:"
    echo "   DATABASE_URL='your-url-here' ./migrate-to-railway.sh"
    echo ""
    exit 1
fi

# Check if SQLite database exists
if [ ! -f "data/fide_ratings.db" ]; then
    echo "ERROR: SQLite database not found at data/fide_ratings.db"
    echo "Please ensure you have imported the FIDE data first."
    exit 1
fi

# Get database stats
echo "Checking source database..."
PLAYER_COUNT=$(sqlite3 data/fide_ratings.db "SELECT COUNT(*) FROM players;" 2>/dev/null || echo "0")
RATING_COUNT=$(sqlite3 data/fide_ratings.db "SELECT COUNT(*) FROM ratings;" 2>/dev/null || echo "0")

echo "Source database contains:"
echo "  - Players: $PLAYER_COUNT"
echo "  - Ratings: $RATING_COUNT"
echo ""

# Confirm before proceeding
echo "This will migrate all data to Railway PostgreSQL."
echo "The process may take 10-30 minutes depending on data size."
echo ""
read -p "Do you want to continue? (y/N): " -n 1 -r
echo ""
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Migration cancelled."
    exit 0
fi

echo ""
echo "Starting migration..."
echo "===================="

# Run the migration
export NODE_ENV=production
export SQLITE_PATH=./data/fide_ratings.db

npm run migrate:postgres

if [ $? -eq 0 ]; then
    echo ""
    echo "================================================"
    echo "✅ Migration completed successfully!"
    echo "================================================"
    echo ""
    echo "Next steps:"
    echo "1. Go to Railway dashboard"
    echo "2. Set these environment variables:"
    echo "   DATABASE_TYPE=postgresql"
    echo "3. Redeploy your application"
    echo ""
    echo "Your app will now use PostgreSQL with all FIDE data!"
else
    echo ""
    echo "❌ Migration failed. Please check the error messages above."
    echo ""
    echo "Common issues:"
    echo "- DATABASE_URL is incorrect"
    echo "- PostgreSQL service is not running"
    echo "- Network connectivity issues"
    exit 1
fi