'use client';

import { useState, useEffect } from 'react';
import { GoalFormData, Goal } from '@/types';

interface GoalFormProps {
  goal?: Goal;
  onSubmit: (data: GoalFormData) => Promise<void>;
  onCancel?: () => void;
  loading?: boolean;
}

export default function GoalForm({
  goal,
  onSubmit,
  onCancel,
  loading = false
}: GoalFormProps) {
  const [formData, setFormData] = useState<GoalFormData>({
    name: '',
    description: '',
    currency: 'UYU',
    currentAmount: '',
    targetAmount: '',
    expectedAmount: '',
    category: '',
    priority: 'medium',
    tags: '',
    notes: '',
    currentDate: '',
    deadline: ''
  });

  useEffect(() => {
    if (goal) {
      setFormData({
        name: goal.name,
        description: goal.description || '',
        currency: goal.currency,
        currentAmount: goal.currentAmount.toString(),
        targetAmount: goal.targetAmount.toString(),
        expectedAmount: goal.expectedAmount?.toString() || '',
        category: goal.category || '',
        priority: goal.priority,
        tags: goal.tags?.join(', ') || '',
        notes: goal.notes || '',
        currentDate: goal.currentDate ? goal.currentDate.toISOString().split('T')[0] : '',
        deadline: goal.deadline ? goal.deadline.toISOString().split('T')[0] : ''
      });
    }
  }, [goal]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name.trim() || !formData.targetAmount) {
      alert('El nombre y monto objetivo son requeridos');
      return;
    }

    const targetAmount = parseFloat(formData.targetAmount);
    if (isNaN(targetAmount) || targetAmount <= 0) {
      alert('El monto objetivo debe ser un número positivo');
      return;
    }

    const currentAmount = formData.currentAmount ? parseFloat(formData.currentAmount) : 0;
    if (isNaN(currentAmount) || currentAmount < 0) {
      alert('El monto actual debe ser un número positivo o cero');
      return;
    }

    try {
      await onSubmit({
        ...formData,
        currentAmount: currentAmount.toString(),
        targetAmount: targetAmount.toString(),
        expectedAmount: formData.expectedAmount || undefined,
        tags: formData.tags || undefined,
        notes: formData.notes || undefined,
        currentDate: formData.currentDate || undefined,
        deadline: formData.deadline || undefined
      });
    } catch (error) {
      throw error;
    }
  };

  const handleInputChange = (field: keyof GoalFormData, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const calculateProgress = () => {
    const current = parseFloat(formData.currentAmount || '0');
    const target = parseFloat(formData.targetAmount || '0');
    if (target === 0) return 0;
    return Math.min((current / target) * 100, 100);
  };

  return (
    <div className="bg-white rounded-lg shadow-md border border-gray-200 p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-6">
        <i className={`fas ${goal ? 'fa-edit' : 'fa-plus-circle'} mr-2 text-primary`}></i>
        {goal ? 'Editar Meta' : 'Nueva Meta de Ahorro'}
      </h3>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Nombre y descripción */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Nombre de la meta *
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => handleInputChange('name', e.target.value)}
              placeholder="Ej: Viaje a Europa, Fondo de emergencia"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-primary focus:border-primary"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Prioridad
            </label>
            <select
              value={formData.priority}
              onChange={(e) => handleInputChange('priority', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-primary focus:border-primary"
            >
              <option value="low">Baja</option>
              <option value="medium">Media</option>
              <option value="high">Alta</option>
              <option value="urgent">Urgente</option>
            </select>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Descripción
          </label>
          <textarea
            value={formData.description}
            onChange={(e) => handleInputChange('description', e.target.value)}
            placeholder="Describe tu meta de ahorro..."
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-primary focus:border-primary"
          />
        </div>

        {/* Montos */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Monto actual
            </label>
            <input
              type="number"
              step="0.01"
              min="0"
              value={formData.currentAmount}
              onChange={(e) => handleInputChange('currentAmount', e.target.value)}
              placeholder="0.00"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-primary focus:border-primary"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Monto objetivo *
            </label>
            <input
              type="number"
              step="0.01"
              min="0.01"
              value={formData.targetAmount}
              onChange={(e) => handleInputChange('targetAmount', e.target.value)}
              placeholder="0.00"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-primary focus:border-primary"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Monto esperado
            </label>
            <input
              type="number"
              step="0.01"
              min="0"
              value={formData.expectedAmount}
              onChange={(e) => handleInputChange('expectedAmount', e.target.value)}
              placeholder="0.00"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-primary focus:border-primary"
            />
          </div>
        </div>

        {/* Moneda y categoría */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Moneda
            </label>
            <select
              value={formData.currency}
              onChange={(e) => handleInputChange('currency', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-primary focus:border-primary"
            >
              <option value="UYU">Pesos (UYU)</option>
              <option value="USD">Dólares (USD)</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Categoría
            </label>
            <input
              type="text"
              value={formData.category}
              onChange={(e) => handleInputChange('category', e.target.value)}
              placeholder="Ej: Vacaciones, Emergencia"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-primary focus:border-primary"
            />
          </div>
        </div>

        {/* Fechas */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Fecha actual
            </label>
            <input
              type="date"
              value={formData.currentDate}
              onChange={(e) => handleInputChange('currentDate', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-primary focus:border-primary"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Fecha objetivo
            </label>
            <input
              type="date"
              value={formData.deadline}
              onChange={(e) => handleInputChange('deadline', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-primary focus:border-primary"
            />
          </div>
        </div>

        {/* Etiquetas y notas */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Etiquetas
            </label>
            <input
              type="text"
              value={formData.tags}
              onChange={(e) => handleInputChange('tags', e.target.value)}
              placeholder="Separadas por comas"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-primary focus:border-primary"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Notas
            </label>
            <input
              type="text"
              value={formData.notes}
              onChange={(e) => handleInputChange('notes', e.target.value)}
              placeholder="Notas adicionales"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-primary focus:border-primary"
            />
          </div>
        </div>

        {/* Vista previa del progreso */}
        {formData.targetAmount && (
          <div className="bg-gray-50 rounded-lg p-4">
            <h4 className="text-sm font-medium text-gray-700 mb-2">Vista previa del progreso</h4>
            <div className="w-full bg-gray-200 rounded-full h-2 mb-2">
              <div
                className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${calculateProgress()}%` }}
              />
            </div>
            <p className="text-xs text-gray-600">
              Progreso: {calculateProgress().toFixed(1)}%
            </p>
          </div>
        )}

        {/* Botones */}
        <div className="flex justify-end space-x-3">
          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
            >
              Cancelar
            </button>
          )}
          <button
            type="submit"
            disabled={loading}
            className="px-6 py-2 bg-primary text-white rounded-md hover:bg-blue-600 focus:ring-2 focus:ring-primary focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <>
                <i className="fas fa-spinner fa-spin mr-2"></i>
                Guardando...
              </>
            ) : (
              <>
                <i className={`fas ${goal ? 'fa-save' : 'fa-plus'} mr-2`}></i>
                {goal ? 'Actualizar' : 'Crear'} Meta
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
