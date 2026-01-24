/**
 * Application configuration
 * Centralized configuration management using environment variables
 */

// Detect if we're running on the remote server
const isRemoteServer = typeof window !== 'undefined' &&
  (window.location.hostname === '84.247.131.178' ||
    window.location.hostname.includes('84.247.131.178'));

const config = {
  // API Configuration
  api: {
    // Always use relative URL when:
    // 1. In production builds (works with Nginx proxy)
    // 2. Running on remote server (avoids CORS issues with localhost)
    // This ensures API calls go through Nginx proxy on the remote server
    baseURL: (import.meta.env.PROD || isRemoteServer)
      ? '/api'  // Production or remote server: always use relative URL
      : (import.meta.env.VITE_API_URL || 'http://localhost:5000/api'),  // Development: use env var or localhost
    timeout: 10000, // 10 seconds
  },

  // Environment
  env: {
    isDevelopment: import.meta.env.DEV,
    isProduction: import.meta.env.PROD,
    mode: import.meta.env.MODE || 'development',
  },

  // App Configuration
  app: {
    name: import.meta.env.VITE_APP_NAME || 'LikaBoutiques',
    version: import.meta.env.VITE_APP_VERSION || '1.0.0',
  },

  // Feature flags (optional)
  features: {
    enableAnalytics: import.meta.env.VITE_ENABLE_ANALYTICS === 'true',
    enableDebugMode: import.meta.env.VITE_DEBUG_MODE === 'true',
  }
}

// Log configuration in development or when on remote server
if (config.env.isDevelopment || isRemoteServer) {
  console.log('🔧 App Configuration:', {
    api: config.api.baseURL,
    environment: config.env.mode,
    isRemoteServer: isRemoteServer,
    hostname: typeof window !== 'undefined' ? window.location.hostname : 'N/A',
    app: config.app.name,
    version: config.app.version,
  })
}

export default config
