// ===== SISTEMA DE FINANZAS PERSONALES =====

class FinanceManager {
    constructor() {
        this.transactions = JSON.parse(localStorage.getItem('transactions')) || [];
        this.budgets = JSON.parse(localStorage.getItem('budgets')) || [];
        this.goals = JSON.parse(localStorage.getItem('goals')) || [];

        // Cargar categorías guardadas o usar las por defecto
        this.categories = JSON.parse(localStorage.getItem('categories')) || {
            income: [
                { name: 'Salario', color: '#28a745', description: 'Sueldo mensual' },
                { name: 'Freelance', color: '#17a2b8', description: 'Trabajos independientes' },
                { name: 'Inversiones', color: '#ffc107', description: 'Ganancias de inversiones' },
                { name: 'Bonos', color: '#6f42c1', description: 'Bonificaciones' },
                { name: 'Otros ingresos', color: '#fd7e14', description: 'Otros ingresos varios' }
            ],
            expense: [
                { name: 'Alimentación', color: '#dc3545', description: 'Comida y bebidas' },
                { name: 'Transporte', color: '#007bff', description: 'Combustible, transporte público' },
                { name: 'Vivienda', color: '#6c757d', description: 'Alquiler, servicios del hogar' },
                { name: 'Servicios', color: '#20c997', description: 'Internet, teléfono, etc.' },
                { name: 'Entretenimiento', color: '#e83e8c', description: 'Ocio y entretenimiento' },
                { name: 'Salud', color: '#fd7e14', description: 'Medicina, consultas médicas' },
                { name: 'Educación', color: '#6f42c1', description: 'Cursos, libros, estudios' },
                { name: 'Ropa', color: '#17a2b8', description: 'Vestimenta y accesorios' },
                { name: 'Tecnología', color: '#28a745', description: 'Dispositivos, software' },
                { name: 'Otros gastos', color: '#ffc107', description: 'Gastos varios' }
            ]
        };

        this.init();
    }

    init() {
        this.setupEventListeners();
        this.setupTabs();
        this.updateDashboard();
        this.loadTransactions();
        this.loadBudgets();
        this.loadGoals();
        this.loadCategories();
        this.setCurrentDate();
        this.updateCategoryOptions();
    }

    setupEventListeners() {
        // Formulario de transacciones
        document.getElementById('transactionForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.addTransaction();
        });

        // Formulario de metas
        document.getElementById('goalForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.addGoal();
        });

        // Formulario de presupuesto
        document.getElementById('budgetForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.addBudget();
        });

        // Formulario de categorías
        document.getElementById('categoryForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.addCategory();
        });

        // Botones
        document.getElementById('addBudgetBtn').addEventListener('click', () => {
            this.showBudgetModal();
        });

        document.getElementById('generateReport').addEventListener('click', () => {
            this.generateReport();
        });

        // Filtros
        document.getElementById('filterType').addEventListener('change', () => {
            this.filterTransactions();
        });

        document.getElementById('filterCategory').addEventListener('change', () => {
            this.filterTransactions();
        });

        document.getElementById('filterMonth').addEventListener('change', () => {
            this.filterTransactions();
        });

        // Cambio de tipo de transacción
        document.getElementById('transactionType').addEventListener('change', () => {
            this.updateCategoryOptions();
        });

        // Modal
        document.querySelector('.close').addEventListener('click', () => {
            this.hideBudgetModal();
        });

        window.addEventListener('click', (e) => {
            if (e.target === document.getElementById('budgetModal')) {
                this.hideBudgetModal();
            }
        });
    }

    setupTabs() {
        const tabButtons = document.querySelectorAll('.tab-btn');
        const tabContents = document.querySelectorAll('.tab-content');

        tabButtons.forEach(button => {
            button.addEventListener('click', () => {
                const targetTab = button.dataset.tab;

                // Remover clase activa de todos los botones y contenidos
                tabButtons.forEach(btn => btn.classList.remove('active'));
                tabContents.forEach(content => content.classList.remove('active'));

                // Agregar clase activa al botón clickeado y su contenido
                button.classList.add('active');
                document.getElementById(targetTab).classList.add('active');

                // Si es la pestaña de categorías, cargar las categorías
                if (targetTab === 'categories') {
                    this.loadCategories();
                }
            });
        });
    }

    setCurrentDate() {
        const today = new Date();
        const currentMonth = today.toISOString().slice(0, 7);
        document.getElementById('transactionDate').value = today.toISOString().slice(0, 10);
        document.getElementById('filterMonth').value = currentMonth;
    }

    updateCategoryOptions() {
        const transactionType = document.getElementById('transactionType').value;
        const categorySelect = document.getElementById('transactionCategory');
        const filterCategorySelect = document.getElementById('filterCategory');

        // Limpiar opciones
        categorySelect.innerHTML = '<option value="">Categoría</option>';
        filterCategorySelect.innerHTML = '<option value="">Todas las categorías</option>';

        if (transactionType) {
            this.categories[transactionType].forEach(category => {
                const categoryName = typeof category === 'string' ? category : category.name;
                const option = new Option(categoryName, categoryName);
                categorySelect.add(option);

                const filterOption = new Option(categoryName, categoryName);
                filterCategorySelect.add(filterOption);
            });
        } else {
            // Si no hay tipo seleccionado, mostrar todas las categorías en el filtro
            [...this.categories.income, ...this.categories.expense].forEach(category => {
                const categoryName = typeof category === 'string' ? category : category.name;
                const filterOption = new Option(categoryName, categoryName);
                filterCategorySelect.add(filterOption);
            });
        }
    }

    addTransaction() {
        const type = document.getElementById('transactionType').value;
        const amount = parseFloat(document.getElementById('transactionAmount').value);
        const description = document.getElementById('transactionDescription').value;
        const category = document.getElementById('transactionCategory').value;
        const date = document.getElementById('transactionDate').value;
        const paymentMethod = document.getElementById('paymentMethod').value;

        const transaction = {
            id: Date.now(),
            type,
            amount,
            description,
            category,
            date,
            paymentMethod,
            createdAt: new Date().toISOString()
        };

        this.transactions.push(transaction);
        this.saveTransactions();
        this.loadTransactions();
        this.updateDashboard();
        this.updateBudgetProgress();

        // Limpiar formulario
        document.getElementById('transactionForm').reset();
        this.setCurrentDate();

        this.showNotification('Transacción agregada exitosamente', 'success');
    }

    deleteTransaction(id) {
        if (confirm('¿Estás seguro de que quieres eliminar esta transacción?')) {
            this.transactions = this.transactions.filter(t => t.id !== id);
            this.saveTransactions();
            this.loadTransactions();
            this.updateDashboard();
            this.updateBudgetProgress();
            this.showNotification('Transacción eliminada', 'success');
        }
    }

    loadTransactions() {
        const container = document.getElementById('transactionsList');

        if (this.transactions.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-receipt"></i>
                    <h4>No hay transacciones</h4>
                    <p>Comienza agregando tu primera transacción</p>
                </div>
            `;
            return;
        }

        const sortedTransactions = [...this.transactions].sort((a, b) => new Date(b.date) - new Date(a.date));

        container.innerHTML = sortedTransactions.map(transaction => `
            <div class="transaction-item" data-id="${transaction.id}">
                <div class="transaction-info">
                    <div class="transaction-description">${transaction.description}</div>
                    <div class="transaction-details">
                        <span><i class="fas fa-tag"></i> ${transaction.category}</span>
                        <span><i class="fas fa-calendar"></i> ${this.formatDate(transaction.date)}</span>
                        <span><i class="fas fa-credit-card"></i> ${this.getPaymentMethodLabel(transaction.paymentMethod)}</span>
                    </div>
                </div>
                <div class="transaction-amount ${transaction.type}">
                    ${transaction.type === 'income' ? '+' : '-'}$${transaction.amount.toFixed(2)}
                </div>
                <div class="transaction-actions">
                    <button class="delete-transaction" onclick="financeManager.deleteTransaction(${transaction.id})">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </div>
        `).join('');
    }

    filterTransactions() {
        const filterType = document.getElementById('filterType').value;
        const filterCategory = document.getElementById('filterCategory').value;
        const filterMonth = document.getElementById('filterMonth').value;

        let filtered = [...this.transactions];

        if (filterType) {
            filtered = filtered.filter(t => t.type === filterType);
        }

        if (filterCategory) {
            filtered = filtered.filter(t => t.category === filterCategory);
        }

        if (filterMonth) {
            filtered = filtered.filter(t => t.date.startsWith(filterMonth));
        }

        this.displayFilteredTransactions(filtered);
    }

    displayFilteredTransactions(transactions) {
        const container = document.getElementById('transactionsList');

        if (transactions.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-search"></i>
                    <h4>No se encontraron transacciones</h4>
                    <p>Intenta cambiar los filtros</p>
                </div>
            `;
            return;
        }

        const sortedTransactions = transactions.sort((a, b) => new Date(b.date) - new Date(a.date));

        container.innerHTML = sortedTransactions.map(transaction => `
            <div class="transaction-item" data-id="${transaction.id}">
                <div class="transaction-info">
                    <div class="transaction-description">${transaction.description}</div>
                    <div class="transaction-details">
                        <span><i class="fas fa-tag"></i> ${transaction.category}</span>
                        <span><i class="fas fa-calendar"></i> ${this.formatDate(transaction.date)}</span>
                        <span><i class="fas fa-credit-card"></i> ${this.getPaymentMethodLabel(transaction.paymentMethod)}</span>
                    </div>
                </div>
                <div class="transaction-amount ${transaction.type}">
                    ${transaction.type === 'income' ? '+' : '-'}$${transaction.amount.toFixed(2)}
                </div>
                <div class="transaction-actions">
                    <button class="delete-transaction" onclick="financeManager.deleteTransaction(${transaction.id})">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </div>
        `).join('');
    }

    addBudget() {
        const category = document.getElementById('budgetCategory').value;
        const amount = parseFloat(document.getElementById('budgetAmount').value);

        // Verificar si ya existe un presupuesto para esta categoría
        const existingIndex = this.budgets.findIndex(b => b.category === category);

        if (existingIndex !== -1) {
            this.budgets[existingIndex].amount = amount;
        } else {
            const budget = {
                id: Date.now(),
                category,
                amount,
                createdAt: new Date().toISOString()
            };
            this.budgets.push(budget);
        }

        this.saveBudgets();
        this.loadBudgets();
        this.hideBudgetModal();
        this.showNotification('Presupuesto configurado exitosamente', 'success');
    }

    loadBudgets() {
        const container = document.getElementById('budgetList');

        if (this.budgets.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-chart-pie"></i>
                    <h4>No hay presupuestos configurados</h4>
                    <p>Configura presupuestos para diferentes categorías</p>
                </div>
            `;
            return;
        }

        container.innerHTML = this.budgets.map(budget => {
            const spent = this.getSpentInCategory(budget.category);
            const percentage = budget.amount > 0 ? (spent / budget.amount) * 100 : 0;
            const status = percentage >= 100 ? 'danger' : percentage >= 80 ? 'warning' : 'safe';

            return `
                <div class="budget-item">
                    <div class="budget-info">
                        <div class="budget-category">${budget.category}</div>
                        <div class="budget-progress">
                            <div class="progress-bar-budget">
                                <div class="progress-fill-budget ${status}" style="width: ${Math.min(percentage, 100)}%"></div>
                            </div>
                            <div class="budget-amounts">
                                <div class="spent-amount">$${spent.toFixed(2)} / $${budget.amount.toFixed(2)}</div>
                                <div class="budget-limit">${percentage.toFixed(1)}% usado</div>
                            </div>
                        </div>
                    </div>
                    <button class="delete-transaction" onclick="financeManager.deleteBudget(${budget.id})">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            `;
        }).join('');
    }

    deleteBudget(id) {
        if (confirm('¿Estás seguro de que quieres eliminar este presupuesto?')) {
            this.budgets = this.budgets.filter(b => b.id !== id);
            this.saveBudgets();
            this.loadBudgets();
            this.showNotification('Presupuesto eliminado', 'success');
        }
    }

    getSpentInCategory(category) {
        const currentMonth = new Date().toISOString().slice(0, 7);
        return this.transactions
            .filter(t => t.type === 'expense' && t.category === category && t.date.startsWith(currentMonth))
            .reduce((total, t) => total + t.amount, 0);
    }

    updateBudgetProgress() {
        this.loadBudgets();
    }

    addGoal() {
        const name = document.getElementById('goalName').value;
        const amount = parseFloat(document.getElementById('goalAmount').value);
        const deadline = document.getElementById('goalDeadline').value;
        const currentSaved = parseFloat(document.getElementById('currentSaved').value) || 0;
        const description = document.getElementById('goalDescription').value;

        const goal = {
            id: Date.now(),
            name,
            amount,
            deadline,
            currentSaved,
            description,
            createdAt: new Date().toISOString()
        };

        this.goals.push(goal);
        this.saveGoals();
        this.loadGoals();

        // Limpiar formulario
        document.getElementById('goalForm').reset();

        this.showNotification('Meta creada exitosamente', 'success');
    }

    loadGoals() {
        const container = document.getElementById('goalsList');

        if (this.goals.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-target"></i>
                    <h4>No hay metas configuradas</h4>
                    <p>Crea tus primeras metas de ahorro</p>
                </div>
            `;
            return;
        }

        container.innerHTML = this.goals.map(goal => {
            const progress = goal.amount > 0 ? (goal.currentSaved / goal.amount) * 100 : 0;
            const daysLeft = this.getDaysUntilDeadline(goal.deadline);

            return `
                <div class="goal-item">
                    <div class="goal-header">
                        <div>
                            <div class="goal-name">${goal.name}</div>
                            <div class="goal-deadline">
                                <i class="fas fa-calendar"></i> ${this.formatDate(goal.deadline)}
                                ${daysLeft > 0 ? `(${daysLeft} días restantes)` : '(Vencida)'}
                            </div>
                        </div>
                        <div class="goal-amount">
                            $${goal.currentSaved.toFixed(2)} / $${goal.amount.toFixed(2)}
                        </div>
                    </div>
                    <div class="goal-progress">
                        <div class="goal-progress-bar">
                            <div class="goal-progress-fill" style="width: ${Math.min(progress, 100)}%"></div>
                        </div>
                        <div class="goal-progress-text">
                            <span>${progress.toFixed(1)}% completado</span>
                            <span>Falta: $${(goal.amount - goal.currentSaved).toFixed(2)}</span>
                        </div>
                    </div>
                    ${goal.description ? `<p style="color: #666; font-size: 14px; margin: 10px 0;">${goal.description}</p>` : ''}
                    <div class="goal-actions">
                        <button class="update-goal" onclick="financeManager.updateGoal(${goal.id})">
                            <i class="fas fa-edit"></i> Actualizar
                        </button>
                        <button class="delete-goal" onclick="financeManager.deleteGoal(${goal.id})">
                            <i class="fas fa-trash"></i> Eliminar
                        </button>
                    </div>
                </div>
            `;
        }).join('');
    }

    updateGoal(id) {
        const goal = this.goals.find(g => g.id === id);
        if (!goal) return;

        const newAmount = prompt('Nuevo monto ahorrado:', goal.currentSaved);
        if (newAmount !== null && !isNaN(newAmount)) {
            goal.currentSaved = parseFloat(newAmount);
            this.saveGoals();
            this.loadGoals();
            this.updateDashboard();
            this.showNotification('Meta actualizada', 'success');
        }
    }

    deleteGoal(id) {
        if (confirm('¿Estás seguro de que quieres eliminar esta meta?')) {
            this.goals = this.goals.filter(g => g.id !== id);
            this.saveGoals();
            this.loadGoals();
            this.updateDashboard();
            this.showNotification('Meta eliminada', 'success');
        }
    }

    generateReport() {
        const period = document.getElementById('reportPeriod').value;
        const transactions = this.getTransactionsForPeriod(period);

        const reportData = this.analyzeTransactions(transactions);
        this.displayReport(reportData, period);
    }

    getTransactionsForPeriod(period) {
        const now = new Date();
        let startDate;

        switch (period) {
            case 'current-month':
                startDate = new Date(now.getFullYear(), now.getMonth(), 1);
                break;
            case 'last-month':
                startDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
                const endDate = new Date(now.getFullYear(), now.getMonth(), 0);
                return this.transactions.filter(t => {
                    const transDate = new Date(t.date);
                    return transDate >= startDate && transDate <= endDate;
                });
            case 'last-3-months':
                startDate = new Date(now.getFullYear(), now.getMonth() - 3, 1);
                break;
            case 'last-6-months':
                startDate = new Date(now.getFullYear(), now.getMonth() - 6, 1);
                break;
            case 'current-year':
                startDate = new Date(now.getFullYear(), 0, 1);
                break;
            default:
                startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        }

        return this.transactions.filter(t => new Date(t.date) >= startDate);
    }

    analyzeTransactions(transactions) {
        const income = transactions.filter(t => t.type === 'income');
        const expenses = transactions.filter(t => t.type === 'expense');

        const totalIncome = income.reduce((sum, t) => sum + t.amount, 0);
        const totalExpenses = expenses.reduce((sum, t) => sum + t.amount, 0);

        // Análisis por categorías
        const expensesByCategory = {};
        expenses.forEach(t => {
            expensesByCategory[t.category] = (expensesByCategory[t.category] || 0) + t.amount;
        });

        const incomeByCategory = {};
        income.forEach(t => {
            incomeByCategory[t.category] = (incomeByCategory[t.category] || 0) + t.amount;
        });

        return {
            totalIncome,
            totalExpenses,
            balance: totalIncome - totalExpenses,
            transactionCount: transactions.length,
            expensesByCategory,
            incomeByCategory,
            averageTransaction: transactions.length > 0 ? (totalIncome + totalExpenses) / transactions.length : 0
        };
    }

    displayReport(data, period) {
        const container = document.getElementById('reportResults');
        const periodLabel = this.getPeriodLabel(period);

        container.innerHTML = `
            <div class="report-card">
                <h4><i class="fas fa-chart-line"></i> Resumen del ${periodLabel}</h4>
                <div class="report-stats">
                    <div class="stat-item">
                        <div class="stat-value" style="color: #28a745;">$${data.totalIncome.toFixed(2)}</div>
                        <div class="stat-label">Total Ingresos</div>
                    </div>
                    <div class="stat-item">
                        <div class="stat-value" style="color: #dc3545;">$${data.totalExpenses.toFixed(2)}</div>
                        <div class="stat-label">Total Gastos</div>
                    </div>
                    <div class="stat-item">
                        <div class="stat-value" style="color: ${data.balance >= 0 ? '#28a745' : '#dc3545'};">
                            $${data.balance.toFixed(2)}
                        </div>
                        <div class="stat-label">Balance</div>
                    </div>
                    <div class="stat-item">
                        <div class="stat-value">${data.transactionCount}</div>
                        <div class="stat-label">Transacciones</div>
                    </div>
                </div>
            </div>
            
            <div class="report-card">
                <h4><i class="fas fa-chart-pie"></i> Gastos por Categoría</h4>
                <div class="report-stats">
                    ${Object.entries(data.expensesByCategory)
                .sort(([, a], [, b]) => b - a)
                .map(([category, amount]) => `
                            <div class="stat-item">
                                <div class="stat-value">$${amount.toFixed(2)}</div>
                                <div class="stat-label">${category}</div>
                            </div>
                        `).join('')}
                </div>
            </div>
            
            <div class="report-card">
                <h4><i class="fas fa-money-bill-wave"></i> Ingresos por Categoría</h4>
                <div class="report-stats">
                    ${Object.entries(data.incomeByCategory)
                .sort(([, a], [, b]) => b - a)
                .map(([category, amount]) => `
                            <div class="stat-item">
                                <div class="stat-value">$${amount.toFixed(2)}</div>
                                <div class="stat-label">${category}</div>
                            </div>
                        `).join('')}
                </div>
            </div>
        `;
    }

    updateDashboard() {
        const currentMonth = new Date().toISOString().slice(0, 7);
        const monthlyTransactions = this.transactions.filter(t => t.date.startsWith(currentMonth));

        const totalIncome = monthlyTransactions
            .filter(t => t.type === 'income')
            .reduce((sum, t) => sum + t.amount, 0);

        const totalExpenses = monthlyTransactions
            .filter(t => t.type === 'expense')
            .reduce((sum, t) => sum + t.amount, 0);

        const totalBalance = totalIncome - totalExpenses;

        const totalSavings = this.goals.reduce((sum, goal) => sum + goal.currentSaved, 0);

        document.getElementById('totalIncome').textContent = `$${totalIncome.toFixed(2)}`;
        document.getElementById('totalExpenses').textContent = `$${totalExpenses.toFixed(2)}`;
        document.getElementById('totalBalance').textContent = `$${totalBalance.toFixed(2)}`;
        document.getElementById('totalSavings').textContent = `$${totalSavings.toFixed(2)}`;

        // Actualizar colores del balance
        const balanceElement = document.getElementById('totalBalance');
        balanceElement.style.color = totalBalance >= 0 ? '#28a745' : '#dc3545';
    }

    showBudgetModal() {
        document.getElementById('budgetModal').style.display = 'block';
        document.getElementById('budgetCategory').value = '';
        document.getElementById('budgetAmount').value = '';
    }

    hideBudgetModal() {
        document.getElementById('budgetModal').style.display = 'none';
    }

    // Funciones de utilidad
    formatDate(dateString) {
        const date = new Date(dateString);
        return date.toLocaleDateString('es-ES', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
    }

    getPaymentMethodLabel(method) {
        const labels = {
            'cash': 'Efectivo',
            'card': 'Tarjeta',
            'transfer': 'Transferencia',
            'check': 'Cheque'
        };
        return labels[method] || method;
    }

    getDaysUntilDeadline(deadline) {
        const today = new Date();
        const deadlineDate = new Date(deadline);
        const timeDiff = deadlineDate.getTime() - today.getTime();
        return Math.ceil(timeDiff / (1000 * 3600 * 24));
    }

    getPeriodLabel(period) {
        const labels = {
            'current-month': 'Mes Actual',
            'last-month': 'Mes Anterior',
            'last-3-months': 'Últimos 3 Meses',
            'last-6-months': 'Últimos 6 Meses',
            'current-year': 'Año Actual'
        };
        return labels[period] || 'Período';
    }

    showNotification(message, type = 'info') {
        // Crear elemento de notificación
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.innerHTML = `
            <i class="fas fa-${type === 'success' ? 'check-circle' : 'info-circle'}"></i>
            ${message}
        `;

        // Agregar estilos si no existen
        if (!document.querySelector('#notification-styles')) {
            const styles = document.createElement('style');
            styles.id = 'notification-styles';
            styles.textContent = `
                .notification {
                    position: fixed;
                    top: 20px;
                    right: 20px;
                    padding: 15px 20px;
                    border-radius: 8px;
                    color: white;
                    font-weight: 600;
                    z-index: 10000;
                    display: flex;
                    align-items: center;
                    gap: 10px;
                    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
                    animation: slideInRight 0.3s ease;
                }
                .notification.success {
                    background-color: #28a745;
                }
                .notification.error {
                    background-color: #dc3545;
                }
                .notification.info {
                    background-color: #007bff;
                }
                @keyframes slideInRight {
                    from {
                        transform: translateX(100%);
                        opacity: 0;
                    }
                    to {
                        transform: translateX(0);
                        opacity: 1;
                    }
                }
            `;
            document.head.appendChild(styles);
        }

        document.body.appendChild(notification);

        // Remover después de 3 segundos
        setTimeout(() => {
            notification.style.animation = 'slideInRight 0.3s ease reverse';
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.parentNode.removeChild(notification);
                }
            }, 300);
        }, 3000);
    }

    // Funciones de almacenamiento
    saveTransactions() {
        localStorage.setItem('transactions', JSON.stringify(this.transactions));
    }

    saveBudgets() {
        localStorage.setItem('budgets', JSON.stringify(this.budgets));
    }

    saveGoals() {
        localStorage.setItem('goals', JSON.stringify(this.goals));
    }

    saveCategories() {
        localStorage.setItem('categories', JSON.stringify(this.categories));
    }

    // ===== GESTIÓN DE CATEGORÍAS =====

    setupCategoryTabs() {
        const categoryTabButtons = document.querySelectorAll('.category-tab-btn');
        const categoryLists = document.querySelectorAll('.category-list');

        categoryTabButtons.forEach(button => {
            button.addEventListener('click', () => {
                const targetType = button.dataset.type;

                // Remover clase activa de todos los botones y listas
                categoryTabButtons.forEach(btn => btn.classList.remove('active'));
                categoryLists.forEach(list => list.classList.remove('active'));

                // Agregar clase activa al botón clickeado y su lista
                button.classList.add('active');
                document.getElementById(`${targetType}Categories`).classList.add('active');
            });
        });
    }

    loadCategories() {
        // Esperar a que el DOM esté listo antes de configurar las pestañas
        setTimeout(() => {
            this.setupCategoryTabs();
            this.displayCategories('income');
            this.displayCategories('expense');
        }, 100);
    }

    displayCategories(type) {
        const container = document.getElementById(`${type}CategoriesList`);
        const categories = this.categories[type];

        if (!categories || categories.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-tags"></i>
                    <p>No hay categorías de ${type === 'income' ? 'ingresos' : 'gastos'}</p>
                </div>
            `;
            return;
        }

        container.innerHTML = categories.map((category, index) => {
            const categoryName = typeof category === 'string' ? category : category.name;
            const categoryColor = typeof category === 'string' ? '#87ccd8' : category.color;
            const categoryDescription = typeof category === 'string' ? '' : category.description;

            // Contar cuántas transacciones usan esta categoría
            const usageCount = this.transactions.filter(t => t.category === categoryName).length;

            return `
                <div class="category-item" data-type="${type}" data-index="${index}">
                    <div class="category-info">
                        <div class="category-color" style="background-color: ${categoryColor}"></div>
                        <div class="category-details">
                            <div class="category-name">${categoryName}</div>
                            ${categoryDescription ? `<div class="category-description">${categoryDescription}</div>` : ''}
                            <div class="category-usage">${usageCount} transacciones</div>
                        </div>
                    </div>
                    <div class="category-actions">
                        <button class="edit-category-btn" onclick="financeManager.editCategory('${type}', ${index})">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="delete-category-btn" onclick="financeManager.deleteCategory('${type}', ${index})">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </div>
            `;
        }).join('');
    }

    addCategory() {
        const type = document.getElementById('categoryType').value;
        const name = document.getElementById('categoryName').value.trim();
        const color = document.getElementById('categoryColor').value;
        const description = document.getElementById('categoryDescription').value.trim();

        if (!type || !name) {
            this.showNotification('Por favor completa los campos requeridos', 'error');
            return;
        }

        // Verificar si la categoría ya existe
        const existingCategory = this.categories[type].find(cat =>
            (typeof cat === 'string' ? cat : cat.name).toLowerCase() === name.toLowerCase()
        );

        if (existingCategory) {
            this.showNotification('Ya existe una categoría con ese nombre', 'error');
            return;
        }

        // Agregar la nueva categoría
        const newCategory = {
            name,
            color,
            description
        };

        this.categories[type].push(newCategory);
        this.saveCategories();
        this.displayCategories(type);
        this.updateCategoryOptions();

        // Limpiar formulario
        document.getElementById('categoryForm').reset();
        document.getElementById('categoryColor').value = '#3498db';

        this.showNotification('Categoría agregada exitosamente', 'success');
    }

    deleteCategory(type, index) {
        const category = this.categories[type][index];
        const categoryName = typeof category === 'string' ? category : category.name;

        // Verificar si hay transacciones que usan esta categoría
        const usageCount = this.transactions.filter(t => t.category === categoryName).length;

        let confirmMessage = '¿Estás seguro de que quieres eliminar esta categoría?';
        if (usageCount > 0) {
            confirmMessage += `\n\nAdvertencia: Esta categoría se está usando en ${usageCount} transacciones. Si la eliminas, esas transacciones quedarán sin categoría.`;
        }

        if (confirm(confirmMessage)) {
            // Eliminar la categoría
            this.categories[type].splice(index, 1);
            this.saveCategories();

            // Actualizar transacciones que usaban esta categoría
            if (usageCount > 0) {
                this.transactions.forEach(transaction => {
                    if (transaction.category === categoryName) {
                        transaction.category = '';
                    }
                });
                this.saveTransactions();
                this.loadTransactions();
                this.updateDashboard();
            }

            this.displayCategories(type);
            this.updateCategoryOptions();
            this.showNotification('Categoría eliminada', 'success');
        }
    }

    editCategory(type, index) {
        const category = this.categories[type][index];
        const categoryName = typeof category === 'string' ? category : category.name;
        const categoryColor = typeof category === 'string' ? '#87ccd8' : category.color;
        const categoryDescription = typeof category === 'string' ? '' : category.description;

        // Prellenar el formulario con los datos actuales
        document.getElementById('categoryType').value = type;
        document.getElementById('categoryName').value = categoryName;
        document.getElementById('categoryColor').value = categoryColor;
        document.getElementById('categoryDescription').value = categoryDescription;

        // Eliminar la categoría actual para permitir la edición
        this.deleteCategory(type, index);

        // Scroll hasta el formulario
        document.getElementById('categoryForm').scrollIntoView({ behavior: 'smooth' });
        document.getElementById('categoryName').focus();
    }
}

// Inicializar el sistema cuando se carga la página
let financeManager;

document.addEventListener('DOMContentLoaded', () => {
    financeManager = new FinanceManager();
});
