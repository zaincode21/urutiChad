import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { 
  DollarSign, 
  TrendingUp, 
  TrendingDown,
  Package,
  FileText,
  Calendar,
  Download,
  Filter,
  ShoppingCart,
  Receipt,
  AlertCircle
} from 'lucide-react';
import { ordersAPI, shopsAPI } from '../lib/api';
import toast from 'react-hot-toast';
import TranslatedText from '../components/TranslatedText';

const IncomeReport = () => {
  // Helper function to get first and last day of current month
  const getCurrentMonthRange = () => {
    const now = new Date();
    const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    return {
      start: firstDay.toISOString().split('T')[0],
      end: lastDay.toISOString().split('T')[0]
    };
  };

  // Helper function to get first and last day of previous month
  const getPreviousMonthRange = () => {
    const now = new Date();
    const firstDay = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const lastDay = new Date(now.getFullYear(), now.getMonth(), 0);
    return {
      start: firstDay.toISOString().split('T')[0],
      end: lastDay.toISOString().split('T')[0]
    };
  };

  // Initialize with current month (month-to-date)
  const currentMonth = getCurrentMonthRange();
  const [startDate, setStartDate] = useState(currentMonth.start);
  const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]); // Today (month-to-date)
  const [selectedShop, setSelectedShop] = useState('all');

  // Fetch shops
  const { data: shopsData } = useQuery({
    queryKey: ['shops'],
    queryFn: () => shopsAPI.getAll().then(res => res.data),
    staleTime: 10 * 60 * 1000,
  });

  // Fetch income report data
  const { data: reportData, isLoading, error, refetch } = useQuery({
    queryKey: ['income-report', startDate, endDate, selectedShop],
    queryFn: () => ordersAPI.getIncomeReport({
      start_date: startDate,
      end_date: endDate,
      shop_id: selectedShop !== 'all' ? selectedShop : undefined
    }).then(res => res.data),
    staleTime: 2 * 60 * 1000,
  });

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-RW', {
      style: 'currency',
      currency: 'CFA',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount || 0);
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const handleExport = () => {
    if (!reportData) {
      toast.error('No data to export');
      return;
    }

    const csvContent = [
      ['Income Report'],
      [`Period: ${startDate} to ${endDate}`],
      [],
      ['Summary'],
      ['Total Revenue', formatCurrency(reportData.summary.total_revenue)],
      ['Cost of Goods Sold', formatCurrency(reportData.summary.total_cogs)],
      ['Gross Profit', formatCurrency(reportData.summary.gross_profit)],
      ['Total Expenses', formatCurrency(reportData.summary.total_expenses)],
      ['Net Profit', formatCurrency(reportData.summary.net_profit)],
      ['Profit Margin', `${reportData.summary.profit_margin.toFixed(2)}%`],
      ['Total Orders', reportData.summary.total_orders],
      [],
      ['Orders'],
      ['Order Number', 'Date', 'Customer', 'Shop', 'Amount', 'Status'],
      ...(reportData.orders || []).map(order => [
        order.order_number,
        formatDate(order.created_at),
        order.customer_name || 'N/A',
        order.shop_name || 'N/A',
        formatCurrency(order.total_amount),
        order.status
      ]),
      [],
      ['Expenses'],
      ['Date', 'Category', 'Description', 'Amount', 'Shop'],
      ...(reportData.expenses || []).map(expense => [
        formatDate(expense.expense_date),
        expense.category,
        expense.description || '',
        formatCurrency(expense.amount),
        expense.shop_name || 'N/A'
      ])
    ].map(row => row.join(',')).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `income-report-${startDate}-to-${endDate}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
    toast.success('CSV report exported successfully');
  };

  const handleExportPDF = async () => {
    if (!reportData) {
      toast.error('No data to export');
      return;
    }

    try {
      const params = {
        start_date: startDate,
        end_date: endDate,
        ...(selectedShop !== 'all' && { shop_id: selectedShop })
      };

      console.log('Requesting PDF with params:', params);
      
      // Make the API call
      const response = await ordersAPI.getIncomeReportPDF(params);
      
      console.log('PDF response received:', {
        status: response.status,
        statusText: response.statusText,
        headers: response.headers,
        dataType: typeof response.data,
        dataSize: response.data?.size || response.data?.byteLength || 'unknown',
        contentType: response.headers['content-type']
      });
      
      // Check if response is valid
      if (!response.data) {
        throw new Error('No data received from server');
      }
      
      // Create blob from response - handle different data types
      let blob;
      if (response.data instanceof Blob) {
        blob = response.data;
      } else {
        blob = new Blob([response.data], { type: 'application/pdf' });
      }
      
      console.log('Blob created:', { size: blob.size, type: blob.type });
      
      // Check if blob is valid (not empty)
      if (blob.size === 0) {
        throw new Error('Received empty PDF file');
      }
      
      // Create download link
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `income-report-${startDate}-to-${endDate}.pdf`;
      a.style.display = 'none';
      
      // Trigger download
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
      
      toast.success('PDF report exported successfully');
    } catch (error) {
      console.error('PDF export error:', error);
      console.error('Error details:', {
        message: error.message,
        response: error.response,
        status: error.response?.status,
        data: error.response?.data
      });
      
      if (error.response?.status === 401) {
        toast.error('Authentication required. Please login again.');
      } else if (error.response?.status === 500) {
        toast.error('Server error generating PDF. Please try again.');
      } else {
        toast.error(`Failed to export PDF report: ${error.message}`);
      }
    }
  };

  const handleExportExcel = async () => {
    if (!reportData) {
      toast.error('No data to export');
      return;
    }

    try {
      const params = {
        start_date: startDate,
        end_date: endDate,
        ...(selectedShop !== 'all' && { shop_id: selectedShop })
      };

      const response = await ordersAPI.getIncomeReportExcel(params);
      
      // Create blob from response
      const blob = new Blob([response.data], { 
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
      });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.download = `income-report-${startDate}-to-${endDate}.xlsx`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
      toast.success('Excel report exported successfully');
    } catch (error) {
      console.error('Excel export error:', error);
      
      // Check if it's a compatibility issue
      if (error.response?.status === 400 && error.response?.data?.error?.includes('compatibility')) {
        toast.error('Excel export is not available. Please use PDF export instead.');
      } else {
        toast.error('Failed to export Excel report');
      }
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading income report...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <p className="text-gray-600">Error loading report: {error.message}</p>
          <button
            onClick={() => refetch()}
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  const summary = reportData?.summary || {};
  const orders = reportData?.orders || [];
  const expenses = reportData?.expenses || [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center">
              <Receipt className="h-6 w-6 mr-2" />
              Income Report
            </h1>
            <p className="text-gray-600 mt-1">Orders, Revenue, Costs, and Expenses Analysis</p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleExport}
              className="flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition"
            >
              <Download className="h-4 w-4 mr-2" />
              Export CSV
            </button>
            {/* PDF export button hidden per user request */}
            {/* Excel export temporarily disabled due to compatibility issues */}
            <button
              disabled
              title="Excel export temporarily unavailable due to compatibility issues"
              className="flex items-center px-4 py-2 bg-gray-400 text-white rounded-lg cursor-not-allowed opacity-50"
            >
              <FileText className="h-4 w-4 mr-2" />
              Export Excel (Unavailable)
            </button>
          </div>
        </div>

        {/* Quick Period Selection Buttons */}
        <div className="mb-4 flex flex-wrap gap-2">
          <button
            onClick={() => {
              const range = getCurrentMonthRange();
              setStartDate(range.start);
              setEndDate(new Date().toISOString().split('T')[0]);
            }}
            className={`px-3 py-1.5 text-sm rounded-lg transition ${
              startDate === getCurrentMonthRange().start && endDate === new Date().toISOString().split('T')[0]
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            This Month (MTD)
          </button>
          <button
            onClick={() => {
              const range = getCurrentMonthRange();
              setStartDate(range.start);
              setEndDate(range.end);
            }}
            className={`px-3 py-1.5 text-sm rounded-lg transition ${
              startDate === getCurrentMonthRange().start && endDate === getCurrentMonthRange().end
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Full Current Month
          </button>
          <button
            onClick={() => {
              const range = getPreviousMonthRange();
              setStartDate(range.start);
              setEndDate(range.end);
            }}
            className="px-3 py-1.5 text-sm rounded-lg bg-gray-100 text-gray-700 hover:bg-gray-200 transition"
          >
            Previous Month
          </button>
          <button
            onClick={() => {
              const endDate = new Date();
              const startDate = new Date();
              startDate.setDate(startDate.getDate() - 30);
              setStartDate(startDate.toISOString().split('T')[0]);
              setEndDate(endDate.toISOString().split('T')[0]);
            }}
            className="px-3 py-1.5 text-sm rounded-lg bg-gray-100 text-gray-700 hover:bg-gray-200 transition"
          >
            Last 30 Days
          </button>
          <button
            onClick={() => {
              const endDate = new Date();
              const startDate = new Date();
              startDate.setDate(startDate.getDate() - 7);
              setStartDate(startDate.toISOString().split('T')[0]);
              setEndDate(endDate.toISOString().split('T')[0]);
            }}
            className="px-3 py-1.5 text-sm rounded-lg bg-gray-100 text-gray-700 hover:bg-gray-200 transition"
          >
            Last 7 Days
          </button>
        </div>

        {/* Filters */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Shop</label>
            <select
              value={selectedShop}
              onChange={(e) => setSelectedShop(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="all">All Shops</option>
              {shopsData?.shops?.map(shop => (
                <option key={shop.id} value={shop.id}>{shop.name}</option>
              ))}
            </select>
          </div>
          <div className="flex items-end">
            <button
              onClick={() => refetch()}
              className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition flex items-center justify-center"
            >
              <Filter className="h-4 w-4 mr-2" />
              Apply Filters
            </button>
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Revenue</p>
              <p className="text-2xl font-bold text-gray-900 mt-2">
                {formatCurrency(summary.total_revenue)}
              </p>
              <p className="text-xs text-gray-500 mt-1">{summary.total_orders} orders</p>
            </div>
            <div className="bg-green-100 p-3 rounded-full">
              <DollarSign className="h-6 w-6 text-green-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Cost of Goods</p>
              <p className="text-2xl font-bold text-gray-900 mt-2">
                {formatCurrency(summary.total_cogs)}
              </p>
              <p className="text-xs text-gray-500 mt-1">
                {summary.total_revenue > 0 
                  ? `${((summary.total_cogs / summary.total_revenue) * 100).toFixed(1)}% of revenue`
                  : 'N/A'}
              </p>
            </div>
            <div className="bg-orange-100 p-3 rounded-full">
              <Package className="h-6 w-6 text-orange-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Expenses</p>
              <p className="text-2xl font-bold text-gray-900 mt-2">
                {formatCurrency(summary.total_expenses)}
              </p>
              <p className="text-xs text-gray-500 mt-1">{expenses.length} expense entries</p>
            </div>
            <div className="bg-red-100 p-3 rounded-full">
              <TrendingDown className="h-6 w-6 text-red-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Net Profit</p>
              <p className="text-2xl font-bold mt-2" style={{
                color: summary.net_profit >= 0 ? '#059669' : '#dc2626'
              }}>
                {formatCurrency(summary.net_profit)}
              </p>
              <p className="text-xs text-gray-500 mt-1">
                {summary.profit_margin?.toFixed(2) || 0}% margin
              </p>
            </div>
            <div className={`p-3 rounded-full ${summary.net_profit >= 0 ? 'bg-green-100' : 'bg-red-100'}`}>
              <TrendingUp className={`h-6 w-6 ${summary.net_profit >= 0 ? 'text-green-600' : 'text-red-600'}`} />
            </div>
          </div>
        </div>
      </div>

      {/* Financial Breakdown */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4"><TranslatedText text="Financial Breakdown" /></h2>
        <div className="space-y-3">
          <div className="flex justify-between items-center py-2 border-b">
            <span className="text-gray-700">Total Revenue (Income)</span>
            <span className="font-semibold text-gray-900">{formatCurrency(summary.total_revenue)}</span>
          </div>
          <div className="flex justify-between items-center py-2 border-b">
            <span className="text-gray-700">Cost of Goods Sold</span>
            <span className="font-semibold text-orange-600">-{formatCurrency(summary.total_cogs)}</span>
          </div>
          <div className="flex justify-between items-center py-2 border-b-2 border-gray-300">
            <span className="font-medium text-gray-900">Gross Profit</span>
            <span className="font-bold text-blue-600">{formatCurrency(summary.gross_profit)}</span>
          </div>
          <div className="flex justify-between items-center py-2 border-b">
            <span className="text-gray-700">Operating Expenses</span>
            <span className="font-semibold text-red-600">-{formatCurrency(summary.total_expenses)}</span>
          </div>
          <div className="flex justify-between items-center py-2 bg-gray-50 rounded-lg px-4">
            <span className="font-bold text-gray-900">Net Profit</span>
            <span className="font-bold text-lg" style={{
              color: summary.net_profit >= 0 ? '#059669' : '#dc2626'
            }}>
              {formatCurrency(summary.net_profit)}
            </span>
          </div>
        </div>
      </div>

      {/* Orders Table */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900 flex items-center">
            <ShoppingCart className="h-5 w-5 mr-2" />
            Orders ({orders.length})
          </h2>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Product Names</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Categories</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Shop</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {orders.length > 0 ? (
                orders.map((order) => (
                  <tr key={order.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600">
                      {formatDate(order.created_at)}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900">
                      <div className="max-w-xs">
                        {order.product_names ? (
                          <span className="text-sm font-medium">{order.product_names}</span>
                        ) : (
                          <span className="text-sm text-gray-400">No products</span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      <div className="max-w-xs">
                        {order.categories ? (
                          <div className="flex flex-wrap gap-1">
                            {order.categories.split(', ').filter(cat => cat.trim()).map((category, idx) => (
                              <span key={idx} className="px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded-full">
                                {category.trim()}
                              </span>
                            ))}
                          </div>
                        ) : (
                          <span className="text-sm text-gray-400">No categories</span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600">
                      {order.shop_name || 'N/A'}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm font-semibold text-gray-900 text-right">
                      {formatCurrency(order.total_amount)}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                        order.status === 'completed' ? 'bg-green-100 text-green-800' :
                        order.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {order.status}
                      </span>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="6" className="px-4 py-8 text-center text-gray-500">
                    No orders found for the selected period
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Expenses Table */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900 flex items-center">
            <FileText className="h-5 w-5 mr-2" />
            Expenses ({expenses.length})
          </h2>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Category</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Description</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Shop</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {expenses.length > 0 ? (
                expenses.map((expense) => (
                  <tr key={expense.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600">
                      {formatDate(expense.expense_date)}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600">
                      <span className="px-2 py-1 text-xs font-medium bg-purple-100 text-purple-800 rounded-full">
                        {expense.category}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {expense.description || 'N/A'}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600">
                      {expense.shop_name || 'N/A'}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm font-semibold text-red-600 text-right">
                      {formatCurrency(expense.amount)}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="5" className="px-4 py-8 text-center text-gray-500">
                    No expenses found for the selected period
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default IncomeReport;

