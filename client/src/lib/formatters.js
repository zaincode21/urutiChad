import { translationService } from './i18n/translation-service';

/**
 * Get current locale based on selected language
 */
const getCurrentLocale = () => {
    const language = translationService.getLanguage();
    // Map language codes to locales
    const localeMap = {
        'fr': 'fr-FR',
        'en': 'en-US',
        'sw': 'sw-KE',
        'es': 'es-ES',
        'pt': 'pt-PT',
        'ar': 'ar-SA',
        'zh': 'zh-CN',
        'hi': 'hi-IN',
        'de': 'de-DE',
        'it': 'it-IT',
        'ja': 'ja-JP',
        'ko': 'ko-KR',
        'ru': 'ru-RU',
        'tr': 'tr-TR',
        'vi': 'vi-VN',
        'nl': 'nl-NL',
        'pl': 'pl-PL',
        'th': 'th-TH',
        'uk': 'uk-UA'
    };
    return localeMap[language] || 'en-US';
};

/**
 * Format a number as currency
 * @param {number} amount - The amount to format
 * @param {string} currency - The currency code (default: RWF)
 * @returns {string} Formatted currency string
 */
export const formatCurrency = (amount, currency = 'CFA') => {
    const locale = getCurrentLocale();
    try {
        return new Intl.NumberFormat(locale, {
            style: 'currency',
            currency: currency,
            currencyDisplay: 'narrowSymbol',
            minimumFractionDigits: 0,
            maximumFractionDigits: 2
        }).format(amount);
    } catch (error) {
        console.error('Error formatting currency:', error);
        return `${amount} ${currency}`;
    }
};

/**
 * Format a date string or object
 * @param {string|Date} date - The date to format
 * @param {Object} options - Intl.DateTimeFormat options
 * @returns {string} Formatted date string
 */
export const formatDate = (date, options = {}) => {
    if (!date) return '';
    const locale = getCurrentLocale();
    try {
        return new Date(date).toLocaleDateString(locale, {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            ...options
        });
    } catch (error) {
        console.error('Error formatting date:', error);
        return String(date);
    }
};

/**
 * Format a number
 * @param {number} number - The number to format
 * @param {Object} options - Intl.NumberFormat options
 * @returns {string} Formatted number string
 */
export const formatNumber = (number, options = {}) => {
    const locale = getCurrentLocale();
    try {
        return new Intl.NumberFormat(locale, options).format(number);
    } catch (error) {
        console.error('Error formatting number:', error);
        return String(number);
    }
};
