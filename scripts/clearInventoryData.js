const database = require('../server/database/database');

async function clearInventoryData() {
  console.log('🧹 Clearing Inventory Management System data...');

  try {
    // Clear all inventory-related tables
    await database.run('DELETE FROM inventory_count_items');
    await database.run('DELETE FROM inventory_counts');
    await database.run('DELETE FROM low_stock_alerts');
    await database.run('DELETE FROM product_batches');
    await database.run('DELETE FROM stock_transfer_items');
    await database.run('DELETE FROM stock_transfers');
    await database.run('DELETE FROM inventory_transactions');
    await database.run('DELETE FROM warehouse_inventory');
    await database.run('DELETE FROM shop_inventory');
    await database.run('DELETE FROM warehouses');

    console.log('✅ All inventory data cleared successfully!');
  } catch (error) {
    console.error('❌ Error clearing inventory data:', error);
    throw error;
  }
}

// Run the clear function
if (require.main === module) {
  clearInventoryData()
    .then(() => {
      console.log('✅ Inventory data clearing completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Inventory data clearing failed:', error);
      process.exit(1);
    });
}

module.exports = { clearInventoryData }; 