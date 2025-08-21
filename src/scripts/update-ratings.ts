import dotenv from 'dotenv';
import { initDatabase, closeDatabase } from '../database';
import { RatingImporter } from '../services/ratingImporter';

dotenv.config();

async function main() {
    try {
        await initDatabase();
        const importer = new RatingImporter();
        
        const date = new Date();
        const dateStr = `${date.getFullYear()}${(date.getMonth() + 1).toString().padStart(2, '0')}01`;
        
        console.log(`Updating ratings for ${dateStr}...`);
        await importer.importRatingList(dateStr);
        
        console.log('Update completed successfully');
    } catch (error) {
        console.error('Update failed:', error);
        process.exit(1);
    } finally {
        await closeDatabase();
    }
}

main();