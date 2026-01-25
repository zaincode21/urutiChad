const express = require('express');
const { v4: uuidv4 } = require('uuid');
const { body, validationResult } = require('express-validator');
const database = require('../database/database');
const { auth } = require('../middleware/auth');

const router = express.Router();

// Get all customers with pagination and search
router.get('/', async (req, res) => {
  try {
    const { page = 1, limit = 10, search = '' } = req.query;
    const offset = (page - 1) * limit;

    // Exclude walk-in customers and specific system customers from the list
    let whereClause = 'WHERE is_active = 1 AND LOWER(first_name) != \'walk-in\' AND LOWER(first_name || \' \' || COALESCE(last_name, \'\')) != \'walk-in customer\' AND NOT (first_name = \'SDSerge\' AND last_name = \'Dukuziyaremye\')';
    let params = [];

    if (search) {
      // Case-insensitive search using LOWER() function
      whereClause += ' AND (LOWER(first_name) LIKE LOWER(?) OR LOWER(last_name) LIKE LOWER(?) OR LOWER(email) LIKE LOWER(?) OR LOWER(phone) LIKE LOWER(?))';
      params.push(`%${search}%`, `%${search}%`, `%${search}%`, `%${search}%`);
    }

    const customers = await database.all(`
      SELECT * FROM customers 
      ${whereClause}
      ORDER BY created_at DESC
      LIMIT ? OFFSET ?
    `, [...params, parseInt(limit), offset]);

    const countResult = await database.get(`
      SELECT COUNT(*) as total FROM customers ${whereClause}
    `, params);

    const total = countResult.total;
    const totalPages = Math.ceil(total / limit);

    res.json({
      customers,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        totalPages
      }
    });
  } catch (error) {
    console.error('Get customers error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get single customer
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const customer = await database.get('SELECT * FROM customers WHERE id = ? AND is_active = 1', [id]);

    if (!customer) {
      return res.status(404).json({ error: 'Customer not found' });
    }

    res.json({ customer });
  } catch (error) {
    console.error('Get customer error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Create customer
router.post('/', auth, [
  body('firstName').trim().isLength({ min: 1 }).escape(),
  body('lastName').trim().isLength({ min: 1 }).escape(),
  body('email').optional({ nullable: true, checkFalsy: true }).isEmail().normalizeEmail(),
  body('phone').optional({ nullable: true, checkFalsy: true }).trim().escape(),
  body('birthday').optional({ nullable: true, checkFalsy: true }).custom((value) => {
    if (!value || value === '') return true;
    return require('validator').isISO8601(value);
  }).withMessage('Birthday must be a valid date (YYYY-MM-DD)'),
  body('anniversaryDate').optional({ nullable: true, checkFalsy: true }).custom((value) => {
    if (!value || value === '') return true;
    return require('validator').isISO8601(value);
  }).withMessage('Anniversary date must be a valid date (YYYY-MM-DD)'),
  body('anniversary_date').optional({ nullable: true, checkFalsy: true }).custom((value) => {
    if (!value || value === '') return true;
    return require('validator').isISO8601(value);
  }).withMessage('Anniversary date must be a valid date (YYYY-MM-DD)'),
  body('loyalty_points').optional({ nullable: true }).isInt({ min: 0 }),
  body('loyalty_tier').optional({ nullable: true }).isIn(['bronze', 'silver', 'gold', 'platinum'])
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      const errorMessages = errors.array().map(err => `${err.param}: ${err.msg}`).join(', ');
      return res.status(400).json({
        error: 'Validation failed',
        message: errorMessages,
        errors: errors.array()
      });
    }

    const {
      firstName,
      lastName,
      email,
      phone,
      address,
      city,
      state,
      country,
      postalCode,
      birthday,
      anniversaryDate,
      anniversary_date,
      loyalty_points = 0,
      loyalty_tier = 'bronze',
      measurements
    } = req.body;

    // Handle anniversary_date from either anniversaryDate or anniversary_date
    const finalAnniversaryDate = anniversary_date || anniversaryDate;

    // Convert empty strings to null for optional fields
    const cleanBirthday = (birthday && birthday.trim() !== '') ? birthday : null;
    const cleanAnniversaryDate = (finalAnniversaryDate && finalAnniversaryDate.trim() !== '') ? finalAnniversaryDate : null;
    const cleanEmail = (email && email.trim() !== '') ? email : null;
    const cleanPhone = (phone && phone.trim() !== '') ? phone : null;

    // Check for duplicate customer by email or phone
    let duplicateCheckQuery = 'SELECT id, first_name, last_name, email, phone FROM customers WHERE ';
    const duplicateCheckParams = [];
    const conditions = [];

    if (cleanEmail) {
      conditions.push('email = ?');
      duplicateCheckParams.push(cleanEmail);
    }

    if (cleanPhone) {
      conditions.push('phone = ?');
      duplicateCheckParams.push(cleanPhone);
    }

    if (conditions.length > 0) {
      duplicateCheckQuery += conditions.join(' OR ');
      const existingCustomer = await database.get(duplicateCheckQuery, duplicateCheckParams);

      if (existingCustomer) {
        const duplicateFields = [];
        if (cleanEmail && existingCustomer.email === cleanEmail) {
          duplicateFields.push('email');
        }
        if (cleanPhone && existingCustomer.phone === cleanPhone) {
          duplicateFields.push('phone');
        }

        return res.status(400).json({
          error: `Customer already exists with the same ${duplicateFields.join(' and ')}.`,
          duplicate: {
            id: existingCustomer.id,
            name: `${existingCustomer.first_name} ${existingCustomer.last_name}`,
            email: existingCustomer.email,
            phone: existingCustomer.phone
          }
        });
      }
    }

    const customerId = uuidv4();
    await database.run(`
      INSERT INTO customers (
        id, first_name, last_name, email, phone, address, city, state, country, postal_code,
        birthday, anniversary_date, loyalty_points, loyalty_tier, total_spent
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0)
    `, [customerId, firstName, lastName, cleanEmail, cleanPhone, address, city, state, country, postalCode,
      cleanBirthday, cleanAnniversaryDate, loyalty_points, loyalty_tier]);

    const newCustomer = await database.get('SELECT * FROM customers WHERE id = ?', [customerId]);

    res.status(201).json({
      message: 'Customer created successfully',
      customer: newCustomer
    });
  } catch (error) {
    console.error('Create customer error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Update customer
router.put('/:id', auth, [
  body('firstName').optional().trim().isLength({ min: 1 }).escape(),
  body('lastName').optional().trim().isLength({ min: 1 }).escape(),
  body('email').optional().isEmail().normalizeEmail(),
  body('phone').optional().trim().escape(),
  body('birthday').optional().isISO8601().toDate(),
  body('anniversary_date').optional().isISO8601().toDate(),
  body('loyalty_points').optional().isInt({ min: 0 }),
  body('loyalty_tier').optional().isIn(['bronze', 'silver', 'gold', 'platinum'])
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { id } = req.params;
    const updateData = req.body;

    const customer = await database.get('SELECT * FROM customers WHERE id = ?', [id]);
    if (!customer) {
      return res.status(404).json({ error: 'Customer not found' });
    }

    // Map frontend field names to database field names
    const fieldMapping = {
      firstName: 'first_name',
      lastName: 'last_name',
      postalCode: 'postal_code',
      anniversary_date: 'anniversary_date',
      measurements: 'measurements'
    };

    const updates = [];
    const params = [];

    Object.keys(updateData).forEach(key => {
      if (updateData[key] !== undefined) {
        const dbField = fieldMapping[key] || key;
        updates.push(`${dbField} = ?`);
        params.push(updateData[key]);
      }
    });

    if (updates.length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    updates.push('updated_at = CURRENT_TIMESTAMP');
    params.push(id);

    await database.run(`UPDATE customers SET ${updates.join(', ')} WHERE id = ?`, params);

    const updatedCustomer = await database.get('SELECT * FROM customers WHERE id = ?', [id]);

    res.json({
      message: 'Customer updated successfully',
      customer: updatedCustomer
    });
  } catch (error) {
    console.error('Update customer error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Delete customer
router.delete('/:id', auth, async (req, res) => {
  try {
    const { id } = req.params;

    const customer = await database.get('SELECT * FROM customers WHERE id = ?', [id]);
    if (!customer) {
      return res.status(404).json({ error: 'Customer not found' });
    }

    await database.run('UPDATE customers SET is_active = 0, updated_at = CURRENT_TIMESTAMP WHERE id = ?', [id]);

    res.json({ message: 'Customer deleted successfully' });
  } catch (error) {
    console.error('Delete customer error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get customer orders
router.get('/:id/orders', async (req, res) => {
  try {
    const { id } = req.params;
    const { page = 1, limit = 10 } = req.query;
    const offset = (page - 1) * limit;

    const orders = await database.all(`
      SELECT * FROM orders 
      WHERE customer_id = ? 
      ORDER BY created_at DESC
      LIMIT ? OFFSET ?
    `, [id, parseInt(limit), offset]);

    const countResult = await database.get(
      'SELECT COUNT(*) as total FROM orders WHERE customer_id = ?',
      [id]
    );

    const total = countResult.total;
    const totalPages = Math.ceil(total / limit);

    res.json({
      orders,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        totalPages
      }
    });
  } catch (error) {
    console.error('Get customer orders error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get customers with upcoming special days (birthdays/anniversaries)
router.get('/special-days/upcoming', async (req, res) => {
  try {
    const { days = 30, type = 'both' } = req.query;

    // Exclude walk-in customers and specific system customers from special days
    let whereClause = 'WHERE is_active = 1 AND email IS NOT NULL AND email != "" AND LOWER(first_name) != \'walk-in\' AND LOWER(first_name || \' \' || COALESCE(last_name, \'\')) != \'walk-in customer\' AND NOT (first_name = \'SDSerge\' AND last_name = \'Dukuziyaremye\')';
    let params = [];

    if (type === 'birthday') {
      whereClause += ' AND birthday IS NOT NULL AND birthday != ""';
    } else if (type === 'anniversary') {
      whereClause += ' AND anniversary_date IS NOT NULL AND anniversary_date != ""';
    } else {
      whereClause += ' AND (birthday IS NOT NULL AND birthday != "" OR anniversary_date IS NOT NULL AND anniversary_date != "")';
    }

    const customers = await database.all(`
      SELECT 
        id, 
        first_name, 
        last_name, 
        email, 
        phone,
        birthday, 
        anniversary_date,
        loyalty_tier,
        total_spent,
        CASE 
          WHEN birthday IS NOT NULL AND birthday != '' 
          THEN date('now', 'start of year', '+' || (strftime('%j', birthday) - 1) || ' days')
          ELSE date('now', 'start of year', '+365 days')
        END as next_special_day,
        CASE 
          WHEN birthday IS NOT NULL AND birthday != '' 
          THEN 'birthday'
          ELSE 'anniversary'
        END as special_day_type
      FROM customers 
      ${whereClause}
      ORDER BY next_special_day ASC
      LIMIT ?
    `, [parseInt(days)]);

    res.json({
      success: true,
      message: `Upcoming special days for next ${days} days`,
      data: {
        days: parseInt(days),
        type,
        customers,
        count: customers.length
      }
    });
  } catch (error) {
    console.error('Get upcoming special days error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get customers with special days today
router.get('/special-days/today', async (req, res) => {
  try {
    const today = new Date();
    const month = (today.getMonth() + 1).toString().padStart(2, '0');
    const day = today.getDate().toString().padStart(2, '0');

    const birthdayCustomers = await database.all(`
      SELECT id, first_name, last_name, email, phone, birthday, loyalty_tier, total_spent
      FROM customers 
      WHERE is_active = 1 
      AND email IS NOT NULL 
      AND email != ''
      AND LOWER(first_name) != 'walk-in' 
      AND LOWER(first_name || ' ' || COALESCE(last_name, '')) != 'walk-in customer'
      AND NOT (first_name = 'SDSerge' AND last_name = 'Dukuziyaremye')
      AND strftime('%m', birthday) = ? 
      AND strftime('%d', birthday) = ?
    `, [month, day]);

    const anniversaryCustomers = await database.all(`
      SELECT id, first_name, last_name, email, phone, anniversary_date, loyalty_tier, total_spent
      FROM customers 
      WHERE is_active = 1 
      AND email IS NOT NULL 
      AND email != ''
      AND LOWER(first_name) != 'walk-in' 
      AND LOWER(first_name || ' ' || COALESCE(last_name, '')) != 'walk-in customer'
      AND NOT (first_name = 'SDSerge' AND last_name = 'Dukuziyaremye')
      AND strftime('%m', anniversary_date) = ? 
      AND strftime('%d', anniversary_date) = ?
    `, [month, day]);

    res.json({
      success: true,
      message: 'Special days for today',
      data: {
        today: `${today.getFullYear()}-${month}-${day}`,
        birthdays: {
          count: birthdayCustomers.length,
          customers: birthdayCustomers
        },
        anniversaries: {
          count: anniversaryCustomers.length,
          customers: anniversaryCustomers
        }
      }
    });
  } catch (error) {
    console.error('Get today special days error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router; 