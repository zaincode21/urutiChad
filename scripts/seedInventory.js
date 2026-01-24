const { v4: uuidv4 } = require('uuid');
const database = require('../server/database/database');

async function seedInventory() {
  console.log('🌱 Seeding Inventory Management System...');

  try {
    // Create warehouses
    const warehouses = [
      {
        id: uuidv4(),
        name: 'Main Distribution Center',
        code: 'MDC-001',
        address: '123 Industrial Blvd',
        city: 'Houston',
        state: 'TX',
        country: 'USA',
        postal_code: '77001',
        contact_person: 'John Smith',
        phone: '+1-555-0123',
        email: 'john.smith@company.com',
        capacity_sqm: 5000.00
      },
      {
        id: uuidv4(),
        name: 'North Regional Warehouse',
        code: 'NRW-001',
        address: '456 Commerce St',
        city: 'Dallas',
        state: 'TX',
        country: 'USA',
        postal_code: '75201',
        contact_person: 'Sarah Johnson',
        phone: '+1-555-0456',
        email: 'sarah.johnson@company.com',
        capacity_sqm: 3000.00
      },
      {
        id: uuidv4(),
        name: 'East Coast Facility',
        code: 'ECF-001',
        address: '789 Logistics Ave',
        city: 'Atlanta',
        state: 'GA',
        country: 'USA',
        postal_code: '30301',
        contact_person: 'Mike Davis',
        phone: '+1-555-0789',
        email: 'mike.davis@company.com',
        capacity_sqm: 4000.00
      }
    ];

    for (const warehouse of warehouses) {
      await database.run(`
        INSERT INTO warehouses (
          id, name, code, address, city, state, country, postal_code,
          contact_person, phone, email, capacity_sqm
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        warehouse.id, warehouse.name, warehouse.code, warehouse.address,
        warehouse.city, warehouse.state, warehouse.country, warehouse.postal_code,
        warehouse.contact_person, warehouse.phone, warehouse.email, warehouse.capacity_sqm
      ]);
    }

    console.log('✅ Warehouses created');

    // Get existing products and shops
    const products = await database.all('SELECT id FROM products WHERE is_active = 1 LIMIT 20');
    const shops = await database.all('SELECT id FROM shops WHERE is_active = 1 LIMIT 5');

    if (products.length === 0) {
      console.log('⚠️ No products found. Please seed products first.');
      return;
    }

    if (shops.length === 0) {
      console.log('⚠️ No shops found. Please seed shops first.');
      return;
    }

    // Create shop inventory levels
    for (const shop of shops) {
      for (const product of products.slice(0, 10)) {
        const quantity = Math.floor(Math.random() * 100) + 10;
        const minStock = Math.floor(quantity * 0.2);
        const maxStock = Math.floor(quantity * 1.5);

        await database.run(`
          INSERT OR REPLACE INTO shop_inventory (
            shop_id, product_id, quantity, min_stock_level, max_stock_level, last_updated
          ) VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
        `, [
          shop.id, product.id, quantity, minStock, maxStock
        ]);
      }
    }

    console.log('✅ Shop inventory levels created');

    // Create warehouse inventory levels
    for (const warehouse of warehouses) {
      for (const product of products.slice(0, 15)) {
        const quantity = Math.floor(Math.random() * 500) + 50;
        const minStock = Math.floor(quantity * 0.15);
        const maxStock = Math.floor(quantity * 2);

        await database.run(`
          INSERT OR REPLACE INTO warehouse_inventory (
            warehouse_id, product_id, quantity, min_stock_level, max_stock_level, last_updated
          ) VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
        `, [
          warehouse.id, product.id, quantity, minStock, maxStock
        ]);
      }
    }

    console.log('✅ Warehouse inventory levels created');

    // Create sample inventory transactions
    const transactionTypes = ['receiving', 'sale', 'adjustment_in', 'adjustment_out', 'transfer_in', 'transfer_out'];
    const users = await database.all('SELECT id FROM users LIMIT 3');

    for (let i = 0; i < 50; i++) {
      const product = products[Math.floor(Math.random() * products.length)];
      const shop = shops[Math.floor(Math.random() * shops.length)];
      const warehouse = warehouses[Math.floor(Math.random() * warehouses.length)];
      const user = users[Math.floor(Math.random() * users.length)];
      const transactionType = transactionTypes[Math.floor(Math.random() * transactionTypes.length)];
      const quantity = Math.floor(Math.random() * 50) + 1;
      const unitCost = Math.random() * 100 + 10;

      let shopId = null;
      let warehouseId = null;

      if (Math.random() > 0.5) {
        shopId = shop.id;
      } else {
        warehouseId = warehouse.id;
      }

      await database.run(`
        INSERT INTO inventory_transactions (
          id, product_id, shop_id, transaction_type, quantity,
          previous_stock, new_stock, reference_type,
          notes, created_by, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now', '-' || ? || ' days'))
      `, [
        uuidv4(), product.id, shopId, transactionType, quantity,
        Math.floor(Math.random() * 100), Math.floor(Math.random() * 100),
        'manual',
        `Sample ${transactionType} transaction`, user.id, Math.floor(Math.random() * 30)
      ]);
    }

    console.log('✅ Sample inventory transactions created');

    // Create stock transfers
    for (let i = 0; i < 10; i++) {
      const transferId = uuidv4();
      const transferNumber = `TRF-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;
      const fromWarehouse = warehouses[Math.floor(Math.random() * warehouses.length)];
      const toShop = shops[Math.floor(Math.random() * shops.length)];
      const user = users[Math.floor(Math.random() * users.length)];

      await database.run(`
        INSERT INTO stock_transfers (
          id, transfer_number, from_location_type, from_location_id,
          to_location_type, to_location_id, status, transfer_date,
          expected_delivery_date, notes, created_by
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        transferId, transferNumber, 'warehouse', fromWarehouse.id,
        'shop', toShop.id, 'completed', new Date().toISOString().split('T')[0],
        new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        'Sample transfer from warehouse to shop', user.id
      ]);

      // Add transfer items
      const transferProducts = products.slice(0, 3);
      for (const product of transferProducts) {
        const quantity = Math.floor(Math.random() * 20) + 5;
        await database.run(`
          INSERT INTO stock_transfer_items (
            id, transfer_id, product_id, quantity, notes
          ) VALUES (?, ?, ?, ?, ?)
        `, [uuidv4(), transferId, product.id, quantity, 'Sample transfer item']);
      }
    }

    console.log('✅ Sample stock transfers created');

    // Create low stock alerts
    for (let i = 0; i < 8; i++) {
      const product = products[Math.floor(Math.random() * products.length)];
      const shop = shops[Math.floor(Math.random() * shops.length)];
      const currentStock = Math.floor(Math.random() * 5);
      const minStock = Math.floor(Math.random() * 10) + 5;
      const alertType = currentStock === 0 ? 'out_of_stock' : 'low_stock';
      const message = currentStock === 0 
        ? 'Product is out of stock'
        : `Product stock is below minimum level (${currentStock}/${minStock})`;

      await database.run(`
        INSERT INTO low_stock_alerts (
          id, product_id, location_type, location_id, current_stock,
          min_stock_level, alert_type, message
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        uuidv4(), product.id, 'shop', shop.id, currentStock,
        minStock, alertType, message
      ]);
    }

    console.log('✅ Sample low stock alerts created');

    // Create product batches for expiry tracking
    for (const product of products.slice(0, 10)) {
      const warehouse = warehouses[Math.floor(Math.random() * warehouses.length)];
      const quantity = Math.floor(Math.random() * 200) + 50;
      const batchNumber = `BATCH-${Date.now()}-${Math.random().toString(36).substr(2, 6).toUpperCase()}`;
      const expiryDate = new Date(Date.now() + (Math.floor(Math.random() * 365) + 30) * 24 * 60 * 60 * 1000);
      const manufacturingDate = new Date(Date.now() - Math.floor(Math.random() * 90) * 24 * 60 * 60 * 1000);

      await database.run(`
        INSERT INTO product_batches (
          id, product_id, batch_number, quantity, expiry_date,
          manufacturing_date, cost_price, location_type, location_id
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        uuidv4(), product.id, batchNumber, quantity, expiryDate.toISOString().split('T')[0],
        manufacturingDate.toISOString().split('T')[0], Math.random() * 50 + 10,
        'warehouse', warehouse.id
      ]);
    }

    console.log('✅ Sample product batches created');

    // Create inventory counts
    for (let i = 0; i < 3; i++) {
      const countId = uuidv4();
      const countNumber = `CNT-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;
      const shop = shops[Math.floor(Math.random() * shops.length)];
      const user = users[Math.floor(Math.random() * users.length)];

      await database.run(`
        INSERT INTO inventory_counts (
          id, count_number, location_type, location_id, count_date,
          status, notes, created_by
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        countId, countNumber, 'shop', shop.id, new Date().toISOString().split('T')[0],
        'completed', 'Monthly inventory count', user.id
      ]);

      // Add count items
      const countProducts = products.slice(0, 5);
      for (const product of countProducts) {
        const expectedQuantity = Math.floor(Math.random() * 50) + 10;
        const actualQuantity = expectedQuantity + Math.floor(Math.random() * 10) - 5;
        const variance = actualQuantity - expectedQuantity;

        await database.run(`
          INSERT INTO inventory_count_items (
            id, count_id, product_id, expected_quantity, actual_quantity, variance, notes
          ) VALUES (?, ?, ?, ?, ?, ?, ?)
        `, [
          uuidv4(), countId, product.id, expectedQuantity, actualQuantity, variance,
          variance !== 0 ? 'Variance found during count' : 'Count matches expected'
        ]);
      }
    }

    console.log('✅ Sample inventory counts created');

    console.log('🎉 Inventory Management System seeded successfully!');
    console.log(`📊 Created:`);
    console.log(`   - ${warehouses.length} warehouses`);
    console.log(`   - Shop inventory for ${shops.length} shops`);
    console.log(`   - Warehouse inventory for ${warehouses.length} warehouses`);
    console.log(`   - 50 sample inventory transactions`);
    console.log(`   - 10 sample stock transfers`);
    console.log(`   - 8 sample low stock alerts`);
    console.log(`   - 10 sample product batches`);
    console.log(`   - 3 sample inventory counts`);

  } catch (error) {
    console.error('❌ Error seeding inventory:', error);
    throw error;
  }
}

// Run the seed function
if (require.main === module) {
  seedInventory()
    .then(() => {
      console.log('✅ Inventory seeding completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Inventory seeding failed:', error);
      process.exit(1);
    });
}

module.exports = { seedInventory }; 