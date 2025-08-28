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

// Importar rutas
const authRoutes = require('./routes/auth');
const transactionRoutes = require('./routes/transactions');
const categoryRoutes = require('./routes/categories');
const budgetRoutes = require('./routes/budgets');
const goalRoutes = require('./routes/goals');
const reportRoutes = require('./routes/reports');
const aiRoutes = require('./routes/ai');
const exchangeRateRoutes = require('./routes/exchangeRates');

// Importar middleware de autenticación
const { authenticateToken } = require('./middleware/auth');

// ==================== CONFIGURACIÓN ====================

const app = express();
const PORT = process.env.PORT || 3000;
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/fede-life-finanzas';

// Debug: Mostrar variables de entorno (sin mostrar valores sensibles)
console.log('🔍 Variables de entorno:');
console.log('NODE_ENV:', process.env.NODE_ENV);
console.log('PORT:', process.env.PORT);
console.log('MONGODB_URI existe:', !!process.env.MONGODB_URI);
console.log('MONGODB_URI comienza con:', process.env.MONGODB_URI ? process.env.MONGODB_URI.substring(0, 20) + '...' : 'No definida');

// ==================== CONEXIÓN A MONGODB ====================

/**
 * Conecta a MongoDB con manejo de errores y reconexión automática
 */
async function connectToMongoDB() {
    try {
        await mongoose.connect(MONGODB_URI, {
            useNewUrlParser: true,
            useUnifiedTopology: true,
            serverSelectionTimeoutMS: 5000,
            socketTimeoutMS: 45000,
        });
        
        console.log('✅ Conectado a MongoDB exitosamente');
        console.log(`📊 Base de datos: ${mongoose.connection.name}`);
        
        // Configurar eventos de conexión
        mongoose.connection.on('error', (err) => {
            console.error('❌ Error de conexión MongoDB:', err);
        });
        
        mongoose.connection.on('disconnected', () => {
            console.log('⚠️ Desconectado de MongoDB');
        });
        
        mongoose.connection.on('reconnected', () => {
            console.log('🔄 Reconectado a MongoDB');
        });
        
    } catch (error) {
        console.error('❌ Error conectando a MongoDB:', error);
        console.log('⚠️ Continuando sin MongoDB...');
        // No salir del proceso, continuar sin base de datos
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
                scriptSrc: ["'self'", "https://cdnjs.cloudflare.com", "https://cdn.jsdelivr.net"],
                imgSrc: ["'self'", "data:", "https:"],
                fontSrc: ["'self'", "https://cdnjs.cloudflare.com"],
                connectSrc: ["'self'", "https://generativelanguage.googleapis.com", "https://api.exchangerate.host"]
            }
        }
    }));
    
    // Rate limiting para prevenir ataques
    const limiter = rateLimit({
        windowMs: 15 * 60 * 1000, // 15 minutos
        max: 100, // máximo 100 requests por ventana
        message: {
            error: 'Demasiadas requests desde esta IP, intenta de nuevo en 15 minutos'
        },
        standardHeaders: true,
        legacyHeaders: false
    });
    
    app.use('/api/', limiter);
    
    // CORS configurado para producción
    app.use(cors({
        origin: true, // Permitir todos los orígenes en desarrollo
        credentials: true,
        methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
        allowedHeaders: ['Content-Type', 'Authorization']
    }));
    
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
    
    // Servir archivos estáticos desde dist y dist/pages
    app.use(express.static(path.join(__dirname, '../dist')));
    app.use('/pages', express.static(path.join(__dirname, '../dist/pages')));
    
    console.log('⚙️ Middleware general configurado');
}

// ==================== RUTAS API ====================

/**
 * Configura todas las rutas de la API
 */
function setupRoutes() {
    // Rutas públicas
    app.use('/api/auth', authRoutes);
    
    // Rutas protegidas (requieren autenticación)
    app.use('/api/transactions', authenticateToken, transactionRoutes);
    app.use('/api/categories', authenticateToken, categoryRoutes);
    app.use('/api/budgets', authenticateToken, budgetRoutes);
    app.use('/api/goals', authenticateToken, goalRoutes);
    app.use('/api/reports', authenticateToken, reportRoutes);
    app.use('/api/ai', authenticateToken, aiRoutes);
    app.use('/api/exchange-rates', authenticateToken, exchangeRateRoutes);
    
    // Ruta de health check
    app.get('/api/health', (req, res) => {
        res.json({
            status: 'OK',
            timestamp: new Date().toISOString(),
            uptime: process.uptime(),
            environment: process.env.NODE_ENV || 'development',
            database: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected'
        });
    });
    
    console.log('🛣️ Rutas API configuradas');
}

// ==================== RUTA PARA SPA (SINGLE PAGE APPLICATION) ====================

/**
 * Configura ruta para servir la aplicación frontend
 */
function setupSPARoute() {
    // Para todas las rutas que no sean API, servir el index.html
    app.get('*', (req, res) => {
        // Si es una ruta de API, devolver 404
        if (req.path.startsWith('/api/')) {
            return res.status(404).json({ error: 'Endpoint no encontrado' });
        }
        
        // Para rutas del frontend, servir el finanzas.html como página principal
        res.sendFile(path.join(__dirname, '../dist/pages/finanzas.html'));
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
        try {
            await connectToMongoDB();
        } catch (dbError) {
            console.log('⚠️ MongoDB no disponible, continuando sin base de datos...');
        }
        
        // Configurar middleware
        setupSecurityMiddleware();
        setupGeneralMiddleware();
        
        // Configurar rutas
        setupRoutes();
        setupSPARoute();
        
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
        console.error('❌ Error iniciando servidor:', error);
        process.exit(1);
    }
}

// ==================== MANEJO DE SEÑALES ====================

/**
 * Maneja señales de terminación del proceso
 */
process.on('SIGTERM', () => {
    console.log('🛑 Recibida señal SIGTERM, cerrando servidor...');
    mongoose.connection.close(() => {
        console.log('✅ Conexión MongoDB cerrada');
        process.exit(0);
    });
});

process.on('SIGINT', () => {
    console.log('🛑 Recibida señal SIGINT, cerrando servidor...');
    mongoose.connection.close(() => {
        console.log('✅ Conexión MongoDB cerrada');
        process.exit(0);
    });
});

// ==================== INICIAR SERVIDOR ====================

// Inicializar servidor
initializeServer();

module.exports = app;
