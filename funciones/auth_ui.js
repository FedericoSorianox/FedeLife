/**
 * 🔐 INTERFAZ DE AUTENTICACIÓN - FEDE LIFE
 * 
 * Archivo compilado de TypeScript a JavaScript
 * Componente de UI para manejo de login y registro
 * Autor: Senior Full Stack Developer
 */

// ==================== CLASE AUTH UI ====================

/**
 * Gestor de autenticación simple
 */
class SimpleAuthManager {
    constructor() {
        this.authToken = null;
        this.user = null;
        this.loadAuthFromStorage();
    }

    loadAuthFromStorage() {
        try {
            const authData = localStorage.getItem('auth_data');
            if (authData) {
                const parsed = JSON.parse(authData);
                this.authToken = parsed.token;
                this.user = parsed.user;
            }
        } catch (error) {
            console.error('Error cargando datos de autenticación:', error);
        }
    }

    saveAuthToStorage() {
        try {
            const authData = {
                token: this.authToken,
                user: this.user
            };
            localStorage.setItem('auth_data', JSON.stringify(authData));
        } catch (error) {
            console.error('Error guardando datos de autenticación:', error);
        }
    }

    getToken() {
        return this.authToken;
    }

    isAuthenticated() {
        return !!this.authToken;
    }

    getUser() {
        return this.user;
    }

    async login(username, password) {
        try {
            const apiUrl = window.config ? window.config.apiUrl : 'http://localhost:3000/api';
            const response = await fetch(`${apiUrl}/auth/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ identifier: username, password })
            });

            if (response.ok) {
                const data = await response.json();
                this.authToken = data.data.token;
                this.user = data.data.user;
                this.saveAuthToStorage();
                return true;
            }
            return false;
        } catch (error) {
            console.error('Error en login:', error);
            return false;
        }
    }

    async register(username, email, password) {
        try {
            const apiUrl = window.config ? window.config.apiUrl : 'http://localhost:3000/api';
            const response = await fetch(`${apiUrl}/auth/register`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, email, password, firstName: username, lastName: 'User' })
            });

            if (response.ok) {
                const data = await response.json();
                this.authToken = data.data.token;
                this.user = data.data.user;
                this.saveAuthToStorage();
                return true;
            }
            return false;
        } catch (error) {
            console.error('Error en registro:', error);
            return false;
        }
    }

    logout() {
        this.authToken = null;
        this.user = null;
        localStorage.removeItem('auth_data');
    }
}

/**
 * Gestor de interfaz de autenticación
 * Maneja modales de login/registro y estado de autenticación
 */
class AuthUIManager {
    constructor() {
        this.authManager = new SimpleAuthManager();
        this.modals = {};
        this.createAuthModals();
        this.setupAuthEventListeners();
    }

    /**
     * Crea los modales de autenticación en el DOM
     */
    createAuthModals() {
        // Crear modal de login
        const loginModal = document.createElement('div');
        loginModal.id = 'loginModal';
        loginModal.className = 'auth-modal';
        loginModal.innerHTML = `
            <div class="auth-modal-content">
                <div class="auth-modal-header">
                    <h2>🔐 Iniciar Sesión</h2>
                    <button class="auth-modal-close" onclick="authUI.hideModals()">&times;</button>
                </div>
                <form id="loginForm" class="auth-form">
                    <div class="auth-form-group">
                        <label for="loginUsername">Usuario:</label>
                        <input type="text" id="loginUsername" required>
                    </div>
                    <div class="auth-form-group">
                        <label for="loginPassword">Contraseña:</label>
                        <input type="password" id="loginPassword" required>
                    </div>
                    <button type="submit" class="auth-btn auth-btn-primary">Iniciar Sesión</button>
                </form>
                <div class="auth-modal-footer">
                    <p>¿No tienes cuenta? <a href="#" onclick="authUI.showRegisterModal()">Regístrate aquí</a></p>
                </div>
            </div>
        `;

        // Crear modal de registro
        const registerModal = document.createElement('div');
        registerModal.id = 'registerModal';
        registerModal.className = 'auth-modal';
        registerModal.innerHTML = `
            <div class="auth-modal-content">
                <div class="auth-modal-header">
                    <h2>📝 Registrarse</h2>
                    <button class="auth-modal-close" onclick="authUI.hideModals()">&times;</button>
                </div>
                <form id="registerForm" class="auth-form">
                    <div class="auth-form-group">
                        <label for="registerUsername">Usuario:</label>
                        <input type="text" id="registerUsername" required>
                    </div>
                    <div class="auth-form-group">
                        <label for="registerEmail">Email:</label>
                        <input type="email" id="registerEmail" required>
                    </div>
                    <div class="auth-form-group">
                        <label for="registerPassword">Contraseña:</label>
                        <input type="password" id="registerPassword" required>
                    </div>
                    <div class="auth-form-group">
                        <label for="registerConfirmPassword">Confirmar Contraseña:</label>
                        <input type="password" id="registerConfirmPassword" required>
                    </div>
                    <button type="submit" class="auth-btn auth-btn-primary">Registrarse</button>
                </form>
                <div class="auth-modal-footer">
                    <p>¿Ya tienes cuenta? <a href="#" onclick="authUI.showLoginModal()">Inicia sesión aquí</a></p>
                </div>
            </div>
        `;

        // Agregar modales al DOM
        document.body.appendChild(loginModal);
        document.body.appendChild(registerModal);

        // Guardar referencias
        this.modals.login = loginModal;
        this.modals.register = registerModal;
    }

    /**
     * Configura event listeners para los formularios de autenticación
     */
    setupAuthEventListeners() {
        // Login form
        const loginForm = document.getElementById('loginForm');
        if (loginForm) {
            loginForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.handleLogin();
            });
        }

        // Register form
        const registerForm = document.getElementById('registerForm');
        if (registerForm) {
            registerForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.handleRegister();
            });
        }

        // Cerrar modales al hacer clic fuera
        Object.values(this.modals).forEach(modal => {
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    this.hideModals();
                }
            });
        });
    }

    /**
     * Muestra el modal de login
     */
    showLoginModal() {
        this.hideModals();
        this.modals.login.style.display = 'flex';
        const usernameInput = document.getElementById('loginUsername');
        if (usernameInput) usernameInput.focus();
    }

    /**
     * Muestra el modal de registro
     */
    showRegisterModal() {
        this.hideModals();
        this.modals.register.style.display = 'flex';
        const usernameInput = document.getElementById('registerUsername');
        if (usernameInput) usernameInput.focus();
    }

    /**
     * Oculta todos los modales
     */
    hideModals() {
        Object.values(this.modals).forEach(modal => {
            modal.style.display = 'none';
        });
    }

    /**
     * Maneja el proceso de login
     */
    async handleLogin() {
        const username = document.getElementById('loginUsername')?.value;
        const password = document.getElementById('loginPassword')?.value;

        if (!username || !password) {
            this.showAuthNotification('Por favor completa todos los campos', 'error');
            return;
        }

        try {
            const success = await this.authManager.login(username, password);
            if (success) {
                this.hideModals();
                this.showAuthNotification('¡Inicio de sesión exitoso!', 'success');
                this.updateAuthUI();
                
                // Sincronizar datos con el backend
                const financeApp = window.financeApp;
                if (financeApp?.storage?.syncAll) {
                    await financeApp.storage.syncAll();
                }
            } else {
                this.showAuthNotification('Usuario o contraseña incorrectos', 'error');
            }
        } catch (error) {
            console.error('Error en login:', error);
            this.showAuthNotification('Error al iniciar sesión', 'error');
        }
    }

    /**
     * Maneja el proceso de registro
     */
    async handleRegister() {
        const username = document.getElementById('registerUsername')?.value;
        const email = document.getElementById('registerEmail')?.value;
        const password = document.getElementById('registerPassword')?.value;
        const confirmPassword = document.getElementById('registerConfirmPassword')?.value;

        if (!username || !email || !password || !confirmPassword) {
            this.showAuthNotification('Por favor completa todos los campos', 'error');
            return;
        }

        if (password !== confirmPassword) {
            this.showAuthNotification('Las contraseñas no coinciden', 'error');
            return;
        }

        if (password.length < 6) {
            this.showAuthNotification('La contraseña debe tener al menos 6 caracteres', 'error');
            return;
        }

        try {
            const success = await this.authManager.register(username, email, password);
            if (success) {
                this.hideModals();
                this.showAuthNotification('¡Registro exitoso! Bienvenido', 'success');
                this.updateAuthUI();
            } else {
                this.showAuthNotification('Error en el registro. Usuario o email ya existe', 'error');
            }
        } catch (error) {
            console.error('Error en registro:', error);
            this.showAuthNotification('Error al registrarse', 'error');
        }
    }

    /**
     * Cierra la sesión del usuario
     */
    logout() {
        this.authManager.logout();
        this.updateAuthUI();
        this.showAuthNotification('Sesión cerrada', 'info');
    }

    /**
     * Verifica si el usuario está autenticado
     */
    isAuthenticated() {
        return this.authManager.isAuthenticated();
    }

    /**
     * Obtiene datos del usuario actual
     */
    getUser() {
        return this.authManager.getUser();
    }

    /**
     * Actualiza la UI según el estado de autenticación
     */
    updateAuthUI() {
        const authButton = document.getElementById('authButton');
        const userInfo = document.getElementById('userInfo');

        if (this.isAuthenticated()) {
            const user = this.getUser();
            if (authButton) authButton.style.display = 'none';
            if (userInfo) {
                userInfo.style.display = 'block';
                userInfo.innerHTML = `
                    <span>👤 ${user.username}</span>
                    <button onclick="authUI.logout()" class="auth-btn auth-btn-secondary">Cerrar Sesión</button>
                `;
            }
        } else {
            if (authButton) authButton.style.display = 'block';
            if (userInfo) userInfo.style.display = 'none';
        }
    }

    /**
     * Muestra notificaciones de autenticación
     */
    showAuthNotification(message, type) {
        // Usar el sistema de notificaciones existente si está disponible
        const financeApp = window.financeApp;
        if (financeApp?.showNotification) {
            financeApp.showNotification(message, type);
        } else {
            // Notificación simple si no hay sistema disponible
            const notification = document.createElement('div');
            notification.className = `auth-notification auth-notification-${type}`;
            notification.textContent = message;
            document.body.appendChild(notification);

            setTimeout(() => {
                notification.remove();
            }, 3000);
        }
    }
}

// ==================== ESTILOS CSS ====================

/**
 * Agrega estilos CSS para los modales de autenticación
 */
function addAuthStyles() {
    if (document.querySelector('#authStyles')) return;

    const style = document.createElement('style');
    style.id = 'authStyles';
    style.textContent = `
        .auth-modal {
            display: none;
            position: fixed;
            z-index: 1000;
            left: 0;
            top: 0;
            width: 100%;
            height: 100%;
            background-color: rgba(0,0,0,0.5);
            align-items: center;
            justify-content: center;
        }

        .auth-modal-content {
            background-color: white;
            border-radius: 10px;
            padding: 20px;
            width: 90%;
            max-width: 400px;
            box-shadow: 0 4px 20px rgba(0,0,0,0.3);
        }

        .auth-modal-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 20px;
        }

        .auth-modal-header h2 {
            margin: 0;
            color: #333;
        }

        .auth-modal-close {
            background: none;
            border: none;
            font-size: 24px;
            cursor: pointer;
            color: #666;
        }

        .auth-form {
            display: flex;
            flex-direction: column;
            gap: 15px;
        }

        .auth-form-group {
            display: flex;
            flex-direction: column;
            gap: 5px;
        }

        .auth-form-group label {
            font-weight: 500;
            color: #333;
        }

        .auth-form-group input {
            padding: 10px;
            border: 1px solid #ddd;
            border-radius: 5px;
            font-size: 16px;
        }

        .auth-btn {
            padding: 12px 20px;
            border: none;
            border-radius: 5px;
            font-size: 16px;
            cursor: pointer;
            transition: background-color 0.3s;
        }

        .auth-btn-primary {
            background-color: #007bff;
            color: white;
        }

        .auth-btn-primary:hover {
            background-color: #0056b3;
        }

        .auth-btn-secondary {
            background-color: #6c757d;
            color: white;
        }

        .auth-btn-secondary:hover {
            background-color: #545b62;
        }

        .auth-modal-footer {
            margin-top: 20px;
            text-align: center;
        }

        .auth-modal-footer a {
            color: #007bff;
            text-decoration: none;
        }

        .auth-notification {
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 15px 20px;
            border-radius: 5px;
            color: white;
            z-index: 1001;
            animation: slideIn 0.3s ease;
        }

        .auth-notification-success {
            background-color: #28a745;
        }

        .auth-notification-error {
            background-color: #dc3545;
        }

        .auth-notification-info {
            background-color: #17a2b8;
        }

        @keyframes slideIn {
            from {
                transform: translateX(100%);
                opacity: 0;
            }
            to {
                transform: translateX(0);
                opacity: 1;
            }
        }

        #authButton {
            background-color: #007bff;
            color: white;
            border: none;
            padding: 10px 20px;
            border-radius: 5px;
            cursor: pointer;
            font-size: 14px;
        }

        #userInfo {
            display: flex;
            align-items: center;
            gap: 10px;
            font-size: 14px;
        }
    `;
    document.head.appendChild(style);
}

// ==================== INICIALIZACIÓN ====================

// Agregar estilos cuando se carga el script
addAuthStyles();

// Crear instancia global
const authUI = new AuthUIManager();

// Hacer disponible globalmente
if (typeof window !== 'undefined') {
    window.authUI = authUI;
}

export default authUI;
