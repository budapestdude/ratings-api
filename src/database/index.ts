import { Database, open } from 'sqlite';
import sqlite3 from 'sqlite3';
import path from 'path';
import fs from 'fs/promises';

let db: Database<sqlite3.Database, sqlite3.Statement> | null = null;

export async function initDatabase(): Promise<Database<sqlite3.Database, sqlite3.Statement>> {
    if (db) return db;

    // Use Render's persistent disk path if available, otherwise local
    const dbPath = process.env.DATABASE_PATH || './data/fide_ratings.db';
    const dbDir = path.dirname(dbPath);

    try {
        await fs.mkdir(dbDir, { recursive: true });
        console.log(`Database directory ensured at: ${dbDir}`);
    } catch (error) {
        console.error('Error creating database directory:', error);
    }

    db = await open({
        filename: dbPath,
        driver: sqlite3.Database
    });

    // Try to load schema file - it should be in dist/database after build
    try {
        const schemaPath = path.join(__dirname, 'schema.sql');
        const schema = await fs.readFile(schemaPath, 'utf-8');
        await db.exec(schema);
    } catch (error) {
        console.log('Schema file not found or already applied:', error instanceof Error ? error.message : String(error));
        // Database might already exist with schema
    }

    return db;
}

export async function getDatabase(): Promise<Database<sqlite3.Database, sqlite3.Statement>> {
    if (!db) {
        return await initDatabase();
    }
    return db;
}

export async function closeDatabase(): Promise<void> {
    if (db) {
        await db.close();
        db = null;
    }
}