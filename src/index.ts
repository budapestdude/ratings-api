import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';
import cron from 'node-cron';
import path from 'path';
import { initDatabase } from './database';
import playersRouter from './routes/players';
import rankingsRouter from './routes/rankings';
import { RatingImporter } from './services/ratingImporter';

// Load environment variables based on NODE_ENV
if (process.env.NODE_ENV === 'production') {
    dotenv.config({ path: '.env.production' });
} else {
    dotenv.config();
}

const app = express();
const PORT = process.env.PORT || 3000;

const limiter = rateLimit({
    windowMs: parseInt(process.env.API_RATE_WINDOW_MS || '60000'),
    max: parseInt(process.env.API_RATE_LIMIT || '100'),
    message: 'Too many requests from this IP, please try again later.'
});

app.use(helmet());

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

app.get('/api/health', (_, res) => {
    res.json({ status: 'healthy', timestamp: new Date().toISOString() });
});

// Serve static files from Next.js build in production
if (process.env.NODE_ENV === 'production') {
    const clientPath = path.join(__dirname, '../client/out');
    app.use(express.static(clientPath));
    
    // Catch-all route for client-side routing
    app.get('*', (req, res) => {
        if (!req.path.startsWith('/api')) {
            res.sendFile(path.join(clientPath, 'index.html'));
        }
    });
}

app.get('/api/status', async (_, res) => {
    try {
        const db = await initDatabase();
        const lastUpdate = await db.get(`
            SELECT MAX(import_date) as last_update, COUNT(*) as total_lists
            FROM rating_lists
            WHERE status = 'completed'
        `);
        
        const playerCount = await db.get('SELECT COUNT(*) as count FROM players');
        
        res.json({
            success: true,
            data: {
                last_update: lastUpdate?.last_update,
                total_rating_lists: lastUpdate?.total_lists || 0,
                total_players: playerCount?.count || 0
            }
        });
    } catch (error) {
        res.status(500).json({ success: false, error: 'Database error' });
    }
});

async function startServer() {
    try {
        await initDatabase();
        console.log('Database initialized');

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

        app.listen(PORT, () => {
            console.log(`FIDE Rating API server running on port ${PORT}`);
            console.log(`Health check: http://localhost:${PORT}/api/health`);
            console.log(`API documentation available at: http://localhost:${PORT}/api-docs`);
        });
    } catch (error) {
        console.error('Failed to start server:', error);
        process.exit(1);
    }
}

startServer();

export default app;