const fs = require('fs');
const path = require('path');
const database = require('./database/database');

async function migrateAtelierColumn() {
  try {
    console.log('🔄 Starting migration to add is_atelier_item column...');
    
    // Read the migration SQL file
    const migrationSQL = fs.readFileSync(
      path.join(__dirname, 'database', 'add-is-atelier-item-column.sql'), 
      'utf8'
    );
    
    // Split by semicolon and execute each statement
    const statements = migrationSQL
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'));
    
    for (const statement of statements) {
      console.log('Executing:', statement.substring(0, 50) + '...');
      await database.run(statement);
    }
    
    console.log('✅ Migration completed successfully!');
    console.log('📝 The is_atelier_item column has been added to order_items table');
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  }
}

// Run migration if this file is executed directly
if (require.main === module) {
  migrateAtelierColumn()
    .then(() => {
      console.log('🎉 Migration finished successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Migration failed:', error);
      process.exit(1);
    });
}

module.exports = { migrateAtelierColumn };