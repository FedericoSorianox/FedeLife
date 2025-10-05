'use client';

import { useState, useEffect } from 'react';
import { CategoryFormData, Category } from '@/types';

interface CategoryFormProps {
  category?: Category;
  onSubmit: (data: CategoryFormData) => Promise<void>;
  onCancel?: () => void;
  loading?: boolean;
}

export default function CategoryForm({
  category,
  onSubmit,
  onCancel,
  loading = false
}: CategoryFormProps) {
  const [formData, setFormData] = useState<CategoryFormData>({
    name: '',
    type: 'expense',
    color: '#3498db',
    description: ''
  });

  useEffect(() => {
    if (category) {
      setFormData({
        name: category.name,
        type: category.type,
        color: category.color,
        description: category.description || ''
      });
    }
  }, [category]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name.trim()) {
      alert('El nombre de la categoría es requerido');
      return;
    }

    try {
      await onSubmit(formData);

      if (!category) {
        // Limpiar formulario solo si es creación
        setFormData({
          name: '',
          type: 'expense',
          color: '#3498db',
          description: ''
        });
      }
    } catch (error) {
      console.error('Error al guardar categoría:', error);
      alert('Error al guardar la categoría');
    }
  };

  const handleInputChange = (field: keyof CategoryFormData, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const presetColors = [
    '#e74c3c', '#f39c12', '#f1c40f', '#27ae60', '#3498db',
    '#9b59b6', '#e91e63', '#95a5a6', '#34495e', '#16a085'
  ];

  return (
    <div className="bg-white rounded-lg shadow-md border border-gray-200 p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-6">
        <i className={`fas ${category ? 'fa-edit' : 'fa-plus-circle'} mr-2 text-primary`}></i>
        {category ? 'Editar Categoría' : 'Nueva Categoría'}
      </h3>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Nombre y tipo */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Nombre *
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => handleInputChange('name', e.target.value)}
              placeholder="Nombre de la categoría"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-primary focus:border-primary"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Tipo *
            </label>
            <select
              value={formData.type}
              onChange={(e) => handleInputChange('type', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-primary focus:border-primary"
              required
            >
              <option value="expense">Gasto</option>
              <option value="income">Ingreso</option>
            </select>
          </div>
        </div>

        {/* Color */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-3">
            Color
          </label>

          {/* Selector de color personalizado */}
          <div className="flex items-center space-x-3 mb-3">
            <input
              type="color"
              value={formData.color}
              onChange={(e) => handleInputChange('color', e.target.value)}
              className="w-12 h-10 border border-gray-300 rounded cursor-pointer"
            />
            <span className="text-sm text-gray-600">
              Selecciona un color personalizado
            </span>
          </div>

          {/* Colores predefinidos */}
          <div>
            <p className="text-sm text-gray-600 mb-2">O elige un color predefinido:</p>
            <div className="flex flex-wrap gap-2">
              {presetColors.map(color => (
                <button
                  key={color}
                  type="button"
                  onClick={() => handleInputChange('color', color)}
                  className={`w-8 h-8 rounded-full border-2 transition-all ${
                    formData.color === color
                      ? 'border-gray-900 scale-110'
                      : 'border-gray-300 hover:border-gray-400'
                  }`}
                  style={{ backgroundColor: color }}
                  title={`Seleccionar color ${color}`}
                />
              ))}
            </div>
          </div>
        </div>

        {/* Descripción */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Descripción (opcional)
          </label>
          <textarea
            value={formData.description}
            onChange={(e) => handleInputChange('description', e.target.value)}
            placeholder="Descripción de la categoría..."
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-primary focus:border-primary"
          />
        </div>

        {/* Vista previa */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Vista previa
          </label>
          <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-md">
            <div
              className="w-4 h-4 rounded-full"
              style={{ backgroundColor: formData.color }}
            />
            <span className="text-sm font-medium text-gray-900">
              {formData.name || 'Nombre de la categoría'}
            </span>
            <span className="text-xs text-gray-500 capitalize">
              ({formData.type})
            </span>
          </div>
        </div>

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
                <i className={`fas ${category ? 'fa-save' : 'fa-plus'} mr-2`}></i>
                {category ? 'Actualizar' : 'Crear'} Categoría
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
