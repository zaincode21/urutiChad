import { currencyAPI } from '../lib/api';

export class ExpenseAnalyticsService {
  constructor() {
    this.currencyRates = {};
    this.lastUpdate = null;
  }

  // Initialize currency rates
  async initializeRates() {
    try {
      const response = await currencyAPI.getRwfRates();
      this.currencyRates = response.data?.rwf_rates || [];
      this.lastUpdate = new Date();
    } catch (error) {
      console.error('Failed to initialize currency rates:', error);
    }
  }

  // Calculate comprehensive expense insights
  calculateInsights(expenses, period = 'all') {
    if (!expenses || expenses.length === 0) {
      return this.getEmptyInsights();
    }

    const filteredExpenses = this.filterExpensesByPeriod(expenses, period);
    const totalExpenses = this.calculateTotalExpenses(filteredExpenses);
    const categoryBreakdown = this.analyzeByCategory(filteredExpenses);
    const monthlyTrends = this.analyzeMonthlyTrends(filteredExpenses);
    const shopAnalysis = this.analyzeByShop(filteredExpenses);
    const currencyAnalysis = this.analyzeByCurrency(filteredExpenses);
    const recurringAnalysis = this.analyzeRecurringExpenses(filteredExpenses);
    const budgetInsights = this.calculateBudgetInsights(filteredExpenses);
    const efficiencyMetrics = this.calculateEfficiencyMetrics(filteredExpenses);

    return {
      summary: {
        totalExpenses,
        totalCount: filteredExpenses.length,
        period,
        lastUpdated: new Date().toISOString()
      },
      categoryBreakdown,
      monthlyTrends,
      shopAnalysis,
      currencyAnalysis,
      recurringAnalysis,
      budgetInsights,
      efficiencyMetrics,
      recommendations: this.generateRecommendations({
        categoryBreakdown,
        monthlyTrends,
        budgetInsights,
        efficiencyMetrics
      })
    };
  }

  // Filter expenses by time period
  filterExpensesByPeriod(expenses, period) {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    switch (period) {
      case 'this_month':
        return expenses.filter(expense => {
          const expenseDate = new Date(expense.expense_date);
          return expenseDate.getMonth() === currentMonth && 
                 expenseDate.getFullYear() === currentYear;
        });
      case 'last_month':
        const lastMonth = currentMonth === 0 ? 11 : currentMonth - 1;
        const lastMonthYear = currentMonth === 0 ? currentYear - 1 : currentYear;
        return expenses.filter(expense => {
          const expenseDate = new Date(expense.expense_date);
          return expenseDate.getMonth() === lastMonth && 
                 expenseDate.getFullYear() === lastMonthYear;
        });
      case 'this_quarter':
        const currentQuarter = Math.floor(currentMonth / 3);
        const quarterStartMonth = currentQuarter * 3;
        return expenses.filter(expense => {
          const expenseDate = new Date(expense.expense_date);
          const expenseQuarter = Math.floor(expenseDate.getMonth() / 3);
          return expenseQuarter === currentQuarter && 
                 expenseDate.getFullYear() === currentYear;
        });
      case 'this_year':
        return expenses.filter(expense => {
          const expenseDate = new Date(expense.expense_date);
          return expenseDate.getFullYear() === currentYear;
        });
      case 'last_30_days':
        const thirtyDaysAgo = new Date(now.getTime() - (30 * 24 * 60 * 60 * 1000));
        return expenses.filter(expense => {
          const expenseDate = new Date(expense.expense_date);
          return expenseDate >= thirtyDaysAgo;
        });
      default:
        return expenses;
    }
  }

  // Calculate total expenses with currency conversion
  calculateTotalExpenses(expenses) {
    const totals = {
      USD: 0,
      EUR: 0,
      GBP: 0,
      RWF: 0,
      totalRwf: 0
    };

    expenses.forEach(expense => {
      const currency = expense.currency || 'USD';
      const amount = parseFloat(expense.amount) || 0;
      
      if (totals[currency] !== undefined) {
        totals[currency] += amount;
      } else {
        totals.USD += amount; // Default to USD for unknown currencies
      }

      // Convert to RWF for total
      const rwfAmount = this.convertToRwf(amount, currency);
      totals.totalRwf += rwfAmount || 0;
    });

    return totals;
  }

  // Analyze expenses by category
  analyzeByCategory(expenses) {
    const categoryMap = {};
    
    expenses.forEach(expense => {
      const category = expense.category || 'Uncategorized';
      const amount = parseFloat(expense.amount) || 0;
      const rwfAmount = this.convertToRwf(amount, expense.currency || 'USD');

      if (!categoryMap[category]) {
        categoryMap[category] = {
          count: 0,
          totalAmount: 0,
          totalRwf: 0,
          averageAmount: 0,
          percentage: 0,
          trend: 'stable'
        };
      }

      categoryMap[category].count++;
      categoryMap[category].totalAmount += amount;
      categoryMap[category].totalRwf += rwfAmount || 0;
    });

    // Calculate percentages and averages
    const totalRwf = Object.values(categoryMap).reduce((sum, cat) => sum + cat.totalRwf, 0);
    
    Object.values(categoryMap).forEach(category => {
      category.percentage = totalRwf > 0 ? (category.totalRwf / totalRwf) * 100 : 0;
      category.averageAmount = category.count > 0 ? category.totalAmount / category.count : 0;
    });

    // Sort by total amount
    return Object.entries(categoryMap)
      .map(([name, data]) => ({ name, ...data }))
      .sort((a, b) => b.totalRwf - a.totalRwf);
  }

  // Analyze monthly trends
  analyzeMonthlyTrends(expenses) {
    const monthlyData = {};
    
    expenses.forEach(expense => {
      const date = new Date(expense.expense_date);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      const amount = parseFloat(expense.amount) || 0;
      const rwfAmount = this.convertToRwf(amount, expense.currency || 'USD');

      if (!monthlyData[monthKey]) {
        monthlyData[monthKey] = {
          month: monthKey,
          count: 0,
          totalAmount: 0,
          totalRwf: 0,
          categories: {}
        };
      }

      monthlyData[monthKey].count++;
      monthlyData[monthKey].totalAmount += amount;
      monthlyData[monthKey].totalRwf += rwfAmount || 0;

      // Track categories per month
      const category = expense.category || 'Uncategorized';
      if (!monthlyData[monthKey].categories[category]) {
        monthlyData[monthKey].categories[category] = 0;
      }
      monthlyData[monthKey].categories[category] += rwfAmount || 0;
    });

    // Calculate trends
    const sortedMonths = Object.keys(monthlyData).sort();
    sortedMonths.forEach((monthKey, index) => {
      if (index > 0) {
        const currentMonth = monthlyData[monthKey];
        const previousMonth = monthlyData[sortedMonths[index - 1]];
        const change = previousMonth.totalRwf > 0 
          ? ((currentMonth.totalRwf - previousMonth.totalRwf) / previousMonth.totalRwf) * 100
          : 0;
        
        currentMonth.trend = change > 5 ? 'increasing' : change < -5 ? 'decreasing' : 'stable';
        currentMonth.changePercentage = change;
      }
    });

    return Object.values(monthlyData).sort((a, b) => a.month.localeCompare(b.month));
  }

  // Analyze expenses by shop
  analyzeByShop(expenses) {
    const shopMap = {};
    
    expenses.forEach(expense => {
      const shopName = expense.shop_name || 'All Shops';
      const amount = parseFloat(expense.amount) || 0;
      const rwfAmount = this.convertToRwf(amount, expense.currency || 'USD');

      if (!shopMap[shopName]) {
        shopMap[shopName] = {
          name: shopName,
          count: 0,
          totalAmount: 0,
          totalRwf: 0,
          averageAmount: 0,
          categories: {}
        };
      }

      shopMap[shopName].count++;
      shopMap[shopName].totalAmount += amount;
      shopMap[shopName].totalRwf += rwfAmount || 0;

      // Track categories per shop
      const category = expense.category || 'Uncategorized';
      if (!shopMap[shopName].categories[category]) {
        shopMap[shopName].categories[category] = 0;
      }
      shopMap[shopName].categories[category] += rwfAmount || 0;
    });

    // Calculate averages
    Object.values(shopMap).forEach(shop => {
      shop.averageAmount = shop.count > 0 ? shop.totalAmount / shop.count : 0;
    });

    return Object.values(shopMap).sort((a, b) => b.totalRwf - a.totalRwf);
  }

  // Analyze currency distribution
  analyzeByCurrency(expenses) {
    const currencyMap = {};
    
    expenses.forEach(expense => {
      const currency = expense.currency || 'USD';
      const amount = parseFloat(expense.amount) || 0;
      const rwfAmount = this.convertToRwf(amount, currency);

      if (!currencyMap[currency]) {
        currencyMap[currency] = {
          currency,
          count: 0,
          totalAmount: 0,
          totalRwf: 0,
          averageAmount: 0,
          percentage: 0
        };
      }

      currencyMap[currency].count++;
      currencyMap[currency].totalAmount += amount;
      currencyMap[currency].totalRwf += rwfAmount || 0;
    });

    // Calculate percentages and averages
    const totalRwf = Object.values(currencyMap).reduce((sum, curr) => sum + curr.totalRwf, 0);
    
    Object.values(currencyMap).forEach(currency => {
      currency.percentage = totalRwf > 0 ? (currency.totalRwf / totalRwf) * 100 : 0;
      currency.averageAmount = currency.count > 0 ? currency.totalAmount / currency.count : 0;
    });

    return Object.values(currencyMap).sort((a, b) => b.totalRwf - a.totalRwf);
  }

  // Analyze recurring expenses
  analyzeRecurringExpenses(expenses) {
    const recurring = expenses.filter(expense => expense.is_recurring);
    const nonRecurring = expenses.filter(expense => !expense.is_recurring);

    const recurringTotal = this.calculateTotalExpenses(recurring);
    const nonRecurringTotal = this.calculateTotalExpenses(nonRecurring);

    const frequencyBreakdown = {};
    recurring.forEach(expense => {
      const frequency = expense.recurring_frequency || 'monthly';
      if (!frequencyBreakdown[frequency]) {
        frequencyBreakdown[frequency] = {
          frequency,
          count: 0,
          totalAmount: 0,
          totalRwf: 0
        };
      }
      
      const amount = parseFloat(expense.amount) || 0;
      const rwfAmount = this.convertToRwf(amount, expense.currency || 'USD');
      
      frequencyBreakdown[frequency].count++;
      frequencyBreakdown[frequency].totalAmount += amount;
      frequencyBreakdown[frequency].totalRwf += rwfAmount || 0;
    });

    return {
      recurring: {
        count: recurring.length,
        totalAmount: recurringTotal,
        percentage: expenses.length > 0 ? (recurring.length / expenses.length) * 100 : 0
      },
      nonRecurring: {
        count: nonRecurring.length,
        totalAmount: nonRecurringTotal,
        percentage: expenses.length > 0 ? (nonRecurring.length / expenses.length) * 100 : 0
      },
      frequencyBreakdown: Object.values(frequencyBreakdown).sort((a, b) => b.totalRwf - a.totalRwf)
    };
  }

  // Calculate budget insights
  calculateBudgetInsights(expenses) {
    const monthlyExpenses = this.analyzeMonthlyTrends(expenses);
    const currentMonth = monthlyExpenses[monthlyExpenses.length - 1];
    const previousMonth = monthlyExpenses[monthlyExpenses.length - 2];

    const avgMonthlyExpense = monthlyExpenses.reduce((sum, month) => sum + month.totalRwf, 0) / monthlyExpenses.length;
    const projectedAnnualExpense = avgMonthlyExpense * 12;
    
    const monthOverMonthChange = previousMonth 
      ? ((currentMonth.totalRwf - previousMonth.totalRwf) / previousMonth.totalRwf) * 100
      : 0;

    return {
      averageMonthly: avgMonthlyExpense,
      projectedAnnual: projectedAnnualExpense,
      monthOverMonthChange,
      trend: monthOverMonthChange > 5 ? 'increasing' : monthOverMonthChange < -5 ? 'decreasing' : 'stable',
      budgetAlert: monthOverMonthChange > 20 ? 'high' : monthOverMonthChange > 10 ? 'medium' : 'low'
    };
  }

  // Calculate efficiency metrics
  calculateEfficiencyMetrics(expenses) {
    const categoryBreakdown = this.analyzeByCategory(expenses);
    const shopAnalysis = this.analyzeByShop(expenses);
    
    // Calculate cost per category efficiency
    const categoryEfficiency = categoryBreakdown.map(category => ({
      ...category,
      efficiency: category.count > 0 ? category.totalRwf / category.count : 0
    }));

    // Calculate shop efficiency
    const shopEfficiency = shopAnalysis.map(shop => ({
      ...shop,
      efficiency: shop.count > 0 ? shop.totalRwf / shop.count : 0
    }));

    // Overall efficiency metrics
    const totalExpenses = this.calculateTotalExpenses(expenses);
    const averageExpenseSize = totalExpenses.totalRwf / expenses.length;
    const expenseDistribution = this.calculateExpenseDistribution(expenses);

    return {
      averageExpenseSize,
      expenseDistribution,
      categoryEfficiency: categoryEfficiency.sort((a, b) => b.efficiency - a.efficiency),
      shopEfficiency: shopEfficiency.sort((a, b) => b.efficiency - a.efficiency),
      costOptimization: this.identifyCostOptimizationOpportunities(categoryBreakdown, shopAnalysis)
    };
  }

  // Calculate expense distribution (small, medium, large)
  calculateExpenseDistribution(expenses) {
    const rwfAmounts = expenses.map(expense => {
      const amount = parseFloat(expense.amount) || 0;
      return this.convertToRwf(amount, expense.currency || 'USD') || 0;
    }).sort((a, b) => a - b);

    if (rwfAmounts.length === 0) return { small: 0, medium: 0, large: 0 };

    const q1 = rwfAmounts[Math.floor(rwfAmounts.length * 0.25)];
    const q3 = rwfAmounts[Math.floor(rwfAmounts.length * 0.75)];

    const small = rwfAmounts.filter(amount => amount <= q1).length;
    const medium = rwfAmounts.filter(amount => amount > q1 && amount <= q3).length;
    const large = rwfAmounts.filter(amount => amount > q3).length;

    return { small, medium, large };
  }

  // Identify cost optimization opportunities
  identifyCostOptimizationOpportunities(categoryBreakdown, shopAnalysis) {
    const opportunities = [];

    // High-spending categories
    const highSpendingCategories = categoryBreakdown
      .filter(cat => cat.percentage > 20)
      .map(cat => ({
        type: 'high_spending_category',
        message: `${cat.name} represents ${cat.percentage.toFixed(1)}% of total expenses`,
        impact: 'high',
        recommendation: 'Consider negotiating better rates or finding alternative suppliers'
      }));

    // Inefficient shops
    const inefficientShops = shopAnalysis
      .filter(shop => shop.averageAmount > shopAnalysis[0]?.averageAmount * 1.5)
      .map(shop => ({
        type: 'inefficient_shop',
        message: `${shop.name} has higher average expense (${shop.averageAmount.toFixed(2)})`,
        impact: 'medium',
        recommendation: 'Review expense policies and training for this location'
      }));

    // Recurring expense optimization
    if (categoryBreakdown.some(cat => cat.name.includes('Subscription') || cat.name.includes('Service'))) {
      opportunities.push({
        type: 'subscription_optimization',
        message: 'Subscription and service expenses detected',
        impact: 'medium',
        recommendation: 'Review and optimize recurring service subscriptions'
      });
    }

    return [...highSpendingCategories, ...inefficientShops, ...opportunities];
  }

  // Generate actionable recommendations
  generateRecommendations(insights) {
    const recommendations = [];

    // Category-based recommendations
    if (insights.categoryBreakdown) {
      const topCategory = insights.categoryBreakdown[0];
      if (topCategory && topCategory.percentage > 30) {
        recommendations.push({
          type: 'category_concentration',
          priority: 'high',
          title: 'High Category Concentration',
          description: `${topCategory.name} represents ${topCategory.percentage.toFixed(1)}% of expenses`,
          action: 'Consider diversifying suppliers or negotiating better rates',
          impact: 'High cost reduction potential'
        });
      }
    }

    // Trend-based recommendations
    if (insights.monthlyTrends) {
      const recentTrends = insights.monthlyTrends.slice(-3);
      const increasingTrends = recentTrends.filter(month => month.trend === 'increasing');
      
      if (increasingTrends.length >= 2) {
        recommendations.push({
          type: 'trend_alert',
          priority: 'medium',
          title: 'Expense Trend Alert',
          description: 'Expenses have been increasing over the last few months',
          action: 'Review recent expenses and identify cost drivers',
          impact: 'Prevent cost escalation'
        });
      }
    }

    // Budget-based recommendations
    if (insights.budgetInsights) {
      if (insights.budgetInsights.monthOverMonthChange > 15) {
        recommendations.push({
          type: 'budget_alert',
          priority: 'high',
          title: 'Budget Alert',
          description: `Expenses increased by ${insights.budgetInsights.monthOverMonthChange.toFixed(1)}% month-over-month`,
          action: 'Immediate review of recent expenses and approval processes',
          impact: 'Prevent budget overrun'
        });
      }
    }

    // Efficiency-based recommendations
    if (insights.efficiencyMetrics) {
      const costOptimization = insights.efficiencyMetrics.costOptimization;
      if (costOptimization.length > 0) {
        costOptimization.forEach(opp => {
          recommendations.push({
            type: 'cost_optimization',
            priority: opp.impact === 'high' ? 'high' : 'medium',
            title: 'Cost Optimization Opportunity',
            description: opp.message,
            action: opp.recommendation,
            impact: opp.impact === 'high' ? 'Significant cost savings potential' : 'Moderate cost savings potential'
          });
        });
      }
    }

    return recommendations.sort((a, b) => {
      const priorityOrder = { high: 3, medium: 2, low: 1 };
      return priorityOrder[b.priority] - priorityOrder[a.priority];
    });
  }

  // Convert amount to RWF
  convertToRwf(amount, fromCurrency) {
    if (fromCurrency === 'RWF') return amount;

    // Approximate rates (in production, use real-time rates)
    const rates = {
      'USD': 1300, 'EUR': 1400, 'GBP': 1650, 'JPY': 8.7,
      'CNY': 180, 'INR': 15.6, 'AED': 354, 'CAD': 950,
      'AUD': 850, 'CHF': 1450
    };

    const rate = rates[fromCurrency];
    return rate ? parseFloat((amount * rate).toFixed(2)) : null;
  }

  // Get empty insights structure
  getEmptyInsights() {
    return {
      summary: {
        totalExpenses: { USD: 0, EUR: 0, GBP: 0, RWF: 0, totalRwf: 0 },
        totalCount: 0,
        period: 'all',
        lastUpdated: new Date().toISOString()
      },
      categoryBreakdown: [],
      monthlyTrends: [],
      shopAnalysis: [],
      currencyAnalysis: [],
      recurringAnalysis: {
        recurring: { count: 0, totalAmount: {}, percentage: 0 },
        nonRecurring: { count: 0, totalAmount: {}, percentage: 0 },
        frequencyBreakdown: []
      },
      budgetInsights: {
        averageMonthly: 0,
        projectedAnnual: 0,
        monthOverMonthChange: 0,
        trend: 'stable',
        budgetAlert: 'low'
      },
      efficiencyMetrics: {
        averageExpenseSize: 0,
        expenseDistribution: { small: 0, medium: 0, large: 0 },
        categoryEfficiency: [],
        shopEfficiency: [],
        costOptimization: []
      },
      recommendations: []
    };
  }
}

export default ExpenseAnalyticsService;
