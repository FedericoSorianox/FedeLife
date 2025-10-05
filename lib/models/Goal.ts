/**
 * 🎯 MODELO DE METAS - MONGODB
 *
 * Esquema de metas de ahorro para el sistema de finanzas personales
 * Incluye validaciones, índices optimizados y métodos de consulta
 * Autor: Senior Backend Developer
 */

import mongoose from 'mongoose';
import { Goal } from '@/types';

// ==================== ESQUEMA DE METAS ====================

const goalSchema = new mongoose.Schema({
    // Referencia al usuario propietario
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: false, // Permitir null para metas demo
        index: true
    },

    // Nombre de la meta
    name: {
        type: String,
        required: [true, 'El nombre de la meta es requerido'],
        trim: true,
        maxlength: [100, 'El nombre no puede exceder 100 caracteres']
    },

    // Descripción de la meta
    description: {
        type: String,
        trim: true,
        maxlength: [500, 'La descripción no puede exceder 500 caracteres']
    },

    // Monto objetivo (opcional)
    targetAmount: {
        type: Number,
        min: [0.01, 'El monto objetivo debe ser mayor a 0'],
        validate: {
            validator: function(value) {
                return !value || value > 0;
            },
            message: 'El monto objetivo debe ser mayor a 0'
        }
    },

    // Monto actual ahorrado (opcional)
    currentAmount: {
        type: Number,
        default: 0,
        min: [0, 'El monto actual no puede ser negativo'],
        validate: {
            validator: function(value) {
                return value >= 0;
            },
            message: 'El monto actual no puede ser negativo'
        }
    },

    // Monto esperado (opcional) - para metas con proyección
    expectedAmount: {
        type: Number,
        min: [0, 'El monto esperado no puede ser negativo'],
        validate: {
            validator: function(value) {
                return !value || value >= 0;
            },
            message: 'El monto esperado no puede ser negativo'
        }
    },

    // Fecha actual de la meta (opcional)
    currentDate: {
        type: Date,
        default: Date.now,
        validate: {
            validator: function(value) {
                return !value || value <= new Date();
            },
            message: 'La fecha actual no puede ser futura'
        }
    },

    // Fecha objetivo de la meta (opcional)
    targetDate: {
        type: Date,
        validate: {
            validator: function(value) {
                return !value || value >= new Date();
            },
            message: 'La fecha objetivo debe ser futura'
        }
    },

    // Moneda de la meta
    currency: {
        type: String,
        enum: {
            values: ['UYU', 'USD'],
            message: 'Moneda inválida'
        },
        default: 'UYU'
    },

    // Categoría de la meta
    category: {
        type: String,
        trim: true,
        maxlength: [50, 'La categoría no puede exceder 50 caracteres']
    },

    // Prioridad de la meta
    priority: {
        type: String,
        enum: {
            values: ['low', 'medium', 'high', 'urgent'],
            message: 'Prioridad inválida'
        },
        default: 'medium'
    },

    // Estado de la meta
    status: {
        type: String,
        enum: {
            values: ['active', 'completed', 'cancelled', 'paused'],
            message: 'Estado inválido'
        },
        default: 'active',
        index: true
    },

    // Porcentaje de progreso
    progress: {
        type: Number,
        min: 0,
        max: 100,
        default: 0
    },

    // Tags para categorización adicional
    tags: [{
        type: String,
        trim: true,
        maxlength: [30, 'Cada tag no puede exceder 30 caracteres']
    }],

    // Notas adicionales
    notes: {
        type: String,
        trim: true,
        maxlength: [500, 'Las notas no pueden exceder 500 caracteres']
    },

    // Metadatos de la meta
    metadata: {
        // Si fue creada por IA
        createdByAI: {
            type: Boolean,
            default: false
        },

        // Confianza de la IA si fue sugerida por IA
        aiConfidence: {
            type: Number,
            min: 0,
            max: 1,
            default: null
        },

        // Fuente de la meta (manual, AI, importada)
        source: {
            type: String,
            enum: ['manual', 'ai', 'imported'],
            default: 'manual'
        },

        // Información de recordatorios
        reminders: {
            enabled: {
                type: Boolean,
                default: false
            },
            frequency: {
                type: String,
                enum: ['daily', 'weekly', 'monthly'],
                default: 'weekly'
            },
            lastReminder: {
                type: Date,
                default: null
            }
        }
    }

}, {
    timestamps: true, // Agrega createdAt y updatedAt automáticamente
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});

// ==================== ÍNDICES COMPUESTOS ====================

// Índices para optimizar consultas frecuentes
goalSchema.index({ userId: 1, status: 1 }); // Metas por usuario y estado
goalSchema.index({ userId: 1, createdAt: -1 }); // Metas por usuario ordenadas por creación
goalSchema.index({ userId: 1, priority: 1 }); // Metas por prioridad
goalSchema.index({ userId: 1, targetDate: 1 }); // Metas por fecha objetivo
goalSchema.index({ userId: 1, progress: 1 }); // Metas por progreso

// Índice de texto para búsquedas
goalSchema.index({
    name: 'text',
    description: 'text',
    category: 'text',
    tags: 'text',
    notes: 'text'
});

// ==================== VIRTUALS ====================

/**
 * Virtual para verificar si la meta está completada
 */
goalSchema.virtual('isCompleted').get(function() {
    return this.status === 'completed' ||
           (this.targetAmount && this.currentAmount >= this.targetAmount);
});

/**
 * Virtual para verificar si la meta está vencida
 */
goalSchema.virtual('isOverdue').get(function() {
    return this.targetDate && this.targetDate < new Date() && this.status === 'active';
});

/**
 * Virtual para calcular días restantes hasta la fecha objetivo
 */
goalSchema.virtual('daysRemaining').get(function() {
    if (!this.targetDate) return null;
    const diffTime = this.targetDate - new Date();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
});

/**
 * Virtual para calcular el porcentaje de progreso basado en montos
 */
goalSchema.virtual('amountProgress').get(function() {
    if (!this.targetAmount || this.currentAmount === 0) return 0;
    return Math.min((this.currentAmount / this.targetAmount) * 100, 100);
});

/**
 * Virtual para el monto faltante
 */
goalSchema.virtual('remainingAmount').get(function() {
    if (!this.targetAmount) return 0;
    return Math.max(this.targetAmount - this.currentAmount, 0);
});

/**
 * Virtual para el monto formateado
 */
goalSchema.virtual('formattedTargetAmount').get(function() {
    if (!this.targetAmount) return null;
    return new Intl.NumberFormat('es-UY', {
        style: 'currency',
        currency: this.currency,
        minimumFractionDigits: 0,
        maximumFractionDigits: 2
    }).format(this.targetAmount);
});

/**
 * Virtual para el monto actual formateado
 */
goalSchema.virtual('formattedCurrentAmount').get(function() {
    return new Intl.NumberFormat('es-UY', {
        style: 'currency',
        currency: this.currency,
        minimumFractionDigits: 0,
        maximumFractionDigits: 2
    }).format(this.currentAmount);
});

/**
 * Virtual para la prioridad en español
 */
goalSchema.virtual('priorityLabel').get(function() {
    const labels = {
        'low': 'Baja',
        'medium': 'Media',
        'high': 'Alta',
        'urgent': 'Urgente'
    };
    return labels[this.priority] || 'Media';
});

/**
 * Virtual para el estado en español
 */
goalSchema.virtual('statusLabel').get(function() {
    const labels = {
        'active': 'Activa',
        'completed': 'Completada',
        'cancelled': 'Cancelada',
        'paused': 'Pausada'
    };
    return labels[this.status] || 'Activa';
});

// ==================== MÉTODOS DE INSTANCIA ====================

/**
 * Obtiene información resumida de la meta
 * @returns {Object} - Información resumida
 */
goalSchema.methods.getSummary = function() {
    return {
        id: this._id,
        name: this.name,
        description: this.description,
        targetAmount: this.targetAmount,
        formattedTargetAmount: this.formattedTargetAmount,
        currentAmount: this.currentAmount,
        formattedCurrentAmount: this.formattedCurrentAmount,
        expectedAmount: this.expectedAmount,
        currentDate: this.currentDate,
        targetDate: this.targetDate,
        currency: this.currency,
        category: this.category,
        priority: this.priority,
        priorityLabel: this.priorityLabel,
        status: this.status,
        statusLabel: this.statusLabel,
        progress: this.progress,
        isCompleted: this.isCompleted,
        isOverdue: this.isOverdue,
        daysRemaining: this.daysRemaining,
        remainingAmount: this.remainingAmount,
        tags: this.tags,
        createdAt: this.createdAt,
        updatedAt: this.updatedAt
    };
};

/**
 * Actualiza el progreso de la meta basado en los montos
 */
goalSchema.methods.updateProgress = function() {
    if (this.targetAmount && this.targetAmount > 0) {
        this.progress = Math.min((this.currentAmount / this.targetAmount) * 100, 100);
    } else {
        this.progress = 0;
    }

    // Si el progreso llega al 100%, marcar como completada
    if (this.progress >= 100 && this.status === 'active') {
        this.status = 'completed';
    }

    return this.progress;
};

/**
 * Agrega un monto a la meta actual
 * @param {number} amount - Monto a agregar
 */
goalSchema.methods.addAmount = function(amount) {
    if (amount <= 0) {
        throw new Error('El monto debe ser mayor a 0');
    }

    this.currentAmount += amount;
    this.updateProgress();

    return this.currentAmount;
};

/**
 * Verifica si la meta puede ser completada
 * @returns {boolean} - true si puede completarse
 */
goalSchema.methods.canComplete = function() {
    return this.targetAmount && this.currentAmount >= this.targetAmount;
};

/**
 * Completa la meta
 */
goalSchema.methods.complete = function() {
    if (!this.canComplete()) {
        throw new Error('La meta no puede ser completada aún');
    }

    this.status = 'completed';
    this.progress = 100;

    return true;
};

// ==================== MÉTODOS ESTÁTICOS ====================

/**
 * Obtiene estadísticas de metas para un usuario
 * @param {ObjectId} userId - ID del usuario
 * @param {Object} filters - Filtros adicionales
 * @returns {Promise<Object>} - Estadísticas
 */
goalSchema.statics.getStats = async function(userId, filters = {}) {
    const matchStage = { userId, ...filters };

    const pipeline = [
        { $match: matchStage },
        {
            $group: {
                _id: null,
                totalGoals: { $sum: 1 },
                activeGoals: {
                    $sum: { $cond: [{ $eq: ['$status', 'active'] }, 1, 0] }
                },
                completedGoals: {
                    $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] }
                },
                totalTargetAmount: { $sum: '$targetAmount' },
                totalCurrentAmount: { $sum: '$currentAmount' },
                averageProgress: { $avg: '$progress' },
                highPriorityGoals: {
                    $sum: { $cond: [{ $eq: ['$priority', 'high'] }, 1, 0] }
                },
                urgentGoals: {
                    $sum: { $cond: [{ $eq: ['$priority', 'urgent'] }, 1, 0] }
                }
            }
        }
    ];

    const result = await this.aggregate(pipeline);
    const stats = result[0] || {
        totalGoals: 0,
        activeGoals: 0,
        completedGoals: 0,
        totalTargetAmount: 0,
        totalCurrentAmount: 0,
        averageProgress: 0,
        highPriorityGoals: 0,
        urgentGoals: 0
    };

    // Calcular porcentaje de metas completadas
    stats.completionRate = stats.totalGoals > 0
        ? (stats.completedGoals / stats.totalGoals) * 100
        : 0;

    // Calcular monto total faltante
    stats.remainingAmount = stats.totalTargetAmount - stats.totalCurrentAmount;

    return stats;
};

/**
 * Obtiene metas agrupadas por estado
 * @param {ObjectId} userId - ID del usuario
 * @returns {Promise<Array>} - Metas agrupadas por estado
 */
goalSchema.statics.getGoalsByStatus = async function(userId) {
    const pipeline = [
        { $match: { userId } },
        {
            $group: {
                _id: '$status',
                count: { $sum: 1 },
                totalTargetAmount: { $sum: '$targetAmount' },
                totalCurrentAmount: { $sum: '$currentAmount' },
                goals: {
                    $push: {
                        _id: '$_id',
                        name: '$name',
                        progress: '$progress',
                        targetAmount: '$targetAmount',
                        currentAmount: '$currentAmount',
                        priority: '$priority'
                    }
                }
            }
        }
    ];

    return await this.aggregate(pipeline);
};

/**
 * Obtiene metas próximas a vencer
 * @param {ObjectId} userId - ID del usuario
 * @param {number} daysAhead - Días hacia adelante para buscar
 * @returns {Promise<Array>} - Metas próximas a vencer
 */
goalSchema.statics.getUpcomingDeadlines = async function(userId, daysAhead = 30) {
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + daysAhead);

    return await this.find({
        userId,
        targetDate: {
            $gte: new Date(),
            $lte: futureDate
        },
        status: 'active'
    })
    .sort({ targetDate: 1 })
    .limit(10);
};

/**
 * Busca metas con texto
 * @param {ObjectId} userId - ID del usuario
 * @param {string} searchText - Texto a buscar
 * @param {Object} options - Opciones de búsqueda
 * @returns {Promise<Array>} - Metas encontradas
 */
goalSchema.statics.searchGoals = async function(userId, searchText, options = {}) {
    const { limit = 20, skip = 0, sort = { createdAt: -1 } } = options;

    const searchQuery = {
        userId,
        $text: { $search: searchText }
    };

    return await this.find(searchQuery)
        .sort(sort)
        .skip(skip)
        .limit(limit)
        .lean();
};

// ==================== MIDDLEWARE ====================

/**
 * Middleware pre-save para validaciones adicionales
 */
goalSchema.pre('save', function(next) {
    // Asegurar que el nombre no esté vacío después del trim
    if (!this.name || !this.name.trim()) {
        return next(new Error('El nombre de la meta no puede estar vacío'));
    }

    // Validar que el monto actual no sea mayor al objetivo
    if (this.targetAmount && this.currentAmount > this.targetAmount) {
        return next(new Error('El monto actual no puede ser mayor al monto objetivo'));
    }

    // Actualizar progreso antes de guardar
    this.updateProgress();

    // Para metas demo (userId null), saltar validaciones adicionales
    if (this.userId === null) {
        return next();
    }

    next();
});

/**
 * Middleware post-save para logging
 */
goalSchema.post('save', function(doc) {
    console.log(`Meta guardada: ${doc.name} - Progreso: ${doc.progress}%`);
});

// ==================== EXPORTAR MODELO ====================

// Verificar si el modelo ya existe para evitar errores de compilación múltiple en Next.js
const GoalModel = mongoose.models.Goal || mongoose.model<Goal & mongoose.Document>('Goal', goalSchema);

export default GoalModel;
