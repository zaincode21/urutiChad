import React, { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Plus,
  Search,
  Filter,
  Edit,
  Trash2,
  Eye,
  Copy,
  Barcode,
  AlertCircle,
  RefreshCw,
  EyeOff,
  Package,
  Brain,
  Download,
  Upload,
  X,
  Scan,
  ArrowUp,
  ArrowDown,
  Grid3X3,
  List,
  Table,
  CheckCircle,
  Archive,
  Store,
  Save,
  XCircle
} from 'lucide-react';
import { api } from '../lib/api';
import toast from 'react-hot-toast';
import CurrencyInput from '../components/CurrencyInput';
import BarcodeGenerator from '../components/BarcodeGenerator';
import BarcodeDisplay from '../components/BarcodeDisplay';
import BarcodeScanner from '../components/BarcodeScanner';
import ProductIntelligence from '../components/ProductIntelligence';
import { productsAPI, categoriesAPI, brandsAPI, shopsAPI, inventoryAPI } from '../lib/api';
import TranslatedText from '../components/TranslatedText';
import { useTranslation } from '../hooks/useTranslation';

import { formatCurrency } from '../lib/formatters';

const Products = () => {
  const { tSync } = useTranslation();
  const [searchInput, setSearchInput] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedProductType, setSelectedProductType] = useState('all');
  const [selectedSize, setSelectedSize] = useState('all');
  const [stockFilter, setStockFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [priceRange, setPriceRange] = useState({ min: '', max: '' });
  const [viewMode, setViewMode] = useState('grid');
  const [sortBy, setSortBy] = useState('name');
  const [sortOrder, setSortOrder] = useState('asc');
  const [selectedItems, setSelectedItems] = useState(new Set());
  const [showBulkActions, setShowBulkActions] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [showNewProductForm, setShowNewProductForm] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(12);
  const [showQuickView, setShowQuickView] = useState(null);
  const [showBarcodeScanner, setShowBarcodeScanner] = useState(false);
  const [showBarcodeGenerator, setShowBarcodeGenerator] = useState(false);
  const [selectedProductForBarcode, setSelectedProductForBarcode] = useState(null);
  const [showIntelligence, setShowIntelligence] = useState(false);
  const [selectedProductForIntelligence, setSelectedProductForIntelligence] = useState(null);
  const [isGeneratingAllBarcodes, setIsGeneratingAllBarcodes] = useState(false);
  const [showBulkAssignModal, setShowBulkAssignModal] = useState(false);
  const [bulkAssignForm, setBulkAssignForm] = useState({
    shop_id: '',
    default_quantity: 0,
    min_stock_level: 10,
    max_stock_level: 100,
    update_existing: false
  });
  const [isAssigning, setIsAssigning] = useState(false);
  const [showBulkUnassignModal, setShowBulkUnassignModal] = useState(false);
  const [unassignShopId, setUnassignShopId] = useState('');
  const [isUnassigning, setIsUnassigning] = useState(false);
  const [editingQuantity, setEditingQuantity] = useState(null);
  const [quantityValue, setQuantityValue] = useState('');
  const searchInputRef = useRef(null);
  const cursorPositionRef = useRef(null);
  const wasFocusedRef = useRef(false);

  const queryClient = useQueryClient();

  // Debounce search input to prevent losing focus and reduce API calls
  useEffect(() => {
    const timer = setTimeout(() => {
      setSearchTerm(searchInput);
      setCurrentPage(1); // Reset to first page when search changes
    }, 300); // 300ms delay

    return () => clearTimeout(timer);
  }, [searchInput]);

  // Restore focus and cursor position after re-render if input was focused
  useEffect(() => {
    if (wasFocusedRef.current && searchInputRef.current) {
      const position = cursorPositionRef.current ?? searchInput.length;
      searchInputRef.current.focus();
      setTimeout(() => {
        if (searchInputRef.current) {
          searchInputRef.current.setSelectionRange(position, position);
        }
      }, 0);
    }
  });

  // Fetch products with pagination and filters
  const { data: productsData, isLoading, error } = useQuery({
    queryKey: ['products', currentPage, itemsPerPage, searchTerm, selectedCategory, selectedProductType, selectedSize, stockFilter, statusFilter, priceRange.min, priceRange.max, sortBy, sortOrder],
    queryFn: () => productsAPI.getAll({
      page: currentPage,
      limit: itemsPerPage,
      search: searchTerm || undefined,
      category: selectedCategory !== 'all' ? selectedCategory : undefined,
      product_type: selectedProductType !== 'all' ? selectedProductType : undefined,
      size: selectedSize !== 'all' ? selectedSize : undefined,
      in_stock: stockFilter !== 'all' ? stockFilter : undefined,
      status: statusFilter !== 'all' ? statusFilter : undefined,
      min_price: priceRange.min || undefined,
      max_price: priceRange.max || undefined,
      sortBy,
      sortOrder
    }).then(res => res.data),
    keepPreviousData: true, // Keep previous data while loading to prevent flickering
  });

  // Fetch categories for filter
  const { data: categoriesData } = useQuery({
    queryKey: ['categories'],
    queryFn: () => categoriesAPI.getAll().then(res => res.data),
  });

  // Fetch brands for filter
  const { data: brandsData } = useQuery({
    queryKey: ['brands'],
    queryFn: () => brandsAPI.getAll().then(res => res.data),
  });

  // Fetch shops for bulk assignment
  const { data: shopsData } = useQuery({
    queryKey: ['shops'],
    queryFn: () => shopsAPI.getAll().then(res => res.data),
  });

  const products = productsData?.products || [];
  const pagination = productsData?.pagination || {};
  const totalProducts = pagination.total || 0;
  const totalPages = pagination.totalPages || Math.ceil(totalProducts / itemsPerPage);
  const categories = categoriesData?.flat || [];
  const brands = brandsData?.brands || [];
  const shops = shopsData?.shops || [];

  // Mutations
  const createProductMutation = useMutation({
    mutationFn: (data) => productsAPI.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries(['products']);
      setShowNewProductForm(false);
      toast.success('Product created successfully!');
    },
    onError: (error) => {
      toast.error(error.response?.data?.error || 'Failed to create product');
    }
  });

  const updateProductMutation = useMutation({
    mutationFn: ({ id, data }) => api.put(`/products/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['products']);
      setEditingProduct(null);
      setEditingProduct(null);
      toast.success('Product updated successfully!');
    },
    onError: (error) => {
      console.error('Product update error:', error);
      console.error('Error response:', error.response?.data);
      console.error('Validation errors:', JSON.stringify(error.response?.data?.errors, null, 2));
      const errorMsg = error.response?.data?.errors?.[0]?.msg ||
        error.response?.data?.error ||
        'Failed to update product';
      toast.error(errorMsg);
    }
  });

  const deleteProductMutation = useMutation({
    mutationFn: (id) => api.delete(`/products/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries(['products']);
      toast.success('Product deleted successfully!');
    },
    onError: (error) => {
      toast.error(error.response?.data?.error || 'Failed to delete product');
    }
  });

  const toggleProductStatusMutation = useMutation({
    mutationFn: ({ id, isActive }) => api.patch(`/products/${id}/status`, { isActive }),
    onSuccess: () => {
      queryClient.invalidateQueries(['products']);
      toast.success('Status updated successfully!');
    },
    onError: (error) => {
      toast.error(error.response?.data?.error || 'Failed to update product status');
    }
  });

  const duplicateProductMutation = useMutation({
    mutationFn: (id) => api.post(`/products/${id}/duplicate`),
    onSuccess: () => {
      queryClient.invalidateQueries(['products']);
      toast.success('Product duplicated successfully!');
    },
    onError: (error) => {
      toast.error(error.response?.data?.error || 'Failed to duplicate product');
    }
  });


  const generateAllBarcodesMutation = useMutation({
    mutationFn: async () => {
      // Fetch ALL products from the database, not just the paginated ones
      const allProductsResponse = await productsAPI.getAll({
        page: 1,
        limit: 10000, // Large number to get all products
        include_all: 'true' // Bypass any shop filtering
      });

      const allProducts = allProductsResponse.data.products || [];
      console.log(`Found ${allProducts.length} total products`);

      // Filter products that need barcode processing (have SKU and either no barcode or need 6-digit barcode)
      const productsToUpdate = allProducts.filter(product =>
        product.sku &&
        product.sku.trim() !== '' &&
        (!product.barcode || product.barcode.trim() === '' || product.barcode.length !== 6)
      );

      console.log(`Found ${productsToUpdate.length} products that need barcodes`);

      if (productsToUpdate.length === 0) {
        throw new Error('No products found that need barcodes');
      }

      // Process products in batches to avoid overwhelming the server
      const batchSize = 5; // Smaller batch size for better reliability
      const batches = [];
      for (let i = 0; i < productsToUpdate.length; i += batchSize) {
        batches.push(productsToUpdate.slice(i, i + batchSize));
      }

      let successCount = 0;
      let errorCount = 0;
      const errors = [];

      for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
        const batch = batches[batchIndex];
        console.log(`Processing batch ${batchIndex + 1}/${batches.length} (${batch.length} products)`);

        const batchPromises = batch.map(async (product) => {
          try {
            // Use existing 6-digit barcode if it exists, otherwise generate a new 6-digit one
            let newBarcode;

            if (product.barcode && product.barcode.trim() !== '' && product.barcode.length === 6) {
              // Use existing 6-digit barcode
              newBarcode = product.barcode.trim();
              console.log(`Using existing barcode for ${product.name}: ${newBarcode}`);
            } else {
              // Generate new 6-digit barcode
              newBarcode = Math.floor(Math.random() * 900000) + 100000; // 100000-999999
              console.log(`Generating new 6-digit barcode for ${product.name}: ${newBarcode}`);
            }

            // Update the product with the barcode
            await api.patch(`/products/${product.id}`, { barcode: newBarcode.toString() });

            successCount++;
            return { success: true, productId: product.id, barcode: newBarcode.toString() };
          } catch (error) {
            errorCount++;
            const errorMsg = `Failed to update barcode for product ${product.name} (${product.id}): ${error.message}`;
            console.error(errorMsg);
            errors.push(errorMsg);
            return { success: false, productId: product.id, error: error.message };
          }
        });

        await Promise.all(batchPromises);

        // Progress update
        const progress = Math.round(((batchIndex + 1) / batches.length) * 100);
        toast.success(`Progress: ${progress}% - Generated ${successCount} barcodes so far`);

        // Small delay between batches to avoid overwhelming the server
        if (batchIndex < batches.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 500)); // 500ms delay
        }
      }

      return {
        successCount,
        errorCount,
        totalProcessed: productsToUpdate.length,
        errors: errors.slice(0, 10) // Limit error messages
      };
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries(['products']);
      setIsGeneratingAllBarcodes(false);

      if (result.errorCount === 0) {
        toast.success(`✅ Successfully generated barcodes for all ${result.successCount} products!`);
      } else {
        toast.success(`✅ Generated barcodes for ${result.successCount} products. ${result.errorCount} failed.`);
        if (result.errors.length > 0) {
          console.error('Errors:', result.errors);
        }
      }
    },
    onError: (error) => {
      setIsGeneratingAllBarcodes(false);
      toast.error(error.message || 'Failed to generate barcodes');
      console.error('Generate all barcodes error:', error);
    }
  });

  const updateProductBarcodeMutation = useMutation({
    mutationFn: ({ id, barcode }) => api.patch(`/products/${id}`, { barcode }),
    onSuccess: () => {
      queryClient.invalidateQueries(['products']);
      setShowBarcodeGenerator(false);
      setSelectedProductForBarcode(null);
      setShowBarcodeGenerator(false);
      setSelectedProductForBarcode(null);
      toast.success('Barcode generated successfully!');
    },
    onError: (error) => {
      toast.error(error.response?.data?.error || 'Failed to update product barcode');
    }
  });

  const bulkAssignToShopMutation = useMutation({
    mutationFn: (data) => productsAPI.assignAllToShop(data),
    onSuccess: (response) => {
      queryClient.invalidateQueries(['products']);
      setIsAssigning(false);
      setShowBulkAssignModal(false);
      const stats = response.data.stats;
      toast.success(
        `✅ Bulk assignment completed! ${stats.assigned} assigned, ${stats.updated} updated, ${stats.skipped} skipped${stats.failed > 0 ? `, ${stats.failed} failed` : ''}`,
        { duration: 5000 }
      );
      // Reset form
      setBulkAssignForm({
        shop_id: '',
        default_quantity: 0,
        min_stock_level: 10,
        max_stock_level: 100,
        update_existing: false
      });
    },
    onError: (error) => {
      setIsAssigning(false);
      toast.error(error.response?.data?.error || 'Failed to assign products to shop');
    }
  });

  const bulkUnassignFromShopMutation = useMutation({
    mutationFn: (data) => productsAPI.unassignAllFromShop(data),
    onSuccess: (response) => {
      queryClient.invalidateQueries(['products']);
      setIsUnassigning(false);
      setShowBulkUnassignModal(false);
      const stats = response.data.stats;
      toast.success(
        `✅ Bulk unassignment completed! ${stats.total_unassigned} products unassigned${stats.failed > 0 ? `. ${stats.failed} failed` : ''}`,
        { duration: 5000 }
      );
      // Reset form
      setUnassignShopId('');
    },
    onError: (error) => {
      setIsUnassigning(false);
      toast.error(error.response?.data?.error || 'Failed to unassign products from shop');
    }
  });

  const updateShopQuantityMutation = useMutation({
    mutationFn: (data) => inventoryAPI.updateShopProductQuantity(data),
    onSuccess: () => {
      queryClient.invalidateQueries(['products']);
      setEditingQuantity(null);
      setQuantityValue('');
      toast.success('Product quantity updated successfully!');
    },
    onError: (error) => {
      toast.error(error.response?.data?.error || 'Failed to update product quantity');
    }
  });

  const handleEditQuantity = (product) => {
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    const isCashier = user.role === 'cashier';
    // For cashiers, backend sets stock_quantity to shop_quantity, so use stock_quantity
    const currentQuantity = product.stock_quantity || 0;
    setEditingQuantity(product.id);
    setQuantityValue(currentQuantity.toString());
  };

  const handleSaveQuantity = (productId) => {
    const quantity = parseInt(quantityValue);
    if (isNaN(quantity) || quantity < 0) {
      toast.error('Please enter a valid quantity');
      return;
    }
    updateShopQuantityMutation.mutate({ product_id: productId, quantity });
  };

  const handleCancelEditQuantity = () => {
    setEditingQuantity(null);
    setQuantityValue('');
  };

  // Helper functions
  const toggleSelection = (id) => {
    const newSelected = new Set(selectedItems);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedItems(newSelected);
    setShowBulkActions(newSelected.size > 0);
  };

  const selectAll = () => {
    const allIds = products.map(product => product.id);
    setSelectedItems(new Set(allIds));
    setShowBulkActions(true);
  };

  const clearSelection = () => {
    setSelectedItems(new Set());
    setShowBulkActions(false);
  };

  const handleBulkDelete = () => {
    if (selectedItems.size === 0) return;

    if (confirm(`Are you sure you want to delete ${selectedItems.size} products? This action cannot be undone.`)) {
      Promise.all(Array.from(selectedItems).map(id => deleteProductMutation.mutateAsync(id)))
        .then(() => {
          clearSelection();
          clearSelection();
          toast.success('Products deleted successfully!');
        })
        .catch(() => {
          toast.error('Some products could not be deleted');
        });
    }
  };

  const handleBulkStatusToggle = (isActive) => {
    if (selectedItems.size === 0) return;

    Promise.all(Array.from(selectedItems).map(id => toggleProductStatusMutation.mutateAsync({ id, isActive })))
      .then(() => {
        clearSelection();
        toast.success(`${selectedItems.size} products ${isActive ? 'activated' : 'deactivated'} successfully!`);
      })
      .catch(() => {
        toast.error('Some products could not be updated');
      });
  };

  const getStockStatus = (product) => {
    // Get user role from localStorage or context
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    const isAdmin = user.role === 'admin';
    const isManager = user.role === 'manager';
    const isCashier = user.role === 'cashier';

    let displayQuantity, displayMinStock, isShopSpecific, stockLabel;

    if (isAdmin || isManager) {
      // Admin and Manager see global/total quantity
      displayQuantity = product.global_quantity || product.stock_quantity || 0;
      displayMinStock = product.global_min_stock || product.min_stock_level || 0;
      isShopSpecific = false;
      stockLabel = 'Global Stock';
    } else if (isCashier) {
      // Cashier sees shop-specific quantity (backend sets stock_quantity to shop_quantity for cashiers)
      displayQuantity = product.stock_quantity || 0;
      displayMinStock = product.min_stock_level || 0;
      isShopSpecific = true;
      stockLabel = 'Shop Stock';
    } else {
      // Default fallback
      displayQuantity = product.stock_quantity || 0;
      displayMinStock = product.min_stock_level || 0;
      isShopSpecific = false;
      stockLabel = 'Stock';
    }

    if (displayQuantity === 0) return {
      status: 'out',
      color: 'red',
      text: 'Rupture de Stock',
      bgColor: 'bg-red-100',
      textColor: 'text-red-800',
      quantity: displayQuantity,
      isShopSpecific,
      stockLabel,
      // For admin, also show shop distribution info
      ...(isAdmin && {
        totalShopQuantity: product.total_shop_quantity || 0,
        shopsWithProduct: product.shops_with_product || 0,
        availableForAssignment: product.available_for_assignment
      })
    };

    if (displayQuantity <= displayMinStock) return {
      status: 'low',
      color: 'yellow',
      text: 'Low Stock',
      bgColor: 'bg-yellow-100',
      textColor: 'text-yellow-800',
      quantity: displayQuantity,
      isShopSpecific,
      stockLabel,
      ...(isAdmin && {
        totalShopQuantity: product.total_shop_quantity || 0,
        shopsWithProduct: product.shops_with_product || 0,
        availableForAssignment: product.available_for_assignment
      })
    };

    return {
      status: 'in',
      color: 'green',
      text: 'In Stock',
      bgColor: 'bg-green-100',
      textColor: 'text-green-800',
      quantity: displayQuantity,
      isShopSpecific,
      stockLabel,
      ...(isAdmin && {
        totalShopQuantity: product.total_shop_quantity || 0,
        shopsWithProduct: product.shops_with_product || 0,
        availableForAssignment: product.available_for_assignment
      })
    };
  };



  const getCategoryNames = (product) => {
    if (!product.categories || product.categories.length === 0) return 'Uncategorized';
    return product.categories.map(cat => cat.category_name || cat.name).join(', ');
  };

  const clearAllFilters = () => {
    setSearchInput('');
    setSearchTerm('');
    setSelectedCategory('all');
    setSelectedProductType('all');
    setSelectedSize('all');
    setStockFilter('all');
    setStatusFilter('all');
    setPriceRange({ min: '', max: '' });
    setCurrentPage(1);
  };

  const handleGenerateBarcode = (product) => {
    setSelectedProductForBarcode(product);
    setShowBarcodeGenerator(true);
  };

  const handleViewBarcode = (product) => {
    // Open the same modal but in view mode with the existing barcode value
    setSelectedProductForBarcode(product);
    setShowBarcodeGenerator(true);
  };

  const handleBarcodeGenerated = (barcode) => {
    if (selectedProductForBarcode) {
      updateProductBarcodeMutation.mutate({
        id: selectedProductForBarcode.id,
        barcode: barcode
      });
    }
  };

  const handleShowIntelligence = (product) => {
    setSelectedProductForIntelligence(product);
    setShowIntelligence(true);
  };

  const handleGenerateAllBarcodes = async () => {
    try {
      // First, fetch all products to get the accurate count
      const allProductsResponse = await productsAPI.getAll({
        page: 1,
        limit: 10000,
        include_all: 'true'
      });

      const allProducts = allProductsResponse.data.products || [];
      const productsNeedingBarcodes = allProducts.filter(product =>
        product.sku &&
        product.sku.trim() !== '' &&
        (!product.barcode || product.barcode.trim() === '' || product.barcode.length !== 6)
      );

      console.log(`Total products: ${allProducts.length}`);
      console.log(`Products needing barcodes: ${productsNeedingBarcodes.length}`);

      if (productsNeedingBarcodes.length === 0) {
        toast.error('No products found that need barcodes. All products already have barcodes.');
        return;
      }

      if (confirm(`Generate barcodes for ${productsNeedingBarcodes.length} products? This may take a few moments.`)) {
        setIsGeneratingAllBarcodes(true);
        generateAllBarcodesMutation.mutate();
      }
    } catch (error) {
      toast.error('Failed to fetch products count');
      console.error('Error fetching products:', error);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-3 text-gray-600">Loading products...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-gray-900 mb-2">Error Loading Products</h3>
        <p className="text-gray-600 mb-4">{error.message}</p>
        <button
          onClick={() => queryClient.invalidateQueries(['products'])}
          className="inline-flex items-center px-4 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700"
        >
          <RefreshCw className="h-4 w-4 mr-2" />
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
            <TranslatedText text="Products" />
          </h1>
          <p className="text-sm sm:text-base text-gray-600 mt-1 sm:mt-2">
            <TranslatedText text="Manage your product inventory and catalog" />
          </p>
          {(() => {
            const user = JSON.parse(localStorage.getItem('user') || '{}');
            const isAdmin = user.role === 'admin';
            return (
              <div className="mt-2">
                <span className={`inline-flex items-center px-2 py-1 text-xs font-medium rounded-full ${isAdmin
                  ? 'bg-purple-100 text-purple-800'
                  : 'bg-blue-100 text-blue-800'
                  }`}>
                  {isAdmin ? (
                    <TranslatedText text="Global View" />
                  ) : (
                    <TranslatedText text="Shop View" />
                  )}
                </span>
              </div>
            );
          })()}
        </div>
        <div className="flex items-center space-x-3">
          {(() => {
            const user = JSON.parse(localStorage.getItem('user') || '{}');
            const isAdmin = user?.role === 'admin';
            const canGenerateBarcodes = user?.role === 'admin' || user?.role === 'manager';
            return (
              <>
                {/* Assign All to Shop and Unassign All from Shop buttons hidden */}
                {canGenerateBarcodes && (
                  <button
                    onClick={handleGenerateAllBarcodes}
                    disabled={isGeneratingAllBarcodes}
                    className="inline-flex items-center px-4 py-2 bg-orange-600 text-white font-medium rounded-lg hover:bg-orange-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isGeneratingAllBarcodes ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        Generating...
                      </>
                    ) : (
                      <>
                        <RefreshCw className="h-4 w-4 mr-2" />
                        <TranslatedText text="Generate Barcodes" />
                      </>
                    )}
                  </button>
                )}
              </>
            );
          })()}
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="inline-flex items-center px-3 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            <Filter className="h-4 w-4 mr-2" />
            <TranslatedText text="Filters" />
          </button>
          <button
            onClick={() => setShowNewProductForm(true)}
            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
          >
            <Plus className="h-4 w-4 mr-2" />
            <TranslatedText text="Add Product" />
          </button>
        </div>
      </div>

      {/* Advanced Filters */}
      {showFilters && (
        <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">
              <TranslatedText text="Advanced Filters" />
            </h3>
            <button
              onClick={clearAllFilters}
              className="text-sm text-blue-600 hover:text-blue-800 font-medium"
            >
              <TranslatedText text="Clear All" />
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <TranslatedText text="Category" />
              </label>
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="all">
                  <TranslatedText text="All Categories" />
                </option>
                {categories.map(category => (
                  <option key={category.id} value={category.id}>
                    {'—'.repeat(category.level)} {category.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <TranslatedText text="Product Type" />
              </label>
              <select
                value={selectedProductType}
                onChange={(e) => {
                  setSelectedProductType(e.target.value);
                  if (e.target.value !== 'perfume') {
                    setSelectedSize('all');
                  }
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="all">
                  <TranslatedText text="All Types" />
                </option>
                <option value="general">General</option>
                <option value="perfume">Perfume</option>
                <option value="clothing">Clothing</option>
                <option value="shoes">Shoes</option>
                <option value="accessory">Accessory</option>
              </select>
            </div>

            {selectedProductType === 'perfume' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <TranslatedText text="Size" />
                </label>
                <select
                  value={selectedSize}
                  onChange={(e) => setSelectedSize(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="all">
                    <TranslatedText text="All Sizes" />
                  </option>
                  <option value="30ml">30ml</option>
                  <option value="50ml">50ml</option>
                  <option value="100ml">100ml</option>
                </select>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <TranslatedText text="Stock Status" />
              </label>
              <select
                value={stockFilter}
                onChange={(e) => setStockFilter(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="all">
                  <TranslatedText text="All" />
                </option>
                <option value="in">
                  <TranslatedText text="In Stock" />
                </option>
                <option value="low">
                  <TranslatedText text="Low Stock" />
                </option>
                <option value="out">
                  <TranslatedText text="Out of Stock" />
                </option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <TranslatedText text="Status" />
              </label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="all">
                  <TranslatedText text="All" />
                </option>
                <option value="active">
                  <TranslatedText text="Active" />
                </option>
                <option value="inactive">
                  <TranslatedText text="Inactive" />
                </option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <TranslatedText text="Price Range" />
              </label>
              <div className="flex space-x-2">
                <input
                  type="number"
                  placeholder="Min price"
                  value={priceRange.min}
                  onChange={(e) => setPriceRange({ ...priceRange, min: e.target.value })}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
                <span className="flex items-center text-gray-500">to</span>
                <input
                  type="number"
                  placeholder="Max price"
                  value={priceRange.max}
                  onChange={(e) => setPriceRange({ ...priceRange, max: e.target.value })}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Toolbar */}
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-4 flex-1">
            <div className="relative flex-1 min-w-[300px]">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                ref={searchInputRef}
                type="text"
                placeholder="Search products..."
                value={searchInput}
                onChange={(e) => {
                  const cursorPosition = e.target.selectionStart;
                  cursorPositionRef.current = cursorPosition;
                  wasFocusedRef.current = true;
                  setSearchInput(e.target.value);
                }}
                onFocus={() => {
                  wasFocusedRef.current = true;
                }}
                onBlur={() => {
                  wasFocusedRef.current = false;
                }}
                onKeyDown={(e) => {
                  cursorPositionRef.current = e.target.selectionStart;
                }}
                onMouseUp={(e) => {
                  cursorPositionRef.current = e.target.selectionStart;
                }}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <span className="text-sm text-gray-600 whitespace-nowrap">
              {totalProducts} products found
            </span>
          </div>

          <div className="flex items-center gap-2">
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="name">Sort by Name</option>
              <option value="price">Sort by Price</option>
              <option value="stock">Sort by Stock</option>
              <option value="created_at">Sort by Date</option>
            </select>

            <button
              onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
              className="p-2 border border-gray-300 rounded-lg hover:bg-gray-50"
              title={`Sort ${sortOrder === 'asc' ? 'Descending' : 'Ascending'}`}
            >
              {sortOrder === 'asc' ? <ArrowUp className="h-4 w-4" /> : <ArrowDown className="h-4 w-4" />}
            </button>

            <div className="flex items-center bg-gray-100 rounded-lg p-1">
              <button
                onClick={() => setViewMode('grid')}
                className={`p-2 rounded ${viewMode === 'grid' ? 'bg-white shadow-sm' : 'hover:bg-gray-200'}`}
                title="Grid View"
              >
                <Grid3X3 className="h-4 w-4" />
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`p-2 rounded ${viewMode === 'list' ? 'bg-white shadow-sm' : 'hover:bg-gray-200'}`}
                title="List View"
              >
                <List className="h-4 w-4" />
              </button>
              <button
                onClick={() => setViewMode('table')}
                className={`p-2 rounded ${viewMode === 'table' ? 'bg-white shadow-sm' : 'hover:bg-gray-200'}`}
                title="Table View"
              >
                <Table className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Bulk Actions */}
      {showBulkActions && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <span className="text-sm font-medium text-blue-900">
                {selectedItems.size} products selected
              </span>
              <button
                onClick={selectAll}
                className="text-sm text-blue-600 hover:text-blue-800"
              >
                <TranslatedText text="All" />
              </button>
              <button
                onClick={clearSelection}
                className="text-sm text-blue-600 hover:text-blue-800"
              >
                Clear Selection
              </button>
            </div>
            <div className="flex items-center space-x-2">
              <button
                onClick={() => handleBulkStatusToggle(true)}
                className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
              >
                <CheckCircle className="h-4 w-4 mr-2" />
                <TranslatedText text="Activate" />
              </button>
              <button
                onClick={() => handleBulkStatusToggle(false)}
                className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-yellow-600 hover:bg-yellow-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-yellow-500"
              >
                <Archive className="h-4 w-4 mr-2" />
                <TranslatedText text="Deactivate" />
              </button>
              {(() => {
                const user = JSON.parse(localStorage.getItem('user') || '{}');
                const isCashier = user.role === 'cashier';
                return !isCashier && (
                  <button
                    onClick={handleBulkDelete}
                    className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    <TranslatedText text="Delete Selected" />
                  </button>
                );
              })()}
            </div>
          </div>
        </div>
      )}

      {/* Products Grid */}
      {viewMode === 'grid' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {products.map((product) => {
            const stockStatus = getStockStatus(product);
            const user = JSON.parse(localStorage.getItem('user') || '{}');
            const isCashier = user.role === 'cashier';
            const isEditingQuantity = editingQuantity === product.id;
            return (
              <ProductCard
                key={product.id}
                product={product}
                stockStatus={stockStatus}
                isSelected={selectedItems.has(product.id)}
                onToggleSelection={() => toggleSelection(product.id)}
                onEdit={() => setEditingProduct(product)}
                onDelete={isCashier ? null : () => {
                  if (confirm('Are you sure you want to delete this product? This action cannot be undone.')) {
                    deleteProductMutation.mutate(product.id);
                  }
                }}
                onToggleStatus={() => toggleProductStatusMutation.mutate({
                  id: product.id,
                  isActive: !product.is_active
                })}
                onDuplicate={() => duplicateProductMutation.mutate(product.id)}
                onQuickView={() => setShowQuickView(product)}
                onGenerateBarcode={handleGenerateBarcode}
                onViewBarcode={handleViewBarcode}
                onShowIntelligence={handleShowIntelligence}
                onEditQuantity={isCashier ? () => handleEditQuantity(product) : null}
                isEditingQuantity={isEditingQuantity}
                quantityValue={quantityValue}
                onQuantityChange={setQuantityValue}
                onSaveQuantity={() => handleSaveQuantity(product.id)}
                onCancelEditQuantity={handleCancelEditQuantity}
                isUpdatingQuantity={updateShopQuantityMutation.isLoading}
                formatPrice={formatCurrency}
                getCategoryNames={getCategoryNames}
                t={tSync}
              />
            );
          })}
        </div>
      )}

      {/* Products List */}
      {viewMode === 'list' && (
        <div className="space-y-4">
          {products.map((product) => {
            const stockStatus = getStockStatus(product);
            const user = JSON.parse(localStorage.getItem('user') || '{}');
            const isCashier = user.role === 'cashier';
            const isEditingQuantity = editingQuantity === product.id;
            return (
              <ProductListItem
                key={product.id}
                product={product}
                stockStatus={stockStatus}
                isSelected={selectedItems.has(product.id)}
                onToggleSelection={() => toggleSelection(product.id)}
                onEdit={() => setEditingProduct(product)}
                onDelete={isCashier ? null : () => {
                  if (confirm('Are you sure you want to delete this product? This action cannot be undone.')) {
                    deleteProductMutation.mutate(product.id);
                  }
                }}
                onToggleStatus={() => toggleProductStatusMutation.mutate({
                  id: product.id,
                  isActive: !product.is_active
                })}
                onDuplicate={() => duplicateProductMutation.mutate(product.id)}
                onQuickView={() => setShowQuickView(product)}
                onGenerateBarcode={handleGenerateBarcode}
                onViewBarcode={handleViewBarcode}
                onShowIntelligence={handleShowIntelligence}
                onEditQuantity={isCashier ? () => handleEditQuantity(product) : null}
                isEditingQuantity={isEditingQuantity}
                quantityValue={quantityValue}
                onQuantityChange={setQuantityValue}
                onSaveQuantity={() => handleSaveQuantity(product.id)}
                onCancelEditQuantity={handleCancelEditQuantity}
                isUpdatingQuantity={updateShopQuantityMutation.isLoading}
                formatPrice={formatCurrency}
                getCategoryNames={getCategoryNames}
              />
            );
          })}
        </div>
      )}

      {/* Products Table */}
      {viewMode === 'table' && (
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          {/* Table - Hidden on mobile, shown on md and up */}
          <div className="hidden md:block overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    <input
                      type="checkbox"
                      checked={selectedItems.size === products.length && products.length > 0}
                      onChange={() => selectedItems.size === products.length ? clearSelection() : selectAll()}
                      className="rounded border-gray-300"
                    />
                  </th>
                  <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    <TranslatedText text="Product" />
                  </th>
                  <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    SKU
                  </th>
                  <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    <TranslatedText text="Category" />
                  </th>
                  <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    <TranslatedText text="Price" />
                  </th>
                  <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    <TranslatedText text="Stock" />
                  </th>
                  <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    <TranslatedText text="Status" />
                  </th>
                  <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Barcode
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    <TranslatedText text="Actions" />
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {products.map((product) => {
                  const stockStatus = getStockStatus(product);
                  return (
                    <ProductTableRow
                      key={product.id}
                      product={product}
                      stockStatus={stockStatus}
                      isSelected={selectedItems.has(product.id)}
                      onToggleSelection={() => toggleSelection(product.id)}
                      onEdit={() => setEditingProduct(product)}
                      onDelete={() => {
                        if (confirm('Are you sure you want to delete this product? This action cannot be undone.')) {
                          deleteProductMutation.mutate(product.id);
                        }
                      }}
                      onToggleStatus={() => toggleProductStatusMutation.mutate({
                        id: product.id,
                        isActive: !product.is_active
                      })}
                      onDuplicate={() => duplicateProductMutation.mutate(product.id)}
                      onQuickView={() => setShowQuickView(product)}
                      onGenerateBarcode={handleGenerateBarcode}
                      onViewBarcode={handleViewBarcode}
                      onShowIntelligence={handleShowIntelligence}
                      formatPrice={formatCurrency}
                      getCategoryNames={getCategoryNames}
                    />
                  );
                })}
              </tbody>
            </table>
          </div>
          {/* Mobile Card View - Shown on mobile when table mode is selected */}
          <div className="md:hidden p-4 space-y-4">
            {products.map((product) => {
              const stockStatus = getStockStatus(product);
              return (
                <ProductCard
                  key={product.id}
                  product={product}
                  stockStatus={stockStatus}
                  isSelected={selectedItems.has(product.id)}
                  onToggleSelection={() => toggleSelection(product.id)}
                  onEdit={() => setEditingProduct(product)}
                  onDelete={() => {
                    if (confirm(`Are you sure you want to delete "${product.name}"?`)) {
                      deleteProductMutation.mutate(product.id);
                    }
                  }}
                  onToggleStatus={() => toggleProductStatusMutation.mutate({
                    id: product.id,
                    isActive: !product.is_active
                  })}
                  onDuplicate={() => duplicateProductMutation.mutate(product.id)}
                  onQuickView={() => setShowQuickView(product)}
                  onGenerateBarcode={handleGenerateBarcode}
                  onViewBarcode={handleViewBarcode}
                  onShowIntelligence={handleShowIntelligence}
                  formatPrice={formatCurrency}
                  getCategoryNames={getCategoryNames}
                  t={tSync}
                />
              );
            })}
          </div>
        </div>
      )}

      {/* Empty State */}
      {products.length === 0 && (
        <div className="text-center py-12">
          <Package className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            <TranslatedText text="No products found" />
          </h3>
          <p className="text-gray-600 mb-4">
            {searchTerm || selectedCategory !== 'all' || selectedProductType !== 'all' || selectedSize !== 'all' || stockFilter !== 'all' || statusFilter !== 'all'
              ? 'Try adjusting your search or filter criteria'
              : 'Get started by creating your first product'
            }
          </p>
          {!searchTerm && selectedCategory === 'all' && selectedProductType === 'all' && selectedSize === 'all' && stockFilter === 'all' && statusFilter === 'all' && (
            <button
              onClick={() => setShowNewProductForm(true)}
              className="inline-flex items-center px-4 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700"
            >
              <Plus className="h-4 w-4 mr-2" />
              <TranslatedText text="Add Product" />
            </button>
          )}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between bg-white rounded-lg border border-gray-200 px-4 py-3">
          <div className="flex items-center space-x-4">
            <span className="text-sm text-gray-700">
              Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, totalProducts)} of {totalProducts} results
            </span>
            <select
              value={itemsPerPage}
              onChange={(e) => {
                setItemsPerPage(parseInt(e.target.value));
                setCurrentPage(1);
              }}
              className="px-2 py-1 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value={12}>12 per page</option>
              <option value={24}>24 per page</option>
              <option value={50}>50 per page</option>
              <option value={100}>100 per page</option>
            </select>
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
              <TranslatedText text="Previous" />
            </button>
            {(() => {
              const maxVisiblePages = 5;
              const startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2));
              const endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);
              const adjustedStartPage = Math.max(1, endPage - maxVisiblePages + 1);

              const pages = [];

              // First page
              if (adjustedStartPage > 1) {
                pages.push(
                  <button
                    key={1}
                    onClick={() => setCurrentPage(1)}
                    className="px-3 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                  >
                    1
                  </button>
                );
                if (adjustedStartPage > 2) {
                  pages.push(
                    <span key="ellipsis1" className="px-2 py-2 text-gray-500">...</span>
                  );
                }
              }

              // Visible pages
              for (let i = adjustedStartPage; i <= endPage; i++) {
                pages.push(
                  <button
                    key={i}
                    onClick={() => setCurrentPage(i)}
                    className={`px-3 py-2 border rounded-lg text-sm font-medium ${currentPage === i
                      ? 'border-blue-500 text-blue-600 bg-blue-50'
                      : 'border-gray-300 text-gray-700 bg-white hover:bg-gray-50'
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
                    <span key="ellipsis2" className="px-2 py-2 text-gray-500">...</span>
                  );
                }
                pages.push(
                  <button
                    key={totalPages}
                    onClick={() => setCurrentPage(totalPages)}
                    className="px-3 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                  >
                    {totalPages}
                  </button>
                );
              }

              return pages;
            })()}
            <button
              onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
              disabled={currentPage === totalPages}
              className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <TranslatedText text="Next" />
              <svg className="ml-2 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>
        </div>
      )}

      {/* Create/Edit Product Modal */}
      {(showNewProductForm || editingProduct) && (
        <ProductModal
          product={editingProduct}
          onClose={() => {
            setShowNewProductForm(false);
            setEditingProduct(null);
          }}
          onSubmit={(data) => {
            if (editingProduct) {
              updateProductMutation.mutate({ id: editingProduct.id, data });
            } else {
              createProductMutation.mutate(data);
            }
          }}
          isLoading={createProductMutation.isPending || updateProductMutation.isPending}
          categories={categories}
          brands={brands}
        />
      )}

      {/* Quick View Modal */}
      {showQuickView && (
        <QuickViewModal
          product={showQuickView}
          onClose={() => setShowQuickView(null)}
          onEdit={() => {
            setShowQuickView(null);
            setEditingProduct(showQuickView);
          }}
          formatPrice={formatCurrency}
          getCategoryNames={getCategoryNames}
        />
      )}

      {/* Barcode Generator Modal */}
      <BarcodeGenerator
        isOpen={showBarcodeGenerator}
        onClose={() => {
          setShowBarcodeGenerator(false);
          setSelectedProductForBarcode(null);
        }}
        onGenerate={handleBarcodeGenerated}
        productName={selectedProductForBarcode?.name || ''}
        sku={selectedProductForBarcode?.sku || ''}
        canGenerate={(() => {
          const user = JSON.parse(localStorage.getItem('user') || '{}');
          const roleAllowed = user?.role === 'admin' || user?.role === 'manager';
          const hasExisting = !!selectedProductForBarcode?.barcode;
          // Only allow generation here if role is allowed AND no existing barcode.
          // If a barcode exists, require editing the product to regenerate.
          return roleAllowed && !hasExisting;
        })()}
        initialValue={selectedProductForBarcode?.barcode || ''}
      />

      {/* Product Intelligence Modal */}
      {showIntelligence && selectedProductForIntelligence && (
        <ProductIntelligence
          productId={selectedProductForIntelligence.id}
          onClose={() => {
            setShowIntelligence(false);
            setSelectedProductForIntelligence(null);
          }}
        />
      )}

      {/* Bulk Unassign from Shop Modal */}
      {showBulkUnassignModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 transition-opacity bg-gray-500 bg-opacity-75" onClick={() => !isUnassigning && setShowBulkUnassignModal(false)}></div>

            <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
              <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-gray-900">Unassign All Products from Shop</h3>
                  <button
                    onClick={() => !isUnassigning && setShowBulkUnassignModal(false)}
                    disabled={isUnassigning}
                    className="text-gray-400 hover:text-gray-600 disabled:opacity-50"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>

                <div className="space-y-4">
                  <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                    <div className="flex items-start">
                      <AlertCircle className="h-5 w-5 text-red-600 mt-0.5 mr-3 flex-shrink-0" />
                      <div>
                        <h4 className="text-sm font-medium text-red-800 mb-1">Warning</h4>
                        <p className="text-sm text-red-700">
                          This will remove all product assignments from the selected shop. Cashiers assigned to this shop will no longer be able to see or manage these products until they are reassigned.
                        </p>
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Shop <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={unassignShopId}
                      onChange={(e) => setUnassignShopId(e.target.value)}
                      disabled={isUnassigning}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
                      required
                    >
                      <option value="">Select a shop</option>
                      {shops.map(shop => (
                        <option key={shop.id} value={shop.id}>{shop.name}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                <button
                  type="button"
                  onClick={() => {
                    if (!unassignShopId) {
                      toast.error('Please select a shop');
                      return;
                    }
                    if (confirm(`Are you sure you want to unassign ALL products from this shop? This action cannot be undone.`)) {
                      setIsUnassigning(true);
                      bulkUnassignFromShopMutation.mutate({ shop_id: unassignShopId });
                    }
                  }}
                  disabled={isUnassigning || !unassignShopId}
                  className="w-full inline-flex justify-center rounded-lg border border-transparent shadow-sm px-4 py-2 bg-green-600 text-base font-medium text-white hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 sm:ml-3 sm:w-auto sm:text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isUnassigning ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Unassigning...
                    </>
                  ) : (
                    <>
                      <XCircle className="h-4 w-4 mr-2" />
                      Unassign All Products
                    </>
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => setShowBulkUnassignModal(false)}
                  disabled={isUnassigning}
                  className="mt-3 w-full inline-flex justify-center rounded-lg border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Bulk Assign to Shop Modal */}
      {showBulkAssignModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 transition-opacity bg-gray-500 bg-opacity-75" onClick={() => !isAssigning && setShowBulkAssignModal(false)}></div>

            <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
              <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-gray-900">Assign All Products to Shop</h3>
                  <button
                    onClick={() => !isAssigning && setShowBulkAssignModal(false)}
                    disabled={isAssigning}
                    className="text-gray-400 hover:text-gray-600 disabled:opacity-50"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Shop <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={bulkAssignForm.shop_id}
                      onChange={(e) => setBulkAssignForm({ ...bulkAssignForm, shop_id: e.target.value })}
                      disabled={isAssigning}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
                      required
                    >
                      <option value="">Select a shop</option>
                      {shops.map(shop => (
                        <option key={shop.id} value={shop.id}>{shop.name}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Default Quantity
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={bulkAssignForm.default_quantity}
                      onChange={(e) => setBulkAssignForm({ ...bulkAssignForm, default_quantity: parseInt(e.target.value) || 0 })}
                      disabled={isAssigning}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
                      placeholder="0 = Use product's current stock"
                    />
                    <p className="mt-1 text-xs text-gray-500">Leave as 0 to use each product's current stock quantity</p>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Min Stock Level
                      </label>
                      <input
                        type="number"
                        min="0"
                        value={bulkAssignForm.min_stock_level}
                        onChange={(e) => setBulkAssignForm({ ...bulkAssignForm, min_stock_level: parseInt(e.target.value) || 0 })}
                        disabled={isAssigning}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Max Stock Level
                      </label>
                      <input
                        type="number"
                        min="0"
                        value={bulkAssignForm.max_stock_level}
                        onChange={(e) => setBulkAssignForm({ ...bulkAssignForm, max_stock_level: parseInt(e.target.value) || 0 })}
                        disabled={isAssigning}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
                      />
                    </div>
                  </div>

                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="update_existing"
                      checked={bulkAssignForm.update_existing}
                      onChange={(e) => setBulkAssignForm({ ...bulkAssignForm, update_existing: e.target.checked })}
                      disabled={isAssigning}
                      className="h-4 w-4 text-purple-600 focus:ring-purple-500 border-gray-300 rounded disabled:opacity-50"
                    />
                    <label htmlFor="update_existing" className="ml-2 block text-sm text-gray-700">
                      Update existing assignments
                    </label>
                  </div>
                </div>
              </div>

              <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                <button
                  type="button"
                  onClick={() => {
                    if (!bulkAssignForm.shop_id) {
                      toast.error('Please select a shop');
                      return;
                    }
                    setIsAssigning(true);
                    bulkAssignToShopMutation.mutate(bulkAssignForm);
                  }}
                  disabled={isAssigning || !bulkAssignForm.shop_id}
                  className="w-full inline-flex justify-center rounded-lg border border-transparent shadow-sm px-4 py-2 bg-purple-600 text-base font-medium text-white hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 sm:ml-3 sm:w-auto sm:text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isAssigning ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Assigning...
                    </>
                  ) : (
                    <>
                      <Store className="h-4 w-4 mr-2" />
                      Assign All Products
                    </>
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => setShowBulkAssignModal(false)}
                  disabled={isAssigning}
                  className="mt-3 w-full inline-flex justify-center rounded-lg border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Product Card Component
const ProductCard = ({
  product,
  stockStatus,
  isSelected,
  onToggleSelection,
  onEdit,
  onDelete,
  onToggleStatus,
  onDuplicate,
  onQuickView,
  onGenerateBarcode,
  onViewBarcode,
  onShowIntelligence,
  onEditQuantity,
  isEditingQuantity,
  quantityValue,
  onQuantityChange,
  onSaveQuantity,
  onCancelEditQuantity,
  isUpdatingQuantity,
  formatPrice,
  getCategoryNames,
  t
}) => {
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const isCashier = user.role === 'cashier';

  return (
    <div className={`bg-white rounded-lg border-2 transition-all duration-200 ${isSelected
      ? 'border-blue-500 shadow-lg'
      : 'border-gray-200 hover:border-gray-300 hover:shadow-md'
      }`}>
      <div className="relative group">
        {(product.images && product.images.length > 0 && product.images[0]?.image_url) || product.image_url ? (
          <img
            src={(product.images && product.images.length > 0 && product.images[0]?.image_url) || product.image_url}
            alt={product.name}
            className="w-full h-48 object-cover rounded-t-lg"
            onError={(e) => {
              e.target.style.display = 'none';
              e.target.nextSibling.style.display = 'flex';
            }}
          />
        ) : null}
        <div className={`w-full h-48 bg-gradient-to-br from-gray-100 to-gray-200 rounded-t-lg flex items-center justify-center ${(product.images && product.images.length > 0 && product.images[0]?.image_url) || product.image_url ? 'hidden' : ''}`}>
          <Package className="h-12 w-12 text-gray-400" />
        </div>

        {/* Selection Checkbox */}
        <div className="absolute top-2 left-2">
          <input
            type="checkbox"
            checked={isSelected}
            onChange={onToggleSelection}
            className="rounded border-gray-300 bg-white shadow-sm"
          />
        </div>

        {/* Status Toggle */}
        <div className="absolute top-2 right-2">
          <button
            onClick={onToggleStatus}
            className={`p-1 rounded-full ${product.is_active
              ? 'bg-yellow-500 text-white hover:bg-yellow-600'
              : 'bg-green-500 text-white hover:bg-green-600'
              }`}
            title={product.is_active ? 'Deactivate' : 'Activate'}
          >
            {product.is_active ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
          </button>
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
          <h3 className="text-lg font-semibold text-gray-900 truncate flex-1">{product.name}</h3>
        </div>

        <div className="space-y-2 mb-3">
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-500">SKU:</span>
            <span className="text-sm text-gray-900 font-medium">{product.sku}</span>
          </div>

          {product.barcode && (
            <>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-500">Code-barres:</span>
                <span className="text-sm text-gray-900 font-mono">{product.barcode}</span>
              </div>
              <div className="mt-2 p-2 bg-gray-50 rounded-lg">
                <BarcodeDisplay
                  value={product.barcode}
                  width={1.2}
                  height={24}
                  fontSize={8}
                  className="w-full"
                />
              </div>
            </>
          )}

          {(product.size || product.color || product.variant) && (
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-500">Attributs:</span>
              <span className="text-sm text-gray-900">
                {[product.size, product.color, product.variant].filter(Boolean).join(' • ')}
              </span>
            </div>
          )}

          {product.brand_name && (
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-500">Marque:</span>
              <span className="text-sm text-gray-900">{product.brand_name}</span>
            </div>
          )}

          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-500">Catégorie:</span>
            <span className="text-sm text-gray-900 truncate">{getCategoryNames(product)}</span>
          </div>
        </div>

        <p className="text-sm text-gray-600 mb-3 line-clamp-2">{product.description}</p>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-500">Prix:</span>
            <span className="text-lg font-bold text-gray-900">{formatPrice(product.price)}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-500">Stock:</span>
            <div className="text-right">
              {isEditingQuantity ? (
                <div className="flex items-center space-x-2">
                  <input
                    type="number"
                    min="0"
                    value={quantityValue}
                    onChange={(e) => onQuantityChange(e.target.value)}
                    disabled={isUpdatingQuantity}
                    className="w-20 px-2 py-1 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100"
                    autoFocus
                  />
                  <button
                    onClick={onSaveQuantity}
                    disabled={isUpdatingQuantity}
                    className="p-1 text-green-600 hover:text-green-700 disabled:opacity-50"
                    title="Save"
                  >
                    <Save className="h-4 w-4" />
                  </button>
                  <button
                    onClick={onCancelEditQuantity}
                    disabled={isUpdatingQuantity}
                    className="p-1 text-red-600 hover:text-red-700 disabled:opacity-50"
                    title="Cancel"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ) : (
                <>
                  <span className="text-sm font-medium text-gray-900">
                    {stockStatus.isShopSpecific ? (
                      <span className="flex items-center justify-end">
                        <span className="text-blue-600 font-semibold">{stockStatus.quantity} Unité</span>
                        <span className="text-xs text-blue-500 ml-1">(Boutique)</span>
                      </span>
                    ) : (
                      <span className="text-gray-900 font-semibold">{stockStatus.quantity} Unité</span>
                    )}
                  </span>
                  {stockStatus.totalShopQuantity !== undefined && (
                    <div className="text-xs text-gray-500 mt-1">
                      <div>Total dans les boutiques: {stockStatus.totalShopQuantity} Unité</div>
                      <div>Disponible dans {stockStatus.shopsWithProduct} boutique(s)</div>
                      {stockStatus.availableForAssignment !== undefined && (
                        <div className="text-green-600 font-medium">Disponible pour Attribution: {stockStatus.availableForAssignment} Unité</div>
                      )}
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
          {product.cost_price && (
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-500">Coût:</span>
              <span className="text-sm text-gray-600">{formatPrice(product.cost_price)}</span>
            </div>
          )}
        </div>

        {/* Status Indicator */}
        <div className="mt-3 pt-3 border-t border-gray-100">
          <div className="flex items-center justify-between">
            <span className={`inline-flex items-center px-2 py-1 text-xs font-medium rounded-full ${product.is_active
              ? 'bg-green-100 text-green-800'
              : 'bg-gray-100 text-gray-800'
              }`}>
              {product.is_active ? 'Actif' : 'Inactif'}
            </span>
            <span className="text-xs text-gray-500">
              ID: {product.id.slice(0, 8)}...
            </span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="mt-3 pt-3 border-t border-gray-100">
          <div className="flex items-center justify-center space-x-2">
            <button
              onClick={onQuickView}
              className="p-2 bg-blue-50 text-blue-600 hover:bg-blue-100 rounded-lg transition-all duration-200 shadow-sm"
              title="Quick View"
            >
              <Eye className="h-4 w-4" />
            </button>
            <button
              onClick={onEdit}
              className="p-2 bg-indigo-50 text-indigo-600 hover:bg-indigo-100 rounded-lg transition-all duration-200 shadow-sm hover:scale-105"
              title="Edit Product"
            >
              <Edit className="h-4 w-4" />
            </button>
            <button
              onClick={onDuplicate}
              className="p-2 bg-green-50 text-green-600 hover:bg-green-100 rounded-lg transition-all duration-200 shadow-sm"
              title="Duplicate"
            >
              <Copy className="h-4 w-4" />
            </button>
            {!product.barcode && (
              <button
                onClick={() => onGenerateBarcode(product)}
                className="p-2 bg-orange-50 text-orange-600 hover:bg-orange-100 rounded-lg transition-all duration-200 shadow-sm"
                title="Generate Barcode"
              >
                <Barcode className="h-4 w-4" />
              </button>
            )}
            {product.barcode && (
              <button
                onClick={() => onViewBarcode(product)}
                className="p-2 bg-gray-50 text-gray-700 hover:bg-gray-100 rounded-lg transition-all duration-200 shadow-sm"
                title="View Barcode"
              >
                <Barcode className="h-4 w-4" />
              </button>
            )}
            <button
              onClick={() => onShowIntelligence(product)}
              className="p-2 bg-purple-50 text-purple-600 hover:bg-purple-100 rounded-lg transition-all duration-200 shadow-sm"
              title="AI Intelligence"
            >
              <Brain className="h-4 w-4" />
            </button>
            {onEditQuantity && (
              <button
                onClick={onEditQuantity}
                disabled={isEditingQuantity || isUpdatingQuantity}
                className="p-2 bg-blue-50 text-blue-600 hover:bg-blue-100 rounded-lg transition-all duration-200 shadow-sm disabled:opacity-50"
                title="Edit Quantity"
              >
                <Edit className="h-4 w-4" />
              </button>
            )}
            {onDelete && (
              <button
                onClick={onDelete}
                className="p-2 bg-red-50 text-red-600 hover:bg-red-100 rounded-lg transition-all duration-200 shadow-sm"
                title="Delete"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

// Quick View Modal Component
const QuickViewModal = ({ product, onClose, onEdit, formatPrice, getCategoryNames }) => {
  // Get user role for stock display
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const isAdmin = user.role === 'admin';

  const displayQuantity = isAdmin ?
    (product.global_quantity || product.stock_quantity || 0) :
    (product.shop_quantity || 0);
  const displayMinStock = isAdmin ?
    (product.global_min_stock || product.min_stock_level || 0) :
    (product.shop_min_stock || 0);

  const stockStatus = displayQuantity === 0 ? 'Rupture de Stock' :
    displayQuantity <= displayMinStock ? 'Stock Faible' : 'En Stock';

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full mx-2 sm:mx-4 max-h-[98vh] sm:max-h-[90vh] overflow-y-auto p-2 sm:p-4">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">Product Details</h3>
          <div className="flex items-center space-x-2">
            <button
              onClick={onEdit}
              className="inline-flex items-center px-3 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
            >
              <Edit className="h-4 w-4 mr-2" />
              Edit
            </button>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
              <X className="h-6 w-6" />
            </button>
          </div>
        </div>

        <div className="p-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Product Image */}
            <div>
              {(product.images && product.images.length > 0 && product.images[0]?.image_url) || product.image_url ? (
                <img
                  src={(product.images && product.images.length > 0 && product.images[0]?.image_url) || product.image_url}
                  alt={product.name}
                  className="w-full h-96 object-cover rounded-lg"
                  onError={(e) => {
                    e.target.style.display = 'none';
                    e.target.nextSibling.style.display = 'flex';
                  }}
                />
              ) : null}
              <div className={`w-full h-96 bg-gradient-to-br from-gray-100 to-gray-200 rounded-lg flex items-center justify-center ${(product.images && product.images.length > 0 && product.images[0]?.image_url) || product.image_url ? 'hidden' : ''}`}>
                <Package className="h-24 w-24 text-gray-400" />
              </div>
            </div>

            {/* Product Details */}
            <div className="space-y-6">
              <div>
                <h2 className="text-2xl font-bold text-gray-900 mb-2">{product.name}</h2>
                <p className="text-lg text-gray-600">{product.description}</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-500">SKU</label>
                  <p className="text-sm text-gray-900 font-mono">{product.sku}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-500">Status</label>
                  <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${product.is_active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                    }`}>
                    {product.is_active ? 'Active' : 'Inactive'}
                  </span>
                </div>
                {product.barcode && (
                  <div>
                    <label className="block text-sm font-medium text-gray-500">Barcode</label>
                    <p className="text-sm text-gray-900 font-mono">{product.barcode}</p>
                  </div>
                )}
                {product.barcode && (
                  <div className="col-span-2">
                    <label className="block text-sm font-medium text-gray-500 mb-2">Barcode Display</label>
                    <div className="p-4 bg-gray-50 rounded-lg">
                      <BarcodeDisplay
                        value={product.barcode}
                        width={2}
                        height={48}
                        fontSize={12}
                        className="w-full"
                      />
                    </div>
                  </div>
                )}
                {product.brand_name && (
                  <div>
                    <label className="block text-sm font-medium text-gray-500">Brand</label>
                    <p className="text-sm text-gray-900">{product.brand_name}</p>
                  </div>
                )}
                <div>
                  <label className="block text-sm font-medium text-gray-500">Price</label>
                  <p className="text-lg font-bold text-gray-900">{formatPrice(product.price)}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-500">Stock</label>
                  <div className="text-sm text-gray-900">
                    <div className="font-semibold">
                      {isAdmin ? (
                        <span className="text-gray-900">{displayQuantity} Unit (Global)</span>
                      ) : (
                        <span className="text-blue-600">{displayQuantity} Unit (Shop)</span>
                      )}
                    </div>
                    {isAdmin && product.total_shop_quantity !== undefined && (
                      <div className="text-xs text-gray-500 mt-1">
                        <div>Total in shops: {product.total_shop_quantity} Unit</div>
                        <div>Available in {product.shops_with_product} shop(s)</div>
                        {product.available_for_assignment !== undefined && (
                          <div className="text-green-600 font-medium">Available for Assignment: {product.available_for_assignment} Unit</div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
                {product.cost_price && (
                  <div>
                    <label className="block text-sm font-medium text-gray-500">Cost Price</label>
                    <p className="text-sm text-gray-900">{formatPrice(product.cost_price)}</p>
                  </div>
                )}
                {(product.size || product.color || product.variant) && (
                  <div>
                    <label className="block text-sm font-medium text-gray-500">Attributes</label>
                    <p className="text-sm text-gray-900">
                      {[product.size, product.color, product.variant].filter(Boolean).join(' • ')}
                    </p>
                  </div>
                )}
                <div>
                  <label className="block text-sm font-medium text-gray-500">État du Stock</label>
                  <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${stockStatus === 'Rupture de Stock' ? 'bg-red-100 text-red-800' :
                    stockStatus === 'Stock Faible' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-green-100 text-green-800'
                    }`}>
                    {stockStatus}
                  </span>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-500 mb-2">Categories</label>
                <p className="text-sm text-gray-900">{getCategoryNames(product)}</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-500 mb-2">Product ID</label>
                <p className="text-sm text-gray-900 font-mono">{product.id}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// Product Modal Component
const ProductModal = ({ product, onClose, onSubmit, isLoading, categories, brands }) => {
  const { tSync } = useTranslation();
  const [formData, setFormData] = useState({
    name: product?.name || '',
    description: product?.description || '',
    sku: product?.sku || '',
    barcode: product?.barcode || '',
    price: product?.price || '',
    cost_price: product?.cost_price || '',
    stock_quantity: product?.stock_quantity || '',
    min_stock_level: product?.min_stock_level || '',
    brand_id: product?.brand_id || '',
    product_type: product?.product_type || 'general',
    size: product?.size || '',
    color: product?.color || '',
    variant: product?.variant || '',
    weight: product?.weight || '',
    dimensions: product?.dimensions || '',
    image_url: product?.image_url || '',
    categories: product?.categories?.map(c => c.id) || [],
    is_active: product?.is_active ?? true,
    currency: 'RWF' // Force RWF as the only currency
  });

  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(product?.image_url || '');
  const [showBarcodeScanner, setShowBarcodeScanner] = useState(false);
  const [showBarcodeGenerator, setShowBarcodeGenerator] = useState(false);
  const [originalData, setOriginalData] = useState(null);

  // Update form data when product prop changes
  useEffect(() => {
    if (product) {
      const productData = {
        name: product.name || '',
        description: product.description || '',
        sku: product.sku || '',
        barcode: product.barcode || '',
        price: product.price || '',
        cost_price: product.cost_price || '',
        stock_quantity: product.stock_quantity || '',
        min_stock_level: product.min_stock_level || '',
        brand_id: product.brand_id || '',
        product_type: product.product_type || 'general',
        size: product.size || '',
        color: product.color || '',
        variant: product.variant || '',
        weight: product.weight || '',
        dimensions: product.dimensions || '',
        image_url: product.image_url || '',
        categories: product.categories?.map(c => c.id) || [],
        is_active: product.is_active ?? true
      };
      setFormData(productData);
      setOriginalData(productData);
      setImagePreview(product.image_url || '');
      setImageFile(null);
    } else {
      // Reset form for new product
      const emptyData = {
        name: '',
        description: '',
        sku: '',
        barcode: '',
        price: '',
        cost_price: '',
        stock_quantity: '',
        min_stock_level: '',
        brand_id: '',
        product_type: 'general',
        size: '',
        color: '',
        variant: '',
        weight: '',
        dimensions: '',
        image_url: '',
        categories: [],
        is_active: true
      };
      setFormData(emptyData);
      setOriginalData(null);
      setImagePreview('');
      setImageFile(null);
    }
  }, [product]);

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        toast.error('Please select a valid image file');
        return;
      }

      // Validate file size (5MB limit)
      if (file.size > 5 * 1024 * 1024) {
        toast.error('Image size must be less than 5MB');
        return;
      }

      setImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result);
      };
      reader.onerror = () => {
        toast.error('Failed to read image file');
        setImagePreview('');
      };
      reader.readAsDataURL(file);
    }
  };

  const handleImageUrlChange = (e) => {
    const url = e.target.value;
    setFormData({ ...formData, image_url: url });

    // Set preview for any non-empty value
    if (url && url.trim() !== '') {
      setImagePreview(url);
    } else {
      setImagePreview('');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Basic validation
    if (!formData.name.trim()) {
      toast.error('Product name is required');
      return;
    }

    if (!formData.sku.trim()) {
      toast.error('SKU is required');
      return;
    }

    if (!formData.price || formData.price <= 0) {
      toast.error('Valid price is required');
      return;
    }

    if (formData.stock_quantity < 0) {
      toast.error('Stock quantity cannot be negative');
      return;
    }

    // Price vs Cost validation
    if (formData.cost_price && parseFloat(formData.price) <= parseFloat(formData.cost_price)) {
      toast.error('Price cannot be less than or equal to cost price');
      return;
    }

    // If there's a new image file, upload it first
    let finalImageUrl = formData.image_url;
    if (imageFile) {
      const formDataImage = new FormData();
      formDataImage.append('image', imageFile);
      try {
        const uploadResponse = await api.post('/upload/image', formDataImage, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
        finalImageUrl = uploadResponse.data.imageUrl;
      } catch (error) {
        toast.error('Failed to upload image');
        return;
      }
    }

    // Validate image URL if provided (optional field)
    if (finalImageUrl && finalImageUrl.trim() !== '') {
      // No URL format validation - accept any text
    } else {
      // Clear empty image URL
      finalImageUrl = null;
    }

    // Auto-generate barcode if SKU changed and product exists
    let finalBarcode = formData.barcode;
    if (product && formData.sku && formData.sku !== product.sku) {
      const random3Digits = Math.floor(Math.random() * 900) + 100; // 100-999
      const skuPart = formData.sku.replace(/\s+/g, '');
      finalBarcode = `${skuPart}${random3Digits}`;
    }

    const submitData = {
      ...formData,
      image_url: finalImageUrl,
      barcode: finalBarcode,
      // Convert numeric fields
      price: parseFloat(formData.price) || 0,
      cost_price: parseFloat(formData.cost_price) || null,
      stock_quantity: parseInt(formData.stock_quantity) || 0,
      min_stock_level: parseInt(formData.min_stock_level) || 0,
      weight: parseFloat(formData.weight) || null,
      // Convert brand_id to null if empty (must override the spread)
      brand_id: formData.brand_id && formData.brand_id.trim() !== '' ? formData.brand_id : null,
      // Convert category_ids from categories array
      category_ids: formData.categories || []
    };

    onSubmit(submitData);
  };

  const handleReset = () => {
    if (originalData) {
      setFormData(originalData);
      setImagePreview(originalData.image_url || '');
      setImageFile(null);
      toast.success('Form reset to original values');
    }
  };

  const handleClose = () => {
    // Check if there are unsaved changes
    if (product && originalData) {
      const hasChanges = JSON.stringify(formData) !== JSON.stringify(originalData) || imageFile;
      if (hasChanges) {
        if (confirm('You have unsaved changes. Are you sure you want to close without saving?')) {
          onClose();
        }
      } else {
        onClose();
      }
    } else {
      onClose();
    }
  };

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        if (!isLoading) {
          const form = document.querySelector('form');
          if (form) {
            form.requestSubmit();
          }
        }
      }
      if (e.key === 'Escape') {
        handleClose();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isLoading]);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full mx-2 sm:mx-4 max-h-[98vh] sm:max-h-[90vh] overflow-y-auto p-2 sm:p-4">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center space-x-2">
            <h3 className="text-lg font-semibold text-gray-900">
              {product ? <TranslatedText text="Edit Product" /> : <TranslatedText text="Create New Product" />}
            </h3>
            {product && originalData && (() => {
              const hasChanges = JSON.stringify(formData) !== JSON.stringify(originalData) || imageFile;
              return hasChanges ? (
                <span className="inline-flex items-center px-2 py-1 text-xs font-medium bg-yellow-100 text-yellow-800 rounded-full">
                  <TranslatedText text="Unsaved Changes" />
                </span>
              ) : null;
            })()}
          </div>
          <button onClick={handleClose} className="text-gray-400 hover:text-gray-600">
            <X className="h-6 w-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Basic Information */}
          <div>
            <h4 className="text-md font-semibold text-gray-900 mb-4"><TranslatedText text="Basic Information" /></h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2"><TranslatedText text="Name" /> *</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder={tSync("Enter product name")}
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2"><TranslatedText text="SKU" /> *</label>
                <input
                  type="text"
                  value={formData.sku}
                  onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder={tSync("Enter SKU")}
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2"><TranslatedText text="Barcode" /></label>
                <div className="flex space-x-2">
                  <input
                    type="text"
                    value={formData.barcode}
                    onChange={(e) => setFormData({ ...formData, barcode: e.target.value })}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder={tSync("Enter barcode")}
                  />
                  <button
                    type="button"
                    onClick={() => setShowBarcodeScanner(true)}
                    className="px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                    title="Scan barcode"
                  >
                    <Scan className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowBarcodeGenerator(true)}
                    className="px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2"
                    title="Generate barcode"
                  >
                    <Barcode className="h-4 w-4" />
                  </button>
                </div>
                {formData.barcode && (
                  <div className="mt-2 p-3 bg-gray-50 rounded-lg">
                    <label className="block text-sm font-medium text-gray-600 mb-2"><TranslatedText text="Barcode Preview" /></label>
                    <BarcodeDisplay
                      value={formData.barcode}
                      width={1.5}
                      height={32}
                      fontSize={10}
                      className="w-full"
                    />
                  </div>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2"><TranslatedText text="Product Type" /></label>
                <select
                  value={formData.product_type}
                  onChange={(e) => setFormData({ ...formData, product_type: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="general"><TranslatedText text="General" /></option>
                  <option value="perfume"><TranslatedText text="Perfume" /></option>
                  <option value="shoes"><TranslatedText text="Shoes" /></option>
                  <option value="clothes"><TranslatedText text="Clothes" /></option>
                  <option value="accessories"><TranslatedText text="Accessories" /></option>
                </select>
              </div>
            </div>
          </div>

          {/* Pricing & Inventory */}
          <div>
            <h4 className="text-md font-semibold text-gray-900 mb-4"><TranslatedText text="Pricing & Inventory" /></h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">


              <div>
                <CurrencyInput
                  label="Cost Price"
                  value={formData.cost_price}
                  onChange={(value) => setFormData({ ...formData, cost_price: value })}
                  placeholder="0.00"
                  error={formData.price && parseFloat(formData.cost_price) >= parseFloat(formData.price) ? "Cost price must be less than selling price" : ""}
                />
                {formData.price && parseFloat(formData.cost_price) >= parseFloat(formData.price) && (
                  <p className="mt-1 text-sm text-red-600">
                    ⚠️ Cost price must be less than selling price (${formData.price})
                  </p>
                )}
              </div>

              <div>
                <CurrencyInput
                  label="Selling Price"
                  value={formData.price}
                  onChange={(value) => setFormData({ ...formData, price: value })}
                  placeholder="0.00"
                  required
                  error={formData.cost_price && parseFloat(formData.price) <= parseFloat(formData.cost_price) ? "Price must be greater than cost price" : ""}
                />
                {formData.cost_price && parseFloat(formData.price) <= parseFloat(formData.cost_price) && (
                  <p className="mt-1 text-sm text-red-600">
                    ⚠️ Price must be greater than cost price (${formData.cost_price})
                  </p>
                )}
              </div>



              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2"><TranslatedText text="Stock Quantity" /> *</label>
                <input
                  type="number"
                  min="0"
                  value={formData.stock_quantity}
                  onChange={(e) => setFormData({ ...formData, stock_quantity: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="0"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2"><TranslatedText text="Min Stock Level" /></label>
                <input
                  type="number"
                  min="0"
                  value={formData.min_stock_level}
                  onChange={(e) => setFormData({ ...formData, min_stock_level: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="0"
                />
              </div>
            </div>

            {/* Profit Margin Indicator */}
            {formData.price && formData.cost_price && parseFloat(formData.price) > parseFloat(formData.cost_price) && (
              <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-green-800">Profit Margin:</span>
                  <span className="text-sm font-bold text-green-900">
                    ${(parseFloat(formData.price) - parseFloat(formData.cost_price)).toFixed(2)}
                    ({(((parseFloat(formData.price) - parseFloat(formData.cost_price)) / parseFloat(formData.price)) * 100).toFixed(1)}%)
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Product Attributes */}
          <div>
            <h4 className="text-md font-semibold text-gray-900 mb-4"><TranslatedText text="Product Attributes" /></h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2"><TranslatedText text="Size" /></label>
                <input
                  type="text"
                  value={formData.size}
                  onChange={(e) => setFormData({ ...formData, size: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder={tSync("e.g., S, M, L, XL, 30ml, 50ml")}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2"><TranslatedText text="Color" /></label>
                <input
                  type="text"
                  value={formData.color}
                  onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder={tSync("e.g., Red, Blue, Black")}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2"><TranslatedText text="Variant" /></label>
                <input
                  type="text"
                  value={formData.variant}
                  onChange={(e) => setFormData({ ...formData, variant: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder={tSync("e.g., Limited Edition, Premium")}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2"><TranslatedText text="Weight (kg)" /></label>
                <input
                  type="number"
                  step="0.001"
                  min="0"
                  value={formData.weight}
                  onChange={(e) => setFormData({ ...formData, weight: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="0.000"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2"><TranslatedText text="Dimensions" /></label>
                <input
                  type="text"
                  value={formData.dimensions}
                  onChange={(e) => setFormData({ ...formData, dimensions: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder={tSync("e.g., 10x5x2 cm")}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2"><TranslatedText text="Brand" /></label>
                <select
                  value={formData.brand_id}
                  onChange={(e) => setFormData({ ...formData, brand_id: e.target.value || null })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value=""><TranslatedText text="Select Brand" /></option>
                  {brands?.map(brand => (
                    <option key={brand.id} value={brand.id}>{brand.name}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2"><TranslatedText text="Description" /></label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder={tSync("Enter product description")}
              rows={3}
            />
          </div>

          {/* Categories */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2"><TranslatedText text="Categories" /></label>
            <select
              multiple
              value={formData.categories}
              onChange={(e) => {
                const selectedOptions = Array.from(e.target.selectedOptions, option => option.value);
                setFormData({ ...formData, categories: selectedOptions });
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              {categories?.map(category => (
                <option key={category.id} value={category.id}>
                  {'—'.repeat(category.level)} {category.name}
                </option>
              ))}
            </select>
            <p className="text-xs text-gray-500 mt-1"><TranslatedText text="Hold Ctrl/Cmd to select multiple categories" /></p>
          </div>

          {/* Image Upload */}
          <div>
            <h4 className="text-md font-semibold text-gray-900 mb-4"><TranslatedText text="Product Image" /></h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2"><TranslatedText text="Upload Image" /></label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
                <p className="text-xs text-gray-500 mt-1"><TranslatedText text="Supported formats: JPG, PNG, GIF (Max 5MB)" /></p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2"><TranslatedText text="Image URL (Optional)" /></label>
                <input
                  type="text"
                  value={formData.image_url}
                  onChange={handleImageUrlChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="https://example.com/image.jpg (optional)"
                />
              </div>
            </div>

            {/* Image Preview */}
            {imagePreview && (
              <div className="mt-4">
                <label className="block text-sm font-medium text-gray-700 mb-2"><TranslatedText text="Preview" /></label>
                <div className="w-32 h-32 border border-gray-300 rounded-lg overflow-hidden">
                  <img
                    src={imagePreview}
                    alt="Product preview"
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      e.target.style.display = 'none';
                      e.target.nextSibling.style.display = 'flex';
                    }}
                  />
                  <div className="w-full h-full bg-gray-100 flex items-center justify-center text-gray-400 text-sm" style={{ display: 'none' }}>
                    Invalid Image
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Status */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2"><TranslatedText text="Status" /></label>
            <select
              value={formData.is_active}
              onChange={(e) => setFormData({ ...formData, is_active: e.target.value === 'true' })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="true"><TranslatedText text="Active" /></option>
              <option value="false"><TranslatedText text="Inactive" /></option>
            </select>
          </div>

          <div className="flex items-center justify-between pt-4">
            <div className="text-xs text-gray-500">
              <span className="hidden sm:inline"><TranslatedText text="Keyboard shortcuts" />: </span>
              <kbd className="px-1 py-0.5 bg-gray-100 rounded text-xs">Ctrl+S</kbd> <TranslatedText text="to save" />,
              <kbd className="px-1 py-0.5 bg-gray-100 rounded text-xs ml-1">Esc</kbd> <TranslatedText text="to close" />
            </div>
            <div className="flex items-center space-x-3">
              {product && originalData && (
                <button
                  type="button"
                  onClick={handleReset}
                  disabled={isLoading}
                  className="px-4 py-2 text-orange-700 bg-orange-100 rounded-lg hover:bg-orange-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <TranslatedText text="Reset to Original" />
                </button>
              )}
              <button
                type="button"
                onClick={handleClose}
                disabled={isLoading}
                className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <TranslatedText text="Cancel" />
              </button>
              <button
                type="submit"
                disabled={isLoading}
                className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {isLoading && (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                )}
                {isLoading ? <TranslatedText text="Saving..." /> : (product ? <TranslatedText text="Update Product" /> : <TranslatedText text="Create Product" />)}
              </button>
            </div>
          </div>
        </form>
      </div>

      {/* Barcode Scanner Modal */}
      <BarcodeScanner
        isOpen={showBarcodeScanner}
        onClose={() => setShowBarcodeScanner(false)}
        onScan={(barcode) => {
          setFormData({ ...formData, barcode });
          setShowBarcodeScanner(false);
        }}
      />

      {/* Barcode Generator Modal */}
      <BarcodeGenerator
        isOpen={showBarcodeGenerator}
        onClose={() => setShowBarcodeGenerator(false)}
        onGenerate={(barcode) => {
          setFormData({ ...formData, barcode });
          setShowBarcodeGenerator(false);
        }}
        productName={formData.name}
        sku={formData.sku}
        canGenerate={(() => {
          const user = JSON.parse(localStorage.getItem('user') || '{}');
          return user?.role === 'admin' || user?.role === 'manager';
        })()}
      />
    </div>
  );
};

// Product List Item Component
const ProductListItem = ({
  product,
  stockStatus,
  isSelected,
  onToggleSelection,
  onEdit,
  onDelete,
  onToggleStatus,
  onDuplicate,
  onQuickView,
  onGenerateBarcode,
  onViewBarcode,
  onShowIntelligence,
  onEditQuantity,
  isEditingQuantity,
  quantityValue,
  onQuantityChange,
  onSaveQuantity,
  onCancelEditQuantity,
  isUpdatingQuantity,
  formatPrice,
  getCategoryNames
}) => {
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const isCashier = user.role === 'cashier';

  return (
    <div className={`bg-white rounded-lg border-2 p-4 transition-all duration-200 ${isSelected
      ? 'border-blue-500 shadow-lg'
      : 'border-gray-200 hover:border-gray-300 hover:shadow-md'
      }`}>
      <div className="flex items-center space-x-4">
        {/* Selection Checkbox */}
        <input
          type="checkbox"
          checked={isSelected}
          onChange={onToggleSelection}
          className="rounded border-gray-300"
        />

        {/* Product Image */}
        <div className="flex-shrink-0">
          {(product.images && product.images.length > 0 && product.images[0]?.image_url) || product.image_url ? (
            <img
              src={(product.images && product.images.length > 0 && product.images[0]?.image_url) || product.image_url}
              alt={product.name}
              className="w-16 h-16 object-cover rounded-lg"
              onError={(e) => {
                e.target.style.display = 'none';
                e.target.nextSibling.style.display = 'flex';
              }}
            />
          ) : null}
          <div className={`w-16 h-16 bg-gradient-to-br from-gray-100 to-gray-200 rounded-lg flex items-center justify-center ${(product.images && product.images.length > 0 && product.images[0]?.image_url) || product.image_url ? 'hidden' : ''}`}>
            <Package className="h-6 w-6 text-gray-400" />
          </div>
        </div>

        {/* Product Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-gray-900 truncate">{product.name}</h3>
              <p className="text-sm text-gray-600 mt-1">{getCategoryNames(product)}</p>
              <div className="flex items-center space-x-4 mt-2">
                <span className="text-sm text-gray-500">SKU: {product.sku || 'N/A'}</span>
                <span className="text-lg font-bold text-gray-900">{formatPrice(product.price)}</span>
              </div>
            </div>

            {/* Stock Status */}
            <div className="flex items-center space-x-2">
              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${stockStatus.bgColor} ${stockStatus.textColor}`}>
                {stockStatus.text}
              </span>
              {isEditingQuantity ? (
                <div className="flex items-center space-x-2">
                  <input
                    type="number"
                    min="0"
                    value={quantityValue}
                    onChange={(e) => onQuantityChange(e.target.value)}
                    disabled={isUpdatingQuantity}
                    className="w-20 px-2 py-1 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100"
                    autoFocus
                  />
                  <button
                    onClick={onSaveQuantity}
                    disabled={isUpdatingQuantity}
                    className="p-1 text-green-600 hover:text-green-700 disabled:opacity-50"
                    title="Save"
                  >
                    <Save className="h-4 w-4" />
                  </button>
                  <button
                    onClick={onCancelEditQuantity}
                    disabled={isUpdatingQuantity}
                    className="p-1 text-red-600 hover:text-red-700 disabled:opacity-50"
                    title="Cancel"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ) : (
                <span className="text-sm font-medium text-gray-900">
                  {stockStatus.isShopSpecific ? (
                    <span className="flex items-center">
                      <span className="text-blue-600 font-semibold">{stockStatus.quantity} Unit</span>
                      <span className="text-xs text-blue-500 ml-1">(Shop)</span>
                    </span>
                  ) : (
                    <span>{stockStatus.quantity} Unit</span>
                  )}
                </span>
              )}
            </div>
          </div>

          {/* Description */}
          {product.description && (
            <p className="text-sm text-gray-600 mt-2 line-clamp-2">{product.description}</p>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center space-x-2">
          <button
            onClick={onQuickView}
            className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
            title="Quick View"
          >
            <Eye className="h-4 w-4" />
          </button>
          <button
            onClick={onEdit}
            className="p-2 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors"
            title="Edit Product"
          >
            <Edit className="h-4 w-4" />
          </button>
          {onEditQuantity && (
            <button
              onClick={onEditQuantity}
              disabled={isEditingQuantity || isUpdatingQuantity}
              className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors disabled:opacity-50"
              title="Edit Quantity"
            >
              <Edit className="h-4 w-4" />
            </button>
          )}
          {onDelete && (
            <button
              onClick={onDelete}
              className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
              title="Delete Product"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

// Product Table Row Component
const ProductTableRow = ({
  product,
  stockStatus,
  isSelected,
  onToggleSelection,
  onEdit,
  onDelete,
  onToggleStatus,
  onDuplicate,
  onQuickView,
  onGenerateBarcode,
  onViewBarcode,
  onShowIntelligence,
  formatPrice,
  getCategoryNames
}) => (
  <tr className={`hover:bg-gray-50 ${isSelected ? 'bg-blue-50' : ''}`}>
    <td className="px-3 sm:px-6 py-4 whitespace-nowrap text-xs sm:text-sm">
      <input
        type="checkbox"
        checked={isSelected}
        onChange={onToggleSelection}
        className="rounded border-gray-300"
      />
    </td>
    <td className="px-3 sm:px-6 py-4 whitespace-nowrap text-xs sm:text-sm">
      <div className="flex items-center">
        <div className="flex-shrink-0 h-10 w-10">
          {(product.images && product.images.length > 0 && product.images[0]?.image_url) || product.image_url ? (
            <img
              className="h-10 w-10 rounded-lg object-cover"
              src={(product.images && product.images.length > 0 && product.images[0]?.image_url) || product.image_url}
              alt={product.name}
              onError={(e) => {
                e.target.style.display = 'none';
                e.target.nextSibling.style.display = 'flex';
              }}
            />
          ) : null}
          <div className={`h-10 w-10 bg-gradient-to-br from-gray-100 to-gray-200 rounded-lg flex items-center justify-center ${(product.images && product.images.length > 0 && product.images[0]?.image_url) || product.image_url ? 'hidden' : ''}`}>
            <Package className="h-4 w-4 text-gray-400" />
          </div>
        </div>
        <div className="ml-4">
          <div className="text-sm font-medium text-gray-900">{product.name}</div>
          <div className="text-sm text-gray-500">{formatPrice(product.price)}</div>
        </div>
      </div>
    </td>
    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
      {product.sku || 'N/A'}
    </td>
    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
      {getCategoryNames(product)}
    </td>
    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
      {formatPrice(product.price)}
    </td>
    <td className="px-3 sm:px-6 py-4 whitespace-nowrap text-xs sm:text-sm">
      <div className="flex items-center">
        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${stockStatus.bgColor} ${stockStatus.textColor}`}>
          {stockStatus.text}
        </span>
        <span className="ml-2 text-sm text-gray-900">{stockStatus.quantity}</span>
      </div>
    </td>
    <td className="px-3 sm:px-6 py-4 whitespace-nowrap text-xs sm:text-sm">
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${product.is_active
        ? 'bg-green-100 text-green-800'
        : 'bg-red-100 text-red-800'
        }`}>
        {product.is_active ? 'Active' : 'Inactive'}
      </span>
    </td>
    <td className="px-3 sm:px-6 py-4 whitespace-nowrap text-xs sm:text-sm">
      <div className="flex items-center space-x-2">
        {product.barcode ? (
          <button
            onClick={() => onViewBarcode(product)}
            className="inline-flex items-center px-2 py-1 text-xs font-medium text-blue-600 bg-blue-50 rounded hover:bg-blue-100 transition-colors"
            title="View Barcode"
          >
            <Barcode className="h-3 w-3 mr-1" />
            {product.barcode}
          </button>
        ) : (
          <button
            onClick={() => onGenerateBarcode(product)}
            className="inline-flex items-center px-2 py-1 text-xs font-medium text-gray-500 bg-gray-50 rounded hover:bg-gray-100 transition-colors"
            title="Generate Barcode"
          >
            <Barcode className="h-3 w-3 mr-1" />
            Generate
          </button>
        )}
      </div>
    </td>
    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
      <div className="flex items-center justify-end space-x-2">
        <button
          onClick={onQuickView}
          className="text-blue-600 hover:text-blue-900 p-1 rounded"
          title="Quick View"
        >
          <Eye className="h-4 w-4" />
        </button>
        <button
          onClick={onEdit}
          className="text-green-600 hover:text-green-900 p-1 rounded"
          title="Edit"
        >
          <Edit className="h-4 w-4" />
        </button>
        <button
          onClick={onDelete}
          className="text-red-600 hover:text-red-900 p-1 rounded"
          title="Delete"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>
    </td>
  </tr>
);


export default Products; 