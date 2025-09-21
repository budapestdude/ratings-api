# Railway PostgreSQL Migration Guide

## Current Status
✅ Your Railway app is now using PostgreSQL
✅ Schema has been fixed and deployed
⏳ Ready to migrate your 700k+ players and 53M+ ratings

## Step 1: Get your DATABASE_URL

### Option A: From Railway Dashboard
1. Go to [Railway Dashboard](https://railway.app/dashboard)
2. Click on your project
3. Click on the **PostgreSQL** service (database icon)
4. Go to the **Connect** tab
5. Copy the **DATABASE_URL** (starts with `postgresql://`)

### Option B: Using Railway CLI
```bash
# If you have Railway CLI installed
railway login
railway link
railway variables
```

## Step 2: Run the Migration

Once you have the DATABASE_URL, run this command locally:

```bash
DATABASE_URL='postgresql://postgres:YOUR-PASSWORD@YOUR-HOST.railway.app:PORT/railway' ./migrate-to-railway.sh
```

Replace the URL with your actual DATABASE_URL from Railway.

## Step 3: Monitor Progress

The migration will show progress like this:
```
Found 702911 players to migrate
Progress: 10000 / 702911 players migrated
Progress: 20000 / 702911 players migrated
...
Found 53619840 ratings to migrate
Progress: 100000 / 53619840 ratings (1%)
Progress: 200000 / 53619840 ratings (2%)
...
```

## Step 4: Set Environment Variable

After migration completes, in Railway:

1. Go to your app service (not the database)
2. Go to **Variables** tab
3. Add: `DATABASE_TYPE=postgresql`
4. Railway will auto-redeploy

## Estimated Time

- Players: ~5-10 minutes
- Ratings: ~25-35 minutes (53M records!)
- Total: ~30-45 minutes

## Troubleshooting

### If migration fails partway:
- The script uses "ON CONFLICT DO NOTHING" so you can safely re-run it
- It will skip already migrated records

### To check migration status:
```bash
# Check how many records are in PostgreSQL
psql $DATABASE_URL -c "SELECT COUNT(*) FROM players;"
psql $DATABASE_URL -c "SELECT COUNT(*) FROM ratings;"
```

### To reset and start over (if needed):
```bash
psql $DATABASE_URL -c "TRUNCATE players, ratings CASCADE;"
```

## After Migration

Your API will serve real FIDE data:
- 700,000+ players
- 53,000,000+ rating records
- Historical data from all your XML files

Test it:
```bash
curl https://your-app.railway.app/api/players/1503014  # Magnus Carlsen
curl https://your-app.railway.app/api/rankings/top?limit=10
```