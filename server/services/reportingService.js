const database = require('../database/database');
const moment = require('moment');

class ReportingService {
  constructor() {
    this.reportTypes = {
      'sales': this.generateSalesReport,
      'inventory': this.generateInventoryReport,
      'customer': this.generateCustomerReport,
      'financial': this.generateFinancialReport,
      'performance': this.generatePerformanceReport,
      'forecasting': this.generateForecastingReport
    };
  }

  /**
   * Generate comprehensive sales report
   */
  async generateSalesReport(params = {}) {
    const {
      startDate = moment().subtract(30, 'days').format('YYYY-MM-DD'),
      endDate = moment().format('YYYY-MM-DD'),
      shopId = null,
      groupBy = 'day'
    } = params;

    try {
      // Base sales data
      const salesQuery = `
        SELECT 
          DATE(o.created_at) as date,
          COUNT(*) as total_orders,
          SUM(o.total_amount) as total_revenue,
          AVG(o.total_amount) as avg_order_value,
          COUNT(DISTINCT o.customer_id) as unique_customers
        FROM orders o
        WHERE o.created_at BETWEEN ? AND ?
        ${shopId ? 'AND o.shop_id = ?' : ''}
        GROUP BY DATE(o.created_at)
        ORDER BY date
      `;

      const salesParams = shopId ? [startDate, endDate, shopId] : [startDate, endDate];
      const salesData = await database.all(salesQuery, salesParams);

      // Top selling products
      const topProductsQuery = `
        SELECT 
          p.name as product_name,
          p.sku,
          SUM(oi.quantity) as total_quantity,
          SUM(oi.quantity * oi.unit_price) as total_revenue
        FROM order_items oi
        JOIN products p ON oi.product_id = p.id
        JOIN orders o ON oi.order_id = o.id
        WHERE o.created_at BETWEEN ? AND ?
        ${shopId ? 'AND o.shop_id = ?' : ''}
        GROUP BY p.id
        ORDER BY total_quantity DESC
        LIMIT 10
      `;

      const topProducts = await database.all(topProductsQuery, salesParams);

      // Sales by category
      const categorySalesQuery = `
        SELECT 
          c.name as category_name,
          SUM(oi.quantity * oi.unit_price) as total_revenue,
          COUNT(DISTINCT o.id) as order_count
        FROM order_items oi
        JOIN products p ON oi.product_id = p.id
        JOIN product_categories pc ON p.id = pc.product_id
        JOIN categories c ON pc.category_id = c.id
        JOIN orders o ON oi.order_id = o.id
        WHERE o.created_at BETWEEN ? AND ?
        ${shopId ? 'AND o.shop_id = ?' : ''}
        GROUP BY c.id
        ORDER BY total_revenue DESC
      `;

      const categorySales = await database.all(categorySalesQuery, salesParams);

      // Payment method analysis
      const paymentMethodQuery = `
        SELECT 
          payment_method,
          COUNT(*) as order_count,
          SUM(total_amount) as total_revenue
        FROM orders
        WHERE created_at BETWEEN ? AND ?
        ${shopId ? 'AND shop_id = ?' : ''}
        GROUP BY payment_method
        ORDER BY total_revenue DESC
      `;

      const paymentMethods = await database.all(paymentMethodQuery, salesParams);

      return {
        period: { startDate, endDate },
        summary: {
          totalOrders: salesData.reduce((sum, row) => sum + row.total_orders, 0),
          totalRevenue: salesData.reduce((sum, row) => sum + row.total_revenue, 0),
          avgOrderValue: salesData.reduce((sum, row) => sum + row.avg_order_value, 0) / salesData.length,
          uniqueCustomers: salesData.reduce((sum, row) => sum + row.unique_customers, 0)
        },
        dailyData: salesData,
        topProducts,
        categorySales,
        paymentMethods
      };
    } catch (error) {
      console.error('Error generating sales report:', error);
      throw error;
    }
  }

  /**
   * Generate inventory report
   */
  async generateInventoryReport(params = {}) {
    const { shopId = null } = params;

    try {
      // Current inventory levels
      const inventoryQuery = `
        SELECT 
          p.name,
          p.sku,
          p.stock_quantity,
          p.min_stock_level,
          p.max_stock_level,
          c.name as category_name,
          b.name as brand_name,
          CASE 
            WHEN p.stock_quantity <= p.min_stock_level THEN 'Low Stock'
            WHEN p.stock_quantity = 0 THEN 'Out of Stock'
            ELSE 'In Stock'
          END as stock_status
        FROM products p
        LEFT JOIN product_categories pc ON p.id = pc.product_id
        LEFT JOIN categories c ON pc.category_id = c.id
        LEFT JOIN brands b ON p.brand_id = b.id
        ${shopId ? 'WHERE p.shop_id = ?' : ''}
        ORDER BY p.stock_quantity ASC
      `;

      const inventory = await database.all(inventoryQuery, shopId ? [shopId] : []);

      // Low stock items
      const lowStockQuery = `
        SELECT 
          p.name,
          p.sku,
          p.stock_quantity,
          p.min_stock_level,
          (p.min_stock_level - p.stock_quantity) as shortage
        FROM products p
        WHERE p.stock_quantity <= p.min_stock_level
        ${shopId ? 'AND p.shop_id = ?' : ''}
        ORDER BY shortage DESC
      `;

      const lowStockItems = await database.all(lowStockQuery, shopId ? [shopId] : []);

      // Inventory value
      const inventoryValueQuery = `
        SELECT 
          SUM(p.stock_quantity * p.cost_price) as total_value,
          COUNT(*) as total_products,
          AVG(p.stock_quantity) as avg_stock_level
        FROM products p
        ${shopId ? 'WHERE p.shop_id = ?' : ''}
      `;

      const inventoryValue = await database.get(inventoryValueQuery, shopId ? [shopId] : []);

      // Stock movement (last 30 days)
      const stockMovementQuery = `
        SELECT 
          p.name,
          p.sku,
          SUM(CASE WHEN it.type = 'in' THEN it.quantity ELSE 0 END) as stock_in,
          SUM(CASE WHEN it.type = 'out' THEN it.quantity ELSE 0 END) as stock_out,
          (SUM(CASE WHEN it.type = 'in' THEN it.quantity ELSE 0 END) - 
           SUM(CASE WHEN it.type = 'out' THEN it.quantity ELSE 0 END)) as net_movement
        FROM inventory_transactions it
        JOIN products p ON it.product_id = p.id
        WHERE it.created_at >= datetime('now', '-30 days')
        ${shopId ? 'AND p.shop_id = ?' : ''}
        GROUP BY p.id
        ORDER BY ABS(net_movement) DESC
        LIMIT 20
      `;

      const stockMovement = await database.all(stockMovementQuery, shopId ? [shopId] : []);

      return {
        currentInventory: inventory,
        lowStockItems,
        inventoryValue,
        stockMovement,
        summary: {
          totalProducts: inventoryValue.total_products,
          totalValue: inventoryValue.total_value,
          lowStockCount: lowStockItems.length,
          outOfStockCount: inventory.filter(item => item.stock_status === 'Out of Stock').length
        }
      };
    } catch (error) {
      console.error('Error generating inventory report:', error);
      throw error;
    }
  }

  /**
   * Generate customer report
   */
  async generateCustomerReport(params = {}) {
    const {
      startDate = moment().subtract(30, 'days').format('YYYY-MM-DD'),
      endDate = moment().format('YYYY-MM-DD'),
      shopId = null
    } = params;

    try {
      // Customer acquisition
      const customerAcquisitionQuery = `
        SELECT 
          DATE(c.created_at) as date,
          COUNT(*) as new_customers
        FROM customers c
        WHERE c.created_at BETWEEN ? AND ?
        ${shopId ? 'AND c.shop_id = ?' : ''}
        GROUP BY DATE(c.created_at)
        ORDER BY date
      `;

      const acquisitionParams = shopId ? [startDate, endDate, shopId] : [startDate, endDate];
      const customerAcquisition = await database.all(customerAcquisitionQuery, acquisitionParams);

      // Top customers by revenue
      const topCustomersQuery = `
        SELECT 
          c.name,
          c.email,
          c.phone,
          COUNT(o.id) as total_orders,
          SUM(o.total_amount) as total_spent,
          AVG(o.total_amount) as avg_order_value,
          MAX(o.created_at) as last_order_date
        FROM customers c
        JOIN orders o ON c.id = o.customer_id
        WHERE o.created_at BETWEEN ? AND ?
        ${shopId ? 'AND o.shop_id = ?' : ''}
        GROUP BY c.id
        ORDER BY total_spent DESC
        LIMIT 20
      `;

      const topCustomers = await database.all(topCustomersQuery, acquisitionParams);

      // Customer loyalty analysis
      const loyaltyQuery = `
        SELECT 
          c.name,
          c.email,
          l.points_balance,
          l.tier_level,
          COUNT(o.id) as total_orders,
          SUM(o.total_amount) as total_spent
        FROM customers c
        LEFT JOIN loyalty_accounts l ON c.id = l.customer_id
        LEFT JOIN orders o ON c.id = o.customer_id
        WHERE o.created_at BETWEEN ? AND ?
        ${shopId ? 'AND o.shop_id = ?' : ''}
        GROUP BY c.id
        ORDER BY l.points_balance DESC
        LIMIT 20
      `;

      const loyaltyCustomers = await database.all(loyaltyQuery, acquisitionParams);

      // Customer segments
      const customerSegmentsQuery = `
        SELECT 
          CASE 
            WHEN total_spent >= 1000 THEN 'High Value'
            WHEN total_spent >= 500 THEN 'Medium Value'
            ELSE 'Low Value'
          END as segment,
          COUNT(*) as customer_count,
          AVG(total_spent) as avg_spent
        FROM (
          SELECT 
            c.id,
            SUM(o.total_amount) as total_spent
          FROM customers c
          JOIN orders o ON c.id = o.customer_id
          WHERE o.created_at BETWEEN ? AND ?
          ${shopId ? 'AND o.shop_id = ?' : ''}
          GROUP BY c.id
        ) customer_totals
        GROUP BY segment
      `;

      const customerSegments = await database.all(customerSegmentsQuery, acquisitionParams);

      return {
        period: { startDate, endDate },
        customerAcquisition,
        topCustomers,
        loyaltyCustomers,
        customerSegments,
        summary: {
          newCustomers: customerAcquisition.reduce((sum, row) => sum + row.new_customers, 0),
          totalCustomers: topCustomers.length,
          avgCustomerValue: topCustomers.reduce((sum, customer) => sum + customer.total_spent, 0) / topCustomers.length
        }
      };
    } catch (error) {
      console.error('Error generating customer report:', error);
      throw error;
    }
  }

  /**
   * Generate financial report
   */
  async generateFinancialReport(params = {}) {
    const {
      startDate = moment().subtract(30, 'days').format('YYYY-MM-DD'),
      endDate = moment().format('YYYY-MM-DD'),
      shopId = null
    } = params;

    try {
      // Revenue analysis
      const revenueQuery = `
        SELECT 
          DATE(o.created_at) as date,
          SUM(o.total_amount) as revenue,
          SUM(oi.quantity * oi.unit_cost) as cost_of_goods,
          SUM(o.total_amount - (oi.quantity * oi.unit_cost)) as gross_profit
        FROM orders o
        JOIN order_items oi ON o.id = oi.order_id
        WHERE o.created_at BETWEEN ? AND ?
        ${shopId ? 'AND o.shop_id = ?' : ''}
        GROUP BY DATE(o.created_at)
        ORDER BY date
      `;

      const revenueParams = shopId ? [startDate, endDate, shopId] : [startDate, endDate];
      const revenueData = await database.all(revenueQuery, revenueParams);

      // Expense analysis
      const expenseQuery = `
        SELECT 
          DATE(e.created_at) as date,
          e.category,
          SUM(e.amount) as total_amount
        FROM expenses e
        WHERE e.created_at BETWEEN ? AND ?
        ${shopId ? 'AND e.shop_id = ?' : ''}
        GROUP BY DATE(e.created_at), e.category
        ORDER BY date
      `;

      const expenses = await database.all(expenseQuery, revenueParams);

      // Profit margins by category
      const marginQuery = `
        SELECT 
          c.name as category_name,
          SUM(oi.quantity * oi.unit_price) as revenue,
          SUM(oi.quantity * oi.unit_cost) as cost,
          SUM(oi.quantity * oi.unit_price - oi.quantity * oi.unit_cost) as gross_profit,
          (SUM(oi.quantity * oi.unit_price - oi.quantity * oi.unit_cost) / SUM(oi.quantity * oi.unit_price)) * 100 as margin_percentage
        FROM order_items oi
        JOIN products p ON oi.product_id = p.id
        JOIN product_categories pc ON p.id = pc.product_id
        JOIN categories c ON pc.category_id = c.id
        JOIN orders o ON oi.order_id = o.id
        WHERE o.created_at BETWEEN ? AND ?
        ${shopId ? 'AND o.shop_id = ?' : ''}
        GROUP BY c.id
        ORDER BY margin_percentage DESC
      `;

      const margins = await database.all(marginQuery, revenueParams);

      // Cash flow
      const cashFlowQuery = `
        SELECT 
          DATE(o.created_at) as date,
          SUM(CASE WHEN o.payment_method = 'cash' THEN o.total_amount ELSE 0 END) as cash_inflow,
          SUM(CASE WHEN o.payment_method != 'cash' THEN o.total_amount ELSE 0 END) as card_inflow
        FROM orders o
        WHERE o.created_at BETWEEN ? AND ?
        ${shopId ? 'AND o.shop_id = ?' : ''}
        GROUP BY DATE(o.created_at)
        ORDER BY date
      `;

      const cashFlow = await database.all(cashFlowQuery, revenueParams);

      const totalRevenue = revenueData.reduce((sum, row) => sum + row.revenue, 0);
      const totalCost = revenueData.reduce((sum, row) => sum + row.cost_of_goods, 0);
      const totalProfit = revenueData.reduce((sum, row) => sum + row.gross_profit, 0);

      return {
        period: { startDate, endDate },
        revenueData,
        expenses,
        margins,
        cashFlow,
        summary: {
          totalRevenue,
          totalCost,
          totalProfit,
          profitMargin: (totalProfit / totalRevenue) * 100,
          avgDailyRevenue: totalRevenue / revenueData.length
        }
      };
    } catch (error) {
      console.error('Error generating financial report:', error);
      throw error;
    }
  }

  /**
   * Generate performance report
   */
  async generatePerformanceReport(params = {}) {
    const {
      startDate = moment().subtract(30, 'days').format('YYYY-MM-DD'),
      endDate = moment().format('YYYY-MM-DD'),
      shopId = null
    } = params;

    try {
      // Sales performance by day of week
      const dayOfWeekQuery = `
        SELECT 
          strftime('%w', o.created_at) as day_of_week,
          COUNT(*) as order_count,
          SUM(o.total_amount) as total_revenue
        FROM orders o
        WHERE o.created_at BETWEEN ? AND ?
        ${shopId ? 'AND o.shop_id = ?' : ''}
        GROUP BY strftime('%w', o.created_at)
        ORDER BY day_of_week
      `;

      const dayOfWeekParams = shopId ? [startDate, endDate, shopId] : [startDate, endDate];
      const dayOfWeekPerformance = await database.all(dayOfWeekQuery, dayOfWeekParams);

      // Hourly performance
      const hourlyQuery = `
        SELECT 
          strftime('%H', o.created_at) as hour,
          COUNT(*) as order_count,
          SUM(o.total_amount) as total_revenue
        FROM orders o
        WHERE o.created_at BETWEEN ? AND ?
        ${shopId ? 'AND o.shop_id = ?' : ''}
        GROUP BY strftime('%H', o.created_at)
        ORDER BY hour
      `;

      const hourlyPerformance = await database.all(hourlyQuery, dayOfWeekParams);

      // Conversion rate (orders per customer)
      const conversionQuery = `
        SELECT 
          COUNT(DISTINCT o.customer_id) as unique_customers,
          COUNT(o.id) as total_orders,
          CAST(COUNT(o.id) AS FLOAT) / COUNT(DISTINCT o.customer_id) as orders_per_customer
        FROM orders o
        WHERE o.created_at BETWEEN ? AND ?
        ${shopId ? 'AND o.shop_id = ?' : ''}
      `;

      const conversionRate = await database.get(conversionQuery, dayOfWeekParams);

      // Product performance
      const productPerformanceQuery = `
        SELECT 
          p.name,
          p.sku,
          SUM(oi.quantity) as units_sold,
          SUM(oi.quantity * oi.unit_price) as revenue,
          AVG(oi.unit_price) as avg_price,
          COUNT(DISTINCT o.id) as order_count
        FROM order_items oi
        JOIN products p ON oi.product_id = p.id
        JOIN orders o ON oi.order_id = o.id
        WHERE o.created_at BETWEEN ? AND ?
        ${shopId ? 'AND o.shop_id = ?' : ''}
        GROUP BY p.id
        ORDER BY units_sold DESC
        LIMIT 20
      `;

      const productPerformance = await database.all(productPerformanceQuery, dayOfWeekParams);

      return {
        period: { startDate, endDate },
        dayOfWeekPerformance,
        hourlyPerformance,
        conversionRate,
        productPerformance,
        summary: {
          totalOrders: dayOfWeekPerformance.reduce((sum, row) => sum + row.order_count, 0),
          totalRevenue: dayOfWeekPerformance.reduce((sum, row) => sum + row.total_revenue, 0),
          avgOrdersPerCustomer: conversionRate.orders_per_customer,
          bestPerformingHour: hourlyPerformance.reduce((best, current) => 
            current.total_revenue > best.total_revenue ? current : best
          )
        }
      };
    } catch (error) {
      console.error('Error generating performance report:', error);
      throw error;
    }
  }

  /**
   * Generate forecasting report
   */
  async generateForecastingReport(params = {}) {
    const { shopId = null, forecastDays = 30 } = params;

    try {
      // Historical sales data for forecasting
      const historicalQuery = `
        SELECT 
          DATE(o.created_at) as date,
          COUNT(*) as order_count,
          SUM(o.total_amount) as revenue,
          AVG(o.total_amount) as avg_order_value
        FROM orders o
        WHERE o.created_at >= datetime('now', '-90 days')
        ${shopId ? 'AND o.shop_id = ?' : ''}
        GROUP BY DATE(o.created_at)
        ORDER BY date
      `;

      const historicalData = await database.all(historicalQuery, shopId ? [shopId] : []);

      // Simple moving average forecast
      const forecast = this.calculateForecast(historicalData, forecastDays);

      // Seasonal analysis
      const seasonalQuery = `
        SELECT 
          strftime('%m', o.created_at) as month,
          AVG(o.total_amount) as avg_revenue,
          COUNT(*) as order_count
        FROM orders o
        WHERE o.created_at >= datetime('now', '-1 year')
        ${shopId ? 'AND o.shop_id = ?' : ''}
        GROUP BY strftime('%m', o.created_at)
        ORDER BY month
      `;

      const seasonalData = await database.all(seasonalQuery, shopId ? [shopId] : []);

      // Demand forecasting for products
      const productDemandQuery = `
        SELECT 
          p.name,
          p.sku,
          AVG(daily_demand) as avg_daily_demand,
          MAX(daily_demand) as peak_demand,
          MIN(daily_demand) as min_demand
        FROM (
          SELECT 
            oi.product_id,
            DATE(o.created_at) as date,
            SUM(oi.quantity) as daily_demand
          FROM order_items oi
          JOIN orders o ON oi.order_id = o.id
          WHERE o.created_at >= datetime('now', '-30 days')
          ${shopId ? 'AND o.shop_id = ?' : ''}
          GROUP BY oi.product_id, DATE(o.created_at)
        ) daily_demands
        JOIN products p ON daily_demands.product_id = p.id
        GROUP BY p.id
        ORDER BY avg_daily_demand DESC
        LIMIT 20
      `;

      const productDemand = await database.all(productDemandQuery, shopId ? [shopId] : []);

      return {
        forecast,
        seasonalData,
        productDemand,
        summary: {
          forecastPeriod: forecastDays,
          predictedRevenue: forecast.reduce((sum, day) => sum + day.predictedRevenue, 0),
          predictedOrders: forecast.reduce((sum, day) => sum + day.predictedOrders, 0)
        }
      };
    } catch (error) {
      console.error('Error generating forecasting report:', error);
      throw error;
    }
  }

  /**
   * Calculate simple forecast using moving average
   */
  calculateForecast(historicalData, forecastDays) {
    const forecast = [];
    const windowSize = 7; // 7-day moving average

    if (historicalData.length < windowSize) {
      return forecast;
    }

    // Calculate moving averages
    const movingAverages = [];
    for (let i = windowSize - 1; i < historicalData.length; i++) {
      const window = historicalData.slice(i - windowSize + 1, i + 1);
      const avgRevenue = window.reduce((sum, day) => sum + day.revenue, 0) / windowSize;
      const avgOrders = window.reduce((sum, day) => sum + day.order_count, 0) / windowSize;
      movingAverages.push({ avgRevenue, avgOrders });
    }

    // Generate forecast
    const lastDate = new Date(historicalData[historicalData.length - 1].date);
    const trend = this.calculateTrend(historicalData);

    for (let i = 1; i <= forecastDays; i++) {
      const forecastDate = new Date(lastDate);
      forecastDate.setDate(forecastDate.getDate() + i);

      const lastAvg = movingAverages[movingAverages.length - 1];
      const predictedRevenue = lastAvg.avgRevenue * (1 + trend.revenueTrend);
      const predictedOrders = lastAvg.avgOrders * (1 + trend.orderTrend);

      forecast.push({
        date: forecastDate.toISOString().split('T')[0],
        predictedRevenue: Math.max(0, predictedRevenue),
        predictedOrders: Math.max(0, Math.round(predictedOrders))
      });
    }

    return forecast;
  }

  /**
   * Calculate trend from historical data
   */
  calculateTrend(historicalData) {
    if (historicalData.length < 2) {
      return { revenueTrend: 0, orderTrend: 0 };
    }

    const recent = historicalData.slice(-7);
    const previous = historicalData.slice(-14, -7);

    if (previous.length === 0) {
      return { revenueTrend: 0, orderTrend: 0 };
    }

    const recentAvgRevenue = recent.reduce((sum, day) => sum + day.revenue, 0) / recent.length;
    const previousAvgRevenue = previous.reduce((sum, day) => sum + day.revenue, 0) / previous.length;
    const recentAvgOrders = recent.reduce((sum, day) => sum + day.order_count, 0) / recent.length;
    const previousAvgOrders = previous.reduce((sum, day) => sum + day.order_count, 0) / previous.length;

    const revenueTrend = previousAvgRevenue > 0 ? (recentAvgRevenue - previousAvgRevenue) / previousAvgRevenue : 0;
    const orderTrend = previousAvgOrders > 0 ? (recentAvgOrders - previousAvgOrders) / previousAvgOrders : 0;

    return { revenueTrend, orderTrend };
  }

  /**
   * Generate report by type
   */
  async generateReport(type, params = {}) {
    if (!this.reportTypes[type]) {
      throw new Error(`Unknown report type: ${type}`);
    }

    return await this.reportTypes[type](params);
  }

  /**
   * Export report to different formats
   */
  async exportReport(reportData, format = 'json') {
    switch (format.toLowerCase()) {
      case 'json':
        return JSON.stringify(reportData, null, 2);
      case 'csv':
        return this.convertToCSV(reportData);
      case 'pdf':
        return await this.convertToPDF(reportData);
      default:
        throw new Error(`Unsupported export format: ${format}`);
    }
  }

  /**
   * Convert report data to CSV
   */
  convertToCSV(data) {
    // Implementation for CSV conversion
    // This is a simplified version - you might want to use a library like 'json2csv'
    return JSON.stringify(data);
  }

  /**
   * Convert report data to PDF
   */
  async convertToPDF(data) {
    // Implementation for PDF conversion
    // You might want to use a library like 'puppeteer' or 'html-pdf'
    return JSON.stringify(data);
  }
}

module.exports = new ReportingService();
