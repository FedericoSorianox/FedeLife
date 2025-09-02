/**
 * ⚙️ CONFIG SIMPLE - CONFIGURACIÓN SIMPLIFICADA PARA PRODUCCIÓN
 * 
 * Archivo de configuración simplificado que funciona en producción
 * Incluye solo las configuraciones esenciales
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
    buildDate: new Date().toISOString()
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

// ==================== INICIALIZACIÓN ====================

// Agregar configuración global al objeto window
if (typeof window !== 'undefined') {
    window.config = GLOBAL_CONFIG;
}

// Exportar todo como objeto por defecto para compatibilidad
export default {
    GOOGLE_AI_API_KEY,
    GLOBAL_CONFIG,
    isDevelopment,
    getApiKey
};
