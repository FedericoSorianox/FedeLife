// Función helper para llamadas a la API del backend
export const apiFetch = (endpoint: string, options?: RequestInit) => {
  const baseUrl = process.env.NODE_ENV === 'production'
    ? '' // En producción usar rutas relativas
    : 'http://localhost:3003'; // Puerto del servidor backend

  // Preparar headers con token de autenticación si está disponible
  const headers = new Headers(options?.headers);

  // Agregar token JWT del localStorage si existe (soporte para sistema legacy)
  if (typeof window !== 'undefined') {
    const authData = localStorage.getItem('auth_data');
    const devToken = localStorage.getItem('dev_auth_token');

    let token = null;
    if (devToken) {
      token = devToken;
    } else if (authData) {
      try {
        const parsed = JSON.parse(authData);
        token = parsed.token;
      } catch (error) {
        console.error('Error parseando auth_data:', error);
      }
    }

    if (token && !headers.has('Authorization')) {
      headers.set('Authorization', `Bearer ${token}`);
    }
  }

  // Si no se especificó Content-Type y es un objeto RequestInit con body, agregarlo
  if (!headers.has('Content-Type') && options?.body && typeof options.body === 'string') {
    headers.set('Content-Type', 'application/json');
  }

  return fetch(`${baseUrl}${endpoint}`, {
    ...options,
    headers
  });
};

// Función para formatear monedas
export const formatCurrency = (amount: number, currency: string = 'UYU'): string => {
  const formatter = new Intl.NumberFormat('es-UY', {
    style: 'currency',
    currency: currency === 'USD' ? 'USD' : 'UYU',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0, // Sin decimales
  });

  return formatter.format(amount);
};

// Función para formatear fechas
export const formatDate = (date: string | Date): string => {
  const dateObj = typeof date === 'string' ? new Date(date) : date;

  if (isNaN(dateObj.getTime())) {
    return 'Fecha inválida';
  }

  return new Intl.DateTimeFormat('es-UY', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(dateObj);
};