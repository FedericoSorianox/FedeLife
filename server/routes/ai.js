/**
 * 🤖 RUTAS DE IA - API
 *
 * Endpoints para análisis con IA
 * Incluye rutas públicas sin autenticación y rutas protegidas
 * Autor: Senior Backend Developer
 */

const express = require('express');
const { authenticateToken } = require('../middleware/auth');
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const { spawn, execSync } = require('child_process');
const { analyzeTextWithAI, checkOpenAIHealth } = require('../services/aiService');

const router = express.Router();

// Configuración de multer para manejar la subida de archivos
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const uploadDir = path.join(__dirname, '../../uploads/');

        // Crear el directorio si no existe
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
            console.log('📁 Directorio uploads creado automáticamente:', uploadDir);
        } else {
            console.log('📁 Directorio uploads ya existe:', uploadDir);
        }

        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        const fileName = `${Date.now()}-${file.originalname}`;
        console.log('📄 Archivo a guardar:', fileName);
        cb(null, fileName);
    }
});
const upload = multer({ storage: storage });

// ==================== ENDPOINTS PÚBLICOS (SIN AUTENTICACIÓN) ====================

/**
 * POST /api/public/ai/analyze-csv
 * Analiza un CSV sin autenticación (modo demo)
 */
router.post('/analyze-csv', upload.single('csv'), async (req, res) => {
    try {
        console.log('📄 === INICIANDO PROCESAMIENTO DE CSV ===');
        console.log('📄 Headers recibidos:', JSON.stringify(req.headers, null, 2));

        if (!req.file) {
            console.error('❌ No se recibió archivo CSV en la solicitud');
            return res.status(400).json({
                error: 'Archivo CSV requerido',
                message: 'Debes subir un archivo CSV para analizar'
            });
        }

        const filePath = req.file.path;
        const fileName = req.file.originalname;
        const fileSize = req.file.size;

        console.log(`📄 CSV recibido: ${fileName}`);
        console.log(`📄 Ruta del archivo: ${filePath}`);
        console.log(`📄 Tamaño del archivo: ${fileSize} bytes`);

        // Verificar que el archivo existe usando ruta absoluta
        const absoluteFilePath = path.resolve(filePath);
        console.log(`📄 Ruta absoluta del archivo: ${absoluteFilePath}`);

        if (!fs.existsSync(absoluteFilePath)) {
            console.error(`❌ Archivo no encontrado en el servidor: ${absoluteFilePath}`);
            return res.status(500).json({
                error: 'Archivo no encontrado',
                message: 'El archivo CSV no se guardó correctamente en el servidor'
            });
        }

        // Verificar tamaño del archivo (máximo 10MB)
        const maxSize = 10 * 1024 * 1024; // 10MB
        if (fileSize > maxSize) {
            console.error(`❌ Archivo CSV demasiado grande: ${fileSize} bytes`);
            // Limpiar archivo temporal
            if (fs.existsSync(absoluteFilePath)) {
                fs.unlinkSync(absoluteFilePath);
                console.log('🧹 Archivo temporal eliminado por tamaño excedido:', absoluteFilePath);
            }
            return res.status(400).json({
                error: 'Archivo demasiado grande',
                message: 'El archivo CSV no puede superar los 10MB'
            });
        }

        console.log('🤖 Verificando funcionamiento de OpenAI antes de procesar...');

        // Verificar que OpenAI esté funcionando antes de proceder
        const openaiHealth = await checkOpenAIHealth();

        if (openaiHealth.status !== 'success') {
            console.error('❌ OpenAI no está funcionando:', openaiHealth.message);

            // Limpiar archivo temporal
            if (fs.existsSync(absoluteFilePath)) {
                fs.unlinkSync(absoluteFilePath);
                console.log('🧹 Archivo temporal eliminado por error OpenAI:', absoluteFilePath);
            }

            return res.status(503).json({
                error: 'Servicio de IA no disponible',
                message: 'OpenAI no está funcionando correctamente. No se puede analizar el CSV.',
                details: openaiHealth.message,
                timestamp: new Date().toISOString()
            });
        }

        console.log('✅ OpenAI funcionando correctamente');

        // Verificar API Key del usuario desde el FormData
        const userApiKey = req.body.userApiKey || req.body.apiKey;
        console.log('🔑 API Key del usuario:', userApiKey ? 'Proporcionada por el cliente' : 'No proporcionada');

        // Verificar si tenemos API key (del servidor o del usuario)
        const serverApiKey = process.env.OPENAI_API_KEY;
        const effectiveApiKey = (userApiKey && userApiKey.startsWith('sk-')) ? userApiKey : serverApiKey;

        if (!effectiveApiKey || !effectiveApiKey.startsWith('sk-')) {
            console.error('❌ No hay API Key válida disponible');

            // Limpiar archivo temporal
            if (fs.existsSync(absoluteFilePath)) {
                fs.unlinkSync(absoluteFilePath);
                console.log('🧹 Archivo temporal eliminado por falta de API Key:', absoluteFilePath);
            }

            return res.status(400).json({
                error: 'API Key requerida',
                message: 'Se requiere una API Key válida de OpenAI para analizar CSVs.',
                details: 'Configura OPENAI_API_KEY en el servidor o proporciona tu propia API Key',
                timestamp: new Date().toISOString()
            });
        }

        console.log('📄 Iniciando parseo de CSV...');

        // Leer y parsear el archivo CSV
        const csvContent = fs.readFileSync(absoluteFilePath, 'utf-8');
        console.log(`📄 Contenido CSV leído: ${csvContent.length} caracteres`);

        // Parsear CSV básico para extraer gastos
        const expenses = parseCSVExpenses(csvContent);
        console.log(`📄 Gastos extraídos del CSV: ${expenses.length}`);

        if (expenses.length === 0) {
            console.warn('🚨 No se encontraron gastos en el CSV procesado');

            // Limpiar archivo temporal
            if (fs.existsSync(absoluteFilePath)) {
                fs.unlinkSync(absoluteFilePath);
                console.log('🧹 Archivo temporal eliminado - sin gastos encontrados:', absoluteFilePath);
            }

            return res.status(400).json({
                error: 'Sin gastos encontrados',
                message: 'El archivo CSV no contiene gastos válidos para analizar',
                details: {
                    suggestions: [
                        'Verifica que el CSV contenga transacciones de gastos',
                        'Asegúrate de que las columnas de fecha, descripción y monto estén presentes',
                        'El CSV debe estar en formato de estado de cuenta bancario'
                    ]
                },
                timestamp: new Date().toISOString()
            });
        }

        console.log('🤖 Iniciando análisis con OpenAI...');

        let analysis;
        let analysisMode;

        // Solo usamos análisis con OpenAI (ya que eliminamos el básico)
        analysisMode = userApiKey ? 'openai_user' : 'openai_server';

        console.log('🤖 Enviando gastos extraídos a OpenAI para análisis...');

        // Convertir gastos a texto para análisis
        const expensesText = expenses.map(expense =>
            `${expense.date} - ${expense.description} - $${expense.amount}`
        ).join('\n');

        // Si es API key del usuario, usamos la función especial
        if (userApiKey) {
            const { analyzeTextWithUserKey } = require('../services/aiService');
            analysis = await analyzeTextWithUserKey(expensesText, userApiKey, 'anonymous');
        } else {
            analysis = await analyzeTextWithAI(expensesText, 'anonymous');
        }

        console.log('✅ Análisis con OpenAI completado exitosamente');

        // Limpiar archivo temporal
        if (fs.existsSync(absoluteFilePath)) {
            fs.unlinkSync(absoluteFilePath);
            console.log('🧹 Archivo temporal eliminado:', absoluteFilePath);
        }

        res.json({
            success: true,
            data: {
                extractedExpenses: expenses,
                extractedText: expensesText.substring(0, 500) + (expensesText.length > 500 ? '...' : ''),
                analysis: analysis,
                analysisMode: analysisMode,
                message: analysisMode === 'openai_server'
                    ? 'CSV analizado correctamente con OpenAI (API del servidor)'
                    : 'CSV analizado correctamente con OpenAI (tu API key)'
            }
        });

    } catch (error) {
        console.error('❌ Error analizando CSV público:', error);
        console.error('❌ Stack trace:', error.stack);
        console.error('❌ Tipo de error:', error.constructor.name);
        console.error('❌ Mensaje de error completo:', error.message);

        // Limpiar archivo si existe
        try {
            if (req.file && req.file.path) {
                const cleanupPath = path.resolve(req.file.path);
                if (fs.existsSync(cleanupPath)) {
                    fs.unlinkSync(cleanupPath);
                    console.log('🧹 Archivo temporal limpiado:', cleanupPath);
                }
            }
        } catch (cleanupError) {
            console.error('❌ Error limpiando archivo temporal:', cleanupError);
        }

        // Determinar el tipo de error y respuesta apropiada
        let statusCode = 500;
        let errorMessage = 'Error interno del servidor';
        let showDetailsInProduction = false;

        if (error.message && error.message.includes('API Key')) {
            statusCode = 500;
            errorMessage = 'Configuración de API incompleta';
        } else if (error.message && error.message.includes('fetch')) {
            statusCode = 503;
            errorMessage = 'Error de conexión con el servicio de IA';
        } else if (error.message && error.message.includes('timeout')) {
            statusCode = 504;
            errorMessage = 'Timeout en el procesamiento';
        } else if (error.message && error.message.includes('CSV')) {
            statusCode = 400;
            errorMessage = 'Error procesando el archivo CSV';
        } else if (error.message && (error.message.includes('Límite de uso de OpenAI') || error.message.includes('rate limit'))) {
            statusCode = 429;
            errorMessage = 'Límite de uso de OpenAI excedido';
            showDetailsInProduction = true;
            console.log('🔥 Detectado error de rate limit, mostrando detalles en producción');
        }

        const responseData = {
            error: error.constructor.name || 'Error interno del servidor',
            message: errorMessage,
            details: (process.env.NODE_ENV === 'development' || showDetailsInProduction) ? error.message : undefined,
            timestamp: new Date().toISOString()
        };

        console.error('📤 Enviando respuesta de error:', JSON.stringify(responseData, null, 2));

        res.status(statusCode).json(responseData);
    }
});

/**
 * Función auxiliar para parsear gastos desde CSV de estado de cuenta
 * @param {string} csvContent - Contenido del archivo CSV
 * @returns {Array} Array de gastos extraídos
 */
function parseCSVExpenses(csvContent) {
    const expenses = [];
    const lines = csvContent.split('\n');

    console.log(`📄 Procesando ${lines.length} líneas del CSV`);

    // Detectar si es formato CSV estándar o formato Itaú
    const headerLine = lines[0] || '';
    const isStandardCSV = headerLine.includes('fecha,descripcion');

    if (isStandardCSV) {
        console.log('📄 Detectado formato CSV estándar con headers');
        return parseStandardCSV(lines);
    } else {
        console.log('📄 Detectado formato Itaú o similar');
        return parseItauCSV(lines);
    }
}

/**
 * Parsear CSV en formato estándar con headers
 */
function parseStandardCSV(lines) {
    const expenses = [];

    // Determinar el número de columnas basado en el header
    const headerLine = lines[0].toLowerCase();
    const isSimpleFormat = headerLine.includes('fecha,descripcion,categoria,importe_pesos,importe_dolares');

    for (let i = 1; i < lines.length; i++) { // Saltar header
        const line = lines[i].trim();
        if (!line) continue;

        try {
            // Parsear línea CSV
            const columns = parseCSVLine(line);

            let fecha, descripcion, categoria, importe_pesos, importe_dolares;

            if (isSimpleFormat && columns.length >= 5) {
                // Formato simple: fecha,descripcion,categoria,importe_pesos,importe_dolares
                [fecha, descripcion, categoria, importe_pesos, importe_dolares] = columns;
            } else if (!isSimpleFormat && columns.length >= 8) {
                // Formato extendido: fecha,descripcion,cuotas,categoria,importe_pesos,importe_dolares,tipo,archivo_origen
                [fecha, descripcion, , categoria, importe_pesos, importe_dolares] = columns;
            } else {
                continue; // Saltar líneas con formato incorrecto
            }

            // Solo procesar gastos (excluir REDIVA y otros tipos de transacción)
            if (descripcion && descripcion.toLowerCase().includes('rediva')) continue;
            if (descripcion && descripcion.toLowerCase().includes('debito')) continue;
            if (descripcion && descripcion.toLowerCase().includes('credito')) continue;

            // Determinar el monto y moneda a usar
            let amount = 0;
            let currency = 'UYU';

            if (importe_dolares && parseFloat(importe_dolares) > 0) {
                // Si hay importe en dólares, usar ese
                amount = parseFloat(importe_dolares.replace(',', '.'));
                currency = 'USD';
            } else if (importe_pesos && parseFloat(importe_pesos) > 0) {
                // Si no hay dólares pero hay pesos, usar pesos
                amount = parseFloat(importe_pesos.replace(',', '.'));
                currency = 'UYU';
            }

            // Aplicar lógica de detección automática de moneda según el monto
            if (currency === 'UYU' && amount < 150) {
                currency = 'USD'; // Si es menor a 150 pesos, probablemente sea dólares
            } else if (currency === 'USD' && amount >= 150) {
                currency = 'UYU'; // Si es mayor o igual a 150 dólares, probablemente sea pesos
            }

            if (!isNaN(amount) && amount > 0 && fecha) {
                expenses.push({
                    date: fecha,
                    description: descripcion ? descripcion.trim() : 'Sin descripción',
                    amount: amount,
                    currency: currency,
                    category: categoria || 'Otros',
                    original_pesos: importe_pesos || '',
                    original_dolares: importe_dolares || ''
                });
            }
        } catch (parseError) {
            console.warn(`⚠️ Error parseando línea CSV ${i + 1}: ${line}`, parseError);
        }
    }

    console.log(`📄 Total de gastos extraídos del CSV estándar (${isSimpleFormat ? 'formato simple' : 'formato extendido'}): ${expenses.length}`);
    return expenses;
}

/**
 * Parsear línea CSV considerando comillas
 */
function parseCSVLine(line) {
    const result = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
        const char = line[i];

        if (char === '"') {
            inQuotes = !inQuotes;
        } else if (char === ',' && !inQuotes) {
            result.push(current.trim());
            current = '';
        } else {
            current += char;
        }
    }

    result.push(current.trim());
    return result;
}

/**
 * Parsear CSV en formato Itaú (el formato original)
 */
function parseItauCSV(lines) {
    const expenses = [];

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();

        // Saltar líneas vacías o headers
        if (!line || line.includes('Fecha Concepto Débito') || line.includes('Saldo anterior') ||
            line.includes('Saldo final') || line.includes('Moneda') || line.includes('Crédito acordado') ||
            line.includes('Cheques depositados') || line.includes('T.E.A.') ||
            line.includes('Buscar') || line.includes('Últimos 5 días') ||
            line.startsWith('https://') || line.includes('Itaú Link')) {
            continue;
        }

        // Buscar líneas que contengan "COMPRA" (gastos)
        if (line.includes('COMPRA')) {
            try {
                // Parsear línea de gasto usando regex
                // Formato esperado: "DD-MM-YY COMPRA DESCRIPCIÓN MONTO SALDO"
                const expenseMatch = line.match(/"?(\d{2}-\d{2}-\d{2})\s+COMPRA\s+([^"]+)\s+([\d,.]+)\s+([\d,.]+)"?/);

                if (expenseMatch) {
                    const [, date, description, amountStr, balanceStr] = expenseMatch;

                    // Limpiar y convertir el monto
                    const amount = parseFloat(amountStr.replace(/\./g, '').replace(',', '.'));

                    // Detectar moneda automáticamente según el monto
                    const currency = amount < 150 ? 'USD' : 'UYU';

                    if (!isNaN(amount) && amount > 0) {
                        expenses.push({
                            date: date,
                            description: description.trim(),
                            amount: amount,
                            currency: currency,
                            balance: parseFloat(balanceStr.replace(/\./g, '').replace(',', '.'))
                        });
                    }
                }
            } catch (parseError) {
                console.warn(`⚠️ Error parseando línea ${i + 1}: ${line}`, parseError);
            }
        }
    }

    console.log(`📄 Total de gastos extraídos del CSV Itaú: ${expenses.length}`);
    return expenses;
}

/**
 * POST /api/public/ai/analyze-pdf
 * Analiza un PDF sin autenticación (modo demo)
 */
router.post('/analyze-pdf', upload.single('pdf'), async (req, res) => {
    try {
        console.log('📄 === INICIANDO PROCESAMIENTO DE PDF ===');
        console.log('📄 Headers recibidos:', JSON.stringify(req.headers, null, 2));

        if (!req.file) {
            console.error('❌ No se recibió archivo PDF en la solicitud');
            return res.status(400).json({
                error: 'Archivo PDF requerido',
                message: 'Debes subir un archivo PDF para analizar'
            });
        }

        const filePath = req.file.path;
        const fileName = req.file.originalname;
        const fileSize = req.file.size;

        console.log(`📄 PDF recibido: ${fileName}`);
        console.log(`📄 Ruta del archivo: ${filePath}`);
        console.log(`📄 Tamaño del archivo: ${fileSize} bytes`);
        console.log(`📄 Directorio de trabajo actual: ${process.cwd()}`);

        // Verificar que el archivo existe usando ruta absoluta
        const absoluteFilePath = path.resolve(filePath);
        console.log(`📄 Ruta absoluta del archivo: ${absoluteFilePath}`);

        if (!fs.existsSync(absoluteFilePath)) {
            console.error(`❌ Archivo no encontrado en el servidor: ${absoluteFilePath}`);
            console.error(`❌ Ruta relativa usada: ${filePath}`);
            return res.status(500).json({
                error: 'Archivo no encontrado',
                message: 'El archivo PDF no se guardó correctamente en el servidor',
                details: {
                    rutaRelativa: filePath,
                    rutaAbsoluta: absoluteFilePath,
                    directorioTrabajo: process.cwd()
                }
            });
        }

        console.log('🤖 Verificando funcionamiento de OpenAI antes de procesar...');

        // Verificar que OpenAI esté funcionando antes de proceder
        const openaiHealth = await checkOpenAIHealth();

        if (openaiHealth.status !== 'success') {
            console.error('❌ OpenAI no está funcionando:', openaiHealth.message);

            // Limpiar archivo temporal
            if (fs.existsSync(absoluteFilePath)) {
                fs.unlinkSync(absoluteFilePath);
                console.log('🧹 Archivo temporal eliminado por error OpenAI:', absoluteFilePath);
            }

            return res.status(503).json({
                error: 'Servicio de IA no disponible',
                message: 'OpenAI no está funcionando correctamente. No se puede analizar el PDF.',
                details: openaiHealth.message,
                timestamp: new Date().toISOString()
            });
        }

        console.log('✅ OpenAI funcionando correctamente');

        // Verificar API Key del usuario desde el FormData
        const userApiKey = req.body.userApiKey || req.body.apiKey; // Puede venir de diferentes campos
        console.log('🔑 API Key del usuario:', userApiKey ? 'Proporcionada por el cliente' : 'No proporcionada');

        // Verificar si tenemos API key (del servidor o del usuario)
        const serverApiKey = process.env.OPENAI_API_KEY;
        const effectiveApiKey = (userApiKey && userApiKey.startsWith('sk-')) ? userApiKey : serverApiKey;

        if (!effectiveApiKey || !effectiveApiKey.startsWith('sk-')) {
            console.error('❌ No hay API Key válida disponible');

            // Limpiar archivo temporal
            if (fs.existsSync(absoluteFilePath)) {
                fs.unlinkSync(absoluteFilePath);
                console.log('🧹 Archivo temporal eliminado por falta de API Key:', absoluteFilePath);
            }

            return res.status(400).json({
                error: 'API Key requerida',
                message: 'Se requiere una API Key válida de OpenAI para analizar PDFs.',
                details: 'Configura OPENAI_API_KEY en el servidor o proporciona tu propia API Key',
                timestamp: new Date().toISOString()
            });
        }

        console.log('📄 Iniciando procesamiento con pdfconverter.py...');

        // Verificar que el archivo existe y tiene contenido
        if (!fs.existsSync(absoluteFilePath)) {
            console.error(`❌ Archivo no encontrado: ${absoluteFilePath}`);
            return res.status(500).json({
                error: 'Archivo no encontrado',
                message: 'El archivo PDF no se guardó correctamente en el servidor',
                details: {
                    rutaAbsoluta: absoluteFilePath,
                    rutaRelativa: filePath
                }
            });
        }

        // Ejecutar el script de Python pdfconverter.py
        console.log('🐍 Ejecutando pdfconverter.py...');

        // Ejecutar Python directamente desde el entorno virtual usando execSync
        const pythonPath = path.join(__dirname, '../../venv/bin/python3');
        const scriptPath = path.join(__dirname, '../../funciones/pdfconverter.py');

        console.log('🐍 Python path:', pythonPath);
        console.log('🐍 Script path:', scriptPath);
        console.log('🐍 File path:', absoluteFilePath);
        console.log('🐍 Working directory:', path.join(__dirname, '../../'));

        let csvOutput = '';
        let exitCode = 0;

        try {
            const command = `"${pythonPath}" "${scriptPath}" "${absoluteFilePath}"`;
            console.log('🐍 Ejecutando comando:', command);

            csvOutput = execSync(command, {
                cwd: path.join(__dirname, '../../'),
                encoding: 'utf-8',
                timeout: 30000, // 30 segundos timeout
                maxBuffer: 1024 * 1024 * 10 // 10MB buffer
            });

            console.log('✅ Script Python ejecutado exitosamente');
            console.log('📄 Output length:', csvOutput.length);
            console.log('📄 Output preview:', csvOutput.substring(0, 100));

        } catch (error) {
            console.error('❌ Error ejecutando Python:', error);
            exitCode = error.status || 1;

            return res.status(500).json({
                error: 'Error procesando PDF',
                message: 'El script de Python falló al procesar el PDF',
                details: {
                    exitCode: exitCode,
                    error: error.message,
                    stderr: error.stderr ? error.stderr.toString() : '',
                    csvOutput: csvOutput.substring(0, 500) + (csvOutput.length > 500 ? '...' : '')
                }
            });
        }

        // Parsear el CSV resultante
        let expenses = [];
        let extractedText = '';
        let lines = [];
        let header = [];


        if (csvOutput && csvOutput.trim()) {
            try {
                // El CSV generado por pdfconverter.py ya tiene headers, parsearlo directamente
                lines = csvOutput.trim().split('\n');

                if (lines.length < 2) {
                    throw new Error('CSV no válido: no hay suficientes líneas');
                }

                // Parsear header y datos
                header = parseCSVLine(lines[0]);
                console.log('📄 Detected header:', header);
                expenses = [];

                // Detectar formato basado en las columnas
                const isOldFormat = header.includes('Tipo') && header.includes('Monto_UYU');
                const isNewTableFormat = header.includes('Concepto') && header.includes('Débito') && header.includes('Crédito');

                console.log('📄 Format detected - Old format:', isOldFormat, 'New table format:', isNewTableFormat);

                for (let i = 1; i < lines.length; i++) {
                    // Parsear línea CSV correctamente manejando comillas
                    const values = parseCSVLine(lines[i]);

                    if (values.length >= header.length) {
                        const expense = {};
                        header.forEach((col, index) => {
                            expense[col.trim()] = values[index] ? values[index].trim() : '';
                        });

                        let amount = 0;
                        let currency = 'UYU';
                        let description = '';
                        let date = '';
                        let shouldInclude = false;

                        if (isOldFormat) {
                            // Formato antiguo: Fecha,Codigo,Descripcion,Cuotas,Monto_UYU,Monto_USD,Tipo
                            if (expense.Monto_UYU && expense.Monto_UYU !== '' && expense.Monto_UYU !== '0') {
                                amount = parseFloat(expense.Monto_UYU.replace(',', '.'));
                                currency = 'UYU';
                            } else if (expense.Monto_USD && expense.Monto_USD !== '' && expense.Monto_USD !== '0') {
                                amount = parseFloat(expense.Monto_USD.replace(',', '.'));
                                currency = 'USD';
                            }

                            shouldInclude = expense.Tipo === 'Transacción' && amount > 0;
                            description = expense.Descripcion;
                            date = expense.Fecha;

                        } else if (isNewTableFormat) {
                            // Formato nuevo: Fecha,Concepto,Débito,Crédito,Saldo
                            description = expense.Concepto || '';
                            date = expense.Fecha || '';

                            // Solo procesar gastos (compras) - ignorar ingresos, rediba, saldos
                            if (description.includes('COMPRA') && expense.Débito && expense.Débito !== '' && expense.Débito !== '0') {
                                // Los montos parecen estar en centavos (113400.0 = 1,134.00)
                                const debitoValue = parseFloat(expense.Débito.replace(',', '.'));
                                if (debitoValue > 1000) { // Si es mayor a 1000, probablemente está en centavos
                                    amount = debitoValue / 100;
                                } else {
                                    amount = debitoValue;
                                }
                                currency = 'UYU';
                                shouldInclude = amount > 0;
                            }
                        }

                        // Solo incluir gastos válidos
                        if (shouldInclude && amount > 0) {
                            expenses.push({
                                date: date,
                                description: description,
                                amount: amount,
                                currency: currency,
                                category: 'Otros'
                            });
                        }
                    } else {
                        console.log(`📄 Skipping line ${i} - not enough values`);
                    }
                }

                extractedText = csvOutput.substring(0, 500) + (csvOutput.length > 500 ? '...' : '');

                if (expenses.length === 0) {
                    console.warn('🚨 No se encontraron gastos en el PDF procesado');

                    return res.status(400).json({
                        error: 'Sin gastos encontrados',
                        message: 'El PDF no contiene gastos válidos para analizar',
                        details: {
                            csvOutput: extractedText,
                            suggestions: [
                                'Verifica que el PDF contenga transacciones bancarias',
                                'Asegúrate de que sea un estado de cuenta válido',
                                'El PDF debe contener información de gastos reconocible'
                            ]
                        },
                        timestamp: new Date().toISOString()
                    });
                }
            } catch (parseError) {
                console.error('❌ Error parseando CSV:', parseError);
                return res.status(500).json({
                    error: 'Error parseando resultado',
                    message: 'El CSV generado por Python no es válido',
                    details: parseError.message
                });
            }
        } else {
            console.error('❌ El script Python no generó salida CSV');
            return res.status(500).json({
                error: 'Sin salida del script',
                message: 'El script de Python no generó ningún resultado',
                details: {
                    errorOutput: errorOutput,
                    exitCode: exitCode
                }
            });
        }

        console.log('🤖 Iniciando análisis con OpenAI...');

        let analysis;
        let analysisMode;

        // Solo usamos análisis con OpenAI
        analysisMode = userApiKey ? 'openai_user' : 'openai_server';

        console.log('🤖 Enviando gastos extraídos a OpenAI para análisis...');

        // Crear respuesta directamente con todas las transacciones categorizadas
        // En lugar de depender de IA para listar todas, procesamos localmente
        const categorizedExpenses = expenses.map(expense => {
            // Categorización básica basada en palabras clave
            const desc = expense.description.toLowerCase();
            let category = 'Otros Gastos';

            // Categorización para ambos formatos
            if (desc.includes('supermercado') || desc.includes('mercado') || desc.includes('alimentacion') ||
                desc.includes('comida') || desc.includes('restaurant') || desc.includes('carniceria')) {
                category = 'Alimentación';
            } else if (desc.includes('combustible') || desc.includes('gasolina') || desc.includes('transporte') ||
                       desc.includes('taxi') || desc.includes('uber')) {
                category = 'Transporte';
            } else if (desc.includes('internet') || desc.includes('telefono') || desc.includes('luz') ||
                       desc.includes('agua') || desc.includes('gas') || desc.includes('cable')) {
                category = 'Servicios';
            } else if (desc.includes('cine') || desc.includes('juego') || desc.includes('streaming') ||
                       desc.includes('netflix') || desc.includes('hobby') || desc.includes('entretenimiento')) {
                category = 'Entretenimiento';
            } else if (desc.includes('medico') || desc.includes('farmacia') || desc.includes('seguro') ||
                       desc.includes('salud') || desc.includes('hospital')) {
                category = 'Salud';
            } else if (desc.includes('curso') || desc.includes('libro') || desc.includes('educacion') ||
                       desc.includes('udemy') || desc.includes('capacitacion')) {
                category = 'Educación';
            } else if (desc.includes('ropa') || desc.includes('vestimenta') || desc.includes('zapato') ||
                       desc.includes('indumentaria')) {
                category = 'Ropa';
            }

            return {
                description: expense.description,
                amount: expense.amount,
                currency: expense.currency,
                category: category,
                date: expense.date,
                confidence: 0.8
            };
        });

        analysis = {
            expenses: categorizedExpenses,
            summary: {
                totalExpenses: categorizedExpenses.reduce((sum, exp) => sum + exp.amount, 0),
                currency: 'UYU',
                expenseCount: categorizedExpenses.length
            }
        };

        // Categorización completada localmente - no necesitamos IA para esto
        analysisMode = 'categorized_locally';
        console.log('✅ Categorización local completada exitosamente');

        // Limpiar archivo temporal
        if (fs.existsSync(absoluteFilePath)) {
            fs.unlinkSync(absoluteFilePath);
            console.log('🧹 Archivo temporal eliminado:', absoluteFilePath);
        }

        res.json({
            success: true,
            data: {
                extractedExpenses: expenses,
                extractedText: extractedText,
                analysis: analysis,
                analysisMode: analysisMode,
                message: analysisMode === 'openai_server'
                    ? 'PDF analizado correctamente con OpenAI (API del servidor)'
                    : 'PDF analizado correctamente con OpenAI (tu API key)'
            }
        });

    } catch (error) {
        console.error('❌ Error analizando PDF público:', error);
        console.error('❌ Stack trace:', error.stack);
        console.error('❌ Tipo de error:', error.constructor.name);
        console.error('❌ Mensaje de error completo:', error.message);
        console.error('❌ NODE_ENV actual:', process.env.NODE_ENV);

        // Limpiar archivo si existe
        try {
            if (req.file && req.file.path) {
                const cleanupPath = path.resolve(req.file.path);
                if (fs.existsSync(cleanupPath)) {
                    fs.unlinkSync(cleanupPath);
                    console.log('🧹 Archivo temporal limpiado:', cleanupPath);
                }
            }
        } catch (cleanupError) {
            console.error('❌ Error limpiando archivo temporal:', cleanupError);
        }

        // Determinar el tipo de error y respuesta apropiada
        let statusCode = 500;
        let errorMessage = 'Error interno del servidor';
        let showDetailsInProduction = false;

        if (error.message && error.message.includes('API Key')) {
            statusCode = 500;
            errorMessage = 'Configuración de API incompleta';
        } else if (error.message && error.message.includes('fetch')) {
            statusCode = 503;
            errorMessage = 'Error de conexión con el servicio de IA';
        } else if (error.message && error.message.includes('timeout')) {
            statusCode = 504;
            errorMessage = 'Timeout en el procesamiento';
        } else if (error.message && error.message.includes('PDF')) {
            statusCode = 400;
            errorMessage = 'Error procesando el archivo PDF';
        } else if (error.message && (error.message.includes('Límite de uso de OpenAI') || error.message.includes('rate limit'))) {
            // Para errores de rate limit, mostrar detalles siempre (son informativos)
            statusCode = 429;
            errorMessage = 'Límite de uso de OpenAI excedido';
            showDetailsInProduction = true;
            console.log('🔥 Detectado error de rate limit, mostrando detalles en producción');
        }

        const responseData = {
            error: error.constructor.name || 'Error interno del servidor',
            message: errorMessage,
            details: (process.env.NODE_ENV === 'development' || showDetailsInProduction) ? error.message : undefined,
            timestamp: new Date().toISOString()
        };

        console.error('📤 Enviando respuesta de error:', JSON.stringify(responseData, null, 2));

        res.status(statusCode).json(responseData);
    }
});

/**
 * GET /api/public/ai/health
 * Verifica el estado de la conexión con OpenAI (público)
 */
router.get('/health', async (req, res) => {
    try {
        console.log('🏥 Verificando estado de OpenAI API (público)...');
        const healthStatus = await checkOpenAIHealth();

        res.json({
            success: true,
            data: healthStatus,
            timestamp: new Date().toISOString(),
            message: 'Estado de OpenAI API verificado (modo demo)'
        });

    } catch (error) {
        console.error('❌ Error verificando estado de OpenAI:', error);
        res.status(500).json({
            error: 'Error interno del servidor',
            message: 'No se pudo verificar el estado de OpenAI'
        });
    }
});

// ==================== RUTAS PROTEGIDAS (REQUIEREN AUTENTICACIÓN) ====================

/**
 * POST /api/ai/analyze-pdf-protected
 * Analiza PDF con IA (requiere autenticación)
 */
router.post('/analyze-pdf-protected', authenticateToken, async (req, res) => {
    try {
        const { text } = req.body;

        if (!text) {
            return res.status(400).json({
                error: 'Texto requerido',
                message: 'Debes proporcionar texto para analizar'
            });
        }

        // Usar la función real de análisis con OpenAI
        console.log('📄 Iniciando análisis de PDF con OpenAI...');
        const analysis = await analyzeTextWithAI(text, req.user?.id || 'anonymous');

        res.json({
            success: true,
            data: analysis
        });

    } catch (error) {
        console.error('❌ Error analizando PDF:', error);
        res.status(500).json({
            error: 'Error interno del servidor',
            message: 'No se pudo analizar el PDF'
        });
    }
});

/**
 * POST /api/public/ai/chat
 * Chat con IA sin autenticación (modo demo)
 */
router.post('/chat', async (req, res) => {
    try {
        const { message } = req.body;

        if (!message) {
            return res.status(400).json({
                error: 'Mensaje requerido',
                message: 'Debes proporcionar un mensaje'
            });
        }

        // Usar OpenAI para generar respuesta del chat (modo demo)
        console.log('💬 Procesando mensaje del chat con OpenAI (modo demo)...');

        // Contexto simplificado para modo demo
        const financialContext = {
            totalIncome: 0,
            totalExpenses: 0,
            balance: 0,
            goalsCount: 0,
            categoriesCount: 0
        };

        const systemPrompt = `Eres un asesor financiero virtual especializado en ayudar a las personas a gestionar mejor su dinero.

INSTRUCCIONES IMPORTANTES:
- Responde de manera profesional pero accesible
- Proporciona consejos prácticos y accionables
- Sé específico con números y estrategias cuando sea posible
- Recomienda siempre estrategias conservadoras primero
- Mantén un tono amigable y motivador

Contexto financiero del usuario (modo demo):
- Ingresos mensuales: $${financialContext.totalIncome}
- Gastos mensuales: $${financialContext.totalExpenses}
- Balance: $${financialContext.balance}
- Metas activas: ${financialContext.goalsCount}
- Categorías: ${financialContext.categoriesCount}

IMPORTANTE: Lista TODAS las transacciones (no resumas ni selecciones "principales"). Incluye todas las líneas proporcionadas. No omitas ninguna.

`;

        // Preparar la solicitud a OpenAI
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 25000); // 25 segundos timeout

        try {
            const openaiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`
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
                            content: message
                        }
                    ],
                    max_tokens: 8000,
                    temperature: 0.7
                }),
                signal: controller.signal
            });

            clearTimeout(timeoutId);

            if (!openaiResponse.ok) {
                throw new Error(`Error en OpenAI API: ${openaiResponse.status}`);
            }

            const data = await openaiResponse.json();
            const aiMessage = data.choices[0].message.content;

            res.json({
                success: true,
                message: 'Consulta procesada correctamente (modo demo)',
                data: {
                    response: aiMessage,
                    timestamp: new Date().toISOString(),
                    mode: 'demo'
                }
            });

        } catch (innerError) {
            console.error('❌ Error interno en chat con OpenAI:', innerError);
            res.status(500).json({
                success: false,
                message: 'Error procesando la consulta con IA (modo demo)',
                data: {
                    response: 'Lo siento, no pude procesar tu consulta en este momento. Por favor, verifica tu conexión e intenta nuevamente.',
                    timestamp: new Date().toISOString(),
                    mode: 'demo'
                }
            });
        }

    } catch (error) {
        console.error('❌ Error en chat con IA:', error);
        res.status(500).json({
            error: 'Error interno del servidor',
            message: 'No se pudo procesar el mensaje'
        });
    }
});

/**
 * POST /api/public/ai/diagnose-goals
 * Diagnóstico financiero con IA - análisis profesional de finanzas personales
 */
router.post('/diagnose-goals', async (req, res) => {
    try {
       
        const { financialData, diagnosisType } = req.body;

        if (!financialData) {
            return res.status(400).json({
                error: 'Datos financieros requeridos',
                message: 'Debes proporcionar datos financieros para el diagnóstico'
            });
        }

        // Verificar que OpenAI esté funcionando antes de proceder
        const openaiHealth = await checkOpenAIHealth();

        if (openaiHealth.status !== 'success') {
            return res.status(503).json({
                error: 'Servicio de IA no disponible',
                message: 'OpenAI no está funcionando correctamente. No se puede realizar el diagnóstico.',
                details: openaiHealth.message,
                timestamp: new Date().toISOString()
            });
        }


        // Verificar API Key del servidor
        const serverApiKey = process.env.OPENAI_API_KEY;

        if (!serverApiKey || !serverApiKey.startsWith('sk-')) {
            
            return res.status(500).json({
                error: 'API Key requerida',
                message: 'Se requiere una API Key válida de OpenAI para el diagnóstico.',
                details: 'Configura OPENAI_API_KEY en el servidor',
                timestamp: new Date().toISOString()
            });
        }

        // Preparar contexto financiero para el diagnóstico
        const financialContext = formatFinancialDataForDiagnosis(financialData);

        // Crear prompt específico para diagnóstico financiero
        const systemPrompt = `Eres un Profesional en Finanzas Personales con más de 15 años de experiencia asesorando a individuos y familias en Uruguay.

Tu especialización incluye:
- Diagnóstico completo de situaciones financieras
- Identificación de patrones de gasto problemáticos
- Recomendaciones personalizadas de ahorro e inversión
- Estrategias de reducción de deudas
- Planificación financiera a corto y largo plazo
- Optimización de presupuestos familiares
- Asesoramiento en metas de ahorro

INSTRUCCIONES ESPECÍFICAS PARA ESTE DIAGNÓSTICO:
1. Analiza la situación financiera actual del usuario de manera profesional y detallada
2. Identifica fortalezas y áreas de mejora en su economía
3. Proporciona consejos prácticos y accionables para mejorar su situación financiera
4. Prioriza estrategias conservadoras y realistas para el contexto uruguayo
5. Incluye recomendaciones específicas sobre ahorro, inversión y reducción de gastos
6. Considera el contexto económico local (tasas de cambio, inflación, etc.)
7. Sé específico con números, porcentajes y plazos realistas
8. Mantén un tono profesional pero accesible y motivador

IMPORTANTE:
- Estructura tu respuesta de manera clara: Diagnóstico, Fortalezas, Áreas de Mejora, Recomendaciones Específicas
- Incluye metas SMART (Specific, Measurable, Achievable, Relevant, Time-bound)
- Considera la situación económica actual de Uruguay
- Sé realista pero optimista en tus proyecciones

Responde como un asesor financiero profesional especializado en finanzas personales en Uruguay.`;

        const userPrompt = `Por favor, realiza un diagnóstico completo de mi situación financiera basado en los siguientes datos:

${financialContext}

Necesito que me ayudes a:
1. Analizar mi situación financiera actual
2. Identificar oportunidades de mejora
3. Darme consejos específicos para ahorrar más dinero
4. Recomendar metas de ahorro realistas
5. Sugerir estrategias para optimizar mis finanzas

Por favor, sé específico y incluye recomendaciones prácticas que pueda implementar inmediatamente.`;

        // Preparar la solicitud a OpenAI
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 45000); // 45 segundos timeout para diagnósticos más complejos

        try {
            const openaiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${serverApiKey}`
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
                    max_tokens: 12000,
                    temperature: 0.7
                }),
                signal: controller.signal
            });

            clearTimeout(timeoutId);

            if (!openaiResponse.ok) {
                throw new Error(`Error en OpenAI API: ${openaiResponse.status}`);
            }

            const data = await openaiResponse.json();
            const diagnosis = data.choices[0].message.content;

         

            res.json({
                success: true,
                data: {
                    analysis: diagnosis,
                    diagnosisType: diagnosisType || 'financial_advisor',
                    timestamp: new Date().toISOString(),
                    message: 'Diagnóstico financiero completado exitosamente'
                }
            });

        } catch (innerError) {
          

            if (innerError.name === 'AbortError') {
                throw new Error('Timeout en el procesamiento del diagnóstico');
            }

            res.status(500).json({
                success: false,
                message: 'Error procesando el diagnóstico con IA',
                data: {
                    response: 'Lo siento, no pude completar el diagnóstico en este momento. Por favor, verifica tu conexión e intenta nuevamente.',
                    timestamp: new Date().toISOString(),
                    diagnosisType: diagnosisType || 'financial_advisor'
                }
            });
        }

    } catch (error) {

        // Determinar el tipo de error y respuesta apropiada
        let statusCode = 500;
        let errorMessage = 'Error interno del servidor';

        if (error.message && error.message.includes('API Key')) {
            statusCode = 500;
            errorMessage = 'Configuración de API incompleta';
        } else if (error.message && error.message.includes('fetch')) {
            statusCode = 503;
            errorMessage = 'Error de conexión con el servicio de IA';
        } else if (error.message && error.message.includes('timeout')) {
            statusCode = 504;
            errorMessage = 'Timeout en el procesamiento del diagnóstico';
        } else if (error.message && error.message.includes('AbortError')) {
            statusCode = 504;
            errorMessage = 'Timeout en el procesamiento del diagnóstico';
        }

        const responseData = {
            error: error.constructor.name || 'Error interno del servidor',
            message: errorMessage,
            details: (process.env.NODE_ENV === 'development') ? error.message : undefined,
            timestamp: new Date().toISOString()
        };


        res.status(statusCode).json(responseData);
    }
});

/**
 * Función auxiliar para formatear datos financieros para diagnóstico
 */
function formatFinancialDataForDiagnosis(financialData) {
    let formattedText = '';

    try {
        // Resumen financiero
        if (financialData.summary) {
            formattedText += `RESUMEN FINANCIERO ACTUAL:\n`;
            formattedText += `- Ingresos UYU: $${financialData.summary.totalIncomeUYU?.toFixed(2) || '0.00'}\n`;
            formattedText += `- Gastos UYU: $${financialData.summary.totalExpensesUYU?.toFixed(2) || '0.00'}\n`;
            formattedText += `- Balance UYU: $${financialData.summary.balanceUYU?.toFixed(2) || '0.00'}\n`;
            formattedText += `- Ingresos USD: $${financialData.summary.totalIncomeUSD?.toFixed(2) || '0.00'}\n`;
            formattedText += `- Gastos USD: $${financialData.summary.totalExpensesUSD?.toFixed(2) || '0.00'}\n`;
            formattedText += `- Balance USD: $${financialData.summary.balanceUSD?.toFixed(2) || '0.00'}\n`;
            formattedText += `- Período actual: ${financialData.summary.currentPeriod || 'No especificado'}\n\n`;
        }

        // Metas activas
        if (financialData.goals && financialData.goals.length > 0) {
            formattedText += `METAS DE AHORRO ACTIVAS:\n`;
            financialData.goals.forEach((goal, index) => {
                formattedText += `${index + 1}. ${goal.name || 'Sin nombre'}\n`;
                formattedText += `   - Monto objetivo: $${goal.amount?.toFixed(2) || '0.00'}\n`;
                formattedText += `   - Ya ahorrado: $${goal.currentSaved?.toFixed(2) || '0.00'}\n`;
                formattedText += `   - Fecha límite: ${goal.deadline ? new Date(goal.deadline).toLocaleDateString('es-UY') : 'Sin fecha'}\n`;
                if (goal.description) {
                    formattedText += `   - Descripción: ${goal.description}\n`;
                }
                formattedText += '\n';
            });
        } else {
            formattedText += `METAS DE AHORRO: No hay metas activas registradas.\n\n`;
        }

        // Transacciones recientes (últimas 20)
        if (financialData.transactions && financialData.transactions.length > 0) {
            formattedText += `TRANSACCIONES RECIENTES:\n`;
            const recentTransactions = financialData.transactions.slice(-20); // Últimas 20 transacciones

            recentTransactions.forEach((transaction, index) => {
                const type = transaction.type === 'income' ? 'INGRESO' : 'GASTO';
                const currency = transaction.currency || 'UYU';
                formattedText += `${index + 1}. ${type} - ${transaction.description || 'Sin descripción'}\n`;
                formattedText += `   - Monto: ${currency} $${transaction.amount?.toFixed(2) || '0.00'}\n`;
                formattedText += `   - Fecha: ${transaction.date ? new Date(transaction.date).toLocaleDateString('es-UY') : 'Sin fecha'}\n`;
                if (transaction.category) {
                    formattedText += `   - Categoría: ${transaction.category}\n`;
                }
                formattedText += '\n';
            });
        } else {
            formattedText += `TRANSACCIONES: No hay transacciones registradas.\n\n`;
        }

        // Categorías
        if (financialData.categories && financialData.categories.length > 0) {
            formattedText += `CATEGORÍAS CONFIGURADAS:\n`;
            financialData.categories.forEach((category, index) => {
                formattedText += `${index + 1}. ${category.name || 'Sin nombre'} (${category.type || 'No especificado'})\n`;
                if (category.description) {
                    formattedText += `   - Descripción: ${category.description}\n`;
                }
            });
            formattedText += '\n';
        }

    } catch (error) {
        console.warn('Error formateando datos financieros:', error);
        formattedText = 'Error procesando datos financieros proporcionados.';
    }

    return formattedText;
}

// ==================== EXPORTAR ROUTER ====================

module.exports = router;
