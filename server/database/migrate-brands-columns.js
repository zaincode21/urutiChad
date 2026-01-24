const database = require('./database');

async function migrateBrandsColumns() {
  try {
    console.log('🔄 Adding website and country columns to brands table...');
    
    // Check if columns already exist
    const checkWebsite = await database.get(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'brands' AND column_name = 'website'
    `);
    
    const checkCountry = await database.get(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'brands' AND column_name = 'country'
    `);
    
    if (!checkWebsite) {
      await database.run('ALTER TABLE brands ADD COLUMN website TEXT');
      console.log('✅ Added website column to brands table');
    } else {
      console.log('ℹ️  website column already exists');
    }
    
    if (!checkCountry) {
      await database.run('ALTER TABLE brands ADD COLUMN country VARCHAR(100)');
      console.log('✅ Added country column to brands table');
    } else {
      console.log('ℹ️  country column already exists');
    }
    
    console.log('✅ Brands table migration completed successfully!');
    
  } catch (error) {
    console.error('❌ Error migrating brands table:', error);
    throw error;
  } finally {
    // Close the database connection
    if (database.pool) {
      await database.pool.end();
    }
  }
}

// Run migration if this file is executed directly
if (require.main === module) {
  migrateBrandsColumns()
    .then(() => {
      console.log('🎉 Migration completed successfully!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Migration failed:', error);
      process.exit(1);
    });
}

module.exports = migrateBrandsColumns;
