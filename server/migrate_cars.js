const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const database = require('./database/database');

const migrate = async () => {
    try {
        console.log('Starting migration for cars table...');

        await database.run(`
            CREATE TABLE IF NOT EXISTS cars (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                plate_number VARCHAR(20) UNIQUE NOT NULL,
                make VARCHAR(50),
                model VARCHAR(50),
                year INTEGER,
                color VARCHAR(30),
                owner_name VARCHAR(255) NOT NULL,
                owner_contact VARCHAR(50) NOT NULL,
                is_active BOOLEAN DEFAULT true,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

        console.log('Created cars table successfully');

        // Create index on plate_number for faster lookups
        await database.run('CREATE INDEX IF NOT EXISTS idx_cars_plate_number ON cars(plate_number)');

        console.log('Migration completed successfully');
    } catch (error) {
        console.error('Migration failed:', error);
    } finally {
        process.exit(0);
    }
};

migrate();
