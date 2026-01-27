import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');

  return {
    plugins: [react()],
    server: {
      port: 3000,
      host: '127.0.0.1', // Force IPv4 to avoid connection issues
      strictPort: false, // Allow Vite to find an available port if 3000 is in use
      proxy: {
        '/api': {
          target: env.VITE_API_URL?.replace('/api', '') || 'http://127.0.0.1:5000',
          changeOrigin: true,
          secure: false,
        },
      },
    },
    build: {
      outDir: 'dist',
      sourcemap: true,
    },
  }
}) 