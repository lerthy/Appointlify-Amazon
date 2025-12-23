import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    proxy: {
      '/api': {
        target: 'http://localhost:5001',
        changeOrigin: true,
      },
      '/.well-known/appspecific/com.chrome.devtools.json': {
        target: 'http://localhost:5001',
        changeOrigin: true,
      },
      '/.netlify/functions/chat': {
        target: 'http://localhost:5001',
        changeOrigin: true,
        rewrite: (p) => p.replace('/.netlify/functions/chat', '/api/chat'),
      },
      '/.netlify/functions/book-appointment': {
        target: 'http://localhost:5001',
        changeOrigin: true,
        rewrite: (p) => p.replace('/.netlify/functions/book-appointment', '/api/book-appointment'),
      },
      '/.netlify/functions/send-sms': {
        target: 'http://localhost:5001',
        changeOrigin: true,
        rewrite: (p) => p.replace('/.netlify/functions/send-sms', '/api/send-sms'),
      },
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom', 'react-router-dom'],
        },
      },
    },
  },
  resolve: {
    dedupe: ['react', 'react-dom'],
  },
});






