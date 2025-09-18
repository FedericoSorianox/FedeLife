/**
 * 📊 SCRIPT DE MONITOREO - ESTADO DE PRODUCCIÓN
 *
 * Monitorea el estado de la aplicación en producción
 * Verifica conectividad, base de datos y endpoints críticos
 * Autor: Senior Backend Developer
 */

const https = require('https');

const PRODUCTION_URL = 'https://fedelife-finanzas.onrender.com';
const ENDPOINTS_TO_CHECK = [
    '/api/health',
    '/api/public/categories',
    '/api/public/transactions?page=1&limit=1'
];

async function makeRequest(url) {
    return new Promise((resolve, reject) => {
        const req = https.get(url, { timeout: 10000 }, (res) => {
            let data = '';

            res.on('data', (chunk) => {
                data += chunk;
            });

            res.on('end', () => {
                try {
                    const jsonData = JSON.parse(data);
                    resolve({
                        status: res.statusCode,
                        headers: res.headers,
                        data: jsonData
                    });
                } catch (error) {
                    resolve({
                        status: res.statusCode,
                        headers: res.headers,
                        data: data.substring(0, 200) + '...'
                    });
                }
            });
        });

        req.on('error', (error) => {
            reject(error);
        });

        req.on('timeout', () => {
            req.destroy();
            reject(new Error('Request timeout'));
        });
    });
}

async function checkEndpoint(endpoint) {
    const url = PRODUCTION_URL + endpoint;
    console.log(`🔍 Verificando: ${endpoint}`);

    try {
        const response = await makeRequest(url);

        if (response.status === 200) {
            console.log(`   ✅ ${endpoint} - OK (${response.status})`);
            return { endpoint, status: 'OK', code: response.status };
        } else if (response.status === 503) {
            console.log(`   ⚠️  ${endpoint} - Servicio no disponible (${response.status})`);
            console.log(`      📝 Mensaje: ${response.data?.message || 'Sin mensaje'}`);
            return { endpoint, status: 'SERVICE_UNAVAILABLE', code: response.status };
        } else {
            console.log(`   ❌ ${endpoint} - Error (${response.status})`);
            return { endpoint, status: 'ERROR', code: response.status };
        }
    } catch (error) {
        console.log(`   💥 ${endpoint} - Error de conexión: ${error.message}`);
        return { endpoint, status: 'CONNECTION_ERROR', error: error.message };
    }
}

async function monitorProduction() {
    console.log('🚀 Iniciando monitoreo de producción...\n');
    console.log(`🌐 URL: ${PRODUCTION_URL}`);
    console.log(`⏰ Timestamp: ${new Date().toISOString()}\n`);

    const results = [];

    for (const endpoint of ENDPOINTS_TO_CHECK) {
        const result = await checkEndpoint(endpoint);
        results.push(result);
        // Pequeña pausa entre requests para no sobrecargar
        await new Promise(resolve => setTimeout(resolve, 1000));
    }

    console.log('\n📊 RESUMEN DEL MONITOREO:');

    const okCount = results.filter(r => r.status === 'OK').length;
    const errorCount = results.filter(r => r.status !== 'OK').length;

    console.log(`   ✅ Endpoints OK: ${okCount}`);
    console.log(`   ❌ Endpoints con problemas: ${errorCount}`);

    if (errorCount > 0) {
        console.log('\n🔍 DETALLES DE ERRORES:');
        results.filter(r => r.status !== 'OK').forEach(result => {
            console.log(`   • ${result.endpoint}: ${result.status} ${result.code ? `(${result.code})` : ''}`);
            if (result.error) {
                console.log(`     Error: ${result.error}`);
            }
        });

        console.log('\n💡 POSIBLES CAUSAS:');
        console.log('   • Servidor caído o reiniciándose');
        console.log('   • Problemas de conectividad a MongoDB');
        console.log('   • Límite de memoria excedido en plan gratuito');
        console.log('   • Error en el código de la aplicación');

        console.log('\n🔧 ACCIONES RECOMENDADAS:');
        console.log('   1. Verificar logs en Render dashboard');
        console.log('   2. Revisar estado del servicio de MongoDB Atlas');
        console.log('   3. Verificar configuración de variables de entorno');
        console.log('   4. Considerar upgrade del plan si es necesario');
    } else {
        console.log('\n🎉 ¡Todos los servicios están funcionando correctamente!');
    }

    return results;
}

// Ejecutar monitoreo
monitorProduction().then((results) => {
    console.log('\n🏁 Monitoreo completado');
    const hasErrors = results.some(r => r.status !== 'OK');
    process.exit(hasErrors ? 1 : 0);
}).catch((error) => {
    console.error('\n💥 Error durante el monitoreo:', error);
    process.exit(1);
});
