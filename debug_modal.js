// Diagnóstico y corrección del modal de metas
document.addEventListener('DOMContentLoaded', function() {
    console.log('🔍 Checking goal modal immediately...');

    // Forzar el cierre del modal inmediatamente
    const goalModal = document.getElementById('goalModal');
    if (goalModal) {
        goalModal.style.display = 'none !important';
        goalModal.style.setProperty('display', 'none', 'important');
        console.log('✅ Forced goal modal to close');
    }

    checkGoalModal();

    setTimeout(() => {
        console.log('🔍 Checking goal modal after 1 second...');
        // Verificar nuevamente y forzar cierre si es necesario
        if (goalModal) {
            goalModal.style.display = 'none !important';
            goalModal.style.setProperty('display', 'none', 'important');
        }
        checkGoalModal();
    }, 1000);

    setTimeout(() => {
        console.log('🔍 Checking goal modal after 3 seconds...');
        // Verificar nuevamente y forzar cierre si es necesario
        if (goalModal) {
            goalModal.style.display = 'none !important';
            goalModal.style.setProperty('display', 'none', 'important');
        }
        checkGoalModal();
    }, 3000);

    // Verificar si hay llamadas a openGoalModal
    const originalOpenGoalModal = window.financeApp?.openGoalModal;
    if (originalOpenGoalModal) {
        window.financeApp.openGoalModal = function() {
            console.log('🚨 openGoalModal called!', new Error().stack);
            return originalOpenGoalModal.apply(this, arguments);
        };
    }

    // Verificar cambios en el display del modal
    if (goalModal) {
        const observer = new MutationObserver(function(mutations) {
            mutations.forEach(function(mutation) {
                if (mutation.type === 'attributes' && mutation.attributeName === 'style') {
                    console.log('🎨 Goal modal style changed:', goalModal.getAttribute('style'));
                    // Si alguien intenta mostrar el modal, cerrarlo inmediatamente
                    const display = goalModal.style.display || window.getComputedStyle(goalModal).display;
                    if (display !== 'none') {
                        console.log('🚨 Modal was opened, forcing close...');
                        goalModal.style.setProperty('display', 'none', 'important');
                    }
                }
            });
        });
        observer.observe(goalModal, { attributes: true, attributeFilter: ['style'] });
    }
});

function checkGoalModal() {
    const goalModal = document.getElementById('goalModal');
    if (goalModal) {
        const computedStyle = window.getComputedStyle(goalModal);
        console.log('🎯 Goal Modal Status:');
        console.log('  Display:', computedStyle.display);
        console.log('  Visibility:', computedStyle.visibility);
        console.log('  Opacity:', computedStyle.opacity);
        console.log('  Z-index:', computedStyle.zIndex);
        console.log('  Inline styles:', goalModal.getAttribute('style'));
        console.log('  Classes:', goalModal.className);

        // Verificar si hay algún script que haya modificado el modal
        const scripts = document.querySelectorAll('script');
        console.log('  Scripts loaded:', scripts.length);

        // Verificar si hay estilos que puedan estar afectando
        const allStyles = document.querySelectorAll('style, link[rel="stylesheet"]');
        console.log('  Stylesheets loaded:', allStyles.length);
    } else {
        console.log('❌ Goal modal not found');
    }
}

