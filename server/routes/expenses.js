const express = require('express');
const { v4: uuidv4 } = require('uuid');
const { body, validationResult } = require('express-validator');
const database = require('../database/database');
const { auth, adminAuth, managerAuth } = require('../middleware/auth');

const router = express.Router();

// Get all expenses with filters
router.get('/', auth, async (req, res) => {
  try {
    const { shop_id, category, start_date, end_date, page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;

    let whereClause = 'WHERE e.is_active = true';
    const params = [];

    // For cashiers, automatically filter by their shop
    if (req.user.role === 'cashier') {
      if (!req.user.shop_id) {
        return res.status(400).json({ error: 'Cashier must be assigned to a shop to view expenses' });
      }
      whereClause += ' AND e.shop_id = ?';
      params.push(req.user.shop_id);
    } else if (shop_id) {
      // For admins/managers, allow filtering by shop_id if provided
      whereClause += ' AND e.shop_id = ?';
      params.push(shop_id);
    }

    if (category) {
      whereClause += ' AND e.category = ?';
      params.push(category);
    }

    if (start_date) {
      whereClause += ' AND e.expense_date >= ?';
      params.push(start_date);
    }

    if (end_date) {
      whereClause += ' AND e.expense_date <= ?';
      params.push(end_date);
    }

    // Get expenses with shop and user info
    const expenses = await database.all(`
      SELECT e.*, s.name as shop_name, u.first_name, u.last_name
      FROM expenses e
      LEFT JOIN shops s ON e.shop_id = s.id
      LEFT JOIN users u ON e.created_by = u.id
      ${whereClause}
      ORDER BY e.expense_date DESC, e.created_at DESC
      LIMIT ? OFFSET ?
    `, [...params, limit, offset]);

    // Get total count for pagination
    const totalCount = await database.get(`
      SELECT COUNT(*) as count FROM expenses e ${whereClause}
    `, params);

    res.json({
      expenses,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: totalCount.count,
        pages: Math.ceil(totalCount.count / limit)
      }
    });
  } catch (error) {
    console.error('Get expenses error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get single expense
router.get('/:id', auth, async (req, res) => {
  try {
    const expense = await database.get(`
      SELECT e.*, s.name as shop_name, u.first_name, u.last_name
      FROM expenses e
      LEFT JOIN shops s ON e.shop_id = s.id
      LEFT JOIN users u ON e.created_by = u.id
      WHERE e.id = ? AND e.is_active = true
    `, [req.params.id]);

    if (!expense) {
      return res.status(404).json({ error: 'Expense not found' });
    }

    // Get GL account mappings for this expense
    const glMappings = await database.all(`
      SELECT 
        egm.*,
        a.account_code,
        a.account_name,
        a.account_type,
        c.name as category_name
      FROM expense_gl_mappings egm
      JOIN gl_accounts a ON egm.gl_account_id = a.id
      JOIN gl_account_categories c ON a.category_id = c.id
      WHERE egm.expense_id = ?
    `, [req.params.id]);

    expense.gl_accounts = glMappings;

    res.json({ expense });
  } catch (error) {
    console.error('Get expense error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Create new expense
router.post('/', auth, [
  body('category').trim().notEmpty().withMessage('Category is required'),
  body('description').trim().notEmpty().withMessage('Description is required'),
  body('amount').isFloat({ min: 0.01 }).withMessage('Valid amount is required'),
  body('expense_date').isISO8601().withMessage('Valid expense date is required'),
  body('shop_id').optional(),
  body('currency').optional().isIn(['USD', 'EUR', 'GBP', 'JPY', 'CNY', 'INR', 'AED', 'RWF']),
  body('is_recurring').optional().isBoolean(),
  body('recurring_frequency').optional().isIn(['daily', 'weekly', 'monthly', 'yearly']),
  body('gl_accounts').optional().isArray().withMessage('GL accounts must be an array'),
  body('gl_accounts.*.gl_account_id').optional().isUUID().withMessage('Valid GL account ID is required'),
  body('gl_accounts.*.amount').optional().isFloat({ min: 0.01 }).withMessage('Valid GL amount is required'),
  body('gl_accounts.*.allocation_percentage').optional().isFloat({ min: 0, max: 100 }).withMessage('Allocation percentage must be between 0 and 100')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const {
      category, description, amount, expense_date, shop_id, currency = 'RWF',
      receipt_url, is_recurring = false, recurring_frequency, gl_accounts = []
    } = req.body;

    // For cashiers, automatically assign their shop_id if not provided
    let finalShopId = shop_id;
    if (req.user.role === 'cashier' && !shop_id) {
      if (!req.user.shop_id) {
        return res.status(400).json({ error: 'Cashier must be assigned to a shop to create expenses' });
      }
      finalShopId = req.user.shop_id;
    }

    const expenseId = uuidv4();
    
    // Insert expense using the backward compatibility layer
    const result = await database.run(`
      INSERT INTO expenses (
        id, shop_id, category, description, amount, currency, expense_date, receipt_url, created_by
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [expenseId, finalShopId || null, category, description, amount, currency, expense_date, receipt_url || null, req.user.id]);

    res.status(201).json({
      message: 'Expense created successfully',
      expense: { id: expenseId, category, description, amount, expense_date }
    });
  } catch (error) {
    console.error('Create expense error:', error);
    res.status(500).json({ error: 'Server error', details: error.message });
  }
});

// Update expense
router.put('/:id', auth, [
  body('category').trim().notEmpty().withMessage('Category is required'),
  body('description').trim().notEmpty().withMessage('Description is required'),
  body('amount').isFloat({ min: 0.01 }).withMessage('Valid amount is required'),
  body('expense_date').isISO8601().withMessage('Valid expense date is required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const {
      category, description, amount, expense_date, shop_id, currency,
      receipt_url, is_recurring, recurring_frequency
    } = req.body;

    await database.run(`
      UPDATE expenses 
      SET category = ?, description = ?, amount = ?, expense_date = ?, shop_id = ?,
          currency = ?, receipt_url = ?, is_recurring = ?, recurring_frequency = ?,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `, [category, description, amount, expense_date, shop_id, currency,
        receipt_url, is_recurring, recurring_frequency, req.params.id]);

    res.json({ message: 'Expense updated successfully' });
  } catch (error) {
    console.error('Update expense error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Delete expense (soft delete)
router.delete('/:id', adminAuth, async (req, res) => {
  try {
    await database.run(`
      UPDATE expenses SET is_active = 0, updated_at = CURRENT_TIMESTAMP WHERE id = ?
    `, [req.params.id]);

    res.json({ message: 'Expense deleted successfully' });
  } catch (error) {
    console.error('Delete expense error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get expense categories
router.get('/categories/list', auth, async (req, res) => {
  try {
    const categories = await database.all(`
      SELECT DISTINCT category, COUNT(*) as count, SUM(amount) as total_amount
      FROM expenses 
      WHERE is_active = true
      GROUP BY category
      ORDER BY total_amount DESC
    `);

    res.json({ categories });
  } catch (error) {
    console.error('Get expense categories error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get expenses by GL account
router.get('/by-gl-account/:gl_account_id', auth, async (req, res) => {
  try {
    const { start_date, end_date, page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;

    let whereClause = 'WHERE egm.gl_account_id = ? AND e.is_active = true';
    const params = [req.params.gl_account_id];

    if (start_date) {
      whereClause += ' AND e.expense_date >= ?';
      params.push(start_date);
    }

    if (end_date) {
      whereClause += ' AND e.expense_date <= ?';
      params.push(end_date);
    }

    const expenses = await database.all(`
      SELECT 
        e.*,
        s.name as shop_name,
        u.first_name,
        u.last_name,
        egm.amount as gl_amount,
        egm.allocation_percentage,
        egm.notes as gl_notes
      FROM expenses e
      JOIN expense_gl_mappings egm ON e.id = egm.expense_id
      LEFT JOIN shops s ON e.shop_id = s.id
      LEFT JOIN users u ON e.created_by = u.id
      ${whereClause}
      ORDER BY e.expense_date DESC, e.created_at DESC
      LIMIT ? OFFSET ?
    `, [...params, limit, offset]);

    const totalCount = await database.get(`
      SELECT COUNT(*) as count 
      FROM expenses e
      JOIN expense_gl_mappings egm ON e.id = egm.expense_id
      ${whereClause}
    `, params);

    res.json({
      expenses,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: totalCount.count,
        pages: Math.ceil(totalCount.count / limit)
      }
    });
  } catch (error) {
    console.error('Get expenses by GL account error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get GL account summary for expenses
router.get('/gl-summary', auth, async (req, res) => {
  try {
    const { start_date, end_date, group_by = 'account' } = req.query;
    
    let dateFilter = '';
    const params = [];
    
    if (start_date) {
      dateFilter += ' AND e.expense_date >= ?';
      params.push(start_date);
    }
    
    if (end_date) {
      dateFilter += ' AND e.expense_date <= ?';
      params.push(end_date);
    }

    let groupByClause = '';
    let selectClause = '';
    
    if (group_by === 'category') {
      groupByClause = 'GROUP BY c.id, c.name, c.code';
      selectClause = 'c.name as group_name, c.code as group_code, c.account_type';
    } else {
      groupByClause = 'GROUP BY a.id, a.account_code, a.account_name, c.name, c.code';
      selectClause = 'a.account_name as group_name, a.account_code as group_code, c.name as category_name, c.account_type';
    }

    const summary = await database.all(`
      SELECT 
        ${selectClause},
        COUNT(DISTINCT e.id) as expense_count,
        SUM(egm.amount) as total_amount,
        AVG(egm.amount) as avg_amount
      FROM expense_gl_mappings egm
      JOIN expenses e ON egm.expense_id = e.id
      JOIN gl_accounts a ON egm.gl_account_id = a.id
      JOIN gl_account_categories c ON a.category_id = c.id
      WHERE e.is_active = true ${dateFilter}
      ${groupByClause}
      ORDER BY total_amount DESC
    `, params);

    res.json({ summary });
  } catch (error) {
    console.error('Get GL summary error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get expense statistics
router.get('/stats/overview', auth, async (req, res) => {
  try {
    const { shop_id, start_date, end_date } = req.query;

    let whereClause = 'WHERE e.is_active = true';
    const params = [];

    if (shop_id) {
      whereClause += ' AND e.shop_id = ?';
      params.push(shop_id);
    }

    if (start_date) {
      whereClause += ' AND e.expense_date >= ?';
      params.push(start_date);
    }

    if (end_date) {
      whereClause += ' AND e.expense_date <= ?';
      params.push(end_date);
    }

    // Total expenses
    const totalExpenses = await database.get(`
      SELECT 
        COUNT(*) as total_count,
        SUM(amount) as total_amount,
        AVG(amount) as avg_amount
      FROM expenses e ${whereClause}
    `, params);

    // Expenses by category
    const expensesByCategory = await database.all(`
      SELECT 
        category,
        COUNT(*) as count,
        SUM(amount) as total_amount,
        AVG(amount) as avg_amount
      FROM expenses e ${whereClause}
      GROUP BY category
      ORDER BY total_amount DESC
    `, params);

    // Expenses by shop
    const expensesByShop = await database.all(`
      SELECT 
        s.name as shop_name,
        COUNT(e.id) as count,
        SUM(e.amount) as total_amount
      FROM expenses e
      LEFT JOIN shops s ON e.shop_id = s.id
      ${whereClause}
      GROUP BY e.shop_id
      ORDER BY total_amount DESC
    `, params);

    // Monthly trend
    const monthlyTrend = await database.all(`
      SELECT 
        strftime('%Y-%m', expense_date) as month,
        COUNT(*) as count,
        SUM(amount) as total_amount
      FROM expenses e ${whereClause}
      GROUP BY strftime('%Y-%m', expense_date)
      ORDER BY month DESC
      LIMIT 12
    `, params);

    // Recurring expenses
    const recurringExpenses = await database.get(`
      SELECT 
        COUNT(*) as count,
        SUM(amount) as total_amount
      FROM expenses e ${whereClause} AND e.is_recurring = 1
    `, params);

    res.json({
      total_expenses: totalExpenses,
      expenses_by_category: expensesByCategory,
      expenses_by_shop: expensesByShop,
      monthly_trend: monthlyTrend,
      recurring_expenses: recurringExpenses
    });
  } catch (error) {
    console.error('Get expense stats error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get expense vs revenue comparison
router.get('/stats/vs-revenue', auth, async (req, res) => {
  try {
    const { shop_id, period = 'month' } = req.query;

    let dateFilter = '';
    switch (period) {
      case 'week':
        dateFilter = "AND date >= NOW() - INTERVAL '7 days'";
        break;
      case 'month':
        dateFilter = "AND date >= NOW() - INTERVAL '30 days'";
        break;
      case 'year':
        dateFilter = "AND date >= NOW() - INTERVAL '365 days'";
        break;
    }

    let shopFilter = '';
    const params = [];
    if (shop_id) {
      shopFilter = 'AND shop_id = ?';
      params.push(shop_id);
    }

    // Get expenses
    const expenses = await database.get(`
      SELECT SUM(amount) as total_expenses
      FROM expenses 
      WHERE is_active = true ${shopFilter} ${dateFilter}
    `, params);

    // Get revenue
    const revenue = await database.get(`
      SELECT SUM(total_amount) as total_revenue
      FROM orders 
      WHERE status = 'completed' ${shopFilter} ${dateFilter}
    `, params);

    const totalExpenses = expenses.total_expenses || 0;
    const totalRevenue = revenue.total_revenue || 0;
    const profit = totalRevenue - totalExpenses;
    const profitMargin = totalRevenue > 0 ? (profit / totalRevenue) * 100 : 0;

    res.json({
      expenses: totalExpenses,
      revenue: totalRevenue,
      profit: profit,
      profit_margin: profitMargin,
      period: period
    });
  } catch (error) {
    console.error('Get expense vs revenue error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Bulk import expenses
router.post('/bulk-import', adminAuth, [
  body('expenses').isArray().withMessage('Expenses array is required'),
  body('expenses.*.category').trim().notEmpty().withMessage('Category is required'),
  body('expenses.*.description').trim().notEmpty().withMessage('Description is required'),
  body('expenses.*.amount').isFloat({ min: 0.01 }).withMessage('Valid amount is required'),
  body('expenses.*.expense_date').isISO8601().withMessage('Valid expense date is required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { expenses } = req.body;
    const importedExpenses = [];

    for (const expense of expenses) {
      const {
        category, description, amount, expense_date, shop_id, currency = 'RWF',
        receipt_url, is_recurring = false, recurring_frequency
      } = expense;

      const expenseId = uuidv4();
      await database.run(`
        INSERT INTO expenses (
          id, shop_id, category, description, amount, currency, expense_date,
          receipt_url, is_recurring, recurring_frequency, created_by
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [expenseId, shop_id, category, description, amount, currency, expense_date,
          receipt_url, is_recurring, recurring_frequency, req.user.id]);

      importedExpenses.push({ id: expenseId, category, description, amount });
    }

    res.status(201).json({
      message: `${importedExpenses.length} expenses imported successfully`,
      imported_expenses: importedExpenses
    });
  } catch (error) {
    console.error('Bulk import expenses error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router; 