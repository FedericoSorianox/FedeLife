/**
 * 🏦 SISTEMA DE FINANZAS SIMPLIFICADO - FEDE LIFE
 * 
 * Versión simplificada que funciona sin autenticación
 * Usa endpoints públicos para transacciones y análisis de PDFs
 * Autor: Senior Backend Developer
 */

// ==================== CONFIGURACIÓN ====================

const FINANCE_API_CONFIG = {
    baseUrl: window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' 
        ? 'http://localhost:3000/api' 
        : 'https://fedelife-finanzas.onrender.com/api',
    endpoints: {
        transactions: '/public/transactions/public',
        categories: '/public/categories/public',
        ai: '/public/ai/analyze-pdf'
    }
};

// ==================== CLASE PRINCIPAL ====================

class FinanceApp {
    constructor() {
        this.transactions = [];
        this.categories = [];
        this.isInitialized = false;
        
        this.initializeApp();
    }

    /**
     * Inicializa la aplicación
     */
    async initializeApp() {
        try {
            console.log('🚀 Inicializando sistema de finanzas simplificado...');
            
            // Cargar datos del localStorage
            this.loadDataFromStorage();
            
            // Cargar categorías del backend
            await this.loadCategoriesFromBackend();
            
            // Configurar event listeners
            this.setupEventListeners();
            
            // Marcar como inicializado
            this.isInitialized = true;
            
            console.log('✅ Sistema de finanzas inicializado correctamente');
            
            // Renderizar datos iniciales
            this.renderDashboard();
            this.renderCategories();
            
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
        } catch (error) {
            console.error('❌ Error cargando datos del localStorage:', error);
        }
    }

    /**
     * Carga categorías del backend
     */
    async loadCategoriesFromBackend() {
        try {
            const response = await fetch(`${FINANCE_API_CONFIG.baseUrl}${FINANCE_API_CONFIG.endpoints.categories}`);
            if (response.ok) {
                const result = await response.json();
                if (result.success && result.data.categories) {
                    this.categories = result.data.categories;
                    // Guardar en localStorage
                    localStorage.setItem('fede_life_categories', JSON.stringify(this.categories));
                }
            }
        } catch (error) {
            console.warn('⚠️ No se pudieron cargar categorías del backend, usando locales');
        }
    }

    /**
     * Configura event listeners
     */
    setupEventListeners() {
        // Formulario de transacciones
        const transactionForm = document.getElementById('transactionForm');
        if (transactionForm) {
            transactionForm.addEventListener('submit', (e) => this.handleTransactionSubmit(e));
        }

        // Formulario de categorías
        const categoryForm = document.getElementById('categoryForm');
        if (categoryForm) {
            categoryForm.addEventListener('submit', (e) => this.handleCategorySubmit(e));
        }

        // Cambio de tipo de transacción
        const transactionType = document.getElementById('transactionType');
        if (transactionType) {
            transactionType.addEventListener('change', () => this.populateTransactionCategories());
        }

        // PDF Uploader
        const pdfFile = document.getElementById('pdfFile');
        const processPdfBtn = document.getElementById('processPdfBtn');
        
        if (pdfFile) {
            pdfFile.addEventListener('change', (e) => this.handlePdfFileSelection(e));
        }
        
        if (processPdfBtn) {
            processPdfBtn.addEventListener('click', () => this.processPdfFile());
        }

        // Configurar fecha por defecto
        this.setDefaultDates();
    }

    /**
     * Maneja el envío del formulario de transacciones
     */
    async handleTransactionSubmit(event) {
        event.preventDefault();
        
        try {
            const form = event.target;
            const formData = new FormData(form);
            
            // Obtener datos del formulario
            const type = document.getElementById('transactionType').value;
            const amount = parseFloat(document.getElementById('transactionAmount').value);
            const description = document.getElementById('transactionDescription').value;
            const category = document.getElementById('transactionCategory').value;
            const date = document.getElementById('transactionDate').value;
            const paymentMethod = document.getElementById('paymentMethod').value;

            // Validaciones
            if (!type || !amount || !description || !category || !paymentMethod) {
                throw new Error('Todos los campos son requeridos');
            }

            // Crear transacción
            const transaction = {
                type,
                amount,
                description,
                category,
                date: new Date(date),
                paymentMethod
            };

            // Intentar guardar en el backend
            try {
                const response = await fetch(`${FINANCE_API_CONFIG.baseUrl}${FINANCE_API_CONFIG.endpoints.transactions}`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(transaction)
                });

                if (response.ok) {
                    const result = await response.json();
                    console.log('✅ Transacción guardada en backend:', result);
                    
                    // Agregar a la lista local
                    transaction.id = result.data.transaction.id;
                    transaction.createdAt = new Date();
                    this.transactions.push(transaction);
                    
                    // Guardar en localStorage
                    this.saveDataToStorage();
                    
                    // Actualizar UI
                    this.renderDashboard();
                    this.renderTransactions();
                    
                    // Limpiar formulario
                    form.reset();
                    this.setDefaultDates();
                    
                    this.showNotification('Transacción agregada correctamente', 'success');
                } else {
                    throw new Error('Error del servidor');
                }
            } catch (backendError) {
                console.warn('⚠️ Backend no disponible, guardando localmente');
                
                // Guardar localmente
                transaction.id = this.generateId();
                transaction.createdAt = new Date();
                this.transactions.push(transaction);
                
                // Guardar en localStorage
                this.saveDataToStorage();
                
                // Actualizar UI
                this.renderDashboard();
                this.renderTransactions();
                
                // Limpiar formulario
                form.reset();
                this.setDefaultDates();
                
                this.showNotification('Transacción guardada localmente', 'info');
            }
            
        } catch (error) {
            console.error('❌ Error agregando transacción:', error);
            this.showNotification(error.message, 'error');
        }
    }

    /**
     * Maneja el envío del formulario de categorías
     */
    handleCategorySubmit(event) {
        event.preventDefault();
        
        try {
            const type = document.getElementById('categoryType').value;
            const name = document.getElementById('categoryName').value;
            const color = document.getElementById('categoryColor').value;
            const description = document.getElementById('categoryDescription').value;

            if (!type || !name) {
                throw new Error('Tipo y nombre son requeridos');
            }

            // Crear nueva categoría
            const newCategory = {
                id: this.generateId(),
                name: name.trim(),
                type: type,
                color: color,
                description: description?.trim(),
                createdAt: new Date()
            };

            // Agregar a la lista
            this.categories.push(newCategory);

            // Guardar en localStorage
            this.saveDataToStorage();

            // Re-renderizar categorías
            this.renderCategories();

            // Limpiar formulario
            const form = event.target;
            form.reset();
            document.getElementById('categoryColor').value = '#3498db';

            this.showNotification(`Categoría "${name}" agregada correctamente`, 'success');

        } catch (error) {
            console.error('❌ Error agregando categoría:', error);
            this.showNotification(error.message, 'error');
        }
    }

    /**
     * Maneja la selección de archivo PDF
     */
    handlePdfFileSelection(event) {
        const file = event.target.files[0];
        const processPdfBtn = document.getElementById('processPdfBtn');
        
        if (file && file.type === 'application/pdf') {
            processPdfBtn.disabled = false;
            this.showNotification(`PDF seleccionado: ${file.name}`, 'info');
        } else {
            processPdfBtn.disabled = true;
            this.showNotification('Por favor selecciona un archivo PDF válido', 'error');
        }
    }

    /**
     * Procesa el archivo PDF
     */
    async processPdfFile() {
        const pdfFile = document.getElementById('pdfFile');
        const processPdfBtn = document.getElementById('processPdfBtn');
        const processingStatus = document.getElementById('pdfProcessingStatus');
        const extractedExpenses = document.getElementById('extractedExpenses');
        
        if (!pdfFile.files[0]) {
            this.showNotification('Por favor selecciona un archivo PDF', 'error');
            return;
        }

        try {
            // Mostrar estado de procesamiento
            processPdfBtn.disabled = true;
            processingStatus.style.display = 'block';
            extractedExpenses.style.display = 'none';

            // Crear FormData
            const formData = new FormData();
            formData.append('pdf', pdfFile.files[0]);

            // Enviar al backend
            const response = await fetch(`${FINANCE_API_CONFIG.baseUrl}${FINANCE_API_CONFIG.endpoints.ai}`, {
                method: 'POST',
                body: formData
            });

            if (response.ok) {
                const result = await response.json();
                
                // Mostrar resultados
                this.displayPdfResults(result.data);
                extractedExpenses.style.display = 'block';
                
                this.showNotification('PDF procesado exitosamente', 'success');
            } else {
                throw new Error('Error del servidor');
            }

        } catch (error) {
            console.error('❌ Error procesando PDF:', error);
            this.showNotification('Error procesando PDF. Intenta nuevamente.', 'error');
        } finally {
            // Ocultar estado de procesamiento
            processingStatus.style.display = 'none';
            processPdfBtn.disabled = false;
        }
    }

    /**
     * Muestra los resultados del análisis de PDF
     */
    displayPdfResults(data) {
        const expensesList = document.getElementById('expensesList');
        
        if (data.analysis && data.analysis.expenses) {
            const expensesHTML = data.analysis.expenses.map(expense => `
                <div class="expense-item">
                    <input type="checkbox" class="expense-checkbox" data-amount="${expense.amount}" data-description="${expense.description}">
                    <div class="expense-info">
                        <span class="expense-description">${expense.description}</span>
                        <span class="expense-amount">$${expense.amount}</span>
                    </div>
                </div>
            `).join('');
            
            expensesList.innerHTML = expensesHTML;
        } else {
            expensesList.innerHTML = '<p>No se encontraron gastos en el PDF</p>';
        }
    }

    /**
     * Pobla el dropdown de categorías para transacciones
     */
    populateTransactionCategories() {
        const type = document.getElementById('transactionType').value;
        const categoryDropdown = document.getElementById('transactionCategory');
        
        if (!categoryDropdown) return;

        // Limpiar opciones existentes
        categoryDropdown.innerHTML = '<option value="">Seleccionar categoría</option>';
        
        // Filtrar categorías por tipo
        const typeCategories = this.categories.filter(cat => cat.type === type);
        
        // Agregar opciones
        typeCategories.forEach(category => {
            const option = document.createElement('option');
            option.value = category.name;
            option.textContent = category.name;
            categoryDropdown.appendChild(option);
        });
    }

    /**
     * Renderiza el dashboard
     */
    renderDashboard() {
        const now = new Date();
        const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
        
        // Filtrar transacciones del mes actual
        const monthTransactions = this.transactions.filter(t => {
            const transactionDate = new Date(t.date);
            const transactionMonth = `${transactionDate.getFullYear()}-${String(transactionDate.getMonth() + 1).padStart(2, '0')}`;
            return transactionMonth === currentMonth;
        });

        // Calcular totales
        const totalIncome = monthTransactions
            .filter(t => t.type === 'income')
            .reduce((sum, t) => sum + t.amount, 0);
            
        const totalExpenses = monthTransactions
            .filter(t => t.type === 'expense')
            .reduce((sum, t) => sum + t.amount, 0);
            
        const balance = totalIncome - totalExpenses;

        // Actualizar UI
        const totalIncomeEl = document.getElementById('totalIncome');
        const totalExpensesEl = document.getElementById('totalExpenses');
        const balanceEl = document.getElementById('totalBalance');

        if (totalIncomeEl) totalIncomeEl.textContent = `$${totalIncome.toLocaleString('es-AR')}`;
        if (totalExpensesEl) totalExpensesEl.textContent = `$${totalExpenses.toLocaleString('es-AR')}`;
        if (balanceEl) {
            balanceEl.textContent = `$${balance.toLocaleString('es-AR')}`;
            balanceEl.className = balance >= 0 ? 'positive' : 'negative';
        }
    }

    /**
     * Renderiza las transacciones
     */
    renderTransactions() {
        const container = document.getElementById('transactionsList');
        if (!container) return;

        if (this.transactions.length === 0) {
            container.innerHTML = '<p class="no-data">No hay transacciones</p>';
            return;
        }

        // Ordenar por fecha (más recientes primero)
        const sortedTransactions = [...this.transactions].sort((a, b) => new Date(b.date) - new Date(a.date));

        const transactionsHTML = sortedTransactions.map(transaction => `
            <div class="transaction-item ${transaction.type}">
                <div class="transaction-info">
                    <span class="transaction-description">${transaction.description}</span>
                    <span class="transaction-category">${transaction.category}</span>
                </div>
                <div class="transaction-amount">
                    <span class="amount ${transaction.type}">
                        ${transaction.type === 'income' ? '+' : '-'}$${transaction.amount.toLocaleString('es-AR')}
                    </span>
                    <span class="transaction-date">${new Date(transaction.date).toLocaleDateString('es-AR')}</span>
                </div>
            </div>
        `).join('');

        container.innerHTML = transactionsHTML;
    }

    /**
     * Renderiza las categorías
     */
    renderCategories() {
        // Renderizar categorías de ingresos
        this.renderCategorySection('incomeCategories', 'income', 'Ingresos');
        
        // Renderizar categorías de gastos
        this.renderCategorySection('expenseCategories', 'expense', 'Gastos');
        
        // Actualizar el dropdown de categorías para transacciones
        this.populateTransactionCategories();
    }

    /**
     * Renderiza una sección de categorías
     */
    renderCategorySection(containerId, type, title) {
        const container = document.getElementById(containerId);
        if (!container) return;

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
     */
    getTransactionCountByCategory(categoryName) {
        return this.transactions.filter(t => t.category === categoryName).length;
    }

    /**
     * Elimina una categoría
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

            this.showNotification(`Categoría "${category.name}" eliminada correctamente`, 'success');

        } catch (error) {
            console.error('❌ Error eliminando categoría:', error);
            this.showNotification('Error al eliminar la categoría', 'error');
        }
    }

    /**
     * Guarda datos en localStorage
     */
    saveDataToStorage() {
        try {
            localStorage.setItem('fede_life_transactions', JSON.stringify(this.transactions));
            localStorage.setItem('fede_life_categories', JSON.stringify(this.categories));
        } catch (error) {
            console.error('❌ Error guardando en localStorage:', error);
        }
    }

    /**
     * Configura fechas por defecto
     */
    setDefaultDates() {
        const today = new Date().toISOString().split('T')[0];
        
        const transactionDate = document.getElementById('transactionDate');
        if (transactionDate) transactionDate.value = today;
        
        const goalDeadline = document.getElementById('goalDeadline');
        if (goalDeadline) goalDeadline.value = today;
    }

    /**
     * Genera un ID único
     */
    generateId() {
        return `id_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    /**
     * Muestra una notificación
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

        } catch (error) {
            console.error('❌ Error mostrando notificación:', error);
        }
    }
}

// ==================== INICIALIZACIÓN ====================

// Crear instancia global cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', function() {
    try {
        window.financeApp = new FinanceApp();
        console.log('✅ Aplicación de finanzas inicializada');
    } catch (error) {
        console.error('❌ Error inicializando aplicación de finanzas:', error);
    }
});

// Exportar para uso en módulos
if (typeof module !== 'undefined' && module.exports) {
    module.exports = FinanceApp;
}
