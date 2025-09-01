/**
 * 🔍 TEST DE CONEXIÓN PARA RENDER.COM
 * 
 * Script para verificar la conexión a MongoDB Atlas desde Render.com
 * Autor: Senior Full Stack Developer
 */

const mongoose = require('mongoose');

// Configuración para Render.com
const MONGODB_URI = 'mongodb+srv://fededanguard_db_user:CbBwcPzT5UatJlkT@cluster0.ew9wkss.mongodb.net/fede-life-finanzas?retryWrites=true&w=majority&appName=Cluster0';

// Opciones de conexión optimizadas para Render.com
const mongoOptions = {
    maxPoolSize: 10,
    serverSelectionTimeoutMS: 30000, // 30 segundos para Render
    socketTimeoutMS: 45000,
    retryWrites: true,
    w: 'majority',
    heartbeatFrequencyMS: 10000,
    connectTimeoutMS: 30000,
    minPoolSize: 1,
    maxIdleTimeMS: 30000,
    compressors: ['zlib'],
    zlibCompressionLevel: 6
};

async function testRenderConnection() {
    console.log('🔍 Iniciando test de conexión para Render.com...');
    console.log('🌍 Ambiente: production');
    console.log('📊 URI Preview:', MONGODB_URI.substring(0, 50) + '...');
    
    try {
        console.log('🔗 Intentando conectar a MongoDB Atlas...');
        
        await mongoose.connect(MONGODB_URI, mongoOptions);
        
        console.log('✅ Conectado a MongoDB exitosamente');
        console.log(`📊 Base de datos: ${mongoose.connection.name}`);
        console.log(`🔗 Host: ${mongoose.connection.host}`);
        console.log(`🚪 Puerto: ${mongoose.connection.port}`);
        console.log(`🌍 Estado: ${mongoose.connection.readyState}`);
        
        // Probar operación básica
        const collections = await mongoose.connection.db.listCollections().toArray();
        console.log(`📋 Colecciones disponibles: ${collections.length}`);
        
        // Verificar usuarios
        const User = mongoose.model('User', new mongoose.Schema({}));
        const userCount = await User.countDocuments();
        console.log(`👥 Usuarios en la base de datos: ${userCount}`);
        
        console.log('🎉 Test de conexión exitoso para Render.com');
        
    } catch (error) {
        console.error('❌ Error en test de conexión:', error.message);
        console.error('❌ Código de error:', error.code);
        console.error('❌ Nombre de error:', error.name);
        
        if (error.name === 'MongooseServerSelectionError') {
            console.error('🚨 Problema de IP whitelist detectado');
            console.error('💡 Solución: Configurar Network Access en MongoDB Atlas');
            console.error('📖 Ver: MONGODB_ATLAS_WHITELIST_FIX.md');
        }
        
        process.exit(1);
    } finally {
        await mongoose.connection.close();
        console.log('🔒 Conexión cerrada');
    }
}

// Ejecutar test
testRenderConnection();
