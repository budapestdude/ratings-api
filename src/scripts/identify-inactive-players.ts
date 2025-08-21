import dotenv from 'dotenv';
import { getDatabase } from '../database';

dotenv.config();

async function identifyInactivePlayers() {
  const db = await getDatabase();
  
  console.log('='.repeat(50));
  console.log('IDENTIFYING INACTIVE PLAYERS');
  console.log('='.repeat(50));
  
  // Define inactivity criteria
  const MONTHS_INACTIVE = 24; // 2 years of no games
  const cutoffDate = '20230801'; // 2 years before August 2025
  
  console.log(`\nCriteria: No games played since ${cutoffDate} (${MONTHS_INACTIVE} months)\n`);
  
  // Step 1: Find players who haven't played any games in the last 2 years
  console.log('Step 1: Finding players with no recent games...');
  
  const inactivePlayers = await db.all(`
    SELECT 
      p.fide_id,
      p.name,
      p.title,
      p.federation,
      MAX(CASE 
        WHEN r.standard_games > 0 OR r.rapid_games > 0 OR r.blitz_games > 0 
        THEN r.rating_date 
        ELSE NULL 
      END) as last_game_date,
      SUM(r.standard_games + COALESCE(r.rapid_games, 0) + COALESCE(r.blitz_games, 0)) as total_career_games
    FROM players p
    LEFT JOIN ratings r ON p.fide_id = r.fide_id
    GROUP BY p.fide_id
    HAVING last_game_date < ? OR last_game_date IS NULL
    ORDER BY p.name
    LIMIT 100
  `, [cutoffDate]);
  
  console.log(`Found ${inactivePlayers.length} potentially inactive players\n`);
  
  // Step 2: Show some notable inactive players
  const notablePlayers = inactivePlayers.filter(p => 
    p.title === 'GM' || 
    p.title === 'IM' || 
    p.title === 'WGM' ||
    p.name.includes('Kasparov') ||
    p.name.includes('Karpov') ||
    p.name.includes('Fischer') ||
    p.name.includes('Polgar')
  );
  
  console.log('Notable inactive players found:');
  console.log('================================');
  for (const player of notablePlayers.slice(0, 20)) {
    const lastPlayed = player.last_game_date 
      ? `Last played: ${player.last_game_date.toString().substring(0, 4)}`
      : 'Never played in database';
    console.log(`${player.title || '  '} ${player.name.padEnd(30)} - ${lastPlayed}`);
  }
  
  // Step 3: Mark them as inactive
  console.log('\nStep 2: Marking players as inactive...');
  
  let updateCount = 0;
  for (const player of inactivePlayers) {
    const inactiveDate = player.last_game_date 
      ? `${player.last_game_date.toString().substring(0, 4)}-12-31`
      : '2020-01-01'; // Default for players with no game history
      
    await db.run(`
      UPDATE players 
      SET is_active = 0, 
          inactive_date = ?
      WHERE fide_id = ?
    `, [inactiveDate, player.fide_id]);
    updateCount++;
  }
  
  console.log(`Marked ${updateCount} players as inactive`);
  
  // Step 4: Get statistics
  const stats = await db.get(`
    SELECT 
      COUNT(*) as total_players,
      SUM(CASE WHEN is_active = 1 OR is_active IS NULL THEN 1 ELSE 0 END) as active_players,
      SUM(CASE WHEN is_active = 0 THEN 1 ELSE 0 END) as inactive_players
    FROM players
  `);
  
  const titleStats = await db.all(`
    SELECT 
      title,
      COUNT(*) as count
    FROM players
    WHERE is_active = 0
    GROUP BY title
    ORDER BY count DESC
    LIMIT 10
  `);
  
  console.log('\n' + '='.repeat(50));
  console.log('FINAL STATISTICS');
  console.log('='.repeat(50));
  console.log(`Total players: ${stats.total_players.toLocaleString()}`);
  console.log(`Active players: ${stats.active_players.toLocaleString()}`);
  console.log(`Inactive players: ${stats.inactive_players.toLocaleString()}`);
  console.log(`Inactive percentage: ${(stats.inactive_players / stats.total_players * 100).toFixed(2)}%`);
  
  console.log('\nInactive players by title:');
  for (const stat of titleStats) {
    console.log(`  ${(stat.title || 'Untitled').padEnd(10)} ${stat.count.toLocaleString()}`);
  }
  
  await db.close();
}

identifyInactivePlayers().catch(console.error);