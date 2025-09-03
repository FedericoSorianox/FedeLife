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
const { extractTextFromPDF, analyzeTextWithAI } = require('../services/aiService');

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
        
        // Por ahora, simulamos el análisis
        const analysis = {
            success: true,
            expenses: [],
            confidence: 0.8,
            summary: 'Análisis simulado'
        };
        
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
        
        // Por ahora, simulamos la respuesta
        const response = {
            success: true,
            message: 'Respuesta simulada de IA',
            data: {
                response: 'Esta es una respuesta simulada del chat con IA.'
            }
        };
        
        res.json(response);
        
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
