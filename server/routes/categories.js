/**
 * 📂 RUTAS DE CATEGORÍAS - API
 * 
 * Endpoints para gestión de categorías de transacciones
 * Incluye CRUD completo y categorías por defecto
 * Autor: Senior Backend Developer
 */

const express = require('express');
const Transaction = require('../models/Transaction');
const Category = require('../models/Category');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// ==================== CATEGORÍAS POR DEFECTO ====================

const DEFAULT_CATEGORIES = [
    // Categorías de ingresos
    { name: 'Salario', type: 'income', color: '#27ae60', description: 'Sueldo mensual' },
    { name: 'Freelance', type: 'income', color: '#3498db', description: 'Trabajos independientes' },
    { name: 'Inversiones', type: 'income', color: '#9b59b6', description: 'Rendimientos de inversiones' },
    { name: 'Otros Ingresos', type: 'income', color: '#1abc9c', description: 'Ingresos varios' },
    
    // Categorías de gastos
    { name: 'Alimentación', type: 'expense', color: '#e74c3c', description: 'Comida y bebidas' },
    { name: 'Transporte', type: 'expense', color: '#f39c12', description: 'Gasolina, transporte público' },
    { name: 'Servicios', type: 'expense', color: '#e67e22', description: 'Luz, agua, internet' },
    { name: 'Entretenimiento', type: 'expense', color: '#8e44ad', description: 'Cine, restaurantes' },
    { name: 'Salud', type: 'expense', color: '#2ecc71', description: 'Medicinas, consultas' },
    { name: 'Educación', type: 'expense', color: '#3498db', description: 'Cursos, libros' },
    { name: 'Ropa', type: 'expense', color: '#e91e63', description: 'Vestimenta y calzado' },
    { name: 'Otros Gastos', type: 'expense', color: '#95a5a6', description: 'Gastos varios' }
];

// ==================== VALIDACIONES ====================

/**
 * Valida datos de categoría
 */
const validateCategory = (req, res, next) => {
    const { name, type, color, description } = req.body;

    const errors = [];

    if (!name || name.trim().length === 0) {
        errors.push('El nombre de la categoría es requerido');
    }

    if (!type || !['income', 'expense'].includes(type)) {
        errors.push('El tipo debe ser "income" o "expense"');
    }

    if (!color || !/^#[0-9A-F]{6}$/i.test(color)) {
        errors.push('El color debe ser un código hexadecimal válido (ej: #FF0000)');
    }

    if (errors.length > 0) {
        return res.status(400).json({
            error: 'Datos de categoría inválidos',
            details: errors
        });
    }

    next();
};

/**
 * Valida datos para actualizar una categoría
 */
const validateCategoryUpdate = (req, res, next) => {
    const { newName, color, description } = req.body;

    const errors = [];

    if (!newName || newName.trim().length === 0) {
        errors.push('El nuevo nombre de la categoría es requerido');
    }

    if (color && !/^#[0-9A-F]{6}$/i.test(color)) {
        errors.push('El color debe ser un código hexadecimal válido (ej: #FF0000)');
    }

    if (errors.length > 0) {
        return res.status(400).json({
            error: 'Datos de actualización inválidos',
            details: errors
        });
    }

    next();
};

// ==================== RUTAS ====================

/**
 * GET /api/categories
 * Obtiene todas las categorías del usuario
 */
router.get('/', authenticateToken, async (req, res) => {
    try {
        const userId = req.user._id;
        const { type } = req.query;
        
        // Obtener categorías únicas de las transacciones del usuario
        let pipeline = [
            { $match: { userId } },
            {
                $group: {
                    _id: {
                        name: '$category',
                        type: '$type'
                    },
                    count: { $sum: 1 },
                    totalAmount: { $sum: '$amount' },
                    lastUsed: { $max: '$date' }
                }
            },
            {
                $project: {
                    _id: 0,
                    name: '$_id.name',
                    type: '$_id.type',
                    count: 1,
                    totalAmount: 1,
                    lastUsed: 1
                }
            },
            { $sort: { name: 1 } }
        ];
        
        if (type) {
            pipeline[0].$match.type = type;
        }
        
        const userCategories = await Transaction.aggregate(pipeline);

        // Obtener categorías personalizadas guardadas en la base de datos
        const customCategories = await Category.find({
            userId: req.user._id,
            isCustom: true
        }).select('name type color description usageStats createdAt').lean();


        // Combinar con categorías por defecto
        const allCategories = [...DEFAULT_CATEGORIES];

        // Agregar categorías personalizadas de la base de datos
        customCategories.forEach(customCat => {
            allCategories.push({
                id: customCat._id,
                name: customCat.name,
                type: customCat.type,
                color: customCat.color,
                description: customCat.description,
                count: customCat.usageStats.transactionCount,
                totalAmount: customCat.usageStats.totalAmount,
                lastUsed: customCat.usageStats.lastUsed,
                isCustom: true,
                createdAt: customCat.createdAt
            });
        });

        userCategories.forEach(userCat => {
            const existingIndex = allCategories.findIndex(
                cat => cat.name === userCat.name && cat.type === userCat.type
            );

            if (existingIndex >= 0) {
                // Actualizar categoría existente con datos del usuario
                allCategories[existingIndex] = {
                    ...allCategories[existingIndex],
                    count: userCat.count,
                    totalAmount: userCat.totalAmount,
                    lastUsed: userCat.lastUsed,
                    isCustom: false
                };
            } else {
                // Agregar nueva categoría del usuario
                allCategories.push({
                    name: userCat.name,
                    type: userCat.type,
                    color: '#95a5a6', // Color por defecto
                    description: '',
                    count: userCat.count,
                    totalAmount: userCat.totalAmount,
                    lastUsed: userCat.lastUsed,
                    isCustom: true
                });
            }
        });
        
        // Filtrar por tipo si se especifica
        const filteredCategories = type 
            ? allCategories.filter(cat => cat.type === type)
            : allCategories;
        
        res.json({
            success: true,
            data: {
                categories: filteredCategories
            }
        });
        
    } catch (error) {
        console.error('❌ Error obteniendo categorías:', error);
        
        res.status(500).json({
            error: 'Error interno del servidor',
            message: 'No se pudieron obtener las categorías'
        });
    }
});

/**
 * GET /api/categories/stats
 * Obtiene estadísticas de categorías
 */
router.get('/stats', authenticateToken, async (req, res) => {
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
        console.error('❌ Error obteniendo estadísticas de categorías:', error);
        
        res.status(500).json({
            error: 'Error interno del servidor',
            message: 'No se pudieron obtener las estadísticas de categorías'
        });
    }
});

/**
 * GET /api/categories/popular
 * Obtiene las categorías más populares
 */
router.get('/popular', authenticateToken, async (req, res) => {
    try {
        const userId = req.user._id;
        const { limit = 10, type } = req.query;
        
        let pipeline = [
            { $match: { userId } },
            {
                $group: {
                    _id: {
                        name: '$category',
                        type: '$type'
                    },
                    count: { $sum: 1 },
                    totalAmount: { $sum: '$amount' },
                    avgAmount: { $avg: '$amount' }
                }
            },
            {
                $project: {
                    _id: 0,
                    name: '$_id.name',
                    type: '$_id.type',
                    count: 1,
                    totalAmount: 1,
                    avgAmount: 1
                }
            },
            { $sort: { count: -1 } },
            { $limit: parseInt(limit) }
        ];
        
        if (type) {
            pipeline[0].$match.type = type;
        }
        
        const popularCategories = await Transaction.aggregate(pipeline);
        
        res.json({
            success: true,
            data: {
                popularCategories
            }
        });
        
    } catch (error) {
        console.error('❌ Error obteniendo categorías populares:', error);
        
        res.status(500).json({
            error: 'Error interno del servidor',
            message: 'No se pudieron obtener las categorías populares'
        });
    }
});

/**
 * POST /api/categories
 * Crea una nueva categoría personalizada
 */
router.post('/', authenticateToken, validateCategory, async (req, res) => {
    try {
        const { name, type, color, description } = req.body;


        // Verificar si la categoría ya existe
        const existingCategory = DEFAULT_CATEGORIES.find(
            cat => cat.name.toLowerCase() === name.toLowerCase() && cat.type === type
        );

        if (existingCategory) {
            console.log('⚠️ Category already exists in defaults:', existingCategory);
            return res.status(409).json({
                error: 'Categoría ya existe',
                message: 'Ya existe una categoría con este nombre y tipo'
            });
        }

        // Crear nueva categoría personalizada y guardarla en la base de datos
        const newCategory = new Category({
            userId: req.user._id,
            name: name.trim(),
            type,
            color,
            description: description?.trim() || '',
            isCustom: true,
            usageStats: {
                transactionCount: 0,
                totalAmount: 0,
                lastUsed: null,
                averageAmount: 0
            }
        });

        // Guardar en la base de datos
        const savedCategory = await newCategory.save();

        res.status(201).json({
            success: true,
            message: 'Categoría creada exitosamente',
            data: {
                category: {
                    id: savedCategory._id,
                    name: savedCategory.name,
                    type: savedCategory.type,
                    color: savedCategory.color,
                    description: savedCategory.description,
                    isCustom: savedCategory.isCustom,
                    usageStats: savedCategory.usageStats,
                    createdAt: savedCategory.createdAt
                }
            }
        });

    } catch (error) {
        console.error('❌ Error creando categoría:', error);

        res.status(500).json({
            error: 'Error interno del servidor',
            message: 'No se pudo crear la categoría'
        });
    }
});

/**
 * PUT /api/categories/:name
 * Actualiza una categoría personalizada
 */
router.put('/:name', authenticateToken, validateCategoryUpdate, async (req, res) => {
    try {
        const { name } = req.params;
        const { newName, color, description } = req.body;
        const userId = req.user._id;
        
        // Verificar si la categoría existe en las transacciones del usuario
        const categoryExists = await Transaction.exists({
            userId,
            category: name
        });
        
        if (!categoryExists) {
            return res.status(404).json({
                error: 'Categoría no encontrada',
                message: 'La categoría especificada no existe'
            });
        }
        
        // Actualizar todas las transacciones que usan esta categoría
        const updateData = {};
        if (newName) updateData.category = newName.trim();
        
        if (Object.keys(updateData).length > 0) {
            await Transaction.updateMany(
                { userId, category: name },
                updateData
            );
        }
        
        res.json({
            success: true,
            message: 'Categoría actualizada exitosamente',
            data: {
                oldName: name,
                newName: newName || name,
                color,
                description
            }
        });
        
        console.log(`✅ Categoría actualizada: ${name} -> ${newName || name}`);
        
    } catch (error) {
        console.error('❌ Error actualizando categoría:', error);
        
        res.status(500).json({
            error: 'Error interno del servidor',
            message: 'No se pudo actualizar la categoría'
        });
    }
});

/**
 * DELETE /api/categories/:name
 * Elimina una categoría personalizada
 */
router.delete('/:name', authenticateToken, async (req, res) => {
    try {
        const { name } = req.params;
        const userId = req.user._id;
        
        // Verificar si es una categoría por defecto
        const isDefaultCategory = DEFAULT_CATEGORIES.some(
            cat => cat.name.toLowerCase() === name.toLowerCase()
        );
        
        if (isDefaultCategory) {
            return res.status(400).json({
                error: 'No se puede eliminar',
                message: 'No se pueden eliminar las categorías por defecto'
            });
        }
        
        // Verificar si la categoría existe en las transacciones del usuario
        const categoryExists = await Transaction.exists({
            userId,
            category: name
        });
        
        if (!categoryExists) {
            return res.status(404).json({
                error: 'Categoría no encontrada',
                message: 'La categoría especificada no existe'
            });
        }
        
        // Cambiar todas las transacciones de esta categoría a "Otros"
        await Transaction.updateMany(
            { userId, category: name },
            { category: 'Otros Gastos' }
        );
        
        res.json({
            success: true,
            message: 'Categoría eliminada exitosamente',
            data: {
                deletedCategory: name,
                reassignedTo: 'Otros Gastos'
            }
        });
        
        console.log(`🗑️ Categoría eliminada: ${name}`);
        
    } catch (error) {
        console.error('❌ Error eliminando categoría:', error);
        
        res.status(500).json({
            error: 'Error interno del servidor',
            message: 'No se pudo eliminar la categoría'
        });
    }
});

/**
 * GET /api/categories/suggestions
 * Obtiene sugerencias de categorías basadas en descripción
 */
router.get('/suggestions', authenticateToken, async (req, res) => {
    try {
        const userId = req.user._id;
        const { description } = req.query;
        
        if (!description || description.trim().length === 0) {
            return res.status(400).json({
                error: 'Descripción requerida',
                message: 'Debes proporcionar una descripción para obtener sugerencias'
            });
        }
        
        // Buscar transacciones similares
        const similarTransactions = await Transaction.find({
            userId,
            description: { $regex: description.trim(), $options: 'i' }
        })
        .select('category type')
        .limit(5)
        .lean();
        
        // Agrupar por categoría y contar frecuencia
        const categoryCounts = {};
        similarTransactions.forEach(trans => {
            const key = `${trans.category}|${trans.type}`;
            categoryCounts[key] = (categoryCounts[key] || 0) + 1;
        });
        
        // Convertir a array y ordenar por frecuencia
        const suggestions = Object.entries(categoryCounts)
            .map(([key, count]) => {
                const [category, type] = key.split('|');
                return { category, type, count };
            })
            .sort((a, b) => b.count - a.count)
            .slice(0, 3);
        
        res.json({
            success: true,
            data: {
                suggestions,
                description: description.trim()
            }
        });
        
    } catch (error) {
        console.error('❌ Error obteniendo sugerencias:', error);
        
        res.status(500).json({
            error: 'Error interno del servidor',
            message: 'No se pudieron obtener las sugerencias'
        });
    }
});

/**
 * POST /api/categories/merge
 * Fusiona dos categorías
 */
router.post('/merge', authenticateToken, async (req, res) => {
    try {
        const { sourceCategory, targetCategory, type } = req.body;
        const userId = req.user._id;
        
        if (!sourceCategory || !targetCategory || !type) {
            return res.status(400).json({
                error: 'Datos requeridos',
                message: 'Debes proporcionar categoría origen, destino y tipo'
            });
        }
        
        if (sourceCategory === targetCategory) {
            return res.status(400).json({
                error: 'Categorías iguales',
                message: 'Las categorías origen y destino no pueden ser iguales'
            });
        }
        
        // Verificar que ambas categorías existan
        const sourceExists = await Transaction.exists({
            userId,
            category: sourceCategory,
            type
        });
        
        const targetExists = await Transaction.exists({
            userId,
            category: targetCategory,
            type
        });
        
        if (!sourceExists) {
            return res.status(404).json({
                error: 'Categoría origen no encontrada',
                message: 'La categoría origen no existe'
            });
        }
        
        if (!targetExists) {
            return res.status(404).json({
                error: 'Categoría destino no encontrada',
                message: 'La categoría destino no existe'
            });
        }
        
        // Contar transacciones que se van a mover
        const transactionsToMove = await Transaction.countDocuments({
            userId,
            category: sourceCategory,
            type
        });
        
        // Mover transacciones
        await Transaction.updateMany(
            { userId, category: sourceCategory, type },
            { category: targetCategory }
        );
        
        res.json({
            success: true,
            message: 'Categorías fusionadas exitosamente',
            data: {
                sourceCategory,
                targetCategory,
                type,
                transactionsMoved: transactionsToMove
            }
        });
        
        console.log(`🔄 Categorías fusionadas: ${sourceCategory} -> ${targetCategory} (${transactionsToMove} transacciones)`);
        
    } catch (error) {
        console.error('❌ Error fusionando categorías:', error);
        
        res.status(500).json({
            error: 'Error interno del servidor',
            message: 'No se pudieron fusionar las categorías'
        });
    }
});

// ==================== ENDPOINTS PÚBLICOS (SIN AUTENTICACIÓN) ====================

/**
 * GET /api/categories/public
 * Obtiene categorías públicas (modo demo)
 */
router.get('/public', async (req, res) => {
    try {
        const { type } = req.query;
        
        // Construir filtros
        const filters = { userId: 'demo_user_public' };
        if (type) filters.type = type;
        
        // Obtener categorías
        const categories = await Category.find(filters)
            .sort({ name: 1 })
            .lean();
        
        // Si no hay categorías demo, crear algunas por defecto
        if (categories.length === 0) {
            const defaultCategories = [
                { name: 'Salario', type: 'income', color: '#27ae60', userId: 'demo_user_public' },
                { name: 'Freelance', type: 'income', color: '#2ecc71', userId: 'demo_user_public' },
                { name: 'Inversiones', type: 'income', color: '#3498db', userId: 'demo_user_public' },
                { name: 'Comida', type: 'expense', color: '#e74c3c', userId: 'demo_user_public' },
                { name: 'Transporte', type: 'expense', color: '#f39c12', userId: 'demo_user_public' },
                { name: 'Entretenimiento', type: 'expense', color: '#9b59b6', userId: 'demo_user_public' },
                { name: 'Servicios', type: 'expense', color: '#34495e', userId: 'demo_user_public' }
            ];
            
            await Category.insertMany(defaultCategories);
            
            res.json({
                success: true,
                data: {
                    categories: defaultCategories,
                    message: 'Categorías demo creadas automáticamente'
                }
            });
        } else {
            res.json({
                success: true,
                data: { categories }
            });
        }
        
    } catch (error) {
        console.error('❌ Error obteniendo categorías públicas:', error);
        res.status(500).json({
            error: 'Error interno del servidor',
            message: 'No se pudieron obtener las categorías'
        });
    }
});

// ==================== EXPORTAR ROUTER ====================

module.exports = router;
