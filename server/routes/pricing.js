const express = require('express');
const router = express.Router();
const { auth } = require('../middleware/auth');
const pricingEngine = require('../services/pricingEngine');
const database = require('../database/database');

/**
 * @swagger
 * /api/pricing/calculate/bulk:
 *   post:
 *     summary: Calculate prices for multiple products
 *     description: Bulk pricing calculation for multiple products
 *     tags: [Pricing]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - product_ids
 *             properties:
 *               product_ids:
 *                 type: array
 *                 items:
 *                   type: string
 *                   format: uuid
 *                 description: Array of product IDs
 *               options:
 *                 type: object
 *                 description: Pricing options for all products
 *     responses:
 *       200:
 *         description: Bulk pricing calculated successfully
 *       400:
 *         description: Invalid request data
 *       401:
 *         description: Unauthorized
 */
router.post('/calculate/bulk', auth, async (req, res) => {
  try {
    const { product_ids, options = {} } = req.body;
    
    if (!product_ids || !Array.isArray(product_ids) || product_ids.length === 0) {
      return res.status(400).json({ error: 'Product IDs array is required' });
    }
    
    const pricing = await pricingEngine.calculateBulkPricing(product_ids, options);
    
    res.json(pricing);
  } catch (error) {
    console.error('Bulk pricing calculation error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

/**
 * @swagger
 * /api/pricing/calculate/{productId}:
 *   post:
 *     summary: Calculate product price using intelligent pricing engine
 *     description: Calculate optimal selling price based on costs, market factors, and business rules
 *     tags: [Pricing]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: productId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Product ID
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               strategy:
 *                 type: string
 *                 enum: [costPlus, marketBased, valueBased, dynamic, competitive]
 *                 description: Pricing strategy to use
 *               markup:
 *                 type: number
 *                 description: Custom markup percentage for cost-plus pricing
 *               positioning:
 *                 type: string
 *                 enum: [competitive, premium, economy]
 *                 description: Market positioning for competitive pricing
 *               location:
 *                 type: string
 *                 description: Location for tax calculations
 *     responses:
 *       200:
 *         description: Price calculated successfully
 *       400:
 *         description: Invalid request data
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Product not found
 */
router.post('/calculate/:productId', auth, async (req, res) => {
  try {
    const { productId } = req.params;
    const options = req.body;
    
    const pricing = await pricingEngine.calculateProductPrice(productId, options);
    
    res.json(pricing);
  } catch (error) {
    if (error.message.includes('Product not found')) {
      res.status(404).json({ error: error.message });
    } else {
      console.error('Pricing calculation error:', error);
      res.status(500).json({ error: 'Server error' });
    }
  }
});

/**
 * @swagger
 * /api/pricing/update/bulk:
 *   put:
 *     summary: Update prices for multiple products
 *     description: Bulk price update for multiple products
 *     tags: [Pricing]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - product_ids
 *             properties:
 *               product_ids:
 *                 type: array
 *                 items:
 *                   type: string
 *                   format: uuid
 *                 description: Array of product IDs
 *               options:
 *                 type: object
 *                 description: Pricing options for all products
 *               change_reason:
 *                 type: string
 *                 description: Reason for price changes
 *     responses:
 *       200:
 *         description: Product prices updated successfully
 *       207:
 *         description: Partial success, some updates failed
 *       400:
 *         description: Invalid request data
 *       401:
 *         description: Unauthorized
 */
router.put('/update/bulk', auth, async (req, res) => {
  try {
    const { product_ids, options = {}, change_reason } = req.body;
    
    // Validate product_ids
    if (!product_ids || !Array.isArray(product_ids) || product_ids.length === 0) {
      return res.status(400).json({ error: 'Product IDs array is required' });
    }
    
    // Validate each product ID is a valid UUID
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    const invalidIds = product_ids.filter(id => !uuidRegex.test(id));
    
    if (invalidIds.length > 0) {
      return res.status(400).json({ 
        error: 'Invalid product ID format', 
        invalid_ids: invalidIds,
        message: 'All product IDs must be valid UUIDs'
      });
    }
    
    const updateOptions = {
      ...options,
      calculated_by: req.user.id,
      change_reason: change_reason || 'Bulk pricing update'
    };
    
    const updatedProducts = await pricingEngine.updateProductPrices(product_ids, updateOptions);
    
    // Separate successful updates from errors
    const successfulUpdates = updatedProducts.filter(p => !p.error);
    const failedUpdates = updatedProducts.filter(p => p.error);
    
    res.status(failedUpdates.length > 0 ? 207 : 200).json({
      message: failedUpdates.length === 0 
        ? 'All product prices updated successfully' 
        : `Updated ${successfulUpdates.length} products, ${failedUpdates.length} failed`,
      successful_updates: successfulUpdates,
      failed_updates: failedUpdates
    });
  } catch (error) {
    console.error('Bulk price update error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

/**
 * @swagger
 * /api/pricing/update/{productId}:
 *   put:
 *     summary: Update product price based on pricing engine calculation
 *     description: Update product price and log the change
 *     tags: [Pricing]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: productId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Product ID
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               strategy:
 *                 type: string
 *                 enum: [costPlus, marketBased, valueBased, dynamic, competitive]
 *                 description: Pricing strategy to use
 *               change_reason:
 *                 type: string
 *                 description: Reason for price change
 *     responses:
 *       200:
 *         description: Product price updated successfully
 *       400:
 *         description: Invalid request data
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Product not found
 */
router.put('/update/:productId', auth, async (req, res) => {
  try {
    const { productId } = req.params;
    
    // Validate product ID is a valid UUID
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(productId)) {
      return res.status(400).json({ 
        error: 'Invalid product ID format',
        message: 'Product ID must be a valid UUID'
      });
    }
    
    const options = {
      ...req.body,
      calculated_by: req.user.id
    };
    
    const pricing = await pricingEngine.calculateProductPrice(productId, options);
    
    // Update the product price
    const updatedProduct = await pricingEngine.updateProductPrices([productId], options);
    
    res.json({
      message: 'Product price updated successfully',
      pricing: pricing,
      update: updatedProduct[0]
    });
  } catch (error) {
    if (error.message.includes('Product not found')) {
      res.status(404).json({ error: error.message });
    } else {
      console.error('Price update error:', error);
      res.status(500).json({ error: 'Server error' });
    }
  }
});

/**
 * @swagger
 * /api/pricing/strategies:
 *   get:
 *     summary: Get available pricing strategies
 *     description: Retrieve list of available pricing strategies and their descriptions
 *     tags: [Pricing]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Pricing strategies retrieved successfully
 *       401:
 *         description: Unauthorized
 */
router.get('/strategies', auth, async (req, res) => {
  try {
    const strategies = {
      costPlus: {
        name: 'Cost-Plus Pricing',
        description: 'Add a fixed markup percentage to the total cost',
        best_for: 'Standard products with predictable costs',
        advantages: ['Simple to implement', 'Guaranteed profit margin', 'Easy to justify'],
        disadvantages: ['May not reflect market value', 'Ignores competition', 'Can lead to over/under pricing']
      },
      marketBased: {
        name: 'Market-Based Pricing',
        description: 'Price based on market conditions and competition',
        best_for: 'Products in competitive markets',
        advantages: ['Market responsive', 'Competitive positioning', 'Customer acceptance'],
        disadvantages: ['Requires market research', 'May reduce profit margins', 'Market volatility risk']
      },
      valueBased: {
        name: 'Value-Based Pricing',
        description: 'Price based on perceived customer value',
        best_for: 'Premium products with unique features',
        advantages: ['Higher profit potential', 'Customer-focused', 'Differentiation'],
        disadvantages: ['Difficult to quantify', 'Requires customer research', 'Subjective']
      },
      dynamic: {
        name: 'Dynamic Pricing',
        description: 'Real-time pricing based on demand, time, and inventory',
        best_for: 'High-demand products with variable demand',
        advantages: ['Revenue optimization', 'Inventory management', 'Market responsiveness'],
        disadvantages: ['Complex implementation', 'Customer confusion', 'Requires real-time data']
      },
      competitive: {
        name: 'Competitive Pricing',
        description: 'Price relative to competitor prices',
        best_for: 'Products in price-sensitive markets',
        advantages: ['Market positioning', 'Customer price sensitivity', 'Competitive advantage'],
        disadvantages: ['Price wars risk', 'Reduced profit margins', 'Dependency on competitors']
      }
    };
    
    res.json(strategies);
  } catch (error) {
    console.error('Get strategies error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

/**
 * @swagger
 * /api/pricing/analysis/{productId}:
 *   get:
 *     summary: Get detailed pricing analysis for a product
 *     description: Comprehensive pricing analysis including cost breakdown, profit margins, and recommendations
 *     tags: [Pricing]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: productId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Product ID
 *     responses:
 *       200:
 *         description: Pricing analysis retrieved successfully
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Product not found
 */
router.get('/analysis/:productId', auth, async (req, res) => {
  try {
    const { productId } = req.params;
    
    // Get current pricing analysis
    const currentPricing = await pricingEngine.calculateProductPrice(productId, { strategy: 'costPlus' });
    
    // Get alternative pricing strategies for comparison
    const strategies = ['costPlus', 'marketBased', 'valueBased', 'dynamic', 'competitive'];
    const alternativePricing = {};
    
    for (const strategy of strategies) {
      try {
        const pricing = await pricingEngine.calculateProductPrice(productId, { strategy });
        alternativePricing[strategy] = {
          price: pricing.calculated_price,
          profit_margin: pricing.price_breakdown.profit_margin,
          markup: pricing.price_breakdown.markup
        };
      } catch (error) {
        alternativePricing[strategy] = { error: error.message };
      }
    }
    
    // Get historical price changes
    const priceHistory = await database.all(`
      SELECT old_price, new_price, change_reason, pricing_strategy, created_at
      FROM price_change_log
      WHERE product_id = ?
      ORDER BY created_at DESC
      LIMIT 10
    `, [productId]);
    
    const analysis = {
      product_id: productId,
      current_pricing: currentPricing,
      alternative_strategies: alternativePricing,
      price_history: priceHistory,
      recommendations: currentPricing.recommendations,
      market_insights: {
        demand_level: currentPricing.market_factors.demand_level,
        seasonal_factor: currentPricing.market_factors.seasonal_adjustment,
        competition_factor: currentPricing.market_factors.competition_factor
      }
    };
    
    res.json(analysis);
  } catch (error) {
    if (error.message.includes('Product not found')) {
      res.status(404).json({ error: error.message });
    } else {
      console.error('Pricing analysis error:', error);
      res.status(500).json({ error: 'Server error' });
    }
  }
});

/**
 * @swagger
 * /api/pricing/optimization:
 *   post:
 *     summary: Optimize pricing for maximum profitability
 *     description: Find optimal pricing strategy for maximum profit while maintaining market competitiveness
 *     tags: [Pricing]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - product_ids
 *             properties:
 *               product_ids:
 *                 type: array
 *                 items:
 *                   type: string
 *                   format: uuid
 *                 description: Array of product IDs to optimize
 *               constraints:
 *                 type: object
 *                 properties:
 *                   min_profit_margin:
 *                     type: number
 *                     description: Minimum profit margin percentage
 *                   max_price_increase:
 *                     type: number
 *                     description: Maximum price increase percentage
 *                   target_market_share:
 *                     type: number
 *                     description: Target market share percentage
 *     responses:
 *       200:
 *         description: Pricing optimization completed successfully
 *       400:
 *         description: Invalid request data
 *       401:
 *         description: Unauthorized
 */
router.post('/optimization', auth, async (req, res) => {
  try {
    const { product_ids, constraints = {} } = req.body;
    
    if (!product_ids || !Array.isArray(product_ids) || product_ids.length === 0) {
      return res.status(400).json({ error: 'Product IDs array is required' });
    }
    
    const optimizationResults = [];
    
    for (const productId of product_ids) {
      try {
        // Test different pricing strategies
        const strategies = ['costPlus', 'marketBased', 'valueBased', 'dynamic', 'competitive'];
        let bestStrategy = null;
        let bestProfit = 0;
        let bestPrice = 0;
        
        for (const strategy of strategies) {
          const pricing = await pricingEngine.calculateProductPrice(productId, { strategy });
          const profit = pricing.price_breakdown.markup;
          
          // Apply constraints
          const profitMargin = pricing.price_breakdown.profit_margin;
          const priceIncrease = ((pricing.calculated_price - pricing.base_cost) / pricing.base_cost) * 100;
          
          if (profitMargin >= (constraints.min_profit_margin || 10) &&
              priceIncrease <= (constraints.max_price_increase || 200)) {
            if (profit > bestProfit) {
              bestProfit = profit;
              bestStrategy = strategy;
              bestPrice = pricing.calculated_price;
            }
          }
        }
        
        if (bestStrategy) {
          optimizationResults.push({
            product_id: productId,
            recommended_strategy: bestStrategy,
            recommended_price: bestPrice,
            expected_profit: bestProfit,
            optimization_status: 'success'
          });
        } else {
          optimizationResults.push({
            product_id: productId,
            optimization_status: 'failed',
            reason: 'No strategy meets the specified constraints'
          });
        }
      } catch (error) {
        optimizationResults.push({
          product_id: productId,
          optimization_status: 'error',
          error: error.message
        });
      }
    }
    
    res.json({
      message: 'Pricing optimization completed',
      results: optimizationResults,
      summary: {
        total_products: product_ids.length,
        successful_optimizations: optimizationResults.filter(r => r.optimization_status === 'success').length,
        failed_optimizations: optimizationResults.filter(r => r.optimization_status === 'failed').length,
        errors: optimizationResults.filter(r => r.optimization_status === 'error').length
      }
    });
  } catch (error) {
    console.error('Pricing optimization error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
