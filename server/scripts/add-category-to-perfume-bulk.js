const database = require('../database/database');

async function addCategoryColumn() {
  try {
    console.log('🔄 Adding category_id column to perfume_bulk table...');
    
    // Check if column already exists
    const checkColumn = await database.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'perfume_bulk' AND column_name = 'category_id'
    `);
    
    if (checkColumn.rows.length > 0) {
      console.log('✅ category_id column already exists');
      return;
    }
    
    // Add category_id column
    await database.query(`
      ALTER TABLE perfume_bulk 
      ADD COLUMN category_id UUID,
      ADD CONSTRAINT perfume_bulk_category_id_fkey 
      FOREIGN KEY (category_id) REFERENCES categories (id)
    `);
    
    console.log('✅ category_id column added successfully');
  } catch (error) {
    console.error('❌ Error adding category_id column:', error);
    throw error;
  }
}

addCategoryColumn()
  .then(() => {
    console.log('✅ Migration completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  });

