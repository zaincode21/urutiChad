const express = require('express');
const database = require('../database/database');
const { auth } = require('../middleware/auth');
const { requireRole } = require('../middleware/permissions');

const router = express.Router();

// Middleware to block cashiers from accessing dashboard routes
const blockCashiers = (req, res, next) => {
  if (req.user && req.user.role === 'cashier') {
    return res.status(403).json({ 
      error: 'Access denied. Cashiers cannot access dashboard routes.' 
    });
  }
  next();
};

// Helper function to get today's sales
async function getTodaySales(userFilter, userFilterParams) {
  try {
    const todaySales = await database.get(`
      SELECT 
        COALESCE(SUM(total_amount), 0) as today_sales
      FROM orders o
      WHERE DATE(o.created_at) = DATE('now') AND o.status = 'completed' ${userFilter}
    `, userFilterParams);
    return todaySales?.today_sales || 0;
  } catch (error) {
    console.error('Error getting today sales:', error);
    return 0;
  }
}

// Helper function to get today's orders
async function getTodayOrders(userFilter, userFilterParams) {
  try {
    const todayOrders = await database.get(`
      SELECT 
        COALESCE(COUNT(*), 0) as today_orders
      FROM orders o
      WHERE DATE(o.created_at) = DATE('now') ${userFilter}
    `, userFilterParams);
    return todayOrders?.today_orders || 0;
  } catch (error) {
    console.error('Error getting today orders:', error);
    return 0;
  }
}

// Helper function to get revenue trend
async function getRevenueTrend(period, userFilter, userFilterParams) {
  try {
    const revenueTrend = await database.all(`
      SELECT 
        DATE(o.created_at) as date,
        SUM(o.total_amount) as amount,
        COUNT(*) as order_count
      FROM orders o
      WHERE o.created_at >= NOW() - INTERVAL '${period} days' 
        AND o.status = 'completed' ${userFilter}
      GROUP BY DATE(o.created_at)
      ORDER BY date DESC
      LIMIT 7
    `, userFilterParams);
    return revenueTrend || [];
  } catch (error) {
    console.error('Error getting revenue trend:', error);
    return [];
  }
}

// Get dashboard overview statistics
router.get('/overview', auth, blockCashiers, async (req, res) => {
  try {
    const { period = '30', shop } = req.query; // days and shop filter

    // Sales statistics - filter by user for cashiers and shop
    let userFilter = req.user.role === 'cashier' ? `AND o.created_by = ?` : '';
    let userFilterParams = req.user.role === 'cashier' ? [req.user.id] : [];
    
    // Add shop filter if specified
    let shopFilter = '';
    if (shop && shop !== 'all') {
      shopFilter = `AND o.shop_id = ?`;
      userFilterParams.push(shop);
    }
    
    let salesStats = {
      total_orders: 0,
      total_revenue: 0,
      avg_order_value: 0,
      completed_orders: 0,
      pending_orders: 0,
      cancelled_orders: 0
    };
    
    try {
      salesStats = await database.get(`
        SELECT 
          COALESCE(COUNT(*), 0) as total_orders,
          COALESCE(SUM(total_amount), 0) as total_revenue,
          COALESCE(AVG(total_amount), 0) as avg_order_value,
          COALESCE(COUNT(CASE WHEN status = 'completed' THEN 1 END), 0) as completed_orders,
          COALESCE(COUNT(CASE WHEN status = 'pending' THEN 1 END), 0) as pending_orders,
          COALESCE(COUNT(CASE WHEN status = 'cancelled' THEN 1 END), 0) as cancelled_orders
        FROM orders o
        WHERE o.created_at >= NOW() - INTERVAL '${period} days' ${userFilter} ${shopFilter}
      `, userFilterParams) || salesStats;
    } catch (error) {
      console.log('Sales stats query failed, using defaults:', error.message);
    }

    // Inventory statistics
    let inventoryStats = {
      total_products: 0,
      total_stock: 0,
      out_of_stock: 0,
      low_stock: 0,
      avg_stock_level: 0
    };
    
    try {
      inventoryStats = await database.get(`
        SELECT 
          COALESCE(COUNT(*), 0) as total_products,
          COALESCE(SUM(stock_quantity), 0) as total_stock,
          COALESCE(COUNT(CASE WHEN stock_quantity = 0 THEN 1 END), 0) as out_of_stock,
          COALESCE(COUNT(CASE WHEN stock_quantity <= min_stock_level THEN 1 END), 0) as low_stock,
          COALESCE(AVG(stock_quantity), 0) as avg_stock_level
        FROM products 
        WHERE is_active = true
      `) || inventoryStats;
    } catch (error) {
      console.log('Inventory stats query failed, using defaults:', error.message);
    }

    // Customer statistics
    const customerStats = await database.get(`
      SELECT 
        COALESCE(COUNT(*), 0) as total_customers,
        COALESCE(COUNT(CASE WHEN created_at >= NOW() - INTERVAL '${period} days' THEN 1 END), 0) as new_customers,
        COALESCE(AVG(total_spent), 0) as avg_customer_spend
      FROM customers 
      WHERE is_active = true
    `) || {
      total_customers: 0,
      new_customers: 0,
      avg_customer_spend: 0
    };

    // Top selling products - filter by user for cashiers
    const topProducts = await database.all(`
      SELECT 
        p.name,
        p.sku,
        COALESCE(SUM(oi.quantity), 0) as quantity_sold,
        COALESCE(SUM(oi.total_price), 0) as revenue
      FROM products p
      LEFT JOIN order_items oi ON p.id = oi.product_id
      LEFT JOIN orders o ON oi.order_id = o.id AND o.created_at >= NOW() - INTERVAL '${period} days' AND o.status = 'completed' ${userFilter}
      WHERE p.is_active = true
      GROUP BY p.id, p.name, p.sku
      ORDER BY quantity_sold DESC
      LIMIT 10
    `, userFilterParams) || [];

    // Recent orders - filter by user for cashiers
    const recentOrders = await database.all(`
      SELECT 
        o.*,
        c.first_name,
        c.last_name,
        c.email
      FROM orders o
      LEFT JOIN customers c ON o.customer_id = c.id
      WHERE 1=1 ${userFilter}
      ORDER BY o.created_at DESC
      LIMIT 10
    `, userFilterParams) || [];

    // Low stock alerts
    const lowStockAlerts = await database.all(`
      SELECT 
        p.*,
        string_agg(c.name, ', ') as category_names
      FROM products p
      LEFT JOIN product_categories pc ON p.id = pc.product_id
      LEFT JOIN categories c ON pc.category_id = c.id
      WHERE p.stock_quantity <= p.min_stock_level AND p.is_active = true
      GROUP BY p.id
      ORDER BY p.stock_quantity ASC
      LIMIT 10
    `) || [];

    // Calculate previous period data for comparison
    const previousPeriod = parseInt(period) * 2; // Double the period for comparison
    const previousSalesStats = await database.get(`
      SELECT 
        COALESCE(COUNT(*), 0) as total_orders,
        COALESCE(SUM(total_amount), 0) as total_revenue,
        COALESCE(AVG(total_amount), 0) as avg_order_value
      FROM orders o
      WHERE o.created_at >= NOW() - INTERVAL '${previousPeriod} days' 
        AND o.created_at < NOW() - INTERVAL '${period} days' ${userFilter}
    `, userFilterParams) || {
      total_orders: 0,
      total_revenue: 0,
      avg_order_value: 0
    };

    const previousCustomerStats = await database.get(`
      SELECT 
        COALESCE(COUNT(*), 0) as total_customers
      FROM customers 
      WHERE created_at >= NOW() - INTERVAL '${previousPeriod} days' 
        AND created_at < NOW() - INTERVAL '${period} days'
        AND is_active = true
    `) || {
      total_customers: 0
    };

    res.json({
      // Main metrics (expected by frontend)
      total_revenue: salesStats.total_revenue,
      total_orders: salesStats.total_orders,
      total_customers: customerStats.total_customers,
      avg_order_value: salesStats.avg_order_value,
      
      // Previous period for comparison
      previous_revenue: previousSalesStats.total_revenue,
      previous_orders: previousSalesStats.total_orders,
      previous_customers: previousCustomerStats.total_customers,
      previous_avg_order_value: previousSalesStats.avg_order_value,
      
      // Additional data
      completed_orders: salesStats.completed_orders,
      pending_orders: salesStats.pending_orders,
      cancelled_orders: salesStats.cancelled_orders,
      total_products: inventoryStats.total_products,
      active_shops: 0, // Will be calculated separately if needed
      loyalty_members: 0, // Will be calculated separately if needed
      
      // Nested data for other components
      sales: salesStats,
      inventory: inventoryStats,
      customers: customerStats,
      top_products: topProducts,
      recent_orders: recentOrders,
      low_stock_alerts: lowStockAlerts,
      
      // Calculate today's performance
      today_sales: await getTodaySales(userFilter, userFilterParams),
      today_orders: await getTodayOrders(userFilter, userFilterParams),
      revenue_trend: await getRevenueTrend(period, userFilter, userFilterParams),
      recent_activities: [] // Will be populated separately
    });
  } catch (error) {
    console.error('Get dashboard overview error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get sales analytics
router.get('/sales-analytics', auth, blockCashiers, async (req, res) => {
  try {
    const { period = '30', group_by = 'day' } = req.query;

    let timeFormat, groupClause;
    if (group_by === 'day') {
      timeFormat = '%Y-%m-%d';
      groupClause = 'DATE(created_at)';
    } else if (group_by === 'week') {
      timeFormat = '%Y-W%W';
      groupClause = 'strftime("%Y-W%W", created_at)';
    } else if (group_by === 'month') {
      timeFormat = '%Y-%m';
      groupClause = 'strftime("%Y-%m", created_at)';
    }

    const salesData = await database.all(`
      SELECT 
        ${groupClause} as period,
        COUNT(*) as order_count,
        SUM(total_amount) as revenue,
        AVG(total_amount) as avg_order_value
      FROM orders 
      WHERE created_at >= NOW() - INTERVAL '${period} days'
        AND status = 'completed'
      GROUP BY ${groupClause}
      ORDER BY period
    `);

    // Currency breakdown
    const currencyBreakdown = await database.all(`
      SELECT 
        currency,
        COUNT(*) as order_count,
        SUM(total_amount) as total_revenue
      FROM orders 
      WHERE created_at >= NOW() - INTERVAL '${period} days'
        AND status = 'completed'
      GROUP BY currency
      ORDER BY total_revenue DESC
    `);

    res.json({
      sales_data: salesData,
      currency_breakdown: currencyBreakdown
    });
  } catch (error) {
    console.error('Get sales analytics error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get inventory analytics
router.get('/inventory-analytics', auth, blockCashiers, async (req, res) => {
  try {
    // Category breakdown
    const categoryBreakdown = await database.all(`
      SELECT 
        c.name as category_name,
        COUNT(DISTINCT p.id) as product_count,
        SUM(p.stock_quantity) as total_stock,
        AVG(p.stock_quantity) as avg_stock
      FROM products p
      LEFT JOIN product_categories pc ON p.id = pc.product_id
      LEFT JOIN categories c ON pc.category_id = c.id
      WHERE p.is_active = true
      GROUP BY c.id
      ORDER BY total_stock DESC
    `);

    // Stock value by category
    const stockValue = await database.all(`
      SELECT 
        c.name as category_name,
        SUM(p.stock_quantity * p.cost_price) as total_value,
        COUNT(DISTINCT p.id) as product_count
      FROM products p
      LEFT JOIN product_categories pc ON p.id = pc.product_id
      LEFT JOIN categories c ON pc.category_id = c.id
      WHERE p.is_active = true AND p.cost_price IS NOT NULL
      GROUP BY c.id
      ORDER BY total_value DESC
    `);

    // Recent inventory transactions
    const recentTransactions = await database.all(`
      SELECT 
        it.*,
        p.name as product_name,
        p.sku,
        u.username as created_by_user
      FROM inventory_transactions it
      LEFT JOIN products p ON it.product_id = p.id
      LEFT JOIN users u ON it.created_by = u.id
      ORDER BY it.created_at DESC
      LIMIT 20
    `);

    res.json({
      category_breakdown: categoryBreakdown,
      stock_value: stockValue,
      recent_transactions: recentTransactions
    });
  } catch (error) {
    console.error('Get inventory analytics error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get customer analytics
router.get('/customer-analytics', auth, blockCashiers, async (req, res) => {
  try {
    const { period = '30' } = req.query;

    // Customer growth
    const customerGrowth = await database.all(`
      SELECT 
        DATE(created_at) as date,
        COUNT(*) as new_customers
      FROM customers 
      WHERE created_at >= NOW() - INTERVAL '${period} days'
      GROUP BY DATE(created_at)
      ORDER BY date
    `);

    // Top customers
    const topCustomers = await database.all(`
      SELECT 
        c.first_name,
        c.last_name,
        c.email,
        c.total_spent,
        COUNT(o.id) as order_count
      FROM customers c
      LEFT JOIN orders o ON c.id = o.customer_id
      WHERE c.is_active = true
      GROUP BY c.id
      ORDER BY c.total_spent DESC
      LIMIT 10
    `);

    // Customer retention
    const customerRetention = await database.all(`
      SELECT 
        COUNT(DISTINCT customer_id) as repeat_customers,
        COUNT(DISTINCT CASE WHEN order_count > 1 THEN customer_id END) as multiple_orders
      FROM (
        SELECT 
          customer_id,
          COUNT(*) as order_count
        FROM orders 
        WHERE created_at >= NOW() - INTERVAL '${period} days'
        GROUP BY customer_id
      )
    `);

    res.json({
      customer_growth: customerGrowth,
      top_customers: topCustomers,
      customer_retention: customerRetention
    });
  } catch (error) {
    console.error('Get customer analytics error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get revenue trends
router.get('/revenue-trends', auth, blockCashiers, async (req, res) => {
  try {
    const { period = '30' } = req.query;

    const revenueTrends = await database.all(`
      SELECT 
        DATE(created_at) as date,
        SUM(total_amount) as daily_revenue,
        COUNT(*) as order_count,
        AVG(total_amount) as avg_order_value
      FROM orders 
      WHERE created_at >= NOW() - INTERVAL '${period} days'
        AND status = 'completed'
      GROUP BY DATE(created_at)
      ORDER BY date
    `);

    // Monthly comparison
    const monthlyComparison = await database.all(`
      SELECT 
        strftime('%Y-%m', created_at) as month,
        SUM(total_amount) as monthly_revenue,
        COUNT(*) as order_count
      FROM orders 
      WHERE created_at >= NOW() - INTERVAL '12 months'
        AND status = 'completed'
      GROUP BY strftime('%Y-%m', created_at)
      ORDER BY month
    `);

    res.json({
      daily_trends: revenueTrends,
      monthly_comparison: monthlyComparison
    });
  } catch (error) {
    console.error('Get revenue trends error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router; 