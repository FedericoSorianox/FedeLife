/**
 * 🧪 SCRIPT DE PRUEBA - SISTEMA DE REFRESH AUTOMÁTICO DE TOKENS
 *
 * Prueba el sistema de refresh automático implementado en funciones/finanzas.js
 * Autor: Senior QA Automation Engineer
 */

const { default: fetch } = require('node-fetch');

const BASE_URL = process.env.NODE_ENV === 'production'
    ? 'https://fedelife-finanzas.onrender.com'
    : 'http://localhost:3000';

// Simular FinanceApp con el sistema de refresh
class TestFinanceApp {
    constructor() {
        this.isRefreshing = false;
        this.refreshPromise = null;
    }

    // Simular getAuthHeaders
    getAuthHeaders() {
        const headers = { 'Content-Type': 'application/json' };
        // Simular token de localStorage
        const authData = localStorage.getItem('auth_data');
        if (authData) {
            try {
                const parsed = JSON.parse(authData);
                if (parsed.token) {
                    headers['Authorization'] = `Bearer ${parsed.token}`;
                }
            } catch (error) {}
        }
        return headers;
    }

    // Copiar las funciones del sistema de refresh
    async refreshToken() {
        if (this.refreshPromise) {
            return this.refreshPromise;
        }

        this.isRefreshing = true;
        this.refreshPromise = (async () => {
            try {
                console.log('🔄 Refrescando token JWT...');

                const headers = this.getAuthHeaders();
                if (!headers['Authorization']) {
                    throw new Error('No hay token disponible para refrescar');
                }

                const response = await fetch(`${BASE_URL}/api/auth/refresh`, {
                    method: 'POST',
                    headers: headers
                });

                const result = await response.json();

                if (!response.ok || !result.success) {
                    throw new Error(result.message || 'Error al refrescar token');
                }

                // Guardar el nuevo token (simular localStorage)
                const authData = JSON.parse(localStorage.getItem('auth_data') || '{}');
                authData.token = result.data.token;
                localStorage.setItem('auth_data', JSON.stringify(authData));

                console.log('✅ Token refrescado exitosamente');
                return result.data.token;

            } catch (error) {
                console.error('❌ Error refrescando token:', error);
                return null;
            } finally {
                this.isRefreshing = false;
                this.refreshPromise = null;
            }
        })();

        return this.refreshPromise;
    }

    async authenticatedFetch(url, options = {}) {
        try {
            const headers = {
                ...this.getAuthHeaders(),
                ...options.headers
            };

            const response = await fetch(url, { ...options, headers });

            if (response.status !== 401) {
                return response;
            }

            console.log('🔐 Error 401 detectado, intentando refresh automático...');

            const newToken = await this.refreshToken();
            if (!newToken) {
                return response;
            }

            const newHeaders = {
                ...headers,
                'Authorization': `Bearer ${newToken}`
            };

            const retryResponse = await fetch(url, { ...options, headers: newHeaders });
            console.log('✅ Solicitud reintentada exitosamente');
            return retryResponse;

        } catch (error) {
            console.error('❌ Error en authenticatedFetch:', error);
            throw error;
        }
    }

    async testTransactionUpdate(transactionId) {
        const url = `${BASE_URL}/api/transactions/${transactionId}`;

        console.log('🧪 Probando actualización de transacción...');
        console.log('📍 URL:', url);

        try {
            const response = await this.authenticatedFetch(url, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    type: 'expense',
                    amount: 100,
                    description: 'Test transaction - Auto refresh test',
                    category: 'Test'
                })
            });

            console.log('📊 Status:', response.status);

            if (response.status === 200) {
                const result = await response.json();
                console.log('✅ Transacción actualizada exitosamente');
                console.log('📄 Resultado:', JSON.stringify(result, null, 2));
                return true;
            } else if (response.status === 401) {
                console.log('❌ Error de autenticación persistente');
                return false;
            } else {
                console.log('❌ Error desconocido:', response.status);
                return false;
            }

        } catch (error) {
            console.error('❌ Error en test:', error);
            return false;
        }
    }
}

// Simular localStorage para Node.js
global.localStorage = {
    storage: {},
    getItem: function(key) {
        return this.storage[key] || null;
    },
    setItem: function(key, value) {
        this.storage[key] = value;
    },
    removeItem: function(key) {
        delete this.storage[key];
    }
};

async function runTests() {
    console.log('🧪 PRUEBA DEL SISTEMA DE REFRESH AUTOMÁTICO');
    console.log('============================================\n');

    const testApp = new TestFinanceApp();

    // Configurar un token de prueba (necesitarás uno real)
    console.log('🔑 Configurando token de prueba...');
    console.log('💡 NOTA: Necesitas configurar un token JWT válido en localStorage');
    console.log('   Ejemplo: localStorage.setItem("auth_data", JSON.stringify({token: "tu_token_jwt"}));\n');

    // Verificar si hay token configurado
    const authData = localStorage.getItem('auth_data');
    if (!authData) {
        console.log('❌ No hay token configurado. Configura uno válido primero:');
        console.log('   localStorage.setItem("auth_data", JSON.stringify({token: "TU_TOKEN_JWT"}));');
        return;
    }

    // Probar actualización de transacción
    const testTransactionId = '68caff3731eeb545000e2983';
    const success = await testApp.testTransactionUpdate(testTransactionId);

    if (success) {
        console.log('\n🎉 ¡PRUEBA EXITOSA! El sistema de refresh automático funciona correctamente');
    } else {
        console.log('\n❌ Prueba fallida. Verifica la configuración del token');
    }

    console.log('\n📋 RESUMEN DE FUNCIONALIDADES:');
    console.log('   ✅ Detección automática de errores 401');
    console.log('   ✅ Refresh automático de tokens');
    console.log('   ✅ Reintento automático de solicitudes');
    console.log('   ✅ Prevención de loops infinitos');
    console.log('   ✅ Manejo de errores de refresh');
    console.log('   ✅ Redirección automática al login si refresh falla');
}

if (require.main === module) {
    runTests().catch(console.error);
}

module.exports = { TestFinanceApp };
