import React, { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Plus,
  Search,
  Filter,
  Edit,
  Trash2,
  Eye,
  Users,
  Award,
  Gift,
  Crown,
  Star,
  Calendar,
  Phone,
  Mail,
  MapPin,
  DollarSign,
  TrendingUp,
  Clock,
  X,
  Brain,
  Target,
  AlertTriangle,
  CheckCircle,
  MessageCircle,
  Heart,
  ShoppingBag,
  Activity,
  Zap,
  BarChart3,
  PieChart,
  TrendingDown,
  RefreshCw,
  Lightbulb,
  Send,
  Smartphone,
  Settings
} from 'lucide-react';
import { customersAPI, loyaltyAPI } from '../lib/api';
import toast from 'react-hot-toast';
import TranslatedText from '../components/TranslatedText';
import { useTranslation } from '../hooks/useTranslation';
import { formatCurrency, formatDate } from '../lib/formatters';

export default function Customers() {
  const { tSync } = useTranslation();
  const [searchInput, setSearchInput] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTier, setSelectedTier] = useState('all');
  const [selectedSegment, setSelectedSegment] = useState('all');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showLoyaltyModal, setShowLoyaltyModal] = useState(false);
  const [showInsightsModal, setShowInsightsModal] = useState(false);
  const [showCampaignModal, setShowCampaignModal] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [viewMode, setViewMode] = useState('table'); // table, cards, insights
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    address: '',
    city: '',
    state: '',
    country: '',
    postalCode: '',
    birthday: '',
    anniversaryDate: ''
  });

  const queryClient = useQueryClient();
  const searchInputRef = useRef(null);
  const cursorPositionRef = useRef(null);
  const wasFocusedRef = useRef(false);

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

  // Fetch customers
  const { data: customersData, isLoading } = useQuery({
    queryKey: ['customers', currentPage, searchTerm, selectedTier, itemsPerPage],
    queryFn: () => customersAPI.getAll({
      page: currentPage,
      limit: itemsPerPage,
      search: searchTerm,
      tier: selectedTier
    }).then(res => res.data),
    keepPreviousData: true, // Keep previous data while loading to prevent flickering
  });

  // Fetch loyalty stats
  const { data: loyaltyStats } = useQuery({
    queryKey: ['loyalty-stats'],
    queryFn: () => loyaltyAPI.getStats().then(res => res.data),
  });

  // Create customer mutation
  const createCustomerMutation = useMutation({
    mutationFn: (data) => customersAPI.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries(['customers']);
      setShowAddModal(false);
      resetForm();
      toast.success(tSync('Customer created successfully'));
    },
    onError: (error) => {
      const errorData = error.response?.data;
      const duplicateInfo = errorData?.duplicate;

      if (duplicateInfo) {
        // Show detailed alert for duplicate customer
        let detailMessage = `Existing customer: ${duplicateInfo.name}`;
        if (duplicateInfo.email) {
          detailMessage += `\nEmail: ${duplicateInfo.email}`;
        }
        if (duplicateInfo.phone) {
          detailMessage += `\nPhone: ${duplicateInfo.phone}`;
        }

        toast.error(
          `${errorData?.error || tSync('Customer already exists')}\n${detailMessage}`,
          {
            duration: 6000,
            style: {
              whiteSpace: 'pre-line',
              maxWidth: '400px'
            }
          }
        );
      } else if (errorData?.errors && Array.isArray(errorData.errors)) {
        // Show validation errors
        const validationErrors = errorData.errors.map(err => {
          const field = err.param || err.field || 'field';
          const message = err.msg || err.message || 'Invalid value';
          return `${field}: ${message}`;
        }).join('\n');

        toast.error(
          `${tSync('Validation Error')}:\n${validationErrors}`,
          {
            duration: 6000,
            style: {
              whiteSpace: 'pre-line',
              maxWidth: '400px'
            }
          }
        );
      } else if (errorData?.message) {
        // Show backend error message
        toast.error(errorData.message, { duration: 5000 });
      } else {
        // Generic error
        toast.error(errorData?.error || tSync('Failed to create customer'));
      }
    }
  });

  // Update customer mutation
  const updateCustomerMutation = useMutation({
    mutationFn: ({ id, data }) => customersAPI.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['customers']);
      setShowEditModal(false);
      resetForm();
      toast.success(tSync('Customer updated successfully'));
    },
    onError: (error) => {
      toast.error(error.response?.data?.error || tSync('Failed to update customer'));
    }
  });

  // Add loyalty points mutation
  const addPointsMutation = useMutation({
    mutationFn: (data) => loyaltyAPI.addPoints(data),
    onSuccess: () => {
      queryClient.invalidateQueries(['customers']);
      queryClient.invalidateQueries(['loyalty-stats']);
      toast.success(tSync('Points added successfully'));
    },
    onError: (error) => {
      toast.error(error.response?.data?.error || tSync('Failed to add points'));
    }
  });

  const customers = customersData?.customers || [];
  const pagination = customersData?.pagination || {};

  // Calculate customer segments
  const getCustomerSegment = (customer) => {
    const daysSinceLastPurchase = customer.last_purchase_date
      ? Math.floor((new Date() - new Date(customer.last_purchase_date)) / (1000 * 60 * 60 * 24))
      : 999;

    const totalSpent = customer.total_spent || 0;
    const purchaseCount = customer.purchase_count || 0;

    if (totalSpent > 1000 && customer.loyalty_tier === 'gold') return 'vip';
    if (purchaseCount >= 10) return 'loyal';
    if (daysSinceLastPurchase > 90 && purchaseCount > 3) return 'at_risk';
    if (daysSinceLastPurchase <= 30) return 'active';
    if (purchaseCount <= 2) return 'new';
    return 'regular';
  };

  const getSegmentColor = (segment) => {
    const colors = {
      vip: 'bg-purple-100 text-purple-800',
      loyal: 'bg-green-100 text-green-800',
      active: 'bg-blue-100 text-blue-800',
      regular: 'bg-gray-100 text-gray-800',
      new: 'bg-yellow-100 text-yellow-800',
      at_risk: 'bg-red-100 text-red-800'
    };
    return colors[segment] || colors.regular;
  };

  const getSegmentIcon = (segment) => {
    const icons = {
      vip: Crown,
      loyal: Heart,
      active: Activity,
      regular: Users,
      new: Star,
      at_risk: AlertTriangle
    };
    const Icon = icons[segment] || Users;
    return <Icon className="h-3 w-3" />;
  };

  // Customer health score calculation
  const calculateHealthScore = (customer) => {
    let score = 50; // Base score

    // Recency (last purchase)
    const daysSinceLastPurchase = customer.last_purchase_date
      ? Math.floor((new Date() - new Date(customer.last_purchase_date)) / (1000 * 60 * 60 * 24))
      : 999;

    if (daysSinceLastPurchase <= 30) score += 25;
    else if (daysSinceLastPurchase <= 60) score += 15;
    else if (daysSinceLastPurchase <= 90) score += 5;
    else if (daysSinceLastPurchase > 180) score -= 30;

    // Frequency (purchase count)
    const purchaseCount = customer.purchase_count || 0;
    if (purchaseCount >= 10) score += 20;
    else if (purchaseCount >= 5) score += 10;
    else if (purchaseCount >= 2) score += 5;

    // Monetary (total spent)
    const totalSpent = customer.total_spent || 0;
    if (totalSpent >= 1000) score += 15;
    else if (totalSpent >= 500) score += 10;
    else if (totalSpent >= 100) score += 5;

    // Engagement (loyalty points activity)
    if (customer.loyalty_tier === 'gold') score += 10;
    else if (customer.loyalty_tier === 'silver') score += 5;

    return Math.max(0, Math.min(100, score));
  };

  const getHealthScoreColor = (score) => {
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-yellow-600';
    if (score >= 40) return 'text-orange-600';
    return 'text-red-600';
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    // Prepare data - convert empty strings to null for optional fields
    const submitData = {
      ...formData,
      email: formData.email?.trim() || null,
      phone: formData.phone?.trim() || null,
      birthday: formData.birthday?.trim() || null,
      anniversaryDate: formData.anniversaryDate?.trim() || null,
      address: formData.address?.trim() || null,
      city: formData.city?.trim() || null,
      state: formData.state?.trim() || null,
      country: formData.country?.trim() || null,
      postalCode: formData.postalCode?.trim() || null
    };

    if (selectedCustomer) {
      updateCustomerMutation.mutate({ id: selectedCustomer.id, data: submitData });
    } else {
      createCustomerMutation.mutate(submitData);
    }
  };

  const resetForm = () => {
    setFormData({
      firstName: '',
      lastName: '',
      email: '',
      phone: '',
      address: '',
      city: '',
      state: '',
      country: '',
      postalCode: '',
      birthday: '',
      anniversaryDate: ''
    });
    setSelectedCustomer(null);
  };

  const openEditModal = (customer) => {
    setSelectedCustomer(customer);
    setFormData({
      firstName: customer.first_name || '',
      lastName: customer.last_name || '',
      email: customer.email || '',
      phone: customer.phone || '',
      address: customer.address || '',
      city: customer.city || '',
      state: customer.state || '',
      country: customer.country || '',
      postalCode: customer.postal_code || '',
      birthday: customer.birthday ? customer.birthday.split('T')[0] : '',
      anniversaryDate: customer.anniversary_date ? customer.anniversary_date.split('T')[0] : ''
    });
    setShowEditModal(true);
  };

  const getTierColor = (tier) => {
    switch (tier) {
      case 'gold': return 'text-yellow-600 bg-yellow-100';
      case 'silver': return 'text-gray-600 bg-gray-100';
      case 'bronze': return 'text-orange-600 bg-orange-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getTierIcon = (tier) => {
    switch (tier) {
      case 'gold': return <Crown className="h-4 w-4" />;
      case 'silver': return <Award className="h-4 w-4" />;
      case 'bronze': return <Star className="h-4 w-4" />;
      default: return <Star className="h-4 w-4" />;
    }
  };



  const filteredCustomers = customers.filter(customer => {
    // Exclude walk-in customers and specific system customers
    const isWalkInCustomer = customer.first_name?.toLowerCase() === 'walk-in' ||
      `${customer.first_name} ${customer.last_name}`.toLowerCase() === 'walk-in customer';

    const isSystemCustomer = (customer.first_name === 'SDSerge' && customer.last_name === 'Dukuziyaremye');

    if (isWalkInCustomer || isSystemCustomer) return false;

    const searchLower = searchInput.toLowerCase();
    const matchesSearch = !searchInput ||
      customer.first_name?.toLowerCase().includes(searchLower) ||
      customer.last_name?.toLowerCase().includes(searchLower) ||
      customer.email?.toLowerCase().includes(searchLower) ||
      customer.phone?.toLowerCase().includes(searchLower);
    const matchesTier = selectedTier === 'all' || customer.loyalty_tier === selectedTier;
    const customerSegment = getCustomerSegment(customer);
    const matchesSegment = selectedSegment === 'all' || customerSegment === selectedSegment;
    return matchesSearch && matchesTier && matchesSegment;
  });

  // Calculate segment distribution (excluding walk-in customers and system customers)
  const segmentCounts = customers
    .filter(customer => {
      const isWalkInCustomer = customer.first_name?.toLowerCase() === 'walk-in' ||
        `${customer.first_name} ${customer.last_name}`.toLowerCase() === 'walk-in customer';
      const isSystemCustomer = (customer.first_name === 'SDSerge' && customer.last_name === 'Dukuziyaremye');
      return !isWalkInCustomer && !isSystemCustomer;
    })
    .reduce((acc, customer) => {
      const segment = getCustomerSegment(customer);
      acc[segment] = (acc[segment] || 0) + 1;
      return acc;
    }, {});

  // Calculate average health score (excluding walk-in customers and system customers)
  const nonWalkInCustomers = customers.filter(customer => {
    const isWalkInCustomer = customer.first_name?.toLowerCase() === 'walk-in' ||
      `${customer.first_name} ${customer.last_name}`.toLowerCase() === 'walk-in customer';
    const isSystemCustomer = (customer.first_name === 'SDSerge' && customer.last_name === 'Dukuziyaremye');
    return !isWalkInCustomer && !isSystemCustomer;
  });

  const avgHealthScore = nonWalkInCustomers.length > 0
    ? Math.round(nonWalkInCustomers.reduce((sum, customer) => sum + calculateHealthScore(customer), 0) / nonWalkInCustomers.length)
    : 0;

  if (isLoading) {
    return (
      <div className="animate-pulse space-y-8">
        <div className="h-8 bg-gray-200 rounded-lg w-1/4"></div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="bg-white rounded-xl p-6 shadow-sm">
              <div className="h-4 bg-gray-200 rounded w-1/2 mb-4"></div>
              <div className="h-8 bg-gray-200 rounded w-3/4"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">{tSync('Customers')}</h1>
          <p className="mt-2 text-gray-600">{tSync('Manage customer relationships and loyalty')}</p>
        </div>
        <div className="flex items-center gap-3">
          {/* View Mode Toggle */}
          <div className="flex items-center bg-gray-100 rounded-lg p-1">
            <button
              onClick={() => setViewMode('table')}
              className={`px-3 py-2 text-sm font-medium rounded-md transition-colors ${viewMode === 'table' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600 hover:text-gray-900'
                }`}
            >
              {tSync('Table')}
            </button>
            <button
              onClick={() => setViewMode('cards')}
              className={`px-3 py-2 text-sm font-medium rounded-md transition-colors ${viewMode === 'cards' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600 hover:text-gray-900'
                }`}
            >
              {tSync('Cards')}
            </button>
            <button
              onClick={() => setViewMode('insights')}
              className={`px-3 py-2 text-sm font-medium rounded-md transition-colors ${viewMode === 'insights' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600 hover:text-gray-900'
                }`}
            >
              {tSync('Insights')}
            </button>
          </div>

          <button
            onClick={() => setShowCampaignModal(true)}
            className="bg-green-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-green-700 transition-colors"
          >
            <Send className="h-5 w-5" />
            {tSync('Campaign')}
          </button>

          <button
            onClick={() => setShowAddModal(true)}
            className="bg-blue-600 text-white px-3 sm:px-4 py-2.5 sm:py-2 rounded-lg flex items-center justify-center gap-2 hover:bg-blue-700 transition-colors min-h-[44px] touch-target text-sm sm:text-base"
          >
            <Plus className="h-5 w-5" />
            <span className="hidden sm:inline">{tSync('Add Customer')}</span>
            <span className="sm:hidden">{tSync('Add')}</span>
          </button>
        </div>
      </div>

      {/* Enhanced Stats Cards */}
      {loyaltyStats && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 sm:gap-6">
          <div className="bg-white rounded-xl p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">{tSync('Total Customers')}</p>
                <p className="text-2xl font-bold text-gray-900">{nonWalkInCustomers.length}</p>
                <p className="text-xs text-green-600 mt-1">{tSync('All registered customers')}</p>
              </div>
              <Users className="h-8 w-8 text-blue-500" />
            </div>
          </div>

          <div className="bg-white rounded-xl p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">{tSync('Avg Health Score')}</p>
                <p className={`text-2xl font-bold ${getHealthScoreColor(avgHealthScore)}`}>{avgHealthScore}%</p>
                <p className="text-xs text-gray-500 mt-1">{tSync('Based on activity & spend')}</p>
              </div>
              <Activity className="h-8 w-8 text-green-500" />
            </div>
          </div>

          <div className="bg-white rounded-xl p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">{tSync('VIP Members')}</p>
                <p className="text-2xl font-bold text-purple-600">{segmentCounts.vip || 0}</p>
                <p className="text-xs text-gray-500 mt-1">{tSync('Gold tier or high spenders')}</p>
              </div>
              <Crown className="h-8 w-8 text-purple-600" />
            </div>
          </div>

          <div className="bg-white rounded-xl p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">{tSync('At Risk')}</p>
                <p className="text-2xl font-bold text-red-600">{segmentCounts.at_risk || 0}</p>
                <p className="text-xs text-gray-500 mt-1">{tSync('No recent activity')}</p>
              </div>
              <AlertTriangle className="h-8 w-8 text-red-500" />
            </div>
          </div>

          <div className="bg-white rounded-xl p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">{tSync('Total Points')}</p>
                <p className="text-2xl font-bold text-yellow-600">{loyaltyStats.total_points?.toLocaleString() || 0}</p>
                <p className="text-xs text-gray-500 mt-1">{tSync('Points in circulation')}</p>
              </div>
              <Award className="h-8 w-8 text-yellow-500" />
            </div>
          </div>

          <div className="bg-white rounded-xl p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">{tSync('New Customers')}</p>
                <p className="text-2xl font-bold text-green-600">{segmentCounts.new || 0}</p>
                <p className="text-xs text-gray-500 mt-1">{tSync('Joined this month')}</p>
              </div>
              <Star className="h-8 w-8 text-green-500" />
            </div>
          </div>
        </div>
      )}

      {/* Enhanced Search and Filters */}
      <div className="bg-white rounded-xl p-4 sm:p-6 shadow-sm">
        <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
            <input
              ref={searchInputRef}
              type="text"
              placeholder={tSync('Search customers...')}
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
              className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div className="flex flex-wrap gap-2">
            <select
              value={selectedTier}
              onChange={(e) => setSelectedTier(e.target.value)}
              className="px-3 sm:px-4 py-2.5 sm:py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent min-w-[100px] sm:min-w-[120px] text-sm sm:text-base"
            >
              <option value="all">{tSync('All Tiers')}</option>
              <option value="bronze">{tSync('Bronze')}</option>
              <option value="silver">{tSync('Silver')}</option>
              <option value="gold">{tSync('Gold')}</option>
            </select>

            <select
              value={selectedSegment}
              onChange={(e) => setSelectedSegment(e.target.value)}
              className="px-3 sm:px-4 py-2.5 sm:py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent min-w-[120px] sm:min-w-[140px] text-sm sm:text-base"
            >
              <option value="all">{tSync('All Segments')}</option>
              <option value="vip">{tSync('VIP')}</option>
              <option value="loyal">{tSync('Loyal')}</option>
              <option value="active">{tSync('Active')}</option>
              <option value="regular">{tSync('Regular')}</option>
              <option value="new">{tSync('New')}</option>
              <option value="at_risk">{tSync('At Risk')}</option>
            </select>

            <button
              onClick={() => {
                setSearchInput('');
                setSearchTerm('');
                setSelectedTier('all');
                setSelectedSegment('all');
                setCurrentPage(1);
                setItemsPerPage(10);
              }}
              className="px-3 sm:px-4 py-2.5 sm:py-3 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors min-h-[44px] flex items-center justify-center"
              title="Clear Filters"
            >
              <RefreshCw className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Quick Filter Tags */}
        <div className="flex flex-wrap gap-2 mt-4">
          <button
            onClick={() => setSelectedSegment('at_risk')}
            className="px-3 py-1 bg-red-100 text-red-700 rounded-full text-sm hover:bg-red-200 transition-colors"
          >
            🚨 {tSync('At Risk')} ({segmentCounts.at_risk || 0})
          </button>
          <button
            onClick={() => setSelectedSegment('vip')}
            className="px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-sm hover:bg-purple-200 transition-colors"
          >
            👑 {tSync('VIP')} ({segmentCounts.vip || 0})
          </button>
          <button
            onClick={() => setSelectedSegment('new')}
            className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm hover:bg-green-200 transition-colors"
          >
            ⭐ {tSync('New')} ({segmentCounts.new || 0})
          </button>
          <button
            onClick={() => setSelectedTier('gold')}
            className="px-3 py-1 bg-yellow-100 text-yellow-700 rounded-full text-sm hover:bg-yellow-200 transition-colors"
          >
            🥇 {tSync('Gold')}
          </button>
        </div>
      </div>

      {/* Dynamic Content Based on View Mode */}
      {/* Table View - Hidden on mobile, shown on md and up */}
      {viewMode === 'table' && (
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <div className="hidden md:block overflow-x-auto -mx-4 sm:mx-0">
            <div className="inline-block min-w-full align-middle px-4 sm:px-0">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {tSync('Customer')}
                    </th>
                    <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {tSync('Segment & Health')}
                    </th>
                    <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {tSync('Contact')}
                    </th>
                    <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {tSync('Loyalty')}
                    </th>
                    <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {tSync('Activity')}
                    </th>
                    <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {tSync('Special Dates')}
                    </th>
                    <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {tSync('Actions')}
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredCustomers.map((customer) => {
                    const segment = getCustomerSegment(customer);
                    const healthScore = calculateHealthScore(customer);

                    return (
                      <tr key={customer.id} className="hover:bg-gray-50">
                        <td className="px-3 sm:px-6 py-4 whitespace-nowrap text-xs sm:text-sm">
                          <div className="flex items-center">
                            <div className="h-10 w-10 rounded-full bg-gradient-to-r from-blue-500 to-purple-600 flex items-center justify-center text-white font-medium">
                              {customer.first_name?.[0]}{customer.last_name?.[0]}
                            </div>
                            <div className="ml-3">
                              <div className="text-sm font-medium text-gray-900">
                                {customer.first_name} {customer.last_name}
                              </div>
                            </div>
                          </div>
                        </td>

                        <td className="px-3 sm:px-6 py-4 whitespace-nowrap text-xs sm:text-sm">
                          <div className="space-y-2">
                            <span className={`inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full ${getSegmentColor(segment)}`}>
                              {getSegmentIcon(segment)}
                              {segment.charAt(0).toUpperCase() + segment.slice(1)}
                            </span>
                            <div className="flex items-center">
                              <div className="w-full bg-gray-200 rounded-full h-1.5 mr-2">
                                <div
                                  className={`h-1.5 rounded-full ${healthScore >= 80 ? 'bg-green-500' : healthScore >= 60 ? 'bg-yellow-500' : healthScore >= 40 ? 'bg-orange-500' : 'bg-red-500'}`}
                                  style={{ width: `${healthScore}%` }}
                                ></div>
                              </div>
                              <span className={`text-xs font-medium ${getHealthScoreColor(healthScore)}`}>
                                {healthScore}%
                              </span>
                            </div>
                          </div>
                        </td>

                        <td className="px-3 sm:px-6 py-4 whitespace-nowrap text-xs sm:text-sm">
                          <div className="space-y-1">
                            {customer.email && (
                              <div className="flex items-center text-sm text-gray-600">
                                <Mail className="h-4 w-4 mr-2" />
                                {customer.email}
                              </div>
                            )}
                            {customer.phone && (
                              <div className="flex items-center text-sm text-gray-600">
                                <Phone className="h-4 w-4 mr-2" />
                                {customer.phone}
                              </div>
                            )}
                          </div>
                        </td>

                        <td className="px-3 sm:px-6 py-4 whitespace-nowrap text-xs sm:text-sm">
                          <div className="space-y-1">
                            <span className={`inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full ${getTierColor(customer.loyalty_tier)}`}>
                              {getTierIcon(customer.loyalty_tier)}
                              {customer.loyalty_tier?.charAt(0).toUpperCase() + customer.loyalty_tier?.slice(1)}
                            </span>
                            <div className="flex items-center text-sm">
                              <Award className="h-4 w-4 mr-1 text-yellow-500" />
                              {customer.loyalty_points || 0} pts
                            </div>
                          </div>
                        </td>

                        <td className="px-3 sm:px-6 py-4 whitespace-nowrap text-xs sm:text-sm">
                          <div className="space-y-1 text-sm">
                            <div className="flex items-center text-gray-900 font-semibold">
                              <DollarSign className="h-4 w-4 mr-1 text-green-500" />
                              {formatCurrency(customer.total_spent || 0)}
                            </div>
                            <div className="text-xs text-gray-500">
                              {customer.purchase_count || 0} {tSync('orders')}
                            </div>
                            <div className="text-xs text-blue-600 font-medium">
                              Avg: {formatCurrency(customer.purchase_count > 0 ? ((customer.total_spent || 0) / customer.purchase_count) : 0)} {tSync('/ order')}
                            </div>
                          </div>
                        </td>

                        <td className="px-3 sm:px-6 py-4 whitespace-nowrap text-xs sm:text-sm">
                          <div className="space-y-1 text-xs text-gray-600">
                            {customer.birthday && (
                              <div className="flex items-center">
                                <Gift className="h-3 w-3 mr-1" />
                                {tSync('Birthday')}: {formatDate(customer.birthday)}
                              </div>
                            )}
                            {customer.anniversary_date && (
                              <div className="flex items-center">
                                <Calendar className="h-3 w-3 mr-1" />
                                {tSync('Anniversary')}: {formatDate(customer.anniversary_date)}
                              </div>
                            )}
                          </div>
                        </td>

                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <div className="flex space-x-2">
                            <button
                              onClick={() => {
                                setSelectedCustomer(customer);
                                setShowInsightsModal(true);
                              }}
                              className="text-purple-600 hover:text-purple-900"
                              title="Customer Insights"
                            >
                              <Brain className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => {
                                setSelectedCustomer(customer);
                                setShowLoyaltyModal(true);
                              }}
                              className="text-blue-600 hover:text-blue-900"
                              title="Manage Loyalty"
                            >
                              <Award className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => openEditModal(customer)}
                              className="text-indigo-600 hover:text-indigo-900"
                              title="Edit Customer"
                            >
                              <Edit className="h-4 w-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
          {/* Mobile Card View - Shown on mobile when table mode is selected */}
          <div className="md:hidden p-4 space-y-4">
            {filteredCustomers.map((customer) => {
              const segment = getCustomerSegment(customer);
              const healthScore = calculateHealthScore(customer);

              return (
                <div key={customer.id} className="bg-white rounded-xl p-4 shadow-sm border border-gray-200">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center flex-1">
                      <div className="h-10 w-10 rounded-full bg-gradient-to-r from-blue-500 to-purple-600 flex items-center justify-center text-white font-medium text-sm">
                        {customer.first_name?.[0]}{customer.last_name?.[0]}
                      </div>
                      <div className="ml-3 flex-1">
                        <h3 className="text-base font-medium text-gray-900">
                          {customer.first_name} {customer.last_name}
                        </h3>
                        <div className="flex items-center gap-2 mt-1">
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded-full ${getSegmentColor(segment)}`}>
                            {getSegmentIcon(segment)}
                            {segment.charAt(0).toUpperCase() + segment.slice(1)}
                          </span>
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded-full ${getTierColor(customer.loyalty_tier)}`}>
                            {getTierIcon(customer.loyalty_tier)}
                            {customer.loyalty_tier?.charAt(0).toUpperCase() + customer.loyalty_tier?.slice(1)}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex space-x-1 ml-2">
                      <button
                        onClick={() => {
                          setSelectedCustomer(customer);
                          setShowInsightsModal(true);
                        }}
                        className="p-2 text-purple-600 hover:text-purple-900 hover:bg-purple-50 rounded-lg transition-colors min-h-[36px] min-w-[36px] flex items-center justify-center"
                        title="Customer Insights"
                      >
                        <Brain className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => {
                          setSelectedCustomer(customer);
                          setShowLoyaltyModal(true);
                        }}
                        className="p-2 text-blue-600 hover:text-blue-900 hover:bg-blue-50 rounded-lg transition-colors min-h-[36px] min-w-[36px] flex items-center justify-center"
                        title="Manage Loyalty"
                      >
                        <Award className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => openEditModal(customer)}
                        className="p-2 text-indigo-600 hover:text-indigo-900 hover:bg-indigo-50 rounded-lg transition-colors min-h-[36px] min-w-[36px] flex items-center justify-center"
                        title="Edit Customer"
                      >
                        <Edit className="h-4 w-4" />
                      </button>
                    </div>
                  </div>

                  <div className="space-y-2 text-sm">
                    <div className="flex items-center justify-between">
                      <span className="text-gray-600">{tSync('Segment & Health')}:</span>
                      <div className="flex items-center gap-2">
                        <div className="w-24 bg-gray-200 rounded-full h-2">
                          <div
                            className={`h-2 rounded-full ${healthScore >= 80 ? 'bg-green-500' : healthScore >= 60 ? 'bg-yellow-500' : healthScore >= 40 ? 'bg-orange-500' : 'bg-red-500'}`}
                            style={{ width: `${healthScore}%` }}
                          ></div>
                        </div>
                        <span className={`text-xs font-medium ${getHealthScoreColor(healthScore)}`}>
                          {healthScore}%
                        </span>
                      </div>
                    </div>

                    {customer.email && (
                      <div className="flex items-center text-gray-600">
                        <Mail className="h-4 w-4 mr-2 flex-shrink-0" />
                        <span className="truncate">{customer.email}</span>
                      </div>
                    )}
                    {customer.phone && (
                      <div className="flex items-center text-gray-600">
                        <Phone className="h-4 w-4 mr-2 flex-shrink-0" />
                        <span>{customer.phone}</span>
                      </div>
                    )}

                    <div className="flex items-center justify-between pt-2 border-t border-gray-100">
                      <div className="flex items-center text-sm">
                        <Award className="h-4 w-4 mr-1 text-yellow-500" />
                        <span className="text-gray-700">{customer.loyalty_points || 0} pts</span>
                      </div>
                      <div className="flex items-center text-sm">
                        <DollarSign className="h-4 w-4 mr-1 text-green-500" />
                        <span className="font-semibold text-gray-900">
                          {formatCurrency(customer.total_spent || 0)}
                        </span>
                      </div>
                    </div>

                    {(customer.birthday || customer.anniversary_date) && (
                      <div className="pt-2 border-t border-gray-100 space-y-1 text-xs text-gray-600">
                        {customer.birthday && (
                          <div className="flex items-center">
                            <Gift className="h-3 w-3 mr-1" />
                            {tSync('Birthday')}: {formatDate(customer.birthday)}
                          </div>
                        )}
                        {customer.anniversary_date && (
                          <div className="flex items-center">
                            <Calendar className="h-3 w-3 mr-1" />
                            {tSync('Anniversary')}: {formatDate(customer.anniversary_date)}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Cards View - Desktop only (manual toggle) */}
      {viewMode === 'cards' && (
        <div className="hidden md:grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredCustomers.map((customer) => {
            const segment = getCustomerSegment(customer);
            const healthScore = calculateHealthScore(customer);

            return (
              <div key={customer.id} className="bg-white rounded-xl p-6 shadow-sm border border-gray-200 hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center">
                    <div className="h-12 w-12 rounded-full bg-gradient-to-r from-blue-500 to-purple-600 flex items-center justify-center text-white font-medium text-lg">
                      {customer.first_name?.[0]}{customer.last_name?.[0]}
                    </div>
                    <div className="ml-3">
                      <h3 className="text-lg font-medium text-gray-900">
                        {customer.first_name} {customer.last_name}
                      </h3>
                      <div className="flex items-center gap-2 mt-1">
                        <span className={`inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full ${getSegmentColor(segment)}`}>
                          {getSegmentIcon(segment)}
                          {segment.charAt(0).toUpperCase() + segment.slice(1)}
                        </span>
                        <span className={`inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full ${getTierColor(customer.loyalty_tier)}`}>
                          {getTierIcon(customer.loyalty_tier)}
                          {customer.loyalty_tier?.charAt(0).toUpperCase() + customer.loyalty_tier?.slice(1)}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  {/* Health Score */}
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm text-gray-600">{tSync('Segment & Health')}</span>
                      <span className={`text-sm font-medium ${getHealthScoreColor(healthScore)}`}>
                        {healthScore}%
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className={`h-2 rounded-full ${healthScore >= 80 ? 'bg-green-500' : healthScore >= 60 ? 'bg-yellow-500' : healthScore >= 40 ? 'bg-orange-500' : 'bg-red-500'}`}
                        style={{ width: `${healthScore}%` }}
                      ></div>
                    </div>
                  </div>

                  {/* Stats */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <div className="text-sm text-gray-600">Points</div>
                      <div className="text-lg font-semibold text-gray-900">{customer.loyalty_points || 0}</div>
                    </div>
                    <div>
                      <div className="text-sm text-gray-600">Total Spent</div>
                      <div className="text-lg font-semibold text-green-600">{formatCurrency(customer.total_spent || 0)}</div>
                    </div>
                  </div>

                  {/* Additional Activity Stats */}
                  <div className="grid grid-cols-2 gap-4 pt-2 border-t border-gray-200">
                    <div>
                      <div className="text-sm text-gray-600">Purchases</div>
                      <div className="text-sm font-semibold text-gray-900">{customer.purchase_count || 0} orders</div>
                    </div>
                    <div>
                      <div className="text-sm text-gray-600">Avg Order</div>
                      <div className="text-sm font-semibold text-blue-600">
                        {formatCurrency(customer.purchase_count > 0 ? ((customer.total_spent || 0) / customer.purchase_count) : 0)}
                      </div>
                    </div>
                  </div>

                  {/* Contact */}
                  {(customer.email || customer.phone) && (
                    <div className="space-y-1">
                      {customer.email && (
                        <div className="flex items-center text-sm text-gray-600">
                          <Mail className="h-4 w-4 mr-2" />
                          {customer.email}
                        </div>
                      )}
                      {customer.phone && (
                        <div className="flex items-center text-sm text-gray-600">
                          <Phone className="h-4 w-4 mr-2" />
                          {customer.phone}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div className="flex justify-between pt-4 mt-4 border-t border-gray-200">
                  <button
                    onClick={() => {
                      setSelectedCustomer(customer);
                      setShowInsightsModal(true);
                    }}
                    className="flex items-center gap-1 text-purple-600 hover:text-purple-700 text-sm font-medium"
                  >
                    <Brain className="h-4 w-4" />
                    Insights
                  </button>
                  <button
                    onClick={() => {
                      setSelectedCustomer(customer);
                      setShowLoyaltyModal(true);
                    }}
                    className="flex items-center gap-1 text-blue-600 hover:text-blue-700 text-sm font-medium"
                  >
                    <Award className="h-4 w-4" />
                    Loyalty
                  </button>
                  <button
                    onClick={() => openEditModal(customer)}
                    className="flex items-center gap-1 text-indigo-600 hover:text-indigo-700 text-sm font-medium"
                  >
                    <Edit className="h-4 w-4" />
                    Edit
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Insights View */}
      {viewMode === 'insights' && (
        <CustomerInsightsDashboard
          customers={filteredCustomers}
          segmentCounts={segmentCounts}
          loyaltyStats={loyaltyStats}
        />
      )}

      {/* Pagination Controls */}
      {pagination && pagination.totalPages > 1 && (
        <div className="bg-white rounded-xl shadow-sm p-4 sm:p-6">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            {/* Page Info */}
            <div className="text-sm text-gray-700 order-2 sm:order-1">
              Showing {((pagination.page - 1) * pagination.limit) + 1} to {Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total} customers
            </div>

            {/* Pagination Controls */}
            <div className="flex items-center gap-2 order-1 sm:order-2">
              {/* Previous Button */}
              <button
                onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                disabled={currentPage === 1 || isLoading}
                className="px-3 py-2 text-sm font-medium text-gray-500 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <span className="hidden sm:inline">Previous</span>
                <span className="sm:hidden">Prev</span>
              </button>

              {/* Page Numbers - Hidden on mobile */}
              <div className="hidden sm:flex items-center gap-1">
                {/* First page */}
                {currentPage > 3 && (
                  <>
                    <button
                      onClick={() => setCurrentPage(1)}
                      disabled={isLoading}
                      className="px-3 py-2 text-sm font-medium text-gray-500 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 transition-colors"
                    >
                      1
                    </button>
                    {currentPage > 4 && (
                      <span className="px-2 py-2 text-sm text-gray-500">...</span>
                    )}
                  </>
                )}

                {/* Current page and neighbors */}
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

                  if (pageNum < 1 || pageNum > pagination.totalPages) return null;

                  return (
                    <button
                      key={pageNum}
                      onClick={() => setCurrentPage(pageNum)}
                      disabled={isLoading}
                      className={`px-3 py-2 text-sm font-medium rounded-lg transition-colors disabled:opacity-50 ${currentPage === pageNum
                        ? 'bg-blue-600 text-white'
                        : 'text-gray-500 bg-white border border-gray-300 hover:bg-gray-50'
                        }`}
                    >
                      {pageNum}
                    </button>
                  );
                })}

                {/* Last page */}
                {currentPage < pagination.totalPages - 2 && (
                  <>
                    {currentPage < pagination.totalPages - 3 && (
                      <span className="px-2 py-2 text-sm text-gray-500">...</span>
                    )}
                    <button
                      onClick={() => setCurrentPage(pagination.totalPages)}
                      disabled={isLoading}
                      className="px-3 py-2 text-sm font-medium text-gray-500 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 transition-colors"
                    >
                      {pagination.totalPages}
                    </button>
                  </>
                )}
              </div>

              {/* Mobile page indicator */}
              <div className="sm:hidden px-3 py-2 text-sm text-gray-700 bg-gray-50 rounded-lg">
                {currentPage} / {pagination.totalPages}
              </div>

              {/* Next Button */}
              <button
                onClick={() => setCurrentPage(Math.min(pagination.totalPages, currentPage + 1))}
                disabled={currentPage === pagination.totalPages || isLoading}
                className="px-3 py-2 text-sm font-medium text-gray-500 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <span className="hidden sm:inline">Next</span>
                <span className="sm:hidden">Next</span>
              </button>
            </div>

            {/* Items per page selector */}
            <div className="flex items-center gap-2 text-sm order-3">
              <label htmlFor="itemsPerPage" className="text-gray-700">
                Show:
              </label>
              <select
                id="itemsPerPage"
                value={itemsPerPage}
                onChange={(e) => {
                  const newLimit = parseInt(e.target.value);
                  setItemsPerPage(newLimit);
                  setCurrentPage(1); // Reset to first page when changing limit
                }}
                disabled={isLoading}
                className="px-2 py-1 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50"
              >
                <option value={10}>10</option>
                <option value={25}>25</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>
              <span className="text-gray-700">per page</span>
            </div>
          </div>
        </div>
      )}

      {/* Add/Edit Customer Modal */}
      {(showAddModal || showEditModal) && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-2 sm:p-4">
          <div className="bg-white rounded-lg p-4 sm:p-6 w-full max-w-2xl mx-2 sm:mx-4 max-h-[98vh] sm:max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-gray-900">
                {selectedCustomer ? <TranslatedText text="Edit Customer" /> : <TranslatedText text="Add New Customer" />}
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

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    <TranslatedText text="First Name" /> *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.firstName}
                    onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    <TranslatedText text="Last Name" /> *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.lastName}
                    onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    <TranslatedText text="Email" />
                  </label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    <TranslatedText text="Phone" />
                  </label>
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  <TranslatedText text="Address" />
                </label>
                <input
                  type="text"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    <TranslatedText text="City" />
                  </label>
                  <input
                    type="text"
                    value={formData.city}
                    onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    <TranslatedText text="State" />
                  </label>
                  <input
                    type="text"
                    value={formData.state}
                    onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    <TranslatedText text="Postal Code" />
                  </label>
                  <input
                    type="text"
                    value={formData.postalCode}
                    onChange={(e) => setFormData({ ...formData, postalCode: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    <TranslatedText text="Birthday" />
                  </label>
                  <input
                    type="date"
                    value={formData.birthday}
                    onChange={(e) => setFormData({ ...formData, birthday: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    <TranslatedText text="Anniversary Date" />
                  </label>
                  <input
                    type="date"
                    value={formData.anniversaryDate}
                    onChange={(e) => setFormData({ ...formData, anniversaryDate: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>

              <div className="flex justify-end space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowAddModal(false);
                    setShowEditModal(false);
                    resetForm();
                  }}
                  className="px-4 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  <TranslatedText text="Cancel" />
                </button>
                <button
                  type="submit"
                  disabled={createCustomerMutation.isLoading || updateCustomerMutation.isLoading}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                >
                  {createCustomerMutation.isLoading || updateCustomerMutation.isLoading
                    ? <TranslatedText text="Saving..." />
                    : selectedCustomer ? <TranslatedText text="Update Customer" /> : <TranslatedText text="Create Customer" />
                  }
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Customer Insights Modal */}
      {showInsightsModal && selectedCustomer && (
        <CustomerInsightsModal
          customer={selectedCustomer}
          onClose={() => {
            setShowInsightsModal(false);
            setSelectedCustomer(null);
          }}
        />
      )}

      {/* Campaign Modal */}
      {showCampaignModal && (
        <CampaignModal
          onClose={() => setShowCampaignModal(false)}
          customers={filteredCustomers}
        />
      )}

      {/* Loyalty Management Modal */}
      {showLoyaltyModal && selectedCustomer && (
        <LoyaltyModal
          customer={selectedCustomer}
          onClose={() => {
            setShowLoyaltyModal(false);
            setSelectedCustomer(null);
          }}
          onAddPoints={(data) => addPointsMutation.mutate(data)}
        />
      )}
    </div>
  );
}

// Customer Insights Dashboard Component
function CustomerInsightsDashboard({ customers, segmentCounts, loyaltyStats }) {
  return (
    <div className="space-y-6">
      {/* Segment Analysis */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl p-6 shadow-sm">
          <h3 className="text-lg font-semibold text-gray-900 mb-4"><TranslatedText text="Customer Segments" /></h3>
          <div className="space-y-3">
            {Object.entries(segmentCounts).map(([segment, count]) => (
              <div key={segment} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-2">
                  <div className={`w-3 h-3 rounded-full ${segment === 'vip' ? 'bg-purple-500' :
                    segment === 'loyal' ? 'bg-green-500' :
                      segment === 'active' ? 'bg-blue-500' :
                        segment === 'at_risk' ? 'bg-red-500' :
                          segment === 'new' ? 'bg-yellow-500' : 'bg-gray-500'
                    }`}></div>
                  <span className="font-medium text-gray-900">
                    {segment.charAt(0).toUpperCase() + segment.slice(1)}
                  </span>
                </div>
                <div className="text-right">
                  <div className="font-semibold text-gray-900">{count}</div>
                  <div className="text-xs text-gray-500">
                    {customers.length > 0 ? Math.round((count / customers.length) * 100) : 0}%
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-xl p-6 shadow-sm">
          <h3 className="text-lg font-semibold text-gray-900 mb-4"><TranslatedText text="Actionable Insights" /></h3>
          <div className="space-y-3">
            <div className="p-3 border border-red-200 rounded-lg bg-red-50">
              <h4 className="font-medium text-red-800 mb-1">At-Risk Alert</h4>
              <p className="text-sm text-red-700">
                {segmentCounts.at_risk || 0} customers need immediate attention
              </p>
            </div>
            <div className="p-3 border border-green-200 rounded-lg bg-green-50">
              <h4 className="font-medium text-green-800 mb-1">VIP Opportunity</h4>
              <p className="text-sm text-green-700">
                {customers.filter(c => c.total_spent > 500 && c.loyalty_tier !== 'gold').length} customers ready for upgrade
              </p>
            </div>
            <div className="p-3 border border-blue-200 rounded-lg bg-blue-50">
              <h4 className="font-medium text-blue-800 mb-1">New Customers</h4>
              <p className="text-sm text-blue-700">
                {segmentCounts.new || 0} customers in onboarding phase
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Customer Insights Modal Component
function CustomerInsightsModal({ customer, onClose }) {
  const healthScore = calculateHealthScore(customer);
  const segment = getCustomerSegment(customer);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-4xl mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <Brain className="h-6 w-6 text-purple-500" />
            <TranslatedText text="Customer Intelligence" /> - {customer.first_name} {customer.last_name}
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="h-6 w-6" />
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Health Score */}
          <div className="bg-gray-50 rounded-lg p-4">
            <h3 className="font-medium text-gray-900 mb-3"><TranslatedText text="Health Score" /></h3>
            <div className="text-center">
              <div className={`text-4xl font-bold mb-2 ${getHealthScoreColor(healthScore)}`}>
                {healthScore}%
              </div>
              <div className="w-full bg-gray-200 rounded-full h-3 mb-2">
                <div
                  className={`h-3 rounded-full ${healthScore >= 80 ? 'bg-green-500' : healthScore >= 60 ? 'bg-yellow-500' : healthScore >= 40 ? 'bg-orange-500' : 'bg-red-500'}`}
                  style={{ width: `${healthScore}%` }}
                ></div>
              </div>
              <span className={`text-sm font-medium px-2 py-1 rounded-full ${getSegmentColor(segment)}`}>
                {segment.charAt(0).toUpperCase() + segment.slice(1)} Customer
              </span>
            </div>
          </div>

          {/* Key Metrics */}
          <div className="bg-gray-50 rounded-lg p-4">
            <h3 className="font-medium text-gray-900 mb-3"><TranslatedText text="Key Metrics" /></h3>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-gray-600"><TranslatedText text="Total Spent" /></span>
                <span className="font-medium text-green-600">${(customer.total_spent || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600"><TranslatedText text="Average Order" /></span>
                <span className="font-medium text-blue-600">
                  ${customer.purchase_count > 0 ? ((customer.total_spent || 0) / customer.purchase_count).toFixed(2) : '0.00'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600"><TranslatedText text="Loyalty Points" /></span>
                <span className="font-medium">{customer.loyalty_points || 0}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600"><TranslatedText text="Tier" /></span>
                <span className="font-medium">{customer.loyalty_tier || 'Bronze'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600"><TranslatedText text="Total Orders" /></span>
                <span className="font-medium">{customer.purchase_count || 0} <TranslatedText text="orders" /></span>
              </div>
            </div>
          </div>

          {/* AI Predictions */}
          <div className="bg-gray-50 rounded-lg p-4">
            <h3 className="font-medium text-gray-900 mb-3"><TranslatedText text="AI Predictions" /></h3>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-gray-600"><TranslatedText text="Churn Risk" /></span>
                <span className={`font-medium ${segment === 'at_risk' ? 'text-red-600' : 'text-green-600'}`}>
                  {segment === 'at_risk' ? 'High' : 'Low'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600"><TranslatedText text="Next Purchase" /></span>
                <span className="font-medium">14-21 <TranslatedText text="days" /></span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600"><TranslatedText text="CLV" /></span>
                <span className="font-medium">${((customer.total_spent || 0) * 2.5).toFixed(0)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Recommendations */}
        <div className="mt-6">
          <h3 className="font-medium text-gray-900 mb-4"><TranslatedText text="AI Recommendations" /></h3>
          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50">
              <div className="flex items-center gap-3">
                <Award className="h-5 w-5 text-orange-500" />
                <div>
                  <div className="font-medium text-gray-900">Loyalty Boost</div>
                  <div className="text-sm text-gray-600">Offer double points on next purchase</div>
                </div>
              </div>
              <button className="text-blue-600 hover:text-blue-700 text-sm font-medium">
                Execute
              </button>
            </div>

            <div className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50">
              <div className="flex items-center gap-3">
                <MessageCircle className="h-5 w-5 text-blue-500" />
                <div>
                  <div className="font-medium text-gray-900">Personal Touch</div>
                  <div className="text-sm text-gray-600">Send personalized product recommendations</div>
                </div>
              </div>
              <button className="text-blue-600 hover:text-blue-700 text-sm font-medium">
                Execute
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Campaign Modal Component
function CampaignModal({ onClose, customers }) {
  const [campaignType, setCampaignType] = useState('email');
  const [targetSegment, setTargetSegment] = useState('all');
  const [campaignName, setCampaignName] = useState('');
  const [message, setMessage] = useState('');

  const targetedCustomers = customers.filter(customer => {
    if (targetSegment === 'all') return true;
    return getCustomerSegment(customer) === targetSegment;
  });

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <Send className="h-6 w-6 text-green-500" />
            Create Campaign
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="h-6 w-6" />
          </button>
        </div>

        <div className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Campaign Name
            </label>
            <input
              type="text"
              value={campaignName}
              onChange={(e) => setCampaignName(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Enter campaign name"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Campaign Type
              </label>
              <select
                value={campaignType}
                onChange={(e) => setCampaignType(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="email">Email</option>
                <option value="sms">SMS</option>
                <option value="push">Push Notification</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Target Segment
              </label>
              <select
                value={targetSegment}
                onChange={(e) => setTargetSegment(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="all">All Customers</option>
                <option value="vip">VIP</option>
                <option value="loyal">Loyal</option>
                <option value="active">Active</option>
                <option value="at_risk">At Risk</option>
                <option value="new">New</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Message
            </label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={4}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Enter your campaign message..."
            />
          </div>

          <div className="bg-gray-50 rounded-lg p-4">
            <h3 className="font-medium text-gray-900 mb-2"><TranslatedText text="Campaign Preview" /></h3>
            <div className="text-sm text-gray-600">
              <p><strong>Target Audience:</strong> {targetedCustomers.length} customers</p>
              <p><strong>Delivery Method:</strong> {campaignType.charAt(0).toUpperCase() + campaignType.slice(1)}</p>
              <p><strong>Estimated Reach:</strong> {Math.round(targetedCustomers.length * 0.85)} customers</p>
            </div>
          </div>

          <div className="flex justify-end space-x-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              onClick={() => {
                toast.success(`Campaign "${campaignName}" scheduled for ${targetedCustomers.length} customers!`);
                onClose();
              }}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
            >
              Launch Campaign
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// Loyalty Management Modal Component
function LoyaltyModal({ customer, onClose, onAddPoints }) {
  const [points, setPoints] = useState('');
  const [description, setDescription] = useState('');

  const { data: loyaltyData } = useQuery({
    queryKey: ['customer-loyalty', customer.id],
    queryFn: () => loyaltyAPI.getCustomer(customer.id).then(res => res.data),
  });

  const handleAddPoints = (e) => {
    e.preventDefault();
    if (points && description) {
      onAddPoints({
        customer_id: customer.id,
        points: parseInt(points),
        description
      });
      setPoints('');
      setDescription('');
    }
  };

  const getTierColor = (tier) => {
    switch (tier) {
      case 'gold': return 'text-yellow-600 bg-yellow-100';
      case 'silver': return 'text-gray-600 bg-gray-100';
      case 'bronze': return 'text-orange-600 bg-orange-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-gray-900">
            Loyalty Management - {customer.first_name} {customer.last_name}
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="h-6 w-6" />
          </button>
        </div>

        {loyaltyData && (
          <div className="space-y-6">
            {/* Current Status */}
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-gray-900">{loyaltyData.customer.loyalty_points}</div>
                  <div className="text-sm text-gray-600">Current Points</div>
                </div>
                <div className="text-center">
                  <span className={`inline-flex items-center gap-1 px-3 py-1 text-sm font-medium rounded-full ${getTierColor(loyaltyData.customer.loyalty_tier)}`}>
                    <Crown className="h-4 w-4" />
                    {loyaltyData.customer.loyalty_tier?.charAt(0).toUpperCase() + loyaltyData.customer.loyalty_tier?.slice(1)}
                  </span>
                  <div className="text-sm text-gray-600 mt-1">Current Tier</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">${(loyaltyData.customer.total_spent || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}</div>
                  <div className="text-sm text-gray-600">Total Spent</div>
                  <div className="text-xs text-blue-600 mt-1">
                    Avg: ${loyaltyData.customer.purchase_count > 0 ? ((loyaltyData.customer.total_spent || 0) / loyaltyData.customer.purchase_count).toFixed(2) : '0.00'} per order
                  </div>
                </div>
              </div>
            </div>

            {/* Add Points Form */}
            <form onSubmit={handleAddPoints} className="border rounded-lg p-4">
              <h3 className="font-medium text-gray-900 mb-3"><TranslatedText text="Add Loyalty Points" /></h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Points
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={points}
                    onChange={(e) => setPoints(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Enter points"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Description
                  </label>
                  <input
                    type="text"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Reason for adding points"
                  />
                </div>
              </div>
              <button
                type="submit"
                className="mt-3 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Add Points
              </button>
            </form>

            {/* Transaction History */}
            <div>
              <h3 className="font-medium text-gray-900 mb-3"><TranslatedText text="Recent Transactions" /></h3>
              <div className="border rounded-lg overflow-hidden">
                <div className="max-h-60 overflow-y-auto">
                  {loyaltyData.transactions.map((transaction) => (
                    <div key={transaction.id} className="flex items-center justify-between p-3 border-b last:border-b-0">
                      <div>
                        <div className="text-sm font-medium text-gray-900">
                          {transaction.description}
                        </div>
                        <div className="text-xs text-gray-500">
                          {new Date(transaction.created_at).toLocaleDateString()}
                        </div>
                      </div>
                      <div className={`text-sm font-medium ${transaction.transaction_type === 'earned' ? 'text-green-600' : 'text-red-600'}`}>
                        {transaction.transaction_type === 'earned' ? '+' : '-'}{Math.abs(transaction.points)} pts
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// Helper Functions
function calculateHealthScore(customer) {
  if (!customer) return 0;

  let score = 0;

  // Purchase activity (40%)
  const purchaseCount = customer.purchase_count || 0;
  if (purchaseCount >= 10) score += 40;
  else if (purchaseCount >= 5) score += 30;
  else if (purchaseCount >= 1) score += 20;
  else score += 10;

  // Spending behavior (30%)
  const totalSpent = customer.total_spent || 0;
  if (totalSpent >= 1000) score += 30;
  else if (totalSpent >= 500) score += 25;
  else if (totalSpent >= 100) score += 20;
  else if (totalSpent >= 50) score += 15;
  else if (totalSpent > 0) score += 10;

  // Loyalty engagement (20%)
  const loyaltyPoints = customer.loyalty_points || 0;
  if (loyaltyPoints >= 500) score += 20;
  else if (loyaltyPoints >= 100) score += 15;
  else if (loyaltyPoints >= 50) score += 10;
  else if (loyaltyPoints > 0) score += 5;

  // Recency (10%)
  const lastPurchase = customer.last_purchase ? new Date(customer.last_purchase) : null;
  if (lastPurchase) {
    const daysSinceLastPurchase = Math.floor((new Date() - lastPurchase) / (1000 * 60 * 60 * 24));
    if (daysSinceLastPurchase <= 30) score += 10;
    else if (daysSinceLastPurchase <= 60) score += 8;
    else if (daysSinceLastPurchase <= 90) score += 5;
    else if (daysSinceLastPurchase <= 180) score += 3;
  }

  return Math.min(100, score);
}

function getCustomerSegment(customer) {
  if (!customer) return 'unknown';

  const healthScore = calculateHealthScore(customer);
  const totalSpent = customer.total_spent || 0;
  const purchaseCount = customer.purchase_count || 0;
  const loyaltyPoints = customer.loyalty_points || 0;

  // VIP customers: High spending, high loyalty
  if (totalSpent >= 1000 && loyaltyPoints >= 500) return 'vip';

  // Loyal customers: Regular purchases, good engagement
  if (purchaseCount >= 5 && loyaltyPoints >= 100) return 'loyal';

  // Active customers: Recent activity
  if (healthScore >= 60) return 'active';

  // At-risk customers: Low health score but has purchased before
  if (purchaseCount > 0 && healthScore < 40) return 'at_risk';

  // New customers: Recent registration, low purchase history
  if (purchaseCount <= 1) return 'new';

  return 'inactive';
}

function getHealthScoreColor(score) {
  if (score >= 80) return 'text-green-600';
  if (score >= 60) return 'text-yellow-600';
  if (score >= 40) return 'text-orange-600';
  return 'text-red-600';
}

function getSegmentColor(segment) {
  const colors = {
    vip: 'bg-purple-100 text-purple-800',
    loyal: 'bg-green-100 text-green-800',
    active: 'bg-blue-100 text-blue-800',
    at_risk: 'bg-red-100 text-red-800',
    new: 'bg-yellow-100 text-yellow-800',
    inactive: 'bg-gray-100 text-gray-800'
  };
  return colors[segment] || colors.inactive;
}