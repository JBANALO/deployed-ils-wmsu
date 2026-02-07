import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig(({ mode }) => {
  // Load env file based on `mode` in the current working directory.
  const env = loadEnv(mode, process.cwd(), '')
  
  return {
    plugins: [react()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      },
    },
    // Expose env variables to the client
    define: {
      'import.meta.env.VITE_API_URL': JSON.stringify(env.VITE_API_URL || '/api'),
    },
    server: {
      port: 5173,
      proxy: mode === 'development' ? {
        '/api': {
          target: 'http://localhost:5000',
          changeOrigin: true,
        }
      } : undefined
    }
  }
})