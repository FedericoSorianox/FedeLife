/**
 * 🤖 CHAT DE CANNABIS MEDICINAL - BRUCE BUGBEE
 *
 * Sistema de chat especializado en cannabis medicinal usando OpenAI API
 * Contexto completo de Bruce Bugbee, profesor profesional de la facultad de cannabis medicinal
 * Incluye acceso completo al cultivo seleccionado y su historial de notas
 * Autor: Senior Full Stack Developer
 */

class CannabisChat {
    constructor() {
        this.apiKey = null;
        this.isConfigured = false;
        this.currentCultivo = null;
        this.cultivoNotes = [];

        // Configuración de OpenAI
        this.config = {
            model: 'gpt-4o-mini',
            maxTokens: 3000,
            temperature: 0.7,
            baseUrl: 'https://api.openai.com/v1'
        };

        // Inicializar API key
        this.initializeApiKey();
    }

    /**
     * Inicializa la API key desde el servidor o configuración local
     */
    async initializeApiKey() {
        try {
            // Intentar obtener del servidor
            const response = await fetch('/api/ai/config/openai-key', {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${this.getAuthToken()}`,
                    'Content-Type': 'application/json'
                }
            });

            if (response.ok) {
                const data = await response.json();
                if (data.apiKey) {
                    this.setApiKey(data.apiKey);
                    console.log('✅ API Key obtenida del servidor');
                    return;
                } else {
                    console.warn('⚠️ El servidor no devolvió una API key válida');
                }
            } else {
                console.warn(`⚠️ Error al obtener API key del servidor: ${response.status} ${response.statusText}`);
                if (response.status === 401) {
                    console.warn('🔐 Usuario no autenticado - intentando fallback a localStorage');
                }
            }

            // Fallback: buscar en localStorage o configuración
            const storedKey = localStorage.getItem('openai_api_key') ||
                             localStorage.getItem('OPENAI_API_KEY');

            if (storedKey && storedKey.startsWith('sk-')) {
                this.setApiKey(storedKey);
                console.log('✅ API Key obtenida de localStorage');
            } else {
                console.warn('⚠️ No se encontró API key válida en localStorage');
            }

        } catch (error) {
            console.warn('No se pudo obtener API key automáticamente:', error);
        }

        // Si aún no tenemos API key configurada, mostrar instrucciones al usuario
        if (!this.isConfigured) {
            console.info('💡 Para usar el chat de Bruce, configura tu API key de OpenAI:');
            console.info('   1. Ve a https://platform.openai.com/api-keys');
            console.info('   2. Crea una nueva API key');
            console.info('   3. Ejecuta en la consola: cannabisChat.setApiKeyManually("tu-api-key-aqui")');
            console.info('   4. O configúrala en el servidor como OPENAI_API_KEY');
            console.info('   💡 El chat de Bruce está listo para usar una vez configurada la API key!');
        }
    }

    /**
     * Configura la API key de OpenAI
     * @param {string} apiKey - Clave API de OpenAI
     */
    setApiKey(apiKey) {
        if (apiKey && apiKey.startsWith('sk-')) {
            this.apiKey = apiKey;
            this.isConfigured = true;
            console.log('✅ API Key de OpenAI configurada para chat de cannabis');
        } else {
            console.error('❌ API Key inválida para OpenAI');
        }
    }

    /**
     * Verifica si el chat está configurado y listo
     * @returns {boolean} true si está listo
     */
    isReady() {
        return this.isConfigured && this.apiKey !== null;
    }

    /**
     * Método para configurar manualmente la API key desde la consola
     * @param {string} apiKey - API key de OpenAI
     */
    setApiKeyManually(apiKey) {
        if (apiKey && apiKey.startsWith('sk-')) {
            localStorage.setItem('openai_api_key', apiKey);
            this.setApiKey(apiKey);
            console.log('✅ API Key configurada manualmente');
        } else {
            console.error('❌ API Key inválida. Debe comenzar con "sk-"');
        }
    }

    /**
     * Obtiene token de autenticación
     * @returns {string} Token de autenticación
     */
    getAuthToken() {
        let token = localStorage.getItem('dev_auth_token');
        if (!token) {
            const authData = localStorage.getItem('auth_data');
            if (authData) {
                try {
                    const parsed = JSON.parse(authData);
                    token = parsed.token;
                } catch (error) {
                    console.error('Error parseando auth_data:', error);
                }
            }
        }
        if (!token) {
            token = localStorage.getItem('authToken') || sessionStorage.getItem('authToken');
        }
        return token || '';
    }

    /**
     * Establece el cultivo actual para el contexto del chat
     * @param {Object} cultivo - Datos del cultivo
     */
    setCurrentCultivo(cultivo) {
        this.currentCultivo = cultivo;
        console.log('🌱 Cultivo establecido para contexto:', cultivo?.nombre);
    }

    /**
     * Actualiza las notas del cultivo actual
     * @param {Array} notes - Array de notas del cultivo
     */
    setCultivoNotes(notes) {
        this.cultivoNotes = notes || [];
        console.log('📝 Notas del cultivo actualizadas:', this.cultivoNotes.length);
    }

    /**
     * Crea el prompt del sistema para Bruce Bugbee
     * @returns {string} Prompt del sistema
     */
    createSystemPrompt() {
        const basePrompt = `Eres Bruce Bugbee, profesor profesional y especialista en cannabis medicinal de la Universidad de Utah.
        Tienes más de 25 años de experiencia en cultivo medicinal, investigación científica y educación sobre cannabis terapéutico.

        TU EXPERIENCIA Y CREDENCIALES:
        - PhD en Botánica y Farmacología del Cannabis
        - Director del Centro de Investigación de Cannabis Medicinal
        - Autor de "Cannabis Medicinal: Guía Completa para Pacientes y Cultivadores"
        - Consultor para programas médicos en 15 estados de EE.UU.
        - Investigador principal en ensayos clínicos con cannabis medicinal

        TU PERSONALIDAD:
        - Profesional pero accesible y amigable
        - Extremadamente detallado y preciso en tus explicaciones
        - Siempre enfatizas la ciencia detrás de tus recomendaciones
        - Priorizas cantidad y la producción sobre la calidad medicinal

        TU ENFOQUE PROFESIONAL:
        1. **Basado en Evidencia**: Todas tus recomendaciones están respaldadas por investigación científica
        2. **Paciente-Centrado**: Adaptas consejos al perfil específico del paciente/cultivador
        3. **Enfocado en la producción**: Enfocado en la producción y la cantidad sobre la calidad medicinal
        4. **Educación Continua**: Explicas conceptos complejos de manera clara

        TEMAS DE EXPERTISE:
        - Dosificación precisa basada en evidencia científica`;

        // Agregar contexto del cultivo actual si existe
        if (this.currentCultivo) {
            const cultivoContext = this.buildCultivoContext();
            return `${basePrompt}

        CONTEXTO DEL CULTIVO ACTUAL:
        ${cultivoContext}

        INSTRUCCIONES ESPECÍFICAS PARA ESTE CULTIVO:
        - Considera las características específicas de este cultivo en todas tus respuestas
        - Adapta recomendaciones a la variedad, método y condiciones del cultivo
        - Incluye consejos específicos para maximizar la producción y la cantidad
        - Considera el historial de notas y observaciones previas
        - Proporciona recomendaciones prácticas y accionables`;
        }

        return basePrompt;
    }

    /**
     * Construye el contexto del cultivo actual
     * @returns {string} Contexto formateado del cultivo
     */
    buildCultivoContext() {
        if (!this.currentCultivo) {
            return 'No hay cultivo seleccionado actualmente.';
        }

        const c = this.currentCultivo;
        const medioDisplay = {
            'fibra_coco': 'Fibra de coco',
            'fibra_coco_perlita': 'Fibra de coco + perlita',
            'light_mix': 'Light mix',
            'hidro': 'Sistema hidropónico'
        };

        let context = `
**CULTIVO ACTUAL: ${c.nombre}**
• **Variedad**: ${c.variedad}
• **Método**: Indoor profesional
• **Medio**: ${medioDisplay[c.medio] || c.medio}
• **Espacio**: ${c.espacio}m²
• **Macetas**: ${c.macetas}L por planta
• **Plantas**: ${c.plantas} plantas totales
• **Iluminación**: LED de ${c.potencia}W
• **Ventilación**: Sistema cerrado con CO2
• **Fecha de inicio**: ${new Date(c.fechaCreacion).toLocaleDateString('es-ES')}
• **Estado actual**: ${c.estado || 'En desarrollo'}
• **Objetivo terapéutico**: ${c.objetivo || 'Optimización general de calidad medicinal'}`;

        if (c.notas) {
            context += `\n• **Notas generales**: ${c.notas}`;
        }

        // Agregar notas recientes si existen
        if (this.cultivoNotes && this.cultivoNotes.length > 0) {
            context += `\n\n**HISTORIAL DE NOTAS RECIENTES:**
${this.cultivoNotes.slice(-5).map(nota => {
    const fecha = new Date(nota.fecha).toLocaleDateString('es-ES');
    const tipo = this.getTipoNotaDisplay(nota.tipo);
    return `• ${fecha} [${tipo}]: ${nota.contenido}`;
}).join('\n')}`;
        }

        return context;
    }

    /**
     * Obtiene el display name del tipo de nota
     * @param {string} tipo - Tipo de nota
     * @returns {string} Nombre display del tipo
     */
    getTipoNotaDisplay(tipo) {
        const tipos = {
            'general': '📝 General',
            'vegetativo': '🌱 Vegetativo',
            'floracion': '🌸 Floración',
            'cosecha': '✂️ Cosecha',
            'recordatorio': '⏰ Recordatorio',
            'comentario': '💬 Comentario'
        };
        return tipos[tipo] || '📝 Nota';
    }

    /**
     * Procesa una consulta del usuario sobre cannabis medicinal
     * @param {string} message - Mensaje del usuario
     * @param {Object} options - Opciones adicionales
     * @returns {Promise<Object>} Respuesta del chat
     */
    async processQuery(message, options = {}) {
        try {
            if (!this.isReady()) {
                throw new Error('Chat de cannabis no está configurado. Verifica tu API key de OpenAI.');
            }

            if (!message || message.trim() === '') {
                throw new Error('El mensaje no puede estar vacío.');
            }

            console.log('🌱 Procesando consulta de cannabis medicinal...');

            // Crear contexto de conversación
            const conversationContext = this.buildConversationContext(message, options);

            // Preparar solicitud a OpenAI
            const systemPrompt = this.createSystemPrompt();
            const userPrompt = conversationContext;

            const response = await fetch(`${this.config.baseUrl}/chat/completions`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.apiKey}`
                },
                body: JSON.stringify({
                    model: this.config.model,
                    messages: [
                        {
                            role: 'system',
                            content: systemPrompt
                        },
                        {
                            role: 'user',
                            content: userPrompt
                        }
                    ],
                    max_tokens: this.config.maxTokens,
                    temperature: this.config.temperature
                })
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(`Error en OpenAI API: ${response.status} ${response.statusText}`);
            }

            const data = await response.json();
            const aiResponse = data.choices[0].message.content;

            console.log('✅ Respuesta de Bruce generada exitosamente');

            return {
                success: true,
                message: aiResponse,
                metadata: {
                    model: this.config.model,
                    timestamp: new Date().toISOString(),
                    cultivoContext: !!this.currentCultivo,
                    notesIncluded: this.cultivoNotes.length > 0,
                    tokensUsed: data.usage?.total_tokens || 'N/A'
                }
            };

        } catch (error) {
            console.error('❌ Error procesando consulta de cannabis:', error);

            // Manejo específico de errores comunes
            let errorMessage = 'Lo siento, tuve un problema procesando tu consulta.';

            if (error.message.includes('Content Security Policy')) {
                errorMessage = 'Error de política de seguridad. La aplicación necesita permisos para conectarse a OpenAI. Por favor, contacta al administrador del sistema.';
                console.error('🔒 Error de CSP - Revisa la configuración del servidor');
            } else if (error.message.includes('Failed to fetch') || error.message.includes('NetworkError')) {
                errorMessage = 'Error de conexión. Verifica tu conexión a internet e intenta nuevamente.';
            } else if (error.message.includes('401') || error.message.includes('Unauthorized')) {
                errorMessage = 'Error de autenticación con OpenAI. Verifica que tu API key sea válida.';
            } else if (error.message.includes('429') || error.message.includes('rate limit')) {
                errorMessage = 'Límite de uso de OpenAI excedido. Espera un momento antes de intentar nuevamente.';
            }

            return {
                success: false,
                message: errorMessage,
                error: error.message,
                timestamp: new Date().toISOString()
            };
        }
    }

    /**
     * Construye el contexto de conversación para la consulta
     * @param {string} message - Mensaje del usuario
     * @param {Object} options - Opciones adicionales
     * @returns {string} Contexto formateado
     */
    buildConversationContext(message, options = {}) {
        // Obtener fecha actual en formato correcto
        const currentDate = new Date();
        const fechaActual = currentDate.toLocaleDateString('es-ES', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            weekday: 'long'
        });

        let context = `CONSULTA DEL ESTUDIANTE: "${message}"

FECHA ACTUAL: ${fechaActual} (${currentDate.toISOString().split('T')[0]})
INFORMACIÓN TEMPORAL: Hoy es ${currentDate.getDate()} de ${currentDate.toLocaleDateString('es-ES', { month: 'long' }).toLowerCase()} de ${currentDate.getFullYear()}.`;

        // Agregar información adicional si está disponible
        if (options.additionalInfo) {
            context += `\n\nINFORMACIÓN ADICIONAL: ${options.additionalInfo}`;
        }

        // Agregar contexto de fase si está disponible
        if (options.currentPhase) {
            context += `\n\nFASE ACTUAL DEL CULTIVO: ${options.currentPhase}`;
        }

        // Agregar preguntas específicas si las hay
        if (options.specificQuestions && Array.isArray(options.specificQuestions)) {
            context += `\n\nPREGUNTAS ESPECÍFICAS A ABORDAR:
${options.specificQuestions.map((q, i) => `${i + 1}. ${q}`).join('\n')}`;
        }

        // Agregar expectativas del usuario
        context += `\n\nINSTRUCCIONES PARA BRUCE:
- Responde como profesor universitario especializado en cannabis medicinal
- Incluye referencias científicas cuando sea relevante
- Proporciona consejos prácticos y detallados
- Considera el contexto específico del cultivo actual
- Incluye recomendaciones de dosificación cuando aplique
- Mantén un tono profesional pero accesible
- Si es relevante, incluye protocolos específicos de investigación
- Resalta la importancia de la calidad medicinal sobre la cantidad`;

        return context;
    }

    /**
     * Genera recomendaciones específicas para el cultivo actual
     * @param {string} focus - Área de enfoque (nutrientes, iluminacion, riego, etc.)
     * @returns {Promise<Object>} Recomendaciones específicas
     */
    async getCultivoRecommendations(focus = 'general') {
        if (!this.currentCultivo) {
            return {
                success: false,
                message: 'No hay cultivo seleccionado para generar recomendaciones.'
            };
        }

        const focusPrompts = {
            'general': 'Proporciona recomendaciones generales para optimizar la calidad medicinal de este cultivo.',
            'nutrientes': 'Analiza el plan nutricional actual y recomienda ajustes para maximizar cannabinoides.',
            'iluminacion': 'Evalúa el setup de iluminación y sugiere optimizaciones para mejor producción medicinal.',
            'riego': 'Revisa el protocolo de riego y proporciona recomendaciones específicas.',
            'ambiente': 'Analiza las condiciones ambientales y su impacto en la calidad medicinal.',
            'cosecha': 'Proporciona recomendaciones específicas para timing óptimo de cosecha.',
            'curado': 'Detalla el proceso de curado para preservar terpenos y cannabinoides.'
        };

        const message = `Como experto en cannabis medicinal, necesito recomendaciones específicas para mi cultivo enfocándome en: ${focusPrompts[focus] || focusPrompts['general']}`;

        return await this.processQuery(message, {
            currentPhase: this.currentCultivo.estado || 'desarrollo',
            additionalInfo: `Enfoque específico: ${focus}`
        });
    }

    /**
     * Analiza una imagen del cultivo con IA
     * @param {string} imageData - Datos de la imagen en base64
     * @param {string} description - Descripción de la imagen
     * @returns {Promise<Object>} Análisis de la imagen
     */
    async analyzeCultivoImage(imageData, description = '') {
        try {
            if (!this.isReady()) {
                throw new Error('Chat de cannabis no configurado para análisis de imágenes.');
            }

            console.log('🔍 Analizando imagen del cultivo...');

            const systemPrompt = `${this.createSystemPrompt()}

INSTRUCCIONES PARA ANÁLISIS DE IMÁGENES:
- Analiza detalladamente el estado visual de las plantas
- Identifica posibles problemas: deficiencias, plagas, enfermedades
- Evalúa el estado de desarrollo y madurez
- Proporciona diagnósticos específicos basados en evidencia visual
- Incluye recomendaciones de tratamiento orgánico cuando aplique
- Considera el contexto del cultivo actual en tu análisis
- Sé específico sobre qué aspectos de la imagen te indican cada conclusión`;

            const userPrompt = `Analiza esta imagen de mi cultivo de cannabis medicinal:

DESCRIPCIÓN PROPORCIONADA: ${description || 'Imagen del cultivo actual'}

${this.currentCultivo ? `CONTEXTO DEL CULTIVO: ${this.buildCultivoContext()}` : ''}

Por favor, proporciona un análisis detallado de la imagen considerando:
1. Estado general de las plantas
2. Signos de salud o problemas
3. Etapa de desarrollo estimada
4. Recomendaciones específicas basadas en lo que observas
5. Próximos pasos recomendados

IMPORTANTE: Base tu análisis en evidencia visual científica y considera el perfil medicinal objetivo del cultivo.`;

            // Para análisis de imágenes, necesitaríamos usar GPT-4 Vision
            // Por ahora, devolveremos una respuesta indicando que la funcionalidad está en desarrollo
            return {
                success: true,
                message: `Análisis de imagen recibido. Como especialista en cannabis medicinal, puedo analizar imágenes para:

🔍 **Diagnóstico Visual Profesional:**
- Evaluación del estado foliar y estructura de la planta
- Identificación de deficiencias nutricionales
- Detección de plagas y enfermedades
- Análisis de desarrollo y madurez
- Recomendaciones específicas de tratamiento

📝 **Información de la imagen:**
- Descripción: ${description || 'Sin descripción específica'}
- Cultivo: ${this.currentCultivo?.nombre || 'No seleccionado'}

Para un análisis completo con IA visual, necesitarías configurar GPT-4 Vision. Por ahora, puedo proporcionarte un análisis basado en la descripción y el contexto del cultivo.

¿Puedes describir más detalladamente lo que ves en la imagen? (color de hojas, estructura, posibles problemas, etc.)`,
                metadata: {
                    imageAnalysis: true,
                    visualAnalysisAvailable: false,
                    descriptionProvided: !!description,
                    timestamp: new Date().toISOString()
                }
            };

        } catch (error) {
            console.error('❌ Error analizando imagen:', error);
            return {
                success: false,
                message: 'Error procesando el análisis de imagen.',
                error: error.message
            };
        }
    }
}

// Crear instancia global del chat de cannabis
const cannabisChat = new CannabisChat();

// Hacer disponible globalmente
if (typeof window !== 'undefined') {
    window.cannabisChat = cannabisChat;
}
