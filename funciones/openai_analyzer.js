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
            maxTokens: 12000, // Límite de output para GPT-4o-mini
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
            
            // Calcular tokens aproximados para evitar error 400
            const promptBase = `🚨 CRÍTICO: Extrae TODOS los gastos bancarios sin excepción

INSTRUCCIONES ESPECÍFICAS PARA DOCUMENTOS BANCARIOS URUGUAYOS:

1. **IDENTIFICA TODOS estos tipos de gastos:**
   - Débitos automáticos
   - Compras con tarjeta
   - Extracciones de cajero
   - Pagos de servicios
   - Transferencias salientes
   - Cualquier movimiento que represente SALIDA de dinero

2. **PATRONES COMUNES a buscar:**
   - "Débito por $X.XX"
   - "[comercio] $X.XX"
   - "Extracción $X.XX"
   - "[servicio] $X.XX"
   - "Transferencia a [destino] $X.XX"
   - Cualquier línea con montos en pesos o dólares

3. **IMPORTANTE - DESCRIPCIONES:**
   - NO agregar prefijos como "Compra", "Pago", "Gasto" al inicio
   - Mantener la descripción original del comercio/servicio
   - Ejemplo: "Devoto Super" en lugar de "Compra Devoto Super"

4. **IGNORA COMPLETAMENTE:**
   - Ingresos, depósitos, créditos
   - Saldos, totales
   - Información de cuenta
   - Fechas sin montos

5. **EXTRAE SIEMPRE:**
   - Monto exacto (con decimales)
   - Descripción específica del gasto (SIN prefijos como "Compra")
   - Categoría apropiada
   - Moneda (UYU/USD)
   - Fecha si está disponible

CATEGORÍAS BANCARIAS COMUNES:
- Alimentación: supermercados, restaurantes, delivery, comidas
- Transporte: combustible, taxis, ómnibus, estacionamiento
- Servicios: UTE, OSE, Antel, internet, teléfono
- Salud: farmacias, médicos, mutualistas
- Entretenimiento: cines, bares, delivery de comida
- Otros: todo lo demás (especifica el comercio/lugar)

IMPORTANTE: Si encuentras menos de 60 gastos en un documento bancario típico, revisa nuevamente.
Los extractos bancarios suelen tener muchos movimientos por página.

FORMATO JSON:`;

            const jsonFormat = `{
"expenses": [
  {
    "date": "DD/MM/YY",
    "description": "Descripción específica",
    "amount": 123.45,
    "currency": "UYU",
    "category": "Categoría"
  }
]
}`;

            // Validar API key antes de procesar
            if (!this.config.apiKey || this.config.apiKey === 'your-api-key-here' || this.config.apiKey === 'sk-proj-your-openai-api-key-here') {
                throw new Error('API Key de OpenAI no configurada o inválida');
            }

            // Calcular tamaño aproximado y ajustar
            const textTokens = Math.ceil(text.length / 4); // Aproximadamente 4 chars por token
            const promptTokens = Math.ceil((promptBase.length + jsonFormat.length) / 4);
            const totalEstimatedTokens = textTokens + promptTokens;

            console.log(`📊 Estimación de tokens: Texto=${textTokens}, Prompt=${promptTokens}, Total=${totalEstimatedTokens}`);

            // Limitar el texto si es demasiado largo para el modelo
            let textToProcess = text;
            if (totalEstimatedTokens > 100000) { // Límite de contexto del modelo
                const maxTextLength = 80000; // Dejar espacio para respuesta
                textToProcess = text.substring(0, maxTextLength);
                console.log(`📝 Texto truncado a ${maxTextLength} caracteres por límite de modelo`);
            }

            // Si es demasiado largo, usar versión más corta del prompt
            let finalPrompt;
            if (totalEstimatedTokens > 80000) {
                finalPrompt = `Extrae TODOS los gastos bancarios. SOLO débitos/compras/pagos. IGNORA ingresos.
IMPORTANTE: NO agregar prefijos como "Compra", "Pago" al inicio de descripciones.
Mantener descripciones originales: "Devoto Super" no "Compra Devoto Super"
Moneda: "UYU" para pesos/$U, "USD" para dólares/$.
Categorías: Alimentación, Transporte, Entretenimiento, Salud, Educación, Vivienda, Ropa, Servicios, Otros.

${jsonFormat}`;
                console.log('📝 Usando prompt corto por límite de tokens');
            } else {
                finalPrompt = promptBase + '\n\n' + jsonFormat;
            }

            const prompt = finalPrompt + `\n\nTEXTO A ANALIZAR:\n${textToProcess}`;

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
                let errorDetails = `Error de API: ${response.status} ${response.statusText}`;

                // Intentar obtener más detalles del error
                try {
                    const errorData = await response.json();
                    if (errorData.error) {
                        errorDetails += ` - ${errorData.error.message || errorData.error.type || 'Detalles no disponibles'}`;
                    }
                } catch (e) {
                    // No se pudieron obtener detalles adicionales
                }

                // Diagnóstico específico para errores comunes
                if (response.status === 400) {
                    errorDetails += '. Posibles causas: solicitud demasiado larga, formato inválido, o límites excedidos.';
                    console.log('🔍 Diagnóstico de error 400:');
                    console.log(`  - Longitud del prompt: ${prompt.length} caracteres`);
                    console.log(`  - Tokens estimados: ${totalEstimatedTokens}`);
                    console.log(`  - Modelo usado: ${this.config.model}`);
                } else if (response.status === 401) {
                    errorDetails += '. Verifica que tu API key sea válida.';
                } else if (response.status === 429) {
                    errorDetails += '. Has excedido el límite de solicitudes. Espera un momento.';
                }

                throw new Error(errorDetails);
            }

            const data = await response.json();
            const content = data.choices[0].message.content.trim();
            
            console.log('📊 Respuesta de OpenAI:', content);
            
            // Intentar parsear como JSON
            try {
                let result = JSON.parse(content);

                // Mejorar la detección de monedas en los resultados
                if (result.expenses && Array.isArray(result.expenses)) {
                    result.expenses = result.expenses.map(expense => {
                        // Mejorar detección de moneda
                        expense.currency = this.improveCurrencyDetection(expense);
                        return expense;
                    });
                }

                return {
                    success: true,
                    data: result
                };
            } catch (parseError) {
                console.warn('⚠️ Error parseando JSON, intentando extracción manual...');
                const extractedData = this.extractExpensesFromTextResponse(content);

                // También mejorar monedas en la extracción manual
                if (extractedData.expenses && Array.isArray(extractedData.expenses)) {
                    extractedData.expenses = extractedData.expenses.map(expense => {
                        expense.currency = this.improveCurrencyDetection(expense);
                        return expense;
                    });
                }

                return {
                    success: true,
                    data: extractedData
                };
            }

        } catch (error) {
            console.error('❌ Error en análisis:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Mejora la detección de monedas en un gasto
     * @param {Object} expense - El gasto a procesar
     * @returns {string} La moneda detectada (UYU o USD)
     */
    improveCurrencyDetection(expense) {
        const description = (expense.description || '').toLowerCase();
        let currency = (expense.currency || '').toUpperCase();

        // Si ya tiene una moneda válida, mantenerla
        if (currency === 'UYU' || currency === 'USD') {
            return currency;
        }

        // Detección avanzada por indicadores en la descripción (orden de prioridad)
        const usdIndicators = [
            // Alta prioridad - símbolos explícitos
            'u$s', 'us$', '$ ',
            // Palabras clave específicas
            'usd', 'dólares', 'dolares', 'americanos', 'dólar estadounidense',
            'us dollar', 'dólar americano', 'moneda americana'
        ];

        const uyuIndicators = [
            // Alta prioridad - símbolos explícitos
            '$u ', '$uy ', 'u$y ',
            // Palabras clave específicas
            'uyu', 'pesos uruguayos', 'uruguayos', 'peso uruguayo',
            'moneda nacional', 'pesos uruguayos', 'uruguayo'
        ];

        // Verificar indicadores de USD primero (prioridad)
        for (const indicator of usdIndicators) {
            if (description.toLowerCase().includes(indicator.toLowerCase())) {
                console.log(`💵 Detectado USD por indicador: "${indicator}" en "${expense.description}"`);
                return 'USD';
            }
        }

        // Verificar indicadores de UYU
        for (const indicator of uyuIndicators) {
            if (description.toLowerCase().includes(indicator.toLowerCase())) {
                console.log(`💰 Detectado UYU por indicador: "${indicator}" en "${expense.description}"`);
                return 'UYU';
            }
        }

        // Si no hay indicadores específicos, buscar patrones de símbolos
        const hasDollarSign = description.includes('$') && !description.includes('$u') && !description.includes('$uy');
        if (hasDollarSign) {
            console.log(`💵 Detectado USD por símbolo $ en "${expense.description}"`);
            return 'USD';
        }

        // Si no hay indicadores claros, asumir UYU (contexto uruguayo por defecto)
        console.log(`🤔 Moneda no clara para "${expense.description}", asumiendo UYU`);
        return 'UYU';
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
                const category = this.assignCategoryFromDescription(description);
                return {
                    date: date,
                    description: description,
                    amount: amount,
                    currency: currency,
                    category: category
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
        const str = amountStr.toLowerCase();

        // Patrones específicos para UYU
        if (str.includes('uyu') ||
            str.includes('$u') ||
            str.includes('pesos') ||
            str.includes('uruguayos') ||
            str.includes('peso uruguayo') ||
            str.includes('pesos uruguayos')) {
            return 'UYU';
        }

        // Patrones específicos para USD
        if (str.includes('usd') ||
            str.includes('dólares') ||
            str.includes('dolares') ||
            str.includes('dólar') ||
            str.includes('dolar') ||
            str.includes('u$s') ||
            str.includes('us$') ||
            (str.includes('$') && !str.includes('$u') && !str.includes('uyu'))) {
            return 'USD';
        }

        // Por defecto, si hay un símbolo $ sin especificar, asumir USD
        if (str.includes('$') && !str.includes('$u')) {
            return 'USD';
        }

        // Si no se detecta nada específico, asumir UYU (más común en Uruguay)
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
                const category = this.assignCategoryFromDescription(description.trim());

                return {
                    date: date,
                    description: description.trim(),
                    amount: amount,
                    currency: currency,
                    category: category
                };
            }

            return null;

        } catch (error) {
            console.error('❌ Error parseando línea markdown:', error);
            return null;
        }
    }

    /**
     * Asigna una categoría basada en la descripción del gasto
     * @param {string} description - Descripción del gasto
     * @returns {string} Categoría asignada
     */
    assignCategoryFromDescription(description) {
        try {
            const desc = description.toLowerCase();

            // Alimentación
            if (desc.match(/(restaurante|delivery|comida|supermercado|mercado|panaderia|carne|verdura|fruta|bebida|cafe|bar|restaurante|comedor)/)) {
                return 'Alimentación';
            }

            // Transporte
            if (desc.match(/(gasolina|combustible|transporte|taxi|uber|bus|metro|estacionamiento|parking|auto|taller|mecanico)/)) {
                return 'Transporte';
            }

            // Entretenimiento
            if (desc.match(/(cine|pelicula|teatro|concierto|musica|juego|videojuego|libro|revista|deporte|gimnasio|gym|entretenimiento|hobby)/)) {
                return 'Entretenimiento';
            }

            // Salud
            if (desc.match(/(medico|doctor|farmacia|medicamento|hospital|clinica|odontologo|salud|seguro medico|consulta|tratamiento)/)) {
                return 'Salud';
            }

            // Educación
            if (desc.match(/(curso|escuela|universidad|colegio|libro|material|estudio|educacion|clase|profesor|diploma|certificado)/)) {
                return 'Educación';
            }

            // Vivienda
            if (desc.match(/(alquiler|renta|hipoteca|servicio|luz|agua|gas|electricidad|internet|telefono|reparacion|construccion|vivienda|casa|departamento)/)) {
                return 'Vivienda';
            }

            // Ropa
            if (desc.match(/(ropa|zapato|camisa|pantalon|vestido|accesorio|ropa interior|calzado|tienda de ropa)/)) {
                return 'Ropa';
            }

            // Servicios
            if (desc.match(/(servicio|telefono|celular|movil|internet|cable|television|seguro|aseguradora|banco|tarjeta)/)) {
                return 'Servicios';
            }

            // Otros (por defecto)
            return 'Otros';

        } catch (error) {
            console.error('❌ Error asignando categoría:', error);
            return 'Otros';
        }
    }
}
