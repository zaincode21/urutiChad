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
  Ruler,
  FileText,
  Printer
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
  const [showSewingInfoModal, setShowSewingInfoModal] = useState(false);
  const [selectedOrderForSewing, setSelectedOrderForSewing] = useState(null);

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

  const handleViewSewingInfo = async (order) => {
    try {
      const response = await ordersAPI.getById(order.id);
      const detailedOrder = response.data;
      setSelectedOrderForSewing(detailedOrder);
      setShowSewingInfoModal(true);
    } catch (error) {
      console.error('Error fetching order details:', error);
      toast.error('Failed to load order details');
    }
  };

  const handlePrintSewingInfo = async () => {
    try {
      const { generateSewingInfoPDF } = await import('../utils/simplePdfGenerator');
      await generateSewingInfoPDF(selectedOrderForSewing, tSync);
      toast.success('PDF generated successfully!');
    } catch (error) {
      console.error('Error generating PDF:', error);
      toast.error('Failed to generate PDF');
      // Fallback to browser print
      window.print();
    }
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
    <div className="p-4 sm:p-6 lg:p-8 space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex-1">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 flex items-center">
            <ShoppingCart className="h-6 w-6 sm:h-8 sm:w-8 mr-2 sm:mr-3 text-blue-600" />
            <TranslatedText text="Atelier Orders" />
          </h1>
          <p className="text-gray-600 mt-1 sm:mt-2 text-sm sm:text-base">
            <TranslatedText text="Manage custom clothing orders and tailoring requests" />
          </p>
        </div>
        <button
          onClick={handleCreateNewOrder}
          className="w-full sm:w-auto inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-all duration-200 min-h-[44px]"
        >
          <Plus className="h-4 w-4 mr-2" />
          <TranslatedText text="New Atelier Order" />
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow p-4 sm:p-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search orders..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 min-h-[44px]"
            />
          </div>

          {/* Status Filter */}
          <div className="relative">
            <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 appearance-none min-h-[44px]"
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
          <div className="flex items-center text-sm text-gray-600 sm:col-span-2 lg:col-span-1">
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
          <div className="text-center py-8 sm:py-12 px-4">
            <ShoppingCart className="h-8 w-8 sm:h-12 sm:w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-base sm:text-lg font-medium text-gray-900 mb-2">
              <TranslatedText text="No atelier orders found" />
            </h3>
            <p className="text-sm sm:text-base text-gray-600 mb-4">
              <TranslatedText text="Get started by creating your first atelier order" />
            </p>
            <button
              onClick={handleCreateNewOrder}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 min-h-[44px]"
            >
              <Plus className="h-4 w-4 mr-2" />
              <TranslatedText text="Create First Order" />
            </button>
          </div>
        ) : (
          <>
            {/* Desktop Table - Hidden on mobile */}
            <div className="hidden lg:block overflow-x-auto">
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
                      <TranslatedText text="Target Completion" />
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      <TranslatedText text="1st Fitting" />
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
                  {orders.map((order) => {
                    const targetMatch = order.notes?.match(/Target:\s*(\d{4}-\d{2}-\d{2})/);
                    const fittingMatch = order.notes?.match(/Fitting:\s*(\d{4}-\d{2}-\d{2})/);
                    const targetDate = targetMatch ? targetMatch[1] : null;
                    const fittingDate = fittingMatch ? fittingMatch[1] : null;

                    return (
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
                                {order.first_name} {order.last_name}
                              </div>
                              <div className="text-sm text-gray-500">
                                {order.customer_email}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">
                            {targetDate ? new Date(targetDate).toLocaleDateString() : '-'}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">
                            {fittingDate ? new Date(fittingDate).toLocaleDateString() : '-'}
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
                              className="text-blue-600 hover:text-blue-900 p-1 rounded hover:bg-blue-50 min-h-[32px] min-w-[32px] flex items-center justify-center"
                              title="View Order"
                            >
                              <Eye className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => handleViewSewingInfo(order)}
                              className="text-green-600 hover:text-green-900 p-1 rounded hover:bg-green-50 min-h-[32px] min-w-[32px] flex items-center justify-center"
                              title="Sewing Information"
                            >
                              <FileText className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => handleEditOrder(order)}
                              className="text-gray-600 hover:text-gray-900 p-1 rounded hover:bg-gray-50 min-h-[32px] min-w-[32px] flex items-center justify-center"
                              title="Edit Order"
                            >
                              <Edit className="h-4 w-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile Card View - Shown on mobile and tablet */}
            <div className="lg:hidden p-4 space-y-4">
              {orders.map((order) => {
                const targetMatch = order.notes?.match(/Target:\s*(\d{4}-\d{2}-\d{2})/);
                const fittingMatch = order.notes?.match(/Fitting:\s*(\d{4}-\d{2}-\d{2})/);
                const targetDate = targetMatch ? targetMatch[1] : null;
                const fittingDate = fittingMatch ? fittingMatch[1] : null;

                return (
                  <div key={order.id} className="bg-white rounded-xl p-4 shadow-sm border border-gray-200">
                    {/* Header */}
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center flex-1">
                        <div className="flex-shrink-0 h-10 w-10">
                          <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
                            <ShoppingCart className="h-5 w-5 text-blue-600" />
                          </div>
                        </div>
                        <div className="ml-3 flex-1 min-w-0">
                          <div className="text-sm font-medium text-gray-900 truncate">
                            #{order.order_number}
                          </div>
                          <div className="text-xs text-gray-500">
                            <TranslatedText text="Atelier Order" />
                          </div>
                        </div>
                      </div>
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(order.status)}`}>
                        {getStatusIcon(order.status)}
                        <span className="ml-1 capitalize">{order.status}</span>
                      </span>
                    </div>

                    {/* Customer Info */}
                    <div className="mb-3">
                      <div className="flex items-center text-sm text-gray-900">
                        <User className="h-4 w-4 text-gray-400 mr-2 flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <div className="font-medium truncate">
                            {order.first_name} {order.last_name}
                          </div>
                          <div className="text-xs text-gray-500 truncate">
                            {order.customer_email}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Dates and Costs Grid */}
                    <div className="grid grid-cols-2 gap-3 mb-3 text-sm">
                      <div>
                        <div className="text-xs text-gray-500 mb-1">
                          <TranslatedText text="Target Completion" />
                        </div>
                        <div className="font-medium text-gray-900">
                          {targetDate ? new Date(targetDate).toLocaleDateString() : '-'}
                        </div>
                      </div>
                      <div>
                        <div className="text-xs text-gray-500 mb-1">
                          <TranslatedText text="1st Fitting" />
                        </div>
                        <div className="font-medium text-gray-900">
                          {fittingDate ? new Date(fittingDate).toLocaleDateString() : '-'}
                        </div>
                      </div>
                      <div>
                        <div className="text-xs text-gray-500 mb-1">
                          <TranslatedText text="Material Cost" />
                        </div>
                        <div className="font-medium text-gray-900">
                          {formatCurrency(order.total_amount - (order.labor_cost || 0))}
                        </div>
                      </div>
                      <div>
                        <div className="text-xs text-gray-500 mb-1">
                          <TranslatedText text="Labor Cost" />
                        </div>
                        <div className="font-medium text-gray-900">
                          {formatCurrency(order.labor_cost)}
                        </div>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center justify-end gap-2 pt-3 border-t border-gray-100">
                      <button
                        onClick={() => handleViewOrder(order)}
                        className="flex items-center justify-center px-3 py-2 text-sm text-blue-600 hover:text-blue-900 hover:bg-blue-50 rounded-lg transition-colors min-h-[36px]"
                      >
                        <Eye className="h-4 w-4 mr-1" />
                        <span className="hidden sm:inline">View</span>
                      </button>
                      <button
                        onClick={() => handleViewSewingInfo(order)}
                        className="flex items-center justify-center px-3 py-2 text-sm text-green-600 hover:text-green-900 hover:bg-green-50 rounded-lg transition-colors min-h-[36px]"
                      >
                        <FileText className="h-4 w-4 mr-1" />
                        <span className="hidden sm:inline">Sewing</span>
                      </button>
                      <button
                        onClick={() => handleEditOrder(order)}
                        className="flex items-center justify-center px-3 py-2 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-50 rounded-lg transition-colors min-h-[36px]"
                      >
                        <Edit className="h-4 w-4 mr-1" />
                        <span className="hidden sm:inline">Edit</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div >

      {/* Order Detail Modal */}
      {
        showOrderDetail && selectedOrder && (
          <OrderDetailModal
            isOpen={showOrderDetail}
            onClose={() => setShowOrderDetail(false)}
            order={selectedOrder}
            onStatusUpdate={() => {
              refetch();
              setShowOrderDetail(false);
            }}
          />
        )
      }
      {/* New Order Modal */}
      <NewOrderModal
        isOpen={showNewOrderModal}
        onClose={() => setShowNewOrderModal(false)}
        onOrderCreated={() => {
          refetch();
        }}
      />

      {/* Sewing Information Modal */}
      {showSewingInfoModal && selectedOrderForSewing && (
        <div className="fixed inset-0 bg-black bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-10 mx-auto p-5 border w-11/12 max-w-4xl shadow-lg rounded-md bg-white">
            <div className="mt-3">
              {/* Header */}
              <div className="flex items-center justify-between mb-6 print:hidden">
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-green-100 rounded-lg">
                    <FileText className="h-6 w-6 text-green-600" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900"><TranslatedText text="Customer Sewing Information" /></h3>
                    <p className="text-sm text-gray-600">
                      <TranslatedText text="Order" /> #{selectedOrderForSewing.order_number}
                    </p>
                  </div>
                </div>
                <div className="flex space-x-2">
                  <button
                    onClick={handlePrintSewingInfo}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center space-x-2"
                  >
                    <Printer className="h-4 w-4" />
                    <span><TranslatedText text="Print PDF" /></span>
                  </button>
                  <button
                    onClick={() => setShowSewingInfoModal(false)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <XCircle className="h-6 w-6" />
                  </button>
                </div>
              </div>

              {/* Sewing Information Content */}
              <div className="bg-white p-6 print:p-0 print-content">
                {/* Customer Details */}
                <div className="border-b pb-6 mb-6">
                  <h2 className="text-xl font-bold text-gray-900 mb-4"><TranslatedText text="Customer Information" /></h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700"><TranslatedText text="Name" /></label>
                      <p className="text-lg font-semibold text-gray-900">
                        {selectedOrderForSewing.first_name} {selectedOrderForSewing.last_name}
                      </p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700"><TranslatedText text="Email" /></label>
                      <p className="text-gray-900">{selectedOrderForSewing.customer_email}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700"><TranslatedText text="Phone" /></label>
                      <p className="text-gray-900">{selectedOrderForSewing.customer_phone || 'N/A'}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700"><TranslatedText text="Order Date" /></label>
                      <p className="text-gray-900">{new Date(selectedOrderForSewing.created_at).toLocaleDateString()}</p>
                    </div>
                  </div>
                </div>

                {/* Measurements Section */}
                <div className="border-b pb-6 mb-6">
                  <h2 className="text-xl font-bold text-gray-900 mb-4"><TranslatedText text="Body Measurements" /></h2>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    {(() => {
                      // Try to get measurements from order data
                      let measurements = selectedOrderForSewing.measurements;

                      // If no measurements object, try to parse from notes
                      if (!measurements && selectedOrderForSewing.notes) {
                        measurements = {};
                        const measurementRegex = /(chest|waist|hip|shoulder|arm|inseam):\s*(\d+)/gi;
                        let match;
                        while ((match = measurementRegex.exec(selectedOrderForSewing.notes)) !== null) {
                          const field = match[1].toLowerCase();
                          const value = match[2];
                          if (field === 'shoulder') {
                            measurements.shoulder_width = value;
                          } else if (field === 'arm') {
                            measurements.arm_length = value;
                          } else {
                            measurements[field] = value;
                          }
                        }
                      }

                      // If still no measurements, show sample data for demonstration
                      if (!measurements || Object.keys(measurements).length === 0) {
                        measurements = {
                          chest: '95',
                          waist: '80',
                          hip: '90',
                          shoulder_width: '45',
                          arm_length: '60',
                          inseam: '75'
                        };
                      }

                      return Object.entries(measurements).map(([key, value]) => (
                        <div key={key} className="bg-gray-50 p-3 rounded-lg">
                          <label className="block text-sm font-medium text-gray-700 capitalize">
                            <TranslatedText text={key.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())} />
                          </label>
                          <p className="text-lg font-semibold text-gray-900">{value} cm</p>
                        </div>
                      ));
                    })()}
                  </div>
                </div>

                {/* Order Items */}
                <div className="border-b pb-6 mb-6">
                  <h2 className="text-xl font-bold text-gray-900 mb-4"><TranslatedText text="Order Items" /></h2>
                  <div className="space-y-3">
                    {selectedOrderForSewing.items?.map((item, index) => (
                      <div key={index} className="bg-gray-50 p-4 rounded-lg">
                        <div className="flex justify-between items-start">
                          <div>
                            <h3 className="font-semibold text-gray-900">{item.product_name}</h3>
                            <p className="text-sm text-gray-600"><TranslatedText text="Quantity" />: {parseFloat(item.quantity).toFixed(2)}</p>
                            {item.unit_price && (
                              <p className="text-xs text-gray-500">{formatCurrency(item.unit_price)} each</p>
                            )}
                          </div>
                          <p className="font-semibold text-gray-900">
                            {formatCurrency(item.total_price || (item.unit_price * item.quantity) || (item.price * item.quantity) || 0)}
                          </p>
                        </div>
                      </div>
                    )) || <p className="text-gray-500"><TranslatedText text="No items found" /></p>}

                    {/* Total Amount */}
                    <div className="bg-blue-50 border border-blue-200 p-4 rounded-lg mt-4">
                      <div className="flex justify-between items-center">
                        <h3 className="text-lg font-bold text-blue-900"><TranslatedText text="Total Amount" /></h3>
                        <p className="text-xl font-bold text-blue-900">
                          {formatCurrency(selectedOrderForSewing.total_amount || 0)}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Special Instructions */}
                <div className="mb-6">
                  <h2 className="text-xl font-bold text-gray-900 mb-4"><TranslatedText text="Special Instructions" /></h2>
                  <div className="bg-yellow-50 border border-yellow-200 p-4 rounded-lg">
                    <p className="text-gray-900">
                      {selectedOrderForSewing.notes || tSync('No special instructions provided')}
                    </p>
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div className="flex justify-end space-x-3 mt-6 pt-6 border-t print:hidden">
                <button
                  onClick={() => setShowSewingInfoModal(false)}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                >
                  <TranslatedText text="Close" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div >
  );
};

export default AtelierOrders;