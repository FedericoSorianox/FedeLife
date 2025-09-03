/**
 * 🔐 GESTOR DE AUTENTICACIÓN - FRONTEND
 * 
 * Maneja login, logout y estado de autenticación
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

/**
 * Función global para logout
 */
function logout() {
    // Limpiar datos de autenticación
    localStorage.removeItem('auth_data');
    localStorage.removeItem('dev_auth_token');
    
    // Mostrar mensaje
    alert('✅ Sesión cerrada correctamente');
    
    // Redirigir a la página de login
    window.location.href = 'login.html';
}

/**
 * Verifica el estado de autenticación y actualiza la UI
 */
function checkAuthStatus() {
    const authData = localStorage.getItem('auth_data');
    const authButton = document.getElementById('authButton');
    const autoAuthButton = document.getElementById('autoAuthButton');
    const userInfo = document.getElementById('userInfo');
    const userName = document.getElementById('userName');
    
    if (authData) {
        try {
            const parsed = JSON.parse(authData);
            if (parsed.token && parsed.user) {
                // Usuario autenticado
                if (authButton) authButton.style.display = 'none';
                if (autoAuthButton) autoAuthButton.style.display = 'none';
                if (userInfo) userInfo.style.display = 'flex';
                if (userName) {
                    userName.textContent = parsed.user.firstName || parsed.user.username || 'Usuario';
                }
                return true;
            }
        } catch (error) {
            console.error('Error parsing auth data:', error);
        }
    }
    
    // Usuario no autenticado
    if (authButton) authButton.style.display = 'block';
    if (autoAuthButton) autoAuthButton.style.display = 'block';
    if (userInfo) userInfo.style.display = 'none';
    return false;
}

/**
 * Intenta autenticación automática en desarrollo
 */
async function tryAutoLogin() {
    try {
        // Verificar si ya hay un token guardado
        const existingToken = localStorage.getItem('dev_auth_token');
        if (existingToken) {
            console.log(`🔑 Token de desarrollo encontrado, verificando...`);
            return true;
        }

        // Permitir autenticación automática tanto en desarrollo como en producción
        // En producción, esto creará un usuario de desarrollo para testing

        // Crear usuario de desarrollo automáticamente
        console.log(`👤 Creando usuario de desarrollo automático...`);
        
        const response = await fetch(`${API_CONFIG.BASE_URL}/auth/register`, {
            method: 'POST',
            headers: API_CONFIG.HEADERS,
            body: JSON.stringify({
                username: 'dev_user',
                email: 'dev@fedelife.com',
                password: 'dev123456',
                firstName: 'Desarrollo',
                lastName: 'Usuario',
                currency: 'UYU'
            })
        });

        if (response.ok) {
            const data = await response.json();
            const token = data.data.token;
            
            // Guardar token para futuras sesiones
            localStorage.setItem('dev_auth_token', token);
            localStorage.setItem('auth_data', JSON.stringify({
                token: token,
                user: data.data.user
            }));
            
            console.log(`✅ Usuario de desarrollo creado y autenticado automáticamente`);
            return true;
        } else {
            // Si el usuario ya existe, intentar login
            console.log(`🔄 Usuario de desarrollo ya existe, intentando login...`);
            
            const loginResponse = await fetch(`${API_CONFIG.BASE_URL}/auth/login`, {
                method: 'POST',
                headers: API_CONFIG.HEADERS,
                body: JSON.stringify({
                    identifier: 'dev@fedelife.com',
                    password: 'dev123456'
                })
            });

            if (loginResponse.ok) {
                const loginData = await loginResponse.json();
                const token = loginData.data.token;
                
                localStorage.setItem('dev_auth_token', token);
                localStorage.setItem('auth_data', JSON.stringify({
                    token: token,
                    user: loginData.data.user
                }));
                
                console.log(`✅ Login de desarrollo exitoso`);
                return true;
            } else {
                console.log(`❌ No se pudo autenticar automáticamente`);
                return false;
            }
        }
    } catch (error) {
        console.log(`❌ Error en autenticación automática:`, error);
        return false;
    }
}

/**
 * Inicializa el sistema de autenticación
 */
async function initAuth() {
    console.log(`🔐 Inicializando sistema de autenticación...`);
    console.log(`🔗 URL de la API: ${API_CONFIG.BASE_URL}`);
    
    // Verificar estado actual
    const isAuthenticated = checkAuthStatus();
    
    if (!isAuthenticated) {
        // Intentar autenticación automática en desarrollo
        await tryAutoLogin();
        checkAuthStatus(); // Actualizar UI después del intento
    }
    
    console.log(`✅ Sistema de autenticación inicializado`);
}

// Inicializar cuando el DOM esté listo
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initAuth);
} else {
    initAuth();
}

// Agregar event listeners
document.addEventListener('DOMContentLoaded', () => {
    const logoutBtn = document.getElementById('logoutBtn');
    const autoAuthBtn = document.getElementById('autoAuthButton');
    
    if (logoutBtn) {
        logoutBtn.addEventListener('click', logout);
    }
    
    if (autoAuthBtn) {
        autoAuthBtn.addEventListener('click', async () => {
            console.log('🤖 Iniciando autenticación automática...');
            const success = await tryAutoLogin();
            if (success) {
                checkAuthStatus();
                alert('✅ Autenticación automática exitosa!');
            } else {
                alert('❌ No se pudo autenticar automáticamente. Ve a login.html para autenticarte manualmente.');
            }
        });
    }
});

// Exportar funciones para uso global
window.logout = logout;
window.checkAuthStatus = checkAuthStatus;
window.tryAutoLogin = tryAutoLogin;

// Exportar para uso en módulos ES6
export { logout, checkAuthStatus, tryAutoLogin, initAuth };
