import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  root: 'web',
  publicDir: 'public',
  build: {
    outDir: 'dist',
    emptyOutDir: true,
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, 'web/src'),
      '@components': resolve(__dirname, 'web/src/components'),
      '@pages': resolve(__dirname, 'web/src/pages'),
      '@hooks': resolve(__dirname, 'web/src/hooks'),
      '@api': resolve(__dirname, 'web/src/api'),
      '@types': resolve(__dirname, 'web/src/types'),
    }
  },
  server: {
    port: 3000,
    host: true,
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
        secure: false
      }
    }
  }
}) 