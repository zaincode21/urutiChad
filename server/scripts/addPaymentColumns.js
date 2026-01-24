const database = require('../database/database');

async function addPaymentColumns() {
  try {
    console.log('🔄 Adding payment columns to orders table...');
    
    // Add amount_paid column
    await database.run(`
      ALTER TABLE orders 
      ADD COLUMN amount_paid DECIMAL(10,2) DEFAULT 0
    `);
    console.log('✅ Added amount_paid column');
    
    // Add remaining_amount column
    await database.run(`
      ALTER TABLE orders 
      ADD COLUMN remaining_amount DECIMAL(10,2) DEFAULT 0
    `);
    console.log('✅ Added remaining_amount column');
    
    // Update existing orders to have default values
    await database.run(`
      UPDATE orders 
      SET amount_paid = total_amount, 
          remaining_amount = 0 
      WHERE amount_paid IS NULL OR remaining_amount IS NULL
    `);
    console.log('✅ Updated existing orders with default values');
    
    console.log('🎉 Payment columns migration completed successfully!');
    
  } catch (error) {
    console.error('❌ Error adding payment columns:', error);
    
    // Check if columns already exist
    if (error.message.includes('duplicate column name')) {
      console.log('ℹ️ Columns already exist, skipping...');
    } else {
      throw error;
    }
  }
}

// Run the migration
addPaymentColumns()
  .then(() => {
    console.log('✅ Migration completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Migration failed:', error);
    console.error('Error details:', error.message);
    process.exit(1);
  });
