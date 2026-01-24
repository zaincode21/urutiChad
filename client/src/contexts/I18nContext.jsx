import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { translationService } from '../lib/i18n/translation-service';

const I18nContext = createContext();

export const I18nProvider = ({ 
  children, 
  defaultLanguage = 'fr', // Default to French as requested
  googleTranslateApiKey = null 
}) => {
  const [language, setLanguage] = useState(defaultLanguage);
  const [isLoading, setIsLoading] = useState(false);

  // Initialize translation service
  useEffect(() => {
    translationService.init(defaultLanguage, googleTranslateApiKey);
    setLanguage(translationService.getLanguage());
  }, [defaultLanguage, googleTranslateApiKey]);

  // Listen for language changes
  useEffect(() => {
    const handleLanguageChange = (event) => {
      setLanguage(event.detail.language);
    };

    window.addEventListener('languageChanged', handleLanguageChange);
    return () => window.removeEventListener('languageChanged', handleLanguageChange);
  }, []);

  // Translate function
  const translate = useCallback(async (text, targetLang = null) => {
    if (!text) return text;
    
    setIsLoading(true);
    try {
      const result = await translationService.translate(text, targetLang);
      return result;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Synchronous translate function (cached only)
  const translateSync = useCallback((text, targetLang = null) => {
    if (!text) return text;
    return translationService.translateSync(text, targetLang);
  }, []);

  // Batch translate function
  const translateBatch = useCallback(async (texts, targetLang = null) => {
    if (!Array.isArray(texts)) return [];
    
    setIsLoading(true);
    try {
      const results = await translationService.translateBatch(texts, targetLang);
      return results;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Change language function
  const changeLanguage = useCallback((newLanguage) => {
    translationService.setLanguage(newLanguage);
  }, []);

  // Get supported languages
  const getSupportedLanguages = useCallback(() => {
    return translationService.getSupportedLanguages();
  }, []);

  // Clear cache functions
  const clearCache = useCallback(() => {
    translationService.clearCache();
  }, []);

  const clearLanguageCache = useCallback((lang) => {
    translationService.clearLanguageCache(lang);
  }, []);

  // Rate limit functions
  const getRateLimitStatus = useCallback(() => {
    return translationService.getRateLimitStatus();
  }, []);

  const clearRateLimit = useCallback(() => {
    translationService.clearRateLimit();
  }, []);

  const value = {
    language,
    isLoading,
    t: translate,
    tSync: translateSync,
    translateBatch,
    setLanguage: changeLanguage,
    getSupportedLanguages,
    clearCache,
    clearLanguageCache,
    getRateLimitStatus,
    clearRateLimit
  };

  return (
    <I18nContext.Provider value={value}>
      {children}
    </I18nContext.Provider>
  );
};

export const useI18n = () => {
  const context = useContext(I18nContext);
  if (!context) {
    throw new Error('useI18n must be used within an I18nProvider');
  }
  return context;
};