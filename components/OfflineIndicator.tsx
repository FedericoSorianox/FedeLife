'use client';

import { useState, useEffect } from 'react';

export default function OfflineIndicator() {
  const [isOnline, setIsOnline] = useState(true);
  const [showIndicator, setShowIndicator] = useState(false);

  useEffect(() => {
    // Función para actualizar el estado de conexión
    const updateOnlineStatus = () => {
      const online = navigator.onLine;
      setIsOnline(online);
      setShowIndicator(true);

      // Ocultar el indicador después de 3 segundos si está online
      if (online) {
        setTimeout(() => setShowIndicator(false), 3000);
      }
    };

    // Verificar estado inicial
    updateOnlineStatus();

    // Escuchar cambios en el estado de conexión
    window.addEventListener('online', updateOnlineStatus);
    window.addEventListener('offline', updateOnlineStatus);

    return () => {
      window.removeEventListener('online', updateOnlineStatus);
      window.removeEventListener('offline', updateOnlineStatus);
    };
  }, []);

  if (!showIndicator) return null;

  return (
    <div
      id="offline-indicator"
      className={isOnline ? 'online' : ''}
      style={{
        display: showIndicator ? 'block' : 'none',
        backgroundColor: isOnline ? '#16a34a' : '#dc2626'
      }}
    >
      {isOnline ? (
        <>
          <span className="inline-block mr-2">📶</span>
          Conexión restaurada
        </>
      ) : (
        <>
          <span className="inline-block mr-2">📵</span>
          Sin conexión a internet - Modo offline activado
        </>
      )}
    </div>
  );
}
