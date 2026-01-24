const express = require('express');
const { v4: uuidv4 } = require('uuid');
const { body, validationResult } = require('express-validator');
const database = require('../database/database');
const PointsCalculator = require('../services/pointsCalculator');
const { auth, adminAuth } = require('../middleware/auth');

const router = express.Router();

// Get customer loyalty info
router.get('/customer/:id', auth, async (req, res) => {
  try {
    const customer = await database.get(`
      SELECT id, first_name, last_name, loyalty_points, loyalty_tier, total_spent, birthday, anniversary_date
      FROM customers WHERE id = ? AND is_active = true
    `, [req.params.id]);

    if (!customer) {
      return res.status(404).json({ error: 'Customer not found' });
    }

    // Get loyalty transaction history
    const transactions = await database.all(`
      SELECT * FROM loyalty_transactions 
      WHERE customer_id = ? 
      ORDER BY created_at DESC 
      LIMIT 20
    `, [req.params.id]);

    // Calculate tier benefits
    const tierBenefits = calculateTierBenefits(customer.loyalty_tier);

    res.json({
      customer,
      transactions,
      tier_benefits: tierBenefits
    });
  } catch (error) {
    console.error('Get customer loyalty error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Add loyalty points
router.post('/points/add', auth, [
  body('customer_id').notEmpty().withMessage('Customer ID is required'),
  body('points').isInt({ min: 1 }).withMessage('Valid points amount is required'),
  body('description').trim().notEmpty().withMessage('Description is required'),
  body('order_id').optional()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { customer_id, points, description, order_id } = req.body;

    // Get customer current points
    const customer = await database.get(`
      SELECT loyalty_points, loyalty_tier FROM customers WHERE id = ? AND is_active = true
    `, [customer_id]);

    if (!customer) {
      return res.status(404).json({ error: 'Customer not found' });
    }

    const newPoints = customer.loyalty_points + points;
    const newTier = calculateLoyaltyTier(newPoints);

    // Start transaction
    const transactionId = uuidv4();

    // Add loyalty transaction
    await database.run(`
      INSERT INTO loyalty_transactions (id, customer_id, transaction_type, points, description, order_id)
      VALUES (?, ?, ?, ?, ?, ?)
    `, [transactionId, customer_id, 'earned', points, description, order_id]);

    // Update customer points and tier
    await database.run(`
      UPDATE customers 
      SET loyalty_points = ?, loyalty_tier = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `, [newPoints, newTier, customer_id]);

    res.json({
      message: 'Loyalty points added successfully',
      transaction: {
        id: transactionId,
        points_added: points,
        new_total: newPoints,
        new_tier: newTier
      }
    });
  } catch (error) {
    console.error('Add loyalty points error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Redeem loyalty points
router.post('/points/redeem', auth, [
  body('customer_id').notEmpty().withMessage('Customer ID is required'),
  body('points').isInt({ min: 1 }).withMessage('Valid points amount is required'),
  body('description').trim().notEmpty().withMessage('Description is required'),
  body('order_id').optional()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { customer_id, points, description, order_id } = req.body;

    // Get customer current points
    const customer = await database.get(`
      SELECT loyalty_points, loyalty_tier FROM customers WHERE id = ? AND is_active = true
    `, [customer_id]);

    if (!customer) {
      return res.status(404).json({ error: 'Customer not found' });
    }

    if (customer.loyalty_points < points) {
      return res.status(400).json({ error: 'Insufficient loyalty points' });
    }

    const newPoints = customer.loyalty_points - points;
    const newTier = calculateLoyaltyTier(newPoints);

    // Start transaction
    const transactionId = uuidv4();

    // Add loyalty transaction
    await database.run(`
      INSERT INTO loyalty_transactions (id, customer_id, transaction_type, points, description, order_id)
      VALUES (?, ?, ?, ?, ?, ?)
    `, [transactionId, customer_id, 'redeemed', -points, description, order_id]);

    // Update customer points and tier
    await database.run(`
      UPDATE customers 
      SET loyalty_points = ?, loyalty_tier = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `, [newPoints, newTier, customer_id]);

    res.json({
      message: 'Loyalty points redeemed successfully',
      transaction: {
        id: transactionId,
        points_redeemed: points,
        new_total: newPoints,
        new_tier: newTier
      }
    });
  } catch (error) {
    console.error('Redeem loyalty points error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Process bottle returns
router.post('/bottle-returns', auth, [
  body('customer_id').notEmpty().withMessage('Customer ID is required'),
  body('quantity').isInt({ min: 1 }).withMessage('Valid quantity is required'),
  body('bottle_size').trim().notEmpty().withMessage('Bottle size is required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { customer_id, quantity, bottle_size } = req.body;

    // Get customer info
    const customer = await database.get(`
      SELECT id, first_name, last_name FROM customers WHERE id = ? AND is_active = true
    `, [customer_id]);

    if (!customer) {
      return res.status(404).json({ error: 'Customer not found' });
    }

    // Calculate discount based on bottle returns (5 bottles = 10% discount)
    const discountPercent = Math.floor(quantity / 5) * 10;
    const discountAmount = 0; // This will be calculated when applied to an order

    const returnId = uuidv4();

    // Record bottle return
    await database.run(`
      INSERT INTO bottle_returns (
        id, customer_id, quantity, bottle_size, return_date, processed_by, discount_applied
      ) VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP, ?, ?)
    `, [returnId, customer_id, quantity, bottle_size, req.user.id, discountAmount]);

    // Add loyalty points for bottle returns (1 point per bottle)
    const pointsEarned = quantity;
    const transactionId = uuidv4();

    await database.run(`
      INSERT INTO loyalty_transactions (id, customer_id, transaction_type, points, description)
      VALUES (?, ?, ?, ?, ?)
    `, [transactionId, customer_id, 'earned', pointsEarned, `Bottle return: ${quantity} ${bottle_size} bottles`]);

    // Update customer points
    const currentPoints = await database.get(`
      SELECT loyalty_points FROM customers WHERE id = ?
    `, [customer_id]);

    const newPoints = currentPoints.loyalty_points + pointsEarned;
    const newTier = calculateLoyaltyTier(newPoints);

    await database.run(`
      UPDATE customers 
      SET loyalty_points = ?, loyalty_tier = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `, [newPoints, newTier, customer_id]);

    res.json({
      message: 'Bottle return processed successfully',
      return: {
        id: returnId,
        quantity,
        bottle_size,
        points_earned: pointsEarned,
        discount_percent: discountPercent,
        new_total_points: newPoints,
        new_tier: newTier
      }
    });
  } catch (error) {
    console.error('Process bottle return error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get bottle returns history
router.get('/bottle-returns', auth, async (req, res) => {
  try {
    const returns = await database.all(`
      SELECT br.*, c.first_name, c.last_name, u.first_name as processed_by_first_name, u.last_name as processed_by_last_name
      FROM bottle_returns br
      JOIN customers c ON br.customer_id = c.id
      JOIN users u ON br.processed_by = u.id
      ORDER BY br.return_date DESC
      LIMIT 100
    `);

    res.json({ returns });
  } catch (error) {
    console.error('Get bottle returns error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get loyalty statistics
router.get('/stats', auth, async (req, res) => {
  try {
    // Customer tier distribution
    const tierDistribution = await database.all(`
      SELECT loyalty_tier, COUNT(*) as customer_count
      FROM customers 
      WHERE is_active = true
      GROUP BY loyalty_tier
      ORDER BY customer_count DESC
    `);

    // Total points in system
    const totalPoints = await database.get(`
      SELECT SUM(loyalty_points) as total_points FROM customers WHERE is_active = true
    `);

    // Recent loyalty transactions (skip if table doesn't exist)
    let recentTransactions = [];
    try {
      recentTransactions = await database.all(`
        SELECT lt.*, c.first_name, c.last_name
        FROM loyalty_transactions lt
        JOIN customers c ON lt.customer_id = c.id
        ORDER BY lt.created_at DESC
        LIMIT 20
      `);
    } catch (transactionError) {
      console.warn('Loyalty transactions query failed (table may not exist):', transactionError.message);
      recentTransactions = [];
    }

    // Bottle returns summary (skip if table doesn't exist)
    let bottleReturns = { total_returns: 0, total_bottles_returned: 0, total_discounts_given: 0 };
    try {
      bottleReturns = await database.get(`
        SELECT 
          COUNT(*) as total_returns,
          SUM(quantity) as total_bottles_returned,
          SUM(discount_applied) as total_discounts_given
        FROM bottle_returns
        WHERE return_date >= NOW() - INTERVAL '30 days'
      `);
    } catch (returnsError) {
      console.warn('Bottle returns query failed (table may not exist):', returnsError.message);
      bottleReturns = { total_returns: 0, total_bottles_returned: 0, total_discounts_given: 0 };
    }

    res.json({
      tier_distribution: tierDistribution,
      total_points: totalPoints.total_points || 0,
      recent_transactions: recentTransactions,
      bottle_returns: bottleReturns
    });
  } catch (error) {
    console.error('Get loyalty stats error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get tier information and requirements
router.get('/tiers', auth, async (req, res) => {
  try {
    const tierInfo = PointsCalculator.getTierInfo();
    res.json({ tiers: tierInfo });
  } catch (error) {
    console.error('Get tier info error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Calculate potential points for a future purchase
router.post('/calculate-points', auth, [
  body('order_amount').isFloat({ min: 0 }).withMessage('Valid order amount is required'),
  body('customer_tier').optional().isString().withMessage('Valid customer tier is required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { order_amount, customer_tier = 'bronze' } = req.body;
    
    const potentialPoints = PointsCalculator.calculatePotentialPoints(order_amount, customer_tier);
    const tierInfo = PointsCalculator.getTierInfo();
    
    res.json({
      order_amount: order_amount,
      customer_tier: customer_tier,
      potential_points: potentialPoints,
      tier_multiplier: PointsCalculator.getTierMultiplier(customer_tier),
      tier_benefits: tierInfo[customer_tier] || tierInfo.bronze
    });
  } catch (error) {
    console.error('Calculate points error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get customer progress to next tier
router.get('/progress/:customerId', auth, async (req, res) => {
  try {
    const { customerId } = req.params;
    
    const customer = await database.get(`
      SELECT loyalty_points, loyalty_tier FROM customers WHERE id = ?
    `, [customerId]);

    if (!customer) {
      return res.status(404).json({ error: 'Customer not found' });
    }

    const progress = PointsCalculator.getPointsToNextTier(customer.loyalty_points);
    const tierInfo = PointsCalculator.getTierInfo();
    
    res.json({
      current_tier: customer.loyalty_tier,
      current_points: customer.loyalty_points,
      progress: progress,
      current_tier_info: tierInfo[customer.loyalty_tier] || tierInfo.bronze
    });
  } catch (error) {
    console.error('Get customer progress error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Helper function to calculate loyalty tier
function calculateLoyaltyTier(points) {
  if (points >= 5000) return 'vip';
  if (points >= 2000) return 'platinum';
  if (points >= 1000) return 'gold';
  if (points >= 500) return 'silver';
  return 'bronze';
}

// Helper function to calculate tier benefits
function calculateTierBenefits(tier) {
  const benefits = {
    bronze: {
      discount_percent: 5,
      points_multiplier: 1.0,
      free_shipping: false,
      birthday_bonus: 50
    },
    silver: {
      discount_percent: 10,
      points_multiplier: 1.2,
      free_shipping: true,
      birthday_bonus: 100
    },
    gold: {
      discount_percent: 15,
      points_multiplier: 1.5,
      free_shipping: true,
      birthday_bonus: 200,
      exclusive_offers: true
    },
    platinum: {
      discount_percent: 25,
      points_multiplier: 2.0,
      free_shipping: true,
      birthday_bonus: 300,
      exclusive_offers: true,
      priority_support: true
    },
    vip: {
      discount_percent: 40,
      points_multiplier: 3.0,
      free_shipping: true,
      birthday_bonus: 500,
      exclusive_offers: true,
      priority_support: true,
      personal_shopper: true
    }
  };

  return benefits[tier] || benefits.bronze;
}

module.exports = router; 