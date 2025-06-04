import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5180,
    host: true,
    open: true
  },
  optimizeDeps: {
    include: ['react', 'react-dom', 'lucide-react']
  },
  resolve: {
    extensions: ['.ts', '.tsx', '.js', '.jsx']
  }
})
