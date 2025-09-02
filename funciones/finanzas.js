/**
 * 🏦 SISTEMA DE FINANZAS PERSONALES - FEDE LIFE
 * 
 * Archivo compilado de TypeScript a JavaScript
 * Arquitectura: Modular con patrón Repository, Manager y Controller
 * Autor: Senior Backend Developer
 * Descripción: Sistema completo para gestión de finanzas personales
 */

// ==================== CONSTANTES Y CONFIGURACIÓN ====================

/**
 * Tipo de transacción financiera
 */
const TransactionType = {
    INCOME: 'income',
    EXPENSE: 'expense'
};

/**
 * Métodos de pago disponibles
 */
const PaymentMethod = {
    CASH: 'cash',
    CARD: 'card',
    TRANSFER: 'transfer',
    CHECK: 'check'
};

/**
 * Períodos para reportes
 */
const ReportPeriod = {
    CURRENT_MONTH: 'current-month',
    LAST_MONTH: 'last-month',
    LAST_3_MONTHS: 'last-3-months',
    LAST_6_MONTHS: 'last-6-months',
    CURRENT_YEAR: 'current-year'
};

// ==================== CLASE PRINCIPAL DE FINANZAS ====================

/**
 * Clase principal del sistema de finanzas
 * Maneja todas las operaciones financieras del usuario
 */
class FinanceApp {
    constructor() {
        this.transactions = [];
        this.categories = [];
        this.budgets = [];
        this.goals = [];
        this.isInitialized = false;
        
        this.initializeApp();
    }

    /**
     * Inicializa la aplicación de finanzas
     */
    async initializeApp() {
        try {
            console.log('🚀 Inicializando sistema de finanzas...');
            
            // Cargar datos del localStorage
            this.loadDataFromStorage();
            
            // Inicializar categorías por defecto si no existen
            if (this.categories.length === 0) {
                this.initializeDefaultCategories();
            }
            
            // Configurar event listeners
            this.setupEventListeners();
            
            // Marcar como inicializado
            this.isInitialized = true;
            
            console.log('✅ Sistema de finanzas inicializado correctamente');
            
            // Renderizar datos iniciales
            this.renderDashboard();
            
        } catch (error) {
            console.error('❌ Error inicializando sistema de finanzas:', error);
        }
    }

    /**
     * Carga datos del localStorage
     */
    loadDataFromStorage() {
        try {
            // Cargar transacciones
            const storedTransactions = localStorage.getItem('fede_life_transactions');
            if (storedTransactions) {
                this.transactions = JSON.parse(storedTransactions);
            }

            // Cargar categorías
            const storedCategories = localStorage.getItem('fede_life_categories');
            if (storedCategories) {
                this.categories = JSON.parse(storedCategories);
            }

            // Cargar presupuestos
            const storedBudgets = localStorage.getItem('fede_life_budgets');
            if (storedBudgets) {
                this.budgets = JSON.parse(storedBudgets);
            }

            // Cargar metas
            const storedGoals = localStorage.getItem('fede_life_goals');
            if (storedGoals) {
                this.goals = JSON.parse(storedGoals);
            }

            console.log('📊 Datos cargados del almacenamiento local');
        } catch (error) {
            console.error('❌ Error cargando datos del localStorage:', error);
        }
    }

    /**
     * Guarda datos en el localStorage
     */
    saveDataToStorage() {
        try {
            localStorage.setItem('fede_life_transactions', JSON.stringify(this.transactions));
            localStorage.setItem('fede_life_categories', JSON.stringify(this.categories));
            localStorage.setItem('fede_life_budgets', JSON.stringify(this.budgets));
            localStorage.setItem('fede_life_goals', JSON.stringify(this.goals));
            
            console.log('💾 Datos guardados en almacenamiento local');
        } catch (error) {
            console.error('❌ Error guardando datos en localStorage:', error);
        }
    }

    /**
     * Inicializa categorías por defecto
     */
    initializeDefaultCategories() {
        this.categories = [
            // Ingresos
            { id: 'cat_income_1', name: 'Salario', type: 'income', color: '#27ae60', createdAt: new Date() },
            { id: 'cat_income_2', name: 'Freelance', type: 'income', color: '#2ecc71', createdAt: new Date() },
            { id: 'cat_income_3', name: 'Inversiones', type: 'income', color: '#16a085', createdAt: new Date() },
            { id: 'cat_income_4', name: 'Otros Ingresos', type: 'income', color: '#1abc9c', createdAt: new Date() },
            
            // Gastos
            { id: 'cat_expense_1', name: 'Alimentación', type: 'expense', color: '#e74c3c', createdAt: new Date() },
            { id: 'cat_expense_2', name: 'Transporte', type: 'expense', color: '#f39c12', createdAt: new Date() },
            { id: 'cat_expense_3', name: 'Vivienda', type: 'expense', color: '#e67e22', createdAt: new Date() },
            { id: 'cat_expense_4', name: 'Servicios', type: 'expense', color: '#d35400', createdAt: new Date() },
            { id: 'cat_expense_5', name: 'Entretenimiento', type: 'expense', color: '#9b59b6', createdAt: new Date() },
            { id: 'cat_expense_6', name: 'Salud', type: 'expense', color: '#3498db', createdAt: new Date() },
            { id: 'cat_expense_7', name: 'Educación', type: 'expense', color: '#2980b9', createdAt: new Date() },
            { id: 'cat_expense_8', name: 'Ropa', type: 'expense', color: '#8e44ad', createdAt: new Date() },
            { id: 'cat_expense_9', name: 'Otros Gastos', type: 'expense', color: '#95a5a6', createdAt: new Date() }
        ];
        
        this.saveDataToStorage();
        console.log('🏷️ Categorías por defecto inicializadas');
    }

    /**
     * Configura event listeners de la aplicación
     */
    setupEventListeners() {
        // Botón para agregar transacción
        const addTransactionBtn = document.getElementById('addTransactionBtn');
        if (addTransactionBtn) {
            addTransactionBtn.addEventListener('click', () => this.showAddTransactionModal());
        }

        // Botón para agregar categoría
        const addCategoryBtn = document.getElementById('addCategoryBtn');
        if (addCategoryBtn) {
            addCategoryBtn.addEventListener('click', () => this.showAddCategoryModal());
        }

        // Botón para agregar presupuesto
        const addBudgetBtn = document.getElementById('addBudgetBtn');
        if (addBudgetBtn) {
            addBudgetBtn.addEventListener('click', () => this.showAddBudgetModal());
        }

        // Botón para agregar meta
        const addGoalBtn = document.getElementById('addGoalBtn');
        if (addGoalBtn) {
            addGoalBtn.addEventListener('click', () => this.showAddGoalModal());
        }

        console.log('🎯 Event listeners configurados');
    }

    /**
     * Renderiza el dashboard principal
     */
    renderDashboard() {
        try {
            // Calcular resumen financiero
            const summary = this.calculateFinancialSummary();
            
            // Renderizar resumen
            this.renderFinancialSummary(summary);
            
            // Renderizar transacciones recientes
            this.renderRecentTransactions();
            
            // Renderizar gráficos si están disponibles
            if (window.chartsManager) {
                this.renderCharts();
            }
            
            console.log('📊 Dashboard renderizado correctamente');
        } catch (error) {
            console.error('❌ Error renderizando dashboard:', error);
        }
    }

    /**
     * Calcula el resumen financiero
     * @returns {Object} Resumen financiero
     */
    calculateFinancialSummary() {
        const now = new Date();
        const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
        
        // Filtrar transacciones del mes actual
        const currentMonthTransactions = this.transactions.filter(t => {
            const transactionDate = new Date(t.date);
            const transactionMonth = `${transactionDate.getFullYear()}-${String(transactionDate.getMonth() + 1).padStart(2, '0')}`;
            return transactionMonth === currentMonth;
        });

        // Calcular totales
        const totalIncome = currentMonthTransactions
            .filter(t => t.type === TransactionType.INCOME)
            .reduce((sum, t) => sum + t.amount, 0);

        const totalExpenses = currentMonthTransactions
            .filter(t => t.type === TransactionType.EXPENSE)
            .reduce((sum, t) => sum + t.amount, 0);

        const balance = totalIncome - totalExpenses;
        const totalSavings = this.goals.reduce((sum, g) => sum + g.currentSaved, 0);

        return {
            totalIncome,
            totalExpenses,
            balance,
            totalSavings,
            transactionCount: currentMonthTransactions.length
        };
    }

    /**
     * Renderiza el resumen financiero
     * @param {Object} summary - Resumen financiero
     */
    renderFinancialSummary(summary) {
        // Actualizar elementos del DOM
        const totalIncomeEl = document.getElementById('totalIncome');
        if (totalIncomeEl) {
            totalIncomeEl.textContent = `$${summary.totalIncome.toLocaleString('es-AR')}`;
        }

        const totalExpensesEl = document.getElementById('totalExpenses');
        if (totalExpensesEl) {
            totalExpensesEl.textContent = `$${summary.totalExpenses.toLocaleString('es-AR')}`;
        }

        const balanceEl = document.getElementById('balance');
        if (balanceEl) {
            balanceEl.textContent = `$${summary.balance.toLocaleString('es-AR')}`;
            balanceEl.className = summary.balance >= 0 ? 'positive' : 'negative';
        }

        const totalSavingsEl = document.getElementById('totalSavings');
        if (totalSavingsEl) {
            totalSavingsEl.textContent = `$${summary.totalSavings.toLocaleString('es-AR')}`;
        }
    }

    /**
     * Renderiza transacciones recientes
     */
    renderRecentTransactions() {
        const container = document.getElementById('recentTransactions');
        if (!container) return;

        // Obtener últimas 5 transacciones
        const recentTransactions = this.transactions
            .sort((a, b) => new Date(b.date) - new Date(a.date))
            .slice(0, 5);

        if (recentTransactions.length === 0) {
            container.innerHTML = '<p class="no-data">No hay transacciones recientes</p>';
            return;
        }

        const transactionsHTML = recentTransactions.map(transaction => `
            <div class="transaction-item ${transaction.type}">
                <div class="transaction-info">
                    <span class="transaction-description">${transaction.description}</span>
                    <span class="transaction-category">${transaction.category}</span>
                </div>
                <div class="transaction-amount">
                    <span class="amount ${transaction.type}">
                        ${transaction.type === TransactionType.INCOME ? '+' : '-'}$${transaction.amount.toLocaleString('es-AR')}
                    </span>
                    <span class="transaction-date">${new Date(transaction.date).toLocaleDateString('es-AR')}</span>
                </div>
            </div>
        `).join('');

        container.innerHTML = transactionsHTML;
    }

    /**
     * Renderiza gráficos si están disponibles
     */
    renderCharts() {
        try {
            if (!window.chartsManager) return;

            // Preparar datos para gráficos
            const expensesData = this.prepareChartData('expense');
            const incomeData = this.prepareChartData('income');

            // Crear gráficos
            window.chartsManager.createExpensesChart(expensesData);
            window.chartsManager.createIncomeChart(incomeData);

            console.log('📊 Gráficos renderizados correctamente');
        } catch (error) {
            console.error('❌ Error renderizando gráficos:', error);
        }
    }

    /**
     * Prepara datos para gráficos
     * @param {string} type - Tipo de datos (expense/income)
     * @returns {Array} Datos formateados para gráficos
     */
    prepareChartData(type) {
        const now = new Date();
        const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
        
        // Filtrar transacciones del mes actual por tipo
        const monthTransactions = this.transactions.filter(t => {
            const transactionDate = new Date(t.date);
            const transactionMonth = `${transactionDate.getFullYear()}-${String(transactionDate.getMonth() + 1).padStart(2, '0')}`;
            return transactionMonth === currentMonth && t.type === type;
        });

        // Agrupar por categoría
        const categoryTotals = {};
        monthTransactions.forEach(transaction => {
            if (!categoryTotals[transaction.category]) {
                categoryTotals[transaction.category] = 0;
            }
            categoryTotals[transaction.category] += transaction.amount;
        });

        // Convertir a array y agregar información de color
        return Object.entries(categoryTotals).map(([categoryName, total]) => {
            const category = this.categories.find(c => c.name === categoryName);
            return {
                name: categoryName,
                total: total,
                color: category ? category.color : '#95a5a6'
            };
        });
    }

    // ==================== MÉTODOS DE NOTIFICACIÓN ====================

    /**
     * Muestra una notificación
     * @param {string} message - Mensaje de la notificación
     * @param {string} type - Tipo de notificación (success, error, warning, info)
     */
    showNotification(message, type = 'info') {
        try {
            // Crear elemento de notificación
            const notification = document.createElement('div');
            notification.className = `notification notification-${type}`;
            notification.textContent = message;

            // Agregar al DOM
            document.body.appendChild(notification);

            // Mostrar con animación
            setTimeout(() => {
                notification.classList.add('show');
            }, 100);

            // Ocultar después de 5 segundos
            setTimeout(() => {
                notification.classList.remove('show');
                setTimeout(() => {
                    if (notification.parentNode) {
                        notification.parentNode.removeChild(notification);
                    }
                }, 300);
            }, 5000);

            console.log(`📢 Notificación ${type}: ${message}`);
        } catch (error) {
            console.error('❌ Error mostrando notificación:', error);
        }
    }

    // ==================== MÉTODOS DE ALMACENAMIENTO ====================

    /**
     * Sincroniza todos los datos
     */
    async syncAll() {
        try {
            console.log('🔄 Sincronizando datos...');
            
            // Guardar en localStorage
            this.saveDataToStorage();
            
            // Aquí se podría agregar sincronización con backend
            // await this.syncWithBackend();
            
            console.log('✅ Datos sincronizados correctamente');
        } catch (error) {
            console.error('❌ Error sincronizando datos:', error);
        }
    }

    // ==================== MÉTODOS DE UTILIDAD ====================

    /**
     * Genera un ID único
     * @returns {string} ID único
     */
    generateId() {
        return `id_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    /**
     * Formatea un número como moneda
     * @param {number} amount - Monto a formatear
     * @returns {string} String formateado
     */
    formatCurrency(amount) {
        return new Intl.NumberFormat('es-AR', {
            style: 'currency',
            currency: 'ARS',
            minimumFractionDigits: 0,
            maximumFractionDigits: 0
        }).format(amount);
    }
}

// ==================== INICIALIZACIÓN ====================

// Crear instancia global
const financeApp = new FinanceApp();

// Hacer disponible globalmente
if (typeof window !== 'undefined') {
    window.financeApp = financeApp;
}

export default financeApp;
