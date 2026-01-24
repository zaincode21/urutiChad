const database = require('../database/database');

async function addPartialPaymentDiscountField() {
  try {
    console.log('🔄 Adding allow_partial_payment field to discounts table...');
    
    // Check if the field already exists
    const tableInfo = await database.all("PRAGMA table_info(discounts)");
    const fieldExists = tableInfo.some(col => col.name === 'allow_partial_payment');
    
    if (fieldExists) {
      console.log('✅ Field allow_partial_payment already exists in discounts table');
      return;
    }
    
    // Add the new field
    await database.run(`
      ALTER TABLE discounts 
      ADD COLUMN allow_partial_payment BOOLEAN DEFAULT 0
    `);
    
    console.log('✅ Successfully added allow_partial_payment field to discounts table');
    
    // Update existing discounts to not allow partial payments by default
    await database.run(`
      UPDATE discounts 
      SET allow_partial_payment = 0 
      WHERE allow_partial_payment IS NULL
    `);
    
    console.log('✅ Updated existing discounts to not allow partial payments by default');
    
  } catch (error) {
    console.error('❌ Error adding allow_partial_payment field:', error);
    throw error;
  }
}

// Run the migration if this file is executed directly
if (require.main === module) {
  addPartialPaymentDiscountField()
    .then(() => {
      console.log('🎉 Migration completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Migration failed:', error);
      process.exit(1);
    });
}

module.exports = addPartialPaymentDiscountField;
