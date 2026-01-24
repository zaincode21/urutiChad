const { v4: uuidv4 } = require('uuid');

class GLAccountsData {
  async initializeGLAccounts(db) {
    // Insert default GL account categories
    const defaultCategories = [
      { code: '1000', name: 'Current Assets', account_type: 'asset', parent_id: null, level: 0 },
      { code: '1100', name: 'Cash and Cash Equivalents', account_type: 'asset', parent_id: '1000', level: 1 },
      { code: '1200', name: 'Accounts Receivable', account_type: 'asset', parent_id: '1000', level: 1 },
      { code: '1300', name: 'Inventory', account_type: 'asset', parent_id: '1000', level: 1 },
      { code: '1400', name: 'Prepaid Expenses', account_type: 'asset', parent_id: '1000', level: 1 },
      
      { code: '2000', name: 'Current Liabilities', account_type: 'liability', parent_id: null, level: 0 },
      { code: '2100', name: 'Accounts Payable', account_type: 'liability', parent_id: '2000', level: 1 },
      { code: '2200', name: 'Accrued Expenses', account_type: 'liability', parent_id: '2000', level: 1 },
      
      { code: '3000', name: 'Equity', account_type: 'equity', parent_id: null, level: 0 },
      { code: '3100', name: 'Owner\'s Equity', account_type: 'equity', parent_id: '3000', level: 1 },
      { code: '3200', name: 'Retained Earnings', account_type: 'equity', parent_id: '3000', level: 1 },
      
      { code: '4000', name: 'Revenue', account_type: 'revenue', parent_id: null, level: 0 },
      { code: '4100', name: 'Sales Revenue', account_type: 'revenue', parent_id: '4000', level: 1 },
      { code: '4200', name: 'Other Income', account_type: 'revenue', parent_id: '4000', level: 1 },
      
      { code: '5000', name: 'Cost of Goods Sold', account_type: 'expense', parent_id: null, level: 0 },
      { code: '5100', name: 'Direct Materials', account_type: 'expense', parent_id: '5000', level: 1 },
      { code: '5200', name: 'Direct Labor', account_type: 'expense', parent_id: '5000', level: 1 },
      { code: '5300', name: 'Manufacturing Overhead', account_type: 'expense', parent_id: '5000', level: 1 },
      
      { code: '6000', name: 'Operating Expenses', account_type: 'expense', parent_id: null, level: 0 },
      { code: '6100', name: 'Selling Expenses', account_type: 'expense', parent_id: '6000', level: 1 },
      { code: '6200', name: 'Administrative Expenses', account_type: 'expense', parent_id: '6000', level: 1 },
      { code: '6300', name: 'Research and Development', account_type: 'expense', parent_id: '6000', level: 1 },
      { code: '6400', name: 'Depreciation and Amortization', account_type: 'expense', parent_id: '6000', level: 1 },
      { code: '6500', name: 'Interest Expense', account_type: 'expense', parent_id: '6000', level: 1 },
      { code: '6600', name: 'Taxes', account_type: 'expense', parent_id: '6000', level: 1 }
    ];

    // First, get existing category IDs from the database
    const codeToId = {};
    for (const category of defaultCategories) {
      const result = await db.query('SELECT id FROM gl_account_categories WHERE code = $1', [category.code]);
      if (result.rows.length > 0) {
        codeToId[category.code] = result.rows[0].id;
      } else {
        // If category doesn't exist, create it
        const id = uuidv4();
        codeToId[category.code] = id;
        
        await db.query(`
          INSERT INTO gl_account_categories (id, code, name, account_type, parent_id, level)
          VALUES ($1, $2, $3, $4, $5, $6)
        `, [id, category.code, category.name, category.account_type, null, category.level]);
      }
    }
    
    // Then, update parent references for categories that have parents
    for (const category of defaultCategories) {
      if (category.parent_id) {
        // Get the parent UUID from our mapping
        const parentUuid = codeToId[category.parent_id];
        if (parentUuid) {
          await db.query(`
            UPDATE gl_account_categories 
            SET parent_id = $1 
            WHERE code = $2
          `, [parentUuid, category.code]);
        }
      }
    }

    // Insert default GL accounts
    const defaultAccounts = [
      // Cash and Cash Equivalents
      { account_code: '1001', account_name: 'Cash on Hand', category_id: '1100', account_type: 'asset', normal_balance: 'debit' },
      { account_code: '1002', account_name: 'Bank Account', category_id: '1100', account_type: 'asset', normal_balance: 'debit' },
      
      // Accounts Receivable
      { account_code: '1201', account_name: 'Trade Receivables', category_id: '1200', account_type: 'asset', normal_balance: 'debit' },
      
      // Inventory
      { account_code: '1301', account_name: 'Raw Materials', category_id: '1300', account_type: 'asset', normal_balance: 'debit' },
      { account_code: '1302', account_name: 'Work in Progress', category_id: '1300', account_type: 'asset', normal_balance: 'debit' },
      { account_code: '1303', account_name: 'Finished Goods', category_id: '1300', account_type: 'asset', normal_balance: 'debit' },
      
      // Prepaid Expenses
      { account_code: '1401', account_name: 'Prepaid Rent', category_id: '1400', account_type: 'asset', normal_balance: 'debit' },
      { account_code: '1402', account_name: 'Prepaid Insurance', category_id: '1400', account_type: 'asset', normal_balance: 'debit' },
      
      // Accounts Payable
      { account_code: '2101', account_name: 'Trade Payables', category_id: '2100', account_type: 'liability', normal_balance: 'credit' },
      
      // Accrued Expenses
      { account_code: '2201', account_name: 'Accrued Salaries', category_id: '2200', account_type: 'liability', normal_balance: 'credit' },
      { account_code: '2202', account_name: 'Accrued Utilities', category_id: '2200', account_type: 'liability', normal_balance: 'credit' },
      
      // Owner's Equity
      { account_code: '3101', account_name: 'Capital', category_id: '3100', account_type: 'equity', normal_balance: 'credit' },
      { account_code: '3102', account_name: 'Owner\'s Draw', category_id: '3100', account_type: 'equity', normal_balance: 'debit' },
      
      // Sales Revenue
      { account_code: '4101', account_name: 'Product Sales', category_id: '4100', account_type: 'revenue', normal_balance: 'credit' },
      { account_code: '4102', account_name: 'Service Revenue', category_id: '4100', account_type: 'revenue', normal_balance: 'credit' },
      
      // Direct Materials
      { account_code: '5101', account_name: 'Raw Materials Used', category_id: '5100', account_type: 'expense', normal_balance: 'debit' },
      { account_code: '5102', account_name: 'Packaging Materials', category_id: '5100', account_type: 'expense', normal_balance: 'debit' },
      
      // Direct Labor
      { account_code: '5201', account_name: 'Production Wages', category_id: '5200', account_type: 'expense', normal_balance: 'debit' },
      
      // Manufacturing Overhead
      { account_code: '5301', account_name: 'Factory Rent', category_id: '5300', account_type: 'expense', normal_balance: 'debit' },
      { account_code: '5302', account_name: 'Factory Utilities', category_id: '5300', account_type: 'expense', normal_balance: 'debit' },
      { account_code: '5303', account_name: 'Factory Equipment', category_id: '5300', account_type: 'expense', normal_balance: 'debit' },
      
      // Selling Expenses
      { account_code: '6101', account_name: 'Advertising', category_id: '6100', account_type: 'expense', normal_balance: 'debit' },
      { account_code: '6102', account_name: 'Sales Commissions', category_id: '6100', account_type: 'expense', normal_balance: 'debit' },
      { account_code: '6103', account_name: 'Marketing', category_id: '6100', account_type: 'expense', normal_balance: 'debit' },
      
      // Administrative Expenses
      { account_code: '6201', account_name: 'Office Rent', category_id: '6200', account_type: 'expense', normal_balance: 'debit' },
      { account_code: '6202', account_name: 'Office Supplies', category_id: '6200', account_type: 'expense', normal_balance: 'debit' },
      { account_code: '6203', account_name: 'Salaries and Wages', category_id: '6200', account_type: 'expense', normal_balance: 'debit' },
      { account_code: '6204', account_name: 'Utilities', category_id: '6200', account_type: 'expense', normal_balance: 'debit' },
      { account_code: '6205', account_name: 'Insurance', category_id: '6200', account_type: 'expense', normal_balance: 'debit' },
      { account_code: '6206', account_name: 'Maintenance', category_id: '6200', account_type: 'expense', normal_balance: 'debit' },
      { account_code: '6207', account_name: 'Travel and Entertainment', category_id: '6200', account_type: 'expense', normal_balance: 'debit' },
      { account_code: '6208', account_name: 'Professional Services', category_id: '6200', account_type: 'expense', normal_balance: 'debit' },
      
      // Research and Development
      { account_code: '6301', account_name: 'R&D Salaries', category_id: '6300', account_type: 'expense', normal_balance: 'debit' },
      { account_code: '6302', account_name: 'R&D Materials', category_id: '6300', account_type: 'expense', normal_balance: 'debit' },
      
      // Depreciation and Amortization
      { account_code: '6401', account_name: 'Depreciation Expense', category_id: '6400', account_type: 'expense', normal_balance: 'debit' },
      { account_code: '6402', account_name: 'Amortization Expense', category_id: '6400', account_type: 'expense', normal_balance: 'debit' },
      
      // Interest Expense
      { account_code: '6501', account_name: 'Interest on Loans', category_id: '6500', account_type: 'expense', normal_balance: 'debit' },
      
      // Taxes
      { account_code: '6601', account_name: 'Income Tax Expense', category_id: '6600', account_type: 'expense', normal_balance: 'debit' },
      { account_code: '6602', account_name: 'Property Tax', category_id: '6600', account_type: 'expense', normal_balance: 'debit' }
    ];

    // Get the actual category IDs from the database for GL accounts
    const categoryIdMap = {};
    for (const category of defaultCategories) {
      const result = await db.query('SELECT id FROM gl_account_categories WHERE code = $1', [category.code]);
      if (result.rows.length > 0) {
        categoryIdMap[category.code] = result.rows[0].id;
      }
    }

    for (const account of defaultAccounts) {
      const accountId = uuidv4();
      const categoryId = categoryIdMap[account.category_id];
      
      if (categoryId) {
        await db.query(`
          INSERT INTO gl_accounts (id, account_code, account_name, category_id, account_type, normal_balance)
          VALUES ($1, $2, $3, $4, $5, $6)
          ON CONFLICT (account_code) DO NOTHING
        `, [accountId, account.account_code, account.account_name, categoryId, account.account_type, account.normal_balance]);
      } else {
        console.warn(`Warning: Category ${account.category_id} not found for account ${account.account_code}`);
      }
    }
  }
}

module.exports = new GLAccountsData();

