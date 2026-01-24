const express = require('express');
const { v4: uuidv4 } = require('uuid');
const { body, validationResult } = require('express-validator');
const database = require('../database/database');
const { auth, adminAuth } = require('../middleware/auth');
const { requireShopAccess } = require('../middleware/permissions');

const router = express.Router();

/**
 * @swagger
 * /shops:
 *   get:
 *     summary: Get all shops
 *     description: Retrieve a list of all active shops/branches
 *     tags: [Shops]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Page number for pagination
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *         description: Number of items per page
 *     responses:
 *       200:
 *         description: List of shops retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 shops:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Shop'
 *             example:
 *               shops:
 *                 - id: "shop-uuid-1"
 *                   name: "Main Street Store"
 *                   address: "123 Main Street"
 *                   city: "New York"
 *                   state: "NY"
 *                   country: "USA"
 *                   postal_code: "10001"
 *                   phone: "+1-555-0101"
 *                   email: "main@retail.com"
 *                   manager_id: "manager-uuid-1"
 *                   manager_first_name: "John"
 *                   manager_last_name: "Manager"
 *                   is_active: true
 *                   created_at: "2024-01-01T00:00:00.000Z"
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
router.get('/', auth, async (req, res) => {
  try {
    let shops;
    // Admins and managers can see all shops
    if (req.user.role === 'admin' || req.user.role === 'manager') {
      shops = await database.all(`
        SELECT s.*, u.first_name as manager_first_name, u.last_name as manager_last_name
        FROM shops s
        LEFT JOIN users u ON s.manager_id = u.id
        WHERE s.is_active = 1
        ORDER BY s.name
      `);
    } else {
      // Cashiers and other roles see only their assigned shop
      shops = await database.all(`
        SELECT s.*, u.first_name as manager_first_name, u.last_name as manager_last_name
        FROM shops s
        LEFT JOIN users u ON s.manager_id = u.id
        WHERE s.is_active = 1 AND s.id = ?
        ORDER BY s.name
      `, [req.user.shop_id || null]);
    }

    res.json({ shops });
  } catch (error) {
    console.error('Get shops error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

/**
 * @swagger
 * /shops/{id}:
 *   get:
 *     summary: Get shop by ID
 *     description: Retrieve detailed information about a specific shop including staff and inventory
 *     tags: [Shops]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Shop ID
 *     responses:
 *       200:
 *         description: Shop details retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 shop:
 *                   allOf:
 *                     - $ref: '#/components/schemas/Shop'
 *                     - type: object
 *                       properties:
 *                         staff:
 *                           type: array
 *                           items:
 *                             type: object
 *                             properties:
 *                               id:
 *                                 type: string
 *                                 format: uuid
 *                               username:
 *                                 type: string
 *                               first_name:
 *                                 type: string
 *                               last_name:
 *                                 type: string
 *                               role:
 *                                 type: string
 *                               email:
 *                                 type: string
 *                               phone:
 *                                 type: string
 *                         low_stock_items:
 *                           type: array
 *                           items:
 *                             type: object
 *                             properties:
 *                               name:
 *                                 type: string
 *                               sku:
 *                                 type: string
 *                               quantity:
 *                                 type: integer
 *                               min_stock_level:
 *                                 type: integer
 *       404:
 *         description: Shop not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
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
router.get('/:id', auth, requireShopAccess(['id','shopId','shop_id']), async (req, res) => {
  try {
    const shop = await database.get(`
      SELECT s.*, u.first_name as manager_first_name, u.last_name as manager_last_name
      FROM shops s
      LEFT JOIN users u ON s.manager_id = u.id
      WHERE s.id = ? AND s.is_active = 1
    `, [req.params.id]);

    if (!shop) {
      return res.status(404).json({ error: 'Shop not found' });
    }

    // Get shop staff
    const staff = await database.all(`
      SELECT id, username, first_name, last_name, role, email, phone
      FROM users
      WHERE shop_id = ? AND is_active = 1
      ORDER BY first_name, last_name
    `, [req.params.id]);

    // Get shop inventory summary
    const inventory = await database.all(`
      SELECT p.name, p.sku, si.quantity, si.min_stock_level
      FROM shop_inventory si
      JOIN products p ON si.product_id = p.id
      WHERE si.shop_id = ? AND si.quantity <= si.min_stock_level
      ORDER BY si.quantity ASC
    `, [req.params.id]);

    res.json({ 
      shop: { ...shop, staff, low_stock_items: inventory }
    });
  } catch (error) {
    console.error('Get shop error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

/**
 * @swagger
 * /shops:
 *   post:
 *     summary: Create new shop
 *     description: Create a new shop/branch (admin only)
 *     tags: [Shops]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - address
 *               - city
 *             properties:
 *               name:
 *                 type: string
 *                 minLength: 2
 *                 description: Shop name
 *               address:
 *                 type: string
 *                 description: Shop address
 *               city:
 *                 type: string
 *                 description: City
 *               state:
 *                 type: string
 *                 description: State/province
 *               country:
 *                 type: string
 *                 description: Country
 *               postal_code:
 *                 type: string
 *                 description: Postal code
 *               phone:
 *                 type: string
 *                 description: Phone number
 *               email:
 *                 type: string
 *                 format: email
 *                 description: Email address
 *               manager_id:
 *                 type: string
 *                 format: uuid
 *                 description: Manager user ID
 *           example:
 *             name: "Downtown Branch"
 *             address: "456 Downtown Ave"
 *             city: "Los Angeles"
 *             state: "CA"
 *             country: "USA"
 *             postal_code: "90210"
 *             phone: "+1-555-0202"
 *             email: "downtown@retail.com"
 *             manager_id: "manager-uuid-1"
 *     responses:
 *       201:
 *         description: Shop created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 shop:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                       format: uuid
 *                     name:
 *                       type: string
 *                     address:
 *                       type: string
 *                     city:
 *                       type: string
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
router.post('/', adminAuth, [
  body('name').trim().isLength({ min: 2 }).withMessage('Shop name must be at least 2 characters'),
  body('address').trim().notEmpty().withMessage('Address is required'),
  body('city').trim().notEmpty().withMessage('City is required'),
  body('phone').optional().trim(),
  body('email').optional().isEmail().withMessage('Invalid email format')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { name, address, city, state, country, postal_code, phone, email, manager_id } = req.body;

    const shopId = uuidv4();
    await database.run(`
      INSERT INTO shops (id, name, address, city, state, country, postal_code, phone, email, manager_id)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [shopId, name, address, city, state, country, postal_code, phone, email, manager_id]);

    res.status(201).json({
      message: 'Shop created successfully',
      shop: { id: shopId, name, address, city }
    });
  } catch (error) {
    console.error('Create shop error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

/**
 * @swagger
 * /shops/{id}:
 *   put:
 *     summary: Update shop
 *     description: Update shop information (admin only)
 *     tags: [Shops]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Shop ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - address
 *               - city
 *             properties:
 *               name:
 *                 type: string
 *                 minLength: 2
 *                 description: Shop name
 *               address:
 *                 type: string
 *                 description: Shop address
 *               city:
 *                 type: string
 *                 description: City
 *               state:
 *                 type: string
 *                 description: State/province
 *               country:
 *                 type: string
 *                 description: Country
 *               postal_code:
 *                 type: string
 *                 description: Postal code
 *               phone:
 *                 type: string
 *                 description: Phone number
 *               email:
 *                 type: string
 *                 format: email
 *                 description: Email address
 *               manager_id:
 *                 type: string
 *                 format: uuid
 *                 description: Manager user ID
 *           example:
 *             name: "Updated Shop Name"
 *             address: "789 New Address"
 *             city: "Chicago"
 *             state: "IL"
 *             country: "USA"
 *             postal_code: "60601"
 *             phone: "+1-555-0303"
 *             email: "updated@retail.com"
 *             manager_id: "new-manager-uuid"
 *     responses:
 *       200:
 *         description: Shop updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
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
router.put('/:id', adminAuth, [
  body('name').trim().isLength({ min: 2 }).withMessage('Shop name must be at least 2 characters'),
  body('address').trim().notEmpty().withMessage('Address is required'),
  body('city').trim().notEmpty().withMessage('City is required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { name, address, city, state, country, postal_code, phone, email, manager_id } = req.body;

    await database.run(`
      UPDATE shops 
      SET name = ?, address = ?, city = ?, state = ?, country = ?, postal_code = ?, 
          phone = ?, email = ?, manager_id = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `, [name, address, city, state, country, postal_code, phone, email, manager_id, req.params.id]);

    res.json({ message: 'Shop updated successfully' });
  } catch (error) {
    console.error('Update shop error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

/**
 * @swagger
 * /shops/{id}:
 *   delete:
 *     summary: Delete shop
 *     description: Soft delete a shop (admin only)
 *     tags: [Shops]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Shop ID
 *     responses:
 *       200:
 *         description: Shop deleted successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *       400:
 *         description: Cannot delete shop with active staff
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
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
router.delete('/:id', adminAuth, async (req, res) => {
  try {
    // Check if shop has active staff
    const staffCount = await database.get(`
      SELECT COUNT(*) as count FROM users WHERE shop_id = ? AND is_active = 1
    `, [req.params.id]);

    if (staffCount.count > 0) {
      return res.status(400).json({ 
        error: 'Cannot delete shop with active staff. Please reassign or deactivate staff first.' 
      });
    }

    await database.run(`
      UPDATE shops SET is_active = 0, updated_at = CURRENT_TIMESTAMP WHERE id = ?
    `, [req.params.id]);

    res.json({ message: 'Shop deleted successfully' });
  } catch (error) {
    console.error('Delete shop error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

/**
 * @swagger
 * /shops/{id}/stats:
 *   get:
 *     summary: Get shop statistics
 *     description: Retrieve comprehensive statistics for a specific shop
 *     tags: [Shops]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Shop ID
 *       - in: query
 *         name: period
 *         schema:
 *           type: string
 *           enum: [week, month, year]
 *           default: month
 *         description: Time period for statistics
 *     responses:
 *       200:
 *         description: Shop statistics retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 sales_stats:
 *                   type: object
 *                   properties:
 *                     total_orders:
 *                       type: integer
 *                     total_sales:
 *                       type: number
 *                       format: decimal
 *                     avg_order_value:
 *                       type: number
 *                       format: decimal
 *                 top_products:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       name:
 *                         type: string
 *                       sku:
 *                         type: string
 *                       total_sold:
 *                         type: integer
 *                       total_revenue:
 *                         type: number
 *                         format: decimal
 *                 staff_performance:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       first_name:
 *                         type: string
 *                       last_name:
 *                         type: string
 *                       orders_processed:
 *                         type: integer
 *                       total_sales:
 *                         type: number
 *                         format: decimal
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
router.get('/:id/stats', auth, async (req, res) => {
  try {
    const shopId = req.params.id;
    const period = req.query.period || 'month'; // week, month, year

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

    // Sales statistics
    const salesStats = await database.get(`
      SELECT 
        COUNT(*) as total_orders,
        SUM(total_amount) as total_sales,
        AVG(total_amount) as avg_order_value
      FROM orders 
      WHERE shop_id = ? AND status = 'completed' ${dateFilter}
    `, [shopId]);

    // Top products
    const topProducts = await database.all(`
      SELECT p.name, p.sku, SUM(oi.quantity) as total_sold, SUM(oi.total_price) as total_revenue
      FROM order_items oi
      JOIN orders o ON oi.order_id = o.id
      JOIN products p ON oi.product_id = p.id
      WHERE o.shop_id = ? AND o.status = 'completed' ${dateFilter}
      GROUP BY p.id
      ORDER BY total_sold DESC
      LIMIT 10
    `, [shopId]);

    // Staff performance
    const staffPerformance = await database.all(`
      SELECT u.first_name, u.last_name, COUNT(o.id) as orders_processed, SUM(o.total_amount) as total_sales
      FROM orders o
      JOIN users u ON o.created_by = u.id
      WHERE o.shop_id = ? AND o.status = 'completed' ${dateFilter}
      GROUP BY u.id
      ORDER BY total_sales DESC
    `, [shopId]);

    res.json({
      sales_stats: salesStats,
      top_products: topProducts,
      staff_performance: staffPerformance
    });
  } catch (error) {
    console.error('Get shop stats error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

/**
 * @swagger
 * /shops/{id}/staff:
 *   post:
 *     summary: Assign staff to shop
 *     description: Assign a user to a specific shop with a role (admin only)
 *     tags: [Shops]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Shop ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - user_id
 *               - role
 *             properties:
 *               user_id:
 *                 type: string
 *                 format: uuid
 *                 description: User ID to assign
 *               role:
 *                 type: string
 *                 enum: [cashier, manager]
 *                 description: Role for the user at this shop
 *           example:
 *             user_id: "user-uuid-1"
 *             role: "cashier"
 *     responses:
 *       200:
 *         description: Staff assigned successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
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
router.post('/:id/staff', adminAuth, [
  body('user_id').notEmpty().withMessage('User ID is required'),
  body('role').isIn(['cashier', 'manager']).withMessage('Invalid role')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { user_id, role } = req.body;
    const shopId = req.params.id;

    // Update user's shop assignment and role
    await database.run(`
      UPDATE users SET shop_id = ?, role = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?
    `, [shopId, role, user_id]);

    res.json({ message: 'Staff assigned to shop successfully' });
  } catch (error) {
    console.error('Assign staff error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router; 