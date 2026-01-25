const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const database = require('./database/database');

async function migrate() {
    try {
        console.log('Adding measurements column to customers table...');
        await database.run(`
      ALTER TABLE customers 
      ADD COLUMN IF NOT EXISTS measurements TEXT;
    `);
        console.log('Successfully added measurements column.');
        process.exit(0);
    } catch (error) {
        console.error('Migration failed:', error);
        process.exit(1);
    }
}

migrate();
