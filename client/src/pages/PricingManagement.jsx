import React, { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import PricingDashboard from '../components/PricingDashboard';
import PricingAnalysis from '../components/PricingAnalysis';
import PricingOptimization from '../components/PricingOptimization';
import { api } from '../lib/api';
import { useAuth } from '../contexts/AuthContext';
import { productsAPI } from '../lib/api';
import TranslatedText from '../components/TranslatedText';

const PricingManagement = () => {
  const { user, isLoading: authLoading } = useAuth();
  const [selectedProducts, setSelectedProducts] = useState([]);
  const [selectedProductId, setSelectedProductId] = useState(null);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('dashboard');

  useEffect(() => {
    if (user && !authLoading) {
      fetchProducts();
    }
  }, [user, authLoading]);

  const fetchProducts = async () => {
    setLoading(true);
    try {
      const response = await productsAPI.getAll();
      setProducts(response.data.products || []);
    } catch (error) {
      console.error('Error fetching products:', error);
      toast.error('Failed to load products');
    } finally {
      setLoading(false);
    }
  };

  const handleProductSelection = (productIds) => {
    setSelectedProducts(productIds);
  };

  const handleProductAnalysis = (productId) => {
    setSelectedProductId(productId);
    setActiveTab('analysis');
  };

  const handleOptimizationComplete = (results) => {
    toast.success(`Optimization completed for ${results.summary?.successful_optimizations || 0} products`);
    // Refresh products to show updated prices
    fetchProducts();
  };

  const tabs = [
    { id: 'dashboard', name: 'Dashboard', icon: '📊' },
    { id: 'analysis', name: 'Analysis', icon: '🔍' },
    { id: 'optimization', name: 'Optimization', icon: '⚡' }
  ];

  if (authLoading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading authentication...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center py-12">
            <p className="text-gray-600">Please login to access pricing management</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900"><TranslatedText text="Pricing Management" /></h1>
          <p className="mt-2 text-gray-600">
            Intelligent pricing engine for optimal product pricing and profitability analysis
          </p>
        </div>

        {/* Product Selection */}
        <div className="bg-white rounded-lg shadow p-6 mb-8">
          <h2 className="text-lg font-semibold text-gray-900 mb-4"><TranslatedText text="Product Selection" /></h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {products.map((product) => (
              <div
                key={product.id}
                className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                  selectedProducts.includes(product.id)
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
                onClick={() => {
                  const newSelection = selectedProducts.includes(product.id)
                    ? selectedProducts.filter(id => id !== product.id)
                    : [...selectedProducts, product.id];
                  setSelectedProducts(newSelection);
                }}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-medium text-gray-900">{product.name}</h3>
                    <p className="text-sm text-gray-500">ID: {product.id}</p>
                    <p className="text-sm text-gray-600">Current Price: {Number(product.price).toLocaleString()} CFA</p>
                  </div>
                  <div className="text-right">
                    <span className="text-xs text-gray-400">
                      Stock: {product.current_stock || product.stock_quantity || 0}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
          {products.length === 0 && !loading && (
            <p className="text-gray-500 text-center py-4">No products found</p>
          )}
          {loading && (
            <p className="text-gray-500 text-center py-4">Loading products...</p>
          )}
        </div>

        {/* Tab Navigation */}
        <div className="bg-white rounded-lg shadow mb-8">
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex space-x-8 px-6">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`py-4 px-1 border-b-2 font-medium text-sm ${
                    activeTab === tab.id
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <span className="mr-2">{tab.icon}</span>
                  {tab.name}
                </button>
              ))}
            </nav>
          </div>

          {/* Tab Content */}
          <div className="p-6">
            {activeTab === 'dashboard' && (
              <div>
                <div className="mb-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">
                    Pricing Dashboard
                  </h3>
                  <p className="text-sm text-gray-600">
                    Overview of current pricing (CFA), strategies, and market positioning
                  </p>
                </div>
                <PricingDashboard 
                  onProductSelect={handleProductSelection}
                  onProductAnalysis={handleProductAnalysis}
                />
              </div>
            )}

            {activeTab === 'analysis' && (
              <div>
                <div className="mb-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">
                    Pricing Analysis
                  </h3>
                  <p className="text-sm text-gray-600">
                    Detailed analysis of pricing strategies (CFA) and market insights
                  </p>
                  {!selectedProductId && (
                    <p className="text-sm text-yellow-600 mt-2">
                      Please select a product from the dashboard to view detailed analysis
                    </p>
                  )}
                </div>
                {selectedProductId && (
                  <PricingAnalysis productId={selectedProductId} />
                )}
              </div>
            )}

            {activeTab === 'optimization' && (
              <div>
                <div className="mb-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">
                    Pricing Optimization
                  </h3>
                  <p className="text-sm text-gray-600">
                    Find optimal pricing strategies (CFA) for maximum profitability
                  </p>
                  {selectedProducts.length === 0 && (
                    <p className="text-sm text-yellow-600 mt-2">
                      Please select products above to run optimization
                    </p>
                  )}
                </div>
                <PricingOptimization 
                  productIds={selectedProducts}
                  onOptimizationComplete={handleOptimizationComplete}
                />
              </div>
            )}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4"><TranslatedText text="Quick Actions" /></h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <button
              onClick={() => setActiveTab('dashboard')}
              className="p-4 border border-gray-200 rounded-lg hover:border-blue-300 hover:bg-blue-50 transition-colors"
            >
              <div className="text-center">
                <div className="text-2xl mb-2">📊</div>
                <h4 className="font-medium text-gray-900">View Dashboard</h4>
                <p className="text-sm text-gray-600">See pricing overview (CFA)</p>
              </div>
            </button>

            <button
              onClick={() => setActiveTab('optimization')}
              disabled={selectedProducts.length === 0}
              className="p-4 border border-gray-200 rounded-lg hover:border-purple-300 hover:bg-purple-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <div className="text-center">
                <div className="text-2xl mb-2">⚡</div>
                <h4 className="font-medium text-gray-900">Run Optimization</h4>
                <p className="text-sm text-gray-600">Optimize selected products (CFA)</p>
              </div>
            </button>

            <button
              onClick={fetchProducts}
              className="p-4 border border-gray-200 rounded-lg hover:border-green-300 hover:bg-green-50 transition-colors"
            >
              <div className="text-center">
                <div className="text-2xl mb-2">🔄</div>
                <h4 className="font-medium text-gray-900">Refresh Data</h4>
                <p className="text-sm text-gray-600">Update product information</p>
              </div>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PricingManagement;
