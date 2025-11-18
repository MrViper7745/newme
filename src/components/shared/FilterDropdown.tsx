'use client';

import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, X } from 'lucide-react';

interface FilterDropdownProps {
  trigger: React.ReactNode;
  options: { value: string; label: string }[];
  value?: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  multiSelect?: boolean;
  values?: string[];
}

export const FilterDropdown: React.FC<FilterDropdownProps> = ({
  trigger,
  options,
  value,
  onChange,
  placeholder = 'Select...',
  className = '',
  multiSelect = false,
  values = []
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);

  const filteredOptions = options.filter(option =>
    option.label.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleSelect = (optionValue: string) => {
    if (multiSelect) {
      const newValues = values.includes(optionValue)
        ? values.filter(v => v !== optionValue)
        : [...values, optionValue];
      onChange(newValues.join(','));
    } else {
      onChange(optionValue);
    }
    setIsOpen(false);
  };

  const clearSelection = () => {
    if (multiSelect) {
      onChange('');
    } else {
      onChange('');
    }
    setIsOpen(false);
  };

  const handleClickOutside = (event: MouseEvent) => {
    if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
      setIsOpen(false);
    }
  };

  useEffect(() => {
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const displayText = multiSelect
    ? values.length > 0 ? `${values.length} selected` : placeholder
    : options.find(opt => opt.value === value)?.label || placeholder;

  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-3 py-2 text-left border border-gray-300 rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
      >
        <span className="flex items-center justify-between">
          <span className="truncate">{displayText}</span>
          <ChevronDown className={`h-4 w-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
        </span>
      </button>

      {isOpen && (
        <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg">
          <div className="p-3 border-b border-gray-200">
            <input
              type="text"
              placeholder="Search..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="max-h-60 overflow-y-auto">
            {filteredOptions.length > 0 ? (
              filteredOptions.map((option) => (
                <button
                  key={option.value}
                  onClick={() => handleSelect(option.value)}
                  className="w-full px-3 py-2 text-left hover:bg-gray-100 flex items-center justify-between"
                >
                  <span className="flex-1 truncate">{option.label}</span>
                  {multiSelect && values.includes(option.value) && (
                    <div className="ml-2 h-2 w-2 bg-blue-600 rounded-full flex items-center justify-center">
                      <span className="text-white text-xs">✓</span>
                    </div>
                  )}
                </button>
              ))
            ) : (
              <div className="px-3 py-2 text-gray-500 text-sm">
                No options found
              </div>
            )}
          </div>
        </div>
      )}

      {value && (
        <button
          onClick={clearSelection}
          className="absolute right-8 top-1/2 h-4 w-4 text-gray-400 hover:text-gray-600"
          aria-label="Clear selection"
        >
          <X className="h-3 w-3" />
        </button>
      )}
    </div>
  );
};

export default FilterDropdown;