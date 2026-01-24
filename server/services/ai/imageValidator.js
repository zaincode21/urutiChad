const fs = require('fs');
const path = require('path');

class ImageValidator {
  constructor() {
    this.maxFileSize = 5 * 1024 * 1024; // 5MB
    this.allowedFormats = ['jpg', 'jpeg', 'png', 'webp'];
    this.minDimensions = { width: 200, height: 200 };
    this.optimalDimensions = { width: 800, height: 800 };
    this.maxDimensions = { width: 2048, height: 2048 };
  }

  /**
   * Validate image file and provide quality assessment
   */
  async validateImage(filePath) {
    try {
      const validation = {
        isValid: true,
        errors: [],
        warnings: [],
        recommendations: [],
        quality: {
          score: 100,
          factors: []
        }
      };

      // Check if file exists
      if (!fs.existsSync(filePath)) {
        validation.isValid = false;
        validation.errors.push('Image file not found');
        return validation;
      }

      // Get file stats
      const stats = fs.statSync(filePath);
      
      // Check file size
      const sizeValidation = this.validateFileSize(stats.size);
      validation.errors.push(...sizeValidation.errors);
      validation.warnings.push(...sizeValidation.warnings);
      validation.quality.factors.push(...sizeValidation.qualityFactors);

      // Check file format
      const formatValidation = this.validateFileFormat(filePath);
      validation.errors.push(...formatValidation.errors);
      validation.warnings.push(...formatValidation.warnings);
      validation.quality.factors.push(...formatValidation.qualityFactors);

      // Check image dimensions
      const dimensionValidation = await this.validateImageDimensions(filePath);
      validation.errors.push(...dimensionValidation.errors);
      validation.warnings.push(...dimensionValidation.warnings);
      validation.quality.factors.push(...dimensionValidation.qualityFactors);

      // Generate recommendations
      validation.recommendations = this.generateRecommendations(validation);

      // Calculate overall quality score
      validation.quality.score = this.calculateQualityScore(validation.quality.factors);

      // Update validity based on errors
      if (validation.errors.length > 0) {
        validation.isValid = false;
      }

      return validation;
    } catch (error) {
      console.error('Image validation error:', error);
      return {
        isValid: false,
        errors: ['Image validation failed: ' + error.message],
        warnings: [],
        recommendations: [],
        quality: {
          score: 0,
          factors: []
        }
      };
    }
  }

  /**
   * Validate file size
   */
  validateFileSize(fileSize) {
    const result = {
      errors: [],
      warnings: [],
      qualityFactors: []
    };

    const sizeInMB = fileSize / (1024 * 1024);

    if (fileSize > this.maxFileSize) {
      result.errors.push(`File size (${sizeInMB.toFixed(2)}MB) exceeds maximum allowed size (5MB)`);
      result.qualityFactors.push({ factor: 'file_size', score: 0, message: 'File too large' });
    } else if (fileSize > 2 * 1024 * 1024) { // 2MB
      result.warnings.push(`File size (${sizeInMB.toFixed(2)}MB) is quite large, consider compression`);
      result.qualityFactors.push({ factor: 'file_size', score: 70, message: 'Large file size' });
    } else if (fileSize < 10 * 1024) { // 10KB
      result.warnings.push('File size is very small, image might be low quality');
      result.qualityFactors.push({ factor: 'file_size', score: 60, message: 'Very small file' });
    } else {
      result.qualityFactors.push({ factor: 'file_size', score: 100, message: 'Good file size' });
    }

    return result;
  }

  /**
   * Validate file format
   */
  validateFileFormat(filePath) {
    const result = {
      errors: [],
      warnings: [],
      qualityFactors: []
    };

    const extension = path.extname(filePath).toLowerCase().substring(1);

    if (!this.allowedFormats.includes(extension)) {
      result.errors.push(`File format '${extension}' is not supported. Allowed formats: ${this.allowedFormats.join(', ')}`);
      result.qualityFactors.push({ factor: 'format', score: 0, message: 'Unsupported format' });
    } else {
      // Format-specific quality factors
      switch (extension) {
        case 'webp':
          result.qualityFactors.push({ factor: 'format', score: 100, message: 'Excellent format (WebP)' });
          break;
        case 'png':
          result.qualityFactors.push({ factor: 'format', score: 90, message: 'Good format (PNG)' });
          break;
        case 'jpg':
        case 'jpeg':
          result.qualityFactors.push({ factor: 'format', score: 85, message: 'Good format (JPEG)' });
          break;
      }
    }

    return result;
  }

  /**
   * Validate image dimensions
   */
  async validateImageDimensions(filePath) {
    const result = {
      errors: [],
      warnings: [],
      qualityFactors: []
    };

    try {
      // For now, we'll use a simple approach to get dimensions
      // In a production environment, you might want to use a library like 'sharp' or 'jimp'
      const dimensions = await this.getImageDimensions(filePath);
      
      if (!dimensions) {
        result.errors.push('Could not determine image dimensions');
        result.qualityFactors.push({ factor: 'dimensions', score: 0, message: 'Unknown dimensions' });
        return result;
      }

      const { width, height } = dimensions;

      // Check minimum dimensions
      if (width < this.minDimensions.width || height < this.minDimensions.height) {
        result.errors.push(`Image dimensions (${width}x${height}) are too small. Minimum: ${this.minDimensions.width}x${this.minDimensions.height}`);
        result.qualityFactors.push({ factor: 'dimensions', score: 30, message: 'Too small' });
      }
      // Check maximum dimensions
      else if (width > this.maxDimensions.width || height > this.maxDimensions.height) {
        result.warnings.push(`Image dimensions (${width}x${height}) are very large. Consider resizing for better performance`);
        result.qualityFactors.push({ factor: 'dimensions', score: 70, message: 'Very large' });
      }
      // Check optimal dimensions
      else if (width >= this.optimalDimensions.width && height >= this.optimalDimensions.height) {
        result.qualityFactors.push({ factor: 'dimensions', score: 100, message: 'Optimal dimensions' });
      } else {
        result.warnings.push(`Image dimensions (${width}x${height}) could be improved. Optimal: ${this.optimalDimensions.width}x${this.optimalDimensions.height}`);
        result.qualityFactors.push({ factor: 'dimensions', score: 80, message: 'Good dimensions' });
      }

      // Check aspect ratio
      const aspectRatio = width / height;
      if (aspectRatio < 0.5 || aspectRatio > 2) {
        result.warnings.push('Image has extreme aspect ratio, might not display well');
        result.qualityFactors.push({ factor: 'aspect_ratio', score: 60, message: 'Extreme aspect ratio' });
      } else {
        result.qualityFactors.push({ factor: 'aspect_ratio', score: 100, message: 'Good aspect ratio' });
      }

    } catch (error) {
      result.errors.push('Failed to validate image dimensions: ' + error.message);
      result.qualityFactors.push({ factor: 'dimensions', score: 0, message: 'Validation failed' });
    }

    return result;
  }

  /**
   * Get image dimensions (simplified implementation)
   * In production, use a proper image processing library
   */
  async getImageDimensions(filePath) {
    try {
      // This is a simplified implementation
      // In production, you should use a library like 'sharp' or 'jimp'
      const fs = require('fs');
      const buffer = fs.readFileSync(filePath);
      
      // Simple PNG dimension extraction (for demonstration)
      if (filePath.toLowerCase().endsWith('.png')) {
        if (buffer.length >= 24) {
          const width = buffer.readUInt32BE(16);
          const height = buffer.readUInt32BE(20);
          return { width, height };
        }
      }
      
      // For other formats, return a default size for now
      // In production, implement proper dimension extraction
      return { width: 800, height: 600 };
    } catch (error) {
      console.error('Dimension extraction error:', error);
      return null;
    }
  }

  /**
   * Generate recommendations based on validation results
   */
  generateRecommendations(validation) {
    const recommendations = [];

    // File size recommendations
    if (validation.quality.factors.some(f => f.factor === 'file_size' && f.score < 70)) {
      recommendations.push({
        type: 'optimization',
        priority: 'high',
        message: 'Consider compressing the image to reduce file size',
        action: 'Use image compression tools or resize the image'
      });
    }

    // Format recommendations
    if (validation.quality.factors.some(f => f.factor === 'format' && f.score < 90)) {
      recommendations.push({
        type: 'format',
        priority: 'medium',
        message: 'Consider converting to WebP format for better compression',
        action: 'Convert image to WebP format'
      });
    }

    // Dimension recommendations
    const dimensionFactor = validation.quality.factors.find(f => f.factor === 'dimensions');
    if (dimensionFactor && dimensionFactor.score < 80) {
      if (dimensionFactor.score < 50) {
        recommendations.push({
          type: 'dimensions',
          priority: 'high',
          message: 'Image is too small for good display quality',
          action: 'Use a larger image or increase resolution'
        });
      } else {
        recommendations.push({
          type: 'dimensions',
          priority: 'medium',
          message: 'Consider optimizing image dimensions for better performance',
          action: 'Resize image to optimal dimensions'
        });
      }
    }

    // Aspect ratio recommendations
    const aspectRatioFactor = validation.quality.factors.find(f => f.factor === 'aspect_ratio');
    if (aspectRatioFactor && aspectRatioFactor.score < 80) {
      recommendations.push({
        type: 'aspect_ratio',
        priority: 'low',
        message: 'Consider cropping image to improve aspect ratio',
        action: 'Crop image to standard aspect ratios (1:1, 4:3, 16:9)'
      });
    }

    return recommendations;
  }

  /**
   * Calculate overall quality score
   */
  calculateQualityScore(factors) {
    if (factors.length === 0) return 0;

    const weights = {
      file_size: 0.25,
      format: 0.25,
      dimensions: 0.3,
      aspect_ratio: 0.2
    };

    let totalScore = 0;
    let totalWeight = 0;

    factors.forEach(factor => {
      const weight = weights[factor.factor] || 0.25;
      totalScore += factor.score * weight;
      totalWeight += weight;
    });

    return totalWeight > 0 ? Math.round(totalScore / totalWeight) : 0;
  }

  /**
   * Validate multiple images and provide batch report
   */
  async validateBatch(images) {
    const results = {
      total: images.length,
      valid: 0,
      invalid: 0,
      averageQuality: 0,
      commonIssues: {},
      recommendations: []
    };

    const validations = [];

    for (const image of images) {
      const validation = await this.validateImage(image.path);
      validations.push(validation);

      if (validation.isValid) {
        results.valid++;
      } else {
        results.invalid++;
      }

      // Track common issues
      validation.errors.forEach(error => {
        results.commonIssues[error] = (results.commonIssues[error] || 0) + 1;
      });

      validation.warnings.forEach(warning => {
        results.commonIssues[warning] = (results.commonIssues[warning] || 0) + 1;
      });
    }

    // Calculate average quality
    const totalQuality = validations.reduce((sum, v) => sum + v.quality.score, 0);
    results.averageQuality = Math.round(totalQuality / validations.length);

    // Generate batch recommendations
    if (results.invalid > 0) {
      results.recommendations.push({
        type: 'batch',
        priority: 'high',
        message: `${results.invalid} out of ${results.total} images have quality issues`,
        action: 'Review and fix the identified issues'
      });
    }

    if (results.averageQuality < 80) {
      results.recommendations.push({
        type: 'quality',
        priority: 'medium',
        message: 'Overall image quality could be improved',
        action: 'Consider implementing image optimization workflow'
      });
    }

    return {
      summary: results,
      details: validations
    };
  }

  /**
   * Get image optimization suggestions
   */
  getOptimizationSuggestions(validation) {
    const suggestions = [];

    if (validation.quality.score < 70) {
      suggestions.push({
        type: 'compression',
        description: 'Apply image compression to reduce file size',
        tools: ['TinyPNG', 'ImageOptim', 'Squoosh']
      });
    }

    if (validation.quality.factors.some(f => f.factor === 'format' && f.score < 90)) {
      suggestions.push({
        type: 'conversion',
        description: 'Convert to modern formats like WebP for better compression',
        tools: ['cwebp', 'ImageMagick', 'Online converters']
      });
    }

    if (validation.quality.factors.some(f => f.factor === 'dimensions' && f.score < 80)) {
      suggestions.push({
        type: 'resizing',
        description: 'Resize image to optimal dimensions',
        tools: ['Sharp', 'Jimp', 'ImageMagick']
      });
    }

    return suggestions;
  }
}

module.exports = new ImageValidator(); 