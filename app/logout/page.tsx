'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiFetch } from '@/lib/utils';

export default function LogoutPage() {
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const performLogout = async () => {
      try {
        // Limpiar datos locales primero
        localStorage.removeItem('auth_data');
        localStorage.removeItem('dev_auth_token');

        // Intentar hacer logout en el servidor
        await apiFetch('/api/auth/logout', {
          method: 'POST'
        });
      } catch (error) {
        console.error('Error en logout:', error);
        // Continuar con la limpieza local aunque falle el logout del servidor
      } finally {
        setIsLoading(false);
        // Redirigir al login después de un breve delay
        setTimeout(() => {
          router.push('/login');
        }, 1000);
      }
    };

    performLogout();
  }, [router]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-50 to-orange-100 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <div className="mx-auto h-16 w-16 bg-red-500 rounded-full flex items-center justify-center">
            <svg className="h-8 w-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
          </div>
          <h2 className="mt-6 text-3xl font-bold text-gray-900">
            Cerrando Sesión
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            {isLoading ? 'Cerrando sesión...' : 'Sesión cerrada exitosamente'}
          </p>

          {isLoading && (
            <div className="mt-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-500 mx-auto"></div>
            </div>
          )}

          {!isLoading && (
            <div className="mt-8">
              <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-md text-sm">
                <div className="flex items-center">
                  <svg className="h-5 w-5 text-green-400 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Redirigiendo al login...
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
