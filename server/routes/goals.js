/**
 * 🎯 RUTAS DE METAS - API
 *
 * Endpoints para gestión de metas de ahorro con MongoDB
 * Autor: Senior Backend Developer
 */

const express = require('express');
const { authenticateToken } = require('../middleware/auth');
const Goal = require('../models/Goal');

const router = express.Router();

// ==================== RUTAS ====================

/**
 * GET /api/goals
 * Obtiene metas del usuario
 */
router.get('/', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;
        const { status, priority, limit = 50, skip = 0 } = req.query;

        // Construir filtros
        const filters = { userId };
        if (status) filters.status = status;
        if (priority) filters.priority = priority;

        // Obtener metas con paginación
        const goals = await Goal.find(filters)
            .sort({ createdAt: -1 })
            .skip(parseInt(skip))
            .limit(parseInt(limit))
            .lean();

        // Obtener estadísticas
        const stats = await Goal.getStats(userId);

        res.json({
            success: true,
            data: {
                goals,
                stats,
                pagination: {
                    limit: parseInt(limit),
                    skip: parseInt(skip),
                    hasMore: goals.length === parseInt(limit)
                }
            }
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
        const userId = req.user.id;
        const {
            name,
            description,
            targetAmount,
            currentAmount,
            expectedAmount,
            currentDate,
            targetDate,
            currency,
            category,
            priority,
            tags,
            notes
        } = req.body;

        // Crear nueva meta
        const goal = new Goal({
            userId,
            name: name.trim(),
            description: description?.trim(),
            targetAmount: targetAmount ? parseFloat(targetAmount) : null,
            currentAmount: currentAmount ? parseFloat(currentAmount) : 0,
            expectedAmount: expectedAmount ? parseFloat(expectedAmount) : null,
            currentDate: currentDate ? new Date(currentDate) : new Date(),
            targetDate: targetDate ? new Date(targetDate) : null,
            currency: currency || 'UYU',
            category: category?.trim(),
            priority: priority || 'medium',
            tags: Array.isArray(tags) ? tags : [],
            notes: notes?.trim()
        });

        // Guardar en base de datos
        await goal.save();

        res.status(201).json({
            success: true,
            message: 'Meta creada exitosamente',
            data: {
                goal: goal.getSummary()
            }
        });

    } catch (error) {
        console.error('❌ Error creando meta:', error);

        // Manejar errores de validación
        if (error.name === 'ValidationError') {
            const errors = {};
            for (let field in error.errors) {
                errors[field] = error.errors[field].message;
            }
            return res.status(400).json({
                error: 'Datos inválidos',
                message: 'Por favor verifica los datos ingresados',
                validationErrors: errors
            });
        }

        res.status(500).json({
            error: 'Error interno del servidor',
            message: 'No se pudo crear la meta'
        });
    }
});

/**
 * GET /api/goals/:id
 * Obtiene una meta específica
 */
router.get('/:id', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;
        const { id } = req.params;

        const goal = await Goal.findOne({ _id: id, userId });

        if (!goal) {
            return res.status(404).json({
                error: 'Meta no encontrada',
                message: 'La meta solicitada no existe'
            });
        }

        res.json({
            success: true,
            data: {
                goal: goal.getSummary()
            }
        });

    } catch (error) {
        console.error('❌ Error obteniendo meta:', error);
        res.status(500).json({
            error: 'Error interno del servidor',
            message: 'No se pudo obtener la meta'
        });
    }
});

/**
 * PUT /api/goals/:id
 * Actualiza una meta
 */
router.put('/:id', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;
        const { id } = req.params;
        const updates = req.body;

        // Campos que se pueden actualizar
        const allowedUpdates = [
            'name', 'description', 'targetAmount', 'currentAmount', 'expectedAmount',
            'currentDate', 'targetDate', 'currency', 'category', 'priority',
            'status', 'tags', 'notes'
        ];

        // Filtrar solo campos permitidos
        const filteredUpdates = {};
        Object.keys(updates).forEach(key => {
            if (allowedUpdates.includes(key)) {
                if (updates[key] !== null && updates[key] !== undefined && updates[key] !== '') {
                    filteredUpdates[key] = updates[key];
                }
            }
        });

        // Convertir tipos de datos
        if (filteredUpdates.targetAmount) {
            filteredUpdates.targetAmount = parseFloat(filteredUpdates.targetAmount);
        }
        if (filteredUpdates.currentAmount !== undefined) {
            filteredUpdates.currentAmount = parseFloat(filteredUpdates.currentAmount);
        }
        if (filteredUpdates.expectedAmount) {
            filteredUpdates.expectedAmount = parseFloat(filteredUpdates.expectedAmount);
        }
        if (filteredUpdates.currentDate) {
            filteredUpdates.currentDate = new Date(filteredUpdates.currentDate);
        }
        if (filteredUpdates.targetDate) {
            filteredUpdates.targetDate = new Date(filteredUpdates.targetDate);
        }

        const goal = await Goal.findOneAndUpdate(
            { _id: id, userId },
            filteredUpdates,
            { new: true, runValidators: true }
        );

        if (!goal) {
            return res.status(404).json({
                error: 'Meta no encontrada',
                message: 'La meta a actualizar no existe'
            });
        }

        res.json({
            success: true,
            message: 'Meta actualizada exitosamente',
            data: {
                goal: goal.getSummary()
            }
        });

    } catch (error) {
        console.error('❌ Error actualizando meta:', error);

        if (error.name === 'ValidationError') {
            const errors = {};
            for (let field in error.errors) {
                errors[field] = error.errors[field].message;
            }
            return res.status(400).json({
                error: 'Datos inválidos',
                message: 'Por favor verifica los datos ingresados',
                validationErrors: errors
            });
        }

        res.status(500).json({
            error: 'Error interno del servidor',
            message: 'No se pudo actualizar la meta'
        });
    }
});

/**
 * DELETE /api/goals/:id
 * Elimina una meta
 */
router.delete('/:id', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;
        const { id } = req.params;

        const goal = await Goal.findOneAndDelete({ _id: id, userId });

        if (!goal) {
            return res.status(404).json({
                error: 'Meta no encontrada',
                message: 'La meta a eliminar no existe'
            });
        }

        res.json({
            success: true,
            message: 'Meta eliminada exitosamente',
            data: {
                goal: goal.getSummary()
            }
        });

    } catch (error) {
        console.error('❌ Error eliminando meta:', error);
        res.status(500).json({
            error: 'Error interno del servidor',
            message: 'No se pudo eliminar la meta'
        });
    }
});

/**
 * PATCH /api/goals/:id/progress
 * Actualiza el progreso de una meta
 */
router.patch('/:id/progress', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;
        const { id } = req.params;
        const { currentAmount } = req.body;

        if (currentAmount === undefined || currentAmount < 0) {
            return res.status(400).json({
                error: 'Monto inválido',
                message: 'El monto actual debe ser un número positivo'
            });
        }

        const goal = await Goal.findOne({ _id: id, userId });

        if (!goal) {
            return res.status(404).json({
                error: 'Meta no encontrada',
                message: 'La meta no existe'
            });
        }

        // Actualizar monto actual
        goal.currentAmount = parseFloat(currentAmount);
        goal.updateProgress();

        await goal.save();

        res.json({
            success: true,
            message: 'Progreso actualizado exitosamente',
            data: {
                goal: goal.getSummary()
            }
        });

    } catch (error) {
        console.error('❌ Error actualizando progreso:', error);
        res.status(500).json({
            error: 'Error interno del servidor',
            message: 'No se pudo actualizar el progreso'
        });
    }
});

/**
 * GET /api/goals/stats/overview
 * Obtiene estadísticas generales de metas
 */
router.get('/stats/overview', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;

        const stats = await Goal.getStats(userId);
        const goalsByStatus = await Goal.getGoalsByStatus(userId);
        const upcomingDeadlines = await Goal.getUpcomingDeadlines(userId, 30);

        res.json({
            success: true,
            data: {
                stats,
                goalsByStatus,
                upcomingDeadlines: upcomingDeadlines.map(goal => goal.getSummary())
            }
        });

    } catch (error) {
        console.error('❌ Error obteniendo estadísticas:', error);
        res.status(500).json({
            error: 'Error interno del servidor',
            message: 'No se pudieron obtener las estadísticas'
        });
    }
});

/**
 * POST /api/goals/:id/complete
 * Marca una meta como completada
 */
router.post('/:id/complete', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;
        const { id } = req.params;

        const goal = await Goal.findOne({ _id: id, userId });

        if (!goal) {
            return res.status(404).json({
                error: 'Meta no encontrada',
                message: 'La meta no existe'
            });
        }

        if (!goal.canComplete()) {
            return res.status(400).json({
                error: 'Meta no completable',
                message: 'La meta no puede ser completada aún'
            });
        }

        goal.complete();
        await goal.save();

        res.json({
            success: true,
            message: 'Meta completada exitosamente',
            data: {
                goal: goal.getSummary()
            }
        });

    } catch (error) {
        console.error('❌ Error completando meta:', error);
        res.status(500).json({
            error: 'Error interno del servidor',
            message: 'No se pudo completar la meta'
        });
    }
});

module.exports = router;
