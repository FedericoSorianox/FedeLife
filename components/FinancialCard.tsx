import { formatCurrency } from '@/lib/utils';
import { ReactNode } from 'react';

interface FinancialCardProps {
  title: string;
  amount: number;
  subtitle?: string;
  icon: ReactNode;
  color: 'income' | 'expense' | 'balance' | 'transfer';
  onClick?: () => void;
  className?: string;
}

export default function FinancialCard({
  title,
  amount,
  subtitle,
  icon,
  color,
  onClick,
  className = ''
}: FinancialCardProps) {
  const colorClasses = {
    income: {
      card: 'bg-green-50 border-green-200 hover:bg-green-100',
      icon: 'bg-green-100 text-green-600',
      amount: 'text-green-600'
    },
    expense: {
      card: 'bg-red-50 border-red-200 hover:bg-red-100',
      icon: 'bg-red-100 text-red-600',
      amount: 'text-red-600'
    },
    balance: {
      card: 'bg-blue-50 border-blue-200 hover:bg-blue-100',
      icon: 'bg-blue-100 text-blue-600',
      amount: amount >= 0 ? 'text-green-600' : 'text-red-600'
    },
    transfer: {
      card: 'bg-purple-50 border-purple-200 hover:bg-purple-100',
      icon: 'bg-purple-100 text-purple-600',
      amount: 'text-purple-600'
    }
  };

  const classes = colorClasses[color];

  return (
    <div
      className={`relative rounded-lg border p-6 transition-all duration-200 ${
        onClick ? 'cursor-pointer hover:shadow-lg transform hover:scale-105' : ''
      } ${classes.card} ${className}`}
      onClick={onClick}
    >
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <h3 className="text-lg font-semibold text-gray-900 mb-1">{title}</h3>
          <p className={`text-xl font-bold mb-1 ${classes.amount}`}>
            {formatCurrency(amount)}
          </p>
          {subtitle && (
            <p className="text-sm text-gray-600">{subtitle}</p>
          )}
        </div>

        <div className={`p-3 rounded-full ${classes.icon}`}>
          {icon}
        </div>
      </div>

      {onClick && (
        <div className="absolute bottom-3 right-3">
          <div className="p-1 rounded-full bg-white shadow-sm opacity-70 hover:opacity-100 transition-opacity">
            <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
          </div>
        </div>
      )}
    </div>
  );
}
