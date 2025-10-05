// Tipos principales del sistema de finanzas

export interface User {
  _id: string;
  identifier: string;
  name?: string;
  email?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Transaction {
  _id: string;
  userId?: string | null; // null para transacciones demo, opcional para públicas
  type: 'income' | 'expense';
  amount: number;
  description: string;
  category: string;
  date: string | Date; // string para públicas, Date para completas
  currency: 'UYU' | 'USD';
  convertedAmount?: number;
  userBaseCurrency?: 'UYU' | 'USD';
  exchangeRate?: number;
  exchangeRateDate?: Date;
  tags?: string[];
  notes?: string;
  status?: 'pending' | 'completed' | 'cancelled'; // opcional para públicas
  attachments?: Attachment[];
  metadata?: TransactionMetadata;
  recategorization?: RecategorizationInfo;
  createdAt?: Date; // opcional para públicas
  updatedAt?: Date; // opcional para públicas

  // Virtuals
  month?: string;
  year?: number;
  dayOfWeek?: string;
  formattedAmount?: string;
  typeLabel?: string;
}

export interface Attachment {
  filename: string;
  originalName: string;
  mimeType: string;
  size: number;
  url: string;
  uploadedAt: Date;
}

export interface TransactionMetadata {
  importedFromPdf?: boolean;
  aiConfidence?: number;
  originalText?: string;
  location?: string;
  externalId?: string;
}

export interface RecategorizationInfo {
  suggestedCategory?: string;
  confidence?: number;
  lastUpdated?: Date;
}

export interface Category {
  _id: string;
  name: string;
  type: 'income' | 'expense';
  color: string;
  isDefault: boolean;
  userId?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Goal {
  _id: string;
  userId: string;
  name: string;
  description?: string;
  currency: 'UYU' | 'USD';
  currentAmount: number;
  targetAmount: number;
  expectedAmount?: number;
  category?: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  tags?: string[];
  notes?: string;
  currentDate?: Date;
  deadline?: Date;
  status: 'active' | 'completed' | 'cancelled';
  createdAt: Date;
  updatedAt: Date;
}

export interface Budget {
  _id: string;
  userId: string;
  category: string;
  amount: number;
  currency: 'UYU' | 'USD';
  period: 'monthly' | 'yearly';
  year: number;
  month?: number;
  spent: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface ExchangeRate {
  _id: string;
  from: string;
  to: string;
  rate: number;
  date: Date;
  source: string;
  createdAt: Date;
}

export interface DashboardStats {
  totalIncome: number;
  totalExpenses: number;
  totalBalance: number;
  transactionCount: number;
  categoriesCount: number;
  goalsCount: number;
  currencyStats: {
    UYU: {
      income: number;
      expenses: number;
      balance: number;
    };
    USD: {
      income: number;
      expenses: number;
      balance: number;
    };
  };
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
  timestamp?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

// Tipos para formularios
export interface TransactionFormData {
  type: 'income' | 'expense';
  amount: string;
  description: string;
  category: string;
  date: string;
  currency: 'UYU' | 'USD';
  tags?: string[];
  notes?: string;
}

export interface GoalFormData {
  name: string;
  description?: string;
  currency: 'UYU' | 'USD';
  currentAmount?: string;
  targetAmount: string;
  expectedAmount?: string;
  category?: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  tags?: string;
  notes?: string;
  currentDate?: string;
  deadline?: string;
}

export interface CategoryFormData {
  name: string;
  type: 'income' | 'expense';
  color: string;
  description?: string;
}

// Tipos para filtros y búsqueda
export interface TransactionFilters {
  type?: 'income' | 'expense';
  category?: string;
  currency?: 'UYU' | 'USD';
  dateFrom?: string;
  dateTo?: string;
  amountMin?: number;
  amountMax?: number;
  tags?: string[];
  status?: 'pending' | 'completed' | 'cancelled';
}

export interface ChartData {
  labels: string[];
  datasets: {
    label: string;
    data: number[];
    backgroundColor?: string | string[];
    borderColor?: string | string[];
    borderWidth?: number;
  }[];
}

// Tipos para el chat de IA
export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  suggestions?: string[];
}

export interface AIResponse {
  message: string;
  suggestions?: string[];
  actions?: AIAction[];
}

export interface AIAction {
  type: 'create_transaction' | 'update_goal' | 'generate_report';
  data: any;
  description: string;
}

// Context types
export interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (identifier: string, password: string) => Promise<boolean>;
  logout: () => void;
  checkAuth: () => Promise<void>;
}

export interface AppContextType {
  currentPeriod: {
    month: number;
    year: number;
    type: 'monthly' | 'yearly';
  };
  setCurrentPeriod: (period: { month: number; year: number; type: 'monthly' | 'yearly' }) => void;
  currency: 'UYU' | 'USD';
  setCurrency: (currency: 'UYU' | 'USD') => void;
}
