import React, { useState, useEffect } from 'react';
import { DollarSign } from 'lucide-react';
import TranslatedText from './TranslatedText';

const CurrencyInput = ({
  value,
  onChange,
  label,
  placeholder = "0.00",
  required = false,
  error,
  className = "",
  onCurrencyChange,
  defaultCurrency,
  targetCurrency,
  showConversion,
  ...props
}) => {
  const [inputValue, setInputValue] = useState(value || '');
  
  useEffect(() => {
    if (value) {
      setInputValue(value);
    }
  }, [value]);

  const handleInputChange = (e) => {
    const newValue = e.target.value;
    setInputValue(newValue);
    onChange(newValue);
  };

  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-gray-700">
        {label} {required && '*'}
      </label>
      
      <div className="space-y-3">
        <div className="relative rounded-lg shadow-sm">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <span className="text-gray-500 sm:text-sm">FRw</span>
          </div>
          <input
            type="number"
            value={inputValue}
            onChange={handleInputChange}
            placeholder={placeholder}
            step="0.01"
            min="0"
            className={`block w-full pl-12 pr-12 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
              error ? 'border-red-500' : 'border-gray-300'
            } ${className}`}
            {...props}
          />
          <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
            <span className="text-gray-500 sm:text-sm">RWF</span>
          </div>
        </div>

        {/* Error Display */}
        {error && (
          <p className="text-red-500 text-sm">{error}</p>
        )}
      </div>
    </div>
  );
};

export default CurrencyInput;
