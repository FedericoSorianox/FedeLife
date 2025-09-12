/**
 * 💰 RUTAS DE TRANSACCIONES - API
 * 
 * Endpoints para CRUD de transacciones financieras
 * Incluye filtros, paginación, búsqueda y estadísticas
 * Autor: Senior Backend Developer
 */

const express = require('express');
const Transaction = require('../models/Transaction');
const { authenticateToken, userRateLimit } = require('../middleware/auth');

const router = express.Router();

// ==================== VALIDACIONES ====================

/**
 * Valida datos de transacción
 */
const validateTransaction = (req, res, next) => {
    const { type, amount, description, category, date, paymentMethod, currency } = req.body;
    
    const errors = [];
    
    if (!type || !['income', 'expense'].includes(type)) {
        errors.push('El tipo debe ser "income" o "expense"');
    }
    
    if (!amount || amount <= 0) {
        errors.push('El monto debe ser mayor a 0');
    }
    
    if (!description || description.trim().length === 0) {
        errors.push('La descripción es requerida');
    }
    
    if (!category || category.trim().length === 0) {
        errors.push('La categoría es requerida');
    }
    
    if (date && isNaN(new Date(date).getTime())) {
        errors.push('La fecha debe ser válida');
    }
    
    if (paymentMethod && !['cash', 'card', 'transfer', 'check'].includes(paymentMethod)) {
        errors.push('Método de pago inválido');
    }
    
    if (currency && !['UYU', 'USD'].includes(currency)) {
        errors.push('Moneda inválida');
    }
    
    if (errors.length > 0) {
        return res.status(400).json({
            error: 'Datos de transacción inválidos',
            details: errors
        });
    }
    
    next();
};

// ==================== RUTAS ====================

/**
 * GET /api/transactions
 * Obtiene transacciones del usuario con filtros y paginación
 */
router.get('/', authenticateToken, async (req, res) => {
    try {
        const userId = req.user._id;
        const {
            page = 1,
            limit = 20,
            type,
            category,
            paymentMethod,
            startDate,
            endDate,
            month,
            year,
            search,
            sortBy = 'date',
            sortOrder = 'desc'
        } = req.query;
        
        // Construir filtros
        const filters = { userId };
        
        if (type) filters.type = type;
        if (category) filters.category = category;
        if (paymentMethod) filters.paymentMethod = paymentMethod;
        
        // Filtros de fecha
        if (startDate || endDate) {
            filters.date = {};
            if (startDate) filters.date.$gte = new Date(startDate);
            if (endDate) filters.date.$lte = new Date(endDate);
        }
        
        if (month) {
            const [year, monthNum] = month.split('-');
            const startOfMonth = new Date(parseInt(year), parseInt(monthNum) - 1, 1);
            const endOfMonth = new Date(parseInt(year), parseInt(monthNum), 0, 23, 59, 59);
            filters.date = { $gte: startOfMonth, $lte: endOfMonth };
        }
        
        if (year) {
            const startOfYear = new Date(parseInt(year), 0, 1);
            const endOfYear = new Date(parseInt(year), 11, 31, 23, 59, 59);
            filters.date = { $gte: startOfYear, $lte: endOfYear };
        }
        
        // Búsqueda por texto
        if (search) {
            filters.$text = { $search: search };
        }
        
        // Configurar ordenamiento
        const sort = {};
        sort[sortBy] = sortOrder === 'desc' ? -1 : 1;
        
        // Calcular paginación
        const skip = (parseInt(page) - 1) * parseInt(limit);
        
        // Ejecutar consulta
        const [transactions, total] = await Promise.all([
            Transaction.find(filters)
                .sort(sort)
                .skip(skip)
                .limit(parseInt(limit))
                .lean(),
            Transaction.countDocuments(filters)
        ]);
        
        // Calcular estadísticas
        const stats = await Transaction.getStats(userId, filters);
        
        res.json({
            success: true,
            data: {
                transactions: transactions.map(t => ({
                    ...t,
                    id: t._id.toString(), // Convertir _id de MongoDB a id para el frontend
                    formattedAmount: new Intl.NumberFormat('es-UY', {
                        style: 'currency',
                        currency: t.currency,
                        minimumFractionDigits: 0,
                        maximumFractionDigits: 2
                    }).format(t.amount),
                    typeLabel: t.type === 'income' ? 'Ingreso' : 'Gasto'
                })),
                pagination: {
                    page: parseInt(page),
                    limit: parseInt(limit),
                    total,
                    pages: Math.ceil(total / parseInt(limit)),
                    hasNext: skip + parseInt(limit) < total,
                    hasPrev: parseInt(page) > 1
                },
                stats
            }
        });
        
    } catch (error) {
        console.error('❌ Error obteniendo transacciones:', error);
        
        res.status(500).json({
            error: 'Error interno del servidor',
            message: 'No se pudieron obtener las transacciones'
        });
    }
});

/**
 * GET /api/transactions/:id
 * Obtiene una transacción específica
 */
router.get('/:id', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user._id;
        
        const transaction = await Transaction.findOne({ _id: id, userId }).lean();
        
        if (!transaction) {
            return res.status(404).json({
                error: 'Transacción no encontrada',
                message: 'La transacción especificada no existe'
            });
        }
        
        res.json({
            success: true,
            data: {
                transaction: {
                    ...transaction,
                    id: transaction._id.toString(), // Convertir _id de MongoDB a id para el frontend
                    formattedAmount: new Intl.NumberFormat('es-UY', {
                        style: 'currency',
                        currency: transaction.currency,
                        minimumFractionDigits: 0,
                        maximumFractionDigits: 2
                    }).format(transaction.amount),
                    typeLabel: transaction.type === 'income' ? 'Ingreso' : 'Gasto'
                }
            }
        });
        
    } catch (error) {
        console.error('❌ Error obteniendo transacción:', error);
        
        if (error.name === 'CastError') {
            return res.status(400).json({
                error: 'ID inválido',
                message: 'El ID de la transacción no es válido'
            });
        }
        
        res.status(500).json({
            error: 'Error interno del servidor',
            message: 'No se pudo obtener la transacción'
        });
    }
});

/**
 * POST /api/transactions
 * Crea una nueva transacción
 */
router.post('/', authenticateToken, validateTransaction, async (req, res) => {
    try {
        const userId = req.user._id;
        const {
            type,
            amount,
            description,
            category,
            date = new Date(),
            paymentMethod = 'card',
            currency = 'UYU',
            tags = [],
            notes,
            status = 'completed'
        } = req.body;
        
        // Crear transacción
        const transaction = new Transaction({
            userId,
            type,
            amount: parseFloat(amount),
            description: description.trim(),
            category: category.trim(),
            date: new Date(date),
            paymentMethod,
            currency,
            tags: tags.filter(tag => tag.trim()),
            notes: notes?.trim(),
            status
        });

        // Convertir a moneda base del usuario si es diferente
        if (transaction.currency !== req.user.currency) {
            await transaction.convertToUserCurrency(req.user.currency);
        } else {
            // Si es la misma moneda, establecer valores por defecto
            transaction.convertedAmount = transaction.amount;
            transaction.userBaseCurrency = req.user.currency;
            transaction.exchangeRate = 1;
            transaction.exchangeRateDate = new Date();
            await transaction.save();
        }
        
        res.status(201).json({
            success: true,
            message: 'Transacción creada exitosamente',
            data: {
                transaction: {
                    ...transaction.toObject(),
                    id: transaction._id.toString(), // Convertir _id de MongoDB a id para el frontend
                    formattedAmount: transaction.formattedAmount,
                    typeLabel: transaction.typeLabel
                }
            }
        });
        
        console.log(`✅ Transacción creada: ${transaction.type} - $${transaction.amount} - ${transaction.description}`);
        
    } catch (error) {
        console.error('❌ Error creando transacción:', error);
        
        if (error.name === 'ValidationError') {
            const errors = Object.values(error.errors).map(err => err.message);
            return res.status(400).json({
                error: 'Error de validación',
                details: errors
            });
        }
        
        res.status(500).json({
            error: 'Error interno del servidor',
            message: 'No se pudo crear la transacción'
        });
    }
});

/**
 * PUT /api/transactions/:id
 * Actualiza una transacción existente
 */
router.put('/:id', authenticateToken, validateTransaction, async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user._id;
        const updates = req.body;
        
        // Buscar transacción
        const transaction = await Transaction.findOne({ _id: id, userId });
        
        if (!transaction) {
            return res.status(404).json({
                error: 'Transacción no encontrada',
                message: 'La transacción especificada no existe'
            });
        }
        
        // Actualizar campos
        if (updates.type) transaction.type = updates.type;
        if (updates.amount) transaction.amount = parseFloat(updates.amount);
        if (updates.description) transaction.description = updates.description.trim();
        if (updates.category) transaction.category = updates.category.trim();
        if (updates.date) transaction.date = new Date(updates.date);
        if (updates.paymentMethod) transaction.paymentMethod = updates.paymentMethod;
        if (updates.tags) transaction.tags = updates.tags.filter(tag => tag.trim());
        if (updates.notes !== undefined) transaction.notes = updates.notes?.trim();
        if (updates.status) transaction.status = updates.status;
        
        // Si se actualiza la moneda, recalcular conversión
        if (updates.currency && updates.currency !== transaction.currency) {
            transaction.currency = updates.currency;
            await transaction.convertToUserCurrency(req.user.currency);
        } else {
            await transaction.save();
        }
        
        res.json({
            success: true,
            message: 'Transacción actualizada exitosamente',
            data: {
                transaction: {
                    ...transaction.toObject(),
                    id: transaction._id.toString(), // Convertir _id de MongoDB a id para el frontend
                    formattedAmount: transaction.formattedAmount,
                    typeLabel: transaction.typeLabel
                }
            }
        });
        
        console.log(`✅ Transacción actualizada: ${transaction.type} - $${transaction.amount} - ${transaction.description}`);
        
    } catch (error) {
        console.error('❌ Error actualizando transacción:', error);
        
        if (error.name === 'CastError') {
            return res.status(400).json({
                error: 'ID inválido',
                message: 'El ID de la transacción no es válido'
            });
        }
        
        if (error.name === 'ValidationError') {
            const errors = Object.values(error.errors).map(err => err.message);
            return res.status(400).json({
                error: 'Error de validación',
                details: errors
            });
        }
        
        res.status(500).json({
            error: 'Error interno del servidor',
            message: 'No se pudo actualizar la transacción'
        });
    }
});

/**
 * DELETE /api/transactions/:id
 * Elimina una transacción
 */
router.delete('/:id', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user._id;
        
        const transaction = await Transaction.findOneAndDelete({ _id: id, userId });
        
        if (!transaction) {
            return res.status(404).json({
                error: 'Transacción no encontrada',
                message: 'La transacción especificada no existe'
            });
        }
        
        res.json({
            success: true,
            message: 'Transacción eliminada exitosamente'
        });
        
        console.log(`🗑️ Transacción eliminada: ${transaction.type} - $${transaction.amount} - ${transaction.description}`);
        
    } catch (error) {
        console.error('❌ Error eliminando transacción:', error);
        
        if (error.name === 'CastError') {
            return res.status(400).json({
                error: 'ID inválido',
                message: 'El ID de la transacción no es válido'
            });
        }
        
        res.status(500).json({
            error: 'Error interno del servidor',
            message: 'No se pudo eliminar la transacción'
        });
    }
});

/**
 * GET /api/transactions/stats/summary
 * Obtiene resumen estadístico de transacciones
 */
router.get('/stats/summary', authenticateToken, async (req, res) => {
    try {
        const userId = req.user._id;
        const { startDate, endDate, month, year } = req.query;
        
        // Construir filtros
        const filters = { userId };
        
        if (startDate || endDate) {
            filters.date = {};
            if (startDate) filters.date.$gte = new Date(startDate);
            if (endDate) filters.date.$lte = new Date(endDate);
        }
        
        if (month) {
            const [year, monthNum] = month.split('-');
            const startOfMonth = new Date(parseInt(year), parseInt(monthNum) - 1, 1);
            const endOfMonth = new Date(parseInt(year), parseInt(monthNum), 0, 23, 59, 59);
            filters.date = { $gte: startOfMonth, $lte: endOfMonth };
        }
        
        if (year) {
            const startOfYear = new Date(parseInt(year), 0, 1);
            const endOfYear = new Date(parseInt(year), 11, 31, 23, 59, 59);
            filters.date = { $gte: startOfYear, $lte: endOfYear };
        }
        
        // Obtener estadísticas
        const stats = await Transaction.getStats(userId, filters);
        
        res.json({
            success: true,
            data: { stats }
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
 * GET /api/transactions/stats/categories
 * Obtiene estadísticas por categoría
 */
router.get('/stats/categories', authenticateToken, async (req, res) => {
    try {
        const userId = req.user._id;
        const { startDate, endDate, month, year } = req.query;
        
        // Construir filtros
        const filters = { userId };
        
        if (startDate || endDate) {
            filters.date = {};
            if (startDate) filters.date.$gte = new Date(startDate);
            if (endDate) filters.date.$lte = new Date(endDate);
        }
        
        if (month) {
            const [year, monthNum] = month.split('-');
            const startOfMonth = new Date(parseInt(year), parseInt(monthNum) - 1, 1);
            const endOfMonth = new Date(parseInt(year), parseInt(monthNum), 0, 23, 59, 59);
            filters.date = { $gte: startOfMonth, $lte: endOfMonth };
        }
        
        if (year) {
            const startOfYear = new Date(parseInt(year), 0, 1);
            const endOfYear = new Date(parseInt(year), 11, 31, 23, 59, 59);
            filters.date = { $gte: startOfYear, $lte: endOfYear };
        }
        
        // Obtener estadísticas por categoría
        const categoryStats = await Transaction.getCategoryStats(userId, filters);
        
        res.json({
            success: true,
            data: { categoryStats }
        });
        
    } catch (error) {
        console.error('❌ Error obteniendo estadísticas por categoría:', error);
        
        res.status(500).json({
            error: 'Error interno del servidor',
            message: 'No se pudieron obtener las estadísticas por categoría'
        });
    }
});

/**
 * GET /api/transactions/stats/monthly
 * Obtiene estadísticas mensuales
 */
router.get('/stats/monthly', authenticateToken, async (req, res) => {
    try {
        const userId = req.user._id;
        const { startDate, endDate } = req.query;
        
        const start = startDate ? new Date(startDate) : new Date(new Date().getFullYear(), 0, 1);
        const end = endDate ? new Date(endDate) : new Date();
        
        // Obtener estadísticas mensuales
        const monthlyStats = await Transaction.getMonthlyStats(userId, start, end);
        
        res.json({
            success: true,
            data: { monthlyStats }
        });
        
    } catch (error) {
        console.error('❌ Error obteniendo estadísticas mensuales:', error);
        
        res.status(500).json({
            error: 'Error interno del servidor',
            message: 'No se pudieron obtener las estadísticas mensuales'
        });
    }
});

/**
 * POST /api/transactions/search
 * Busca transacciones por texto
 */
router.post('/search', authenticateToken, async (req, res) => {
    try {
        const userId = req.user._id;
        const { searchText, limit = 20, skip = 0, sort = { date: -1 } } = req.body;
        
        if (!searchText || searchText.trim().length === 0) {
            return res.status(400).json({
                error: 'Texto de búsqueda requerido',
                message: 'Debes proporcionar un texto para buscar'
            });
        }
        
        // Buscar transacciones
        const transactions = await Transaction.searchTransactions(
            userId,
            searchText.trim(),
            { limit: parseInt(limit), skip: parseInt(skip), sort }
        );
        
        res.json({
            success: true,
            data: {
                transactions: transactions.map(t => ({
                    ...t,
                    id: t._id.toString(), // Convertir _id de MongoDB a id para el frontend
                    formattedAmount: new Intl.NumberFormat('es-UY', {
                        style: 'currency',
                        currency: t.currency,
                        minimumFractionDigits: 0,
                        maximumFractionDigits: 2
                    }).format(t.amount),
                    typeLabel: t.type === 'income' ? 'Ingreso' : 'Gasto'
                })),
                searchText: searchText.trim(),
                count: transactions.length
            }
        });
        
    } catch (error) {
        console.error('❌ Error buscando transacciones:', error);
        
        res.status(500).json({
            error: 'Error interno del servidor',
            message: 'No se pudieron buscar las transacciones'
        });
    }
});

/**
 * POST /api/transactions/bulk
 * Crea múltiples transacciones de una vez
 */
router.post('/bulk', authenticateToken, async (req, res) => {
    try {
        const userId = req.user._id;
        const { transactions } = req.body;
        
        if (!Array.isArray(transactions) || transactions.length === 0) {
            return res.status(400).json({
                error: 'Datos inválidos',
                message: 'Debes proporcionar un array de transacciones'
            });
        }
        
        if (transactions.length > 100) {
            return res.status(400).json({
                error: 'Límite excedido',
                message: 'No puedes crear más de 100 transacciones a la vez'
            });
        }
        
        // Validar y crear transacciones
        const createdTransactions = [];
        const errors = [];
        
        for (let i = 0; i < transactions.length; i++) {
            try {
                const transactionData = transactions[i];
                
                // Validar datos básicos
                if (!transactionData.type || !transactionData.amount || !transactionData.description) {
                    errors.push(`Transacción ${i + 1}: Datos incompletos`);
                    continue;
                }
                
                const transaction = new Transaction({
                    userId,
                    type: transactionData.type,
                    amount: parseFloat(transactionData.amount),
                    description: transactionData.description.trim(),
                    category: transactionData.category?.trim() || 'Otros',
                    date: transactionData.date ? new Date(transactionData.date) : new Date(),
                    paymentMethod: transactionData.paymentMethod || 'card',
                    currency: transactionData.currency || 'UYU',
                    tags: transactionData.tags?.filter(tag => tag.trim()) || [],
                    notes: transactionData.notes?.trim(),
                    status: transactionData.status || 'completed'
                });
                
                await transaction.save();
                createdTransactions.push(transaction);
                
            } catch (error) {
                errors.push(`Transacción ${i + 1}: ${error.message}`);
            }
        }
        
        res.status(201).json({
            success: true,
            message: `Se crearon ${createdTransactions.length} transacciones exitosamente`,
            data: {
                created: createdTransactions.length,
                total: transactions.length,
                errors: errors.length > 0 ? errors : undefined
            }
        });
        
        console.log(`✅ ${createdTransactions.length} transacciones creadas en bulk`);
        
    } catch (error) {
        console.error('❌ Error creando transacciones en bulk:', error);
        
        res.status(500).json({
            error: 'Error interno del servidor',
            message: 'No se pudieron crear las transacciones'
        });
    }
});

/**
 * POST /api/transactions/sync
 * Endpoint específico para sincronización desde el frontend
 * Recibe datos en formato { data: [...] }
 */
router.post('/sync', authenticateToken, async (req, res) => {
    try {
        const userId = req.user._id;
        const { data } = req.body;

        console.log(`🔄 Sincronizando ${data?.length || 0} transacciones para usuario ${userId}`);

        if (!Array.isArray(data)) {
            return res.status(400).json({
                error: 'Formato inválido',
                message: 'Se requiere un array de datos en el campo "data"'
            });
        }

        // Eliminar transacciones existentes del usuario (para sincronización completa)
        await Transaction.deleteMany({ userId });
        console.log(`🗑️ Transacciones existentes eliminadas para sincronización`);

        // Crear nuevas transacciones
        const createdTransactions = [];
        const errors = [];

        for (const transactionData of data) {
            try {
                // Validar datos básicos
                if (!transactionData.type || !transactionData.amount || !transactionData.description) {
                    errors.push({
                        transaction: transactionData,
                        error: 'Datos incompletos'
                    });
                    continue;
                }

                const transaction = new Transaction({
                    userId,
                    type: transactionData.type,
                    amount: parseFloat(transactionData.amount),
                    description: transactionData.description.trim(),
                    category: transactionData.category || 'Sin categoría',
                    date: new Date(transactionData.date || Date.now()),
                    paymentMethod: transactionData.paymentMethod || 'card',
                    currency: transactionData.currency || 'UYU',
                    createdAt: new Date(transactionData.createdAt || Date.now())
                });

                await transaction.save();
                createdTransactions.push(transaction);
            } catch (error) {
                console.error('❌ Error procesando transacción:', error);
                errors.push({
                    transaction: transactionData,
                    error: error.message
                });
            }
        }

        console.log(`✅ Sincronización completada: ${createdTransactions.length} transacciones creadas, ${errors.length} errores`);

        res.status(200).json({
            success: true,
            message: 'Sincronización completada',
            data: {
                synced: createdTransactions.length,
                errors: errors.length,
                errorDetails: errors
            }
        });

    } catch (error) {
        console.error('❌ Error en sincronización:', error);
        res.status(500).json({
            error: 'Error interno del servidor',
            message: 'No se pudo completar la sincronización'
        });
    }
});

// ==================== ENDPOINTS PÚBLICOS ====================
// Los endpoints públicos ahora están manejados directamente en server/index.js
// para evitar conflictos con el middleware de autenticación

/**
 * POST /api/transactions (PROTEGIDO)
 * Crea una nueva transacción con autenticación requerida
 */
router.post('/', authenticateToken, validateTransaction, async (req, res) => {
    try {
        const {
            type,
            amount,
            description,
            category,
            date = new Date(),
            paymentMethod = 'card',
            currency = 'UYU',
            tags = [],
            notes,
            status = 'completed'
        } = req.body;
        
        // Crear transacción con usuario demo
        const transaction = new Transaction({
            userId: null, // Usuario demo para transacciones públicas
            type,
            amount: parseFloat(amount),
            description: description.trim(),
            category: category.trim(),
            date: new Date(date),
            paymentMethod,
            currency,
            tags: tags.filter(tag => tag.trim()),
            notes: notes?.trim(),
            status
        });

        // Establecer valores por defecto para moneda
        transaction.convertedAmount = transaction.amount;
        transaction.userBaseCurrency = currency;
        transaction.exchangeRate = 1;
        transaction.exchangeRateDate = new Date();
        
        await transaction.save();
        
        res.status(201).json({
            success: true,
            message: 'Transacción creada exitosamente (modo demo)',
            data: {
                transaction: {
                    ...transaction.toObject(),
                    id: transaction._id.toString(), // Convertir _id de MongoDB a id para el frontend
                    formattedAmount: transaction.formattedAmount,
                    typeLabel: transaction.typeLabel
                }
            }
        });
        
        console.log(`✅ Transacción pública creada: ${transaction.type} - $${transaction.amount} - ${transaction.description}`);
        
    } catch (error) {
        console.error('❌ Error creando transacción pública:', error);
        
        if (error.name === 'ValidationError') {
            const errors = Object.values(error.errors).map(err => err.message);
            return res.status(400).json({
                error: 'Error de validación',
                details: errors
            });
        }
        
        res.status(500).json({
            error: 'Error interno del servidor',
            message: 'No se pudo crear la transacción'
        });
    }
});

/**
 * GET /api/transactions (PROTEGIDO)
 * Obtiene transacciones del usuario autenticado
 */
router.get('/', authenticateToken, async (req, res) => {
    try {
        const userId = req.user._id;
        const {
            page = 1,
            limit = 20,
            type,
            category,
            paymentMethod,
            startDate,
            endDate,
            month,
            year,
            search,
            sortBy = 'date',
            sortOrder = 'desc'
        } = req.query;

        // Construir filtros
        const filters = { userId };

        if (type) filters.type = type;
        if (category) filters.category = category;
        if (paymentMethod) filters.paymentMethod = paymentMethod;

        // Filtros de fecha
        if (startDate || endDate || month || year) {
            filters.date = {};
            if (startDate) filters.date.$gte = new Date(startDate);
            if (endDate) filters.date.$lte = new Date(endDate);
            if (month) {
                const [year, monthNum] = month.split('-');
                filters.date.$gte = new Date(parseInt(year), parseInt(monthNum) - 1, 1);
                filters.date.$lt = new Date(parseInt(year), parseInt(monthNum), 1);
            }
            if (year) {
                filters.date.$gte = new Date(parseInt(year), 0, 1);
                filters.date.$lt = new Date(parseInt(year) + 1, 0, 1);
            }
        }

        // Filtro de búsqueda
        if (search) {
            filters.$or = [
                { description: { $regex: search, $options: 'i' } },
                { category: { $regex: search, $options: 'i' } },
                { notes: { $regex: search, $options: 'i' } }
            ];
        }

        // Ordenamiento
        const sortOptions = {};
        sortOptions[sortBy] = sortOrder === 'desc' ? -1 : 1;

        // Aplicar paginación
        const skip = (parseInt(page) - 1) * parseInt(limit);
        const transactions = await Transaction.find(filters)
            .sort(sortOptions)
            .skip(skip)
            .limit(parseInt(limit))
            .populate('userId', 'username')
            .lean();

        // Contar total
        const total = await Transaction.countDocuments(filters);

        res.json({
            success: true,
            data: {
                transactions: transactions.map(t => ({
                    ...t,
                    id: t._id.toString() // Convertir _id de MongoDB a id para el frontend
                })),
                pagination: {
                    currentPage: parseInt(page),
                    totalPages: Math.ceil(total / parseInt(limit)),
                    totalItems: total,
                    itemsPerPage: parseInt(limit)
                }
            }
        });

    } catch (error) {
        console.error('❌ Error obteniendo transacciones:', error);
        res.status(500).json({
            error: 'Error interno del servidor',
            message: 'No se pudieron obtener las transacciones'
        });
    }
});

// ==================== EXPORTAR ROUTER ====================

module.exports = router;
