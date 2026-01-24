import { useI18n } from '../contexts/I18nContext';

/**
 * Translation hook that provides easy access to translation functions
 */
export const useTranslation = () => {
  const { 
    language, 
    isLoading, 
    t, 
    tSync, 
    translateBatch, 
    setLanguage, 
    getSupportedLanguages,
    clearCache,
    clearLanguageCache,
    getRateLimitStatus,
    clearRateLimit
  } = useI18n();

  return {
    // Current language
    language,
    
    // Loading state
    isLoading,
    
    // Translation functions
    t, // Async translation
    tSync, // Sync translation (cached only)
    translateBatch, // Batch translation
    
    // Language management
    setLanguage,
    getSupportedLanguages,
    
    // Cache management
    clearCache,
    clearLanguageCache,
    
    // Rate limit management
    getRateLimitStatus,
    clearRateLimit
  };
};