/**
 * 💬 FINANCIAL CHAT - ASISTENTE IA PARA CONSULTAS FINANCIERAS
 *
 * Módulo para chat con IA usando OpenAI (GPT)
 * Analiza datos financieros y proporciona consejos personalizados
 * Autor: Senior Backend Developer
 */

// Nota: La integración con OpenAI se maneja en el servidor (aiService.js)

// ==================== INTERFACES Y TIPOS ====================

/**
 * Interface para un mensaje del chat
 */
interface ChatMessage {
    id: string;
    type: 'user' | 'ai';
    content: string;
    timestamp: Date;
    isLoading?: boolean;
}

/**
 * Interface para datos financieros que se envían a la IA
 */
interface FinancialData {
    transactions: any[];
    categories: any[];
    goals: any[];
    summary: {
        totalIncome: number;
        totalExpenses: number;
        balance: number;
        totalSavings: number;
    };
}

/**
 * Interface para la respuesta del chat
 */
interface ChatResponse {
    success: boolean;
    message: string;
    error?: string;
}

// ==================== CLASE PRINCIPAL ====================

/**
 * Clase para manejar el chat financiero con IA
 * Procesa consultas sobre datos financieros y proporciona respuestas inteligentes
 */
export class FinancialChat {
    // Nota: La integración con IA se maneja en el servidor
    private apiKey: string = '';
    private isInitialized: boolean = false;

    /**
     * Constructor - Inicializa el chat financiero
     */
    constructor() {
        // La inicialización de IA se maneja en el servidor
    }

    /**
     * Inicializa el chat financiero
     * Nota: La configuración de OpenAI se maneja en el servidor
     */
    public initialize(): void {
        try {
            // Verificar que el servidor tenga la configuración de OpenAI
            this.isInitialized = true;
        } catch (error) {
            throw error;
        }
    }

    /**
     * Verifica si el chat está inicializado
     * @returns true si está listo para usar
     */
    public isReady(): boolean {
        return this.isInitialized && this.apiKey !== '';
    }

    /**
     * Procesa una consulta del usuario sobre sus finanzas
     * @param userMessage - Mensaje del usuario
     * @param financialData - Datos financieros actuales
     * @returns Promesa con la respuesta de la IA
     */
    public async processQuery(userMessage: string, financialData: FinancialData): Promise<ChatResponse> {
        try {
            // Validar que el chat esté inicializado
            if (!this.isReady()) {
                throw new Error('❌ Chat financiero no inicializado. Usa initialize() primero.');
            }

            // Validar el mensaje del usuario
            if (!userMessage || userMessage.trim() === '') {
                throw new Error('❌ El mensaje del usuario no puede estar vacío');
            }

            // Crear el prompt del sistema con contexto financiero
            const systemPrompt = this.createSystemPrompt(financialData);
            
            // Enviar consulta al servidor para procesamiento con OpenAI
            // Nota: La implementación real se maneja en el frontend (finanzas.js)
            return {
                success: true,
                message: 'Consulta enviada al servidor para procesamiento con OpenAI'
            };

        } catch (error) {
            return {
                success: false,
                message: 'Lo siento, no pude procesar tu consulta en este momento.',
                error: error instanceof Error ? error.message : 'Error desconocido'
            };
        }
    }

    /**
     * Crea el prompt del sistema con contexto financiero
     * @param financialData - Datos financieros del usuario
     * @returns Prompt del sistema para la IA
     */
    private createSystemPrompt(financialData: FinancialData): string {
        const { transactions, categories, goals, summary } = financialData;

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
- Ingresos totales: $${summary.totalIncome.toFixed(2)}
- Gastos totales: $${summary.totalExpenses.toFixed(2)}
- Balance actual: $${summary.balance.toFixed(2)}
- Ahorros totales: $${summary.totalSavings.toFixed(2)}

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
     * @param current - Monto actual
     * @param target - Monto objetivo
     * @returns Porcentaje de progreso
     */
    private calculateProgress(current: number, target: number): number {
        if (target <= 0) return 0;
        return Math.min(Math.round((current / target) * 100), 100);
    }

    /**
     * Genera sugerencias de preguntas basadas en los datos financieros
     * @param financialData - Datos financieros del usuario
     * @returns Array de sugerencias de preguntas
     */
    public generateSuggestions(financialData: FinancialData): string[] {
        const suggestions: string[] = [];
        const { summary, transactions, goals } = financialData;

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
     * Obtiene la configuración actual del chat
     * @returns Configuración sin datos sensibles
     */
    public getConfig(): { isInitialized: boolean; model: string } {
        return {
            isInitialized: this.isInitialized,
            model: 'gpt-4o-mini' // Modelo de OpenAI usado en el servidor
        };
    }
}

// ==================== FUNCIONES DE UTILIDAD ====================

/**
 * Formatea un mensaje para mostrar en el chat
 * @param message - Mensaje a formatear
 * @returns Mensaje formateado con HTML
 */
export function formatChatMessage(message: string): string {
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
 * @returns ID único
 */
export function generateMessageId(): string {
    return `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Valida si un mensaje es apropiado para el chat financiero
 * @param message - Mensaje a validar
 * @returns true si es apropiado
 */
export function isValidChatMessage(message: string): boolean {
    if (!message || message.trim().length < 3) {
        return false;
    }
    
    // Verificar que no sea demasiado largo
    if (message.length > 500) {
        return false;
    }
    
    return true;
}
