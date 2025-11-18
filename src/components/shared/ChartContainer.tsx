'use client';

import React from 'react';

interface ChartContainerProps {
  title?: string;
  children: React.ReactNode;
  loading?: boolean;
  error?: string;
  className?: string;
  height?: string;
}

export const ChartContainer: React.FC<ChartContainerProps> = ({
  title,
  children,
  loading = false,
  error,
  className = '',
  height = 'h-80'
}) => {
  return (
    <div className={`bg-white p-6 rounded-lg shadow-md ${className}`}>
      {title && (
        <h3 className="text-lg font-semibold text-gray-900 mb-4">{title}</h3>
      )}
      
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">
          <p className="text-sm font-medium">Error loading chart</p>
          <p className="text-xs mt-1">{error}</p>
        </div>
      )}

      {loading && (
        <div className={`flex items-center justify-center ${height} bg-gray-50 rounded`}>
          <div className="animate-pulse">
            <div className="h-8 w-8 bg-gray-200 rounded"></div>
          </div>
        </div>
      )}

      {!loading && !error && (
        <div className={height}>
          {children}
        </div>
      )}
    </div>
  );
};

export default ChartContainer;