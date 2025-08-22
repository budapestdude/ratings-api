#!/bin/bash

echo "📦 Preparing database for upload to Render..."

# Check if database exists
if [ ! -f "data/fide_ratings_current.db" ]; then
    echo "❌ Database not found. Creating it first..."
    ./create-current-db.sh
fi

echo "📊 Database info:"
ls -lh data/fide_ratings_current.db

# Split the database into 50MB chunks for easier upload
echo "🔪 Splitting database into chunks..."
split -b 50m data/fide_ratings_current.db data/fide_ratings_chunk_

echo "📦 Created chunks:"
ls -lh data/fide_ratings_chunk_*

# Create a script to reassemble on Render
cat > data/reassemble-db.sh << 'EOF'
#!/bin/bash
# Run this on Render to reassemble the database

echo "🔧 Reassembling database..."
cat fide_ratings_chunk_* > fide_ratings.db
rm fide_ratings_chunk_*

echo "✅ Database reassembled!"
ls -lh fide_ratings.db

echo "🔍 Verifying database..."
sqlite3 fide_ratings.db "SELECT COUNT(*) as 'Total Players:' FROM players;"
EOF

chmod +x data/reassemble-db.sh

echo "
✅ Database prepared for upload!

📋 NEXT STEPS:

1. Upload these files to a file sharing service (WeTransfer, Dropbox, Google Drive):
   - data/fide_ratings_chunk_*
   - data/reassemble-db.sh

2. In Render Shell, download and reassemble:
   cd /var/data
   # Download each chunk (replace URLs)
   wget 'URL_TO_CHUNK_aa' -O fide_ratings_chunk_aa
   wget 'URL_TO_CHUNK_ab' -O fide_ratings_chunk_ab
   wget 'URL_TO_CHUNK_ac' -O fide_ratings_chunk_ac
   wget 'URL_TO_REASSEMBLE_SCRIPT' -O reassemble-db.sh
   
   # Reassemble
   chmod +x reassemble-db.sh
   ./reassemble-db.sh

3. Restart your Render service

Alternative: Use the transfer.sh service (expires in 14 days):
"

# Optional: Upload to transfer.sh automatically
echo "🌐 Uploading to transfer.sh (optional, expires in 14 days)..."
echo "Chunk URLs:"

for chunk in data/fide_ratings_chunk_*; do
    echo "Uploading $(basename $chunk)..."
    curl --upload-file "$chunk" "https://transfer.sh/$(basename $chunk)" 
    echo ""
done

echo "Uploading reassemble script..."
curl --upload-file data/reassemble-db.sh https://transfer.sh/reassemble-db.sh
echo ""

echo "
📝 Save these URLs and use them in Render Shell!
"