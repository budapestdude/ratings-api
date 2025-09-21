# Deploying to Railway

This guide explains how to deploy the FIDE Rating API to Railway.

## Prerequisites

1. A [Railway account](https://railway.app)
2. Railway CLI installed (optional): `npm install -g @railway/cli`
3. Your FIDE database file (optional, will use sample data if not provided)

## Deployment Steps

### 1. Create a New Project on Railway

1. Go to [Railway Dashboard](https://railway.app/dashboard)
2. Click "New Project"
3. Choose "Deploy from GitHub repo" and connect your repository
4. Or choose "Empty Project" if deploying via CLI

### 2. Configure Environment Variables

In your Railway project settings, add the following environment variables:

```bash
# Required
NODE_ENV=production
PORT=3000

# Optional - customize as needed
CORS_ORIGIN=https://your-domain.com
API_RATE_WINDOW_MS=60000
API_RATE_LIMIT=100

# Database - if you have a full FIDE database hosted online
FIDE_DATABASE_URL=https://your-database-url.com/fide_ratings.db
```

### 3. Deploy via GitHub (Recommended)

1. Push your code to GitHub:
```bash
git add .
git commit -m "Add Railway configuration"
git push origin main
```

2. Railway will automatically deploy when you push to your connected repository

### 4. Deploy via CLI (Alternative)

If you prefer using the Railway CLI:

```bash
# Login to Railway
railway login

# Initialize project (if not already linked)
railway link

# Deploy
railway up
```

### 5. Set Up Custom Domain (Optional)

1. Go to your Railway project settings
2. Navigate to "Domains"
3. Add your custom domain
4. Update your DNS records as instructed

## Database Setup

### Using PostgreSQL (Recommended for Production)

1. **Add PostgreSQL to your Railway project:**
   - In your Railway project dashboard, click "New Service"
   - Select "Database" → "Add PostgreSQL"
   - Railway will automatically set the `DATABASE_URL` environment variable

2. **Set database type:**
   Add this environment variable in Railway:
   ```
   DATABASE_TYPE=postgresql
   ```

3. **Migrate existing data (if needed):**
   If you have existing SQLite data to migrate:
   ```bash
   # Set both DATABASE_URL and SQLITE_PATH environment variables
   npm run migrate:postgres
   ```

### Using SQLite (Development/Testing)
For development or if you prefer SQLite:
1. Set environment variables:
   ```
   DATABASE_TYPE=sqlite
   DATABASE_PATH=./data/fide_ratings.db
   ```

2. The application will automatically initialize with sample data

## Monitoring & Logs

1. View logs in Railway dashboard under "Deployments"
2. Monitor health at: `https://your-app.railway.app/api/health`
3. Check metrics in Railway's observability tab

## Updating the Database

### Manual Update
```bash
# SSH into your Railway deployment (if shell access is available)
# Or trigger via API endpoint if implemented
npm run monthly-update:now
```

### Automatic Monthly Updates
The application is configured to automatically update ratings on the 1st of each month at 2 AM UTC.

## Troubleshooting

### Build Failures
- Check the build logs in Railway dashboard
- Ensure all dependencies are in `package.json`
- Verify TypeScript compilation: `npm run typecheck`

### Database Issues
- Ensure the `data` directory is created during build
- Check if `FIDE_DATABASE_URL` is accessible
- Verify database initialization logs

### Performance Issues
- Railway provides automatic scaling
- Monitor memory usage in Railway metrics
- Consider upgrading your Railway plan if needed

## Environment-Specific Files

- `.env.railway` - Template for Railway environment variables
- `railway.json` - Railway configuration
- `railway-build.sh` - Custom build script for Railway

## Support

For Railway-specific issues:
- [Railway Documentation](https://docs.railway.app)
- [Railway Discord](https://discord.gg/railway)

For application issues:
- Check the GitHub repository issues
- Review application logs in Railway dashboard