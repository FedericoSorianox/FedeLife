'use client';

import { useState } from 'react';
import { Goal } from '@/types';
import GoalCard from './GoalCard';
import GoalForm from './GoalForm';
import GoalAIChat from './GoalAIChat';
import { formatCurrency } from '@/lib/utils';

interface GoalManagerProps {
  goals: Goal[];
  onCreate: (data: any) => Promise<void>;
  onUpdate: (id: string, data: any) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  onUpdateProgress?: (id: string, newAmount: number) => Promise<void>;
  loading?: boolean;
}

export default function GoalManager({
  goals,
  onCreate,
  onUpdate,
  onDelete,
  onUpdateProgress,
  loading = false
}: GoalManagerProps) {
  const [showForm, setShowForm] = useState(false);
  const [editingGoal, setEditingGoal] = useState<Goal | null>(null);
  const [filter, setFilter] = useState<'all' | 'active' | 'completed' | 'overdue'>('all');
  const [showAIChat, setShowAIChat] = useState(false);

  const goalsWithProgress = goals.map(goal => ({
    ...goal,
    progress: goal.targetAmount > 0 ? (goal.currentAmount / goal.targetAmount) * 100 : 0
  }));

  const filteredGoals = goalsWithProgress.filter(goal => {
    switch (filter) {
      case 'active':
        return goal.status === 'active';
      case 'completed':
        return goal.status === 'completed';
      case 'overdue':
        return goal.deadline && new Date(goal.deadline) < new Date() && goal.status === 'active';
      default:
        return true;
    }
  });

  const sortedGoals = filteredGoals.sort((a, b) => {
    // Primero por prioridad
    const priorityOrder = { urgent: 4, high: 3, medium: 2, low: 1 };
    const aPriority = priorityOrder[a.priority as keyof typeof priorityOrder] || 1;
    const bPriority = priorityOrder[b.priority as keyof typeof priorityOrder] || 1;

    if (aPriority !== bPriority) {
      return bPriority - aPriority;
    }

    // Luego por progreso (menos progreso primero)
    return a.progress - b.progress;
  });

  const handleCreate = async (data: any) => {
    try {
      await onCreate(data);
      setShowForm(false);
    } catch (error) {
      throw error;
    }
  };

  const handleUpdate = async (data: any) => {
    if (editingGoal) {
      try {
        await onUpdate(editingGoal._id, data);
        setEditingGoal(null);
        setShowForm(false);
      } catch (error) {
        throw error;
      }
    }
  };

  const handleEdit = (goal: Goal) => {
    setEditingGoal(goal);
    setShowForm(true);
  };

  const handleCancel = () => {
    setShowForm(false);
    setEditingGoal(null);
  };

  const handleDelete = async (goalId: string) => {
    try {
      await onDelete(goalId);
    } catch (error) {
      alert('Error al eliminar la meta');
    }
  };

  const totalTarget = goals.reduce((sum, goal) => sum + goal.targetAmount, 0);
  const totalCurrent = goals.reduce((sum, goal) => sum + goal.currentAmount, 0);
  const completedGoals = goals.filter(goal => goal.status === 'completed').length;
  const activeGoals = goals.filter(goal => goal.status === 'active').length;

  return (
    <div className="space-y-6">
      {/* Header con estadísticas */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg shadow-md border border-gray-200 p-4">
          <div className="flex items-center">
            <div className="p-3 bg-blue-100 rounded-full">
              <i className="fas fa-bullseye text-blue-600 text-xl"></i>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Metas</p>
              <p className="text-2xl font-bold text-gray-900">{goals.length}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md border border-gray-200 p-4">
          <div className="flex items-center">
            <div className="p-3 bg-green-100 rounded-full">
              <i className="fas fa-check-circle text-green-600 text-xl"></i>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Completadas</p>
              <p className="text-2xl font-bold text-gray-900">{completedGoals}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md border border-gray-200 p-4">
          <div className="flex items-center">
            <div className="p-3 bg-yellow-100 rounded-full">
              <i className="fas fa-clock text-yellow-600 text-xl"></i>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Activas</p>
              <p className="text-2xl font-bold text-gray-900">{activeGoals}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md border border-gray-200 p-4">
          <div className="flex items-center">
            <div className="p-3 bg-purple-100 rounded-full">
              <i className="fas fa-dollar-sign text-purple-600 text-xl"></i>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Progreso Total</p>
              <p className="text-lg font-bold text-gray-900">
                {totalTarget > 0 ? ((totalCurrent / totalTarget) * 100).toFixed(1) : 0}%
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Controles */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <h3 className="text-lg font-semibold text-gray-900">
            <i className="fas fa-target mr-2"></i>
            Gestión de Metas
          </h3>

          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value as any)}
            className="px-3 py-2 border border-gray-300 rounded-md focus:ring-primary focus:border-primary text-sm"
          >
            <option value="all">Todas las metas</option>
            <option value="active">Activas</option>
            <option value="completed">Completadas</option>
            <option value="overdue">Vencidas</option>
          </select>
        </div>

        <div className="flex space-x-3">
          <button
            onClick={() => setShowAIChat(true)}
            className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 focus:ring-2 focus:ring-green-500 focus:ring-offset-2"
          >
            <i className="fas fa-robot mr-2"></i>
            Asesor IA
          </button>

          <button
            onClick={() => setShowForm(true)}
            className="px-4 py-2 bg-primary text-white rounded-md hover:bg-blue-600 focus:ring-2 focus:ring-primary focus:ring-offset-2"
          >
            <i className="fas fa-plus mr-2"></i>
            Nueva Meta
          </button>
        </div>
      </div>

      {/* Formulario */}
      {showForm && (
        <GoalForm
          goal={editingGoal || undefined}
          onSubmit={editingGoal ? handleUpdate : handleCreate}
          onCancel={handleCancel}
          loading={loading}
        />
      )}

      {/* Lista de metas */}
      {sortedGoals.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-lg">
          <i className="fas fa-inbox text-4xl text-gray-300"></i>
          <p className="mt-2 text-gray-500">
            {filter === 'all' ? 'No hay metas creadas' :
             filter === 'active' ? 'No hay metas activas' :
             filter === 'completed' ? 'No hay metas completadas' :
             'No hay metas vencidas'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {sortedGoals.map(goal => (
            <GoalCard
              key={goal._id || `${goal.name}-${goal.createdAt}`}
              goal={goal}
              onEdit={handleEdit}
              onDelete={handleDelete}
              onUpdateProgress={onUpdateProgress}
            />
          ))}
        </div>
      )}

      {/* Resumen financiero */}
      {goals.length > 0 && (
        <div className="bg-white rounded-lg shadow-md border border-gray-200 p-6">
          <h4 className="text-lg font-semibold text-gray-900 mb-4">Resumen Financiero</h4>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center">
              <p className="text-sm text-gray-600">Total Ahorrado</p>
              <p className="text-2xl font-bold text-green-600">
                {formatCurrency(totalCurrent)}
              </p>
            </div>
            <div className="text-center">
              <p className="text-sm text-gray-600">Objetivo Total</p>
              <p className="text-2xl font-bold text-blue-600">
                {formatCurrency(totalTarget)}
              </p>
            </div>
            <div className="text-center">
              <p className="text-sm text-gray-600">Restante</p>
              <p className="text-2xl font-bold text-gray-900">
                {formatCurrency(Math.max(0, totalTarget - totalCurrent))}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Chat con IA */}
      {showAIChat && (
        <GoalAIChat
          goals={goals}
          onClose={() => setShowAIChat(false)}
        />
      )}
    </div>
  );
}
