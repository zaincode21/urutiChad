import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  Building2, 
  FileText, 
  BarChart3,
  Calculator,
  Eye,
  RefreshCw,
  AlertTriangle,
  CheckCircle,
  XCircle
} from 'lucide-react';
import { glAccountsAPI, financialReportsAPI } from '../lib/api';
import TranslatedText from './TranslatedText';

const AccountingDashboard = () => {
  const [selectedPeriod, setSelectedPeriod] = useState('current-month');
  const [showInactiveAccounts, setShowInactiveAccounts] = useState(false);

  // Fetch GL account hierarchy and balances
  const { data: hierarchyData, isLoading: hierarchyLoading, error: hierarchyError } = useQuery({
    queryKey: ['gl-hierarchy'],
    queryFn: () => glAccountsAPI.getHierarchy()
  });

  const { data: balancesData, isLoading: balancesLoading, error: balancesError } = useQuery({
    queryKey: ['gl-balances', selectedPeriod],
    queryFn: () => glAccountsAPI.getBalances({ period: selectedPeriod })
  });

  // Debug logging to understand data structure
  console.log('balancesData:', balancesData);
  console.log('hierarchyData:', hierarchyData);

  // Fetch quick financial summary
  const { data: trialBalanceData } = useQuery({
    queryKey: ['trial-balance-summary'],
    queryFn: () => financialReportsAPI.getTrialBalance({ 
      include_zero_balances: false,
      limit: 10 
    })
  });

  const isLoading = hierarchyLoading || balancesLoading;
  
  // Add error handling for malformed data
  const hasValidData = balancesData?.balances && Array.isArray(balancesData.balances) && 
                      hierarchyData?.hierarchy && Array.isArray(hierarchyData.hierarchy);
  
  // Check for API errors
  const hasErrors = hierarchyError || balancesError;

  const formatCurrency = (amount, currency = 'USD') => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency
    }).format(amount);
  };

  const getAccountTypeColor = (accountType) => {
    switch (accountType) {
      case 'asset': return 'text-blue-600 bg-blue-100';
      case 'liability': return 'text-red-600 bg-red-100';
      case 'equity': return 'text-purple-600 bg-purple-100';
      case 'revenue': return 'text-green-600 bg-green-100';
      case 'expense': return 'text-yellow-600 bg-yellow-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getAccountTypeIcon = (accountType) => {
    switch (accountType) {
      case 'asset': return <Building2 className="h-4 w-4" />;
      case 'liability': return <AlertTriangle className="h-4 w-4" />;
      case 'equity': return <CheckCircle className="h-4 w-4" />;
      case 'revenue': return <TrendingUp className="h-4 w-4" />;
      case 'expense': return <TrendingDown className="h-4 w-4" />;
      default: return <FileText className="h-4 w-4" />;
    }
  };

  const calculateAccountSummary = () => {
    if (!balancesData || !balancesData.balances || !Array.isArray(balancesData.balances)) {
      console.log('calculateAccountSummary: Invalid balancesData:', balancesData);
      return null;
    }

    const summary = {
      totalAssets: 0,
      totalLiabilities: 0,
      totalEquity: 0,
      totalRevenue: 0,
      totalExpenses: 0,
      accountCounts: {
        asset: 0,
        liability: 0,
        equity: 0,
        revenue: 0,
        expense: 0
      }
    };

    balancesData.balances.forEach(account => {
      summary.accountCounts[account.account_type]++;
      
      switch (account.account_type) {
        case 'asset':
          summary.totalAssets += account.balance > 0 ? account.balance : 0;
          break;
        case 'liability':
          summary.totalLiabilities += account.balance > 0 ? account.balance : 0;
          break;
        case 'equity':
          summary.totalEquity += account.balance > 0 ? account.balance : 0;
          break;
        case 'revenue':
          summary.totalRevenue += account.balance > 0 ? account.balance : 0;
          break;
        case 'expense':
          summary.totalExpenses += account.balance > 0 ? account.balance : 0;
          break;
      }
    });

    return summary;
  };

  const accountSummary = calculateAccountSummary();

  const renderAccountHierarchy = () => {
    if (!hierarchyData || !hierarchyData.hierarchy || !Array.isArray(hierarchyData.hierarchy)) {
      console.log('renderAccountHierarchy: Invalid hierarchyData:', hierarchyData);
      return null;
    }

    const renderCategory = (category, level = 0) => {
      const accounts = balancesData?.balances?.filter(acc => acc.category_id === category.id) || [];
      const hasChildren = category.children && category.children.length > 0;
      const isExpanded = true; // You can add state to control expansion

      return (
        <div key={category.id} className="mb-4">
          <div className={`flex items-center space-x-2 p-3 rounded-lg bg-gray-50 border-l-4 ${
            level === 0 ? 'border-blue-500' : 
            level === 1 ? 'border-green-500' : 'border-purple-500'
          }`}>
            <div className="flex-1">
              <h4 className="font-medium text-gray-900">{category.name}</h4>
              <p className="text-sm text-gray-500">{category.code} • {category.account_type}</p>
            </div>
            <div className="text-right">
              <div className="text-sm text-gray-500">Accounts</div>
              <div className="font-semibold text-gray-900">{accounts.length}</div>
            </div>
          </div>
          
          {isExpanded && (
            <div className="ml-6 space-y-2">
              {accounts.map(account => (
                <div key={account.id} className="flex items-center justify-between p-2 bg-white rounded border hover:bg-gray-50">
                  <div className="flex items-center space-x-3">
                    <span className={`p-1 rounded-full ${getAccountTypeColor(account.account_type)}`}>
                      {getAccountTypeIcon(account.account_type)}
                    </span>
                    <div>
                      <div className="font-medium text-gray-900">{account.account_name}</div>
                      <div className="text-sm text-gray-500">{account.account_code}</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className={`font-semibold ${
                      account.balance > 0 ? 'text-green-600' : 
                      account.balance < 0 ? 'text-red-600' : 'text-gray-500'
                    }`}>
                      {formatCurrency(Math.abs(account.balance))}
                    </div>
                    <div className="text-xs text-gray-500">
                      {account.normal_balance} balance
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {hasChildren && (
            <div className="ml-6">
              {category.children.map(childCategory => renderCategory(childCategory, level + 1))}
            </div>
          )}
        </div>
      );
    };

    return (
      <div className="space-y-4">
        {hierarchyData.hierarchy.map(category => renderCategory(category))}
      </div>
    );
  };

  const renderQuickMetrics = () => {
    if (!accountSummary) {
      return (
        <div className="text-center py-8">
          <AlertTriangle className="h-8 w-8 text-yellow-400 mx-auto mb-4" />
          <p className="text-yellow-600">No account summary available. Please check if GL accounts are properly configured.</p>
        </div>
      );
    }

    const netIncome = accountSummary.totalRevenue - accountSummary.totalExpenses;
    const totalEquity = accountSummary.totalAssets - accountSummary.totalLiabilities;

    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm text-blue-600 font-medium">Total Assets</div>
              <div className="text-2xl font-bold text-blue-900">
                {formatCurrency(accountSummary.totalAssets)}
              </div>
            </div>
            <Building2 className="h-8 w-8 text-blue-600" />
          </div>
          <div className="text-xs text-blue-700 mt-2">
            {accountSummary.accountCounts.asset} accounts
          </div>
        </div>

        <div className="bg-red-50 p-4 rounded-lg border border-red-200">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm text-red-600 font-medium">Total Liabilities</div>
              <div className="text-2xl font-bold text-red-900">
                {formatCurrency(accountSummary.totalLiabilities)}
              </div>
            </div>
            <AlertTriangle className="h-8 w-8 text-red-600" />
          </div>
          <div className="text-xs text-red-700 mt-2">
            {accountSummary.accountCounts.liability} accounts
          </div>
        </div>

        <div className="bg-green-50 p-4 rounded-lg border border-green-200">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm text-green-600 font-medium">Net Income</div>
              <div className={`text-2xl font-bold ${netIncome >= 0 ? 'text-green-900' : 'text-red-900'}`}>
                {formatCurrency(Math.abs(netIncome))}
              </div>
            </div>
            <TrendingUp className="h-8 w-8 text-green-600" />
          </div>
          <div className="text-xs text-green-700 mt-2">
            Revenue: {formatCurrency(accountSummary.totalRevenue)}
          </div>
        </div>

        <div className="bg-purple-50 p-4 rounded-lg border border-purple-200">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm text-purple-600 font-medium">Total Equity</div>
              <div className={`text-2xl font-bold ${totalEquity >= 0 ? 'text-purple-900' : 'text-red-900'}`}>
                {formatCurrency(Math.abs(totalEquity))}
              </div>
            </div>
            <CheckCircle className="h-8 w-8 text-purple-600" />
          </div>
          <div className="text-xs text-purple-700 mt-2">
            {accountSummary.accountCounts.equity} accounts
          </div>
        </div>
      </div>
    );
  };

  const renderTrialBalanceSummary = () => {
    if (!trialBalanceData) {
      return (
        <div className="bg-white rounded-lg p-6 shadow-sm border">
          <h3 className="text-lg font-semibold text-gray-900 mb-4"><TranslatedText text="Trial Balance Quick Check" /></h3>
          <div className="text-center py-8">
            <AlertTriangle className="h-8 w-8 text-yellow-400 mx-auto mb-4" />
            <p className="text-yellow-600">No trial balance data available. Please check if financial reports are properly configured.</p>
          </div>
        </div>
      );
    }

    const totalDebits = trialBalanceData.totals?.total_debits || 0;
    const totalCredits = trialBalanceData.totals?.total_credits || 0;
    const difference = Math.abs(totalDebits - totalCredits);
    const isBalanced = difference < 0.01;

    return (
      <div className="bg-white rounded-lg p-6 shadow-sm border">
        <h3 className="text-lg font-semibold text-gray-900 mb-4"><TranslatedText text="Trial Balance Quick Check" /></h3>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          <div className="text-center">
            <div className="text-sm text-gray-600">Total Debits</div>
            <div className="text-xl font-semibold text-blue-600">
              {formatCurrency(totalDebits)}
            </div>
          </div>
          <div className="text-center">
            <div className="text-sm text-gray-600">Total Credits</div>
            <div className="text-xl font-semibold text-green-600">
              {formatCurrency(totalCredits)}
            </div>
          </div>
          <div className="text-center">
            <div className="text-sm text-gray-600">Difference</div>
            <div className={`text-xl font-semibold ${isBalanced ? 'text-green-600' : 'text-red-600'}`}>
              {formatCurrency(difference)}
            </div>
          </div>
        </div>

        <div className={`flex items-center justify-center p-3 rounded-lg ${
          isBalanced ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'
        }`}>
          {isBalanced ? (
            <CheckCircle className="h-5 w-5 text-green-600 mr-2" />
          ) : (
            <XCircle className="h-5 w-5 text-red-600 mr-2" />
          )}
          <span className={`font-medium ${isBalanced ? 'text-green-800' : 'text-red-800'}`}>
            {isBalanced ? 'Trial Balance is Balanced' : 'Trial Balance is Out of Balance'}
          </span>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg p-6 shadow-sm border">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-900"><TranslatedText text="Accounting Dashboard" /></h2>
            <p className="text-gray-600 mt-1">Overview of your financial position and GL account structure</p>
          </div>
          <div className="mt-4 sm:mt-0 flex space-x-2">
            <select
              value={selectedPeriod}
              onChange={(e) => setSelectedPeriod(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="current-month">Current Month</option>
              <option value="current-quarter">Current Quarter</option>
              <option value="current-year">Current Year</option>
              <option value="all-time">All Time</option>
            </select>
            <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:ring-2 focus:ring-blue-500">
              <RefreshCw className="h-4 w-4 inline mr-2" />
              Refresh
            </button>
          </div>
        </div>
      </div>

      {/* Quick Metrics */}
      {renderQuickMetrics()}

      {/* Trial Balance Summary */}
      {renderTrialBalanceSummary()}

      {/* GL Account Structure */}
      <div className="bg-white rounded-lg p-6 shadow-sm border">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900"><TranslatedText text="Chart of Accounts Structure" /></h3>
          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              id="show-inactive"
              checked={showInactiveAccounts}
              onChange={(e) => setShowInactiveAccounts(e.target.checked)}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
            <label htmlFor="show-inactive" className="text-sm text-gray-700">
              Show inactive accounts
            </label>
          </div>
        </div>

        {isLoading ? (
          <div className="text-center py-8">
            <RefreshCw className="h-8 w-8 text-gray-400 animate-spin mx-auto mb-4" />
            <p className="text-gray-500">Loading account structure...</p>
          </div>
        ) : hasErrors ? (
          <div className="text-center py-8">
            <AlertTriangle className="h-8 w-8 text-red-400 mx-auto mb-4" />
            <p className="text-red-500">Error loading accounting data. Please check the console for details.</p>
            <div className="text-xs text-gray-500 mt-2">
              {hierarchyError && <div>Hierarchy Error: {hierarchyError.message}</div>}
              {balancesError && <div>Balances Error: {balancesError.message}</div>}
            </div>
          </div>
        ) : !hasValidData ? (
          <div className="text-center py-8">
            <AlertTriangle className="h-8 w-8 text-red-400 mx-auto mb-4" />
            <p className="text-red-500">Unable to load accounting data. Please try again later.</p>
          </div>
        ) : (
          renderAccountHierarchy()
        )}
      </div>

      {/* Quick Actions */}
      <div className="bg-white rounded-lg p-6 shadow-sm border">
        <h3 className="text-lg font-semibold text-gray-900 mb-4"><TranslatedText text="Quick Actions" /></h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <button className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <FileText className="h-6 w-6 text-blue-600" />
              </div>
              <div className="text-left">
                <div className="font-medium text-gray-900">Generate Reports</div>
                <div className="text-sm text-gray-500">Create financial statements</div>
              </div>
            </div>
          </button>

          <button className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <Calculator className="h-6 w-6 text-green-600" />
              </div>
              <div className="text-left">
                <div className="font-medium text-gray-900">Reconcile Accounts</div>
                <div className="text-sm text-gray-500">Verify account balances</div>
              </div>
            </div>
          </button>

          <button className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-purple-100 rounded-lg">
                <BarChart3 className="h-6 w-6 text-purple-600" />
              </div>
              <div className="text-left">
                <div className="font-medium text-gray-900">View Analytics</div>
                <div className="text-sm text-gray-500">Financial performance insights</div>
              </div>
            </div>
          </button>
        </div>
      </div>
    </div>
  );
};

export default AccountingDashboard;
