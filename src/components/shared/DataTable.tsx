'use client';

import React, { useState, useMemo } from 'react';
import { 
  ChevronUp, 
  ChevronDown, 
  ChevronLeft, 
  ChevronRight,
  Search,
  Filter,
  MoreHorizontal
} from 'lucide-react';

interface Column<T> {
  key: keyof T;
  label: string;
  sortable?: boolean;
  width?: string;
  render?: (value: any, row: T) => React.ReactNode;
  className?: string;
}

interface DataTableProps<T> {
  data: T[];
  columns: Column<T>[];
  loading?: boolean;
  searchable?: boolean;
  filterable?: boolean;
  selectable?: boolean;
  pageSize?: number;
  onRowClick?: (row: T) => void;
  onSelectionChange?: (selectedRows: T[]) => void;
  className?: string;
}

export const DataTable = <T extends Record<string, any>>({
  data,
  columns,
  loading = false,
  searchable = false,
  filterable = false,
  selectable = false,
  pageSize = 20,
  onRowClick,
  onSelectionChange,
  className = ''
}: DataTableProps<T>) => {
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedRows, setSelectedRows] = useState<Set<T>>(new Set());
  const [sortColumn, setSortColumn] = useState<keyof T | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [searchTerm, setSearchTerm] = useState('');

  // Calculate pagination
  const totalPages = Math.ceil(data.length / pageSize);
  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = startIndex + pageSize;
  const paginatedData = useMemo(() => data.slice(startIndex, endIndex), [data, currentPage, pageSize]);

  // Filter and search data
  const filteredData = useMemo(() => {
    let filtered = paginatedData;

    // Apply search filter
    if (searchable && searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      filtered = filtered.filter(row =>
        columns.some(column => {
          const value = row[column.key];
          return String(value).toLowerCase().includes(searchLower);
        })
      );
    }

    return filtered;
  }, [paginatedData, searchable, searchTerm, columns]);

  // Sort data
  const sortedData = useMemo(() => {
    if (!sortColumn) return filteredData;

    return [...filteredData].sort((a, b) => {
      const aValue = a[sortColumn];
      const bValue = b[sortColumn];

      if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;

      // Handle string comparison
      const aStr = String(aValue).toLowerCase();
      const bStr = String(bValue).toLowerCase();
      
      if (aStr < bStr) return sortDirection === 'asc' ? -1 : 1;
      if (aStr > bStr) return sortDirection === 'asc' ? 1 : -1;
      
      return 0;
    });
  }, [filteredData, sortColumn, sortDirection]);

  const handleSort = (column: keyof T) => {
    if (sortColumn === column) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(column);
      setSortDirection('asc');
    }
  };

  const handleRowSelection = (row: T, checked: boolean) => {
    const newSelection = new Set(selectedRows);
    if (checked) {
      newSelection.add(row);
    } else {
      newSelection.delete(row);
    }
    setSelectedRows(newSelection);
    onSelectionChange?.(Array.from(newSelection));
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedRows(new Set(sortedData));
    } else {
      setSelectedRows(new Set());
    }
    onSelectionChange?.(checked ? sortedData : []);
  };

  const isAllSelected = selectedRows.size === sortedData.length && sortedData.length > 0;
  const isIndeterminate = selectedRows.size > 0 && selectedRows.size < sortedData.length;

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const renderCellValue = (row: T, column: Column<T>) => {
    if (column.render) {
      return column.render(row[column.key], row);
    }
    
    const value = row[column.key];
    
    // Handle different data types
    if (value === null || value === undefined) return '-';
    if (typeof value === 'boolean') return value ? 'Yes' : 'No';
    if (typeof value === 'number') return value.toLocaleString();
    if (value instanceof Date) return value.toLocaleDateString();
    if (typeof value === 'object') return JSON.stringify(value);
    
    return String(value);
  };

  if (loading) {
    return (
      <div className={`bg-white rounded-lg border border-gray-200 overflow-hidden ${className}`}>
        {/* Loading skeleton */}
        <div className="animate-pulse">
          {[...Array(5)].map((_, index) => (
            <div key={index} className="h-12 bg-gray-200 mb-2 rounded"></div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-white rounded-lg border border-gray-200 overflow-hidden ${className}`}>
      {/* Header */}
      <div className="p-4 border-b border-gray-200 bg-gray-50">
        <div className="flex items-center justify-between">
          {searchable && (
            <div className="relative flex-1 max-w-md mr-4">
              <Search className="absolute left-3 top-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent w-full"
              />
            </div>
          )}
          {filterable && (
            <button className="flex items-center px-3 py-2 border border-gray-300 rounded-md hover:bg-gray-50">
              <Filter className="h-4 w-4 mr-2" />
              Filter
            </button>
          )}
          {selectable && (
            <button 
              onClick={() => handleSelectAll(!isAllSelected)}
              className="flex items-center px-3 py-2 border border-gray-300 rounded-md hover:bg-gray-50"
            >
              <input
                type="checkbox"
                checked={isAllSelected}
                ref={(input) => {
                  if (input) input.indeterminate = isIndeterminate;
                }}
                onChange={(e) => handleSelectAll(e.target.checked)}
                className="mr-2"
              />
              Select All
            </button>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              {selectable && (
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-12">
                  <input
                    type="checkbox"
                    checked={isAllSelected}
                    ref={(input) => {
                      if (input) input.indeterminate = isIndeterminate;
                    }}
                    onChange={(e) => handleSelectAll(e.target.checked)}
                  />
                </th>
              )}
              {columns.map((column) => (
                <th
                  key={String(column.key)}
                  className={`px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider ${column.width || ''} ${column.sortable ? 'cursor-pointer hover:bg-gray-100' : ''}`}
                  onClick={() => column.sortable && handleSort(column.key)}
                >
                  <div className="flex items-center">
                    {column.label}
                    {column.sortable && (
                      <div className="ml-2 flex flex-col">
                        {sortColumn === column.key && (
                          <>
                            {sortDirection === 'asc' && <ChevronUp className="h-4 w-4" />}
                            {sortDirection === 'desc' && <ChevronDown className="h-4 w-4" />}
                          </>
                        )}
                        {sortColumn !== column.key && (
                          <div className="h-4 w-4 border-gray-400 border-t" />
                        )}
                      </div>
                    )}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {sortedData.map((row, index) => (
              <tr
                key={`${row.id || index}-${String(sortColumn)}-${sortDirection}`}
                className={`hover:bg-gray-50 ${onRowClick ? 'cursor-pointer' : ''} ${selectedRows.has(row) ? 'bg-blue-50' : ''}`}
                onClick={() => onRowClick?.(row)}
              >
                {selectable && (
                  <td className="px-6 py-4 whitespace-nowrap w-12">
                    <input
                      type="checkbox"
                      checked={selectedRows.has(row)}
                      onChange={(e) => handleRowSelection(row, e.target.checked)}
                      className="rounded"
                    />
                  </td>
                )}
                {columns.map((column) => (
                  <td
                    key={String(column.key)}
                    className={`px-6 py-4 whitespace-nowrap ${column.className || ''} ${column.width || ''}`}
                  >
                    {renderCellValue(row, column)}
                  </td>
                ))}
                <td className="px-6 py-4 whitespace-nowrap">
                  <button className="text-gray-400 hover:text-gray-600">
                    <MoreHorizontal className="h-4 w-4" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="px-4 py-3 border-t border-gray-200 bg-white flex items-center justify-between">
          <div className="text-sm text-gray-700">
            Showing {Math.min(startIndex + 1, data.length)} to {Math.min(endIndex, data.length)} of {data.length} results
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={currentPage === 1}
              className="px-3 py-1 text-sm bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ChevronLeft className="h-4 w-4" />
              Previous
            </button>
            
            <div className="flex space-x-1">
              {[...Array(Math.min(5, totalPages))].map((_, index) => {
                const page = index + 1;
                const isActive = page === currentPage;
                
                if (
                  (page === 1 && currentPage > 3) ||
                  (page === totalPages && currentPage < totalPages - 2) ||
                  (page >= currentPage - 2 && page <= currentPage + 2)
                ) {
                  return (
                    <button
                      key={page}
                      onClick={() => handlePageChange(page)}
                      className={`px-3 py-1 text-sm ${isActive ? 'bg-blue-600 text-white' : 'bg-white text-gray-700 border border-gray-300'} border rounded-md hover:bg-gray-50`}
                    >
                      {page}
                    </button>
                  );
                }
                
                if (page === currentPage - 3 && page > 0) {
                  return (
                    <button
                      key={page}
                      onClick={() => handlePageChange(page)}
                      className="px-3 py-1 text-sm bg-white text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50"
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </button>
                  );
                }
                
                if (page === currentPage + 3 && page <= totalPages) {
                  return (
                    <button
                      key={page}
                      onClick={() => handlePageChange(page)}
                      className="px-3 py-1 text-sm bg-white text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50"
                    >
                      <ChevronRight className="h-4 w-4" />
                    </button>
                  );
                }
                
                return null;
              })}
            </div>
            
            <button
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={currentPage === totalPages}
              className="px-3 py-1 text-sm bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Next
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default DataTable;