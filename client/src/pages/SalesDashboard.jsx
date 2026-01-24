import React, { useState, useEffect } from 'react';
import {
  TrendingUp,
  DollarSign,
  ShoppingCart,
  Users,
  FileText,
  // Download,
  Eye,
  Printer,
  Calendar,
  Filter,
  BarChart3,
  PieChart,
  Activity,
  X
} from 'lucide-react';
import { salesAnalyticsAPI, invoicesAPI } from '../lib/api';
import toast from 'react-hot-toast';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, PieChart as RechartsPieChart, Pie, Cell } from 'recharts';
import TranslatedText from '../components/TranslatedText';
import { useTranslation } from '../hooks/useTranslation';

export default function SalesDashboard() {
  const { tSync } = useTranslation();
  const [salesData, setSalesData] = useState(null);
  const [revenueTrends, setRevenueTrends] = useState([]);
  const [topProducts, setTopProducts] = useState([]);
  const [recentOrders, setRecentOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState('30');
  const [groupBy, setGroupBy] = useState('day');
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [showInvoiceModal, setShowInvoiceModal] = useState(false);

  useEffect(() => {
    fetchSalesData();
  }, [period, groupBy]);

  const fetchSalesData = async () => {
    setLoading(true);
    try {
      const [overviewRes, performanceRes] = await Promise.all([
        salesAnalyticsAPI.getOverview({ period }),
        salesAnalyticsAPI.getPerformance({ period, group_by: groupBy })
      ]);

      setSalesData(overviewRes.data);
      setRevenueTrends(overviewRes.data.trends?.dailyRevenue || []);
      setTopProducts(overviewRes.data.topProducts || []);
      setRecentOrders(overviewRes.data.recentOrders || []);
    } catch (error) {
      console.error('Error fetching sales data:', error);
      toast.error('Failed to fetch sales data');
    } finally {
      setLoading(false);
    }
  };

  const printInvoice = async (orderId) => {
    try {
      // First get the invoice HTML with authentication
      const response = await invoicesAPI.getPreview(orderId);
      const htmlContent = response.data;

      // Create a new window with the HTML content
      const printWindow = window.open('', '_blank', 'width=800,height=600');
      if (!printWindow) {
        toast.error('Please allow popups to print invoices');
        return;
      }

      // Write the HTML content to the new window
      printWindow.document.write(htmlContent);
      printWindow.document.close();

      // Wait for content to load then print
      printWindow.onload = function () {
        printWindow.print();
        // Close window after printing (optional)
        setTimeout(() => {
          printWindow.close();
        }, 2000);
      };

      toast.success('Print window opened successfully!');
    } catch (error) {
      console.error('Print invoice error:', error);
      toast.error('Failed to open print window');
    }
  };

  const handleInvoiceAction = async (orderId, action) => {
    try {
      switch (action) {
        case 'download':
          const response = await invoicesAPI.generate(orderId, {
            responseType: 'blob'
          });
          const url = window.URL.createObjectURL(new Blob([response.data]));
          const link = document.createElement('a');
          link.href = url;
          link.setAttribute('download', `invoice-${orderId}-${Date.now()}.pdf`);
          document.body.appendChild(link);
          link.click();
          link.remove();
          window.URL.revokeObjectURL(url);
          toast.success('Invoice downloaded successfully!');
          break;
        case 'preview':
          setSelectedOrder(orderId);
          setShowInvoiceModal(true);
          break;
        case 'print':
          await printInvoice(orderId);
          break;
      }
    } catch (error) {
      console.error(`Error in ${action}:`, error);
      toast.error(`Failed to ${action} invoice`);
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  const formatNumber = (num) => {
    return new Intl.NumberFormat('en-US').format(num);
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8'];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center">
            <TrendingUp className="h-8 w-8 mr-3 text-primary-600" />
            {tSync('Sales Dashboard')}
          </h1>
          <p className="text-gray-600 mt-2">{tSync('Comprehensive sales analytics and invoice management')}</p>
        </div>

        {/* Period and Group Controls */}
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <Calendar className="h-4 w-4 text-gray-500" />
            <select
              value={period}
              onChange={(e) => setPeriod(e.target.value)}
              className="border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              <option value="7">{tSync('Last 7 days')}</option>
              <option value="30">{tSync('Last 30 days')}</option>
              <option value="90">{tSync('Last 90 days')}</option>
              <option value="365">{tSync('Last year')}</option>
            </select>
          </div>

          <div className="flex items-center space-x-2">
            <BarChart3 className="h-4 w-4 text-gray-500" />
            <select
              value={groupBy}
              onChange={(e) => setGroupBy(e.target.value)}
              className="border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              <option value="day">{tSync('Daily')}</option>
              <option value="week">{tSync('Weekly')}</option>
              <option value="month">{tSync('Monthly')}</option>
            </select>
          </div>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white rounded-lg shadow p-6 border-l-4 border-blue-500">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <ShoppingCart className="h-8 w-8 text-blue-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">{tSync('Total Orders')}</p>
              <p className="text-2xl font-semibold text-gray-900">
                {formatNumber(salesData?.summary?.totalOrders || 0)}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6 border-l-4 border-green-500">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <DollarSign className="h-8 w-8 text-green-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">{tSync('Total Revenue')}</p>
              <p className="text-2xl font-semibold text-gray-900">
                {formatCurrency(salesData?.summary?.totalRevenue || 0)}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6 border-l-4 border-purple-500">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <TrendingUp className="h-8 w-8 text-purple-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">{tSync('Avg Order Value')}</p>
              <p className="text-2xl font-semibold text-gray-900">
                {formatCurrency(salesData?.summary?.avgOrderValue || 0)}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6 border-l-4 border-orange-500">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <Users className="h-8 w-8 text-orange-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">{tSync('Active Customers')}</p>
              <p className="text-2xl font-semibold text-gray-900">
                {formatNumber(salesData?.summary?.completedOrders || 0)}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Revenue Trends Chart */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
            <Activity className="h-5 w-5 mr-2 text-primary-600" />
            {tSync('Revenue Trends')}
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={revenueTrends}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis
                dataKey="date"
                tickFormatter={(value) => formatDate(value)}
                fontSize={12}
              />
              <YAxis
                tickFormatter={(value) => formatCurrency(value)}
                fontSize={12}
              />
              <Tooltip
                formatter={(value) => [formatCurrency(value), 'Revenue']}
                labelFormatter={(label) => `Date: ${formatDate(label)}`}
              />
              <Line
                type="monotone"
                dataKey="daily_revenue"
                stroke="#009688"
                strokeWidth={2}
                dot={{ fill: '#009688', strokeWidth: 2, r: 4 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Top Products Chart */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
            <BarChart3 className="h-5 w-5 mr-2 text-primary-600" />
            {tSync('Top Selling Products')}
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={topProducts.slice(0, 8)}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis
                dataKey="name"
                fontSize={10}
                angle={-45}
                textAnchor="end"
                height={80}
              />
              <YAxis
                tickFormatter={(value) => formatNumber(value)}
                fontSize={12}
              />
              <Tooltip
                formatter={(value) => [formatNumber(value), 'Units Sold']}
              />
              <Bar dataKey="total_sold" fill="#009688" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Recent Orders with Invoice Actions */}
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 flex items-center">
            <FileText className="h-5 w-5 mr-2 text-primary-600" />
            {tSync('Recent Orders')}
          </h3>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {tSync('Order')}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {tSync('Customer')}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {tSync('Amount')}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {tSync('Status')}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {tSync('Date')}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {tSync('Invoice Actions')}
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {recentOrders.map((order) => (
                <tr key={order.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">
                      {order.order_number}
                    </div>
                    <div className="text-sm text-gray-500">
                      {order.payment_method}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">
                      {order.first_name ? `${order.first_name} ${order.last_name}` : 'Guest'}
                    </div>
                    <div className="text-sm text-gray-500">
                      {order.email || 'N/A'}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">
                      {formatCurrency(order.total_amount)}
                    </div>
                    {order.discount_amount > 0 && (
                      <div className="text-xs text-green-600">
                        -{formatCurrency(order.discount_amount)} {tSync('discount')}
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${order.status === 'completed' ? 'bg-green-100 text-green-800' :
                      order.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                        order.status === 'cancelled' ? 'bg-red-100 text-red-800' :
                          'bg-gray-100 text-gray-800'
                      }`}>
                      {order.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {formatDate(order.created_at)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => handleInvoiceAction(order.id, 'preview')}
                        className="text-blue-600 hover:text-blue-900 p-1"
                        title="Preview Invoice"
                      >
                        <Eye className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleInvoiceAction(order.id, 'download')}
                        className="text-green-600 hover:text-green-900 p-1"
                        title="Download Invoice"
                      >
                        <Download className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleInvoiceAction(order.id, 'print')}
                        className="text-purple-600 hover:text-purple-900 p-1"
                        title="Print Invoice"
                      >
                        <Printer className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Invoice Preview Modal */}
      {showInvoiceModal && selectedOrder && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-11/12 h-5/6 shadow-lg rounded-md bg-white">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold"><TranslatedText text="Invoice Preview" /></h3>
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => printInvoice(selectedOrder)}
                  className="inline-flex items-center px-3 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-purple-600 hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500"
                >
                  <Printer className="h-4 w-4 mr-2" />
                  {tSync('Print')}
                </button>
                <button
                  onClick={() => setShowInvoiceModal(false)}
                  className="text-gray-500 hover:text-gray-700"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>
            </div>
            <iframe
              src={`/api/invoices/${selectedOrder}/preview`}
              className="w-full h-full border-0"
              title="Invoice Preview"
            />
          </div>
        </div>
      )}
    </div>
  );
} 