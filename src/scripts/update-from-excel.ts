import * as XLSX from 'xlsx';
import path from 'path';
import fs from 'fs';
import { initDatabaseAdapter, getDatabaseAdapter } from '../database/adapter';

interface PlayerRating {
    fide_id: number;
    name: string;
    title?: string;
    federation: string;
    rating: number;
    games?: number;
    birth_year?: number;
    flag?: string;
}

async function parseExcelFile(filePath: string): Promise<PlayerRating[]> {
    console.log(`📊 Reading Excel file: ${filePath}`);

    const workbook = XLSX.readFile(filePath);
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];

    const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as any[][];

    console.log(`Found ${jsonData.length} rows in Excel file`);

    if (jsonData.length > 0) {
        console.log('Headers:', jsonData[0]);
    }

    const players: PlayerRating[] = [];

    for (let i = 1; i < jsonData.length && i <= 101; i++) {
        const row = jsonData[i];
        if (!row || row.length === 0) continue;

        // Extract title from name if present (format: "GM Name Surname")
        let fullName = String(row[1] || '');
        let title: string | undefined;

        // Check for common chess titles at the beginning of the name
        const titleMatch = fullName.match(/^(GM|IM|FM|WGM|WIM|WFM|CM|WCM|NM)\s+(.+)/);
        if (titleMatch) {
            title = titleMatch[1];
            fullName = titleMatch[2];
        }

        const player: PlayerRating = {
            fide_id: parseInt(row[2]) || 0,  // FIDE_ID column
            name: fullName,                   // Name column (with title removed)
            title: title,
            federation: String(row[4] || ''), // Fed column
            rating: parseInt(row[5]) || 0,    // Rating column
            games: undefined,
            birth_year: row[6] ? parseInt(row[6]) : undefined, // B-Year column
            flag: undefined
        };

        if (player.fide_id && player.rating) {
            players.push(player);
        }
    }

    console.log(`✅ Parsed ${players.length} player ratings`);
    return players;
}

async function updateDatabase(players: PlayerRating[]) {
    const adapter = getDatabaseAdapter();

    console.log('📝 Updating database with new ratings...');

    for (const player of players) {
        try {
            const existingPlayer = await adapter.getPlayer(player.fide_id);

            if (existingPlayer) {
                await adapter.query(
                    `UPDATE players
                     SET name = ?, title = ?, federation = ?, standard_rating = ?, birth_year = ?
                     WHERE fide_id = ?`,
                    [player.name, player.title, player.federation, player.rating, player.birth_year, player.fide_id]
                );
                console.log(`Updated: ${player.name} (${player.fide_id}) - Rating: ${player.rating}`);
            } else {
                await adapter.query(
                    `INSERT INTO players (fide_id, name, title, federation, standard_rating, birth_year, sex)
                     VALUES (?, ?, ?, ?, ?, ?, ?)`,
                    [player.fide_id, player.name, player.title, player.federation, player.rating, player.birth_year, 'M']
                );
                console.log(`Inserted: ${player.name} (${player.fide_id}) - Rating: ${player.rating}`);
            }

            const ratingDate = new Date().toISOString().slice(0, 7) + '-01';
            await adapter.query(
                `INSERT OR REPLACE INTO ratings (fide_id, rating_date, standard_rating)
                 VALUES (?, ?, ?)`,
                [player.fide_id, ratingDate, player.rating]
            );

        } catch (error) {
            console.error(`Error updating player ${player.fide_id}:`, error);
        }
    }

    console.log('✅ Database update complete');
}

async function generateTop100Json(players: PlayerRating[]) {
    const top100 = players.slice(0, 100).map((player, index) => ({
        rank: index + 1,
        fide_id: player.fide_id,
        name: player.name,
        title: player.title,
        federation: player.federation,
        rating: player.rating,
        games: player.games,
        birth_year: player.birth_year
    }));

    const outputPath = path.join(process.cwd(), 'data', 'top100_standard.json');

    fs.mkdirSync(path.dirname(outputPath), { recursive: true });

    fs.writeFileSync(outputPath, JSON.stringify({
        generated_at: new Date().toISOString(),
        category: 'standard',
        count: top100.length,
        players: top100
    }, null, 2));

    console.log(`✅ Generated top 100 list at: ${outputPath}`);

    console.log('\n🏆 Top 10 players:');
    top100.slice(0, 10).forEach(p => {
        console.log(`${p.rank}. ${p.title || ''} ${p.name} (${p.federation}) - ${p.rating}`);
    });
}

async function main() {
    try {
        await initDatabaseAdapter();

        const excelPath = path.join(process.cwd(), 'fide_ratings.xlsx');

        if (!fs.existsSync(excelPath)) {
            console.error(`❌ Excel file not found: ${excelPath}`);
            process.exit(1);
        }

        const players = await parseExcelFile(excelPath);

        await updateDatabase(players);

        await generateTop100Json(players);

        console.log('\n✅ All operations completed successfully!');
        process.exit(0);
    } catch (error) {
        console.error('❌ Error:', error);
        process.exit(1);
    }
}

main();