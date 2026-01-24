import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { 
  Calendar, 
  Download, 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  Building2,
  FileText,
  BarChart3,
  RefreshCw,
  Eye,
  EyeOff,
  ShoppingCart,
  Receipt
} from 'lucide-react';
import { financialReportsAPI } from '../lib/api';
import ExpenseChart from './charts/ExpenseChart';
import TranslatedText from './TranslatedText';

const FinancialReports = () => {
  const [selectedReport, setSelectedReport] = useState('trial-balance');
  const [dateRange, setDateRange] = useState({
    start_date: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0],
    end_date: new Date().toISOString().split('T')[0],
    as_of_date: new Date().toISOString().split('T')[0]
  });
  const [showZeroBalances, setShowZeroBalances] = useState(false);

  // Fetch financial reports data with comprehensive error handling
  const { data: trialBalanceData, isLoading: trialBalanceLoading, error: trialBalanceError } = useQuery({
    queryKey: ['trial-balance', dateRange.as_of_date, showZeroBalances],
    queryFn: () => financialReportsAPI.getTrialBalance({
      as_of_date: dateRange.as_of_date,
      include_zero_balances: showZeroBalances
    }),
    enabled: selectedReport === 'trial-balance',
    retry: 1,
    onError: (error) => console.error('Trial Balance API Error:', error)
  });

  const { data: incomeStatementData, isLoading: incomeStatementLoading, error: incomeStatementError } = useQuery({
    queryKey: ['income-statement', dateRange.start_date, dateRange.end_date],
    queryFn: () => financialReportsAPI.getIncomeStatement({
      start_date: dateRange.start_date,
      end_date: dateRange.end_date
    }),
    enabled: selectedReport === 'income-statement',
    retry: 1,
    onError: (error) => console.error('Income Statement API Error:', error)
  });

  const { data: balanceSheetData, isLoading: balanceSheetLoading, error: balanceSheetError } = useQuery({
    queryKey: ['balance-sheet', dateRange.as_of_date],
    queryFn: () => financialReportsAPI.getBalanceSheet({
      as_of_date: dateRange.as_of_date
    }),
    enabled: selectedReport === 'balance-sheet',
    retry: 1,
    onError: (error) => console.error('Balance Sheet API Error:', error)
  });

  const { data: cashFlowData, isLoading: cashFlowLoading, error: cashFlowError } = useQuery({
    queryKey: ['cash-flow', dateRange.start_date, dateRange.end_date],
    queryFn: () => financialReportsAPI.getCashFlow({
      start_date: dateRange.start_date,
      end_date: dateRange.end_date
    }),
    enabled: selectedReport === 'cash-flow',
    retry: 1,
    onError: (error) => console.error('Cash Flow API Error:', error)
  });

  const { data: dailySalesData, isLoading: dailySalesLoading, error: dailySalesError } = useQuery({
    queryKey: ['daily-sales', dateRange.as_of_date],
    queryFn: () => financialReportsAPI.getDailySales({
      date: dateRange.as_of_date
    }),
    enabled: selectedReport === 'daily-sales',
    retry: 1,
    onError: (error) => console.error('Daily Sales API Error:', error)
  });

  const { data: dailyExpensesData, isLoading: dailyExpensesLoading, error: dailyExpensesError } = useQuery({
    queryKey: ['daily-expenses', dateRange.as_of_date],
    queryFn: () => financialReportsAPI.getDailyExpenses({
      date: dateRange.as_of_date
    }),
    enabled: selectedReport === 'daily-expenses',
    retry: 1,
    onError: (error) => console.error('Daily Expenses API Error:', error)
  });

  const isLoading = trialBalanceLoading || incomeStatementLoading || balanceSheetLoading || cashFlowLoading || dailySalesLoading || dailyExpensesLoading;
  
  // Check for API errors
  const hasErrors = trialBalanceError || incomeStatementError || balanceSheetError || cashFlowError || dailySalesError || dailyExpensesError;

  // Debug logging to understand data structure
  console.log('=== Financial Reports Debug Info ===');
  console.log('trialBalanceData:', trialBalanceData);
  console.log('incomeStatementData:', incomeStatementData);
  console.log('balanceSheetData:', balanceSheetData);
  console.log('cashFlowData:', cashFlowData);
  console.log('API Errors:', { trialBalanceError, incomeStatementError, balanceSheetError, cashFlowError });
  console.log('===================================');

  const handleDateChange = (field, value) => {
    setDateRange(prev => ({ ...prev, [field]: value }));
  };

  const formatCurrency = (amount, currency = 'RWF') => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency
    }).format(amount);
  };

  const getReportTitle = () => {
    switch (selectedReport) {
      case 'trial-balance': return 'Trial Balance';
      case 'income-statement': return 'Income Statement (Profit & Loss)';
      case 'balance-sheet': return 'Balance Sheet';
      case 'cash-flow': return 'Cash Flow Statement';
      case 'daily-sales': return 'Daily Sales Report';
      case 'daily-expenses': return 'Daily Expense Report';
      default: return 'Financial Reports';
    }
  };

  const renderTrialBalance = () => {
    // Comprehensive safety checks
    if (!trialBalanceData) {
      return (
        <div className="text-center py-8">
          <div className="text-yellow-600 mb-4">⚠️</div>
          <p className="text-yellow-600">No trial balance data available. Please check if financial reports are properly configured.</p>
        </div>
      );
    }

    if (!trialBalanceData.totals || !trialBalanceData.trial_balance) {
      return (
        <div className="text-center py-8">
          <div className="text-red-600 mb-4">❌</div>
          <p className="text-red-600">Invalid trial balance data structure received from API.</p>
          <p className="text-sm text-gray-500 mt-2">Expected: totals and trial_balance properties</p>
          <p className="text-sm text-gray-500">Received: {JSON.stringify(Object.keys(trialBalanceData))}</p>
        </div>
      );
    }

    return (
      <div className="space-y-6">
        <div className="bg-white rounded-lg p-6 shadow-sm border">
          <h3 className="text-lg font-semibold text-gray-900 mb-4"><TranslatedText text="Trial Balance Summary" /></h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-blue-50 p-4 rounded-lg">
              <div className="text-sm text-blue-600 font-medium">Total Debits</div>
              <div className="text-2xl font-bold text-blue-900">
                {formatCurrency(trialBalanceData.totals.total_debits || 0)}
              </div>
            </div>
            <div className="bg-green-50 p-4 rounded-lg">
              <div className="text-sm text-green-600 font-medium">Total Credits</div>
              <div className="text-2xl font-bold text-green-900">
                {formatCurrency(trialBalanceData.totals.total_credits || 0)}
              </div>
            </div>
            <div className="bg-purple-50 p-4 rounded-lg">
              <div className="text-sm text-purple-600 font-medium">Difference</div>
              <div className={`text-2xl font-bold ${Math.abs((trialBalanceData.totals.total_debits || 0) - (trialBalanceData.totals.total_credits || 0)) < 0.01 ? 'text-green-900' : 'text-red-900'}`}>
                {formatCurrency(Math.abs((trialBalanceData.totals.total_debits || 0) - (trialBalanceData.totals.total_credits || 0)))}
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
          <div className="px-6 py-4 border-b bg-gray-50">
            <h4 className="text-md font-semibold text-gray-900">Account Balances</h4>
          </div>
          <div className="overflow-x-auto">
            {trialBalanceData.trial_balance && trialBalanceData.trial_balance.length > 0 ? (
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Account</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Category</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Debits</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Credits</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Balance</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {trialBalanceData.trial_balance.map((account) => (
                    <tr key={account.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <div className="text-sm font-medium text-gray-900">{account.account_code}</div>
                          <div className="text-sm text-gray-500">{account.account_name}</div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{account.category_name}</td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          account.account_type === 'asset' ? 'bg-blue-100 text-blue-800' :
                          account.account_type === 'liability' ? 'bg-red-100 text-red-800' :
                          account.account_type === 'equity' ? 'bg-purple-100 text-purple-800' :
                          account.account_type === 'revenue' ? 'bg-green-100 text-green-800' :
                          'bg-yellow-100 text-yellow-800'
                        }`}>
                          {account.account_type}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-900">
                        {formatCurrency(account.total_debits || 0)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-900">
                        {formatCurrency(account.total_credits || 0)}
                      </td>
                      <td className={`px-6 py-4 whitespace-nowrap text-sm font-medium text-right ${
                        (account.balance || 0) > 0 ? 'text-green-600' : (account.balance || 0) < 0 ? 'text-red-600' : 'text-gray-500'
                      }`}>
                        {formatCurrency(Math.abs(account.balance || 0))}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div className="text-center py-8">
                <p className="text-gray-500">No account balances found in this period</p>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  const renderIncomeStatement = () => {
    // Comprehensive safety checks
    if (!incomeStatementData) {
      return (
        <div className="text-center py-8">
          <div className="text-yellow-600 mb-4">⚠️</div>
          <p className="text-yellow-600">No income statement data available. Please check if financial reports are properly configured.</p>
        </div>
      );
    }

    if (!incomeStatementData.revenues || !incomeStatementData.expenses) {
      return (
        <div className="text-center py-8">
          <div className="text-red-600 mb-4">❌</div>
          <p className="text-red-600">Invalid income statement data structure received from API.</p>
          <p className="text-sm text-gray-500 mt-2">Expected: revenues and expenses properties</p>
          <p className="text-sm text-gray-500">Received: {JSON.stringify(Object.keys(incomeStatementData))}</p>
        </div>
      );
    }

    return (
      <div className="space-y-6">
        <div className="bg-white rounded-lg p-6 shadow-sm border">
          <h3 className="text-lg font-semibold text-gray-900 mb-4"><TranslatedText text="Income Statement Summary" /></h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-green-50 p-4 rounded-lg">
              <div className="text-sm text-green-600 font-medium">Total Revenue</div>
              <div className="text-2xl font-bold text-green-900">
                {formatCurrency(incomeStatementData.revenues.total || 0)}
              </div>
            </div>
            <div className="bg-red-50 p-4 rounded-lg">
              <div className="text-sm text-red-600 font-medium">Total Expenses</div>
              <div className="text-2xl font-bold text-red-900">
                {formatCurrency(incomeStatementData.expenses.total || 0)}
              </div>
            </div>
            <div className={`p-4 rounded-lg ${(incomeStatementData.net_income || 0) >= 0 ? 'bg-blue-50' : 'bg-red-50'}`}>
              <div className={`text-sm font-medium ${(incomeStatementData.net_income || 0) >= 0 ? 'text-blue-600' : 'text-red-600'}`}>
                Net Income
              </div>
              <div className={`text-2xl font-bold ${(incomeStatementData.net_income || 0) >= 0 ? 'text-blue-900' : 'text-red-900'}`}>
                {formatCurrency(Math.abs(incomeStatementData.net_income || 0))}
              </div>
            </div>
          </div>
        </div>

        {/* Revenue Section */}
        <div className="bg-white rounded-lg shadow-sm border">
          <div className="px-6 py-4 border-b bg-green-50">
            <h4 className="text-md font-semibold text-green-900">Revenue</h4>
          </div>
          <div className="p-6">
            {incomeStatementData.revenues.accounts && incomeStatementData.revenues.accounts.length > 0 ? (
              <div className="space-y-3">
                {incomeStatementData.revenues.accounts.map((revenue) => (
                  <div key={revenue.id} className="flex justify-between items-center py-2 border-b border-gray-100">
                    <div>
                      <div className="font-medium text-gray-900">{revenue.account_name}</div>
                      <div className="text-sm text-gray-500">{revenue.account_code}</div>
                    </div>
                    <div className="text-lg font-semibold text-green-600">
                      {formatCurrency(revenue.revenue_amount || 0)}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 text-center py-4">No revenue transactions in this period</p>
            )}
          </div>
        </div>

        {/* Expenses Section */}
        <div className="bg-white rounded-lg shadow-sm border">
          <div className="px-6 py-4 border-b bg-red-50">
            <h4 className="text-md font-semibold text-red-900">Expenses by Category</h4>
          </div>
          <div className="p-6">
            {incomeStatementData.expenses.by_category && Object.keys(incomeStatementData.expenses.by_category).length > 0 ? (
              Object.entries(incomeStatementData.expenses.by_category).map(([category, data]) => (
                <div key={category} className="mb-6">
                  <h5 className="font-medium text-gray-900 mb-3">{category}</h5>
                  <div className="space-y-2 ml-4">
                    {data.expenses && data.expenses.map((expense) => (
                      <div key={expense.id} className="flex justify-between items-center py-1">
                        <div>
                          <div className="text-sm font-medium text-gray-900">{expense.account_name}</div>
                          <div className="text-xs text-gray-500">{expense.account_code}</div>
                        </div>
                        <div className="text-sm font-semibold text-red-600">
                          {formatCurrency(expense.expense_amount || 0)}
                        </div>
                      </div>
                    ))}
                    <div className="flex justify-between items-center py-2 border-t border-gray-200 font-medium">
                      <span className="text-gray-700">Category Total</span>
                      <span className="text-red-700">{formatCurrency(data.total || 0)}</span>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-gray-500 text-center py-4">No expense transactions in this period</p>
            )}
          </div>
        </div>
      </div>
    );
  };

  const renderBalanceSheet = () => {
    // Comprehensive safety checks
    if (!balanceSheetData) {
      return (
        <div className="text-center py-8">
          <div className="text-yellow-600 mb-4">⚠️</div>
          <p className="text-yellow-600">No balance sheet data available. Please check if financial reports are properly configured.</p>
        </div>
      );
    }

    if (!balanceSheetData.assets || !balanceSheetData.liabilities || !balanceSheetData.equity) {
      return (
        <div className="text-center py-8">
          <div className="text-red-600 mb-4">❌</div>
          <p className="text-red-600">Invalid balance sheet data structure received from API.</p>
          <p className="text-sm text-gray-500 mt-2">Expected: assets, liabilities, and equity properties</p>
          <p className="text-sm text-gray-500">Received: {JSON.stringify(Object.keys(balanceSheetData))}</p>
        </div>
      );
    }

    return (
      <div className="space-y-6">
        <div className="bg-white rounded-lg p-6 shadow-sm border">
          <h3 className="text-lg font-semibold text-gray-900 mb-4"><TranslatedText text="Balance Sheet Summary" /></h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-blue-50 p-4 rounded-lg">
              <div className="text-sm text-blue-600 font-medium">Total Assets</div>
              <div className="text-2xl font-bold text-blue-900">
                {formatCurrency(balanceSheetData.assets.total || 0)}
              </div>
            </div>
            <div className="bg-red-50 p-4 rounded-lg">
              <div className="text-sm text-red-600 font-medium">Total Liabilities</div>
              <div className="text-2xl font-bold text-red-900">
                {formatCurrency(balanceSheetData.liabilities.total || 0)}
              </div>
            </div>
            <div className="bg-purple-50 p-4 rounded-lg">
              <div className="text-sm text-purple-600 font-medium">Total Equity</div>
              <div className="text-2xl font-bold text-purple-900">
                {formatCurrency(balanceSheetData.equity.total || 0)}
              </div>
            </div>
          </div>
        </div>

        {/* Assets Section */}
        <div className="bg-white rounded-lg shadow-sm border">
          <div className="px-6 py-4 border-b bg-blue-50">
            <h4 className="text-md font-semibold text-blue-900">Assets</h4>
          </div>
          <div className="p-6">
            {balanceSheetData.assets.accounts && balanceSheetData.assets.accounts.length > 0 ? (
              <div className="space-y-3">
                {balanceSheetData.assets.accounts.map((asset) => (
                  <div key={asset.id} className="flex justify-between items-center py-2 border-b border-gray-100">
                    <div>
                      <div className="font-medium text-gray-900">{asset.account_name}</div>
                      <div className="text-sm text-gray-500">{asset.account_code} • {asset.category_name}</div>
                    </div>
                    <div className="text-lg font-semibold text-blue-600">
                      {formatCurrency(asset.balance || 0)}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 text-center py-4">No asset accounts found</p>
            )}
          </div>
        </div>

        {/* Liabilities Section */}
        <div className="bg-white rounded-lg shadow-sm border">
          <div className="px-6 py-4 border-b bg-red-50">
            <h4 className="text-md font-semibold text-red-900">Liabilities</h4>
          </div>
          <div className="p-6">
            {balanceSheetData.liabilities.accounts && balanceSheetData.liabilities.accounts.length > 0 ? (
              <div className="space-y-3">
                {balanceSheetData.liabilities.accounts.map((liability) => (
                  <div key={liability.id} className="flex justify-between items-center py-2 border-b border-gray-100">
                    <div>
                      <div className="font-medium text-gray-900">{liability.account_name}</div>
                      <div className="text-sm text-gray-500">{liability.account_code} • {liability.category_name}</div>
                    </div>
                    <div className="text-lg font-semibold text-red-600">
                      {formatCurrency(liability.balance || 0)}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 text-center py-4">No liability accounts found</p>
            )}
          </div>
        </div>

        {/* Equity Section */}
        <div className="bg-white rounded-lg shadow-sm border">
          <div className="px-6 py-4 border-b bg-purple-50">
            <h4 className="text-md font-semibold text-purple-900">Equity</h4>
          </div>
          <div className="p-6">
            {balanceSheetData.equity.accounts && balanceSheetData.equity.accounts.length > 0 ? (
              <div className="space-y-3">
                {balanceSheetData.equity.accounts.map((equity) => (
                  <div key={equity.id} className="flex justify-between items-center py-2 border-b border-gray-100">
                    <div>
                      <div className="font-medium text-gray-900">{equity.account_name}</div>
                      <div className="text-sm text-gray-500">{equity.account_code} • {equity.category_name}</div>
                    </div>
                    <div className="text-lg font-semibold text-purple-600">
                      {formatCurrency(equity.balance || 0)}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 text-center py-4">No equity accounts found</p>
            )}
          </div>
        </div>
      </div>
    );
  };

  const renderCashFlow = () => {
    // Comprehensive safety checks
    if (!cashFlowData) {
      return (
        <div className="text-center py-8">
          <div className="text-yellow-600 mb-4">⚠️</div>
          <p className="text-yellow-600">No cash flow data available. Please check if financial reports are properly configured.</p>
        </div>
      );
    }

    if (!cashFlowData.operating_activities || !cashFlowData.investing_activities || !cashFlowData.financing_activities) {
      return (
        <div className="text-center py-8">
          <div className="text-red-600 mb-4">❌</div>
          <p className="text-red-600">Invalid cash flow data structure received from API.</p>
          <p className="text-sm text-gray-500 mt-2">Expected: operating_activities, investing_activities, and financing_activities properties</p>
          <p className="text-sm text-gray-500">Received: {JSON.stringify(Object.keys(cashFlowData))}</p>
        </div>
      );
    }

    return (
      <div className="space-y-6">
        <div className="bg-white rounded-lg p-6 shadow-sm border">
          <h3 className="text-lg font-semibold text-gray-900 mb-4"><TranslatedText text="Cash Flow Summary" /></h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-blue-50 p-4 rounded-lg">
              <div className="text-sm text-blue-600 font-medium">Net Cash Flow</div>
              <div className={`text-2xl font-bold ${(cashFlowData.net_cash_flow || 0) >= 0 ? 'text-green-900' : 'text-red-900'}`}>
                {formatCurrency(cashFlowData.net_cash_flow || 0)}
              </div>
            </div>
            <div className="bg-green-50 p-4 rounded-lg">
              <div className="text-sm text-green-600 font-medium">Period</div>
              <div className="text-lg font-semibold text-green-900">
                {cashFlowData.period && cashFlowData.period.start_date && cashFlowData.period.end_date ? 
                  `${new Date(cashFlowData.period.start_date).toLocaleDateString()} - ${new Date(cashFlowData.period.end_date).toLocaleDateString()}` :
                  'Period not specified'
                }
              </div>
            </div>
          </div>
        </div>

        {/* Operating Activities */}
        <div className="bg-white rounded-lg shadow-sm border">
          <div className="px-6 py-4 border-b bg-green-50">
            <h4 className="text-md font-semibold text-green-900">Operating Activities</h4>
          </div>
          <div className="p-6">
            <div className="flex justify-between items-center py-2 border-b border-gray-200">
              <span className="font-medium text-gray-900">Net Income</span>
              <span className={`font-semibold ${(cashFlowData.operating_activities.net_income || 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {formatCurrency(cashFlowData.operating_activities.net_income || 0)}
              </span>
            </div>
            <div className="text-sm text-gray-600 mt-2">
              Operating cash flow represents cash generated from core business operations
            </div>
          </div>
        </div>

        {/* Investing Activities */}
        <div className="bg-white rounded-lg shadow-sm border">
          <div className="px-6 py-4 border-b bg-blue-50">
            <h4 className="text-md font-semibold text-blue-900">Investing Activities</h4>
          </div>
          <div className="p-6">
            <div className="space-y-3">
              <div className="flex justify-between items-center py-2 border-b border-gray-100">
                <span className="text-gray-900">Asset Purchases</span>
                <span className="font-semibold text-red-600">
                  -{formatCurrency(cashFlowData.investing_activities.asset_purchases || 0)}
                </span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-gray-100">
                <span className="text-gray-900">Asset Sales</span>
                <span className="font-semibold text-green-600">
                  +{formatCurrency(cashFlowData.investing_activities.asset_sales || 0)}
                </span>
              </div>
              <div className="flex justify-between items-center py-2 border-t border-gray-200 font-medium">
                <span className="text-gray-700">Net Investing Cash Flow</span>
                <span className={`font-semibold ${(cashFlowData.investing_activities.net_cash_flow || 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {formatCurrency(cashFlowData.investing_activities.net_cash_flow || 0)}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Financing Activities */}
        <div className="bg-white rounded-lg shadow-sm border">
          <div className="px-6 py-4 border-b bg-purple-50">
            <h4 className="text-md font-semibold text-purple-900">Financing Activities</h4>
          </div>
          <div className="p-6">
            <div className="space-y-3">
              <div className="flex justify-between items-center py-2 border-b border-gray-100">
                <span className="text-gray-900">Financing In</span>
                <span className="font-semibold text-green-600">
                  +{formatCurrency(cashFlowData.financing_activities.financing_in || 0)}
                </span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-gray-100">
                <span className="text-gray-900">Financing Out</span>
                <span className="font-semibold text-red-600">
                  -{formatCurrency(cashFlowData.financing_activities.financing_out || 0)}
                </span>
              </div>
              <div className="flex justify-between items-center py-2 border-t border-gray-200 font-medium">
                <span className="text-gray-700">Net Financing Cash Flow</span>
                <span className={`font-semibold ${(cashFlowData.financing_activities.net_cash_flow || 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {formatCurrency(cashFlowData.financing_activities.net_cash_flow || 0)}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderDailySales = () => {
    if (!dailySalesData) {
      return (
        <div className="text-center py-8">
          <div className="text-yellow-600 mb-4">⚠️</div>
          <p className="text-yellow-600">No daily sales data available for the selected date.</p>
        </div>
      );
    }

    return (
      <div className="space-y-6">
        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <div className="bg-blue-50 p-4 rounded-lg">
            <div className="text-sm text-blue-600 font-medium">Total Orders</div>
            <div className="text-2xl font-bold text-blue-900">{dailySalesData.summary.total_orders}</div>
          </div>
          <div className="bg-green-50 p-4 rounded-lg">
            <div className="text-sm text-green-600 font-medium">Total Revenue</div>
            <div className="text-2xl font-bold text-green-900">{formatCurrency(dailySalesData.summary.total_revenue)}</div>
          </div>
          <div className="bg-purple-50 p-4 rounded-lg">
            <div className="text-sm text-purple-600 font-medium">Unique Customers</div>
            <div className="text-2xl font-bold text-purple-900">{dailySalesData.summary.total_customers}</div>
          </div>
        </div>

        {/* Payment Method Breakdown */}
        <div className="bg-white rounded-lg p-6 shadow-sm border">
          <h3 className="text-lg font-semibold text-gray-900 mb-4"><TranslatedText text="Payment Method Breakdown" /></h3>
          <div className="space-y-3">
            {dailySalesData.payment_method_breakdown.map((payment) => (
              <div key={payment.payment_method} className="flex justify-between items-center py-2 border-b border-gray-100">
                <div>
                  <div className="font-medium text-gray-900 capitalize">{payment.payment_method}</div>
                  <div className="text-sm text-gray-500">{payment.order_count} orders</div>
                </div>
                <div className="text-right">
                  <div className="font-semibold text-gray-900">{formatCurrency(payment.total_revenue)}</div>
                  <div className="text-sm text-gray-500">
                    {payment.amount_paid > 0 && `Paid: ${formatCurrency(payment.amount_paid)}`}
                    {payment.remaining_amount > 0 && ` | Remaining: ${formatCurrency(payment.remaining_amount)}`}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Sales by Shop and Payment */}
        <div className="bg-white rounded-lg p-6 shadow-sm border">
          <h3 className="text-lg font-semibold text-gray-900 mb-4"><TranslatedText text="Sales by Shop and Payment Method" /></h3>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Shop</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Payment Method</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Orders</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Revenue</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Avg Order Value</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Customers</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {dailySalesData.sales_by_shop_and_payment.map((sale, index) => (
                  <tr key={index}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {sale.shop_name || 'N/A'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 capitalize">
                      {sale.payment_method}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {sale.order_count}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-900">
                      {formatCurrency(sale.total_revenue)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {formatCurrency(sale.avg_order_value)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {sale.unique_customers}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  };

  const renderDailyExpenses = () => {
    if (!dailyExpensesData) {
      return (
        <div className="text-center py-8">
          <div className="text-yellow-600 mb-4">⚠️</div>
          <p className="text-yellow-600">No daily expense data available for the selected date.</p>
        </div>
      );
    }

    return (
      <div className="space-y-6">
        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <div className="bg-red-50 p-4 rounded-lg">
            <div className="text-sm text-red-600 font-medium">Total Expenses</div>
            <div className="text-2xl font-bold text-red-900">{dailyExpensesData.summary.total_expenses}</div>
          </div>
          <div className="bg-orange-50 p-4 rounded-lg">
            <div className="text-sm text-orange-600 font-medium">Total Amount</div>
            <div className="text-2xl font-bold text-orange-900">{formatCurrency(dailyExpensesData.summary.total_amount)}</div>
          </div>
          <div className="bg-purple-50 p-4 rounded-lg">
            <div className="text-sm text-purple-600 font-medium">Categories Used</div>
            <div className="text-2xl font-bold text-purple-900">{dailyExpensesData.summary.categories_used}</div>
          </div>
        </div>

        {/* Category Breakdown */}
        <div className="bg-white rounded-lg p-6 shadow-sm border">
          <h3 className="text-lg font-semibold text-gray-900 mb-4"><TranslatedText text="Expense Category Breakdown" /></h3>
          <div className="space-y-3">
            {dailyExpensesData.category_breakdown.map((category) => (
              <div key={category.category_id} className="flex justify-between items-center py-2 border-b border-gray-100">
                <div>
                  <div className="font-medium text-gray-900">{category.category_name}</div>
                  <div className="text-sm text-gray-500">{category.expense_count} expenses</div>
                </div>
                <div className="text-right">
                  <div className="font-semibold text-gray-900">{formatCurrency(category.total_amount)}</div>
                  <div className="text-sm text-gray-500">Avg: {formatCurrency(category.avg_amount)}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Top Expenses */}
        <div className="bg-white rounded-lg p-6 shadow-sm border">
          <h3 className="text-lg font-semibold text-gray-900 mb-4"><TranslatedText text="Top Expenses" /></h3>
          <div className="space-y-3">
            {dailyExpensesData.top_expenses.map((expense) => (
              <div key={expense.id} className="flex justify-between items-center py-2 border-b border-gray-100">
                <div>
                  <div className="font-medium text-gray-900">{expense.description}</div>
                  <div className="text-sm text-gray-500">
                    {expense.category_name} • {expense.shop_name || 'N/A'} • {expense.created_by_name}
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-semibold text-red-600">{formatCurrency(expense.amount)}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Expenses by Shop and Category */}
        <div className="bg-white rounded-lg p-6 shadow-sm border">
          <h3 className="text-lg font-semibold text-gray-900 mb-4"><TranslatedText text="Expenses by Shop and Category" /></h3>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Shop</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Category</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Count</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total Amount</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Avg Amount</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Range</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {dailyExpensesData.expenses_by_shop_and_category.map((expense, index) => (
                  <tr key={index}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {expense.shop_name || 'N/A'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {expense.expense_category || 'N/A'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {expense.expense_count}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-900">
                      {formatCurrency(expense.total_amount)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {formatCurrency(expense.avg_amount)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {formatCurrency(expense.min_amount)} - {formatCurrency(expense.max_amount)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  };

  const renderReportContent = () => {
    switch (selectedReport) {
      case 'trial-balance':
        return renderTrialBalance();
      case 'income-statement':
        return renderIncomeStatement();
      case 'balance-sheet':
        return renderBalanceSheet();
      case 'cash-flow':
        return renderCashFlow();
      case 'daily-sales':
        return renderDailySales();
      case 'daily-expenses':
        return renderDailyExpenses();
      default:
        return null;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg p-6 shadow-sm border">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">{getReportTitle()}</h2>
            <p className="text-gray-600 mt-1">Comprehensive financial reporting and analysis</p>
          </div>
          <div className="mt-4 sm:mt-0 flex space-x-2">
            <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:ring-2 focus:ring-blue-500">
              <Download className="h-4 w-4 inline mr-2" />
              Export
            </button>
            <button className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 focus:ring-2 focus:ring-gray-500">
              <RefreshCw className="h-4 w-4 inline mr-2" />
              Refresh
            </button>
          </div>
        </div>
      </div>

      {/* Report Selection */}
      <div className="bg-white rounded-lg p-6 shadow-sm border">
        <div className="flex flex-wrap gap-2">
          {[
            { key: 'trial-balance', label: 'Trial Balance', icon: FileText },
            { key: 'income-statement', label: 'Income Statement', icon: TrendingUp },
            { key: 'balance-sheet', label: 'Balance Sheet', icon: Building2 },
            { key: 'cash-flow', label: 'Cash Flow', icon: BarChart3 },
            { key: 'daily-sales', label: 'Daily Sales', icon: ShoppingCart },
            { key: 'daily-expenses', label: 'Daily Expenses', icon: Receipt }
          ].map((report) => {
            const Icon = report.icon;
            return (
              <button
                key={report.key}
                onClick={() => setSelectedReport(report.key)}
                className={`flex items-center space-x-2 px-4 py-2 rounded-lg font-medium transition-all duration-200 ${
                  selectedReport === report.key
                    ? 'bg-blue-600 text-white shadow-lg'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                }`}
              >
                <Icon className="h-4 w-4" />
                <span>{report.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Date Filters */}
      <div className="bg-white rounded-lg p-6 shadow-sm border">
        <h3 className="text-lg font-semibold text-gray-900 mb-4"><TranslatedText text="Report Parameters" /></h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {selectedReport === 'trial-balance' || selectedReport === 'balance-sheet' || selectedReport === 'daily-sales' || selectedReport === 'daily-expenses' ? (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">As of Date</label>
              <input
                type="date"
                value={dateRange.as_of_date}
                onChange={(e) => handleDateChange('as_of_date', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          ) : (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Start Date</label>
                <input
                  type="date"
                  value={dateRange.start_date}
                  onChange={(e) => handleDateChange('start_date', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">End Date</label>
                <input
                  type="date"
                  value={dateRange.end_date}
                  onChange={(e) => handleDateChange('end_date', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </>
          )}
          
          {selectedReport === 'trial-balance' && (
            <div className="flex items-center">
              <input
                type="checkbox"
                id="show-zero-balances"
                checked={showZeroBalances}
                onChange={(e) => setShowZeroBalances(e.target.checked)}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <label htmlFor="show-zero-balances" className="ml-2 text-sm text-gray-700">
                Show zero balances
              </label>
            </div>
          )}
        </div>
      </div>

      {/* Report Content */}
      {isLoading ? (
        <div className="bg-white rounded-lg p-12 shadow-sm border text-center">
          <RefreshCw className="h-8 w-8 text-gray-400 animate-spin mx-auto mb-4" />
          <p className="text-gray-500">Loading financial report...</p>
        </div>
      ) : hasErrors ? (
        <div className="bg-white rounded-lg p-12 shadow-sm border text-center">
          <div className="text-red-600 mb-4">❌</div>
          <p className="text-red-600">Error loading financial report. Please check the console for details.</p>
          <div className="text-xs text-gray-500 mt-2">
            {trialBalanceError && <div>Trial Balance Error: {trialBalanceError.message}</div>}
            {incomeStatementError && <div>Income Statement Error: {incomeStatementError.message}</div>}
            {balanceSheetError && <div>Balance Sheet Error: {balanceSheetError.message}</div>}
            {cashFlowError && <div>Cash Flow Error: {cashFlowError.message}</div>}
            {dailySalesError && <div>Daily Sales Error: {dailySalesError.message}</div>}
            {dailyExpensesError && <div>Daily Expenses Error: {dailyExpensesError.message}</div>}
          </div>
        </div>
      ) : (
        renderReportContent()
      )}
    </div>
  );
};

export default FinancialReports;
