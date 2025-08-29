/**
 * 🔐 RUTAS DE AUTENTICACIÓN - API
 * 
 * Endpoints para registro, login, logout y gestión de usuarios
 * Incluye validaciones, manejo de errores y respuestas estructuradas
 * Autor: Senior Backend Developer
 */

const express = require('express');
const mongoose = require('mongoose');
const User = require('../models/User');
const { authenticateToken, userRateLimit } = require('../middleware/auth');

const router = express.Router();

// ==================== VALIDACIONES ====================

/**
 * Valida datos de registro
 */
const validateRegistration = (req, res, next) => {
    const { username, email, password, firstName, lastName } = req.body;
    
    const errors = [];
    
    if (!username || username.length < 3) {
        errors.push('El nombre de usuario debe tener al menos 3 caracteres');
    }
    
    if (!email || !email.includes('@')) {
        errors.push('El email debe ser válido');
    }
    
    if (!password || password.length < 6) {
        errors.push('La contraseña debe tener al menos 6 caracteres');
    }
    
    if (!firstName || firstName.trim().length === 0) {
        errors.push('El nombre es requerido');
    }
    
    if (!lastName || lastName.trim().length === 0) {
        errors.push('El apellido es requerido');
    }
    
    if (errors.length > 0) {
        return res.status(400).json({
            error: 'Datos de registro inválidos',
            details: errors
        });
    }
    
    next();
};

/**
 * Valida datos de login
 */
const validateLogin = (req, res, next) => {
    const { identifier, password } = req.body;
    
    if (!identifier || !password) {
        return res.status(400).json({
            error: 'Datos de login requeridos',
            message: 'Debes proporcionar email/usuario y contraseña'
        });
    }
    
    next();
};

// ==================== RUTAS ====================

/**
 * GET /api/auth/health
 * Endpoint de diagnóstico para verificar el estado del sistema
 */

/**
 * GET /api/auth/mongo-debug
 * Endpoint específico para diagnosticar problemas de MongoDB
 */
router.get('/mongo-debug', async (req, res) => {
    try {
        console.log('🔍 Debug de MongoDB iniciado');
        
        const debugInfo = {
            timestamp: new Date().toISOString(),
            mongoose: {
                readyState: mongoose.connection.readyState,
                name: mongoose.connection.name,
                host: mongoose.connection.host,
                port: mongoose.connection.port,
                database: mongoose.connection.db ? mongoose.connection.db.databaseName : null
            },
            environment: {
                NODE_ENV: process.env.NODE_ENV,
                MONGODB_URI_EXISTS: !!process.env.MONGODB_URI,
                MONGODB_URI_PREFIX: process.env.MONGODB_URI ? process.env.MONGODB_URI.substring(0, 30) + '...' : 'No definida'
            }
        };
        
        // Intentar conectar si no está conectado
        if (mongoose.connection.readyState !== 1 && process.env.MONGODB_URI) {
            try {
                console.log('🔄 Intentando conectar a MongoDB...');
                await mongoose.connect(process.env.MONGODB_URI, {
                    useNewUrlParser: true,
                    useUnifiedTopology: true,
                    serverSelectionTimeoutMS: 5000,
                    socketTimeoutMS: 45000,
                });
                debugInfo.connectionAttempt = {
                    status: 'success',
                    message: 'Conexión exitosa'
                };
                console.log('✅ Conexión exitosa');
            } catch (connectError) {
                debugInfo.connectionAttempt = {
                    status: 'error',
                    error: connectError.message,
                    code: connectError.code,
                    name: connectError.name
                };
                console.error('❌ Error en intento de conexión:', connectError.message);
            }
        } else if (mongoose.connection.readyState === 1) {
            debugInfo.connectionAttempt = {
                status: 'already_connected',
                message: 'Ya estaba conectado'
            };
        }
        
        res.json({
            success: true,
            debug: debugInfo
        });
        
    } catch (error) {
        console.error('❌ Error en debug de MongoDB:', error);
        res.status(500).json({
            success: false,
            error: error.message,
            stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
        });
    }
});
router.get('/health', async (req, res) => {
    try {
        console.log('🔍 Health check iniciado');
        
        // Verificar conexión a MongoDB
        const dbStatus = mongoose.connection.readyState === 1 ? 'connected' : 'disconnected';
        console.log('📊 Estado de MongoDB:', dbStatus);
        
        // Verificar variables de entorno
        const envVars = {
            JWT_SECRET: !!process.env.JWT_SECRET,
            MONGODB_URI: !!process.env.MONGODB_URI,
            NODE_ENV: process.env.NODE_ENV || 'development'
        };
        console.log('🔧 Variables de entorno:', envVars);
        
        // Información detallada de MongoDB
        const mongoInfo = {
            readyState: mongoose.connection.readyState,
            name: mongoose.connection.name,
            host: mongoose.connection.host,
            port: mongoose.connection.port,
            database: mongoose.connection.db ? mongoose.connection.db.databaseName : null
        };
        
        // Intentar conectar si no está conectado
        let connectionAttempt = null;
        if (dbStatus === 'disconnected' && process.env.MONGODB_URI) {
            try {
                console.log('🔄 Intentando conectar a MongoDB...');
                await mongoose.connect(process.env.MONGODB_URI, {
                    useNewUrlParser: true,
                    useUnifiedTopology: true,
                    serverSelectionTimeoutMS: 5000,
                    socketTimeoutMS: 45000,
                });
                connectionAttempt = 'success';
                console.log('✅ Conexión exitosa');
            } catch (connectError) {
                connectionAttempt = {
                    error: connectError.message,
                    code: connectError.code
                };
                console.error('❌ Error en intento de conexión:', connectError.message);
            }
        }
        
        res.json({
            success: true,
            timestamp: new Date().toISOString(),
            database: {
                status: dbStatus,
                name: mongoose.connection.name,
                details: mongoInfo,
                connectionAttempt: connectionAttempt
            },
            environment: envVars,
            message: 'Sistema de autenticación funcionando'
        });
        
    } catch (error) {
        console.error('❌ Error en health check:', error);
        res.status(500).json({
            success: false,
            error: error.message,
            stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
        });
    }
});

/**
 * POST /api/auth/register
 * Registra un nuevo usuario
 */
router.post('/register', validateRegistration, async (req, res) => {
    try {
        console.log('🔍 Registro iniciado con datos:', { username: req.body.username, email: req.body.email });
        
        const { username, email, password, firstName, lastName, currency = 'UYU' } = req.body;
        
        // Verificar si el usuario ya existe
        const existingUser = await User.findByEmailOrUsername(email);
        if (existingUser) {
            return res.status(409).json({
                error: 'Usuario ya existe',
                message: 'Ya existe una cuenta con este email o nombre de usuario'
            });
        }
        
        // Crear nuevo usuario
        const user = new User({
            username: username.toLowerCase(),
            email: email.toLowerCase(),
            password,
            firstName: firstName.trim(),
            lastName: lastName.trim(),
            currency
        });
        
        await user.save();
        
        // Generar token de autenticación
        const token = user.generateAuthToken();
        
        // Actualizar último login
        await user.updateLastLogin();
        
        // Respuesta exitosa
        res.status(201).json({
            success: true,
            message: 'Usuario registrado exitosamente',
            data: {
                user: {
                    id: user._id,
                    username: user.username,
                    email: user.email,
                    firstName: user.firstName,
                    lastName: user.lastName,
                    fullName: user.fullName,
                    initials: user.initials,
                    currency: user.currency,
                    isEmailVerified: user.isEmailVerified,
                    createdAt: user.createdAt
                },
                token,
                expiresIn: '7d'
            }
        });
        
        console.log(`✅ Nuevo usuario registrado: ${user.username} (${user.email})`);
        
    } catch (error) {
        console.error('❌ Error en registro:', error);
        console.error('❌ Stack trace:', error.stack);
        
        if (error.code === 11000) {
            const field = Object.keys(error.keyPattern)[0];
            return res.status(409).json({
                error: 'Datos duplicados',
                message: `Ya existe un usuario con este ${field === 'email' ? 'email' : 'nombre de usuario'}`
            });
        }
        
        if (error.name === 'ValidationError') {
            const errors = Object.values(error.errors).map(err => err.message);
            return res.status(400).json({
                error: 'Error de validación',
                details: errors
            });
        }
        
        res.status(500).json({
            error: 'Error interno del servidor',
            message: 'No se pudo registrar el usuario'
        });
    }
});

/**
 * POST /api/auth/login
 * Inicia sesión de un usuario
 */
router.post('/login', validateLogin, async (req, res) => {
    try {
        console.log('🔍 Login iniciado con identifier:', req.body.identifier);
        
        const { identifier, password } = req.body;
        
        // Buscar usuario por email o username
        const user = await User.findByEmailOrUsername(identifier);
        
        if (!user) {
            return res.status(401).json({
                error: 'Credenciales inválidas',
                message: 'Email/usuario o contraseña incorrectos'
            });
        }
        
        // Verificar si la cuenta está activa
        if (!user.isActive) {
            return res.status(401).json({
                error: 'Cuenta desactivada',
                message: 'Tu cuenta ha sido desactivada. Contacta al administrador.'
            });
        }
        
        // Verificar contraseña
        const isPasswordValid = await user.comparePassword(password);
        
        if (!isPasswordValid) {
            return res.status(401).json({
                error: 'Credenciales inválidas',
                message: 'Email/usuario o contraseña incorrectos'
            });
        }
        
        // Generar token de autenticación
        const token = user.generateAuthToken();
        
        // Actualizar último login
        await user.updateLastLogin();
        
        // Respuesta exitosa
        res.json({
            success: true,
            message: 'Inicio de sesión exitoso',
            data: {
                user: {
                    id: user._id,
                    username: user.username,
                    email: user.email,
                    firstName: user.firstName,
                    lastName: user.lastName,
                    fullName: user.fullName,
                    initials: user.initials,
                    currency: user.currency,
                    isEmailVerified: user.isEmailVerified,
                    lastLogin: user.lastLogin,
                    createdAt: user.createdAt
                },
                token,
                expiresIn: '7d'
            }
        });
        
        console.log(`✅ Usuario logueado: ${user.username}`);
        
    } catch (error) {
        console.error('❌ Error en login:', error);
        
        res.status(500).json({
            error: 'Error interno del servidor',
            message: 'No se pudo procesar el inicio de sesión'
        });
    }
});

/**
 * POST /api/auth/logout
 * Cierra sesión del usuario (opcional, ya que JWT es stateless)
 */
router.post('/logout', authenticateToken, async (req, res) => {
    try {
        // En un sistema JWT stateless, el logout se maneja en el cliente
        // Aquí podrías implementar una blacklist de tokens si es necesario
        
        res.json({
            success: true,
            message: 'Sesión cerrada exitosamente'
        });
        
        console.log(`✅ Usuario deslogueado: ${req.user.username}`);
        
    } catch (error) {
        console.error('❌ Error en logout:', error);
        
        res.status(500).json({
            error: 'Error interno del servidor',
            message: 'No se pudo procesar el cierre de sesión'
        });
    }
});

/**
 * GET /api/auth/me
 * Obtiene información del usuario autenticado
 */
router.get('/me', authenticateToken, async (req, res) => {
    try {
        const user = req.user;
        
        res.json({
            success: true,
            data: {
                user: {
                    id: user._id,
                    username: user.username,
                    email: user.email,
                    firstName: user.firstName,
                    lastName: user.lastName,
                    fullName: user.fullName,
                    initials: user.initials,
                    currency: user.currency,
                    timezone: user.timezone,
                    isEmailVerified: user.isEmailVerified,
                    isActive: user.isActive,
                    lastLogin: user.lastLogin,
                    createdAt: user.createdAt,
                    updatedAt: user.updatedAt
                }
            }
        });
        
    } catch (error) {
        console.error('❌ Error obteniendo perfil:', error);
        
        res.status(500).json({
            error: 'Error interno del servidor',
            message: 'No se pudo obtener la información del usuario'
        });
    }
});

/**
 * PUT /api/auth/profile
 * Actualiza el perfil del usuario
 */
router.put('/profile', authenticateToken, async (req, res) => {
    try {
        const { firstName, lastName, currency, timezone } = req.body;
        const user = req.user;
        
        // Campos permitidos para actualizar
        const updates = {};
        
        if (firstName && firstName.trim()) {
            updates.firstName = firstName.trim();
        }
        
        if (lastName && lastName.trim()) {
            updates.lastName = lastName.trim();
        }
        
        if (currency && ['UYU', 'USD', 'EUR', 'ARS'].includes(currency)) {
            updates.currency = currency;
        }
        
        if (timezone) {
            updates.timezone = timezone;
        }
        
        if (Object.keys(updates).length === 0) {
            return res.status(400).json({
                error: 'Datos inválidos',
                message: 'No se proporcionaron datos válidos para actualizar'
            });
        }
        
        // Actualizar usuario
        const updatedUser = await User.findByIdAndUpdate(
            user._id,
            updates,
            { new: true, runValidators: true }
        ).select('-password');
        
        res.json({
            success: true,
            message: 'Perfil actualizado exitosamente',
            data: {
                user: {
                    id: updatedUser._id,
                    username: updatedUser.username,
                    email: updatedUser.email,
                    firstName: updatedUser.firstName,
                    lastName: updatedUser.lastName,
                    fullName: updatedUser.fullName,
                    initials: updatedUser.initials,
                    currency: updatedUser.currency,
                    timezone: updatedUser.timezone,
                    isEmailVerified: updatedUser.isEmailVerified,
                    isActive: updatedUser.isActive,
                    lastLogin: updatedUser.lastLogin,
                    createdAt: updatedUser.createdAt,
                    updatedAt: updatedUser.updatedAt
                }
            }
        });
        
        console.log(`✅ Perfil actualizado: ${updatedUser.username}`);
        
    } catch (error) {
        console.error('❌ Error actualizando perfil:', error);
        
        if (error.name === 'ValidationError') {
            const errors = Object.values(error.errors).map(err => err.message);
            return res.status(400).json({
                error: 'Error de validación',
                details: errors
            });
        }
        
        res.status(500).json({
            error: 'Error interno del servidor',
            message: 'No se pudo actualizar el perfil'
        });
    }
});

/**
 * PUT /api/auth/password
 * Cambia la contraseña del usuario
 */
router.put('/password', authenticateToken, async (req, res) => {
    try {
        const { currentPassword, newPassword } = req.body;
        const user = req.user;
        
        if (!currentPassword || !newPassword) {
            return res.status(400).json({
                error: 'Datos requeridos',
                message: 'Debes proporcionar la contraseña actual y la nueva contraseña'
            });
        }
        
        if (newPassword.length < 6) {
            return res.status(400).json({
                error: 'Contraseña inválida',
                message: 'La nueva contraseña debe tener al menos 6 caracteres'
            });
        }
        
        // Verificar contraseña actual
        const isCurrentPasswordValid = await user.comparePassword(currentPassword);
        
        if (!isCurrentPasswordValid) {
            return res.status(401).json({
                error: 'Contraseña incorrecta',
                message: 'La contraseña actual es incorrecta'
            });
        }
        
        // Actualizar contraseña
        user.password = newPassword;
        await user.save();
        
        res.json({
            success: true,
            message: 'Contraseña actualizada exitosamente'
        });
        
        console.log(`✅ Contraseña actualizada: ${user.username}`);
        
    } catch (error) {
        console.error('❌ Error cambiando contraseña:', error);
        
        res.status(500).json({
            error: 'Error interno del servidor',
            message: 'No se pudo cambiar la contraseña'
        });
    }
});

/**
 * PUT /api/auth/ai-key
 * Actualiza la API key de IA del usuario
 */
router.put('/ai-key', authenticateToken, async (req, res) => {
    try {
        const { aiApiKey } = req.body;
        const user = req.user;
        
        if (!aiApiKey) {
            return res.status(400).json({
                error: 'API Key requerida',
                message: 'Debes proporcionar una API key válida'
            });
        }
        
        // Actualizar API key
        user.aiApiKey = aiApiKey;
        await user.save();
        
        res.json({
            success: true,
            message: 'API Key de IA actualizada exitosamente'
        });
        
        console.log(`✅ API Key actualizada: ${user.username}`);
        
    } catch (error) {
        console.error('❌ Error actualizando API key:', error);
        
        res.status(500).json({
            error: 'Error interno del servidor',
            message: 'No se pudo actualizar la API key'
        });
    }
});

/**
 * DELETE /api/auth/account
 * Elimina la cuenta del usuario
 */
router.delete('/account', authenticateToken, async (req, res) => {
    try {
        const { password } = req.body;
        const user = req.user;
        
        if (!password) {
            return res.status(400).json({
                error: 'Contraseña requerida',
                message: 'Debes confirmar tu contraseña para eliminar la cuenta'
            });
        }
        
        // Verificar contraseña
        const isPasswordValid = await user.comparePassword(password);
        
        if (!isPasswordValid) {
            return res.status(401).json({
                error: 'Contraseña incorrecta',
                message: 'La contraseña es incorrecta'
            });
        }
        
        // Eliminar usuario
        await User.findByIdAndDelete(user._id);
        
        res.json({
            success: true,
            message: 'Cuenta eliminada exitosamente'
        });
        
        console.log(`🗑️ Cuenta eliminada: ${user.username}`);
        
    } catch (error) {
        console.error('❌ Error eliminando cuenta:', error);
        
        res.status(500).json({
            error: 'Error interno del servidor',
            message: 'No se pudo eliminar la cuenta'
        });
    }
});

/**
 * POST /api/auth/refresh
 * Refresca el token de autenticación
 */
router.post('/refresh', authenticateToken, async (req, res) => {
    try {
        const user = req.user;
        
        // Generar nuevo token
        const newToken = user.generateAuthToken();
        
        res.json({
            success: true,
            message: 'Token refrescado exitosamente',
            data: {
                token: newToken,
                expiresIn: '7d'
            }
        });
        
        console.log(`🔄 Token refrescado: ${user.username}`);
        
    } catch (error) {
        console.error('❌ Error refrescando token:', error);
        
        res.status(500).json({
            error: 'Error interno del servidor',
            message: 'No se pudo refrescar el token'
        });
    }
});

// ==================== EXPORTAR ROUTER ====================

module.exports = router;
