/**
 * 🧪 SCRIPT DE PRUEBA - CONEXIÓN MONGODB Y RUTAS PÚBLICAS
 *
 * Prueba la conexión a MongoDB y las rutas públicas
 * Autor: Senior Backend Developer
 */

const mongoose = require('mongoose');
require('dotenv').config();

async function testMongoDBConnection() {
    console.log('🧪 Probando conexión a MongoDB...\n');

    try {
        // Simular variables de entorno de producción
        const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/fede-life-finanzas';

        console.log('📊 URI de MongoDB:', MONGODB_URI ? 'Configurada' : 'No configurada');
        console.log('🌍 Ambiente:', process.env.NODE_ENV || 'development');

        // Intentar conectar
        console.log('\n🔗 Intentando conectar a MongoDB...');
        await mongoose.connect(MONGODB_URI, {
            maxPoolSize: 5,
            serverSelectionTimeoutMS: 5000,
            socketTimeoutMS: 45000
        });

        console.log('✅ Conexión exitosa a MongoDB');
        console.log('📊 Base de datos:', mongoose.connection.name);
        console.log('🔗 Host:', mongoose.connection.host);

        // Probar crear una transacción de prueba
        console.log('\n📝 Probando creación de transacción...');

        const Transaction = mongoose.model('Transaction', new mongoose.Schema({
            userId: String,
            type: String,
            amount: Number,
            description: String,
            category: String,
            date: Date,
            paymentMethod: String,
            currency: String,
            tags: [String],
            notes: String,
            status: String,
            createdAt: { type: Date, default: Date.now },
            updatedAt: { type: Date, default: Date.now }
        }));

        const testTransaction = new Transaction({
            userId: 'test_user',
            type: 'expense',
            amount: 100,
            description: 'Transacción de prueba',
            category: 'Test',
            date: new Date(),
            paymentMethod: 'card',
            currency: 'UYU',
            status: 'completed'
        });

        await testTransaction.save();
        console.log('✅ Transacción de prueba creada:', testTransaction._id);

        // Limpiar transacción de prueba
        await Transaction.findByIdAndDelete(testTransaction._id);
        console.log('🗑️ Transacción de prueba eliminada');

        // Cerrar conexión
        await mongoose.connection.close();
        console.log('🔌 Conexión cerrada');

        console.log('\n🎉 ¡Todas las pruebas pasaron exitosamente!');
        console.log('📋 Resumen:');
        console.log('   ✅ Conexión MongoDB: OK');
        console.log('   ✅ Creación de transacción: OK');
        console.log('   ✅ Limpieza de datos de prueba: OK');

    } catch (error) {
        console.error('\n❌ Error en las pruebas:', error.message);
        console.error('📋 Código de error:', error.code);

        if (error.code === 'ECONNREFUSED') {
            console.log('\n💡 Solución sugerida:');
            console.log('   1. Verificar que MongoDB esté ejecutándose');
            console.log('   2. Revisar la URI de conexión');
            console.log('   3. Verificar configuración de firewall/IP whitelist en MongoDB Atlas');
        }

        if (error.code === 'ENOTFOUND') {
            console.log('\n💡 Solución sugerida:');
            console.log('   1. Verificar la URI de MongoDB Atlas');
            console.log('   2. Revisar configuración de DNS');
        }

        process.exit(1);
    }
}

// Ejecutar pruebas
testMongoDBConnection();
