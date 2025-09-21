import { getDatabaseAdapter } from '../database/adapter';

const samplePlayers = [
    {
        fide_id: 1503014,
        name: 'Carlsen, Magnus',
        title: 'GM',
        federation: 'NOR',
        sex: 'M',
        birth_year: 1990,
        standard_rating: 2839,
        rapid_rating: 2831,
        blitz_rating: 2887
    },
    {
        fide_id: 2020009,
        name: 'Kasparov, Garry',
        title: 'GM',
        federation: 'RUS',
        sex: 'M',
        birth_year: 1963,
        standard_rating: 2812,
        rapid_rating: 2800,
        blitz_rating: 2800
    },
    {
        fide_id: 25059530,
        name: 'Nakamura, Hikaru',
        title: 'GM',
        federation: 'USA',
        sex: 'M',
        birth_year: 1987,
        standard_rating: 2802,
        rapid_rating: 2829,
        blitz_rating: 2900
    },
    {
        fide_id: 623539,
        name: 'Nepomniachtchi, Ian',
        title: 'GM',
        federation: 'RUS',
        sex: 'M',
        birth_year: 1990,
        standard_rating: 2798,
        rapid_rating: 2813,
        blitz_rating: 2824
    },
    {
        fide_id: 5073404,
        name: 'Ding, Liren',
        title: 'GM',
        federation: 'CHN',
        sex: 'M',
        birth_year: 1992,
        standard_rating: 2797,
        rapid_rating: 2789,
        blitz_rating: 2755
    },
    {
        fide_id: 35077260,
        name: 'Firouzja, Alireza',
        title: 'GM',
        federation: 'FRA',
        sex: 'M',
        birth_year: 2003,
        standard_rating: 2795,
        rapid_rating: 2810,
        blitz_rating: 2841
    },
    {
        fide_id: 1933582,
        name: 'Gukesh, D',
        title: 'GM',
        federation: 'IND',
        sex: 'M',
        birth_year: 2006,
        standard_rating: 2794,
        rapid_rating: 2760,
        blitz_rating: 2715
    },
    {
        fide_id: 3503240,
        name: 'Caruana, Fabiano',
        title: 'GM',
        federation: 'USA',
        sex: 'M',
        birth_year: 1992,
        standard_rating: 2793,
        rapid_rating: 2806,
        blitz_rating: 2823
    },
    {
        fide_id: 35009192,
        name: 'Arjun, Erigaisi',
        title: 'GM',
        federation: 'IND',
        sex: 'M',
        birth_year: 2003,
        standard_rating: 2793,
        rapid_rating: 2761,
        blitz_rating: 2744
    },
    {
        fide_id: 14109336,
        name: 'Abdusattorov, Nodirbek',
        title: 'GM',
        federation: 'UZB',
        sex: 'M',
        birth_year: 2004,
        standard_rating: 2783,
        rapid_rating: 2810,
        blitz_rating: 2791
    }
];

export async function initSampleData() {
    const db = await getDatabaseAdapter();
    
    try {
        // Check if we already have data
        const playerCount = await db.get('SELECT COUNT(*) as count FROM players').catch(() => null);
        
        if (playerCount && playerCount.count > 0) {
            console.log(`Database already has ${playerCount.count} players, skipping sample data`);
            return;
        }
        
        console.log('Database is empty, adding sample data...');
        
        // Insert sample players
        for (const player of samplePlayers) {
            await db.run(`
                INSERT OR IGNORE INTO players (
                    fide_id, name, title, federation, sex, birth_year
                ) VALUES (?, ?, ?, ?, ?, ?)
            `, [
                player.fide_id,
                player.name,
                player.title,
                player.federation,
                player.sex,
                player.birth_year
            ]);
            
            // Insert current ratings
            await db.run(`
                INSERT OR IGNORE INTO ratings (
                    fide_id, rating_date, 
                    standard_rating, rapid_rating, blitz_rating,
                    standard_games, rapid_games, blitz_games
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            `, [
                player.fide_id,
                '20250801', // August 2025
                player.standard_rating,
                player.rapid_rating,
                player.blitz_rating,
                0, 0, 0 // games played
            ]);
        }
        
        console.log(`Added ${samplePlayers.length} sample players to database`);
        
    } catch (error) {
        console.error('Error initializing sample data:', error);
    }
}

// Run if called directly
if (require.main === module) {
    initSampleData()
        .then(() => {
            console.log('Sample data initialization complete');
            process.exit(0);
        })
        .catch(error => {
            console.error('Failed to initialize sample data:', error);
            process.exit(1);
        });
}