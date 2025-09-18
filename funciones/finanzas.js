/**
 * 🏦 SISTEMA DE FINANZAS PERSONALES UNIFICADO - FEDE LIFE
 *
 * Versión unificada que combina la arquitectura robusta con funcionalidades avanzadas
 * Incluye: Gestión completa de transacciones, categorías, PDFs con IA, chat, reportes
 * Arquitectura: Modular con patrón Repository, Manager y Controller
 * Autor: Senior Backend Developer
 * Descripción: Sistema completo para gestión de finanzas personales
 */

// ==================== CONSTANTES Y CONFIGURACIÓN ====================

/**
 * Configuración de API para funcionalidades avanzadas
 */
const FINANCE_API_CONFIG = {
    baseUrl: window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
        ? 'http://localhost:3000/api'
        : 'https://fedelife-finanzas.onrender.com/api',
    endpoints: {
        transactions: '/public/transactions',
        categories: '/public/categories',
        ai: '/public/ai/analyze-csv'
    }
};

/**
 * Tipo de transacción financiera
 */
const TransactionType = {
    INCOME: 'income',
    EXPENSE: 'expense'
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
        console.log('🏗️ Initializing FinanceApp...');

        this.transactions = [];
        this.categories = [];
        this.budgets = [];
        this.goals = [];
        this.isInitialized = false;

        // Gráficos modernos (de finanzas-simple)
        this.chart1 = null;
        this.chart2 = null;
        this.currentView = 'expenses';

        console.log('✅ FinanceApp constructor completed');
        this.categoryColors = {
            'Alimentación': '#FF6384',
            'Transporte': '#36A2EB',
            'Entretenimiento': '#FFCE56',
            'Salud': '#4BC0C0',
            'Educación': '#9966FF',
            'Vivienda': '#FF9F40',
            'Ropa': '#FF6384',
            'Otros': '#C9CBCF'
        };

        // Período global (de finanzas-simple)
        // Inicializar período actual
        const now = new Date();
        this.currentPeriod = {
            year: now.getFullYear(),
            month: now.getMonth() + 1,
            type: 'monthly'
        };

        this.initializeApp();
    }

    /**
     * Inicializa la aplicación de finanzas
     */
    async initializeApp() {
        console.log('🚀 Initializing FinanceApp...');

        try {

            // Intentar cargar datos del backend público primero
            try {
                await this.loadDataFromBackend();
            } catch (backendError) {

                // Cargar datos del localStorage como fallback
                this.loadDataFromStorage();
            }

            // Inicializar categorías por defecto si no existen
            if (this.categories.length === 0) {
                this.initializeDefaultCategories();
            }

            // Cargar categorías del backend (de finanzas-simple)
            await this.loadCategoriesFromBackend();

            // Cargar metas desde la API de MongoDB
            await this.loadGoals();

            // Configurar event listeners
            this.setupEventListeners();

            // Inicializar gráficos
            this.initializeCharts();

            // Marcar como inicializado
            this.isInitialized = true;


            // Renderizar datos iniciales
            this.renderDashboard();
            this.renderCategories();
            this.renderBudgets();
            this.updateCharts();

            console.log('✅ FinanceApp initialization completed successfully');

        } catch (error) {
            console.error('❌ Error during FinanceApp initialization:', error);
        }
    }

    /**
     * Carga datos del backend público
     */
    async loadDataFromBackend() {
        try {

            const response = await fetch(`${FINANCE_API_CONFIG.baseUrl}${FINANCE_API_CONFIG.endpoints.transactions}`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json'
                }
            });

            if (response.ok) {
                const result = await response.json();
                if (result.success && result.data && result.data.transactions) {
                    // Cargar transacciones desde el backend
                    this.transactions = result.data.transactions.map(transaction => ({
                        ...transaction,
                        id: transaction._id ? transaction._id.toString() : transaction.id, // Convertir _id de MongoDB a id
                        date: new Date(transaction.date),
                        createdAt: transaction.createdAt ? new Date(transaction.createdAt) : new Date(),
                        updatedAt: transaction.updatedAt ? new Date(transaction.updatedAt) : new Date()
                    }));


                    // Si hay transacciones, actualizar la interfaz
                    if (this.transactions.length > 0) {
                        this.renderDashboard();
                        this.renderTransactions();
                        this.updateCharts();
                    }
                } else {
                    throw new Error('Respuesta del backend no tiene el formato esperado');
                }
            } else {
                throw new Error(`Error HTTP ${response.status}: ${response.statusText}`);
            }

        } catch (error) {
            throw error; // Re-lanzar para que el catch en initializeApp lo maneje
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

                // Verificar que las transacciones tengan todos los campos necesarios
                this.transactions.forEach((transaction, index) => {
                    if (!transaction.id) {
                        transaction.id = this.generateId();
                    }
                    if (!transaction.currency) {
                        transaction.currency = 'UYU'; // Valor por defecto
                    }
                    if (!transaction.category) {
                        transaction.category = 'Otros'; // Valor por defecto
                    }
                });
            } else {
                this.transactions = [];
            }

            // Cargar categorías
            const storedCategories = localStorage.getItem('fede_life_categories');
            if (storedCategories) {
                this.categories = JSON.parse(storedCategories);

                // Verificar que las categorías tengan todos los campos necesarios
                this.categories.forEach((category, index) => {
                    if (!category.id || category.id === 'undefined' || category.id === '') {
                        category.id = this.generateId();
                    }
                    if (!category.type) {
                        category.type = 'expense'; // Valor por defecto
                    }
                    if (!category.color) {
                        category.color = '#95a5a6'; // Color gris por defecto
                    }
                    if (!category.name) {
                        category.name = `Categoría ${index + 1}`;
                    }
                });

            } else {
                this.initializeDefaultCategories();
            }

            // Cargar presupuestos
            const storedBudgets = localStorage.getItem('fede_life_budgets');
            if (storedBudgets) {
                this.budgets = JSON.parse(storedBudgets);
            } else {
                this.budgets = [];
            }

            // Cargar metas
            const storedGoals = localStorage.getItem('fede_life_goals');
            if (storedGoals) {
                this.goals = JSON.parse(storedGoals);
            }

        } catch (error) {
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
            
        } catch (error) {
        }
    }

    /**
     * Carga categorías del backend (de finanzas-simple)
     */
    async loadCategoriesFromBackend() {
        try {
            const response = await fetch(`${FINANCE_API_CONFIG.baseUrl}${FINANCE_API_CONFIG.endpoints.categories}`);

            if (response.ok) {
                const result = await response.json();
                if (result.success && result.data && result.data.categories) {
                    this.categories = result.data.categories;

                    // Verificar que las categorías del backend tengan IDs válidos
                    this.categories.forEach((category, index) => {
                        if (!category.id || category.id === 'undefined' || category.id === '') {
                            category.id = this.generateId();
                        }
                        if (!category.type) {
                            category.type = 'expense'; // Valor por defecto
                        }
                        if (!category.color) {
                            category.color = '#95a5a6'; // Color gris por defecto
                        }
                        if (!category.name) {
                            category.name = `Categoría ${index + 1}`;
                        }
                    });

                    // Guardar en localStorage con IDs corregidos
                    localStorage.setItem('fede_life_categories', JSON.stringify(this.categories));
                } else {
                    this.initializeDefaultCategories();
                }
            } else {
                this.initializeDefaultCategories();
            }
        } catch (error) {
            this.initializeDefaultCategories();
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
            { id: 'cat_income_5', name: 'Transferencias', type: 'income', color: '#f1c40f', createdAt: new Date() },
            
            // Gastos
            { id: 'cat_expense_1', name: 'Alimentación', type: 'expense', color: '#e74c3c', createdAt: new Date() },
            { id: 'cat_expense_2', name: 'Transporte', type: 'expense', color: '#f39c12', createdAt: new Date() },
            { id: 'cat_expense_3', name: 'Vivienda', type: 'expense', color: '#e67e22', createdAt: new Date() },
            { id: 'cat_expense_4', name: 'Servicios', type: 'expense', color: '#d35400', createdAt: new Date() },
            { id: 'cat_expense_5', name: 'Entretenimiento', type: 'expense', color: '#9b59b6', createdAt: new Date() },
            { id: 'cat_expense_6', name: 'Salud', type: 'expense', color: '#3498db', createdAt: new Date() },
            { id: 'cat_expense_7', name: 'Educación', type: 'expense', color: '#2980b9', createdAt: new Date() },
            { id: 'cat_expense_8', name: 'Ropa', type: 'expense', color: '#8e44ad', createdAt: new Date() },
            { id: 'cat_expense_9', name: 'Otros Gastos', type: 'expense', color: '#95a5a6', createdAt: new Date() },
            { id: 'cat_expense_10', name: 'Transferencias', type: 'expense', color: '#f1c40f', createdAt: new Date() }
        ];
        
        this.saveDataToStorage();
    }

    /**
     * Configura todos los event listeners de la aplicación
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

        // Formulario de metas
        const goalForm = document.getElementById('goalForm');
        if (goalForm) {
            goalForm.addEventListener('submit', (e) => this.handleGoalSubmit(e));
        }

        // Botón para abrir modal de crear meta
        const createGoalBtn = document.getElementById('createGoalBtn');
        if (createGoalBtn) {
            createGoalBtn.addEventListener('click', () => this.openGoalModal());
        }

        // Botón de cancelar en el modal
        const cancelGoalBtn = document.getElementById('cancelGoalBtn');
        if (cancelGoalBtn) {
            cancelGoalBtn.addEventListener('click', () => this.closeGoalModal());
        }

        // Cerrar modal con la X
        const goalModal = document.getElementById('goalModal');
        if (goalModal) {
            const closeBtn = goalModal.querySelector('.close');
            if (closeBtn) {
                closeBtn.addEventListener('click', () => this.closeGoalModal());
            }

            // Cerrar modal haciendo clic fuera
            goalModal.addEventListener('click', (e) => {
                if (e.target === goalModal) {
                    this.closeGoalModal();
                }
            });
        }

        // Cambio de tipo de transacción
        const transactionType = document.getElementById('transactionType');
        if (transactionType) {
            transactionType.addEventListener('change', () => this.populateTransactionCategories());
        }

        // Botón para agregar nueva categoría
        const addCategoryBtn = document.getElementById('addCategoryBtn');
        if (addCategoryBtn) {
            addCategoryBtn.addEventListener('click', () => this.showAddCategoryModal());
        }

        // CSV Uploader
        const csvFile = document.getElementById('csvFile');
        const processCsvBtn = document.getElementById('processCsvBtn');

        if (csvFile) {
            csvFile.addEventListener('change', (e) => this.handleCsvFileSelection(e));
        }

        if (processCsvBtn) {
            processCsvBtn.addEventListener('click', () => this.processCsvFile());
        }

        // Chat de IA en metas
        const sendChatBtn = document.getElementById('sendChatBtn');
        const chatInput = document.getElementById('chatInput');
        const diagnoseBtn = document.getElementById('diagnoseBtn');

        if (sendChatBtn && chatInput) {
            sendChatBtn.addEventListener('click', () => this.sendChatMessage());
        }

        if (diagnoseBtn) {
            diagnoseBtn.addEventListener('click', () => this.diagnoseGoalsWithAI());
        }


        if (sendChatBtn && chatInput) {
            chatInput.addEventListener('input', () => {
                sendChatBtn.disabled = !chatInput.value.trim();
            });
            chatInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    this.sendChatMessage();
                }
            });
        }

        // Botones de sugerencias del chat
        const suggestionBtns = document.querySelectorAll('.suggestion-btn');
        suggestionBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                const suggestion = btn.dataset.suggestion;
                if (chatInput) {
                    chatInput.value = suggestion;
                    sendChatBtn.disabled = false;
                    chatInput.focus();
                }
            });
        });

        // Botón de generar reporte
        const generateReportBtn = document.getElementById('generateReport');
        if (generateReportBtn) {
            generateReportBtn.addEventListener('click', () => this.generateReport());
        }

        // ==================== SISTEMA DE PESTAÑAS ====================
        this.setupTabNavigation();

        // Configurar selector global de períodos
        this.setupGlobalPeriodSelector();

        // Configurar filtros de transacciones
        this.setupTransactionFilters();

        // Configurar botones del dashboard de resumen financiero
        this.setupDashboardEventListeners();

        // Configurar botón de limpiar descripciones
        this.setupCleanDescriptionsButton();

    }

    /**
     * Configura los event listeners para los botones del dashboard
     */
    setupDashboardEventListeners() {

        // Botones para agregar ingresos/gastos UYU
        const incomeUYUCard = document.getElementById('incomeUYUCard');
        const expenseUYUCard = document.getElementById('expenseUYUCard');

        if (incomeUYUCard) {
            incomeUYUCard.addEventListener('click', () => this.showAddTransactionModal('income', 'UYU'));
            incomeUYUCard.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    this.showAddTransactionModal('income', 'UYU');
                }
            });
        }

        if (expenseUYUCard) {
            expenseUYUCard.addEventListener('click', () => this.showAddTransactionModal('expense', 'UYU'));
            expenseUYUCard.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    this.showAddTransactionModal('expense', 'UYU');
                }
            });
        }

        // Botones para agregar ingresos/gastos USD
        const incomeUSDCard = document.getElementById('incomeUSDCard');
        const expenseUSDCard = document.getElementById('expenseUSDCard');

        if (incomeUSDCard) {
            incomeUSDCard.addEventListener('click', () => this.showAddTransactionModal('income', 'USD'));
            incomeUSDCard.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    this.showAddTransactionModal('income', 'USD');
                }
            });
        }

        if (expenseUSDCard) {
            expenseUSDCard.addEventListener('click', () => this.showAddTransactionModal('expense', 'USD'));
            expenseUSDCard.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    this.showAddTransactionModal('expense', 'USD');
                }
            });
        }

        // Botones de transferencia
        const transferToUSDCard = document.getElementById('transferToUSDCard');
        const transferToUYUCard = document.getElementById('transferToUYUCard');

        if (transferToUSDCard) {
            transferToUSDCard.addEventListener('click', () => this.showTransferModal('UYU', 'USD'));
            transferToUSDCard.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    this.showTransferModal('UYU', 'USD');
                }
            });
        }

        if (transferToUYUCard) {
            transferToUYUCard.addEventListener('click', () => this.showTransferModal('USD', 'UYU'));
            transferToUYUCard.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    this.showTransferModal('USD', 'UYU');
                }
            });
        }

    }

    /**
     * Configura el botón para limpiar descripciones
     */
    setupCleanDescriptionsButton() {
        const cleanBtn = document.getElementById('cleanDescriptionsBtn');

        if (cleanBtn) {
            cleanBtn.addEventListener('click', () => {
                if (confirm('¿Estás seguro de que deseas limpiar todas las descripciones quitando prefijos como "Compra", "Pago", etc.? Esta acción no se puede deshacer.')) {
                    this.cleanAllTransactionDescriptions();
                }
            });
        }
    }

    /**
     * Muestra el modal para agregar una nueva transacción
     */
    showAddTransactionModal(type, currency) {

        // Cambiar a la pestaña de transacciones
        this.switchToTab('transactions');

        // Esperar un poco para que la transición de pestaña se complete
        setTimeout(() => {
            // Pre-seleccionar el tipo de transacción
            const transactionTypeSelect = document.getElementById('transactionType');
            if (transactionTypeSelect) {
                transactionTypeSelect.value = type;
                // Disparar el evento change para actualizar las categorías
                transactionTypeSelect.dispatchEvent(new Event('change'));
            }

            // Pre-seleccionar la moneda
            const transactionCurrencySelect = document.getElementById('transactionCurrency');
            if (transactionCurrencySelect) {
                transactionCurrencySelect.value = currency;
            }

            // Limpiar el formulario
            const transactionForm = document.getElementById('transactionForm');
            if (transactionForm) {
                transactionForm.reset();
                // Restaurar los valores pre-seleccionados después del reset
                if (transactionTypeSelect) transactionTypeSelect.value = type;
                if (transactionCurrencySelect) transactionCurrencySelect.value = currency;

                // Enfocar el campo de monto
                const amountInput = document.getElementById('transactionAmount');
                if (amountInput) {
                    amountInput.focus();
                }
            }

            // Hacer scroll suave hasta el formulario
            const addTransactionForm = document.querySelector('.add-transaction-form');
            if (addTransactionForm) {
                addTransactionForm.scrollIntoView({
                    behavior: 'smooth',
                    block: 'start'
                });
            }

            // Mostrar notificación de éxito
            const currencyName = currency === 'UYU' ? 'pesos uruguayos' : 'dólares';
            const typeName = type === 'income' ? 'ingreso' : 'gasto';
            this.showNotification(`¡Formulario listo! Agrega tu ${typeName} en ${currencyName}`, 'success');
        }, 100);
    }

    /**
     * Muestra el modal de transferencia entre monedas
     */
    showTransferModal(fromCurrency, toCurrency) {

        const modal = this.createTransferModal(fromCurrency, toCurrency);
        document.body.appendChild(modal);

        // Hacer visible el modal
        modal.style.display = 'block';
        modal.style.zIndex = '10000';

        // Configurar event listeners del modal
        this.setupTransferModalEvents(modal, fromCurrency, toCurrency);

    }

    /**
     * Crea el modal de transferencia
     */
    createTransferModal(fromCurrency, toCurrency) {
        const fromSymbol = fromCurrency === 'UYU' ? '$U' : '$';
        const toSymbol = toCurrency === 'UYU' ? '$U' : '$';

        const modal = document.createElement('div');
        modal.className = 'modal transfer-modal';
        modal.innerHTML = `
            <div class="modal-content transfer-modal-content">
                <div class="modal-header">
                    <h2><i class="fas fa-exchange-alt"></i> Transferir ${fromCurrency} → ${toCurrency}</h2>
                    <button class="close" aria-label="Cerrar">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                <div class="modal-body">
                    <div class="transfer-form">
                        <div class="transfer-info">
                            <div class="transfer-direction">
                                <div class="currency-box from-currency">
                                    <span class="currency-symbol">${fromSymbol}</span>
                                    <span class="currency-name">${fromCurrency}</span>
                                </div>
                                <div class="transfer-arrow">
                                    <i class="fas fa-arrow-right"></i>
                                </div>
                                <div class="currency-box to-currency">
                                    <span class="currency-symbol">${toSymbol}</span>
                                    <span class="currency-name">${toCurrency}</span>
                                </div>
                            </div>
                        </div>

                        <div class="form-group">
                            <label for="transferAmount">Monto a transferir (${fromSymbol}):</label>
                            <input type="number" id="transferAmount" step="0.01" min="0.01" placeholder="0.00" required>
                        </div>

                        <div class="form-group">
                            <label for="exchangeRate">Tasa de cambio (1 USD = ? UYU):</label>
                            <input type="number" id="exchangeRate" step="0.01" min="0.01" placeholder="40.00" required>
                            <small class="form-help">Ingresa la tasa de cambio actual del dólar</small>
                        </div>

                        <div class="transfer-preview" id="transferPreview">
                            <div class="preview-item">
                                <span class="preview-label">Monto en ${fromCurrency}:</span>
                                <span class="preview-value" id="previewFromAmount">${fromSymbol}0.00</span>
                            </div>
                            <div class="preview-item">
                                <span class="preview-label">Equivalente en ${toCurrency}:</span>
                                <span class="preview-value" id="previewToAmount">${toSymbol}0.00</span>
                            </div>
                        </div>
                    </div>
                </div>
                <div class="modal-footer">
                    <button type="button" class="btn btn-secondary cancel-transfer-btn">
                        <i class="fas fa-times"></i> Cancelar
                    </button>
                    <button type="button" class="btn btn-success confirm-transfer-btn">
                        <i class="fas fa-exchange-alt"></i> Realizar Transferencia
                    </button>
                </div>
            </div>
        `;

        return modal;
    }

    /**
     * Configura los event listeners del modal de transferencia
     */
    setupTransferModalEvents(modal, fromCurrency, toCurrency) {
        const closeBtn = modal.querySelector('.close');
        const cancelBtn = modal.querySelector('.cancel-transfer-btn');
        const confirmBtn = modal.querySelector('.confirm-transfer-btn');
        const amountInput = modal.querySelector('#transferAmount');
        const rateInput = modal.querySelector('#exchangeRate');
        const previewFrom = modal.querySelector('#previewFromAmount');
        const previewTo = modal.querySelector('#previewToAmount');

        const closeModal = () => {
            modal.style.display = 'none';
            setTimeout(() => {
                if (modal.parentNode) {
                    modal.parentNode.removeChild(modal);
                }
            }, 300);
        };

        // Cerrar modal
        if (closeBtn) closeBtn.addEventListener('click', closeModal);
        if (cancelBtn) cancelBtn.addEventListener('click', closeModal);

        // Cerrar con Escape
        document.addEventListener('keydown', function escapeHandler(e) {
            if (e.key === 'Escape') {
                closeModal();
                document.removeEventListener('keydown', escapeHandler);
            }
        });

        // Actualizar preview en tiempo real
        const updatePreview = () => {
            const amount = parseFloat(amountInput.value) || 0;
            const rate = parseFloat(rateInput.value) || 0;

            const fromSymbol = fromCurrency === 'UYU' ? '$U' : '$';
            const toSymbol = toCurrency === 'UYU' ? '$U' : '$';

            if (amount > 0) {
                if (fromCurrency === 'UYU' && toCurrency === 'USD') {
                    // UYU → USD: dividir por la tasa
                    const usdAmount = amount / rate;
                    previewFrom.textContent = `${fromSymbol}${amount.toFixed(2)}`;
                    previewTo.textContent = `${toSymbol}${usdAmount.toFixed(2)}`;
                } else if (fromCurrency === 'USD' && toCurrency === 'UYU') {
                    // USD → UYU: multiplicar por la tasa
                    const uyuAmount = amount * rate;
                    previewFrom.textContent = `${fromSymbol}${amount.toFixed(2)}`;
                    previewTo.textContent = `${toSymbol}${uyuAmount.toFixed(2)}`;
                }
            } else {
                previewFrom.textContent = `${fromSymbol}0.00`;
                previewTo.textContent = `${toSymbol}0.00`;
            }
        };

        if (amountInput) amountInput.addEventListener('input', updatePreview);
        if (rateInput) rateInput.addEventListener('input', updatePreview);

        // Confirmar transferencia
        if (confirmBtn) {
            confirmBtn.addEventListener('click', () => {
                const amount = parseFloat(amountInput.value);
                const rate = parseFloat(rateInput.value);

                if (!amount || amount <= 0) {
                    this.showNotification('Ingresa un monto válido', 'error');
                    amountInput.focus();
                    return;
                }

                if (!rate || rate <= 0) {
                    this.showNotification('Ingresa una tasa de cambio válida', 'error');
                    rateInput.focus();
                    return;
                }

                // Realizar la transferencia
                this.performCurrencyTransfer(fromCurrency, toCurrency, amount, rate);
                closeModal();
            });
        }
    }

    /**
     * Realiza la transferencia entre monedas usando PUT para actualizar la base de datos
     */
    async performCurrencyTransfer(fromCurrency, toCurrency, amount, exchangeRate) {

        try {
            // Calcular el monto equivalente
            let equivalentAmount;
            if (fromCurrency === 'UYU' && toCurrency === 'USD') {
                equivalentAmount = amount / exchangeRate;
            } else if (fromCurrency === 'USD' && toCurrency === 'UYU') {
                equivalentAmount = amount * exchangeRate;
            }

            // Crear transacción de gasto para la moneda de origen
            const expenseTransaction = {
                type: 'expense',
                description: `Transferencia ${fromCurrency} → ${toCurrency}`,
                amount: amount,
                currency: fromCurrency,
                category: 'Transferencias',
                date: new Date().toISOString().split('T')[0]
            };

            // Crear transacción de ingreso para la moneda de destino
            const incomeTransaction = {
                type: 'income',
                description: `Transferencia ${fromCurrency} → ${toCurrency}`,
                amount: equivalentAmount,
                currency: toCurrency,
                category: 'Transferencias',
                date: new Date().toISOString().split('T')[0]
            };

            // Enviar las transacciones al backend usando PUT (actualización/creación)

            const transferData = [expenseTransaction, incomeTransaction];
            const response = await fetch(`${FINANCE_API_CONFIG.baseUrl}${FINANCE_API_CONFIG.endpoints.transactions}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ transactions: transferData })
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                this.showNotification('Error: No se pudo registrar la transferencia en el servidor', 'error');
                return;
            }

            const result = await response.json();
            if (!result.success) {
                this.showNotification('Error: La transferencia no fue registrada correctamente', 'error');
                return;
            }


            // Agregar las transacciones al estado local con los IDs del backend
            const createdTransactions = result.data?.transactions || [];
            createdTransactions.forEach(transaction => {
                this.transactions.push({
                    ...transaction,
                    id: transaction._id ? transaction._id.toString() : this.generateId(),
                    date: new Date(transaction.date),
                    createdAt: transaction.createdAt ? new Date(transaction.createdAt) : new Date()
                });
            });

            // Guardar en localStorage
            this.saveDataToStorage();

            // Actualizar la interfaz
            this.renderDashboard();
            this.renderTransactions();
            this.updateCharts();

            // Notificación de éxito
            const fromSymbol = fromCurrency === 'UYU' ? '$U' : '$';
            const toSymbol = toCurrency === 'UYU' ? '$U' : '$';

            this.showNotification(
                `Transferencia realizada: ${fromSymbol}${amount.toFixed(2)} → ${toSymbol}${equivalentAmount.toFixed(2)}`,
                'success'
            );


        } catch (error) {
            this.showNotification('Error al realizar la transferencia', 'error');
        }
    }

    /**
     * Configura el sistema de pestañas para navegar entre secciones
     * Permite cambiar entre: Transacciones, Metas, Categorías y Reportes
     */
    setupTabNavigation() {
        const tabButtons = document.querySelectorAll('.tab-btn');

        tabButtons.forEach(button => {
            button.addEventListener('click', () => {
                const targetTab = button.dataset.tab;

                // Remover clase active de todos los botones
                tabButtons.forEach(btn => btn.classList.remove('active'));

                // Agregar clase active al botón clickeado
                button.classList.add('active');

                // Ocultar todas las pestañas de contenido
                const tabContents = document.querySelectorAll('.tab-content');
                tabContents.forEach(content => content.classList.remove('active'));

                // Mostrar la pestaña de contenido correspondiente
                const targetContent = document.getElementById(targetTab);
                if (targetContent) {
                    targetContent.classList.add('active');
                }

            });
        });

    }

    /**
     * Sistema de pestañas anterior (para compatibilidad)
     */
    setupTabSystem() {
        this.setupTabNavigation();
    }

    /**
     * Cambia a una pestaña específica programáticamente
     */
    switchToTab(tabName) {

        // Remover clase active de todos los botones
        const tabButtons = document.querySelectorAll('.tab-btn');
        tabButtons.forEach(btn => btn.classList.remove('active'));

        // Agregar clase active al botón correspondiente
        const targetButton = document.querySelector(`.tab-btn[data-tab="${tabName}"]`);
        if (targetButton) {
            targetButton.classList.add('active');
        }

        // Ocultar todas las pestañas de contenido
        const tabContents = document.querySelectorAll('.tab-content');
        tabContents.forEach(content => content.classList.remove('active'));

        // Mostrar la pestaña de contenido correspondiente
        const targetContent = document.getElementById(tabName);
        if (targetContent) {
            targetContent.classList.add('active');
        }

    }

    /**
     * Filtra transacciones según el período actual
     * @returns {Array} Transacciones filtradas por período
     */
    filterTransactionsByPeriod() {
        const { year, month, type } = this.currentPeriod;

        return this.transactions.filter(transaction => {
            const transactionDate = new Date(transaction.date);
            const transactionYear = transactionDate.getFullYear();

            if (type === 'yearly') {
                // Para período anual, incluir todas las transacciones del año actual
                return transactionYear === year;
            } else {
                // Para período mensual, incluir solo transacciones del mes y año actual
                const transactionMonth = transactionDate.getMonth() + 1;
                return transactionYear === year && transactionMonth === month;
            }
        });
    }

    /**
     * Calcula el resumen financiero
     */
    calculateFinancialSummary() {
        // Usar la nueva función para filtrar por período actual
        const periodTransactions = this.filterTransactionsByPeriod();

        // Calcular totales separados por moneda y tipo
        const totals = {
            UYU: {
                income: 0,
                expenses: 0,
                balance: 0
            },
            USD: {
                income: 0,
                expenses: 0,
                balance: 0
            },
            total: {
                income: 0,
                expenses: 0,
                balance: 0
            }
        };

        // Procesar cada transacción del período
        periodTransactions.forEach(transaction => {
            const currency = transaction.currency || 'UYU';
            const amount = transaction.amount;

            if (transaction.type === TransactionType.INCOME) {
                totals[currency].income += amount;
                totals.total.income += amount;
            } else if (transaction.type === TransactionType.EXPENSE) {
                totals[currency].expenses += amount;
                totals.total.expenses += amount;
            }
        });

        // Calcular balances
        totals.UYU.balance = totals.UYU.income - totals.UYU.expenses;
        totals.USD.balance = totals.USD.income - totals.USD.expenses;
        totals.total.balance = totals.total.income - totals.total.expenses;

        const totalSavings = this.goals.reduce((sum, g) => sum + g.currentSaved, 0);

        return {
            ...totals,
            totalSavings,
            transactionCount: periodTransactions.length
        };
    }

    /**
     * Renderiza el resumen financiero
     */
    renderFinancialSummary(summary) {
        // Formatear números según moneda
        const formatCurrency = (amount, currency) => {
            if (currency === 'USD') {
                return `$${amount.toLocaleString('en-US')}`;
            } else {
                return `$${amount.toLocaleString('es-UY')}`;
            }
        };

        // Actualizar elementos de UYU
        const totalIncomeUYU = document.getElementById('totalIncomeUYU');
        if (totalIncomeUYU) {
            totalIncomeUYU.textContent = formatCurrency(summary.UYU.income, 'UYU');
        }

        const totalExpensesUYU = document.getElementById('totalExpensesUYU');
        if (totalExpensesUYU) {
            totalExpensesUYU.textContent = formatCurrency(summary.UYU.expenses, 'UYU');
        }

        const totalBalanceUYU = document.getElementById('totalBalanceUYU');
        if (totalBalanceUYU) {
            totalBalanceUYU.textContent = formatCurrency(summary.UYU.balance, 'UYU');
        }

        // Actualizar elementos de USD
        const totalIncomeUSD = document.getElementById('totalIncomeUSD');
        if (totalIncomeUSD) {
            totalIncomeUSD.textContent = formatCurrency(summary.USD.income, 'USD');
        }

        const totalExpensesUSD = document.getElementById('totalExpensesUSD');
        if (totalExpensesUSD) {
            totalExpensesUSD.textContent = formatCurrency(summary.USD.expenses, 'USD');
        }

        const totalBalanceUSD = document.getElementById('totalBalanceUSD');
        if (totalBalanceUSD) {
            totalBalanceUSD.textContent = formatCurrency(summary.USD.balance, 'USD');
        }

        // Actualizar elementos de transferencia (para mostrar montos disponibles para transferir)
        const transferToUSD = document.getElementById('transferToUSD');
        if (transferToUSD) {
            transferToUSD.textContent = formatCurrency(summary.UYU.balance, 'UYU');
        }

        const transferToUYU = document.getElementById('transferToUYU');
        if (transferToUYU) {
            transferToUYU.textContent = formatCurrency(summary.USD.balance, 'USD');
        }

        // Mantener compatibilidad con elementos antiguos (si existen)
        const totalIncomeEl = document.getElementById('totalIncome');
        if (totalIncomeEl) {
            totalIncomeEl.textContent = formatCurrency(summary.total.income, 'UYU');
        }

        const totalExpensesEl = document.getElementById('totalExpenses');
        if (totalExpensesEl) {
            totalExpensesEl.textContent = formatCurrency(summary.total.expenses, 'UYU');
        }

        const balanceEl = document.getElementById('balance');
        if (balanceEl) {
            balanceEl.textContent = formatCurrency(summary.total.balance, 'UYU');
            balanceEl.className = summary.total.balance >= 0 ? 'positive' : 'negative';
        }

        const totalSavingsEl = document.getElementById('totalSavings');
        if (totalSavingsEl) {
            totalSavingsEl.textContent = formatCurrency(summary.totalSavings, 'UYU');
        }
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

            // Renderizar gráficos
            if (window.chartsManager) {
                this.renderCharts();
            }

        } catch (error) {
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
            const currency = document.getElementById('transactionCurrency').value;

            // Validaciones
            if (!type || !amount || !description || !category || !currency) {
                throw new Error('Todos los campos son requeridos');
            }

            // Crear transacción
            const transaction = {
                type,
                amount,
                description,
                category,
                date: new Date(date),
                currency
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

                    // Agregar a la lista local
                    transaction.id = result.data.transaction._id ? result.data.transaction._id.toString() : result.data.transaction.id;
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
                    // Intentar obtener detalles del error del servidor
                    let errorMessage = 'Error del servidor';
                    try {
                        const errorResult = await response.json();
                        if (errorResult.error) {
                            errorMessage = errorResult.error;
                        }
                        if (errorResult.details && Array.isArray(errorResult.details)) {
                            errorMessage += ': ' + errorResult.details.join(', ');
                        }
                    } catch (parseError) {
                    }

                    throw new Error(`HTTP ${response.status}: ${errorMessage}`);
                }
            } catch (backendError) {

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
            this.showNotification(error.message, 'error');
        }
    }

    /**
     * Maneja el envío del formulario de metas
     */
    async handleGoalSubmit(event) {
        event.preventDefault();

        try {
            // Mostrar indicador de carga
            const submitBtn = event.target.querySelector('button[type="submit"]');
            const originalText = submitBtn.innerHTML;
            submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Creando Meta...';
            submitBtn.disabled = true;

            // Obtener valores del formulario
            const name = document.getElementById('goalName').value.trim();
            const description = document.getElementById('goalDescription').value?.trim();

            // Información básica
            const currency = document.getElementById('goalCurrency').value;
            const category = document.getElementById('goalCategory').value?.trim();
            const priority = document.getElementById('goalPriority').value;

            // Fechas opcionales
            const currentDateInput = document.getElementById('currentDate').value;
            const targetDateInput = document.getElementById('goalDeadline').value;

            // Montos opcionales
            const currentAmountInput = document.getElementById('currentSaved').value;
            const targetAmountInput = document.getElementById('goalAmount').value;
            const expectedAmountInput = document.getElementById('expectedAmount').value;

            // Etiquetas y notas opcionales
            const tagsInput = document.getElementById('goalTags').value?.trim();
            const notes = document.getElementById('goalNotes').value?.trim();

            // Validación básica
            if (!name) {
                throw new Error('El nombre de la meta es requerido');
            }

            // Preparar datos para enviar a la API
            const goalData = {
                name: name,
                description: description,
                currency: currency,
                category: category,
                priority: priority
            };

            // Agregar campos opcionales solo si tienen valores
            if (currentDateInput) {
                goalData.currentDate = currentDateInput;
            }
            if (targetDateInput) {
                goalData.targetDate = targetDateInput;
            }
            if (currentAmountInput) {
                goalData.currentAmount = parseFloat(currentAmountInput);
            }
            if (targetAmountInput) {
                goalData.targetAmount = parseFloat(targetAmountInput);
            }
            if (expectedAmountInput) {
                goalData.expectedAmount = parseFloat(expectedAmountInput);
            }
            if (tagsInput) {
                goalData.tags = tagsInput.split(',').map(tag => tag.trim()).filter(tag => tag);
            }
            if (notes) {
                goalData.notes = notes;
            }

            // Determinar si estamos editando o creando
            const editingGoalId = document.getElementById('editingGoalId')?.value;
            const isEditing = !!editingGoalId;


            // Preparar la petición
            const apiUrl = isEditing ? `/api/goals/${editingGoalId}` : '/api/goals';
            const method = isEditing ? 'PUT' : 'POST';

            // Enviar a la API
            const response = await fetch(apiUrl, {
                method: method,
                headers: this.getAuthHeaders(),
                body: JSON.stringify(goalData)
            });

            const result = await response.json();

            if (!response.ok) {
                throw new Error(result.message || `Error al ${isEditing ? 'actualizar' : 'crear'} la meta`);
            }

            if (result.success) {

                // Limpiar formulario
                const form = event.target;
                form.reset();

                // Establecer valores por defecto
                this.setDefaultDates();

                // Cerrar modal
                this.closeGoalModal();

                // Recargar metas desde la API
                this.loadGoals();

                this.showNotification(`🎯 Meta "${name}" ${isEditing ? 'actualizada' : 'creada'} correctamente`, 'success');
            } else {
                throw new Error(result.message || `Error desconocido al ${isEditing ? 'actualizar' : 'crear'} la meta`);
            }

        } catch (error) {
            this.showNotification(`❌ Error: ${error.message}`, 'error');
        } finally {
            // Restaurar botón
            const submitBtn = event.target.querySelector('button[type="submit"]');
            if (submitBtn) {
                submitBtn.innerHTML = '<i class="fas fa-plus"></i> Crear Meta';
                submitBtn.disabled = false;
            }
        }
    }

    /**
     * Obtiene los headers con autenticación para las peticiones API
     */
    getAuthHeaders() {
        const headers = {
            'Content-Type': 'application/json'
        };

        // Agregar token JWT si existe
        const authData = localStorage.getItem('auth_data');
        if (authData) {
            try {
                const parsed = JSON.parse(authData);
                if (parsed.token) {
                    headers['Authorization'] = `Bearer ${parsed.token}`;
                }
            } catch (error) {
            }
        }

        return headers;
    }

    /**
     * Carga las metas desde la API
     */
    async loadGoals() {
        try {

            const headers = this.getAuthHeaders();

            if (headers['Authorization']) {
            }

            const response = await fetch('/api/goals', {
                method: 'GET',
                headers: headers
            });
            const result = await response.json();

            if (!response.ok) {
                throw new Error(result.message || 'Error al cargar metas');
            }

            if (result.success) {
                this.goals = result.data.goals || [];
                this.renderGoals();
            } else {
                throw new Error(result.message || 'Error desconocido al cargar metas');
            }

        } catch (error) {

            // Fallback: cargar desde localStorage
            try {
                const storedGoals = localStorage.getItem('fede_life_goals');
                if (storedGoals) {
                    this.goals = JSON.parse(storedGoals);
                    this.renderGoals();
                } else {
                    this.goals = [];
                    this.renderGoals();
                }
            } catch (storageError) {
                this.goals = [];
                this.renderGoals();
            }

            // Mostrar notificación informativa en lugar de error
            this.showNotification('🔄 Modo offline: usando datos locales', 'info');
        }
    }

    /**
     * Abre el modal para crear una nueva meta
     */
    openGoalModal() {
        const modal = document.getElementById('goalModal');
        if (modal) {
            // Usar !important para sobreescribir el CSS que oculta todos los modales
            modal.style.setProperty('display', 'flex', 'important');
            modal.style.zIndex = '10000'; // Asegurar que esté por encima de otros elementos

            // Resetear campos para nueva meta
            this.resetGoalModal();

            // Establecer fecha actual por defecto
            const currentDateInput = document.getElementById('currentDate');
            if (currentDateInput && !currentDateInput.value) {
                currentDateInput.valueAsDate = new Date();
            }

        } else {
        }
    }

    /**
     * Resetea el modal de metas para crear una nueva meta
     */
    resetGoalModal() {
        // Cambiar el título del modal
        const modalTitle = document.querySelector('#goalModal .modal-header h3');
        if (modalTitle) {
            modalTitle.innerHTML = '<i class="fas fa-target"></i> Nueva Meta de Ahorro';
        }

        // Limpiar el ID de edición
        const editingGoalIdField = document.getElementById('editingGoalId');
        if (editingGoalIdField) {
            editingGoalIdField.value = '';
        }

        // Cambiar el texto del botón
        const submitBtn = document.querySelector('#goalForm button[type="submit"]');
        if (submitBtn) {
            submitBtn.innerHTML = '<i class="fas fa-plus"></i> Crear Meta';
        }

    }

    /**
     * Cierra el modal de crear meta
     */
    closeGoalModal() {
        const modal = document.getElementById('goalModal');
        if (modal) {
            // Usar !important para sobreescribir cualquier estilo que pueda estar mostrándolo
            modal.style.setProperty('display', 'none', 'important');
            // Limpiar formulario
            const form = modal.querySelector('#goalForm');
            if (form) {
                form.reset();
            }
        }
    }





    /**
     * Renderiza la lista de presupuestos
     */
    renderBudgets() {
        const budgetList = document.getElementById('budgetList');
        if (!budgetList) return;

        if (this.budgets.length === 0) {
            budgetList.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-chart-pie"></i>
                    <h3>No hay presupuestos configurados</h3>
                    <p>Haz clic en "Agregar Categoría" para crear tu primer presupuesto</p>
                </div>
            `;
            return;
        }

        budgetList.innerHTML = this.budgets.map(budget => `
            <div class="budget-item" data-id="${budget.id}">
                <div class="budget-header">
                    <h4>${budget.category}</h4>
                    <div class="budget-actions">
                        <button onclick="editBudget('${budget.id}')" title="Editar">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button onclick="deleteBudget('${budget.id}')" title="Eliminar">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </div>
                <div class="budget-details">
                    <div class="budget-amount">
                        <span class="label">Presupuesto:</span>
                        <span class="amount">$${budget.amount.toLocaleString('es-AR', { minimumFractionDigits: 2 })}</span>
                    </div>
                    <div class="budget-spent">
                        <span class="label">Gastado:</span>
                        <span class="amount">$${budget.spent.toLocaleString('es-AR', { minimumFractionDigits: 2 })}</span>
                    </div>
                    <div class="budget-remaining">
                        <span class="label">Restante:</span>
                        <span class="amount ${budget.amount - budget.spent < 0 ? 'negative' : ''}">
                            $${(budget.amount - budget.spent).toLocaleString('es-AR', { minimumFractionDigits: 2 })}
                        </span>
                    </div>
                </div>
                <div class="budget-progress">
                    <div class="progress-bar">
                        <div class="progress-fill" style="width: ${Math.min((budget.spent / budget.amount) * 100, 100)}%"></div>
                    </div>
                    <span class="progress-text">${Math.round((budget.spent / budget.amount) * 100)}%</span>
                </div>
            </div>
        `).join('');
    }

    /**
     * Renderiza la lista de metas guardadas
     */
    renderGoals() {
        const goalsContainer = document.getElementById('goalsList');
        const createGoalSection = document.querySelector('.create-goal-section');

        if (!goalsContainer) {
            return;
        }

        // La sección de crear meta siempre está visible

        if (!this.goals || this.goals.length === 0) {
            goalsContainer.innerHTML = '';
            return;
        }

        const goalsHTML = this.goals.map(goal => {
            const progress = goal.targetAmount ? (goal.currentAmount / goal.targetAmount) * 100 : 0;
            const progressClass = progress >= 100 ? 'completed' : progress >= 75 ? 'high' : progress >= 50 ? 'medium' : 'low';

            const targetDateDisplay = goal.targetDate ? new Date(goal.targetDate).toLocaleDateString('es-UY') : 'Sin fecha objetivo';
            const currentDateDisplay = goal.currentDate ? new Date(goal.currentDate).toLocaleDateString('es-UY') : null;
            const daysLeft = goal.targetDate ? Math.ceil((new Date(goal.targetDate) - new Date()) / (1000 * 60 * 60 * 24)) : null;
            const targetDateStatus = daysLeft !== null ? (daysLeft < 0 ? 'expired' : daysLeft <= 7 ? 'urgent' : 'normal') : 'no-deadline';

            // Formatear montos
            const formattedCurrentAmount = new Intl.NumberFormat('es-UY', {
                style: 'currency',
                currency: goal.currency || 'UYU'
            }).format(goal.currentAmount || 0);

            const formattedTargetAmount = goal.targetAmount ? new Intl.NumberFormat('es-UY', {
                style: 'currency',
                currency: goal.currency || 'UYU'
            }).format(goal.targetAmount) : null;

            const formattedExpectedAmount = goal.expectedAmount ? new Intl.NumberFormat('es-UY', {
                style: 'currency',
                currency: goal.currency || 'UYU'
            }).format(goal.expectedAmount) : null;

            return `
                <div class="goal-item" data-goal-id="${goal._id}">
                    <div class="goal-header">
                        <div class="goal-info">
                            <h3 class="goal-name">
                                ${goal.name}
                                ${goal.priority !== 'medium' ? `<span class="goal-priority priority-${goal.priority}">${goal.priorityLabel}</span>` : ''}
                            </h3>
                            <div class="goal-meta">
                                ${goal.targetAmount ? `<span class="goal-amount">Objetivo: ${formattedTargetAmount}</span>` : '<span class="goal-amount">Sin monto objetivo</span>'}
                                <span class="goal-deadline ${targetDateStatus}">📅 ${targetDateDisplay}</span>
                                ${goal.category ? `<span class="goal-category">🏷️ ${goal.category}</span>` : ''}
                            </div>
                        </div>
                        <div class="goal-actions">
                            <button onclick="editGoalGlobal('${goal._id}')" title="Editar meta">
                                <i class="fas fa-edit"></i>
                            </button>
                            <button onclick="deleteGoalGlobal('${goal._id}')" title="Eliminar meta">
                                <i class="fas fa-trash"></i>
                            </button>
                            ${goal.targetAmount && goal.currentAmount < goal.targetAmount ? `
                                <button onclick="addToGoalGlobal('${goal._id}')" title="Agregar ahorro">
                                    <i class="fas fa-plus"></i>
                                </button>
                            ` : ''}
                        </div>
                    </div>

                    ${goal.targetAmount ? `
                        <div class="goal-progress">
                            <div class="progress-info">
                                <span class="progress-text">Ahorrado: ${formattedCurrentAmount} / ${formattedTargetAmount}</span>
                                <span class="progress-percentage">${progress.toFixed(1)}%</span>
                            </div>
                            <div class="progress-bar">
                                <div class="progress-fill ${progressClass}" style="width: ${Math.min(progress, 100)}%"></div>
                            </div>
                        </div>
                    ` : `
                        <div class="goal-current-amount">
                            <span class="current-amount-label">Monto actual:</span>
                            <span class="current-amount-value">${formattedCurrentAmount}</span>
                        </div>
                    `}

                    ${goal.expectedAmount ? `
                        <div class="goal-expected-amount">
                            <span class="expected-amount-label">Monto esperado:</span>
                            <span class="expected-amount-value">${formattedExpectedAmount}</span>
                        </div>
                    ` : ''}

                    ${goal.description ? `
                        <div class="goal-description">
                            <p>${goal.description}</p>
                        </div>
                    ` : ''}

                    ${(goal.tags && goal.tags.length > 0) ? `
                        <div class="goal-tags">
                            ${goal.tags.map(tag => `<span class="goal-tag">${tag}</span>`).join('')}
                        </div>
                    ` : ''}

                    ${currentDateDisplay ? `
                        <div class="goal-current-date">
                            <small>📅 Fecha actual: ${currentDateDisplay}</small>
                        </div>
                    ` : ''}

                    ${daysLeft !== null && daysLeft >= 0 ? `
                        <div class="goal-time-left">
                            ${daysLeft === 0 ? '¡Hoy es la fecha objetivo!' : `Quedan ${daysLeft} día${daysLeft !== 1 ? 's' : ''}`}
                        </div>
                    ` : ''}
                </div>
            `;
        }).join('');

        // Agregar botón pequeño al final cuando hay metas
        const addGoalButton = `
            <div class="add-goal-small">
                <button type="button" onclick="window.financeApp.openGoalModal()" class="add-goal-small-btn">
                    <i class="fas fa-plus"></i>
                    <span>Agregar Nueva Meta</span>
                </button>
            </div>
        `;

        goalsContainer.innerHTML = goalsHTML + addGoalButton;

    }

    /**
     * Edita una meta existente
     */
    editGoal(goalId) {

        // Buscar la meta por ID
        const goal = this.goals.find(g => g._id === goalId || g.id === goalId);
        if (!goal) {
            this.showNotification('Meta no encontrada', 'error');
            return;
        }

        // Abrir el modal
        this.openGoalModal();

        // Cambiar el título del modal
        const modalTitle = document.querySelector('#goalModal .modal-header h3');
        if (modalTitle) {
            modalTitle.innerHTML = '<i class="fas fa-edit"></i> Editar Meta de Ahorro';
        }

        // Establecer el ID de la meta en edición
        const editingGoalIdField = document.getElementById('editingGoalId');
        if (editingGoalIdField) {
            editingGoalIdField.value = goalId;
        }

        // Completar los campos del formulario con los datos de la meta
        this.populateGoalForm(goal);

        // Cambiar el texto del botón
        const submitBtn = document.querySelector('#goalForm button[type="submit"]');
        if (submitBtn) {
            submitBtn.innerHTML = '<i class="fas fa-save"></i> Actualizar Meta';
        }

    }

    /**
     * Completa el formulario con los datos de una meta existente
     */
    populateGoalForm(goal) {
        // Información básica
        const nameField = document.getElementById('goalName');
        const descriptionField = document.getElementById('goalDescription');
        const currencyField = document.getElementById('goalCurrency');
        const categoryField = document.getElementById('goalCategory');
        const priorityField = document.getElementById('goalPriority');

        if (nameField) nameField.value = goal.name || '';
        if (descriptionField) descriptionField.value = goal.description || '';
        if (currencyField) currencyField.value = goal.currency || 'UYU';
        if (categoryField) categoryField.value = goal.category || '';
        if (priorityField) priorityField.value = goal.priority || 'medium';

        // Fechas
        const currentDateField = document.getElementById('currentDate');
        const targetDateField = document.getElementById('goalDeadline');

        if (currentDateField && goal.currentDate) {
            const currentDate = new Date(goal.currentDate);
            currentDateField.value = currentDate.toISOString().split('T')[0];
        } else if (currentDateField) {
            currentDateField.value = '';
        }

        if (targetDateField && goal.targetDate) {
            const targetDate = new Date(goal.targetDate);
            targetDateField.value = targetDate.toISOString().split('T')[0];
        } else if (targetDateField) {
            targetDateField.value = '';
        }

        // Montos
        const currentAmountField = document.getElementById('currentSaved');
        const targetAmountField = document.getElementById('goalAmount');
        const expectedAmountField = document.getElementById('expectedAmount');

        if (currentAmountField) currentAmountField.value = goal.currentAmount || '';
        if (targetAmountField) targetAmountField.value = goal.targetAmount || '';
        if (expectedAmountField) expectedAmountField.value = goal.expectedAmount || '';

        // Etiquetas y notas
        const tagsField = document.getElementById('goalTags');
        const notesField = document.getElementById('goalNotes');

        if (tagsField) {
            const tags = goal.tags ? goal.tags.join(', ') : '';
            tagsField.value = tags;
        }
        if (notesField) notesField.value = goal.notes || '';

    }

    /**
     * Elimina una meta
     */
    deleteGoal(goalId) {
        const goal = this.goals.find(g => g.id === goalId);
        if (!goal) {
            this.showNotification('Meta no encontrada', 'error');
            return;
        }

        if (confirm(`¿Estás seguro de que deseas eliminar la meta "${goal.name}"?`)) {
            // Remover del array
            this.goals = this.goals.filter(g => g.id !== goalId);

            // Guardar cambios
            this.saveDataToStorage();

            // Re-renderizar
            this.renderGoals();

            this.showNotification(`Meta "${goal.name}" eliminada`, 'success');
        }
    }

    /**
     * Maneja el envío del formulario de categorías
     * Ahora guarda en la base de datos MongoDB
     */
    async handleCategorySubmit(event) {
        event.preventDefault();

        try {
            const type = document.getElementById('categoryType').value;
            const name = document.getElementById('categoryName').value;
            const color = document.getElementById('categoryColor').value;
            const description = document.getElementById('categoryDescription').value;

            if (!type || !name) {
                throw new Error('Tipo y nombre son requeridos');
            }

            // Preparar datos para enviar al backend
            const categoryData = {
                name: name.trim(),
                type: type,
                color: color,
                description: description?.trim() || ''
            };

            // Mostrar loading
            this.showNotification('Guardando categoría...', 'info');

            // Hacer llamada al backend API
            const response = await fetch('/api/categories', {
                method: 'POST',
                headers: this.getAuthHeaders(),
                body: JSON.stringify(categoryData)
            });

            const result = await response.json();

            if (!response.ok) {
                throw new Error(result.message || 'Error al crear la categoría');
            }

            if (result.success) {
                // Agregar la categoría guardada al array local
                const savedCategory = {
                    id: result.data.category.id,
                    name: result.data.category.name,
                    type: result.data.category.type,
                    color: result.data.category.color,
                    description: result.data.category.description,
                    isCustom: result.data.category.isCustom,
                    usageStats: result.data.category.usageStats,
                    createdAt: result.data.category.createdAt
                };

                // Agregar a la lista local
                this.categories.push(savedCategory);

                // Guardar en localStorage (para mantener sincronización)
                this.saveDataToStorage();

                // Re-renderizar categorías
                this.renderCategories();

                // Limpiar formulario
                const form = event.target;
                form.reset();
                document.getElementById('categoryColor').value = '#3498db';

                // Mostrar notificación de éxito
                this.showNotification(`Categoría "${name}" agregada correctamente`, 'success');

            } else {
                throw new Error(result.message || 'Error desconocido al crear la categoría');
            }

        } catch (error) {
            console.error('❌ Error al agregar la categoría:', error);
            this.showNotification(error.message || 'Error al agregar la categoría', 'error');
        }
    }

    /**
     * Calcula el resumen financiero
     * @returns {Object} Resumen financiero
     */
    calculateFinancialSummary() {
        // Usar la nueva función para filtrar por período actual
        const periodTransactions = this.filterTransactionsByPeriod();

        // Calcular totales separados por moneda y tipo
        const totals = {
            UYU: {
                income: 0,
                expenses: 0,
                balance: 0
            },
            USD: {
                income: 0,
                expenses: 0,
                balance: 0
            },
            total: {
                income: 0,
                expenses: 0,
                balance: 0
            }
        };

        // Procesar cada transacción del período
        periodTransactions.forEach(transaction => {
            const currency = transaction.currency || 'UYU';
            const amount = transaction.amount;

            if (transaction.type === TransactionType.INCOME) {
                totals[currency].income += amount;
                totals.total.income += amount;
            } else if (transaction.type === TransactionType.EXPENSE) {
                totals[currency].expenses += amount;
                totals.total.expenses += amount;
            }
        });

        // Calcular balances
        totals.UYU.balance = totals.UYU.income - totals.UYU.expenses;
        totals.USD.balance = totals.USD.income - totals.USD.expenses;
        totals.total.balance = totals.total.income - totals.total.expenses;

        const totalSavings = this.goals.reduce((sum, g) => sum + g.currentSaved, 0);

        return {
            ...totals,
            totalSavings,
            transactionCount: periodTransactions.length
        };
    }

    /**
     * Renderiza el resumen financiero
     * @param {Object} summary - Resumen financiero
     */
    renderFinancialSummary(summary) {
        // Formatear números según moneda
        const formatCurrency = (amount, currency) => {
            if (currency === 'USD') {
                return `$${amount.toLocaleString('en-US')}`;
            } else {
                return `$${amount.toLocaleString('es-UY')}`;
            }
        };

        // Actualizar elementos de UYU
        const totalIncomeUYU = document.getElementById('totalIncomeUYU');
        if (totalIncomeUYU) {
            totalIncomeUYU.textContent = formatCurrency(summary.UYU.income, 'UYU');
        }

        const totalExpensesUYU = document.getElementById('totalExpensesUYU');
        if (totalExpensesUYU) {
            totalExpensesUYU.textContent = formatCurrency(summary.UYU.expenses, 'UYU');
        }

        const totalBalanceUYU = document.getElementById('totalBalanceUYU');
        if (totalBalanceUYU) {
            totalBalanceUYU.textContent = formatCurrency(summary.UYU.balance, 'UYU');
        }

        // Actualizar elementos de USD
        const totalIncomeUSD = document.getElementById('totalIncomeUSD');
        if (totalIncomeUSD) {
            totalIncomeUSD.textContent = formatCurrency(summary.USD.income, 'USD');
        }

        const totalExpensesUSD = document.getElementById('totalExpensesUSD');
        if (totalExpensesUSD) {
            totalExpensesUSD.textContent = formatCurrency(summary.USD.expenses, 'USD');
        }

        const totalBalanceUSD = document.getElementById('totalBalanceUSD');
        if (totalBalanceUSD) {
            totalBalanceUSD.textContent = formatCurrency(summary.USD.balance, 'USD');
        }

        // Actualizar elementos de transferencia (para mostrar montos disponibles para transferir)
        const transferToUSD = document.getElementById('transferToUSD');
        if (transferToUSD) {
            transferToUSD.textContent = formatCurrency(summary.UYU.balance, 'UYU');
        }

        const transferToUYU = document.getElementById('transferToUYU');
        if (transferToUYU) {
            transferToUYU.textContent = formatCurrency(summary.USD.balance, 'USD');
        }

        // Mantener compatibilidad con elementos antiguos (si existen)
        const totalIncomeEl = document.getElementById('totalIncome');
        if (totalIncomeEl) {
            totalIncomeEl.textContent = formatCurrency(summary.total.income, 'UYU');
        }

        const totalExpensesEl = document.getElementById('totalExpenses');
        if (totalExpensesEl) {
            totalExpensesEl.textContent = formatCurrency(summary.total.expenses, 'UYU');
        }

        const balanceEl = document.getElementById('balance');
        if (balanceEl) {
            balanceEl.textContent = formatCurrency(summary.total.balance, 'UYU');
            balanceEl.className = summary.total.balance >= 0 ? 'positive' : 'negative';
        }

        const totalSavingsEl = document.getElementById('totalSavings');
        if (totalSavingsEl) {
            totalSavingsEl.textContent = formatCurrency(summary.totalSavings, 'UYU');
        }
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

        } catch (error) {
        }
    }

    /**
     * Prepara datos para gráficos
     * @param {string} type - Tipo de datos (expense/income)
     * @returns {Array} Datos formateados para gráficos
     */
    prepareChartData(type, currency = null) {
        // Filtrar transacciones del período actual por tipo y opcionalmente por moneda
        const periodTransactions = this.filterTransactionsByPeriod().filter(t => {
            const typeMatch = t.type === type;
            const currencyMatch = currency ? (t.currency || 'UYU') === currency : true;
            return typeMatch && currencyMatch;
        });

        // Agrupar por categoría
        const categoryTotals = {};
        periodTransactions.forEach(transaction => {
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
            
            // Actualizar el dropdown de categorías para transacciones
            this.populateTransactionCategoryDropdown();

        } catch (error) {
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
            return;
        }

        // Filtrar categorías por tipo
        const typeCategories = this.categories.filter(cat => cat.type === type);
        
        if (typeCategories.length === 0) {
            container.innerHTML = `<p class="no-categories">No hay categorías de ${title.toLowerCase()}</p>`;
            return;
        }

        // Crear HTML para las categorías
        const categoriesHTML = typeCategories.map(category => {
            const transactionCount = this.getTransactionCountByCategory(category.name);
            const totalAmount = this.getTotalAmountByCategory(category.name);


            return `
            <div class="category-item" data-category-id="${category.id}" onclick="showCategoryDetailsGlobal('${category.id}')" style="cursor: pointer;">
                <div class="category-color" style="background-color: ${category.color}"></div>
                <div class="category-info">
                    <span class="category-name">${category.name}</span>
                    <span class="category-count">${transactionCount} transacción${transactionCount !== 1 ? 'es' : ''}</span>
                    <span class="category-total">${type === 'income' ? '+' : '-'}${category.currency === 'UYU' ? '$U' : '$'}${totalAmount.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                </div>
                <div class="category-actions">
                    <button class="btn-view-category" onclick="event.stopPropagation(); showCategoryDetailsGlobal('${category.id}')" title="Ver detalles">
                        👁️
                    </button>
                    <button class="btn-edit-category" onclick="event.stopPropagation(); editCategoryGlobal('${category.id}')" title="Editar categoría">
                        ✏️
                    </button>
                    <button class="btn-delete-category" onclick="event.stopPropagation(); deleteCategoryGlobal('${category.id}')" title="Eliminar categoría">
                        🗑️
                    </button>
                </div>
            </div>
            `;
        }).join('');

        container.innerHTML = `
            <h3 class="category-section-title">${title}</h3>
            <div class="categories-list">
                ${categoriesHTML}
            </div>
        `;
    }

    /**
     * Pobla el dropdown de categorías para transacciones
     * Esta función actualiza dinámicamente el select de categorías
     * con todas las categorías disponibles del usuario
     */
    populateTransactionCategoryDropdown() {
        try {
            // Obtener el elemento select del dropdown
            const categoryDropdown = document.getElementById('transactionCategory');
            
            if (!categoryDropdown) {
                return;
            }

            // Limpiar opciones existentes (mantener la primera opción por defecto)
            const defaultOption = categoryDropdown.querySelector('option[value=""]');
            categoryDropdown.innerHTML = '';
            
            // Restaurar la opción por defecto
            if (defaultOption) {
                categoryDropdown.appendChild(defaultOption);
            } else {
                // Si no existe la opción por defecto, crearla
                const defaultOpt = document.createElement('option');
                defaultOpt.value = '';
                defaultOpt.textContent = 'Categoría';
                categoryDropdown.appendChild(defaultOpt);
            }

            // Agregar todas las categorías disponibles
            this.categories.forEach(category => {
                const option = document.createElement('option');
                option.value = category.name; // Usar el nombre como valor
                option.textContent = category.name;
                
                // Agregar estilo visual con el color de la categoría
                option.style.color = category.color;
                option.style.fontWeight = 'bold';
                
                categoryDropdown.appendChild(option);
            });

        } catch (error) {
        }
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
     * Obtiene el monto total de transacciones por categoría
     * @param {string} categoryName - Nombre de la categoría
     * @returns {number} Monto total
     */
    getTotalAmountByCategory(categoryName) {
        return this.transactions
            .filter(t => t.category === categoryName)
            .reduce((total, t) => total + t.amount, 0);
    }

    /**
     * Muestra los detalles de una categoría con el desglose de gastos
     * @param {string} categoryId - ID de la categoría
     */
    showCategoryDetails(categoryId) {
        console.log('🔍 showCategoryDetails called with categoryId:', categoryId);

        // Verificar que categoryId sea válido
        if (!categoryId || typeof categoryId !== 'string' || categoryId.trim() === '') {
            console.error('❌ Invalid categoryId:', categoryId);
            this.showNotification('ID de categoría inválido', 'error');
            return;
        }

        // Verificar que tengamos categorías cargadas
        if (!this.categories || !Array.isArray(this.categories)) {
            console.error('❌ Categories not loaded:', this.categories);
            this.showNotification('Error: Categorías no cargadas', 'error');
            return;
        }

        console.log('✅ Categories loaded:', this.categories.length);
        const category = this.categories.find(c => c.id === categoryId);
        if (!category) {
            console.error('❌ Category not found:', categoryId, 'in categories:', this.categories);
            this.showNotification(`Categoría no encontrada: ${categoryId}`, 'error');
            return;
        }

        console.log('✅ Category found:', category);

        // Obtener transacciones de esta categoría
        const categoryTransactions = this.transactions
            .filter(t => t.category === category.name)
            .sort((a, b) => new Date(b.date) - new Date(a.date));

        console.log('✅ Category transactions found:', categoryTransactions.length);

        // Crear modal con detalles
        const modal = this.createCategoryDetailsModal(category, categoryTransactions);
        if (!modal) {
            console.error('❌ Failed to create modal');
            this.showNotification('Error al crear el modal', 'error');
            return;
        }

        document.body.appendChild(modal);
        console.log('✅ Modal added to DOM');

        // Hacer visible el modal con debugging visual y forzar estilos
        modal.style.display = 'flex !important';
        modal.style.zIndex = '999999 !important';
        modal.style.position = 'fixed !important';
        modal.style.top = '0 !important';
        modal.style.left = '0 !important';
        modal.style.width = '100vw !important';
        modal.style.height = '100vh !important';
        modal.style.backgroundColor = 'rgba(0, 0, 0, 0.8) !important';
        modal.style.justifyContent = 'center !important';
        modal.style.alignItems = 'center !important';

        // Agregar indicadores visuales de debugging
        modal.style.border = '5px solid red !important';

        // Forzar estilos del contenido del modal
        const modalContent = modal.querySelector('.modal-content');
        if (modalContent) {
            modalContent.style.position = 'relative !important';
            modalContent.style.zIndex = '1000000 !important';
            modalContent.style.backgroundColor = 'white !important';
            modalContent.style.borderRadius = '12px !important';
            modalContent.style.boxShadow = '0 10px 40px rgba(0, 0, 0, 0.3) !important';
            modalContent.style.maxWidth = '90vw !important';
            modalContent.style.maxHeight = '90vh !important';
            modalContent.style.overflowY = 'auto !important';
            modalContent.style.visibility = 'visible !important';
            modalContent.style.opacity = '1 !important';
        }

        // Agregar texto de debugging
        const debugInfo = document.createElement('div');
        debugInfo.innerHTML = `
            <div style="position: fixed; top: 10px; right: 10px; background: yellow; padding: 10px; z-index: 10001; border: 2px solid red;">
                🔧 DEBUG: Modal creado<br>
                ID: ${categoryId}<br>
                Timestamp: ${new Date().toLocaleTimeString()}<br>
                <button onclick="this.parentElement.remove(); document.querySelector('.modal').style.border='none';">Cerrar Debug</button>
            </div>
        `;
        document.body.appendChild(debugInfo);

        console.log('✅ Modal displayed');
        console.log('🔍 Modal element:', modal);
        console.log('🔍 Modal styles:', window.getComputedStyle(modal));
        console.log('🔍 Modal position:', modal.getBoundingClientRect());

    }

    /**
     * Crea el modal de detalles de categoría
     * @param {Object} category - Objeto de la categoría
     * @param {Array} transactions - Array de transacciones de la categoría
     * @returns {HTMLElement} Modal creado
     */
    createCategoryDetailsModal(category, transactions) {
        const totalAmount = transactions.reduce((sum, t) => sum + t.amount, 0);
        const transactionCount = transactions.length;
        const currencySymbol = category.type === 'income' ? '+' : '-';

        // Crear HTML para la lista de transacciones
        const transactionsHTML = transactions.length > 0
            ? transactions.map(transaction => {
                const transactionDate = new Date(transaction.date);
                const dateDisplay = transactionDate.toLocaleDateString('es-AR', {
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric'
                });

                return `
                <div class="category-transaction-item" data-transaction-id="${transaction.id}">
                    <div class="transaction-date">${dateDisplay}</div>
                    <div class="transaction-description">${transaction.description}</div>
                    <div class="transaction-amount ${transaction.type}">
                        ${currencySymbol}${transaction.currency === 'UYU' ? '$U' : '$'}${transaction.amount.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </div>
                    <div class="transaction-actions">
                        <button onclick="window.financeApp.editTransaction('${transaction.id}')" title="Editar">
                            ✏️
                        </button>
                        <button onclick="window.financeApp.handleDeleteClick({currentTarget: {getAttribute: () => '${transaction.id}'}})" title="Eliminar">
                            🗑️
                        </button>
                    </div>
                </div>
                `;
            }).join('')
            : '<p class="no-transactions">No hay transacciones registradas en esta categoría</p>';

        const modal = document.createElement('div');
        modal.className = 'modal category-details-modal';
        modal.innerHTML = `
            <div class="modal-content category-details-content">
                <div class="modal-header" style="background: linear-gradient(135deg, ${category.color}20 0%, ${category.color}40 100%);">
                    <div class="category-header-info">
                        <div class="category-color-indicator" style="background-color: ${category.color}"></div>
                        <div>
                            <h2>${category.name}</h2>
                            <p class="category-type">${category.type === 'income' ? 'Categoría de Ingresos' : 'Categoría de Gastos'}</p>
                        </div>
                    </div>
                    <button class="modal-close" onclick="this.closest('.modal').remove()">×</button>
                </div>
                <div class="modal-body">
                    <div class="category-summary">
                        <div class="summary-stats">
                            <div class="stat-item">
                                <span class="stat-label">Total de Transacciones</span>
                                <span class="stat-value">${transactionCount}</span>
                            </div>
                            <div class="stat-item">
                                <span class="stat-label">Monto Total</span>
                                <span class="stat-value ${category.type}">${currencySymbol}${category.currency === 'UYU' ? '$U' : '$'}${totalAmount.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                            </div>
                            <div class="stat-item">
                                <span class="stat-label">Promedio por Transacción</span>
                                <span class="stat-value">${transactionCount > 0 ? `${currencySymbol}${category.currency === 'UYU' ? '$U' : '$'}${(totalAmount / transactionCount).toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '$0.00'}</span>
                            </div>
                        </div>
                    </div>

                    <div class="category-transactions">
                        <h3>📋 Desglose de Transacciones</h3>
                        <div class="transactions-list-detailed">
                            ${transactionsHTML}
                        </div>
                    </div>
                </div>
                <div class="modal-footer">
                    <button class="btn btn-secondary" onclick="this.closest('.modal').remove()">
                        <i class="fas fa-times"></i> Cerrar
                    </button>
                    <button class="btn btn-primary" onclick="window.financeApp.exportCategoryData('${category.id}')">
                        <i class="fas fa-download"></i> Exportar Datos
                    </button>
                </div>
            </div>
        `;

        return modal;
    }

    /**
     * Edita una transacción existente
     * @param {string} transactionId - ID de la transacción a editar
     */
    editTransaction(transactionId) {
        // Buscar la transacción por ID
        const transaction = this.transactions.find(t => t.id === transactionId);
        if (!transaction) {
            this.showNotification('Transacción no encontrada', 'error');
            return;
        }

        // Crear modal de edición
        this.showEditTransactionModal(transaction);
    }

    /**
     * Muestra el modal para editar una transacción
     * @param {Object} transaction - Transacción a editar
     */
    showEditTransactionModal(transaction) {
        const modal = document.createElement('div');
        modal.className = 'modal edit-transaction-modal';
        modal.innerHTML = `
            <div class="modal-content edit-transaction-content">
                <div class="modal-header">
                    <h3><i class="fas fa-edit"></i> Editar Transacción</h3>
                    <button class="modal-close" onclick="this.closest('.modal').remove()">×</button>
                </div>
                <div class="modal-body">
                    <form id="editTransactionForm" class="edit-transaction-form">
                        <!-- Campo oculto para ID -->
                        <input type="hidden" id="editTransactionId" value="${transaction.id}">

                        <!-- Tipo de transacción -->
                        <div class="form-group">
                            <label for="editTransactionType">Tipo de Transacción *</label>
                            <select id="editTransactionType" required>
                                <option value="income" ${transaction.type === 'income' ? 'selected' : ''}>Ingreso</option>
                                <option value="expense" ${transaction.type === 'expense' ? 'selected' : ''}>Gasto</option>
                            </select>
                        </div>

                        <!-- Monto -->
                        <div class="form-group">
                            <label for="editTransactionAmount">Monto *</label>
                            <input type="number" id="editTransactionAmount" value="${transaction.amount}" step="0.01" required>
                        </div>

                        <!-- Descripción -->
                        <div class="form-group">
                            <label for="editTransactionDescription">Descripción *</label>
                            <input type="text" id="editTransactionDescription" value="${transaction.description}" required>
                        </div>

                        <!-- Categoría -->
                        <div class="form-group">
                            <label for="editTransactionCategory">Categoría *</label>
                            <select id="editTransactionCategory" required>
                                <option value="">Seleccionar categoría</option>
                                ${this.generateCategoryOptions(transaction.type, transaction.category)}
                            </select>
                        </div>

                        <!-- Fecha -->
                        <div class="form-group">
                            <label for="editTransactionDate">Fecha *</label>
                            <input type="date" id="editTransactionDate" value="${transaction.date.toISOString().split('T')[0]}" required>
                        </div>

                        <!-- Moneda -->
                        <div class="form-group">
                            <label for="editTransactionCurrency">Moneda *</label>
                            <select id="editTransactionCurrency" required>
                                <option value="UYU" ${transaction.currency === 'UYU' ? 'selected' : ''}>Pesos (UYU)</option>
                                <option value="USD" ${transaction.currency === 'USD' ? 'selected' : ''}>Dólares (USD)</option>
                            </select>
                        </div>

                        <div class="form-actions">
                            <button type="button" class="btn btn-secondary" onclick="this.closest('.modal').remove()">
                                <i class="fas fa-times"></i> Cancelar
                            </button>
                            <button type="submit" class="btn btn-primary">
                                <i class="fas fa-save"></i> Guardar Cambios
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        `;

        document.body.appendChild(modal);

        // Configurar event listeners
        this.setupEditTransactionForm();

        // Mostrar modal
        modal.style.display = 'block';
        modal.style.zIndex = '10000';
    }

    /**
     * Genera opciones de categoría para el dropdown de edición
     * @param {string} transactionType - Tipo de transacción (income/expense)
     * @param {string} currentCategory - Categoría actual
     * @returns {string} HTML de opciones
     */
    generateCategoryOptions(transactionType, currentCategory) {
        // Mostrar todas las categorías disponibles, no solo del tipo actual
        // Esto permite cambiar el tipo de transacción y elegir cualquier categoría
        return this.categories.map(category => `
            <option value="${category.name}" ${category.name === currentCategory ? 'selected' : ''}>
                ${category.name} (${category.type === 'income' ? 'Ingreso' : 'Gasto'})
            </option>
        `).join('');
    }

    /**
     * Configura los event listeners del formulario de edición
     */
    setupEditTransactionForm() {
        const form = document.getElementById('editTransactionForm');
        const typeSelect = document.getElementById('editTransactionType');
        const categorySelect = document.getElementById('editTransactionCategory');

        if (form) {
            form.addEventListener('submit', (e) => {
                e.preventDefault();
                this.handleEditTransactionSubmit(e);
            });
        }

        // Actualizar categorías cuando cambia el tipo (ya no es necesario filtrar)
        if (typeSelect && categorySelect) {
            typeSelect.addEventListener('change', () => {
                const currentCategory = categorySelect.value;
                // Mantener las mismas opciones ya que ahora mostramos todas las categorías
                // Solo actualizar la selección actual
                const options = categorySelect.querySelectorAll('option');
                options.forEach(option => {
                    option.selected = option.value === currentCategory;
                });
            });
        }
    }

    /**
     * Maneja el envío del formulario de edición de transacción
     * @param {Event} event - Evento del formulario
     */
    async handleEditTransactionSubmit(event) {
        const formData = new FormData(event.target);
        const transactionId = formData.get('editTransactionId');

        const updatedData = {
            type: formData.get('editTransactionType'),
            amount: parseFloat(formData.get('editTransactionAmount')),
            description: formData.get('editTransactionDescription'),
            category: formData.get('editTransactionCategory'),
            date: formData.get('editTransactionDate'),
            currency: formData.get('editTransactionCurrency')
        };

        // Validación
        if (!updatedData.description || !updatedData.category || !updatedData.date) {
            this.showNotification('Por favor complete todos los campos obligatorios', 'error');
            return;
        }

        if (isNaN(updatedData.amount) || updatedData.amount <= 0) {
            this.showNotification('El monto debe ser un número positivo', 'error');
            return;
        }

        try {
            // Actualizar la transacción en el servidor
            const response = await this.apiRequest(`${this.API_BASE_URL}/api/transactions/${transactionId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(updatedData)
            });

            if (response.success) {
                // Actualizar en memoria
                const index = this.transactions.findIndex(t => t.id === transactionId);
                if (index !== -1) {
                    this.transactions[index] = { ...this.transactions[index], ...updatedData };
                }

                // Cerrar modal y refrescar vistas
                event.target.closest('.modal').remove();
                this.showNotification('Transacción actualizada exitosamente', 'success');

                // Refrescar datos
                await this.loadData();

            } else {
                throw new Error(response.error || 'Error al actualizar la transacción');
            }
        } catch (error) {
            console.error('Error updating transaction:', error);
            this.showNotification('Error al actualizar la transacción', 'error');
        }
    }

    /**
     * Exporta los datos de una categoría
     */
    exportCategoryData(categoryId) {

        const category = this.categories.find(c => c.id === categoryId);
        if (!category) {
            this.showNotification('Categoría no encontrada', 'error');
            return;
        }

        const transactions = this.transactions.filter(t => t.category === category.name);

        // Crear contenido CSV
        let csvContent = `Categoría: ${category.name}\n`;
        csvContent += `Tipo: ${category.type === 'income' ? 'Ingreso' : 'Gasto'}\n`;
        csvContent += `Total de transacciones: ${transactions.length}\n`;
        csvContent += `Fecha de exportación: ${new Date().toLocaleDateString('es-AR')}\n\n`;

        csvContent += `Fecha,Descripción,Monto,Moneda\n`;
        transactions.forEach(t => {
            csvContent += `${t.date},${t.description.replace(/,/g, ';')},${t.amount},${t.currency}\n`;
        });

        // Descargar archivo
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', `categoria_${category.name}_${new Date().toISOString().split('T')[0]}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        this.showNotification(`Datos de ${category.name} exportados correctamente`, 'success');
    }

    /**
     * Muestra el modal para agregar categoría
     */
    showAddCategoryModal() {
        console.log('🔍 showAddCategoryModal called - Stack trace:', new Error().stack);

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
                            <div class="form-group">
                                <label for="categoryDescription">Descripción (opcional):</label>
                                <textarea id="categoryDescription" rows="2" placeholder="Descripción breve de la categoría..."></textarea>
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

        } catch (error) {
        }
    }

    /**
     * Agrega una nueva categoría
     * Ahora hace una llamada al backend API para guardar en la base de datos
     */
    async addNewCategory() {
        try {
            const name = document.getElementById('categoryName').value.trim();
            const type = document.getElementById('categoryType').value;
            const color = document.getElementById('categoryColor').value;
            const description = document.getElementById('categoryDescription')?.value?.trim() || '';

            if (!name) {
                this.showNotification('El nombre de la categoría es requerido', 'error');
                return;
            }

            // Preparar datos para enviar al backend
            const categoryData = {
                name: name,
                type: type,
                color: color,
                description: description
            };

            // Mostrar loading
            this.showNotification('Guardando categoría...', 'info');

            // Hacer llamada al backend API
            const response = await fetch('/api/categories', {
                method: 'POST',
                headers: this.getAuthHeaders(),
                body: JSON.stringify(categoryData)
            });

            const result = await response.json();

            if (!response.ok) {
                throw new Error(result.message || 'Error al crear la categoría');
            }

            if (result.success) {
                // Agregar la categoría guardada al array local
                const savedCategory = {
                    id: result.data.category.id,
                    name: result.data.category.name,
                    type: result.data.category.type,
                    color: result.data.category.color,
                    description: result.data.category.description,
                    isCustom: result.data.category.isCustom,
                    usageStats: result.data.category.usageStats,
                    createdAt: result.data.category.createdAt
                };

                // Agregar a la lista local
                this.categories.push(savedCategory);

                // Guardar en localStorage (para mantener sincronización)
                this.saveDataToStorage();

                // Re-renderizar categorías
                this.renderCategories();

                // Mostrar notificación de éxito
                this.showNotification(`Categoría "${name}" agregada correctamente`, 'success');

                console.log('✅ Categoría creada exitosamente:', savedCategory);
            } else {
                throw new Error(result.message || 'Error desconocido al crear la categoría');
            }

        } catch (error) {
            console.error('❌ Error al agregar la categoría:', error);
            this.showNotification(error.message || 'Error al agregar la categoría', 'error');
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

        } catch (error) {
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

            }
        } catch (error) {
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

        } catch (error) {
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

        } catch (error) {
        }
    }

    // ==================== MÉTODOS DE ALMACENAMIENTO ====================

    /**
     * Sincroniza todos los datos
     */
    async syncAll() {
        try {
            
            // Guardar en localStorage
            this.saveDataToStorage();
            
            // Aquí se podría agregar sincronización con backend
            // await this.syncWithBackend();
            
        } catch (error) {
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

    // ==================== FUNCIONALIDADES AVANZADAS (DE FINANZAS-SIMPLE) ====================

    /**
     * Maneja la selección de archivo PDF
     */
    handleCsvFileSelection(event) {
        const file = event.target.files[0];
        const processCsvBtn = document.getElementById('processCsvBtn');

        if (file && (file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf'))) {
            processCsvBtn.disabled = false;
            this.showNotification(`PDF seleccionado: ${file.name}`, 'info');
        } else {
            processCsvBtn.disabled = true;
            this.showNotification('Por favor selecciona un archivo PDF válido', 'error');
        }
    }

    /**
     * Procesa el archivo PDF usando pdfconverter.py y OpenAI
     */
    async processCsvFile() {
        const csvFile = document.getElementById('csvFile');
        const processCsvBtn = document.getElementById('processCsvBtn');
        const processingStatus = document.getElementById('csvProcessingStatus');
        const extractedExpenses = document.getElementById('extractedExpenses');

        if (!csvFile.files[0]) {
            this.showNotification('Por favor selecciona un archivo PDF', 'error');
            return;
        }

        try {
            // Mostrar estado de procesamiento
            processCsvBtn.disabled = true;
            processingStatus.style.display = 'block';
            extractedExpenses.style.display = 'none';


            // Verificar que el archivo PDF sea válido
            const file = csvFile.files[0];
            if (!file || (!file.type.includes('pdf') && !file.name.toLowerCase().endsWith('.pdf'))) {
                throw new Error('Por favor selecciona un archivo PDF válido');
            }

            if (file.size > 10 * 1024 * 1024) { // 10MB límite
                throw new Error('El archivo PDF es demasiado grande. Máximo 10MB permitido.');
            }

            // Analizar con pdfconverter.py enviando el archivo PDF completo al servidor

            // Crear FormData para enviar el archivo PDF
            const formData = new FormData();
            formData.append('pdf', file);

            const analysisResponse = await fetch(`${FINANCE_API_CONFIG.baseUrl}/public/ai/analyze-pdf`, {
                method: 'POST',
                headers: {
                    // No enviar Content-Type para que el navegador lo configure automáticamente para FormData
                    // No enviar Authorization ya que es endpoint público
                },
                body: formData
            });

            if (!analysisResponse.ok) {
                if (analysisResponse.status === 400) {
                    throw new Error('Archivo CSV no válido o corrupto. Verifica que el archivo sea un CSV legible.');
                } else if (analysisResponse.status === 413) {
                    throw new Error('El archivo CSV es demasiado grande. Intenta con un archivo más pequeño.');
                } else if (analysisResponse.status === 500) {
                    throw new Error('Error interno del servidor. Intenta nuevamente en unos minutos.');
                } else if (analysisResponse.status === 503) {
                    throw new Error('Servicio de IA temporalmente no disponible. Intenta nuevamente.');
                } else {
                    const errorText = await analysisResponse.text().catch(() => 'Error desconocido');
                    throw new Error(`Error del servidor (${analysisResponse.status}): ${errorText}`);
                }
            }

            const analysisResult = await analysisResponse.json();

            if (analysisResult.success && analysisResult.data) {

                // Procesar resultados del servidor
                // El servidor puede devolver diferentes estructuras
                let analysisData;

                if (analysisResult.data.extractedExpenses) {
                    // Usar extractedExpenses si está disponible (prioridad)
                    analysisData = { expenses: analysisResult.data.extractedExpenses };
                } else if (analysisResult.data.analysis && analysisResult.data.analysis.expenses) {
                    // Usar analysis.expenses
                    analysisData = analysisResult.data.analysis;
                } else {
                    // Fallback
                    analysisData = analysisResult.data;
                }

                const processedData = this.processOpenAIResults(analysisData);

            const processedExpensesCount = processedData.expenses ? processedData.expenses.length : 0;

                // Alertas y estadísticas del procesamiento
                if (processedExpensesCount === 0) {
                } else if (processedExpensesCount < 20) {
                } else if (processedExpensesCount >= 50) {
                }

                // Mostrar estadísticas detalladas del procesamiento
                if (processedData.expenses && processedData.expenses.length > 0) {
                    const expensesByCurrency = processedData.expenses.reduce((acc, expense) => {
                        acc[expense.currency] = (acc[expense.currency] || 0) + 1;
                        return acc;
                    }, {});


                    const expensesByCategory = processedData.expenses.reduce((acc, expense) => {
                        acc[expense.category] = (acc[expense.category] || 0) + 1;
                        return acc;
                    }, {});


                    // Calcular totales por moneda
                    const totalsByCurrency = processedData.expenses.reduce((acc, expense) => {
                        if (!acc[expense.currency]) acc[expense.currency] = 0;
                        acc[expense.currency] += expense.amount;
                        return acc;
                    }, {});

                }

                // Mostrar resultados
                this.displayCsvResults(processedData);
                extractedExpenses.style.display = 'block';

                const totalTransactions = (processedData.expenses ? processedData.expenses.length : 0) + (processedData.incomes ? processedData.incomes.length : 0);
                const incomesCount = processedData.incomes ? processedData.incomes.length : 0;

                this.showNotification(`PDF procesado exitosamente. ${totalTransactions} transacciones encontradas (${processedExpensesCount} gastos, ${incomesCount} ingresos).`, 'success');
            } else {
                throw new Error(analysisResult?.error || 'Error en el análisis con OpenAI');
            }

        } catch (error) {
            this.showNotification(`Error procesando PDF: ${error.message}`, 'error');
        } finally {
            // Ocultar estado de procesamiento
            processingStatus.style.display = 'none';
            processCsvBtn.disabled = false;
        }
    }

    /**
     * Extrae texto de un archivo PDF usando PDF.js
     */
    async extractTextFromPdf(pdfFile) {
        return new Promise((resolve, reject) => {
            const fileReader = new FileReader();

            fileReader.onload = async function() {
                try {
                    // Cargar PDF.js si no está cargado
                    if (typeof pdfjsLib === 'undefined') {
                        const script = document.createElement('script');
                        script.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js';
                        script.onload = () => {
                            pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
                            extractText();
                        };
                        document.head.appendChild(script);
                    } else {
                        extractText();
                    }

                    async function extractText() {
                        try {
                            const arrayBuffer = fileReader.result;
                            const pdf = await pdfjsLib.getDocument(arrayBuffer).promise;
                            let fullText = '';


                            for (let i = 1; i <= pdf.numPages; i++) {

                                const page = await pdf.getPage(i);
                                const textContent = await page.getTextContent();

                                // Extraer texto preservando mejor el formato
                                const pageText = textContent.items
                                    .map(item => item.str)
                                    .filter(str => str.trim().length > 0) // Filtrar strings vacíos
                                    .join(' ')
                                    .replace(/\s+/g, ' ') // Normalizar espacios
                                    .trim();

                                fullText += pageText + '\n\n';

                                // Log de preview para debug
                                const preview = pageText.substring(0, 200);
                            }


                            resolve(fullText);
                        } catch (error) {
                            reject(error);
                        }
                    }
                } catch (error) {
                    reject(error);
                }
            };

            fileReader.onerror = () => reject(new Error('Error leyendo el archivo PDF'));
            fileReader.readAsArrayBuffer(pdfFile);
        });
    }

    /**
     * Procesa los resultados de OpenAI
     */
    processOpenAIResults(data) {
        let expenses = [];
        let incomes = [];


        // Si la respuesta es un array directo
        if (Array.isArray(data)) {
            // Clasificar automáticamente como gastos o ingresos basados en el monto
            data.forEach(transaction => {
                if (transaction.amount && transaction.amount > 0) {
                    expenses.push(transaction);
                } else if (transaction.amount && transaction.amount < 0) {
                    // Convertir montos negativos a positivos para ingresos
                    incomes.push({
                        ...transaction,
                        amount: Math.abs(transaction.amount)
                    });
                } else {
                    // Si no hay monto claro, asumir gasto
                    expenses.push(transaction);
                }
            });
        }

        // Si la respuesta tiene estructura de análisis
        else if (data.expenses && Array.isArray(data.expenses)) {
            expenses = data.expenses;

            // Verificar si también hay ingresos
            if (data.incomes && Array.isArray(data.incomes)) {
                incomes = data.incomes;
            }
        }

        // Si la respuesta es texto, intentar extraer gastos
        else if (typeof data === 'string') {
            expenses = this.extractExpensesFromText(data);
        }

        // Si no se reconoce la estructura
        else {
        }

        // Siempre intentar extracción adicional, incluso si OpenAI encontró algunas transacciones

        if (this.lastExtractedPdfText) {
            const additionalExpenses = this.extractBankingExpenses(this.lastExtractedPdfText);

            if (additionalExpenses.length > 0) {

                // Combinar resultados, evitando duplicados
                const combinedExpenses = this.combineExpenseResults(expenses, additionalExpenses);

                expenses = combinedExpenses;
            } else {
            }
        }

        // Validaciones finales
        const totalTransactions = expenses.length + incomes.length;
        if (totalTransactions === 0) {
        } else if (totalTransactions < 20) {
        } else if (totalTransactions >= 50) {
        }


        // Procesar y mejorar los gastos e ingresos extraídos
        expenses = this.enhanceExtractedExpenses(expenses);
        incomes = this.enhanceExtractedIncomes(incomes);


        return { expenses, incomes };
    }

    /**
     * Mejora los ingresos extraídos con validaciones y mejoras
     */
    enhanceExtractedIncomes(incomes) {
        return incomes.map(income => {
            // Asegurar que la moneda esté en mayúsculas
            if (income.currency) {
                income.currency = income.currency.toUpperCase();
            }

            // Si no hay moneda definida, intentar determinarla por contexto
            if (!income.currency) {
                income.currency = this.detectCurrencyFromContext(income);
            }

            // Mejorar categoría si es necesario
            if (!income.category) {
                income.category = 'Otros Ingresos';
            }

            // Para categoría "Otros Ingresos", asegurarse de que la descripción sea detallada
            if (income.category === 'Otros Ingresos' && (!income.description || income.description.length < 10)) {
                income.description = `Ingreso: ${income.description || 'Sin descripción'}`;
            }

            // Asegurar que el tipo sea 'income'
            income.type = 'income';

            return income;
        });
    }

    /**
     * Mejora los gastos extraídos con validaciones y mejoras
     */
    enhanceExtractedExpenses(expenses) {
        return expenses.map(expense => {
            // Asegurar que la moneda esté en mayúsculas
            if (expense.currency) {
                expense.currency = expense.currency.toUpperCase();
            }

            // Si no hay moneda definida, intentar determinarla por contexto
            if (!expense.currency) {
                expense.currency = this.detectCurrencyFromContext(expense);
            }

            // Mejorar categoría si es necesario
            if (!expense.category) {
                expense.category = 'Otros';
            }

            // Para categoría "Otros", asegurarse de que la descripción sea detallada
            if (expense.category === 'Otros' && (!expense.description || expense.description.length < 10)) {
                expense.description = this.enhanceOtherCategoryDescription(expense);
            }

            // Validar y formatear fecha
            if (expense.date) {
                expense.date = this.formatExpenseDate(expense.date);
            }

            // Validar monto
            if (typeof expense.amount === 'string') {
                expense.amount = parseFloat(expense.amount.toString().replace(',', '.'));
            }

            return expense;
        });
    }

    /**
     * Detecta la moneda por contexto del gasto
     */
    detectCurrencyFromContext(expense) {
        const description = expense.description?.toLowerCase() || '';

        // Indicadores de USD
        if (description.includes('usd') || description.includes('dólar') ||
            description.includes('dolar') || description.includes('$') ||
            description.includes('americano')) {
            return 'USD';
        }

        // Indicadores de UYU
        if (description.includes('uyu') || description.includes('peso') ||
            description.includes('$u') || description.includes('uruguayo')) {
            return 'UYU';
        }

        // Por defecto UYU (contexto uruguayo)
        return 'UYU';
    }

    /**
     * Mejora la descripción para categoría "Otros"
     */
    enhanceOtherCategoryDescription(expense) {
        if (!expense.description) {
            return 'Gasto sin descripción específica';
        }

        const desc = expense.description.toLowerCase();

        // Si ya es descriptiva, devolverla
        if (desc.includes('compra') || desc.includes('pago') ||
            desc.includes('servicio') || desc.length > 15) {
            return expense.description;
        }

        // Agregar contexto basado en palabras clave (sin "Compra" al inicio)
        if (desc.includes('gasolina') || desc.includes('combustible')) {
            return `Combustible - ${expense.description}`;
        }

        if (desc.includes('café') || desc.includes('restaurante')) {
            return `Restaurante - ${expense.description}`;
        }

        // Descripción genérica mejorada (sin prefijos innecesarios)
        return expense.description;
    }

    /**
     * Formatea la fecha del gasto
     */
    formatExpenseDate(dateStr) {
        try {
            // Si ya está en formato DD/MM/YY, devolverla
            if (/^\d{1,2}\/\d{1,2}\/\d{2,4}$/.test(dateStr)) {
                return dateStr;
            }

            // Intentar parsear otros formatos
            const date = new Date(dateStr);
            if (!isNaN(date.getTime())) {
                const day = date.getDate().toString().padStart(2, '0');
                const month = (date.getMonth() + 1).toString().padStart(2, '0');
                const year = date.getFullYear().toString().slice(-2);
                return `${day}/${month}/${year}`;
            }

            return '';
        } catch (error) {
            return '';
        }
    }

    /**
     * Extrae gastos de texto usando el sistema de análisis
     */
    extractExpensesFromText(text) {
        const expenses = [];

        // Buscar patrones de gastos en el texto
        const expensePatterns = [
            /(\d+(?:[.,]\d+)?)\s*(USD|UYU|usd|uyu)/gi,
            /\$(\d+(?:[.,]\d+)?)\s*(USD|UYU|usd|uyu)?/gi,
            /(\d+(?:[.,]\d+)?)\s*pesos/gi
        ];

        expensePatterns.forEach(pattern => {
            let match;
            while ((match = pattern.exec(text)) !== null) {
                const amount = parseFloat(match[1].replace(',', '.'));
                const currency = match[2] ? match[2].toUpperCase() : 'UYU';

                if (amount > 0) {
                    expenses.push({
                        amount: amount,
                        description: 'Gasto extraído del PDF',
                        currency: currency,
                        category: 'Otros'
                    });
                }
            }
        });

        return expenses;
    }

    /**
     * Extrae gastos del texto completo del PDF como respaldo
     */
    extractExpensesFromFullText() {

        const expenses = [];

        try {
            // Usar el texto completo almacenado del PDF
            if (!this.lastExtractedPdfText) {
                return expenses;
            }


            // Usar la función especializada de extracción bancaria
            const bankingExpenses = this.extractBankingExpenses(this.lastExtractedPdfText);

            if (bankingExpenses.length > 0) {
                expenses.push(...bankingExpenses);
            } else {
            }

            return expenses;
        } catch (error) {
            return expenses;
        }
    }

    /**
     * Función mejorada para extraer gastos de texto bancario
     */
    extractBankingExpenses(text) {

        const expenses = [];
        const lines = text.split('\n');


        // Patrones exhaustivos para extractos bancarios uruguayos
        const bankingPatterns = [
            // === PATRONES ESPECÍFICOS DE BANCOS URUGUAYOS ===

            // Débitos y cargos
            /D[ée]bito\s+por\s+([\d,]+\.?\d*)/gi,
            /Cargo\s+por\s+([\d,]+\.?\d*)/gi,
            /Débito\s+automático\s+([\d,]+\.?\d*)/gi,
            /Cargo\s+automático\s+([\d,]+\.?\d*)/gi,

            // Extracciones y retiros
            /Extracci[oó]n\s+([\d,]+\.?\d*)/gi,
            /Retiro\s+([\d,]+\.?\d*)/gi,
            /Retiro\s+de\s+cajero\s+([\d,]+\.?\d*)/gi,
            /Cajero\s+automático\s+([\d,]+\.?\d*)/gi,

            // Compras y pagos
            /Compra\s+([\d,]+\.?\d*)/gi,
            /Pago\s+([\d,]+\.?\d*)/gi,
            /Pago\s+de\s+([\d,]+\.?\d*)/gi,
            /Abono\s+a\s+([\d,]+\.?\d*)/gi,

            // Transferencias
            /Transferencia\s+([\d,]+\.?\d*)/gi,
            /Transferencia\s+saliente\s+([\d,]+\.?\d*)/gi,
            /Envío\s+([\d,]+\.?\d*)/gi,

            // Servicios específicos uruguayos
            /UTE\s+([\d,]+\.?\d*)/gi,
            /OSE\s+([\d,]+\.?\d*)/gi,
            /Antel\s+([\d,]+\.?\d*)/gi,
            /Movistar\s+([\d,]+\.?\d*)/gi,
            /Claro\s+([\d,]+\.?\d*)/gi,

            // === PATRONES CON SÍMBOLOS DE MONEDA ===

            // Pesos uruguayos
            /\$U\s*([\d,]+\.?\d*)/gi,
            /UYU\s*([\d,]+\.?\d*)/gi,
            /\$UY\s*([\d,]+\.?\d*)/gi,

            // Dólares
            /USD\s*([\d,]+\.?\d*)/gi,
            /U\$S\s*([\d,]+\.?\d*)/gi,

            // Símbolos genéricos (contexto)
            /\$[\s]*([\d,]+\.?\d*)/g,

            // === FORMATOS NUMÉRICOS URUGUAYOS ===

            // Formato uruguayo: 1.234,56
            /(\d{1,3}(?:\.\d{3})*,\d{2})\s*(?:\$|USD|UYU)?/g,

            // Formato americano: 1,234.56
            /(\d{1,3}(?:,\d{3})*\.\d{2})\s*(?:\$|USD|UYU)?/g,

            // Números simples con contexto de gasto
            /\b(\d+\.\d{2})\b/g,

            // === PATRONES AVANZADOS ===

            // Líneas que contienen fechas + montos
            /(\d{1,2}\/\d{1,2}\/\d{2,4}).*?([\d,]+\.?\d*)/gi,

            // Descripciones + montos
            /([A-Za-z\s]{10,50})\s+([\d,]+\.?\d*)/gi,

            // Cualquier línea con monto al final
            /(.{10,80})\s+([\d,]+\.?\d*)\s*$/gm
        ];

        let processedLines = 0;
        let potentialAmounts = 0;

        // Conjunto para evitar duplicados
        const processedAmounts = new Set();

        lines.forEach((line, index) => {
            // Limpiar y normalizar la línea
            const cleanLine = line.trim();
            if (cleanLine.length < 5) return; // Ignorar líneas muy cortas

            // Ignorar líneas que parecen ser headers o información de cuenta
            if (this.isLineToIgnore(cleanLine)) return;

            processedLines++;

            bankingPatterns.forEach(pattern => {
                let match;
                while ((match = pattern.exec(cleanLine)) !== null) {
                    const amountStr = match[1];
                    if (amountStr) {
                        const amount = this.parseBankingAmount(amountStr);

                        // Filtros más estrictos
                        if (amount > 0.5 && amount < 50000 && !processedAmounts.has(amountStr)) {
                            // Verificar que la línea contenga palabras relacionadas con gastos
                            if (this.isLikelyExpense(cleanLine)) {
                                potentialAmounts++;
                                processedAmounts.add(amountStr);

                                // Extraer descripción del contexto
                                const description = this.extractExpenseDescription(cleanLine, amount);

                                expenses.push({
                                    amount: amount,
                                    description: description,
                                    currency: this.detectCurrencyFromLine(cleanLine),
                                    category: this.categorizeBankingExpense(cleanLine),
                                    date: this.extractDateFromLine(cleanLine, lines, index)
                                });

                            }
                        }
                    }
                }
            });
        });


        return expenses;
    }

    /**
     * Parsea montos en formato bancario uruguayo
     */
    parseBankingAmount(amountStr) {
        try {
            // Manejar formato uruguayo: 1.234,56
            if (amountStr.includes('.') && amountStr.includes(',')) {
                return parseFloat(amountStr.replace(/\./g, '').replace(',', '.'));
            }
            // Manejar formato americano: 1,234.56
            else if (amountStr.includes(',') && amountStr.includes('.')) {
                return parseFloat(amountStr.replace(/,/g, ''));
            }
            // Otros formatos
            else {
                return parseFloat(amountStr.replace(/[^\d.]/g, ''));
            }
        } catch (error) {
            return 0;
        }
    }

    /**
     * Extrae descripción del gasto desde el contexto de la línea
     */
    extractExpenseDescription(line, amount) {
        // Remover el monto y limpiar la línea
        const cleanLine = line
            .replace(new RegExp(amount.toString(), 'g'), '')
            .replace(/[^\w\sáéíóúñü]/gi, ' ')
            .replace(/\s+/g, ' ')
            .trim();

        // Si la línea es muy corta, crear descripción genérica
        if (cleanLine.length < 3) {
            return `Gasto por $${amount}`;
        }

        // Limitar longitud de descripción
        return cleanLine.length > 50 ? cleanLine.substring(0, 50) + '...' : cleanLine;
    }

    /**
     * Detecta moneda desde el contexto de la línea
     */
    detectCurrencyFromLine(line) {
        const lowerLine = line.toLowerCase();

        if (lowerLine.includes('$u') || lowerLine.includes('uyu') || lowerLine.includes('peso')) {
            return 'UYU';
        }

        if (lowerLine.includes('$') && !lowerLine.includes('$u')) {
            return 'USD';
        }

        // Por defecto UYU para contexto bancario uruguayo
        return 'UYU';
    }

    /**
     * Categoriza gasto bancario basado en palabras clave
     */
    categorizeBankingExpense(line) {
        const lowerLine = line.toLowerCase();

        if (lowerLine.includes('supermercado') || lowerLine.includes('mercado') || lowerLine.includes('compra')) {
            return 'Alimentación';
        }

        if (lowerLine.includes('combustible') || lowerLine.includes('ypf') || lowerLine.includes('shell') || lowerLine.includes('gasolina')) {
            return 'Transporte';
        }

        if (lowerLine.includes('cine') || lowerLine.includes('netflix') || lowerLine.includes('spotify')) {
            return 'Entretenimiento';
        }

        if (lowerLine.includes('farmacia') || lowerLine.includes('médico') || lowerLine.includes('hospital')) {
            return 'Salud';
        }

        if (lowerLine.includes('ute') || lowerLine.includes('ose') || lowerLine.includes('anten') || lowerLine.includes('internet')) {
            return 'Servicios';
        }

        // Por defecto
        return 'Otros';
    }

    /**
     * Verifica si una línea debe ser ignorada (headers, información de cuenta, etc.)
     */
    isLineToIgnore(line) {
        const lowerLine = line.toLowerCase();

        // Ignorar líneas que contienen estas palabras/patrones
        const ignorePatterns = [
            'saldo',
            'total',
            'cuenta',
            'número',
            'titular',
            'fecha',
            'período',
            'desde',
            'hasta',
            'página',
            'banco',
            'sucursal',
            'movimiento',
            'descripción',
            'importe',
            'débito',
            'crédito',
            'balance',
            'disponible',
            /^\d{4,}$/, // Números largos (posiblemente números de cuenta)
            /cta\.?\s*\d+/, // Números de cuenta
            /cbu/i, // Códigos bancarios
        ];

        return ignorePatterns.some(pattern => {
            if (typeof pattern === 'string') {
                return lowerLine.includes(pattern);
            } else {
                return pattern.test(lowerLine);
            }
        });
    }

    /**
     * Verifica si una línea parece contener un gasto real
     */
    isLikelyExpense(line) {
        const lowerLine = line.toLowerCase();

        // Palabras que indican gastos reales
        const expenseIndicators = [
            'compra',
            'pago',
            'extracción',
            'retiro',
            'débito',
            'cargo',
            'abono',
            'transferencia',
            'envío',
            'depósito', // Solo si no es ingreso
            'ute',
            'ose',
            'antel',
            'movistar',
            'claro',
            'supermercado',
            'restaurante',
            'farmacia',
            'estacionamiento',
            'peaje',
            'taxi',
            'ómnibus',
            'combustible',
            'gasolina'
        ];

        // Verificar si contiene indicadores de gasto
        const hasExpenseIndicator = expenseIndicators.some(indicator =>
            lowerLine.includes(indicator)
        );

        // Verificar que no contenga indicadores de ingreso
        const incomeIndicators = [
            'ingreso',
            'depósito',
            'crédito',
            'acreditación',
            'transferencia entrante',
            'recepción'
        ];

        const hasIncomeIndicator = incomeIndicators.some(indicator =>
            lowerLine.includes(indicator)
        );

        return hasExpenseIndicator && !hasIncomeIndicator;
    }

    /**
     * Intenta extraer fecha desde el contexto
     */
    extractDateFromLine(line, allLines, currentIndex) {
        // Buscar fechas en la línea actual y líneas cercanas
        const datePattern = /(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})/g;
        const match = datePattern.exec(line);

        if (match) {
            const day = match[1].padStart(2, '0');
            const month = match[2].padStart(2, '0');
            let year = match[3];

            // Si el año tiene 2 dígitos, asumir 20xx
            if (year.length === 2) {
                year = '20' + year;
            }

            return `${day}/${month}/${year}`;
        }

        // Buscar en líneas adyacentes (hasta 3 líneas arriba/abajo)
        for (let offset = -3; offset <= 3; offset++) {
            if (offset === 0) continue;

            const adjacentIndex = currentIndex + offset;
            if (adjacentIndex >= 0 && adjacentIndex < allLines.length) {
                const adjacentMatch = datePattern.exec(allLines[adjacentIndex]);
                if (adjacentMatch) {
                    const day = adjacentMatch[1].padStart(2, '0');
                    const month = adjacentMatch[2].padStart(2, '0');
                    let year = adjacentMatch[3];

                    if (year.length === 2) {
                        year = '20' + year;
                    }

                    return `${day}/${month}/${year}`;
                }
            }
        }

        // Si no hay fecha en la línea, devolver fecha actual
        return '';
    }

    /**
     * Combina resultados de gastos evitando duplicados
     */
    combineExpenseResults(openAIExpenses, manualExpenses) {
        const combined = [...openAIExpenses];
        const existingAmounts = new Set(openAIExpenses.map(e => `${e.amount}-${e.currency}`));

        manualExpenses.forEach(manualExpense => {
            const amountKey = `${manualExpense.amount}-${manualExpense.currency}`;

            // Solo agregar si no existe ya un gasto con el mismo monto y moneda
            if (!existingAmounts.has(amountKey)) {
                // Verificar también por descripción similar (para evitar duplicados por diferentes métodos)
                const similarDescription = combined.some(existing =>
                    this.areDescriptionsSimilar(existing.description, manualExpense.description) &&
                    Math.abs(existing.amount - manualExpense.amount) < 0.01
                );

                if (!similarDescription) {
                    combined.push(manualExpense);
                    existingAmounts.add(amountKey);
                } else {
                }
            }
        });

        return combined;
    }

    /**
     * Verifica si dos descripciones son similares
     */
    areDescriptionsSimilar(desc1, desc2) {
        if (!desc1 || !desc2) return false;

        const clean1 = desc1.toLowerCase().replace(/[^\w\s]/g, '').trim();
        const clean2 = desc2.toLowerCase().replace(/[^\w\s]/g, '').trim();

        // Si son idénticas
        if (clean1 === clean2) return true;

        // Si una contiene a la otra
        if (clean1.includes(clean2) || clean2.includes(clean1)) return true;

        // Si tienen más del 80% de palabras en común
        const words1 = clean1.split(/\s+/);
        const words2 = clean2.split(/\s+/);

        const commonWords = words1.filter(word => words2.includes(word));
        const similarity = commonWords.length / Math.max(words1.length, words2.length);

        return similarity > 0.8;
    }

    /**
     * Muestra los resultados del análisis de CSV
     */
    displayCsvResults(data) {

        const expensesList = document.getElementById('expensesList');

        // Mostrar gastos e ingresos
        let html = '';
        let totalExpenses = data.expenses ? data.expenses.length : 0;
        let totalIncomes = data.incomes ? data.incomes.length : 0;

        // Mostrar gastos
        if (data.expenses && data.expenses.length > 0) {
            html += '<h3>💸 Gastos Encontrados</h3>';
            // Generar opciones de categorías de gastos
            const expenseCategoryOptions = this.generateCategoryOptions();

            const expensesHTML = data.expenses.map((expense, index) => {
                const symbol = expense.currency === 'UYU' ? '$U' : '$';
                const defaultCategory = expense.category || 'Otros';
                return `
                    <div class="expense-item">
                        <input type="checkbox" class="expense-checkbox"
                               data-index="${index}"
                               data-amount="${expense.amount}"
                               data-description="${expense.description}"
                               data-currency="${expense.currency}"
                               data-category="${defaultCategory}"
                               data-date="${expense.date || ''}"
                               data-type="expense">
                        <div class="expense-info">
                            <div class="expense-header">
                                <span class="expense-description">${expense.description}</span>
                                <span class="expense-amount">${symbol}${expense.amount.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                            </div>
                            <div class="expense-category-selector">
                                <label>Categoría:</label>
                                <select class="expense-category-dropdown" data-index="${index}" onchange="window.financeApp.updateExpenseCategory(${index}, this.value)">
                                    ${expenseCategoryOptions}
                                </select>
                                <div class="expense-currency-selector">
                                    <label>Moneda:</label>
                                    <select class="expense-currency-dropdown" data-index="${index}" onchange="window.financeApp.updateExpenseCurrency(${index}, this.value)">
                                        <option value="UYU" ${expense.currency === 'UYU' ? 'selected' : ''}>UYU (Pesos)</option>
                                        <option value="USD" ${expense.currency === 'USD' ? 'selected' : ''}>USD (Dólares)</option>
                                    </select>
                                </div>
                                <div class="expense-comments" id="comments-${index}" style="display: ${defaultCategory === 'Otros' ? 'block' : 'none'};">
                                    <label>Comentarios:</label>
                                    <textarea class="expense-comment-textarea" data-index="${index}" placeholder="Agrega comentarios sobre este gasto..." rows="2">${defaultCategory === 'Otros' ? expense.description : ''}</textarea>
                                </div>
                            </div>
                        </div>
                    </div>
                `;
            }).join('');

            html += expensesHTML;
        }

        // Mostrar ingresos
        if (data.incomes && data.incomes.length > 0) {
            html += '<h3>💰 Ingresos Encontrados</h3>';
            // Generar opciones de categorías de ingresos
            const incomeCategoryOptions = this.generateIncomeCategoryOptions();

            const incomesHTML = data.incomes.map((income, index) => {
                const symbol = income.currency === 'UYU' ? '$U' : '$';
                const defaultCategory = income.category || 'Otros Ingresos';
                const expenseIndex = totalExpenses + index; // Offset para ingresos
                return `
                    <div class="expense-item income-item">
                        <input type="checkbox" class="expense-checkbox income-checkbox"
                               data-index="${expenseIndex}"
                               data-amount="${income.amount}"
                               data-description="${income.description}"
                               data-currency="${income.currency}"
                               data-category="${defaultCategory}"
                               data-date="${income.date || ''}"
                               data-type="income">
                        <div class="expense-info">
                            <div class="expense-header">
                                <span class="expense-description">${income.description}</span>
                                <span class="expense-amount income-amount">+${symbol}${income.amount.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                            </div>
                            <div class="expense-category-selector">
                                <label>Categoría:</label>
                                <select class="expense-category-dropdown income-category-dropdown" data-index="${expenseIndex}" onchange="window.financeApp.updateExpenseCategory(${expenseIndex}, this.value)">
                                    ${incomeCategoryOptions}
                                </select>
                                <div class="expense-currency-selector">
                                    <label>Moneda:</label>
                                    <select class="expense-currency-dropdown" data-index="${expenseIndex}" onchange="window.financeApp.updateExpenseCurrency(${expenseIndex}, this.value)">
                                        <option value="UYU" ${income.currency === 'UYU' ? 'selected' : ''}>UYU (Pesos)</option>
                                        <option value="USD" ${income.currency === 'USD' ? 'selected' : ''}>USD (Dólares)</option>
                                    </select>
                                </div>
                                <div class="expense-comments" id="comments-${expenseIndex}" style="display: ${defaultCategory === 'Otros Ingresos' ? 'block' : 'none'};">
                                    <label>Comentarios:</label>
                                    <textarea class="expense-comment-textarea" data-index="${expenseIndex}" placeholder="Agrega comentarios sobre este ingreso..." rows="2">${defaultCategory === 'Otros Ingresos' ? income.description : ''}</textarea>
                                </div>
                            </div>
                        </div>
                    </div>
                `;
            }).join('');

            html += incomesHTML;
        }

        // Mostrar mensaje si no hay transacciones
        if (totalExpenses === 0 && totalIncomes === 0) {
            html = '<p>No se encontraron transacciones en el PDF</p>';
        }

        expensesList.innerHTML = html;

        // Establecer valores por defecto en los dropdowns de gastos
        if (data.expenses) {
            data.expenses.forEach((expense, index) => {
                const dropdown = expensesList.querySelector(`select[data-index="${index}"]`);
                if (dropdown) {
                    dropdown.value = expense.category || 'Otros';
                }
            });
        }

        // Establecer valores por defecto en los dropdowns de ingresos
        if (data.incomes) {
            data.incomes.forEach((income, index) => {
                const expenseIndex = totalExpenses + index;
                const dropdown = expensesList.querySelector(`select[data-index="${expenseIndex}"]`);
                if (dropdown) {
                    dropdown.value = income.category || 'Otros Ingresos';
                }
            });
        }

        // Inicializar fecha por defecto para transacciones del PDF
        this.initializePdfDateSelector();

        // Agregar funcionalidad para agregar transacciones seleccionadas
        this.setupExpenseSelection();
    }

    /**
     * Genera las opciones de categorías de ingresos para el dropdown
     */
    generateIncomeCategoryOptions() {
        const categories = [
            'Salario',
            'Freelance',
            'Inversiones',
            'Transferencias',
            'Otros Ingresos'
        ];

        return categories.map(category => `<option value="${category}">${category}</option>`).join('');
    }

    /**
     * Genera las opciones de categorías para el dropdown (usado en procesamiento de PDFs)
     * Ahora usa las categorías dinámicas disponibles
     */
    generateCategoryOptions() {
        // Usar todas las categorías disponibles en lugar de lista hardcodeada
        return this.categories.map(category =>
            `<option value="${category.name}">${category.name}</option>`
        ).join('');
    }

    /**
     * Inicializa el selector de fecha para transacciones del PDF
     */
    initializePdfDateSelector() {
        // Crear selector de fecha si no existe
        let dateSelector = document.getElementById('pdfDateSelector');
        if (!dateSelector) {
            dateSelector = document.createElement('div');
            dateSelector.id = 'pdfDateSelector';
            dateSelector.className = 'date-selector';
            dateSelector.innerHTML = `
                <label for="pdfTransactionDate">Fecha para las transacciones del PDF:</label>
                <input type="date" id="pdfTransactionDate" value="${new Date().toISOString().split('T')[0]}">
                <button id="addPdfTransactionsBtn" class="btn btn-success">Agregar Transacciones Seleccionadas</button>
            `;

            const expensesList = document.getElementById('expensesList');
            if (expensesList) {
                expensesList.parentNode.insertBefore(dateSelector, expensesList.nextSibling);
            }
        }

        // Configurar cambio de fecha
        const dateInput = document.getElementById('pdfTransactionDate');
        if (dateInput) {
            dateInput.addEventListener('change', () => {
            });
        }

        // Configurar botón de agregar
        const addBtn = document.getElementById('addPdfTransactionsBtn');
        if (addBtn) {
            addBtn.addEventListener('click', () => this.addSelectedPdfTransactions());
        }
    }

    /**
     * Agrega las transacciones seleccionadas del PDF usando POST para ingresos y PUT para gastos
     */
    async addSelectedPdfTransactions() {

        const checkboxes = document.querySelectorAll('.expense-checkbox:checked');
        if (checkboxes.length === 0) {
            this.showNotification('Por favor selecciona al menos una transacción', 'warning');
            return;
        }

        const selectedExpenses = [];
        const selectedIncomes = [];

        // Procesar transacciones seleccionadas
        checkboxes.forEach(cb => {
            // Intentar usar la fecha del PDF si existe, sino usar fecha seleccionada o actual
            let transactionDate = new Date();
            if (cb.dataset.date && cb.dataset.date !== 'undefined' && cb.dataset.date !== '') {
                try {
                    transactionDate = new Date(cb.dataset.date);
                    // Verificar que la fecha sea válida
                    if (isNaN(transactionDate.getTime())) {
                        transactionDate = this.getPdfSelectedDate();
                    }
                } catch (error) {
                    transactionDate = this.getPdfSelectedDate();
                }
            } else {
                // No hay fecha en el PDF, usar fecha seleccionada por el usuario
                transactionDate = this.getPdfSelectedDate();
            }

            const transactionType = cb.dataset.type || 'expense';
            const category = cb.dataset.category || (transactionType === 'income' ? 'Otros Ingresos' : 'Otros');
            const currency = cb.dataset.currency || 'UYU';
            const amount = parseFloat(cb.dataset.amount);
            const description = cb.dataset.description || `Transacción ${transactionType}`;

            const transaction = {
                type: transactionType,
                amount: amount,
                description: description,
                category: category,
                currency: currency,
                date: transactionDate
            };

            if (transactionType === 'income') {
                selectedIncomes.push(transaction);
            } else {
                selectedExpenses.push(transaction);
            }
        });


        try {
            let expensesAdded = 0;
            let incomesAdded = 0;

            // Agregar gastos usando PUT (como antes)
            if (selectedExpenses.length > 0) {
                const expenseResponse = await fetch(`${FINANCE_API_CONFIG.baseUrl}${FINANCE_API_CONFIG.endpoints.transactions}`, {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(selectedExpenses)
                });

                if (!expenseResponse.ok) {
                    const errorData = await expenseResponse.json().catch(() => ({}));
                    this.showNotification('Error: No se pudieron agregar los gastos', 'error');
                } else {
                    const result = await expenseResponse.json();
                    if (result.success) {
                        expensesAdded = selectedExpenses.length;
                    }
                }
            }

            // Agregar ingresos usando POST
            if (selectedIncomes.length > 0) {
                const incomeResponse = await fetch(`${FINANCE_API_CONFIG.baseUrl}${FINANCE_API_CONFIG.endpoints.transactions}`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ transactions: selectedIncomes })
                });

                if (!incomeResponse.ok) {
                    const errorData = await incomeResponse.json().catch(() => ({}));
                    this.showNotification('Error: No se pudieron agregar los ingresos', 'error');
                } else {
                    const result = await incomeResponse.json();
                    if (result.success) {
                        incomesAdded = selectedIncomes.length;
                    }
                }
            }

            // Actualizar estado local si se agregaron transacciones
            if (expensesAdded > 0 || incomesAdded > 0) {
                // Agregar a transacciones locales con IDs generados
                [...selectedExpenses, ...selectedIncomes].forEach(transaction => {
                    transaction.id = this.generateId();
                    transaction.createdAt = new Date();
                    this.transactions.push(transaction);
                });

                // Guardar en localStorage
                this.saveDataToStorage();

                // Actualizar interfaz
                this.renderDashboard();
                this.renderTransactions();
                this.updateCharts();

                // Notificación de éxito
                const totalAdded = expensesAdded + incomesAdded;
                this.showNotification(`${totalAdded} transacciones agregadas exitosamente (${expensesAdded} gastos, ${incomesAdded} ingresos)`, 'success');

                // Ocultar/ocultar resultados del PDF
                const expensesList = document.getElementById('expensesList');
                if (expensesList) {
                    expensesList.style.display = 'none';
                }

            }

        } catch (error) {
            this.showNotification('Error interno al agregar las transacciones', 'error');
        }
    }

    /**
     * Inicializa el selector de fecha para transacciones del CSV
     */
    initializeCsvDateSelector() {
        const dateInput = document.getElementById('csvTransactionDate');
        if (dateInput) {
            // Establecer fecha por defecto (hoy)
            const today = new Date().toISOString().split('T')[0];
            dateInput.value = today;

            // Agregar listener para cambios en la fecha
            dateInput.addEventListener('change', () => {
            });
        }
    }

    /**
     * Obtiene la fecha seleccionada para transacciones del CSV
     */
    getCsvSelectedDate() {
        const dateInput = document.getElementById('csvTransactionDate');
        if (dateInput && dateInput.value) {
            try {
                const selectedDate = new Date(dateInput.value);
                if (!isNaN(selectedDate.getTime())) {
                    return selectedDate;
                }
            } catch (error) {
            }
        }
        return new Date();
    }

    /**
     * Obtiene la fecha seleccionada para transacciones del PDF
     */
    getPdfSelectedDate() {
        const dateInput = document.getElementById('pdfTransactionDate');
        if (dateInput && dateInput.value) {
            try {
                const selectedDate = new Date(dateInput.value);
                if (!isNaN(selectedDate.getTime())) {
                    // CORRECCIÓN: Si es el 1ro del mes, no lo convierta al último día del mes anterior
                    // El problema era que new Date() interpretaba "2024-01-01" como "2023-12-31" en algunas zonas horarias
                    // Usamos una fecha específica para evitar problemas de zona horaria
                    const year = selectedDate.getFullYear();
                    const month = selectedDate.getMonth();
                    const day = selectedDate.getDate();

                    // Crear fecha con hora 12:00:00 para evitar problemas de zona horaria
                    const correctedDate = new Date(year, month, day, 12, 0, 0, 0);

                    return correctedDate;
                }
            } catch (error) {
            }
        }
        return new Date();
    }

    /**
     * Diagnostica el estado de la conexión con OpenAI
     */
    /**
     * Diagnóstico financiero con IA - Analiza la situación económica del usuario y da consejos
     */
    async diagnoseGoalsWithAI() {
        try {

            // Obtener contexto financiero completo del usuario
            const financialData = this.getFinancialContextForDiagnosis();

            if (!financialData || Object.keys(financialData).length === 0) {
                throw new Error('No hay datos financieros suficientes para realizar el diagnóstico');
            }

            // Mostrar indicador de procesamiento
            const diagnoseBtn = document.getElementById('diagnoseBtn');
            const originalText = diagnoseBtn.innerHTML;
            diagnoseBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Diagnosticando...';
            diagnoseBtn.disabled = true;

            // Preparar datos para enviar a la API
            const diagnosisData = {
                financialData: financialData,
                diagnosisType: 'goals_financial_advisor'
            };


            // Usar el nuevo sistema de diagnóstico avanzado

            // Verificar autenticación para diagnóstico avanzado
            const authData = localStorage.getItem('auth_data');
            let authToken = null;

            if (authData) {
                try {
                    const parsed = JSON.parse(authData);
                    authToken = parsed.token;
                } catch (error) {
                }
            }

            if (authToken && window.financialChat && window.financialChat.performCompleteDiagnosis) {
                // Usar diagnóstico avanzado con acceso completo a datos
                const diagnosisResult = await window.financialChat.performCompleteDiagnosis(
                    authToken,
                    {
                        currentView: this.getCurrentView(),
                        selectedPeriod: this.currentPeriod,
                        additionalContext: financialData
                    }
                );

                if (diagnosisResult.success) {
                    // Crear respuesta en formato esperado
                    const mockDiagnosisResult = {
                        data: {
                            analysis: diagnosisResult.diagnosis,
                            diagnosisType: 'complete_financial_advisor',
                            timestamp: diagnosisResult.timestamp
                        }
                    };

                    // Mostrar resultados
                    this.displayDiagnosisResults(mockDiagnosisResult.data);
                    this.showNotification('✅ Diagnóstico financiero avanzado completado', 'success');
                    return;
                }
            }

            // Fallback al endpoint original si el sistema avanzado no está disponible
            const diagnosisResponse = await fetch(`${FINANCE_API_CONFIG.baseUrl}/public/ai/diagnose-goals`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    ...(authToken && { 'Authorization': `Bearer ${authToken}` })
                },
                body: JSON.stringify(diagnosisData)
            });

            if (!diagnosisResponse.ok) {
                if (diagnosisResponse.status === 400) {
                    throw new Error('Datos insuficientes para el diagnóstico');
                } else if (diagnosisResponse.status === 503) {
                    throw new Error('Servicio de IA temporalmente no disponible');
                } else {
                    throw new Error(`Error del servidor: ${diagnosisResponse.status}`);
                }
            }

            const diagnosisResult = await diagnosisResponse.json();

            if (diagnosisResult.success && diagnosisResult.data) {

                // Mostrar resultados en el chat
                this.displayDiagnosisResults(diagnosisResult.data);

                this.showNotification('✅ Diagnóstico financiero completado', 'success');
            } else {
                throw new Error(diagnosisResult.message || 'Error en el diagnóstico');
            }

        } catch (error) {
            this.showNotification(`❌ Error en diagnóstico: ${error.message}`, 'error');
        } finally {
            // Restaurar botón
            const diagnoseBtn = document.getElementById('diagnoseBtn');
            if (diagnoseBtn) {
                diagnoseBtn.innerHTML = '<i class="fas fa-stethoscope"></i> Diagnosticar con IA';
                diagnoseBtn.disabled = false;
            }
        }
    }

    /**
     * Obtiene el contexto financiero completo para diagnóstico
     */
    getFinancialContextForDiagnosis() {
        const context = {
            transactions: [],
            goals: [],
            categories: [],
            summary: {
                totalIncomeUYU: 0,
                totalExpensesUYU: 0,
                totalIncomeUSD: 0,
                totalExpensesUSD: 0,
                balanceUYU: 0,
                balanceUSD: 0,
                currentPeriod: this.currentPeriod || 'Diciembre 2024'
            },
            userInfo: {
                timestamp: new Date().toISOString()
            }
        };

        // Obtener transacciones del localStorage
        try {
            const transactionsData = localStorage.getItem('transactions');
            if (transactionsData) {
                context.transactions = JSON.parse(transactionsData);
            }
        } catch (error) {
        }

        // Obtener metas del localStorage
        try {
            const goalsData = localStorage.getItem('goals');
            if (goalsData) {
                context.goals = JSON.parse(goalsData);
            }
        } catch (error) {
        }

        // Obtener categorías del localStorage
        try {
            const categoriesData = localStorage.getItem('categories');
            if (categoriesData) {
                context.categories = JSON.parse(categoriesData);
            }
        } catch (error) {
        }

        // Calcular resumen financiero
        if (context.transactions && context.transactions.length > 0) {
            context.transactions.forEach(transaction => {
                if (transaction.currency === 'UYU') {
                    if (transaction.type === 'income') {
                        context.summary.totalIncomeUYU += transaction.amount;
                    } else {
                        context.summary.totalExpensesUYU += transaction.amount;
                    }
                } else if (transaction.currency === 'USD') {
                    if (transaction.type === 'income') {
                        context.summary.totalIncomeUSD += transaction.amount;
                    } else {
                        context.summary.totalExpensesUSD += transaction.amount;
                    }
                }
            });

            context.summary.balanceUYU = context.summary.totalIncomeUYU - context.summary.totalExpensesUYU;
            context.summary.balanceUSD = context.summary.totalIncomeUSD - context.summary.totalExpensesUSD;
        }

        return context;
    }

    /**
     * Formatea el texto del diagnóstico financiero para mejor legibilidad
     */
    formatDiagnosisText(text) {
        if (!text) return 'Análisis completado';

        // Reemplazar markdown básico con HTML
        let formattedText = text
            // Headers principales
            .replace(/^### (.+)$/gm, '<h3 class="diagnosis-section-title">$1</h3>')
            .replace(/^## (.+)$/gm, '<h2 class="diagnosis-section-title">$1</h2>')
            .replace(/^# (.+)$/gm, '<h1 class="diagnosis-title">$1</h1>')

            // Negritas y cursivas
            .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
            .replace(/\*(.+?)\*/g, '<em>$1</em>')

            // Listas numeradas
            .replace(/^\d+\.\s+(.+)$/gm, '<li class="diagnosis-list-item numbered">$1</li>')

            // Listas con viñetas
            .replace(/^- (.+)$/gm, '<li class="diagnosis-list-item">$1</li>')
            .replace(/^\* (.+)$/gm, '<li class="diagnosis-list-item">$1</li>')

            // Convertir párrafos
            .replace(/\n\n/g, '</p><p>')
            .replace(/\n/g, '<br>')

            // Manejar listas consecutivas
            .replace(/(<li class="diagnosis-list-item[^>]*">.+?<\/li>)\s*(<li class="diagnosis-list-item[^>]*">.+?<\/li>)+/gs, '<ul class="diagnosis-list">$&</ul>')

            // Manejar listas numeradas consecutivas
            .replace(/(<li class="diagnosis-list-item numbered">.+?<\/li>)\s*(<li class="diagnosis-list-item numbered">.+?<\/li>)+/gs, '<ol class="diagnosis-list numbered">$&</ol>');

        // Asegurar que el texto esté envuelto en párrafos si no hay otras etiquetas
        if (!formattedText.includes('<p>') && !formattedText.includes('<h') && !formattedText.includes('<ul') && !formattedText.includes('<ol')) {
            formattedText = `<p>${formattedText.replace(/\n/g, '</p><p>')}</p>`;
        }

        // Limpiar párrafos vacíos
        formattedText = formattedText.replace(/<p><\/p>/g, '');

        return formattedText;
    }

    /**
     * Muestra los resultados del diagnóstico en el chat
     */
    displayDiagnosisResults(diagnosisData) {
        const chatMessages = document.getElementById('chatMessages');

        if (!chatMessages) return;

        // Formatear el texto del diagnóstico
        const formattedAnalysis = this.formatDiagnosisText(diagnosisData.analysis || diagnosisData.response || 'Análisis completado');

        // Crear mensaje de diagnóstico
        const diagnosisMessageDiv = document.createElement('div');
        diagnosisMessageDiv.className = 'chat-message ai-message diagnosis-message';
        diagnosisMessageDiv.innerHTML = `
            <div class="message-avatar">
                <i class="fas fa-user-tie"></i>
            </div>
            <div class="message-content">
                <div class="diagnosis-header">
                    <h4><i class="fas fa-chart-line"></i> Diagnóstico Financiero Profesional</h4>
                    <small class="diagnosis-timestamp">${new Date().toLocaleString('es-UY')}</small>
                </div>
                <div class="diagnosis-content">
                    ${formattedAnalysis}
                </div>
                <div class="diagnosis-footer">
                    <small><i class="fas fa-robot"></i> Análisis generado por IA especializada en finanzas personales</small>
                </div>
            </div>
        `;

        chatMessages.appendChild(diagnosisMessageDiv);
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }

    async diagnoseOpenAIConnection() {
        try {

            // Verificar API Key local
            let apiKey = null;
            let apiKeySource = '';

            try {
                if (window.LOCAL_CONFIG && window.LOCAL_CONFIG.OPENAI_API_KEY) {
                    apiKey = window.LOCAL_CONFIG.OPENAI_API_KEY;
                    apiKeySource = 'config-local.js';
                } else if (window.getLocalApiKey) {
                    apiKey = window.getLocalApiKey();
                    apiKeySource = 'config-local.js';
                } else {
                    throw new Error('Configuración local no disponible');
                }
            } catch (error) {
                apiKey = localStorage.getItem('openai_api_key');
                if (apiKey && apiKey !== 'sk-proj-your-openai-api-key-here') {
                    apiKeySource = 'localStorage';
                }
            }


            if (!apiKey) {
                throw new Error('No se encontró una API Key de OpenAI configurada');
            }

            // Verificar formato de API Key
            if (!apiKey.startsWith('sk-proj-') && !apiKey.startsWith('sk-')) {
                throw new Error('La API Key no tiene el formato correcto. Debe comenzar con "sk-proj-" o "sk-"');
            }

            // Hacer health check al servidor
            const healthResponse = await fetch(`${FINANCE_API_CONFIG.baseUrl}/public/ai/health`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json'
                }
            });

            if (!healthResponse.ok) {
                throw new Error(`Error del servidor: ${healthResponse.status}`);
            }

            const healthData = await healthResponse.json();

            if (healthData.success && healthData.data.status === 'success') {
                this.showNotification('✅ OpenAI funcionando correctamente', 'success');
                return true;
            } else {
                this.showNotification(`❌ Error en OpenAI: ${healthData.data.message}`, 'error');
                return false;
            }

        } catch (error) {
            this.showNotification(`❌ Error de diagnóstico: ${error.message}`, 'error');
            return false;
        }
    }

    /**
     * Envía un mensaje al chat de IA
     */
    async sendChatMessage() {
        const chatInput = document.getElementById('chatInput');
        const chatMessages = document.getElementById('chatMessages');

        if (!chatInput || !chatInput.value.trim()) return;

        const message = chatInput.value.trim();

        // Agregar mensaje del usuario
        const userMessageDiv = document.createElement('div');
        userMessageDiv.className = 'chat-message user-message';
        userMessageDiv.innerHTML = `
            <div class="message-content">
                <p>${message}</p>
            </div>
        `;
        chatMessages.appendChild(userMessageDiv);

        // Mostrar indicador de escritura
        const typingIndicator = document.createElement('div');
        typingIndicator.className = 'chat-message ai-message typing-indicator';
        typingIndicator.innerHTML = `
            <div class="message-avatar">
                <i class="fas fa-chart-line"></i>
            </div>
            <div class="message-content">
                <p><i>El Economista está analizando tu consulta...</i></p>
            </div>
        `;
        chatMessages.appendChild(typingIndicator);
        chatMessages.scrollTop = chatMessages.scrollHeight;

        try {
            // Verificar autenticación
            const authData = localStorage.getItem('auth_data');
            if (!authData) {
                throw new Error('Debes iniciar sesión para usar el chat de IA');
            }

            let authToken;
            try {
                const parsed = JSON.parse(authData);
                authToken = parsed.token;
            } catch (error) {
                throw new Error('Datos de autenticación inválidos. Por favor, inicia sesión nuevamente.');
            }

            if (!authToken) {
                throw new Error('Token de autenticación no encontrado. Por favor, inicia sesión nuevamente.');
            }

            // Usar el nuevo sistema de IA con acceso completo a datos

            // Obtener datos financieros actuales del frontend
            const financialData = this.getCurrentFinancialData();

            // Usar el sistema de chat mejorado con acceso completo
            if (window.financialChat && window.financialChat.processQuery) {
                const result = await window.financialChat.processQuery(
                    message,
                    financialData,
                    {
                        authToken: authToken,
                        useAdvanced: true,
                        additionalData: {
                            currentView: this.getCurrentView(),
                            selectedPeriod: this.currentPeriod,
                            userPreferences: this.getUserPreferences()
                        }
                    }
                );

                if (result.success) {
                    aiResponse = result.message;
                } else {
                    throw new Error(result.error || 'Error en la consulta avanzada');
                }
            } else {
                // Fallback al endpoint original si el sistema avanzado no está disponible
                const chatResponse = await fetch(`${FINANCE_API_CONFIG.baseUrl}/public/ai/chat`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${authToken}`
                    },
                    body: JSON.stringify({
                        message: message
                    })
                });

                if (!chatResponse.ok) {
                    throw new Error(`Error del servidor: ${chatResponse.status}`);
                }

                const chatData = await chatResponse.json();
                aiResponse = chatData.data?.response || chatData.message || 'Respuesta no disponible';
            }

            if (!chatResponse.ok) {
                if (chatResponse.status === 401) {
                    throw new Error('Sesión expirada. Por favor, inicia sesión nuevamente.');
                }
                throw new Error(`Error del servidor: ${chatResponse.status}`);
            }

            const chatData = await chatResponse.json();
            let aiResponse;

            if (chatData.success && chatData.data) {
                aiResponse = chatData.data.response;
            } else {
                throw new Error(chatData.message || 'Error procesando la respuesta');
            }

            // Remover indicador de escritura
            chatMessages.removeChild(typingIndicator);

            // Agregar respuesta de IA
            const aiMessageDiv = document.createElement('div');
            aiMessageDiv.className = 'chat-message ai-message';
            aiMessageDiv.innerHTML = `
                <div class="message-avatar">
                    <i class="fas fa-chart-line"></i>
                </div>
                <div class="message-content">
                    <div class="ai-response">${aiResponse}</div>
                </div>
            `;
            chatMessages.appendChild(aiMessageDiv);

        } catch (error) {

            // Remover indicador de escritura
            chatMessages.removeChild(typingIndicator);

            // Mostrar mensaje de error
            const errorMessageDiv = document.createElement('div');
            errorMessageDiv.className = 'chat-message ai-message error-message';
            errorMessageDiv.innerHTML = `
                <div class="message-avatar">
                    <i class="fas fa-exclamation-triangle"></i>
                </div>
                <div class="message-content">
                    <p>Lo siento, no pude procesar tu consulta en este momento. Por favor, verifica tu conexión a internet y la configuración de la API.</p>
                </div>
            `;
            chatMessages.appendChild(errorMessageDiv);
        }

        // Limpiar input
        chatInput.value = '';
        document.getElementById('sendChatBtn').disabled = true;

        // Scroll al final
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }

    /**
     * Obtiene respuesta de OpenAI usando la misma configuración de la aplicación
     */
    async getOpenAIResponse(userMessage) {
        // Obtener API Key usando la misma lógica que la aplicación
        let apiKey = null;
        let apiKeySource = '';

        try {
            if (window.LOCAL_CONFIG && window.LOCAL_CONFIG.OPENAI_API_KEY) {
                apiKey = window.LOCAL_CONFIG.OPENAI_API_KEY;
                apiKeySource = 'config-local.js';
            } else if (window.getLocalApiKey) {
                apiKey = window.getLocalApiKey();
                apiKeySource = 'config-local.js';
            } else {
                throw new Error('Configuración local no disponible');
            }
        } catch (error) {
            apiKey = localStorage.getItem('openai_api_key');
            if (apiKey && apiKey !== 'sk-proj-your-openai-api-key-here') {
                apiKeySource = 'localStorage';
            } else {
                throw new Error('API Key no configurada');
            }
        }


        // Preparar contexto financiero del usuario
        const financialContext = this.getFinancialContext();

        // Crear prompt profesional de economista
        const systemPrompt = `Eres un Economista Profesional especializado en administración financiera personal y empresarial.

Tu especialización incluye:
- Análisis financiero detallado
- Estrategias de ahorro e inversión
- Optimización de presupuestos
- Planificación financiera a largo plazo
- Gestión de riesgos financieros
- Asesoramiento en decisiones económicas

IMPORTANTE:
- Responde de manera profesional pero accesible
- Usa términos técnicos cuando sea apropiado, explicándolos
- Proporciona consejos prácticos y accionables
- Considera el contexto económico uruguayo cuando sea relevante
- Sé específico con números, porcentajes y plazos
- Recomienda siempre estrategias conservadoras primero

Contexto actual del usuario:
${financialContext}

Responde como un economista profesional especializado en la mejor administración del dinero.`;

        const response = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`
            },
            body: JSON.stringify({
                model: 'gpt-4o-mini',
                messages: [
                    {
                        role: 'system',
                        content: systemPrompt
                    },
                    {
                        role: 'user',
                        content: userMessage
                    }
                ],
                max_tokens: 1000,
                temperature: 0.7
            })
        });

        if (!response.ok) {
            throw new Error(`Error de API: ${response.status} ${response.statusText}`);
        }

        const data = await response.json();
        return data.choices[0].message.content;
    }

    /**
     * Obtiene el contexto financiero actual del usuario
     */
    getFinancialContext() {
        const currentPeriod = this.currentPeriod;
        const transactions = this.getTransactionsForCurrentPeriod();

        const totalIncome = transactions
            .filter(t => t.type === 'income')
            .reduce((sum, t) => sum + t.amount, 0);

        const totalExpenses = transactions
            .filter(t => t.type === 'expense')
            .reduce((sum, t) => sum + t.amount, 0);

        const balance = totalIncome - totalExpenses;

        const goalsCount = this.goals ? this.goals.length : 0;
        const categoriesCount = this.categories ? this.categories.length : 0;

        return `Información financiera actual:
- Período actual: ${currentPeriod.month}/${currentPeriod.year}
- Total ingresos del período: $${totalIncome.toFixed(2)}
- Total gastos del período: $${totalExpenses.toFixed(2)}
- Balance del período: $${balance.toFixed(2)}
- Número de transacciones: ${transactions.length}
- Metas activas: ${goalsCount}
- Categorías configuradas: ${categoriesCount}
- Monedas utilizadas: UYU y USD`;
    }

    /**
     * Genera un reporte financiero
     */
    generateReport() {
        const reportPeriod = document.getElementById('reportPeriod').value;
        const reportResults = document.getElementById('reportResults');

        if (!reportResults) return;

        // Obtener datos para el reporte
        const transactions = this.getTransactionsForCurrentPeriod();
        const totalIncome = transactions.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0);
        const totalExpenses = transactions.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0);
        const balance = totalIncome - totalExpenses;

        // Crear contenido del reporte
        const reportHTML = `
            <div class="report-summary">
                <h4>Reporte ${reportPeriod === 'current-month' ? 'del Mes Actual' : reportPeriod === 'last-6-months' ? 'de los Últimos 6 Meses' : 'del Año Actual'}</h4>

                <div class="report-stats">
                    <div class="stat-item">
                        <span class="stat-label">Total Ingresos:</span>
                        <span class="stat-value income">$UY${totalIncome.toLocaleString('es-AR', { minimumFractionDigits: 2 })}</span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-label">Total Gastos:</span>
                        <span class="stat-value expense">$UY${totalExpenses.toLocaleString('es-AR', { minimumFractionDigits: 2 })}</span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-label">Balance:</span>
                        <span class="stat-value ${balance >= 0 ? 'positive' : 'negative'}">$UY${balance.toLocaleString('es-AR', { minimumFractionDigits: 2 })}</span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-label">Transacciones:</span>
                        <span class="stat-value">${transactions.length}</span>
                    </div>
                </div>

                <div class="report-categories">
                    <h5>Gastos por Categoría</h5>
                    <div class="categories-breakdown">
                        ${this.generateCategoryBreakdown(transactions)}
                    </div>
                </div>
            </div>
        `;

        reportResults.innerHTML = reportHTML;
        this.showNotification('Reporte generado correctamente', 'success');
    }

    /**
     * Genera el desglose por categorías para el reporte
     */
    generateCategoryBreakdown(transactions) {
        const expenses = transactions.filter(t => t.type === 'expense');
        const categoryTotals = {};

        expenses.forEach(expense => {
            if (!categoryTotals[expense.category]) {
                categoryTotals[expense.category] = 0;
            }
            categoryTotals[expense.category] += expense.amount;
        });

        return Object.entries(categoryTotals)
            .sort(([,a], [,b]) => b - a)
            .map(([category, amount]) => `
                <div class="category-breakdown-item">
                    <span class="category-name">${category}</span>
                    <span class="category-amount">$UY${amount.toLocaleString('es-AR', { minimumFractionDigits: 2 })}</span>
                </div>
            `)
            .join('');
    }

    /**
     * Actualiza la categoría de un gasto específico
     */
    updateExpenseCategory(index, newCategory) {
        const checkbox = document.querySelector(`.expense-checkbox[data-index="${index}"]`);
        const commentsDiv = document.getElementById(`comments-${index}`);
        const textarea = document.querySelector(`.expense-comment-textarea[data-index="${index}"]`);

        if (checkbox) {
            checkbox.dataset.category = newCategory;
        }

        // Mostrar/ocultar sección de comentarios según la categoría
        if (commentsDiv) {
            if (newCategory === 'Otros') {
                commentsDiv.style.display = 'block';

                // Si el textarea está vacío, llenarlo con la descripción
                if (textarea && !textarea.value.trim()) {
                    const description = checkbox?.dataset.description || '';
                    if (description) {
                        textarea.value = description;
                    }
                }
            } else {
                commentsDiv.style.display = 'none';
            }
        }
    }

    /**
     * Actualiza la moneda de un gasto específico
     */
    updateExpenseCurrency(index, newCurrency) {
        const checkbox = document.querySelector(`.expense-checkbox[data-index="${index}"]`);
        const amountSpan = document.querySelector(`.expense-item:nth-child(${index + 1}) .expense-amount`);

        if (checkbox) {
            checkbox.dataset.currency = newCurrency;

            // Actualizar el símbolo visual en la interfaz
            if (amountSpan) {
                const amount = parseFloat(checkbox.dataset.amount);
                const symbol = newCurrency === 'UYU' ? '$U' : '$';
                amountSpan.textContent = `${symbol}${amount.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
            }
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
     * Refresca todos los datos
     */
    refreshAllData() {

        // NO recargar desde localStorage aquí porque ya tenemos los datos actualizados en memoria
        // Solo actualizar la interfaz con los datos que ya tenemos

        this.renderDashboard();
        this.renderTransactions();
        this.updateCharts();
    }

    /**
     * Refresca todos los datos recargando desde localStorage (para casos especiales)
     */
    refreshAllDataWithReload() {

        // Recargar datos del localStorage
        this.loadDataFromStorage();

        // Actualizar interfaz
        this.renderDashboard();
        this.renderTransactions();
        this.updateCharts();
    }


    /**
     * Configura la selección de gastos para agregar
     */
    setupExpenseSelection() {

        const checkboxes = document.querySelectorAll('.expense-checkbox');
        const addSelectedBtn = document.getElementById('addSelectedExpenses');
        const selectAllBtn = document.getElementById('selectAllExpenses');


        if (addSelectedBtn) {
            // Remover event listeners previos para evitar duplicados
            addSelectedBtn.removeEventListener('click', this.handleAddSelectedExpenses);
            addSelectedBtn.addEventListener('click', () => this.handleAddSelectedExpenses(checkboxes));

            // Configurar actualización del estado del botón cuando cambian los checkboxes
            this.setupCheckboxStateTracking(checkboxes, addSelectedBtn);
        } else {
        }

        if (selectAllBtn) {
            selectAllBtn.addEventListener('click', () => this.handleSelectAllExpenses(checkboxes, addSelectedBtn));
        } else {
        }

        // Configurar event listeners para checkboxes individuales
        checkboxes.forEach((checkbox, index) => {
            checkbox.addEventListener('change', () => {
                this.updateAddSelectedButtonState(checkboxes, addSelectedBtn);
            });
        });
    }

    /**
     * Configura el seguimiento del estado de los checkboxes
     */
    setupCheckboxStateTracking(checkboxes, addSelectedBtn) {
        // Actualizar estado inicial del botón
        this.updateAddSelectedButtonState(checkboxes, addSelectedBtn);

        // Configurar observador para cambios dinámicos
        const observer = new MutationObserver(() => {
            this.updateAddSelectedButtonState(checkboxes, addSelectedBtn);
        });

        // Observar cambios en el contenedor de gastos
        const expensesList = document.getElementById('expensesList');
        if (expensesList) {
            observer.observe(expensesList, {
                childList: true,
                subtree: true
            });
        }
    }

    /**
     * Maneja la selección de todos los gastos
     */
    handleSelectAllExpenses(checkboxes, addSelectedBtn) {

        const allChecked = Array.from(checkboxes).every(cb => cb.checked);
        const newState = !allChecked; // Si todos están marcados, desmarcar; si no, marcar todos

        checkboxes.forEach((checkbox, index) => {
            checkbox.checked = newState;
        });

        // Actualizar el texto del botón
        const selectAllBtn = document.getElementById('selectAllExpenses');
        if (selectAllBtn) {
            selectAllBtn.innerHTML = newState
                ? '<i class="fas fa-square"></i> Deseleccionar Todos'
                : '<i class="fas fa-check-square"></i> Seleccionar Todos';
        }

        // Actualizar estado del botón "Agregar Seleccionados"
        this.updateAddSelectedButtonState(checkboxes, addSelectedBtn);

    }

    /**
     * Actualiza el estado del botón "Agregar Seleccionados"
     */
    updateAddSelectedButtonState(checkboxes, addSelectedBtn) {
        if (!addSelectedBtn) return;

        const checkedBoxes = Array.from(checkboxes).filter(cb => cb.checked);
        const hasSelections = checkedBoxes.length > 0;

        addSelectedBtn.disabled = !hasSelections;
        addSelectedBtn.textContent = hasSelections
            ? `Agregar Seleccionados (${checkedBoxes.length})`
            : 'Agregar Seleccionados';

    }

    /**
     * Maneja el evento de agregar gastos seleccionados
     */
    handleAddSelectedExpenses(checkboxes) {

        const selectedExpenses = Array.from(checkboxes)
                    .filter(cb => cb.checked)
                    .map(cb => {
                        const index = cb.dataset.index;
                        const category = cb.dataset.category || 'Otros';
                        let comments = '';

                        // Obtener comentarios si la categoría es "Otros"
                        if (category === 'Otros') {
                            const textarea = document.querySelector(`.expense-comment-textarea[data-index="${index}"]`);
                            if (textarea) {
                                comments = textarea.value.trim();

                                // Si no hay comentarios pero la descripción es detallada, usarla como comentario
                                if (!comments && cb.dataset.description && cb.dataset.description.length > 10) {
                                    comments = cb.dataset.description;
                                }
                            }
                        }

                        // Intentar usar la fecha del PDF si existe, sino usar fecha seleccionada o actual
                        let transactionDate = new Date();
                        if (cb.dataset.date && cb.dataset.date !== 'undefined' && cb.dataset.date !== '') {
                            try {
                                transactionDate = new Date(cb.dataset.date);
                                // Verificar que la fecha sea válida
                                if (isNaN(transactionDate.getTime())) {
                                    transactionDate = this.getPdfSelectedDate();
                                }
                            } catch (error) {
                                transactionDate = this.getPdfSelectedDate();
                            }
                        } else {
                            // No hay fecha en el PDF, usar fecha seleccionada por el usuario
                            transactionDate = this.getPdfSelectedDate();
                        }


                        return {
                            type: 'expense',
                            amount: parseFloat(cb.dataset.amount),
                            description: cb.dataset.description,
                            category: category,
                            currency: cb.dataset.currency || 'UYU',
                            date: transactionDate,
                            comments: comments
                        };
                    });


                if (selectedExpenses.length > 0) {
                    // LIMPIEZA AUTOMÁTICA DE DESCRIPCIONES
                    const cleanedExpenses = this.cleanPdfDescriptions(selectedExpenses);


                    cleanedExpenses.forEach(expense => {
                        expense.id = this.generateId();
                        expense.createdAt = new Date();
                        this.transactions.push(expense);
                    });


                    this.saveDataToStorage();

                    // Forzar actualización inmediata de la lista
                    this.renderTransactions();
                    this.renderDashboard();
                    this.updateCharts();

                    this.showNotification(`${selectedExpenses.length} gastos agregados correctamente`, 'success');
                } else {
                    this.showNotification('Selecciona al menos un gasto para agregar', 'error');
                }
    }

    // ==================== FUNCIONALIDADES DE GRÁFICOS ====================

    /**
     * Inicializa los gráficos
     */
    initializeCharts() {
        this.createChart1();
        this.createChart2();
        this.setupViewSelector();
    }

    /**
     * Crea el gráfico 1 (UYU)
     */
    createChart1() {
        const ctx = document.getElementById('chart1');
        if (!ctx) return;

        this.chart1 = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: [],
                datasets: [{
                    data: [],
                    backgroundColor: [],
                    borderWidth: 2,
                    borderColor: '#fff'
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: false
                    },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                return context.label + ': $U' + context.parsed.toLocaleString('es-AR');
                            }
                        }
                    }
                }
            }
        });
    }

    /**
     * Crea el gráfico 2 (USD)
     */
    createChart2() {
        const ctx = document.getElementById('chart2');
        if (!ctx) return;

        this.chart2 = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: [],
                datasets: [{
                    data: [],
                    backgroundColor: [],
                    borderWidth: 2,
                    borderColor: '#fff'
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: false
                    },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                return context.label + ': $' + context.parsed.toLocaleString('es-AR');
                            }
                        }
                    }
                }
            }
        });
    }

    /**
     * Configura el selector de vista
     */
    setupViewSelector() {
        const viewInputs = document.querySelectorAll('input[name="chartView"]');
        viewInputs.forEach(input => {
            input.addEventListener('change', (e) => {
                this.currentView = e.target.value;
                this.updateCharts();
            });
        });
    }

    /**
     * Actualiza los gráficos
     */
    updateCharts() {
        this.updateChartTitles();
        this.updateChartData();
    }

    /**
     * Actualiza los títulos de los gráficos
     */
    updateChartTitles() {
        const chartTitle1 = document.getElementById('chartTitle1');
        const chartTitle2 = document.getElementById('chartTitle2');

        if (!chartTitle1 || !chartTitle2) return;

        const titles = {
            expenses: {
                uyu: 'Gastos por Categoría (UYU)',
                usd: 'Gastos por Categoría (USD)'
            },
            income: {
                uyu: 'Ingresos por Categoría (UYU)',
                usd: 'Ingresos por Categoría (USD)'
            },
            comparative: {
                uyu: 'Comparativa UYU',
                usd: 'Comparativa USD'
            }
        };

        chartTitle1.textContent = titles[this.currentView].uyu;
        chartTitle2.textContent = titles[this.currentView].usd;
    }

    /**
     * Actualiza los datos de los gráficos
     */
    updateChartData() {
        this.updateChart1Data();
        this.updateChart2Data();
    }

    /**
     * Actualiza los datos del gráfico 1 (UYU)
     */
    updateChart1Data() {
        if (!this.chart1) return;

        const chartData = this.getChartDataByCurrency('UYU');
        this.updateChartWithData(this.chart1, chartData, 'UYU');
    }

    /**
     * Actualiza los datos del gráfico 2 (USD)
     */
    updateChart2Data() {
        if (!this.chart2) return;

        const chartData = this.getChartDataByCurrency('USD');
        this.updateChartWithData(this.chart2, chartData, 'USD');
    }

    /**
     * Obtiene los datos del gráfico por moneda
     */
    getChartDataByCurrency(currency) {
        const transactions = this.getFilteredTransactionsForCharts();
        const currencyTransactions = transactions.filter(t => t.currency === currency);

        if (this.currentView === 'expenses') {
            return this.getExpensesData(currencyTransactions);
        } else if (this.currentView === 'income') {
            return this.getIncomeData(currencyTransactions);
        } else if (this.currentView === 'comparative') {
            return this.getComparativeData(currency);
        }

        return { labels: [], data: [], colors: [] };
    }

    /**
     * Obtiene datos de gastos
     */
    getExpensesData(transactions) {
        const expenses = transactions.filter(t => t.type === 'expense');
        const categoryTotals = {};

        expenses.forEach(expense => {
            if (!categoryTotals[expense.category]) {
                categoryTotals[expense.category] = 0;
            }
            categoryTotals[expense.category] += expense.amount;
        });

        const labels = Object.keys(categoryTotals);
        const data = Object.values(categoryTotals);
        const colors = labels.map(label => this.categoryColors[label] || '#C9CBCF');

        return { labels, data, colors };
    }

    /**
     * Obtiene datos de ingresos
     */
    getIncomeData(transactions) {
        const income = transactions.filter(t => t.type === 'income');
        const categoryTotals = {};

        income.forEach(inc => {
            if (!categoryTotals[inc.category]) {
                categoryTotals[inc.category] = 0;
            }
            categoryTotals[inc.category] += inc.amount;
        });

        const labels = Object.keys(categoryTotals);
        const data = Object.values(categoryTotals);
        const colors = labels.map(label => this.categoryColors[label] || '#C9CBCF');

        return { labels, data, colors };
    }

    /**
     * Obtiene datos comparativos
     */
    getComparativeData(currency) {
        const transactions = this.getFilteredTransactionsForCharts();
        const currencyTransactions = transactions.filter(t => t.currency === currency);

        const totalExpenses = currencyTransactions
            .filter(t => t.type === 'expense')
            .reduce((sum, t) => sum + t.amount, 0);

        const totalIncome = currencyTransactions
            .filter(t => t.type === 'income')
            .reduce((sum, t) => sum + t.amount, 0);

        return {
            labels: ['Gastos', 'Ingresos'],
            data: [totalExpenses, totalIncome],
            colors: ['#FF6384', '#36A2EB']
        };
    }

    /**
     * Actualiza un gráfico con datos
     */
    updateChartWithData(chart, chartData, currency) {
        chart.data.labels = chartData.labels;
        chart.data.datasets[0].data = chartData.data;
        chart.data.datasets[0].backgroundColor = chartData.colors;
        chart.update();
    }

    /**
     * Obtiene transacciones filtradas para gráficos
     */
    getFilteredTransactionsForCharts() {
        return this.getTransactionsForCurrentPeriod();
    }

    // ==================== FUNCIONALIDADES ADICIONALES ====================

    /**
     * Configura filtros de transacciones simplificados
     */
    setupTransactionFilters() {
        const simpleFilter = document.getElementById('simpleFilter');

        if (simpleFilter) {
            // Limpiar event listeners previos para evitar duplicados
            simpleFilter.removeEventListener('change', this.handleFilterChange);
            simpleFilter.addEventListener('change', () => this.handleFilterChange());

        }
    }

    /**
     * Maneja el cambio del filtro de transacciones
     */
    handleFilterChange() {
        this.renderTransactions();
    }

    /**
     * Configura la funcionalidad de selección múltiple
     */
    setupBulkSelection() {

        const checkboxes = document.querySelectorAll('.transaction-select-checkbox');
        const selectAllBtn = document.getElementById('selectAllBtn');
        const deselectAllBtn = document.getElementById('deselectAllBtn');
        const deleteSelectedBtn = document.getElementById('deleteSelectedBtn');
        const bulkActionsBar = document.getElementById('bulkActionsBar');
        const selectedCount = document.getElementById('selectedCount');


        // Event listener para cada checkbox individual
        checkboxes.forEach(checkbox => {
            checkbox.addEventListener('change', () => {
                this.updateBulkSelectionState();
            });
        });

        // Event listener para seleccionar todas
        if (selectAllBtn) {
            selectAllBtn.addEventListener('click', () => {
                this.selectAllTransactions();
            });
        }

        // Event listener para deseleccionar todas
        if (deselectAllBtn) {
            deselectAllBtn.addEventListener('click', () => {
                this.deselectAllTransactions();
            });
        }

        // Event listener para eliminar seleccionadas
        if (deleteSelectedBtn) {
            deleteSelectedBtn.addEventListener('click', () => {
                this.deleteSelectedTransactions();
            });
        }

    }

    /**
     * Actualiza el estado de la barra de acciones masivas
     */
    updateBulkSelectionState() {
        const checkboxes = document.querySelectorAll('.transaction-select-checkbox');
        const checkedBoxes = document.querySelectorAll('.transaction-select-checkbox:checked');
        const bulkActionsBar = document.getElementById('bulkActionsBar');
        const selectedCount = document.getElementById('selectedCount');

        const checkedCount = checkedBoxes.length;

        if (checkedCount > 0) {
            // Mostrar barra de acciones
            if (bulkActionsBar) {
                bulkActionsBar.style.display = 'flex';
            }
            // Actualizar contador
            if (selectedCount) {
                selectedCount.textContent = checkedCount;
            }
        } else {
            // Ocultar barra de acciones
            if (bulkActionsBar) {
                bulkActionsBar.style.display = 'none';
            }
        }

    }

    /**
     * Selecciona todas las transacciones
     */
    selectAllTransactions() {
        const checkboxes = document.querySelectorAll('.transaction-select-checkbox');
        checkboxes.forEach(checkbox => {
            checkbox.checked = true;
        });
        this.updateBulkSelectionState();
    }

    /**
     * Deselecciona todas las transacciones
     */
    deselectAllTransactions() {
        const checkboxes = document.querySelectorAll('.transaction-select-checkbox');
        checkboxes.forEach(checkbox => {
            checkbox.checked = false;
        });
        this.updateBulkSelectionState();
    }

    /**
     * Elimina las transacciones seleccionadas
     */
    deleteSelectedTransactions() {
        const checkedBoxes = document.querySelectorAll('.transaction-select-checkbox:checked');

        if (checkedBoxes.length === 0) {
            this.showNotification('No hay transacciones seleccionadas', 'warning');
            return;
        }

        const selectedIds = Array.from(checkedBoxes).map(checkbox =>
            checkbox.getAttribute('data-transaction-id')
        );


        // Mostrar confirmación
        const confirmMessage = `¿Estás seguro de que deseas eliminar ${selectedIds.length} transacción(es) seleccionada(s)? Esta acción no se puede deshacer.`;

        if (confirm(confirmMessage)) {
            let deletedCount = 0;

            selectedIds.forEach(transactionId => {
                try {
                    this.deleteTransaction(transactionId);
                    deletedCount++;
                } catch (error) {
                }
            });

            this.showNotification(`${deletedCount} transacción(es) eliminada(s) correctamente`, 'success');

            // Refrescar la vista
            this.renderTransactions();
        }
    }

    /**
     * Obtiene transacciones filtradas de manera simplificada
     */
    getSimpleFilteredTransactions() {
        let transactions = this.getTransactionsForCurrentPeriod();
        const simpleFilter = document.getElementById('simpleFilter');


        if (!simpleFilter || !simpleFilter.value || simpleFilter.value === 'all') {
            // Mostrar todas las transacciones ordenadas por fecha
            return transactions.sort((a, b) => new Date(b.date) - new Date(a.date));
        }

        switch (simpleFilter.value) {
            case 'income':
                transactions = transactions.filter(t => t.type === 'income');
                break;
            case 'expense':
                transactions = transactions.filter(t => t.type === 'expense');
                break;
            case 'recent':
                // Ordenar por fecha y tomar las últimas 10
                transactions = transactions
                    .sort((a, b) => new Date(b.date) - new Date(a.date))
                    .slice(0, 10);
                return transactions;
        }

        return transactions.sort((a, b) => new Date(b.date) - new Date(a.date));
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
     * Renderiza las transacciones
     */
    renderTransactions() {
        const container = document.getElementById('transactionsList');
        if (!container) {
            return;
        }


        const filteredTransactions = this.getSimpleFilteredTransactions();

        if (filteredTransactions.length === 0) {
            container.innerHTML = '<p class="no-data">No hay transacciones para mostrar</p>';
            return;
        }

            const transactionsHTML = filteredTransactions.map(transaction => {
                const symbol = transaction.currency === 'UYU' ? '$U' : '$';
                const formattedAmount = transaction.amount.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
                const transactionDate = new Date(transaction.date);

                // Formatear fecha de manera más legible
                const today = new Date();
                const yesterday = new Date(today);
                yesterday.setDate(yesterday.getDate() - 1);

                let dateDisplay;
                if (transactionDate.toDateString() === today.toDateString()) {
                    dateDisplay = 'Hoy';
                } else if (transactionDate.toDateString() === yesterday.toDateString()) {
                    dateDisplay = 'Ayer';
                } else {
                    dateDisplay = transactionDate.toLocaleDateString('es-AR', {
                        day: 'numeric',
                        month: 'short'
                    });
                }

                return `
                    <div class="transaction-item-simple ${transaction.type}" data-transaction-id="${transaction.id}">
                        <div class="transaction-checkbox">
                            <input type="checkbox" class="transaction-select-checkbox" data-transaction-id="${transaction.id}">
                        </div>
                        <div class="transaction-icon">
                            <i class="fas ${transaction.type === 'income' ? 'fa-arrow-up' : 'fa-arrow-down'}"></i>
                        </div>
                        <div class="transaction-main">
                            <div class="transaction-title">${transaction.description}</div>
                            <div class="transaction-meta">${transaction.category} • ${dateDisplay}</div>
                        </div>
                        <div class="transaction-amount-simple">
                            <span class="amount ${transaction.type}">
                                ${transaction.type === 'income' ? '+' : '-'}${symbol}${formattedAmount}
                            </span>
                        </div>
                        <div class="transaction-actions">
                            <button type="button" class="delete-transaction-btn" data-transaction-id="${transaction.id}" title="Eliminar transacción">
                                <i class="fas fa-trash"></i>
                            </button>
                        </div>
                    </div>
                `;
            }).join('');

        // Agregar barra de acciones para selección múltiple
        const bulkActionsHTML = `
            <div class="bulk-actions-bar" id="bulkActionsBar" style="display: none;">
                <div class="bulk-actions-info">
                    <span id="selectedCount">0</span> transacción(es) seleccionada(s)
                </div>
                <div class="bulk-actions-buttons">
                    <button type="button" id="selectAllBtn" class="btn btn-secondary">
                        <i class="fas fa-check-square"></i> Seleccionar todas
                    </button>
                    <button type="button" id="deselectAllBtn" class="btn btn-secondary">
                        <i class="fas fa-square"></i> Deseleccionar
                    </button>
                    <button type="button" id="deleteSelectedBtn" class="btn btn-danger">
                        <i class="fas fa-trash"></i> Eliminar seleccionadas
                    </button>
                </div>
            </div>
        `;

        container.innerHTML = bulkActionsHTML + transactionsHTML;

        // Configurar event listeners para los botones de eliminación
        this.setupDeleteTransactionButtons();

        // Configurar selección múltiple
        this.setupBulkSelection();

    }

    /**
     * Configura los event listeners para los botones de eliminación
     */
    setupDeleteTransactionButtons() {

        // Limpiar event listeners previos
        document.querySelectorAll('.delete-transaction-btn').forEach(button => {
            button.removeEventListener('click', this.handleDeleteClick);
        });

        const deleteButtons = document.querySelectorAll('.delete-transaction-btn');

        // Usar bind para mantener el contexto correcto
        this.handleDeleteClick = this.handleDeleteClick.bind(this);

        deleteButtons.forEach((button, index) => {
            const transactionId = button.getAttribute('data-transaction-id');
            button.addEventListener('click', this.handleDeleteClick);
        });

    }

    /**
     * Maneja el clic en el botón de eliminar
     */
    handleDeleteClick(e) {
        e.preventDefault();
        e.stopPropagation();

        const button = e.currentTarget;
        const transactionId = button.getAttribute('data-transaction-id');


        if (transactionId) {
            this.showDeleteConfirmationModal(transactionId);
        } else {
        }
    }

    /**
     * Muestra el modal de confirmación para eliminar una transacción
     */
    showDeleteConfirmationModal(transactionId) {

        const transaction = this.transactions.find(t => t.id === transactionId);
        if (!transaction) {
            return;
        }


        const modal = this.createDeleteConfirmationModal(transaction);

        // Verificar que el modal tenga los elementos correctos antes de agregarlo
        const confirmBtn = modal.querySelector('.confirm-delete-btn');
        const cancelBtn = modal.querySelector('.cancel-delete-btn');

        document.body.appendChild(modal);

        // HACER VISIBLE EL MODAL - ¡ESTO ES CRÍTICO!
        modal.style.display = 'block';
        modal.style.zIndex = '10000'; // Asegurar que esté por encima de otros elementos

        // Verificar que los botones estén presentes después de agregar al DOM
        const confirmBtnAfter = modal.querySelector('.confirm-delete-btn');
        const cancelBtnAfter = modal.querySelector('.cancel-delete-btn');

        this.setupDeleteConfirmationModalEvents(modal, transactionId);
    }

    /**
     * Crea el modal de confirmación de eliminación
     */
    createDeleteConfirmationModal(transaction) {
        const symbol = transaction.currency === 'UYU' ? '$U' : '$';
        const formattedAmount = transaction.amount.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

        const modal = document.createElement('div');
        modal.className = 'modal delete-confirmation-modal';
        modal.innerHTML = `
            <div class="modal-content delete-modal-content">
                <div class="modal-header">
                    <h2><i class="fas fa-exclamation-triangle warning-icon"></i> Confirmar Eliminación</h2>
                </div>
                <div class="modal-body">
                    <div class="delete-confirmation-message">
                        <p>¿Estás seguro de que deseas eliminar esta transacción?</p>
                        <div class="transaction-details">
                            <div class="transaction-preview ${transaction.type}">
                                <div class="transaction-icon">
                                    <i class="fas ${transaction.type === 'income' ? 'fa-arrow-up' : 'fa-arrow-down'}"></i>
                                </div>
                                <div class="transaction-info">
                                    <div class="transaction-title">${transaction.description}</div>
                                    <div class="transaction-meta">${transaction.category} • ${new Date(transaction.date).toLocaleDateString('es-AR')}</div>
                                </div>
                                <div class="transaction-amount">
                                    <span class="amount ${transaction.type}">
                                        ${transaction.type === 'income' ? '+' : '-'}${symbol}${formattedAmount}
                                    </span>
                                </div>
                            </div>
                        </div>
                        <p class="warning-text"><strong>⚠️ Esta acción no se puede deshacer.</strong></p>
                    </div>
                </div>
                <div class="modal-footer">
                    <button type="button" class="btn btn-secondary cancel-delete-btn">
                        <i class="fas fa-times"></i> Cancelar
                    </button>
                    <button type="button" class="btn btn-danger confirm-delete-btn">
                        <i class="fas fa-trash"></i> Eliminar
                    </button>
                </div>
            </div>
        `;
        return modal;
    }

    /**
     * Obtiene transacciones para el período actual
     */
    getTransactionsForCurrentPeriod() {
        const { year, month, type } = this.currentPeriod;

        const filteredTransactions = this.transactions.filter(transaction => {
            const transactionDate = new Date(transaction.date);
            const transactionYear = transactionDate.getFullYear();
            const transactionMonth = transactionDate.getMonth() + 1; // getMonth() devuelve 0-11

            if (type === 'monthly') {
                return transactionYear === year && transactionMonth === month;
            } else {
                return transactionYear === year;
            }
        });

        return filteredTransactions;
    }

    /**
     * Configura los event listeners del modal de confirmación
     */
    setupDeleteConfirmationModalEvents(modal, transactionId) {

        const cancelBtn = modal.querySelector('.cancel-delete-btn');
        const confirmBtn = modal.querySelector('.confirm-delete-btn');
        const closeBtn = modal.querySelector('.modal-header .close');

        const closeModal = () => {
            if (modal) {
                modal.style.display = 'none';
                // Remover del DOM después de un pequeño delay para que la transición sea visible
                setTimeout(() => {
                    if (modal && modal.parentNode) {
                        modal.parentNode.removeChild(modal);
                    }
                }, 300);
            }
        };

        if (cancelBtn) {
            cancelBtn.addEventListener('click', () => {
                closeModal();
            });
        }

        if (confirmBtn) {
            // Agregar un event listener adicional para debugging
            confirmBtn.addEventListener('mousedown', () => {
            });

            confirmBtn.addEventListener('click', (e) => {

                try {

                    if (typeof this.deleteTransaction !== 'function') {
                        throw new Error('Función deleteTransaction no encontrada');
                    }

                    this.deleteTransaction(transactionId);
                } catch (error) {
                    this.showNotification('Error: No se pudo eliminar la transacción', 'error');
                }

                // Cerrar modal después de la eliminación
                closeModal();
            });
        }

        if (closeBtn) closeBtn.addEventListener('click', closeModal);

        // Cerrar al hacer clic fuera del modal
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                closeModal();
            }
        });

        // Cerrar con tecla Escape
        document.addEventListener('keydown', function escapeHandler(e) {
            if (e.key === 'Escape') {
                closeModal();
                document.removeEventListener('keydown', escapeHandler);
            }
        });

    }

    /**
     * Elimina una transacción usando la API DELETE al _id en MongoDB
     */
    async deleteTransaction(transactionId) {

        // Verificar que transactionId sea válido
        if (!transactionId || typeof transactionId !== 'string') {
            this.showNotification('Error: ID de transacción inválido', 'error');
            return;
        }

        // Verificar que tengamos transacciones cargadas
        if (!this.transactions || !Array.isArray(this.transactions)) {
            this.showNotification('Error: Datos de transacciones corruptos', 'error');
            return;
        }

        // Encontrar la transacción en el array local
        const transactionIndex = this.transactions.findIndex(t => t && t.id === transactionId);

        if (transactionIndex === -1) {
            this.showNotification('Error: Transacción no encontrada', 'error');
            return;
        }

        const transaction = this.transactions[transactionIndex];

        try {
            // Intentar eliminar del backend primero usando la API DELETE
            const response = await fetch(`${FINANCE_API_CONFIG.baseUrl}${FINANCE_API_CONFIG.endpoints.transactions}/${transactionId}`, {
                method: 'DELETE',
                headers: {
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                this.showNotification('Error: No se pudo eliminar la transacción del servidor', 'error');
                return;
            }

            const result = await response.json();
            if (!result.success) {
                this.showNotification('Error: La eliminación no fue confirmada por el servidor', 'error');
                return;
            }


        } catch (backendError) {
            this.showNotification('Error: No se pudo conectar con el servidor. La transacción no se eliminó.', 'error');
            return;
        }

        // Si la eliminación del backend fue exitosa, eliminar del array local
        this.transactions.splice(transactionIndex, 1);

        // Verificar que la transacción fue eliminada del array local
        const stillExists = this.transactions.find(t => t.id === transactionId);
        if (stillExists) {
            this.showNotification('Error: Problema interno al eliminar la transacción', 'error');
            return;
        }

        // Guardar en localStorage
        this.saveDataToStorage();

        // Verificar que se guardó correctamente
        try {
            const saved = localStorage.getItem('fede_life_transactions');
            const savedTransactions = JSON.parse(saved);
        } catch (error) {
        }

        // Actualizar la interfaz
        this.refreshAllData();

        // Mostrar notificación de éxito
        this.showNotification(`Transacción eliminada: ${transaction.description}`, 'success');

    }

    /**
     * Genera un ID único para una transacción
     */
    generateId() {
        const timestamp = Date.now();
        const random = Math.random().toString(36).substr(2, 9);
        return `tx_${timestamp}_${random}`;
    }

    /**
     * Función de prueba para verificar el funcionamiento de la eliminación
     * Ejecutar desde la consola: financeApp.testDeleteFunctionality()
     */
    testDeleteFunctionality() {

        // Verificar que existan transacciones
        if (this.transactions.length === 0) {
            return;
        }

        // Mostrar las primeras 3 transacciones disponibles
        this.transactions.slice(0, 3).forEach((t, i) => {
        });

        // Verificar que las funciones existan

        // Verificar el contexto

    }

    /**
     * Función de prueba para verificar que el modal se muestra correctamente
     * Ejecutar desde la consola: financeApp.testModalVisibility()
     */
    testModalVisibility() {

        // Crear un modal de prueba
        const testModal = document.createElement('div');
        testModal.className = 'modal';
        testModal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h2>Modal de Prueba</h2>
                </div>
                <div class="modal-body">
                    <p>Este es un modal de prueba para verificar visibilidad.</p>
                </div>
                <div class="modal-footer">
                    <button class="btn btn-primary test-close-btn">Cerrar</button>
                </div>
            </div>
        `;

        // Agregar al DOM
        document.body.appendChild(testModal);

        // Hacerlo visible
        testModal.style.display = 'block';
        testModal.style.zIndex = '10000';


        // Configurar botón de cerrar
        const closeBtn = testModal.querySelector('.test-close-btn');
        if (closeBtn) {
            closeBtn.addEventListener('click', () => {
                testModal.style.display = 'none';
                setTimeout(() => {
                    if (testModal.parentNode) {
                        testModal.parentNode.removeChild(testModal);
                    }
                }, 300);
            });
        }

    }

    /**
     * Función de prueba para verificar las categorías
     * Ejecutar desde la consola: financeApp.testCategoriesFunctionality()
     */
    testCategoriesFunctionality() {


        if (this.categories.length === 0) {
            return;
        }

        this.categories.forEach((cat, i) => {
            const count = this.getTransactionCountByCategory(cat.name);
            const total = this.getTotalAmountByCategory(cat.name);
        });


    }

    /**
     * Función para limpiar y regenerar categorías con IDs válidos
     * Ejecutar desde la consola: financeApp.resetCategoriesWithValidIds()
     */
    resetCategoriesWithValidIds() {

        try {
            // Forzar recarga de categorías por defecto
            this.initializeDefaultCategories();

            // Guardar explícitamente
            this.saveDataToStorage();

            // Re-renderizar
            this.renderCategories();


            // Mostrar mensaje al usuario
            this.showNotification('Categorías regeneradas correctamente', 'success');

        } catch (error) {
            this.showNotification('Error al regenerar categorías', 'error');
        }
    }

    /**
     * Función para limpiar completamente las categorías del localStorage
     * Ejecutar desde la consola: financeApp.clearCategoriesStorage()
     */
    clearCategoriesStorage() {

        try {
            // Eliminar categorías del localStorage
            localStorage.removeItem('fede_life_categories');

            // Forzar recarga de categorías por defecto
            this.initializeDefaultCategories();

            // Guardar las nuevas categorías
            this.saveDataToStorage();

            // Re-renderizar
            this.renderCategories();


            this.showNotification('Categorías limpiadas y recargadas', 'success');

        } catch (error) {
            this.showNotification('Error al limpiar categorías', 'error');
        }
    }

    /**
     * Función para limpiar las descripciones de transacciones quitando "Compra" del inicio
     * @param {string} description - La descripción original
     * @returns {string} La descripción limpiada
     */
    cleanTransactionDescription(description) {
        if (!description || typeof description !== 'string') {
            return description;
        }

        // Quitar "Compra" del inicio (case insensitive)
        let cleaned = description.trim();

        // Patrones a quitar del inicio
        const patternsToRemove = [
            /^compra\s+/i,
            /^compras\s+/i,
            /^pago\s+/i,
            /^pagos\s+/i,
            /^gasto\s+/i,
            /^gastos\s+/i,
            /^transacción\s+/i,
            /^transferencia\s+/i
        ];

        for (const pattern of patternsToRemove) {
            if (pattern.test(cleaned)) {
                cleaned = cleaned.replace(pattern, '').trim();
                break; // Solo quitar el primer patrón que coincida
            }
        }

        // Si la descripción quedó vacía, devolver la original
        return cleaned || description;
    }

    /**
     * Función para limpiar todas las descripciones de transacciones existentes
     * Ejecutar desde la consola: financeApp.cleanAllTransactionDescriptions()
     */
    cleanAllTransactionDescriptions() {

        let cleanedCount = 0;
        const originalDescriptions = new Map();

        try {
            this.transactions.forEach((transaction, index) => {
                const originalDesc = transaction.description;
                const cleanedDesc = this.cleanTransactionDescription(originalDesc);

                if (originalDesc !== cleanedDesc) {
                    originalDescriptions.set(index, { original: originalDesc, cleaned: cleanedDesc });
                    transaction.description = cleanedDesc;
                    cleanedCount++;
                }
            });

            if (cleanedCount > 0) {
                // Guardar cambios
                this.saveDataToStorage();

                // Re-renderizar vistas
                this.renderTransactions();
                this.renderCategories();


                this.showNotification(`${cleanedCount} descripciones limpiadas correctamente`, 'success');
            } else {
                this.showNotification('No se encontraron descripciones para limpiar', 'info');
            }

        } catch (error) {
            this.showNotification('Error al limpiar descripciones', 'error');
        }
    }

    /**
     * Función para limpiar descripciones durante el procesamiento de PDFs
     * Se ejecuta automáticamente al agregar transacciones desde PDFs
     */
    cleanPdfDescriptions(transactions) {

        transactions.forEach(transaction => {
            if (transaction.description) {
                const originalDesc = transaction.description;
                const cleanedDesc = this.cleanTransactionDescription(originalDesc);

                if (originalDesc !== cleanedDesc) {
                    transaction.description = cleanedDesc;
                }
            }
        });

        return transactions;
    }

    /**
     * Función de diagnóstico específica para el problema de categorías
     * Ejecutar desde la consola: financeApp.diagnoseCategoryClicks()
     */
    diagnoseCategoryClicks() {

        // Verificar que las categorías estén renderizadas
        const categoryItems = document.querySelectorAll('.category-item');

        if (categoryItems.length === 0) {
            return;
        }

        // Verificar que tengan los atributos correctos
        categoryItems.forEach((item, index) => {
            const categoryId = item.getAttribute('data-category-id');
            const onclickAttr = item.getAttribute('onclick');

        });

        // Verificar funciones globales

        if (window.financeApp) {
        }

        // Verificar que las categorías estén en memoria
        if (this.categories.length > 0) {
        }

    }

    /**
     * Muestra una notificación al usuario
     */
    showNotification(message, type = 'info') {
        // Crear elemento de notificación
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.innerHTML = `
            <div class="notification-content">
                <i class="fas ${type === 'success' ? 'fa-check-circle' : type === 'error' ? 'fa-exclamation-triangle' : 'fa-info-circle'}"></i>
                <span>${message}</span>
            </div>
        `;

        // Agregar al DOM
        document.body.appendChild(notification);

        // Animar entrada
        setTimeout(() => notification.classList.add('show'), 10);

        // Auto-remover después de 3 segundos
        setTimeout(() => {
            notification.classList.remove('show');
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.parentNode.removeChild(notification);
                }
            }, 300);
        }, 3000);
    }

    /**
     * Obtiene transacciones para el período actual
     */
    getTransactionsForCurrentPeriod() {
        const { year, month, type } = this.currentPeriod;

        const filteredTransactions = this.transactions.filter(transaction => {
            const transactionDate = new Date(transaction.date);
            const transactionYear = transactionDate.getFullYear();
            const transactionMonth = transactionDate.getMonth() + 1;

            if (type === 'yearly') {
                return transactionYear === year;
            } else {
                return transactionYear === year && transactionMonth === month;
            }
        });

        return filteredTransactions;
    }

    /**
     * Actualiza los balances de las cuentas
     */
    updateAccountBalances(transactions) {
        // Calcular balances para UYU
        const uyuTransactions = transactions.filter(t => t.currency === 'UYU');
        const uyuIncome = uyuTransactions.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0);
        const uyuExpenses = uyuTransactions.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0);
        const uyuBalance = uyuIncome - uyuExpenses;

        // Calcular balances para USD
        const usdTransactions = transactions.filter(t => t.currency === 'USD');
        const usdIncome = usdTransactions.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0);
        const usdExpenses = usdTransactions.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0);
        const usdBalance = usdIncome - usdExpenses;

        // Actualizar UI para UYU
        this.updateAccountUI('UYU', uyuIncome, uyuExpenses, uyuBalance);

        // Actualizar UI para USD
        this.updateAccountUI('USD', usdIncome, usdExpenses, usdBalance);
    }

    /**
     * Actualiza la UI de una cuenta específica
     */
    updateAccountUI(currency, income, expenses, balance) {
        const suffix = currency === 'UYU' ? 'UYU' : 'USD';
        const symbol = currency === 'UYU' ? '$U' : '$';

        // Actualizar ingresos
        const incomeEl = document.getElementById(`totalIncome${suffix}`);
        if (incomeEl) incomeEl.textContent = `${symbol}${income.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

        // Actualizar gastos
        const expensesEl = document.getElementById(`totalExpenses${suffix}`);
        if (expensesEl) expensesEl.textContent = `${symbol}${expenses.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

        // Actualizar balance
        const balanceEl = document.getElementById(`totalBalance${suffix}`);
        if (balanceEl) {
            balanceEl.textContent = `${symbol}${balance.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
            balanceEl.className = balance >= 0 ? 'positive' : 'negative';
        }
    }

    /**
     * Configura el selector global de períodos
     */
    setupGlobalPeriodSelector() {

        // Navegación de períodos
        const prevBtn = document.getElementById('prevPeriodBtn');
        const nextBtn = document.getElementById('nextPeriodBtn');

        if (prevBtn) {
            prevBtn.addEventListener('click', () => {
                this.navigateToPreviousPeriod();
            });
        } else {
        }

        if (nextBtn) {
            nextBtn.addEventListener('click', () => {
                this.navigateToNextPeriod();
            });
        } else {
        }

        // Cambio de tipo de período
        const periodTypeInputs = document.querySelectorAll('input[name="periodType"]');
        periodTypeInputs.forEach(input => {
            input.addEventListener('change', (e) => {
                this.changePeriodType(e.target.value);
            });
        });

        // Botones de salto eliminados según requerimiento del usuario

        // Actualizar display inicial
        this.updatePeriodDisplay();


    }

    /**
     * Navega al período anterior
     */
    navigateToPreviousPeriod() {
        if (this.currentPeriod.type === 'monthly') {
            this.currentPeriod.month--;
            if (this.currentPeriod.month < 1) {
                this.currentPeriod.month = 12;
                this.currentPeriod.year--;
            }
        } else {
            this.currentPeriod.year--;
        }

        this.updatePeriodDisplay();
        this.refreshAllData();
    }

    /**
     * Navega al período siguiente
     */
    navigateToNextPeriod() {
        if (this.currentPeriod.type === 'monthly') {
            this.currentPeriod.month++;
            if (this.currentPeriod.month > 12) {
                this.currentPeriod.month = 1;
                this.currentPeriod.year++;
            }
        } else {
            this.currentPeriod.year++;
        }

        this.updatePeriodDisplay();
        this.refreshAllData();
    }

    /**
     * Cambia el tipo de período
     */
    changePeriodType(newType) {
        this.currentPeriod.type = newType;
        this.updatePeriodDisplay();
        this.refreshAllData();
    }

    /**
     * Salta al período actual
     */
    jumpToCurrentPeriod() {
        const now = new Date();
        this.currentPeriod.year = now.getFullYear();
        this.currentPeriod.month = now.getMonth() + 1;
        this.updatePeriodDisplay();
        this.refreshAllData();
    }

    /**
     * Actualiza el display del período
     */
    updatePeriodDisplay() {
        const display = document.getElementById('currentPeriodDisplay');
        if (!display) return;

        const { year, month, type } = this.currentPeriod;

        if (type === 'yearly') {
            display.textContent = year.toString();
        } else {
            const monthNames = [
                'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
                'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
            ];
            display.textContent = `${monthNames[month - 1]} ${year}`;
        }
    }

    /**
     * Muestra el modal para saltar a un período específico
     */
    showJumpToPeriodModal() {
        const modal = this.createJumpToPeriodModal();
        document.body.appendChild(modal);
        this.setupJumpToPeriodModalEvents(modal);
        this.updateJumpToPeriodModal(modal);
    }

    /**
     * Crea el modal para saltar a período
     */
    createJumpToPeriodModal() {
        const modal = document.createElement('div');
        modal.className = 'modal';
        modal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h2>Ir a Período</h2>
                    <span class="close">&times;</span>
                </div>
                <div class="modal-body">
                    <div class="form-group">
                        <label for="jumpYear">Año:</label>
                        <input type="number" id="jumpYear" min="2020" max="2030" value="${this.currentPeriod.year}">
                    </div>
                    <div class="form-group" id="jumpMonthGroup">
                        <label for="jumpMonth">Mes:</label>
                        <select id="jumpMonth">
                            <option value="1">Enero</option>
                            <option value="2">Febrero</option>
                            <option value="3">Marzo</option>
                            <option value="4">Abril</option>
                            <option value="5">Mayo</option>
                            <option value="6">Junio</option>
                            <option value="7">Julio</option>
                            <option value="8">Agosto</option>
                            <option value="9">Septiembre</option>
                            <option value="10">Octubre</option>
                            <option value="11">Noviembre</option>
                            <option value="12">Diciembre</option>
                        </select>
                    </div>
                    <div class="form-actions">
                        <button type="button" class="btn btn-secondary" id="cancelJumpBtn">Cancelar</button>
                        <button type="button" class="btn btn-primary" id="confirmJumpBtn">Ir</button>
                    </div>
                </div>
            </div>
        `;
        return modal;
    }

    /**
     * Configura eventos del modal de salto a período
     */
    setupJumpToPeriodModalEvents(modal) {
        const closeBtn = modal.querySelector('.close');
        const cancelBtn = modal.querySelector('#cancelJumpBtn');
        const confirmBtn = modal.querySelector('#confirmJumpBtn');

        const closeModal = () => this.closeJumpToPeriodModal(modal);

        closeBtn.addEventListener('click', closeModal);
        cancelBtn.addEventListener('click', closeModal);
        confirmBtn.addEventListener('click', () => this.handleJumpToPeriodSubmit(modal));

        // Cerrar al hacer clic fuera del modal
        modal.addEventListener('click', (e) => {
            if (e.target === modal) closeModal();
        });
    }

    /**
     * Actualiza el modal de salto a período
     */
    updateJumpToPeriodModal(modal) {
        const jumpYear = modal.querySelector('#jumpYear');
        const jumpMonth = modal.querySelector('#jumpMonth');
        const jumpMonthGroup = modal.querySelector('#jumpMonthGroup');

        jumpYear.value = this.currentPeriod.year;
        jumpMonth.value = this.currentPeriod.month;

        // Mostrar/ocultar selector de mes según el tipo de período
        if (this.currentPeriod.type === 'yearly') {
            jumpMonthGroup.style.display = 'none';
        } else {
            jumpMonthGroup.style.display = 'block';
        }
    }

    /**
     * Maneja el envío del modal de salto a período
     */
    handleJumpToPeriodSubmit(modal) {
        const jumpYear = parseInt(modal.querySelector('#jumpYear').value);
        const jumpMonth = parseInt(modal.querySelector('#jumpMonth').value);

        this.currentPeriod.year = jumpYear;
        if (this.currentPeriod.type === 'monthly') {
            this.currentPeriod.month = jumpMonth;
        }

        this.closeJumpToPeriodModal(modal);
        this.updatePeriodDisplay();
        this.refreshAllData();
    }

    /**
     * Cierra el modal de salto a período
     */
    closeJumpToPeriodModal(modal) {
        if (modal && modal.parentNode) {
            modal.parentNode.removeChild(modal);
        }
    }

    /**
     * Actualiza el renderDashboard para incluir gráficos
     */
    renderDashboard() {
        const transactions = this.getTransactionsForCurrentPeriod();
        this.updateAccountBalances(transactions);
        this.updateCharts(); // Actualizar gráficos cuando cambian las transacciones
    }

    /**
     * Obtiene los datos financieros actuales del frontend para el sistema de IA
     * @returns {Object} Datos financieros actuales
     */
    getCurrentFinancialData() {
        const summary = this.calculateFinancialSummary();

        return {
            user: {
                name: 'Usuario',
                currency: 'UYU'
            },
            summary: summary,
            recentTransactions: this.transactions ? this.transactions.slice(-10) : [],
            activeGoals: this.goals ? this.goals.filter(g => !g.completed) : [],
            categories: this.categories || [],
            currentPeriod: this.currentPeriod || { type: 'monthly', year: new Date().getFullYear(), month: new Date().getMonth() + 1 }
        };
    }

    /**
     * Obtiene la vista actual del usuario
     * @returns {string} Vista actual
     */
    getCurrentView() {
        const activeTab = document.querySelector('.tab-content.active');
        if (activeTab) {
            return activeTab.id || 'transactions';
        }
        return 'transactions';
    }

    /**
     * Obtiene las preferencias del usuario
     * @returns {Object} Preferencias del usuario
     */
    getUserPreferences() {
        return {
            currency: 'UYU', // Por defecto
            language: 'es',
            theme: 'light',
            notifications: true
        };
    }
}

// ==================== INICIALIZACIÓN ====================

// Asegurar que el modal de metas esté cerrado antes de cualquier inicialización
(function ensureModalClosed() {
    const goalModal = document.getElementById('goalModal');
    if (goalModal) {
        goalModal.style.setProperty('display', 'none', 'important');
        console.log('🔒 Goal modal closed on page load');
    }
})();

// Crear instancia global
const financeApp = new FinanceApp();
console.log('🏗️ FinanceApp instance created:', financeApp);

// Hacer disponible globalmente
if (typeof window !== 'undefined') {
    window.financeApp = financeApp;
    console.log('✅ window.financeApp assigned successfully');

    // Función de debugging para forzar visibilidad de modales
    window.forceShowModals = function() {
        const modals = document.querySelectorAll('.modal');
        modals.forEach((modal, index) => {
            modal.style.display = 'flex !important';
            modal.style.zIndex = '999999 !important';
            modal.style.position = 'fixed !important';
            modal.style.top = '0 !important';
            modal.style.left = '0 !important';
            modal.style.width = '100vw !important';
            modal.style.height = '100vh !important';
            modal.style.backgroundColor = 'rgba(0, 0, 0, 0.8) !important';
            console.log(`🔧 Forced modal ${index} to be visible`);
        });

        if (modals.length === 0) {
            console.log('❌ No modals found in DOM');
        } else {
            console.log(`✅ Found ${modals.length} modals, forced visibility`);
        }
    };

    // Función para listar todos los modales
    window.listModals = function() {
        const modals = document.querySelectorAll('.modal');
        console.log('📋 Modals in DOM:', modals.length);
        modals.forEach((modal, index) => {
            console.log(`Modal ${index}:`, {
                display: modal.style.display,
                zIndex: modal.style.zIndex,
                visible: modal.offsetWidth > 0 && modal.offsetHeight > 0,
                classes: modal.className,
                html: modal.innerHTML.substring(0, 100) + '...'
            });
        });
    };

    // Asegurar que todos los modales estén cerrados por defecto
    setTimeout(() => {
        console.log('🔒 Ensuring all modals are closed by default...');
        const modals = document.querySelectorAll('.modal');
        modals.forEach(modal => {
            modal.style.setProperty('display', 'none', 'important');
        });
        console.log(`✅ Closed ${modals.length} modals by default`);
    }, 50);

    // Verificar que todos los métodos críticos estén disponibles
    setTimeout(() => {
        const criticalMethods = ['showCategoryDetails', 'editTransaction', 'renderDashboard'];
        let missingMethods = [];

        criticalMethods.forEach(method => {
            if (typeof window.financeApp[method] !== 'function') {
                missingMethods.push(method);
            }
        });

        if (missingMethods.length > 0) {
            console.error('❌ Missing critical methods:', missingMethods);
        } else {
            console.log('✅ All critical methods available');
            console.log('🔧 Debugging functions available: forceShowModals(), listModals()');
        }
    }, 100);
} else {
    console.error('❌ Window object not available');
}

// ==================== FUNCIONES DE DIAGNÓSTICO ====================

/**
 * Función de diagnóstico para verificar el estado de la aplicación
 */
function diagnoseFinanceApp() {
    console.log('🔍 === DIAGNÓSTICO DE FINANZAS ===');

    // Verificar si window.financeApp existe
    if (typeof window !== 'undefined') {
        console.log('✅ Window object available');

        if (window.financeApp) {
            console.log('✅ window.financeApp exists');
            console.log('📊 Transactions:', window.financeApp.transactions ? window.financeApp.transactions.length : 0);
            console.log('📂 Categories:', window.financeApp.categories ? window.financeApp.categories.length : 0);
            console.log('🎯 Goals:', window.financeApp.goals ? window.financeApp.goals.length : 0);
            console.log('📈 API_BASE_URL:', window.financeApp.API_BASE_URL);

            // Verificar métodos
            const methods = ['showCategoryDetails', 'editTransaction', 'renderDashboard', 'renderCategories'];
            methods.forEach(method => {
                if (typeof window.financeApp[method] === 'function') {
                    console.log(`✅ ${method} method available`);
                } else {
                    console.error(`❌ ${method} method NOT available`);
                }
            });
        } else {
            console.error('❌ window.financeApp is undefined');
        }
    } else {
        console.error('❌ Window object not available');
    }

    console.log('🔍 === FIN DEL DIAGNÓSTICO ===');
}

// Hacer la función global
if (typeof window !== 'undefined') {
    window.diagnoseFinanceApp = diagnoseFinanceApp;
}

// ==================== FUNCIONES GLOBALES PARA EVENTOS ====================

/**
 * Función global para mostrar detalles de categoría
 * @param {string} categoryId - ID de la categoría
 */
function showCategoryDetailsGlobal(categoryId) {
    console.log('🔍 showCategoryDetailsGlobal called with categoryId:', categoryId);

    if (window.financeApp && typeof window.financeApp.showCategoryDetails === 'function') {
        console.log('✅ Calling window.financeApp.showCategoryDetails');
        window.financeApp.showCategoryDetails(categoryId);
    } else {
        console.error('❌ window.financeApp.showCategoryDetails not available');
        if (window.financeApp) {
            console.log('⚠️ window.financeApp exists but showCategoryDetails method not found');
            console.log('Available methods:', Object.getOwnPropertyNames(Object.getPrototypeOf(window.financeApp)));
        } else {
            console.error('❌ window.financeApp is not defined');
        }
    }
}

/**
 * Función global para editar categoría
 * @param {string} categoryId - ID de la categoría
 */
function editCategoryGlobal(categoryId) {
    if (window.financeApp && typeof window.financeApp.editCategory === 'function') {
        window.financeApp.editCategory(categoryId);
    } else {
        if (window.financeApp) {
            window.financeApp.showNotification('Función de edición próximamente', 'info');
        }
    }
}

/**
 * Función global para eliminar categoría
 * @param {string} categoryId - ID de la categoría
 */
function deleteCategoryGlobal(categoryId) {
    if (window.financeApp && typeof window.financeApp.deleteCategory === 'function') {
        window.financeApp.deleteCategory(categoryId);
    } else {
        if (window.financeApp) {
            window.financeApp.showNotification('Función de eliminación próximamente', 'info');
        }
    }
}

// ==================== FUNCIONES GLOBALES PARA METAS ====================

/**
 * Función global para editar una meta
 * @param {string} goalId - ID de la meta a editar
 */
function editGoalGlobal(goalId) {
    if (window.financeApp) {
        window.financeApp.editGoal(goalId);
    }
}

/**
 * Función global para eliminar una meta
 * @param {string} goalId - ID de la meta a eliminar
 */
function deleteGoalGlobal(goalId) {
    if (window.financeApp) {
        window.financeApp.showNotification('Función de eliminación de metas próximamente', 'info');
    }
}

/**
 * Función global para agregar monto a una meta
 * @param {string} goalId - ID de la meta
 */
function addToGoalGlobal(goalId) {
    if (window.financeApp) {
        window.financeApp.showNotification('Función de agregar monto próximamente', 'info');
    }
}

// ==================== FUNCIONES GLOBALES PARA PRESUPUESTOS ====================

/**
 * Función global para editar un presupuesto
 * @param {string} budgetId - ID del presupuesto
 */
function editBudget(budgetId) {

    if (window.financeApp) {
        window.financeApp.showNotification('Función de edición de presupuestos próximamente', 'info');
    }
}

/**
 * Función global para eliminar un presupuesto
 * @param {string} budgetId - ID del presupuesto
 */
function deleteBudget(budgetId) {
  
    if (window.financeApp && confirm('¿Estás seguro de que quieres eliminar este presupuesto?')) {
        // Buscar y eliminar el presupuesto
        const budgetIndex = window.financeApp.budgets.findIndex(b => b.id === budgetId);
        if (budgetIndex !== -1) {
            window.financeApp.budgets.splice(budgetIndex, 1);
            // Guardar cambios
            localStorage.setItem('fede_life_budgets', JSON.stringify(window.financeApp.budgets));
            // Re-renderizar
            window.financeApp.renderBudgets();
            window.financeApp.showNotification('Presupuesto eliminado correctamente', 'success');
        }
    }
}

// Ya disponible globalmente como window.financeApp
// export default financeApp;
