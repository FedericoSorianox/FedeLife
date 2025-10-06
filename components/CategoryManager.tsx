'use client';

import { useState } from 'react';
import { Category } from '@/types';
import CategoryCard from './CategoryCard';
import CategoryForm from './CategoryForm';

interface CategoryManagerProps {
  categories: Category[];
  onCreate: (data: any) => Promise<void>;
  onUpdate: (id: string, data: any) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  loading?: boolean;
}

export default function CategoryManager({
  categories,
  onCreate,
  onUpdate,
  onDelete,
  loading = false
}: CategoryManagerProps) {
  const [showForm, setShowForm] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);

  const incomeCategories = categories.filter(cat => cat.type === 'income');
  const expenseCategories = categories.filter(cat => cat.type === 'expense');

  const handleCreate = async (data: any) => {
    try {
      await onCreate(data);
      setShowForm(false);
    } catch (error) {
      throw error;
    }
  };

  const handleUpdate = async (data: any) => {
    if (editingCategory) {
      try {
        await onUpdate(editingCategory._id, data);
        setEditingCategory(null);
        setShowForm(false);
      } catch (error) {
        throw error;
      }
    }
  };

  const handleEdit = (category: Category) => {
    setEditingCategory(category);
    setShowForm(true);
  };

  const handleCancel = () => {
    setShowForm(false);
    setEditingCategory(null);
  };

  const handleDelete = async (categoryId: string) => {
    try {
      await onDelete(categoryId);
    } catch (error) {
      alert('Error al eliminar la categoría');
    }
  };

  const handleCreateDefaultCategories = async () => {
    try {
      const response = await fetch('/api/categories', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ createDefaultCategories: true }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        alert(`✅ ${data.message}`);
        // Recargar categorías
        window.location.reload();
      } else {
        alert(`❌ Error: ${data.message || 'No se pudieron crear las categorías'}`);
      }
    } catch (error) {
      console.error('Error creando categorías por defecto:', error);
      alert('❌ Error de conexión al crear categorías por defecto');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header con botones de crear */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900">
          <i className="fas fa-tags mr-2"></i>
          Gestión de Categorías
        </h3>
        <div className="flex space-x-3">
          <button
            onClick={handleCreateDefaultCategories}
            className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 focus:ring-2 focus:ring-green-500 focus:ring-offset-2"
            title="Crear categorías por defecto del sistema"
          >
            <i className="fas fa-magic mr-2"></i>
            Crear Categorías por Defecto
          </button>
          <button
            onClick={() => setShowForm(true)}
            className="px-4 py-2 bg-primary text-white rounded-md hover:bg-blue-600 focus:ring-2 focus:ring-primary focus:ring-offset-2"
          >
            <i className="fas fa-plus mr-2"></i>
            Nueva Categoría
          </button>
        </div>
      </div>

      {/* Formulario */}
      {showForm && (
        <CategoryForm
          category={editingCategory || undefined}
          onSubmit={editingCategory ? handleUpdate : handleCreate}
          onCancel={handleCancel}
          loading={loading}
        />
      )}

      {/* Categorías de Ingresos */}
      <div>
        <h4 className="text-md font-medium text-gray-900 mb-4 flex items-center">
          <i className="fas fa-arrow-up text-green-600 mr-2"></i>
          Categorías de Ingresos
        </h4>
        {incomeCategories.length === 0 ? (
          <div className="text-center py-8 bg-gray-50 rounded-lg">
            <i className="fas fa-inbox text-4xl text-gray-300"></i>
            <p className="mt-2 text-gray-500">No hay categorías de ingresos</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {incomeCategories.map(category => (
              <CategoryCard
                key={category._id || `${category.name}-${category.type}`}
                category={category}
                onEdit={handleEdit}
                onDelete={handleDelete}
              />
            ))}
          </div>
        )}
      </div>

      {/* Categorías de Gastos */}
      <div>
        <h4 className="text-md font-medium text-gray-900 mb-4 flex items-center">
          <i className="fas fa-arrow-down text-red-600 mr-2"></i>
          Categorías de Gastos
        </h4>
        {expenseCategories.length === 0 ? (
          <div className="text-center py-8 bg-gray-50 rounded-lg">
            <i className="fas fa-inbox text-4xl text-gray-300"></i>
            <p className="mt-2 text-gray-500">No hay categorías de gastos</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {expenseCategories.map(category => (
              <CategoryCard
                key={category._id || `${category.name}-${category.type}`}
                category={category}
                onEdit={handleEdit}
                onDelete={handleDelete}
              />
            ))}
          </div>
        )}
      </div>

      {/* Estadísticas */}
      <div className="bg-gray-50 rounded-lg p-6">
        <h4 className="text-md font-medium text-gray-900 mb-4">Resumen</h4>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-gray-900">{categories.length}</div>
            <div className="text-sm text-gray-600">Total de categorías</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">{incomeCategories.length}</div>
            <div className="text-sm text-gray-600">Categorías de ingresos</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-red-600">{expenseCategories.length}</div>
            <div className="text-sm text-gray-600">Categorías de gastos</div>
          </div>
        </div>
      </div>
    </div>
  );
}
