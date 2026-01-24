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
  X,
  Lock
} from 'lucide-react';
import { api } from '../lib/api';
import toast from 'react-hot-toast';
import { DISCOUNT_BUSINESS_RULES, DiscountRuleHelpers } from '../config/discountRules';
import { discountsAPI } from '../lib/api';
import TranslatedText from '../components/TranslatedText';

export default function Discounts() {
  const [discounts, setDiscounts] = useState([]);
  const [campaigns, setCampaigns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showCampaignModal, setShowCampaignModal] = useState(false);
  const [selectedDiscount, setSelectedDiscount] = useState(null);
  const [activeTab, setActiveTab] = useState('discounts');
  const [validationErrors, setValidationErrors] = useState([]);
  const [showBusinessRules, setShowBusinessRules] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

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
    applicable_to: 'all', // all, specific_products, specific_categories
    customer_tiers: [],
    bottle_return_count: DISCOUNT_BUSINESS_RULES.bottleReturn.defaultBottleCount,
    is_active: true,
    auto_apply: false,
    discount_type: 'regular_discount' // For business rule validation
  });

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
    // Check authentication status
    const token = localStorage.getItem('token');
    setIsAuthenticated(!!token);
    
    if (token) {
    fetchDiscounts();
    fetchCampaigns();
    } else {
      setLoading(false);
    }
  }, []);

  const fetchDiscounts = async () => {
    try {
      setLoading(true);
      
      // Check if user is authenticated
      const token = localStorage.getItem('token');
      if (!token) {
        toast.error('Please login to access discounts');
        setDiscounts([]);
        return;
      }
      
      const response = await discountsAPI.getAll();
      setDiscounts(response.data.discounts || []);
      console.log('✅ Discounts loaded successfully:', response.data);
    } catch (error) {
      console.error('Error fetching discounts:', error);
      
      if (error.response?.status === 401) {
        toast.error('Authentication required. Please login again.');
        // Redirect to login or clear auth data
        localStorage.removeItem('token');
        localStorage.removeItem('user');
      } else if (error.response?.status === 500) {
        toast.error('Server error. Please try again later.');
      } else {
        toast.error('Failed to load discounts. Please check your connection.');
      }
      
      setDiscounts([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchCampaigns = async () => {
    try {
      // Check if user is authenticated
      const token = localStorage.getItem('token');
      if (!token) {
        setCampaigns([]);
        return;
      }
      
      const response = await api.get('/discounts/campaigns');
      setCampaigns(response.data.campaigns || []);
    } catch (error) {
      console.error('Error fetching campaigns:', error);
      // Don't show error for campaigns since it's optional
      setCampaigns([]);
    }
  };

  const handleCreateDiscount = async (e) => {
    e.preventDefault();
    
    // For bottle return discounts, set value from selected tier
    if (formData.type === 'bottle_return' && formData.bottle_return_count) {
      const selectedTier = DiscountRuleHelpers.getBottleReturnTiers().find(
        tier => tier.bottles === parseInt(formData.bottle_return_count)
      );
      if (selectedTier) {
        formData.value = selectedTier.discountAmount;
      }
    }
    
    // Validate against business rules
    const validation = DiscountRuleHelpers.validateDiscountConfig(formData);
    if (!validation.isValid) {
      setValidationErrors(validation.errors);
      toast.error('Please fix validation errors before proceeding');
      return;
    }
    
    try {
      await discountsAPI.create(formData);
      toast.success('Discount created successfully!');
      setShowAddModal(false);
      resetForm();
      fetchDiscounts();
    } catch (error) {
      console.error('Error creating discount:', error);
      toast.error('Failed to create discount');
    }
  };

  const handleUpdateDiscount = async (e) => {
    e.preventDefault();
    
    // For bottle return discounts, set value from selected tier
    if (formData.type === 'bottle_return' && formData.bottle_return_count) {
      const selectedTier = DiscountRuleHelpers.getBottleReturnTiers().find(
        tier => tier.bottles === parseInt(formData.bottle_return_count)
      );
      if (selectedTier) {
        formData.value = selectedTier.discountAmount;
      }
    }
    
    // Validate against business rules
    const validation = DiscountRuleHelpers.validateDiscountConfig(formData);
    if (!validation.isValid) {
      setValidationErrors(validation.errors);
      toast.error('Please fix validation errors before proceeding');
      return;
    }
    
    try {
      await api.put(`/discounts/${selectedDiscount.id}`, formData);
      toast.success('Discount updated successfully!');
      setShowEditModal(false);
      resetForm();
      fetchDiscounts();
    } catch (error) {
      console.error('Error updating discount:', error);
      toast.error('Failed to update discount');
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
      await api.patch(`/discounts/${discountId}/status`, { 
        is_active: !currentStatus 
      });
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
      value: '',
      min_purchase_amount: '',
      max_discount_amount: '',
      start_date: '',
      end_date: '',
      usage_limit: '',
      usage_per_customer: '',
      applicable_to: 'all',
      customer_tiers: [],
      bottle_return_count: DISCOUNT_BUSINESS_RULES.bottleReturn.defaultBottleCount,
      is_active: true,
      auto_apply: false,
      discount_type: 'regular_discount'
    });
    setSelectedDiscount(null);
    setValidationErrors([]);
  };

  const openEditModal = (discount) => {
    setSelectedDiscount(discount);
    setFormData({
      name: discount.name || '',
      description: discount.description || '',
      type: discount.type || 'percentage',
      value: discount.value || '',
      min_purchase_amount: discount.min_purchase_amount || '',
      max_discount_amount: discount.max_discount_amount || '',
      start_date: discount.start_date ? discount.start_date.split('T')[0] : '',
      end_date: discount.end_date ? discount.end_date.split('T')[0] : '',
      usage_limit: discount.usage_limit || '',
      usage_per_customer: discount.usage_per_customer || '',
      applicable_to: discount.applicable_to || 'all',
      customer_tiers: discount.customer_tiers || [],
      bottle_return_count: discount.bottle_return_count || DISCOUNT_BUSINESS_RULES.bottleReturn.defaultBottleCount,
      is_active: discount.is_active ?? true,
      auto_apply: discount.auto_apply ?? false,
      discount_type: discount.discount_type || 'regular_discount'
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

  const getDiscountBadgeColor = (type) => {
    switch (type) {
      case 'percentage': return 'bg-blue-100 text-blue-800';
      case 'fixed_amount': return 'bg-green-100 text-green-800';
      case 'bottle_return': return 'bg-emerald-100 text-emerald-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900"><TranslatedText text="Discount Management" /></h1>
          <p className="text-gray-600 mt-1">
            Create and manage discounts, bottle return rewards, and promotional campaigns
          </p>
        </div>
        
        <div className="flex items-center space-x-3 mt-4 md:mt-0">
          <button
            onClick={() => {
              if (isAuthenticated) {
                fetchDiscounts();
                fetchCampaigns();
              }
            }}
            disabled={!isAuthenticated}
            className="inline-flex items-center px-3 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </button>
          <button
            onClick={() => setShowAddModal(true)}
            disabled={!isAuthenticated}
            className="inline-flex items-center px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Discount
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <div className="flex items-center justify-between">
          <nav className="-mb-px flex space-x-8">
            <button
              onClick={() => setActiveTab('discounts')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'discounts'
                  ? 'border-primary-500 text-primary-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <Percent className="h-4 w-4 inline mr-2" />
              Discounts
            </button>
            <button
              onClick={() => setActiveTab('campaigns')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'campaigns'
                  ? 'border-primary-500 text-primary-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <Target className="h-4 w-4 inline mr-2" />
              Campaigns
            </button>
            <button
              onClick={() => setActiveTab('analytics')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'analytics'
                  ? 'border-primary-500 text-primary-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <BarChart3 className="h-4 w-4 inline mr-2" />
              Analytics
            </button>
          </nav>
        </div>
      </div>

      {/* Discounts Tab */}
      {activeTab === 'discounts' && (
            <>
              {/* Authentication Check */}
              {!isAuthenticated ? (
                <div className="text-center py-12 bg-yellow-50 rounded-lg border border-yellow-200">
                  <Lock className="mx-auto h-12 w-12 text-yellow-400" />
                  <h3 className="mt-2 text-sm font-medium text-yellow-900"><TranslatedText text="Authentication Required" /></h3>
                  <p className="mt-1 text-sm text-yellow-700">
                    Please login to access discount management features.
                  </p>
                  <div className="mt-4">
                    <a
                      href="/login"
                      className="inline-flex items-center px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition-colors"
                    >
                      Go to Login
                    </a>
                  </div>
                </div>
              ) : (
        <>
          {/* Search and Filters */}
          <div className="mb-6 flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search discounts..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
              </div>
            </div>
            
            <div className="flex gap-3">
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              >
                <option value="all">All Types</option>
                <option value="percentage">Percentage</option>
                <option value="fixed_amount">Fixed Amount</option>
                <option value="bottle_return">Bottle Return</option>
              </select>
              
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              >
                <option value="all">All Status</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>
          </div>

          {/* Discounts Grid */}
          {loading ? (
            <div className="text-center py-12">
              <div className="animate-spin inline-block w-6 h-6 border-2 border-current border-t-transparent rounded-full" />
              <p className="mt-2 text-gray-600">Loading discounts...</p>
            </div>
          ) : filteredDiscounts.length === 0 ? (
            <div className="text-center py-12 bg-gray-50 rounded-lg">
              <Gift className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900"><TranslatedText text="No discounts found" /></h3>
              <p className="mt-1 text-sm text-gray-500">Get started by creating a new discount.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredDiscounts.map((discount) => (
                <div key={discount.id} className="bg-white border border-gray-200 rounded-lg shadow-sm hover:shadow-md transition-shadow">
                  <div className="p-6">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center">
                        <div className={`p-2 rounded-lg ${getDiscountBadgeColor(discount.type)}`}>
                          {getDiscountIcon(discount.type)}
                        </div>
                        <div className="ml-3">
                          <h3 className="text-sm font-medium text-gray-900">{discount.name}</h3>
                          <p className="text-xs text-gray-500 capitalize">{discount.type?.replace('_', ' ')}</p>
                        </div>
                      </div>
                      
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => handleToggleStatus(discount.id, discount.is_active)}
                          className={`p-1 rounded ${
                            discount.is_active 
                              ? 'text-green-600 hover:bg-green-50' 
                              : 'text-gray-400 hover:bg-gray-50'
                          }`}
                        >
                          {discount.is_active ? <CheckCircle className="h-4 w-4" /> : <XCircle className="h-4 w-4" />}
                        </button>
                        
                        <button
                          onClick={() => openEditModal(discount)}
                          className="p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-50 rounded"
                        >
                          <Edit className="h-4 w-4" />
                        </button>
                        
                        <button
                          onClick={() => handleDeleteDiscount(discount.id)}
                          className="p-1 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                    
                    <div className="mt-4">
                      <div className="text-lg font-semibold text-gray-900">
                        {discount.type === 'percentage' && `${discount.value}%`}
                        {discount.type === 'fixed_amount' && `RWF ${discount.value.toLocaleString()}`}
                        {discount.type === 'bottle_return' && `${discount.bottle_return_count} bottles`}
                      </div>
                      
                      {discount.description && (
                        <p className="text-sm text-gray-600 mt-1">{discount.description}</p>
                      )}
                      
                      <div className="flex items-center justify-between mt-4 text-xs text-gray-500">
                        <span>
                          {discount.usage_count || 0} used
                        </span>
                        <span className={`px-2 py-1 rounded-full ${
                          discount.is_active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                        }`}>
                          {discount.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
                </>
          )}
        </>
      )}

      {/* Add/Edit Discount Modal */}
      {(showAddModal || showEditModal) && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b">
              <h2 className="text-xl font-semibold">
                {showAddModal ? 'Create New Discount' : 'Edit Discount'}
              </h2>
              <button
                onClick={() => {
                  setShowAddModal(false);
                  setShowEditModal(false);
                  resetForm();
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            <form onSubmit={showAddModal ? handleCreateDiscount : handleUpdateDiscount} className="p-6 space-y-6">
              {/* Validation Errors */}
              {validationErrors.length > 0 && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <div className="flex items-start">
                    <AlertTriangle className="h-5 w-5 text-red-400 mt-0.5 mr-3" />
                    <div>
                      <h3 className="text-sm font-medium text-red-800 mb-2"><TranslatedText text="Validation Errors" /></h3>
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
                      <h3 className="text-sm font-medium text-blue-800 mb-1"><TranslatedText text="Business Rules" /></h3>
                      <p className="text-sm text-blue-700">
                        Configure discounts according to your business policies
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
                    Discount Name
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
                    Discount Type
                  </label>
                  <select
                    value={formData.type}
                    onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  >
                    <option value="percentage">Percentage Discount</option>
                    <option value="fixed_amount">Fixed Amount</option>
                    <option value="bottle_return">Bottle Return Discount</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Description
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
                      Required Empty Bottles
                      <span className="text-xs text-gray-500 ml-2">
                        ({DISCOUNT_BUSINESS_RULES.bottleReturn.minBottleCount}-{DISCOUNT_BUSINESS_RULES.bottleReturn.maxBottleCount} bottles)
                      </span>
                    </label>
                    <select
                      value={formData.bottle_return_count}
                      onChange={(e) => setFormData({ ...formData, bottle_return_count: parseInt(e.target.value) })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    >
                      {DiscountRuleHelpers.getBottleReturnTiers().map(tier => (
                        <option key={tier.bottles} value={tier.bottles}>
                          {tier.bottles} bottles - {tier.discountAmount?.toLocaleString() || tier.discountAmount} discount ({tier.description})
                        </option>
                      ))}
                    </select>
                    <div className="mt-2 text-xs text-gray-600">
                      <Recycle className="h-3 w-3 inline mr-1" />
                      Auto-calculated discount based on bottle tier
                    </div>
                  </div>
                ) : (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      {formData.type === 'percentage' ? 'Discount Percentage' : 'Discount Amount'}
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
                    Discount Category
                  </label>
                  <select
                    value={formData.discount_type}
                    onChange={(e) => setFormData({ ...formData, discount_type: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  >
                    <option value="regular_discount">Regular Discount</option>
                    <option value="flash_sale">Flash Sale</option>
                    <option value="weekly_promotion">Weekly Promotion</option>
                    <option value="monthly_campaign">Monthly Campaign</option>
                    <option value="seasonal">Seasonal</option>
                    <option value="annual">Annual</option>
                  </select>
                  <div className="mt-1 text-xs text-gray-500">
                    Different categories have different duration limits
                  </div>
                </div>
              </div>

              {/* Date Range */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Start Date
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
                    End Date
                  </label>
                  <input
                    type="date"
                    value={formData.end_date}
                    onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  />
                </div>
              </div>

              {/* Submit Buttons */}
              <div className="flex justify-end space-x-3 pt-6 border-t">
                <button
                  type="button"
                  onClick={() => {
                    setShowAddModal(false);
                    setShowEditModal(false);
                    resetForm();
                  }}
                  className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
                >
                  {showAddModal ? 'Create Discount' : 'Update Discount'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Analytics Tab */}
      {activeTab === 'analytics' && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="text-center py-12">
            <BarChart3 className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900"><TranslatedText text="Analytics Dashboard" /></h3>
            <p className="mt-1 text-sm text-gray-500">
              Discount performance analytics will be displayed here.
            </p>
          </div>
        </div>
      )}

      {/* Campaigns Tab */}
      {activeTab === 'campaigns' && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="text-center py-12">
            <Target className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900"><TranslatedText text="Campaign Management" /></h3>
            <p className="mt-1 text-sm text-gray-500">
              Promotional campaigns will be managed here.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
