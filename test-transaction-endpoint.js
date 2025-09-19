/**
 * 🧪 SCRIPT DE PRUEBA - ENDPOINT PUT TRANSACTIONS
 *
 * Prueba el endpoint PUT /api/transactions/:id para verificar si funciona correctamente
 * en producción y desarrollo
 * Autor: Senior QA Automation Engineer
 */

const { default: fetch } = require('node-fetch');

const BASE_URL = process.env.NODE_ENV === 'production'
    ? 'https://fedelife-finanzas.onrender.com'
    : 'http://localhost:3000';

// Simular un token JWT válido (necesitarás uno real para pruebas)
const TEST_TOKEN = 'tu_token_jwt_aqui';

async function testPutEndpoint() {
    console.log('🧪 Probando endpoint PUT /api/transactions/:id');
    console.log('🌍 Ambiente:', process.env.NODE_ENV || 'development');
    console.log('🔗 URL Base:', BASE_URL);

    const testId = '68caff3731eeb545000e2983';
    const url = `${BASE_URL}/api/transactions/${testId}`;

    console.log('📍 URL a probar:', url);

    try {
        // Primero intentar una solicitud GET para verificar si la ruta existe
        console.log('\n🔍 Probando GET para verificar ruta...');
        const getResponse = await fetch(url, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${TEST_TOKEN}`,
                'Content-Type': 'application/json'
            }
        });

        console.log('📊 GET Status:', getResponse.status);
        console.log('📊 GET Headers:', Object.fromEntries(getResponse.headers.entries()));

        if (getResponse.status === 404) {
            console.log('❌ La ruta GET tampoco existe - problema de configuración de rutas');
            return;
        }

        // Ahora probar PUT
        console.log('\n🔄 Probando PUT...');
        const putData = {
            type: 'expense',
            amount: 100,
            description: 'Test transaction',
            category: 'Test'
        };

        const putResponse = await fetch(url, {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${TEST_TOKEN}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(putData)
        });

        console.log('📊 PUT Status:', putResponse.status);
        console.log('📊 PUT Status Text:', putResponse.statusText);

        const putText = await putResponse.text();
        console.log('📄 PUT Response:', putText);

        if (putResponse.status === 404) {
            console.log('❌ Endpoint PUT no encontrado');
        } else if (putResponse.status === 401) {
            console.log('🔐 Error de autenticación - token inválido');
        } else if (putResponse.status === 503) {
            console.log('🗄️ Base de datos no disponible');
        } else {
            console.log('✅ Endpoint PUT encontrado');
        }

    } catch (error) {
        console.error('❌ Error en la prueba:', error.message);
    }
}

// Ejecutar prueba
testPutEndpoint();
