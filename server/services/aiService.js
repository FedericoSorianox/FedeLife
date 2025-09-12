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

        // Preparar prompt para OpenAI
        const systemPrompt = `Eres un analista financiero experto especializado en el análisis de estados de cuenta bancarios uruguayos.

Tu tarea es analizar el texto de un estado de cuenta y extraer TODAS las transacciones de gastos identificadas.

INSTRUCCIONES CRÍTICAS - LEE CON ATENCIÓN:
1. Identifica ÚNICAMENTE transacciones que son GASTOS (no ingresos, depósitos, transferencias entrantes, pagos, saldos)
2. Extrae TODAS las transacciones de gastos sin excepción - no resumas ni selecciones solo "principales"
3. Si hay 50 gastos, incluye los 50. Si hay 100, incluye los 100.
4. Para cada gasto extrae: descripción, monto, fecha
5. Categoriza cada gasto según estas categorías disponibles:
   - Alimentación (supermercados, restaurantes, comida)
   - Transporte (combustible, taxis, transporte público)
   - Servicios (internet, teléfono, luz, agua, gas)
   - Entretenimiento (cine, juegos, streaming, hobbies)
   - Salud (médicos, farmacias, seguros médicos)
   - Educación (cursos, libros, material educativo)
   - Ropa (vestimenta, calzado)
   - Otros Gastos (todo lo demás)
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

// ==================== EXPORTAR FUNCIONES ====================

module.exports = {
    analyzeTextWithAI,
    analyzeTextWithUserKey,
    checkOpenAIHealth
};
