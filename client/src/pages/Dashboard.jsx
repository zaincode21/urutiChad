import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import TranslatedText from '../components/TranslatedText';
import { useTranslation } from '../hooks/useTranslation';
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  ShoppingCart,
  Users,
  Package,
  Store,
  Activity,
  Calendar,
  BarChart3,
  PieChart,
  Target,
  Award,
  Clock,
  AlertTriangle,
  CheckCircle,
  XCircle,
  ArrowUpRight,
  ArrowDownRight,
  Eye,
  Filter,
  Download,
  RefreshCw,
  Settings,
  Bell,
  Search,
  MoreHorizontal,
  ChevronRight,
  Zap,
  Shield,
  Globe,
  Smartphone,
  CreditCard,
  Truck,
  Star,
  MessageSquare,
  FileText,
  TrendingUp as TrendingUpIcon,
  TrendingDown as TrendingDownIcon
} from 'lucide-react';
import { dashboardAPI, shopsAPI } from '../lib/api';
import { useAuth } from '../contexts/AuthContext';
import LoadingSpinner from '../components/LoadingSpinner';
import SkeletonLoader from '../components/SkeletonLoader';
import ErrorBoundary from '../components/ErrorBoundary';
import OnboardingTour from '../components/OnboardingTour';

const Dashboard = () => {
  const { tSync } = useTranslation();
  const [period, setPeriod] = useState('30');
  const [selectedShop, setSelectedShop] = useState('all');
  const [showOnboarding, setShowOnboarding] = useState(false);
  const navigate = useNavigate();
  const { user } = useAuth();

  // Check if user needs onboarding (first time or new user)
  useEffect(() => {
    const hasSeenOnboarding = localStorage.getItem('hasSeenOnboarding');
    if (!hasSeenOnboarding && user) {
      setShowOnboarding(true);
    }
  }, [user]);

  const handleOnboardingComplete = () => {
    localStorage.setItem('hasSeenOnboarding', 'true');
    setShowOnboarding(false);
  };

  const { data: dashboardData, isLoading, error } = useQuery({
    queryKey: ['dashboard', period, user?.role, user?.id],
    queryFn: () => dashboardAPI.getOverview({ period }).then(res => res.data),
    refetchInterval: 30000 // Refresh every 30 seconds
  });

  const { data: shopsData } = useQuery({
    queryKey: ['shops'],
    queryFn: () => shopsAPI.getAll().then(res => res.data),
    enabled: true
  });

  const shops = Array.isArray(shopsData?.shops) ? shopsData.shops : [];

  if (isLoading) {
    return (
      <div className="space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <div className="h-8 bg-gray-200 rounded-lg w-1/4 mb-2 animate-pulse"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2 animate-pulse"></div>
          </div>
          <div className="flex items-center gap-4">
            <div className="h-10 bg-gray-200 rounded w-32 animate-pulse"></div>
            <div className="h-10 bg-gray-200 rounded w-24 animate-pulse"></div>
          </div>
        </div>

        <SkeletonLoader type="card" count={4} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6" />

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <SkeletonLoader type="chart" count={1} />
          <SkeletonLoader type="list" count={1} />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <ErrorBoundary
        error={error}
        onRetry={() => window.location.reload()}
        onGoHome={() => navigate('/dashboard')}
        title="Erreur du Tableau de Bord"
        message="Nous n'avons pas pu charger les données de votre tableau de bord. Il pourrait s'agir d'un problème temporaire."
      />
    );
  }

  const data = dashboardData || {};

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'CFA',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount || 0);
  };

  const formatNumber = (num) => {
    return new Intl.NumberFormat('en-US').format(num || 0);
  };

  const getPercentageChange = (current, previous) => {
    if (!previous || previous === 0) return 0;
    return ((current - previous) / previous) * 100;
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'completed': return 'text-green-600 bg-green-50';
      case 'pending': return 'text-yellow-600 bg-yellow-50';
      case 'cancelled': return 'text-red-600 bg-red-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'completed': return <CheckCircle className="h-4 w-4" />;
      case 'pending': return <Clock className="h-4 w-4" />;
      case 'cancelled': return <XCircle className="h-4 w-4" />;
      default: return <Activity className="h-4 w-4" />;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50/50">
      {/* Onboarding Tour */}
      <OnboardingTour
        isVisible={showOnboarding}
        onComplete={handleOnboardingComplete}
        userRole={user?.role}
      />

      {/* Professional Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-header">
        <div className="px-4 sm:px-6 py-4">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div className="flex items-center space-x-4">
              <div>
                <h1 className="text-xl lg:text-2xl font-bold text-gray-900 tracking-tight">
                  {user?.role === 'cashier' ? (
                    <TranslatedText text="Cashier Dashboard" />
                  ) : (
                    <TranslatedText text="Dashboard" />
                  )}
                </h1>
                <p className="text-xs lg:text-sm text-gray-600 mt-1">
                  {user?.role === 'cashier' ? (
                    <TranslatedText text="Your daily sales overview and quick actions" />
                  ) : (
                    <TranslatedText text="Overview of your business performance and key metrics" />
                  )}
                </p>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
              {/* Mobile Action Buttons */}
              <div className="flex items-center space-x-2 lg:space-x-3">
                {/* Notifications */}
                <button className="relative p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center">
                  <Bell className="h-5 w-5" />
                  <span className="absolute -top-1 -right-1 h-3 w-3 bg-red-500 rounded-full"></span>
                </button>

                {/* Refresh */}
                <button className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center">
                  <RefreshCw className="h-5 w-5" />
                </button>

                {/* Settings */}
                <button className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center">
                  <Settings className="h-5 w-5" />
                </button>
              </div>

              {/* Filters */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full sm:w-auto">
                {user?.role !== 'cashier' && (
                  <div className="relative">
                    <select
                      value={selectedShop}
                      onChange={(e) => setSelectedShop(e.target.value)}
                      className="appearance-none bg-white border border-gray-300 rounded-lg px-3 py-3 pr-8 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors w-full sm:w-auto min-w-[140px]"
                    >
                      <option value="all">{tSync("All Locations")}</option>
                      {shops?.map(shop => (
                        <option key={shop.id} value={shop.id}>{shop.name}</option>
                      ))}
                    </select>
                    <Filter className="absolute right-2 top-3.5 h-4 w-4 text-gray-400 pointer-events-none" />
                  </div>
                )}

                <div className="relative">
                  <select
                    value={period}
                    onChange={(e) => setPeriod(e.target.value)}
                    className="appearance-none bg-white border border-gray-300 rounded-lg px-3 py-3 pr-8 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors w-full sm:w-auto min-w-[140px]"
                  >
                    <option value="7">{tSync('Last 7 days')}</option>
                    <option value="30">{tSync('Last 30 days')}</option>
                    <option value="90">{tSync('Last 90 days')}</option>
                    <option value="365">{tSync('Last year')}</option>
                  </select>
                  <Calendar className="absolute right-2 top-3.5 h-4 w-4 text-gray-400 pointer-events-none" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="px-4 sm:px-6 py-4 sm:py-6 space-y-4 sm:space-y-6">

        {/* Professional KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 lg:gap-6">
          {/* Revenue KPI */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition-all duration-200">
            <div className="p-4 lg:p-6">
              <div className="flex items-center justify-between mb-3 lg:mb-4">
                <div className="p-2 lg:p-3 bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-xl shadow-lg">
                  <DollarSign className="h-5 w-5 lg:h-6 lg:w-6 text-white" />
                </div>
                <div className={`flex items-center px-2 py-1 rounded-full text-xs font-medium ${getPercentageChange(data.total_revenue, data.previous_revenue) >= 0
                  ? 'bg-emerald-100 text-emerald-700'
                  : 'bg-red-100 text-red-700'
                  }`}>
                  {getPercentageChange(data.total_revenue, data.previous_revenue) >= 0 ? (
                    <TrendingUpIcon className="h-3 w-3 mr-1" />
                  ) : (
                    <TrendingDownIcon className="h-3 w-3 mr-1" />
                  )}
                  {Math.abs(getPercentageChange(data.total_revenue, data.previous_revenue)).toFixed(1)}%
                </div>
              </div>
              <div className="space-y-1">
                <p className="text-xl lg:text-2xl font-bold text-gray-900">{formatCurrency(data.total_revenue || 0)}</p>
                <h3 className="text-xs lg:text-sm font-medium text-gray-600">
                  <TranslatedText text="Total Revenue" />
                </h3>
                <p className="text-xs text-gray-500">
                  <TranslatedText text="vs" /> {formatCurrency(data.previous_revenue)} <TranslatedText text="previous" />
                </p>
              </div>
            </div>
            <div className="h-1 bg-gradient-to-r from-emerald-500 to-emerald-600"></div>
          </div>

          {/* Orders KPI */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition-all duration-200">
            <div className="p-4 lg:p-6">
              <div className="flex items-center justify-between mb-3 lg:mb-4">
                <div className="p-2 lg:p-3 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl shadow-lg">
                  <ShoppingCart className="h-5 w-5 lg:h-6 lg:w-6 text-white" />
                </div>
                <div className={`flex items-center px-2 py-1 rounded-full text-xs font-medium ${getPercentageChange(data.total_orders, data.previous_orders) >= 0
                  ? 'bg-emerald-100 text-emerald-700'
                  : 'bg-red-100 text-red-700'
                  }`}>
                  {getPercentageChange(data.total_orders, data.previous_orders) >= 0 ? (
                    <TrendingUpIcon className="h-3 w-3 mr-1" />
                  ) : (
                    <TrendingDownIcon className="h-3 w-3 mr-1" />
                  )}
                  {Math.abs(getPercentageChange(data.total_orders, data.previous_orders)).toFixed(1)}%
                </div>
              </div>
              <div className="space-y-1">
                <p className="text-xl lg:text-2xl font-bold text-gray-900">{formatNumber(data.total_orders || 0)}</p>
                <h3 className="text-xs lg:text-sm font-medium text-gray-600">
                  <TranslatedText text="Total Orders" />
                </h3>
                <p className="text-xs text-gray-500">
                  <TranslatedText text="vs" /> {formatNumber(data.previous_orders)} <TranslatedText text="previous" />
                </p>
              </div>
            </div>
            <div className="h-1 bg-gradient-to-r from-blue-500 to-blue-600"></div>
          </div>

          {/* Customers KPI */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition-all duration-200">
            <div className="p-4 lg:p-6">
              <div className="flex items-center justify-between mb-3 lg:mb-4">
                <div className="p-2 lg:p-3 bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl shadow-lg">
                  <Users className="h-5 w-5 lg:h-6 lg:w-6 text-white" />
                </div>
                <div className={`flex items-center px-2 py-1 rounded-full text-xs font-medium ${getPercentageChange(data.total_customers, data.previous_customers) >= 0
                  ? 'bg-emerald-100 text-emerald-700'
                  : 'bg-red-100 text-red-700'
                  }`}>
                  {getPercentageChange(data.total_customers, data.previous_customers) >= 0 ? (
                    <TrendingUpIcon className="h-3 w-3 mr-1" />
                  ) : (
                    <TrendingDownIcon className="h-3 w-3 mr-1" />
                  )}
                  {Math.abs(getPercentageChange(data.total_customers, data.previous_customers)).toFixed(1)}%
                </div>
              </div>
              <div className="space-y-1">
                <p className="text-xl lg:text-2xl font-bold text-gray-900">{formatNumber(data.total_customers || 0)}</p>
                <h3 className="text-xs lg:text-sm font-medium text-gray-600">
                  <TranslatedText text="Total Customers" />
                </h3>
                <p className="text-xs text-gray-500">
                  <TranslatedText text="vs" /> {formatNumber(data.previous_customers)} <TranslatedText text="previous" />
                </p>
              </div>
            </div>
            <div className="h-1 bg-gradient-to-r from-purple-500 to-purple-600"></div>
          </div>

          {/* AOV KPI */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition-all duration-200">
            <div className="p-4 lg:p-6">
              <div className="flex items-center justify-between mb-3 lg:mb-4">
                <div className="p-2 lg:p-3 bg-gradient-to-br from-amber-500 to-amber-600 rounded-xl shadow-lg">
                  <Target className="h-5 w-5 lg:h-6 lg:w-6 text-white" />
                </div>
                <div className={`flex items-center px-2 py-1 rounded-full text-xs font-medium ${getPercentageChange(data.avg_order_value, data.previous_avg_order_value) >= 0
                  ? 'bg-emerald-100 text-emerald-700'
                  : 'bg-red-100 text-red-700'
                  }`}>
                  {getPercentageChange(data.avg_order_value, data.previous_avg_order_value) >= 0 ? (
                    <TrendingUpIcon className="h-3 w-3 mr-1" />
                  ) : (
                    <TrendingDownIcon className="h-3 w-3 mr-1" />
                  )}
                  {Math.abs(getPercentageChange(data.avg_order_value, data.previous_avg_order_value)).toFixed(1)}%
                </div>
              </div>
              <div className="space-y-1">
                <p className="text-xl lg:text-2xl font-bold text-gray-900">{formatCurrency(data.avg_order_value || 0)}</p>
                <h3 className="text-xs lg:text-sm font-medium text-gray-600">
                  <TranslatedText text="Average Order Value" />
                </h3>
                <p className="text-xs text-gray-500">
                  <TranslatedText text="vs" /> {formatCurrency(data.previous_avg_order_value)} <TranslatedText text="previous" />
                </p>
              </div>
            </div>
            <div className="h-1 bg-gradient-to-r from-amber-500 to-amber-600"></div>
          </div>
        </div>

        {/* Professional Data Tables */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-6">
          {/* Top Products Performance */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900"><TranslatedText text="Top Products" /></h3>
                  <p className="text-sm text-gray-600"><TranslatedText text="Best performing items this period" /></p>
                </div>
                <button
                  onClick={() => navigate('/products')}
                  className="flex items-center space-x-1 text-sm text-blue-600 hover:text-blue-700 font-medium"
                >
                  <span><TranslatedText text="View All" /></span>
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>

            <div className="divide-y divide-gray-200">
              {data.top_products?.slice(0, 5).map((product, index) => (
                <div key={index} className="px-6 py-4 hover:bg-gray-50 transition-colors">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center text-white font-bold text-sm shadow-lg">
                        {index + 1}
                      </div>
                      <div>
                        <h4 className="font-medium text-gray-900">{product.name}</h4>
                        <p className="text-sm text-gray-500">SKU: {product.sku}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-gray-900">{formatNumber(product.quantity_sold)}</p>
                      <p className="text-sm text-gray-500">{formatCurrency(product.revenue)}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Payment Methods Analysis */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900"><TranslatedText text="Payment Methods" /></h3>
                  <p className="text-sm text-gray-600"><TranslatedText text="Revenue distribution by payment type" /></p>
                </div>
                <CreditCard className="h-5 w-5 text-gray-400" />
              </div>
            </div>

            <div className="p-6">
              <div className="space-y-4">
                {[
                  { method: 'Credit Card', percentage: 45, amount: 6200, color: 'from-blue-500 to-blue-600' },
                  { method: 'Cash', percentage: 30, amount: 4100, color: 'from-emerald-500 to-emerald-600' },
                  { method: 'Mobile Payment', percentage: 15, amount: 2100, color: 'from-purple-500 to-purple-600' },
                  { method: 'Bank Transfer', percentage: 10, amount: 1400, color: 'from-amber-500 to-amber-600' }
                ].map((payment, index) => (
                  <div key={index} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div className={`w-3 h-3 bg-gradient-to-r ${payment.color} rounded-full`}></div>
                        <span className="text-sm font-medium text-gray-900"><TranslatedText text={payment.method} /></span>
                      </div>
                      <div className="text-right">
                        <span className="text-sm font-semibold text-gray-900">{payment.percentage}%</span>
                        <p className="text-xs text-gray-500">{formatCurrency(payment.amount)}</p>
                      </div>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className={`bg-gradient-to-r ${payment.color} h-2 rounded-full transition-all duration-500`}
                        style={{ width: `${payment.percentage}%` }}
                      ></div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Professional Activity Feed */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Recent Orders */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900"><TranslatedText text="Recent Orders" /></h3>
                  <p className="text-sm text-gray-600"><TranslatedText text="Latest customer transactions" /></p>
                </div>
                <button
                  onClick={() => navigate('/orders')}
                  className="flex items-center space-x-1 text-sm text-blue-600 hover:text-blue-700 font-medium"
                >
                  <span><TranslatedText text="View All" /></span>
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>

            <div className="divide-y divide-gray-200">
              {data.recent_orders?.slice(0, 5).map((order, index) => (
                <div key={index} className="px-6 py-4 hover:bg-gray-50 transition-colors">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <div className="w-12 h-12 bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-xl flex items-center justify-center text-white font-bold text-sm shadow-lg">
                        #{order.order_number?.slice(-4)}
                      </div>
                      <div>
                        <h4 className="font-medium text-gray-900">{order.customer_name}</h4>
                        <p className="text-sm text-gray-500">{new Date(order.created_at).toLocaleDateString()}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-gray-900">{formatCurrency(order.total_amount)}</p>
                      <div className={`flex items-center justify-end space-x-1 text-xs px-2 py-0.5 rounded-full mt-1 ${getStatusColor(order.status)}`}>
                        {getStatusIcon(order.status)}
                        <span className="capitalize"><TranslatedText text={order.status} /></span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* System Status & Quick Stats */}
          <div className="space-y-6">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900"><TranslatedText text="System Status" /></h3>
                    <p className="text-sm text-gray-600"><TranslatedText text="Alerts and notifications" /></p>
                  </div>
                  <div className="flex items-center space-x-2 text-sm text-emerald-600 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-100">
                    <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></div>
                    <span className="font-medium"><TranslatedText text="All Systems Operational" /></span>
                  </div>
                </div>
              </div>

              <div className="p-6 space-y-4">
                {data.low_stock_items?.slice(0, 3).map((item, index) => (
                  <div key={index} className="flex items-center justify-between p-4 bg-red-50 rounded-xl border border-red-100">
                    <div className="flex items-center space-x-3">
                      <div className="p-2 bg-red-100 rounded-lg">
                        <AlertTriangle className="h-5 w-5 text-red-600" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-red-900"><TranslatedText text="Low Stock Alert" /></p>
                        <p className="text-xs text-red-700">{item.name} - {item.quantity} <TranslatedText text="remaining" /></p>
                      </div>
                    </div>
                    <button
                      onClick={() => navigate(`/products?search=${item.sku}`)}
                      className="text-xs bg-white text-red-600 px-3 py-1.5 rounded-lg border border-red-200 hover:bg-red-50 transition-colors font-medium shadow-sm"
                    >
                      <TranslatedText text="Restock" />
                    </button>
                  </div>
                ))}

                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 bg-gray-50 rounded-xl border border-gray-100">
                    <div className="flex items-center justify-between mb-2">
                      <Store className="h-5 w-5 text-gray-400" />
                      <span className="text-xs font-medium text-green-600 bg-green-100 px-2 py-0.5 rounded-full"><TranslatedText text="Active" /></span>
                    </div>
                    <p className="text-2xl font-bold text-gray-900">{shops?.length || 0}</p>
                    <p className="text-xs text-gray-500"><TranslatedText text="Active Locations" /></p>
                    <p className="text-[10px] text-gray-400 mt-1"><TranslatedText text="Operating stores" /></p>
                  </div>

                  <div className="p-4 bg-gray-50 rounded-xl border border-gray-100">
                    <div className="flex items-center justify-between mb-2">
                      <Package className="h-5 w-5 text-gray-400" />
                      <span className="text-xs font-medium text-blue-600 bg-blue-100 px-2 py-0.5 rounded-full"><TranslatedText text="Total" /></span>
                    </div>
                    <p className="text-2xl font-bold text-gray-900">{formatNumber(data.total_products || 0)}</p>
                    <p className="text-xs text-gray-500"><TranslatedText text="Product Catalog" /></p>
                    <p className="text-[10px] text-gray-400 mt-1"><TranslatedText text="Available items" /></p>
                  </div>

                  <div className="p-4 bg-gray-50 rounded-xl border border-gray-100">
                    <div className="flex items-center justify-between mb-2">
                      <Users className="h-5 w-5 text-gray-400" />
                      <span className="text-xs font-medium text-purple-600 bg-purple-100 px-2 py-0.5 rounded-full"><TranslatedText text="VIP" /></span>
                    </div>
                    <p className="text-2xl font-bold text-gray-900">{formatNumber(data.loyalty_members || 0)}</p>
                    <p className="text-xs text-gray-500"><TranslatedText text="Loyalty Members" /></p>
                    <p className="text-[10px] text-gray-400 mt-1"><TranslatedText text="Active members" /></p>
                  </div>

                  <div className="p-4 bg-gray-50 rounded-xl border border-gray-100">
                    <div className="flex items-center justify-between mb-2">
                      <ShoppingCart className="h-5 w-5 text-gray-400" />
                      <span className="text-xs font-medium text-amber-600 bg-amber-100 px-2 py-0.5 rounded-full"><TranslatedText text="Action" /></span>
                    </div>
                    <p className="text-2xl font-bold text-gray-900">{formatNumber(data.pending_orders || 0)}</p>
                    <p className="text-xs text-gray-500"><TranslatedText text="Pending Orders" /></p>
                    <p className="text-[10px] text-gray-400 mt-1"><TranslatedText text="Awaiting processing" /></p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard; 