/**
 * 🧪 SCRIPT DE PRUEBA - RUTAS PÚBLICAS DE LA API
 *
 * Prueba las rutas públicas sin requerir autenticación
 * Autor: Senior Backend Developer
 */

const fetch = require('node-fetch');

async function testPublicRoutes() {
    console.log('🧪 Probando rutas públicas de la API...\n');

    const baseUrl = 'http://localhost:3000/api';

    try {
        // 1. Probar health check
        console.log('🏥 Probando /api/health...');
        const healthResponse = await fetch(`${baseUrl}/health`);
        if (healthResponse.ok) {
            const healthData = await healthResponse.json();
            console.log('✅ Health check OK:', healthData.status);
            console.log('   📊 Database:', healthData.database.status);
        } else {
            throw new Error(`Health check failed: ${healthResponse.status}`);
        }

        // 2. Probar obtener categorías públicas
        console.log('\n📂 Probando /api/public/categories...');
        const categoriesResponse = await fetch(`${baseUrl}/public/categories`);
        if (categoriesResponse.ok) {
            const categoriesData = await categoriesResponse.json();
            console.log('✅ Categorías públicas OK:', categoriesData.data.categories.length, 'categorías');
        } else {
            throw new Error(`Categories failed: ${categoriesResponse.status}`);
        }

        // 3. Probar crear transacción pública
        console.log('\n💰 Probando creación de transacción pública...');
        const testTransaction = {
            type: 'expense',
            amount: 50,
            description: 'Test transaction',
            category: 'Alimentación',
            date: new Date().toISOString(),
            paymentMethod: 'card',
            currency: 'UYU'
        };

        const createResponse = await fetch(`${baseUrl}/public/transactions`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(testTransaction)
        });

        if (createResponse.ok) {
            const createData = await createResponse.json();
            console.log('✅ Transacción creada OK:', createData.message);
            console.log('   🆔 ID:', createData.data.transaction.id);
        } else {
            const errorText = await createResponse.text();
            throw new Error(`Create transaction failed: ${createResponse.status} - ${errorText}`);
        }

        // 4. Probar obtener transacciones públicas
        console.log('\n📊 Probando obtener transacciones públicas...');
        const transactionsResponse = await fetch(`${baseUrl}/public/transactions`);
        if (transactionsResponse.ok) {
            const transactionsData = await transactionsResponse.json();
            console.log('✅ Transacciones públicas OK:', transactionsData.data.transactions.length, 'transacciones');
            console.log('   📄 Paginación:', transactionsData.data.pagination);
        } else {
            const errorText = await transactionsResponse.text();
            throw new Error(`Get transactions failed: ${transactionsResponse.status} - ${errorText}`);
        }

        console.log('\n🎉 ¡Todas las rutas públicas funcionan correctamente!');
        console.log('📋 Resumen de pruebas:');
        console.log('   ✅ Health check: OK');
        console.log('   ✅ Categorías públicas: OK');
        console.log('   ✅ Crear transacción: OK');
        console.log('   ✅ Obtener transacciones: OK');

        console.log('\n🚀 La aplicación debería funcionar correctamente en producción usando MongoDB');

    } catch (error) {
        console.error('\n❌ Error en las pruebas:', error.message);

        if (error.message.includes('ECONNREFUSED')) {
            console.log('\n💡 Solución sugerida:');
            console.log('   1. Asegurarse de que el servidor esté ejecutándose');
            console.log('   2. Ejecutar: cd server && node index.js');
        }

        if (error.message.includes('ENOTFOUND')) {
            console.log('\n💡 Solución sugerida:');
            console.log('   1. Verificar la URL del servidor');
            console.log('   2. Cambiar baseUrl si es necesario');
        }

        process.exit(1);
    }
}

// Ejecutar pruebas
testPublicRoutes();
