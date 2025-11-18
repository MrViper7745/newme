'use client';

import React from 'react';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { BRAND_COLORS } from '@/lib/constants';

interface StatCardProps {
  title: string;
  value: string | number;
  change?: number;
  trend?: 'up' | 'down' | 'neutral';
  icon?: React.ReactNode;
  color?: 'blue' | 'green' | 'orange' | 'red';
  loading?: boolean;
  subtitle?: string;
}

export const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  change,
  trend,
  icon,
  color = 'blue',
  loading = false,
  subtitle
}) => {
  const colorClasses = {
    blue: 'bg-blue-50 text-blue-600 border-blue-200',
    green: 'bg-green-50 text-green-600 border-green-200',
    orange: 'bg-orange-50 text-orange-600 border-orange-200',
    red: 'bg-red-50 text-red-600 border-red-200',
  }[color];

  const iconColorClasses = {
    blue: 'text-blue-500',
    green: 'text-green-500',
    orange: 'text-orange-500',
    red: 'text-red-500',
  }[color];

  const changeColorClasses = {
    up: 'text-green-600',
    down: 'text-red-600',
    neutral: 'text-gray-600',
  }[trend || 'neutral'];

  const formatValue = (val: string | number): string => {
    if (typeof val === 'number') {
      return new Intl.NumberFormat('en-US').format(val);
    }
    return val;
  };

  const formatChange = (changeValue: number): string => {
    const sign = changeValue >= 0 ? '+' : '';
    return `${sign}${changeValue.toFixed(1)}%`;
  };

  return (
    <div className={`bg-white rounded-lg border ${colorClasses[color]} p-6 shadow-sm hover:shadow-md transition-shadow duration-200`}>
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <p className="text-sm font-medium text-gray-600">{title}</p>
          <div className="flex items-center space-x-2 mt-1">
            {loading ? (
              <div className="animate-pulse">
                <div className="h-8 w-8 bg-gray-200 rounded"></div>
              </div>
            ) : (
              <>
                <span className="text-2xl font-bold text-gray-900">
                  {formatValue(value)}
                </span>
                {(change !== undefined && trend) && (
                  <div className={`flex items-center space-x-1 text-sm font-medium ${changeColorClasses[trend]}`}>
                    {trend === 'up' && <TrendingUp className="h-4 w-4" />}
                    {trend === 'down' && <TrendingDown className="h-4 w-4" />}
                    {trend === 'neutral' && <Minus className="h-4 w-4" />}
                    <span>{formatChange(change)}</span>
                  </div>
                )}
              </>
            )}
          </div>
          {subtitle && (
            <p className="text-xs text-gray-500 mt-1">{subtitle}</p>
          )}
        </div>
        {icon && (
          <div className={`p-3 rounded-lg ${iconColorClasses[color]} bg-opacity-10`}>
            {icon}
          </div>
        )}
      </div>
    </div>
  );
};

export default StatCard;