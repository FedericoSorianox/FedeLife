/**
 * 👤 MODELO DE USUARIO - MONGODB
 * 
 * Esquema de usuario para autenticación y gestión de datos personales
 * Incluye encriptación de contraseñas y validaciones de seguridad
 * Autor: Senior Backend Developer
 */

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

// ==================== ESQUEMA DE USUARIO ====================

const userSchema = new mongoose.Schema({
    // Información básica
    username: {
        type: String,
        required: [true, 'El nombre de usuario es requerido'],
        unique: true,
        trim: true,
        minlength: [3, 'El nombre de usuario debe tener al menos 3 caracteres'],
        maxlength: [30, 'El nombre de usuario no puede exceder 30 caracteres'],
        match: [/^[a-zA-Z0-9_]+$/, 'El nombre de usuario solo puede contener letras, números y guiones bajos']
    },
    
    email: {
        type: String,
        required: [true, 'El email es requerido'],
        unique: true,
        trim: true,
        lowercase: true,
        match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Por favor ingresa un email válido']
    },
    
    password: {
        type: String,
        required: [true, 'La contraseña es requerida'],
        minlength: [6, 'La contraseña debe tener al menos 6 caracteres'],
        select: false // No incluir en consultas por defecto
    },
    
    // Información personal
    firstName: {
        type: String,
        required: [true, 'El nombre es requerido'],
        trim: true,
        maxlength: [50, 'El nombre no puede exceder 50 caracteres']
    },
    
    lastName: {
        type: String,
        required: [true, 'El apellido es requerido'],
        trim: true,
        maxlength: [50, 'El apellido no puede exceder 50 caracteres']
    },
    
    // Configuración de la aplicación
    currency: {
        type: String,
        default: 'UYU',
        enum: ['UYU', 'USD'],
        required: true
    },
    
    timezone: {
        type: String,
        default: 'America/Montevideo',
        required: true
    },
    
    // Configuración de IA
    aiApiKey: {
        type: String,
        select: false, // No incluir en consultas por defecto
        default: null
    },
    
    // Estado de la cuenta
    isActive: {
        type: Boolean,
        default: true
    },
    
    isEmailVerified: {
        type: Boolean,
        default: false
    },
    
    // Fechas importantes
    lastLogin: {
        type: Date,
        default: null
    },
    
    passwordChangedAt: {
        type: Date,
        default: null
    },
    
    // Tokens de recuperación
    passwordResetToken: {
        type: String,
        select: false
    },
    
    passwordResetExpires: {
        type: Date,
        select: false
    }
    
}, {
    timestamps: true, // Agrega createdAt y updatedAt automáticamente
    toJSON: { virtuals: true }, // Incluir virtuals en JSON
    toObject: { virtuals: true }
});

// ==================== ÍNDICES ====================

// Los índices de email y username ya se crean automáticamente por unique: true
// Solo agregamos índices adicionales que no están definidos en el esquema
userSchema.index({ isActive: 1 });

// Índice compuesto para búsquedas optimizadas
userSchema.index({ isActive: 1, createdAt: -1 });

// ==================== VIRTUALS ====================

/**
 * Virtual para nombre completo
 */
userSchema.virtual('fullName').get(function() {
    return `${this.firstName} ${this.lastName}`;
});

/**
 * Virtual para iniciales
 */
userSchema.virtual('initials').get(function() {
    return `${this.firstName.charAt(0)}${this.lastName.charAt(0)}`.toUpperCase();
});

// ==================== MIDDLEWARE PRE-SAVE ====================

/**
 * Middleware para encriptar contraseña antes de guardar
 */
userSchema.pre('save', async function(next) {
    // Solo encriptar si la contraseña fue modificada
    if (!this.isModified('password')) {
        return next();
    }
    
    try {
        // Encriptar contraseña con salt rounds de 12
        const salt = await bcrypt.genSalt(12);
        this.password = await bcrypt.hash(this.password, salt);
        
        // Actualizar fecha de cambio de contraseña
        this.passwordChangedAt = new Date();
        
        next();
    } catch (error) {
        next(error);
    }
});

/**
 * Middleware para actualizar passwordChangedAt cuando se actualiza la contraseña
 */
userSchema.pre('findOneAndUpdate', async function(next) {
    const update = this.getUpdate();
    
    if (update.password) {
        try {
            const salt = await bcrypt.genSalt(12);
            update.password = await bcrypt.hash(update.password, salt);
            update.passwordChangedAt = new Date();
        } catch (error) {
            return next(error);
        }
    }
    
    next();
});

// ==================== MÉTODOS DE INSTANCIA ====================

/**
 * Compara la contraseña proporcionada con la contraseña encriptada
 * @param {string} candidatePassword - Contraseña a comparar
 * @returns {Promise<boolean>} - true si coinciden
 */
userSchema.methods.comparePassword = async function(candidatePassword) {
    try {
        return await bcrypt.compare(candidatePassword, this.password);
    } catch (error) {
        throw new Error('Error comparando contraseñas');
    }
};

/**
 * Genera un token JWT para el usuario
 * @returns {string} - Token JWT
 */
userSchema.methods.generateAuthToken = function() {
    const payload = {
        id: this._id,
        username: this.username,
        email: this.email,
        firstName: this.firstName,
        lastName: this.lastName
    };
    
    const secret = process.env.JWT_SECRET || 'fede-life-secret-key';
    const options = {
        expiresIn: process.env.JWT_EXPIRES_IN || '7d'
    };
    
    return jwt.sign(payload, secret, options);
};

/**
 * Genera un token de recuperación de contraseña
 * @returns {string} - Token de recuperación
 */
userSchema.methods.generatePasswordResetToken = function() {
    // Generar token aleatorio
    const resetToken = require('crypto').randomBytes(32).toString('hex');
    
    // Encriptar token para guardar en BD
    const hashedToken = require('crypto')
        .createHash('sha256')
        .update(resetToken)
        .digest('hex');
    
    // Guardar token encriptado y fecha de expiración
    this.passwordResetToken = hashedToken;
    this.passwordResetExpires = new Date(Date.now() + 10 * 60 * 1000); // 10 minutos
    
    return resetToken;
};

/**
 * Verifica si la contraseña fue cambiada después de que se emitió el token
 * @param {number} JWTTimestamp - Timestamp del token JWT
 * @returns {boolean} - true si la contraseña fue cambiada después del token
 */
userSchema.methods.changedPasswordAfter = function(JWTTimestamp) {
    if (this.passwordChangedAt) {
        const changedTimestamp = parseInt(this.passwordChangedAt.getTime() / 1000, 10);
        return JWTTimestamp < changedTimestamp;
    }
    
    return false;
};

/**
 * Actualiza la fecha de último login
 */
userSchema.methods.updateLastLogin = function() {
    this.lastLogin = new Date();
    return this.save();
};

// ==================== MÉTODOS ESTÁTICOS ====================

/**
 * Busca un usuario por email o username
 * @param {string} identifier - Email o username
 * @returns {Promise<Object>} - Usuario encontrado
 */
userSchema.statics.findByEmailOrUsername = function(identifier) {
    return this.findOne({
        $or: [
            { email: identifier.toLowerCase() },
            { username: identifier }
        ]
    }).select('+password'); // Incluir contraseña para comparación
};

/**
 * Verifica si un email o username ya existe
 * @param {string} field - Campo a verificar ('email' o 'username')
 * @param {string} value - Valor a verificar
 * @param {string} excludeId - ID a excluir (para actualizaciones)
 * @returns {Promise<boolean>} - true si existe
 */
userSchema.statics.existsByField = function(field, value, excludeId = null) {
    const query = { [field]: value };
    
    if (excludeId) {
        query._id = { $ne: excludeId };
    }
    
    return this.exists(query);
};

// ==================== VALIDACIONES PERSONALIZADAS ====================

/**
 * Valida que el username sea único
 */
userSchema.path('username').validate(async function(value) {
    if (!value) return true;
    
    const User = this.constructor;
    const exists = await User.existsByField('username', value, this._id);
    
    if (exists) {
        throw new Error('El nombre de usuario ya está en uso');
    }
    
    return true;
}, 'El nombre de usuario ya está en uso');

/**
 * Valida que el email sea único
 */
userSchema.path('email').validate(async function(value) {
    if (!value) return true;
    
    const User = this.constructor;
    const exists = await User.existsByField('email', value, this._id);
    
    if (exists) {
        throw new Error('El email ya está registrado');
    }
    
    return true;
}, 'El email ya está registrado');

// ==================== EXPORTAR MODELO ====================

const User = mongoose.model('User', userSchema);

module.exports = User;
