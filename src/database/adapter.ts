import { Database } from 'sqlite';
import sqlite3 from 'sqlite3';
import { Pool } from 'pg';
import { initDatabase as initSQLite, getDatabase as getSQLite, closeDatabase as closeSQLite } from './index';
import { initPostgresDatabase, getPostgresDatabase, closePostgresDatabase, convertToPostgresQuery } from './postgres';

export type DatabaseAdapter = {
    query: (sql: string, params?: any[]) => Promise<any>;
    get: (sql: string, params?: any[]) => Promise<any>;
    all: (sql: string, params?: any[]) => Promise<any[]>;
    run: (sql: string, params?: any[]) => Promise<{ changes?: number; lastID?: number }>;
    exec: (sql: string) => Promise<void>;
    close: () => Promise<void>;
};

let adapter: DatabaseAdapter | null = null;
const isPostgres = process.env.DATABASE_TYPE === 'postgresql' || !!process.env.DATABASE_URL;

export async function initDatabaseAdapter(): Promise<DatabaseAdapter> {
    if (adapter) return adapter;

    if (isPostgres) {
        console.log('Using PostgreSQL database');
        const pool = await initPostgresDatabase();
        adapter = createPostgresAdapter(pool);
    } else {
        console.log('Using SQLite database');
        const db = await initSQLite();
        adapter = createSQLiteAdapter(db);
    }

    return adapter;
}

function createSQLiteAdapter(db: Database<sqlite3.Database, sqlite3.Statement>): DatabaseAdapter {
    return {
        query: async (sql: string, params?: any[]) => {
            return await db.all(sql, params);
        },
        get: async (sql: string, params?: any[]) => {
            return await db.get(sql, params);
        },
        all: async (sql: string, params?: any[]) => {
            return await db.all(sql, params);
        },
        run: async (sql: string, params?: any[]) => {
            const result = await db.run(sql, params);
            return {
                changes: result.changes,
                lastID: result.lastID
            };
        },
        exec: async (sql: string) => {
            await db.exec(sql);
        },
        close: async () => {
            await closeSQLite();
        }
    };
}

function createPostgresAdapter(pool: Pool): DatabaseAdapter {
    return {
        query: async (sql: string, params?: any[]) => {
            const { query, params: pgParams } = convertToPostgresQuery(sql, params || []);
            const result = await pool.query(query, pgParams);
            return result.rows;
        },
        get: async (sql: string, params?: any[]) => {
            const { query, params: pgParams } = convertToPostgresQuery(sql, params || []);
            const result = await pool.query(query, pgParams);
            return result.rows[0];
        },
        all: async (sql: string, params?: any[]) => {
            const { query, params: pgParams } = convertToPostgresQuery(sql, params || []);
            const result = await pool.query(query, pgParams);
            return result.rows;
        },
        run: async (sql: string, params?: any[]) => {
            const { query, params: pgParams } = convertToPostgresQuery(sql, params || []);
            const result = await pool.query(query, pgParams);
            return {
                changes: result.rowCount || 0,
                lastID: undefined // PostgreSQL doesn't have this concept like SQLite
            };
        },
        exec: async (sql: string) => {
            await pool.query(sql);
        },
        close: async () => {
            await closePostgresDatabase();
        }
    };
}

export async function getDatabaseAdapter(): Promise<DatabaseAdapter> {
    if (!adapter) {
        return await initDatabaseAdapter();
    }
    return adapter;
}

export async function closeDatabaseAdapter(): Promise<void> {
    if (adapter) {
        await adapter.close();
        adapter = null;
    }
}