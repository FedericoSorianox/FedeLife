import { Goal } from '@/types';
import { formatCurrency, formatDate } from '@/lib/utils';

interface GoalCardProps {
  goal: Goal & { progress?: number };
  onEdit?: (goal: Goal) => void;
  onDelete?: (goalId: string) => void;
  onUpdateProgress?: (goalId: string, newAmount: number) => void;
}

export default function GoalCard({
  goal,
  onEdit,
  onDelete,
  onUpdateProgress
}: GoalCardProps) {
  const progress = goal.progress || 0;
  const remaining = Math.max(0, goal.targetAmount - goal.currentAmount);
  const isCompleted = goal.currentAmount >= goal.targetAmount;
  const isOverdue = goal.deadline && new Date(goal.deadline) < new Date() && !isCompleted;

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'bg-red-100 text-red-800';
      case 'high': return 'bg-orange-100 text-orange-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      case 'low': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-800';
      case 'cancelled': return 'bg-gray-100 text-gray-800';
      default: return 'bg-blue-100 text-blue-800';
    }
  };

  return (
    <div className={`bg-white rounded-lg shadow-md border p-6 hover:shadow-lg transition-shadow ${
      isOverdue ? 'border-red-300' : 'border-gray-200'
    }`}>
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <h3 className="text-lg font-semibold text-gray-900 mb-1">
            {goal.name}
          </h3>

          {goal.description && (
            <p className="text-sm text-gray-600 mb-2">{goal.description}</p>
          )}

          <div className="flex items-center space-x-2 mb-3">
            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getPriorityColor(goal.priority)}`}>
              {goal.priority === 'urgent' ? 'Urgente' :
               goal.priority === 'high' ? 'Alta' :
               goal.priority === 'medium' ? 'Media' : 'Baja'}
            </span>

            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(goal.status)}`}>
              {goal.status === 'completed' ? 'Completada' :
               goal.status === 'cancelled' ? 'Cancelada' : 'Activa'}
            </span>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          {onEdit && goal.status !== 'completed' && (
            <button
              onClick={() => onEdit(goal)}
              className="p-2 text-gray-400 hover:text-blue-600 transition-colors"
              title="Editar meta"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
            </button>
          )}
          {onDelete && (
            <button
              onClick={() => onDelete(goal._id)}
              className="p-2 text-gray-400 hover:text-red-600 transition-colors"
              title="Eliminar meta"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>
          )}
        </div>
      </div>

      {/* Progreso */}
      <div className="mb-4">
        <div className="flex justify-between items-center mb-2">
          <span className="text-sm font-medium text-gray-700">
            Progreso: {formatCurrency(goal.currentAmount)} / {formatCurrency(goal.targetAmount)}
          </span>
          <span className="text-sm text-gray-600">
            {progress.toFixed(1)}%
          </span>
        </div>

        <div className="w-full bg-gray-200 rounded-full h-2">
          <div
            className={`h-2 rounded-full transition-all duration-300 ${
              isCompleted ? 'bg-green-600' : 'bg-blue-600'
            }`}
            style={{ width: `${Math.min(progress, 100)}%` }}
          />
        </div>
      </div>

      {/* Información adicional */}
      <div className="grid grid-cols-2 gap-4 text-sm">
        <div>
          <span className="text-gray-600">Restante:</span>
          <span className="ml-2 font-medium text-gray-900">
            {formatCurrency(remaining)}
          </span>
        </div>

        {goal.deadline && (
          <div>
            <span className="text-gray-600">Fecha límite:</span>
            <span className={`ml-2 font-medium ${isOverdue ? 'text-red-600' : 'text-gray-900'}`}>
              {formatDate(goal.deadline)}
            </span>
          </div>
        )}
      </div>

      {goal.expectedAmount && goal.expectedAmount > goal.targetAmount && (
        <div className="mt-3 p-2 bg-yellow-50 rounded-md">
          <p className="text-xs text-yellow-800">
            ⚠️ Monto esperado supera la meta objetivo
          </p>
        </div>
      )}

      {isOverdue && (
        <div className="mt-3 p-2 bg-red-50 rounded-md">
          <p className="text-xs text-red-800">
            ⚠️ Fecha límite vencida
          </p>
        </div>
      )}
    </div>
  );
}
