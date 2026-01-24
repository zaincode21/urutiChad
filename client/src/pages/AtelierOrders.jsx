import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import TranslatedText from '../components/TranslatedText';
import { useTranslation } from '../hooks/useTranslation';
import {
  Plus,
  ShoppingCart,
  Search,
  Filter,
  Eye,
  Edit,
  Calendar,
  User,
  Package,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  Download,
  DollarSign,
  CreditCard,
  Truck
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { ordersAPI } from '../lib/api';
import LoadingSpinner from '../components/LoadingSpinner';
import toast from 'react-hot-toast';
import OrderDetailModal from '../components/orders/OrderDetailModal';
import NewOrderModal from '../components/orders/NewOrderModal';

const AtelierOrders = () => {
  const { tSync } = useTranslation();
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [showOrderDetail, setShowOrderDetail] = useState(false);
  const [showNewOrderModal, setShowNewOrderModal] = useState(false);

  // Fetch atelier orders using the server-side filter
  const { data: ordersData, isLoading, error, refetch } = useQuery({
    queryKey: ['atelier-orders', searchTerm, statusFilter],
    queryFn: async () => {
      const params = {
        is_atelier: 'true', // Filter for atelier orders only
        search: searchTerm || undefined,
        status: statusFilter !== 'all' ? statusFilter : undefined,
        limit: 50, // Get more orders for better filtering
      };
      const response = await ordersAPI.getAll(params);
      return response.data;
    },
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  const orders = ordersData?.orders || [];

  const getStatusColor = (status) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'processing':
        return 'bg-blue-100 text-blue-800';
      case 'cancelled':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-4 w-4" />;
      case 'pending':
        return <Clock className="h-4 w-4" />;
      case 'processing':
        return <AlertCircle className="h-4 w-4" />;
      case 'cancelled':
        return <XCircle className="h-4 w-4" />;
      default:
        return <Package className="h-4 w-4" />;
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'CFA',
      minimumFractionDigits: 0,
    }).format(amount || 0);
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const handleCreateNewOrder = () => {
    setShowNewOrderModal(true);
  };

  const handleViewOrder = async (order) => {
    try {
      // Fetch detailed order information including items
      const response = await ordersAPI.getById(order.id);
      const detailedOrder = response.data;

      setSelectedOrder(detailedOrder);
      setShowOrderDetail(true);
    } catch (error) {
      console.error('Error fetching order details:', error);
      toast.error('Failed to load order details');
      // Fallback to basic order info
      setSelectedOrder(order);
      setShowOrderDetail(true);
    }
  };

  const handleEditOrder = (order) => {
    // Navigate to edit order or show edit modal
    toast.info('Edit functionality coming soon');
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-64">
        <LoadingSpinner />
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <div className="text-red-500 mb-4">
          <XCircle className="h-12 w-12 mx-auto" />
        </div>
        <h3 className="text-lg font-medium text-gray-900 mb-2">
          <TranslatedText text="Error loading orders" />
        </h3>
        <p className="text-gray-600 mb-4">
          <TranslatedText text="There was a problem loading the atelier orders." />
        </p>
        <button
          onClick={() => refetch()}
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700"
        >
          <TranslatedText text="Try Again" />
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center">
            <ShoppingCart className="h-8 w-8 mr-3 text-blue-600" />
            <TranslatedText text="Atelier Orders" />
          </h1>
          <p className="text-gray-600 mt-2">
            <TranslatedText text="Manage custom clothing orders and tailoring requests" />
          </p>
        </div>
        <button
          onClick={handleCreateNewOrder}
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-all duration-200"
        >
          <Plus className="h-4 w-4 mr-2" />
          <TranslatedText text="New Atelier Order" />
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search orders..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          {/* Status Filter */}
          <div className="relative">
            <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 appearance-none"
            >
              <option value="all">
                {tSync("All Statuses")}
              </option>
              <option value="pending">
                {tSync("Pending")}
              </option>
              <option value="processing">
                {tSync("Processing")}
              </option>
              <option value="completed">
                {tSync("Completed")}
              </option>
              <option value="cancelled">
                {tSync("Cancelled")}
              </option>
            </select>
          </div>

          {/* Results Count */}
          <div className="flex items-center text-sm text-gray-600">
            <Package className="h-4 w-4 mr-2" />
            <span>
              {orders.length} <TranslatedText text="orders found" />
            </span>
          </div>
        </div>
      </div>

      {/* Orders List */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        {orders.length === 0 ? (
          <div className="text-center py-12">
            <ShoppingCart className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              <TranslatedText text="No atelier orders found" />
            </h3>
            <p className="text-gray-600 mb-4">
              <TranslatedText text="Get started by creating your first atelier order" />
            </p>
            <button
              onClick={handleCreateNewOrder}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700"
            >
              <Plus className="h-4 w-4 mr-2" />
              <TranslatedText text="Create First Order" />
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    <TranslatedText text="Order" />
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    <TranslatedText text="Customer" />
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    <TranslatedText text="Date" />
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    <TranslatedText text="Cost Material" />
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    <TranslatedText text="Labor Cost" />
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    <TranslatedText text="Status" />
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    <TranslatedText text="Actions" />
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {orders.map((order) => (
                  <tr key={order.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-10 w-10">
                          <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
                            <ShoppingCart className="h-5 w-5 text-blue-600" />
                          </div>
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900">
                            #{order.order_number}
                          </div>
                          <div className="text-sm text-gray-500">
                            <TranslatedText text="Atelier Order" />
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <User className="h-4 w-4 text-gray-400 mr-2" />
                        <div>
                          <div className="text-sm font-medium text-gray-900">
                            {order.customer_name || 'Unknown Customer'}
                          </div>
                          <div className="text-sm text-gray-500">
                            {order.customer_email}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <Calendar className="h-4 w-4 text-gray-400 mr-2" />
                        <div className="text-sm text-gray-900">
                          {formatDate(order.created_at)}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        {formatCurrency(order.total_amount - (order.labor_cost || 0))}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-500">
                        {formatCurrency(order.labor_cost)}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(order.status)}`}>
                        {getStatusIcon(order.status)}
                        <span className="ml-1 capitalize">{order.status}</span>
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => handleViewOrder(order)}
                          className="text-blue-600 hover:text-blue-900 p-1 rounded hover:bg-blue-50"
                          title="View Order"
                        >
                          <Eye className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleEditOrder(order)}
                          className="text-gray-600 hover:text-gray-900 p-1 rounded hover:bg-gray-50"
                          title="Edit Order"
                        >
                          <Edit className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Order Detail Modal */}
      {showOrderDetail && selectedOrder && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-10 mx-auto p-5 border w-11/12 max-w-6xl shadow-lg rounded-md bg-white">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-semibold text-gray-900">
                <TranslatedText text="Atelier Order Details" /> - #{selectedOrder.order_number}
              </h3>
              <button
                onClick={() => setShowOrderDetail(false)}
                className="text-gray-400 hover:text-gray-600 p-2 rounded-full hover:bg-gray-100"
              >
                <XCircle className="h-6 w-6" />
              </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Left Column - Order Information */}
              <div className="lg:col-span-2 space-y-6">
                {/* Customer Information */}
                <div className="bg-gray-50 rounded-lg p-4">
                  <h4 className="font-semibold text-gray-900 mb-3 flex items-center">
                    <User className="h-5 w-5 mr-2 text-blue-600" />
                    <TranslatedText text="Customer Information" />
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-gray-600">
                        <strong><TranslatedText text="Name" />:</strong> {selectedOrder.first_name} {selectedOrder.last_name}
                      </p>
                      <p className="text-sm text-gray-600">
                        <strong><TranslatedText text="Email" />:</strong> {selectedOrder.email || 'N/A'}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">
                        <strong><TranslatedText text="Phone" />:</strong> {selectedOrder.phone || 'N/A'}
                      </p>
                      <p className="text-sm text-gray-600">
                        <strong><TranslatedText text="Customer ID" />:</strong> {selectedOrder.customer_id}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Order Items */}
                <div className="bg-white border rounded-lg p-4">
                  <h4 className="font-semibold text-gray-900 mb-3 flex items-center">
                    <Package className="h-5 w-5 mr-2 text-green-600" />
                    <TranslatedText text="Order Items" />
                  </h4>
                  {selectedOrder.items && selectedOrder.items.length > 0 ? (
                    <div className="space-y-3">
                      {selectedOrder.items.map((item, index) => (
                        <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                          <div className="flex items-center space-x-3">
                            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                              <Package className="h-6 w-6 text-blue-600" />
                            </div>
                            <div>
                              <p className="font-medium text-gray-900">{item.product_name || 'Atelier Item'}</p>
                              <p className="text-sm text-gray-600">SKU: {item.sku || 'N/A'}</p>
                              {item.is_atelier_item && (
                                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                                  <TranslatedText text="Custom Item" />
                                </span>
                              )}
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="font-medium text-gray-900">
                              <TranslatedText text="Qty" />: {item.quantity}
                            </p>
                            <p className="text-sm text-gray-600">
                              {formatCurrency(item.unit_price)} <TranslatedText text="each" />
                            </p>
                            <p className="font-semibold text-blue-600">
                              {formatCurrency(item.total_price)}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-gray-500 text-center py-4">
                      <TranslatedText text="No items found for this order" />
                    </p>
                  )}
                </div>

                {/* Measurements & Specifications */}
                {selectedOrder.notes && (
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                    <h4 className="font-semibold text-gray-900 mb-3 flex items-center">
                      <AlertCircle className="h-5 w-5 mr-2 text-yellow-600" />
                      <TranslatedText text="Order Notes & Specifications" />
                    </h4>
                    <div className="text-sm text-gray-700 whitespace-pre-wrap">
                      {selectedOrder.notes}
                    </div>
                  </div>
                )}

                {/* Shipping & Billing Addresses */}
                {(selectedOrder.shipping_address || selectedOrder.billing_address) && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {selectedOrder.shipping_address && (
                      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                        <h4 className="font-semibold text-gray-900 mb-2 flex items-center">
                          <Truck className="h-4 w-4 mr-2 text-blue-600" />
                          <TranslatedText text="Shipping Address" />
                        </h4>
                        <div className="text-sm text-gray-600">
                          {typeof selectedOrder.shipping_address === 'object' ? (
                            <>
                              <p>{selectedOrder.shipping_address.street}</p>
                              <p>{selectedOrder.shipping_address.city}, {selectedOrder.shipping_address.state}</p>
                              <p>{selectedOrder.shipping_address.postal_code}</p>
                              <p>{selectedOrder.shipping_address.country}</p>
                            </>
                          ) : (
                            <p>{selectedOrder.shipping_address}</p>
                          )}
                        </div>
                      </div>
                    )}

                    {selectedOrder.billing_address && (
                      <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                        <h4 className="font-semibold text-gray-900 mb-2 flex items-center">
                          <CreditCard className="h-4 w-4 mr-2 text-green-600" />
                          <TranslatedText text="Billing Address" />
                        </h4>
                        <div className="text-sm text-gray-600">
                          {typeof selectedOrder.billing_address === 'object' ? (
                            <>
                              <p>{selectedOrder.billing_address.street}</p>
                              <p>{selectedOrder.billing_address.city}, {selectedOrder.billing_address.state}</p>
                              <p>{selectedOrder.billing_address.postal_code}</p>
                              <p>{selectedOrder.billing_address.country}</p>
                            </>
                          ) : (
                            <p>{selectedOrder.billing_address}</p>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Right Column - Order Summary & Actions */}
              <div className="space-y-6">
                {/* Order Summary */}
                <div className="bg-white border rounded-lg p-4">
                  <h4 className="font-semibold text-gray-900 mb-3 flex items-center">
                    <Calendar className="h-5 w-5 mr-2 text-purple-600" />
                    <TranslatedText text="Order Summary" />
                  </h4>
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600"><TranslatedText text="Order Date" />:</span>
                      <span className="text-sm font-medium">{formatDate(selectedOrder.created_at)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600"><TranslatedText text="Status" />:</span>
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(selectedOrder.status)}`}>
                        {getStatusIcon(selectedOrder.status)}
                        <span className="ml-1 capitalize">{selectedOrder.status}</span>
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600"><TranslatedText text="Payment Method" />:</span>
                      <span className="text-sm font-medium capitalize">{selectedOrder.payment_method || 'N/A'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600"><TranslatedText text="Payment Status" />:</span>
                      <span className={`text-sm font-medium ${selectedOrder.payment_status === 'completed' ? 'text-green-600' : selectedOrder.payment_status === 'pending' ? 'text-yellow-600' : 'text-red-600'}`}>
                        {selectedOrder.payment_status || 'N/A'}
                      </span>
                    </div>
                    {selectedOrder.shop_name && (
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600"><TranslatedText text="Shop" />:</span>
                        <span className="text-sm font-medium">{selectedOrder.shop_name}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Financial Summary */}
                <div className="bg-gray-50 border rounded-lg p-4">
                  <h4 className="font-semibold text-gray-900 mb-3 flex items-center">
                    <DollarSign className="h-5 w-5 mr-2 text-green-600" />
                    <TranslatedText text="Financial Summary" />
                  </h4>
                  <div className="space-y-2">
                    {selectedOrder.subtotal && (
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600"><TranslatedText text="Subtotal" />:</span>
                        <span className="text-sm font-medium">{formatCurrency(selectedOrder.subtotal)}</span>
                      </div>
                    )}
                    {selectedOrder.tax_amount && (
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600"><TranslatedText text="Tax" />:</span>
                        <span className="text-sm font-medium">{formatCurrency(selectedOrder.tax_amount)}</span>
                      </div>
                    )}
                    {selectedOrder.discount_amount && (
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600"><TranslatedText text="Discount" />:</span>
                        <span className="text-sm font-medium text-red-600">-{formatCurrency(selectedOrder.discount_amount)}</span>
                      </div>
                    )}
                    <div className="border-t pt-2">
                      <div className="flex justify-between">
                        <span className="font-semibold text-gray-900"><TranslatedText text="Total Amount" />:</span>
                        <span className="font-bold text-lg text-blue-600">{formatCurrency(selectedOrder.total_amount)}</span>
                      </div>
                    </div>
                    {selectedOrder.amount_paid && (
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600"><TranslatedText text="Amount Paid" />:</span>
                        <span className="text-sm font-medium text-green-600">{formatCurrency(selectedOrder.amount_paid)}</span>
                      </div>
                    )}
                    {selectedOrder.remaining_amount && (
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600"><TranslatedText text="Remaining" />:</span>
                        <span className="text-sm font-medium text-orange-600">{formatCurrency(selectedOrder.remaining_amount)}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="space-y-3">
                  <button
                    onClick={() => handleEditOrder(selectedOrder)}
                    className="w-full px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                  >
                    <Edit className="h-4 w-4 mr-2 inline" />
                    <TranslatedText text="Edit Order" />
                  </button>

                  <button
                    onClick={() => {
                      // Print or download order details
                      window.print();
                    }}
                    className="w-full px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                  >
                    <Download className="h-4 w-4 mr-2 inline" />
                    <TranslatedText text="Print Order" />
                  </button>

                  {selectedOrder.status === 'pending' && (
                    <button
                      onClick={() => {
                        // Update order status
                        toast.info('Status update functionality coming soon');
                      }}
                      className="w-full px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
                    >
                      <CheckCircle className="h-4 w-4 mr-2 inline" />
                      <TranslatedText text="Mark as Processing" />
                    </button>
                  )}
                </div>
              </div>
            </div>

            <div className="mt-6 flex justify-end">
              <button
                onClick={() => setShowOrderDetail(false)}
                className="px-6 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                <TranslatedText text="Close" />
              </button>
            </div>
          </div>
        </div>
      )}
      {/* New Order Modal */}
      <NewOrderModal
        isOpen={showNewOrderModal}
        onClose={() => setShowNewOrderModal(false)}
        onOrderCreated={() => {
          refetch(); // Refresh the list using React Query's refetch
        }}
      />
    </div>
  );
};

export default AtelierOrders;