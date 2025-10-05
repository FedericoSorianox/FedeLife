interface ChartViewSelectorProps {
  currentView: 'expenses' | 'income' | 'comparative';
  onViewChange: (view: 'expenses' | 'income' | 'comparative') => void;
}

export default function ChartViewSelector({ currentView, onViewChange }: ChartViewSelectorProps) {
  const views = [
    { id: 'expenses', label: 'Gastos', icon: 'fas fa-arrow-down' },
    { id: 'income', label: 'Ingresos', icon: 'fas fa-arrow-up' },
    { id: 'comparative', label: 'Comparativa', icon: 'fas fa-balance-scale' },
  ];

  return (
    <div className="flex justify-center mb-6">
      <div className="bg-gray-100 rounded-lg p-1 flex">
        {views.map((view) => (
          <button
            key={view.id}
            onClick={() => onViewChange(view.id as any)}
            className={`flex items-center px-4 py-2 rounded-md text-sm font-medium transition-all duration-200 ${
              currentView === view.id
                ? 'bg-white text-primary shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <i className={`${view.icon} mr-2`}></i>
            {view.label}
          </button>
        ))}
      </div>
    </div>
  );
}
