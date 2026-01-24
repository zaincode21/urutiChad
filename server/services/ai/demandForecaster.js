const database = require('../../database/database');

class DemandForecaster {
  constructor() {
    this.forecastPeriods = 30; // Days to forecast
    this.historyPeriods = 90; // Days of history to analyze
  }

  /**
   * Generate demand forecast for a specific product
   */
  async forecastProductDemand(productId, days = 30) {
    try {
      // Get historical sales data
      const salesHistory = await this.getSalesHistory(productId);
      
      if (salesHistory.length === 0) {
        return this.generateDefaultForecast(productId);
      }

      // Calculate different forecasting models
      const simpleAverage = this.calculateSimpleAverage(salesHistory);
      const movingAverage = this.calculateMovingAverage(salesHistory, 7);
      const trendForecast = this.calculateTrendForecast(salesHistory);
      const seasonalForecast = await this.calculateSeasonalForecast(productId, salesHistory);

      // Combine forecasts with weights
      const combinedForecast = this.combineForecasts([
        { forecast: simpleAverage, weight: 0.2 },
        { forecast: movingAverage, weight: 0.3 },
        { forecast: trendForecast, weight: 0.3 },
        { forecast: seasonalForecast, weight: 0.2 }
      ]);

      // Generate daily forecasts
      const dailyForecasts = this.generateDailyForecasts(combinedForecast, days);

      return {
        productId,
        forecastPeriod: days,
        dailyForecasts,
        summary: {
          averageDailyDemand: combinedForecast,
          totalForecastedDemand: combinedForecast * days,
          confidence: this.calculateConfidence(salesHistory),
          trend: this.getTrendDirection(salesHistory)
        },
        models: {
          simpleAverage,
          movingAverage,
          trendForecast,
          seasonalForecast
        }
      };
    } catch (error) {
      console.error('Demand forecasting error:', error);
      return this.generateDefaultForecast(productId);
    }
  }

  /**
   * Get historical sales data for a product
   */
  async getSalesHistory(productId) {
    try {
      const sales = await database.all(`
        SELECT 
          DATE(oi.created_at) as sale_date,
          SUM(oi.quantity) as daily_quantity,
          COUNT(*) as daily_orders
        FROM order_items oi
        JOIN orders o ON oi.order_id = o.id
        WHERE oi.product_id = ? 
          AND o.status = 'completed'
          AND oi.created_at >= date('now', '-${this.historyPeriods} days')
        GROUP BY DATE(oi.created_at)
        ORDER BY sale_date ASC
      `, [productId]);

      return sales;
    } catch (error) {
      console.error('Sales history retrieval error:', error);
      return [];
    }
  }

  /**
   * Calculate simple average of historical sales
   */
  calculateSimpleAverage(salesHistory) {
    if (salesHistory.length === 0) return 0;
    
    const totalQuantity = salesHistory.reduce((sum, sale) => sum + sale.daily_quantity, 0);
    return totalQuantity / salesHistory.length;
  }

  /**
   * Calculate moving average with specified window
   */
  calculateMovingAverage(salesHistory, window = 7) {
    if (salesHistory.length < window) {
      return this.calculateSimpleAverage(salesHistory);
    }

    const recentSales = salesHistory.slice(-window);
    return this.calculateSimpleAverage(recentSales);
  }

  /**
   * Calculate trend-based forecast
   */
  calculateTrendForecast(salesHistory) {
    if (salesHistory.length < 7) {
      return this.calculateSimpleAverage(salesHistory);
    }

    // Split data into two periods
    const midPoint = Math.floor(salesHistory.length / 2);
    const firstHalf = salesHistory.slice(0, midPoint);
    const secondHalf = salesHistory.slice(midPoint);

    const firstAvg = this.calculateSimpleAverage(firstHalf);
    const secondAvg = this.calculateSimpleAverage(secondHalf);

    // Calculate trend
    const trend = secondAvg - firstAvg;
    const recentAvg = this.calculateSimpleAverage(salesHistory.slice(-7));

    return Math.max(0, recentAvg + trend);
  }

  /**
   * Calculate seasonal forecast based on day of week patterns
   */
  async calculateSeasonalForecast(productId, salesHistory) {
    if (salesHistory.length < 14) {
      return this.calculateSimpleAverage(salesHistory);
    }

    try {
      // Get day-of-week patterns
      const dayOfWeekSales = await database.all(`
        SELECT 
          strftime('%w', oi.created_at) as day_of_week,
          AVG(oi.quantity) as avg_quantity
        FROM order_items oi
        JOIN orders o ON oi.order_id = o.id
        WHERE oi.product_id = ? 
          AND o.status = 'completed'
          AND oi.created_at >= date('now', '-${this.historyPeriods} days')
        GROUP BY strftime('%w', oi.created_at)
        ORDER BY day_of_week
      `, [productId]);

      if (dayOfWeekSales.length === 0) {
        return this.calculateSimpleAverage(salesHistory);
      }

      // Calculate average across all days
      const totalAvg = dayOfWeekSales.reduce((sum, day) => sum + day.avg_quantity, 0) / dayOfWeekSales.length;
      return totalAvg;
    } catch (error) {
      console.error('Seasonal forecast error:', error);
      return this.calculateSimpleAverage(salesHistory);
    }
  }

  /**
   * Combine multiple forecasts with weights
   */
  combineForecasts(forecasts) {
    let totalWeight = 0;
    let weightedSum = 0;

    forecasts.forEach(({ forecast, weight }) => {
      if (forecast > 0) {
        weightedSum += forecast * weight;
        totalWeight += weight;
      }
    });

    return totalWeight > 0 ? weightedSum / totalWeight : 0;
  }

  /**
   * Generate daily forecasts for the specified period
   */
  generateDailyForecasts(averageDemand, days) {
    const forecasts = [];
    const today = new Date();

    for (let i = 1; i <= days; i++) {
      const forecastDate = new Date(today);
      forecastDate.setDate(today.getDate() + i);

      // Apply day-of-week adjustments
      const dayOfWeek = forecastDate.getDay();
      let dailyForecast = averageDemand;

      // Weekend adjustment (typically lower sales)
      if (dayOfWeek === 0 || dayOfWeek === 6) {
        dailyForecast *= 0.8;
      }

      forecasts.push({
        date: forecastDate.toISOString().split('T')[0],
        forecastedDemand: Math.round(dailyForecast * 100) / 100,
        dayOfWeek: forecastDate.toLocaleDateString('en-US', { weekday: 'long' })
      });
    }

    return forecasts;
  }

  /**
   * Calculate confidence level based on data consistency
   */
  calculateConfidence(salesHistory) {
    if (salesHistory.length < 7) return 0.3;
    if (salesHistory.length < 30) return 0.6;
    if (salesHistory.length < 60) return 0.8;
    return 0.9;
  }

  /**
   * Determine trend direction
   */
  getTrendDirection(salesHistory) {
    if (salesHistory.length < 7) return 'insufficient_data';

    const recent = salesHistory.slice(-7);
    const older = salesHistory.slice(-14, -7);

    if (recent.length === 0 || older.length === 0) return 'insufficient_data';

    const recentAvg = this.calculateSimpleAverage(recent);
    const olderAvg = this.calculateSimpleAverage(older);

    const change = ((recentAvg - olderAvg) / olderAvg) * 100;

    if (change > 10) return 'increasing';
    if (change < -10) return 'decreasing';
    return 'stable';
  }

  /**
   * Generate default forecast for products with no history
   */
  async generateDefaultForecast(productId) {
    try {
      const product = await database.get('SELECT * FROM products WHERE id = ?', [productId]);
      
      if (!product) {
        return {
          productId,
          forecastPeriod: this.forecastPeriods,
          dailyForecasts: [],
          summary: {
            averageDailyDemand: 0,
            totalForecastedDemand: 0,
            confidence: 0,
            trend: 'no_data'
          },
          models: {
            simpleAverage: 0,
            movingAverage: 0,
            trendForecast: 0,
            seasonalForecast: 0
          }
        };
      }

      // Use product characteristics for initial estimate
      const baseDemand = this.estimateBaseDemand(product);
      
      return {
        productId,
        forecastPeriod: this.forecastPeriods,
        dailyForecasts: this.generateDailyForecasts(baseDemand, this.forecastPeriods),
        summary: {
          averageDailyDemand: baseDemand,
          totalForecastedDemand: baseDemand * this.forecastPeriods,
          confidence: 0.2,
          trend: 'estimated'
        },
        models: {
          simpleAverage: baseDemand,
          movingAverage: baseDemand,
          trendForecast: baseDemand,
          seasonalForecast: baseDemand
        }
      };
    } catch (error) {
      console.error('Default forecast generation error:', error);
      return null;
    }
  }

  /**
   * Estimate base demand based on product characteristics
   */
  estimateBaseDemand(product) {
    let baseDemand = 1; // Default daily demand

    // Adjust based on product type
    switch (product.product_type) {
      case 'perfume':
        baseDemand = 0.5; // Perfumes typically sell less frequently
        break;
      case 'shoes':
        baseDemand = 2;
        break;
      case 'clothing':
        baseDemand = 3;
        break;
      case 'accessory':
        baseDemand = 1.5;
        break;
      default:
        baseDemand = 1;
    }

    // Adjust based on price (higher price = lower frequency)
    if (product.price > 100) {
      baseDemand *= 0.7;
    } else if (product.price > 50) {
      baseDemand *= 0.85;
    }

    // Adjust based on current stock
    if (product.stock_quantity > 0) {
      baseDemand *= Math.min(1.5, 1 + (product.stock_quantity / 100));
    }

    return Math.max(0.1, baseDemand);
  }

  /**
   * Get inventory recommendations based on forecast
   */
  async getInventoryRecommendations(productId) {
    try {
      const forecast = await this.forecastProductDemand(productId);
      const product = await database.get('SELECT * FROM products WHERE id = ?', [productId]);

      if (!forecast || !product) {
        return null;
      }

      const { averageDailyDemand, totalForecastedDemand } = forecast.summary;
      const currentStock = product.stock_quantity || 0;
      const minStockLevel = product.min_stock_level || 0;

      // Calculate days of stock remaining
      const daysOfStock = currentStock / averageDailyDemand;

      // Generate recommendations
      const recommendations = [];

      if (daysOfStock < 7) {
        recommendations.push({
          type: 'urgent',
          message: 'Low stock alert: Consider immediate restocking',
          suggestedQuantity: Math.ceil(averageDailyDemand * 14) // 2 weeks supply
        });
      } else if (daysOfStock < 14) {
        recommendations.push({
          type: 'warning',
          message: 'Stock level is getting low',
          suggestedQuantity: Math.ceil(averageDailyDemand * 21) // 3 weeks supply
        });
      }

      if (currentStock < minStockLevel) {
        recommendations.push({
          type: 'critical',
          message: 'Stock below minimum level',
          suggestedQuantity: minStockLevel * 2
        });
      }

      // Suggest optimal stock level
      const optimalStock = Math.ceil(averageDailyDemand * 30); // 30 days supply
      if (currentStock < optimalStock) {
        recommendations.push({
          type: 'info',
          message: 'Consider increasing stock to optimal level',
          suggestedQuantity: optimalStock - currentStock
        });
      }

      return {
        productId,
        currentStock,
        forecastedDemand: totalForecastedDemand,
        daysOfStock,
        recommendations,
        optimalStockLevel: optimalStock
      };
    } catch (error) {
      console.error('Inventory recommendations error:', error);
      return null;
    }
  }

  /**
   * Get demand forecast summary for dashboard
   */
  async getForecastSummary() {
    try {
      const products = await database.all(`
        SELECT id, name, product_type, stock_quantity, min_stock_level
        FROM products 
        WHERE is_active = 1
        ORDER BY created_at DESC
        LIMIT 50
      `);

      const summary = {
        totalProducts: products.length,
        lowStockProducts: 0,
        outOfStockProducts: 0,
        trendingProducts: 0,
        averageDailyDemand: 0
      };

      let totalDemand = 0;

      for (const product of products) {
        const forecast = await this.forecastProductDemand(product.id, 7);
        if (forecast) {
          totalDemand += forecast.summary.averageDailyDemand;

          if (product.stock_quantity <= 0) {
            summary.outOfStockProducts++;
          } else if (product.stock_quantity < (product.min_stock_level || 5)) {
            summary.lowStockProducts++;
          }

          if (forecast.summary.trend === 'increasing') {
            summary.trendingProducts++;
          }
        }
      }

      summary.averageDailyDemand = totalDemand / products.length;

      return summary;
    } catch (error) {
      console.error('Forecast summary error:', error);
      return null;
    }
  }
}

module.exports = new DemandForecaster(); 