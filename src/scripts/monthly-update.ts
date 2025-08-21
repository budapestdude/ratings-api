import * as cron from 'node-cron';
import { exec } from 'child_process';
import { promisify } from 'util';
import dotenv from 'dotenv';

dotenv.config();

const execAsync = promisify(exec);

// Schedule for 1st of every month at 2 AM
const CRON_SCHEDULE = '0 2 1 * *';

async function runMonthlyUpdate() {
  console.log('='.repeat(50));
  console.log('MONTHLY UPDATE STARTED');
  console.log('='.repeat(50));
  console.log(`Date: ${new Date().toISOString()}`);
  console.log('');
  
  try {
    // Step 1: Update ratings from FIDE
    console.log('Step 1: Updating ratings from FIDE...');
    const { stdout: updateOutput } = await execAsync('npm run update-ratings');
    console.log(updateOutput);
    
    // Step 2: Generate static Top 100 data
    console.log('\nStep 2: Generating static Top 100 data...');
    const { stdout: generateOutput } = await execAsync('npm run generate-top100');
    console.log(generateOutput);
    
    console.log('\n' + '='.repeat(50));
    console.log('MONTHLY UPDATE COMPLETED SUCCESSFULLY');
    console.log('='.repeat(50));
    console.log(`Completed at: ${new Date().toISOString()}`);
    
  } catch (error) {
    console.error('\n' + '='.repeat(50));
    console.error('MONTHLY UPDATE FAILED');
    console.error('='.repeat(50));
    console.error('Error:', error);
    
    // You could add email notifications or logging to a file here
  }
}

// Set up the cron job
console.log('Setting up monthly update cron job...');
console.log(`Schedule: ${CRON_SCHEDULE} (1st of every month at 2 AM)`);

const job = cron.schedule(CRON_SCHEDULE, runMonthlyUpdate, {
  scheduled: true,
  timezone: "America/New_York" // Adjust to your timezone
});

console.log('Monthly update cron job is running.');
console.log('The next update will run on the 1st of next month at 2 AM.');

// Also allow manual trigger for testing
if (process.argv.includes('--run-now')) {
  console.log('\nManual trigger detected. Running update now...');
  runMonthlyUpdate();
}

// Keep the process running
process.on('SIGINT', () => {
  console.log('\nStopping cron job...');
  job.stop();
  process.exit(0);
});