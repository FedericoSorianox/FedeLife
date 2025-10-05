'use client';

import { useState } from 'react';
import { Transaction } from '@/types';
import { formatCurrency, formatDate } from '@/lib/utils';

interface TransactionListProps {
  transactions: Transaction[];
  onDelete?: (id: string) => Promise<void>;
  onDeleteMultiple?: (ids: string[]) => Promise<void>;
  onEdit?: (transaction: Transaction) => void;
  loading?: boolean;
  totalCount?: number;
  currentPage?: number;
  totalPages?: number;
  onPageChange?: (page: number) => void;
  onItemsPerPageChange?: (itemsPerPage: number) => void;
  itemsPerPage?: number;
}

export default function TransactionList({
  transactions,
  onDelete,
  onDeleteMultiple,
  onEdit,
  loading = false,
  totalCount = 0,
  currentPage = 1,
  totalPages = 1,
  onPageChange,
  onItemsPerPageChange,
  itemsPerPage = 10
}: TransactionListProps) {
  const [filter, setFilter] = useState<'all' | 'income' | 'expense'>('all');
  const [sortBy, setSortBy] = useState<'date' | 'amount'>('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [selectedTransactions, setSelectedTransactions] = useState<Set<string>>(new Set());

  const filteredTransactions = transactions.filter(transaction => {
    if (filter === 'all') return true;
    return transaction.type === filter;
  });

  const sortedTransactions = [...filteredTransactions].sort((a, b) => {
    let comparison = 0;

    if (sortBy === 'date') {
      comparison = new Date(a.date).getTime() - new Date(b.date).getTime();
    } else if (sortBy === 'amount') {
      comparison = a.amount - b.amount;
    }

    return sortOrder === 'asc' ? comparison : -comparison;
  });

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

  // Funciones para selección múltiple
  const toggleTransactionSelection = (transactionId: string) => {
    const newSelected = new Set(selectedTransactions);
    if (newSelected.has(transactionId)) {
      newSelected.delete(transactionId);
    } else {
      newSelected.add(transactionId);
    }
    setSelectedTransactions(newSelected);
  };

  const toggleSelectAll = () => {
    if (selectedTransactions.size === sortedTransactions.length) {
      // Deseleccionar todas
      setSelectedTransactions(new Set());
    } else {
      // Seleccionar todas las transacciones visibles
      const allIds = new Set(sortedTransactions.map(t => t._id));
      setSelectedTransactions(allIds);
    }
  };

  const handleDeleteSelected = async () => {
    if (selectedTransactions.size === 0) return;

    const confirmMessage = `¿Estás seguro de que quieres eliminar ${selectedTransactions.size} transacción${selectedTransactions.size > 1 ? 'es' : ''}?`;
    if (!confirm(confirmMessage)) return;

    try {
      if (onDeleteMultiple) {
        await onDeleteMultiple(Array.from(selectedTransactions));
      } else {
        // Fallback: eliminar una por una
        for (const id of selectedTransactions) {
          if (onDelete) {
            await onDelete(id);
          }
        }
      }
      setSelectedTransactions(new Set());
    } catch (error) {
      console.error('Error eliminando transacciones:', error);
      alert('Error al eliminar las transacciones seleccionadas');
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-md border border-gray-200 p-6">
        <div className="text-center py-8">
          <i className="fas fa-spinner fa-spin text-2xl text-gray-400"></i>
          <p className="mt-2 text-gray-500">Cargando transacciones...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-md border border-gray-200">
      {/* Header con filtros */}
      <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-900">
              <i className="fas fa-list mr-2"></i>
              Historial de Transacciones
            </h3>

            <div className="flex items-center space-x-4">
              {/* Botón para eliminar seleccionadas */}
              {selectedTransactions.size > 0 && (
                <button
                  onClick={handleDeleteSelected}
                  className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors text-sm font-medium"
                >
                  <i className="fas fa-trash mr-2"></i>
                  Eliminar ({selectedTransactions.size})
                </button>
              )}

              <select
                value={filter}
                onChange={(e) => setFilter(e.target.value as any)}
                className="px-3 py-2 border border-gray-300 rounded-md focus:ring-primary focus:border-primary text-sm"
              >
                <option value="all">Todas</option>
                <option value="income">Solo Ingresos</option>
                <option value="expense">Solo Gastos</option>
              </select>
            </div>
          </div>
      </div>

      {/* Tabla */}
      <div className="overflow-x-auto">
        {sortedTransactions.length === 0 ? (
          <div className="text-center py-12">
            <i className="fas fa-inbox text-4xl text-gray-300"></i>
            <p className="mt-2 text-gray-500">No hay transacciones para mostrar</p>
          </div>
        ) : (
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  <input
                    type="checkbox"
                    checked={selectedTransactions.size === sortedTransactions.length && sortedTransactions.length > 0}
                    onChange={toggleSelectAll}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Tipo
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Descripción
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Categoría
                </th>
                <th
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort('amount')}
                >
                  Monto
                  <i className={`${getSortIcon('amount')} ml-1`}></i>
                </th>
                <th
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort('date')}
                >
                  Fecha
                  <i className={`${getSortIcon('date')} ml-1`}></i>
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {sortedTransactions.map((transaction) => (
                <tr key={transaction._id || `${transaction.description}-${transaction.date}`} className={`hover:bg-gray-50 ${selectedTransactions.has(transaction._id) ? 'bg-blue-50' : ''}`}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <input
                      type="checkbox"
                      checked={selectedTransactions.has(transaction._id)}
                      onChange={() => toggleTransactionSelection(transaction._id)}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      transaction.type === 'income'
                        ? 'bg-green-100 text-green-800'
                        : 'bg-red-100 text-red-800'
                    }`}>
                      {transaction.type === 'income' ? (
                        <>
                          <i className="fas fa-arrow-up mr-1"></i>
                          Ingreso
                        </>
                      ) : (
                        <>
                          <i className="fas fa-arrow-down mr-1"></i>
                          Gasto
                        </>
                      )}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {transaction.description}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {transaction.category}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <span className={transaction.type === 'income' ? 'text-green-600' : 'text-red-600'}>
                      {transaction.type === 'income' ? '+' : '-'}
                      {formatCurrency(transaction.amount, transaction.currency)}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {formatDate(transaction.date)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <div className="flex items-center space-x-2">
                      {onEdit && (
                        <button
                          onClick={() => onEdit(transaction)}
                          className="text-indigo-600 hover:text-indigo-900 p-1"
                          title="Editar"
                        >
                          <i className="fas fa-edit"></i>
                        </button>
                      )}
                      {onDelete && (
                        <button
                          onClick={() => onDelete(transaction._id)}
                          className="text-red-600 hover:text-red-900 p-1"
                          title="Eliminar"
                        >
                          <i className="fas fa-trash"></i>
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Footer con estadísticas y paginación */}
      <div className="px-6 py-4 border-t border-gray-200 bg-gray-50">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center space-x-4 text-sm text-gray-600">
            <span>
              Mostrando {sortedTransactions.length} transacciones
              {totalCount > 0 && ` (página ${currentPage} de ${totalPages})`}
            </span>
            <div className="flex items-center space-x-4">
              <span>
                Ingresos: {formatCurrency(
                  sortedTransactions
                    .filter(t => t.type === 'income')
                    .reduce((sum, t) => sum + t.amount, 0)
                )}
              </span>
              <span>
                Gastos: {formatCurrency(
                  sortedTransactions
                    .filter(t => t.type === 'expense')
                    .reduce((sum, t) => sum + t.amount, 0)
                )}
              </span>
            </div>
          </div>

          {/* Controles de elementos por página */}
          {onItemsPerPageChange && (
            <div className="flex items-center space-x-2">
              <span className="text-sm text-gray-600">Mostrar:</span>
              <select
                value={itemsPerPage}
                onChange={(e) => {
                  const newLimit = parseInt(e.target.value);
                  onItemsPerPageChange(newLimit);
                }}
                className="px-2 py-1 border border-gray-300 rounded text-sm focus:ring-primary focus:border-primary"
              >
                <option value={10}>10</option>
                <option value={25}>25</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>
            </div>
          )}
        </div>

        {/* Paginación */}
        {onPageChange && totalPages > 1 && (
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <button
                onClick={() => onPageChange(currentPage - 1)}
                disabled={currentPage <= 1}
                className="px-3 py-1 text-sm border border-gray-300 rounded hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <i className="fas fa-chevron-left mr-1"></i>
                Anterior
              </button>

              <div className="flex items-center space-x-1">
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  const pageNum = Math.max(1, Math.min(totalPages - 4, currentPage - 2)) + i;
                  if (pageNum > totalPages) return null;

                  return (
                    <button
                      key={pageNum}
                      onClick={() => onPageChange(pageNum)}
                      className={`px-3 py-1 text-sm border rounded ${
                        currentPage === pageNum
                          ? 'bg-primary text-white border-primary'
                          : 'border-gray-300 hover:bg-gray-100'
                      }`}
                    >
                      {pageNum}
                    </button>
                  );
                })}
              </div>

              <button
                onClick={() => onPageChange(currentPage + 1)}
                disabled={currentPage >= totalPages}
                className="px-3 py-1 text-sm border border-gray-300 rounded hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Siguiente
                <i className="fas fa-chevron-right ml-1"></i>
              </button>
            </div>

            <div className="text-sm text-gray-600">
              Total: {totalCount} transacciones
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
