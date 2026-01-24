import React, { useState } from 'react';
import { Globe, ChevronDown, Check } from 'lucide-react';
import { useTranslation } from '../hooks/useTranslation';
import TranslatedText from './TranslatedText';

/**
 * Language Switcher Component
 * Provides a dropdown to select and change the current language
 */
const LanguageSwitcher = ({ className = '' }) => {
  const { language, setLanguage, getSupportedLanguages, isLoading } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  
  const supportedLanguages = getSupportedLanguages();
  const currentLanguage = supportedLanguages.find(lang => lang.code === language);

  const handleLanguageChange = (newLanguage) => {
    setLanguage(newLanguage);
    setIsOpen(false);
  };

  return (
    <div className={`relative ${className}`}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        disabled={isLoading}
        className="inline-flex items-center px-3 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <Globe className="h-4 w-4 mr-2" />
        <span>{currentLanguage?.native || 'English'}</span>
        <ChevronDown className={`ml-2 h-4 w-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
        {isLoading && (
          <div className="ml-2 animate-spin rounded-full h-3 w-3 border-b-2 border-blue-600"></div>
        )}
      </button>

      {isOpen && (
        <>
          {/* Backdrop */}
          <div 
            className="fixed inset-0 z-dropdown-backdrop" 
            onClick={() => setIsOpen(false)}
          />
          
          {/* Dropdown */}
          <div className="absolute right-0 mt-2 w-56 bg-white border border-gray-200 rounded-lg shadow-lg z-dropdown max-h-64 overflow-y-auto">
            <div className="py-1">
              {supportedLanguages.map((lang) => (
                <button
                  key={lang.code}
                  onClick={() => handleLanguageChange(lang.code)}
                  className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 focus:outline-none focus:bg-gray-100 flex items-center justify-between"
                >
                  <div>
                    <div className="font-medium">{lang.native}</div>
                    <div className="text-xs text-gray-500">{lang.name}</div>
                  </div>
                  {language === lang.code && (
                    <Check className="h-4 w-4 text-blue-600" />
                  )}
                </button>
              ))}
            </div>
            
            {/* Footer with cache info */}
            <div className="border-t border-gray-200 px-4 py-2">
              <div className="text-xs text-gray-500">
                Translations cached locally
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default LanguageSwitcher;
