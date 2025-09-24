#!/bin/bash

echo "Fixing PostgreSQL schema..."

if [ -z "$DATABASE_URL" ]; then
    echo "ERROR: Please set DATABASE_URL"
    echo "Usage: DATABASE_URL='your-url' ./fix-schema.sh"
    exit 1
fi

echo "Adding missing columns to PostgreSQL..."

psql "$DATABASE_URL" <<EOF
-- Add missing columns to players table
ALTER TABLE players ADD COLUMN IF NOT EXISTS birth_year INTEGER;

-- Add missing columns to ratings table
ALTER TABLE ratings ADD COLUMN IF NOT EXISTS rating_date DATE;
ALTER TABLE ratings ADD COLUMN IF NOT EXISTS standard_games INTEGER;

-- Update rating_date from period if it exists
UPDATE ratings SET rating_date =
    CASE
        WHEN period ~ '^\d{8}$' THEN
            TO_DATE(period, 'YYYYMMDD')
        ELSE NULL
    END
WHERE rating_date IS NULL AND period IS NOT NULL;

-- Check schema
\d players
\d ratings

-- Check counts
SELECT 'Players:' as table_name, COUNT(*) as count FROM players
UNION ALL
SELECT 'Ratings:' as table_name, COUNT(*) as count FROM ratings;
EOF

echo "Schema fix completed!"