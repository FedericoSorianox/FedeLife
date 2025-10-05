'use client';

import { useState, useEffect } from 'react';
import { apiFetch, formatCurrency } from '@/lib/utils';

interface CurrencyTransferProps {
  exchangeRate: number;
  onTransferComplete?: () => void;
}

export default function CurrencyTransfer({ exchangeRate, onTransferComplete }: CurrencyTransferProps) {
  const [showExchangeRateModal, setShowExchangeRateModal] = useState(false);
  const [showTransferForm, setShowTransferForm] = useState(false);
  const [customExchangeRate, setCustomExchangeRate] = useState<number>(exchangeRate);
  const [transferType, setTransferType] = useState<'UYU_TO_USD' | 'USD_TO_UYU'>('UYU_TO_USD');
  const [amount, setAmount] = useState('');
  const [convertedAmount, setConvertedAmount] = useState(0);
  const [description, setDescription] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  // Calcular conversión automáticamente
  useEffect(() => {
    const numAmount = parseFloat(amount) || 0;
    if (transferType === 'UYU_TO_USD') {
      setConvertedAmount(numAmount / customExchangeRate);
    } else {
      setConvertedAmount(numAmount * customExchangeRate);
    }
  }, [amount, transferType, customExchangeRate]);

  const handleStartTransfer = () => {
    setShowExchangeRateModal(true);
  };

  const handleExchangeRateSubmit = () => {
    const rate = parseFloat(customExchangeRate.toString());
    if (isNaN(rate) || rate <= 0) {
      alert('Por favor ingresa un tipo de cambio válido');
      return;
    }

    setShowExchangeRateModal(false);
    setShowTransferForm(true);
  };

  const handleTransfer = async () => {
    if (!amount || convertedAmount === 0) {
      alert('Por favor ingresa un monto válido');
      return;
    }

    setIsProcessing(true);

    try {
      // Crear descripción automática si no se proporciona
      const transferDescription = description.trim() ||
        (transferType === 'UYU_TO_USD'
          ? `Conversión UYU → USD (${formatCurrency(parseFloat(amount))} → ${formatCurrency(convertedAmount, 'USD')})`
          : `Conversión USD → UYU (${formatCurrency(parseFloat(amount), 'USD')} → ${formatCurrency(convertedAmount)})`);

      // Crear transacción de gasto (conversión de UYU a USD)
      const expenseTransaction = {
        type: 'expense' as const,
        description: transferDescription,
        amount: transferType === 'UYU_TO_USD' ? parseFloat(amount) : convertedAmount,
        category: 'Transferencias',
        currency: transferType === 'UYU_TO_USD' ? 'UYU' : 'USD',
        date: new Date().toISOString().split('T')[0],
        source: 'currency-transfer'
      };

      // Crear transacción de ingreso (conversión a la nueva moneda)
      const incomeTransaction = {
        type: 'income' as const,
        description: transferDescription,
        amount: transferType === 'UYU_TO_USD' ? convertedAmount : parseFloat(amount),
        category: 'Transferencias',
        currency: transferType === 'UYU_TO_USD' ? 'USD' : 'UYU',
        date: new Date().toISOString().split('T')[0],
        source: 'currency-transfer'
      };

      // Agregar ambas transacciones
      await apiFetch('/api/public/transactions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(expenseTransaction),
      });

      await apiFetch('/api/public/transactions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(incomeTransaction),
      });

      alert(`✅ Transferencia realizada exitosamente!\n\n${transferDescription}`);

      // Limpiar formulario y cerrar
      setAmount('');
      setDescription('');
      setConvertedAmount(0);
      setShowTransferForm(false);
      setCustomExchangeRate(exchangeRate); // Reset to default

      // Notificar al componente padre
      if (onTransferComplete) {
        onTransferComplete();
      }

    } catch (error) {
      console.error('Error en transferencia:', error);
      alert('Error al realizar la transferencia. Intenta nuevamente.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCancel = () => {
    setShowTransferForm(false);
    setAmount('');
    setDescription('');
    setConvertedAmount(0);
    setCustomExchangeRate(exchangeRate); // Reset to default
  };

  const getTransferIcon = () => {
    if (transferType === 'UYU_TO_USD') {
      return (
        <div className="flex items-center">
          <span className="text-lg font-bold text-blue-600">UYU</span>
          <i className="fas fa-arrow-right mx-2 text-gray-400"></i>
          <span className="text-lg font-bold text-green-600">USD</span>
        </div>
      );
    } else {
      return (
        <div className="flex items-center">
          <span className="text-lg font-bold text-green-600">USD</span>
          <i className="fas fa-arrow-right mx-2 text-gray-400"></i>
          <span className="text-lg font-bold text-blue-600">UYU</span>
        </div>
      );
    }
  };

  // Vista principal - Solo mostrar si no hay modales abiertos
  if (!showExchangeRateModal && !showTransferForm) {
    return (
      <div className="bg-white rounded-lg shadow-md border border-gray-200 p-6">
        <div className="text-center">
          <div className="mx-auto w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mb-4">
            <i className="fas fa-exchange-alt text-purple-600 text-2xl"></i>
          </div>
          <h3 className="text-xl font-bold text-gray-900 mb-2">Transferir</h3>
          <p className="text-gray-600 mb-6">
            Convierte entre pesos uruguayos (UYU) y dólares americanos (USD)
          </p>

          <button
            onClick={handleStartTransfer}
            className="bg-purple-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-purple-700 transition-colors"
          >
            <i className="fas fa-exchange-alt mr-2"></i>
            Iniciar Transferencia
          </button>
        </div>
      </div>
    );
  }

  // Modal para pedir el tipo de cambio
  if (showExchangeRateModal) {
    return (
      <div className="bg-white rounded-lg shadow-md border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-bold text-gray-900">
            <i className="fas fa-calculator mr-2 text-purple-600"></i>
            Tipo de Cambio
          </h3>
          <button
            onClick={() => setShowExchangeRateModal(false)}
            className="text-gray-400 hover:text-gray-600"
          >
            <i className="fas fa-times text-xl"></i>
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              ¿Cuál es el tipo de cambio actual?
            </label>
            <div className="relative">
              <input
                type="number"
                value={customExchangeRate}
                onChange={(e) => setCustomExchangeRate(parseFloat(e.target.value) || 0)}
                placeholder="Ej: 40.50"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-purple-500 focus:border-transparent pr-12"
                min="0.01"
                step="0.01"
              />
              <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                <span className="text-gray-500 text-sm">UYU/USD</span>
              </div>
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Tipo de cambio sugerido: {exchangeRate.toFixed(2)} UYU por USD
            </p>
          </div>

          <div className="flex space-x-3 pt-4">
            <button
              onClick={() => setShowExchangeRateModal(false)}
              className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors"
            >
              Cancelar
            </button>
            <button
              onClick={handleExchangeRateSubmit}
              className="flex-1 px-4 py-2 bg-purple-600 text-white rounded-md font-medium hover:bg-purple-700 transition-colors"
            >
              Continuar
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-md border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-xl font-bold text-gray-900">
          <i className="fas fa-exchange-alt mr-2 text-purple-600"></i>
          Transferir
        </h3>
        <button
          onClick={handleCancel}
          className="text-gray-400 hover:text-gray-600"
        >
          <i className="fas fa-times text-xl"></i>
        </button>
      </div>

      {/* Selector de tipo de transferencia */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-3">
          Tipo de Transferencia
        </label>
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={() => setTransferType('UYU_TO_USD')}
            className={`p-4 border-2 rounded-lg text-center transition-colors ${
              transferType === 'UYU_TO_USD'
                ? 'border-blue-500 bg-blue-50 text-blue-700'
                : 'border-gray-200 hover:border-gray-300'
            }`}
          >
            <div className="flex items-center justify-center mb-2">
              <span className="font-medium">UYU → USD</span>
            </div>
            <div className="text-sm text-gray-600">
              Convertir pesos a dólares
            </div>
          </button>

          <button
            onClick={() => setTransferType('USD_TO_UYU')}
            className={`p-4 border-2 rounded-lg text-center transition-colors ${
              transferType === 'USD_TO_UYU'
                ? 'border-green-500 bg-green-50 text-green-700'
                : 'border-gray-200 hover:border-gray-300'
            }`}
          >
            <div className="flex items-center justify-center mb-2">
              <span className="font-medium">USD → UYU</span>
            </div>
            <div className="text-sm text-gray-600">
              Convertir dólares a pesos
            </div>
          </button>
        </div>
      </div>

      {/* Información de tasa de cambio */}
      <div className="bg-gray-50 rounded-lg p-4 mb-6">
        <div className="flex items-center justify-center space-x-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-gray-900">
              {transferType === 'UYU_TO_USD' ? customExchangeRate.toFixed(2) : (1/customExchangeRate).toFixed(4)}
            </div>
            <div className="text-sm text-gray-600">
              {transferType === 'UYU_TO_USD' ? 'UYU por USD' : 'USD por UYU'}
            </div>
          </div>
          {getTransferIcon()}
        </div>
        <div className="text-center mt-2">
          <span className="text-xs text-purple-600 bg-purple-50 px-2 py-1 rounded">
            Tipo de cambio personalizado: {customExchangeRate.toFixed(2)} UYU/USD
          </span>
        </div>
      </div>

      {/* Formulario */}
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
                {transferType === 'UYU_TO_USD' ? 'USD' : 'UYU'}
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
            placeholder="Ej: Compra de dólares para viaje..."
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-purple-500 focus:border-transparent"
          />
        </div>

        <div className="flex space-x-3 pt-4">
          <button
            onClick={handleCancel}
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

      {/* Información adicional */}
      <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <div className="flex items-start space-x-3">
          <i className="fas fa-info-circle text-blue-500 mt-0.5"></i>
          <div className="text-sm text-blue-700">
            <p className="font-medium mb-1">¿Cómo funciona?</p>
            <p>
              Esta transferencia crea dos transacciones: una de gasto en la moneda original
              y una de ingreso en la moneda convertida, manteniendo el balance correcto.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
