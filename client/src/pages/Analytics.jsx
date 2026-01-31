import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { 
  BarChart3, 
  TrendingUp, 
  TrendingDown, 
  DollarSign,
  Users,
  Package,
  ShoppingCart,
  Calendar,
  Filter,
  Download,
  Eye,
  PieChart,
  LineChart,
  Activity
} from 'lucide-react';
import { api, dashboardAPI } from '../lib/api';
import { shopsAPI } from '../lib/api';
import TranslatedText from '../components/TranslatedText';

const Analytics = () => {
  const [selectedPeriod, setSelectedPeriod] = useState('30');
  const [selectedShop, setSelectedShop] = useState('all');
  const [isGeneratingReport, setIsGeneratingReport] = useState(false);
  const [isExportingReport, setIsExportingReport] = useState(false);


  // Fetch dashboard overview data
  const { data: dashboardResponse, isLoading: dashboardLoading, error: dashboardError } = useQuery({
    queryKey: ['dashboard-overview', selectedPeriod, selectedShop],
    queryFn: () => dashboardAPI.getOverview({ period: selectedPeriod, shop: selectedShop }),
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: false, // Don't retry on error for debugging
  });

  // Fetch sales analytics data
  const { data: salesAnalyticsData, isLoading: salesLoading, error: salesError } = useQuery({
    queryKey: ['sales-analytics', selectedPeriod, selectedShop],
    queryFn: () => api.get(`/sales-analytics/overview?period=${selectedPeriod}&shop=${selectedShop}`).then(res => res.data),
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: false, // Don't retry on error for debugging
  });

  // Fetch shops data for filtering
  const { data: shopsData, error: shopsError } = useQuery({
    queryKey: ['shops'],
    queryFn: () => shopsAPI.getAll().then(res => res.data),
    staleTime: 10 * 60 * 1000, // 10 minutes
    retry: false, // Don't retry on error for debugging
  });

  // Debug logging for errors
  if (dashboardError) console.error('Dashboard API Error:', dashboardError);
  if (salesError) console.error('Sales Analytics API Error:', salesError);
  if (shopsError) console.error('Shops API Error:', shopsError);

  // Report generation functions
  const handleGenerateReport = async () => {
    setIsGeneratingReport(true);
    try {
      // Create a comprehensive report object
      const reportData = {
        period: selectedPeriod,
        shop: selectedShop,
        shopName: selectedShop === 'all' ? 'All Shops' : shopsData?.shops?.find(s => s.id === selectedShop)?.name || 'Unknown Shop',
        generatedAt: new Date().toISOString(),
        dashboardData,
        salesData,
        summary: {
          totalRevenue: parseFloat(dashboardData.sales_stats?.total_revenue) || 0,
          totalOrders: dashboardData.sales_stats?.total_orders || 0,
          avgOrderValue: parseFloat(dashboardData.sales_stats?.avg_order_value) || 0,
          totalProducts: dashboardData.inventory_stats?.total_products || 0,
          uniqueCustomers: salesData.summary?.uniqueCustomers || 0,
          conversionRate: salesData.summary?.conversionRate || '0'
        }
      };

      // Store report data in localStorage for now (in real app, this would be sent to backend)
      localStorage.setItem('analyticsReport', JSON.stringify(reportData));
      
      // Show success message
      alert(`Report generated successfully!\n\nPeriod: ${selectedPeriod} days\nShop: ${reportData.shopName}\nGenerated: ${new Date().toLocaleString()}`);
      
    } catch (error) {
      console.error('Error generating report:', error);
      alert('Error generating report. Please try again.');
    } finally {
      setIsGeneratingReport(false);
    }
  };

  const handleExportReport = async () => {
    setIsExportingReport(true);
    try {
      // Get report data from localStorage
      const reportData = localStorage.getItem('analyticsReport');
      
      if (!reportData) {
        alert('No report found. Please generate a report first.');
        return;
      }

      const report = JSON.parse(reportData);
      
      // Create CSV content
      const csvContent = `Analytics Report
Generated: ${new Date(report.generatedAt).toLocaleString()}
Period: ${report.period} days
Shop: ${report.shopName}

Summary Metrics:
Total Revenue,${report.summary.totalRevenue}
Total Orders,${report.summary.totalOrders}
Average Order Value,${report.summary.avgOrderValue}
Total Products,${report.summary.totalProducts}
Unique Customers,${report.summary.uniqueCustomers}
Conversion Rate,${report.summary.conversionRate}%

Top Products:
Product Name,Units Sold,Total Revenue,Average Price
${report.salesData.topProducts?.slice(0, 5).map(product => 
  `${product.name},${product.total_sold},${product.total_revenue},${product.avg_price}`
).join('\n') || 'No data available'}

Sales by Category:
Category,Revenue,Percentage
${report.salesData.categorySales?.slice(0, 4).map(category => {
  const totalRevenue = report.salesData.categorySales.reduce((sum, cat) => sum + (parseFloat(cat.total_revenue) || 0), 0);
  const percentage = totalRevenue > 0 ? ((parseFloat(category.total_revenue) / totalRevenue) * 100).toFixed(1) : '0';
  return `${category.category_name},${category.total_revenue},${percentage}%`;
}).join('\n') || 'No data available'}`;

      // Create and download file
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', `analytics-report-${report.shopName.replace(/\s+/g, '-').toLowerCase()}-${report.period}days-${new Date().toISOString().split('T')[0]}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      alert('Report exported successfully!');
      
    } catch (error) {
      console.error('Error exporting report:', error);
      alert('Error exporting report. Please try again.');
    } finally {
      setIsExportingReport(false);
    }
  };

  const isLoading = dashboardLoading || salesLoading;
  const dashboardData = dashboardResponse?.data || {};
  const salesData = salesAnalyticsData || {};

  // Show error state if there are API errors
  if (dashboardError || salesError) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="bg-white rounded-xl p-6 shadow-sm border border-red-200">
            <h1 className="text-2xl font-bold text-red-600 mb-4"><TranslatedText text="Page d'Analyse" /></h1>
            <p className="text-gray-600 mb-4">Il y a eu une erreur lors du chargement des données d'analyse :</p>
            {dashboardError && <p className="text-sm text-red-500">Erreur API Tableau de Bord : {dashboardError.message}</p>}
            {salesError && <p className="text-sm text-red-500">Erreur API Analyse des Ventes : {salesError.message}</p>}
            <p className="text-sm text-gray-500 mt-4">Cela pourrait être dû à des problèmes d'authentification ou de connectivité API.</p>
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
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-white rounded-xl p-6 shadow-sm">
                <div className="h-4 bg-gray-200 rounded w-1/2 mb-4"></div>
                <div className="h-64 bg-gray-200 rounded"></div>
              </div>
              <div className="bg-white rounded-xl p-6 shadow-sm">
                <div className="h-4 bg-gray-200 rounded w-1/2 mb-4"></div>
                <div className="h-64 bg-gray-200 rounded"></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      <div className="px-4 sm:px-6 py-4 sm:py-6">
        {/* Header */}
        <div className="mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900"><TranslatedText text="Analytics & Reports" /></h1>
              <p className="text-gray-600 mt-2">Informations avancées et intelligence d'affaires</p>
            </div>
            <div className="flex flex-col sm:flex-row gap-3">
              <button 
                onClick={handleExportReport}
                disabled={isExportingReport}
                className={`inline-flex items-center px-4 py-2 font-medium rounded-xl focus:outline-none focus:ring-2 focus:ring-offset-2 transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 ${
                  isExportingReport 
                    ? 'bg-gray-400 text-gray-200 cursor-not-allowed' 
                    : 'bg-gradient-to-r from-green-500 to-emerald-600 text-white hover:from-green-600 hover:to-emerald-700 focus:ring-green-500'
                }`}
              >
                <Download className="h-5 w-5 mr-2" />
                {isExportingReport ? 'Exportation...' : 'Exporter Rapport'}
              </button>
              <button 
                onClick={handleGenerateReport}
                disabled={isGeneratingReport}
                className={`inline-flex items-center px-4 py-2 font-medium rounded-xl focus:outline-none focus:ring-2 focus:ring-offset-2 transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 ${
                  isGeneratingReport 
                    ? 'bg-gray-400 text-gray-200 cursor-not-allowed' 
                    : 'bg-gradient-to-r from-blue-600 to-purple-600 text-white hover:from-blue-700 hover:to-purple-700 focus:ring-blue-500'
                }`}
              >
                <Eye className="h-5 w-5 mr-2" />
                {isGeneratingReport ? 'Génération...' : 'Générer Rapport'}
              </button>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 mb-8">
          <div className="flex flex-col sm:flex-row gap-4 analytics-filters">
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-2">Période</label>
              <select
                value={selectedPeriod}
                onChange={(e) => setSelectedPeriod(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="7">7 derniers jours</option>
                <option value="30">30 derniers jours</option>
                <option value="90">90 derniers jours</option>
                <option value="365">Dernière année</option>
              </select>
            </div>
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-2">Boutique</label>
              <select
                value={selectedShop}
                onChange={(e) => setSelectedShop(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="all">Toutes les Boutiques</option>
                {shopsData?.shops?.map((shop) => (
                  <option key={shop.id} value={shop.id}>
                    {shop.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex items-end">
              <button className="inline-flex items-center px-4 py-3 border border-gray-300 rounded-xl hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                <Filter className="h-5 w-5 text-gray-400" />
              </button>
            </div>
          </div>
        </div>

        {/* Key Metrics */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mb-8">
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
            <div className="flex items-center">
              <div className="p-3 bg-green-100 rounded-xl">
                <TrendingUp className="h-6 w-6 text-green-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Chiffre d'Affaires Total</p>
                <p className="text-2xl font-bold text-gray-900">
                  ${(parseFloat(dashboardData.sales_stats?.total_revenue) || 0).toLocaleString()}
                </p>
                <p className="text-xs text-green-600">
                  {salesData.trends?.revenueGrowth ? `+${salesData.trends.revenueGrowth}%` : 'vs période précédente'}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
            <div className="flex items-center">
              <div className="p-3 bg-blue-100 rounded-xl">
                <Users className="h-6 w-6 text-blue-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Commandes</p>
                <p className="text-2xl font-bold text-gray-900">
                  {dashboardData.sales_stats?.total_orders || '0'}
                </p>
                <p className="text-xs text-blue-600">
                  {salesData.trends?.orderGrowth ? `+${salesData.trends.orderGrowth}%` : 'vs période précédente'}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
            <div className="flex items-center">
              <div className="p-3 bg-purple-100 rounded-xl">
                <ShoppingCart className="h-6 w-6 text-purple-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Valeur Moyenne Commande</p>
                <p className="text-2xl font-bold text-gray-900">
                  ${(parseFloat(dashboardData.sales_stats?.avg_order_value) || 0).toFixed(2)}
                </p>
                <p className="text-xs text-purple-600">par commande</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
            <div className="flex items-center">
              <div className="p-3 bg-orange-100 rounded-xl">
                <Package className="h-6 w-6 text-orange-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Produits</p>
                <p className="text-2xl font-bold text-gray-900">
                  {dashboardData.inventory_stats?.total_products || '0'}
                </p>
                <p className="text-xs text-orange-600">en inventaire</p>
              </div>
            </div>
          </div>
        </div>

        {/* Charts Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 mb-8">
          {/* Revenue Chart */}
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-gray-900"><TranslatedText text="Tendance du Chiffre d'Affaires" /></h3>
              <BarChart3 className="h-5 w-5 text-gray-400" />
            </div>
            <div className="h-64 flex items-end justify-between gap-2">
              {salesData.trends?.dailyRevenue?.length > 0 ? (
                salesData.trends.dailyRevenue.slice(-12).map((day, index) => {
                  // Ensure daily_revenue is a number
                  const dailyRevenue = parseFloat(day.daily_revenue) || 0;
                  const maxRevenue = Math.max(...salesData.trends.dailyRevenue.map(d => parseFloat(d.daily_revenue) || 0));
                  const height = maxRevenue > 0 ? (dailyRevenue / maxRevenue) * 100 : 0;
                  return (
                    <div key={index} className="flex-1 flex flex-col items-center">
                      <div 
                        className="w-full bg-gradient-to-t from-blue-500 to-blue-600 rounded-t-lg transition-all hover:from-blue-600 hover:to-blue-700"
                        style={{ height: `${height}%` }}
                        title={`${day.date}: $${dailyRevenue.toFixed(2)}`}
                      ></div>
                      <span className="text-xs text-gray-500 mt-2">
                        {new Date(day.date).getDate()}
                      </span>
                    </div>
                  );
                })
              ) : (
                // Fallback to static data if no real data
                [65, 78, 90, 81, 95, 88, 92, 85, 98, 87, 93, 89].map((value, index) => (
                <div key={index} className="flex-1 flex flex-col items-center">
                  <div 
                    className="w-full bg-gradient-to-t from-blue-500 to-blue-600 rounded-t-lg transition-all hover:from-blue-600 hover:to-blue-700"
                    style={{ height: `${value}%` }}
                  ></div>
                  <span className="text-xs text-gray-500 mt-2">{index + 1}</span>
                </div>
                ))
              )}
            </div>
          </div>

          {/* Sales Distribution */}
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-gray-900"><TranslatedText text="Ventes par Catégorie" /></h3>
              <PieChart className="h-5 w-5 text-gray-400" />
            </div>
            <div className="space-y-4">
              {salesData.categorySales?.length > 0 ? (
                salesData.categorySales.slice(0, 4).map((category, index) => {
                  const colors = ['bg-blue-500', 'bg-green-500', 'bg-purple-500', 'bg-orange-500'];
                  const totalRevenue = salesData.categorySales.reduce((sum, cat) => sum + (parseFloat(cat.total_revenue) || 0), 0);
                  const categoryRevenue = parseFloat(category.total_revenue) || 0;
                  const percentage = totalRevenue > 0 ? ((categoryRevenue / totalRevenue) * 100).toFixed(1) : '0';
                  
                  return (
                    <div key={index} className="flex items-center justify-between">
                      <div className="flex items-center">
                        <div className={`w-4 h-4 ${colors[index]} rounded-full mr-3`}></div>
                        <span className="text-sm text-gray-700">{category.category_name}</span>
                      </div>
                      <span className="text-sm font-semibold text-gray-900">{percentage}%</span>
                    </div>
                  );
                })
              ) : (
                // Fallback to static data
                <>
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <div className="w-4 h-4 bg-blue-500 rounded-full mr-3"></div>
                  <span className="text-sm text-gray-700">Parfums</span>
                </div>
                <span className="text-sm font-semibold text-gray-900">45%</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <div className="w-4 h-4 bg-green-500 rounded-full mr-3"></div>
                  <span className="text-sm text-gray-700">Vêtements</span>
                </div>
                <span className="text-sm font-semibold text-gray-900">30%</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <div className="w-4 h-4 bg-purple-500 rounded-full mr-3"></div>
                  <span className="text-sm text-gray-700">Accessoires</span>
                </div>
                <span className="text-sm font-semibold text-gray-900">15%</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <div className="w-4 h-4 bg-orange-500 rounded-full mr-3"></div>
                  <span className="text-sm text-gray-700">Autre</span>
                </div>
                <span className="text-sm font-semibold text-gray-900">10%</span>
              </div>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Performance Metrics */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Top Performing Products */}
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-gray-900"><TranslatedText text="Meilleurs Produits" /></h3>
              <Package className="h-5 w-5 text-gray-400" />
            </div>
            <div className="space-y-4">
              {salesData.topProducts?.length > 0 ? (
                salesData.topProducts.slice(0, 5).map((product, index) => (
                  <div key={index} className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-900">{product.name}</p>
                      <p className="text-xs text-gray-500">{product.total_sold} unités vendues</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold text-gray-900">${(parseFloat(product.total_revenue) || 0).toFixed(2)}</p>
                      <p className="text-xs text-green-600">${(parseFloat(product.avg_price) || 0).toFixed(2)} moy</p>
                    </div>
                  </div>
                ))
              ) : (
                // Fallback to static data
                [
                { name: 'Lavender Fields Perfume', sales: 234, revenue: 11700 },
                { name: 'Rose Garden Perfume', sales: 189, revenue: 9450 },
                { name: 'Vanilla Dream Perfume', sales: 156, revenue: 7800 },
                { name: 'Ocean Breeze Perfume', sales: 134, revenue: 6700 },
                { name: 'Mountain Air Perfume', sales: 98, revenue: 4900 }
              ].map((product, index) => (
                <div key={index} className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-900">{product.name}</p>
                    <p className="text-xs text-gray-500">{product.sales} unités vendues</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold text-gray-900">${product.revenue}</p>
                    <p className="text-xs text-green-600">+12%</p>
                  </div>
                </div>
                ))
              )}
            </div>
          </div>

          {/* Customer Insights */}
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-gray-900"><TranslatedText text="Informations Client" /></h3>
              <Users className="h-5 w-5 text-gray-400" />
            </div>
            <div className="space-y-4">
              <div className="text-center p-4 bg-blue-50 rounded-xl">
                <p className="text-2xl font-bold text-blue-600">
                  {salesData.summary?.uniqueCustomers || dashboardData.customer_stats?.total_customers || '0'}
                </p>
                <p className="text-sm text-blue-600">Total Clients</p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="text-center p-3 bg-green-50 rounded-lg">
                  <p className="text-lg font-bold text-green-600">
                    {salesData.summary?.conversionRate || '0'}%
                  </p>
                  <p className="text-xs text-green-600">Taux de Conversion</p>
                </div>
                <div className="text-center p-3 bg-purple-50 rounded-lg">
                  <p className="text-lg font-bold text-purple-600">
                    ${(parseFloat(dashboardData.sales_stats?.avg_order_value) || 0).toFixed(0)}
                  </p>
                  <p className="text-xs text-purple-600">Valeur Moy Commande</p>
                </div>
              </div>
              <div className="text-center p-3 bg-orange-50 rounded-lg">
                <p className="text-lg font-bold text-orange-600">
                  {salesData.summary?.totalOrders > 0 && salesData.summary?.uniqueCustomers > 0 
                    ? (salesData.summary.totalOrders / salesData.summary.uniqueCustomers).toFixed(1)
                    : '0'}
                </p>
                <p className="text-xs text-orange-600">Commandes Moy par Client</p>
              </div>
            </div>
          </div>

          {/* Recent Activity */}
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-gray-900"><TranslatedText text="Activité Récente" /></h3>
              <Activity className="h-5 w-5 text-gray-400" />
            </div>
            <div className="space-y-4">
              {dashboardData.recent_activity?.length > 0 ? (
                dashboardData.recent_activity.slice(0, 5).map((activity, index) => (
                  <div key={index} className="flex items-center space-x-3">
                    <div className={`w-2 h-2 rounded-full ${
                      activity.type === 'order' ? 'bg-green-500' :
                      activity.type === 'customer' ? 'bg-blue-500' :
                      activity.type === 'payment' ? 'bg-purple-500' :
                      activity.type === 'inventory' ? 'bg-orange-500' :
                      'bg-red-500'
                    }`}></div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-900">{activity.action}</p>
                      <p className="text-xs text-gray-500">{activity.time}</p>
                    </div>
                  </div>
                ))
              ) : (
                // Fallback to static data
                [
                { action: 'Nouvelle commande passée', time: 'il y a 2 min', type: 'order' },
                { action: 'Client enregistré', time: 'il y a 5 min', type: 'customer' },
                { action: 'Paiement reçu', time: 'il y a 8 min', type: 'payment' },
                { action: 'Stock mis à jour', time: 'il y a 12 min', type: 'inventory' },
                { action: 'Dépense enregistrée', time: 'il y a 15 min', type: 'expense' }
              ].map((activity, index) => (
                <div key={index} className="flex items-center space-x-3">
                  <div className={`w-2 h-2 rounded-full ${
                    activity.type === 'order' ? 'bg-green-500' :
                    activity.type === 'customer' ? 'bg-blue-500' :
                    activity.type === 'payment' ? 'bg-purple-500' :
                    activity.type === 'inventory' ? 'bg-orange-500' :
                    'bg-red-500'
                  }`}></div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-900">{activity.action}</p>
                    <p className="text-xs text-gray-500">{activity.time}</p>
                  </div>
                </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Analytics; 