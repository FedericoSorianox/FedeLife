/**
 * 🎯 RUTAS DE METAS - API
 * 
 * Endpoints para gestión de metas de ahorro
 * Autor: Senior Backend Developer
 */

const express = require('express');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// ==================== RUTAS ====================

/**
 * GET /api/goals
 * Obtiene metas del usuario
 */
router.get('/', authenticateToken, async (req, res) => {
    try {
        // Por ahora, simulamos las metas
        const goals = [];
        
        res.json({
            success: true,
            data: { goals }
        });
        
    } catch (error) {
        console.error('❌ Error obteniendo metas:', error);
        res.status(500).json({
            error: 'Error interno del servidor',
            message: 'No se pudieron obtener las metas'
        });
    }
});

/**
 * POST /api/goals
 * Crea una nueva meta
 */
router.post('/', authenticateToken, async (req, res) => {
    try {
        const { name, amount, deadline, description } = req.body;
        
        res.status(201).json({
            success: true,
            message: 'Meta creada exitosamente',
            data: {
                goal: {
                    name,
                    amount: parseFloat(amount),
                    deadline: new Date(deadline),
                    description,
                    currentSaved: 0,
                    completed: false
                }
            }
        });
        
    } catch (error) {
        console.error('❌ Error creando meta:', error);
        res.status(500).json({
            error: 'Error interno del servidor',
            message: 'No se pudo crear la meta'
        });
    }
});

module.exports = router;
