// components/NetworkStatusIndicator.tsx
// Componente para mostrar el estado de la conexión de red
// Muestra indicadores visuales cuando hay problemas de conexión

import React, { useState, useEffect } from 'react';
import { NetworkErrorHandler } from '@/lib/utils';

/**
 * Estados posibles de la conexión de red
 */
type NetworkStatus = 'online' | 'offline' | 'slow' | 'error';

/**
 * Props del componente NetworkStatusIndicator
 */
interface NetworkStatusIndicatorProps {
  className?: string;
  showDetails?: boolean;
  onStatusChange?: (status: NetworkStatus) => void;
}

/**
 * Componente indicador de estado de red
 * Muestra el estado actual de la conexión y permite detectar problemas
 */
export const NetworkStatusIndicator: React.FC<NetworkStatusIndicatorProps> = ({
  className = '',
  showDetails = false,
  onStatusChange
}) => {
  const [status, setStatus] = useState<NetworkStatus>('online');
  const [isVisible, setIsVisible] = useState(false);
  const [lastError, setLastError] = useState<string>('');

  /**
   * Detecta el estado de la conexión usando eventos del navegador
   */
  useEffect(() => {
    const updateOnlineStatus = () => {
      if (navigator.onLine) {
        setStatus('online');
        setIsVisible(false);
        setLastError('');
        onStatusChange?.('online');
      } else {
        setStatus('offline');
        setIsVisible(true);
        setLastError('Sin conexión a internet');
        onStatusChange?.('offline');
      }
    };

    // Estado inicial
    updateOnlineStatus();

    // Escuchar cambios de conexión
    window.addEventListener('online', updateOnlineStatus);
    window.addEventListener('offline', updateOnlineStatus);

    return () => {
      window.removeEventListener('online', updateOnlineStatus);
      window.removeEventListener('offline', updateOnlineStatus);
    };
  }, [onStatusChange]);

  /**
   * Función para probar la conectividad con servicios externos
   */
  const testConnectivity = async () => {
    try {
      setStatus('online');
      setLastError('');

      // Probar conectividad con un servicio rápido
      await NetworkErrorHandler.withRetry(
        async () => {
          const response = await fetch('https://httpbin.org/status/200', {
            method: 'HEAD',
            cache: 'no-cache'
          });

          if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
          }
        },
        {
          timeout: 5000,
          maxRetries: 1,
          context: 'Connectivity test'
        }
      );

    } catch (error) {
      setStatus('error');
      setLastError(error instanceof Error ? error.message : 'Error de conexión');
      setIsVisible(true);
      onStatusChange?.('error');
    }
  };

  /**
   * Ejecutar prueba de conectividad periódicamente
   */
  useEffect(() => {
    if (status === 'online') {
      const interval = setInterval(testConnectivity, 30000); // Cada 30 segundos
      return () => clearInterval(interval);
    }
  }, [status]);

  /**
   * Función para cerrar el indicador
   */
  const dismissIndicator = () => {
    setIsVisible(false);
  };

  /**
   * Obtener estilos CSS según el estado
   */
  const getStatusStyles = () => {
    const baseStyles = 'fixed top-4 right-4 z-50 px-4 py-2 rounded-lg shadow-lg transition-all duration-300';

    switch (status) {
      case 'online':
        return `${baseStyles} bg-green-500 text-white`;
      case 'offline':
        return `${baseStyles} bg-red-500 text-white`;
      case 'slow':
        return `${baseStyles} bg-yellow-500 text-white`;
      case 'error':
        return `${baseStyles} bg-orange-500 text-white`;
      default:
        return `${baseStyles} bg-gray-500 text-white`;
    }
  };

  /**
   * Obtener ícono según el estado
   */
  const getStatusIcon = () => {
    switch (status) {
      case 'online':
        return '🟢';
      case 'offline':
        return '🔴';
      case 'slow':
        return '🟡';
      case 'error':
        return '🟠';
      default:
        return '⚪';
    }
  };

  /**
   * Obtener mensaje según el estado
   */
  const getStatusMessage = () => {
    switch (status) {
      case 'online':
        return 'Conexión normal';
      case 'offline':
        return 'Sin conexión';
      case 'slow':
        return 'Conexión lenta';
      case 'error':
        return 'Error de conexión';
      default:
        return 'Estado desconocido';
    }
  };

  if (!isVisible) {
    return null;
  }

  return (
    <div className={getStatusStyles()}>
      <div className="flex items-center space-x-2">
        <span className="text-lg">{getStatusIcon()}</span>
        <div className="flex-1">
          <div className="font-medium">{getStatusMessage()}</div>
          {showDetails && lastError && (
            <div className="text-sm opacity-90 mt-1">{lastError}</div>
          )}
        </div>
        <button
          onClick={dismissIndicator}
          className="text-white hover:text-gray-200 ml-2"
          aria-label="Cerrar indicador"
        >
          ✕
        </button>
      </div>

      {status === 'error' && (
        <div className="mt-2 pt-2 border-t border-white border-opacity-20">
          <button
            onClick={testConnectivity}
            className="text-sm underline hover:no-underline"
          >
            Reintentar conexión
          </button>
        </div>
      )}
    </div>
  );
};

export default NetworkStatusIndicator;
