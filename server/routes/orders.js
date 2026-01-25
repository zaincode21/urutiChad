const express = require('express');
const router = express.Router();
const { auth } = require('../middleware/auth');
const orderService = require('../services/orderService');
const reportService = require('../services/reportService');
const { body, validationResult } = require('express-validator');

/**
 * @swagger
 * /api/orders:
 *   post:
 *     summary: Create a new order with inventory validation
 *     description: Create an order and automatically reserve stock for all items
 *     tags: [Orders]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - customer_id
 *               - items
 *               - shipping_address
 *               - billing_address
 *               - payment_method
 *             properties:
 *               customer_id:
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
 *               shipping_address:
 *                 type: object
 *                 properties:
 *                   street:
 *                     type: string
 *                   city:
 *                     type: string
 *                   state:
 *                     type: string
 *                   postal_code:
 *                     type: string
 *                   country:
 *                     type: string
 *               billing_address:
 *                 type: object
 *               payment_method:
 *                 type: string
 *               notes:
 *                 type: string
 *     responses:
 *       201:
 *         description: Order created successfully
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
 *                 order_number:
 *                   type: string
 *                 status:
 *                   type: string
 *                 total_amount:
 *                   type: number
 *                 items_count:
 *                   type: integer
 *                 stock_reserved:
 *                   type: boolean
 *       400:
 *         description: Invalid request data or insufficient stock
 *       401:
 *         description: Unauthorized
 */
router.post('/', auth, [
  body('customer_id').isUUID().withMessage('Valid customer ID is required'),
  body('items').isArray({ min: 1 }).withMessage('At least one item is required'),
  body('items.*.product_id').isUUID().withMessage('Valid product ID is required'),
  body('items.*.quantity').isInt({ min: 1 }).withMessage('Quantity must be a positive integer'),
  body('payment_method').notEmpty().withMessage('Payment method is required'),
  body('shop_id').optional().isUUID().withMessage('Valid shop ID is required if provided')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const orderData = {
      ...req.body,
      created_by: req.user.id,
      // Automatically include user's shop_id if not provided
      shop_id: req.body.shop_id || req.user.shop_id
    };

    const order = await orderService.createOrder(orderData, req.user.id);

    res.status(201).json(order);
  } catch (error) {
    if (error.message.includes('Insufficient stock') || error.message.includes('not assigned to your shop')) {
      res.status(400).json({ error: error.message });
    } else {
      console.error('Create order error:', error);
      res.status(500).json({ error: error.message || 'Server error' });
    }
  }
});

/**
 * @swagger
 * /api/orders/{orderId}/confirm:
 *   put:
 *     summary: Confirm an order
 *     description: Confirm an order and maintain stock reservations
 *     tags: [Orders]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: orderId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Order ID
 *     responses:
 *       200:
 *         description: Order confirmed successfully
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
 *                 status:
 *                   type: string
 *                 confirmed_at:
 *                   type: string
 *                   format: date-time
 *                 stock_confirmed:
 *                   type: boolean
 *       400:
 *         description: Order cannot be confirmed
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Order not found
 */
router.put('/:orderId/confirm', auth, async (req, res) => {
  try {
    const { orderId } = req.params;
    const result = await orderService.confirmOrder(orderId, req.user.id);

    res.json(result);
  } catch (error) {
    if (error.message.includes('Order not found')) {
      res.status(404).json({ error: error.message });
    } else if (error.message.includes('cannot be confirmed')) {
      res.status(400).json({ error: error.message });
    } else if (error.message.includes('Insufficient stock')) {
      res.status(400).json({ error: error.message });
    } else {
      console.error('Confirm order error:', error);
      res.status(500).json({ error: 'Server error' });
    }
  }
});

/**
 * @swagger
 * /api/orders/{orderId}/process:
 *   put:
 *     summary: Process order for fulfillment
 *     description: Start order processing and generate picking list
 *     tags: [Orders]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: orderId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Order ID
 *     responses:
 *       200:
 *         description: Order processing started successfully
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
 *                 status:
 *                   type: string
 *                 processing_at:
 *                   type: string
 *                   format: date-time
 *                 picking_list:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       product_id:
 *                         type: string
 *                         format: uuid
 *                       product_name:
 *                         type: string
 *                       sku:
 *                         type: string
 *                       quantity:
 *                         type: integer
 *                       location:
 *                         type: string
 *       400:
 *         description: Order cannot be processed
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Order not found
 */
router.put('/:orderId/process', auth, async (req, res) => {
  try {
    const { orderId } = req.params;
    const result = await orderService.processFulfillment(orderId, req.user.id);

    res.json(result);
  } catch (error) {
    if (error.message.includes('Order not found')) {
      res.status(404).json({ error: error.message });
    } else if (error.message.includes('cannot be processed')) {
      res.status(400).json({ error: error.message });
    } else {
      console.error('Process fulfillment error:', error);
      res.status(500).json({ error: 'Server error' });
    }
  }
});

/**
 * @swagger
 * /api/orders/{orderId}/fulfill:
 *   put:
 *     summary: Complete order fulfillment
 *     description: Mark order as fulfilled and update inventory
 *     tags: [Orders]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: orderId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Order ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - tracking_number
 *             properties:
 *               tracking_number:
 *                 type: string
 *                 description: Shipping tracking number
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
 *                 status:
 *                   type: string
 *                 fulfilled_at:
 *                   type: string
 *                   format: date-time
 *                 tracking_number:
 *                   type: string
 *                 inventory_updated:
 *                   type: boolean
 *       400:
 *         description: Order cannot be fulfilled
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Order not found
 */
router.put('/:orderId/fulfill', auth, [
  body('tracking_number').notEmpty().withMessage('Tracking number is required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { orderId } = req.params;
    const { tracking_number } = req.body;

    const result = await orderService.completeFulfillment(orderId, tracking_number, req.user.id);
    res.json(result);
  } catch (error) {
    if (error.message.includes('Order not found')) {
      res.status(404).json({ error: error.message });
    } else if (error.message.includes('cannot be fulfilled')) {
      res.status(400).json({ error: error.message });
    } else {
      console.error('Complete fulfillment error:', error);
      res.status(500).json({ error: 'Server error' });
    }
  }
});

/**
 * @swagger
 * /api/orders/{orderId}/cancel:
 *   put:
 *     summary: Cancel an order
 *     description: Cancel an order and release reserved stock
 *     tags: [Orders]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: orderId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Order ID
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               reason:
 *                 type: string
 *                 description: Reason for cancellation
 *     responses:
 *       200:
 *         description: Order cancelled successfully
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
 *                 status:
 *                   type: string
 *                 cancelled_at:
 *                   type: string
 *                   format: date-time
 *                 stock_released:
 *                   type: boolean
 *       400:
 *         description: Order cannot be cancelled
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Order not found
 */
router.put('/:orderId/cancel', auth, async (req, res) => {
  try {
    const { orderId } = req.params;
    const { reason = '' } = req.body;

    const result = await orderService.cancelOrder(orderId, req.user.id, reason);
    res.json(result);
  } catch (error) {
    if (error.message.includes('Order not found')) {
      res.status(404).json({ error: error.message });
    } else if (error.message.includes('cannot be cancelled')) {
      res.status(400).json({ error: error.message });
    } else {
      console.error('Cancel order error:', error);
      res.status(500).json({ error: 'Server error' });
    }
  }
});

/**
 * @swagger
 * /api/orders/{orderId}/status:
 *   put:
 *     summary: Update order status
 *     description: Update the status of an existing order
 *     tags: [Orders]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: orderId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Order ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - status
 *             properties:
 *               status:
 *                 type: string
 *                 enum: [pending, confirmed, processing, fulfilled, completed, cancelled]
 *                 description: New order status
 *               notes:
 *                 type: string
 *                 description: Optional notes about the status change
 *     responses:
 *       200:
 *         description: Order status updated successfully
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
 *                 status:
 *                   type: string
 *                 updated_at:
 *                   type: string
 *                   format: date-time
 *       400:
 *         description: Invalid status or order cannot be updated
 *       404:
 *         description: Order not found
 *       401:
 *         description: Unauthorized
 */
router.put('/:orderId/status', auth, async (req, res) => {
  try {
    const { orderId } = req.params;
    const { status, notes = '' } = req.body;

    if (!status) {
      return res.status(400).json({ error: 'Status is required' });
    }

    const validStatuses = ['pending', 'confirmed', 'processing', 'fulfilled', 'completed', 'cancelled'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ error: 'Invalid status. Must be one of: ' + validStatuses.join(', ') });
    }

    const result = await orderService.updateOrderStatus(orderId, status, req.user.id, notes);
    res.json(result);
  } catch (error) {
    if (error.message.includes('Order not found')) {
      res.status(404).json({ error: error.message });
    } else {
      console.error('Update order status error:', error);
      res.status(500).json({ error: 'Server error' });
    }
  }
});

/**
 * @swagger
 * /api/orders/{orderId}/payment:
 *   put:
 *     summary: Update order payment status
 *     description: Update the payment details of an existing order
 *     tags: [Orders]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: orderId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Order ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - payment_status
 *               - amount_paid
 *               - remaining_amount
 *             properties:
 *               payment_status:
 *                 type: string
 *                 enum: [pending, partial, completed]
 *               amount_paid:
 *                 type: number
 *               remaining_amount:
 *                 type: number
 *     responses:
 *       200:
 *         description: Payment status updated successfully
 *       400:
 *         description: Invalid input
 *       404:
 *         description: Order not found
 *       500:
 *         description: Server error
 */
router.put('/:orderId/payment', auth, async (req, res) => {
  try {
    const { orderId } = req.params;
    const { payment_status, amount_paid, remaining_amount } = req.body;

    if (!payment_status || amount_paid === undefined || remaining_amount === undefined) {
      return res.status(400).json({ error: 'Missing required payment fields' });
    }

    const result = await orderService.updatePaymentStatus(orderId, {
      payment_status,
      amount_paid,
      remaining_amount
    }, req.user.id);

    res.json(result);
  } catch (error) {
    if (error.message.includes('Order not found')) {
      res.status(404).json({ error: error.message });
    } else {
      console.error('Update payment status error:', error);
      res.status(500).json({ error: 'Server error' });
    }
  }
});

/**
 * @swagger
 * /api/orders/{orderId}:
 *   get:
 *     summary: Get order details
 *     description: Retrieve complete order information including customer and items
 *     tags: [Orders]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: orderId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Order ID
 *     responses:
 *       200:
 *         description: Order details retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 id:
 *                   type: string
 *                   format: uuid
 *                 order_number:
 *                   type: string
 *                 customer_id:
 *                   type: string
 *                   format: uuid
 *                 first_name:
 *                   type: string
 *                 last_name:
 *                   type: string
 *                 email:
 *                   type: string
 *                 phone:
 *                   type: string
 *                 status:
 *                   type: string
 *                 total_amount:
 *                   type: string
 *                 shipping_address:
 *                   type: object
 *                 billing_address:
 *                   type: object
 *                 payment_method:
 *                   type: string
 *                 created_at:
 *                   type: string
 *                   format: date-time
 *       404:
 *         description: Order not found
 *       401:
 *         description: Unauthorized
 */
/**
 * @swagger
 * /api/orders/income-report:
 *   get:
 *     summary: Get income report with orders, revenue, cost, and expenses
 *     description: Retrieve comprehensive income report showing orders, total revenue, cost of goods sold, expenses, and net profit
 *     tags: [Orders]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: start_date
 *         schema:
 *           type: string
 *           format: date
 *         description: Start date for the report
 *       - in: query
 *         name: end_date
 *         schema:
 *           type: string
 *           format: date
 *         description: End date for the report
 *       - in: query
 *         name: shop_id
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Filter by shop ID
 *     responses:
 *       200:
 *         description: Income report retrieved successfully
 */
router.get('/income-report', auth, async (req, res) => {
  try {
    const database = require('../database/database');
    const { start_date, end_date, shop_id } = req.query;

    // Build date filter - use simple date comparison
    let dateFilter = '';
    const params = [];

    if (start_date && end_date) {
      // Add time to end_date to include the full day
      const endDateTime = end_date + ' 23:59:59';
      dateFilter = `AND o.created_at >= ? AND o.created_at <= ?`;
      params.push(start_date + ' 00:00:00', endDateTime);
    } else {
      // Default to last 30 days
      const endDate = new Date();
      endDate.setHours(23, 59, 59, 999);
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - 30);
      startDate.setHours(0, 0, 0, 0);
      dateFilter = `AND o.created_at >= ? AND o.created_at <= ?`;
      params.push(startDate.toISOString(), endDate.toISOString());
    }

    // Add shop filter
    let shopFilter = '';
    if (shop_id && shop_id !== 'all') {
      shopFilter = `AND o.shop_id = ?`;
      params.push(shop_id);
    } else if (req.user.role === 'cashier' && req.user.shop_id) {
      shopFilter = `AND o.shop_id = ?`;
      params.push(req.user.shop_id);
    }

    // Get orders with product names and categories aggregated
    // Use a simpler approach that works better with the SQLite-to-PostgreSQL converter
    const orders = await database.all(`
      SELECT 
        o.id,
        o.order_number,
        o.created_at,
        o.total_amount,
        o.status,
        o.payment_status,
        o.payment_method,
        COALESCE(s.name, 'N/A') as shop_name
      FROM orders o
      LEFT JOIN shops s ON o.shop_id = s.id
      WHERE o.status != 'cancelled' ${dateFilter} ${shopFilter}
      ORDER BY o.created_at DESC
    `, params);

    // Get product names and categories for each order separately
    const ordersWithDetails = await Promise.all(orders.map(async (order) => {
      // Get product names for this order
      const productNamesResult = await database.all(`
        SELECT DISTINCT COALESCE(p.name, 'Unknown Product') as product_name
        FROM order_items oi
        LEFT JOIN products p ON oi.product_id = p.id
        WHERE oi.order_id = ?
        ORDER BY COALESCE(p.name, 'Unknown Product')
      `, [order.id]);

      const productNames = productNamesResult.length > 0
        ? productNamesResult.map(p => p.product_name).join(', ')
        : 'No products';

      // Get categories for this order
      const categoriesResult = await database.all(`
        SELECT DISTINCT cat.name as category_name
        FROM order_items oi
        LEFT JOIN products p ON oi.product_id = p.id
        LEFT JOIN product_categories pc ON p.id = pc.product_id
        LEFT JOIN categories cat ON pc.category_id = cat.id
        WHERE oi.order_id = ?
          AND cat.name IS NOT NULL
          AND (cat.deleted_at IS NULL OR cat.deleted_at = '')
        ORDER BY cat.name
      `, [order.id]);

      const categories = categoriesResult.length > 0
        ? categoriesResult.map(c => c.category_name).join(', ')
        : '';

      return {
        ...order,
        product_names: productNames,
        categories: categories
      };
    }));

    // Calculate total revenue
    const revenueResult = await database.get(`
      SELECT COALESCE(SUM(total_amount), 0) as total_revenue
      FROM orders o
      WHERE o.status != 'cancelled' ${dateFilter} ${shopFilter}
    `, params);
    const totalRevenue = parseFloat(revenueResult?.total_revenue || 0);

    // Calculate cost of goods sold (COGS) from order items
    const cogsResult = await database.get(`
      SELECT COALESCE(SUM(oi.quantity * COALESCE(p.cost_price, 0)), 0) as total_cogs
      FROM order_items oi
      JOIN orders o ON oi.order_id = o.id
      LEFT JOIN products p ON oi.product_id = p.id
      WHERE o.status != 'cancelled' ${dateFilter} ${shopFilter}
    `, params);
    const totalCOGS = parseFloat(cogsResult?.total_cogs || 0);

    // Calculate gross profit
    const grossProfit = totalRevenue - totalCOGS;

    // Get expenses for the same period
    let expenseDateFilter = '';
    const expenseParams = [];

    if (start_date && end_date) {
      expenseDateFilter = `AND e.expense_date >= ? AND e.expense_date <= ?`;
      expenseParams.push(start_date, end_date);
    } else {
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - 30);
      expenseDateFilter = `AND e.expense_date >= ? AND e.expense_date <= ?`;
      expenseParams.push(startDate.toISOString().split('T')[0], endDate.toISOString().split('T')[0]);
    }

    let expenseShopFilter = '';
    if (shop_id && shop_id !== 'all') {
      expenseShopFilter = `AND e.shop_id = ?`;
      expenseParams.push(shop_id);
    } else if (req.user.role === 'cashier' && req.user.shop_id) {
      expenseShopFilter = `AND e.shop_id = ?`;
      expenseParams.push(req.user.shop_id);
    }

    const expensesResult = await database.get(`
      SELECT COALESCE(SUM(amount), 0) as total_expenses
      FROM expenses e
      WHERE e.is_active = true ${expenseDateFilter} ${expenseShopFilter}
    `, expenseParams);
    const totalExpenses = parseFloat(expensesResult?.total_expenses || 0);

    // Calculate net profit
    const netProfit = grossProfit - totalExpenses;

    // Get order items with cost details for detailed breakdown
    const orderItemsWithCost = await database.all(`
      SELECT 
        oi.order_id,
        oi.product_id,
        oi.quantity,
        oi.unit_price,
        oi.total_price,
        COALESCE(p.name, 'Unknown Product') as product_name,
        COALESCE(p.cost_price, 0) as cost_price,
        (oi.quantity * COALESCE(p.cost_price, 0)) as item_cost
      FROM order_items oi
      JOIN orders o ON oi.order_id = o.id
      LEFT JOIN products p ON oi.product_id = p.id
      WHERE o.status != 'cancelled' ${dateFilter} ${shopFilter}
      ORDER BY o.created_at DESC, oi.id
    `, params);

    // Get expenses breakdown
    const expensesBreakdown = await database.all(`
      SELECT 
        e.id,
        e.expense_date,
        e.category,
        e.amount,
        COALESCE(e.description, '') as description,
        COALESCE(s.name, 'N/A') as shop_name
      FROM expenses e
      LEFT JOIN shops s ON e.shop_id = s.id
      WHERE e.is_active = true ${expenseDateFilter} ${expenseShopFilter}
      ORDER BY e.expense_date DESC
    `, expenseParams);

    res.json({
      summary: {
        total_revenue: totalRevenue,
        total_cogs: totalCOGS,
        gross_profit: grossProfit,
        total_expenses: totalExpenses,
        net_profit: netProfit,
        profit_margin: totalRevenue > 0 ? ((netProfit / totalRevenue) * 100) : 0,
        total_orders: ordersWithDetails.length
      },
      orders: ordersWithDetails,
      order_items: orderItemsWithCost,
      expenses: expensesBreakdown,
      date_range: {
        start_date: start_date || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        end_date: end_date || new Date().toISOString().split('T')[0]
      }
    });
  } catch (error) {
    console.error('Get income report error:', error);
    console.error('Error stack:', error.stack);
    console.error('Error details:', {
      message: error.message,
      code: error.code,
      detail: error.detail,
      hint: error.hint
    });
    res.status(500).json({
      error: 'Server error',
      details: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

/**
 * @swagger
 * /api/orders/income-report/pdf:
 *   get:
 *     summary: Generate income report as PDF
 *     description: Generate a professional PDF income report using jsreport
 *     tags: [Orders]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: start_date
 *         schema:
 *           type: string
 *           format: date
 *         description: Start date for the report (YYYY-MM-DD)
 *       - in: query
 *         name: end_date
 *         schema:
 *           type: string
 *           format: date
 *         description: End date for the report (YYYY-MM-DD)
 *       - in: query
 *         name: shop_id
 *         schema:
 *           type: string
 *         description: Shop ID to filter by (optional)
 *     responses:
 *       200:
 *         description: PDF report generated successfully
 *         content:
 *           application/pdf:
 *             schema:
 *               type: string
 *               format: binary
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
router.get('/income-report/pdf', auth, async (req, res) => {
  try {
    const database = require('../database/database');
    const { start_date, end_date, shop_id } = req.query;

    // Get the same data as the regular income report
    // Build date filter
    let dateFilter = '';
    const params = [];

    if (start_date && end_date) {
      const endDateTime = end_date + ' 23:59:59';
      dateFilter = `AND o.created_at >= ? AND o.created_at <= ?`;
      params.push(start_date + ' 00:00:00', endDateTime);
    } else {
      const endDate = new Date();
      endDate.setHours(23, 59, 59, 999);
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - 30);
      startDate.setHours(0, 0, 0, 0);
      dateFilter = `AND o.created_at >= ? AND o.created_at <= ?`;
      params.push(startDate.toISOString(), endDate.toISOString());
    }

    // Add shop filter
    let shopFilter = '';
    let shopName = 'All Shops';
    if (shop_id && shop_id !== 'all') {
      shopFilter = `AND o.shop_id = ?`;
      params.push(shop_id);
      // Get shop name
      const shop = await database.get('SELECT name FROM shops WHERE id = ?', [shop_id]);
      shopName = shop?.name || 'Unknown Shop';
    } else if (req.user.role === 'cashier' && req.user.shop_id) {
      shopFilter = `AND o.shop_id = ?`;
      params.push(req.user.shop_id);
      const shop = await database.get('SELECT name FROM shops WHERE id = ?', [req.user.shop_id]);
      shopName = shop?.name || 'Unknown Shop';
    }

    // Get orders with details
    const orders = await database.all(`
      SELECT 
        o.id,
        o.order_number,
        o.created_at,
        o.total_amount,
        o.status,
        o.payment_status,
        o.payment_method,
        COALESCE(s.name, 'N/A') as shop_name
      FROM orders o
      LEFT JOIN shops s ON o.shop_id = s.id
      WHERE o.status != 'cancelled' ${dateFilter} ${shopFilter}
      ORDER BY o.created_at DESC
    `, params);

    // Get product names and categories for each order
    const ordersWithDetails = await Promise.all(orders.map(async (order) => {
      const productNamesResult = await database.all(`
        SELECT DISTINCT COALESCE(p.name, 'Unknown Product') as product_name
        FROM order_items oi
        LEFT JOIN products p ON oi.product_id = p.id
        WHERE oi.order_id = ?
        ORDER BY COALESCE(p.name, 'Unknown Product')
      `, [order.id]);

      const productNames = productNamesResult.length > 0
        ? productNamesResult.map(p => p.product_name).join(', ')
        : 'No products';

      const categoriesResult = await database.all(`
        SELECT DISTINCT cat.name as category_name
        FROM order_items oi
        LEFT JOIN products p ON oi.product_id = p.id
        LEFT JOIN product_categories pc ON p.id = pc.product_id
        LEFT JOIN categories cat ON pc.category_id = cat.id
        WHERE oi.order_id = ?
          AND cat.name IS NOT NULL
          AND (cat.deleted_at IS NULL OR cat.deleted_at = '')
        ORDER BY cat.name
      `, [order.id]);

      const categories = categoriesResult.length > 0
        ? categoriesResult.map(c => c.category_name).join(', ')
        : '';

      return {
        ...order,
        product_names: productNames,
        categories: categories
      };
    }));

    // Calculate financial metrics
    const revenueResult = await database.get(`
      SELECT COALESCE(SUM(total_amount), 0) as total_revenue
      FROM orders o
      WHERE o.status != 'cancelled' ${dateFilter} ${shopFilter}
    `, params);
    const totalRevenue = parseFloat(revenueResult?.total_revenue || 0);

    const cogsResult = await database.get(`
      SELECT COALESCE(SUM(oi.quantity * COALESCE(p.cost_price, 0)), 0) as total_cogs
      FROM order_items oi
      JOIN orders o ON oi.order_id = o.id
      LEFT JOIN products p ON oi.product_id = p.id
      WHERE o.status != 'cancelled' ${dateFilter} ${shopFilter}
    `, params);
    const totalCOGS = parseFloat(cogsResult?.total_cogs || 0);

    const grossProfit = totalRevenue - totalCOGS;

    // Get expenses
    let expenseDateFilter = '';
    const expenseParams = [];

    if (start_date && end_date) {
      expenseDateFilter = `AND e.expense_date >= ? AND e.expense_date <= ?`;
      expenseParams.push(start_date, end_date);
    } else {
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - 30);
      expenseDateFilter = `AND e.expense_date >= ? AND e.expense_date <= ?`;
      expenseParams.push(startDate.toISOString().split('T')[0], endDate.toISOString().split('T')[0]);
    }

    let expenseShopFilter = '';
    if (shop_id && shop_id !== 'all') {
      expenseShopFilter = `AND e.shop_id = ?`;
      expenseParams.push(shop_id);
    } else if (req.user.role === 'cashier' && req.user.shop_id) {
      expenseShopFilter = `AND e.shop_id = ?`;
      expenseParams.push(req.user.shop_id);
    }

    const expensesResult = await database.get(`
      SELECT COALESCE(SUM(amount), 0) as total_expenses
      FROM expenses e
      WHERE e.is_active = true ${expenseDateFilter} ${expenseShopFilter}
    `, expenseParams);
    const totalExpenses = parseFloat(expensesResult?.total_expenses || 0);

    const netProfit = grossProfit - totalExpenses;

    const expensesBreakdown = await database.all(`
      SELECT 
        e.id,
        e.expense_date,
        e.category,
        e.amount,
        COALESCE(e.description, '') as description,
        COALESCE(s.name, 'N/A') as shop_name
      FROM expenses e
      LEFT JOIN shops s ON e.shop_id = s.id
      WHERE e.is_active = true ${expenseDateFilter} ${expenseShopFilter}
      ORDER BY e.expense_date DESC
    `, expenseParams);

    const reportData = {
      summary: {
        total_revenue: totalRevenue,
        total_cogs: totalCOGS,
        gross_profit: grossProfit,
        total_expenses: totalExpenses,
        net_profit: netProfit,
        profit_margin: totalRevenue > 0 ? ((netProfit / totalRevenue) * 100) : 0,
        total_orders: ordersWithDetails.length
      },
      orders: ordersWithDetails,
      expenses: expensesBreakdown,
      date_range: {
        start_date: start_date || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        end_date: end_date || new Date().toISOString().split('T')[0]
      },
      shop_name: shopName
    };

    // Generate PDF using jsreport
    const pdfBuffer = await reportService.generateIncomeReportPDF(reportData);

    console.log('PDF generated for download:', {
      size: pdfBuffer.length,
      isBuffer: Buffer.isBuffer(pdfBuffer),
      filename: `income-report-${reportData.date_range.start_date}-to-${reportData.date_range.end_date}.pdf`
    });

    // Set response headers for PDF download
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="income-report-${reportData.date_range.start_date}-to-${reportData.date_range.end_date}.pdf"`);
    res.setHeader('Content-Length', pdfBuffer.length);
    res.send(pdfBuffer);

  } catch (error) {
    console.error('Generate PDF income report error:', error);
    res.status(500).json({
      error: 'Server error',
      details: error.message
    });
  }
});

/**
 * @swagger
 * /api/orders/income-report/excel:
 *   get:
 *     summary: Generate income report as Excel
 *     description: Generate an Excel income report using jsreport
 *     tags: [Orders]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: start_date
 *         schema:
 *           type: string
 *           format: date
 *         description: Start date for the report (YYYY-MM-DD)
 *       - in: query
 *         name: end_date
 *         schema:
 *           type: string
 *           format: date
 *         description: End date for the report (YYYY-MM-DD)
 *       - in: query
 *         name: shop_id
 *         schema:
 *           type: string
 *         description: Shop ID to filter by (optional)
 *     responses:
 *       200:
 *         description: Excel report generated successfully
 *         content:
 *           application/vnd.openxmlformats-officedocument.spreadsheetml.sheet:
 *             schema:
 *               type: string
 *               format: binary
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
router.get('/income-report/excel', auth, async (req, res) => {
  try {
    // Check if Excel export is supported
    if (!reportService.isExcelSupported()) {
      return res.status(400).json({
        error: 'Excel export is not available due to compatibility issues. Please use PDF export instead.',
        alternative: 'Use the PDF export button for professional reports.'
      });
    }

    const database = require('../database/database');
    const { start_date, end_date, shop_id } = req.query;

    // Get the same data as the PDF report (reuse the same logic)
    let dateFilter = '';
    const params = [];

    if (start_date && end_date) {
      const endDateTime = end_date + ' 23:59:59';
      dateFilter = `AND o.created_at >= ? AND o.created_at <= ?`;
      params.push(start_date + ' 00:00:00', endDateTime);
    } else {
      const endDate = new Date();
      endDate.setHours(23, 59, 59, 999);
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - 30);
      startDate.setHours(0, 0, 0, 0);
      dateFilter = `AND o.created_at >= ? AND o.created_at <= ?`;
      params.push(startDate.toISOString(), endDate.toISOString());
    }

    let shopFilter = '';
    let shopName = 'All Shops';
    if (shop_id && shop_id !== 'all') {
      shopFilter = `AND o.shop_id = ?`;
      params.push(shop_id);
      const shop = await database.get('SELECT name FROM shops WHERE id = ?', [shop_id]);
      shopName = shop?.name || 'Unknown Shop';
    } else if (req.user.role === 'cashier' && req.user.shop_id) {
      shopFilter = `AND o.shop_id = ?`;
      params.push(req.user.shop_id);
      const shop = await database.get('SELECT name FROM shops WHERE id = ?', [req.user.shop_id]);
      shopName = shop?.name || 'Unknown Shop';
    }

    // Get orders and financial data (same as PDF endpoint)
    const orders = await database.all(`
      SELECT 
        o.id,
        o.order_number,
        o.created_at,
        o.total_amount,
        o.status,
        o.payment_status,
        o.payment_method,
        COALESCE(s.name, 'N/A') as shop_name
      FROM orders o
      LEFT JOIN shops s ON o.shop_id = s.id
      WHERE o.status != 'cancelled' ${dateFilter} ${shopFilter}
      ORDER BY o.created_at DESC
    `, params);

    const ordersWithDetails = await Promise.all(orders.map(async (order) => {
      const productNamesResult = await database.all(`
        SELECT DISTINCT COALESCE(p.name, 'Unknown Product') as product_name
        FROM order_items oi
        LEFT JOIN products p ON oi.product_id = p.id
        WHERE oi.order_id = ?
        ORDER BY COALESCE(p.name, 'Unknown Product')
      `, [order.id]);

      const productNames = productNamesResult.length > 0
        ? productNamesResult.map(p => p.product_name).join(', ')
        : 'No products';

      const categoriesResult = await database.all(`
        SELECT DISTINCT cat.name as category_name
        FROM order_items oi
        LEFT JOIN products p ON oi.product_id = p.id
        LEFT JOIN product_categories pc ON p.id = pc.product_id
        LEFT JOIN categories cat ON pc.category_id = cat.id
        WHERE oi.order_id = ?
          AND cat.name IS NOT NULL
          AND (cat.deleted_at IS NULL OR cat.deleted_at = '')
        ORDER BY cat.name
      `, [order.id]);

      const categories = categoriesResult.length > 0
        ? categoriesResult.map(c => c.category_name).join(', ')
        : '';

      return {
        ...order,
        product_names: productNames,
        categories: categories
      };
    }));

    // Calculate financial metrics (same as PDF)
    const revenueResult = await database.get(`
      SELECT COALESCE(SUM(total_amount), 0) as total_revenue
      FROM orders o
      WHERE o.status != 'cancelled' ${dateFilter} ${shopFilter}
    `, params);
    const totalRevenue = parseFloat(revenueResult?.total_revenue || 0);

    const cogsResult = await database.get(`
      SELECT COALESCE(SUM(oi.quantity * COALESCE(p.cost_price, 0)), 0) as total_cogs
      FROM order_items oi
      JOIN orders o ON oi.order_id = o.id
      LEFT JOIN products p ON oi.product_id = p.id
      WHERE o.status != 'cancelled' ${dateFilter} ${shopFilter}
    `, params);
    const totalCOGS = parseFloat(cogsResult?.total_cogs || 0);

    const grossProfit = totalRevenue - totalCOGS;

    // Get expenses (same as PDF)
    let expenseDateFilter = '';
    const expenseParams = [];

    if (start_date && end_date) {
      expenseDateFilter = `AND e.expense_date >= ? AND e.expense_date <= ?`;
      expenseParams.push(start_date, end_date);
    } else {
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - 30);
      expenseDateFilter = `AND e.expense_date >= ? AND e.expense_date <= ?`;
      expenseParams.push(startDate.toISOString().split('T')[0], endDate.toISOString().split('T')[0]);
    }

    let expenseShopFilter = '';
    if (shop_id && shop_id !== 'all') {
      expenseShopFilter = `AND e.shop_id = ?`;
      expenseParams.push(shop_id);
    } else if (req.user.role === 'cashier' && req.user.shop_id) {
      expenseShopFilter = `AND e.shop_id = ?`;
      expenseParams.push(req.user.shop_id);
    }

    const expensesResult = await database.get(`
      SELECT COALESCE(SUM(amount), 0) as total_expenses
      FROM expenses e
      WHERE e.is_active = true ${expenseDateFilter} ${expenseShopFilter}
    `, expenseParams);
    const totalExpenses = parseFloat(expensesResult?.total_expenses || 0);

    const netProfit = grossProfit - totalExpenses;

    const expensesBreakdown = await database.all(`
      SELECT 
        e.id,
        e.expense_date,
        e.category,
        e.amount,
        COALESCE(e.description, '') as description,
        COALESCE(s.name, 'N/A') as shop_name
      FROM expenses e
      LEFT JOIN shops s ON e.shop_id = s.id
      WHERE e.is_active = true ${expenseDateFilter} ${expenseShopFilter}
      ORDER BY e.expense_date DESC
    `, expenseParams);

    const reportData = {
      summary: {
        total_revenue: totalRevenue,
        total_cogs: totalCOGS,
        gross_profit: grossProfit,
        total_expenses: totalExpenses,
        net_profit: netProfit,
        profit_margin: totalRevenue > 0 ? ((netProfit / totalRevenue) * 100) : 0,
        total_orders: ordersWithDetails.length
      },
      orders: ordersWithDetails,
      expenses: expensesBreakdown,
      date_range: {
        start_date: start_date || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        end_date: end_date || new Date().toISOString().split('T')[0]
      },
      shop_name: shopName
    };

    // Generate Excel using jsreport
    const excelBuffer = await reportService.generateIncomeReportExcel(reportData);

    // Set response headers for Excel download
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="income-report-${reportData.date_range.start_date}-to-${reportData.date_range.end_date}.xlsx"`);
    res.send(excelBuffer);

  } catch (error) {
    console.error('Generate Excel income report error:', error);
    res.status(500).json({
      error: 'Server error',
      details: error.message
    });
  }
});

router.get('/:orderId', auth, async (req, res) => {
  try {
    const { orderId } = req.params;
    const order = await orderService.getOrder(orderId);

    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    res.json(order);
  } catch (error) {
    console.error('Get order error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

/**
 * @swagger
 * /api/orders/{orderId}/items:
 *   get:
 *     summary: Get order items
 *     description: Retrieve all items in an order
 *     tags: [Orders]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: orderId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Order ID
 *     responses:
 *       200:
 *         description: Order items retrieved successfully
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
 *                   order_id:
 *                     type: string
 *                     format: uuid
 *                   product_id:
 *                     type: string
 *                     format: uuid
 *                   name:
 *                     type: string
 *                   sku:
 *                     type: string
 *                   quantity:
 *                     type: integer
 *                   unit_price:
 *                     type: number
 *                   total_price:
 *                     type: number
 *                   cost_price:
 *                     type: number
 *       401:
 *         description: Unauthorized
 */
router.get('/:orderId/items', auth, async (req, res) => {
  try {
    const { orderId } = req.params;
    const items = await orderService.getOrderItems(orderId);

    res.json(items);
  } catch (error) {
    console.error('Get order items error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

/**
 * @swagger
 * /api/orders:
 *   get:
 *     summary: Get orders with filters
 *     description: Retrieve orders with optional filtering and pagination
 *     tags: [Orders]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [pending, confirmed, processing, fulfilled, cancelled]
 *         description: Filter by order status
 *       - in: query
 *         name: customer_id
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Filter by customer ID
 *       - in: query
 *         name: date_from
 *         schema:
 *           type: string
 *           format: date
 *         description: Filter by start date
 *       - in: query
 *         name: date_to
 *         schema:
 *           type: string
 *           format: date
 *         description: Filter by end date
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *         description: Maximum number of orders to return
 *     responses:
 *       200:
 *         description: Orders retrieved successfully
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
 *                   order_number:
 *                     type: string
 *                   customer_id:
 *                     type: string
 *                     format: uuid
 *                   first_name:
 *                     type: string
 *                   last_name:
 *                     type: string
 *                   email:
 *                     type: string
 *                   status:
 *                     type: string
 *                   total_amount:
 *                     type: number
 *                   created_at:
 *                     type: string
 *                     format: date-time
 *       401:
 *         description: Unauthorized
 */
router.get('/', auth, async (req, res) => {
  try {
    const filters = {
      status: req.query.status,
      customer_id: req.query.customer_id,
      shop_id: req.query.shop_id,
      date_from: req.query.date_from,
      date_to: req.query.date_to,
      is_atelier: req.query.is_atelier, // Add atelier filter
      limit: parseInt(req.query.limit) || 20,
      page: parseInt(req.query.page) || 1,
      // Add user-specific filtering for cashiers
      created_by: req.user.role === 'cashier' ? req.user.id : null
    };

    const orders = await orderService.getOrders(filters);
    res.json(orders);
  } catch (error) {
    console.error('Get orders error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

/**
 * @swagger
 * /api/orders/{orderId}/picking-list:
 *   get:
 *     summary: Get picking list for order
 *     description: Generate picking list for order fulfillment
 *     tags: [Orders]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: orderId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Order ID
 *     responses:
 *       200:
 *         description: Picking list generated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   product_id:
 *                     type: string
 *                     format: uuid
 *                   product_name:
 *                     type: string
 *                   sku:
 *                     type: string
 *                   quantity:
 *                     type: integer
 *                   location:
 *                     type: string
 *                   picked:
 *                     type: boolean
 *                   picked_by:
 *                     type: string
 *                   picked_at:
 *                     type: string
 *                     format: date-time
 *       401:
 *         description: Unauthorized
 */
router.get('/:orderId/picking-list', auth, async (req, res) => {
  try {
    const { orderId } = req.params;
    const pickingList = await orderService.generatePickingList(orderId);

    res.json(pickingList);
  } catch (error) {
    console.error('Generate picking list error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

/**
 * @swagger
 * /api/orders/stats:
 *   get:
 *     summary: Get order statistics
 *     description: Retrieve order statistics and trends
 *     tags: [Orders]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: date_from
 *         schema:
 *           type: string
 *           format: date
 *         description: Start date for statistics
 *       - in: query
 *         name: date_to
 *         schema:
 *           type: string
 *           format: date
 *         description: End date for statistics
 *     responses:
 *       200:
 *         description: Order statistics retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 summary:
 *                   type: object
 *                   properties:
 *                     total_orders:
 *                       type: integer
 *                     pending_orders:
 *                       type: integer
 *                     confirmed_orders:
 *                       type: integer
 *                     processing_orders:
 *                       type: integer
 *                     fulfilled_orders:
 *                       type: integer
 *                     cancelled_orders:
 *                       type: integer
 *                     total_revenue:
 *                       type: number
 *                 recent_trends:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       date:
 *                         type: string
 *                         format: date
 *                       order_count:
 *                         type: integer
 *                       daily_revenue:
 *                         type: number
 *                 last_updated:
 *                   type: string
 *                   format: date-time
 *       401:
 *         description: Unauthorized
 */
router.get('/stats', auth, async (req, res) => {
  try {
    const filters = {
      date_from: req.query.date_from,
      date_to: req.query.date_to
    };

    const stats = await orderService.getOrderStats(filters);
    res.json(stats);
  } catch (error) {
    console.error('Get order stats error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

/**
 * @swagger
 * /api/orders/stats/overview:
 *   get:
 *     summary: Get order overview statistics
 *     description: Retrieve quick overview statistics for orders dashboard
 *     tags: [Orders]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: period
 *         schema:
 *           type: integer
 *           default: 30
 *         description: Number of days to look back for statistics
 *     responses:
 *       200:
 *         description: Order overview statistics retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 stats:
 *                   type: object
 *                   properties:
 *                     total_orders:
 *                       type: integer
 *                     total_revenue:
 *                       type: number
 *                     avg_order_value:
 *                       type: number
 *                     completed_orders:
 *                       type: integer
 *       401:
 *         description: Unauthorized
 */
router.get('/stats/overview', auth, async (req, res) => {
  try {
    const period = parseInt(req.query.period) || 30;
    const dateFrom = new Date();
    dateFrom.setDate(dateFrom.getDate() - period);

    const stats = await orderService.getOrderOverviewStats(period, req.user);
    res.json({ stats });
  } catch (error) {
    console.error('Get order overview stats error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});


/**
 * @swagger
 * /api/orders/{orderId}:
 *   delete:
 *     summary: Delete an order
 *     description: Delete an order and release any reserved stock (admin only)
 *     tags: [Orders]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: orderId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Order ID
 *     responses:
 *       200:
 *         description: Order deleted successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 order_id:
 *                   type: string
 *                   format: uuid
 *                 stock_released:
 *                   type: boolean
 *       400:
 *         description: Order cannot be deleted
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Order not found
 *       500:
 *         description: Server error
 */
router.delete('/:orderId', auth, async (req, res) => {
  try {
    const { orderId } = req.params;

    // Check if user is admin (only admins can delete orders)
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Only administrators can delete orders' });
    }

    const result = await orderService.deleteOrder(orderId, req.user.id);
    res.json(result);
  } catch (error) {
    if (error.message.includes('Order not found')) {
      res.status(404).json({ error: error.message });
    } else if (error.message.includes('cannot be deleted')) {
      res.status(400).json({ error: error.message });
    } else {
      console.error('Delete order error:', error);
      res.status(500).json({ error: 'Server error' });
    }
  }
});

module.exports = router; 