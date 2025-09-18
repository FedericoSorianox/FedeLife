/**
 * 🧪 SCRIPT DE DIAGNÓSTICO - CONEXIÓN MONGODB
 *
 * Prueba la conexión a MongoDB Atlas con las mismas configuraciones de producción
 * Autor: Senior Backend Developer
 */

const mongoose = require('mongoose');
require('dotenv').config();

async function testMongoDBConnection() {
    console.log('🔍 Iniciando diagnóstico de conexión a MongoDB...\n');

    // Configuración de conexión (igual que en producción)
    const MONGODB_URI = process.env.MONGODB_URI;

    if (!MONGODB_URI) {
        console.error('❌ Error: MONGODB_URI no está definido en las variables de entorno');
        console.log('📝 Asegúrate de tener configurado el archivo .env con MONGODB_URI');
        return;
    }

    console.log('🌍 URI Preview:', MONGODB_URI.substring(0, 50) + '...');
    console.log('🌍 Ambiente:', process.env.NODE_ENV || 'development');
    console.log('🔗 Intentando conectar...\n');

    try {
        // Configuración de conexión optimizada para producción
        const mongoOptions = {
            maxPoolSize: process.env.NODE_ENV === 'production' ? 10 : 5,
            serverSelectionTimeoutMS: 10000,
            socketTimeoutMS: 45000,
            retryWrites: true,
            w: 'majority',
            heartbeatFrequencyMS: 10000,
            connectTimeoutMS: 10000,
            minPoolSize: 1,
            maxIdleTimeMS: 30000,
            compressors: ['zlib'],
            zlibCompressionLevel: 6
        };

        // Intentar conexión
        await mongoose.connect(MONGODB_URI, mongoOptions);

        console.log('✅ Conexión exitosa a MongoDB!');
        console.log('📊 Base de datos:', mongoose.connection.name);
        console.log('🔗 Host:', mongoose.connection.host);
        console.log('🚪 Puerto:', mongoose.connection.port);
        console.log('📈 Estado de conexión:', mongoose.connection.readyState);

        // Probar una consulta simple
        console.log('\n🔍 Probando consulta de prueba...');
        const db = mongoose.connection.db;
        const collections = await db.collections();
        console.log('📂 Colecciones encontradas:', collections.map(c => c.collectionName));

        // Cerrar conexión
        await mongoose.connection.close();
        console.log('\n✅ Conexión cerrada correctamente');

    } catch (error) {
        console.error('\n❌ Error de conexión a MongoDB:');
        console.error('📝 Código de error:', error.code);
        console.error('📝 Nombre de error:', error.name);
        console.error('📝 Mensaje:', error.message);

        if (error.code === 'ENOTFOUND') {
            console.log('\n💡 Posibles causas:');
            console.log('   • El cluster de MongoDB Atlas no existe o está mal configurado');
            console.log('   • Problema de DNS o conectividad a internet');
        } else if (error.code === 'ECONNREFUSED') {
            console.log('\n💡 Posibles causas:');
            console.log('   • El puerto de MongoDB está bloqueado por firewall');
            console.log('   • El cluster está pausado o detenido');
        } else if (error.code === 'AuthenticationFailed') {
            console.log('\n💡 Posibles causas:');
            console.log('   • Credenciales incorrectas (usuario/contraseña)');
            console.log('   • El usuario no tiene permisos para acceder a la base de datos');
        } else if (error.code === 'MongoNetworkError') {
            console.log('\n💡 Posibles causas:');
            console.log('   • IP no está en la whitelist de MongoDB Atlas');
            console.log('   • Problema de red o conectividad');
        }

        console.log('\n🔧 Soluciones sugeridas:');
        console.log('   1. Verificar credenciales en MongoDB Atlas');
        console.log('   2. Revisar IP whitelist en MongoDB Atlas');
        console.log('   3. Verificar que el cluster esté activo');
        console.log('   4. Probar conexión desde otra red/IP');
    }
}

// Ejecutar diagnóstico
testMongoDBConnection().then(() => {
    console.log('\n🏁 Diagnóstico completado');
    process.exit(0);
}).catch((error) => {
    console.error('\n💥 Error inesperado durante el diagnóstico:', error);
    process.exit(1);
});
