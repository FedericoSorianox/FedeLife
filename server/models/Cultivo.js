/**
 * 🌱 MODELO DE CULTIVOS - MONGODB
 *
 * Esquema para cultivos de cannabis medicinal en el sistema Bruce AI
 * Gestiona información detallada de cultivos indoor con LED y sistema cerrado
 * Autor: Senior Backend Developer
 */

const mongoose = require('mongoose');

// ==================== ESQUEMA DE CULTIVOS ====================

const cultivoSchema = new mongoose.Schema({
    // Referencia al usuario propietario
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: false, // Permitir null para cultivos demo
        index: true
    },

    // Información básica del cultivo
    nombre: {
        type: String,
        required: [true, 'El nombre del cultivo es requerido'],
        trim: true,
        maxlength: [100, 'El nombre no puede exceder 100 caracteres'],
        index: true
    },

    variedad: {
        type: String,
        required: [true, 'La variedad es requerida'],
        trim: true,
        maxlength: [100, 'La variedad no puede exceder 100 caracteres'],
        index: true
    },

    // Características fijas del cultivo (según especificaciones)
    metodo: {
        type: String,
        enum: ['indoor'],
        default: 'indoor' // Siempre indoor
    },

    medio: {
        type: String,
        required: [true, 'El medio de cultivo es requerido'],
        enum: {
            values: ['fibra_coco', 'fibra_coco_perlita', 'light_mix', 'hidro'],
            message: 'Medio de cultivo inválido. Debe ser: fibra_coco, fibra_coco_perlita, light_mix o hidro'
        },
        index: true
    },

    // Especificaciones del setup
    espacio: {
        type: Number,
        required: [true, 'El espacio es requerido'],
        min: [0.1, 'El espacio debe ser mayor a 0.1 m²'],
        max: [1000, 'El espacio no puede exceder 1000 m²']
    },

    macetas: {
        type: Number,
        required: [true, 'El tamaño de macetas es requerido'],
        min: [1, 'El tamaño de macetas debe ser mayor a 1L'],
        max: [1000, 'El tamaño de macetas no puede exceder 1000L']
    },

    // Sistema de iluminación (siempre LED)
    iluminacion: {
        type: String,
        enum: ['led'],
        default: 'led'
    },

    potencia: {
        type: Number,
        required: [true, 'La potencia es requerida'],
        min: [1, 'La potencia debe ser mayor a 1W'],
        max: [10000, 'La potencia no puede exceder 10000W']
    },

    // Sistema de ventilación (siempre sistema cerrado con CO2)
    ventilacion: {
        type: String,
        enum: ['sistema_cerrado_co2'],
        default: 'sistema_cerrado_co2'
    },

    plantas: {
        type: Number,
        required: [true, 'El número de plantas es requerido'],
        min: [1, 'Debe haber al menos 1 planta'],
        max: [1000, 'No puede exceder 1000 plantas']
    },

    // Notas y observaciones (historial completo)
    notas: [{
        tipo: {
            type: String,
            enum: {
                values: ['general', 'vegetativo', 'floracion', 'cosecha', 'recordatorio', 'comentario'],
                message: 'Tipo de nota inválido'
            },
            default: 'general'
        },
        contenido: {
            type: String,
            required: [true, 'El contenido de la nota es requerido'],
            trim: true,
            maxlength: [1000, 'La nota no puede exceder 1000 caracteres']
        },
        fecha: {
            type: Date,
            default: Date.now
        },
        fase: {
            type: String,
            enum: ['germinacion', 'vegetativo', 'floracion', 'cosecha', 'curado'],
            default: null
        },
        importante: {
            type: Boolean,
            default: false
        }
    }],

    // Nota actual (para compatibilidad con versiones anteriores)
    notaActual: {
        type: String,
        trim: true,
        maxlength: [1000, 'La nota actual no puede exceder 1000 caracteres']
    },

    // Historial de chat con Bruce AI
    chatHistory: [{
        type: {
            type: String,
            enum: ['user', 'ai'],
            required: true
        },
        content: {
            type: String,
            required: true,
            maxlength: [5000, 'El contenido del mensaje no puede exceder 5000 caracteres']
        },
        image: {
            type: String, // URL de imagen si aplica
            maxlength: [500, 'La URL de imagen no puede exceder 500 caracteres']
        },
        timestamp: {
            type: Date,
            default: Date.now
        }
    }],

    // Estado del cultivo
    estado: {
        type: String,
        enum: {
            values: ['activo', 'pausado', 'finalizado', 'archivado'],
            message: 'Estado inválido. Debe ser: activo, pausado, finalizado o archivado'
        },
        default: 'activo',
        index: true
    },

    // Fases del cultivo (opcional, para seguimiento)
    faseActual: {
        type: String,
        enum: ['germinacion', 'vegetativo', 'floracion', 'cosecha', 'curado'],
        default: 'vegetativo'
    },

    // Información adicional opcional
    objetivo: {
        type: String,
        trim: true,
        maxlength: [200, 'El objetivo no puede exceder 200 caracteres']
    },

    banco: {
        type: String,
        trim: true,
        maxlength: [100, 'El banco no puede exceder 100 caracteres']
    },

    // Metadatos del cultivo
    metadata: {
        // Información de costos
        costos: {
            semillas: { type: Number, min: 0, default: 0 },
            sustrato: { type: Number, min: 0, default: 0 },
            fertilizantes: { type: Number, min: 0, default: 0 },
            iluminacion: { type: Number, min: 0, default: 0 },
            otros: { type: Number, min: 0, default: 0 }
        },

        // Información de rendimiento esperado
        rendimientoEsperado: {
            gramosPlanta: { type: Number, min: 0 },
            gramosTotal: { type: Number, min: 0 }
        },

        // Información de calidad
        calidad: {
            thc: { type: Number, min: 0, max: 100 },
            cbd: { type: Number, min: 0, max: 100 },
            terpenos: { type: Number, min: 0, max: 100 }
        },

        // Fechas importantes
        fechas: {
            germinacion: Date,
            transplantado: Date,
            floracion: Date,
            cosecha: Date,
            curado: Date
        }
    },

    // Estadísticas del cultivo
    estadisticas: {
        consultasBruce: {
            type: Number,
            default: 0,
            min: 0
        },
        imagenesAnalizadas: {
            type: Number,
            default: 0,
            min: 0
        },
        problemasDetectados: {
            type: Number,
            default: 0,
            min: 0
        }
    }

}, {
    timestamps: true, // Agrega createdAt y updatedAt automáticamente
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});

// ==================== ÍNDICES COMPUESTOS ====================

// Índices para optimizar consultas frecuentes
cultivoSchema.index({ userId: 1, estado: 1, createdAt: -1 }); // Cultivos por usuario y estado
cultivoSchema.index({ userId: 1, variedad: 1 }); // Cultivos por variedad
cultivoSchema.index({ userId: 1, medio: 1 }); // Cultivos por medio
cultivoSchema.index({ userId: 1, faseActual: 1 }); // Cultivos por fase
cultivoSchema.index({ userId: 1, updatedAt: -1 }); // Cultivos por fecha de actualización

// Índice de texto para búsquedas
cultivoSchema.index({
    nombre: 'text',
    variedad: 'text',
    notas: 'text',
    objetivo: 'text'
});

// ==================== VIRTUALS ====================

/**
 * Virtual para calcular el costo total del cultivo
 */
cultivoSchema.virtual('costoTotal').get(function() {
    const costos = this.metadata.costos;
    return costos.semillas + costos.sustrato + costos.fertilizantes +
           costos.iluminacion + costos.otros;
});

/**
 * Virtual para calcular la densidad de plantas
 */
cultivoSchema.virtual('densidadPlantas').get(function() {
    return this.espacio > 0 ? this.plantas / this.espacio : 0;
});

/**
 * Virtual para el medio de cultivo en español
 */
cultivoSchema.virtual('medioDisplay').get(function() {
    const medios = {
        'fibra_coco': 'Fibra de coco',
        'fibra_coco_perlita': 'Fibra de coco + perlita',
        'light_mix': 'Light mix',
        'hidro': 'Hidro'
    };
    return medios[this.medio] || this.medio;
});

/**
 * Virtual para el estado en español
 */
cultivoSchema.virtual('estadoLabel').get(function() {
    const labels = {
        'activo': 'Activo',
        'pausado': 'Pausado',
        'finalizado': 'Finalizado',
        'archivado': 'Archivado'
    };
    return labels[this.estado] || this.estado;
});

/**
 * Virtual para la fase en español
 */
cultivoSchema.virtual('faseLabel').get(function() {
    const labels = {
        'germinacion': 'Germinación',
        'vegetativo': 'Vegetativo',
        'floracion': 'Floración',
        'cosecha': 'Cosecha',
        'curado': 'Curado'
    };
    return labels[this.faseActual] || this.faseActual;
});

/**
 * Virtual para calcular días desde creación
 */
cultivoSchema.virtual('diasActivo').get(function() {
    const now = new Date();
    const created = new Date(this.createdAt);
    const diffTime = Math.abs(now - created);
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
});

/**
 * Virtual para obtener la última nota
 */
cultivoSchema.virtual('ultimaNota').get(function() {
    if (this.notas && this.notas.length > 0) {
        return this.notas[this.notas.length - 1];
    }
    return null;
});

/**
 * Virtual para obtener notas recientes (últimas 5)
 */
cultivoSchema.virtual('notasRecientes').get(function() {
    if (this.notas && this.notas.length > 0) {
        return this.notas.slice(-5).reverse(); // Últimas 5, ordenadas de más reciente a más antigua
    }
    return [];
});

// ==================== MÉTODOS DE INSTANCIA ====================

/**
 * Obtiene información resumida del cultivo
 * @returns {Object} - Información resumida
 */
cultivoSchema.methods.getSummary = function() {
    return {
        id: this._id,
        nombre: this.nombre,
        variedad: this.variedad,
        medio: this.medio,
        medioDisplay: this.medioDisplay,
        espacio: this.espacio,
        plantas: this.plantas,
        potencia: this.potencia,
        estado: this.estado,
        estadoLabel: this.estadoLabel,
        faseActual: this.faseActual,
        faseLabel: this.faseLabel,
        costoTotal: this.costoTotal,
        densidadPlantas: this.densidadPlantas,
        diasActivo: this.diasActivo,
        createdAt: this.createdAt,
        updatedAt: this.updatedAt,
        hasChatHistory: this.chatHistory.length > 0
    };
};

/**
 * Agrega un mensaje al historial de chat
 * @param {string} type - Tipo de mensaje ('user' o 'ai')
 * @param {string} content - Contenido del mensaje
 * @param {string} image - URL de imagen (opcional)
 * @returns {Promise<Cultivo>} - Cultivo actualizado
 */
cultivoSchema.methods.addChatMessage = async function(type, content, image = null) {
    this.chatHistory.push({
        type,
        content,
        image,
        timestamp: new Date()
    });

    // Actualizar estadísticas
    this.estadisticas.consultasBruce += 1;
    if (image) {
        this.estadisticas.imagenesAnalizadas += 1;
    }

    await this.save();
    return this;
};

/**
 * Cambia el estado del cultivo
 * @param {string} nuevoEstado - Nuevo estado
 * @returns {Promise<Cultivo>} - Cultivo actualizado
 */
cultivoSchema.methods.cambiarEstado = async function(nuevoEstado) {
    const estadosValidos = ['activo', 'pausado', 'finalizado', 'archivado'];
    if (!estadosValidos.includes(nuevoEstado)) {
        throw new Error('Estado inválido');
    }

    this.estado = nuevoEstado;
    await this.save();
    return this;
};

/**
 * Actualiza la fase del cultivo
 * @param {string} nuevaFase - Nueva fase
 * @returns {Promise<Cultivo>} - Cultivo actualizado
 */
cultivoSchema.methods.cambiarFase = async function(nuevaFase) {
    const fasesValidas = ['germinacion', 'vegetativo', 'floracion', 'cosecha', 'curado'];
    if (!fasesValidas.includes(nuevaFase)) {
        throw new Error('Fase inválida');
    }

    this.faseActual = nuevaFase;

    // Actualizar fechas importantes si corresponde
    if (nuevaFase === 'floracion' && !this.metadata.fechas.floracion) {
        this.metadata.fechas.floracion = new Date();
    } else if (nuevaFase === 'cosecha' && !this.metadata.fechas.cosecha) {
        this.metadata.fechas.cosecha = new Date();
    }

    await this.save();
    return this;
};

/**
 * Actualiza costos del cultivo
 * @param {Object} costos - Objeto con costos actualizados
 * @returns {Promise<Cultivo>} - Cultivo actualizado
 */
cultivoSchema.methods.actualizarCostos = async function(costos) {
    Object.keys(costos).forEach(key => {
        if (this.metadata.costos.hasOwnProperty(key)) {
            this.metadata.costos[key] = Math.max(0, parseFloat(costos[key]) || 0);
        }
    });
    await this.save();
    return this;
};

/**
 * Agrega una nueva nota al historial
 * @param {string} contenido - Contenido de la nota
 * @param {string} tipo - Tipo de nota (general, vegetativo, floracion, etc.)
 * @param {boolean} importante - Si es una nota importante
 * @returns {Promise<Cultivo>} - Cultivo actualizado
 */
cultivoSchema.methods.agregarNota = async function(contenido, tipo = 'general', importante = false) {
    if (!contenido || contenido.trim().length === 0) {
        throw new Error('El contenido de la nota es requerido');
    }

    const nuevaNota = {
        tipo: tipo,
        contenido: contenido.trim(),
        fecha: new Date(),
        fase: this.faseActual,
        importante: importante
    };

    // Asegurar que this.notas sea un array válido
    if (!this.notas) {
        this.notas = [];
    } else if (!Array.isArray(this.notas)) {
        this.notas = [];
    }

    this.notas.push(nuevaNota);

    // También actualizar la nota actual para compatibilidad
    this.notaActual = contenido.trim();

    await this.save();
    return this;
};

/**
 * Actualiza la nota actual (para compatibilidad)
 * @param {string} contenido - Contenido de la nota
 * @returns {Promise<Cultivo>} - Cultivo actualizado
 */
cultivoSchema.methods.actualizarNotaActual = async function(contenido) {
    this.notaActual = contenido ? contenido.trim() : '';

    // Si hay contenido, agregar también al historial como nota general
    if (contenido && contenido.trim().length > 0) {
        await this.agregarNota(contenido, 'general');
    }

    await this.save();
    return this;
};

// ==================== MÉTODOS ESTÁTICOS ====================

/**
 * Obtiene estadísticas de cultivos para un usuario
 * @param {ObjectId} userId - ID del usuario
 * @param {Object} filters - Filtros adicionales
 * @returns {Promise<Object>} - Estadísticas
 */
cultivoSchema.statics.getStats = async function(userId, filters = {}) {
    const matchStage = { userId, ...filters };

    const pipeline = [
        { $match: matchStage },
        {
            $group: {
                _id: null,
                totalCultivos: { $sum: 1 },
                cultivosActivos: {
                    $sum: { $cond: [{ $eq: ['$estado', 'activo'] }, 1, 0] }
                },
                cultivosFinalizados: {
                    $sum: { $cond: [{ $eq: ['$estado', 'finalizado'] }, 1, 0] }
                },
                totalEspacio: { $sum: '$espacio' },
                totalPlantas: { $sum: '$plantas' },
                totalPotencia: { $sum: '$potencia' },
                costoTotal: { $sum: { $add: ['$metadata.costos.semillas', '$metadata.costos.sustrato', '$metadata.costos.fertilizantes', '$metadata.costos.iluminacion', '$metadata.costos.otros'] } },
                consultasTotales: { $sum: '$estadisticas.consultasBruce' }
            }
        }
    ];

    const result = await this.aggregate(pipeline);
    const stats = result[0] || {
        totalCultivos: 0,
        cultivosActivos: 0,
        cultivosFinalizados: 0,
        totalEspacio: 0,
        totalPlantas: 0,
        totalPotencia: 0,
        costoTotal: 0,
        consultasTotales: 0
    };

    return stats;
};

/**
 * Obtiene cultivos agrupados por estado
 * @param {ObjectId} userId - ID del usuario
 * @param {Object} filters - Filtros adicionales
 * @returns {Promise<Object>} - Cultivos agrupados por estado
 */
cultivoSchema.statics.getCultivosByEstado = async function(userId, filters = {}) {
    const matchStage = { userId, ...filters };

    const pipeline = [
        { $match: matchStage },
        {
            $group: {
                _id: '$estado',
                cultivos: {
                    $push: {
                        id: '$_id',
                        nombre: '$nombre',
                        variedad: '$variedad',
                        medio: '$medio',
                        espacio: '$espacio',
                        plantas: '$plantas',
                        potencia: '$potencia',
                        faseActual: '$faseActual',
                        createdAt: '$createdAt',
                        updatedAt: '$updatedAt'
                    }
                },
                count: { $sum: 1 }
            }
        }
    ];

    const result = await this.aggregate(pipeline);
    return result.reduce((acc, group) => {
        acc[group._id] = group.cultivos;
        return acc;
    }, {});
};

/**
 * Busca cultivos con texto
 * @param {ObjectId} userId - ID del usuario
 * @param {string} searchText - Texto a buscar
 * @param {Object} options - Opciones de búsqueda
 * @returns {Promise<Array>} - Cultivos encontrados
 */
cultivoSchema.statics.searchCultivos = async function(userId, searchText, options = {}) {
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
cultivoSchema.pre('save', function(next) {
    // Asegurar que el nombre no esté vacío después del trim
    if (!this.nombre || !this.nombre.trim()) {
        return next(new Error('El nombre del cultivo no puede estar vacío'));
    }

    // Asegurar que la variedad no esté vacía después del trim
    if (!this.variedad || !this.variedad.trim()) {
        return next(new Error('La variedad no puede estar vacía'));
    }

    // Asegurar que el array de notas esté siempre inicializado
    if (!this.notas) {
        this.notas = [];
    } else if (!Array.isArray(this.notas)) {
        // Si notas no es un array, intentar convertirlo o inicializarlo
        this.notas = [];
    }

    // Para cultivos demo (userId null), saltar validaciones adicionales
    if (this.userId === null) {
        return next();
    }

    next();
});

/**
 * Middleware post-save para logging
 */
cultivoSchema.post('save', async function(doc) {
    console.log(`🌱 Cultivo ${doc.estado} guardado: ${doc.nombre} (${doc.variedad}) - ${doc.medioDisplay}`);
});

// ==================== EXPORTAR MODELO ====================

const Cultivo = mongoose.model('Cultivo', cultivoSchema);

module.exports = Cultivo;
