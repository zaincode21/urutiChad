const database = require('../../database/database');

class SmartSKUGenerator {
  constructor() {
    this.skuPatterns = {
      perfume: 'PERF-{BRAND}-{SIZE}',
      shoes: 'SHOE-{BRAND}-{SIZE}',
      clothing: 'CLTH-{BRAND}-{SIZE}',
      accessory: 'ACC-{BRAND}-{TYPE}',
      general: 'PRD-{CATEGORY}-{NUM}'
    };
  }

  /**
   * Generate a smart SKU based on product characteristics
   */
  async generateSKU(productData) {
    const { name, product_type, brand_id, size, color, category_ids } = productData;
    
    try {
      // Get brand information if available
      let brandPrefix = 'GEN';
      if (brand_id) {
        const brand = await database.get('SELECT name FROM brands WHERE id = ?', [brand_id]);
        if (brand) {
          brandPrefix = brand.name.substring(0, 3).toUpperCase();
        }
      }

      // Get category information
      let categoryPrefix = 'GEN';
      if (category_ids && category_ids.length > 0) {
        const category = await database.get('SELECT name FROM categories WHERE id = ?', [category_ids[0]]);
        if (category) {
          categoryPrefix = category.name.substring(0, 3).toUpperCase();
        }
      }

      // Generate base SKU based on product type
      let baseSKU = this.generateBaseSKU(product_type, brandPrefix, categoryPrefix, size, color);
      
      // Ensure uniqueness
      const uniqueSKU = await this.makeUnique(baseSKU);
      
      return uniqueSKU;
    } catch (error) {
      console.error('SKU generation error:', error);
      // Fallback to timestamp-based SKU
      return this.generateFallbackSKU();
    }
  }

  /**
   * Generate base SKU using product type patterns
   */
  generateBaseSKU(productType, brandPrefix, categoryPrefix, size, color) {
    const timestamp = Date.now().toString().slice(-6);
    
    switch (productType) {
      case 'perfume':
        return `PERF-${brandPrefix}-${size || 'ML'}`;
      
      case 'shoes':
        return `SHOE-${brandPrefix}-${size || 'SIZE'}`;
      
      case 'clothing':
        return `CLTH-${brandPrefix}-${size || 'SIZE'}`;
      
      case 'accessory':
        return `ACC-${brandPrefix}-${color ? color.substring(0, 3).toUpperCase() : 'GEN'}`;
      
      default:
        return `${categoryPrefix}-${brandPrefix}-${timestamp}`;
    }
  }

  /**
   * Ensure SKU uniqueness by checking database
   */
  async makeUnique(baseSKU) {
    let counter = 1;
    let uniqueSKU = baseSKU;
    
    while (true) {
      const existing = await database.get('SELECT id FROM products WHERE sku = ?', [uniqueSKU]);
      if (!existing) {
        break;
      }
      uniqueSKU = `${baseSKU}-${counter.toString().padStart(3, '0')}`;
      counter++;
      
      // Prevent infinite loop
      if (counter > 999) {
        uniqueSKU = `${baseSKU}-${Date.now().toString().slice(-4)}`;
        break;
      }
    }
    
    return uniqueSKU;
  }

  /**
   * Generate fallback SKU when pattern matching fails
   */
  generateFallbackSKU() {
    const timestamp = Date.now().toString().slice(-8);
    const random = Math.random().toString(36).substring(2, 5).toUpperCase();
    return `PRD-${timestamp}-${random}`;
  }

  /**
   * Analyze existing SKU patterns to improve generation
   */
  async analyzeSKUPatterns() {
    try {
      const products = await database.all(`
        SELECT sku, product_type, brand_id, size, color 
        FROM products 
        WHERE sku IS NOT NULL AND sku != ''
        ORDER BY created_at DESC
        LIMIT 100
      `);

      const patterns = {};
      
      products.forEach(product => {
        if (!patterns[product.product_type]) {
          patterns[product.product_type] = [];
        }
        patterns[product.product_type].push(product.sku);
      });

      return patterns;
    } catch (error) {
      console.error('SKU pattern analysis error:', error);
      return {};
    }
  }

  /**
   * Suggest SKU improvements based on existing patterns
   */
  async suggestSKUImprovements(currentSKU, productData) {
    try {
      const patterns = await this.analyzeSKUPatterns();
      const suggestions = [];

      // Check if SKU follows common patterns
      if (!currentSKU.includes('-')) {
        suggestions.push('Consider using hyphens to separate SKU components');
      }

      // Check length
      if (currentSKU.length < 8) {
        suggestions.push('SKU might be too short for uniqueness');
      }

      if (currentSKU.length > 20) {
        suggestions.push('SKU might be too long for practical use');
      }

      // Check for product type prefix
      const typePrefixes = ['PERF', 'SHOE', 'CLTH', 'ACC'];
      const hasTypePrefix = typePrefixes.some(prefix => currentSKU.startsWith(prefix));
      if (!hasTypePrefix && productData.product_type) {
        suggestions.push(`Consider adding product type prefix (e.g., ${productData.product_type.toUpperCase().substring(0, 4)})`);
      }

      return suggestions;
    } catch (error) {
      console.error('SKU improvement suggestion error:', error);
      return [];
    }
  }
}

module.exports = new SmartSKUGenerator(); 