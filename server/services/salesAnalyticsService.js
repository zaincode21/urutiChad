const database = require('../database/database');
const moment = require('moment');

class SalesAnalyticsService {
  /**
   * Get comprehensive sales overview
   */
  async getSalesOverview(period = '30', user = null, shopId = null) {
    try {
      const startDate = moment().subtract(parseInt(period), 'days').format('YYYY-MM-DD');
      const endDate = moment().format('YYYY-MM-DD');
      
      // Add user filter for cashiers
      let userFilter = user?.role === 'cashier' ? `AND created_by = '${user.id}'` : '';
      
      // Add shop filter if specified
      let shopFilter = '';
      if (shopId && shopId !== 'all') {
        shopFilter = `AND shop_id = '${shopId}'`;
      }

      // Basic sales statistics
      const salesStats = await database.get(`
        SELECT 
          COUNT(*) as total_orders,
          SUM(total_amount) as total_revenue,
          AVG(total_amount) as avg_order_value,
          COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_orders,
          COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending_orders,
          COUNT(CASE WHEN status = 'cancelled' THEN 1 END) as cancelled_orders,
          SUM(CASE WHEN status = 'completed' THEN total_amount ELSE 0 END) as completed_revenue,
          COUNT(DISTINCT customer_id) as unique_customers
        FROM orders 
        WHERE created_at >= ? AND created_at <= ? ${userFilter} ${shopFilter}
      `, [startDate, endDate]);

      // Revenue trends by day
      const dailyRevenue = await database.all(`
        SELECT 
          DATE(created_at) as date,
          COUNT(*) as order_count,
          SUM(total_amount) as daily_revenue,
          AVG(total_amount) as avg_order_value
        FROM orders 
        WHERE created_at >= ? AND created_at <= ? AND status = 'completed' ${userFilter} ${shopFilter}
        GROUP BY DATE(created_at)
        ORDER BY date
      `, [startDate, endDate]);

      // Top selling products
      const topProducts = await database.all(`
        SELECT 
          p.name,
          p.sku,
          p.image_url,
          SUM(oi.quantity) as total_sold,
          SUM(oi.total_price) as total_revenue,
          AVG(oi.unit_price) as avg_price,
          COUNT(DISTINCT o.id) as order_count
        FROM order_items oi
        JOIN products p ON oi.product_id = p.id
        JOIN orders o ON oi.order_id = o.id
        WHERE o.created_at >= ? AND o.created_at <= ? AND o.status = 'completed' ${userFilter}
        GROUP BY p.id, p.name, p.sku, p.image_url
        ORDER BY total_sold DESC
        LIMIT 10
      `, [startDate, endDate]);

      // Sales by category
      const categorySales = await database.all(`
        SELECT 
          c.name as category_name,
          c.id as category_id,
          SUM(oi.quantity * oi.unit_price) as total_revenue,
          COUNT(DISTINCT o.id) as order_count,
          SUM(oi.quantity) as total_quantity
        FROM order_items oi
        JOIN products p ON oi.product_id = p.id
        JOIN product_categories pc ON p.id = pc.product_id
        JOIN categories c ON pc.category_id = c.id
        JOIN orders o ON oi.order_id = o.id
        WHERE o.created_at >= ? AND o.created_at <= ? AND o.status = 'completed' ${userFilter}
        GROUP BY c.id, c.name
        ORDER BY total_revenue DESC
      `, [startDate, endDate]);

      // Payment method analysis
      const paymentMethods = await database.all(`
        SELECT 
          payment_method,
          COUNT(*) as order_count,
          SUM(total_amount) as total_revenue,
          AVG(total_amount) as avg_order_value
        FROM orders
        WHERE created_at >= ? AND created_at <= ? AND status = 'completed' ${userFilter}
        GROUP BY payment_method
        ORDER BY total_revenue DESC
      `, [startDate, endDate]);

      // Customer analysis
      const customerAnalysis = await database.all(`
        SELECT 
          c.first_name,
          c.last_name,
          c.email,
          COUNT(o.id) as order_count,
          SUM(o.total_amount) as total_spent,
          AVG(o.total_amount) as avg_order_value,
          MAX(o.created_at) as last_order_date
        FROM customers c
        JOIN orders o ON c.id = o.customer_id
        WHERE o.created_at >= ? AND o.created_at <= ? AND o.status = 'completed'
        GROUP BY c.id, c.first_name, c.last_name, c.email
        ORDER BY total_spent DESC
        LIMIT 10
      `, [startDate, endDate]);

      // Invoice statistics
      const invoiceStats = await database.get(`
        SELECT 
          COUNT(DISTINCT o.id) as orders_with_invoices,
          SUM(o.total_amount) as invoiced_amount
        FROM orders o
        WHERE o.created_at >= ? AND o.created_at <= ? AND o.status = 'completed'
      `, [startDate, endDate]);

      return {
        period: { startDate, endDate, days: period },
        summary: {
          totalOrders: salesStats.total_orders || 0,
          totalRevenue: salesStats.total_revenue || 0,
          avgOrderValue: salesStats.avg_order_value || 0,
          completedOrders: salesStats.completed_orders || 0,
          pendingOrders: salesStats.pending_orders || 0,
          cancelledOrders: salesStats.cancelled_orders || 0,
          completedRevenue: salesStats.completed_revenue || 0,
          uniqueCustomers: salesStats.unique_customers || 0,
          conversionRate: salesStats.total_orders > 0 ? 
            ((salesStats.completed_orders / salesStats.total_orders) * 100).toFixed(2) : 0
        },
        trends: {
          dailyRevenue,
          totalDays: dailyRevenue.length,
          revenueGrowth: this.calculateGrowth(dailyRevenue, 'daily_revenue'),
          orderGrowth: this.calculateGrowth(dailyRevenue, 'order_count')
        },
        topProducts,
        categorySales,
        paymentMethods,
        customerAnalysis,
        invoiceStats: {
          ...invoiceStats,
          invoiceRate: salesStats.completed_orders > 0 ? 
            ((invoiceStats.orders_with_invoices / salesStats.completed_orders) * 100).toFixed(2) : 0
        }
      };
    } catch (error) {
      console.error('Error getting sales overview:', error);
      throw error;
    }
  }

  /**
   * Get sales performance by time periods
   */
  async getSalesPerformance(period = '30', groupBy = 'day', user = null) {
    try {
      const startDate = moment().subtract(parseInt(period), 'days').format('YYYY-MM-DD');
      const endDate = moment().format('YYYY-MM-DD');
      
      // Add user filter for cashiers
      const userFilter = user?.role === 'cashier' ? `AND created_by = '${user.id}'` : '';

      let timeFormat, groupClause;
      if (groupBy === 'day') {
        timeFormat = '%Y-%m-%d';
        groupClause = 'DATE(created_at)';
      } else if (groupBy === 'week') {
        timeFormat = '%Y-W%W';
        groupClause = 'strftime("%Y-W%W", created_at)';
      } else if (groupBy === 'month') {
        timeFormat = '%Y-%m';
        groupClause = 'strftime("%Y-%m", created_at)';
      } else if (groupBy === 'hour') {
        timeFormat = '%H';
        groupClause = 'strftime("%H", created_at)';
      }

      const performanceData = await database.all(`
        SELECT 
          ${groupClause} as period,
          COUNT(*) as order_count,
          SUM(total_amount) as revenue,
          AVG(total_amount) as avg_order_value,
          COUNT(DISTINCT customer_id) as unique_customers
        FROM orders 
        WHERE created_at >= ? AND created_at <= ? AND status = 'completed' ${userFilter}
        GROUP BY ${groupClause}
        ORDER BY period
      `, [startDate, endDate]);

      // Calculate performance metrics
      const totalRevenue = performanceData.reduce((sum, row) => sum + row.revenue, 0);
      const totalOrders = performanceData.reduce((sum, row) => sum + row.order_count, 0);
      const avgOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;

      // Find best and worst performing periods
      const bestPeriod = performanceData.reduce((best, current) => 
        current.revenue > best.revenue ? current : best
      );
      const worstPeriod = performanceData.reduce((worst, current) => 
        current.revenue < worst.revenue ? current : worst
      );

      return {
        period: { startDate, endDate, groupBy },
        data: performanceData,
        metrics: {
          totalRevenue,
          totalOrders,
          avgOrderValue,
          bestPeriod: {
            period: bestPeriod.period,
            revenue: bestPeriod.revenue,
            orders: bestPeriod.order_count
          },
          worstPeriod: {
            period: worstPeriod.period,
            revenue: worstPeriod.revenue,
            orders: worstPeriod.order_count
          }
        }
      };
    } catch (error) {
      console.error('Error getting sales performance:', error);
      throw error;
    }
  }

  /**
   * Get sales vs expenses comparison
   */
  async getSalesVsExpenses(period = '30') {
    try {
      const startDate = moment().subtract(parseInt(period), 'days').format('YYYY-MM-DD');
      const endDate = moment().format('YYYY-MM-DD');

      // Get sales data
      const salesData = await database.get(`
        SELECT 
          SUM(total_amount) as total_sales,
          COUNT(*) as order_count
        FROM orders 
        WHERE created_at >= ? AND created_at <= ? AND status = 'completed'
      `, [startDate, endDate]);

      // Get expenses data
      const expensesData = await database.get(`
        SELECT 
          SUM(amount) as total_expenses,
          COUNT(*) as expense_count
        FROM expenses 
        WHERE created_at >= ? AND created_at <= ? AND is_active = 1
      `, [startDate, endDate]);

      const totalSales = salesData.total_sales || 0;
      const totalExpenses = expensesData.total_expenses || 0;
      const netProfit = totalSales - totalExpenses;
      const profitMargin = totalSales > 0 ? (netProfit / totalSales) * 100 : 0;

      return {
        period: { startDate, endDate, days: period },
        sales: {
          total: totalSales,
          orders: salesData.order_count || 0
        },
        expenses: {
          total: totalExpenses,
          count: expensesData.expense_count || 0
        },
        profit: {
          net: netProfit,
          margin: profitMargin.toFixed(2),
          isPositive: netProfit > 0
        }
      };
    } catch (error) {
      console.error('Error getting sales vs expenses:', error);
      throw error;
    }
  }

  /**
   * Get invoice generation statistics
   */
  async getInvoiceStats(period = '30') {
    try {
      const startDate = moment().subtract(parseInt(period), 'days').format('YYYY-MM-DD');
      const endDate = moment().format('YYYY-MM-DD');

      // Get orders that should have invoices
      const orderStats = await database.get(`
        SELECT 
          COUNT(*) as total_orders,
          SUM(total_amount) as total_amount
        FROM orders 
        WHERE created_at >= ? AND created_at <= ? AND status = 'completed'
      `, [startDate, endDate]);

      // Get invoice generation metrics (this would need to be tracked in a separate table)
      // For now, we'll estimate based on order completion
      const estimatedInvoices = orderStats.total_orders || 0;
      const estimatedAmount = orderStats.total_amount || 0;

      return {
        period: { startDate, endDate, days: period },
        invoices: {
          estimated: estimatedInvoices,
          generated: estimatedInvoices, // This would come from actual invoice tracking
          pending: 0, // Orders without invoices
          totalAmount: estimatedAmount
        },
        efficiency: {
          generationRate: 100, // Percentage of orders with invoices
          averageProcessingTime: '24h' // Average time to generate invoice
        }
      };
    } catch (error) {
      console.error('Error getting invoice stats:', error);
      throw error;
    }
  }

  /**
   * Calculate growth percentage between periods
   */
  calculateGrowth(data, field) {
    if (data.length < 2) return 0;
    
    const firstValue = data[0][field] || 0;
    const lastValue = data[data.length - 1][field] || 0;
    
    if (firstValue === 0) return lastValue > 0 ? 100 : 0;
    
    return ((lastValue - firstValue) / firstValue * 100).toFixed(2);
  }
}

module.exports = new SalesAnalyticsService(); 