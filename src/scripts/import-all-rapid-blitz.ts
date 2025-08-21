import dotenv from 'dotenv';
import { getDatabase } from '../database';
import * as fs from 'fs/promises';
import * as xml2js from 'xml2js';
import path from 'path';
import axios from 'axios';
import { exec } from 'child_process';
import { promisify } from 'util';

dotenv.config();

const execAsync = promisify(exec);

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

async function downloadRatingFile(month: string, year: string, type: 'rapid' | 'blitz'): Promise<string | null> {
    const baseUrl = 'https://ratings.fide.com/download/';
    const fileName = `${type}_${month}${year}frl_xml.zip`;
    const url = `${baseUrl}${fileName}`;
    const downloadPath = `/Users/michaelduke/My FIDE API/downloads/${fileName}`;
    
    try {
        console.log(`Downloading ${url}...`);
        const response = await axios({
            method: 'GET',
            url: url,
            responseType: 'stream',
            timeout: 30000,
            validateStatus: (status) => status < 500
        });

        if (response.status === 404) {
            console.log(`File not found: ${fileName}`);
            return null;
        }

        const writer = await fs.open(downloadPath, 'w');
        const stream = writer.createWriteStream();
        
        response.data.pipe(stream);
        
        await new Promise((resolve, reject) => {
            stream.on('finish', resolve);
            stream.on('error', reject);
        });

        // Extract the zip file
        const extractPath = downloadPath.replace('.zip', '.xml');
        await execAsync(`unzip -o "${downloadPath}" -d "/Users/michaelduke/My FIDE API/downloads/"`);
        
        return extractPath;
    } catch (error: any) {
        console.error(`Failed to download ${fileName}:`, error.message);
        return null;
    }
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

async function updateRapidBlitzRatings(players: Player[], ratingType: 'rapid' | 'blitz', dateStr: string) {
    const db = await getDatabase();
    
    console.log(`Updating ${ratingType} ratings for ${players.length} players for date ${dateStr}...`);
    
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
        console.log(`✅ Successfully imported ${ratingType} ratings for ${dateStr}:`)
        console.log(`   - Updated: ${updatedCount} existing player records`);
        console.log(`   - Inserted: ${insertedCount} new player records`);
        
        return { updated: updatedCount, inserted: insertedCount };
        
    } catch (error) {
        await db.run('ROLLBACK');
        throw error;
    }
}

async function importMonthData(year: number, month: number) {
    const months = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
    const monthName = months[month - 1];
    const yearShort = year.toString().substring(2);
    const dateStr = `${year}${month.toString().padStart(2, '0')}01`;
    
    console.log(`\n📅 Processing ${monthName.toUpperCase()} ${year} (${dateStr})`);
    console.log('='.repeat(50));
    
    // Download and process rapid ratings
    const rapidFile = await downloadRatingFile(monthName, yearShort, 'rapid');
    if (rapidFile && await fs.stat(rapidFile).catch(() => false)) {
        const rapidPlayers = await parseXMLFile(rapidFile, 'rapid');
        await updateRapidBlitzRatings(rapidPlayers, 'rapid', dateStr);
    } else {
        console.log(`⚠️  No rapid ratings available for ${monthName} ${year}`);
    }
    
    // Download and process blitz ratings
    const blitzFile = await downloadRatingFile(monthName, yearShort, 'blitz');
    if (blitzFile && await fs.stat(blitzFile).catch(() => false)) {
        const blitzPlayers = await parseXMLFile(blitzFile, 'blitz');
        await updateRapidBlitzRatings(blitzPlayers, 'blitz', dateStr);
    } else {
        console.log(`⚠️  No blitz ratings available for ${monthName} ${year}`);
    }
}

async function main() {
    console.log('='.repeat(60));
    console.log('IMPORTING ALL HISTORICAL RAPID AND BLITZ RATINGS');
    console.log('='.repeat(60));
    console.log('');
    
    const startYear = 2020; // Rapid/blitz XML files start from 2020
    const currentDate = new Date();
    const currentYear = currentDate.getFullYear();
    const currentMonth = currentDate.getMonth() + 1;
    
    try {
        // Import data month by month
        for (let year = startYear; year <= currentYear; year++) {
            for (let month = 1; month <= 12; month++) {
                // Don't import future months
                if (year === currentYear && month > currentMonth) {
                    break;
                }
                
                // Skip if we already have August 2025 (already imported)
                if (year === 2025 && month === 8) {
                    console.log(`\n📅 Skipping AUG 2025 (already imported)`);
                    continue;
                }
                
                await importMonthData(year, month);
                
                // Add a small delay to avoid overwhelming the server
                await new Promise(resolve => setTimeout(resolve, 1000));
            }
        }
        
        // Final statistics
        const db = await getDatabase();
        const stats = await db.get(`
            SELECT 
                COUNT(DISTINCT fide_id) as total_players,
                COUNT(CASE WHEN rapid_rating IS NOT NULL THEN 1 END) as rapid_records,
                COUNT(CASE WHEN blitz_rating IS NOT NULL THEN 1 END) as blitz_records,
                COUNT(DISTINCT rating_date) as total_months
            FROM ratings 
            WHERE rapid_rating IS NOT NULL OR blitz_rating IS NOT NULL
        `);
        
        console.log('\n' + '='.repeat(60));
        console.log('IMPORT COMPLETE');
        console.log('='.repeat(60));
        console.log('\nFinal database statistics:');
        console.log(`   📊 Total players with rapid/blitz: ${stats.total_players.toLocaleString()}`);
        console.log(`   🏃 Rapid rating records: ${stats.rapid_records.toLocaleString()}`);
        console.log(`   ⚡ Blitz rating records: ${stats.blitz_records.toLocaleString()}`);
        console.log(`   📅 Total months imported: ${stats.total_months}`);
        
    } catch (error) {
        console.error('Import failed:', error);
        process.exit(1);
    }
}

if (require.main === module) {
    main();
}