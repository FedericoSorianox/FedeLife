/**
 * 📈 RUTAS DE REPORTES - API
 * 
 * Endpoints para reportes financieros
 * Autor: Senior Backend Developer
 */

const express = require('express');
const Transaction = require('../models/Transaction');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// ==================== RUTAS ====================

/**
 * GET /api/reports/summary
 * Obtiene resumen financiero
 */
router.get('/summary', authenticateToken, async (req, res) => {
    try {
        const userId = req.user._id;
        const { period = 'current-month' } = req.query;
        
        // Calcular fechas según el período
        const now = new Date();
        let startDate, endDate;
        
        switch (period) {
            case 'current-month':
                startDate = new Date(now.getFullYear(), now.getMonth(), 1);
                endDate = now;
                break;
            case 'last-month':
                startDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
                endDate = new Date(now.getFullYear(), now.getMonth(), 0);
                break;
            case 'current-year':
                startDate = new Date(now.getFullYear(), 0, 1);
                endDate = now;
                break;
            default:
                startDate = new Date(now.getFullYear(), now.getMonth(), 1);
                endDate = now;
        }
        
        // Obtener estadísticas
        const stats = await Transaction.getStats(userId, {
            date: { $gte: startDate, $lte: endDate }
        });
        
        res.json({
            success: true,
            data: {
                period,
                startDate,
                endDate,
                stats
            }
        });
        
    } catch (error) {
        console.error('❌ Error obteniendo reporte:', error);
        res.status(500).json({
            error: 'Error interno del servidor',
            message: 'No se pudo generar el reporte'
        });
    }
});

module.exports = router;
