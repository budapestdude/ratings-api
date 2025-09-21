import { Pool } from 'pg';
import sqlite3 from 'sqlite3';
import { open } from 'sqlite';
import dotenv from 'dotenv';

// Load environment variables
if (process.env.NODE_ENV === 'production') {
    dotenv.config({ path: '.env.production' });
} else {
    dotenv.config();
}

async function migrateFromSQLiteToPostgres() {
    console.log('Starting SQLite to PostgreSQL migration...');

    // Connect to SQLite
    const sqliteDb = await open({
        filename: process.env.SQLITE_PATH || './data/fide_ratings.db',
        driver: sqlite3.Database
    });

    // Connect to PostgreSQL
    const pgPool = new Pool({
        connectionString: process.env.DATABASE_URL,
        ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
    });

    try {
        // Test PostgreSQL connection
        await pgPool.query('SELECT NOW()');
        console.log('Connected to PostgreSQL');

        // Create PostgreSQL schema first
        console.log('Creating PostgreSQL schema...');

        // Create tables
        await pgPool.query(`
            CREATE TABLE IF NOT EXISTS players (
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
            )
        `);

        await pgPool.query(`
            CREATE TABLE IF NOT EXISTS ratings (
                id SERIAL PRIMARY KEY,
                fide_id INTEGER NOT NULL,
                period VARCHAR(10),
                rating_date DATE,
                standard_rating INTEGER,
                rapid_rating INTEGER,
                blitz_rating INTEGER,
                games INTEGER,
                rapid_games INTEGER,
                blitz_games INTEGER,
                standard_games INTEGER
            )
        `);

        // Create indexes
        console.log('Creating indexes...');
        await pgPool.query('CREATE INDEX IF NOT EXISTS idx_players_fide_id ON players(fide_id)');
        await pgPool.query('CREATE INDEX IF NOT EXISTS idx_ratings_fide_id ON ratings(fide_id)');
        await pgPool.query('CREATE INDEX IF NOT EXISTS idx_ratings_date ON ratings(rating_date)');

        // Migrate players table
        console.log('Migrating players...');
        const playerCount = await sqliteDb.get('SELECT COUNT(*) as count FROM players');
        console.log(`Found ${playerCount.count} players to migrate`);

        const batchSize = 500;
        let migrated = 0;

        // Process in batches
        for (let offset = 0; offset < playerCount.count; offset += batchSize) {
            const batch = await sqliteDb.all(`
                SELECT * FROM players
                LIMIT ${batchSize} OFFSET ${offset}
            `);

            if (batch.length === 0) break;

            // Use parameterized queries for safety
            for (const player of batch) {
                try {
                    await pgPool.query(`
                        INSERT INTO players (
                            fide_id, name, federation, sex, title,
                            birth_year, flag
                        ) VALUES ($1, $2, $3, $4, $5, $6, $7)
                        ON CONFLICT (fide_id) DO UPDATE SET
                            name = EXCLUDED.name,
                            federation = EXCLUDED.federation,
                            title = EXCLUDED.title
                    `, [
                        player.fide_id,
                        player.name,
                        player.federation,
                        player.sex,
                        player.title,
                        player.birth_year,
                        player.flag
                    ]);
                    migrated++;
                } catch (err) {
                    // Continue on error for individual records
                    console.error(`Error migrating player ${player.fide_id}:`, err.message);
                }
            }

            if (offset % 10000 === 0 || offset + batchSize >= playerCount.count) {
                console.log(`Progress: ${Math.min(offset + batchSize, playerCount.count)} / ${playerCount.count} players migrated`);
            }
        }

        console.log(`Successfully migrated ${migrated} players`);

        // Migrate ratings table
        console.log('Migrating ratings...');
        const ratingCount = await sqliteDb.get('SELECT COUNT(*) as count FROM ratings');
        console.log(`Found ${ratingCount.count} ratings to migrate`);
        console.log('Note: This will take several minutes due to the large dataset...');

        let ratingsMigrated = 0;
        const ratingBatchSize = 1000;

        // Process ratings in batches
        for (let offset = 0; offset < ratingCount.count; offset += ratingBatchSize) {
            const batch = await sqliteDb.all(`
                SELECT * FROM ratings
                LIMIT ${ratingBatchSize} OFFSET ${offset}
            `);

            if (batch.length === 0) break;

            // Build bulk insert values
            const values = [];
            const placeholders = [];
            let paramIndex = 1;

            for (const rating of batch) {
                placeholders.push(`($${paramIndex}, $${paramIndex+1}, $${paramIndex+2}, $${paramIndex+3}, $${paramIndex+4}, $${paramIndex+5}, $${paramIndex+6}, $${paramIndex+7}, $${paramIndex+8})`);
                values.push(
                    rating.fide_id,
                    rating.rating_date,
                    rating.period || rating.rating_date, // Use rating_date as period if period is null
                    rating.standard_rating,
                    rating.rapid_rating,
                    rating.blitz_rating,
                    rating.standard_games || rating.games,
                    rating.rapid_games,
                    rating.blitz_games
                );
                paramIndex += 9;
            }

            try {
                await pgPool.query(`
                    INSERT INTO ratings (
                        fide_id, rating_date, period,
                        standard_rating, rapid_rating, blitz_rating,
                        standard_games, rapid_games, blitz_games
                    ) VALUES ${placeholders.join(',')}
                    ON CONFLICT DO NOTHING
                `, values);

                ratingsMigrated += batch.length;
            } catch (err) {
                console.error(`Error migrating ratings batch at offset ${offset}:`, err.message);
                // Try individual inserts for this batch
                for (const rating of batch) {
                    try {
                        await pgPool.query(`
                            INSERT INTO ratings (
                                fide_id, rating_date, period,
                                standard_rating, rapid_rating, blitz_rating,
                                standard_games, rapid_games, blitz_games
                            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
                            ON CONFLICT DO NOTHING
                        `, [
                            rating.fide_id,
                            rating.rating_date,
                            rating.period || rating.rating_date,
                            rating.standard_rating,
                            rating.rapid_rating,
                            rating.blitz_rating,
                            rating.standard_games || rating.games,
                            rating.rapid_games,
                            rating.blitz_games
                        ]);
                        ratingsMigrated++;
                    } catch (innerErr) {
                        // Skip individual errors
                    }
                }
            }

            if (offset % 100000 === 0 || offset + ratingBatchSize >= ratingCount.count) {
                const progress = Math.min(offset + ratingBatchSize, ratingCount.count);
                const percentage = Math.round((progress / ratingCount.count) * 100);
                console.log(`Progress: ${progress} / ${ratingCount.count} ratings (${percentage}%)`);
            }
        }

        console.log(`Successfully migrated ${ratingsMigrated} ratings`);

        // Migrate top100_snapshots table
        console.log('Migrating top100_snapshots...');
        const snapshots = await sqliteDb.all('SELECT * FROM top100_snapshots');

        if (snapshots.length > 0) {
            for (const snapshot of snapshots) {
                await pgPool.query(`
                    INSERT INTO top100_snapshots (category, period, rank, fide_id, name, federation, rating, title)
                    VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
                    ON CONFLICT (category, period, rank) DO UPDATE SET
                        fide_id = EXCLUDED.fide_id,
                        name = EXCLUDED.name,
                        federation = EXCLUDED.federation,
                        rating = EXCLUDED.rating,
                        title = EXCLUDED.title
                `, [snapshot.category, snapshot.period, snapshot.rank, snapshot.fide_id,
                    snapshot.name, snapshot.federation, snapshot.rating, snapshot.title]);
            }
            console.log(`Migrated ${snapshots.length} top100 snapshots`);
        }

        console.log('Migration completed successfully!');

    } catch (error) {
        console.error('Migration failed:', error);
        throw error;
    } finally {
        await sqliteDb.close();
        await pgPool.end();
    }
}

// Run migration if this file is executed directly
if (require.main === module) {
    migrateFromSQLiteToPostgres()
        .then(() => process.exit(0))
        .catch((error) => {
            console.error(error);
            process.exit(1);
        });
}

export { migrateFromSQLiteToPostgres };