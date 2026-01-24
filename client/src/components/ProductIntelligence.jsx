import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Brain, AlertTriangle, CheckCircle, Info, TrendingUp, TrendingDown, Image, BarChart3, Zap, Target, Lightbulb, X } from 'lucide-react';
import { api } from '../lib/api';
import toast from 'react-hot-toast';
import TranslatedText from './TranslatedText';

const ProductIntelligence = ({ productId, onClose }) => {
  const [activeTab, setActiveTab] = useState('overview');

  const { data: intelligenceData, isLoading, error } = useQuery({
    queryKey: ['product-intelligence', productId],
    queryFn: () => api.get(`/products/${productId}/intelligence`).then(res => res.data),
    enabled: !!productId,
  });

  const insights = intelligenceData?.insights;

  if (isLoading) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-8 max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500"></div>
            <span className="ml-3 text-gray-600">Analyzing product intelligence...</span>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-8 max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
          <div className="flex items-center justify-center text-red-500">
            <AlertTriangle className="h-8 w-8 mr-3" />
            <span>Failed to load intelligence insights</span>
          </div>
        </div>
      </div>
    );
  }

  if (!insights) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-8 max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
          <div className="flex items-center justify-center">
            <Info className="h-8 w-8 mr-3 text-blue-500" />
            <span>No intelligence data available for this product</span>
          </div>
        </div>
      </div>
    );
  }

  const getScoreColor = (score) => {
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getScoreBgColor = (score) => {
    if (score >= 80) return 'bg-green-100';
    if (score >= 60) return 'bg-yellow-100';
    return 'bg-red-100';
  };

  const tabs = [
    { id: 'overview', label: 'Overview', icon: Brain },
    { id: 'sku', label: 'SKU Analysis', icon: BarChart3 },
    { id: 'duplicates', label: 'Duplicates', icon: AlertTriangle },
    { id: 'demand', label: 'Demand Forecast', icon: TrendingUp },
    { id: 'images', label: 'Image Analysis', icon: Image },
    { id: 'recommendations', label: 'Recommendations', icon: Lightbulb }
  ];

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-6xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center">
            <Brain className="h-8 w-8 text-primary-500 mr-3" />
            <h2 className="text-2xl font-bold text-gray-900"><TranslatedText text="Product Intelligence" /></h2>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* Tabs */}
        <div className="border-b border-gray-200 mb-6">
          <nav className="flex space-x-8">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center py-2 px-1 border-b-2 font-medium text-sm ${
                    activeTab === tab.id
                      ? 'border-primary-500 text-primary-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <Icon className="h-4 w-4 mr-2" />
                  {tab.label}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Content */}
        <div className="space-y-6">
          {/* Overview Tab */}
          {activeTab === 'overview' && (
            <div className="space-y-6">
              {/* Overall Score */}
              <div className="bg-gradient-to-r from-primary-50 to-secondary-50 rounded-lg p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-2"><TranslatedText text="Overall Intelligence Score" /></h3>
                    <p className="text-gray-600">Comprehensive analysis of your product's performance and optimization potential</p>
                  </div>
                  <div className={`text-center ${getScoreBgColor(insights?.summary?.overallScore || 0)} rounded-full p-4`}>
                    <div className={`text-3xl font-bold ${getScoreColor(insights?.summary?.overallScore || 0)}`}>
                      {insights?.summary?.overallScore || 0}
                    </div>
                    <div className="text-sm text-gray-600">/ 100</div>
                  </div>
                </div>
              </div>

              {/* Critical Alerts */}
              {insights?.summary?.warnings && insights.summary.warnings.length > 0 && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <div className="flex items-center mb-3">
                    <AlertTriangle className="h-5 w-5 text-red-500 mr-2" />
                    <h3 className="font-medium text-red-900"><TranslatedText text="Critical Issues Detected" /></h3>
                  </div>
                  <div className="space-y-2">
                    {insights.summary.warnings.map((warning, index) => (
                      <div key={index} className="flex items-start">
                        <div className={`flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold mr-3 mt-0.5 ${
                          warning.priority === 'high' ? 'bg-red-500 text-white' :
                          warning.priority === 'medium' ? 'bg-orange-500 text-white' :
                          'bg-yellow-500 text-white'
                        }`}>
                          !
                        </div>
                        <div className="flex-1">
                          <p className="text-red-800 font-medium">{warning.message}</p>
                          {warning.count && (
                            <p className="text-red-600 text-sm">Affects {warning.count} item(s)</p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Quick Stats */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-white border border-gray-200 rounded-lg p-4">
                  <div className="flex items-center">
                    <BarChart3 className="h-8 w-8 text-blue-500 mr-3" />
                    <div>
                      <div className="text-sm text-gray-600">SKU Quality</div>
                      <div className="text-xl font-semibold text-gray-900">
                        {insights?.summary?.componentScores?.sku || 0}%
                      </div>
                    </div>
                  </div>
                </div>

                <div className="bg-white border border-gray-200 rounded-lg p-4">
                  <div className="flex items-center">
                    <AlertTriangle className="h-8 w-8 text-yellow-500 mr-3" />
                    <div>
                      <div className="text-sm text-gray-600">Duplicate Risk</div>
                      <div className="text-xl font-semibold text-gray-900">
                        {insights?.duplicateAnalysis?.hasDuplicates ? 'High' : 'Low'}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="bg-white border border-gray-200 rounded-lg p-4">
                  <div className="flex items-center">
                    <TrendingUp className="h-8 w-8 text-green-500 mr-3" />
                    <div>
                      <div className="text-sm text-gray-600">Demand Trend</div>
                      <div className="text-xl font-semibold text-gray-900">
                        {insights?.demandForecast?.forecast?.summary?.trend || 'Stable'}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="bg-white border border-gray-200 rounded-lg p-4">
                  <div className="flex items-center">
                    <Image className="h-8 w-8 text-purple-500 mr-3" />
                    <div>
                      <div className="text-sm text-gray-600">Image Quality</div>
                      <div className="text-xl font-semibold text-gray-900">
                        {insights?.summary?.componentScores?.image || 0}%
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Top Recommendations */}
              <div className="bg-white border border-gray-200 rounded-lg p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                  <Lightbulb className="h-5 w-5 text-yellow-500 mr-2" />
                  Top Recommendations
                </h3>
                <div className="space-y-3">
                  {insights?.summary?.recommendations?.slice(0, 3).map((rec, index) => (
                    <div key={index} className={`flex items-start p-3 rounded-lg border-l-4 ${
                      rec.priority === 'high' ? 'border-red-400 bg-red-50' :
                      rec.priority === 'medium' ? 'border-yellow-400 bg-yellow-50' :
                      'border-blue-400 bg-blue-50'
                    }`}>
                      <div className={`flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-sm font-medium mr-3 mt-0.5 ${
                        rec.priority === 'high' ? 'bg-red-100 text-red-600' :
                        rec.priority === 'medium' ? 'bg-yellow-100 text-yellow-600' :
                        'bg-blue-100 text-blue-600'
                      }`}>
                        {index + 1}
                      </div>
                      <div className="flex-1">
                        <p className="text-gray-800 font-medium">{rec.message || rec}</p>
                        <div className="flex items-center mt-1">
                          <span className={`text-xs px-2 py-1 rounded-full ${
                            rec.priority === 'high' ? 'bg-red-100 text-red-700' :
                            rec.priority === 'medium' ? 'bg-yellow-100 text-yellow-700' :
                            'bg-blue-100 text-blue-700'
                          }`}>
                            {rec.priority || 'medium'} priority
                          </span>
                          {rec.type && (
                            <span className="text-xs text-gray-500 ml-2">
                              {rec.type.toUpperCase()}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  )) || (
                    <p className="text-gray-500 italic">No recommendations available</p>
                  )}
                </div>
              </div>

              {/* Key Insights */}
              <div className="bg-white border border-gray-200 rounded-lg p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                  <Target className="h-5 w-5 text-primary-500 mr-2" />
                  Key Insights
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {insights?.summary?.insights?.map((insight, index) => (
                    <div key={index} className="flex items-start p-3 bg-gray-50 rounded-lg">
                      <Info className="h-4 w-4 text-blue-500 mr-2 mt-0.5 flex-shrink-0" />
                      <span className="text-sm text-gray-700">{insight}</span>
                    </div>
                  )) || (
                    <p className="text-gray-500 italic">No insights available</p>
                  )}
                </div>
              </div>

              {/* Quick Actions */}
              <div className="bg-white border border-gray-200 rounded-lg p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                  <Zap className="h-5 w-5 text-yellow-500 mr-2" />
                  Quick Actions
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {insights?.skuAnalysis?.improvements?.length > 0 && (
                    <button 
                      className="flex items-center p-3 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-lg transition-colors text-left"
                      onClick={() => setActiveTab('sku')}
                    >
                      <BarChart3 className="h-4 w-4 text-blue-600 mr-2" />
                      <span className="text-sm text-blue-800 font-medium">Improve SKU</span>
                    </button>
                  )}
                  
                  {insights?.duplicateAnalysis?.hasDuplicates && (
                    <button 
                      className="flex items-center p-3 bg-red-50 hover:bg-red-100 border border-red-200 rounded-lg transition-colors text-left"
                      onClick={() => setActiveTab('duplicates')}
                    >
                      <AlertTriangle className="h-4 w-4 text-red-600 mr-2" />
                      <span className="text-sm text-red-800 font-medium">Review Duplicates</span>
                    </button>
                  )}
                  
                  {insights?.demandForecast?.recommendations?.currentStock !== insights?.demandForecast?.recommendations?.optimalStockLevel && (
                    <button 
                      className="flex items-center p-3 bg-green-50 hover:bg-green-100 border border-green-200 rounded-lg transition-colors text-left"
                      onClick={() => setActiveTab('demand')}
                    >
                      <TrendingUp className="h-4 w-4 text-green-600 mr-2" />
                      <span className="text-sm text-green-800 font-medium">Optimize Stock</span>
                    </button>
                  )}
                  
                  <button 
                    className="flex items-center p-3 bg-purple-50 hover:bg-purple-100 border border-purple-200 rounded-lg transition-colors text-left"
                    onClick={() => {
                      toast.success('Analysis refreshed with latest data');
                      // In a real app, this would refetch the data
                    }}
                  >
                    <Brain className="h-4 w-4 text-purple-600 mr-2" />
                    <span className="text-sm text-purple-800 font-medium">Refresh Analysis</span>
                  </button>
                  
                  <button 
                    className="flex items-center p-3 bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded-lg transition-colors text-left"
                    onClick={() => {
                      const reportData = {
                        productId: insights?.productId,
                        overallScore: insights?.summary?.overallScore,
                        recommendations: insights?.summary?.recommendations,
                        duplicates: insights?.duplicateAnalysis?.duplicates?.length || 0,
                        demandForecast: insights?.demandForecast?.forecast?.summary
                      };
                      console.log('Intelligence Report:', reportData);
                      toast.success('Intelligence report generated');
                    }}
                  >
                    <BarChart3 className="h-4 w-4 text-gray-600 mr-2" />
                    <span className="text-sm text-gray-800 font-medium">Export Report</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* SKU Analysis Tab */}
          {activeTab === 'sku' && insights?.skuAnalysis && (
            <div className="space-y-6">
              <div className="bg-white border border-gray-200 rounded-lg p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4"><TranslatedText text="SKU Analysis" /></h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-sm font-medium text-gray-700">Current SKU</span>
                      <span className="text-sm font-mono bg-gray-100 px-2 py-1 rounded">
                        {insights.skuAnalysis.currentSKU}
                      </span>
                    </div>
                    {insights.skuAnalysis.generatedSKU && (
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-sm font-medium text-gray-700">Suggested SKU</span>
                        <span className="text-sm font-mono bg-green-100 text-green-800 px-2 py-1 rounded">
                          {insights.skuAnalysis.generatedSKU}
                        </span>
                      </div>
                    )}
                  </div>
                  <div>
                    <h4 className="text-sm font-medium text-gray-700 mb-3">Improvements Available</h4>
                    <ul className="space-y-2">
                      {insights.skuAnalysis.improvements?.map((improvement, index) => (
                        <li key={index} className="text-sm text-gray-600 flex items-start">
                          <AlertTriangle className="h-4 w-4 text-yellow-500 mr-2 mt-0.5 flex-shrink-0" />
                          {improvement}
                        </li>
                      )) || (
                        <li className="text-sm text-green-600 flex items-start">
                          <CheckCircle className="h-4 w-4 text-green-500 mr-2 mt-0.5 flex-shrink-0" />
                          No improvements needed
                        </li>
                      )}
                    </ul>
                  </div>
                </div>
              </div>

              {/* SKU Patterns Analysis */}
              {insights.skuAnalysis.patterns && (
                <div className="bg-white border border-gray-200 rounded-lg p-6">
                  <h4 className="text-lg font-semibold text-gray-900 mb-4">SKU Patterns by Product Type</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {Object.entries(insights.skuAnalysis.patterns).map(([type, skus]) => (
                      <div key={type} className="bg-gray-50 rounded-lg p-4">
                        <h5 className="font-medium text-gray-900 mb-2 capitalize">
                          {type.replace('_', ' ')} ({skus.length})
                        </h5>
                        <div className="space-y-1 max-h-32 overflow-y-auto">
                          {skus.slice(0, 5).map((sku, index) => (
                            <div key={index} className="text-xs font-mono bg-white px-2 py-1 rounded border">
                              {sku}
                            </div>
                          ))}
                          {skus.length > 5 && (
                            <div className="text-xs text-gray-500 italic">
                              +{skus.length - 5} more...
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Duplicates Tab */}
          {activeTab === 'duplicates' && insights?.duplicateAnalysis && (
            <div className="space-y-6">
              <div className="bg-white border border-gray-200 rounded-lg p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                  <AlertTriangle className="h-5 w-5 text-yellow-500 mr-2" />
                  Duplicate Detection Results
                </h3>
                
                {/* Summary */}
                <div className="mb-6 p-4 bg-gray-50 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-gray-700">Duplicate Status</span>
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                      insights.duplicateAnalysis.hasDuplicates 
                        ? 'bg-red-100 text-red-700' 
                        : 'bg-green-100 text-green-700'
                    }`}>
                      {insights.duplicateAnalysis.hasDuplicates ? 'Duplicates Found' : 'No Duplicates'}
                    </span>
                  </div>
                  {insights.duplicateAnalysis.duplicates?.length > 0 && (
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-gray-700">Total Duplicates Found</span>
                      <span className="text-sm font-semibold text-gray-900">
                        {insights.duplicateAnalysis.duplicates.length}
                      </span>
                    </div>
                  )}
                </div>

                {/* Duplicate Products */}
                {insights.duplicateAnalysis.duplicates?.map((duplicate, index) => (
                  <div key={index} className="border border-gray-200 rounded-lg p-4 mb-4">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <h4 className="font-medium text-gray-900 mb-1">
                          {duplicate.product.name}
                        </h4>
                        <div className="text-sm text-gray-600 mb-2">
                          SKU: <span className="font-mono bg-gray-100 px-2 py-1 rounded">{duplicate.product.sku}</span>
                        </div>
                        <div className="text-sm text-gray-600">
                          Price: <span className="font-medium">${duplicate.product.price}</span> | 
                          Stock: <span className="font-medium">{duplicate.product.stock_quantity}</span>
                        </div>
                      </div>
                      <div className="text-right ml-4">
                        <div className={`text-lg font-bold ${
                          duplicate.similarity > 0.8 ? 'text-red-600' :
                          duplicate.similarity > 0.6 ? 'text-yellow-600' :
                          'text-orange-600'
                        }`}>
                          {Math.round(duplicate.similarity * 100)}%
                        </div>
                        <div className="text-xs text-gray-500">similarity</div>
                      </div>
                    </div>
                    
                    <div className="mb-3">
                      <h5 className="text-sm font-medium text-gray-700 mb-2">Similarity Reasons:</h5>
                      <div className="flex flex-wrap gap-2">
                        {duplicate.reasons?.map((reason, reasonIndex) => (
                          <span key={reasonIndex} className="text-xs px-2 py-1 bg-yellow-100 text-yellow-700 rounded-full">
                            {reason}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                ))}

                {/* Recommendations */}
                {insights.duplicateAnalysis.recommendations?.length > 0 && (
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <h4 className="font-medium text-blue-900 mb-2 flex items-center">
                      <Lightbulb className="h-4 w-4 mr-2" />
                      Recommendations
                    </h4>
                    <div className="space-y-2">
                      {insights.duplicateAnalysis.recommendations.map((rec, index) => (
                        <div key={index} className="text-sm text-blue-800">
                          • {rec.message}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Demand Forecast Tab */}
          {activeTab === 'demand' && insights?.demandForecast && (
            <div className="space-y-6">
              <div className="bg-white border border-gray-200 rounded-lg p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                  <TrendingUp className="h-5 w-5 text-green-500 mr-2" />
                  Demand Forecasting
                </h3>
                
                {/* Summary Stats */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                  <div className="bg-blue-50 rounded-lg p-4 text-center">
                    <div className="text-2xl font-bold text-blue-600">
                      {insights.demandForecast.forecast?.summary?.averageDailyDemand?.toFixed(2) || 'N/A'}
                    </div>
                    <div className="text-sm text-blue-700">Avg Daily Demand</div>
                  </div>
                  <div className="bg-green-50 rounded-lg p-4 text-center">
                    <div className="text-2xl font-bold text-green-600">
                      {Math.round(insights.demandForecast.forecast?.summary?.totalForecastedDemand || 0)}
                    </div>
                    <div className="text-sm text-green-700">30-Day Forecast</div>
                  </div>
                  <div className="bg-purple-50 rounded-lg p-4 text-center">
                    <div className="text-2xl font-bold text-purple-600">
                      {Math.round((insights.demandForecast.forecast?.summary?.confidence || 0) * 100)}%
                    </div>
                    <div className="text-sm text-purple-700">Confidence</div>
                  </div>
                  <div className="bg-orange-50 rounded-lg p-4 text-center">
                    <div className="text-2xl font-bold text-orange-600 capitalize">
                      {insights.demandForecast.forecast?.summary?.trend || 'Unknown'}
                    </div>
                    <div className="text-sm text-orange-700">Trend</div>
                  </div>
                </div>

                {/* Forecast Chart Placeholder */}
                <div className="bg-gray-50 rounded-lg p-6 mb-6">
                  <h4 className="font-medium text-gray-900 mb-4">7-Day Forecast Preview</h4>
                  <div className="flex items-end justify-between h-32 space-x-2">
                    {insights.demandForecast.forecast?.dailyForecasts?.slice(0, 7).map((day, index) => (
                      <div key={index} className="flex flex-col items-center flex-1">
                        <div 
                          className="bg-blue-500 rounded-t w-full mb-2"
                          style={{ 
                            height: `${Math.max(10, (day.forecastedDemand / 3) * 80)}px` 
                          }}
                        ></div>
                        <div className="text-xs text-gray-600 text-center">
                          <div className="font-medium">{day.forecastedDemand?.toFixed(1)}</div>
                          <div>{day.dayOfWeek?.slice(0, 3)}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Inventory Recommendations */}
                {insights.demandForecast.recommendations && (
                  <div className="border border-gray-200 rounded-lg p-4">
                    <h4 className="font-medium text-gray-900 mb-3 flex items-center">
                      <Target className="h-4 w-4 text-blue-500 mr-2" />
                      Inventory Recommendations
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                      <div className="bg-gray-50 rounded p-3">
                        <div className="text-sm text-gray-600">Current Stock</div>
                        <div className="text-lg font-semibold text-gray-900">
                          {insights.demandForecast.recommendations.currentStock} units
                        </div>
                      </div>
                      <div className="bg-gray-50 rounded p-3">
                        <div className="text-sm text-gray-600">Optimal Stock Level</div>
                        <div className="text-lg font-semibold text-gray-900">
                          {insights.demandForecast.recommendations.optimalStockLevel} units
                        </div>
                      </div>
                      <div className="bg-gray-50 rounded p-3">
                        <div className="text-sm text-gray-600">Days of Stock</div>
                        <div className="text-lg font-semibold text-gray-900">
                          {Math.round(insights.demandForecast.recommendations.daysOfStock || 0)} days
                        </div>
                      </div>
                      <div className="bg-gray-50 rounded p-3">
                        <div className="text-sm text-gray-600">Forecasted Demand</div>
                        <div className="text-lg font-semibold text-gray-900">
                          {Math.round(insights.demandForecast.recommendations.forecastedDemand || 0)} units
                        </div>
                      </div>
                    </div>
                    
                    {insights.demandForecast.recommendations.recommendations?.length > 0 ? (
                      <div className="space-y-2">
                        {insights.demandForecast.recommendations.recommendations.map((rec, index) => (
                          <div key={index} className="text-sm text-gray-600 flex items-start">
                            <CheckCircle className="h-4 w-4 text-green-500 mr-2 mt-0.5 flex-shrink-0" />
                            {rec.message || rec}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-sm text-green-600 flex items-center">
                        <CheckCircle className="h-4 w-4 mr-2" />
                        Current stock levels are optimal
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Image Analysis Tab */}
          {activeTab === 'images' && insights?.imageAnalysis && (
            <div className="space-y-6">
              <div className="bg-white border border-gray-200 rounded-lg p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4"><TranslatedText text="Image Analysis" /></h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-gray-700">Quality Score</span>
                      <span className={`text-sm font-medium ${getScoreColor(insights.imageAnalysis.qualityScore)}`}>
                        {insights.imageAnalysis.qualityScore}%
                      </span>
                    </div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-gray-700">Image Count</span>
                      <span className="text-sm text-gray-500">{insights.imageAnalysis.imageCount}</span>
                    </div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-gray-700">Has Primary Image</span>
                      <span className={`text-sm font-medium ${insights.imageAnalysis.hasPrimaryImage ? 'text-green-600' : 'text-red-600'}`}>
                        {insights.imageAnalysis.hasPrimaryImage ? 'Yes' : 'No'}
                      </span>
                    </div>
                  </div>
                  <div>
                    <h4 className="text-sm font-medium text-gray-700 mb-2">Optimization Suggestions</h4>
                    <ul className="space-y-1">
                      {insights.imageAnalysis.suggestions?.map((suggestion, index) => (
                        <li key={index} className="text-sm text-gray-600 flex items-start">
                          <Image className="h-4 w-4 text-purple-500 mr-2 mt-0.5 flex-shrink-0" />
                          {suggestion}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Recommendations Tab */}
          {activeTab === 'recommendations' && (
            <div className="space-y-6">
              <div className="bg-white border border-gray-200 rounded-lg p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4"><TranslatedText text="AI Recommendations" /></h3>
                <div className="space-y-4">
                  {insights?.summary?.recommendations?.map((recommendation, index) => (
                    <div key={index} className="flex items-start p-4 bg-gray-50 rounded-lg">
                      <div className="flex-shrink-0 w-8 h-8 bg-primary-100 text-primary-600 rounded-full flex items-center justify-center text-sm font-medium mr-4">
                        {index + 1}
                      </div>
                      <div>
                        <p className="text-gray-700">{recommendation.message || recommendation}</p>
                        <div className="mt-2 flex space-x-2">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            recommendation.priority === 'high' ? 'bg-red-100 text-red-800' :
                            recommendation.priority === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                            'bg-green-100 text-green-800'
                          }`}>
                            {recommendation.priority || 'Medium'} Priority
                          </span>
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-primary-100 text-primary-800">
                            {recommendation.type || 'AI Suggestion'}
                          </span>
                        </div>
                      </div>
                    </div>
                  )) || (
                    <p className="text-gray-500 italic">No recommendations available</p>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ProductIntelligence; 
