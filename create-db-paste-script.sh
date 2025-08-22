#!/bin/bash

echo "Creating a script you can paste into Render Shell..."

# First, let's create a smaller database with just top players for testing
sqlite3 data/fide_ratings_current.db <<'EOF' > /dev/null 2>&1
ATTACH 'data/top_players.db' AS top;

CREATE TABLE top.players AS 
SELECT * FROM players 
WHERE fide_id IN (
    SELECT fide_id FROM ratings 
    WHERE standard_rating > 2700 
       OR rapid_rating > 2700 
       OR blitz_rating > 2700
);

CREATE TABLE top.ratings AS 
SELECT * FROM ratings 
WHERE fide_id IN (SELECT fide_id FROM top.players);

CREATE TABLE top.rating_lists AS 
SELECT * FROM rating_lists LIMIT 1;

CREATE INDEX top.idx_players_fide_id ON players(fide_id);
CREATE INDEX top.idx_ratings_fide_id ON ratings(fide_id);

DETACH top;
EOF

echo "Compressing database..."
gzip -c data/top_players.db > data/top_players.db.gz

SIZE=$(ls -lh data/top_players.db.gz | awk '{print $5}')
echo "Compressed size: $SIZE"

echo "Creating paste script..."

cat > data/paste-to-render.sh << 'OUTER_EOF'
#!/bin/bash
# PASTE THIS ENTIRE SCRIPT INTO RENDER SHELL

echo "Creating FIDE database on Render..."

# Create the database directory
mkdir -p /var/data
cd /var/data

# Create the database from base64
cat > create_db.sh << 'EOF'
#!/bin/bash

# This script will be completed by the next part
echo "Extracting database..."

# The base64 data will be added here
cat << 'DATABASE_END' | base64 -d | gunzip > fide_ratings.db
OUTER_EOF

# Add the base64 encoded database
base64 < data/top_players.db.gz >> data/paste-to-render.sh

cat >> data/paste-to-render.sh << 'OUTER_EOF'
DATABASE_END

echo "Database created!"
sqlite3 fide_ratings.db "SELECT COUNT(*) as 'Total Players:' FROM players;"
EOF

chmod +x create_db.sh
./create_db.sh

echo "✅ Database loaded successfully!"
OUTER_EOF

echo "
✅ Script created!

📋 TO LOAD DATABASE ON RENDER:

1. Go to Render Dashboard → Your Service → Shell tab

2. Copy everything from data/paste-to-render.sh

3. Paste it into the Render shell

4. The database will be created automatically

The script is saved at: data/paste-to-render.sh
"

# Check the size
SCRIPT_SIZE=$(wc -c < data/paste-to-render.sh)
echo "Script size: $(echo "scale=2; $SCRIPT_SIZE/1024" | bc) KB"

if [ $SCRIPT_SIZE -gt 1048576 ]; then
    echo "⚠️  Script is too large for pasting. Use the upload method instead."
fi