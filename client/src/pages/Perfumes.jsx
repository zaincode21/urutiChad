import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Plus,
  Search,
  Filter,
  FlaskConical,
  Package,
  TrendingUp,
  DollarSign,
  Wine,
  Edit,
  Trash2,
  Eye,
  BarChart3,
  X,
  Save,
  AlertCircle,
  CheckCircle,
  Clock,
  ChevronLeft,
  ChevronRight,
  Download,
  CheckCircle2,
  RotateCcw,
  Beaker
} from 'lucide-react';
import { api } from '../lib/api';
import toast from 'react-hot-toast';
import { perfumeAPI, categoriesAPI, shopsAPI } from '../lib/api';
import { useAuth } from '../contexts/AuthContext';
import TranslatedText from '../components/TranslatedText';
import { useTranslation } from '../hooks/useTranslation';

const Perfumes = () => {
  const { tSync } = useTranslation();
  const { user } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedFilter, setSelectedFilter] = useState('all');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(12);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showBottleModal, setShowBottleModal] = useState(false);
  const [showBottleSizeModal, setShowBottleSizeModal] = useState(false);
  const [showBottleSizeListModal, setShowBottleSizeListModal] = useState(false);
  const [showQuickBottleModal, setShowQuickBottleModal] = useState(false);
  const [selectedPerfume, setSelectedPerfume] = useState(null);
  const [selectedBottleSize, setSelectedBottleSize] = useState(null);
  const [editMode, setEditMode] = useState(false);
  const [quickBottleShopId, setQuickBottleShopId] = useState('');
  const [quickBottleModalShopId, setQuickBottleModalShopId] = useState('');

  const queryClient = useQueryClient();

  const isAdmin = user?.role === 'admin';
  const isManagerOrAdmin = user?.role === 'admin' || user?.role === 'manager';

  // Form states
  const [perfumeForm, setPerfumeForm] = useState({
    name: '',
    scent_description: '',
    bulk_quantity_ml: '',
    cost_per_ml: '',
    supplier: '',
    batch_number: '',
    expiry_date: '',
    category_id: ''
  });

  const [bottlingForm, setBottlingForm] = useState({
    bottle_size: '', // 30, 50, or 100
    quantity: '',
    batch_number: '',
    shop_id: ''
  });

  // Fetch perfumes with pagination (or all if searching)
  const { data: perfumesResponse, isLoading, error } = useQuery({
    queryKey: ['perfumes', currentPage, pageSize, searchTerm, selectedFilter, selectedCategory],
    queryFn: () => {
      // If searching, fetch all perfumes to search across entire database
      const shouldFetchAll = searchTerm.trim() !== '' || selectedFilter !== 'all' || selectedCategory !== 'all';
      const limit = shouldFetchAll ? 10000 : pageSize;
      const page = shouldFetchAll ? 1 : currentPage;

      return perfumeAPI.getBulk({ page, limit }).then(res => res.data);
    },
    refetchInterval: 30000, // Refetch every 30 seconds
  });

  // Fetch ALL perfumes for statistics (no pagination)
  // First get total count, then fetch all perfumes
  const { data: allPerfumesResponse } = useQuery({
    queryKey: ['perfumes-all-stats'],
    queryFn: async () => {
      // First request to get total count
      const firstPage = await perfumeAPI.getBulk({ page: 1, limit: 1 }).then(res => res.data);
      const totalCount = firstPage?.pagination?.total || 0;

      // Fetch all perfumes using the total count
      if (totalCount > 0) {
        return perfumeAPI.getBulk({ page: 1, limit: totalCount }).then(res => res.data);
      }
      return { perfumes: [], pagination: { total: 0 } };
    },
    refetchInterval: 30000, // Refetch every 30 seconds
  });

  const perfumesData = perfumesResponse?.perfumes || [];
  const allPerfumesForStats = allPerfumesResponse?.perfumes || [];
  const pagination = perfumesResponse?.pagination || {
    page: 1,
    limit: 12,
    total: 0,
    totalPages: 1,
    hasNextPage: false,
    hasPrevPage: false
  };

  // Fetch bottle sizes for bottling
  const { data: bottleSizesData } = useQuery({
    queryKey: ['bottle-sizes'],
    queryFn: () => perfumeAPI.getBottleSizes().then(res => res.data.sizes),
  });

  // Fetch comprehensive statistics
  const { data: statsData } = useQuery({
    queryKey: ['perfume-stats'],
    queryFn: () => perfumeAPI.getBottleSizes().then(res => res.data),
    refetchInterval: 60000, // Refetch every minute
  });

  // Fetch categories
  const { data: categoriesData } = useQuery({
    queryKey: ['categories'],
    queryFn: () => categoriesAPI.getAll().then(res => res.data),
  });

  // Fetch shops
  const { data: shopsData } = useQuery({
    queryKey: ['shops'],
    queryFn: () => shopsAPI.getAll().then(res => res.data),
  });

  const categories = categoriesData?.flat || [];
  const shops = shopsData?.shops || [];

  const perfumes = perfumesData || [];
  const bottleSizes = bottleSizesData || [];
  const backendStats = statsData || {};

  // Low quantity threshold for warnings
  const LOW_QUANTITY_THRESHOLD = 10;

  // Pricing matrix based on category and bottle size
  const getPricingMatrix = () => {
    return {
      men_women: {
        30: 500,
        50: 500,
        100: 400
      },
      selective_labels: {
        30: 833.3333333333,
        50: 700,
        100: 550
      }
    };
  };

  // Calculate selling price per ml based on category and size
  const getSellingPricePerMl = (category, bottleSize) => {
    const matrix = getPricingMatrix();
    return matrix[category]?.[bottleSize] || 0;
  };

  // Determine pricing category based on selected perfume's category
  const getPricingCategory = () => {
    if (!selectedPerfume || !selectedPerfume.category_name) {
      return 'men_women'; // Default
    }
    const categoryName = selectedPerfume.category_name.toLowerCase();
    return (categoryName.includes('selective labels') || categoryName.includes('selective'))
      ? 'selective_labels'
      : 'men_women';
  };

  // Calculate batch details in real-time
  const calculateBatchDetails = () => {
    if (!selectedPerfume || !bottlingForm.bottle_size || !bottlingForm.quantity) {
      return null;
    }

    const quantity = parseInt(bottlingForm.quantity) || 0;
    const bottleSizeMl = parseInt(bottlingForm.bottle_size);
    const pricingCategory = getPricingCategory();
    const totalMlUsed = quantity * bottleSizeMl;
    const totalLitersUsed = totalMlUsed / 1000;
    const currentStock = parseFloat(selectedPerfume.bulk_quantity_ml) || 0;
    const remainingMl = currentStock - totalMlUsed;

    // Find matching bottle size from database for cost calculation
    const selectedBottleSize = bottleSizes.find(size => size.size_ml === bottleSizeMl);

    // Calculate costs
    const perfumeCostPerMl = parseFloat(selectedPerfume.cost_per_ml) || 0;
    const perfumeCost = totalMlUsed * perfumeCostPerMl;
    const bottleCost = selectedBottleSize ? quantity * (parseFloat(selectedBottleSize.bottle_cost) || 0) : 0;
    const labelCost = selectedBottleSize ? quantity * (parseFloat(selectedBottleSize.label_cost) || 0) : 0;
    const packagingCost = selectedBottleSize ? quantity * (parseFloat(selectedBottleSize.packaging_cost) || 0) : 0;
    const totalCost = perfumeCost + bottleCost + labelCost + packagingCost;
    const unitCost = quantity > 0 ? totalCost / quantity : 0;

    // Calculate selling price based on category and size
    const sellingPricePerMl = getSellingPricePerMl(pricingCategory, bottleSizeMl);
    const sellingPrice = sellingPricePerMl * bottleSizeMl;
    const profitMargin = unitCost > 0 ? ((sellingPrice - unitCost) / unitCost) * 100 : 0;
    const markupMultiplier = unitCost > 0 ? sellingPrice / unitCost : 1;

    // Check bottle availability
    const bottleSizeQuantity = selectedBottleSize ? (parseInt(selectedBottleSize.quantity) || 0) : 0;
    const hasEnoughBottles = bottleSizeQuantity >= quantity;
    const remainingBottles = bottleSizeQuantity - quantity;
    const isLowQuantity = bottleSizeQuantity < LOW_QUANTITY_THRESHOLD;

    return {
      bottlesToCreate: quantity,
      bottleSizeMl,
      totalMlUsed,
      totalLitersUsed,
      currentStock,
      remainingMl,
      canBottle: remainingMl >= 0 && hasEnoughBottles,
      selectedBottleSize,
      bottleSizeQuantity,
      hasEnoughBottles,
      remainingBottles,
      isLowQuantity,
      // Cost breakdown
      perfumeCost,
      bottleCost,
      labelCost,
      packagingCost,
      totalCost,
      unitCost,
      // Pricing
      profitMargin,
      markupMultiplier,
      sellingPricePerMl,
      sellingPrice
    };
  };

  const batchDetails = calculateBatchDetails();

  // Filter perfumes (client-side filtering for search, status, and category)
  const filteredPerfumes = perfumesData
    .filter(perfume => {
      const matchesSearch = perfume.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        perfume.scent_description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        perfume.supplier?.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesFilter = selectedFilter === 'all' ||
        (selectedFilter === 'active' && perfume.is_active) ||
        (selectedFilter === 'inactive' && !perfume.is_active);
      const matchesCategory = selectedCategory === 'all' ||
        perfume.category_id === selectedCategory ||
        perfume.category_name?.toLowerCase().includes(selectedCategory.toLowerCase());
      return matchesSearch && matchesFilter && matchesCategory;
    })
    .sort((a, b) => {
      // Sort so unbottled perfumes appear first, bottled perfumes at the bottom
      const aBottled = (a.used_in_bottling || 0) > 0;
      const bBottled = (b.used_in_bottling || 0) > 0;

      if (aBottled && !bBottled) return 1; // a is bottled, b is not - a goes to bottom
      if (!aBottled && bBottled) return -1; // a is not bottled, b is - a stays on top
      return 0; // Both have same status, keep original order
    });

  // Reset to page 1 when search or filter changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, selectedFilter, selectedCategory]);

  // CSV Export function
  const handleDownloadCSV = async () => {
    try {
      // Fetch all perfumes (not paginated) for export
      const response = await perfumeAPI.getBulk({ page: 1, limit: 10000 });
      const allPerfumes = response.data?.perfumes || [];

      // Filter perfumes based on current filters (same as displayed)
      const perfumesToExport = allPerfumes.filter(perfume => {
        const matchesSearch = perfume.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          perfume.scent_description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          perfume.supplier?.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesFilter = selectedFilter === 'all' ||
          (selectedFilter === 'active' && perfume.is_active) ||
          (selectedFilter === 'inactive' && !perfume.is_active);
        const matchesCategory = selectedCategory === 'all' ||
          perfume.category_id === selectedCategory ||
          perfume.category_name?.toLowerCase().includes(selectedCategory.toLowerCase());
        return matchesSearch && matchesFilter && matchesCategory;
      });

      // Define CSV headers
      const headers = [
        'ID',
        'Name',
        'Category',
        'Scent Description',
        'Bulk Quantity (ML)',
        'Cost per ML',
        'Supplier',
        'Batch Number',
        'Expiry Date',
        'Status',
        'Created At'
      ];

      // Convert perfumes to CSV rows
      const csvRows = perfumesToExport.map(perfume => {
        const row = [
          perfume.id || '',
          perfume.name || '',
          perfume.category_name || '',
          perfume.scent_description || '',
          perfume.bulk_quantity_ml || perfume.total_stock_ml || '0',
          perfume.cost_per_ml || '0',
          perfume.supplier || '',
          perfume.batch_number || '',
          perfume.expiry_date || '',
          perfume.is_active ? 'Active' : 'Inactive',
          perfume.created_at || ''
        ];

        // Escape commas and quotes in CSV
        return row.map(field => {
          const stringField = String(field);
          if (stringField.includes(',') || stringField.includes('"') || stringField.includes('\n')) {
            return `"${stringField.replace(/"/g, '""')}"`;
          }
          return stringField;
        });
      });

      // Combine headers and rows
      const csvContent = [
        headers.join(','),
        ...csvRows.map(row => row.join(','))
      ].join('\n');

      // Create blob and download
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);

      link.setAttribute('href', url);
      link.setAttribute('download', `perfumes_export_${new Date().toISOString().split('T')[0]}.csv`);
      link.style.visibility = 'hidden';

      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      toast.success(`Exported ${perfumesToExport.length} perfume(s) to CSV`);
    } catch (error) {
      console.error('Error exporting CSV:', error);
      toast.error('Failed to export CSV');
    }
  };

  // Mutations
  const createPerfumeMutation = useMutation({
    mutationFn: (perfumeData) => perfumeAPI.createBulk(perfumeData),
    onSuccess: () => {
      queryClient.invalidateQueries(['perfumes']);
      queryClient.invalidateQueries(['perfume-stats']);
      toast.success('Perfume added successfully!');
      resetForm();
      setShowAddModal(false);
    },
    onError: (error) => {
      toast.error(error.response?.data?.error || 'Failed to add perfume');
    }
  });

  const updatePerfumeMutation = useMutation({
    mutationFn: ({ id, data }) => {
      console.log('Sending PUT request to:', `/perfume/bulk/${id}`);
      console.log('Request payload:', JSON.stringify(data, null, 2));
      return api.put(`/perfume/bulk/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['perfumes']);
      queryClient.invalidateQueries(['perfume-stats']);
      queryClient.invalidateQueries(['perfumes-all-stats']);
      toast.success('Perfume updated successfully!');
      resetForm();
      setShowAddModal(false);
      setEditMode(false);
      setSelectedPerfume(null);
    },
    onError: (error) => {
      console.error('Update perfume error - Full error object:', error);
      console.error('Error response:', error.response);
      console.error('Error response data:', error.response?.data);
      console.error('Error response status:', error.response?.status);

      // Handle validation errors
      if (error.response?.data?.errors) {
        const errorMessages = error.response.data.errors.map(err => {
          const field = err.param || err.path || 'field';
          const msg = err.msg || err.message || 'Validation error';
          return `${field}: ${msg}`;
        }).join(', ');
        console.error('Validation errors:', error.response.data.errors);
        toast.error(`Validation error: ${errorMessages}`, { duration: 6000 });
      } else if (error.response?.data?.error) {
        console.error('Server error:', error.response.data.error);
        toast.error(error.response.data.error);
      } else {
        console.error('Unknown error:', error.message);
        toast.error('Failed to update perfume. Check console for details.');
      }
    }
  });

  const deletePerfumeMutation = useMutation({
    mutationFn: (id) => api.delete(`/perfume/bulk/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries(['perfumes']);
      queryClient.invalidateQueries(['perfume-stats']);
      toast.success('Perfume deleted successfully!');
    },
    onError: (error) => {
      toast.error(error.response?.data?.error || 'Failed to delete perfume');
    }
  });

  const bottlePerfumeMutation = useMutation({
    mutationFn: (bottlingData) => perfumeAPI.bottle(bottlingData),
    onSuccess: (response) => {
      const { bottling } = response.data;
      toast.success(
        `Successfully bottled ${bottling.quantity_bottled} bottles!`,
        { duration: 5000 }
      );
      queryClient.invalidateQueries(['perfumes']);
      queryClient.invalidateQueries(['perfume-stats']);
      resetBottlingForm();
      setShowBottleModal(false);
      setSelectedPerfume(null);
    },
    onError: (error) => {
      toast.error(error.response?.data?.error || 'Failed to bottle perfume');
    }
  });

  const quickBottleAllSizesMutation = useMutation({
    mutationFn: (bottlingData) => perfumeAPI.bottleAllSizes(bottlingData),
    onSuccess: (response) => {
      const { message, shops_assigned, remaining_ml } = response.data;
      toast.success(
        `${message}`,
        { duration: 5000 }
      );
      queryClient.invalidateQueries(['perfumes']);
      queryClient.invalidateQueries(['perfume-stats']);
      setQuickBottleShopId('');
      setQuickBottleModalShopId('');
      setShowBottleModal(false);
      setShowQuickBottleModal(false);
      setSelectedPerfume(null);
    },
    onError: (error) => {
      toast.error(error.response?.data?.error || 'Failed to quick bottle perfume');
    }
  });

  const returnShopInventoryMutation = useMutation({
    mutationFn: () => perfumeAPI.returnShopInventory(),
    onSuccess: (response) => {
      const { message, recovered_stats } = response.data;
      toast.success(message);
      if (recovered_stats) {
        toast.success(
          `Recovered: ${recovered_stats.liquid_ml}ML, ${recovered_stats.bottles} bottles`,
          { duration: 6000 }
        );
      }
      queryClient.invalidateQueries(['perfumes']);
      queryClient.invalidateQueries(['perfume-stats']);
    },
    onError: (error) => {
      toast.error(error.response?.data?.error || 'Failed to return shop inventory');
    }
  });

  const bottleAllBulkMutation = useMutation({
    mutationFn: () => perfumeAPI.bottleAllBulk({ shop_id: 'all' }),
    onSuccess: (response) => {
      const { message, results } = response.data;
      if (results) {
        toast.success(`Success: ${results.success}, Skipped: ${results.failed}`, { duration: 5000 });
        if (results.details && results.details.length > 0) {
          console.log('Skipped details:', results.details);
        }
      } else {
        toast.success(message);
      }
      queryClient.invalidateQueries(['perfumes']);
      queryClient.invalidateQueries(['perfume-stats']);
    },
    onError: (error) => {
      toast.error(error.response?.data?.error || 'Failed to bottle all perfumes');
    }
  });

  const handleBottleAllBulk = () => {
    if (window.confirm('Are you sure you want to bottle 1 set (30,50,100ml) of EVERY available bulk perfume? This may take a moment.')) {
      bottleAllBulkMutation.mutate();
    }
  };

  const handleReturnShopInventory = () => {
    if (window.confirm('Are you sure you want to return ALL unsold shop inventory back to bulk stock? This action cannot be undone.')) {
      returnShopInventoryMutation.mutate();
    }
  };

  const handleQuickBottleAllSizes = () => {
    if (!selectedPerfume) return;

    if (!quickBottleShopId) {
      toast.error('Please select a shop or choose "All Shops"');
      return;
    }

    const bottlingData = {
      bulk_perfume_id: selectedPerfume.id,
      shop_id: quickBottleShopId
    };

    if (bottlingForm.batch_number && bottlingForm.batch_number.trim()) {
      bottlingData.batch_number = bottlingForm.batch_number.trim();
    }

    quickBottleAllSizesMutation.mutate(bottlingData);
  };

  // Bottle Size Mutations
  const createBottleSizeMutation = useMutation({
    mutationFn: (data) => perfumeAPI.createBottleSize(data),
    onSuccess: () => {
      queryClient.invalidateQueries(['bottle-sizes']);
      toast.success('Bottle size created successfully!');
      setShowBottleSizeModal(false);
      setSelectedBottleSize(null);
    },
    onError: (error) => {
      toast.error(error.response?.data?.error || 'Failed to create bottle size');
    }
  });

  const updateBottleSizeMutation = useMutation({
    mutationFn: ({ id, data }) => perfumeAPI.updateBottleSize(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['bottle-sizes']);
      toast.success('Bottle size updated successfully!');
      setShowBottleSizeModal(false);
      setSelectedBottleSize(null);
    },
    onError: (error) => {
      toast.error(error.response?.data?.error || 'Failed to update bottle size');
    }
  });

  const deleteBottleSizeMutation = useMutation({
    mutationFn: (id) => perfumeAPI.deleteBottleSize(id),
    onSuccess: () => {
      queryClient.invalidateQueries(['bottle-sizes']);
      toast.success('Bottle size deleted successfully!');
    },
    onError: (error) => {
      toast.error(error.response?.data?.error || 'Failed to delete bottle size');
    }
  });

  // Form handlers
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setPerfumeForm(prev => ({ ...prev, [name]: value }));
  };

  const handleBottlingInputChange = (e) => {
    const { name, value } = e.target;
    setBottlingForm(prev => ({ ...prev, [name]: value }));
  };

  const resetForm = () => {
    setPerfumeForm({
      name: '',
      scent_description: '',
      bulk_quantity_ml: '',
      cost_per_ml: '',
      supplier: '',
      batch_number: '',
      expiry_date: '',
      category_id: ''
    });
  };

  const resetBottlingForm = () => {
    setBottlingForm({
      bottle_size: '',
      quantity: '',
      batch_number: '',
      shop_id: ''
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    // Validate required fields
    if (!perfumeForm.name || !perfumeForm.name.trim()) {
      toast.error('Perfume name is required');
      return;
    }

    // Prepare form data - convert empty expiry_date to null and format date properly
    let formattedExpiryDate = null;
    if (perfumeForm.expiry_date && perfumeForm.expiry_date.trim() !== '') {
      // Convert yyyy-MM-dd to ISO string for backend
      const date = new Date(perfumeForm.expiry_date);
      if (!isNaN(date.getTime())) {
        formattedExpiryDate = date.toISOString();
      }
    }

    // Convert numeric fields to proper types and validate
    const formData = {};

    // Always include name (required)
    if (perfumeForm.name && perfumeForm.name.trim()) {
      formData.name = perfumeForm.name.trim();
    }

    // Only include scent_description if it has a value
    if (perfumeForm.scent_description && perfumeForm.scent_description.trim()) {
      formData.scent_description = perfumeForm.scent_description.trim();
    }

    // Convert and validate bulk_quantity_ml
    if (perfumeForm.bulk_quantity_ml) {
      const quantity = parseInt(perfumeForm.bulk_quantity_ml, 10);
      if (!isNaN(quantity) && quantity > 0) {
        formData.bulk_quantity_ml = quantity;
      }
    }

    // Convert and validate cost_per_ml
    if (perfumeForm.cost_per_ml) {
      const cost = parseFloat(perfumeForm.cost_per_ml);
      if (!isNaN(cost) && cost >= 0) {
        formData.cost_per_ml = cost;
      }
    }

    // Optional string fields
    if (perfumeForm.supplier && perfumeForm.supplier.trim()) {
      formData.supplier = perfumeForm.supplier.trim();
    }

    if (perfumeForm.batch_number && perfumeForm.batch_number.trim()) {
      formData.batch_number = perfumeForm.batch_number.trim();
    }

    // Date field
    if (formattedExpiryDate) {
      formData.expiry_date = formattedExpiryDate;
    }

    // Category ID - only include if valid UUID
    if (perfumeForm.category_id && perfumeForm.category_id.trim() !== '') {
      const categoryId = perfumeForm.category_id.trim();
      // Basic UUID validation
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (uuidRegex.test(categoryId)) {
        formData.category_id = categoryId;
      }
    }

    console.log('Form data being sent:', formData);

    if (editMode && selectedPerfume) {
      updatePerfumeMutation.mutate({ id: selectedPerfume.id, data: formData });
    } else {
      createPerfumeMutation.mutate(formData);
    }
  };

  const handleBottlingSubmit = (e) => {
    e.preventDefault();
    if (!selectedPerfume) return;

    const quantity = parseInt(bottlingForm.quantity);
    if (!quantity || quantity < 1) {
      toast.error('Please enter a valid quantity (minimum 1)');
      return;
    }

    if (!bottlingForm.bottle_size) {
      toast.error('Please select a bottle size');
      return;
    }

    if (!bottlingForm.shop_id) {
      toast.error('Please select a shop');
      return;
    }

    // Check bottle size quantity
    const bottleSizeMl = parseInt(bottlingForm.bottle_size);
    const selectedBottleSize = bottleSizes.find(size => size.size_ml === bottleSizeMl);
    if (selectedBottleSize) {
      const bottleSizeQuantity = parseInt(selectedBottleSize.quantity) || 0;
      if (bottleSizeQuantity < quantity) {
        toast.error(`Insufficient bottle stock! Available: ${bottleSizeQuantity}, Requested: ${quantity}`);
        return;
      }
    }

    const bottlingData = {
      bulk_perfume_id: selectedPerfume.id,
      bottle_size: parseInt(bottlingForm.bottle_size),
      quantity_bottled: quantity,
      shop_id: bottlingForm.shop_id
    };

    // Only include batch_number if it's provided
    if (bottlingForm.batch_number && bottlingForm.batch_number.trim()) {
      bottlingData.batch_number = bottlingForm.batch_number.trim();
    }

    bottlePerfumeMutation.mutate(bottlingData);
  };

  // Helper function to format date from ISO string to yyyy-MM-dd for date input
  const formatDateForInput = (dateString) => {
    if (!dateString) return '';
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return '';
      // Format as yyyy-MM-dd
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    } catch (error) {
      return '';
    }
  };

  const handleEdit = (perfume) => {
    setSelectedPerfume(perfume);
    setPerfumeForm({
      name: perfume.name,
      scent_description: perfume.scent_description || '',
      bulk_quantity_ml: perfume.bulk_quantity_ml,
      cost_per_ml: perfume.cost_per_ml,
      supplier: perfume.supplier || '',
      batch_number: perfume.batch_number || '',
      expiry_date: formatDateForInput(perfume.expiry_date),
      category_id: perfume.category_id || ''
    });
    setEditMode(true);
    setShowAddModal(true);
  };

  const handleDelete = (perfume) => {
    if (window.confirm(`Are you sure you want to delete "${perfume.name}"?`)) {
      deletePerfumeMutation.mutate(perfume.id);
    }
  };

  const handleBottle = (perfume) => {
    setSelectedPerfume(perfume);
    setShowBottleModal(true);
  };

  const handleQuickBottleClick = (perfume) => {
    setSelectedPerfume(perfume);
    setQuickBottleModalShopId('');
    setShowQuickBottleModal(true);
  };

  const handleQuickBottleFromModal = () => {
    if (!selectedPerfume) return;

    if (!quickBottleModalShopId) {
      toast.error('Please select a shop or choose "All Shops"');
      return;
    }

    const bottlingData = {
      bulk_perfume_id: selectedPerfume.id,
      shop_id: quickBottleModalShopId
    };

    if (bottlingForm.batch_number && bottlingForm.batch_number.trim()) {
      bottlingData.batch_number = bottlingForm.batch_number.trim();
    }

    quickBottleAllSizesMutation.mutate(bottlingData);
  };

  const openAddModal = () => {
    setEditMode(false);
    setSelectedPerfume(null);
    resetForm();
    setShowAddModal(true);
  };

  // Calculate real-time statistics from ALL perfumes (not paginated)
  const calculateStats = () => {
    // Use allPerfumesForStats instead of perfumes for accurate statistics
    const allPerfumes = allPerfumesForStats;
    const totalMl = allPerfumes.reduce((sum, p) => sum + (parseFloat(p.total_stock_ml || p.bulk_quantity_ml) || 0), 0);
    const usedMl = allPerfumes.reduce((sum, p) => sum + (parseFloat(p.used_in_bottling || 0) || 0), 0);
    const remainingMl = allPerfumes.reduce((sum, p) => sum + (parseFloat(p.remaining_ml || p.bulk_quantity_ml) || 0), 0);
    const totalValue = allPerfumes.reduce((sum, p) => sum + ((parseFloat(p.remaining_ml || p.bulk_quantity_ml) || 0) * (parseFloat(p.cost_per_ml) || 0)), 0);
    const activePerfumes = allPerfumes.filter(p => p.is_active).length;

    return {
      totalMl: totalMl.toFixed(0),
      usedMl: usedMl.toFixed(0),
      remainingMl: remainingMl.toFixed(0),
      totalValue: totalValue.toFixed(2),
      activePerfumes,
      totalPerfumes: allPerfumes.length
    };
  };

  const frontendStats = calculateStats();

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center">
            <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-red-800 mb-2"><TranslatedText text="Error Loading Perfumes" /></h3>
            <p className="text-red-600 mb-4">{error.message || 'Failed to load perfume data'}</p>
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
            >
              Retry
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded-lg mb-6 w-1/4"></div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="bg-white rounded-xl p-6 shadow-sm">
                  <div className="h-4 bg-gray-200 rounded w-1/2 mb-4"></div>
                  <div className="h-8 bg-gray-200 rounded w-3/4"></div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 sm:py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900"><TranslatedText text="Perfume Management" /></h1>
              <p className="text-gray-600 mt-2">Bulk perfume inventory and bottling system</p>
            </div>
            <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
              <button
                onClick={handleDownloadCSV}
                className="inline-flex items-center justify-center px-4 py-2.5 bg-green-600 text-white font-medium rounded-xl hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 transition-all duration-200 shadow-sm hover:shadow-md text-sm sm:text-base min-h-[44px]"
              >
                <Download className="h-5 w-5 mr-2" />
                <span className="hidden sm:inline">Download CSV</span>
                <span className="sm:hidden">CSV</span>
              </button>
              {isManagerOrAdmin && (
                <>
                  <button
                    onClick={handleBottleAllBulk}
                    disabled={bottleAllBulkMutation.isLoading}
                    className="inline-flex items-center justify-center px-4 py-2.5 bg-blue-600 text-white font-medium rounded-xl hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-all duration-200 shadow-sm hover:shadow-md text-sm sm:text-base min-h-[44px]"
                  >
                    <Beaker className={`h-5 w-5 mr-2 ${bottleAllBulkMutation.isLoading ? 'animate-spin' : ''}`} />
                    <span className="hidden sm:inline">Bottle ALL Inventory</span>
                    <span className="sm:hidden">Bottle ALL</span>
                  </button>

                  <button
                    onClick={handleReturnShopInventory}
                    disabled={returnShopInventoryMutation.isLoading}
                    className="inline-flex items-center justify-center px-4 py-2.5 bg-orange-600 text-white font-medium rounded-xl hover:bg-orange-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500 transition-all duration-200 shadow-sm hover:shadow-md text-sm sm:text-base min-h-[44px]"
                  >
                    <RotateCcw className={`h-5 w-5 mr-2 ${returnShopInventoryMutation.isLoading ? 'animate-spin' : ''}`} />
                    <span className="hidden sm:inline">Return Shop Inventory</span>
                    <span className="sm:hidden">Return</span>
                  </button>
                </>
              )}
              <button
                onClick={() => {
                  setShowBottleSizeListModal(true);
                }}
                className="inline-flex items-center justify-center px-4 py-2.5 bg-white border border-gray-300 text-gray-700 font-medium rounded-xl hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 transition-all duration-200 shadow-sm hover:shadow-md text-sm sm:text-base min-h-[44px]"
              >
                <Package className="h-5 w-5 mr-2" />
                <span className="hidden sm:inline">Manage Bottle Sizes</span>
                <span className="sm:hidden">Bottle Sizes</span>
              </button>
              <button
                onClick={openAddModal}
                className="inline-flex items-center justify-center px-4 py-2.5 bg-gradient-to-r from-blue-600 to-purple-600 text-white font-medium rounded-xl hover:from-blue-700 hover:to-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 text-sm sm:text-base min-h-[44px]"
              >
                <Plus className="h-5 w-5 mr-2" />
                <span className="hidden sm:inline">Add Bulk Perfume</span>
                <span className="sm:hidden">Add Perfume</span>
              </button>
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4 sm:gap-6 mb-6 sm:mb-8">
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
            <div className="flex items-center">
              <div className="p-3 bg-purple-100 rounded-xl">
                <FlaskConical className="h-6 w-6 text-purple-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Bulk Perfumes</p>
                <p className="text-2xl font-bold text-gray-900">{frontendStats.totalPerfumes}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
            <div className="flex items-center">
              <div className="p-3 bg-blue-100 rounded-xl">
                <Wine className="h-6 w-6 text-blue-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Milliliters</p>
                <p className="text-2xl font-bold text-gray-900">{frontendStats.totalMl}ML</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
            <div className="flex items-center">
              <div className="p-3 bg-orange-100 rounded-xl">
                <Package className="h-6 w-6 text-orange-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Used</p>
                <p className="text-2xl font-bold text-orange-600">{frontendStats.usedMl}ML</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
            <div className="flex items-center">
              <div className="p-3 bg-indigo-100 rounded-xl">
                <Package className="h-6 w-6 text-indigo-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Bulk Inventory Value</p>
                <p className="text-2xl font-bold text-indigo-600">RWF {frontendStats.totalValue}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
            <div className="flex items-center">
              <div className="p-3 bg-green-100 rounded-xl">
                <Package className="h-6 w-6 text-green-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Active Perfumes</p>
                <p className="text-2xl font-bold text-gray-900">{frontendStats.activePerfumes}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
            <div className="flex items-center">
              <div className="p-3 bg-orange-100 rounded-xl">
                <DollarSign className="h-6 w-6 text-orange-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Bulk Inventory Value</p>
                <p className="text-2xl font-bold text-gray-900">RWF {parseFloat(frontendStats.totalValue || 0).toLocaleString()}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Filters and Search */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 mb-8">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search perfumes by name, scent, or supplier..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>
            <div className="flex gap-3">
              <select
                value={selectedFilter}
                onChange={(e) => setSelectedFilter(e.target.value)}
                className="px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="all">All Perfumes</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>

              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="all">All Categories</option>
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Perfumes Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredPerfumes.map((perfume) => (
            <div key={perfume.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
              <div className="p-6">
                {/* Perfume Header */}
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center">
                    <div className="w-12 h-12 bg-gradient-to-r from-purple-500 to-pink-600 rounded-xl flex items-center justify-center relative">
                      <FlaskConical className="h-6 w-6 text-white" />
                      {/* Bottled Indicator */}
                      {(perfume.used_in_bottling && perfume.used_in_bottling > 0) && (
                        <div className="absolute -top-1 -right-1 bg-green-500 rounded-full p-0.5 border-2 border-white">
                          <CheckCircle2 className="h-3 w-3 text-white" />
                        </div>
                      )}
                    </div>
                    <div className="ml-3">
                      <div className="flex items-center gap-2">
                        <h3 className="text-lg font-semibold text-gray-900">{perfume.name}</h3>
                        {/* Bottled Badge */}
                        {(perfume.used_in_bottling && perfume.used_in_bottling > 0) && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 border border-green-300">
                            <CheckCircle2 className="h-3 w-3 mr-1" />
                            Bottled
                          </span>
                        )}
                      </div>
                      <div className="text-sm text-gray-500">
                        {perfume.supplier || 'No supplier'}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => handleEdit(perfume)}
                      className="p-2.5 sm:p-2 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors min-h-[44px] min-w-[44px] touch-target flex items-center justify-center"
                      title="Edit Perfume"
                    >
                      <Edit className="h-4 w-4 sm:h-5 sm:w-5" />
                    </button>
                    <button
                      onClick={() => handleDelete(perfume)}
                      className="p-2.5 sm:p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors min-h-[44px] min-w-[44px] touch-target flex items-center justify-center"
                      title="Delete Perfume"
                    >
                      <Trash2 className="h-4 w-4 sm:h-5 sm:w-5" />
                    </button>
                  </div>
                </div>

                {/* Perfume Details */}
                <div className="space-y-3">
                  {perfume.category_name && (
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-600">Category:</span>
                      <span className="font-medium text-purple-600">{perfume.category_name}</span>
                    </div>
                  )}
                  <div className="text-sm text-gray-600">
                    <span className="font-medium">Scent:</span> {perfume.scent_description || 'No description'}
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">Total Stock:</span>
                    <span className="font-semibold text-gray-900">{perfume.total_stock_ml || perfume.bulk_quantity_ml}ML</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">Used:</span>
                    <span className="font-semibold text-orange-600">{perfume.used_in_bottling || 0}ML</span>
                  </div>

                  {/* Usage Progress Bar */}
                  {perfume.total_stock_ml && perfume.used_in_bottling && (
                    <div className="mt-2">
                      <div className="flex justify-between text-xs text-gray-500 mb-1">
                        <span>Usage</span>
                        <span>{((perfume.used_in_bottling / perfume.total_stock_ml) * 100).toFixed(1)}%</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-gradient-to-r from-orange-400 to-red-500 h-2 rounded-full transition-all duration-300"
                          style={{
                            width: `${Math.min((perfume.used_in_bottling / perfume.total_stock_ml) * 100, 100)}%`
                          }}
                        ></div>
                      </div>
                    </div>
                  )}
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">Cost per ML:</span>
                    <span className="font-semibold text-gray-900">RWF {parseFloat(perfume.cost_per_ml || 0).toLocaleString()}</span>
                  </div>
                  {perfume.batch_number && (
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-600">Batch:</span>
                      <span className="font-mono text-gray-900">{perfume.batch_number}</span>
                    </div>
                  )}
                  {perfume.expiry_date && (
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-600">Expiry:</span>
                      <span className="font-mono text-gray-900">{new Date(perfume.expiry_date).toLocaleDateString()}</span>
                    </div>
                  )}
                </div>

                {/* Status and Actions */}
                <div className="mt-4 pt-4 border-t border-gray-100">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${perfume.is_active
                      ? 'bg-green-100 text-green-800'
                      : 'bg-red-100 text-red-800'
                      }`}>
                      {perfume.is_active ? 'Active' : 'Inactive'}
                    </span>
                    <div className="flex gap-2">
                      {isManagerOrAdmin && (
                        <button
                          onClick={() => handleQuickBottleClick(perfume)}
                          className="text-sm sm:text-base text-blue-600 hover:text-blue-700 font-medium px-3 py-2 rounded-lg hover:bg-blue-50 transition-colors min-h-[44px] touch-target border border-blue-200"
                          title="Quick Bottle All Sizes (30ml, 50ml, 100ml)"
                        >
                          Quick Bottle
                        </button>
                      )}
                      <button
                        onClick={() => handleBottle(perfume)}
                        className="text-sm sm:text-base text-purple-600 hover:text-purple-700 font-medium px-3 py-2 rounded-lg hover:bg-purple-50 transition-colors min-h-[44px] touch-target"
                      >
                        Bottle Now
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Empty State */}
        {filteredPerfumes.length === 0 && !isLoading && (
          <div className="text-center py-12">
            <FlaskConical className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2"><TranslatedText text="No perfumes found" /></h3>
            <p className="text-gray-500 mb-6">
              {searchTerm || selectedFilter !== 'all' || selectedCategory !== 'all'
                ? tSync("Try adjusting your search or filter criteria.")
                : tSync("Get started by adding your first bulk perfume.")
              }
            </p>
            <button
              onClick={openAddModal}
              className="inline-flex items-center px-4 py-2 bg-purple-600 text-white font-medium rounded-xl hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500"
            >
              <Plus className="h-5 w-5 mr-2" />
              Add First Perfume
            </button>
          </div>
        )}

        {/* Pagination */}
        {!isLoading && filteredPerfumes.length > 0 && pagination.totalPages > 1 && (
          <div className="mt-8 flex flex-col sm:flex-row items-center justify-between gap-4 bg-white rounded-xl p-4 shadow-sm border border-gray-100">
            <div className="text-sm text-gray-600">
              Showing <span className="font-medium">{(currentPage - 1) * pageSize + 1}</span> to{' '}
              <span className="font-medium">
                {Math.min(currentPage * pageSize, pagination.total)}
              </span>{' '}
              of <span className="font-medium">{pagination.total}</span> perfumes
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                disabled={!pagination.hasPrevPage || isLoading}
                className="px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1 transition-colors"
              >
                <ChevronLeft className="h-4 w-4" />
                Previous
              </button>

              <div className="flex items-center gap-1">
                {Array.from({ length: Math.min(5, pagination.totalPages) }, (_, i) => {
                  let pageNum;
                  if (pagination.totalPages <= 5) {
                    pageNum = i + 1;
                  } else if (currentPage <= 3) {
                    pageNum = i + 1;
                  } else if (currentPage >= pagination.totalPages - 2) {
                    pageNum = pagination.totalPages - 4 + i;
                  } else {
                    pageNum = currentPage - 2 + i;
                  }

                  return (
                    <button
                      key={pageNum}
                      onClick={() => setCurrentPage(pageNum)}
                      disabled={isLoading}
                      className={`px-3 py-2 text-sm font-medium rounded-lg transition-colors ${currentPage === pageNum
                        ? 'bg-purple-600 text-white'
                        : 'text-gray-700 bg-white border border-gray-300 hover:bg-gray-50'
                        } disabled:opacity-50 disabled:cursor-not-allowed`}
                    >
                      {pageNum}
                    </button>
                  );
                })}
              </div>

              <button
                onClick={() => setCurrentPage(prev => Math.min(pagination.totalPages, prev + 1))}
                disabled={!pagination.hasNextPage || isLoading}
                className="px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1 transition-colors"
              >
                Next
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>

            <div className="flex items-center gap-2">
              <label className="text-sm text-gray-600">Per page:</label>
              <select
                value={pageSize}
                onChange={(e) => {
                  setPageSize(Number(e.target.value));
                  setCurrentPage(1);
                }}
                className="px-2 py-1 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              >
                <option value={6}>6</option>
                <option value={12}>12</option>
                <option value={24}>24</option>
                <option value={48}>48</option>
              </select>
            </div>
          </div>
        )}
      </div>

      {/* Add/Edit Perfume Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-2 sm:p-4">
          <div className="bg-white rounded-xl max-w-2xl w-full max-h-[98vh] sm:max-h-[95vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b">
              <div>
                <h3 className="text-xl font-semibold text-gray-900">
                  {editMode ? <TranslatedText text="Edit Perfume" /> : <TranslatedText text="Add New Perfume" />}
                </h3>
                <p className="text-sm text-gray-500 mt-1">
                  {editMode ? <TranslatedText text="Update perfume information" /> : <TranslatedText text="Add a new bulk perfume to inventory" />}
                </p>
              </div>
              <button
                onClick={() => {
                  setShowAddModal(false);
                  setEditMode(false);
                  setSelectedPerfume(null);
                  resetForm();
                }}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <TranslatedText text="Perfume Name" /> *
                  </label>
                  <input
                    type="text"
                    name="name"
                    value={perfumeForm.name}
                    onChange={handleInputChange}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder={tSync("Enter perfume name")}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <TranslatedText text="Supplier" />
                  </label>
                  <input
                    type="text"
                    name="supplier"
                    value={perfumeForm.supplier}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder={tSync("Enter supplier name")}
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <TranslatedText text="Scent Description" /> *
                </label>
                <textarea
                  name="scent_description"
                  value={perfumeForm.scent_description}
                  onChange={handleInputChange}
                  required
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder={tSync("Describe the scent profile")}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <TranslatedText text="Quantity (Milliliters)" /> *
                  </label>
                  <input
                    type="number"
                    name="bulk_quantity_ml"
                    value={perfumeForm.bulk_quantity_ml}
                    onChange={handleInputChange}
                    required
                    step="1"
                    min="1"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="0"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <TranslatedText text="Cost per Milliliter (RWF)" /> *
                  </label>
                  <input
                    type="number"
                    name="cost_per_ml"
                    value={perfumeForm.cost_per_ml}
                    onChange={handleInputChange}
                    required
                    step="0.0001"
                    min="0"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="0.0000"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <TranslatedText text="Batch Number" />
                  </label>
                  <input
                    type="text"
                    name="batch_number"
                    value={perfumeForm.batch_number}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder={tSync("Enter batch number")}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <TranslatedText text="Category" />
                  </label>
                  <select
                    name="category_id"
                    value={perfumeForm.category_id}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="">{tSync("Select a category")}</option>
                    {categories.map(category => (
                      <option key={category.id} value={category.id}>
                        {category.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <TranslatedText text="Expiry Date" /> <span className="text-gray-400 text-xs"><TranslatedText text="(Optional)" /></span>
                  </label>
                  <input
                    type="date"
                    name="expiry_date"
                    value={perfumeForm.expiry_date}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>

              <div className="flex justify-end space-x-3 pt-6 border-t">
                <button
                  type="button"
                  onClick={() => {
                    setShowAddModal(false);
                    setEditMode(false);
                    setSelectedPerfume(null);
                    resetForm();
                  }}
                  className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createPerfumeMutation.isLoading || updatePerfumeMutation.isLoading}
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
                >
                  {(createPerfumeMutation.isLoading || updatePerfumeMutation.isLoading) ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      {editMode ? <TranslatedText text="Updating..." /> : <TranslatedText text="Adding..." />}
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4 mr-2" />
                      {editMode ? <TranslatedText text="Update Perfume" /> : <TranslatedText text="Add Perfume" />}
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Bottling Modal */}
      {showBottleModal && selectedPerfume && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-2 sm:p-4">
          <div className="bg-white rounded-xl max-w-2xl w-full max-h-[98vh] sm:max-h-[95vh] overflow-y-auto">
            <div className="flex items-center justify-between p-4 sm:p-6 border-b">
              <div>
                <h3 className="text-xl font-semibold text-gray-900"><TranslatedText text="Bottle Perfume" /></h3>
                <p className="text-sm text-gray-500 mt-1">
                  <TranslatedText text="Convert bulk perfume to bottled products" />
                </p>
              </div>
              <button
                onClick={() => {
                  setShowBottleModal(false);
                  setSelectedPerfume(null);
                  resetBottlingForm();
                }}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            <div className="p-4 sm:p-6">
              {/* Perfume Info */}
              <div className="bg-gray-50 rounded-lg p-4 mb-6">
                <h4 className="font-medium text-gray-900 mb-2">Selected Perfume</h4>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-gray-600">Name:</span>
                    <span className="ml-2 font-medium">{selectedPerfume.name}</span>
                  </div>
                  <div>
                    <span className="text-gray-600">Available:</span>
                    <span className="ml-2 font-medium">{selectedPerfume.bulk_quantity_ml}ML</span>
                  </div>
                  <div>
                    <span className="text-gray-600">Cost/ML:</span>
                    <span className="ml-2 font-medium">RWF {parseFloat(selectedPerfume.cost_per_ml || 0).toLocaleString()}</span>
                  </div>
                  <div>
                    <span className="text-gray-600">Supplier:</span>
                    <span className="ml-2 font-medium">{selectedPerfume.supplier || 'N/A'}</span>
                  </div>
                </div>
              </div>

              <form onSubmit={handleBottlingSubmit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      <TranslatedText text="Bottle Size (ML)" /> *
                    </label>
                    <select
                      name="bottle_size"
                      value={bottlingForm.bottle_size}
                      onChange={handleBottlingInputChange}
                      required
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="">{tSync("Select bottle size")}</option>
                      <option value="30">30 ML</option>
                      <option value="50">50 ML</option>
                      <option value="100">100 ML</option>
                    </select>
                    {bottlingForm.bottle_size && (() => {
                      const bottleSizeMl = parseInt(bottlingForm.bottle_size);
                      const selectedSize = bottleSizes.find(s => s.size_ml === bottleSizeMl);
                      if (selectedSize) {
                        const quantity = parseInt(selectedSize.quantity) || 0;
                        const isLow = quantity < LOW_QUANTITY_THRESHOLD;
                        if (isLow) {
                          return (
                            <div className="mt-2 p-2 bg-yellow-50 border border-yellow-200 rounded text-yellow-800 text-xs flex items-center">
                              <AlertCircle className="h-4 w-4 mr-2" />
                              <span><strong>Warning:</strong> Low stock! Only {quantity} bottles available for this size.</span>
                            </div>
                          );
                        }
                      }
                      return null;
                    })()}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      <TranslatedText text="Quantity to Bottle" /> *
                    </label>
                    <input
                      type="number"
                      name="quantity"
                      value={bottlingForm.quantity}
                      onChange={handleBottlingInputChange}
                      required
                      min="1"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Enter quantity"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      <TranslatedText text="Shop to Assign" /> *
                    </label>
                    <select
                      name="shop_id"
                      value={bottlingForm.shop_id}
                      onChange={handleBottlingInputChange}
                      required
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="">{tSync("Select shop")}</option>
                      {shops.map(shop => (
                        <option key={shop.id} value={shop.id}>{shop.name}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Bottling Batch Number
                  </label>
                  <input
                    type="text"
                    name="batch_number"
                    value={bottlingForm.batch_number}
                    onChange={handleBottlingInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder={tSync("Enter bottling batch number (optional)")}
                  />
                </div>

                {/* Display calculated selling price per ml */}
                {bottlingForm.bottle_size && selectedPerfume && (
                  <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                    <p className="text-sm text-green-800">
                      <strong>Selling Price per ML:</strong> RWF {getSellingPricePerMl(getPricingCategory(), parseInt(bottlingForm.bottle_size)).toLocaleString()}
                      {selectedPerfume.category_name && (
                        <span className="ml-2 text-xs text-gray-600">
                          ({selectedPerfume.category_name})
                        </span>
                      )}
                    </p>
                  </div>
                )}

                {/* Batch Calculation Display */}
                {batchDetails && (
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 sm:p-4">
                    <h4 className="font-medium text-blue-900 mb-3 flex items-center text-sm sm:text-base">
                      <BarChart3 className="h-4 w-4 mr-2" />
                      Batch Calculation Summary
                    </h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 text-xs sm:text-sm">
                      <div className="space-y-2">
                        <h5 className="font-medium text-blue-800 mb-2">📦 Production Details</h5>
                        <div className="flex justify-between">
                          <span className="text-blue-700">Bottles to Create:</span>
                          <span className="font-medium text-blue-900">{batchDetails.bottlesToCreate}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-blue-700">Bottle Size:</span>
                          <span className="font-medium text-blue-900">{batchDetails.bottleSizeMl}ml</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-blue-700">Total Volume Used:</span>
                          <span className="font-medium text-blue-900">{batchDetails.totalLitersUsed.toFixed(3)}L</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-blue-700">Current Stock:</span>
                          <span className="font-medium text-blue-900">{batchDetails.currentStock}ML</span>
                        </div>
                        <div className="flex justify-between border-t pt-2 mt-2">
                          <span className="text-blue-700">Bottle Stock Available:</span>
                          <span className="font-medium text-blue-900">{batchDetails.bottleSizeQuantity || 0}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-blue-700">Bottles Used (Total):</span>
                          <span className="font-medium text-blue-600">
                            {batchDetails.selectedBottleSize?.used_quantity || 0}
                          </span>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <h5 className="font-medium text-blue-800 mb-2">💰 Cost Breakdown</h5>
                        <div className="flex justify-between">
                          <span className="text-blue-700">Perfume Cost:</span>
                          <span className="font-medium text-blue-900">RWF {batchDetails.perfumeCost.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-blue-700">Bottle Cost:</span>
                          <span className="font-medium text-blue-900">RWF {batchDetails.bottleCost.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-blue-700">Label Cost:</span>
                          <span className="font-medium text-blue-900">RWF {batchDetails.labelCost.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-blue-700">Packaging Cost:</span>
                          <span className="font-medium text-blue-900">RWF {batchDetails.packagingCost.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between border-t pt-1">
                          <span className="text-blue-700 font-medium">Total Cost:</span>
                          <span className="font-bold text-blue-900">RWF {batchDetails.totalCost.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-blue-700 font-medium">Unit Cost:</span>
                          <span className="font-bold text-blue-900">RWF {batchDetails.unitCost.toLocaleString()}</span>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <h5 className="font-medium text-blue-800 mb-2">💵 Pricing</h5>
                        <div className="flex justify-between">
                          <span className="text-blue-700">Selling Price per ML:</span>
                          <span className="font-medium text-blue-900">RWF {batchDetails.sellingPricePerMl?.toLocaleString() || '0'}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-blue-700">Bottle Size:</span>
                          <span className="font-medium text-blue-900">{batchDetails.bottleSizeMl}ml</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-blue-700">Calculated Profit Margin:</span>
                          <span className="font-medium text-blue-900">{batchDetails.profitMargin.toFixed(2)}%</span>
                        </div>
                        <div className="flex justify-between border-t pt-1">
                          <span className="text-blue-700 font-medium">Selling Price:</span>
                          <span className="font-bold text-green-600">RWF {batchDetails.sellingPrice.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-blue-700">Profit per Bottle:</span>
                          <span className="font-bold text-green-600">RWF {(batchDetails.sellingPrice - batchDetails.unitCost).toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-blue-700">Status:</span>
                          <span className={`font-medium flex items-center ${batchDetails.canBottle ? 'text-green-600' : 'text-red-600'}`}>
                            {batchDetails.canBottle ? (
                              <>
                                <CheckCircle className="h-3 w-3 mr-1" />
                                Ready to Bottle
                              </>
                            ) : (
                              <>
                                <AlertCircle className="h-3 w-3 mr-1" />
                                Insufficient Stock
                              </>
                            )}
                          </span>
                        </div>
                      </div>
                    </div>
                    {!batchDetails.canBottle && (
                      <div className="mt-3 p-2 bg-red-100 border border-red-200 rounded text-red-700 text-xs">
                        <strong>Warning:</strong> You cannot bottle {batchDetails.bottlesToCreate} bottles of {batchDetails.bottleSizeMl}ml.
                        {!batchDetails.hasEnoughBottles ? (
                          <span> Insufficient bottle stock! Available: {batchDetails.bottleSizeQuantity}, Requested: {batchDetails.bottlesToCreate}.</span>
                        ) : (
                          <span> Maximum possible: {Math.floor((batchDetails.currentStock * 1000) / batchDetails.bottleSizeMl)} bottles.</span>
                        )}
                      </div>
                    )}
                    {batchDetails && batchDetails.canBottle && batchDetails.isLowQuantity && (
                      <div className="mt-3 p-2 bg-yellow-100 border border-yellow-200 rounded text-yellow-800 text-xs flex items-center">
                        <AlertCircle className="h-4 w-4 mr-2" />
                        <span><strong>Warning:</strong> Low bottle stock! Only {batchDetails.bottleSizeQuantity} bottles available.</span>
                      </div>
                    )}
                  </div>
                )}

                {/* Quick Bottle All Sizes Section (Manager & Admin) */}
                {isManagerOrAdmin && (
                  <div className="mt-6 pt-6 border-t border-gray-200">
                    <div className="bg-gradient-to-r from-purple-50 to-blue-50 rounded-lg p-4 mb-4">
                      <h4 className="font-semibold text-gray-900 mb-2 flex items-center">
                        <Package className="h-5 w-5 mr-2 text-purple-600" />
                        Quick Bottle All Sizes
                      </h4>
                      <p className="text-sm text-gray-600 mb-4">
                        Automatically bottle this perfume in all three sizes (30ml, 50ml, 100ml) with quantity 1 each for the selected shop(s).
                      </p>
                      <div className="mb-4">
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Select Shop *
                        </label>
                        <select
                          value={quickBottleShopId}
                          onChange={(e) => setQuickBottleShopId(e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                        >
                          <option value="">Select shop or choose "All Shops"</option>
                          <option value="all">All Shops</option>
                          {shops.map(shop => (
                            <option key={shop.id} value={shop.id}>{shop.name}</option>
                          ))}
                        </select>
                      </div>
                      <button
                        type="button"
                        onClick={handleQuickBottleAllSizes}
                        disabled={quickBottleAllSizesMutation.isLoading || !quickBottleShopId || !selectedPerfume}
                        className="w-full px-6 py-3 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-lg hover:from-purple-700 hover:to-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center font-medium"
                      >
                        {quickBottleAllSizesMutation.isLoading ? (
                          <>
                            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                            Bottling All Sizes...
                          </>
                        ) : (
                          <>
                            <Package className="h-5 w-5 mr-2" />
                            Quick Bottle All Sizes (30ml, 50ml, 100ml)
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                )}

                <div className="flex justify-end space-x-3 pt-6 border-t">
                  <button
                    type="button"
                    onClick={() => {
                      setShowBottleModal(false);
                      setSelectedPerfume(null);
                      resetBottlingForm();
                      setQuickBottleShopId('');
                    }}
                    className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={bottlePerfumeMutation.isLoading || (batchDetails && !batchDetails.canBottle)}
                    className="px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
                  >
                    {bottlePerfumeMutation.isLoading ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        Bottling...
                      </>
                    ) : (
                      <>
                        <Wine className="h-4 w-4 mr-2" />
                        Start Bottling
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Bottle Size List Modal */}
      {showBottleSizeListModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-2 sm:p-4">
          <div className="bg-white rounded-xl max-w-4xl w-full max-h-[98vh] sm:max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b">
              <div>
                <h3 className="text-xl font-semibold text-gray-900"><TranslatedText text="Manage Bottle Sizes" /></h3>
                <p className="text-sm text-gray-500 mt-1"><TranslatedText text="Create and manage bottle size configurations" /></p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    setSelectedBottleSize(null);
                    setShowBottleSizeModal(true);
                  }}
                  className="inline-flex items-center px-3 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700"
                >
                  <Plus className="h-4 w-4 mr-1" />
                  <TranslatedText text="Add Size" />
                </button>
                <button
                  onClick={() => {
                    setShowBottleSizeListModal(false);
                    setSelectedBottleSize(null);
                  }}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>
            </div>

            <div className="p-4 sm:p-6">
              {bottleSizes.length === 0 ? (
                <div className="text-center py-12">
                  <Package className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2"><TranslatedText text="No bottle sizes found" /></h3>
                  <p className="text-gray-500 mb-6">Get started by adding your first bottle size.</p>
                  <button
                    onClick={() => {
                      setSelectedBottleSize(null);
                      setShowBottleSizeModal(true);
                    }}
                    className="inline-flex items-center px-4 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700"
                  >
                    <Plus className="h-5 w-5 mr-2" />
                    <TranslatedText text="Add First Bottle Size" />
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
                  {bottleSizes.map((size) => (
                    <div key={size.id} className="bg-gray-50 rounded-lg p-4 border border-gray-200 hover:border-blue-300 transition-colors">
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <h4 className="text-lg font-semibold text-gray-900">{size.size_ml}ml</h4>
                          <p className="text-sm text-gray-500">Bottle Size</p>
                        </div>
                        <div className="flex gap-1">
                          <button
                            onClick={() => {
                              setSelectedBottleSize(size);
                              setShowBottleSizeModal(true);
                            }}
                            className="p-1 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded"
                            title="Edit"
                          >
                            <Edit className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => {
                              if (window.confirm(`Delete bottle size ${size.size_ml}ml?`)) {
                                deleteBottleSizeMutation.mutate(size.id);
                              }
                            }}
                            className="p-1 text-red-600 hover:text-red-800 hover:bg-red-50 rounded"
                            title="Delete"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-gray-600">Bottle Cost:</span>
                          <span className="font-medium">RWF {parseFloat(size.bottle_cost || 0).toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Label Cost:</span>
                          <span className="font-medium">RWF {parseFloat(size.label_cost || 0).toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Packaging Cost:</span>
                          <span className="font-medium">RWF {parseFloat(size.packaging_cost || 0).toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between border-t pt-2 mt-2">
                          <span className="text-gray-600 font-medium">Total Cost:</span>
                          <span className="font-semibold text-blue-600">
                            RWF {(parseFloat(size.bottle_cost || 0) + parseFloat(size.label_cost || 0) + parseFloat(size.packaging_cost || 0)).toLocaleString()}
                          </span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-gray-600">Stock Quantity:</span>
                          <span className={`font-medium flex items-center ${(parseInt(size.quantity) || 0) < LOW_QUANTITY_THRESHOLD ? 'text-yellow-600' : 'text-gray-900'}`}>
                            {size.quantity || 0}
                            {(parseInt(size.quantity) || 0) < LOW_QUANTITY_THRESHOLD && (
                              <AlertCircle className="h-4 w-4 ml-1 text-yellow-600" />
                            )}
                          </span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-gray-600">Used Quantity:</span>
                          <span className="font-medium text-blue-600">
                            {size.used_quantity || 0}
                          </span>
                        </div>
                        {(parseInt(size.quantity) || 0) < LOW_QUANTITY_THRESHOLD && (
                          <div className="mt-2 p-2 bg-yellow-50 border border-yellow-200 rounded text-yellow-800 text-xs flex items-center">
                            <AlertCircle className="h-3 w-3 mr-1" />
                            <span>Low stock warning</span>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Bottle Size Form Modal */}
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
        />
      )}

      {/* Quick Bottle All Sizes Modal */}
      {showQuickBottleModal && selectedPerfume && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-2 sm:p-4">
          <div className="bg-white rounded-xl max-w-md w-full">
            <div className="flex items-center justify-between p-4 sm:p-6 border-b">
              <div>
                <h3 className="text-xl font-semibold text-gray-900"><TranslatedText text="Quick Bottle All Sizes" /></h3>
                <p className="text-sm text-gray-500 mt-1">
                  <TranslatedText text="Bottle {name} in all sizes (30ml, 50ml, 100ml)" params={{ name: selectedPerfume.name }} />
                </p>
              </div>
              <button
                onClick={() => {
                  setShowQuickBottleModal(false);
                  setSelectedPerfume(null);
                  setQuickBottleModalShopId('');
                }}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            <div className="p-4 sm:p-6">
              {/* Perfume Info */}
              <div className="bg-gray-50 rounded-lg p-4 mb-6">
                <h4 className="font-medium text-gray-900 mb-2">Selected Perfume</h4>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-gray-600">Name:</span>
                    <span className="ml-2 font-medium">{selectedPerfume.name}</span>
                  </div>
                  <div>
                    <span className="text-gray-600">Available:</span>
                    <span className="ml-2 font-medium">{selectedPerfume.bulk_quantity_ml}ML</span>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Select Shop *
                  </label>
                  <select
                    value={quickBottleModalShopId}
                    onChange={(e) => setQuickBottleModalShopId(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  >
                    <option value="">Select shop or choose "All Shops"</option>
                    <option value="all">All Shops</option>
                    {shops.map(shop => (
                      <option key={shop.id} value={shop.id}>{shop.name}</option>
                    ))}
                  </select>
                  <p className="mt-2 text-xs text-gray-500">
                    Each shop will receive 1 unit of 30ml, 50ml, and 100ml
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Batch Number (Optional)
                  </label>
                  <input
                    type="text"
                    value={bottlingForm.batch_number}
                    onChange={(e) => handleBottlingInputChange({ target: { name: 'batch_number', value: e.target.value } })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    placeholder="Enter batch number (optional)"
                  />
                </div>

                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                  <p className="text-sm text-blue-800">
                    <strong>Note:</strong> This will create 1 unit of each size (30ml, 50ml, 100ml) for the selected shop(s).
                    Total: {quickBottleModalShopId === 'all' ? shops.length * 3 : quickBottleModalShopId ? 3 : 0} bottles will be created.
                  </p>
                </div>
              </div>

              <div className="flex justify-end space-x-3 pt-6 border-t mt-6">
                <button
                  type="button"
                  onClick={() => {
                    setShowQuickBottleModal(false);
                    setSelectedPerfume(null);
                    setQuickBottleModalShopId('');
                  }}
                  className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleQuickBottleFromModal}
                  disabled={quickBottleAllSizesMutation.isLoading || !quickBottleModalShopId}
                  className="px-6 py-2 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-lg hover:from-purple-700 hover:to-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
                >
                  {quickBottleAllSizesMutation.isLoading ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Bottling...
                    </>
                  ) : (
                    <>
                      <Package className="h-4 w-4 mr-2" />
                      Quick Bottle All Sizes
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Bottle Size Modal Component
const BottleSizeModal = ({ onClose, onSubmit, bottleSize, isLoading }) => {
  const { tSync } = useTranslation();
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

  const formatCurrency = (amount) => {
    return `RWF ${parseFloat(amount || 0).toLocaleString()}`;
  };

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div className="relative top-10 mx-auto p-6 border w-11/12 max-w-2xl shadow-lg rounded-md bg-white">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-xl font-semibold text-gray-900">
            {bottleSize ? <TranslatedText text="Edit Bottle Size" /> : <TranslatedText text="Add New Bottle Size" />}
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
                <TranslatedText text="Size in ml" /> *
              </label>
              <input
                type="number"
                min="1"
                step="1"
                value={formData.size_ml}
                onChange={(e) => handleInputChange('size_ml', parseFloat(e.target.value) || '')}
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${errors.size_ml ? 'border-red-500' : 'border-gray-300'
                  }`}
                placeholder={tSync("e.g., 50")}
                required
              />
              {errors.size_ml && (
                <p className="mt-1 text-sm text-red-600">{errors.size_ml}</p>
              )}
            </div>

            {/* Bottle Cost */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <TranslatedText text="Bottle Cost (RWF)" /> *
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
                <TranslatedText text="Label Cost (RWF)" />
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
                <TranslatedText text="Packaging Cost (RWF)" />
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
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <TranslatedText text="Quantity (Stock)" /> *
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
              <p className="mt-1 text-xs text-gray-500"><TranslatedText text="Number of bottles in stock for this size" /></p>
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
              <TranslatedText text="Cancel" />
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <div className="flex items-center">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  {bottleSize ? <TranslatedText text="Updating..." /> : <TranslatedText text="Creating..." />}
                </div>
              ) : (
                bottleSize ? <TranslatedText text="Update Bottle Size" /> : <TranslatedText text="Create Bottle Size" />
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default Perfumes; 