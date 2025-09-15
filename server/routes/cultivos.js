/**
 * 🌱 RUTAS DE CULTIVOS - API
 *
 * Endpoints para CRUD de cultivos de cannabis medicinal en Bruce AI
 * Gestiona cultivos indoor con LED y sistema cerrado con CO2
 * Autor: Senior Backend Developer
 */

const express = require('express');
const Cultivo = require('../models/Cultivo');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// ==================== VALIDACIONES ====================

/**
 * Valida datos de cultivo
 */
const validateCultivo = (req, res, next) => {
    const {
        nombre, variedad, medio, espacio, macetas,
        potencia, plantas, notas, estado, faseActual
    } = req.body;

    const errors = [];

    if (!nombre || nombre.trim().length === 0) {
        errors.push('El nombre del cultivo es requerido');
    }

    if (!variedad || variedad.trim().length === 0) {
        errors.push('La variedad es requerida');
    }

    if (!medio || !['fibra_coco', 'fibra_coco_perlita', 'light_mix', 'hidro'].includes(medio)) {
        errors.push('El medio de cultivo debe ser: fibra_coco, fibra_coco_perlita, light_mix o hidro');
    }

    if (!espacio || espacio <= 0 || espacio > 1000) {
        errors.push('El espacio debe estar entre 0.1 y 1000 m²');
    }

    if (!macetas || macetas < 1 || macetas > 1000) {
        errors.push('El tamaño de macetas debe estar entre 1 y 1000L');
    }

    if (!potencia || potencia < 1 || potencia > 10000) {
        errors.push('La potencia debe estar entre 1 y 10000W');
    }

    if (!plantas || plantas < 1 || plantas > 1000) {
        errors.push('El número de plantas debe estar entre 1 y 1000');
    }

    if (estado && !['activo', 'pausado', 'finalizado', 'archivado'].includes(estado)) {
        errors.push('El estado debe ser: activo, pausado, finalizado o archivado');
    }

    if (faseActual && !['germinacion', 'vegetativo', 'floracion', 'cosecha', 'curado'].includes(faseActual)) {
        errors.push('La fase debe ser: germinacion, vegetativo, floracion, cosecha o curado');
    }

    if (notas && notas.length > 1000) {
        errors.push('Las notas no pueden exceder 1000 caracteres');
    }

    if (errors.length > 0) {
        return res.status(400).json({
            error: 'Datos de cultivo inválidos',
            details: errors
        });
    }

    next();
};

// ==================== RUTAS ====================

/**
 * GET /api/cultivos
 * Obtiene cultivos del usuario con filtros y paginación
 */
router.get('/', authenticateToken, async (req, res) => {
    try {
        const userId = req.user._id;
        const {
            page = 1,
            limit = 20,
            estado,
            medio,
            faseActual,
            search,
            sortBy = 'updatedAt',
            sortOrder = 'desc'
        } = req.query;

        // Construir filtros
        const filters = { userId };

        if (estado) filters.estado = estado;
        if (medio) filters.medio = medio;
        if (faseActual) filters.faseActual = faseActual;

        // Calcular skip para paginación
        const skip = (page - 1) * limit;

        // Construir ordenamiento
        const sort = {};
        sort[sortBy] = sortOrder === 'desc' ? -1 : 1;

        let query = Cultivo.find(filters);

        // Búsqueda de texto
        if (search) {
            query = query.where({
                $text: { $search: search }
            });
        }

        // Ejecutar consulta con paginación
        const cultivos = await query
            .sort(sort)
            .skip(skip)
            .limit(parseInt(limit))
            .populate('userId', 'username email');

        // Obtener total para paginación
        const total = await Cultivo.countDocuments(filters);
        const totalPages = Math.ceil(total / limit);

        res.json({
            success: true,
            data: cultivos.map(cultivo => cultivo.getSummary()),
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total,
                totalPages,
                hasNext: page < totalPages,
                hasPrev: page > 1
            }
        });

    } catch (error) {
        console.error('Error obteniendo cultivos:', error);
        res.status(500).json({
            error: 'Error interno del servidor',
            message: error.message
        });
    }
});

/**
 * GET /api/cultivos/:id
 * Obtiene un cultivo específico con todo su detalle
 */
router.get('/:id', authenticateToken, async (req, res) => {
    try {
        const userId = req.user._id;
        const { id } = req.params;

        const cultivo = await Cultivo.findOne({ _id: id, userId })
            .populate('userId', 'username email');

        if (!cultivo) {
            return res.status(404).json({
                error: 'Cultivo no encontrado'
            });
        }

        res.json({
            success: true,
            data: cultivo
        });

    } catch (error) {
        console.error('Error obteniendo cultivo:', error);
        res.status(500).json({
            error: 'Error interno del servidor',
            message: error.message
        });
    }
});

/**
 * POST /api/cultivos
 * Crea un nuevo cultivo
 */
router.post('/', authenticateToken, validateCultivo, async (req, res) => {
    try {
        const userId = req.user._id;
        const cultivoData = {
            ...req.body,
            userId,
            metodo: 'indoor', // Siempre indoor
            iluminacion: 'led', // Siempre LED
            ventilacion: 'sistema_cerrado_co2', // Siempre sistema cerrado con CO2
            estado: req.body.estado || 'activo',
            faseActual: req.body.faseActual || 'vegetativo',
            chatHistory: [],
            metadata: {
                costos: {
                    semillas: 0,
                    sustrato: 0,
                    fertilizantes: 0,
                    iluminacion: 0,
                    otros: 0
                },
                rendimientoEsperado: {},
                calidad: {},
                fechas: {}
            },
            estadisticas: {
                consultasBruce: 0,
                imagenesAnalizadas: 0,
                problemasDetectados: 0
            }
        };

        const cultivo = new Cultivo(cultivoData);
        await cultivo.save();

        res.status(201).json({
            success: true,
            message: 'Cultivo creado exitosamente',
            data: cultivo.getSummary()
        });

    } catch (error) {
        console.error('Error creando cultivo:', error);

        if (error.name === 'ValidationError') {
            return res.status(400).json({
                error: 'Datos de cultivo inválidos',
                details: Object.values(error.errors).map(err => err.message)
            });
        }

        res.status(500).json({
            error: 'Error interno del servidor',
            message: error.message
        });
    }
});

/**
 * PUT /api/cultivos/:id
 * Actualiza un cultivo existente
 */
router.put('/:id', authenticateToken, validateCultivo, async (req, res) => {
    try {
        const userId = req.user._id;
        const { id } = req.params;

        const cultivo = await Cultivo.findOne({ _id: id, userId });

        if (!cultivo) {
            return res.status(404).json({
                error: 'Cultivo no encontrado'
            });
        }

        // Actualizar campos permitidos
        const camposPermitidos = [
            'nombre', 'variedad', 'medio', 'espacio', 'macetas',
            'potencia', 'plantas', 'notas', 'estado', 'faseActual',
            'objetivo', 'banco'
        ];

        camposPermitidos.forEach(campo => {
            if (req.body[campo] !== undefined) {
                cultivo[campo] = req.body[campo];
            }
        });

        await cultivo.save();

        res.json({
            success: true,
            message: 'Cultivo actualizado exitosamente',
            data: cultivo.getSummary()
        });

    } catch (error) {
        console.error('Error actualizando cultivo:', error);

        if (error.name === 'ValidationError') {
            return res.status(400).json({
                error: 'Datos de cultivo inválidos',
                details: Object.values(error.errors).map(err => err.message)
            });
        }

        res.status(500).json({
            error: 'Error interno del servidor',
            message: error.message
        });
    }
});

/**
 * DELETE /api/cultivos/:id
 * Elimina un cultivo (o lo archiva)
 */
router.delete('/:id', authenticateToken, async (req, res) => {
    try {
        const userId = req.user._id;
        const { id } = req.params;
        const { archive = true } = req.query; // Por defecto archivar en lugar de eliminar

        const cultivo = await Cultivo.findOne({ _id: id, userId });

        if (!cultivo) {
            return res.status(404).json({
                error: 'Cultivo no encontrado'
            });
        }

        if (archive) {
            // Archivar el cultivo
            cultivo.estado = 'archivado';
            await cultivo.save();

            res.json({
                success: true,
                message: 'Cultivo archivado exitosamente',
                data: cultivo.getSummary()
            });
        } else {
            // Eliminar permanentemente
            await Cultivo.findByIdAndDelete(id);

            res.json({
                success: true,
                message: 'Cultivo eliminado permanentemente'
            });
        }

    } catch (error) {
        console.error('Error eliminando cultivo:', error);
        res.status(500).json({
            error: 'Error interno del servidor',
            message: error.message
        });
    }
});

/**
 * POST /api/cultivos/:id/chat
 * Agrega un mensaje al historial de chat del cultivo
 */
router.post('/:id/chat', authenticateToken, async (req, res) => {
    try {
        const userId = req.user._id;
        const { id } = req.params;
        const { type, content, image } = req.body;

        if (!type || !content) {
            return res.status(400).json({
                error: 'Tipo y contenido del mensaje son requeridos'
            });
        }

        if (!['user', 'ai'].includes(type)) {
            return res.status(400).json({
                error: 'El tipo debe ser "user" o "ai"'
            });
        }

        const cultivo = await Cultivo.findOne({ _id: id, userId });

        if (!cultivo) {
            return res.status(404).json({
                error: 'Cultivo no encontrado'
            });
        }

        await cultivo.addChatMessage(type, content, image);

        res.json({
            success: true,
            message: 'Mensaje agregado al historial',
            data: {
                id: cultivo._id,
                chatHistoryCount: cultivo.chatHistory.length,
                lastMessage: cultivo.chatHistory[cultivo.chatHistory.length - 1]
            }
        });

    } catch (error) {
        console.error('Error agregando mensaje:', error);
        res.status(500).json({
            error: 'Error interno del servidor',
            message: error.message
        });
    }
});

/**
 * PUT /api/cultivos/:id/estado
 * Cambia el estado del cultivo
 */
router.put('/:id/estado', authenticateToken, async (req, res) => {
    try {
        const userId = req.user._id;
        const { id } = req.params;
        const { estado } = req.body;

        if (!estado || !['activo', 'pausado', 'finalizado', 'archivado'].includes(estado)) {
            return res.status(400).json({
                error: 'Estado inválido. Debe ser: activo, pausado, finalizado o archivado'
            });
        }

        const cultivo = await Cultivo.findOne({ _id: id, userId });

        if (!cultivo) {
            return res.status(404).json({
                error: 'Cultivo no encontrado'
            });
        }

        await cultivo.cambiarEstado(estado);

        res.json({
            success: true,
            message: `Cultivo ${estado} exitosamente`,
            data: cultivo.getSummary()
        });

    } catch (error) {
        console.error('Error cambiando estado:', error);
        res.status(500).json({
            error: 'Error interno del servidor',
            message: error.message
        });
    }
});

/**
 * PUT /api/cultivos/:id/fase
 * Cambia la fase del cultivo
 */
router.put('/:id/fase', authenticateToken, async (req, res) => {
    try {
        const userId = req.user._id;
        const { id } = req.params;
        const { fase } = req.body;

        if (!fase || !['germinacion', 'vegetativo', 'floracion', 'cosecha', 'curado'].includes(fase)) {
            return res.status(400).json({
                error: 'Fase inválida. Debe ser: germinacion, vegetativo, floracion, cosecha o curado'
            });
        }

        const cultivo = await Cultivo.findOne({ _id: id, userId });

        if (!cultivo) {
            return res.status(404).json({
                error: 'Cultivo no encontrado'
            });
        }

        await cultivo.cambiarFase(fase);

        res.json({
            success: true,
            message: `Fase cambiada a ${fase} exitosamente`,
            data: cultivo.getSummary()
        });

    } catch (error) {
        console.error('Error cambiando fase:', error);
        res.status(500).json({
            error: 'Error interno del servidor',
            message: error.message
        });
    }
});

/**
 * PUT /api/cultivos/:id/costos
 * Actualiza los costos del cultivo
 */
router.put('/:id/costos', authenticateToken, async (req, res) => {
    try {
        const userId = req.user._id;
        const { id } = req.params;
        const costos = req.body;

        const cultivo = await Cultivo.findOne({ _id: id, userId });

        if (!cultivo) {
            return res.status(404).json({
                error: 'Cultivo no encontrado'
            });
        }

        await cultivo.actualizarCostos(costos);

        res.json({
            success: true,
            message: 'Costos actualizados exitosamente',
            data: {
                id: cultivo._id,
                costoTotal: cultivo.costoTotal,
                costos: cultivo.metadata.costos
            }
        });

    } catch (error) {
        console.error('Error actualizando costos:', error);
        res.status(500).json({
            error: 'Error interno del servidor',
            message: error.message
        });
    }
});

/**
 * GET /api/cultivos/stats
 * Obtiene estadísticas de cultivos del usuario
 */
router.get('/stats/overview', authenticateToken, async (req, res) => {
    try {
        const userId = req.user._id;
        const { estado, medio } = req.query;

        const filters = { userId };
        if (estado) filters.estado = estado;
        if (medio) filters.medio = medio;

        const stats = await Cultivo.getStats(userId, filters);

        res.json({
            success: true,
            data: stats
        });

    } catch (error) {
        console.error('Error obteniendo estadísticas:', error);
        res.status(500).json({
            error: 'Error interno del servidor',
            message: error.message
        });
    }
});

/**
 * GET /api/cultivos/grouped/by-estado
 * Obtiene cultivos agrupados por estado
 */
router.get('/grouped/by-estado', authenticateToken, async (req, res) => {
    try {
        const userId = req.user._id;
        const { estado, medio } = req.query;

        const filters = { userId };
        if (estado) filters.estado = estado;
        if (medio) filters.medio = medio;

        const grouped = await Cultivo.getCultivosByEstado(userId, filters);

        res.json({
            success: true,
            data: grouped
        });

    } catch (error) {
        console.error('Error obteniendo cultivos agrupados:', error);
        res.status(500).json({
            error: 'Error interno del servidor',
            message: error.message
        });
    }
});

/**
 * POST /api/cultivos/:id/notas
 * Agrega una nueva nota al historial del cultivo
 */
router.post('/:id/notas', authenticateToken, async (req, res) => {
    try {
        const userId = req.user._id;
        const { id } = req.params;
        const { contenido, tipo = 'general', importante = false } = req.body;

        if (!contenido || contenido.trim().length === 0) {
            return res.status(400).json({
                error: 'El contenido de la nota es requerido'
            });
        }

        const cultivo = await Cultivo.findOne({ _id: id, userId });

        if (!cultivo) {
            return res.status(404).json({
                error: 'Cultivo no encontrado'
            });
        }

        await cultivo.agregarNota(contenido, tipo, importante);

        res.status(201).json({
            success: true,
            message: 'Nota agregada exitosamente',
            data: {
                id: cultivo._id,
                nuevaNota: cultivo.ultimaNota,
                totalNotas: cultivo.notas.length
            }
        });

    } catch (error) {
        console.error('Error agregando nota:', error);
        res.status(500).json({
            error: 'Error interno del servidor',
            message: error.message
        });
    }
});

/**
 * GET /api/cultivos/:id/notas
 * Obtiene el historial de notas del cultivo
 */
router.get('/:id/notas', authenticateToken, async (req, res) => {
    try {
        const userId = req.user._id;
        const { id } = req.params;
        const { limit = 10, tipo } = req.query;

        const cultivo = await Cultivo.findOne({ _id: id, userId });

        if (!cultivo) {
            return res.status(404).json({
                error: 'Cultivo no encontrado'
            });
        }

        let notasFiltradas = cultivo.notas || [];

        // Filtrar por tipo si se especifica
        if (tipo) {
            notasFiltradas = notasFiltradas.filter(nota => nota.tipo === tipo);
        }

        // Ordenar por fecha descendente y limitar
        notasFiltradas = notasFiltradas
            .sort((a, b) => new Date(b.fecha) - new Date(a.fecha))
            .slice(0, parseInt(limit));

        res.json({
            success: true,
            data: {
                id: cultivo._id,
                notas: notasFiltradas,
                total: cultivo.notas.length,
                filtradas: notasFiltradas.length
            }
        });

    } catch (error) {
        console.error('Error obteniendo notas:', error);
        res.status(500).json({
            error: 'Error interno del servidor',
            message: error.message
        });
    }
});

module.exports = router;
