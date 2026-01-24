const database = require('../database/database');

class PointsCalculator {
  /**
   * Calculate points for a purchase
   */
  static calculatePurchasePoints(orderAmount, customerTier, orderItems = []) {
    // Base points: 1 point per $1 spent
    let basePoints = Math.floor(orderAmount);
    
    // Apply tier multiplier
    const tierMultiplier = this.getTierMultiplier(customerTier);
    let totalPoints = Math.floor(basePoints * tierMultiplier);
    
    // Add order size bonus
    const orderSizeBonus = this.calculateOrderSizeBonus(orderAmount);
    totalPoints += orderSizeBonus;
    
    // Add category bonus points
    const categoryBonus = this.calculateCategoryBonus(orderItems);
    totalPoints += categoryBonus;
    
    // Add weekend/holiday bonus (if applicable)
    const timeBonus = this.calculateTimeBonus();
    totalPoints += timeBonus;
    
    return Math.max(0, totalPoints);
  }

  /**
   * Get tier multiplier for point calculation
   */
  static getTierMultiplier(tier) {
    const multipliers = {
      bronze: 1.0,    // 1x points
      silver: 1.2,    // 20% bonus
      gold: 1.5,      // 50% bonus
      platinum: 2.0,  // 100% bonus
      vip: 3.0        // 200% bonus
    };
    return multipliers[tier] || 1.0;
  }

  /**
   * Calculate order size bonus points
   */
  static calculateOrderSizeBonus(orderAmount) {
    if (orderAmount >= 500) return 100;     // $500+ = 100 bonus points
    if (orderAmount >= 200) return 50;      // $200+ = 50 bonus points
    if (orderAmount >= 100) return 25;      // $100+ = 25 bonus points
    if (orderAmount >= 50) return 10;       // $50+ = 10 bonus points
    return 0;
  }

  /**
   * Calculate category bonus points
   */
  static calculateCategoryBonus(orderItems) {
    let bonus = 0;
    
    // This would need to be implemented based on your product categories
    // For now, return 0
    return bonus;
  }

  /**
   * Calculate time-based bonus points
   */
  static calculateTimeBonus() {
    const now = new Date();
    const dayOfWeek = now.getDay(); // 0 = Sunday, 6 = Saturday
    
    // Weekend bonus: 10 extra points
    if (dayOfWeek === 0 || dayOfWeek === 6) {
      return 10;
    }
    
    // Check if it's a holiday (simplified)
    const month = now.getMonth() + 1;
    const day = now.getDate();
    
    // Christmas bonus: 50 extra points
    if (month === 12 && day === 25) return 50;
    
    // New Year bonus: 100 extra points
    if (month === 1 && day === 1) return 100;
    
    return 0;
  }

  /**
   * Calculate loyalty tier based on total points
   */
  static calculateLoyaltyTier(points) {
    if (points >= 10000) return 'vip';
    if (points >= 5000) return 'platinum';
    if (points >= 2000) return 'gold';
    if (points >= 1000) return 'silver';
    if (points >= 100) return 'bronze';
    return 'new';
  }

  /**
   * Get tier requirements and benefits
   */
  static getTierInfo() {
    return {
      new: {
        min_points: 0,
        max_points: 99,
        discount_percent: 0,
        points_multiplier: 1.0,
        benefits: ['Basic rewards']
      },
      bronze: {
        min_points: 100,
        max_points: 999,
        discount_percent: 5,
        points_multiplier: 1.0,
        benefits: ['5% discount', 'Basic rewards']
      },
      silver: {
        min_points: 1000,
        max_points: 1999,
        discount_percent: 10,
        points_multiplier: 1.2,
        benefits: ['10% discount', '20% bonus points', 'Free shipping']
      },
      gold: {
        min_points: 2000,
        max_points: 4999,
        discount_percent: 15,
        points_multiplier: 1.5,
        benefits: ['15% discount', '50% bonus points', 'Free shipping', 'Exclusive offers']
      },
      platinum: {
        min_points: 5000,
        max_points: 9999,
        discount_percent: 25,
        points_multiplier: 2.0,
        benefits: ['25% discount', '100% bonus points', 'Free shipping', 'Exclusive offers', 'Priority support']
      },
      vip: {
        min_points: 10000,
        max_points: null,
        discount_percent: 40,
        points_multiplier: 3.0,
        benefits: ['40% discount', '200% bonus points', 'Free shipping', 'Exclusive offers', 'Priority support', 'Personal shopper']
      }
    };
  }

  /**
   * Calculate points needed for next tier
   */
  static getPointsToNextTier(currentPoints) {
    const tiers = this.getTierInfo();
    const currentTier = this.calculateLoyaltyTier(currentPoints);
    
    const tierOrder = ['new', 'bronze', 'silver', 'gold', 'platinum', 'vip'];
    const currentIndex = tierOrder.indexOf(currentTier);
    
    if (currentIndex === tierOrder.length - 1) {
      return { next_tier: null, points_needed: 0, message: 'You are at the highest tier!' };
    }
    
    const nextTier = tierOrder[currentIndex + 1];
    const pointsNeeded = tiers[nextTier].min_points - currentPoints;
    
    return {
      next_tier: nextTier,
      points_needed: pointsNeeded,
      message: `${pointsNeeded} more points to reach ${nextTier} tier`
    };
  }

  /**
   * Calculate potential points for a future purchase
   */
  static calculatePotentialPoints(orderAmount, customerTier) {
    return this.calculatePurchasePoints(orderAmount, customerTier);
  }
}

module.exports = PointsCalculator;
