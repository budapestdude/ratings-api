# Importing Real FIDE Data

This guide explains how to import real FIDE rating data into your database.

## Quick Start (Using Pre-built Database)

The easiest way is to use a pre-built SQLite database with all FIDE data:

1. **Download the database** (if available):
   ```bash
   # Replace with actual URL if you have one hosted
   curl -L -o data/fide_ratings.db https://your-database-url.com/fide_ratings.db
   ```

2. **For Railway/Production**:
   - Upload the database file to a cloud service (Google Drive, Dropbox, etc.)
   - Get a direct download link
   - Set the environment variable:
     ```
     FIDE_DATABASE_URL=https://your-direct-download-link
     ```

## Import from FIDE XML Files

### 1. Download FIDE Rating Lists

FIDE publishes rating lists monthly at: http://ratings.fide.com/download.phtml

```bash
# Download standard ratings (example for Nov 2024)
curl -o downloads/standard_nov24frl_xml.zip http://ratings.fide.com/download/standard_nov24frl_xml.zip

# Download rapid & blitz ratings
curl -o downloads/rapid_nov24frl_xml.zip http://ratings.fide.com/download/rapid_nov24frl_xml.zip

# Extract
unzip downloads/standard_nov24frl_xml.zip -d downloads/
unzip downloads/rapid_nov24frl_xml.zip -d downloads/
```

### 2. Import the Data

```bash
# Import standard ratings
npm run import-ratings downloads/standard_nov24frl_xml.xml

# Import rapid/blitz ratings
npm run import-rapid-blitz downloads/rapid_nov24frl_xml.xml
```

### 3. For Historical Data

To build a complete database with historical data:

```bash
# Download multiple months
for month in jan feb mar apr may jun jul aug sep oct nov; do
  curl -o downloads/standard_${month}24frl_xml.zip http://ratings.fide.com/download/standard_${month}24frl_xml.zip
  unzip downloads/standard_${month}24frl_xml.zip -d downloads/
  npm run import-ratings downloads/standard_${month}24frl_xml.xml
done
```

## Using the Import Scripts

### Available Scripts

- `npm run import-ratings [file]` - Import standard ratings from XML
- `npm run update-ratings` - Download and import latest ratings
- `npm run generate-top100` - Generate top 100 snapshots
- `npm run monthly-update` - Run scheduled monthly update
- `npm run migrate:postgres` - Migrate SQLite data to PostgreSQL

### Automatic Updates

The application can automatically update ratings monthly:

1. Set up a cron job or use the built-in scheduler
2. The app will download and import new ratings on the 1st of each month

## Database Schema

The database contains:

- **players**: Basic player information (FIDE ID, name, federation, etc.)
- **ratings**: Historical rating data (standard, rapid, blitz)
- **top100_snapshots**: Monthly snapshots of top players
- **rating_lists**: Metadata about imported rating lists

## For Production (Railway)

### Option 1: Pre-import Data

1. Import all data locally
2. Upload the SQLite database to cloud storage
3. Set `FIDE_DATABASE_URL` in Railway

### Option 2: Use PostgreSQL with Migration

1. Import data locally to SQLite
2. Set up PostgreSQL in Railway
3. Run migration:
   ```bash
   DATABASE_URL=postgresql://... SQLITE_PATH=./data/fide_ratings.db npm run migrate:postgres
   ```

### Option 3: Direct Import to PostgreSQL

1. Set `DATABASE_URL` environment variable
2. Run import scripts - they'll use PostgreSQL automatically

## Data Sources

- **Official FIDE Ratings**: http://ratings.fide.com/
- **Download Page**: http://ratings.fide.com/download.phtml
- **Update Schedule**: Monthly, usually around the 1st of each month

## Troubleshooting

### Memory Issues
If importing large XML files causes memory issues:
```bash
NODE_OPTIONS="--max-old-space-size=4096" npm run import-ratings [file]
```

### Slow Imports
For faster imports with PostgreSQL:
- Use batch inserts (already implemented)
- Temporarily disable indexes during import
- Use `COPY` command for bulk imports

### Missing Data
- Ensure XML files are complete and not corrupted
- Check that both standard and rapid/blitz files are imported
- Verify the period/date matches expected format (YYYYMMDD)

## API Endpoints

After importing data, test with:

```bash
# Get player info
curl http://localhost:3000/api/players/1503014

# Search players
curl http://localhost:3000/api/players/search?name=Carlsen

# Get top players
curl http://localhost:3000/api/rankings/top?limit=10

# Get statistics
curl http://localhost:3000/api/rankings/statistics
```