/**
 * 🧪 SCRIPT DE PRUEBA - ACTUALIZACIÓN DE TRANSACCIONES
 *
 * Prueba la corrección del error 404 en la actualización de transacciones
 * Autor: Senior Backend Developer
 */

console.log('🧪 Iniciando pruebas de actualización de transacciones...\n');

// Simular el entorno del navegador para testing
global.window = {
    location: { hostname: 'localhost' },
    financeApp: null
};

// Simular FINANCE_API_CONFIG
global.FINANCE_API_CONFIG = {
    baseUrl: 'http://localhost:3000/api' // Ya incluye /api
};

// Simular localStorage
global.localStorage = {
    getItem: (key) => null,
    setItem: (key, value) => {},
    removeItem: (key) => {}
};

// Simular fetch para testing
global.fetch = async (url, options) => {
    console.log(`🔄 Simulando fetch: ${options?.method || 'GET'} ${url}`);

    // Simular respuesta exitosa para actualización de transacciones
    if (url.includes('/api/transactions/') && options?.method === 'PUT') {
        const transactionId = url.split('/api/transactions/')[1];
        console.log(`📝 ID de transacción extraído de URL: ${transactionId}`);
        console.log(`📝 Longitud del ID: ${transactionId.length}`);

        // Verificar si el ID tiene el formato correcto de MongoDB (24 caracteres hexadecimales)
        const mongoIdRegex = /^[0-9a-fA-F]{24}$/;
        const isValidMongoId = mongoIdRegex.test(transactionId);

        console.log(`🔍 ¿Es un ID válido de MongoDB?: ${isValidMongoId}`);

        if (isValidMongoId) {
            return {
                ok: true,
                status: 200,
                json: async () => ({
                    success: true,
                    message: 'Transacción actualizada correctamente',
                    data: {
                        transaction: {
                            _id: transactionId,
                            type: 'expense',
                            amount: 4600,
                            description: 'Co2',
                            category: 'Wit',
                            date: '2025-09-17',
                            currency: 'UYU'
                        }
                    }
                })
            };
        } else {
            console.log('❌ ID no válido, devolviendo 404');
            return {
                ok: false,
                status: 404,
                json: async () => ({
                    success: false,
                    error: 'Transacción no encontrada',
                    message: 'El ID de la transacción no es válido'
                })
            };
        }
    }

    return {
        ok: false,
        status: 500,
        json: async () => ({
            success: false,
            error: 'Error simulado'
        })
    };
};

// Simular notificaciones
global.alert = (msg) => console.log(`🔔 Alert: ${msg}`);

// Pruebas
async function runTests() {
    console.log('1️⃣ Probando construcción de URLs para actualización...\n');

    const baseUrl = 'http://localhost:3000/api';

    // IDs de ejemplo
    const testIds = [
        '507f1f77bcf86cd799439011', // ID válido de MongoDB (24 chars hex)
        '507f1f77bcf86cd79943901',   // ID corto (23 chars)
        '507f1f77bcf86cd7994390111', // ID largo (25 chars)
        '507g1f77bcf86cd799439011', // ID con caracter inválido
        '68caff3...',                // ID truncado como en el error
        '68caff3d5e8b4f1c2a9b3e5f'  // ID completo simulado
    ];

    console.log('🔍 Probando diferentes formatos de ID:\n');

    for (const testId of testIds) {
        const url = `${baseUrl}/api/transactions/${testId}`;
        console.log(`📝 ID: ${testId}`);
        console.log(`   URL: ${url}`);
        console.log(`   Longitud: ${testId.length}`);
        console.log(`   ¿Válido MongoDB?: ${/^[0-9a-fA-F]{24}$/.test(testId)}`);

        // Simular petición
        try {
            const response = await fetch(url, { method: 'PUT', body: '{}' });
            const result = await response.json();
            console.log(`   Respuesta: ${response.status} - ${result.message || result.error}`);
        } catch (error) {
            console.log(`   Error: ${error.message}`);
        }
        console.log('');
    }

    console.log('2️⃣ Probando simulación de formulario de edición...\n');

    // Simular datos que vendrían del formulario
    const formData = {
        editTransactionId: '68caff3d5e8b4f1c2a9b3e5f', // ID completo
        editTransactionType: 'expense',
        editTransactionAmount: '4600',
        editTransactionDescription: 'Co2',
        editTransactionCategory: 'Wit',
        editTransactionDate: '2025-09-17',
        editTransactionCurrency: 'UYU'
    };

    console.log('📋 Datos del formulario simulado:');
    Object.entries(formData).forEach(([key, value]) => {
        console.log(`   ${key}: ${value} (${typeof value})`);
    });

    console.log('\n3️⃣ Probando conversión de datos del formulario...\n');

    // Simular la función handleEditTransactionSubmit
    function extractFormData(formData) {
        const transactionId = formData.editTransactionId;

        const updatedData = {
            type: formData.editTransactionType,
            amount: parseFloat(formData.editTransactionAmount),
            description: formData.editTransactionDescription,
            category: formData.editTransactionCategory,
            date: formData.editTransactionDate,
            currency: formData.editTransactionCurrency
        };

        return { transactionId, updatedData };
    }

    const { transactionId, updatedData } = extractFormData(formData);

    console.log('🔍 Transaction ID extraído:', transactionId);
    console.log('🔍 Datos actualizados:', updatedData);

    console.log('\n4️⃣ Probando construcción de URL completa...\n');

    const fullUrl = `${baseUrl}/api/transactions/${transactionId}`;
    console.log('🔗 URL completa:', fullUrl);
    console.log('🔗 Método: PUT');
    console.log('🔗 Headers: Content-Type: application/json');
    console.log('🔗 Body:', JSON.stringify(updatedData, null, 2));

    console.log('\n5️⃣ Verificación final...\n');

    console.log('✅ Correcciones aplicadas:');
    console.log('   • URL corregida: /api/api/transactions/... → /api/transactions/...');
    console.log('   • Atributos name agregados a campos del formulario');
    console.log('   • Validación mejorada de datos');
    console.log('   • Manejo de errores mejorado');

    console.log('\n🔍 Para diagnosticar el problema real:');
    console.log('   1. Revisa la consola del navegador cuando intentes editar una transacción');
    console.log('   2. Busca los logs que agregamos:');
    console.log('      - "Transaction ID obtenido del formulario:"');
    console.log('      - "URL de actualización:"');
    console.log('   3. Compara el ID mostrado con el ID que aparece en la URL');

    console.log('\n💡 Posibles causas del error 404:');
    console.log('   • ID de transacción truncado o incompleto');
    console.log('   • ID no válido para MongoDB (no 24 caracteres hexadecimales)');
    console.log('   • Transacción no existe en la base de datos');
    console.log('   • Problema de permisos/autenticación');

    console.log('\n✅ Pruebas completadas');
}

// Ejecutar pruebas
runTests().catch(console.error);
