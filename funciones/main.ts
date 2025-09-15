/**
 * 🚀 PUNTO DE ENTRADA PRINCIPAL - FEDE LIFE FINANZAS
 * 
 * Este archivo sirve como punto de entrada principal para todas las funciones
 * de la aplicación de finanzas. Importa y inicializa todos los módulos necesarios.
 * 
 * Autor: Senior Full Stack Developer
 */

// ==================== IMPORTS SEGUROS ====================

// Función para importar módulos de forma segura
async function safeImport(modulePath: string, moduleName: string): Promise<any> {
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
    }
}

/**
 * Carga todos los módulos necesarios de forma segura
 */
async function loadModules(): Promise<void> {
    try {
        // Cargar módulos principales
        await safeImport('./types.js', 'Types');
        await safeImport('./config.js', 'Config');
        await safeImport('./google_ai_analyzer.js', 'Google AI Analyzer');
        await safeImport('./charts_manager.js', 'Charts Manager');
        await safeImport('./financial_chat.js', 'Financial Chat');
        await safeImport('./auth_ui.js', 'Auth UI');
        await safeImport('./finanzas.js', 'Finanzas');
        
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
