/**
 * 🚀 SERVIDOR PRINCIPAL - FEDE LIFE FINANZAS
 * 
 * Servidor Express con MongoDB para sistema de finanzas personales
 * Incluye autenticación, seguridad y optimizaciones para producción
 * Autor: Senior Backend Developer
 */

// ==================== IMPORTS ====================
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const compression = require('compression');
const morgan = require('morgan');
const path = require('path');
require('dotenv').config();

// Importar modelos (necesario para que Mongoose los registre)
require('./models/Category');
require('./models/Transaction');
require('./models/User');

// Importar modelos para uso directo
const Transaction = require('./models/Transaction');
const Goal = require('./models/Goal');

// Importar rutas
const authRoutes = require('./routes/auth');
const transactionRoutes = require('./routes/transactions');
const categoryRoutes = require('./routes/categories');
const budgetRoutes = require('./routes/budgets');
const goalRoutes = require('./routes/goals');
const reportRoutes = require('./routes/reports');
const aiRoutes = require('./routes/ai');
const pdfAnalyzeRoutes = require('./routes/pdf-analyze');
const exchangeRateRoutes = require('./routes/exchangeRates');

// Importar servicios
const { exchangeRateService } = require('./services/exchangeRate');

// Importar middleware de autenticación
const { authenticateToken } = require('./middleware/auth');

// ==================== CONFIGURACIÓN ====================

const app = express();
const PORT = 3003; // Puerto fijo para evitar conflictos con Next.js
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/fede-life-finanzas';

// Debug: Mostrar variables de entorno (sin mostrar valores sensibles)
console.log('🔍 Variables de entorno:');
console.log('NODE_ENV:', process.env.NODE_ENV);
console.log('PORT:', process.env.PORT);
console.log('MONGODB_URI existe:', !!process.env.MONGODB_URI);
console.log('MONGODB_URI comienza con:', process.env.MONGODB_URI ? process.env.MONGODB_URI.substring(0, 20) + '...' : 'No definida');
console.log('🔄 Servidor reiniciado con diagnóstico mejorado - ' + new Date().toISOString());

// ==================== CONEXIÓN A MONGODB ====================

/**
 * Conecta a MongoDB con manejo de errores y reconexión automática
 */
async function connectToMongoDB() {
    try {
        // Configuración optimizada para producción
        const mongoOptions = {
            maxPoolSize: process.env.NODE_ENV === 'production' ? 10 : 5, // Más conexiones en producción
            serverSelectionTimeoutMS: 10000, // 10 segundos para selección de servidor
            socketTimeoutMS: 45000, // 45 segundos para operaciones
            // Configuración de retry
            retryWrites: true,
            w: 'majority',
            // Configuración de heartbeat
            heartbeatFrequencyMS: 10000,
            // Configuración de timeouts
            connectTimeoutMS: 10000,
            // Configuración de pool
            minPoolSize: 1,
            maxIdleTimeMS: 30000,
            // Configuración de compresión
            compressors: ['zlib'],
            zlibCompressionLevel: 6
        };
        
        console.log('🔗 Intentando conectar a MongoDB...');
        console.log(`🌍 Ambiente: ${process.env.NODE_ENV || 'development'}`);
        console.log(`📊 URI Preview: ${MONGODB_URI ? MONGODB_URI.substring(0, 50) + '...' : 'No definida'}`);
        
        await mongoose.connect(MONGODB_URI, mongoOptions);
        
        console.log('✅ Conectado a MongoDB exitosamente');
        console.log(`📊 Base de datos: ${mongoose.connection.name}`);
        console.log(`🔗 Host: ${mongoose.connection.host}`);
        console.log(`🚪 Puerto: ${mongoose.connection.port}`);
        
        // Configurar eventos de conexión
        mongoose.connection.on('error', (err) => {
            console.error('❌ Error de conexión MongoDB:', err);
            console.error('❌ Código de error:', err.code);
            console.error('❌ Nombre de error:', err.name);
        });
        
        mongoose.connection.on('disconnected', () => {
            console.log('⚠️ Desconectado de MongoDB');
            console.log('🔄 Intentando reconectar en 5 segundos...');
            
            // Intentar reconectar automáticamente
            setTimeout(() => {
                if (mongoose.connection.readyState === 0) {
                    connectToMongoDB();
                }
            }, 5000);
        });
        
        mongoose.connection.on('reconnected', () => {
            console.log('🔄 Reconectado a MongoDB exitosamente');
        });
        
        mongoose.connection.on('connected', () => {
            console.log('🔗 Conexión MongoDB establecida');
        });
        
        // Configurar manejo de señales para cerrar conexión limpiamente
        console.log('🔄 Configurando manejo de señales de terminación...');
        
    } catch (error) {
        console.error('❌ Error conectando a MongoDB:', error);
        console.log('❌ Código de error:', error.code);
        console.log('❌ Nombre de error:', error.name);
        
        // En producción, registrar el error pero no salir
        if (process.env.NODE_ENV === 'production') {
            console.log('🚨 Error crítico en producción. Continuando sin MongoDB...');
            console.log('📝 La aplicación funcionará en modo limitado.');
            console.log('🔧 Para resolver: Verificar configuración de MongoDB Atlas y IP whitelist');
        } else {
            console.log('⚠️ Continuando sin MongoDB en desarrollo...');
        }
        
        // No salir del proceso, continuar sin base de datos
        // El servidor puede funcionar para servir archivos estáticos
    }
}

// ==================== MIDDLEWARE DE SEGURIDAD ====================

/**
 * Configura middleware de seguridad para producción
 */
function setupSecurityMiddleware() {
    // Helmet para headers de seguridad
    app.use(helmet({
        contentSecurityPolicy: {
            directives: {
                defaultSrc: ["'self'"],
                styleSrc: ["'self'", "'unsafe-inline'", "https://cdnjs.cloudflare.com"],
                scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-hashes'", "https://cdnjs.cloudflare.com", "https://cdn.jsdelivr.net"],
                scriptSrcAttr: ["'self'", "'unsafe-inline'", "'unsafe-hashes'"], // Permitir event handlers inline
                workerSrc: ["'self'", "blob:"],
                imgSrc: ["'self'", "data:", "https:"],
                fontSrc: ["'self'", "https://cdnjs.cloudflare.com"],
                connectSrc: ["'self'", "https://generativelanguage.googleapis.com", "https://api.exchangerate.host", "https://api.openai.com", "https://cdn.jsdelivr.net"]
            }
        }
    }));
    
    // Rate limiting para prevenir ataques
    const limiter = rateLimit({
        windowMs: process.env.NODE_ENV === 'production' ? 15 * 60 * 1000 : 60 * 60 * 1000, // 15 min producción, 60 min desarrollo
        max: process.env.NODE_ENV === 'production' ? 100 : 1000, // 100 producción, 1000 desarrollo
        message: {
            error: process.env.NODE_ENV === 'production'
                ? 'Demasiadas requests desde esta IP, intenta de nuevo en 15 minutos'
                : 'Demasiadas requests en desarrollo, intenta de nuevo en 1 hora'
        },
        standardHeaders: true,
        legacyHeaders: false
    });
    
    app.use('/api/', limiter);
    
    // CORS configurado para desarrollo y producción
    const corsOptions = {
        origin: function (origin, callback) {
            // Permitir requests sin origin (como mobile apps o curl requests)
            if (!origin) return callback(null, true);

            // Lista de orígenes permitidos
            const allowedOrigins = [
                'http://localhost:3000',
                'http://localhost:3001',
                'http://localhost:3002',
                'http://localhost:3003',
                'http://127.0.0.1:3000',
                'http://127.0.0.1:3001',
                'http://127.0.0.1:3002',
                'http://127.0.0.1:3003',
                // Agregar dominios de producción aquí
                process.env.FRONTEND_URL
            ].filter(Boolean); // Filtrar valores undefined

            if (allowedOrigins.indexOf(origin) !== -1 || process.env.NODE_ENV === 'development') {
                callback(null, true);
            } else {
                console.log(`🚫 Origen no permitido: ${origin}`);
                callback(new Error('Not allowed by CORS'));
            }
        },
        credentials: true,
        methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
        allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Origin']
    };

    app.use(cors(corsOptions));

    // Manejar preflight requests OPTIONS
    app.options('*', cors(corsOptions));

    console.log('🔒 Middleware de seguridad configurado');
}

// ==================== MIDDLEWARE GENERAL ====================

/**
 * Configura middleware general de la aplicación
 */
function setupGeneralMiddleware() {
    // Compresión para optimizar respuestas
    app.use(compression());
    
    // Logging en desarrollo
    if (process.env.NODE_ENV !== 'production') {
        app.use(morgan('dev'));
    } else {
        app.use(morgan('combined'));
    }
    
    // Parsear JSON y URL encoded
    app.use(express.json({ limit: '10mb' }));
    app.use(express.urlencoded({ extended: true, limit: '10mb' }));
    
    // Configurar MIME types correctos
    app.use((req, res, next) => {
        if (req.path.endsWith('.css')) {
            res.setHeader('Content-Type', 'text/css');
        } else if (req.path.endsWith('.js')) {
            res.setHeader('Content-Type', 'application/javascript');
        } else if (req.path.endsWith('.ts')) {
            res.setHeader('Content-Type', 'application/javascript');
        }
        next();
    });
    
    // Servir archivos estáticos desde la raíz del proyecto
    app.use(express.static(path.join(process.cwd(), 'dist')));

    // Servir archivos estáticos desde pages y funciones
    app.use(express.static(path.join(process.cwd(), 'pages')));
    app.use('/pages', express.static(path.join(process.cwd(), 'pages')));
    app.use('/funciones', express.static(path.join(process.cwd(), 'funciones')));
    
    console.log('⚙️ Middleware general configurado');
}

// ==================== RUTAS API ====================

/**
 * Configura todas las rutas de la API
 */
function setupRoutes() {
    // Middleware para verificar estado de la base de datos en rutas que requieren BD
    app.use('/api/', (req, res, next) => {
        // Excluir rutas que no requieren base de datos o son públicas
        const nonDbRoutes = [
            '/api/health',
            '/api/auth/status',
            '/api/public/transactions',
            '/api/public/categories',
            '/api/public/ai'
        ];
        if (nonDbRoutes.some(route => req.path.startsWith(route))) {
            return next();
        }

        // Si la base de datos no está conectada, devolver error informativo
        if (mongoose.connection.readyState !== 1) {
            return res.status(503).json({
                error: 'Servicio de base de datos no disponible',
                message: 'La aplicación está funcionando en modo limitado. Algunos servicios no están disponibles.',
                timestamp: new Date().toISOString(),
                code: 'DB_UNAVAILABLE'
            });
        }

        next();
    });
    
    // Rutas públicas
    app.use('/api/auth', authRoutes);

    // Rutas protegidas (requieren autenticación)
    app.use('/api/transactions', authenticateToken, transactionRoutes);
    app.use('/api/categories', authenticateToken, categoryRoutes);
    app.use('/api/budgets', authenticateToken, budgetRoutes);
    app.use('/api/goals', authenticateToken, goalRoutes);
    app.use('/api/reports', authenticateToken, reportRoutes);
    app.use('/api/ai', authenticateToken, aiRoutes);
    app.use('/api/pdf-analyze', authenticateToken, pdfAnalyzeRoutes);

    // Rutas públicas (sin autenticación) - para modo demo
    // Handlers específicos para rutas públicas sin reutilizar routers con auth
    app.get('/api/public/transactions', async (req, res) => {
        try {
            // Verificar conexión a base de datos
            if (mongoose.connection.readyState !== 1) {
                return res.status(503).json({
                    success: false,
                    error: 'Servicio no disponible',
                    message: 'La base de datos no está disponible temporalmente'
                });
            }

            const {
                page = 1,
                limit = 20,
                type,
                category,
                month,
                year
            } = req.query;

            // Construir filtros para transacciones públicas
            const filters = { userId: null };

            if (type) filters.type = type;
            if (category) filters.category = category;

            // Filtros de fecha
            if (month || year) {
                filters.date = {};
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

            // Aplicar paginación
            const skip = (parseInt(page) - 1) * parseInt(limit);
            const transactions = await Transaction.find(filters)
                .sort({ date: -1 })
                .skip(skip)
                .limit(parseInt(limit))
                .lean();

            // Contar total
            const total = await Transaction.countDocuments(filters);

            res.json({
                success: true,
                data: {
                    transactions,
                    pagination: {
                        page: parseInt(page),
                        limit: parseInt(limit),
                        total,
                        pages: Math.ceil(total / parseInt(limit))
                    }
                }
            });

        } catch (error) {
            console.error('❌ Error obteniendo transacciones públicas:', error);
            res.status(500).json({
                success: false,
                error: 'Error interno del servidor',
                message: 'No se pudieron obtener las transacciones'
            });
        }
    });

    app.post('/api/public/transactions', async (req, res) => {
        try {
            // Verificar conexión a base de datos
            if (mongoose.connection.readyState !== 1) {
                return res.status(503).json({
                    success: false,
                    error: 'Servicio no disponible',
                    message: 'La base de datos no está disponible temporalmente'
                });
            }

            const {
                type,
                amount,
                description,
                category,
                date = new Date(),
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
                message: 'Transacción creada exitosamente',
                data: { transaction }
            });

        } catch (error) {
            console.error('❌ Error creando transacción pública:', error);
            res.status(500).json({
                success: false,
                error: 'Error interno del servidor',
                message: 'No se pudo crear la transacción'
            });
        }
    });

    app.delete('/api/public/transactions/:id', async (req, res) => {
        try {
            // Verificar conexión a base de datos
            if (mongoose.connection.readyState !== 1) {
                return res.status(503).json({
                    success: false,
                    error: 'Servicio no disponible',
                    message: 'La base de datos no está disponible temporalmente'
                });
            }

            const { id } = req.params;

            // Verificar que el ID sea válido
            if (!id || typeof id !== 'string') {
                return res.status(400).json({
                    success: false,
                    error: 'ID inválido',
                    message: 'El ID de la transacción no es válido'
                });
            }

            // Buscar y eliminar la transacción (solo transacciones públicas con userId: null)
            const transaction = await Transaction.findOneAndDelete({
                _id: id,
                userId: null // Solo permitir eliminar transacciones públicas
            });

            if (!transaction) {
                return res.status(404).json({
                    success: false,
                    error: 'Transacción no encontrada',
                    message: 'La transacción especificada no existe o no es pública'
                });
            }

            res.json({
                success: true,
                message: 'Transacción eliminada exitosamente'
            });

            console.log(`🗑️ Transacción pública eliminada: ${transaction.type} - $${transaction.amount} - ${transaction.description}`);

        } catch (error) {
            console.error('❌ Error eliminando transacción pública:', error);

            if (error.name === 'CastError') {
                return res.status(400).json({
                    success: false,
                    error: 'ID inválido',
                    message: 'El ID de la transacción no es válido'
                });
            }

            res.status(500).json({
                success: false,
                error: 'Error interno del servidor',
                message: 'No se pudo eliminar la transacción'
            });
        }
    });

    // Endpoint PUT para transacciones públicas (transferencias)
    app.put('/api/public/transactions', async (req, res) => {
        try {
            // Verificar conexión a base de datos
            if (mongoose.connection.readyState !== 1) {
                return res.status(503).json({
                    success: false,
                    error: 'Servicio no disponible',
                    message: 'La base de datos no está disponible temporalmente'
                });
            }

            console.log('🔄 PUT /api/public/transactions - Request received');
            console.log('📋 Request body:', JSON.stringify(req.body, null, 2));

            const { transactions } = req.body;

            if (!Array.isArray(transactions) || transactions.length === 0) {
                console.log('❌ No transactions array provided');
                return res.status(400).json({
                    success: false,
                    error: 'Datos inválidos',
                    message: 'Debes proporcionar un array de transacciones'
                });
            }

            if (transactions.length > 100) {
                return res.status(400).json({
                    success: false,
                    error: 'Límite excedido',
                    message: 'No puedes actualizar más de 100 transacciones a la vez'
                });
            }

            // Crear transacciones públicas (userId: null)
            const createdTransactions = [];
            const errors = [];

            for (const transactionData of transactions) {
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
                        userId: null, // Usuario público
                        type: transactionData.type,
                        amount: parseFloat(transactionData.amount),
                        description: transactionData.description.trim(),
                        category: transactionData.category || 'Sin categoría',
                        date: new Date(transactionData.date || Date.now()),
                        currency: transactionData.currency || 'UYU',
                        tags: transactionData.tags?.filter(tag => tag.trim()) || [],
                        notes: transactionData.notes?.trim(),
                        status: transactionData.status || 'completed'
                    });

                    // Establecer valores por defecto para moneda
                    transaction.convertedAmount = transaction.amount;
                    transaction.userBaseCurrency = transaction.currency;
                    transaction.exchangeRate = 1;
                    transaction.exchangeRateDate = new Date();

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

            console.log(`✅ ${createdTransactions.length} transacciones públicas creadas/actualizadas`);

            res.status(200).json({
                success: true,
                message: `Se procesaron ${createdTransactions.length} transacciones exitosamente`,
                data: {
                    transactions: createdTransactions.map(t => ({
                        ...t.toObject(),
                        id: t._id.toString()
                    })),
                    created: createdTransactions.length,
                    total: transactions.length,
                    errors: errors.length > 0 ? errors : undefined
                }
            });

        } catch (error) {
            console.error('❌ Error en PUT público de transacciones:', error);
            res.status(500).json({
                success: false,
                error: 'Error interno del servidor',
                message: 'No se pudieron procesar las transacciones'
            });
        }
    });

    // Endpoint PUT para actualizar una transacción pública específica por ID
    app.put('/api/public/transactions/:id', async (req, res) => {
        try {
            // Verificar conexión a base de datos
            if (mongoose.connection.readyState !== 1) {
                return res.status(503).json({
                    success: false,
                    error: 'Servicio no disponible',
                    message: 'La base de datos no está disponible temporalmente'
                });
            }

            const { id } = req.params;
            const updateData = req.body;

            console.log(`🔄 PUT /api/public/transactions/${id} - Actualizando transacción`);
            console.log('📋 Datos de actualización:', JSON.stringify(updateData, null, 2));

            // Buscar transacción existente (usuario público)
            const transaction = await Transaction.findOne({ _id: id, userId: null });

            if (!transaction) {
                console.log('❌ Transacción no encontrada:', id);
                return res.status(404).json({
                    success: false,
                    error: 'Transacción no encontrada',
                    message: 'La transacción especificada no existe'
                });
            }

            // Actualizar campos
            if (updateData.type) transaction.type = updateData.type;
            if (updateData.amount !== undefined) transaction.amount = parseFloat(updateData.amount);
            if (updateData.description) transaction.description = updateData.description.trim();
            if (updateData.category) transaction.category = updateData.category.trim();
            if (updateData.date) transaction.date = new Date(updateData.date);
            if (updateData.currency) transaction.currency = updateData.currency;
            if (updateData.tags) transaction.tags = updateData.tags.filter(tag => tag && tag.trim());
            if (updateData.notes !== undefined) transaction.notes = updateData.notes?.trim();

            // Mantener valores por defecto para transacciones públicas
            transaction.convertedAmount = transaction.amount;
            transaction.userBaseCurrency = transaction.currency;
            transaction.exchangeRate = 1;
            transaction.exchangeRateDate = new Date();

            await transaction.save();

            console.log(`✅ Transacción pública actualizada: ${transaction.type} - $${transaction.amount} - ${transaction.description}`);

            res.json({
                success: true,
                message: 'Transacción actualizada exitosamente',
                data: {
                    transaction: {
                        ...transaction.toObject(),
                        id: transaction._id.toString(),
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
            console.error('❌ Error actualizando transacción pública:', error);

            if (error.name === 'CastError') {
                return res.status(400).json({
                    success: false,
                    error: 'ID inválido',
                    message: 'El ID de la transacción no es válido'
                });
            }

            if (error.name === 'ValidationError') {
                const errors = Object.values(error.errors).map(err => err.message);
                return res.status(400).json({
                    success: false,
                    error: 'Error de validación',
                    details: errors
                });
            }

            res.status(500).json({
                success: false,
                error: 'Error interno del servidor',
                message: 'No se pudo actualizar la transacción'
            });
        }
    });

    // Endpoint de prueba para verificar que PUT funciona
    app.put('/api/test', (req, res) => {
        console.log('🧪 PUT /api/test - Test endpoint called');
        res.json({
            success: true,
            message: 'PUT endpoint is working',
            method: req.method,
            path: req.path,
            body: req.body
        });
    });

    // Rutas públicas específicas para categorías (sin autenticación)
    app.use('/api/public/categories', (req, res, next) => {
        delete req.headers.authorization;
        req.user = null;
        req.userId = null;
        next();
    });
    app.get('/api/public/categories', async (req, res) => {
        try {
            const { type } = req.query;

            // Obtener categorías por defecto del sistema
            const defaultCategories = [
                { name: 'Salario', type: 'income', color: '#27ae60', isDefault: true },
                { name: 'Freelance', type: 'income', color: '#2ecc71', isDefault: true },
                { name: 'Inversiones', type: 'income', color: '#3498db', isDefault: true },
                { name: 'Otros Ingresos', type: 'income', color: '#1abc9c', isDefault: true },
                { name: 'Alimentación', type: 'expense', color: '#e74c3c', isDefault: true },
                { name: 'Transporte', type: 'expense', color: '#f39c12', isDefault: true },
                { name: 'Servicios', type: 'expense', color: '#e67e22', isDefault: true },
                { name: 'Entretenimiento', type: 'expense', color: '#8e44ad', isDefault: true },
                { name: 'Salud', type: 'expense', color: '#2ecc71', isDefault: true },
                { name: 'Educación', type: 'expense', color: '#3498db', isDefault: true },
                { name: 'Ropa', type: 'expense', color: '#e91e63', isDefault: true },
                { name: 'Otros Gastos', type: 'expense', color: '#95a5a6', isDefault: true }
            ];

            // Filtrar por tipo si se especifica
            const filteredCategories = type
                ? defaultCategories.filter(cat => cat.type === type)
                : defaultCategories;

            res.json({
                success: true,
                data: {
                    categories: filteredCategories,
                    message: 'Categorías públicas obtenidas correctamente'
                }
            });

        } catch (error) {
            console.error('❌ Error obteniendo categorías públicas:', error);
            res.status(500).json({
                error: 'Error interno del servidor',
                message: 'No se pudieron obtener las categorías públicas'
            });
        }
    });

    // Ruta pública para obtener tasa de cambio
    app.get('/api/exchange-rates', async (req, res) => {
        try {
            const { from, to } = req.query;

            if (!from || !to) {
                return res.status(400).json({
                    success: false,
                    error: 'Parámetros requeridos: from, to'
                });
            }

            const fromCurr = from.toUpperCase();
            const toCurr = to.toUpperCase();

            if (!['UYU', 'USD'].includes(fromCurr) || !['UYU', 'USD'].includes(toCurr)) {
                return res.status(400).json({
                    success: false,
                    error: 'Monedas no soportadas'
                });
            }

            const rate = await exchangeRateService.getExchangeRate(fromCurr, toCurr);

            res.json({
                success: true,
                data: {
                    from: fromCurr,
                    to: toCurr,
                    rate: rate,
                    timestamp: new Date()
                }
            });

        } catch (error) {
            console.error('❌ Error obteniendo tasa de cambio pública:', error);
            res.status(500).json({
                success: false,
                error: 'Error interno del servidor',
                message: 'No se pudo obtener la tasa de cambio'
            });
        }
    });

    // Rutas públicas para metas
    app.get('/api/public/goals', async (req, res) => {
        try {
            // Obtener metas demo públicas (sin userId)
            const goals = await Goal.find({ userId: null }).limit(20);

            res.json({
                success: true,
                data: {
                    goals: goals,
                    message: 'Metas públicas obtenidas correctamente'
                }
            });

        } catch (error) {
            console.error('❌ Error obteniendo metas públicas:', error);
            res.status(500).json({
                error: 'Error interno del servidor',
                message: 'No se pudieron obtener las metas públicas'
            });
        }
    });

    app.post('/api/public/goals', async (req, res) => {
        try {
            const { name, description, currency, targetAmount, category, priority } = req.body;

            if (!name || !targetAmount || !currency) {
                return res.status(400).json({
                    success: false,
                    error: 'Nombre, monto objetivo y moneda son requeridos'
                });
            }

            // Crear meta demo sin userId
            const newGoal = new Goal({
                userId: null, // Meta demo
                name: name,
                description: description || '',
                currency: currency,
                currentAmount: 0,
                targetAmount: parseFloat(targetAmount),
                category: category || '',
                priority: priority || 'medium',
                status: 'active'
            });

            const savedGoal = await newGoal.save();

            res.status(201).json({
                success: true,
                data: {
                    goal: savedGoal,
                    message: 'Meta creada correctamente'
                }
            });

        } catch (error) {
            console.error('❌ Error creando meta pública:', error);
            res.status(500).json({
                success: false,
                error: 'Error interno del servidor',
                message: 'No se pudo crear la meta'
            });
        }
    });

    // Rutas protegidas de exchange-rates (después de las públicas para que no interfieran)
    app.use('/api/exchange-rates', authenticateToken, exchangeRateRoutes);

    // Middleware para rutas públicas de AI
    app.use('/api/public/ai', (req, res, next) => {
        delete req.headers.authorization;
        req.user = null;
        req.userId = null;
        next();
    }, aiRoutes);
    
    // Ruta de health check
    app.get('/api/health', (req, res) => {
        const dbStatus = mongoose.connection.readyState;
        const dbStatusText = {
            0: 'disconnected',
            1: 'connected',
            2: 'connecting', 
            3: 'disconnecting'
        };
        
        res.json({
            status: dbStatus === 1 ? 'OK' : 'DEGRADED',
            timestamp: new Date().toISOString(),
            uptime: process.uptime(),
            environment: process.env.NODE_ENV || 'development',
            database: {
                status: dbStatusText[dbStatus] || 'unknown',
                readyState: dbStatus
            },
            services: {
                webServer: 'OK',
                database: dbStatus === 1 ? 'OK' : 'UNAVAILABLE',
                staticFiles: 'OK'
            }
        });
    });
    
    console.log('🛣️ Rutas API configuradas');
}

// ==================== RUTAS PARA PÁGINAS ESTÁTICAS ====================

/**
 * Configura rutas para servir páginas específicas del frontend
 */
function setupPageRoutes() {
    // Ruta específica para index - servir Index.html (desde dist/pages)
    app.get('/', (req, res) => {
        res.sendFile(path.join(process.cwd(), 'dist/pages/Index.html'));
    });

    app.get('/index', (req, res) => {
        res.sendFile(path.join(process.cwd(), 'dist/pages/Index.html'));
    });

    app.get('/index.html', (req, res) => {
        res.sendFile(path.join(process.cwd(), 'dist/pages/Index.html'));
    });

    // Ruta específica para finanzas
    app.get('/finanzas', (req, res) => {
        res.sendFile(path.join(process.cwd(), 'dist/pages/finanzas.html'));
    });

    app.get('/finanzas.html', (req, res) => {
        res.sendFile(path.join(process.cwd(), 'dist/pages/finanzas.html'));
    });

    // Rutas para otras páginas

    // Para cualquier otra ruta que no sea API, redirigir a index
    app.get('*', (req, res) => {
        // Si es una ruta de API, devolver 404
        if (req.path.startsWith('/api/')) {
            return res.status(404).json({ error: 'Endpoint no encontrado' });
        }

        // Para cualquier otra ruta del frontend, redirigir al index
        res.redirect('/');
    });
}

// ==================== MANEJO DE ERRORES ====================

/**
 * Configura middleware de manejo de errores
 */
function setupErrorHandling() {
    // Middleware para manejar errores 404
    app.use((req, res, next) => {
        if (req.path.startsWith('/api/')) {
            return res.status(404).json({
                error: 'Endpoint no encontrado',
                path: req.path,
                method: req.method
            });
        }
        next();
    });
    
    // Middleware global de manejo de errores
    app.use((error, req, res, next) => {
        console.error('❌ Error no manejado:', error);
        
        // Determinar tipo de error
        if (error.name === 'ValidationError') {
            return res.status(400).json({
                error: 'Error de validación',
                details: error.message
            });
        }
        
        if (error.name === 'MongoError' && error.code === 11000) {
            return res.status(409).json({
                error: 'Conflicto: El recurso ya existe'
            });
        }
        
        if (error.name === 'JsonWebTokenError') {
            return res.status(401).json({
                error: 'Token inválido'
            });
        }
        
        // Error genérico
        res.status(500).json({
            error: process.env.NODE_ENV === 'production' 
                ? 'Error interno del servidor' 
                : error.message
        });
    });
    
    console.log('🚨 Manejo de errores configurado');
}

// ==================== INICIALIZACIÓN ====================

/**
 * Inicializa el servidor
 */
async function initializeServer() {
    try {
        console.log('🚀 Iniciando servidor Fede Life Finanzas...');
        
        // Conectar a MongoDB (opcional)
        console.log('🔄 Intentando conectar a MongoDB...');
        await connectToMongoDB(); // No usar try/catch aquí, el error se maneja dentro de connectToMongoDB()
        
        // Configurar middleware
        setupSecurityMiddleware();
        setupGeneralMiddleware();
        
        // Configurar rutas
        setupRoutes();
        setupPageRoutes();
        
        // Configurar manejo de errores
        setupErrorHandling();
        
        // Iniciar servidor
        app.listen(PORT, () => {
            console.log(`✅ Servidor corriendo en puerto ${PORT}`);
            console.log(`🌍 Ambiente: ${process.env.NODE_ENV || 'development'}`);
            console.log(`📊 Base de datos: ${mongoose.connection.readyState === 1 ? 'Conectada' : 'Desconectada'}`);
            console.log(`🔗 URL: http://localhost:${PORT}`);
            
            if (process.env.NODE_ENV === 'production') {
                console.log('🚀 Servidor en modo PRODUCCIÓN');
            }
        });
        
    } catch (error) {
        console.error('❌ Error crítico iniciando servidor:', error);
        
        if (process.env.NODE_ENV === 'production') {
            console.log('🚨 Error crítico en producción. Intentando continuar...');
            console.log('📝 Algunos servicios pueden no estar disponibles.');
        } else {
            console.log('⚠️ Error en desarrollo. Revisar configuración.');
        }
        
        // En lugar de salir, intentar al menos servir archivos estáticos
        try {
            app.listen(PORT, () => {
                console.log(`⚠️ Servidor iniciado en modo limitado en puerto ${PORT}`);
                console.log(`🌍 Ambiente: ${process.env.NODE_ENV || 'development'}`);
                console.log(`📊 Base de datos: Desconectada`);
            });
        } catch (finalError) {
            console.error('❌ Error final:', finalError);
            // Solo ahora salir si realmente no podemos hacer nada
            process.exit(1);
        }
    }
}

// ==================== MANEJO DE SEÑALES ====================

/**
 * Maneja señales de terminación del proceso
 */
process.on('SIGTERM', async () => {
    console.log('🛑 Recibida señal SIGTERM, cerrando servidor...');
    try {
        await mongoose.connection.close();
        console.log('✅ Conexión MongoDB cerrada');
    } catch (error) {
        console.error('❌ Error cerrando conexión MongoDB:', error);
    } finally {
        process.exit(0);
    }
});

process.on('SIGINT', async () => {
    console.log('🛑 Recibida señal SIGINT, cerrando servidor...');
    try {
        await mongoose.connection.close();
        console.log('✅ Conexión MongoDB cerrada');
    } catch (error) {
        console.error('❌ Error cerrando conexión MongoDB:', error);
    } finally {
        process.exit(0);
    }
});

// ==================== INICIAR SERVIDOR ====================

// Inicializar servidor
initializeServer();

module.exports = app;
