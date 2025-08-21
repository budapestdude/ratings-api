import dotenv from 'dotenv';
import { initDatabase, closeDatabase } from '../database';
import { RatingImporter } from '../services/ratingImporter';

dotenv.config();

async function main() {
    const args = process.argv.slice(2);
    
    if (args.length === 0) {
        console.log('Usage: npm run import-ratings [current|date|historical] [start-year]');
        console.log('Examples:');
        console.log('  npm run import-ratings current');
        console.log('  npm run import-ratings 20241201');
        console.log('  npm run import-ratings historical 2015');
        process.exit(1);
    }

    try {
        await initDatabase();
        const importer = new RatingImporter();

        if (args[0] === 'current') {
            console.log('Importing current month ratings...');
            await importer.importCurrentMonth();
        } else if (args[0] === 'historical') {
            const startYear = args[1] ? parseInt(args[1]) : 2015;
            console.log(`Starting historical import from ${startYear}...`);
            await importer.importHistoricalData(startYear);
        } else {
            const date = args[0];
            console.log(`Importing rating list for ${date}...`);
            await importer.importRatingList(date);
        }

        console.log('Import completed successfully');
    } catch (error) {
        console.error('Import failed:', error);
        process.exit(1);
    } finally {
        await closeDatabase();
    }
}

main();