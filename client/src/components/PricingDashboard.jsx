import React, { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import { productsAPI, pricingAPI } from '../lib/api';
import { useAuth } from '../contexts/AuthContext';
import TranslatedText from './TranslatedText';

const PricingDashboard = ({ onProductSelect, onProductAnalysis }) => {
  const { user, isLoading: authLoading } = useAuth();
  const [products, setProducts] = useState([]);
  const [selectedProducts, setSelectedProducts] = useState([]);
  const [pricingResults, setPricingResults] = useState([]);
  const [strategies, setStrategies] = useState({});
  const [loading, setLoading] = useState(false);
  const [selectedStrategy, setSelectedStrategy] = useState('costPlus');
  const [customOptions, setCustomOptions] = useState({
    markup: 100,
    positioning: 'competitive',
    location: 'US'
  });

  useEffect(() => {
    if (user && !authLoading) {
      fetchProducts();
      fetchStrategies();
    }
  }, [user, authLoading]);

  const fetchProducts = async () => {
    try {
      const response = await productsAPI.getAll();
      setProducts(response.data.products || []);
    } catch (error) {
      console.error('Error fetching products:', error);
      if (error.response?.status === 401) {
        toast.error('Please login to access products');
      } else {
        toast.error('Failed to load products');
      }
    }
  };

  const fetchStrategies = async () => {
    try {
      const response = await pricingAPI.getStrategies();
      setStrategies(response.data || {});
    } catch (error) {
      console.error('Error fetching strategies:', error);
      if (error.response?.status === 401) {
        toast.error('Please login to access pricing strategies');
      } else {
        toast.error('Failed to load pricing strategies');
      }
    }
  };

  const calculatePricing = async () => {
    if (selectedProducts.length === 0) {
      toast.error('Please select at least one product');
      return;
    }

    setLoading(true);
    try {
      const response = await pricingAPI.calculateBulk({
        product_ids: selectedProducts,
        options: {
          strategy: selectedStrategy,
          ...customOptions
        }
      });

      setPricingResults(response.data || []);
      toast.success(`Pricing calculated for ${selectedProducts.length} products`);
    } catch (error) {
      console.error('Error calculating pricing:', error);
      toast.error('Failed to calculate pricing');
    } finally {
      setLoading(false);
    }
  };

  const updatePrices = async () => {
    if (pricingResults.length === 0) {
      toast.error('No pricing results to update');
      return;
    }

    setLoading(true);
    try {
      const response = await pricingAPI.updateBulk({
        product_ids: selectedProducts,
        options: {
          strategy: selectedStrategy,
          ...customOptions
        },
        change_reason: 'Automated pricing update from dashboard'
      });

      toast.success('Product prices updated successfully');
      fetchProducts();
    } catch (error) {
      console.error('Error updating prices:', error);
      toast.error('Failed to update prices');
    } finally {
      setLoading(false);
    }
  };

  const toggleProductSelection = (productId) => {
    setSelectedProducts(prev => (
      prev.includes(productId)
        ? prev.filter(id => id !== productId)
        : [...prev, productId]
    ));
  };

  const selectAllProducts = () => {
    const all = products.map(p => p.id);
    setSelectedProducts(all);
  };

  const clearSelection = () => {
    setSelectedProducts([]);
  };

  // Propagate selection changes to parent outside of render to avoid warnings
  useEffect(() => {
    if (onProductSelect) onProductSelect(selectedProducts);
  }, [selectedProducts, onProductSelect]);

  if (authLoading) {
    return (
      <div className="p-6 bg-gray-50 min-h-screen">
        <div className="max-w-7xl mx-auto">
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
      <div className="p-6 bg-gray-50 min-h-screen">
        <div className="max-w-7xl mx-auto">
          <div className="text-center py-12">
            <p className="text-gray-600">Please login to access the pricing dashboard</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <div className="max-w-7xl mx-auto">
                 <div className="mb-8">
           <h1 className="text-3xl font-bold text-gray-900 mb-2">
             Intelligent Pricing Dashboard
           </h1>
           <p className="text-gray-600">
             Optimize your product pricing with AI-driven strategies
           </p>
           <div className="mt-4 flex gap-2">
             <button
               onClick={() => {
                 fetchProducts();
                 fetchStrategies();
               }}
               className="px-4 py-2 text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
             >
               Refresh Data
             </button>
           </div>
         </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-1 space-y-6">
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Product Selection
              </h3>
              
              <div className="mb-4 flex gap-2">
                <button
                  onClick={selectAllProducts}
                  className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
                >
                  Select All
                </button>
                <button
                  onClick={clearSelection}
                  className="px-3 py-1 text-sm bg-gray-600 text-white rounded hover:bg-gray-700"
                >
                  Clear
                </button>
              </div>

              <div className="max-h-64 overflow-y-auto space-y-2">
                {products.map((product) => (
                  <label key={product.id} className="flex items-center space-x-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={selectedProducts.includes(product.id)}
                      onChange={() => toggleProductSelection(product.id)}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {product.name}
                      </p>
                      <p className="text-sm text-gray-500">
                        Current: {product.price ? Number(product.price).toLocaleString() + ' CFA' : '0 CFA'}
                      </p>
                    </div>
                  </label>
                ))}
              </div>
              
              <div className="mt-4 p-3 bg-blue-50 rounded-lg">
                <p className="text-sm text-blue-800">
                  {selectedProducts.length} product(s) selected
                </p>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Pricing Strategy
              </h3>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Strategy
                  </label>
                                     <select
                     value={selectedStrategy}
                     onChange={(e) => setSelectedStrategy(e.target.value)}
                     className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                   >
                     {Object.keys(strategies).length > 0 ? (
                       Object.entries(strategies).map(([key, strategy]) => (
                         <option key={key} value={key}>
                           {strategy.name}
                         </option>
                       ))
                     ) : (
                       <option value="">Loading strategies...</option>
                     )}
                   </select>
                </div>

                {selectedStrategy === 'costPlus' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Markup Percentage
                    </label>
                    <input
                      type="number"
                      value={customOptions.markup}
                      onChange={(e) => setCustomOptions(prev => ({ ...prev, markup: Number(e.target.value) }))}
                      className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="100"
                    />
                  </div>
                )}

                {selectedStrategy === 'competitive' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Market Positioning
                    </label>
                    <select
                      value={customOptions.positioning}
                      onChange={(e) => setCustomOptions(prev => ({ ...prev, positioning: e.target.value }))}
                      className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="competitive">Competitive</option>
                      <option value="premium">Premium</option>
                      <option value="economy">Economy</option>
                    </select>
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Location (for tax calculations)
                  </label>
                  <input
                    type="text"
                    value={customOptions.location}
                    onChange={(e) => setCustomOptions(prev => ({ ...prev, location: e.target.value }))}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="US"
                  />
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <div className="space-y-3">
                <button
                  onClick={calculatePricing}
                  disabled={loading || selectedProducts.length === 0}
                  className="w-full flex items-center justify-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? 'Calculating...' : 'Calculate Pricing'}
                </button>
                
                <button
                  onClick={updatePrices}
                  disabled={loading || pricingResults.length === 0}
                  className="w-full flex items-center justify-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Update Product Prices
                </button>
              </div>
            </div>
          </div>

          <div className="lg:col-span-2 space-y-6">
                         {strategies[selectedStrategy] ? (
               <div className="bg-white rounded-lg shadow p-6">
                 <h3 className="text-lg font-semibold text-gray-900 mb-4">
                   {strategies[selectedStrategy].name}
                 </h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-600 mb-2">{strategies[selectedStrategy].description}</p>
                    <p className="text-sm text-gray-600">
                      <strong>Best for:</strong> {strategies[selectedStrategy].best_for}
                    </p>
                  </div>
                  
                  <div>
                    <div className="mb-2">
                      <p className="text-sm font-medium text-gray-700">Advantages:</p>
                      <ul className="text-sm text-gray-600">
                        {strategies[selectedStrategy].advantages?.map((adv, index) => (
                          <li key={index} className="flex items-center">
                            <span className="text-green-500 mr-1">✓</span>
                            {adv}
                          </li>
                        ))}
                      </ul>
                    </div>
                    
                    <div>
                      <p className="text-sm font-medium text-gray-700">Disadvantages:</p>
                      <ul className="text-sm text-gray-600">
                        {strategies[selectedStrategy].disadvantages?.map((dis, index) => (
                          <li key={index} className="flex items-center">
                            <span className="text-red-500 mr-1">⚠</span>
                            {dis}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                                 </div>
               </div>
             ) : (
               <div className="bg-white rounded-lg shadow p-6">
                 <div className="animate-pulse">
                   <div className="h-6 bg-gray-200 rounded w-1/3 mb-4"></div>
                   <div className="h-4 bg-gray-200 rounded w-1/2 mb-2"></div>
                   <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                 </div>
               </div>
             )}

            {pricingResults.length > 0 && (
              <div className="bg-white rounded-lg shadow p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                  Pricing Results
                </h3>
                
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Product
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Base Cost (CFA)
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          New Price (CFA)
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Profit Margin
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Markup (CFA)
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {pricingResults.map((result, index) => (
                        <tr key={index} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm font-medium text-gray-900">
                              {products.find(p => p.id === result.product_id)?.name || 'Unknown Product'}
                            </div>
                            <div className="text-sm text-gray-500">
                              ID: {result.product_id}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {result.base_cost !== undefined && result.base_cost !== null
                              ? `${Number(result.base_cost).toLocaleString()} CFA`
                              : 'N/A'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {result.calculated_price !== undefined && result.calculated_price !== null
                              ? `${Number(result.calculated_price).toLocaleString()} CFA`
                              : 'N/A'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {result.price_breakdown && result.price_breakdown.profit_margin !== undefined && result.price_breakdown.profit_margin !== null
                              ? `${result.price_breakdown.profit_margin.toFixed(1)}%`
                              : 'N/A'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {result.price_breakdown && result.price_breakdown.markup !== undefined && result.price_breakdown.markup !== null
                              ? `${Number(result.price_breakdown.markup).toLocaleString()} CFA`
                              : 'N/A'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="mt-6 grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="bg-blue-50 p-4 rounded-lg">
                    <p className="text-sm font-medium text-blue-600">Total Products</p>
                    <p className="text-2xl font-bold text-blue-900">
                      {pricingResults.length > 0 ? pricingResults.length : products.length}
                    </p>
                  </div>
                  
                  <div className="bg-green-50 p-4 rounded-lg">
                    <p className="text-sm font-medium text-green-600">Avg Profit Margin</p>
                    <p className="text-2xl font-bold text-green-900">
                      {pricingResults.length > 0 ? 
                        (pricingResults.reduce((sum, r) => sum + (r.price_breakdown?.profit_margin || 0), 0) / pricingResults.length).toFixed(1) + '%' :
                        products.length > 0 ? 
                          (products.reduce((sum, p) => {
                            const costPrice = parseFloat(p.cost_price) || 0;
                            const sellingPrice = parseFloat(p.price) || 0;
                            const margin = costPrice > 0 ? ((sellingPrice - costPrice) / sellingPrice) * 100 : 0;
                            return sum + margin;
                          }, 0) / products.length).toFixed(1) + '%' : '0.0%'
                      }
                    </p>
                  </div>
                  
                  <div className="bg-purple-50 p-4 rounded-lg">
                    <p className="text-sm font-medium text-purple-600">Total Markup</p>
                    <p className="text-2xl font-bold text-purple-900">
                      {pricingResults.length > 0 ? 
                        `${pricingResults.reduce((sum, r) => sum + (r.price_breakdown?.markup || 0), 0).toLocaleString()} CFA` :
                        `${products.reduce((sum, p) => {
                          const costPrice = parseFloat(p.cost_price) || 0;
                          const sellingPrice = parseFloat(p.price) || 0;
                          return sum + (sellingPrice - costPrice);
                        }, 0).toLocaleString()} CFA`
                      }
                    </p>
                  </div>
                  
                  <div className="bg-orange-50 p-4 rounded-lg">
                    <p className="text-sm font-medium text-orange-600">Strategy</p>
                    <p className="text-lg font-bold text-orange-900 capitalize">
                      {selectedStrategy}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default PricingDashboard;
