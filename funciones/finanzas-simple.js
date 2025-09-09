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
        
        // Gráficos modernos
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
        
        // Período global
        this.currentPeriod = {
            year: new Date().getFullYear(),
            month: new Date().getMonth() + 1,
            type: 'monthly'
        };
        
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
            
            // Inicializar gráficos
            this.initializeCharts();
            
            // Marcar como inicializado
            this.isInitialized = true;
            
            console.log('✅ Sistema de finanzas inicializado correctamente');
            
            // Renderizar datos iniciales
            this.renderDashboard();
            this.renderCategories();
            this.updateCharts();
            
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

        // Configurar selector global de períodos
        this.setupGlobalPeriodSelector();
        
        // Configurar eventos de tarjetas de resumen
        this.setupSummaryCardEvents();
        
        // Configurar filtros de transacciones
        this.setupTransactionFilters();

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
     * Procesa el archivo PDF usando OpenAI directamente
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

            console.log('📄 Iniciando procesamiento de PDF con OpenAI...');

            // Cargar OpenAI Analyzer si no está cargado
            if (!window.openaiAnalyzer) {
                console.log('🤖 Cargando OpenAI Analyzer...');
                const { OpenAIAnalyzer } = await import('../funciones/openai_analyzer.js');
                window.openaiAnalyzer = new OpenAIAnalyzer();
                
                // Configurar API Key
                let apiKey = localStorage.getItem('openai_api_key');
                
                // Si no hay API key en localStorage, intentar cargar desde config local
                if (!apiKey || apiKey === 'sk-proj-your-openai-api-key-here') {
                    try {
                        // Intentar cargar configuración local
                        const localConfig = await import('../config-local.js');
                        apiKey = localConfig.getLocalApiKey();
                        console.log('🔑 API Key cargada desde configuración local');
                    } catch (error) {
                        console.warn('⚠️ No se pudo cargar configuración local, usando placeholder');
                        apiKey = 'sk-proj-your-openai-api-key-here';
                    }
                }
                
                window.openaiAnalyzer.setApiKey(apiKey);
                
                console.log('✅ OpenAI Analyzer cargado y configurado');
            }

            // Extraer texto del PDF
            const text = await this.extractTextFromPdf(pdfFile.files[0]);
            console.log(`📄 Texto extraído: ${text.length} caracteres`);

            if (!text || text.length < 10) {
                throw new Error('No se pudo extraer texto del PDF o el archivo está vacío');
            }

            // Analizar con OpenAI
            console.log('🤖 Enviando a OpenAI para análisis...');
            const analysisResult = await window.openaiAnalyzer.analyzeFinancialText(text);
            
            if (analysisResult && analysisResult.success) {
                console.log('✅ Análisis completado:', analysisResult.data);
                
                // Procesar resultados
                const processedData = this.processOpenAIResults(analysisResult.data);
                
                // Mostrar resultados
                this.displayPdfResults(processedData);
                extractedExpenses.style.display = 'block';
                
                this.showNotification('PDF procesado exitosamente con OpenAI', 'success');
            } else {
                throw new Error(analysisResult?.error || 'Error en el análisis con OpenAI');
            }

        } catch (error) {
            console.error('❌ Error procesando PDF:', error);
            this.showNotification(`Error procesando PDF: ${error.message}`, 'error');
        } finally {
            // Ocultar estado de procesamiento
            processingStatus.style.display = 'none';
            processPdfBtn.disabled = false;
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
                                const pageText = textContent.items.map(item => item.str).join(' ');
                                fullText += pageText + '\n';
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
        // Si la respuesta es un array de gastos directo
        if (Array.isArray(data)) {
            return { expenses: data };
        }
        
        // Si la respuesta tiene estructura de análisis
        if (data.expenses && Array.isArray(data.expenses)) {
            return { expenses: data.expenses };
        }
        
        // Si la respuesta es texto, intentar extraer gastos
        if (typeof data === 'string') {
            const expenses = this.extractExpensesFromText(data);
            return { expenses };
        }
        
        // Formato por defecto
        return { expenses: [] };
    }

    /**
     * Extrae gastos de texto usando el sistema de análisis
     */
    extractExpensesFromText(text) {
        // Usar el mismo sistema de extracción que el analizador de PDF
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
     * Muestra los resultados del análisis de PDF
     */
    displayPdfResults(data) {
        const expensesList = document.getElementById('expensesList');
        
        if (data.expenses && data.expenses.length > 0) {
            const expensesHTML = data.expenses.map((expense, index) => {
                const symbol = expense.currency === 'UYU' ? '$U' : '$';
                return `
                    <div class="expense-item">
                        <input type="checkbox" class="expense-checkbox" 
                               data-amount="${expense.amount}" 
                               data-description="${expense.description}"
                               data-currency="${expense.currency}"
                               data-category="${expense.category || 'Otros'}">
                        <div class="expense-info">
                            <span class="expense-description">${expense.description}</span>
                            <span class="expense-amount">${symbol}${expense.amount.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                        </div>
                    </div>
                `;
            }).join('');
            
            expensesList.innerHTML = expensesHTML;
            
            // Agregar funcionalidad para agregar gastos seleccionados
            this.setupExpenseSelection();
        } else {
            expensesList.innerHTML = '<p>No se encontraron gastos en el PDF</p>';
        }
    }

    /**
     * Configura la selección de gastos para agregar
     */
    setupExpenseSelection() {
        const checkboxes = document.querySelectorAll('.expense-checkbox');
        const addSelectedBtn = document.getElementById('addSelectedExpenses');
        
        if (addSelectedBtn) {
            addSelectedBtn.addEventListener('click', () => {
                const selectedExpenses = Array.from(checkboxes)
                    .filter(cb => cb.checked)
                    .map(cb => ({
                        type: 'expense',
                        amount: parseFloat(cb.dataset.amount),
                        description: cb.dataset.description,
                        category: cb.dataset.category || 'Otros',
                        currency: cb.dataset.currency || 'UYU',
                        date: new Date(),
                        paymentMethod: 'pdf'
                    }));
                
                if (selectedExpenses.length > 0) {
                    selectedExpenses.forEach(expense => {
                        expense.id = this.generateId();
                        expense.createdAt = new Date();
                        this.transactions.push(expense);
                    });
                    
                    this.saveDataToStorage();
                    this.refreshAllData();
                    this.showNotification(`${selectedExpenses.length} gastos agregados correctamente`, 'success');
                } else {
                    this.showNotification('Selecciona al menos un gasto para agregar', 'error');
                }
            });
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
        const transactions = this.getTransactionsForCurrentPeriod();
        this.updateAccountBalances(transactions);
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
     * Renderiza las transacciones
     */
    renderTransactions() {
        const container = document.getElementById('transactionsList');
        if (!container) return;

        const filteredTransactions = this.getFilteredTransactions();

        if (filteredTransactions.length === 0) {
            container.innerHTML = '<p class="no-data">No hay transacciones para el período seleccionado</p>';
            return;
        }

        // Ordenar por fecha (más recientes primero)
        const sortedTransactions = [...filteredTransactions].sort((a, b) => new Date(b.date) - new Date(a.date));

        const transactionsHTML = sortedTransactions.map(transaction => {
            const symbol = transaction.currency === 'UYU' ? '$U' : '$';
            return `
                <div class="transaction-item ${transaction.type}">
                    <div class="transaction-info">
                        <span class="transaction-description">${transaction.description}</span>
                        <span class="transaction-category">${transaction.category}</span>
                    </div>
                    <div class="transaction-amount">
                        <span class="amount ${transaction.type}">
                            ${transaction.type === 'income' ? '+' : '-'}${symbol}${transaction.amount.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </span>
                        <span class="transaction-date">${new Date(transaction.date).toLocaleDateString('es-AR')}</span>
                    </div>
                </div>
            `;
        }).join('');

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
     * Refresca todos los datos
     */
    refreshAllData() {
        console.log('🔄 Refrescando todos los datos para el período:', this.currentPeriod);
        this.renderDashboard();
        this.renderTransactions();
        this.updateCharts();
        console.log('✅ Todos los datos refrescados correctamente');
    }

    /**
     * Configura eventos de las tarjetas de resumen
     */
    setupSummaryCardEvents() {
        // Tarjetas de ingresos y gastos por moneda
        const incomeUYUCard = document.getElementById('incomeUYUCard');
        const expenseUYUCard = document.getElementById('expenseUYUCard');
        const incomeUSDCard = document.getElementById('incomeUSDCard');
        const expenseUSDCard = document.getElementById('expenseUSDCard');

        if (incomeUYUCard) incomeUYUCard.addEventListener('click', () => this.navigateToTransactionForm('income', 'UYU'));
        if (expenseUYUCard) expenseUYUCard.addEventListener('click', () => this.navigateToTransactionForm('expense', 'UYU'));
        if (incomeUSDCard) incomeUSDCard.addEventListener('click', () => this.navigateToTransactionForm('income', 'USD'));
        if (expenseUSDCard) expenseUSDCard.addEventListener('click', () => this.navigateToTransactionForm('expense', 'USD'));

        // Tarjetas de transferencia
        const transferToUSDCard = document.getElementById('transferToUSDCard');
        const transferToUYUCard = document.getElementById('transferToUYUCard');

        if (transferToUSDCard) transferToUSDCard.addEventListener('click', () => this.showTransferModal('UYU', 'USD'));
        if (transferToUYUCard) transferToUYUCard.addEventListener('click', () => this.showTransferModal('USD', 'UYU'));
    }

    /**
     * Navega al formulario de transacciones con datos prellenados
     */
    navigateToTransactionForm(transactionType, currency) {
        const typeSelect = document.getElementById('transactionType');
        const currencySelect = document.getElementById('transactionCurrency');

        if (typeSelect) typeSelect.value = transactionType;
        if (currencySelect) currencySelect.value = currency;

        // Hacer scroll al formulario
        const form = document.getElementById('transactionForm');
        if (form) {
            form.scrollIntoView({ behavior: 'smooth' });
        }

        // Actualizar categorías
        this.populateTransactionCategories();
    }

    /**
     * Muestra el modal de transferencia
     */
    showTransferModal(fromCurrency, toCurrency) {
        const modal = this.createTransferModal();
        document.body.appendChild(modal);
        this.setupTransferModalEvents(modal);
        this.updateTransferModal(modal, fromCurrency, toCurrency);
    }

    /**
     * Crea el modal de transferencia
     */
    createTransferModal() {
        const modal = document.createElement('div');
        modal.className = 'modal';
        modal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h2>Transferencia entre Cuentas</h2>
                    <span class="close">&times;</span>
                </div>
                <div class="modal-body">
                    <div class="transfer-info">
                        <div class="transfer-from">
                            <span class="transfer-currency" id="fromCurrency">UYU</span>
                            <span class="transfer-amount" id="fromAmount">$0.00</span>
                        </div>
                        <div class="transfer-arrow">
                            <i class="fas fa-arrow-right"></i>
                        </div>
                        <div class="transfer-to">
                            <span class="transfer-currency" id="toCurrency">USD</span>
                            <span class="transfer-amount" id="toAmount">$0.00</span>
                        </div>
                    </div>
                    <div class="transfer-rate">
                        <span>Tasa de cambio: 1 USD = 40 UYU</span>
                    </div>
                    <div class="form-group">
                        <label for="transferAmount">Monto a transferir:</label>
                        <div class="input-group">
                            <span class="input-symbol" id="transferSymbol">$U</span>
                            <input type="number" id="transferAmount" step="0.01" min="0">
                        </div>
                    </div>
                    <div class="result-amount" id="resultAmount" style="display: none;">
                        <span>Recibirás: <strong id="resultValue">$0.00</strong></span>
                    </div>
                    <div class="form-actions">
                        <button type="button" class="btn btn-secondary" id="cancelTransferBtn">Cancelar</button>
                        <button type="button" class="btn btn-primary" id="confirmTransferBtn">Transferir</button>
                    </div>
                </div>
            </div>
        `;
        return modal;
    }

    /**
     * Configura eventos del modal de transferencia
     */
    setupTransferModalEvents(modal) {
        const closeBtn = modal.querySelector('.close');
        const cancelBtn = modal.querySelector('#cancelTransferBtn');
        const confirmBtn = modal.querySelector('#confirmTransferBtn');
        const amountInput = modal.querySelector('#transferAmount');

        const closeModal = () => this.closeTransferModal(modal);

        closeBtn.addEventListener('click', closeModal);
        cancelBtn.addEventListener('click', closeModal);
        confirmBtn.addEventListener('click', () => this.handleTransferSubmit(modal));
        
        amountInput.addEventListener('input', () => this.calculateTransferResult(modal));

        // Cerrar al hacer clic fuera del modal
        modal.addEventListener('click', (e) => {
            if (e.target === modal) closeModal();
        });
    }

    /**
     * Actualiza el modal de transferencia
     */
    updateTransferModal(modal, fromCurrency, toCurrency) {
        const fromCurrencyEl = modal.querySelector('#fromCurrency');
        const toCurrencyEl = modal.querySelector('#toCurrency');
        const fromAmountEl = modal.querySelector('#fromAmount');
        const toAmountEl = modal.querySelector('#toAmount');
        const transferSymbol = modal.querySelector('#transferSymbol');

        fromCurrencyEl.textContent = fromCurrency;
        toCurrencyEl.textContent = toCurrency;
        transferSymbol.textContent = fromCurrency === 'UYU' ? '$U' : '$';

        // Obtener balances actuales
        const transactions = this.getTransactionsForCurrentPeriod();
        const fromBalance = this.calculateBalance(transactions, fromCurrency);
        const toBalance = this.calculateBalance(transactions, toCurrency);

        fromAmountEl.textContent = this.formatCurrency(fromBalance, fromCurrency);
        toAmountEl.textContent = this.formatCurrency(toBalance, toCurrency);
    }

    /**
     * Calcula el resultado de la transferencia
     */
    calculateTransferResult(modal) {
        const amountInput = modal.querySelector('#transferAmount');
        const resultAmount = modal.querySelector('#resultAmount');
        const resultValue = modal.querySelector('#resultValue');
        const fromCurrency = modal.querySelector('#fromCurrency').textContent;
        const toCurrency = modal.querySelector('#toCurrency').textContent;

        const amount = parseFloat(amountInput.value) || 0;
        
        if (amount > 0) {
            let result = 0;
            if (fromCurrency === 'UYU' && toCurrency === 'USD') {
                result = amount / 40; // 1 USD = 40 UYU
            } else if (fromCurrency === 'USD' && toCurrency === 'UYU') {
                result = amount * 40;
            }
            
            resultValue.textContent = this.formatCurrency(result, toCurrency);
            resultAmount.style.display = 'block';
        } else {
            resultAmount.style.display = 'none';
        }
    }

    /**
     * Maneja el envío de la transferencia
     */
    handleTransferSubmit(modal) {
        const amountInput = modal.querySelector('#transferAmount');
        const fromCurrency = modal.querySelector('#fromCurrency').textContent;
        const toCurrency = modal.querySelector('#toCurrency').textContent;

        const amount = parseFloat(amountInput.value) || 0;
        
        if (amount <= 0) {
            this.showNotification('Ingresa un monto válido', 'error');
            return;
        }

        // Crear transacciones de transferencia
        const transferTransactions = this.createTransferTransactions(fromCurrency, toCurrency, amount);
        
        // Agregar transacciones
        transferTransactions.forEach(transaction => {
            this.transactions.push(transaction);
        });

        // Guardar en localStorage
        this.saveDataToStorage();

        // Actualizar UI
        this.refreshAllData();

        // Cerrar modal
        this.closeTransferModal(modal);

        this.showNotification('Transferencia realizada correctamente', 'success');
    }

    /**
     * Crea las transacciones de transferencia
     */
    createTransferTransactions(fromCurrency, toCurrency, amount) {
        const now = new Date();
        const transactions = [];

        // Transacción de salida (gasto)
        transactions.push({
            id: this.generateId(),
            type: 'expense',
            amount: amount,
            description: `Transferencia a ${toCurrency}`,
            category: 'Transferencia',
            date: now,
            currency: fromCurrency,
            paymentMethod: 'transfer',
            createdAt: now
        });

        // Calcular monto de entrada
        let receiveAmount = 0;
        if (fromCurrency === 'UYU' && toCurrency === 'USD') {
            receiveAmount = amount / 40;
        } else if (fromCurrency === 'USD' && toCurrency === 'UYU') {
            receiveAmount = amount * 40;
        }

        // Transacción de entrada (ingreso)
        transactions.push({
            id: this.generateId(),
            type: 'income',
            amount: receiveAmount,
            description: `Transferencia desde ${fromCurrency}`,
            category: 'Transferencia',
            date: now,
            currency: toCurrency,
            paymentMethod: 'transfer',
            createdAt: now
        });

        return transactions;
    }

    /**
     * Cierra el modal de transferencia
     */
    closeTransferModal(modal) {
        if (modal && modal.parentNode) {
            modal.parentNode.removeChild(modal);
        }
    }

    /**
     * Calcula el balance para una moneda específica
     */
    calculateBalance(transactions, currency) {
        const currencyTransactions = transactions.filter(t => t.currency === currency);
        const income = currencyTransactions.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0);
        const expenses = currencyTransactions.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0);
        return income - expenses;
    }

    /**
     * Formatea una cantidad con su moneda
     */
    formatCurrency(amount, currency) {
        const symbol = currency === 'UYU' ? '$U' : '$';
        return `${symbol}${amount.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    }

    /**
     * Configura filtros de transacciones
     */
    setupTransactionFilters() {
        const filterType = document.getElementById('filterType');
        const filterCategory = document.getElementById('filterCategory');
        const clearFiltersBtn = document.getElementById('clearFiltersBtn');
        const clearHistoryBtn = document.getElementById('clearHistoryBtn');

        if (filterType) filterType.addEventListener('change', () => this.renderTransactions());
        if (filterCategory) filterCategory.addEventListener('change', () => this.renderTransactions());
        if (clearFiltersBtn) clearFiltersBtn.addEventListener('click', () => this.clearFilters());
        if (clearHistoryBtn) clearHistoryBtn.addEventListener('click', () => this.clearHistory());
    }

    /**
     * Obtiene transacciones filtradas
     */
    getFilteredTransactions() {
        let transactions = this.getTransactionsForCurrentPeriod();

        const filterType = document.getElementById('filterType');
        const filterCategory = document.getElementById('filterCategory');

        if (filterType && filterType.value) {
            transactions = transactions.filter(t => t.type === filterType.value);
        }

        if (filterCategory && filterCategory.value) {
            transactions = transactions.filter(t => t.category === filterCategory.value);
        }

        return transactions;
    }

    /**
     * Limpia los filtros
     */
    clearFilters() {
        const filterType = document.getElementById('filterType');
        const filterCategory = document.getElementById('filterCategory');

        if (filterType) filterType.value = '';
        if (filterCategory) filterCategory.value = '';

        this.renderTransactions();
    }

    /**
     * Borra todo el historial
     */
    clearHistory() {
        if (confirm('¿Estás seguro de que quieres borrar todo el historial de transacciones? Esta acción no se puede deshacer.')) {
            this.transactions = [];
            this.saveDataToStorage();
            this.refreshAllData();
            this.showNotification('Historial borrado correctamente', 'success');
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
