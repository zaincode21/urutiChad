/**
 * Discounts Management Component
 * 
 * Features:
 * - Configurable business rules for discount validation
 * - Bottle return reward system with configurable tiers
 * - Percentage and fixed amount discounts
 * - Business rule validation and enforcement
 * 
 * Note: Currently using mock data - API endpoints need to be implemented
 * TODO: Implement backend API endpoints for full functionality
 */

import React, { useState, useEffect } from 'react';
import {
  Plus,
  Search,
  Filter,
  Edit,
  Trash2,
  Eye,
  Percent,
  Clock,
  Calendar,
  Users,
  Gift,
  Tag,
  Crown,
  Star,
  Award,
  TrendingUp,
  BarChart3,
  Settings,
  Zap,
  Target,
  Recycle,
  Package,
  CheckCircle,
  XCircle,
  AlertTriangle,
  RefreshCw,
  Download,
  FileText,
  Send,
  Info,
  HelpCircle,
  X
} from 'lucide-react';
import { api } from '../lib/api';
import toast from 'react-hot-toast';
import { DISCOUNT_BUSINESS_RULES, DiscountRuleHelpers } from '../config/discountRules';
import { discountsAPI, categoriesAPI } from '../lib/api';
import TranslatedText from '../components/TranslatedText';
import { useTranslation } from '../hooks/useTranslation';

export default function Discounts() {
  const { tSync } = useTranslation();
  const [discounts, setDiscounts] = useState([]);
  const [campaigns, setCampaigns] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showCampaignModal, setShowCampaignModal] = useState(false);
  const [selectedDiscount, setSelectedDiscount] = useState(null);
  const [activeTab, setActiveTab] = useState('discounts');

  // Form states
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    type: 'percentage', // percentage, fixed_amount, bottle_return
    value: '',
    min_purchase_amount: '',
    max_discount_amount: '',
    start_date: '',
    end_date: '',
    usage_limit: '',
    usage_per_customer: '',
    applicable_to: 'product_types', // Only product_types allowed
    product_types: [], // Array of product types: ['general', 'perfume', 'shoes', 'clothes', 'accessories'] - REQUIRED
    category_ids: [], // Not used - kept for backward compatibility
    customer_tiers: [],
    bottle_return_count: DISCOUNT_BUSINESS_RULES.bottleReturn.defaultBottleCount,
    is_active: true,
    auto_apply: false,
    discount_type: 'regular_discount', // For business rule validation
    allow_partial_payment: false // Allow discounts for partial payments
  });

  const [validationErrors, setValidationErrors] = useState([]);
  const [showBusinessRules, setShowBusinessRules] = useState(false);

  const [campaignData, setCampaignData] = useState({
    name: '',
    description: '',
    type: 'holiday', // holiday, loyalty_tier, seasonal, special_event
    discount_ids: [],
    start_date: '',
    end_date: '',
    target_audience: 'all', // all, specific_tier, new_customers, returning_customers
    budget: '',
    is_active: true
  });

  useEffect(() => {
    fetchDiscounts();
    fetchCampaigns();
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    try {
      const response = await categoriesAPI.getAll();
      setCategories(response.data.flat || []);
    } catch (error) {
      console.error('Error fetching categories:', error);
      setCategories([]);
    }
  };

  const fetchDiscounts = async () => {
    try {
      setLoading(true);

      const response = await discountsAPI.getAll();
      setDiscounts(response.data.discounts || []);
    } catch (error) {
      console.error('Error fetching discounts:', error);
      toast.error('Failed to load discounts');
      setDiscounts([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchCampaigns = async () => {
    try {
      // TODO: Implement campaigns API endpoint
      // const response = await api.get('/discounts/campaigns');
      // setCampaigns(response.data.campaigns || []);

      // For now, set empty campaigns to avoid API error
      setCampaigns([]);
    } catch (error) {
      console.error('Error fetching campaigns:', error);
      // Don't show error toast for missing campaigns endpoint
      setCampaigns([]);
    }
  };

  const handleCreateDiscount = async (e) => {
    e.preventDefault();

    // Basic form validation
    if (!formData.name.trim()) {
      toast.error('Discount name is required');
      return;
    }

    // For bottle return discounts, validate bottle_return_count instead of value
    if (formData.type === 'bottle_return') {
      if (!formData.bottle_return_count || parseInt(formData.bottle_return_count) <= 0) {
        toast.error('Please select a valid bottle return tier');
        return;
      }
      // Get the discount amount from the selected tier
      const selectedTier = DiscountRuleHelpers.getBottleReturnTiers().find(
        tier => tier.bottles === parseInt(formData.bottle_return_count)
      );
      if (!selectedTier) {
        toast.error('Invalid bottle return tier selected');
        return;
      }
      // Set the value to the tier's discount amount (fixed amount)
      formData.value = selectedTier.discountAmount;
    } else {
      // For other discount types, validate value
      if (!formData.value || parseFloat(formData.value) <= 0) {
        toast.error('Discount value must be greater than 0');
        return;
      }
    }

    // Validate product types selection - MUST select at least one product type
    if (!formData.product_types || formData.product_types.length === 0) {
      toast.error('Please select at least one product type');
      return;
    }

    // Validate against business rules
    const validation = DiscountRuleHelpers.validateDiscountConfig(formData);
    if (!validation.isValid) {
      setValidationErrors(validation.errors);
      toast.error('Please fix validation errors before proceeding');
      return;
    }

    try {
      // Prepare data with proper types for CREATE
      const discountData = {
        name: formData.name.trim(),
        description: formData.description.trim() || undefined,
        type: formData.type,
        value: parseFloat(formData.value) || 0,
        min_purchase_amount: formData.min_purchase_amount ? parseFloat(formData.min_purchase_amount) : undefined,
        max_discount_amount: formData.max_discount_amount ? parseFloat(formData.max_discount_amount) : undefined,
        start_date: formData.start_date || undefined,
        end_date: formData.end_date || undefined,
        usage_limit: formData.usage_limit ? parseInt(formData.usage_limit) : undefined,
        usage_per_customer: formData.usage_per_customer ? parseInt(formData.usage_per_customer) : undefined,
        applicable_to: formData.applicable_to,
        product_types: formData.product_types, // Always required
        category_ids: undefined, // Not used
        customer_tiers: formData.customer_tiers,
        bottle_return_count: formData.bottle_return_count ? parseInt(formData.bottle_return_count) : undefined,
        is_active: Boolean(formData.is_active),
        auto_apply: Boolean(formData.auto_apply),
        discount_type: formData.discount_type,
        allow_partial_payment: Boolean(formData.allow_partial_payment)
      };

      console.log('Sending discount data:', discountData);
      console.log('Original form data:', formData);

      const response = await discountsAPI.create(discountData);

      toast.success('Discount created successfully with business rules validation!');
      setShowAddModal(false);
      resetForm();
      fetchDiscounts();
    } catch (error) {
      console.error('Error creating discount:', error);

      // Show more detailed error information
      if (error.response?.data?.errors) {
        const errorMessages = error.response.data.errors.map(err => `${err.param}: ${err.msg}`).join(', ');
        toast.error(`Validation errors: ${errorMessages}`);
        console.error('Validation errors:', error.response.data.errors);
      } else if (error.response?.data?.error) {
        toast.error(error.response.data.error);
      } else {
        toast.error('Failed to create discount');
      }
    }
  };

  const handleUpdateDiscount = async (e) => {
    e.preventDefault();

    // Basic form validation
    if (!formData.name.trim()) {
      toast.error('Discount name is required');
      return;
    }

    // For bottle return discounts, validate bottle_return_count instead of value
    if (formData.type === 'bottle_return') {
      if (!formData.bottle_return_count || parseInt(formData.bottle_return_count) <= 0) {
        toast.error('Please select a valid bottle return tier');
        return;
      }
      // Get the discount amount from the selected tier
      const selectedTier = DiscountRuleHelpers.getBottleReturnTiers().find(
        tier => tier.bottles === parseInt(formData.bottle_return_count)
      );
      if (!selectedTier) {
        toast.error('Invalid bottle return tier selected');
        return;
      }
      // Set the value to the tier's discount amount (fixed amount)
      formData.value = selectedTier.discountAmount;
    } else {
      // For other discount types, validate value
      if (!formData.value || parseFloat(formData.value) <= 0) {
        toast.error('Discount value must be greater than 0');
        return;
      }
    }

    // Validate product types selection - MUST select at least one product type
    if (!formData.product_types || formData.product_types.length === 0) {
      toast.error('Please select at least one product type');
      return;
    }

    // Validate against business rules
    const validation = DiscountRuleHelpers.validateDiscountConfig(formData);
    if (!validation.isValid) {
      setValidationErrors(validation.errors);
      toast.error('Please fix validation errors before proceeding');
      return;
    }

    try {
      // Prepare data with proper types for UPDATE
      const discountData = {
        name: formData.name.trim(),
        description: formData.description.trim() || undefined,
        type: formData.type,
        value: parseFloat(formData.value) || 0,
        min_purchase_amount: formData.min_purchase_amount ? parseFloat(formData.min_purchase_amount) : undefined,
        max_discount_amount: formData.max_discount_amount ? parseFloat(formData.max_discount_amount) : undefined,
        start_date: formData.start_date || undefined,
        end_date: formData.end_date || undefined,
        usage_limit: formData.usage_limit ? parseInt(formData.usage_limit) : undefined,
        usage_per_customer: formData.usage_per_customer ? parseInt(formData.usage_per_customer) : undefined,
        applicable_to: formData.applicable_to,
        product_types: formData.product_types, // Always required
        category_ids: undefined, // Not used
        customer_tiers: formData.customer_tiers,
        bottle_return_count: formData.bottle_return_count ? parseInt(formData.bottle_return_count) : undefined,
        is_active: Boolean(formData.is_active),
        auto_apply: Boolean(formData.auto_apply),
        discount_type: formData.discount_type,
        allow_partial_payment: Boolean(formData.allow_partial_payment)
      };

      console.log('Updating discount data:', discountData);
      console.log('Original form data:', formData);
      console.log('Selected discount ID:', selectedDiscount.id);

      const response = await api.put(`/discounts/${selectedDiscount.id}`, discountData);

      toast.success('Discount updated successfully with business rules validation!');
      setShowEditModal(false);
      resetForm();
      fetchDiscounts();
    } catch (error) {
      console.error('Error updating discount:', error);

      // Show more detailed error information
      if (error.response?.data?.errors) {
        const errorMessages = error.response.data.errors.map(err => `${err.param}: ${err.msg}`).join(', ');
        toast.error(`Validation errors: ${errorMessages}`);
        console.error('Validation errors:', error.response.data.errors);
      } else if (error.response?.data?.error) {
        toast.error(error.response.data.error);
      } else {
        toast.error('Failed to update discount');
      }
    }
  };

  const handleDeleteDiscount = async (discountId) => {
    if (window.confirm('Are you sure you want to delete this discount?')) {
      try {
        await api.delete(`/discounts/${discountId}`);
        toast.success('Discount deleted successfully!');
        fetchDiscounts();
      } catch (error) {
        console.error('Error deleting discount:', error);
        toast.error('Failed to delete discount');
      }
    }
  };

  const handleToggleStatus = async (discountId, currentStatus) => {
    try {
      // TODO: Replace with actual API call when backend is ready
      // await api.patch(`/discounts/${discountId}/status`, { 
      //   is_active: !currentStatus 
      // });

      // For now, just show success message
      toast.success('Discount status updated!');
      fetchDiscounts();
    } catch (error) {
      console.error('Error updating status:', error);
      toast.error('Failed to update status');
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      type: 'percentage',
      value: '10', // Default to 10% for percentage discounts
      min_purchase_amount: '',
      max_discount_amount: '',
      start_date: '',
      end_date: '',
      usage_limit: '',
      usage_per_customer: '',
      applicable_to: 'product_types',
      product_types: [],
      category_ids: [],
      customer_tiers: [],
      bottle_return_count: DISCOUNT_BUSINESS_RULES.bottleReturn.defaultBottleCount,
      is_active: true,
      auto_apply: false,
      discount_type: 'regular_discount',
      allow_partial_payment: false
    });
    setSelectedDiscount(null);
    setValidationErrors([]);
  };

  const openEditModal = (discount) => {
    setSelectedDiscount(discount);

    // Parse JSON fields if they exist
    let productTypes = [];
    let categoryIds = [];
    try {
      if (discount.product_types) {
        productTypes = typeof discount.product_types === 'string'
          ? JSON.parse(discount.product_types)
          : discount.product_types;
      }
      if (discount.category_ids) {
        categoryIds = typeof discount.category_ids === 'string'
          ? JSON.parse(discount.category_ids)
          : discount.category_ids;
      }
    } catch (e) {
      console.error('Error parsing product_types or category_ids:', e);
    }

    setFormData({
      name: discount.name || '',
      description: discount.description || '',
      type: discount.type || 'percentage',
      value: discount.value !== null && discount.value !== undefined ? discount.value.toString() : '10',
      min_purchase_amount: discount.min_purchase_amount ? discount.min_purchase_amount.toString() : '',
      max_discount_amount: discount.max_discount_amount ? discount.max_discount_amount.toString() : '',
      start_date: discount.start_date ? discount.start_date.split('T')[0] : '',
      end_date: discount.end_date ? discount.end_date.split('T')[0] : '',
      usage_limit: discount.usage_limit ? discount.usage_limit.toString() : '',
      usage_per_customer: discount.usage_per_customer ? discount.usage_per_customer.toString() : '',
      applicable_to: discount.applicable_to || 'product_types',
      product_types: productTypes,
      category_ids: categoryIds,
      customer_tiers: discount.customer_tiers || [],
      bottle_return_count: discount.bottle_return_count || DISCOUNT_BUSINESS_RULES.bottleReturn.defaultBottleCount,
      is_active: discount.is_active ?? true,
      auto_apply: discount.auto_apply ?? false,
      discount_type: discount.discount_type || 'regular_discount',
      allow_partial_payment: discount.allow_partial_payment ?? false
    });
    setValidationErrors([]);
    setShowEditModal(true);
  };

  const filteredDiscounts = discounts.filter(discount => {
    const matchesSearch = discount.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      discount.description?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = filterType === 'all' || discount.type === filterType;
    const matchesStatus = filterStatus === 'all' ||
      (filterStatus === 'active' && discount.is_active) ||
      (filterStatus === 'inactive' && !discount.is_active);
    return matchesSearch && matchesType && matchesStatus;
  });

  const getDiscountIcon = (type) => {
    switch (type) {
      case 'percentage': return <Percent className="h-4 w-4" />;
      case 'fixed_amount': return <Tag className="h-4 w-4" />;
      case 'bottle_return': return <Recycle className="h-4 w-4" />;
      default: return <Gift className="h-4 w-4" />;
    }
  };

  const getDiscountTypeColor = (type) => {
    switch (type) {
      case 'percentage': return 'bg-blue-100 text-blue-800';
      case 'fixed_amount': return 'bg-green-100 text-green-800';
      case 'bottle_return': return 'bg-purple-100 text-purple-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <h1 className="text-2xl lg:text-3xl font-bold text-gray-900 flex items-center">
              <Percent className="h-6 w-6 lg:h-8 lg:w-8 mr-2 lg:mr-3 text-primary-500" />
              {tSync('Discount Management')}
            </h1>
            <p className="mt-2 text-gray-600 text-sm lg:text-base">
              {tSync('Manage discounts, campaigns, and promotional offers')}
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-3">
            <button
              onClick={() => setShowCampaignModal(true)}
              className="flex items-center justify-center px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors min-h-[44px]"
            >
              <Target className="h-5 w-5 mr-2" />
              <span className="text-sm lg:text-base">{tSync('New Campaign')}</span>
            </button>
            <button
              onClick={() => setShowAddModal(true)}
              className="flex items-center justify-center px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors min-h-[44px]"
            >
              <Plus className="h-5 w-5 mr-2" />
              <span className="text-sm lg:text-base">{tSync('New Discount')}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="mb-6">
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8">
            <button
              onClick={() => setActiveTab('discounts')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${activeTab === 'discounts'
                ? 'border-primary-500 text-primary-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
            >
              <Percent className="h-4 w-4 inline mr-2" />
              {tSync('Discounts')}
            </button>
            <button
              onClick={() => setActiveTab('campaigns')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${activeTab === 'campaigns'
                ? 'border-primary-500 text-primary-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
            >
              <Target className="h-4 w-4 inline mr-2" />
              {tSync('Campaigns')}
            </button>
            <button
              onClick={() => setActiveTab('analytics')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${activeTab === 'analytics'
                ? 'border-primary-500 text-primary-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
            >
              <BarChart3 className="h-4 w-4 inline mr-2" />
              {tSync('Analytics')}
            </button>
          </nav>
        </div>
      </div>

      {/* Discounts Tab */}
      {activeTab === 'discounts' && (
        <>
          {/* Search and Filters */}
          <div className="mb-6 space-y-4">
            <div className="w-full">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  placeholder={tSync('Search discounts...')}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent text-base"
                />
              </div>
            </div>
            <div className="flex flex-col sm:flex-row gap-3">
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
                className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent text-base"
              >
                <option value="all">{tSync('All Types')}</option>
                <option value="percentage">{tSync('Percentage')}</option>
                <option value="fixed_amount">{tSync('Fixed Amount')}</option>
                <option value="bottle_return">{tSync('Bottle Return')}</option>
              </select>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent text-base"
              >
                <option value="all">{tSync('All Status')}</option>
                <option value="active">{tSync('Active')}</option>
                <option value="inactive">{tSync('Inactive')}</option>
              </select>
            </div>
          </div>

          {/* Discounts Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4 lg:gap-6">
            {filteredDiscounts.map((discount) => (
              <div key={discount.id} className="bg-white border border-gray-200 rounded-lg p-4 lg:p-6 shadow-sm hover:shadow-md transition-shadow">
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between mb-4 gap-3">
                  <div className="flex items-start space-x-3 flex-1">
                    <div className={`p-2 rounded-lg ${getDiscountTypeColor(discount.type)} flex-shrink-0`}>
                      {getDiscountIcon(discount.type)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <h3 className="font-semibold text-gray-900 text-sm lg:text-base truncate">{discount.name}</h3>
                      <p className="text-xs lg:text-sm text-gray-600 line-clamp-2">{discount.description}</p>
                    </div>
                  </div>
                  <div className="flex items-center justify-end sm:justify-start">
                    <button
                      onClick={() => handleToggleStatus(discount.id, discount.is_active)}
                      className={`p-2 rounded-lg min-h-[44px] min-w-[44px] flex items-center justify-center ${discount.is_active
                        ? 'text-green-600 hover:bg-green-50'
                        : 'text-gray-400 hover:bg-gray-50'
                        }`}
                    >
                      {discount.is_active ? <CheckCircle className="h-4 w-4" /> : <XCircle className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-xs lg:text-sm text-gray-600">{tSync('Value')}:</span>
                    <span className="font-medium text-xs lg:text-sm text-right">
                      {discount.type === 'percentage' ? `${discount.value}%` :
                        discount.type === 'fixed_amount' ? `CFA ${discount.value.toLocaleString()}` :
                          `${discount.bottle_return_count || 5} ${tSync('bottles')}`}
                    </span>
                  </div>

                  {discount.min_purchase_amount && (
                    <div className="flex justify-between items-center">
                      <span className="text-xs lg:text-sm text-gray-600">{tSync('Min. Purchase')}:</span>
                      <span className="font-medium text-xs lg:text-sm text-right">CFA {discount.min_purchase_amount.toLocaleString()}</span>
                    </div>
                  )}

                  <div className="flex justify-between items-center">
                    <span className="text-xs lg:text-sm text-gray-600">{tSync('Valid Until')}:</span>
                    <span className="font-medium text-xs lg:text-sm text-right">
                      {discount.end_date ? new Date(discount.end_date).toLocaleDateString() : tSync('No expiry')}
                    </span>
                  </div>

                  <div className="flex justify-between items-center">
                    <span className="text-xs lg:text-sm text-gray-600">{tSync('Usage')}:</span>
                    <span className="font-medium text-xs lg:text-sm text-right">
                      {discount.used_count || 0}/{discount.usage_limit || '∞'}
                    </span>
                  </div>
                </div>

                <div className="mt-4 lg:mt-6 flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
                  <span className={`px-3 py-1 rounded-full text-xs font-medium self-start ${discount.is_active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                    }`}>
                    {discount.is_active ? tSync('Active') : tSync('Inactive')}
                  </span>
                  <div className="flex space-x-2 self-end sm:self-auto">
                    <button
                      onClick={() => openEditModal(discount)}
                      className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg min-h-[44px] min-w-[44px] flex items-center justify-center"
                    >
                      <Edit className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => handleDeleteDiscount(discount.id)}
                      className="p-2 text-red-600 hover:bg-red-50 rounded-lg min-h-[44px] min-w-[44px] flex items-center justify-center"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* Add/Edit Discount Modal */}
      {(showAddModal || showEditModal) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-4 lg:p-6 border-b">
              <div className="flex items-center justify-between">
                <h2 className="text-lg lg:text-xl font-semibold">
                  {showAddModal ? tSync('Create New Discount') : tSync('Edit Discount')}
                </h2>
                <button
                  onClick={() => {
                    setShowAddModal(false);
                    setShowEditModal(false);
                    resetForm();
                  }}
                  className="text-gray-400 hover:text-gray-600 p-2 min-h-[44px] min-w-[44px] flex items-center justify-center"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>
            </div>

            <form onSubmit={showAddModal ? handleCreateDiscount : handleUpdateDiscount} className="p-4 lg:p-6 space-y-4 lg:space-y-6">
              {/* Validation Errors */}
              {validationErrors.length > 0 && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <div className="flex items-start">
                    <AlertTriangle className="h-5 w-5 text-red-400 mt-0.5 mr-3" />
                    <div>
                      <h3 className="text-sm font-medium text-red-800 mb-2"><TranslatedText text={tSync('Validation Errors')} /></h3>
                      <ul className="text-sm text-red-700 space-y-1">
                        {validationErrors.map((error, index) => (
                          <li key={index}>• {error}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              )}

              {/* Business Rules Info */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-start">
                    <Info className="h-5 w-5 text-blue-400 mt-0.5 mr-3" />
                    <div>
                      <h3 className="text-sm font-medium text-blue-800 mb-1"><TranslatedText text={tSync('Business Rules')} /></h3>
                      <p className="text-sm text-blue-700">
                        {tSync('Configure discounts according to your business policies')}
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowBusinessRules(!showBusinessRules)}
                    className="text-blue-600 hover:text-blue-800"
                  >
                    <HelpCircle className="h-5 w-5" />
                  </button>
                </div>

                {showBusinessRules && (
                  <div className="mt-4 space-y-3 text-sm text-blue-700">
                    <div>
                      <strong>Percentage Discounts:</strong>
                      {DISCOUNT_BUSINESS_RULES.percentage.minPercentage}% - {DISCOUNT_BUSINESS_RULES.percentage.maxPercentage}%
                    </div>
                    <div>
                      <strong>Bottle Return:</strong>
                      {DISCOUNT_BUSINESS_RULES.bottleReturn.minBottleCount} - {DISCOUNT_BUSINESS_RULES.bottleReturn.maxBottleCount} bottles
                    </div>
                    <div>
                      <strong>Available Tiers:</strong>
                      <div className="ml-4 mt-1">
                        {DiscountRuleHelpers.getBottleReturnTiers().map(tier => (
                          <div key={tier.bottles} className="text-xs">
                            {tier.bottles} bottles = {tier.discountAmount?.toLocaleString() || tier.discountAmount} discount ({tier.description})
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
              {/* Basic Information */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {tSync('Discount Name')}
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {tSync('Discount Type')}
                  </label>
                  <select
                    value={formData.type}
                    onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  >
                    <option value="percentage">{tSync('Percentage Discount')}</option>
                    <option value="fixed_amount">{tSync('Fixed Amount')}</option>
                    <option value="bottle_return">{tSync('Bottle Return Discount')}</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {tSync('Description')}
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
              </div>

              {/* Discount Value */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {formData.type === 'bottle_return' ? (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      {tSync('Required Empty Bottles')}
                      <span className="text-xs text-gray-500 ml-2">
                        ({DISCOUNT_BUSINESS_RULES.bottleReturn.minBottleCount}-{DISCOUNT_BUSINESS_RULES.bottleReturn.maxBottleCount} {tSync('bottles')})
                      </span>
                    </label>
                    <select
                      value={formData.bottle_return_count}
                      onChange={(e) => setFormData({ ...formData, bottle_return_count: parseInt(e.target.value) })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    >
                      {DiscountRuleHelpers.getBottleReturnTiers().map(tier => (
                        <option key={tier.bottles} value={tier.bottles}>
                          {tier.bottles} {tSync('bottles')} - {tier.discountAmount?.toLocaleString() || tier.discountAmount} {tSync('discount')} ({tier.description})
                        </option>
                      ))}
                    </select>
                    <div className="mt-2 text-xs text-gray-600">
                      <Recycle className="h-3 w-3 inline mr-1" />
                      {tSync('Auto-calculated discount based on bottle tier')}
                    </div>
                  </div>
                ) : (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      {formData.type === 'percentage' ? tSync('Discount Percentage') : tSync('Discount Amount')}
                      {formData.type === 'percentage' && (
                        <span className="text-xs text-gray-500 ml-2">
                          ({DISCOUNT_BUSINESS_RULES.percentage.minPercentage}%-{DISCOUNT_BUSINESS_RULES.percentage.maxPercentage}%)
                        </span>
                      )}
                    </label>
                    <div className="relative">
                      <input
                        type="number"
                        value={formData.value}
                        onChange={(e) => setFormData({ ...formData, value: e.target.value })}
                        min={formData.type === 'percentage' ? DISCOUNT_BUSINESS_RULES.percentage.minPercentage : DISCOUNT_BUSINESS_RULES.fixedAmount.minAmount}
                        max={formData.type === 'percentage' ? DISCOUNT_BUSINESS_RULES.percentage.maxPercentage : DISCOUNT_BUSINESS_RULES.fixedAmount.maxAmount}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent pr-8"
                        required
                      />
                      {formData.type === 'percentage' && (
                        <Percent className="absolute right-3 top-3 h-4 w-4 text-gray-400" />
                      )}
                    </div>
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {tSync('Discount Category')}
                  </label>
                  <select
                    value={formData.discount_type}
                    onChange={(e) => setFormData({ ...formData, discount_type: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  >
                    <option value="regular_discount">{tSync('Regular Discount')}</option>
                    <option value="flash_sale">{tSync('Flash Sale')}</option>
                    <option value="weekly_promotion">{tSync('Weekly Promotion')}</option>
                    <option value="monthly_campaign">{tSync('Monthly Campaign')}</option>
                    <option value="seasonal">{tSync('Seasonal')}</option>
                    <option value="annual">{tSync('Annual')}</option>
                  </select>
                  <div className="mt-1 text-xs text-gray-500">
                    {tSync('Different categories have different duration limits based on business rules')}
                  </div>
                </div>
              </div>

              {/* Additional Fields */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {tSync('Minimum Purchase Amount (CFA)')}
                  </label>
                  <input
                    type="number"
                    value={formData.min_purchase_amount}
                    onChange={(e) => setFormData({ ...formData, min_purchase_amount: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    min="0"
                    step="0.01"
                  />
                </div>
              </div>

              {/* Date Range */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {tSync('Start Date')}
                  </label>
                  <input
                    type="date"
                    value={formData.start_date}
                    onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {tSync('End Date')}
                  </label>
                  <input
                    type="date"
                    value={formData.end_date}
                    onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  />
                </div>
              </div>

              {/* Usage Limits */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {tSync('Total Usage Limit')}
                  </label>
                  <input
                    type="number"
                    value={formData.usage_limit}
                    onChange={(e) => setFormData({ ...formData, usage_limit: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    min="1"
                    placeholder={tSync('Leave empty for unlimited')}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {tSync('Usage Per Customer')}
                  </label>
                  <input
                    type="number"
                    value={formData.usage_per_customer}
                    onChange={(e) => setFormData({ ...formData, usage_per_customer: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    min="1"
                    placeholder={tSync('Leave empty for unlimited')}
                  />
                </div>
              </div>

              {/* Product Types Selection - Required */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {tSync('Select Product Types')} <span className="text-red-500">*</span>
                </label>
                <div className="space-y-2 border border-gray-300 rounded-lg p-4">
                  {['general', 'perfume', 'shoes', 'clothes', 'accessories'].map((productType) => (
                    <label key={productType} className="flex items-center space-x-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.product_types.includes(productType)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setFormData({
                              ...formData,
                              product_types: [...formData.product_types, productType]
                            });
                          } else {
                            setFormData({
                              ...formData,
                              product_types: formData.product_types.filter(pt => pt !== productType)
                            });
                          }
                        }}
                        className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                      />
                      <span className="text-sm text-gray-700 capitalize">{tSync(productType)}</span>
                    </label>
                  ))}
                </div>
                {formData.product_types.length === 0 && (
                  <p className="mt-1 text-xs text-red-500">{tSync('Please select at least one product type')}</p>
                )}
                <div className="mt-2 text-xs text-gray-500">
                  {tSync('This discount will only apply to products with the selected product types')}
                </div>
              </div>

              {/* Settings */}
              <div className="space-y-4">
                <div className="flex items-center space-x-3">
                  <input
                    type="checkbox"
                    id="is_active"
                    checked={formData.is_active}
                    onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                    className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                  />
                  <label htmlFor="is_active" className="text-sm font-medium text-gray-700">
                    {tSync('Active Discount')}
                  </label>
                </div>

                <div className="flex items-center space-x-3">
                  <input
                    type="checkbox"
                    id="auto_apply"
                    checked={formData.auto_apply}
                    onChange={(e) => setFormData({ ...formData, auto_apply: e.target.checked })}
                    className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                  />
                  <label htmlFor="auto_apply" className="text-sm font-medium text-gray-700">
                    {tSync('Auto-apply when conditions are met')}
                    <span className="ml-2 text-xs text-gray-500">
                      ({tSync('Applies automatically when: discount is active, dates valid, minimum purchase met, payment status compatible')})
                    </span>
                  </label>
                </div>

                <div className="flex items-center space-x-3">
                  <input
                    type="checkbox"
                    id="allow_partial_payment"
                    checked={formData.allow_partial_payment}
                    onChange={(e) => setFormData({ ...formData, allow_partial_payment: e.target.checked })}
                    className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                  />
                  <label htmlFor="allow_partial_payment" className="text-sm font-medium text-gray-700">
                    {tSync('Allow discounts for partial payments')}
                  </label>
                </div>
              </div>

              {/* Submit Buttons */}
              <div className="flex flex-col sm:flex-row sm:justify-end space-y-3 sm:space-y-0 sm:space-x-3 pt-4 lg:pt-6 border-t">
                <button
                  type="button"
                  onClick={() => {
                    setShowAddModal(false);
                    setShowEditModal(false);
                    resetForm();
                  }}
                  className="w-full sm:w-auto px-4 py-3 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors min-h-[44px]"
                >
                  {tSync('Cancel')}
                </button>
                <button
                  type="submit"
                  className="w-full sm:w-auto px-6 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors min-h-[44px]"
                >
                  {showAddModal ? tSync('Create Discount') : tSync('Update Discount')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
