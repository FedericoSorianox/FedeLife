/**
 * 🤖 RUTAS DE IA - API
 * 
 * Endpoints para análisis con IA
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

// ==================== RUTAS ====================

/**
 * POST /api/ai/analyze-pdf
 * Analiza PDF con IA
 */
router.post('/analyze-pdf', authenticateToken, async (req, res) => {
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
 * GET /api/ai/health
 * Verifica el estado de la conexión con OpenAI
 */
router.get('/health', async (req, res) => {
    try {
        console.log('🏥 Verificando estado de OpenAI API...');
        const healthStatus = await checkOpenAIHealth();

        res.json({
            success: true,
            data: healthStatus,
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        console.error('❌ Error verificando estado de OpenAI:', error);
        res.status(500).json({
            success: false,
            error: 'Error interno del servidor',
            message: 'No se pudo verificar el estado de OpenAI',
            timestamp: new Date().toISOString()
        });
    }
});

/**
 * POST /api/ai/chat
 * Chat con IA
 */
router.post('/chat', authenticateToken, async (req, res) => {
    try {
        const { message } = req.body;
        
        if (!message) {
            return res.status(400).json({
                error: 'Mensaje requerido',
                message: 'Debes proporcionar un mensaje'
            });
        }
        
        // Usar OpenAI para generar respuesta del chat
        console.log('💬 Procesando mensaje del chat con OpenAI...');

        // Crear contexto financiero para el chat
        const financialContext = {
            currentPeriod: 'Actual',
            totalIncome: 15000,
            totalExpenses: 12000,
            balance: 3000,
            goalsCount: 3,
            categoriesCount: 8
        };

        const systemPrompt = `Eres un Economista Profesional especializado en administración financiera personal.

Tu especialización incluye:
- Análisis financiero detallado
- Estrategias de ahorro e inversión
- Optimización de presupuestos
- Planificación financiera a largo plazo

IMPORTANTE:
- Responde de manera profesional pero accesible
- Proporciona consejos prácticos y accionables
- Sé específico con números y estrategias
- Recomienda siempre estrategias conservadoras primero

Contexto financiero del usuario:
- Ingresos mensuales: $${financialContext.totalIncome}
- Gastos mensuales: $${financialContext.totalExpenses}
- Balance: $${financialContext.balance}
- Metas activas: ${financialContext.goalsCount}
- Categorías: ${financialContext.categoriesCount}

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

            const response = {
                success: true,
                message: 'Consulta procesada correctamente',
                data: {
                    response: aiMessage,
                    timestamp: new Date().toISOString()
                }
            };
        
            res.json(response);

        } catch (innerError) {
            console.error('❌ Error interno en chat con OpenAI:', innerError);
            const response = {
                success: false,
                message: 'Error procesando la consulta con IA',
                data: {
                    response: 'Lo siento, no pude procesar tu consulta en este momento. Por favor, verifica tu conexión e intenta nuevamente.',
                    timestamp: new Date().toISOString()
                }
            };
            res.json(response);
        }

    } catch (error) {
        console.error('❌ Error en chat con IA:', error);
        res.status(500).json({
            error: 'Error interno del servidor',
            message: 'No se pudo procesar el mensaje'
        });
    }
});

// ==================== ENDPOINTS PÚBLICOS (SIN AUTENTICACIÓN) ====================

/**
 * POST /api/ai/analyze-pdf
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

        // Analizar con IA
        const analysis = await analyzeTextWithAI(extractedText, 'demo_user_public');

        // Limpiar archivo temporal
        fs.unlink(filePath, (err) => {
            if (err) console.warn('⚠️ No se pudo eliminar archivo temporal:', err);
        });

        res.json({
            success: true,
            message: 'PDF analizado exitosamente',
            data: {
                fileName,
                extractedText: extractedText.substring(0, 500) + '...',
                analysis,
                timestamp: new Date().toISOString()
            }
        });

    } catch (error) {
        console.error('❌ Error analizando PDF público:', error);
        
        // Limpiar archivo temporal en caso de error
        if (req.file && req.file.path) {
            fs.unlink(req.file.path, (err) => {
                if (err) console.warn('⚠️ No se pudo eliminar archivo temporal:', err);
            });
        }

        res.status(500).json({
            error: 'Error interno del servidor',
            message: 'No se pudo analizar el PDF'
        });
    }
});

module.exports = router;
