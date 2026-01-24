const database = require('./database/database');

async function fixDiscountsSchema() {
  try {
    console.log('🔧 Fixing discounts table schema...');
    
    // Drop the old discounts table
    await database.run('DROP TABLE IF EXISTS discounts');
    console.log('✅ Dropped old discounts table');
    
    // Create the new discounts table with correct schema
    await database.run(`
      CREATE TABLE discounts (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        description TEXT,
        type TEXT NOT NULL,
        value DECIMAL(10,2),
        min_purchase_amount DECIMAL(10,2) DEFAULT 0,
        max_discount_amount DECIMAL(10,2),
        start_date DATE,
        end_date DATE,
        usage_limit INTEGER,
        usage_per_customer INTEGER DEFAULT 1,
        applicable_to TEXT DEFAULT 'all',
        customer_tiers TEXT,
        bottle_return_count INTEGER,
        is_active BOOLEAN DEFAULT 1,
        auto_apply BOOLEAN DEFAULT 0,
        discount_type TEXT DEFAULT 'regular_discount',
        created_by TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (created_by) REFERENCES users (id)
      )
    `);
    console.log('✅ Created new discounts table with correct schema');
    
    // Verify the schema
    const schema = await database.all("PRAGMA table_info(discounts)");
    console.log('📋 New schema columns:', schema.map(col => col.name));
    
  } catch (error) {
    console.error('❌ Error fixing schema:', error);
  } finally {
    database.close();
  }
}

fixDiscountsSchema(); 