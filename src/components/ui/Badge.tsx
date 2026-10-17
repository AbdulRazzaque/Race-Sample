import React from 'react';

interface BadgeProps {
  children: React.ReactNode;
  variant?: 'positive' | 'negative' | 'bothPositive' | 'neutral' | 'warning' | 'info';
  className?: string;
}

export const Badge: React.FC<BadgeProps> = ({
  children,
  variant = 'neutral',
  className = '',
}) => {
  const variantStyles = {
    positive: 'bg-emerald-50 text-emerald-700 border border-emerald-200 font-semibold',
    negative: 'bg-slate-100 text-slate-600 border border-slate-200 font-medium',
    bothPositive: 'bg-red-50 text-red-600 border border-red-200 font-bold',
    neutral: 'bg-gray-100 text-gray-700 border border-gray-200',
    warning: 'bg-amber-50 text-amber-700 border border-amber-200 font-medium',
    info: 'bg-blue-50 text-blue-700 border border-blue-200 font-medium',
  };

  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs transition-colors ${variantStyles[variant]} ${className}`}
    >
      {children}
    </span>
  );
};
