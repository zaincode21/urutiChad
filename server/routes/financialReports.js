const express = require('express');
const router = express.Router();
const financialReportsService = require('../services/financialReportsService');
const { auth: authenticateToken } = require('../middleware/auth');

// Apply authentication to all routes
router.use(authenticateToken);

/**
 * @route GET /api/financial-reports/daily-sales
 * @desc Get Daily Sales Report grouped by Payment Mode and Shop
 * @access Private (Admin, Manager, Cashier - shop filtered)
 */
router.get('/daily-sales', async (req, res) => {
  try {
    const { date, shop_id } = req.query;
    
    const result = await financialReportsService.getDailySalesReport({
      date,
      shop_id: req.user.role === 'cashier' ? req.user.shop_id : shop_id
    });
    
    res.json(result);
  } catch (error) {
    console.error('Daily Sales Report Error:', error);
    res.status(500).json({ 
      error: 'Failed to generate daily sales report',
      details: error.message 
    });
  }
});

/**
 * @route GET /api/financial-reports/daily-expenses
 * @desc Get Daily Expense Report
 * @access Private (Admin, Manager, Cashier - shop filtered)
 */
router.get('/daily-expenses', async (req, res) => {
  try {
    const { date, shop_id } = req.query;
    
    const result = await financialReportsService.getDailyExpenseReport({
      date,
      shop_id: req.user.role === 'cashier' ? req.user.shop_id : shop_id
    });
    
    res.json(result);
  } catch (error) {
    console.error('Daily Expense Report Error:', error);
    res.status(500).json({ 
      error: 'Failed to generate daily expense report',
      details: error.message 
    });
  }
});

/**
 * @route GET /api/financial-reports/monthly-sales
 * @desc Get Monthly Sales Report grouped by Payment Mode and Shop
 * @access Private (Admin, Manager, Cashier - shop filtered)
 */
router.get('/monthly-sales', async (req, res) => {
  try {
    const { year, month, shop_id } = req.query;
    
    const result = await financialReportsService.getMonthlySalesReport({
      year: year ? parseInt(year) : undefined,
      month: month ? parseInt(month) : undefined,
      shop_id: req.user.role === 'cashier' ? req.user.shop_id : shop_id
    });
    
    res.json(result);
  } catch (error) {
    console.error('Monthly Sales Report Error:', error);
    res.status(500).json({ 
      error: 'Failed to generate monthly sales report',
      details: error.message 
    });
  }
});

/**
 * @route GET /api/financial-reports/monthly-expenses
 * @desc Get Monthly Expense Report
 * @access Private (Admin, Manager, Cashier - shop filtered)
 */
router.get('/monthly-expenses', async (req, res) => {
  try {
    const { year, month, shop_id } = req.query;
    
    const result = await financialReportsService.getMonthlyExpenseReport({
      year: year ? parseInt(year) : undefined,
      month: month ? parseInt(month) : undefined,
      shop_id: req.user.role === 'cashier' ? req.user.shop_id : shop_id
    });
    
    res.json(result);
  } catch (error) {
    console.error('Monthly Expense Report Error:', error);
    res.status(500).json({ 
      error: 'Failed to generate monthly expense report',
      details: error.message 
    });
  }
});

/**
 * @route GET /api/financial-reports/yearly-sales
 * @desc Get Yearly Sales Report grouped by Payment Mode and Shop
 * @access Private (Admin, Manager, Cashier - shop filtered)
 */
router.get('/yearly-sales', async (req, res) => {
  try {
    const { year, shop_id } = req.query;
    
    const result = await financialReportsService.getYearlySalesReport({
      year: year ? parseInt(year) : undefined,
      shop_id: req.user.role === 'cashier' ? req.user.shop_id : shop_id
    });
    
    res.json(result);
  } catch (error) {
    console.error('Yearly Sales Report Error:', error);
    res.status(500).json({ 
      error: 'Failed to generate yearly sales report',
      details: error.message 
    });
  }
});

/**
 * @route GET /api/financial-reports/yearly-expenses
 * @desc Get Yearly Expense Report
 * @access Private (Admin, Manager, Cashier - shop filtered)
 */
router.get('/yearly-expenses', async (req, res) => {
  try {
    const { year, shop_id } = req.query;
    
    const result = await financialReportsService.getYearlyExpenseReport({
      year: year ? parseInt(year) : undefined,
      shop_id: req.user.role === 'cashier' ? req.user.shop_id : shop_id
    });
    
    res.json(result);
  } catch (error) {
    console.error('Yearly Expense Report Error:', error);
    res.status(500).json({ 
      error: 'Failed to generate yearly expense report',
      details: error.message 
    });
  }
});

/**
 * @route GET /api/financial-reports/trial-balance
 * @desc Get Trial Balance Report
 * @access Private (Admin, Manager, Cashier - shop filtered)
 */
router.get('/trial-balance', async (req, res) => {
  try {
    const { as_of_date, include_zero_balances = false, shop_id } = req.query;
    
    const result = await financialReportsService.getTrialBalance({
      as_of_date,
      include_zero_balances: include_zero_balances === 'true',
      shop_id: req.user.role === 'cashier' ? req.user.shop_id : shop_id
    });
    
    res.json(result);
  } catch (error) {
    console.error('Trial Balance Error:', error);
    res.status(500).json({ 
      error: 'Failed to generate trial balance',
      details: error.message 
    });
  }
});

/**
 * @route GET /api/financial-reports/income-statement
 * @desc Get Income Statement (Profit & Loss)
 * @access Private (Admin, Manager, Cashier - shop filtered)
 */
router.get('/income-statement', async (req, res) => {
  try {
    const { start_date, end_date, shop_id } = req.query;
    
    if (!start_date || !end_date) {
      return res.status(400).json({ 
        error: 'Start date and end date are required' 
      });
    }
    
    const result = await financialReportsService.getIncomeStatement({
      start_date,
      end_date,
      shop_id: req.user.role === 'cashier' ? req.user.shop_id : shop_id
    });
    
    res.json(result);
  } catch (error) {
    console.error('Income Statement Error:', error);
    res.status(500).json({ 
      error: 'Failed to generate income statement',
      details: error.message 
    });
  }
});

/**
 * @route GET /api/financial-reports/balance-sheet
 * @desc Get Balance Sheet
 * @access Private (Admin, Manager, Cashier - shop filtered)
 */
router.get('/balance-sheet', async (req, res) => {
  try {
    const { as_of_date, shop_id } = req.query;
    
    const result = await financialReportsService.getBalanceSheet({
      as_of_date,
      shop_id: req.user.role === 'cashier' ? req.user.shop_id : shop_id
    });
    
    res.json(result);
  } catch (error) {
    console.error('Balance Sheet Error:', error);
    res.status(500).json({ 
      error: 'Failed to generate balance sheet',
      details: error.message 
    });
  }
});

/**
 * @route GET /api/financial-reports/cash-flow
 * @desc Get Cash Flow Statement
 * @access Private (Admin, Manager, Cashier - shop filtered)
 */
router.get('/cash-flow', async (req, res) => {
  try {
    const { start_date, end_date, shop_id } = req.query;
    
    if (!start_date || !end_date) {
      return res.status(400).json({ 
        error: 'Start date and end date are required' 
      });
    }
    
    const result = await financialReportsService.getCashFlowStatement({
      start_date,
      end_date,
      shop_id: req.user.role === 'cashier' ? req.user.shop_id : shop_id
    });
    
    res.json(result);
  } catch (error) {
    console.error('Cash Flow Error:', error);
    res.status(500).json({ 
      error: 'Failed to generate cash flow statement',
      details: error.message 
    });
  }
});

/**
 * @route GET /api/financial-reports/account-balances/:accountId?
 * @desc Get Account Balances Report
 * @access Private (Admin, Manager, Cashier - shop filtered)
 */
router.get('/account-balances/:accountId?', async (req, res) => {
  try {
    const { accountId } = req.params;
    const { as_of_date, shop_id, include_inactive = false } = req.query;
    
    const result = await financialReportsService.getAccountBalances({
      account_id: accountId,
      as_of_date,
      shop_id: req.user.role === 'cashier' ? req.user.shop_id : shop_id,
      include_inactive: include_inactive === 'true'
    });
    
    res.json(result);
  } catch (error) {
    console.error('Account Balances Error:', error);
    res.status(500).json({ 
      error: 'Failed to generate account balances',
      details: error.message 
    });
  }
});

/**
 * @route GET /api/financial-reports/summary
 * @desc Get Financial Summary Dashboard
 * @access Private (Admin, Manager, Cashier - shop filtered)
 */
router.get('/summary', async (req, res) => {
  try {
    const { period = 'monthly', shop_id } = req.query;
    const moment = require('moment');
    
    let startDate, endDate, asOfDate;
    
    switch (period) {
      case 'daily':
        startDate = endDate = asOfDate = moment().format('YYYY-MM-DD');
        break;
      case 'weekly':
        startDate = moment().startOf('week').format('YYYY-MM-DD');
        endDate = moment().endOf('week').format('YYYY-MM-DD');
        asOfDate = moment().format('YYYY-MM-DD');
        break;
      case 'monthly':
        startDate = moment().startOf('month').format('YYYY-MM-DD');
        endDate = moment().endOf('month').format('YYYY-MM-DD');
        asOfDate = moment().format('YYYY-MM-DD');
        break;
      case 'quarterly':
        startDate = moment().startOf('quarter').format('YYYY-MM-DD');
        endDate = moment().endOf('quarter').format('YYYY-MM-DD');
        asOfDate = moment().format('YYYY-MM-DD');
        break;
      case 'yearly':
        startDate = moment().startOf('year').format('YYYY-MM-DD');
        endDate = moment().endOf('year').format('YYYY-MM-DD');
        asOfDate = moment().format('YYYY-MM-DD');
        break;
      default:
        startDate = moment().startOf('month').format('YYYY-MM-DD');
        endDate = moment().endOf('month').format('YYYY-MM-DD');
        asOfDate = moment().format('YYYY-MM-DD');
    }
    
    const [trialBalance, incomeStatement, balanceSheet, cashFlow] = await Promise.all([
      financialReportsService.getTrialBalance({
        as_of_date: asOfDate,
        include_zero_balances: false,
        shop_id: req.user.role === 'cashier' ? req.user.shop_id : shop_id
      }),
      financialReportsService.getIncomeStatement({
        start_date: startDate,
        end_date: endDate,
        shop_id: req.user.role === 'cashier' ? req.user.shop_id : shop_id
      }),
      financialReportsService.getBalanceSheet({
        as_of_date: asOfDate,
        shop_id: req.user.role === 'cashier' ? req.user.shop_id : shop_id
      }),
      financialReportsService.getCashFlowStatement({
        start_date: startDate,
        end_date: endDate,
        shop_id: req.user.role === 'cashier' ? req.user.shop_id : shop_id
      })
    ]);
    
    res.json({
      period,
      date_range: { start_date: startDate, end_date: endDate, as_of_date: asOfDate },
      trial_balance: {
        is_balanced: trialBalance.is_balanced,
        total_debits: trialBalance.totals.total_debits,
        total_credits: trialBalance.totals.total_credits
      },
      income_statement: {
        total_revenue: incomeStatement.revenues.total,
        total_expenses: incomeStatement.expenses.total,
        net_income: incomeStatement.net_income,
        profit_margin: incomeStatement.profit_margin
      },
      balance_sheet: {
        total_assets: balanceSheet.assets.total,
        total_liabilities: balanceSheet.liabilities.total,
        total_equity: balanceSheet.equity.total,
        is_balanced: balanceSheet.is_balanced
      },
      cash_flow: {
        operating_cash_flow: cashFlow.operating_activities.net_cash_flow,
        investing_cash_flow: cashFlow.investing_activities.net_cash_flow,
        financing_cash_flow: cashFlow.financing_activities.net_cash_flow,
        net_cash_flow: cashFlow.net_cash_flow
      },
      generated_at: moment().toISOString()
    });
  } catch (error) {
    console.error('Financial Summary Error:', error);
    res.status(500).json({ 
      error: 'Failed to generate financial summary',
      details: error.message 
    });
  }
});

module.exports = router;