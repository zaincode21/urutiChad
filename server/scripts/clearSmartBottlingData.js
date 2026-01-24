const database = require('../database/database');

async function clearSmartBottlingData() {
  try {
    console.log('🧹 Clearing existing Smart Bottling data...');

    // Clear data in reverse order of dependencies
    await database.run('DELETE FROM cost_components');
    console.log('✅ Cost components cleared');

    await database.run('DELETE FROM stock_ledger');
    console.log('✅ Stock ledger cleared');

    await database.run('DELETE FROM bottling_batches');
    console.log('✅ Bottling batches cleared');

    await database.run('DELETE FROM recipe_materials');
    console.log('✅ Recipe materials cleared');

    await database.run('DELETE FROM bottling_recipes');
    console.log('✅ Bottling recipes cleared');

    await database.run('DELETE FROM raw_materials');
    console.log('✅ Raw materials cleared');

    await database.run('DELETE FROM bottle_sizes');
    console.log('✅ Bottle sizes cleared');

    await database.run('DELETE FROM perfume_bulk');
    console.log('✅ Bulk perfumes cleared');

    console.log('🎉 Smart Bottling data cleared successfully!');

  } catch (error) {
    console.error('❌ Error clearing Smart Bottling data:', error);
    throw error;
  }
}

// Run the clearing function
if (require.main === module) {
  clearSmartBottlingData()
    .then(() => {
      console.log('✅ Clearing completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Clearing failed:', error);
      process.exit(1);
    });
}

module.exports = { clearSmartBottlingData }; 