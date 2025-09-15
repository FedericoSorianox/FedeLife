/**
 * ⚙️ CONFIG SIMPLE - CONFIGURACIÓN SIMPLIFICADA PARA PRODUCCIÓN
 * 
 * Archivo de configuración simplificado que funciona en producción
 * Incluye solo las configuraciones esenciales
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
 * NOTA: Las API Keys se configuran únicamente en el servidor
 */
export function getApiKey() {

    // Las API Keys se manejan únicamente en el servidor
    // Este archivo no debe contener keys de API
    return null;
}

// ==================== INICIALIZACIÓN ====================

// Agregar configuración global al objeto window
if (typeof window !== 'undefined') {
    window.config = GLOBAL_CONFIG;
}

// Exportar todo como objeto por defecto para compatibilidad
export default {
    GLOBAL_CONFIG,
    isDevelopment,
    getApiKey
};
