/**
 * ⚙️ CONFIGURACIÓN SIMPLIFICADA - FEDE LIFE
 * 
 * Configuración básica para evitar errores de importación
 * Autor: Senior Full Stack Developer
 */

// ==================== CONFIGURACIÓN BÁSICA ====================

const config = {
    // Detectar ambiente automáticamente
    isDevelopment: typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'),
    isProduction: typeof window !== 'undefined' && window.location.hostname === 'fedelife-finanzas.onrender.com',
    
    // URLs de la API según ambiente
    apiUrl: (() => {
        if (typeof window === 'undefined') return 'http://localhost:3000/api';
        
        if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
            return 'http://localhost:3000/api';
        } else if (window.location.hostname === 'fedelife-finanzas.onrender.com') {
            return 'https://fedelife-finanzas.onrender.com/api';
        } else {
            return `${window.location.protocol}//${window.location.hostname}/api`;
        }
    })(),
    
    // Configuración de la aplicación
    app: {
        name: 'Fede Life',
        version: '1.0.0',
        currency: 'UYU',
        language: 'es'
    }
};

// ==================== FUNCIONES DE UTILIDAD ====================

/**
 * Obtiene la URL completa de un endpoint
 * @param {string} endpoint - Endpoint de la API
 * @returns {string} URL completa
 */
function getApiUrl(endpoint) {
    return `${config.apiUrl}${endpoint}`;
}

/**
 * Obtiene la API key de Google AI
 * @returns {string} API key
 */
function getApiKey() {
    return 'tu-api-key-de-google-ai-studio';
}

// ==================== EXPORTAR CONFIGURACIÓN ====================

// Exportar para módulos ES6 (import/export)
export {
    config,
    getApiUrl,
    getApiKey
};

// Exportar variables específicas que necesita finanzas.ts
export const GOOGLE_AI_API_KEY = 'tu-api-key-de-google-ai-studio';

// Hacer disponible globalmente
if (typeof window !== 'undefined') {
    window.config = config;
    window.getApiUrl = getApiUrl;
    window.getApiKey = getApiKey;
    window.GOOGLE_AI_API_KEY = GOOGLE_AI_API_KEY;
}

// Para módulos CommonJS
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        config,
        getApiUrl,
        getApiKey,
        GOOGLE_AI_API_KEY
    };
}
