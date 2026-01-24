import React, { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import { api } from '../lib/api';
import { useAuth } from '../contexts/AuthContext';
import TranslatedText from './TranslatedText';

const PricingAnalysis = ({ productId }) => {
  const { user, isLoading: authLoading } = useAuth();
  const [analysis, setAnalysis] = useState(null);
  const [loading, setLoading] = useState(false);
  const [selectedStrategy, setSelectedStrategy] = useState('costPlus');

  useEffect(() => {
    if (productId) {
      fetchAnalysis();
    }
  }, [productId, selectedStrategy]);

  const fetchAnalysis = async () => {
    setLoading(true);
    try {
      const response = await api.get(`/pricing/analysis/${productId}`);
      setAnalysis(response.data);
    } catch (error) {
      console.error('Error fetching pricing analysis:', error);
      toast.error('Failed to load pricing analysis');
    } finally {
      setLoading(false);
    }
  };

  if (authLoading) {
    return (
      <div className="p-6 bg-gray-50 rounded-lg">
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
          <p className="text-gray-600">Loading authentication...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="p-6 bg-gray-50 rounded-lg">
        <div className="text-center py-8">
          <p className="text-gray-600">Please login to access pricing analysis</p>
        </div>
      </div>
    );
  }

  if (!productId) {
    return (
      <div className="p-6 bg-gray-50 rounded-lg">
        <p className="text-gray-500">Select a product to view pricing analysis</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="p-6 bg-gray-50 rounded-lg">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="h-4 bg-gray-200 rounded w-1/2 mb-2"></div>
          <div className="h-4 bg-gray-200 rounded w-3/4"></div>
        </div>
      </div>
    );
  }

  if (!analysis) {
    return (
      <div className="p-6 bg-gray-50 rounded-lg">
        <p className="text-gray-500">No pricing analysis available</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Current Pricing Overview */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Current Pricing Overview
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-blue-50 p-4 rounded-lg">
            <p className="text-sm font-medium text-blue-600">Base Cost</p>
            <p className="text-2xl font-bold text-blue-900">
              {analysis.current_pricing?.base_cost ? `${Number(analysis.current_pricing.base_cost).toLocaleString()} CFA` : 'N/A'}
            </p>
          </div>
          
          <div className="bg-green-50 p-4 rounded-lg">
            <p className="text-sm font-medium text-green-600">Current Price</p>
            <p className="text-2xl font-bold text-green-900">
              {analysis.current_pricing?.calculated_price ? `${Number(analysis.current_pricing.calculated_price).toLocaleString()} CFA` : 'N/A'}
            </p>
          </div>
          
          <div className="bg-purple-50 p-4 rounded-lg">
            <p className="text-sm font-medium text-purple-600">Profit Margin</p>
            <p className="text-2xl font-bold text-purple-900">
              {analysis.current_pricing?.price_breakdown?.profit_margin?.toFixed(1) || 'N/A'}%
            </p>
          </div>
        </div>
      </div>

      {/* Alternative Strategies Comparison */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Alternative Pricing Strategies
        </h3>
        
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Strategy
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Price (CFA)
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Profit Margin
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Markup
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {Object.entries(analysis.alternative_strategies || {}).map(([strategy, data]) => (
                <tr key={strategy} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="capitalize font-medium text-gray-900">{strategy}</span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {data.error ? (
                      <span className="text-red-500">Error</span>
                    ) : (
                      data.price ? `${Number(data.price).toLocaleString()} CFA` : 'N/A'
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {data.error ? (
                      <span className="text-red-500">-</span>
                    ) : (
                      `${data.profit_margin?.toFixed(1) || 'N/A'}%`
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {data.error ? (
                      <span className="text-red-500">-</span>
                    ) : (
                      data.markup ? `${Number(data.markup).toLocaleString()} CFA` : 'N/A'
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Market Insights */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Market Insights
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-yellow-50 p-4 rounded-lg">
            <p className="text-sm font-medium text-yellow-600">Demand Level</p>
            <p className="text-lg font-bold text-yellow-900 capitalize">
              {analysis.market_insights?.demand_level || 'N/A'}
            </p>
          </div>
          
          <div className="bg-indigo-50 p-4 rounded-lg">
            <p className="text-sm font-medium text-indigo-600">Seasonal Factor</p>
            <p className="text-lg font-bold text-indigo-900 capitalize">
              {analysis.market_insights?.seasonal_factor || 'N/A'}
            </p>
          </div>
          
          <div className="bg-pink-50 p-4 rounded-lg">
            <p className="text-sm font-medium text-pink-600">Competition Factor</p>
            <p className="text-lg font-bold text-pink-900 capitalize">
              {analysis.market_insights?.competition_factor || 'N/A'}
            </p>
          </div>
        </div>
      </div>

      {/* Price History */}
      {analysis.price_history && analysis.price_history.length > 0 && (
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Price Change History
          </h3>
          
          <div className="space-y-3">
            {analysis.price_history.map((change, index) => (
              <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex-1">
                  <div className="flex items-center space-x-3">
                    <span className="text-sm font-medium text-gray-900">
                      {Number(change.old_price).toLocaleString()} CFA → {Number(change.new_price).toLocaleString()} CFA
                    </span>
                    <span className="text-xs text-gray-500">
                      {new Date(change.created_at).toLocaleDateString()}
                    </span>
                  </div>
                  <div className="text-xs text-gray-500 mt-1">
                    Strategy: {change.pricing_strategy} | Reason: {change.change_reason || 'N/A'}
                  </div>
                </div>
                <div className="text-right">
                  <span className={`text-sm font-medium ${
                    change.new_price > change.old_price ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {change.new_price > change.old_price ? '+' : ''}
                    {((change.new_price - change.old_price) / change.old_price * 100).toFixed(1)}%
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recommendations */}
      {analysis.recommendations && analysis.recommendations.length > 0 && (
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            AI Recommendations
          </h3>
          
          <div className="space-y-3">
            {analysis.recommendations.map((rec, index) => (
              <div key={index} className={`p-4 rounded-lg border-l-4 ${
                rec.type === 'warning' ? 'bg-yellow-50 border-yellow-400' :
                rec.type === 'info' ? 'bg-blue-50 border-blue-400' :
                'bg-green-50 border-green-400'
              }`}>
                <div className="flex">
                  <div className="flex-shrink-0">
                    {rec.type === 'warning' ? (
                      <span className="text-yellow-400">⚠</span>
                    ) : rec.type === 'info' ? (
                      <span className="text-blue-400">ℹ</span>
                    ) : (
                      <span className="text-green-400">✓</span>
                    )}
                  </div>
                  <div className="ml-3">
                    <p className={`text-sm ${
                      rec.type === 'warning' ? 'text-yellow-700' :
                      rec.type === 'info' ? 'text-blue-700' :
                      'text-green-700'
                    }`}>
                      {rec.message}
                    </p>
                    {rec.action && (
                      <p className="text-xs text-gray-500 mt-1">
                        Action: {rec.action}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default PricingAnalysis;
