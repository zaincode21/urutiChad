const express = require('express');
const { v4: uuidv4 } = require('uuid');
const { body, validationResult } = require('express-validator');
const database = require('../database/database');
const { auth, adminAuth } = require('../middleware/auth');

const router = express.Router();

/**
 * Get all users
 */
router.get('/', auth, async (req, res) => {
  try {
    let users;
    if (req.user.role === 'admin') {
      users = await database.all(`
        SELECT u.*, s.name as shop_name
        FROM users u
        LEFT JOIN shops s ON u.shop_id = s.id
        WHERE u.is_active = 1
        ORDER BY u.first_name, u.last_name
      `);
    } else {
      users = await database.all(`
        SELECT u.*, s.name as shop_name
        FROM users u
        LEFT JOIN shops s ON u.shop_id = s.id
        WHERE u.is_active = 1 AND u.shop_id = ?
        ORDER BY u.first_name, u.last_name
      `, [req.user.shop_id || null]);
    }

    res.json({ users });
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

/**
 * Get user by ID
 */
router.get('/:id', auth, async (req, res) => {
  try {
    const user = await database.get(`
      SELECT u.*, s.name as shop_name
      FROM users u
      LEFT JOIN shops s ON u.shop_id = s.id
      WHERE u.id = ? AND u.is_active = 1
    `, [req.params.id]);

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({ user });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

/**
 * Create new user
 */
router.post('/', adminAuth, [
  body('username').trim().isLength({ min: 3 }).withMessage('Username must be at least 3 characters'),
  body('first_name').trim().notEmpty().withMessage('First name is required'),
  body('last_name').trim().notEmpty().withMessage('Last name is required'),
  body('email').isEmail().withMessage('Valid email is required'),
  body('role').isIn(['admin', 'manager', 'cashier']).withMessage('Invalid role'),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
  body('shop_id').optional({ nullable: true, checkFalsy: true }).isUUID().withMessage('Invalid shop_id format'),
  body('phone').optional().isString().withMessage('Phone must be a string'),
  body('is_active').optional().isBoolean().withMessage('is_active must be a boolean')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { username, first_name, last_name, email, role, password, shop_id, phone } = req.body;

    // Determine finalShopId: required for cashier, optional for manager, null for admin
    let finalShopId = null;
    if (role === 'cashier') {
      if (!shop_id) {
        return res.status(400).json({ error: 'shop_id is required for cashier users' });
      }
      const shop = await database.get('SELECT id FROM shops WHERE id = ? AND is_active = 1', [shop_id]);
      if (!shop) {
        return res.status(400).json({ error: 'Invalid shop_id' });
      }
      finalShopId = shop_id;
    } else if (role === 'manager' && shop_id) {
      // Validate provided optional shop for manager
      const shop = await database.get('SELECT id FROM shops WHERE id = ? AND is_active = 1', [shop_id]);
      if (!shop) {
        return res.status(400).json({ error: 'Invalid shop_id' });
      }
      finalShopId = shop_id;
    }

    // Check if username already exists
    const existingUser = await database.get('SELECT id FROM users WHERE username = ?', [username]);
    if (existingUser) {
      return res.status(400).json({ error: 'Username already exists' });
    }

    // Check if email already exists
    const existingEmail = await database.get('SELECT id FROM users WHERE email = ?', [email]);
    if (existingEmail) {
      return res.status(400).json({ error: 'Email already exists' });
    }

    const userId = uuidv4();
    const bcrypt = require('bcryptjs');
    const hashedPassword = await bcrypt.hash(password, 10);

    await database.run(`
      INSERT INTO users (id, username, first_name, last_name, email, password, role, shop_id, phone, is_active)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [userId, username, first_name, last_name, email, hashedPassword, role, role === 'admin' ? null : finalShopId, phone || null, true]);

    res.status(201).json({
      message: 'User created successfully',
      user: { id: userId, username, first_name, last_name, email, role }
    });
  } catch (error) {
    console.error('Create user error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

/**
 * Update user
 */
router.put('/:id', adminAuth, [
  body('first_name').trim().notEmpty().withMessage('First name is required'),
  body('last_name').trim().notEmpty().withMessage('Last name is required'),
  body('email').isEmail().withMessage('Valid email is required'),
  body('role').isIn(['admin', 'manager', 'cashier']).withMessage('Invalid role'),
  body('shop_id').optional({ nullable: true, checkFalsy: true }).isUUID().withMessage('Invalid shop_id format'),
  body('phone').optional().isString().withMessage('Phone must be a string'),
  body('is_active').optional().isBoolean().withMessage('is_active must be a boolean'),
  body('password').optional().isLength({ min: 6 }).withMessage('Password must be at least 6 characters')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { first_name, last_name, email, role, shop_id, phone, password } = req.body;
    const userId = req.params.id;

    // Check if email already exists for other users
    const existingEmail = await database.get('SELECT id FROM users WHERE email = ? AND id != ?', [email, userId]);
    if (existingEmail) {
      return res.status(400).json({ error: 'Email already exists' });
    }

    // Validate shop assignment for cashier role only
    let finalShopId = null;
    if (role === 'cashier') {
      if (!shop_id) {
        return res.status(400).json({ error: 'shop_id is required for cashier users' });
      }
      const shop = await database.get('SELECT id FROM shops WHERE id = ? AND is_active = 1', [shop_id]);
      if (!shop) {
        return res.status(400).json({ error: 'Invalid shop_id' });
      }
      finalShopId = shop_id;
    }

    // Prepare update fields and parameters
    const updateFields = ['first_name = ?', 'last_name = ?', 'email = ?', 'role = ?', 'shop_id = ?', 'phone = ?', 'is_active = ?', 'updated_at = CURRENT_TIMESTAMP'];
    const updateParams = [first_name, last_name, email, role, role === 'admin' ? null : finalShopId, phone || null, req.body.is_active !== undefined ? req.body.is_active : true];

    // Handle password update if provided
    if (password) {
      const bcrypt = require('bcryptjs');
      const hashedPassword = await bcrypt.hash(password, 10);
      updateFields.push('password = ?');
      updateParams.push(hashedPassword);
    }

    updateParams.push(userId);

    await database.run(`
      UPDATE users 
      SET ${updateFields.join(', ')}
      WHERE id = ?
    `, updateParams);

    res.json({ message: 'User updated successfully' });
  } catch (error) {
    console.error('Update user error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

/**
 * Delete user (soft delete)
 */
router.delete('/:id', adminAuth, async (req, res) => {
  try {
    const userId = req.params.id;

    // Check if user is trying to delete themselves
    if (userId === req.user.id) {
      return res.status(400).json({ error: 'Cannot delete your own account' });
    }

    await database.run(`
      UPDATE users SET is_active = 0, updated_at = CURRENT_TIMESTAMP WHERE id = ?
    `, [userId]);

    res.json({ message: 'User deleted successfully' });
  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

/**
 * Get users by shop
 */
router.get('/shop/:shopId', auth, async (req, res) => {
  try {
    const users = await database.all(`
      SELECT u.id, u.username, u.first_name, u.last_name, u.email, u.role, u.phone, u.created_at
      FROM users u
      WHERE u.shop_id = ? AND u.is_active = 1
      ORDER BY u.first_name, u.last_name
    `, [req.params.shopId]);

    res.json({ users });
  } catch (error) {
    console.error('Get users by shop error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

/**
 * Get user statistics
 */
router.get('/stats/overview', auth, async (req, res) => {
  try {
    const stats = await database.get(`
      SELECT 
        COUNT(*) as total_users,
        COUNT(CASE WHEN role = 'admin' THEN 1 END) as admin_count,
        COUNT(CASE WHEN role = 'manager' THEN 1 END) as manager_count,
        COUNT(CASE WHEN role = 'cashier' THEN 1 END) as cashier_count,
        COUNT(CASE WHEN shop_id IS NOT NULL THEN 1 END) as assigned_users,
        COUNT(CASE WHEN shop_id IS NULL THEN 1 END) as unassigned_users
      FROM users 
      WHERE is_active = 1
    `);

    res.json({ stats });
  } catch (error) {
    console.error('Get user stats error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
