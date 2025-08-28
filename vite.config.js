/**
 * 🔧 CONFIGURACIÓN DE VITE - FEDE LIFE
 * 
 * Configuración del servidor de desarrollo para servir
 * los archivos desde la raíz del proyecto
 */

import { defineConfig } from 'vite'

export default defineConfig({
  // Configuración del servidor de desarrollo
  server: {
    port: 5173,
    open: '/pages/finanzas.html', // Abrir automáticamente la página de finanzas
    host: 'localhost'
  },
  
  // Configuración de build para producción
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    rollupOptions: {
      input: {
        index: 'pages/Index.html',
        finanzas: 'pages/finanzas.html',
        ideas: 'pages/ideas.html',
        tareas: 'pages/tareas.html',
        bruce: 'pages/bruce.html'
      }
    }
  },
  
  // Configuración de resolución de rutas
  resolve: {
    alias: {
      '@funciones': '/funciones', // Alias para importar desde funciones/
    }
  },
  
  // Configuración para TypeScript
  esbuild: {
    target: 'es2020'
  },
  
  // Configuración de archivos públicos
  publicDir: false // No usar directorio public por defecto
})
