/**
 * 🤖 SERVICIO DE IA PARA NEXT.JS
 *
 * Servicio simplificado de IA para usar en Next.js API Routes
 * Incluye funciones básicas de análisis de texto con OpenAI
 */

import Category from '@/lib/models/Category';

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
   - Si el monto es MAYOR a $150, automáticamente es UYU (pesos uruguayos)
   - Si el texto menciona "dólares", "USD", "$" o "U$S", es USD
   - Si menciona "pesos", "UYU" o "$UY", es UYU
   - Si no hay indicadores claros, asume UYU para montos altos y USD para montos bajos

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
- La fecha debe estar en formato YYYY-MM-DD
- El monto debe ser un número (sin símbolos de moneda)
- Usa exactamente los nombres de categorías proporcionados
- Si no hay gastos identificados, devuelve un array vacío
- El confidence debe ser un número entre 0 y 1`;

    const userPrompt = `Analiza el siguiente texto de estado de cuenta bancario y extrae todos los gastos identificados:

${text}

INSTRUCCIONES ESPECÍFICAS:
- Busca patrones como "COMPRA", "PAGO", "GASTO", "EXTRACCIÓN", etc.
- Ignora completamente depósitos, ingresos, transferencias entrantes
- Si encuentras montos con comas o puntos, conviértelos correctamente
- Si hay fechas en formatos uruguayos (DD/MM/YYYY), conviértelas a YYYY-MM-DD
- Sé muy específico en las descripciones, incluyendo nombres de comercios cuando estén disponibles`;

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
        max_tokens: 4000,
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

    const MAX_CHUNK_SIZE = 40000; // Un poco más pequeño para dejar margen

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

    const combinedExpenses = [];
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
    const uniqueExpenses = [];
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

    const expenses = [];
    const lines = text.split('\n');

    // Patrones simples para detectar gastos
    const expensePatterns = [
      /COMPRA\s+(.+?)\s+(\$?[\d,]+\.?\d*)/gi,
      /PAGO\s+(.+?)\s+(\$?[\d,]+\.?\d*)/gi,
      /GASTO\s+(.+?)\s+(\$?[\d,]+\.?\d*)/gi,
      /EXTRACCI[OÓ]N\s+(.+?)\s+(\$?[\d,]+\.?\d*)/gi,
      /(\$?[\d,]+\.?\d*)\s+(.+?)(?:COMPRA|PAGO|GASTO)/gi
    ];

    lines.forEach(line => {
      expensePatterns.forEach(pattern => {
        let match;
        while ((match = pattern.exec(line)) !== null) {
          const description = match[1]?.trim() || 'Gasto identificado';
          const amountStr = match[2]?.replace(/[$,]/g, '') || '0';
          const amount = parseFloat(amountStr);

          if (amount > 0) {
            expenses.push({
              description,
              amount,
              currency: amount < 150 ? 'USD' : 'UYU',
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
    return { expenses: [] };
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
