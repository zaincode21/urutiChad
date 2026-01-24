const database = require('../database/database');
const bottlingService = require('./bottlingService');

class PricingEngine {
  constructor() {
    this.pricingStrategies = {
      costPlus: this.costPlusPricing.bind(this),
      marketBased: this.marketBasedPricing.bind(this),
      valueBased: this.valueBasedPricing.bind(this),
      dynamic: this.dynamicPricing.bind(this),
      competitive: this.competitivePricing.bind(this)
    };
    
    this.markupMultipliers = {
      luxury: 3.5,      // 350% markup for luxury products
      premium: 2.8,     // 280% markup for premium products
      standard: 2.2,    // 220% markup for standard products
      economy: 1.8,     // 180% markup for economy products
      clearance: 1.3    // 130% markup for clearance items
    };
  }

  /**
   * Main pricing calculation method
   * @param {Object} product - Product information
   * @param {Object} options - Pricing options
   * @returns {Object} Pricing breakdown and final price
   */
  async calculateProductPrice(productId, options = {}) {
    try {
      const product = await this.getProductDetails(productId);
      if (!product) {
        throw new Error('Product not found');
      }

      // Coerce common numeric fields to numbers to avoid NaN due to string types from SQLite
      if (product.price !== undefined && product.price !== null) {
        product.price = Number(product.price);
      }
      if (product.cost_price !== undefined && product.cost_price !== null) {
        product.cost_price = Number(product.cost_price);
      }
      if (product.current_stock !== undefined && product.current_stock !== null) {
        product.current_stock = Number(product.current_stock);
      }

      const pricingStrategy = options.strategy || product.pricing_strategy || 'costPlus';
      const basePrice = await this.calculateBasePrice(product, options);
      
      // Apply pricing strategy
      const strategyPrice = await this.pricingStrategies[pricingStrategy](product, basePrice, options);
      
      // Apply market adjustments (returns object with price and factors)
      const marketAdjusted = await this.applyMarketAdjustments(strategyPrice, product, options);
      const marketAdjustedPrice = marketAdjusted.price;
      
      // Apply business rules and constraints using the numeric price
      const finalPrice = await this.applyBusinessRules(marketAdjustedPrice, product, options);
      
      // Calculate profit margins
      const profitAnalysis = await this.calculateProfitAnalysis(finalPrice, basePrice, product);
      
      return {
        product_id: productId,
        base_cost: basePrice.totalCost,
        calculated_price: finalPrice,
        pricing_strategy: pricingStrategy,
        price_breakdown: {
          raw_materials: basePrice.rawMaterialsCost,
          labor: basePrice.laborCost,
          overhead: basePrice.overheadCost,
          packaging: basePrice.packagingCost,
          taxes: basePrice.taxAmount,
          markup: finalPrice - basePrice.totalCost,
          profit_margin: profitAnalysis.profitMargin
        },
        market_factors: {
          demand_level: marketAdjusted.demandFactor,
          competition_factor: marketAdjusted.competitionFactor,
          seasonal_adjustment: marketAdjusted.seasonalFactor
        },
        recommendations: await this.generatePricingRecommendations(product, finalPrice, basePrice),
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error('Pricing calculation error:', error);
      throw error;
    }
  }

  /**
   * Calculate base cost price including all components
   */
  async calculateBasePrice(product, options) {
    // Prefer product.cost_price if available; otherwise derive from current price as a rough baseline
    const costPriceNumber = Number(product.cost_price);
    const priceNumber = Number(product.price);
    const hasCostPrice = !isNaN(costPriceNumber) && costPriceNumber > 0;
    const hasPrice = !isNaN(priceNumber) && priceNumber > 0;
    // Assume average gross margin ~40% if only price is available -> base cost ≈ price * 0.6
    const derivedCostFromPrice = hasPrice ? priceNumber * 0.6 : 0;
    const productCost = hasCostPrice ? costPriceNumber : derivedCostFromPrice;
    
    // Get additional costs
    const packagingCost = await this.getPackagingCost(product.id);
    const taxRate = await this.getTaxRate(product.category_id, options.location);
    const taxBase = productCost + packagingCost;
    const taxAmount = taxBase * taxRate;
    
    return {
      rawMaterialsCost: 0,
      laborCost: 0,
      overheadCost: 0,
      packagingCost: packagingCost,
      taxAmount: taxAmount,
      totalCost: productCost + packagingCost + taxAmount
    };
  }

  /**
   * Cost-plus pricing strategy
   */
  async costPlusPricing(product, basePrice, options) {
    const markupPercentage = options.markup || product.default_markup || 100;
    const markupMultiplier = (markupPercentage / 100) + 1;
    
    return basePrice.totalCost * markupMultiplier;
  }

  /**
   * Market-based pricing strategy
   */
  async marketBasedPricing(product, basePrice, options) {
    const marketData = await this.getMarketData(product.category_id);
    const demandLevel = await this.getDemandLevel(product.id);
    const competitionPrice = await this.getCompetitionPrice(product);
    
    let marketPrice = competitionPrice || basePrice.totalCost * 2.5;
    
    // Adjust based on demand
    if (demandLevel === 'high') {
      marketPrice *= 1.2;
    } else if (demandLevel === 'low') {
      marketPrice *= 0.8;
    }
    
    // Ensure minimum profit margin
    const minProfitMargin = 0.15; // 15%
    const minPrice = basePrice.totalCost / (1 - minProfitMargin);
    
    return Math.max(marketPrice, minPrice);
  }

  /**
   * Value-based pricing strategy
   */
  async valueBasedPricing(product, basePrice, options) {
    const perceivedValue = await this.calculatePerceivedValue(product);
    const customerWillingness = await this.getCustomerWillingnessToPay(product.category_id);
    
    let valuePrice = basePrice.totalCost * perceivedValue;
    
    // Adjust based on customer willingness to pay
    if (customerWillingness > 0.8) {
      valuePrice *= 1.3;
    } else if (customerWillingness < 0.4) {
      valuePrice *= 0.7;
    }
    
    return valuePrice;
  }

  /**
   * Dynamic pricing based on real-time factors
   */
  async dynamicPricing(product, basePrice, options) {
    const timeOfDay = new Date().getHours();
    const dayOfWeek = new Date().getDay();
    const season = this.getCurrentSeason();
    const inventoryLevel = await this.getInventoryLevel(product.id);
    const salesVelocity = await this.getSalesVelocity(product.id);
    
    let dynamicPrice = basePrice.totalCost * 2.2; // Base markup
    
    // Time-based adjustments
    if (timeOfDay >= 9 && timeOfDay <= 17) {
      dynamicPrice *= 1.1; // Peak hours
    }
    
    // Day-based adjustments
    if (dayOfWeek === 0 || dayOfWeek === 6) {
      dynamicPrice *= 1.15; // Weekend pricing
    }
    
    // Seasonal adjustments
    if (season === 'holiday') {
      dynamicPrice *= 1.25;
    } else if (season === 'off-peak') {
      dynamicPrice *= 0.9;
    }
    
    // Inventory-based adjustments
    if (inventoryLevel < 10) {
      dynamicPrice *= 1.2; // Low inventory premium
    } else if (inventoryLevel > 100) {
      dynamicPrice *= 0.95; // High inventory discount
    }
    
    // Sales velocity adjustments
    if (salesVelocity > 50) {
      dynamicPrice *= 1.1; // High demand
    } else if (salesVelocity < 5) {
      dynamicPrice *= 0.9; // Low demand
    }
    
    return dynamicPrice;
  }

  /**
   * Competitive pricing strategy
   */
  async competitivePricing(product, basePrice, options) {
    const competitorPrices = await this.getCompetitorPrices(product);
    const ourCost = basePrice.totalCost;
    
    if (competitorPrices.length === 0) {
      return ourCost * 2.2; // Default markup if no competition
    }
    
    const avgCompetitorPrice = competitorPrices.reduce((sum, price) => sum + price, 0) / competitorPrices.length;
    const minCompetitorPrice = Math.min(...competitorPrices);
    
    // Price positioning strategy
    const positioning = options.positioning || 'competitive'; // competitive, premium, economy
    
    switch (positioning) {
      case 'premium':
        return avgCompetitorPrice * 1.15; // 15% above average
      case 'economy':
        return minCompetitorPrice * 0.95; // 5% below minimum
      case 'competitive':
      default:
        return avgCompetitorPrice * 0.98; // 2% below average
    }
  }

  /**
   * Apply market adjustments based on external factors
   */
  async applyMarketAdjustments(price, product, options) {
    const demandFactor = await this.getDemandFactor(product.id);
    const competitionFactor = await this.getCompetitionFactor(product.category_id);
    const seasonalFactor = this.getSeasonalFactor();
    const economicFactor = await this.getEconomicFactor();
    
    let adjustedPrice = price;
    
    // Apply demand factor
    adjustedPrice *= demandFactor;
    
    // Apply competition factor
    adjustedPrice *= competitionFactor;
    
    // Apply seasonal factor
    adjustedPrice *= seasonalFactor;
    
    // Apply economic factor
    adjustedPrice *= economicFactor;
    
    return {
      price: adjustedPrice,
      demandFactor,
      competitionFactor,
      seasonalFactor,
      economicFactor
    };
  }

  /**
   * Apply business rules and constraints
   */
  async applyBusinessRules(price, product, options) {
    let finalPrice = price;
    
    // Minimum profit margin constraint
    const baseCost = await this.getBaseCost(product.id);
    const minProfitMargin = 0.10; // 10%
    const minPrice = baseCost / (1 - minProfitMargin);
    
    if (finalPrice < minPrice) {
      finalPrice = minPrice;
    }
    
    // Maximum price constraint
    const maxPrice = baseCost * 5; // 500% markup cap
    if (finalPrice > maxPrice) {
      finalPrice = maxPrice;
    }
    
    // Round to nearest pricing increment
    finalPrice = this.roundToPricingIncrement(finalPrice);
    
    return finalPrice;
  }

  /**
   * Calculate profit analysis
   */
  async calculateProfitAnalysis(finalPrice, basePrice, product) {
    const grossProfit = finalPrice - basePrice.totalCost;
    const profitMargin = (grossProfit / finalPrice) * 100;
    const markupPercentage = (grossProfit / basePrice.totalCost) * 100;
    
    return {
      grossProfit,
      profitMargin,
      markupPercentage,
      roi: (grossProfit / basePrice.totalCost) * 100
    };
  }

  /**
   * Generate pricing recommendations
   */
  async generatePricingRecommendations(product, finalPrice, basePrice) {
    const recommendations = [];
    
    // Profit margin analysis
    const profitMargin = ((finalPrice - basePrice.totalCost) / finalPrice) * 100;
    
    if (profitMargin < 15) {
      recommendations.push({
        type: 'warning',
        message: 'Profit margin is below recommended 15%. Consider increasing price or reducing costs.',
        action: 'review_costs'
      });
    }
    
    if (profitMargin > 80) {
      recommendations.push({
        type: 'info',
        message: 'High profit margin detected. Consider competitive positioning.',
        action: 'market_analysis'
      });
    }
    
    // Inventory turnover recommendations
    const inventoryLevel = await this.getInventoryLevel(product.id);
    if (inventoryLevel > 100) {
      recommendations.push({
        type: 'suggestion',
        message: 'High inventory level. Consider promotional pricing.',
        action: 'promotional_pricing'
      });
    }
    
    return recommendations;
  }

  // Helper methods
  async getProductDetails(productId) {
    return await database.get('SELECT * FROM products WHERE id = ?', [productId]);
  }

  async getPackagingCost(productId) {
    try {
      // Check if packaging_cost column exists first
      const columnCheck = await database.get(`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'products' AND column_name = 'packaging_cost'
      `);
      
      if (!columnCheck) {
        // Column doesn't exist, return 0
        return 0;
      }
      
      const result = await database.get('SELECT packaging_cost FROM products WHERE id = ?', [productId]);
      // If column exists but value is null/undefined, default to 0
      const value = result?.packaging_cost;
      return typeof value === 'number' ? value : Number(value) || 0;
    } catch (err) {
      // Column likely does not exist; treat packaging cost as zero rather than failing pricing
      return 0;
    }
  }

  async getTaxRate(categoryId, location) {
    // Default tax rate, can be enhanced with location-based tax logic
    return 0.08; // 8%
  }

  async getMarketData(categoryId) {
    // Mock market data - can be enhanced with real market data APIs
    return {
      demand_trend: 'stable',
      competition_level: 'medium',
      market_growth: 0.05
    };
  }

  async getDemandLevel(productId) {
    const result = await database.get(`
      SELECT COUNT(*) as order_count 
      FROM order_items oi 
      JOIN orders o ON oi.order_id = o.id 
      WHERE oi.product_id = ? AND o.created_at >= NOW() - INTERVAL '30 days'
    `, [productId]);
    
    const orderCount = result?.order_count || 0;
    
    if (orderCount > 50) return 'high';
    if (orderCount > 20) return 'medium';
    return 'low';
  }

  async getCompetitionPrice(product) {
    // Mock competition price - can be enhanced with web scraping or API calls
    return null;
  }

  async calculatePerceivedValue(product) {
    // Calculate perceived value based on product attributes
    let value = 1.0;
    
    if (product.brand_premium) value *= 1.3;
    if (product.quality_rating > 4) value *= 1.2;
    if (product.unique_features) value *= 1.15;
    
    return value;
  }

  async getCustomerWillingnessToPay(categoryId) {
    // Mock customer willingness - can be enhanced with customer surveys or analytics
    return 0.7;
  }

  getCurrentSeason() {
    const month = new Date().getMonth();
    if (month === 11 || month === 0) return 'holiday';
    if (month >= 6 && month <= 8) return 'peak';
    return 'off-peak';
  }

  async getInventoryLevel(productId) {
    const result = await database.get('SELECT current_stock FROM products WHERE id = ?', [productId]);
    return result?.current_stock || 0;
  }

  async getSalesVelocity(productId) {
    const result = await database.get(`
      SELECT COUNT(*) as sales_count 
      FROM order_items oi 
      JOIN orders o ON oi.order_id = o.id 
      WHERE oi.product_id = ? AND o.created_at >= NOW() - INTERVAL '7 days'
    `, [productId]);
    
    return result?.sales_count || 0;
  }

  async getCompetitorPrices(product) {
    // Mock competitor prices - can be enhanced with real data
    return [25.99, 29.99, 27.50];
  }

  async getDemandFactor(productId) {
    const demandLevel = await this.getDemandLevel(productId);
    switch (demandLevel) {
      case 'high': return 1.2;
      case 'medium': return 1.0;
      case 'low': return 0.8;
      default: return 1.0;
    }
  }

  async getCompetitionFactor(categoryId) {
    // Mock competition factor - can be enhanced with real market analysis
    return 0.95;
  }

  getSeasonalFactor() {
    const season = this.getCurrentSeason();
    switch (season) {
      case 'holiday': return 1.25;
      case 'peak': return 1.1;
      case 'off-peak': return 0.9;
      default: return 1.0;
    }
  }

  async getEconomicFactor() {
    // Mock economic factor - can be enhanced with economic indicators
    return 1.02; // 2% inflation
  }

  async getBaseCost(productId) {
    // Fetch minimal product details to compute base cost accurately
    const product = await this.getProductDetails(productId);
    if (product && product.price !== undefined && product.price !== null) {
      product.price = Number(product.price);
    }
    if (product && product.cost_price !== undefined && product.cost_price !== null) {
      product.cost_price = Number(product.cost_price);
    }
    const basePrice = await this.calculateBasePrice(product || { id: productId }, {});
    return basePrice.totalCost;
  }

  roundToPricingIncrement(price) {
    // Round to nearest $0.99 for psychological pricing
    const rounded = Math.round(price);
    return rounded - 0.01;
  }

  /**
   * Bulk pricing calculation for multiple products
   */
  async calculateBulkPricing(productIds, options = {}) {
    const results = [];
    
    for (const productId of productIds) {
      try {
        const pricing = await this.calculateProductPrice(productId, options);
        results.push(pricing);
      } catch (error) {
        results.push({
          product_id: productId,
          error: error.message
        });
      }
    }
    
    return results;
  }

  /**
   * Update product prices based on new calculations
   */
  async updateProductPrices(productIds, options = {}) {
    const updatedProducts = [];
    
    for (const productId of productIds) {
      try {
        const pricing = await this.calculateProductPrice(productId, options);
        
        // Update product price in database
        await database.run(
          'UPDATE products SET price = ?, updated_at = NOW() WHERE id = ?',
          [pricing.calculated_price, productId]
        );
        
        // Log price change
        await this.logPriceChange(productId, pricing);
        
        updatedProducts.push({
          product_id: productId,
          old_price: pricing.previous_price,
          new_price: pricing.calculated_price,
          change_percentage: pricing.change_percentage
        });
      } catch (error) {
        updatedProducts.push({
          product_id: productId,
          error: error.message
        });
      }
    }
    
    return updatedProducts;
  }

  /**
   * Log price changes for audit trail
   */
  async logPriceChange(productId, pricing) {
    await database.run(`
      INSERT INTO price_change_log (
        product_id, old_price, new_price, change_reason, 
        pricing_strategy, calculated_by, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, NOW())
    `, [
      productId,
      pricing.previous_price || 0,
      pricing.calculated_price,
      pricing.change_reason || 'Automated pricing update',
      pricing.pricing_strategy,
      pricing.calculated_by || 'system'
    ]);
  }
}

module.exports = new PricingEngine();
