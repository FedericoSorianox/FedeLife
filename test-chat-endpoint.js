/**
 * 🧪 SCRIPT DE PRUEBA PARA ENDPOINT DE CHAT
 * Prueba el endpoint de chat de IA para diagnosticar problemas
 */

const API_BASE_URL = 'http://localhost:3000/api';

async function testChatEndpoint() {
    console.log('🧪 Probando endpoint de chat...\n');

    try {
        // 1. Probar endpoint público básico
        console.log('1️⃣ Probando endpoint público básico (/public/ai/chat)...');
        const basicResponse = await fetch(`${API_BASE_URL}/public/ai/chat`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                message: 'Hola, ¿puedes ayudarme con mis finanzas?'
            })
        });

        console.log('📊 Estado de respuesta básica:', basicResponse.status);

        if (basicResponse.ok) {
            const basicData = await basicResponse.json();
            console.log('✅ Respuesta básica exitosa:', basicData.success);
        } else {
            console.log('❌ Error en respuesta básica:', basicResponse.statusText);
            const errorText = await basicResponse.text();
            console.log('📝 Detalles del error:', errorText);
        }

        console.log('');

        // 2. Probar endpoint mejorado
        console.log('2️⃣ Probando endpoint mejorado (/public/ai/enhanced-chat)...');
        const enhancedResponse = await fetch(`${API_BASE_URL}/public/ai/enhanced-chat`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                message: '¿Qué consejos me das para ahorrar dinero?',
                userData: {
                    name: 'Usuario de Prueba',
                    currency: 'UYU',
                    summary: {
                        totalIncome: 50000,
                        totalExpenses: 35000,
                        balance: 15000
                    }
                }
            })
        });

        console.log('📊 Estado de respuesta mejorada:', enhancedResponse.status);

        if (enhancedResponse.ok) {
            const enhancedData = await enhancedResponse.json();
            console.log('✅ Respuesta mejorada exitosa:', enhancedData.success);
        } else {
            console.log('❌ Error en respuesta mejorada:', enhancedResponse.statusText);
            const errorText = await enhancedResponse.text();
            console.log('📝 Detalles del error:', errorText);
        }

        console.log('');

        // 3. Probar endpoint de salud de OpenAI
        console.log('3️⃣ Probando endpoint de salud de OpenAI (/public/ai/health)...');
        const healthResponse = await fetch(`${API_BASE_URL}/public/ai/health`);

        console.log('📊 Estado de respuesta de salud:', healthResponse.status);

        if (healthResponse.ok) {
            const healthData = await healthResponse.json();
            console.log('🏥 Estado de OpenAI:', healthData.data);
        } else {
            console.log('❌ Error en verificación de salud:', healthResponse.statusText);
        }

    } catch (error) {
        console.error('💥 Error general en las pruebas:', error.message);
        console.error('🔍 Stack trace:', error.stack);
    }
}

// Ejecutar pruebas
testChatEndpoint();
