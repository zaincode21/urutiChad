const { v4: uuidv4 } = require('uuid');
const database = require('../server/database/database');

async function seedDiscounts() {
  console.log('🌱 Seeding Discount Management System...');

  try {
    // Get existing users for created_by field
    const users = await database.all('SELECT id FROM users LIMIT 1');
    const userId = users[0]?.id || uuidv4();

    // Get existing customers for customer tiers
    const customers = await database.all('SELECT id, tier FROM customers LIMIT 10');
    const customerTiers = ['bronze', 'silver', 'gold', 'platinum'];

    // 1. Create Business Rules
    console.log('📋 Creating business rules...');
    
    const businessRules = [
      {
        rule_key: 'max_percentage_discount',
        rule_value: { value: 50, description: 'Maximum percentage discount allowed' },
        rule_type: 'percentage',
        description: 'Maximum percentage discount that can be applied to any order'
      },
      {
        rule_key: 'bottle_return_tiers',
        rule_value: [
          { bottles: 1, discountAmount: 1000, description: 'Eco Starter' },
          { bottles: 2, discountAmount: 2000, description: 'Green Warrior' },
          { bottles: 3, discountAmount: 3000, description: 'Eco Champion' },
          { bottles: 4, discountAmount: 4000, description: 'Environmental Hero' }
        ],
        rule_type: 'bottle_return',
        description: 'Bottle return discount tiers configuration'
      },
      {
        rule_key: 'discount_stack_limit',
        rule_value: { maxDiscounts: 3, description: 'Maximum number of discounts that can be stacked' },
        rule_type: 'stacking',
        description: 'Limit on how many discounts can be applied to a single order'
      },
      {
        rule_key: 'customer_tier_discounts',
        rule_value: {
          bronze: { maxPercentage: 10, maxFixedAmount: 50 },
          silver: { maxPercentage: 15, maxFixedAmount: 100 },
          gold: { maxPercentage: 25, maxFixedAmount: 200 },
          platinum: { maxPercentage: 35, maxFixedAmount: 500 }
        },
        rule_type: 'customer_tier',
        description: 'Discount limits based on customer loyalty tiers'
      },
      {
        rule_key: 'temporal_discount_rules',
        rule_value: {
          flashSales: { maxDuration: 24, maxDiscount: 30 },
          seasonalSales: { maxDuration: 168, maxDiscount: 25 },
          holidaySales: { maxDuration: 336, maxDiscount: 40 }
        },
        rule_type: 'temporal',
        description: 'Time-based discount rules and limitations'
      }
    ];

    for (const rule of businessRules) {
      await database.run(`
        INSERT OR REPLACE INTO discount_business_rules (
          id, rule_key, rule_value, rule_type, description, is_active, updated_at
        ) VALUES (?, ?, ?, ?, ?, 1, CURRENT_TIMESTAMP)
      `, [
        uuidv4(), rule.rule_key, JSON.stringify(rule.rule_value), 
        rule.rule_type, rule.description
      ]);
    }

    // 2. Create Discounts
    console.log('🏷️ Creating discounts...');
    
    const discounts = [
      // Percentage Discounts
      {
        name: 'Summer Sale 2024',
        description: 'Annual summer promotion with up to 20% off',
        type: 'percentage',
        value: 20,
        min_purchase_amount: 50,
        max_discount_amount: 200,
        start_date: '2024-06-01',
        end_date: '2024-08-31',
        usage_limit: 1000,
        usage_per_customer: 2,
        applicable_to: 'all',
        customer_tiers: ['bronze', 'silver', 'gold', 'platinum'],
        is_active: true,
        auto_apply: false,
        discount_type: 'seasonal'
      },
      {
        name: 'New Customer Welcome',
        description: 'Special discount for first-time customers',
        type: 'percentage',
        value: 15,
        min_purchase_amount: 25,
        max_discount_amount: 75,
        start_date: '2024-01-01',
        end_date: '2024-12-31',
        usage_limit: null,
        usage_per_customer: 1,
        applicable_to: 'all',
        customer_tiers: ['bronze'],
        is_active: true,
        auto_apply: true,
        discount_type: 'regular_discount'
      },
      {
        name: 'Loyalty Gold Member',
        description: 'Exclusive discount for gold tier customers',
        type: 'percentage',
        value: 25,
        min_purchase_amount: 100,
        max_discount_amount: 300,
        start_date: '2024-01-01',
        end_date: '2024-12-31',
        usage_limit: null,
        usage_per_customer: 5,
        applicable_to: 'all',
        customer_tiers: ['gold'],
        is_active: true,
        auto_apply: false,
        discount_type: 'regular_discount'
      },
      {
        name: 'Flash Sale - Weekend Special',
        description: 'Limited time weekend flash sale',
        type: 'percentage',
        value: 30,
        min_purchase_amount: 75,
        max_discount_amount: 150,
        start_date: '2024-01-01',
        end_date: '2024-12-31',
        usage_limit: 500,
        usage_per_customer: 1,
        applicable_to: 'all',
        customer_tiers: ['bronze', 'silver', 'gold', 'platinum'],
        is_active: true,
        auto_apply: false,
        discount_type: 'flash_sale'
      },
      
      // Fixed Amount Discounts
      {
        name: 'Bulk Purchase Reward',
        description: 'Fixed discount for large orders',
        type: 'fixed_amount',
        value: 50,
        min_purchase_amount: 200,
        max_discount_amount: 50,
        start_date: '2024-01-01',
        end_date: '2024-12-31',
        usage_limit: null,
        usage_per_customer: 3,
        applicable_to: 'all',
        customer_tiers: ['silver', 'gold', 'platinum'],
        is_active: true,
        auto_apply: false,
        discount_type: 'regular_discount'
      },
      {
        name: 'Holiday Special',
        description: 'Fixed discount during holiday season',
        type: 'fixed_amount',
        value: 25,
        min_purchase_amount: 50,
        max_discount_amount: 25,
        start_date: '2024-11-01',
        end_date: '2024-12-31',
        usage_limit: 2000,
        usage_per_customer: 2,
        applicable_to: 'all',
        customer_tiers: ['bronze', 'silver', 'gold', 'platinum'],
        is_active: true,
        auto_apply: false,
        discount_type: 'seasonal'
      },
      
      // Bottle Return Discounts
      {
        name: 'Eco-Friendly Bottle Return',
        description: 'Environmental bottle return program - 3 bottles',
        type: 'bottle_return',
        value: null,
        min_purchase_amount: 30,
        max_discount_amount: null,
        start_date: '2024-01-01',
        end_date: '2024-12-31',
        usage_limit: null,
        usage_per_customer: 10,
        applicable_to: 'all',
        customer_tiers: ['bronze', 'silver', 'gold', 'platinum'],
        bottle_return_count: 3,
        is_active: true,
        auto_apply: false,
        discount_type: 'regular_discount'
      },
      {
        name: 'Premium Bottle Return',
        description: 'Environmental bottle return program - 5 bottles',
        type: 'bottle_return',
        value: null,
        min_purchase_amount: 50,
        max_discount_amount: null,
        start_date: '2024-01-01',
        end_date: '2024-12-31',
        usage_limit: null,
        usage_per_customer: 8,
        applicable_to: 'all',
        customer_tiers: ['silver', 'gold', 'platinum'],
        bottle_return_count: 5,
        is_active: true,
        auto_apply: false,
        discount_type: 'regular_discount'
      },
      {
        name: 'Ultimate Bottle Return',
        description: 'Environmental bottle return program - 10 bottles',
        type: 'bottle_return',
        value: null,
        min_purchase_amount: 100,
        max_discount_amount: null,
        start_date: '2024-01-01',
        end_date: '2024-12-31',
        usage_limit: null,
        usage_per_customer: 5,
        applicable_to: 'all',
        customer_tiers: ['gold', 'platinum'],
        bottle_return_count: 10,
        is_active: true,
        auto_apply: false,
        discount_type: 'regular_discount'
      },
      {
        name: 'Eco Champion Bottle Return',
        description: 'Environmental bottle return program - 15 bottles',
        type: 'bottle_return',
        value: null,
        min_purchase_amount: 150,
        max_discount_amount: null,
        start_date: '2024-01-01',
        end_date: '2024-12-31',
        usage_limit: null,
        usage_per_customer: 3,
        applicable_to: 'all',
        customer_tiers: ['platinum'],
        bottle_return_count: 15,
        is_active: true,
        auto_apply: false,
        discount_type: 'regular_discount'
      },
      {
        name: 'Eco Master Bottle Return',
        description: 'Environmental bottle return program - 20 bottles',
        type: 'bottle_return',
        value: null,
        min_purchase_amount: 200,
        max_discount_amount: null,
        start_date: '2024-01-01',
        end_date: '2024-12-31',
        usage_limit: null,
        usage_per_customer: 2,
        applicable_to: 'all',
        customer_tiers: ['platinum'],
        bottle_return_count: 20,
        is_active: true,
        auto_apply: false,
        discount_type: 'regular_discount'
      }
    ];

    const discountIds = [];
    for (const discount of discounts) {
      const discountId = uuidv4();
      discountIds.push(discountId);
      
      await database.run(`
        INSERT INTO discounts (
          id, name, description, type, value, min_purchase_amount, max_discount_amount,
          start_date, end_date, usage_limit, usage_per_customer, applicable_to,
          customer_tiers, bottle_return_count, is_active, auto_apply, discount_type, created_by
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        discountId, discount.name, discount.description, discount.type, discount.value,
        discount.min_purchase_amount, discount.max_discount_amount, discount.start_date,
        discount.end_date, discount.usage_limit, discount.usage_per_customer,
        discount.applicable_to, JSON.stringify(discount.customer_tiers),
        discount.bottle_return_count, discount.is_active, discount.auto_apply,
        discount.discount_type, userId
      ]);
    }

    // 3. Create Discount Campaigns
    console.log('🎯 Creating discount campaigns...');
    
    const campaigns = [
      {
        name: 'Summer 2024 Campaign',
        description: 'Comprehensive summer promotion campaign',
        type: 'seasonal',
        discount_ids: [discountIds[0], discountIds[4]], // Summer Sale + Bulk Purchase
        start_date: '2024-06-01',
        end_date: '2024-08-31',
        target_audience: 'all',
        budget: 5000,
        is_active: true
      },
      {
        name: 'Holiday Season 2024',
        description: 'Holiday season special campaign',
        type: 'holiday',
        discount_ids: [discountIds[5]], // Holiday Special
        start_date: '2024-11-01',
        end_date: '2024-12-31',
        target_audience: 'all',
        budget: 3000,
        is_active: true
      },
      {
        name: 'Eco-Friendly Initiative',
        description: 'Environmental bottle return campaign',
        type: 'special_event',
        discount_ids: [discountIds[6], discountIds[7], discountIds[8], discountIds[9], discountIds[10]], // All bottle return discounts
        start_date: '2024-01-01',
        end_date: '2024-12-31',
        target_audience: 'all',
        budget: 2000,
        is_active: true
      },
      {
        name: 'Loyalty Program Launch',
        description: 'Launch campaign for loyalty program',
        type: 'loyalty_tier',
        discount_ids: [discountIds[2]], // Gold Member discount
        start_date: '2024-01-01',
        end_date: '2024-12-31',
        target_audience: 'specific_tier',
        budget: 1500,
        is_active: true
      }
    ];

    for (const campaign of campaigns) {
      await database.run(`
        INSERT INTO discount_campaigns (
          id, name, description, type, discount_ids, start_date, end_date,
          target_audience, budget, is_active, created_by
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        uuidv4(), campaign.name, campaign.description, campaign.type,
        JSON.stringify(campaign.discount_ids), campaign.start_date, campaign.end_date,
        campaign.target_audience, campaign.budget, campaign.is_active, userId
      ]);
    }

    // 4. Create some sample discount applications for existing orders
    console.log('📊 Creating sample discount applications...');
    
    const orders = await database.all('SELECT id, customer_id, total_amount FROM orders LIMIT 5');
    
    for (const order of orders) {
      if (order.customer_id) {
        // Apply a random discount to some orders
        const randomDiscount = discounts[Math.floor(Math.random() * 3)]; // Use first 3 discounts
        const discountAmount = randomDiscount.type === 'percentage' 
          ? order.total_amount * (randomDiscount.value / 100)
          : Math.min(randomDiscount.value || 0, order.total_amount);
        
        if (discountAmount > 0) {
          await database.run(`
            INSERT INTO discount_applications (
              id, order_id, discount_id, amount_applied, discount_percentage,
              original_amount, final_amount
            ) VALUES (?, ?, ?, ?, ?, ?, ?)
          `, [
            uuidv4(), order.id, discountIds[0], discountAmount,
            randomDiscount.type === 'percentage' ? randomDiscount.value : null,
            order.total_amount, order.total_amount - discountAmount
          ]);
        }
      }
    }

    // 5. Create sample customer discount usage
    console.log('👥 Creating sample customer discount usage...');
    
    for (const customer of customers) {
      const randomDiscount = discounts[Math.floor(Math.random() * 3)];
      const usageCount = Math.floor(Math.random() * 3) + 1;
      
      await database.run(`
        INSERT OR REPLACE INTO customer_discount_usage (
          id, customer_id, discount_id, usage_count, last_used_at, created_at, updated_at
        ) VALUES (?, ?, ?, ?, datetime('now', '-' || ? || ' days'), CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      `, [
        uuidv4(), customer.id, discountIds[0], usageCount, Math.floor(Math.random() * 30)
      ]);
    }

    console.log('✅ Discount Management System seeded successfully!');
    console.log(`📈 Created ${businessRules.length} business rules`);
    console.log(`🏷️ Created ${discounts.length} discounts`);
    console.log(`🎯 Created ${campaigns.length} campaigns`);
    console.log(`📊 Created sample discount applications`);
    console.log(`👥 Created sample customer usage records`);

  } catch (error) {
    console.error('❌ Error seeding discount data:', error);
    throw error;
  }
}

// Run the seed function
if (require.main === module) {
  seedDiscounts()
    .then(() => {
      console.log('✅ Discount seeding completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Discount seeding failed:', error);
      process.exit(1);
    });
}

module.exports = { seedDiscounts }; 