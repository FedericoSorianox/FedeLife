/**
 * ⚙️ CONFIG PRODUCCIÓN - CONFIGURACIÓN PARA PRODUCCIÓN CON MODO SIN AUTH
 * 
 * Archivo de configuración para producción que permite modo sin autenticación
 * para transacciones básicas y análisis de PDFs
 * Autor: Senior Backend Developer
 */

// ==================== API KEYS ====================

/**
 * Configuración de OpenAI (solo se usa en el servidor)
 * La API Key se configura en config-local.js o variables de entorno
 */

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
 * NOTA: Las API Keys se configuran únicamente en el servidor
 */
export function getApiKey() {

    // Las API Keys se manejan únicamente en el servidor
    // Este archivo no debe contener keys de API
    return null;
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
    GLOBAL_CONFIG,
    isDevelopment,
    getApiKey,
    requiresAuth,
    getRequestHeaders
};
