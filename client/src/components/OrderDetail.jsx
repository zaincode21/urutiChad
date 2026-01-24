import React, { useState, useEffect } from 'react';
import {
  X,
  User,
  Calendar,
  CreditCard,
  Package,
  DollarSign,
  MapPin,
  Phone,
  Mail,
  FileText,
  Download,
  Printer,
  RefreshCw,
  CheckCircle,
  Clock,
  AlertTriangle,
  XCircle,
  Edit,
  Receipt,
  Store
} from 'lucide-react';
import { api } from '../lib/api';
import toast from 'react-hot-toast';
import InvoiceGenerator from './InvoiceGenerator';
import TranslatedText from './TranslatedText';
import { useTranslation } from '../hooks/useTranslation';

const OrderDetail = ({ orderId, onClose, onEdit }) => {
  const { tSync } = useTranslation();
  const [orderData, setOrderData] = useState(null);
  const [orderItems, setOrderItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [showInvoiceGenerator, setShowInvoiceGenerator] = useState(false);

  useEffect(() => {
    if (orderId) {
      fetchOrderDetails();
    }
  }, [orderId]);

  const fetchOrderDetails = async () => {
    try {
      setLoading(true);
      const response = await api.get(`/orders/${orderId}`);
      const orderData = response.data;
      setOrderData(orderData);

      // Try to fetch order items, but don't fail if it doesn't work
      try {
        await fetchOrderItems();
      } catch (itemsError) {
        console.log('Could not fetch order items separately, checking order data...');
        // Check if the order data itself contains items
        if (orderData && orderData.items && Array.isArray(orderData.items)) {
          console.log('Using items from order data');
          setOrderItems(orderData.items);
        } else {
          setOrderItems([]);
        }
      }
    } catch (error) {
      console.error('Error fetching order details:', error);
      toast.error(t('detail.errorLoading') || 'Failed to load order details');
    } finally {
      setLoading(false);
    }
  };

  const fetchOrderItems = async () => {
    try {
      const response = await api.get(`/orders/${orderId}/items`);
      console.log('Order items response:', response.data);
      setOrderItems(response.data || []);
    } catch (error) {
      console.error('Error fetching order items:', error);
      throw error; // Re-throw to be caught by the caller
    }
  };

  const updateOrderStatus = async (newStatus) => {
    try {
      setUpdatingStatus(true);
      await api.put(`/orders/${orderId}/status`, { status: newStatus });

      setOrderData(prev => ({
        ...prev,
        status: newStatus
      }));

      toast.success('Order status updated successfully');
    } catch (error) {
      console.error('Error updating order status:', error);
      toast.error('Failed to update order status');
    } finally {
      setUpdatingStatus(false);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'processing':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'cancelled':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'refunded':
        return 'bg-purple-100 text-purple-800 border-purple-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
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
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const printOrder = () => {
    window.print();
  };

  const downloadReceipt = () => {
    // In a real app, this would generate and download a PDF receipt
    toast.success('Receipt download functionality would be implemented here');
  };

  const openInvoiceGenerator = () => {
    setShowInvoiceGenerator(true);
  };

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-lg p-8 text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto mb-4"></div>
          <p className="text-gray-600">{t('common:loading')}</p>
        </div>
      </div>
    );
  }

  if (!orderData) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-lg p-8 text-center">
          <XCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <p className="text-gray-600">{t('detail.notFound') || 'Order not found'}</p>
          <button
            onClick={onClose}
            className="mt-4 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
          >
            {t('detail.close')}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <div className="flex items-center">
            <Package className="h-6 w-6 text-primary-500 mr-3" />
            <div>
              <h2 className="text-xl font-semibold text-gray-900">
                {t('detail.title')} {orderData.order_number}
              </h2>
              <p className="text-sm text-gray-500">
                {t('detail.created')} {formatDate(orderData.created_at)}
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={openInvoiceGenerator}
              className="p-2 text-gray-500 hover:text-gray-700 transition-colors"
              title="Generate Invoice/Receipt"
            >
              <Receipt className="h-5 w-5" />
            </button>
            <button
              onClick={printOrder}
              className="p-2 text-gray-500 hover:text-gray-700 transition-colors"
              title="Print Order"
            >
              <Printer className="h-5 w-5" />
            </button>
            <button
              onClick={downloadReceipt}
              className="p-2 text-gray-500 hover:text-gray-700 transition-colors"
              title="Download Receipt"
            >
              <Download className="h-5 w-5" />
            </button>
            {onEdit && (
              <button
                onClick={() => onEdit(orderData)}
                className="p-2 text-gray-500 hover:text-gray-700 transition-colors"
                title="Edit Order"
              >
                <Edit className="h-5 w-5" />
              </button>
            )}
            <button
              onClick={onClose}
              className="p-2 text-gray-500 hover:text-gray-700 transition-colors"
              title={t('detail.close')}
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        <div className="p-6 space-y-6">
          {/* Order Status & Actions */}
          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
            <div className="flex items-center">
              <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium border ${getStatusColor(orderData.status)}`}>
                {getStatusIcon(orderData.status)}
                <span className="ml-2 capitalize">{orderData.status}</span>
              </span>
            </div>

            {orderData.status !== 'completed' && orderData.status !== 'cancelled' && (
              <div className="flex items-center space-x-2">
                <span className="text-sm text-gray-600">{t('detail.updateStatus')}</span>
                <select
                  value={orderData.status}
                  onChange={(e) => updateOrderStatus(e.target.value)}
                  disabled={updatingStatus}
                  className="px-3 py-1 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-primary-500 disabled:opacity-50"
                >
                  <option value="pending">{t('status.pending')}</option>
                  <option value="processing">{t('status.processing')}</option>
                  <option value="completed">{t('status.completed')}</option>
                  <option value="cancelled">{t('status.cancelled')}</option>
                  <option value="refunded">{t('status.refunded')}</option>
                </select>
                {updatingStatus && (
                  <RefreshCw className="h-4 w-4 animate-spin text-gray-400" />
                )}
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Customer Information */}
            <div className="bg-white border border-gray-200 rounded-lg p-4">
              <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
                <User className="h-5 w-5 mr-2" />
                {t('detail.customerInfo')}
              </h3>

              {orderData.first_name ? (
                <div className="space-y-3">
                  <div>
                    <p className="font-medium text-gray-900">
                      {orderData.first_name} {orderData.last_name}
                    </p>
                  </div>

                  {orderData.email && (
                    <div className="flex items-center text-sm text-gray-600">
                      <Mail className="h-4 w-4 mr-2" />
                      {orderData.email}
                    </div>
                  )}

                  {orderData.phone && (
                    <div className="flex items-center text-sm text-gray-600">
                      <Phone className="h-4 w-4 mr-2" />
                      {orderData.phone}
                    </div>
                  )}

                  {orderData.address && (
                    <div className="flex items-start text-sm text-gray-600">
                      <MapPin className="h-4 w-4 mr-2 mt-0.5" />
                      <div>
                        <p>{orderData.address}</p>
                        {(orderData.city || orderData.state || orderData.country) && (
                          <p>
                            {[orderData.city, orderData.state, orderData.country]
                              .filter(Boolean)
                              .join(', ')}
                          </p>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-gray-500 italic">{t('detail.guestOrder')}</p>
              )}
            </div>

            {/* Shop Information */}
            {orderData.shop_name && (
              <div className="bg-white border border-gray-200 rounded-lg p-4">
                <h3 className="text-lg font-medium text-gray-900 mb-3 flex items-center">
                  <Store className="h-5 w-5 mr-2" />
                  {t('detail.shopInfo')}
                </h3>

                <div className="space-y-2">
                  <div>
                    <p className="font-medium text-gray-900">{orderData.shop_name}</p>
                  </div>

                  {orderData.shop_address && (
                    <div className="flex items-start text-sm text-gray-600">
                      <MapPin className="h-4 w-4 mr-2 mt-0.5" />
                      <p>{orderData.shop_address}</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Order Summary */}
            <div className="bg-white border border-gray-200 rounded-lg p-4">
              <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
                <DollarSign className="h-5 w-5 mr-2" />
                {t('detail.orderSummary')}
              </h3>

              <div className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">{t('detail.subtotal')}:</span>
                  <span className="font-medium">${orderData.subtotal} {orderData.currency}</span>
                </div>

                {orderData.discount_amount > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">{t('detail.discount')}:</span>
                    <span className="font-medium text-green-600">
                      -${orderData.discount_amount} {orderData.currency}
                    </span>
                  </div>
                )}

                {orderData.loyalty_discount > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">{t('detail.loyaltyDiscount')}:</span>
                    <span className="font-medium text-green-600">
                      -${orderData.loyalty_discount} {orderData.currency}
                    </span>
                  </div>
                )}

                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">{t('detail.tax')}:</span>
                  <span className="font-medium">${orderData.tax_amount} {orderData.currency}</span>
                </div>

                <div className="border-t border-gray-200 pt-3">
                  <div className="flex justify-between">
                    <span className="text-lg font-medium text-gray-900">{t('detail.total')}:</span>
                    <span className="text-lg font-bold text-primary-600">
                      ${orderData.total_amount} {orderData.currency}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Payment Information */}
            <div className="bg-white border border-gray-200 rounded-lg p-4">
              <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
                <CreditCard className="h-5 w-5 mr-2" />
                {t('detail.paymentInfo')}
              </h3>

              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">{t('detail.paymentMethod')}:</span>
                  <span className="font-medium capitalize">
                    {orderData.payment_method || t('list.notSpecified')}
                  </span>
                </div>

                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">{t('detail.paymentStatus')}:</span>
                  <span className={`font-medium capitalize ${orderData.payment_status === 'completed' ? 'text-green-600' :
                    orderData.payment_status === 'failed' ? 'text-red-600' : 'text-yellow-600'
                    }`}>
                    {orderData.payment_status || 'Pending'}
                  </span>
                </div>
              </div>
            </div>

            {/* Order Details */}
            <div className="bg-white border border-gray-200 rounded-lg p-4">
              <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
                <Calendar className="h-5 w-5 mr-2" />
                {t('detail.orderDetails')}
              </h3>

              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Order ID:</span>
                  <span className="font-mono text-xs">{orderData.id}</span>
                </div>

                <div className="flex justify-between">
                  <span className="text-gray-600">{t('detail.orderType')}:</span>
                  <span className="capitalize">{orderData.order_type || 'Regular'}</span>
                </div>

                <div className="flex justify-between">
                  <span className="text-gray-600">{t('detail.created')}:</span>
                  <span>{formatDate(orderData.created_at)}</span>
                </div>

                {orderData.updated_at !== orderData.created_at && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">{t('detail.lastUpdated')}:</span>
                    <span>{formatDate(orderData.updated_at)}</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Order Items */}
          <div className="bg-white border border-gray-200 rounded-lg">
            <div className="px-4 py-3 border-b border-gray-200">
              <h3 className="text-lg font-medium text-gray-900 flex items-center">
                <Package className="h-5 w-5 mr-2" />
                {t('detail.itemsCount', { count: orderItems?.length || 0 })}
              </h3>
            </div>

            <div className="divide-y divide-gray-100">
              {orderItems && orderItems.length > 0 ? (
                orderItems.map((item, index) => (
                  <div key={item.id || index} className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <h4 className="font-medium text-gray-900">
                          {item.product_name || item.name || 'Unknown Product'}
                        </h4>
                        <p className="text-sm text-gray-600">
                          {item.sku || 'N/A'}
                        </p>
                        <p className="text-sm text-gray-500">
                          ${(item.unit_price || item.price || 0).toFixed(2)} {item.currency || 'RWF'} × {item.quantity || 0}
                        </p>
                      </div>

                      <div className="text-right">
                        <p className="font-medium text-gray-900">
                          ${(item.total_price || item.total || 0).toFixed(2)} {item.currency || 'RWF'}
                        </p>
                        {item.discount_percent > 0 && (
                          <p className="text-xs text-green-600">
                            {item.discount_percent}% discount
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="p-8 text-center text-gray-500">
                  <Package className="h-8 w-8 mx-auto mb-2 text-gray-400" />
                  <p>{t('detail.noItems')}</p>
                  <p className="text-xs text-gray-400 mt-1">
                    {loading ? t('detail.loadingItems') : 'This order has no items or items could not be loaded'}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Notes */}
          {orderData.notes && (
            <div className="bg-white border border-gray-200 rounded-lg p-4">
              <h3 className="text-lg font-medium text-gray-900 mb-3 flex items-center">
                <FileText className="h-5 w-5 mr-2" />
                {t('detail.notes')}
              </h3>
              <p className="text-gray-700 whitespace-pre-wrap">{orderData.notes}</p>
            </div>
          )}
        </div>
      </div>

      {/* Invoice Generator Modal */}
      {showInvoiceGenerator && (
        <InvoiceGenerator
          orderId={orderId}
          orderNumber={orderData.order_number}
          onClose={() => setShowInvoiceGenerator(false)}
        />
      )}
    </div>
  );
};

export default OrderDetail;
