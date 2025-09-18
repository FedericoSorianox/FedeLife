/**
 * 🔐 MIDDLEWARE DE AUTENTICACIÓN - JWT
 * 
 * Middleware para verificar tokens JWT y proteger rutas de la API
 * Incluye validación de tokens, manejo de errores y verificación de permisos
 * Autor: Senior Backend Developer
 */

const jwt = require('jsonwebtoken');
const User = require('../models/User');

// ==================== CONFIGURACIÓN ====================

const JWT_SECRET = process.env.JWT_SECRET || 'fede-life-secret-key';

// Configuración de expiración JWT
const JWT_NO_EXPIRE = process.env.JWT_NO_EXPIRE === 'true' ||
                     (typeof window !== 'undefined' && window.LOCAL_CONFIG?.JWT_NO_EXPIRE);

// ==================== MIDDLEWARE PRINCIPAL ====================

/**
 * Middleware de autenticación JWT
 * Verifica el token en el header Authorization y agrega el usuario al request
 */
const authenticateToken = async (req, res, next) => {
    try {
        // Obtener token del header Authorization
        const authHeader = req.headers.authorization;
        const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN
        
        if (!token) {
            return res.status(401).json({
                error: 'Token de acceso requerido',
                message: 'Debes incluir un token JWT válido en el header Authorization'
            });
        }
        
        // Verificar y decodificar el token
        let decoded;
        if (JWT_NO_EXPIRE) {
            // Verificar sin expiración (para desarrollo)
            decoded = jwt.verify(token, JWT_SECRET, { ignoreExpiration: true });
            console.log('🔓 Token verificado sin verificar expiración (modo desarrollo)');
        } else {
            // Verificación normal con expiración
            decoded = jwt.verify(token, JWT_SECRET);
        }

        // Verificar conexión a base de datos antes de hacer consultas
        const mongoose = require('mongoose');
        if (mongoose.connection.readyState !== 1) {
            return res.status(503).json({
                error: 'Servicio no disponible',
                message: 'La base de datos no está disponible temporalmente'
            });
        }

        // Buscar el usuario en la base de datos
        const user = await User.findById(decoded.id).select('-password');
        
        if (!user) {
            return res.status(401).json({
                error: 'Usuario no encontrado',
                message: 'El token corresponde a un usuario que ya no existe'
            });
        }
        
        // Verificar si el usuario está activo
        if (!user.isActive) {
            return res.status(401).json({
                error: 'Cuenta desactivada',
                message: 'Tu cuenta ha sido desactivada. Contacta al administrador.'
            });
        }
        
        // Verificar si la contraseña fue cambiada después de emitir el token
        if (user.changedPasswordAfter(decoded.iat)) {
            return res.status(401).json({
                error: 'Token inválido',
                message: 'Tu contraseña fue cambiada recientemente. Inicia sesión nuevamente.'
            });
        }
        
        // Agregar usuario al request
        req.user = user;
        req.userId = user._id;
        
        next();
        
    } catch (error) {
        console.error('❌ Error en autenticación:', error);
        
        if (error.name === 'JsonWebTokenError') {
            return res.status(401).json({
                error: 'Token inválido',
                message: 'El token proporcionado no es válido'
            });
        }
        
        if (error.name === 'TokenExpiredError') {
            return res.status(401).json({
                error: 'Token expirado',
                message: 'Tu sesión ha expirado. Inicia sesión nuevamente.'
            });
        }
        
        return res.status(500).json({
            error: 'Error de autenticación',
            message: 'Error interno del servidor durante la autenticación'
        });
    }
};

// ==================== MIDDLEWARE OPCIONAL ====================

/**
 * Middleware de autenticación opcional
 * Similar al anterior pero no falla si no hay token
 * Útil para rutas que pueden funcionar con o sin autenticación
 */
const optionalAuth = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        const token = authHeader && authHeader.split(' ')[1];
        
        if (!token) {
            // No hay token, continuar sin usuario
            req.user = null;
            req.userId = null;
            return next();
        }
        
        // Verificar token si existe
        const decoded = jwt.verify(token, JWT_SECRET);
        const user = await User.findById(decoded.id).select('-password');
        
        if (user && user.isActive && !user.changedPasswordAfter(decoded.iat)) {
            req.user = user;
            req.userId = user._id;
        } else {
            req.user = null;
            req.userId = null;
        }
        
        next();
        
    } catch (error) {
        // Si hay error con el token, continuar sin usuario
        req.user = null;
        req.userId = null;
        next();
    }
};

// ==================== MIDDLEWARE DE ROLES ====================

/**
 * Middleware para verificar roles específicos
 * @param {Array} roles - Roles permitidos
 */
const requireRole = (roles) => {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({
                error: 'Autenticación requerida',
                message: 'Debes estar autenticado para acceder a este recurso'
            });
        }
        
        // Por ahora, todos los usuarios tienen el mismo rol
        // Puedes expandir esto agregando un campo 'role' al modelo User
        if (!roles.includes('user')) {
            return res.status(403).json({
                error: 'Acceso denegado',
                message: 'No tienes permisos para acceder a este recurso'
            });
        }
        
        next();
    };
};

// ==================== MIDDLEWARE DE RATE LIMITING POR USUARIO ====================

/**
 * Middleware para limitar requests por usuario
 * @param {number} maxRequests - Máximo número de requests
 * @param {number} windowMs - Ventana de tiempo en milisegundos
 */
const userRateLimit = (maxRequests = 100, windowMs = 15 * 60 * 1000) => {
    const userRequests = new Map();
    
    return (req, res, next) => {
        if (!req.user) {
            return next();
        }
        
        const userId = req.user._id.toString();
        const now = Date.now();
        
        // Limpiar requests antiguos
        if (userRequests.has(userId)) {
            const userData = userRequests.get(userId);
            userData.requests = userData.requests.filter(time => now - time < windowMs);
            
            if (userData.requests.length >= maxRequests) {
                return res.status(429).json({
                    error: 'Demasiadas requests',
                    message: `Has excedido el límite de ${maxRequests} requests por ${windowMs / 60000} minutos`
                });
            }
            
            userData.requests.push(now);
        } else {
            userRequests.set(userId, { requests: [now] });
        }
        
        next();
    };
};

// ==================== MIDDLEWARE DE LOGGING ====================

/**
 * Middleware para logging de requests autenticados
 */
const authLogging = (req, res, next) => {
    const startTime = Date.now();
    
    // Log al final de la request
    res.on('finish', () => {
        const duration = Date.now() - startTime;
        const user = req.user ? req.user.username : 'anonymous';
        const method = req.method;
        const path = req.path;
        const status = res.statusCode;
        
        console.log(`🔐 [AUTH] ${method} ${path} - ${user} - ${status} - ${duration}ms`);
    });
    
    next();
};

// ==================== MIDDLEWARE DE VALIDACIÓN DE DATOS ====================

/**
 * Middleware para validar que el usuario puede acceder a sus propios datos
 * @param {string} paramName - Nombre del parámetro que contiene el ID del usuario
 */
const validateOwnership = (paramName = 'userId') => {
    return (req, res, next) => {
        const resourceUserId = req.params[paramName] || req.body[paramName];
        
        if (!resourceUserId) {
            return res.status(400).json({
                error: 'ID de usuario requerido',
                message: 'Debes especificar el ID del usuario'
            });
        }
        
        if (resourceUserId !== req.user._id.toString()) {
            return res.status(403).json({
                error: 'Acceso denegado',
                message: 'Solo puedes acceder a tus propios datos'
            });
        }
        
        next();
    };
};

// ==================== MIDDLEWARE DE REFRESH TOKEN ====================

/**
 * Middleware para verificar si el token necesita ser refrescado
 * @param {number} refreshThreshold - Umbral en días para refrescar token
 */
const checkTokenRefresh = (refreshThreshold = 1) => {
    return (req, res, next) => {
        if (!req.user) {
            return next();
        }
        
        try {
            const authHeader = req.headers.authorization;
            const token = authHeader && authHeader.split(' ')[1];
            
            if (!token) {
                return next();
            }
            
            const decoded = jwt.decode(token);
            const tokenExp = new Date(decoded.exp * 1000);
            const now = new Date();
            const daysUntilExpiry = (tokenExp - now) / (1000 * 60 * 60 * 24);
            
            if (daysUntilExpiry <= refreshThreshold) {
                // Generar nuevo token
                const newToken = req.user.generateAuthToken();
                
                // Agregar header para indicar que se debe actualizar el token
                res.set('X-Token-Refresh', 'true');
                res.set('X-New-Token', newToken);
            }
            
            next();
            
        } catch (error) {
            next();
        }
    };
};

// ==================== EXPORTAR MIDDLEWARE ====================

module.exports = {
    authenticateToken,
    optionalAuth,
    requireRole,
    userRateLimit,
    authLogging,
    validateOwnership,
    checkTokenRefresh
};
