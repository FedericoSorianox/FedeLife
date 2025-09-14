import { defineConfig } from 'vite'

export default defineConfig({
  server: {
    port: 5173,
    open: '/pages/finanzas.html',
    host: 'localhost'
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
