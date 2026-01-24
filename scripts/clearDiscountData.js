const database = require('../server/database/database');

async function clearDiscountData() {
  console.log('🧹 Clearing Discount Management System data...');

  try {
    // Clear all discount-related tables in the correct order (respecting foreign keys)
    await database.run('DELETE FROM discount_applications');
    await database.run('DELETE FROM customer_discount_usage');
    await database.run('DELETE FROM discount_campaigns');
    await database.run('DELETE FROM discount_business_rules');
    await database.run('DELETE FROM discounts');

    console.log('✅ All discount data cleared successfully!');
  } catch (error) {
    console.error('❌ Error clearing discount data:', error);
    throw error;
  }
}

// Run the clear function
if (require.main === module) {
  clearDiscountData()
    .then(() => {
      console.log('✅ Discount data clearing completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Discount data clearing failed:', error);
      process.exit(1);
    });
}

module.exports = { clearDiscountData }; 