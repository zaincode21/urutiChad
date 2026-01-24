import React, { useState, useEffect } from 'react';
import { 
  ShoppingCart, 
  DollarSign, 
  TrendingUp, 
  Users, 
  Clock,
  CheckCircle,
  AlertTriangle,
  ArrowUp,
  ArrowDown
} from 'lucide-react';
import { api } from '../lib/api';
import TranslatedText from './TranslatedText';

const OrderStats = ({ period = 30 }) => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchOrderStats();
  }, [period]);

  const fetchOrderStats = async () => {
    try {
      setLoading(true);
      const response = await api.get(`/orders/stats/overview?period=${period}`);
      setStats(response.data.stats);
    } catch (error) {
      console.error('Error fetching order stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount || 0);
  };

  const formatNumber = (num) => {
    return new Intl.NumberFormat('en-US').format(num || 0);
  };

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="bg-white p-6 rounded-lg border border-gray-200 animate-pulse">
            <div className="flex items-center">
              <div className="p-2 bg-gray-200 rounded-lg">
                <div className="h-6 w-6 bg-gray-300 rounded"></div>
              </div>
              <div className="ml-4">
                <div className="h-4 bg-gray-200 rounded w-20 mb-2"></div>
                <div className="h-8 bg-gray-200 rounded w-16"></div>
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  const statCards = [
    {
      title: 'Total Orders',
      value: formatNumber(stats?.total_orders),
      icon: ShoppingCart,
      color: 'blue',
      bgColor: 'bg-blue-100',
      textColor: 'text-blue-600',
      change: '+12%', // In a real app, calculate from previous period
      changeType: 'increase'
    },
    {
      title: 'Total Revenue',
      value: formatCurrency(stats?.total_revenue),
      icon: DollarSign,
      color: 'green',
      bgColor: 'bg-green-100',
      textColor: 'text-green-600',
      change: '+8%',
      changeType: 'increase'
    },
    {
      title: 'Average Order Value',
      value: formatCurrency(stats?.avg_order_value),
      icon: TrendingUp,
      color: 'purple',
      bgColor: 'bg-purple-100',
      textColor: 'text-purple-600',
      change: '-2%',
      changeType: 'decrease'
    },
    {
      title: 'Completion Rate',
      value: `${Math.round(((stats?.completed_orders || 0) / (stats?.total_orders || 1)) * 100)}%`,
      icon: CheckCircle,
      color: 'yellow',
      bgColor: 'bg-yellow-100',
      textColor: 'text-yellow-600',
      change: '+5%',
      changeType: 'increase'
    }
  ];

  return (
    <div className="space-y-6">
      {/* Period Selector */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium text-gray-900"><TranslatedText text="Order Statistics" /></h3>
        <select
          value={period}
          onChange={(e) => {
            // In a real app, this would be passed up to parent component
            console.log('Period changed to:', e.target.value);
          }}
          className="px-3 py-1 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-primary-500"
        >
          <option value="7">Last 7 days</option>
          <option value="30">Last 30 days</option>
          <option value="90">Last 90 days</option>
          <option value="365">Last year</option>
        </select>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {statCards.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <div key={index} className="bg-white p-6 rounded-lg border border-gray-200 hover:shadow-lg transition-shadow">
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <div className={`p-2 ${stat.bgColor} rounded-lg`}>
                    <Icon className={`h-6 w-6 ${stat.textColor}`} />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">{stat.title}</p>
                    <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
                  </div>
                </div>
                
                <div className={`flex items-center text-sm ${
                  stat.changeType === 'increase' ? 'text-green-600' : 'text-red-600'
                }`}>
                  {stat.changeType === 'increase' ? (
                    <ArrowUp className="h-4 w-4 mr-1" />
                  ) : (
                    <ArrowDown className="h-4 w-4 mr-1" />
                  )}
                  {stat.change}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Additional Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Order Status Breakdown */}
        <div className="bg-white p-6 rounded-lg border border-gray-200">
          <h4 className="text-lg font-medium text-gray-900 mb-4">Order Status</h4>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <CheckCircle className="h-4 w-4 text-green-500 mr-2" />
                <span className="text-sm text-gray-600">Completed</span>
              </div>
              <span className="text-sm font-medium">{formatNumber(stats?.completed_orders)}</span>
            </div>
            
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <Clock className="h-4 w-4 text-yellow-500 mr-2" />
                <span className="text-sm text-gray-600">Pending</span>
              </div>
              <span className="text-sm font-medium">{formatNumber(stats?.pending_orders)}</span>
            </div>
            
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <AlertTriangle className="h-4 w-4 text-red-500 mr-2" />
                <span className="text-sm text-gray-600">Processing</span>
              </div>
              <span className="text-sm font-medium">
                {formatNumber((stats?.total_orders || 0) - (stats?.completed_orders || 0) - (stats?.pending_orders || 0))}
              </span>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="bg-white p-6 rounded-lg border border-gray-200">
          <h4 className="text-lg font-medium text-gray-900 mb-4">Quick Actions</h4>
          <div className="space-y-2">
            <button className="w-full text-left px-3 py-2 text-sm text-primary-600 hover:bg-primary-50 rounded-lg transition-colors">
              View All Orders
            </button>
            <button className="w-full text-left px-3 py-2 text-sm text-primary-600 hover:bg-primary-50 rounded-lg transition-colors">
              Create New Order
            </button>
            <button className="w-full text-left px-3 py-2 text-sm text-primary-600 hover:bg-primary-50 rounded-lg transition-colors">
              Export Orders
            </button>
            <button className="w-full text-left px-3 py-2 text-sm text-primary-600 hover:bg-primary-50 rounded-lg transition-colors">
              Order Analytics
            </button>
          </div>
        </div>

        {/* Recent Activity */}
        <div className="bg-white p-6 rounded-lg border border-gray-200">
          <h4 className="text-lg font-medium text-gray-900 mb-4">Recent Activity</h4>
          <div className="space-y-3 text-sm">
            <div className="flex items-center text-gray-600">
              <div className="w-2 h-2 bg-green-500 rounded-full mr-3"></div>
              <span>Order completed - $120.50</span>
            </div>
            <div className="flex items-center text-gray-600">
              <div className="w-2 h-2 bg-blue-500 rounded-full mr-3"></div>
              <span>New order created - $89.99</span>
            </div>
            <div className="flex items-center text-gray-600">
              <div className="w-2 h-2 bg-yellow-500 rounded-full mr-3"></div>
              <span>Order status updated</span>
            </div>
            <div className="flex items-center text-gray-600">
              <div className="w-2 h-2 bg-purple-500 rounded-full mr-3"></div>
              <span>Payment processed - $245.00</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OrderStats;
