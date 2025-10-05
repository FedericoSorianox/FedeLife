/**
 * 💰 MODELO DE TRANSACCIONES - MONGODB
 * 
 * Esquema de transacciones financieras para el sistema de finanzas personales
 * Incluye validaciones, índices optimizados y métodos de consulta
 * Autor: Senior Backend Developer
 */

const mongoose = require('mongoose');

// ==================== ESQUEMA DE TRANSACCIONES ====================

const transactionSchema = new mongoose.Schema({
    // Referencia al usuario propietario
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: false, // Permitir null para transacciones demo
        index: true
    },
    
    // Tipo de transacción
    type: {
        type: String,
        required: [true, 'El tipo de transacción es requerido'],
        enum: {
            values: ['income', 'expense'],
            message: 'El tipo debe ser "income" o "expense"'
        },
        index: true
    },
    
    // Monto de la transacción
    amount: {
        type: Number,
        required: [true, 'El monto es requerido'],
        min: [0.01, 'El monto debe ser mayor a 0'],
        validate: {
            validator: function(value) {
                return value > 0;
            },
            message: 'El monto debe ser mayor a 0'
        }
    },
    
    // Descripción de la transacción
    description: {
        type: String,
        required: [true, 'La descripción es requerida'],
        trim: true,
        maxlength: [200, 'La descripción no puede exceder 200 caracteres']
    },
    
    // Categoría de la transacción
    category: {
        type: String,
        required: [true, 'La categoría es requerida'],
        trim: true,
        maxlength: [50, 'La categoría no puede exceder 50 caracteres']
    },
    
    // Fecha de la transacción
    date: {
        type: Date,
        required: [true, 'La fecha es requerida'],
        default: Date.now,
        index: true
    },
    
    
    // Moneda de la transacción
    currency: {
        type: String,
        required: [true, 'La moneda es requerida'],
        enum: {
            values: ['UYU', 'USD'],
            message: 'Moneda inválida'
        },
        default: 'UYU'
    },
    
    // Monto convertido a moneda base del usuario (para reportes)
    convertedAmount: {
        type: Number,
        default: null
    },
    
    // Moneda base del usuario al momento de la transacción
    userBaseCurrency: {
        type: String,
        enum: ['UYU', 'USD'],
        default: 'UYU'
    },
    
    // Tasa de cambio utilizada para la conversión
    exchangeRate: {
        type: Number,
        default: null
    },
    
    // Fecha de la tasa de cambio
    exchangeRateDate: {
        type: Date,
        default: null
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
    
    // Estado de la transacción
    status: {
        type: String,
        enum: {
            values: ['pending', 'completed', 'cancelled'],
            message: 'Estado inválido'
        },
        default: 'completed'
    },
    
    // Información de archivos adjuntos (recibos, etc.)
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
    
    // Metadatos de la transacción
    metadata: {
        // Si fue importada desde PDF
        importedFromPdf: {
            type: Boolean,
            default: false
        },
        
        // Confianza de la IA si fue procesada por IA
        aiConfidence: {
            type: Number,
            min: 0,
            max: 1,
            default: null
        },
        
        // Texto original si fue extraído de PDF
        originalText: {
            type: String,
            maxlength: [1000, 'El texto original no puede exceder 1000 caracteres']
        },
        
        // Información del dispositivo/ubicación
        location: {
            type: String,
            maxlength: [100, 'La ubicación no puede exceder 100 caracteres']
        },
        
        // ID de transacción externa (si viene de otro sistema)
        externalId: {
            type: String,
            maxlength: [100, 'El ID externo no puede exceder 100 caracteres']
        }
    },
    
    // Información de recategorización automática
    recategorization: {
        suggestedCategory: {
            type: String,
            maxlength: [50, 'La categoría sugerida no puede exceder 50 caracteres']
        },
        confidence: {
            type: Number,
            min: 0,
            max: 1
        },
        lastUpdated: {
            type: Date,
            default: Date.now
        }
    }
    
}, {
    timestamps: true, // Agrega createdAt y updatedAt automáticamente
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});

// ==================== ÍNDICES COMPUESTOS ====================

// Índices para optimizar consultas frecuentes
transactionSchema.index({ userId: 1, date: -1 }); // Transacciones por usuario ordenadas por fecha
transactionSchema.index({ userId: 1, type: 1, date: -1 }); // Transacciones por tipo
transactionSchema.index({ userId: 1, category: 1, date: -1 }); // Transacciones por categoría
transactionSchema.index({ userId: 1, month: 1 }); // Transacciones por mes
transactionSchema.index({ userId: 1, status: 1 }); // Transacciones por estado

// Índice de texto para búsquedas
transactionSchema.index({
    description: 'text',
    category: 'text',
    notes: 'text',
    tags: 'text'
});

// ==================== VIRTUALS ====================

/**
 * Virtual para el mes de la transacción (YYYY-MM)
 */
transactionSchema.virtual('month').get(function() {
    return this.date.toISOString().substr(0, 7);
});

/**
 * Virtual para el año de la transacción
 */
transactionSchema.virtual('year').get(function() {
    return this.date.getFullYear();
});

/**
 * Virtual para el día de la semana
 */
transactionSchema.virtual('dayOfWeek').get(function() {
    const days = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
    return days[this.date.getDay()];
});

/**
 * Virtual para el monto formateado
 */
transactionSchema.virtual('formattedAmount').get(function() {
    return new Intl.NumberFormat('es-UY', {
        style: 'currency',
        currency: this.currency,
        minimumFractionDigits: 0,
        maximumFractionDigits: 2
    }).format(this.amount);
});

/**
 * Virtual para el tipo de transacción en español
 */
transactionSchema.virtual('typeLabel').get(function() {
    return this.type === 'income' ? 'Ingreso' : 'Gasto';
});

// ==================== MÉTODOS DE INSTANCIA ====================

/**
 * Obtiene información resumida de la transacción
 * @returns {Object} - Información resumida
 */
transactionSchema.methods.getSummary = function() {
    return {
        id: this._id,
        type: this.type,
        typeLabel: this.typeLabel,
        amount: this.amount,
        formattedAmount: this.formattedAmount,
        description: this.description,
        category: this.category,
        date: this.date,
        currency: this.currency,
        status: this.status,
        month: this.month,
        year: this.year,
        dayOfWeek: this.dayOfWeek,
        tags: this.tags,
        hasAttachments: this.attachments.length > 0,
        createdAt: this.createdAt
    };
};

/**
 * Verifica si la transacción es reciente (últimos 7 días)
 * @returns {boolean} - true si es reciente
 */
transactionSchema.methods.isRecent = function() {
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    return this.date >= sevenDaysAgo;
};

/**
 * Verifica si la transacción es del mes actual
 * @returns {boolean} - true si es del mes actual
 */
transactionSchema.methods.isCurrentMonth = function() {
    const now = new Date();
    return this.date.getMonth() === now.getMonth() && 
           this.date.getFullYear() === now.getFullYear();
};

// ==================== MÉTODOS ESTÁTICOS ====================

/**
 * Obtiene estadísticas de transacciones para un usuario
 * @param {ObjectId} userId - ID del usuario
 * @param {Object} filters - Filtros adicionales
 * @returns {Promise<Object>} - Estadísticas
 */
transactionSchema.statics.getStats = async function(userId, filters = {}) {
    const matchStage = { userId, ...filters };

    const pipeline = [
        { $match: matchStage },
        {
            $group: {
                _id: '$currency', // Agrupar por moneda para cuentas separadas
                totalIncome: {
                    $sum: {
                        $cond: [{ $eq: ['$type', 'income'] }, '$amount', 0]
                    }
                },
                totalExpenses: {
                    $sum: {
                        $cond: [{ $eq: ['$type', 'expense'] }, '$amount', 0]
                    }
                },
                totalTransactions: { $sum: 1 },
                incomeCount: {
                    $sum: { $cond: [{ $eq: ['$type', 'income'] }, 1, 0] }
                },
                expenseCount: {
                    $sum: { $cond: [{ $eq: ['$type', 'expense'] }, 1, 0] }
                },
                averageAmount: { $avg: '$amount' },
                minAmount: { $min: '$amount' },
                maxAmount: { $max: '$amount' }
            }
        }
    ];

    const results = await this.aggregate(pipeline);

    // Inicializar estadísticas por defecto
    const stats = {
        totalIncome: 0,
        totalExpenses: 0,
        totalTransactions: 0,
        incomeCount: 0,
        expenseCount: 0,
        averageAmount: 0,
        minAmount: 0,
        maxAmount: 0,
        balance: 0,
        // Estadísticas separadas por moneda
        UYU: {
            totalIncome: 0,
            totalExpenses: 0,
            totalTransactions: 0,
            incomeCount: 0,
            expenseCount: 0,
            balance: 0
        },
        USD: {
            totalIncome: 0,
            totalExpenses: 0,
            totalTransactions: 0,
            incomeCount: 0,
            expenseCount: 0,
            balance: 0
        }
    };

    // Procesar resultados agrupados por moneda
    results.forEach(result => {
        const currency = result._id || 'UYU'; // Default a UYU si no hay moneda
        const currencyKey = currency === 'USD' ? 'USD' : 'UYU';

        // Actualizar estadísticas por moneda
        stats[currencyKey].totalIncome = result.totalIncome || 0;
        stats[currencyKey].totalExpenses = result.totalExpenses || 0;
        stats[currencyKey].totalTransactions = result.totalTransactions || 0;
        stats[currencyKey].incomeCount = result.incomeCount || 0;
        stats[currencyKey].expenseCount = result.expenseCount || 0;
        stats[currencyKey].balance = (result.totalIncome || 0) - (result.totalExpenses || 0);

        // Actualizar estadísticas totales (para compatibilidad)
        stats.totalIncome += result.totalIncome || 0;
        stats.totalExpenses += result.totalExpenses || 0;
        stats.totalTransactions += result.totalTransactions || 0;
        stats.incomeCount += result.incomeCount || 0;
        stats.expenseCount += result.expenseCount || 0;
    });

    // Calcular balance total y estadísticas generales
    stats.balance = stats.totalIncome - stats.totalExpenses;
    stats.averageAmount = Math.round((stats.totalTransactions > 0 ? stats.totalIncome / stats.totalTransactions : 0) * 100) / 100;

    return stats;
};

/**
 * Obtiene transacciones agrupadas por categoría
 * @param {ObjectId} userId - ID del usuario
 * @param {Object} filters - Filtros adicionales
 * @returns {Promise<Array>} - Transacciones agrupadas por categoría
 */
transactionSchema.statics.getCategoryStats = async function(userId, filters = {}) {
    const matchStage = { userId, ...filters };
    
    const pipeline = [
        { $match: matchStage },
        {
            $group: {
                _id: {
                    category: '$category',
                    type: '$type'
                },
                totalAmount: { $sum: '$amount' },
                count: { $sum: 1 },
                averageAmount: { $avg: '$amount' }
            }
        },
        {
            $group: {
                _id: '$_id.category',
                types: {
                    $push: {
                        type: '$_id.type',
                        totalAmount: '$totalAmount',
                        count: '$count',
                        averageAmount: '$averageAmount'
                    }
                },
                totalAmount: { $sum: '$totalAmount' },
                totalCount: { $sum: '$count' }
            }
        },
        { $sort: { totalAmount: -1 } }
    ];
    
    return await this.aggregate(pipeline);
};

/**
 * Obtiene transacciones por mes
 * @param {ObjectId} userId - ID del usuario
 * @param {Date} startDate - Fecha de inicio
 * @param {Date} endDate - Fecha de fin
 * @returns {Promise<Array>} - Transacciones por mes
 */
transactionSchema.statics.getMonthlyStats = async function(userId, startDate, endDate) {
    const pipeline = [
        {
            $match: {
                userId,
                date: { $gte: startDate, $lte: endDate }
            }
        },
        {
            $group: {
                _id: {
                    year: { $year: '$date' },
                    month: { $month: '$date' }
                },
                income: {
                    $sum: {
                        $cond: [{ $eq: ['$type', 'income'] }, '$amount', 0]
                    }
                },
                expenses: {
                    $sum: {
                        $cond: [{ $eq: ['$type', 'expense'] }, '$amount', 0]
                    }
                },
                count: { $sum: 1 }
            }
        },
        {
            $addFields: {
                balance: { $subtract: ['$income', '$expenses'] },
                monthKey: {
                    $concat: [
                        { $toString: '$_id.year' },
                        '-',
                        {
                            $cond: {
                                if: { $lt: ['$_id.month', 10] },
                                then: { $concat: ['0', { $toString: '$_id.month' }] },
                                else: { $toString: '$_id.month' }
                            }
                        }
                    ]
                }
            }
        },
        { $sort: { '_id.year': 1, '_id.month': 1 } }
    ];
    
    return await this.aggregate(pipeline);
};

/**
 * Busca transacciones con texto
 * @param {ObjectId} userId - ID del usuario
 * @param {string} searchText - Texto a buscar
 * @param {Object} options - Opciones de búsqueda
 * @returns {Promise<Array>} - Transacciones encontradas
 */
transactionSchema.statics.searchTransactions = async function(userId, searchText, options = {}) {
    const { limit = 20, skip = 0, sort = { date: -1 } } = options;
    
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
transactionSchema.pre('save', function(next) {
    // Asegurar que la descripción no esté vacía después del trim
    if (!this.description || !this.description.trim()) {
        return next(new Error('La descripción no puede estar vacía'));
    }

    // Asegurar que la categoría no esté vacía después del trim
    if (!this.category || !this.category.trim()) {
        return next(new Error('La categoría no puede estar vacía'));
    }

    // Validar que la fecha no sea futura (opcional, puedes comentar si quieres permitir fechas futuras)
    if (this.date && this.date > new Date()) {
        return next(new Error('La fecha no puede ser futura'));
    }

    // Para transacciones demo (userId null), saltar validaciones adicionales
    if (this.userId === null) {
        return next();
    }

    next();
});

/**
 * Middleware post-save para actualizar estadísticas
 */
transactionSchema.post('save', async function(doc) {
    // Aquí podrías agregar lógica para actualizar estadísticas en tiempo real
    // Por ejemplo, actualizar resúmenes en caché o enviar notificaciones
    console.log(`Transacción ${doc.type} guardada: ${doc.description} - $${doc.amount}`);
});

// ==================== MÉTODOS DE CONVERSIÓN DE MONEDAS ====================

/**
 * Método para convertir transacción a moneda base del usuario
 * @param {string} userBaseCurrency - Moneda base del usuario
 * @returns {Promise<Transaction>} - Transacción actualizada
 */
transactionSchema.methods.convertToUserCurrency = async function(userBaseCurrency) {
    try {
        const { exchangeRateService } = require('../services/exchangeRate');
        
        if (this.currency === userBaseCurrency) {
            this.convertedAmount = this.amount;
            this.exchangeRate = 1;
        } else {
            const rate = await exchangeRateService.getExchangeRate(this.currency, userBaseCurrency, this.date);
            this.convertedAmount = this.amount * rate;
            this.exchangeRate = rate;
        }
        
        this.userBaseCurrency = userBaseCurrency;
        this.exchangeRateDate = new Date();
        
        await this.save();
        return this;
    } catch (error) {
        throw new Error(`Error convirtiendo transacción: ${error.message}`);
    }
};

/**
 * Método para obtener monto en moneda específica
 * @param {string} targetCurrency - Moneda objetivo
 * @returns {Promise<number>} - Monto convertido
 */
transactionSchema.methods.getAmountInCurrency = async function(targetCurrency) {
    try {
        const { exchangeRateService } = require('../services/exchangeRate');
        
        if (this.currency === targetCurrency) {
            return this.amount;
        }
        
        const rate = await exchangeRateService.getExchangeRate(this.currency, targetCurrency, this.date);
        return this.amount * rate;
    } catch (error) {
        console.error('Error obteniendo monto en moneda específica:', error);
        return this.amount; // Retornar monto original si hay error
    }
};

/**
 * Método estático para obtener estadísticas con conversión de monedas
 * @param {ObjectId} userId - ID del usuario
 * @param {Date} startDate - Fecha de inicio
 * @param {Date} endDate - Fecha de fin
 * @param {string} targetCurrency - Moneda objetivo (opcional)
 * @returns {Promise<Array>} - Estadísticas convertidas
 */
transactionSchema.statics.getStatsWithConversion = async function(userId, startDate, endDate, targetCurrency = null) {
    try {
        const pipeline = [
            { $match: { userId: new mongoose.Types.ObjectId(userId) } },
            { $match: { date: { $gte: startDate, $lte: endDate } } }
        ];

        // Si se especifica una moneda objetivo, usar el monto convertido
        if (targetCurrency) {
            pipeline.push({
                $addFields: {
                    displayAmount: {
                        $cond: {
                            if: { $eq: ['$userBaseCurrency', targetCurrency] },
                            then: '$convertedAmount',
                            else: '$amount'
                        }
                    }
                }
            });
        } else {
            pipeline.push({
                $addFields: {
                    displayAmount: '$convertedAmount'
                }
            });
        }

        pipeline.push({
            $group: {
                _id: '$type',
                total: { $sum: '$displayAmount' },
                count: { $sum: 1 }
            }
        });

        const stats = await this.aggregate(pipeline);
        return stats;
    } catch (error) {
        throw new Error(`Error obteniendo estadísticas: ${error.message}`);
    }
};

// ==================== EXPORTAR MODELO ====================

const Transaction = mongoose.models.Transaction || mongoose.model('Transaction', transactionSchema);

module.exports = Transaction;
