import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { 
  Truck, 
  ClipboardList, 
  FileCheck, 
  Eye, 
  Plus, 
  Search, 
  Filter,
  Download,
  BarChart3,
  TrendingUp,
  AlertTriangle,
  CheckCircle,
  Clock,
  DollarSign,
  Package,
  Users,
  Calendar,
  ArrowUpDown
} from 'lucide-react';
import { api } from '../lib/api';
import toast from 'react-hot-toast';
import { procurementAPI } from '../lib/api';
import TranslatedText from '../components/TranslatedText';

const Procurement = () => {
  const [activeTab, setActiveTab] = useState('overview');
  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState('grid');
  const [sortBy, setSortBy] = useState('created_at');
  const [sortOrder, setSortOrder] = useState('desc');
  const [showFilters, setShowFilters] = useState(false);
  const [selectedItems, setSelectedItems] = useState([]);
  const [showBulkActions, setShowBulkActions] = useState(false);

  // Fetch procurement analytics
  const { data: analytics, isLoading: analyticsLoading } = useQuery({
    queryKey: ['procurement-analytics'],
    queryFn: async () => {
      const response = await procurementAPI.getSuppliers();
      return response.data;
    },
    refetchInterval: 30000, // Refresh every 30 seconds
    staleTime: 60000
  });

  // Fetch suppliers
  const { data: suppliersData, isLoading: suppliersLoading } = useQuery({
    queryKey: ['suppliers'],
    queryFn: async () => {
      const response = await procurementAPI.getSuppliers();
      return response.data;
    }
  });

  // Fetch purchase orders
  const { data: purchaseOrdersData, isLoading: purchaseOrdersLoading } = useQuery({
    queryKey: ['purchase-orders'],
    queryFn: async () => {
      const response = await procurementAPI.getPurchaseOrders();
      return response.data;
    }
  });

  // Fetch requisitions
  const { data: requisitionsData, isLoading: requisitionsLoading } = useQuery({
    queryKey: ['requisitions'],
    queryFn: async () => {
      const response = await procurementAPI.getSuppliers();
      return response.data;
    }
  });

  const suppliers = suppliersData?.suppliers || [];
  const purchaseOrders = purchaseOrdersData?.purchase_orders || [];
  const requisitions = requisitionsData?.requisitions || [];

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount || 0);
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const getStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case 'approved':
      case 'delivered':
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'pending':
      case 'in_transit':
        return 'bg-yellow-100 text-yellow-800';
      case 'rejected':
      case 'cancelled':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getPriorityColor = (priority) => {
    switch (priority?.toLowerCase()) {
      case 'urgent':
        return 'bg-red-100 text-red-800';
      case 'high':
        return 'bg-orange-100 text-orange-800';
      case 'normal':
        return 'bg-blue-100 text-blue-800';
      case 'low':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const toggleSelection = (itemId) => {
    setSelectedItems(prev => 
      prev.includes(itemId) 
        ? prev.filter(id => id !== itemId)
        : [...prev, itemId]
    );
  };

  const selectAll = () => {
    const currentItems = getCurrentItems();
    setSelectedItems(currentItems.map(item => item.id));
  };

  const clearSelection = () => {
    setSelectedItems([]);
  };

  const getCurrentItems = () => {
    switch (activeTab) {
      case 'suppliers':
        return suppliers;
      case 'purchase-orders':
        return purchaseOrders;
      case 'requisitions':
        return requisitions;
      default:
        return [];
    }
  };

  const filteredItems = getCurrentItems().filter(item => {
    const searchLower = searchTerm.toLowerCase();
    if (activeTab === 'suppliers') {
      return item.name?.toLowerCase().includes(searchLower) ||
             item.contact_person?.toLowerCase().includes(searchLower) ||
             item.email?.toLowerCase().includes(searchLower);
    } else if (activeTab === 'purchase-orders') {
      return item.po_number?.toLowerCase().includes(searchLower) ||
             item.supplier_name?.toLowerCase().includes(searchLower);
    } else if (activeTab === 'requisitions') {
      return item.requisition_number?.toLowerCase().includes(searchLower) ||
             item.title?.toLowerCase().includes(searchLower);
    }
    return true;
  });

  const sortedItems = [...filteredItems].sort((a, b) => {
    const aValue = a[sortBy];
    const bValue = b[sortBy];
    
    if (sortBy === 'created_at') {
      return sortOrder === 'desc' 
        ? new Date(bValue || 0).getTime() - new Date(aValue || 0).getTime()
        : new Date(aValue || 0).getTime() - new Date(bValue || 0).getTime();
    }
    
    if (typeof aValue === 'string' && typeof bValue === 'string') {
      return sortOrder === 'desc' 
        ? bValue.localeCompare(aValue)
        : aValue.localeCompare(bValue);
    }
    
    return sortOrder === 'desc' ? bValue - aValue : aValue - bValue;
  });

  const tabs = [
    {
      id: 'overview',
      name: 'Overview',
      icon: BarChart3,
      description: 'Procurement analytics and insights'
    },
    {
      id: 'suppliers',
      name: 'Suppliers',
      icon: Users,
      description: 'Manage suppliers and performance'
    },
    {
      id: 'purchase-orders',
      name: 'Purchase Orders',
      icon: FileCheck,
      description: 'Create and track purchase orders'
    },
    {
      id: 'requisitions',
      name: 'Requisitions',
      icon: ClipboardList,
      description: 'Purchase requisitions and approvals'
    }
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div className="flex items-center space-x-3">
              <div className="flex-shrink-0">
                <Truck className="h-8 w-8 text-primary-600" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900"><TranslatedText text="Procurement" /></h1>
                <p className="text-sm text-gray-500">Raw material acquisition & supplier management</p>
              </div>
            </div>
            {/* <div className="flex items-center space-x-3">
              <button className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500">
                <Plus className="h-4 w-4 mr-2" />
                New Supplier
              </button>
            </div> */}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <nav className="flex space-x-8">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`py-4 px-1 border-b-2 font-medium text-sm flex items-center space-x-2 ${
                    activeTab === tab.id
                      ? 'border-primary-500 text-primary-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  <span>{tab.name}</span>
                </button>
              );
            })}
          </nav>
        </div>
      </div>

      {/* Search and Filters Bar */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  placeholder={`Search ${activeTab}...`}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                />
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <button
                onClick={() => setShowFilters(!showFilters)}
                className={`inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md ${
                  showFilters
                    ? 'bg-primary-50 border-primary-300 text-primary-700'
                    : 'bg-white text-gray-700 hover:bg-gray-50'
                } focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500`}
              >
                <Filter className="h-4 w-4 mr-2" />
                Filters
              </button>
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => setViewMode('grid')}
                  className={`p-2 rounded-md ${
                    viewMode === 'grid'
                      ? 'bg-primary-100 text-primary-600'
                      : 'text-gray-400 hover:text-gray-600'
                  }`}
                >
                  <div className="grid grid-cols-2 gap-1 w-4 h-4">
                    <div className="bg-current rounded-sm"></div>
                    <div className="bg-current rounded-sm"></div>
                    <div className="bg-current rounded-sm"></div>
                    <div className="bg-current rounded-sm"></div>
                  </div>
                </button>
                <button
                  onClick={() => setViewMode('list')}
                  className={`p-2 rounded-md ${
                    viewMode === 'list'
                      ? 'bg-primary-100 text-primary-600'
                      : 'text-gray-400 hover:text-gray-600'
                  }`}
                >
                  <div className="space-y-1 w-4 h-4">
                    <div className="bg-current rounded-sm h-1"></div>
                    <div className="bg-current rounded-sm h-1"></div>
                    <div className="bg-current rounded-sm h-1"></div>
                  </div>
                </button>
              </div>
              <select
                value={`${sortBy}-${sortOrder}`}
                onChange={(e) => {
                  const [field, order] = e.target.value.split('-');
                  setSortBy(field);
                  setSortOrder(order);
                }}
                className="block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm rounded-md"
              >
                <option value="created_at-desc">Newest First</option>
                <option value="created_at-asc">Oldest First</option>
                <option value="name-asc">Name A-Z</option>
                <option value="name-desc">Name Z-A</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {activeTab === 'overview' && (
          <OverviewTab analytics={analytics} isLoading={analyticsLoading} formatCurrency={formatCurrency} />
        )}
        
        {activeTab === 'suppliers' && (
          <SuppliersTab 
            suppliers={sortedItems}
            isLoading={suppliersLoading}
            searchTerm={searchTerm}
            viewMode={viewMode}
            selectedItems={selectedItems}
            sortBy={sortBy}
            sortOrder={sortOrder}
            onToggleSelection={toggleSelection}
            formatCurrency={formatCurrency}
            getStatusColor={getStatusColor}
          />
        )}
        
        {activeTab === 'purchase-orders' && (
          <PurchaseOrdersTab 
            purchaseOrders={sortedItems}
            isLoading={purchaseOrdersLoading}
            searchTerm={searchTerm}
            viewMode={viewMode}
            selectedItems={selectedItems}
            sortBy={sortBy}
            sortOrder={sortOrder}
            onToggleSelection={toggleSelection}
            formatCurrency={formatCurrency}
            formatDate={formatDate}
            getStatusColor={getStatusColor}
          />
        )}
        
        {activeTab === 'requisitions' && (
          <RequisitionsTab 
            requisitions={sortedItems}
            isLoading={requisitionsLoading}
            searchTerm={searchTerm}
            viewMode={viewMode}
            selectedItems={selectedItems}
            sortBy={sortBy}
            sortOrder={sortOrder}
            onToggleSelection={toggleSelection}
            formatCurrency={formatCurrency}
            formatDate={formatDate}
            getStatusColor={getStatusColor}
            getPriorityColor={getPriorityColor}
          />
        )}
      </div>
    </div>
  );
};

// Overview Tab Component
const OverviewTab = ({ analytics, isLoading, formatCurrency }) => {
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[...Array(8)].map((_, i) => (
          <div key={i} className="bg-white rounded-lg shadow p-6 animate-pulse">
            <div className="h-4 bg-gray-200 rounded w-3/4 mb-4"></div>
            <div className="h-8 bg-gray-200 rounded w-1/2"></div>
          </div>
        ))}
      </div>
    );
  }

  const stats = analytics?.overall_stats || {};
  const topSuppliers = analytics?.top_suppliers || [];
  const materialSpend = analytics?.material_spend || [];
  const qualityMetrics = analytics?.quality_metrics || {};
  const deliveryPerformance = analytics?.delivery_performance || {};

  return (
    <div className="space-y-6">
      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <FileCheck className="h-8 w-8 text-blue-600" />
            </div>
            <div className="ml-5 w-0 flex-1">
              <dl>
                <dt className="text-sm font-medium text-gray-500 truncate">Total Orders</dt>
                <dd className="text-lg font-medium text-gray-900">{stats.total_orders || 0}</dd>
              </dl>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <DollarSign className="h-8 w-8 text-green-600" />
            </div>
            <div className="ml-5 w-0 flex-1">
              <dl>
                <dt className="text-sm font-medium text-gray-500 truncate">Total Spend</dt>
                <dd className="text-lg font-medium text-gray-900">{formatCurrency(stats.total_spend)}</dd>
              </dl>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <Users className="h-8 w-8 text-purple-600" />
            </div>
            <div className="ml-5 w-0 flex-1">
              <dl>
                <dt className="text-sm font-medium text-gray-500 truncate">Active Suppliers</dt>
                <dd className="text-lg font-medium text-gray-900">{stats.active_suppliers || 0}</dd>
              </dl>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <CheckCircle className="h-8 w-8 text-green-600" />
            </div>
            <div className="ml-5 w-0 flex-1">
              <dl>
                <dt className="text-sm font-medium text-gray-500 truncate">Quality Rate</dt>
                <dd className="text-lg font-medium text-gray-900">
                  {qualityMetrics.acceptance_rate ? `${qualityMetrics.acceptance_rate.toFixed(1)}%` : 'N/A'}
                </dd>
              </dl>
            </div>
          </div>
        </div>
      </div>

      {/* Charts and Tables */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Suppliers */}
        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-medium text-gray-900"><TranslatedText text="Top Suppliers by Spend" /></h3>
          </div>
          <div className="p-6">
            {topSuppliers.length > 0 ? (
              <div className="space-y-4">
                {topSuppliers.slice(0, 5).map((supplier, index) => (
                  <div key={supplier.supplier_name} className="flex items-center justify-between">
                    <div className="flex items-center">
                      <span className="text-sm font-medium text-gray-900">{supplier.supplier_name}</span>
                    </div>
                    <div className="text-sm text-gray-500">
                      {formatCurrency(supplier.total_spend)}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 text-center py-4">No supplier data available</p>
            )}
          </div>
        </div>

        {/* Material Spend */}
        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-medium text-gray-900"><TranslatedText text="Material Spend Analysis" /></h3>
          </div>
          <div className="p-6">
            {materialSpend.length > 0 ? (
              <div className="space-y-4">
                {materialSpend.slice(0, 5).map((material, index) => (
                  <div key={material.material_name} className="flex items-center justify-between">
                    <div className="flex items-center">
                      <span className="text-sm font-medium text-gray-900">{material.material_name}</span>
                    </div>
                    <div className="text-sm text-gray-500">
                      {formatCurrency(material.total_spend)}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 text-center py-4">No material spend data available</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

// Suppliers Tab Component
const SuppliersTab = ({ suppliers, isLoading, searchTerm, viewMode, selectedItems, sortBy, sortOrder, onToggleSelection, formatCurrency, getStatusColor }) => {
  if (isLoading) {
    return <div className="text-center py-8">Loading suppliers...</div>;
  }

  return (
    <div className="space-y-6">
      {viewMode === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {suppliers.map((supplier) => {
            const isGermanSupplier = supplier.name?.toLowerCase().includes('german') || supplier.country?.toLowerCase().includes('germany');
            
            return (
              <div key={supplier.id} className={`bg-white rounded-lg shadow border-2 transition-all duration-200 ${
                isGermanSupplier 
                  ? 'border-green-500 bg-green-50' 
                  : 'border-gray-200 hover:border-gray-300 hover:shadow-md'
              }`}>
                <div className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center">
                        <h3 className={`text-lg font-medium ${isGermanSupplier ? 'text-green-800' : 'text-gray-900'}`}>
                          {supplier.name}
                        </h3>
                        {isGermanSupplier && (
                          <span className="ml-2 inline-flex items-center px-2 py-1 text-xs font-medium rounded-full bg-green-100 text-green-800">
                            🇩🇪 German
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-gray-500">{supplier.contact_person}</p>
                      <p className="text-sm text-gray-500">{supplier.email}</p>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(supplier.is_approved ? 'approved' : 'pending')}`}>
                        {supplier.is_approved ? 'Approved' : 'Pending'}
                      </span>
                    </div>
                  </div>
                  <div className="mt-4 space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">Country:</span>
                      <span className={`text-gray-900 ${isGermanSupplier ? 'font-medium text-green-700' : ''}`}>
                        {supplier.country}
                        {isGermanSupplier && <span className="ml-1">🇩🇪</span>}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">Category:</span>
                      <span className="text-gray-900 capitalize">{supplier.supplier_category}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">Rating:</span>
                      <span className="text-gray-900">{supplier.rating}/5</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">Credit Limit:</span>
                      <span className="text-gray-900 font-medium">{formatCurrency(supplier.credit_limit)}</span>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="bg-white shadow overflow-hidden sm:rounded-md">
          <ul className="divide-y divide-gray-200">
            {suppliers.map((supplier) => {
              const isGermanSupplier = supplier.name?.toLowerCase().includes('german') || supplier.country?.toLowerCase().includes('germany');
              
              return (
                <li key={supplier.id} className={`px-6 py-4 ${isGermanSupplier ? 'bg-green-50' : ''}`}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <div className="flex-shrink-0">
                        <div className={`h-10 w-10 rounded-full flex items-center justify-center ${
                          isGermanSupplier ? 'bg-green-100' : 'bg-gray-100'
                        }`}>
                          <Users className={`h-5 w-5 ${isGermanSupplier ? 'text-green-600' : 'text-gray-400'}`} />
                        </div>
                      </div>
                      <div className="ml-4">
                        <div className="flex items-center">
                          <div className={`text-sm font-medium ${isGermanSupplier ? 'text-green-800' : 'text-gray-900'}`}>
                            {supplier.name}
                          </div>
                          {isGermanSupplier && (
                            <span className="ml-2 inline-flex items-center px-2 py-1 text-xs font-medium rounded-full bg-green-100 text-green-800">
                              🇩🇪 German
                            </span>
                          )}
                        </div>
                        <div className="text-sm text-gray-500">
                          {supplier.contact_person} • {supplier.email}
                        </div>
                        <div className="text-sm text-gray-500">
                          {supplier.country} • {supplier.supplier_category}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-4">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(supplier.is_approved ? 'approved' : 'pending')}`}>
                        {supplier.is_approved ? 'Approved' : 'Pending'}
                      </span>
                      <span className="text-sm font-medium text-gray-900">
                        {supplier.rating}/5
                      </span>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
};

// Purchase Orders Tab Component
const PurchaseOrdersTab = ({ purchaseOrders, isLoading, searchTerm, viewMode, selectedItems, sortBy, sortOrder, onToggleSelection, formatCurrency, formatDate, getStatusColor }) => {
  if (isLoading) {
    return <div className="text-center py-8">Loading purchase orders...</div>;
  }

  return (
    <div className="space-y-6">
      {viewMode === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {purchaseOrders.map((order) => {
            const isGermanOrder = order.supplier_name?.toLowerCase().includes('german') || 
                                 order.notes?.toLowerCase().includes('citrus burst energy cologne');
            
            return (
              <div key={order.id} className={`bg-white rounded-lg shadow border-2 transition-all duration-200 ${
                isGermanOrder 
                  ? 'border-green-500 bg-green-50' 
                  : 'border-gray-200 hover:border-gray-300 hover:shadow-md'
              }`}>
                <div className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center">
                        <h3 className={`text-lg font-medium ${isGermanOrder ? 'text-green-800' : 'text-gray-900'}`}>
                          {order.po_number}
                        </h3>
                        {isGermanOrder && (
                          <span className="ml-2 inline-flex items-center px-2 py-1 text-xs font-medium rounded-full bg-green-100 text-green-800">
                            🇩🇪 German Import
                          </span>
                        )}
                      </div>
                      <p className={`text-sm ${isGermanOrder ? 'text-green-600 font-medium' : 'text-gray-500'}`}>
                        {order.supplier_name}
                        {isGermanOrder && <span className="ml-1">🇩🇪</span>}
                      </p>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(order.status)}`}>
                        {order.status}
                      </span>
                    </div>
                  </div>
                  <div className="mt-4 space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">Order Date:</span>
                      <span className="text-gray-900">{formatDate(order.order_date)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">Total Amount:</span>
                      <span className="text-gray-900 font-medium">{formatCurrency(order.total_amount)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">Items:</span>
                      <span className="text-gray-900">{order.items_count || 0}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">Quantity:</span>
                      <span className="text-gray-900">{order.total_quantity || 0}</span>
                    </div>
                    {isGermanOrder && order.notes && (
                      <div className="mt-2 pt-2 border-t border-green-100">
                        <div className="text-xs text-green-600 font-medium">Notes:</div>
                        <div className="text-xs text-green-700">{order.notes}</div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="bg-white shadow overflow-hidden sm:rounded-md">
          <ul className="divide-y divide-gray-200">
            {purchaseOrders.map((order) => {
              const isGermanOrder = order.supplier_name?.toLowerCase().includes('german') || 
                                   order.notes?.toLowerCase().includes('citrus burst energy cologne');
              
              return (
                <li key={order.id} className={`px-6 py-4 ${isGermanOrder ? 'bg-green-50' : ''}`}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <div className="flex-shrink-0">
                        <div className={`h-10 w-10 rounded-full flex items-center justify-center ${
                          isGermanOrder ? 'bg-green-100' : 'bg-gray-100'
                        }`}>
                          <FileCheck className={`h-5 w-5 ${isGermanOrder ? 'text-green-600' : 'text-gray-400'}`} />
                        </div>
                      </div>
                      <div className="ml-4">
                        <div className="flex items-center">
                          <div className={`text-sm font-medium ${isGermanOrder ? 'text-green-800' : 'text-gray-900'}`}>
                            {order.po_number}
                          </div>
                          {isGermanOrder && (
                            <span className="ml-2 inline-flex items-center px-2 py-1 text-xs font-medium rounded-full bg-green-100 text-green-800">
                              🇩🇪 German
                            </span>
                          )}
                        </div>
                        <div className="text-sm text-gray-500">
                          {order.supplier_name} • {formatDate(order.order_date)}
                        </div>
                        {isGermanOrder && order.notes && (
                          <div className="text-xs text-green-600">
                            {order.notes}
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center space-x-4">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(order.status)}`}>
                        {order.status}
                      </span>
                      <span className="text-sm font-medium text-gray-900">{formatCurrency(order.total_amount)}</span>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
};

// Requisitions Tab Component
const RequisitionsTab = ({ requisitions, isLoading, searchTerm, viewMode, selectedItems, sortBy, sortOrder, onToggleSelection, formatCurrency, formatDate, getStatusColor, getPriorityColor }) => {
  if (isLoading) {
    return <div className="text-center py-8">Loading requisitions...</div>;
  }

  return (
    <div className="space-y-6">
      {viewMode === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {requisitions.map((requisition) => (
            <div key={requisition.id} className="bg-white rounded-lg shadow border border-gray-200 hover:shadow-md transition-shadow">
              <div className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h3 className="text-lg font-medium text-gray-900">{requisition.requisition_number}</h3>
                    <p className="text-sm text-gray-500">{requisition.title}</p>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(requisition.status)}`}>
                      {requisition.status}
                    </span>
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getPriorityColor(requisition.priority)}`}>
                      {requisition.priority}
                    </span>
                  </div>
                </div>
                <div className="mt-4 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Requested By:</span>
                    <span className="text-gray-900">{requisition.first_name} {requisition.last_name}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Estimated Cost:</span>
                    <span className="text-gray-900 font-medium">{formatCurrency(requisition.total_estimated_cost)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Items:</span>
                    <span className="text-gray-900">{requisition.items_count || 0}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Quantity:</span>
                    <span className="text-gray-900">{requisition.total_quantity || 0}</span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-white shadow overflow-hidden sm:rounded-md">
          <ul className="divide-y divide-gray-200">
            {requisitions.map((requisition) => (
              <li key={requisition.id} className="px-6 py-4">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <h3 className="text-lg font-medium text-gray-900">{requisition.requisition_number}</h3>
                    <p className="text-sm text-gray-500">{requisition.title} • {requisition.first_name} {requisition.last_name}</p>
                  </div>
                  <div className="flex items-center space-x-4">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(requisition.status)}`}>
                      {requisition.status}
                    </span>
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getPriorityColor(requisition.priority)}`}>
                      {requisition.priority}
                    </span>
                    <span className="text-sm font-medium text-gray-900">{formatCurrency(requisition.total_estimated_cost)}</span>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

export default Procurement; 