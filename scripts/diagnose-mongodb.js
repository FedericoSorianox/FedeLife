#!/usr/bin/env node

/**
 * 🩺 SCRIPT DE DIAGNÓSTICO MONGODB
 * 
 * Script para diagnosticar problemas de conexión con MongoDB Atlas
 * Útil para debugging en desarrollo y producción
 * Autor: Senior Backend Developer
 */

const mongoose = require('mongoose');
require('dotenv').config();

// ==================== CONFIGURACIÓN ====================

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/fede-life-finanzas';
const NODE_ENV = process.env.NODE_ENV || 'development';

// ==================== FUNCIONES DE DIAGNÓSTICO ====================

/**
 * Muestra información del ambiente
 */
function showEnvironmentInfo() {
    console.log('\n🔍 INFORMACIÓN DEL AMBIENTE');
    console.log('================================');
    console.log('📅 Timestamp:', new Date().toISOString());
    console.log('🌍 NODE_ENV:', NODE_ENV);
    console.log('🔗 MongoDB URI existe:', !!process.env.MONGODB_URI);
    console.log('🔗 MongoDB URI formato:', process.env.MONGODB_URI ? 
        process.env.MONGODB_URI.substring(0, 25) + '...' : 'No definida');
    console.log('📦 Node.js Version:', process.version);
    console.log('📦 Mongoose Version:', mongoose.version);
    
    // Mostrar variables de entorno relacionadas
    const envVars = [
        'PORT', 'JWT_SECRET', 'JWT_EXPIRES_IN'
    ];
    
    console.log('\n📝 Variables de entorno:');
    envVars.forEach(envVar => {
        console.log(`   ${envVar}:`, process.env[envVar] ? '✅ Definida' : '❌ No definida');
    });
}

/**
 * Prueba la conexión a MongoDB
 */
async function testMongoConnection() {
    console.log('\n🔌 PRUEBA DE CONEXIÓN MONGODB');
    console.log('================================');
    
    try {
        console.log('🔄 Intentando conectar...');
        
        // Configurar opciones de conexión con timeouts más cortos para diagnóstico
        const options = {
            useNewUrlParser: true,
            useUnifiedTopology: true,
            serverSelectionTimeoutMS: 10000, // 10 segundos
            socketTimeoutMS: 45000,
            connectTimeoutMS: 10000,
            heartbeatFrequencyMS: 5000
        };
        
        const startTime = Date.now();
        await mongoose.connect(MONGODB_URI, options);
        const connectionTime = Date.now() - startTime;
        
        console.log('✅ Conexión exitosa');
        console.log('⏱️ Tiempo de conexión:', connectionTime + 'ms');
        console.log('📊 Estado de conexión:', mongoose.connection.readyState);
        console.log('🏷️ Nombre de BD:', mongoose.connection.name);
        console.log('🖥️ Host:', mongoose.connection.host);
        console.log('🔌 Puerto:', mongoose.connection.port);
        
        // Obtener información del servidor
        try {
            const admin = mongoose.connection.db.admin();
            const serverInfo = await admin.serverInfo();
            console.log('🔧 Versión MongoDB:', serverInfo.version);
            console.log('🏗️ Arquitectura:', serverInfo.targetMinOS || 'N/A');
        } catch (adminError) {
            console.log('⚠️ No se pudo obtener info del servidor:', adminError.message);
        }
        
        // Probar una operación simple
        try {
            await mongoose.connection.db.stats();
            console.log('✅ Operaciones de BD funcionando correctamente');
        } catch (opError) {
            console.log('❌ Error en operaciones de BD:', opError.message);
        }
        
    } catch (error) {
        console.log('❌ Error de conexión:', error.name);
        console.log('💬 Mensaje:', error.message);
        console.log('🔢 Código de error:', error.code || 'No definido');
        
        // Diagnóstico específico por tipo de error
        if (error.name === 'MongooseServerSelectionError') {
            console.log('\n🚨 DIAGNÓSTICO: Error de selección de servidor');
            console.log('   Posibles causas:');
            console.log('   • IP no está en whitelist de MongoDB Atlas');
            console.log('   • URI de conexión incorrecta');
            console.log('   • Problemas de red/conectividad');
            console.log('   • Credenciales incorrectas');
            
            console.log('\n🔧 SOLUCIONES SUGERIDAS:');
            console.log('   1. Verificar IP whitelist en MongoDB Atlas');
            console.log('   2. Verificar URI de conexión');
            console.log('   3. Verificar credenciales de usuario');
            console.log('   4. Probar conectividad de red');
        }
        
        if (error.name === 'MongooseError') {
            console.log('\n🚨 DIAGNÓSTICO: Error de configuración Mongoose');
            console.log('   • Verificar formato de URI');
            console.log('   • Verificar opciones de conexión');
        }
        
        // Mostrar detalles adicionales del error
        if (error.reason) {
            console.log('\n📋 Detalles del error:');
            console.log('   Topology Type:', error.reason.type);
            console.log('   Servers:', error.reason.servers?.size || 0);
            console.log('   Compatible:', error.reason.compatible);
            console.log('   Heartbeat Frequency:', error.reason.heartbeatFrequencyMS + 'ms');
        }
    }
}

/**
 * Prueba conectividad de red
 */
async function testNetworkConnectivity() {
    console.log('\n🌐 PRUEBA DE CONECTIVIDAD DE RED');
    console.log('================================');
    
    // Extraer hostname del URI de MongoDB
    try {
        const uri = new URL(MONGODB_URI);
        const hostname = uri.hostname;
        
        console.log('🎯 Hostname objetivo:', hostname);
        console.log('🔌 Puerto objetivo:', uri.port || '27017');
        
        // En Node.js, no podemos hacer ping directo, pero podemos intentar resolver DNS
        const dns = require('dns').promises;
        
        try {
            console.log('🔄 Resolviendo DNS...');
            const addresses = await dns.lookup(hostname, { all: true });
            console.log('✅ DNS resuelto correctamente');
            console.log('📍 Direcciones IP encontradas:');
            addresses.forEach((addr, index) => {
                console.log(`   ${index + 1}. ${addr.address} (${addr.family})`);
            });
        } catch (dnsError) {
            console.log('❌ Error resolviendo DNS:', dnsError.message);
        }
        
    } catch (uriError) {
        console.log('❌ Error parseando URI:', uriError.message);
    }
}

/**
 * Muestra recomendaciones de configuración
 */
function showConfigurationRecommendations() {
    console.log('\n💡 RECOMENDACIONES DE CONFIGURACIÓN');
    console.log('=====================================');
    
    if (NODE_ENV === 'production') {
        console.log('🚀 Modo PRODUCCIÓN detectado:');
        console.log('   ✓ Usar variables de entorno para configuración sensible');
        console.log('   ✓ Configurar IP whitelist en MongoDB Atlas');
        console.log('   ✓ Usar SSL/TLS para conexiones');
        console.log('   ✓ Configurar timeouts apropiados');
        console.log('   ✓ Implementar reconexión automática');
    } else {
        console.log('🛠️ Modo DESARROLLO detectado:');
        console.log('   ✓ Verificar archivo .env');
        console.log('   ✓ Usar MongoDB local o Atlas con IPs permitidas');
        console.log('   ✓ Configurar logs detallados');
    }
    
    console.log('\n🔧 MongoDB Atlas - Lista de verificación:');
    console.log('   □ Cluster está activo y funcionando');
    console.log('   □ IP está en whitelist (0.0.0.0/0 para servicios cloud)');
    console.log('   □ Usuario tiene permisos correctos');
    console.log('   □ URI de conexión es correcta');
    console.log('   □ Password no contiene caracteres especiales sin codificar');
}

/**
 * Limpia conexiones
 */
async function cleanup() {
    try {
        if (mongoose.connection.readyState !== 0) {
            await mongoose.connection.close();
            console.log('\n🧹 Conexión cerrada correctamente');
        }
    } catch (error) {
        console.log('\n⚠️ Error cerrando conexión:', error.message);
    }
}

// ==================== FUNCIÓN PRINCIPAL ====================

async function main() {
    console.log('🩺 DIAGNÓSTICO MONGODB - FEDE LIFE FINANZAS');
    console.log('===========================================');
    
    try {
        // Mostrar información del ambiente
        showEnvironmentInfo();
        
        // Probar conectividad de red
        await testNetworkConnectivity();
        
        // Probar conexión MongoDB
        await testMongoConnection();
        
        // Mostrar recomendaciones
        showConfigurationRecommendations();
        
    } catch (error) {
        console.error('\n❌ Error en diagnóstico:', error);
    } finally {
        await cleanup();
    }
    
    console.log('\n✅ Diagnóstico completado');
    console.log('=========================');
}

// ==================== EJECUCIÓN ====================

// Solo ejecutar si es llamado directamente
if (require.main === module) {
    main().catch(console.error);
}

module.exports = {
    showEnvironmentInfo,
    testMongoConnection,
    testNetworkConnectivity,
    showConfigurationRecommendations
};
