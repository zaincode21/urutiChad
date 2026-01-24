import React from 'react';
import { AlertTriangle, RefreshCw, Home, ArrowLeft } from 'lucide-react';
import TranslatedText from './TranslatedText';

const ErrorBoundary = ({ 
  error, 
  onRetry, 
  onGoHome, 
  onGoBack,
  title = "Something went wrong",
  message = "We encountered an unexpected error. Please try again.",
  showActions = true,
  className = ""
}) => {
  const getErrorIcon = () => {
    if (error?.status === 404) return '🔍';
    if (error?.status === 403) return '🔒';
    if (error?.status === 500) return '⚠️';
    return '❌';
  };

  const getErrorTitle = () => {
    if (error?.status === 404) return "Page Not Found";
    if (error?.status === 403) return "Access Denied";
    if (error?.status === 500) return "Server Error";
    return title;
  };

  const getErrorMessage = () => {
    if (error?.status === 404) return "The page you're looking for doesn't exist or has been moved.";
    if (error?.status === 403) return "You don't have permission to access this resource.";
    if (error?.status === 500) return "Our servers are experiencing issues. Please try again later.";
    return message;
  };

  const getErrorSuggestions = () => {
    if (error?.status === 404) {
      return [
        "Check the URL for typos",
        "Use the navigation menu to find what you're looking for",
        "Go back to the dashboard"
      ];
    }
    if (error?.status === 403) {
      return [
        "Contact your administrator for access",
        "Check if you're logged in with the correct account",
        "Verify your role permissions"
      ];
    }
    if (error?.status === 500) {
      return [
        "Wait a few minutes and try again",
        "Check your internet connection",
        "Contact support if the problem persists"
      ];
    }
    return [
      "Try refreshing the page",
      "Check your internet connection",
      "Contact support if the problem continues"
    ];
  };

  return (
    <div className={`bg-white rounded-2xl p-8 shadow-sm border border-gray-100 text-center ${className}`}>
      <div className="text-6xl mb-4">{getErrorIcon()}</div>
      
      <h3 className="text-xl font-semibold text-gray-900 mb-2">{getErrorTitle()}</h3>
      <p className="text-gray-600 mb-6 max-w-md mx-auto">{getErrorMessage()}</p>
      
      {/* Error Details (for development) */}
      {process.env.NODE_ENV === 'development' && error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6 text-left">
          <h4 className="text-sm font-medium text-red-800 mb-2">Error Details:</h4>
          <pre className="text-xs text-red-700 overflow-auto">
            {JSON.stringify(error, null, 2)}
          </pre>
        </div>
      )}
      
      {/* Suggestions */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6 text-left">
        <h4 className="text-sm font-medium text-blue-800 mb-2">What you can do:</h4>
        <ul className="text-sm text-blue-700 space-y-1">
          {getErrorSuggestions().map((suggestion, index) => (
            <li key={index} className="flex items-start">
              <span className="text-blue-500 mr-2">•</span>
              {suggestion}
            </li>
          ))}
        </ul>
      </div>
      
      {/* Action Buttons */}
      {showActions && (
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          {onRetry && (
            <button
              onClick={onRetry}
              className="inline-flex items-center px-4 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Try Again
            </button>
          )}
          
          {onGoBack && (
            <button
              onClick={onGoBack}
              className="inline-flex items-center px-4 py-2 bg-gray-600 text-white font-medium rounded-lg hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 transition-colors"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Go Back
            </button>
          )}
          
          {onGoHome && (
            <button
              onClick={onGoHome}
              className="inline-flex items-center px-4 py-2 bg-green-600 text-white font-medium rounded-lg hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 transition-colors"
            >
              <Home className="h-4 w-4 mr-2" />
              Go to Dashboard
            </button>
          )}
        </div>
      )}
    </div>
  );
};

export default ErrorBoundary;
