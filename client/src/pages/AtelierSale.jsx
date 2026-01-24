import React, { useState, useEffect } from 'react';
import {
  ArrowLeft,
  Check,
  Plus,
  Search,
  Filter,
  Palette,
  CheckCircle,
  X,
  ArrowRight,
  ShoppingBag,
  CalendarDays
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import NewOrderModal from '../components/orders/NewOrderModal';
import OrderDetailModal from '../components/orders/OrderDetailModal'; // Import new modal
import { ordersAPI } from '../lib/api';

// Mock data - replace with actual API calls
const mockClients = [
  { id: '1', firstName: 'John', lastName: 'Doe', fullName: 'John Doe', email: 'john@example.com', phone: '+1234567890' },
  { id: '2', firstName: 'Jane', lastName: 'Smith', fullName: 'Jane Smith', email: 'jane@example.com', phone: '+0987654321' }
];

const mockInventoryItems = [
  {
    id: '1',
    itemName: 'Premium Wool Fabric',
    supplierName: 'Textile Co',
    sku: 'WF001',
    itemCode: 'WF001',
    quantityAvailable: 50,
    unitOfMeasure: 'yards',
    sellingPrice: 45.00,
    itemType: 'fabric',
    widthCm: 140,
    imageUrl: 'https://images.unsplash.com/photo-1586105251261-72a756497a11?w=400'
  },
  {
    id: '2',
    itemName: 'Silk Lining',
    supplierName: 'Luxury Textiles',
    sku: 'SL001',
    itemCode: 'SL001',
    quantityAvailable: 30,
    unitOfMeasure: 'yards',
    sellingPrice: 25.00,
    itemType: 'fabric',
    widthCm: 110,
    imageUrl: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400'
  }
];

const mockTailors = [
  { id: '1', firstName: 'Master', lastName: 'Taylor', role: { roleName: 'Senior Tailor' } },
  { id: '2', firstName: 'Expert', lastName: 'Seamstress', role: { roleName: 'Master Tailor' } }
];


import TranslatedText from '../components/TranslatedText';
import { useTranslation } from '../hooks/useTranslation';

export default function AtelierSale() {
  const { tSync } = useTranslation();
  const [showNewOrderModal, setShowNewOrderModal] = useState(false);
  const [atelierOrders, setAtelierOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);

  useEffect(() => {
    fetchAtelierOrders();
  }, []);

  const handleViewOrder = async (orderId) => {
    try {
      const response = await ordersAPI.getById(orderId);
      setSelectedOrder(response.data);
      setShowDetailModal(true);
    } catch (error) {
      console.error('Error fetching order details:', error);
      toast.error(tSync('Failed to load order details'));
    }
  };

  const handleEditOrder = (order) => {
    toast.info('Edit functionality coming soon');
  };

  const handleStatusUpdate = (order, newStatus) => {
    toast.info('Status update functionality coming soon');
  };

  const fetchAtelierOrders = async () => {
    try {
      setLoading(true);
      const params = {
        is_atelier: 'true',
        search: searchTerm || undefined,
        status: filterStatus !== 'all' ? filterStatus : undefined,
        limit: 20
      };
      const response = await ordersAPI.getAll(params);
      setAtelierOrders(response.data.orders || []);
    } catch (error) {
      console.error('Error fetching atelier orders:', error);
      toast.error(tSync('Failed to load atelier orders') || 'Failed to load atelier orders');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateAtelierOrder = () => {
    setShowNewOrderModal(true);
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center">
            <Palette className="h-8 w-8 mr-3 text-purple-600" />
            <TranslatedText text="Atelier Orders" />
          </h1>
          <p className="text-gray-600 mt-2"><TranslatedText text="Manage your custom tailoring orders" /></p>
        </div>
        <button
          onClick={handleCreateAtelierOrder}
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-purple-600 hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 transition-all duration-200 hover:shadow-lg"
        >
          <Plus className="w-4 h-4 mr-2" />
          <TranslatedText text="New Atelier Order" />
        </button>
      </div>

      {/* Search and Filter */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
              <input
                type="text"
                placeholder={tSync('Search orders...')}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Filter className="h-5 w-5 text-gray-400" />
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            >
              <option value="all">{tSync('All Status')}</option>
              <option value="pending">{tSync('Pending')}</option>
              <option value="in_progress">{tSync('Processing')}</option>
              <option value="completed">{tSync('Completed')}</option>
              <option value="cancelled">{tSync('Cancelled')}</option>
            </select>
          </div>
        </div>
      </div>

      {/* Atelier Orders List */}
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900"><TranslatedText text="Atelier Orders" /></h2>
          <p className="text-sm text-gray-600"><TranslatedText text="Manage your custom tailoring orders" /></p>
        </div>

        {loading ? (
          <div className="p-8 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-purple-600 mx-auto"></div>
            <p className="text-gray-500 mt-2"><TranslatedText text="Loading orders..." /></p>
          </div>
        ) : atelierOrders.length === 0 ? (
          <div className="p-8 text-center">
            <Palette className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2"><TranslatedText text="No orders found" /></h3>
            <p className="text-gray-500 mb-4">
              <TranslatedText text="Get started by creating your first atelier order." />
            </p>
            <button
              onClick={handleCreateAtelierOrder}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-purple-600 bg-purple-100 hover:bg-purple-200 transition-colors"
            >
              <Plus className="w-4 h-4 mr-2" />
              <TranslatedText text="Create First Order" />
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    <TranslatedText text="Order ID" />
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    <TranslatedText text="Customer" />
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    <TranslatedText text="Status" />
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    <TranslatedText text="Total" />
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    <TranslatedText text="Date" />
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    <TranslatedText text="Actions" />
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {atelierOrders.map((order) => (
                  <tr key={order.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">#{order.order_number}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{order.customer_name || 'Walk-in Customer'}</div>
                      <div className="text-xs text-gray-500">{order.customer_email}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${order.status === 'completed' ? 'bg-green-100 text-green-800' :
                        order.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                          order.status === 'cancelled' ? 'bg-red-100 text-red-800' :
                            'bg-blue-100 text-blue-800'
                        }`}>
                        {order.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'RWF' }).format(order.total_amount)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(order.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <button
                        onClick={() => handleViewOrder(order.id)}
                        className="text-purple-600 hover:text-purple-900"
                      >
                        <TranslatedText text="View" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Quick Stats moved up or kept here */}

      {/* ... previous content ... */}

      {/* Order Detail Modal */}
      <OrderDetailModal
        isOpen={showDetailModal}
        onClose={() => setShowDetailModal(false)}
        order={selectedOrder}
        onEdit={handleEditOrder}
        onStatusUpdate={handleStatusUpdate}
      />

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <ShoppingBag className="h-8 w-8 text-purple-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500"><TranslatedText text="Total Atelier Orders" /></p>
              <p className="text-2xl font-semibold text-gray-900">
                {atelierOrders.length}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="h-8 w-8 bg-yellow-100 rounded-lg flex items-center justify-center">
                <span className="text-yellow-600 font-bold">⏳</span>
              </div>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500"><TranslatedText text="In Progress" /></p>
              <p className="text-2xl font-semibold text-gray-900">
                {atelierOrders.filter(order => order.status === 'in_progress').length}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="h-8 w-8 bg-green-100 rounded-lg flex items-center justify-center">
                <span className="text-green-600 font-bold">✓</span>
              </div>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500"><TranslatedText text="Completed" /></p>
              <p className="text-2xl font-semibold text-gray-900">
                {atelierOrders.filter(order => order.status === 'completed').length}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* New Order Modal */}
      <NewOrderModal
        isOpen={showNewOrderModal}
        onClose={() => setShowNewOrderModal(false)}
        onOrderCreated={() => {
          fetchAtelierOrders();
          // Don't close immediately to let user see success step if they want, 
          // or rely on them closing it. But refreshing the list in background is good.
        }}
      />
    </div>
  );
}