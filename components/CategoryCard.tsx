import { Category } from '@/types';
import { formatCurrency } from '@/lib/utils';

interface CategoryCardProps {
  category: Category & { transactionCount?: number; totalAmount?: number };
  onEdit?: (category: Category) => void;
  onDelete?: (categoryId: string) => void;
  onClick?: (category: Category) => void;
}

export default function CategoryCard({ category, onEdit, onDelete, onClick }: CategoryCardProps) {
  const handleEdit = () => {
    onEdit?.(category);
  };

  const handleDelete = () => {
    if (confirm(`¿Estás seguro de que quieres eliminar la categoría "${category.name}"?`)) {
      onDelete?.(category._id || category.name);
    }
  };

  const handleClick = () => {
    onClick?.(category);
  };

  return (
    <div
      className={`bg-white rounded-lg shadow-md border border-gray-200 p-6 hover:shadow-lg transition-all cursor-pointer ${
        onClick ? 'hover:border-blue-300 hover:bg-blue-50/30' : ''
      }`}
      onClick={handleClick}
    >
      <div className="flex items-start justify-between">
        <div className="flex items-center space-x-3">
          <div
            className="w-4 h-4 rounded-full"
            style={{ backgroundColor: category.color }}
          />
          <div>
            <h3 className="text-lg font-semibold text-gray-900">{category.name}</h3>
            <p className="text-sm text-gray-600 capitalize">
              {category.type === 'income' ? 'Ingreso' : 'Gasto'}
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          {onEdit && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleEdit();
              }}
              className="p-2 text-gray-400 hover:text-blue-600 transition-colors"
              title="Editar categoría"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
            </button>
          )}
          {onDelete && !category.isDefault && category._id && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleDelete();
              }}
              className="p-2 text-gray-400 hover:text-red-600 transition-colors"
              title="Eliminar categoría"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>
          )}
        </div>
      </div>

      {/* Estadísticas */}
      {(category.transactionCount !== undefined || category.totalAmount !== undefined) && (
        <div className="mt-4 pt-4 border-t border-gray-200">
          <div className="grid grid-cols-2 gap-4 text-sm">
            {category.transactionCount !== undefined && (
              <div>
                <span className="text-gray-600">Transacciones:</span>
                <span className="ml-2 font-medium text-gray-900">
                  {category.transactionCount}
                </span>
              </div>
            )}
            {category.totalAmount !== undefined && (
              <div>
                <span className="text-gray-600">Total:</span>
                <span className="ml-2 font-medium text-gray-900">
                  {formatCurrency(category.totalAmount)}
                </span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Descripción */}
      {category.description && (
        <p className="mt-3 text-sm text-gray-600">{category.description}</p>
      )}

      {/* Indicador de clickeable */}
      {onClick && (
        <div className="mt-3 flex items-center justify-between">
          <span className="text-xs text-blue-600 flex items-center">
            <i className="fas fa-mouse-pointer mr-1"></i>
            Click para ver detalles
          </span>
        </div>
      )}

      {/* Badge para categoría por defecto */}
      {category.isDefault && (
        <div className="mt-3 flex items-center justify-between">
          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
            <i className="fas fa-lock mr-1"></i>
            Categoría del sistema
          </span>
          <span className="text-xs text-gray-500">Solo lectura</span>
        </div>
      )}

      {/* Indicador para categorías editables */}
      {!category.isDefault && category._id && (
        <div className="mt-3">
          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
            <i className="fas fa-edit mr-1"></i>
            Editable
          </span>
        </div>
      )}
    </div>
  );
}
