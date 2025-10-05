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
const {
    analyzeTextWithAI,
    checkOpenAIHealth,
    getCompleteUserData,
    generateAIContext,
    processAdvancedQuery,
    performCompleteFinancialDiagnosis,
    getExpenseCategories,
    validateAndCorrectCategories
} = require('../services/aiService');

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
/*
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
*/

/**
 * Parsear CSV en formato estándar con headers
 */
/*
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
                    category: categoria || 'Otros Gastos',
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
*/

/**
 * Parsear línea CSV considerando comillas
 * Maneja correctamente campos con comas dentro de comillas
 * @param {string} line - Línea CSV a parsear
 * @returns {Array<string>} Array con los valores de la línea
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
/*
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
*/

// ==================== FUNCIONES ELIMINADAS ====================
// Las siguientes funciones han sido eliminadas porque:
// 1. Usaban Python (pdfconverter.py) causando problemas de deployment
// 2. La funcionalidad está completamente implementada en Node.js
// 3. Las nuevas rutas están en /api/pdf-analyze (Next.js) y server/routes/pdf-analyze.js

/**
 * POST /api/public/ai/analyze-pdf - ELIMINADA
 * Esta función usaba Python y ha sido reemplazada por implementación Node.js
 */
router.post('/analyze-pdf', (req, res) => {
    res.status(410).json({
        error: 'Función descontinuada',
        message: 'Esta funcionalidad ha sido movida a /api/pdf-analyze',
        details: 'Use la nueva implementación en Node.js que no requiere Python'
    });
});

/**
 * POST /api/ai/analyze-pdf-protected - ELIMINADA
 * Esta función usaba Python y ha sido reemplazada por implementación Node.js
 */
router.post('/analyze-pdf-protected', (req, res) => {
    res.status(410).json({
        error: 'Función descontinuada',
        message: 'Esta funcionalidad ha sido movida a /api/pdf-analyze',
        details: 'Use la nueva implementación en Node.js que no requiere Python'
    });
});

// ==================== FIN FUNCIONES ELIMINADAS ====================

module.exports = router;
