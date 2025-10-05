'use client';

import { useState } from 'react';
import PWAInfo from '@/components/PWAInfo';

export default function TestPage() {
  const [showToast, setShowToast] = useState(false);

  const handleShowToast = () => {
    setShowToast(true);
    setTimeout(() => setShowToast(false), 3000);
  };
  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            🧪 Página de Pruebas - Fede Life PWA
          </h1>
          <p className="text-gray-600">
            Pruebas de funcionalidad, estilos y características PWA
          </p>
        </div>

        {/* Información PWA */}
        <PWAInfo />

        {/* Pruebas de Tailwind CSS */}
        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">
            🎨 Pruebas de Tailwind CSS
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-blue-500 text-white p-4 rounded-lg text-center">
              Azul (bg-blue-500)
            </div>

            <div className="bg-red-500 text-white p-4 rounded-lg text-center">
              Rojo (bg-red-500)
            </div>

            <div className="bg-primary text-white p-4 rounded-lg text-center">
              Primario personalizado
            </div>
          </div>

          <div className="mt-4 space-y-2">
            <button className="bg-primary hover:bg-blue-600 text-white px-6 py-3 rounded-lg font-medium mr-2 transition-colors">
              Botón Primario
            </button>

            <button className="bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-lg font-medium mr-2 transition-colors">
              Botón Éxito
            </button>

            <button className="bg-red-600 hover:bg-red-700 text-white px-6 py-3 rounded-lg font-medium transition-colors">
              Botón Error
            </button>
          </div>
        </div>

        {/* Pruebas de responsividad */}
        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">
            📱 Pruebas de Responsividad
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-gray-100 p-4 rounded text-center">
              <span className="block sm:hidden">📱 XS</span>
              <span className="hidden sm:block lg:hidden">📱 SM</span>
              <span className="hidden lg:block xl:hidden">💻 MD</span>
              <span className="hidden xl:block">🖥️ LG</span>
            </div>

            <div className="bg-blue-100 p-4 rounded text-center">
              Columna 2
            </div>

            <div className="bg-green-100 p-4 rounded text-center">
              Columna 3
            </div>

            <div className="bg-yellow-100 p-4 rounded text-center">
              Columna 4
            </div>
          </div>
        </div>

        {/* Pruebas de animaciones PWA */}
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">
            ✨ Animaciones PWA
          </h2>

          <div className="space-y-4">
            <div className="flex items-center space-x-4">
              <div className="pwa-loading"></div>
              <span>Cargando...</span>
            </div>

          <button
            className="bg-primary text-white px-4 py-2 rounded hover:bg-blue-600 transition-colors"
            onClick={handleShowToast}
          >
            Mostrar Notificación Toast
          </button>
          </div>
        </div>

        {/* Toast notification */}
        {showToast && (
          <div className="toast success fixed top-4 right-4 z-50">
            ¡Prueba exitosa! 🎉
          </div>
        )}
      </div>
    </div>
  );
}
