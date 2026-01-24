const express = require('express');
const router = express.Router();
const database = require('../database/database');
const { v4: uuidv4 } = require('uuid');
const { auth } = require('../middleware/auth');

// Apply authentication to all routes
router.use(auth);

// Get all GL account categories
router.get('/categories', async (req, res) => {
  try {
    const categories = await database.all(`
      SELECT 
        c.*,
        p.name as parent_name,
        (SELECT COUNT(*) FROM gl_accounts WHERE category_id = c.id AND is_active = true) as account_count
      FROM gl_account_categories c
      LEFT JOIN gl_account_categories p ON c.parent_id = p.id
      WHERE c.is_active = true
      ORDER BY c.code
    `);
    
    res.json({ categories });
  } catch (error) {
    console.error('Error fetching GL categories:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Create new GL account category
router.post('/categories', async (req, res) => {
  try {
    const { code, name, description, account_type, parent_id, level, sort_order } = req.body;
    
    // Validate required fields
    if (!code || !name || !account_type) {
      return res.status(400).json({ error: 'Missing required fields: code, name, and account_type are required' });
    }
    
    // Validate account type
    if (!['asset', 'liability', 'equity', 'revenue', 'expense'].includes(account_type)) {
      return res.status(400).json({ error: 'Invalid account type. Must be one of: asset, liability, equity, revenue, expense' });
    }
    
    // Check if category code already exists
    const existingCategory = await database.get(
      'SELECT id FROM gl_account_categories WHERE code = ?',
      [code]
    );
    
    if (existingCategory) {
      return res.status(400).json({ error: 'Category code already exists' });
    }
    
    // Validate parent category if provided
    if (parent_id) {
      const parentCategory = await database.get(
        'SELECT id, account_type FROM gl_account_categories WHERE id = ? AND is_active = true',
        [parent_id]
      );
      
      if (!parentCategory) {
        return res.status(400).json({ error: 'Parent category not found' });
      }
      
      // Ensure parent and child have same account type
      if (parentCategory.account_type !== account_type) {
        return res.status(400).json({ error: 'Child category must have the same account type as parent' });
      }
    }
    
    const id = uuidv4();
    await database.run(`
      INSERT INTO gl_account_categories (id, code, name, description, account_type, parent_id, level, sort_order)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `, [id, code, name, description || null, account_type, parent_id || null, level || 0, sort_order || 0]);
    
    const newCategory = await database.get(`
      SELECT 
        c.*,
        p.name as parent_name,
        (SELECT COUNT(*) FROM gl_accounts WHERE category_id = c.id AND is_active = true) as account_count
      FROM gl_account_categories c
      LEFT JOIN gl_account_categories p ON c.parent_id = p.id
      WHERE c.id = ?
    `, [id]);
    
    res.status(201).json({ category: newCategory });
  } catch (error) {
    console.error('Error creating GL category:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Update GL account category
router.put('/categories/:id', async (req, res) => {
  try {
    const { name, description, account_type, parent_id, level, sort_order } = req.body;
    
    // Check if category exists
    const existingCategory = await database.get(
      'SELECT id FROM gl_account_categories WHERE id = ? AND is_active = true',
      [req.params.id]
    );
    
    if (!existingCategory) {
      return res.status(404).json({ error: 'GL category not found' });
    }
    
    // Validate account type if provided
    if (account_type && !['asset', 'liability', 'equity', 'revenue', 'expense'].includes(account_type)) {
      return res.status(400).json({ error: 'Invalid account type' });
    }
    
    // Update category
    await database.run(`
      UPDATE gl_account_categories 
      SET name = ?, description = ?, account_type = ?, parent_id = ?, level = ?, sort_order = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `, [name, description, account_type, parent_id, level, sort_order, req.params.id]);
    
    const updatedCategory = await database.get(`
      SELECT 
        c.*,
        p.name as parent_name,
        (SELECT COUNT(*) FROM gl_accounts WHERE category_id = c.id AND is_active = true) as account_count
      FROM gl_account_categories c
      LEFT JOIN gl_account_categories p ON c.parent_id = p.id
      WHERE c.id = ?
    `, [req.params.id]);
    
    res.json({ category: updatedCategory });
  } catch (error) {
    console.error('Error updating GL category:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Delete GL account category (soft delete)
router.delete('/categories/:id', async (req, res) => {
  try {
    // Check if category exists
    const existingCategory = await database.get(
      'SELECT id FROM gl_account_categories WHERE id = ? AND is_active = true',
      [req.params.id]
    );
    
    if (!existingCategory) {
      return res.status(404).json({ error: 'GL category not found' });
    }
    
    // Check if category has accounts
    const hasAccounts = await database.get(`
      SELECT COUNT(*) as count FROM gl_accounts WHERE category_id = ? AND is_active = true
    `, [req.params.id]);
    
    if (hasAccounts.count > 0) {
      return res.status(400).json({ 
        error: 'Cannot delete category that has accounts. Please move or delete accounts first.' 
      });
    }
    
    // Check if category has child categories
    const hasChildren = await database.get(`
      SELECT COUNT(*) as count FROM gl_account_categories WHERE parent_id = ? AND is_active = true
    `, [req.params.id]);
    
    if (hasChildren.count > 0) {
      return res.status(400).json({ 
        error: 'Cannot delete category that has child categories. Please delete child categories first.' 
      });
    }
    
    // Soft delete
    await database.run(`
      UPDATE gl_account_categories SET is_active = 0, updated_at = CURRENT_TIMESTAMP WHERE id = ?
    `, [req.params.id]);
    
    res.json({ message: 'GL category deleted successfully' });
  } catch (error) {
    console.error('Error deleting GL category:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get all GL accounts
router.get('/accounts', async (req, res) => {
  try {
    const { category_id, account_type, search } = req.query;
    
    let sql = `
      SELECT 
        a.*,
        c.name as category_name,
        c.code as category_code,
        c.account_type as category_type
      FROM gl_accounts a
      JOIN gl_account_categories c ON a.category_id = c.id
      WHERE a.is_active = true
    `;
    
    const params = [];
    
    if (category_id) {
      sql += ' AND a.category_id = ?';
      params.push(category_id);
    }
    
    if (account_type) {
      sql += ' AND c.account_type = ?';
      params.push(account_type);
    }
    
    if (search) {
      sql += ' AND (a.account_name LIKE ? OR a.account_code LIKE ?)';
      params.push(`%${search}%`, `%${search}%`);
    }
    
    sql += ' ORDER BY a.account_code';
    
    const accounts = await database.all(sql, params);
    res.json({ accounts });
  } catch (error) {
    console.error('Error fetching GL accounts:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get GL account by ID
router.get('/accounts/:id', async (req, res) => {
  try {
    const account = await database.get(`
      SELECT 
        a.*,
        c.name as category_name,
        c.code as category_code,
        c.account_type as category_type
      FROM gl_accounts a
      JOIN gl_account_categories c ON a.category_id = c.id
      WHERE a.id = ? AND a.is_active = true
    `, [req.params.id]);
    
    if (!account) {
      return res.status(404).json({ error: 'GL account not found' });
    }
    
    res.json({ account });
  } catch (error) {
    console.error('Error fetching GL account:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Create new GL account
router.post('/accounts', async (req, res) => {
  try {
    const { account_code, account_name, description, category_id, account_type, normal_balance } = req.body;
    
    // Validate required fields
    if (!account_code || !account_name || !category_id || !account_type || !normal_balance) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    
    // Check if account code already exists
    const existingAccount = await database.get(
      'SELECT id FROM gl_accounts WHERE account_code = ?',
      [account_code]
    );
    
    if (existingAccount) {
      return res.status(400).json({ error: 'Account code already exists' });
    }
    
    // Validate account type and normal balance
    if (!['asset', 'liability', 'equity', 'revenue', 'expense'].includes(account_type)) {
      return res.status(400).json({ error: 'Invalid account type' });
    }
    
    if (!['debit', 'credit'].includes(normal_balance)) {
      return res.status(400).json({ error: 'Invalid normal balance' });
    }
    
    const id = uuidv4();
    await database.run(`
      INSERT INTO gl_accounts (id, account_code, account_name, description, category_id, account_type, normal_balance)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `, [id, account_code, account_name, description, category_id, account_type, normal_balance]);
    
    const newAccount = await database.get(`
      SELECT 
        a.*,
        c.name as category_name,
        c.code as category_code,
        c.account_type as category_type
      FROM gl_accounts a
      JOIN gl_account_categories c ON a.category_id = c.id
      WHERE a.id = ?
    `, [id]);
    
    res.status(201).json({ account: newAccount });
  } catch (error) {
    console.error('Error creating GL account:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Update GL account
router.put('/accounts/:id', async (req, res) => {
  try {
    const { account_name, description, category_id, account_type, normal_balance } = req.body;
    
    // Check if account exists
    const existingAccount = await database.get(
      'SELECT id FROM gl_accounts WHERE id = ? AND is_active = true',
      [req.params.id]
    );
    
    if (!existingAccount) {
      return res.status(404).json({ error: 'GL account not found' });
    }
    
    // Update account
    await database.run(`
      UPDATE gl_accounts 
      SET account_name = ?, description = ?, category_id = ?, account_type = ?, normal_balance = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `, [account_name, description, category_id, account_type, normal_balance, req.params.id]);
    
    const updatedAccount = await database.get(`
      SELECT 
        a.*,
        c.name as category_name,
        c.code as category_code,
        c.account_type as category_type
      FROM gl_accounts a
      JOIN gl_account_categories c ON a.category_id = c.id
      WHERE a.id = ?
    `, [req.params.id]);
    
    res.json({ account: updatedAccount });
  } catch (error) {
    console.error('Error updating GL account:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Delete GL account (soft delete)
router.delete('/accounts/:id', async (req, res) => {
  try {
    // Check if account exists
    const existingAccount = await database.get(
      'SELECT id FROM gl_accounts WHERE id = ? AND is_active = true',
      [req.params.id]
    );
    
    if (!existingAccount) {
      return res.status(404).json({ error: 'GL account not found' });
    }
    
    // Check if account is used in any transactions
    const usedInTransactions = await database.get(`
      SELECT COUNT(*) as count FROM expense_gl_mappings WHERE gl_account_id = ?
    `, [req.params.id]);
    
    if (usedInTransactions.count > 0) {
      return res.status(400).json({ 
        error: 'Cannot delete account that is used in transactions. Consider deactivating instead.' 
      });
    }
    
    // Soft delete
    await database.run(`
      UPDATE gl_accounts SET is_active = 0, updated_at = CURRENT_TIMESTAMP WHERE id = ?
    `, [req.params.id]);
    
    res.json({ message: 'GL account deleted successfully' });
  } catch (error) {
    console.error('Error deleting GL account:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get GL account hierarchy (tree structure)
router.get('/hierarchy', async (req, res) => {
  try {
    const categories = await database.all(`
      SELECT 
        c.*,
        (SELECT COUNT(*) FROM gl_accounts WHERE category_id = c.id AND is_active = true) as account_count
      FROM gl_account_categories c
      WHERE c.is_active = true
      ORDER BY c.code
    `);
    
    // Build hierarchy
    const buildHierarchy = (parentId = null) => {
      return categories
        .filter(cat => cat.parent_id === parentId)
        .map(cat => ({
          ...cat,
          children: buildHierarchy(cat.id)
        }));
    };
    
    const hierarchy = buildHierarchy();
    console.log(`GL Hierarchy API: Found ${hierarchy.length} top-level categories`);
    res.json({ hierarchy });
  } catch (error) {
    console.error('Error fetching GL hierarchy:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get GL account balances (for trial balance)
router.get('/balances', async (req, res) => {
  try {
    const { as_of_date, period } = req.query;
    
    let dateFilter = '';
    const params = [];
    
    // Handle period parameter for different time ranges
    let targetDate = as_of_date;
    if (period && !as_of_date) {
      const now = new Date();
      switch (period) {
        case 'current-month':
          targetDate = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
          break;
        case 'current-quarter':
          const quarter = Math.floor(now.getMonth() / 3);
          targetDate = new Date(now.getFullYear(), quarter * 3, 1).toISOString().split('T')[0];
          break;
        case 'current-year':
          targetDate = new Date(now.getFullYear(), 0, 1).toISOString().split('T')[0];
          break;
        case 'all-time':
          targetDate = null;
          break;
        default:
          targetDate = now.toISOString().split('T')[0];
      }
    }
    
    const balances = await database.all(`
      SELECT 
        a.id,
        a.account_code,
        a.account_name,
        a.account_type,
        a.normal_balance,
        c.name as category_name,
        COALESCE(SUM(CASE WHEN jel.debit_amount > 0 THEN jel.debit_amount ELSE 0 END), 0) as total_debits,
        COALESCE(SUM(CASE WHEN jel.credit_amount > 0 THEN jel.credit_amount ELSE 0 END), 0) as total_credits
      FROM gl_accounts a
      JOIN gl_account_categories c ON a.category_id = c.id
      LEFT JOIN gl_journal_entry_lines jel ON a.id = jel.gl_account_id
      LEFT JOIN gl_journal_entries je ON jel.journal_entry_id = je.id
      WHERE a.is_active = true
        AND (je.entry_date <= ? OR je.entry_date IS NULL)
        AND (je.status = 'posted' OR je.status IS NULL)
      GROUP BY a.id, a.account_code, a.account_name, a.account_type, a.normal_balance, c.name
      ORDER BY a.account_code
    `, [targetDate || '9999-12-31']);
    
    // Calculate proper balances based on normal balance
    balances.forEach(account => {
      if (account.normal_balance === 'credit') {
        account.balance = account.total_credits - account.total_debits;
      } else {
        account.balance = account.total_debits - account.total_credits;
      }
      
      // For display purposes, show absolute value but keep sign for calculations
      account.display_balance = Math.abs(account.balance);
    });
    
    console.log(`GL Balances API: Found ${balances.length} accounts, period: ${period}, targetDate: ${targetDate}`);
    res.json({ balances });
  } catch (error) {
    console.error('Error fetching GL balances:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
