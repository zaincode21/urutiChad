const database = require('../database/database');

async function addQuantityColumn() {
  try {
    console.log('🔄 Adding quantity column to bottle_sizes table...');
    
    // Check if column already exists
    const checkColumn = await database.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'bottle_sizes' AND column_name = 'quantity'
    `);
    
    if (checkColumn.rows.length > 0) {
      console.log('✅ Quantity column already exists');
      return;
    }
    
    // Add quantity column
    await database.query(`
      ALTER TABLE bottle_sizes 
      ADD COLUMN quantity INTEGER DEFAULT 0
    `);
    
    console.log('✅ Quantity column added successfully');
  } catch (error) {
    console.error('❌ Error adding quantity column:', error);
    throw error;
  }
}

addQuantityColumn()
  .then(() => {
    console.log('✅ Migration completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  });
