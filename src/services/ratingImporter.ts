import { getDatabase } from '../database';
import { RatingList } from '../models/player';
import fs from 'fs/promises';
import { createReadStream } from 'fs';
import path from 'path';
import axios from 'axios';
import unzipper from 'unzipper';
import { parseStringPromise } from 'xml2js';

export class RatingImporter {
    private baseUrl = process.env.FIDE_DOWNLOAD_URL || 'https://ratings.fide.com/download/';

    async downloadCurrentRatingList(): Promise<string> {
        const url = `${this.baseUrl}standard_rating_list.zip`;
        const downloadPath = `./data/downloads/standard_rating_list.zip`;
        
        await fs.mkdir('./data/downloads', { recursive: true });

        const response = await axios({
            method: 'GET',
            url: url,
            responseType: 'stream'
        });

        const writer = await fs.open(downloadPath, 'w');
        const stream = writer.createWriteStream();
        
        response.data.pipe(stream);
        
        return new Promise((resolve, reject) => {
            stream.on('finish', () => resolve(downloadPath));
            stream.on('error', reject);
        });
    }

    async downloadRatingList(date: string): Promise<string> {
        // Parse date to determine URL format
        const year = parseInt(date.substring(0, 4));
        const month = parseInt(date.substring(4, 6));
        const monthNames = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
        const monthName = monthNames[month - 1];
        const yearShort = year.toString().substring(2);
        
        let fileName: string;
        let url: string;
        
        if (year < 2020) {
            // Pre-2020: standard_jan15frl.zip format
            fileName = `standard_${monthName}${yearShort}frl.zip`;
        } else {
            // 2020+: standard_jan20frl_xml.zip format
            fileName = `standard_${monthName}${yearShort}frl_xml.zip`;
        }
        
        url = `${this.baseUrl}${fileName}`;
        const downloadPath = `./data/downloads/${fileName}`;
        
        await fs.mkdir('./data/downloads', { recursive: true });

        try {
            const response = await axios({
                method: 'GET',
                url: url,
                responseType: 'stream'
            });

            const writer = await fs.open(downloadPath, 'w');
            const stream = writer.createWriteStream();
            
            response.data.pipe(stream);
            
            return new Promise((resolve, reject) => {
                stream.on('finish', () => resolve(downloadPath));
                stream.on('error', reject);
            });
        } catch (error: any) {
            if (error.response?.status === 404) {
                throw new Error(`Rating list not found for ${date} at ${url}`);
            }
            throw error;
        }
    }

    async extractZip(zipPath: string): Promise<string> {
        const extractPath = zipPath.replace('.zip', '');
        await fs.mkdir(extractPath, { recursive: true });

        // Use command line unzip for better compatibility
        const { exec } = require('child_process');
        const { promisify } = require('util');
        const execAsync = promisify(exec);
        
        try {
            await execAsync(`unzip -o "${zipPath}" -d "${extractPath}"`);
            return extractPath;
        } catch (error) {
            // Fallback to unzipper library
            return new Promise((resolve, reject) => {
                createReadStream(zipPath)
                    .pipe(unzipper.Extract({ path: extractPath }))
                    .on('close', () => resolve(extractPath))
                    .on('error', reject);
            });
        }
    }

    async parseXMLRatingList(xmlPath: string): Promise<{ players: any[], date: string }> {
        const xmlContent = await fs.readFile(xmlPath, 'utf-8');
        const result = await parseStringPromise(xmlContent);
        
        const rawPlayers = result.playerslist?.player || [];
        const listDate = result.playerslist?.$?.date || new Date().toISOString().split('T')[0];
        
        // Convert XML format to our expected format
        const players = rawPlayers.map((p: any) => ({
            fide_id: p.fideid?.[0] ? parseInt(p.fideid[0]) : null,
            name: p.name?.[0] || '',
            title: p.title?.[0] || null,
            federation: p.country?.[0] || null,
            standard_rating: p.rating?.[0] ? parseInt(p.rating[0]) : null,
            standard_games: p.games?.[0] ? parseInt(p.games[0]) : 0,
            birth_year: p.birthday?.[0] ? parseInt(p.birthday[0]) : null,
            sex: p.sex?.[0] || null,
            flag: p.flag?.[0] || null
        })).filter((p: any) => p.fide_id); // Filter out entries without valid fide_id
        
        return { players, date: listDate };
    }

    async parseTextRatingList(filePath: string, date: string): Promise<{ players: any[], date: string }> {
        const content = await fs.readFile(filePath, 'utf-8');
        const lines = content.split('\n');
        const players = [];

        // Skip header line
        for (let i = 1; i < lines.length; i++) {
            const line = lines[i];
            if (!line || line.trim().length === 0) continue;

            // FIDE format uses fixed-width columns
            // ID Number: 0-14, Name: 15-75, Fed: 76-79, Sex: 80-82, 
            // Title: 83-87, WTitle: 88-93, OTitle: 94-99, FOA: 100-112,
            // Rating: 113-117, Games: 118-122, K: 123-126, B-day: 127-131, Flag: 132-135
            
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

            players.push({
                fide_id: parseInt(fideId),
                name: name,
                title: title || null,
                federation: federation || null,
                standard_rating: rating ? parseInt(rating) : null,
                standard_games: games ? parseInt(games) : 0,
                birth_year: birthYear ? parseInt(birthYear) : null,
                sex: sex || null,
                flag: flag || null
            });
        }

        return { players, date };
    }

    async importRatingList(date: string, filePath?: string): Promise<void> {
        const db = await getDatabase();
        
        try {
            await db.run('BEGIN TRANSACTION');

            const existingList = await db.get<RatingList>(
                'SELECT * FROM rating_lists WHERE list_date = ?',
                date
            );

            if (existingList && existingList.status === 'completed') {
                console.log(`Rating list for ${date} already imported`);
                return;
            }

            const listId = existingList?.id || (await db.run(
                'INSERT INTO rating_lists (list_date, status) VALUES (?, ?)',
                date, 'processing'
            )).lastID;

            let data;
            if (filePath) {
                if (filePath.endsWith('.xml')) {
                    data = await this.parseXMLRatingList(filePath);
                } else {
                    data = await this.parseTextRatingList(filePath, date);
                }
            } else {
                const zipPath = await this.downloadRatingList(date);
                const extractPath = await this.extractZip(zipPath);
                const files = await fs.readdir(extractPath);
                const dataFile = files.find(f => f.endsWith('.xml') || f.endsWith('.txt'));
                
                if (!dataFile) {
                    throw new Error('No data file found in archive');
                }

                const fullPath = path.join(extractPath, dataFile);
                if (dataFile.endsWith('.xml')) {
                    data = await this.parseXMLRatingList(fullPath);
                } else {
                    data = await this.parseTextRatingList(fullPath, date);
                }
            }

            let importedCount = 0;
            for (const playerData of data.players) {
                await this.upsertPlayer(playerData);
                await this.insertRating(playerData, date);
                importedCount++;
                
                if (importedCount % 1000 === 0) {
                    console.log(`Imported ${importedCount} players...`);
                }
            }

            await db.run(
                'UPDATE rating_lists SET status = ?, total_players = ? WHERE id = ?',
                'completed', importedCount, listId
            );

            await db.run('COMMIT');
            console.log(`Successfully imported ${importedCount} players for ${date}`);
            
        } catch (error) {
            await db.run('ROLLBACK');
            throw error;
        }
    }

    private async upsertPlayer(playerData: any): Promise<void> {
        const db = await getDatabase();
        
        await db.run(`
            INSERT OR REPLACE INTO players (fide_id, name, title, federation, sex, birth_year, flag, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
        `, 
            playerData.fide_id,
            playerData.name,
            playerData.title,
            playerData.federation,
            playerData.sex,
            playerData.birth_year,
            playerData.flag
        );
    }

    private async insertRating(playerData: any, date: string): Promise<void> {
        const db = await getDatabase();
        
        await db.run(`
            INSERT OR REPLACE INTO ratings (
                fide_id, rating_date, 
                standard_rating, standard_games,
                rapid_rating, rapid_games,
                blitz_rating, blitz_games
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `,
            playerData.fide_id,
            date,
            playerData.standard_rating,
            playerData.standard_games || 0,
            playerData.rapid_rating,
            playerData.rapid_games || 0,
            playerData.blitz_rating,
            playerData.blitz_games || 0
        );
    }

    async importCurrentMonth(): Promise<void> {
        const date = new Date();
        const dateStr = `${date.getFullYear()}${(date.getMonth() + 1).toString().padStart(2, '0')}01`;
        
        console.log(`Importing current month's rating list (${dateStr})...`);
        
        try {
            const zipPath = await this.downloadCurrentRatingList();
            const extractPath = await this.extractZip(zipPath);
            const files = await fs.readdir(extractPath);
            const dataFile = files.find(f => f.endsWith('.txt') || f.endsWith('.xml'));
            
            if (!dataFile) {
                throw new Error('No data file found in archive');
            }

            const fullPath = path.join(extractPath, dataFile);
            await this.importRatingList(dateStr, fullPath);
            
            console.log(`Successfully imported current month's ratings`);
        } catch (error) {
            console.error('Failed to import current month:', error);
            throw error;
        }
    }

    async importHistoricalData(startYear: number = 2015): Promise<void> {
        const currentDate = new Date();
        const dates = [];

        for (let year = startYear; year <= currentDate.getFullYear(); year++) {
            for (let month = 1; month <= 12; month++) {
                if (year === currentDate.getFullYear() && month > currentDate.getMonth() + 1) {
                    break;
                }
                const dateStr = `${year}${month.toString().padStart(2, '0')}01`;
                dates.push(dateStr);
            }
        }

        console.log(`Importing ${dates.length} rating lists from ${startYear} to present...`);

        for (const date of dates) {
            try {
                console.log(`Importing rating list for ${date}...`);
                await this.importRatingList(date);
            } catch (error) {
                console.error(`Failed to import ${date}:`, error);
            }
        }
    }
}