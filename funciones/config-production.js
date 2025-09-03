/**
 * ⚙️ CONFIG PRODUCCIÓN - CONFIGURACIÓN PARA PRODUCCIÓN CON MODO SIN AUTH
 * 
 * Archivo de configuración para producción que permite modo sin autenticación
 * para transacciones básicas y análisis de PDFs
 * Autor: Senior Backend Developer
 */

// ==================== API KEYS ====================

/**
 * API Key de Google AI Studio (Gemini)
 * Clave gratuita para análisis de texto y chat con IA
 */
export const GOOGLE_AI_API_KEY = 'AIzaSyCSCVx7P1_nSmeWxPZAs9lKGKv_VdFeoJ8';

// ==================== CONFIGURACIÓN GLOBAL ====================

/**
 * Configuración global del sistema
 */
export const GLOBAL_CONFIG = {
    apiUrl: window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' 
        ? 'http://localhost:3000/api' 
        : 'https://fedelife-finanzas.onrender.com/api',
    environment: (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') ? 'development' : 'production',
    version: '1.0.0',
    buildDate: new Date().toISOString(),
    // Modo sin autenticación para funcionalidades básicas
    allowNoAuth: true,
    // Endpoints que no requieren autenticación
    noAuthEndpoints: [
        '/api/transactions/public',
        '/api/ai/analyze-pdf',
        '/api/categories/public'
    ]
};

// ==================== FUNCIONES DE UTILIDAD ====================

/**
 * Verifica si estamos en modo desarrollo
 */
export function isDevelopment() {
    return window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
}

/**
 * Obtiene la API Key según el entorno
 */
export function getApiKey() {
    // En desarrollo, usar la key por defecto
    if (isDevelopment()) {
        return GOOGLE_AI_API_KEY;
    }
    
    // En producción, intentar obtener del localStorage
    try {
        return localStorage.getItem('google_ai_key') || GOOGLE_AI_API_KEY;
    } catch (error) {
        console.warn('No se pudo acceder al localStorage:', error);
        return GOOGLE_AI_API_KEY;
    }
}

/**
 * Verifica si un endpoint requiere autenticación
 */
export function requiresAuth(endpoint) {
    return !GLOBAL_CONFIG.noAuthEndpoints.some(noAuthEndpoint => 
        endpoint.includes(noAuthEndpoint)
    );
}

/**
 * Obtiene headers para las peticiones HTTP
 */
export function getRequestHeaders(requireAuth = false) {
    const headers = {
        'Content-Type': 'application/json'
    };
    
    if (requireAuth) {
        const token = localStorage.getItem('auth_token');
        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }
    }
    
    return headers;
}

// ==================== INICIALIZACIÓN ====================

// Agregar configuración global al objeto window
if (typeof window !== 'undefined') {
    window.config = GLOBAL_CONFIG;
    window.configHelpers = {
        requiresAuth,
        getRequestHeaders
    };
}

// Exportar todo como objeto por defecto para compatibilidad
export default {
    GOOGLE_AI_API_KEY,
    GLOBAL_CONFIG,
    isDevelopment,
    getApiKey,
    requiresAuth,
    getRequestHeaders
};
