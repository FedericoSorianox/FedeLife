/**
 * 🤖 GOOGLE AI ANALYZER - ANÁLISIS DE TEXTO CON GEMINI
 * 
 * Módulo independiente para análisis de texto usando Google AI Studio (Gemini)
 * Completamente gratuito y modular para reutilización
 * Autor: Senior Backend Developer
 */

import type { LLMConfig, AnalysisResponse } from './types.js';

// La interface AnalysisResponse se importa desde types.ts

/**
 * Clase para analizar texto con Google AI Studio (Gemini)
 * Módulo independiente y reutilizable para análisis de IA
 * COMPLETAMENTE GRATUITO con generosos límites de Google
 */
export class GoogleAIAnalyzer {
    private config: LLMConfig;

    /**
     * Constructor - Inicializa el analizador con configuración por defecto
     */
    constructor() {
        // Configuración por defecto para Google AI Studio (GRATIS)
        this.config = {
            apiKey: '', // Se configurará dinámicamente
            model: 'gemini-1.5-flash', // Modelo rápido y gratuito de Google
            maxTokens: 2048,
            temperature: 0.3, // Baja para respuestas más consistentes
            baseUrl: 'https://generativelanguage.googleapis.com/v1beta/models'
        };
    }

    /**
     * Configura la API Key de Google AI Studio
     * @param apiKey - Clave de la API de Google AI Studio (gratuita)
     */
    public setApiKey(apiKey: string): void {
        if (!apiKey || apiKey.trim() === '') {
            throw new Error('❌ API Key de Google AI Studio es requerida');
        }
        this.config.apiKey = apiKey.trim();
    }

    /**
     * Actualiza la configuración del modelo
     * @param newConfig - Nueva configuración parcial o completa
     */
    public updateConfig(newConfig: Partial<LLMConfig>): void {
        this.config = { ...this.config, ...newConfig };
    }

    /**
     * Obtiene la configuración actual (sin exponer la API Key)
     * @returns Configuración sin datos sensibles
     */
    public getConfig(): Omit<LLMConfig, 'apiKey'> {
        const { apiKey, ...safeConfig } = this.config;
        return safeConfig;
    }

    /**
     * Analiza texto usando Google AI Studio (Gemini)
     * @param prompt - Texto a analizar
     * @param systemPrompt - Instrucciones del sistema (opcional)
     * @returns Promesa con la respuesta del análisis
     */
    public async analyzeText(prompt: string, systemPrompt?: string): Promise<AnalysisResponse> {
        try {
            // Validaciones básicas
            if (!this.config.apiKey) {
                throw new Error('❌ API Key no configurada. Usa setApiKey() primero.');
            }

            if (!prompt || prompt.trim() === '') {
                throw new Error('❌ El texto a analizar no puede estar vacío');
            }

            // Construir el prompt final
            const finalPrompt = systemPrompt 
                ? `${systemPrompt}\n\nTexto a analizar:\n${prompt}`
                : prompt;

            // Configurar la solicitud a Google AI Studio
            const requestBody = {
                contents: [{
                    parts: [{
                        text: finalPrompt
                    }]
                }],
                generationConfig: {
                    temperature: this.config.temperature,
                    maxOutputTokens: this.config.maxTokens,
                    candidateCount: 1,
                }
            };

            // URL completa de la API de Google AI Studio
            const apiUrl = `${this.config.baseUrl}/${this.config.model}:generateContent?key=${this.config.apiKey}`;

            // Realizar la solicitud HTTP
            const response = await fetch(apiUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(requestBody)
            });

            // Verificar si la respuesta es exitosa
            if (!response.ok) {
                const errorData = await response.text();
                throw new Error(`❌ Error HTTP ${response.status}: ${errorData}`);
            }

            // Procesar la respuesta de Google AI Studio
            const data = await response.json();

            // Validar estructura de respuesta de Gemini
            if (!data.candidates || !data.candidates[0] || !data.candidates[0].content) {
                throw new Error('❌ Respuesta inválida de Google AI Studio');
            }

            // Extraer el texto de la respuesta
            const aiResponse = data.candidates[0].content.parts[0].text;

            // Intentar parsear como JSON si es posible, sino devolver como texto
            let parsedData;
            try {
                parsedData = JSON.parse(aiResponse);
            } catch {
                parsedData = aiResponse; // Mantener como texto si no es JSON válido
            }

            return {
                success: true,
                data: parsedData,
                confidence: this.calculateConfidence(data)
            };

        } catch (error) {
            // Manejo de errores con logging detallado
            const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
            
            console.error('🔥 Error en GoogleAIAnalyzer:', {
                error: errorMessage,
                prompt: prompt.substring(0, 100) + '...', // Solo primeros 100 chars para debug
                model: this.config.model
            });

            return {
                success: false,
                error: errorMessage,
                confidence: 0
            };
        }
    }

    /**
     * Calcula el nivel de confianza basado en la respuesta de Google AI
     * @param apiResponse - Respuesta cruda de la API
     * @returns Nivel de confianza entre 0 y 1
     */
    private calculateConfidence(apiResponse: any): number {
        try {
            // Google AI Studio no proporciona confidence score directamente
            // Calculamos basado en la presencia de datos y estructura
            const candidate = apiResponse.candidates?.[0];
            
            if (!candidate) return 0;

            // Factores de confianza
            let confidence = 0.5; // Base

            // Si hay contenido estructurado
            if (candidate.content?.parts?.[0]?.text) {
                confidence += 0.3;
            }

            // Si no hay flags de seguridad bloqueantes
            if (!candidate.finishReason || candidate.finishReason === 'STOP') {
                confidence += 0.2;
            }

            // Limitar entre 0 y 1
            return Math.min(Math.max(confidence, 0), 1);

        } catch {
            return 0.5; // Confianza media por defecto
        }
    }

    /**
     * Verifica si la configuración es válida
     * @returns true si la configuración es válida
     */
    public isConfigValid(): boolean {
        return !!(
            this.config.apiKey &&
            this.config.model &&
            this.config.baseUrl &&
            this.config.maxTokens > 0
        );
    }

    /**
     * Obtiene información del estado del analizador
     * @returns Estado actual del analizador
     */
    public getStatus(): {
        isReady: boolean;
        model: string;
        hasApiKey: boolean;
    } {
        return {
            isReady: this.isConfigValid(),
            model: this.config.model,
            hasApiKey: !!this.config.apiKey
        };
    }
}

/**
 * Instancia singleton del analizador para uso global
 * Export por defecto para facilitar importación
 */
export default new GoogleAIAnalyzer();
