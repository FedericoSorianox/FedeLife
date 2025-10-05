/**
 * 📄 RUTAS DE ANÁLISIS DE PDF - API
 *
 * Endpoints para análisis de PDFs con IA integrada
 * Incluye extracción de texto y categorización automática
 * Autor: Senior Backend Developer
 *
 * NOTA: Este código puede ser movido a Next.js API Routes
 * para unificar la arquitectura en un solo servidor
 */

const express = require('express');
const multer = require('multer');
const pdfParse = require('pdf-parse-fixed');
const { analyzeTextWithEnvKey, analyzeLargeTextInChunks } = require('../services/aiService');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// Configuración de multer para subida de archivos
const upload = multer({
    limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
    fileFilter: (req, file, cb) => {
        if (file.mimetype === 'application/pdf') {
            cb(null, true);
        } else {
            cb(new Error('Solo se permiten archivos PDF'));
        }
    }
});

// ==================== FUNCIONES UTILITARIAS ====================

/**
 * Optimiza el texto extraído del PDF para análisis
 */
function optimizeTextForAnalysis(text) {
    return text
        .replace(/\n+/g, ' ') // Reemplaza múltiples saltos de línea con espacios
        .replace(/\s+/g, ' ') // Reemplaza múltiples espacios con uno solo
        .replace(/[^\w\s\u00C0-\u017F.,;:!?()[\]{}"'-]/g, '') // Remueve caracteres especiales pero mantiene acentos
        .trim();
}

// ==================== RUTAS ====================

/**
 * POST /api/pdf-analyze
 * Analiza un PDF y extrae gastos automáticamente
 */
router.post('/', authenticateToken, upload.single('pdf'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({
                error: 'No se encontró el archivo PDF'
            });
        }

        console.log('📄 Procesando PDF para análisis...');

        // Extraer texto del PDF usando pdf-parse
        console.log('📄 Extrayendo texto del PDF...');
        let extractedText = '';

        try {
            const data = await pdfParse(req.file.buffer);
            extractedText = data.text;
            console.log(`📄 Texto extraído: ${extractedText.length} caracteres`);
        } catch (pdfError) {
            console.error('❌ Error extrayendo texto del PDF:', pdfError);
            return res.status(400).json({
                error: 'Error procesando el PDF. Verifica que el archivo no esté corrupto.'
            });
        }

        if (!extractedText || extractedText.trim().length === 0) {
            return res.status(400).json({
                error: 'No se pudo extraer texto del PDF. El archivo puede estar vacío o contener solo imágenes.'
            });
        }

        // Optimizar texto para análisis
        console.log('🔧 Optimizando texto para análisis...');
        const optimizedText = optimizeTextForAnalysis(extractedText);

        if (optimizedText.length < 50) {
            return res.status(400).json({
                error: 'El PDF contiene muy poco texto para analizar. Necesita al menos contenido básico de una transacción.'
            });
        }

        // Analizar con IA - con chunking para textos muy largos
        console.log('🤖 Enviando a análisis con OpenAI...');

        let analysisResult;

        // Si el texto es muy largo, dividirlo en chunks
        const MAX_CHUNK_SIZE = 50000; // 50KB por chunk
        if (optimizedText.length > MAX_CHUNK_SIZE) {
            console.log(`📄 Texto muy largo (${optimizedText.length} chars), procesando en chunks...`);
            analysisResult = await analyzeLargeTextInChunks(optimizedText, req.userId);
        } else {
            analysisResult = await analyzeTextWithEnvKey(optimizedText, req.userId);
        }

        if (!analysisResult || !analysisResult.expenses) {
            console.error('❌ Error en el análisis de IA:', analysisResult);
            return res.status(500).json({
                error: 'Error en el análisis con IA. Revisa tu configuración.'
            });
        }

        console.log('✅ Análisis completado exitosamente');

        // Formatear respuesta
        const response = {
            success: true,
            analysis: {
                expenses: analysisResult.expenses || [],
                summary: {
                    totalExpenses: analysisResult.expenses?.reduce((sum, exp) => sum + (exp.amount || 0), 0) || 0,
                    expenseCount: analysisResult.expenses?.length || 0,
                    currency: 'UYU'
                },
                confidence: analysisResult.confidence || 0.8,
                aiModel: 'OpenAI GPT-4o-mini',
                analysisTimestamp: new Date().toISOString()
            }
        };

        res.json(response);

    } catch (error) {
        console.error('❌ Error procesando PDF:', error);

        let errorMessage = 'Error interno del servidor';
        if (error instanceof Error) {
            errorMessage = error.message;
        }

        res.status(500).json({
            error: errorMessage
        });
    }
});

module.exports = router;
