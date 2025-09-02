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
            
            // Renderizar categorías
            this.renderCategories();
            
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

    /**
     * Renderiza las categorías disponibles
     */
    renderCategories() {
        try {
            // Renderizar categorías de ingresos
            this.renderCategorySection('incomeCategories', 'income', 'Ingresos');
            
            // Renderizar categorías de gastos
            this.renderCategorySection('expenseCategories', 'expense', 'Gastos');
            
            console.log('🏷️ Categorías renderizadas correctamente');
        } catch (error) {
            console.error('❌ Error renderizando categorías:', error);
        }
    }

    /**
     * Renderiza una sección de categorías
     * @param {string} containerId - ID del contenedor
     * @param {string} type - Tipo de categoría (income/expense)
     * @param {string} title - Título de la sección
     */
    renderCategorySection(containerId, type, title) {
        const container = document.getElementById(containerId);
        if (!container) {
            console.warn(`⚠️ Contenedor ${containerId} no encontrado`);
            return;
        }

        // Filtrar categorías por tipo
        const typeCategories = this.categories.filter(cat => cat.type === type);
        
        if (typeCategories.length === 0) {
            container.innerHTML = `<p class="no-categories">No hay categorías de ${title.toLowerCase()}</p>`;
            return;
        }

        // Crear HTML para las categorías
        const categoriesHTML = typeCategories.map(category => `
            <div class="category-item" data-category-id="${category.id}">
                <div class="category-color" style="background-color: ${category.color}"></div>
                <div class="category-info">
                    <span class="category-name">${category.name}</span>
                    <span class="category-count">${this.getTransactionCountByCategory(category.name)} transacciones</span>
                </div>
                <div class="category-actions">
                    <button class="btn-edit-category" onclick="window.financeApp.editCategory('${category.id}')" title="Editar categoría">
                        ✏️
                    </button>
                    <button class="btn-delete-category" onclick="window.financeApp.deleteCategory('${category.id}')" title="Eliminar categoría">
                        🗑️
                    </button>
                </div>
            </div>
        `).join('');

        container.innerHTML = `
            <h3 class="category-section-title">${title}</h3>
            <div class="categories-list">
                ${categoriesHTML}
            </div>
        `;
    }

    /**
     * Obtiene el número de transacciones por categoría
     * @param {string} categoryName - Nombre de la categoría
     * @returns {number} Número de transacciones
     */
    getTransactionCountByCategory(categoryName) {
        return this.transactions.filter(t => t.category === categoryName).length;
    }

    /**
     * Muestra el modal para agregar categoría
     */
    showAddCategoryModal() {
        try {
            // Crear modal
            const modal = document.createElement('div');
            modal.className = 'modal-overlay';
            modal.innerHTML = `
                <div class="modal-content">
                    <div class="modal-header">
                        <h3>➕ Agregar Nueva Categoría</h3>
                        <button class="modal-close" onclick="this.closest('.modal-overlay').remove()">×</button>
                    </div>
                    <div class="modal-body">
                        <form id="addCategoryForm">
                            <div class="form-group">
                                <label for="categoryName">Nombre de la categoría:</label>
                                <input type="text" id="categoryName" required placeholder="Ej: Comida, Transporte...">
                            </div>
                            <div class="form-group">
                                <label for="categoryType">Tipo:</label>
                                <select id="categoryType" required>
                                    <option value="income">Ingreso</option>
                                    <option value="expense">Gasto</option>
                                </select>
                            </div>
                            <div class="form-group">
                                <label for="categoryColor">Color:</label>
                                <input type="color" id="categoryColor" value="#3498db">
                            </div>
                            <div class="form-actions">
                                <button type="button" onclick="this.closest('.modal-overlay').remove()">Cancelar</button>
                                <button type="submit">Agregar Categoría</button>
                            </div>
                        </form>
                    </div>
                </div>
            `;

            // Agregar al DOM
            document.body.appendChild(modal);

            // Configurar formulario
            const form = modal.querySelector('#addCategoryForm');
            form.addEventListener('submit', (e) => {
                e.preventDefault();
                this.addNewCategory();
                modal.remove();
            });

            console.log('📝 Modal de agregar categoría mostrado');
        } catch (error) {
            console.error('❌ Error mostrando modal de categoría:', error);
        }
    }

    /**
     * Agrega una nueva categoría
     */
    addNewCategory() {
        try {
            const name = document.getElementById('categoryName').value.trim();
            const type = document.getElementById('categoryType').value;
            const color = document.getElementById('categoryColor').value;

            if (!name) {
                this.showNotification('El nombre de la categoría es requerido', 'error');
                return;
            }

            // Verificar que no exista una categoría con el mismo nombre
            if (this.categories.some(cat => cat.name.toLowerCase() === name.toLowerCase())) {
                this.showNotification('Ya existe una categoría con ese nombre', 'error');
                return;
            }

            // Crear nueva categoría
            const newCategory = {
                id: this.generateId(),
                name: name,
                type: type,
                color: color,
                createdAt: new Date()
            };

            // Agregar a la lista
            this.categories.push(newCategory);

            // Guardar en localStorage
            this.saveDataToStorage();

            // Re-renderizar categorías
            this.renderCategories();

            // Mostrar notificación
            this.showNotification(`Categoría "${name}" agregada correctamente`, 'success');

            console.log('✅ Nueva categoría agregada:', newCategory);
        } catch (error) {
            console.error('❌ Error agregando categoría:', error);
            this.showNotification('Error al agregar la categoría', 'error');
        }
    }

    /**
     * Edita una categoría existente
     * @param {string} categoryId - ID de la categoría
     */
    editCategory(categoryId) {
        try {
            const category = this.categories.find(cat => cat.id === categoryId);
            if (!category) {
                this.showNotification('Categoría no encontrada', 'error');
                return;
            }

            // Crear modal de edición
            const modal = document.createElement('div');
            modal.className = 'modal-overlay';
            modal.innerHTML = `
                <div class="modal-content">
                    <div class="modal-header">
                        <h3>✏️ Editar Categoría</h3>
                        <button class="modal-close" onclick="this.closest('.modal-overlay').remove()">×</button>
                    </div>
                    <div class="modal-body">
                        <form id="editCategoryForm">
                            <div class="form-group">
                                <label for="editCategoryName">Nombre de la categoría:</label>
                                <input type="text" id="editCategoryName" value="${category.name}" required>
                            </div>
                            <div class="form-group">
                                <label for="editCategoryType">Tipo:</label>
                                <select id="editCategoryType" required>
                                    <option value="income" ${category.type === 'income' ? 'selected' : ''}>Ingreso</option>
                                    <option value="expense" ${category.type === 'expense' ? 'selected' : ''}>Gasto</option>
                                </select>
                            </div>
                            <div class="form-group">
                                <label for="editCategoryColor">Color:</label>
                                <input type="color" id="editCategoryColor" value="${category.color}">
                            </div>
                            <div class="form-actions">
                                <button type="button" onclick="this.closest('.modal-overlay').remove()">Cancelar</button>
                                <button type="submit">Guardar Cambios</button>
                            </div>
                        </form>
                    </div>
                </div>
            `;

            // Agregar al DOM
            document.body.appendChild(modal);

            // Configurar formulario
            const form = modal.querySelector('#editCategoryForm');
            form.addEventListener('submit', (e) => {
                e.preventDefault();
                this.updateCategory(categoryId);
                modal.remove();
            });

            console.log('✏️ Modal de editar categoría mostrado');
        } catch (error) {
            console.error('❌ Error mostrando modal de edición:', error);
        }
    }

    /**
     * Actualiza una categoría existente
     * @param {string} categoryId - ID de la categoría
     */
    updateCategory(categoryId) {
        try {
            const name = document.getElementById('editCategoryName').value.trim();
            const type = document.getElementById('editCategoryType').value;
            const color = document.getElementById('editCategoryColor').value;

            if (!name) {
                this.showNotification('El nombre de la categoría es requerido', 'error');
                return;
            }

            // Verificar que no exista otra categoría con el mismo nombre
            const existingCategory = this.categories.find(cat => 
                cat.id !== categoryId && cat.name.toLowerCase() === name.toLowerCase()
            );
            
            if (existingCategory) {
                this.showNotification('Ya existe otra categoría con ese nombre', 'error');
                return;
            }

            // Actualizar categoría
            const categoryIndex = this.categories.findIndex(cat => cat.id === categoryId);
            if (categoryIndex !== -1) {
                this.categories[categoryIndex] = {
                    ...this.categories[categoryIndex],
                    name: name,
                    type: type,
                    color: color,
                    updatedAt: new Date()
                };

                // Guardar en localStorage
                this.saveDataToStorage();

                // Re-renderizar categorías
                this.renderCategories();

                // Mostrar notificación
                this.showNotification(`Categoría "${name}" actualizada correctamente`, 'success');

                console.log('✅ Categoría actualizada:', this.categories[categoryIndex]);
            }
        } catch (error) {
            console.error('❌ Error actualizando categoría:', error);
            this.showNotification('Error al actualizar la categoría', 'error');
        }
    }

    /**
     * Elimina una categoría
     * @param {string} categoryId - ID de la categoría
     */
    deleteCategory(categoryId) {
        try {
            const category = this.categories.find(cat => cat.id === categoryId);
            if (!category) {
                this.showNotification('Categoría no encontrada', 'error');
                return;
            }

            // Verificar si hay transacciones usando esta categoría
            const transactionsUsingCategory = this.transactions.filter(t => t.category === category.name);
            if (transactionsUsingCategory.length > 0) {
                const confirmDelete = confirm(
                    `La categoría "${category.name}" tiene ${transactionsUsingCategory.length} transacciones. ` +
                    '¿Estás seguro de que quieres eliminarla? Las transacciones quedarán sin categoría.'
                );
                
                if (!confirmDelete) return;
            }

            // Eliminar categoría
            this.categories = this.categories.filter(cat => cat.id !== categoryId);

            // Guardar en localStorage
            this.saveDataToStorage();

            // Re-renderizar categorías
            this.renderCategories();

            // Mostrar notificación
            this.showNotification(`Categoría "${category.name}" eliminada correctamente`, 'success');

            console.log('🗑️ Categoría eliminada:', category);
        } catch (error) {
            console.error('❌ Error eliminando categoría:', error);
            this.showNotification('Error al eliminar la categoría', 'error');
        }
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
