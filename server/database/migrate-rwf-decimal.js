require('dotenv').config({ path: '../../.env' });
const database = require('./database');

async function migrateRWFDecimal() {
  try {
    console.log('🔄 Updating decimal fields to support RWF currency...');

    // Update bottling_batches table
    await database.query(`ALTER TABLE bottling_batches ALTER COLUMN unit_cost TYPE DECIMAL(15,2)`);
    console.log('✅ Updated bottling_batches.unit_cost to DECIMAL(15,2)');

    await database.query(`ALTER TABLE bottling_batches ALTER COLUMN total_cost TYPE DECIMAL(15,2)`);
    console.log('✅ Updated bottling_batches.total_cost to DECIMAL(15,2)');

    await database.query(`ALTER TABLE bottling_batches ALTER COLUMN selling_price TYPE DECIMAL(15,2)`);
    console.log('✅ Updated bottling_batches.selling_price to DECIMAL(15,2)');

    // Update products table
    await database.query(`ALTER TABLE products ALTER COLUMN price TYPE DECIMAL(15,2)`);
    console.log('✅ Updated products.price to DECIMAL(15,2)');

    await database.query(`ALTER TABLE products ALTER COLUMN cost_price TYPE DECIMAL(15,2)`);
    console.log('✅ Updated products.cost_price to DECIMAL(15,2)');

    // Update order_items table
    await database.query(`ALTER TABLE order_items ALTER COLUMN unit_price TYPE DECIMAL(15,2)`);
    console.log('✅ Updated order_items.unit_price to DECIMAL(15,2)');

    await database.query(`ALTER TABLE order_items ALTER COLUMN total_price TYPE DECIMAL(15,2)`);
    console.log('✅ Updated order_items.total_price to DECIMAL(15,2)');

    // Update orders table
    await database.query(`ALTER TABLE orders ALTER COLUMN total_amount TYPE DECIMAL(15,2)`);
    console.log('✅ Updated orders.total_amount to DECIMAL(15,2)');

    await database.query(`ALTER TABLE orders ALTER COLUMN tax_amount TYPE DECIMAL(15,2)`);
    console.log('✅ Updated orders.tax_amount to DECIMAL(15,2)');

    await database.query(`ALTER TABLE orders ALTER COLUMN discount_amount TYPE DECIMAL(15,2)`);
    console.log('✅ Updated orders.discount_amount to DECIMAL(15,2)');

    console.log('🎉 RWF decimal migration completed successfully!');
  } catch (error) {
    console.error('❌ Error migrating RWF decimal fields:', error);
  }
}

migrateRWFDecimal();
