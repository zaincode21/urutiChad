import React from 'react';
import TranslatedText from './TranslatedText';

const LoadingSpinner = ({ 
  size = 'medium', 
  message = 'Loading...', 
  showMessage = true,
  className = '' 
}) => {
  const sizeClasses = {
    small: 'h-4 w-4',
    medium: 'h-8 w-8',
    large: 'h-12 w-12',
    xlarge: 'h-16 w-16'
  };

  return (
    <div className={`flex flex-col items-center justify-center p-8 ${className}`}>
      <div className="relative">
        {/* Outer ring */}
        <div className={`${sizeClasses[size]} border-4 border-gray-200 rounded-full animate-spin`}></div>
        {/* Inner ring */}
        <div className={`${sizeClasses[size]} border-4 border-blue-600 border-t-transparent rounded-full animate-spin absolute top-0 left-0`}></div>
      </div>
      
      {showMessage && (
        <div className="mt-4 text-center">
          <p className="text-gray-600 text-sm font-medium">{message}</p>
          <div className="mt-2 flex justify-center space-x-1">
            <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
            <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
            <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
          </div>
        </div>
      )}
    </div>
  );
};

export default LoadingSpinner;
