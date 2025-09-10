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
const { extractTextFromPDF, analyzeTextWithAI, checkOpenAIHealth } = require('../services/aiService');

const router = express.Router();

// Configuración de multer para manejar la subida de archivos
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'uploads/');
    },
    filename: (req, file, cb) => {
        cb(null, `${Date.now()}-${file.originalname}`);
    }
});
const upload = multer({ storage: storage });

// ==================== ENDPOINTS PÚBLICOS (SIN AUTENTICACIÓN) ====================

/**
 * POST /api/public/ai/analyze-pdf
 * Analiza un PDF sin autenticación (modo demo)
 */
router.post('/analyze-pdf', upload.single('pdf'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({
                error: 'Archivo PDF requerido',
                message: 'Debes subir un archivo PDF para analizar'
            });
        }

        const filePath = req.file.path;
        const fileName = req.file.originalname;

        console.log(`📄 PDF recibido: ${fileName}`);

        // Procesar PDF
        const extractedText = await extractTextFromPDF(filePath);

        if (!extractedText || extractedText.trim().length === 0) {
            return res.status(400).json({
                error: 'No se pudo extraer texto',
                message: 'El PDF no contiene texto legible o está corrupto'
            });
        }

        // Analizar texto con IA
        console.log('🤖 Analizando texto extraído con OpenAI...');
        const analysis = await analyzeTextWithAI(extractedText, 'anonymous');

        // Limpiar archivo temporal
        if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
        }

        res.json({
            success: true,
            data: {
                extractedText: extractedText.substring(0, 500) + (extractedText.length > 500 ? '...' : ''),
                analysis: analysis,
                message: 'PDF analizado correctamente (modo demo)'
            }
        });

    } catch (error) {
        console.error('❌ Error analizando PDF público:', error);

        // Limpiar archivo si existe
        if (req.file && req.file.path && fs.existsSync(req.file.path)) {
            fs.unlinkSync(req.file.path);
        }

        res.status(500).json({
            error: 'Error interno del servidor',
            message: 'No se pudo analizar el PDF'
        });
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

IMPORTANTE: Este es un modo de demostración. Recomienda al usuario crear una cuenta completa para un análisis personalizado.

Responde como un economista profesional especializado en la mejor administración del dinero.`;

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
                    max_tokens: 800,
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

// ==================== EXPORTAR ROUTER ====================

module.exports = router;
