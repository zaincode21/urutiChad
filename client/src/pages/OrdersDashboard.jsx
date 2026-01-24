import React, { useState, useEffect } from 'react';
import { BarChart3, TrendingUp, DollarSign, ShoppingBag, Calendar, Filter, Download } from 'lucide-react';
import { api } from '../lib/api';
import { ordersAPI } from '../lib/api';
import TranslatedText from '../components/TranslatedText';

const OrdersDashboard = () => {
  const [stats, setStats] = useState({
    totalSales: 0,
    todaySales: 0,
    totalOrders: 0,
    averageOrderValue: 0
  });
  const [salesData, setSalesData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState('today');

  useEffect(() => {
    fetchDashboardData();
  }, [dateRange]);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const [ordersResponse, statsResponse] = await Promise.all([
        ordersAPI.getAll(),
        api.get('/dashboard/overview')
      ]);

      const orders = ordersResponse.data || [];

      // Map backend overview to local stats shape
      const overview = statsResponse.data || {};
      const salesOverview = overview.sales || {};

      // Compute today's sales from orders
      const today = new Date();
      const todayStr = today.toISOString().split('T')[0];
      const todaySales = orders
        .filter(o => o.created_at && o.created_at.startsWith(todayStr))
        .reduce((sum, o) => sum + (o.total_amount || 0), 0);

      setStats({
        totalSales: salesOverview.total_revenue || 0,
        todaySales,
        totalOrders: salesOverview.total_orders || 0,
        averageOrderValue: salesOverview.avg_order_value || 0
      });

      // Process sales data for charts (use total_amount from backend)
      const salesByDate = processSalesData(orders);
      setSalesData(salesByDate);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const processSalesData = (orders) => {
    const today = new Date();
    const last7Days = [];
    
    for (let i = 6; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      
      const dayOrders = orders.filter(order => 
        order.created_at && order.created_at.startsWith(dateStr)
      );
      
      const dailySales = dayOrders.reduce((sum, order) => sum + (order.total_amount || 0), 0);
      
      last7Days.push({
        date: dateStr,
        sales: dailySales,
        orders: dayOrders.length,
        day: date.toLocaleDateString('en', { weekday: 'short' })
      });
    }
    
    return last7Days;
  };

  const StatCard = ({ title, value, icon: Icon, change, color = 'blue' }) => (
    <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-600">{title}</p>
          <p className="text-2xl font-bold text-gray-900 mt-2">{value}</p>
          {change && (
            <p className={`text-sm mt-2 flex items-center ${
              change > 0 ? 'text-green-600' : 'text-red-600'
            }`}>
              <TrendingUp className="h-4 w-4 mr-1" />
              {change > 0 ? '+' : ''}{change}% from yesterday
            </p>
          )}
        </div>
        <div className={`p-3 rounded-lg bg-${color}-50`}>
          <Icon className={`h-6 w-6 text-${color}-600`} />
        </div>
      </div>
    </div>
  );

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-gray-200 rounded w-64"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-32 bg-gray-200 rounded-xl"></div>
            ))}
          </div>
          <div className="h-80 bg-gray-200 rounded-xl"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900"><TranslatedText text="Orders Dashboard" /></h1>
          <p className="text-gray-600 mt-1">Analytics and insights for your sales performance</p>
        </div>
        
        <div className="flex items-center space-x-3 mt-4 sm:mt-0">
          <select
            value={dateRange}
            onChange={(e) => setDateRange(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="today">Today</option>
            <option value="week">This Week</option>
            <option value="month">This Month</option>
            <option value="year">This Year</option>
          </select>
          
          <button className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm">
            <Download className="h-4 w-4 mr-2" />
            Export
          </button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="Total Sales"
          value={`$${stats.totalSales?.toLocaleString() || '0'}`}
          icon={DollarSign}
          change={12.5}
          color="green"
        />
        <StatCard
          title="Today's Sales"
          value={`$${stats.todaySales?.toLocaleString() || '0'}`}
          icon={TrendingUp}
          change={8.3}
          color="blue"
        />
        <StatCard
          title="Total Orders"
          value={stats.totalOrders?.toLocaleString() || '0'}
          icon={ShoppingBag}
          change={-2.1}
          color="purple"
        />
        <StatCard
          title="Avg Order Value"
          value={`$${stats.averageOrderValue?.toFixed(2) || '0.00'}`}
          icon={BarChart3}
          change={5.7}
          color="orange"
        />
      </div>

      {/* Sales Chart */}
      <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-semibold text-gray-900"><TranslatedText text="Sales Trend" /></h2>
          <div className="flex items-center space-x-2 text-sm text-gray-500">
            <Calendar className="h-4 w-4" />
            <span>Last 7 days</span>
          </div>
        </div>
        
        <div className="h-64 flex items-end justify-between space-x-2">
          {salesData.map((day, index) => {
            const maxSales = Math.max(...salesData.map(d => d.sales));
            const height = maxSales > 0 ? (day.sales / maxSales) * 100 : 0;
            
            return (
              <div key={index} className="flex-1 flex flex-col items-center">
                <div
                  className="w-full bg-blue-500 rounded-t-lg transition-all duration-500 hover:bg-blue-600 cursor-pointer group relative"
                  style={{ height: `${height}%`, minHeight: height > 0 ? '8px' : '2px' }}
                >
                  <div className="absolute -top-8 left-1/2 transform -translate-x-1/2 bg-gray-800 text-white px-2 py-1 rounded text-xs opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                    ${day.sales.toLocaleString()}
                  </div>
                </div>
                <div className="mt-2 text-xs text-gray-600 text-center">
                  <div>{day.day}</div>
                  <div className="text-gray-400">{day.orders} orders</div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Quick Insights */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-4"><TranslatedText text="Top Performance Metrics" /></h3>
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Peak Sales Hour</span>
              <span className="font-semibold">2:00 PM - 3:00 PM</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Best Sales Day</span>
              <span className="font-semibold">Saturday</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Customer Retention</span>
              <span className="font-semibold text-green-600">78%</span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-4"><TranslatedText text="Recent Activity" /></h3>
          <div className="space-y-3">
            <div className="flex items-center space-x-3">
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              <span className="text-sm text-gray-600">5 new orders in the last hour</span>
            </div>
            <div className="flex items-center space-x-3">
              <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
              <span className="text-sm text-gray-600">12 customers added today</span>
            </div>
            <div className="flex items-center space-x-3">
              <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
              <span className="text-sm text-gray-600">3 products low in stock</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OrdersDashboard;
