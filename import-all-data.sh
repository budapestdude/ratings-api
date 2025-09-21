#!/bin/bash

echo "Starting batch import of all FIDE rating data..."
echo "================================================"

# Counter for progress
total_files=$(ls downloads/*.xml 2>/dev/null | wc -l)
current=0
success=0
failed=0

# Create data directory if it doesn't exist
mkdir -p data

# Import function with error handling
import_file() {
    local file=$1
    local type=$2
    local filename=$(basename "$file")

    echo "[$current/$total_files] Importing $filename ($type)..."

    if [ "$type" == "standard" ]; then
        npm run import-ratings "$file" 2>/dev/null
    else
        npm run import-rapid-blitz "$file" 2>/dev/null
    fi

    if [ $? -eq 0 ]; then
        echo "✓ Successfully imported $filename"
        ((success++))
    else
        echo "✗ Failed to import $filename"
        ((failed++))
    fi
}

# Import standard ratings first (these have the main player data)
echo ""
echo "Phase 1: Importing standard ratings..."
echo "--------------------------------------"
for file in downloads/standard_*.xml; do
    if [ -f "$file" ]; then
        ((current++))
        import_file "$file" "standard"
    fi
done

# Import rapid ratings
echo ""
echo "Phase 2: Importing rapid ratings..."
echo "-----------------------------------"
for file in downloads/rapid_*.xml; do
    if [ -f "$file" ]; then
        ((current++))
        import_file "$file" "rapid"
    fi
done

# Import blitz ratings
echo ""
echo "Phase 3: Importing blitz ratings..."
echo "-----------------------------------"
for file in downloads/blitz_*.xml; do
    if [ -f "$file" ]; then
        ((current++))
        import_file "$file" "blitz"
    fi
done

# Generate top 100 snapshots
echo ""
echo "Phase 4: Generating top 100 snapshots..."
echo "----------------------------------------"
npm run generate-top100

# Summary
echo ""
echo "================================================"
echo "Import Complete!"
echo "================================================"
echo "Total files processed: $total_files"
echo "Successfully imported: $success"
echo "Failed imports: $failed"
echo ""

# Check database status
echo "Checking database status..."
sqlite3 data/fide_ratings.db "SELECT 'Total players:', COUNT(DISTINCT fide_id) FROM players;" 2>/dev/null || \
    echo "Using PostgreSQL database"

sqlite3 data/fide_ratings.db "SELECT 'Total ratings records:', COUNT(*) FROM ratings;" 2>/dev/null || \
    echo "Check PostgreSQL for record count"

echo ""
echo "You can now:"
echo "1. Test locally: npm run dev"
echo "2. Push to Railway: git push origin main"
echo "3. Upload database: See IMPORT_DATA.md for instructions"