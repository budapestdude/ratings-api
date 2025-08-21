import dotenv from 'dotenv';
import { getDatabase } from '../database';

dotenv.config();

async function markInactivePlayers() {
  const db = await getDatabase();
  
  console.log('Marking inactive players...');
  
  // Mark players as inactive if they haven't played a single game in the last 24 months
  const cutoffDate = '20230801'; // 2 years before August 2025
  
  // First, get count of players to be marked inactive
  const checkResult = await db.get(`
    SELECT COUNT(DISTINCT p.fide_id) as count
    FROM players p
    WHERE NOT EXISTS (
      SELECT 1 FROM ratings r 
      WHERE r.fide_id = p.fide_id 
      AND r.rating_date >= ?
      AND (r.standard_games > 0 OR r.rapid_games > 0 OR r.blitz_games > 0)
    )
  `, [cutoffDate]);
  
  console.log(`Found ${checkResult.count} players with no games since ${cutoffDate}`);
  
  // Mark them as inactive
  const result = await db.run(`
    UPDATE players 
    SET is_active = 0,
        inactive_date = '2023-08-01'
    WHERE fide_id IN (
      SELECT p.fide_id
      FROM players p
      WHERE NOT EXISTS (
        SELECT 1 FROM ratings r 
        WHERE r.fide_id = p.fide_id 
        AND r.rating_date >= ?
        AND (r.standard_games > 0 OR r.rapid_games > 0 OR r.blitz_games > 0)
      )
    )
  `, [cutoffDate]);
  
  console.log(`Marked ${result.changes} players as inactive`);
  
  // Mark known retired players specifically
  const retiredPlayers = [
    { name: 'Kasparov, Garry', retiredDate: '2005-03-10' },
    { name: 'Polgar, Judit', retiredDate: '2014-08-12' },
    { name: 'Karpov, Anatoly', retiredDate: '2005-01-01' },
    { name: 'Fischer, Robert James', retiredDate: '1992-01-01' },
    { name: 'Spassky, Boris V.', retiredDate: '2008-01-01' },
    { name: 'Tal, Mikhail', retiredDate: '1992-06-28' },
    { name: 'Petrosian, Tigran V', retiredDate: '1984-08-13' },
    { name: 'Botvinnik, Mikhail', retiredDate: '1970-01-01' }
  ];
  
  for (const player of retiredPlayers) {
    const updateResult = await db.run(`
      UPDATE players 
      SET is_active = 0,
          inactive_date = ?
      WHERE name = ?
    `, [player.retiredDate, player.name]);
    
    if (updateResult.changes > 0) {
      console.log(`Marked ${player.name} as retired (${player.retiredDate})`);
    }
  }
  
  // Get statistics
  const stats = await db.get(`
    SELECT 
      COUNT(*) as total_players,
      SUM(CASE WHEN is_active = 1 THEN 1 ELSE 0 END) as active_players,
      SUM(CASE WHEN is_active = 0 THEN 1 ELSE 0 END) as inactive_players
    FROM players
  `);
  
  console.log('\n=== Final Statistics ===');
  console.log(`Total players: ${stats.total_players}`);
  console.log(`Active players: ${stats.active_players}`);
  console.log(`Inactive players: ${stats.inactive_players}`);
  
  // Show some famous inactive players
  const famousInactive = await db.all(`
    SELECT name, title, federation, inactive_date
    FROM players
    WHERE is_active = 0 
    AND title = 'GM'
    AND name IN ('Kasparov, Garry', 'Polgar, Judit', 'Karpov, Anatoly', 'Fischer, Robert James')
    ORDER BY name
  `);
  
  console.log('\nFamous inactive players:');
  for (const player of famousInactive) {
    console.log(`- ${player.title} ${player.name} (${player.federation}) - Inactive since ${player.inactive_date}`);
  }
}

markInactivePlayers().catch(console.error);