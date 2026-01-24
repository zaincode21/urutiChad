import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';
import {
  FlaskConical, Package, Plus, Edit, Trash2, Search, Filter, Grid3X3, List,
  SortAsc, SortDesc, RefreshCw, AlertCircle, Eye, EyeOff, Archive, CheckCircle,
  X, Save, Copy, Calculator, TrendingUp, AlertTriangle, Box, Cog, History,
  DollarSign, BarChart3, Settings, FileText, Calendar, Users, Zap, Barcode
} from 'lucide-react';
import toast from 'react-hot-toast';
import ShortBarcodeGenerator from '../components/ShortBarcodeGenerator';
import CurrencyInput from '../components/CurrencyInput';
import { smartBottlingAPI, procurementAPI, perfumeAPI } from '../lib/api';
import TranslatedText from '../components/TranslatedText';

const SmartBottling = () => {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [showRawMaterialModal, setShowRawMaterialModal] = useState(false);
  const [showRecipeModal, setShowRecipeModal] = useState(false);
  const [showBatchModal, setShowBatchModal] = useState(false);
  const [showBottleSizeModal, setShowBottleSizeModal] = useState(false);
  const [selectedBatch, setSelectedBatch] = useState(null);
  const [selectedRecipe, setSelectedRecipe] = useState(null);
  const [selectedRawMaterial, setSelectedRawMaterial] = useState(null);
  const [selectedBottleSize, setSelectedBottleSize] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState('grid');
  const [sortBy, setSortBy] = useState('name');
  const [sortOrder, setSortOrder] = useState('asc');
  const [showFilters, setShowFilters] = useState(false);
  const [selectedItems, setSelectedItems] = useState(new Set());
  const [showBulkActions, setShowBulkActions] = useState(false);

  const queryClient = useQueryClient();

  // Queries with error handling and loading states
  const { data: statsData, isLoading: statsLoading, error: statsError } = useQuery({
    queryKey: ['bottling-stats'],
    queryFn: () => smartBottlingAPI.getStats().then(res => res.data),
    retry: 3,
    retryDelay: 1000,
    staleTime: 30000,
  });

  const { data: rawMaterialsData, isLoading: materialsLoading, error: materialsError } = useQuery({
    queryKey: ['raw-materials'],
    queryFn: () => smartBottlingAPI.getRawMaterials().then(res => res.data),
    retry: 3,
    retryDelay: 1000,
    staleTime: 30000,
  });

  const { data: recipesData, isLoading: recipesLoading, error: recipesError } = useQuery({
    queryKey: ['bottling-recipes'],
    queryFn: () => smartBottlingAPI.getRecipes().then(res => res.data),
    retry: 3,
    retryDelay: 1000,
    staleTime: 30000,
  });

  const { data: batchesData, isLoading: batchesLoading, error: batchesError } = useQuery({
    queryKey: ['bottling-batches'],
    queryFn: () => smartBottlingAPI.getBatches().then(res => res.data),
    retry: 3,
    retryDelay: 1000,
    staleTime: 30000,
  });

  const { data: forecastData, isLoading: forecastLoading, error: forecastError } = useQuery({
    queryKey: ['material-forecast'],
    queryFn: () => smartBottlingAPI.getForecast().then(res => res.data),
    retry: 3,
    retryDelay: 1000,
    staleTime: 60000,
  });

  const { data: lowStockAlerts, isLoading: alertsLoading, error: alertsError } = useQuery({
    queryKey: ['low-stock-alerts'],
    queryFn: () => smartBottlingAPI.getLowStockAlerts().then(res => res.data),
    retry: 3,
    retryDelay: 1000,
    staleTime: 30000,
  });

  const { data: popularSizesData, isLoading: sizesLoading, error: sizesError } = useQuery({
    queryKey: ['popular-sizes'],
    queryFn: () => smartBottlingAPI.getPopularSizes().then(res => res.data),
    retry: 3,
    retryDelay: 1000,
    staleTime: 60000,
  });

  // New queries for enhanced raw material form
  const { data: suppliersData, isLoading: suppliersLoading, error: suppliersError } = useQuery({
    queryKey: ['suppliers'],
    queryFn: () => procurementAPI.getSuppliers().then(res => res.data),
    retry: 3,
    retryDelay: 1000,
    staleTime: 300000, // 5 minutes
  });

  const { data: supplierMaterialsData, isLoading: supplierMaterialsLoading, error: supplierMaterialsError } = useQuery({
    queryKey: ['supplier-materials'],
    queryFn: () => procurementAPI.getSupplierMaterials().then(res => res.data),
    retry: 3,
    retryDelay: 1000,
    staleTime: 300000, // 5 minutes
  });

  const { data: purchaseOrdersData, isLoading: purchaseOrdersLoading, error: purchaseOrdersError } = useQuery({
    queryKey: ['purchase-orders'],
    queryFn: () => procurementAPI.getPurchaseOrders().then(res => res.data),
    retry: 3,
    retryDelay: 1000,
    staleTime: 300000, // 5 minutes
  });

  // Bottle sizes query for recipe form
  const { data: bottleSizesData, isLoading: bottleSizesLoading, error: bottleSizesError } = useQuery({
    queryKey: ['bottle-sizes'],
    queryFn: () => perfumeAPI.getBottleSizes().then(res => res.data),
    retry: 3,
    retryDelay: 1000,
    staleTime: 300000, // 5 minutes
  });

  // Bulk perfumes query for batch modal
  const { data: bulkPerfumesData, error: bulkPerfumesError, isLoading: bulkPerfumesLoading } = useQuery({
    queryKey: ['bulk-perfumes'],
    queryFn: async () => {
      try {
        const response = await perfumeAPI.getBulk();
        return response.data;
      } catch (error) {
        throw error;
      }
    },
    retry: 3,
    retryDelay: 1000,
    staleTime: 300000, // 5 minutes
  });

  // Users query for batch modal
  const { data: usersData, error: usersError, isLoading: usersLoading } = useQuery({
    queryKey: ['users'],
    queryFn: async () => {
      try {
        const response = await api.get('/auth/users');
        return response.data;
      } catch (error) {
        throw error;
      }
    },
    retry: 3,
    retryDelay: 1000,
    staleTime: 300000, // 5 minutes
  });

  // Mutations with enhanced error handling
  const createRawMaterialMutation = useMutation({
    mutationFn: (data) => {
      return smartBottlingAPI.createRawMaterial(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['raw-materials']);
      setShowRawMaterialModal(false);
      toast.success('Raw material created successfully!');
    },
    onError: (error) => {
      const errorMessage = error.response?.data?.error ||
        error.response?.data?.message ||
        error.message ||
        'Failed to create raw material';
      toast.error(errorMessage);
    }
  });

  const createRecipeMutation = useMutation({
    mutationFn: (data) => smartBottlingAPI.createRecipe(data),
    onSuccess: () => {
      queryClient.invalidateQueries(['bottling-recipes']);
      setShowRecipeModal(false);
      toast.success('Recipe created successfully!');
    },
    onError: (error) => {
      const errorMessage = error.response?.data?.error ||
        error.response?.data?.message ||
        error.message ||
        'Failed to create recipe';
      toast.error(errorMessage);
    }
  });

  const createBatchMutation = useMutation({
    mutationFn: (data) => smartBottlingAPI.createBatch(data),
    onSuccess: () => {
      queryClient.invalidateQueries(['bottling-batches', 'bottling-stats']);
      setShowBatchModal(false);
      toast.success('Bottling batch created successfully!');
    },
    onError: (error) => {
      const errorMessage = error.response?.data?.error ||
        error.response?.data?.message ||
        error.message ||
        'Failed to create batch';
      toast.error(errorMessage);
    }
  });

  const deleteBatchMutation = useMutation({
    mutationFn: (id) => api.delete(`/smart-bottling/batches/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries(['bottling-batches']);
      queryClient.invalidateQueries(['bottling-stats']);
      toast.success('Batch deleted successfully!');
    },
    onError: (error) => {
      const errorMessage = error.response?.data?.error ||
        error.response?.data?.message ||
        error.message ||
        'Failed to delete batch';
      toast.error(errorMessage);
    }
  });

  const deleteRawMaterialMutation = useMutation({
    mutationFn: (id) => api.delete(`/smart-bottling/raw-materials/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries(['raw-materials']);
      toast.success('Raw material deleted successfully!');
    },
    onError: (error) => {
      console.error('Delete raw material error:', error);
      const errorMessage = error.response?.data?.message ||
        error.response?.data?.error ||
        error.message ||
        'Failed to delete raw material';
      toast.error(errorMessage);
    }
  });

  const deleteRecipeMutation = useMutation({
    mutationFn: (id) => api.delete(`/smart-bottling/recipes/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries(['bottling-recipes']);
      toast.success('Recipe deleted successfully!');
    },
    onError: (error) => {
      console.error('Delete recipe error:', error);
      const errorMessage = error.response?.data?.message ||
        error.response?.data?.error ||
        error.message ||
        'Failed to delete recipe';
      toast.error(errorMessage);
    }
  });

  // Bottle size mutations
  const createBottleSizeMutation = useMutation({
    mutationFn: (data) => perfumeAPI.createBottleSize(data),
    onSuccess: () => {
      queryClient.invalidateQueries(['bottle-sizes']);
      queryClient.invalidateQueries(['bottling-stats']);
      setShowBottleSizeModal(false);
      setSelectedBottleSize(null);
      toast.success('Bottle size created successfully!');
    },
    onError: (error) => {
      toast.error(error.response?.data?.error || 'Failed to create bottle size');
    }
  });

  const updateRawMaterialMutation = useMutation({
    mutationFn: ({ id, data }) => smartBottlingAPI.updateRawMaterial(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['raw-materials']);
      queryClient.invalidateQueries(['bottling-stats']);
      setShowRawMaterialModal(false);
      setSelectedRawMaterial(null);
      toast.success('Raw material updated successfully!');
    },
    onError: (error) => {
      toast.error(error.response?.data?.error || 'Failed to update raw material');
    }
  });

  const updateRecipeMutation = useMutation({
    mutationFn: ({ id, data }) => smartBottlingAPI.updateRecipe(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['bottling-recipes']);
      queryClient.invalidateQueries(['bottling-stats']);
      setShowRecipeModal(false);
      setSelectedRecipe(null);
      toast.success('Recipe updated successfully!');
    },
    onError: (error) => {
      toast.error(error.response?.data?.error || 'Failed to update recipe');
    }
  });

  const updateBottleSizeMutation = useMutation({
    mutationFn: ({ id, data }) => perfumeAPI.updateBottleSize(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['bottle-sizes']);
      queryClient.invalidateQueries(['bottling-stats']);
      setShowBottleSizeModal(false);
      setSelectedBottleSize(null);
      toast.success('Bottle size updated successfully!');
    },
    onError: (error) => {
      toast.error(error.response?.data?.error || 'Failed to update bottle size');
    }
  });

  const deleteBottleSizeMutation = useMutation({
    mutationFn: (id) => perfumeAPI.deleteBottleSize(id),
    onSuccess: () => {
      queryClient.invalidateQueries(['bottle-sizes']);
      queryClient.invalidateQueries(['bottling-stats']);
      toast.success('Bottle size deleted successfully!');
    },
    onError: (error) => {
      toast.error(error.response?.data?.error || 'Failed to delete bottle size');
    }
  });

  // Safe data extraction with fallbacks - memoized for performance
  const stats = useMemo(() => statsData?.overall_stats || {}, [statsData]);
  const rawMaterials = useMemo(() => rawMaterialsData?.materials || [], [rawMaterialsData]);
  const recipes = useMemo(() => recipesData?.recipes || [], [recipesData]);
  const batches = useMemo(() => batchesData?.batches || [], [batchesData]);
  const forecast = useMemo(() => forecastData?.forecast || [], [forecastData]);
  const alerts = useMemo(() => lowStockAlerts?.alerts || [], [lowStockAlerts]);
  const popularSizes = useMemo(() => popularSizesData?.popular_sizes || [], [popularSizesData]);
  const bottleSizes = useMemo(() => bottleSizesData?.sizes || [], [bottleSizesData]);

  const tabs = useMemo(() => [
    { id: 'dashboard', name: 'Dashboard', icon: BarChart3 },
    { id: 'raw-materials', name: 'Raw Materials', icon: Package },
    { id: 'bottle-sizes', name: 'Bottle Sizes', icon: Box },
    { id: 'recipes', name: 'Recipes (BOM)', icon: Cog },
    { id: 'batches', name: 'Bottling Batches', icon: FlaskConical },
    { id: 'forecast', name: 'Forecasting', icon: TrendingUp },
    { id: 'alerts', name: 'Alerts', icon: AlertTriangle }
  ], []);

  // Utility functions
  const formatCurrency = (amount) => {
    if (amount === null || amount === undefined || isNaN(amount)) return 'FRw 0.00';
    return new Intl.NumberFormat('en-RW', {
      style: 'currency',
      currency: 'RWF'
    }).format(amount);
  };

  const getStockStatus = (current, min) => {
    if (current === null || current === undefined || isNaN(current)) {
      return { text: 'Unknown', bgColor: 'bg-gray-100', textColor: 'text-gray-800' };
    }
    if (min === null || min === undefined || isNaN(min)) {
      return { text: 'Unknown', bgColor: 'bg-gray-100', textColor: 'text-gray-800' };
    }

    if (current === 0) return { text: 'Out of Stock', bgColor: 'bg-red-100', textColor: 'text-red-800' };
    if (current <= min) return { text: 'Low Stock', bgColor: 'bg-yellow-100', textColor: 'text-yellow-800' };
    return { text: 'In Stock', bgColor: 'bg-green-100', textColor: 'text-green-800' };
  };

  // Event handlers - useCallback hooks
  const toggleSelection = useCallback((id) => {
    if (!id) return;
    const newSelected = new Set(selectedItems);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedItems(newSelected);
    setShowBulkActions(newSelected.size > 0);
  }, [selectedItems]);

  const selectAll = useCallback(() => {
    const currentItems = activeTab === 'raw-materials' ? rawMaterials :
      activeTab === 'recipes' ? recipes :
        activeTab === 'batches' ? batches :
          activeTab === 'bottle-sizes' ? bottleSizes : [];

    if (!Array.isArray(currentItems)) return;

    const validIds = currentItems.filter(item => item && item.id).map(item => item.id);
    setSelectedItems(new Set(validIds));
    setShowBulkActions(validIds.length > 0);
  }, [activeTab, rawMaterials, recipes, batches, bottleSizes]);

  const clearSelection = useCallback(() => {
    setSelectedItems(new Set());
    setShowBulkActions(false);
  }, []);

  const handleBulkDelete = () => {
    if (selectedItems.size === 0) return;

    const confirmed = window.confirm(`Are you sure you want to delete ${selectedItems.size} selected item(s)?`);
    if (!confirmed) return;

    if (activeTab === 'raw-materials') {
      selectedItems.forEach(id => deleteRawMaterialMutation.mutate(id));
    } else if (activeTab === 'recipes') {
      selectedItems.forEach(id => deleteRecipeMutation.mutate(id));
    } else if (activeTab === 'batches') {
      selectedItems.forEach(id => deleteBatchMutation.mutate(id));
    } else if (activeTab === 'bottle-sizes') {
      selectedItems.forEach(id => deleteBottleSizeMutation.mutate(id));
    }

    clearSelection();
  };

  // Check for critical errors - moved after all hooks
  const hasCriticalError = statsError || materialsError || recipesError || batchesError;
  const isLoading = statsLoading || materialsLoading || recipesLoading || batchesLoading;

  // Error boundary component
  if (hasCriticalError) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="max-w-md mx-auto text-center">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2"><TranslatedText text="Error Loading Data" /></h3>
          <p className="text-gray-600 mb-4">
            {statsError?.message || materialsError?.message || recipesError?.message || batchesError?.message || 'An error occurred while loading data'}
          </p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading Smart Bottling System...</p>
        </div>
      </div>
    );
  }





  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900"><TranslatedText text="Smart Bottling & Cost Tracking" /></h1>
              <p className="mt-2 text-gray-600">Manage bulk perfume transformation and cost tracking</p>
            </div>
            <div className="flex items-center space-x-3">
              <button
                onClick={() => {
                  queryClient.invalidateQueries();
                  toast.success('Data refreshed successfully!');
                }}
                className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh
              </button>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="mb-6">
          <nav className="flex space-x-8">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => {
                    try {
                      setActiveTab(tab.id);
                    } catch (error) {
                      toast.error('Failed to switch tab');
                    }
                  }}
                  className={`flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-colors ${activeTab === tab.id
                      ? 'bg-blue-100 text-blue-700'
                      : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
                    }`}
                  aria-label={`Switch to ${tab.name} tab`}
                  aria-selected={activeTab === tab.id}
                  role="tab"
                >
                  <Icon className="h-4 w-4 mr-2" />
                  {tab.name}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Search and Filters Bar */}
        {(activeTab === 'raw-materials' || activeTab === 'recipes' || activeTab === 'batches' || activeTab === 'bottle-sizes') && (
          <div className="mb-6 bg-white rounded-lg border border-gray-200 p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4 flex-1">
                <div className="relative flex-1 max-w-md">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder={`Search ${activeTab.replace('-', ' ')}...`}
                    value={searchTerm}
                    onChange={(e) => {
                      try {
                        const value = e.target.value || '';
                        setSearchTerm(value);
                      } catch (error) {
                        setSearchTerm('');
                      }
                    }}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    aria-label={`Search ${activeTab.replace('-', ' ')}`}
                    role="searchbox"
                  />
                </div>
                <button
                  onClick={() => {
                    try {
                      setShowFilters(!showFilters);
                    } catch (error) {
                      toast.error('Failed to toggle filters');
                    }
                  }}
                  className="inline-flex items-center px-3 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                  aria-label="Toggle filters"
                  aria-expanded={showFilters}
                >
                  <Filter className="h-4 w-4 mr-2" />
                  Filters
                </button>
              </div>

              <div className="flex items-center space-x-3">
                {/* View Mode Toggle */}
                <div className="flex items-center bg-gray-100 rounded-lg p-1">
                  <button
                    onClick={() => {
                      try {
                        setViewMode('grid');
                      } catch (error) {
                        toast.error('Failed to change view mode');
                      }
                    }}
                    className={`p-2 rounded-md transition-colors ${viewMode === 'grid' ? 'bg-white shadow-sm' : 'text-gray-500 hover:text-gray-700'
                      }`}
                    aria-label="Switch to grid view"
                    aria-pressed={viewMode === 'grid'}
                  >
                    <Grid3X3 className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => {
                      try {
                        setViewMode('list');
                      } catch (error) {
                        toast.error('Failed to change view mode');
                      }
                    }}
                    className={`p-2 rounded-md transition-colors ${viewMode === 'list' ? 'bg-white shadow-sm' : 'text-gray-500 hover:text-gray-700'
                      }`}
                    aria-label="Switch to list view"
                    aria-pressed={viewMode === 'list'}
                  >
                    <List className="h-4 w-4" />
                  </button>
                </div>

                {/* Sort Dropdown */}
                <select
                  value={`${sortBy}-${sortOrder}`}
                  onChange={(e) => {
                    try {
                      const [field, order] = e.target.value.split('-');
                      if (field && order) {
                        setSortBy(field);
                        setSortOrder(order);
                      }
                    } catch (error) {
                      toast.error('Failed to change sort order');
                    }
                  }}
                  className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  aria-label="Sort items"
                >
                  <option value="name-asc">Name A-Z</option>
                  <option value="name-desc">Name Z-A</option>
                  <option value="created_at-desc">Newest First</option>
                  <option value="created_at-asc">Oldest First</option>
                </select>

                {/* Add Button */}
                {activeTab === 'raw-materials' && (
                  <button
                    onClick={() => setShowRawMaterialModal(true)}
                    className="inline-flex items-center px-4 py-2 border border-transparent rounded-lg text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add Material
                  </button>
                )}
                {activeTab === 'bottle-sizes' && (
                  <button
                    onClick={() => {
                      setSelectedBottleSize(null);
                      setShowBottleSizeModal(true);
                    }}
                    className="inline-flex items-center px-4 py-2 border border-transparent rounded-lg text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add Bottle Size
                  </button>
                )}
                {activeTab === 'recipes' && (
                  <button
                    onClick={() => setShowRecipeModal(true)}
                    className="inline-flex items-center px-4 py-2 border border-transparent rounded-lg text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add Recipe
                  </button>
                )}
                {activeTab === 'batches' && (
                  <button
                    onClick={() => setShowBatchModal(true)}
                    className="inline-flex items-center px-4 py-2 border border-transparent rounded-lg text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Create Batch
                  </button>
                )}
              </div>
            </div>

            {/* Bulk Actions */}
            {showBulkActions && (
              <div className="mt-4 pt-4 border-t border-gray-200">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <span className="text-sm text-gray-600">
                      {selectedItems.size} item{selectedItems.size !== 1 ? 's' : ''} selected
                    </span>
                    <button
                      onClick={clearSelection}
                      className="text-sm text-gray-500 hover:text-gray-700"
                    >
                      Clear selection
                    </button>
                  </div>
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={handleBulkDelete}
                      className="inline-flex items-center px-3 py-2 border border-red-300 rounded-lg text-sm font-medium text-red-700 bg-red-50 hover:bg-red-100"
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Delete Selected
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Tab Content */}
        <div className="bg-white rounded-lg border border-gray-200">
          {activeTab === 'dashboard' && (
            <DashboardTab
              stats={stats}
              alerts={alerts}
              popularSizes={popularSizes}
              onCreateBatch={() => setShowBatchModal(true)}
              formatCurrency={formatCurrency}
            />
          )}
          {activeTab === 'raw-materials' && (
            <RawMaterialsTab
              materials={rawMaterials}
              searchTerm={searchTerm}
              viewMode={viewMode}
              selectedItems={selectedItems}
              sortBy={sortBy}
              sortOrder={sortOrder}
              onToggleSelection={toggleSelection}
              onCreateMaterial={() => setShowRawMaterialModal(true)}
              onEdit={(material) => {
                setSelectedRawMaterial(material);
                setShowRawMaterialModal(true);
              }}
              onDelete={(id) => {
                if (id && window.confirm('Are you sure you want to delete this material?')) {
                  deleteRawMaterialMutation.mutate(id);
                }
              }}
              formatCurrency={formatCurrency}
              getStockStatus={getStockStatus}
            />
          )}
          {activeTab === 'bottle-sizes' && (
            <BottleSizesTab
              bottleSizes={bottleSizes}
              searchTerm={searchTerm}
              viewMode={viewMode}
              sortBy={sortBy}
              sortOrder={sortOrder}
              selectedItems={selectedItems}
              setSelectedItems={setSelectedItems}
              onEdit={(bottleSize) => {
                setSelectedBottleSize(bottleSize);
                setShowBottleSizeModal(true);
              }}
              onDelete={(bottleSize) => {
                if (!bottleSize?.id) return;
                const confirmed = window.confirm(`Delete bottle size ${bottleSize.size_ml}ml?`);
                if (confirmed) deleteBottleSizeMutation.mutate(bottleSize.id);
              }}
              formatCurrency={formatCurrency}
              isLoading={bottleSizesLoading}
            />
          )}
          {activeTab === 'recipes' && (
            <RecipesTab
              recipes={recipes}
              rawMaterials={rawMaterials}
              searchTerm={searchTerm}
              viewMode={viewMode}
              selectedItems={selectedItems}
              sortBy={sortBy}
              sortOrder={sortOrder}
              onToggleSelection={toggleSelection}
              onCreateRecipe={() => setShowRecipeModal(true)}
              onEdit={(recipe) => {
                setSelectedRecipe(recipe);
                setShowRecipeModal(true);
              }}
              onDelete={(id) => {
                if (id && window.confirm('Are you sure you want to delete this recipe?')) {
                  deleteRecipeMutation.mutate(id);
                }
              }}
              onViewDetails={(recipe) => setSelectedRecipe(recipe)}
            />
          )}
          {activeTab === 'batches' && (
            <BatchesTab
              batches={batches}
              recipes={recipes}
              searchTerm={searchTerm}
              viewMode={viewMode}
              sortBy={sortBy}
              sortOrder={sortOrder}
              onViewBatch={(batch) => setSelectedBatch(batch)}
              onCreateBatch={() => setShowBatchModal(true)}
              onDeleteBatch={(batch) => {
                if (!batch?.id) return;
                const confirmed = window.confirm(`Delete batch ${batch.batch_number}? This will reverse stock movements.`);
                if (confirmed) deleteBatchMutation.mutate(batch.id);
              }}
              formatCurrency={formatCurrency}
            />
          )}
          {activeTab === 'forecast' && (
            <ForecastTab forecast={forecast} />
          )}
          {activeTab === 'alerts' && (
            <AlertsTab alerts={alerts} />
          )}
        </div>
      </div>

      {/* Modals */}
      {showRawMaterialModal && (
        <RawMaterialModal
          onClose={() => {
            setShowRawMaterialModal(false);
            setSelectedRawMaterial(null);
          }}
          onSubmit={(data) => {
            if (selectedRawMaterial) {
              updateRawMaterialMutation.mutate({ id: selectedRawMaterial.id, data });
            } else {
              createRawMaterialMutation.mutate(data);
            }
          }}
          isLoading={createRawMaterialMutation.isLoading || updateRawMaterialMutation.isLoading}
          suppliers={suppliersData?.suppliers || []}
          supplierMaterials={supplierMaterialsData?.supplier_materials || []}
          purchaseOrders={purchaseOrdersData?.purchase_orders || []}
          suppliersLoading={suppliersLoading}
          supplierMaterialsLoading={supplierMaterialsLoading}
          purchaseOrdersLoading={purchaseOrdersLoading}
          rawMaterial={selectedRawMaterial}
        />
      )}

      {showRecipeModal && (
        <RecipeModal
          onClose={() => {
            setShowRecipeModal(false);
            setSelectedRecipe(null);
          }}
          onSubmit={(data) => {
            if (selectedRecipe) {
              updateRecipeMutation.mutate({ id: selectedRecipe.id, data });
            } else {
              createRecipeMutation.mutate(data);
            }
          }}
          rawMaterials={rawMaterialsData?.materials || []}
          isLoading={createRecipeMutation.isLoading || updateRecipeMutation.isLoading}
          bottleSizes={bottleSizesData?.sizes || []}
          bottleSizesLoading={bottleSizesLoading}
          formatCurrency={formatCurrency}
          recipe={selectedRecipe}
        />
      )}

      {showBatchModal && (
        <BatchModal
          onClose={() => setShowBatchModal(false)}
          onSubmit={createBatchMutation.mutate}
          recipes={recipes}
          isLoading={createBatchMutation.isLoading}
          bulkPerfumesData={bulkPerfumesData}
          usersData={usersData}
          bulkPerfumesLoading={bulkPerfumesLoading}
          usersLoading={usersLoading}
          bulkPerfumesError={bulkPerfumesError}
          usersError={usersError}
        />
      )}

      {selectedBatch && (
        <BatchDetailsModal
          batch={selectedBatch}
          onClose={() => setSelectedBatch(null)}
          formatCurrency={formatCurrency}
        />
      )}

      {selectedRecipe && (
        <RecipeDetailsModal
          recipe={selectedRecipe}
          onClose={() => setSelectedRecipe(null)}
        />
      )}

      {showBottleSizeModal && (
        <BottleSizeModal
          onClose={() => {
            setShowBottleSizeModal(false);
            setSelectedBottleSize(null);
          }}
          onSubmit={(data) => {
            if (selectedBottleSize) {
              updateBottleSizeMutation.mutate({ id: selectedBottleSize.id, data });
            } else {
              createBottleSizeMutation.mutate(data);
            }
          }}
          bottleSize={selectedBottleSize}
          isLoading={createBottleSizeMutation.isLoading || updateBottleSizeMutation.isLoading}
          formatCurrency={formatCurrency}
        />
      )}
    </div>
  );
};

// Dashboard Tab Component
const DashboardTab = ({ stats, alerts, popularSizes, onCreateBatch, formatCurrency }) => {
  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="p-2 bg-primary-100 rounded-lg">
              <FlaskConical className="w-6 h-6 text-primary-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Batches</p>
              <p className="text-2xl font-bold text-gray-900">{stats.total_batches || 0}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="p-2 bg-green-100 rounded-lg">
              <Package className="w-6 h-6 text-green-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Bottles</p>
              <p className="text-2xl font-bold text-gray-900">{stats.total_bottles || 0}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Calculator className="w-6 h-6 text-blue-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Cost</p>
              <p className="text-2xl font-bold text-gray-900">
                {formatCurrency(stats.total_cost || 0)}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="p-2 bg-yellow-100 rounded-lg">
              <AlertCircle className="w-6 h-6 text-yellow-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Low Stock Alerts</p>
              <p className="text-2xl font-bold text-gray-900">{alerts.length}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4"><TranslatedText text="Quick Actions" /></h3>
        <div className="flex space-x-4">
          <button
            onClick={onCreateBatch}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-primary-600 hover:bg-primary-700"
          >
            <Plus className="w-4 h-4 mr-2" />
            Create New Batch
          </button>
        </div>
      </div>

      {/* Popular Sizes */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4"><TranslatedText text="Popular Bottle Sizes" /></h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {popularSizes.map((size) => (
            <div key={size.size_ml} className="border rounded-lg p-4">
              <div className="flex justify-between items-center">
                <span className="text-lg font-medium">{size.size_ml}ml</span>
                <span className="text-sm text-gray-500">{size.total_bottles} bottles</span>
              </div>
              <div className="mt-2 text-sm text-gray-600">
                Avg Cost: {formatCurrency(size.avg_unit_cost || 0)}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

// Raw Materials Tab Component
const RawMaterialsTab = ({ materials, searchTerm, viewMode, selectedItems, sortBy, sortOrder, onToggleSelection, onCreateMaterial, onEdit, onDelete, formatCurrency, getStockStatus }) => {
  const filteredMaterials = materials.filter(material =>
    material?.name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const sortedMaterials = [...filteredMaterials].sort((a, b) => {
    if (sortBy === 'name') {
      if (sortOrder === 'asc') {
        return (a?.name || '').localeCompare(b?.name || '');
      } else {
        return (b?.name || '').localeCompare(a?.name || '');
      }
    } else if (sortBy === 'created_at') {
      if (sortOrder === 'asc') {
        return new Date(a.created_at || 0).getTime() - new Date(b.created_at || 0).getTime();
      } else {
        return new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime();
      }
    }
    return 0;
  });

  const MaterialCard = ({ material, isSelected, onToggleSelection, onEdit, onDelete, formatCurrency, getStockStatus }) => {
    const stockStatus = getStockStatus(material.current_stock, material.min_stock_level);

    // Check if this is the new German perfume
    const isNewGermanPerfume = material.name.toLowerCase().includes('citrus burst energy cologne');
    const isGermanSupplier = material.supplier?.toLowerCase().includes('german');

    return (
      <div className={`bg-white rounded-lg border-2 transition-all duration-200 ${isSelected
          ? 'border-blue-500 shadow-lg'
          : isNewGermanPerfume
            ? 'border-green-500 shadow-lg bg-green-50'
            : 'border-gray-200 hover:border-gray-300 hover:shadow-md'
        }`}>
        <div className="relative group">
          {/* Material Icon */}
          <div className={`w-full h-48 rounded-t-lg flex items-center justify-center ${isNewGermanPerfume
              ? 'bg-gradient-to-br from-green-100 to-green-200'
              : 'bg-gradient-to-br from-gray-100 to-gray-200'
            }`}>
            <Package className={`h-12 w-12 ${isNewGermanPerfume ? 'text-green-600' : 'text-gray-400'}`} />
          </div>

          {/* New Material Badge */}
          {isNewGermanPerfume && (
            <div className="absolute top-2 right-2">
              <span className="inline-flex items-center px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">
                🇩🇪 New German Import
              </span>
            </div>
          )}

          {/* Selection Checkbox */}
          <div className="absolute top-2 left-2">
            <input
              type="checkbox"
              checked={isSelected}
              onChange={onToggleSelection}
              className="rounded border-gray-300 bg-white shadow-sm"
            />
          </div>

          {/* Stock Status Badge */}
          <div className="absolute bottom-2 left-2">
            <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${stockStatus.bgColor} ${stockStatus.textColor}`}>
              {stockStatus.text}
            </span>
          </div>
        </div>

        <div className="p-4">
          <div className="flex items-start justify-between mb-2">
            <h3 className={`text-lg font-semibold truncate flex-1 ${isNewGermanPerfume ? 'text-green-800' : 'text-gray-900'
              }`}>
              {material.name}
              {isNewGermanPerfume && (
                <span className="ml-2 text-xs text-green-600">✨ Premium</span>
              )}
            </h3>
          </div>

          <div className="space-y-2 mb-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-500">Type:</span>
              <span className="text-sm text-gray-900 font-medium capitalize">{material.type}</span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-500">Total Stock:</span>
              <span className="text-sm text-gray-900 font-medium">{material.current_stock} {material.unit}</span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-500">Remaining:</span>
              <span className={`text-sm font-medium ${material.remaining_stock > 0 ? 'text-green-600' : 'text-red-600'}`}>
                {material.remaining_stock || 0} {material.unit}
              </span>
            </div>

            {material.used_in_batches > 0 && (
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-500">Used:</span>
                <span className="text-sm text-orange-600 font-medium">{material.used_in_batches} {material.unit}</span>
              </div>
            )}

            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-500">Cost/Unit:</span>
              <span className="text-sm text-gray-900 font-medium">{formatCurrency(material.cost_per_unit)}</span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-500">Supplier:</span>
              <span className={`text-sm truncate ${isGermanSupplier ? 'text-green-700 font-medium' : 'text-gray-900'}`}>
                {material.supplier}
                {isGermanSupplier && <span className="ml-1">🇩🇪</span>}
              </span>
            </div>
          </div>

          <p className="text-sm text-gray-600 mb-3 line-clamp-2">{material.description}</p>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-500">Total Value:</span>
              <span className="text-lg font-bold text-gray-900">{formatCurrency(material.current_stock * material.cost_per_unit)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-500">Min Stock:</span>
              <span className="text-sm font-medium text-gray-900">{material.min_stock_level} {material.unit}</span>
            </div>
          </div>

          {/* Batch Number for German Perfume */}
          {isNewGermanPerfume && material.batch_number && (
            <div className="mt-2 pt-2 border-t border-green-100">
              <div className="flex items-center justify-between">
                <span className="text-xs text-green-600 font-medium">Batch:</span>
                <span className="text-xs text-green-700 font-mono">{material.batch_number}</span>
              </div>
            </div>
          )}

          {/* Status Indicator */}
          <div className="mt-3 pt-3 border-t border-gray-100">
            <div className="flex items-center justify-between">
              <span className={`inline-flex items-center px-2 py-1 text-xs font-medium rounded-full ${material.is_active
                  ? 'bg-green-100 text-green-800'
                  : 'bg-gray-100 text-gray-800'
                }`}>
                {material.is_active ? 'Active' : 'Inactive'}
              </span>
              <span className="text-xs text-gray-500">
                ID: {material.id.slice(0, 8)}...
              </span>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="mt-3 pt-3 border-t border-gray-100">
            <div className="flex items-center justify-center space-x-2">
              <button
                onClick={() => onEdit(material)}
                className="p-2 bg-indigo-50 text-indigo-600 hover:bg-indigo-100 rounded-lg transition-all duration-200 shadow-sm"
                title="Edit"
              >
                <Edit className="h-4 w-4" />
              </button>
              <button
                onClick={() => onDelete(material.id)}
                className="p-2 bg-red-50 text-red-600 hover:bg-red-100 rounded-lg transition-all duration-200 shadow-sm"
                title="Delete"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="p-6">
      {/* Header with New Material Highlight */}
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-gray-900"><TranslatedText text="Raw Materials" /></h2>
            <p className="text-sm text-gray-500">
              Manage raw materials for bottling production
              {filteredMaterials.some(m => m.name.toLowerCase().includes('citrus burst energy cologne')) && (
                <span className="ml-2 inline-flex items-center px-2 py-1 text-xs font-medium rounded-full bg-green-100 text-green-800">
                  🇩🇪 New German Perfume Available
                </span>
              )}
            </p>
          </div>
          <button
            onClick={onCreateMaterial}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Material
          </button>
        </div>
      </div>

      {viewMode === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {sortedMaterials.map((material) => (
            <MaterialCard
              key={material.id}
              material={material}
              isSelected={selectedItems.has(material.id)}
              onToggleSelection={() => onToggleSelection(material.id)}
              onEdit={onEdit}
              onDelete={onDelete}
              formatCurrency={formatCurrency}
              getStockStatus={getStockStatus}
            />
          ))}
        </div>
      ) : (
        <div className="bg-white shadow overflow-hidden sm:rounded-md">
          <ul className="divide-y divide-gray-200">
            {sortedMaterials.map((material) => {
              const isNewGermanPerfume = material.name.toLowerCase().includes('citrus burst energy cologne');
              const stockStatus = getStockStatus(material.current_stock, material.min_stock_level);

              return (
                <li key={material.id} className={`px-6 py-4 ${isNewGermanPerfume ? 'bg-green-50' : ''}`}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <div className="flex-shrink-0">
                        <div className={`h-10 w-10 rounded-full flex items-center justify-center ${isNewGermanPerfume ? 'bg-green-100' : 'bg-gray-100'
                          }`}>
                          <Package className={`h-5 w-5 ${isNewGermanPerfume ? 'text-green-600' : 'text-gray-400'}`} />
                        </div>
                      </div>
                      <div className="ml-4">
                        <div className="flex items-center">
                          <div className={`text-sm font-medium ${isNewGermanPerfume ? 'text-green-800' : 'text-gray-900'}`}>
                            {material.name}
                          </div>
                          {isNewGermanPerfume && (
                            <span className="ml-2 inline-flex items-center px-2 py-1 text-xs font-medium rounded-full bg-green-100 text-green-800">
                              🇩🇪 New
                            </span>
                          )}
                        </div>
                        <div className="text-sm text-gray-500">
                          {material.type} • Total: {material.current_stock} {material.unit} • Remaining: <span className={`font-medium ${material.remaining_stock > 0 ? 'text-green-600' : 'text-red-600'}`}>{material.remaining_stock || 0}</span> {material.unit} • {formatCurrency(material.cost_per_unit)}/{material.unit}
                        </div>
                        <div className="text-sm text-gray-500">
                          Supplier: {material.supplier}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-4">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${stockStatus.bgColor} ${stockStatus.textColor}`}>
                        {stockStatus.text}
                      </span>
                      <span className="text-sm font-medium text-gray-900">
                        {formatCurrency(material.current_stock * material.cost_per_unit)}
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

// Recipes Tab Component
const RecipesTab = ({ recipes, rawMaterials, searchTerm, viewMode, selectedItems, sortBy, sortOrder, onToggleSelection, onCreateRecipe, onEdit, onDelete, onViewDetails }) => {
  const filteredRecipes = recipes.filter(recipe =>
    recipe?.name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const sortedRecipes = [...filteredRecipes].sort((a, b) => {
    if (sortBy === 'name') {
      if (sortOrder === 'asc') {
        return (a?.name || '').localeCompare(b?.name || '');
      } else {
        return (b?.name || '').localeCompare(a?.name || '');
      }
    } else if (sortBy === 'created_at') {
      if (sortOrder === 'asc') {
        return new Date(a.created_at || 0).getTime() - new Date(b.created_at || 0).getTime();
      } else {
        return new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime();
      }
    }
    return 0;
  });

  const RecipeCard = ({ recipe, isSelected, onToggleSelection, onEdit, onDelete, onViewDetails }) => {
    // Check if this is a German recipe
    const isGermanRecipe = recipe.name.toLowerCase().includes('german') ||
      recipe.name.toLowerCase().includes('citrus burst');

    return (
      <div className={`bg-white rounded-lg border-2 transition-all duration-200 ${isSelected
          ? 'border-blue-500 shadow-lg'
          : isGermanRecipe
            ? 'border-green-500 shadow-lg bg-green-50'
            : 'border-gray-200 hover:border-gray-300 hover:shadow-md'
        }`}>
        <div className="relative group">
          {/* Recipe Icon */}
          <div className={`w-full h-48 rounded-t-lg flex items-center justify-center ${isGermanRecipe
              ? 'bg-gradient-to-br from-green-100 to-green-200'
              : 'bg-gradient-to-br from-blue-100 to-blue-200'
            }`}>
            <Cog className={`h-12 w-12 ${isGermanRecipe ? 'text-green-600' : 'text-blue-400'}`} />
          </div>

          {/* German Recipe Badge */}
          {isGermanRecipe && (
            <div className="absolute top-2 right-2">
              <span className="inline-flex items-center px-2 py-1 text-xs font-medium rounded-full bg-green-100 text-green-800 border border-green-300">
                🇩🇪 German Import
              </span>
            </div>
          )}

          {/* Selection Checkbox */}
          <div className="absolute top-2 left-2">
            <input
              type="checkbox"
              checked={isSelected}
              onChange={onToggleSelection}
              className="rounded border-gray-300 bg-white shadow-sm"
            />
          </div>
        </div>

        <div className="p-4">
          <div className="flex items-start justify-between mb-2">
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-gray-900 truncate">{recipe.name}</h3>
              {isGermanRecipe && (
                <span className="inline-flex items-center px-2 py-1 text-xs font-medium rounded-full bg-yellow-100 text-yellow-800 mt-1">
                  ✨ Premium
                </span>
              )}
            </div>
          </div>

          <div className="space-y-2 mb-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-500">Bottle Size:</span>
              <span className="text-sm text-gray-900 font-medium">{recipe.size_ml}ml</span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-500">Materials:</span>
              <span className="text-sm text-gray-900 font-medium">{recipe.materials?.length || 0} items</span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-500">Status:</span>
              <span className="text-sm text-gray-900 font-medium">Active</span>
            </div>
          </div>

          <p className="text-sm text-gray-600 mb-3 line-clamp-2">{recipe.description}</p>

          {/* Status Indicator */}
          <div className="mt-3 pt-3 border-t border-gray-100">
            <div className="flex items-center justify-between">
              <span className="inline-flex items-center px-2 py-1 text-xs font-medium rounded-full bg-green-100 text-green-800">
                Active
              </span>
              <span className="text-xs text-gray-500">
                ID: {recipe.id.slice(0, 8)}...
              </span>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="mt-3 pt-3 border-t border-gray-100">
            <div className="flex items-center justify-center space-x-2">
              <button
                onClick={() => onViewDetails(recipe)}
                className="p-2 bg-blue-50 text-blue-600 hover:bg-blue-100 rounded-lg transition-all duration-200 shadow-sm"
                title="View Details"
              >
                <Eye className="h-4 w-4" />
              </button>
              <button
                onClick={() => onEdit(recipe)}
                className="p-2 bg-indigo-50 text-indigo-600 hover:bg-indigo-100 rounded-lg transition-all duration-200 shadow-sm"
                title="Edit"
              >
                <Edit className="h-4 w-4" />
              </button>
              <button
                onClick={() => onDelete(recipe.id)}
                className="p-2 bg-red-50 text-red-600 hover:bg-red-100 rounded-lg transition-all duration-200 shadow-sm"
                title="Delete"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="p-6">
      {viewMode === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {sortedRecipes.map((recipe) => (
            <RecipeCard
              key={recipe.id}
              recipe={recipe}
              isSelected={selectedItems.has(recipe.id)}
              onToggleSelection={() => onToggleSelection(recipe.id)}
              onEdit={onEdit}
              onDelete={onDelete}
              onViewDetails={onViewDetails}
            />
          ))}
        </div>
      ) : (
        <div className="space-y-4">
          {sortedRecipes.map((recipe) => (
            <div key={recipe.id} className="bg-white rounded-lg border border-gray-200 p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <input
                    type="checkbox"
                    checked={selectedItems.has(recipe.id)}
                    onChange={() => onToggleSelection(recipe.id)}
                    className="rounded border-gray-300"
                  />
                  <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
                    <Cog className="h-5 w-5 text-blue-600" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">{recipe.name}</h3>
                    <p className="text-sm text-gray-500">{recipe.description}</p>
                  </div>
                </div>
                <div className="flex items-center space-x-4">
                  <div className="text-right">
                    <div className="text-sm font-medium text-gray-900">{recipe.size_ml}ml</div>
                    <div className="text-sm text-gray-500">{recipe.materials?.length || 0} materials</div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => onViewDetails(recipe)}
                      className="p-2 bg-blue-50 text-blue-600 hover:bg-blue-100 rounded-lg"
                    >
                      <Eye className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => onEdit(recipe)}
                      className="p-2 bg-indigo-50 text-indigo-600 hover:bg-indigo-100 rounded-lg"
                    >
                      <Edit className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => onDelete(recipe.id)}
                      className="p-2 bg-red-50 text-red-600 hover:bg-red-100 rounded-lg"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// Batches Tab Component
const BatchesTab = ({ batches, recipes, searchTerm, viewMode, sortBy, sortOrder, onViewBatch, onCreateBatch, onDeleteBatch, formatCurrency }) => {
  const filteredBatches = batches.filter(batch =>
    batch?.batch_number?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const sortedBatches = [...filteredBatches].sort((a, b) => {
    if (sortBy === 'batch_number') {
      if (sortOrder === 'asc') {
        return (a?.batch_number || '').localeCompare(b?.batch_number || '');
      } else {
        return b.batch_number.localeCompare(a.batch_number);
      }
    } else if (sortBy === 'created_at') {
      if (sortOrder === 'asc') {
        return new Date(a.created_at || 0).getTime() - new Date(b.created_at || 0).getTime();
      } else {
        return new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime();
      }
    }
    return 0;
  });

  const BatchCard = ({ batch, onViewBatch, formatCurrency }) => {
    const recipe = recipes.find(r => r.id === batch.recipe_id);

    // Check if this is a German batch
    const isGermanBatch = batch.batch_number.toLowerCase().includes('german') ||
      (recipe?.name && (recipe.name.toLowerCase().includes('german') ||
        recipe.name.toLowerCase().includes('citrus burst')));

    return (
      <div className={`bg-white rounded-lg border-2 transition-all duration-200 ${isGermanBatch
          ? 'border-green-500 shadow-lg bg-green-50'
          : 'border-gray-200 hover:border-gray-300 hover:shadow-md'
        }`}>
        <div className="relative group">
          {/* Batch Icon */}
          <div className={`w-full h-48 rounded-t-lg flex items-center justify-center ${isGermanBatch
              ? 'bg-gradient-to-br from-green-100 to-green-200'
              : 'bg-gradient-to-br from-green-100 to-green-200'
            }`}>
            <FlaskConical className={`h-12 w-12 ${isGermanBatch ? 'text-green-600' : 'text-green-400'}`} />
          </div>

          {/* Batch Number Badge */}
          <div className="absolute top-2 left-2">
            <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${isGermanBatch ? 'bg-green-100 text-green-800' : 'bg-blue-100 text-blue-800'
              }`}>
              {batch.batch_number}
            </span>
          </div>

          {/* German Batch Badge */}
          {isGermanBatch && (
            <div className="absolute top-2 right-2">
              <span className="inline-flex items-center px-2 py-1 text-xs font-medium rounded-full bg-green-100 text-green-800 border border-green-300">
                🇩🇪 German
              </span>
            </div>
          )}
        </div>

        <div className="p-4">
          <div className="flex items-start justify-between mb-2">
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-gray-900 truncate">
                {recipe?.name || 'Unknown Recipe'}
              </h3>
              {isGermanBatch && (
                <span className="inline-flex items-center px-2 py-1 text-xs font-medium rounded-full bg-yellow-100 text-yellow-800 mt-1">
                  ✨ Premium German Import
                </span>
              )}
            </div>
          </div>

          <div className="space-y-2 mb-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-500">Quantity:</span>
              <span className="text-sm text-gray-900 font-medium">{batch.quantity_produced} bottles ({batch.size_ml}ml each)</span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-500">Total Cost:</span>
              <span className="text-sm text-gray-900 font-medium">{formatCurrency(batch.total_cost || 0)}</span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-500">Unit Cost:</span>
              <span className="text-sm text-gray-900 font-medium">{formatCurrency(batch.unit_cost || 0)}</span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-500">Selling Price:</span>
              <span className="text-sm text-gray-900 font-medium">{formatCurrency(batch.selling_price || 0)}</span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-500">Profit Margin:</span>
              <span className="text-sm text-gray-900 font-medium">{batch.profit_margin || 50}%</span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-500">Profit per Bottle:</span>
              <span className="text-sm text-green-600 font-medium">
                {formatCurrency((batch.selling_price || 0) - (batch.unit_cost || 0))}
              </span>
            </div>
          </div>

          <p className="text-sm text-gray-600 mb-3 line-clamp-2">{batch.notes}</p>

          {/* Status Indicator */}
          <div className="mt-3 pt-3 border-t border-gray-100">
            <div className="flex items-center justify-between">
              <span className="inline-flex items-center px-2 py-1 text-xs font-medium rounded-full bg-green-100 text-green-800">
                Completed
              </span>
              <span className="text-xs text-gray-500">
                {new Date(batch.created_at).toLocaleDateString()}
              </span>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="mt-3 pt-3 border-t border-gray-100">
            <div className="flex items-center justify-center space-x-2">
              <button
                onClick={() => onViewBatch(batch)}
                className="p-2 bg-blue-50 text-blue-600 hover:bg-blue-100 rounded-lg transition-all duration-200 shadow-sm"
                title="View Details"
              >
                <Eye className="h-4 w-4" />
              </button>
              <button
                onClick={() => onDeleteBatch(batch)}
                className="p-2 bg-red-50 text-red-600 hover:bg-red-100 rounded-lg transition-all duration-200 shadow-sm"
                title="Delete Batch"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="p-6">
      {viewMode === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {sortedBatches.map((batch) => (
            <BatchCard
              key={batch.id}
              batch={batch}
              onViewBatch={onViewBatch}
              formatCurrency={formatCurrency}
            />
          ))}
        </div>
      ) : (
        <div className="space-y-4">
          {sortedBatches.map((batch) => {
            const recipe = recipes.find(r => r.id === batch.recipe_id);
            return (
              <div key={batch.id} className="bg-white rounded-lg border border-gray-200 p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <div className="h-10 w-10 rounded-full bg-green-100 flex items-center justify-center">
                      <FlaskConical className="h-5 w-5 text-green-600" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">{batch.batch_number}</h3>
                      <p className="text-sm text-gray-500">{recipe?.name || 'Unknown Recipe'}</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-4">
                    <div className="text-right">
                      <div className="text-sm font-medium text-gray-900">{batch.quantity_produced} ML</div>
                      <div className="text-sm text-gray-500">{formatCurrency(batch.total_cost || 0)}</div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => onViewBatch(batch)}
                        className="p-2 bg-blue-50 text-blue-600 hover:bg-blue-100 rounded-lg"
                      >
                        <Eye className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

// Forecast Tab Component
const ForecastTab = ({ forecast }) => {
  return (
    <div className="space-y-6">
      <h3 className="text-lg font-medium text-gray-900"><TranslatedText text="Material Requirements Forecast" /></h3>

      <div className="bg-white shadow overflow-hidden sm:rounded-md">
        <ul className="divide-y divide-gray-200">
          {forecast.map((item) => (
            <li key={item.material_id} className="px-6 py-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm font-medium text-gray-900">{item.material_name}</div>
                  <div className="text-sm text-gray-500">
                    Daily Average: {item.daily_average?.toFixed(2)} ML
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-medium text-gray-900">
                    {item.days_remaining?.toFixed(1)} days remaining
                  </div>
                  <div className="text-sm text-gray-500">
                    Current: {item.current_stock} ML
                  </div>
                </div>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
};

// Alerts Tab Component
const AlertsTab = ({ alerts }) => {
  return (
    <div className="space-y-6">
      <h3 className="text-lg font-medium text-gray-900"><TranslatedText text="Low Stock Alerts" /></h3>

      <div className="bg-white shadow overflow-hidden sm:rounded-md">
        <ul className="divide-y divide-gray-200">
          {alerts.map((alert) => (
            <li key={alert.id} className="px-6 py-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <div className="h-10 w-10 rounded-full bg-red-100 flex items-center justify-center">
                      <AlertCircle className="w-5 h-5 text-red-600" />
                    </div>
                  </div>
                  <div className="ml-4">
                    <div className="text-sm font-medium text-gray-900">{alert.name}</div>
                    <div className="text-sm text-gray-500">
                      Current: {alert.current_stock} {alert.unit} • Min: {alert.min_stock_level} {alert.unit}
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                    Low Stock
                  </span>
                </div>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
};

// Modal Components
const RawMaterialModal = ({ onClose, onSubmit, isLoading, suppliers, supplierMaterials, purchaseOrders, suppliersLoading, supplierMaterialsLoading, purchaseOrdersLoading, rawMaterial }) => {
  const [formData, setFormData] = useState({
    // Basic Information
    name: rawMaterial?.name || '',
    type: rawMaterial?.type || 'perfume',
    unit: rawMaterial?.unit || '',
    current_stock: rawMaterial?.current_stock || '',
    cost_per_unit: rawMaterial?.cost_per_unit || '',

    // Stock Management
    min_stock_level: rawMaterial?.min_stock_level || '',
    max_stock_level: rawMaterial?.max_stock_level || '',
    reorder_point: rawMaterial?.reorder_point || '',
    safety_stock: rawMaterial?.safety_stock || '',

    // Supplier Information
    supplier_id: rawMaterial?.supplier_id || '',
    supplier_name: rawMaterial?.supplier_name || '',
    supplier_contact: rawMaterial?.supplier_contact || '',

    // Production Details
    lead_time_days: rawMaterial?.lead_time_days || '',
    shelf_life_days: rawMaterial?.shelf_life_days || '',
    storage_requirements: rawMaterial?.storage_requirements || '',
    quality_standards: rawMaterial?.quality_standards || '',

    // Location & Storage
    location: '',
    bin_number: '',
    storage_conditions: '',

    // Batch & Manufacturing
    batch_number: '',
    lot_number: '',
    manufacturing_date: '',
    received_date: '',
    expiry_date: '',

    // Cost & Pricing
    last_purchase_cost: '',
    average_cost: '',

    // Inventory Management
    usage_rate: '',
    minimum_order_quantity: '',
    economic_order_quantity: '',

    // Technical Specifications
    technical_specs: '',
    material_composition: '',
    physical_properties: '',
    safety_data: '',

    // Documentation
    msds_required: false,
    msds_url: '',
    certification_required: false,
    certification_type: '',
    certification_expiry: '',
    test_certificate_url: '',

    // Audit & Compliance
    last_audit_date: '',
    hazard_classification: ''
  });

  const [activeSection, setActiveSection] = useState('basic');
  const [selectedSupplier, setSelectedSupplier] = useState(null);
  const [showAdvancedFields, setShowAdvancedFields] = useState(false);

  // Auto-populate supplier information when supplier is selected
  const handleSupplierChange = (supplierId) => {
    const supplier = suppliers?.find(s => s.id === supplierId);
    if (supplier) {
      setSelectedSupplier(supplier);
      setFormData(prev => ({
        ...prev,
        supplier_id: supplierId,
        supplier: supplier.name,
        currency: supplier.country === 'Germany' ? 'EUR' : 'RWF'
      }));
    }
  };

  // Auto-populate from supplier materials if available
  const handleSupplierMaterialSelect = (supplierMaterialId) => {
    const supplierMaterial = supplierMaterials?.find(sm => sm.id === supplierMaterialId);
    if (supplierMaterial) {
      setFormData(prev => ({
        ...prev,
        supplier_material_code: supplierMaterial.supplier_material_code,
        cost_per_unit: supplierMaterial.standard_cost,
        lead_time_days: supplierMaterial.lead_time_days,
        minimum_order_quantity: supplierMaterial.minimum_order_quantity
      }));
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    // Validate required fields
    const requiredFields = ['name', 'type', 'unit', 'current_stock', 'cost_per_unit'];
    const missingFields = requiredFields.filter(field => {
      const value = formData[field];
      return !value || value === '' || (typeof value === 'string' && value.trim() === '');
    });

    if (missingFields.length > 0) {
      toast.error(`Please fill in all required fields: ${missingFields.join(', ')}`);
      return;
    }

    // Prepare data for backend - only send necessary fields
    const cleanedData = {
      name: formData.name?.trim() || '',
      type: formData.type || '',
      description: formData.description?.trim() || null,
      unit: formData.unit?.trim() || '',
      current_stock: parseFloat(formData.current_stock) || 0,
      cost_per_unit: parseFloat(formData.cost_per_unit) || 0,
      min_stock_level: formData.min_stock_level ? parseFloat(formData.min_stock_level) : 0,
      supplier: formData.supplier?.trim() || null,
      supplier_id: formData.supplier_id || null,
      supplier_material_code: formData.supplier_material_code?.trim() || null,
      batch_number: formData.batch_number?.trim() || null,
      expiry_date: formData.expiry_date || null,
      quality_grade: formData.quality_grade?.trim() || null,
      currency: formData.currency || 'RWF',
      location: formData.location?.trim() || null,
      bin_number: formData.bin_number?.trim() || null,
      lot_number: formData.lot_number?.trim() || null,
      manufacturing_date: formData.manufacturing_date || null,
      received_date: formData.received_date || null,
      usage_rate: formData.usage_rate ? parseFloat(formData.usage_rate) || null : null,
      lead_time_days: formData.lead_time_days ? parseInt(formData.lead_time_days) || null : null,
      minimum_order_quantity: formData.minimum_order_quantity ? parseFloat(formData.minimum_order_quantity) || null : null,
      technical_specs: formData.technical_specs?.trim() || null,
      material_composition: formData.material_composition?.trim() || null,
      compliance_standards: formData.compliance_standards?.trim() || null,
      test_certificate_url: formData.test_certificate_url?.trim() || null,
      regulatory_approval: formData.regulatory_approval?.trim() || null,
      economic_order_quantity: formData.economic_order_quantity ? parseFloat(formData.economic_order_quantity) || null : null,
      physical_properties: formData.physical_properties?.trim() || null,
      safety_data: formData.safety_data?.trim() || null,
      // Add missing fields
      reorder_point: formData.reorder_point ? parseFloat(formData.reorder_point) || null : null,
      max_stock_level: formData.max_stock_level ? parseFloat(formData.max_stock_level) || null : null,
      safety_stock: formData.safety_stock ? parseFloat(formData.safety_stock) || null : null,
      shelf_life_days: formData.shelf_life_days ? parseInt(formData.shelf_life_days) || null : null,
      storage_conditions: formData.storage_conditions?.trim() || null,
      hazard_classification: formData.hazard_classification?.trim() || null,
      msds_required: formData.msds_required || false,
      msds_url: formData.msds_url?.trim() || null,
      certification_required: formData.certification_required || false,
      certification_type: formData.certification_type?.trim() || null,
      certification_expiry: formData.certification_expiry || null,
      last_purchase_cost: formData.last_purchase_cost ? parseFloat(formData.last_purchase_cost) || null : null,
      average_cost: formData.average_cost ? parseFloat(formData.average_cost) || null : null,
      last_audit_date: formData.last_audit_date || null
    };

    // Validate numeric fields
    if (isNaN(cleanedData.current_stock) || isNaN(cleanedData.cost_per_unit)) {
      toast.error('Please enter valid numbers for stock and cost');
      return;
    }

    if (cleanedData.current_stock < 0 || cleanedData.cost_per_unit < 0) {
      toast.error('Stock and cost values cannot be negative');
      return;
    }

    // Validate URL fields if provided
    if (cleanedData.test_certificate_url && cleanedData.test_certificate_url.trim() !== '') {
      try {
        new URL(cleanedData.test_certificate_url);
      } catch (error) {
        toast.error('Please enter a valid URL for the test certificate');
        return;
      }
    }

    onSubmit(cleanedData);
  };

  const sections = [
    { id: 'basic', name: 'Basic Info', icon: '📋' },
    { id: 'supplier', name: 'Supplier', icon: '🏢' },
    { id: 'quality', name: 'Quality & Compliance', icon: '✅' },
    { id: 'inventory', name: 'Inventory', icon: '📦' },
    { id: 'technical', name: 'Technical', icon: '🔬' },
    { id: 'documentation', name: 'Documents', icon: '📄' }
  ];

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div className="relative top-10 mx-auto p-6 border w-4/5 max-w-4xl shadow-lg rounded-md bg-white">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-xl font-semibold text-gray-900">
            {rawMaterial ? 'Edit Raw Materials' : 'Add Raw Materials'}
          </h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* Section Navigation */}
        <div className="flex space-x-1 mb-6 bg-gray-100 p-1 rounded-lg">
          {sections.map((section) => (
            <button
              key={section.id}
              onClick={() => setActiveSection(section.id)}
              className={`flex-1 py-2 px-3 text-sm font-medium rounded-md transition-colors ${activeSection === section.id
                  ? 'bg-white text-primary-600 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
                }`}
            >
              <span className="mr-1">{section.icon}</span>
              {section.name}
            </button>
          ))}
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Information Section */}
          {activeSection === 'basic' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Name *</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500"
                  placeholder="e.g., Citrus Burst Energy Cologne"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Type *</label>
                <select
                  value={formData.type}
                  onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                  className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500"
                >
                  <option value="perfume">Perfume</option>
                  <option value="bottle">Bottle</option>
                  <option value="cap">Cap</option>
                  <option value="label">Label</option>
                  <option value="packaging">Packaging</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Unit *</label>
                <input
                  type="text"
                  required
                  value={formData.unit}
                  onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                  className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500"
                  placeholder="e.g., liters, pieces, kg"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Current Stock *</label>
                <input
                  type="number"
                  step="0.001"
                  required
                  value={formData.current_stock}
                  onChange={(e) => setFormData({ ...formData, current_stock: e.target.value })}
                  className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500"
                />
              </div>

              <div>
                <CurrencyInput
                  label="Cost per Unit"
                  value={formData.cost_per_unit}
                  onChange={(value) => setFormData({ ...formData, cost_per_unit: value })}
                  placeholder="0.00"
                  required
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700">Description</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={3}
                  className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500"
                  placeholder="Detailed description of the material..."
                />
              </div>
            </div>
          )}

          {/* Supplier Information Section */}
          {activeSection === 'supplier' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Supplier</label>
                <select
                  value={formData.supplier_id}
                  onChange={(e) => handleSupplierChange(e.target.value)}
                  disabled={suppliersLoading}
                  className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
                >
                  <option value="">
                    {suppliersLoading ? 'Loading suppliers...' : 'Select a supplier'}
                  </option>
                  {Array.isArray(suppliers) && suppliers.map(supplier => (
                    <option key={supplier.id} value={supplier.id}>
                      {supplier.name} ({supplier.country})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Supplier Material Code</label>
                <input
                  type="text"
                  value={formData.supplier_material_code}
                  onChange={(e) => setFormData({ ...formData, supplier_material_code: e.target.value })}
                  className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500"
                  placeholder="Supplier's internal code"
                />
              </div>

              {selectedSupplier && (
                <div className="md:col-span-2 p-4 bg-blue-50 rounded-lg">
                  <h4 className="font-medium text-blue-900 mb-2">Supplier Information</h4>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="font-medium">Contact:</span> {selectedSupplier.contact_person}
                    </div>
                    <div>
                      <span className="font-medium">Email:</span> {selectedSupplier.email}
                    </div>
                    <div>
                      <span className="font-medium">Phone:</span> {selectedSupplier.phone}
                    </div>
                    <div>
                      <span className="font-medium">Rating:</span> {selectedSupplier.rating}/5
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Quality & Compliance Section */}
          {activeSection === 'quality' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Quality Grade</label>
                <select
                  value={formData.quality_grade}
                  onChange={(e) => setFormData({ ...formData, quality_grade: e.target.value })}
                  className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500"
                >
                  <option value="">Select grade</option>
                  <option value="premium">Premium</option>
                  <option value="standard">Standard</option>
                  <option value="economy">Economy</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Hazard Classification</label>
                <input
                  type="text"
                  value={formData.hazard_classification}
                  onChange={(e) => setFormData({ ...formData, hazard_classification: e.target.value })}
                  className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500"
                  placeholder="e.g., Non-hazardous"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Compliance Standards</label>
                <input
                  type="text"
                  value={formData.compliance_standards}
                  onChange={(e) => setFormData({ ...formData, compliance_standards: e.target.value })}
                  className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500"
                  placeholder="e.g., ISO, FDA, EU regulations"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Regulatory Approval</label>
                <input
                  type="text"
                  value={formData.regulatory_approval}
                  onChange={(e) => setFormData({ ...formData, regulatory_approval: e.target.value })}
                  className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500"
                  placeholder="e.g., FDA approved, EU compliant"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Shelf Life (days)</label>
                <input
                  type="number"
                  value={formData.shelf_life_days}
                  onChange={(e) => setFormData({ ...formData, shelf_life_days: e.target.value })}
                  className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Storage Conditions</label>
                <input
                  type="text"
                  value={formData.storage_conditions}
                  onChange={(e) => setFormData({ ...formData, storage_conditions: e.target.value })}
                  className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500"
                  placeholder="e.g., Cool, dry place"
                />
              </div>
            </div>
          )}

          {/* Inventory Management Section */}
          {activeSection === 'inventory' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Minimum Stock Level</label>
                <input
                  type="number"
                  step="0.001"
                  value={formData.min_stock_level}
                  onChange={(e) => setFormData({ ...formData, min_stock_level: e.target.value })}
                  className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Reorder Point</label>
                <input
                  type="number"
                  step="0.001"
                  value={formData.reorder_point}
                  onChange={(e) => setFormData({ ...formData, reorder_point: e.target.value })}
                  className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Maximum Stock Level</label>
                <input
                  type="number"
                  step="0.001"
                  value={formData.max_stock_level}
                  onChange={(e) => setFormData({ ...formData, max_stock_level: e.target.value })}
                  className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Safety Stock</label>
                <input
                  type="number"
                  step="0.001"
                  value={formData.safety_stock}
                  onChange={(e) => setFormData({ ...formData, safety_stock: e.target.value })}
                  className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Usage Rate (per day)</label>
                <input
                  type="number"
                  step="0.001"
                  value={formData.usage_rate}
                  onChange={(e) => setFormData({ ...formData, usage_rate: e.target.value })}
                  className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Lead Time (days)</label>
                <input
                  type="number"
                  value={formData.lead_time_days}
                  onChange={(e) => setFormData({ ...formData, lead_time_days: e.target.value })}
                  className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Minimum Order Quantity</label>
                <input
                  type="number"
                  step="0.001"
                  value={formData.minimum_order_quantity}
                  onChange={(e) => setFormData({ ...formData, minimum_order_quantity: e.target.value })}
                  className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Economic Order Quantity</label>
                <input
                  type="number"
                  step="0.001"
                  value={formData.economic_order_quantity}
                  onChange={(e) => setFormData({ ...formData, economic_order_quantity: e.target.value })}
                  className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Shelf Life (days)</label>
                <input
                  type="number"
                  min="0"
                  value={formData.shelf_life_days}
                  onChange={(e) => setFormData({ ...formData, shelf_life_days: e.target.value })}
                  className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500"
                  placeholder="e.g., 365 for 1 year"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Location</label>
                <input
                  type="text"
                  value={formData.location}
                  onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                  className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500"
                  placeholder="e.g., Warehouse A, Section B"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Bin Number</label>
                <input
                  type="text"
                  value={formData.bin_number}
                  onChange={(e) => setFormData({ ...formData, bin_number: e.target.value })}
                  className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500"
                  placeholder="e.g., A1-B2-C3"
                />
              </div>
            </div>
          )}

          {/* Technical Specifications Section */}
          {activeSection === 'technical' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Batch Number</label>
                <input
                  type="text"
                  value={formData.batch_number}
                  onChange={(e) => setFormData({ ...formData, batch_number: e.target.value })}
                  className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Lot Number</label>
                <input
                  type="text"
                  value={formData.lot_number}
                  onChange={(e) => setFormData({ ...formData, lot_number: e.target.value })}
                  className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Manufacturing Date</label>
                <input
                  type="date"
                  value={formData.manufacturing_date}
                  onChange={(e) => setFormData({ ...formData, manufacturing_date: e.target.value })}
                  className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Received Date</label>
                <input
                  type="date"
                  value={formData.received_date}
                  onChange={(e) => setFormData({ ...formData, received_date: e.target.value })}
                  className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Expiry Date</label>
                <input
                  type="date"
                  value={formData.expiry_date}
                  onChange={(e) => setFormData({ ...formData, expiry_date: e.target.value })}
                  className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Last Purchase Cost</label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.last_purchase_cost}
                  onChange={(e) => setFormData({ ...formData, last_purchase_cost: e.target.value })}
                  className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Average Cost</label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.average_cost}
                  onChange={(e) => setFormData({ ...formData, average_cost: e.target.value })}
                  className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700">Material Composition</label>
                <textarea
                  value={formData.material_composition}
                  onChange={(e) => setFormData({ ...formData, material_composition: e.target.value })}
                  rows={3}
                  className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500"
                  placeholder="Chemical composition, ingredients, etc."
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700">Technical Specifications</label>
                <textarea
                  value={formData.technical_specs}
                  onChange={(e) => setFormData({ ...formData, technical_specs: e.target.value })}
                  rows={3}
                  className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500"
                  placeholder="Technical specifications, properties, etc."
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700">Physical Properties</label>
                <textarea
                  value={formData.physical_properties}
                  onChange={(e) => setFormData({ ...formData, physical_properties: e.target.value })}
                  rows={3}
                  className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500"
                  placeholder="Physical properties, appearance, etc."
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700">Safety Data</label>
                <textarea
                  value={formData.safety_data}
                  onChange={(e) => setFormData({ ...formData, safety_data: e.target.value })}
                  rows={3}
                  className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500"
                  placeholder="Safety information, handling instructions, etc."
                />
              </div>
            </div>
          )}

          {/* Documentation Section */}
          {activeSection === 'documentation' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="msds_required"
                  checked={formData.msds_required}
                  onChange={(e) => setFormData({ ...formData, msds_required: e.target.checked })}
                  className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                />
                <label htmlFor="msds_required" className="ml-2 block text-sm text-gray-900">
                  MSDS Required
                </label>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">MSDS URL</label>
                <input
                  type="url"
                  value={formData.msds_url}
                  onChange={(e) => setFormData({ ...formData, msds_url: e.target.value })}
                  className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500"
                  placeholder="https://..."
                />
              </div>

              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="certification_required"
                  checked={formData.certification_required}
                  onChange={(e) => setFormData({ ...formData, certification_required: e.target.checked })}
                  className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                />
                <label htmlFor="certification_required" className="ml-2 block text-sm text-gray-900">
                  Certification Required
                </label>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Certification Type</label>
                <input
                  type="text"
                  value={formData.certification_type}
                  onChange={(e) => setFormData({ ...formData, certification_type: e.target.value })}
                  className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500"
                  placeholder="e.g., ISO, FDA, CE"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Certification Expiry</label>
                <input
                  type="date"
                  value={formData.certification_expiry}
                  onChange={(e) => setFormData({ ...formData, certification_expiry: e.target.value })}
                  className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Test Certificate URL</label>
                <input
                  type="url"
                  value={formData.test_certificate_url}
                  onChange={(e) => setFormData({ ...formData, test_certificate_url: e.target.value })}
                  className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500"
                  placeholder="https://..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Last Audit Date</label>
                <input
                  type="date"
                  value={formData.last_audit_date}
                  onChange={(e) => setFormData({ ...formData, last_audit_date: e.target.value })}
                  className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500"
                />
              </div>
            </div>
          )}

          {/* Navigation and Submit */}
          <div className="flex justify-between items-center pt-6 border-t">
            <div className="flex space-x-2">
              {sections.map((section, index) => (
                <button
                  key={section.id}
                  type="button"
                  onClick={() => setActiveSection(section.id)}
                  className={`px-3 py-1 text-sm rounded-md ${activeSection === section.id
                      ? 'bg-primary-100 text-primary-700'
                      : 'text-gray-500 hover:text-gray-700'
                    }`}
                >
                  {section.icon}
                </button>
              ))}
            </div>

            <div className="flex space-x-3">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isLoading}
                className="px-6 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 disabled:opacity-50"
              >
                {isLoading ? 'Adding...' : 'Add Material'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

const RecipeModal = ({ onClose, onSubmit, rawMaterials, isLoading, bottleSizes, bottleSizesLoading, formatCurrency, recipe }) => {
  const [formData, setFormData] = useState({
    // Basic Information
    name: recipe?.name || '',
    description: recipe?.description || '',
    bottle_size_id: recipe?.bottle_size_id || '',
    version: recipe?.version || '1.0',
    status: recipe?.status || 'active',
    category: recipe?.category || '',
    difficulty_level: recipe?.difficulty_level || '',

    // Production & Cost
    estimated_production_time: recipe?.estimated_production_time || '',
    target_cost: recipe?.target_cost || '',
    markup_percentage: recipe?.markup_percentage || '',
    selling_price: recipe?.selling_price || '',
    currency: recipe?.currency || 'RWF',

    // Quality & Standards
    quality_standards: recipe?.quality_standards || '',
    shelf_life_days: recipe?.shelf_life_days || '',
    batch_size_min: '',
    batch_size_max: '',

    // Production Details
    production_notes: '',
    yield_percentage: '',
    waste_percentage: '',
    efficiency_rating: '',

    // Documentation & Safety
    recipe_image_url: '',
    instruction_manual_url: '',
    safety_instructions: '',
    testing_requirements: '',
    storage_requirements: '',
    quality_checkpoints: '',

    // Materials (BOM)
    materials: []
  });

  const [activeSection, setActiveSection] = useState('basic');
  const [showAdvancedFields, setShowAdvancedFields] = useState(false);
  const [selectedMaterials, setSelectedMaterials] = useState([]);

  // Auto-calculate selling price when target cost and markup are set
  const calculateSellingPrice = () => {
    if (formData.target_cost && formData.markup_percentage) {
      const targetCost = parseFloat(formData.target_cost);
      const markup = parseFloat(formData.markup_percentage);
      const sellingPrice = targetCost * (1 + markup / 100);
      setFormData(prev => ({ ...prev, selling_price: sellingPrice.toFixed(2) }));
    }
  };

  // Handle material selection for BOM
  const handleMaterialAdd = (materialId, quantity) => {
    const material = rawMaterials?.find(m => m.id === materialId);
    if (material) {
      const newMaterial = {
        material_id: materialId,
        quantity_per_unit: parseFloat(quantity),
        material_name: material.name,
        unit: material.unit,
        cost_per_unit: material.cost_per_unit
      };

      setSelectedMaterials(prev => {
        const existing = prev.find(m => m.material_id === materialId);
        if (existing) {
          return prev.map(m => m.material_id === materialId ? newMaterial : m);
        }
        return [...prev, newMaterial];
      });
    }
  };

  const handleMaterialRemove = (materialId) => {
    setSelectedMaterials(prev => prev.filter(m => m.material_id !== materialId));
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    // Convert empty strings to null for optional fields
    const cleanedData = Object.fromEntries(
      Object.entries(formData).map(([key, value]) => [
        key,
        value === '' ? null : value
      ])
    );

    // Add selected materials to the form data
    cleanedData.materials = selectedMaterials;

    onSubmit(cleanedData);
  };

  const sections = [
    { id: 'basic', name: 'Basic Info', icon: '📋' },
    { id: 'production', name: 'Production & Cost', icon: '💰' },
    { id: 'quality', name: 'Quality & Standards', icon: '✅' },
    { id: 'materials', name: 'Materials (BOM)', icon: '🧪' },
    { id: 'documentation', name: 'Documentation', icon: '📄' }
  ];

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div className="relative top-10 mx-auto p-6 border w-11/12 max-w-4xl shadow-lg rounded-md bg-white">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-xl font-semibold text-gray-900">
            {recipe ? 'Edit Bottling Recipe' : 'Create Bottling Recipe'}
          </h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* Section Navigation */}
        <div className="flex space-x-1 mb-6 bg-gray-100 p-1 rounded-lg">
          {sections.map((section) => (
            <button
              key={section.id}
              onClick={() => setActiveSection(section.id)}
              className={`flex-1 py-2 px-3 text-sm font-medium rounded-md transition-colors ${activeSection === section.id
                  ? 'bg-white text-primary-600 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
                }`}
            >
              <span className="mr-2">{section.icon}</span>
              {section.name}
            </button>
          ))}
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Information Section */}
          {activeSection === 'basic' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Recipe Name *</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500"
                  placeholder="e.g., Premium Rose Garden 50ml"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Bottle Size *</label>
                <select
                  required
                  value={formData.bottle_size_id}
                  onChange={(e) => setFormData({ ...formData, bottle_size_id: e.target.value })}
                  className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500"
                  disabled={bottleSizesLoading}
                >
                  <option value="">Select Bottle Size</option>
                  {Array.isArray(bottleSizes) && bottleSizes.map((size) => (
                    <option key={size.id} value={size.id}>
                      {size.size_ml}ml - ${size.bottle_cost}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Category</label>
                <select
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500"
                >
                  <option value="">Select Category</option>
                  <option value="premium">Premium</option>
                  <option value="standard">Standard</option>
                  <option value="economy">Economy</option>
                  <option value="limited_edition">Limited Edition</option>
                  <option value="seasonal">Seasonal</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Difficulty Level</label>
                <select
                  value={formData.difficulty_level}
                  onChange={(e) => setFormData({ ...formData, difficulty_level: e.target.value })}
                  className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500"
                >
                  <option value="">Select Difficulty</option>
                  <option value="beginner">Beginner</option>
                  <option value="intermediate">Intermediate</option>
                  <option value="advanced">Advanced</option>
                  <option value="expert">Expert</option>
                </select>
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700">Description</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500"
                  rows={3}
                  placeholder="Describe the recipe, its characteristics, and target market..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Version</label>
                <input
                  type="text"
                  value={formData.version}
                  onChange={(e) => setFormData({ ...formData, version: e.target.value })}
                  className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500"
                  placeholder="1.0"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Status</label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                  className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500"
                >
                  <option value="active">Active</option>
                  <option value="draft">Draft</option>
                  <option value="archived">Archived</option>
                  <option value="testing">Testing</option>
                </select>
              </div>
            </div>
          )}

          {/* Production & Cost Section */}
          {activeSection === 'production' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Estimated Production Time (minutes)</label>
                <input
                  type="number"
                  value={formData.estimated_production_time}
                  onChange={(e) => setFormData({ ...formData, estimated_production_time: e.target.value })}
                  className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500"
                  placeholder="30"
                />
              </div>

              <div>
                <CurrencyInput
                  label="Target Cost"
                  value={formData.target_cost}
                  onChange={(value) => {
                    setFormData({ ...formData, target_cost: value });
                    calculateSellingPrice();
                  }}
                  placeholder="15.00"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Markup Percentage (%)</label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.markup_percentage}
                  onChange={(e) => {
                    setFormData({ ...formData, markup_percentage: e.target.value });
                    calculateSellingPrice();
                  }}
                  className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500"
                  placeholder="50.00"
                />
              </div>

              <div>
                <CurrencyInput
                  label="Selling Price"
                  value={formData.selling_price}
                  onChange={(value) => setFormData({ ...formData, selling_price: value })}
                  placeholder="22.50"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Efficiency Rating (0-1)</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  max="1"
                  value={formData.efficiency_rating}
                  onChange={(e) => setFormData({ ...formData, efficiency_rating: e.target.value })}
                  className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500"
                  placeholder="0.85"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Yield Percentage (%)</label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.yield_percentage}
                  onChange={(e) => setFormData({ ...formData, yield_percentage: e.target.value })}
                  className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500"
                  placeholder="95.00"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Waste Percentage (%)</label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.waste_percentage}
                  onChange={(e) => setFormData({ ...formData, waste_percentage: e.target.value })}
                  className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500"
                  placeholder="5.00"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700">Production Notes</label>
                <textarea
                  value={formData.production_notes}
                  onChange={(e) => setFormData({ ...formData, production_notes: e.target.value })}
                  className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500"
                  rows={3}
                  placeholder="Special instructions, tips, or notes for production..."
                />
              </div>
            </div>
          )}

          {/* Quality & Standards Section */}
          {activeSection === 'quality' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Quality Standards</label>
                <textarea
                  value={formData.quality_standards}
                  onChange={(e) => setFormData({ ...formData, quality_standards: e.target.value })}
                  className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500"
                  rows={3}
                  placeholder="Quality standards and requirements..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Shelf Life (days)</label>
                <input
                  type="number"
                  value={formData.shelf_life_days}
                  onChange={(e) => setFormData({ ...formData, shelf_life_days: e.target.value })}
                  className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500"
                  placeholder="1095"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Minimum Batch Size</label>
                <input
                  type="number"
                  value={formData.batch_size_min}
                  onChange={(e) => setFormData({ ...formData, batch_size_min: e.target.value })}
                  className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500"
                  placeholder="10"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Maximum Batch Size</label>
                <input
                  type="number"
                  value={formData.batch_size_max}
                  onChange={(e) => setFormData({ ...formData, batch_size_max: e.target.value })}
                  className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500"
                  placeholder="1000"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Testing Requirements</label>
                <textarea
                  value={formData.testing_requirements}
                  onChange={(e) => setFormData({ ...formData, testing_requirements: e.target.value })}
                  className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500"
                  rows={3}
                  placeholder="Testing requirements and procedures..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Quality Checkpoints</label>
                <textarea
                  value={formData.quality_checkpoints}
                  onChange={(e) => setFormData({ ...formData, quality_checkpoints: e.target.value })}
                  className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500"
                  rows={3}
                  placeholder="Quality checkpoints during production..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Storage Requirements</label>
                <textarea
                  value={formData.storage_requirements}
                  onChange={(e) => setFormData({ ...formData, storage_requirements: e.target.value })}
                  className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500"
                  rows={3}
                  placeholder="Storage conditions and requirements..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Safety Instructions</label>
                <textarea
                  value={formData.safety_instructions}
                  onChange={(e) => setFormData({ ...formData, safety_instructions: e.target.value })}
                  className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500"
                  rows={3}
                  placeholder="Safety instructions for handling and production..."
                />
              </div>
            </div>
          )}

          {/* Materials (BOM) Section */}
          {activeSection === 'materials' && (
            <div className="space-y-6">
              <div className="bg-blue-50 p-4 rounded-lg">
                <h4 className="text-sm font-medium text-blue-900 mb-2">Bill of Materials (BOM)</h4>
                <p className="text-sm text-blue-700">Add materials required for this recipe. The quantities should be per unit produced.</p>
              </div>

              {/* Add Material Form */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 border border-gray-200 rounded-lg">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Material</label>
                  <select
                    className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500"
                    onChange={(e) => {
                      const materialId = e.target.value;
                      const material = rawMaterials?.find(m => m.id === materialId);
                      if (material) {
                        setFormData(prev => ({
                          ...prev,
                          selected_material_id: materialId,
                          selected_material_quantity: ''
                        }));
                      }
                    }}
                  >
                    <option value="">Select Material</option>
                    {Array.isArray(rawMaterials) && rawMaterials.map((material) => (
                      <option key={material.id} value={material.id}>
                        {material.name} ({material.type}) - Stock: {material.current_stock} {material.unit}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Quantity per Unit</label>
                  <input
                    type="number"
                    step="0.001"
                    value={formData.selected_material_quantity || ''}
                    onChange={(e) => setFormData({ ...formData, selected_material_quantity: e.target.value })}
                    className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500"
                    placeholder="0.03"
                  />
                </div>

                <div className="flex items-end">
                  <button
                    type="button"
                    onClick={() => {
                      if (formData.selected_material_id && formData.selected_material_quantity) {
                        handleMaterialAdd(formData.selected_material_id, formData.selected_material_quantity);
                        setFormData(prev => ({
                          ...prev,
                          selected_material_id: '',
                          selected_material_quantity: ''
                        }));
                      }
                    }}
                    className="w-full px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 focus:ring-2 focus:ring-primary-500"
                  >
                    Add Material
                  </button>
                </div>
              </div>

              {/* Selected Materials List */}
              <div className="space-y-2">
                <h4 className="text-sm font-medium text-gray-900">Selected Materials:</h4>
                {selectedMaterials.length === 0 ? (
                  <p className="text-sm text-gray-500 italic">No materials added yet.</p>
                ) : (
                  <div className="space-y-2">
                    {selectedMaterials.map((material, index) => (
                      <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div className="flex-1">
                          <p className="text-sm font-medium text-gray-900">{material.material_name}</p>
                          <p className="text-xs text-gray-500">
                            {material.quantity_per_unit} {material.unit} per unit
                            {material.cost_per_unit && ` • Cost: ${formatCurrency(material.cost_per_unit)}/${material.unit}`}
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleMaterialRemove(material.material_id)}
                          className="ml-2 p-1 text-red-600 hover:text-red-800"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Documentation Section */}
          {activeSection === 'documentation' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Recipe Image URL</label>
                <input
                  type="url"
                  value={formData.recipe_image_url}
                  onChange={(e) => setFormData({ ...formData, recipe_image_url: e.target.value })}
                  className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500"
                  placeholder="https://example.com/recipe-image.jpg"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Instruction Manual URL</label>
                <input
                  type="url"
                  value={formData.instruction_manual_url}
                  onChange={(e) => setFormData({ ...formData, instruction_manual_url: e.target.value })}
                  className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500"
                  placeholder="https://example.com/manual.pdf"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700">Safety Instructions</label>
                <textarea
                  value={formData.safety_instructions}
                  onChange={(e) => setFormData({ ...formData, safety_instructions: e.target.value })}
                  className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500"
                  rows={4}
                  placeholder="Detailed safety instructions for handling materials and production process..."
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700">Testing Requirements</label>
                <textarea
                  value={formData.testing_requirements}
                  onChange={(e) => setFormData({ ...formData, testing_requirements: e.target.value })}
                  className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500"
                  rows={4}
                  placeholder="Testing procedures, quality checks, and compliance requirements..."
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700">Storage Requirements</label>
                <textarea
                  value={formData.storage_requirements}
                  onChange={(e) => setFormData({ ...formData, storage_requirements: e.target.value })}
                  className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500"
                  rows={4}
                  placeholder="Storage conditions, temperature requirements, and shelf life considerations..."
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700">Quality Checkpoints</label>
                <textarea
                  value={formData.quality_checkpoints}
                  onChange={(e) => setFormData({ ...formData, quality_checkpoints: e.target.value })}
                  className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500"
                  rows={4}
                  placeholder="Quality checkpoints, inspection points, and acceptance criteria..."
                />
              </div>
            </div>
          )}

          {/* Form Actions */}
          <div className="flex justify-between items-center pt-6 border-t border-gray-200">
            <div className="flex space-x-2">
              {activeSection !== 'basic' && (
                <button
                  type="button"
                  onClick={() => {
                    const currentIndex = sections.findIndex(s => s.id === activeSection);
                    if (currentIndex > 0) {
                      setActiveSection(sections[currentIndex - 1].id);
                    }
                  }}
                  className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  Previous
                </button>
              )}
            </div>

            <div className="flex space-x-3">
              {activeSection !== 'documentation' && (
                <button
                  type="button"
                  onClick={() => {
                    const currentIndex = sections.findIndex(s => s.id === activeSection);
                    if (currentIndex < sections.length - 1) {
                      setActiveSection(sections[currentIndex + 1].id);
                    }
                  }}
                  className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  Next
                </button>
              )}

              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isLoading}
                className="px-6 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 disabled:opacity-50"
              >
                {isLoading ? 'Creating...' : 'Create Recipe'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

const BatchModal = ({ onClose, onSubmit, recipes, isLoading, bulkPerfumesData, usersData, bulkPerfumesLoading, usersLoading, bulkPerfumesError, usersError }) => {
  const [formData, setFormData] = useState({
    recipe_id: '',
    bulk_perfume_id: '',
    quantity_planned: '',
    quantity_produced: '',
    quantity_defective: '0',
    production_date: new Date().toISOString().split('T')[0],
    operator_id: '',
    supervisor_id: '',
    profit_margin: '50.00',
    notes: ''
  });

  const [activeTab, setActiveTab] = useState('basic');
  const [selectedRecipe, setSelectedRecipe] = useState(null);
  const [showShortBarcodeGenerator, setShowShortBarcodeGenerator] = useState(false);

  // Data is now passed as props from parent component



  const bulkPerfumes = bulkPerfumesData?.perfumes || [];
  const users = usersData?.users || [];


  // Auto-calculate quantity_produced from quantity_planned if not set
  const handleQuantityPlannedChange = (value) => {
    setFormData(prev => ({
      ...prev,
      quantity_planned: value,
      quantity_produced: prev.quantity_produced || value
    }));
  };

  // Handle recipe selection
  const handleRecipeChange = (recipeId) => {
    const recipe = recipes.find(r => r.id === recipeId);
    setSelectedRecipe(recipe);

    setFormData(prev => ({
      ...prev,
      recipe_id: recipeId
    }));
  };

  // Handle bulk perfume selection
  const handleBulkPerfumeChange = (perfumeId) => {
    setFormData(prev => ({
      ...prev,
      bulk_perfume_id: perfumeId
    }));
  };





  const handleSubmit = (e) => {
    e.preventDefault();

    // Convert empty strings to null for optional fields
    const cleanedData = Object.fromEntries(
      Object.entries(formData).map(([key, value]) => [
        key,
        value === '' ? null : value
      ])
    );

    onSubmit(cleanedData);
  };

  const tabs = [
    { id: 'basic', name: 'Basic Info', icon: '📋' },
    { id: 'production', name: 'Production', icon: '⚙️' },
    { id: 'advanced', name: 'Advanced', icon: '🔧' }
  ];

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div className="relative top-10 mx-auto p-6 border w-11/12 max-w-4xl shadow-lg rounded-md bg-white">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-xl font-semibold text-gray-900"><TranslatedText text="Create Bottling Batch" /></h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex space-x-1 mb-6 bg-gray-100 p-1 rounded-lg">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 py-2 px-3 text-sm font-medium rounded-md transition-colors ${activeTab === tab.id
                  ? 'bg-white text-primary-600 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
                }`}
            >
              <span className="mr-2">{tab.icon}</span>
              {tab.name}
            </button>
          ))}
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Information Tab */}
          {activeTab === 'basic' && (
            <div className="space-y-6">
              <div className="bg-blue-50 p-4 rounded-lg">
                <h4 className="text-sm font-medium text-blue-900 mb-2">Recipe & Perfume Selection</h4>
                <p className="text-sm text-blue-700">Select a recipe and bulk perfume to create a new bottling batch. The system will automatically calculate costs and generate a unique batch number.</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Recipe Selection */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Recipe * <span className="text-red-500">*</span>
                  </label>
                  <select
                    required
                    value={formData.recipe_id}
                    onChange={(e) => handleRecipeChange(e.target.value)}
                    className="mt-1 block w-full border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-sm"
                  >
                    <option value="">Select a Recipe</option>
                    {recipes.map((recipe) => (
                      <option key={recipe.id} value={recipe.id}>
                        {recipe.name} ({recipe.size_ml}ml)
                      </option>
                    ))}
                  </select>

                  {selectedRecipe && (
                    <div className="mt-3 p-3 bg-green-50 rounded-lg border border-green-200">
                      <h5 className="text-sm font-medium text-green-800 mb-2">Selected Recipe Details</h5>
                      <div className="text-sm text-green-700 space-y-1">
                        <p><span className="font-medium">Size:</span> {selectedRecipe.size_ml}ml</p>
                        <p><span className="font-medium">Materials:</span> {selectedRecipe.materials?.length || 0} items</p>
                        {selectedRecipe.description && (
                          <p><span className="font-medium">Description:</span> {selectedRecipe.description}</p>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {/* Bulk Perfume Selection */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Bulk Perfume * <span className="text-red-500">*</span>
                  </label>
                  <select
                    required
                    value={formData.bulk_perfume_id}
                    onChange={(e) => handleBulkPerfumeChange(e.target.value)}
                    className="mt-1 block w-full border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-sm"
                    disabled={bulkPerfumesLoading}
                  >
                    <option value="">
                      {bulkPerfumesLoading ? 'Loading perfumes...' : 'Select Bulk Perfume'}
                    </option>
                    {bulkPerfumesLoading ? (
                      <option value="" disabled>Loading...</option>
                    ) : bulkPerfumesError ? (
                      <option value="" disabled>Error loading perfumes</option>
                    ) : bulkPerfumes.length === 0 ? (
                      <option value="" disabled>No perfumes available</option>
                    ) : (
                      bulkPerfumes.map((perfume) => {
                        return (
                          <option key={perfume.id} value={perfume.id}>
                            {perfume.name} - {perfume.bulk_quantity_liters}L available
                          </option>
                        );
                      })
                    )}
                  </select>

                  {/* Error Display */}
                  {bulkPerfumesError && (
                    <p className="mt-1 text-xs text-red-500">
                      Error loading perfumes: {bulkPerfumesError.message}
                    </p>
                  )}

                  {/* Loading/Status Display */}
                  {bulkPerfumesLoading && (
                    <p className="mt-1 text-xs text-gray-500">Loading bulk perfumes...</p>
                  )}

                  {!bulkPerfumesLoading && !bulkPerfumesError && bulkPerfumes.length > 0 && (
                    <p className="mt-1 text-xs text-gray-500">
                      {bulkPerfumes.length} perfumes available for selection
                    </p>
                  )}
                </div>

                {/* Short Barcode Generator */}
                {selectedRecipe && formData.bulk_perfume_id && (
                  <div className="col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Product Labeling
                    </label>
                    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <h5 className="text-sm font-medium text-yellow-800 mb-1">
                            Short Barcode for Labels
                          </h5>
                          <p className="text-xs text-yellow-700">
                            Generate a short barcode (8 characters) optimized for product labeling
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => setShowShortBarcodeGenerator(true)}
                          className="inline-flex items-center px-3 py-2 bg-yellow-600 text-white text-sm font-medium rounded-lg hover:bg-yellow-700 focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:ring-offset-2"
                        >
                          <Barcode className="h-4 w-4 mr-2" />
                          Generate Short Barcode
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>


            </div>
          )}

          {/* Production Tab */}
          {activeTab === 'production' && (
            <div className="space-y-6">
              <div className="bg-green-50 p-4 rounded-lg">
                <h4 className="text-sm font-medium text-green-900 mb-2">Production Planning</h4>
                <p className="text-sm text-green-700">Set production quantities, dates, and assign production staff. These details will be stored in the bottling_batches table.</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Quantity Planning */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Planned Quantity * <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    required
                    min="1"
                    value={formData.quantity_planned}
                    onChange={(e) => handleQuantityPlannedChange(e.target.value)}
                    className="mt-1 block w-full border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-sm"
                    placeholder="Number of bottles"
                  />
                  <p className="mt-1 text-xs text-gray-500">Target production quantity</p>
                </div>

                {/* Production Date */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Production Date
                  </label>
                  <input
                    type="date"
                    value={formData.production_date}
                    onChange={(e) => setFormData({ ...formData, production_date: e.target.value })}
                    className="mt-1 block w-full border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-sm"
                  />
                  <p className="mt-1 text-xs text-gray-500">When production will start</p>
                </div>


              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Operator Selection */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Production Operator
                  </label>
                  <select
                    value={formData.operator_id}
                    onChange={(e) => setFormData({ ...formData, operator_id: e.target.value })}
                    className="mt-1 block w-full border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-sm"
                    disabled={usersLoading}
                  >
                    <option value="">
                      {usersLoading ? 'Loading users...' : 'Select Operator'}
                    </option>
                    {usersLoading ? (
                      <option value="" disabled>Loading...</option>
                    ) : usersError ? (
                      <option value="" disabled>Error loading users</option>
                    ) : users.length === 0 ? (
                      <option value="" disabled>No users available</option>
                    ) : (
                      users.map((user) => (
                        <option key={user.id} value={user.id}>
                          {user.first_name} {user.last_name}
                        </option>
                      ))
                    )}
                  </select>
                  <p className="mt-1 text-xs text-gray-500">Primary production operator</p>
                </div>

                {/* Supervisor Selection */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Production Supervisor
                  </label>
                  <select
                    value={formData.supervisor_id}
                    onChange={(e) => setFormData({ ...formData, supervisor_id: e.target.value })}
                    className="mt-1 block w-full border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-sm"
                    disabled={usersLoading}
                  >
                    <option value="">
                      {usersLoading ? 'Loading users...' : 'Select Supervisor'}
                    </option>
                    {usersLoading ? (
                      <option value="" disabled>Loading...</option>
                    ) : usersError ? (
                      <option value="" disabled>Error loading users</option>
                    ) : users.length === 0 ? (
                      <option value="" disabled>No users available</option>
                    ) : (
                      users.map((user) => (
                        <option key={user.id} value={user.id}>
                          {user.first_name} {user.last_name}
                        </option>
                      ))
                    )}
                  </select>
                  <p className="mt-1 text-xs text-gray-500">Production supervisor</p>
                </div>
              </div>
            </div>
          )}



          {/* Advanced Tab */}
          {activeTab === 'advanced' && (
            <div className="space-y-6">
              <div className="bg-orange-50 p-4 rounded-lg">
                <h4 className="text-sm font-medium text-orange-900 mb-2">Advanced Configuration</h4>
                <p className="text-sm text-orange-700">Set production quantities and detailed notes. The system will calculate total cost, unit cost, and selling price automatically.</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Quantity Produced */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Quantity Produced
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={formData.quantity_produced}
                    onChange={(e) => setFormData({ ...formData, quantity_produced: e.target.value })}
                    className="mt-1 block w-full border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-sm"
                    placeholder="Actual quantity produced"
                  />
                  <p className="mt-1 text-xs text-gray-500">Leave empty to auto-fill from planned quantity</p>
                </div>

                {/* Quantity Defective */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Quantity Defective
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={formData.quantity_defective}
                    onChange={(e) => setFormData({ ...formData, quantity_defective: e.target.value })}
                    className="mt-1 block w-full border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-sm"
                    placeholder="Defective ML"
                  />
                  <p className="mt-1 text-xs text-gray-500">Number of defective ML (if known)</p>
                </div>

                {/* Profit Margin */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Profit Margin (%) *
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="1000"
                    step="0.01"
                    required
                    value={formData.profit_margin}
                    onChange={(e) => setFormData({ ...formData, profit_margin: e.target.value })}
                    className="mt-1 block w-full border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-sm"
                    placeholder="50.00"
                  />
                  <p className="mt-1 text-xs text-gray-500">Markup percentage for selling price calculation</p>
                </div>
              </div>

              {/* Profit Margin Preview */}
              {formData.profit_margin && formData.quantity_planned && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <h5 className="text-sm font-medium text-blue-900 mb-2">💰 Pricing Preview</h5>
                  <div className="text-sm text-blue-700 space-y-1">
                    <p><span className="font-medium">Profit Margin:</span> {formData.profit_margin}%</p>
                    <p><span className="font-medium">Markup Multiplier:</span> {((parseFloat(formData.profit_margin) || 0) / 100 + 1).toFixed(2)}x</p>
                    <p className="text-xs text-blue-600 mt-2">
                      💡 Example: If unit cost is 13,000 RWF, selling price will be {((parseFloat(formData.profit_margin) || 0) / 100 + 1) * 13000} RWF per bottle
                    </p>
                  </div>
                </div>
              )}

              {/* Production Notes */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Production Notes
                </label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  className="mt-1 block w-full border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-sm"
                  rows={4}
                  placeholder="Detailed production notes, special instructions, equipment requirements, or any other relevant information..."
                />
                <p className="mt-1 text-xs text-gray-500">Comprehensive notes for production team</p>
              </div>
            </div>
          )}

          {/* Form Actions */}
          <div className="flex justify-between items-center pt-6 border-t border-gray-200">
            <div className="flex space-x-2">
              {activeTab !== 'basic' && (
                <button
                  type="button"
                  onClick={() => {
                    const currentIndex = tabs.findIndex(t => t.id === activeTab);
                    if (currentIndex > 0) {
                      setActiveTab(tabs[currentIndex - 1].id);
                    }
                  }}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
                >
                  Previous
                </button>
              )}
            </div>

            <div className="flex space-x-3">
              {activeTab !== 'advanced' && (
                <button
                  type="button"
                  onClick={() => {
                    const currentIndex = tabs.findIndex(t => t.id === activeTab);
                    if (currentIndex < tabs.length - 1) {
                      setActiveTab(tabs[currentIndex + 1].id);
                    }
                  }}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
                >
                  Next
                </button>
              )}

              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isLoading}
                className="px-6 py-2 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-gradient-to-r from-primary-600 to-primary-700 hover:from-primary-700 hover:to-primary-800 focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? (
                  <span className="flex items-center">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Creating Batch...
                  </span>
                ) : (
                  'Create Bottling Batch'
                )}
              </button>
            </div>
          </div>
        </form>
      </div>

      {/* Short Barcode Generator Modal */}
      {showShortBarcodeGenerator && (
        <ShortBarcodeGenerator
          onGenerate={(barcode) => {
            toast.success(`Short barcode generated: ${barcode}`);
            setShowShortBarcodeGenerator(false);
          }}
          onClose={() => setShowShortBarcodeGenerator(false)}
          isOpen={showShortBarcodeGenerator}
          productName={selectedRecipe?.name || ''}
          sizeMl={selectedRecipe?.size_ml || 0}
        />
      )}
    </div>
  );
};

const BatchDetailsModal = ({ batch, onClose, formatCurrency }) => {
  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
        <div className="mt-3">
          <h3 className="text-lg font-medium text-gray-900 mb-4"><TranslatedText text="Batch Details" /></h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Batch Number</label>
              <p className="mt-1 text-sm text-gray-900">{batch.batch_number}</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Perfume</label>
              <p className="mt-1 text-sm text-gray-900">{batch.perfume_name}</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Size</label>
              <p className="mt-1 text-sm text-gray-900">{batch.size_ml}ml</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Quantity Produced</label>
              <p className="mt-1 text-sm text-gray-900">{batch.quantity_produced} bottles</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Total Cost</label>
              <p className="mt-1 text-sm text-gray-900">{formatCurrency(batch.total_cost)}</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Unit Cost</label>
              <p className="mt-1 text-sm text-gray-900">{formatCurrency(batch.unit_cost)}</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Profit Margin</label>
              <p className="mt-1 text-sm text-gray-900">{batch.profit_margin || 50}%</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Selling Price</label>
              <p className="mt-1 text-sm text-gray-900 font-semibold text-green-600">{formatCurrency(batch.selling_price)}</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Profit per Bottle</label>
              <p className="mt-1 text-sm text-gray-900 font-semibold text-green-600">
                {formatCurrency((batch.selling_price || 0) - (batch.unit_cost || 0))}
              </p>
            </div>

            <div className="flex justify-end">
              <button
                onClick={onClose}
                className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const RecipeDetailsModal = ({ recipe, onClose }) => {
  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
        <div className="mt-3">
          <h3 className="text-lg font-medium text-gray-900 mb-4"><TranslatedText text="Recipe Details" /></h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Name</label>
              <p className="mt-1 text-sm text-gray-900">{recipe.name}</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Description</label>
              <p className="mt-1 text-sm text-gray-900">{recipe.description}</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Bottle Size</label>
              <p className="mt-1 text-sm text-gray-900">{recipe.size_ml}ml</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Materials:</label>
              <ul className="list-disc list-inside text-sm text-gray-900">
                {recipe.materials?.map((material) => (
                  <li key={material.material_id}>
                    {material.material_name}: {material.quantity_per_unit} {material.unit}
                  </li>
                ))}
              </ul>
            </div>

            <div className="flex justify-end">
              <button
                onClick={onClose}
                className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// Bottle Sizes Tab Component
const BottleSizesTab = ({
  bottleSizes,
  searchTerm,
  viewMode,
  sortBy,
  sortOrder,
  selectedItems,
  setSelectedItems,
  onEdit,
  onDelete,
  formatCurrency,
  isLoading
}) => {
  // Filter bottle sizes based on search term
  const filteredBottleSizes = bottleSizes.filter(bottleSize => {
    if (!searchTerm) return true;
    const searchLower = searchTerm.toLowerCase();
    return (
      bottleSize?.size_ml?.toString().includes(searchLower) ||
      bottleSize?.bottle_cost?.toString().includes(searchLower) ||
      bottleSize?.label_cost?.toString().includes(searchLower) ||
      bottleSize?.packaging_cost?.toString().includes(searchLower) ||
      bottleSize?.labor_cost?.toString().includes(searchLower)
    );
  });

  // Sort bottle sizes
  const sortedBottleSizes = [...filteredBottleSizes].sort((a, b) => {
    let aValue = a?.[sortBy];
    let bValue = b?.[sortBy];

    if (typeof aValue === 'string') {
      aValue = aValue.toLowerCase();
      bValue = bValue.toLowerCase();
    }

    if (sortOrder === 'asc') {
      return aValue > bValue ? 1 : -1;
    } else {
      return aValue < bValue ? 1 : -1;
    }
  });

  const handleSelectItem = (id) => {
    const newSelected = new Set(selectedItems);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedItems(newSelected);
  };

  if (isLoading) {
    return (
      <div className="p-6 text-center">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <p className="mt-2 text-gray-600">Loading bottle sizes...</p>
      </div>
    );
  }

  return (
    <div className="p-6">
      {sortedBottleSizes.length === 0 ? (
        <div className="text-center py-12">
          <Box className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900"><TranslatedText text="No bottle sizes" /></h3>
          <p className="mt-1 text-sm text-gray-500">Get started by creating a new bottle size.</p>
        </div>
      ) : (
        <div className={`grid gap-4 ${viewMode === 'grid' ? 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3' : 'grid-cols-1'}`}>
          {sortedBottleSizes.map((bottleSize) => (
            <div
              key={bottleSize.id}
              className={`bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow ${selectedItems.has(bottleSize.id) ? 'ring-2 ring-blue-500' : ''
                }`}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    checked={selectedItems.has(bottleSize.id)}
                    onChange={() => handleSelectItem(bottleSize.id)}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <div className="ml-3">
                    <h3 className="text-lg font-medium text-gray-900">
                      {bottleSize.size_ml}ml
                    </h3>
                    <p className="text-sm text-gray-500">Bottle Size</p>
                  </div>
                </div>

                <div className="flex space-x-2">
                  <button
                    onClick={() => onEdit(bottleSize)}
                    className="text-blue-600 hover:text-blue-800"
                    title="Edit bottle size"
                  >
                    <Edit className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => onDelete(bottleSize)}
                    className="text-red-600 hover:text-red-800"
                    title="Delete bottle size"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>

              <div className="mt-4 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Bottle Cost:</span>
                  <span className="font-medium">{formatCurrency(bottleSize.bottle_cost)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Label Cost:</span>
                  <span className="font-medium">{formatCurrency(bottleSize.label_cost)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Packaging Cost:</span>
                  <span className="font-medium">{formatCurrency(bottleSize.packaging_cost)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Labor Cost:</span>
                  <span className="font-medium">{formatCurrency(bottleSize.labor_cost)}</span>
                </div>
                <div className="border-t pt-2 mt-2">
                  <div className="flex justify-between text-sm font-medium">
                    <span className="text-gray-900">Total Cost:</span>
                    <span className="text-blue-600">
                      {formatCurrency(
                        (bottleSize.bottle_cost || 0) +
                        (bottleSize.label_cost || 0) +
                        (bottleSize.packaging_cost || 0) +
                        (bottleSize.labor_cost || 0),
                        'RWF'
                      )}
                    </span>
                  </div>
                </div>
              </div>

              <div className="mt-3 text-xs text-gray-400">
                Created: {new Date(bottleSize.created_at).toLocaleDateString()}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// Bottle Size Modal Component
const BottleSizeModal = ({ onClose, onSubmit, bottleSize, isLoading, formatCurrency }) => {
  const [formData, setFormData] = useState({
    size_ml: bottleSize?.size_ml || '',
    bottle_cost: bottleSize?.bottle_cost || '',
    label_cost: bottleSize?.label_cost || '',
    packaging_cost: bottleSize?.packaging_cost || '',
    quantity: bottleSize?.quantity || 0
  });

  const [errors, setErrors] = useState({});

  const handleSubmit = (e) => {
    e.preventDefault();

    // Validation
    const newErrors = {};
    if (!formData.size_ml || formData.size_ml <= 0) {
      newErrors.size_ml = 'Size in ml is required and must be greater than 0';
    }
    if (!formData.bottle_cost || formData.bottle_cost < 0) {
      newErrors.bottle_cost = 'Bottle cost is required and must be 0 or greater';
    }
    if (formData.label_cost < 0) {
      newErrors.label_cost = 'Label cost must be 0 or greater';
    }
    if (formData.packaging_cost < 0) {
      newErrors.packaging_cost = 'Packaging cost must be 0 or greater';
    }
    if (formData.quantity < 0) {
      newErrors.quantity = 'Quantity must be 0 or greater';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setErrors({});
    onSubmit(formData);
  };

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div className="relative top-10 mx-auto p-6 border w-11/12 max-w-2xl shadow-lg rounded-md bg-white">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-xl font-semibold text-gray-900">
            {bottleSize ? 'Edit Bottle Size' : 'Add New Bottle Size'}
          </h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Size in ml */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Size in ml *
              </label>
              <input
                type="number"
                min="1"
                step="1"
                value={formData.size_ml}
                onChange={(e) => handleInputChange('size_ml', parseFloat(e.target.value) || '')}
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${errors.size_ml ? 'border-red-500' : 'border-gray-300'
                  }`}
                placeholder="e.g., 50"
                required
              />
              {errors.size_ml && (
                <p className="mt-1 text-sm text-red-600">{errors.size_ml}</p>
              )}
            </div>

            {/* Bottle Cost */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Bottle Cost (RWF) *
              </label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={formData.bottle_cost}
                onChange={(e) => handleInputChange('bottle_cost', parseFloat(e.target.value) || '')}
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${errors.bottle_cost ? 'border-red-500' : 'border-gray-300'
                  }`}
                placeholder="e.g., 2500"
                required
              />
              {errors.bottle_cost && (
                <p className="mt-1 text-sm text-red-600">{errors.bottle_cost}</p>
              )}
            </div>

            {/* Label Cost */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Label Cost (RWF)
              </label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={formData.label_cost}
                onChange={(e) => handleInputChange('label_cost', parseFloat(e.target.value) || '')}
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${errors.label_cost ? 'border-red-500' : 'border-gray-300'
                  }`}
                placeholder="e.g., 500"
              />
              {errors.label_cost && (
                <p className="mt-1 text-sm text-red-600">{errors.label_cost}</p>
              )}
            </div>

            {/* Packaging Cost */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Packaging Cost (RWF)
              </label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={formData.packaging_cost}
                onChange={(e) => handleInputChange('packaging_cost', parseFloat(e.target.value) || '')}
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${errors.packaging_cost ? 'border-red-500' : 'border-gray-300'
                  }`}
                placeholder="e.g., 1000"
              />
              {errors.packaging_cost && (
                <p className="mt-1 text-sm text-red-600">{errors.packaging_cost}</p>
              )}
            </div>

            {/* Quantity */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Quantity (Stock) *
              </label>
              <input
                type="number"
                min="0"
                step="1"
                value={formData.quantity}
                onChange={(e) => handleInputChange('quantity', parseInt(e.target.value) || 0)}
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${errors.quantity ? 'border-red-500' : 'border-gray-300'
                  }`}
                placeholder="e.g., 100"
                required
              />
              {errors.quantity && (
                <p className="mt-1 text-sm text-red-600">{errors.quantity}</p>
              )}
              <p className="mt-1 text-xs text-gray-500">Number of bottles in stock for this size</p>
            </div>
          </div>

          {/* Total Cost Preview */}
          <div className="bg-blue-50 p-4 rounded-lg">
            <h4 className="text-sm font-medium text-blue-900 mb-2">Total Cost Preview</h4>
            <div className="text-lg font-semibold text-blue-700">
              {formatCurrency((formData.bottle_cost || 0) +
                (formData.label_cost || 0) +
                (formData.packaging_cost || 0))}
            </div>
          </div>

          {/* Form Actions */}
          <div className="flex justify-end space-x-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <div className="flex items-center">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  {bottleSize ? 'Updating...' : 'Creating...'}
                </div>
              ) : (
                bottleSize ? 'Update Bottle Size' : 'Create Bottle Size'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default SmartBottling; 