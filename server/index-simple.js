/**
 * 🚀 SERVIDOR SIMPLIFICADO - FEDE LIFE FINANZAS
 * 
 * Versión simplificada que funciona con endpoints públicos
 * Incluye autenticación opcional y modo demo
 * Autor: Senior Backend Developer
 */

const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
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

console.log('🚀 Iniciando servidor simplificado...');

// ==================== MIDDLEWARE ====================

// Seguridad básica
app.use(helmet({
    contentSecurityPolicy: false, // Deshabilitar CSP para desarrollo
    crossOriginEmbedderPolicy: false
}));

// CORS
app.use(cors({
    origin: ['http://localhost:3000', 'http://localhost:5000', 'http://127.0.0.1:3000', 'http://127.0.0.1:5000'],
    credentials: true
}));

// Compresión
app.use(compression());

// Parsear JSON y URL encoded
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Servir archivos estáticos
app.use(express.static(path.join(__dirname, '../pages')));
app.use('/funciones', express.static(path.join(__dirname, '../funciones')));

// ==================== CONEXIÓN A MONGODB ====================

async function connectToMongoDB() {
    try {
        console.log('🔗 Conectando a MongoDB...');
        
        const mongoOptions = {
            maxPoolSize: 10,
            serverSelectionTimeoutMS: 10000,
            socketTimeoutMS: 45000,
            retryWrites: true,
            w: 'majority'
        };
        
        await mongoose.connect(MONGODB_URI, mongoOptions);
        console.log('✅ Conectado a MongoDB exitosamente');
        
    } catch (error) {
        console.error('❌ Error conectando a MongoDB:', error);
        console.log('⚠️ Continuando sin base de datos...');
    }
}

// ==================== RUTAS ====================

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

// Rutas públicas (sin autenticación) - PARA MODO DEMO
console.log('🛣️ Configurando rutas públicas...');

// Transacciones públicas
app.post('/api/public/transactions/public', async (req, res) => {
    try {
        console.log('📝 Transacción pública recibida:', req.body);
        
        const { type, amount, description, category, date, paymentMethod } = req.body;
        
        // Validaciones básicas
        if (!type || !amount || !description || !category || !paymentMethod) {
            return res.status(400).json({
                error: 'Datos incompletos',
                message: 'Todos los campos son requeridos'
            });
        }
        
        // Crear transacción demo
        const transaction = {
            id: 'demo_' + Date.now(),
            userId: 'demo_user_public',
            type,
            amount: parseFloat(amount),
            description: description.trim(),
            category: category.trim(),
            date: new Date(date),
            paymentMethod,
            currency: 'UYU',
            status: 'completed',
            createdAt: new Date()
        };
        
        res.status(201).json({
            success: true,
            message: 'Transacción creada exitosamente (modo demo)',
            data: { transaction }
        });
        
    } catch (error) {
        console.error('❌ Error en transacción pública:', error);
        res.status(500).json({
            error: 'Error interno del servidor',
            message: 'No se pudo crear la transacción'
        });
    }
});

// Categorías públicas
app.get('/api/public/categories/public', async (req, res) => {
    try {
        console.log('🏷️ Categorías públicas solicitadas');
        
        const defaultCategories = [
            { id: 'cat_1', name: 'Salario', type: 'income', color: '#27ae60', userId: 'demo_user_public' },
            { id: 'cat_2', name: 'Freelance', type: 'income', color: '#2ecc71', userId: 'demo_user_public' },
            { id: 'cat_3', name: 'Inversiones', type: 'income', color: '#3498db', userId: 'demo_user_public' },
            { id: 'cat_4', name: 'Comida', type: 'expense', color: '#e74c3c', userId: 'demo_user_public' },
            { id: 'cat_5', name: 'Transporte', type: 'expense', color: '#f39c12', userId: 'demo_user_public' },
            { id: 'cat_6', name: 'Entretenimiento', type: 'expense', color: '#9b59b6', userId: 'demo_user_public' },
            { id: 'cat_7', name: 'Servicios', type: 'expense', color: '#34495e', userId: 'demo_user_public' }
        ];
        
        res.json({
            success: true,
            data: { categories: defaultCategories }
        });
        
    } catch (error) {
        console.error('❌ Error en categorías públicas:', error);
        res.status(500).json({
            error: 'Error interno del servidor',
            message: 'No se pudieron obtener las categorías'
        });
    }
});

// IA pública para PDFs
app.post('/api/public/ai/analyze-pdf', async (req, res) => {
    try {
        console.log('🤖 Análisis de PDF público solicitado');
        
        // Simular análisis de PDF
        const mockAnalysis = {
            expenses: [
                { description: 'Gasto identificado en PDF', amount: 1500, category: 'General', date: new Date().toISOString().split('T')[0] },
                { description: 'Otro gasto del PDF', amount: 800, category: 'General', date: new Date().toISOString().split('T')[0] }
            ],
            summary: {
                totalExpenses: 2300,
                expenseCount: 2,
                categories: ['General']
            }
        };
        
        res.json({
            success: true,
            message: 'PDF analizado exitosamente (modo demo)',
            data: {
                fileName: 'demo.pdf',
                analysis: mockAnalysis
            }
        });
        
    } catch (error) {
        console.error('❌ Error en análisis de PDF público:', error);
        res.status(500).json({
            error: 'Error interno del servidor',
            message: 'No se pudo analizar el PDF'
        });
    }
});

// Rutas protegidas (requieren autenticación)
console.log('🔐 Configurando rutas protegidas...');
app.use('/api/auth', authRoutes);
app.use('/api/transactions', authenticateToken, transactionRoutes);
app.use('/api/categories', authenticateToken, categoryRoutes);
app.use('/api/budgets', authenticateToken, budgetRoutes);
app.use('/api/goals', authenticateToken, goalRoutes);
app.use('/api/reports', authenticateToken, reportRoutes);
app.use('/api/ai', authenticateToken, aiRoutes);
app.use('/api/exchange-rates', authenticateToken, exchangeRateRoutes);

// Ruta para SPA
app.get('*', (req, res) => {
    if (req.path.startsWith('/api/')) {
        return res.status(404).json({ error: 'Endpoint no encontrado' });
    }
    res.sendFile(path.join(__dirname, '../pages/finanzas.html'));
});

// ==================== MANEJO DE ERRORES ====================

app.use((error, req, res, next) => {
    console.error('❌ Error no manejado:', error);
    res.status(500).json({
        error: 'Error interno del servidor',
        message: process.env.NODE_ENV === 'production' ? 'Error interno' : error.message
    });
});

// ==================== INICIAR SERVIDOR ====================

async function startServer() {
    try {
        // Conectar a MongoDB
        await connectToMongoDB();
        
        // Iniciar servidor
        app.listen(PORT, () => {
            console.log(`✅ Servidor simplificado corriendo en puerto ${PORT}`);
            console.log(`🌍 Ambiente: ${process.env.NODE_ENV || 'development'}`);
            console.log(`🔗 URL: http://localhost:${PORT}`);
            console.log(`📝 POST /api/public/transactions/public`);
            console.log(`🏷️ GET /api/public/categories/public`);
            console.log(`🤖 POST /api/public/ai/analyze-pdf`);
            console.log(`🔐 Rutas protegidas disponibles en /api/*`);
        });
        
    } catch (error) {
        console.error('❌ Error iniciando servidor:', error);
        process.exit(1);
    }
}

// Manejar señales de terminación
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

// Iniciar servidor
startServer();

module.exports = app;
