const express = require('express');
const router = express.Router();
const { auth, adminAuth } = require('../middleware/auth');
const inventoryService = require('../services/inventoryService');
const { body, validationResult } = require('express-validator');
const database = require('../database/database');

/*
 * //@swagger
 * /api/inventory/products/{productId}/stock:
 *   get:
 *     summary: Get product stock levels
 *     description: Retrieve current, reserved, and available stock for a product
 *     tags: [Inventory]
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
 *         description: Product stock information retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 id:
 *                   type: string
 *                   format: uuid
 *                 name:
 *                   type: string
 *                 current_stock:
 *                   type: integer
 *                 reserved_stock:
 *                   type: integer
 *                 available_stock:
 *                   type: integer
 *                 min_stock_level:
 *                   type: integer
 *                 reorder_point:
 *                   type: integer
 *       404:
 *         description: Product not found
 *       401:
 *         description: Unauthorized
 */
router.get('/products/:productId/stock', auth, async (req, res) => {
  try {
    const { productId } = req.params;
    const stock = await inventoryService.getProductStock(productId);

    res.json(stock);
  } catch (error) {
    if (error.message === 'Product not found') {
      res.status(404).json({ error: 'Product not found' });
    } else {
      console.error('Get product stock error:', error);
      res.status(500).json({ error: 'Server error' });
    }
  }
});

/**
 * @swagger
 * /api/inventory/products/{productId}/available-quantity:
 *   get:
 *     summary: Get available quantity for product assignment
 *     tags: [Inventory]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: productId
 *         required: true
 *         schema:
 *           type: string
 *         description: Product ID
 *     responses:
 *       200:
 *         description: Available quantity information
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 product_id:
 *                   type: string
 *                 product_name:
 *                   type: string
 *                 global_stock:
 *                   type: integer
 *                 total_assigned:
 *                   type: integer
 *                 available_quantity:
 *                   type: integer
 *       404:
 *         description: Product not found
 *       401:
 *         description: Unauthorized
 */
router.get('/products/:productId/available-quantity', auth, async (req, res) => {
  try {
    const { productId } = req.params;

    // Validate product exists and get current stock
    const product = await database.get('SELECT id, name, current_stock FROM products WHERE id = ? AND is_active = 1', [productId]);

    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }

    // Calculate total assigned quantity across all locations
    const totalAssigned = await database.get(
      `SELECT 
        COALESCE((SELECT SUM(quantity) FROM shop_inventory WHERE product_id = ?), 0) +
        COALESCE((SELECT SUM(quantity) FROM warehouse_inventory WHERE product_id = ?), 0) as total_assigned`,
      [productId, productId]
    );

    const assignedAmount = totalAssigned.total_assigned || 0;

    // Since current_stock is now reduced when assignments are made,
    // the available quantity is simply the current_stock itself
    const availableQuantity = product.current_stock;

    const response = {
      product_id: productId,
      product_name: product.name,
      global_stock: product.current_stock,
      total_assigned: assignedAmount,
      available_quantity: Math.max(0, availableQuantity) // Ensure non-negative
    };

    res.json(response);
  } catch (error) {
    console.error('Get available quantity error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

/**
 * //@swagger
 * /api/inventory/products/stock/batch:
 *   post:
 *     summary: Get stock levels for multiple products
 *     description: Retrieve stock information for multiple products in a single request
 *     tags: [Inventory]
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
 *     responses:
 *       200:
 *         description: Stock information retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   id:
 *                     type: string
 *                     format: uuid
 *                   name:
 *                     type: string
 *                   current_stock:
 *                     type: integer
 *                   reserved_stock:
 *                     type: integer
 *                   available_stock:
 *                     type: integer
 *       400:
 *         description: Invalid request data
 *       401:
 *         description: Unauthorized
 */
router.post('/products/stock/batch', auth, [
  body('product_ids').isArray().withMessage('Product IDs must be an array'),
  body('product_ids.*').isUUID().withMessage('Invalid product ID format')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { product_ids } = req.body;
    const stock = await inventoryService.getMultipleProductStock(product_ids);

    res.json(stock);
  } catch (error) {
    console.error('Get multiple product stock error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

/**
 * //@swagger
 * /api/inventory/validate-stock:
 *   post:
 *     summary: Validate stock availability for order items
 *     description: Check if sufficient stock is available for order fulfillment
 *     tags: [Inventory]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - items
 *             properties:
 *               items:
 *                 type: array
 *                 items:
 *                   type: object
 *                   required:
 *                     - product_id
 *                     - quantity
 *                   properties:
 *                     product_id:
 *                       type: string
 *                       format: uuid
 *                     quantity:
 *                       type: integer
 *                       minimum: 1
 *     responses:
 *       200:
 *         description: Stock validation completed successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 all_sufficient:
 *                   type: boolean
 *                 results:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       product_id:
 *                         type: string
 *                         format: uuid
 *                       product_name:
 *                         type: string
 *                       requested:
 *                         type: integer
 *                       available:
 *                         type: integer
 *                       sufficient:
 *                         type: boolean
 *                       message:
 *                         type: string
 *       400:
 *         description: Invalid request data
 *       401:
 *         description: Unauthorized
 */
router.post('/validate-stock', auth, [
  body('items').isArray().withMessage('Items must be an array'),
  body('items.*.product_id').isUUID().withMessage('Invalid product ID format'),
  body('items.*.quantity').isInt({ min: 1 }).withMessage('Quantity must be a positive integer')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { items } = req.body;
    const validation = await inventoryService.validateStockAvailability(items);

    res.json(validation);
  } catch (error) {
    console.error('Validate stock availability error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

/**
 * //@swagger
 * /api/inventory/reserve-stock:
 *   post:
 *     summary: Reserve stock for an order
 *     description: Reserve stock items for order fulfillment
 *     tags: [Inventory]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - order_id
 *               - items
 *             properties:
 *               order_id:
 *                 type: string
 *                 format: uuid
 *               items:
 *                 type: array
 *                 items:
 *                   type: object
 *                   required:
 *                     - product_id
 *                     - quantity
 *                   properties:
 *                     product_id:
 *                       type: string
 *                       format: uuid
 *                     quantity:
 *                       type: integer
 *                       minimum: 1
 *     responses:
 *       200:
 *         description: Stock reserved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 order_id:
 *                   type: string
 *                   format: uuid
 *                 reservations:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: string
 *                         format: uuid
 *                       product_id:
 *                         type: string
 *                         format: uuid
 *                       quantity:
 *                         type: integer
 *                       expiry_date:
 *                         type: string
 *                         format: date-time
 *       400:
 *         description: Invalid request data or insufficient stock
 *       401:
 *         description: Unauthorized
 */
router.post('/reserve-stock', auth, [
  body('order_id').isUUID().withMessage('Invalid order ID format'),
  body('items').isArray().withMessage('Items must be an array'),
  body('items.*.product_id').isUUID().withMessage('Invalid product ID format'),
  body('items.*.quantity').isInt({ min: 1 }).withMessage('Quantity must be a positive integer')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { order_id, items } = req.body;
    const result = await inventoryService.reserveStock(order_id, items);

    res.json(result);
  } catch (error) {
    if (error.message.includes('Insufficient stock')) {
      res.status(400).json({ error: error.message });
    } else {
      console.error('Reserve stock error:', error);
      res.status(500).json({ error: 'Server error' });
    }
  }
});

/**
 * //@swagger
 * /api/inventory/release-stock:
 *   post:
 *     summary: Release reserved stock for an order
 *     description: Release stock reservations when an order is cancelled or modified
 *     tags: [Inventory]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - order_id
 *             properties:
 *               order_id:
 *                 type: string
 *                 format: uuid
 *     responses:
 *       200:
 *         description: Stock released successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 order_id:
 *                   type: string
 *                   format: uuid
 *                 reservations_released:
 *                   type: integer
 *                 total_released:
 *                   type: integer
 *       400:
 *         description: Invalid request data
 *       401:
 *         description: Unauthorized
 */
router.post('/release-stock', auth, [
  body('order_id').isUUID().withMessage('Invalid order ID format')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { order_id } = req.body;
    const result = await inventoryService.releaseReservedStock(order_id);

    res.json(result);
  } catch (error) {
    console.error('Release reserved stock error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

/**
 * //@swagger
 * /api/inventory/fulfill-order:
 *   post:
 *     summary: Fulfill order and update inventory
 *     description: Process order fulfillment and update actual stock levels
 *     tags: [Inventory]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - order_id
 *             properties:
 *               order_id:
 *                 type: string
 *                   format: uuid
 *     responses:
 *       200:
 *         description: Order fulfilled successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 order_id:
 *                   type: string
 *                   format: uuid
 *                 items_fulfilled:
 *                   type: integer
 *                 total_quantity:
 *                   type: integer
 *                 fulfillment_details:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       product_id:
 *                         type: string
 *                         format: uuid
 *                       product_name:
 *                         type: string
 *                       quantity:
 *                         type: integer
 *                       previous_stock:
 *                         type: integer
 *                       new_stock:
 *                         type: integer
 *       400:
 *         description: Invalid request data
 *       401:
 *         description: Unauthorized
 */
router.post('/fulfill-order', auth, [
  body('order_id').isUUID().withMessage('Invalid order ID format')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { order_id } = req.body;
    const result = await inventoryService.fulfillOrder(order_id);

    res.json(result);
  } catch (error) {
    console.error('Fulfill order error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

/**
 * //@swagger
 * /api/inventory/alerts/low-stock:
 *   get:
 *     summary: Get low stock alerts
 *     description: Retrieve products that are below minimum stock levels
 *     tags: [Inventory]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Low stock alerts retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   id:
 *                     type: string
 *                     format: uuid
 *                   name:
 *                     type: string
 *                   current_stock:
 *                     type: integer
 *                   reserved_stock:
 *                     type: integer
 *                   available_stock:
 *                     type: integer
 *                   min_stock_level:
 *                     type: integer
 *                   reorder_point:
 *                     type: integer
 *                   alert_level:
 *                     type: string
 *                     enum: [warning, critical]
 *                   days_remaining:
 *                     type: integer
 *       401:
 *         description: Unauthorized
 */
router.get('/alerts/low-stock', auth, async (req, res) => {
  try {
    const alerts = await inventoryService.getLowStockAlerts();
    res.json(alerts);
  } catch (error) {
    console.error('Get low stock alerts error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

/**
 * //@swagger
 * /api/inventory/summary:
 *   get:
 *     summary: Get inventory summary
 *     description: Retrieve overall inventory statistics and recent activity
 *     tags: [Inventory]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Inventory summary retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 summary:
 *                   type: object
 *                   properties:
 *                     total_products:
 *                       type: integer
 *                     total_current_stock:
 *                       type: integer
 *                     total_reserved_stock:
 *                       type: integer
 *                     total_available_stock:
 *                       type: integer
 *                     low_stock_count:
 *                       type: integer
 *                     critical_stock_count:
 *                       type: integer
 *                 recent_activity:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       transaction_type:
 *                         type: string
 *                       count:
 *                         type: integer
 *                       total_quantity:
 *                         type: integer
 *                 last_updated:
 *                   type: string
 *                   format: date-time
 *       401:
 *         description: Unauthorized
 */
router.get('/summary', auth, async (req, res) => {
  try {
    const summary = await inventoryService.getInventorySummary();
    res.json(summary);
  } catch (error) {
    console.error('Get inventory summary error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

/**
 * //@swagger
 * /api/inventory/transactions:
 *   get:
 *     summary: Get inventory transaction history
 *     description: Retrieve inventory transaction history for products
 *     tags: [Inventory]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: product_id
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Filter by product ID
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 100
 *         description: Maximum number of transactions to return
 *     responses:
 *       200:
 *         description: Transaction history retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   id:
 *                     type: string
 *                     format: uuid
 *                   product_id:
 *                     type: string
 *                     format: uuid
 *                   product_name:
 *                     type: string
 *                   sku:
 *                     type: string
 *                   transaction_type:
 *                     type: string
 *                   quantity:
 *                     type: integer
 *                   previous_stock:
 *                     type: integer
 *                   new_stock:
 *                     type: integer
 *                   reference_id:
 *                     type: string
 *                   reference_type:
 *                     type: string
 *                   notes:
 *                     type: string
 *                   created_at:
 *                     type: string
 *                     format: date-time
 *       401:
 *         description: Unauthorized
 */
router.get('/transactions', auth, async (req, res) => {
  try {
    const { product_id, limit = 100 } = req.query;
    const transactions = await inventoryService.getTransactionHistory(product_id, parseInt(limit));
    res.json(transactions);
  } catch (error) {
    console.error('Get transaction history error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

/**
 * //@swagger
 * /api/inventory/products/{productId}/adjust-stock:
 *   post:
 *     summary: Adjust product stock levels
 *     description: Manually adjust product stock levels for inventory corrections
 *     tags: [Inventory]
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
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - adjustment_type
 *               - quantity
 *               - reason
 *             properties:
 *               adjustment_type:
 *                 type: string
 *                 enum: [add, subtract, set]
 *                 description: Type of stock adjustment
 *               quantity:
 *                 type: integer
 *                 description: Quantity to adjust
 *               reason:
 *                 type: string
 *                 description: Reason for adjustment
 *               reference_id:
 *                 type: string
 *                 format: uuid
 *                 description: Reference ID for the adjustment
 *               reference_type:
 *                 type: string
 *                 description: Type of reference
 *     responses:
 *       200:
 *         description: Stock adjusted successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 product_id:
 *                   type: string
 *                   format: uuid
 *                 adjustment_type:
 *                   type: string
 *                 quantity:
 *                   type: integer
 *                 previous_stock:
 *                   type: integer
 *                 new_stock:
 *                   type: integer
 *                 reason:
 *                   type: string
 *       400:
 *         description: Invalid request data or insufficient stock
 *       401:
 *         description: Unauthorized
 */
router.post('/products/:productId/adjust-stock', auth, [
  body('adjustment_type').isIn(['add', 'subtract', 'set']).withMessage('Invalid adjustment type'),
  body('quantity').isInt({ min: 1 }).withMessage('Quantity must be a positive integer'),
  body('reason').notEmpty().withMessage('Reason is required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { productId } = req.params;
    const adjustmentData = req.body;

    const result = await inventoryService.updateProductStock(productId, adjustmentData);
    res.json(result);
  } catch (error) {
    if (error.message.includes('Insufficient available stock')) {
      res.status(400).json({ error: error.message });
    } else {
      console.error('Adjust product stock error:', error);
      res.status(500).json({ error: 'Server error' });
    }
  }
});

/**
 * //@swagger
 * /api/inventory/cleanup-reservations:
 *   post:
 *     summary: Clean up expired reservations
 *     description: Remove expired stock reservations and release stock
 *     tags: [Inventory]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Expired reservations cleaned up successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 reservations_cleaned:
 *                   type: integer
 *                 total_stock_released:
 *                   type: integer
 *       401:
 *         description: Unauthorized
 */
router.post('/cleanup-reservations', auth, async (req, res) => {
  try {
    const result = await inventoryService.cleanupExpiredReservations();
    res.json(result);
  } catch (error) {
    console.error('Cleanup expired reservations error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

/**
 * //@swagger
 * /api/inventory/levels:
 *   get:
 *     summary: Get inventory levels
 *     description: Retrieve inventory levels with filtering options
 *     tags: [Inventory]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: location_type
 *         schema:
 *           type: string
 *         description: Type of location (shop, warehouse, etc.)
 *       - in: query
 *         name: location_id
 *         schema:
 *           type: string
 *         description: Specific location ID
 *       - in: query
 *         name: low_stock
 *         schema:
 *           type: boolean
 *         description: Filter for low stock items
 *       - in: query
 *         name: out_of_stock
 *         schema:
 *           type: boolean
 *         description: Filter for out of stock items
 *       - in: query
 *         name: category
 *         schema:
 *           type: string
 *         description: Category filter
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search term for product names
 *     responses:
 *       200:
 *         description: Inventory levels retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 products:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: string
 *                         format: uuid
 *                       name:
 *                         type: string
 *                       sku:
 *                         type: string
 *                       stock_quantity:
 *                         type: integer
 *                       min_stock_level:
 *                         type: integer
 *                       price:
 *                         type: number
 *                       category:
 *                         type: string
 *       401:
 *         description: Unauthorized
 */
router.get('/levels', auth, async (req, res) => {
  try {
    const { location_type, location_id, low_stock, out_of_stock, category, search, page = 1, limit = 20 } = req.query;

    console.log('Inventory levels request:', { location_type, location_id, user: req.user });

    // Managers can see all shops' stock levels (same as admins)
    let effectiveLocationId = location_id;
    let effectiveLocationType = location_type;

    // Build the main query to get stock levels from shop_inventory and warehouse_inventory
    let stockQuery = '';
    let stockParams = [];
    let whereConditions = [];

    if (search) {
      whereConditions.push('(p.name LIKE ? OR p.sku LIKE ?)');
      stockParams.push(`%${search}%`, `%${search}%`);
    }

    if (category) {
      // Filter by category ID (UUID)
      whereConditions.push('c.id = ?');
      stockParams.push(category);
    }

    // If specific location is requested
    // Use INNER JOIN for categories when filtering by category, otherwise LEFT JOIN
    const categoryJoin = category ? 'INNER JOIN' : 'LEFT JOIN';

    if (effectiveLocationType && effectiveLocationId && effectiveLocationId !== 'all') {
      if (effectiveLocationType === 'shop') {
        stockQuery = `
          SELECT 
            si.id,
            p.id as product_id,
            p.name as product_name,
            p.sku,
            p.price,
            p.currency,
            p.current_stock as global_stock,
            p.product_type,
            p.size,
            si.quantity,
            si.min_stock_level,
            si.max_stock_level,
            'shop' as location_type,
            si.shop_id as location_id,
            s.name as location_name,
            c.name as category_name
          FROM shop_inventory si
          JOIN products p ON si.product_id = p.id
          JOIN shops s ON si.shop_id = s.id
          ${categoryJoin} product_categories pc ON p.id = pc.product_id
          ${categoryJoin} categories c ON pc.category_id = c.id
          WHERE si.shop_id = ? AND p.is_active = 1
        `;
        stockParams.unshift(effectiveLocationId);
      } else if (effectiveLocationType === 'warehouse') {
        stockQuery = `
          SELECT 
            wi.id,
            p.id as product_id,
            p.name as product_name,
            p.sku,
            p.price,
            p.currency,
            p.product_type,
            p.size,
            wi.quantity,
            wi.min_stock_level,
            wi.max_stock_level,
            'warehouse' as location_type,
            wi.warehouse_id as location_id,
            COALESCE(w.name, 'Unknown Warehouse') as location_name,
            c.name as category_name
          FROM warehouse_inventory wi
          JOIN products p ON wi.product_id = p.id
          JOIN warehouses w ON wi.warehouse_id = w.id
          ${categoryJoin} product_categories pc ON p.id = pc.product_id
          ${categoryJoin} categories c ON pc.category_id = c.id
          WHERE wi.warehouse_id = ? AND p.is_active = 1
        `;
        stockParams.unshift(effectiveLocationId);
      }
    } else {
      // For admins and managers, show individual shop assignments
      // This allows seeing which specific shops have stock for each product
      // Get all stock levels from shops only
      // Managers can see all shops (same as admins)
      // Use INNER JOIN for categories when filtering by category, otherwise LEFT JOIN
      const categoryJoin = category ? 'INNER JOIN' : 'LEFT JOIN';
      stockQuery = `
        SELECT 
          si.id,
          p.id as product_id,
          p.name as product_name,
          p.sku,
          p.price,
          p.currency,
          p.current_stock as global_stock,
          p.product_type,
          p.size,
          si.quantity,
          si.min_stock_level,
          si.max_stock_level,
          'shop' as location_type,
          si.shop_id as location_id,
          COALESCE(s.name, 'Unknown Shop') as location_name,
          c.name as category_name
        FROM shop_inventory si
        JOIN products p ON si.product_id = p.id
        JOIN shops s ON si.shop_id = s.id
        ${categoryJoin} product_categories pc ON p.id = pc.product_id
        ${categoryJoin} categories c ON pc.category_id = c.id
        WHERE p.is_active = 1
      `;
    }

    // Add search and category filters
    if (whereConditions.length > 0) {
      const whereClause = whereConditions.join(' AND ');
      if (stockQuery.includes('UNION ALL')) {
        // For UNION queries, we need to add WHERE to both parts
        stockQuery = stockQuery.replace(/WHERE p\.is_active = 1/g, `WHERE p.is_active = 1 AND (${whereClause})`);
      } else if (stockQuery.includes('GROUP BY')) {
        // For aggregated admin query, add to WHERE clause before GROUP BY
        stockQuery = stockQuery.replace(/WHERE p\.is_active = 1/, `WHERE p.is_active = 1 AND (${whereClause})`);
      } else {
        stockQuery += ` AND (${whereClause})`;
      }
    }

    // Add stock level filters
    if (low_stock === 'true') {
      if (stockQuery.includes('GROUP BY')) {
        // For aggregated query, modify HAVING clause
        stockQuery = stockQuery.replace(/HAVING COALESCE\(SUM\(si\.quantity\), 0\) > 0/, `HAVING COALESCE(SUM(si.quantity), 0) > 0 AND COALESCE(SUM(si.quantity), 0) <= min_stock_level`);
      } else if (stockQuery.includes('UNION ALL')) {
        stockQuery += ' AND si.quantity <= si.min_stock_level';
      } else {
        stockQuery += ' AND quantity <= min_stock_level';
      }
    }

    if (out_of_stock === 'true') {
      if (stockQuery.includes('GROUP BY')) {
        // For aggregated query, modify HAVING clause
        stockQuery = stockQuery.replace(/HAVING COALESCE\(SUM\(si\.quantity\), 0\) > 0/, `HAVING COALESCE(SUM(si.quantity), 0) = 0`);
      } else if (stockQuery.includes('UNION ALL')) {
        stockQuery += ' AND si.quantity = 0';
      } else {
        stockQuery += ' AND quantity = 0';
      }
    }

    // Add ordering and pagination - prioritize out of stock items first
    // For GROUP BY queries, use the aggregate function; otherwise use the column alias
    if (stockQuery.includes('GROUP BY')) {
      stockQuery += ' ORDER BY CASE WHEN COALESCE(SUM(si.quantity), 0) = 0 THEN 0 ELSE 1 END, product_name ASC';
    } else {
      stockQuery += ' ORDER BY CASE WHEN quantity = 0 THEN 0 ELSE 1 END, product_name ASC';
    }

    const offset = ((parseInt(page) || 1) - 1) * (parseInt(limit) || 20);
    stockQuery += ` LIMIT ? OFFSET ?`;
    stockParams.push(parseInt(limit) || 20, offset);

    console.log('Stock query:', stockQuery);
    console.log('Stock params:', stockParams);

    const stockLevels = await database.all(stockQuery, stockParams);

    console.log('Found stock levels:', stockLevels.length);

    // Get total count for pagination (without LIMIT)
    let countQuery = stockQuery.replace(/LIMIT \? OFFSET \?$/, '');
    const countParams = stockParams.slice(0, -2); // Remove limit and offset params
    const totalCount = await database.get(`SELECT COUNT(*) as count FROM (${countQuery}) as subquery`, countParams);
    const total = totalCount?.count || 0;

    // Calculate pagination info
    const currentPage = parseInt(page) || 1;
    const currentLimit = parseInt(limit) || 20;
    const totalPages = Math.ceil(total / currentLimit);

    res.json({
      data: stockLevels,
      pagination: {
        page: currentPage,
        limit: currentLimit,
        total: total,
        totalPages: totalPages,
        hasNext: currentPage < totalPages,
        hasPrev: currentPage > 1
      }
    });
  } catch (error) {
    console.error('Get inventory levels error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

/**
 * //@swagger
 * /api/inventory/stats:
 *   get:
 *     summary: Get inventory statistics
 *     description: Retrieve overall inventory statistics
 *     tags: [Inventory]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Inventory statistics retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 total_products:
 *                   type: integer
 *                 total_stock_value:
 *                   type: number
 *                 low_stock_count:
 *                   type: integer
 *                 out_of_stock_count:
 *                   type: integer
 *                 categories_count:
 *                   type: integer
 *       401:
 *         description: Unauthorized
 */
router.get('/stats', auth, async (req, res) => {
  try {
    // Get stats from actual inventory locations (shops and warehouses)
    const shopStats = await database.get(`
      SELECT 
        COUNT(DISTINCT p.id) as shop_products,
        SUM(si.quantity) as shop_stock_quantity,
        SUM(si.quantity * p.price) as shop_stock_value,
        COUNT(DISTINCT CASE WHEN si.quantity > 0 AND si.quantity <= si.min_stock_level THEN p.id END) as shop_low_stock_count,
        COUNT(DISTINCT CASE WHEN si.quantity = 0 THEN p.id END) as shop_out_of_stock_count
      FROM shop_inventory si
      JOIN products p ON si.product_id = p.id
      WHERE p.is_active = 1
    `);

    const warehouseStats = await database.get(`
      SELECT 
        COUNT(DISTINCT p.id) as warehouse_products,
        SUM(wi.quantity) as warehouse_stock_quantity,
        SUM(wi.quantity * p.price) as warehouse_stock_value,
        COUNT(DISTINCT CASE WHEN wi.quantity > 0 AND wi.quantity <= wi.min_stock_level THEN p.id END) as warehouse_low_stock_count,
        COUNT(DISTINCT CASE WHEN wi.quantity = 0 THEN p.id END) as warehouse_out_of_stock_count
      FROM warehouse_inventory wi
      JOIN products p ON wi.product_id = p.id
      WHERE p.is_active = 1
    `);

    // Get unique products with low stock status (avoiding double counting)
    const lowStockProducts = await database.get(`
      SELECT COUNT(DISTINCT product_id) as unique_low_stock_count
      FROM (
        SELECT si.product_id
        FROM shop_inventory si
        JOIN products p ON si.product_id = p.id
        WHERE p.is_active = 1 AND si.quantity > 0 AND si.quantity <= si.min_stock_level
        UNION
        SELECT wi.product_id
        FROM warehouse_inventory wi
        JOIN products p ON wi.product_id = p.id
        WHERE p.is_active = 1 AND wi.quantity > 0 AND wi.quantity <= wi.min_stock_level
      ) low_stock_union
    `);

    // Get unique products with out of stock status (avoiding double counting)
    const outOfStockProducts = await database.get(`
      SELECT COUNT(DISTINCT product_id) as unique_out_of_stock_count
      FROM (
        SELECT si.product_id
        FROM shop_inventory si
        JOIN products p ON si.product_id = p.id
        WHERE p.is_active = 1 AND si.quantity = 0
        UNION
        SELECT wi.product_id
        FROM warehouse_inventory wi
        JOIN products p ON wi.product_id = p.id
        WHERE p.is_active = 1 AND wi.quantity = 0
      ) out_of_stock_union
    `);

    // Get total unique products that have been assigned to any location
    const totalAssignedProducts = await database.get(`
      SELECT COUNT(DISTINCT product_id) as total_assigned
      FROM (
        SELECT product_id FROM shop_inventory
        UNION
        SELECT product_id FROM warehouse_inventory
      ) assigned_products
    `);

    const categoriesCount = await database.get(`
      SELECT COUNT(DISTINCT c.id) as categories_count
      FROM categories c
      WHERE c.deleted_at IS NULL
    `);

    // Combine shop and warehouse stats
    const totalProducts = totalAssignedProducts.total_assigned || 0;
    const totalStockQuantity = (shopStats.shop_stock_quantity || 0) + (warehouseStats.warehouse_stock_quantity || 0);
    const totalStockValue = (shopStats.shop_stock_value || 0) + (warehouseStats.warehouse_stock_value || 0);
    const lowStockCount = lowStockProducts.unique_low_stock_count || 0;
    const outOfStockCount = outOfStockProducts.unique_out_of_stock_count || 0;

    console.log('Inventory stats calculated:', {
      totalProducts,
      totalStockQuantity,
      totalStockValue,
      lowStockCount,
      outOfStockCount,
      shopStats,
      warehouseStats
    });

    res.json({
      total_products: totalProducts,
      total_stock_quantity: totalStockQuantity,
      total_stock_value: totalStockValue,
      low_stock_count: lowStockCount,
      out_of_stock_count: outOfStockCount,
      categories_count: categoriesCount.categories_count || 0
    });
  } catch (error) {
    console.error('Get inventory stats error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

/**
 * //@swagger
 * /api/inventory/analytics:
 *   get:
 *     summary: Get inventory analytics
 *     description: Retrieve inventory analytics data
 *     tags: [Inventory]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Inventory analytics retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 stock_trends:
 *                   type: array
 *                   items:
 *                   type: object
 *       401:
 *         description: Unauthorized
 */
router.get('/analytics', auth, async (req, res) => {
  try {
    // Return basic analytics for now
    const analytics = {
      stock_trends: [],
      top_products: [],
      category_distribution: []
    };

    res.json(analytics);
  } catch (error) {
    console.error('Get inventory analytics error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

/**
 * //@swagger
 * /api/inventory/alerts:
 *   get:
 *     summary: Get inventory alerts
 *     description: Retrieve inventory alerts
 *     tags: [Inventory]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Inventory alerts retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 alerts:
 *                   type: array
 *                   items:
 *                   type: object
 *       401:
 *         description: Unauthorized
 */
router.get('/alerts', auth, async (req, res) => {
  try {
    // Return basic alerts for now
    const alerts = {
      low_stock: [],
      out_of_stock: [],
      expiring_soon: []
    };

    res.json(alerts);
  } catch (error) {
    console.error('Get inventory alerts error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

/**
 * //@swagger
 * /api/inventory/transfers:
 *   get:
 *     summary: Get inventory transfers
 *     description: Retrieve inventory transfers
 *     tags: [Inventory]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Inventory transfers retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 transfers:
 *                   type: array
 *                   items:
 *                   type: object
 *       401:
 *         description: Unauthorized
 */
router.get('/transfers', auth, async (req, res) => {
  try {
    const { page = 1, limit = 50, status, from_type, to_type } = req.query;
    const offset = (page - 1) * limit;

    // Check if stock_transfers table exists
    const tableExists = await database.get(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'stock_transfers'
      );
    `);

    if (!tableExists.exists) {
      // Return empty data if table doesn't exist yet
      return res.json({
        transfers: [],
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: 0,
          totalPages: 0
        },
        message: 'Stock transfers table not yet created. Transfers will appear here once the table is set up.'
      });
    }

    // Build query conditions
    let whereConditions = [];
    let queryParams = [];

    if (status) {
      whereConditions.push('status = ?');
      queryParams.push(status);
    }
    if (from_type) {
      whereConditions.push('from_type = ?');
      queryParams.push(from_type);
    }
    if (to_type) {
      whereConditions.push('to_type = ?');
      queryParams.push(to_type);
    }

    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

    // Get transfers with pagination
    const transfers = await database.all(`
      SELECT 
        t.id,
        t.transfer_number,
        t.from_type,
        t.from_id,
        t.to_type,
        t.to_id,
        t.product_id,
        t.quantity,
        t.status,
        t.created_at,
        t.updated_at,
        p.name as product_name,
        p.sku as product_sku,
        CASE 
          WHEN t.from_type = 'shop' THEN s1.name
          WHEN t.from_type = 'warehouse' THEN w1.name
        END as from_location_name,
        CASE 
          WHEN t.to_type = 'shop' THEN s2.name
          WHEN t.to_type = 'warehouse' THEN w2.name
        END as to_location_name
      FROM stock_transfers t
      LEFT JOIN products p ON t.product_id = p.id
      LEFT JOIN shops s1 ON t.from_type = 'shop' AND t.from_id = s1.id
      LEFT JOIN warehouses w1 ON t.from_type = 'warehouse' AND t.from_id = w1.id
      LEFT JOIN shops s2 ON t.to_type = 'shop' AND t.to_id = s2.id
      LEFT JOIN warehouses w2 ON t.to_type = 'warehouse' AND t.to_id = w2.id
      ${whereClause}
      ORDER BY t.created_at DESC
      LIMIT ? OFFSET ?
    `, [...queryParams, limit, offset]);

    // Get total count
    const totalResult = await database.get(`
      SELECT COUNT(*) as total
      FROM stock_transfers t
      ${whereClause}
    `, queryParams);

    const total = totalResult.total || 0;

    res.json({
      transfers,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        totalPages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Get inventory transfers error:', error);

    // If it's a table doesn't exist error, return empty data
    if (error.message && error.message.includes('relation "stock_transfers" does not exist')) {
      return res.json({
        transfers: [],
        pagination: {
          page: parseInt(req.query.page || 1),
          limit: parseInt(req.query.limit || 50),
          total: 0,
          totalPages: 0
        },
        message: 'Stock transfers table not yet created. Transfers will appear here once the table is set up.'
      });
    }

    res.status(500).json({ error: 'Server error' });
  }
});

/**
 * @swagger
 * /api/inventory/assign:
 *   post:
 *     summary: Assign stock to location
 *     description: Assign a product to a specific shop or warehouse with stock levels
 *     tags: [Inventory]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - location_type
 *               - location_id
 *               - product_id
 *               - quantity
 *             properties:
 *               location_type:
 *                 type: string
 *                 enum: [shop, warehouse]
 *                 description: Type of location
 *               location_id:
 *                 type: string
 *                 format: uuid
 *                 description: Shop or warehouse ID
 *               product_id:
 *                 type: string
 *                 format: uuid
 *                 description: Product ID
 *               quantity:
 *                 type: integer
 *                 minimum: 0
 *                 description: Initial stock quantity
 *               min_stock_level:
 *                 type: integer
 *                 minimum: 0
 *                 description: Minimum stock level for alerts
 *               max_stock_level:
 *                 type: integer
 *                 minimum: 0
 *                 description: Maximum stock level
 *     responses:
 *       201:
 *         description: Stock assigned successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 assignment:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                       format: uuid
 *                     location_type:
 *                       type: string
 *                     location_id:
 *                       type: string
 *                       format: uuid
 *                     product_id:
 *                       type: string
 *                       format: uuid
 *                     quantity:
 *                       type: integer
 *       400:
 *         description: Validation error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ValidationError'
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post('/assign', auth, [
  body('location_type').isIn(['shop', 'warehouse']).withMessage('Location type must be shop or warehouse'),
  body('location_id').notEmpty().withMessage('Location ID is required'),
  body('product_id').isUUID().withMessage('Invalid product ID format'),
  body('quantity').isInt({ min: 0 }).withMessage('Quantity must be a non-negative integer'),
  body('min_stock_level').optional().isInt({ min: 0 }).withMessage('Min stock level must be a non-negative integer'),
  body('max_stock_level').optional().isInt({ min: 0 }).withMessage('Max stock level must be a non-negative integer')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { location_type, location_id, product_id, quantity, min_stock_level = 10, max_stock_level = 100 } = req.body;

    // Validate location exists
    let locationExists;
    if (location_type === 'shop') {
      locationExists = await database.get('SELECT id FROM shops WHERE id = ? AND is_active = 1', [location_id]);
    } else {
      locationExists = await database.get('SELECT id FROM warehouses WHERE id = ? AND is_active = 1', [location_id]);
    }
    // Enforce access: Cashiers cannot assign/replenish - only managers and admins can
    if (req.user.role === 'cashier') {
      return res.status(403).json({ error: 'Forbidden: cashiers cannot replenish stock. Only managers and admins can perform this action.' });
    }

    // Managers and admins can replenish any shop
    // No shop restriction for managers - they can replenish all shops

    if (!locationExists) {
      return res.status(400).json({ error: `${location_type} not found` });
    }

    // Validate product exists and get current stock
    // Use stock_quantity as primary source since that's what the products API uses
    const productExists = await database.get('SELECT id, product_type, size, COALESCE(stock_quantity, current_stock, 0) as current_stock, stock_quantity FROM products WHERE id = ? AND is_active = 1', [product_id]);
    if (!productExists) {
      return res.status(400).json({ error: 'Product not found' });
    }

    // Check if this is a perfume product and we're replenishing (increasing quantity)
    const isPerfumeProduct = productExists.product_type === 'perfume';
    let existingAssignment = await database.get(
      `SELECT id, quantity FROM ${location_type === 'shop' ? 'shop_inventory' : 'warehouse_inventory'} WHERE ${location_type}_id = ? AND product_id = ?`,
      [location_id, product_id]
    );
    const isReplenishing = existingAssignment && quantity > existingAssignment.quantity;

    // If it's a perfume product and we're replenishing, handle it differently
    if (isPerfumeProduct && isReplenishing && location_type === 'shop') {
      const additionalQuantityNeeded = quantity - existingAssignment.quantity;

      // Find the bulk perfume and bottle size for this product
      // Extract size from product (e.g., "30ml" -> 30)
      const sizeMatch = productExists.size?.match(/(\d+)ml/i);
      const bottleSizeMl = sizeMatch ? parseInt(sizeMatch[1]) : null;

      if (!bottleSizeMl) {
        return res.status(400).json({ error: 'Cannot determine bottle size from product. Please use the bottling feature instead.' });
      }

      // Find the bulk perfume and bottle size for this product
      // Try to find from product name pattern matching with bulk perfume
      const product = await database.get('SELECT name FROM products WHERE id = ?', [product_id]);
      const productNameBase = product.name.replace(/\s+\d+ml$/i, '').trim();

      // Find bulk perfume by matching name
      const bulkPerfume = await database.get(`
        SELECT id FROM perfume_bulk 
        WHERE (name = ? OR ? LIKE '%' || name || '%' OR name LIKE '%' || ? || '%')
        AND is_active = true
        ORDER BY created_at DESC
        LIMIT 1
      `, [productNameBase, product.name, productNameBase]);

      if (!bulkPerfume) {
        return res.status(400).json({ error: 'Cannot find associated bulk perfume for this product. Please use the bottling feature to create stock.' });
      }

      // Find bottle size
      const bottleSize = await database.get(`
        SELECT id FROM bottle_sizes WHERE size_ml = ? AND is_active = true LIMIT 1
      `, [bottleSizeMl]);

      if (!bottleSize) {
        return res.status(400).json({ error: `Bottle size ${bottleSizeMl}ML not found in inventory` });
      }

      // Use default pricing - Men & Women category (can be enhanced later to detect category)
      const selling_price_per_ml = bottleSizeMl === 30 || bottleSizeMl === 50 ? 500 : bottleSizeMl === 100 ? 400 : 500;

      // Bottle the additional quantity needed
      for (let i = 0; i < additionalQuantityNeeded; i++) {
        // Calculate required ML for 1 unit
        const requiredMl = bottleSizeMl;

        // Check bulk perfume availability
        const bulkPerfumeDetails = await database.get('SELECT bulk_quantity_ml, cost_per_ml FROM perfume_bulk WHERE id = ?', [bulkPerfume.id]);
        if (bulkPerfumeDetails.bulk_quantity_ml < requiredMl) {
          return res.status(400).json({
            error: `Insufficient bulk perfume. Available: ${bulkPerfumeDetails.bulk_quantity_ml}ML, Required: ${requiredMl}ML per unit`
          });
        }

        // Check bottle availability
        const bottleSizeDetails = await database.get('SELECT quantity FROM bottle_sizes WHERE id = ?', [bottleSize.id]);
        if ((bottleSizeDetails.quantity || 0) < 1) {
          return res.status(400).json({ error: `Insufficient bottles. Available: ${bottleSizeDetails.quantity || 0}` });
        }

        // Calculate costs - ensure all values are numbers
        const perfumeCost = parseFloat(requiredMl) * parseFloat(bulkPerfumeDetails.cost_per_ml || 0);
        const bottleCostDetails = await database.get('SELECT bottle_cost, label_cost, packaging_cost FROM bottle_sizes WHERE id = ?', [bottleSize.id]);
        const bottleCost = parseFloat(bottleCostDetails?.bottle_cost || 0);
        const labelCost = parseFloat(bottleCostDetails?.label_cost || 0);
        const packagingCost = parseFloat(bottleCostDetails?.packaging_cost || 0);
        const totalCost = perfumeCost + bottleCost + labelCost + packagingCost;

        // Create bottling record
        const bottlingId = require('uuid').v4();
        await database.run(`
            INSERT INTO perfume_bottling (
              id, bulk_perfume_id, bottle_size_id, quantity_bottled, total_cost, created_by, selling_price_per_ml
            ) VALUES (?, ?, ?, ?, ?, ?, ?)
          `, [bottlingId, bulkPerfume.id, bottleSize.id, 1, totalCost, req.user.id, parseFloat(selling_price_per_ml)]);

        // Update bulk quantity
        await database.run(`
            UPDATE perfume_bulk 
            SET bulk_quantity_ml = bulk_quantity_ml - ?, updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
          `, [requiredMl, bulkPerfume.id]);

        // Decrement bottle size quantity
        await database.run(`
            UPDATE bottle_sizes 
            SET quantity = quantity - 1, updated_at = NOW()
            WHERE id = ?
          `, [bottleSize.id]);

        // Update product stock
        await database.run(`
            UPDATE products 
            SET stock_quantity = COALESCE(stock_quantity, 0) + 1,
                current_stock = COALESCE(current_stock, 0) + 1,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
          `, [product_id]);
      }

      // Now update the shop assignment
      await database.run(
        `UPDATE ${location_type === 'shop' ? 'shop_inventory' : 'warehouse_inventory'} SET 
            quantity = ?, 
            min_stock_level = ?, 
            max_stock_level = ?, 
            last_updated = CURRENT_TIMESTAMP 
           WHERE ${location_type}_id = ? AND product_id = ?`,
        [quantity, min_stock_level, max_stock_level, location_id, product_id]
      );

      return res.status(201).json({
        message: `Replenished ${additionalQuantityNeeded} unit(s) from bulk perfume and assigned to shop`,
        assignment: {
          location_type,
          location_id,
          product_id,
          quantity,
          bottled_units: additionalQuantityNeeded
        }
      });
    }

    // Use stock_quantity if available, otherwise use current_stock
    const actualCurrentStock = productExists.stock_quantity !== null ? productExists.stock_quantity : productExists.current_stock;

    // Check if assignment already exists (if not already retrieved above for perfume products)
    const tableName = location_type === 'shop' ? 'shop_inventory' : 'warehouse_inventory';
    if (!existingAssignment) {
      existingAssignment = await database.get(
        `SELECT id, quantity FROM ${tableName} WHERE ${location_type}_id = ? AND product_id = ?`,
        [location_id, product_id]
      );
    }

    // Calculate available global stock
    // ALWAYS count both shop and warehouse assignments to get total assigned
    let totalAssigned = 0;
    const shopAssignments = await database.get(
      'SELECT COALESCE(SUM(quantity), 0) as total FROM shop_inventory WHERE product_id = ?',
      [product_id]
    );
    totalAssigned += shopAssignments?.total || 0;

    const warehouseAssignments = await database.get(
      'SELECT COALESCE(SUM(quantity), 0) as total FROM warehouse_inventory WHERE product_id = ?',
      [product_id]
    );
    totalAssigned += warehouseAssignments?.total || 0;

    const availableGlobalStock = actualCurrentStock - totalAssigned;

    console.log('Assign stock - Calculations:', {
      actualCurrentStock,
      shopAssignments: shopAssignments?.total || 0,
      warehouseAssignments: warehouseAssignments?.total || 0,
      totalAssigned,
      availableGlobalStock
    });

    // Validation rules for reassignment
    if (existingAssignment) {
      // Calculate additional quantity needed (positive = increasing, negative = decreasing)
      const additionalQuantityNeeded = quantity - existingAssignment.quantity;

      // Only block if trying to DECREASE quantity while there's unsold stock
      // Allow INCREASING quantity (replenish) even if there's remaining stock
      if (location_type === 'shop' && additionalQuantityNeeded < 0) {
        // Get sold quantity for this product in this shop
        const soldData = await database.get(
          `SELECT COALESCE(SUM(quantity), 0) as total_sold 
           FROM order_items oi 
           JOIN orders o ON oi.order_id = o.id 
           WHERE oi.product_id = ? AND o.shop_id = ? AND o.status != 'cancelled'`,
          [product_id, location_id]
        );

        const soldQuantity = soldData?.total_sold || 0;
        const remainingShopStock = existingAssignment.quantity - soldQuantity;

        if (remainingShopStock > 0) {
          return res.status(400).json({
            error: `Shop must sell its current stock (${remainingShopStock} units remaining) before reducing assignment. Replenishment (increasing stock) is allowed.`
          });
        }
      }
    }

    // Validate quantity constraints
    if (quantity <= 0) {
      return res.status(400).json({ error: 'Quantity must be greater than 0' });
    }

    // Check if there's enough additional stock needed
    // If updating, only check additional quantity needed
    const additionalQuantityNeeded = existingAssignment
      ? quantity - existingAssignment.quantity
      : quantity;

    console.log('Validation check:', {
      quantity,
      existingQuantity: existingAssignment?.quantity || 0,
      additionalQuantityNeeded,
      availableGlobalStock,
      isReplenishing,
      productType: productExists.product_type
    });

    // Allow replenishing (increasing quantity) for ALL product types
    // Only block stock validation if NOT replenishing (new assignment or decreasing)
    // When replenishing, we allow it even if available stock is low (stock may come from external sources)
    if (additionalQuantityNeeded > 0) {
      if (isReplenishing) {
        // Replenishing: Allow for all product types (perfume creates from bulk, others may come from external stock)
        console.log(`Replenishing ${additionalQuantityNeeded} units for ${productExists.product_type} product. Allowing replenishment.`);
      } else if (additionalQuantityNeeded > availableGlobalStock) {
        // New assignment: Block if insufficient stock
        return res.status(400).json({
          error: `Cannot assign ${quantity} units. Only ${availableGlobalStock} units available in global stock.`
        });
      }
    }

    if (existingAssignment) {
      // Update existing assignment
      console.log('Updating existing assignment:', {
        assignmentId: existingAssignment.id,
        oldQuantity: existingAssignment.quantity,
        newQuantity: quantity
      });

      // Calculate the difference to adjust global stock
      const quantityDifference = quantity - existingAssignment.quantity;

      await database.run(
        `UPDATE ${tableName} SET 
          quantity = ?, 
          min_stock_level = ?, 
          max_stock_level = ?, 
          last_updated = CURRENT_TIMESTAMP 
         WHERE ${location_type}_id = ? AND product_id = ?`,
        [quantity, min_stock_level, max_stock_level, location_id, product_id]
      );

      // Update global stock: deduct the additional quantity assigned
      if (quantityDifference !== 0) {
        // If replenishing non-perfume products and there's insufficient available stock,
        // increase global stock to cover the shortfall (new stock being added to system)
        if (isReplenishing && !isPerfumeProduct && quantityDifference > availableGlobalStock) {
          const stockShortfall = quantityDifference - availableGlobalStock;
          console.log(`Replenishing non-perfume product: adding ${stockShortfall} units to global stock to cover shortfall`);
          await database.run(
            `UPDATE products SET 
              current_stock = current_stock + ?,
              stock_quantity = COALESCE(stock_quantity, 0) + ?,
              updated_at = CURRENT_TIMESTAMP
             WHERE id = ?`,
            [stockShortfall, stockShortfall, product_id]
          );
        }

        // Deduct the quantity difference from global stock
        // For replenishing with shortfall, this will use the newly added stock
        await database.run(
          `UPDATE products SET 
            current_stock = current_stock - ?,
            updated_at = CURRENT_TIMESTAMP
           WHERE id = ?`,
          [quantityDifference, product_id]
        );
        console.log(`Global stock adjusted by ${-quantityDifference} (difference: ${quantityDifference})`);
      }
    } else {
      // Create new assignment
      const assignmentId = require('uuid').v4();
      console.log('Creating new assignment:', {
        assignmentId,
        location_type,
        location_id,
        product_id,
        quantity
      });
      await database.run(
        `INSERT INTO ${tableName} (id, ${location_type}_id, product_id, quantity, min_stock_level, max_stock_level) 
         VALUES (?, ?, ?, ?, ?, ?)`,
        [assignmentId, location_id, product_id, quantity, min_stock_level, max_stock_level]
      );

      // Deduct assigned quantity from global stock
      await database.run(
        `UPDATE products SET 
          current_stock = current_stock - ?,
          updated_at = CURRENT_TIMESTAMP
         WHERE id = ?`,
        [quantity, product_id]
      );
      console.log(`Global stock reduced by ${quantity} units`);
    }

    // Get updated global stock for response
    const updatedProduct = await database.get(
      'SELECT current_stock FROM products WHERE id = ?',
      [product_id]
    );

    console.log('✅ Assignment saved successfully');
    res.status(201).json({
      message: 'Stock assigned successfully',
      assignment: {
        location_type,
        location_id,
        product_id,
        quantity,
        remaining_global_stock: updatedProduct.current_stock
      }
    });
  } catch (error) {
    console.error('Assign stock error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});
/**
 * @swagger
 * /api/inventory/stock-info/{productId}/{locationId}:
 *   get:
 *     summary: Get detailed stock information for assignment
 *     description: Get global stock, assigned quantities, and shop-specific data for stock assignment
 *     tags: [Inventory]
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
 *       - in: path
 *         name: locationId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Shop ID
 *     responses:
 *       200:
 *         description: Stock information retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 global_stock:
 *                   type: integer
 *                 total_assigned:
 *                   type: integer
 *                 available_quantity:
 *                   type: integer
 *                 shop_assigned:
 *                   type: integer
 *                 shop_sold:
 *                   type: integer
 *                 shop_remaining:
 *                   type: integer
 *                 can_reassign:
 *                   type: boolean
 *                 reassign_message:
 *                   type: string
 *       404:
 *         description: Product or shop not found
 *       500:
 *         description: Server error
 */
router.get('/stock-info/:productId/:locationId', auth, async (req, res) => {
  try {
    const { productId, locationId } = req.params;

    // Validate product exists and get stock information
    // Use stock_quantity as the primary source since that's what the products API uses
    const product = await database.get(
      `SELECT id, 
              stock_quantity,
              current_stock,
              COALESCE(stock_quantity, current_stock, 0) as global_stock
       FROM products 
       WHERE id = ? AND is_active = 1`,
      [productId]
    );
    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }

    // Use stock_quantity directly as the global stock - this is the actual product inventory
    const globalStock = product.stock_quantity || 0;

    console.log('=== STOCK INFO DEBUG ===');
    console.log('Product ID:', productId);
    console.log('Product Query Result:', {
      id: product.id,
      stock_quantity: product.stock_quantity,
      current_stock: product.current_stock,
      global_stock: product.global_stock,
      calculated_global_stock: globalStock
    });

    // Verify the actual database value
    const verifyProduct = await database.get('SELECT * FROM products WHERE id = ?', [productId]);
    console.log('Verified Product from DB:', verifyProduct);

    // Validate shop exists
    const shop = await database.get('SELECT id FROM shops WHERE id = ? AND is_active = 1', [locationId]);
    if (!shop) {
      return res.status(404).json({ error: 'Shop not found' });
    }

    // Get total assigned quantities
    const shopAssignments = await database.get(
      'SELECT COALESCE(SUM(quantity), 0) as total FROM shop_inventory WHERE product_id = ?',
      [productId]
    );

    // Get detailed shop assignments for debugging
    const allShopAssignments = await database.all(
      'SELECT * FROM shop_inventory WHERE product_id = ?',
      [productId]
    );

    const warehouseAssignments = await database.get(
      'SELECT COALESCE(SUM(quantity), 0) as total FROM warehouse_inventory WHERE product_id = ?',
      [productId]
    );

    // Get detailed warehouse assignments for debugging
    const allWarehouseAssignments = await database.all(
      'SELECT * FROM warehouse_inventory WHERE product_id = ?',
      [productId]
    );

    console.log('All Shop Assignments:', allShopAssignments);
    console.log('All Warehouse Assignments:', allWarehouseAssignments);

    // Ensure numeric values to prevent string concatenation
    const shopTotal = Number(shopAssignments?.total || 0);
    const warehouseTotal = Number(warehouseAssignments?.total || 0);
    const totalAssigned = shopTotal + warehouseTotal;
    const availableQuantity = globalStock - totalAssigned;

    console.log('Assignments Query Results:', {
      shopAssignments_raw: shopAssignments,
      warehouseAssignments_raw: warehouseAssignments,
      shopTotal,
      warehouseTotal,
      totalAssigned
    });

    console.log('Stock info - Calculations:', {
      global_stock: globalStock,
      current_stock: product.current_stock,
      stock_quantity: product.stock_quantity,
      shopAssignments: shopAssignments?.total || 0,
      warehouseAssignments: warehouseAssignments?.total || 0,
      totalAssigned,
      availableQuantity
    });

    // Get shop-specific data
    const shopAssignment = await database.get(
      'SELECT quantity FROM shop_inventory WHERE shop_id = ? AND product_id = ?',
      [locationId, productId]
    );

    const shopAssigned = shopAssignment?.quantity || 0;

    // Get sold quantity for this product in this shop
    const soldData = await database.get(
      `SELECT COALESCE(SUM(quantity), 0) as total_sold 
       FROM order_items oi 
       JOIN orders o ON oi.order_id = o.id 
       WHERE oi.product_id = ? AND o.shop_id = ? AND o.status != 'cancelled'`,
      [productId, locationId]
    );

    const shopSold = soldData?.total_sold || 0;
    const shopRemaining = shopAssigned - shopSold;

    // Determine if reassignment is allowed
    let canReassign = true;
    let reassignMessage = '';

    if (shopAssigned > 0 && shopRemaining > 0) {
      canReassign = false;
      reassignMessage = `Shop must sell its current stock (${shopRemaining} units remaining) before reassigning.`;
    } else if (availableQuantity <= 0) {
      canReassign = false;
      reassignMessage = 'No global stock available for assignment.';
    }

    const response = {
      global_stock: globalStock,
      total_assigned: totalAssigned,
      available_quantity: Math.max(0, availableQuantity), // Ensure non-negative
      shop_assigned: shopAssigned,
      shop_sold: shopSold,
      shop_remaining: shopRemaining,
      can_reassign: canReassign,
      reassign_message: reassignMessage
    };

    console.log('=== FINAL RESPONSE ===');
    console.log(JSON.stringify(response, null, 2));

    res.json(response);

  } catch (error) {
    console.error('Get stock info error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/transfer', auth, [
  body('from_type').isIn(['shop', 'warehouse']).withMessage('from_type must be shop or warehouse'),
  body('from_id').notEmpty().withMessage('from_id is required'),
  body('to_type').isIn(['shop', 'warehouse']).withMessage('to_type must be shop or warehouse'),
  body('to_id').notEmpty().withMessage('to_id is required'),
  body('product_id').isUUID().withMessage('Invalid product ID format'),
  body('quantity').isInt({ min: 1 }).withMessage('Quantity must be a positive integer')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { from_type, from_id, to_type, to_id, product_id, quantity } = req.body;
    // Enforce access: Only cashiers are restricted to their own shop
    // Managers and admins can transfer from/to any shop
    if (req.user.role === 'cashier') {
      if (from_type === 'shop' && req.user.shop_id !== from_id) {
        return res.status(403).json({ error: 'Forbidden: cannot transfer from another shop' });
      }
      if (to_type === 'shop' && req.user.shop_id !== to_id) {
        return res.status(403).json({ error: 'Forbidden: cannot transfer to another shop' });
      }
    }

    if (from_type === to_type && from_id === to_id) {
      return res.status(400).json({ error: 'Source and destination cannot be the same' });
    }

    // Validate locations
    const fromTable = from_type === 'shop' ? 'shops' : 'warehouses';
    const toTable = to_type === 'shop' ? 'shops' : 'warehouses';
    const fromExists = await database.get(`SELECT id FROM ${fromTable} WHERE id = ? AND is_active = 1`, [from_id]);
    const toExists = await database.get(`SELECT id FROM ${toTable} WHERE id = ? AND is_active = 1`, [to_id]);
    if (!fromExists) return res.status(400).json({ error: `${from_type} not found` });
    if (!toExists) return res.status(400).json({ error: `${to_type} not found` });

    // Validate product
    const product = await database.get('SELECT id FROM products WHERE id = ? AND is_active = 1', [product_id]);
    if (!product) return res.status(400).json({ error: 'Product not found' });

    const fromInventoryTable = from_type === 'shop' ? 'shop_inventory' : 'warehouse_inventory';
    const toInventoryTable = to_type === 'shop' ? 'shop_inventory' : 'warehouse_inventory';
    const fromKey = `${from_type}_id`;
    const toKey = `${to_type}_id`;

    await database.run('BEGIN TRANSACTION');

    // Check available quantity at source
    const fromRow = await database.get(
      `SELECT quantity FROM ${fromInventoryTable} WHERE ${fromKey} = ? AND product_id = ?`,
      [from_id, product_id]
    );
    const available = fromRow ? fromRow.quantity : 0;
    if (available < quantity) {
      await database.run('ROLLBACK');
      return res.status(400).json({ error: 'Insufficient quantity at source location' });
    }

    // Deduct from source
    await database.run(
      `UPDATE ${fromInventoryTable} SET quantity = quantity - ?, last_updated = CURRENT_TIMESTAMP WHERE ${fromKey} = ? AND product_id = ?`,
      [quantity, from_id, product_id]
    );

    // Add to destination (upsert behavior)
    const toRow = await database.get(
      `SELECT id, quantity FROM ${toInventoryTable} WHERE ${toKey} = ? AND product_id = ?`,
      [to_id, product_id]
    );
    if (toRow) {
      await database.run(
        `UPDATE ${toInventoryTable} SET quantity = quantity + ?, last_updated = CURRENT_TIMESTAMP WHERE ${toKey} = ? AND product_id = ?`,
        [quantity, to_id, product_id]
      );
    } else {
      const newId = require('uuid').v4();
      await database.run(
        `INSERT INTO ${toInventoryTable} (id, ${toKey}, product_id, quantity, min_stock_level, max_stock_level) VALUES (?, ?, ?, ?, ?, ?)`,
        [newId, to_id, product_id, quantity, 0, 0]
      );
    }

    // Create transfer record in stock_transfers table
    let transferId = null;
    let transferNumber = null;

    try {
      transferId = require('uuid').v4();
      transferNumber = `TRF-${Date.now().toString().slice(-6)}`;

      await database.run(`
        INSERT INTO stock_transfers (
          id, transfer_number, from_type, from_id, to_type, to_id, 
          product_id, quantity, status, created_by, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'completed', ?, CURRENT_TIMESTAMP)
      `, [
        transferId,
        transferNumber,
        from_type,
        from_id,
        to_type,
        to_id,
        product_id,
        quantity,
        req.user.id
      ]);
    } catch (transferError) {
      // If stock_transfers table doesn't exist, log the error but don't fail the transfer
      console.warn('Could not create transfer record:', transferError.message);
    }

    // Do not change products.stock_quantity here (transfer only)

    await database.run('COMMIT');
    return res.status(200).json({
      message: 'Stock transferred successfully',
      transfer_number: transferNumber || null,
      transfer_id: transferId || null
    });
  } catch (error) {
    await database.run('ROLLBACK');
    console.error('Transfer stock error:', error);
    return res.status(500).json({ error: 'Server error' });
  }
});

/**
 * //@swagger
 * /api/inventory/stock-levels:
 *   get:
 *     summary: Get stock levels by location
 *     description: Retrieve stock levels for all locations or filter by specific location
 *     tags: [Inventory]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: location_type
 *         schema:
 *           type: string
 *           enum: [shop, warehouse]
 *         description: Filter by location type
 *       - in: query
 *         name: location_id
 *         schema:
 *           type: string
 *         description: Filter by specific location ID
 *     responses:
 *       200:
 *         description: Stock levels retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   id:
 *                     type: string
 *                     format: uuid
 *                   product_id:
 *                     type: string
 *                     format: uuid
 *                   product_name:
 *                     type: string
 *                   sku:
 *                     type: string
 *                   location_type:
 *                     type: string
 *                   location_id:
 *                     type: string
 *                   quantity:
 *                     type: integer
 *                   min_stock_level:
 *                     type: integer
 *                   max_stock_level:
 *                     type: integer
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
router.get('/stock-levels', auth, async (req, res) => {
  try {
    const { location_type, location_id } = req.query;

    // Get shop inventory
    const shopInventory = await database.all(`
      SELECT 
        si.id,
        si.product_id,
        p.name as product_name,
        p.sku,
        p.product_type,
        p.size,
        'shop' as location_type,
        si.shop_id as location_id,
        si.quantity,
        si.min_stock_level,
        si.max_stock_level,
        s.name as location_name
      FROM shop_inventory si
      JOIN products p ON si.product_id = p.id
      JOIN shops s ON si.shop_id = s.id
      WHERE s.is_active = 1
      ${location_type === 'shop' || !location_type ? '' : 'AND 1=0'}
      ${location_id ? 'AND si.shop_id = ?' : ''}
    `, location_id ? [location_id] : []);

    // Get warehouse inventory
    const warehouseInventory = await database.all(`
      SELECT 
        wi.id,
        wi.product_id,
        p.name as product_name,
        p.sku,
        p.product_type,
        p.size,
        'warehouse' as location_type,
        wi.warehouse_id as location_id,
        wi.quantity,
        wi.min_stock_level,
        wi.max_stock_level,
        w.name as location_name
      FROM warehouse_inventory wi
      JOIN products p ON wi.product_id = p.id
      JOIN warehouses w ON wi.warehouse_id = w.id
      WHERE w.is_active = 1
      ${location_type === 'warehouse' || !location_type ? '' : 'AND 1=0'}
      ${location_id ? 'AND wi.warehouse_id = ?' : ''}
    `, location_id ? [location_id] : []);

    const allInventory = [...shopInventory, ...warehouseInventory];

    res.json(allInventory);
  } catch (error) {
    console.error('Get stock levels error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

/**
 * @swagger
 * /api/inventory/reassign-product:
 *   post:
 *     summary: Reassign product quantities based on sales
 *     description: Calculate sold quantities and reassign from main inventory to shop
 *     tags: [Inventory]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - shop_id
 *               - product_id
 *               - reassign_quantity
 *             properties:
 *               shop_id:
 *                 type: string
 *                 format: uuid
 *                 description: Shop ID to reassign to
 *               product_id:
 *                 type: string
 *                 format: uuid
 *                 description: Product ID to reassign
 *               reassign_quantity:
 *                 type: integer
 *                 minimum: 0
 *                 description: Quantity to reassign from main inventory
 *     responses:
 *       200:
 *         description: Product reassigned successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 sold_quantity:
 *                   type: integer
 *                 remaining_quantity:
 *                   type: integer
 *                 reassigned_quantity:
 *                   type: integer
 *                 new_shop_quantity:
 *                   type: integer
 *                 new_main_quantity:
 *                   type: integer
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Access denied
 *       500:
 *         description: Server error
 */
router.post('/reassign-product', auth, [
  body('shop_id').isUUID().withMessage('Invalid shop ID format'),
  body('product_id').isUUID().withMessage('Invalid product ID format'),
  body('reassign_quantity').isInt({ min: 0 }).withMessage('Reassign quantity must be a non-negative integer')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { shop_id, product_id, reassign_quantity } = req.body;

    // Enforce access: Only cashiers are restricted to their own shop
    // Managers and admins can reassign to any shop
    if (req.user.role === 'cashier') {
      if (req.user.shop_id !== shop_id) {
        return res.status(403).json({ error: 'Forbidden: cannot reassign to another shop' });
      }
    }

    // Validate shop exists
    const shopExists = await database.get('SELECT id FROM shops WHERE id = ? AND is_active = 1', [shop_id]);
    if (!shopExists) {
      return res.status(400).json({ error: 'Shop not found' });
    }

    // Validate product exists
    const productExists = await database.get('SELECT id, current_stock FROM products WHERE id = ? AND is_active = 1', [product_id]);
    if (!productExists) {
      return res.status(400).json({ error: 'Product not found' });
    }

    // Get current shop inventory
    const shopInventory = await database.get(
      'SELECT quantity FROM shop_inventory WHERE shop_id = ? AND product_id = ?',
      [shop_id, product_id]
    );

    if (!shopInventory) {
      return res.status(400).json({ error: 'Product not assigned to this shop' });
    }

    // Calculate sold quantities from order items
    const soldData = await database.get(`
      SELECT 
        COALESCE(SUM(oi.quantity), 0) as total_sold
      FROM order_items oi
      JOIN orders o ON oi.order_id = o.id
      WHERE oi.product_id = ? 
        AND o.shop_id = ? 
        AND o.status = 'completed'
    `, [product_id, shop_id]);

    const totalSold = soldData.total_sold || 0;
    const currentShopQuantity = shopInventory.quantity;
    const remainingQuantity = currentShopQuantity - totalSold;

    // Check if there's enough main inventory for reassignment
    if (reassign_quantity > productExists.current_stock) {
      return res.status(400).json({
        error: `Insufficient main inventory. Available: ${productExists.current_stock}, Requested: ${reassign_quantity}`
      });
    }

    await database.run('BEGIN TRANSACTION');

    try {
      // Update shop inventory (add reassigned quantity to remaining)
      const newShopQuantity = remainingQuantity + reassign_quantity;
      await database.run(
        'UPDATE shop_inventory SET quantity = ?, last_updated = CURRENT_TIMESTAMP WHERE shop_id = ? AND product_id = ?',
        [newShopQuantity, shop_id, product_id]
      );

      // Update main product inventory (subtract reassigned quantity)
      const newMainQuantity = productExists.current_stock - reassign_quantity;
      await database.run(
        'UPDATE products SET current_stock = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
        [newMainQuantity, product_id]
      );

      // Create inventory transaction record
      const transactionId = require('uuid').v4();
      await database.run(`
        INSERT INTO inventory_transactions (
          id, product_id, shop_id, transaction_type, quantity, 
          previous_stock, new_stock, reference_type, notes, created_by, created_at
        ) VALUES (?, ?, ?, 'reassignment', ?, ?, ?, 'reassignment', ?, ?, CURRENT_TIMESTAMP)
      `, [
        transactionId, product_id, shop_id, reassign_quantity,
        productExists.current_stock, newMainQuantity,
        `Reassigned ${reassign_quantity} units to shop after sales`, req.user.id
      ]);

      await database.run('COMMIT');

      res.json({
        message: 'Product reassigned successfully',
        sold_quantity: totalSold,
        remaining_quantity: remainingQuantity,
        reassigned_quantity: reassign_quantity,
        new_shop_quantity: newShopQuantity,
        new_main_quantity: newMainQuantity
      });

    } catch (error) {
      await database.run('ROLLBACK');
      throw error;
    }

  } catch (error) {
    console.error('Reassign product error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

/**
 * @swagger
 * /api/inventory/sold-quantities/{productId}/{shopId}:
 *   get:
 *     summary: Get sold quantities for a product in a specific shop
 *     description: Calculate total sold quantities for a product in a shop
 *     tags: [Inventory]
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
 *       - in: path
 *         name: shopId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Shop ID
 *     responses:
 *       200:
 *         description: Sold quantities retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 total_sold:
 *                   type: integer
 *                 shop_quantity:
 *                   type: integer
 *                 remaining_quantity:
 *                   type: integer
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
router.get('/sold-quantities/:productId/:shopId', auth, async (req, res) => {
  try {
    const { productId, shopId } = req.params;

    // Validate product exists
    const productExists = await database.get('SELECT id FROM products WHERE id = ? AND is_active = 1', [productId]);
    if (!productExists) {
      return res.status(400).json({ error: 'Product not found' });
    }

    // Validate shop exists
    const shopExists = await database.get('SELECT id FROM shops WHERE id = ? AND is_active = 1', [shopId]);
    if (!shopExists) {
      return res.status(400).json({ error: 'Shop not found' });
    }

    // Enforce access: non-admins can only access their own shop
    if (req.user.role !== 'admin') {
      if (req.user.shop_id !== shopId) {
        return res.status(403).json({ error: 'Forbidden: cannot access another shop' });
      }
    }

    // Get current shop inventory quantity
    const shopInventory = await database.get(
      'SELECT quantity FROM shop_inventory WHERE shop_id = ? AND product_id = ?',
      [shopId, productId]
    );

    if (!shopInventory) {
      return res.status(400).json({ error: 'Product not assigned to this shop' });
    }

    // Calculate sold quantities from order items
    const soldData = await database.get(`
      SELECT 
        COALESCE(SUM(oi.quantity), 0) as total_sold
      FROM order_items oi
      JOIN orders o ON oi.order_id = o.id
      WHERE oi.product_id = ? 
        AND o.shop_id = ? 
        AND o.status = 'completed'
    `, [productId, shopId]);

    const totalSold = soldData.total_sold || 0;
    const shopQuantity = shopInventory.quantity;
    const remainingQuantity = shopQuantity - totalSold;

    res.json({
      total_sold: totalSold,
      shop_quantity: shopQuantity,
      remaining_quantity: remainingQuantity
    });

  } catch (error) {
    console.error('Get sold quantities error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

/**
 * @swagger
 * /api/inventory/assign-product-to-shop:
 *   post:
 *     summary: Assign product to shop with quantity
 *     description: Admin can assign products to specific shops with quantities
 *     tags: [Inventory]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - shop_id
 *               - product_id
 *               - quantity
 *             properties:
 *               shop_id:
 *                 type: string
 *                 format: uuid
 *               product_id:
 *                 type: string
 *                 format: uuid
 *               quantity:
 *                 type: integer
 *                 minimum: 0
 *               min_stock_level:
 *                 type: integer
 *                 minimum: 0
 *               max_stock_level:
 *                 type: integer
 *                 minimum: 0
 *     responses:
 *       201:
 *         description: Product assigned successfully
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Admin access required
 *       500:
 *         description: Server error
 */
router.post('/assign-product-to-shop', adminAuth, [
  body('shop_id').isUUID().withMessage('Invalid shop ID format'),
  body('product_id').isUUID().withMessage('Invalid product ID format'),
  body('quantity').isInt({ min: 0 }).withMessage('Quantity must be a non-negative integer'),
  body('min_stock_level').optional().isInt({ min: 0 }).withMessage('Min stock level must be a non-negative integer'),
  body('max_stock_level').optional().isInt({ min: 0 }).withMessage('Max stock level must be a non-negative integer')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { shop_id, product_id, quantity, min_stock_level = 10, max_stock_level = 100 } = req.body;

    // Validate shop exists
    const shop = await database.get('SELECT id FROM shops WHERE id = ? AND is_active = 1', [shop_id]);
    if (!shop) {
      return res.status(400).json({ error: 'Shop not found' });
    }

    // Validate product exists and get current stock
    // Use stock_quantity as primary source since that's what the products API uses
    const product = await database.get('SELECT id, COALESCE(stock_quantity, current_stock, 0) as current_stock, stock_quantity FROM products WHERE id = ? AND is_active = 1', [product_id]);
    if (!product) {
      return res.status(400).json({ error: 'Product not found' });
    }

    // Use stock_quantity if available, otherwise use current_stock
    const actualCurrentStock = product.stock_quantity !== null && product.stock_quantity !== undefined ? product.stock_quantity : product.current_stock;

    // Check if assignment already exists
    const existingAssignment = await database.get(
      'SELECT id, quantity FROM shop_inventory WHERE shop_id = ? AND product_id = ?',
      [shop_id, product_id]
    );

    // Calculate available global stock
    let totalAssigned = 0;
    const shopAssignments = await database.get(
      'SELECT COALESCE(SUM(quantity), 0) as total FROM shop_inventory WHERE product_id = ?',
      [product_id]
    );
    totalAssigned += shopAssignments?.total || 0;

    const warehouseAssignments = await database.get(
      'SELECT COALESCE(SUM(quantity), 0) as total FROM warehouse_inventory WHERE product_id = ?',
      [product_id]
    );
    totalAssigned += warehouseAssignments?.total || 0;

    const availableGlobalStock = actualCurrentStock - totalAssigned;

    console.log('Assign-product-to-shop - Calculations:', {
      actualCurrentStock,
      shopAssignments: shopAssignments?.total || 0,
      warehouseAssignments: warehouseAssignments?.total || 0,
      totalAssigned,
      availableGlobalStock
    });

    // Validate quantity constraints
    if (quantity <= 0) {
      return res.status(400).json({ error: 'Quantity must be greater than 0' });
    }

    // Check if there's enough available global stock
    const additionalQuantityNeeded = existingAssignment
      ? quantity - existingAssignment.quantity
      : quantity;

    if (additionalQuantityNeeded > 0 && additionalQuantityNeeded > availableGlobalStock) {
      return res.status(400).json({
        error: `Cannot assign ${quantity} units. Only ${availableGlobalStock} units available in global stock.`
      });
    }

    if (existingAssignment) {
      // Update existing assignment
      await database.run(
        `UPDATE shop_inventory SET 
          quantity = ?, 
          min_stock_level = ?, 
          max_stock_level = ?, 
          last_updated = CURRENT_TIMESTAMP 
         WHERE shop_id = ? AND product_id = ?`,
        [quantity, min_stock_level, max_stock_level, shop_id, product_id]
      );
    } else {
      // Create new assignment
      const assignmentId = require('uuid').v4();
      await database.run(
        `INSERT INTO shop_inventory (id, shop_id, product_id, quantity, min_stock_level, max_stock_level) 
         VALUES (?, ?, ?, ?, ?, ?)`,
        [assignmentId, shop_id, product_id, quantity, min_stock_level, max_stock_level]
      );
    }

    res.status(201).json({
      success: true,
      message: existingAssignment
        ? 'Product assignment updated successfully'
        : 'Product assigned to shop successfully',
      assignment: {
        shop_id,
        product_id,
        quantity,
        min_stock_level,
        max_stock_level,
        was_updated: !!existingAssignment
      }
    });
  } catch (error) {
    console.error('Assign product to shop error:', error);
    res.status(500).json({
      error: 'Server error',
      message: error.message || 'An unexpected error occurred while assigning product to shop'
    });
  }
});

/**
 * @swagger
 * /api/inventory/shop-products/{shopId}:
 *   get:
 *     summary: Get products assigned to a specific shop
 *     description: Retrieve all products assigned to a specific shop with their quantities
 *     tags: [Inventory]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: shopId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Shop ID
 *     responses:
 *       200:
 *         description: Shop products retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 products:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: string
 *                         format: uuid
 *                       name:
 *                         type: string
 *                       sku:
 *                         type: string
 *                       quantity:
 *                         type: integer
 *                       min_stock_level:
 *                         type: integer
 *                       max_stock_level:
 *                         type: integer
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Shop not found
 *       500:
 *         description: Server error
 */
router.get('/shop-products/:shopId', auth, async (req, res) => {
  try {
    const { shopId } = req.params;

    // Validate shop exists
    const shop = await database.get('SELECT id, name FROM shops WHERE id = ? AND is_active = 1', [shopId]);
    if (!shop) {
      return res.status(404).json({ error: 'Shop not found' });
    }

    // Check access: Only cashiers are restricted to their own shop
    // Managers and admins can view any shop
    if (req.user.role === 'cashier' && req.user.shop_id !== shopId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const products = await database.all(`
      SELECT 
        p.id,
        p.name,
        p.sku,
        p.description,
        p.price,
        p.currency,
        p.image_url,
        si.quantity,
        si.min_stock_level,
        si.max_stock_level,
        b.name as brand_name
      FROM shop_inventory si
      JOIN products p ON si.product_id = p.id
      LEFT JOIN brands b ON p.brand_id = b.id
      WHERE si.shop_id = ? AND p.is_active = 1
      ORDER BY p.name
    `, [shopId]);

    res.json({
      shop: {
        id: shop.id,
        name: shop.name
      },
      products
    });
  } catch (error) {
    console.error('Get shop products error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

/**
 * @swagger
 * /api/inventory/assignments/{assignmentId}:
 *   put:
 *     summary: Update stock assignment
 *     description: Update quantity and stock levels for an existing assignment
 *     tags: [Inventory]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: assignmentId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Assignment ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               quantity:
 *                 type: integer
 *                 minimum: 0
 *                 description: New quantity
 *               min_stock_level:
 *                 type: integer
 *                 minimum: 0
 *                 description: Minimum stock level
 *               max_stock_level:
 *                 type: integer
 *                 minimum: 0
 *                 description: Maximum stock level
 *     responses:
 *       200:
 *         description: Assignment updated successfully
 *       400:
 *         description: Validation error
 *       404:
 *         description: Assignment not found
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
router.put('/assignments/:assignmentId', auth, [
  body('quantity').isInt({ min: 0 }).withMessage('Quantity must be a non-negative integer'),
  body('min_stock_level').optional().isInt({ min: 0 }).withMessage('Min stock level must be a non-negative integer'),
  body('max_stock_level').optional().isInt({ min: 0 }).withMessage('Max stock level must be a non-negative integer')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { assignmentId } = req.params;
    const { quantity, min_stock_level = 10, max_stock_level = 100 } = req.body;

    // Find the assignment
    const assignment = await database.get(
      'SELECT * FROM shop_inventory WHERE id = ?',
      [assignmentId]
    );

    if (!assignment) {
      return res.status(404).json({ error: 'Assignment not found' });
    }

    // Check access: Only cashiers are restricted to their own shop assignments
    // Managers and admins can edit any shop assignment
    if (req.user.role === 'cashier' && req.user.shop_id !== assignment.shop_id) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Update the assignment
    await database.run(
      `UPDATE shop_inventory SET 
        quantity = ?, 
        min_stock_level = ?, 
        max_stock_level = ?, 
        last_updated = CURRENT_TIMESTAMP 
       WHERE id = ?`,
      [quantity, min_stock_level, max_stock_level, assignmentId]
    );

    res.json({
      message: 'Assignment updated successfully',
      assignment: {
        id: assignmentId,
        quantity,
        min_stock_level,
        max_stock_level
      }
    });
  } catch (error) {
    console.error('Update assignment error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

/**
 * @swagger
 * /api/inventory/assignments/{assignmentId}:
 *   delete:
 *     summary: Delete stock assignment
 *     description: Remove a product assignment from a shop/warehouse
 *     tags: [Inventory]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: assignmentId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Assignment ID
 *     responses:
 *       200:
 *         description: Assignment deleted successfully
 *       404:
 *         description: Assignment not found
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Access denied
 *       500:
 *         description: Server error
 */
router.delete('/assignments/:assignmentId', auth, async (req, res) => {
  try {
    const { assignmentId } = req.params;

    // Find the assignment
    const assignment = await database.get(
      'SELECT * FROM shop_inventory WHERE id = ?',
      [assignmentId]
    );

    if (!assignment) {
      return res.status(404).json({ error: 'Assignment not found' });
    }

    // Check access: Only cashiers are restricted to their own shop assignments
    // Managers and admins can delete any shop assignment
    if (req.user.role === 'cashier' && req.user.shop_id !== assignment.shop_id) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Return the assigned quantity back to global stock
    await database.run(
      `UPDATE products SET 
        current_stock = current_stock + ?,
        updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
      [assignment.quantity, assignment.product_id]
    );
    console.log(`Returned ${assignment.quantity} units back to global stock`);

    // Delete the assignment
    await database.run('DELETE FROM shop_inventory WHERE id = ?', [assignmentId]);

    res.json({
      message: 'Assignment deleted successfully. Quantity returned to global stock.',
      deleted_assignment: {
        id: assignmentId,
        product_id: assignment.product_id,
        shop_id: assignment.shop_id,
        quantity: assignment.quantity
      }
    });
  } catch (error) {
    console.error('Delete assignment error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

/**
 * @swagger
 * /api/inventory/locations/{locationType}/{locationId}/products/{productId}/quantity:
 *   get:
 *     summary: Get product quantity in specific location
 *     description: Get the quantity of a specific product in a shop or warehouse
 *     tags: [Inventory]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: locationType
 *         required: true
 *         schema:
 *           type: string
 *           enum: [shop, warehouse]
 *         description: Type of location
 *       - in: path
 *         name: locationId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Location ID
 *       - in: path
 *         name: productId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Product ID
 *     responses:
 *       200:
 *         description: Product quantity retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 location_type:
 *                   type: string
 *                 location_id:
 *                   type: string
 *                   format: uuid
 *                 product_id:
 *                   type: string
 *                   format: uuid
 *                 quantity:
 *                   type: integer
 *       404:
 *         description: Product not found in location
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
router.get('/locations/:locationType/:locationId/products/:productId/quantity', auth, async (req, res) => {
  try {
    const { locationType, locationId, productId } = req.params;

    // Validate location type
    if (!['shop', 'warehouse'].includes(locationType)) {
      return res.status(400).json({ error: 'Invalid location type' });
    }

    // Check access: Only cashiers are restricted to their own shop
    // Managers and admins can view any shop
    if (locationType === 'shop' && req.user.role === 'cashier' && req.user.shop_id !== locationId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Get quantity from appropriate table
    const tableName = locationType === 'shop' ? 'shop_inventory' : 'warehouse_inventory';
    const locationKey = `${locationType}_id`;

    const result = await database.get(
      `SELECT quantity FROM ${tableName} WHERE ${locationKey} = ? AND product_id = ?`,
      [locationId, productId]
    );

    if (!result) {
      return res.status(404).json({
        error: 'Product not found in location',
        quantity: 0
      });
    }

    res.json({
      location_type: locationType,
      location_id: locationId,
      product_id: productId,
      quantity: result.quantity || 0
    });
  } catch (error) {
    console.error('Get location product quantity error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

/**
 * @swagger
 * /api/inventory/reassign/{itemId}:
 *   post:
 *     summary: Reassign inventory item to a new location
 *     description: Move inventory from one location to another
 *     tags: [Inventory]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: itemId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Inventory item ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - new_location_type
 *               - new_location_id
 *               - quantity
 *             properties:
 *               new_location_type:
 *                 type: string
 *                 enum: [shop, warehouse]
 *                 description: Type of new location
 *               new_location_id:
 *                 type: string
 *                 format: uuid
 *                 description: ID of new location
 *               quantity:
 *                 type: integer
 *                 minimum: 1
 *                 description: Quantity to reassign
 *               min_stock_level:
 *                 type: integer
 *                 minimum: 0
 *                 description: Minimum stock level for new location
 *               max_stock_level:
 *                 type: integer
 *                 minimum: 0
 *                 description: Maximum stock level for new location
 *     responses:
 *       200:
 *         description: Inventory reassigned successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 reassigned_quantity:
 *                   type: integer
 *                 from_location:
 *                   type: string
 *                 to_location:
 *                   type: string
 *       400:
 *         description: Invalid request or insufficient quantity
 *       404:
 *         description: Inventory item not found
 *       500:
 *         description: Server error
 */
router.post('/reassign/:itemId', auth, [
  body('new_location_type').isIn(['shop', 'warehouse']).withMessage('Location type must be shop or warehouse'),
  body('new_location_id').isUUID().withMessage('Location ID must be a valid UUID'),
  body('quantity').isInt({ min: 1 }).withMessage('Quantity must be a positive integer'),
  body('min_stock_level').optional().isInt({ min: 0 }).withMessage('Min stock level must be non-negative'),
  body('max_stock_level').optional().isInt({ min: 0 }).withMessage('Max stock level must be non-negative')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { itemId } = req.params;
    const { new_location_type, new_location_id, quantity, min_stock_level = 10, max_stock_level = 100 } = req.body;

    // Get current inventory item
    const currentItem = await database.get(`
      SELECT 
        si.id,
        si.product_id,
        si.location_id,
        si.location_type,
        si.quantity,
        si.min_stock_level,
        si.max_stock_level,
        p.name as product_name,
        p.current_stock as global_stock,
        CASE 
          WHEN si.location_type = 'shop' THEN s.name
          WHEN si.location_type = 'warehouse' THEN w.name
        END as location_name
      FROM shop_inventory si
      LEFT JOIN products p ON si.product_id = p.id
      LEFT JOIN shops s ON si.location_type = 'shop' AND si.location_id = s.id
      LEFT JOIN warehouses w ON si.location_type = 'warehouse' AND si.location_id = w.id
      WHERE si.id = ?
    `, [itemId]);

    if (!currentItem) {
      return res.status(404).json({ error: 'Inventory item not found' });
    }

    // Validate quantity
    if (quantity > currentItem.quantity) {
      return res.status(400).json({
        error: `Your current quantity is less than what you want to assign. Available: ${currentItem.quantity} ML, Requested: ${quantity} ML`
      });
    }

    // Validate against global stock
    if (quantity > currentItem.global_stock) {
      return res.status(400).json({
        error: `Insufficient global stock. Available: ${currentItem.global_stock} ML, Requested: ${quantity} ML`
      });
    }

    // Check if new location exists
    let newLocationExists;
    if (new_location_type === 'shop') {
      newLocationExists = await database.get('SELECT id, name FROM shops WHERE id = ? AND is_active = true', [new_location_id]);
    } else {
      newLocationExists = await database.get('SELECT id, name FROM warehouses WHERE id = ? AND is_active = true', [new_location_id]);
    }

    if (!newLocationExists) {
      return res.status(404).json({ error: `${new_location_type} not found` });
    }

    // Check if item already exists in new location
    const existingAssignment = await database.get(`
      SELECT id, quantity FROM shop_inventory 
      WHERE product_id = ? AND location_id = ? AND location_type = ?
    `, [currentItem.product_id, new_location_id, new_location_type]);

    await database.run('BEGIN TRANSACTION');

    try {
      // Update current location (reduce quantity)
      const newCurrentQuantity = currentItem.quantity - quantity;
      if (newCurrentQuantity > 0) {
        await database.run(`
          UPDATE shop_inventory 
          SET quantity = ?, updated_at = CURRENT_TIMESTAMP
          WHERE id = ?
        `, [newCurrentQuantity, itemId]);
      } else {
        // Remove item if quantity becomes 0
        await database.run('DELETE FROM shop_inventory WHERE id = ?', [itemId]);
      }

      // Update or create assignment in new location
      if (existingAssignment) {
        const newQuantity = existingAssignment.quantity + quantity;
        await database.run(`
          UPDATE shop_inventory 
          SET quantity = ?, min_stock_level = ?, max_stock_level = ?, updated_at = CURRENT_TIMESTAMP
          WHERE id = ?
        `, [newQuantity, min_stock_level, max_stock_level, existingAssignment.id]);
      } else {
        await database.run(`
          INSERT INTO shop_inventory (
            product_id, location_id, location_type, quantity, 
            min_stock_level, max_stock_level, created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
        `, [currentItem.product_id, new_location_id, new_location_type, quantity, min_stock_level, max_stock_level]);
      }

      // Update global stock (subtract assigned quantity from global stock)
      await database.run(`
        UPDATE products 
        SET current_stock = current_stock - ?, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `, [quantity, currentItem.product_id]);

      // Get updated global stock
      const updatedProduct = await database.get('SELECT current_stock FROM products WHERE id = ?', [currentItem.product_id]);

      await database.run('COMMIT');

      res.json({
        message: 'Inventory reassigned successfully',
        reassigned_quantity: quantity,
        from_location: `${currentItem.location_name} (${currentItem.location_type})`,
        to_location: `${newLocationExists.name} (${new_location_type})`,
        remaining_global_stock: updatedProduct.current_stock
      });

    } catch (error) {
      await database.run('ROLLBACK');
      throw error;
    }

  } catch (error) {
    console.error('Reassign inventory error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

/**
 * @swagger
 * /api/inventory/shop-product-quantity:
 *   put:
 *     summary: Update shop product quantity (Cashier)
 *     description: Allows cashiers to update the quantity of a product in their assigned shop
 *     tags: [Inventory]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - product_id
 *               - quantity
 *             properties:
 *               product_id:
 *                 type: string
 *                 format: uuid
 *                 description: Product ID
 *               quantity:
 *                 type: integer
 *                 minimum: 0
 *                 description: New quantity for the product in the shop
 *     responses:
 *       200:
 *         description: Quantity updated successfully
 *       400:
 *         description: Validation error or product not assigned to shop
 *       403:
 *         description: Access denied (not assigned to shop or not cashier)
 *       404:
 *         description: Product or assignment not found
 *       500:
 *         description: Server error
 */
router.put('/shop-product-quantity', auth, [
  body('product_id').isUUID().withMessage('Invalid product ID format'),
  body('quantity').isInt({ min: 0 }).withMessage('Quantity must be a non-negative integer')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { product_id, quantity, shop_id } = req.body;

    // Cashiers can only update their own shop
    // Managers and admins can update any shop
    if (req.user.role === 'cashier') {
      if (!req.user.shop_id) {
        return res.status(403).json({ error: 'You must be assigned to a shop to update product quantities' });
      }

      // Check if product is assigned to their shop
      const assignment = await database.get(
        'SELECT id, quantity FROM shop_inventory WHERE shop_id = ? AND product_id = ?',
        [req.user.shop_id, product_id]
      );

      if (!assignment) {
        return res.status(404).json({
          error: 'Product is not assigned to your shop. Please contact an admin to assign this product first.'
        });
      }

      // Update the quantity for cashier's shop
      await database.run(
        `UPDATE shop_inventory SET 
          quantity = ?, 
          last_updated = CURRENT_TIMESTAMP 
         WHERE shop_id = ? AND product_id = ?`,
        [quantity, req.user.shop_id, product_id]
      );
    } else if (req.user.role === 'manager' || req.user.role === 'admin') {
      // Managers and admins can update any shop
      const targetShopId = shop_id || req.user.shop_id;

      if (!targetShopId) {
        return res.status(400).json({ error: 'Shop ID is required' });
      }

      // Check if product is assigned to the target shop
      const assignment = await database.get(
        'SELECT id, quantity FROM shop_inventory WHERE shop_id = ? AND product_id = ?',
        [targetShopId, product_id]
      );

      if (!assignment) {
        return res.status(404).json({
          error: 'Product is not assigned to this shop. Please assign this product first.'
        });
      }

      // Update the quantity
      await database.run(
        `UPDATE shop_inventory SET 
          quantity = ?, 
          last_updated = CURRENT_TIMESTAMP 
         WHERE shop_id = ? AND product_id = ?`,
        [quantity, targetShopId, product_id]
      );

      res.json({
        success: true,
        message: 'Product quantity updated successfully',
        assignment: {
          product_id,
          shop_id: targetShopId,
          quantity
        }
      });
    } else {
      return res.status(403).json({ error: 'Access denied. Only cashiers, managers, and admins can update shop quantities.' });
    }
  } catch (error) {
    console.error('Update shop product quantity error:', error);
    res.status(500).json({ error: 'Server error: ' + error.message });
  }
});

module.exports = router; 