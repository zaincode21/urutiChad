import React, { useState, useEffect } from 'react';
import { CheckCircle, XCircle, AlertCircle, Eye, EyeOff } from 'lucide-react';
import TranslatedText from './TranslatedText';

const FormInput = ({
  label,
  type = 'text',
  value,
  onChange,
  onBlur,
  placeholder,
  required = false,
  disabled = false,
  error,
  success,
  helperText,
  validation,
  showPasswordToggle = false,
  className = '',
  ...props
}) => {
  const [isFocused, setIsFocused] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [validationState, setValidationState] = useState('idle'); // idle, validating, valid, invalid
  const [validationMessage, setValidationMessage] = useState('');

  // Real-time validation
  useEffect(() => {
    if (validation && value && isFocused) {
      setValidationState('validating');
      
      const validateField = async () => {
        try {
          const result = await validation(value);
          if (result === true) {
            setValidationState('valid');
            setValidationMessage('');
          } else if (typeof result === 'string') {
            setValidationState('invalid');
            setValidationMessage(result);
          } else {
            setValidationState('idle');
            setValidationMessage('');
          }
        } catch (err) {
          setValidationState('invalid');
          setValidationMessage(err.message || 'Validation failed');
        }
      };

      const timeoutId = setTimeout(validateField, 300); // Debounce validation
      return () => clearTimeout(timeoutId);
    } else if (!value) {
      setValidationState('idle');
      setValidationMessage('');
    }
  }, [value, validation, isFocused]);

  const getInputType = () => {
    if (type === 'password' && showPasswordToggle) {
      return showPassword ? 'text' : 'password';
    }
    return type;
  };

  const getInputClasses = () => {
    let baseClasses = 'w-full px-4 py-3 border rounded-xl focus:outline-none focus:ring-2 focus:ring-offset-2 transition-all duration-200';
    
    if (disabled) {
      baseClasses += ' bg-gray-50 text-gray-500 cursor-not-allowed';
    } else {
      baseClasses += ' bg-white';
    }

    if (error || validationState === 'invalid') {
      baseClasses += ' border-red-300 focus:ring-red-500 focus:border-red-500';
    } else if (success || validationState === 'valid') {
      baseClasses += ' border-green-300 focus:ring-green-500 focus:border-green-500';
    } else if (isFocused) {
      baseClasses += ' border-blue-300 focus:ring-blue-500 focus:border-blue-500';
    } else {
      baseClasses += ' border-gray-300 focus:ring-blue-500 focus:border-blue-500';
    }

    return baseClasses;
  };

  const getStatusIcon = () => {
    if (validationState === 'validating') {
      return (
        <div className="animate-spin rounded-full h-4 w-4 border-2 border-blue-600 border-t-transparent"></div>
      );
    } else if (validationState === 'valid' || success) {
      return <CheckCircle className="h-4 w-4 text-green-600" />;
    } else if (validationState === 'invalid' || error) {
      return <XCircle className="h-4 w-4 text-red-600" />;
    }
    return null;
  };

  const getStatusMessage = () => {
    if (validationState === 'invalid' && validationMessage) {
      return validationMessage;
    } else if (error) {
      return error;
    } else if (success) {
      return success;
    } else if (helperText) {
      return helperText;
    }
    return null;
  };

  const getStatusColor = () => {
    if (validationState === 'invalid' || error) {
      return 'text-red-600';
    } else if (validationState === 'valid' || success) {
      return 'text-green-600';
    } else if (helperText) {
      return 'text-gray-500';
    }
    return 'text-gray-500';
  };

  return (
    <div className={`space-y-2 ${className}`}>
      {/* Label */}
      {label && (
        <label className="block text-sm font-medium text-gray-700">
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}

      {/* Input Container */}
      <div className="relative">
        <input
          type={getInputType()}
          value={value}
          onChange={onChange}
          onBlur={(e) => {
            setIsFocused(false);
            onBlur?.(e);
          }}
          onFocus={() => setIsFocused(true)}
          placeholder={placeholder}
          disabled={disabled}
          className={getInputClasses()}
          {...props}
        />

        {/* Status Icon */}
        {getStatusIcon() && (
          <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
            {getStatusIcon()}
          </div>
        )}

        {/* Password Toggle */}
        {type === 'password' && showPasswordToggle && (
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
          >
            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        )}
      </div>

      {/* Status Message */}
      {getStatusMessage() && (
        <div className={`flex items-start space-x-2 text-sm ${getStatusColor()}`}>
          {(validationState === 'invalid' || error) && (
            <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
          )}
          <span>{getStatusMessage()}</span>
        </div>
      )}

      {/* Character Count (for text inputs) */}
      {type === 'text' && props.maxLength && (
        <div className="text-xs text-gray-500 text-right">
          {value?.length || 0} / {props.maxLength}
        </div>
      )}
    </div>
  );
};

export default FormInput;
