/**
 * 📋 RUTAS DE TAREAS - API
 *
 * Endpoints para CRUD de tareas con funcionalidad de kanban
 * Incluye filtros, paginación, búsqueda y estadísticas
 * Autor: Senior Backend Developer
 */

const express = require('express');
const Task = require('../models/Task');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// ==================== VALIDACIONES ====================

/**
 * Valida datos de tarea
 */
const validateTask = (req, res, next) => {
    const { title, status, priority, dueDate, tags } = req.body;

    const errors = [];

    if (!title || title.trim().length === 0) {
        errors.push('El título de la tarea es requerido');
    }

    if (status && !['todo', 'doing', 'done'].includes(status)) {
        errors.push('El estado debe ser "todo", "doing" o "done"');
    }

    if (priority && !['low', 'medium', 'high'].includes(priority)) {
        errors.push('La prioridad debe ser "low", "medium" o "high"');
    }

    if (dueDate && isNaN(new Date(dueDate).getTime())) {
        errors.push('La fecha de vencimiento debe ser válida');
    }

    if (tags && !Array.isArray(tags)) {
        errors.push('Las etiquetas deben ser un array');
    }

    if (tags && Array.isArray(tags)) {
        tags.forEach((tag, index) => {
            if (typeof tag !== 'string' || tag.trim().length === 0) {
                errors.push(`La etiqueta ${index + 1} no es válida`);
            }
        });
    }

    if (errors.length > 0) {
        return res.status(400).json({
            error: 'Datos de tarea inválidos',
            details: errors
        });
    }

    next();
};

// ==================== RUTAS ====================

/**
 * GET /api/tasks
 * Obtiene tareas del usuario con filtros y paginación
 */
router.get('/', authenticateToken, async (req, res) => {
    try {
        const userId = req.user._id;
        const {
            page = 1,
            limit = 50,
            status,
            priority,
            search,
            dueSoon,
            overdue,
            completedToday,
            sortBy = 'order',
            sortOrder = 'asc'
        } = req.query;

        // Construir filtros
        const filters = { userId };

        if (status) filters.status = status;
        if (priority) filters.priority = priority;

        // Filtros especiales
        if (dueSoon === 'true') {
            const tomorrow = new Date();
            tomorrow.setDate(tomorrow.getDate() + 1);
            filters.dueDate = { $lte: tomorrow };
            filters.status = { $ne: 'done' };
        }

        if (overdue === 'true') {
            filters.dueDate = { $lt: new Date() };
            filters.status = { $ne: 'done' };
        }

        if (completedToday === 'true') {
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const tomorrow = new Date(today);
            tomorrow.setDate(tomorrow.getDate() + 1);
            filters.status = 'done';
            filters.completedAt = { $gte: today, $lt: tomorrow };
        }

        // Construir opciones de ordenamiento
        const sortOptions = {};
        sortOptions[sortBy] = sortOrder === 'desc' ? -1 : 1;

        // Aplicar paginación
        const skip = (parseInt(page) - 1) * parseInt(limit);

        // Construir query de búsqueda
        let query = Task.find(filters);

        if (search) {
            query = Task.find({
                ...filters,
                $text: { $search: search }
            });
        }

        // Ejecutar consulta
        const tasks = await query
            .sort(sortOptions)
            .skip(skip)
            .limit(parseInt(limit))
            .populate('userId', 'name email')
            .lean();

        // Contar total
        const totalQuery = search ?
            Task.find({ ...filters, $text: { $search: search } }) :
            Task.find(filters);
        const total = await totalQuery.countDocuments();

        // Obtener estadísticas
        const stats = await Task.getStats(userId);

        res.json({
            success: true,
            data: {
                tasks: tasks.map(task => ({
                    ...task,
                    id: task._id,
                    _id: undefined
                })),
                pagination: {
                    page: parseInt(page),
                    limit: parseInt(limit),
                    total,
                    pages: Math.ceil(total / parseInt(limit))
                },
                stats
            }
        });

    } catch (error) {
        console.error('❌ Error obteniendo tareas:', error);
        res.status(500).json({
            success: false,
            error: 'Error interno del servidor',
            message: 'No se pudieron obtener las tareas'
        });
    }
});

/**
 * GET /api/tasks/:id
 * Obtiene una tarea específica
 */
router.get('/:id', authenticateToken, async (req, res) => {
    try {
        const userId = req.user._id;
        const { id } = req.params;

        const task = await Task.findOne({ _id: id, userId })
            .populate('userId', 'name email')
            .lean();

        if (!task) {
            return res.status(404).json({
                success: false,
                error: 'Tarea no encontrada',
                message: 'La tarea especificada no existe o no tienes acceso'
            });
        }

        res.json({
            success: true,
            data: {
                task: {
                    ...task,
                    id: task._id,
                    _id: undefined
                }
            }
        });

    } catch (error) {
        console.error('❌ Error obteniendo tarea:', error);

        if (error.name === 'CastError') {
            return res.status(400).json({
                success: false,
                error: 'ID inválido',
                message: 'El ID de la tarea no es válido'
            });
        }

        res.status(500).json({
            success: false,
            error: 'Error interno del servidor',
            message: 'No se pudo obtener la tarea'
        });
    }
});

/**
 * POST /api/tasks
 * Crea una nueva tarea
 */
router.post('/', authenticateToken, validateTask, async (req, res) => {
    try {
        const userId = req.user._id;
        const {
            title,
            description,
            status = 'todo',
            priority = 'medium',
            dueDate,
            tags = [],
            notes,
            order = 0
        } = req.body;

        // Obtener el orden máximo para el estado especificado
        if (order === 0) {
            const maxOrderTask = await Task.findOne({ userId, status })
                .sort({ order: -1 })
                .select('order')
                .lean();

            const maxOrder = maxOrderTask ? maxOrderTask.order : 0;
            req.body.order = maxOrder + 1;
        }

        // Crear la tarea
        const task = new Task({
            userId,
            title: title.trim(),
            description: description?.trim(),
            status,
            priority,
            dueDate: dueDate ? new Date(dueDate) : null,
            tags: tags.filter(tag => tag.trim()),
            notes: notes?.trim(),
            order: req.body.order
        });

        await task.save();

        console.log(`📋 Nueva tarea creada: ${task.title} (${task.status})`);

        res.status(201).json({
            success: true,
            message: 'Tarea creada exitosamente',
            data: {
                task: task.getSummary()
            }
        });

    } catch (error) {
        console.error('❌ Error creando tarea:', error);
        res.status(500).json({
            success: false,
            error: 'Error interno del servidor',
            message: 'No se pudo crear la tarea'
        });
    }
});

/**
 * PUT /api/tasks/:id
 * Actualiza una tarea existente
 */
router.put('/:id', authenticateToken, validateTask, async (req, res) => {
    try {
        const userId = req.user._id;
        const { id } = req.params;
        const {
            title,
            description,
            status,
            priority,
            dueDate,
            tags,
            notes,
            order
        } = req.body;

        // Buscar y actualizar la tarea
        const task = await Task.findOne({ _id: id, userId });

        if (!task) {
            return res.status(404).json({
                success: false,
                error: 'Tarea no encontrada',
                message: 'La tarea especificada no existe o no tienes acceso'
            });
        }

        // Actualizar campos
        if (title !== undefined) task.title = title.trim();
        if (description !== undefined) task.description = description?.trim();
        if (status !== undefined) task.status = status;
        if (priority !== undefined) task.priority = priority;
        if (dueDate !== undefined) task.dueDate = dueDate ? new Date(dueDate) : null;
        if (tags !== undefined) task.tags = tags.filter(tag => tag.trim());
        if (notes !== undefined) task.notes = notes?.trim();
        if (order !== undefined) task.order = order;

        await task.save();

        console.log(`📋 Tarea actualizada: ${task.title} (${task.status})`);

        res.json({
            success: true,
            message: 'Tarea actualizada exitosamente',
            data: {
                task: task.getSummary()
            }
        });

    } catch (error) {
        console.error('❌ Error actualizando tarea:', error);

        if (error.name === 'CastError') {
            return res.status(400).json({
                success: false,
                error: 'ID inválido',
                message: 'El ID de la tarea no es válido'
            });
        }

        res.status(500).json({
            success: false,
            error: 'Error interno del servidor',
            message: 'No se pudo actualizar la tarea'
        });
    }
});

/**
 * PUT /api/tasks/:id/move
 * Mueve una tarea entre columnas (drag & drop)
 */
router.put('/:id/move', authenticateToken, async (req, res) => {
    try {
        const userId = req.user._id;
        const { id } = req.params;
        const { status, order } = req.body;

        if (!status || !['todo', 'doing', 'done'].includes(status)) {
            return res.status(400).json({
                success: false,
                error: 'Estado inválido',
                message: 'El estado debe ser "todo", "doing" o "done"'
            });
        }

        // Buscar la tarea
        const task = await Task.findOne({ _id: id, userId });

        if (!task) {
            return res.status(404).json({
                success: false,
                error: 'Tarea no encontrada',
                message: 'La tarea especificada no existe o no tienes acceso'
            });
        }

        const oldStatus = task.status;
        const oldOrder = task.order;

        // Actualizar el orden de otras tareas si es necesario
        if (order !== undefined) {
            // Si se movió dentro de la misma columna
            if (oldStatus === status) {
                if (order > oldOrder) {
                    // Movió hacia abajo
                    await Task.updateMany(
                        {
                            userId,
                            status,
                            order: { $gt: oldOrder, $lte: order }
                        },
                        { $inc: { order: -1 } }
                    );
                } else if (order < oldOrder) {
                    // Movió hacia arriba
                    await Task.updateMany(
                        {
                            userId,
                            status,
                            order: { $gte: order, $lt: oldOrder }
                        },
                        { $inc: { order: 1 } }
                    );
                }
            } else {
                // Se movió a otra columna
                // Decrementar orden de tareas en la columna anterior
                await Task.updateMany(
                    { userId, status: oldStatus, order: { $gt: oldOrder } },
                    { $inc: { order: -1 } }
                );

                // Incrementar orden de tareas en la nueva columna
                await Task.updateMany(
                    { userId, status, order: { $gte: order } },
                    { $inc: { order: 1 } }
                );
            }
        }

        // Actualizar la tarea
        task.status = status;
        if (order !== undefined) task.order = order;

        await task.save();

        console.log(`📋 Tarea movida: ${task.title} (${oldStatus} → ${status})`);

        res.json({
            success: true,
            message: 'Tarea movida exitosamente',
            data: {
                task: task.getSummary()
            }
        });

    } catch (error) {
        console.error('❌ Error moviendo tarea:', error);
        res.status(500).json({
            success: false,
            error: 'Error interno del servidor',
            message: 'No se pudo mover la tarea'
        });
    }
});

/**
 * DELETE /api/tasks/:id
 * Elimina una tarea
 */
router.delete('/:id', authenticateToken, async (req, res) => {
    try {
        const userId = req.user._id;
        const { id } = req.params;

        // Buscar y eliminar la tarea
        const task = await Task.findOneAndDelete({ _id: id, userId });

        if (!task) {
            return res.status(404).json({
                success: false,
                error: 'Tarea no encontrada',
                message: 'La tarea especificada no existe o no tienes acceso'
            });
        }

        // Reordenar las tareas restantes en el mismo estado
        await Task.updateMany(
            {
                userId,
                status: task.status,
                order: { $gt: task.order }
            },
            { $inc: { order: -1 } }
        );

        console.log(`🗑️ Tarea eliminada: ${task.title} (${task.status})`);

        res.json({
            success: true,
            message: 'Tarea eliminada exitosamente'
        });

    } catch (error) {
        console.error('❌ Error eliminando tarea:', error);

        if (error.name === 'CastError') {
            return res.status(400).json({
                success: false,
                error: 'ID inválido',
                message: 'El ID de la tarea no es válido'
            });
        }

        res.status(500).json({
            success: false,
            error: 'Error interno del servidor',
            message: 'No se pudo eliminar la tarea'
        });
    }
});

/**
 * GET /api/tasks/stats/overview
 * Obtiene estadísticas generales de tareas
 */
router.get('/stats/overview', authenticateToken, async (req, res) => {
    try {
        const userId = req.user._id;
        const stats = await Task.getStats(userId);

        res.json({
            success: true,
            data: { stats }
        });

    } catch (error) {
        console.error('❌ Error obteniendo estadísticas:', error);
        res.status(500).json({
            success: false,
            error: 'Error interno del servidor',
            message: 'No se pudieron obtener las estadísticas'
        });
    }
});

/**
 * GET /api/tasks/search
 * Busca tareas por texto
 */
router.get('/search', authenticateToken, async (req, res) => {
    try {
        const userId = req.user._id;
        const { q: searchText, limit = 20 } = req.query;

        if (!searchText || searchText.trim().length < 2) {
            return res.status(400).json({
                success: false,
                error: 'Búsqueda inválida',
                message: 'El término de búsqueda debe tener al menos 2 caracteres'
            });
        }

        const tasks = await Task.searchTasks(userId, searchText.trim(), { limit: parseInt(limit) });

        res.json({
            success: true,
            data: {
                tasks: tasks.map(task => ({
                    ...task,
                    id: task._id,
                    _id: undefined
                })),
                searchTerm: searchText.trim()
            }
        });

    } catch (error) {
        console.error('❌ Error buscando tareas:', error);
        res.status(500).json({
            success: false,
            error: 'Error interno del servidor',
            message: 'No se pudieron buscar las tareas'
        });
    }
});

// ==================== RUTAS PÚBLICAS (PARA DEMO) ====================

/**
 * GET /api/public/tasks
 * Obtiene tareas públicas para modo demo
 */
router.get('/public/tasks', async (req, res) => {
    try {
        const {
            page = 1,
            limit = 20,
            status,
            priority,
            sortBy = 'order',
            sortOrder = 'asc'
        } = req.query;

        // Construir filtros para tareas públicas
        const filters = { userId: null };

        if (status) filters.status = status;
        if (priority) filters.priority = priority;

        // Construir opciones de ordenamiento
        const sortOptions = {};
        sortOptions[sortBy] = sortOrder === 'desc' ? -1 : 1;

        // Aplicar paginación
        const skip = (parseInt(page) - 1) * parseInt(limit);

        const tasks = await Task.find(filters)
            .sort(sortOptions)
            .skip(skip)
            .limit(parseInt(limit));

        const total = await Task.countDocuments(filters);

        // Función para obtener el label de prioridad
        const getPriorityLabel = (priority) => {
            const labels = {
                'low': 'Baja',
                'medium': 'Media',
                'high': 'Alta'
            };
            return labels[priority] || priority;
        };

        res.json({
            success: true,
            data: {
                tasks: tasks.map(task => ({
                    ...task.toObject(),
                    id: task._id,
                    _id: undefined,
                    priorityLabel: getPriorityLabel(task.priority)
                })),
                pagination: {
                    page: parseInt(page),
                    limit: parseInt(limit),
                    total,
                    pages: Math.ceil(total / parseInt(limit))
                }
            }
        });

    } catch (error) {
        console.error('❌ Error obteniendo tareas públicas:', error);
        res.status(500).json({
            success: false,
            error: 'Error interno del servidor',
            message: 'No se pudieron obtener las tareas públicas'
        });
    }
});

/**
 * POST /api/public/tasks
 * Crea una tarea pública para modo demo
 */
router.post('/public/tasks', validateTask, async (req, res) => {
    try {
        const {
            title,
            description,
            status = 'todo',
            priority = 'medium',
            dueDate,
            tags = [],
            notes,
            order = 0
        } = req.body;

        // Obtener el orden máximo para el estado especificado
        if (order === 0) {
            const maxOrderTask = await Task.findOne({ userId: null, status })
                .sort({ order: -1 })
                .select('order')
                .lean();

            const maxOrder = maxOrderTask ? maxOrderTask.order : 0;
            req.body.order = maxOrder + 1;
        }

        const task = new Task({
            userId: null, // Tarea pública
            title: title.trim(),
            description: description?.trim(),
            status,
            priority,
            dueDate: dueDate ? new Date(dueDate) : null,
            tags: tags.filter(tag => tag.trim()),
            notes: notes?.trim(),
            order: req.body.order
        });

        await task.save();

        // Función para obtener el label de prioridad
        const getPriorityLabel = (priority) => {
            const labels = {
                'low': 'Baja',
                'medium': 'Media',
                'high': 'Alta'
            };
            return labels[priority] || priority;
        };

        res.status(201).json({
            success: true,
            message: 'Tarea pública creada exitosamente',
            data: {
                task: {
                    ...task.toObject(),
                    id: task._id,
                    priorityLabel: getPriorityLabel(task.priority)
                }
            }
        });

    } catch (error) {
        console.error('❌ Error creando tarea pública:', error);
        res.status(500).json({
            success: false,
            error: 'Error interno del servidor',
            message: 'No se pudo crear la tarea pública'
        });
    }
});

/**
 * PUT /api/public/tasks/:id/move
 * Mueve una tarea pública
 */
router.put('/public/tasks/:id/move', async (req, res) => {
    try {
        const { id } = req.params;
        const { status, order } = req.body;

        if (!status || !['todo', 'doing', 'done'].includes(status)) {
            return res.status(400).json({
                success: false,
                error: 'Estado inválido',
                message: 'El estado debe ser "todo", "doing" o "done"'
            });
        }

        const task = await Task.findOne({ _id: id, userId: null });

        if (!task) {
            return res.status(404).json({
                success: false,
                error: 'Tarea no encontrada',
                message: 'La tarea pública especificada no existe'
            });
        }

        const oldStatus = task.status;
        const oldOrder = task.order;

        // Actualizar órdenes si es necesario
        if (order !== undefined) {
            if (oldStatus === status) {
                if (order > oldOrder) {
                    await Task.updateMany(
                        { userId: null, status, order: { $gt: oldOrder, $lte: order } },
                        { $inc: { order: -1 } }
                    );
                } else if (order < oldOrder) {
                    await Task.updateMany(
                        { userId: null, status, order: { $gte: order, $lt: oldOrder } },
                        { $inc: { order: 1 } }
                    );
                }
            } else {
                await Task.updateMany(
                    { userId: null, status: oldStatus, order: { $gt: oldOrder } },
                    { $inc: { order: -1 } }
                );
                await Task.updateMany(
                    { userId: null, status, order: { $gte: order } },
                    { $inc: { order: 1 } }
                );
            }
        }

        task.status = status;
        if (order !== undefined) task.order = order;

        await task.save();

        // Función para obtener el label de prioridad
        const getPriorityLabel = (priority) => {
            const labels = {
                'low': 'Baja',
                'medium': 'Media',
                'high': 'Alta'
            };
            return labels[priority] || priority;
        };

        res.json({
            success: true,
            message: 'Tarea pública movida exitosamente',
            data: {
                task: {
                    ...task.toObject(),
                    id: task._id,
                    priorityLabel: getPriorityLabel(task.priority)
                }
            }
        });

    } catch (error) {
        console.error('❌ Error moviendo tarea pública:', error);
        res.status(500).json({
            success: false,
            error: 'Error interno del servidor',
            message: 'No se pudo mover la tarea pública'
        });
    }
});

/**
 * DELETE /api/public/tasks/:id
 * Elimina una tarea pública
 */
router.delete('/public/tasks/:id', async (req, res) => {
    try {
        const { id } = req.params;

        const task = await Task.findOneAndDelete({ _id: id, userId: null });

        if (!task) {
            return res.status(404).json({
                success: false,
                error: 'Tarea no encontrada',
                message: 'La tarea pública especificada no existe'
            });
        }

        await Task.updateMany(
            { userId: null, status: task.status, order: { $gt: task.order } },
            { $inc: { order: -1 } }
        );

        res.json({
            success: true,
            message: 'Tarea pública eliminada exitosamente'
        });

    } catch (error) {
        console.error('❌ Error eliminando tarea pública:', error);
        res.status(500).json({
            success: false,
            error: 'Error interno del servidor',
            message: 'No se pudo eliminar la tarea pública'
        });
    }
});

module.exports = router;
