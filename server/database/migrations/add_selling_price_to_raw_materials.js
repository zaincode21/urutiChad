require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });
const database = require('../database');

async function migrate() {
    try {
        console.log('🔄 Starting migration: add_selling_price_to_raw_materials...');

        // Check if column exists using PostgreSQL information_schema
        const checkQuery = `
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'raw_materials' AND column_name = 'selling_price'
    `;
        const result = await database.all(checkQuery);
        const hasSellingPrice = result && result.length > 0;

        if (hasSellingPrice) {
            console.log('⚠️ Column selling_price already exists in raw_materials table. Skipping.');
        } else {
            console.log('➕ Adding selling_price column to raw_materials table...');
            await database.run(`
        ALTER TABLE raw_materials 
        ADD COLUMN selling_price DECIMAL(10,2) DEFAULT 0
      `);
            console.log('✅ Column added successfully.');
        }

        console.log('✅ Migration completed successfully!');
    } catch (error) {
        console.error('❌ Migration failed:', error);
        process.exit(1);
    }
}

// Run migration if called directly
if (require.main === module) {
    migrate().then(() => {
        process.exit(0);
    }).catch((error) => {
        console.error('Migration failed:', error);
        process.exit(1);
    });
}

module.exports = migrate;
