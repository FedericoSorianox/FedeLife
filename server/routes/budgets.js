/**
 * 📊 RUTAS DE PRESUPUESTOS - API
 * 
 * Endpoints para gestión de presupuestos mensuales
 * Autor: Senior Backend Developer
 */

const express = require('express');
const Transaction = require('../models/Transaction');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// ==================== VALIDACIONES ====================

const validateBudget = (req, res, next) => {
    const { category, amount, month } = req.body;
    
    const errors = [];
    
    if (!category || category.trim().length === 0) {
        errors.push('La categoría es requerida');
    }
    
    if (!amount || amount <= 0) {
        errors.push('El monto debe ser mayor a 0');
    }
    
    if (!month || !/^\d{4}-\d{2}$/.test(month)) {
        errors.push('El mes debe estar en formato YYYY-MM');
    }
    
    if (errors.length > 0) {
        return res.status(400).json({
            error: 'Datos de presupuesto inválidos',
            details: errors
        });
    }
    
    next();
};

// ==================== RUTAS ====================

/**
 * GET /api/budgets
 * Obtiene presupuestos del usuario
 */
router.get('/', authenticateToken, async (req, res) => {
    try {
        const userId = req.user._id;
        const { month } = req.query;
        
        const targetMonth = month || new Date().toISOString().substr(0, 7);
        
        // Obtener presupuestos del mes (simulado con transacciones)
        const monthTransactions = await Transaction.find({
            userId,
            date: {
                $gte: new Date(targetMonth + '-01'),
                $lte: new Date(targetMonth + '-31')
            }
        }).lean();
        
        // Agrupar por categoría
        const budgetData = {};
        monthTransactions.forEach(trans => {
            if (!budgetData[trans.category]) {
                budgetData[trans.category] = {
                    category: trans.category,
                    spent: 0,
                    count: 0
                };
            }
            if (trans.type === 'expense') {
                budgetData[trans.category].spent += trans.amount;
                budgetData[trans.category].count += 1;
            }
        });
        
        // Convertir a array
        const budgets = Object.values(budgetData).map(budget => ({
            ...budget,
            month: targetMonth,
            progress: 0, // Se calculará en el frontend
            remaining: 0,
            isOverBudget: false
        }));
        
        res.json({
            success: true,
            data: { budgets }
        });
        
    } catch (error) {
        console.error('❌ Error obteniendo presupuestos:', error);
        res.status(500).json({
            error: 'Error interno del servidor',
            message: 'No se pudieron obtener los presupuestos'
        });
    }
});

/**
 * POST /api/budgets
 * Crea un nuevo presupuesto
 */
router.post('/', authenticateToken, validateBudget, async (req, res) => {
    try {
        const { category, amount, month } = req.body;
        
        // Por ahora, solo simulamos la creación
        // En una implementación completa, crearías un modelo Budget
        
        res.status(201).json({
            success: true,
            message: 'Presupuesto creado exitosamente',
            data: {
                budget: {
                    category,
                    amount: parseFloat(amount),
                    month,
                    spent: 0,
                    progress: 0,
                    remaining: parseFloat(amount),
                    isOverBudget: false
                }
            }
        });
        
    } catch (error) {
        console.error('❌ Error creando presupuesto:', error);
        res.status(500).json({
            error: 'Error interno del servidor',
            message: 'No se pudo crear el presupuesto'
        });
    }
});

module.exports = router;
