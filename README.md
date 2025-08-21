# FIDE Rating API

A comprehensive REST API and web interface for accessing FIDE chess ratings with complete historical data from 2015-2025.

## 🌟 Features

- 📊 **Complete Historical Data**: 70+ million rating records from 2015-2025
- 👥 **580,000+ Players**: Comprehensive database of all FIDE-rated players
- ⚡ **Three Rating Types**: Standard, Rapid, and Blitz ratings with full history
- 🔍 **Advanced Search**: Filter by name, federation, title, rating range, age, and activity
- 🌐 **RESTful API**: Well-documented endpoints with interactive explorer
- 📱 **Web Interface**: Responsive React/Next.js frontend with player profiles and rankings
- 📈 **Real-time Updates**: Automatic monthly rating updates via FIDE integration
- 🚀 **Production Ready**: Docker and Railway deployment configurations included

## 🛠️ Tech Stack

- **Backend**: Node.js, TypeScript, Express.js
- **Database**: SQLite with optimized indexes (70.5M+ records)
- **Frontend**: Next.js 14, React, Tailwind CSS, Chart.js
- **Deployment**: Railway/Docker ready with production configurations

## 🚀 Deployment to Railway

### Quick Deploy

1. **Fork this repository**

2. **Create Railway Project**
   ```bash
   railway login
   railway init
   ```

3. **Set Environment Variables** (in Railway dashboard):
   ```env
   NODE_ENV=production
   PORT=3001
   DATABASE_PATH=./data/fide_ratings.db
   CORS_ORIGIN=https://your-app.railway.app
   ```

4. **Deploy**
   ```bash
   railway up
   ```

### Database Setup

The SQLite database (`fide_ratings.db`) contains:
- `players` table: Player information and current ratings
- `ratings` table: Historical monthly ratings (2015-2025)
- `rating_lists` table: Import metadata

> **Note**: The complete database is ~3GB. Use Railway volumes or external storage for production.

## 🐳 Docker Deployment

```bash
# Build image
docker build -t fide-api .

# Run container
docker run -p 3001:3001 -v $(pwd)/data:/app/data fide-api
```

## 💻 Local Development

### Prerequisites
- Node.js 18+
- npm or yarn
- SQLite3

### Setup

1. **Clone repository**
   ```bash
   git clone https://github.com/yourusername/fide-rating-api.git
   cd fide-rating-api
   ```

2. **Install dependencies**
   ```bash
   npm install
   cd client && npm install
   cd ..
   ```

3. **Environment setup**
   ```bash
   cp .env.example .env
   cp client/.env.example client/.env.local
   ```

4. **Start development servers**
   ```bash
   # Terminal 1: Backend
   npm run dev

   # Terminal 2: Frontend
   cd client && npm run dev
   ```

5. **Access the application**
   - Frontend: http://localhost:3000
   - Backend API: http://localhost:3001
   - API Docs: http://localhost:3000/api-docs
   - API Explorer: http://localhost:3000/explorer

## 📚 API Documentation

### Base URL
```
Production: https://your-app.railway.app/api
Development: http://localhost:3001/api
```

### Main Endpoints

#### Players
```http
GET /api/players/{fideId}
GET /api/players/search?name=Carlsen&limit=10
GET /api/players/{fideId}/history?limit=1000
GET /api/players/{fideId}/rating-changes
```

#### Rankings
```http
GET /api/rankings/top?category=standard&limit=100
GET /api/rankings/top?category=rapid&sex=F&excludeInactive=true
GET /api/rankings/statistics
GET /api/rankings/federations
```

### Example Responses

**Get Player**
```json
{
  "success": true,
  "data": {
    "fide_id": 1503014,
    "name": "Carlsen, Magnus",
    "title": "GM",
    "federation": "NOR",
    "standard_rating": 2839,
    "rapid_rating": 2831,
    "blitz_rating": 2887,
    "birth_year": 1990
  }
}
```

## 🗂️ Project Structure

```
fide-rating-api/
├── src/                  # Backend source code
│   ├── routes/          # API endpoints
│   ├── services/        # Business logic
│   ├── scripts/         # Import/update scripts
│   └── index.ts         # Express server
├── client/              # Next.js frontend
│   ├── app/            # App router pages
│   ├── components/     # React components
│   └── lib/           # Utilities
├── data/               # SQLite database
├── downloads/          # FIDE XML files
└── dist/              # Compiled backend
```

## 📊 Database Statistics

- **Total Players**: 582,120
- **Total Rating Records**: 70,500,000+
- **Standard Ratings**: 26.3M records
- **Rapid Ratings**: 15.9M records  
- **Blitz Ratings**: 10.3M records
- **Date Range**: January 2015 - August 2025
- **Database Size**: ~3GB

## 🔧 Environment Variables

### Production
```env
NODE_ENV=production
PORT=3001
DATABASE_PATH=./data/fide_ratings.db
CORS_ORIGIN=https://your-app.railway.app
RATE_LIMIT_WINDOW_MS=60000
RATE_LIMIT_MAX_REQUESTS=100
```

### Development
```env
NODE_ENV=development
PORT=3001
DATABASE_PATH=./data/fide_ratings.db
```

## 📝 Scripts

```bash
# Development
npm run dev              # Start dev server
npm run build           # Build TypeScript
npm run lint            # Run ESLint
npm run typecheck       # Type checking

# Production
npm run start:prod      # Start production server
npm run build:all       # Build backend + frontend

# Data Management
npm run import-ratings  # Import monthly ratings
npm run generate-top100 # Generate static rankings
```

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📄 License

MIT License - see LICENSE file for details

## 🔗 Data Source

Rating data sourced from [FIDE](https://ratings.fide.com) (World Chess Federation)

## 🙏 Acknowledgments

- FIDE for providing chess rating data
- Chess community for continuous support

---

**Built with ❤️ for the chess community**