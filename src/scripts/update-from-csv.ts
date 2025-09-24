import * as fs from 'fs';
import * as path from 'path';
import { initDatabaseAdapter, getDatabaseAdapter } from '../database/adapter';

interface PlayerRating {
    fide_id: number;
    name: string;
    title?: string;
    federation: string;
    standard_rating: number;
    rapid_rating?: number;
    blitz_rating?: number;
    birth_year?: number;
    rank?: number;
}

function parseCSV(csvContent: string): PlayerRating[] {
    const lines = csvContent.trim().split('\n');
    const headers = lines[0].split(',');

    console.log('CSV Headers:', headers);

    const players: PlayerRating[] = [];

    for (let i = 1; i < lines.length; i++) {
        const values = lines[i].split(',');

        if (values.length < 6) continue;

        const player: PlayerRating = {
            fide_id: parseInt(values[0]) || 0,
            name: values[1] || '',
            title: values[2] || undefined,
            federation: values[3] || '',
            standard_rating: parseInt(values[4]) || 0,
            rapid_rating: values[5] ? parseInt(values[5]) : undefined,
            blitz_rating: values[6] ? parseInt(values[6]) : undefined,
            birth_year: values[7] ? parseInt(values[7]) : undefined,
            rank: i
        };

        if (player.fide_id && player.standard_rating) {
            players.push(player);
        }
    }

    return players;
}

async function updateDatabase(players: PlayerRating[]) {
    const adapter = getDatabaseAdapter();

    console.log('📝 Updating database with new ratings...');

    for (const player of players) {
        try {
            // Try to update existing player
            const updateResult = await adapter.query(
                `UPDATE players
                 SET name = ?, title = ?, federation = ?,
                     standard_rating = ?, rapid_rating = ?, blitz_rating = ?,
                     birth_year = ?
                 WHERE fide_id = ?`,
                [
                    player.name,
                    player.title,
                    player.federation,
                    player.standard_rating,
                    player.rapid_rating,
                    player.blitz_rating,
                    player.birth_year,
                    player.fide_id
                ]
            );

            // If no rows updated, insert new player
            if (!updateResult || (updateResult as any).changes === 0) {
                await adapter.query(
                    `INSERT INTO players (fide_id, name, title, federation, standard_rating, rapid_rating, blitz_rating, birth_year, sex)
                     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                    [
                        player.fide_id,
                        player.name,
                        player.title,
                        player.federation,
                        player.standard_rating,
                        player.rapid_rating,
                        player.blitz_rating,
                        player.birth_year,
                        'M'
                    ]
                );
                console.log(`Inserted: ${player.name} (${player.fide_id}) - Std: ${player.standard_rating}, Rpd: ${player.rapid_rating}, Blz: ${player.blitz_rating}`);
            } else {
                console.log(`Updated: ${player.name} (${player.fide_id}) - Std: ${player.standard_rating}, Rpd: ${player.rapid_rating}, Blz: ${player.blitz_rating}`);
            }

            // Update ratings history
            const ratingDate = new Date().toISOString().slice(0, 7) + '-01';
            await adapter.query(
                `INSERT OR REPLACE INTO ratings (fide_id, rating_date, standard_rating, rapid_rating, blitz_rating)
                 VALUES (?, ?, ?, ?, ?)`,
                [player.fide_id, ratingDate, player.standard_rating, player.rapid_rating, player.blitz_rating]
            );

        } catch (error) {
            console.error(`Error updating player ${player.fide_id}:`, error);
        }
    }

    console.log('✅ Database update complete');
}

function generateTop100Json(players: PlayerRating[]) {
    const allPlayers = players.map((player, index) => ({
        rank: index + 1,
        fide_id: player.fide_id,
        name: player.name,
        title: player.title,
        federation: player.federation,
        standard_rating: player.standard_rating,
        rapid_rating: player.rapid_rating,
        blitz_rating: player.blitz_rating,
        birth_year: player.birth_year
    }));

    const outputPath = path.join(process.cwd(), 'data', 'top_2600_standard.json');

    fs.mkdirSync(path.dirname(outputPath), { recursive: true });

    fs.writeFileSync(outputPath, JSON.stringify({
        generated_at: new Date().toISOString(),
        category: 'standard',
        count: allPlayers.length,
        source: '2600+ men CSV',
        players: allPlayers
    }, null, 2));

    console.log(`✅ Generated top 2600+ list with ${allPlayers.length} players at: ${outputPath}`);

    console.log('\n🏆 Top 10 players with all ratings:');
    allPlayers.slice(0, 10).forEach(p => {
        console.log(`${p.rank}. ${p.title || ''} ${p.name} (${p.federation}) - Std: ${p.standard_rating}, Rpd: ${p.rapid_rating || 'N/A'}, Blz: ${p.blitz_rating || 'N/A'}`);
    });
}

async function main() {
    try {
        await initDatabaseAdapter();

        const csvPath = path.join(process.cwd(), '2600+ men - Men (2).csv');

        if (!fs.existsSync(csvPath)) {
            console.error(`❌ CSV file not found: ${csvPath}`);
            process.exit(1);
        }

        console.log(`📊 Reading CSV file: ${csvPath}`);
        const csvContent = fs.readFileSync(csvPath, 'utf-8');

        const players = parseCSV(csvContent);
        console.log(`✅ Parsed ${players.length} player ratings from CSV`);

        await updateDatabase(players);

        generateTop100Json(players);

        console.log('\n✅ All operations completed successfully!');
        process.exit(0);
    } catch (error) {
        console.error('❌ Error:', error);
        process.exit(1);
    }
}

main();