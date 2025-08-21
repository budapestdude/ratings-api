#!/bin/bash

echo "Creating database with only current (August 2025) ratings..."

sqlite3 data/fide_ratings.db <<'EOF'
ATTACH 'data/fide_ratings_current.db' AS curr;

-- Create tables with structure
CREATE TABLE curr.players AS 
SELECT * FROM players;

-- Only keep the latest ratings (August 2025)
CREATE TABLE curr.ratings AS 
SELECT * FROM ratings 
WHERE rating_date = '20250801';

CREATE TABLE curr.rating_lists AS 
SELECT * FROM rating_lists
WHERE list_date >= '20250801';

-- Create indexes
CREATE INDEX curr.idx_players_fide_id ON players(fide_id);
CREATE INDEX curr.idx_players_name ON players(name);
CREATE INDEX curr.idx_ratings_fide_id ON ratings(fide_id);

DETACH curr;
EOF

echo "Checking current database size..."
ls -lh data/fide_ratings_current.db

echo "Checking record counts..."
sqlite3 data/fide_ratings_current.db <<'EOF'
SELECT 'Players:', COUNT(*) FROM players
UNION ALL
SELECT 'Current Ratings:', COUNT(*) FROM ratings
UNION ALL
SELECT 'Active Players:', COUNT(DISTINCT fide_id) FROM ratings;
EOF

echo "Done! Current database created at data/fide_ratings_current.db"