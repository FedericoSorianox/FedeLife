/**
 * 🤖 SERVICIO DE IA PARA NEXT.JS
 *
 * Servicio simplificado de IA para usar en Next.js API Routes
 * Incluye funciones básicas de análisis de texto con OpenAI
 */

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const OPENAI_API_URL = 'https://api.openai.com/v1/chat/completions';

if (!OPENAI_API_KEY) {
  console.error('❌ ERROR: OPENAI_API_KEY no está configurada');
}

/**
 * Analiza texto con IA usando OpenAI
 */
export async function analyzeTextWithEnvKey(text: string, prompt: string): Promise<string> {
  try {
    if (!OPENAI_API_KEY) {
      throw new Error('OpenAI API key not configured');
    }

    const response = await fetch(OPENAI_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'gpt-3.5-turbo',
        messages: [
          {
            role: 'system',
            content: prompt
          },
          {
            role: 'user',
            content: text
          }
        ],
        max_tokens: 1000,
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const data = await response.json();
    return data.choices[0]?.message?.content || 'No response from AI';
  } catch (error) {
    console.error('Error analyzing text with AI:', error);
    throw error;
  }
}

/**
 * Analiza texto largo dividiéndolo en chunks
 */
export async function analyzeLargeTextInChunks(text: string, prompt: string): Promise<string> {
  try {
    // Dividir el texto en chunks de máximo 4000 caracteres
    const chunks = [];
    const maxChunkSize = 4000;

    for (let i = 0; i < text.length; i += maxChunkSize) {
      chunks.push(text.slice(i, i + maxChunkSize));
    }

    // Analizar cada chunk
    const analyses = [];
    for (const chunk of chunks) {
      const analysis = await analyzeTextWithEnvKey(chunk, prompt);
      analyses.push(analysis);
    }

    // Combinar los resultados
    if (analyses.length === 1) {
      return analyses[0];
    }

    // Si hay múltiples análisis, crear un resumen
    const combinedPrompt = `Resume y combina los siguientes análisis en una respuesta coherente:\n\n${analyses.join('\n\n---\n\n')}`;
    return await analyzeTextWithEnvKey(analyses.join(' '), combinedPrompt);
  } catch (error) {
    console.error('Error analyzing large text in chunks:', error);
    throw error;
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
