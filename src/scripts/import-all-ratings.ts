import { getDatabaseAdapter } from '../database/adapter';
import fs from 'fs/promises';
import path from 'path';
import xml2js from 'xml2js';

interface Player {
    fideid: string;
    name: string;
    country?: string;
    sex?: string;
    title?: string;
    w_title?: string;
    o_title?: string;
    foa_title?: string;
    rating?: string;
    rapid_rating?: string;
    blitz_rating?: string;
    games?: string;
    rapid_games?: string;
    blitz_games?: string;
    k?: string;
    rapid_k?: string;
    blitz_k?: string;
    birthday?: string;
    flag?: string;
}

async function parseXMLFile(filePath: string): Promise<any> {
    const content = await fs.readFile(filePath, 'utf-8');
    const parser = new xml2js.Parser({ explicitArray: false });
    return parser.parseStringPromise(content);
}

function extractPeriod(filename: string): string {
    // Extract date from filename like "standard_feb24frl_xml.xml" -> "20240201"
    const monthMap: Record<string, string> = {
        'jan': '01', 'feb': '02', 'mar': '03', 'apr': '04',
        'may': '05', 'jun': '06', 'jul': '07', 'aug': '08',
        'sep': '09', 'oct': '10', 'nov': '11', 'dec': '12'
    };

    const match = filename.match(/(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)(\d{2})/i);
    if (match) {
        const month = monthMap[match[1].toLowerCase()];
        const year = parseInt(match[2]) + 2000; // Convert 24 to 2024
        return `${year}${month}01`;
    }
    return new Date().toISOString().slice(0, 10).replace(/-/g, '');
}

export async function importAllRatings(filePath: string) {
    console.log(`Importing ratings from ${filePath}...`);

    try {
        const db = await getDatabaseAdapter();
        const data = await parseXMLFile(filePath);
        const filename = path.basename(filePath);
        const period = extractPeriod(filename);
        const isPostgres = process.env.DATABASE_TYPE === 'postgresql' || !!process.env.DATABASE_URL;

        console.log(`Period: ${period}`);

        // Check if it's a standard, rapid, or blitz file
        const isStandard = filename.includes('standard');
        const isRapid = filename.includes('rapid');
        const isBlitz = filename.includes('blitz');

        let players: Player[] = [];

        // Handle different XML structures
        if (data.playerslist && data.playerslist.player) {
            players = Array.isArray(data.playerslist.player)
                ? data.playerslist.player
                : [data.playerslist.player];
        } else if (data.ratings_list && data.ratings_list.player) {
            players = Array.isArray(data.ratings_list.player)
                ? data.ratings_list.player
                : [data.ratings_list.player];
        }

        console.log(`Found ${players.length} players to import`);

        let imported = 0;
        const batchSize = 100;

        for (let i = 0; i < players.length; i += batchSize) {
            const batch = players.slice(i, i + batchSize);

            for (const player of batch) {
                const fideId = parseInt(player.fideid);
                if (!fideId) continue;

                try {
                    // Insert or update player
                    if (isStandard) {
                        // Standard files have complete player info
                        if (isPostgres) {
                            await db.run(`
                                INSERT INTO players (
                                    fide_id, name, federation, sex, title, w_title, o_title, foa_title,
                                    rating, birthday, flag
                                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                                ON CONFLICT (fide_id) DO UPDATE SET
                                    name = EXCLUDED.name,
                                    federation = EXCLUDED.federation,
                                    title = EXCLUDED.title,
                                    rating = EXCLUDED.rating
                            `, [
                                fideId, player.name, player.country, player.sex,
                                player.title, player.w_title, player.o_title, player.foa_title,
                                player.rating ? parseInt(player.rating) : null,
                                player.birthday ? parseInt(player.birthday) : null,
                                player.flag
                            ]);
                        } else {
                            await db.run(`
                                INSERT OR REPLACE INTO players (
                                    fide_id, name, federation, sex, title, w_title, o_title, foa_title,
                                    rating, birthday, flag
                                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                            `, [
                                fideId, player.name, player.country, player.sex,
                                player.title, player.w_title, player.o_title, player.foa_title,
                                player.rating ? parseInt(player.rating) : null,
                                player.birthday ? parseInt(player.birthday) : null,
                                player.flag
                            ]);
                        }

                        // Insert standard ratings
                        if (isPostgres) {
                            await db.run(`
                                INSERT INTO ratings (
                                    fide_id, period, standard_rating, games
                                ) VALUES (?, ?, ?, ?)
                                ON CONFLICT (fide_id, period) DO UPDATE SET
                                    standard_rating = EXCLUDED.standard_rating,
                                    games = EXCLUDED.games
                            `, [
                                fideId, period,
                                player.rating ? parseInt(player.rating) : null,
                                player.games ? parseInt(player.games) : 0
                            ]);
                        } else {
                            await db.run(`
                                INSERT OR REPLACE INTO ratings (
                                    fide_id, period, standard_rating, games
                                ) VALUES (?, ?, ?, ?)
                            `, [
                                fideId, period,
                                player.rating ? parseInt(player.rating) : null,
                                player.games ? parseInt(player.games) : 0
                            ]);
                        }
                    } else {
                        // Rapid/Blitz files - update existing players
                        if (player.rapid_rating) {
                            if (isPostgres) {
                                await db.run(`
                                    UPDATE players SET rapid_rating = ? WHERE fide_id = ?
                                `, [parseInt(player.rapid_rating), fideId]);

                                await db.run(`
                                    INSERT INTO ratings (fide_id, period, rapid_rating, rapid_games)
                                    VALUES (?, ?, ?, ?)
                                    ON CONFLICT (fide_id, period) DO UPDATE SET
                                        rapid_rating = EXCLUDED.rapid_rating,
                                        rapid_games = EXCLUDED.rapid_games
                                `, [
                                    fideId, period,
                                    parseInt(player.rapid_rating),
                                    player.rapid_games ? parseInt(player.rapid_games) : 0
                                ]);
                            } else {
                                await db.run(`
                                    UPDATE players SET rapid_rating = ? WHERE fide_id = ?
                                `, [parseInt(player.rapid_rating), fideId]);

                                await db.run(`
                                    UPDATE ratings SET rapid_rating = ?, rapid_games = ?
                                    WHERE fide_id = ? AND period = ?
                                `, [
                                    parseInt(player.rapid_rating),
                                    player.rapid_games ? parseInt(player.rapid_games) : 0,
                                    fideId, period
                                ]);
                            }
                        }

                        if (player.blitz_rating) {
                            if (isPostgres) {
                                await db.run(`
                                    UPDATE players SET blitz_rating = ? WHERE fide_id = ?
                                `, [parseInt(player.blitz_rating), fideId]);

                                await db.run(`
                                    INSERT INTO ratings (fide_id, period, blitz_rating, blitz_games)
                                    VALUES (?, ?, ?, ?)
                                    ON CONFLICT (fide_id, period) DO UPDATE SET
                                        blitz_rating = EXCLUDED.blitz_rating,
                                        blitz_games = EXCLUDED.blitz_games
                                `, [
                                    fideId, period,
                                    parseInt(player.blitz_rating),
                                    player.blitz_games ? parseInt(player.blitz_games) : 0
                                ]);
                            } else {
                                await db.run(`
                                    UPDATE players SET blitz_rating = ? WHERE fide_id = ?
                                `, [parseInt(player.blitz_rating), fideId]);

                                await db.run(`
                                    UPDATE ratings SET blitz_rating = ?, blitz_games = ?
                                    WHERE fide_id = ? AND period = ?
                                `, [
                                    parseInt(player.blitz_rating),
                                    player.blitz_games ? parseInt(player.blitz_games) : 0,
                                    fideId, period
                                ]);
                            }
                        }
                    }

                    imported++;
                } catch (error) {
                    console.error(`Error importing player ${fideId}:`, error);
                }
            }

            if ((i + batchSize) % 1000 === 0 || i + batchSize >= players.length) {
                console.log(`Progress: ${Math.min(i + batchSize, players.length)}/${players.length} players imported`);
            }
        }

        console.log(`✓ Successfully imported ${imported} players from ${filename}`);

    } catch (error) {
        console.error('Import failed:', error);
        throw error;
    }
}

// Run if called directly
if (require.main === module) {
    const filePath = process.argv[2];

    if (!filePath) {
        console.error('Usage: npm run import-all-ratings <file.xml>');
        process.exit(1);
    }

    importAllRatings(filePath)
        .then(() => {
            console.log('Import complete');
            process.exit(0);
        })
        .catch(error => {
            console.error('Import failed:', error);
            process.exit(1);
        });
}