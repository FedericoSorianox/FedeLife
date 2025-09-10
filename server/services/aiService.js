/**
 * 🤖 SERVICIO DE IA - FEDE LIFE
 *
 * Servicio para análisis de PDFs usando OpenAI (GPT)
 * Incluye extracción de texto y análisis de gastos
 * Autor: Senior Backend Developer
 */

const fs = require('fs');
const path = require('path');

// ==================== CONFIGURACIÓN ====================

// Configuración de OpenAI
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const OPENAI_API_URL = 'https://api.openai.com/v1/chat/completions';

if (!OPENAI_API_KEY) {
    console.error('❌ ERROR: OPENAI_API_KEY no está configurada en las variables de entorno');
    console.error('💡 Configura OPENAI_API_KEY en tu archivo .env');
}

// ==================== FUNCIONES PRINCIPALES ====================

/**
 * Extrae texto de un archivo PDF
 * @param {string} filePath - Ruta del archivo PDF
 * @returns {Promise<string>} Texto extraído del PDF
 */
async function extractTextFromPDF(filePath) {
    try {
        // Por ahora, simulamos la extracción de texto
        // En producción, usarías una librería como pdf-parse o pdf2pic
        console.log(`📄 Extrayendo texto de: ${filePath}`);
        
        // Simular extracción (reemplazar con librería real)
        const mockText = `ESTADO DE CUENTA BANCARIA
        
        Fecha: ${new Date().toLocaleDateString()}
        
        TRANSACCIONES:
        - 15/01/2024: Supermercado ABC - $2,500.00
        - 16/01/2024: Gasolina - $800.00
        - 17/01/2024: Restaurante XYZ - $1,200.00
        - 18/01/2024: Servicios públicos - $1,800.00
        
        Total gastos: $6,300.00`;
        
        return mockText;
        
    } catch (error) {
        console.error('❌ Error extrayendo texto del PDF:', error);
        throw new Error('No se pudo extraer texto del PDF');
    }
}

/**
 * Filtra texto que contiene "REDIVA" del análisis
 * @param {string} text - Texto original del PDF
 * @returns {string} Texto filtrado sin referencias a REDIVA
 */
function filterRedivaText(text) {
    if (!text) return text;

    console.log('🔍 Aplicando filtro REDIVA al texto...');

    // Dividir el texto en líneas para procesar línea por línea
    const lines = text.split('\n');
    const filteredLines = [];

    for (const line of lines) {
        // Si la línea contiene "REDIVA" (case insensitive), la omitimos
        if (!line.toUpperCase().includes('REDIVA')) {
            filteredLines.push(line);
        } else {
            console.log('🚫 Línea filtrada (contiene REDIVA):', line.substring(0, 100) + '...');
        }
    }

    const filteredText = filteredLines.join('\n');

    // Log del resultado del filtrado
    const originalLines = lines.length;
    const filteredCount = originalLines - filteredLines.length;
    console.log(`✅ Filtro REDIVA completado: ${originalLines} líneas → ${filteredLines.length} líneas (${filteredCount} eliminadas)`);

    return filteredText;
}

/**
 * Analiza texto con OpenAI (GPT)
 * @param {string} text - Texto a analizar
 * @param {string} userId - ID del usuario (para contexto)
 * @returns {Promise<Object>} Análisis de gastos
 */
async function analyzeTextWithAI(text, userId) {
    try {
        console.log('🤖 Analizando texto con OpenAI...');

        // Verificar que tenemos la API key de OpenAI
        if (!OPENAI_API_KEY) {
            throw new Error('OPENAI_API_KEY no está configurada. Configura tu API Key de OpenAI en config-local.js');
        }

        // Validar formato de la API key
        if (!OPENAI_API_KEY.startsWith('sk-proj-') && !OPENAI_API_KEY.startsWith('sk-')) {
            console.warn('⚠️ La API Key no tiene el formato esperado. Verifica que sea una API Key válida de OpenAI.');
        }

        console.log('🔑 API Key de OpenAI configurada correctamente');

        // Filtrar texto que contenga "REDIVA" antes del análisis
        const filteredText = filterRedivaText(text);
        console.log('🔍 Texto filtrado - eliminadas referencias a REDIVA');

        // Preparar prompt para OpenAI
        const systemPrompt = `Eres un analista financiero experto especializado en el análisis de estados de cuenta bancarios uruguayos.

Tu tarea es analizar el texto de un estado de cuenta y extraer todos los gastos identificados.

INSTRUCCIONES IMPORTANTES:
1. Identifica ÚNICAMENTE transacciones que son GASTOS (no ingresos, depósitos, transferencias entrantes)
2. Extrae el monto, descripción y fecha de cada gasto
3. Categoriza cada gasto según estas categorías disponibles:
   - Alimentación
   - Transporte
   - Servicios
   - Entretenimiento
   - Salud
   - Educación
   - Ropa
   - Otros Gastos
4. Si no puedes determinar la categoría, usa "Otros Gastos"
5. Los montos pueden estar en USD o UYU - detecta automáticamente la moneda
6. Las fechas pueden estar en formato DD/MM/YYYY o MM/DD/YYYY
7. NO incluyas transacciones que no sean gastos
8. Si hay dudas sobre si es un gasto o ingreso, omítelo
9. IGNORA completamente cualquier texto relacionado con "REDIVA" o transacciones que contengan esta palabra

Devuelve ÚNICAMENTE un JSON válido con esta estructura exacta:`;

        const userPrompt = `
TEXTO DEL ESTADO DE CUENTA:
${filteredText}

Devuelve la respuesta en este formato JSON exacto:
{
    "expenses": [
        {
            "description": "Descripción clara del gasto",
            "amount": 2500.50,
            "currency": "UYU",
            "category": "Alimentación",
            "date": "2024-01-15",
            "confidence": 0.95
        }
    ],
    "summary": {
        "totalExpenses": 2500.50,
        "currency": "UYU",
        "expenseCount": 1
    }
}`;

        // Configurar AbortController para timeout
        const controller = new AbortController();
        const timeoutId = setTimeout(() => {
            controller.abort();
        }, 30000); // 30 segundos timeout

        console.log('🚀 Enviando solicitud a OpenAI API...');

        // Llamar a OpenAI API con timeout
        const response = await fetch(OPENAI_API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${OPENAI_API_KEY}`
            },
            body: JSON.stringify({
                model: 'gpt-4o-mini',
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
                max_tokens: 2000,
                temperature: 0.1 // Baja temperatura para respuestas consistentes
            }),
            signal: controller.signal
        });

        // Limpiar timeout si la respuesta llegó a tiempo
        clearTimeout(timeoutId);

        if (!response.ok) {
            const errorText = await response.text().catch(() => 'No se pudo leer el mensaje de error');
            console.error(`❌ Error en OpenAI API: ${response.status} ${response.statusText}`);
            console.error('Detalles del error:', errorText);

            if (response.status === 401) {
                throw new Error('API Key de OpenAI inválida o expirada. Verifica tu configuración.');
            } else if (response.status === 429) {
                throw new Error('Límite de uso de OpenAI excedido. Intenta más tarde.');
            } else if (response.status === 500) {
                throw new Error('Error interno del servidor de OpenAI. Intenta nuevamente.');
            } else {
                throw new Error(`Error en OpenAI API (${response.status}): ${response.statusText}`);
            }
        }

        const data = await response.json();
        const aiResponse = data.choices[0].message.content;

        console.log('✅ Respuesta de OpenAI recibida');

        // Intentar parsear el JSON de la respuesta
        let result;
        try {
            // Limpiar la respuesta de posibles caracteres extra
            const cleanResponse = aiResponse.trim();
            result = JSON.parse(cleanResponse);

            // Validar estructura
            if (!result.expenses || !Array.isArray(result.expenses)) {
                throw new Error('Estructura de respuesta inválida');
            }

            return result;

        } catch (parseError) {
            console.error('❌ Error parseando respuesta de OpenAI:', parseError);
            console.log('Respuesta cruda:', aiResponse);

            // Intentar extraer JSON de la respuesta
            const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                try {
                    result = JSON.parse(jsonMatch[0]);
                    return result;
                } catch (secondParseError) {
                    console.error('❌ Error en segundo intento de parseo:', secondParseError);
                }
            }

            throw new Error('No se pudo parsear la respuesta de OpenAI como JSON válido');
        }
    } catch (error) {
        // Manejar diferentes tipos de errores
        if (error.name === 'AbortError') {
            console.error('⏰ Timeout: La solicitud a OpenAI tomó demasiado tiempo (30 segundos)');
            throw new Error('La solicitud tomó demasiado tiempo. Verifica tu conexión a internet e intenta nuevamente.');
        } else if (error.message && error.message.includes('fetch')) {
            console.error('🌐 Error de conexión:', error.message);
            throw new Error('Error de conexión. Verifica tu conexión a internet e intenta nuevamente.');
        } else if (error.message && error.message.includes('API Key')) {
            console.error('🔑 Error de API Key:', error.message);
            throw error; // Re-throw con el mensaje específico
        } else {
            console.error('❌ Error analizando con OpenAI:', error.message);
            throw new Error(`Error procesando el análisis: ${error.message}`);
        }
    }
}


/**
 * Verifica la conectividad con OpenAI API
 * @returns {Promise<Object>} Estado de la conexión
 */
async function checkOpenAIHealth() {
    try {
        if (!OPENAI_API_KEY) {
            return {
                status: 'error',
                message: 'OPENAI_API_KEY no está configurada',
                configured: false
            };
        }

        // Hacer una solicitud simple para verificar la API
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 segundos timeout

        const response = await fetch('https://api.openai.com/v1/models', {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${OPENAI_API_KEY}`
            },
            signal: controller.signal
        });

        clearTimeout(timeoutId);

        if (response.ok) {
            return {
                status: 'success',
                message: 'OpenAI API funcionando correctamente',
                configured: true,
                responseTime: Date.now()
            };
        } else {
            return {
                status: 'error',
                message: `Error en OpenAI API: ${response.status} ${response.statusText}`,
                configured: true,
                errorCode: response.status
            };
        }

    } catch (error) {
        if (error.name === 'AbortError') {
            return {
                status: 'timeout',
                message: 'Timeout verificando OpenAI API',
                configured: !!OPENAI_API_KEY
            };
        }

        return {
            status: 'error',
            message: `Error de conexión: ${error.message}`,
            configured: !!OPENAI_API_KEY
        };
    }
}

// ==================== EXPORTAR FUNCIONES ====================

module.exports = {
    extractTextFromPDF,
    analyzeTextWithAI,
    checkOpenAIHealth,
    filterRedivaText
};
