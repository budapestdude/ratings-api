#!/bin/bash

echo "Creating lightweight database with current ratings only..."

sqlite3 data/fide_ratings.db <<'EOF'
ATTACH 'data/fide_ratings_lite.db' AS lite;

-- Create tables
CREATE TABLE lite.players AS 
SELECT * FROM players;

CREATE TABLE lite.ratings AS 
SELECT * FROM ratings 
WHERE rating_date IN (
    SELECT MAX(rating_date) FROM ratings GROUP BY fide_id
);

CREATE TABLE lite.rating_lists AS 
SELECT * FROM rating_lists;

-- Create indexes
CREATE INDEX lite.idx_players_fide_id ON players(fide_id);
CREATE INDEX lite.idx_ratings_fide_id ON ratings(fide_id);
CREATE INDEX lite.idx_ratings_date ON ratings(rating_date);

DETACH lite;
EOF

echo "Checking lite database size..."
ls -lh data/fide_ratings_lite.db

echo "Checking record counts..."
sqlite3 data/fide_ratings_lite.db <<'EOF'
SELECT 'Players:', COUNT(*) FROM players
UNION ALL
SELECT 'Ratings:', COUNT(*) FROM ratings;
EOF

echo "Done! Lite database created at data/fide_ratings_lite.db"