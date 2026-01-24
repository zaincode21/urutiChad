const express = require('express');
const salesAnalyticsService = require('../services/salesAnalyticsService');
const { auth } = require('../middleware/auth');

const router = express.Router();

// Middleware to block cashiers from accessing sales dashboard routes
const blockCashiers = (req, res, next) => {
  if (req.user && req.user.role === 'cashier') {
    return res.status(403).json({ 
      error: 'Access denied. Cashiers cannot access sales dashboard routes.' 
    });
  }
  next();
};

// Get comprehensive sales overview
router.get('/overview', auth, blockCashiers, async (req, res) => {
  try {
    const { period = '30', shop } = req.query;
    const overview = await salesAnalyticsService.getSalesOverview(period, req.user, shop);
    res.json(overview);
  } catch (error) {
    console.error('Get sales overview error:', error);
    res.status(500).json({ error: 'Failed to get sales overview' });
  }
});

// Get sales performance data
router.get('/performance', auth, blockCashiers, async (req, res) => {
  try {
    const { period = '30', group_by = 'day' } = req.query;
    const performance = await salesAnalyticsService.getSalesPerformance(period, group_by, req.user);
    res.json(performance);
  } catch (error) {
    console.error('Get sales performance error:', error);
    res.status(500).json({ error: 'Failed to get sales performance' });
  }
});

// Get sales vs expenses comparison
router.get('/vs-expenses', auth, blockCashiers, async (req, res) => {
  try {
    const { period = '30' } = req.query;
    const comparison = await salesAnalyticsService.getSalesVsExpenses(period);
    res.json(comparison);
  } catch (error) {
    console.error('Get sales vs expenses error:', error);
    res.status(500).json({ error: 'Failed to get sales vs expenses comparison' });
  }
});

// Get invoice statistics
router.get('/invoice-stats', auth, blockCashiers, async (req, res) => {
  try {
    const { period = '30' } = req.query;
    const stats = await salesAnalyticsService.getInvoiceStats(period);
    res.json(stats);
  } catch (error) {
    console.error('Get invoice stats error:', error);
    res.status(500).json({ error: 'Failed to get invoice statistics' });
  }
});

module.exports = router; 