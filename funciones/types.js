/**
 * 🏷️ TYPES - TIPOS Y INTERFACES DEL SISTEMA
 * 
 * Archivo compilado de TypeScript a JavaScript
 * Contiene todas las interfaces y tipos del sistema de finanzas
 * Autor: Senior Full Stack Developer
 */

// ==================== INTERFACES Y TIPOS ====================

/**
 * Interface para configuración de LLM (Google AI Studio)
 */
export const LLMConfig = {
    apiKey: '',
    model: 'gemini-1.5-flash',
    maxTokens: 2048,
    temperature: 0.3,
    baseUrl: 'https://generativelanguage.googleapis.com/v1beta/models',
    retries: 3,
    rateLimitPerMinute: 60
};

/**
 * Interface para respuesta de análisis de IA
 */
export const AnalysisResponse = {
    success: false,
    data: null,
    confidence: 0,
    error: null
};

/**
 * Tipo de análisis disponibles
 */
export const AnalysisType = {
    EXPENSE_EXTRACTION: 'expense-extraction',
    TEXT_CLASSIFICATION: 'text-classification',
    SENTIMENT_ANALYSIS: 'sentiment-analysis',
    DATA_VALIDATION: 'data-validation'
};

/**
 * Estado de procesamiento
 */
export const ProcessingStatus = {
    PENDING: 'pending',
    PROCESSING: 'processing',
    COMPLETED: 'completed',
    FAILED: 'failed',
    CANCELLED: 'cancelled'
};

/**
 * Niveles de logging
 */
export const LogLevel = {
    DEBUG: 'debug',
    INFO: 'info',
    WARN: 'warn',
    ERROR: 'error'
};

/**
 * Interface para logging estructurado
 */
export const LogEntry = {
    timestamp: new Date(),
    level: 'info',
    message: '',
    context: {},
    module: ''
};

// ==================== EXTENSIONES DE WINDOW ====================

/**
 * Interface para el objeto de configuración global
 */
export const ConfigObject = {
    apiUrl: '',
    environment: 'production'
};

/**
 * Interface para el sistema de autenticación
 */
export const AuthUI = {
    showLoginModal: function() {},
    showRegisterModal: function() {},
    hideModals: function() {},
    handleLogin: async function() {},
    handleRegister: async function() {},
    logout: function() {},
    isAuthenticated: function() { return false; },
    getUser: function() { return null; }
};

/**
 * Interface para la aplicación de finanzas
 */
export const FinanceApp = {
    storage: {
        syncAll: async function() {}
    },
    showNotification: function(message, type) {},
    editTransaction: function(id) {},
    deleteTransaction: function(id) {},
    editCategory: function(id) {},
    deleteCategory: function(id) {},
    editBudget: function(id) {},
    deleteBudget: function(id) {},
    updateGoalProgress: function(id) {},
    editGoal: function(id) {},
    deleteGoal: function(id) {}
};

/**
 * Extensión de la interface Window para incluir propiedades personalizadas
 * Esto permite que TypeScript reconozca las propiedades agregadas globalmente
 */
if (typeof window !== 'undefined') {
    // Agregar propiedades al objeto window si no existen
    if (!window.authUI) {
        window.authUI = AuthUI;
    }
    if (!window.financeApp) {
        window.financeApp = FinanceApp;
    }
    if (!window.config) {
        window.config = ConfigObject;
    }
}

// Exportar todo como objeto por defecto para compatibilidad
export default {
    LLMConfig,
    AnalysisResponse,
    AnalysisType,
    ProcessingStatus,
    LogLevel,
    LogEntry,
    ConfigObject,
    AuthUI,
    FinanceApp
};
