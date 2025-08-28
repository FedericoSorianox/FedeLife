/**
 * 📝 TYPES - INTERFACES Y TIPOS COMPARTIDOS
 * 
 * Módulo de definiciones de tipos para reutilización entre módulos
 * Incluye interfaces para APIs, configuraciones y estructuras de datos
 * Autor: Senior Backend Developer
 */

/**
 * Interface para configuración de Google AI Studio (Gemini)
 * Configuración completa para conectar con la API de Google AI
 */
export interface LLMConfig {
    apiKey: string;           // API Key de Google AI Studio (gratuita)
    model: string;            // Modelo Gemini (gemini-1.5-flash, gemini-1.5-pro)
    maxTokens: number;        // Máximo de tokens en la respuesta
    temperature: number;      // Creatividad del modelo (0-1)
    baseUrl: string;          // URL base de la API de Google
}

/**
 * Respuesta estándar de análisis de IA
 */
export interface AnalysisResponse {
    success: boolean;         // Indica si el análisis fue exitoso
    data?: any;              // Datos analizados (estructura variable)
    error?: string;          // Mensaje de error si falló
    confidence: number;      // Nivel de confianza (0-1)
    timestamp?: Date;        // Marca de tiempo del análisis
}

/**
 * Configuración base para servicios de IA
 */
export interface AIServiceConfig {
    provider: 'google' | 'openai' | 'anthropic';  // Proveedor de IA
    timeout: number;                              // Timeout en milisegundos
    retries: number;                              // Número de reintentos
    rateLimitPerMinute: number;                   // Límite de solicitudes por minuto
}

/**
 * Tipo de análisis disponibles
 */
export type AnalysisType = 
    | 'expense-extraction'    // Extracción de gastos
    | 'text-classification'  // Clasificación de texto
    | 'sentiment-analysis'   // Análisis de sentimientos
    | 'data-validation';     // Validación de datos

/**
 * Estado de procesamiento
 */
export type ProcessingStatus = 
    | 'pending'     // Pendiente
    | 'processing'  // En proceso
    | 'completed'   // Completado
    | 'failed'      // Falló
    | 'cancelled';  // Cancelado

/**
 * Niveles de logging
 */
export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

/**
 * Interface para logging estructurado
 */
export interface LogEntry {
    timestamp: Date;
    level: LogLevel;
    message: string;
    context?: Record<string, any>;
    module?: string;
}
