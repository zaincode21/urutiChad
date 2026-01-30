import React, { useState, useEffect } from 'react';
import TranslatedText from '../components/TranslatedText';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Package,
  TrendingUp,
  AlertTriangle,
  Truck,
  Warehouse,
  BarChart3,
  Plus,
  Search,
  Filter,
  Download,
  RefreshCw,
  Eye,
  Edit,
  Trash2,
  CheckCircle,
  XCircle,
  Clock,
  X,
  Calendar,
  MapPin,
  Users,
  DollarSign,
  ShoppingCart,
  ArrowUpDown,
  FileText,
  Settings,
  ArrowRight,
  ArrowLeft,
  RotateCcw,
  MoreHorizontal,
  ArrowRightLeft
} from 'lucide-react';
import { api } from '../lib/api';
import toast from 'react-hot-toast';
import { shopsAPI, productsAPI, categoriesAPI, inventoryAPI } from '../lib/api';
import { useTranslation } from '../hooks/useTranslation';
import { MobileBottomSheet, MobileModal, MobileCard, MobileButton, MobileInput } from '../components/MobileUtils';

const Inventory = () => {
  const { tSync } = useTranslation();
  const [activeTab, setActiveTab] = useState('overview');
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState({
    location_type: '',
    location_id: '',
    low_stock: false,
    out_of_stock: false,
    category: ''
  });
  const [selectedLocation, setSelectedLocation] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(12);
  const [showAssignmentModal, setShowAssignmentModal] = useState(false);
  const [selectedShop, setSelectedShop] = useState('');
  const [selectedProduct, setSelectedProduct] = useState('');
  const [assignmentQuantity, setAssignmentQuantity] = useState('');
  const [assignmentMinStock, setAssignmentMinStock] = useState('');
  const [assignmentMaxStock, setAssignmentMaxStock] = useState('');
  const [availableQuantity, setAvailableQuantity] = useState(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showReassignModal, setShowReassignModal] = useState(false);
  const [editingAssignment, setEditingAssignment] = useState(null);
  const [reassigningItem, setReassigningItem] = useState(null);
  const [editFormData, setEditFormData] = useState({
    quantity: '',
    min_stock_level: '',
    max_stock_level: ''
  });
  const [reassignFormData, setReassignFormData] = useState({
    new_location_id: '',
    quantity: '',
    min_stock_level: '',
    max_stock_level: ''
  });
  const queryClient = useQueryClient();

  // Fetch inventory data with pagination
  const { data: inventoryData, isLoading: inventoryLoading } = useQuery({
    queryKey: ['inventory', 'levels', filters, searchTerm, currentPage, itemsPerPage],
    queryFn: () => inventoryAPI.getLevels({
      params: {
        ...filters,
        search: searchTerm,
        page: currentPage,
        limit: itemsPerPage
      }
    }).then(res => res.data)
  });

  // Fetch shops data
  const { data: shopsData } = useQuery({
    queryKey: ['shops'],
    queryFn: () => shopsAPI.getAll().then(res => res.data),
  });

  // Fetch inventory stats
  const { data: statsData, isLoading: statsLoading, error: statsError } = useQuery({
    queryKey: ['inventory', 'stats'],
    queryFn: () => inventoryAPI.getStats().then(res => {
      console.log('Inventory stats response:', res.data);
      return res.data;
    }),
    onError: (error) => {
      console.error('Inventory stats error:', error);
    }
  });

  // Extract pagination data
  const inventoryItems = Array.isArray(inventoryData?.data) ? inventoryData.data : (Array.isArray(inventoryData) ? inventoryData : []);
  const pagination = inventoryData?.pagination || {};
  const totalItems = pagination.total || 0;
  const totalPages = pagination.totalPages || Math.ceil(totalItems / itemsPerPage);
  const shops = shopsData?.shops || [];

  // Fetch categories
  const { data: categoriesData } = useQuery({
    queryKey: ['categories'],
    queryFn: () => categoriesAPI.getAll().then(res => res.data)
  });

  const categories = categoriesData?.categories || [];

  // Fetch analytics
  const { data: analyticsData } = useQuery({
    queryKey: ['inventory', 'analytics'],
    queryFn: () => inventoryAPI.getStats().then(res => res.data)
  });

  // Fetch alerts
  const { data: alertsData } = useQuery({
    queryKey: ['inventory', 'alerts'],
    queryFn: () => inventoryAPI.getStats().then(res => res.data)
  });

  // Fetch transfers
  const { data: transfersData, isLoading: transfersLoading } = useQuery({
    queryKey: ['inventory', 'transfers'],
    queryFn: () => inventoryAPI.getTransfers().then(res => res.data)
  });

  // Fetch transactions
  const { data: transactionsData } = useQuery({
    queryKey: ['inventory', 'transactions'],
    queryFn: () => inventoryAPI.getTransactions().then(res => res.data)
  });

  // Fetch products for assignment
  const { data: productsData } = useQuery({
    queryKey: ['products'],
    queryFn: () => productsAPI.getAll({ params: { limit: 1000 } }).then(res => res.data)
  });

  // Fetch shop products for specific shop
  const { data: shopProductsData } = useQuery({
    queryKey: ['inventory', 'shop-products', selectedShop],
    queryFn: () => selectedShop ? api.get(`/inventory/shop-products/${selectedShop}`).then(res => res.data) : null,
    enabled: !!selectedShop
  });

  // Product assignment mutation
  const assignProductMutation = useMutation({
    mutationFn: (assignmentData) => inventoryAPI.assign(assignmentData),
    onSuccess: () => {
      queryClient.invalidateQueries(['inventory', 'shop-products']);
      queryClient.invalidateQueries(['products']);
      toast.success('Product assigned to shop successfully!');
      setShowAssignmentModal(false);
      resetAssignmentForm();
    },
    onError: (error) => {
      toast.error(error.response?.data?.error || 'Failed to assign product to shop');
    }
  });

  // Edit assignment mutation
  const editAssignmentMutation = useMutation({
    mutationFn: ({ assignmentId, data }) => inventoryAPI.updateAssignment(assignmentId, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['inventory', 'shop-products']);
      queryClient.invalidateQueries(['products']);
      toast.success('Assignment updated successfully!');
      setShowEditModal(false);
      setEditingAssignment(null);
    },
    onError: (error) => {
      toast.error(error.response?.data?.error || 'Failed to update assignment');
    }
  });

  // Delete assignment mutation
  const deleteAssignmentMutation = useMutation({
    mutationFn: (assignmentId) => inventoryAPI.deleteAssignment(assignmentId),
    onSuccess: () => {
      queryClient.invalidateQueries(['inventory', 'shop-products']);
      queryClient.invalidateQueries(['products']);
      toast.success('Assignment deleted successfully!');
      setShowDeleteModal(false);
      setEditingAssignment(null);
    },
    onError: (error) => {
      toast.error(error.response?.data?.error || 'Failed to delete assignment');
    }
  });

  // Reassign inventory mutation
  const reassignInventoryMutation = useMutation({
    mutationFn: ({ itemId, data }) => api.post(`/inventory/reassign/${itemId}`, data),
    onSuccess: (response) => {
      queryClient.invalidateQueries(['inventory', 'levels']);
      queryClient.invalidateQueries(['inventory', 'shop-products']);
      toast.success(`Inventory reassigned successfully! Remaining global stock: ${response.data.remaining_global_stock} ML`);
      setShowReassignModal(false);
      setReassigningItem(null);
      setReassignFormData({
        new_location_id: '',
        quantity: '',
        min_stock_level: '',
        max_stock_level: ''
      });
    },
    onError: (error) => {
      toast.error(error.response?.data?.error || 'Failed to reassign inventory');
    }
  });


  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    setCurrentPage(1); // Reset to first page when filters change
  };

  const handleSearch = (e) => {
    setSearchTerm(e.target.value);
    setCurrentPage(1); // Reset to first page when search changes
  };

  // Fetch available quantity for selected product
  const fetchAvailableQuantity = async (productId) => {
    if (!productId) {
      setAvailableQuantity(null);
      return;
    }

    try {
      const response = await api.get(`/inventory/products/${productId}/available-quantity`);
      setAvailableQuantity(response.data);
    } catch (error) {
      console.error('Error fetching available quantity:', error);
      setAvailableQuantity(null);
    }
  };

  const getStockStatusColor = (quantity, minStock) => {
    if (quantity === 0) return 'text-red-600 bg-red-50';
    if (quantity <= minStock) return 'text-orange-600 bg-orange-50';
    return 'text-green-600 bg-green-50';
  };

  const getStockStatusText = (quantity, minStock) => {
    if (quantity === 0) return 'Out of Stock';
    if (quantity <= minStock) return 'Low Stock';
    return 'In Stock';
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'CFA'
    }).format(amount || 0);
  };

  const resetAssignmentForm = () => {
    setSelectedShop('');
    setSelectedProduct('');
    setAssignmentQuantity('');
    setAssignmentMinStock('');
    setAssignmentMaxStock('');
    setAvailableQuantity(null);
  };

  const handleAssignProduct = () => {
    if (!selectedShop || !selectedProduct || !assignmentQuantity) {
      toast.error('Please fill in all required fields');
      return;
    }

    // Validate quantity against available quantity
    if (availableQuantity && parseInt(assignmentQuantity) > availableQuantity.available_quantity) {
      toast.error(`Cannot assign more than available quantity (${availableQuantity.available_quantity})`);
      return;
    }

    assignProductMutation.mutate({
      shop_id: selectedShop,
      product_id: selectedProduct,
      quantity: parseInt(assignmentQuantity),
      min_stock_level: parseInt(assignmentMinStock) || 10,
      max_stock_level: parseInt(assignmentMaxStock) || 100
    });
  };

  // Handle edit assignment
  const handleEditAssignment = (assignment) => {
    setEditingAssignment(assignment);
    setEditFormData({
      quantity: assignment.quantity.toString(),
      min_stock_level: assignment.min_stock_level.toString(),
      max_stock_level: assignment.max_stock_level.toString()
    });
    setShowEditModal(true);
  };

  // Handle delete assignment
  const handleDeleteAssignment = (assignment) => {
    setEditingAssignment(assignment);
    setShowDeleteModal(true);
  };

  // Handle edit submit
  const handleEditSubmit = () => {
    if (!editFormData.quantity) {
      toast.error('Please enter a quantity');
      return;
    }

    editAssignmentMutation.mutate({
      assignmentId: editingAssignment.id,
      data: {
        quantity: parseInt(editFormData.quantity),
        min_stock_level: parseInt(editFormData.min_stock_level) || 10,
        max_stock_level: parseInt(editFormData.max_stock_level) || 100
      }
    });
  };

  // Handle delete confirm
  const handleDeleteConfirm = () => {
    deleteAssignmentMutation.mutate(editingAssignment.id);
  };

  // Handle reassign inventory
  const handleReassignInventory = (item) => {
    setReassigningItem(item);
    setReassignFormData({
      new_location_id: '',
      quantity: item.quantity.toString(),
      min_stock_level: item.min_stock_level.toString(),
      max_stock_level: item.max_stock_level.toString()
    });
    setShowReassignModal(true);
  };

  // Handle reassign submit
  const handleReassignSubmit = () => {
    if (!reassignFormData.new_location_id || !reassignFormData.quantity) {
      toast.error('Please fill in all required fields');
      return;
    }

    if (parseInt(reassignFormData.quantity) <= 0) {
      toast.error('Quantity must be greater than 0');
      return;
    }

    if (parseInt(reassignFormData.quantity) > reassigningItem.quantity) {
      toast.error(`Your current quantity is less than what you want to assign. Available: ${reassigningItem.quantity} ML, Requested: ${reassignFormData.quantity} ML`);
      return;
    }

    // Check if there's enough global stock (if available in the item data)
    if (reassigningItem.global_stock && parseInt(reassignFormData.quantity) > reassigningItem.global_stock) {
      toast.error(`Insufficient global stock. Available: ${reassigningItem.global_stock} ML, Requested: ${reassignFormData.quantity} ML`);
      return;
    }

    reassignInventoryMutation.mutate({
      itemId: reassigningItem.id,
      data: {
        new_location_type: 'shop',
        new_location_id: reassignFormData.new_location_id,
        quantity: parseInt(reassignFormData.quantity),
        min_stock_level: parseInt(reassignFormData.min_stock_level) || 10,
        max_stock_level: parseInt(reassignFormData.max_stock_level) || 100
      }
    });
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const tabs = [
    { id: 'overview', name: <TranslatedText text="Overview" />, icon: BarChart3 },
    { id: 'stock', name: <TranslatedText text="Stock Levels" />, icon: Package }
  ];

  return (
    <div className="mobile-container">
      {/* Header - Mobile Optimized */}
      <div className="mobile-header">
        <div>
          <h1 className="text-xl sm:text-3xl font-bold text-gray-900"><TranslatedText text="Inventory Management" /></h1>
          <p className="text-sm text-gray-600 mt-1">
            <TranslatedText text="Real-time stock tracking, transfers, and analytics" />
          </p>
        </div>
        <div className="mobile-actions">
          <MobileButton
            onClick={() => queryClient.invalidateQueries(['inventory'])}
            variant="outline"
            size="small"
          >
            <RefreshCw className="w-4 h-4 mr-1" />
            <span className="hidden sm:inline">Refresh</span>
            <span className="sm:hidden">Sync</span>
          </MobileButton>
        </div>
      </div>

      {/* Stats Cards - Mobile Optimized */}
      {statsLoading ? (
        <div className="mobile-stats-grid">
          {[...Array(4)].map((_, i) => (
            <MobileCard key={i} className="p-4">
              <div className="animate-pulse">
                <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                <div className="h-8 bg-gray-200 rounded w-1/2"></div>
              </div>
            </MobileCard>
          ))}
        </div>
      ) : statsError ? (
        <MobileCard className="p-4 bg-red-50 border-red-200">
          <div className="flex items-center">
            <AlertTriangle className="w-6 h-6 text-red-600 mr-3 flex-shrink-0" />
            <div>
              <h3 className="text-lg font-medium text-red-900"><TranslatedText text="Error Loading Stats" /></h3>
              <p className="text-sm text-red-700 mt-1">
                {statsError.message || 'Failed to load inventory statistics'}
              </p>
              <MobileButton
                onClick={() => queryClient.invalidateQueries(['inventory', 'stats'])}
                variant="outline"
                size="small"
                className="mt-2 text-red-600 border-red-300 hover:bg-red-50"
              >
                Retry
              </MobileButton>
            </div>
          </div>
        </MobileCard>
      ) : (
        <div className="mobile-stats-grid">
          <MobileCard className="p-4">
            <div className="flex items-center">
              <div className="p-2 bg-blue-100 rounded-lg mr-3">
                <Package className="w-5 h-5 sm:w-6 sm:h-6 text-blue-600" />
              </div>
              <div>
                <p className="text-xs sm:text-sm font-medium text-gray-600"><TranslatedText text="Total Products" /></p>
                <p className="text-lg sm:text-2xl font-bold text-gray-900">{statsData?.total_products || 0}</p>
              </div>
            </div>
          </MobileCard>

          <MobileCard className="p-4">
            <div className="flex items-center">
              <div className="p-2 bg-green-100 rounded-lg mr-3">
                <ShoppingCart className="w-5 h-5 sm:w-6 sm:h-6 text-green-600" />
              </div>
              <div>
                <p className="text-xs sm:text-sm font-medium text-gray-600"><TranslatedText text="Total Stock" /></p>
                <p className="text-lg sm:text-2xl font-bold text-gray-900">{statsData?.total_stock_quantity || 0}</p>
              </div>
            </div>
          </MobileCard>

          <MobileCard className="p-4">
            <div className="flex items-center">
              <div className="p-2 bg-red-100 rounded-lg mr-3">
                <AlertTriangle className="w-5 h-5 sm:w-6 sm:h-6 text-red-600" />
              </div>
              <div>
                <p className="text-xs sm:text-sm font-medium text-gray-600"><TranslatedText text="Low Stock" /></p>
                <p className="text-lg sm:text-2xl font-bold text-gray-900">{statsData?.low_stock_count || 0}</p>
              </div>
            </div>
          </MobileCard>

          <MobileCard className="p-4">
            <div className="flex items-center">
              <div className="p-2 bg-purple-100 rounded-lg mr-3">
                <DollarSign className="w-5 h-5 sm:w-6 sm:h-6 text-purple-600" />
              </div>
              <div>
                <p className="text-xs sm:text-sm font-medium text-gray-600"><TranslatedText text="Stock Value" /></p>
                <p className="text-lg sm:text-2xl font-bold text-gray-900">
                  {formatCurrency(statsData?.total_stock_value || 0)}
                </p>
              </div>
            </div>
          </MobileCard>
        </div>
      )}

      {/* Tabs - Mobile Optimized */}
      <MobileCard className="overflow-hidden">
        <div className="border-b border-gray-200">
          <nav className="mobile-tabs" aria-label="Tabs">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`mobile-tab ${activeTab === tab.id ? 'active' : ''}`}
                >
                  <Icon className="w-4 h-4 mr-1 sm:mr-2" />
                  <span className="hidden sm:inline">{tab.name}</span>
                  <span className="sm:hidden text-xs">{tab.id}</span>
                </button>
              );
            })}
          </nav>
        </div>

        <div className="p-4">
          {/* Overview Tab - Mobile Optimized */}
          {activeTab === 'overview' && (
            <div className="space-y-6">
              {/* Quick Actions - Mobile Grid */}
              <div className="mobile-quick-actions">
                <MobileButton className="mobile-action-btn bg-blue-50 text-blue-700 border-blue-200">
                  <Truck className="w-5 h-5 sm:w-6 sm:h-6 text-blue-600 mb-2" />
                  <div className="text-center">
                    <p className="font-medium text-blue-900 text-sm"><TranslatedText text="Create Transfer" /></p>
                    <p className="text-xs text-blue-700 mt-1"><TranslatedText text="Move stock between locations" /></p>
                  </div>
                </MobileButton>
                <MobileButton className="mobile-action-btn bg-green-50 text-green-700 border-green-200">
                  <Package className="w-5 h-5 sm:w-6 sm:h-6 text-green-600 mb-2" />
                  <div className="text-center">
                    <p className="font-medium text-green-900 text-sm"><TranslatedText text="Stock Count" /></p>
                    <p className="text-xs text-green-700 mt-1"><TranslatedText text="Perform physical inventory count" /></p>
                  </div>
                </MobileButton>
                <MobileButton className="mobile-action-btn bg-orange-50 text-orange-700 border-orange-200">
                  <AlertTriangle className="w-5 h-5 sm:w-6 sm:h-6 text-orange-600 mb-2" />
                  <div className="text-center">
                    <p className="font-medium text-orange-900 text-sm"><TranslatedText text="View Alerts" /></p>
                    <p className="text-xs text-orange-700 mt-1"><TranslatedText text="Check low stock alerts" /></p>
                  </div>
                </MobileButton>
              </div>

              {/* Recent Activity - Mobile Optimized */}
              <div className="space-y-4">
                {/* Recent Transactions */}
                <MobileCard className="p-4 bg-gray-50">
                  <h3 className="text-lg font-medium text-gray-900 mb-4"><TranslatedText text="Recent Transactions" /></h3>
                  <div className="space-y-3">
                    {transactionsData?.transactions?.slice(0, 5).map((transaction) => (
                      <div key={transaction.id} className="flex items-center justify-between py-2 border-b border-gray-200 last:border-b-0">
                        <div className="flex-1">
                          <p className="font-medium text-gray-900 text-sm">{transaction.product_name}</p>
                          <p className="text-xs text-gray-500">{transaction.transaction_type}</p>
                        </div>
                        <div className="text-right">
                          <p className="font-medium text-gray-900 text-sm">{transaction.quantity}</p>
                          <p className="text-xs text-gray-500">{formatDate(transaction.created_at)}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </MobileCard>

                {/* Recent Alerts */}
                <MobileCard className="p-4 bg-gray-50">
                  <h3 className="text-lg font-medium text-gray-900 mb-4"><TranslatedText text="Recent Alerts" /></h3>
                  <div className="space-y-3">
                    {alertsData?.alerts?.slice(0, 5).map((alert) => (
                      <div key={alert.id} className="flex items-center justify-between py-2 border-b border-gray-200 last:border-b-0">
                        <div className="flex-1">
                          <p className="font-medium text-gray-900 text-sm">{alert.product_name}</p>
                          <p className="text-xs text-gray-500">{alert.alert_type}</p>
                        </div>
                        <div className="text-right">
                          <p className="font-medium text-gray-900 text-sm">{alert.current_stock}</p>
                          <p className="text-xs text-gray-500">{formatDate(alert.created_at)}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </MobileCard>
              </div>
            </div>
          )}

          {/* Stock Levels Tab */}
          {activeTab === 'stock' && (
            <div className="space-y-4">
              {/* Filters */}
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="flex-1">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      type="text"
                      placeholder={tSync("Search products...")}
                      value={searchTerm}
                      onChange={handleSearch}
                      className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    />
                  </div>
                </div>
                <div className="flex gap-2">
                  <select
                    value={filters.location_type}
                    onChange={(e) => handleFilterChange('location_type', e.target.value)}
                    className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  >
                    <option value="">{tSync('All Locations')}</option>
                    <option value="shop">Shops</option>
                    <option value="warehouse">Warehouses</option>
                  </select>
                  <select
                    value={filters.category}
                    onChange={(e) => handleFilterChange('category', e.target.value)}
                    className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  >
                    <option value="">{tSync('All Categories')}</option>
                    {categories?.map((category) => (
                      <option key={category.id} value={category.id}>
                        {category.name}
                      </option>
                    ))}
                  </select>
                  <button
                    onClick={() => setFilters({ ...filters, low_stock: !filters.low_stock })}
                    className={`px-3 py-2 rounded-lg border ${filters.low_stock
                      ? 'bg-orange-100 border-orange-300 text-orange-700'
                      : 'bg-white border-gray-300 text-gray-700'
                      }`}
                  >
                    <TranslatedText text="Low Stock" />
                  </button>
                </div>
              </div>

              {/* Inventory Table */}
              <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                {/* Table - Hidden on mobile, shown on md and up */}
                <div className="hidden md:block overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          <TranslatedText text="Product" />
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          <TranslatedText text="Category" />
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          <TranslatedText text="Shop Stock" />
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          <TranslatedText text="Warehouse Stock" />
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          <TranslatedText text="Total Stock" />
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          <TranslatedText text="Status" />
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {inventoryLoading ? (
                        <tr>
                          <td colSpan="6" className="px-6 py-4 text-center text-gray-500">
                            <TranslatedText text="Loading..." />
                          </td>
                        </tr>
                      ) : inventoryItems?.length > 0 ? inventoryItems?.map((item) => (
                        <tr key={item.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div>
                              <div className="text-sm font-medium text-gray-900">{item.product_name}</div>
                              <div className="text-sm text-gray-500">{item.sku}</div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {item.category_name}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {item.location_type === 'shop' ? item.quantity : 0}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {item.location_type === 'warehouse' ? item.quantity : 0}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                            {item.quantity}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStockStatusColor(item.quantity, item.min_stock_level)}`}>
                              {getStockStatusText(item.quantity, item.min_stock_level)}
                            </span>
                          </td>
                        </tr>
                      )) : (
                        <tr>
                          <td colSpan="6" className="px-6 py-4 text-center text-gray-500">
                            No inventory data found. Products need to be assigned to shops or warehouses first.
                            <br />
                            <span className="text-sm">Go to the "Shop Assignments" tab to assign products to locations.</span>
                            {totalItems > 0 && (
                              <span className="block mt-2 text-sm">
                                Showing {inventoryItems.length} of {totalItems} items. Use pagination to see more.
                              </span>
                            )}
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
                {/* Mobile Card View - Shown on mobile */}
                <div className="md:hidden p-4 space-y-4">
                  {inventoryLoading ? (
                    <div className="text-center py-8">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                      <p className="mt-2 text-sm text-gray-500">Loading...</p>
                    </div>
                  ) : inventoryItems?.length > 0 ? inventoryItems?.map((item) => (
                    <div key={item.id} className="bg-white rounded-xl p-4 shadow-sm border border-gray-200">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1">
                          <h3 className="text-base font-medium text-gray-900 mb-1">{item.product_name}</h3>
                          <p className="text-sm text-gray-500 mb-2">{item.sku}</p>
                          <div className="flex items-center text-sm text-gray-600">
                            <Package className="h-4 w-4 mr-1 text-gray-400" />
                            <span>{item.category_name || 'Uncategorized'}</span>
                          </div>
                        </div>
                        <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-semibold ${getStockStatusColor(item.quantity, item.min_stock_level)}`}>
                          {getStockStatusText(item.quantity, item.min_stock_level)}
                        </span>
                      </div>

                      <div className="grid grid-cols-3 gap-3 pt-3 border-t border-gray-100">
                        <div>
                          <p className="text-xs text-gray-500 mb-1">Shop Stock</p>
                          <p className="text-sm font-semibold text-gray-900">
                            {item.location_type === 'shop' ? item.quantity : 0}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500 mb-1">Warehouse</p>
                          <p className="text-sm font-semibold text-gray-900">
                            {item.location_type === 'warehouse' ? item.quantity : 0}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500 mb-1">Total</p>
                          <p className="text-sm font-semibold text-blue-600">{item.quantity}</p>
                        </div>
                      </div>
                    </div>
                  )) : (
                    <div className="text-center py-8 text-gray-500">
                      <Package className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                      <p className="text-sm">No inventory data found.</p>
                      <p className="text-xs mt-1">Products need to be assigned to shops or warehouses first.</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Pagination */}
              {totalPages > 1 && totalItems > itemsPerPage && (
                <div className="flex items-center justify-between bg-white rounded-lg border border-gray-200 px-4 py-3">
                  <div className="flex items-center space-x-2">
                    <span className="text-sm text-gray-700">Show</span>
                    <select
                      value={itemsPerPage}
                      onChange={(e) => {
                        setItemsPerPage(parseInt(e.target.value));
                        setCurrentPage(1); // Reset to first page when changing items per page
                      }}
                      className="px-2 py-1 border border-gray-300 rounded text-sm"
                    >
                      <option value={12}>12 per page</option>
                      <option value={24}>24 per page</option>
                      <option value={50}>50 per page</option>
                      <option value={100}>100 per page</option>
                    </select>
                    <span className="text-sm text-gray-700">
                      of {totalItems} items
                    </span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                      disabled={currentPage === 1}
                      className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      <svg className="mr-2 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                      </svg>
                      Previous
                    </button>

                    {/* Page numbers */}
                    <div className="flex items-center space-x-1">
                      {(() => {
                        const pages = [];
                        const maxVisiblePages = 5;
                        let startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2));
                        let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);

                        if (endPage - startPage + 1 < maxVisiblePages) {
                          startPage = Math.max(1, endPage - maxVisiblePages + 1);
                        }

                        for (let i = startPage; i <= endPage; i++) {
                          pages.push(
                            <button
                              key={i}
                              onClick={() => setCurrentPage(i)}
                              className={`px-3 py-2 text-sm font-medium rounded-lg transition-colors ${i === currentPage
                                ? 'bg-blue-600 text-white'
                                : 'text-gray-700 hover:bg-gray-100'
                                }`}
                            >
                              {i}
                            </button>
                          );
                        }
                        return pages;
                      })()}
                    </div>

                    <button
                      onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                      disabled={currentPage === totalPages}
                      className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      Next
                      <svg className="ml-2 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Transfers Tab */}
          {activeTab === 'transfers' && (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-medium text-gray-900"><TranslatedText text="Stock Transfers" /></h3>
              </div>

              <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                {transfersLoading ? (
                  <div className="p-6 text-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                    <p className="mt-2 text-gray-600">Loading transfers...</p>
                  </div>
                ) : transfersData?.transfers?.length === 0 ? (
                  <div className="p-12 text-center">
                    <Truck className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2"><TranslatedText text="No transfers found" /></h3>
                    <p className="text-gray-500">
                      {transfersData?.message || <TranslatedText text="No stock transfers have been made yet." />}
                    </p>
                  </div>
                ) : (
                  <>
                    {/* Table - Hidden on mobile, shown on md and up */}
                    <div className="hidden md:block overflow-x-auto">
                      <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              <TranslatedText text="Transfer #" />
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              <TranslatedText text="From" />
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              <TranslatedText text="To" />
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              <TranslatedText text="Status" />
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              <TranslatedText text="Items" />
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
                          {transfersData?.transfers?.map((transfer) => (
                            <tr key={transfer.id} className="hover:bg-gray-50">
                              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                {transfer.transfer_number || `TRF-${transfer.id.slice(-6).toUpperCase()}`}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                <div className="flex items-center">
                                  <MapPin className="h-4 w-4 text-gray-400 mr-2" />
                                  <div>
                                    <div className="font-medium">{transfer.from_location_name || 'Unknown'}</div>
                                    <div className="text-xs text-gray-400 capitalize">{transfer.from_type}</div>
                                  </div>
                                </div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                <div className="flex items-center">
                                  <MapPin className="h-4 w-4 text-gray-400 mr-2" />
                                  <div>
                                    <div className="font-medium">{transfer.to_location_name || 'Unknown'}</div>
                                    <div className="text-xs text-gray-400 capitalize">{transfer.to_type}</div>
                                  </div>
                                </div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${transfer.status === 'completed' ? 'bg-green-100 text-green-800' :
                                  transfer.status === 'in_progress' ? 'bg-blue-100 text-blue-800' :
                                    transfer.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                                      transfer.status === 'cancelled' ? 'bg-red-100 text-red-800' :
                                        'bg-gray-100 text-gray-800'
                                  }`}>
                                  {transfer.status || 'pending'}
                                </span>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                <div>
                                  <div className="font-medium">{transfer.product_name || 'Unknown Product'}</div>
                                  <div className="text-xs text-gray-500">{transfer.quantity} ML</div>
                                </div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                {formatDate(transfer.created_at)}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                                <div className="flex space-x-2">
                                  <button
                                    className="text-blue-600 hover:text-blue-900 p-1 rounded hover:bg-blue-50"
                                    title="View Transfer Details"
                                  >
                                    <Eye className="w-4 h-4" />
                                  </button>
                                  {transfer.status === 'pending' && (
                                    <button
                                      className="text-green-600 hover:text-green-900 p-1 rounded hover:bg-green-50"
                                      title="Complete Transfer"
                                    >
                                      <CheckCircle className="w-4 h-4" />
                                    </button>
                                  )}
                                  {transfer.status === 'pending' && (
                                    <button
                                      className="text-red-600 hover:text-red-900 p-1 rounded hover:bg-red-50"
                                      title="Cancel Transfer"
                                    >
                                      <XCircle className="w-4 h-4" />
                                    </button>
                                  )}
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    {/* Mobile Card View - Shown on mobile */}
                    <div className="md:hidden p-4 space-y-4">
                      {transfersData?.transfers?.map((transfer) => (
                        <div key={transfer.id} className="bg-white rounded-xl p-4 shadow-sm border border-gray-200">
                          <div className="flex items-start justify-between mb-3">
                            <div className="flex-1">
                              <h3 className="text-base font-medium text-gray-900 mb-1">
                                {transfer.transfer_number || `TRF-${transfer.id.slice(-6).toUpperCase()}`}
                              </h3>
                              <p className="text-sm text-gray-500 mb-2">{formatDate(transfer.created_at)}</p>
                            </div>
                            <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-semibold ${transfer.status === 'completed' ? 'bg-green-100 text-green-800' :
                              transfer.status === 'in_progress' ? 'bg-blue-100 text-blue-800' :
                                transfer.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                                  transfer.status === 'cancelled' ? 'bg-red-100 text-red-800' :
                                    'bg-gray-100 text-gray-800'
                              }`}>
                              {transfer.status || 'pending'}
                            </span>
                          </div>

                          <div className="space-y-2 mb-3">
                            <div className="flex items-center text-sm text-gray-600">
                              <MapPin className="h-4 w-4 mr-2 text-gray-400 flex-shrink-0" />
                              <div className="flex-1">
                                <p className="font-medium text-gray-900">From: {transfer.from_location_name || 'Unknown'}</p>
                                <p className="text-xs text-gray-500 capitalize">{transfer.from_type}</p>
                              </div>
                            </div>
                            <div className="flex items-center text-sm text-gray-600">
                              <MapPin className="h-4 w-4 mr-2 text-gray-400 flex-shrink-0" />
                              <div className="flex-1">
                                <p className="font-medium text-gray-900">To: {transfer.to_location_name || 'Unknown'}</p>
                                <p className="text-xs text-gray-500 capitalize">{transfer.to_type}</p>
                              </div>
                            </div>
                            <div className="pt-2 border-t border-gray-100">
                              <p className="text-sm font-medium text-gray-900">{transfer.product_name || 'Unknown Product'}</p>
                              <p className="text-xs text-gray-500">{transfer.quantity} ML</p>
                            </div>
                          </div>

                          <div className="flex items-center justify-end gap-2 pt-3 border-t border-gray-100">
                            <button
                              className="p-2 text-blue-600 hover:text-blue-900 hover:bg-blue-50 rounded-lg transition-colors min-h-[36px] min-w-[36px] flex items-center justify-center"
                              title="View Transfer Details"
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                            {transfer.status === 'pending' && (
                              <>
                                <button
                                  className="p-2 text-green-600 hover:text-green-900 hover:bg-green-50 rounded-lg transition-colors min-h-[36px] min-w-[36px] flex items-center justify-center"
                                  title="Complete Transfer"
                                >
                                  <CheckCircle className="w-4 h-4" />
                                </button>
                                <button
                                  className="p-2 text-red-600 hover:text-red-900 hover:bg-red-50 rounded-lg transition-colors min-h-[36px] min-w-[36px] flex items-center justify-center"
                                  title="Cancel Transfer"
                                >
                                  <XCircle className="w-4 h-4" />
                                </button>
                              </>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </div>
            </div>
          )}

          {/* Alerts Tab */}
          {activeTab === 'alerts' && (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-medium text-gray-900"><TranslatedText text="Low Stock Alerts" /></h3>
                <div className="flex space-x-2">
                  <button className="px-3 py-1 text-sm border border-gray-300 rounded-md">
                    <TranslatedText text="Active" />
                  </button>
                  <button className="px-3 py-1 text-sm border border-gray-300 rounded-md">
                    <TranslatedText text="Resolved" />
                  </button>
                </div>
              </div>

              <div className="space-y-3">
                {alertsData?.alerts?.map((alert) => (
                  <div key={alert.id} className="bg-white rounded-lg border border-gray-200 p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div className={`p-2 rounded-full ${alert.alert_type === 'out_of_stock' ? 'bg-red-100' : 'bg-orange-100'
                          }`}>
                          <AlertTriangle className={`w-5 h-5 ${alert.alert_type === 'out_of_stock' ? 'text-red-600' : 'text-orange-600'
                            }`} />
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">{alert.product_name}</p>
                          <p className="text-sm text-gray-500">{alert.message}</p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <span className="text-sm text-gray-500">{formatDate(alert.created_at)}</span>
                        {!alert.is_resolved && (
                          <button className="px-3 py-1 text-sm bg-green-600 text-white rounded-md hover:bg-green-700">
                            <TranslatedText text="Resolve" />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Analytics Tab */}
          {activeTab === 'analytics' && analyticsData && (
            <div className="space-y-6">
              {/* Category Breakdown */}
              <div className="bg-white rounded-lg border border-gray-200 p-6">
                <h3 className="text-lg font-medium text-gray-900 mb-4"><TranslatedText text="Stock by Category" /></h3>
                <div className="space-y-3">
                  {analyticsData.category_breakdown?.map((category) => (
                    <div key={category.category_name} className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-gray-900">{category.category_name}</p>
                        <p className="text-sm text-gray-500">{category.product_count} products</p>
                      </div>
                      <div className="text-right">
                        <p className="font-medium text-gray-900">{category.total_stock} ML</p>
                        <p className="text-sm text-gray-500">{formatCurrency(category.total_value)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Stock Movement Trends */}
              <div className="bg-white rounded-lg border border-gray-200 p-6">
                <h3 className="text-lg font-medium text-gray-900 mb-4"><TranslatedText text="Stock Movement (Last 30 Days)" /></h3>
                <div className="space-y-3">
                  {analyticsData.stock_movement_trends?.slice(0, 10).map((trend, index) => (
                    <div key={index} className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-gray-900">{formatDate(trend.date)}</p>
                        <p className="text-sm text-gray-500">{trend.transaction_type}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-medium text-gray-900">{trend.total_quantity} ML</p>
                        <p className="text-sm text-gray-500">{trend.transaction_count} transactions</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Expiry Alerts */}
              <div className="bg-white rounded-lg border border-gray-200 p-6">
                <h3 className="text-lg font-medium text-gray-900 mb-4"><TranslatedText text="Expiry Alerts (Next 30 Days)" /></h3>
                <div className="space-y-3">
                  {analyticsData.expiry_alerts?.map((alert) => (
                    <div key={alert.id} className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-gray-900">{alert.product_name}</p>
                        <p className="text-sm text-gray-500">Batch: {alert.batch_number}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-medium text-gray-900">{formatDate(alert.expiry_date)}</p>
                        <p className="text-sm text-gray-500">{Math.floor(alert.days_until_expiry)} days left</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}


        </div>
      </MobileCard>

      {/* Reassign Inventory Modal */}
      {showReassignModal && reassigningItem && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-gray-900"><TranslatedText text="Reassign to Shop" /></h3>
              <button
                onClick={() => setShowReassignModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              {/* Current Item Info */}
              <div className="bg-gray-50 p-4 rounded-lg">
                <h4 className="font-medium text-gray-900 mb-2"><TranslatedText text="Current Assignment" /></h4>
                <p className="text-sm text-gray-600">
                  <strong>Product:</strong> {reassigningItem.product_name}
                </p>
                <p className="text-sm text-gray-600">
                  <strong>Location:</strong> {reassigningItem.location_name} ({reassigningItem.location_type})
                </p>
                <p className="text-sm text-gray-600">
                  <strong>Current Quantity:</strong> {reassigningItem.quantity} ML
                </p>
                {reassigningItem.global_stock !== undefined && (
                  <p className="text-sm text-blue-600">
                    <strong>Global Stock Available:</strong> {reassigningItem.global_stock} ML
                  </p>
                )}
              </div>

              {/* New Shop */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  <TranslatedText text="New Shop" /> *
                </label>
                <select
                  value={reassignFormData.new_location_id}
                  onChange={(e) => setReassignFormData(prev => ({ ...prev, new_location_id: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                >
                  <option value="">Select shop</option>
                  {shops.map(shop => (
                    <option key={shop.id} value={shop.id}>{shop.name}</option>
                  ))}
                </select>
              </div>

              {/* Quantity */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  <TranslatedText text="Quantity to Reassign" /> *
                </label>
                <input
                  type="number"
                  value={reassignFormData.quantity}
                  onChange={(e) => setReassignFormData(prev => ({ ...prev, quantity: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  min="1"
                  max={Math.min(reassigningItem.quantity, reassigningItem.global_stock || reassigningItem.quantity)}
                  required
                />
                <div className="mt-1 text-xs text-gray-500">
                  <p>Available in current location: {reassigningItem.quantity} ML</p>
                  {reassigningItem.global_stock !== undefined && (
                    <p>Available globally: {reassigningItem.global_stock} ML</p>
                  )}
                </div>
              </div>

              {/* Min Stock Level */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  <TranslatedText text="Min Stock Level" />
                </label>
                <input
                  type="number"
                  value={reassignFormData.min_stock_level}
                  onChange={(e) => setReassignFormData(prev => ({ ...prev, min_stock_level: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  min="0"
                />
              </div>

              {/* Max Stock Level */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  <TranslatedText text="Max Stock Level" />
                </label>
                <input
                  type="number"
                  value={reassignFormData.max_stock_level}
                  onChange={(e) => setReassignFormData(prev => ({ ...prev, max_stock_level: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  min="0"
                />
              </div>
            </div>

            <div className="flex justify-end space-x-3 mt-6">
              <button
                onClick={() => setShowReassignModal(false)}
                className="px-4 py-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
              >
                <TranslatedText text="Cancel" />
              </button>
              <button
                onClick={handleReassignSubmit}
                disabled={reassignInventoryMutation.isPending}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
              >
                {reassignInventoryMutation.isPending ? <TranslatedText text="Reassigning..." /> : <TranslatedText text="Reassign" />}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default Inventory; 
