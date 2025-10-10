'use client';

import { useState, useRef, useEffect } from 'react';
import { apiFetch } from '@/lib/utils';

interface Expense {
  description: string;
  amount: number;
  currency: string;
  category: string;
  date: string;
  confidence?: number;
  notes?: string;
}

interface AnalysisResult {
  expenses: Expense[];
  summary: {
    totalExpenses: number;
    expenseCount: number;
    currency: string;
  };
  confidence?: number;
  aiModel?: string;
  analysisTimestamp?: string;
}

interface Category {
  _id: string;
  name: string;
  type: string;
  description?: string;
}

export default function PDFAnalyzer() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedExpenses, setSelectedExpenses] = useState<Set<number>>(new Set());
  const [availableCategories, setAvailableCategories] = useState<Category[]>([]);
  const [editingExpenses, setEditingExpenses] = useState<Expense[]>([]);
  const [exchangeRate, setExchangeRate] = useState<number>(40); // Tasa de cambio por defecto
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Cargar categorías disponibles y exchange rate al montar el componente
  useEffect(() => {
    const loadCategories = async () => {
      try {
        const response = await apiFetch('/api/categories');
        const data = await response.json();
        if (data.success) {
          // Filtrar solo categorías de gastos
          const expenseCategories = data.data.categories.filter((cat: Category) => cat.type === 'expense');
          setAvailableCategories(expenseCategories);
        }
      } catch (error) {
        console.error('Error cargando categorías:', error);
      }
    };

    const loadExchangeRate = async () => {
      try {
        const response = await apiFetch('/api/exchange-rates');
        const data = await response.json();
        if (data.success && data.data.rate) {
          setExchangeRate(data.data.rate);
        }
      } catch (error) {
        console.error('Error cargando tipo de cambio:', error);
        // Mantener el valor por defecto
      }
    };

    loadCategories();
    loadExchangeRate();
  }, []);

  // Inicializar gastos editables cuando se obtiene el resultado del análisis
  useEffect(() => {
    if (analysisResult?.expenses) {
      setEditingExpenses([...analysisResult.expenses]);
    }
  }, [analysisResult]);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (file.type !== 'application/pdf') {
        setError('Por favor selecciona un archivo PDF válido');
        return;
      }
      if (file.size > 10 * 1024 * 1024) {
        setError('El archivo es demasiado grande. Máximo 10MB permitido');
        return;
      }
      setSelectedFile(file);
      setError(null);
      setAnalysisResult(null);
    }
  };

  const removeFile = () => {
    setSelectedFile(null);
    setAnalysisResult(null);
    setError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleAnalyze = async () => {
    if (!selectedFile) return;

    setIsAnalyzing(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append('pdf', selectedFile);

      const response = await apiFetch('/api/pdf-analyze', {
        method: 'POST',
        body: formData,
        timeout: 60000, // 60 seconds for PDF analysis
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Error analizando el PDF');
      }

      if (data.success) {
        setAnalysisResult(data.analysis);
        // Seleccionar todos los gastos por defecto
        setSelectedExpenses(new Set(data.analysis.expenses.map((_: Expense, index: number) => index)));
      } else {
        throw new Error(data.message || 'Error en el análisis');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error inesperado');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const toggleExpenseSelection = (index: number) => {
    const newSelected = new Set(selectedExpenses);
    if (newSelected.has(index)) {
      newSelected.delete(index);
    } else {
      newSelected.add(index);
    }
    setSelectedExpenses(newSelected);
  };

  const selectAllExpenses = () => {
    if (analysisResult) {
      setSelectedExpenses(new Set(analysisResult.expenses.map((_: Expense, index: number) => index)));
    }
  };

  // Funciones para editar gastos
  const updateExpenseCategory = (index: number, category: string) => {
    const updatedExpenses = [...editingExpenses];
    const originalExpense = analysisResult?.expenses[index];

    updatedExpenses[index] = {
      ...updatedExpenses[index],
      category,
      // Si es "Otros Gastos", usar la descripción como nota por defecto
      notes: category === 'Otros Gastos' ? (originalExpense?.description || updatedExpenses[index].description) : undefined
    };
    setEditingExpenses(updatedExpenses);
  };

  const updateExpenseNotes = (index: number, notes: string) => {
    const updatedExpenses = [...editingExpenses];
    updatedExpenses[index] = {
      ...updatedExpenses[index],
      notes
    };
    setEditingExpenses(updatedExpenses);
  };

  // Función para cambiar la moneda de un gasto individual
  const toggleExpenseCurrency = (index: number) => {
    const updatedExpenses = [...editingExpenses];
    const currentExpense = updatedExpenses[index];

    // Cambiar entre UYU y USD
    const newCurrency = currentExpense.currency === 'UYU' ? 'USD' : 'UYU';
    updatedExpenses[index] = {
      ...currentExpense,
      currency: newCurrency
    };

    setEditingExpenses(updatedExpenses);
  };

  const handleAddSelectedExpenses = async () => {
    if (!editingExpenses.length) return;

    const expensesToAdd = editingExpenses.filter((_: Expense, index: number) =>
      selectedExpenses.has(index)
    );

    if (expensesToAdd.length === 0) {
      alert('Selecciona al menos un gasto para agregar');
      return;
    }

    try {
      const currentDate = new Date().toISOString().split('T')[0];

      const transactions = expensesToAdd.map(expense => {
        // Usar la versión editada si existe, sino la original
        const expenseIndex = analysisResult?.expenses.indexOf(expense) ?? -1;
        const editedExpense = expenseIndex >= 0 ? editingExpenses[expenseIndex] : null;
        return {
          type: 'expense' as const,
          description: editedExpense?.description || expense.description,
          amount: editedExpense?.amount || expense.amount,
          category: editedExpense?.category || expense.category,
          date: currentDate, // Usar fecha actual en lugar de la fecha del PDF
          currency: editedExpense?.currency || expense.currency, // Usar moneda editada si se cambió
          notes: editedExpense?.notes || expense.notes,
          source: 'pdf-analyzer'
        };
      });

      // Agregar transacciones a través de la API pública
      for (const transaction of transactions) {
        await apiFetch('/api/public/transactions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(transaction),
        });
      }

      alert(`✅ ${expensesToAdd.length} gastos agregados exitosamente a tu sistema financiero`);

      // Limpiar selección
      setSelectedExpenses(new Set());

    } catch (err) {
      alert('Error agregando gastos: ' + (err instanceof Error ? err.message : 'Error desconocido'));
    }
  };

  const formatCurrency = (amount: number, currency: string = 'UYU') => {
    return new Intl.NumberFormat('es-UY', {
      style: 'currency',
      currency: currency === 'USD' ? 'USD' : 'UYU',
    }).format(amount);
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className="bg-white rounded-lg shadow-md border border-gray-200 p-6">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          <i className="fas fa-file-pdf mr-2 text-red-500"></i>
          Analizador de PDFs con IA
        </h2>
        <p className="text-gray-600">
          Sube un estado de cuenta bancario en PDF y la IA extraerá automáticamente todos los gastos
        </p>
      </div>


      {/* File Upload Section */}
      <div className="mb-6">
        <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-blue-400 transition-colors">
          {!selectedFile ? (
            <div className="space-y-4">
              <div className="mx-auto w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center">
                <i className="fas fa-cloud-upload-alt text-gray-600 text-xl"></i>
              </div>
              <div>
                <label htmlFor="pdf-file" className="cursor-pointer">
                  <span className="text-lg font-medium text-blue-600 hover:text-blue-800">
                    Haz clic para subir un PDF
                  </span>
                </label>
                <input
                  ref={fileInputRef}
                  id="pdf-file"
                  type="file"
                  accept=".pdf"
                  onChange={handleFileSelect}
                  className="hidden"
                />
                <p className="text-sm text-gray-500 mt-1">o arrastra y suelta</p>
                <p className="text-xs text-gray-400 mt-2">Hasta 10MB • Solo archivos PDF</p>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="mx-auto w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                <i className="fas fa-file-pdf text-green-600 text-xl"></i>
              </div>
              <div>
                <p className="font-medium text-gray-900">{selectedFile.name}</p>
                <p className="text-sm text-gray-500">{formatFileSize(selectedFile.size)}</p>
                <button
                  onClick={removeFile}
                  className="mt-2 text-sm text-red-600 hover:text-red-800"
                >
                  <i className="fas fa-times mr-1"></i>
                  Remover archivo
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Analyze Button */}
      <div className="mb-6">
        <button
          onClick={handleAnalyze}
          disabled={!selectedFile || isAnalyzing}
          className={`w-full py-3 px-4 rounded-lg font-medium transition-colors ${
            selectedFile && !isAnalyzing
              ? 'bg-blue-600 text-white hover:bg-blue-700 focus:ring-2 focus:ring-blue-500'
              : 'bg-gray-300 text-gray-500 cursor-not-allowed'
          }`}
        >
          {isAnalyzing ? (
            <div className="flex items-center justify-center space-x-2">
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
              <span>Analizando con IA...</span>
            </div>
          ) : (
            <div className="flex items-center justify-center space-x-2">
              <i className="fas fa-brain"></i>
              <span>Analizar PDF con OpenAI GPT-4o-mini</span>
            </div>
          )}
        </button>

        {isAnalyzing && (
          <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-center space-x-3">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
              <div>
                <p className="font-medium text-blue-900">Procesando documento...</p>
                <p className="text-sm text-blue-700">
                  Extrayendo texto → Analizando con IA → Categorizando gastos
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Error Display */}
      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
          <div className="flex items-start space-x-3">
            <i className="fas fa-exclamation-triangle text-red-500 mt-0.5"></i>
            <div>
              <h3 className="font-medium text-red-900">Error en el análisis</h3>
              <p className="text-sm text-red-700 mt-1">{error}</p>
            </div>
          </div>
        </div>
      )}

      {/* Analysis Results */}
      {analysisResult && (
        <div className="space-y-6">
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="flex items-center">
                <div className="p-3 bg-red-100 rounded-full">
                  <i className="fas fa-dollar-sign text-red-600"></i>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-red-800">Total Gastos</p>
                  <p className="text-2xl font-bold text-red-900">
                    {formatCurrency(analysisResult.summary.totalExpenses, analysisResult.summary.currency)}
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-center">
                <div className="p-3 bg-blue-100 rounded-full">
                  <i className="fas fa-list text-blue-600"></i>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-blue-800">Gastos Identificados</p>
                  <p className="text-2xl font-bold text-blue-900">{analysisResult.summary.expenseCount}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Expenses List */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">
                <i className="fas fa-receipt mr-2 text-red-500"></i>
                Gastos Identificados
              </h3>
              {analysisResult.expenses.length > 0 && (
                <button
                  onClick={selectAllExpenses}
                  className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors"
                >
                  <i className="fas fa-check-square mr-1"></i>
                  Seleccionar Todos ({selectedExpenses.size})
                </button>
              )}
            </div>

            <div className="space-y-3 max-h-96 overflow-y-auto">
              {analysisResult.expenses.length > 0 ? (
                analysisResult.expenses.map((expense, index) => (
                  <div key={index} className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
                    <div className="flex items-start space-x-3 mb-3">
                      <input
                        type="checkbox"
                        checked={selectedExpenses.has(index)}
                        onChange={() => toggleExpenseSelection(index)}
                        className="mt-1 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                      />
                      <div className="flex-1">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <h4 className="font-medium text-gray-900 text-lg">{expense.description}</h4>
                            <p className="text-sm text-gray-500">{expense.date}</p>
                          </div>
                          <div className="text-right ml-4 flex items-center space-x-2">
                            <button
                              onClick={() => toggleExpenseCurrency(index)}
                              className="text-xs px-2 py-1 bg-gray-100 hover:bg-gray-200 text-gray-600 rounded transition-colors"
                              title={`Cambiar a ${editingExpenses[index]?.currency === 'UYU' ? 'USD' : 'UYU'}`}
                            >
                              <i className="fas fa-exchange-alt"></i>
                            </button>
                            <div>
                              <p className="font-bold text-red-600 text-xl">
                                {formatCurrency(editingExpenses[index]?.amount || expense.amount, editingExpenses[index]?.currency || expense.currency)}
                              </p>
                              <p className="text-xs text-gray-500">
                                {editingExpenses[index]?.currency || expense.currency}
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-3">
                      <div className="flex items-center space-x-2">
                        <span className="text-sm text-gray-600">Categoría:</span>
                        <select
                          value={editingExpenses[index]?.category || expense.category}
                          onChange={(e) => updateExpenseCategory(index, e.target.value)}
                          className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded border border-blue-200 focus:ring-1 focus:ring-blue-300"
                        >
                          {availableCategories.map((cat) => (
                            <option key={cat._id} value={cat.name}>
                              {cat.name}
                            </option>
                          ))}
                        </select>
                        {expense.confidence && (
                          <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full">
                            {Math.round(expense.confidence * 100)}% confianza
                          </span>
                        )}
                      </div>

                      {editingExpenses[index]?.category === 'Otros Gastos' && (
                        <div className="flex items-center space-x-2">
                          <span className="text-sm text-gray-600">Comentario:</span>
                          <input
                            type="text"
                            value={editingExpenses[index]?.notes || ''}
                            onChange={(e) => updateExpenseNotes(index, e.target.value)}
                            placeholder="Describe el gasto..."
                            className="flex-1 px-2 py-1 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-blue-300 focus:border-blue-400"
                          />
                        </div>
                      )}
                    </div>

                    <div className="flex justify-end mt-3">

                      <button
                        onClick={async () => {
                          try {
                            const editedExpense = editingExpenses[index];
                            const currentDate = new Date().toISOString().split('T')[0];
                            await apiFetch('/api/public/transactions', {
                              method: 'POST',
                              headers: {
                                'Content-Type': 'application/json',
                              },
                              body: JSON.stringify({
                                type: 'expense',
                                description: editedExpense.description,
                                amount: editedExpense.amount,
                                category: editedExpense.category,
                                date: currentDate, // Usar fecha actual en lugar de la fecha del PDF
                                currency: editedExpense.currency, // Usar moneda editada
                                notes: editedExpense.notes,
                                source: 'pdf-analyzer'
                              }),
                            });
                            alert(`Gasto "${editedExpense.description}" agregado exitosamente`);
                            // Remover de la selección
                            const newSelected = new Set(selectedExpenses);
                            newSelected.delete(index);
                            setSelectedExpenses(newSelected);
                          } catch (err) {
                            alert('Error agregando gasto');
                          }
                        }}
                        className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors flex items-center space-x-2"
                      >
                        <i className="fas fa-plus"></i>
                        <span>Agregar</span>
                      </button>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-8">
                  <i className="fas fa-search text-gray-400 text-3xl mb-2"></i>
                  <p className="text-gray-500">No se identificaron gastos en el PDF</p>
                </div>
              )}
            </div>

            {analysisResult.expenses.length > 0 && (
              <div className="mt-6 flex justify-center">
                <button
                  onClick={handleAddSelectedExpenses}
                  disabled={selectedExpenses.size === 0}
                  className={`px-6 py-3 rounded-lg font-medium transition-colors ${
                    selectedExpenses.size > 0
                      ? 'bg-green-600 text-white hover:bg-green-700'
                      : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  }`}
                >
                  <i className="fas fa-plus mr-2"></i>
                  Agregar {selectedExpenses.size} gastos seleccionados
                </button>
              </div>
            )}
          </div>

          {/* Metadata */}
          <div className="mt-6 pt-4 border-t border-gray-200">
            <div className="text-sm text-gray-500 space-y-1">
              {analysisResult.aiModel && (
                <p><strong>Modelo de IA:</strong> {analysisResult.aiModel}</p>
              )}
              {analysisResult.confidence && (
                <p><strong>Confianza general:</strong> {Math.round(analysisResult.confidence * 100)}%</p>
              )}
              {analysisResult.analysisTimestamp && (
                <p><strong>Análisis realizado:</strong> {new Date(analysisResult.analysisTimestamp).toLocaleString('es-UY')}</p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
