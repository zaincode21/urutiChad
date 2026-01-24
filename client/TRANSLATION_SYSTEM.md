# Dynamic Translation System

This project now uses a dynamic, on-the-fly translation system that automatically translates text using translation APIs in real-time.

## Key Features

- ✅ **No Translation Files Required** - Translations happen automatically
- ✅ **20+ Supported Languages** - Out of the box support
- ✅ **Smart Caching** - Translations cached in localStorage for performance
- ✅ **Rate Limit Handling** - Automatic rate limit detection and management
- ✅ **Fallback Support** - Falls back to original text if translation fails
- ✅ **React Integration** - Easy-to-use hooks and components

## Quick Start

### 1. Using TranslatedText Component (Recommended)

```jsx
import TranslatedText from '../components/TranslatedText';

function MyComponent() {
  return (
    <div>
      <TranslatedText text="Create Account" />
      <TranslatedText text="Welcome to UrutiIQ" as="h1" className="text-2xl" />
      <TranslatedText text="Save Changes" as="button" />
    </div>
  );
}
```

### 2. Using useTranslation Hook

```jsx
import { useTranslation } from '../hooks/useTranslation';

function MyComponent() {
  const { t, tSync, language, setLanguage } = useTranslation();
  
  // For cached translations (synchronous)
  const buttonText = tSync("Save Changes");
  
  // For async translations
  useEffect(() => {
    t("Create Account").then(translated => {
      setTranslatedText(translated);
    });
  }, [language]);

  return (
    <div>
      <button>{buttonText}</button>
      <button onClick={() => setLanguage('fr')}>Switch to French</button>
    </div>
  );
}
```

### 3. Language Switcher

The `LanguageSwitcher` component is already integrated in the top navigation and provides:
- Current language display
- Dropdown to select language
- Automatic re-translation of all components

## Supported Languages

The system supports 20+ languages including:
- English (en)
- French (fr) - Default
- Kiswahili (sw)
- Spanish (es)
- Portuguese (pt)
- Arabic (ar)
- Chinese (zh)
- German (de)
- Italian (it)
- And many more...

## How It Works

1. **Text Input**: Component requests translation for text
2. **Cache Check**: System checks localStorage cache first
3. **API Call**: If not cached, calls MyMemory Translation API
4. **Cache Storage**: Valid translations stored in localStorage
5. **Return**: Returns translated text (or original if failed)

## Migration from Old System

The old react-i18next system has been replaced. To migrate existing code:

### Before (Old System)
```jsx
import { useTranslation } from 'react-i18next';

const { t } = useTranslation('namespace');
<button>{t('buttons.save')}</button>
```

### After (New System)
```jsx
import TranslatedText from '../components/TranslatedText';

<button><TranslatedText text="Save" /></button>
```

## Best Practices

### ✅ DO
- Use `TranslatedText` component for static text
- Use `tSync` for cached translations in render methods
- Use `t` (async) for dynamic translations in effects/handlers
- Provide fallback text for important translations

### ❌ DON'T
- Don't translate user-generated content
- Don't translate URLs or code
- Don't translate numbers or dates (format them instead)
- Don't make unnecessary API calls

## Demo

Visit `/translation-demo` to see the translation system in action and test different languages.

## Configuration

The system is configured in `App.jsx` with French as the default language:

```jsx
<I18nProvider defaultLanguage="fr">
  {/* Your app */}
</I18nProvider>
```

## Troubleshooting

### Translations Not Working
1. Check if app is wrapped in `I18nProvider`
2. Verify language is set correctly
3. Clear cache if translations seem stale
4. Check rate limit status

### Clear Cache
```javascript
// In browser console
localStorage.removeItem('translation_cache');
localStorage.removeItem('translation_rate_limit');
```

### Debug Mode
```javascript
// Enable debug logging
localStorage.setItem('translation_debug', 'true');
```

## API Information

- **Default API**: MyMemory Translation API (Free)
- **Rate Limit**: ~100 requests/day (free tier)
- **Fallback**: Returns original text if translation fails
- **Cache**: Persistent localStorage cache for performance