/**
 * 🤖 SERVICIO UNIFICADO DE IA - FEDE LIFE
 *
 * Servicio completo de IA con acceso a todos los datos del sistema
 * Incluye análisis de PDFs, chat inteligente, diagnósticos financieros y consultas profundas
 * Autor: Senior Backend Developer
 *
 * FUNCIONALIDADES:
 * - Análisis de PDFs con IA
 * - Chat financiero inteligente con contexto completo
 * - Diagnósticos financieros avanzados
 * - Consultas profundas con datos históricos
 * - Acceso unificado a base de datos completa
 */

const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');

// Importar modelos de la base de datos
const User = require('../models/User');
const Transaction = require('../models/Transaction');
const Category = require('../models/Category');
const Goal = require('../models/Goal');

// ==================== CONFIGURACIÓN ====================

// Configuración de OpenAI
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const OPENAI_API_URL = 'https://api.openai.com/v1/chat/completions';

if (!OPENAI_API_KEY) {
    console.error('❌ ERROR: OPENAI_API_KEY no está configurada en las variables de entorno');
    console.error('💡 Configura OPENAI_API_KEY en tu archivo .env');
}

// ==================== FUNCIONES DE UTILIDAD ====================

/**
 * Función de utilidad para esperar antes de reintentar por rate limit
 * @param {number} retryAfter - Segundos a esperar (del header retry-after)
 * @returns {Promise} Promesa que se resuelve después del delay
 */
async function waitForRetry(retryAfter) {
    const delay = (retryAfter || 60) * 1000; // Convertir a ms, default 60 segundos
    console.log(`⏳ Rate limit excedido. Esperando ${delay / 1000} segundos antes de continuar...`);
    await new Promise(resolve => setTimeout(resolve, delay));
    console.log('✅ Reintentando análisis después del rate limit...');
}

/**
 * Obtiene las categorías de gastos disponibles desde la base de datos
 * @param {string} userId - ID del usuario (opcional, para categorías personalizadas)
 * @returns {Promise<Array>} Array de categorías de gastos
 */
async function getExpenseCategories(userId = null) {
    try {
        // Categorías por defecto del sistema
        const defaultCategories = [
            { name: 'Alimentación', description: 'supermercados, restaurantes, comida, delivery' },
            { name: 'Transporte', description: 'combustible, taxis, transporte público, Uber, mecánico' },
            { name: 'Servicios', description: 'internet, teléfono, luz, agua, gas, cable, seguros' },
            { name: 'Entretenimiento', description: 'cine, juegos, streaming, hobbies, deportes, bares' },
            { name: 'Salud', description: 'médicos, farmacias, seguros médicos, clínicas, laboratorios' },
            { name: 'Educación', description: 'cursos, libros, material educativo, universidades' },
            { name: 'Ropa', description: 'vestimenta, calzado, accesorios, limpieza de ropa' },
            { name: 'Otros Gastos', description: 'SOLO para gastos que NO encajan en ninguna categoría anterior' }
        ];

        // Si se proporciona userId, también obtener categorías personalizadas
        if (userId) {
            try {
                const customCategories = await Category.find({
                    userId: userId,
                    type: 'expense',
                    isActive: true
                }).select('name description').lean();

                // Combinar categorías por defecto con personalizadas
                const userCategories = [...defaultCategories];
                
                customCategories.forEach(customCat => {
                    // Solo agregar si no existe ya en las por defecto
                    if (!defaultCategories.some(defCat => defCat.name === customCat.name)) {
                        userCategories.push({
                            name: customCat.name,
                            description: customCat.description || 'Categoría personalizada'
                        });
                    }
                });

                return userCategories;
            } catch (error) {
                console.warn('⚠️ Error obteniendo categorías personalizadas, usando solo las por defecto:', error.message);
                return defaultCategories;
            }
        }

        return defaultCategories;
    } catch (error) {
        console.error('❌ Error obteniendo categorías de gastos:', error);
        // Fallback a categorías hardcoded
        return [
            { name: 'Alimentación', description: 'supermercados, restaurantes, comida' },
            { name: 'Transporte', description: 'combustible, taxis, transporte público' },
            { name: 'Servicios', description: 'internet, teléfono, luz, agua, gas' },
            { name: 'Entretenimiento', description: 'cine, juegos, streaming' },
            { name: 'Salud', description: 'médicos, farmacias, seguros médicos' },
            { name: 'Educación', description: 'cursos, libros, material educativo' },
            { name: 'Ropa', description: 'vestimenta, calzado' },
            { name: 'Otros Gastos', description: 'gastos que no encajan en otras categorías' }
        ];
    }
}

/**
 * Valida y corrige las categorías en el resultado del análisis de IA
 * @param {Object} aiResult - Resultado del análisis de IA
 * @param {Array} validCategories - Array de categorías válidas
 * @returns {Object} Resultado corregido con categorías válidas
 */
function validateAndCorrectCategories(aiResult, validCategories) {
    try {
        if (!aiResult || !aiResult.expenses || !Array.isArray(aiResult.expenses)) {
            console.warn('⚠️ Resultado de IA inválido, no se puede validar categorías');
            return aiResult;
        }

        const validCategoryNames = validCategories.map(cat => cat.name);
        let correctedCount = 0;

        // Validar y corregir cada gasto
        aiResult.expenses.forEach(expense => {
            if (!expense.category) {
                expense.category = 'Otros Gastos';
                correctedCount++;
                return;
            }

            // Verificar si la categoría es válida
            const isValidCategory = validCategoryNames.includes(expense.category);
            
            if (!isValidCategory) {
                console.warn(`⚠️ Categoría inválida encontrada: "${expense.category}" para gasto: ${expense.description}`);
                
                // Intentar encontrar categoría similar
                const lowerCategory = expense.category.toLowerCase();
                let correctedCategory = 'Otros Gastos';
                
                // Mapear categorías comunes mal escritas
                const categoryMappings = {
                    'alimentacion': 'Alimentación',
                    'comida': 'Alimentación',
                    'supermercado': 'Alimentación',
                    'restaurant': 'Alimentación',
                    'restaurante': 'Alimentación',
                    'transporte': 'Transporte',
                    'taxi': 'Transporte',
                    'combustible': 'Transporte',
                    'servicios': 'Servicios',
                    'internet': 'Servicios',
                    'telefono': 'Servicios',
                    'luz': 'Servicios',
                    'agua': 'Servicios',
                    'entretenimiento': 'Entretenimiento',
                    'cine': 'Entretenimiento',
                    'streaming': 'Entretenimiento',
                    'salud': 'Salud',
                    'medico': 'Salud',
                    'farmacia': 'Salud',
                    'educacion': 'Educación',
                    'educación': 'Educación',
                    'curso': 'Educación',
                    'libro': 'Educación',
                    'ropa': 'Ropa',
                    'vestimenta': 'Ropa',
                    'calzado': 'Ropa',
                    'otros': 'Otros Gastos',
                    'otros gastos': 'Otros Gastos'
                };

                // Buscar mapeo directo
                if (categoryMappings[lowerCategory]) {
                    correctedCategory = categoryMappings[lowerCategory];
                } else {
                    // Buscar coincidencia parcial
                    for (const [key, value] of Object.entries(categoryMappings)) {
                        if (lowerCategory.includes(key) || key.includes(lowerCategory)) {
                            correctedCategory = value;
                            break;
                        }
                    }
                }

                console.log(`🔧 Corrigiendo categoría "${expense.category}" → "${correctedCategory}"`);
                expense.category = correctedCategory;
                correctedCount++;
            }
        });

        if (correctedCount > 0) {
            console.log(`✅ Se corrigieron ${correctedCount} categorías inválidas`);
        }

        return aiResult;

    } catch (error) {
        console.error('❌ Error validando categorías:', error);
        return aiResult; // Devolver resultado original si hay error
    }
}

// ==================== FUNCIONES PRINCIPALES ====================



/**
 * Analiza texto con OpenAI (GPT)
 * @param {string} text - Texto a analizar
 * @param {string} userId - ID del usuario (para contexto)
 * @returns {Promise<Object>} Análisis de gastos
 */
async function analyzeTextWithAI(text, userId) {
    // Guardar referencia al texto original para usar en estrategias de respaldo
    const originalText = text;

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

        // Obtener categorías dinámicamente desde la base de datos
        console.log('📂 Obteniendo categorías desde la base de datos...');
        const categories = await getExpenseCategories(userId);
        
        // Construir la lista de categorías para el prompt
        const categoryList = categories.map(cat => `   - ${cat.name} (${cat.description})`).join('\n');
        
        console.log(`📂 Se encontraron ${categories.length} categorías disponibles para categorización`);

        // Preparar prompt para OpenAI
        const systemPrompt = `Eres un analista financiero experto especializado en el análisis de estados de cuenta bancarios uruguayos.

Tu tarea es analizar el texto de un estado de cuenta y extraer TODAS las transacciones de gastos identificadas.

INSTRUCCIONES CRÍTICAS - LEE CON ATENCIÓN:
1. Identifica ÚNICAMENTE transacciones que son GASTOS (no ingresos, depósitos, transferencias entrantes, pagos, saldos)
2. Extrae TODAS las transacciones de gastos sin excepción - no resumas ni selecciones solo "principales"
3. Si hay 50 gastos, incluye los 50. Si hay 100, incluye los 100.
4. Para cada gasto extrae: descripción, monto, fecha
5. Categoriza cada gasto según EXACTAMENTE estas categorías de la base de datos (USA LOS NOMBRES EXACTOS):
${categoryList}

REGLA CRÍTICA DE CATEGORIZACIÓN: 
- NUNCA uses "Otros" como categoría, usa "Otros Gastos"
- NUNCA inventes categorías nuevas, usa SOLO las categorías listadas arriba
- Si un gasto puede estar en dos categorías, elige la más específica
- EVITA poner gastos en "Otros Gastos" a menos que realmente no encajen en ninguna otra

6. DETECCIÓN AUTOMÁTICA DE MONEDA (regla estricta):
   - Si el monto es MENOR a $150, automáticamente es USD (dólares)
   - Si el monto es MAYOR o IGUAL a $150, automáticamente es UYU (pesos uruguayos)
   - NO cambies esta regla por ningún motivo
7. Las fechas pueden estar en formato DD/MM/YYYY, DD-MM-YY, DD-MM-YYYY o MM/DD/YYYY
8. NO incluyas transacciones que no sean gastos reales
9. IGNORA completamente cualquier texto relacionado con "REDIVA", pagos, depósitos, transferencias entrantes
10. Para montos con decimales, usa el punto como separador decimal

IMPORTANTE: Lista TODAS las transacciones encontradas. Si el texto contiene 30 gastos, tu JSON debe tener 30 elementos en el array "expenses".

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
                max_tokens: 8000, // Aumentado para procesar todas las transacciones
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
                // Intentar extraer información de rate limiting de los headers
                const retryAfter = response.headers.get('retry-after');
                const limitRequests = response.headers.get('x-ratelimit-limit-requests');
                const remainingRequests = response.headers.get('x-ratelimit-remaining-requests');
                const limitTokens = response.headers.get('x-ratelimit-limit-tokens');
                const remainingTokens = response.headers.get('x-ratelimit-remaining-tokens');

                let errorMessage = 'Límite de uso de OpenAI excedido. ';

                if (retryAfter) {
                    errorMessage += `Reintenta en ${retryAfter} segundos. `;
                } else {
                    errorMessage += 'Intenta más tarde. ';
                }

                if (remainingRequests && limitRequests) {
                    errorMessage += `Solicitudes restantes: ${remainingRequests}/${limitRequests}. `;
                }

                if (remainingTokens && limitTokens) {
                    errorMessage += `Tokens restantes: ${remainingTokens}/${limitTokens}. `;
                }

                errorMessage += 'Verifica tu plan de OpenAI y límites de uso.';

                // Agregar sugerencias específicas para el usuario
                errorMessage += '\n\n💡 Sugerencias:';
                errorMessage += '\n• Espera el tiempo indicado antes de reintentar';
                errorMessage += '\n• Revisa tu plan de OpenAI en https://platform.openai.com/account/billing';
                errorMessage += '\n• Considera actualizar tu plan para límites más altos';
                errorMessage += '\n• Si tienes mucho saldo, verifica que tu API key sea correcta';

                throw new Error(errorMessage);
            } else if (response.status === 500 || response.status === 502 || response.status === 503 || response.status === 504) {
                console.warn(`⚠️ Error de conectividad OpenAI (${response.status}): ${response.statusText}`);
                console.log('🔄 Activando estrategia de respaldo debido a error de conectividad');

                // En lugar de lanzar error, devolver los datos originales
                if (originalText && typeof originalText === 'string' && originalText.includes(' - ')) {
                    console.log('📊 Usando estrategia de respaldo por error de conectividad');

                    const lines = originalText.split('\n');
                    const originalExpenses = [];

                    for (const line of lines) {
                        if (line && typeof line === 'string' && line.includes(' - $')) {
                            try {
                                const parts = line.split(' - ');
                                if (parts.length >= 2) {
                                    const [date, rest] = parts;
                                    const [description, amountStr] = rest.split(' - $');

                                    if (description && amountStr) {
                                        const amount = parseFloat(amountStr.trim());
                                        if (!isNaN(amount) && amount > 0) {
                                            originalExpenses.push({
                                                description: description.trim(),
                                                amount: amount,
                                                currency: amount < 150 ? 'USD' : 'UYU',
                                                category: 'Otros Gastos',
                                                date: date.trim(),
                                                confidence: 0.6
                                            });
                                        }
                                    }
                                }
                            } catch (e) {
                                console.warn('⚠️ Error procesando línea original:', line);
                            }
                        }
                    }

                    if (originalExpenses.length > 0) {
                        return {
                            expenses: originalExpenses,
                            summary: {
                                totalExpenses: originalExpenses.reduce((sum, exp) => sum + exp.amount, 0),
                                currency: 'UYU',
                                expenseCount: originalExpenses.length
                            }
                        };
                    }
                }

                throw new Error(`Error de conectividad OpenAI (${response.status}): ${response.statusText}`);
            } else {
                throw new Error(`Error en OpenAI API (${response.status}): ${response.statusText}`);
            }
        }

        const data = await response.json();
        const aiResponse = data.choices[0].message.content;

        console.log('✅ Respuesta de OpenAI recibida');

        // Intentar parsear el JSON de la respuesta con múltiples estrategias de recuperación
        let result;
        try {
            // Estrategia 1: Parseo directo
            const cleanResponse = aiResponse.trim();
            result = JSON.parse(cleanResponse);

            // Validar estructura
            if (!result.expenses || !Array.isArray(result.expenses)) {
                throw new Error('Estructura de respuesta inválida');
            }

            return result;

        } catch (parseError) {
            console.error('❌ Error parseando respuesta de OpenAI:', parseError);
            console.log('Longitud de respuesta:', aiResponse.length);
            console.log('Respuesta cruda (primeros 500 chars):', aiResponse.substring(0, 500));
            console.log('Respuesta cruda (últimos 500 chars):', aiResponse.substring(Math.max(0, aiResponse.length - 500)));

            // Estrategia 2: Intentar extraer JSON válido de la respuesta
            const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                try {
                    console.log('🔄 Intentando estrategia 1: Extracción de JSON con regex');
                    result = JSON.parse(jsonMatch[0]);
                    if (result.expenses && Array.isArray(result.expenses)) {
                        return result;
                    }
                } catch (secondParseError) {
                    console.error('❌ Estrategia 1 falló:', secondParseError);
                }
            }

            // Estrategia 3: Intentar reparar JSON truncado
            try {
                console.log('🔄 Intentando estrategia 2: Reparación de JSON truncado');
                let repairedJson = aiResponse.trim();

                // Si termina con coma, intentar cerrar el array/objeto
                if (repairedJson.endsWith(',')) {
                    repairedJson = repairedJson.slice(0, -1) + '}';
                }

                // Si parece incompleto, intentar completar
                if (!repairedJson.endsWith('}')) {
                    repairedJson += '}';
                }

                // Intentar agregar la estructura faltante si es necesario
                if (!repairedJson.includes('"expenses"')) {
                    repairedJson = '{"expenses": [], "summary": {"totalExpenses": 0, "currency": "UYU", "expenseCount": 0}}';
                } else if (repairedJson.includes('"expenses"') && !repairedJson.includes('"summary"')) {
                    repairedJson = repairedJson.replace(/}$/, ',"summary": {"totalExpenses": 0, "currency": "UYU", "expenseCount": 0}}');
                }

                result = JSON.parse(repairedJson);
                if (result.expenses && Array.isArray(result.expenses)) {
                    console.log('✅ JSON reparado exitosamente');
                    return result;
                }
            } catch (repairError) {
                console.error('❌ Estrategia 2 falló:', repairError);
            }

            // Estrategia 4: Extraer gastos individuales si el JSON completo falla
            try {
                console.log('🔄 Intentando estrategia 3: Extracción manual de gastos');
                const expenseMatches = aiResponse.match(/"description"\s*:\s*"([^"]+)"\s*,\s*"amount"\s*:\s*([0-9.]+)\s*,\s*"currency"\s*:\s*"([^"]+)"\s*,\s*"category"\s*:\s*"([^"]+)"\s*,\s*"date"\s*:\s*"([^"]+)"/g);

                if (expenseMatches && expenseMatches.length > 0) {
                    const expenses = expenseMatches.map(match => {
                        const [, description, amount, currency, category, date] = match.match(/"description"\s*:\s*"([^"]+)"\s*,\s*"amount"\s*:\s*([0-9.]+)\s*,\s*"currency"\s*:\s*"([^"]+)"\s*,\s*"category"\s*:\s*"([^"]+)"\s*,\s*"date"\s*:\s*"([^"]+)"/);
                        return {
                            description: description || 'Sin descripción',
                            amount: parseFloat(amount) || 0,
                            currency: currency || 'UYU',
                            category: category || 'Otros',
                            date: date || new Date().toISOString().split('T')[0],
                            confidence: 0.8
                        };
                    });

                    result = {
                        expenses,
                        summary: {
                            totalExpenses: expenses.reduce((sum, exp) => sum + exp.amount, 0),
                            currency: 'UYU',
                            expenseCount: expenses.length
                        }
                    };

                    console.log('✅ Extracción manual exitosa:', expenses.length, 'gastos encontrados');
                    return result;
                }
            } catch (manualError) {
                console.error('❌ Estrategia 3 falló:', manualError);
            }

            // Estrategia 4: Última opción - devolver los datos originales sin procesar por OpenAI
            console.log('🔄 Intentando estrategia 4: Devolución de datos originales');

            // Si no pudimos parsear la respuesta de OpenAI, devolver los gastos originales
            // que se extrajeron del CSV antes de enviarlos a OpenAI
            if (originalText && typeof originalText === 'string' && originalText.includes(' - ')) {
                console.log('📊 Usando estrategia de respaldo: devolver gastos originales del CSV');

                // Extraer gastos del texto original que se envió a OpenAI
                const lines = originalText.split('\n');
                const originalExpenses = [];

                for (const line of lines) {
                    if (line.includes(' - $')) {
                        try {
                            const parts = line.split(' - ');
                            if (parts.length >= 2) {
                                const [date, rest] = parts;
                                const [description, amountStr] = rest.split(' - $');

                                if (description && amountStr) {
                                    const amount = parseFloat(amountStr.trim());
                                    if (!isNaN(amount) && amount > 0) {
                                        originalExpenses.push({
                                            description: description.trim(),
                                            amount: amount,
                                            currency: amount < 150 ? 'USD' : 'UYU',
                                            category: 'Otros Gastos',
                                            date: date.trim(),
                                            confidence: 0.7
                                        });
                                    }
                                }
                            }
                        } catch (e) {
                            console.warn('⚠️ Error procesando línea original:', line);
                        }
                    }
                }

                if (originalExpenses.length > 0) {
                    result = {
                        expenses: originalExpenses,
                        summary: {
                            totalExpenses: originalExpenses.reduce((sum, exp) => sum + exp.amount, 0),
                            currency: 'UYU',
                            expenseCount: originalExpenses.length
                        }
                    };
                    console.log('✅ Estrategia de respaldo exitosa:', originalExpenses.length, 'gastos devueltos');
                    return result;
                }
            }

            console.error('❌ Todas las estrategias de parseo fallaron');
            throw new Error('No se pudo parsear la respuesta de OpenAI. Se perdieron algunos datos, pero el sistema funcionó parcialmente.');
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
 * Analiza texto con OpenAI usando API Key proporcionada por el usuario
 * @param {string} text - Texto a analizar
 * @param {string} userApiKey - API Key proporcionada por el usuario
 * @param {string} userId - ID del usuario (para contexto)
 * @returns {Promise<Object>} Análisis de gastos
 */
async function analyzeTextWithUserKey(text, userApiKey, userId) {
    // Guardar referencia al texto original para usar en estrategias de respaldo
    const originalText = text;

    try {
        console.log('🤖 Analizando texto con OpenAI (API Key del usuario)...');

        // Verificar que tenemos la API key del usuario
        if (!userApiKey) {
            throw new Error('API Key del usuario no proporcionada');
        }

        // Validar formato de la API key
        if (!userApiKey.startsWith('sk-proj-') && !userApiKey.startsWith('sk-')) {
            throw new Error('La API Key proporcionada no tiene el formato correcto. Debe comenzar con "sk-proj-" o "sk-"');
        }

        console.log('🔑 API Key del usuario validada correctamente');

        // Nota: El filtro REDIVA fue removido según los requerimientos
        console.log('🔍 Filtro REDIVA omitido (función eliminada)');

        // Obtener categorías dinámicamente desde la base de datos
        console.log('📂 Obteniendo categorías para análisis CSV...');
        const categories = await getExpenseCategories(); // Sin userId para CSV público
        
        // Construir la lista de categorías para el prompt
        const categoryList = categories.map(cat => `   - ${cat.name} (${cat.description})`).join('\n');
        
        console.log(`📂 Se encontraron ${categories.length} categorías disponibles para CSV`);

        // Preparar prompt para OpenAI
        const systemPrompt = `Eres un analista financiero experto especializado en el análisis de estados de cuenta bancarios uruguayos.

Tu tarea es analizar el texto de un estado de cuenta y extraer todos los gastos identificados.

INSTRUCCIONES IMPORTANTES:
1. Identifica ÚNICAMENTE transacciones que son GASTOS (no ingresos, depósitos, transferencias entrantes)
2. Extrae el monto, descripción y fecha de cada gasto
3. Categoriza cada gasto según EXACTAMENTE estas categorías de la base de datos (USA LOS NOMBRES EXACTOS):
${categoryList}

REGLA CRÍTICA DE CATEGORIZACIÓN: 
- NUNCA uses "Otros" como categoría, usa "Otros Gastos"
- NUNCA inventes categorías nuevas, usa SOLO las categorías listadas arriba
- Si un gasto puede estar en dos categorías, elige la más específica
- EVITA poner gastos en "Otros Gastos" a menos que realmente no encajen en ninguna otra
4. Si no puedes determinar la categoría, usa "Otros Gastos"
5. DETECCIÓN AUTOMÁTICA DE MONEDA:
   - Si el monto es MENOR a $150, automáticamente es USD (dólares)
   - Si el monto es MAYOR o IGUAL a $150, automáticamente es UYU (pesos uruguayos)
   - NO cambies esta regla por ningún motivo
6. Las fechas pueden estar en formato DD/MM/YYYY, DD-MM-YY, DD-MM-YYYY o MM/DD/YYYY
7. NO incluyas transacciones que no sean gastos
8. IGNORA completamente cualquier texto relacionado con "REDIVA" o transacciones que contengan esta palabra
9. Para montos con decimales, usa el punto como separador decimal

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

        // Configurar AbortController para timeout
        const controller = new AbortController();
        const timeoutId = setTimeout(() => {
            controller.abort();
        }, 30000); // 30 segundos timeout

        console.log('🚀 Enviando solicitud a OpenAI API con API Key del usuario...');

        // Llamar a OpenAI API con la API key del usuario
        const response = await fetch(OPENAI_API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${userApiKey}` // Usar API key del usuario
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
                max_tokens: 8000, // Aumentado para procesar todas las transacciones
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
                throw new Error('API Key del usuario inválida o expirada. Verifica tu API Key de OpenAI.');
            } else if (response.status === 429) {
                // Intentar extraer información de rate limiting de los headers
                const retryAfter = response.headers.get('retry-after');
                const limitRequests = response.headers.get('x-ratelimit-limit-requests');
                const remainingRequests = response.headers.get('x-ratelimit-remaining-requests');
                const limitTokens = response.headers.get('x-ratelimit-limit-tokens');
                const remainingTokens = response.headers.get('x-ratelimit-remaining-tokens');

                let errorMessage = 'Límite de uso de OpenAI excedido. ';

                if (retryAfter) {
                    errorMessage += `Reintenta en ${retryAfter} segundos. `;
                } else {
                    errorMessage += 'Intenta más tarde. ';
                }

                if (remainingRequests && limitRequests) {
                    errorMessage += `Solicitudes restantes: ${remainingRequests}/${limitRequests}. `;
                }

                if (remainingTokens && limitTokens) {
                    errorMessage += `Tokens restantes: ${remainingTokens}/${limitTokens}. `;
                }

                errorMessage += 'Verifica tu plan de OpenAI y límites de uso.';

                // Agregar sugerencias específicas para el usuario
                errorMessage += '\n\n💡 Sugerencias:';
                errorMessage += '\n• Espera el tiempo indicado antes de reintentar';
                errorMessage += '\n• Revisa tu plan de OpenAI en https://platform.openai.com/account/billing';
                errorMessage += '\n• Considera actualizar tu plan para límites más altos';
                errorMessage += '\n• Si tienes mucho saldo, verifica que tu API key sea correcta';

                throw new Error(errorMessage);
            } else if (response.status === 500 || response.status === 502 || response.status === 503 || response.status === 504) {
                console.warn(`⚠️ Error de conectividad OpenAI (${response.status}): ${response.statusText}`);
                console.log('🔄 Activando estrategia de respaldo debido a error de conectividad');

                // En lugar de lanzar error, devolver los datos originales
                if (originalText && typeof originalText === 'string' && originalText.includes(' - ')) {
                    console.log('📊 Usando estrategia de respaldo por error de conectividad');

                    const lines = originalText.split('\n');
                    const originalExpenses = [];

                    for (const line of lines) {
                        if (line && typeof line === 'string' && line.includes(' - $')) {
                            try {
                                const parts = line.split(' - ');
                                if (parts.length >= 2) {
                                    const [date, rest] = parts;
                                    const [description, amountStr] = rest.split(' - $');

                                    if (description && amountStr) {
                                        const amount = parseFloat(amountStr.trim());
                                        if (!isNaN(amount) && amount > 0) {
                                            originalExpenses.push({
                                                description: description.trim(),
                                                amount: amount,
                                                currency: amount < 150 ? 'USD' : 'UYU',
                                                category: 'Otros Gastos',
                                                date: date.trim(),
                                                confidence: 0.6
                                            });
                                        }
                                    }
                                }
                            } catch (e) {
                                console.warn('⚠️ Error procesando línea original:', line);
                            }
                        }
                    }

                    if (originalExpenses.length > 0) {
                        return {
                            expenses: originalExpenses,
                            summary: {
                                totalExpenses: originalExpenses.reduce((sum, exp) => sum + exp.amount, 0),
                                currency: 'UYU',
                                expenseCount: originalExpenses.length
                            }
                        };
                    }
                }

                throw new Error(`Error de conectividad OpenAI (${response.status}): ${response.statusText}`);
            } else {
                throw new Error(`Error en OpenAI API (${response.status}): ${response.statusText}`);
            }
        }

        const data = await response.json();
        const aiResponse = data.choices[0].message.content;

        console.log('✅ Respuesta de OpenAI recibida con API Key del usuario');

        // Intentar parsear el JSON de la respuesta con múltiples estrategias de recuperación
        let result;
        try {
            // Estrategia 1: Parseo directo
            const cleanResponse = aiResponse.trim();
            result = JSON.parse(cleanResponse);

            // Validar estructura
            if (!result.expenses || !Array.isArray(result.expenses)) {
                throw new Error('Estructura de respuesta inválida');
            }

            return result;

        } catch (parseError) {
            console.error('❌ Error parseando respuesta de OpenAI:', parseError);
            console.log('Longitud de respuesta:', aiResponse.length);
            console.log('Respuesta cruda (primeros 500 chars):', aiResponse.substring(0, 500));
            console.log('Respuesta cruda (últimos 500 chars):', aiResponse.substring(Math.max(0, aiResponse.length - 500)));

            // Estrategia 2: Intentar extraer JSON válido de la respuesta con mejor regex
            const jsonMatches = aiResponse.match(/\{[\s\S]*?\}(?=\s*$|\s*[^}])/g);
            if (jsonMatches && jsonMatches.length > 0) {
                for (let i = 0; i < jsonMatches.length; i++) {
                    try {
                        console.log(`🔄 Intentando estrategia 1: Extracción de JSON ${i + 1}/${jsonMatches.length}`);
                        result = JSON.parse(jsonMatches[i]);
                        if (result.expenses && Array.isArray(result.expenses)) {
                            console.log('✅ JSON válido encontrado en estrategia 1');
                            return result;
                        }
                    } catch (secondParseError) {
                        console.error(`❌ JSON ${i + 1} inválido:`, secondParseError.message);
                    }
                }
            }

            // Estrategia 3: Mejorar la reparación de JSON truncado
            try {
                console.log('🔄 Intentando estrategia 2: Reparación avanzada de JSON');
                let repairedJson = aiResponse.trim();

                // Limpiar caracteres problemáticos al final
                repairedJson = repairedJson.replace(/,\s*$/, ''); // Remover coma final
                repairedJson = repairedJson.replace(/\s*}\s*$/, ''); // Remover llave final si existe

                // Intentar encontrar el final válido del JSON
                const lastValidBrace = repairedJson.lastIndexOf('}');
                if (lastValidBrace > 0) {
                    repairedJson = repairedJson.substring(0, lastValidBrace + 1);
                }

                // Intentar completar el JSON
                if (!repairedJson.includes('"summary"')) {
                    repairedJson = repairedJson.replace(/}$/, ',"summary": {"totalExpenses": 0, "currency": "UYU", "expenseCount": 0}}');
                }

                // Si no tiene expenses, crear estructura básica
                if (!repairedJson.includes('"expenses"')) {
                    repairedJson = '{"expenses": [], "summary": {"totalExpenses": 0, "currency": "UYU", "expenseCount": 0}}';
                }

                result = JSON.parse(repairedJson);
                if (result && typeof result === 'object') {
                    // Validar que tenga la estructura esperada
                    if (!result.expenses) result.expenses = [];
                    if (!result.summary) result.summary = { totalExpenses: 0, currency: 'UYU', expenseCount: 0 };

                    // Calcular summary si expenses existe
                    if (result.expenses && Array.isArray(result.expenses)) {
                        const total = result.expenses.reduce((sum, exp) => sum + (exp.amount || 0), 0);
                        result.summary.totalExpenses = total;
                        result.summary.expenseCount = result.expenses.length;
                        console.log('✅ JSON reparado exitosamente con', result.expenses.length, 'gastos');
                        return result;
                    }
                }
            } catch (repairError) {
                console.error('❌ Estrategia 2 falló:', repairError.message);
            }

            // Estrategia 4: Intentar extraer datos de expenses directamente
            try {
                console.log('🔄 Intentando estrategia 3: Extracción directa de expenses');
                const expensesMatch = aiResponse.match(/"expenses"\s*:\s*\[([\s\S]*?)\]/);
                if (expensesMatch) {
                    const expensesString = expensesMatch[1];
                    console.log('📊 Expenses string encontrado, intentando parsear...');

                    // Intentar parsear como array
                    const expenseMatches = expensesString.match(/\{[^}]*\}/g);
                    if (expenseMatches) {
                        const expenses = [];
                        for (const expenseStr of expenseMatches) {
                            try {
                                const expense = JSON.parse(expenseStr);
                                if (expense.description && expense.amount) {
                                    expenses.push(expense);
                                }
                            } catch (e) {
                                console.warn('⚠️ No se pudo parsear expense individual:', expenseStr.substring(0, 100));
                            }
                        }

                        if (expenses.length > 0) {
                            result = {
                                expenses: expenses,
                                summary: {
                                    totalExpenses: expenses.reduce((sum, exp) => sum + (exp.amount || 0), 0),
                                    currency: 'UYU',
                                    expenseCount: expenses.length
                                }
                            };
                            console.log('✅ Extracción directa exitosa:', expenses.length, 'gastos encontrados');
                            return result;
                        }
                    }
                }
            } catch (directError) {
                console.error('❌ Estrategia 3 falló:', directError.message);
            }

            // Estrategia 4: Extraer gastos individuales si el JSON completo falla
            try {
                console.log('🔄 Intentando estrategia 3: Extracción manual de gastos');
                const expenseMatches = aiResponse.match(/"description"\s*:\s*"([^"]+)"\s*,\s*"amount"\s*:\s*([0-9.]+)\s*,\s*"currency"\s*:\s*"([^"]+)"\s*,\s*"category"\s*:\s*"([^"]+)"\s*,\s*"date"\s*:\s*"([^"]+)"/g);

                if (expenseMatches && expenseMatches.length > 0) {
                    const expenses = expenseMatches.map(match => {
                        const [, description, amount, currency, category, date] = match.match(/"description"\s*:\s*"([^"]+)"\s*,\s*"amount"\s*:\s*([0-9.]+)\s*,\s*"currency"\s*:\s*"([^"]+)"\s*,\s*"category"\s*:\s*"([^"]+)"\s*,\s*"date"\s*:\s*"([^"]+)"/);
                        return {
                            description: description || 'Sin descripción',
                            amount: parseFloat(amount) || 0,
                            currency: currency || 'UYU',
                            category: category || 'Otros',
                            date: date || new Date().toISOString().split('T')[0],
                            confidence: 0.8
                        };
                    });

                    result = {
                        expenses,
                        summary: {
                            totalExpenses: expenses.reduce((sum, exp) => sum + exp.amount, 0),
                            currency: 'UYU',
                            expenseCount: expenses.length
                        }
                    };

                    console.log('✅ Extracción manual exitosa:', expenses.length, 'gastos encontrados');
                    return result;
                }
            } catch (manualError) {
                console.error('❌ Estrategia 3 falló:', manualError);
            }

            // Estrategia 4: Última opción - devolver los datos originales sin procesar por OpenAI
            console.log('🔄 Intentando estrategia 4: Devolución de datos originales');

            // Si no pudimos parsear la respuesta de OpenAI, devolver los gastos originales
            // que se extrajeron del CSV antes de enviarlos a OpenAI
            if (originalText && typeof originalText === 'string' && originalText.includes(' - ')) {
                console.log('📊 Usando estrategia de respaldo: devolver gastos originales del CSV');

                // Extraer gastos del texto original que se envió a OpenAI
                const lines = originalText.split('\n');
                const originalExpenses = [];

                for (const line of lines) {
                    if (line.includes(' - $')) {
                        try {
                            const parts = line.split(' - ');
                            if (parts.length >= 2) {
                                const [date, rest] = parts;
                                const [description, amountStr] = rest.split(' - $');

                                if (description && amountStr) {
                                    const amount = parseFloat(amountStr.trim());
                                    if (!isNaN(amount) && amount > 0) {
                                        originalExpenses.push({
                                            description: description.trim(),
                                            amount: amount,
                                            currency: amount < 150 ? 'USD' : 'UYU',
                                            category: 'Otros Gastos',
                                            date: date.trim(),
                                            confidence: 0.7
                                        });
                                    }
                                }
                            }
                        } catch (e) {
                            console.warn('⚠️ Error procesando línea original:', line);
                        }
                    }
                }

                if (originalExpenses.length > 0) {
                    result = {
                        expenses: originalExpenses,
                        summary: {
                            totalExpenses: originalExpenses.reduce((sum, exp) => sum + exp.amount, 0),
                            currency: 'UYU',
                            expenseCount: originalExpenses.length
                        }
                    };
                    console.log('✅ Estrategia de respaldo exitosa:', originalExpenses.length, 'gastos devueltos');
                    return result;
                }
            }

            console.error('❌ Todas las estrategias de parseo fallaron');
            throw new Error('No se pudo parsear la respuesta de OpenAI. Se perdieron algunos datos, pero el sistema funcionó parcialmente.');
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
            console.error('❌ Error analizando con OpenAI (usuario):', error.message);
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

/**
 * Obtiene datos completos del usuario para contexto de IA
 * @param {ObjectId|string} userId - ID del usuario
 * @returns {Promise<Object>} Datos completos del usuario
 */
async function getCompleteUserData(userId) {
    try {
        console.log('📊 Obteniendo datos completos del usuario para contexto de IA...');

        // Obtener información del usuario
        const user = await User.findById(userId).select('+aiApiKey').lean();
        if (!user) {
            throw new Error('Usuario no encontrado');
        }

        // Obtener transacciones del usuario (últimos 12 meses para contexto)
        const twelveMonthsAgo = new Date();
        twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12);

        const transactions = await Transaction.find({
            userId: userId,
            date: { $gte: twelveMonthsAgo }
        })
        .sort({ date: -1 })
        .limit(1000) // Limitar para no sobrecargar
        .lean();

        // Obtener categorías del usuario
        const categories = await Category.find({
            $or: [
                { userId: userId },
                { userId: null, isDefault: true } // Categorías por defecto
            ],
            isActive: true
        }).sort({ type: 1, name: 1 }).lean();

        // Obtener metas del usuario
        const goals = await Goal.find({ userId: userId })
        .sort({ createdAt: -1 })
        .lean();

        // Calcular estadísticas generales
        const stats = await Transaction.getStats(userId);

        // Calcular estadísticas por categoría
        const categoryStats = await Transaction.getCategoryStats(userId);

        // Calcular estadísticas mensuales
        const monthlyStats = await Transaction.getMonthlyStats(
            userId,
            twelveMonthsAgo,
            new Date()
        );

        const completeData = {
            user: {
                id: user._id,
                username: user.username,
                firstName: user.firstName,
                lastName: user.lastName,
                email: user.email,
                currency: user.currency,
                timezone: user.timezone,
                createdAt: user.createdAt,
                lastLogin: user.lastLogin
            },
            transactions: {
                total: transactions.length,
                recent: transactions.slice(0, 50), // Solo las más recientes para contexto
                all: transactions, // Todas las transacciones del período
                stats: stats,
                categoryStats: categoryStats,
                monthlyStats: monthlyStats
            },
            categories: categories,
            goals: goals,
            summary: {
                totalIncome: stats.totalIncome || 0,
                totalExpenses: stats.totalExpenses || 0,
                balance: (stats.totalIncome || 0) - (stats.totalExpenses || 0),
                totalSavings: goals.reduce((sum, goal) => sum + (goal.currentSaved || 0), 0),
                activeGoals: goals.filter(g => !g.completed).length,
                transactionCount: transactions.length,
                categoriesCount: categories.length,
                dataPeriod: 'últimos 12 meses'
            }
        };

        console.log('✅ Datos completos obtenidos para contexto de IA');
        return completeData;

    } catch (error) {
        console.error('❌ Error obteniendo datos completos del usuario:', error);
        throw new Error(`Error obteniendo datos del usuario: ${error.message}`);
    }
}

/**
 * Genera contexto detallado para consultas de IA
 * @param {ObjectId|string} userId - ID del usuario
 * @param {string} queryType - Tipo de consulta (chat, diagnosis, analysis)
 * @returns {Promise<string>} Contexto formateado para IA
 */
async function generateAIContext(userId, queryType = 'general') {
    try {
        const userData = await getCompleteUserData(userId);

        let context = '';

        // Información básica del usuario
        context += `👤 USUARIO: ${userData.user.firstName} ${userData.user.lastName}\n`;
        context += `📧 Email: ${userData.user.email}\n`;
        context += `💱 Moneda preferida: ${userData.user.currency}\n`;
        context += `📅 Miembro desde: ${new Date(userData.user.createdAt).toLocaleDateString('es-UY')}\n\n`;

        // Resumen financiero
        context += `📊 RESUMEN FINANCIERO (últimos 12 meses):\n`;
        context += `- 💰 Ingresos totales: $${userData.summary.totalIncome.toLocaleString('es-UY')} ${userData.user.currency}\n`;
        context += `- 💸 Gastos totales: $${userData.summary.totalExpenses.toLocaleString('es-UY')} ${userData.user.currency}\n`;
        context += `- ⚖️ Balance: $${userData.summary.balance.toLocaleString('es-UY')} ${userData.user.currency}\n`;
        context += `- 🏦 Ahorros totales: $${userData.summary.totalSavings.toLocaleString('es-UY')} ${userData.user.currency}\n`;
        context += `- 📈 Metas activas: ${userData.summary.activeGoals}\n`;
        context += `- 📋 Total de transacciones: ${userData.summary.transactionCount}\n\n`;

        // Metas de ahorro (activas y completadas)
        if (userData.goals.length > 0) {
            const activeGoals = userData.goals.filter(g => !g.completed);
            const completedGoals = userData.goals.filter(g => g.completed);
            
            context += `🎯 METAS DE AHORRO:\n`;
            context += `Total de metas: ${userData.goals.length} (${activeGoals.length} activas, ${completedGoals.length} completadas)\n\n`;
            
            if (activeGoals.length > 0) {
                context += `📍 METAS ACTIVAS:\n`;
                activeGoals.forEach((goal, index) => {
                    const progress = goal.amount > 0 ? Math.round((goal.currentSaved / goal.amount) * 100) : 0;
                    const remainingAmount = goal.amount - (goal.currentSaved || 0);
                    const daysToDeadline = goal.deadline ? Math.ceil((new Date(goal.deadline) - new Date()) / (1000 * 60 * 60 * 24)) : null;
                    
                    context += `${index + 1}. 📝 ${goal.name}\n`;
                    context += `   💰 Meta: $${goal.amount.toLocaleString('es-UY')} ${userData.user.currency}\n`;
                    context += `   💳 Ahorrado: $${(goal.currentSaved || 0).toLocaleString('es-UY')} ${userData.user.currency}\n`;
                    context += `   📊 Progreso: ${progress}% (faltan $${remainingAmount.toLocaleString('es-UY')})\n`;
                    
                    if (goal.deadline) {
                        context += `   📅 Fecha límite: ${new Date(goal.deadline).toLocaleDateString('es-UY')}`;
                        if (daysToDeadline !== null) {
                            if (daysToDeadline > 0) {
                                context += ` (en ${daysToDeadline} días)`;
                            } else if (daysToDeadline === 0) {
                                context += ` (¡HOY!)`;
                            } else {
                                context += ` (⚠️ Vencida hace ${Math.abs(daysToDeadline)} días)`;
                            }
                        }
                        context += '\n';
                    }
                    
                    if (goal.description) {
                        context += `   📄 Descripción: ${goal.description}\n`;
                    }
                    
                    if (goal.priority) {
                        context += `   🔥 Prioridad: ${goal.priority}\n`;
                    }
                    
                    context += '\n';
                });
            }
            
            if (completedGoals.length > 0) {
                context += `✅ METAS COMPLETADAS:\n`;
                completedGoals.slice(0, 5).forEach((goal, index) => { // Solo las últimas 5
                    context += `${index + 1}. ✔️ ${goal.name} - $${goal.amount.toLocaleString('es-UY')} ${userData.user.currency}`;
                    if (goal.completedDate) {
                        context += ` (completada el ${new Date(goal.completedDate).toLocaleDateString('es-UY')})`;
                    }
                    context += '\n';
                });
                if (completedGoals.length > 5) {
                    context += `   ... y ${completedGoals.length - 5} metas completadas más\n`;
                }
                context += '\n';
            }
        }

        // Transacciones recientes (últimas 20)
        if (userData.transactions.recent.length > 0) {
            context += `🗂️ TRANSACCIONES RECIENTES:\n`;
            userData.transactions.recent.slice(0, 20).forEach((transaction, index) => {
                const type = transaction.type === 'income' ? '💰 INGRESO' : '💸 GASTO';
                const currency = transaction.currency || userData.user.currency;
                context += `${index + 1}. ${type} - ${transaction.description}\n`;
                context += `   - Monto: ${currency} $${transaction.amount.toLocaleString('es-UY')}\n`;
                context += `   - Categoría: ${transaction.category}\n`;
                context += `   - Fecha: ${new Date(transaction.date).toLocaleDateString('es-UY')}\n\n`;
            });
        }

        // Estadísticas por categoría
        if (userData.transactions.categoryStats.length > 0) {
            context += `📈 GASTOS POR CATEGORÍA (principales):\n`;
            userData.transactions.categoryStats
                .filter(cat => cat._id && typeof cat._id === 'object' && cat._id.type === 'expense')
                .sort((a, b) => (b.totalAmount || 0) - (a.totalAmount || 0))
                .slice(0, 10)
                .forEach((cat, index) => {
                    context += `${index + 1}. ${cat._id.category}: $${(cat.totalAmount || 0).toLocaleString('es-UY')} ${userData.user.currency}\n`;
                });
            context += '\n';
        }

        // Tendencias mensuales
        if (userData.transactions.monthlyStats.length > 0) {
            context += `📊 TENDENCIAS MENSUALES:\n`;
            userData.transactions.monthlyStats
                .sort((a, b) => {
                    if (a._id.year !== b._id.year) return b._id.year - a._id.year;
                    return b._id.month - a._id.month;
                })
                .slice(0, 6)
                .forEach(month => {
                    const monthName = new Date(month._id.year, month._id.month - 1, 1).toLocaleDateString('es-UY', { month: 'long', year: 'numeric' });
                    context += `${monthName}:\n`;
                    context += `  - Ingresos: $${(month.income || 0).toLocaleString('es-UY')}\n`;
                    context += `  - Gastos: $${(month.expenses || 0).toLocaleString('es-UY')}\n`;
                    context += `  - Balance: $${((month.income || 0) - (month.expenses || 0)).toLocaleString('es-UY')}\n\n`;
                });
        }

        return context;

    } catch (error) {
        console.error('❌ Error generando contexto para IA:', error);
        return 'Error obteniendo contexto del usuario. Información limitada disponible.';
    }
}

/**
 * Procesa consultas avanzadas con IA usando contexto completo
 * @param {string} query - Consulta del usuario
 * @param {ObjectId|string} userId - ID del usuario
 * @param {Object} additionalData - Datos adicionales del frontend
 * @returns {Promise<Object>} Respuesta de la IA con análisis completo
 */
async function processAdvancedQuery(query, userId, additionalData = {}) {
    try {
        console.log('🧠 Procesando consulta avanzada con contexto completo...');
        console.log('👤 UserId:', userId);
        console.log('📊 Additional data:', additionalData ? Object.keys(additionalData) : 'none');

        // Generar contexto completo
        console.log('🔄 Generando contexto de IA...');
        const context = await generateAIContext(userId, 'advanced');
        console.log('✅ Contexto generado, longitud:', context ? context.length : 0, 'caracteres');
        
        // Verificar si el contexto no es demasiado largo y truncar si es necesario
        let finalContext = context;
        if (context && context.length > 50000) {
            console.warn('⚠️ Contexto muy largo, truncando para evitar errores:', context.length, 'caracteres');
            finalContext = context.substring(0, 50000) + '\n\n[CONTEXTO TRUNCADO POR LONGITUD]';
            console.log('✂️ Contexto truncado a:', finalContext.length, 'caracteres');
        }

        // Crear prompt avanzado para la IA
        const systemPrompt = `Eres un Asesor Financiero Personal Inteligente especializado en finanzas uruguayas y planificación de metas de ahorro.
        Tienes acceso a TODA la información financiera del usuario, incluyendo:

        - Historial completo de transacciones (últimos 12 meses)
        - Todas las categorías de gastos e ingresos con análisis detallado
        - Metas de ahorro activas y completadas con progreso específico
        - Estadísticas mensuales y tendencias de ahorro
        - Información personal del usuario y preferencias
        - Análisis de patrones de gastos e ingresos

        ESPECIALIZACIÓN EN METAS DE AHORRO:
        - Analiza el progreso de cada meta individual con fechas específicas
        - Identifica si las metas son realistas basándote en los ingresos y gastos actuales
        - Sugiere estrategias específicas para acelerar el progreso hacia las metas
        - Calcula cuánto debería ahorrar mensualmente para cumplir cada meta a tiempo
        - Identifica gastos que podrían reducirse para aumentar el ahorro
        - Recomienda priorización de metas basada en urgencia y viabilidad

        INSTRUCCIONES ESPECÍFICAS:
        1. Usa TODOS los datos disponibles para dar respuestas precisas y personalizadas
        2. Incluye números específicos, montos, fechas y cálculos concretos
        3. Para consultas sobre metas, proporciona análisis detallado de cada meta activa
        4. Calcula automáticamente cuánto falta ahorrar y en cuánto tiempo
        5. Identifica patrones en gastos que afecten las metas de ahorro
        6. Sugiere ajustes específicos en el presupuesto para acelerar el ahorro
        7. Compara el progreso actual con lo necesario para cumplir las fechas límite
        8. Mantén un tono profesional pero cercano y muy motivador
        9. Si una meta parece inalcanzable, sugiere alternativas realistas
        10. Incluye consejos prácticos y accionables basados en datos reales

        IMPORTANTE: Base todas tus respuestas en los datos reales del usuario. No inventes información. 
        Sé especialmente detallado cuando analices metas de ahorro y proporciona cálculos específicos.`;

        const userPrompt = `Consulta del usuario: "${query}"

        Información financiera completa del usuario:
        ${finalContext}

        ${additionalData ? `Datos adicionales del contexto actual: ${JSON.stringify(additionalData)}` : ''}

        Por favor, analiza esta consulta considerando toda la información financiera disponible y proporciona una respuesta detallada, específica y útil.`;

        // Preparar solicitud a OpenAI
        const controller = new AbortController();
        const timeoutId = setTimeout(() => {
            console.log('⏰ Timeout alcanzado, abortando consulta avanzada...');
            controller.abort();
        }, 45000); // Aumentar timeout a 45 segundos

        console.log('🚀 Enviando solicitud a OpenAI...');
        console.log('📝 Longitud del prompt del usuario:', userPrompt.length, 'caracteres');
        
        const response = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${OPENAI_API_KEY}`
            },
            body: JSON.stringify({
                model: 'gpt-4o-mini',
                messages: [
                    { role: 'system', content: systemPrompt },
                    { role: 'user', content: userPrompt }
                ],
                max_tokens: 2000,
                temperature: 0.7
            }),
            signal: controller.signal
        });

        clearTimeout(timeoutId);
        console.log('📥 Respuesta recibida de OpenAI, status:', response.status);

        if (!response.ok) {
            const errorText = await response.text();
            console.error('❌ Error en OpenAI API:', response.status, errorText);
            throw new Error(`Error en OpenAI API: ${response.status} - ${errorText}`);
        }

        const data = await response.json();
        console.log('📋 Datos de respuesta de OpenAI:', {
            choices: data.choices?.length || 0,
            usage: data.usage || 'no usage info'
        });
        
        const aiResponse = data.choices[0].message.content;
        console.log('✅ Consulta avanzada procesada exitosamente, longitud respuesta:', aiResponse.length);

        return {
            success: true,
            response: aiResponse,
            contextUsed: true,
            dataPoints: {
                transactionsAnalyzed: finalContext.includes('TRANSACCIONES RECIENTES') ? 'sí' : 'no',
                goalsIncluded: finalContext.includes('METAS ACTIVAS') ? 'sí' : 'no',
                categoriesIncluded: finalContext.includes('GASTOS POR CATEGORÍA') ? 'sí' : 'no',
                trendsIncluded: finalContext.includes('TENDENCIAS MENSUALES') ? 'sí' : 'no',
                contextTruncated: finalContext !== context ? 'sí' : 'no',
                contextLength: finalContext.length
            },
            timestamp: new Date().toISOString()
        };

    } catch (error) {
        console.error('❌ Error procesando consulta avanzada:', error);
        
        // Proporcionar más información específica sobre el error
        let errorMessage = 'Lo siento, no pude procesar tu consulta avanzada en este momento.';
        let errorDetails = error.message;
        
        if (error.name === 'AbortError') {
            errorMessage = 'La consulta tardó demasiado en procesarse. Por favor, intenta con una consulta más específica.';
            errorDetails = 'Timeout de 45 segundos alcanzado';
        } else if (error.message?.includes('fetch')) {
            errorMessage = 'Problema de conexión con el servicio de IA. Por favor, intenta nuevamente en unos momentos.';
        } else if (error.message?.includes('API')) {
            errorMessage = 'Error en el servicio de IA. Por favor, contacta al administrador si el problema persiste.';
        }
        
        return {
            success: false,
            response: errorMessage,
            error: errorDetails,
            timestamp: new Date().toISOString()
        };
    }
}

/**
 * Realiza diagnóstico financiero completo con IA
 * @param {ObjectId|string} userId - ID del usuario
 * @param {Object} additionalData - Datos adicionales del frontend
 * @returns {Promise<Object>} Diagnóstico completo con recomendaciones
 */
async function performCompleteFinancialDiagnosis(userId, additionalData = {}) {
    try {
        console.log('🔍 Realizando diagnóstico financiero completo...');

        const context = await generateAIContext(userId, 'diagnosis');
        const userData = await getCompleteUserData(userId);

        const systemPrompt = `Eres un Profesional en Finanzas Personales con 20+ años de experiencia asesorando a individuos y familias en Uruguay.

        Tu especialización incluye:
        - Diagnóstico completo de situaciones financieras
        - Análisis de patrones de gasto problemáticos
        - Recomendaciones personalizadas de ahorro e inversión
        - Estrategias de reducción de deudas
        - Planificación financiera a corto y largo plazo
        - Optimización de presupuestos familiares
        - Asesoramiento en metas de ahorro

        INSTRUCCIONES PARA DIAGNÓSTICO:
        1. Analiza la situación financiera actual de manera profunda y detallada
        2. Identifica fortalezas y áreas de mejora específicas
        3. Proporciona recomendaciones prácticas basadas en datos reales
        4. Incluye análisis de tendencias y patrones históricos
        5. Prioriza estrategias conservadoras y realistas para el contexto uruguayo
        6. Sé específico con números, porcentajes y plazos realistas
        7. Mantén un tono profesional pero accesible y motivador
        8. Incluye metas SMART (Specific, Measurable, Achievable, Relevant, Time-bound)

        ESTRUCTURA DEL DIAGNÓSTICO:
        1. 📊 RESUMEN EJECUTIVO
        2. 💰 ANÁLISIS DE INGRESOS
        3. 💸 ANÁLISIS DE GASTOS
        4. 🎯 EVALUACIÓN DE METAS
        5. 📈 TENDENCIAS Y PATRONES
        6. ✅ FORTALEZAS IDENTIFICADAS
        7. ⚠️ ÁREAS DE MEJORA
        8. 🎯 RECOMENDACIONES ESPECÍFICAS
        9. 📅 PLAN DE ACCIÓN DETALLADO

        IMPORTANTE: Usa TODOS los datos disponibles del usuario para un análisis completo y personalizado.`;

        const userPrompt = `Realiza un diagnóstico financiero completo y detallado basado en toda la información disponible:

        ${context}

        ${additionalData ? `Datos adicionales del contexto actual: ${JSON.stringify(additionalData)}` : ''}

        Por favor, proporciona un diagnóstico profesional completo que incluya análisis detallado, recomendaciones específicas y un plan de acción práctico.`;

        // Preparar solicitud a OpenAI
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 45000); // Más tiempo para diagnósticos

        const response = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${OPENAI_API_KEY}`
            },
            body: JSON.stringify({
                model: 'gpt-4o-mini',
                messages: [
                    { role: 'system', content: systemPrompt },
                    { role: 'user', content: userPrompt }
                ],
                max_tokens: 3000,
                temperature: 0.6
            }),
            signal: controller.signal
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
            throw new Error(`Error en OpenAI API: ${response.status}`);
        }

        const data = await response.json();
        const diagnosis = data.choices[0].message.content;

        console.log('✅ Diagnóstico financiero completo realizado');

        return {
            success: true,
            diagnosis: diagnosis,
            dataAnalyzed: {
                transactions: userData.transactions.total,
                categories: userData.categories.length,
                goals: userData.goals.length,
                timePeriod: 'últimos 12 meses'
            },
            recommendations: {
                // Aquí se podrían extraer recomendaciones específicas del diagnóstico
                generated: true
            },
            timestamp: new Date().toISOString()
        };

    } catch (error) {
        console.error('❌ Error realizando diagnóstico completo:', error);
        return {
            success: false,
            diagnosis: 'No se pudo completar el diagnóstico en este momento.',
            error: error.message,
            timestamp: new Date().toISOString()
        };
    }
}

// ==================== EXPORTAR FUNCIONES ====================

module.exports = {
    // Funciones originales
    analyzeTextWithAI,
    analyzeTextWithUserKey,
    checkOpenAIHealth,

    // Nuevas funciones con acceso completo a datos
    getCompleteUserData,
    generateAIContext,
    processAdvancedQuery,
    performCompleteFinancialDiagnosis,

    // Funciones de utilidad para categorías
    getExpenseCategories,
    validateAndCorrectCategories
};
