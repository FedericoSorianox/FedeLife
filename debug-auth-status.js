/**
 * 🔍 SCRIPT DE DEBUG - ESTADO DE AUTENTICACIÓN
 *
 * Verifica el estado de autenticación del usuario en localStorage
 * y prueba la autenticación con el servidor
 * Autor: Senior QA Automation Engineer
 */

const { default: fetch } = require('node-fetch');

const BASE_URL = process.env.NODE_ENV === 'production'
    ? 'https://fedelife-finanzas.onrender.com'
    : 'http://localhost:3000';

function checkLocalStorageAuth() {
    console.log('🔍 Verificando autenticación en localStorage...');

    // Simular localStorage para Node.js
    const localStorage = {
        getItem: (key) => {
            // Aquí puedes simular los datos de localStorage
            // Por ahora devolveremos valores de ejemplo
            if (key === 'auth_data') {
                return JSON.stringify({
                    token: 'tu_token_jwt_real_aqui',
                    user: { id: 'user_id', email: 'user@example.com' }
                });
            }
            return null;
        }
    };

    const authData = localStorage.getItem('auth_data');
    if (authData) {
        try {
            const parsed = JSON.parse(authData);
            console.log('✅ Datos de autenticación encontrados:');
            console.log('   • Token existe:', !!parsed.token);
            console.log('   • Usuario:', parsed.user?.email || 'No definido');
            console.log('   • Token (primeros 20 chars):', parsed.token ? parsed.token.substring(0, 20) + '...' : 'No definido');

            return parsed.token;
        } catch (error) {
            console.log('❌ Error parseando datos de autenticación:', error.message);
            return null;
        }
    } else {
        console.log('❌ No hay datos de autenticación en localStorage');
        return null;
    }
}

async function testAuthEndpoint(token) {
    if (!token) {
        console.log('❌ No hay token para probar');
        return;
    }

    console.log('\n🔐 Probando endpoint de autenticación...');

    try {
        const response = await fetch(`${BASE_URL}/api/auth/status`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        console.log('📊 Auth Status:', response.status);

        if (response.status === 200) {
            const data = await response.json();
            console.log('✅ Autenticación exitosa');
            console.log('📄 Datos del usuario:', JSON.stringify(data, null, 2));
        } else {
            const errorText = await response.text();
            console.log('❌ Error de autenticación:', errorText);
        }

    } catch (error) {
        console.error('❌ Error probando autenticación:', error.message);
    }
}

// Ejecutar verificación
async function main() {
    console.log('🧪 DEBUG - Estado de Autenticación');
    console.log('==================================\n');

    const token = checkLocalStorageAuth();

    if (token) {
        await testAuthEndpoint(token);
    }

    console.log('\n💡 RECOMENDACIONES:');
    console.log('   1. Verifica que estés logueado en la aplicación');
    console.log('   2. Revisa la consola del navegador para errores de autenticación');
    console.log('   3. Verifica que el token JWT no haya expirado');
    console.log('   4. Si es necesario, vuelve a hacer login');
}

main();
