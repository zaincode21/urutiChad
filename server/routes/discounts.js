const express = require('express');
const { v4: uuidv4 } = require('uuid');
const { body, validationResult } = require('express-validator');
const database = require('../database/database');
const discountService = require('../services/discountService');
const { auth } = require('../middleware/auth');

const router = express.Router();

// Get all discounts
router.get('/', auth, async (req, res) => {
  try {
    const filters = {
      type: req.query.type || '',
      is_active: req.query.is_active !== 'false',
      customer_id: req.query.customer_id || null,
      min_purchase_amount: parseFloat(req.query.min_purchase_amount) || 0,
      search: req.query.search || '',
      page: parseInt(req.query.page) || 1,
      limit: parseInt(req.query.limit) || 20
    };

    const paymentStatus = req.query.payment_status || 'complete';
    const result = await discountService.getAvailableDiscounts(filters, paymentStatus);
    res.json(result);
  } catch (error) {
    console.error('Get discounts error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get discount by ID
router.get('/:id', auth, async (req, res) => {
  try {
    const discount = await discountService.getDiscountById(req.params.id);
    if (!discount) {
      return res.status(404).json({ error: 'Discount not found' });
    }
    res.json(discount);
  } catch (error) {
    console.error('Get discount error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Create new discount
router.post('/', auth, [
  body('name').trim().isLength({ min: 1, max: 100 }),
  body('description').optional().trim().isLength({ max: 100 }),
  body('type').isIn(['percentage', 'fixed_amount', 'bottle_return']),
  body('value').isFloat({ min: 0 }),
  body('min_purchase_amount').optional().isFloat({ min: 0 }),
  body('max_discount_amount').optional().isFloat({ min: 0 }),
  body('start_date').optional().isISO8601(),
  body('end_date').optional().isISO8601(),
  body('usage_limit').optional().isInt({ min: 1 }),
  body('usage_per_customer').optional().isInt({ min: 1 }),
  body('applicable_to').isIn(['product_types', 'specific_products']).withMessage('applicable_to must be product_types'),
  body('product_types').optional().isArray().withMessage('product_types must be an array'),
  body('product_types.*').optional().isIn(['general', 'perfume', 'shoes', 'clothes', 'accessories']).withMessage('Invalid product type'),
  body('category_ids').optional().isArray().withMessage('category_ids must be an array'),
  body('category_ids.*').optional().isUUID().withMessage('Invalid category_id format'),
  body('customer_tiers').optional().isArray(),
  body('bottle_return_count').optional().isInt({ min: 1 }),
  body('is_active').optional().isBoolean(),
  body('auto_apply').optional().isBoolean(),
  body('discount_type').optional().isIn(['regular_discount', 'flash_sale', 'seasonal', 'annual', 'monthly', 'monthly_campaign']),
  body('allow_partial_payment').optional().isBoolean()
], async (req, res) => {
  try {
    // Debug logging for CREATE endpoint
    console.log('🔍 CREATE DISCOUNT - Request body:', req.body);
    
    const errors = validationResult(req);
    
    // Custom validation: require product_types or category_ids - MUST select one
    if (!req.body.applicable_to) {
      errors.errors = errors.errors || [];
      errors.errors.push({
        param: 'applicable_to',
        msg: 'applicable_to is required. Must be either product_types or categories',
        value: req.body.applicable_to
      });
    } else {
      if (req.body.applicable_to === 'product_types' || req.body.applicable_to === 'specific_products') {
        if (!req.body.product_types || !Array.isArray(req.body.product_types) || req.body.product_types.length === 0) {
          errors.errors = errors.errors || [];
          errors.errors.push({
            param: 'product_types',
            msg: 'At least one product type must be selected when applicable_to is product_types or specific_products',
            value: req.body.product_types
          });
        }
      } else if (req.body.applicable_to === 'categories' || req.body.applicable_to === 'specific_categories') {
        if (!req.body.category_ids || !Array.isArray(req.body.category_ids) || req.body.category_ids.length === 0) {
          errors.errors = errors.errors || [];
          errors.errors.push({
            param: 'category_ids',
            msg: 'At least one category must be selected when applicable_to is categories or specific_categories',
            value: req.body.category_ids
          });
        }
      } else if (req.body.applicable_to === 'all') {
        errors.errors = errors.errors || [];
        errors.errors.push({
          param: 'applicable_to',
          msg: 'Discounts must apply to either product_types or categories, not all products',
          value: req.body.applicable_to
        });
      }
    }
    
    if (!errors.isEmpty()) {
      console.log('❌ CREATE DISCOUNT - Validation errors:', errors.array());
      return res.status(400).json({ errors: errors.array() });
    }

    const discountData = {
      ...req.body,
      created_by: req.user.id
    };

    const result = await discountService.createDiscount(discountData);
    res.status(201).json(result);
  } catch (error) {
    console.error('Create discount error:', error);
    res.status(500).json({ error: error.message || 'Server error' });
  }
});

// Update discount
router.put('/:id', auth, [
  body('name').trim().isLength({ min: 1, max: 100 }),
  body('description').optional().trim().isLength({ max: 500 }),
  body('type').isIn(['percentage', 'fixed_amount', 'bottle_return']),
  body('value').isFloat({ min: 0 }),
  body('min_purchase_amount').optional().isFloat({ min: 0 }),
  body('max_discount_amount').optional().isFloat({ min: 0 }),
  body('start_date').optional().isISO8601(),
  body('end_date').optional().isISO8601(),
  body('usage_limit').optional().isInt({ min: 1 }),
  body('usage_per_customer').optional().isInt({ min: 1 }),
  body('applicable_to').isIn(['product_types', 'specific_products']).withMessage('applicable_to must be product_types'),
  body('product_types').optional().isArray().withMessage('product_types must be an array'),
  body('product_types.*').optional().isIn(['general', 'perfume', 'shoes', 'clothes', 'accessories']).withMessage('Invalid product type'),
  body('category_ids').optional().isArray().withMessage('category_ids must be an array'),
  body('category_ids.*').optional().isUUID().withMessage('Invalid category_id format'),
  body('customer_tiers').optional().isArray(),
  body('bottle_return_count').optional().isInt({ min: 1 }),
  body('is_active').optional().isBoolean(),
  body('auto_apply').optional().isBoolean(),
  body('discount_type').optional().isIn(['regular_discount', 'flash_sale', 'seasonal', 'annual', 'monthly', 'monthly_campaign']),
  body('allow_partial_payment').optional().isBoolean()
], async (req, res) => {
  try {
    // Debug logging
    console.log('🔍 UPDATE DISCOUNT - Request body:', req.body);
    console.log('🔍 UPDATE DISCOUNT - Discount ID:', req.params.id);
    
    const errors = validationResult(req);
    
    // Custom validation: require product_types - MUST select at least one product type
    if (!req.body.applicable_to || (req.body.applicable_to !== 'product_types' && req.body.applicable_to !== 'specific_products')) {
      errors.errors = errors.errors || [];
      errors.errors.push({
        param: 'applicable_to',
        msg: 'applicable_to must be product_types. Discounts can only apply to specific product types, not all products',
        value: req.body.applicable_to
      });
    }
    
    if (!req.body.product_types || !Array.isArray(req.body.product_types) || req.body.product_types.length === 0) {
      errors.errors = errors.errors || [];
      errors.errors.push({
        param: 'product_types',
        msg: 'At least one product type must be selected',
        value: req.body.product_types
      });
    }
    
    if (!errors.isEmpty()) {
      console.log('❌ UPDATE DISCOUNT - Validation errors:', errors.array());
      return res.status(400).json({ errors: errors.array() });
    }

    const result = await discountService.updateDiscount(req.params.id, req.body);
    res.json(result);
  } catch (error) {
    console.error('Update discount error:', error);
    res.status(500).json({ error: error.message || 'Server error' });
  }
});

// Delete discount
router.delete('/:id', auth, async (req, res) => {
  try {
    const result = await discountService.deleteDiscount(req.params.id);
    res.json(result);
  } catch (error) {
    console.error('Delete discount error:', error);
    res.status(500).json({ error: error.message || 'Server error' });
  }
});

// Get available discounts for customer
router.get('/available/:customerId', auth, async (req, res) => {
  try {
    const { customerId } = req.params;
    const { orderAmount = 0, orderItems = [] } = req.query;

    const discounts = await discountService.getAvailableDiscounts(
      customerId, 
      parseFloat(orderAmount), 
      orderItems
    );
    
    res.json({ discounts });
  } catch (error) {
    console.error('Get available discounts error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Validate discount eligibility
router.post('/validate', auth, [
  body('discount_id').isUUID(),
  body('customer_id').isUUID(),
  body('order_amount').isFloat({ min: 0 })
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { discount_id, customer_id, order_amount } = req.body;
    const validation = await discountService.validateDiscountEligibility(
      discount_id, 
      customer_id, 
      order_amount
    );
    
    res.json(validation);
  } catch (error) {
    console.error('Validate discount error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Apply discount to order
router.post('/apply', auth, [
  body('order_id').isUUID(),
  body('discount_id').isUUID(),
  body('customer_id').isUUID(),
  body('order_amount').isFloat({ min: 0 })
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { order_id, discount_id, customer_id, order_amount } = req.body;
    const result = await discountService.applyDiscount(
      order_id, 
      discount_id, 
      customer_id, 
      order_amount
    );
    
    res.json(result);
  } catch (error) {
    console.error('Apply discount error:', error);
    res.status(500).json({ error: error.message || 'Server error' });
  }
});

// Get discount statistics
router.get('/stats/overview', auth, async (req, res) => {
  try {
    const stats = await discountService.getDiscountStats();
    res.json(stats);
  } catch (error) {
    console.error('Get discount stats error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get discount applications for order
router.get('/applications/:orderId', auth, async (req, res) => {
  try {
    const applications = await discountService.getOrderDiscountApplications(req.params.orderId);
    res.json({ applications });
  } catch (error) {
    console.error('Get discount applications error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Business Rules Management

// Get business rules
router.get('/rules/business', auth, async (req, res) => {
  try {
    const { rule_type } = req.query;
    const rules = await discountService.getBusinessRules(rule_type);
    res.json({ rules });
  } catch (error) {
    console.error('Get business rules error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Update business rule
router.post('/rules/business', auth, [
  body('rule_key').trim().isLength({ min: 1 }),
  body('rule_value').notEmpty(),
  body('rule_type').isIn(['percentage', 'bottle_return', 'stacking', 'temporal', 'customer_tier']),
  body('description').optional().trim()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { rule_key, rule_value, rule_type, description } = req.body;
    const result = await discountService.updateBusinessRule(
      rule_key, 
      rule_value, 
      rule_type, 
      description
    );
    
    res.json(result);
  } catch (error) {
    console.error('Update business rule error:', error);
    res.status(500).json({ error: error.message || 'Server error' });
  }
});

// Campaign Management

// Get discount campaigns
router.get('/campaigns', auth, async (req, res) => {
  try {
    const campaigns = await database.all(`
      SELECT 
        dc.*,
        u.username as created_by_user,
        COUNT(d.id) as discount_count
      FROM discount_campaigns dc
      LEFT JOIN users u ON dc.created_by = u.id
      LEFT JOIN discounts d ON JSON_ARRAY_LENGTH(dc.discount_ids) > 0
      GROUP BY dc.id
      ORDER BY dc.created_at DESC
    `);
    
    res.json({ campaigns });
  } catch (error) {
    console.error('Get campaigns error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Create discount campaign
router.post('/campaigns', auth, [
  body('name').trim().isLength({ min: 1, max: 100 }),
  body('description').optional().trim(),
  body('type').isIn(['holiday', 'loyalty_tier', 'seasonal', 'special_event']),
  body('discount_ids').isArray(),
  body('start_date').isISO8601(),
  body('end_date').isISO8601(),
  body('target_audience').optional().isIn(['all', 'specific_tier', 'new_customers', 'returning_customers']),
  body('budget').optional().isFloat({ min: 0 }),
  body('is_active').optional().isBoolean()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const campaignId = uuidv4();
    const campaignData = {
      ...req.body,
      discount_ids: JSON.stringify(req.body.discount_ids),
      created_by: req.user.id
    };

    await database.run(`
      INSERT INTO discount_campaigns (
        id, name, description, type, discount_ids, start_date, end_date,
        target_audience, budget, is_active, created_by
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      campaignId, campaignData.name, campaignData.description, campaignData.type,
      campaignData.discount_ids, campaignData.start_date, campaignData.end_date,
      campaignData.target_audience, campaignData.budget, campaignData.is_active,
      campaignData.created_by
    ]);

    res.status(201).json({ campaign_id: campaignId });
  } catch (error) {
    console.error('Create campaign error:', error);
    res.status(500).json({ error: error.message || 'Server error' });
  }
});

// Calculate discount preview
router.post('/calculate', auth, [
  body('discount_id').isUUID(),
  body('order_amount').isFloat({ min: 0 })
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { discount_id, order_amount } = req.body;
    const discount = await discountService.getDiscountById(discount_id);
    
    if (!discount) {
      return res.status(404).json({ error: 'Discount not found' });
    }

    const discountAmount = discountService.calculateDiscountAmount(discount, order_amount);
    const finalAmount = orderAmount - discountAmount;

    res.json({
      original_amount: order_amount,
      discount_amount: discountAmount,
      final_amount: finalAmount,
      discount_percentage: discount.type === 'percentage' ? discount.value : null
    });
  } catch (error) {
    console.error('Calculate discount error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router; 