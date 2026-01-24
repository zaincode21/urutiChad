/**
 * Dynamic Translation Service
 * Provides on-the-fly translation using MyMemory API with smart caching
 */

import { staticTranslations } from './fr';

class TranslationService {
  constructor() {
    this.currentLanguage = 'en';
    this.cache = new Map();
    this.rateLimitInfo = null;
    this.googleApiKey = null;
    this.debug = localStorage.getItem('translation_debug') === 'true';

    // Load cache from localStorage
    this.loadCache();

    // Load rate limit info
    this.loadRateLimitInfo();
  }

  /**
   * Initialize the translation service
   */
  init(defaultLanguage = 'en', googleApiKey = null) {
    this.currentLanguage = defaultLanguage;
    this.currentLanguage = defaultLanguage;
    this.googleApiKey = googleApiKey;

    // Check if there's a saved language preference in localStorage (optional enhancement)
    // For now, strictly respecting the passed defaultLanguage (which is 'fr') allows the system to default to French.

    // Previous browser detection logic removed to enforce default language
    /*
    const browserLang = navigator.language.split('-')[0];
    const supportedLanguages = this.getSupportedLanguages();

    if (supportedLanguages.some(lang => lang.code === browserLang)) {
      this.currentLanguage = browserLang;
    }
    */

    this.log('Translation service initialized', {
      language: this.currentLanguage,
      hasGoogleKey: !!googleApiKey
    });
  }

  /**
   * Get supported languages
   */
  getSupportedLanguages() {
    return [
      { code: 'en', name: 'English', native: 'English' },
      { code: 'fr', name: 'French', native: 'Français' },
      { code: 'sw', name: 'Kiswahili', native: 'Kiswahili' },
      { code: 'es', name: 'Spanish', native: 'Español' },
      { code: 'pt', name: 'Portuguese', native: 'Português' },
      { code: 'ar', name: 'Arabic', native: 'العربية' },
      { code: 'zh', name: 'Chinese', native: '中文' },
      { code: 'hi', name: 'Hindi', native: 'हिन्दी' },
      { code: 'de', name: 'German', native: 'Deutsch' },
      { code: 'it', name: 'Italian', native: 'Italiano' },
      { code: 'ja', name: 'Japanese', native: '日本語' },
      { code: 'ko', name: 'Korean', native: '한국어' },
      { code: 'ru', name: 'Russian', native: 'Русский' },
      { code: 'tr', name: 'Turkish', native: 'Türkçe' },
      { code: 'vi', name: 'Vietnamese', native: 'Tiếng Việt' },
      { code: 'nl', name: 'Dutch', native: 'Nederlands' },
      { code: 'pl', name: 'Polish', native: 'Polski' },
      { code: 'th', name: 'Thai', native: 'ไทย' },
      { code: 'uk', name: 'Ukrainian', native: 'Українська' }
    ];
  }

  /**
   * Set current language
   */
  setLanguage(language) {
    if (this.currentLanguage !== language) {
      this.currentLanguage = language;
      this.log('Language changed to:', language);

      // Dispatch language change event
      window.dispatchEvent(new CustomEvent('languageChanged', {
        detail: { language }
      }));
    }
  }

  /**
   * Get current language
   */
  getLanguage() {
    return this.currentLanguage;
  }

  /**
   * Translate text to target language
   */
  async translate(text, targetLang = null) {
    if (!text || typeof text !== 'string' || text.trim() === '') {
      return text;
    }

    const target = targetLang || this.currentLanguage;

    // If target is English, return original text
    if (target === 'en') {
      return text;
    }

    const cacheKey = this.getCacheKey(text);

    // Check cache first
    const cached = this.getFromCache(cacheKey, target);
    if (cached) {
      this.log('Cache hit:', { text, target, cached });
      return cached;
    }

    // Check rate limit
    if (this.isRateLimited()) {
      this.log('Rate limited, returning original text:', text);
      return text;
    }

    try {
      // Try translation API
      const translated = await this.callTranslationAPI(text, target);

      if (translated && translated !== text) {
        // Cache the result
        this.setCache(cacheKey, target, translated);
        this.log('Translation successful:', { text, target, translated });
        return translated;
      }
    } catch (error) {
      this.log('Translation error:', error);

      // Handle rate limiting
      if (error.status === 429) {
        this.setRateLimit();
      }
    }

    // Return original text as fallback
    return text;
  }

  /**
   * Translate multiple texts at once
   */
  async translateBatch(texts, targetLang = null) {
    if (!Array.isArray(texts)) {
      return [];
    }

    const target = targetLang || this.currentLanguage;
    const results = [];

    // Process in batches to avoid overwhelming the API
    const batchSize = 5;
    for (let i = 0; i < texts.length; i += batchSize) {
      const batch = texts.slice(i, i + batchSize);
      const batchPromises = batch.map(text => this.translate(text, target));
      const batchResults = await Promise.all(batchPromises);
      results.push(...batchResults);

      // Small delay between batches
      if (i + batchSize < texts.length) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }

    return results;
  }

  /**
   * Get synchronous translation (cached only)
   */
  translateSync(text, targetLang = null) {
    if (!text || typeof text !== 'string' || text.trim() === '') {
      return text;
    }

    const target = targetLang || this.currentLanguage;

    // If target is English, return original text
    if (target === 'en') {
      return text;
    }

    const cacheKey = this.getCacheKey(text);
    const cached = this.getFromCache(cacheKey, target);

    return cached || text;
  }

  /**
   * Call translation API
   */
  async callTranslationAPI(text, targetLang) {
    // Try Google Translate first if API key is available
    if (this.googleApiKey) {
      try {
        return await this.callGoogleTranslate(text, targetLang);
      } catch (error) {
        this.log('Google Translate failed, falling back to MyMemory:', error);
      }
    }

    // Use MyMemory API as default/fallback
    return await this.callMyMemoryAPI(text, targetLang);
  }

  /**
   * Call MyMemory Translation API
   */
  async callMyMemoryAPI(text, targetLang) {
    const url = 'https://api.mymemory.translated.net/get';
    const params = new URLSearchParams({
      q: text,
      langpair: `en|${targetLang}`
    });

    const response = await fetch(`${url}?${params}`);

    if (!response.ok) {
      throw new Error(`MyMemory API error: ${response.status}`);
    }

    const data = await response.json();

    if (data.responseStatus === 200 && data.responseData) {
      return data.responseData.translatedText;
    }

    throw new Error('MyMemory API returned invalid response');
  }

  /**
   * Call Google Translate API
   */
  async callGoogleTranslate(text, targetLang) {
    const url = 'https://translation.googleapis.com/language/translate/v2';

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        q: text,
        source: 'en',
        target: targetLang,
        key: this.googleApiKey
      })
    });

    if (!response.ok) {
      throw new Error(`Google Translate API error: ${response.status}`);
    }

    const data = await response.json();

    if (data.data && data.data.translations && data.data.translations[0]) {
      return data.data.translations[0].translatedText;
    }

    throw new Error('Google Translate API returned invalid response');
  }

  /**
   * Generate cache key
   */
  getCacheKey(text) {
    return text.toLowerCase().trim();
  }

  /**
   * Get translation from cache or static file
   */
  getFromCache(cacheKey, targetLang) {
    // Check static translations first for French
    if (targetLang === 'fr' && staticTranslations[this.originalTextMap[cacheKey]]) {
      return staticTranslations[this.originalTextMap[cacheKey]];
    }

    // Also try direct lookup in static translations (case-insensitive fallback)
    if (targetLang === 'fr') {
      const originalText = this.originalTextMap[cacheKey];
      if (originalText && staticTranslations[originalText]) {
        return staticTranslations[originalText];
      }
    }

    const cached = this.cache.get(cacheKey);
    return cached ? cached[targetLang] : null;
  }

  /**
   * Set translation in cache
   */
  setCache(cacheKey, targetLang, translation) {
    if (!this.cache.has(cacheKey)) {
      this.cache.set(cacheKey, {});
    }

    this.cache.get(cacheKey)[targetLang] = translation;

    // Save to localStorage
    this.saveCache();
  }

  /**
   * Load cache from localStorage
   */
  loadCache() {
    try {
      const cached = localStorage.getItem('translation_cache');
      if (cached) {
        const data = JSON.parse(cached);
        this.cache = new Map(Object.entries(data));
      }
      this.originalTextMap = {}; // Map cache keys back to original text for static lookup
    } catch (error) {
      this.log('Failed to load cache:', error);
      this.cache = new Map();
      this.originalTextMap = {};
    }
  }

  // Helper to store original text mapping
  getCacheKey(text) {
    const key = text.toLowerCase().trim();
    if (!this.originalTextMap) this.originalTextMap = {};
    this.originalTextMap[key] = text;
    return key;
  }


  /**
   * Save cache to localStorage
   */
  saveCache() {
    try {
      const data = Object.fromEntries(this.cache);
      const jsonString = JSON.stringify(data);

      // Check size (4MB limit)
      if (jsonString.length > 4 * 1024 * 1024) {
        this.log('Cache size exceeded, clearing old entries');
        this.cleanCache();
        return;
      }

      localStorage.setItem('translation_cache', jsonString);
    } catch (error) {
      this.log('Failed to save cache:', error);
      // If quota exceeded, clear cache
      if (error.name === 'QuotaExceededError') {
        this.clearCache();
      }
    }
  }

  /**
   * Clear all cache
   */
  clearCache() {
    this.cache.clear();
    localStorage.removeItem('translation_cache');
    this.log('Cache cleared');
  }

  /**
   * Clear cache for specific language
   */
  clearLanguageCache(language) {
    for (const [key, translations] of this.cache.entries()) {
      if (translations[language]) {
        delete translations[language];
        if (Object.keys(translations).length === 0) {
          this.cache.delete(key);
        }
      }
    }
    this.saveCache();
    this.log('Language cache cleared:', language);
  }

  /**
   * Clean cache (remove old entries)
   */
  cleanCache() {
    // Keep only the most recent 1000 entries
    const entries = Array.from(this.cache.entries());
    if (entries.length > 1000) {
      this.cache.clear();
      entries.slice(-1000).forEach(([key, value]) => {
        this.cache.set(key, value);
      });
      this.saveCache();
      this.log('Cache cleaned, kept 1000 most recent entries');
    }
  }

  /**
   * Check if rate limited
   */
  isRateLimited() {
    if (!this.rateLimitInfo) {
      return false;
    }

    const now = Date.now();
    const timeSinceLimit = now - this.rateLimitInfo.timestamp;
    const oneHour = 60 * 60 * 1000;

    return timeSinceLimit < oneHour;
  }

  /**
   * Set rate limit
   */
  setRateLimit() {
    this.rateLimitInfo = {
      timestamp: Date.now()
    };
    localStorage.setItem('translation_rate_limit', JSON.stringify(this.rateLimitInfo));
    this.log('Rate limit set');
  }

  /**
   * Clear rate limit
   */
  clearRateLimit() {
    this.rateLimitInfo = null;
    localStorage.removeItem('translation_rate_limit');
    this.log('Rate limit cleared');
  }

  /**
   * Load rate limit info
   */
  loadRateLimitInfo() {
    try {
      const stored = localStorage.getItem('translation_rate_limit');
      if (stored) {
        this.rateLimitInfo = JSON.parse(stored);
      }
    } catch (error) {
      this.log('Failed to load rate limit info:', error);
    }
  }

  /**
   * Get rate limit status
   */
  getRateLimitStatus() {
    if (!this.rateLimitInfo) {
      return { isLimited: false, minutesRemaining: 0 };
    }

    const now = Date.now();
    const timeSinceLimit = now - this.rateLimitInfo.timestamp;
    const oneHour = 60 * 60 * 1000;
    const minutesRemaining = Math.max(0, Math.ceil((oneHour - timeSinceLimit) / (60 * 1000)));

    return {
      isLimited: timeSinceLimit < oneHour,
      minutesRemaining
    };
  }

  /**
   * Configure Google Translate
   */
  configureGoogleTranslate(apiKey) {
    this.googleApiKey = apiKey;
    this.log('Google Translate API configured');
  }

  /**
   * Debug logging
   */
  log(...args) {
    if (this.debug) {
      console.log('[TranslationService]', ...args);
    }
  }
}

// Create singleton instance
export const translationService = new TranslationService();

// Export class for custom instances
export { TranslationService };