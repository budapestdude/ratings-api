import dotenv from 'dotenv';
import { initDatabase, closeDatabase } from './src/database';
import { RatingImporter } from './src/services/ratingImporter';

dotenv.config();

async function testImport() {
    try {
        await initDatabase();
        const importer = new RatingImporter();
        
        // Use the already downloaded file
        const filePath = './data/downloads/standard_rating_list.txt';
        const date = '20250801';
        
        console.log(`Testing import with local file...`);
        await importer.importRatingList(date, filePath);
        
        console.log('Import test completed');
    } catch (error) {
        console.error('Import test failed:', error);
    } finally {
        await closeDatabase();
    }
}

testImport();