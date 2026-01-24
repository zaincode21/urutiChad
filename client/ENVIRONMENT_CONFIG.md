# Environment Configuration

This document explains how to configure the application for different environments.

## Environment Variables

### Required Variables

| Variable | Description | Default | Example |
|----------|-------------|---------|---------|
| `VITE_API_URL` | Backend API base URL | `/api` | `http://localhost:5000/api` |

### Optional Variables

| Variable | Description | Default | Example |
|----------|-------------|---------|---------|
| `VITE_NODE_ENV` | Environment mode | `development` | `production` |
| `VITE_APP_NAME` | Application name | `Smart Retail Platform` | `My Retail App` |
| `VITE_APP_VERSION` | Application version | `1.0.0` | `2.1.0` |
| `VITE_ENABLE_ANALYTICS` | Enable analytics | `false` | `true` |
| `VITE_DEBUG_MODE` | Enable debug mode | `false` | `true` |

## Environment Files

### Development (.env.development)
```env
VITE_API_URL=http://127.0.0.1:5000/api
VITE_NODE_ENV=development
VITE_DEBUG_MODE=true
```

### Production (.env.production)
```env
VITE_API_URL=https://your-domain.com/api
VITE_NODE_ENV=production
VITE_ENABLE_ANALYTICS=true
```

### Local Development (.env.local)
```env
# Override for local development
VITE_API_URL=http://localhost:5000/api
```

## Usage

1. **Copy the appropriate environment file:**
   ```bash
   cp .env.development .env
   ```

2. **Modify the values as needed:**
   ```bash
   # Edit .env file
   nano .env
   ```

3. **Restart the development server:**
   ```bash
   npm run dev
   ```

## Configuration in Code

The configuration is centralized in `src/lib/config.js`:

```javascript
import config from './lib/config'

// Access API URL
console.log(config.api.baseURL)

// Check environment
if (config.env.isDevelopment) {
  // Development-only code
}
```

## API Calls

All API calls use the centralized configuration:

```javascript
import { authAPI } from './lib/api'

// This will automatically use the configured base URL
const response = await authAPI.login(credentials)
```

## Troubleshooting

### Connection Issues
- Ensure the API URL is correct and accessible
- Check if the backend server is running
- Verify CORS settings on the backend

### Environment Variables Not Loading
- Ensure variable names start with `VITE_`
- Restart the development server after changes
- Check for typos in variable names

### Different Environments
- Use `.env.local` for local overrides
- Use `.env.production` for production builds
- Use `.env.development` for development builds
