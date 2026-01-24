import React, { useState, useEffect } from 'react';
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
  Printer,
  Share2,
  Filter,
  Settings,
  AlertCircle,
  CheckCircle,
  Info,
  Calculator,
  PieChart,
  LineChart,
  Activity,
  ShoppingCart,
  Receipt
} from 'lucide-react';
import { financialReportsAPI } from '../lib/api';
import { useAuth } from '../contexts/AuthContext';
import LoadingSpinner from './LoadingSpinner';
import SkeletonLoader from './SkeletonLoader';
import ErrorBoundary from './ErrorBoundary';
import TranslatedText from './TranslatedText';

const ProfessionalFinancialReports = () => {
  const [selectedReport, setSelectedReport] = useState('summary');
  const [dateRange, setDateRange] = useState({
    start_date: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0],
    end_date: new Date().toISOString().split('T')[0],
    as_of_date: new Date().toISOString().split('T')[0],
    year: new Date().getFullYear(),
    month: new Date().getMonth() + 1 // JavaScript months are 0-based, so add 1
  });
  const [showZeroBalances, setShowZeroBalances] = useState(false);
  const [reportFormat, setReportFormat] = useState('detailed'); // detailed, summary, executive
  const [exportFormat, setExportFormat] = useState('pdf'); // pdf, excel, csv
  const [showCharts, setShowCharts] = useState(true);
  const [period, setPeriod] = useState('monthly');

  const { user, loading: authLoading } = useAuth();

  // Debug: Log user authentication status
  console.log('User:', user);
  console.log('Auth Loading:', authLoading);
  console.log('Selected Report:', selectedReport);

  // Don't render anything until auth is loaded
  if (authLoading) {
    return (
      <div className="space-y-6">
        <SkeletonLoader type="chart" count={1} />
      </div>
    );
  }

  // Fetch financial summary for dashboard
  const { data: summaryData, isLoading: summaryLoading, error: summaryError } = useQuery({
    queryKey: ['financial-summary', period],
    queryFn: () => financialReportsAPI.getSummary({ period }),
    enabled: selectedReport === 'summary' && !!user,
    retry: 1,
    onError: (error) => {
      console.log('Financial summary API not available yet:', error);
    }
  });

  // Fetch trial balance
  const { data: trialBalanceData, isLoading: trialBalanceLoading, error: trialBalanceError } = useQuery({
    queryKey: ['trial-balance', dateRange.as_of_date, showZeroBalances],
    queryFn: () => financialReportsAPI.getTrialBalance({
      as_of_date: dateRange.as_of_date,
      include_zero_balances: showZeroBalances
    }),
    enabled: selectedReport === 'trial-balance' && !!user,
    retry: 1,
    onSuccess: (data) => {
      console.log('Trial Balance API Success:', data);
    },
    onError: (error) => {
      console.log('Trial Balance API Error:', error);
    }
  });

  // Debug: Log query status
  console.log('Trial Balance Query Enabled:', selectedReport === 'trial-balance' && !!user);
  console.log('Trial Balance Loading:', trialBalanceLoading);
  console.log('Trial Balance Error:', trialBalanceError);
  console.log('Trial Balance Data:', trialBalanceData);

  // Fetch income statement
  const { data: incomeStatementData, isLoading: incomeStatementLoading, error: incomeStatementError } = useQuery({
    queryKey: ['income-statement', dateRange.start_date, dateRange.end_date],
    queryFn: () => financialReportsAPI.getIncomeStatement({
      start_date: dateRange.start_date,
      end_date: dateRange.end_date
    }),
    enabled: selectedReport === 'income-statement' && !!user,
    retry: 1
  });

  // Fetch balance sheet
  const { data: balanceSheetData, isLoading: balanceSheetLoading, error: balanceSheetError } = useQuery({
    queryKey: ['balance-sheet', dateRange.as_of_date],
    queryFn: () => financialReportsAPI.getBalanceSheet({
      as_of_date: dateRange.as_of_date
    }),
    enabled: selectedReport === 'balance-sheet' && !!user,
    retry: 1
  });

  // Fetch cash flow statement
  const { data: cashFlowData, isLoading: cashFlowLoading, error: cashFlowError } = useQuery({
    queryKey: ['cash-flow', dateRange.start_date, dateRange.end_date],
    queryFn: () => financialReportsAPI.getCashFlow({
      start_date: dateRange.start_date,
      end_date: dateRange.end_date
    }),
    enabled: selectedReport === 'cash-flow' && !!user,
    retry: 1
  });

  const { data: dailySalesData, isLoading: dailySalesLoading, error: dailySalesError } = useQuery({
    queryKey: ['daily-sales', dateRange.as_of_date],
    queryFn: async () => {
      const response = await financialReportsAPI.getDailySales({
        date: dateRange.as_of_date
      });
      return response.data; // Extract the actual data from the response
    },
    enabled: selectedReport === 'daily-sales' && !!user,
    retry: 1,
    onSuccess: (data) => {
      console.log('Daily Sales API Success:', data);
    },
    onError: (error) => {
      console.log('Daily Sales API Error:', error);
    }
  });

  const { data: dailyExpensesData, isLoading: dailyExpensesLoading, error: dailyExpensesError } = useQuery({
    queryKey: ['daily-expenses', dateRange.as_of_date],
    queryFn: async () => {
      const response = await financialReportsAPI.getDailyExpenses({
        date: dateRange.as_of_date
      });
      return response.data; // Extract the actual data from the response
    },
    enabled: selectedReport === 'daily-expenses' && !!user,
    retry: 1,
    onSuccess: (data) => {
      console.log('Daily Expenses API Success:', data);
    },
    onError: (error) => {
      console.log('Daily Expenses API Error:', error);
    }
  });

  // Monthly Reports
  const { data: monthlySalesData, isLoading: monthlySalesLoading, error: monthlySalesError } = useQuery({
    queryKey: ['monthly-sales', dateRange.year, dateRange.month],
    queryFn: async () => {
      const response = await financialReportsAPI.getMonthlySales({
        year: dateRange.year,
        month: dateRange.month
      });
      return response.data;
    },
    enabled: selectedReport === 'monthly-sales' && !!user,
    retry: 1,
    onSuccess: (data) => {
      console.log('Monthly Sales API Success:', data);
    },
    onError: (error) => {
      console.log('Monthly Sales API Error:', error);
    }
  });

  const { data: monthlyExpensesData, isLoading: monthlyExpensesLoading, error: monthlyExpensesError } = useQuery({
    queryKey: ['monthly-expenses', dateRange.year, dateRange.month],
    queryFn: async () => {
      const response = await financialReportsAPI.getMonthlyExpenses({
        year: dateRange.year,
        month: dateRange.month
      });
      return response.data;
    },
    enabled: selectedReport === 'monthly-expenses' && !!user,
    retry: 1,
    onSuccess: (data) => {
      console.log('Monthly Expenses API Success:', data);
    },
    onError: (error) => {
      console.log('Monthly Expenses API Error:', error);
    }
  });

  // Yearly Reports
  const { data: yearlySalesData, isLoading: yearlySalesLoading, error: yearlySalesError } = useQuery({
    queryKey: ['yearly-sales', dateRange.year],
    queryFn: async () => {
      const response = await financialReportsAPI.getYearlySales({
        year: dateRange.year
      });
      return response.data;
    },
    enabled: selectedReport === 'yearly-sales' && !!user,
    retry: 1,
    onSuccess: (data) => {
      console.log('Yearly Sales API Success:', data);
    },
    onError: (error) => {
      console.log('Yearly Sales API Error:', error);
    }
  });

  const { data: yearlyExpensesData, isLoading: yearlyExpensesLoading, error: yearlyExpensesError } = useQuery({
    queryKey: ['yearly-expenses', dateRange.year],
    queryFn: async () => {
      const response = await financialReportsAPI.getYearlyExpenses({
        year: dateRange.year
      });
      return response.data;
    },
    enabled: selectedReport === 'yearly-expenses' && !!user,
    retry: 1,
    onSuccess: (data) => {
      console.log('Yearly Expenses API Success:', data);
    },
    onError: (error) => {
      console.log('Yearly Expenses API Error:', error);
    }
  });

  const isLoading = summaryLoading || trialBalanceLoading || incomeStatementLoading || balanceSheetLoading || cashFlowLoading || dailySalesLoading || dailyExpensesLoading || monthlySalesLoading || monthlyExpensesLoading || yearlySalesLoading || yearlyExpensesLoading;
  const hasErrors = summaryError || trialBalanceError || incomeStatementError || balanceSheetError || cashFlowError || dailySalesError || dailyExpensesError || monthlySalesError || monthlyExpensesError || yearlySalesError || yearlyExpensesError;

  const handleDateChange = (field, value) => {
    setDateRange(prev => ({ ...prev, [field]: value }));
  };

  const formatCurrency = (amount, currency = 'CFA') => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency
    }).format(amount || 0);
  };

  const getReportTitle = () => {
    switch (selectedReport) {
      case 'summary': return 'Financial Dashboard';
      case 'trial-balance': return 'Trial Balance';
      case 'income-statement': return 'Income Statement (Profit & Loss)';
      case 'balance-sheet': return 'Balance Sheet';
      case 'cash-flow': return 'Cash Flow Statement';
      case 'daily-sales': return 'Daily Sales Report';
      case 'daily-expenses': return 'Daily Expenses Report';
      case 'monthly-sales': return 'Monthly Sales Report';
      case 'monthly-expenses': return 'Monthly Expenses Report';
      case 'yearly-sales': return 'Yearly Sales Report';
      case 'yearly-expenses': return 'Yearly Expenses Report';
      default: return 'Financial Reports';
    }
  };

  const getReportIcon = () => {
    switch (selectedReport) {
      case 'summary': return Activity;
      case 'trial-balance': return Calculator;
      case 'income-statement': return TrendingUp;
      case 'balance-sheet': return Building2;
      case 'cash-flow': return BarChart3;
      default: return FileText;
    }
  };

  const handleExport = () => {
    // Implementation for export functionality
    console.log('Exporting report:', { selectedReport, exportFormat, dateRange });
  };

  const handlePrint = () => {
    window.print();
  };

  const renderReportContent = () => {
    switch (selectedReport) {
      case 'summary':
        return renderFinancialSummary();
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
      case 'monthly-sales':
        return renderMonthlySales();
      case 'monthly-expenses':
        return renderMonthlyExpenses();
      case 'yearly-sales':
        return renderYearlySales();
      case 'yearly-expenses':
        return renderYearlyExpenses();
      default:
        return renderFinancialSummary();
    }
  };

  const renderFinancialSummary = () => {
    if (summaryError) {
      return (
        <div className="text-center py-8">
          <div className="text-blue-600 mb-4">📊</div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2"><TranslatedText text="Financial Dashboard" /></h3>
          <p className="text-gray-600 mb-4">Professional financial reporting is being set up.</p>
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 max-w-md mx-auto">
            <p className="text-sm text-blue-700">
              The financial reports API is being configured. This will provide comprehensive financial analysis including:
            </p>
            <ul className="text-sm text-blue-700 mt-2 text-left">
              <li>• Trial Balance verification</li>
              <li>• Income Statement analysis</li>
              <li>• Balance Sheet reporting</li>
              <li>• Cash Flow statements</li>
              <li>• Financial health indicators</li>
            </ul>
          </div>
        </div>
      );
    }

    if (!summaryData || !summaryData.income_statement) {
      return (
        <div className="text-center py-8">
          <div className="text-yellow-600 mb-4">⚠️</div>
          <p className="text-yellow-600">No financial summary data available.</p>
        </div>
      );
    }

    return (
      <div className="space-y-6">
        {/* Key Metrics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-green-100 rounded-xl">
                <TrendingUp className="h-6 w-6 text-green-600" />
              </div>
              <div className={`text-sm font-medium ${
                (summaryData.income_statement?.net_income || 0) >= 0 ? 'text-green-600' : 'text-red-600'
              }`}>
                {(summaryData.income_statement?.net_income || 0) >= 0 ? 'Profit' : 'Loss'}
              </div>
            </div>
            <h3 className="text-sm font-medium text-gray-600 mb-1"><TranslatedText text="Net Income" /></h3>
            <p className={`text-2xl font-bold ${
              (summaryData.income_statement?.net_income || 0) >= 0 ? 'text-green-900' : 'text-red-900'
            }`}>
              {formatCurrency(summaryData.income_statement?.net_income || 0)}
            </p>
            <p className="text-xs text-gray-500 mt-2">
              Margin: {(summaryData.income_statement?.profit_margin || 0).toFixed(1)}%
            </p>
          </div>

          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-blue-100 rounded-xl">
                <Building2 className="h-6 w-6 text-blue-600" />
              </div>
              <div className={`text-sm font-medium ${
                summaryData.balance_sheet?.is_balanced ? 'text-green-600' : 'text-red-600'
              }`}>
                {summaryData.balance_sheet?.is_balanced ? 'Balanced' : 'Unbalanced'}
              </div>
            </div>
            <h3 className="text-sm font-medium text-gray-600 mb-1"><TranslatedText text="Total Assets" /></h3>
            <p className="text-2xl font-bold text-blue-900">
              {formatCurrency(summaryData.balance_sheet?.total_assets || 0)}
            </p>
            <p className="text-xs text-gray-500 mt-2">
              Equity: {formatCurrency(summaryData.balance_sheet?.total_equity || 0)}
            </p>
          </div>

          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-purple-100 rounded-xl">
                <BarChart3 className="h-6 w-6 text-purple-600" />
              </div>
              <div className={`text-sm font-medium ${
                (summaryData.cash_flow?.net_cash_flow || 0) >= 0 ? 'text-green-600' : 'text-red-600'
              }`}>
                {(summaryData.cash_flow?.net_cash_flow || 0) >= 0 ? 'Positive' : 'Negative'}
              </div>
            </div>
            <h3 className="text-sm font-medium text-gray-600 mb-1"><TranslatedText text="Cash Flow" /></h3>
            <p className={`text-2xl font-bold ${
              (summaryData.cash_flow?.net_cash_flow || 0) >= 0 ? 'text-green-900' : 'text-red-900'
            }`}>
              {formatCurrency(summaryData.cash_flow?.net_cash_flow || 0)}
            </p>
            <p className="text-xs text-gray-500 mt-2">
              Operating: {formatCurrency(summaryData.cash_flow?.operating_cash_flow || 0)}
            </p>
          </div>

          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-orange-100 rounded-xl">
                <Calculator className="h-6 w-6 text-orange-600" />
              </div>
              <div className={`text-sm font-medium ${
                summaryData.trial_balance?.is_balanced ? 'text-green-600' : 'text-red-600'
              }`}>
                {summaryData.trial_balance?.is_balanced ? 'Balanced' : 'Unbalanced'}
              </div>
            </div>
            <h3 className="text-sm font-medium text-gray-600 mb-1"><TranslatedText text="Trial Balance" /></h3>
            <p className="text-2xl font-bold text-orange-900">
              {formatCurrency(summaryData.trial_balance?.total_debits || 0)}
            </p>
            <p className="text-xs text-gray-500 mt-2">
              Credits: {formatCurrency(summaryData.trial_balance?.total_credits || 0)}
            </p>
          </div>
        </div>

        {/* Financial Health Indicators */}
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
          <h3 className="text-lg font-semibold text-gray-900 mb-4"><TranslatedText text="Financial Health Indicators" /></h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center">
              <div className="text-3xl font-bold text-blue-600 mb-2">
                {(summaryData.income_statement?.profit_margin || 0).toFixed(1)}%
              </div>
              <div className="text-sm text-gray-600">Profit Margin</div>
              <div className="text-xs text-gray-500 mt-1">
                {(summaryData.income_statement?.profit_margin || 0) > 10 ? 'Excellent' : 
                 (summaryData.income_statement?.profit_margin || 0) > 5 ? 'Good' : 'Needs Improvement'}
              </div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-green-600 mb-2">
                {(summaryData.balance_sheet?.total_assets || 0) > 0 ? 
                  (((summaryData.balance_sheet?.total_equity || 0) / (summaryData.balance_sheet?.total_assets || 1)) * 100).toFixed(1) : 0}%
              </div>
              <div className="text-sm text-gray-600">Equity Ratio</div>
              <div className="text-xs text-gray-500 mt-1">
                {(summaryData.balance_sheet?.total_assets || 0) > 0 && 
                 ((summaryData.balance_sheet?.total_equity || 0) / (summaryData.balance_sheet?.total_assets || 1)) > 0.3 ? 'Strong' : 'Weak'}
              </div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-purple-600 mb-2">
                {(summaryData.cash_flow?.net_cash_flow || 0) >= 0 ? '✓' : '✗'}
              </div>
              <div className="text-sm text-gray-600">Cash Flow</div>
              <div className="text-xs text-gray-500 mt-1">
                {(summaryData.cash_flow?.net_cash_flow || 0) >= 0 ? 'Positive' : 'Negative'}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderTrialBalance = () => {
    if (trialBalanceLoading) {
      return (
        <div className="text-center py-8">
          <div className="text-blue-600 mb-4">🔄</div>
          <p className="text-blue-600">Loading trial balance data...</p>
        </div>
      );
    }

    if (trialBalanceError) {
      return (
        <div className="text-center py-8">
          <div className="text-red-600 mb-4">❌</div>
          <p className="text-red-600">Error loading trial balance: {trialBalanceError.message}</p>
        </div>
      );
    }

    if (!trialBalanceData) {
      return (
        <div className="text-center py-8">
          <div className="text-yellow-600 mb-4">⚠️</div>
          <p className="text-yellow-600">No trial balance data available.</p>
        </div>
      );
    }

    // Debug: Log the data structure
    console.log('Trial Balance Data:', trialBalanceData);
    console.log('Trial Balance Totals:', trialBalanceData.totals);

    return (
      <div className="space-y-6">
        {/* Trial Balance Summary */}
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
          <h3 className="text-lg font-semibold text-gray-900 mb-4"><TranslatedText text="Trial Balance Summary" /></h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-blue-50 p-4 rounded-lg">
              <div className="text-sm text-blue-600 font-medium">Total Debits</div>
              <div className="text-2xl font-bold text-blue-900">
                {formatCurrency(trialBalanceData.totals?.total_debits || 0)}
              </div>
            </div>
            <div className="bg-green-50 p-4 rounded-lg">
              <div className="text-sm text-green-600 font-medium">Total Credits</div>
              <div className="text-2xl font-bold text-green-900">
                {formatCurrency(trialBalanceData.totals?.total_credits || 0)}
              </div>
            </div>
            <div className={`p-4 rounded-lg ${
              trialBalanceData.is_balanced ? 'bg-green-50' : 'bg-red-50'
            }`}>
              <div className={`text-sm font-medium ${
                trialBalanceData.is_balanced ? 'text-green-600' : 'text-red-600'
              }`}>
                Balance Status
              </div>
              <div className={`text-2xl font-bold ${
                trialBalanceData.is_balanced ? 'text-green-900' : 'text-red-900'
              }`}>
                {trialBalanceData.is_balanced ? 'Balanced' : 'Unbalanced'}
              </div>
            </div>
          </div>
        </div>

        {/* Account Balances Table */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
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
                        {formatCurrency(account.total_debits)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-900">
                        {formatCurrency(account.total_credits)}
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
                <p className="text-gray-500">No account balances found</p>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  const ReportIcon = getReportIcon();

  const renderIncomeStatement = () => {
    if (incomeStatementLoading) {
      return (
        <div className="text-center py-8">
          <div className="text-blue-600 mb-4">🔄</div>
          <p className="text-blue-600">Loading income statement data...</p>
        </div>
      );
    }

    if (incomeStatementError) {
      return (
        <div className="text-center py-8">
          <div className="text-red-600 mb-4">❌</div>
          <p className="text-red-600">Error loading income statement: {incomeStatementError.message}</p>
        </div>
      );
    }

    if (!incomeStatementData) {
      return (
        <div className="text-center py-8">
          <div className="text-yellow-600 mb-4">⚠️</div>
          <p className="text-yellow-600">No income statement data available.</p>
        </div>
      );
    }

    return (
      <div className="space-y-6">
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
          <h3 className="text-lg font-semibold text-gray-900 mb-4"><TranslatedText text="Income Statement" /></h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-green-50 p-4 rounded-lg">
              <div className="text-sm text-green-600 font-medium">Total Revenue</div>
              <div className="text-2xl font-bold text-green-900">
                {formatCurrency(incomeStatementData.revenues?.total || 0)}
              </div>
            </div>
            <div className="bg-red-50 p-4 rounded-lg">
              <div className="text-sm text-red-600 font-medium">Total Expenses</div>
              <div className="text-2xl font-bold text-red-900">
                {formatCurrency(incomeStatementData.expenses?.total || 0)}
              </div>
            </div>
            <div className={`p-4 rounded-lg ${
              (incomeStatementData.net_income || 0) >= 0 ? 'bg-green-50' : 'bg-red-50'
            }`}>
              <div className={`text-sm font-medium ${
                (incomeStatementData.net_income || 0) >= 0 ? 'text-green-600' : 'text-red-600'
              }`}>
                Net Income
              </div>
              <div className={`text-2xl font-bold ${
                (incomeStatementData.net_income || 0) >= 0 ? 'text-green-900' : 'text-red-900'
              }`}>
                {formatCurrency(incomeStatementData.net_income || 0)}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderBalanceSheet = () => {
    if (balanceSheetLoading) {
      return (
        <div className="text-center py-8">
          <div className="text-blue-600 mb-4">🔄</div>
          <p className="text-blue-600">Loading balance sheet data...</p>
        </div>
      );
    }

    if (balanceSheetError) {
      return (
        <div className="text-center py-8">
          <div className="text-red-600 mb-4">❌</div>
          <p className="text-red-600">Error loading balance sheet: {balanceSheetError.message}</p>
        </div>
      );
    }

    if (!balanceSheetData) {
      return (
        <div className="text-center py-8">
          <div className="text-yellow-600 mb-4">⚠️</div>
          <p className="text-yellow-600">No balance sheet data available.</p>
        </div>
      );
    }

    return (
      <div className="space-y-6">
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
          <h3 className="text-lg font-semibold text-gray-900 mb-4"><TranslatedText text="Balance Sheet" /></h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-blue-50 p-4 rounded-lg">
              <div className="text-sm text-blue-600 font-medium">Total Assets</div>
              <div className="text-2xl font-bold text-blue-900">
                {formatCurrency(balanceSheetData.assets?.total || 0)}
              </div>
            </div>
            <div className="bg-red-50 p-4 rounded-lg">
              <div className="text-sm text-red-600 font-medium">Total Liabilities</div>
              <div className="text-2xl font-bold text-red-900">
                {formatCurrency(balanceSheetData.liabilities?.total || 0)}
              </div>
            </div>
            <div className="bg-purple-50 p-4 rounded-lg">
              <div className="text-sm text-purple-600 font-medium">Total Equity</div>
              <div className="text-2xl font-bold text-purple-900">
                {formatCurrency(balanceSheetData.equity?.total || 0)}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderCashFlow = () => {
    if (cashFlowLoading) {
      return (
        <div className="text-center py-8">
          <div className="text-blue-600 mb-4">🔄</div>
          <p className="text-blue-600">Loading cash flow data...</p>
        </div>
      );
    }

    if (cashFlowError) {
      return (
        <div className="text-center py-8">
          <div className="text-red-600 mb-4">❌</div>
          <p className="text-red-600">Error loading cash flow: {cashFlowError.message}</p>
        </div>
      );
    }

    if (!cashFlowData) {
      return (
        <div className="text-center py-8">
          <div className="text-yellow-600 mb-4">⚠️</div>
          <p className="text-yellow-600">No cash flow data available.</p>
        </div>
      );
    }

    return (
      <div className="space-y-6">
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
          <h3 className="text-lg font-semibold text-gray-900 mb-4"><TranslatedText text="Cash Flow Statement" /></h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-green-50 p-4 rounded-lg">
              <div className="text-sm text-green-600 font-medium">Operating Cash Flow</div>
              <div className="text-2xl font-bold text-green-900">
                {formatCurrency(cashFlowData.operating_cash_flow || 0)}
              </div>
            </div>
            <div className="bg-blue-50 p-4 rounded-lg">
              <div className="text-sm text-blue-600 font-medium">Investing Cash Flow</div>
              <div className="text-2xl font-bold text-blue-900">
                {formatCurrency(cashFlowData.investing_cash_flow || 0)}
              </div>
            </div>
            <div className={`p-4 rounded-lg ${
              (cashFlowData.net_cash_flow || 0) >= 0 ? 'bg-green-50' : 'bg-red-50'
            }`}>
              <div className={`text-sm font-medium ${
                (cashFlowData.net_cash_flow || 0) >= 0 ? 'text-green-600' : 'text-red-600'
              }`}>
                Net Cash Flow
              </div>
              <div className={`text-2xl font-bold ${
                (cashFlowData.net_cash_flow || 0) >= 0 ? 'text-green-900' : 'text-red-900'
              }`}>
                {formatCurrency(cashFlowData.net_cash_flow || 0)}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderDailySales = () => {
    if (dailySalesLoading) {
      return (
        <div className="text-center py-8">
          <div className="text-blue-600 mb-4">🔄</div>
          <p className="text-blue-600">Loading daily sales data...</p>
        </div>
      );
    }

    if (dailySalesError) {
      return (
        <div className="text-center py-8">
          <div className="text-red-600 mb-4">❌</div>
          <p className="text-red-600">Error loading daily sales: {dailySalesError.message}</p>
        </div>
      );
    }

    if (!dailySalesData || !dailySalesData.summary) {
      return (
        <div className="text-center py-8">
          <div className="text-yellow-600 mb-4">⚠️</div>
          <p className="text-yellow-600">No daily sales data available for the selected date.</p>
          <p className="text-sm text-gray-500 mt-2">Debug: {JSON.stringify(dailySalesData)}</p>
        </div>
      );
    }

    return (
      <div className="space-y-6">
        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <div className="bg-blue-50 p-4 rounded-lg">
            <div className="text-sm text-blue-600 font-medium">Total Orders</div>
            <div className="text-2xl font-bold text-blue-900">{dailySalesData.summary?.total_orders || 0}</div>
          </div>
          <div className="bg-green-50 p-4 rounded-lg">
            <div className="text-sm text-green-600 font-medium">Total Revenue</div>
            <div className="text-2xl font-bold text-green-900">{formatCurrency(dailySalesData.summary?.total_revenue || 0)}</div>
          </div>
          <div className="bg-purple-50 p-4 rounded-lg">
            <div className="text-sm text-purple-600 font-medium">Unique Customers</div>
            <div className="text-2xl font-bold text-purple-900">{dailySalesData.summary?.total_customers || 0}</div>
          </div>
        </div>

        {/* Payment Method Breakdown */}
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
          <h3 className="text-lg font-semibold text-gray-900 mb-4"><TranslatedText text="Payment Method Breakdown" /></h3>
          <div className="space-y-3">
            {(dailySalesData.payment_method_breakdown || []).map((payment) => (
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
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
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
                {(dailySalesData.sales_by_shop_and_payment || []).map((sale, index) => (
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
    if (dailyExpensesLoading) {
      return (
        <div className="text-center py-8">
          <div className="text-blue-600 mb-4">🔄</div>
          <p className="text-blue-600">Loading daily expense data...</p>
        </div>
      );
    }

    if (dailyExpensesError) {
      return (
        <div className="text-center py-8">
          <div className="text-red-600 mb-4">❌</div>
          <p className="text-red-600">Error loading daily expenses: {dailyExpensesError.message}</p>
        </div>
      );
    }

    if (!dailyExpensesData || !dailyExpensesData.summary) {
      return (
        <div className="text-center py-8">
          <div className="text-yellow-600 mb-4">⚠️</div>
          <p className="text-yellow-600">No daily expense data available for the selected date.</p>
          <p className="text-sm text-gray-500 mt-2">Debug: {JSON.stringify(dailyExpensesData)}</p>
        </div>
      );
    }

    return (
      <div className="space-y-6">
        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <div className="bg-red-50 p-4 rounded-lg">
            <div className="text-sm text-red-600 font-medium">Total Expenses</div>
            <div className="text-2xl font-bold text-red-900">{dailyExpensesData.summary?.total_expenses || 0}</div>
          </div>
          <div className="bg-orange-50 p-4 rounded-lg">
            <div className="text-sm text-orange-600 font-medium">Total Amount</div>
            <div className="text-2xl font-bold text-orange-900">{formatCurrency(dailyExpensesData.summary?.total_amount || 0)}</div>
          </div>
          <div className="bg-purple-50 p-4 rounded-lg">
            <div className="text-sm text-purple-600 font-medium">Categories Used</div>
            <div className="text-2xl font-bold text-purple-900">{dailyExpensesData.summary?.categories_used || 0}</div>
          </div>
        </div>

        {/* Category Breakdown */}
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
          <h3 className="text-lg font-semibold text-gray-900 mb-4"><TranslatedText text="Expense Category Breakdown" /></h3>
          <div className="space-y-3">
            {(dailyExpensesData.category_breakdown || []).map((category) => (
              <div key={category.category_name} className="flex justify-between items-center py-2 border-b border-gray-100">
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
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
          <h3 className="text-lg font-semibold text-gray-900 mb-4"><TranslatedText text="Top Expenses" /></h3>
          <div className="space-y-3">
            {(dailyExpensesData.top_expenses || []).map((expense) => (
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
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
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
                {(dailyExpensesData.expenses_by_shop_and_category || []).map((expense, index) => (
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

  const renderMonthlySales = () => {
    if (monthlySalesLoading) {
      return (
        <div className="text-center py-8">
          <div className="text-blue-600 mb-4">🔄</div>
          <p className="text-blue-600">Loading monthly sales data...</p>
        </div>
      );
    }

    if (monthlySalesError) {
      return (
        <div className="text-center py-8">
          <div className="text-red-600 mb-4">❌</div>
          <p className="text-red-600">Error loading monthly sales: {monthlySalesError.message}</p>
        </div>
      );
    }

    if (!monthlySalesData || !monthlySalesData.summary) {
      return (
        <div className="text-center py-8">
          <div className="text-yellow-600 mb-4">⚠️</div>
          <p className="text-yellow-600">No monthly sales data available for the selected period.</p>
        </div>
      );
    }

    return (
      <div className="space-y-6">
        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-blue-50 p-4 rounded-lg">
            <div className="text-sm text-blue-600 font-medium">Total Orders</div>
            <div className="text-2xl font-bold text-blue-900">{monthlySalesData.summary?.total_orders || 0}</div>
          </div>
          <div className="bg-green-50 p-4 rounded-lg">
            <div className="text-sm text-green-600 font-medium">Total Revenue</div>
            <div className="text-2xl font-bold text-green-900">{formatCurrency(monthlySalesData.summary?.total_revenue || 0)}</div>
          </div>
          <div className="bg-purple-50 p-4 rounded-lg">
            <div className="text-sm text-purple-600 font-medium">Unique Customers</div>
            <div className="text-2xl font-bold text-purple-900">{monthlySalesData.summary?.total_customers || 0}</div>
          </div>
          <div className="bg-orange-50 p-4 rounded-lg">
            <div className="text-sm text-orange-600 font-medium">Shops with Sales</div>
            <div className="text-2xl font-bold text-orange-900">{monthlySalesData.summary?.shops_with_sales || 0}</div>
          </div>
        </div>

        {/* Payment Method Breakdown */}
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
          <h3 className="text-lg font-semibold text-gray-900 mb-4"><TranslatedText text="Payment Method Breakdown" /></h3>
          <div className="space-y-3">
            {(monthlySalesData.payment_method_breakdown || []).map((payment) => (
              <div key={payment.payment_method} className="flex justify-between items-center py-2 border-b border-gray-100">
                <div>
                  <div className="font-medium text-gray-900">{payment.payment_method || 'Unknown'}</div>
                  <div className="text-sm text-gray-500">{payment.order_count} orders</div>
                </div>
                <div className="text-right">
                  <div className="font-semibold text-gray-900">{formatCurrency(payment.total_revenue)}</div>
                  <div className="text-sm text-gray-500">Paid: {formatCurrency(payment.amount_paid)}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Daily Breakdown */}
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
          <h3 className="text-lg font-semibold text-gray-900 mb-4"><TranslatedText text="Daily Breakdown for {monthlySalesData.period}" /></h3>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Orders</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Revenue</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Customers</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {(monthlySalesData.daily_breakdown || []).map((day, index) => (
                  <tr key={index}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{day.date}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{day.daily_orders}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{formatCurrency(day.daily_revenue)}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{day.daily_customers}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Sales by Shop and Payment */}
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
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
                {(monthlySalesData.sales_by_shop_and_payment || []).map((sale, index) => (
                  <tr key={index}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{sale.shop_name}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{sale.payment_method || 'Unknown'}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{sale.order_count}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{formatCurrency(sale.total_revenue)}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{formatCurrency(sale.avg_order_value)}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{sale.unique_customers}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  };

  const renderMonthlyExpenses = () => {
    if (monthlyExpensesLoading) {
      return (
        <div className="text-center py-8">
          <div className="text-blue-600 mb-4">🔄</div>
          <p className="text-blue-600">Loading monthly expense data...</p>
        </div>
      );
    }

    if (monthlyExpensesError) {
      return (
        <div className="text-center py-8">
          <div className="text-red-600 mb-4">❌</div>
          <p className="text-red-600">Error loading monthly expenses: {monthlyExpensesError.message}</p>
        </div>
      );
    }

    if (!monthlyExpensesData || !monthlyExpensesData.summary) {
      return (
        <div className="text-center py-8">
          <div className="text-yellow-600 mb-4">⚠️</div>
          <p className="text-yellow-600">No monthly expense data available for the selected period.</p>
        </div>
      );
    }

    return (
      <div className="space-y-6">
        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <div className="bg-red-50 p-4 rounded-lg">
            <div className="text-sm text-red-600 font-medium">Total Expenses</div>
            <div className="text-2xl font-bold text-red-900">{monthlyExpensesData.summary?.total_expenses || 0}</div>
          </div>
          <div className="bg-orange-50 p-4 rounded-lg">
            <div className="text-sm text-orange-600 font-medium">Total Amount</div>
            <div className="text-2xl font-bold text-orange-900">{formatCurrency(monthlyExpensesData.summary?.total_amount || 0)}</div>
          </div>
          <div className="bg-purple-50 p-4 rounded-lg">
            <div className="text-sm text-purple-600 font-medium">Categories Used</div>
            <div className="text-2xl font-bold text-purple-900">{monthlyExpensesData.summary?.categories_used || 0}</div>
          </div>
        </div>

        {/* Category Breakdown */}
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
          <h3 className="text-lg font-semibold text-gray-900 mb-4"><TranslatedText text="Expense Category Breakdown" /></h3>
          <div className="space-y-3">
            {(monthlyExpensesData.category_breakdown || []).map((category) => (
              <div key={category.category_name} className="flex justify-between items-center py-2 border-b border-gray-100">
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

        {/* Daily Breakdown */}
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
          <h3 className="text-lg font-semibold text-gray-900 mb-4"><TranslatedText text="Daily Breakdown for {monthlyExpensesData.period}" /></h3>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Expenses</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {(monthlyExpensesData.daily_breakdown || []).map((day, index) => (
                  <tr key={index}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{day.date}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{day.daily_expenses}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{formatCurrency(day.daily_amount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Top Expenses */}
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
          <h3 className="text-lg font-semibold text-gray-900 mb-4"><TranslatedText text="Top Expenses" /></h3>
          <div className="space-y-3">
            {(monthlyExpensesData.top_expenses || []).map((expense) => (
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
      </div>
    );
  };

  const renderYearlySales = () => {
    if (yearlySalesLoading) {
      return (
        <div className="text-center py-8">
          <div className="text-blue-600 mb-4">🔄</div>
          <p className="text-blue-600">Loading yearly sales data...</p>
        </div>
      );
    }

    if (yearlySalesError) {
      return (
        <div className="text-center py-8">
          <div className="text-red-600 mb-4">❌</div>
          <p className="text-red-600">Error loading yearly sales: {yearlySalesError.message}</p>
        </div>
      );
    }

    if (!yearlySalesData || !yearlySalesData.summary) {
      return (
        <div className="text-center py-8">
          <div className="text-yellow-600 mb-4">⚠️</div>
          <p className="text-yellow-600">No yearly sales data available for the selected year.</p>
        </div>
      );
    }

    return (
      <div className="space-y-6">
        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-blue-50 p-4 rounded-lg">
            <div className="text-sm text-blue-600 font-medium">Total Orders</div>
            <div className="text-2xl font-bold text-blue-900">{yearlySalesData.summary?.total_orders || 0}</div>
          </div>
          <div className="bg-green-50 p-4 rounded-lg">
            <div className="text-sm text-green-600 font-medium">Total Revenue</div>
            <div className="text-2xl font-bold text-green-900">{formatCurrency(yearlySalesData.summary?.total_revenue || 0)}</div>
          </div>
          <div className="bg-purple-50 p-4 rounded-lg">
            <div className="text-sm text-purple-600 font-medium">Unique Customers</div>
            <div className="text-2xl font-bold text-purple-900">{yearlySalesData.summary?.total_customers || 0}</div>
          </div>
          <div className="bg-orange-50 p-4 rounded-lg">
            <div className="text-sm text-orange-600 font-medium">Shops with Sales</div>
            <div className="text-2xl font-bold text-orange-900">{yearlySalesData.summary?.shops_with_sales || 0}</div>
          </div>
        </div>

        {/* Payment Method Breakdown */}
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
          <h3 className="text-lg font-semibold text-gray-900 mb-4"><TranslatedText text="Payment Method Breakdown" /></h3>
          <div className="space-y-3">
            {(yearlySalesData.payment_method_breakdown || []).map((payment) => (
              <div key={payment.payment_method} className="flex justify-between items-center py-2 border-b border-gray-100">
                <div>
                  <div className="font-medium text-gray-900">{payment.payment_method || 'Unknown'}</div>
                  <div className="text-sm text-gray-500">{payment.order_count} orders</div>
                </div>
                <div className="text-right">
                  <div className="font-semibold text-gray-900">{formatCurrency(payment.total_revenue)}</div>
                  <div className="text-sm text-gray-500">Paid: {formatCurrency(payment.amount_paid)}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Monthly Breakdown */}
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
          <h3 className="text-lg font-semibold text-gray-900 mb-4"><TranslatedText text="Monthly Breakdown for {yearlySalesData.year}" /></h3>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Month</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Orders</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Revenue</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Customers</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {(yearlySalesData.monthly_breakdown || []).map((month, index) => (
                  <tr key={index}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{month.month_name}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{month.monthly_orders}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{formatCurrency(month.monthly_revenue)}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{month.monthly_customers}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Sales by Shop and Payment */}
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
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
                {(yearlySalesData.sales_by_shop_and_payment || []).map((sale, index) => (
                  <tr key={index}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{sale.shop_name}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{sale.payment_method || 'Unknown'}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{sale.order_count}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{formatCurrency(sale.total_revenue)}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{formatCurrency(sale.avg_order_value)}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{sale.unique_customers}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  };

  const renderYearlyExpenses = () => {
    if (yearlyExpensesLoading) {
      return (
        <div className="text-center py-8">
          <div className="text-blue-600 mb-4">🔄</div>
          <p className="text-blue-600">Loading yearly expense data...</p>
        </div>
      );
    }

    if (yearlyExpensesError) {
      return (
        <div className="text-center py-8">
          <div className="text-red-600 mb-4">❌</div>
          <p className="text-red-600">Error loading yearly expenses: {yearlyExpensesError.message}</p>
        </div>
      );
    }

    if (!yearlyExpensesData || !yearlyExpensesData.summary) {
      return (
        <div className="text-center py-8">
          <div className="text-yellow-600 mb-4">⚠️</div>
          <p className="text-yellow-600">No yearly expense data available for the selected year.</p>
        </div>
      );
    }

    return (
      <div className="space-y-6">
        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <div className="bg-red-50 p-4 rounded-lg">
            <div className="text-sm text-red-600 font-medium">Total Expenses</div>
            <div className="text-2xl font-bold text-red-900">{yearlyExpensesData.summary?.total_expenses || 0}</div>
          </div>
          <div className="bg-orange-50 p-4 rounded-lg">
            <div className="text-sm text-orange-600 font-medium">Total Amount</div>
            <div className="text-2xl font-bold text-orange-900">{formatCurrency(yearlyExpensesData.summary?.total_amount || 0)}</div>
          </div>
          <div className="bg-purple-50 p-4 rounded-lg">
            <div className="text-sm text-purple-600 font-medium">Categories Used</div>
            <div className="text-2xl font-bold text-purple-900">{yearlyExpensesData.summary?.categories_used || 0}</div>
          </div>
        </div>

        {/* Category Breakdown */}
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
          <h3 className="text-lg font-semibold text-gray-900 mb-4"><TranslatedText text="Expense Category Breakdown" /></h3>
          <div className="space-y-3">
            {(yearlyExpensesData.category_breakdown || []).map((category) => (
              <div key={category.category_name} className="flex justify-between items-center py-2 border-b border-gray-100">
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

        {/* Monthly Breakdown */}
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
          <h3 className="text-lg font-semibold text-gray-900 mb-4"><TranslatedText text="Monthly Breakdown for {yearlyExpensesData.year}" /></h3>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Month</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Expenses</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {(yearlyExpensesData.monthly_breakdown || []).map((month, index) => (
                  <tr key={index}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{month.month_name}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{month.monthly_expenses}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{formatCurrency(month.monthly_amount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Top Expenses */}
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
          <h3 className="text-lg font-semibold text-gray-900 mb-4"><TranslatedText text="Top Expenses" /></h3>
          <div className="space-y-3">
            {(yearlyExpensesData.top_expenses || []).map((expense) => (
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
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <ReportIcon className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-gray-900">{getReportTitle()}</h2>
              <p className="text-gray-600 mt-1">Professional financial reporting and analysis</p>
            </div>
          </div>
          <div className="mt-4 sm:mt-0 flex space-x-2">
            <button 
              onClick={handleExport}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 transition-colors"
            >
              <Download className="h-4 w-4 inline mr-2" />
              Export
            </button>
            <button 
              onClick={handlePrint}
              className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 focus:ring-2 focus:ring-gray-500 transition-colors"
            >
              <Printer className="h-4 w-4 inline mr-2" />
              Print
            </button>
          </div>
        </div>
      </div>

      {/* Report Selection */}
      <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
        <div className="flex flex-wrap gap-2">
          {[
            { key: 'summary', label: 'Dashboard', icon: Activity },
            { key: 'trial-balance', label: 'Trial Balance', icon: Calculator },
            { key: 'income-statement', label: 'Income Statement', icon: TrendingUp },
            { key: 'balance-sheet', label: 'Balance Sheet', icon: Building2 },
            { key: 'cash-flow', label: 'Cash Flow', icon: BarChart3 },
            { key: 'daily-sales', label: 'Daily Sales', icon: ShoppingCart },
            { key: 'daily-expenses', label: 'Daily Expenses', icon: Receipt },
            { key: 'monthly-sales', label: 'Monthly Sales', icon: ShoppingCart },
            { key: 'monthly-expenses', label: 'Monthly Expenses', icon: Receipt },
            { key: 'yearly-sales', label: 'Yearly Sales', icon: ShoppingCart },
            { key: 'yearly-expenses', label: 'Yearly Expenses', icon: Receipt }
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

      {/* Report Parameters */}
      <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
        <h3 className="text-lg font-semibold text-gray-900 mb-4"><TranslatedText text="Report Parameters" /></h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {selectedReport === 'summary' ? (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Period</label>
              <select
                value={period}
                onChange={(e) => setPeriod(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="daily">Daily</option>
                <option value="weekly">Weekly</option>
                <option value="monthly">Monthly</option>
                <option value="quarterly">Quarterly</option>
                <option value="yearly">Yearly</option>
              </select>
            </div>
          ) : selectedReport === 'trial-balance' || selectedReport === 'balance-sheet' || selectedReport === 'daily-sales' || selectedReport === 'daily-expenses' ? (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">As of Date</label>
              <input
                type="date"
                value={dateRange.as_of_date}
                onChange={(e) => handleDateChange('as_of_date', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          ) : selectedReport === 'monthly-sales' || selectedReport === 'monthly-expenses' ? (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Year</label>
                <select
                  value={dateRange.year}
                  onChange={(e) => handleDateChange('year', parseInt(e.target.value))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  {Array.from({ length: 10 }, (_, i) => new Date().getFullYear() - 5 + i).map(year => (
                    <option key={year} value={year}>{year}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Month</label>
                <select
                  value={dateRange.month}
                  onChange={(e) => handleDateChange('month', parseInt(e.target.value))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  {Array.from({ length: 12 }, (_, i) => i + 1).map(month => (
                    <option key={month} value={month}>{new Date(2024, month - 1).toLocaleString('default', { month: 'long' })}</option>
                  ))}
                </select>
              </div>
            </>
          ) : selectedReport === 'yearly-sales' || selectedReport === 'yearly-expenses' ? (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Year</label>
              <select
                value={dateRange.year}
                onChange={(e) => handleDateChange('year', parseInt(e.target.value))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                {Array.from({ length: 10 }, (_, i) => new Date().getFullYear() - 5 + i).map(year => (
                  <option key={year} value={year}>{year}</option>
                ))}
              </select>
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
        <SkeletonLoader type="chart" count={1} />
      ) : hasErrors ? (
        <ErrorBoundary
          error={hasErrors}
          onRetry={() => window.location.reload()}
          title="Financial Report Error"
          message="We couldn't load the financial report. This might be a temporary issue."
        />
      ) : (
        renderReportContent()
      )}
    </div>
  );
};

export default ProfessionalFinancialReports;
