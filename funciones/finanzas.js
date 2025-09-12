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

        // Gráficos modernos (de finanzas-simple)
        this.chart1 = null;
        this.chart2 = null;
        this.currentView = 'expenses';
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
        console.log(`📅 Período inicial: ${this.currentPeriod.month}/${this.currentPeriod.year}`);

        this.initializeApp();
    }

    /**
     * Inicializa la aplicación de finanzas
     */
    async initializeApp() {
        try {
            console.log('🚀 Inicializando sistema de finanzas unificado...');

            // Intentar cargar datos del backend público primero
            try {
                console.log('🔄 Intentando cargar datos desde backend público...');
                await this.loadDataFromBackend();
                console.log('✅ Datos cargados desde backend público');
            } catch (backendError) {
                console.warn('⚠️ Backend no disponible, cargando desde localStorage:', backendError.message);

                // Cargar datos del localStorage como fallback
                this.loadDataFromStorage();
            }

            // Inicializar categorías por defecto si no existen
            if (this.categories.length === 0) {
                this.initializeDefaultCategories();
            }

            // Cargar categorías del backend (de finanzas-simple)
            await this.loadCategoriesFromBackend();

            // Configurar event listeners
            this.setupEventListeners();

            // Inicializar gráficos
            this.initializeCharts();

            // Marcar como inicializado
            this.isInitialized = true;

            console.log('✅ Sistema de finanzas inicializado correctamente');

            // Renderizar datos iniciales
            this.renderDashboard();
            this.renderCategories();
            this.renderGoals();
            this.updateCharts();

        } catch (error) {
            console.error('❌ Error inicializando sistema de finanzas:', error);
        }
    }

    /**
     * Carga datos del backend público
     */
    async loadDataFromBackend() {
        try {
            console.log('🔄 Cargando transacciones desde backend público...');

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
                        date: new Date(transaction.date),
                        createdAt: transaction.createdAt ? new Date(transaction.createdAt) : new Date(),
                        updatedAt: transaction.updatedAt ? new Date(transaction.updatedAt) : new Date()
                    }));

                    console.log(`✅ Cargadas ${this.transactions.length} transacciones desde backend público`);

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
            console.error('❌ Error cargando datos desde backend:', error);
            throw error; // Re-lanzar para que el catch en initializeApp lo maneje
        }
    }

    /**
     * Carga datos del localStorage
     */
    loadDataFromStorage() {
        try {
            console.log('💾 Cargando datos desde localStorage...');

            // Cargar transacciones
            const storedTransactions = localStorage.getItem('fede_life_transactions');
            if (storedTransactions) {
                this.transactions = JSON.parse(storedTransactions);
                console.log(`✅ Cargadas ${this.transactions.length} transacciones`);

                // Verificar que las transacciones tengan todos los campos necesarios
                this.transactions.forEach((transaction, index) => {
                    if (!transaction.id) {
                        transaction.id = this.generateId();
                        console.log(`🔧 Generado ID faltante para transacción ${index}`);
                    }
                    if (!transaction.currency) {
                        transaction.currency = 'UYU'; // Valor por defecto
                        console.log(`🔧 Asignada moneda por defecto UYU a transacción ${index}`);
                    }
                    if (!transaction.category) {
                        transaction.category = 'Otros'; // Valor por defecto
                        console.log(`🔧 Asignada categoría por defecto "Otros" a transacción ${index}`);
                    }
                });
            } else {
                this.transactions = [];
                console.log('ℹ️ No hay transacciones guardadas, iniciando vacío');
            }

            // Cargar categorías
            const storedCategories = localStorage.getItem('fede_life_categories');
            if (storedCategories) {
                this.categories = JSON.parse(storedCategories);
                console.log(`✅ Cargadas ${this.categories.length} categorías desde localStorage`);

                // Verificar que las categorías tengan todos los campos necesarios
                this.categories.forEach((category, index) => {
                    if (!category.id || category.id === 'undefined' || category.id === '') {
                        category.id = this.generateId();
                        console.log(`🔧 Generado ID faltante para categoría ${category.name || `índice ${index}`}: ${category.id}`);
                    }
                    if (!category.type) {
                        category.type = 'expense'; // Valor por defecto
                        console.log(`🔧 Asignado tipo por defecto 'expense' a categoría ${category.name || `índice ${index}`}`);
                    }
                    if (!category.color) {
                        category.color = '#95a5a6'; // Color gris por defecto
                        console.log(`🔧 Asignado color por defecto a categoría ${category.name || `índice ${index}`}`);
                    }
                    if (!category.name) {
                        category.name = `Categoría ${index + 1}`;
                        console.log(`🔧 Asignado nombre por defecto a categoría índice ${index}`);
                    }
                });

                console.log('🔍 Verificación de categorías completada');
            } else {
                console.log('ℹ️ No hay categorías guardadas, inicializando por defecto');
                this.initializeDefaultCategories();
            }

            // Cargar presupuestos
            const storedBudgets = localStorage.getItem('fede_life_budgets');
            if (storedBudgets) {
                this.budgets = JSON.parse(storedBudgets);
                console.log(`✅ Cargados ${this.budgets.length} presupuestos`);
            } else {
                this.budgets = [];
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
     * Carga categorías del backend (de finanzas-simple)
     */
    async loadCategoriesFromBackend() {
        try {
            console.log('🔄 Intentando cargar categorías del backend...');
            const response = await fetch(`${FINANCE_API_CONFIG.baseUrl}${FINANCE_API_CONFIG.endpoints.categories}`);

            if (response.ok) {
                const result = await response.json();
                if (result.success && result.data && result.data.categories) {
                    this.categories = result.data.categories;

                    // Verificar que las categorías del backend tengan IDs válidos
                    this.categories.forEach((category, index) => {
                        if (!category.id || category.id === 'undefined' || category.id === '') {
                            category.id = this.generateId();
                            console.log(`🔧 Generado ID faltante para categoría del backend ${category.name || `índice ${index}`}: ${category.id}`);
                        }
                        if (!category.type) {
                            category.type = 'expense'; // Valor por defecto
                            console.log(`🔧 Asignado tipo por defecto 'expense' a categoría del backend ${category.name || `índice ${index}`}`);
                        }
                        if (!category.color) {
                            category.color = '#95a5a6'; // Color gris por defecto
                            console.log(`🔧 Asignado color por defecto a categoría del backend ${category.name || `índice ${index}`}`);
                        }
                        if (!category.name) {
                            category.name = `Categoría ${index + 1}`;
                            console.log(`🔧 Asignado nombre por defecto a categoría del backend índice ${index}`);
                        }
                    });

                    // Guardar en localStorage con IDs corregidos
                    localStorage.setItem('fede_life_categories', JSON.stringify(this.categories));
                    console.log(`✅ Categorías cargadas del backend y corregidas: ${this.categories.length}`);
                } else {
                    console.warn('⚠️ Respuesta del backend sin datos válidos, usando categorías locales');
                    this.initializeDefaultCategories();
                }
            } else {
                console.warn(`⚠️ Error del backend (${response.status}): ${response.statusText}`);
                console.log('📦 Usando categorías locales como fallback');
                this.initializeDefaultCategories();
            }
        } catch (error) {
            console.warn('⚠️ Error de conexión con el backend:', error.message);
            console.log('📦 Usando categorías locales como fallback');
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
        console.log('🏷️ Categorías por defecto inicializadas');
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

        // Cambio de tipo de transacción
        const transactionType = document.getElementById('transactionType');
        if (transactionType) {
            transactionType.addEventListener('change', () => this.populateTransactionCategories());
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
            diagnoseBtn.addEventListener('click', () => this.diagnoseOpenAIConnection());
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

        console.log('🎯 Event listeners configurados');
    }

    /**
     * Configura los event listeners para los botones del dashboard
     */
    setupDashboardEventListeners() {
        console.log('🔧 Configurando event listeners del dashboard...');

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

        console.log('✅ Event listeners del dashboard configurados');
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
            console.log('✅ Botón de limpiar descripciones configurado');
        }
    }

    /**
     * Muestra el modal para agregar una nueva transacción
     */
    showAddTransactionModal(type, currency) {
        console.log(`📝 Mostrando modal para agregar ${type} en ${currency}`);

        // Aquí puedes implementar el modal de agregar transacción
        // Por ahora, solo mostrar una notificación
        const currencyName = currency === 'UYU' ? 'pesos uruguayos' : 'dólares';
        const typeName = type === 'income' ? 'ingreso' : 'gasto';

        this.showNotification(`Funcionalidad para agregar ${typeName} en ${currencyName} próximamente`, 'info');
    }

    /**
     * Muestra el modal de transferencia entre monedas
     */
    showTransferModal(fromCurrency, toCurrency) {
        console.log(`💱 Mostrando modal de transferencia: ${fromCurrency} → ${toCurrency}`);

        const modal = this.createTransferModal(fromCurrency, toCurrency);
        document.body.appendChild(modal);

        // Hacer visible el modal
        modal.style.display = 'block';
        modal.style.zIndex = '10000';

        // Configurar event listeners del modal
        this.setupTransferModalEvents(modal, fromCurrency, toCurrency);

        console.log('✅ Modal de transferencia mostrado');
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
     * Realiza la transferencia entre monedas
     */
    performCurrencyTransfer(fromCurrency, toCurrency, amount, exchangeRate) {
        console.log(`💱 Realizando transferencia: ${amount} ${fromCurrency} → ${toCurrency} (tasa: ${exchangeRate})`);

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
                id: this.generateId(),
                type: 'expense',
                description: `Transferencia ${fromCurrency} → ${toCurrency}`,
                amount: amount,
                currency: fromCurrency,
                category: 'Transferencias',
                date: new Date().toISOString().split('T')[0],
                createdAt: new Date().toISOString()
            };

            // Crear transacción de ingreso para la moneda de destino
            const incomeTransaction = {
                id: this.generateId(),
                type: 'income',
                description: `Transferencia ${fromCurrency} → ${toCurrency}`,
                amount: equivalentAmount,
                currency: toCurrency,
                category: 'Transferencias',
                date: new Date().toISOString().split('T')[0],
                createdAt: new Date().toISOString()
            };

            // Agregar las transacciones
            this.transactions.push(expenseTransaction);
            this.transactions.push(incomeTransaction);

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

            console.log('✅ Transferencia completada exitosamente');

        } catch (error) {
            console.error('❌ Error en la transferencia:', error);
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

                console.log(`🔄 Cambiado a pestaña: ${targetTab}`);
            });
        });

        console.log('✅ Navegación por pestañas configurada');
    }

    /**
     * Sistema de pestañas anterior (para compatibilidad)
     */
    setupTabSystem() {
        this.setupTabNavigation();
    }

    /**
     * Calcula el resumen financiero
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

            console.log('📊 Dashboard renderizado correctamente');
        } catch (error) {
            console.error('❌ Error renderizando dashboard:', error);
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
            const paymentMethod = document.getElementById('paymentMethod').value;

            // Validaciones
            if (!type || !amount || !description || !category || !currency || !paymentMethod) {
                throw new Error('Todos los campos son requeridos');
            }

            // Crear transacción
            const transaction = {
                type,
                amount,
                description,
                category,
                date: new Date(date),
                currency,
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
                        console.warn('No se pudo parsear respuesta de error:', parseError);
                    }

                    throw new Error(`HTTP ${response.status}: ${errorMessage}`);
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
     * Maneja el envío del formulario de metas
     */
    handleGoalSubmit(event) {
        event.preventDefault();

        try {
            const name = document.getElementById('goalName').value.trim();
            const amountInput = document.getElementById('goalAmount').value;
            const deadlineInput = document.getElementById('goalDeadline').value;
            const currentSavedInput = document.getElementById('currentSaved').value;
            const description = document.getElementById('goalDescription').value?.trim();

            // Solo el nombre es requerido
            if (!name) {
                throw new Error('El nombre de la meta es requerido');
            }

            // Monto objetivo (opcional)
            const amount = amountInput ? parseFloat(amountInput) : null;

            // Fecha límite (opcional)
            const deadline = deadlineInput ? new Date(deadlineInput) : null;

            // Monto ya ahorrado (opcional)
            const currentSaved = currentSavedInput ? parseFloat(currentSavedInput) : 0;

            // Crear nueva meta
            const newGoal = {
                id: this.generateId(),
                name: name,
                amount: amount,
                deadline: deadline,
                currentSaved: currentSaved,
                description: description || '',
                createdAt: new Date(),
                status: 'active'
            };

            // Agregar al array de metas
            this.goals.push(newGoal);

            // Guardar en localStorage
            this.saveDataToStorage();

            console.log('🎯 Nueva meta creada y guardada:', newGoal);

            // Limpiar formulario
            const form = event.target;
            form.reset();
            this.setDefaultDates();

            // Mostrar metas actualizadas
            this.renderGoals();

            this.showNotification(`Meta "${name}" guardada correctamente`, 'success');

        } catch (error) {
            console.error('❌ Error creando meta:', error);
            this.showNotification(error.message, 'error');
        }
    }

    /**
     * Renderiza la lista de metas guardadas
     */
    renderGoals() {
        const goalsContainer = document.getElementById('goalsList');
        if (!goalsContainer) {
            console.warn('⚠️ Contenedor de metas no encontrado');
            return;
        }

        if (this.goals.length === 0) {
            goalsContainer.innerHTML = `
                <div class="no-goals">
                    <i class="fas fa-bullseye"></i>
                    <h3>No tienes metas guardadas</h3>
                    <p>Crea tu primera meta financiera usando el formulario de arriba</p>
                </div>
            `;
            return;
        }

        const goalsHTML = this.goals.map(goal => {
            const progress = goal.amount ? (goal.currentSaved / goal.amount) * 100 : 0;
            const progressClass = progress >= 100 ? 'completed' : progress >= 75 ? 'high' : progress >= 50 ? 'medium' : 'low';

            const deadlineDisplay = goal.deadline ? new Date(goal.deadline).toLocaleDateString('es-AR') : 'Sin fecha límite';
            const daysLeft = goal.deadline ? Math.ceil((new Date(goal.deadline) - new Date()) / (1000 * 60 * 60 * 24)) : null;
            const deadlineStatus = daysLeft !== null ? (daysLeft < 0 ? 'expired' : daysLeft <= 7 ? 'urgent' : 'normal') : 'no-deadline';

            return `
                <div class="goal-item" data-goal-id="${goal.id}">
                    <div class="goal-header">
                        <div class="goal-info">
                            <h3 class="goal-name">${goal.name}</h3>
                            <div class="goal-meta">
                                ${goal.amount ? `<span class="goal-amount">Objetivo: $${goal.amount.toLocaleString('es-AR')}</span>` : '<span class="goal-amount">Sin monto objetivo</span>'}
                                <span class="goal-deadline ${deadlineStatus}">📅 ${deadlineDisplay}</span>
                            </div>
                        </div>
                        <div class="goal-actions">
                            <button onclick="window.financeApp.editGoal('${goal.id}')" title="Editar meta">
                                <i class="fas fa-edit"></i>
                            </button>
                            <button onclick="window.financeApp.deleteGoal('${goal.id}')" title="Eliminar meta">
                                <i class="fas fa-trash"></i>
                            </button>
                        </div>
                    </div>

                    ${goal.amount ? `
                        <div class="goal-progress">
                            <div class="progress-info">
                                <span class="progress-text">Ahorrado: $${goal.currentSaved.toLocaleString('es-AR')} / $${goal.amount.toLocaleString('es-AR')}</span>
                                <span class="progress-percentage">${progress.toFixed(1)}%</span>
                            </div>
                            <div class="progress-bar">
                                <div class="progress-fill ${progressClass}" style="width: ${Math.min(progress, 100)}%"></div>
                            </div>
                        </div>
                    ` : ''}

                    ${goal.description ? `
                        <div class="goal-description">
                            <p>${goal.description}</p>
                        </div>
                    ` : ''}

                    ${daysLeft !== null && daysLeft >= 0 ? `
                        <div class="goal-time-left">
                            ${daysLeft === 0 ? '¡Hoy es la fecha límite!' : `Quedan ${daysLeft} día${daysLeft !== 1 ? 's' : ''}`}
                        </div>
                    ` : ''}
                </div>
            `;
        }).join('');

        goalsContainer.innerHTML = `
            <div class="goals-header">
                <h3><i class="fas fa-bullseye"></i> Tus Metas Financieras</h3>
                <span class="goals-count">${this.goals.length} meta${this.goals.length !== 1 ? 's' : ''}</span>
            </div>
            <div class="goals-grid">
                ${goalsHTML}
            </div>
        `;

        console.log(`🎯 Renderizadas ${this.goals.length} metas`);
    }

    /**
     * Función placeholder para editar meta
     */
    editGoal(goalId) {
        console.log(`✏️ Función editar meta ${goalId} - Implementar próximamente`);
        this.showNotification('Función de edición próximamente', 'info');
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
            console.log(`🗑️ Meta eliminada: ${goal.name}`);
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
            
            // Actualizar el dropdown de categorías para transacciones
            this.populateTransactionCategoryDropdown();

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
        const categoriesHTML = typeCategories.map(category => {
            const transactionCount = this.getTransactionCountByCategory(category.name);
            const totalAmount = this.getTotalAmountByCategory(category.name);

            console.log(`🏷️ Renderizando categoría: ${category.name} (ID: ${category.id})`);

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
                console.warn('⚠️ Dropdown de categorías no encontrado');
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

            console.log(`✅ Dropdown de categorías actualizado con ${this.categories.length} categorías`);
        } catch (error) {
            console.error('❌ Error poblando dropdown de categorías:', error);
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
        console.log(`📊 Mostrando detalles de categoría: ${categoryId}`);
        console.log(`🔍 Tipo de categoryId: ${typeof categoryId}`);
        console.log(`🔍 Longitud de categoryId: ${categoryId ? categoryId.length : 'N/A'}`);

        // Verificar que categoryId sea válido
        if (!categoryId || typeof categoryId !== 'string' || categoryId.trim() === '') {
            console.error('❌ categoryId inválido:', categoryId);
            this.showNotification('ID de categoría inválido', 'error');
            return;
        }

        // Verificar que tengamos categorías cargadas
        if (!this.categories || !Array.isArray(this.categories)) {
            console.error('❌ Array de categorías no válido:', this.categories);
            this.showNotification('Error: Categorías no cargadas', 'error');
            return;
        }

        console.log(`🔍 Buscando categoría ${categoryId} en ${this.categories.length} categorías`);
        console.log('🔍 IDs de categorías disponibles:', this.categories.map(c => c.id));

        const category = this.categories.find(c => c.id === categoryId);
        if (!category) {
            console.error('❌ Categoría no encontrada:', categoryId);
            console.log('🔍 Categorías disponibles:', this.categories.map(c => ({ id: c.id, name: c.name })));
            this.showNotification(`Categoría no encontrada: ${categoryId}`, 'error');
            return;
        }

        console.log('✅ Categoría encontrada:', category);

        // Obtener transacciones de esta categoría
        const categoryTransactions = this.transactions
            .filter(t => t.category === category.name)
            .sort((a, b) => new Date(b.date) - new Date(a.date));

        // Crear modal con detalles
        const modal = this.createCategoryDetailsModal(category, categoryTransactions);
        document.body.appendChild(modal);

        // Hacer visible el modal
        modal.style.display = 'block';
        modal.style.zIndex = '10000';

        console.log(`✅ Modal de detalles creado para ${category.name} con ${categoryTransactions.length} transacciones`);
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
     * Función placeholder para editar transacción (se puede implementar más tarde)
     */
    editTransaction(transactionId) {
        console.log(`✏️ Función editar transacción ${transactionId} - Implementar próximamente`);
        this.showNotification('Función de edición próximamente', 'info');
    }

    /**
     * Exporta los datos de una categoría
     */
    exportCategoryData(categoryId) {
        console.log(`📊 Exportando datos de categoría ${categoryId}`);

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

            console.log('📄 Iniciando procesamiento de PDF con pdfconverter.py...');

            // Verificar que el archivo PDF sea válido
            const file = csvFile.files[0];
            if (!file || (!file.type.includes('pdf') && !file.name.toLowerCase().endsWith('.pdf'))) {
                throw new Error('Por favor selecciona un archivo PDF válido');
            }

            if (file.size > 10 * 1024 * 1024) { // 10MB límite
                throw new Error('El archivo PDF es demasiado grande. Máximo 10MB permitido.');
            }

            // Analizar con pdfconverter.py enviando el archivo PDF completo al servidor
            console.log('🤖 Enviando archivo PDF al servidor para análisis...');
            console.log('🔑 Usando API Key configurada en el servidor (.env)');

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
                console.log('✅ Análisis completado:', analysisResult.data);

                // Procesar resultados del servidor
                // El servidor devuelve la estructura: { data: { analysis: { expenses: [...] } } }
                const analysisData = analysisResult.data.analysis || analysisResult.data;
                const processedData = this.processOpenAIResults(analysisData);

                const expensesCount = processedData.expenses ? processedData.expenses.length : 0;
                console.log(`📊 Resultados procesados: ${expensesCount} gastos encontrados`);

                // Alertas y estadísticas del procesamiento
                if (expensesCount === 0) {
                    console.warn('🚨 No se encontraron gastos en el CSV procesado');
                    console.log('💡 Posibles causas:');
                    console.log('   - El CSV puede no contener transacciones de gastos');
                    console.log('   - El formato del CSV puede ser incompatible');
                    console.log('   - Las columnas pueden no estar en el formato esperado');
                    console.log('   - Intenta con un CSV de estado de cuenta bancario');
                } else if (expensesCount < 20) {
                    console.warn(`⚠️ Solo se encontraron ${expensesCount} gastos`);
                    console.log('💡 Para documentos bancarios típicos se esperan más transacciones');
                    console.log('   - Verifica que el CSV contenga extractos bancarios');
                    console.log('   - Asegúrate de que contenga transacciones COMPRA');
                    console.log('   - El CSV debe tener el formato de Itaú o similar');
                } else if (expensesCount >= 50) {
                    console.log(`✅ Excelente! Se encontraron ${expensesCount} gastos - esto parece correcto para un documento bancario`);
                }

                // Mostrar estadísticas detalladas del procesamiento
                if (processedData.expenses && processedData.expenses.length > 0) {
                    const expensesByCurrency = processedData.expenses.reduce((acc, expense) => {
                        acc[expense.currency] = (acc[expense.currency] || 0) + 1;
                        return acc;
                    }, {});

                    console.log(`💰 Distribución por moneda:`, expensesByCurrency);

                    const expensesByCategory = processedData.expenses.reduce((acc, expense) => {
                        acc[expense.category] = (acc[expense.category] || 0) + 1;
                        return acc;
                    }, {});

                    console.log(`📂 Distribución por categoría:`, expensesByCategory);

                    // Calcular totales por moneda
                    const totalsByCurrency = processedData.expenses.reduce((acc, expense) => {
                        if (!acc[expense.currency]) acc[expense.currency] = 0;
                        acc[expense.currency] += expense.amount;
                        return acc;
                    }, {});

                    console.log(`💵 Totales por moneda:`, totalsByCurrency);
                }

                // Mostrar resultados
                this.displayCsvResults(processedData);
                extractedExpenses.style.display = 'block';

                this.showNotification(`CSV procesado exitosamente. ${processedData.expenses ? processedData.expenses.length : 0} gastos encontrados.`, 'success');
            } else {
                throw new Error(analysisResult?.error || 'Error en el análisis con OpenAI');
            }

        } catch (error) {
            console.error('❌ Error procesando PDF:', error);
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

                            console.log(`📄 PDF cargado: ${pdf.numPages} páginas`);

                            for (let i = 1; i <= pdf.numPages; i++) {
                                console.log(`📄 Procesando página ${i}/${pdf.numPages}`);

                                const page = await pdf.getPage(i);
                                const textContent = await page.getTextContent();

                                // Extraer texto preservando mejor el formato
                                const pageText = textContent.items
                                    .map(item => item.str)
                                    .filter(str => str.trim().length > 0) // Filtrar strings vacíos
                                    .join(' ')
                                    .replace(/\s+/g, ' ') // Normalizar espacios
                                    .trim();

                                console.log(`📄 Página ${i}: ${pageText.length} caracteres extraídos`);
                                fullText += pageText + '\n\n';

                                // Log de preview para debug
                                const preview = pageText.substring(0, 200);
                                console.log(`📄 Preview página ${i}: "${preview}..."`);
                            }

                            console.log(`📄 Texto total extraído: ${fullText.length} caracteres`);
                            console.log(`📄 Número aproximado de líneas: ${fullText.split('\n').length}`);

                            resolve(fullText);
                        } catch (error) {
                            console.error('❌ Error extrayendo texto del PDF:', error);
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

        console.log('🔄 Procesando resultados de OpenAI...');
        console.log('📋 Estructura de datos recibida:', JSON.stringify(data, null, 2));

        // Si la respuesta es un array de gastos directo
        if (Array.isArray(data)) {
            expenses = data;
            console.log(`📋 Respuesta es array directo: ${expenses.length} gastos`);
        }

        // Si la respuesta tiene estructura de análisis
        else if (data.expenses && Array.isArray(data.expenses)) {
            expenses = data.expenses;
            console.log(`📋 Respuesta tiene estructura expenses: ${expenses.length} gastos`);
        }

        // Si la respuesta es texto, intentar extraer gastos
        else if (typeof data === 'string') {
            console.log('📋 Respuesta es texto, intentando extracción manual...');
            expenses = this.extractExpensesFromText(data);
            console.log(`📋 Extracción de texto encontró: ${expenses.length} gastos`);
        }

        // Si no se reconoce la estructura
        else {
            console.warn('⚠️ Estructura de datos no reconocida para procesamiento de gastos');
            console.log('🔍 Propiedades disponibles:', Object.keys(data || {}));
        }

        // Siempre intentar extracción adicional, incluso si OpenAI encontró algunos gastos
        console.log(`🔄 Intentando extracción adicional para encontrar más gastos...`);

        if (this.lastExtractedPdfText) {
            const additionalExpenses = this.extractBankingExpenses(this.lastExtractedPdfText);

            if (additionalExpenses.length > 0) {
                console.log(`✅ Extracción adicional encontró ${additionalExpenses.length} gastos potenciales`);

                // Combinar resultados, evitando duplicados
                const combinedExpenses = this.combineExpenseResults(expenses, additionalExpenses);
                console.log(`📊 Total combinado: ${combinedExpenses.length} gastos únicos`);

                expenses = combinedExpenses;
            } else {
                console.log('⚠️ La extracción adicional no encontró gastos adicionales');
            }
        }

        // Validaciones finales
        if (!expenses || expenses.length === 0) {
            console.log('🚨 No se encontraron gastos ni con OpenAI ni con extracción manual');
            console.log('💡 Posibles causas:');
            console.log('   - El PDF puede contener imágenes en lugar de texto');
            console.log('   - El formato del PDF puede ser incompatible');
            console.log('   - El documento puede no contener extractos bancarios');
        } else if (expenses.length < 20) {
            console.log(`⚠️ Solo se encontraron ${expenses.length} gastos totales`);
            console.log('💡 Para documentos bancarios típicos se esperan más transacciones');
            console.log('   - Verifica que el PDF contenga extractos bancarios');
            console.log('   - Asegúrate de que el texto sea legible');
            console.log('   - Algunos PDFs pueden requerir OCR previo');
        } else if (expenses.length >= 50) {
            console.log(`✅ ¡Excelente! Se encontraron ${expenses.length} gastos - esto parece correcto para un documento bancario`);
        }

        console.log(`📊 Gastos finales antes de mejora: ${expenses.length}`);

        // Procesar y mejorar los gastos extraídos
        expenses = this.enhanceExtractedExpenses(expenses);

        console.log(`✅ Gastos finales después de mejora: ${expenses.length}`);
        console.log('📋 Resumen de gastos encontrados:', expenses.map(exp => `${exp.description}: $${exp.amount}`).slice(0, 5));

        return { expenses };
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
            console.warn('Error formateando fecha:', error);
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
        console.log('🔍 Intentando extracción de respaldo del texto completo...');

        const expenses = [];

        try {
            // Usar el texto completo almacenado del PDF
            if (!this.lastExtractedPdfText) {
                console.log('⚠️ No hay texto completo disponible para respaldo');
                return expenses;
            }

            console.log(`📄 Usando texto completo almacenado (${this.lastExtractedPdfText.length} caracteres)`);

            // Usar la función especializada de extracción bancaria
            const bankingExpenses = this.extractBankingExpenses(this.lastExtractedPdfText);

            if (bankingExpenses.length > 0) {
                console.log(`✅ Extracción bancaria encontró ${bankingExpenses.length} gastos adicionales`);
                expenses.push(...bankingExpenses);
            } else {
                console.log('⚠️ La extracción bancaria tampoco encontró gastos');
                console.log('💡 Posibles soluciones:');
                console.log('   - El PDF puede contener imágenes en lugar de texto');
                console.log('   - El formato del PDF puede ser incompatible');
                console.log('   - Intenta con un PDF diferente');
            }

            return expenses;
        } catch (error) {
            console.error('❌ Error en extracción de respaldo:', error);
            return expenses;
        }
    }

    /**
     * Función mejorada para extraer gastos de texto bancario
     */
    extractBankingExpenses(text) {
        console.log('🏦 Iniciando extracción especializada de gastos bancarios...');

        const expenses = [];
        const lines = text.split('\n');

        console.log(`📄 Procesando ${lines.length} líneas de texto bancario`);

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

                                console.log(`💰 Encontrado gasto: ${description} - ${this.detectCurrencyFromLine(cleanLine)}${amount}`);
                            }
                        }
                    }
                }
            });
        });

        console.log(`📊 Estadísticas de extracción:`);
        console.log(`  - Líneas procesadas: ${processedLines}`);
        console.log(`  - Montos potenciales encontrados: ${potentialAmounts}`);
        console.log(`  - Gastos extraídos: ${expenses.length}`);

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
            console.warn(`Error parseando monto: ${amountStr}`, error);
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
                    console.log(`➕ Agregado gasto adicional: ${manualExpense.description} - ${manualExpense.currency}${manualExpense.amount}`);
                } else {
                    console.log(`⚠️ Omitido gasto duplicado: ${manualExpense.description}`);
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

        if (data.expenses && data.expenses.length > 0) {
            // Generar opciones de categorías
            const categoryOptions = this.generateCategoryOptions();

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
                               data-date="${expense.date || ''}">
                        <div class="expense-info">
                            <div class="expense-header">
                                <span class="expense-description">${expense.description}</span>
                                <span class="expense-amount">${symbol}${expense.amount.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                            </div>
                            <div class="expense-category-selector">
                                <label>Categoría:</label>
                                <select class="expense-category-dropdown" data-index="${index}" onchange="window.financeApp.updateExpenseCategory(${index}, this.value)">
                                    ${categoryOptions}
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

            expensesList.innerHTML = expensesHTML;

            // Establecer valores por defecto en los dropdowns
            data.expenses.forEach((expense, index) => {
                const dropdown = expensesList.querySelector(`select[data-index="${index}"]`);
                if (dropdown) {
                    dropdown.value = expense.category || 'Otros';
                }
            });

            // Inicializar fecha por defecto para transacciones del CSV
            this.initializeCsvDateSelector();

            // Agregar funcionalidad para agregar gastos seleccionados
            this.setupExpenseSelection();
        } else {
            expensesList.innerHTML = '<p>No se encontraron gastos en el CSV</p>';
        }
    }

    /**
     * Genera las opciones de categorías para el dropdown
     */
    generateCategoryOptions() {
        const categories = [
            'Alimentación',
            'Transporte',
            'Entretenimiento',
            'Salud',
            'Educación',
            'Vivienda',
            'Ropa',
            'Servicios',
            'Otros'
        ];

        return categories.map(category =>
            `<option value="${category}">${category}</option>`
        ).join('');
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
                console.log('📅 Fecha de CSV cambiada a:', dateInput.value);
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
                console.warn('Fecha seleccionada inválida, usando fecha actual');
            }
        }
        return new Date();
    }

    /**
     * Diagnostica el estado de la conexión con OpenAI
     */
    async diagnoseOpenAIConnection() {
        try {
            console.log('🔍 Iniciando diagnóstico de OpenAI...');

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

            console.log(`🔑 API Key encontrada en: ${apiKeySource}`);

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
                console.log('✅ Diagnóstico completado: OpenAI funcionando correctamente');
                this.showNotification('✅ OpenAI funcionando correctamente', 'success');
                return true;
            } else {
                console.error('❌ Diagnóstico fallido:', healthData.data.message);
                this.showNotification(`❌ Error en OpenAI: ${healthData.data.message}`, 'error');
                return false;
            }

        } catch (error) {
            console.error('❌ Error en diagnóstico:', error.message);
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

            // Usar el endpoint del servidor para chat con IA
            console.log('💬 Enviando mensaje al servidor...');

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
            console.error('Error obteniendo respuesta de IA:', error);

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
            console.warn('⚠️ No se pudo cargar config-local.js, intentando localStorage...');
            apiKey = localStorage.getItem('openai_api_key');
            if (apiKey && apiKey !== 'sk-proj-your-openai-api-key-here') {
                apiKeySource = 'localStorage';
            } else {
                throw new Error('API Key no configurada');
            }
        }

        console.log(`🤖 Usando API Key de ${apiKeySource}`);

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
                        console.log(`📝 Auto-completado comentario para categoría "Otro": "${description}"`);
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
            console.log(`💱 Cambiada moneda del gasto ${index} a: ${newCurrency}`);

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
        console.log('🔄 Refrescando todos los datos para el período:', this.currentPeriod);
        console.log('📊 Estado actual de transacciones:', this.transactions.length);

        // NO recargar desde localStorage aquí porque ya tenemos los datos actualizados en memoria
        // Solo actualizar la interfaz con los datos que ya tenemos
        console.log('🔄 Actualizando interfaz con datos en memoria...');

        this.renderDashboard();
        this.renderTransactions();
        this.updateCharts();
        console.log('✅ Todos los datos refrescados correctamente');
    }

    /**
     * Refresca todos los datos recargando desde localStorage (para casos especiales)
     */
    refreshAllDataWithReload() {
        console.log('🔄 Refrescando todos los datos con recarga desde localStorage...');

        // Recargar datos del localStorage
        console.log('💾 Recargando datos desde localStorage...');
        this.loadDataFromStorage();

        // Actualizar interfaz
        this.renderDashboard();
        this.renderTransactions();
        this.updateCharts();
        console.log('✅ Datos recargados y refrescados correctamente');
    }


    /**
     * Configura la selección de gastos para agregar
     */
    setupExpenseSelection() {
        console.log('🔧 Configurando selección de gastos...');

        const checkboxes = document.querySelectorAll('.expense-checkbox');
        const addSelectedBtn = document.getElementById('addSelectedExpenses');
        const selectAllBtn = document.getElementById('selectAllExpenses');

        console.log(`📋 Encontrados ${checkboxes.length} checkboxes, botón agregar: ${addSelectedBtn ? '✅' : '❌'}, botón seleccionar todos: ${selectAllBtn ? '✅' : '❌'}`);

        if (addSelectedBtn) {
            // Remover event listeners previos para evitar duplicados
            addSelectedBtn.removeEventListener('click', this.handleAddSelectedExpenses);
            addSelectedBtn.addEventListener('click', () => this.handleAddSelectedExpenses(checkboxes));
            console.log('✅ Event listener configurado para botón "Agregar Seleccionados"');

            // Configurar actualización del estado del botón cuando cambian los checkboxes
            this.setupCheckboxStateTracking(checkboxes, addSelectedBtn);
        } else {
            console.warn('⚠️ Botón "addSelectedExpenses" no encontrado');
        }

        if (selectAllBtn) {
            selectAllBtn.addEventListener('click', () => this.handleSelectAllExpenses(checkboxes, addSelectedBtn));
            console.log('✅ Event listener configurado para botón "Seleccionar Todos"');
        } else {
            console.warn('⚠️ Botón "selectAllExpenses" no encontrado');
        }

        // Configurar event listeners para checkboxes individuales
        checkboxes.forEach((checkbox, index) => {
            checkbox.addEventListener('change', () => {
                console.log(`☑️ Checkbox ${index} cambió: ${checkbox.checked ? 'marcado' : 'desmarcado'}`);
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
        console.log('🔄 Seleccionando todos los gastos...');

        const allChecked = Array.from(checkboxes).every(cb => cb.checked);
        const newState = !allChecked; // Si todos están marcados, desmarcar; si no, marcar todos

        checkboxes.forEach((checkbox, index) => {
            checkbox.checked = newState;
            console.log(`☑️ Checkbox ${index}: ${newState ? 'marcado' : 'desmarcado'}`);
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

        console.log(`✅ ${newState ? 'Seleccionados' : 'Deseleccionados'} todos los gastos`);
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

        console.log(`🔄 Estado del botón actualizado: ${hasSelections ? 'habilitado' : 'deshabilitado'} (${checkedBoxes.length} seleccionados)`);
    }

    /**
     * Maneja el evento de agregar gastos seleccionados
     */
    handleAddSelectedExpenses(checkboxes) {
        console.log('🖱️ Botón "Agregar Seleccionados" presionado');

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
                                    console.log(`📝 Usando descripción como comentario para "${cb.dataset.description}"`);
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
                                    transactionDate = this.getCsvSelectedDate();
                                }
                            } catch (error) {
                                console.warn('Fecha inválida en dataset, usando fecha seleccionada:', cb.dataset.date);
                                transactionDate = this.getPdfSelectedDate();
                            }
                        } else {
                            // No hay fecha en el PDF, usar fecha seleccionada por el usuario
                            transactionDate = this.getPdfSelectedDate();
                        }

                        console.log(`📝 Procesando gasto ${index}: ${cb.dataset.description} - ${cb.dataset.amount} ${cb.dataset.currency} - Categoría: ${category}`);

                        return {
                            type: 'expense',
                            amount: parseFloat(cb.dataset.amount),
                            description: cb.dataset.description,
                            category: category,
                            currency: cb.dataset.currency || 'UYU',
                            date: transactionDate,
                            paymentMethod: 'pdf',
                            comments: comments
                        };
                    });

                console.log(`📊 ${selectedExpenses.length} gastos seleccionados para agregar`);

                if (selectedExpenses.length > 0) {
                    // LIMPIEZA AUTOMÁTICA DE DESCRIPCIONES
                    console.log('🧹 Aplicando limpieza automática de descripciones...');
                    const cleanedExpenses = this.cleanPdfDescriptions(selectedExpenses);
                    console.log(`✅ Limpieza completada: ${cleanedExpenses.length} gastos procesados`);

                    console.log('📝 Agregando gastos al array de transacciones...');
                    console.log('📊 Total de transacciones antes:', this.transactions.length);

                    cleanedExpenses.forEach(expense => {
                        expense.id = this.generateId();
                        expense.createdAt = new Date();
                        this.transactions.push(expense);
                        console.log(`✅ Agregado: ${expense.description} - ${expense.currency}${expense.amount} - Fecha: ${expense.date}`);
                    });

                    console.log('📊 Total de transacciones después:', this.transactions.length);

                    this.saveDataToStorage();

                    // Forzar actualización inmediata de la lista
                    console.log('🔄 Forzando actualización de la interfaz...');
                    this.renderTransactions();
                    this.renderDashboard();
                    this.updateCharts();

                    this.showNotification(`${selectedExpenses.length} gastos agregados correctamente`, 'success');
                    console.log('🎉 Gastos agregados exitosamente');
                } else {
                    this.showNotification('Selecciona al menos un gasto para agregar', 'error');
                    console.log('⚠️ No se seleccionaron gastos para agregar');
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
        console.log('📊 Actualizando datos de gráficos para período:', this.currentPeriod);
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

            console.log('✅ Filtro de transacciones configurado correctamente');
        }
    }

    /**
     * Maneja el cambio del filtro de transacciones
     */
    handleFilterChange() {
        console.log('🔄 Filtro cambiado, refrescando transacciones...');
        this.renderTransactions();
        console.log('✅ Transacciones refrescadas después del cambio de filtro');
    }

    /**
     * Configura la funcionalidad de selección múltiple
     */
    setupBulkSelection() {
        console.log('🔧 Configurando selección múltiple...');

        const checkboxes = document.querySelectorAll('.transaction-select-checkbox');
        const selectAllBtn = document.getElementById('selectAllBtn');
        const deselectAllBtn = document.getElementById('deselectAllBtn');
        const deleteSelectedBtn = document.getElementById('deleteSelectedBtn');
        const bulkActionsBar = document.getElementById('bulkActionsBar');
        const selectedCount = document.getElementById('selectedCount');

        console.log(`📋 Encontrados ${checkboxes.length} checkboxes`);

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

        console.log('✅ Selección múltiple configurada');
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

        console.log(`📊 ${checkedCount} transacción(es) seleccionada(s)`);
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
        console.log('✅ Todas las transacciones seleccionadas');
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
        console.log('✅ Todas las transacciones deseleccionadas');
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

        console.log(`🗑️ Eliminando ${selectedIds.length} transacción(es) seleccionada(s):`, selectedIds);

        // Mostrar confirmación
        const confirmMessage = `¿Estás seguro de que deseas eliminar ${selectedIds.length} transacción(es) seleccionada(s)? Esta acción no se puede deshacer.`;

        if (confirm(confirmMessage)) {
            let deletedCount = 0;

            selectedIds.forEach(transactionId => {
                try {
                    this.deleteTransaction(transactionId);
                    deletedCount++;
                } catch (error) {
                    console.error(`❌ Error eliminando transacción ${transactionId}:`, error);
                }
            });

            this.showNotification(`${deletedCount} transacción(es) eliminada(s) correctamente`, 'success');
            console.log(`✅ ${deletedCount} transacción(es) eliminada(s) correctamente`);

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

        console.log('🔍 Aplicando filtro simple...');
        console.log('📊 Transacciones del período actual:', transactions.length);

        if (!simpleFilter || !simpleFilter.value || simpleFilter.value === 'all') {
            // Mostrar todas las transacciones ordenadas por fecha
            console.log('📋 Filtro: Todas las transacciones');
            return transactions.sort((a, b) => new Date(b.date) - new Date(a.date));
        }

        switch (simpleFilter.value) {
            case 'income':
                transactions = transactions.filter(t => t.type === 'income');
                console.log('💰 Filtro: Solo ingresos - Resultado:', transactions.length);
                break;
            case 'expense':
                transactions = transactions.filter(t => t.type === 'expense');
                console.log('💸 Filtro: Solo gastos - Resultado:', transactions.length);
                break;
            case 'recent':
                // Ordenar por fecha y tomar las últimas 10
                transactions = transactions
                    .sort((a, b) => new Date(b.date) - new Date(a.date))
                    .slice(0, 10);
                console.log('🕐 Filtro: Últimas 10 - Resultado:', transactions.length);
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
            console.error('❌ No se encontró el contenedor transactionsList');
            return;
        }

        console.log('📋 Renderizando transacciones...');
        console.log('📊 Total de transacciones en memoria:', this.transactions.length);
        console.log('📋 IDs de transacciones disponibles:', this.transactions.map(t => t.id));

        const filteredTransactions = this.getSimpleFilteredTransactions();
        console.log('🔍 Transacciones después del filtro simple:', filteredTransactions.length);
        console.log('📋 IDs de transacciones filtradas:', filteredTransactions.map(t => t.id));

        if (filteredTransactions.length === 0) {
            container.innerHTML = '<p class="no-data">No hay transacciones para mostrar</p>';
            console.log('⚠️ No hay transacciones para mostrar después del filtro');
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
        console.log('📝 HTML actualizado en transactionsList');
        console.log('🔗 HTML generado:', transactionsHTML.substring(0, 200) + '...');

        // Configurar event listeners para los botones de eliminación
        this.setupDeleteTransactionButtons();
        console.log('✅ Event listeners configurados para botones de eliminación');

        // Configurar selección múltiple
        this.setupBulkSelection();
        console.log('✅ Selección múltiple configurada');

        console.log('🎉 Renderizado de transacciones completado');
    }

    /**
     * Configura los event listeners para los botones de eliminación
     */
    setupDeleteTransactionButtons() {
        console.log('🔧 Iniciando configuración de botones de eliminación...');

        // Limpiar event listeners previos
        document.querySelectorAll('.delete-transaction-btn').forEach(button => {
            button.removeEventListener('click', this.handleDeleteClick);
        });

        const deleteButtons = document.querySelectorAll('.delete-transaction-btn');
        console.log(`🔧 Encontrados ${deleteButtons.length} botones de eliminación`);

        // Usar bind para mantener el contexto correcto
        this.handleDeleteClick = this.handleDeleteClick.bind(this);

        deleteButtons.forEach((button, index) => {
            const transactionId = button.getAttribute('data-transaction-id');
            console.log(`🔗 Configurando botón ${index + 1}: ID = ${transactionId}`);
            button.addEventListener('click', this.handleDeleteClick);
        });

        console.log('✅ Configuración de botones de eliminación completada');
    }

    /**
     * Maneja el clic en el botón de eliminar
     */
    handleDeleteClick(e) {
        e.preventDefault();
        e.stopPropagation();

        const button = e.currentTarget;
        const transactionId = button.getAttribute('data-transaction-id');

        console.log(`🗑️ Solicitando eliminación de transacción: ${transactionId}`);
        console.log('🔍 Contexto this:', this);
        console.log('🔍 Botón clickeado:', button);
        console.log('🔍 ID de transacción:', transactionId);

        if (transactionId) {
            console.log('✅ ID válido, mostrando modal de confirmación...');
            this.showDeleteConfirmationModal(transactionId);
        } else {
            console.error('❌ No se encontró ID de transacción en el botón');
            console.log('🔍 Atributos del botón:', button.attributes);
        }
    }

    /**
     * Muestra el modal de confirmación para eliminar una transacción
     */
    showDeleteConfirmationModal(transactionId) {
        console.log(`📋 Mostrando modal de confirmación para: ${transactionId}`);

        const transaction = this.transactions.find(t => t.id === transactionId);
        if (!transaction) {
            console.error('❌ Transacción no encontrada:', transactionId);
            console.log('📋 Transacciones disponibles:', this.transactions.map(t => ({ id: t.id, desc: t.description })));
            return;
        }

        console.log('✅ Transacción encontrada:', transaction);

        const modal = this.createDeleteConfirmationModal(transaction);
        console.log('📝 Modal creado:', modal);

        // Verificar que el modal tenga los elementos correctos antes de agregarlo
        const confirmBtn = modal.querySelector('.confirm-delete-btn');
        const cancelBtn = modal.querySelector('.cancel-delete-btn');
        console.log('🔍 Verificación antes de agregar modal:');
        console.log('🔍 - Confirm button encontrado:', !!confirmBtn);
        console.log('🔍 - Cancel button encontrado:', !!cancelBtn);
        console.log('🔍 - Modal HTML:', modal.innerHTML.substring(0, 200) + '...');

        document.body.appendChild(modal);
        console.log('📋 Modal agregado al DOM');

        // HACER VISIBLE EL MODAL - ¡ESTO ES CRÍTICO!
        modal.style.display = 'block';
        modal.style.zIndex = '10000'; // Asegurar que esté por encima de otros elementos
        console.log('👁️ Modal hecho visible (display: block)');
        console.log('👁️ Modal debería ser visible ahora en la pantalla');
        console.log('👁️ Z-index establecido en 10000 para asegurar visibilidad');

        // Verificar que los botones estén presentes después de agregar al DOM
        const confirmBtnAfter = modal.querySelector('.confirm-delete-btn');
        const cancelBtnAfter = modal.querySelector('.cancel-delete-btn');
        console.log('🔍 Verificación después de agregar al DOM:');
        console.log('🔍 - Confirm button encontrado:', !!confirmBtnAfter);
        console.log('🔍 - Cancel button encontrado:', !!cancelBtnAfter);
        console.log('🔍 - Modal está visible:', modal.style.display === 'block');

        this.setupDeleteConfirmationModalEvents(modal, transactionId);
        console.log('🎯 Event listeners configurados para el modal');
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
        console.log(`🔍 Filtrando transacciones para ${type === 'monthly' ? `mes ${month}/${year}` : `año ${year}`}`);

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

        console.log(`📊 Filtradas ${filteredTransactions.length} transacciones para ${type === 'monthly' ? `mes ${month}/${year}` : `año ${year}`}`);
        return filteredTransactions;
    }

    /**
     * Configura los event listeners del modal de confirmación
     */
    setupDeleteConfirmationModalEvents(modal, transactionId) {
        console.log('🔧 Configurando event listeners del modal...');

        const cancelBtn = modal.querySelector('.cancel-delete-btn');
        const confirmBtn = modal.querySelector('.confirm-delete-btn');
        const closeBtn = modal.querySelector('.modal-header .close');

        console.log('🔍 Botones encontrados:', {
            cancel: !!cancelBtn,
            confirm: !!confirmBtn,
            close: !!closeBtn
        });

        const closeModal = () => {
            console.log('🚪 Cerrando modal...');
            if (modal) {
                modal.style.display = 'none';
                console.log('✅ Modal ocultado (display: none)');
                // Remover del DOM después de un pequeño delay para que la transición sea visible
                setTimeout(() => {
                    if (modal && modal.parentNode) {
                        modal.parentNode.removeChild(modal);
                        console.log('✅ Modal removido del DOM');
                    }
                }, 300);
            }
        };

        if (cancelBtn) {
            cancelBtn.addEventListener('click', () => {
                console.log('❌ Cancelando eliminación');
                closeModal();
            });
            console.log('✅ Event listener configurado para botón cancelar');
        }

        if (confirmBtn) {
            // Agregar un event listener adicional para debugging
            confirmBtn.addEventListener('mousedown', () => {
                console.log('🖱️ MOUSEDOWN detectado en botón confirmar');
            });

            confirmBtn.addEventListener('click', (e) => {
                console.log(`✅ Confirmando eliminación de: ${transactionId}`);
                console.log('🔍 Evento click en botón confirmar:', e);
                console.log('🔍 Target del evento:', e.target);
                console.log('🔍 Current target del evento:', e.currentTarget);
                console.log('🔍 Tipo de evento:', e.type);
                console.log('🔍 Coordenadas del click:', { clientX: e.clientX, clientY: e.clientY });

                try {
                    console.log('🔍 Contexto this en event listener:', this);
                    console.log('🔍 Tipo de this:', typeof this);
                    console.log('🔍 Es instancia de FinanceApp:', this.constructor.name);

                    if (typeof this.deleteTransaction !== 'function') {
                        console.error('❌ this.deleteTransaction no es una función:', this.deleteTransaction);
                        throw new Error('Función deleteTransaction no encontrada');
                    }

                    this.deleteTransaction(transactionId);
                    console.log('✅ deleteTransaction ejecutada correctamente');
                } catch (error) {
                    console.error('❌ Error ejecutando deleteTransaction:', error);
                    console.error('❌ Stack trace:', error.stack);
                    this.showNotification('Error: No se pudo eliminar la transacción', 'error');
                }

                // Cerrar modal después de la eliminación
                closeModal();
                console.log('✅ Modal cerrado después de eliminación');
            });
            console.log('✅ Event listener configurado para botón confirmar');
            console.log('🔍 Botón confirmar encontrado:', confirmBtn);
            console.log('🔍 Texto del botón confirmar:', confirmBtn.textContent);
        }

        if (closeBtn) closeBtn.addEventListener('click', closeModal);

        // Cerrar al hacer clic fuera del modal
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                console.log('👆 Clic fuera del modal, cerrando...');
                closeModal();
            }
        });

        // Cerrar con tecla Escape
        document.addEventListener('keydown', function escapeHandler(e) {
            if (e.key === 'Escape') {
                console.log('⌨️ Tecla Escape presionada, cerrando modal...');
                closeModal();
                document.removeEventListener('keydown', escapeHandler);
            }
        });

        console.log('🎯 Configuración completa de event listeners del modal');
    }

    /**
     * Elimina una transacción
     */
    deleteTransaction(transactionId) {
        console.log(`🗑️ ===== INICIANDO ELIMINACIÓN DE TRANSACCIÓN =====`);
        console.log(`🗑️ ID de transacción a eliminar: ${transactionId}`);
        console.log(`📊 Total de transacciones antes: ${this.transactions.length}`);
        console.log(`🔍 Tipo de transactionId: ${typeof transactionId}`);
        console.log(`🔍 Longitud de transactionId: ${transactionId ? transactionId.length : 'N/A'}`);
        console.log(`🔍 Contexto this en deleteTransaction:`, this);

        // Verificar que transactionId sea válido
        if (!transactionId || typeof transactionId !== 'string') {
            console.error('❌ ID de transacción inválido:', transactionId);
            this.showNotification('Error: ID de transacción inválido', 'error');
            return;
        }

        // Verificar que tengamos transacciones cargadas
        if (!this.transactions || !Array.isArray(this.transactions)) {
            console.error('❌ Array de transacciones no válido:', this.transactions);
            this.showNotification('Error: Datos de transacciones corruptos', 'error');
            return;
        }

        // Encontrar el índice de la transacción
        const transactionIndex = this.transactions.findIndex(t => t && t.id === transactionId);

        if (transactionIndex === -1) {
            console.error('❌ Transacción no encontrada para eliminar:', transactionId);
            console.log('📋 IDs de transacciones disponibles:', this.transactions.filter(t => t && t.id).map(t => t.id));
            console.log('📋 Transacciones sin ID:', this.transactions.filter(t => !t || !t.id).length);
            this.showNotification('Error: Transacción no encontrada', 'error');
            return;
        }

        const transaction = this.transactions[transactionIndex];
        console.log(`📝 Eliminando: ${transaction.description} - ${transaction.type === 'income' ? '+' : '-'}${transaction.currency === 'UYU' ? '$U' : '$'}${transaction.amount}`);

        // Eliminar la transacción del array
        this.transactions.splice(transactionIndex, 1);
        console.log(`📊 Total de transacciones después: ${this.transactions.length}`);

        // Verificar que la transacción fue eliminada
        const stillExists = this.transactions.find(t => t.id === transactionId);
        if (stillExists) {
            console.error('❌ ERROR: La transacción aún existe después de eliminarla');
            this.showNotification('Error: No se pudo eliminar la transacción', 'error');
            return;
        }

        // Guardar en localStorage
        console.log('💾 Guardando cambios en localStorage...');
        this.saveDataToStorage();

        // Verificar que se guardó correctamente
        try {
            const saved = localStorage.getItem('fede_life_transactions');
            const savedTransactions = JSON.parse(saved);
            console.log(`💾 Verificación: ${savedTransactions.length} transacciones guardadas`);
        } catch (error) {
            console.error('❌ Error verificando guardado:', error);
        }

        // Actualizar la interfaz
        console.log('🔄 Actualizando interfaz...');
        this.refreshAllData();

        // Mostrar notificación de éxito
        this.showNotification(`Transacción eliminada: ${transaction.description}`, 'success');

        console.log('✅ Transacción eliminada exitosamente');
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
        console.log('🧪 === PRUEBA DE FUNCIONAMIENTO DE ELIMINACIÓN ===');

        // Verificar que existan transacciones
        console.log(`📊 Total de transacciones: ${this.transactions.length}`);
        if (this.transactions.length === 0) {
            console.log('⚠️ No hay transacciones para probar');
            return;
        }

        // Mostrar las primeras 3 transacciones disponibles
        console.log('📋 Transacciones disponibles para prueba:');
        this.transactions.slice(0, 3).forEach((t, i) => {
            console.log(`${i + 1}. ID: ${t.id} - ${t.description} (${t.type})`);
        });

        // Verificar que las funciones existan
        console.log('🔧 Verificación de funciones:');
        console.log('- deleteTransaction existe:', typeof this.deleteTransaction === 'function');
        console.log('- showDeleteConfirmationModal existe:', typeof this.showDeleteConfirmationModal === 'function');
        console.log('- refreshAllData existe:', typeof this.refreshAllData === 'function');
        console.log('- saveDataToStorage existe:', typeof this.saveDataToStorage === 'function');

        // Verificar el contexto
        console.log('🔍 Contexto this:', this.constructor.name);

        console.log('✅ Prueba completada. Para probar la eliminación real, haz clic en el botón de eliminar de cualquier transacción.');
    }

    /**
     * Función de prueba para verificar que el modal se muestra correctamente
     * Ejecutar desde la consola: financeApp.testModalVisibility()
     */
    testModalVisibility() {
        console.log('🧪 === PRUEBA DE VISIBILIDAD DEL MODAL ===');

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

        console.log('👁️ Modal de prueba creado y hecho visible');
        console.log('🔍 Si puedes ver este modal en pantalla, el sistema funciona correctamente');

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
                console.log('✅ Modal de prueba cerrado');
            });
        }

        console.log('🎯 Si el modal es visible, haz clic en "Cerrar" para continuar');
    }

    /**
     * Función de prueba para verificar las categorías
     * Ejecutar desde la consola: financeApp.testCategoriesFunctionality()
     */
    testCategoriesFunctionality() {
        console.log('🧪 === PRUEBA DE FUNCIONALIDAD DE CATEGORÍAS ===');

        console.log(`📊 Total de categorías: ${this.categories.length}`);
        console.log(`📊 Total de transacciones: ${this.transactions.length}`);

        if (this.categories.length === 0) {
            console.log('⚠️ No hay categorías cargadas');
            return;
        }

        console.log('📋 Categorías disponibles:');
        this.categories.forEach((cat, i) => {
            const count = this.getTransactionCountByCategory(cat.name);
            const total = this.getTotalAmountByCategory(cat.name);
            console.log(`${i + 1}. ${cat.name} (ID: ${cat.id}) - ${count} transacción(es) - Total: ${total}`);
        });

        console.log('🔧 Verificación de funciones:');
        console.log('- showCategoryDetails existe:', typeof this.showCategoryDetails === 'function');
        console.log('- showCategoryDetailsGlobal existe:', typeof window.showCategoryDetailsGlobal === 'function');
        console.log('- window.financeApp existe:', !!window.financeApp);

        console.log('✅ Prueba completada. Para probar hacer clic en cualquier categoría.');
    }

    /**
     * Función para limpiar y regenerar categorías con IDs válidos
     * Ejecutar desde la consola: financeApp.resetCategoriesWithValidIds()
     */
    resetCategoriesWithValidIds() {
        console.log('🔄 === LIMPIANDO Y REGENERANDO CATEGORÍAS ===');

        try {
            // Forzar recarga de categorías por defecto
            this.initializeDefaultCategories();

            // Guardar explícitamente
            this.saveDataToStorage();

            // Re-renderizar
            this.renderCategories();

            console.log('✅ Categorías regeneradas con IDs válidos');
            console.log('🔍 Nuevas categorías:', this.categories.map(c => ({ id: c.id, name: c.name })));

            // Mostrar mensaje al usuario
            this.showNotification('Categorías regeneradas correctamente', 'success');

        } catch (error) {
            console.error('❌ Error regenerando categorías:', error);
            this.showNotification('Error al regenerar categorías', 'error');
        }
    }

    /**
     * Función para limpiar completamente las categorías del localStorage
     * Ejecutar desde la consola: financeApp.clearCategoriesStorage()
     */
    clearCategoriesStorage() {
        console.log('🗑️ === LIMPIANDO CATEGORÍAS DEL LOCALSTORAGE ===');

        try {
            // Eliminar categorías del localStorage
            localStorage.removeItem('fede_life_categories');
            console.log('✅ Categorías eliminadas del localStorage');

            // Forzar recarga de categorías por defecto
            this.initializeDefaultCategories();

            // Guardar las nuevas categorías
            this.saveDataToStorage();

            // Re-renderizar
            this.renderCategories();

            console.log('✅ Categorías por defecto recargadas');
            console.log('🔍 Nuevas categorías:', this.categories.map(c => ({ id: c.id, name: c.name })));

            this.showNotification('Categorías limpiadas y recargadas', 'success');

        } catch (error) {
            console.error('❌ Error limpiando categorías:', error);
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
        console.log('🧹 === LIMPIANDO DESCRIPCIONES DE TRANSACCIONES ===');

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

                console.log(`✅ Limpieza completada: ${cleanedCount} descripciones limpiadas`);
                console.log('🔍 Descripciones modificadas:', Array.from(originalDescriptions.entries()));

                this.showNotification(`${cleanedCount} descripciones limpiadas correctamente`, 'success');
            } else {
                console.log('ℹ️ No se encontraron descripciones que limpiar');
                this.showNotification('No se encontraron descripciones para limpiar', 'info');
            }

        } catch (error) {
            console.error('❌ Error limpiando descripciones:', error);
            this.showNotification('Error al limpiar descripciones', 'error');
        }
    }

    /**
     * Función para limpiar descripciones durante el procesamiento de PDFs
     * Se ejecuta automáticamente al agregar transacciones desde PDFs
     */
    cleanPdfDescriptions(transactions) {
        console.log('🧹 Limpiando descripciones de PDF...');

        transactions.forEach(transaction => {
            if (transaction.description) {
                const originalDesc = transaction.description;
                const cleanedDesc = this.cleanTransactionDescription(originalDesc);

                if (originalDesc !== cleanedDesc) {
                    console.log(`📝 Descripción limpiada: "${originalDesc}" → "${cleanedDesc}"`);
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
        console.log('🔍 === DIAGNÓSTICO DE CLICS EN CATEGORÍAS ===');

        // Verificar que las categorías estén renderizadas
        const categoryItems = document.querySelectorAll('.category-item');
        console.log(`📊 Elementos .category-item encontrados: ${categoryItems.length}`);

        if (categoryItems.length === 0) {
            console.log('❌ No se encontraron elementos .category-item. Verifica que estés en la pestaña Categorías.');
            return;
        }

        // Verificar que tengan los atributos correctos
        categoryItems.forEach((item, index) => {
            const categoryId = item.getAttribute('data-category-id');
            const onclickAttr = item.getAttribute('onclick');

            console.log(`📋 Categoría ${index + 1}:`);
            console.log(`   - data-category-id: ${categoryId}`);
            console.log(`   - onclick: ${onclickAttr}`);
            console.log(`   - Tiene cursor pointer: ${item.style.cursor === 'pointer'}`);
        });

        // Verificar funciones globales
        console.log('🔧 Funciones globales disponibles:');
        console.log('- showCategoryDetailsGlobal:', typeof window.showCategoryDetailsGlobal === 'function');
        console.log('- window.financeApp:', !!window.financeApp);

        if (window.financeApp) {
            console.log('- showCategoryDetails method:', typeof window.financeApp.showCategoryDetails === 'function');
        }

        // Verificar que las categorías estén en memoria
        console.log('📊 Estado de categorías en memoria:');
        console.log(`- Total categorías: ${this.categories.length}`);
        if (this.categories.length > 0) {
            console.log('- IDs de categorías:', this.categories.map(c => c.id));
        }

        console.log('✅ Diagnóstico completado. Si todo parece correcto, intenta hacer clic en una categoría.');
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

        console.log(`📊 Filtradas ${filteredTransactions.length} transacciones para ${type === 'yearly' ? year : `${month}/${year}`}`);
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
        console.log('🔧 Configurando selector global de períodos...');

        // Navegación de períodos
        const prevBtn = document.getElementById('prevPeriodBtn');
        const nextBtn = document.getElementById('nextPeriodBtn');

        if (prevBtn) {
            prevBtn.addEventListener('click', () => {
                console.log('⬅️ Navegando al período anterior');
                this.navigateToPreviousPeriod();
            });
        } else {
            console.warn('⚠️ Botón prevPeriodBtn no encontrado');
        }

        if (nextBtn) {
            nextBtn.addEventListener('click', () => {
                console.log('➡️ Navegando al período siguiente');
                this.navigateToNextPeriod();
            });
        } else {
            console.warn('⚠️ Botón nextPeriodBtn no encontrado');
        }

        // Cambio de tipo de período
        const periodTypeInputs = document.querySelectorAll('input[name="periodType"]');
        console.log(`📅 Encontrados ${periodTypeInputs.length} inputs de tipo de período`);
        periodTypeInputs.forEach(input => {
            input.addEventListener('change', (e) => {
                console.log(`🔄 Cambiando tipo de período a: ${e.target.value}`);
                this.changePeriodType(e.target.value);
            });
        });

        // Botones de salto
        const jumpToCurrentBtn = document.getElementById('jumpToCurrentBtn');
        const jumpToPeriodBtn = document.getElementById('jumpToPeriodBtn');

        if (jumpToCurrentBtn) {
            jumpToCurrentBtn.addEventListener('click', () => {
                console.log('🏠 Saltando al período actual');
                this.jumpToCurrentPeriod();
            });
        } else {
            console.warn('⚠️ Botón jumpToCurrentBtn no encontrado');
        }

        if (jumpToPeriodBtn) {
            jumpToPeriodBtn.addEventListener('click', () => {
                console.log('📅 Mostrando modal de salto a período');
                this.showJumpToPeriodModal();
            });
        } else {
            console.warn('⚠️ Botón jumpToPeriodBtn no encontrado');
        }

        // Actualizar display inicial
        this.updatePeriodDisplay();


        console.log('✅ Selector global de períodos configurado correctamente');
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
}

// ==================== INICIALIZACIÓN ====================

// Crear instancia global
const financeApp = new FinanceApp();

// Hacer disponible globalmente
if (typeof window !== 'undefined') {
    window.financeApp = financeApp;
}

// ==================== FUNCIONES GLOBALES PARA EVENTOS ====================

/**
 * Función global para mostrar detalles de categoría
 * @param {string} categoryId - ID de la categoría
 */
function showCategoryDetailsGlobal(categoryId) {
    console.log(`🌐 Función global showCategoryDetailsGlobal llamada con:`, categoryId);
    console.log(`🔍 Tipo del parámetro:`, typeof categoryId);

    if (window.financeApp && typeof window.financeApp.showCategoryDetails === 'function') {
        console.log(`🔗 Llamando a showCategoryDetails con: ${categoryId}`);
        window.financeApp.showCategoryDetails(categoryId);
    } else {
        console.error('❌ Función showCategoryDetails no disponible en window.financeApp');
        console.log('🔍 Estado de window.financeApp:', !!window.financeApp);
        if (window.financeApp) {
            console.log('🔍 Métodos disponibles:', Object.getOwnPropertyNames(window.financeApp).filter(name => typeof window.financeApp[name] === 'function'));
        }
    }
}

/**
 * Función global para editar categoría
 * @param {string} categoryId - ID de la categoría
 */
function editCategoryGlobal(categoryId) {
    if (window.financeApp && typeof window.financeApp.editCategory === 'function') {
        console.log(`🔗 Función global editCategory llamada para: ${categoryId}`);
        window.financeApp.editCategory(categoryId);
    } else {
        console.log('ℹ️ Función editar categoría no implementada aún');
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
        console.log(`🔗 Función global deleteCategory llamada para: ${categoryId}`);
        window.financeApp.deleteCategory(categoryId);
    } else {
        console.log('ℹ️ Función eliminar categoría no implementada aún');
        if (window.financeApp) {
            window.financeApp.showNotification('Función de eliminación próximamente', 'info');
        }
    }
}

// Ya disponible globalmente como window.financeApp
// export default financeApp;
