const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, '..', '..', 'data', 'urutirose.db');

console.log('🔄 Updating orders table status default to "completed"...');

const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('❌ Database error:', err.message);
    process.exit(1);
  }
  console.log('✅ Connected to database');
});

db.serialize(() => {
  // Create new table with updated schema
  db.run(`
    CREATE TABLE orders_new (
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
      currency TEXT DEFAULT 'USD',
      payment_method TEXT,
      payment_status TEXT DEFAULT 'pending',
      notes TEXT,
      created_by TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `, (err) => {
    if (err) {
      console.error('❌ Error creating new table:', err.message);
      return;
    }
    
    console.log('✅ New table created');
    
    // Copy data with status defaulting to 'completed'
    db.run(`
      INSERT INTO orders_new 
      SELECT 
        id, customer_id, shop_id, order_number, order_type, 
        COALESCE(status, 'completed') as status, 
        subtotal, tax_amount, discount_amount, loyalty_discount, 
        total_amount, currency, payment_method, payment_status, 
        notes, created_by, created_at, updated_at
      FROM orders
    `, (err) => {
      if (err) {
        console.error('❌ Error copying data:', err.message);
        return;
      }
      
      console.log('✅ Data copied');
      
      // Drop old table and rename new one
      db.run('DROP TABLE orders', (err) => {
        if (err) {
          console.error('❌ Error dropping old table:', err.message);
          return;
        }
        
        db.run('ALTER TABLE orders_new RENAME TO orders', (err) => {
          if (err) {
            console.error('❌ Error renaming table:', err.message);
            return;
          }
          
          console.log('🎉 SUCCESS: Orders table updated with status DEFAULT "completed"');
          
          db.close((err) => {
            if (err) console.error('❌ Error closing database:', err.message);
            console.log('✅ Migration completed');
          });
        });
      });
    });
  });
});
