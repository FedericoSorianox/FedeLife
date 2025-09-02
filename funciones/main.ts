/**
 * 🚀 PUNTO DE ENTRADA PRINCIPAL - FEDE LIFE FINANZAS
 * 
 * Este archivo sirve como punto de entrada principal para todas las funciones
 * de la aplicación de finanzas. Importa y inicializa todos los módulos necesarios.
 * 
 * Autor: Senior Full Stack Developer
 */

// ==================== IMPORTS ====================

// Importar tipos y configuraciones
import './types';
import './config';
import type { AuthUI, FinanceApp, ConfigObject } from './types';

// Importar análisis de Google AI
import './google_ai_analyzer';

// Importar manager de gráficos
import './charts_manager';

// Importar chat financiero
import './financial_chat';

// Importar UI de autenticación
import './auth_ui';

// Importar funciones principales de finanzas
import './finanzas';

// ==================== INICIALIZACIÓN ====================

/**
 * Función de inicialización principal
 * Se ejecuta cuando el DOM está listo
 */
function initializeApp() {
    console.log('🚀 Iniciando Fede Life - Sistema de Finanzas Personales');
    
    // Verificar que todos los componentes estén disponibles
    if (typeof window !== 'undefined') {
        console.log('✅ Window object disponible');
        
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
