'use client';

import { useState, useEffect } from 'react';
import { formatCurrency, formatDate, apiFetch } from '@/lib/utils';
import FinancialCard from '@/components/FinancialCard';
import PeriodSelector from '@/components/PeriodSelector';
import ExpenseChart from '@/components/ExpenseChart';
import ChartViewSelector from '@/components/ChartViewSelector';
import TransactionForm from '@/components/TransactionForm';
import TransactionList from '@/components/TransactionList';
import CategoryManager from '@/components/CategoryManager';
import GoalManager from '@/components/GoalManager';
import ReportsView from '@/components/ReportsView';
import PDFAnalyzer from '@/components/PDFAnalyzer';
import CurrencyTransfer from '@/components/CurrencyTransfer';
import { Transaction, TransactionFormData } from '@/types';

interface DashboardStats {
  totalIncome: number;
  totalIncomeUSD: number;
  totalExpenses: number;
  totalExpensesUSD: number;
  totalBalance: number;
  totalBalanceUSD: number;
  transactionCount: number;
}

interface ChartDataItem {
  category: string;
  amount: number;
  color: string;
}

interface TransferFormProps {
  transferType: 'UYU_TO_USD' | 'USD_TO_UYU';
  exchangeRate: number;
  onComplete: () => void;
  onCancel: () => void;
}

interface CategoryDetailsModalProps {
  category: string;
  transactions: Transaction[];
  onClose: () => void;
}

function TransferForm({ transferType, exchangeRate, onComplete, onCancel }: TransferFormProps) {
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  const convertedAmount = amount ? parseFloat(amount) * (transferType === 'UYU_TO_USD' ? 1/exchangeRate : exchangeRate) : 0;

  const handleTransfer = async () => {
    if (!amount || convertedAmount === 0) {
      alert('Por favor ingresa un monto válido');
      return;
    }

    setIsProcessing(true);

    try {
      const transferDescription = description.trim() ||
        `Conversión ${transferType === 'UYU_TO_USD' ? 'UYU → USD' : 'USD → UYU'} (${formatCurrency(parseFloat(amount), transferType === 'UYU_TO_USD' ? 'UYU' : 'USD')} → ${formatCurrency(convertedAmount, transferType === 'UYU_TO_USD' ? 'USD' : 'UYU')})`;

      // Crear transacción de gasto (moneda original)
      const expenseTransaction = {
        type: 'expense' as const,
        description: transferDescription,
        amount: parseFloat(amount),
        category: 'Transferencias',
        currency: transferType === 'UYU_TO_USD' ? 'UYU' : 'USD',
        date: new Date().toISOString().split('T')[0],
        source: 'currency-transfer'
      };

      // Crear transacción de ingreso (moneda convertida)
      const incomeTransaction = {
        type: 'income' as const,
        description: transferDescription,
        amount: convertedAmount,
        category: 'Transferencias',
        currency: transferType === 'UYU_TO_USD' ? 'USD' : 'UYU',
        date: new Date().toISOString().split('T')[0],
        source: 'currency-transfer'
      };

      // Agregar ambas transacciones
      await apiFetch('/api/public/transactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(expenseTransaction),
      });

      await apiFetch('/api/public/transactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(incomeTransaction),
      });

      alert(`✅ Transferencia realizada exitosamente!\n\n${transferDescription}`);
      onComplete();
    } catch (error) {
      console.error('Error en transferencia:', error);
      alert('Error al realizar la transferencia. Intenta nuevamente.');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Monto a convertir ({transferType === 'UYU_TO_USD' ? 'UYU' : 'USD'})
        </label>
        <input
          type="number"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          placeholder="Ingresa el monto..."
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-purple-500 focus:border-transparent"
          min="0"
          step="0.01"
        />
      </div>

      {amount && (
        <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-sm text-purple-700">Monto convertido:</span>
              <div className="text-lg font-bold text-purple-900">
                {formatCurrency(convertedAmount, transferType === 'UYU_TO_USD' ? 'USD' : 'UYU')}
              </div>
            </div>
            <div className="text-sm text-purple-600">
              Tasa: {exchangeRate.toFixed(2)} UYU/USD
            </div>
          </div>
        </div>
      )}

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Descripción (opcional)
        </label>
        <input
          type="text"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Ej: Compra de dólares..."
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-purple-500 focus:border-transparent"
        />
      </div>

      <div className="flex space-x-3 pt-4">
        <button
          onClick={onCancel}
          className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors"
          disabled={isProcessing}
        >
          Cancelar
        </button>
        <button
          onClick={handleTransfer}
          disabled={!amount || convertedAmount === 0 || isProcessing}
          className={`flex-1 px-4 py-2 rounded-md font-medium transition-colors ${
            amount && convertedAmount > 0 && !isProcessing
              ? 'bg-purple-600 text-white hover:bg-purple-700'
              : 'bg-gray-300 text-gray-500 cursor-not-allowed'
          }`}
        >
          {isProcessing ? (
            <div className="flex items-center justify-center space-x-2">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
              <span>Procesando...</span>
            </div>
          ) : (
            <div className="flex items-center justify-center space-x-2">
              <i className="fas fa-exchange-alt"></i>
              <span>Transferir</span>
            </div>
          )}
        </button>
      </div>
    </div>
  );
}

function CategoryDetailsModal({ category, transactions, onClose }: CategoryDetailsModalProps) {
  const [sortBy, setSortBy] = useState<'date' | 'amount'>('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  // Filtrar transacciones por categoría y tipo gasto
  const categoryTransactions = transactions.filter(
    t => t.category === category && t.type === 'expense'
  );

  // Ordenar transacciones
  const sortedTransactions = [...categoryTransactions].sort((a, b) => {
    let comparison = 0;
    if (sortBy === 'date') {
      comparison = new Date(a.date).getTime() - new Date(b.date).getTime();
    } else if (sortBy === 'amount') {
      comparison = a.amount - b.amount;
    }
    return sortOrder === 'asc' ? comparison : -comparison;
  });

  // Calcular estadísticas
  const totalAmount = categoryTransactions.reduce((sum, t) => sum + t.amount, 0);
  const averageAmount = categoryTransactions.length > 0 ? totalAmount / categoryTransactions.length : 0;
  const maxAmount = Math.max(...categoryTransactions.map(t => t.amount), 0);
  const minAmount = Math.min(...categoryTransactions.map(t => t.amount), 0);

  const handleSort = (field: 'date' | 'amount') => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('desc');
    }
  };

  const getSortIcon = (field: 'date' | 'amount') => {
    if (sortBy !== field) return 'fas fa-sort';
    return sortOrder === 'asc' ? 'fas fa-sort-up' : 'fas fa-sort-down';
  };

  return (
    <div className="space-y-6">
      {/* Estadísticas de la categoría */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-center">
          <div className="text-2xl font-bold text-blue-600">{categoryTransactions.length}</div>
          <div className="text-sm text-blue-700">Total Gastos</div>
        </div>
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-center">
          <div className="text-2xl font-bold text-green-600">{formatCurrency(totalAmount)}</div>
          <div className="text-sm text-green-700">Monto Total</div>
        </div>
        <div className="bg-purple-50 border border-purple-200 rounded-lg p-4 text-center">
          <div className="text-2xl font-bold text-purple-600">{formatCurrency(averageAmount)}</div>
          <div className="text-sm text-purple-700">Promedio</div>
        </div>
        <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 text-center">
          <div className="text-2xl font-bold text-orange-600">{formatCurrency(maxAmount)}</div>
          <div className="text-sm text-orange-700">Mayor Gasto</div>
        </div>
      </div>

      {/* Tabla de transacciones */}
      <div className="border border-gray-200 rounded-lg overflow-hidden">
        {sortedTransactions.length === 0 ? (
          <div className="text-center py-8">
            <i className="fas fa-inbox text-4xl text-gray-300"></i>
            <p className="mt-2 text-gray-500">No hay gastos en esta categoría</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Descripción
                  </th>
                  <th
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                    onClick={() => handleSort('amount')}
                  >
                    Monto
                    <i className={`${getSortIcon('amount')} ml-1`}></i>
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Moneda
                  </th>
                  <th
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                    onClick={() => handleSort('date')}
                  >
                    Fecha
                    <i className={`${getSortIcon('date')} ml-1`}></i>
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {sortedTransactions.map((transaction) => (
                  <tr key={transaction._id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {transaction.description}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-red-600">
                      -{formatCurrency(transaction.amount, transaction.currency)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        transaction.currency === 'UYU'
                          ? 'bg-blue-100 text-blue-800'
                          : 'bg-green-100 text-green-800'
                      }`}>
                        {transaction.currency}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatDate(transaction.date)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Botón de cerrar */}
      <div className="flex justify-end pt-4">
        <button
          onClick={onClose}
          className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-colors"
        >
          <i className="fas fa-times mr-2"></i>
          Cerrar
        </button>
      </div>
    </div>
  );
}

export default function FinanzasPage() {
  const [transactions, setTransactions] = useState<import('@/types').Transaction[]>([]);
  const [stats, setStats] = useState<DashboardStats>({
    totalIncome: 0,
    totalIncomeUSD: 0,
    totalExpenses: 0,
    totalExpensesUSD: 0,
    totalBalance: 0,
    totalBalanceUSD: 0,
    transactionCount: 0
  });
  const [exchangeRate, setExchangeRate] = useState<number>(40); // Tasa UYU -> USD por defecto
  const [loading, setLoading] = useState(true);
  // Removed activeTab state since we're showing all content without tabs
  const [currentPeriod, setCurrentPeriod] = useState({
    month: new Date().getMonth() + 1,
    year: new Date().getFullYear(),
    type: 'monthly' as 'monthly' | 'yearly'
  });
  const [chartView, setChartView] = useState<'expenses' | 'income' | 'comparative'>('expenses');
  const [chartData, setChartData] = useState<ChartDataItem[]>([]);
  const [chartDataUSD, setChartDataUSD] = useState<ChartDataItem[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [goals, setGoals] = useState<any[]>([]);
  const [allTransactions, setAllTransactions] = useState<import('@/types').Transaction[]>([]);
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [transferModalType, setTransferModalType] = useState<'UYU_TO_USD' | 'USD_TO_UYU'>('UYU_TO_USD');

  // Estado para paginación
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [totalTransactions, setTotalTransactions] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  // Estado para secciones colapsables
  const [expandedSections, setExpandedSections] = useState({
    resumen: true, // Solo el resumen financiero está expandido por defecto
    graficos: true, // Análisis gráfico expandido por defecto
    transacciones: false,
    metas: false,
    categorias: false,
    reportes: false
  });

  // Estado para modal de detalles de categoría
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [categoryDetailsModal, setCategoryDetailsModal] = useState(false);

  // Función para expandir una sección desde navegación externa
  const expandSection = (section: keyof typeof expandedSections) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: true
    }));
  };

  useEffect(() => {
    checkAuthStatus();
    loadData();
    loadCategories();
    loadExchangeRate();
  }, []);


  const checkAuthStatus = async () => {
    try {
      const response = await apiFetch('/api/auth/status');
      const data = await response.json();

      if (!data.authenticated) {
        console.warn('Usuario no autenticado, redirigiendo al login...');
        window.location.href = '/login.html';
        return false;
      }

      console.log('✅ Usuario autenticado:', data.user.username);
      return true;
    } catch (error) {
      console.error('Error verificando autenticación:', error);
      window.location.href = '/login.html';
      return false;
    }
  };

  const loadExchangeRate = async () => {
    try {
      const response = await apiFetch('/api/exchange-rates?from=UYU&to=USD');
      const data = await response.json();
      if (data.success) {
        setExchangeRate(data.data.rate);
      }
    } catch (error) {
      console.error('Error cargando tasa de cambio:', error);
      // Mantener tasa por defecto
    }
  };

  const loadData = async () => {
    try {
      setLoading(true);

      // Cargar todas las transacciones para estadísticas y gráficos
      const allTransactionsResponse = await apiFetch('/api/public/transactions?limit=1000');
      const allTransactionsData = await allTransactionsResponse.json();

      if (allTransactionsData.success) {
        // Ensure dates are strings for compatibility with the component
        const allTxns = allTransactionsData.data.transactions.map((t: Transaction) => ({
          ...t,
          date: typeof t.date === 'string' ? t.date : t.date.toISOString().split('T')[0]
        }));
        setAllTransactions(allTxns);

        // Calcular estadísticas separadas por moneda (cuentas independientes)
        const transactionsUYU = allTxns.filter((t: Transaction) => t.currency === 'UYU');
        const transactionsUSD = allTxns.filter((t: Transaction) => t.currency === 'USD');

        // Estadísticas para cuenta UYU
        const incomeUYU = transactionsUYU
          .filter((t: Transaction) => t.type === 'income')
          .reduce((sum: number, t: Transaction) => sum + t.amount, 0);

        const expensesUYU = transactionsUYU
          .filter((t: Transaction) => t.type === 'expense')
          .reduce((sum: number, t: Transaction) => sum + t.amount, 0);

        const balanceUYU = incomeUYU - expensesUYU;

        // Estadísticas para cuenta USD
        const incomeUSD = transactionsUSD
          .filter((t: Transaction) => t.type === 'income')
          .reduce((sum: number, t: Transaction) => sum + t.amount, 0);

        const expensesUSD = transactionsUSD
          .filter((t: Transaction) => t.type === 'expense')
          .reduce((sum: number, t: Transaction) => sum + t.amount, 0);

        const balanceUSD = incomeUSD - expensesUSD;

        setStats({
          totalIncome: incomeUYU,           // Ingresos cuenta UYU
          totalIncomeUSD: incomeUSD,        // Ingresos cuenta USD
          totalExpenses: expensesUYU,       // Gastos cuenta UYU
          totalExpensesUSD: expensesUSD,    // Gastos cuenta USD
          totalBalance: balanceUYU,         // Balance cuenta UYU
          totalBalanceUSD: balanceUSD,      // Balance cuenta USD
          transactionCount: allTxns.length
        });

        setTotalTransactions(allTxns.length);
        setTotalPages(Math.ceil(allTxns.length / itemsPerPage));

        // Preparar datos para el gráfico
        updateChartData(allTxns);
      }

      // Cargar transacciones paginadas para mostrar
      await loadTransactionsPage(currentPage, itemsPerPage);

    } catch (error) {
      console.error('Error cargando datos:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadTransactionsPage = async (page: number, limit: number) => {
    try {
      const transactionsResponse = await apiFetch(`/api/public/transactions?page=${page}&limit=${limit}`);
      const transactionsData = await transactionsResponse.json();

      if (transactionsData.success) {
        const transactions = transactionsData.data.transactions.map((t: Transaction) => ({
          ...t,
          date: typeof t.date === 'string' ? t.date : t.date.toISOString().split('T')[0]
        }));
        setTransactions(transactions);
        setCurrentPage(page);
        setItemsPerPage(limit);
        setTotalPages(transactionsData.data.pagination.pages);
        setTotalTransactions(transactionsData.data.pagination.total);
      }
    } catch (error) {
      console.error('Error cargando página de transacciones:', error);
    }
  };

  const updateChartData = (transactions: import('@/types').Transaction[]) => {
    // Separar transacciones por moneda
    const transactionsUYU = transactions.filter(t => t.currency === 'UYU');
    const transactionsUSD = transactions.filter(t => t.currency === 'USD');

    // Función helper para calcular totales por categoría
    const calculateCategoryTotals = (txns: import('@/types').Transaction[]) => {
      return txns.reduce((acc, transaction) => {
        if (transaction.type === 'expense') {
          acc[transaction.category] = (acc[transaction.category] || 0) + transaction.amount;
        }
        return acc;
      }, {} as Record<string, number>);
    };

    // Calcular totales por categoría para cada moneda
    const categoryTotalsUYU = calculateCategoryTotals(transactionsUYU);
    const categoryTotalsUSD = calculateCategoryTotals(transactionsUSD);

    // Colores predefinidos para categorías
    const categoryColors: Record<string, string> = {
      'Alimentación': '#e74c3c',
      'Transporte': '#f39c12',
      'Servicios': '#e67e22',
      'Entretenimiento': '#8e44ad',
      'Salud': '#27ae60',
      'Educación': '#3498db',
      'Ropa': '#e91e63',
      'Otros Gastos': '#95a5a6',
    };

    // Preparar datos para gráficos separados por moneda
    const chartDataUYU = Object.entries(categoryTotalsUYU).map(([category, amount]) => ({
      category,
      amount,
      color: categoryColors[category] || '#' + Math.floor(Math.random()*16777215).toString(16)
    }));

    const chartDataUSD = Object.entries(categoryTotalsUSD).map(([category, amount]) => ({
      category,
      amount,
      color: categoryColors[category] || '#' + Math.floor(Math.random()*16777215).toString(16)
    }));

    setChartData(chartDataUYU);
    setChartDataUSD(chartDataUSD);
  };

  const handleCreateTransaction = async (data: TransactionFormData) => {
    try {
      const response = await apiFetch('/api/public/transactions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        throw new Error('Error al crear la transacción');
      }

      // Recargar datos completos para mantener consistencia
      await loadData();

      alert('Transacción creada exitosamente');
    } catch (error) {
      console.error('Error creando transacción:', error);
      throw error;
    }
  };

  const handleDeleteTransaction = async (id: string) => {
    if (!confirm('¿Estás seguro de que quieres eliminar esta transacción?')) {
      return;
    }

    try {
      const response = await apiFetch(`/api/public/transactions/${id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Error al eliminar la transacción');
      }

      // Recargar datos completos para mantener consistencia
      await loadData();

      alert('Transacción eliminada exitosamente');
    } catch (error) {
      console.error('Error eliminando transacción:', error);
      alert('Error al eliminar la transacción');
    }
  };

  const handleDeleteMultipleTransactions = async (ids: string[]) => {
    try {
      // Eliminar transacciones en paralelo
      const deletePromises = ids.map(id =>
        apiFetch(`/api/public/transactions/${id}`, {
          method: 'DELETE',
        })
      );

      const results = await Promise.allSettled(deletePromises);

      // Contar éxitos y errores
      const successful = results.filter(result => result.status === 'fulfilled').length;
      const failed = results.filter(result => result.status === 'rejected').length;

      // Recargar datos completos para mantener consistencia
      await loadData();

      if (failed === 0) {
        alert(`${successful} transacción${successful > 1 ? 'es' : ''} eliminada${successful > 1 ? 's' : ''} exitosamente`);
      } else {
        alert(`${successful} transacción${successful > 1 ? 'es' : ''} eliminada${successful > 1 ? 's' : ''} exitosamente. ${failed} transacción${failed > 1 ? 'es' : ''} no se pudo${failed > 1 ? 'ron' : ''} eliminar.`);
      }
    } catch (error) {
      console.error('Error eliminando transacciones múltiples:', error);
      alert('Error al eliminar las transacciones');
    }
  };

  const loadCategories = async () => {
    try {
      const response = await apiFetch('/api/categories');
      const data = await response.json();

      if (response.ok && data.success) {
        setCategories(data.data.categories);
      } else if (response.status === 401) {
        console.warn('No autorizado para cargar categorías, redirigiendo al login...');
        window.location.href = '/login.html';
      } else {
        console.error('Error cargando categorías:', data.message || 'Error desconocido');
      }
    } catch (error) {
      console.error('Error de red cargando categorías:', error);
    }
  };

  const handleCreateCategory = async (data: any) => {
    try {
      const response = await apiFetch('/api/categories', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      if (response.status === 401) {
        console.warn('Sesión expirada, redirigiendo al login...');
        window.location.href = '/login.html';
        return;
      }

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Error al crear la categoría');
      }

      await loadCategories();
      alert('Categoría creada exitosamente');
    } catch (error) {
      console.error('Error creando categoría:', error);
      throw error;
    }
  };

  const handleUpdateCategory = async (id: string, data: any) => {
    try {
      const response = await apiFetch(`/api/categories/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      if (response.status === 401) {
        console.warn('Sesión expirada, redirigiendo al login...');
        window.location.href = '/login.html';
        return;
      }

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Error al actualizar la categoría');
      }

      await loadCategories();
      alert('Categoría actualizada exitosamente');
    } catch (error) {
      console.error('Error actualizando categoría:', error);
      throw error;
    }
  };

  const handleDeleteCategory = async (id: string) => {
    try {
      const response = await apiFetch(`/api/categories/${id}`, {
        method: 'DELETE',
      });

      if (response.status === 401) {
        console.warn('Sesión expirada, redirigiendo al login...');
        window.location.href = '/login.html';
        return;
      }

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Error al eliminar la categoría');
      }

      await loadCategories();
      alert('Categoría eliminada exitosamente');
    } catch (error) {
      console.error('Error eliminando categoría:', error);
      throw error;
    }
  };

  const loadGoals = async () => {
    try {
      const response = await apiFetch('/api/public/goals');
      const data = await response.json();

      if (data.success) {
        setGoals(data.data.goals);
      }
    } catch (error) {
      console.error('Error cargando metas:', error);
    }
  };

  const handleCreateGoal = async (data: any) => {
    try {
      const response = await apiFetch('/api/public/goals', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        throw new Error('Error al crear la meta');
      }

      await loadGoals();
      alert('Meta creada exitosamente');
    } catch (error) {
      console.error('Error creando meta:', error);
      throw error;
    }
  };

  const handleUpdateGoal = async (id: string, data: any) => {
    try {
      const response = await apiFetch(`/api/public/goals/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        throw new Error('Error al actualizar la meta');
      }

      await loadGoals();
      alert('Meta actualizada exitosamente');
    } catch (error) {
      console.error('Error actualizando meta:', error);
      throw error;
    }
  };

  const handleDeleteGoal = async (id: string) => {
    try {
      const response = await apiFetch(`/api/public/goals/${id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Error al eliminar la meta');
      }

      await loadGoals();
      alert('Meta eliminada exitosamente');
    } catch (error) {
      console.error('Error eliminando meta:', error);
      throw error;
    }
  };

  useEffect(() => {
    loadGoals();
  }, []);


  // Función para cambiar de página
  const handlePageChange = async (page: number) => {
    setCurrentPage(page);
    await loadTransactionsPage(page, itemsPerPage);
  };

  // Función para cambiar elementos por página
  const handleItemsPerPageChange = async (newItemsPerPage: number) => {
    setItemsPerPage(newItemsPerPage);
    setCurrentPage(1);
    await loadTransactionsPage(1, newItemsPerPage);
    setTotalPages(Math.ceil(totalTransactions / newItemsPerPage));
  };

  // Función para alternar secciones colapsables
  const toggleSection = (section: keyof typeof expandedSections) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  // Función para manejar click en categorías del gráfico
  const handleCategoryClick = (category: string) => {
    setSelectedCategory(category);
    setCategoryDetailsModal(true);
  };

  // Componente helper para secciones colapsables
  const CollapsibleSection = ({
    id,
    title,
    icon,
    isExpanded,
    onToggle,
    children
  }: {
    id: keyof typeof expandedSections;
    title: string;
    icon: string;
    isExpanded: boolean;
    onToggle: () => void;
    children: React.ReactNode;
  }) => (
    <div id={id} className="bg-white rounded-lg shadow-md border border-gray-200">
      <button
        onClick={onToggle}
        className="w-full px-6 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
      >
        <div className="flex items-center">
          <i className={`${icon} mr-3 text-primary`}></i>
          <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
        </div>
        <div className="flex items-center">
          <span className="text-sm text-gray-500 mr-3">
            {isExpanded ? 'Ocultar' : 'Mostrar'}
          </span>
          <i className={`fas fa-chevron-${isExpanded ? 'up' : 'down'} text-gray-400 transition-transform`}></i>
        </div>
      </button>

      {isExpanded && (
        <div className="px-6 pb-6">
          {children}
        </div>
      )}
    </div>
  );

  // Función para filtrar datos por periodo
  const filterDataByPeriod = () => {
    if (allTransactions.length === 0) return;

    let filteredTransactions = allTransactions;

    if (currentPeriod.type === 'monthly') {
      // Filtrar por mes y año específicos
      filteredTransactions = allTransactions.filter(transaction => {
        const transactionDate = new Date(transaction.date);
        const transactionMonth = transactionDate.getMonth() + 1; // getMonth() returns 0-11
        const transactionYear = transactionDate.getFullYear();

        return transactionMonth === currentPeriod.month && transactionYear === currentPeriod.year;
      });
    } else {
      // Filtrar por año específico
      filteredTransactions = allTransactions.filter(transaction => {
        const transactionDate = new Date(transaction.date);
        const transactionYear = transactionDate.getFullYear();

        return transactionYear === currentPeriod.year;
      });
    }

    // Calcular estadísticas con las transacciones filtradas
    const transactionsUYU = filteredTransactions.filter((t: Transaction) => t.currency === 'UYU');
    const transactionsUSD = filteredTransactions.filter((t: Transaction) => t.currency === 'USD');

    // Estadísticas para cuenta UYU
    const incomeUYU = transactionsUYU
      .filter((t: Transaction) => t.type === 'income')
      .reduce((sum: number, t: Transaction) => sum + t.amount, 0);

    const expensesUYU = transactionsUYU
      .filter((t: Transaction) => t.type === 'expense')
      .reduce((sum: number, t: Transaction) => sum + t.amount, 0);

    const balanceUYU = incomeUYU - expensesUYU;

    // Estadísticas para cuenta USD
    const incomeUSD = transactionsUSD
      .filter((t: Transaction) => t.type === 'income')
      .reduce((sum: number, t: Transaction) => sum + t.amount, 0);

    const expensesUSD = transactionsUSD
      .filter((t: Transaction) => t.type === 'expense')
      .reduce((sum: number, t: Transaction) => sum + t.amount, 0);

    const balanceUSD = incomeUSD - expensesUSD;

    setStats({
      totalIncome: incomeUYU,
      totalIncomeUSD: incomeUSD,
      totalExpenses: expensesUYU,
      totalExpensesUSD: expensesUSD,
      totalBalance: balanceUYU,
      totalBalanceUSD: balanceUSD,
      transactionCount: filteredTransactions.length
    });

    // Preparar datos para el gráfico con las transacciones filtradas
    updateChartData(filteredTransactions);

    // Reset pagination when filtering
    setCurrentPage(1);
    setTotalTransactions(filteredTransactions.length);
    setTotalPages(Math.ceil(filteredTransactions.length / itemsPerPage));

    // Load first page of filtered transactions
    const paginatedFiltered = filteredTransactions.slice(0, itemsPerPage);
    setTransactions(paginatedFiltered);
  };

  // Efecto para filtrar datos cuando cambia el periodo
  useEffect(() => {
    filterDataByPeriod();
  }, [currentPeriod, allTransactions, exchangeRate]);

  // Escuchar eventos de navegación para expandir secciones
  useEffect(() => {
    const handleExpandSection = (event: CustomEvent) => {
      const section = event.detail.section as keyof typeof expandedSections;
      if (section && expandedSections.hasOwnProperty(section)) {
        expandSection(section);

        // Delay para que la sección se expanda completamente
        setTimeout(() => {
          const element = document.getElementById(section);
          if (element) {
            // Usar scrollIntoView con block: 'start' y offset para el header
            element.scrollIntoView({
              behavior: 'smooth',
              block: 'start',
              inline: 'nearest'
            });

            // Ajuste adicional después del scroll automático
            setTimeout(() => {
              const rect = element.getBoundingClientRect();
              const headerHeight = 100; // Altura aproximada del header

              if (rect.top < headerHeight) {
                // El elemento está oculto detrás del header, ajustar
                const scrollTop = window.pageYOffset + rect.top - headerHeight - 20;
                window.scrollTo({
                  top: Math.max(0, scrollTop),
                  behavior: 'smooth'
                });
              }
            }, 300);
          }
        }, 400); // Dar tiempo suficiente para que la sección se expanda
      }
    };

    window.addEventListener('expandSection', handleExpandSection as EventListener);

    return () => {
      window.removeEventListener('expandSection', handleExpandSection as EventListener);
    };
  }, [expandSection]);


  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-primary text-white py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl md:text-4xl font-bold flex items-center">
                <i className="fas fa-chart-line mr-3"></i>
                Finanzas Personales
              </h1>
              <p className="text-xl mt-2">Controla y optimiza tu economía personal</p>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        {/* Selector de Períodos */}
        <PeriodSelector
          currentPeriod={currentPeriod}
          onPeriodChange={setCurrentPeriod}
        />

        {/* Dashboard de Resumen - Siempre visible */}
        <CollapsibleSection
          id="resumen"
          title="Resumen Financiero"
          icon="fas fa-chart-line"
          isExpanded={expandedSections.resumen}
          onToggle={() => toggleSection('resumen')}
        >
          {/* Resumen en Pesos Uruguayos */}
          <div className="mb-6">
            <h3 className="text-lg font-semibold text-gray-700 mb-4">En Pesos Uruguayos (UYU)</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              <FinancialCard
                title="Ingresos UYU"
                amount={stats.totalIncome}
                subtitle="Cuenta Pesos"
                icon={<svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                </svg>}
                color="income"
              />

              <FinancialCard
                title="Gastos UYU"
                amount={stats.totalExpenses}
                subtitle="Cuenta Pesos"
                icon={<svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 17h8m0 0V9m0 8l-8-8-4 4-6-6" />
                </svg>}
                color="expense"
              />

              <FinancialCard
                title="Balance UYU"
                amount={stats.totalBalance}
                subtitle="Cuenta Pesos"
                icon={<svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                </svg>}
                color="balance"
              />

              <FinancialCard
                title="Transferir UYU → USD"
                amount={0}
                subtitle="Convertir monedas"
                icon={<svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
                </svg>}
                color="transfer"
                onClick={() => {
                  setTransferModalType('UYU_TO_USD');
                  setShowTransferModal(true);
                }}
              />
            </div>
          </div>

          {/* Resumen en Dólares */}
          <div className="mb-6">
            <h3 className="text-lg font-semibold text-gray-700 mb-4">En Dólares Americanos (USD)</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              <FinancialCard
                title="Ingresos USD"
                amount={stats.totalIncomeUSD}
                subtitle="Cuenta Dólares"
                icon={<svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                </svg>}
                color="income"
              />

              <FinancialCard
                title="Gastos USD"
                amount={stats.totalExpensesUSD}
                subtitle="Cuenta Dólares"
                icon={<svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 17h8m0 0V9m0 8l-8-8-4 4-6-6" />
                </svg>}
                color="expense"
              />

              <FinancialCard
                title="Balance USD"
                amount={stats.totalBalanceUSD}
                subtitle="Cuenta Dólares"
                icon={<svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                </svg>}
                color="balance"
              />

              <FinancialCard
                title="Transferir USD → UYU"
                amount={0}
                subtitle="Convertir monedas"
                icon={<svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
                </svg>}
                color="transfer"
                onClick={() => {
                  setTransferModalType('USD_TO_UYU');
                  setShowTransferModal(true);
                }}
              />
            </div>
          </div>
        </CollapsibleSection>

        {/* Gráficos */}
        <CollapsibleSection
          id="graficos"
          title="Análisis Visual"
          icon="fas fa-chart-bar"
          isExpanded={expandedSections.graficos || false}
          onToggle={() => toggleSection('graficos')}
        >
          <ChartViewSelector
            currentView={chartView}
            onViewChange={setChartView}
          />

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <ExpenseChart
              data={chartData}
              title="Gastos por Categoría (UYU)"
              onCategoryClick={handleCategoryClick}
            />

            <ExpenseChart
              data={chartDataUSD}
              title="Gastos por Categoría (USD)"
              onCategoryClick={handleCategoryClick}
            />
          </div>
        </CollapsibleSection>

        {/* Contenido completo sin pestañas */}
        <div className="space-y-8">
          {/* Transacciones */}
          <CollapsibleSection
            id="transacciones"
            title="Transacciones"
            icon="fas fa-exchange-alt"
            isExpanded={expandedSections.transacciones}
            onToggle={() => toggleSection('transacciones')}
          >
            <div className="space-y-6">
              <TransactionForm
                onSubmit={handleCreateTransaction}
                loading={loading}
              />
              <TransactionList
                transactions={transactions}
                onDelete={handleDeleteTransaction}
                onDeleteMultiple={handleDeleteMultipleTransactions}
                loading={loading}
                totalCount={totalTransactions}
                currentPage={currentPage}
                totalPages={totalPages}
                onPageChange={handlePageChange}
                onItemsPerPageChange={handleItemsPerPageChange}
                itemsPerPage={itemsPerPage}
              />

              {/* Analizador PDF dentro de la sección de transacciones */}
              <div className="border-t border-gray-200 pt-6">
                <PDFAnalyzer />
              </div>
            </div>
          </CollapsibleSection>

          {/* Metas */}
          <CollapsibleSection
            id="metas"
            title="Metas"
            icon="fas fa-target"
            isExpanded={expandedSections.metas}
            onToggle={() => toggleSection('metas')}
          >
            <GoalManager
              goals={goals}
              onCreate={handleCreateGoal}
              onUpdate={handleUpdateGoal}
              onDelete={handleDeleteGoal}
              loading={loading}
            />
          </CollapsibleSection>

          {/* Categorías */}
          <CollapsibleSection
            id="categorias"
            title="Categorías"
            icon="fas fa-tags"
            isExpanded={expandedSections.categorias}
            onToggle={() => toggleSection('categorias')}
          >
            <CategoryManager
              categories={categories}
              onCreate={handleCreateCategory}
              onUpdate={handleUpdateCategory}
              onDelete={handleDeleteCategory}
              loading={loading}
            />
          </CollapsibleSection>

          {/* Reportes */}
          <CollapsibleSection
            id="reportes"
            title="Reportes"
            icon="fas fa-chart-bar"
            isExpanded={expandedSections.reportes}
            onToggle={() => toggleSection('reportes')}
          >
            <ReportsView
              transactions={transactions}
              loading={loading}
            />
          </CollapsibleSection>


        </div>

        {/* Modal de Transferencia */}
        {showTransferModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
              <div className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-bold text-gray-900">
                    Transferir {transferModalType === 'UYU_TO_USD' ? 'UYU → USD' : 'USD → UYU'}
                  </h3>
                  <button
                    onClick={() => setShowTransferModal(false)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <i className="fas fa-times text-xl"></i>
                  </button>
                </div>

                <TransferForm
                  transferType={transferModalType}
                  exchangeRate={exchangeRate}
                  onComplete={() => {
                    setShowTransferModal(false);
                    loadData();
                  }}
                  onCancel={() => setShowTransferModal(false)}
                />
              </div>
            </div>
          </div>
        )}

        {/* Modal de Detalles de Categoría */}
        {categoryDetailsModal && selectedCategory && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
              <div className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-xl font-bold text-gray-900">
                    <i className="fas fa-chart-pie mr-2 text-blue-600"></i>
                    Detalles de Gastos - {selectedCategory}
                  </h3>
                  <button
                    onClick={() => {
                      setCategoryDetailsModal(false);
                      setSelectedCategory(null);
                    }}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <i className="fas fa-times text-xl"></i>
                  </button>
                </div>

                <CategoryDetailsModal
                  category={selectedCategory}
                  transactions={allTransactions}
                  onClose={() => {
                    setCategoryDetailsModal(false);
                    setSelectedCategory(null);
                  }}
                />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
