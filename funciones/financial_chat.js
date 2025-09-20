/**
 * 💬 FINANCIAL CHAT - ASISTENTE IA PARA CONSULTAS FINANCIERAS
 * 
 * Archivo compilado de TypeScript a JavaScript
 * Módulo para chat con IA usando Google AI Studio (Gemini)
 * Analiza datos financieros y proporciona consejos personalizados
 * Autor: Senior Backend Developer
 */

// ==================== CLASE PRINCIPAL ====================

/**
 * Clase para manejar el chat financiero con IA
 * Procesa consultas sobre datos financieros y proporciona respuestas inteligentes
 */
export class FinancialChat {
    constructor() {
        this.aiAnalyzer = null;
        this.apiKey = '';
        this.isInitialized = false;
        
        // Intentar obtener el analizador de IA si está disponible
        if (typeof window !== 'undefined' && window.googleAIAnalyzer) {
            this.aiAnalyzer = window.googleAIAnalyzer;
        }
    }

    /**
     * Inicializa el chat con la API Key de Google AI
     * @param {string} apiKey - Clave de la API de Google AI Studio
     */
    initialize(apiKey) {
        try {
            if (!apiKey || apiKey.trim() === '') {
                throw new Error('❌ API Key de Google AI es requerida para el chat');
            }

            this.apiKey = apiKey.trim();
            
            // Si no tenemos el analizador, crear uno nuevo
            if (!this.aiAnalyzer) {
                // Crear un analizador básico
                this.aiAnalyzer = {
                    setApiKey: (key) => { this.apiKey = key; },
                    analyzeText: async (prompt, systemPrompt) => {
                        // Implementación básica para cuando no hay analizador completo
                        return {
                            success: true,
                            data: 'Chat financiero no disponible en este momento. Por favor, inténtalo más tarde.',
                            confidence: 0.5
                        };
                    },
                    getConfig: () => ({ model: 'basic' })
                };
            } else {
                this.aiAnalyzer.setApiKey(this.apiKey);
            }
            
            this.isInitialized = true;

        } catch (error) {
            throw error;
        }
    }

    /**
     * Verifica si el chat está inicializado
     * @returns {boolean} true si está listo para usar
     */
    isReady() {
        return this.isInitialized && this.apiKey !== '';
    }

    /**
     * Procesa una consulta del usuario sobre sus finanzas usando el nuevo sistema con acceso completo
     * @param {string} userMessage - Mensaje del usuario
     * @param {Object} financialData - Datos financieros actuales
     * @param {Object} options - Opciones adicionales (authToken, useAdvanced, etc.)
     * @returns {Promise<Object>} Promesa con la respuesta de la IA
     */
    async processQuery(userMessage, financialData, options = {}) {
        try {
            // Validar el mensaje del usuario
            if (!userMessage || userMessage.trim() === '') {
                throw new Error('❌ El mensaje del usuario no puede estar vacío');
            }

            const { authToken, useAdvanced = true, additionalData } = options;

            // Si tenemos token de autenticación y queremos usar el sistema avanzado
            if (authToken && useAdvanced) {
                return await this.processAdvancedQuery(userMessage, authToken, financialData, additionalData);
            }

            // Sistema básico (modo público o sin autenticación)
            return await this.processBasicQuery(userMessage, financialData);

        } catch (error) {
            return {
                success: false,
                message: 'Lo siento, no pude procesar tu consulta en este momento.',
                error: error instanceof Error ? error.message : 'Error desconocido'
            };
        }
    }

    /**
     * Procesa consulta avanzada usando el nuevo sistema con acceso completo a datos
     * @param {string} userMessage - Mensaje del usuario
     * @param {string} authToken - Token de autenticación
     * @param {Object} financialData - Datos financieros actuales
     * @param {Object} additionalData - Datos adicionales
     * @returns {Promise<Object>} Respuesta avanzada
     */
    async processAdvancedQuery(userMessage, authToken, financialData, additionalData) {
        try {

            const response = await fetch('/api/ai/advanced-query', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${authToken}`
                },
                body: JSON.stringify({
                    query: userMessage,
                    additionalData: {
                        ...additionalData,
                        frontendData: financialData
                    }
                })
            });

            if (!response.ok) {
                throw new Error(`Error en la API: ${response.status}`);
            }

            const result = await response.json();

            if (result.success) {
                return {
                    success: true,
                    message: result.data.response,
                    mode: 'advanced',
                    contextUsed: result.data.contextUsed,
                    dataPoints: result.data.dataPoints,
                    timestamp: result.data.timestamp
                };
            } else {
                throw new Error(result.message || 'Error en la consulta avanzada');
            }

        } catch (error) {

            // Fallback al sistema básico si falla el avanzado
            return await this.processBasicQuery(userMessage, financialData);
        }
    }

    /**
     * Procesa consulta básica (modo público o fallback)
     * @param {string} userMessage - Mensaje del usuario
     * @param {Object} financialData - Datos financieros actuales
     * @returns {Promise<Object>} Respuesta básica
     */
    async processBasicQuery(userMessage, financialData) {
        try {
            // Usar el endpoint público mejorado
            const response = await fetch('/api/public/ai/enhanced-chat', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    message: userMessage,
                    userData: {
                        name: financialData?.user?.name,
                        currency: financialData?.user?.currency,
                        summary: financialData?.summary,
                        recentTransactions: financialData?.recentTransactions?.slice(0, 5)
                    }
                })
            });

            if (!response.ok) {
                throw new Error(`Error en la API: ${response.status}`);
            }

            const result = await response.json();

            if (result.success) {
                return {
                    success: true,
                    message: result.data.response,
                    mode: 'basic',
                    contextUsed: result.data.contextUsed,
                    timestamp: result.data.timestamp
                };
            } else {
                throw new Error(result.message || 'Error en la consulta básica');
            }

        } catch (error) {

            // Último fallback: usar el sistema anterior si está disponible
            if (this.aiAnalyzer && this.isReady()) {
                const systemPrompt = this.createSystemPrompt(financialData);
                const response = await this.aiAnalyzer.analyzeText(userMessage, systemPrompt);

                if (response.success) {
                    return {
                        success: true,
                        message: typeof response.data === 'string' ? response.data : 'Respuesta de IA no disponible',
                        mode: 'fallback',
                        timestamp: new Date().toISOString()
                    };
                }
            }

            throw new Error('Todos los sistemas de IA fallaron');
        }
    }

    /**
     * Crea el prompt del sistema con contexto financiero
     * @param {Object} financialData - Datos financieros del usuario
     * @returns {string} Prompt del sistema para la IA
     */
    createSystemPrompt(financialData) {
        const { transactions = [], categories = [], goals = [], summary = {} } = financialData;

        // Crear resumen de transacciones recientes
        const recentTransactions = transactions
            .slice(-10) // Últimas 10 transacciones
            .map(t => `- ${t.type === 'income' ? 'Ingreso' : 'Gasto'}: $${t.amount} (${t.category}) - ${t.description}`)
            .join('\n');

        // Crear resumen de categorías
        const incomeCategories = categories
            .filter(c => c.type === 'income')
            .map(c => c.name)
            .join(', ');
        
        const expenseCategories = categories
            .filter(c => c.type === 'expense')
            .map(c => c.name)
            .join(', ');

        // Crear resumen de metas
        const activeGoals = goals
            .filter(g => !g.completed)
            .map(g => `- ${g.name}: $${g.currentSaved}/${g.amount} (${this.calculateProgress(g.currentSaved, g.amount)}%)`)
            .join('\n');

        return `Eres un asistente financiero experto y amigable. Tu objetivo es ayudar al usuario a entender y mejorar sus finanzas personales.

CONTEXTO FINANCIERO DEL USUARIO:

📊 RESUMEN ACTUAL:
- Ingresos totales: $${(summary.totalIncome || 0).toFixed(2)}
- Gastos totales: $${(summary.totalExpenses || 0).toFixed(2)}
- Balance actual: $${(summary.balance || 0).toFixed(2)}
- Ahorros totales: $${(summary.totalSavings || 0).toFixed(2)}

💰 TRANSACCIONES RECIENTES:
${recentTransactions || 'No hay transacciones recientes'}

🏷️ CATEGORÍAS DISPONIBLES:
- Ingresos: ${incomeCategories || 'Ninguna'}
- Gastos: ${expenseCategories || 'Ninguna'}

🎯 METAS ACTIVAS:
${activeGoals || 'No hay metas activas'}

INSTRUCCIONES:
1. Responde de manera clara, amigable y profesional
2. Usa los datos reales del usuario para dar consejos específicos
3. Sugiere mejoras prácticas y alcanzables
4. Si no tienes suficiente información, pide más detalles
5. Usa emojis para hacer las respuestas más amigables
6. Mantén las respuestas concisas pero informativas
7. Enfócate en ayudar al usuario a alcanzar sus metas financieras

IMPORTANTE: Siempre basa tus respuestas en los datos reales proporcionados y no inventes información.`;
    }

    /**
     * Calcula el progreso de una meta
     * @param {number} current - Monto actual
     * @param {number} target - Monto objetivo
     * @returns {number} Porcentaje de progreso
     */
    calculateProgress(current, target) {
        if (!target || target === 0) return 0;
        return Math.min(Math.round((current / target) * 100), 100);
    }

    /**
     * Genera sugerencias de preguntas basadas en los datos financieros
     * @param {Object} financialData - Datos financieros del usuario
     * @returns {Array<string>} Array de sugerencias de preguntas
     */
    generateSuggestions(financialData) {
        const suggestions = [];
        const { summary = {}, transactions = [], goals = [] } = financialData;

        // Sugerencias basadas en el balance
        if (summary.balance < 0) {
            suggestions.push('¿Cómo puedo mejorar mi balance negativo?');
        } else if (summary.balance > 0) {
            suggestions.push('¿Qué puedo hacer con mi excedente de dinero?');
        }

        // Sugerencias basadas en gastos
        if (summary.totalExpenses > 0) {
            suggestions.push('¿Cuáles son mis mayores gastos este mes?');
            suggestions.push('¿Cómo puedo reducir mis gastos?');
        }

        // Sugerencias basadas en metas
        if (goals.length > 0) {
            suggestions.push('¿Cómo puedo alcanzar mis metas de ahorro más rápido?');
        }

        // Sugerencias generales
        suggestions.push('¿Qué consejos me das para ahorrar más?');
        suggestions.push('¿Cómo puedo crear un presupuesto efectivo?');

        return suggestions.slice(0, 4); // Máximo 4 sugerencias
    }

    /**
     * Obtiene datos completos del usuario para contexto avanzado
     * @param {string} authToken - Token de autenticación
     * @returns {Promise<Object>} Datos completos del usuario
     */
    async getCompleteUserData(authToken) {
        try {

            const response = await fetch('/api/ai/user-data-summary', {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${authToken}`
                }
            });

            if (!response.ok) {
                throw new Error(`Error obteniendo datos del usuario: ${response.status}`);
            }

            const result = await response.json();

            if (result.success) {
                return result.data;
            } else {
                throw new Error(result.message || 'Error obteniendo datos del usuario');
            }

        } catch (error) {
            return null; // Retornar null para que el sistema siga funcionando
        }
    }

    /**
     * Realiza diagnóstico financiero completo
     * @param {string} authToken - Token de autenticación
     * @param {Object} additionalData - Datos adicionales
     * @returns {Promise<Object>} Resultado del diagnóstico
     */
    async performCompleteDiagnosis(authToken, additionalData = {}) {
        try {

            const response = await fetch('/api/ai/complete-diagnosis', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${authToken}`
                },
                body: JSON.stringify({
                    additionalData: additionalData
                })
            });

            if (!response.ok) {
                throw new Error(`Error en diagnóstico: ${response.status}`);
            }

            const result = await response.json();

            if (result.success) {
                return {
                    success: true,
                    diagnosis: result.data.diagnosis,
                    dataAnalyzed: result.data.dataAnalyzed,
                    recommendations: result.data.recommendations,
                    timestamp: result.data.timestamp
                };
            } else {
                throw new Error(result.message || 'Error en el diagnóstico');
            }

        } catch (error) {
            return {
                success: false,
                diagnosis: 'No se pudo completar el diagnóstico en este momento.',
                error: error.message,
                timestamp: new Date().toISOString()
            };
        }
    }

    /**
     * Genera contexto detallado para consultas avanzadas
     * @param {string} authToken - Token de autenticación
     * @param {string} type - Tipo de contexto (general, diagnosis, etc.)
     * @returns {Promise<string>} Contexto generado
     */
    async generateDetailedContext(authToken, type = 'general') {
        try {

            const response = await fetch(`/api/ai/context?type=${type}`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${authToken}`
                }
            });

            if (!response.ok) {
                throw new Error(`Error generando contexto: ${response.status}`);
            }

            const result = await response.json();

            if (result.success) {
                return result.data.context;
            } else {
                throw new Error(result.message || 'Error generando contexto');
            }

        } catch (error) {
            return 'Error obteniendo contexto detallado. Información limitada disponible.';
        }
    }

    /**
     * Obtiene la configuración actual del chat
     * @returns {Object} Configuración sin datos sensibles
     */
    getConfig() {
        return {
            isInitialized: this.isInitialized,
            model: this.aiAnalyzer ? this.aiAnalyzer.getConfig().model : 'basic',
            hasAdvancedAccess: true, // Nuevo sistema con acceso avanzado
            apiEndpoints: {
                advancedQuery: '/api/ai/advanced-query',
                completeDiagnosis: '/api/ai/complete-diagnosis',
                userDataSummary: '/api/ai/user-data-summary',
                context: '/api/ai/context',
                enhancedChat: '/api/public/ai/enhanced-chat'
            }
        };
    }
}

// ==================== FUNCIONES DE UTILIDAD ====================

/**
 * Formatea un mensaje para mostrar en el chat
 * @param {string} message - Mensaje a formatear
 * @returns {string} Mensaje formateado con HTML
 */
export function formatChatMessage(message) {
    // Validar que el mensaje no sea undefined o null
    if (!message || typeof message !== 'string') {
        return 'Mensaje no disponible';
    }

    // Convertir saltos de línea en <br>
    let formatted = message.replace(/\n/g, '<br>');
    
    // Resaltar números de dinero
    formatted = formatted.replace(/\$(\d+(?:\.\d{2})?)/g, '<strong>$1</strong>');
    
    // Resaltar porcentajes
    formatted = formatted.replace(/(\d+)%/g, '<strong>$1%</strong>');
    
    return formatted;
}

/**
 * Crea un ID único para los mensajes del chat
 * @returns {string} ID único
 */
export function generateMessageId() {
    return `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Valida si un mensaje es apropiado para el chat financiero
 * @param {string} message - Mensaje a validar
 * @returns {boolean} true si es apropiado
 */
export function isValidChatMessage(message) {
    if (!message || message.trim().length < 3) {
        return false;
    }
    
    // Verificar que no sea demasiado largo
    if (message.length > 500) {
        return false;
    }
    
    return true;
}

// Crear instancia global
const financialChat = new FinancialChat();

// Hacer disponible globalmente (compatible con carga como módulo y script regular)
if (typeof window !== 'undefined') {
    window.financialChat = financialChat;

    // También asignar directamente para compatibilidad
    if (!window.financialChat) {
        window.financialChat = financialChat;
    }
}

// Log de inicialización
console.log('🤖 Financial Chat System initialized:', {
    available: !!window.financialChat,
    isReady: financialChat.isReady(),
    timestamp: new Date().toISOString()
});

export default financialChat;
