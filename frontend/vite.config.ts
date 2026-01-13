import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    proxy: {
      '/api': {
        // Backend runs on port 3001 (from PORT env) or 5000 (default)
        // Update this if your backend runs on a different port
        target: process.env.VITE_API_URL || 'http://localhost:3001',
        changeOrigin: true,
        secure: false,
        ws: true,
        configure: (proxy, _options) => {
          proxy.on('error', (err, _req, _res) => {
            console.log('proxy error', err);
          });
          proxy.on('proxyReq', (proxyReq, req, _res) => {
            console.log('Proxying request:', req.method, req.url, 'to', proxyReq.path);
          });
        },
      },
      '/.well-known/appspecific/com.chrome.devtools.json': {
        target: process.env.VITE_API_URL || 'http://localhost:3001',
        changeOrigin: true,
      },
      '/.netlify/functions/chat': {
        target: process.env.VITE_API_URL || 'http://localhost:3001',
        changeOrigin: true,
        rewrite: (p) => p.replace('/.netlify/functions/chat', '/api/chat'),
      },
      '/.netlify/functions/book-appointment': {
        target: process.env.VITE_API_URL || 'http://localhost:3001',
        changeOrigin: true,
        rewrite: (p) => p.replace('/.netlify/functions/book-appointment', '/api/book-appointment'),
      },
      '/.netlify/functions/send-sms': {
        target: process.env.VITE_API_URL || 'http://localhost:3001',
        changeOrigin: true,
        rewrite: (p) => p.replace('/.netlify/functions/send-sms', '/api/send-sms'),
      },
      '/.netlify/functions/confirm-appointment': {
        target: process.env.VITE_API_URL || 'http://localhost:3001',
        changeOrigin: true,
        rewrite: (p) => p.replace('/.netlify/functions/confirm-appointment', '/api/confirm-appointment'),
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






