const database = require('../database/database');

async function fixOrdersTable() {
  try {
    console.log('🔄 Fixing orders table structure...');
    
    // Start transaction
    await database.run('BEGIN TRANSACTION');
    
    // Create a backup of the current orders table
    await database.run(`
      CREATE TABLE orders_backup AS SELECT * FROM orders
    `);
    console.log('✅ Created backup of orders table');
    
    // Drop the current orders table
    await database.run('DROP TABLE orders');
    console.log('✅ Dropped current orders table');
    
    // Recreate the orders table with proper structure
    await database.run(`
      CREATE TABLE orders (
        id TEXT PRIMARY KEY,
        customer_id TEXT,
        shop_id TEXT,
        order_number TEXT UNIQUE NOT NULL,
        order_type TEXT DEFAULT 'regular',
        status TEXT DEFAULT 'completed',
        subtotal DECIMAL(10,2) NOT NULL,
        tax_amount DECIMAL(10,2) DEFAULT 0,
        discount_amount DECIMAL(10,2) DEFAULT 0,
        loyalty_discount DECIMAL(10,2) DEFAULT 0,
        total_amount DECIMAL(10,2) NOT NULL,
        amount_paid DECIMAL(10,2) DEFAULT 0,
        remaining_amount DECIMAL(10,2) DEFAULT 0,
        currency TEXT DEFAULT 'RWF',
        payment_method TEXT,
        payment_status TEXT DEFAULT 'pending',
        notes TEXT,
        created_by TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (customer_id) REFERENCES customers (id),
        FOREIGN KEY (shop_id) REFERENCES shops (id),
        FOREIGN KEY (created_by) REFERENCES users (id)
      )
    `);
    console.log('✅ Recreated orders table with proper structure');
    
    // Restore data from backup
    await database.run(`
      INSERT INTO orders (
        id, customer_id, shop_id, order_number, order_type, status,
        subtotal, tax_amount, discount_amount, loyalty_discount, total_amount,
        amount_paid, remaining_amount, currency, payment_method, payment_status,
        notes, created_by, created_at, updated_at
      )
      SELECT 
        id, customer_id, shop_id, order_number, order_type, status,
        subtotal, tax_amount, discount_amount, loyalty_discount, total_amount,
        COALESCE(amount_paid, total_amount), COALESCE(remaining_amount, 0),
        currency, payment_method, payment_status, notes, created_by, created_at, updated_at
      FROM orders_backup
    `);
    console.log('✅ Restored data from backup');
    
    // Drop the backup table
    await database.run('DROP TABLE orders_backup');
    console.log('✅ Dropped backup table');
    
    // Commit transaction
    await database.run('COMMIT');
    console.log('🎉 Orders table structure fixed successfully!');
    
  } catch (error) {
    // Rollback on error
    await database.run('ROLLBACK');
    console.error('❌ Error fixing orders table:', error);
    throw error;
  }
}

// Run the fix
fixOrdersTable()
  .then(() => {
    console.log('✅ Table fix completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Table fix failed:', error);
    process.exit(1);
  });
