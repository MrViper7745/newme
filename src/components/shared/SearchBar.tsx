'use client';

import React, { useState, useCallback, useEffect } from 'react';
import { Search } from 'lucide-react';

interface SearchBarProps {
  placeholder?: string;
  value?: string;
  onSearch: (value: string) => void;
  onClear?: () => void;
  className?: string;
  showClearButton?: boolean;
  loading?: boolean;
}

export const SearchBar: React.FC<SearchBarProps> = ({
  placeholder = 'Search...',
  value = '',
  onSearch,
  onClear,
  className = '',
  showClearButton = true,
  loading = false
}) => {
  const [internalValue, setInternalValue] = useState(value);
  const [isFocused, setIsFocused] = useState(false);

  // Debounce search input
  const debouncedSearch = useCallback(
    (searchValue: string) => {
      setInternalValue(searchValue);
      onSearch(searchValue);
    },
    [300],
    [onSearch, value]
  );

  // Update internal value when prop changes
  useEffect(() => {
    setInternalValue(value);
  }, [value]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setInternalValue(newValue);
    debouncedSearch(newValue);
    setIsFocused(true);
  };

  const handleClear = () => {
    setInternalValue('');
    setIsFocused(false);
    onClear?.();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Escape') {
      handleClear();
    }
    };

  return (
    <div className={`relative ${className}`}>
      <div className="absolute left-3 top-1/2 h-4 w-4 pointer-events-none">
        <Search className="h-4 w-4 text-gray-400" />
      </div>
      <input
        type="text"
        value={internalValue}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
        placeholder={placeholder}
        className={`pl-10 pr-4 py-2 border ${isFocused ? 'ring-2 ring-blue-500' : 'ring-1 ring-gray-300'} bg-white border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 w-full ${loading ? 'opacity-50' : ''}`}
        disabled={loading}
      />
      {showClearButton && internalValue && (
        <button
          onClick={handleClear}
          className="absolute right-3 top-1/2 h-4 w-4 text-gray-400 hover:text-gray-600"
          aria-label="Clear search"
        >
          <X className="h-4 w-4" />
        </button>
      )}
    </div>
  );
};

export default SearchBar;