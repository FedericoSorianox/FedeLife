/**
 * ⚙️ CONFIGURACIÓN DEL FRONTEND - FEDE LIFE
 * 
 * Configuración centralizada para URLs de API y configuración del cliente
 * Autor: Senior Full Stack Developer
 */

// ==================== CONFIGURACIÓN DE AMBIENTES ====================

const config = {
    // Detectar ambiente automáticamente
    isDevelopment: window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1',
    isProduction: window.location.hostname === 'fedelife-finanzas.onrender.com',
    
    // URLs de la API según ambiente
    apiUrl: (() => {
        if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
            return 'http://localhost:3000/api';
        } else if (window.location.hostname === 'fedelife-finanzas.onrender.com') {
            return 'https://fedelife-finanzas.onrender.com/api';
        } else {
            // Fallback para otros dominios
            return `${window.location.protocol}//${window.location.hostname}/api`;
        }
    })(),
    
    // Configuración de la aplicación
    app: {
        name: 'Fede Life',
        version: '1.0.0',
        currency: 'UYU',
        language: 'es'
    },
    
    // Configuración de autenticación
    auth: {
        tokenKey: 'auth_data',
        autoLogin: true,
        sessionTimeout: 7 * 24 * 60 * 60 * 1000 // 7 días en milisegundos
    },
    
    // Configuración de notificaciones
    notifications: {
        duration: 3000,
        position: 'top-right'
    },
    
    // Configuración de almacenamiento
    storage: {
        prefix: 'fede_life_',
        encryption: false
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
 * Realiza una petición HTTP a la API
 * @param {string} endpoint - Endpoint de la API
 * @param {Object} options - Opciones de la petición
 * @returns {Promise} Respuesta de la API
 */
async function apiRequest(endpoint, options = {}) {
    const url = getApiUrl(endpoint);
    
    // Configuración por defecto
    const defaultOptions = {
        headers: {
            'Content-Type': 'application/json',
            ...options.headers
        },
        ...options
    };
    
    // Agregar token de autenticación si existe
    const authData = localStorage.getItem(config.auth.tokenKey);
    if (authData) {
        try {
            const parsed = JSON.parse(authData);
            if (parsed.token) {
                defaultOptions.headers.Authorization = `Bearer ${parsed.token}`;
            }
        } catch (error) {
            console.error('Error parsing auth data:', error);
        }
    }
    
    try {
        const response = await fetch(url, defaultOptions);
        
        // Manejar errores de red
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        return await response.json();
    } catch (error) {
        console.error('API request error:', error);
        throw error;
    }
}

/**
 * Verifica si la API está disponible
 * @returns {Promise<boolean>} true si la API está disponible
 */
async function checkApiHealth() {
    try {
        const response = await fetch(getApiUrl('/health'));
        return response.ok;
    } catch (error) {
        console.error('API health check failed:', error);
        return false;
    }
}

/**
 * Obtiene la configuración actual
 * @returns {Object} Configuración
 */
function getConfig() {
    return { ...config };
}

/**
 * Actualiza la configuración
 * @param {Object} newConfig - Nueva configuración
 */
function updateConfig(newConfig) {
    Object.assign(config, newConfig);
}

// ==================== EXPORTAR CONFIGURACIÓN ====================

// Hacer disponible globalmente
if (typeof window !== 'undefined') {
    window.config = config;
    window.getApiUrl = getApiUrl;
    window.apiRequest = apiRequest;
    window.checkApiHealth = checkApiHealth;
    window.getConfig = getConfig;
    window.updateConfig = updateConfig;
}

// Para módulos ES6
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        config,
        getApiUrl,
        apiRequest,
        checkApiHealth,
        getConfig,
        updateConfig
    };
}
