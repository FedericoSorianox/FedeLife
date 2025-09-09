/**
 * Analizador de OpenAI para procesamiento de texto financiero
 * Versión optimizada para análisis de PDFs y extracción de gastos
 */

/**
 * Clase para analizar texto financiero usando OpenAI API
 */
export class OpenAIAnalyzer {
    constructor() {
        // Configuración optimizada para OpenAI API
        this.config = {
            apiKey: 'your-api-key-here', // Se configurará dinámicamente
            model: 'gpt-4o-mini', // Modelo más económico y potente
            maxTokens: 10000, // Aumentado para análisis completo de PDFs
            temperature: 0.1, // Baja para respuestas consistentes
            baseUrl: 'https://api.openai.com/v1'
        };
        
        this.isConfigured = false;
        console.log('🤖 OpenAI Analyzer inicializado');
    }

    /**
     * Configura la API Key
     * @param {string} apiKey - Clave API de OpenAI
     */
    setApiKey(apiKey) {
        if (apiKey && apiKey.startsWith('sk-')) {
            this.config.apiKey = apiKey;
            this.isConfigured = true;
            console.log('✅ API Key configurada correctamente');
        } else {
            console.warn('⚠️ API Key inválida');
        }
    }

    /**
     * Analiza texto financiero y extrae gastos
     * @param {string} text - Texto a analizar
     * @returns {Promise<Object>} Resultado del análisis
     */
    async analyzeFinancialText(text) {
        try {
            if (!this.isConfigured) {
                throw new Error('API Key no configurada');
            }

            console.log('🔍 Analizando texto financiero...');
            
            const prompt = `Analiza el siguiente texto financiero y extrae TODOS los gastos encontrados.

IMPORTANTE:
- IDENTIFICA LA MONEDA ORIGINAL de cada gasto (USD, UYU) - NO CONVIERTAS NADA
- MANTÉN CADA MONEDA EN SU FORMA ORIGINAL
- Extrae fecha, descripción, monto y moneda de cada gasto
- Si no hay gastos claros, devuelve un array vacío

Texto a analizar:
${text}

Responde SOLO con un JSON válido en este formato:
{
  "expenses": [
    {
      "date": "DD/MM/YY",
      "description": "Descripción del gasto",
      "amount": 123.45,
      "currency": "USD" o "UYU"
    }
  ]
}`;

            const response = await fetch(`${this.config.baseUrl}/chat/completions`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.config.apiKey}`
                },
                body: JSON.stringify({
                    model: this.config.model,
                    messages: [
                        {
                            role: 'system',
                            content: 'Eres un experto en análisis financiero. Extrae gastos de texto manteniendo la moneda original. Responde SOLO con JSON válido.'
                        },
                        {
                            role: 'user',
                            content: prompt
                        }
                    ],
                    max_tokens: this.config.maxTokens,
                    temperature: this.config.temperature
                })
            });

            if (!response.ok) {
                throw new Error(`Error de API: ${response.status} ${response.statusText}`);
            }

            const data = await response.json();
            const content = data.choices[0].message.content.trim();
            
            console.log('📊 Respuesta de OpenAI:', content);
            
            // Intentar parsear como JSON
            try {
                const result = JSON.parse(content);
                return result;
            } catch (parseError) {
                console.warn('⚠️ Error parseando JSON, intentando extracción manual...');
                return this.extractExpensesFromTextResponse(content);
            }

        } catch (error) {
            console.error('❌ Error en análisis:', error);
            throw error;
        }
    }

    /**
     * Extrae gastos de una respuesta de texto (fallback)
     * @param {string} text - Texto de respuesta
     * @returns {Object} Gastos extraídos
     */
    extractExpensesFromTextResponse(text) {
        try {
            console.log('🔍 Extrayendo gastos del texto de respuesta...');
            
            // Intentar extraer de tabla markdown
            const markdownExpenses = this.extractFromMarkdownTable(text);
            if (markdownExpenses.length > 0) {
                return { expenses: markdownExpenses };
            }
            
            // Intentar extraer de formato markdown con emojis
            const emojiExpenses = this.extractFromMarkdownFormat(text);
            if (emojiExpenses.length > 0) {
                return { expenses: emojiExpenses };
            }
            
            // Fallback: buscar patrones JSON
            const jsonMatch = text.match(/\{[\s\S]*"expenses"[\s\S]*\}/);
            if (jsonMatch) {
                try {
                    return JSON.parse(jsonMatch[0]);
                } catch (e) {
                    console.warn('⚠️ Error parseando JSON encontrado');
                }
            }
            
            console.log('❌ No se pudieron extraer gastos del texto');
            return { expenses: [] };
            
        } catch (error) {
            console.error('❌ Error extrayendo gastos:', error);
            return { expenses: [] };
        }
    }

    /**
     * Extrae gastos de una tabla markdown
     * @param {string} text - Texto con tabla markdown
     * @returns {Array} Array de gastos
     */
    extractFromMarkdownTable(text) {
        try {
            console.log('📋 Buscando tabla markdown...');
            
            // Patrón mejorado para capturar tablas markdown
            const tablePattern = /\|.*\|[\s\S]*?(?=\n\n|\*\*Notas|\*\*Resumen|$)/;
            const tableMatch = text.match(tablePattern);
            
            if (!tableMatch) {
                console.log('❌ No se encontró tabla markdown');
                return [];
            }
            
            const tableContent = tableMatch[0];
            console.log('📋 Contenido de tabla encontrado:', tableContent);
            
            const expenses = [];
            const lines = tableContent.split('\n');
            
            for (const line of lines) {
                if (line.trim().startsWith('|') && !line.includes('---')) {
                    const cells = line.split('|').map(cell => cell.trim()).filter(cell => cell);
                    
                    if (cells.length >= 3) {
                        try {
                            const expense = this.processTableContent(cells, expenses);
                            if (expense) {
                                expenses.push(expense);
                            }
                        } catch (error) {
                            console.warn('⚠️ Error procesando fila:', error);
                        }
                    }
                }
            }
            
            console.log(`✅ Extraídos ${expenses.length} gastos de tabla markdown`);
            return expenses;
            
        } catch (error) {
            console.error('❌ Error extrayendo de tabla markdown:', error);
            return [];
        }
    }

    /**
     * Procesa el contenido de una celda de tabla
     * @param {Array} cells - Celdas de la fila
     * @param {Array} expenses - Array de gastos existente
     * @returns {Object|null} Gasto procesado
     */
    processTableContent(cells, expenses) {
        try {
            // Omitir filas de separador
            if (cells.every(cell => cell.includes('-'))) {
                return null;
            }
            
            // Omitir encabezados
            if (cells.some(cell => 
                cell.toLowerCase().includes('fecha') || 
                cell.toLowerCase().includes('descripción') ||
                cell.toLowerCase().includes('monto') ||
                cell.toLowerCase().includes('moneda')
            )) {
                return null;
            }
            
            let date = '';
            let description = '';
            let amount = 0;
            let currency = 'UYU';
            
            // Procesar cada celda
            for (let i = 0; i < cells.length; i++) {
                const cell = cells[i].trim();
                
                // Detectar fecha (formato DD/MM/YY o similar)
                if (cell.match(/\d{1,2}\/\d{1,2}\/\d{2,4}/)) {
                    date = cell;
                }
                // Detectar monto (números con posibles símbolos de moneda)
                else if (cell.match(/[\d.,]+/)) {
                    const parsedAmount = this.parseAmount(cell);
                    if (parsedAmount > 0) {
                        amount = parsedAmount;
                        currency = this.detectCurrency(cell);
                    }
                }
                // El resto es descripción
                else if (cell && !cell.match(/^\d+$/)) {
                    description = cell;
                }
            }
            
            // Validar que tenemos datos mínimos
            if (date && description && amount > 0) {
                return {
                    date: date,
                    description: description,
                    amount: amount,
                    currency: currency
                };
            }
            
            return null;
            
        } catch (error) {
            console.error('❌ Error procesando contenido de tabla:', error);
            return null;
        }
    }

    /**
     * Parsea un string de cantidad a número
     * @param {string} amountStr - String con la cantidad
     * @returns {number} Cantidad parseada
     */
    parseAmount(amountStr) {
        try {
            // Remover símbolos de moneda y espacios
            let cleanAmount = amountStr.replace(/[$U\s]/g, '');
            
            // Detectar formato europeo (1.000,00) vs americano (1,000.00)
            const hasCommaDecimal = cleanAmount.includes(',') && cleanAmount.includes('.');
            const hasOnlyComma = cleanAmount.includes(',') && !cleanAmount.includes('.');
            
            if (hasCommaDecimal) {
                // Formato europeo: 1.000,00
                cleanAmount = cleanAmount.replace(/\./g, '').replace(',', '.');
            } else if (hasOnlyComma && cleanAmount.split(',')[1]?.length <= 2) {
                // Formato europeo: 1,00
                cleanAmount = cleanAmount.replace(',', '.');
            }
            
            const amount = parseFloat(cleanAmount);
            return isNaN(amount) ? 0 : amount;
            
        } catch (error) {
            console.error('❌ Error parseando cantidad:', error);
            return 0;
        }
    }

    /**
     * Detecta la moneda de un string
     * @param {string} amountStr - String con la cantidad
     * @returns {string} Moneda detectada
     */
    detectCurrency(amountStr) {
        if (amountStr.includes('USD') || amountStr.includes('$') && !amountStr.includes('$U')) {
            return 'USD';
        }
        return 'UYU';
    }

    /**
     * Extrae gastos de formato markdown con emojis
     * @param {string} text - Texto con formato markdown
     * @returns {Array} Array de gastos
     */
    extractFromMarkdownFormat(text) {
        try {
            console.log('📝 Buscando formato markdown con emojis...');
            
            const expenses = [];
            const lines = text.split('\n');
            
            for (const line of lines) {
                // Buscar líneas con emojis de gasto
                if (line.includes('💰') || line.includes('💸') || line.includes('🛒')) {
                    const expense = this.parseMarkdownLine(line);
                    if (expense) {
                        expenses.push(expense);
                    }
                }
            }
            
            console.log(`✅ Extraídos ${expenses.length} gastos de formato markdown`);
            return expenses;
            
        } catch (error) {
            console.error('❌ Error extrayendo de formato markdown:', error);
            return [];
        }
    }

    /**
     * Parsea una línea de markdown con emoji
     * @param {string} line - Línea de markdown
     * @returns {Object|null} Gasto parseado
     */
    parseMarkdownLine(line) {
        try {
            // Patrón para extraer fecha, descripción y monto
            const pattern = /(\d{1,2}\/\d{1,2}\/\d{2,4})\s*-\s*(.+?)\s*-\s*([\d.,]+)\s*([A-Z]{3})?/;
            const match = line.match(pattern);
            
            if (match) {
                const [, date, description, amountStr, currencyStr] = match;
                const amount = this.parseAmount(amountStr);
                const currency = currencyStr || this.detectCurrency(amountStr);
                
                return {
                    date: date,
                    description: description.trim(),
                    amount: amount,
                    currency: currency
                };
            }
            
            return null;
            
        } catch (error) {
            console.error('❌ Error parseando línea markdown:', error);
            return null;
        }
    }
}
