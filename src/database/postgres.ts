import { Pool } from 'pg';

let pool: Pool | null = null;

export async function initPostgresDatabase(): Promise<Pool> {
    if (pool) return pool;

    const connectionString = process.env.DATABASE_URL;

    if (!connectionString) {
        throw new Error('DATABASE_URL environment variable is not set');
    }

    pool = new Pool({
        connectionString,
        ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
        max: 20,
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 2000,
    });

    // Test the connection
    try {
        await pool.query('SELECT NOW()');
        console.log('PostgreSQL connected successfully');
    } catch (error) {
        console.error('Failed to connect to PostgreSQL:', error);
        throw error;
    }

    // Initialize schema
    try {
        await initSchema(pool);
    } catch (error) {
        console.error('Failed to initialize schema:', error);
    }

    return pool;
}

async function initSchema(pool: Pool) {
    // Create tables if they don't exist
    const queries = [
        `CREATE TABLE IF NOT EXISTS players (
            id SERIAL PRIMARY KEY,
            fide_id INTEGER UNIQUE NOT NULL,
            name VARCHAR(255) NOT NULL,
            federation VARCHAR(10),
            sex VARCHAR(1),
            title VARCHAR(10),
            w_title VARCHAR(10),
            o_title VARCHAR(10),
            foa_title VARCHAR(10),
            rating INTEGER,
            rapid_rating INTEGER,
            blitz_rating INTEGER,
            birthday INTEGER,
            birth_year INTEGER,
            flag VARCHAR(10)
        )`,

        `CREATE TABLE IF NOT EXISTS ratings (
            id SERIAL PRIMARY KEY,
            fide_id INTEGER NOT NULL,
            period VARCHAR(10),
            rating_date DATE,
            standard_rating INTEGER,
            rapid_rating INTEGER,
            blitz_rating INTEGER,
            games INTEGER,
            standard_games INTEGER,
            rapid_games INTEGER,
            blitz_games INTEGER,
            UNIQUE(fide_id, period)
        )`,

        `CREATE TABLE IF NOT EXISTS top100_snapshots (
            id SERIAL PRIMARY KEY,
            category VARCHAR(20) NOT NULL,
            period VARCHAR(10) NOT NULL,
            rank INTEGER NOT NULL,
            fide_id INTEGER NOT NULL,
            name VARCHAR(255) NOT NULL,
            federation VARCHAR(10),
            rating INTEGER NOT NULL,
            title VARCHAR(10),
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            UNIQUE(category, period, rank)
        )`,

        // Create indexes for better performance
        `CREATE INDEX IF NOT EXISTS idx_players_fide_id ON players(fide_id)`,
        `CREATE INDEX IF NOT EXISTS idx_players_rating ON players(rating DESC)`,
        `CREATE INDEX IF NOT EXISTS idx_players_rapid_rating ON players(rapid_rating DESC)`,
        `CREATE INDEX IF NOT EXISTS idx_players_blitz_rating ON players(blitz_rating DESC)`,
        `CREATE INDEX IF NOT EXISTS idx_players_federation ON players(federation)`,
        `CREATE INDEX IF NOT EXISTS idx_ratings_fide_id ON ratings(fide_id)`,
        `CREATE INDEX IF NOT EXISTS idx_ratings_period ON ratings(period)`,
        `CREATE INDEX IF NOT EXISTS idx_top100_category_period ON top100_snapshots(category, period)`
    ];

    for (const query of queries) {
        try {
            await pool.query(query);
        } catch (error) {
            console.error('Error executing query:', query.substring(0, 50), error);
        }
    }
}

export async function getPostgresDatabase(): Promise<Pool> {
    if (!pool) {
        return await initPostgresDatabase();
    }
    return pool;
}

export async function closePostgresDatabase(): Promise<void> {
    if (pool) {
        await pool.end();
        pool = null;
    }
}

// Helper function to convert SQLite queries to PostgreSQL
export function convertToPostgresQuery(query: string, params: any[]): { query: string; params: any[] } {
    // Replace ? placeholders with $1, $2, etc.
    let paramIndex = 1;
    let convertedQuery = query.replace(/\?/g, () => `$${paramIndex++}`);

    // Replace SQLite specific syntax
    convertedQuery = convertedQuery.replace(/LIMIT\s+(\d+)\s+OFFSET\s+(\d+)/gi, 'LIMIT $1 OFFSET $2');

    return { query: convertedQuery, params };
}