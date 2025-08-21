# Loading Full FIDE Database on Render

The app starts with 10 sample players. To load the full database with 700k+ players:

## Option 1: Upload Pre-built Database (Fastest)

1. **Download the database** (125MB):
   - [Download fide_ratings_current.db](https://your-storage-url-here)
   - Or create your own using `./create-current-db.sh` locally

2. **Access Render Shell**:
   - Go to your Render service dashboard
   - Click "Shell" tab
   - Run these commands:
   ```bash
   cd /var/data
   # Upload file using Render's file manager or wget
   wget https://your-storage-url/fide_ratings_current.db
   mv fide_ratings_current.db fide_ratings.db
   ```

3. **Restart the service**

## Option 2: Import from FIDE Files

1. **Access Render Shell**
2. **Download and import FIDE data**:
   ```bash
   # Download latest FIDE ratings
   cd /opt/render/project/src
   mkdir -p downloads
   cd downloads
   
   # Download August 2025 ratings
   wget https://ratings.fide.com/download/standard_aug25frl_xml.zip
   wget https://ratings.fide.com/download/rapid_aug25frl_xml.zip
   wget https://ratings.fide.com/download/blitz_aug25frl_xml.zip
   
   # Unzip
   unzip "*.zip"
   
   # Import (this will take ~30 minutes)
   cd ..
   npm run import-ratings
   ```

## Option 3: Use Sample Data Import Scripts

For a quick test with more data:
```bash
npm run init-sample-data  # 10 top players
```

## Database Info

- **Full database**: 7.5GB with all historical data (2015-2025)
- **Current database**: 125MB with latest ratings only
- **Sample database**: <1MB with 10 top players

## Checking Database Status

Visit: `https://your-app.onrender.com/api/status`

This shows:
- Total players
- Total ratings
- Sample players
- Database path

## Notes

- Render's free tier includes 1GB persistent disk
- The full historical database (7.5GB) requires a paid plan
- The current-only database (125MB) fits in free tier
- Database persists across deployments once uploaded