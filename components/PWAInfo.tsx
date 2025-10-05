'use client';

import { useState, useEffect } from 'react';

export default function PWAInfo() {
  const [isStandalone, setIsStandalone] = useState(false);
  const [serviceWorkerStatus, setServiceWorkerStatus] = useState<'loading' | 'registered' | 'error'>('loading');
  const [isOnline, setIsOnline] = useState(true);

  useEffect(() => {
    // Verificar si está en modo standalone
    const standalone = window.matchMedia('(display-mode: standalone)').matches ||
                      (window.navigator as any).standalone === true;
    setIsStandalone(standalone);

    // Verificar estado del service worker
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.ready.then(() => {
        setServiceWorkerStatus('registered');
      }).catch(() => {
        setServiceWorkerStatus('error');
      });
    }

    // Verificar conexión
    setIsOnline(navigator.onLine);

    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const testNotification = () => {
    if ('Notification' in window) {
      Notification.requestPermission().then((permission) => {
        if (permission === 'granted') {
          new Notification('Fede Life PWA', {
            body: '¡Las notificaciones funcionan correctamente!',
            icon: '/icons/icon-192x192.png',
            badge: '/icons/icon-96x96.png'
          });
        }
      });
    }
  };

  const testOfflineCache = async () => {
    if ('caches' in window) {
      try {
        const cacheNames = await caches.keys();
        alert(`Caché disponible: ${cacheNames.length} cachés encontrados\n${cacheNames.join(', ')}`);
      } catch (error) {
        alert('Error accediendo al caché: ' + error);
      }
    } else {
      alert('Cache API no disponible en este navegador');
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
      <div className="flex items-center mb-4">
        <div className="p-2 bg-blue-100 rounded-lg mr-3">
          <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
          </svg>
        </div>
        <h3 className="text-lg font-semibold text-gray-900">Modo PWA</h3>
        {isStandalone && (
          <span className="ml-2 px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full">
            Instalado
          </span>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600">Estado de conexión:</span>
            <span className={`px-2 py-1 text-xs rounded-full ${isOnline ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
              {isOnline ? '🟢 Online' : '🔴 Offline'}
            </span>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600">Service Worker:</span>
            <span className={`px-2 py-1 text-xs rounded-full ${
              serviceWorkerStatus === 'registered' ? 'bg-green-100 text-green-800' :
              serviceWorkerStatus === 'error' ? 'bg-red-100 text-red-800' :
              'bg-yellow-100 text-yellow-800'
            }`}>
              {serviceWorkerStatus === 'registered' ? '✅ Registrado' :
               serviceWorkerStatus === 'error' ? '❌ Error' :
               '⏳ Cargando...'}
            </span>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600">Modo de visualización:</span>
            <span className="px-2 py-1 text-xs rounded-full bg-blue-100 text-blue-800">
              {isStandalone ? '📱 Standalone' : '🌐 Browser'}
            </span>
          </div>
        </div>

        <div className="space-y-2">
          <button
            onClick={testNotification}
            className="w-full px-3 py-2 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700 transition-colors"
          >
            🔔 Probar Notificaciones
          </button>

          <button
            onClick={testOfflineCache}
            className="w-full px-3 py-2 bg-green-600 text-white text-sm rounded-md hover:bg-green-700 transition-colors"
          >
            📦 Verificar Caché
          </button>

          <button
            onClick={() => window.location.reload()}
            className="w-full px-3 py-2 bg-gray-600 text-white text-sm rounded-md hover:bg-gray-700 transition-colors"
          >
            🔄 Recargar App
          </button>
        </div>
      </div>

      <div className="mt-4 p-3 bg-blue-50 rounded-md">
        <h4 className="text-sm font-medium text-blue-900 mb-1">💡 Consejos PWA:</h4>
        <ul className="text-xs text-blue-800 space-y-1">
          <li>• La app funciona offline una vez cargada</li>
          <li>• Se puede instalar como app nativa</li>
          <li>• Recibe notificaciones push (próximamente)</li>
          <li>• Optimizada para móviles y tablets</li>
        </ul>
      </div>
    </div>
  );
}
