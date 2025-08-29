/**
 * 🔧 DEBUG UTILITIES - FEDE LIFE
 * 
 * Funciones de diagnóstico para identificar problemas con la API
 * Autor: Senior Backend Developer
 */

// Configuración de la API
const API_CONFIG = {
    BASE_URL: (() => {
        if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
            return 'http://localhost:3000/api';
        }
        return `${window.location.protocol}//${window.location.host}/api`;
    })(),
    HEADERS: {
        'Content-Type': 'application/json'
    }
};

function addResult(message, type = 'info') {
    const results = document.getElementById('results');
    const div = document.createElement('div');
    div.className = `status ${type}`;
    div.innerHTML = `<strong>${new Date().toLocaleTimeString()}:</strong> ${message}`;
    results.appendChild(div);
}

function clearResults() {
    document.getElementById('results').innerHTML = '';
}

async function testServerHealth() {
    try {
        addResult('🏥 Probando salud del servidor...', 'info');
        
        const response = await fetch(`${API_CONFIG.BASE_URL}/health`);
        const data = await response.json();
        
        if (response.ok) {
            addResult(`✅ Servidor funcionando - Base de datos: ${data.database.status}`, 'success');
            addResult(`📊 Información: ${JSON.stringify(data, null, 2)}`, 'info');
        } else {
            addResult(`❌ Servidor con problemas - Status: ${response.status}`, 'error');
        }
        
    } catch (error) {
        addResult(`❌ Error conectando al servidor: ${error.message}`, 'error');
    }
}

async function testAuthHealth() {
    try {
        addResult('🔐 Probando salud de autenticación...', 'info');
        
        const response = await fetch(`${API_CONFIG.BASE_URL}/auth/health`);
        const data = await response.json();
        
        if (response.ok) {
            addResult(`✅ Auth funcionando - Base de datos: ${data.database.status}`, 'success');
            addResult(`📊 Variables de entorno: ${JSON.stringify(data.environment, null, 2)}`, 'info');
        } else {
            addResult(`❌ Auth con problemas - Status: ${response.status}`, 'error');
            addResult(`📊 Error: ${JSON.stringify(data, null, 2)}`, 'error');
        }
        
    } catch (error) {
        addResult(`❌ Error conectando a auth: ${error.message}`, 'error');
    }
}

async function testMongoDB() {
    try {
        addResult('🗄️ Probando conexión a MongoDB...', 'info');
        
        const response = await fetch(`${API_CONFIG.BASE_URL}/auth/health`);
        const data = await response.json();
        
        if (response.ok && data.database.status === 'connected') {
            addResult(`✅ MongoDB conectado - Base de datos: ${data.database.name}`, 'success');
        } else if (response.ok) {
            addResult(`❌ MongoDB desconectado - Estado: ${data.database.status}`, 'error');
        } else {
            addResult(`❌ No se pudo verificar MongoDB - Status: ${response.status}`, 'error');
        }
        
    } catch (error) {
        addResult(`❌ Error verificando MongoDB: ${error.message}`, 'error');
    }
}

async function testRegister() {
    try {
        addResult('📝 Probando registro de usuario...', 'info');
        
        const response = await fetch(`${API_CONFIG.BASE_URL}/auth/register`, {
            method: 'POST',
            headers: API_CONFIG.HEADERS,
            body: JSON.stringify({
                username: 'test_user',
                email: 'test@fedelife.com',
                password: 'test123456',
                firstName: 'Test',
                lastName: 'User',
                currency: 'UYU'
            })
        });
        
        const data = await response.json();
        
        if (response.ok) {
            addResult(`✅ Registro exitoso - Usuario creado`, 'success');
        } else if (response.status === 409) {
            addResult(`ℹ️ Usuario ya existe (esperado)`, 'info');
        } else {
            addResult(`❌ Error en registro - Status: ${response.status}`, 'error');
            addResult(`📊 Error: ${JSON.stringify(data, null, 2)}`, 'error');
        }
        
    } catch (error) {
        addResult(`❌ Error en registro: ${error.message}`, 'error');
    }
}

async function testLogin() {
    try {
        addResult('🔑 Probando login de usuario...', 'info');
        
        const response = await fetch(`${API_CONFIG.BASE_URL}/auth/login`, {
            method: 'POST',
            headers: API_CONFIG.HEADERS,
            body: JSON.stringify({
                identifier: 'test@fedelife.com',
                password: 'test123456'
            })
        });
        
        const data = await response.json();
        
        if (response.ok) {
            addResult(`✅ Login exitoso - Token generado`, 'success');
        } else if (response.status === 401) {
            addResult(`ℹ️ Credenciales inválidas (esperado si no existe el usuario)`, 'info');
        } else {
            addResult(`❌ Error en login - Status: ${response.status}`, 'error');
            addResult(`📊 Error: ${JSON.stringify(data, null, 2)}`, 'error');
        }
        
    } catch (error) {
        addResult(`❌ Error en login: ${error.message}`, 'error');
    }
}

// Mostrar información del sistema
function showSystemInfo() {
    const systemInfo = document.getElementById('systemInfo');
    systemInfo.innerHTML = `
        <div class="test-section">
            <h3>🌐 Información del Cliente</h3>
            <p><strong>URL de la API:</strong> ${API_CONFIG.BASE_URL}</p>
            <p><strong>Hostname:</strong> ${window.location.hostname}</p>
            <p><strong>Protocolo:</strong> ${window.location.protocol}</p>
            <p><strong>Puerto:</strong> ${window.location.port}</p>
            <p><strong>User Agent:</strong> ${navigator.userAgent}</p>
        </div>
        
        <div class="test-section">
            <h3>🔧 Estado de Autenticación</h3>
            <p><strong>Token guardado:</strong> ${localStorage.getItem('auth_data') ? 'Sí' : 'No'}</p>
            <p><strong>Token de desarrollo:</strong> ${localStorage.getItem('dev_auth_token') ? 'Sí' : 'No'}</p>
        </div>
    `;
}

// Inicializar cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', () => {
    showSystemInfo();
    addResult('🚀 Página de debug cargada - Listo para pruebas', 'info');
    
    // Agregar event listeners a los botones
    const buttons = {
        'testServerHealth': testServerHealth,
        'testAuthHealth': testAuthHealth,
        'testMongoDB': testMongoDB,
        'testRegister': testRegister,
        'testLogin': testLogin,
        'clearResults': clearResults
    };
    
    for (const [id, func] of Object.entries(buttons)) {
        const button = document.getElementById(id);
        if (button) {
            button.addEventListener('click', func);
        }
    }
});

// Exportar funciones para uso global
window.testServerHealth = testServerHealth;
window.testAuthHealth = testAuthHealth;
window.testMongoDB = testMongoDB;
window.testRegister = testRegister;
window.testLogin = testLogin;
window.clearResults = clearResults;
