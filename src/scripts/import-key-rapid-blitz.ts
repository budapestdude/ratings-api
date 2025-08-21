import dotenv from 'dotenv';
import { getDatabase } from '../database';
import * as fs from 'fs/promises';
import * as xml2js from 'xml2js';
import axios from 'axios';
import { exec } from 'child_process';
import { promisify } from 'util';

dotenv.config();

const execAsync = promisify(exec);

// Import key months: quarterly data for historical perspective
const KEY_MONTHS = [
    { year: 2025, month: 4 },  // April 2025
    { year: 2025, month: 1 },  // January 2025
    { year: 2024, month: 10 }, // October 2024
    { year: 2024, month: 7 },  // July 2024
    { year: 2024, month: 4 },  // April 2024
    { year: 2024, month: 1 },  // January 2024
    { year: 2023, month: 10 }, // October 2023
    { year: 2023, month: 7 },  // July 2023
    { year: 2023, month: 4 },  // April 2023
    { year: 2023, month: 1 },  // January 2023
    { year: 2022, month: 7 },  // July 2022
    { year: 2022, month: 1 },  // January 2022
    { year: 2021, month: 7 },  // July 2021
    { year: 2021, month: 1 },  // January 2021
    { year: 2020, month: 7 },  // July 2020
    { year: 2020, month: 1 },  // January 2020
];

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
        // Check if file already exists
        const extractPath = downloadPath.replace('.zip', '.xml');
        try {
            await fs.stat(extractPath);
            console.log(`  ✓ File already exists locally`);
            return extractPath;
        } catch {
            // File doesn't exist, download it
        }
        
        console.log(`  ⬇️  Downloading ${fileName}...`);
        const response = await axios({
            method: 'GET',
            url: url,
            responseType: 'stream',
            timeout: 60000,
            validateStatus: (status) => status < 500
        });

        if (response.status === 404) {
            console.log(`  ✗ File not found on FIDE server`);
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
        await execAsync(`unzip -o "${downloadPath}" -d "/Users/michaelduke/My FIDE API/downloads/"`);
        console.log(`  ✓ Downloaded and extracted`);
        
        return extractPath;
    } catch (error: any) {
        console.error(`  ✗ Failed: ${error.message}`);
        return null;
    }
}

async function parseXMLFile(filePath: string, ratingType: 'rapid' | 'blitz'): Promise<Player[]> {
    const xmlContent = await fs.readFile(filePath, 'utf-8');
    const parser = new xml2js.Parser();
    const result = await parser.parseStringPromise(xmlContent);
    
    const players: Player[] = [];
    const playerList = result.playerslist?.player || [];
    
    for (const p of playerList) {
        const fideId = parseInt(p.fideid?.[0] || p.fide_id?.[0]);
        const rating = p.rating?.[0] ? parseInt(p.rating[0]) : null;
        
        // Import top players (rating > 2200) and all titled players
        const title = p.title?.[0];
        const isTopPlayer = rating && rating > 2200;
        const isTitled = title && ['GM', 'IM', 'FM', 'WGM', 'WIM', 'WFM'].includes(title);
        
        if (fideId && rating && (isTopPlayer || isTitled)) {
            players.push({
                fide_id: fideId,
                name: p.name?.[0],
                title: title || null,
                federation: p.country?.[0],
                sex: p.sex?.[0],
                birth_year: p.birthday?.[0] ? parseInt(p.birthday[0]) : null,
                rating: rating,
                games: p.games?.[0] ? parseInt(p.games[0]) : 0,
                rating_type: ratingType
            });
        }
    }
    
    return players;
}

async function updateRapidBlitzRatings(players: Player[], ratingType: 'rapid' | 'blitz', dateStr: string) {
    const db = await getDatabase();
    
    await db.run('BEGIN TRANSACTION');
    
    try {
        let updatedCount = 0;
        let insertedCount = 0;
        
        for (const player of players) {
            // Check if rating record exists
            const existing = await db.get(
                'SELECT * FROM ratings WHERE fide_id = ? AND rating_date = ?',
                player.fide_id, dateStr
            );
            
            if (existing) {
                // Update existing record
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
                
                // Ensure player exists
                const playerExists = await db.get('SELECT fide_id FROM players WHERE fide_id = ?', player.fide_id);
                if (!playerExists) {
                    await db.run(
                        `INSERT INTO players (fide_id, name, title, federation, sex, birth_year, created_at, updated_at)
                         VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
                        player.fide_id, player.name, player.title, player.federation, player.sex, player.birth_year
                    );
                }
            }
        }
        
        await db.run('COMMIT');
        console.log(`  ✓ ${ratingType}: ${updatedCount} updated, ${insertedCount} inserted`);
        
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
    
    console.log(`\n📅 ${monthName.toUpperCase()} ${year} (${dateStr})`);
    console.log('─'.repeat(40));
    
    let rapidCount = 0;
    let blitzCount = 0;
    
    // Process rapid
    const rapidFile = await downloadRatingFile(monthName, yearShort, 'rapid');
    if (rapidFile && await fs.stat(rapidFile).catch(() => false)) {
        const rapidPlayers = await parseXMLFile(rapidFile, 'rapid');
        console.log(`  📊 Found ${rapidPlayers.length} top rapid players`);
        if (rapidPlayers.length > 0) {
            const result = await updateRapidBlitzRatings(rapidPlayers, 'rapid', dateStr);
            rapidCount = result.updated + result.inserted;
        }
    }
    
    // Process blitz
    const blitzFile = await downloadRatingFile(monthName, yearShort, 'blitz');
    if (blitzFile && await fs.stat(blitzFile).catch(() => false)) {
        const blitzPlayers = await parseXMLFile(blitzFile, 'blitz');
        console.log(`  ⚡ Found ${blitzPlayers.length} top blitz players`);
        if (blitzPlayers.length > 0) {
            const result = await updateRapidBlitzRatings(blitzPlayers, 'blitz', dateStr);
            blitzCount = result.updated + result.inserted;
        }
    }
    
    return { rapid: rapidCount, blitz: blitzCount };
}

async function main() {
    console.log('='.repeat(60));
    console.log('IMPORTING KEY HISTORICAL RAPID/BLITZ DATA');
    console.log('Strategy: Top players (2200+) and titled players only');
    console.log('Timeline: Quarterly snapshots from 2020-2025');
    console.log('='.repeat(60));
    
    try {
        let totalRapid = 0;
        let totalBlitz = 0;
        
        for (const { year, month } of KEY_MONTHS) {
            const result = await importMonthData(year, month);
            totalRapid += result.rapid;
            totalBlitz += result.blitz;
            
            // Small delay between months
            await new Promise(resolve => setTimeout(resolve, 500));
        }
        
        // Final statistics
        const db = await getDatabase();
        const stats = await db.get(`
            SELECT 
                COUNT(DISTINCT fide_id) as total_players,
                COUNT(DISTINCT CASE WHEN rapid_rating IS NOT NULL THEN fide_id END) as rapid_players,
                COUNT(DISTINCT CASE WHEN blitz_rating IS NOT NULL THEN fide_id END) as blitz_players,
                COUNT(CASE WHEN rapid_rating IS NOT NULL THEN 1 END) as rapid_records,
                COUNT(CASE WHEN blitz_rating IS NOT NULL THEN 1 END) as blitz_records,
                COUNT(DISTINCT rating_date) as total_months,
                MIN(rating_date) as earliest,
                MAX(rating_date) as latest
            FROM ratings 
            WHERE rapid_rating IS NOT NULL OR blitz_rating IS NOT NULL
        `);
        
        // Sample top players
        const samples = await db.all(`
            SELECT p.name, p.fide_id,
                   COUNT(DISTINCT CASE WHEN r.rapid_rating IS NOT NULL THEN r.rating_date END) as rapid_months,
                   COUNT(DISTINCT CASE WHEN r.blitz_rating IS NOT NULL THEN r.rating_date END) as blitz_months,
                   MIN(CASE WHEN r.rapid_rating IS NOT NULL THEN r.rating_date END) as first_rapid,
                   MIN(CASE WHEN r.blitz_rating IS NOT NULL THEN r.rating_date END) as first_blitz
            FROM players p
            JOIN ratings r ON p.fide_id = r.fide_id
            WHERE p.fide_id IN (1503014, 5202213, 1401170, 5073806, 14109603)
            GROUP BY p.fide_id, p.name
        `);
        
        console.log('\n' + '='.repeat(60));
        console.log('IMPORT COMPLETE');
        console.log('='.repeat(60));
        console.log('\n📊 Database Statistics:');
        console.log(`  Players with rapid/blitz: ${stats.total_players?.toLocaleString() || 0}`);
        console.log(`  Rapid players: ${stats.rapid_players?.toLocaleString() || 0}`);
        console.log(`  Blitz players: ${stats.blitz_players?.toLocaleString() || 0}`);
        console.log(`  Rapid records: ${stats.rapid_records?.toLocaleString() || 0}`);
        console.log(`  Blitz records: ${stats.blitz_records?.toLocaleString() || 0}`);
        console.log(`  Months with data: ${stats.total_months || 0}`);
        console.log(`  Date range: ${stats.earliest} to ${stats.latest}`);
        
        console.log('\n🏆 Sample Player Coverage:');
        samples.forEach(p => {
            console.log(`  ${p.name}:`);
            console.log(`    Rapid: ${p.rapid_months} months (from ${p.first_rapid || 'N/A'})`);
            console.log(`    Blitz: ${p.blitz_months} months (from ${p.first_blitz || 'N/A'})`);
        });
        
    } catch (error) {
        console.error('Import failed:', error);
        process.exit(1);
    }
}

if (require.main === module) {
    main();
}