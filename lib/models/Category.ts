/**
 * 🏷️ MODELO DE CATEGORÍAS - MONGODB
 *
 * Esquema de categorías para clasificar transacciones financieras
 * Incluye categorías por defecto y personalizadas por usuario
 * Autor: Senior Backend Developer
 */

import mongoose from 'mongoose';
import { Category } from '@/types';

// ==================== ESQUEMA DE CATEGORÍAS ====================

const categorySchema = new mongoose.Schema({
    // Referencia al usuario propietario (opcional para categorías públicas)
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        index: true,
        default: null // null para categorías públicas/demo
    },

    // Nombre de la categoría
    name: {
        type: String,
        required: [true, 'El nombre de la categoría es requerido'],
        trim: true,
        maxlength: [50, 'El nombre no puede exceder 50 caracteres'],
        index: true
    },

    // Tipo de categoría
    type: {
        type: String,
        required: [true, 'El tipo de categoría es requerido'],
        enum: {
            values: ['income', 'expense'],
            message: 'El tipo debe ser "income" o "expense"'
        },
        index: true
    },

    // Color de la categoría (código hexadecimal)
    color: {
        type: String,
        required: [true, 'El color es requerido'],
        validate: {
            validator: function(value) {
                return /^#[0-9A-F]{6}$/i.test(value);
            },
            message: 'El color debe ser un código hexadecimal válido (ej: #FF0000)'
        },
        default: '#95a5a6'
    },

    // Descripción opcional
    description: {
        type: String,
        trim: true,
        maxlength: [200, 'La descripción no puede exceder 200 caracteres'],
        default: ''
    },

    // Icono de la categoría (opcional)
    icon: {
        type: String,
        trim: true,
        maxlength: [50, 'El icono no puede exceder 50 caracteres'],
        default: 'tag'
    },

    // Si es una categoría por defecto del sistema
    isDefault: {
        type: Boolean,
        default: false
    },

    // Si es una categoría personalizada del usuario
    isCustom: {
        type: Boolean,
        default: false
    },

    // Estadísticas de uso
    usageStats: {
        transactionCount: {
            type: Number,
            default: 0,
            min: 0
        },
        totalAmount: {
            type: Number,
            default: 0,
            min: 0
        },
        lastUsed: {
            type: Date,
            default: null
        },
        averageAmount: {
            type: Number,
            default: 0,
            min: 0
        }
    },

    // Orden de visualización
    order: {
        type: Number,
        default: 0,
        min: 0
    },

    // Estado de la categoría
    isActive: {
        type: Boolean,
        default: true
    },

    // Metadatos adicionales
    metadata: {
        // Si fue sugerida por IA
        suggestedByAI: {
            type: Boolean,
            default: false
        },

        // Confianza de la IA si fue sugerida
        aiConfidence: {
            type: Number,
            min: 0,
            max: 1,
            default: null
        },

        // Tags para categorización adicional
        tags: [{
            type: String,
            trim: true,
            maxlength: [30, 'Cada tag no puede exceder 30 caracteres']
        }]
    }

}, {
    timestamps: true, // Agrega createdAt y updatedAt automáticamente
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});

// ==================== ÍNDICES COMPUESTOS ====================

// Índices para optimizar consultas frecuentes
categorySchema.index({ userId: 1, type: 1 }); // Categorías por usuario y tipo
categorySchema.index({ userId: 1, name: 1 }); // Categorías por usuario y nombre
categorySchema.index({ userId: 1, isActive: 1 }); // Categorías activas por usuario
categorySchema.index({ type: 1, isDefault: 1 }); // Categorías por defecto
categorySchema.index({ userId: 1, order: 1 }); // Orden de categorías

// Índice de texto para búsquedas
categorySchema.index({
    name: 'text',
    description: 'text'
});

// ==================== VIRTUALS ====================

/**
 * Virtual para el nombre completo de la categoría
 */
categorySchema.virtual('fullName').get(function() {
    return `${this.name} (${this.type === 'income' ? 'Ingreso' : 'Gasto'})`;
});

/**
 * Virtual para verificar si la categoría es pública
 */
categorySchema.virtual('isPublic').get(function() {
    return this.userId === null;
});

/**
 * Virtual para el estado de la categoría
 */
categorySchema.virtual('status').get(function() {
    if (!this.isActive) return 'inactive';
    if (this.isDefault) return 'default';
    if (this.isCustom) return 'custom';
    return 'unknown';
});

// ==================== MÉTODOS DE INSTANCIA ====================

/**
 * Actualiza las estadísticas de uso de la categoría
 */
categorySchema.methods.updateUsageStats = async function() {
    try {
        const Transaction = mongoose.model('Transaction');

        // Obtener estadísticas de las transacciones que usan esta categoría
        const stats = await Transaction.aggregate([
            {
                $match: {
                    category: this.name,
                    type: this.type,
                    userId: this.userId
                }
            },
            {
                $group: {
                    _id: null,
                    transactionCount: { $sum: 1 },
                    totalAmount: { $sum: '$amount' },
                    averageAmount: { $avg: '$amount' },
                    lastUsed: { $max: '$date' }
                }
            }
        ]);

        if (stats.length > 0) {
            this.usageStats = {
                transactionCount: stats[0].transactionCount,
                totalAmount: stats[0].totalAmount,
                lastUsed: stats[0].lastUsed,
                averageAmount: Math.round(stats[0].averageAmount * 100) / 100
            };
        } else {
            // Reset stats if no transactions found
            this.usageStats = {
                transactionCount: 0,
                totalAmount: 0,
                lastUsed: null,
                averageAmount: 0
            };
        }

        await this.save();
        return this;
    } catch (error) {
        console.error('Error actualizando estadísticas de categoría:', error);
        throw error;
    }
};

/**
 * Obtiene información resumida de la categoría
 */
categorySchema.methods.getSummary = function() {
    return {
        id: this._id,
        name: this.name,
        type: this.type,
        color: this.color,
        description: this.description,
        icon: this.icon,
        isDefault: this.isDefault,
        isCustom: this.isCustom,
        usageStats: this.usageStats,
        order: this.order,
        isActive: this.isActive,
        status: this.status,
        createdAt: this.createdAt,
        updatedAt: this.updatedAt
    };
};

/**
 * Verifica si la categoría puede ser eliminada
 */
categorySchema.methods.canBeDeleted = function() {
    // No se pueden eliminar categorías por defecto
    if (this.isDefault) return false;

    // Se pueden eliminar categorías personalizadas que no tengan transacciones
    return this.isCustom && this.usageStats.transactionCount === 0;
};

// ==================== MÉTODOS ESTÁTICOS ====================

/**
 * Obtiene todas las categorías de un usuario (incluyendo por defecto)
 */
categorySchema.statics.getUserCategories = async function(userId, includeInactive = false) {
    const matchCondition = { userId };
    if (!includeInactive) {
        matchCondition.isActive = true;
    }

    // Obtener categorías del usuario
    const userCategories = await this.find(matchCondition)
        .sort({ order: 1, name: 1 })
        .lean();

    // Obtener categorías por defecto que no estén duplicadas
    const defaultCategories = await this.find({
        userId: null,
        isDefault: true,
        isActive: true
    }).sort({ name: 1 }).lean();

    // Filtrar categorías por defecto que ya existan en las del usuario
    const filteredDefaults = defaultCategories.filter(defaultCat => {
        return !userCategories.some(userCat =>
            userCat.name === defaultCat.name && userCat.type === defaultCat.type
        );
    });

    // Combinar y marcar cuáles son por defecto
    const allCategories = [
        ...userCategories,
        ...filteredDefaults.map(cat => ({ ...cat, isDefault: true }))
    ];

    return allCategories.sort((a, b) => {
        // Primero por orden, luego por nombre
        if (a.order !== b.order) return a.order - b.order;
        return a.name.localeCompare(b.name);
    });
};

/**
 * Crea categorías por defecto para un usuario
 */
categorySchema.statics.createDefaultCategories = async function(userId) {
    const defaultCategories = [
        // Categorías de ingresos
        { name: 'Salario', type: 'income', color: '#27ae60', description: 'Sueldo mensual', isDefault: true },
        { name: 'Freelance', type: 'income', color: '#3498db', description: 'Trabajos independientes', isDefault: true },
        { name: 'Inversiones', type: 'income', color: '#9b59b6', description: 'Rendimientos de inversiones', isDefault: true },
        { name: 'Otros Ingresos', type: 'income', color: '#1abc9c', description: 'Ingresos varios', isDefault: true },

        // Categorías de gastos
        { name: 'Alimentación', type: 'expense', color: '#e74c3c', description: 'Comida y bebidas', isDefault: true },
        { name: 'Transporte', type: 'expense', color: '#f39c12', description: 'Gasolina, transporte público', isDefault: true },
        { name: 'Servicios', type: 'expense', color: '#e67e22', description: 'Luz, agua, internet', isDefault: true },
        { name: 'Entretenimiento', type: 'expense', color: '#8e44ad', description: 'Cine, restaurantes', isDefault: true },
        { name: 'Salud', type: 'expense', color: '#2ecc71', description: 'Medicinas, consultas', isDefault: true },
        { name: 'Educación', type: 'expense', color: '#3498db', description: 'Cursos, libros', isDefault: true },
        { name: 'Ropa', type: 'expense', color: '#e91e63', description: 'Vestimenta y calzado', isDefault: true },
        { name: 'Otros Gastos', type: 'expense', color: '#95a5a6', description: 'Gastos varios', isDefault: true }
    ];

    const categoriesToCreate = defaultCategories.map(cat => ({
        ...cat,
        userId: userId,
        order: 0,
        isActive: true
    }));

    try {
        const createdCategories = await this.insertMany(categoriesToCreate);
        console.log(`✅ Creadas ${createdCategories.length} categorías por defecto para el usuario`);
        return createdCategories;
    } catch (error) {
        console.error('❌ Error creando categorías por defecto:', error);
        throw error;
    }
};

/**
 * Busca categorías por nombre
 */
categorySchema.statics.searchCategories = async function(userId, searchTerm, limit = 10) {
    const searchQuery = {
        userId: userId,
        isActive: true,
        $text: { $search: searchTerm }
    };

    return await this.find(searchQuery)
        .sort({ score: { $meta: 'textScore' } })
        .limit(limit)
        .lean();
};

/**
 * Actualiza el orden de las categorías
 */
categorySchema.statics.updateOrder = async function(userId, categoryOrder) {
    const bulkOps = categoryOrder.map((catId, index) => ({
        updateOne: {
            filter: { _id: catId, userId: userId },
            update: { order: index }
        }
    }));

    if (bulkOps.length > 0) {
        await this.bulkWrite(bulkOps);
    }

    return { success: true, message: 'Orden actualizado correctamente' };
};

// ==================== MIDDLEWARE ====================

/**
 * Middleware pre-save para validaciones
 */
categorySchema.pre('save', async function(next) {
    try {
        // Validar que el nombre no esté vacío después del trim
        if (!this.name || !this.name.trim()) {
            return next(new Error('El nombre de la categoría no puede estar vacío'));
        }

        // Validar unicidad para categorías del mismo usuario
        if (this.userId) {
            const existingCategory = await this.constructor.findOne({
                userId: this.userId,
                name: this.name.trim(),
                type: this.type,
                _id: { $ne: this._id }
            });

            if (existingCategory) {
                return next(new Error('Ya existe una categoría con este nombre y tipo'));
            }
        }

        next();
    } catch (error) {
        next(error);
    }
});

/**
 * Middleware post-save para logging
 */
categorySchema.post('save', function(doc) {
    const action = doc.isNew ? 'creada' : 'actualizada';
    console.log(`Categoría ${action}: ${doc.name} (${doc.type})`);
});

// ==================== EXPORTAR MODELO ====================

// Verificar si el modelo ya existe para evitar errores de compilación múltiple en Next.js
const CategoryModel = mongoose.models.Category || mongoose.model<Category & mongoose.Document>('Category', categorySchema);

export default CategoryModel;
