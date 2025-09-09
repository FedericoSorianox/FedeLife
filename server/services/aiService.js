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
    console.error('❌ ERROR: OPENAI_API_KEY no está configurada');
    console.error('Configura tu API Key de OpenAI en config-local.js o variables de entorno');
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

Devuelve ÚNICAMENTE un JSON válido con esta estructura exacta:`;

        const userPrompt = `
TEXTO DEL ESTADO DE CUENTA:
${text}

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

        // Llamar a OpenAI API
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
            })
        });

        if (!response.ok) {
            throw new Error(`Error en OpenAI API: ${response.status} ${response.statusText}`);
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
        console.error('❌ Error analizando con OpenAI:', error.message);
        throw error;
    }
}


// ==================== EXPORTAR FUNCIONES ====================

module.exports = {
    extractTextFromPDF,
    analyzeTextWithAI
};
