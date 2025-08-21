import dotenv from 'dotenv';
import { getDatabase } from '../database';
import * as fs from 'fs/promises';
import * as xml2js from 'xml2js';
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
            console.log(`  ✓ Already have ${fileName}`);
            return extractPath;
        } catch {
            // File doesn't exist, download it
        }
        
        console.log(`  ⬇️  Downloading ${fileName}...`);
        const response = await axios({
            method: 'GET',
            url: url,
            responseType: 'stream',
            timeout: 120000,
            validateStatus: (status) => status < 500
        });

        if (response.status === 404) {
            console.log(`  ✗ Not available: ${fileName}`);
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
        
        // Include ALL players with valid FIDE ID and rating
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
    
    console.log(`  📝 Processing ${players.length} ${ratingType} players...`);
    
    // Process in larger batches for better performance
    const batchSize = 5000;
    let totalUpdated = 0;
    let totalInserted = 0;
    
    for (let i = 0; i < players.length; i += batchSize) {
        const batch = players.slice(i, Math.min(i + batchSize, players.length));
        
        await db.run('BEGIN TRANSACTION');
        
        try {
            for (const player of batch) {
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
                    totalUpdated++;
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
                    totalInserted++;
                    
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
            
            if ((totalUpdated + totalInserted) % 50000 === 0) {
                console.log(`    Progress: ${totalUpdated} updated, ${totalInserted} inserted...`);
            }
        } catch (error) {
            await db.run('ROLLBACK');
            throw error;
        }
    }
    
    console.log(`  ✓ ${ratingType}: ${totalUpdated} updated, ${totalInserted} inserted`);
    
    return { updated: totalUpdated, inserted: totalInserted };
}

async function importMonthData(year: number, month: number): Promise<boolean> {
    const months = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
    const monthName = months[month - 1];
    const yearShort = year.toString().substring(2);
    const dateStr = `${year}${month.toString().padStart(2, '0')}01`;
    
    console.log(`\n📅 ${monthName.toUpperCase()} ${year}`);
    
    // Check if we already have substantial data for this month
    const db = await getDatabase();
    const existing = await db.get(
        `SELECT COUNT(*) as count FROM ratings 
         WHERE rating_date = ? AND (rapid_rating IS NOT NULL OR blitz_rating IS NOT NULL)`,
        dateStr
    );
    
    if (existing?.count > 200000) {
        console.log(`  ⏭️  Skipping (already has ${existing.count.toLocaleString()} records)`);
        return true;
    }
    
    let hasData = false;
    
    // Process rapid
    const rapidFile = await downloadRatingFile(monthName, yearShort, 'rapid');
    if (rapidFile && await fs.stat(rapidFile).catch(() => false)) {
        const rapidPlayers = await parseXMLFile(rapidFile, 'rapid');
        if (rapidPlayers.length > 0) {
            await updateRapidBlitzRatings(rapidPlayers, 'rapid', dateStr);
            hasData = true;
        }
    }
    
    // Process blitz
    const blitzFile = await downloadRatingFile(monthName, yearShort, 'blitz');
    if (blitzFile && await fs.stat(blitzFile).catch(() => false)) {
        const blitzPlayers = await parseXMLFile(blitzFile, 'blitz');
        if (blitzPlayers.length > 0) {
            await updateRapidBlitzRatings(blitzPlayers, 'blitz', dateStr);
            hasData = true;
        }
    }
    
    return hasData;
}

async function main() {
    console.log('='.repeat(70));
    console.log('COMPLETE RAPID/BLITZ IMPORT (2015-2025)');
    console.log('Importing ALL players for ALL months');
    console.log('='.repeat(70));
    
    const startYear = 2015; // Rapid/blitz XML files should be available from here
    const currentDate = new Date();
    const currentYear = currentDate.getFullYear();
    const currentMonth = currentDate.getMonth() + 1;
    
    try {
        let totalMonths = 0;
        let monthsWithData = 0;
        let consecutiveFailures = 0;
        
        // Process chronologically for better tracking
        for (let year = startYear; year <= currentYear; year++) {
            console.log(`\n${'='.repeat(50)}\nYear ${year}\n${'='.repeat(50)}`);
            
            const endMonth = (year === currentYear) ? currentMonth : 12;
            
            for (let month = 1; month <= endMonth; month++) {
                totalMonths++;
                
                const hasData = await importMonthData(year, month);
                
                if (hasData) {
                    monthsWithData++;
                    consecutiveFailures = 0;
                } else {
                    consecutiveFailures++;
                    // If we fail to find data for 6 consecutive months in early years, data might not exist yet
                    if (year < 2020 && consecutiveFailures > 6) {
                        console.log(`\n⚠️  No rapid/blitz data found for ${year}. Skipping to next year.`);
                        break;
                    }
                }
                
                // Small delay between months to avoid overwhelming server
                await new Promise(resolve => setTimeout(resolve, 500));
            }
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
                COUNT(DISTINCT rating_date) as months_with_data,
                MIN(CASE WHEN rapid_rating IS NOT NULL OR blitz_rating IS NOT NULL THEN rating_date END) as earliest,
                MAX(CASE WHEN rapid_rating IS NOT NULL OR blitz_rating IS NOT NULL THEN rating_date END) as latest
            FROM ratings
        `);
        
        // Check coverage for a few players
        const coverage = await db.all(`
            SELECT p.name, 
                   COUNT(DISTINCT CASE WHEN r.rapid_rating IS NOT NULL THEN r.rating_date END) as rapid_months,
                   COUNT(DISTINCT CASE WHEN r.blitz_rating IS NOT NULL THEN r.rating_date END) as blitz_months
            FROM players p
            JOIN ratings r ON p.fide_id = r.fide_id
            WHERE p.fide_id IN (1503014, 5202213, 5073806)
            GROUP BY p.name
        `);
        
        console.log('\n' + '='.repeat(70));
        console.log('IMPORT COMPLETE');
        console.log('='.repeat(70));
        console.log('\n📊 Final Statistics:');
        console.log(`  Total months processed: ${totalMonths}`);
        console.log(`  Months with data: ${monthsWithData}`);
        console.log(`  Players with rapid: ${stats.rapid_players?.toLocaleString() || 0}`);
        console.log(`  Players with blitz: ${stats.blitz_players?.toLocaleString() || 0}`);
        console.log(`  Total rapid records: ${stats.rapid_records?.toLocaleString() || 0}`);
        console.log(`  Total blitz records: ${stats.blitz_records?.toLocaleString() || 0}`);
        console.log(`  Date range: ${stats.earliest || 'N/A'} to ${stats.latest || 'N/A'}`);
        
        console.log('\n🏆 Player Coverage:');
        coverage.forEach(p => {
            console.log(`  ${p.name}: ${p.rapid_months} rapid months, ${p.blitz_months} blitz months`);
        });
        
        console.log('\n✅ Import completed successfully!');
        
    } catch (error) {
        console.error('\n❌ Import failed:', error);
        process.exit(1);
    }
}

if (require.main === module) {
    main();
}