import React, { useState, useEffect, useRef } from 'react';
import { X, RefreshCw } from 'lucide-react';

// Mobile Card Component
export const MobileCard = ({ children, onClick, className = '', hover = true }) => {
  return (
    <div 
      className={`bg-white rounded-lg shadow-sm border border-gray-200 ${hover ? 'hover:shadow-md' : ''} ${onClick ? 'cursor-pointer' : ''} ${className}`}
      onClick={onClick}
    >
      {children}
    </div>
  );
};

// Mobile Button Component
export const MobileButton = ({ 
  children, 
  onClick, 
  variant = 'primary', 
  size = 'default', 
  disabled = false,
  fullWidth = false,
  className = ''
}) => {
  const baseClasses = 'font-semibold transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg';
  
  const variantClasses = {
    primary: 'bg-blue-600 text-white hover:bg-blue-700 active:bg-blue-800',
    secondary: 'bg-gray-200 text-gray-900 hover:bg-gray-300 active:bg-gray-400',
    outline: 'border-2 border-blue-600 text-blue-600 hover:bg-blue-50 active:bg-blue-100',
    danger: 'bg-red-600 text-white hover:bg-red-700 active:bg-red-800',
    success: 'bg-green-600 text-white hover:bg-green-700 active:bg-green-800'
  };
  
  const sizeClasses = {
    small: 'px-4 py-2 text-sm min-h-[40px]',
    default: 'px-6 py-3 text-base min-h-[48px]',
    large: 'px-8 py-4 text-lg min-h-[56px]'
  };

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`
        ${baseClasses}
        ${variantClasses[variant]}
        ${sizeClasses[size]}
        ${fullWidth ? 'w-full' : ''}
        ${className}
      `}
    >
      {children}
    </button>
  );
};

// Mobile Input Component
export const MobileInput = ({ 
  label, 
  error, 
  className = '', 
  ...props 
}) => {
  return (
    <div className="space-y-2">
      {label && (
        <label className="block text-sm font-medium text-gray-700">
          {label}
        </label>
      )}
      <input
        className={`
          w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent
          ${error ? 'border-red-500 focus:ring-red-500' : ''}
          ${className}
        `}
        {...props}
      />
      {error && (
        <p className="text-sm text-red-600">{error}</p>
      )}
    </div>
  );
};

// Mobile Modal Component
export const MobileModal = ({ isOpen, onClose, title, children, size = 'default' }) => {
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }

    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const sizeClasses = {
    small: 'max-w-sm',
    default: 'max-w-md',
    large: 'max-w-lg',
    full: 'max-w-full mx-4'
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div 
        className="absolute inset-0 bg-black bg-opacity-50 transition-opacity"
        onClick={onClose}
      />
      
      <div className={`relative bg-white rounded-2xl shadow-2xl w-full ${sizeClasses[size]} max-h-[90vh] overflow-hidden`}>
        {title && (
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-gray-600 rounded-lg"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        )}
        
        <div className="overflow-y-auto max-h-[calc(90vh-80px)]">
          {children}
        </div>
      </div>
    </div>
  );
};

// Mobile Bottom Sheet Component
export const MobileBottomSheet = ({ isOpen, onClose, title, children, maxHeight = '80vh' }) => {
  const [isAnimating, setIsAnimating] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setIsAnimating(true);
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }

    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <>
      <div 
        className="fixed inset-0 bg-black bg-opacity-50 z-50 transition-opacity duration-300"
        onClick={onClose}
      />
      
      <div 
        className={`fixed bottom-0 left-0 right-0 bg-white rounded-t-3xl shadow-2xl z-50 transform transition-transform duration-300 ${
          isAnimating ? 'translate-y-0' : 'translate-y-full'
        }`}
        style={{ maxHeight }}
      >
        <div className="flex justify-center pt-3 pb-2">
          <div className="w-12 h-1 bg-gray-300 rounded-full" />
        </div>
        
        {title && (
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-gray-600 rounded-lg"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        )}
        
        <div className="overflow-y-auto" style={{ maxHeight: 'calc(80vh - 120px)' }}>
          {children}
        </div>
      </div>
    </>
  );
};

export default {
  MobileBottomSheet,
  MobileModal,
  MobileCard,
  MobileButton,
  MobileInput
};