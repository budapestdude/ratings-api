import { getDatabase } from '../database';
import * as fs from 'fs/promises';
import * as xml2js from 'xml2js';

async function importFeb2024Standard() {
    const db = await getDatabase();
    const xmlPath = '/Users/michaelduke/My FIDE API/downloads/standard_feb24frl_xml.xml';
    const dateStr = '20240201';
    
    console.log('Parsing February 2024 standard ratings...');
    const xmlContent = await fs.readFile(xmlPath, 'utf-8');
    const parser = new xml2js.Parser();
    const result = await parser.parseStringPromise(xmlContent);
    
    const players = result.playerslist?.player || [];
    console.log(`Found ${players.length} players`);
    
    await db.run('BEGIN TRANSACTION');
    
    let updated = 0;
    let inserted = 0;
    
    for (const p of players) {
        const fideId = parseInt(p.fideid?.[0] || p.fide_id?.[0]);
        const rating = p.rating?.[0] ? parseInt(p.rating[0]) : null;
        const games = p.games?.[0] ? parseInt(p.games[0]) : 0;
        
        if (!fideId || !rating) continue;
        
        // Check if record exists
        const existing = await db.get(
            'SELECT * FROM ratings WHERE fide_id = ? AND rating_date = ?',
            fideId, dateStr
        );
        
        if (existing) {
            // Update with standard rating
            await db.run(
                'UPDATE ratings SET standard_rating = ?, standard_games = ? WHERE fide_id = ? AND rating_date = ?',
                rating, games, fideId, dateStr
            );
            updated++;
        } else {
            // Insert new record
            await db.run(
                `INSERT INTO ratings (fide_id, rating_date, standard_rating, standard_games, rapid_rating, rapid_games, blitz_rating, blitz_games)
                 VALUES (?, ?, ?, ?, NULL, 0, NULL, 0)`,
                fideId, dateStr, rating, games
            );
            inserted++;
        }
        
        if ((updated + inserted) % 10000 === 0) {
            console.log(`Progress: ${updated} updated, ${inserted} inserted...`);
        }
    }
    
    await db.run('COMMIT');
    
    console.log('\n✅ February 2024 standard ratings imported!');
    console.log(`   Updated: ${updated} records`);
    console.log(`   Inserted: ${inserted} records`);
    
    // Verify the fix
    const check = await db.get(
        'SELECT COUNT(*) as count FROM ratings WHERE rating_date = ? AND standard_rating IS NOT NULL',
        dateStr
    );
    console.log(`\n📊 Total February 2024 standard ratings: ${check.count}`);
}

importFeb2024Standard().catch(console.error);