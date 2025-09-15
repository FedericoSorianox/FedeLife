/**
 * 🚀 PUNTO DE ENTRADA PRINCIPAL - FEDE LIFE FINANZAS
 * 
 * Archivo compilado de TypeScript a JavaScript
 * Este archivo sirve como punto de entrada principal para todas las funciones
 * de la aplicación de finanzas. Importa y inicializa todos los módulos necesarios.
 * 
 * Autor: Senior Full Stack Developer
 */

// ==================== IMPORTS SEGUROS ====================

// Función para importar módulos de forma segura
async function safeImport(modulePath, moduleName) {
    try {
        // Intentar importar el módulo
        const module = await import(modulePath);
        return module;
    } catch (error) {
        return null;
    }
}

// ==================== INICIALIZACIÓN SEGURA ====================

/**
 * Función de inicialización principal
 * Se ejecuta cuando el DOM está listo
 */
async function initializeApp() {
    
    try {
        // Verificar que todos los componentes estén disponibles
        if (typeof window !== 'undefined') {
            
            // Verificar conectividad antes de cargar módulos
            await checkInitialConnectivity();
            
            // Cargar módulos de forma segura
            await loadModules();
            
            // Verificar authUI
            if (window.authUI) {
            } else {
            }
            
            // Verificar financeApp
            if (window.financeApp) {
            } else {
            }
            
            // Verificar config
            if (window.config) {
            } else {
            }
            
        }
    } catch (error) {
        // Mostrar mensaje de error al usuario
        showErrorMessage('Error al inicializar el sistema. Por favor, recarga la página.');
    }
}

/**
 * Verifica la conectividad inicial del sistema
 */
async function checkInitialConnectivity() {
    try {
        
        // Verificar conexión a internet usando un endpoint permitido por CSP
        try {
            const internetCheck = await fetch('https://api.exchangerate.host/latest', {
                method: 'HEAD',
                mode: 'no-cors'
            });
            
            if (internetCheck) {
            }
        } catch (error) {
        }
        
        // Verificar configuración local
        if (window.config && window.config.apiUrl) {
        } else {
        }
        
    } catch (error) {
        // Continuar con la inicialización aunque haya problemas de conectividad
    }
}

/**
 * Carga todos los módulos necesarios de forma segura
 */
async function loadModules() {
    try {
        
        // Cargar módulos principales
        await safeImport('/funciones/types.js', 'Types');
        await safeImport('/funciones/config-production.js', 'Config Production');
        await safeImport('/funciones/google_ai_analyzer.js', 'Google AI Analyzer');
        await safeImport('/funciones/charts_manager.js', 'Charts Manager');
        await safeImport('/funciones/financial_chat.js', 'Financial Chat');
        await safeImport('/funciones/auth_ui.js', 'Auth UI');
        await safeImport('/funciones/finanzas.js', 'Finanzas');
        
    } catch (error) {
        throw error;
    }
}

/**
 * Muestra mensajes de error al usuario
 */
function showErrorMessage(message) {
    try {
        // Crear notificación de error
        const errorDiv = document.createElement('div');
        errorDiv.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background-color: #dc3545;
            color: white;
            padding: 15px 20px;
            border-radius: 5px;
            z-index: 10000;
            max-width: 300px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.3);
        `;
        errorDiv.textContent = message;
        
        // Agregar botón de cerrar
        const closeBtn = document.createElement('button');
        closeBtn.textContent = '×';
        closeBtn.style.cssText = `
            background: none;
            border: none;
            color: white;
            font-size: 20px;
            cursor: pointer;
            margin-left: 10px;
        `;
        closeBtn.onclick = () => errorDiv.remove();
        errorDiv.appendChild(closeBtn);
        
        document.body.appendChild(errorDiv);
        
        // Auto-remover después de 10 segundos
        setTimeout(() => {
            if (errorDiv.parentNode) {
                errorDiv.remove();
            }
        }, 10000);
        
    } catch (error) {
    }
}

// ==================== EVENT LISTENERS ====================

// Inicializar cuando el DOM esté listo
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeApp);
} else {
    // Si el DOM ya está listo, inicializar inmediatamente
    initializeApp();
}

// Exportar función de inicialización para uso manual si es necesario
export { initializeApp };

// Hacer disponible globalmente para compatibilidad
if (typeof window !== 'undefined') {
    window.initializeApp = initializeApp;
}
