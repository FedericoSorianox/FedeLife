/**
 * 📋 MODELO DE TAREAS - MONGODB
 *
 * Esquema de tareas para el sistema de gestión de tareas personales
 * Incluye estados de kanban, prioridades, etiquetas y seguimiento
 * Autor: Senior Backend Developer
 */

const mongoose = require('mongoose');

// ==================== ESQUEMA DE TAREAS ====================

const taskSchema = new mongoose.Schema({
    // Referencia al usuario propietario
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: false, // Permitir null para tareas demo
        index: true
    },

    // Título de la tarea
    title: {
        type: String,
        required: [true, 'El título de la tarea es requerido'],
        trim: true,
        maxlength: [200, 'El título no puede exceder 200 caracteres'],
        index: true
    },

    // Descripción detallada de la tarea
    description: {
        type: String,
        trim: true,
        maxlength: [1000, 'La descripción no puede exceder 1000 caracteres']
    },

    // Estado de la tarea (kanban columns)
    status: {
        type: String,
        required: [true, 'El estado es requerido'],
        enum: {
            values: ['todo', 'doing', 'done'],
            message: 'Estado inválido. Debe ser: todo, doing o done'
        },
        default: 'todo',
        index: true
    },

    // Prioridad de la tarea
    priority: {
        type: String,
        enum: {
            values: ['low', 'medium', 'high'],
            message: 'Prioridad inválida. Debe ser: low, medium o high'
        },
        default: 'medium'
    },

    // Fecha de vencimiento
    dueDate: {
        type: Date,
        validate: {
            validator: function(value) {
                // Permitir fechas nulas o fechas futuras
                return !value || value >= new Date();
            },
            message: 'La fecha de vencimiento debe ser futura o nula'
        }
    },

    // Etiquetas para categorización adicional
    tags: [{
        type: String,
        trim: true,
        maxlength: [30, 'Cada etiqueta no puede exceder 30 caracteres'],
        index: true
    }],

    // Orden dentro de la columna (para drag & drop)
    order: {
        type: Number,
        default: 0,
        index: true
    },

    // Notas adicionales
    notes: {
        type: String,
        trim: true,
        maxlength: [500, 'Las notas no pueden exceder 500 caracteres']
    },

    // Fecha de completación (solo para tareas done)
    completedAt: {
        type: Date,
        default: null
    },

    // Archivos adjuntos (imágenes, documentos)
    attachments: [{
        filename: {
            type: String,
            required: true
        },
        originalName: {
            type: String,
            required: true
        },
        mimeType: {
            type: String,
            required: true
        },
        size: {
            type: Number,
            required: true
        },
        url: {
            type: String,
            required: true
        },
        uploadedAt: {
            type: Date,
            default: Date.now
        }
    }],

    // Metadatos de la tarea
    metadata: {
        // Si fue creada desde un template
        fromTemplate: {
            type: Boolean,
            default: false
        },

        // ID del template usado
        templateId: {
            type: String,
            maxlength: [100, 'El ID del template no puede exceder 100 caracteres']
        },

        // Tiempo estimado en minutos
        estimatedTime: {
            type: Number,
            min: 0,
            max: 2880, // 48 horas máximo
            default: null
        },

        // Tiempo real empleado en minutos
        actualTime: {
            type: Number,
            min: 0,
            default: null
        },

        // Información de ubicación (si aplica)
        location: {
            type: String,
            maxlength: [100, 'La ubicación no puede exceder 100 caracteres']
        },

        // Recordatorios
        reminders: [{
            type: {
                type: String,
                enum: ['email', 'push', 'sms'],
                default: 'push'
            },
            scheduledAt: {
                type: Date,
                required: true
            },
            sent: {
                type: Boolean,
                default: false
            },
            sentAt: Date
        }]
    },

    // Información de progreso (para tareas complejas)
    progress: {
        current: {
            type: Number,
            min: 0,
            max: 100,
            default: 0
        },
        total: {
            type: Number,
            min: 1,
            default: 100
        },
        unit: {
            type: String,
            maxlength: [20, 'La unidad no puede exceder 20 caracteres'],
            default: 'porcentaje'
        }
    }

}, {
    timestamps: true, // Agrega createdAt y updatedAt automáticamente
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});

// ==================== ÍNDICES COMPUESTOS ====================

// Índices para optimizar consultas frecuentes
taskSchema.index({ userId: 1, status: 1, order: 1 }); // Tareas por usuario y estado ordenadas
taskSchema.index({ userId: 1, priority: 1 }); // Tareas por prioridad
taskSchema.index({ userId: 1, dueDate: 1 }); // Tareas por fecha de vencimiento
taskSchema.index({ userId: 1, createdAt: -1 }); // Tareas por fecha de creación
taskSchema.index({ userId: 1, completedAt: -1 }); // Tareas completadas por fecha

// Índice de texto para búsquedas
taskSchema.index({
    title: 'text',
    description: 'text',
    notes: 'text',
    tags: 'text'
});

// ==================== VIRTUALS ====================

/**
 * Virtual para verificar si la tarea está vencida
 */
taskSchema.virtual('isOverdue').get(function() {
    return this.dueDate && this.dueDate < new Date() && this.status !== 'done';
});

/**
 * Virtual para verificar si la tarea está próxima a vencer (dentro de 24 horas)
 */
taskSchema.virtual('isDueSoon').get(function() {
    if (!this.dueDate || this.status === 'done') return false;
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return this.dueDate <= tomorrow;
});

/**
 * Virtual para el progreso formateado
 */
taskSchema.virtual('progressPercentage').get(function() {
    if (this.progress.total === 0) return 0;
    return Math.round((this.progress.current / this.progress.total) * 100);
});

/**
 * Virtual para el tiempo restante hasta la fecha de vencimiento
 */
taskSchema.virtual('timeRemaining').get(function() {
    if (!this.dueDate) return null;
    const now = new Date();
    const diff = this.dueDate.getTime() - now.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));

    if (days > 0) {
        return `${days} día${days !== 1 ? 's' : ''}`;
    } else if (hours > 0) {
        return `${hours} hora${hours !== 1 ? 's' : ''}`;
    } else {
        return 'Vencida';
    }
});

/**
 * Virtual para el estado en español
 */
taskSchema.virtual('statusLabel').get(function() {
    const labels = {
        'todo': 'Por Hacer',
        'doing': 'Haciendo',
        'done': 'Hechas'
    };
    return labels[this.status] || this.status;
});

/**
 * Virtual para la prioridad en español
 */
taskSchema.virtual('priorityLabel').get(function() {
    const labels = {
        'low': 'Baja',
        'medium': 'Media',
        'high': 'Alta'
    };
    return labels[this.priority] || this.priority;
});

// ==================== MÉTODOS DE INSTANCIA ====================

/**
 * Obtiene información resumida de la tarea
 * @returns {Object} - Información resumida
 */
taskSchema.methods.getSummary = function() {
    return {
        id: this._id,
        title: this.title,
        description: this.description,
        status: this.status,
        statusLabel: this.statusLabel,
        priority: this.priority,
        priorityLabel: this.priorityLabel,
        dueDate: this.dueDate,
        tags: this.tags,
        order: this.order,
        isOverdue: this.isOverdue,
        isDueSoon: this.isDueSoon,
        progressPercentage: this.progressPercentage,
        timeRemaining: this.timeRemaining,
        createdAt: this.createdAt,
        updatedAt: this.updatedAt,
        hasAttachments: this.attachments.length > 0
    };
};

/**
 * Marca la tarea como completada
 * @returns {Promise<Task>} - Tarea actualizada
 */
taskSchema.methods.complete = async function() {
    this.status = 'done';
    this.completedAt = new Date();
    this.progress.current = this.progress.total;
    await this.save();
    return this;
};

/**
 * Reabre una tarea completada
 * @returns {Promise<Task>} - Tarea actualizada
 */
taskSchema.methods.reopen = async function() {
    this.status = 'todo';
    this.completedAt = null;
    await this.save();
    return this;
};

/**
 * Actualiza el progreso de la tarea
 * @param {number} current - Progreso actual
 * @param {number} total - Total (opcional)
 * @returns {Promise<Task>} - Tarea actualizada
 */
taskSchema.methods.updateProgress = async function(current, total = null) {
    this.progress.current = Math.max(0, Math.min(current, this.progress.total));
    if (total !== null) {
        this.progress.total = Math.max(1, total);
    }
    await this.save();
    return this;
};

/**
 * Verifica si la tarea es del día actual
 * @returns {boolean} - true si es del día actual
 */
taskSchema.methods.isToday = function() {
    if (!this.dueDate) return false;
    const today = new Date();
    return this.dueDate.toDateString() === today.toDateString();
};

/**
 * Verifica si la tarea está próxima a vencer (dentro de X días)
 * @param {number} days - Número de días
 * @returns {boolean} - true si está próxima a vencer
 */
taskSchema.methods.isDueWithin = function(days = 3) {
    if (!this.dueDate || this.status === 'done') return false;
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + days);
    return this.dueDate <= futureDate;
};

// ==================== MÉTODOS ESTÁTICOS ====================

/**
 * Obtiene estadísticas de tareas para un usuario
 * @param {ObjectId} userId - ID del usuario
 * @param {Object} filters - Filtros adicionales
 * @returns {Promise<Object>} - Estadísticas
 */
taskSchema.statics.getStats = async function(userId, filters = {}) {
    const matchStage = { userId, ...filters };

    const pipeline = [
        { $match: matchStage },
        {
            $group: {
                _id: null,
                totalTasks: { $sum: 1 },
                completedTasks: {
                    $sum: { $cond: [{ $eq: ['$status', 'done'] }, 1, 0] }
                },
                todoTasks: {
                    $sum: { $cond: [{ $eq: ['$status', 'todo'] }, 1, 0] }
                },
                doingTasks: {
                    $sum: { $cond: [{ $eq: ['$status', 'doing'] }, 1, 0] }
                },
                highPriorityTasks: {
                    $sum: { $cond: [{ $eq: ['$priority', 'high'] }, 1, 0] }
                },
                overdueTasks: {
                    $sum: {
                        $cond: [
                            {
                                $and: [
                                    { $ne: ['$status', 'done'] },
                                    { $lt: ['$dueDate', new Date()] },
                                    { $ne: ['$dueDate', null] }
                                ]
                            },
                            1,
                            0
                        ]
                    }
                },
                completedToday: {
                    $sum: {
                        $cond: [
                            {
                                $and: [
                                    { $eq: ['$status', 'done'] },
                                    {
                                        $gte: ['$completedAt', {
                                            $dateFromString: {
                                                dateString: new Date().toISOString().split('T')[0] + 'T00:00:00.000Z'
                                            }
                                        }]
                                    }
                                ]
                            },
                            1,
                            0
                        ]
                    }
                }
            }
        }
    ];

    const result = await this.aggregate(pipeline);
    const stats = result[0] || {
        totalTasks: 0,
        completedTasks: 0,
        todoTasks: 0,
        doingTasks: 0,
        highPriorityTasks: 0,
        overdueTasks: 0,
        completedToday: 0
    };

    // Calcular porcentajes
    stats.completionRate = stats.totalTasks > 0
        ? Math.round((stats.completedTasks / stats.totalTasks) * 100)
        : 0;

    return stats;
};

/**
 * Obtiene tareas agrupadas por estado
 * @param {ObjectId} userId - ID del usuario
 * @param {Object} filters - Filtros adicionales
 * @returns {Promise<Object>} - Tareas agrupadas por estado
 */
taskSchema.statics.getTasksByStatus = async function(userId, filters = {}) {
    const matchStage = { userId, ...filters };

    const pipeline = [
        { $match: matchStage },
        {
            $group: {
                _id: '$status',
                tasks: {
                    $push: {
                        id: '$_id',
                        title: '$title',
                        description: '$description',
                        priority: '$priority',
                        dueDate: '$dueDate',
                        tags: '$tags',
                        order: '$order',
                        createdAt: '$createdAt',
                        updatedAt: '$updatedAt'
                    }
                },
                count: { $sum: 1 }
            }
        },
        {
            $project: {
                status: '$_id',
                tasks: {
                    $sortArray: { input: '$tasks', sortBy: { order: 1, createdAt: -1 } }
                },
                count: 1
            }
        }
    ];

    const result = await this.aggregate(pipeline);
    return result.reduce((acc, group) => {
        acc[group.status] = group.tasks;
        return acc;
    }, {});
};

/**
 * Busca tareas con texto
 * @param {ObjectId} userId - ID del usuario
 * @param {string} searchText - Texto a buscar
 * @param {Object} options - Opciones de búsqueda
 * @returns {Promise<Array>} - Tareas encontradas
 */
taskSchema.statics.searchTasks = async function(userId, searchText, options = {}) {
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

/**
 * Obtiene tareas próximas a vencer
 * @param {ObjectId} userId - ID del usuario
 * @param {number} days - Días hacia adelante
 * @returns {Promise<Array>} - Tareas próximas a vencer
 */
taskSchema.statics.getUpcomingTasks = async function(userId, days = 7) {
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + days);

    return await this.find({
        userId,
        status: { $ne: 'done' },
        dueDate: {
            $gte: new Date(),
            $lte: futureDate
        }
    })
    .sort({ dueDate: 1 })
    .limit(20)
    .lean();
};

/**
 * Obtiene tareas vencidas
 * @param {ObjectId} userId - ID del usuario
 * @returns {Promise<Array>} - Tareas vencidas
 */
taskSchema.statics.getOverdueTasks = async function(userId) {
    return await this.find({
        userId,
        status: { $ne: 'done' },
        dueDate: { $lt: new Date() }
    })
    .sort({ dueDate: 1 })
    .lean();
};

// ==================== MIDDLEWARE ====================

/**
 * Middleware pre-save para validaciones adicionales
 */
taskSchema.pre('save', function(next) {
    // Asegurar que el título no esté vacío después del trim
    if (!this.title || !this.title.trim()) {
        return next(new Error('El título de la tarea no puede estar vacío'));
    }

    // Si la tarea se marca como completada, establecer completedAt
    if (this.status === 'done' && !this.completedAt) {
        this.completedAt = new Date();
    }

    // Si la tarea se reabre, limpiar completedAt
    if (this.status !== 'done' && this.completedAt) {
        this.completedAt = null;
    }

    // Para tareas demo (userId null), saltar validaciones adicionales
    if (this.userId === null) {
        return next();
    }

    next();
});

/**
 * Middleware post-save para logging
 */
taskSchema.post('save', async function(doc) {
    console.log(`📋 Tarea ${doc.status} guardada: ${doc.title} (${doc.priority} prioridad)`);
});

// ==================== EXPORTAR MODELO ====================

const Task = mongoose.model('Task', taskSchema);

module.exports = Task;
