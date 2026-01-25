const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const database = require('./database/database');

async function migrate() {
    try {
        console.log('Adding selling_price column to raw_materials table...');
        await database.run(`
      ALTER TABLE raw_materials 
      ADD COLUMN IF NOT EXISTS selling_price DECIMAL(10,2) DEFAULT 0;
    `);
        console.log('Successfully added selling_price column.');
        process.exit(0);
    } catch (error) {
        console.error('Migration failed:', error);
        process.exit(1);
    }
}

migrate();
