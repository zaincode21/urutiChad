const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const database = require('./database/database');

const migrate = async () => {
    try {
        console.log('Starting migration...');

        // Check if column exists
        try {
            await database.run('ALTER TABLE raw_materials ADD COLUMN selling_price DECIMAL(10,2) DEFAULT 0');
            console.log('Added selling_price column to raw_materials');
        } catch (e) {
            if (e.message.includes('duplicate column')) {
                console.log('Column selling_price already exists');
            } else {
                throw e;
            }
        }

        console.log('Migration completed successfully');
    } catch (error) {
        console.error('Migration failed:', error);
    } finally {
        // Close connection is not exposed in the simple wrapper usually, but process exit handles it
        process.exit(0);
    }
};

migrate();
