const express = require('express');
const { v4: uuidv4 } = require('uuid');
const { body, validationResult } = require('express-validator');
const database = require('../database/database');
const { auth, adminAuth } = require('../middleware/auth');

const router = express.Router();

// Get all layaway orders
router.get('/', auth, async (req, res) => {
  try {
    const { status, customer_id, shop_id, page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;

    let whereClause = 'WHERE o.order_type = "layaway"';
    const params = [];

    if (status) {
      whereClause += ' AND o.status = ?';
      params.push(status);
    }

    if (customer_id) {
      whereClause += ' AND o.customer_id = ?';
      params.push(customer_id);
    }

    if (shop_id) {
      whereClause += ' AND o.shop_id = ?';
      params.push(shop_id);
    }

    // Get layaway orders with customer and shop info
    const layaways = await database.all(`
      SELECT o.*, c.first_name, c.last_name, c.email, c.phone, s.name as shop_name
      FROM orders o
      LEFT JOIN customers c ON o.customer_id = c.id
      LEFT JOIN shops s ON o.shop_id = s.id
      ${whereClause}
      ORDER BY o.created_at DESC
      LIMIT ? OFFSET ?
    `, [...params, limit, offset]);

    // Get total count for pagination
    const totalCount = await database.get(`
      SELECT COUNT(*) as count FROM orders o ${whereClause}
    `, params);

    // Get payment details for each layaway
    for (let layaway of layaways) {
      const payments = await database.all(`
        SELECT * FROM layaway_payments 
        WHERE order_id = ? 
        ORDER BY payment_date DESC
      `, [layaway.id]);

      const totalPaid = payments.reduce((sum, payment) => sum + payment.amount, 0);
      const remainingAmount = layaway.total_amount - totalPaid;
      
      layaway.payments = payments;
      layaway.total_paid = totalPaid;
      layaway.remaining_amount = remainingAmount;
      layaway.payment_progress = (totalPaid / layaway.total_amount) * 100;
    }

    res.json({
      layaways,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: totalCount.count,
        pages: Math.ceil(totalCount.count / limit)
      }
    });
  } catch (error) {
    console.error('Get layaways error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get single layaway order
router.get('/:id', auth, async (req, res) => {
  try {
    const layaway = await database.get(`
      SELECT o.*, c.first_name, c.last_name, c.email, c.phone, s.name as shop_name
      FROM orders o
      LEFT JOIN customers c ON o.customer_id = c.id
      LEFT JOIN shops s ON o.shop_id = s.id
      WHERE o.id = ? AND o.order_type = 'layaway'
    `, [req.params.id]);

    if (!layaway) {
      return res.status(404).json({ error: 'Layaway order not found' });
    }

    // Get order items
    const items = await database.all(`
      SELECT oi.*, p.name as product_name, p.sku
      FROM order_items oi
      JOIN products p ON oi.product_id = p.id
      WHERE oi.order_id = ?
    `, [req.params.id]);

    // Get payment history
    const payments = await database.all(`
      SELECT lp.*, u.first_name, u.last_name
      FROM layaway_payments lp
      LEFT JOIN users u ON lp.created_by = u.id
      WHERE lp.order_id = ?
      ORDER BY lp.payment_date DESC
    `, [req.params.id]);

    const totalPaid = payments.reduce((sum, payment) => sum + payment.amount, 0);
    const remainingAmount = layaway.total_amount - totalPaid;

    res.json({
      layaway: {
        ...layaway,
        items,
        payments,
        total_paid: totalPaid,
        remaining_amount: remainingAmount,
        payment_progress: (totalPaid / layaway.total_amount) * 100
      }
    });
  } catch (error) {
    console.error('Get layaway error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Create layaway order
router.post('/', auth, [
  body('customer_id').notEmpty().withMessage('Customer ID is required'),
  body('shop_id').notEmpty().withMessage('Shop ID is required'),
  body('items').isArray({ min: 1 }).withMessage('At least one item is required'),
  body('items.*.product_id').notEmpty().withMessage('Product ID is required'),
  body('items.*.quantity').isInt({ min: 1 }).withMessage('Valid quantity is required'),
  body('initial_payment').isFloat({ min: 0 }).withMessage('Valid initial payment is required'),
  body('notes').optional().trim()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { customer_id, shop_id, items, initial_payment, notes } = req.body;

    // Calculate order totals
    let subtotal = 0;
    const orderItems = [];

    for (const item of items) {
      const product = await database.get(`
        SELECT id, name, price, stock_quantity FROM products WHERE id = ? AND is_active = 1
      `, [item.product_id]);

      if (!product) {
        return res.status(400).json({ error: `Product ${item.product_id} not found` });
      }

      if (product.stock_quantity < item.quantity) {
        return res.status(400).json({ error: `Insufficient stock for ${product.name}` });
      }

      const itemTotal = product.price * item.quantity;
      subtotal += itemTotal;

      orderItems.push({
        product,
        quantity: item.quantity,
        unit_price: product.price,
        total_price: itemTotal
      });
    }

    const taxAmount = subtotal * 0.08; // 8% tax
    const totalAmount = subtotal + taxAmount;

    if (initial_payment > totalAmount) {
      return res.status(400).json({ error: 'Initial payment cannot exceed total amount' });
    }

    // Create layaway order
    const orderId = uuidv4();
    const orderNumber = `LAY-${Date.now()}-${Math.random().toString(36).substr(2, 5).toUpperCase()}`;

    await database.run(`
      INSERT INTO orders (
        id, customer_id, shop_id, order_number, order_type, status, subtotal, 
        tax_amount, total_amount, notes, created_by
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [orderId, customer_id, shop_id, orderNumber, 'layaway', 'active', subtotal,
        taxAmount, totalAmount, notes, req.user.id]);

    // Create order items
    for (const item of orderItems) {
      const itemId = uuidv4();
      await database.run(`
        INSERT INTO order_items (
          id, order_id, product_id, quantity, unit_price, total_price
        ) VALUES (?, ?, ?, ?, ?, ?)
      `, [itemId, orderId, item.product.id, item.quantity, item.unit_price, item.total_price]);

      // Reserve stock (reduce available quantity)
      await database.run(`
        UPDATE products 
        SET stock_quantity = stock_quantity - ?, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `, [item.quantity, item.product.id]);

      // Record inventory transaction
      const transactionId = uuidv4();
      await database.run(`
        INSERT INTO inventory_transactions (
          id, product_id, shop_id, transaction_type, quantity, reference_id, reference_type, created_by
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `, [transactionId, item.product.id, shop_id, 'layaway_reservation', -item.quantity, orderId, 'layaway', req.user.id]);
    }

    // Record initial payment
    if (initial_payment > 0) {
      const paymentId = uuidv4();
      await database.run(`
        INSERT INTO layaway_payments (
          id, order_id, amount, payment_date, payment_method, notes, created_by
        ) VALUES (?, ?, ?, CURRENT_TIMESTAMP, 'cash', 'Initial payment', ?)
      `, [paymentId, orderId, initial_payment, req.user.id]);
    }

    res.status(201).json({
      message: 'Layaway order created successfully',
      layaway: {
        id: orderId,
        order_number: orderNumber,
        total_amount: totalAmount,
        initial_payment: initial_payment,
        remaining_amount: totalAmount - initial_payment
      }
    });
  } catch (error) {
    console.error('Create layaway error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Add payment to layaway
router.post('/:id/payment', auth, [
  body('amount').isFloat({ min: 0.01 }).withMessage('Valid payment amount is required'),
  body('payment_method').trim().notEmpty().withMessage('Payment method is required'),
  body('notes').optional().trim()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { amount, payment_method, notes } = req.body;
    const orderId = req.params.id;

    // Get layaway order
    const layaway = await database.get(`
      SELECT * FROM orders WHERE id = ? AND order_type = 'layaway'
    `, [orderId]);

    if (!layaway) {
      return res.status(404).json({ error: 'Layaway order not found' });
    }

    if (layaway.status !== 'active') {
      return res.status(400).json({ error: 'Layaway order is not active' });
    }

    // Get total paid so far
    const totalPaid = await database.get(`
      SELECT SUM(amount) as total FROM layaway_payments WHERE order_id = ?
    `, [orderId]);

    const currentTotalPaid = totalPaid.total || 0;
    const remainingAmount = layaway.total_amount - currentTotalPaid;

    if (amount > remainingAmount) {
      return res.status(400).json({ 
        error: `Payment amount exceeds remaining balance. Remaining: $${remainingAmount.toFixed(2)}` 
      });
    }

    // Record payment
    const paymentId = uuidv4();
    await database.run(`
      INSERT INTO layaway_payments (
        id, order_id, amount, payment_date, payment_method, notes, created_by
      ) VALUES (?, ?, ?, CURRENT_TIMESTAMP, ?, ?, ?)
    `, [paymentId, orderId, amount, payment_method, notes, req.user.id]);

    // Check if layaway is complete
    const newTotalPaid = currentTotalPaid + amount;
    let newStatus = 'active';

    if (newTotalPaid >= layaway.total_amount) {
      newStatus = 'completed';
      
      // Release reserved stock and mark as sold
      const items = await database.all(`
        SELECT product_id, quantity FROM order_items WHERE order_id = ?
      `, [orderId]);

      for (const item of items) {
        // Record inventory transaction for completion
        const transactionId = uuidv4();
        await database.run(`
          INSERT INTO inventory_transactions (
            id, product_id, shop_id, transaction_type, quantity, reference_id, reference_type, created_by
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `, [transactionId, item.product_id, layaway.shop_id, 'layaway_completion', -item.quantity, orderId, 'layaway', req.user.id]);
      }
    }

    // Update order status if completed
    if (newStatus === 'completed') {
      await database.run(`
        UPDATE orders SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?
      `, [newStatus, orderId]);
    }

    res.json({
      message: 'Payment recorded successfully',
      payment: {
        id: paymentId,
        amount: amount,
        remaining_amount: remainingAmount - amount,
        order_status: newStatus
      }
    });
  } catch (error) {
    console.error('Add layaway payment error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Cancel layaway order
router.post('/:id/cancel', auth, [
  body('reason').trim().notEmpty().withMessage('Cancellation reason is required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { reason } = req.body;
    const orderId = req.params.id;

    // Get layaway order
    const layaway = await database.get(`
      SELECT * FROM orders WHERE id = ? AND order_type = 'layaway'
    `, [orderId]);

    if (!layaway) {
      return res.status(404).json({ error: 'Layaway order not found' });
    }

    if (layaway.status !== 'active') {
      return res.status(400).json({ error: 'Layaway order cannot be cancelled' });
    }

    // Get total paid
    const totalPaid = await database.get(`
      SELECT SUM(amount) as total FROM layaway_payments WHERE order_id = ?
    `, [orderId]);

    const currentTotalPaid = totalPaid.total || 0;

    // Return reserved stock
    const items = await database.all(`
      SELECT product_id, quantity FROM order_items WHERE order_id = ?
    `, [orderId]);

    for (const item of items) {
      // Restore stock
      await database.run(`
        UPDATE products 
        SET stock_quantity = stock_quantity + ?, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `, [item.quantity, item.product_id]);

      // Record inventory transaction
      const transactionId = uuidv4();
      await database.run(`
        INSERT INTO inventory_transactions (
          id, product_id, shop_id, transaction_type, quantity, reference_id, reference_type, notes, created_by
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [transactionId, item.product_id, layaway.shop_id, 'layaway_cancellation', item.quantity, orderId, 'layaway', reason, req.user.id]);
    }

    // Update order status
    await database.run(`
      UPDATE orders SET status = 'cancelled', notes = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?
    `, [reason, orderId]);

    res.json({
      message: 'Layaway order cancelled successfully',
      refund_amount: currentTotalPaid,
      reason: reason
    });
  } catch (error) {
    console.error('Cancel layaway error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get layaway statistics
router.get('/stats/overview', auth, async (req, res) => {
  try {
    const { shop_id, period = 'month' } = req.query;

    let dateFilter = '';
    switch (period) {
      case 'week':
        dateFilter = "AND created_at >= datetime('now', '-7 days')";
        break;
      case 'month':
        dateFilter = "AND created_at >= datetime('now', '-30 days')";
        break;
      case 'year':
        dateFilter = "AND created_at >= datetime('now', '-365 days')";
        break;
    }

    let shopFilter = '';
    const params = [];
    if (shop_id) {
      shopFilter = 'AND shop_id = ?';
      params.push(shop_id);
    }

    // Total layaway orders
    const totalLayaways = await database.get(`
      SELECT 
        COUNT(*) as total_orders,
        SUM(total_amount) as total_value,
        AVG(total_amount) as avg_value
      FROM orders 
      WHERE order_type = 'layaway' ${shopFilter} ${dateFilter}
    `, params);

    // Active layaways
    const activeLayaways = await database.get(`
      SELECT 
        COUNT(*) as active_orders,
        SUM(total_amount) as active_value
      FROM orders 
      WHERE order_type = 'layaway' AND status = 'active' ${shopFilter} ${dateFilter}
    `, params);

    // Completed layaways
    const completedLayaways = await database.get(`
      SELECT 
        COUNT(*) as completed_orders,
        SUM(total_amount) as completed_value
      FROM orders 
      WHERE order_type = 'layaway' AND status = 'completed' ${shopFilter} ${dateFilter}
    `, params);

    // Total payments received
    const totalPayments = await database.get(`
      SELECT SUM(lp.amount) as total_payments
      FROM layaway_payments lp
      JOIN orders o ON lp.order_id = o.id
      WHERE o.order_type = 'layaway' ${shopFilter} ${dateFilter}
    `, params);

    res.json({
      total_layaways: totalLayaways,
      active_layaways: activeLayaways,
      completed_layaways: completedLayaways,
      total_payments: totalPayments.total_payments || 0
    });
  } catch (error) {
    console.error('Get layaway stats error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router; 