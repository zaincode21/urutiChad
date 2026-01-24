// Business Rules Configuration for Discount System

export const DISCOUNT_BUSINESS_RULES = {
  // Bottle Return Rewards Configuration
  bottleReturn: {
    // Default configuration - can be overridden per discount
    defaultBottleCount: 1,
    minBottleCount: 1,
    maxBottleCount: 20,
    // Fixed amount bottle return tiers (discount in cost)
    tiers: [
      { bottles: 1, discountAmount: 1000, description: 'Eco Starter' },
      { bottles: 2, discountAmount: 2000, description: 'Green Warrior' },
      { bottles: 3, discountAmount: 3000, description: 'Eco Champion' },
      { bottles: 4, discountAmount: 4000, description: 'Environmental Hero' }
    ],
    // Business rules for bottle validation
    rules: {
      mustBeClean: true,
      mustHaveLabel: false,
      maxAgeInDays: 365, // Bottles older than 1 year not accepted
      allowMixedBrands: true,
      requireOriginalCap: false
    }
  },

  // Percentage Discount Rules
  percentage: {
    minPercentage: 1,
    maxPercentage: 75,
    // Tier-based percentage limits
    tierLimits: {
      bronze: { max: 15 },
      silver: { max: 25 },
      gold: { max: 40 },
      platinum: { max: 60 },
      vip: { max: 75 }
    }
  },

  // Fixed Amount Discount Rules
  fixedAmount: {
    minAmount: 1,
    maxAmount: 1000,
    // Currency-based limits
    currencyLimits: {
      USD: { min: 1, max: 1000 },
      EUR: { min: 1, max: 900 },
      GBP: { min: 1, max: 800 }
    }
  },

  // Customer Tier Rules
  customerTiers: {
    bronze: {
      minPurchaseHistory: 0,
      maxDiscountPercentage: 15,
      maxConcurrentDiscounts: 2,
      canCombineWithBottleReturn: true
    },
    silver: {
      minPurchaseHistory: 500,
      maxDiscountPercentage: 25,
      maxConcurrentDiscounts: 3,
      canCombineWithBottleReturn: true
    },
    gold: {
      minPurchaseHistory: 1500,
      maxDiscountPercentage: 40,
      maxConcurrentDiscounts: 4,
      canCombineWithBottleReturn: true
    },
    platinum: {
      minPurchaseHistory: 5000,
      maxDiscountPercentage: 60,
      maxConcurrentDiscounts: 5,
      canCombineWithBottleReturn: true
    },
    vip: {
      minPurchaseHistory: 15000,
      maxDiscountPercentage: 75,
      maxConcurrentDiscounts: 10,
      canCombineWithBottleReturn: true
    }
  },

  // Usage Limit Rules
  usageLimits: {
    defaultPerCustomer: 1,
    maxPerCustomer: 10,
    // Global usage limits based on discount type
    globalLimits: {
      percentage: 1000,
      fixed_amount: 500,
      bottle_return: 2000
    }
  },

  // Time-based Rules
  temporal: {
    // Minimum duration for a discount
    minDurationHours: 1,
    // Maximum duration for different discount types
    maxDurationDays: {
      flash_sale: 3,
      weekly_promotion: 7,
      monthly_campaign: 31,
      seasonal: 90,
      annual: 365
    },
    // Advance notice required for discount activation
    advanceNoticeHours: {
      flash_sale: 1,
      regular_discount: 24,
      campaign: 72
    }
  },

  // Stacking Rules
  stacking: {
    // Can discounts be combined?
    allowStacking: true,
    // Maximum number of discounts that can be stacked
    maxStackedDiscounts: 3,
    // Rules for which discount types can be stacked
    stackingMatrix: {
      percentage: ['bottle_return', 'loyalty_bonus'],
      fixed_amount: ['bottle_return'],
      bottle_return: ['percentage', 'fixed_amount', 'loyalty_bonus'],
      loyalty_bonus: ['percentage', 'bottle_return']
    },
    // Maximum combined discount percentage
    maxCombinedPercentage: 50
  },

  // Product/Category Rules
  applicability: {
    // Default applicability
    defaultScope: 'all',
    // Exclusion rules
    excludedCategories: ['gift_cards', 'services'],
    // Minimum purchase amounts for different product types
    minPurchaseAmounts: {
      perfumes: 25,
      accessories: 10,
      gift_sets: 50,
      samples: 5
    }
  },

  // Campaign Rules
  campaigns: {
    // Maximum active campaigns at once
    maxActiveCampaigns: 5,
    // Budget limits per campaign type
    budgetLimits: {
      flash_sale: 5000,
      holiday_campaign: 20000,
      loyalty_campaign: 15000,
      seasonal: 30000
    },
    // Minimum gap between similar campaigns
    campaignCooldownDays: {
      same_type: 7,
      similar_target: 3
    }
  },

  // Business Logic Validations
  validations: {
    // Functions to validate discount configuration
    validateBottleReturn: (bottleCount, discountPercentage) => {
      const tier = DISCOUNT_BUSINESS_RULES.bottleReturn.tiers.find(
        t => t.bottles === bottleCount
      );
      return tier ? tier.discountPercentage >= discountPercentage : false;
    },
    
    validateCustomerTier: (customerTier, discountPercentage) => {
      const tierConfig = DISCOUNT_BUSINESS_RULES.customerTiers[customerTier];
      return tierConfig ? discountPercentage <= tierConfig.maxDiscountPercentage : false;
    },
    
    validateDateRange: (startDate, endDate, discountType) => {
      const start = new Date(startDate);
      const end = new Date(endDate);
      const durationDays = (end - start) / (1000 * 60 * 60 * 24);
      
      const maxDuration = DISCOUNT_BUSINESS_RULES.temporal.maxDurationDays[discountType] || 
                         DISCOUNT_BUSINESS_RULES.temporal.maxDurationDays.regular_discount || 30;
      
      return durationDays <= maxDuration && durationDays >= 0;
    },
    
    validateStacking: (existingDiscounts, newDiscount) => {
      if (!DISCOUNT_BUSINESS_RULES.stacking.allowStacking) return false;
      
      const applicableDiscounts = existingDiscounts.filter(d => 
        d.applicable_to === newDiscount.applicable_to || 
        d.applicable_to === 'all' || 
        newDiscount.applicable_to === 'all'
      );
      
      return applicableDiscounts.length < DISCOUNT_BUSINESS_RULES.stacking.maxStackedDiscounts;
    }
  }
};

// Helper functions for business rule enforcement
export const DiscountRuleHelpers = {
  // Get available bottle return tiers
  getBottleReturnTiers: () => DISCOUNT_BUSINESS_RULES.bottleReturn.tiers,
  
  // Get maximum discount for customer tier
  getMaxDiscountForTier: (tier) => {
    return DISCOUNT_BUSINESS_RULES.customerTiers[tier]?.maxDiscountPercentage || 0;
  },
  
  // Validate if discount configuration is within business rules
  validateDiscountConfig: (discountConfig) => {
    const errors = [];
    
    // Validate percentage limits
    if (discountConfig.type === 'percentage') {
      const { minPercentage, maxPercentage } = DISCOUNT_BUSINESS_RULES.percentage;
      if (discountConfig.value < minPercentage || discountConfig.value > maxPercentage) {
        errors.push(`Percentage must be between ${minPercentage}% and ${maxPercentage}%`);
      }
    }
    
    // Validate bottle return configuration
    if (discountConfig.type === 'bottle_return') {
      const { minBottleCount, maxBottleCount } = DISCOUNT_BUSINESS_RULES.bottleReturn;
      if (discountConfig.bottle_return_count < minBottleCount || 
          discountConfig.bottle_return_count > maxBottleCount) {
        errors.push(`Bottle count must be between ${minBottleCount} and ${maxBottleCount}`);
      }
      // For bottle return, value should be set from tier's discountAmount
      const tier = DISCOUNT_BUSINESS_RULES.bottleReturn.tiers.find(
        t => t.bottles === discountConfig.bottle_return_count
      );
      if (tier && discountConfig.value && discountConfig.value !== tier.discountAmount) {
        // Value should match the tier's discount amount
        discountConfig.value = tier.discountAmount;
      }
    }
    
    // Validate date range
    if (discountConfig.start_date && discountConfig.end_date) {
      const isValidRange = DISCOUNT_BUSINESS_RULES.validations.validateDateRange(
        discountConfig.start_date,
        discountConfig.end_date,
        discountConfig.discount_type || 'regular_discount'
      );
      if (!isValidRange) {
        errors.push('Invalid date range for discount type');
      }
    }
    
    return {
      isValid: errors.length === 0,
      errors
    };
  },
  
  // Calculate combined discount amount respecting stacking rules
  calculateStackedDiscount: (baseAmount, applicableDiscounts) => {
    if (!DISCOUNT_BUSINESS_RULES.stacking.allowStacking) {
      // If stacking not allowed, use the best single discount
      return Math.max(...applicableDiscounts.map(d => calculateSingleDiscount(baseAmount, d)));
    }
    
    let totalDiscount = 0;
    let remainingAmount = baseAmount;
    
    // Sort discounts by type priority and value
    const sortedDiscounts = applicableDiscounts.sort((a, b) => {
      const priority = { percentage: 3, fixed_amount: 2, bottle_return: 1 };
      return (priority[b.type] || 0) - (priority[a.type] || 0);
    });
    
    for (const discount of sortedDiscounts.slice(0, DISCOUNT_BUSINESS_RULES.stacking.maxStackedDiscounts)) {
      const discountAmount = calculateSingleDiscount(remainingAmount, discount);
      totalDiscount += discountAmount;
      remainingAmount -= discountAmount;
      
      // Check if we've hit the maximum combined percentage
      if ((totalDiscount / baseAmount) * 100 >= DISCOUNT_BUSINESS_RULES.stacking.maxCombinedPercentage) {
        totalDiscount = baseAmount * (DISCOUNT_BUSINESS_RULES.stacking.maxCombinedPercentage / 100);
        break;
      }
    }
    
    return Math.min(totalDiscount, baseAmount);
  }
};

// Helper function to calculate single discount
function calculateSingleDiscount(amount, discount) {
  switch (discount.type) {
    case 'percentage':
      return amount * (discount.value / 100);
    case 'fixed_amount':
      return Math.min(discount.value, amount);
    case 'bottle_return':
      const tier = DISCOUNT_BUSINESS_RULES.bottleReturn.tiers.find(
        t => t.bottles === discount.bottle_return_count
      );
      // Return fixed amount discount, capped at the order amount
      return tier ? Math.min(tier.discountAmount, amount) : 0;
    default:
      return 0;
  }
}

export default DISCOUNT_BUSINESS_RULES;
