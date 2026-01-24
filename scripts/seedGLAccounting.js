const database = require('../server/database/database');
const { v4: uuidv4 } = require('uuid');

async function seedGLAccounting() {
  try {
    console.log('🌱 Starting GL Accounting seeding...');

    // 1. Add more detailed GL account categories
    console.log('📊 Adding detailed GL account categories...');
    const detailedCategories = [
      // Perfume Industry Specific Categories
      { code: '1101', name: 'Cash Management', account_type: 'asset', parent_id: '1100', level: 1 },
      { code: '1102', name: 'Bank Accounts', account_type: 'asset', parent_id: '1100', level: 1 },
      { code: '1103', name: 'Petty Cash', account_type: 'asset', parent_id: '1100', level: 1 },
      
      { code: '1201', name: 'Customer Receivables', account_type: 'asset', parent_id: '1200', level: 1 },
      { code: '1202', name: 'Allowance for Doubtful Accounts', account_type: 'asset', parent_id: '1200', level: 1 },
      
      { code: '1301', name: 'Raw Materials - Essential Oils', account_type: 'asset', parent_id: '1300', level: 1 },
      { code: '1302', name: 'Raw Materials - Alcohol Base', account_type: 'asset', parent_id: '1300', level: 1 },
      { code: '1303', name: 'Raw Materials - Packaging', account_type: 'asset', parent_id: '1300', level: 1 },
      { code: '1304', name: 'Work in Progress - Blending', account_type: 'asset', parent_id: '1300', level: 1 },
      { code: '1305', name: 'Finished Goods - Perfumes', account_type: 'asset', parent_id: '1300', level: 1 },
      
      { code: '1401', name: 'Prepaid Rent - Factory', account_type: 'asset', parent_id: '1400', level: 1 },
      { code: '1402', name: 'Prepaid Rent - Office', account_type: 'asset', parent_id: '1400', level: 1 },
      { code: '1403', name: 'Prepaid Insurance', account_type: 'asset', parent_id: '1400', level: 1 },
      { code: '1404', name: 'Prepaid Subscriptions', account_type: 'asset', parent_id: '1400', level: 1 },
      
      { code: '1501', name: 'Equipment - Blending', account_type: 'asset', parent_id: '1500', level: 1 },
      { code: '1502', name: 'Equipment - Bottling', account_type: 'asset', parent_id: '1500', level: 1 },
      { code: '1503', name: 'Equipment - Testing', account_type: 'asset', parent_id: '1500', level: 1 },
      { code: '1504', name: 'Office Equipment', account_type: 'asset', parent_id: '1500', level: 1 },
      { code: '1505', name: 'Vehicles', account_type: 'asset', parent_id: '1500', level: 1 },
      
      { code: '1601', name: 'Accumulated Depreciation - Equipment', account_type: 'asset', parent_id: '1600', level: 1 },
      { code: '1602', name: 'Accumulated Depreciation - Vehicles', account_type: 'asset', parent_id: '1600', level: 1 },
      
      // Perfume Industry Specific Expense Categories
      { code: '6101', name: 'Marketing - Digital', account_type: 'expense', parent_id: '6100', level: 1 },
      { code: '6102', name: 'Marketing - Print', account_type: 'expense', parent_id: '6100', level: 1 },
      { code: '6103', name: 'Marketing - Events', account_type: 'expense', parent_id: '6100', level: 1 },
      { code: '6104', name: 'Sales Commissions', account_type: 'expense', parent_id: '6100', level: 1 },
      { code: '6105', name: 'Trade Shows', account_type: 'expense', parent_id: '6100', level: 1 },
      
      { code: '6201', name: 'Office Rent', account_type: 'expense', parent_id: '6200', level: 1 },
      { code: '6202', name: 'Office Utilities', account_type: 'expense', parent_id: '6200', level: 1 },
      { code: '6203', name: 'Office Supplies', account_type: 'expense', parent_id: '6200', level: 1 },
      { code: '6204', name: 'Salaries - Management', account_type: 'expense', parent_id: '6200', level: 1 },
      { code: '6205', name: 'Salaries - Administrative', account_type: 'expense', parent_id: '6200', level: 1 },
      { code: '6206', name: 'Employee Benefits', account_type: 'expense', parent_id: '6200', level: 1 },
      { code: '6207', name: 'Professional Services - Legal', account_type: 'expense', parent_id: '6200', level: 1 },
      { code: '6208', name: 'Professional Services - Accounting', account_type: 'expense', parent_id: '6200', level: 1 },
      { code: '6209', name: 'Professional Services - Consulting', account_type: 'expense', parent_id: '6200', level: 1 },
      { code: '6210', name: 'Travel and Entertainment', account_type: 'expense', parent_id: '6200', level: 1 },
      { code: '6211', name: 'Insurance - General', account_type: 'expense', parent_id: '6200', level: 1 },
      { code: '6212', name: 'Insurance - Professional Liability', account_type: 'expense', parent_id: '6200', level: 1 },
      { code: '6213', name: 'Maintenance - Office', account_type: 'expense', parent_id: '6200', level: 1 },
      { code: '6214', name: 'Maintenance - Equipment', account_type: 'expense', parent_id: '6200', level: 1 },
      
      { code: '6301', name: 'R&D - Perfume Formulation', account_type: 'expense', parent_id: '6300', level: 1 },
      { code: '6302', name: 'R&D - Testing and Quality', account_type: 'expense', parent_id: '6300', level: 1 },
      { code: '6303', name: 'R&D - New Product Development', account_type: 'expense', parent_id: '6300', level: 1 },
      { code: '6304', name: 'R&D - Regulatory Compliance', account_type: 'expense', parent_id: '6300', level: 1 },
      
      { code: '6401', name: 'Depreciation - Equipment', account_type: 'expense', parent_id: '6400', level: 1 },
      { code: '6402', name: 'Depreciation - Vehicles', account_type: 'expense', parent_id: '6400', level: 1 },
      { code: '6403', name: 'Amortization - Intangibles', account_type: 'expense', parent_id: '6400', level: 1 },
      
      { code: '6501', name: 'Interest - Bank Loans', account_type: 'expense', parent_id: '6500', level: 1 },
      { code: '6502', name: 'Interest - Equipment Financing', account_type: 'expense', parent_id: '6500', level: 1 },
      { code: '6503', name: 'Bank Charges', account_type: 'expense', parent_id: '6500', level: 1 },
      
      { code: '6601', name: 'Income Tax - Current', account_type: 'expense', parent_id: '6600', level: 1 },
      { code: '6602', name: 'Income Tax - Deferred', account_type: 'expense', parent_id: '6600', level: 1 },
      { code: '6603', name: 'Property Tax', account_type: 'expense', parent_id: '6600', level: 1 },
      { code: '6604', name: 'Sales Tax', account_type: 'expense', parent_id: '6600', level: 1 },
      { code: '6605', name: 'Payroll Tax', account_type: 'expense', parent_id: '6600', level: 1 }
    ];

    for (const category of detailedCategories) {
      await database.run(`
        INSERT OR IGNORE INTO gl_account_categories (id, code, name, account_type, parent_id, level)
        VALUES (?, ?, ?, ?, ?, ?)
      `, [category.code, category.code, category.name, category.account_type, category.parent_id, category.level]);
    }

    // 2. Add more detailed GL accounts
    console.log('📋 Adding detailed GL accounts...');
    const detailedAccounts = [
      // Cash Management
      { account_code: '1001', account_name: 'Cash on Hand - Main Office', category_id: '1101', account_type: 'asset', normal_balance: 'debit' },
      { account_code: '1002', account_name: 'Cash on Hand - Factory', category_id: '1101', account_type: 'asset', normal_balance: 'debit' },
      { account_code: '1003', account_name: 'Bank Account - Main', category_id: '1102', account_type: 'asset', normal_balance: 'debit' },
      { account_code: '1004', account_name: 'Bank Account - Operations', category_id: '1102', account_type: 'asset', normal_balance: 'debit' },
      { account_code: '1005', account_name: 'Petty Cash - Office', category_id: '1103', account_type: 'asset', normal_balance: 'debit' },
      { account_code: '1006', account_name: 'Petty Cash - Factory', category_id: '1103', account_type: 'asset', normal_balance: 'debit' },
      
      // Receivables
      { account_code: '1201', account_name: 'Accounts Receivable - Trade', category_id: '1201', account_type: 'asset', normal_balance: 'debit' },
      { account_code: '1202', account_name: 'Accounts Receivable - Export', category_id: '1201', account_type: 'asset', normal_balance: 'debit' },
      { account_code: '1203', account_name: 'Allowance for Doubtful Accounts', category_id: '1202', account_type: 'asset', normal_balance: 'credit' },
      
      // Inventory - Perfume Specific
      { account_code: '1301', account_name: 'Essential Oils - Rose', category_id: '1301', account_type: 'asset', normal_balance: 'debit' },
      { account_code: '1302', account_name: 'Essential Oils - Jasmine', category_id: '1301', account_type: 'asset', normal_balance: 'debit' },
      { account_code: '1303', account_name: 'Essential Oils - Vanilla', category_id: '1301', account_type: 'asset', normal_balance: 'debit' },
      { account_code: '1304', account_name: 'Essential Oils - Lavender', category_id: '1301', account_type: 'asset', normal_balance: 'debit' },
      { account_code: '1305', account_name: 'Alcohol Base - 95%', category_id: '1302', account_type: 'asset', normal_balance: 'debit' },
      { account_code: '1306', account_name: 'Alcohol Base - 70%', category_id: '1302', account_type: 'asset', normal_balance: 'debit' },
      { account_code: '1307', account_name: 'Bottles - 50ml', category_id: '1303', account_type: 'asset', normal_balance: 'debit' },
      { account_code: '1308', account_name: 'Bottles - 100ml', category_id: '1303', account_type: 'asset', normal_balance: 'debit' },
      { account_code: '1309', account_name: 'Caps and Sprayers', category_id: '1303', account_type: 'asset', normal_balance: 'debit' },
      { account_code: '1310', account_name: 'Labels and Packaging', category_id: '1303', account_type: 'asset', normal_balance: 'debit' },
      { account_code: '1311', account_name: 'WIP - Blending Stage 1', category_id: '1304', account_type: 'asset', normal_balance: 'debit' },
      { account_code: '1312', account_name: 'WIP - Blending Stage 2', category_id: '1304', account_type: 'asset', normal_balance: 'debit' },
      { account_code: '1313', account_name: 'WIP - Aging Stage', category_id: '1304', account_type: 'asset', normal_balance: 'debit' },
      { account_code: '1314', account_name: 'Finished Perfume - Rose Collection', category_id: '1305', account_type: 'asset', normal_balance: 'debit' },
      { account_code: '1315', account_name: 'Finished Perfume - Jasmine Collection', category_id: '1305', account_type: 'asset', normal_balance: 'debit' },
      { account_code: '1316', account_name: 'Finished Perfume - Vanilla Collection', category_id: '1305', account_type: 'asset', normal_balance: 'debit' },
      
      // Prepaid Expenses
      { account_code: '1401', account_name: 'Prepaid Rent - Factory (3 months)', category_id: '1401', account_type: 'asset', normal_balance: 'debit' },
      { account_code: '1402', account_name: 'Prepaid Rent - Office (3 months)', category_id: '1402', account_type: 'asset', normal_balance: 'debit' },
      { account_code: '1403', account_name: 'Prepaid Insurance - General', category_id: '1403', account_type: 'asset', normal_balance: 'debit' },
      { account_code: '1404', account_name: 'Prepaid Insurance - Professional', category_id: '1403', account_type: 'asset', normal_balance: 'debit' },
      { account_code: '1405', account_name: 'Prepaid Subscriptions - Software', category_id: '1404', account_type: 'asset', normal_balance: 'debit' },
      { account_code: '1406', account_name: 'Prepaid Subscriptions - Services', category_id: '1404', account_type: 'asset', normal_balance: 'debit' },
      
      // Equipment
      { account_code: '1501', account_name: 'Blending Equipment - Large Vats', category_id: '1501', account_type: 'asset', normal_balance: 'debit' },
      { account_code: '1502', account_name: 'Blending Equipment - Small Vats', category_id: '1501', account_type: 'asset', normal_balance: 'debit' },
      { account_code: '1503', account_name: 'Bottling Equipment - Automatic', category_id: '1502', account_type: 'asset', normal_balance: 'debit' },
      { account_code: '1504', account_name: 'Bottling Equipment - Manual', category_id: '1502', account_type: 'asset', normal_balance: 'debit' },
      { account_code: '1505', account_name: 'Testing Equipment - Quality Control', category_id: '1503', account_type: 'asset', normal_balance: 'debit' },
      { account_code: '1506', account_name: 'Testing Equipment - Safety', category_id: '1503', account_type: 'asset', normal_balance: 'debit' },
      { account_code: '1507', account_name: 'Office Equipment - Computers', category_id: '1504', account_type: 'asset', normal_balance: 'debit' },
      { account_code: '1508', account_name: 'Office Equipment - Furniture', category_id: '1504', account_type: 'asset', normal_balance: 'debit' },
      { account_code: '1509', account_name: 'Delivery Vehicle - Van', category_id: '1505', account_type: 'asset', normal_balance: 'debit' },
      { account_code: '1510', account_name: 'Delivery Vehicle - Car', category_id: '1505', account_type: 'asset', normal_balance: 'debit' },
      
      // Accumulated Depreciation
      { account_code: '1601', account_name: 'Accumulated Depreciation - Blending Equipment', category_id: '1601', account_type: 'asset', normal_balance: 'credit' },
      { account_code: '1602', account_name: 'Accumulated Depreciation - Bottling Equipment', category_id: '1601', account_type: 'asset', normal_balance: 'credit' },
      { account_code: '1603', account_name: 'Accumulated Depreciation - Testing Equipment', category_id: '1601', account_type: 'asset', normal_balance: 'credit' },
      { account_code: '1604', account_name: 'Accumulated Depreciation - Office Equipment', category_id: '1601', account_type: 'asset', normal_balance: 'credit' },
      { account_code: '1605', account_name: 'Accumulated Depreciation - Vehicles', category_id: '1602', account_type: 'asset', normal_balance: 'credit' },
      
      // Marketing Expenses
      { account_code: '6101', account_name: 'Digital Marketing - Social Media', category_id: '6101', account_type: 'expense', normal_balance: 'debit' },
      { account_code: '6102', account_name: 'Digital Marketing - Google Ads', category_id: '6101', account_type: 'expense', normal_balance: 'debit' },
      { account_code: '6103', account_name: 'Digital Marketing - Website', category_id: '6101', account_type: 'expense', normal_balance: 'debit' },
      { account_code: '6104', account_name: 'Print Marketing - Brochures', category_id: '6102', account_type: 'expense', normal_balance: 'debit' },
      { account_code: '6105', account_name: 'Print Marketing - Catalogs', category_id: '6102', account_type: 'expense', normal_balance: 'debit' },
      { account_code: '6106', account_name: 'Event Marketing - Product Launches', category_id: '6103', account_type: 'expense', normal_balance: 'debit' },
      { account_code: '6107', account_name: 'Event Marketing - Customer Events', category_id: '6103', account_type: 'expense', normal_balance: 'debit' },
      { account_code: '6108', account_name: 'Sales Commissions - Internal', category_id: '6104', account_type: 'expense', normal_balance: 'debit' },
      { account_code: '6109', account_name: 'Sales Commissions - External', category_id: '6104', account_type: 'expense', normal_balance: 'debit' },
      { account_code: '6110', account_name: 'Trade Shows - Local', category_id: '6105', account_type: 'expense', normal_balance: 'debit' },
      { account_code: '6111', account_name: 'Trade Shows - International', category_id: '6105', account_type: 'expense', normal_balance: 'debit' },
      
      // Administrative Expenses
      { account_code: '6201', account_name: 'Office Rent - Monthly', category_id: '6201', account_type: 'expense', normal_balance: 'debit' },
      { account_code: '6202', account_name: 'Office Utilities - Electricity', category_id: '6202', account_type: 'expense', normal_balance: 'debit' },
      { account_code: '6203', account_name: 'Office Utilities - Water', category_id: '6202', account_type: 'expense', normal_balance: 'debit' },
      { account_code: '6204', account_name: 'Office Utilities - Internet', category_id: '6202', account_type: 'expense', normal_balance: 'debit' },
      { account_code: '6205', account_name: 'Office Supplies - Paper', category_id: '6203', account_type: 'expense', normal_balance: 'debit' },
      { account_code: '6206', account_name: 'Office Supplies - Stationery', category_id: '6203', account_type: 'expense', normal_balance: 'debit' },
      { account_code: '6207', account_name: 'Office Supplies - Cleaning', category_id: '6203', account_type: 'expense', normal_balance: 'debit' },
      { account_code: '6208', account_name: 'Salaries - CEO', category_id: '6204', account_type: 'expense', normal_balance: 'debit' },
      { account_code: '6209', account_name: 'Salaries - CFO', category_id: '6204', account_type: 'expense', normal_balance: 'debit' },
      { account_code: '6210', account_name: 'Salaries - Operations Manager', category_id: '6204', account_type: 'expense', normal_balance: 'debit' },
      { account_code: '6211', account_name: 'Salaries - Administrative Staff', category_id: '6205', account_type: 'expense', normal_balance: 'debit' },
      { account_code: '6212', account_name: 'Salaries - Receptionist', category_id: '6205', account_type: 'expense', normal_balance: 'debit' },
      { account_code: '6213', account_name: 'Employee Benefits - Health Insurance', category_id: '6206', account_type: 'expense', normal_balance: 'debit' },
      { account_code: '6214', account_name: 'Employee Benefits - Retirement', category_id: '6206', account_type: 'expense', normal_balance: 'debit' },
      { account_code: '6215', account_name: 'Employee Benefits - Training', category_id: '6206', account_type: 'expense', normal_balance: 'debit' },
      { account_code: '6216', account_name: 'Legal Services - Contracts', category_id: '6207', account_type: 'expense', normal_balance: 'debit' },
      { account_code: '6217', account_name: 'Legal Services - Compliance', category_id: '6207', account_type: 'expense', normal_balance: 'debit' },
      { account_code: '6218', account_name: 'Accounting Services - Monthly', category_id: '6208', account_type: 'expense', normal_balance: 'debit' },
      { account_code: '6219', account_name: 'Accounting Services - Annual', category_id: '6208', account_type: 'expense', normal_balance: 'debit' },
      { account_code: '6220', account_name: 'Consulting Services - Strategy', category_id: '6209', account_type: 'expense', normal_balance: 'debit' },
      { account_code: '6221', account_name: 'Consulting Services - Operations', category_id: '6209', account_type: 'expense', normal_balance: 'debit' },
      { account_code: '6222', account_name: 'Travel - Domestic', category_id: '6210', account_type: 'expense', normal_balance: 'debit' },
      { account_code: '6223', account_name: 'Travel - International', category_id: '6210', account_type: 'expense', normal_balance: 'debit' },
      { account_code: '6224', account_name: 'Entertainment - Client Meals', category_id: '6210', account_type: 'expense', normal_balance: 'debit' },
      { account_code: '6225', account_name: 'Entertainment - Business Events', category_id: '6210', account_type: 'expense', normal_balance: 'debit' },
      { account_code: '6226', account_name: 'Insurance - General Liability', category_id: '6211', account_type: 'expense', normal_balance: 'debit' },
      { account_code: '6227', account_name: 'Insurance - Property', category_id: '6211', account_type: 'expense', normal_balance: 'debit' },
      { account_code: '6228', account_name: 'Insurance - Workers Compensation', category_id: '6211', account_type: 'expense', normal_balance: 'debit' },
      { account_code: '6229', account_name: 'Professional Liability Insurance', category_id: '6212', account_type: 'expense', normal_balance: 'debit' },
      { account_code: '6230', account_name: 'Maintenance - Office Building', category_id: '6213', account_type: 'expense', normal_balance: 'debit' },
      { account_code: '6231', account_name: 'Maintenance - Office Equipment', category_id: '6213', account_type: 'expense', normal_balance: 'debit' },
      { account_code: '6232', account_name: 'Maintenance - Blending Equipment', category_id: '6214', account_type: 'expense', normal_balance: 'debit' },
      { account_code: '6233', account_name: 'Maintenance - Bottling Equipment', category_id: '6214', account_type: 'expense', normal_balance: 'debit' },
      
      // R&D Expenses
      { account_code: '6301', account_name: 'R&D Salaries - Perfumers', category_id: '6301', account_type: 'expense', normal_balance: 'debit' },
      { account_code: '6302', account_name: 'R&D Salaries - Chemists', category_id: '6301', account_type: 'expense', normal_balance: 'debit' },
      { account_code: '6303', account_name: 'R&D Salaries - Lab Technicians', category_id: '6301', account_type: 'expense', normal_balance: 'debit' },
      { account_code: '6304', account_name: 'R&D Materials - Essential Oils', category_id: '6302', account_type: 'expense', normal_balance: 'debit' },
      { account_code: '6305', account_name: 'R&D Materials - Base Materials', category_id: '6302', account_type: 'expense', normal_balance: 'debit' },
      { account_code: '6306', account_name: 'R&D Materials - Testing Supplies', category_id: '6302', account_type: 'expense', normal_balance: 'debit' },
      { account_code: '6307', account_name: 'New Product Development - Formulation', category_id: '6303', account_type: 'expense', normal_balance: 'debit' },
      { account_code: '6308', account_name: 'New Product Development - Testing', category_id: '6303', account_type: 'expense', normal_balance: 'debit' },
      { account_code: '6309', account_name: 'New Product Development - Market Research', category_id: '6303', account_type: 'expense', normal_balance: 'debit' },
      { account_code: '6310', account_name: 'Regulatory Compliance - Safety Testing', category_id: '6304', account_type: 'expense', normal_balance: 'debit' },
      { account_code: '6311', account_name: 'Regulatory Compliance - Documentation', category_id: '6304', account_type: 'expense', normal_balance: 'debit' },
      { account_code: '6312', account_name: 'Regulatory Compliance - Certifications', category_id: '6304', account_type: 'expense', normal_balance: 'debit' }
    ];

    for (const account of detailedAccounts) {
      await database.run(`
        INSERT OR IGNORE INTO gl_accounts (id, account_code, account_name, category_id, account_type, normal_balance)
        VALUES (?, ?, ?, ?, ?, ?)
      `, [account.account_code, account.account_code, account.account_name, account.category_id, account.account_type, account.normal_balance]);
    }

    // 3. Add sample journal entries
    console.log('📝 Adding sample journal entries...');
    const sampleJournalEntries = [
      {
        entry_number: 'JE-2024-001',
        entry_date: '2024-01-15',
        reference_type: 'expense',
        reference_id: uuidv4(),
        description: 'Office rent payment for January 2024',
        total_debit: 2500.00,
        total_credit: 2500.00,
        status: 'posted',
        created_by: 'admin'
      },
      {
        entry_number: 'JE-2024-002',
        entry_date: '2024-01-20',
        reference_type: 'expense',
        reference_id: uuidv4(),
        description: 'Utility payments for January 2024',
        total_debit: 850.00,
        total_credit: 850.00,
        status: 'posted',
        created_by: 'admin'
      },
      {
        entry_number: 'JE-2024-003',
        entry_date: '2024-01-25',
        reference_type: 'expense',
        reference_id: uuidv4(),
        description: 'Office supplies purchase',
        total_debit: 320.00,
        total_credit: 320.00,
        status: 'posted',
        created_by: 'admin'
      },
      {
        entry_number: 'JE-2024-004',
        entry_date: '2024-02-01',
        reference_type: 'expense',
        reference_id: uuidv4(),
        description: 'Marketing expenses for February 2024',
        total_debit: 1500.00,
        total_credit: 1500.00,
        status: 'posted',
        created_by: 'admin'
      },
      {
        entry_number: 'JE-2024-005',
        entry_date: '2024-02-05',
        reference_type: 'expense',
        reference_id: uuidv4(),
        description: 'R&D materials purchase',
        total_debit: 2800.00,
        total_credit: 2800.00,
        status: 'posted',
        created_by: 'admin'
      }
    ];

    for (const entry of sampleJournalEntries) {
      const entryId = uuidv4();
      await database.run(`
        INSERT INTO gl_journal_entries (id, entry_number, entry_date, reference_type, reference_id, description, total_debit, total_credit, status, created_by)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [entryId, entry.entry_number, entry.entry_date, entry.reference_type, entry.reference_id, entry.description, entry.total_debit, entry.total_credit, entry.status, entry.created_by]);

      // Add journal entry lines based on entry type
      if (entry.entry_number === 'JE-2024-001') {
        // Office rent
        await database.run(`
          INSERT INTO gl_journal_entry_lines (id, journal_entry_id, gl_account_id, debit_amount, credit_amount, description, line_number)
          VALUES (?, ?, ?, ?, ?, ?, ?)
        `, [uuidv4(), entryId, '6201', 2500.00, 0, 'Office rent expense', 1]);
        await database.run(`
          INSERT INTO gl_journal_entry_lines (id, journal_entry_id, gl_account_id, debit_amount, credit_amount, description, line_number)
          VALUES (?, ?, ?, ?, ?, ?, ?)
        `, [uuidv4(), entryId, '1003', 0, 2500.00, 'Cash payment', 2]);
      } else if (entry.entry_number === 'JE-2024-002') {
        // Utilities
        await database.run(`
          INSERT INTO gl_journal_entry_lines (id, journal_entry_id, gl_account_id, debit_amount, credit_amount, description, line_number)
          VALUES (?, ?, ?, ?, ?, ?, ?)
        `, [uuidv4(), entryId, '6202', 850.00, 0, 'Utility expenses', 1]);
        await database.run(`
          INSERT INTO gl_journal_entry_lines (id, journal_entry_id, gl_account_id, debit_amount, credit_amount, description, line_number)
          VALUES (?, ?, ?, ?, ?, ?, ?)
        `, [uuidv4(), entryId, '1003', 0, 850.00, 'Cash payment', 2]);
      } else if (entry.entry_number === 'JE-2024-003') {
        // Office supplies
        await database.run(`
          INSERT INTO gl_journal_entry_lines (id, journal_entry_id, gl_account_id, debit_amount, credit_amount, description, line_number)
          VALUES (?, ?, ?, ?, ?, ?, ?)
        `, [uuidv4(), entryId, '6205', 320.00, 0, 'Office supplies expense', 1]);
        await database.run(`
          INSERT INTO gl_journal_entry_lines (id, journal_entry_id, gl_account_id, debit_amount, credit_amount, description, line_number)
          VALUES (?, ?, ?, ?, ?, ?, ?)
        `, [uuidv4(), entryId, '1003', 0, 320.00, 'Cash payment', 2]);
      } else if (entry.entry_number === 'JE-2024-004') {
        // Marketing
        await database.run(`
          INSERT INTO gl_journal_entry_lines (id, journal_entry_id, gl_account_id, debit_amount, credit_amount, description, line_number)
          VALUES (?, ?, ?, ?, ?, ?, ?)
        `, [uuidv4(), entryId, '6101', 1500.00, 0, 'Digital marketing expenses', 1]);
        await database.run(`
          INSERT INTO gl_journal_entry_lines (id, journal_entry_id, gl_account_id, debit_amount, credit_amount, description, line_number)
          VALUES (?, ?, ?, ?, ?, ?, ?)
        `, [uuidv4(), entryId, '1003', 0, 1500.00, 'Cash payment', 2]);
      } else if (entry.entry_number === 'JE-2024-005') {
        // R&D materials
        await database.run(`
          INSERT INTO gl_journal_entry_lines (id, journal_entry_id, gl_account_id, debit_amount, credit_amount, description, line_number)
          VALUES (?, ?, ?, ?, ?, ?, ?)
        `, [uuidv4(), entryId, '6304', 2800.00, 0, 'R&D materials purchase', 1]);
        await database.run(`
          INSERT INTO gl_journal_entry_lines (id, journal_entry_id, gl_account_id, debit_amount, credit_amount, description, line_number)
          VALUES (?, ?, ?, ?, ?, ?, ?)
        `, [uuidv4(), entryId, '1003', 0, 2800.00, 'Cash payment', 2]);
      }
    }

    // 4. Add sample expense GL mappings
    console.log('🔗 Adding sample expense GL mappings...');
    const sampleExpenseMappings = [
      {
        expense_id: uuidv4(),
        gl_account_id: '6201',
        amount: 2500.00,
        currency: 'USD',
        allocation_percentage: 100.00,
        notes: 'Office rent for main office'
      },
      {
        expense_id: uuidv4(),
        gl_account_id: '6202',
        amount: 450.00,
        currency: 'USD',
        allocation_percentage: 100.00,
        notes: 'Electricity and water utilities'
      },
      {
        expense_id: uuidv4(),
        gl_account_id: '6202',
        amount: 400.00,
        currency: 'USD',
        allocation_percentage: 100.00,
        notes: 'Internet and phone services'
      },
      {
        expense_id: uuidv4(),
        gl_account_id: '6205',
        amount: 200.00,
        currency: 'USD',
        allocation_percentage: 100.00,
        notes: 'Office stationery and supplies'
      },
      {
        expense_id: uuidv4(),
        gl_account_id: '6205',
        amount: 120.00,
        currency: 'USD',
        allocation_percentage: 100.00,
        notes: 'Cleaning supplies'
      },
      {
        expense_id: uuidv4(),
        gl_account_id: '6101',
        amount: 800.00,
        currency: 'USD',
        allocation_percentage: 100.00,
        notes: 'Social media advertising'
      },
      {
        expense_id: uuidv4(),
        gl_account_id: '6101',
        amount: 700.00,
        currency: 'USD',
        allocation_percentage: 100.00,
        notes: 'Google Ads campaign'
      },
      {
        expense_id: uuidv4(),
        gl_account_id: '6304',
        amount: 1500.00,
        currency: 'USD',
        allocation_percentage: 100.00,
        notes: 'Essential oils for R&D'
      },
      {
        expense_id: uuidv4(),
        gl_account_id: '6304',
        amount: 1300.00,
        currency: 'USD',
        allocation_percentage: 100.00,
        notes: 'Testing materials for R&D'
      },
      {
        expense_id: uuidv4(),
        gl_account_id: '6208',
        amount: 500.00,
        currency: 'USD',
        allocation_percentage: 100.00,
        notes: 'Monthly accounting services'
      },
      {
        expense_id: uuidv4(),
        gl_account_id: '6207',
        amount: 300.00,
        currency: 'USD',
        allocation_percentage: 100.00,
        notes: 'Legal consultation services'
      },
      {
        expense_id: uuidv4(),
        gl_account_id: '6211',
        amount: 1200.00,
        currency: 'USD',
        allocation_percentage: 100.00,
        notes: 'General liability insurance'
      },
      {
        expense_id: uuidv4(),
        gl_account_id: '6214',
        amount: 600.00,
        currency: 'USD',
        allocation_percentage: 100.00,
        notes: 'Equipment maintenance contract'
      },
      {
        expense_id: uuidv4(),
        gl_account_id: '6401',
        amount: 800.00,
        currency: 'USD',
        allocation_percentage: 100.00,
        notes: 'Monthly depreciation expense'
      },
      {
        expense_id: uuidv4(),
        gl_account_id: '6503',
        amount: 50.00,
        currency: 'USD',
        allocation_percentage: 100.00,
        notes: 'Monthly bank charges'
      }
    ];

    for (const mapping of sampleExpenseMappings) {
      await database.run(`
        INSERT INTO expense_gl_mappings (id, expense_id, gl_account_id, amount, currency, allocation_percentage, notes)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `, [uuidv4(), mapping.expense_id, mapping.gl_account_id, mapping.amount, mapping.currency, mapping.allocation_percentage, mapping.notes]);
    }

    console.log('✅ GL Accounting seeding completed successfully!');
    console.log('📊 Added detailed GL account categories and accounts');
    console.log('📝 Added sample journal entries with proper double-entry bookkeeping');
    console.log('🔗 Added sample expense GL mappings for realistic expense allocation');
    console.log('💡 You can now view comprehensive financial reports and GL accounting data');

  } catch (error) {
    console.error('❌ Error seeding GL accounting data:', error);
    throw error;
  }
}

// Run the seeding if this file is executed directly
if (require.main === module) {
  seedGLAccounting()
    .then(() => {
      console.log('🎉 Seeding completed successfully!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Seeding failed:', error);
      process.exit(1);
    });
}

module.exports = seedGLAccounting;
