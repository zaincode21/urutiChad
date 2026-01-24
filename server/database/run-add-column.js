const path = require('path');
// Load environment variables
require('dotenv').config({ path: path.join(__dirname, '../../.env') });
const fs = require('fs');
const database = require('./database');

async function runMigration() {
    try {
        const sqlPath = path.join(__dirname, 'add-is-atelier-item-column.sql');
        const sql = fs.readFileSync(sqlPath, 'utf8');

        console.log('Running migration...');
        await database.query(sql);
        console.log('Migration completed successfully');
    } catch (error) {
        console.error('Migration failed:', error);
    } finally {
        // Close the pool to exit cleanly
        try {
            await database.close();
        } catch (e) {
            // ignore close error
        }
        process.exit(0);
    }
}

runMigration();
