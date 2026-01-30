import React, { useState, useEffect, useRef } from 'react';
import TranslatedText from '../components/TranslatedText';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Package,
  Store,
  Warehouse,
  Plus,
  Search,
  Filter,
  Edit,
  Trash2,
  Eye,
  TrendingUp,
  AlertTriangle,
  CheckCircle,
  XCircle,
  MapPin,
  Users,
  BarChart3,
  ArrowUpDown,
  Download,
  Upload,
  Settings,
  Save,
  X,
  ArrowLeft,
  ChevronDown,
  RefreshCw
} from 'lucide-react';
import { api } from '../lib/api';
import toast from 'react-hot-toast';
import { shopsAPI, productsAPI, inventoryAPI, categoriesAPI } from '../lib/api';
import { useTranslation } from '../hooks/useTranslation';

const Stocks = () => {
  const { tSync } = useTranslation();
  // Get user info for role-based access control
  const user = JSON.parse(localStorage.getItem('user') || '{}');

  const [activeTab, setActiveTab] = useState('overview');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedLocation, setSelectedLocation] = useState('all');
  const [selectedML, setSelectedML] = useState('all'); // 'all', '30', '50', '100'
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showBulkAssignModal, setShowBulkAssignModal] = useState(false);
  const [showReplenishModal, setShowReplenishModal] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [availableQuantity, setAvailableQuantity] = useState(null);
  const [editingAssignment, setEditingAssignment] = useState(null);
  const [sourceAvailableQuantity, setSourceAvailableQuantity] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(12);
  // Pagination for stock list
  const [stockCurrentPage, setStockCurrentPage] = useState(1);
  const [stockItemsPerPage, setStockItemsPerPage] = useState(20);
  const [productSearchTerm, setProductSearchTerm] = useState('');
  const [transferProductSearchTerm, setTransferProductSearchTerm] = useState('');
  const [isProductDropdownOpen, setIsProductDropdownOpen] = useState(false);
  const [isTransferDropdownOpen, setIsTransferDropdownOpen] = useState(false);
  const [assignFormData, setAssignFormData] = useState({
    location_type: 'shop',
    location_id: '',
    quantity: 0,
    min_stock_level: 10,
    max_stock_level: 100
  });
  const [transferFormData, setTransferFormData] = useState({
    from_id: '',
    to_id: '',
    product_id: '',
    quantity: 0,
    notes: ''
  });
  const [editFormData, setEditFormData] = useState({
    quantity: 0,
    min_stock_level: 10,
    max_stock_level: 100
  });
  const [bulkAssignFormData, setBulkAssignFormData] = useState({
    location_type: 'shop',
    location_id: '',
    default_quantity: 10,
    min_stock_level: 10,
    max_stock_level: 100
  });
  const [replenishingItem, setReplenishingItem] = useState(null);
  const [replenishData, setReplenishData] = useState(null);
  const [replenishQuantity, setReplenishQuantity] = useState(0);

  const queryClient = useQueryClient();

  // Ref for click outside detection
  const assignDropdownRef = useRef(null);
  const transferDropdownRef = useRef(null);

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (assignDropdownRef.current && !assignDropdownRef.current.contains(event.target)) {
        setIsProductDropdownOpen(false);
      }
      if (transferDropdownRef.current && !transferDropdownRef.current.contains(event.target)) {
        setIsTransferDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Fetch available quantity when both product and location are selected
  useEffect(() => {
    if (selectedProduct?.id && assignFormData.location_id) {
      fetchAvailableQuantity(selectedProduct.id, assignFormData.location_id);
    } else {
      setAvailableQuantity(null);
    }
  }, [selectedProduct, assignFormData.location_id]);

  // Fetch shops
  const { data: shopsData } = useQuery({
    queryKey: ['shops'],
    queryFn: () => shopsAPI.getAll().then(res => res.data),
  });

  // Fetch categories
  const { data: categoriesData } = useQuery({
    queryKey: ['categories'],
    queryFn: () => categoriesAPI.getAll().then(res => res.data),
  });

  // Fetch products for stock assignment with pagination
  const { data: productsData, isLoading: productsLoading, error: productsError } = useQuery({
    queryKey: ['products-for-stock', currentPage, itemsPerPage],
    queryFn: () => productsAPI.getAll({
      params: {
        page: currentPage,
        limit: itemsPerPage,
        include_all: 'true' // Special flag to bypass shop filtering for stock assignment
      }
    }).then(res => {
      console.log('Products API response:', res.data);
      console.log('Products count:', res.data.products?.length);
      console.log('Pagination info:', res.data.pagination);
      return res.data;
    }),
  });

  // Fetch ALL products for search functionality (no pagination)
  const { data: allProductsData, isLoading: allProductsLoading } = useQuery({
    queryKey: ['all-products-for-search'],
    queryFn: async () => {
      console.log('Fetching all products with params:', { page: 1, limit: 50000, include_all: 'true' });
      const response = await productsAPI.getAll({
        page: 1,
        limit: 50000, // Very large limit to ensure we get all products
        include_all: 'true'
      });
      console.log('All products response:', response.data);
      console.log('All products count:', response.data.products?.length);
      console.log('Total products:', response.data.pagination?.total);
      return response.data;
    },
  });

  // Normalize to arrays to avoid .map errors on bad responses
  const shops = Array.isArray(shopsData?.shops) ? shopsData.shops : [];
  const warehouses = []; // Warehouses endpoint removed
  const categories = Array.isArray(categoriesData?.flat) ? categoriesData.flat : (Array.isArray(categoriesData?.categories) ? categoriesData.categories : []);
  const products = Array.isArray(productsData?.products) ? productsData.products : [];
  const allProducts = Array.isArray(allProductsData?.products) ? allProductsData.products : [];
  const pagination = productsData?.pagination || {};
  const totalProducts = pagination.total || 0;
  const totalPages = pagination.totalPages || Math.ceil(totalProducts / itemsPerPage);

  // Filter ALL products based on search term (for search functionality)
  const filteredProducts = allProducts.filter(product =>
    product.name.toLowerCase().includes(productSearchTerm.toLowerCase()) ||
    (product.sku && product.sku.toLowerCase().includes(productSearchTerm.toLowerCase()))
  );

  // Filter ALL products for transfer modal search
  const filteredTransferProducts = allProducts.filter(product =>
    product.name.toLowerCase().includes(transferProductSearchTerm.toLowerCase()) ||
    (product.sku && product.sku.toLowerCase().includes(transferProductSearchTerm.toLowerCase()))
  );

  // Debug logging
  console.log('All products loaded:', allProducts.length);
  console.log('Filtered products for assign:', filteredProducts.length);
  console.log('Filtered products for transfer:', filteredTransferProducts.length);

  // Determine selected location for filtering
  // Check if selectedLocation is a shop or warehouse
  const isShop = shops.some(s => s.id === selectedLocation);
  const isWarehouse = warehouses.some(w => w.id === selectedLocation);
  const effectiveLocationType = isShop ? 'shop' : isWarehouse ? 'warehouse' : '';
  const effectiveLocationId = selectedLocation && selectedLocation !== 'all' ? selectedLocation : '';

  // Fetch stock levels
  const { data: stockData, isLoading } = useQuery({
    queryKey: ['stock-levels', effectiveLocationType, effectiveLocationId, selectedML, selectedCategory],
    queryFn: () => inventoryAPI.getLevels({
      location_type: effectiveLocationType || undefined,
      location_id: effectiveLocationId || undefined,
      category: selectedCategory !== 'all' ? selectedCategory : undefined
    }).then(res => res.data),
  });

  // Fetch inventory stats
  const { data: statsData } = useQuery({
    queryKey: ['inventory-stats'],
    queryFn: () => inventoryAPI.getStats().then(res => res.data),
  });

  const stockLevels = Array.isArray(stockData?.data) ? stockData.data : (Array.isArray(stockData) ? stockData : []);
  const stats = statsData || {};

  // Assign stock mutation
  const assignStockMutation = useMutation({
    mutationFn: (data) => inventoryAPI.assign(data),
    onSuccess: () => {
      queryClient.invalidateQueries(['stock-levels']);
      queryClient.invalidateQueries(['inventory-stats']);
      setShowAssignModal(false);
      setAssignFormData({
        location_type: 'shop',
        location_id: '',
        quantity: 0,
        min_stock_level: 10,
        max_stock_level: 100
      });
      setSelectedProduct(null);
      setAvailableQuantity(null);
      toast.success('Stock assigned successfully!');
    },
    onError: (error) => {
      toast.error(error.response?.data?.error || 'Failed to assign stock');
    }
  });

  // Transfer stock mutation
  const transferStockMutation = useMutation({
    mutationFn: (data) => inventoryAPI.transfer(data),
    onSuccess: () => {
      queryClient.invalidateQueries(['stock-levels']);
      queryClient.invalidateQueries(['inventory-stats']);
      queryClient.invalidateQueries(['inventory', 'transfers']); // Refresh transfers tab
      setShowTransferModal(false);
      setSourceAvailableQuantity(null);
      toast.success('Stock transferred successfully!');
    },
    onError: (error) => {
      toast.error(error.response?.data?.error || 'Failed to transfer stock');
    }
  });

  // Edit assignment mutation
  const editAssignmentMutation = useMutation({
    mutationFn: ({ assignmentId, data }) => api.put(`/inventory/assignments/${assignmentId}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['stock-levels']);
      queryClient.invalidateQueries(['inventory-stats']);
      setShowEditModal(false);
      setEditingAssignment(null);
      toast.success('Assignment updated successfully!');
    },
    onError: (error) => {
      toast.error(error.response?.data?.error || 'Failed to update assignment');
    }
  });

  // Bulk assign mutation
  const bulkAssignMutation = useMutation({
    mutationFn: async (data) => {
      const { location_type, location_id, default_quantity, min_stock_level, max_stock_level } = data;

      // Get all products with available stock
      const productsResponse = await api.get('/products');
      const productsWithStock = productsResponse.data.filter(p => p.current_stock > 0);

      // Assign each product
      const results = await Promise.allSettled(
        productsWithStock.map(product =>
          inventoryAPI.assign({
            location_type,
            location_id,
            product_id: product.id,
            quantity: Math.min(default_quantity, product.current_stock),
            min_stock_level,
            max_stock_level
          })
        )
      );

      return results;
    },
    onSuccess: (results) => {
      const successful = results.filter(r => r.status === 'fulfilled').length;
      const failed = results.filter(r => r.status === 'rejected').length;

      queryClient.invalidateQueries(['stock-levels']);
      queryClient.invalidateQueries(['inventory-stats']);
      setShowBulkAssignModal(false);
      setBulkAssignFormData({
        location_type: 'shop',
        location_id: '',
        default_quantity: 10,
        min_stock_level: 10,
        max_stock_level: 100
      });

      if (failed === 0) {
        toast.success(`Successfully assigned ${successful} products!`);
      } else {
        toast.success(`Assigned ${successful} products. ${failed} failed.`);
      }
    },
    onError: (error) => {
      toast.error(error.response?.data?.error || 'Failed to bulk assign products');
    }
  });

  // Replenish mutation
  const replenishMutation = useMutation({
    mutationFn: (data) => inventoryAPI.assign(data),
    onSuccess: () => {
      queryClient.invalidateQueries(['stock-levels']);
      queryClient.invalidateQueries(['inventory-stats']);
      setShowReplenishModal(false);
      setReplenishingItem(null);
      setReplenishData(null);
      setReplenishQuantity(0);
      toast.success('Shop replenished successfully!');
    },
    onError: (error) => {
      toast.error(error.response?.data?.error || 'Failed to replenish stock');
    }
  });

  // Delete assignment mutation
  const deleteAssignmentMutation = useMutation({
    mutationFn: (assignmentId) => api.delete(`/inventory/assignments/${assignmentId}`),
    onSuccess: () => {
      queryClient.invalidateQueries(['stock-levels']);
      queryClient.invalidateQueries(['inventory-stats']);
      setShowDeleteModal(false);
      setEditingAssignment(null);
      toast.success('Product unassigned successfully! Quantity returned to Global Stock.');
    },
    onError: (error) => {
      toast.error(error.response?.data?.error || 'Failed to unassign product');
    }
  });


  // Fetch available quantity for selected product
  const fetchAvailableQuantity = async (productId, locationId) => {
    if (!productId || !locationId) {
      setAvailableQuantity(null);
      return;
    }

    try {
      const response = await api.get(`/inventory/stock-info/${productId}/${locationId}`);
      setAvailableQuantity(response.data);
    } catch (error) {
      console.error('Error fetching available quantity:', error);
      setAvailableQuantity(null);
    }
  };

  // Fetch available quantity from source location for transfer
  const fetchSourceAvailableQuantity = async (fromType, fromId, productId) => {
    if (!fromType || !fromId || !productId) {
      setSourceAvailableQuantity(null);
      return;
    }

    try {
      const response = await api.get(`/inventory/locations/${fromType}/${fromId}/products/${productId}/quantity`);
      setSourceAvailableQuantity(response.data);
    } catch (error) {
      console.error('Error fetching source available quantity:', error);
      setSourceAvailableQuantity(null);
    }
  };

  const handleAssignStock = (e) => {
    e.preventDefault();
    if (!assignFormData.location_id) {
      toast.error('Please select a location');
      return;
    }
    if (!selectedProduct?.id) {
      toast.error('Please select a product');
      return;
    }
    if (assignFormData.quantity <= 0) {
      toast.error('Quantity must be greater than 0');
      return;
    }
    if (availableQuantity && assignFormData.quantity > availableQuantity.available_quantity) {
      toast.error(`Cannot assign more than available quantity (${availableQuantity.available_quantity} Unit)`);
      return;
    }

    assignStockMutation.mutate({ ...assignFormData, product_id: selectedProduct.id });
  };

  const handleTransferStock = (e) => {
    e.preventDefault();
    if (!transferFormData.from_id || !transferFormData.to_id) {
      toast.error('Please select both source and destination');
      return;
    }
    if (transferFormData.from_id === transferFormData.to_id) {
      toast.error('Source and destination cannot be the same');
      return;
    }
    if (!transferFormData.product_id) {
      toast.error('Please select a product');
      return;
    }
    if (transferFormData.quantity <= 0) {
      toast.error('Quantity must be greater than 0');
      return;
    }

    // Validate quantity against source available quantity
    if (sourceAvailableQuantity && transferFormData.quantity > (sourceAvailableQuantity.quantity || 0)) {
      toast.error(`Cannot transfer more than available quantity (${sourceAvailableQuantity.quantity || 0} Unit)`);
      return;
    }

    transferStockMutation.mutate({
      from_type: 'shop',
      from_id: transferFormData.from_id,
      to_type: 'shop',
      to_id: transferFormData.to_id,
      product_id: transferFormData.product_id,
      quantity: parseInt(transferFormData.quantity),
      notes: transferFormData.notes
    });
  };

  const handleEditAssignment = (assignment) => {
    setEditingAssignment(assignment);
    setEditFormData({
      quantity: assignment.quantity,
      min_stock_level: assignment.min_stock_level || 10,
      max_stock_level: assignment.max_stock_level || 100
    });
    setShowEditModal(true);
  };

  const handleDeleteAssignment = (assignment) => {
    setEditingAssignment(assignment);
    setShowDeleteModal(true);
  };

  const handleBulkAssign = (e) => {
    e.preventDefault();
    if (!bulkAssignFormData.location_id) {
      toast.error('Please select a location');
      return;
    }
    if (bulkAssignFormData.default_quantity <= 0) {
      toast.error('Default quantity must be greater than 0');
      return;
    }

    bulkAssignMutation.mutate(bulkAssignFormData);
  };

  // Handle replenish stock
  const handleReplenishStock = async (item) => {
    try {
      setReplenishingItem(item);

      // Fetch sold quantity and available stock for this product at this shop
      const response = await api.get(`/inventory/stock-info/${item.product_id}/${item.location_id}`);

      setReplenishData({
        shop_sold: response.data.shop_sold || 0,
        available_quantity: response.data.available_quantity || 0,
        shop_assigned: response.data.shop_assigned || 0,
        shop_remaining: response.data.shop_remaining || 0
      });

      // For perfume products, always replenish 1 unit from bulk
      // For other products, default to sold amount (if available stock allows)
      if (item.product_type === 'perfume') {
        setReplenishQuantity(1);
      } else {
        const soldQty = response.data.shop_sold || 0;
        const availableQty = response.data.available_quantity || 0;
        setReplenishQuantity(Math.min(soldQty, availableQty));
      }

      setShowReplenishModal(true);
    } catch (error) {
      console.error('Error fetching replenish data:', error);
      toast.error('Failed to fetch replenish information');
    }
  };

  // Handle replenish submit
  const handleReplenishSubmit = (e) => {
    e.preventDefault();

    if (replenishQuantity <= 0) {
      toast.error('Quantity must be greater than 0');
      return;
    }

    // For non-perfume products, check available quantity
    if (replenishingItem.product_type !== 'perfume' && replenishQuantity > replenishData.available_quantity) {
      toast.error(`Cannot replenish more than available quantity (${replenishData.available_quantity} Unit)`);
      return;
    }

    replenishMutation.mutate({
      location_type: replenishingItem.location_type,
      location_id: replenishingItem.location_id,
      product_id: replenishingItem.product_id,
      quantity: replenishingItem.quantity + replenishQuantity,
      min_stock_level: replenishingItem.min_stock_level || 10,
      max_stock_level: replenishingItem.max_stock_level || 100
    });
  };

  const handleEditSubmit = (e) => {
    e.preventDefault();
    if (!editingAssignment) return;

    editAssignmentMutation.mutate({
      assignmentId: editingAssignment.id,
      data: editFormData
    });
  };

  const handleDeleteConfirm = () => {
    if (!editingAssignment) return;

    deleteAssignmentMutation.mutate(editingAssignment.id);
  };



  const getLocationName = (locationId, locationType) => {
    if (locationType === 'shop') {
      const shop = shops.find(s => s.id === locationId);
      return shop ? shop.name : 'Unknown Shop';
    } else {
      return 'Unknown Location';
    }
  };

  const getStockStatus = (quantity, minLevel) => {
    if (quantity === 0) return { status: 'out-of-stock', color: 'text-red-600', bg: 'bg-red-100', icon: XCircle };
    if (quantity <= minLevel) return { status: 'low-stock', color: 'text-orange-600', bg: 'bg-orange-100', icon: AlertTriangle };
    return { status: 'in-stock', color: 'text-green-600', bg: 'bg-green-100', icon: CheckCircle };
  };

  // Helper function to extract ML from product size
  const extractML = (size) => {
    if (!size) return null;
    const match = size.toString().match(/(\d+)ml/i);
    return match ? parseInt(match[1]) : null;
  };

  const filteredStock = stockLevels.filter(item => {
    const matchesSearch = item.product_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.sku?.toLowerCase().includes(searchTerm.toLowerCase());

    // Filter by ML (bottle size)
    let matchesML = true;
    if (selectedML !== 'all') {
      // Get product size from the item or fetch from product details
      const productML = extractML(item.size);
      matchesML = productML === parseInt(selectedML);
    }

    return matchesSearch && matchesML;
  });

  // Pagination for stock list
  const totalStockItems = filteredStock.length;
  const totalStockPages = Math.ceil(totalStockItems / stockItemsPerPage);
  const startIndex = (stockCurrentPage - 1) * stockItemsPerPage;
  const endIndex = startIndex + stockItemsPerPage;
  const paginatedStock = filteredStock.slice(startIndex, endIndex);

  // Reset stock page when filters change
  useEffect(() => {
    setStockCurrentPage(1);
  }, [searchTerm, selectedLocation, selectedML, selectedCategory]);

  return (
    <div className="space-y-4 sm:space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900"><TranslatedText text="Stock Management" /></h1>
          <p className="text-sm sm:text-base text-gray-600 mt-1 sm:mt-2">{tSync('Manage inventory across all locations')}</p>
        </div>
        {(user?.role === 'admin') && (
          <div className="flex flex-wrap gap-2 sm:gap-3">
            <button
              onClick={() => setShowTransferModal(true)}
              className="inline-flex items-center px-3 sm:px-4 py-2.5 sm:py-2 bg-purple-600 text-white font-medium rounded-xl hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 transition-all duration-200 min-h-[44px] touch-target text-sm"
            >
              <ArrowUpDown className="h-5 w-5 mr-1 sm:mr-2" />
              <span className="hidden sm:inline">{tSync('Transfer Stock')}</span>
              <span className="sm:hidden">Transfer</span>
            </button>
            <button
              onClick={() => setShowBulkAssignModal(true)}
              className="inline-flex items-center px-3 sm:px-4 py-2.5 sm:py-2 bg-green-600 text-white font-medium rounded-xl hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 transition-all duration-200 min-h-[44px] touch-target text-sm"
            >
              <Package className="h-5 w-5 mr-1 sm:mr-2" />
              <span className="hidden sm:inline">{tSync('Assign All Products')}</span>
              <span className="sm:hidden">Assign All</span>
            </button>
            <button
              onClick={() => setShowAssignModal(true)}
              className="inline-flex items-center px-3 sm:px-4 py-2.5 sm:py-2 bg-blue-600 text-white font-medium rounded-xl hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-all duration-200 min-h-[44px] touch-target text-sm"
            >
              <Plus className="h-5 w-5 mr-1 sm:mr-2" />
              <span className="hidden sm:inline">{tSync('Assign Stock')}</span>
              <span className="sm:hidden">Assign</span>
            </button>
          </div>
        )}
      </div>

      {/* Stats Cards - Hidden for managers */}
      {user?.role !== 'manager' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
          <div className="bg-white rounded-2xl p-4 sm:p-6 shadow-sm border border-gray-100">
            <div className="flex items-center">
              <div className="p-3 bg-blue-100 rounded-xl">
                <Package className="h-6 w-6 text-blue-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">{tSync('Total Products')}</p>
                <p className="text-xl sm:text-2xl font-bold text-gray-900">{stats.total_products || 0}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl p-4 sm:p-6 shadow-sm border border-gray-100">
            <div className="flex items-center">
              <div className="p-3 bg-green-100 rounded-xl">
                <TrendingUp className="h-6 w-6 text-green-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">{tSync('Total Stock Value')}</p>
                <p className="text-xl sm:text-2xl font-bold text-gray-900">
                  {Math.floor(stats.total_stock_value || 0).toLocaleString()} CFA
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl p-4 sm:p-6 shadow-sm border border-gray-100">
            <div className="flex items-center">
              <div className="p-3 bg-orange-100 rounded-xl">
                <AlertTriangle className="h-6 w-6 text-orange-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">{tSync('Low Stock Items')}</p>
                <p className="text-xl sm:text-2xl font-bold text-gray-900">{stats.low_stock_count || 0}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl p-4 sm:p-6 shadow-sm border border-gray-100">
            <div className="flex items-center">
              <div className="p-3 bg-red-100 rounded-xl">
                <XCircle className="h-6 w-6 text-red-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">{tSync('Out of Stock')}</p>
                <p className="text-xl sm:text-2xl font-bold text-gray-900">{stats.out_of_stock_count || 0}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="bg-white rounded-2xl p-4 sm:p-6 shadow-sm border border-gray-100">
        <div className="flex flex-col lg:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                type="text"
                placeholder={tSync('Search products by name or SKU...')}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>
          <div className="flex flex-wrap gap-2 sm:gap-3">
            <select
              value={selectedLocation}
              onChange={(e) => setSelectedLocation(e.target.value)}
              className="px-3 sm:px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent min-w-[160px] sm:min-w-[200px]"
            >
              <option value="all">{tSync('All Shops')}</option>
              <optgroup label={tSync('Shops')}>
                {shops.map(shop => (
                  <option key={shop.id} value={shop.id}>{shop.name}</option>
                ))}
              </optgroup>
              {warehouses.length > 0 && (
                <optgroup label={tSync('Warehouses')}>
                  {warehouses.map(warehouse => (
                    <option key={warehouse.id} value={warehouse.id}>{warehouse.name}</option>
                  ))}
                </optgroup>
              )}
            </select>

            <select
              value={selectedML}
              onChange={(e) => setSelectedML(e.target.value)}
              className="px-3 sm:px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent min-w-[100px]"
            >
              <option value="all">{tSync('All Sizes')}</option>
              <option value="30">30 ML</option>
              <option value="50">50 ML</option>
              <option value="100">100 ML</option>
            </select>

            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="px-3 sm:px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent min-w-[140px] sm:min-w-[180px]"
            >
              <option value="all">{tSync('All Categories')}</option>
              {categories.map(category => (
                <option key={category.id} value={category.id}>{category.name}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Stock Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="px-4 sm:px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900"><TranslatedText text="Stock Levels" /></h3>
        </div>

        {isLoading ? (
          <div className="p-6 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-2 text-gray-600">{tSync('Loading stock data...')}</p>
          </div>
        ) : filteredStock.length === 0 ? (
          <div className="p-8 sm:p-12 text-center">
            <Package className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2"><TranslatedText text="No stock data found" /></h3>
            <p className="text-sm sm:text-base text-gray-500 mb-6 max-w-md mx-auto">
              {searchTerm || selectedML !== 'all'
                ? tSync('Try adjusting your search or filter criteria.')
                : tSync('No stock assigned to this location.')}
              {totalStockItems > 0 && (
                <span className="block mt-2 text-sm text-gray-600">
                  {tSync('Found')} {totalStockItems} {tSync('item')}{totalStockItems !== 1 ? 's' : ''} {tSync('matching your criteria.')}
                </span>
              )}
            </p>
            <button
              onClick={() => setShowAssignModal(true)}
              className="inline-flex items-center px-4 py-2.5 sm:py-2 bg-blue-600 text-white font-medium rounded-xl hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 min-h-[44px] touch-target"
            >
              <Plus className="h-5 w-5 mr-2" />
              {tSync('Assign Stock')}
            </button>
          </div>
        ) : (
          <>
            {/* Table - Hidden on mobile, shown on md and up */}
            <div className="hidden md:block overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {tSync('Product')}
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{tSync('Location')}</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{tSync('Quantity')}</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{tSync('Min Level')}</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{tSync('Status')}</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">{tSync('Actions')}</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {paginatedStock.map((item) => {
                    const status = getStockStatus(item.quantity, item.min_stock_level);
                    const StatusIcon = status.icon;

                    return (
                      <tr key={item.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div>
                            <div className="text-sm font-medium text-gray-900">{item.product_name}</div>
                            <div className="text-sm text-gray-500">{item.sku}</div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <MapPin className="h-4 w-4 text-gray-400 mr-2" />
                            <span className="text-sm text-gray-900">
                              {item.location_name || getLocationName(item.location_id, item.location_type)}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">{item.quantity}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-500">{item.min_stock_level}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${status.bg} ${status.color}`}>
                            <StatusIcon className="h-3 w-3 mr-1" />
                            {status.status.replace('-', ' ')}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <div className="flex items-center space-x-2">
                            {(user?.role === 'admin' || user?.role === 'manager') && item.product_type === 'perfume' && (
                              <button
                                onClick={() => handleReplenishStock(item)}
                                className="text-purple-600 hover:text-purple-900 p-1 rounded hover:bg-purple-50"
                                title="Replenish from Sales"
                              >
                                <RefreshCw className="h-4 w-4" />
                              </button>
                            )}
                            <button
                              onClick={() => handleEditAssignment(item)}
                              className="text-green-600 hover:text-green-900 p-1 rounded hover:bg-green-50"
                              title="Edit Assignment"
                            >
                              <Edit className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => handleDeleteAssignment(item)}
                              className="text-red-600 hover:text-red-900 p-1 rounded hover:bg-red-50"
                              title="Unassign Product (Return to Global Stock)"
                            >
                              <ArrowLeft className="h-4 w-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            {/* Mobile Card View - Shown on mobile */}
            <div className="md:hidden p-4 space-y-4">
              {paginatedStock.map((item) => {
                const status = getStockStatus(item.quantity, item.min_stock_level);
                const StatusIcon = status.icon;

                return (
                  <div key={item.id} className="bg-white rounded-xl p-4 shadow-sm border border-gray-200">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <h3 className="text-base font-medium text-gray-900 mb-1">{item.product_name}</h3>
                        <p className="text-sm text-gray-500 mb-2">{item.sku}</p>
                        <div className="flex items-center text-sm text-gray-600 mb-2">
                          <MapPin className="h-4 w-4 mr-1 text-gray-400" />
                          <span>{item.location_name || getLocationName(item.location_id, item.location_type)}</span>
                        </div>
                      </div>
                      <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${status.bg} ${status.color}`}>
                        <StatusIcon className="h-3 w-3 mr-1" />
                        {status.status.replace('-', ' ')}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-3 pt-3 border-t border-gray-100">
                      <div>
                        <p className="text-xs text-gray-500 mb-1">Quantity</p>
                        <p className="text-sm font-semibold text-gray-900">{item.quantity}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500 mb-1">Min Level</p>
                        <p className="text-sm font-semibold text-gray-900">{item.min_stock_level}</p>
                      </div>
                    </div>

                    <div className="flex items-center justify-end gap-2 pt-3 mt-3 border-t border-gray-100">
                      {(user?.role === 'admin' || user?.role === 'manager') && item.product_type === 'perfume' && (
                        <button
                          onClick={() => handleReplenishStock(item)}
                          className="p-2 text-purple-600 hover:text-purple-900 hover:bg-purple-50 rounded-lg transition-colors min-h-[36px] min-w-[36px] flex items-center justify-center"
                          title="Replenish from Sales"
                        >
                          <RefreshCw className="h-4 w-4" />
                        </button>
                      )}
                      <button
                        onClick={() => handleEditAssignment(item)}
                        className="p-2 text-green-600 hover:text-green-900 hover:bg-green-50 rounded-lg transition-colors min-h-[36px] min-w-[36px] flex items-center justify-center"
                        title="Edit Assignment"
                      >
                        <Edit className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteAssignment(item)}
                        className="p-2 text-red-600 hover:text-red-900 hover:bg-red-50 rounded-lg transition-colors min-h-[36px] min-w-[36px] flex items-center justify-center"
                        title="Unassign Product"
                      >
                        <ArrowLeft className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}

        {/* Stock List Pagination */}
        {totalStockPages > 1 && (
          <div className="bg-white rounded-lg border border-gray-200 px-4 py-4 mt-6">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
              {/* Left side - Items per page and info */}
              <div className="flex flex-col sm:flex-row items-center gap-3">
                <div className="flex items-center space-x-2">
                  <span className="text-sm text-gray-700">Show</span>
                  <select
                    value={stockItemsPerPage}
                    onChange={(e) => {
                      setStockItemsPerPage(parseInt(e.target.value));
                      setStockCurrentPage(1);
                    }}
                    className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                  >
                    <option value={10}>10</option>
                    <option value={20}>20</option>
                    <option value={50}>50</option>
                    <option value={100}>100</option>
                  </select>
                  <span className="text-sm text-gray-700">per page</span>
                </div>
                <span className="text-sm text-gray-600">
                  Showing <span className="font-semibold text-gray-900">{startIndex + 1}</span> to{' '}
                  <span className="font-semibold text-gray-900">{Math.min(endIndex, totalStockItems)}</span> of{' '}
                  <span className="font-semibold text-gray-900">{totalStockItems}</span> items
                </span>
              </div>

              {/* Right side - Page navigation */}
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => setStockCurrentPage(Math.max(1, stockCurrentPage - 1))}
                  disabled={stockCurrentPage === 1}
                  className="inline-flex items-center px-3 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <svg className="h-4 w-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                  Previous
                </button>

                {/* Page numbers */}
                <div className="flex items-center space-x-1">
                  {(() => {
                    const pages = [];
                    const maxVisiblePages = 7;
                    let startPage = Math.max(1, stockCurrentPage - Math.floor(maxVisiblePages / 2));
                    let endPage = Math.min(totalStockPages, startPage + maxVisiblePages - 1);

                    if (endPage - startPage + 1 < maxVisiblePages) {
                      startPage = Math.max(1, endPage - maxVisiblePages + 1);
                    }

                    // First page
                    if (startPage > 1) {
                      pages.push(
                        <button
                          key={1}
                          onClick={() => setStockCurrentPage(1)}
                          className="px-3 py-2 text-sm font-medium rounded-lg text-gray-700 hover:bg-gray-100 transition-colors"
                        >
                          1
                        </button>
                      );
                      if (startPage > 2) {
                        pages.push(
                          <span key="ellipsis1" className="px-2 text-gray-500">
                            ...
                          </span>
                        );
                      }
                    }

                    // Page numbers
                    for (let i = startPage; i <= endPage; i++) {
                      pages.push(
                        <button
                          key={i}
                          onClick={() => setStockCurrentPage(i)}
                          className={`px-3 py-2 text-sm font-medium rounded-lg transition-colors ${i === stockCurrentPage
                            ? 'bg-blue-600 text-white shadow-sm'
                            : 'text-gray-700 hover:bg-gray-100'
                            }`}
                        >
                          {i}
                        </button>
                      );
                    }

                    // Last page
                    if (endPage < totalStockPages) {
                      if (endPage < totalStockPages - 1) {
                        pages.push(
                          <span key="ellipsis2" className="px-2 text-gray-500">
                            ...
                          </span>
                        );
                      }
                      pages.push(
                        <button
                          key={totalStockPages}
                          onClick={() => setStockCurrentPage(totalStockPages)}
                          className="px-3 py-2 text-sm font-medium rounded-lg text-gray-700 hover:bg-gray-100 transition-colors"
                        >
                          {totalStockPages}
                        </button>
                      );
                    }

                    return pages;
                  })()}
                </div>

                <button
                  onClick={() => setStockCurrentPage(Math.min(totalStockPages, stockCurrentPage + 1))}
                  disabled={stockCurrentPage === totalStockPages}
                  className="inline-flex items-center px-3 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  Next
                  <svg className="h-4 w-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Assign Stock Modal - Admin only */}
      {showAssignModal && user?.role === 'admin' && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-6 w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-gray-900"><TranslatedText text="Assign Stock to Location" /></h2>
              <button
                onClick={() => {
                  setShowAssignModal(false);
                  setSelectedProduct(null);
                  setAvailableQuantity(null);
                  setProductSearchTerm('');
                }}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleAssignStock} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Location Type
                  </label>
                  <select
                    value={assignFormData.location_type}
                    onChange={(e) => setAssignFormData(prev => ({ ...prev, location_type: e.target.value, location_id: '' }))}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="shop">Shop</option>
                    <option value="warehouse">Warehouse</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Location
                  </label>
                  <select
                    value={assignFormData.location_id}
                    onChange={(e) => {
                      setAssignFormData(prev => ({ ...prev, location_id: e.target.value }));
                      if (selectedProduct && e.target.value) {
                        fetchAvailableQuantity(selectedProduct.id, e.target.value);
                      }
                    }}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  >
                    <option value="">Select Location</option>
                    {assignFormData.location_type === 'shop'
                      ? shops.map(shop => (
                        <option key={shop.id} value={shop.id}>{shop.name}</option>
                      ))
                      : warehouses.map(warehouse => (
                        <option key={warehouse.id} value={warehouse.id}>{warehouse.name}</option>
                      ))
                    }
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Product {allProductsLoading && <span className="text-blue-600">(Loading...)</span>}
                    {productsError && <span className="text-red-600">(Error loading products)</span>}
                    <span className="text-gray-500 text-sm">({filteredProducts.length} {tSync('products found')})</span>
                    {allProductsData && (
                      <div className="text-xs text-gray-400 mt-1">
                        Total in database: {allProducts.length} products
                        {allProducts.length < 592 && (
                          <span className="text-red-500 ml-2">⚠️ Not all products loaded!</span>
                        )}
                      </div>
                    )}
                  </label>

                  {/* Custom Product Dropdown */}
                  <div className="relative" ref={assignDropdownRef}>
                    <button
                      type="button"
                      onClick={() => setIsProductDropdownOpen(!isProductDropdownOpen)}
                      disabled={allProductsLoading}
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent text-left bg-white flex items-center justify-between disabled:bg-gray-100 disabled:cursor-not-allowed"
                    >
                      <span className={selectedProduct ? 'text-gray-900' : 'text-gray-500'}>
                        {selectedProduct ? `${selectedProduct.name} (${selectedProduct.sku || 'No SKU'})` : 'Select Product'}
                      </span>
                      <ChevronDown className={`h-4 w-4 transition-transform ${isProductDropdownOpen ? 'rotate-180' : ''}`} />
                    </button>

                    {isProductDropdownOpen && (
                      <div className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-xl shadow-lg max-h-80 overflow-y-auto">
                        <div className="p-2 sticky top-0 bg-white border-b border-gray-200">
                          <input
                            type="text"
                            placeholder={tSync('Search products...')}
                            value={productSearchTerm}
                            onChange={(e) => setProductSearchTerm(e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                            autoFocus
                          />
                        </div>
                        <div className="max-h-80 overflow-y-auto">
                          {filteredProducts.length === 0 ? (
                            <div className="p-4 text-center text-gray-500 text-sm">
                              {tSync('No products found')}
                            </div>
                          ) : (
                            filteredProducts.map(product => (
                              <button
                                key={`assign-${product.id}`}
                                type="button"
                                onClick={() => {
                                  setSelectedProduct(product);
                                  setIsProductDropdownOpen(false);
                                  if (assignFormData.location_id) {
                                    fetchAvailableQuantity(product.id, assignFormData.location_id);
                                  }
                                }}
                                className="w-full px-4 py-2 text-left hover:bg-blue-50 border-b border-gray-100 last:border-b-0"
                              >
                                <div className="font-medium text-gray-900">{product.name}</div>
                                <div className="text-xs text-gray-500">
                                  SKU: {product.sku || 'No SKU'} | Stock: {product.stock_quantity || 0}
                                </div>
                              </button>
                            ))
                          )}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Selected Product Information */}
                  {selectedProduct && (
                    <div className="mt-3 p-4 bg-purple-50 rounded-lg border border-purple-200">
                      <h4 className="font-medium text-purple-900 mb-2">Selected Product</h4>
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <div>
                          <span className="text-purple-700 font-medium">Name:</span>
                          <span className="ml-2 text-purple-900">{selectedProduct.name}</span>
                        </div>
                        <div>
                          <span className="text-purple-700 font-medium">SKU:</span>
                          <span className="ml-2 text-purple-900">{selectedProduct.sku || 'N/A'}</span>
                        </div>
                        <div className="col-span-2">
                          <span className="text-purple-700 font-medium">Current Stock (Total):</span>
                          <span className="ml-2 text-purple-900 font-bold text-lg">{selectedProduct.stock_quantity || 0} Unit</span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Enhanced Stock Information Display */}
                  {availableQuantity && (
                    <div className="mt-3 space-y-3">
                      {/* Global Stock Overview */}
                      <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                        <div className="flex items-center justify-between">
                          <div>
                            <h4 className="font-medium text-blue-900 mb-2">Global Stock Overview</h4>
                            <div className="text-sm text-blue-700 space-y-1">
                              <div>Total Global Stock: <span className="font-semibold">{availableQuantity.global_stock}</span> Unit</div>
                              <div>Already Assigned: <span className="font-semibold">{availableQuantity.total_assigned}</span> Unit</div>
                              <div className="mt-1 text-base">
                                Available for Assignment: <span className="font-bold text-blue-800">{availableQuantity.available_quantity}</span> Unit
                              </div>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-3xl font-bold text-blue-600">
                              {availableQuantity.available_quantity}
                            </div>
                            <div className="text-xs text-blue-500">ML available</div>
                          </div>
                        </div>
                      </div>

                      {/* Shop-Specific Information */}
                      {assignFormData.location_type === 'shop' && (
                        <div className={`p-4 rounded-lg border ${availableQuantity.shop_assigned > 0
                          ? 'bg-orange-50 border-orange-200'
                          : 'bg-green-50 border-green-200'
                          }`}>
                          <h4 className={`font-medium mb-2 ${availableQuantity.shop_assigned > 0
                            ? 'text-orange-900'
                            : 'text-green-900'
                            }`}>
                            Shop Assignment Status
                          </h4>
                          <div className={`text-sm space-y-1 ${availableQuantity.shop_assigned > 0
                            ? 'text-orange-700'
                            : 'text-green-700'
                            }`}>
                            <div>Currently Assigned: <span className="font-semibold">{availableQuantity.shop_assigned}</span> Unit</div>
                            <div>Sold: <span className="font-semibold">{availableQuantity.shop_sold}</span> Unit</div>
                            <div>Remaining: <span className="font-semibold">{availableQuantity.shop_remaining}</span> Unit</div>
                          </div>
                        </div>
                      )}

                    </div>
                  )}
                  {productsLoading && (
                    <p className="text-sm text-blue-600 mt-1">Loading products...</p>
                  )}
                  {productsError && (
                    <p className="text-sm text-red-600 mt-1">Error: {productsError.message}</p>
                  )}
                  {!productsLoading && !productsError && products.length === 0 && (
                    <p className="text-sm text-orange-600 mt-1">No products available. Create some products first.</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Quantity to Assign
                    {availableQuantity && (
                      <span className="text-sm text-gray-500 ml-2">
                        (Available: {availableQuantity.available_quantity} Unit)
                      </span>
                    )}
                  </label>
                  <input
                    type="number"
                    value={assignFormData.quantity}
                    onChange={(e) => setAssignFormData(prev => ({ ...prev, quantity: parseInt(e.target.value) || 0 }))}
                    className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent ${availableQuantity && assignFormData.quantity > availableQuantity.available_quantity
                      ? 'border-red-300 bg-red-50'
                      : 'border-gray-300'
                      }`}
                    min="1"
                    max={availableQuantity?.available_quantity || undefined}
                    required
                  />
                  {assignFormData.quantity <= 0 && (
                    <p className="text-red-600 text-sm mt-1">
                      ⚠️ Quantity must be greater than 0
                    </p>
                  )}
                  {availableQuantity && assignFormData.quantity > availableQuantity.available_quantity && (
                    <p className="text-red-600 text-sm mt-1">
                      ⚠️ Cannot assign more than available quantity ({availableQuantity.available_quantity} Unit)
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Minimum Stock Level
                  </label>
                  <input
                    type="number"
                    value={assignFormData.min_stock_level}
                    onChange={(e) => setAssignFormData(prev => ({ ...prev, min_stock_level: parseInt(e.target.value) || 0 }))}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    min="0"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Maximum Stock Level
                  </label>
                  <input
                    type="number"
                    value={assignFormData.max_stock_level}
                    onChange={(e) => setAssignFormData(prev => ({ ...prev, max_stock_level: parseInt(e.target.value) || 0 }))}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    min="0"
                  />
                </div>
              </div>

              <div className="flex justify-end space-x-4 pt-6 border-t border-gray-200">
                <button
                  type="button"
                  onClick={() => setShowAssignModal(false)}
                  className="px-6 py-3 border border-gray-300 text-gray-700 font-medium rounded-xl hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={
                    assignStockMutation.isPending ||
                    assignFormData.quantity <= 0 ||
                    (availableQuantity && assignFormData.quantity > availableQuantity.available_quantity)
                  }
                  className="px-6 py-3 bg-blue-600 text-white font-medium rounded-xl hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {assignStockMutation.isPending ? (
                    <div className="flex items-center">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Assigning...
                    </div>
                  ) : (
                    <div className="flex items-center">
                      <Save className="h-4 w-4 mr-2" />
                      {tSync('Assign Stock')}
                    </div>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Transfer Stock Modal - Admin only */}
      {showTransferModal && user?.role === 'admin' && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-6 w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-gray-900"><TranslatedText text="Transfer Stock Between Shops" /></h2>
              <button
                onClick={() => {
                  setShowTransferModal(false);
                  setSourceAvailableQuantity(null);
                  setTransferProductSearchTerm('');
                  setTransferFormData({
                    from_id: '',
                    to_id: '',
                    product_id: '',
                    quantity: 0,
                    notes: ''
                  });
                }}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleTransferStock} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">From Shop</label>
                  <select
                    value={transferFormData.from_id}
                    onChange={(e) => {
                      setTransferFormData(prev => ({ ...prev, from_id: e.target.value }));
                      // Fetch available quantity from source location if product is selected
                      if (transferFormData.product_id) {
                        fetchSourceAvailableQuantity('shop', e.target.value, transferFormData.product_id);
                      }
                    }}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  >
                    <option value="">Select Source Shop</option>
                    {shops.map(shop => (
                      <option key={shop.id} value={shop.id}>{shop.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">To Shop</label>
                  <select
                    value={transferFormData.to_id}
                    onChange={(e) => setTransferFormData(prev => ({ ...prev, to_id: e.target.value }))}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  >
                    <option value="">Select Destination Shop</option>
                    {shops.map(shop => (
                      <option key={shop.id} value={shop.id}>{shop.name}</option>
                    ))}
                  </select>
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Product {allProductsLoading && <span className="text-blue-600">(Loading...)</span>}
                    <span className="text-gray-500 text-sm">({filteredTransferProducts.length} {tSync('products found')})</span>
                    {allProductsData && (
                      <div className="text-xs text-gray-400 mt-1">
                        Total in database: {allProducts.length} products
                        {allProducts.length < 592 && (
                          <span className="text-red-500 ml-2">⚠️ Not all products loaded!</span>
                        )}
                      </div>
                    )}
                  </label>

                  {/* Custom Product Dropdown for Transfer */}
                  <div className="relative" ref={transferDropdownRef}>
                    <button
                      type="button"
                      onClick={() => setIsTransferDropdownOpen(!isTransferDropdownOpen)}
                      disabled={allProductsLoading}
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent text-left bg-white flex items-center justify-between disabled:bg-gray-100 disabled:cursor-not-allowed"
                    >
                      <span className={transferFormData.product_id ? 'text-gray-900' : 'text-gray-500'}>
                        {transferFormData.product_id
                          ? filteredTransferProducts.find(p => p.id === transferFormData.product_id)?.name || 'Select Product'
                          : 'Select Product'}
                      </span>
                      <ChevronDown className={`h-4 w-4 transition-transform ${isTransferDropdownOpen ? 'rotate-180' : ''}`} />
                    </button>

                    {isTransferDropdownOpen && (
                      <div className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-xl shadow-lg max-h-80 overflow-y-auto">
                        <div className="p-2 sticky top-0 bg-white border-b border-gray-200">
                          <input
                            type="text"
                            placeholder={tSync('Search products...')}
                            value={transferProductSearchTerm}
                            onChange={(e) => setTransferProductSearchTerm(e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                            autoFocus
                          />
                        </div>
                        <div className="max-h-80 overflow-y-auto">
                          {filteredTransferProducts.length === 0 ? (
                            <div className="p-4 text-center text-gray-500 text-sm">
                              {tSync('No products found')}
                            </div>
                          ) : (
                            filteredTransferProducts.map(product => (
                              <button
                                key={`transfer-${product.id}`}
                                type="button"
                                onClick={() => {
                                  setTransferFormData(prev => ({ ...prev, product_id: product.id }));
                                  setIsTransferDropdownOpen(false);
                                  if (transferFormData.from_type && transferFormData.from_id) {
                                    fetchSourceAvailableQuantity(transferFormData.from_type, transferFormData.from_id, product.id);
                                  }
                                }}
                                className="w-full px-4 py-2 text-left hover:bg-blue-50 border-b border-gray-100 last:border-b-0"
                              >
                                <div className="font-medium text-gray-900">{product.name}</div>
                                <div className="text-xs text-gray-500">
                                  SKU: {product.sku || 'No SKU'} | Stock: {product.stock_quantity || 0}
                                </div>
                              </button>
                            ))
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                  {transferFormData.product_id && (
                    <div className="mt-2 p-3 bg-purple-50 rounded-lg border border-purple-200">
                      <h4 className="font-medium text-purple-900 mb-2">Selected Product Details</h4>
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        {(() => {
                          const selectedProduct = products.find(p => p.id === transferFormData.product_id);
                          return selectedProduct ? (
                            <>
                              <div>
                                <span className="text-purple-700 font-medium">Name:</span>
                                <span className="ml-2 text-purple-900">{selectedProduct.name}</span>
                              </div>
                              <div>
                                <span className="text-purple-700 font-medium">SKU:</span>
                                <span className="ml-2 text-purple-900">{selectedProduct.sku || 'N/A'}</span>
                              </div>
                              <div>
                                <span className="text-purple-700 font-medium">Current Stock:</span>
                                <span className="ml-2 text-purple-900 font-semibold">{selectedProduct.stock_quantity || 0} Unit</span>
                              </div>
                              <div>
                                <span className="text-purple-700 font-medium">Price:</span>
                                <span className="ml-2 text-purple-900">{Math.floor(selectedProduct.price || 0).toLocaleString()} CFA</span>
                              </div>
                            </>
                          ) : null;
                        })()}
                      </div>
                    </div>
                  )}
                  {!productsLoading && products.length === 0 && (
                    <p className="text-sm text-orange-600 mt-1">No products available. Create some products first.</p>
                  )}
                </div>

                {/* Source Available Quantity Display */}
                {sourceAvailableQuantity && (
                  <div className="md:col-span-2 mt-3 p-4 bg-orange-50 rounded-lg border border-orange-200">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="font-medium text-orange-900 mb-1">Available in Source Location</h4>
                        <div className="text-sm text-orange-700">
                          <div>Location: <span className="font-semibold">{getLocationName(transferFormData.from_id, transferFormData.from_type)}</span></div>
                          <div className="mt-1 text-base">
                            Available: <span className="font-bold text-orange-800">{sourceAvailableQuantity.quantity || 0}</span> Unit
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-3xl font-bold text-orange-600">
                          {sourceAvailableQuantity.quantity || 0}
                        </div>
                        <div className="text-xs text-orange-500">ML available</div>
                      </div>
                    </div>
                  </div>
                )}

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Quantity
                    {sourceAvailableQuantity && (
                      <span className="text-sm text-gray-500 ml-2">
                        (Max: {sourceAvailableQuantity.quantity || 0} Unit)
                      </span>
                    )}
                  </label>
                  <input
                    type="number"
                    value={transferFormData.quantity}
                    onChange={(e) => setTransferFormData(prev => ({ ...prev, quantity: parseInt(e.target.value) || 0 }))}
                    className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent ${sourceAvailableQuantity && transferFormData.quantity > (sourceAvailableQuantity.quantity || 0)
                      ? 'border-red-300 bg-red-50'
                      : 'border-gray-300'
                      }`}
                    min="0"
                    max={sourceAvailableQuantity?.quantity || undefined}
                    required
                  />
                  {sourceAvailableQuantity && transferFormData.quantity > (sourceAvailableQuantity.quantity || 0) && (
                    <p className="text-red-600 text-sm mt-1">
                      ⚠️ Cannot transfer more than available quantity ({sourceAvailableQuantity.quantity || 0} Unit)
                    </p>
                  )}
                </div>
              </div>

              <div className="flex justify-end space-x-4 pt-6 border-t border-gray-200">
                <button
                  type="button"
                  onClick={() => setShowTransferModal(false)}
                  className="px-6 py-3 border border-gray-300 text-gray-700 font-medium rounded-xl hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={transferStockMutation.isPending}
                  className="px-6 py-3 bg-purple-600 text-white font-medium rounded-xl hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {transferStockMutation.isPending ? (
                    <div className="flex items-center">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Transferring...
                    </div>
                  ) : (
                    <div className="flex items-center">
                      <ArrowUpDown className="h-4 w-4 mr-2" />
                      {tSync('Transfer Stock')}
                    </div>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Assignment Modal */}
      {showEditModal && editingAssignment && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md mx-4">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-gray-900"><TranslatedText text="Edit Assignment" /></h2>
              <button
                onClick={() => {
                  setShowEditModal(false);
                  setEditingAssignment(null);
                }}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="mb-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
              <h4 className="font-medium text-blue-900 mb-2">Assignment Details</h4>
              <div className="text-sm text-blue-700">
                <div><strong>Product:</strong> {editingAssignment.product_name}</div>
                <div><strong>Location:</strong> {getLocationName(editingAssignment.location_id, editingAssignment.location_type)}</div>
                <div><strong>Current Quantity:</strong> {editingAssignment.quantity} Unit</div>
              </div>
            </div>

            <form onSubmit={handleEditSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">New Quantity</label>
                <input
                  type="number"
                  value={editFormData.quantity}
                  onChange={(e) => setEditFormData(prev => ({ ...prev, quantity: parseInt(e.target.value) || 0 }))}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  min="0"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Min Stock Level</label>
                  <input
                    type="number"
                    value={editFormData.min_stock_level}
                    onChange={(e) => setEditFormData(prev => ({ ...prev, min_stock_level: parseInt(e.target.value) || 0 }))}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    min="0"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Max Stock Level</label>
                  <input
                    type="number"
                    value={editFormData.max_stock_level}
                    onChange={(e) => setEditFormData(prev => ({ ...prev, max_stock_level: parseInt(e.target.value) || 0 }))}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    min="0"
                  />
                </div>
              </div>

              <div className="flex justify-end space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowEditModal(false);
                    setEditingAssignment(null);
                  }}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={editAssignmentMutation.isPending}
                  className="px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 disabled:opacity-50"
                >
                  {editAssignmentMutation.isPending ? 'Updating...' : 'Update Assignment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && editingAssignment && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md mx-4">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-gray-900"><TranslatedText text="Unassign Product" /></h2>
              <button
                onClick={() => {
                  setShowDeleteModal(false);
                  setEditingAssignment(null);
                }}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="mb-6">
              <div className="flex items-center mb-4">
                <div className="flex-shrink-0">
                  <div className="w-10 h-10 bg-orange-100 rounded-full flex items-center justify-center">
                    <ArrowLeft className="h-5 w-5 text-orange-600" />
                  </div>
                </div>
                <div className="ml-3">
                  <h3 className="text-lg font-medium text-gray-900"><TranslatedText text="Unassign Product?" /></h3>
                  <p className="text-sm text-gray-500">This will return the quantity to Global Stock.</p>
                </div>
              </div>

              <div className="p-3 bg-orange-50 rounded-lg border border-orange-200">
                <h4 className="font-medium text-orange-900 mb-2">Assignment to Unassign</h4>
                <div className="text-sm text-orange-700">
                  <div><strong>Product:</strong> {editingAssignment.product_name}</div>
                  <div><strong>Location:</strong> {getLocationName(editingAssignment.location_id, editingAssignment.location_type)}</div>
                  <div><strong>Quantity:</strong> {editingAssignment.quantity} Unit</div>
                </div>
              </div>

              <div className="mt-4 p-3 bg-green-50 rounded-lg border border-green-200">
                <div className="flex items-center">
                  <RotateCcw className="h-4 w-4 text-green-600 mr-2" />
                  <div className="text-sm text-green-700">
                    <strong>Result:</strong> {editingAssignment.quantity} Unit will be returned to Global Stock
                  </div>
                </div>
              </div>
            </div>

            <div className="flex justify-end space-x-3">
              <button
                onClick={() => {
                  setShowDeleteModal(false);
                  setEditingAssignment(null);
                }}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteConfirm}
                disabled={deleteAssignmentMutation.isPending}
                className="px-4 py-2 text-sm font-medium text-white bg-orange-600 rounded-lg hover:bg-orange-700 disabled:opacity-50"
              >
                {deleteAssignmentMutation.isPending ? 'Unassigning...' : 'Unassign Product'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Replenish Modal */}
      {showReplenishModal && replenishingItem && replenishData && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-6 w-full max-w-lg mx-4">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center">
                <div className="p-2 bg-purple-100 rounded-lg mr-3">
                  <RefreshCw className="h-6 w-6 text-purple-600" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-gray-900"><TranslatedText text="Replenish from Sales" /></h2>
                  <p className="text-sm text-gray-600">Add stock based on sold quantity</p>
                </div>
              </div>
              <button
                onClick={() => setShowReplenishModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            <form onSubmit={handleReplenishSubmit} className="space-y-6">
              {/* Current Status */}
              <div className="bg-gray-50 p-4 rounded-lg space-y-2">
                <h4 className="font-medium text-gray-900 mb-3">Current Status</h4>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <p className="text-gray-600">Product:</p>
                    <p className="font-semibold text-gray-900">{replenishingItem.product_name}</p>
                  </div>
                  <div>
                    <p className="text-gray-600">Shop:</p>
                    <p className="font-semibold text-gray-900">{replenishingItem.location_name || getLocationName(replenishingItem.location_id, replenishingItem.location_type)}</p>
                  </div>
                  <div>
                    <p className="text-gray-600">Currently Assigned:</p>
                    <p className="font-semibold text-gray-900">{replenishData.shop_assigned} Unit</p>
                  </div>
                  <div>
                    <p className="text-gray-600">Sold:</p>
                    <p className="font-semibold text-purple-600">{replenishData.shop_sold} Unit</p>
                  </div>
                  <div>
                    <p className="text-gray-600">Remaining in Shop:</p>
                    <p className="font-semibold text-gray-900">{replenishData.shop_remaining} Unit</p>
                  </div>
                  <div>
                    <p className="text-gray-600">Available Globally:</p>
                    <p className="font-semibold text-green-600">{replenishData.available_quantity} Unit</p>
                  </div>
                </div>
              </div>

              {/* Replenish Quantity */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Quantity to Replenish *
                </label>
                <input
                  type="number"
                  value={replenishQuantity}
                  onChange={(e) => setReplenishQuantity(parseInt(e.target.value) || 0)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  min="1"
                  max={replenishingItem?.product_type === 'perfume' ? 1 : Math.min(replenishData.shop_sold, replenishData.available_quantity)}
                  required
                  disabled={replenishingItem?.product_type === 'perfume'}
                />
                <p className="text-xs text-gray-500 mt-1">
                  {replenishingItem?.product_type === 'perfume' ? (
                    <>1 Unit will be bottled from bulk perfume</>
                  ) : (
                    <>Maximum: {Math.min(replenishData.shop_sold, replenishData.available_quantity)} Unit (based on sold quantity and available stock)</>
                  )}
                </p>
              </div>

              {/* Info Box */}
              <div className="p-4 bg-purple-50 rounded-lg border border-purple-200">
                <div className="flex items-start">
                  <AlertTriangle className="h-5 w-5 text-purple-600 mr-2 mt-0.5" />
                  <div className="text-sm text-purple-700">
                    <strong>How it works:</strong> This will add {replenishQuantity} Unit to the shop's current stock
                    ({replenishData.shop_remaining} Unit), bringing the total to {replenishData.shop_remaining + replenishQuantity} Unit.
                    {replenishingItem?.product_type === 'perfume' ? (
                      <> The quantity will be bottled from available bulk perfume and deducted from bulk stock.</>
                    ) : (
                      <> The quantity will be deducted from available global stock.</>
                    )}
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setShowReplenishModal(false)}
                  className="px-6 py-3 text-gray-700 bg-gray-100 font-medium rounded-xl hover:bg-gray-200 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={
                    replenishMutation.isPending ||
                    replenishQuantity <= 0 ||
                    (replenishingItem?.product_type !== 'perfume' && replenishQuantity > replenishData.available_quantity)
                  }
                  className="px-6 py-3 bg-purple-600 text-white font-medium rounded-xl hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {replenishMutation.isPending ? (
                    <div className="flex items-center">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Replenishing...
                    </div>
                  ) : (
                    'Replenish Stock'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Bulk Assign Modal - Admin only */}
      {showBulkAssignModal && user?.role === 'admin' && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-6 w-full max-w-lg mx-4">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center">
                <div className="p-2 bg-green-100 rounded-lg mr-3">
                  <Package className="h-6 w-6 text-green-600" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-gray-900"><TranslatedText text="Assign All Products" /></h2>
                  <p className="text-sm text-gray-600">Assign all products with available stock to a location</p>
                </div>
              </div>
              <button
                onClick={() => setShowBulkAssignModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            <form onSubmit={handleBulkAssign} className="space-y-6">
              {/* Location Type */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Location Type
                </label>
                <div className="flex gap-4">
                  <label className="flex items-center">
                    <input
                      type="radio"
                      value="shop"
                      checked={bulkAssignFormData.location_type === 'shop'}
                      onChange={(e) => setBulkAssignFormData(prev => ({ ...prev, location_type: e.target.value, location_id: '' }))}
                      className="mr-2"
                    />
                    Shop
                  </label>
                  <label className="flex items-center">
                    <input
                      type="radio"
                      value="warehouse"
                      checked={bulkAssignFormData.location_type === 'warehouse'}
                      onChange={(e) => setBulkAssignFormData(prev => ({ ...prev, location_type: e.target.value, location_id: '' }))}
                      className="mr-2"
                    />
                    Warehouse
                  </label>
                </div>
              </div>

              {/* Location Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Location
                </label>
                <select
                  value={bulkAssignFormData.location_id}
                  onChange={(e) => setBulkAssignFormData(prev => ({ ...prev, location_id: e.target.value }))}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  required
                >
                  <option value="">Select Location</option>
                  {bulkAssignFormData.location_type === 'shop'
                    ? shops?.map(shop => (
                      <option key={shop.id} value={shop.id}>{shop.name}</option>
                    ))
                    : warehouses?.map(warehouse => (
                      <option key={warehouse.id} value={warehouse.id}>{warehouse.name}</option>
                    ))
                  }
                </select>
              </div>

              {/* Default Quantity */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Default Quantity per Product (ML)
                </label>
                <input
                  type="number"
                  value={bulkAssignFormData.default_quantity}
                  onChange={(e) => setBulkAssignFormData(prev => ({ ...prev, default_quantity: parseInt(e.target.value) || 0 }))}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  min="1"
                  required
                />
                <p className="text-xs text-gray-500 mt-1">
                  Each product will be assigned this quantity (or less if insufficient stock)
                </p>
              </div>

              {/* Min Stock Level */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Minimum Stock Level
                </label>
                <input
                  type="number"
                  value={bulkAssignFormData.min_stock_level}
                  onChange={(e) => setBulkAssignFormData(prev => ({ ...prev, min_stock_level: parseInt(e.target.value) || 0 }))}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  min="0"
                />
              </div>

              {/* Max Stock Level */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Maximum Stock Level
                </label>
                <input
                  type="number"
                  value={bulkAssignFormData.max_stock_level}
                  onChange={(e) => setBulkAssignFormData(prev => ({ ...prev, max_stock_level: parseInt(e.target.value) || 0 }))}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  min="0"
                />
              </div>

              {/* Info Box */}
              <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                <div className="flex items-start">
                  <AlertTriangle className="h-5 w-5 text-green-600 mr-2 mt-0.5" />
                  <div className="text-sm text-green-700">
                    <strong>Note:</strong> This will assign all products with available stock to the selected location.
                    Products already assigned or with zero stock will be skipped.
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setShowBulkAssignModal(false)}
                  className="px-6 py-3 text-gray-700 bg-gray-100 font-medium rounded-xl hover:bg-gray-200 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={bulkAssignMutation.isPending || !bulkAssignFormData.location_id}
                  className="px-6 py-3 bg-green-600 text-white font-medium rounded-xl hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {bulkAssignMutation.isPending ? (
                    <div className="flex items-center">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Assigning All Products...
                    </div>
                  ) : (
                    'Assign All Products'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}


      {/* Product Assignment Pagination */}
      {totalPages > 1 && (
        <div className="bg-white rounded-lg border border-gray-200 px-4 py-4 mt-6">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            {/* Left side - Items per page and info */}
            <div className="flex flex-col sm:flex-row items-center gap-3">
              <div className="flex items-center space-x-2">
                <span className="text-sm text-gray-700">Show</span>
                <select
                  value={itemsPerPage}
                  onChange={(e) => {
                    setItemsPerPage(parseInt(e.target.value));
                    setCurrentPage(1);
                  }}
                  className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                >
                  <option value={12}>12</option>
                  <option value={24}>24</option>
                  <option value={50}>50</option>
                  <option value={100}>100</option>
                </select>
                <span className="text-sm text-gray-700">per page</span>
              </div>
              <span className="text-sm text-gray-600">
                Showing <span className="font-semibold text-gray-900">{((currentPage - 1) * itemsPerPage) + 1}</span> to{' '}
                <span className="font-semibold text-gray-900">{Math.min(currentPage * itemsPerPage, totalProducts)}</span> of{' '}
                <span className="font-semibold text-gray-900">{totalProducts}</span> products
              </span>
            </div>

            {/* Right side - Page navigation */}
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                disabled={currentPage === 1}
                className="inline-flex items-center px-3 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <svg className="h-4 w-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                Previous
              </button>

              {/* Page numbers */}
              <div className="flex items-center space-x-1">
                {(() => {
                  const pages = [];
                  const maxVisiblePages = 7;
                  let startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2));
                  let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);

                  if (endPage - startPage + 1 < maxVisiblePages) {
                    startPage = Math.max(1, endPage - maxVisiblePages + 1);
                  }

                  // First page
                  if (startPage > 1) {
                    pages.push(
                      <button
                        key={1}
                        onClick={() => setCurrentPage(1)}
                        className="px-3 py-2 text-sm font-medium rounded-lg text-gray-700 hover:bg-gray-100 transition-colors"
                      >
                        1
                      </button>
                    );
                    if (startPage > 2) {
                      pages.push(
                        <span key="ellipsis1" className="px-2 text-gray-500">
                          ...
                        </span>
                      );
                    }
                  }

                  // Page numbers
                  for (let i = startPage; i <= endPage; i++) {
                    pages.push(
                      <button
                        key={i}
                        onClick={() => setCurrentPage(i)}
                        className={`px-3 py-2 text-sm font-medium rounded-lg transition-colors ${i === currentPage
                          ? 'bg-blue-600 text-white shadow-sm'
                          : 'text-gray-700 hover:bg-gray-100'
                          }`}
                      >
                        {i}
                      </button>
                    );
                  }

                  // Last page
                  if (endPage < totalPages) {
                    if (endPage < totalPages - 1) {
                      pages.push(
                        <span key="ellipsis2" className="px-2 text-gray-500">
                          ...
                        </span>
                      );
                    }
                    pages.push(
                      <button
                        key={totalPages}
                        onClick={() => setCurrentPage(totalPages)}
                        className="px-3 py-2 text-sm font-medium rounded-lg text-gray-700 hover:bg-gray-100 transition-colors"
                      >
                        {totalPages}
                      </button>
                    );
                  }

                  return pages;
                })()}
              </div>

              <button
                onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                disabled={currentPage === totalPages}
                className="inline-flex items-center px-3 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Next
                <svg className="h-4 w-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Stocks;
