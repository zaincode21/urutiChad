const database = require('./database');
const { v4: uuidv4 } = require('uuid');
const bcrypt = require('bcryptjs');

async function migrate() {
  try {
    console.log('🔄 Starting database migration...');

    // Wait for database to be ready
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Create admin user
    const adminId = uuidv4();
    const hashedPassword = await bcrypt.hash('admin123', 12);
    
    await database.run(`
      INSERT OR IGNORE INTO users (id, username, email, password, role, first_name, last_name)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `, [adminId, 'admin', 'admin@retail.com', hashedPassword, 'admin', 'Admin', 'User']);

    // Create sample shops
    const shops = [
      {
        id: uuidv4(),
        name: 'Main Street Store',
        address: '123 Main Street',
        city: 'New York',
        state: 'NY',
        country: 'USA',
        postal_code: '10001',
        phone: '+1-555-0101',
        email: 'main@retail.com'
      },
      {
        id: uuidv4(),
        name: 'Downtown Branch',
        address: '456 Downtown Ave',
        city: 'Los Angeles',
        state: 'CA',
        country: 'USA',
        postal_code: '90210',
        phone: '+1-555-0202',
        email: 'downtown@retail.com'
      },
      {
        id: uuidv4(),
        name: 'Mall Location',
        address: '789 Shopping Mall',
        city: 'Chicago',
        state: 'IL',
        country: 'USA',
        postal_code: '60601',
        phone: '+1-555-0303',
        email: 'mall@retail.com'
      }
    ];

    for (const shop of shops) {
      await database.run(`
        INSERT OR IGNORE INTO shops (id, name, address, city, state, country, postal_code, phone, email)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [shop.id, shop.name, shop.address, shop.city, shop.state, shop.country, shop.postal_code, shop.phone, shop.email]);
    }

    // Create sample staff users
    const staffUsers = [
      {
        id: uuidv4(),
        username: 'manager1',
        email: 'manager1@retail.com',
        password: await bcrypt.hash('manager123', 12),
        role: 'manager',
        first_name: 'John',
        last_name: 'Manager',
        phone: '+1-555-0404',
        shop_id: shops[0].id
      },
      {
        id: uuidv4(),
        username: 'cashier1',
        email: 'cashier1@retail.com',
        password: await bcrypt.hash('cashier123', 12),
        role: 'cashier',
        first_name: 'Sarah',
        last_name: 'Cashier',
        phone: '+1-555-0505',
        shop_id: shops[0].id
      },
      {
        id: uuidv4(),
        username: 'cashier2',
        email: 'cashier2@retail.com',
        password: await bcrypt.hash('cashier123', 12),
        role: 'cashier',
        first_name: 'Mike',
        last_name: 'Sales',
        phone: '+1-555-0606',
        shop_id: shops[1].id
      }
    ];

    for (const user of staffUsers) {
      await database.run(`
        INSERT OR IGNORE INTO users (id, username, email, password, role, first_name, last_name, phone, shop_id)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [user.id, user.username, user.email, user.password, user.role, user.first_name, user.last_name, user.phone, user.shop_id]);
    }

    // Update shop managers
    await database.run(`UPDATE shops SET manager_id = ? WHERE id = ?`, [staffUsers[0].id, shops[0].id]);

    // Create sample hierarchical categories
    const categories = [
      // Level 0 - Root categories
      { id: uuidv4(), name: 'Perfumes & Fragrances', description: 'All fragrances and perfumes', type: 'perfume', parent_id: null, path: '', level: 0 },
      { id: uuidv4(), name: 'Fashion & Apparel', description: 'Clothing and fashion items', type: 'clothing', parent_id: null, path: '', level: 0 },
      { id: uuidv4(), name: 'Accessories', description: 'Fashion accessories and jewelry', type: 'accessories', parent_id: null, path: '', level: 0 },
      { id: uuidv4(), name: 'Bulk Inventory', description: 'Bulk perfume inventory', type: 'bulk_perfume', parent_id: null, path: '', level: 0 }
    ];

    // Insert root categories
    for (const category of categories) {
      await database.run(`
        INSERT OR IGNORE INTO categories (id, name, description, type, parent_id, path, level)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `, [category.id, category.name, category.description, category.type, category.parent_id, category.path, category.level]);
    }

    // Create subcategories (Level 1)
    const subcategories = [
      // Perfumes subcategories
      { id: uuidv4(), name: 'Women\'s Perfumes', description: 'Perfumes for women', type: 'perfume', parent_id: categories[0].id, level: 1 },
      { id: uuidv4(), name: 'Men\'s Perfumes', description: 'Perfumes for men', type: 'perfume', parent_id: categories[0].id, level: 1 },
      { id: uuidv4(), name: 'Unisex Perfumes', description: 'Unisex fragrances', type: 'perfume', parent_id: categories[0].id, level: 1 },
      
      // Fashion subcategories
      { id: uuidv4(), name: 'Women\'s Clothing', description: 'Clothing for women', type: 'clothing', parent_id: categories[1].id, level: 1 },
      { id: uuidv4(), name: 'Men\'s Clothing', description: 'Clothing for men', type: 'clothing', parent_id: categories[1].id, level: 1 },
      { id: uuidv4(), name: 'Kids Clothing', description: 'Clothing for children', type: 'clothing', parent_id: categories[1].id, level: 1 },
      
      // Accessories subcategories
      { id: uuidv4(), name: 'Jewelry', description: 'Necklaces, rings, earrings', type: 'accessories', parent_id: categories[2].id, level: 1 },
      { id: uuidv4(), name: 'Bags & Purses', description: 'Handbags and purses', type: 'accessories', parent_id: categories[2].id, level: 1 },
      { id: uuidv4(), name: 'Scarves & Belts', description: 'Scarves and belts', type: 'accessories', parent_id: categories[2].id, level: 1 }
    ];

    // Insert subcategories and update their paths
    for (const subcategory of subcategories) {
      const parentCategory = categories.find(c => c.id === subcategory.parent_id);
      const path = parentCategory ? `${parentCategory.id}` : '';
      
      await database.run(`
        INSERT OR IGNORE INTO categories (id, name, description, type, parent_id, path, level)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `, [subcategory.id, subcategory.name, subcategory.description, subcategory.type, subcategory.parent_id, path, subcategory.level]);
    }

    // Create level 2 subcategories
    const level2Categories = [
      // Women's Perfumes subcategories
      { id: uuidv4(), name: 'Floral Perfumes', description: 'Floral fragrances for women', type: 'perfume', parent_id: subcategories[0].id, level: 2 },
      { id: uuidv4(), name: 'Oriental Perfumes', description: 'Oriental fragrances for women', type: 'perfume', parent_id: subcategories[0].id, level: 2 },
      
      // Men's Perfumes subcategories
      { id: uuidv4(), name: 'Fresh Perfumes', description: 'Fresh fragrances for men', type: 'perfume', parent_id: subcategories[1].id, level: 2 },
      { id: uuidv4(), name: 'Woody Perfumes', description: 'Woody fragrances for men', type: 'perfume', parent_id: subcategories[1].id, level: 2 },
      
      // Women's Clothing subcategories
      { id: uuidv4(), name: 'Dresses', description: 'Women\'s dresses', type: 'clothing', parent_id: subcategories[3].id, level: 2 },
      { id: uuidv4(), name: 'Tops', description: 'Women\'s tops and blouses', type: 'clothing', parent_id: subcategories[3].id, level: 2 },
      { id: uuidv4(), name: 'Bottoms', description: 'Women\'s pants and skirts', type: 'clothing', parent_id: subcategories[3].id, level: 2 }
    ];

    // Insert level 2 categories and update their paths
    for (const category of level2Categories) {
      const parentCategory = subcategories.find(c => c.id === category.parent_id);
      const grandParentCategory = categories.find(c => c.id === parentCategory.parent_id);
      const path = grandParentCategory ? `${grandParentCategory.id}/${parentCategory.id}` : `${parentCategory.id}`;
      
      await database.run(`
        INSERT OR IGNORE INTO categories (id, name, description, type, parent_id, path, level)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `, [category.id, category.name, category.description, category.type, category.parent_id, path, category.level]);
    }

    // Combine all categories for reference
    const allCategories = [...categories, ...subcategories, ...level2Categories];

    // Create sample brands
    const brands = [
      { id: uuidv4(), name: 'Luxury Scents', description: 'Premium fragrance brand' },
      { id: uuidv4(), name: 'Fashion Forward', description: 'Trendy clothing brand' },
      { id: uuidv4(), name: 'Comfort Shoes', description: 'Comfortable footwear brand' },
      { id: uuidv4(), name: 'Accessory Plus', description: 'Quality accessories brand' }
    ];

    for (const brand of brands) {
      await database.run(`
        INSERT OR IGNORE INTO brands (id, name, description)
        VALUES (?, ?, ?)
      `, [brand.id, brand.name, brand.description]);
    }

    // Create sample bulk perfumes
    const bulkPerfumes = [
      {
        id: uuidv4(),
        name: 'Rose Garden',
        scent_description: 'Fresh rose petals with hints of vanilla',
        bulk_quantity_liters: 50.0,
        cost_per_liter: 25.00,
        supplier: 'Fragrance Supply Co',
        batch_number: 'RG-2024-001',
        expiry_date: '2026-12-31'
      },
      {
        id: uuidv4(),
        name: 'Ocean Breeze',
        scent_description: 'Clean ocean scent with citrus notes',
        bulk_quantity_liters: 75.0,
        cost_per_liter: 30.00,
        supplier: 'Fragrance Supply Co',
        batch_number: 'OB-2024-002',
        expiry_date: '2026-12-31'
      },
      {
        id: uuidv4(),
        name: 'Mystic Woods',
        scent_description: 'Deep woody scent with sandalwood',
        bulk_quantity_liters: 40.0,
        cost_per_liter: 35.00,
        supplier: 'Fragrance Supply Co',
        batch_number: 'MW-2024-003',
        expiry_date: '2026-12-31'
      }
    ];

    for (const perfume of bulkPerfumes) {
      await database.run(`
        INSERT OR IGNORE INTO perfume_bulk (
          id, name, scent_description, bulk_quantity_liters, cost_per_liter,
          supplier, batch_number, expiry_date
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `, [perfume.id, perfume.name, perfume.scent_description, perfume.bulk_quantity_liters,
          perfume.cost_per_liter, perfume.supplier, perfume.batch_number, perfume.expiry_date]);
    }

    // Create bottle sizes
    const bottleSizes = [
      { id: uuidv4(), size_ml: 30, bottle_cost: 2.50, label_cost: 0.75, packaging_cost: 1.00, labor_cost: 1.50 },
      { id: uuidv4(), size_ml: 50, bottle_cost: 3.00, label_cost: 0.75, packaging_cost: 1.25, labor_cost: 1.75 },
      { id: uuidv4(), size_ml: 100, bottle_cost: 4.50, label_cost: 1.00, packaging_cost: 1.50, labor_cost: 2.00 }
    ];

    for (const size of bottleSizes) {
      await database.run(`
        INSERT OR IGNORE INTO bottle_sizes (id, size_ml, bottle_cost, label_cost, packaging_cost, labor_cost)
        VALUES (?, ?, ?, ?, ?, ?)
      `, [size.id, size.size_ml, size.bottle_cost, size.label_cost, size.packaging_cost, size.labor_cost]);
    }

    // Create sample products (enhanced with multiple categories)
    const products = [
      {
        id: uuidv4(),
        name: 'Rose Garden Perfume 50ml',
        description: 'Elegant rose fragrance in 50ml bottle',
        sku: 'PERF-RG-50ML',
        brand_id: brands[0].id,
        product_type: 'perfume',
        size: '50ml',
        price: 45.99,
        cost_price: 28.50,
        stock_quantity: 25,
        min_stock_level: 5,
        categories: [allCategories[0].id, allCategories[4].id, allCategories[8].id] // Perfumes & Fragrances, Women's Perfumes, Floral Perfumes
      },
      {
        id: uuidv4(),
        name: 'Ocean Breeze Perfume 100ml',
        description: 'Fresh ocean scent in 100ml bottle',
        sku: 'PERF-OB-100ML',
        brand_id: brands[0].id,
        product_type: 'perfume',
        size: '100ml',
        price: 79.99,
        cost_price: 52.00,
        stock_quantity: 15,
        min_stock_level: 3,
        categories: [allCategories[0].id, allCategories[5].id, allCategories[10].id] // Perfumes & Fragrances, Men's Perfumes, Fresh Perfumes
      },
      {
        id: uuidv4(),
        name: 'Classic T-Shirt',
        description: 'Comfortable cotton t-shirt',
        sku: 'CLOTH-TS-001',
        brand_id: brands[1].id,
        product_type: 'clothing',
        size: 'M',
        color: 'White',
        price: 19.99,
        cost_price: 12.00,
        stock_quantity: 100,
        min_stock_level: 20,
        categories: [allCategories[1].id, allCategories[6].id, allCategories[13].id] // Fashion & Apparel, Women's Clothing, Tops
      },
      {
        id: uuidv4(),
        name: 'Comfort Sneakers',
        description: 'Comfortable walking sneakers',
        sku: 'SHOE-SN-001',
        brand_id: brands[2].id,
        product_type: 'shoes',
        size: '42',
        color: 'Black',
        price: 89.99,
        cost_price: 60.00,
        stock_quantity: 30,
        min_stock_level: 8,
        categories: [allCategories[1].id, allCategories[7].id] // Fashion & Apparel, Men's Clothing
      },
      {
        id: uuidv4(),
        name: 'Leather Wallet',
        description: 'Genuine leather wallet',
        sku: 'ACC-WL-001',
        brand_id: brands[3].id,
        product_type: 'accessory',
        price: 39.99,
        cost_price: 25.00,
        stock_quantity: 50,
        min_stock_level: 10,
        categories: [allCategories[2].id, allCategories[9].id] // Accessories, Bags & Purses
      }
    ];

    // Insert products
    for (const product of products) {
      const { categories, ...productData } = product;
      await database.run(`
        INSERT OR IGNORE INTO products (
          id, name, description, sku, brand_id, product_type, size, color,
          price, cost_price, stock_quantity, min_stock_level
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        productData.id, productData.name, productData.description, productData.sku,
        productData.brand_id, productData.product_type, productData.size, productData.color,
        productData.price, productData.cost_price, productData.stock_quantity, productData.min_stock_level
      ]);

      // Create product-category relationships
      for (let i = 0; i < categories.length; i++) {
        await database.run(`
          INSERT OR IGNORE INTO product_categories (id, product_id, category_id, is_primary)
          VALUES (?, ?, ?, ?)
        `, [uuidv4(), productData.id, categories[i], i === 0 ? 1 : 0]);
      }
    }

    // Create sample customers (enhanced with loyalty)
    const customers = [
      {
        id: uuidv4(),
        first_name: 'John',
        last_name: 'Doe',
        email: 'john.doe@email.com',
        phone: '+1-555-0123',
        address: '123 Main St',
        city: 'New York',
        state: 'NY',
        country: 'USA',
        postal_code: '10001',
        loyalty_points: 250,
        loyalty_tier: 'silver',
        total_spent: 1250.00,
        birthday: '1990-05-15'
      },
      {
        id: uuidv4(),
        first_name: 'Jane',
        last_name: 'Smith',
        email: 'jane.smith@email.com',
        phone: '+1-555-0456',
        address: '456 Oak Ave',
        city: 'Los Angeles',
        state: 'CA',
        country: 'USA',
        postal_code: '90210',
        loyalty_points: 1200,
        loyalty_tier: 'gold',
        total_spent: 3200.00,
        birthday: '1985-08-22'
      },
      {
        id: uuidv4(),
        first_name: 'Bob',
        last_name: 'Johnson',
        email: 'bob.johnson@email.com',
        phone: '+1-555-0789',
        address: '789 Pine Rd',
        city: 'Chicago',
        state: 'IL',
        country: 'USA',
        postal_code: '60601',
        loyalty_points: 75,
        loyalty_tier: 'bronze',
        total_spent: 450.00,
        birthday: '1995-12-10'
      }
    ];

    for (const customer of customers) {
      await database.run(`
        INSERT OR IGNORE INTO customers (
          id, first_name, last_name, email, phone, address, city, state, country, postal_code,
          loyalty_points, loyalty_tier, total_spent, birthday
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        customer.id, customer.first_name, customer.last_name, customer.email, customer.phone,
        customer.address, customer.city, customer.state, customer.country, customer.postal_code,
        customer.loyalty_points, customer.loyalty_tier, customer.total_spent, customer.birthday
      ]);
    }

    // Create sample orders (enhanced with shop assignment)
    const orders = [
      {
        id: uuidv4(),
        customer_id: customers[0].id,
        shop_id: shops[0].id,
        order_number: `ORD-${Date.now()}-001`,
        order_type: 'regular',
        status: 'completed',
        subtotal: 619.98,
        total_amount: 669.58,
        payment_method: 'credit_card',
        payment_status: 'paid'
      },
      {
        id: uuidv4(),
        customer_id: customers[1].id,
        shop_id: shops[1].id,
        order_number: `ORD-${Date.now()}-002`,
        order_type: 'regular',
        status: 'pending',
        subtotal: 1299.99,
        total_amount: 1403.99,
        payment_method: 'paypal',
        payment_status: 'pending'
      }
    ];

    for (const order of orders) {
      await database.run(`
        INSERT OR IGNORE INTO orders (
          id, customer_id, shop_id, order_number, order_type, status, subtotal, total_amount, 
          payment_method, payment_status, created_by
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        order.id, order.customer_id, order.shop_id, order.order_number, order.order_type,
        order.status, order.subtotal, order.total_amount, order.payment_method, order.payment_status, adminId
      ]);
    }

    // Create sample order items
    const orderItems = [
      {
        id: uuidv4(),
        order_id: orders[0].id,
        product_id: products[0].id,
        quantity: 1,
        unit_price: 45.99,
        total_price: 45.99
      },
      {
        id: uuidv4(),
        order_id: orders[0].id,
        product_id: products[2].id,
        quantity: 1,
        unit_price: 19.99,
        total_price: 19.99
      },
      {
        id: uuidv4(),
        order_id: orders[1].id,
        product_id: products[1].id,
        quantity: 1,
        unit_price: 79.99,
        total_price: 79.99
      }
    ];

    for (const item of orderItems) {
      await database.run(`
        INSERT OR IGNORE INTO order_items (
          id, order_id, product_id, quantity, unit_price, total_price
        ) VALUES (?, ?, ?, ?, ?, ?)
      `, [
        item.id, item.order_id, item.product_id, item.quantity,
        item.unit_price, item.total_price
      ]);
    }

    // Create sample expenses
    const expenses = [
      {
        id: uuidv4(),
        shop_id: shops[0].id,
        category: 'rent',
        description: 'Monthly rent payment',
        amount: 2500.00,
        expense_date: '2024-01-01',
        is_recurring: true,
        recurring_frequency: 'monthly'
      },
      {
        id: uuidv4(),
        shop_id: shops[0].id,
        category: 'utilities',
        description: 'Electricity and water bills',
        amount: 350.00,
        expense_date: '2024-01-15',
        is_recurring: true,
        recurring_frequency: 'monthly'
      },
      {
        id: uuidv4(),
        shop_id: shops[1].id,
        category: 'marketing',
        description: 'Social media advertising',
        amount: 500.00,
        expense_date: '2024-01-10',
        is_recurring: false
      }
    ];

    for (const expense of expenses) {
      await database.run(`
        INSERT OR IGNORE INTO expenses (
          id, shop_id, category, description, amount, expense_date, is_recurring, recurring_frequency, created_by
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        expense.id, expense.shop_id, expense.category, expense.description, expense.amount,
        expense.expense_date, expense.is_recurring, expense.recurring_frequency, adminId
      ]);
    }

    // Create sample exchange rates
    const exchangeRates = [
      { id: uuidv4(), base_currency: 'USD', target_currency: 'EUR', rate: 0.85 },
      { id: uuidv4(), base_currency: 'USD', target_currency: 'GBP', rate: 0.73 },
      { id: uuidv4(), base_currency: 'USD', target_currency: 'JPY', rate: 110.50 },
      { id: uuidv4(), base_currency: 'USD', target_currency: 'CNY', rate: 6.45 },
      { id: uuidv4(), base_currency: 'USD', target_currency: 'INR', rate: 74.25 },
      { id: uuidv4(), base_currency: 'USD', target_currency: 'AED', rate: 3.67 }
    ];

    for (const rate of exchangeRates) {
      await database.run(`
        INSERT OR IGNORE INTO exchange_rates (id, base_currency, target_currency, rate)
        VALUES (?, ?, ?, ?)
      `, [rate.id, rate.base_currency, rate.target_currency, rate.rate]);
    }

    // Create enhanced settings
    const settings = [
      { id: uuidv4(), key: 'store_name', value: 'Likaperfumes', description: 'Store name', category: 'general' },
      { id: uuidv4(), key: 'default_currency', value: 'RWF', description: 'Default currency', category: 'currency' },
      { id: uuidv4(), key: 'tax_rate', value: '0.08', description: 'Default tax rate', category: 'sales' },
      { id: uuidv4(), key: 'low_stock_threshold', value: '10', description: 'Low stock alert threshold', category: 'inventory' },
      { id: uuidv4(), key: 'loyalty_points_per_dollar', value: '1', description: 'Loyalty points earned per dollar spent', category: 'loyalty' },
      { id: uuidv4(), key: 'bronze_tier_threshold', value: '0', description: 'Points needed for bronze tier', category: 'loyalty' },
      { id: uuidv4(), key: 'silver_tier_threshold', value: '500', description: 'Points needed for silver tier', category: 'loyalty' },
      { id: uuidv4(), key: 'gold_tier_threshold', value: '1000', description: 'Points needed for gold tier', category: 'loyalty' },
      { id: uuidv4(), key: 'bottle_return_discount', value: '10', description: 'Discount percentage for bottle returns', category: 'loyalty' },
      { id: uuidv4(), key: 'layaway_duration_days', value: '90', description: 'Maximum layaway duration in days', category: 'layaway' }
    ];

    for (const setting of settings) {
      await database.run(`
        INSERT OR IGNORE INTO settings (id, key, value, description, category)
        VALUES (?, ?, ?, ?, ?)
      `, [setting.id, setting.key, setting.value, setting.description, setting.category]);
    }

    console.log('✅ Database migration completed successfully!');
    console.log('📊 Sample data created:');
    console.log('   - 1 admin user (admin/admin123)');
    console.log('   - 3 shops/branches');
    console.log('   - 3 staff users (manager1/manager123, cashier1/cashier123, cashier2/cashier123)');
    console.log('   - 5 categories (including perfume types)');
    console.log('   - 4 brands');
    console.log('   - 3 bulk perfumes');
    console.log('   - 3 bottle sizes (30ml, 50ml, 100ml)');
    console.log('   - 5 products (including perfumes)');
    console.log('   - 3 customers with loyalty tiers');
    console.log('   - 2 orders with shop assignment');
    console.log('   - 3 expenses');
    console.log('   - 6 exchange rates');
    console.log('   - 10 enhanced settings');

  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

// Run migration if called directly
if (require.main === module) {
  migrate().then(() => {
    process.exit(0);
  }).catch((error) => {
    console.error('Migration failed:', error);
    process.exit(1);
  });
}

module.exports = migrate; 