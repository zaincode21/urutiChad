const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const { v4: uuidv4 } = require('uuid');

// Connect to the database
const dbPath = path.join(__dirname, '../database/retail.db');
const db = new sqlite3.Database(dbPath);

console.log('🌱 Seeding Discount Management System...');

// Helper function to run queries
const runQuery = (query, params = []) => {
  return new Promise((resolve, reject) => {
    db.run(query, params, function(err) {
      if (err) {
        console.error('Error executing query:', err);
        reject(err);
      } else {
        resolve(this);
      }
    });
  });
};

// Helper function to get data
const getData = (query, params = []) => {
  return new Promise((resolve, reject) => {
    db.all(query, params, (err, rows) => {
      if (err) {
        console.error('Error getting data:', err);
        reject(err);
      } else {
        resolve(rows);
      }
    });
  });
};

const seedDiscounts = async () => {
  try {
    // Initialize database tables if they don't exist
    console.log('🔧 Initializing database tables...');
    
    // Create users table if it doesn't exist
    await runQuery(`
      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        username TEXT UNIQUE NOT NULL,
        email TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        role TEXT DEFAULT 'user',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    // Create customers table if it doesn't exist
    await runQuery(`
      CREATE TABLE IF NOT EXISTS customers (
        id TEXT PRIMARY KEY,
        first_name TEXT NOT NULL,
        last_name TEXT NOT NULL,
        email TEXT UNIQUE,
        phone TEXT,
        address TEXT,
        loyalty_tier TEXT DEFAULT 'bronze',
        loyalty_points INTEGER DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    // Create discount tables
    await runQuery(`
      CREATE TABLE IF NOT EXISTS discounts (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        description TEXT,
        type TEXT NOT NULL,
        value DECIMAL(10,2),
        min_purchase_amount DECIMAL(10,2) DEFAULT 0,
        max_discount_amount DECIMAL(10,2),
        start_date DATE,
        end_date DATE,
        usage_limit INTEGER,
        usage_per_customer INTEGER DEFAULT 1,
        applicable_to TEXT DEFAULT 'all',
        customer_tiers TEXT,
        bottle_return_count INTEGER,
        is_active BOOLEAN DEFAULT 1,
        auto_apply BOOLEAN DEFAULT 0,
        discount_type TEXT DEFAULT 'regular_discount',
        created_by TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (created_by) REFERENCES users (id)
      )
    `);
    
    await runQuery(`
      CREATE TABLE IF NOT EXISTS discount_applications (
        id TEXT PRIMARY KEY,
        order_id TEXT NOT NULL,
        discount_id TEXT NOT NULL,
        amount_applied DECIMAL(10,2) NOT NULL,
        discount_percentage DECIMAL(5,2),
        original_amount DECIMAL(10,2) NOT NULL,
        final_amount DECIMAL(10,2) NOT NULL,
        applied_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (order_id) REFERENCES orders (id) ON DELETE CASCADE,
        FOREIGN KEY (discount_id) REFERENCES discounts (id)
      )
    `);
    
    await runQuery(`
      CREATE TABLE IF NOT EXISTS customer_discount_usage (
        id TEXT PRIMARY KEY,
        customer_id TEXT NOT NULL,
        discount_id TEXT NOT NULL,
        usage_count INTEGER DEFAULT 0,
        last_used_at DATETIME,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(customer_id, discount_id),
        FOREIGN KEY (customer_id) REFERENCES customers (id),
        FOREIGN KEY (discount_id) REFERENCES discounts (id)
      )
    `);
    
    await runQuery(`
      CREATE TABLE IF NOT EXISTS discount_campaigns (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        description TEXT,
        type TEXT NOT NULL,
        discount_ids TEXT,
        start_date DATE NOT NULL,
        end_date DATE NOT NULL,
        target_audience TEXT DEFAULT 'all',
        budget DECIMAL(10,2),
        is_active BOOLEAN DEFAULT 1,
        created_by TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (created_by) REFERENCES users (id)
      )
    `);
    
    await runQuery(`
      CREATE TABLE IF NOT EXISTS discount_business_rules (
        id TEXT PRIMARY KEY,
        rule_key TEXT UNIQUE NOT NULL,
        rule_value TEXT NOT NULL,
        rule_type TEXT NOT NULL,
        description TEXT,
        is_active BOOLEAN DEFAULT 1,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    // Create sample user if none exists
    const users = await getData('SELECT id FROM users LIMIT 1');
    let userId;
    
    if (users.length === 0) {
      console.log('👤 Creating sample user...');
      userId = require('uuid').v4();
      await runQuery(
        'INSERT INTO users (id, username, email, password_hash, role) VALUES (?, ?, ?, ?, ?)',
        [userId, 'admin', 'admin@example.com', 'hashed_password', 'admin']
      );
    } else {
      userId = users[0].id;
    }
    
    // Create sample customers if none exist
    const customers = await getData('SELECT id FROM customers LIMIT 5');
    let customerIds;
    
    if (customers.length === 0) {
      console.log('👥 Creating sample customers...');
      customerIds = [];
      for (let i = 0; i < 5; i++) {
        const customerId = require('uuid').v4();
        customerIds.push(customerId);
        await runQuery(
          'INSERT INTO customers (id, first_name, last_name, email, loyalty_tier, loyalty_points) VALUES (?, ?, ?, ?, ?, ?)',
          [
            customerId,
            `Customer${i + 1}`,
            'Smith',
            `customer${i + 1}@example.com`,
            ['bronze', 'silver', 'gold', 'platinum'][i % 4],
            Math.floor(Math.random() * 1000)
          ]
        );
      }
    } else {
      customerIds = customers.map(c => c.id);
    }

    console.log('📊 Creating discount business rules...');
    
    // Insert business rules
    const businessRules = [
      {
        id: uuidv4(),
        rule_key: 'max_discount_percentage',
        rule_value: '50',
        rule_type: 'percentage',
        description: 'Maximum discount percentage allowed'
      },
      {
        id: uuidv4(),
        rule_key: 'max_discount_stack',
        rule_value: '3',
        rule_type: 'stacking',
        description: 'Maximum number of discounts that can be stacked'
      },
      {
        id: uuidv4(),
        rule_key: 'bottle_return_tiers',
        rule_value: JSON.stringify([
          { bottles: 1, discountAmount: 1000, description: 'Eco Starter' },
          { bottles: 2, discountAmount: 2000, description: 'Green Warrior' },
          { bottles: 3, discountAmount: 3000, description: 'Eco Champion' },
          { bottles: 4, discountAmount: 4000, description: 'Environmental Hero' }
        ]),
        rule_type: 'bottle_return',
        description: 'Bottle return discount tiers'
      },
      {
        id: uuidv4(),
        rule_key: 'loyalty_tier_discounts',
        rule_value: JSON.stringify({
          bronze: 5,
          silver: 10,
          gold: 15,
          platinum: 20
        }),
        rule_type: 'customer_tier',
        description: 'Discount percentages by loyalty tier'
      },
      {
        id: uuidv4(),
        rule_key: 'seasonal_discount_rules',
        rule_value: JSON.stringify({
          summer: { months: [6, 7, 8], maxDiscount: 30 },
          winter: { months: [12, 1, 2], maxDiscount: 25 },
          spring: { months: [3, 4, 5], maxDiscount: 20 },
          fall: { months: [9, 10, 11], maxDiscount: 15 }
        }),
        rule_type: 'temporal',
        description: 'Seasonal discount rules'
      }
    ];

    for (const rule of businessRules) {
      await runQuery(
        'INSERT OR REPLACE INTO discount_business_rules (id, rule_key, rule_value, rule_type, description, is_active, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [rule.id, rule.rule_key, rule.rule_value, rule.rule_type, rule.description, 1, new Date().toISOString()]
      );
    }

    console.log('🎯 Creating discounts...');
    
    // Insert discounts
    const discounts = [
      {
        id: uuidv4(),
        name: 'Summer Sale',
        description: 'Summer discount promotion for all customers',
        type: 'percentage',
        value: 15,
        min_purchase_amount: 50,
        max_discount_amount: 100,
        start_date: '2024-06-01',
        end_date: '2024-08-31',
        usage_limit: 1000,
        usage_per_customer: 1,
        applicable_to: 'all',
        customer_tiers: JSON.stringify(['bronze', 'silver', 'gold', 'platinum']),
        is_active: 1,
        auto_apply: 0,
        discount_type: 'seasonal',
        created_by: userId
      },
      {
        id: uuidv4(),
        name: 'Bottle Return Eco Reward',
        description: 'Environmental bottle return program',
        type: 'bottle_return',
        bottle_return_count: 5,
        min_purchase_amount: 30,
        max_discount_amount: 50,
        start_date: '2024-01-01',
        end_date: '2024-12-31',
        usage_limit: 500,
        usage_per_customer: 3,
        applicable_to: 'all',
        customer_tiers: JSON.stringify(['bronze', 'silver', 'gold', 'platinum']),
        is_active: 1,
        auto_apply: 0,
        discount_type: 'regular_discount',
        created_by: userId
      },
      {
        id: uuidv4(),
        name: 'Flash Sale',
        description: '24-hour flash discount',
        type: 'percentage',
        value: 25,
        min_purchase_amount: 100,
        max_discount_amount: 200,
        start_date: '2024-01-01',
        end_date: '2024-12-31',
        usage_limit: 200,
        usage_per_customer: 1,
        applicable_to: 'all',
        customer_tiers: JSON.stringify(['silver', 'gold', 'platinum']),
        is_active: 1,
        auto_apply: 0,
        discount_type: 'flash_sale',
        created_by: userId
      },
      {
        id: uuidv4(),
        name: 'New Customer Welcome',
        description: 'Welcome discount for new customers',
        type: 'fixed_amount',
        value: 10,
        min_purchase_amount: 25,
        max_discount_amount: 10,
        start_date: '2024-01-01',
        end_date: '2024-12-31',
        usage_limit: 1000,
        usage_per_customer: 1,
        applicable_to: 'all',
        customer_tiers: JSON.stringify(['bronze']),
        is_active: 1,
        auto_apply: 1,
        discount_type: 'welcome',
        created_by: userId
      },
      {
        id: uuidv4(),
        name: 'Loyalty Gold Tier',
        description: 'Exclusive discount for Gold tier customers',
        type: 'percentage',
        value: 20,
        min_purchase_amount: 75,
        max_discount_amount: 150,
        start_date: '2024-01-01',
        end_date: '2024-12-31',
        usage_limit: 300,
        usage_per_customer: 2,
        applicable_to: 'all',
        customer_tiers: JSON.stringify(['gold']),
        is_active: 1,
        auto_apply: 0,
        discount_type: 'loyalty_tier',
        created_by: userId
      },
      {
        id: uuidv4(),
        name: 'Holiday Special',
        description: 'Special holiday discount',
        type: 'percentage',
        value: 30,
        min_purchase_amount: 150,
        max_discount_amount: 300,
        start_date: '2024-12-01',
        end_date: '2024-12-31',
        usage_limit: 100,
        usage_per_customer: 1,
        applicable_to: 'all',
        customer_tiers: JSON.stringify(['bronze', 'silver', 'gold', 'platinum']),
        is_active: 1,
        auto_apply: 0,
        discount_type: 'holiday',
        created_by: userId
      }
    ];

    for (const discount of discounts) {
      await runQuery(
        `INSERT OR REPLACE INTO discounts (
          id, name, description, type, value, min_purchase_amount, max_discount_amount,
          start_date, end_date, usage_limit, usage_per_customer, applicable_to,
          customer_tiers, bottle_return_count, is_active, auto_apply, discount_type,
          created_by, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          discount.id, discount.name, discount.description, discount.type, discount.value,
          discount.min_purchase_amount, discount.max_discount_amount, discount.start_date,
          discount.end_date, discount.usage_limit, discount.usage_per_customer,
          discount.applicable_to, discount.customer_tiers, discount.bottle_return_count,
          discount.is_active, discount.auto_apply, discount.discount_type, discount.created_by,
          new Date().toISOString(), new Date().toISOString()
        ]
      );
    }

    console.log('📢 Creating discount campaigns...');
    
    // Insert campaigns
    const campaigns = [
      {
        id: uuidv4(),
        name: 'Summer Collection Campaign',
        description: 'Promote summer products with multiple discounts',
        type: 'seasonal',
        discount_ids: JSON.stringify([discounts[0].id, discounts[2].id]),
        start_date: '2024-06-01',
        end_date: '2024-08-31',
        target_audience: 'all',
        budget: 5000,
        is_active: 1,
        created_by: userId
      },
      {
        id: uuidv4(),
        name: 'Eco-Friendly Initiative',
        description: 'Promote bottle return program',
        type: 'special_event',
        discount_ids: JSON.stringify([discounts[1].id]),
        start_date: '2024-01-01',
        end_date: '2024-12-31',
        target_audience: 'all',
        budget: 2000,
        is_active: 1,
        created_by: userId
      },
      {
        id: uuidv4(),
        name: 'Holiday Season',
        description: 'Holiday season promotions',
        type: 'holiday',
        discount_ids: JSON.stringify([discounts[5].id]),
        start_date: '2024-12-01',
        end_date: '2024-12-31',
        target_audience: 'all',
        budget: 3000,
        is_active: 1,
        created_by: userId
      }
    ];

    for (const campaign of campaigns) {
      await runQuery(
        `INSERT OR REPLACE INTO discount_campaigns (
          id, name, description, type, discount_ids, start_date, end_date,
          target_audience, budget, is_active, created_by, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          campaign.id, campaign.name, campaign.description, campaign.type,
          campaign.discount_ids, campaign.start_date, campaign.end_date,
          campaign.target_audience, campaign.budget, campaign.is_active,
          campaign.created_by, new Date().toISOString(), new Date().toISOString()
        ]
      );
    }

    console.log('📈 Creating sample discount applications...');
    
    // Insert sample discount applications (assuming some orders exist)
    let orders = [];
    try {
      orders = await getData('SELECT id, total_amount FROM orders LIMIT 3');
    } catch (error) {
      console.log('ℹ️  Orders table not found. Skipping discount applications.');
    }
    
    if (orders.length > 0) {
      for (let i = 0; i < Math.min(orders.length, 2); i++) {
        const order = orders[i];
        const discount = discounts[i % discounts.length];
        
        await runQuery(
          `INSERT OR REPLACE INTO discount_applications (
            id, order_id, discount_id, amount_applied, discount_percentage,
            original_amount, final_amount, applied_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            uuidv4(), order.id, discount.id, 
            Math.min(order.total_amount * 0.1, 50), // 10% or $50 max
            10, order.total_amount, 
            order.total_amount - Math.min(order.total_amount * 0.1, 50),
            new Date().toISOString()
          ]
        );
      }
    } else {
      console.log('ℹ️  No orders found. Skipping discount applications.');
    }

    console.log('👥 Creating customer discount usage records...');
    
    // Insert customer discount usage
    for (let i = 0; i < Math.min(customerIds.length, 3); i++) {
      const customerId = customerIds[i];
      const discount = discounts[i % discounts.length];
      
      await runQuery(
        `INSERT OR REPLACE INTO customer_discount_usage (
          id, customer_id, discount_id, usage_count, last_used_at, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          uuidv4(), customerId, discount.id, 
          Math.floor(Math.random() * 3) + 1, // 1-3 uses
          new Date().toISOString(), new Date().toISOString(), new Date().toISOString()
        ]
      );
    }

    console.log('✅ Discount Management System seeded successfully!');
    console.log(`📊 Created ${businessRules.length} business rules`);
    console.log(`🎯 Created ${discounts.length} discounts`);
    console.log(`📢 Created ${campaigns.length} campaigns`);
    console.log(`📈 Created sample discount applications`);
    console.log(`👥 Created customer usage records`);

  } catch (error) {
    console.error('❌ Error seeding discount data:', error);
  } finally {
    db.close();
  }
};

seedDiscounts(); 