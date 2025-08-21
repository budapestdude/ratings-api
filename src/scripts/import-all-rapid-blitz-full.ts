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
        // Check if file already exists
        const extractPath = downloadPath.replace('.zip', '.xml');
        try {
            await fs.stat(extractPath);
            console.log(`File already exists: ${extractPath}`);
            return extractPath;
        } catch {
            // File doesn't exist, download it
        }
        
        console.log(`Downloading ${url}...`);
        const response = await axios({
            method: 'GET',
            url: url,
            responseType: 'stream',
            timeout: 60000,
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
        const fideId = parseInt(p.fideid?.[0] || p.fide_id?.[0]);
        const rating = p.rating?.[0] ? parseInt(p.rating[0]) : null;
        
        // Only include players with valid FIDE ID and rating
        if (fideId && rating) {
            players.push({
                fide_id: fideId,
                name: p.name?.[0],
                title: p.title?.[0] || null,
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
    
    console.log(`Updating ${ratingType} ratings for ${players.length} players for date ${dateStr}...`);
    
    // Process in batches for better performance
    const batchSize = 1000;
    let updatedCount = 0;
    let insertedCount = 0;
    
    for (let i = 0; i < players.length; i += batchSize) {
        const batch = players.slice(i, i + batchSize);
        
        await db.run('BEGIN TRANSACTION');
        
        try {
            for (const player of batch) {
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
            }
            
            await db.run('COMMIT');
            
            if ((updatedCount + insertedCount) % 10000 === 0) {
                console.log(`Progress: ${updatedCount} updated, ${insertedCount} inserted...`);
            }
        } catch (error) {
            await db.run('ROLLBACK');
            throw error;
        }
    }
    
    console.log(`✅ Successfully imported ${ratingType} ratings for ${dateStr}:`)
    console.log(`   - Updated: ${updatedCount} existing player records`);
    console.log(`   - Inserted: ${insertedCount} new player records`);
    
    return { updated: updatedCount, inserted: insertedCount };
}

async function importMonthData(year: number, month: number) {
    const months = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
    const monthName = months[month - 1];
    const yearShort = year.toString().substring(2);
    const dateStr = `${year}${month.toString().padStart(2, '0')}01`;
    
    console.log(`\n📅 Processing ${monthName.toUpperCase()} ${year} (${dateStr})`);
    console.log('='.repeat(50));
    
    let hasData = false;
    
    // Download and process rapid ratings
    const rapidFile = await downloadRatingFile(monthName, yearShort, 'rapid');
    if (rapidFile && await fs.stat(rapidFile).catch(() => false)) {
        const rapidPlayers = await parseXMLFile(rapidFile, 'rapid');
        if (rapidPlayers.length > 0) {
            await updateRapidBlitzRatings(rapidPlayers, 'rapid', dateStr);
            hasData = true;
        }
    } else {
        console.log(`⚠️  No rapid ratings available for ${monthName} ${year}`);
    }
    
    // Download and process blitz ratings
    const blitzFile = await downloadRatingFile(monthName, yearShort, 'blitz');
    if (blitzFile && await fs.stat(blitzFile).catch(() => false)) {
        const blitzPlayers = await parseXMLFile(blitzFile, 'blitz');
        if (blitzPlayers.length > 0) {
            await updateRapidBlitzRatings(blitzPlayers, 'blitz', dateStr);
            hasData = true;
        }
    } else {
        console.log(`⚠️  No blitz ratings available for ${monthName} ${year}`);
    }
    
    return hasData;
}

async function main() {
    console.log('='.repeat(60));
    console.log('IMPORTING ALL HISTORICAL RAPID AND BLITZ RATINGS');
    console.log('='.repeat(60));
    console.log('');
    
    // Rapid/blitz ratings in XML format started around 2012
    // But consistent XML files are available from around 2015
    const startYear = 2015;
    const currentDate = new Date();
    const currentYear = currentDate.getFullYear();
    const currentMonth = currentDate.getMonth() + 1;
    
    try {
        let monthsWithData = 0;
        let monthsProcessed = 0;
        
        // Import data month by month
        for (let year = currentYear; year >= startYear; year--) {
            const startMonth = (year === currentYear) ? currentMonth : 12;
            const endMonth = 1;
            
            for (let month = startMonth; month >= endMonth; month--) {
                monthsProcessed++;
                
                // Skip months we've already fully imported
                const db = await getDatabase();
                const existing = await db.get(
                    `SELECT COUNT(*) as count FROM ratings 
                     WHERE rating_date = ? AND (rapid_rating IS NOT NULL OR blitz_rating IS NOT NULL)`,
                    `${year}${month.toString().padStart(2, '0')}01`
                );
                
                if (existing?.count > 50000) {
                    console.log(`\n📅 Skipping ${months[month-1].toUpperCase()} ${year} (already has ${existing.count} records)`);
                    monthsWithData++;
                    continue;
                }
                
                const hasData = await importMonthData(year, month);
                if (hasData) {
                    monthsWithData++;
                }
                
                // Add a small delay to avoid overwhelming the server
                await new Promise(resolve => setTimeout(resolve, 500));
                
                // Stop if we've processed enough months or found the start of rapid/blitz data
                if (monthsProcessed > 10 && monthsWithData === 0) {
                    console.log('\n⚠️  No more historical rapid/blitz data found');
                    break;
                }
            }
            
            if (monthsProcessed > 10 && monthsWithData === 0) {
                break;
            }
        }
        
        // Final statistics
        const db = await getDatabase();
        const stats = await db.get(`
            SELECT 
                COUNT(DISTINCT fide_id) as total_players,
                COUNT(CASE WHEN rapid_rating IS NOT NULL THEN 1 END) as rapid_records,
                COUNT(CASE WHEN blitz_rating IS NOT NULL THEN 1 END) as blitz_records,
                COUNT(DISTINCT rating_date) as total_months,
                MIN(rating_date) as earliest_date,
                MAX(rating_date) as latest_date
            FROM ratings 
            WHERE rapid_rating IS NOT NULL OR blitz_rating IS NOT NULL
        `);
        
        // Check a few top players' histories
        const topPlayers = await db.all(`
            SELECT p.name, p.fide_id, 
                   COUNT(CASE WHEN r.rapid_rating IS NOT NULL THEN 1 END) as rapid_months,
                   COUNT(CASE WHEN r.blitz_rating IS NOT NULL THEN 1 END) as blitz_months
            FROM players p
            JOIN ratings r ON p.fide_id = r.fide_id
            WHERE p.fide_id IN (1503014, 5202213, 1401170, 5073806, 5018889)
            GROUP BY p.fide_id, p.name
        `);
        
        console.log('\n' + '='.repeat(60));
        console.log('IMPORT COMPLETE');
        console.log('='.repeat(60));
        console.log('\nFinal database statistics:');
        console.log(`   📊 Total players with rapid/blitz: ${stats.total_players?.toLocaleString() || 0}`);
        console.log(`   🏃 Rapid rating records: ${stats.rapid_records?.toLocaleString() || 0}`);
        console.log(`   ⚡ Blitz rating records: ${stats.blitz_records?.toLocaleString() || 0}`);
        console.log(`   📅 Total months with data: ${stats.total_months || 0}`);
        console.log(`   📅 Date range: ${stats.earliest_date} to ${stats.latest_date}`);
        
        console.log('\n🏆 Top players\' rapid/blitz history coverage:');
        topPlayers.forEach(p => {
            console.log(`   ${p.name}: ${p.rapid_months} rapid months, ${p.blitz_months} blitz months`);
        });
        
    } catch (error) {
        console.error('Import failed:', error);
        process.exit(1);
    }
}

// Helper to find which months are available
const months = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];

if (require.main === module) {
    main();
}