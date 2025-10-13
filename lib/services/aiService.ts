/**
 * 🤖 SERVICIO DE IA PARA NEXT.JS
 *
 * Servicio simplificado de IA para usar en Next.js API Routes
 * Incluye funciones básicas de análisis de texto con OpenAI
 */

import Category from '@/lib/models/Category';

/**
 * Interface para objetos de gasto identificados por IA
 */
interface ExpenseItem {
  description: string;
  amount: number;
  currency: string;
  category: string;
  date: string;
  confidence?: number;
}

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const OPENAI_API_URL = 'https://api.openai.com/v1/chat/completions';

if (!OPENAI_API_KEY) {
  console.error('❌ ERROR: OPENAI_API_KEY no está configurada');
}

/**
 * Obtiene las categorías de gastos disponibles desde la base de datos
 * @param userId - ID del usuario (opcional, para categorías personalizadas)
 * @returns Array de categorías de gastos
 */
export async function getExpenseCategories(userId?: string) {
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

        customCategories.forEach((customCat: any) => {
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
        console.warn('⚠️ Error obteniendo categorías personalizadas, usando solo las por defecto:', error);
        return defaultCategories;
      }
    }

    return defaultCategories;
  } catch (error) {
    console.error('❌ Error obteniendo categorías de gastos:', error);
    return [];
  }
}

/**
 * Analiza texto con OpenAI usando API Key del entorno
 * @param text - Texto a analizar
 * @param userId - ID del usuario (para contexto y categorías personalizadas)
 * @returns Análisis de gastos con estructura {expenses: [...], confidence: number}
 */
export async function analyzeTextWithEnvKey(text: string, userId: string) {
  try {
    console.log('🤖 Analizando texto con OpenAI (API Key del entorno)...');

    // Verificar que tenemos la API key del entorno
    if (!OPENAI_API_KEY) {
      throw new Error('OPENAI_API_KEY no está configurada en las variables de entorno');
    }

    console.log('🔑 API Key del entorno validada correctamente');

    // Obtener categorías dinámicamente desde la base de datos
    console.log('📂 Obteniendo categorías para análisis...');
    const categories = await getExpenseCategories(userId);

    // Construir la lista de categorías para el prompt
    const categoryList = categories.map(cat => `   - ${cat.name} (${cat.description})`).join('\n');

    console.log(`📂 Se encontraron ${categories.length} categorías disponibles para el usuario`);

    // Preparar prompt para OpenAI
    const systemPrompt = `Eres un analista financiero experto especializado en el análisis de estados de cuenta bancarios uruguayos.

Tu tarea es analizar el texto de un estado de cuenta bancario y extraer ÚNICAMENTE los GASTOS (débitos/salidas de dinero) - IGNORAR COMPLETAMENTE ingresos, créditos y transferencias entrantes.

INSTRUCCIONES ESPECÍFICAS PARA TABLAS BANCARIAS URUGUAYAS:
1. IDENTIFICACIÓN DE GASTOS:
   - SOLO considera transacciones que aparecen en columnas "Débito" o similares
   - IGNORA completamente cualquier monto en columnas "Crédito"
   - Busca patrones como: monto en columna débito + descripción del gasto
   - Ejemplos de gastos: compras, pagos, extracciones, débitos automáticos

2. PROCESA TODOS los gastos que encuentres en columnas débito, incluso si hay muchos

3. EXTRACCIÓN DE DATOS:
   - Busca el formato típico: Fecha | Concepto/Descripción | Débito | Crédito | Saldo
   - Toma el monto de la columna "Débito" (nunca de "Crédito")
   - La descripción suele estar en la columna "Concepto"

4. REGLAS DE MONEDA PARA URUGUAY:
   - En Uruguay, los montos pueden estar en UYU (pesos) o USD (dólares)
   - Los montos en UYU suelen ser de 3-6 dígitos (ej: 1.250, 45.000)
   - Los montos en USD suelen ser menores (ej: 25.50, 150.00)
   - Regla general: montos > 500 probablemente UYU, montos < 500 probablemente USD
   - Si el texto menciona explícitamente "USD", "dólares", o símbolos como "U$S", es USD
   - Si menciona "pesos", "UYU", o símbolos como "$UY", es UYU
   - Para montos entre 100-1000, analiza el contexto (comercios internacionales suelen ser USD)

5. CATEGORIZACIÓN:
   - Usa EXACTAMENTE estas categorías de la base de datos:
${categoryList}
   - Nunca uses "Otros" como categoría, usa "Otros Gastos"
   - Nunca inventes categorías nuevas

FORMATO DE SALIDA REQUERIDO:
Devuelve ÚNICAMENTE un objeto JSON válido con esta estructura exacta:
{
  "expenses": [
    {
      "description": "descripción exacta del gasto",
      "amount": 123.45,
      "currency": "UYU" o "USD",
      "category": "una de las categorías listadas arriba",
      "date": "YYYY-MM-DD"
    }
  ],
  "confidence": 0.85
}

IMPORTANTE:
- Fecha en formato YYYY-MM-DD
- Monto como número (sin símbolos)
- Usa nombres de categorías exactos
- Devuelve TODOS los gastos encontrados
- Si no hay gastos, devuelve array vacío
- Confidence entre 0 y 1`;

    const userPrompt = `Analiza el siguiente texto de estado de cuenta bancario uruguayo y extrae ÚNICAMENTE los gastos (débitos) - IGNORA créditos e ingresos:

${text}

INSTRUCCIONES ESPECÍFICAS PARA TABLAS BANCARIAS:
- Busca el formato: Fecha | Concepto | Débito | Crédito | Saldo
- SOLO toma montos de la columna "Débito" - ignora completamente "Crédito"
- Cada línea con monto en débito es un gasto potencial
- Busca descripciones como: COMPRA, PAGO, EXTRACCIÓN, DÉBITO AUTOMÁTICO
- Ignora líneas como: DEPÓSITO, TRANSFERENCIA, CRÉDITO, INGRESO
- Procesa TODOS los gastos encontrados, incluso si hay muchos
- Convierte fechas de formato DD/MM/YYYY a YYYY-MM-DD
- Sé específico con nombres de comercios: "SUPERMERCADO", "RESTORAN", etc.
- NO trunques la lista, incluye CADA gasto encontrado`;

    console.log('🚀 Enviando solicitud a OpenAI...');

    const response = await fetch(OPENAI_API_URL, {
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
        max_tokens: 8000,
        temperature: 0.1
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Error en OpenAI API:', response.status, errorText);
      throw new Error(`Error en OpenAI API: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    console.log('📥 Respuesta recibida de OpenAI');

    let result;
    try {
      // Extraer JSON de la respuesta
      const content = data.choices[0].message.content.trim();

      // Buscar JSON en la respuesta (puede tener texto adicional)
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No se encontró JSON válido en la respuesta');
      }

      result = JSON.parse(jsonMatch[0]);
      console.log('✅ JSON parseado correctamente');

    } catch (parseError) {
      console.error('❌ Error parseando respuesta JSON:', parseError);
      console.log('📄 Contenido de la respuesta:', data.choices[0].message.content);
      throw new Error('La respuesta de OpenAI no tiene el formato JSON esperado');
    }

    // Validar estructura del resultado
    if (!result.expenses || !Array.isArray(result.expenses)) {
      console.warn('⚠️ La respuesta no tiene el formato esperado, intentando reparar...');
      result = { expenses: [], confidence: 0.0 };
    }

    // Asegurar que todos los gastos tengan los campos requeridos
    result.expenses = result.expenses.map((expense: any) => ({
      description: expense.description || 'Gasto sin descripción',
      amount: parseFloat(expense.amount) || 0,
      currency: expense.currency || 'UYU',
      category: expense.category || 'Otros Gastos',
      date: expense.date || new Date().toISOString().split('T')[0],
      confidence: expense.confidence || result.confidence || 0.8
    }));

    console.log(`✅ Análisis completado: ${result.expenses.length} gastos identificados`);
    return result;

  } catch (error) {
    console.error('❌ Error en análisis con OpenAI:', error);

    // Estrategia de respaldo: análisis básico sin IA
    console.log('🔄 Usando estrategia de respaldo (análisis básico)...');

    const basicAnalysis = await performBasicExpenseAnalysis(text);
    return {
      expenses: basicAnalysis.expenses,
      confidence: 0.3, // Baja confianza para análisis básico
      analysisType: 'basic_fallback'
    };
  }
}

/**
 * Analiza texto largo dividiéndolo en chunks y procesando cada uno
 * @param text - Texto largo a analizar
 * @param userId - ID del usuario
 * @returns Análisis combinado de todos los chunks
 */
export async function analyzeLargeTextInChunks(text: string, userId: string) {
  try {
    console.log('📄 Procesando texto largo en chunks...');

    const MAX_CHUNK_SIZE = 80000; // Tamaño aumentado para aprovechar mejor los tokens disponibles

    // Dividir el texto en chunks
    const chunks = [];
    for (let i = 0; i < text.length; i += MAX_CHUNK_SIZE) {
      chunks.push(text.slice(i, i + MAX_CHUNK_SIZE));
    }

    console.log(`📄 Texto dividido en ${chunks.length} chunks`);

    // Analizar cada chunk
    const analyses = [];
    for (let i = 0; i < chunks.length; i++) {
      console.log(`📄 Procesando chunk ${i + 1}/${chunks.length}...`);
      const chunkResult = await analyzeTextWithEnvKey(chunks[i], userId);
      analyses.push(chunkResult);
    }

    // Combinar los resultados
    if (analyses.length === 1) {
      return analyses[0];
    }

    // Si hay múltiples análisis, combinarlos
    console.log('🔄 Combinando resultados de múltiples chunks...');

    const combinedExpenses: ExpenseItem[] = [];
    let totalConfidence = 0;

    analyses.forEach(analysis => {
      if (analysis.expenses && Array.isArray(analysis.expenses)) {
        combinedExpenses.push(...analysis.expenses);
      }
      totalConfidence += analysis.confidence || 0;
    });

    // Calcular confianza promedio
    const averageConfidence = totalConfidence / analyses.length;

    // Eliminar duplicados basados en descripción y monto (con tolerancia)
    const uniqueExpenses: ExpenseItem[] = [];
    const seen = new Set();

    combinedExpenses.forEach(expense => {
      const key = `${expense.description}-${expense.amount}-${expense.date}`;
      if (!seen.has(key)) {
        seen.add(key);
        uniqueExpenses.push(expense);
      }
    });

    console.log(`✅ Combinación completada: ${uniqueExpenses.length} gastos únicos de ${combinedExpenses.length} totales`);

    return {
      expenses: uniqueExpenses,
      confidence: averageConfidence,
      analysisType: 'chunked_analysis'
    };

  } catch (error) {
    console.error('❌ Error analizando texto largo en chunks:', error);
    throw error;
  }
}

/**
 * Análisis básico de respaldo cuando falla la IA
 * @param text - Texto a analizar
 * @returns Análisis básico con gastos identificados por patrones simples
 */
async function performBasicExpenseAnalysis(text: string) {
  try {
    console.log('🔍 Realizando análisis básico de respaldo...');

    const expenses: ExpenseItem[] = [];
    const lines = text.split('\n');

    // Patrones mejorados para detectar gastos en tablas bancarias
    const expensePatterns = [
      // Patrón específico para tablas: monto seguido de descripción
      /(\d+[\.,]\d+)\s+([A-Z\s]+?)\s*$/gi,
      // Patrones específicos de operaciones bancarias uruguayas
      /(COMPRA|PAGO|EXTRACCI[OÓ]N|D[EÉ]BITO)\s+(.+?)\s+(\d+[\.,]\d*)/gi,
      /([A-Z\s]{3,})\s+(\d+[\.,]\d*)\s*$/gi,
      // Patrón para montos en columnas débito
      /(\d+[\.,]\d*)\s+[A-Z\s]{3,}/gi
    ];

    lines.forEach(line => {
      expensePatterns.forEach(pattern => {
        let match;
        while ((match = pattern.exec(line)) !== null) {
          const description = match[1]?.trim() || 'Gasto identificado';
          const amountStr = match[2]?.replace(/[$,]/g, '') || '0';
          const amount = parseFloat(amountStr);

          if (amount > 0) {
            // Mejorar detección de moneda para Uruguay
            let currency = 'UYU'; // Por defecto pesos uruguayos
            if (amount < 190) {
              currency = 'USD'; // Montos pequeños probablemente dólares
            }

            expenses.push({
              description,
              amount,
              currency,
              category: 'Otros Gastos',
              date: new Date().toISOString().split('T')[0]
            });
          }
        }
      });
    });

    console.log(`✅ Análisis básico completado: ${expenses.length} gastos identificados`);
    return { expenses };

  } catch (error) {
    console.error('❌ Error en análisis básico:', error);
    return { expenses: [] as ExpenseItem[] };
  }
}

/**
 * Procesa consultas avanzadas de IA
 */
export async function processAdvancedQuery(query: string, context: any = {}): Promise<string> {
  try {
    const prompt = `Eres un asistente financiero inteligente. Responde a la siguiente consulta del usuario de manera útil y precisa.

Contexto del usuario:
${JSON.stringify(context, null, 2)}

Consulta: ${query}

Proporciona una respuesta clara, concisa y útil. Si es necesario, incluye consejos financieros prácticos.`;

    return await analyzeTextWithEnvKey(query, prompt);
  } catch (error) {
    console.error('Error processing advanced query:', error);
    throw error;
  }
}
