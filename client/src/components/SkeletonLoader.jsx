import React from 'react';
import TranslatedText from './TranslatedText';

const SkeletonLoader = ({ 
  type = 'card', 
  count = 1, 
  className = '' 
}) => {
  const renderSkeleton = () => {
    switch (type) {
      case 'card':
        return (
          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 animate-pulse">
            <div className="flex items-center mb-4">
              <div className="h-12 w-12 bg-gray-200 rounded-xl"></div>
              <div className="ml-4 flex-1">
                <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                <div className="h-3 bg-gray-200 rounded w-1/2"></div>
              </div>
            </div>
            <div className="space-y-2">
              <div className="h-3 bg-gray-200 rounded w-full"></div>
              <div className="h-3 bg-gray-200 rounded w-5/6"></div>
              <div className="h-3 bg-gray-200 rounded w-4/6"></div>
            </div>
          </div>
        );
      
      case 'table':
        return (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 animate-pulse">
            <div className="p-6">
              <div className="h-6 bg-gray-200 rounded w-1/4 mb-4"></div>
              <div className="space-y-3">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="flex items-center space-x-4">
                    <div className="h-4 bg-gray-200 rounded w-1/6"></div>
                    <div className="h-4 bg-gray-200 rounded w-1/4"></div>
                    <div className="h-4 bg-gray-200 rounded w-1/6"></div>
                    <div className="h-4 bg-gray-200 rounded w-1/8"></div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        );
      
      case 'list':
        return (
          <div className="space-y-3 animate-pulse">
            {[...Array(count)].map((_, i) => (
              <div key={i} className="flex items-center space-x-4 p-4 bg-white rounded-lg border border-gray-100">
                <div className="h-10 w-10 bg-gray-200 rounded-full"></div>
                <div className="flex-1">
                  <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                  <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                </div>
                <div className="h-8 w-20 bg-gray-200 rounded"></div>
              </div>
            ))}
          </div>
        );
      
      case 'chart':
        return (
          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 animate-pulse">
            <div className="h-6 bg-gray-200 rounded w-1/3 mb-4"></div>
            <div className="h-64 bg-gray-200 rounded"></div>
            <div className="mt-4 flex justify-between">
              <div className="h-3 bg-gray-200 rounded w-1/6"></div>
              <div className="h-3 bg-gray-200 rounded w-1/6"></div>
              <div className="h-3 bg-gray-200 rounded w-1/6"></div>
            </div>
          </div>
        );
      
      default:
        return (
          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 animate-pulse">
            <div className="h-4 bg-gray-200 rounded w-full mb-2"></div>
            <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2"></div>
          </div>
        );
    }
  };

  return (
    <div className={className}>
      {[...Array(count)].map((_, i) => (
        <div key={i} className={count > 1 ? 'mb-4' : ''}>
          {renderSkeleton()}
        </div>
      ))}
    </div>
  );
};

export default SkeletonLoader;
