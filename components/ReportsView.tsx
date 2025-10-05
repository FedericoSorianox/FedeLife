'use client';

import { useState, useEffect } from 'react';
import { formatCurrency, formatDate } from '@/lib/utils';
import { Transaction } from '@/types';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  PointElement,
  LineElement,
} from 'chart.js';
import { Bar, Line, Doughnut } from 'react-chartjs-2';

// Registrar componentes de Chart.js
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  PointElement,
  LineElement
);

interface ReportsViewProps {
  transactions: Transaction[];
  loading?: boolean;
}

export default function ReportsView({ transactions, loading = false }: ReportsViewProps) {
  const [reportType, setReportType] = useState<'monthly' | 'category' | 'trend'>('monthly');
  const [timeRange, setTimeRange] = useState<'3months' | '6months' | '1year'>('6months');

  // Calcular datos para reportes
  const monthlyData = transactions.reduce((acc, transaction) => {
    const date = new Date(transaction.date);
    const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;

    if (!acc[monthKey]) {
      acc[monthKey] = { income: 0, expenses: 0, balance: 0 };
    }

    if (transaction.type === 'income') {
      acc[monthKey].income += transaction.amount;
    } else {
      acc[monthKey].expenses += transaction.amount;
    }

    acc[monthKey].balance = acc[monthKey].income - acc[monthKey].expenses;

    return acc;
  }, {} as Record<string, { income: number; expenses: number; balance: number }>);

  const categoryData = transactions.reduce((acc, transaction) => {
    if (transaction.type === 'expense') {
      acc[transaction.category] = (acc[transaction.category] || 0) + transaction.amount;
    }
    return acc;
  }, {} as Record<string, number>);

  const sortedMonths = Object.keys(monthlyData).sort();
  const sortedCategories = Object.entries(categoryData)
    .sort(([,a], [,b]) => b - a)
    .slice(0, 10); // Top 10 categorías

  // Datos para gráfico mensual
  const monthlyChartData = {
    labels: sortedMonths.map(month => {
      const [year, monthNum] = month.split('-');
      return `${monthNum}/${year}`;
    }),
    datasets: [
      {
        label: 'Ingresos',
        data: sortedMonths.map(month => monthlyData[month].income),
        backgroundColor: 'rgba(34, 197, 94, 0.8)',
        borderColor: 'rgb(34, 197, 94)',
        borderWidth: 1,
      },
      {
        label: 'Gastos',
        data: sortedMonths.map(month => monthlyData[month].expenses),
        backgroundColor: 'rgba(239, 68, 68, 0.8)',
        borderColor: 'rgb(239, 68, 68)',
        borderWidth: 1,
      },
    ],
  };

  // Datos para gráfico de categorías
  const categoryChartData = {
    labels: sortedCategories.map(([category]) => category),
    datasets: [
      {
        data: sortedCategories.map(([, amount]) => amount),
        backgroundColor: [
          '#e74c3c', '#f39c12', '#f1c40f', '#27ae60', '#3498db',
          '#9b59b6', '#e91e63', '#95a5a6', '#34495e', '#16a085'
        ],
        borderWidth: 2,
        borderColor: '#ffffff',
      },
    ],
  };

  // Datos para gráfico de tendencia
  const trendData = {
    labels: sortedMonths.map(month => {
      const [year, monthNum] = month.split('-');
      return `${monthNum}/${year}`;
    }),
    datasets: [
      {
        label: 'Balance',
        data: sortedMonths.map(month => monthlyData[month].balance),
        borderColor: 'rgb(59, 130, 246)',
        backgroundColor: 'rgba(59, 130, 246, 0.1)',
        tension: 0.4,
        fill: true,
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top' as const,
      },
      tooltip: {
        callbacks: {
          label: function(context: any) {
            return `${context.dataset.label}: ${formatCurrency(context.parsed.y)}`;
          },
        },
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        ticks: {
          callback: function(value: any) {
            return formatCurrency(value);
          },
        },
      },
    },
  };

  const pieOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'right' as const,
        labels: {
          boxWidth: 12,
          font: {
            size: 11,
          },
        },
      },
      tooltip: {
        callbacks: {
          label: function(context: any) {
            const total = context.dataset.data.reduce((a: number, b: number) => a + b, 0);
            const percentage = ((context.parsed / total) * 100).toFixed(1);
            return `${context.label}: ${formatCurrency(context.parsed)} (${percentage}%)`;
          },
        },
      },
    },
  };

  const lineOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top' as const,
      },
      tooltip: {
        callbacks: {
          label: function(context: any) {
            return `Balance: ${formatCurrency(context.parsed.y)}`;
          },
        },
      },
    },
    scales: {
      y: {
        ticks: {
          callback: function(value: any) {
            return formatCurrency(value);
          },
        },
      },
    },
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-md border border-gray-200 p-6">
        <div className="text-center py-8">
          <i className="fas fa-spinner fa-spin text-2xl text-gray-400"></i>
          <p className="mt-2 text-gray-500">Generando reportes...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header con controles */}
      <div className="bg-white rounded-lg shadow-md border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">
            <i className="fas fa-chart-bar mr-2"></i>
            Reportes y Análisis
          </h3>

          <div className="flex items-center space-x-4">
            <select
              value={reportType}
              onChange={(e) => setReportType(e.target.value as any)}
              className="px-3 py-2 border border-gray-300 rounded-md focus:ring-primary focus:border-primary"
            >
              <option value="monthly">Análisis Mensual</option>
              <option value="category">Por Categorías</option>
              <option value="trend">Tendencia de Balance</option>
            </select>

            <select
              value={timeRange}
              onChange={(e) => setTimeRange(e.target.value as any)}
              className="px-3 py-2 border border-gray-300 rounded-md focus:ring-primary focus:border-primary"
            >
              <option value="3months">Últimos 3 meses</option>
              <option value="6months">Últimos 6 meses</option>
              <option value="1year">Último año</option>
            </select>
          </div>
        </div>

        {/* Estadísticas rápidas */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="text-center p-4 bg-blue-50 rounded-lg">
            <div className="text-2xl font-bold text-blue-600">
              {transactions.length}
            </div>
            <div className="text-sm text-blue-600">Total Transacciones</div>
          </div>

          <div className="text-center p-4 bg-green-50 rounded-lg">
            <div className="text-2xl font-bold text-green-600">
              {formatCurrency(transactions.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0))}
            </div>
            <div className="text-sm text-green-600">Total Ingresos</div>
          </div>

          <div className="text-center p-4 bg-red-50 rounded-lg">
            <div className="text-2xl font-bold text-red-600">
              {formatCurrency(transactions.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0))}
            </div>
            <div className="text-sm text-red-600">Total Gastos</div>
          </div>

          <div className="text-center p-4 bg-purple-50 rounded-lg">
            <div className={`text-2xl font-bold ${
              transactions.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0) -
              transactions.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0) >= 0
                ? 'text-green-600' : 'text-red-600'
            }`}>
              {formatCurrency(
                transactions.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0) -
                transactions.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0)
              )}
            </div>
            <div className="text-sm text-purple-600">Balance Total</div>
          </div>
        </div>
      </div>

      {/* Gráfico principal */}
      <div className="bg-white rounded-lg shadow-md border border-gray-200 p-6">
        <div className="h-96">
          {reportType === 'monthly' && (
            <Bar data={monthlyChartData} options={chartOptions} />
          )}
          {reportType === 'category' && (
            <Doughnut data={categoryChartData} options={pieOptions} />
          )}
          {reportType === 'trend' && (
            <Line data={trendData} options={lineOptions} />
          )}
        </div>
      </div>

      {/* Tabla de datos detallados */}
      <div className="bg-white rounded-lg shadow-md border border-gray-200 p-6">
        <h4 className="text-lg font-semibold text-gray-900 mb-4">
          {reportType === 'monthly' ? 'Resumen Mensual' :
           reportType === 'category' ? 'Gastos por Categoría' :
           'Tendencia de Balance'}
        </h4>

        <div className="overflow-x-auto">
          {reportType === 'monthly' && (
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Mes
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Ingresos
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Gastos
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Balance
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {sortedMonths.map(month => {
                  const data = monthlyData[month];
                  const [year, monthNum] = month.split('-');
                  return (
                    <tr key={month}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {monthNum}/{year}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-green-600">
                        {formatCurrency(data.income)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-red-600">
                        {formatCurrency(data.expenses)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <span className={data.balance >= 0 ? 'text-green-600' : 'text-red-600'}>
                          {formatCurrency(data.balance)}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}

          {reportType === 'category' && (
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Categoría
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Total Gastado
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Porcentaje
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {sortedCategories.map(([category, amount]) => {
                  const total = Object.values(categoryData).reduce((sum, val) => sum + val, 0);
                  const percentage = ((amount / total) * 100).toFixed(1);
                  return (
                    <tr key={category}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {category}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-red-600">
                        {formatCurrency(amount)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                        {percentage}%
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
