import dotenv from 'dotenv';
import { getDatabase } from '../database';
import * as fs from 'fs/promises';
import * as xml2js from 'xml2js';
import path from 'path';

dotenv.config();

interface Player {
    fide_id: number;
    name: string;
    title?: string;
    federation?: string;
    sex?: string;
    birth_year?: number;
    rating?: number;
    games?: number;
    rating_type: 'rapid' | 'blitz';
}

async function parseXMLFile(filePath: string, ratingType: 'rapid' | 'blitz'): Promise<Player[]> {
    console.log(`Parsing ${ratingType} XML file: ${filePath}`);
    const xmlContent = await fs.readFile(filePath, 'utf-8');
    const parser = new xml2js.Parser();
    const result = await parser.parseStringPromise(xmlContent);
    
    const players: Player[] = [];
    const playerList = result.playerslist?.player || [];
    
    for (const p of playerList) {
        players.push({
            fide_id: parseInt(p.fideid?.[0] || p.fide_id?.[0]),
            name: p.name?.[0],
            title: p.title?.[0] || null,
            federation: p.country?.[0],
            sex: p.sex?.[0],
            birth_year: p.birthday?.[0] ? parseInt(p.birthday[0]) : null,
            rating: p.rating?.[0] ? parseInt(p.rating[0]) : null,
            games: p.games?.[0] ? parseInt(p.games[0]) : 0,
            rating_type: ratingType
        });
    }
    
    return players;
}

async function updateRapidBlitzRatings(players: Player[], ratingType: 'rapid' | 'blitz') {
    const db = await getDatabase();
    const dateStr = '20250801'; // August 2025
    
    console.log(`Updating ${ratingType} ratings for ${players.length} players...`);
    
    await db.run('BEGIN TRANSACTION');
    
    try {
        let updatedCount = 0;
        let insertedCount = 0;
        
        for (const player of players) {
            if (!player.fide_id || !player.rating) continue;
            
            // Check if rating record exists
            const existing = await db.get(
                'SELECT * FROM ratings WHERE fide_id = ? AND rating_date = ?',
                player.fide_id, dateStr
            );
            
            if (existing) {
                // Update existing record with rapid/blitz data
                if (ratingType === 'rapid') {
                    await db.run(
                        'UPDATE ratings SET rapid_rating = ?, rapid_games = ? WHERE fide_id = ? AND rating_date = ?',
                        player.rating, player.games, player.fide_id, dateStr
                    );
                } else {
                    await db.run(
                        'UPDATE ratings SET blitz_rating = ?, blitz_games = ? WHERE fide_id = ? AND rating_date = ?',
                        player.rating, player.games, player.fide_id, dateStr
                    );
                }
                updatedCount++;
            } else {
                // Insert new rating record
                if (ratingType === 'rapid') {
                    await db.run(
                        `INSERT INTO ratings (fide_id, rating_date, rapid_rating, rapid_games, standard_rating, standard_games, blitz_rating, blitz_games)
                         VALUES (?, ?, ?, ?, NULL, 0, NULL, 0)`,
                        player.fide_id, dateStr, player.rating, player.games
                    );
                } else {
                    await db.run(
                        `INSERT INTO ratings (fide_id, rating_date, blitz_rating, blitz_games, standard_rating, standard_games, rapid_rating, rapid_games)
                         VALUES (?, ?, ?, ?, NULL, 0, NULL, 0)`,
                        player.fide_id, dateStr, player.rating, player.games
                    );
                }
                insertedCount++;
                
                // Also ensure player exists in players table
                const playerExists = await db.get('SELECT fide_id FROM players WHERE fide_id = ?', player.fide_id);
                if (!playerExists) {
                    await db.run(
                        `INSERT INTO players (fide_id, name, title, federation, sex, birth_year, created_at, updated_at)
                         VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
                        player.fide_id, player.name, player.title, player.federation, player.sex, player.birth_year
                    );
                }
            }
            
            if ((updatedCount + insertedCount) % 5000 === 0) {
                console.log(`Progress: ${updatedCount} updated, ${insertedCount} inserted...`);
            }
        }
        
        await db.run('COMMIT');
        console.log(`\n✅ Successfully imported ${ratingType} ratings:`);
        console.log(`   - Updated: ${updatedCount} existing player records`);
        console.log(`   - Inserted: ${insertedCount} new player records`);
        
        return { updated: updatedCount, inserted: insertedCount };
        
    } catch (error) {
        await db.run('ROLLBACK');
        throw error;
    }
}

async function main() {
    console.log('='.repeat(50));
    console.log('IMPORTING RAPID AND BLITZ RATINGS');
    console.log('='.repeat(50));
    console.log('');
    
    const rapidFile = '/Users/michaelduke/My FIDE API/downloads/rapid_aug25frl_xml.xml';
    const blitzFile = '/Users/michaelduke/My FIDE API/downloads/blitz_aug25frl_xml.xml';
    
    try {
        // Import Rapid ratings
        console.log('📊 Processing Rapid ratings...\n');
        const rapidPlayers = await parseXMLFile(rapidFile, 'rapid');
        console.log(`Found ${rapidPlayers.length} players with rapid ratings`);
        const rapidResults = await updateRapidBlitzRatings(rapidPlayers, 'rapid');
        
        console.log('\n' + '='.repeat(50) + '\n');
        
        // Import Blitz ratings
        console.log('⚡ Processing Blitz ratings...\n');
        const blitzPlayers = await parseXMLFile(blitzFile, 'blitz');
        console.log(`Found ${blitzPlayers.length} players with blitz ratings`);
        const blitzResults = await updateRapidBlitzRatings(blitzPlayers, 'blitz');
        
        // Final statistics
        const db = await getDatabase();
        const stats = await db.get(`
            SELECT 
                COUNT(CASE WHEN standard_rating IS NOT NULL THEN 1 END) as standard_count,
                COUNT(CASE WHEN rapid_rating IS NOT NULL THEN 1 END) as rapid_count,
                COUNT(CASE WHEN blitz_rating IS NOT NULL THEN 1 END) as blitz_count
            FROM ratings 
            WHERE rating_date = '20250801'
        `);
        
        console.log('\n' + '='.repeat(50));
        console.log('IMPORT COMPLETE');
        console.log('='.repeat(50));
        console.log('\nFinal database statistics for August 2025:');
        console.log(`   📋 Standard: ${stats.standard_count.toLocaleString()} players`);
        console.log(`   📊 Rapid: ${stats.rapid_count.toLocaleString()} players`);
        console.log(`   ⚡ Blitz: ${stats.blitz_count.toLocaleString()} players`);
        
    } catch (error) {
        console.error('Import failed:', error);
        process.exit(1);
    }
}

if (require.main === module) {
    main();
}