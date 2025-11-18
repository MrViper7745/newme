import { format } from 'date-fns';
import { BRAND_COLORS, DATE_FORMATS, CURRENCY_FORMATS, ORDER_STATUS_COLORS, PRIORITY_COLORS, ORDER_STATUS } from './constants';

// Date Formatting Utilities
export const formatDate = (date: Date | string, format: string = DATE_FORMATS.DISPLAY): string => {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  return format(dateObj, format);
};

export const formatDateRelative = (date: Date | string): string => {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  const now = new Date();
  const diffMs = now.getTime() - dateObj.getTime();
  const diffSeconds = Math.floor(diffMs / 1000);
  const diffMinutes = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffSeconds < 60) {
    return 'Just now';
  } else if (diffMinutes < 60) {
    return `${diffMinutes} minute${diffMinutes > 1 ? 's' : ''} ago`;
  } else if (diffHours < 24) {
    return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
  } else if (diffDays < 30) {
    return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
  } else {
    return formatDate(dateObj, DATE_FORMATS.DATE_ONLY);
  }
};

export const isToday = (date: Date | string): boolean => {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  const today = new Date();
  return dateObj.toDateString() === today.toDateString();
};

export const isExpired = (date: Date | string): boolean => {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  return dateObj < new Date();
};

// Currency Formatting Utilities
export const formatCurrency = (
  amount: number, 
  currency: string = 'USD',
  showSymbol: boolean = true
): string => {
  try {
    const currencyFormat = CURRENCY_FORMATS[currency as keyof typeof CURRENCY_FORMATS];
    if (currencyFormat) {
      return new Intl.NumberFormat(currencyFormat.locale, {
        style: showSymbol ? 'currency' : 'decimal',
        currency: showSymbol ? currency : undefined,
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }).format(amount);
    }
  } catch {
    return `${currency} ${amount.toFixed(2)}`;
  }
  
  return `${currency} ${amount.toFixed(2)}`;
};

export const formatPercentage = (
  value: number, 
  decimals: number = 1,
  showSign: boolean = true
): string => {
  const percentage = value * 100;
  const sign = showSign && value > 0 ? '+' : '';
  return `${sign}${percentage.toFixed(decimals)}%`;
};

// Number Formatting Utilities
export const formatNumber = (
  num: number, 
  decimals: number = 0
): string => {
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(num);
};

export const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

export const formatPhoneNumber = (phone: string): string => {
  const cleaned = phone.replace(/\D/g, '');
  const match = cleaned.match(/^(\d{3})(\d{3})(\d{4})$/);
  
  if (match) {
    return `(${match[1]}) ${match[2]}-${match[3]}`;
  }
  
  return phone;
};

// Validation Utilities
export const validateEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

export const validatePhone = (phone: string): boolean => {
  const phoneRegex = /^\+?[\d\s-()]+$/;
  return phoneRegex.test(phone) && phone.replace(/\D/g, '').length >= 10;
};

export const validatePassword = (password: string): {
  isValid: boolean;
  errors: string[];
} => {
  const errors: string[] = [];
  
  if (password.length < 8) {
    errors.push('Password must be at least 8 characters long');
  }
  
  if (!/[A-Z]/.test(password)) {
    errors.push('Password must contain at least one uppercase letter');
  }
  
  if (!/[a-z]/.test(password)) {
    errors.push('Password must contain at least one lowercase letter');
  }
  
  if (!/\d/.test(password)) {
    errors.push('Password must contain at least one number');
  }
  
  if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
    errors.push('Password must contain at least one special character');
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
};

export const validateUrl = (url: string): boolean => {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
};

export const validateZipCode = (zipCode: string): boolean => {
  const zipRegex = /^\d{5}(-\d{4})?$/;
  return zipRegex.test(zipCode);
};

// String Utilities
export const capitalizeFirst = (str: string): string => {
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
};

export const capitalizeWords = (str: string): string => {
  return str.replace(/\b\w/g, char => char.toUpperCase());
};

export const truncateText = (text: string, maxLength: number, suffix: string = '...'): string => {
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength - suffix.length) + suffix;
};

export const slugify = (text: string): string => {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
};

export const generateRandomId = (prefix: string = ''): string => {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substr(2);
  return `${prefix}${timestamp}${random}`;
};

export const highlightSearchTerm = (text: string, searchTerm: string): string => {
  if (!searchTerm) return text;
  
  const regex = new RegExp(`(${searchTerm})`, 'gi');
  return text.replace(regex, '<mark>$1</mark>');
};

// Color Utilities
export const getStatusColor = (status: string): string => {
  return ORDER_STATUS_COLORS[status as keyof typeof ORDER_STATUS_COLORS] || BRAND_COLORS.gray[500];
};

export const getPriorityColor = (priority: string): string => {
  return PRIORITY_COLORS[priority as keyof typeof PRIORITY_COLORS] || BRAND_COLORS.gray[500];
};

export const getRatingColor = (rating: number): string => {
  if (rating >= 4.5) return BRAND_COLORS.success;
  if (rating >= 4.0) return '#22c55e';
  if (rating >= 3.5) return '#fbbf24';
  if (rating >= 3.0) return BRAND_COLORS.warning;
  if (rating >= 2.0) return BRAND_COLORS.error;
  return '#991b1b';
};

export const hexToRgb = (hex: string): { r: number; g: number; b: number } => {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16)
  } : { r: 0, g: 0, b: 0 };
};

export const rgbToHex = (r: number, g: number, b: number): string => {
  return '#' + [r, g, b].map(x => {
    const hex = x.toString(16);
    return hex.length === 1 ? '0' + hex : hex;
  }).join('');
};

// Location & Distance Utilities
export const calculateDistance = (
  lat1: number, 
  lng1: number, 
  lat2: number, 
  lng2: number
): number => {
  const R = 6371; // Earth's radius in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  
  return R * c; // Distance in km
};

export const formatDistance = (distanceInKm: number): string => {
  if (distanceInKm < 1) {
    return `${(distanceInKm * 1000).toFixed(0)}m`;
  }
  return `${distanceInKm.toFixed(1)}km`;
};

export const getCoordinatesFromAddress = async (address: string): Promise<{ lat: number; lng: number } | null> => {
  try {
    // In a real app, this would call a geocoding API
    // For demo purposes, return dummy coordinates for NYC area
    return {
      lat: 40.7128 + Math.random() * 0.1,
      lng: -74.0060 + Math.random() * 0.1
    };
  } catch {
    return null;
  }
};

// File Utilities
export const getFileExtension = (filename: string): string => {
  return filename.slice((filename.lastIndexOf('.') - 1 >>> 0) + 2);
};

export const isImageFile = (filename: string): boolean => {
  const imageExtensions = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'];
  const extension = getFileExtension(filename).toLowerCase();
  return imageExtensions.includes(extension);
};

export const isPdfFile = (filename: string): boolean => {
  return getFileExtension(filename).toLowerCase() === 'pdf';
};

export const createFileDownload = (content: string, filename: string, contentType: string = 'text/plain') => {
  const blob = new Blob([content], { type: contentType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

// Chart Utilities
export const generateChartColors = (count: number): string[] => {
  const colors = [
    BRAND_COLORS.primary,
    BRAND_COLORS.success,
    BRAND_COLORS.info,
    BRAND_COLORS.warning,
    '#8b5cf6',
    '#ec4899',
    '#14b8a6',
    '#f97316',
  ];
  
  const result: string[] = [];
  for (let i = 0; i < count; i++) {
    result.push(colors[i % colors.length]);
  }
  
  return result;
};

export const prepareTimeSeriesData = (data: any[], dateField: string, valueField: string) => {
  return data.map(item => ({
    date: formatDate(item[dateField], DATE_FORMATS.DATE_ONLY),
    value: item[valueField],
    timestamp: new Date(item[dateField]).getTime()
  })).sort((a, b) => a.timestamp - b.timestamp);
};

export const aggregateByPeriod = (data: any[], dateField: string, valueField: string, period: 'day' | 'week' | 'month' | 'year') => {
  const aggregated = new Map();
  
  data.forEach(item => {
    const date = new Date(item[dateField]);
    let key: string;
    
    switch (period) {
      case 'day':
        key = formatDate(date, 'yyyy-MM-dd');
        break;
      case 'week':
        key = formatDate(date, 'yyyy-ww');
        break;
      case 'month':
        key = formatDate(date, 'yyyy-MM');
        break;
      case 'year':
        key = formatDate(date, 'yyyy');
        break;
    }
    
    if (!aggregated.has(key)) {
      aggregated.set(key, []);
    }
    aggregated.get(key)!.push(item[valueField]);
  });
  
  return Array.from(aggregated.entries()).map(([key, values]) => ({
    period: key,
    total: values.reduce((sum, val) => sum + val, 0),
    average: values.reduce((sum, val) => sum + val, 0) / values.length,
    count: values.length
  }));
};

// API Utilities (Simulated)
export const apiCall = async <T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<{ data?: T; error?: string; status: number }> => {
  // Simulate network delay
  await new Promise(resolve => setTimeout(resolve, Math.random() * 1000 + 500));
  
  // Simulate different response types
  const random = Math.random();
  
  if (random < 0.05) {
    // 5% chance of network error
    return {
      error: 'Network error. Please check your connection.',
      status: 500
    };
  }
  
  if (random < 0.1) {
    // 5% chance of server error
    return {
      error: 'Server error. Please try again later.',
      status: 500
    };
  }
  
  // 90% chance of success (simulated with mock data)
  return {
    status: 200,
    data: {} as T // In real implementation, this would be actual API response
  };
};

export const createQueryString = (params: Record<string, string | number | boolean>): string => {
  const searchParams = new URLSearchParams();
  
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      searchParams.set(key, String(value));
    }
  });
  
  return searchParams.toString();
};

export const parseQueryString = (queryString: string): Record<string, string> => {
  const params = new URLSearchParams(queryString);
  const result: Record<string, string> = {};
  
  params.forEach((value, key) => {
    result[key] = value;
  });
  
  return result;
};

// Local Storage Utilities
export const setStorageItem = (key: string, value: any): void => {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (error) {
    console.warn('Failed to save to localStorage:', error);
  }
};

export const getStorageItem = <T>(key: string, defaultValue?: T): T | null => {
  try {
    const item = localStorage.getItem(key);
    return item ? JSON.parse(item) : defaultValue || null;
  } catch {
    return defaultValue || null;
  }
};

export const removeStorageItem = (key: string): void => {
  try {
    localStorage.removeItem(key);
  } catch (error) {
    console.warn('Failed to remove from localStorage:', error);
  }
};

export const clearStorage = (): void => {
  try {
    localStorage.clear();
  } catch (error) {
    console.warn('Failed to clear localStorage:', error);
  }
};

// Error Handling Utilities
export const getErrorMessage = (error: any): string => {
  if (error?.response?.data?.message) {
    return error.response.data.message;
  }
  
  if (error?.message) {
    return error.message;
  }
  
  if (typeof error === 'string') {
    return error;
  }
  
  return 'An unexpected error occurred. Please try again.';
};

export const logError = (error: any, context?: string): void => {
  const errorInfo = {
    timestamp: new Date().toISOString(),
    error: getErrorMessage(error),
    context,
    stack: error?.stack,
    userAgent: navigator.userAgent
  };
  
  console.error('Application Error:', errorInfo);
  
  // In production, you might send this to an error tracking service
  if (process.env.NODE_ENV === 'production') {
    // sendToErrorService(errorInfo);
  }
};

// Utility for debouncing
export const debounce = <T extends (...args: any[]) => any>(
  func: T,
  wait: number
): ((...args: Parameters<T>) => void) => {
  let timeout: NodeJS.Timeout;
  
  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
};

// Utility for throttling
export const throttle = <T extends (...args: any[]) => any>(
  func: T,
  limit: number
): ((...args: Parameters<T>) => void) => {
  let inThrottle: boolean;
  
  return (...args: Parameters<T>) => {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, limit);
    }
  };
};

// Array Utilities
export const groupBy = <T, K extends keyof T>(
  array: T[],
  key: K
): Record<string, T[]> => {
  return array.reduce((groups, item) => {
    const groupKey = String(item[key]);
    if (!groups[groupKey]) {
      groups[groupKey] = [];
    }
    groups[groupKey].push(item);
    return groups;
  }, {} as Record<string, T[]>);
};

export const uniqueBy = <T, K extends keyof T>(
  array: T[],
  key: K
): T[] => {
  const seen = new Set();
  return array.filter(item => {
    const value = String(item[key]);
    if (seen.has(value)) {
      return false;
    }
    seen.add(value);
    return true;
  });
};

export const sortBy = <T>(
  array: T[],
  key: keyof T,
  direction: 'asc' | 'desc' = 'asc'
): T[] => {
  return [...array].sort((a, b) => {
    const aValue = a[key];
    const bValue = b[key];
    
    if (aValue < bValue) {
      return direction === 'asc' ? -1 : 1;
    }
    if (aValue > bValue) {
      return direction === 'asc' ? 1 : -1;
    }
    return 0;
  });
};

// Animation utilities
export const fadeIn = (element: HTMLElement, duration: number = 300): void => {
  element.style.opacity = '0';
  element.style.display = 'block';
  
  let start: number | null = null;
  
  const animate = (timestamp: number) => {
    if (!start) start = timestamp;
    const progress = timestamp - start;
    const opacity = Math.min(progress / duration, 1);
    
    element.style.opacity = String(opacity);
    
    if (progress < duration) {
      requestAnimationFrame(animate);
    }
  };
  
  requestAnimationFrame(animate);
};

export const slideDown = (element: HTMLElement, duration: number = 300): void => {
  element.style.height = '0';
  element.style.overflow = 'hidden';
  element.style.display = 'block';
  
  const height = element.scrollHeight;
  
  let start: number | null = null;
  
  const animate = (timestamp: number) => {
    if (!start) start = timestamp;
    const progress = timestamp - start;
    const currentHeight = Math.min((progress / duration) * height, height);
    
    element.style.height = `${currentHeight}px`;
    
    if (progress < duration) {
      requestAnimationFrame(animate);
    } else {
      element.style.overflow = '';
      element.style.height = '';
    }
  };
  
  requestAnimationFrame(animate);
};