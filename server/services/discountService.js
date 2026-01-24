const { v4: uuidv4 } = require('uuid');
const database = require('../database/database');

class DiscountService {
  // Get all active discounts
  async getDiscounts(filters = {}) {
    const {
      type = '',
      is_active = true,
      customer_id = null,
      min_purchase_amount = 0,
      search = '',
      page = 1,
      limit = 20
    } = filters;

    const offset = (page - 1) * limit;
    let whereConditions = ['d.is_active = $1'];
    let params = [is_active];

    if (type) {
      whereConditions.push(`d.type = $${params.length + 1}`);
      params.push(type);
    }

    if (search) {
      whereConditions.push(`(d.name LIKE $${params.length + 1} OR d.description LIKE $${params.length + 2})`);
      params.push(`%${search}%`, `%${search}%`);
    }

    if (min_purchase_amount > 0) {
      whereConditions.push(`(d.min_purchase_amount IS NULL OR d.min_purchase_amount <= $${params.length + 1})`);
      params.push(min_purchase_amount);
    }

    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

    const discounts = await database.all(`
      SELECT 
        d.*,
        u.username as created_by_user,
        COUNT(da.id) as total_applications,
        SUM(da.amount_applied) as total_discount_given
      FROM discounts d
      LEFT JOIN users u ON d.created_by = u.id
      LEFT JOIN discount_applications da ON d.id = da.discount_id
      ${whereClause}
      GROUP BY d.id, u.username
      ORDER BY d.created_at DESC
      LIMIT $${params.length + 1} OFFSET $${params.length + 2}
    `, [...params, parseInt(limit), offset]);

    // Parse JSON fields for all discounts
    const parsedDiscounts = discounts.map(discount => {
      try {
        if (discount.product_types && typeof discount.product_types === 'string') {
          discount.product_types = JSON.parse(discount.product_types);
        }
        if (discount.category_ids && typeof discount.category_ids === 'string') {
          discount.category_ids = JSON.parse(discount.category_ids);
        }
        if (discount.customer_tiers && typeof discount.customer_tiers === 'string') {
          discount.customer_tiers = JSON.parse(discount.customer_tiers);
        }
      } catch (e) {
        console.error('Error parsing JSON fields in discount:', e);
      }
      return discount;
    });

    const countResult = await database.get(`
      SELECT COUNT(*) as total
      FROM discounts d
      ${whereClause}
    `, params);

    return {
      discounts: parsedDiscounts,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: countResult.total,
        totalPages: Math.ceil(countResult.total / limit)
      }
    };
  }

  // Get discount by ID
  async getDiscountById(discountId) {
    const discount = await database.get(`
      SELECT 
        d.*,
        u.username as created_by_user,
        COUNT(da.id) as total_applications,
        SUM(da.amount_applied) as total_discount_given
      FROM discounts d
      LEFT JOIN users u ON d.created_by = u.id
      LEFT JOIN discount_applications da ON d.id = da.discount_id
      WHERE d.id = $1
      GROUP BY d.id
    `, [discountId]);
    
    // Parse JSON fields if they exist
    if (discount) {
      try {
        if (discount.product_types && typeof discount.product_types === 'string') {
          discount.product_types = JSON.parse(discount.product_types);
        }
        if (discount.category_ids && typeof discount.category_ids === 'string') {
          discount.category_ids = JSON.parse(discount.category_ids);
        }
        if (discount.customer_tiers && typeof discount.customer_tiers === 'string') {
          discount.customer_tiers = JSON.parse(discount.customer_tiers);
        }
      } catch (e) {
        console.error('Error parsing JSON fields in discount:', e);
      }
    }
    
    return discount;
  }

  // Create new discount
  async createDiscount(discountData) {
    const discountId = uuidv4();
    const {
      name, description, type, value, min_purchase_amount, max_discount_amount,
      start_date, end_date, usage_limit, usage_per_customer, applicable_to,
      product_types, category_ids, customer_tiers, bottle_return_count, is_active, 
      auto_apply, discount_type, allow_partial_payment, created_by
    } = discountData;

    await database.run(`
      INSERT INTO discounts (
        id, name, description, type, value, min_purchase_amount, max_discount_amount,
        start_date, end_date, usage_limit, usage_per_customer, applicable_to,
        product_types, category_ids, customer_tiers, bottle_return_count, is_active, 
        auto_apply, discount_type, allow_partial_payment, created_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21)
    `, [
      discountId, name, description, type, value, min_purchase_amount, max_discount_amount,
      start_date, end_date, usage_limit, usage_per_customer, applicable_to,
      product_types ? JSON.stringify(product_types) : null,
      category_ids ? JSON.stringify(category_ids) : null,
      customer_tiers ? JSON.stringify(customer_tiers) : null, bottle_return_count,
      is_active, auto_apply, discount_type, allow_partial_payment, created_by
    ]);

    return { discount_id: discountId };
  }

  // Update discount
  async updateDiscount(discountId, discountData) {
    const {
      name, description, type, value, min_purchase_amount, max_discount_amount,
      start_date, end_date, usage_limit, usage_per_customer, applicable_to,
      product_types, category_ids, customer_tiers, bottle_return_count, is_active, 
      auto_apply, discount_type, allow_partial_payment
    } = discountData;

    await database.run(`
      UPDATE discounts SET
        name = $1, description = $2, type = $3, value = $4, min_purchase_amount = $5,
        max_discount_amount = $6, start_date = $7, end_date = $8, usage_limit = $9,
        usage_per_customer = $10, applicable_to = $11, product_types = $12, category_ids = $13,
        customer_tiers = $14, bottle_return_count = $15, is_active = $16, auto_apply = $17, 
        discount_type = $18, allow_partial_payment = $19,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $20
    `, [
      name, description, type, value, min_purchase_amount, max_discount_amount,
      start_date, end_date, usage_limit, usage_per_customer, applicable_to,
      product_types ? JSON.stringify(product_types) : null,
      category_ids ? JSON.stringify(category_ids) : null,
      customer_tiers ? JSON.stringify(customer_tiers) : null, bottle_return_count,
      is_active, auto_apply, discount_type, allow_partial_payment, discountId
    ]);

    return { message: 'Discount updated successfully' };
  }

  // Delete discount
  async deleteDiscount(discountId) {
    await database.run('DELETE FROM discounts WHERE id = $1', [discountId]);
    return { message: 'Discount deleted successfully' };
  }

  // Get available discounts for a customer
  async getAvailableDiscounts(customerId, orderAmount = 0, orderItems = []) {
    const currentDate = new Date().toISOString().split('T')[0];
    
    const discounts = await database.all(`
      SELECT 
        d.*,
        COALESCE(cdu.usage_count, 0) as customer_usage_count
      FROM discounts d
      LEFT JOIN customer_discount_usage cdu ON d.id = cdu.discount_id AND cdu.customer_id = $1
      WHERE d.is_active = true
        AND (d.start_date IS NULL OR d.start_date <= $2)
        AND (d.end_date IS NULL OR d.end_date >= $3)
        AND (d.min_purchase_amount IS NULL OR d.min_purchase_amount <= $4)
        AND (d.usage_limit IS NULL OR d.usage_limit > (
          SELECT COUNT(*) FROM discount_applications WHERE discount_id = d.id
        ))
        AND (d.usage_per_customer IS NULL OR d.usage_per_customer > COALESCE(cdu.usage_count, 0))
    `, [customerId, currentDate, currentDate, orderAmount]);

    // Filter by customer tier if applicable
    const customer = await database.get('SELECT tier FROM customers WHERE id = $1', [customerId]);
    const customerTier = customer?.tier || 'bronze';

    return discounts.filter(discount => {
      if (discount.customer_tiers) {
        const allowedTiers = JSON.parse(discount.customer_tiers);
        return allowedTiers.includes(customerTier) || allowedTiers.includes('all');
      }
      return true;
    });
  }

  // Apply discount to order
  async applyDiscount(orderId, discountId, customerId, orderAmount) {
    const discount = await this.getDiscountById(discountId);
    if (!discount) {
      throw new Error('Discount not found');
    }

    // Prevent applying multiple bottle return discounts to the same order
    if (discount.type === 'bottle_return') {
      const existingBottleReturn = await database.get(`
        SELECT da.id, d.name 
        FROM discount_applications da
        JOIN discounts d ON da.discount_id = d.id
        WHERE da.order_id = $1 AND d.type = 'bottle_return'
        LIMIT 1
      `, [orderId]);
      
      if (existingBottleReturn) {
        throw new Error('Only one bottle return discount can be applied per order. Please remove the existing bottle return discount first.');
      }
    }

    // Validate discount eligibility
    const validation = await this.validateDiscountEligibility(discountId, customerId, orderAmount);
    if (!validation.isValid) {
      throw new Error(validation.errors.join(', '));
    }

    // Calculate discount amount
    const discountAmount = this.calculateDiscountAmount(discount, orderAmount);
    
    // Create discount application record
    const applicationId = uuidv4();
    await database.run(`
      INSERT INTO discount_applications (
        id, order_id, discount_id, amount_applied, discount_percentage,
        original_amount, final_amount
      ) VALUES ($1, $2, $3, $4, $5, $6, $7)
    `, [
      applicationId, orderId, discountId, discountAmount,
      discount.type === 'percentage' ? discount.value : null,
      orderAmount, orderAmount - discountAmount
    ]);

    // Update customer usage
    await database.run(`
      INSERT INTO customer_discount_usage (
        customer_id, discount_id, usage_count, last_used_at, updated_at
      ) VALUES ($1, $2, 
        COALESCE((SELECT usage_count FROM customer_discount_usage WHERE customer_id = $3 AND discount_id = $4), 0) + 1,
        CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
      )
      ON CONFLICT (customer_id, discount_id) 
      DO UPDATE SET 
        usage_count = customer_discount_usage.usage_count + 1,
        last_used_at = CURRENT_TIMESTAMP,
        updated_at = CURRENT_TIMESTAMP
    `, [customerId, discountId, customerId, discountId]);

    return {
      application_id: applicationId,
      discount_amount: discountAmount,
      final_amount: orderAmount - discountAmount
    };
  }

  // Validate discount eligibility
  async validateDiscountEligibility(discountId, customerId, orderAmount, paymentStatus = 'complete') {
    const discount = await this.getDiscountById(discountId);
    if (!discount) {
      return { isValid: false, errors: ['Discount not found'] };
    }

    const errors = [];
    const currentDate = new Date().toISOString().split('T')[0];

    // Check if discount is active
    if (!discount.is_active) {
      errors.push('Discount is not active');
    }

    // Check if discounts are allowed for partial payments
    if (paymentStatus === 'pending' && !this.isDiscountAllowedForPartialPayment(discount)) {
      errors.push('Discounts are not available for partial payments');
    }

    // Check date validity
    if (discount.start_date && discount.start_date > currentDate) {
      errors.push('Discount has not started yet');
    }
    if (discount.end_date && discount.end_date < currentDate) {
      errors.push('Discount has expired');
    }

    // Check minimum purchase amount
    if (discount.min_purchase_amount && orderAmount < discount.min_purchase_amount) {
      errors.push(`Minimum purchase amount of $${discount.min_purchase_amount} required`);
    }

    // Check usage limits
    const totalUsage = await database.get(`
      SELECT COUNT(*) as count FROM discount_applications WHERE discount_id = $1
    `, [discountId]);
    
    if (discount.usage_limit && totalUsage.count >= discount.usage_limit) {
      errors.push('Discount usage limit reached');
    }

    // Check customer usage
    const customerUsage = await database.get(`
      SELECT usage_count FROM customer_discount_usage 
      WHERE customer_id = $1 AND discount_id = $2
    `, [customerId, discountId]);
    
    if (discount.usage_per_customer && customerUsage && customerUsage.usage_count >= discount.usage_limit) {
      errors.push('Customer usage limit reached');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  // Check if discount is allowed for partial payments
  isDiscountAllowedForPartialPayment(discount) {
    // By default, disable all discounts for partial payments
    // This can be overridden by setting a specific flag on the discount
    return discount.allow_partial_payment === true;
  }

  // Get available discounts considering payment status
  async getAvailableDiscounts(filters = {}, paymentStatus = 'complete') {
    const discounts = await this.getDiscounts(filters);
    
    if (paymentStatus === 'pending') {
      // Filter out discounts that don't allow partial payments
      discounts.discounts = discounts.discounts.filter(discount => 
        this.isDiscountAllowedForPartialPayment(discount)
      );
    }
    
    return discounts;
  }

  // Calculate discount amount
  calculateDiscountAmount(discount, orderAmount) {
    let discountAmount = 0;

    switch (discount.type) {
      case 'percentage':
        discountAmount = orderAmount * (discount.value / 100);
        break;
      case 'fixed_amount':
        discountAmount = Math.min(discount.value, orderAmount);
        break;
      case 'bottle_return':
        // This would be calculated based on bottle return logic
        discountAmount = this.calculateBottleReturnDiscount(discount, orderAmount);
        break;
      default:
        discountAmount = 0;
    }

    // Apply maximum discount limit
    if (discount.max_discount_amount) {
      discountAmount = Math.min(discountAmount, discount.max_discount_amount);
    }

    return Math.max(0, discountAmount);
  }

  // Calculate bottle return discount
  calculateBottleReturnDiscount(discount, orderAmount) {
    // Fixed amount discounts based on bottle count
    if (discount.bottle_return_count) {
      const bottleReturnTiers = [
        { bottles: 1, discountAmount: 1000 },
        { bottles: 2, discountAmount: 2000 },
        { bottles: 3, discountAmount: 3000 },
        { bottles: 4, discountAmount: 4000 }
      ];

      const tier = bottleReturnTiers.find(t => t.bottles === discount.bottle_return_count);
      if (tier) {
        // Return fixed amount discount, capped at the order amount
        return Math.min(tier.discountAmount, orderAmount);
      }
    }
    return 0;
  }

  // Get discount statistics
  async getDiscountStats() {
    const stats = await database.get(`
      SELECT 
        COUNT(*) as total_discounts,
        COUNT(CASE WHEN is_active = 1 THEN 1 END) as active_discounts,
        COUNT(CASE WHEN is_active = 0 THEN 1 END) as inactive_discounts,
        COUNT(CASE WHEN type = 'percentage' THEN 1 END) as percentage_discounts,
        COUNT(CASE WHEN type = 'fixed_amount' THEN 1 END) as fixed_amount_discounts,
        COUNT(CASE WHEN type = 'bottle_return' THEN 1 END) as bottle_return_discounts
      FROM discounts
    `);

    const usageStats = await database.get(`
      SELECT 
        COUNT(*) as total_applications,
        SUM(amount_applied) as total_discount_given,
        AVG(amount_applied) as avg_discount_amount
      FROM discount_applications
    `);

    return {
      ...stats,
      ...usageStats
    };
  }

  // Get discount applications for an order
  async getOrderDiscountApplications(orderId) {
    return await database.all(`
      SELECT 
        da.*,
        d.name as discount_name,
        d.type as discount_type,
        d.value as discount_value
      FROM discount_applications da
      LEFT JOIN discounts d ON da.discount_id = d.id
      WHERE da.order_id = $1
      ORDER BY da.applied_at DESC
    `, [orderId]);
  }

  // Update business rules
  async updateBusinessRule(ruleKey, ruleValue, ruleType, description = '') {
    await database.run(`
      INSERT INTO discount_business_rules (
        rule_key, rule_value, rule_type, description, updated_at
      ) VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP)
      ON CONFLICT (rule_key) 
      DO UPDATE SET 
        rule_value = EXCLUDED.rule_value,
        rule_type = EXCLUDED.rule_type,
        description = EXCLUDED.description,
        updated_at = CURRENT_TIMESTAMP
    `, [ruleKey, JSON.stringify(ruleValue), ruleType, description]);

    return { message: 'Business rule updated successfully' };
  }

  // Get business rules
  async getBusinessRules(ruleType = null) {
    let whereClause = '';
    let params = [];
    
    if (ruleType) {
      whereClause = 'WHERE rule_type = $1';
      params = [ruleType];
    }

    const rules = await database.all(`
      SELECT * FROM discount_business_rules 
      ${whereClause}
      ORDER BY rule_type, rule_key
    `, params);

    // Parse JSON values
    return rules.map(rule => ({
      ...rule,
      rule_value: JSON.parse(rule.rule_value)
    }));
  }
}

module.exports = new DiscountService(); 