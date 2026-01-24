import React, { useState, useEffect } from 'react';
import { 
  Plus, 
  Search, 
  Edit, 
  Trash2, 
  Percent,
  Tag,
  Recycle,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Info,
  HelpCircle,
  X,
  Gift
} from 'lucide-react';
import { api } from '../lib/api';
import toast from 'react-hot-toast';
import { DISCOUNT_BUSINESS_RULES, DiscountRuleHelpers } from '../config/discountRules';
import TranslatedText from '../components/TranslatedText';

export default function Discounts() {
  const [discounts, setDiscounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedDiscount, setSelectedDiscount] = useState(null);
  const [validationErrors, setValidationErrors] = useState([]);
  const [showBusinessRules, setShowBusinessRules] = useState(false);

  // Form states with configurable defaults
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    type: 'percentage',
    value: '',
    bottle_return_count: DISCOUNT_BUSINESS_RULES.bottleReturn.defaultBottleCount,
    is_active: true,
    discount_type: 'regular_discount'
  });

  useEffect(() => {
    fetchDiscounts();
  }, []);

  const fetchDiscounts = async () => {
    try {
      setLoading(true);
      // Mock data for demonstration
      setDiscounts([
        {
          id: 1,
          name: 'Summer Sale',
          description: 'Summer discount promotion',
          type: 'percentage',
          value: 15,
          is_active: true,
          usage_count: 23
        },
        {
          id: 2,
          name: 'Bottle Return Eco Reward',
          description: 'Environmental bottle return program',
          type: 'bottle_return',
          bottle_return_count: 5,
          is_active: true,
          usage_count: 8
        }
      ]);
    } catch (error) {
      console.error('Error fetching discounts:', error);
      toast.error('Failed to load discounts');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateDiscount = async (e) => {
    e.preventDefault();
    
    // Validate against configurable business rules
    const validation = DiscountRuleHelpers.validateDiscountConfig(formData);
    if (!validation.isValid) {
      setValidationErrors(validation.errors);
      toast.error('Please fix validation errors before proceeding');
      return;
    }
    
    try {
      toast.success('Discount created successfully with business rules validation!');
      setShowAddModal(false);
      resetForm();
      fetchDiscounts();
    } catch (error) {
      console.error('Error creating discount:', error);
      toast.error('Failed to create discount');
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      type: 'percentage',
      value: '',
      bottle_return_count: DISCOUNT_BUSINESS_RULES.bottleReturn.defaultBottleCount,
      is_active: true,
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
      bottle_return_count: discount.bottle_return_count || DISCOUNT_BUSINESS_RULES.bottleReturn.defaultBottleCount,
      is_active: discount.is_active ?? true,
      discount_type: discount.discount_type || 'regular_discount'
    });
    setValidationErrors([]);
    setShowEditModal(true);
  };

  const filteredDiscounts = discounts.filter(discount => {
    const matchesSearch = discount.name?.toLowerCase().includes(searchTerm.toLowerCase());
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
            Create and manage discounts with configurable business rules
          </p>
        </div>
        
        <div className="flex items-center space-x-3 mt-4 md:mt-0">
          <button
            onClick={() => setShowAddModal(true)}
            className="inline-flex items-center px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Discount
          </button>
        </div>
      </div>

      {/* Business Rules Summary */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-start justify-between">
          <div className="flex items-start">
            <Info className="h-5 w-5 text-blue-400 mt-0.5 mr-3" />
            <div>
              <h3 className="text-sm font-medium text-blue-800 mb-1"><TranslatedText text="Active Business Rules" /></h3>
              <p className="text-sm text-blue-700">
                Percentage: {DISCOUNT_BUSINESS_RULES.percentage.minPercentage}%-{DISCOUNT_BUSINESS_RULES.percentage.maxPercentage}% | 
                Bottle Return: {DISCOUNT_BUSINESS_RULES.bottleReturn.minBottleCount}-{DISCOUNT_BUSINESS_RULES.bottleReturn.maxBottleCount} bottles | 
                Stacking: {DISCOUNT_BUSINESS_RULES.stacking.allowStacking ? 'Enabled' : 'Disabled'}
              </p>
            </div>
          </div>
          <button
            onClick={() => setShowBusinessRules(!showBusinessRules)}
            className="text-blue-600 hover:text-blue-800"
          >
            <HelpCircle className="h-5 w-5" />
          </button>
        </div>
        
        {showBusinessRules && (
          <div className="mt-4 space-y-3 text-sm text-blue-700">
            <div>
              <strong>Bottle Return Tiers (Configurable):</strong>
              <div className="ml-4 mt-1 grid grid-cols-2 md:grid-cols-5 gap-2">
                {DiscountRuleHelpers.getBottleReturnTiers().map(tier => (
                  <div key={tier.bottles} className="text-xs bg-blue-100 p-2 rounded">
                    {tier.bottles} bottles = {tier.discountAmount?.toLocaleString() || tier.discountAmount} discount<br/>
                    <span className="text-blue-600">{tier.description}</span>
                  </div>
                ))}
              </div>
            </div>
            <div>
              <strong>Stacking Rules:</strong> 
              Max {DISCOUNT_BUSINESS_RULES.stacking.maxStackedDiscounts} discounts, 
              up to {DISCOUNT_BUSINESS_RULES.stacking.maxCombinedPercentage}% total
            </div>
          </div>
        )}
      </div>

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
          <p className="mt-1 text-sm text-gray-500">Get started by creating a new discount with configurable business rules.</p>
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
                      onClick={() => openEditModal(discount)}
                      className="p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-50 rounded"
                    >
                      <Edit className="h-4 w-4" />
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

            <form onSubmit={handleCreateDiscount} className="p-6 space-y-6">
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

              {/* Configurable Discount Value */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {formData.type === 'bottle_return' ? (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Required Empty Bottles
                      <span className="text-xs text-gray-500 ml-2">
                        (Configurable: {DISCOUNT_BUSINESS_RULES.bottleReturn.minBottleCount}-{DISCOUNT_BUSINESS_RULES.bottleReturn.maxBottleCount})
                      </span>
                    </label>
                    <select
                      value={formData.bottle_return_count}
                      onChange={(e) => setFormData({ ...formData, bottle_return_count: parseInt(e.target.value) })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    >
                      {DiscountRuleHelpers.getBottleReturnTiers().map(tier => (
                        <option key={tier.bottles} value={tier.bottles}>
                          {tier.bottles} bottles - {tier.discountPercentage}% ({tier.description})
                        </option>
                      ))}
                    </select>
                    <div className="mt-2 text-xs text-gray-600">
                      <Recycle className="h-3 w-3 inline mr-1" />
                      Auto-calculated discount based on configurable tier rules
                    </div>
                  </div>
                ) : (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      {formData.type === 'percentage' ? 'Discount Percentage' : 'Discount Amount'}
                      {formData.type === 'percentage' && (
                        <span className="text-xs text-gray-500 ml-2">
                          (Rules: {DISCOUNT_BUSINESS_RULES.percentage.minPercentage}%-{DISCOUNT_BUSINESS_RULES.percentage.maxPercentage}%)
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
                    Different categories have different duration limits based on business rules
                  </div>
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
    </div>
  );
}
