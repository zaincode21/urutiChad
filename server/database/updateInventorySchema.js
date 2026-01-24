const database = require('./database');

async function updateInventorySchema() {
  try {
    console.log('Starting inventory schema updates...');

    // 1. Update products table to add inventory management fields
    console.log('Updating products table...');
    
    // First, rename stock_quantity to current_stock if it exists
    try {
      await database.run(`
        ALTER TABLE products ADD COLUMN current_stock INTEGER DEFAULT 0
      `);
      console.log('  - Added current_stock column');
      
      // Copy data from stock_quantity to current_stock
      await database.run(`
        UPDATE products 
        SET current_stock = stock_quantity 
        WHERE current_stock = 0 AND stock_quantity IS NOT NULL
      `);
      console.log('  - Migrated stock data from stock_quantity to current_stock');
    } catch (error) {
      console.log('  - current_stock column already exists or migration completed');
    }

    await database.run(`
      ALTER TABLE products ADD COLUMN reserved_stock INTEGER DEFAULT 0
    `).catch(() => console.log('  - reserved_stock column already exists'));

    await database.run(`
      ALTER TABLE products ADD COLUMN available_stock INTEGER DEFAULT 0
    `).catch(() => console.log('  - available_stock column already exists'));

    await database.run(`
      ALTER TABLE products ADD COLUMN min_stock_level INTEGER DEFAULT 10
    `).catch(() => console.log('  - min_stock_level column already exists'));

    await database.run(`
      ALTER TABLE products ADD COLUMN reorder_point INTEGER DEFAULT 20
    `).catch(() => console.log('  - reorder_point column already exists'));

    await database.run(`
      ALTER TABLE products ADD COLUMN cost_price DECIMAL(10,2) DEFAULT 0.00
    `).catch(() => console.log('  - cost_price column already exists'));

    // 2. Create stock_reservations table
    console.log('Creating stock_reservations table...');
    await database.run(`
      CREATE TABLE IF NOT EXISTS stock_reservations (
        id TEXT PRIMARY KEY,
        order_id TEXT NOT NULL,
        product_id TEXT NOT NULL,
        quantity_reserved INTEGER NOT NULL,
        reservation_date DATETIME DEFAULT CURRENT_TIMESTAMP,
        expiry_date DATETIME NOT NULL,
        status TEXT DEFAULT 'active' CHECK (status IN ('active', 'fulfilled', 'released', 'expired')),
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (order_id) REFERENCES orders (id) ON DELETE CASCADE,
        FOREIGN KEY (product_id) REFERENCES products (id) ON DELETE CASCADE
      )
    `);

    // 3. Create inventory_transactions table
    console.log('Creating inventory_transactions table...');
    await database.run(`
      CREATE TABLE IF NOT EXISTS inventory_transactions (
        id TEXT PRIMARY KEY,
        product_id TEXT NOT NULL,
        transaction_type TEXT NOT NULL CHECK (transaction_type IN (
          'receiving', 'sale', 'adjustment', 'reservation', 'release', 'expiry', 
          'bottling_consumption', 'bottling_production', 'transfer_in', 'transfer_out'
        )),
        quantity INTEGER NOT NULL,
        previous_stock INTEGER,
        new_stock INTEGER,
        unit_cost DECIMAL(10,2),
        total_value DECIMAL(10,2),
        reference_id TEXT,
        reference_type TEXT,
        notes TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (product_id) REFERENCES products (id) ON DELETE CASCADE
      )
    `);

    // Check if columns exist, if not add them
    try {
      await database.run(`
        ALTER TABLE inventory_transactions ADD COLUMN unit_cost DECIMAL(10,2)
      `);
      console.log('  - Added unit_cost column to inventory_transactions');
    } catch (error) {
      console.log('  - unit_cost column already exists in inventory_transactions');
    }

    try {
      await database.run(`
        ALTER TABLE inventory_transactions ADD COLUMN total_value DECIMAL(10,2)
      `);
      console.log('  - Added total_value column to inventory_transactions');
    } catch (error) {
      console.log('  - total_value column already exists in inventory_transactions');
    }

    // 4. Update orders table to add fulfillment fields
    console.log('Updating orders table...');
    
    // Add shipping and billing address columns
    await database.run(`
      ALTER TABLE orders ADD COLUMN shipping_address TEXT
    `).catch(() => console.log('  - shipping_address column already exists'));

    await database.run(`
      ALTER TABLE orders ADD COLUMN billing_address TEXT
    `).catch(() => console.log('  - billing_address column already exists'));

    await database.run(`
      ALTER TABLE orders ADD COLUMN confirmed_at DATETIME
    `).catch(() => console.log('  - confirmed_at column already exists'));

    await database.run(`
      ALTER TABLE orders ADD COLUMN confirmed_by TEXT
    `).catch(() => console.log('  - confirmed_by column already exists'));

    await database.run(`
      ALTER TABLE orders ADD COLUMN processing_at DATETIME
    `).catch(() => console.log('  - processing_at column already exists'));

    await database.run(`
      ALTER TABLE orders ADD COLUMN processed_by TEXT
    `).catch(() => console.log('  - processed_by column already exists'));

    await database.run(`
      ALTER TABLE orders ADD COLUMN fulfilled_at DATETIME
    `).catch(() => console.log('  - fulfilled_at column already exists'));

    await database.run(`
      ALTER TABLE orders ADD COLUMN fulfilled_by TEXT
    `).catch(() => console.log('  - fulfilled_by column already exists'));

    await database.run(`
      ALTER TABLE orders ADD COLUMN tracking_number TEXT
    `).catch(() => console.log('  - tracking_number column already exists'));

    await database.run(`
      ALTER TABLE orders ADD COLUMN cancelled_at DATETIME
    `).catch(() => console.log('  - cancelled_at column already exists'));

    await database.run(`
      ALTER TABLE orders ADD COLUMN cancelled_by TEXT
    `).catch(() => console.log('  - cancelled_by column already exists'));

    await database.run(`
      ALTER TABLE orders ADD COLUMN cancellation_reason TEXT
    `).catch(() => console.log('  - cancellation_reason column already exists'));

    await database.run(`
      ALTER TABLE orders ADD COLUMN updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    `).catch(() => console.log('  - updated_at column already exists'));

    // 5. Update order_items table to add cost tracking
    console.log('Updating order_items table...');
    await database.run(`
      ALTER TABLE order_items ADD COLUMN cost_price DECIMAL(10,2) DEFAULT 0.00
    `).catch(() => console.log('  - cost_price column already exists'));

    await database.run(`
      ALTER TABLE order_items ADD COLUMN created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    `).catch(() => console.log('  - created_at column already exists'));

    // 6. Create indexes for performance
    console.log('Creating indexes...');
    await database.run(`
      CREATE INDEX IF NOT EXISTS idx_stock_reservations_order_id ON stock_reservations (order_id)
    `);

    await database.run(`
      CREATE INDEX IF NOT EXISTS idx_stock_reservations_product_id ON stock_reservations (product_id)
    `);

    await database.run(`
      CREATE INDEX IF NOT EXISTS idx_stock_reservations_status ON stock_reservations (status)
    `);

    await database.run(`
      CREATE INDEX IF NOT EXISTS idx_stock_reservations_expiry ON stock_reservations (expiry_date)
    `);

    await database.run(`
      CREATE INDEX IF NOT EXISTS idx_inventory_transactions_product_id ON inventory_transactions (product_id)
    `);

    await database.run(`
      CREATE INDEX IF NOT EXISTS idx_inventory_transactions_type ON inventory_transactions (transaction_type)
    `);

    await database.run(`
      CREATE INDEX IF NOT EXISTS idx_inventory_transactions_reference ON inventory_transactions (reference_id, reference_type)
    `);

    await database.run(`
      CREATE INDEX IF NOT EXISTS idx_inventory_transactions_created ON inventory_transactions (created_at)
    `);

    await database.run(`
      CREATE INDEX IF NOT EXISTS idx_orders_status ON orders (status)
    `);

    await database.run(`
      CREATE INDEX IF NOT EXISTS idx_orders_customer_id ON orders (customer_id)
    `);

    await database.run(`
      CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders (created_at)
    `);

    // Only create this index after we're sure the columns exist
    try {
      await database.run(`
        CREATE INDEX IF NOT EXISTS idx_products_stock ON products (current_stock, reserved_stock, available_stock)
      `);
      console.log('  - Created products stock index');
    } catch (error) {
      console.log('  - Products stock index creation skipped (columns may not exist yet)');
    }

    // 7. Update existing products to calculate available stock
    console.log('Updating existing product stock calculations...');
    try {
      await database.run(`
        UPDATE products 
        SET available_stock = COALESCE(current_stock, 0) - COALESCE(reserved_stock, 0)
        WHERE available_stock IS NULL OR available_stock = 0
      `);
      console.log('  - Updated available stock calculations');
    } catch (error) {
      console.log('  - Available stock calculation skipped (columns may not exist yet)');
    }

    // 8. Create triggers for automatic stock updates
    console.log('Creating triggers...');
    
    try {
      // Trigger to update available_stock when current_stock or reserved_stock changes
      await database.run(`
        CREATE TRIGGER IF NOT EXISTS update_available_stock
        AFTER UPDATE ON products
        FOR EACH ROW
        BEGIN
          UPDATE products 
          SET available_stock = NEW.current_stock - NEW.reserved_stock
          WHERE id = NEW.id;
        END
      `);
      console.log('  - Created update_available_stock trigger');
    } catch (error) {
      console.log('  - Trigger creation skipped (columns may not exist yet)');
    }

    try {
      // Trigger to update available_stock when inserting new products
      await database.run(`
        CREATE TRIGGER IF NOT EXISTS insert_available_stock
        AFTER INSERT ON products
        FOR EACH ROW
        BEGIN
          UPDATE products 
          SET available_stock = NEW.current_stock - NEW.reserved_stock
          WHERE id = NEW.id;
        END
      `);
      console.log('  - Created insert_available_stock trigger');
    } catch (error) {
      console.log('  - Trigger creation skipped (columns may not exist yet)');
    }

    console.log('Inventory schema updates completed successfully!');

    // 9. Display current schema status
    console.log('\nCurrent schema status:');
    
    try {
      const productsColumns = await database.all(`
        PRAGMA table_info(products)
      `);
      console.log('\nProducts table columns:');
      productsColumns.forEach(col => {
        console.log(`  - ${col.name} (${col.type})`);
      });
    } catch (error) {
      console.log('  - Could not retrieve products table info');
    }

    try {
      const ordersColumns = await database.all(`
        PRAGMA table_info(orders)
      `);
      console.log('\nOrders table columns:');
      ordersColumns.forEach(col => {
        console.log(`  - ${col.name} (${col.type})`);
      });
    } catch (error) {
      console.log('  - Could not retrieve orders table info');
    }

    try {
      const tables = await database.all(`
        SELECT name FROM sqlite_master WHERE type='table'
      `);
      console.log('\nAvailable tables:');
      tables.forEach(table => {
        console.log(`  - ${table.name}`);
      });
    } catch (error) {
      console.log('  - Could not retrieve table list');
    }

  } catch (error) {
    console.error('Error updating inventory schema:', error);
    throw error;
  }
}

// Run the schema update if this file is executed directly
if (require.main === module) {
  updateInventorySchema()
    .then(() => {
      console.log('Schema update completed successfully!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Schema update failed:', error);
      process.exit(1);
    });
}

module.exports = { updateInventorySchema };
