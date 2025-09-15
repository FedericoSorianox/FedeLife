/**
 * ⚙️ CONFIG - CONFIGURACIONES DEL SISTEMA
 * 
 * Archivo compilado de TypeScript a JavaScript
 * Incluye API Keys, configuraciones por defecto y constantes del sistema
 * Autor: Senior Backend Developer
 */

// ==================== API KEYS ====================

/**
 * Configuración de OpenAI (solo se usa en el servidor)
 * La API Key se configura en config-local.js o variables de entorno
 */

// ==================== CONFIGURACIONES DE IA ====================

/**
 * Configuración por defecto para OpenAI
 */
export const DEFAULT_AI_CONFIG = {
    model: 'gpt-4o-mini',
    maxTokens: 2000,
    temperature: 0.1,
    baseUrl: 'https://api.openai.com/v1/chat/completions'
};

// ==================== CONFIGURACIONES DEL SISTEMA ====================

/**
 * Configuraciones generales del sistema de finanzas
 */
export const SYSTEM_CONFIG = {
    // Paginación
    defaultPageSize: 20,
    maxPageSize: 100,
    
    // Moneda
    defaultCurrency: 'ARS',
    currencyLocale: 'es-AR',
    
    // Fechas
    dateFormat: 'es-AR',
    
    // Almacenamiento
    storagePrefix: 'fede_life_',
    
    // Notificaciones
    notificationTimeout: 5000, // 5 segundos
    
    // Chat
    maxMessageLength: 500,
    typingIndicatorDelay: 1000 // 1 segundo
};

// ==================== CATEGORÍAS POR DEFECTO ====================

/**
 * Categorías iniciales del sistema
 */
export const DEFAULT_CATEGORIES = [
    // Ingresos
    { name: 'Salario', type: 'income', color: '#27ae60' },
    { name: 'Freelance', type: 'income', color: '#2ecc71' },
    { name: 'Inversiones', type: 'income', color: '#16a085' },
    { name: 'Otros Ingresos', type: 'income', color: '#1abc9c' },
    
    // Gastos
    { name: 'Alimentación', type: 'expense', color: '#e74c3c' },
    { name: 'Transporte', type: 'expense', color: '#f39c12' },
    { name: 'Vivienda', type: 'expense', color: '#e67e22' },
    { name: 'Servicios', type: 'expense', color: '#d35400' },
    { name: 'Entretenimiento', type: 'expense', color: '#9b59b6' },
    { name: 'Salud', type: 'expense', color: '#3498db' },
    { name: 'Educación', type: 'expense', color: '#2980b9' },
    { name: 'Ropa', type: 'expense', color: '#8e44ad' },
    { name: 'Otros Gastos', type: 'expense', color: '#95a5a6' }
];

// ==================== CONFIGURACIONES DE DESARROLLO ====================

/**
 * Configuraciones específicas para desarrollo
 */
export const DEV_CONFIG = {
    // Logging
    enableDebugLogs: true,
    logLevel: 'info',
    
    // Simulación
    simulateApiDelays: false,
    mockDataEnabled: false
};

// ==================== FUNCIONES DE UTILIDAD ====================

/**
 * Verifica si estamos en modo desarrollo
 */
export function isDevelopment() {
    return process && process.env && process.env.NODE_ENV === 'development' || 
           window.location.hostname === 'localhost' ||
           window.location.hostname === '127.0.0.1';
}

/**
 * Obtiene la configuración de logging según el entorno
 */
export function getLogLevel() {
    return isDevelopment() ? DEV_CONFIG.logLevel : 'warn';
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

// ==================== CONFIGURACIÓN GLOBAL ====================

/**
 * Configuración global del sistema
 */
export const GLOBAL_CONFIG = {
    apiUrl: window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' 
        ? 'http://localhost:3000/api' 
        : 'https://fedelife-finanzas.onrender.com/api',
    environment: isDevelopment() ? 'development' : 'production',
    version: '1.0.0',
    buildDate: new Date().toISOString()
};

// Agregar configuración global al objeto window
if (typeof window !== 'undefined') {
    window.config = GLOBAL_CONFIG;
}

// Exportar todo como objeto por defecto para compatibilidad
export default {
    DEFAULT_AI_CONFIG,
    SYSTEM_CONFIG,
    DEFAULT_CATEGORIES,
    DEV_CONFIG,
    GLOBAL_CONFIG,
    isDevelopment,
    getLogLevel,
    getApiKey
};
