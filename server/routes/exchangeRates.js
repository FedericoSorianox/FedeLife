/**
 * 💱 RUTAS DE TASAS DE CAMBIO - API
 * 
 * Endpoints para obtener y gestionar tasas de cambio entre monedas
 * Incluye conversiones, historial y estadísticas de tasas
 * Autor: Senior Backend Developer
 */

const express = require('express');
const { exchangeRateService } = require('../services/exchangeRate');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// ==================== VALIDACIONES ====================

/**
 * Valida parámetros de conversión
 */
const validateConversionParams = (req, res, next) => {
    const { fromCurrency, toCurrency, amount, date } = req.body;
    
    const errors = [];
    
    if (!fromCurrency || !['UYU', 'USD'].includes(fromCurrency)) {
        errors.push('Moneda origen inválida');
    }
    
    if (!toCurrency || !['UYU', 'USD'].includes(toCurrency)) {
        errors.push('Moneda destino inválida');
    }
    
    if (!amount || amount <= 0) {
        errors.push('El monto debe ser mayor a 0');
    }
    
    if (date && isNaN(new Date(date).getTime())) {
        errors.push('La fecha debe ser válida');
    }
    
    if (errors.length > 0) {
        return res.status(400).json({
            error: 'Parámetros de conversión inválidos',
            details: errors
        });
    }
    
    next();
};

// ==================== RUTAS ====================

/**
 * GET /api/exchange-rates/convert
 * Convierte un monto entre dos monedas
 */
router.get('/convert', authenticateToken, async (req, res) => {
    try {
        const { fromCurrency, toCurrency, amount, date } = req.query;
        
        if (!fromCurrency || !toCurrency || !amount) {
            return res.status(400).json({
                error: 'Parámetros requeridos: fromCurrency, toCurrency, amount'
            });
        }
        
        const fromCurr = fromCurrency.toUpperCase();
        const toCurr = toCurrency.toUpperCase();
        const amountValue = parseFloat(amount);
        const conversionDate = date ? new Date(date) : new Date();
        
        if (!['UYU', 'USD'].includes(fromCurr) || 
            !['UYU', 'USD'].includes(toCurr)) {
            return res.status(400).json({
                error: 'Monedas no soportadas'
            });
        }
        
        if (amountValue <= 0) {
            return res.status(400).json({
                error: 'El monto debe ser mayor a 0'
            });
        }
        
        const convertedAmount = await exchangeRateService.convertAmount(
            amountValue, 
            fromCurr, 
            toCurr, 
            conversionDate
        );
        
        const rate = await exchangeRateService.getExchangeRate(fromCurr, toCurr, conversionDate);
        
        res.json({
            success: true,
            data: {
                fromCurrency: fromCurr,
                toCurrency: toCurr,
                originalAmount: amountValue,
                convertedAmount: convertedAmount,
                exchangeRate: rate,
                date: conversionDate
            }
        });
        
    } catch (error) {
        console.error('❌ Error en conversión:', error);
        res.status(500).json({
            error: 'Error interno del servidor',
            message: 'No se pudo realizar la conversión'
        });
    }
});

/**
 * POST /api/exchange-rates/convert
 * Convierte un monto entre dos monedas (POST para montos grandes)
 */
router.post('/convert', authenticateToken, validateConversionParams, async (req, res) => {
    try {
        const { fromCurrency, toCurrency, amount, date } = req.body;
        
        const convertedAmount = await exchangeRateService.convertAmount(
            amount, 
            fromCurrency, 
            toCurrency, 
            date ? new Date(date) : new Date()
        );
        
        const rate = await exchangeRateService.getExchangeRate(fromCurrency, toCurrency, date ? new Date(date) : new Date());
        
        res.json({
            success: true,
            data: {
                fromCurrency,
                toCurrency,
                originalAmount: amount,
                convertedAmount: convertedAmount,
                exchangeRate: rate,
                date: date ? new Date(date) : new Date()
            }
        });
        
    } catch (error) {
        console.error('❌ Error en conversión:', error);
        res.status(500).json({
            error: 'Error interno del servidor',
            message: 'No se pudo realizar la conversión'
        });
    }
});

/**
 * GET /api/exchange-rates/rate/:fromCurrency/:toCurrency
 * Obtiene la tasa de cambio actual entre dos monedas
 */
router.get('/rate/:fromCurrency/:toCurrency', authenticateToken, async (req, res) => {
    try {
        const { fromCurrency, toCurrency } = req.params;
        const { date } = req.query;
        
        const fromCurr = fromCurrency.toUpperCase();
        const toCurr = toCurrency.toUpperCase();
        const conversionDate = date ? new Date(date) : new Date();
        
        if (!['UYU', 'USD', 'EUR', 'ARS'].includes(fromCurr) || 
            !['UYU', 'USD', 'EUR', 'ARS'].includes(toCurr)) {
            return res.status(400).json({
                error: 'Monedas no soportadas'
            });
        }
        
        const rate = await exchangeRateService.getExchangeRate(fromCurr, toCurr, conversionDate);
        
        res.json({
            success: true,
            data: {
                fromCurrency: fromCurr,
                toCurrency: toCurr,
                rate: rate,
                date: conversionDate
            }
        });
        
    } catch (error) {
        console.error('❌ Error obteniendo tasa:', error);
        res.status(500).json({
            error: 'Error interno del servidor',
            message: 'No se pudo obtener la tasa de cambio'
        });
    }
});

/**
 * GET /api/exchange-rates/multiple
 * Obtiene tasas para múltiples monedas desde una base
 */
router.get('/multiple', authenticateToken, async (req, res) => {
    try {
        const { baseCurrency, targetCurrencies } = req.query;
        
        if (!baseCurrency) {
            return res.status(400).json({
                error: 'Moneda base requerida'
            });
        }
        
        const baseCurr = baseCurrency.toUpperCase();
        let targetCurrs = ['UYU', 'USD'];
        
        if (targetCurrencies) {
            targetCurrs = targetCurrencies.split(',').map(curr => curr.toUpperCase());
        }
        
        if (!['UYU', 'USD'].includes(baseCurr)) {
            return res.status(400).json({
                error: 'Moneda base no soportada'
            });
        }
        
        const rates = await exchangeRateService.getMultipleRates(baseCurr, targetCurrs);
        
        res.json({
            success: true,
            data: {
                baseCurrency: baseCurr,
                rates: rates,
                date: new Date()
            }
        });
        
    } catch (error) {
        console.error('❌ Error obteniendo múltiples tasas:', error);
        res.status(500).json({
            error: 'Error interno del servidor',
            message: 'No se pudo obtener las tasas de cambio'
        });
    }
});

/**
 * GET /api/exchange-rates/history/:fromCurrency/:toCurrency
 * Obtiene el historial de tasas de cambio
 */
router.get('/history/:fromCurrency/:toCurrency', authenticateToken, async (req, res) => {
    try {
        const { fromCurrency, toCurrency } = req.params;
        const { days = 30 } = req.query;
        
        const fromCurr = fromCurrency.toUpperCase();
        const toCurr = toCurrency.toUpperCase();
        const daysValue = parseInt(days);
        
        if (!['UYU', 'USD'].includes(fromCurr) || 
            !['UYU', 'USD'].includes(toCurr)) {
            return res.status(400).json({
                error: 'Monedas no soportadas'
            });
        }
        
        if (daysValue < 1 || daysValue > 365) {
            return res.status(400).json({
                error: 'Los días deben estar entre 1 y 365'
            });
        }
        
        const history = await exchangeRateService.getRateHistory(fromCurr, toCurr, daysValue);
        
        res.json({
            success: true,
            data: {
                fromCurrency: fromCurr,
                toCurrency: toCurr,
                history: history,
                days: daysValue
            }
        });
        
    } catch (error) {
        console.error('❌ Error obteniendo historial:', error);
        res.status(500).json({
            error: 'Error interno del servidor',
            message: 'No se pudo obtener el historial de tasas'
        });
    }
});

/**
 * POST /api/exchange-rates/refresh
 * Fuerza la actualización de tasas de cambio (admin)
 */
router.post('/refresh', authenticateToken, async (req, res) => {
    try {
        // Limpiar cache para forzar actualización
        exchangeRateService.clearCache();
        
        res.json({
            success: true,
            message: 'Cache de tasas de cambio limpiado',
            data: {
                timestamp: new Date()
            }
        });
        
    } catch (error) {
        console.error('❌ Error refrescando tasas:', error);
        res.status(500).json({
            error: 'Error interno del servidor',
            message: 'No se pudo refrescar las tasas'
        });
    }
});

/**
 * GET /api/exchange-rates/supported
 * Obtiene las monedas soportadas
 */
router.get('/supported', authenticateToken, async (req, res) => {
    try {
        const supportedCurrencies = [
            {
                code: 'UYU',
                name: 'Peso Uruguayo',
                symbol: '$U',
                country: 'Uruguay'
            },
            {
                code: 'USD',
                name: 'Dólar Estadounidense',
                symbol: '$',
                country: 'Estados Unidos'
            }
        ];
        
        res.json({
            success: true,
            data: {
                currencies: supportedCurrencies,
                count: supportedCurrencies.length
            }
        });
        
    } catch (error) {
        console.error('❌ Error obteniendo monedas soportadas:', error);
        res.status(500).json({
            error: 'Error interno del servidor',
            message: 'No se pudo obtener las monedas soportadas'
        });
    }
});

module.exports = router;
