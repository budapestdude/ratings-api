import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';
import cron from 'node-cron';
import path from 'path';
import { initDatabaseAdapter, getDatabaseAdapter } from './database/adapter';
import playersRouter from './routes/players';
import rankingsRouter from './routes/rankings';
import { RatingImporter } from './services/ratingImporter';
import { initSampleData } from './scripts/init-sample-data';

// Load environment variables based on NODE_ENV
if (process.env.NODE_ENV === 'production') {
    dotenv.config({ path: '.env.production' });
} else {
    dotenv.config();
}

const app = express();
const PORT = process.env.PORT || 3000;

// Trust proxy for Render/Railway deployments
app.set('trust proxy', 1);

const limiter = rateLimit({
    windowMs: parseInt(process.env.API_RATE_WINDOW_MS || '60000'),
    max: parseInt(process.env.API_RATE_LIMIT || '100'),
    message: 'Too many requests from this IP, please try again later.',
    standardHeaders: true,
    legacyHeaders: false
});

// Configure Helmet with CSP for Next.js
app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
            styleSrc: ["'self'", "'unsafe-inline'"],
            imgSrc: ["'self'", "data:", "https:"],
            fontSrc: ["'self'", "data:"],
            connectSrc: ["'self'"],
            objectSrc: ["'none'"],
            mediaSrc: ["'self'"],
            frameSrc: ["'none'"],
        },
    },
    crossOriginEmbedderPolicy: false,
}));

// Configure CORS for production
const corsOptions = {
    origin: process.env.CORS_ORIGIN || '*',
    optionsSuccessStatus: 200
};
app.use(cors(corsOptions));

app.use(compression());
app.use(express.json());
app.use('/api', limiter);

// API routes
app.use('/api/players', playersRouter);
app.use('/api/rankings', rankingsRouter);

app.get('/api/health', async (_, res) => {
    try {
        // Simple health check without database connection
        res.json({
            status: 'healthy',
            timestamp: new Date().toISOString(),
            database: 'not_checked' // Don't check DB in health endpoint to avoid timeout
        });
    } catch (error) {
        res.status(500).json({
            status: 'unhealthy',
            timestamp: new Date().toISOString(),
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});

// Serve static files from Next.js build in production
if (process.env.NODE_ENV === 'production') {
    // Serve Next.js static export
    const clientPath = path.join(__dirname, 'client');

    // Serve static files with proper headers
    app.use(express.static(clientPath, {
        maxAge: '1d',
        setHeaders: (res, path) => {
            if (path.endsWith('.html')) {
                res.setHeader('Cache-Control', 'no-cache');
            }
        }
    }));

    // Serve _next static files
    app.use('/_next', express.static(path.join(clientPath, '_next'), {
        maxAge: '365d',
        immutable: true
    }));

    // Serve index.html for client-side routing
    app.get('*', (req, res) => {
        // Don't serve index.html for API routes
        if (!req.path.startsWith('/api')) {
            res.sendFile(path.join(clientPath, 'index.html'));
        }
    });
}

app.get('/api/status', async (_, res) => {
    try {
        const db = await getDatabaseAdapter();

        // Get database info
        const dbType = process.env.DATABASE_TYPE === 'postgresql' || process.env.DATABASE_URL ? 'PostgreSQL' : 'SQLite';
        const dbPath = dbType === 'SQLite' ? (process.env.DATABASE_PATH || './data/fide_ratings.db') : 'PostgreSQL Database';

        // Get counts from each table
        const playerCount = await db.get('SELECT COUNT(*) as count FROM players').catch(() => ({ count: 0 }));
        const ratingsCount = await db.get('SELECT COUNT(*) as count FROM ratings').catch(() => ({ count: 0 }));

        // Get sample players if any exist
        const samplePlayers = await db.all('SELECT fide_id, name FROM players LIMIT 5').catch(() => []);
        
        res.json({
            success: true,
            database_type: dbType,
            database_path: dbPath,
            data: {
                total_players: playerCount?.count || 0,
                total_ratings: ratingsCount?.count || 0,
                sample_players: samplePlayers
            }
        });
    } catch (error) {
        console.error('Status error:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Database error',
            details: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});

async function startServer() {
    try {
        // Start server first, then initialize database
        app.listen(PORT, () => {
            console.log(`FIDE Rating API server running on port ${PORT}`);
            console.log(`Health check: http://localhost:${PORT}/api/health`);
            console.log(`API documentation available at: http://localhost:${PORT}/api-docs`);
        });

        // Initialize database in background
        console.log('Initializing database...');
        await initDatabaseAdapter();
        console.log('Database initialized');

        // Initialize sample data if database is empty
        try {
            await initSampleData();
        } catch (error) {
            console.error('Warning: Could not initialize sample data:', error instanceof Error ? error.message : String(error));
            console.log('This is normal if using PostgreSQL with existing data');
        }

        const schedule = process.env.UPDATE_SCHEDULE || '0 0 1 * *';
        cron.schedule(schedule, async () => {
            console.log('Running monthly rating update...');
            const importer = new RatingImporter();
            const date = new Date();
            const dateStr = `${date.getFullYear()}${(date.getMonth() + 1).toString().padStart(2, '0')}01`;
            
            try {
                await importer.importRatingList(dateStr);
                console.log('Monthly update completed');
            } catch (error) {
                console.error('Monthly update failed:', error);
            }
        });

    } catch (error) {
        console.error('Failed to initialize:', error instanceof Error ? error.message : String(error));
        // Don't exit - server is already running
    }
}

startServer();

export default app;