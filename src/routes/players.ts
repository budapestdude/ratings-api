import { Router } from 'express';
import { getDatabase } from '../database';
import { PlayerWithRating } from '../models/player';

const router = Router();

router.get('/search', async (req, res) => {
    try {
        const { name, federation, minRating, maxRating, title, limit = 50, offset = 0 } = req.query;
        const db = await getDatabase();
        
        let query = `
            SELECT DISTINCT p.*, 
                   r.standard_rating, r.rapid_rating, r.blitz_rating, r.rating_date
            FROM players p
            LEFT JOIN ratings r ON p.fide_id = r.fide_id
            LEFT JOIN (
                SELECT fide_id, MAX(rating_date) as max_date
                FROM ratings
                GROUP BY fide_id
            ) latest ON r.fide_id = latest.fide_id AND r.rating_date = latest.max_date
            WHERE 1=1
        `;
        
        const params: any[] = [];

        if (name) {
            query += ' AND p.name LIKE ?';
            params.push(`%${name}%`);
        }

        if (federation) {
            query += ' AND p.federation = ?';
            params.push(federation);
        }

        if (title) {
            query += ' AND p.title = ?';
            params.push(title);
        }

        if (minRating) {
            query += ' AND (r.standard_rating >= ? OR r.rapid_rating >= ? OR r.blitz_rating >= ?)';
            params.push(minRating, minRating, minRating);
        }

        if (maxRating) {
            query += ' AND (r.standard_rating <= ? OR r.rapid_rating <= ? OR r.blitz_rating <= ?)';
            params.push(maxRating, maxRating, maxRating);
        }

        query += ' ORDER BY r.standard_rating DESC LIMIT ? OFFSET ?';
        params.push(limit, offset);

        const players = await db.all<PlayerWithRating[]>(query, params);
        
        res.json({
            success: true,
            data: players,
            pagination: {
                limit: Number(limit),
                offset: Number(offset)
            }
        });
    } catch (error) {
        console.error('Search error:', error);
        res.status(500).json({ success: false, error: 'Internal server error' });
    }
});

router.get('/:fideId', async (req, res) => {
    try {
        const { fideId } = req.params;
        const db = await getDatabase();
        
        const player = await db.get<PlayerWithRating>(`
            SELECT p.*, 
                   r.standard_rating, r.rapid_rating, r.blitz_rating, r.rating_date
            FROM players p
            LEFT JOIN ratings r ON p.fide_id = r.fide_id
            LEFT JOIN (
                SELECT fide_id, MAX(rating_date) as max_date
                FROM ratings
                GROUP BY fide_id
            ) latest ON r.fide_id = latest.fide_id AND r.rating_date = latest.max_date
            WHERE p.fide_id = ?
        `, fideId);

        if (!player) {
            res.status(404).json({ success: false, error: 'Player not found' });
            return;
        }

        res.json({ success: true, data: player });
    } catch (error) {
        console.error('Get player error:', error);
        res.status(500).json({ success: false, error: 'Internal server error' });
    }
});

router.get('/:fideId/history', async (req, res) => {
    try {
        const { fideId } = req.params;
        const { startDate, endDate, limit = 1000 } = req.query;
        const db = await getDatabase();
        
        let query = `
            SELECT * FROM ratings 
            WHERE fide_id = ?
        `;
        const params: any[] = [fideId];

        if (startDate) {
            query += ' AND rating_date >= ?';
            params.push(startDate);
        }

        if (endDate) {
            query += ' AND rating_date <= ?';
            params.push(endDate);
        }

        query += ' ORDER BY rating_date DESC LIMIT ?';
        params.push(limit);

        const history = await db.all(query, params);
        
        res.json({ success: true, data: history });
    } catch (error) {
        console.error('Get history error:', error);
        res.status(500).json({ success: false, error: 'Internal server error' });
    }
});

router.get('/:fideId/rating-changes', async (req, res) => {
    try {
        const { fideId } = req.params;
        const db = await getDatabase();
        
        const changes = await db.all(`
            SELECT 
                rating_date,
                standard_rating,
                rapid_rating,
                blitz_rating,
                LAG(standard_rating) OVER (ORDER BY rating_date) as prev_standard,
                LAG(rapid_rating) OVER (ORDER BY rating_date) as prev_rapid,
                LAG(blitz_rating) OVER (ORDER BY rating_date) as prev_blitz
            FROM ratings
            WHERE fide_id = ?
            ORDER BY rating_date DESC
            LIMIT 12
        `, fideId);

        const formattedChanges = changes.map(row => ({
            date: row.rating_date,
            standard: {
                rating: row.standard_rating,
                change: row.prev_standard ? row.standard_rating - row.prev_standard : null
            },
            rapid: {
                rating: row.rapid_rating,
                change: row.prev_rapid ? row.rapid_rating - row.prev_rapid : null
            },
            blitz: {
                rating: row.blitz_rating,
                change: row.prev_blitz ? row.blitz_rating - row.prev_blitz : null
            }
        }));

        res.json({ success: true, data: formattedChanges });
    } catch (error) {
        console.error('Get rating changes error:', error);
        res.status(500).json({ success: false, error: 'Internal server error' });
    }
});

export default router;