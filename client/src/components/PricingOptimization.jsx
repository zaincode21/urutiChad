import React, { useState } from 'react';
import { toast } from 'react-hot-toast';
import { api } from '../lib/api';
import { useAuth } from '../contexts/AuthContext';
import TranslatedText from './TranslatedText';

const PricingOptimization = ({ productIds, onOptimizationComplete }) => {
  const { user, isLoading: authLoading } = useAuth();
  const [constraints, setConstraints] = useState({
    min_profit_margin: 15,
    max_price_increase: 200,
    target_market_share: 25
  });
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState(null);

  const runOptimization = async () => {
    if (!productIds || productIds.length === 0) {
      toast.error('Please select products to optimize');
      return;
    }

    setLoading(true);
    try {
      const response = await api.post('/pricing/optimization', {
        product_ids: productIds,
        constraints
      });

      setResults(response.data);
      toast.success('Pricing optimization completed successfully');
      
      if (onOptimizationComplete) {
        onOptimizationComplete(response.data);
      }
    } catch (error) {
      console.error('Error running optimization:', error);
      toast.error('Failed to run pricing optimization');
    } finally {
      setLoading(false);
    }
  };

  const updateConstraint = (key, value) => {
    setConstraints(prev => ({
      ...prev,
      [key]: Number(value)
    }));
  };

  if (authLoading) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
          <p className="text-gray-600">Loading authentication...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="text-center py-8">
          <p className="text-gray-600">Please login to access pricing optimization</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">
        Pricing Optimization
      </h3>
      
      <p className="text-sm text-gray-600 mb-6">
        Find the optimal pricing strategy (in CFA) for maximum profitability while maintaining market competitiveness.
      </p>

      {/* Optimization Constraints */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Minimum Profit Margin (%)
          </label>
          <input
            type="number"
            value={constraints.min_profit_margin}
            onChange={(e) => updateConstraint('min_profit_margin', e.target.value)}
            className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            min="0"
            max="100"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Maximum Price Increase (%)
          </label>
          <input
            type="number"
            value={constraints.max_price_increase}
            onChange={(e) => updateConstraint('max_price_increase', e.target.value)}
            className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            min="0"
            max="1000"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Target Market Share (%)
          </label>
          <input
            type="number"
            value={constraints.target_market_share}
            onChange={(e) => updateConstraint('target_market_share', e.target.value)}
            className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            min="0"
            max="100"
          />
        </div>
      </div>

      {/* Run Optimization Button */}
      <button
        onClick={runOptimization}
        disabled={loading || !productIds || productIds.length === 0}
        className="w-full flex items-center justify-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-purple-600 hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {loading ? 'Optimizing...' : `Optimize ${productIds?.length || 0} Products`}
      </button>

      {/* Optimization Results */}
      {results && (
        <div className="mt-6 space-y-4">
          <div className="border-t pt-6">
            <h4 className="text-md font-semibold text-gray-900 mb-4">
              Optimization Results
            </h4>
            
            {/* Summary */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
              <div className="bg-blue-50 p-3 rounded-lg">
                <p className="text-xs font-medium text-blue-600">Total Products</p>
                <p className="text-lg font-bold text-blue-900">{results.summary?.total_products || 0}</p>
              </div>
              
              <div className="bg-green-50 p-3 rounded-lg">
                <p className="text-xs font-medium text-green-600">Successful</p>
                <p className="text-lg font-bold text-green-900">{results.summary?.successful_optimizations || 0}</p>
              </div>
              
              <div className="bg-yellow-50 p-3 rounded-lg">
                <p className="text-xs font-medium text-yellow-600">Failed</p>
                <p className="text-lg font-bold text-yellow-900">{results.summary?.failed_optimizations || 0}</p>
              </div>
              
              <div className="bg-red-50 p-3 rounded-lg">
                <p className="text-xs font-medium text-red-600">Errors</p>
                <p className="text-lg font-bold text-red-900">{results.summary?.errors || 0}</p>
              </div>
            </div>

            {/* Detailed Results */}
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Product ID
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Strategy
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Price (CFA)
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Expected Profit (CFA)
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {results.results?.map((result, index) => (
                    <tr key={index} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {result.product_id}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          result.optimization_status === 'success' ? 'bg-green-100 text-green-800' :
                          result.optimization_status === 'failed' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-red-100 text-red-800'
                        }`}>
                          {result.optimization_status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 capitalize">
                        {result.recommended_strategy ?? result.pricing_strategy ?? 'N/A'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {result.recommended_price !== undefined && result.recommended_price !== null
                          ? `${Number(result.recommended_price).toLocaleString()} CFA`
                          : 'N/A'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {result.expected_profit !== undefined && result.expected_profit !== null
                          ? `${Number(result.expected_profit).toLocaleString()} CFA`
                          : 'N/A'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Failed Optimizations */}
            {results.results?.some(r => r.optimization_status === 'failed') && (
              <div className="mt-6 p-4 bg-yellow-50 rounded-lg">
                <h5 className="text-sm font-medium text-yellow-800 mb-2">
                  Failed Optimizations
                </h5>
                <div className="space-y-2">
                  {results.results
                    .filter(r => r.optimization_status === 'failed')
                    .map((result, index) => (
                      <div key={index} className="text-sm text-yellow-700">
                        <strong>Product {result.product_id}:</strong> {result.reason}
                      </div>
                    ))}
                </div>
              </div>
            )}

            {/* Error Details */}
            {results.results?.some(r => r.optimization_status === 'error') && (
              <div className="mt-6 p-4 bg-red-50 rounded-lg">
                <h5 className="text-sm font-medium text-red-800 mb-2">
                  Errors
                </h5>
                <div className="space-y-2">
                  {results.results
                    .filter(r => r.optimization_status === 'error')
                    .map((result, index) => (
                      <div key={index} className="text-sm text-red-700">
                        <strong>Product {result.product_id}:</strong> {result.error}
                      </div>
                    ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default PricingOptimization;
