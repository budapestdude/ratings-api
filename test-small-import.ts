import dotenv from 'dotenv';
import { initDatabase, closeDatabase, getDatabase } from './src/database';
import fs from 'fs/promises';

dotenv.config();

async function testSmallImport() {
    try {
        await initDatabase();
        const db = await getDatabase();
        
        // Read first 100 lines for testing
        const content = await fs.readFile('./data/downloads/standard_rating_list.txt', 'utf-8');
        const lines = content.split('\n').slice(0, 101); // Header + 100 players
        
        console.log('Processing 100 players...');
        
        await db.run('BEGIN TRANSACTION');
        
        for (let i = 1; i < lines.length; i++) {
            const line = lines[i];
            if (!line || line.trim().length === 0) continue;
            
            const fideId = line.substring(0, 15).trim();
            const name = line.substring(15, 76).trim();
            const federation = line.substring(76, 80).trim();
            const sex = line.substring(80, 83).trim();
            const title = line.substring(83, 88).trim();
            const rating = line.substring(113, 118).trim();
            const games = line.substring(118, 123).trim();
            const birthYear = line.substring(127, 132).trim();
            const flag = line.substring(132, 136).trim();
            
            if (!fideId || isNaN(parseInt(fideId))) continue;
            
            // Insert player
            await db.run(`
                INSERT OR REPLACE INTO players (fide_id, name, title, federation, sex, birth_year, flag, updated_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
            `, parseInt(fideId), name, title || null, federation || null, sex || null, 
               birthYear ? parseInt(birthYear) : null, flag || null);
            
            // Insert rating
            await db.run(`
                INSERT OR REPLACE INTO ratings (fide_id, rating_date, standard_rating, standard_games)
                VALUES (?, ?, ?, ?)
            `, parseInt(fideId), '2025-08-01', rating ? parseInt(rating) : null, games ? parseInt(games) : 0);
            
            if (i % 10 === 0) {
                console.log(`Processed ${i} players...`);
            }
        }
        
        await db.run('COMMIT');
        
        // Check results
        const playerCount = await db.get('SELECT COUNT(*) as count FROM players');
        const ratingCount = await db.get('SELECT COUNT(*) as count FROM ratings');
        
        console.log(`Import complete: ${playerCount.count} players, ${ratingCount.count} ratings`);
        
    } catch (error) {
        console.error('Test import failed:', error);
    } finally {
        await closeDatabase();
    }
}

testSmallImport();