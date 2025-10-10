// Función helper para llamadas a la API del backend con manejo de errores mejorado
export const apiFetch = async (endpoint: string, options?: RequestInit & { timeout?: number }) => {
  const baseUrl = process.env.NODE_ENV === 'production'
    ? '' // En producción usar rutas relativas
    : 'http://localhost:3003'; // Puerto del servidor backend

  const url = `${baseUrl}${endpoint}`;

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

  // Usar safeFetch para manejar errores de conexión con reintentos
  return NetworkErrorHandler.withRetry(
    () => fetch(url, {
      ...options,
      headers
    }),
    {
      timeout: (options as RequestInit & { timeout?: number })?.timeout || 15000, // 15 segundos para API calls, customizable
      maxRetries: (options as RequestInit & { timeout?: number })?.timeout ? ((options as RequestInit & { timeout?: number })?.timeout ?? 0) > 30000 ? 1 : 2 : 2, // Más reintentos para llamadas largas
      context: `API call to ${endpoint}`
    }
  );
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

/**
 * Utilidad para manejar errores de conexión con reintentos y timeouts
 * Soluciona problemas como ETIMEDOUT en conexiones externas
 */
export class NetworkErrorHandler {
  private static readonly DEFAULT_TIMEOUT = 30000; // 30 segundos
  private static readonly MAX_RETRIES = 3;
  private static readonly RETRY_DELAY = 1000; // 1 segundo

  /**
   * Ejecuta una función con manejo de errores de red y reintentos
   */
  static async withRetry<T>(
    fn: () => Promise<T>,
    options: {
      timeout?: number;
      maxRetries?: number;
      retryDelay?: number;
      context?: string;
    } = {}
  ): Promise<T> {
    const {
      timeout = this.DEFAULT_TIMEOUT,
      maxRetries = this.MAX_RETRIES,
      retryDelay = this.RETRY_DELAY,
      context = 'Network operation'
    } = options;

    let lastError: Error;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        // Crear una promesa con timeout
        const timeoutPromise = new Promise<never>((_, reject) => {
          setTimeout(() => {
            reject(new Error(`Timeout: ${context} excedió ${timeout}ms`));
          }, timeout);
        });

        // Ejecutar la función o esperar el timeout
        const result = await Promise.race([
          fn(),
          timeoutPromise
        ]);

        return result;

      } catch (error) {
        lastError = error as Error;

        // Si es el último intento, lanzar el error
        if (attempt === maxRetries) {
          console.error(`❌ ${context} falló después de ${maxRetries + 1} intentos:`, lastError.message);
          throw new Error(`Network Error: ${context} - ${lastError.message}`);
        }

        // Esperar antes del siguiente intento
        if (retryDelay > 0) {
          console.warn(`⚠️ Intento ${attempt + 1}/${maxRetries + 1} falló para ${context}, reintentando en ${retryDelay}ms...`);
          await new Promise(resolve => setTimeout(resolve, retryDelay));
        }
      }
    }

    throw lastError!;
  }

  /**
   * Verifica si un error es un error de conexión recuperable
   */
  static isRetryableError(error: Error): boolean {
    const retryableErrors = [
      'ETIMEDOUT',
      'ECONNRESET',
      'ENOTFOUND',
      'ECONNREFUSED',
      'NetworkError',
      'Timeout',
      'fetch timeout'
    ];

    return retryableErrors.some(retryableError =>
      error.message.includes(retryableError)
    );
  }

  /**
   * Crea una configuración de fetch con timeout y manejo de errores mejorado
   */
  static createFetchConfig(timeout?: number) {
    return {
      timeout: timeout || this.DEFAULT_TIMEOUT,
      headers: {
        'Content-Type': 'application/json',
      },
      // Configuración adicional para mejorar la estabilidad de conexión
      agent: undefined, // Usar el agente por defecto del sistema
    };
  }
}

/**
 * Función helper para hacer peticiones HTTP con manejo de errores mejorado
 */
export async function safeFetch(
  url: string,
  options: RequestInit = {},
  context?: string
): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), NetworkErrorHandler['DEFAULT_TIMEOUT']);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    });

    clearTimeout(timeoutId);
    return response;

  } catch (error) {
    clearTimeout(timeoutId);

    if (error instanceof Error) {
      if (error.name === 'AbortError') {
        throw new Error(`Request timeout: ${context || url}`);
      }

      // Verificar si es un error de red recuperable
      if (NetworkErrorHandler.isRetryableError(error)) {
        throw new Error(`Network connection error: ${error.message}`);
      }
    }

    throw error;
  }
}