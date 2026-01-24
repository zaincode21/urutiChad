import React, { useState, useEffect } from 'react';
import { useI18n } from '../contexts/I18nContext';

/**
 * TranslatedText Component
 * Automatically translates text and renders it in the specified element
 */
const TranslatedText = ({ 
  text, 
  fallback = null, 
  as: Component = 'span', 
  className = '',
  targetLang = null,
  ...props 
}) => {
  const { t, tSync, language } = useI18n();
  const [translatedText, setTranslatedText] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!text) {
      setTranslatedText('');
      return;
    }

    // First, try to get cached translation synchronously
    const cached = tSync(text, targetLang);
    if (cached !== text) {
      // We have a cached translation
      setTranslatedText(cached);
      return;
    }

    // If no cached translation and not English, try async translation
    const target = targetLang || language;
    if (target !== 'en') {
      setIsLoading(true);
      t(text, targetLang)
        .then(translated => {
          setTranslatedText(translated);
        })
        .catch(error => {
          console.warn('Translation failed:', error);
          setTranslatedText(fallback || text);
        })
        .finally(() => {
          setIsLoading(false);
        });
    } else {
      // For English, just use the original text
      setTranslatedText(text);
    }
  }, [text, language, targetLang, t, tSync, fallback]);

  // Show loading state or translated text
  const displayText = isLoading ? (text.length > 20 ? text : text) : (translatedText || fallback || text);

  return (
    <Component className={className} {...props}>
      {displayText}
    </Component>
  );
};

export default TranslatedText;