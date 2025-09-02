/**
 * 🏦 SISTEMA DE FINANZAS PERSONALES - FEDE LIFE
 * 
 * Arquitectura: Modular con patrón Repository, Manager y Controller
 * Autor: Senior Backend Developer
 * Descripción: Sistema completo para gestión de finanzas personales
 */

// Importar el módulo de chat financiero
import { FinancialChat, formatChatMessage, generateMessageId, isValidChatMessage } from './financial_chat.js';

// Importar configuraciones del sistema
import { GOOGLE_AI_API_KEY, getApiKey } from './config-simple.js';

// Importar gestor de gráficos
import { ChartsManager } from './charts_manager.js';

(function() {

// ==================== INTERFACES Y TIPOS ====================

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

/**
 * Interface para una transacción financiera
 * Representa cada movimiento de dinero (ingreso o gasto)
 */
/**
 * @typedef {Object} Transaction
 * @property {string} id - ID único de la transacción
 * @property {string} type - Tipo: ingreso o gasto
 * @property {number} amount - Monto de la transacción
 * @property {string} description - Descripción del movimiento
 * @property {string} category - Categoría asociada
 * @property {Date} date - Fecha de la transacción
 * @property {string} paymentMethod - Método de pago utilizado
 * @property {Date} createdAt - Fecha de creación del registro
 * @property {string} [currency] - Moneda (UYU, USD)
 */

/**
 * Interface para una categoría de transacciones
 * Organiza las transacciones por tipo (salario, comida, etc.)
 */
/**
 * @typedef {Object} Category
 * @property {string} id - ID único de la categoría
 * @property {string} name - Nombre de la categoría
 * @property {string} type - Tipo: para ingresos o gastos
 * @property {string} color - Color para identificación visual
 * @property {string} [description] - Descripción opcional
 * @property {Date} createdAt - Fecha de creación
 */

/**
 * Interface para presupuesto mensual por categoría
 * Define límites de gasto por categoría
 */
/**
 * @typedef {Object} Budget
 * @property {string} id - ID único del presupuesto
 * @property {string} category - Categoría asociada
 * @property {number} amount - Monto límite del presupuesto
 * @property {number} spent - Monto ya gastado
 * @property {string} month - Mes del presupuesto (YYYY-MM)
 * @property {Date} createdAt - Fecha de creación
 */

/**
 * Interface para metas de ahorro
 * Define objetivos financieros a alcanzar
 */
/**
 * @typedef {Object} Goal
 * @property {string} id - ID único de la meta
 * @property {string} name - Nombre de la meta
 * @property {number} amount - Monto objetivo
 * @property {number} currentSaved - Monto ya ahorrado
 * @property {Date} deadline - Fecha límite
 * @property {string} [description] - Descripción opcional
 * @property {boolean} completed - Estado de completitud
 * @property {Date} createdAt - Fecha de creación
 */

/**
 * Interface para el resumen financiero del dashboard
 */
/**
 * @typedef {Object} FinancialSummary
 * @property {number} totalIncome - Total de ingresos
 * @property {number} totalExpenses - Total de gastos
 * @property {number} balance - Balance (ingresos - gastos)
 * @property {number} totalSavings - Total ahorrado
 * @property {number} monthlyBudget - Presupuesto mensual
 * @property {number} budgetUsed - Presupuesto utilizado
 * @property {number} budgetRemaining - Presupuesto restante
 * @property {number} savingsRate - Porcentaje de ahorro
 */

/**
 * Interface para configuración de la aplicación
 */
/**
 * @typedef {Object} AppConfig
 * @property {string} currency - Moneda principal
 * @property {string} language - Idioma
 * @property {string} theme - Tema visual ('light' | 'dark')
 * @property {boolean} notifications - Notificaciones activadas
 * @property {boolean} autoBackup - Backup automático
 */

/**
 * Interface para respuesta de la API
 */
interface ApiResponse<T> {
    success: boolean;
    data?: T;
    error?: string;
    message?: string;
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
 * Interface para configuración de Google AI Studio (Gemini)
 */
interface LLMConfig {
    apiKey: string;           // API Key de Google AI Studio
    model: string;            // Modelo Gemini (gemini-1.5-flash, gemini-1.5-pro)
    maxTokens: number;        // Máximo de tokens en la respuesta
    temperature: number;      // Creatividad del modelo (0-1)
    baseUrl: string;          // URL base de la API de Google
}

/**
 * Interface para datos de autenticación
 */
interface AuthData {
    token: string;
    user: {
        id: string;
        username: string;
        email: string;
    };
}

// ==================== CONFIGURACIÓN DE LA API ====================

/**
 * Configuración de la API backend
 * Detecta automáticamente si estamos en desarrollo o producción
 */
const API_CONFIG = {
    // Detectar la URL base automáticamente
    BASE_URL: (() => {
        // Si estamos en localhost, usar localhost:3000
        if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
            return 'http://localhost:3000/api';
        }
        // En producción, usar la misma URL del frontend pero con /api
        return `${window.location.protocol}//${window.location.host}/api`;
    })(),
    ENDPOINTS: {
        AUTH: {
            LOGIN: '/auth/login',
            REGISTER: '/auth/register',
            VERIFY: '/auth/verify'
        },
        TRANSACTIONS: '/transactions',
        CATEGORIES: '/categories',
        BUDGETS: '/budgets',
        GOALS: '/goals',
        REPORTS: '/reports'
    },
    HEADERS: {
        'Content-Type': 'application/json'
    }
};

// Debug: Mostrar la URL de la API que se está usando
console.log('🔗 URL de la API configurada:', API_CONFIG.BASE_URL);
console.log('🌐 Hostname actual:', window.location.hostname);
console.log('🔧 Entorno detectado:', window.location.hostname === 'localhost' ? 'DESARROLLO' : 'PRODUCCIÓN');

// ==================== GESTOR DE AUTENTICACIÓN ====================

/**
 * Gestor de autenticación para el frontend
 * Maneja tokens JWT y sesiones de usuario
 */
class AuthManager {
    private static instance: AuthManager;
    private authToken: string | null = null;
    private user: any = null;

    private constructor() {
        this.loadAuthFromStorage();
    }

    public static getInstance(): AuthManager {
        if (!AuthManager.instance) {
            AuthManager.instance = new AuthManager();
        }
        return AuthManager.instance;
    }

    /**
     * Carga datos de autenticación desde localStorage
     */
    private loadAuthFromStorage(): void {
        try {
            const authData = localStorage.getItem('auth_data');
            if (authData) {
                const parsed = JSON.parse(authData);
                this.authToken = parsed.token;
                this.user = parsed.user;
            }
        } catch (error) {
            console.error('Error cargando datos de autenticación:', error);
        }
    }

    /**
     * Guarda datos de autenticación en localStorage
     */
    private saveAuthToStorage(): void {
        try {
            const authData: AuthData = {
                token: this.authToken!,
                user: this.user
            };
            localStorage.setItem('auth_data', JSON.stringify(authData));
        } catch (error) {
            console.error('Error guardando datos de autenticación:', error);
        }
    }

    /**
     * Obtiene el token de autenticación
     */
    public getToken(): string | null {
        return this.authToken;
    }

    /**
     * Establece el token de autenticación
     */
    public setToken(token: string): void {
        this.authToken = token;
        this.saveAuthToStorage();
    }

    /**
     * Verifica si el usuario está autenticado
     */
    public isAuthenticated(): boolean {
        return !!this.authToken;
    }

    /**
     * Obtiene datos del usuario actual
     */
    public getUser(): any {
        return this.user;
    }

    /**
     * Inicia sesión con credenciales
     */
    public async login(username: string, password: string): Promise<boolean> {
        try {
            const response = await fetch(`${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.AUTH.LOGIN}`, {
                method: 'POST',
                headers: API_CONFIG.HEADERS,
                body: JSON.stringify({ username, password })
            });

            if (response.ok) {
                const data = await response.json();
                this.authToken = data.token;
                this.user = data.user;
                this.saveAuthToStorage();
                return true;
            }
            return false;
        } catch (error) {
            console.error('Error en login:', error);
            return false;
        }
    }

    /**
     * Registra un nuevo usuario
     */
    public async register(username: string, email: string, password: string): Promise<boolean> {
        try {
            const response = await fetch(`${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.AUTH.REGISTER}`, {
                method: 'POST',
                headers: API_CONFIG.HEADERS,
                body: JSON.stringify({ username, email, password })
            });

            if (response.ok) {
                const data = await response.json();
                this.authToken = data.token;
                this.user = data.user;
                this.saveAuthToStorage();
                return true;
            }
            return false;
        } catch (error) {
            console.error('Error en registro:', error);
            return false;
        }
    }

    /**
     * Cierra la sesión
     */
    public logout(): void {
        this.authToken = null;
        this.user = null;
        localStorage.removeItem('auth_data');
    }

    /**
     * Obtiene headers con token para llamadas a la API
     */
    public getAuthHeaders(): Record<string, string> {
        return {
            ...API_CONFIG.HEADERS,
            'Authorization': `Bearer ${this.authToken}`
        };
    }
}

// ==================== REPOSITORIO HÍBRIDO ====================

/**
 * Repositorio híbrido que maneja tanto localStorage como backend
 * Proporciona persistencia local y sincronización con base de datos
 */
class HybridRepository {
    private authManager: AuthManager;

    constructor() {
        this.authManager = AuthManager.getInstance();
    }

    /**
     * Guarda datos tanto en localStorage como en el backend
     * @param key - Clave para almacenar
     * @param data - Datos a almacenar
     * @param endpoint - Endpoint del backend (opcional)
     */
    public async save<T>(key: string, data: T[], endpoint?: string): Promise<void> {
        try {
            console.log(`💾 Guardando ${data.length} elementos en ${key}`);
            
            // 1. Guardar en localStorage (caché local)
            const jsonData = JSON.stringify(data);
            localStorage.setItem(key, jsonData);
            console.log(`✅ Datos guardados en localStorage`);

            // 2. Si hay endpoint y usuario autenticado, guardar en backend
            if (endpoint && this.authManager.isAuthenticated()) {
                console.log(`🔄 Intentando sincronizar con backend: ${endpoint}`);
                await this.syncToBackend(endpoint, data);
            } else {
                if (!endpoint) {
                    console.log(`⚠️ No hay endpoint configurado para ${key}`);
                }
                if (!this.authManager.isAuthenticated()) {
                    console.log(`⚠️ Usuario no autenticado, solo guardando en localStorage`);
                    
                    // Intentar autenticación automática (tanto en desarrollo como producción)
                    console.log(`🛠️ Intentando autenticación automática...`);
                    await this.tryAutoLogin();
                    
                    // Si después del intento sigue sin autenticar, mostrar instrucciones
                    if (!this.authManager.isAuthenticated()) {
                        console.log(`❌ No se pudo autenticar automáticamente`);
                        console.log(`💡 Para guardar en la base de datos, ve a: ${window.location.origin}/pages/login.html`);
                    }
                }
            }
        } catch (error) {
            console.error(`❌ Error guardando ${key}:`, error);
            // Si falla el backend, al menos tenemos localStorage
            console.log(`🛡️ Datos guardados en localStorage como respaldo`);
        }
    }

    /**
     * Intenta autenticación automática en desarrollo
     */
    private async tryAutoLogin(): Promise<void> {
        try {
            // Verificar si ya hay un token guardado
            const existingToken = localStorage.getItem('dev_auth_token');
            if (existingToken) {
                console.log(`🔑 Token de desarrollo encontrado, verificando...`);
                this.authManager.setToken(existingToken);
                return;
            }

            // Crear usuario de desarrollo automáticamente
            console.log(`👤 Creando usuario de desarrollo automático...`);
            
            const response = await fetch(`${API_CONFIG.BASE_URL}/auth/register`, {
                method: 'POST',
                headers: API_CONFIG.HEADERS,
                body: JSON.stringify({
                    username: 'dev_user',
                    email: 'dev@fedelife.com',
                    password: 'dev123456',
                    firstName: 'Desarrollo',
                    lastName: 'Usuario',
                    currency: 'UYU'
                })
            });

            if (response.ok) {
                const data = await response.json();
                const token = data.data.token;
                
                // Guardar token para futuras sesiones
                localStorage.setItem('dev_auth_token', token);
                this.authManager.setToken(token);
                
                console.log(`✅ Usuario de desarrollo creado y autenticado automáticamente`);
            } else {
                // Si el usuario ya existe, intentar login
                console.log(`🔄 Usuario de desarrollo ya existe, intentando login...`);
                
                const loginResponse = await fetch(`${API_CONFIG.BASE_URL}/auth/login`, {
                    method: 'POST',
                    headers: API_CONFIG.HEADERS,
                    body: JSON.stringify({
                        identifier: 'dev@fedelife.com',
                        password: 'dev123456'
                    })
                });

                if (loginResponse.ok) {
                    const loginData = await loginResponse.json();
                    const token = loginData.data.token;
                    
                    localStorage.setItem('dev_auth_token', token);
                    this.authManager.setToken(token);
                    
                    console.log(`✅ Login de desarrollo exitoso`);
                } else {
                    console.log(`❌ No se pudo autenticar automáticamente`);
                }
            }
        } catch (error) {
            console.log(`❌ Error en autenticación automática:`, error);
        }
    }

    /**
     * Carga datos desde localStorage y sincroniza con backend si es necesario
     * @param key - Clave a buscar
     * @param endpoint - Endpoint del backend (opcional)
     * @returns Array de datos
     */
    public async load<T>(key: string, endpoint?: string): Promise<T[]> {
        try {
            let data: T[] = [];

            // 1. Intentar cargar desde localStorage
            const localData = localStorage.getItem(key);
            if (localData) {
                data = JSON.parse(localData);
            }

            // 2. Si hay endpoint y usuario autenticado, sincronizar con backend
            if (endpoint && this.authManager.isAuthenticated()) {
                try {
                    const backendData = await this.loadFromBackend<T>(endpoint);
                    if (backendData.length > 0) {
                        // Usar datos del backend y actualizar localStorage
                        data = backendData;
                        localStorage.setItem(key, JSON.stringify(data));
                    }
                } catch (error) {
                    console.warn(`No se pudo cargar desde backend, usando localStorage:`, error);
                }
            }

            return data;
        } catch (error) {
            console.error(`Error cargando ${key}:`, error);
            return [];
        }
    }

    /**
     * Elimina una clave específica del localStorage y backend
     * @param key - Clave a eliminar
     * @param endpoint - Endpoint del backend (opcional)
     */
    public async remove(key: string, endpoint?: string): Promise<void> {
        try {
            localStorage.removeItem(key);

            if (endpoint && this.authManager.isAuthenticated()) {
                await this.deleteFromBackend(endpoint);
            }
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

    /**
     * Sincroniza datos con el backend
     */
    private async syncToBackend<T>(endpoint: string, data: T[]): Promise<void> {
        try {
            console.log(`🔄 Sincronizando ${data.length} elementos con backend: ${API_CONFIG.BASE_URL}${endpoint}`);
            
            // Usar endpoint de sincronización específico
            const syncEndpoint = endpoint === API_CONFIG.ENDPOINTS.TRANSACTIONS ? 
                `${endpoint}/sync` : endpoint;
            
            const response = await fetch(`${API_CONFIG.BASE_URL}${syncEndpoint}`, {
                method: 'POST',
                headers: this.authManager.getAuthHeaders(),
                body: JSON.stringify({ data })
            });

            console.log(`📡 Respuesta del backend: ${response.status} ${response.statusText}`);

            if (!response.ok) {
                const errorText = await response.text();
                console.error('❌ Error del servidor:', errorText);
                throw new Error(`Error sincronizando con backend: ${response.status} - ${errorText}`);
            }

            const result = await response.json();
            console.log(`✅ Sincronización exitosa con backend:`, result);
        } catch (error) {
            console.error('❌ Error sincronizando con backend:', error);
            console.error('🔗 URL intentada:', `${API_CONFIG.BASE_URL}${endpoint}`);
            console.error('🔑 Usuario autenticado:', this.authManager.isAuthenticated());
            throw error;
        }
    }

    /**
     * Carga datos desde el backend
     */
    private async loadFromBackend<T>(endpoint: string): Promise<T[]> {
        try {
            const response = await fetch(`${API_CONFIG.BASE_URL}${endpoint}`, {
                method: 'GET',
                headers: this.authManager.getAuthHeaders()
            });

            if (response.ok) {
                const result = await response.json();
                return result.data || [];
            }
            return [];
        } catch (error) {
            console.error('Error cargando desde backend:', error);
            return [];
        }
    }

    /**
     * Elimina datos del backend
     */
    private async deleteFromBackend(endpoint: string): Promise<void> {
        try {
            const response = await fetch(`${API_CONFIG.BASE_URL}${endpoint}`, {
                method: 'DELETE',
                headers: this.authManager.getAuthHeaders()
            });

            if (!response.ok) {
                throw new Error(`Error eliminando del backend: ${response.status}`);
            }
        } catch (error) {
            console.error('Error eliminando del backend:', error);
            throw error;
        }
    }

    /**
     * Sincroniza todos los datos con el backend
     */
    public async syncAll(): Promise<void> {
        const keys = ['finance_transactions', 'finance_categories', 'finance_budgets', 'finance_goals'];
        const endpoints = ['/transactions', '/categories', '/budgets', '/goals'];

        for (let i = 0; i < keys.length; i++) {
            const key = keys[i];
            const endpoint = endpoints[i];
            
            if (this.exists(key)) {
                const data = JSON.parse(localStorage.getItem(key)!);
                await this.save(key, data, endpoint);
            }
        }
    }
}

// ==================== GESTOR DE CATEGORÍAS ====================

/**
 * Gestor de categorías de ingresos y gastos
 * Maneja CRUD de categorías y inicialización de categorías por defecto
 */
class CategoryManager {
    private readonly STORAGE_KEY = 'finance_categories';
    private storage: HybridRepository;
    private categories: Category[] = [];

    constructor(storage: HybridRepository) {
        this.storage = storage;
        this.initializeAsync();
    }

    /**
     * Inicialización asíncrona
     */
    private async initializeAsync(): Promise<void> {
        await this.loadCategories();
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
    private async loadCategories(): Promise<void> {
        const data = await this.storage.load<Category>(this.STORAGE_KEY);
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
     * Actualiza una categoría existente
     * @param id - ID de la categoría a actualizar
     * @param updates - Datos a actualizar
     * @returns true si se actualizó, false si no se encontró
     */
    public updateCategory(id: string, updates: Partial<Omit<Category, 'id' | 'createdAt'>>): boolean {
        const index = this.categories.findIndex(cat => cat.id === id);
        if (index !== -1) {
            // Conservar id y createdAt originales
            this.categories[index] = {
                ...this.categories[index],
                ...updates
            };
            this.saveCategories();
            return true;
        }
        return false;
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
    private storage: HybridRepository;
    private transactions: Transaction[] = [];

    constructor(storage: HybridRepository) {
        this.storage = storage;
        this.initializeAsync();
    }

    /**
     * Inicialización asíncrona
     */
    private async initializeAsync(): Promise<void> {
        await this.loadTransactions();
    }

    /**
     * Carga transacciones desde el almacenamiento local
     */
    private async loadTransactions(): Promise<void> {
        const data = await this.storage.load<Transaction>(this.STORAGE_KEY);
        // Convertir fechas de string a Date objects
        this.transactions = data.map(trans => ({
            ...trans,
            date: new Date(trans.date),
            createdAt: new Date(trans.createdAt)
        }));
    }

    /**
     * Guarda transacciones en el almacenamiento local y backend
     */
    private async saveTransactions(): Promise<void> {
        await this.storage.save(this.STORAGE_KEY, this.transactions, API_CONFIG.ENDPOINTS.TRANSACTIONS);
    }

    /**
     * Agrega una nueva transacción
     * @param transactionData - Datos de la transacción sin ID ni fecha de creación
     * @returns ID de la transacción creada
     */
    public async addTransaction(transactionData: Omit<Transaction, 'id' | 'createdAt'>): Promise<string> {
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
        await this.saveTransactions();
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
     * Obtiene transacciones paginadas con filtros opcionales (para infinite scroll)
     * @param filters - Filtros a aplicar
     * @param page - Número de página (comenzando en 0)
     * @param pageSize - Cantidad de transacciones por página
     * @returns Objeto con transacciones, info de paginación y estado
     */
    public getTransactionsPaginated(filters?: {
        type?: TransactionType;
        category?: string;
        startDate?: Date;
        endDate?: Date;
        month?: string; // YYYY-MM
    }, page: number = 0, pageSize: number = 20): {
        transactions: Transaction[];
        hasMore: boolean;
        totalCount: number;
        currentPage: number;
        pageSize: number;
    } {
        // Obtener todas las transacciones filtradas
        const allFiltered = this.getTransactions(filters);
        
        // Calcular paginación
        const startIndex = page * pageSize;
        const endIndex = startIndex + pageSize;
        const transactions = allFiltered.slice(startIndex, endIndex);
        
        return {
            transactions,
            hasMore: endIndex < allFiltered.length,
            totalCount: allFiltered.length,
            currentPage: page,
            pageSize
        };
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
            totalSavings,
            monthlyBudget: 0, // TODO: Implementar cálculo de presupuesto mensual
            budgetUsed: 0,    // TODO: Implementar cálculo de presupuesto usado
            budgetRemaining: 0, // TODO: Implementar cálculo de presupuesto restante
            savingsRate: totalIncome > 0 ? (totalSavings / totalIncome) * 100 : 0
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
    private storage: HybridRepository;
    private budgets: Budget[] = [];

    constructor(storage: HybridRepository) {
        this.storage = storage;
        this.initializeAsync();
    }

    /**
     * Inicialización asíncrona
     */
    private async initializeAsync(): Promise<void> {
        await this.loadBudgets();
    }

    /**
     * Carga presupuestos desde el almacenamiento local
     */
    private async loadBudgets(): Promise<void> {
        const data = await this.storage.load<Budget>(this.STORAGE_KEY);
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
    private storage: HybridRepository;
    private goals: Goal[] = [];

    constructor(storage: HybridRepository) {
        this.storage = storage;
        this.initializeAsync();
    }

    /**
     * Inicialización asíncrona
     */
    private async initializeAsync(): Promise<void> {
        await this.loadGoals();
    }

    /**
     * Carga metas desde el almacenamiento local
     */
    private async loadGoals(): Promise<void> {
        const data = await this.storage.load<Goal>(this.STORAGE_KEY);
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
            totalSavings,
            monthlyBudget: 0, // TODO: Implementar cálculo de presupuesto mensual
            budgetUsed: 0,    // TODO: Implementar cálculo de presupuesto usado
            budgetRemaining: 0, // TODO: Implementar cálculo de presupuesto restante
            savingsRate: totalIncome > 0 ? (totalSavings / totalIncome) * 100 : 0
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
            console.error('🔥 Error procesando PDF:', error);
            
            // Crear mensaje de error más específico
            let errorMessage = 'Error desconocido';
            
            if (error instanceof Error) {
                errorMessage = error.message;
                
                // Errores específicos de PDF.js
                if (errorMessage.includes('Invalid PDF')) {
                    errorMessage = 'El archivo PDF está corrupto o no es válido';
                } else if (errorMessage.includes('Password')) {
                    errorMessage = 'El PDF está protegido con contraseña';
                } else if (errorMessage.includes('Loading')) {
                    errorMessage = 'Error cargando el archivo PDF';
                }
            }
            
            throw new Error(`Error procesando PDF: ${errorMessage}`);
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
 * Clase para analizar texto con Google AI Studio (Gemini)
 * Extrae y estructura gastos de texto financiero usando IA de Google
 * COMPLETAMENTE GRATUITO con generosos límites
 */
class AIAnalyzer {
    private config: LLMConfig;
    private exchangeRate: number = 40; // Tipo de cambio por defecto USD -> UYU

    constructor() {
        // Configuración por defecto para Google AI Studio (GRATIS)
        this.config = {
            apiKey: '', // Se configurará dinámicamente
            model: 'gemini-1.5-flash', // Modelo rápido y gratuito de Google
            maxTokens: 4096, // Aumentado para estados de cuenta largos
            temperature: 0.3, // Baja para respuestas más consistentes
            baseUrl: 'https://generativelanguage.googleapis.com/v1beta/models'
        };
        
        // Obtener tipo de cambio al inicializar
        this.updateExchangeRate();
    }

    /**
     * Configura la API Key de Google AI Studio
     * @param apiKey - Clave de la API de Google AI Studio
     */
    public setApiKey(apiKey: string): void {
        this.config.apiKey = apiKey;
    }

    /**
     * Configura un modelo específico de Gemini
     * @param model - Modelo a usar (gemini-1.5-flash, gemini-1.5-pro, etc)
     */
    public setModel(model: string): void {
        this.config.model = model;
    }

    /**
     * Obtiene el tipo de cambio USD -> UYU del día
     * @returns Promesa con el tipo de cambio actualizado
     */
    private async updateExchangeRate(): Promise<void> {
        try {
            console.log('💱 Obteniendo tipo de cambio USD → UYU...');
            
            // Usar API gratuita de exchangerate.host
            const response = await fetch('https://api.exchangerate.host/latest?base=USD&symbols=UYU');
            const data = await response.json();
            
            if (data.success && data.rates && data.rates.UYU) {
                this.exchangeRate = data.rates.UYU;
                console.log(`💱 Tipo de cambio actualizado: 1 USD = ${this.exchangeRate} UYU`);
            } else {
                console.warn('⚠️ No se pudo obtener tipo de cambio, usando valor por defecto');
            }
        } catch (error) {
            console.warn('⚠️ Error obteniendo tipo de cambio, usando valor por defecto:', error);
        }
    }

    /**
     * Convierte un monto de USD a UYU
     * @param amountUSD - Monto en dólares
     * @returns Monto convertido en pesos uruguayos
     */
    private convertUSDToUYU(amountUSD: number): number {
        return Math.round(amountUSD * this.exchangeRate * 100) / 100; // Redondear a 2 decimales
    }

    /**
     * Obtiene el tipo de cambio actual
     * @returns Tipo de cambio USD -> UYU
     */
    public getCurrentExchangeRate(): number {
        return this.exchangeRate;
    }

    /**
     * Actualiza manualmente el tipo de cambio
     * @returns Promesa que se resuelve cuando se actualiza el tipo de cambio
     */
    public async refreshExchangeRate(): Promise<number> {
        await this.updateExchangeRate();
        return this.exchangeRate;
    }

    /**
     * Valida si una transacción es un gasto real (no ingreso ni devolución)
     * @param expense - Objeto expense a validar
     * @returns true si es un gasto válido
     */
    private isValidExpense(expense: any): boolean {
        if (!expense || !expense.description) return false;
        
        const description = expense.description.toString().toUpperCase();
        
        // Palabras clave que indican INGRESOS (excluir)
        const incomeKeywords = [
            'REDIVA',       // Devoluciones bancarias
            'DEVOLUCION',   // Devoluciones
            'CRE.',         // Créditos
            'CREDITO',      // Créditos
            'DEPOSITO',     // Depósitos
            'RETIRO',       // Retiros de efectivo
            'SALDO ANTERIOR', // Balance anterior
            'INTERES',      // Intereses a favor
            'REINTEGRO',    // Reintegros
            'ABONO',        // Abonos
            'CRE. CAMBIOS', // Créditos por cambio de moneda
            'BRED',         // Devoluciones BRED
            'DEVOTO SUPER'  // Puede ser devolución si está en créditos
        ];
        
        // Si contiene palabras de ingreso, excluir
        for (const keyword of incomeKeywords) {
            if (description.includes(keyword)) {
                console.log(`🚫 Excluido (ingreso): ${description}`);
                return false;
            }
        }
        
        // Palabras clave que confirman GASTOS (incluir)
        const expenseKeywords = [
            'COMPRA',       // Compras
            'DEB.',         // Débitos
            'DEBITO',       // Débitos
            'PAGO',         // Pagos
            'TRANSFERENCIA', // Transferencias salientes
            'FARMACIA',     // Farmacias
            'SUPERMERCADO', // Supermercados
            'COMBUSTIBLE',  // Combustible
            'RESTAURANT',   // Restaurantes
            'DEB. CAMBIOS', // Débitos por cambio de moneda
            'TRASPASO A',   // Traspasos salientes
            'MERCADO',      // MercadoPago, MercadoLibre
            'SUSHITRUE',    // Delivery
            'PETROBRAS',    // Combustible
            'CARNICERIA',   // Alimentación
            'VERDULERIA',   // Alimentación
            'FORUM',        // Shopping
            'HELADERIA'     // Alimentación
        ];
        
        // Si contiene palabras de gasto, incluir
        for (const keyword of expenseKeywords) {
            if (description.includes(keyword)) {
                console.log(`✅ Incluido (gasto): ${description}`);
                return true;
            }
        }
        
        // Si no tiene palabras específicas, incluir por defecto pero con menor confianza
        console.log(`❓ Incluido (sin clasificar): ${description}`);
        return true;
    }

    /**
     * Categoriza automáticamente un gasto basado en su descripción
     * @param description - Descripción del gasto
     * @returns Categoría apropiada
     */
    private categorizeExpense(description: string): string {
        if (!description) return 'Otros Gastos';
        
        const desc = description.toUpperCase();
        
        // Categorización inteligente
        if (desc.includes('SUPERMERCADO') || desc.includes('MERCADO')) return 'Alimentación';
        if (desc.includes('FARMACIA') || desc.includes('MEDICA')) return 'Salud';
        if (desc.includes('COMBUSTIBLE') || desc.includes('YPF') || desc.includes('ANCAP')) return 'Transporte';
        if (desc.includes('RESTAURANT') || desc.includes('DELIVERY') || desc.includes('COMIDA')) return 'Alimentación';
        if (desc.includes('VESTIMENTA') || desc.includes('ROPA')) return 'Ropa';
        if (desc.includes('NETFLIX') || desc.includes('SPOTIFY') || desc.includes('STREAMING')) return 'Entretenimiento';
        if (desc.includes('TELEFON') || desc.includes('INTERNET') || desc.includes('CABLE')) return 'Servicios';
        if (desc.includes('EDUCACION') || desc.includes('UNIVERSIDAD') || desc.includes('CURSO')) return 'Educación';
        
        return 'Otros Gastos';
    }

    /**
     * Analiza texto financiero y extrae gastos estructurados
     * @param text - Texto extraído del PDF
     * @returns Promesa con análisis de gastos
     */
    public async analyzeExpenses(text: string): Promise<AIAnalysisResponse> {
        try {
            if (!this.config.apiKey) {
                throw new Error('API Key de Google AI Studio no configurada');
            }

            // Actualizar tipo de cambio antes del análisis para tener datos frescos
            await this.updateExchangeRate();

            const prompt = this.buildAnalysisPrompt(text);
            const response = await this.callGoogleGemini(prompt);
            
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
     * Construye el prompt optimizado para extraer gastos con Gemini
     * @param text - Texto a analizar
     * @returns Prompt estructurado para Gemini
     */
    private buildAnalysisPrompt(text: string): string {
        return `Analiza este estado de cuenta bancario y extrae ÚNICAMENTE los GASTOS REALES (dinero que sale de la cuenta).

TEXTO:
${text}

INSTRUCCIONES CRÍTICAS:
1. INCLUIR solo transacciones que representen GASTOS/EGRESOS:
   - COMPRA (cualquier compra)
   - DEB. / DÉBITO (débitos)
   - Pagos de servicios
   - Transferencias salientes
   - Cualquier movimiento donde SALE dinero de la cuenta

2. EXCLUIR completamente (NO incluir):
   - REDIVA / DEVOLUCIÓN (son reintegros/ingresos)
   - CRE. / CRÉDITO (son ingresos)
   - DEPÓSITO (son ingresos)
   - RETIRO (movimiento de efectivo, no gasto)
   - Cualquier movimiento donde ENTRA dinero a la cuenta

3. Detección de moneda:
   - Monto < $110 = USD
   - Monto > $150 = UYU

4. RESPONDER solo JSON válido, máximo 100 gastos

FORMATO REQUERIDO:
{
  "success": true,
  "expenses": [
    {
      "description": "COMPRA SUPERMERCADO",
      "amount": 1134.00,
      "currency": "UYU"
    },
    {
      "description": "COMPRA FARMACIA",
      "amount": 368.00,
      "currency": "UYU"
    }
  ]
}

IMPORTANTE: Solo gastos reales donde sale dinero, ignora ingresos/devoluciones.

NOTA: Si hay más de 100 gastos, prioriza los montos más altos y más recientes.`;
    }

    /**
     * Llama a la API de Google Gemini
     * @param prompt - Prompt para enviar
     * @returns Respuesta de la API
     */
    private async callGoogleGemini(prompt: string): Promise<string> {
        const url = `${this.config.baseUrl}/${this.config.model}:generateContent?key=${this.config.apiKey}`;
        
        const requestBody = {
            contents: [{
                parts: [{
                    text: prompt
                }]
            }],
            generationConfig: {
                temperature: this.config.temperature,
                maxOutputTokens: this.config.maxTokens,
                topP: 0.8,
                topK: 10
            },
            safetySettings: [
                {
                    category: "HARM_CATEGORY_HARASSMENT",
                    threshold: "BLOCK_MEDIUM_AND_ABOVE"
                },
                {
                    category: "HARM_CATEGORY_HATE_SPEECH",
                    threshold: "BLOCK_MEDIUM_AND_ABOVE"
                }
            ]
        };

        try {
            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(requestBody)
            });

            if (!response.ok) {
                const errorData = await response.text();
                throw new Error(`Error API Google Gemini (${response.status}): ${errorData}`);
            }

            const data = await response.json();
            
            // Verificar que la respuesta tenga el formato esperado
            if (!data.candidates || !data.candidates[0] || !data.candidates[0].content) {
                throw new Error('Respuesta inválida de Google Gemini');
            }

            return data.candidates[0].content.parts[0].text;

        } catch (error) {
            if (error instanceof Error) {
                // Manejar errores específicos de Google AI
                if (error.message.includes('403')) {
                    throw new Error('API Key inválida o sin permisos. Verifica tu clave en https://aistudio.google.com/');
                } else if (error.message.includes('429')) {
                    throw new Error('Límite de uso excedido. Google AI Studio tiene límites generosos pero puedes haberlos alcanzado.');
                } else if (error.message.includes('400')) {
                    throw new Error('Solicitud inválida. El texto puede ser muy largo o tener formato incorrecto.');
                }
            }
            throw error;
        }
    }

    /**
     * Procesa la respuesta de Gemini y la convierte a estructura tipada
     * @param aiResponse - Respuesta cruda de Gemini
     * @returns Análisis estructurado
     */
    private parseAIResponse(aiResponse: string): AIAnalysisResponse {
        try {
            // Validación inicial
            if (!aiResponse || typeof aiResponse !== 'string') {
                throw new Error('Respuesta de IA vacía o inválida');
            }

            // Limpiar respuesta paso a paso
            let jsonStr = aiResponse.trim();
            
            // Log simplificado
            const estimatedExpenses = (jsonStr.match(/"description":/g) || []).length;
            console.log(`📊 ${estimatedExpenses} gastos detectados en la respuesta`);
            
            // Remover posibles marcadores de código y texto adicional
            jsonStr = jsonStr.replace(/```json\s*/gi, '').replace(/```\s*/g, '');
            jsonStr = jsonStr.replace(/^[^{]*/, ''); // Remover texto antes del primer {
            jsonStr = jsonStr.replace(/[^}]*$/, ''); // Remover texto después del último }
            
            // Limpiar caracteres problemáticos
            jsonStr = jsonStr.replace(/[\u0000-\u001F\u007F-\u009F]/g, ''); // Control chars
            jsonStr = jsonStr.replace(/\\n/g, '\\n'); // Escapar saltos de línea
            jsonStr = jsonStr.replace(/\\r/g, ''); // Remover retornos de carro
            jsonStr = jsonStr.replace(/\\t/g, ' '); // Reemplazar tabs por espacios
            
            // Extraer JSON de forma más robusta
            const jsonStart = jsonStr.indexOf('{');
            const jsonEnd = jsonStr.lastIndexOf('}');
            
            if (jsonStart === -1 || jsonEnd === -1 || jsonStart >= jsonEnd) {
                throw new Error('No se encontró estructura JSON válida en la respuesta');
            }
            
            jsonStr = jsonStr.substring(jsonStart, jsonEnd + 1);
            
            // Log para debugging
            console.log('🔍 JSON extraído (primeros 200 chars):', jsonStr.substring(0, 200));
            
            // Validar que el JSON tenga estructura básica antes de parsear
            if (!jsonStr.includes('"expenses"') && !jsonStr.includes("'expenses'")) {
                throw new Error('Respuesta no contiene el campo expenses requerido');
            }

            // Intentar parsing con sistema avanzado de reparación
            let parsed;
            try {
                parsed = JSON.parse(jsonStr);
                console.log('✅ JSON parseado exitosamente en primer intento');
            } catch (parseError) {
                console.log('🔧 Primer intento de parsing falló, iniciando reparación avanzada...');
                
                // Método 1: Reparaciones básicas
                let fixedJson = this.performBasicJSONRepairs(jsonStr);
                
                try {
                    parsed = JSON.parse(fixedJson);
                    console.log('✅ JSON reparado con método básico');
                } catch (secondError) {
                    console.log('🔧 Método básico falló, intentando reparación avanzada...');
                    
                    // Método 2: Reparación avanzada para respuestas largas
                    try {
                        parsed = this.performAdvancedJSONRepair(jsonStr);
                        console.log('✅ JSON reparado con método avanzado');
                    } catch (thirdError) {
                        console.error('❌ Todos los métodos de reparación fallaron');
                        console.error('🔍 Error original:', parseError);
                        console.error('🔍 Error método 2:', secondError);
                        console.error('🔍 Error método 3:', thirdError);
                        
                        // Log para debugging detallado
                        this.logJSONDebuggingInfo(jsonStr, parseError);
                        
                        throw new Error(`JSON inválido después de múltiples intentos de reparación: ${parseError instanceof Error ? parseError.message : 'Error desconocido'}`);
                    }
                }
            }

            // Validar estructura básica
            if (typeof parsed !== 'object' || parsed === null) {
                throw new Error('Respuesta no es un objeto JSON válido');
            }

            // Asegurar que expenses sea un array
            if (!parsed.expenses) {
                parsed.expenses = [];
            } else if (!Array.isArray(parsed.expenses)) {
                throw new Error('El campo expenses debe ser un array');
            }
            
            console.log(`✅ ${parsed.expenses.length} movimientos parseados del estado de cuenta`);

            // Procesar cada gasto con filtrado y conversión automática USD → UYU
            const filteredExpenses = parsed.expenses.filter((expense: any) => this.isValidExpense(expense));
            const excludedCount = parsed.expenses.length - filteredExpenses.length;
            
            console.log(`🔍 Filtrado: ${filteredExpenses.length} gastos incluidos, ${excludedCount} movimientos excluidos (ingresos/devoluciones)`);
            
            if (filteredExpenses.length > 80) {
                console.log(`📊 Estado de cuenta extenso detectado: ${filteredExpenses.length} gastos`);
            }
            
            const processedExpenses: ExtractedExpense[] = filteredExpenses
                .map((expense: any, index: number) => {
                const originalCurrency = expense.currency || 'UYU';
                const originalAmount = Math.abs(parseFloat(expense.amount) || 0);
                
                // Convertir automáticamente USD a UYU
                let finalAmount = originalAmount;
                let displayText = '';
                
                if (originalCurrency === 'USD') {
                    finalAmount = this.convertUSDToUYU(originalAmount);
                    displayText = `${(expense.description || 'Gasto').toString().trim()} - $${originalAmount} USD → $${finalAmount} UYU`;
                    console.log(`💱 Convertido: $${originalAmount} USD → $${finalAmount} UYU (TC: ${this.exchangeRate})`);
                } else {
                    displayText = `${(expense.description || 'Gasto').toString().trim()} - $${finalAmount} UYU`;
                }
                
                return {
                    id: `convert_${Date.now()}_${index}`,
                    date: new Date().toISOString().split('T')[0],
                    description: displayText,
                    amount: finalAmount, // Siempre en UYU
                    category: this.categorizeExpense(expense.description),
                    paymentMethod: 'card' as PaymentMethod,
                    confidence: 0.8,
                    isSelected: true,
                    originalText: `${expense.description} ${originalAmount} ${originalCurrency} → ${finalAmount} UYU`
                };
            });

            console.log(`✅ ${processedExpenses.length} gastos procesados exitosamente`);
            
            return {
                success: true,
                expenses: processedExpenses,
                confidence: Math.min(Math.max(parsed.confidence || 0.5, 0), 1), // Entre 0 y 1
                summary: parsed.summary || `Encontrados ${processedExpenses.length} gastos con Google Gemini`,
                error: undefined
            };

        } catch (error) {
            console.error('🔥 Error parseando respuesta de Gemini:', error);
            console.error('📄 Respuesta problemática (primeros 500 chars):', aiResponse.substring(0, 500));
            
            // Crear respuesta de fallback más detallada
            const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
            
            return {
                success: false,
                expenses: [],
                confidence: 0,
                summary: 'Error procesando respuesta de Google Gemini',
                error: `Error de parsing JSON: ${errorMessage}. Verifica que la respuesta de IA sea JSON válido.`
            };
        }
    }

    /**
     * Realiza reparaciones básicas en JSON
     * @param jsonStr - String JSON a reparar
     * @returns JSON reparado
     */
    private performBasicJSONRepairs(jsonStr: string): string {
        let fixedJson = jsonStr;
        
        // Arreglar comillas simples por dobles
        fixedJson = fixedJson.replace(/'/g, '"');
        
        // Arreglar trailing commas
        fixedJson = fixedJson.replace(/,(\s*[}\]])/g, '$1');
        
        // Arreglar propiedades sin comillas
        fixedJson = fixedJson.replace(/([{,]\s*)([a-zA-Z_][a-zA-Z0-9_]*)\s*:/g, '$1"$2":');
        
        // Arreglar números con comas decimales (formato europeo)
        fixedJson = fixedJson.replace(/"amount":\s*(\d+),(\d+)/g, '"amount": $1.$2');
        
        // Limpiar espacios extra
        fixedJson = fixedJson.replace(/\s+/g, ' ').trim();
        
        return fixedJson;
    }

    /**
     * Realiza reparación avanzada para JSONs largos con muchos elementos
     * @param jsonStr - String JSON a reparar
     * @returns Objeto parseado
     */
    private performAdvancedJSONRepair(jsonStr: string): any {
        console.log('🔧 Iniciando reparación avanzada de JSON...');
        
        try {
            // Método: Dividir y conquistar - parsear por secciones
            const result = this.parseJSONBySections(jsonStr);
            return result;
            
        } catch (sectionError) {
            console.log('🔧 Método por secciones falló, intentando reparación elemento por elemento...');
            
            // Método alternativo: Extraer y validar cada elemento
            return this.parseJSONElementByElement(jsonStr);
        }
    }

    /**
     * Parsea JSON dividiendo en secciones manejables
     * @param jsonStr - String JSON a parsear
     * @returns Objeto parseado
     */
    private parseJSONBySections(jsonStr: string): any {
        // Extraer metadata principal
        const metadataMatch = jsonStr.match(/{\s*"success":\s*(true|false),\s*"confidence":\s*([\d.]+),\s*"summary":\s*"([^"]*)",\s*"expenses":\s*\[/);
        
        if (!metadataMatch) {
            throw new Error('No se encontró metadata válida');
        }
        
        const success = metadataMatch[1] === 'true';
        const confidence = parseFloat(metadataMatch[2]);
        const summary = metadataMatch[3];
        
        // Extraer array de expenses
        const expensesStartIndex = jsonStr.indexOf('"expenses": [') + '"expenses": ['.length;
        const expensesEndIndex = jsonStr.lastIndexOf(']');
        
        if (expensesStartIndex === -1 || expensesEndIndex === -1) {
            throw new Error('No se encontró array de expenses válido');
        }
        
        const expensesArrayStr = jsonStr.substring(expensesStartIndex, expensesEndIndex);
        
        // Parsear elementos del array uno por uno
        const expenses = this.parseExpensesArray(expensesArrayStr);
        
        return {
            success,
            confidence,
            summary,
            expenses
        };
    }

    /**
     * Parsea array de expenses elemento por elemento
     * @param arrayStr - String del array de expenses
     * @returns Array de expenses validados
     */
    private parseExpensesArray(arrayStr: string): any[] {
        const expenses: any[] = [];
        const elements = this.splitJSONArray(arrayStr);
        
        console.log(`🔍 Procesando ${elements.length} elementos del array...`);
        console.log('📋 Muestra de elementos encontrados:');
        elements.slice(0, 3).forEach((el, idx) => {
            console.log(`   ${idx + 1}: ${el.substring(0, 80)}...`);
        });
        
        for (let i = 0; i < elements.length; i++) {
            try {
                const element = elements[i].trim();
                if (element) {
                    // Intentar parsear elemento individual
                    let parsedElement;
                    
                    try {
                        // Intentar parsing directo
                        parsedElement = JSON.parse('{' + element + '}');
                    } catch (parseErr) {
                        // Si falla, intentar reparar el elemento
                        try {
                            const repairedElement = this.repairJSONElement(element);
                            parsedElement = JSON.parse('{' + repairedElement + '}');
                            console.log(`🔧 Elemento ${i + 1} reparado exitosamente`);
                        } catch (repairErr) {
                            console.warn(`⚠️ No se pudo reparar elemento ${i + 1}:`, repairErr);
                            continue;
                        }
                    }
                    
                    // Validar que tenga los campos requeridos
                    if (this.validateExpenseElement(parsedElement)) {
                        // Asegurar que amount sea número
                        if (typeof parsedElement.amount === 'string') {
                            parsedElement.amount = parseFloat(parsedElement.amount.replace(/,/g, '.'));
                        }
                        
                        // Agregar campos faltantes si es necesario
                        parsedElement.id = parsedElement.id || `section_${Date.now()}_${expenses.length}`;
                        parsedElement.category = parsedElement.category || 'Otros Gastos';
                        parsedElement.paymentMethod = parsedElement.paymentMethod || 'card';
                        parsedElement.confidence = parsedElement.confidence || 0.7;
                        parsedElement.isSelected = true;
                        
                        expenses.push(parsedElement);
                        console.log(`✅ Elemento ${i + 1} agregado: ${parsedElement.description}`);
                    } else {
                        console.warn(`⚠️ Elemento ${i + 1} inválido después de validación:`, element.substring(0, 100));
                    }
                }
            } catch (elementError) {
                console.warn(`⚠️ Error parseando elemento ${i + 1}, omitiendo:`, elementError);
                console.warn(`📄 Elemento problemático:`, elements[i].substring(0, 200));
            }
        }
        
        console.log(`✅ ${expenses.length} elementos parseados exitosamente de ${elements.length} intentados`);
        console.log(`📊 Tasa de éxito: ${Math.round((expenses.length / elements.length) * 100)}%`);
        return expenses;
    }

    /**
     * Divide un array JSON en elementos individuales
     * @param arrayStr - String del array JSON
     * @returns Array de strings de elementos individuales
     */
    private splitJSONArray(arrayStr: string): string[] {
        const elements: string[] = [];
        let currentElement = '';
        let braceCount = 0;
        let inString = false;
        let escapeNext = false;
        
        for (let i = 0; i < arrayStr.length; i++) {
            const char = arrayStr[i];
            
            if (escapeNext) {
                currentElement += char;
                escapeNext = false;
                continue;
            }
            
            if (char === '\\') {
                escapeNext = true;
                currentElement += char;
                continue;
            }
            
            if (char === '"' && !escapeNext) {
                inString = !inString;
            }
            
            if (!inString) {
                if (char === '{') {
                    braceCount++;
                } else if (char === '}') {
                    braceCount--;
                    
                    if (braceCount === 0) {
                        currentElement += char;
                        elements.push(currentElement.trim());
                        currentElement = '';
                        continue;
                    }
                } else if (char === ',' && braceCount === 0) {
                    // Skip comma between elements
                    continue;
                }
            }
            
            currentElement += char;
        }
        
        // Agregar último elemento si existe
        if (currentElement.trim()) {
            elements.push(currentElement.trim());
        }
        
        return elements;
    }

    /**
     * Valida que un elemento expense tenga los campos requeridos
     * @param element - Elemento a validar
     * @returns true si es válido
     */
    private validateExpenseElement(element: any): boolean {
        try {
            if (!element || typeof element !== 'object') {
                return false;
            }

            // Validar date (debe existir y no estar vacío)
            if (!element.date || typeof element.date !== 'string' || element.date.trim() === '') {
                console.warn('⚠️ Elemento sin fecha válida:', element);
                return false;
            }

            // Validar description (debe existir y no estar vacío)
            if (!element.description || typeof element.description !== 'string' || element.description.trim() === '') {
                console.warn('⚠️ Elemento sin descripción válida:', element);
                return false;
            }

            // Validar amount (debe ser número > 0)
            let amount = element.amount;
            if (typeof amount === 'string') {
                // Convertir string a número (manejar comas decimales)
                amount = parseFloat(amount.replace(/,/g, '.'));
            }
            
            if (typeof amount !== 'number' || isNaN(amount) || amount <= 0) {
                console.warn('⚠️ Elemento sin amount válido:', element, 'Amount:', amount);
                return false;
            }

            console.log(`✅ Elemento válido: ${element.description} - ${amount}`);
            return true;

        } catch (error) {
            console.warn('⚠️ Error validando elemento:', error, element);
            return false;
        }
    }

    /**
     * Método alternativo: parsea JSON elemento por elemento desde cero
     * @param jsonStr - String JSON original
     * @returns Objeto parseado
     */
    private parseJSONElementByElement(jsonStr: string): any {
        console.log('🔧 Parseando JSON elemento por elemento...');
        
        // Crear estructura base
        const result = {
            success: true,
            confidence: 0.5,
            summary: 'Gastos extraídos con reparación avanzada',
            expenses: [] as any[]
        };
        
        // Buscar patrones de elementos expense (formato simplificado)
        const expensePattern = /"description":\s*"([^"]*)"[^}]*?"amount":\s*([\d.,]+)[^}]*?"currency":\s*"([^"]*)"/g;
        let match;
        let count = 0;
        
        while ((match = expensePattern.exec(jsonStr)) !== null && count < 150) { // Límite aumentado para estados de cuenta largos
            try {
                // Extraer datos del match simplificado: [descripción, monto, moneda]
                const description = match[1].trim();
                let amountStr = match[2].replace(/,/g, '.');
                const amount = Math.abs(parseFloat(amountStr));
                const originalCurrency = match[3] || 'UYU';
                
                // Convertir automáticamente USD a UYU si es necesario
                let finalAmount = amount;
                let displayText = '';
                
                if (originalCurrency === 'USD') {
                    finalAmount = this.convertUSDToUYU(amount);
                    displayText = `${description} - $${amount} USD → $${finalAmount} UYU`;
                } else {
                    displayText = `${description} - $${finalAmount} UYU`;
                }
                
                const expense = {
                    id: `repair_${Date.now()}_${count}`,
                    date: new Date().toISOString().split('T')[0],
                    description: displayText,
                    amount: finalAmount, // Siempre en UYU
                    category: 'Otros Gastos',
                    paymentMethod: 'card' as PaymentMethod,
                    confidence: 0.7,
                    isSelected: true,
                    originalText: `${description} ${amount} ${originalCurrency} → ${finalAmount} UYU`
                };
                
                if (amount > 0 && description.length > 0 && this.isValidExpense({description: description})) {
                    (result.expenses as any[]).push(expense);
                    count++;
                } else if (!this.isValidExpense({description: description})) {
                    console.log(`🚫 Fallback excluido: ${description}`);
                }
            } catch (expenseError) {
                console.warn(`⚠️ Error procesando expense ${count + 1}:`, expenseError);
            }
        }
        
        result.summary = `${result.expenses.length} gastos encontrados`;
        
        return result;
    }

    /**
     * Repara un elemento individual de JSON
     * @param element - String del elemento a reparar
     * @returns Elemento reparado
     */
    private repairJSONElement(element: string): string {
        let repaired = element.trim();
        
        // Arreglar comillas simples por dobles
        repaired = repaired.replace(/'/g, '"');
        
        // Arreglar trailing comma antes de }
        repaired = repaired.replace(/,(\s*})/, '$1');
        
        // Arreglar propiedades sin comillas
        repaired = repaired.replace(/([{,]\s*)([a-zA-Z_][a-zA-Z0-9_]*)\s*:/g, '$1"$2":');
        
        // Arreglar números con comas decimales
        repaired = repaired.replace(/"amount":\s*(\d+),(\d+)/g, '"amount": $1.$2');
        
        // Asegurar que no falte la llave de cierre
        if (!repaired.endsWith('}') && !repaired.includes('}')) {
            repaired += '}';
        }
        
        return repaired;
    }

    /**
     * Registra información detallada para debugging de JSON
     * @param jsonStr - String JSON problemático
     * @param error - Error de parsing
     */
    private logJSONDebuggingInfo(jsonStr: string, error: Error): void {
        console.group('🔍 DEBUG: Información detallada del error JSON');
        
        try {
            // Información del error
            console.log('📋 Error:', error.message);
            
            // Intentar extraer posición del error
            const positionMatch = error.message.match(/position (\d+)/);
            if (positionMatch) {
                const position = parseInt(positionMatch[1]);
                console.log(`📍 Posición del error: ${position}`);
                
                // Mostrar contexto alrededor del error
                const start = Math.max(0, position - 100);
                const end = Math.min(jsonStr.length, position + 100);
                const context = jsonStr.substring(start, end);
                const errorChar = jsonStr[position] || 'EOF';
                
                console.log('📄 Contexto del error:');
                console.log(`...${context}...`);
                console.log(`🎯 Carácter problemático: "${errorChar}" (código: ${errorChar.charCodeAt(0)})`);
            }
            
            // Estadísticas del JSON
            console.log('📊 Estadísticas del JSON:');
            console.log(`   - Longitud total: ${jsonStr.length} caracteres`);
            console.log(`   - Número de llaves abiertas: ${(jsonStr.match(/{/g) || []).length}`);
            console.log(`   - Número de llaves cerradas: ${(jsonStr.match(/}/g) || []).length}`);
            console.log(`   - Número de corchetes abiertos: ${(jsonStr.match(/\[/g) || []).length}`);
            console.log(`   - Número de corchetes cerrados: ${(jsonStr.match(/\]/g) || []).length}`);
            console.log(`   - Elementos "expenses" estimados: ${(jsonStr.match(/"date":/g) || []).length}`);
            
        } catch (debugError) {
            console.error('Error en debugging:', debugError);
        }
        
        console.groupEnd();
    }

    /**
     * Valida y formatea una fecha
     * @param dateStr - String de fecha a validar
     * @returns Fecha formateada YYYY-MM-DD
     */
    private validateAndFormatDate(dateStr: any): string {
        if (!dateStr) {
            return new Date().toISOString().split('T')[0];
        }

        const date = new Date(dateStr);
        if (isNaN(date.getTime())) {
            return new Date().toISOString().split('T')[0];
        }

        return date.toISOString().split('T')[0];
    }

    /**
     * Valida método de pago
     * @param method - Método a validar
     * @returns Método de pago válido
     */
    private validatePaymentMethod(method: any): PaymentMethod {
        const validMethods: PaymentMethod[] = ['card', 'cash', 'transfer', 'check'];
        if (validMethods.includes(method)) {
            return method;
        }
        return 'card'; // Por defecto
    }

    /**
     * Valida nivel de confianza
     * @param confidence - Confianza a validar
     * @returns Nivel de confianza válido
     */
    private validateConfidence(confidence: any): 'high' | 'medium' | 'low' {
        const validLevels = ['high', 'medium', 'low'];
        if (validLevels.includes(confidence)) {
            return confidence;
        }
        return 'medium'; // Por defecto
    }
}

// ==================== GESTOR DE CHAT CON IA ====================

/**
 * Gestor del chat financiero con IA
 * Maneja la comunicación con el asistente IA para consultas financieras
 * Integra con Google AI Studio (Gemini) para análisis inteligente
 */
class ChatManager {
    private financialChat: FinancialChat;
    private isInitialized: boolean = false;
    private chatMessages: any[] = [];

    constructor() {
        this.financialChat = new FinancialChat();
    }

    /**
     * Inicializa el chat con la API Key de Google AI
     * @param apiKey - Clave de la API de Google AI Studio
     */
    public initialize(apiKey: string): void {
        try {
            this.financialChat.initialize(apiKey);
            this.isInitialized = true;
            console.log('✅ Chat financiero inicializado correctamente');
        } catch (error) {
            console.error('❌ Error al inicializar el chat financiero:', error);
            throw error;
        }
    }

    /**
     * Verifica si el chat está listo para usar
     * @returns true si está inicializado
     */
    public isReady(): boolean {
        return this.isInitialized && this.financialChat.isReady();
    }

    /**
     * Procesa una consulta del usuario
     * @param userMessage - Mensaje del usuario
     * @param financialData - Datos financieros actuales
     * @returns Promesa con la respuesta de la IA
     */
    public async processQuery(userMessage: string, financialData: any): Promise<any> {
        try {
            if (!this.isReady()) {
                throw new Error('Chat financiero no inicializado');
            }

            if (!isValidChatMessage(userMessage)) {
                throw new Error('Mensaje inválido');
            }

            const response = await this.financialChat.processQuery(userMessage, financialData);
            return response;
        } catch (error) {
            console.error('❌ Error procesando consulta del chat:', error);
            return {
                success: false,
                message: 'Lo siento, no pude procesar tu consulta en este momento.',
                error: error instanceof Error ? error.message : 'Error desconocido'
            };
        }
    }

    /**
     * Genera sugerencias de preguntas basadas en los datos financieros
     * @param financialData - Datos financieros actuales
     * @returns Array de sugerencias
     */
    public generateSuggestions(financialData: any): string[] {
        try {
            return this.financialChat.generateSuggestions(financialData);
        } catch (error) {
            console.error('❌ Error generando sugerencias:', error);
            return [
                '¿Cuáles son mis mayores gastos este mes?',
                '¿Cómo puedo ahorrar más dinero?',
                '¿Cuál es mi balance actual?',
                '¿Qué meta de ahorro me recomiendas?'
            ];
        }
    }

    /**
     * Agrega un mensaje al historial del chat
     * @param message - Mensaje a agregar
     */
    public addMessage(message: any): void {
        this.chatMessages.push(message);
    }

    /**
     * Obtiene el historial de mensajes
     * @returns Array de mensajes
     */
    public getMessages(): any[] {
        return this.chatMessages;
    }

    /**
     * Limpia el historial del chat
     */
    public clearMessages(): void {
        this.chatMessages = [];
    }

    /**
     * Obtiene la configuración del chat
     * @returns Configuración actual
     */
    public getConfig(): any {
        return this.financialChat.getConfig();
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
    private storage: HybridRepository;
    private categoryManager: CategoryManager;
    private transactionManager: TransactionManager;
    private budgetManager: BudgetManager;
    private goalManager: GoalManager;
    private reportManager: ReportManager;

    // Procesadores para PDF e IA
    private pdfProcessor: PDFProcessor;
    private aiAnalyzer: AIAnalyzer;
    private chatManager: ChatManager;
    private chartsManager: ChartsManager;

    // Referencias a elementos del DOM
    private elements: {[key: string]: HTMLElement | HTMLInputElement | HTMLSelectElement} = {};

    // Estado para gastos extraídos del PDF
    private currentExtractedExpenses: ExtractedExpense[] = [];

    // Estado para infinite scroll de transacciones
    private transactionPagination = {
        currentPage: 0,
        pageSize: 20,
        hasMore: true,
        isLoading: false,
        allTransactionsLoaded: [] as Transaction[]
    };

    constructor() {
        // Inicializar capa de persistencia
        this.storage = new HybridRepository();
        
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
        this.chatManager = new ChatManager();
        this.chartsManager = new ChartsManager();

        // Inicializar cuando el DOM esté listo
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => this.initializeAsync());
        } else {
            this.initializeAsync();
        }
    }

    /**
     * Inicialización asíncrona
     */
    private async initializeAsync(): Promise<void> {
        try {
            await this.initialize();
        } catch (error) {
            console.error('❌ Error en inicialización asíncrona:', error);
        }
    }

    /**
     * Inicializa la aplicación
     * Configura elementos del DOM, event listeners y actualiza la UI inicial
     */
    private async initialize(): Promise<void> {
        try {
            this.initializeElements();
            this.setupEventListeners();
            this.setupTabNavigation();
            await this.populateCategories();
            await this.updateDashboard();
            await this.renderTransactions();
            await this.renderCategories();
            await this.renderBudgets();
            await this.renderGoals();
            
            // Inicializar chat con IA si hay API Key guardada
            this.initializeChatIfPossible();

            // Inicializar gráficos
            this.initializeCharts();
            
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
            'filterType', 'filterCategory', 'filterMonth', 'prevMonthBtn', 
            'nextMonthBtn', 'currentMonthDisplay', 'monthSelectorBtn', 'clearFiltersBtn',
            
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
            'expensesList', 'selectAllExpenses', 'addSelectedExpenses',
            
            // Chat con IA
            'chatInput', 'sendChatBtn', 'chatMessages',
            
            // Gráficos
            'chartPeriod', 'refreshCharts', 'chartPrevMonthBtn', 'chartNextMonthBtn', 
            'chartCurrentMonthDisplay', 'chartMonthSelectorBtn', 'chartFilterMonth'
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
        
        // Filtros de transacciones - reiniciar paginación cuando cambien
        ['filterType', 'filterCategory'].forEach(filterId => {
            this.elements[filterId]?.addEventListener('change', () => this.refreshTransactions());
        });
        
        // Event listener especial para el filtro de mes
        this.elements.filterMonth?.addEventListener('change', (e) => {
            const target = e.target as HTMLInputElement;
            this.updateMonthDisplay(target.value);
            this.refreshTransactions();
            this.updateDashboardForMonth(target.value);
            this.updateChartsForPeriod(target.value); // Actualizar gráficos para el mes seleccionado
        });
        
        // Event listeners para el filtro de meses mejorado
        this.elements.prevMonthBtn?.addEventListener('click', () => this.navigateMonth(-1));
        this.elements.nextMonthBtn?.addEventListener('click', () => this.navigateMonth(1));
        this.elements.monthSelectorBtn?.addEventListener('click', () => this.openMonthSelector());
        this.elements.clearFiltersBtn?.addEventListener('click', () => this.clearAllFilters());
        
        // Event listeners para tarjetas clickeables del dashboard
        this.setupDashboardCardListeners();
        
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

        // Chat con IA - Event listeners
        this.setupChatEventListeners();

        // Gráficos - Event listeners
        this.setupChartsEventListeners();
    }

    /**
     * Configura los event listeners para el chat con IA
     */
    private setupChatEventListeners(): void {
        // Input del chat
        this.elements.chatInput?.addEventListener('input', (e) => {
            const input = e.target as HTMLInputElement;
            const sendBtn = this.elements.sendChatBtn as HTMLButtonElement;
            if (sendBtn) {
                sendBtn.disabled = !input.value.trim();
            }
        });

        // Envío de mensaje con Enter
        this.elements.chatInput?.addEventListener('keypress', (e) => {
            const keyboardEvent = e as KeyboardEvent;
            if (keyboardEvent.key === 'Enter' && !keyboardEvent.shiftKey) {
                e.preventDefault();
                this.sendChatMessage();
            }
        });

        // Botón de enviar
        this.elements.sendChatBtn?.addEventListener('click', () => this.sendChatMessage());

        // Botones de sugerencias
        document.querySelectorAll('.suggestion-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const target = e.target as HTMLElement;
                const suggestion = target.dataset.suggestion;
                if (suggestion) {
                    this.handleSuggestionClick(suggestion);
                }
            });
        });
    }

    /**
     * Configura los event listeners para los gráficos
     */
    private setupChartsEventListeners(): void {
        // Selector de período
        this.elements.chartPeriod?.addEventListener('change', (e) => {
            const target = e.target as HTMLSelectElement;
            const selectedPeriod = target.value;
            
            // Si el período seleccionado es un mes específico, actualizar el filtro de meses
            if (selectedPeriod.match(/^\d{4}-\d{2}$/)) {
                if (this.elements.filterMonth) {
                    (this.elements.filterMonth as HTMLInputElement).value = selectedPeriod;
                    this.updateMonthDisplay(selectedPeriod);
                    this.refreshTransactions();
                    this.updateDashboardForMonth(selectedPeriod);
                }
            } else {
                // Si es un período predefinido, limpiar el filtro de meses
                if (this.elements.filterMonth) {
                    (this.elements.filterMonth as HTMLInputElement).value = '';
                    this.updateMonthDisplay('');
                    this.refreshTransactions();
                    this.updateDashboardForMonth();
                }
            }
            
            this.updateChartsForPeriod(selectedPeriod as any);
        });

        // Event listeners para el sistema de navegación de meses en charts
        this.elements.chartPrevMonthBtn?.addEventListener('click', () => this.navigateChartMonth(-1));
        this.elements.chartNextMonthBtn?.addEventListener('click', () => this.navigateChartMonth(1));
        this.elements.chartMonthSelectorBtn?.addEventListener('click', () => this.openChartMonthSelector());
        
        // Event listener para el filtro de mes de charts
        this.elements.chartFilterMonth?.addEventListener('change', (e) => {
            const target = e.target as HTMLInputElement;
            this.updateChartMonthDisplay(target.value);
            this.updateChartsForPeriod(target.value);
        });

        // Botón de actualizar gráficos
        this.elements.refreshCharts?.addEventListener('click', () => {
            this.refreshCharts();
        });
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
                this.updateChatSuggestions();
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
            const transactionId = await this.transactionManager.addTransaction({
                type,
                amount,
                description,
                category,
                date,
                paymentMethod
            });

            // Actualizar UI
            this.updateDashboard();
            this.refreshTransactions();
            
            // Actualizar gráficos
            const currentPeriod = this.chartsManager.getCurrentPeriod();
            this.updateChartsForPeriod(currentPeriod);
            
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

    // ==================== MÉTODOS DEL CHAT CON IA ====================

    /**
     * Envía un mensaje del chat
     */
    private async sendChatMessage(): Promise<void> {
        const chatInput = this.elements.chatInput as HTMLInputElement;
        const sendBtn = this.elements.sendChatBtn as HTMLButtonElement;
        const chatMessages = this.elements.chatMessages as HTMLElement;

        if (!chatInput || !sendBtn || !chatMessages) {
            console.error('❌ Elementos del chat no encontrados');
            return;
        }

        const userMessage = chatInput.value.trim();
        if (!userMessage) return;

        try {
            // Verificar si el chat está inicializado
            if (!this.chatManager.isReady()) {
                this.addChatMessage('ai', '🤖 El chat con IA no está disponible en este momento. Por favor, recarga la página para intentar nuevamente.');
                this.updateChatStatus(false);
                return;
            }

            // Deshabilitar input y botón
            chatInput.disabled = true;
            sendBtn.disabled = true;

            // Agregar mensaje del usuario
            this.addChatMessage('user', userMessage);

            // Limpiar input
            chatInput.value = '';
            sendBtn.disabled = true;

            // Mostrar indicador de escritura
            this.showTypingIndicator();

            // Obtener datos financieros actuales
            const financialData = this.getFinancialDataForChat();

            // Procesar consulta con IA
            const response = await this.chatManager.processQuery(userMessage, financialData);

            // Ocultar indicador de escritura
            this.hideTypingIndicator();

            // Agregar respuesta de la IA
            this.addChatMessage('ai', response.message);

        } catch (error) {
            console.error('❌ Error enviando mensaje del chat:', error);
            this.hideTypingIndicator();
            this.addChatMessage('ai', 'Lo siento, no pude procesar tu consulta en este momento.');
        } finally {
            // Rehabilitar input y botón
            chatInput.disabled = false;
            sendBtn.disabled = true;
            chatInput.focus();
        }
    }

    /**
     * Maneja el clic en una sugerencia
     * @param suggestion - Texto de la sugerencia
     */
    private handleSuggestionClick(suggestion: string): void {
        const chatInput = this.elements.chatInput as HTMLInputElement;
        if (chatInput) {
            chatInput.value = suggestion;
            chatInput.focus();
            // Habilitar botón de enviar
            const sendBtn = this.elements.sendChatBtn as HTMLButtonElement;
            if (sendBtn) {
                sendBtn.disabled = false;
            }
        }
    }

    /**
     * Agrega un mensaje al chat
     * @param type - Tipo de mensaje ('user' o 'ai')
     * @param content - Contenido del mensaje
     */
    private addChatMessage(type: 'user' | 'ai', content: string): void {
        const chatMessages = this.elements.chatMessages as HTMLElement;
        if (!chatMessages) return;

        const messageId = generateMessageId();
        const formattedContent = formatChatMessage(content);
        
        const messageHTML = `
            <div class="chat-message ${type}-message" id="${messageId}">
                <div class="message-avatar">
                    <i class="fas fa-${type === 'ai' ? 'robot' : 'user'}"></i>
                </div>
                <div class="message-content">
                    <p>${formattedContent}</p>
                </div>
            </div>
        `;

        chatMessages.insertAdjacentHTML('beforeend', messageHTML);
        
        // Scroll al final
        chatMessages.scrollTop = chatMessages.scrollHeight;

        // Agregar al historial del chat manager
        this.chatManager.addMessage({
            id: messageId,
            type,
            content,
            timestamp: new Date()
        });
    }

    /**
     * Muestra el indicador de escritura
     */
    private showTypingIndicator(): void {
        const chatMessages = this.elements.chatMessages as HTMLElement;
        if (!chatMessages) return;

        const typingHTML = `
            <div class="chat-message ai-message" id="typing-indicator">
                <div class="message-avatar">
                    <i class="fas fa-robot"></i>
                </div>
                <div class="message-content">
                    <div class="chat-typing">
                        <span>IA escribiendo</span>
                        <div class="typing-dots">
                            <div class="typing-dot"></div>
                            <div class="typing-dot"></div>
                            <div class="typing-dot"></div>
                        </div>
                    </div>
                </div>
            </div>
        `;

        chatMessages.insertAdjacentHTML('beforeend', typingHTML);
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }

    /**
     * Oculta el indicador de escritura
     */
    private hideTypingIndicator(): void {
        const typingIndicator = document.getElementById('typing-indicator');
        if (typingIndicator) {
            typingIndicator.remove();
        }
    }

    /**
     * Obtiene los datos financieros para el chat
     * @returns Datos financieros estructurados
     */
    private getFinancialDataForChat(): any {
        const transactions = this.transactionManager.getTransactions();
        const categories = this.categoryManager.getCategories();
        const goals = this.goalManager.getGoals();
        const summary = this.transactionManager.getFinancialSummary();

        return {
            transactions,
            categories,
            goals,
            summary
        };
    }

    /**
     * Actualiza las sugerencias del chat basadas en los datos financieros
     */
    private updateChatSuggestions(): void {
        if (!this.chatManager.isReady()) return;

        try {
            const financialData = this.getFinancialDataForChat();
            const suggestions = this.chatManager.generateSuggestions(financialData);

            // Actualizar botones de sugerencias
            const suggestionButtons = document.querySelectorAll('.suggestion-btn');
            suggestionButtons.forEach((btn, index) => {
                if (suggestions[index]) {
                    btn.setAttribute('data-suggestion', suggestions[index]);
                    const icon = btn.querySelector('i');
                    const text = btn.querySelector('span') || btn.textContent;
                    if (text) {
                        btn.innerHTML = `<i class="fas fa-${this.getSuggestionIcon(suggestions[index])}"></i> ${suggestions[index]}`;
                    }
                }
            });
        } catch (error) {
            console.error('❌ Error actualizando sugerencias del chat:', error);
        }
    }

    /**
     * Obtiene el icono para una sugerencia
     * @param suggestion - Texto de la sugerencia
     * @returns Clase del icono
     */
    private getSuggestionIcon(suggestion: string): string {
        if (suggestion.includes('gastos')) return 'chart-pie';
        if (suggestion.includes('ahorrar')) return 'piggy-bank';
        if (suggestion.includes('balance')) return 'wallet';
        if (suggestion.includes('meta')) return 'target';
        return 'question';
    }

    // ==================== MÉTODOS DE GRÁFICOS ====================

    /**
     * Actualiza los gráficos para un período específico
     * @param period - Período seleccionado
     */
    private updateChartsForPeriod(period: string): void {
        try {
            const expensesData = this.getExpensesDataForPeriod(period);
            const incomeData = this.getIncomeDataForPeriod(period);
            
            this.chartsManager.updateCharts(expensesData, incomeData, period as any);
            
            // Mostrar información del período en los gráficos
            this.updateChartPeriodInfo(period);
            
            // Actualizar el display del mes en el sistema de navegación de charts
            if (period.match(/^\d{4}-\d{2}$/)) {
                // Si es un mes específico, actualizar el display y el input
                this.updateChartMonthDisplay(period);
                if (this.elements.chartFilterMonth) {
                    (this.elements.chartFilterMonth as HTMLInputElement).value = period;
                }
            } else {
                // Si es un período predefinido, limpiar el display
                this.updateChartMonthDisplay('');
                if (this.elements.chartFilterMonth) {
                    (this.elements.chartFilterMonth as HTMLInputElement).value = '';
                }
            }
        } catch (error) {
            console.error('❌ Error actualizando gráficos:', error);
        }
    }

    /**
     * Actualiza la información del período mostrada en los gráficos
     * @param period - Período seleccionado
     */
    private updateChartPeriodInfo(period: string): void {
        try {
            // Buscar elementos donde mostrar la información del período
            const chartTitles = document.querySelectorAll('.chart-card h3');
            
            chartTitles.forEach(title => {
                const originalText = title.textContent || '';
                const baseTitle = originalText.replace(/\s*\([^)]*\)\s*$/, ''); // Remover período anterior
                
                let periodText = '';
                if (period.match(/^\d{4}-\d{2}$/)) {
                    periodText = ` (${this.getMonthDisplayName(period)})`;
                } else {
                    const periodNames: {[key: string]: string} = {
                        'current-month': ' (Mes actual)',
                        'last-month': ' (Mes anterior)',
                        'last-3-months': ' (Últimos 3 meses)',
                        'current-year': ' (Año actual)',
                        'all-time': ' (Todo el tiempo)'
                    };
                    periodText = periodNames[period] || '';
                }
                
                title.textContent = baseTitle + periodText;
            });
            
        } catch (error) {
            console.error('Error actualizando información del período en gráficos:', error);
        }
    }

    /**
     * Actualiza los gráficos manualmente
     */
    private refreshCharts(): void {
        try {
            const currentPeriod = this.chartsManager.getCurrentPeriod();
            this.updateChartsForPeriod(currentPeriod);
            this.showNotification('Gráficos actualizados', 'success');
        } catch (error) {
            console.error('❌ Error refrescando gráficos:', error);
            this.showNotification('Error actualizando gráficos', 'error');
        }
    }

    /**
     * Obtiene datos de gastos para un período específico
     * @param period - Período seleccionado
     * @returns Datos de gastos por categoría
     */
    private getExpensesDataForPeriod(period: string): any[] {
        const transactions = this.transactionManager.getTransactions();
        const categories = this.categoryManager.getCategories('expense');
        
        // Filtrar transacciones por período
        const filteredTransactions = this.filterTransactionsByPeriod(transactions, period);
        
        // Agrupar gastos por categoría
        const expensesByCategory = new Map<string, number>();
        
        filteredTransactions
            .filter(t => t.type === 'expense')
            .forEach(transaction => {
                const current = expensesByCategory.get(transaction.category) || 0;
                expensesByCategory.set(transaction.category, current + transaction.amount);
            });

        // Convertir a formato de gráfico
        const totalExpenses = Array.from(expensesByCategory.values()).reduce((sum, amount) => sum + amount, 0);
        
        return Array.from(expensesByCategory.entries()).map(([category, total]) => {
            const categoryInfo = categories.find(c => c.name === category);
            return {
                name: category,
                total: total,
                color: categoryInfo?.color || '#FF6384',
                percentage: totalExpenses > 0 ? (total / totalExpenses) * 100 : 0
            };
        }).sort((a, b) => b.total - a.total); // Ordenar por monto descendente
    }

    /**
     * Obtiene datos de ingresos para un período específico
     * @param period - Período seleccionado
     * @returns Datos de ingresos por categoría
     */
    private getIncomeDataForPeriod(period: string): any[] {
        const transactions = this.transactionManager.getTransactions();
        const categories = this.categoryManager.getCategories('income');
        
        // Filtrar transacciones por período
        const filteredTransactions = this.filterTransactionsByPeriod(transactions, period);
        
        // Agrupar ingresos por categoría
        const incomeByCategory = new Map<string, number>();
        
        filteredTransactions
            .filter(t => t.type === 'income')
            .forEach(transaction => {
                const current = incomeByCategory.get(transaction.category) || 0;
                incomeByCategory.set(transaction.category, current + transaction.amount);
            });

        // Convertir a formato de gráfico
        const totalIncome = Array.from(incomeByCategory.values()).reduce((sum, amount) => sum + amount, 0);
        
        return Array.from(incomeByCategory.entries()).map(([category, total]) => {
            const categoryInfo = categories.find(c => c.name === category);
            return {
                name: category,
                total: total,
                color: categoryInfo?.color || '#36A2EB',
                percentage: totalIncome > 0 ? (total / totalIncome) * 100 : 0
            };
        }).sort((a, b) => b.total - a.total); // Ordenar por monto descendente
    }

    /**
     * Filtra transacciones por período
     * @param transactions - Lista de transacciones
     * @param period - Período seleccionado (puede ser un mes específico YYYY-MM)
     * @returns Transacciones filtradas
     */
    private filterTransactionsByPeriod(transactions: Transaction[], period: string): Transaction[] {
        // Si el período es un mes específico (formato YYYY-MM)
        if (period.match(/^\d{4}-\d{2}$/)) {
            const startDate = new Date(period + '-01');
            const endDate = new Date(startDate.getFullYear(), startDate.getMonth() + 1, 0, 23, 59, 59);
            return transactions.filter(t => t.date >= startDate && t.date <= endDate);
        }

        // Períodos predefinidos
        const now = new Date();
        const currentMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        const threeMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 3, 1);
        const currentYear = new Date(now.getFullYear(), 0, 1);

        switch (period) {
            case 'current-month':
                return transactions.filter(t => t.date >= currentMonth);
            case 'last-month':
                return transactions.filter(t => t.date >= lastMonth && t.date < currentMonth);
            case 'last-3-months':
                return transactions.filter(t => t.date >= threeMonthsAgo);
            case 'current-year':
                return transactions.filter(t => t.date >= currentYear);
            case 'all-time':
            default:
                return transactions;
        }
    }

    /**
     * Inicializa los gráficos al cargar la página
     */
    private initializeCharts(): void {
        try {
            // Esperar un poco para que Chart.js se cargue
            setTimeout(() => {
                this.updateChartsForPeriod('current-month');
            }, 500);
        } catch (error) {
            console.error('❌ Error inicializando gráficos:', error);
        }
    }

    /**
     * Inicializa el chat con IA usando la API Key por defecto o guardada
     */
    private initializeChatIfPossible(): void {
        try {
            // Usar la API Key por defecto del sistema
            const apiKey = getApiKey();
            
            if (apiKey && apiKey.trim() !== '') {
                this.chatManager.initialize(apiKey);
                console.log('✅ Chat con IA inicializado con API Key del sistema');
                this.updateChatStatus(true);
                
                // Guardar la API Key en localStorage para futuras sesiones
                this.saveGoogleAPIKey(apiKey);
            } else {
                console.log('ℹ️ Chat con IA no inicializado: No hay API Key disponible');
                this.updateChatStatus(false);
            }
        } catch (error) {
            console.error('❌ Error inicializando chat con IA:', error);
            this.updateChatStatus(false);
        }
    }

    /**
     * Actualiza el estado visual del chat
     * @param isReady - Si el chat está listo para usar
     */
    private updateChatStatus(isReady: boolean): void {
        const chatInput = this.elements.chatInput as HTMLInputElement;
        const sendBtn = this.elements.sendChatBtn as HTMLButtonElement;
        const chatMessages = this.elements.chatMessages as HTMLElement;

        if (!chatInput || !sendBtn || !chatMessages) return;

        if (isReady) {
            chatInput.placeholder = 'Escribe tu pregunta sobre finanzas...';
            chatInput.disabled = false;
            sendBtn.disabled = true;
            
            // Actualizar mensaje inicial si existe
            const initialMessage = chatMessages.querySelector('.ai-message');
            if (initialMessage) {
                const content = initialMessage.querySelector('.message-content p:last-child');
                if (content) {
                    content.innerHTML = '<small>✅ <strong>Chat con IA activo:</strong> Puedes hacer preguntas sobre tus finanzas.</small>';
                }
            }
        } else {
            chatInput.placeholder = 'Chat no disponible - Sube un PDF primero';
            chatInput.disabled = true;
            sendBtn.disabled = true;
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
     * Renderiza la lista de transacciones con infinite scroll
     * @param append - Si true, agrega transacciones al final. Si false, reemplaza toda la lista
     */
    private renderTransactions(append: boolean = false): void {
        const container = this.elements.transactionsList;
        if (!container) return;

        try {
            // Obtener filtros actuales
            const filters = this.getCurrentFilters();

            // Si no es append, reiniciar paginación
            if (!append) {
                this.resetTransactionPagination();
                container.innerHTML = '';
            }

            // Verificar si ya estamos cargando o no hay más datos
            if (this.transactionPagination.isLoading || !this.transactionPagination.hasMore) {
                return;
            }

            // Marcar como cargando
            this.transactionPagination.isLoading = true;

            // Obtener transacciones paginadas
            const result = this.transactionManager.getTransactionsPaginated(
                filters,
                this.transactionPagination.currentPage,
                this.transactionPagination.pageSize
            );

            // Agregar transacciones a la lista cargada
            this.transactionPagination.allTransactionsLoaded.push(...result.transactions);

            // Actualizar estado de paginación
            this.transactionPagination.hasMore = result.hasMore;
            this.transactionPagination.currentPage++;
            this.transactionPagination.isLoading = false;

            // Si no hay transacciones en absoluto
            if (this.transactionPagination.allTransactionsLoaded.length === 0 && !append) {
                container.innerHTML = `
                    <div class="no-data">
                        <i class="fas fa-receipt"></i>
                        <p>No hay transacciones que mostrar</p>
                    </div>
                `;
                return;
            }

            // Renderizar nuevas transacciones
            if (result.transactions.length > 0) {
                const transactionsHTML = result.transactions.map(transaction => this.renderTransactionItem(transaction)).join('');
                
                if (append) {
                    // Quitar el indicador de carga si existe
                    const loadingIndicator = container.querySelector('.loading-indicator');
                    if (loadingIndicator) {
                        loadingIndicator.remove();
                    }
                    container.insertAdjacentHTML('beforeend', transactionsHTML);
                } else {
                    container.innerHTML = transactionsHTML;
                }
            }

            // Agregar indicador de carga si hay más datos
            if (this.transactionPagination.hasMore) {
                this.addLoadingIndicator(container);
            }

            // Configurar scroll listener solo en la primera carga
            if (!append) {
                this.setupTransactionScrollListener();
            }

        } catch (error) {
            console.error('Error renderizando transacciones:', error);
            this.transactionPagination.isLoading = false;
            
            if (!append) {
                container.innerHTML = `
                    <div class="error-message">
                        <i class="fas fa-exclamation-circle"></i>
                        <p>Error cargando transacciones</p>
                    </div>
                `;
            }
        }
    }

    /**
     * Renderiza un elemento individual de transacción
     * @param transaction - Transacción a renderizar
     * @returns HTML string del elemento
     */
    private renderTransactionItem(transaction: Transaction): string {
        return `
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
        `;
    }

    /**
     * Obtiene los filtros actuales de la UI
     * @returns Objeto con filtros activos
     */
    private getCurrentFilters(): any {
        const typeFilter = (this.elements.filterType as HTMLSelectElement)?.value as TransactionType;
        const categoryFilter = (this.elements.filterCategory as HTMLSelectElement)?.value;
        const monthFilter = (this.elements.filterMonth as HTMLInputElement)?.value;

        const filters: any = {};
        if (typeFilter) filters.type = typeFilter;
        if (categoryFilter) filters.category = categoryFilter;
        if (monthFilter) filters.month = monthFilter;

        return filters;
    }

    /**
     * Navega al mes anterior o siguiente
     * @param direction - Dirección de navegación (-1 para anterior, 1 para siguiente)
     */
    private navigateMonth(direction: number): void {
        const currentMonthInput = this.elements.filterMonth as HTMLInputElement;
        if (!currentMonthInput || !currentMonthInput.value) {
            // Si no hay mes seleccionado, usar el mes actual
            const currentMonth = new Date().toISOString().substr(0, 7);
            currentMonthInput.value = currentMonth;
        }

        const availableMonths = this.getAvailableMonths();
        if (availableMonths.length === 0) {
            this.showNotification('No hay transacciones disponibles', 'info');
            return;
        }

        const currentMonth = currentMonthInput.value;
        let currentIndex = availableMonths.indexOf(currentMonth);
        
        // Si el mes actual no está en la lista, usar el más reciente
        if (currentIndex === -1) {
            currentIndex = 0;
        }

        // Calcular nuevo índice
        const newIndex = currentIndex + direction;
        
        // Verificar límites
        if (newIndex < 0 || newIndex >= availableMonths.length) {
            const directionText = direction > 0 ? 'siguiente' : 'anterior';
            this.showNotification(`No hay más meses ${directionText} con transacciones`, 'info');
            return;
        }

        const newMonth = availableMonths[newIndex];
        currentMonthInput.value = newMonth;
        
        this.updateMonthDisplay(newMonth);
        this.refreshTransactions();
        this.updateDashboardForMonth(newMonth);
        this.updateChartsForPeriod(newMonth); // Actualizar gráficos para el mes seleccionado
        
        // Mostrar notificación con información del mes
        const transactionCount = this.transactionManager.getTransactions({ month: newMonth }).length;
        this.showNotification(`Navegando a ${this.getMonthDisplayName(newMonth)} (${transactionCount} transacciones)`, 'info');
    }

    /**
     * Abre el selector de mes nativo
     */
    private openMonthSelector(): void {
        const monthInput = this.elements.filterMonth as HTMLInputElement;
        if (monthInput) {
            monthInput.click();
        }
    }

    /**
     * Limpia todos los filtros aplicados
     */
    private clearAllFilters(): void {
        // Limpiar filtros
        if (this.elements.filterType) {
            (this.elements.filterType as HTMLSelectElement).value = '';
        }
        if (this.elements.filterCategory) {
            (this.elements.filterCategory as HTMLSelectElement).value = '';
        }
        if (this.elements.filterMonth) {
            (this.elements.filterMonth as HTMLInputElement).value = '';
        }
        
        // Actualizar display del mes
        this.updateMonthDisplay('');
        
        // Refrescar transacciones
        this.refreshTransactions();
        
        // Actualizar gráficos para mostrar todos los datos
        this.updateChartsForPeriod('all-time');
        
        this.showNotification('Filtros limpiados', 'info');
    }

    /**
     * Actualiza el display visual del mes seleccionado
     * @param monthString - Mes en formato YYYY-MM
     */
    private updateMonthDisplay(monthString: string): void {
        const displayElement = this.elements.currentMonthDisplay as HTMLElement;
        if (!displayElement) return;

        if (!monthString) {
            displayElement.textContent = 'Todos los meses';
            return;
        }

        displayElement.textContent = this.getMonthDisplayName(monthString);
    }

    /**
     * Obtiene todos los meses que tienen transacciones
     * @returns Array de meses en formato YYYY-MM
     */
    private getAvailableMonths(): string[] {
        const months = new Set<string>();
        const transactions = this.transactionManager.getTransactions();
        
        transactions.forEach(trans => {
            const month = trans.date.toISOString().substr(0, 7);
            months.add(month);
        });
        
        return Array.from(months).sort().reverse(); // Más recientes primero
    }

    /**
     * Verifica si un mes tiene transacciones
     * @param month - Mes en formato YYYY-MM
     * @returns true si tiene transacciones
     */
    private hasTransactionsInMonth(month: string): boolean {
        const transactions = this.transactionManager.getTransactions({ month });
        return transactions.length > 0;
    }

    /**
     * Obtiene el nombre formateado de un mes
     * @param monthString - Mes en formato YYYY-MM
     * @returns Nombre del mes en español
     */
    private getMonthDisplayName(monthString: string): string {
        try {
            const date = new Date(monthString + '-01');
            const monthNames = [
                'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
                'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
            ];
            
            const monthName = monthNames[date.getMonth()];
            const year = date.getFullYear();
            
            return `${monthName} ${year}`;
        } catch (error) {
            console.error('Error formateando fecha:', error);
            return monthString;
        }
    }

    /**
     * Actualiza el dashboard para mostrar datos de un mes específico
     * @param monthString - Mes en formato YYYY-MM (opcional)
     */
    private updateDashboardForMonth(monthString?: string): void {
        try {
            const summary = this.transactionManager.getFinancialSummary(monthString);
            
            // Actualizar valores del dashboard
            if (this.elements.totalIncome) {
                (this.elements.totalIncome as HTMLElement).textContent = `$${summary.totalIncome.toFixed(2)}`;
            }
            if (this.elements.totalExpenses) {
                (this.elements.totalExpenses as HTMLElement).textContent = `$${summary.totalExpenses.toFixed(2)}`;
            }
            if (this.elements.totalBalance) {
                (this.elements.totalBalance as HTMLElement).textContent = `$${summary.balance.toFixed(2)}`;
            }
            
            // Actualizar el texto del período en las tarjetas
            const periodText = monthString ? this.getMonthDisplayName(monthString) : 'Este mes';
            document.querySelectorAll('.period').forEach(element => {
                (element as HTMLElement).textContent = periodText;
            });
            
            // Sincronizar el selector de período de gráficos
            this.syncChartPeriodSelector(monthString);
            
        } catch (error) {
            console.error('Error actualizando dashboard para mes específico:', error);
        }
    }

    /**
     * Sincroniza el selector de período de gráficos con el filtro de meses
     * @param monthString - Mes en formato YYYY-MM (opcional)
     */
    private syncChartPeriodSelector(monthString?: string): void {
        const chartPeriodSelector = this.elements.chartPeriod as HTMLSelectElement;
        if (!chartPeriodSelector) return;

        if (monthString) {
            // Si hay un mes específico seleccionado, actualizar el selector de gráficos
            // Buscar una opción que coincida o crear una personalizada
            const monthDisplayName = this.getMonthDisplayName(monthString);
            
            // Verificar si ya existe una opción para este mes
            let optionExists = false;
            for (let i = 0; i < chartPeriodSelector.options.length; i++) {
                const option = chartPeriodSelector.options[i];
                if (option.value === monthString || option.text === monthDisplayName) {
                    optionExists = true;
                    chartPeriodSelector.selectedIndex = i;
                    break;
                }
            }
            
            // Si no existe, agregar una opción temporal
            if (!optionExists) {
                const newOption = document.createElement('option');
                newOption.value = monthString;
                newOption.text = monthDisplayName;
                chartPeriodSelector.add(newOption);
                chartPeriodSelector.selectedIndex = chartPeriodSelector.options.length - 1;
            }
            
            // Sincronizar también con el sistema de navegación de meses
            this.updateChartMonthDisplay(monthString);
            if (this.elements.chartFilterMonth) {
                (this.elements.chartFilterMonth as HTMLInputElement).value = monthString;
            }
        } else {
            // Si no hay mes específico, volver al período por defecto
            chartPeriodSelector.value = 'current-month';
            
            // Limpiar el sistema de navegación de meses
            this.updateChartMonthDisplay('');
            if (this.elements.chartFilterMonth) {
                (this.elements.chartFilterMonth as HTMLInputElement).value = '';
            }
        }
    }

    /**
     * Navega al mes anterior o siguiente para los gráficos
     * @param direction - Dirección de navegación (-1 para anterior, 1 para siguiente)
     */
    private navigateChartMonth(direction: number): void {
        const currentMonthInput = this.elements.chartFilterMonth as HTMLInputElement;
        if (!currentMonthInput || !currentMonthInput.value) {
            // Si no hay mes seleccionado, usar el mes actual
            const currentMonth = new Date().toISOString().substr(0, 7);
            currentMonthInput.value = currentMonth;
        }

        const availableMonths = this.getAvailableMonths();
        if (availableMonths.length === 0) {
            this.showNotification('No hay transacciones disponibles para gráficos', 'info');
            return;
        }

        const currentMonth = currentMonthInput.value;
        let currentIndex = availableMonths.indexOf(currentMonth);
        
        // Si el mes actual no está en la lista, usar el más reciente
        if (currentIndex === -1) {
            currentIndex = 0;
        }

        // Calcular nuevo índice
        const newIndex = currentIndex + direction;
        
        // Verificar límites
        if (newIndex < 0 || newIndex >= availableMonths.length) {
            const directionText = direction > 0 ? 'siguiente' : 'anterior';
            this.showNotification(`No hay más meses ${directionText} con transacciones para gráficos`, 'info');
            return;
        }

        const newMonth = availableMonths[newIndex];
        currentMonthInput.value = newMonth;
        
        this.updateChartMonthDisplay(newMonth);
        this.updateChartsForPeriod(newMonth);
        
        // Mostrar notificación con información del mes
        const transactionCount = this.transactionManager.getTransactions({ month: newMonth }).length;
        this.showNotification(`Gráficos actualizados para ${this.getMonthDisplayName(newMonth)} (${transactionCount} transacciones)`, 'info');
    }

    /**
     * Abre el selector de mes nativo para los gráficos
     */
    private openChartMonthSelector(): void {
        const monthInput = this.elements.chartFilterMonth as HTMLInputElement;
        if (monthInput) {
            monthInput.click();
        }
    }

    /**
     * Actualiza el display visual del mes seleccionado para los gráficos
     * @param monthString - Mes en formato YYYY-MM
     */
    private updateChartMonthDisplay(monthString: string): void {
        const displayElement = this.elements.chartCurrentMonthDisplay as HTMLElement;
        if (!displayElement) return;

        if (!monthString) {
            displayElement.textContent = 'Mes actual';
            return;
        }

        displayElement.textContent = this.getMonthDisplayName(monthString);
    }

    /**
     * Configura los event listeners para las tarjetas clickeables del dashboard
     */
    private setupDashboardCardListeners(): void {
        // Tarjeta de ingresos
        const incomeCard = document.getElementById('incomeCard');
        if (incomeCard) {
            incomeCard.addEventListener('click', () => this.handleDashboardCardClick('income'));
            incomeCard.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    this.handleDashboardCardClick('income');
                }
            });
        }

        // Tarjeta de gastos
        const expenseCard = document.getElementById('expenseCard');
        if (expenseCard) {
            expenseCard.addEventListener('click', () => this.handleDashboardCardClick('expense'));
            expenseCard.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    this.handleDashboardCardClick('expense');
                }
            });
        }
    }

    /**
     * Maneja el clic en las tarjetas del dashboard
     * @param transactionType - Tipo de transacción (income/expense)
     */
    private handleDashboardCardClick(transactionType: 'income' | 'expense'): void {
        try {
            // Cambiar a la pestaña de transacciones
            this.switchTab('transactions');
            
            // Pre-seleccionar el tipo de transacción
            if (this.elements.transactionType) {
                (this.elements.transactionType as HTMLSelectElement).value = transactionType;
                this.populateTransactionCategories(); // Cargar categorías correspondientes
            }
            
            // Hacer scroll al formulario de transacciones
            this.scrollToTransactionForm();
            
            // Mostrar notificación con información contextual
            const typeText = transactionType === 'income' ? 'ingreso' : 'gasto';
            const currentAmount = transactionType === 'income' 
                ? (this.elements.totalIncome as HTMLElement)?.textContent || '$0.00'
                : (this.elements.totalExpenses as HTMLElement)?.textContent || '$0.00';
            
            this.showNotification(`Preparado para agregar un ${typeText} (${currentAmount} actual)`, 'info');
            
            // Enfocar el campo de monto después de un pequeño delay
            setTimeout(() => {
                if (this.elements.transactionAmount) {
                    (this.elements.transactionAmount as HTMLInputElement).focus();
                }
            }, 500);
            
            // Agregar efecto visual temporal al formulario
            this.highlightTransactionForm(transactionType);
            
        } catch (error) {
            console.error('Error manejando clic en tarjeta del dashboard:', error);
            this.showNotification('Error al navegar al formulario', 'error');
        }
    }

    /**
     * Resalta visualmente el formulario de transacciones
     * @param transactionType - Tipo de transacción seleccionado
     */
    private highlightTransactionForm(transactionType: 'income' | 'expense'): void {
        const form = this.elements.transactionForm;
        if (!form) return;

        // Agregar clase de resaltado temporal
        const highlightClass = transactionType === 'income' ? 'highlight-income' : 'highlight-expense';
        form.classList.add(highlightClass);
        
        // Remover la clase después de 2 segundos
        setTimeout(() => {
            form.classList.remove(highlightClass);
        }, 2000);
    }

    /**
     * Hace scroll suave al formulario de transacciones
     */
    private scrollToTransactionForm(): void {
        const transactionForm = this.elements.transactionForm;
        if (transactionForm) {
            transactionForm.scrollIntoView({
                behavior: 'smooth',
                block: 'start'
            });
        }
    }

    /**
     * Reinicia el estado de paginación de transacciones
     */
    private resetTransactionPagination(): void {
        this.transactionPagination.currentPage = 0;
        this.transactionPagination.hasMore = true;
        this.transactionPagination.isLoading = false;
        this.transactionPagination.allTransactionsLoaded = [];
    }

    /**
     * Agrega un indicador de carga al final de la lista
     * @param container - Contenedor de transacciones
     */
    private addLoadingIndicator(container: HTMLElement): void {
        const loadingHTML = `
            <div class="loading-indicator" style="text-align: center; padding: 20px; color: #666;">
                <i class="fas fa-spinner fa-spin" style="margin-right: 8px;"></i>
                Cargando más transacciones...
            </div>
        `;
        container.insertAdjacentHTML('beforeend', loadingHTML);
    }

    /**
     * Configura el listener para infinite scroll en transacciones
     */
    private setupTransactionScrollListener(): void {
        const container = this.elements.transactionsList;
        if (!container) return;

        // Remover listener anterior si existe
        container.removeEventListener('scroll', this.handleTransactionScroll.bind(this));

        // Agregar nuevo listener con throttling
        let scrollTimeout: ReturnType<typeof setTimeout>;
        const throttledScrollHandler = () => {
            clearTimeout(scrollTimeout);
            scrollTimeout = setTimeout(() => {
                this.handleTransactionScroll();
            }, 100);
        };

        container.addEventListener('scroll', throttledScrollHandler);
    }

    /**
     * Maneja el evento de scroll para cargar más transacciones
     */
    private handleTransactionScroll(): void {
        const container = this.elements.transactionsList;
        if (!container) return;

        // Calcular si estamos cerca del final
        const scrollTop = container.scrollTop;
        const scrollHeight = container.scrollHeight;
        const clientHeight = container.clientHeight;
        const scrollPercentage = (scrollTop + clientHeight) / scrollHeight;

        // Cargar más cuando estemos al 80% del scroll
        if (scrollPercentage > 0.8 && this.transactionPagination.hasMore && !this.transactionPagination.isLoading) {
            this.renderTransactions(true); // append = true
        }
    }

    /**
     * Refresca la lista de transacciones reiniciando la paginación
     * Se usa cuando cambian filtros o se agregan/eliminan transacciones
     */
    private refreshTransactions(): void {
        this.resetTransactionPagination();
        this.renderTransactions(false); // append = false para reemplazar
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
                    this.refreshTransactions();
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
     * Edita una transacción usando prompts para una experiencia simple
     * @param id - ID de la transacción a editar
     */
    public editTransaction(id: string): void {
        try {
            const transactions = this.transactionManager.getTransactions();
            const transaction = transactions.find(t => t.id === id);
            
            if (!transaction) {
                this.showNotification('Transacción no encontrada', 'error');
                return;
            }

            // Editar descripción
            const newDescription = prompt('Nueva descripción:', transaction.description);
            
            if (newDescription === null) {
                // Usuario canceló
                return;
            }
            
            if (newDescription.trim() === '') {
                this.showNotification('La descripción no puede estar vacía', 'error');
                return;
            }

            // Editar monto
            const newAmountStr = prompt('Nuevo monto:', transaction.amount.toString());
            
            if (newAmountStr === null) {
                // Usuario canceló
                return;
            }

            const newAmount = parseFloat(newAmountStr);
            
            if (isNaN(newAmount) || newAmount <= 0) {
                this.showNotification('El monto debe ser un número mayor a 0', 'error');
                return;
            }

            // Preparar los datos a actualizar
            const updates = {
                description: newDescription.trim(),
                amount: newAmount
            };

            // Actualizar la transacción usando el método del manager
            const updated = this.transactionManager.updateTransaction(id, updates);
            
            if (updated) {
                // Actualizar UI
                this.updateDashboard();
                this.refreshTransactions();
                
                this.showNotification(`Transacción actualizada correctamente`, 'success');
            } else {
                this.showNotification('Error actualizando la transacción', 'error');
            }
            
        } catch (error) {
            console.error('Error editando transacción:', error);
            this.showNotification(error instanceof Error ? error.message : 'Error editando transacción', 'error');
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
            
            if (!category) {
                this.showNotification('Categoría no encontrada', 'error');
                return;
            }

            // Crear modal de edición o usar prompt para una solución rápida
            const newName = prompt('Nuevo nombre de la categoría:', category.name);
            
            if (newName === null) {
                // Usuario canceló
                return;
            }
            
            if (newName.trim() === '') {
                this.showNotification('El nombre de la categoría no puede estar vacío', 'error');
                return;
            }

            const newDescription = prompt('Nueva descripción (opcional):', category.description || '');
            
            // Preparar los datos a actualizar
            const updates = {
                name: newName.trim(),
                description: newDescription?.trim() || category.description
            };

            // Actualizar en el manager usando el método público
            const updated = this.categoryManager.updateCategory(id, updates);
            
            if (updated) {
                // Actualizar UI
                this.populateCategories();
                this.renderCategories();
                
                this.showNotification(`Categoría "${newName}" actualizada correctamente`, 'success');
            } else {
                this.showNotification('Error actualizando la categoría', 'error');
            }
            
        } catch (error) {
            console.error('Error editando categoría:', error);
            this.showNotification('Error editando categoría', 'error');
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
            const apiKey = this.getGoogleAPIKey();
            if (!apiKey) {
                // Solicitar API Key al usuario
                const userApiKey = prompt(
                    '🔑 Google AI Studio API Key (GRATIS)\n\n' +
                    'Para usar esta funcionalidad necesitas una API Key de Google AI Studio.\n' +
                    '1. Ve a https://aistudio.google.com/\n' +
                    '2. Haz clic en "Get API key"\n' +
                    '3. Crea una nueva API Key (es GRATIS)\n' +
                    '4. Pégala aquí abajo:\n\n' +
                    'Nota: Google AI Studio es completamente gratuito con límites generosos.'
                );

                if (!userApiKey || !userApiKey.trim()) {
                    this.hideProcessingStatus();
                    processBtn.disabled = false;
                    this.showNotification('API Key requerida para continuar', 'warning');
                    return;
                }

                this.saveGoogleAPIKey(userApiKey.trim());
                this.aiAnalyzer.setApiKey(userApiKey.trim());
                this.chatManager.initialize(userApiKey.trim());
            } else {
                this.aiAnalyzer.setApiKey(apiKey);
                this.chatManager.initialize(apiKey);
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
            this.updateProcessingStatus('Analizando gastos con Google Gemini...');
            const analysis = await this.aiAnalyzer.analyzeExpenses(cleanedText);

            if (!analysis.success) {
                throw new Error(analysis.error || 'Error en el análisis de IA');
            }

            // Paso 4: Mostrar resultados
            console.log(`💾 Guardando ${analysis.expenses.length} gastos para mostrar en la interfaz`);
            this.currentExtractedExpenses = analysis.expenses;
            
            this.renderExtractedExpenses(analysis);
            // Mostrar información detallada del procesamiento
            const exchangeRate = this.aiAnalyzer.getCurrentExchangeRate();
            this.showNotification(
                `✅ ${analysis.expenses.length} gastos reales extraídos (TC: $${exchangeRate})`,
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
        console.log(`🎨 Mostrando ${this.currentExtractedExpenses.length} gastos en la interfaz`);
        
        const container = this.elements.extractedExpenses;
        const expensesList = this.elements.expensesList;
        
        if (!container || !expensesList) {
            console.error('❌ Container o expensesList no encontrados');
            return;
        }

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
        const expensesHTML = this.currentExtractedExpenses.map((expense, index) => {
            return `
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
            </div>`;
        }).join('');

        // Insertar en el DOM
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
            this.refreshTransactions();

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
            console.log(`📊 ${selectedCount} de ${this.currentExtractedExpenses.length} gastos seleccionados`);
            button.disabled = selectedCount === 0;
            button.innerHTML = `<i class="fas fa-plus-circle"></i> Agregar Seleccionados (${selectedCount})`;
        } else {
            console.error('❌ Botón addSelectedExpenses no encontrado');
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
     * Obtiene la API Key de Google AI Studio del localStorage
     * @returns API Key o cadena vacía
     */
    private getGoogleAPIKey(): string {
        return localStorage.getItem('google_ai_key') || '';
    }

    /**
     * Guarda la API Key de Google AI Studio en localStorage
     * @param apiKey - API Key a guardar
     */
    private saveGoogleAPIKey(apiKey: string): void {
        localStorage.setItem('google_ai_key', apiKey);
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
            this.updateMonthDisplay(currentMonth);
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

    /**
     * Configura la navegación móvil con menú hamburguesa
     */
    private setupMobileNavigation(): void {
        const navToggle = document.getElementById('navToggle');
        const navMenu = document.getElementById('navMenu');

        if (navToggle && navMenu) {
            navToggle.addEventListener('click', () => {
                navToggle.classList.toggle('active');
                navMenu.classList.toggle('active');
            });

            // Cerrar menú al hacer clic en un enlace
            const navLinks = navMenu.querySelectorAll('a');
            navLinks.forEach(link => {
                link.addEventListener('click', () => {
                    navToggle.classList.remove('active');
                    navMenu.classList.remove('active');
                });
            });

            // Cerrar menú al hacer clic fuera
            document.addEventListener('click', (e) => {
                if (!navToggle.contains(e.target as Node) && !navMenu.contains(e.target as Node)) {
                    navToggle.classList.remove('active');
                    navMenu.classList.remove('active');
                }
            });
        }

        // Optimizaciones para móviles
        this.setupMobileOptimizations();
    }

    /**
     * Configura optimizaciones específicas para dispositivos móviles
     */
    private setupMobileOptimizations(): void {
        // Detectar si es un dispositivo móvil
        const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
        
        if (isMobile) {
            // Prevenir zoom en inputs en iOS
            const inputs = document.querySelectorAll('input[type="text"], input[type="number"], input[type="email"], textarea');
            inputs.forEach(input => {
                input.addEventListener('focus', () => {
                    // Scroll suave al input cuando se enfoca
                    setTimeout(() => {
                        input.scrollIntoView({
                            behavior: 'smooth',
                            block: 'center'
                        });
                    }, 300);
                });
            });

            // Mejorar experiencia de scroll en iOS
            const scrollableElements = document.querySelectorAll('.transactions-container, .chat-messages, .categories-grid');
            scrollableElements.forEach(element => {
                element.setAttribute('style', '-webkit-overflow-scrolling: touch;');
            });

            // Ajustar viewport cuando aparece el teclado virtual
            let initialViewport = window.visualViewport?.height || window.innerHeight;
            window.visualViewport?.addEventListener('resize', () => {
                const currentHeight = window.visualViewport?.height || window.innerHeight;
                if (currentHeight < initialViewport * 0.8) {
                    // Teclado virtual está abierto
                    document.body.style.height = `${currentHeight}px`;
                } else {
                    // Teclado virtual está cerrado
                    document.body.style.height = '100vh';
                }
            });
        }
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


