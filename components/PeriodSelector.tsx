'use client';

import { useState } from 'react';

interface PeriodSelectorProps {
  currentPeriod: {
    month: number;
    year: number;
    type: 'monthly' | 'yearly';
  };
  onPeriodChange: (period: { month: number; year: number; type: 'monthly' | 'yearly' }) => void;
}

const MONTHS = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
];

export default function PeriodSelector({ currentPeriod, onPeriodChange }: PeriodSelectorProps) {
  const [selectedType, setSelectedType] = useState<'monthly' | 'yearly'>(currentPeriod.type);

  const handlePrevious = () => {
    let newMonth = currentPeriod.month;
    let newYear = currentPeriod.year;

    if (selectedType === 'monthly') {
      if (newMonth === 1) {
        newMonth = 12;
        newYear -= 1;
      } else {
        newMonth -= 1;
      }
    } else {
      newYear -= 1;
    }

    onPeriodChange({ month: newMonth, year: newYear, type: selectedType });
  };

  const handleNext = () => {
    let newMonth = currentPeriod.month;
    let newYear = currentPeriod.year;

    if (selectedType === 'monthly') {
      if (newMonth === 12) {
        newMonth = 1;
        newYear += 1;
      } else {
        newMonth += 1;
      }
    } else {
      newYear += 1;
    }

    onPeriodChange({ month: newMonth, year: newYear, type: selectedType });
  };

  const handleTypeChange = (type: 'monthly' | 'yearly') => {
    setSelectedType(type);
    onPeriodChange({ ...currentPeriod, type });
  };

  const getCurrentPeriodDisplay = () => {
    if (selectedType === 'monthly') {
      return `${MONTHS[currentPeriod.month - 1]} ${currentPeriod.year}`;
    }
    return `Año ${currentPeriod.year}`;
  };

  return (
    <div className="bg-white rounded-lg shadow-md border border-gray-200 p-6 mb-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <h2 className="text-xl font-semibold text-gray-900">Período de Análisis</h2>
          </div>
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={handlePrevious}
            className="p-2 rounded-md hover:bg-gray-100 transition-colors"
            title="Período anterior"
          >
            <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>

          <div className="px-4 py-2 bg-gray-50 rounded-md min-w-[150px] text-center">
            <span className="text-lg font-medium text-gray-900">
              {getCurrentPeriodDisplay()}
            </span>
          </div>

          <button
            onClick={handleNext}
            className="p-2 rounded-md hover:bg-gray-100 transition-colors"
            title="Siguiente período"
          >
            <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>
      </div>

      <div className="mt-4 flex space-x-4">
        <label className="flex items-center">
          <input
            type="radio"
            name="periodType"
            value="monthly"
            checked={selectedType === 'monthly'}
            onChange={() => handleTypeChange('monthly')}
            className="w-4 h-4 text-primary border-gray-300 focus:ring-primary"
          />
          <span className="ml-2 text-sm font-medium text-gray-700">Mensual</span>
        </label>

        <label className="flex items-center">
          <input
            type="radio"
            name="periodType"
            value="yearly"
            checked={selectedType === 'yearly'}
            onChange={() => handleTypeChange('yearly')}
            className="w-4 h-4 text-primary border-gray-300 focus:ring-primary"
          />
          <span className="ml-2 text-sm font-medium text-gray-700">Anual</span>
        </label>
      </div>
    </div>
  );
}
