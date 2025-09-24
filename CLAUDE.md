# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

FIDE Rating API - A comprehensive REST API and web interface for accessing FIDE chess ratings with complete historical data from 2015-2025. The project consists of a TypeScript/Express backend API serving SQLite data (~3GB, 70M+ records) and a Next.js 14 frontend.

## Key Commands

### Development
```bash
# Backend (runs on port 3001)
npm run dev                # Start backend dev server with tsx watch
npm run build              # Compile TypeScript to dist/
npm run lint               # Run ESLint on src/**/*.ts
npm run typecheck          # Run TypeScript type checking

# Frontend (runs on port 3000)
cd client && npm run dev   # Start Next.js dev server
cd client && npm run build # Build Next.js for production

# Both frontend and backend
./build.sh                 # Build everything for production
```

### Database & Data Management
```bash
# Import and update rating data
npm run import-ratings     # Import all FIDE ratings from XML files
npm run generate-top100    # Generate static top 100 rankings
npm run monthly-update     # Run scheduled monthly update
npm run migrate:postgres   # Migrate SQLite to PostgreSQL (for Railway)

# Database initialization
npm run init-sample-data   # Initialize with sample data for testing
```

### Production Deployment
```bash
# Railway deployment
./railway-build.sh         # Railway-specific build script
npm run start:production   # Start production server (NODE_ENV=production)

# Database preparation
./create-lite-db.sh       # Create lightweight DB version
./create-current-db.sh    # Create current ratings only DB
```

### Testing
```bash
npm test                  # Run Jest tests (if configured)
```

## Architecture Overview

### Database Structure
The project uses a database adapter pattern (`src/database/adapter.ts`) supporting both SQLite (local) and PostgreSQL (Railway production):

- **SQLite**: Primary local database at `data/fide_ratings.db`
- **PostgreSQL**: Production database on Railway (uses DATABASE_URL)
- **Tables**:
  - `players`: Current player information and ratings
  - `ratings`: Historical monthly rating records (70M+ rows)
  - `rating_lists`: Metadata for imported rating lists

### Backend API (`src/`)
- **Entry**: `index.ts` - Express server with rate limiting, CORS, helmet security
- **Routes**:
  - `/api/players/*` - Player data, search, history (`routes/players.ts`)
  - `/api/rankings/*` - Top rankings, statistics (`routes/rankings.ts`)
- **Services**: `services/ratingImporter.ts` - FIDE XML import logic
- **Scripts**: `scripts/` - Data import/migration utilities
- **Database**: `database/` - Adapter pattern for SQLite/PostgreSQL

### Frontend (`client/`)
Next.js 14 app with:
- App router architecture in `app/`
- API integration via axios
- Chart.js for rating history visualization
- Tailwind CSS for styling

### Data Import Flow
1. FIDE publishes monthly XML files at `https://ratings.fide.com/download/`
2. Scripts download and unzip to `downloads/` directory
3. XML parsed and imported to database
4. Indexes optimized for query performance

## Environment Configuration

### Required Environment Variables
```env
# Core settings
NODE_ENV=development|production
PORT=3001
DATABASE_PATH=./data/fide_ratings.db   # SQLite path
DATABASE_URL=postgresql://...          # PostgreSQL URL (Railway)

# API settings
CORS_ORIGIN=*                          # Or specific origin in production
API_RATE_WINDOW_MS=60000
API_RATE_LIMIT=100

# Scheduled updates
UPDATE_SCHEDULE=0 0 1 * *              # Cron format
```

### Database Adapter Selection
The system automatically selects the database adapter based on environment:
- If `DATABASE_URL` is set → PostgreSQL
- Otherwise → SQLite at `DATABASE_PATH`

## Important Implementation Details

### Performance Optimizations
- SQLite database has optimized indexes on:
  - `players(fide_id)` - Primary key lookups
  - `players(name)` - Name searches
  - `ratings(fide_id, rating_date)` - History queries
  - Federation and rating range indexes for rankings

### Railway Deployment Specifics
- Uses `railway-build.sh` for custom build process
- Requires PostgreSQL database (Railway Postgres service)
- Health check endpoint at `/api/health`
- Automatic restarts on failure (max 10 retries)

### Data Import Considerations
- Full import takes ~30-60 minutes for all historical data
- XML files are large (~100-500MB each compressed)
- Import scripts handle incremental updates to avoid duplicates
- Monthly updates scheduled via cron

### TypeScript Configuration
- Strict mode enabled
- Target ES2022, CommonJS modules
- Source in `src/`, output to `dist/`
- Scripts excluded from compilation