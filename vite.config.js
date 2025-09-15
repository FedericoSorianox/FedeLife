import { defineConfig } from 'vite'

export default defineConfig({
  server: {
    port: 5173,
    open: '/pages/finanzas.html',
    host: 'localhost',
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
        secure: false,
        configure: (proxy, options) => {
          proxy.on('error', (err, req, res) => {
            console.log('🚨 Proxy error:', err);
          });
          proxy.on('proxyReq', (proxyReq, req, res) => {
            console.log('🔄 Proxy request:', req.method, req.url);
          });
          proxy.on('proxyRes', (proxyRes, req, res) => {
            console.log('✅ Proxy response:', proxyRes.statusCode, req.url);
          });
        }
      }
    }
  },

  build: {
    outDir: 'dist',
    emptyOutDir: true,
    rollupOptions: {
      input: {
        index: 'pages/Index.html',
        finanzas: 'pages/finanzas.html',
        tareas: 'pages/tareas.html',
        bruce: 'pages/bruce.html'
      }
    }
  },

  resolve: {
    alias: {
      '@funciones': '/funciones'
    }
  },

  esbuild: {
    target: 'es2020'
  },

  publicDir: false
})
