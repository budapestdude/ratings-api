import { Router } from 'express';
import { getDatabase } from '../database';

const router = Router();

router.get('/top', async (req, res) => {
    try {
        const { 
            category = 'standard', 
            federation, 
            title,
            sex,
            minAge,
            maxAge,
            limit = 100,
            activeOnly = 'false',
            excludeInactive = 'true'
        } = req.query;
        
        const db = await getDatabase();
        const currentYear = new Date().getFullYear();
        const currentMonth = new Date().getMonth() + 1;
        
        let ratingColumn = 'r.standard_rating';
        let gamesColumn = 'r.standard_games';
        if (category === 'rapid') {
            ratingColumn = 'r.rapid_rating';
            gamesColumn = 'r.rapid_games';
        }
        if (category === 'blitz') {
            ratingColumn = 'r.blitz_rating';
            gamesColumn = 'r.blitz_games';
        }
        
        // Calculate the date 12 months ago for activity check
        const twelveMonthsAgo = `${currentYear - 1}${currentMonth.toString().padStart(2, '0')}01`;
        
        // Optimized query - get most recent ratings first
        // Use the date format from the actual data (YYYYMMDD)
        let query = `
            SELECT p.*, ${ratingColumn} as rating, r.rating_date, ${gamesColumn} as games_played
            FROM players p
            INNER JOIN ratings r ON p.fide_id = r.fide_id
            WHERE r.rating_date = '20250801'
            AND ${ratingColumn} IS NOT NULL
        `;
        
        const params: any[] = [];

        // Filter for active players (played at least 1 game in last 12 months)
        // Simplified query for better performance
        if (activeOnly === 'true') {
            query += ` AND ${gamesColumn} > 0`;
        }
        
        // Exclude retired/inactive players
        if (excludeInactive === 'true') {
            query += ` AND (p.is_active = 1 OR p.is_active IS NULL)`;
        }

        if (federation) {
            query += ' AND p.federation = ?';
            params.push(federation);
        }

        if (title) {
            query += ' AND p.title = ?';
            params.push(title);
        }

        if (sex) {
            query += ' AND p.sex = ?';
            params.push(sex);
        }

        if (minAge) {
            query += ' AND p.birth_year >= ?';
            params.push(currentYear - Number(minAge));
        }

        if (maxAge) {
            query += ' AND p.birth_year >= ?';
            params.push(currentYear - Number(maxAge));
        }

        query += ` ORDER BY ${ratingColumn} DESC LIMIT ?`;
        params.push(limit);

        const players = await db.all(query, params);
        
        res.json({
            success: true,
            data: players.map((p, index) => ({
                rank: index + 1,
                ...p
            }))
        });
    } catch (error) {
        console.error('Get top players error:', error);
        res.status(500).json({ success: false, error: 'Internal server error' });
    }
});

router.get('/statistics', async (_, res) => {
    try {
        const db = await getDatabase();
        
        const stats = await db.get(`
            SELECT 
                COUNT(DISTINCT p.fide_id) as total_players,
                COUNT(DISTINCT CASE WHEN p.title IS NOT NULL THEN p.fide_id END) as titled_players,
                COUNT(DISTINCT p.federation) as total_federations,
                AVG(r.standard_rating) as avg_standard,
                AVG(r.rapid_rating) as avg_rapid,
                AVG(r.blitz_rating) as avg_blitz,
                MAX(r.standard_rating) as max_standard,
                MAX(r.rapid_rating) as max_rapid,
                MAX(r.blitz_rating) as max_blitz
            FROM players p
            LEFT JOIN ratings r ON p.fide_id = r.fide_id
            INNER JOIN (
                SELECT fide_id, MAX(rating_date) as max_date
                FROM ratings
                GROUP BY fide_id
            ) latest ON r.fide_id = latest.fide_id AND r.rating_date = latest.max_date
        `);

        const distributions = await db.all(`
            SELECT 
                CASE 
                    WHEN r.standard_rating < 1200 THEN '< 1200'
                    WHEN r.standard_rating < 1400 THEN '1200-1399'
                    WHEN r.standard_rating < 1600 THEN '1400-1599'
                    WHEN r.standard_rating < 1800 THEN '1600-1799'
                    WHEN r.standard_rating < 2000 THEN '1800-1999'
                    WHEN r.standard_rating < 2200 THEN '2000-2199'
                    WHEN r.standard_rating < 2400 THEN '2200-2399'
                    WHEN r.standard_rating < 2600 THEN '2400-2599'
                    WHEN r.standard_rating < 2800 THEN '2600-2799'
                    ELSE '2800+'
                END as rating_range,
                COUNT(*) as count
            FROM players p
            INNER JOIN ratings r ON p.fide_id = r.fide_id
            INNER JOIN (
                SELECT fide_id, MAX(rating_date) as max_date
                FROM ratings
                GROUP BY fide_id
            ) latest ON r.fide_id = latest.fide_id AND r.rating_date = latest.max_date
            WHERE r.standard_rating IS NOT NULL
            GROUP BY rating_range
            ORDER BY MIN(r.standard_rating)
        `);

        res.json({
            success: true,
            data: {
                summary: stats,
                distribution: distributions
            }
        });
    } catch (error) {
        console.error('Get statistics error:', error);
        res.status(500).json({ success: false, error: 'Internal server error' });
    }
});

router.get('/federations', async (_, res) => {
    try {
        const db = await getDatabase();
        
        const federations = await db.all(`
            SELECT 
                p.federation,
                COUNT(DISTINCT p.fide_id) as player_count,
                AVG(r.standard_rating) as avg_rating,
                MAX(r.standard_rating) as top_rating,
                COUNT(DISTINCT CASE WHEN p.title IS NOT NULL THEN p.fide_id END) as titled_players
            FROM players p
            LEFT JOIN ratings r ON p.fide_id = r.fide_id
            INNER JOIN (
                SELECT fide_id, MAX(rating_date) as max_date
                FROM ratings
                GROUP BY fide_id
            ) latest ON r.fide_id = latest.fide_id AND r.rating_date = latest.max_date
            WHERE p.federation IS NOT NULL
            GROUP BY p.federation
            ORDER BY player_count DESC
        `);

        res.json({ success: true, data: federations });
    } catch (error) {
        console.error('Get federations error:', error);
        res.status(500).json({ success: false, error: 'Internal server error' });
    }
});

export default router;