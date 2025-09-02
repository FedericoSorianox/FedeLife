/**
 * ⚙️ CONFIG PRODUCTION - CONFIGURACIÓN OPTIMIZADA PARA PRODUCCIÓN
 * 
 * Archivo de configuración específico para producción que maneja
 * errores de conexión y fallbacks de manera robusta
 * Autor: Senior Backend Developer
 */

// ==================== CONFIGURACIÓN DE PRODUCCIÓN ====================

/**
 * Configuración global del sistema optimizada para producción
 */
export const PRODUCTION_CONFIG = {
    // URLs de la API con fallbacks
    apiUrl: (() => {
        // Detectar ambiente automáticamente
        const hostname = window.location.hostname;
        
        if (hostname === 'localhost' || hostname === '127.0.0.1') {
            return 'http://localhost:3000/api';
        } else if (hostname.includes('fedelife-finanzas.onrender.com')) {
            return 'https://fedelife-finanzas.onrender.com/api';
        } else if (hostname.includes('fedelife')) {
            return `https://${hostname}/api`;
        } else {
            // Fallback genérico
            return `${window.location.protocol}//${hostname}/api`;
        }
    })(),
    
    // Configuración del ambiente
    environment: (() => {
        const hostname = window.location.hostname;
        return (hostname === 'localhost' || hostname === '127.0.0.1') ? 'development' : 'production';
    })(),
    
    // Versión y metadatos
    version: '1.0.0',
    buildDate: new Date().toISOString(),
    
    // Configuración de reintentos
    retryConfig: {
        maxRetries: 3,
        retryDelay: 1000, // 1 segundo
        backoffMultiplier: 2
    },
    
    // Configuración de timeout
    timeoutConfig: {
        requestTimeout: 10000, // 10 segundos
        connectionTimeout: 5000 // 5 segundos
    }
};

// ==================== FUNCIONES DE UTILIDAD ====================

/**
 * Verifica si estamos en modo desarrollo
 */
export function isDevelopment() {
    return PRODUCTION_CONFIG.environment === 'development';
}

/**
 * Verifica si la API está disponible
 */
export async function checkApiHealth() {
    try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), PRODUCTION_CONFIG.timeoutConfig.connectionTimeout);
        
        const response = await fetch(`${PRODUCTION_CONFIG.apiUrl}/health`, {
            method: 'GET',
            signal: controller.signal,
            headers: {
                'Content-Type': 'application/json'
            }
        });
        
        clearTimeout(timeoutId);
        return response.ok;
    } catch (error) {
        console.warn('⚠️ API no disponible:', error.message);
        return false;
    }
}

/**
 * Realiza una petición HTTP con reintentos automáticos
 */
export async function apiRequest(endpoint, options = {}, retryCount = 0) {
    try {
        const url = `${PRODUCTION_CONFIG.apiUrl}${endpoint}`;
        
        // Configuración por defecto
        const defaultOptions = {
            headers: {
                'Content-Type': 'application/json',
                ...options.headers
            },
            ...options
        };
        
        // Agregar token de autenticación si existe
        try {
            const authData = localStorage.getItem('auth_data');
            if (authData) {
                const parsed = JSON.parse(authData);
                if (parsed.token) {
                    defaultOptions.headers.Authorization = `Bearer ${parsed.token}`;
                }
            }
        } catch (error) {
            console.warn('⚠️ No se pudo obtener token de autenticación:', error);
        }
        
        // Realizar petición con timeout
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), PRODUCTION_CONFIG.timeoutConfig.requestTimeout);
        
        const response = await fetch(url, {
            ...defaultOptions,
            signal: controller.signal
        });
        
        clearTimeout(timeoutId);
        
        // Verificar respuesta
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        return await response.json();
        
    } catch (error) {
        // Manejar reintentos
        if (retryCount < PRODUCTION_CONFIG.retryConfig.maxRetries && 
            (error.name === 'AbortError' || error.message.includes('fetch'))) {
            
            const delay = PRODUCTION_CONFIG.retryConfig.retryDelay * 
                         Math.pow(PRODUCTION_CONFIG.retryConfig.backoffMultiplier, retryCount);
            
            console.log(`🔄 Reintentando en ${delay}ms... (${retryCount + 1}/${PRODUCTION_CONFIG.retryConfig.maxRetries})`);
            
            await new Promise(resolve => setTimeout(resolve, delay));
            return apiRequest(endpoint, options, retryCount + 1);
        }
        
        throw error;
    }
}

/**
 * Verifica la conectividad general
 */
export async function checkConnectivity() {
    try {
        // Verificar conexión a internet
        const internetCheck = await fetch('https://www.google.com/favicon.ico', {
            method: 'HEAD',
            mode: 'no-cors'
        });
        
        // Verificar API
        const apiCheck = await checkApiHealth();
        
        return {
            internet: true,
            api: apiCheck,
            timestamp: new Date().toISOString()
        };
    } catch (error) {
        return {
            internet: false,
            api: false,
            error: error.message,
            timestamp: new Date().toISOString()
        };
    }
}

// ==================== INICIALIZACIÓN ====================

// Agregar configuración global al objeto window
if (typeof window !== 'undefined') {
    window.config = PRODUCTION_CONFIG;
    window.checkApiHealth = checkApiHealth;
    window.apiRequest = apiRequest;
    window.checkConnectivity = checkConnectivity;
}

// Exportar todo como objeto por defecto para compatibilidad
export default {
    PRODUCTION_CONFIG,
    isDevelopment,
    checkApiHealth,
    apiRequest,
    checkConnectivity
};
