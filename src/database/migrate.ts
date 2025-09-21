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

        // Migrate players table
        console.log('Migrating players...');
        const players = await sqliteDb.all('SELECT * FROM players');

        if (players.length > 0) {
            for (let i = 0; i < players.length; i += 1000) {
                const batch = players.slice(i, i + 1000);

                const values = batch.map(p =>
                    `(${p.fide_id}, '${p.name.replace(/'/g, "''")}', '${p.federation || ''}', '${p.sex || ''}',
                    '${p.title || ''}', '${p.w_title || ''}', '${p.o_title || ''}', '${p.foa_title || ''}',
                    ${p.rating || 'NULL'}, ${p.rapid_rating || 'NULL'}, ${p.blitz_rating || 'NULL'},
                    ${p.birthday || 'NULL'}, '${p.flag || ''}')`
                ).join(',');

                await pgPool.query(`
                    INSERT INTO players (fide_id, name, federation, sex, title, w_title, o_title, foa_title,
                                       rating, rapid_rating, blitz_rating, birthday, flag)
                    VALUES ${values}
                    ON CONFLICT (fide_id) DO UPDATE SET
                        name = EXCLUDED.name,
                        federation = EXCLUDED.federation,
                        sex = EXCLUDED.sex,
                        title = EXCLUDED.title,
                        w_title = EXCLUDED.w_title,
                        o_title = EXCLUDED.o_title,
                        foa_title = EXCLUDED.foa_title,
                        rating = EXCLUDED.rating,
                        rapid_rating = EXCLUDED.rapid_rating,
                        blitz_rating = EXCLUDED.blitz_rating,
                        birthday = EXCLUDED.birthday,
                        flag = EXCLUDED.flag
                `);

                console.log(`Migrated ${Math.min((i + 1) * 1000, players.length)} / ${players.length} players`);
            }
        }

        // Migrate ratings table
        console.log('Migrating ratings...');
        const ratings = await sqliteDb.all('SELECT * FROM ratings');

        if (ratings.length > 0) {
            for (let i = 0; i < ratings.length; i += 1000) {
                const batch = ratings.slice(i, i + 1000);

                const values = batch.map(r =>
                    `(${r.fide_id}, '${r.period}', ${r.standard_rating || 'NULL'},
                    ${r.rapid_rating || 'NULL'}, ${r.blitz_rating || 'NULL'},
                    ${r.games || 'NULL'}, ${r.rapid_games || 'NULL'}, ${r.blitz_games || 'NULL'})`
                ).join(',');

                await pgPool.query(`
                    INSERT INTO ratings (fide_id, period, standard_rating, rapid_rating, blitz_rating,
                                       games, rapid_games, blitz_games)
                    VALUES ${values}
                    ON CONFLICT (fide_id, period) DO UPDATE SET
                        standard_rating = EXCLUDED.standard_rating,
                        rapid_rating = EXCLUDED.rapid_rating,
                        blitz_rating = EXCLUDED.blitz_rating,
                        games = EXCLUDED.games,
                        rapid_games = EXCLUDED.rapid_games,
                        blitz_games = EXCLUDED.blitz_games
                `);

                console.log(`Migrated ${Math.min((i + 1) * 1000, ratings.length)} / ${ratings.length} ratings`);
            }
        }

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