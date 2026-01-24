import React, { useState, useEffect } from 'react';
import TranslatedText from '../components/TranslatedText';
import { useTranslation } from '../hooks/useTranslation';
import { Plus, ShoppingCart } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import OrderList from '../components/OrderList';
import OrderDetail from '../components/OrderDetail';
import NewOrderModal from '../components/orders/NewOrderModal';
import { api } from '../lib/api';

export default function Orders() {
  const { tSync } = useTranslation();
  const navigate = useNavigate();
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [showOrderDetail, setShowOrderDetail] = useState(false);
  const [quickStats, setQuickStats] = useState({
    totalOrders: 0,
    totalRevenue: 0,
    avgOrderValue: 0,
    totalCustomers: 0
  });

  useEffect(() => {
    fetchQuickStats();
  }, []);

  const fetchQuickStats = async () => {
    try {
      const response = await api.get('/orders/stats/overview?period=30');
      const stats = response.data.stats;

      setQuickStats({
        totalOrders: stats.total_orders || 0,
        totalRevenue: stats.total_revenue || 0,
        avgOrderValue: stats.avg_order_value || 0,
        totalCustomers: stats.completed_orders || 0 // Using completed orders as active customers
      });
    } catch (error) {
      console.error('Error fetching quick stats:', error);
    }
  };

  // --- UI Handlers ---
  const [showNewOrderModal, setShowNewOrderModal] = useState(false);

  const handleCreateNewOrder = () => {
    setShowNewOrderModal(true);
  };

  const handleViewOrder = (order) => {
    setSelectedOrder(order);
    setShowOrderDetail(true);
  };

  const handleEditOrder = (order) => {
    setShowOrderDetail(false);
    navigate(`/orders/edit/${order.id}`);
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'CFA'
    }).format(amount);
  };

  const formatNumber = (num) => {
    return new Intl.NumberFormat('en-US').format(num);
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center">
            <ShoppingCart className="h-8 w-8 mr-3 text-primary-600" />
            {tSync('Orders')}
          </h1>
          <p className="text-gray-600 mt-2">{tSync('Manage payments and invoices')}</p>

          {/* Helpful tip */}
          <div className="mt-3 p-3 bg-green-50 border border-green-200 rounded-lg">
            <div className="flex items-start">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-green-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <p className="text-sm text-green-700">
                  <strong>{tSync('Pro Tips:')}</strong> {tSync('You can filter orders using the search bar')}
                </p>
              </div>
            </div>
          </div>
        </div>
        <button
          onClick={handleCreateNewOrder}
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 transition-all duration-200 hover:shadow-lg"
        >
          <Plus className="w-4 h-4 mr-2" />
          {tSync('New Order')}
        </button>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <ShoppingCart className="h-8 w-8 text-primary-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">{tSync('Total Orders')}</p>
              <p className="text-2xl font-semibold text-gray-900">
                {formatNumber(quickStats.totalOrders)}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="h-8 w-8 bg-green-100 rounded-lg flex items-center justify-center">
                <span className="text-green-600 font-bold">$</span>
              </div>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">{tSync('Total Revenue')}</p>
              <p className="text-2xl font-semibold text-gray-900">
                {formatCurrency(quickStats.totalRevenue)}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="h-8 w-8 bg-blue-100 rounded-lg flex items-center justify-center">
                <span className="text-blue-600 font-bold">↗</span>
              </div>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">{tSync('Avg Order Value')}</p>
              <p className="text-2xl font-semibold text-gray-900">
                {formatCurrency(quickStats.avgOrderValue)}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="h-8 w-8 bg-yellow-100 rounded-lg flex items-center justify-center">
                <span className="text-yellow-600 font-bold">👥</span>
              </div>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">{tSync('Active Customers')}</p>
              <p className="text-2xl font-semibold text-gray-900">
                {formatNumber(quickStats.totalCustomers)}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Orders List */}
      <OrderList
        onViewOrder={handleViewOrder}
        onEditOrder={handleEditOrder}
      />

      {/* Order Detail Modal */}
      {showOrderDetail && selectedOrder && (
        <OrderDetail
          orderId={selectedOrder.id}
          onClose={() => {
            setShowOrderDetail(false);
            setSelectedOrder(null);
          }}
          onEdit={handleEditOrder}
        />
      )}

      {/* New Order Modal */}
      <NewOrderModal
        isOpen={showNewOrderModal}
        onClose={() => {
          setShowNewOrderModal(false);
          fetchQuickStats(); // Refresh stats after order creation
        }}
      />
    </div>
  );
}