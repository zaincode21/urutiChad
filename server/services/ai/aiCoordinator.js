const skuGenerator = require('./skuGenerator');
const duplicateDetector = require('./duplicateDetector');
const demandForecaster = require('./demandForecaster');
const imageValidator = require('./imageValidator');

class AICoordinator {
  constructor() {
    this.services = {
      skuGenerator,
      duplicateDetector,
      demandForecaster,
      imageValidator
    };
  }

  /**
   * Generate comprehensive product intelligence report
   */
  async generateProductIntelligence(productData, options = {}) {
    try {
      console.log('AI Coordinator: Starting product intelligence generation for product:', productData.id);
      
      const report = {
        productId: productData.id,
        timestamp: new Date().toISOString(),
        summary: {
          overallScore: 0,
          recommendations: [],
          warnings: [],
          insights: []
        },
        skuAnalysis: null,
        duplicateAnalysis: null,
        demandForecast: null,
        imageAnalysis: null
      };

      // SKU Analysis
      if (options.includeSkuAnalysis !== false) {
        console.log('AI Coordinator: Starting SKU analysis');
        report.skuAnalysis = await this.analyzeSKU(productData);
        console.log('AI Coordinator: SKU analysis completed');
      }

      // Duplicate Detection
      if (options.includeDuplicateAnalysis !== false) {
        console.log('AI Coordinator: Starting duplicate analysis');
        report.duplicateAnalysis = await this.analyzeDuplicates(productData);
        console.log('AI Coordinator: Duplicate analysis completed');
      }

      // Demand Forecasting
      if (options.includeDemandForecast !== false && productData.id) {
        console.log('AI Coordinator: Starting demand forecast');
        report.demandForecast = await this.analyzeDemand(productData.id);
        console.log('AI Coordinator: Demand forecast completed');
      }

      // Image Analysis (if image path provided)
      if (options.includeImageAnalysis !== false && options.imagePath) {
        console.log('AI Coordinator: Starting image analysis');
        report.imageAnalysis = await this.analyzeImage(options.imagePath);
        console.log('AI Coordinator: Image analysis completed');
      }

      // Calculate overall score and generate insights
      console.log('AI Coordinator: Calculating overall score');
      report.summary = this.calculateOverallScore(report);
      report.summary.insights = this.generateInsights(report);
      console.log('AI Coordinator: Product intelligence generation completed');

      return report;
    } catch (error) {
      console.error('Product intelligence generation error:', error);
      console.error('Error stack:', error.stack);
      return {
        error: error.message,
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * Analyze SKU and provide recommendations
   */
  async analyzeSKU(productData) {
    try {
      const analysis = {
        currentSKU: productData.sku,
        suggestions: [],
        improvements: [],
        generatedSKU: null
      };

      // Generate smart SKU if none exists
      if (!productData.sku) {
        analysis.generatedSKU = await this.services.skuGenerator.generateSKU(productData);
        analysis.suggestions.push({
          type: 'generation',
          message: 'Generated smart SKU based on product characteristics',
          sku: analysis.generatedSKU
        });
      } else {
        // Analyze existing SKU
        analysis.improvements = await this.services.skuGenerator.suggestSKUImprovements(
          productData.sku, 
          productData
        );
      }

      // Get SKU patterns for insights
      const patterns = await this.services.skuGenerator.analyzeSKUPatterns();
      analysis.patterns = patterns;

      return analysis;
    } catch (error) {
      console.error('SKU analysis error:', error);
      return { error: error.message };
    }
  }

  /**
   * Analyze potential duplicates
   */
  async analyzeDuplicates(productData) {
    try {
      const analysis = await this.services.duplicateDetector.checkForDuplicates(
        productData, 
        productData.id
      );

      if (analysis.hasDuplicates) {
        analysis.recommendations = [
          {
            type: 'duplicate',
            priority: 'high',
            message: `${analysis.duplicates.length} potential duplicate(s) found`,
            action: 'Review and consider merging or updating product information'
          }
        ];
      }

      return analysis;
    } catch (error) {
      console.error('Duplicate analysis error:', error);
      return { error: error.message };
    }
  }

  /**
   * Analyze demand patterns
   */
  async analyzeDemand(productId) {
    try {
      const forecast = await this.services.demandForecaster.forecastProductDemand(productId);
      const recommendations = await this.services.demandForecaster.getInventoryRecommendations(productId);

      return {
        forecast,
        recommendations,
        insights: this.generateDemandInsights(forecast, recommendations)
      };
    } catch (error) {
      console.error('Demand analysis error:', error);
      return { error: error.message };
    }
  }

  /**
   * Analyze image quality
   */
  async analyzeImage(imagePath) {
    try {
      const validation = await this.services.imageValidator.validateImage(imagePath);
      const suggestions = this.services.imageValidator.getOptimizationSuggestions(validation);

      return {
        validation,
        suggestions,
        insights: this.generateImageInsights(validation)
      };
    } catch (error) {
      console.error('Image analysis error:', error);
      return { error: error.message };
    }
  }

  /**
   * Calculate overall intelligence score
   */
  calculateOverallScore(report) {
    const scores = [];
    const recommendations = [];
    const warnings = [];

    // SKU Score
    if (report.skuAnalysis && !report.skuAnalysis.error) {
      if (report.skuAnalysis.generatedSKU) {
        scores.push(90); // Good score for generated SKU
      } else if (report.skuAnalysis.improvements.length === 0) {
        scores.push(100); // Perfect SKU
      } else {
        scores.push(70 - (report.skuAnalysis.improvements.length * 10)); // Deduct for improvements needed
      }

      if (report.skuAnalysis.improvements.length > 0) {
        recommendations.push({
          type: 'sku',
          priority: 'medium',
          message: 'SKU improvements available',
          details: report.skuAnalysis.improvements
        });
      }
    }

    // Duplicate Score
    if (report.duplicateAnalysis && !report.duplicateAnalysis.error) {
      if (report.duplicateAnalysis.hasDuplicates) {
        scores.push(30); // Low score for duplicates
        warnings.push({
          type: 'duplicate',
          priority: 'high',
          message: 'Potential duplicates detected',
          count: report.duplicateAnalysis.duplicates.length
        });
      } else {
        scores.push(100); // Perfect score for no duplicates
      }
    }

    // Demand Score
    if (report.demandForecast && !report.demandForecast.error) {
      const forecast = report.demandForecast.forecast;
      if (forecast && forecast.summary) {
        const confidence = forecast.summary.confidence;
        scores.push(confidence * 100); // Use confidence as score

        if (forecast.summary.trend === 'increasing') {
          recommendations.push({
            type: 'demand',
            priority: 'medium',
            message: 'Product demand is trending upward',
            action: 'Consider increasing stock levels'
          });
        }
      }
    }

    // Image Score
    if (report.imageAnalysis && !report.imageAnalysis.error) {
      const validation = report.imageAnalysis.validation;
      if (validation) {
        scores.push(validation.quality.score);

        if (!validation.isValid) {
          warnings.push({
            type: 'image',
            priority: 'medium',
            message: 'Image quality issues detected',
            details: validation.errors
          });
        }

        if (validation.warnings.length > 0) {
          recommendations.push({
            type: 'image',
            priority: 'low',
            message: 'Image optimization opportunities',
            details: validation.warnings
          });
        }
      }
    }

    // Calculate overall score
    const overallScore = scores.length > 0 ? 
      Math.round(scores.reduce((sum, score) => sum + score, 0) / scores.length) : 0;

    return {
      overallScore,
      recommendations,
      warnings,
      componentScores: {
        sku: scores[0] || 0,
        duplicates: scores[1] || 0,
        demand: scores[2] || 0,
        image: scores[3] || 0
      }
    };
  }

  /**
   * Generate insights from analysis results
   */
  generateInsights(report) {
    const insights = [];

    // SKU Insights
    if (report.skuAnalysis && !report.skuAnalysis.error) {
      if (report.skuAnalysis.generatedSKU) {
        insights.push('Smart SKU generated based on product characteristics');
      }
      if (report.skuAnalysis.improvements.length > 0) {
        insights.push(`SKU has ${report.skuAnalysis.improvements.length} improvement opportunities`);
      }
    }

    // Duplicate Insights
    if (report.duplicateAnalysis && !report.duplicateAnalysis.error) {
      if (report.duplicateAnalysis.hasDuplicates) {
        insights.push(`Found ${report.duplicateAnalysis.duplicates.length} similar products`);
      } else {
        insights.push('No duplicate products detected');
      }
    }

    // Demand Insights
    if (report.demandForecast && !report.demandForecast.error) {
      const forecast = report.demandForecast.forecast;
      if (forecast && forecast.summary) {
        insights.push(`Forecasted daily demand: ${forecast.summary.averageDailyDemand.toFixed(2)} units`);
        insights.push(`Demand trend: ${forecast.summary.trend}`);
        insights.push(`Forecast confidence: ${(forecast.summary.confidence * 100).toFixed(0)}%`);
      }
    }

    // Image Insights
    if (report.imageAnalysis && !report.imageAnalysis.error) {
      const validation = report.imageAnalysis.validation;
      if (validation) {
        insights.push(`Image quality score: ${validation.quality.score}/100`);
        if (validation.quality.score < 70) {
          insights.push('Image quality needs improvement');
        }
      }
    }

    return insights;
  }

  /**
   * Generate demand-specific insights
   */
  generateDemandInsights(forecast, recommendations) {
    const insights = [];

    if (forecast && forecast.summary) {
      const { averageDailyDemand, trend, confidence } = forecast.summary;

      if (trend === 'increasing') {
        insights.push('Product shows increasing demand trend');
      } else if (trend === 'decreasing') {
        insights.push('Product shows decreasing demand trend');
      }

      if (confidence < 0.5) {
        insights.push('Low confidence in demand forecast - more data needed');
      }

      if (averageDailyDemand > 5) {
        insights.push('High demand product - consider bulk ordering');
      } else if (averageDailyDemand < 1) {
        insights.push('Low demand product - consider promotional activities');
      }
    }

    if (recommendations && recommendations.recommendations) {
      const urgentRecs = recommendations.recommendations.filter(r => r.type === 'urgent');
      if (urgentRecs.length > 0) {
        insights.push('Urgent inventory action required');
      }
    }

    return insights;
  }

  /**
   * Generate image-specific insights
   */
  generateImageInsights(validation) {
    const insights = [];

    if (validation.quality.score >= 90) {
      insights.push('Excellent image quality');
    } else if (validation.quality.score >= 70) {
      insights.push('Good image quality with room for improvement');
    } else {
      insights.push('Image quality needs attention');
    }

    validation.quality.factors.forEach(factor => {
      if (factor.score < 70) {
        insights.push(`${factor.factor}: ${factor.message}`);
      }
    });

    return insights;
  }

  /**
   * Get batch intelligence for multiple products
   */
  async getBatchIntelligence(productIds, options = {}) {
    try {
      const results = [];
      const summary = {
        total: productIds.length,
        processed: 0,
        errors: 0,
        averageScore: 0,
        commonIssues: {},
        topRecommendations: []
      };

      for (const productId of productIds) {
        try {
          const product = await this.getProductData(productId);
          if (product) {
            const intelligence = await this.generateProductIntelligence(product, options);
            results.push(intelligence);
            summary.processed++;
          }
        } catch (error) {
          console.error(`Error processing product ${productId}:`, error);
          summary.errors++;
        }
      }

      // Calculate summary statistics
      const validResults = results.filter(r => !r.error);
      if (validResults.length > 0) {
        summary.averageScore = Math.round(
          validResults.reduce((sum, r) => sum + r.summary.overallScore, 0) / validResults.length
        );
      }

      // Collect common issues and recommendations
      validResults.forEach(result => {
        result.summary.warnings.forEach(warning => {
          summary.commonIssues[warning.type] = (summary.commonIssues[warning.type] || 0) + 1;
        });

        result.summary.recommendations.forEach(rec => {
          summary.topRecommendations.push(rec);
        });
      });

      // Get top recommendations
      summary.topRecommendations = summary.topRecommendations
        .slice(0, 5)
        .sort((a, b) => {
          const priorityOrder = { high: 3, medium: 2, low: 1 };
          return priorityOrder[b.priority] - priorityOrder[a.priority];
        });

      return {
        summary,
        results
      };
    } catch (error) {
      console.error('Batch intelligence error:', error);
      return { error: error.message };
    }
  }

  /**
   * Get product data from database
   */
  async getProductData(productId) {
    try {
      const database = require('../../database/database');
      
      const product = await database.get(`
        SELECT p.*, b.name as brand_name
        FROM products p
        LEFT JOIN brands b ON p.brand_id = b.id
        WHERE p.id = ?
      `, [productId]);

      if (product) {
        // Get categories
        const categories = await database.all(`
          SELECT c.id, c.name
          FROM product_categories pc
          JOIN categories c ON pc.category_id = c.id
          WHERE pc.product_id = ?
        `, [productId]);

        product.category_ids = categories.map(c => c.id);
        product.categories = categories;
      }

      return product;
    } catch (error) {
      console.error('Product data retrieval error:', error);
      return null;
    }
  }

  /**
   * Get system-wide intelligence summary
   */
  async getSystemIntelligence() {
    try {
      const summary = {
        timestamp: new Date().toISOString(),
        duplicateStats: null,
        forecastSummary: null,
        recommendations: []
      };

      // Get duplicate statistics
      try {
        summary.duplicateStats = await this.services.duplicateDetector.getDuplicateStatistics();
      } catch (error) {
        console.error('Duplicate stats error:', error);
      }

      // Get forecast summary
      try {
        summary.forecastSummary = await this.services.demandForecaster.getForecastSummary();
      } catch (error) {
        console.error('Forecast summary error:', error);
      }

      // Generate system recommendations
      if (summary.duplicateStats && summary.duplicateStats.duplicateRate > 5) {
        summary.recommendations.push({
          type: 'system',
          priority: 'high',
          message: `High duplicate rate (${summary.duplicateStats.duplicateRate}%) detected`,
          action: 'Review and clean up duplicate products'
        });
      }

      if (summary.forecastSummary && summary.forecastSummary.lowStockProducts > 10) {
        summary.recommendations.push({
          type: 'system',
          priority: 'medium',
          message: `${summary.forecastSummary.lowStockProducts} products have low stock`,
          action: 'Review inventory levels and restock as needed'
        });
      }

      return summary;
    } catch (error) {
      console.error('System intelligence error:', error);
      return { error: error.message };
    }
  }
}

module.exports = new AICoordinator(); 