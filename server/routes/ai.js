/**
 * 🤖 RUTAS DE IA - API
 * 
 * Endpoints para análisis con IA
 * Autor: Senior Backend Developer
 */

const express = require('express');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

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

module.exports = router;
