# Upload Database to Render - Quick Guide

You have a **125MB database** with 700,000+ players locally. Here's how to get it on Render:

## Method 1: Using Render CLI (Easiest)

```bash
# Install Render CLI if you haven't
brew install render

# Login to Render
render login

# Get your service ID from Render dashboard URL
# It looks like: srv-xxxxxxxxxxxxx

# SSH into your Render service
render ssh srv-YOUR_SERVICE_ID

# Once connected, in another terminal on your Mac:
# Upload the database directly
scp data/fide_ratings_current.db render:/var/data/fide_ratings.db
```

## Method 2: Using Transfer Service

1. **Upload to file.io (temporary, 14 days)**:
```bash
# On your Mac
curl -F "file=@data/fide_ratings_current.db" https://file.io
# Save the URL it returns
```

2. **Download on Render**:
```bash
# In Render Shell
cd /var/data
wget "THE_FILE_IO_URL" -O fide_ratings.db
```

## Method 3: Using Google Drive

1. Upload `data/fide_ratings_current.db` to Google Drive
2. Get shareable link (make sure it's set to "Anyone with link")
3. Get the file ID from the link (the long string)
4. In Render Shell:

```bash
cd /var/data
FILE_ID="your-google-drive-file-id"
wget "https://drive.google.com/uc?export=download&id=${FILE_ID}" -O fide_ratings.db
```

## Method 4: Using GitHub Release (Permanent)

1. Go to https://github.com/budapestdude/ratings-api/releases
2. Create new release
3. Attach `data/fide_ratings_current.db` as release asset
4. In Render Shell:

```bash
cd /var/data
wget https://github.com/budapestdude/ratings-api/releases/download/v1.0/fide_ratings_current.db
mv fide_ratings_current.db fide_ratings.db
```

## Verify Database

After upload, check it worked:

```bash
sqlite3 /var/data/fide_ratings.db "SELECT COUNT(*) FROM players;"
# Should show: 702911
```

Then restart your service in Render dashboard.

## Quick Test

Visit: `https://your-app.onrender.com/api/status`

Should show:
```json
{
  "total_players": 702911,
  "total_ratings": 690119
}
```

## Note

The database file is at:
- **Local**: `data/fide_ratings_current.db` (125MB)
- **Render**: `/var/data/fide_ratings.db`