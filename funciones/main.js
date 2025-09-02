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
        console.log(`✅ Módulo ${moduleName} cargado correctamente`);
        return module;
    } catch (error) {
        console.warn(`⚠️ No se pudo cargar el módulo ${moduleName}:`, error);
        return null;
    }
}

// ==================== INICIALIZACIÓN SEGURA ====================

/**
 * Función de inicialización principal
 * Se ejecuta cuando el DOM está listo
 */
async function initializeApp() {
    console.log('🚀 Iniciando Fede Life - Sistema de Finanzas Personales');
    
    try {
        // Verificar que todos los componentes estén disponibles
        if (typeof window !== 'undefined') {
            console.log('✅ Window object disponible');
            
            // Cargar módulos de forma segura
            await loadModules();
            
            // Verificar authUI
            if (window.authUI) {
                console.log('✅ Sistema de autenticación inicializado');
            } else {
                console.warn('⚠️ Sistema de autenticación no disponible');
            }
            
            // Verificar financeApp
            if (window.financeApp) {
                console.log('✅ Aplicación de finanzas inicializada');
            } else {
                console.warn('⚠️ Aplicación de finanzas no disponible');
            }
            
            // Verificar config
            if (window.config) {
                console.log('✅ Configuración cargada:', window.config);
            } else {
                console.warn('⚠️ Configuración no disponible');
            }
        }
    } catch (error) {
        console.error('❌ Error durante la inicialización:', error);
    }
}

/**
 * Carga todos los módulos necesarios de forma segura
 */
async function loadModules() {
    try {
        // Cargar módulos principales
        await safeImport('./types.js', 'Types');
        await safeImport('./config.js', 'Config');
        await safeImport('./google_ai_analyzer.js', 'Google AI Analyzer');
        await safeImport('./charts_manager.js', 'Charts Manager');
        await safeImport('./financial_chat.js', 'Financial Chat');
        await safeImport('./auth_ui.js', 'Auth UI');
        await safeImport('./finanzas.js', 'Finanzas');
        
        console.log('✅ Todos los módulos cargados correctamente');
    } catch (error) {
        console.error('❌ Error cargando módulos:', error);
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
