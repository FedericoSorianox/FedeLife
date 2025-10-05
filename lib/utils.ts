// Función helper para llamadas a la API del backend
export const apiFetch = (endpoint: string, options?: RequestInit) => {
  const baseUrl = process.env.NODE_ENV === 'production'
    ? '' // En producción usar rutas relativas
    : 'http://localhost:3003'; // Puerto del servidor backend
  return fetch(`${baseUrl}${endpoint}`, options);
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