const database = require('../../database/database');

class DuplicateDetector {
  constructor() {
    this.similarityThreshold = 0.8; // 80% similarity threshold
    this.weightedFields = {
      name: 0.4,
      brand_id: 0.2,
      product_type: 0.15,
      size: 0.1,
      color: 0.1,
      sku: 0.05
    };
  }

  /**
   * Check for potential duplicates when creating/updating a product
   */
  async checkForDuplicates(productData, excludeId = null) {
    try {
      const { name, brand_id, product_type, size, color, sku } = productData;
      
      // Get potential candidates based on exact matches
      const candidates = await this.getCandidateProducts(productData, excludeId);
      
      if (candidates.length === 0) {
        return { hasDuplicates: false, duplicates: [] };
      }

      // Calculate similarity scores
      const duplicates = [];
      for (const candidate of candidates) {
        const similarity = this.calculateSimilarity(productData, candidate);
        
        if (similarity >= this.similarityThreshold) {
          duplicates.push({
            product: candidate,
            similarity: similarity,
            reasons: this.getDuplicateReasons(productData, candidate)
          });
        }
      }

      // Sort by similarity score (highest first)
      duplicates.sort((a, b) => b.similarity - a.similarity);

      return {
        hasDuplicates: duplicates.length > 0,
        duplicates: duplicates.slice(0, 5) // Return top 5 matches
      };
    } catch (error) {
      console.error('Duplicate detection error:', error);
      return { hasDuplicates: false, duplicates: [], error: error.message };
    }
  }

  /**
   * Get candidate products for similarity comparison
   */
  async getCandidateProducts(productData, excludeId) {
    const { name, brand_id, product_type, sku } = productData;
    
    let query = `
      SELECT p.*, b.name as brand_name,
        GROUP_CONCAT(c.name) as category_names
      FROM products p
      LEFT JOIN brands b ON p.brand_id = b.id
      LEFT JOIN product_categories pc ON p.id = pc.product_id
      LEFT JOIN categories c ON pc.category_id = c.id
      WHERE p.is_active = 1
    `;
    
    const params = [];
    
    if (excludeId) {
      query += ' AND p.id != ?';
      params.push(excludeId);
    }

    // Add filters based on exact matches
    const conditions = [];
    
    if (brand_id) {
      conditions.push('p.brand_id = ?');
      params.push(brand_id);
    }
    
    if (product_type) {
      conditions.push('p.product_type = ?');
      params.push(product_type);
    }
    
    if (sku) {
      conditions.push('p.sku LIKE ?');
      params.push(`%${sku}%`);
    }

    // Add name similarity filter
    if (name) {
      const nameWords = name.toLowerCase().split(' ').filter(word => word.length > 2);
      if (nameWords.length > 0) {
        const nameConditions = nameWords.map(() => 'LOWER(p.name) LIKE ?');
        conditions.push(`(${nameConditions.join(' OR ')})`);
        nameWords.forEach(word => params.push(`%${word}%`));
      }
    }

    if (conditions.length > 0) {
      query += ` AND (${conditions.join(' OR ')})`;
    }

    query += ' GROUP BY p.id ORDER BY p.created_at DESC LIMIT 50';

    const candidates = await database.all(query, params);
    return candidates;
  }

  /**
   * Calculate similarity score between two products
   */
  calculateSimilarity(product1, product2) {
    let totalScore = 0;
    let totalWeight = 0;

    // Name similarity (using Levenshtein distance)
    if (product1.name && product2.name) {
      const nameSimilarity = this.calculateStringSimilarity(
        product1.name.toLowerCase(), 
        product2.name.toLowerCase()
      );
      totalScore += nameSimilarity * this.weightedFields.name;
      totalWeight += this.weightedFields.name;
    }

    // Brand similarity
    if (product1.brand_id && product2.brand_id) {
      const brandSimilarity = product1.brand_id === product2.brand_id ? 1 : 0;
      totalScore += brandSimilarity * this.weightedFields.brand_id;
      totalWeight += this.weightedFields.brand_id;
    }

    // Product type similarity
    if (product1.product_type && product2.product_type) {
      const typeSimilarity = product1.product_type === product2.product_type ? 1 : 0;
      totalScore += typeSimilarity * this.weightedFields.product_type;
      totalWeight += this.weightedFields.product_type;
    }

    // Size similarity
    if (product1.size && product2.size) {
      const sizeSimilarity = this.calculateStringSimilarity(
        product1.size.toLowerCase(), 
        product2.size.toLowerCase()
      );
      totalScore += sizeSimilarity * this.weightedFields.size;
      totalWeight += this.weightedFields.size;
    }

    // Color similarity
    if (product1.color && product2.color) {
      const colorSimilarity = this.calculateStringSimilarity(
        product1.color.toLowerCase(), 
        product2.color.toLowerCase()
      );
      totalScore += colorSimilarity * this.weightedFields.color;
      totalWeight += this.weightedFields.color;
    }

    // SKU similarity
    if (product1.sku && product2.sku) {
      const skuSimilarity = this.calculateStringSimilarity(
        product1.sku.toLowerCase(), 
        product2.sku.toLowerCase()
      );
      totalScore += skuSimilarity * this.weightedFields.sku;
      totalWeight += this.weightedFields.sku;
    }

    return totalWeight > 0 ? totalScore / totalWeight : 0;
  }

  /**
   * Calculate string similarity using Levenshtein distance
   */
  calculateStringSimilarity(str1, str2) {
    if (str1 === str2) return 1;
    if (str1.length === 0) return 0;
    if (str2.length === 0) return 0;

    const matrix = [];
    for (let i = 0; i <= str2.length; i++) {
      matrix[i] = [i];
    }
    for (let j = 0; j <= str1.length; j++) {
      matrix[0][j] = j;
    }
    for (let i = 1; i <= str2.length; i++) {
      for (let j = 1; j <= str1.length; j++) {
        if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1,
            matrix[i][j - 1] + 1,
            matrix[i - 1][j] + 1
          );
        }
      }
    }

    const maxLength = Math.max(str1.length, str2.length);
    const distance = matrix[str2.length][str1.length];
    return 1 - (distance / maxLength);
  }

  /**
   * Get reasons why products are considered duplicates
   */
  getDuplicateReasons(product1, product2) {
    const reasons = [];

    // Check exact matches
    if (product1.sku && product2.sku && product1.sku === product2.sku) {
      reasons.push('Identical SKU');
    }

    if (product1.barcode && product2.barcode && product1.barcode === product2.barcode) {
      reasons.push('Identical barcode');
    }

    // Check name similarity
    if (product1.name && product2.name) {
      const nameSimilarity = this.calculateStringSimilarity(
        product1.name.toLowerCase(), 
        product2.name.toLowerCase()
      );
      if (nameSimilarity > 0.9) {
        reasons.push('Very similar product names');
      } else if (nameSimilarity > 0.7) {
        reasons.push('Similar product names');
      }
    }

    // Check brand and type combination
    if (product1.brand_id === product2.brand_id && 
        product1.product_type === product2.product_type) {
      reasons.push('Same brand and product type');
    }

    // Check size and color combination
    if (product1.size === product2.size && product1.color === product2.color) {
      reasons.push('Same size and color');
    }

    return reasons;
  }

  /**
   * Get duplicate statistics for dashboard
   */
  async getDuplicateStatistics() {
    try {
      const stats = await database.get(`
        SELECT 
          COUNT(*) as total_products,
          COUNT(DISTINCT LOWER(name)) as unique_names,
          COUNT(DISTINCT sku) as unique_skus,
          COUNT(DISTINCT barcode) as unique_barcodes
        FROM products 
        WHERE is_active = 1
      `);

      const potentialDuplicates = await database.all(`
        SELECT name, COUNT(*) as count
        FROM products 
        WHERE is_active = 1 AND name IS NOT NULL
        GROUP BY LOWER(name)
        HAVING COUNT(*) > 1
        ORDER BY count DESC
        LIMIT 10
      `);

      return {
        totalProducts: stats.total_products,
        uniqueNames: stats.unique_names,
        uniqueSKUs: stats.unique_skus,
        uniqueBarcodes: stats.unique_barcodes,
        potentialDuplicates: potentialDuplicates,
        duplicateRate: ((stats.total_products - stats.unique_names) / stats.total_products * 100).toFixed(2)
      };
    } catch (error) {
      console.error('Duplicate statistics error:', error);
      return null;
    }
  }

  /**
   * Suggest merge candidates for duplicate products
   */
  async suggestMerges() {
    try {
      const duplicates = await database.all(`
        SELECT 
          LOWER(name) as normalized_name,
          name,
          COUNT(*) as count,
          GROUP_CONCAT(id) as product_ids,
          GROUP_CONCAT(sku) as skus,
          GROUP_CONCAT(created_at) as created_dates
        FROM products 
        WHERE is_active = 1 AND name IS NOT NULL
        GROUP BY LOWER(name)
        HAVING COUNT(*) > 1
        ORDER BY count DESC
        LIMIT 20
      `);

      return duplicates.map(dup => ({
        normalizedName: dup.normalized_name,
        displayName: dup.name,
        count: dup.count,
        productIds: dup.product_ids.split(','),
        skus: dup.skus.split(','),
        createdDates: dup.created_dates.split(','),
        suggestedAction: dup.count === 2 ? 'merge' : 'review'
      }));
    } catch (error) {
      console.error('Merge suggestions error:', error);
      return [];
    }
  }
}

module.exports = new DuplicateDetector(); 