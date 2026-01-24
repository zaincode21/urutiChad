import React, { useState, useEffect } from 'react';
import {
  Eye,
  Edit,
  Trash2,
  Search,
  Filter,
  XCircle,
  CheckCircle,
  Clock,
  AlertTriangle,
  RefreshCw,
  Package,
  User,
  Calendar,
  DollarSign,
  ChevronLeft,
  ChevronRight,
  Download,
  Printer,
  Store
} from 'lucide-react';
import { api } from '../lib/api';
import toast from 'react-hot-toast';
import { shopsAPI } from '../lib/api';
import TranslatedText from '../components/TranslatedText';
import { useTranslation } from '../hooks/useTranslation';

const OrderList = ({ onViewOrder, onEditOrder }) => {
  const { tSync: t } = useTranslation();
  const [orders, setOrders] = useState([]);
  const [shops, setShops] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({
    total: 0,
    page: 1,
    totalPages: 1,
    limit: 10
  });
  const [filters, setFilters] = useState({
    search: '',
    status: '',
    customer: '',
    shop_id: '',
    start_date: '',
    end_date: '',
    payment_method: '',
    unit: '',
    page: 1,
    limit: 10
  });
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    fetchOrders();
    fetchShops();
  }, [filters]);

  const fetchShops = async () => {
    try {
      const response = await shopsAPI.getAll();
      setShops(response.data.shops || []);
    } catch (error) {
      console.error('Error fetching shops:', error);
    }
  };

  const fetchOrders = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      Object.entries(filters).forEach(([key, value]) => {
        if (value && key !== 'page' && key !== 'limit') {
          params.append(key, value);
        }
      });
      params.append('page', filters.page);
      params.append('limit', filters.limit);

      const response = await api.get(`/orders?${params.toString()}`);
      setOrders(response.data.orders || []);
      setPagination(response.data.pagination || { total: 0, page: 1, totalPages: 1, limit: 10 });
    } catch (error) {
      console.error('Error fetching orders:', error);
      toast.error(t('list.errorLoading') || 'Failed to load orders');
    } finally {
      setLoading(false);
    }
  };

  const updateOrderStatus = async (orderId, newStatus) => {
    try {
      await api.put(`/orders/${orderId}/status`, { status: newStatus });
      toast.success('Order status updated successfully');
      fetchOrders(); // Refresh the list
    } catch (error) {
      console.error('Error updating order status:', error);
      toast.error('Failed to update order status');
    }
  };

  const deleteOrder = async (orderId) => {
    if (window.confirm(t('list.confirmDelete'))) {
      try {
        await api.delete(`/orders/${orderId}`);
        toast.success('Order deleted successfully');
        fetchOrders(); // Refresh the list
      } catch (error) {
        console.error('Error deleting order:', error);
        toast.error('Failed to delete order');
      }
    }
  };

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value, page: 1 }));
  };

  const handlePageChange = (newPage) => {
    setFilters(prev => ({ ...prev, page: newPage }));
  };

  const resetFilters = () => {
    setFilters({
      search: '',
      status: '',
      customer: '',
      shop_id: '',
      start_date: '',
      end_date: '',
      payment_method: '',
      unit: '',
      page: 1,
      limit: 10
    });
  };

  const exportOrders = () => {
    toast.success('Export functionality would be implemented here');
  };

  const printOrders = () => {
    window.print();
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'processing':
        return 'bg-blue-100 text-blue-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'cancelled':
        return 'bg-red-100 text-red-800';
      case 'refunded':
        return 'bg-purple-100 text-purple-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-4 w-4" />;
      case 'processing':
        return <RefreshCw className="h-4 w-4" />;
      case 'pending':
        return <Clock className="h-4 w-4" />;
      case 'cancelled':
        return <XCircle className="h-4 w-4" />;
      case 'refunded':
        return <AlertTriangle className="h-4 w-4" />;
      default:
        return <Package className="h-4 w-4" />;
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatCurrency = (amount, currency = 'CFA') => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency
    }).format(amount || 0);
  };

  const activeFiltersCount = Object.values(filters).filter(value =>
    value && !['page', 'limit'].includes(value)
  ).length;

  return (
    <div className="space-y-6">
      {/* Search and Filters */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder={t('Search orders by number, customer, product name...') || "Search orders by number, customer, product name..."}
                value={filters.search}
                onChange={(e) => handleFilterChange('search', e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
            </div>
          </div>

          <div className="flex items-center space-x-3">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`inline-flex items-center px-3 py-2 border border-gray-300 rounded-md text-sm font-medium ${showFilters
                ? 'bg-primary-50 text-primary-700 border-primary-300'
                : 'bg-white text-gray-700 hover:bg-gray-50'
                }`}
            >
              <Filter className="h-4 w-4 mr-2" />
              {t('Filters')}
              {activeFiltersCount > 0 && (
                <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-primary-100 text-primary-800">
                  {activeFiltersCount}
                </span>
              )}
            </button>

            <button
              onClick={exportOrders}
              className="inline-flex items-center px-3 py-2 border border-gray-300 rounded-md text-sm font-medium bg-white text-gray-700 hover:bg-gray-50"
            >
              <Download className="h-4 w-4 mr-2" />
              {t('Export')}
            </button>

            <button
              onClick={printOrders}
              className="inline-flex items-center px-3 py-2 border border-gray-300 rounded-md text-sm font-medium bg-white text-gray-700 hover:bg-gray-50"
            >
              <Printer className="h-4 w-4 mr-2" />
              {t('Print')}
            </button>
          </div>
        </div>

        {/* Advanced Filters */}
        {showFilters && (
          <div className="mt-4 pt-4 border-t border-gray-200">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('Status')}</label>
                <select
                  value={filters.status}
                  onChange={(e) => handleFilterChange('status', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                >
                  <option value="">All Statuses</option>
                  <option value="pending">Pending</option>
                  <option value="processing">Processing</option>
                  <option value="completed">Completed</option>
                  <option value="cancelled">Cancelled</option>
                  <option value="refunded">Refunded</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('Payment Method')}</label>
                <select
                  value={filters.payment_method}
                  onChange={(e) => handleFilterChange('payment_method', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                >
                  <option value="">All Methods</option>
                  <option value="cash">Cash</option>
                  <option value="card">Card</option>
                  <option value="credit">Credit</option>
                  <option value="check">Check</option>
                  <option value="mobile">Mobile Payment</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('Shop')}</label>
                <select
                  value={filters.shop_id}
                  onChange={(e) => handleFilterChange('shop_id', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                >
                  <option value="">All Shops</option>
                  {shops.map((shop) => (
                    <option key={shop.id} value={shop.id}>
                      {shop.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('Start Date')}</label>
                <input
                  type="date"
                  value={filters.start_date}
                  onChange={(e) => handleFilterChange('start_date', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('End Date')}</label>
                <input
                  type="date"
                  value={filters.end_date}
                  onChange={(e) => handleFilterChange('end_date', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('Unit')}</label>
                <select
                  value={filters.unit}
                  onChange={(e) => handleFilterChange('unit', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                >
                  <option value="">All Units</option>
                  <option value="30">30ML</option>
                  <option value="50">50ML</option>
                  <option value="100">100ML</option>
                </select>
              </div>
            </div>

            <div className="flex justify-end mt-4">
              <button
                onClick={resetFilters}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
              >
                {t('Reset')}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Orders Table */}
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-medium text-gray-900">
              {t('Orders')} ({pagination.total})
            </h3>

            <div className="flex items-center space-x-4">
              <label className="text-sm text-gray-700">{t('Show')}</label>
              <select
                value={filters.limit}
                onChange={(e) => handleFilterChange('limit', e.target.value)}
                className="px-3 py-1 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-primary-500"
              >
                <option value="10">10</option>
                <option value="25">25</option>
                <option value="50">50</option>
                <option value="100">100</option>
              </select>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="p-12 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500 mx-auto mb-4"></div>
            <p className="text-gray-500">{t('Loading...')}</p>
          </div>
        ) : orders.length === 0 ? (
          <div className="p-12 text-center">
            <Package className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">{t('No orders found')}</h3>
            <p className="text-gray-500">
              {activeFiltersCount > 0
                ? t('Try adjusting your search or filters to find what you\'re looking for.')
                : t('Get started by creating a new order.')
              }
            </p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {t('Products')}
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {t('Quantity')}
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {t('Shop')}
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {t('Status')}
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {t('Total')}
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {t('Date')}
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {t('Payment')}
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {t('Actions')}
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {orders.map((order) => (
                    <tr key={order.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        {order.items && order.items.length > 0 ? (
                          <div className="max-w-xs">
                            <div className="flex items-center">
                              <Package className="h-4 w-4 text-gray-400 mr-2 flex-shrink-0" />
                              <div className="min-w-0">
                                {order.items.slice(0, 2).map((item, index) => (
                                  <div key={index} className="text-sm text-gray-900">
                                    <div className="font-medium truncate">
                                      {item.product_name || item.name || 'Unknown Product'}
                                    </div>
                                    <div className="text-xs text-gray-500 truncate">
                                      SKU: {item.sku || item.product_sku || 'N/A'}
                                    </div>
                                  </div>
                                ))}
                                {order.items.length > 2 && (
                                  <div className="text-xs text-gray-500">
                                    +{order.items.length - 2} more items
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        ) : (
                          <span className="text-sm text-gray-500 italic">{t('No items')}</span>
                        )}
                      </td>

                      <td className="px-6 py-4 whitespace-nowrap">
                        {order.items && order.items.length > 0 ? (
                          <div className="text-sm font-medium text-gray-900">
                            {order.items.reduce((total, item) => total + (item.quantity || 0), 0)} {t('unit count')}
                          </div>
                        ) : (
                          <span className="text-sm text-gray-500">0 {t('unit count')}</span>
                        )}
                      </td>

                      <td className="px-6 py-4 whitespace-nowrap">
                        {order.shop_name ? (
                          <div className="flex items-center">
                            <Store className="h-4 w-4 text-gray-400 mr-2" />
                            <div>
                              <div className="text-sm font-medium text-gray-900">
                                {order.shop_name}
                              </div>
                              {order.shop_address && (
                                <div className="text-sm text-gray-500">
                                  {order.shop_address}
                                </div>
                              )}
                            </div>
                          </div>
                        ) : (
                          <span className="text-sm text-gray-500 italic">{t('No shop assigned')}</span>
                        )}
                      </td>

                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(order.status)}`}>
                          {getStatusIcon(order.status)}
                          <span className="ml-1 capitalize">{order.status}</span>
                        </span>
                      </td>

                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">
                          {formatCurrency(order.total_amount, order.currency)}
                        </div>
                        <div className="text-sm text-gray-500">
                          {order.items_count || 0} {t('items')}
                        </div>
                      </td>

                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center text-sm text-gray-900">
                          <Calendar className="h-4 w-4 text-gray-400 mr-2" />
                          {formatDate(order.created_at)}
                        </div>
                      </td>

                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-sm text-gray-900 capitalize">
                          {order.payment_method || t('Not specified')}
                        </span>
                        <div className="text-xs text-gray-500">
                          {order.payment_status || 'pending'}
                        </div>
                      </td>

                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex items-center justify-end space-x-2">
                          <button
                            onClick={() => onViewOrder && onViewOrder(order)}
                            className="text-primary-600 hover:text-primary-900 p-1"
                            title={t('View order')}
                          >
                            <Eye className="h-4 w-4" />
                          </button>

                          <button
                            onClick={() => onEditOrder && onEditOrder(order)}
                            className="text-gray-600 hover:text-gray-900 p-1"
                            title={t('Edit order')}
                          >
                            <Edit className="h-4 w-4" />
                          </button>

                          {order.status !== 'completed' && order.status !== 'cancelled' && (
                            <select
                              value={order.status}
                              onChange={(e) => updateOrderStatus(order.id, e.target.value)}
                              className="text-xs border border-gray-300 rounded px-2 py-1 focus:ring-1 focus:ring-primary-500"
                            >
                              <option value="pending">Pending</option>
                              <option value="processing">Processing</option>
                              <option value="completed">Complete</option>
                              <option value="cancelled">Cancel</option>
                            </select>
                          )}

                          <button
                            onClick={() => deleteOrder(order.id)}
                            className="text-red-600 hover:text-red-900 p-1"
                            title={t('Delete order')}
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {pagination.totalPages > 1 && (
              <div className="bg-white px-4 py-3 flex items-center justify-between border-t border-gray-200">
                <div className="flex-1 flex justify-between sm:hidden">
                  <button
                    onClick={() => handlePageChange(pagination.page - 1)}
                    disabled={pagination.page <= 1}
                    className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {t('Previous')}
                  </button>
                  <button
                    onClick={() => handlePageChange(pagination.page + 1)}
                    disabled={pagination.page >= pagination.totalPages}
                    className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {t('Next')}
                  </button>
                </div>

                <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
                  <div>
                    <p className="text-sm text-gray-700">
                      {t('Showing')}{' '}
                      <span className="font-medium">
                        {(pagination.page - 1) * pagination.limit + 1}
                      </span>{' '}
                      {t('to')}{' '}
                      <span className="font-medium">
                        {Math.min(pagination.page * pagination.limit, pagination.total)}
                      </span>{' '}
                      {t('of')}{' '}
                      <span className="font-medium">{pagination.total}</span>{' '}
                      {t('results')}
                    </p>
                  </div>

                  <div>
                    <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px">
                      <button
                        onClick={() => handlePageChange(pagination.page - 1)}
                        disabled={pagination.page <= 1}
                        className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <ChevronLeft className="h-5 w-5" />
                      </button>

                      {[...Array(pagination.totalPages)].map((_, i) => {
                        const page = i + 1;
                        if (
                          page === 1 ||
                          page === pagination.totalPages ||
                          (page >= pagination.page - 2 && page <= pagination.page + 2)
                        ) {
                          return (
                            <button
                              key={page}
                              onClick={() => handlePageChange(page)}
                              className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium ${page === pagination.page
                                ? 'z-10 bg-primary-50 border-primary-500 text-primary-600'
                                : 'bg-white border-gray-300 text-gray-500 hover:bg-gray-50'
                                }`}
                            >
                              {page}
                            </button>
                          );
                        } else if (
                          (page === pagination.page - 3 && pagination.page > 4) ||
                          (page === pagination.page + 3 && pagination.page < pagination.totalPages - 3)
                        ) {
                          return (
                            <span
                              key={page}
                              className="relative inline-flex items-center px-4 py-2 border border-gray-300 bg-white text-sm font-medium text-gray-700"
                            >
                              ...
                            </span>
                          );
                        }
                        return null;
                      })}

                      <button
                        onClick={() => handlePageChange(pagination.page + 1)}
                        disabled={pagination.page >= pagination.totalPages}
                        className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <ChevronRight className="h-5 w-5" />
                      </button>
                    </nav>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default OrderList;
