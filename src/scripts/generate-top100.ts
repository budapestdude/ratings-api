import dotenv from 'dotenv';
import { initDatabase, closeDatabase } from '../database';
import fs from 'fs/promises';
import path from 'path';
import axios from 'axios';

dotenv.config();

interface Top100Data {
  generatedAt: string;
  month: string;
  categories: {
    standard: CategoryData;
    rapid: CategoryData;
    blitz: CategoryData;
  };
}

interface CategoryData {
  open: PlayerData[];
  women: PlayerData[];
  juniors: PlayerData[];
  girls: PlayerData[];
  seniors50: PlayerData[];
  seniors65: PlayerData[];
}

interface PlayerData {
  rank: number;
  fide_id: number;
  name: string;
  title?: string;
  federation?: string;
  rating: number;
  birth_year?: number;
  sex?: string;
  games_played?: number;
}

async function fetchTop100(category: string, filters: Record<string, string> = {}): Promise<PlayerData[]> {
  const params = new URLSearchParams({
    category,
    limit: '100',
    excludeInactive: 'true',  // Exclude retired players like Kasparov, Polgar
    // activeOnly: 'false',  // Include players who haven't played recently
    ...filters
  });
  
  try {
    const response = await axios.get(
      `http://localhost:${process.env.PORT || 3001}/api/rankings/top?${params}`,
      { 
        timeout: 30000, // 30 second timeout per request
        validateStatus: (status) => status < 500 // Accept 4xx as valid
      }
    );
    
    if (response.data?.success && response.data?.data) {
      return response.data.data;
    }
    
    console.warn(`No data returned for ${category} with filters:`, filters);
    return [];
  } catch (error: any) {
    if (error.code === 'ECONNREFUSED') {
      throw new Error('API server is not running. Please start it with "npm run dev"');
    }
    throw error;
  }
}

async function generateTop100Data(): Promise<Top100Data> {
  const categories = ['standard', 'rapid', 'blitz'];
  const result: Top100Data = {
    generatedAt: new Date().toISOString(),
    month: new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' }),
    categories: {
      standard: { open: [], women: [], juniors: [], girls: [], seniors50: [], seniors65: [] },
      rapid: { open: [], women: [], juniors: [], girls: [], seniors50: [], seniors65: [] },
      blitz: { open: [], women: [], juniors: [], girls: [], seniors50: [], seniors65: [] }
    }
  };

  // Process all categories in parallel for better performance
  const categoryPromises = categories.map(async (category) => {
    console.log(`\nStarting ${category} rankings generation...`);
    const startTime = Date.now();
    
    try {
      // Fetch all list types in parallel for this category
      const [open, women, juniors, girls, seniors50, seniors65] = await Promise.all([
        fetchTop100(category).catch(err => {
          console.error(`Error fetching ${category} open:`, err.message);
          return [];
        }),
        fetchTop100(category, { sex: 'F' }).catch(err => {
          console.error(`Error fetching ${category} women:`, err.message);
          return [];
        }),
        fetchTop100(category, { maxAge: '20' }).catch(err => {
          console.error(`Error fetching ${category} juniors:`, err.message);
          return [];
        }),
        fetchTop100(category, { sex: 'F', maxAge: '20' }).catch(err => {
          console.error(`Error fetching ${category} girls:`, err.message);
          return [];
        }),
        fetchTop100(category, { minAge: '50' }).catch(err => {
          console.error(`Error fetching ${category} seniors 50+:`, err.message);
          return [];
        }),
        fetchTop100(category, { minAge: '65' }).catch(err => {
          console.error(`Error fetching ${category} seniors 65+:`, err.message);
          return [];
        })
      ]);
      
      // Store results
      const catKey = category as keyof typeof result.categories;
      result.categories[catKey].open = open;
      result.categories[catKey].women = women;
      result.categories[catKey].juniors = juniors;
      result.categories[catKey].girls = girls;
      result.categories[catKey].seniors50 = seniors50;
      result.categories[catKey].seniors65 = seniors65;
      
      const elapsed = ((Date.now() - startTime) / 1000).toFixed(2);
      console.log(`✓ Completed ${category} rankings in ${elapsed}s`);
      console.log(`  - Open: ${open.length} players`);
      console.log(`  - Women: ${women.length} players`);
      console.log(`  - Juniors: ${juniors.length} players`);
      console.log(`  - Girls: ${girls.length} players`);
      console.log(`  - Seniors 50+: ${seniors50.length} players`);
      console.log(`  - Seniors 65+: ${seniors65.length} players`);
    } catch (error) {
      console.error(`Failed to generate ${category} rankings:`, error);
    }
  });
  
  // Wait for all categories to complete
  await Promise.all(categoryPromises);
  
  return result;
}

async function saveTop100Data(data: Top100Data): Promise<void> {
  const outputDir = path.join(process.cwd(), 'client', 'public', 'data');
  await fs.mkdir(outputDir, { recursive: true });
  
  const outputPath = path.join(outputDir, 'top100.json');
  await fs.writeFile(outputPath, JSON.stringify(data, null, 2));
  
  console.log(`Top 100 data saved to ${outputPath}`);
  
  // Also save a backup with timestamp
  const backupPath = path.join(outputDir, `top100-${new Date().toISOString().split('T')[0]}.json`);
  await fs.writeFile(backupPath, JSON.stringify(data, null, 2));
  console.log(`Backup saved to ${backupPath}`);
}

async function main() {
  const startTime = Date.now();
  
  try {
    console.log('='.repeat(50));
    console.log('FIDE TOP 100 STATIC GENERATION');
    console.log('='.repeat(50));
    console.log(`Date: ${new Date().toISOString()}`);
    console.log(`API URL: http://localhost:${process.env.PORT || 3001}`);
    console.log('');
    
    // Check if API is running
    console.log('Checking API availability...');
    try {
      await axios.get(`http://localhost:${process.env.PORT || 3001}/api/health`, { timeout: 5000 });
      console.log('✓ API is running\n');
    } catch (error) {
      console.error('✗ API is not responding. Please ensure the server is running with "npm run dev"');
      process.exit(1);
    }
    
    console.log('Generating top 100 lists for all categories and player types...');
    const data = await generateTop100Data();
    
    console.log('\nSaving generated data...');
    await saveTop100Data(data);
    
    // Generate comprehensive statistics
    const stats = {
      totalLists: 15, // 3 categories × 5 list types
      totalPlayers: {
        standard: Object.values(data.categories.standard).reduce((acc, list) => acc + list.length, 0),
        rapid: Object.values(data.categories.rapid).reduce((acc, list) => acc + list.length, 0),
        blitz: Object.values(data.categories.blitz).reduce((acc, list) => acc + list.length, 0)
      },
      topPlayers: {
        standard: data.categories.standard.open[0],
        rapid: data.categories.rapid.open[0],
        blitz: data.categories.blitz.open[0]
      },
      topWomen: {
        standard: data.categories.standard.women[0],
        rapid: data.categories.rapid.women[0],
        blitz: data.categories.blitz.women[0]
      }
    };
    
    const elapsed = ((Date.now() - startTime) / 1000).toFixed(2);
    
    console.log('\n' + '='.repeat(50));
    console.log('GENERATION COMPLETE');
    console.log('='.repeat(50));
    console.log(`Total time: ${elapsed} seconds`);
    console.log(`Total lists generated: ${stats.totalLists}`);
    console.log('\nTop Players by Category:');
    console.log(`  Standard: ${stats.topPlayers.standard?.name || 'N/A'} (${stats.topPlayers.standard?.rating || 0})`);
    console.log(`  Rapid: ${stats.topPlayers.rapid?.name || 'N/A'} (${stats.topPlayers.rapid?.rating || 0})`);
    console.log(`  Blitz: ${stats.topPlayers.blitz?.name || 'N/A'} (${stats.topPlayers.blitz?.rating || 0})`);
    console.log('\nTop Women by Category:');
    console.log(`  Standard: ${stats.topWomen.standard?.name || 'N/A'} (${stats.topWomen.standard?.rating || 0})`);
    console.log(`  Rapid: ${stats.topWomen.rapid?.name || 'N/A'} (${stats.topWomen.rapid?.rating || 0})`);
    console.log(`  Blitz: ${stats.topWomen.blitz?.name || 'N/A'} (${stats.topWomen.blitz?.rating || 0})`);
    console.log('\nFiles generated:');
    console.log(`  - client/public/data/top100.json`);
    console.log(`  - client/public/data/top100-${new Date().toISOString().split('T')[0]}.json`);
    console.log('\n✓ Success! Static top 100 data has been generated.');
    
  } catch (error: any) {
    console.error('\n✗ Failed to generate Top 100:', error.message || error);
    if (error.stack) {
      console.error('\nStack trace:');
      console.error(error.stack);
    }
    process.exit(1);
  } finally {
    await closeDatabase();
  }
}

// Run on the 1st of each month or manually
if (require.main === module) {
  main();
}