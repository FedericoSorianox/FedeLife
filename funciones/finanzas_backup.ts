/**
 * 🏦 SISTEMA DE FINANZAS PERSONALES - FEDE LIFE
 * 
 * Arquitectura: Modular con patrón Repository, Manager y Controller
 * Autor: Senior Backend Developer
 * Descripción: Sistema completo para gestión de finanzas personales
 */

(function() {

// ==================== INTERFACES Y TIPOS ====================

/**
 * Tipo de transacción financiera
 */
type TransactionType = 'income' | 'expense';

/**
 * Métodos de pago disponibles
 */
type PaymentMethod = 'cash' | 'card' | 'transfer' | 'check';

/**
 * Períodos para reportes
 */
type ReportPeriod = 'current-month' | 'last-month' | 'last-3-months' | 'last-6-months' | 'current-year';

/**
 * Interface para una transacción financiera
 * Representa cada movimiento de dinero (ingreso o gasto)
 */
interface Transaction {
    id: string;                    // ID único de la transacción
    type: TransactionType;         // Tipo: ingreso o gasto
    amount: number;                // Monto de la transacción
    description: string;           // Descripción del movimiento
    category: string;              // Categoría asociada
    date: Date;                    // Fecha de la transacción
    paymentMethod: PaymentMethod;  // Método de pago utilizado
    createdAt: Date;              // Fecha de creación del registro
}

/**
 * Interface para una categoría de transacciones
 * Organiza las transacciones por tipo (salario, comida, etc.)
 */
interface Category {
    id: string;           // ID único de la categoría
    name: string;         // Nombre de la categoría
    type: TransactionType; // Tipo: para ingresos o gastos
    color: string;        // Color para identificación visual
    description?: string; // Descripción opcional
    createdAt: Date;      // Fecha de creación
}

/**
 * Interface para presupuesto mensual por categoría
 * Define límites de gasto por categoría
 */
interface Budget {
    id: string;       // ID único del presupuesto
    category: string; // Categoría asociada
    amount: number;   // Monto límite del presupuesto
    spent: number;    // Monto ya gastado
    month: string;    // Mes del presupuesto (YYYY-MM)
    createdAt: Date;  // Fecha de creación
}

/**
 * Interface para metas de ahorro
 * Define objetivos financieros a alcanzar
 */
interface Goal {
    id: string;        // ID único de la meta
    name: string;      // Nombre de la meta
    amount: number;    // Monto objetivo
    currentSaved: number; // Monto ya ahorrado
    deadline: Date;    // Fecha límite
    description?: string; // Descripción opcional
    completed: boolean; // Estado de completitud
    createdAt: Date;   // Fecha de creación
}

/**
 * Interface para el resumen financiero del dashboard
 */
interface FinancialSummary {
    totalIncome: number;   // Total de ingresos
    totalExpenses: number; // Total de gastos
    balance: number;       // Balance (ingresos - gastos)
    totalSavings: number;  // Total ahorrado
}

/**
 * Interface para un gasto extraído del PDF
 * Representa cada transacción identificada por la IA
 */
interface ExtractedExpense {
    id: string;           // ID único temporal
    date: string;         // Fecha en formato YYYY-MM-DD
    description: string;  // Descripción del gasto
    amount: number;       // Monto del gasto
    category: string;     // Categoría sugerida por IA
    paymentMethod: PaymentMethod; // Método de pago detectado
    confidence: 'high' | 'medium' | 'low'; // Nivel de confianza de la IA
    isSelected: boolean;  // Si está seleccionado para agregar
    originalText: string; // Texto original del PDF para referencia
}

/**
 * Interface para la respuesta de la IA
 * Estructura que devuelve el LLM tras analizar el PDF
 */
interface AIAnalysisResponse {
    success: boolean;           // Si el análisis fue exitoso
    expenses: ExtractedExpense[]; // Array de gastos encontrados
    confidence: number;         // Confianza general del análisis (0-1)
    summary: string;           // Resumen del análisis
    error?: string;            // Mensaje de error si falló
}

/**
 * Interface para configuración del LLM
 */
interface LLMConfig {
    apiKey: string;           // API Key de OpenAI
    model: string;            // Modelo a usar (gpt-4, gpt-3.5-turbo, etc)
    maxTokens: number;        // Máximo de tokens en la respuesta
    temperature: number;      // Creatividad del modelo (0-1)
}

// ==================== CAPA DE PERSISTENCIA ====================

/**
 * Clase para manejo de almacenamiento local
 * Patrón Repository: Abstrae el acceso a datos
 */
class LocalStorageRepository {
    /**
     * Guarda datos en localStorage con manejo de errores
     * @param key - Clave para almacenar
     * @param data - Datos a almacenar
     */
    public save<T>(key: string, data: T[]): void {
        try {
            const jsonData = JSON.stringify(data);
            localStorage.setItem(key, jsonData);
        } catch (error) {
            console.error(`Error guardando ${key}:`, error);
            throw new Error(`No se pudo guardar ${key}`);
        }
    }

    /**
     * Carga datos desde localStorage con validación
     * @param key - Clave a buscar
     * @returns Array de datos o array vacío si no existe
     */
    public load<T>(key: string): T[] {
        try {
            const data = localStorage.getItem(key);
            return data ? JSON.parse(data) : [];
        } catch (error) {
            console.error(`Error cargando ${key}:`, error);
            return [];
        }
    }

    /**
     * Elimina una clave específica del localStorage
     * @param key - Clave a eliminar
     */
    public remove(key: string): void {
        try {
            localStorage.removeItem(key);
        } catch (error) {
            console.error(`Error eliminando ${key}:`, error);
        }
    }

    /**
     * Verifica si una clave existe en localStorage
     * @param key - Clave a verificar
     * @returns true si existe, false si no
     */
    public exists(key: string): boolean {
        return localStorage.getItem(key) !== null;
    }
}

// ==================== GESTOR DE CATEGORÍAS ====================

/**
 * Gestor de categorías de ingresos y gastos
 * Maneja CRUD de categorías y inicialización de categorías por defecto
 */
class CategoryManager {
    private readonly STORAGE_KEY = 'finance_categories';
    private storage: LocalStorageRepository;
    private categories: Category[] = [];

    constructor(storage: LocalStorageRepository) {
        this.storage = storage;
        this.loadCategories();
        this.initializeDefaultCategories();
    }

    /**
     * Inicializa categorías por defecto si no existen
     * Esto asegura que el usuario tenga categorías básicas para usar
     */
    private initializeDefaultCategories(): void {
        if (this.categories.length === 0) {
            const defaultCategories: Omit<Category, 'id' | 'createdAt'>[] = [
                // Categorías de ingresos
                { name: 'Salario', type: 'income', color: '#27ae60', description: 'Sueldo mensual' },
                { name: 'Freelance', type: 'income', color: '#3498db', description: 'Trabajos independientes' },
                { name: 'Inversiones', type: 'income', color: '#9b59b6', description: 'Rendimientos de inversiones' },
                { name: 'Otros Ingresos', type: 'income', color: '#1abc9c', description: 'Ingresos varios' },
                
                // Categorías de gastos
                { name: 'Alimentación', type: 'expense', color: '#e74c3c', description: 'Comida y bebidas' },
                { name: 'Transporte', type: 'expense', color: '#f39c12', description: 'Gasolina, transporte público' },
                { name: 'Servicios', type: 'expense', color: '#e67e22', description: 'Luz, agua, internet' },
                { name: 'Entretenimiento', type: 'expense', color: '#8e44ad', description: 'Cine, restaurantes' },
                { name: 'Salud', type: 'expense', color: '#2ecc71', description: 'Medicinas, consultas' },
                { name: 'Educación', type: 'expense', color: '#3498db', description: 'Cursos, libros' },
                { name: 'Ropa', type: 'expense', color: '#e91e63', description: 'Vestimenta y calzado' },
                { name: 'Otros Gastos', type: 'expense', color: '#95a5a6', description: 'Gastos varios' }
            ];

            defaultCategories.forEach(cat => this.addCategory(cat.name, cat.type, cat.color, cat.description));
        }
    }

    /**
     * Carga categorías desde el almacenamiento local
     */
    private loadCategories(): void {
        const data = this.storage.load<Category>(this.STORAGE_KEY);
        // Convertir fechas de string a Date objects
        this.categories = data.map(cat => ({
            ...cat,
            createdAt: new Date(cat.createdAt)
        }));
    }

    /**
     * Guarda categorías en el almacenamiento local
     */
    private saveCategories(): void {
        this.storage.save(this.STORAGE_KEY, this.categories);
    }

    /**
     * Agrega una nueva categoría
     * @param name - Nombre de la categoría
     * @param type - Tipo (income/expense)
     * @param color - Color en hexadecimal
     * @param description - Descripción opcional
     * @returns ID de la categoría creada
     */
    public addCategory(name: string, type: TransactionType, color: string, description?: string): string {
        // Validar que no exista una categoría con el mismo nombre y tipo
        const exists = this.categories.some(cat => 
            cat.name.toLowerCase() === name.toLowerCase() && cat.type === type
        );

        if (exists) {
            throw new Error(`Ya existe una categoría "${name}" para ${type === 'income' ? 'ingresos' : 'gastos'}`);
        }

        const newCategory: Category = {
            id: this.generateId(),
            name: name.trim(),
            type,
            color,
            description: description?.trim(),
            createdAt: new Date()
        };

        this.categories.push(newCategory);
        this.saveCategories();
        return newCategory.id;
    }

    /**
     * Obtiene todas las categorías filtradas por tipo
     * @param type - Tipo de categorías a obtener (opcional)
     * @returns Array de categorías
     */
    public getCategories(type?: TransactionType): Category[] {
        if (type) {
            return this.categories.filter(cat => cat.type === type);
        }
        return [...this.categories];
    }

    /**
     * Obtiene una categoría por su ID
     * @param id - ID de la categoría
     * @returns Categoría encontrada o undefined
     */
    public getCategoryById(id: string): Category | undefined {
        return this.categories.find(cat => cat.id === id);
    }

    /**
     * Elimina una categoría
     * @param id - ID de la categoría a eliminar
     * @returns true si se eliminó, false si no se encontró
     */
    public deleteCategory(id: string): boolean {
        const index = this.categories.findIndex(cat => cat.id === id);
        if (index !== -1) {
            this.categories.splice(index, 1);
            this.saveCategories();
            return true;
        }
        return false;
    }

    /**
     * Actualiza una categoría existente
     * @param id - ID de la categoría
     * @param updates - Campos a actualizar
     * @returns true si se actualizó, false si no se encontró
     */
    public updateCategory(id: string, updates: Partial<Omit<Category, 'id' | 'createdAt'>>): boolean {
        const category = this.categories.find(cat => cat.id === id);
        if (category) {
            Object.assign(category, updates);
            this.saveCategories();
            return true;
        }
        return false;
    }

    /**
     * Genera un ID único para las categorías
     * @returns String único basado en timestamp y random
     */
    private generateId(): string {
        return `cat_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }
}

// ==================== GESTOR DE TRANSACCIONES ====================

/**
 * Gestor principal de transacciones financieras
 * Maneja todo el CRUD de transacciones y cálculos relacionados
 */
class TransactionManager {
    private readonly STORAGE_KEY = 'finance_transactions';
    private storage: LocalStorageRepository;
    private transactions: Transaction[] = [];

    constructor(storage: LocalStorageRepository) {
        this.storage = storage;
        this.loadTransactions();
    }

    /**
     * Carga transacciones desde el almacenamiento local
     */
    private loadTransactions(): void {
        const data = this.storage.load<Transaction>(this.STORAGE_KEY);
        // Convertir fechas de string a Date objects
        this.transactions = data.map(trans => ({
            ...trans,
            date: new Date(trans.date),
            createdAt: new Date(trans.createdAt)
        }));
    }

    /**
     * Guarda transacciones en el almacenamiento local
     */
    private saveTransactions(): void {
        this.storage.save(this.STORAGE_KEY, this.transactions);
    }

    /**
     * Agrega una nueva transacción
     * @param transactionData - Datos de la transacción sin ID ni fecha de creación
     * @returns ID de la transacción creada
     */
    public addTransaction(transactionData: Omit<Transaction, 'id' | 'createdAt'>): string {
        // Validaciones de negocio
        if (transactionData.amount <= 0) {
            throw new Error('El monto debe ser mayor a 0');
        }

        if (!transactionData.description.trim()) {
            throw new Error('La descripción es requerida');
        }

        const newTransaction: Transaction = {
            id: this.generateId(),
            ...transactionData,
            description: transactionData.description.trim(),
            createdAt: new Date()
        };

        this.transactions.push(newTransaction);
        this.saveTransactions();
        return newTransaction.id;
    }

    /**
     * Obtiene todas las transacciones con filtros opcionales
     * @param filters - Filtros a aplicar
     * @returns Array de transacciones filtradas
     */
    public getTransactions(filters?: {
        type?: TransactionType;
        category?: string;
        startDate?: Date;
        endDate?: Date;
        month?: string; // YYYY-MM
    }): Transaction[] {
        let filtered = [...this.transactions];

        if (filters) {
            if (filters.type) {
                filtered = filtered.filter(trans => trans.type === filters.type);
            }

            if (filters.category) {
                filtered = filtered.filter(trans => trans.category === filters.category);
            }

            if (filters.startDate) {
                filtered = filtered.filter(trans => trans.date >= filters.startDate!);
            }

            if (filters.endDate) {
                filtered = filtered.filter(trans => trans.date <= filters.endDate!);
            }

            if (filters.month) {
                filtered = filtered.filter(trans => {
                    const transMonth = trans.date.toISOString().substr(0, 7); // YYYY-MM
                    return transMonth === filters.month;
                });
            }
        }

        // Ordenar por fecha descendente (más recientes primero)
        return filtered.sort((a, b) => b.date.getTime() - a.date.getTime());
    }

    /**
     * Elimina una transacción
     * @param id - ID de la transacción a eliminar
     * @returns true si se eliminó, false si no se encontró
     */
    public deleteTransaction(id: string): boolean {
        const index = this.transactions.findIndex(trans => trans.id === id);
        if (index !== -1) {
            this.transactions.splice(index, 1);
            this.saveTransactions();
            return true;
        }
        return false;
    }

    /**
     * Actualiza una transacción existente
     * @param id - ID de la transacción
     * @param updates - Campos a actualizar
     * @returns true si se actualizó, false si no se encontró
     */
    public updateTransaction(id: string, updates: Partial<Omit<Transaction, 'id' | 'createdAt'>>): boolean {
        const transaction = this.transactions.find(trans => trans.id === id);
        if (transaction) {
            // Validar monto si se está actualizando
            if (updates.amount !== undefined && updates.amount <= 0) {
                throw new Error('El monto debe ser mayor a 0');
            }

            Object.assign(transaction, updates);
            this.saveTransactions();
            return true;
        }
        return false;
    }

    /**
     * Calcula el balance de un mes específico sin recursión
     * @param month - Mes en formato YYYY-MM
     * @returns Balance del mes (ingresos - gastos)
     */
    private getMonthBalance(month: string): number {
        const monthTransactions = this.getTransactions({ month });
        
        const totalIncome = monthTransactions
            .filter(trans => trans.type === 'income')
            .reduce((sum, trans) => sum + trans.amount, 0);

        const totalExpenses = monthTransactions
            .filter(trans => trans.type === 'expense')
            .reduce((sum, trans) => sum + trans.amount, 0);

        return totalIncome - totalExpenses;
    }

    /**
     * Calcula el resumen financiero para un período específico
     * @param month - Mes en formato YYYY-MM (opcional, por defecto mes actual)
     * @returns Resumen financiero
     */
    public getFinancialSummary(month?: string): FinancialSummary {
        const targetMonth = month || new Date().toISOString().substr(0, 7);
        const monthTransactions = this.getTransactions({ month: targetMonth });

        const totalIncome = monthTransactions
            .filter(trans => trans.type === 'income')
            .reduce((sum, trans) => sum + trans.amount, 0);

        const totalExpenses = monthTransactions
            .filter(trans => trans.type === 'expense')
            .reduce((sum, trans) => sum + trans.amount, 0);

        const balance = totalIncome - totalExpenses;

        // Para calcular ahorros totales, sumamos todos los balances positivos de meses anteriores
        // CORREGIDO: Usamos getMonthBalance() en lugar de getFinancialSummary() para evitar recursión
        const allMonths = this.getAllMonthsWithTransactions();
        const totalSavings = allMonths.reduce((savings, monthKey) => {
            if (monthKey <= targetMonth) {
                const monthBalance = this.getMonthBalance(monthKey);
                return savings + Math.max(0, monthBalance);
            }
            return savings;
        }, 0);

        return {
            totalIncome,
            totalExpenses,
            balance,
            totalSavings
        };
    }

    /**
     * Obtiene todos los meses que tienen transacciones
     * @returns Array de meses en formato YYYY-MM
     */
    private getAllMonthsWithTransactions(): string[] {
        const months = new Set<string>();
        this.transactions.forEach(trans => {
            const month = trans.date.toISOString().substr(0, 7);
            months.add(month);
        });
        return Array.from(months).sort();
    }

    /**
     * Obtiene estadísticas por categoría para un período
     * @param startDate - Fecha de inicio
     * @param endDate - Fecha de fin
     * @returns Objeto con estadísticas por categoría
     */
    public getCategoryStats(startDate: Date, endDate: Date): {[category: string]: {amount: number, count: number, type: TransactionType}} {
        const filtered = this.getTransactions({ startDate, endDate });
        const stats: {[category: string]: {amount: number, count: number, type: TransactionType}} = {};

        filtered.forEach(trans => {
            if (!stats[trans.category]) {
                stats[trans.category] = {
                    amount: 0,
                    count: 0,
                    type: trans.type
                };
            }
            stats[trans.category].amount += trans.amount;
            stats[trans.category].count += 1;
        });

        return stats;
    }

    /**
     * Genera un ID único para las transacciones
     * @returns String único basado en timestamp y random
     */
    private generateId(): string {
        return `trans_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }
}

// ==================== GESTOR DE PRESUPUESTOS ====================

/**
 * Gestor de presupuestos mensuales por categoría
 * Permite definir límites de gasto y hacer seguimiento del progreso
 */
class BudgetManager {
    private readonly STORAGE_KEY = 'finance_budgets';
    private storage: LocalStorageRepository;
    private budgets: Budget[] = [];

    constructor(storage: LocalStorageRepository) {
        this.storage = storage;
        this.loadBudgets();
    }

    /**
     * Carga presupuestos desde el almacenamiento local
     */
    private loadBudgets(): void {
        const data = this.storage.load<Budget>(this.STORAGE_KEY);
        // Convertir fechas de string a Date objects
        this.budgets = data.map(budget => ({
            ...budget,
            createdAt: new Date(budget.createdAt)
        }));
    }

    /**
     * Guarda presupuestos en el almacenamiento local
     */
    private saveBudgets(): void {
        this.storage.save(this.STORAGE_KEY, this.budgets);
    }

    /**
     * Crea o actualiza un presupuesto para una categoría específica
     * @param category - Categoría del presupuesto
     * @param amount - Monto límite del presupuesto
     * @param month - Mes del presupuesto (YYYY-MM)
     * @returns ID del presupuesto creado/actualizado
     */
    public setBudget(category: string, amount: number, month: string): string {
        if (amount <= 0) {
            throw new Error('El monto del presupuesto debe ser mayor a 0');
        }

        // Buscar si ya existe un presupuesto para esta categoría y mes
        const existingBudget = this.budgets.find(
            budget => budget.category === category && budget.month === month
        );

        if (existingBudget) {
            // Actualizar presupuesto existente
            existingBudget.amount = amount;
            this.saveBudgets();
            return existingBudget.id;
        } else {
            // Crear nuevo presupuesto
            const newBudget: Budget = {
                id: this.generateId(),
                category,
                amount,
                spent: 0, // Se calculará dinámicamente
                month,
                createdAt: new Date()
            };

            this.budgets.push(newBudget);
            this.saveBudgets();
            return newBudget.id;
        }
    }

    /**
     * Obtiene presupuestos para un mes específico
     * @param month - Mes en formato YYYY-MM
     * @returns Array de presupuestos del mes
     */
    public getBudgets(month: string): Budget[] {
        return this.budgets.filter(budget => budget.month === month);
    }

    /**
     * Obtiene un presupuesto específico por categoría y mes
     * @param category - Categoría del presupuesto
     * @param month - Mes del presupuesto
     * @returns Presupuesto encontrado o undefined
     */
    public getBudgetByCategory(category: string, month: string): Budget | undefined {
        return this.budgets.find(
            budget => budget.category === category && budget.month === month
        );
    }

    /**
     * Actualiza el monto gastado de un presupuesto basado en transacciones
     * @param category - Categoría del presupuesto
     * @param month - Mes del presupuesto
     * @param spentAmount - Monto gastado
     */
    public updateSpentAmount(category: string, month: string, spentAmount: number): void {
        const budget = this.getBudgetByCategory(category, month);
        if (budget) {
            budget.spent = spentAmount;
            this.saveBudgets();
        }
    }

    /**
     * Elimina un presupuesto
     * @param id - ID del presupuesto a eliminar
     * @returns true si se eliminó, false si no se encontró
     */
    public deleteBudget(id: string): boolean {
        const index = this.budgets.findIndex(budget => budget.id === id);
        if (index !== -1) {
            this.budgets.splice(index, 1);
            this.saveBudgets();
            return true;
        }
        return false;
    }

    /**
     * Calcula el progreso de todos los presupuestos de un mes
     * @param month - Mes a evaluar
     * @param transactionManager - Manager de transacciones para calcular gastos
     * @returns Array con el progreso de cada presupuesto
     */
    public getBudgetProgress(month: string, transactionManager: TransactionManager): {
        budget: Budget,
        progress: number,
        remaining: number,
        isOverBudget: boolean
    }[] {
        const budgets = this.getBudgets(month);
        
        return budgets.map(budget => {
            // Calcular el gasto real para esta categoría en el mes
            const categoryTransactions = transactionManager.getTransactions({
                type: 'expense',
                category: budget.category,
                month: month
            });

            const actualSpent = categoryTransactions.reduce((sum, trans) => sum + trans.amount, 0);
            
            // Actualizar el monto gastado en el presupuesto
            budget.spent = actualSpent;

            const progress = (actualSpent / budget.amount) * 100;
            const remaining = budget.amount - actualSpent;
            const isOverBudget = actualSpent > budget.amount;

            return {
                budget,
                progress: Math.min(progress, 100),
                remaining,
                isOverBudget
            };
        });
    }

    /**
     * Genera un ID único para los presupuestos
     * @returns String único basado en timestamp y random
     */
    private generateId(): string {
        return `budget_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }
}

// ==================== GESTOR DE METAS DE AHORRO ====================

/**
 * Gestor de metas de ahorro y objetivos financieros
 * Permite crear, seguir y completar metas de ahorro
 */
class GoalManager {
    private readonly STORAGE_KEY = 'finance_goals';
    private storage: LocalStorageRepository;
    private goals: Goal[] = [];

    constructor(storage: LocalStorageRepository) {
        this.storage = storage;
        this.loadGoals();
    }

    /**
     * Carga metas desde el almacenamiento local
     */
    private loadGoals(): void {
        const data = this.storage.load<Goal>(this.STORAGE_KEY);
        // Convertir fechas de string a Date objects
        this.goals = data.map(goal => ({
            ...goal,
            deadline: new Date(goal.deadline),
            createdAt: new Date(goal.createdAt)
        }));
    }

    /**
     * Guarda metas en el almacenamiento local
     */
    private saveGoals(): void {
        this.storage.save(this.STORAGE_KEY, this.goals);
    }

    /**
     * Crea una nueva meta de ahorro
     * @param goalData - Datos de la meta sin ID ni fecha de creación
     * @returns ID de la meta creada
     */
    public addGoal(goalData: Omit<Goal, 'id' | 'completed' | 'createdAt'>): string {
        // Validaciones de negocio
        if (goalData.amount <= 0) {
            throw new Error('El monto objetivo debe ser mayor a 0');
        }

        if (goalData.currentSaved < 0) {
            throw new Error('El monto ya ahorrado no puede ser negativo');
        }

        if (goalData.deadline <= new Date()) {
            throw new Error('La fecha límite debe ser futura');
        }

        if (!goalData.name.trim()) {
            throw new Error('El nombre de la meta es requerido');
        }

        const newGoal: Goal = {
            id: this.generateId(),
            ...goalData,
            name: goalData.name.trim(),
            description: goalData.description?.trim(),
            completed: goalData.currentSaved >= goalData.amount,
            createdAt: new Date()
        };

        this.goals.push(newGoal);
        this.saveGoals();
        return newGoal.id;
    }

    /**
     * Obtiene todas las metas con filtros opcionales
     * @param filters - Filtros a aplicar
     * @returns Array de metas filtradas
     */
    public getGoals(filters?: {
        completed?: boolean;
        active?: boolean; // Metas no vencidas
    }): Goal[] {
        let filtered = [...this.goals];

        if (filters) {
            if (filters.completed !== undefined) {
                filtered = filtered.filter(goal => goal.completed === filters.completed);
            }

            if (filters.active !== undefined && filters.active) {
                const now = new Date();
                filtered = filtered.filter(goal => goal.deadline > now && !goal.completed);
            }
        }

        // Ordenar por fecha límite ascendente
        return filtered.sort((a, b) => a.deadline.getTime() - b.deadline.getTime());
    }

    /**
     * Actualiza el progreso de una meta de ahorro
     * @param id - ID de la meta
     * @param currentSaved - Nuevo monto ahorrado
     * @returns true si se actualizó, false si no se encontró
     */
    public updateGoalProgress(id: string, currentSaved: number): boolean {
        if (currentSaved < 0) {
            throw new Error('El monto ahorrado no puede ser negativo');
        }

        const goal = this.goals.find(g => g.id === id);
        if (goal) {
            goal.currentSaved = currentSaved;
            goal.completed = currentSaved >= goal.amount;
            this.saveGoals();
            return true;
        }
        return false;
    }

    /**
     * Elimina una meta
     * @param id - ID de la meta a eliminar
     * @returns true si se eliminó, false si no se encontró
     */
    public deleteGoal(id: string): boolean {
        const index = this.goals.findIndex(goal => goal.id === id);
        if (index !== -1) {
            this.goals.splice(index, 1);
            this.saveGoals();
            return true;
        }
        return false;
    }

    /**
     * Actualiza una meta existente
     * @param id - ID de la meta
     * @param updates - Campos a actualizar
     * @returns true si se actualizó, false si no se encontró
     */
    public updateGoal(id: string, updates: Partial<Omit<Goal, 'id' | 'createdAt'>>): boolean {
        const goal = this.goals.find(g => g.id === id);
        if (goal) {
            // Validaciones si se están actualizando campos críticos
            if (updates.amount !== undefined && updates.amount <= 0) {
                throw new Error('El monto objetivo debe ser mayor a 0');
            }

            if (updates.currentSaved !== undefined && updates.currentSaved < 0) {
                throw new Error('El monto ahorrado no puede ser negativo');
            }

            if (updates.deadline !== undefined && updates.deadline <= new Date()) {
                throw new Error('La fecha límite debe ser futura');
            }

            Object.assign(goal, updates);
            
            // Recalcular estado de completitud
            goal.completed = goal.currentSaved >= goal.amount;
            
            this.saveGoals();
            return true;
        }
        return false;
    }

    /**
     * Calcula estadísticas de progreso para todas las metas
     * @returns Estadísticas generales de metas
     */
    public getGoalStats(): {
        totalGoals: number;
        completedGoals: number;
        activeGoals: number;
        totalTargetAmount: number;
        totalSavedAmount: number;
        averageProgress: number;
    } {
        const activeGoals = this.getGoals({ active: true });
        const completedGoals = this.getGoals({ completed: true });

        const totalTargetAmount = this.goals.reduce((sum, goal) => sum + goal.amount, 0);
        const totalSavedAmount = this.goals.reduce((sum, goal) => sum + goal.currentSaved, 0);
        
        const averageProgress = this.goals.length > 0 
            ? (totalSavedAmount / totalTargetAmount) * 100 
            : 0;

        return {
            totalGoals: this.goals.length,
            completedGoals: completedGoals.length,
            activeGoals: activeGoals.length,
            totalTargetAmount,
            totalSavedAmount,
            averageProgress: Math.min(averageProgress, 100)
        };
    }

    /**
     * Obtiene metas que están próximas a vencer (dentro de 30 días)
     * @returns Array de metas próximas a vencer
     */
    public getUpcomingDeadlines(): Goal[] {
        const now = new Date();
        const thirtyDaysFromNow = new Date(now.getTime() + (30 * 24 * 60 * 60 * 1000));

        return this.goals.filter(goal => 
            !goal.completed && 
            goal.deadline > now && 
            goal.deadline <= thirtyDaysFromNow
        ).sort((a, b) => a.deadline.getTime() - b.deadline.getTime());
    }

    /**
     * Genera un ID único para las metas
     * @returns String único basado en timestamp y random
     */
    private generateId(): string {
        return `goal_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }
}

// ==================== GESTOR DE REPORTES ====================

/**
 * Gestor de reportes y análisis financieros
 * Genera reportes detallados y estadísticas sobre las finanzas
 */
class ReportManager {
    private transactionManager: TransactionManager;
    private categoryManager: CategoryManager;
    private budgetManager: BudgetManager;
    private goalManager: GoalManager;

    constructor(
        transactionManager: TransactionManager,
        categoryManager: CategoryManager,
        budgetManager: BudgetManager,
        goalManager: GoalManager
    ) {
        this.transactionManager = transactionManager;
        this.categoryManager = categoryManager;
        this.budgetManager = budgetManager;
        this.goalManager = goalManager;
    }

    /**
     * Genera un reporte completo para un período específico
     * @param period - Período del reporte
     * @returns Reporte completo con todas las estadísticas
     */
    public generateReport(period: ReportPeriod): {
        period: ReportPeriod;
        dateRange: { start: Date; end: Date };
        summary: FinancialSummary;
        categoryBreakdown: {[category: string]: {amount: number, count: number, percentage: number, type: TransactionType}};
        monthlyTrend: {month: string, income: number, expenses: number, balance: number}[];
        budgetComparison: any[];
        goalProgress: any;
        insights: string[];
    } {
        const dateRange = this.getDateRangeForPeriod(period);
        
        // Calcular resumen financiero
        const summary = this.calculatePeriodSummary(dateRange.start, dateRange.end);
        
        // Desglose por categorías
        const categoryStats = this.transactionManager.getCategoryStats(dateRange.start, dateRange.end);
        const totalAmount = Object.values(categoryStats).reduce((sum, stat) => sum + stat.amount, 0);
        
        const categoryBreakdown: {[category: string]: {amount: number, count: number, percentage: number, type: TransactionType}} = {};
        Object.entries(categoryStats).forEach(([category, stats]) => {
            categoryBreakdown[category] = {
                ...stats,
                percentage: totalAmount > 0 ? (stats.amount / totalAmount) * 100 : 0
            };
        });

        // Tendencia mensual
        const monthlyTrend = this.getMonthlyTrend(dateRange.start, dateRange.end);

        // Comparación con presupuesto (solo para mes actual si aplica)
        const budgetComparison = period === 'current-month' 
            ? this.getBudgetComparison(new Date().toISOString().substr(0, 7))
            : [];

        // Progreso de metas
        const goalProgress = this.goalManager.getGoalStats();

        // Insights automáticos
        const insights = this.generateInsights(summary, categoryBreakdown, monthlyTrend, budgetComparison);

        return {
            period,
            dateRange,
            summary,
            categoryBreakdown,
            monthlyTrend,
            budgetComparison,
            goalProgress,
            insights
        };
    }

    /**
     * Calcula el rango de fechas para un período específico
     * @param period - Período solicitado
     * @returns Rango de fechas de inicio y fin
     */
    private getDateRangeForPeriod(period: ReportPeriod): { start: Date; end: Date } {
        const now = new Date();
        const start = new Date();
        const end = new Date();

        switch (period) {
            case 'current-month':
                start.setDate(1);
                start.setHours(0, 0, 0, 0);
                end.setTime(now.getTime());
                break;

            case 'last-month':
                start.setMonth(now.getMonth() - 1);
                start.setDate(1);
                start.setHours(0, 0, 0, 0);
                end.setMonth(now.getMonth() - 1);
                end.setDate(new Date(now.getFullYear(), now.getMonth(), 0).getDate());
                end.setHours(23, 59, 59, 999);
                break;

            case 'last-3-months':
                start.setMonth(now.getMonth() - 3);
                start.setDate(1);
                start.setHours(0, 0, 0, 0);
                end.setTime(now.getTime());
                break;

            case 'last-6-months':
                start.setMonth(now.getMonth() - 6);
                start.setDate(1);
                start.setHours(0, 0, 0, 0);
                end.setTime(now.getTime());
                break;

            case 'current-year':
                start.setMonth(0);
                start.setDate(1);
                start.setHours(0, 0, 0, 0);
                end.setTime(now.getTime());
                break;
        }

        return { start, end };
    }

    /**
     * Calcula el resumen financiero para un período
     * @param startDate - Fecha de inicio
     * @param endDate - Fecha de fin
     * @returns Resumen financiero del período
     */
    private calculatePeriodSummary(startDate: Date, endDate: Date): FinancialSummary {
        const transactions = this.transactionManager.getTransactions({ startDate, endDate });

        const totalIncome = transactions
            .filter(trans => trans.type === 'income')
            .reduce((sum, trans) => sum + trans.amount, 0);

        const totalExpenses = transactions
            .filter(trans => trans.type === 'expense')
            .reduce((sum, trans) => sum + trans.amount, 0);

        const balance = totalIncome - totalExpenses;
        
        // Para el período, los ahorros son el balance acumulado
        const totalSavings = Math.max(0, balance);

        return {
            totalIncome,
            totalExpenses,
            balance,
            totalSavings
        };
    }

    /**
     * Obtiene la tendencia mensual para un rango de fechas
     * @param startDate - Fecha de inicio
     * @param endDate - Fecha de fin
     * @returns Array con datos mensuales
     */
    private getMonthlyTrend(startDate: Date, endDate: Date): {month: string, income: number, expenses: number, balance: number}[] {
        const months: {month: string, income: number, expenses: number, balance: number}[] = [];
        const current = new Date(startDate);

        while (current <= endDate) {
            const monthKey = current.toISOString().substr(0, 7);
            const monthSummary = this.transactionManager.getFinancialSummary(monthKey);

            months.push({
                month: monthKey,
                income: monthSummary.totalIncome,
                expenses: monthSummary.totalExpenses,
                balance: monthSummary.balance
            });

            current.setMonth(current.getMonth() + 1);
        }

        return months;
    }

    /**
     * Obtiene la comparación con presupuesto para un mes
     * @param month - Mes en formato YYYY-MM
     * @returns Array con comparación de presupuesto
     */
    private getBudgetComparison(month: string): any[] {
        return this.budgetManager.getBudgetProgress(month, this.transactionManager);
    }

    /**
     * Genera insights automáticos basados en los datos
     * @param summary - Resumen financiero
     * @param categoryBreakdown - Desglose por categorías
     * @param monthlyTrend - Tendencia mensual
     * @param budgetComparison - Comparación con presupuesto
     * @returns Array de insights
     */
    private generateInsights(
        summary: FinancialSummary,
        categoryBreakdown: any,
        monthlyTrend: any[],
        budgetComparison: any[]
    ): string[] {
        const insights: string[] = [];

        // Insight sobre balance
        if (summary.balance > 0) {
            insights.push(`💰 Excelente! Tienes un balance positivo de $${summary.balance.toFixed(2)}`);
        } else if (summary.balance < 0) {
            insights.push(`⚠️ Atención: Tienes un déficit de $${Math.abs(summary.balance).toFixed(2)}`);
        }

        // Insight sobre categoría con mayor gasto
        const expenseCategories = Object.entries(categoryBreakdown)
            .filter(([_, stats]: [string, any]) => stats.type === 'expense')
            .sort(([_, a]: [string, any], [__, b]: [string, any]) => b.amount - a.amount);

        if (expenseCategories.length > 0) {
            const [topCategory, stats] = expenseCategories[0] as [string, any];
            insights.push(`📊 Tu mayor gasto es en ${topCategory}: $${stats.amount.toFixed(2)} (${stats.percentage.toFixed(1)}%)`);
        }

        // Insight sobre tendencia
        if (monthlyTrend.length >= 2) {
            const lastMonth = monthlyTrend[monthlyTrend.length - 1];
            const previousMonth = monthlyTrend[monthlyTrend.length - 2];
            
            if (lastMonth.expenses > previousMonth.expenses) {
                const increase = ((lastMonth.expenses - previousMonth.expenses) / previousMonth.expenses) * 100;
                insights.push(`📈 Tus gastos aumentaron ${increase.toFixed(1)}% respecto al mes anterior`);
            } else if (lastMonth.expenses < previousMonth.expenses) {
                const decrease = ((previousMonth.expenses - lastMonth.expenses) / previousMonth.expenses) * 100;
                insights.push(`📉 ¡Bien! Redujiste tus gastos ${decrease.toFixed(1)}% respecto al mes anterior`);
            }
        }

        // Insight sobre presupuesto
        const overBudgetCategories = budgetComparison.filter(item => item.isOverBudget);
        if (overBudgetCategories.length > 0) {
            insights.push(`🚨 Te excediste en ${overBudgetCategories.length} categoría(s) de presupuesto`);
        }

        return insights;
    }
}

// ==================== PROCESADOR DE PDFs ====================

/**
 * Clase para procesar archivos PDF y extraer texto
 * Utiliza PDF.js para leer PDFs del navegador
 */
class PDFProcessor {
    
    /**
     * Extrae texto completo de un archivo PDF
     * @param file - Archivo PDF subido por el usuario
     * @returns Promesa con el texto extraído
     */
    public async extractTextFromPDF(file: File): Promise<string> {
        try {
            // Verificar que sea un PDF válido
            if (file.type !== 'application/pdf') {
                throw new Error('El archivo debe ser un PDF válido');
            }

            // Convertir el archivo a ArrayBuffer
            const arrayBuffer = await file.arrayBuffer();
            
            // Configurar PDF.js worker
            const pdfjs = (window as any).pdfjsLib;
            if (typeof pdfjs !== 'undefined') {
                pdfjs.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
            }

            // Cargar el documento PDF
            const pdf = await pdfjs.getDocument({ data: arrayBuffer }).promise;
            let fullText = '';

            // Extraer texto de cada página
            for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
                const page = await pdf.getPage(pageNum);
                const textContent = await page.getTextContent();
                
                // Combinar todos los elementos de texto de la página
                const pageText = textContent.items
                    .map((item: any) => item.str)
                    .join(' ');
                
                fullText += `\n--- PÁGINA ${pageNum} ---\n${pageText}\n`;
            }

            return fullText.trim();

        } catch (error) {
            console.error('Error procesando PDF:', error);
            throw new Error(`Error procesando PDF: ${error instanceof Error ? error.message : 'Error desconocido'}`);
        }
    }

    /**
     * Procesa y limpia el texto extraído para mejor análisis
     * @param rawText - Texto crudo extraído del PDF
     * @returns Texto limpio y estructurado
     */
    public cleanExtractedText(rawText: string): string {
        return rawText
            // Eliminar líneas de página
            .replace(/--- PÁGINA \d+ ---/g, '\n')
            // Normalizar espacios en blanco
            .replace(/\s+/g, ' ')
            // Eliminar caracteres extraños
            .replace(/[^\w\s\.\,\-\$\:\;\(\)\/\n]/g, ' ')
            // Normalizar saltos de línea
            .replace(/\n+/g, '\n')
            .trim();
    }
}

// ==================== ANALIZADOR CON IA ====================

/**
 * Clase para analizar texto con LLM (OpenAI GPT-4)
 * Extrae y estructura gastos de texto financiero
 */
class AIAnalyzer {
    private config: LLMConfig;

    constructor() {
        // Configuración por defecto - el usuario deberá proporcionar su API Key
        this.config = {
            apiKey: '', // Se configurará dinámicamente
            model: 'gpt-4o-mini', // Modelo más económico pero efectivo
            maxTokens: 2000,
            temperature: 0.3 // Baja para respuestas más consistentes
        };
    }

    /**
     * Configura la API Key de OpenAI
     * @param apiKey - Clave de la API de OpenAI
     */
    public setApiKey(apiKey: string): void {
        this.config.apiKey = apiKey;
    }

    /**
     * Analiza texto financiero y extrae gastos estructurados
     * @param text - Texto extraído del PDF
     * @returns Promesa con análisis de gastos
     */
    public async analyzeExpenses(text: string): Promise<AIAnalysisResponse> {
        try {
            if (!this.config.apiKey) {
                throw new Error('API Key de OpenAI no configurada');
            }

            const prompt = this.buildAnalysisPrompt(text);
            const response = await this.callOpenAI(prompt);
            
            return this.parseAIResponse(response);

        } catch (error) {
            console.error('Error en análisis de IA:', error);
            return {
                success: false,
                expenses: [],
                confidence: 0,
                summary: 'Error en el análisis',
                error: error instanceof Error ? error.message : 'Error desconocido'
            };
        }
    }

    /**
     * Construye el prompt optimizado para extraer gastos
     * @param text - Texto a analizar
     * @returns Prompt estructurado para el LLM
     */
    private buildAnalysisPrompt(text: string): string {
        return `
Eres un experto contador especializado en análisis de documentos financieros. 
Analiza el siguiente texto extraído de un PDF financiero (estado de cuenta, recibos, etc.) y extrae TODOS los gastos/transacciones encontrados.

TEXTO A ANALIZAR:
${text}

INSTRUCCIONES:
1. Identifica cada transacción/gasto individual
2. Para cada gasto extrae: fecha, descripción, monto, categoría probable, método de pago probable
3. Usa formato JSON estricto 
4. Asigna nivel de confianza: "high", "medium", "low"
5. Categorías disponibles: "Alimentación", "Transporte", "Servicios", "Entretenimiento", "Salud", "Educación", "Ropa", "Otros Gastos"
6. Métodos de pago: "card", "cash", "transfer", "check"

FORMATO DE RESPUESTA (JSON válido):
{
  "success": true,
  "confidence": 0.85,
  "summary": "Encontrados X gastos del período Y a Z",
  "expenses": [
    {
      "date": "2024-01-15",
      "description": "Compra supermercado",
      "amount": 85.50,
      "category": "Alimentación", 
      "paymentMethod": "card",
      "confidence": "high",
      "originalText": "texto original relevante"
    }
  ]
}

IMPORTANTE: 
- Solo incluye gastos/débitos, NO ingresos
- Montos siempre positivos
- Fechas en formato YYYY-MM-DD
- Descripciones claras y concisas
- NO incluyas explicaciones adicionales, solo el JSON
`;
    }

    /**
     * Llama a la API de OpenAI
     * @param prompt - Prompt para enviar
     * @returns Respuesta de la API
     */
    private async callOpenAI(prompt: string): Promise<string> {
        const response = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${this.config.apiKey}`
            },
            body: JSON.stringify({
                model: this.config.model,
                messages: [
                    {
                        role: 'system',
                        content: 'Eres un asistente especializado en análisis de documentos financieros. Respondes únicamente con JSON válido.'
                    },
                    {
                        role: 'user', 
                        content: prompt
                    }
                ],
                max_tokens: this.config.maxTokens,
                temperature: this.config.temperature
            })
        });

        if (!response.ok) {
            const errorData = await response.text();
            throw new Error(`Error API OpenAI (${response.status}): ${errorData}`);
        }

        const data = await response.json();
        return data.choices[0].message.content;
    }

    /**
     * Procesa la respuesta de la IA y la convierte a estructura tipada
     * @param aiResponse - Respuesta cruda de la IA
     * @returns Análisis estructurado
     */
    private parseAIResponse(aiResponse: string): AIAnalysisResponse {
        try {
            // Limpiar respuesta si tiene texto adicional
            let jsonStr = aiResponse.trim();
            
            // Extraer solo el JSON si hay texto extra
            const jsonStart = jsonStr.indexOf('{');
            const jsonEnd = jsonStr.lastIndexOf('}');
            
            if (jsonStart !== -1 && jsonEnd !== -1) {
                jsonStr = jsonStr.substring(jsonStart, jsonEnd + 1);
            }

            const parsed = JSON.parse(jsonStr);

            // Validar estructura básica
            if (!parsed.expenses || !Array.isArray(parsed.expenses)) {
                throw new Error('Formato de respuesta inválido');
            }

            // Procesar cada gasto y agregar ID único
            const processedExpenses: ExtractedExpense[] = parsed.expenses.map((expense: any, index: number) => ({
                id: `temp_${Date.now()}_${index}`,
                date: expense.date || new Date().toISOString().split('T')[0],
                description: expense.description || 'Gasto sin descripción',
                amount: Math.abs(parseFloat(expense.amount) || 0),
                category: expense.category || 'Otros Gastos',
                paymentMethod: expense.paymentMethod || 'card',
                confidence: expense.confidence || 'low',
                isSelected: true, // Por defecto seleccionado
                originalText: expense.originalText || ''
            }));

            return {
                success: true,
                expenses: processedExpenses,
                confidence: parsed.confidence || 0.5,
                summary: parsed.summary || `Encontrados ${processedExpenses.length} gastos`,
                error: undefined
            };

        } catch (error) {
            console.error('Error parseando respuesta de IA:', error);
            return {
                success: false,
                expenses: [],
                confidence: 0,
                summary: 'Error procesando respuesta de IA',
                error: `Error de parsing: ${error instanceof Error ? error.message : 'Error desconocido'}`
            };
        }
    }
}

// ==================== CONTROLADOR PRINCIPAL ====================

/**
 * Controlador principal de la aplicación de finanzas
 * Orquesta toda la interacción entre la UI y la lógica de negocio
 * Patrón Controller: Centraliza el manejo de eventos y actualización de la UI
 */
class FinanceController {
    // Managers de negocio
    private storage: LocalStorageRepository;
    private categoryManager: CategoryManager;
    private transactionManager: TransactionManager;
    private budgetManager: BudgetManager;
    private goalManager: GoalManager;
    private reportManager: ReportManager;

    // Procesadores para PDF e IA
    private pdfProcessor: PDFProcessor;
    private aiAnalyzer: AIAnalyzer;

    // Referencias a elementos del DOM
    private elements: {[key: string]: HTMLElement | HTMLInputElement | HTMLSelectElement} = {};

    // Estado para gastos extraídos del PDF
    private currentExtractedExpenses: ExtractedExpense[] = [];

    constructor() {
        // Inicializar capa de persistencia
        this.storage = new LocalStorageRepository();
        
        // Inicializar managers de negocio
        this.categoryManager = new CategoryManager(this.storage);
        this.transactionManager = new TransactionManager(this.storage);
        this.budgetManager = new BudgetManager(this.storage);
        this.goalManager = new GoalManager(this.storage);
        this.reportManager = new ReportManager(
            this.transactionManager,
            this.categoryManager,
            this.budgetManager,
            this.goalManager
        );

        // Inicializar procesadores para PDF e IA
        this.pdfProcessor = new PDFProcessor();
        this.aiAnalyzer = new AIAnalyzer();

        // Inicializar cuando el DOM esté listo
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => this.initialize());
        } else {
            this.initialize();
        }
    }

    /**
     * Inicializa la aplicación
     * Configura elementos del DOM, event listeners y actualiza la UI inicial
     */
    private initialize(): void {
        try {
            this.initializeElements();
            this.setupEventListeners();
            this.setupTabNavigation();
            this.populateCategories();
            this.updateDashboard();
            this.renderTransactions();
            this.renderCategories();
            this.renderBudgets();
            this.renderGoals();
            
            console.log('💰 Sistema de Finanzas Fede Life inicializado correctamente');
        } catch (error) {
            console.error('❌ Error inicializando la aplicación:', error);
            this.showNotification('Error al inicializar la aplicación', 'error');
        }
    }

    /**
     * Obtiene y almacena referencias a elementos del DOM
     */
    private initializeElements(): void {
        const elementIds = [
            // Dashboard
            'totalIncome', 'totalExpenses', 'totalBalance', 'totalSavings',
            
            // Formulario de transacciones
            'transactionForm', 'transactionType', 'transactionAmount', 
            'transactionDescription', 'transactionCategory', 'transactionDate', 
            'paymentMethod', 'transactionsList',
            
            // Filtros de transacciones
            'filterType', 'filterCategory', 'filterMonth',
            
            // Formulario de categorías
            'categoryForm', 'categoryType', 'categoryName', 'categoryColor', 
            'categoryDescription', 'incomeCategoriesList', 'expenseCategoriesList',
            
            // Presupuesto
            'budgetModal', 'budgetForm', 'budgetCategory', 'budgetAmount', 
            'budgetList', 'addBudgetBtn',
            
            // Metas
            'goalForm', 'goalName', 'goalAmount', 'goalDeadline', 
            'currentSaved', 'goalDescription', 'goalsList',
            
            // Reportes
            'reportPeriod', 'generateReport', 'reportResults',
            
            // PDF Uploader
            'pdfFile', 'processPdfBtn', 'pdfProcessingStatus', 'extractedExpenses',
            'expensesList', 'selectAllExpenses', 'addSelectedExpenses'
        ];

        elementIds.forEach(id => {
            const element = document.getElementById(id);
            if (element) {
                this.elements[id] = element as HTMLElement;
            }
        });

        // Verificar elementos críticos
        const criticalElements = ['transactionForm', 'categoryForm', 'goalForm'];
        criticalElements.forEach(id => {
            if (!this.elements[id]) {
                throw new Error(`Elemento crítico no encontrado: ${id}`);
            }
        });
    }

    /**
     * Configura todos los event listeners
     */
    private setupEventListeners(): void {
        // Formulario de transacciones
        this.elements.transactionForm?.addEventListener('submit', (e) => this.handleTransactionSubmit(e));
        
        // Formulario de categorías
        this.elements.categoryForm?.addEventListener('submit', (e) => this.handleCategorySubmit(e));
        
        // Formulario de metas
        this.elements.goalForm?.addEventListener('submit', (e) => this.handleGoalSubmit(e));
        
        // Formulario de presupuesto
        this.elements.budgetForm?.addEventListener('submit', (e) => this.handleBudgetSubmit(e));
        
        // Filtros de transacciones
        ['filterType', 'filterCategory', 'filterMonth'].forEach(filterId => {
            this.elements[filterId]?.addEventListener('change', () => this.renderTransactions());
        });
        
        // Cambio de tipo de transacción para cargar categorías correspondientes
        this.elements.transactionType?.addEventListener('change', () => this.populateTransactionCategories());
        
        // Pestañas de categorías (ingresos/gastos)
        document.querySelectorAll('.category-tab-btn').forEach(btn => {
            btn.addEventListener('click', (e) => this.handleCategoryTabChange(e));
        });
        
        // Botón de agregar presupuesto
        this.elements.addBudgetBtn?.addEventListener('click', () => this.showBudgetModal());
        
        // Cerrar modal de presupuesto
        document.querySelector('.modal .close')?.addEventListener('click', () => this.hideBudgetModal());
        
        // Generación de reportes
        this.elements.generateReport?.addEventListener('click', () => this.generateReport());
        
        // PDF Uploader
        this.elements.pdfFile?.addEventListener('change', (e) => this.handlePdfFileSelection(e));
        this.elements.processPdfBtn?.addEventListener('click', () => this.processPdfFile());
        this.elements.selectAllExpenses?.addEventListener('click', () => this.toggleSelectAllExpenses());
        this.elements.addSelectedExpenses?.addEventListener('click', () => this.addSelectedExpensesToTransactions());
        
        // Fecha por defecto en formularios
        this.setDefaultDates();
    }

    /**
     * Configura la navegación entre pestañas
     */
    private setupTabNavigation(): void {
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const target = e.target as HTMLElement;
                const tabName = target.dataset.tab;
                
                if (tabName) {
                    this.switchTab(tabName);
                }
            });
        });
    }

    /**
     * Cambia entre pestañas
     * @param tabName - Nombre de la pestaña a mostrar
     */
    private switchTab(tabName: string): void {
        // Remover clase active de todos los botones y contenidos
        document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
        document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));
        
        // Activar pestaña seleccionada
        document.querySelector(`[data-tab="${tabName}"]`)?.classList.add('active');
        document.getElementById(tabName)?.classList.add('active');
        
        // Actualizar contenido específico de la pestaña
        switch (tabName) {
            case 'budget':
                this.renderBudgets();
                break;
            case 'goals':
                this.renderGoals();
                break;
            case 'categories':
                this.renderCategories();
                break;
            case 'transactions':
                this.renderTransactions();
                break;
        }
    }

    /**
     * Maneja el envío del formulario de transacciones
     * @param event - Evento del formulario
     */
    private async handleTransactionSubmit(event: Event): Promise<void> {
        event.preventDefault();
        
        try {
            const form = event.target as HTMLFormElement;
            const formData = new FormData(form);
            
            // Obtener y validar datos del formulario
            const type = (this.elements.transactionType as HTMLSelectElement).value as TransactionType;
            const amount = parseFloat((this.elements.transactionAmount as HTMLInputElement).value);
            const description = (this.elements.transactionDescription as HTMLInputElement).value;
            const category = (this.elements.transactionCategory as HTMLSelectElement).value;
            const date = new Date((this.elements.transactionDate as HTMLInputElement).value);
            const paymentMethod = (this.elements.paymentMethod as HTMLSelectElement).value as PaymentMethod;

            // Validaciones del frontend
            if (!type || !amount || !description || !category || !paymentMethod) {
                throw new Error('Todos los campos son requeridos');
            }

            // Crear transacción usando el manager
            const transactionId = this.transactionManager.addTransaction({
                type,
                amount,
                description,
                category,
                date,
                paymentMethod
            });

            // Actualizar UI
            this.updateDashboard();
            this.renderTransactions();
            form.reset();
            this.setDefaultDates();
            
            this.showNotification(`Transacción agregada correctamente`, 'success');
            
        } catch (error) {
            console.error('Error agregando transacción:', error);
            this.showNotification(error instanceof Error ? error.message : 'Error agregando transacción', 'error');
        }
    }

    /**
     * Maneja el envío del formulario de categorías
     * @param event - Evento del formulario
     */
    private async handleCategorySubmit(event: Event): Promise<void> {
        event.preventDefault();
        
        try {
            const type = (this.elements.categoryType as HTMLSelectElement).value as TransactionType;
            const name = (this.elements.categoryName as HTMLInputElement).value;
            const color = (this.elements.categoryColor as HTMLInputElement).value;
            const description = (this.elements.categoryDescription as HTMLInputElement).value;

            if (!type || !name) {
                throw new Error('Tipo y nombre son requeridos');
            }

            // Crear categoría usando el manager
            const categoryId = this.categoryManager.addCategory(name, type, color, description);

            // Actualizar UI
            this.populateCategories();
            this.renderCategories();
            (event.target as HTMLFormElement).reset();
            (this.elements.categoryColor as HTMLInputElement).value = '#3498db';
            
            this.showNotification(`Categoría "${name}" creada correctamente`, 'success');
            
        } catch (error) {
            console.error('Error creando categoría:', error);
            this.showNotification(error instanceof Error ? error.message : 'Error creando categoría', 'error');
        }
    }

    /**
     * Maneja el envío del formulario de metas
     * @param event - Evento del formulario
     */
    private async handleGoalSubmit(event: Event): Promise<void> {
        event.preventDefault();
        
        try {
            const name = (this.elements.goalName as HTMLInputElement).value;
            const amount = parseFloat((this.elements.goalAmount as HTMLInputElement).value);
            const deadline = new Date((this.elements.goalDeadline as HTMLInputElement).value);
            const currentSaved = parseFloat((this.elements.currentSaved as HTMLInputElement).value) || 0;
            const description = (this.elements.goalDescription as HTMLTextAreaElement).value;

            if (!name || !amount || !deadline) {
                throw new Error('Nombre, monto y fecha límite son requeridos');
            }

            // Crear meta usando el manager
            const goalId = this.goalManager.addGoal({
                name,
                amount,
                deadline,
                currentSaved,
                description
            });

            // Actualizar UI
            this.renderGoals();
            this.updateDashboard();
            (event.target as HTMLFormElement).reset();
            (this.elements.currentSaved as HTMLInputElement).value = '0';
            
            this.showNotification(`Meta "${name}" creada correctamente`, 'success');
            
        } catch (error) {
            console.error('Error creando meta:', error);
            this.showNotification(error instanceof Error ? error.message : 'Error creando meta', 'error');
        }
    }

    /**
     * Maneja el envío del formulario de presupuesto
     * @param event - Evento del formulario
     */
    private async handleBudgetSubmit(event: Event): Promise<void> {
        event.preventDefault();
        
        try {
            const category = (this.elements.budgetCategory as HTMLInputElement).value;
            const amount = parseFloat((this.elements.budgetAmount as HTMLInputElement).value);
            const currentMonth = new Date().toISOString().substr(0, 7);

            if (!category || !amount) {
                throw new Error('Categoría y monto son requeridos');
            }

            // Crear/actualizar presupuesto usando el manager
            const budgetId = this.budgetManager.setBudget(category, amount, currentMonth);

            // Actualizar UI
            this.renderBudgets();
            this.hideBudgetModal();
            (event.target as HTMLFormElement).reset();
            
            this.showNotification(`Presupuesto para "${category}" configurado correctamente`, 'success');
            
        } catch (error) {
            console.error('Error configurando presupuesto:', error);
            this.showNotification(error instanceof Error ? error.message : 'Error configurando presupuesto', 'error');
        }
    }

    /**
     * Actualiza el dashboard con el resumen financiero actual
     */
    private updateDashboard(): void {
        try {
            const summary = this.transactionManager.getFinancialSummary();
            
            // Actualizar elementos del dashboard
            if (this.elements.totalIncome) {
                this.elements.totalIncome.textContent = this.formatCurrency(summary.totalIncome);
            }
            
            if (this.elements.totalExpenses) {
                this.elements.totalExpenses.textContent = this.formatCurrency(summary.totalExpenses);
            }
            
            if (this.elements.totalBalance) {
                this.elements.totalBalance.textContent = this.formatCurrency(summary.balance);
                // Cambiar color según el balance
                const balanceCard = this.elements.totalBalance.closest('.summary-card');
                if (balanceCard) {
                    balanceCard.classList.remove('positive', 'negative');
                    balanceCard.classList.add(summary.balance >= 0 ? 'positive' : 'negative');
                }
            }
            
            if (this.elements.totalSavings) {
                this.elements.totalSavings.textContent = this.formatCurrency(summary.totalSavings);
            }
            
        } catch (error) {
            console.error('Error actualizando dashboard:', error);
        }
    }

    /**
     * Popula los selectores de categorías
     */
    private populateCategories(): void {
        this.populateTransactionCategories();
        this.populateFilterCategories();
    }

    /**
     * Popula las categorías en el formulario de transacciones
     */
    private populateTransactionCategories(): void {
        const typeSelect = this.elements.transactionType as HTMLSelectElement;
        const categorySelect = this.elements.transactionCategory as HTMLSelectElement;
        
        if (!typeSelect || !categorySelect) return;

        const selectedType = typeSelect.value as TransactionType;
        
        // Limpiar opciones actuales
        categorySelect.innerHTML = '<option value="">Categoría</option>';
        
        if (selectedType) {
            const categories = this.categoryManager.getCategories(selectedType);
            categories.forEach(category => {
                const option = document.createElement('option');
                option.value = category.name;
                option.textContent = category.name;
                categorySelect.appendChild(option);
            });
        }
    }

    /**
     * Popula las categorías en los filtros
     */
    private populateFilterCategories(): void {
        const filterSelect = this.elements.filterCategory as HTMLSelectElement;
        if (!filterSelect) return;

        filterSelect.innerHTML = '<option value="">Todas las categorías</option>';
        
        const allCategories = this.categoryManager.getCategories();
        allCategories.forEach(category => {
            const option = document.createElement('option');
            option.value = category.name;
            option.textContent = `${category.name} (${category.type === 'income' ? 'Ingreso' : 'Gasto'})`;
            filterSelect.appendChild(option);
        });
    }

    /**
     * Renderiza la lista de transacciones con filtros aplicados
     */
    private renderTransactions(): void {
        const container = this.elements.transactionsList;
        if (!container) return;

        try {
            // Obtener filtros actuales
            const typeFilter = (this.elements.filterType as HTMLSelectElement)?.value as TransactionType;
            const categoryFilter = (this.elements.filterCategory as HTMLSelectElement)?.value;
            const monthFilter = (this.elements.filterMonth as HTMLInputElement)?.value;

            // Construir filtros para el manager
            const filters: any = {};
            if (typeFilter) filters.type = typeFilter;
            if (categoryFilter) filters.category = categoryFilter;
            if (monthFilter) filters.month = monthFilter;

            // Obtener transacciones filtradas
            const transactions = this.transactionManager.getTransactions(filters);

            // Renderizar transacciones
            if (transactions.length === 0) {
                container.innerHTML = `
                    <div class="no-data">
                        <i class="fas fa-receipt"></i>
                        <p>No hay transacciones que mostrar</p>
                    </div>
                `;
                return;
            }

            container.innerHTML = transactions.map(transaction => `
                <div class="transaction-item ${transaction.type}" data-id="${transaction.id}">
                    <div class="transaction-icon">
                        <i class="fas ${transaction.type === 'income' ? 'fa-arrow-up' : 'fa-arrow-down'}"></i>
                    </div>
                    <div class="transaction-details">
                        <div class="transaction-main">
                            <span class="transaction-description">${transaction.description}</span>
                            <span class="transaction-amount ${transaction.type}">
                                ${transaction.type === 'income' ? '+' : '-'}${this.formatCurrency(transaction.amount)}
                            </span>
                        </div>
                        <div class="transaction-meta">
                            <span class="transaction-category">${transaction.category}</span>
                            <span class="transaction-date">${this.formatDate(transaction.date)}</span>
                            <span class="transaction-method">${this.formatPaymentMethod(transaction.paymentMethod)}</span>
                        </div>
                    </div>
                    <div class="transaction-actions">
                        <button class="action-btn edit" onclick="financeApp.editTransaction('${transaction.id}')" title="Editar">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="action-btn delete" onclick="financeApp.deleteTransaction('${transaction.id}')" title="Eliminar">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </div>
            `).join('');

        } catch (error) {
            console.error('Error renderizando transacciones:', error);
            container.innerHTML = `
                <div class="error-message">
                    <i class="fas fa-exclamation-circle"></i>
                    <p>Error cargando transacciones</p>
                </div>
            `;
        }
    }

    /**
     * Renderiza las categorías en sus respectivas pestañas
     */
    private renderCategories(): void {
        this.renderCategoriesByType('income');
        this.renderCategoriesByType('expense');
    }

    /**
     * Renderiza categorías por tipo específico
     * @param type - Tipo de categorías (income/expense)
     */
    private renderCategoriesByType(type: TransactionType): void {
        const containerId = type === 'income' ? 'incomeCategoriesList' : 'expenseCategoriesList';
        const container = this.elements[containerId];
        if (!container) return;

        try {
            const categories = this.categoryManager.getCategories(type);

            if (categories.length === 0) {
                container.innerHTML = `
                    <div class="no-data">
                        <i class="fas fa-tags"></i>
                        <p>No hay categorías de ${type === 'income' ? 'ingresos' : 'gastos'}</p>
                    </div>
                `;
                return;
            }

            container.innerHTML = categories.map(category => `
                <div class="category-item" data-id="${category.id}">
                    <div class="category-color" style="background-color: ${category.color}"></div>
                    <div class="category-info">
                        <div class="category-name">${category.name}</div>
                        ${category.description ? `<div class="category-description">${category.description}</div>` : ''}
                    </div>
                    <div class="category-actions">
                        <button class="action-btn edit" onclick="financeApp.editCategory('${category.id}')" title="Editar">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="action-btn delete" onclick="financeApp.deleteCategory('${category.id}')" title="Eliminar">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </div>
            `).join('');

        } catch (error) {
            console.error('Error renderizando categorías:', error);
            container.innerHTML = `
                <div class="error-message">
                    <i class="fas fa-exclamation-circle"></i>
                    <p>Error cargando categorías</p>
                </div>
            `;
        }
    }

    /**
     * Renderiza la lista de presupuestos
     */
    private renderBudgets(): void {
        const container = this.elements.budgetList;
        if (!container) return;

        try {
            const currentMonth = new Date().toISOString().substr(0, 7);
            const budgetProgress = this.budgetManager.getBudgetProgress(currentMonth, this.transactionManager);

            if (budgetProgress.length === 0) {
                container.innerHTML = `
                    <div class="no-data">
                        <i class="fas fa-chart-pie"></i>
                        <p>No hay presupuestos configurados para este mes</p>
                        <p>Usa el botón "Agregar Categoría" para crear uno</p>
                    </div>
                `;
                return;
            }

            container.innerHTML = budgetProgress.map(({ budget, progress, remaining, isOverBudget }) => `
                <div class="budget-item ${isOverBudget ? 'over-budget' : ''}">
                    <div class="budget-header">
                        <div class="budget-category">
                            <i class="fas fa-tag"></i>
                            ${budget.category}
                        </div>
                        <div class="budget-amount">
                            ${this.formatCurrency(budget.spent)} / ${this.formatCurrency(budget.amount)}
                        </div>
                    </div>
                    <div class="budget-progress-bar">
                        <div class="progress-fill ${isOverBudget ? 'over-budget' : ''}" 
                             style="width: ${Math.min(progress, 100)}%"></div>
                    </div>
                    <div class="budget-footer">
                        <span class="budget-percentage">${progress.toFixed(1)}% usado</span>
                        <span class="budget-remaining ${isOverBudget ? 'over' : 'under'}">
                            ${isOverBudget ? 'Excedido por' : 'Restante'}: ${this.formatCurrency(Math.abs(remaining))}
                        </span>
                    </div>
                    <div class="budget-actions">
                        <button class="action-btn edit" onclick="financeApp.editBudget('${budget.id}')" title="Editar">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="action-btn delete" onclick="financeApp.deleteBudget('${budget.id}')" title="Eliminar">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </div>
            `).join('');

        } catch (error) {
            console.error('Error renderizando presupuestos:', error);
            container.innerHTML = `
                <div class="error-message">
                    <i class="fas fa-exclamation-circle"></i>
                    <p>Error cargando presupuestos</p>
                </div>
            `;
        }
    }

    /**
     * Renderiza la lista de metas de ahorro
     */
    private renderGoals(): void {
        const container = this.elements.goalsList;
        if (!container) return;

        try {
            const goals = this.goalManager.getGoals();

            if (goals.length === 0) {
                container.innerHTML = `
                    <div class="no-data">
                        <i class="fas fa-target"></i>
                        <p>No hay metas de ahorro configuradas</p>
                        <p>Crea tu primera meta usando el formulario de arriba</p>
                    </div>
                `;
                return;
            }

            container.innerHTML = goals.map(goal => {
                const progress = (goal.currentSaved / goal.amount) * 100;
                const daysRemaining = Math.ceil((goal.deadline.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
                const isExpired = daysRemaining < 0;
                const isNearDeadline = daysRemaining <= 30 && daysRemaining > 0;

                return `
                    <div class="goal-item ${goal.completed ? 'completed' : ''} ${isExpired ? 'expired' : ''} ${isNearDeadline ? 'near-deadline' : ''}" data-id="${goal.id}">
                        <div class="goal-header">
                            <div class="goal-title">
                                <i class="fas ${goal.completed ? 'fa-check-circle' : 'fa-target'}"></i>
                                <span class="goal-name">${goal.name}</span>
                                ${goal.completed ? '<span class="goal-badge completed">Completada</span>' : ''}
                                ${isExpired && !goal.completed ? '<span class="goal-badge expired">Vencida</span>' : ''}
                                ${isNearDeadline && !goal.completed ? '<span class="goal-badge warning">Próxima a vencer</span>' : ''}
                            </div>
                            <div class="goal-amount">
                                ${this.formatCurrency(goal.currentSaved)} / ${this.formatCurrency(goal.amount)}
                            </div>
                        </div>
                        
                        ${goal.description ? `<div class="goal-description">${goal.description}</div>` : ''}
                        
                        <div class="goal-progress-bar">
                            <div class="progress-fill ${goal.completed ? 'completed' : ''}" 
                                 style="width: ${Math.min(progress, 100)}%"></div>
                        </div>
                        
                        <div class="goal-footer">
                            <div class="goal-stats">
                                <span class="goal-percentage">${progress.toFixed(1)}% completado</span>
                                <span class="goal-deadline">
                                    <i class="fas fa-calendar"></i>
                                    ${this.formatDate(goal.deadline)}
                                    ${!isExpired ? `(${daysRemaining} días)` : ''}
                                </span>
                            </div>
                            <div class="goal-actions">
                                ${!goal.completed ? `
                                    <button class="action-btn update" onclick="financeApp.updateGoalProgress('${goal.id}')" title="Actualizar progreso">
                                        <i class="fas fa-plus"></i>
                                    </button>
                                ` : ''}
                                <button class="action-btn edit" onclick="financeApp.editGoal('${goal.id}')" title="Editar">
                                    <i class="fas fa-edit"></i>
                                </button>
                                <button class="action-btn delete" onclick="financeApp.deleteGoal('${goal.id}')" title="Eliminar">
                                    <i class="fas fa-trash"></i>
                                </button>
                            </div>
                        </div>
                    </div>
                `;
            }).join('');

        } catch (error) {
            console.error('Error renderizando metas:', error);
            container.innerHTML = `
                <div class="error-message">
                    <i class="fas fa-exclamation-circle"></i>
                    <p>Error cargando metas de ahorro</p>
                </div>
            `;
        }
    }

    /**
     * Maneja el cambio de pestañas de categorías
     * @param event - Evento del click
     */
    private handleCategoryTabChange(event: Event): void {
        const target = event.target as HTMLElement;
        const type = target.dataset.type as TransactionType;

        if (type) {
            // Cambiar pestañas activas
            document.querySelectorAll('.category-tab-btn').forEach(btn => btn.classList.remove('active'));
            document.querySelectorAll('.category-list').forEach(list => list.classList.remove('active'));

            target.classList.add('active');
            document.getElementById(`${type}Categories`)?.classList.add('active');
        }
    }

    /**
     * Muestra el modal de presupuesto
     */
    private showBudgetModal(): void {
        const modal = this.elements.budgetModal;
        if (modal) {
            modal.style.display = 'block';
            // Poblar categorías de gasto para el presupuesto
            this.populateBudgetCategories();
        }
    }

    /**
     * Oculta el modal de presupuesto
     */
    private hideBudgetModal(): void {
        const modal = this.elements.budgetModal;
        if (modal) {
            modal.style.display = 'none';
        }
    }

    /**
     * Popula las categorías de gasto en el modal de presupuesto
     */
    private populateBudgetCategories(): void {
        const input = this.elements.budgetCategory as HTMLInputElement;
        if (!input) return;

        // Convertir input a un datalist para autocompletado
        const datalistId = 'budgetCategoriesDatalist';
        let datalist = document.getElementById(datalistId) as HTMLDataListElement;
        
        if (!datalist) {
            datalist = document.createElement('datalist');
            datalist.id = datalistId;
            input.setAttribute('list', datalistId);
            input.parentNode?.appendChild(datalist);
        }

        // Limpiar y poplar
        datalist.innerHTML = '';
        const expenseCategories = this.categoryManager.getCategories('expense');
        expenseCategories.forEach(category => {
            const option = document.createElement('option');
            option.value = category.name;
            datalist.appendChild(option);
        });
    }

    /**
     * Genera y muestra un reporte
     */
    private generateReport(): void {
        const container = this.elements.reportResults;
        const periodSelect = this.elements.reportPeriod as HTMLSelectElement;
        
        if (!container || !periodSelect) return;

        try {
            const period = periodSelect.value as ReportPeriod;
            const report = this.reportManager.generateReport(period);

            container.innerHTML = `
                <div class="report-container">
                    <div class="report-header">
                        <h4><i class="fas fa-chart-line"></i> Reporte ${this.formatReportPeriod(period)}</h4>
                        <div class="report-period">
                            ${this.formatDate(report.dateRange.start)} - ${this.formatDate(report.dateRange.end)}
                        </div>
                    </div>

                    <div class="report-summary">
                        <div class="summary-grid">
                            <div class="summary-item income">
                                <div class="summary-icon"><i class="fas fa-arrow-up"></i></div>
                                <div class="summary-data">
                                    <span class="summary-label">Ingresos</span>
                                    <span class="summary-value">${this.formatCurrency(report.summary.totalIncome)}</span>
                                </div>
                            </div>
                            <div class="summary-item expense">
                                <div class="summary-icon"><i class="fas fa-arrow-down"></i></div>
                                <div class="summary-data">
                                    <span class="summary-label">Gastos</span>
                                    <span class="summary-value">${this.formatCurrency(report.summary.totalExpenses)}</span>
                                </div>
                            </div>
                            <div class="summary-item balance ${report.summary.balance >= 0 ? 'positive' : 'negative'}">
                                <div class="summary-icon"><i class="fas fa-wallet"></i></div>
                                <div class="summary-data">
                                    <span class="summary-label">Balance</span>
                                    <span class="summary-value">${this.formatCurrency(report.summary.balance)}</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div class="report-insights">
                        <h5><i class="fas fa-lightbulb"></i> Insights</h5>
                        <ul class="insights-list">
                            ${report.insights.map(insight => `<li>${insight}</li>`).join('')}
                        </ul>
                    </div>

                    <div class="report-categories">
                        <h5><i class="fas fa-chart-pie"></i> Desglose por Categorías</h5>
                        <div class="categories-breakdown">
                            ${Object.entries(report.categoryBreakdown).map(([category, stats]) => `
                                <div class="category-stat ${stats.type}">
                                    <div class="category-info">
                                        <span class="category-name">${category}</span>
                                        <span class="category-type">${stats.type === 'income' ? 'Ingreso' : 'Gasto'}</span>
                                    </div>
                                    <div class="category-amounts">
                                        <span class="category-amount">${this.formatCurrency(stats.amount)}</span>
                                        <span class="category-percentage">${stats.percentage.toFixed(1)}%</span>
                                    </div>
                                </div>
                            `).join('')}
                        </div>
                    </div>

                    ${report.monthlyTrend.length > 1 ? `
                        <div class="report-trend">
                            <h5><i class="fas fa-chart-line"></i> Tendencia Mensual</h5>
                            <div class="trend-chart">
                                ${report.monthlyTrend.map(month => `
                                    <div class="trend-item">
                                        <div class="trend-month">${month.month}</div>
                                        <div class="trend-bars">
                                            <div class="trend-bar income" style="height: ${(month.income / Math.max(...report.monthlyTrend.map(m => Math.max(m.income, m.expenses)))) * 100}%"></div>
                                            <div class="trend-bar expense" style="height: ${(month.expenses / Math.max(...report.monthlyTrend.map(m => Math.max(m.income, m.expenses)))) * 100}%"></div>
                                        </div>
                                        <div class="trend-values">
                                            <span class="income">+${this.formatCurrency(month.income)}</span>
                                            <span class="expense">-${this.formatCurrency(month.expenses)}</span>
                                        </div>
                                    </div>
                                `).join('')}
                            </div>
                        </div>
                    ` : ''}
                </div>
            `;

        } catch (error) {
            console.error('Error generando reporte:', error);
            container.innerHTML = `
                <div class="error-message">
                    <i class="fas fa-exclamation-circle"></i>
                    <p>Error generando el reporte</p>
                </div>
            `;
        }
    }

    // ==================== MÉTODOS PÚBLICOS PARA ACCIONES DE LA UI ====================

    /**
     * Elimina una transacción
     * @param id - ID de la transacción a eliminar
     */
    public deleteTransaction(id: string): void {
        if (confirm('¿Estás seguro de que quieres eliminar esta transacción?')) {
            try {
                const deleted = this.transactionManager.deleteTransaction(id);
                if (deleted) {
                    this.updateDashboard();
                    this.renderTransactions();
                    this.showNotification('Transacción eliminada correctamente', 'success');
                } else {
                    this.showNotification('No se pudo eliminar la transacción', 'error');
                }
            } catch (error) {
                console.error('Error eliminando transacción:', error);
                this.showNotification('Error eliminando transacción', 'error');
            }
        }
    }

    /**
     * Edita una transacción (simplificado - solo muestra la información)
     * @param id - ID de la transacción a editar
     */
    public editTransaction(id: string): void {
        try {
            const transactions = this.transactionManager.getTransactions();
            const transaction = transactions.find(t => t.id === id);
            
            if (transaction) {
                // Por simplicidad, rellenamos el formulario con los datos existentes
                (this.elements.transactionType as HTMLSelectElement).value = transaction.type;
                (this.elements.transactionAmount as HTMLInputElement).value = transaction.amount.toString();
                (this.elements.transactionDescription as HTMLInputElement).value = transaction.description;
                (this.elements.transactionDate as HTMLInputElement).value = transaction.date.toISOString().split('T')[0];
                (this.elements.paymentMethod as HTMLSelectElement).value = transaction.paymentMethod;
                
                // Actualizar categorías y seleccionar la correcta
                this.populateTransactionCategories();
                (this.elements.transactionCategory as HTMLSelectElement).value = transaction.category;
                
                // Eliminar la transacción original para evitar duplicados
                this.deleteTransaction(id);
                
                // Scroll al formulario
                this.elements.transactionForm?.scrollIntoView({ behavior: 'smooth' });
                this.showNotification('Datos cargados en el formulario. Modifica y guarda los cambios.', 'info');
            }
        } catch (error) {
            console.error('Error editando transacción:', error);
            this.showNotification('Error cargando transacción para editar', 'error');
        }
    }

    /**
     * Elimina una categoría
     * @param id - ID de la categoría a eliminar
     */
    public deleteCategory(id: string): void {
        if (confirm('¿Estás seguro de que quieres eliminar esta categoría? Las transacciones asociadas mantendrán el nombre de la categoría.')) {
            try {
                const deleted = this.categoryManager.deleteCategory(id);
                if (deleted) {
                    this.populateCategories();
                    this.renderCategories();
                    this.showNotification('Categoría eliminada correctamente', 'success');
                } else {
                    this.showNotification('No se pudo eliminar la categoría', 'error');
                }
            } catch (error) {
                console.error('Error eliminando categoría:', error);
                this.showNotification('Error eliminando categoría', 'error');
            }
        }
    }

    /**
     * Edita una categoría
     * @param id - ID de la categoría a editar
     */
    public editCategory(id: string): void {
        try {
            const category = this.categoryManager.getCategoryById(id);
            
            if (category) {
                // Rellenar formulario con datos existentes
                (this.elements.categoryType as HTMLSelectElement).value = category.type;
                (this.elements.categoryName as HTMLInputElement).value = category.name;
                (this.elements.categoryColor as HTMLInputElement).value = category.color;
                (this.elements.categoryDescription as HTMLInputElement).value = category.description || '';
                
                // Cambiar a la pestaña de categorías
                this.switchTab('categories');
                
                // Eliminar categoría original
                this.deleteCategory(id);
                
                // Scroll al formulario
                this.elements.categoryForm?.scrollIntoView({ behavior: 'smooth' });
                this.showNotification('Datos cargados en el formulario. Modifica y guarda los cambios.', 'info');
            }
        } catch (error) {
            console.error('Error editando categoría:', error);
            this.showNotification('Error cargando categoría para editar', 'error');
        }
    }

    /**
     * Elimina un presupuesto
     * @param id - ID del presupuesto a eliminar
     */
    public deleteBudget(id: string): void {
        if (confirm('¿Estás seguro de que quieres eliminar este presupuesto?')) {
            try {
                const deleted = this.budgetManager.deleteBudget(id);
                if (deleted) {
                    this.renderBudgets();
                    this.showNotification('Presupuesto eliminado correctamente', 'success');
                } else {
                    this.showNotification('No se pudo eliminar el presupuesto', 'error');
                }
            } catch (error) {
                console.error('Error eliminando presupuesto:', error);
                this.showNotification('Error eliminando presupuesto', 'error');
            }
        }
    }

    /**
     * Edita un presupuesto
     * @param id - ID del presupuesto a editar
     */
    public editBudget(id: string): void {
        try {
            const currentMonth = new Date().toISOString().substr(0, 7);
            const budgets = this.budgetManager.getBudgets(currentMonth);
            const budget = budgets.find(b => b.id === id);
            
            if (budget) {
                // Mostrar modal y rellenar datos
                this.showBudgetModal();
                (this.elements.budgetCategory as HTMLInputElement).value = budget.category;
                (this.elements.budgetAmount as HTMLInputElement).value = budget.amount.toString();
                
                // Eliminar presupuesto original
                this.deleteBudget(id);
                
                this.showNotification('Datos cargados en el formulario. Modifica y guarda los cambios.', 'info');
            }
        } catch (error) {
            console.error('Error editando presupuesto:', error);
            this.showNotification('Error cargando presupuesto para editar', 'error');
        }
    }

    /**
     * Elimina una meta
     * @param id - ID de la meta a eliminar
     */
    public deleteGoal(id: string): void {
        if (confirm('¿Estás seguro de que quieres eliminar esta meta de ahorro?')) {
            try {
                const deleted = this.goalManager.deleteGoal(id);
                if (deleted) {
                    this.renderGoals();
                    this.updateDashboard();
                    this.showNotification('Meta eliminada correctamente', 'success');
                } else {
                    this.showNotification('No se pudo eliminar la meta', 'error');
                }
            } catch (error) {
                console.error('Error eliminando meta:', error);
                this.showNotification('Error eliminando meta', 'error');
            }
        }
    }

    /**
     * Edita una meta
     * @param id - ID de la meta a editar
     */
    public editGoal(id: string): void {
        try {
            const goals = this.goalManager.getGoals();
            const goal = goals.find(g => g.id === id);
            
            if (goal) {
                // Rellenar formulario con datos existentes
                (this.elements.goalName as HTMLInputElement).value = goal.name;
                (this.elements.goalAmount as HTMLInputElement).value = goal.amount.toString();
                (this.elements.goalDeadline as HTMLInputElement).value = goal.deadline.toISOString().split('T')[0];
                (this.elements.currentSaved as HTMLInputElement).value = goal.currentSaved.toString();
                (this.elements.goalDescription as HTMLTextAreaElement).value = goal.description || '';
                
                // Cambiar a la pestaña de metas
                this.switchTab('goals');
                
                // Eliminar meta original
                this.deleteGoal(id);
                
                // Scroll al formulario
                this.elements.goalForm?.scrollIntoView({ behavior: 'smooth' });
                this.showNotification('Datos cargados en el formulario. Modifica y guarda los cambios.', 'info');
            }
        } catch (error) {
            console.error('Error editando meta:', error);
            this.showNotification('Error cargando meta para editar', 'error');
        }
    }

    /**
     * Actualiza el progreso de una meta
     * @param id - ID de la meta a actualizar
     */
    public updateGoalProgress(id: string): void {
        try {
            const goals = this.goalManager.getGoals();
            const goal = goals.find(g => g.id === id);
            
            if (goal) {
                const newAmount = prompt(
                    `Actualizar progreso de "${goal.name}"\n\nMonto actual: ${this.formatCurrency(goal.currentSaved)}\nMonto objetivo: ${this.formatCurrency(goal.amount)}\n\nIngresa el nuevo monto ahorrado:`,
                    goal.currentSaved.toString()
                );
                
                if (newAmount !== null) {
                    const amount = parseFloat(newAmount);
                    if (!isNaN(amount) && amount >= 0) {
                        this.goalManager.updateGoalProgress(id, amount);
                        this.renderGoals();
                        this.updateDashboard();
                        
                        if (amount >= goal.amount) {
                            this.showNotification(`¡Felicitaciones! Has completado la meta "${goal.name}"`, 'success');
                        } else {
                            this.showNotification('Progreso actualizado correctamente', 'success');
                        }
                    } else {
                        this.showNotification('Monto inválido', 'error');
                    }
                }
            }
        } catch (error) {
            console.error('Error actualizando progreso de meta:', error);
            this.showNotification('Error actualizando progreso', 'error');
        }
    }

    // ==================== MÉTODOS PARA PDF UPLOADER ====================

    /**
     * Maneja la selección de archivo PDF
     * @param event - Evento de cambio del input file
     */
    private handlePdfFileSelection(event: Event): void {
        const input = event.target as HTMLInputElement;
        const label = document.querySelector('.pdf-label');
        const processBtn = this.elements.processPdfBtn as HTMLButtonElement;

        if (input.files && input.files.length > 0) {
            const file = input.files[0];
            
            // Validar que sea PDF
            if (file.type !== 'application/pdf') {
                this.showNotification('Por favor selecciona un archivo PDF válido', 'error');
                input.value = '';
                return;
            }

            // Actualizar UI
            if (label) {
                label.classList.add('file-selected');
                const span = label.querySelector('span');
                if (span) {
                    span.textContent = `${file.name} (${this.formatFileSize(file.size)})`;
                }
            }

            // Habilitar botón de procesar
            processBtn.disabled = false;

            // Limpiar resultados anteriores
            this.hideExtractedExpenses();

        } else {
            // Restaurar estado inicial
            if (label) {
                label.classList.remove('file-selected');
                const span = label.querySelector('span');
                if (span) {
                    span.textContent = 'Seleccionar archivo PDF';
                }
            }
            processBtn.disabled = true;
        }
    }

    /**
     * Procesa el archivo PDF seleccionado
     */
    private async processPdfFile(): Promise<void> {
        const fileInput = this.elements.pdfFile as HTMLInputElement;
        const processBtn = this.elements.processPdfBtn as HTMLButtonElement;
        
        if (!fileInput.files || fileInput.files.length === 0) {
            this.showNotification('Por favor selecciona un archivo PDF primero', 'error');
            return;
        }

        const file = fileInput.files[0];

        try {
            // Mostrar estado de carga
            this.showProcessingStatus();
            processBtn.disabled = true;

            // Verificar si hay API Key configurada
            const apiKey = this.getOpenAIApiKey();
            if (!apiKey) {
                // Solicitar API Key al usuario
                const userApiKey = prompt(
                    '🔑 API Key de OpenAI requerida\n\n' +
                    'Para usar esta funcionalidad necesitas una API Key de OpenAI.\n' +
                    '1. Ve a https://platform.openai.com/api-keys\n' +
                    '2. Crea una nueva API Key\n' +
                    '3. Pégala aquí abajo:\n\n' +
                    'Nota: Tu API Key se guardará localmente y es segura.'
                );

                if (!userApiKey || !userApiKey.trim()) {
                    this.hideProcessingStatus();
                    processBtn.disabled = false;
                    this.showNotification('API Key requerida para continuar', 'warning');
                    return;
                }

                this.saveOpenAIApiKey(userApiKey.trim());
                this.aiAnalyzer.setApiKey(userApiKey.trim());
            } else {
                this.aiAnalyzer.setApiKey(apiKey);
            }

            // Paso 1: Extraer texto del PDF
            this.updateProcessingStatus('Extrayendo texto del PDF...');
            const extractedText = await this.pdfProcessor.extractTextFromPDF(file);
            
            if (!extractedText || extractedText.length < 50) {
                throw new Error('No se pudo extraer texto útil del PDF. Verifica que el PDF contenga texto legible.');
            }

            // Paso 2: Limpiar texto
            const cleanedText = this.pdfProcessor.cleanExtractedText(extractedText);

            // Paso 3: Analizar con IA
            this.updateProcessingStatus('Analizando gastos con IA...');
            const analysis = await this.aiAnalyzer.analyzeExpenses(cleanedText);

            if (!analysis.success) {
                throw new Error(analysis.error || 'Error en el análisis de IA');
            }

            // Paso 4: Mostrar resultados
            this.currentExtractedExpenses = analysis.expenses;
            this.renderExtractedExpenses(analysis);
            this.showNotification(
                `✅ ${analysis.expenses.length} gastos encontrados con ${Math.round(analysis.confidence * 100)}% de confianza`,
                'success'
            );

        } catch (error) {
            console.error('Error procesando PDF:', error);
            this.showNotification(
                `Error procesando PDF: ${error instanceof Error ? error.message : 'Error desconocido'}`,
                'error'
            );
        } finally {
            this.hideProcessingStatus();
            processBtn.disabled = false;
        }
    }

    /**
     * Renderiza los gastos extraídos en la interfaz
     * @param analysis - Resultado del análisis de IA
     */
    private renderExtractedExpenses(analysis: AIAnalysisResponse): void {
        const container = this.elements.extractedExpenses;
        const expensesList = this.elements.expensesList;
        
        if (!container || !expensesList) return;

        // Mostrar el contenedor
        container.style.display = 'block';

        // Crear header de la tabla
        const header = `
            <div class="expenses-header">
                <div>Sel.</div>
                <div>Descripción</div>
                <div>Fecha</div>
                <div>Monto</div>
                <div>Categoría</div>
                <div>Método</div>
                <div>Acción</div>
            </div>
        `;

        // Crear items de gastos
        const expensesHTML = this.currentExtractedExpenses.map((expense, index) => `
            <div class="expense-item" data-expense-id="${expense.id}">
                <input type="checkbox" 
                       class="expense-checkbox" 
                       ${expense.isSelected ? 'checked' : ''} 
                       onchange="financeApp.toggleExpenseSelection('${expense.id}')">
                
                <input type="text" 
                       class="expense-field expense-description" 
                       value="${expense.description}"
                       onchange="financeApp.updateExpenseField('${expense.id}', 'description', this.value)">
                
                <input type="date" 
                       class="expense-field expense-date" 
                       value="${expense.date}"
                       onchange="financeApp.updateExpenseField('${expense.id}', 'date', this.value)">
                
                <input type="number" 
                       class="expense-field expense-amount" 
                       value="${expense.amount}" 
                       step="0.01" min="0"
                       onchange="financeApp.updateExpenseField('${expense.id}', 'amount', this.value)">
                
                <select class="expense-field expense-category" 
                        onchange="financeApp.updateExpenseField('${expense.id}', 'category', this.value)">
                    ${this.getCategoryOptionsHTML(expense.category)}
                </select>
                
                <select class="expense-field expense-payment" 
                        onchange="financeApp.updateExpenseField('${expense.id}', 'paymentMethod', this.value)">
                    <option value="card" ${expense.paymentMethod === 'card' ? 'selected' : ''}>Tarjeta</option>
                    <option value="cash" ${expense.paymentMethod === 'cash' ? 'selected' : ''}>Efectivo</option>
                    <option value="transfer" ${expense.paymentMethod === 'transfer' ? 'selected' : ''}>Transferencia</option>
                    <option value="check" ${expense.paymentMethod === 'check' ? 'selected' : ''}>Cheque</option>
                </select>
                
                <div style="display: flex; align-items: center; gap: 5px;">
                    <button class="remove-expense-btn" 
                            onclick="financeApp.removeExtractedExpense('${expense.id}')"
                            title="Eliminar">
                        <i class="fas fa-times"></i>
                    </button>
                    <div class="confidence-indicator confidence-${expense.confidence}" 
                         title="Confianza de IA: ${expense.confidence}"></div>
                </div>
            </div>
        `).join('');

        expensesList.innerHTML = header + expensesHTML;

        // Actualizar contador de botón
        this.updateAddSelectedButton();

        // Scroll a los resultados
        container.scrollIntoView({ behavior: 'smooth' });
    }

    /**
     * Obtiene el HTML de opciones de categorías para los selects
     * @param selectedCategory - Categoría actualmente seleccionada
     * @returns HTML con opciones de categorías
     */
    private getCategoryOptionsHTML(selectedCategory: string): string {
        const categories = this.categoryManager.getCategories('expense');
        return categories.map(category => 
            `<option value="${category.name}" ${category.name === selectedCategory ? 'selected' : ''}>${category.name}</option>`
        ).join('');
    }

    /**
     * Alterna la selección de todos los gastos
     */
    public toggleSelectAllExpenses(): void {
        const allSelected = this.currentExtractedExpenses.every(expense => expense.isSelected);
        
        this.currentExtractedExpenses.forEach(expense => {
            expense.isSelected = !allSelected;
        });

        // Actualizar checkboxes en el DOM
        document.querySelectorAll('.expense-checkbox').forEach((checkbox, index) => {
            (checkbox as HTMLInputElement).checked = this.currentExtractedExpenses[index].isSelected;
        });

        this.updateAddSelectedButton();

        // Actualizar texto del botón
        const button = this.elements.selectAllExpenses;
        if (button) {
            const icon = button.querySelector('i');
            const text = allSelected ? 'Seleccionar Todos' : 'Deseleccionar Todos';
            const iconClass = allSelected ? 'fa-check-square' : 'fa-square';
            
            if (icon) {
                icon.className = `fas ${iconClass}`;
            }
            button.innerHTML = `<i class="fas ${iconClass}"></i> ${text}`;
        }
    }

    /**
     * Alterna la selección de un gasto específico
     * @param expenseId - ID del gasto a alternar
     */
    public toggleExpenseSelection(expenseId: string): void {
        const expense = this.currentExtractedExpenses.find(e => e.id === expenseId);
        if (expense) {
            expense.isSelected = !expense.isSelected;
            this.updateAddSelectedButton();
        }
    }

    /**
     * Actualiza un campo de un gasto específico
     * @param expenseId - ID del gasto
     * @param field - Campo a actualizar
     * @param value - Nuevo valor
     */
    public updateExpenseField(expenseId: string, field: keyof ExtractedExpense, value: string): void {
        const expense = this.currentExtractedExpenses.find(e => e.id === expenseId);
        if (expense) {
            if (field === 'amount') {
                expense[field] = parseFloat(value) || 0;
            } else if (field === 'date' || field === 'description' || field === 'category') {
                (expense as any)[field] = value;
            } else if (field === 'paymentMethod') {
                expense[field] = value as PaymentMethod;
            }
        }
    }

    /**
     * Elimina un gasto extraído de la lista
     * @param expenseId - ID del gasto a eliminar
     */
    public removeExtractedExpense(expenseId: string): void {
        this.currentExtractedExpenses = this.currentExtractedExpenses.filter(e => e.id !== expenseId);
        
        // Re-renderizar la lista
        if (this.currentExtractedExpenses.length > 0) {
            const analysis: AIAnalysisResponse = {
                success: true,
                expenses: this.currentExtractedExpenses,
                confidence: 0.8,
                summary: `${this.currentExtractedExpenses.length} gastos`
            };
            this.renderExtractedExpenses(analysis);
        } else {
            this.hideExtractedExpenses();
        }
    }

    /**
     * Agrega los gastos seleccionados como transacciones
     */
    public async addSelectedExpensesToTransactions(): Promise<void> {
        const selectedExpenses = this.currentExtractedExpenses.filter(expense => expense.isSelected);
        
        if (selectedExpenses.length === 0) {
            this.showNotification('Selecciona al menos un gasto para agregar', 'warning');
            return;
        }

        try {
            let successCount = 0;
            let errorCount = 0;

            for (const expense of selectedExpenses) {
                try {
                    await this.transactionManager.addTransaction({
                        type: 'expense',
                        amount: expense.amount,
                        description: expense.description,
                        category: expense.category,
                        date: new Date(expense.date),
                        paymentMethod: expense.paymentMethod
                    });
                    successCount++;
                } catch (error) {
                    console.error(`Error agregando gasto ${expense.description}:`, error);
                    errorCount++;
                }
            }

            // Actualizar UI
            this.updateDashboard();
            this.renderTransactions();

            // Limpiar gastos extraídos
            this.currentExtractedExpenses = [];
            this.hideExtractedExpenses();

            // Mostrar resultado
            if (errorCount === 0) {
                this.showNotification(`✅ ${successCount} transacciones agregadas correctamente`, 'success');
            } else {
                this.showNotification(`⚠️ ${successCount} agregadas, ${errorCount} con errores`, 'warning');
            }

        } catch (error) {
            console.error('Error agregando transacciones:', error);
            this.showNotification('Error agregando transacciones', 'error');
        }
    }

    /**
     * Actualiza el estado del botón de agregar seleccionados
     */
    private updateAddSelectedButton(): void {
        const button = this.elements.addSelectedExpenses as HTMLButtonElement;
        if (button) {
            const selectedCount = this.currentExtractedExpenses.filter(e => e.isSelected).length;
            button.disabled = selectedCount === 0;
            button.innerHTML = `<i class="fas fa-plus-circle"></i> Agregar Seleccionados (${selectedCount})`;
        }
    }

    /**
     * Muestra el estado de procesamiento
     */
    private showProcessingStatus(): void {
        const status = this.elements.pdfProcessingStatus;
        if (status) {
            status.style.display = 'flex';
        }
    }

    /**
     * Actualiza el mensaje de estado de procesamiento
     * @param message - Nuevo mensaje
     */
    private updateProcessingStatus(message: string): void {
        const status = this.elements.pdfProcessingStatus;
        if (status) {
            const span = status.querySelector('span');
            if (span) {
                span.textContent = message;
            }
        }
    }

    /**
     * Oculta el estado de procesamiento
     */
    private hideProcessingStatus(): void {
        const status = this.elements.pdfProcessingStatus;
        if (status) {
            status.style.display = 'none';
        }
    }

    /**
     * Muestra la sección de gastos extraídos
     */
    private showExtractedExpenses(): void {
        const container = this.elements.extractedExpenses;
        if (container) {
            container.style.display = 'block';
        }
    }

    /**
     * Oculta la sección de gastos extraídos
     */
    private hideExtractedExpenses(): void {
        const container = this.elements.extractedExpenses;
        if (container) {
            container.style.display = 'none';
        }
    }

    /**
     * Obtiene la API Key de OpenAI del localStorage
     * @returns API Key o cadena vacía
     */
    private getOpenAIApiKey(): string {
        return localStorage.getItem('openai_api_key') || '';
    }

    /**
     * Guarda la API Key de OpenAI en localStorage
     * @param apiKey - API Key a guardar
     */
    private saveOpenAIApiKey(apiKey: string): void {
        localStorage.setItem('openai_api_key', apiKey);
    }

    /**
     * Formatea el tamaño de archivo en formato legible
     * @param bytes - Tamaño en bytes
     * @returns Tamaño formateado
     */
    private formatFileSize(bytes: number): string {
        if (bytes === 0) return '0 Bytes';
        
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    // ==================== FUNCIONES AUXILIARES ====================

    /**
     * Formatea un número como moneda
     * @param amount - Monto a formatear
     * @returns String formateado como moneda
     */
    private formatCurrency(amount: number): string {
        return new Intl.NumberFormat('es-AR', {
            style: 'currency',
            currency: 'ARS',
            minimumFractionDigits: 2
        }).format(amount);
    }

    /**
     * Formatea una fecha
     * @param date - Fecha a formatear
     * @returns String con fecha formateada
     */
    private formatDate(date: Date): string {
        return new Intl.DateTimeFormat('es-AR', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        }).format(date);
    }

    /**
     * Formatea el método de pago para mostrar
     * @param method - Método de pago
     * @returns String formateado
     */
    private formatPaymentMethod(method: PaymentMethod): string {
        const methods: {[key in PaymentMethod]: string} = {
            cash: 'Efectivo',
            card: 'Tarjeta',
            transfer: 'Transferencia',
            check: 'Cheque'
        };
        return methods[method] || method;
    }

    /**
     * Formatea el período del reporte para mostrar
     * @param period - Período del reporte
     * @returns String formateado
     */
    private formatReportPeriod(period: ReportPeriod): string {
        const periods: {[key in ReportPeriod]: string} = {
            'current-month': 'del Mes Actual',
            'last-month': 'del Mes Anterior',
            'last-3-months': 'de los Últimos 3 Meses',
            'last-6-months': 'de los Últimos 6 Meses',
            'current-year': 'del Año Actual'
        };
        return periods[period] || period;
    }

    /**
     * Establece fechas por defecto en los formularios
     */
    private setDefaultDates(): void {
        const today = new Date().toISOString().split('T')[0];
        
        // Fecha por defecto para transacciones
        if (this.elements.transactionDate) {
            (this.elements.transactionDate as HTMLInputElement).value = today;
        }
        
        // Fecha por defecto para metas (30 días en el futuro)
        if (this.elements.goalDeadline) {
            const futureDate = new Date();
            futureDate.setDate(futureDate.getDate() + 30);
            (this.elements.goalDeadline as HTMLInputElement).value = futureDate.toISOString().split('T')[0];
        }
        
        // Mes por defecto para filtros
        if (this.elements.filterMonth) {
            const currentMonth = new Date().toISOString().substr(0, 7);
            (this.elements.filterMonth as HTMLInputElement).value = currentMonth;
        }
    }

    /**
     * Muestra una notificación al usuario
     * @param message - Mensaje a mostrar
     * @param type - Tipo de notificación (success, error, warning, info)
     */
    private showNotification(message: string, type: 'success' | 'error' | 'warning' | 'info' = 'info'): void {
        // Crear elemento de notificación
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.innerHTML = `
            <div class="notification-content">
                <i class="fas ${this.getNotificationIcon(type)}"></i>
                <span>${message}</span>
            </div>
            <button class="notification-close" onclick="this.parentElement.remove()">
                <i class="fas fa-times"></i>
            </button>
        `;
        
        // Agregar estilos inline si no existen en el CSS
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: ${this.getNotificationColor(type)};
            color: white;
            padding: 15px;
            border-radius: 5px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.2);
            z-index: 10000;
            display: flex;
            align-items: center;
            gap: 10px;
            max-width: 400px;
            animation: slideIn 0.3s ease-out;
        `;
        
        // Agregar al DOM
        document.body.appendChild(notification);
        
        // Auto-remove después de 5 segundos
        setTimeout(() => {
            if (notification.parentNode) {
                notification.remove();
            }
        }, 5000);
    }

    /**
     * Obtiene el icono para el tipo de notificación
     * @param type - Tipo de notificación
     * @returns Clase del icono
     */
    private getNotificationIcon(type: string): string {
        const icons: {[key: string]: string} = {
            success: 'fa-check-circle',
            error: 'fa-exclamation-circle',
            warning: 'fa-exclamation-triangle',
            info: 'fa-info-circle'
        };
        return icons[type] || 'fa-info-circle';
    }

    /**
     * Obtiene el color para el tipo de notificación
     * @param type - Tipo de notificación
     * @returns Color en hexadecimal
     */
    private getNotificationColor(type: string): string {
        const colors: {[key: string]: string} = {
            success: '#27ae60',
            error: '#e74c3c',
            warning: '#f39c12',
            info: '#3498db'
        };
        return colors[type] || '#3498db';
    }
}

// ==================== INICIALIZACIÓN GLOBAL ====================

/**
 * Variable global para acceder a la aplicación desde cualquier parte
 * Se inicializa automáticamente al cargar el script
 */

// Inicializar la aplicación cuando se carga el script
const financeApp = new FinanceController();

// Hacer la instancia globalmente accesible
(window as any).financeApp = financeApp;

})(); // End IIFE

// CSS de animación para notificaciones (si no existe en el CSS principal)
if (!document.querySelector('#notificationStyles')) {
    const style = document.createElement('style');
    style.id = 'notificationStyles';
    style.textContent = `
        @keyframes slideIn {
            from {
                transform: translateX(100%);
                opacity: 0;
            }
            to {
                transform: translateX(0);
                opacity: 1;
            }
        }
        
        .notification-content {
            display: flex;
            align-items: center;
            gap: 10px;
            flex: 1;
        }
        
        .notification-close {
            background: none;
            border: none;
            color: white;
            cursor: pointer;
            padding: 5px;
            border-radius: 3px;
            opacity: 0.8;
        }
        
        .notification-close:hover {
            opacity: 1;
            background: rgba(255,255,255,0.1);
        }
    `;
    document.head.appendChild(style);
}

// Log de inicialización exitosa
console.log(`
🏦 ===================================================
   SISTEMA DE FINANZAS PERSONALES - FEDE LIFE
   ===================================================
   
   ✅ Sistema inicializado correctamente
   📊 Dashboard actualizado
   🔧 Event listeners configurados
   💾 Persistencia: localStorage
   
   Funcionalidades disponibles:
   • Gestión de transacciones
   • Categorías personalizadas
   • Presupuestos mensuales
   • Metas de ahorro
   • Reportes y análisis
   
   ¡Listo para usar! 💰
===================================================
`);
