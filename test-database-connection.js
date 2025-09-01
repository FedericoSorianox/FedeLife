/**
 * 🧪 SCRIPT DE PRUEBA DE CONEXIÓN A BASE DE DATOS
 * 
 * Script para verificar que la conexión a MongoDB funcione correctamente
 * Autor: Senior Backend Developer
 */

const mongoose = require('mongoose');
require('dotenv').config();

const MONGODB_URI = process.env.MONGODB_URI;

/**
 * Función para probar la conexión
 */
async function testDatabaseConnection() {
    console.log('🧪 PRUEBA DE CONEXIÓN A MONGODB');
    console.log('='.repeat(50));
    console.log('');
    
    // Verificar variables de entorno
    console.log('🔍 VERIFICANDO VARIABLES DE ENTORNO:');
    console.log(`NODE_ENV: ${process.env.NODE_ENV || 'development'}`);
    console.log(`MONGODB_URI existe: ${!!MONGODB_URI}`);
    
    if (MONGODB_URI) {
        console.log(`MONGODB_URI preview: ${MONGODB_URI.substring(0, 50)}...`);
    } else {
        console.log('❌ MONGODB_URI no está definida');
        console.log('💡 Crea un archivo .env con MONGODB_URI');
        process.exit(1);
    }
    
    console.log('');
    
    // Configuración de conexión
    const mongoOptions = {
        serverSelectionTimeoutMS: 10000,
        socketTimeoutMS: 45000,
        maxPoolSize: 5,
        retryWrites: true,
        w: 'majority'
    };
    
    console.log('🔗 INTENTANDO CONECTAR A MONGODB...');
    
    try {
        // Conectar a MongoDB
        await mongoose.connect(MONGODB_URI, mongoOptions);
        
        console.log('✅ Conexión exitosa a MongoDB');
        console.log(`📊 Base de datos: ${mongoose.connection.name}`);
        console.log(`🔗 Host: ${mongoose.connection.host}`);
        console.log(`🚪 Puerto: ${mongoose.connection.port}`);
        console.log(`🌍 Estado: ${mongoose.connection.readyState === 1 ? 'Conectado' : 'Desconectado'}`);
        
        // Probar operaciones básicas
        console.log('');
        console.log('🧪 PROBANDO OPERACIONES BÁSICAS:');
        
        // Listar colecciones
        const collections = await mongoose.connection.db.listCollections().toArray();
        console.log(`📚 Colecciones encontradas: ${collections.length}`);
        
        if (collections.length > 0) {
            collections.forEach(collection => {
                console.log(`   - ${collection.name}`);
            });
        } else {
            console.log('   (No hay colecciones aún)');
        }
        
        // Probar operación de escritura
        console.log('');
        console.log('✍️ Probando operación de escritura...');
        
        const testCollection = mongoose.connection.db.collection('test_connection');
        await testCollection.insertOne({
            test: true,
            timestamp: new Date(),
            message: 'Prueba de conexión exitosa'
        });
        
        console.log('✅ Operación de escritura exitosa');
        
        // Probar operación de lectura
        console.log('📖 Probando operación de lectura...');
        const testDoc = await testCollection.findOne({ test: true });
        console.log('✅ Operación de lectura exitosa');
        
        // Limpiar documento de prueba
        await testCollection.deleteOne({ test: true });
        console.log('🧹 Documento de prueba eliminado');
        
        // Información del servidor
        console.log('');
        console.log('📊 INFORMACIÓN DEL SERVIDOR:');
        const serverStatus = await mongoose.connection.db.admin().serverStatus();
        console.log(`Versión MongoDB: ${serverStatus.version}`);
        console.log(`Conexiones activas: ${serverStatus.connections.active}`);
        console.log(`Conexiones disponibles: ${serverStatus.connections.available}`);
        
        console.log('');
        console.log('🎉 ¡TODAS LAS PRUEBAS EXITOSAS!');
        console.log('✅ La base de datos está funcionando correctamente');
        
    } catch (error) {
        console.error('');
        console.error('❌ ERROR EN LA CONEXIÓN:');
        console.error(`Tipo de error: ${error.name}`);
        console.error(`Mensaje: ${error.message}`);
        console.error(`Código: ${error.code}`);
        
        if (error.code === 'ENOTFOUND') {
            console.error('');
            console.error('💡 SOLUCIÓN:');
            console.error('- Verifica que la URL de MongoDB sea correcta');
            console.error('- Si usas MongoDB Atlas, verifica la IP whitelist');
            console.error('- Si usas MongoDB local, verifica que esté corriendo');
        }
        
        if (error.code === 'EAUTH') {
            console.error('');
            console.error('💡 SOLUCIÓN:');
            console.error('- Verifica el usuario y contraseña');
            console.error('- Asegúrate de que el usuario tenga permisos');
        }
        
        if (error.code === 'ETIMEDOUT') {
            console.error('');
            console.error('💡 SOLUCIÓN:');
            console.error('- Verifica tu conexión a internet');
            console.error('- Si usas MongoDB Atlas, verifica la IP whitelist');
            console.error('- Aumenta el timeout si es necesario');
        }
        
        process.exit(1);
    } finally {
        // Cerrar conexión
        await mongoose.connection.close();
        console.log('');
        console.log('🔌 Conexión cerrada');
        process.exit(0);
    }
}

// Ejecutar prueba
testDatabaseConnection().catch(console.error);
