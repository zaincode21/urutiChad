import React, { useState } from 'react';
import { 
  TrendingUp, 
  TrendingDown, 
  AlertTriangle, 
  Lightbulb, 
  DollarSign,
  Calendar,
  Building,
  PieChart,
  BarChart3,
  LineChart,
  Download,
  RefreshCw
} from 'lucide-react';
import ExpenseChart from './charts/ExpenseChart';
import { useCurrencyConversion } from '../hooks/useCurrencyConversion';
import TranslatedText from './TranslatedText';

const ExpenseInsights = ({ insights, loading, onPeriodChange, onRefresh }) => {
  const [selectedPeriod, setSelectedPeriod] = useState('all');
  const { formatCurrency } = useCurrencyConversion();

  const handlePeriodChange = (period) => {
    setSelectedPeriod(period);
    onPeriodChange?.(period);
  };

  const getTrendIcon = (trend) => {
    switch (trend) {
      case 'increasing':
        return <TrendingUp className="h-5 w-5 text-red-500" />;
      case 'decreasing':
        return <TrendingDown className="h-5 w-5 text-green-500" />;
      default:
        return <div className="h-5 w-5 text-gray-400">─</div>;
    }
  };

  const getBudgetAlertColor = (alert) => {
    switch (alert) {
      case 'high':
        return 'text-red-600 bg-red-50 border-red-200';
      case 'medium':
        return 'text-orange-600 bg-orange-50 border-orange-200';
      default:
        return 'text-green-600 bg-green-50 border-green-200';
    }
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'high':
        return 'border-l-red-500 bg-red-50';
      case 'medium':
        return 'border-l-orange-500 bg-orange-50';
      default:
        return 'border-l-blue-500 bg-blue-50';
    }
  };

  if (loading) {
    return (
      <div className="animate-pulse space-y-6">
        <div className="h-8 bg-gray-200 rounded-lg w-1/4"></div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="bg-white rounded-xl p-6 shadow-sm">
              <div className="h-4 bg-gray-200 rounded w-1/2 mb-4"></div>
              <div className="h-32 bg-gray-200 rounded"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (!insights || !insights.summary) {
    return (
      <div className="text-center py-12">
        <div className="text-gray-400 text-6xl mb-4">📊</div>
        <h3 className="text-xl font-medium text-gray-900 mb-2"><TranslatedText text="No Insights Available" /></h3>
        <p className="text-gray-500">Add some expenses to see detailed analytics and insights.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with Period Selector */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900"><TranslatedText text="Expense Insights & Analytics" /></h2>
          <p className="text-gray-600 mt-1">Comprehensive analysis of your business expenses</p>
        </div>
        <div className="flex items-center space-x-3">
          <select
            value={selectedPeriod}
            onChange={(e) => handlePeriodChange(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="all">All Time</option>
            <option value="this_month">This Month</option>
            <option value="last_month">Last Month</option>
            <option value="this_quarter">This Quarter</option>
            <option value="this_year">This Year</option>
            <option value="last_30_days">Last 30 Days</option>
          </select>
          <button
            onClick={onRefresh}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-50 rounded-lg transition-colors"
          >
            <RefreshCw className="h-5 w-5" />
          </button>
        </div>
      </div>

      {/* Key Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
          <div className="flex items-center">
            <div className="p-3 bg-blue-100 rounded-xl">
              <DollarSign className="h-6 w-6 text-blue-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Expenses</p>
              <p className="text-2xl font-bold text-gray-900">
                {formatCurrency(insights.summary.totalExpenses.totalRwf, 'CFA')}
              </p>
              <p className="text-sm text-gray-500">
                {insights.summary.totalCount} transactions
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
          <div className="flex items-center">
            <div className="p-3 bg-green-100 rounded-xl">
              <Calendar className="h-6 w-6 text-green-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Monthly Average</p>
              <p className="text-2xl font-bold text-gray-900">
                {formatCurrency(insights.budgetInsights.averageMonthly, 'CFA')}
              </p>
              <p className="text-sm text-gray-500">
                Projected: {formatCurrency(insights.budgetInsights.projectedAnnual, 'CFA')}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
          <div className="flex items-center">
            <div className="p-3 bg-purple-100 rounded-xl">
              <TrendingUp className="h-6 w-6 text-purple-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Month-over-Month</p>
              <div className="flex items-center space-x-2">
                {getTrendIcon(insights.budgetInsights.trend)}
                <p className={`text-2xl font-bold ${
                  insights.budgetInsights.monthOverMonthChange > 0 ? 'text-red-600' : 'text-green-600'
                }`}>
                  {Math.abs(insights.budgetInsights.monthOverMonthChange).toFixed(1)}%
                </p>
              </div>
              <p className="text-sm text-gray-500">
                {insights.budgetInsights.trend === 'increasing' ? 'Increase' : 
                 insights.budgetInsights.trend === 'decreasing' ? 'Decrease' : 'Stable'}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
          <div className="flex items-center">
            <div className="p-3 bg-orange-100 rounded-xl">
              <AlertTriangle className="h-6 w-6 text-orange-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Budget Alert</p>
              <p className={`text-2xl font-bold ${getBudgetAlertColor(insights.budgetInsights.budgetAlert).split(' ')[0]}`}>
                {insights.budgetInsights.budgetAlert.toUpperCase()}
              </p>
              <p className="text-sm text-gray-500">
                {insights.budgetInsights.budgetAlert === 'high' ? 'Immediate attention needed' :
                 insights.budgetInsights.budgetAlert === 'medium' ? 'Monitor closely' : 'All good'}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Charts Row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ExpenseChart
          type="pie"
          data={insights.categoryBreakdown.slice(0, 8)}
          title="Expenses by Category"
          subtitle="Top spending categories"
          height={300}
          formatCurrency={formatCurrency}
          yAxisDataKey="totalRwf"
        />
        
        <ExpenseChart
          type="line"
          data={insights.monthlyTrends}
          title="Monthly Expense Trends"
          subtitle="Expense patterns over time"
          height={300}
          formatCurrency={formatCurrency}
          xAxisDataKey="month"
          yAxisDataKey="totalRwf"
        />
      </div>

      {/* Charts Row 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ExpenseChart
          type="bar"
          data={insights.shopAnalysis.slice(0, 10)}
          title="Expenses by Shop"
          subtitle="Cost distribution across locations"
          height={300}
          formatCurrency={formatCurrency}
          xAxisDataKey="name"
          yAxisDataKey="totalRwf"
        />
        
        <ExpenseChart
          type="area"
          data={insights.monthlyTrends}
          title="Expense Volume Trends"
          subtitle="Transaction count and amount trends"
          height={300}
          formatCurrency={formatCurrency}
          xAxisDataKey="month"
          yAxisDataKey="totalRwf"
          secondaryDataKey="count"
        />
      </div>

      {/* Efficiency Metrics */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
          <h3 className="text-lg font-semibold text-gray-900 mb-4"><TranslatedText text="Expense Distribution" /></h3>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Small Expenses</span>
              <span className="font-medium text-gray-900">
                {insights.efficiencyMetrics.expenseDistribution.small}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Medium Expenses</span>
              <span className="font-medium text-gray-900">
                {insights.efficiencyMetrics.expenseDistribution.medium}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Large Expenses</span>
              <span className="font-medium text-gray-900">
                {insights.efficiencyMetrics.expenseDistribution.large}
              </span>
            </div>
          </div>
          <div className="mt-4 pt-4 border-t border-gray-100">
            <p className="text-sm text-gray-500">
              Average: {formatCurrency(insights.efficiencyMetrics.averageExpenseSize, 'CFA')}
            </p>
          </div>
        </div>

        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
          <h3 className="text-lg font-semibold text-gray-900 mb-4"><TranslatedText text="Recurring Expenses" /></h3>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Recurring</span>
              <span className="font-medium text-gray-900">
                {insights.recurringAnalysis.recurring.count}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">One-time</span>
              <span className="font-medium text-gray-900">
                {insights.recurringAnalysis.nonRecurring.count}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Recurring %</span>
              <span className="font-medium text-gray-900">
                {insights.recurringAnalysis.recurring.percentage.toFixed(1)}%
              </span>
            </div>
          </div>
          <div className="mt-4 pt-4 border-t border-gray-100">
            <p className="text-sm text-gray-500">
              Total: {formatCurrency(insights.recurringAnalysis.recurring.totalAmount.totalRwf, 'CFA')}
            </p>
          </div>
        </div>

        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
          <h3 className="text-lg font-semibold text-gray-900 mb-4"><TranslatedText text="Currency Breakdown" /></h3>
          <div className="space-y-3">
            {insights.currencyAnalysis.slice(0, 4).map((currency, index) => (
              <div key={index} className="flex items-center justify-between">
                <span className="text-sm text-gray-600">{currency.currency}</span>
                <span className="font-medium text-gray-900">
                  {currency.percentage.toFixed(1)}%
                </span>
              </div>
            ))}
          </div>
          <div className="mt-4 pt-4 border-t border-gray-100">
            <p className="text-sm text-gray-500">
              {insights.currencyAnalysis.length} currencies used
            </p>
          </div>
        </div>
      </div>

      {/* Recommendations */}
      {insights.recommendations && insights.recommendations.length > 0 && (
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
          <div className="flex items-center space-x-3 mb-6">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Lightbulb className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900"><TranslatedText text="Actionable Recommendations" /></h3>
              <p className="text-sm text-gray-500">AI-powered insights to optimize your expenses</p>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {insights.recommendations.map((recommendation, index) => (
              <div
                key={index}
                className={`p-4 rounded-lg border-l-4 ${getPriorityColor(recommendation.priority)}`}
              >
                <div className="flex items-start space-x-3">
                  <div className={`p-2 rounded-lg ${
                    recommendation.priority === 'high' ? 'bg-red-100' :
                    recommendation.priority === 'medium' ? 'bg-orange-100' : 'bg-blue-100'
                  }`}>
                    {recommendation.priority === 'high' ? (
                      <AlertTriangle className="h-4 w-4 text-red-600" />
                    ) : (
                      <Lightbulb className="h-4 w-4 text-orange-600" />
                    )}
                  </div>
                  <div className="flex-1">
                    <h4 className="font-medium text-gray-900 mb-1">{recommendation.title}</h4>
                    <p className="text-sm text-gray-600 mb-2">{recommendation.description}</p>
                    <p className="text-sm text-gray-700 font-medium">{recommendation.action}</p>
                    <p className="text-xs text-gray-500 mt-1">{recommendation.impact}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Export Section */}
      <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl p-6 border border-blue-200">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-gray-900"><TranslatedText text="Export & Share Insights" /></h3>
            <p className="text-sm text-gray-600 mt-1">
              Download reports and share insights with your team
            </p>
          </div>
          <div className="flex space-x-3">
            {/* PDF export button hidden per user request */}
            <button className="inline-flex items-center px-4 py-2 bg-white border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500">
              <Download className="h-4 w-4 mr-2" />
              Export CSV
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ExpenseInsights;
