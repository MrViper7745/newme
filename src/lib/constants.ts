import { NavigationCategory, NavigationItem } from './types';

// App Configuration
export const APP_CONFIG = {
  name: 'Needster Admin',
  version: '1.0.0',
  description: 'Ultimate Admin Dashboard',
  author: 'Needster Team',
} as const;

// Brand Colors
export const BRAND_COLORS = {
  primary: '#ff7300',
  primaryHover: '#e56600',
  primaryLight: '#fff2e6',
  success: '#10b981',
  warning: '#f59e0b',
  error: '#ef4444',
  info: '#3b82f6',
  gray: {
    50: '#f9fafb',
    100: '#f3f4f6',
    200: '#e5e7eb',
    300: '#d1d5db',
    400: '#9ca3af',
    500: '#6b7280',
    600: '#4b5563',
    700: '#374151',
    800: '#1f2937',
    900: '#111827',
  },
} as const;

// Supported Languages
export const SUPPORTED_LANGUAGES = [
  { code: 'en', name: 'English', flag: '🇺🇸' },
  { code: 'es', name: 'Español', flag: '🇪🇸' },
  { code: 'fr', name: 'Français', flag: '🇫🇷' },
  { code: 'ar', name: 'العربية', flag: '🇸🇦', rtl: true },
] as const;

// Supported Countries
export const SUPPORTED_COUNTRIES = [
  { code: 'US', name: 'United States', flag: '🇺🇸', currency: 'USD' },
  { code: 'CA', name: 'Canada', flag: '🇨🇦', currency: 'CAD' },
  { code: 'UK', name: 'United Kingdom', flag: '🇬🇧', currency: 'GBP' },
  { code: 'AU', name: 'Australia', flag: '🇦🇺', currency: 'AUD' },
  { code: 'ZA', name: 'South Africa', flag: '🇿🇦', currency: 'ZAR' },
] as const;

// User Roles
export const USER_ROLES = {
  SUPER_ADMIN: 'super_admin',
  MANAGER: 'manager',
  SUPPORT_AGENT: 'support_agent',
  ANALYST: 'analyst',
} as const;

// Order Status
export const ORDER_STATUS = {
  PENDING: 'pending',
  ACCEPTED: 'accepted',
  PICKED_UP: 'picked_up',
  DELIVERING: 'delivering',
  DELIVERED: 'delivered',
  CANCELLED: 'cancelled',
} as const;

// Order Status Colors
export const ORDER_STATUS_COLORS = {
  pending: '#f59e0b',
  accepted: '#3b82f6',
  picked_up: '#8b5cf6',
  delivering: '#ec4899',
  delivered: '#10b981',
  cancelled: '#ef4444',
} as const;

// Dispute Types
export const DISPUTE_TYPES = {
  WRONG_ITEMS: 'wrong_items',
  LATE_DELIVERY: 'late_delivery',
  MISSING_ITEMS: 'missing_items',
  QUALITY_ISSUE: 'quality_issue',
  PAYMENT_ISSUE: 'payment_issue',
} as const;

// Ticket Types
export const TICKET_TYPES = {
  ORDER_ISSUE: 'order_issue',
  PAYMENT_PROBLEM: 'payment_problem',
  ACCOUNT_MANAGEMENT: 'account_management',
  TECHNICAL_SUPPORT: 'technical_support',
  GENERAL_INQUIRY: 'general_inquiry',
} as const;

// Priority Levels
export const PRIORITY_LEVELS = {
  HIGH: 'high',
  MEDIUM: 'medium',
  LOW: 'low',
} as const;

// Priority Colors
export const PRIORITY_COLORS = {
  high: '#ef4444',
  medium: '#f59e0b',
  low: '#10b981',
} as const;

// Achievement Categories
export const ACHIEVEMENT_CATEGORIES = {
  APPROVALS: 'approvals',
  SPEED: 'speed',
  SUPPORT: 'support',
  LEADERSHIP: 'leadership',
} as const;

// Notification Types
export const NOTIFICATION_TYPES = {
  INFO: 'info',
  SUCCESS: 'success',
  WARNING: 'warning',
  ERROR: 'error',
} as const;

// API Endpoints
export const API_ENDPOINTS = {
  USERS: '/api/users',
  ORDERS: '/api/orders',
  VENDORS: '/api/vendors',
  DRIVERS: '/api/drivers',
  CUSTOMERS: '/api/customers',
  DISPUTES: '/api/disputes',
  PROMOTIONS: '/api/promotions',
  SUPPORT: '/api/support',
  ANALYTICS: '/api/analytics',
  SETTINGS: '/api/settings',
} as const;

// Data Refresh Intervals (in milliseconds)
export const REFRESH_INTERVALS = {
  REAL_TIME: 5000,  // 5 seconds
  FREQUENT: 30000,   // 30 seconds
  NORMAL: 300000,    // 5 minutes
  HOURLY: 3600000,  // 1 hour
} as const;

// Pagination
export const PAGINATION = {
  DEFAULT_PAGE_SIZE: 20,
  PAGE_SIZES: [10, 20, 50, 100],
} as const;

// File Upload Limits
export const FILE_UPLOAD = {
  MAX_SIZE: 5 * 1024 * 1024, // 5MB
  ALLOWED_TYPES: ['image/jpeg', 'image/png', 'application/pdf'],
  ALLOWED_EXTENSIONS: ['.jpg', '.jpeg', '.png', '.pdf'],
} as const;

// Date Formats
export const DATE_FORMATS = {
  DISPLAY: 'MMM dd, yyyy HH:mm',
  DATE_ONLY: 'MMM dd, yyyy',
  TIME_ONLY: 'HH:mm',
  ISO: "yyyy-MM-dd'T'HH:mm:ss.SSS'xxx",
} as const;

// Currency Formats
export const CURRENCY_FORMATS = {
  USD: { symbol: '$', locale: 'en-US' },
  CAD: { symbol: '$', locale: 'en-CA' },
  GBP: { symbol: '£', locale: 'en-GB' },
  AUD: { symbol: '$', locale: 'en-AU' },
  ZAR: { symbol: 'R', locale: 'en-ZA' },
} as const;

// Dashboard Metrics
export const DASHBOARD_METRICS = {
  REVENUE_GROWTH: 22.8,
  ACTIVE_ORDERS_TARGET: 250,
  SATISFACTION_TARGET: 4.5,
  RESPONSE_TIME_TARGET: 24, // minutes
} as const;

// Navigation Configuration
export const NAVIGATION_CATEGORIES: NavigationCategory[] = [
  {
    id: 'dashboard',
    label: 'Dashboard',
    items: [
      {
        id: 'overview',
        label: 'Overview',
        icon: 'LayoutDashboard',
        href: '/dashboard/overview',
        category: 'dashboard',
      },
      {
        id: 'ai-insights',
        label: 'AI Insights',
        icon: 'Brain',
        href: '/dashboard/ai-insights',
        category: 'dashboard',
      },
    ],
  },
  {
    id: 'operations',
    label: 'Operations',
    items: [
      {
        id: 'verification',
        label: 'Verification Center',
        icon: 'CheckCircle',
        href: '/dashboard/verification',
        category: 'operations',
        badge: 12,
      },
      {
        id: 'disputes',
        label: 'Dispute Management',
        icon: 'AlertTriangle',
        href: '/dashboard/disputes',
        category: 'operations',
        badge: 3,
      },
      {
        id: 'scheduling',
        label: 'Scheduling & Calendar',
        icon: 'Calendar',
        href: '/dashboard/scheduling',
        category: 'operations',
      },
    ],
  },
  {
    id: 'management',
    label: 'Management',
    items: [
      {
        id: 'customers',
        label: 'Customer Management',
        icon: 'Users',
        href: '/dashboard/customers',
        category: 'management',
      },
      {
        id: 'vendors',
        label: 'Vendor Management',
        icon: 'Store',
        href: '/dashboard/vendors',
        category: 'management',
      },
      {
        id: 'drivers',
        label: 'Driver Management',
        icon: 'Car',
        href: '/dashboard/drivers',
        category: 'management',
      },
      {
        id: 'inventory',
        label: 'Inventory Management',
        icon: 'Package',
        href: '/dashboard/inventory',
        category: 'management',
      },
    ],
  },
  {
    id: 'analytics',
    label: 'Analytics',
    items: [
      {
        id: 'leaderboard',
        label: 'Performance Leaderboard',
        icon: 'Trophy',
        href: '/dashboard/leaderboard',
        category: 'analytics',
      },
      {
        id: 'analytics',
        label: 'Advanced Analytics',
        icon: 'BarChart3',
        href: '/dashboard/analytics',
        category: 'analytics',
      },
      {
        id: 'financial',
        label: 'Financial Overview',
        icon: 'DollarSign',
        href: '/dashboard/financial',
        category: 'analytics',
      },
    ],
  },
  {
    id: 'marketing',
    label: 'Marketing',
    items: [
      {
        id: 'promotions',
        label: 'Promotion Management',
        icon: 'Tag',
        href: '/dashboard/promotions',
        category: 'marketing',
      },
      {
        id: 'marketing',
        label: 'Campaign Manager',
        icon: 'Megaphone',
        href: '/dashboard/marketing',
        category: 'marketing',
      },
      {
        id: 'gamification',
        label: 'Gamification System',
        icon: 'Gamepad2',
        href: '/dashboard/gamification',
        category: 'marketing',
      },
    ],
  },
  {
    id: 'support',
    label: 'Support',
    items: [
      {
        id: 'support',
        label: 'Support Tickets',
        icon: 'Headset',
        href: '/dashboard/support',
        category: 'support',
        badge: 8,
      },
      {
        id: 'reviews',
        label: 'Review Management',
        icon: 'Star',
        href: '/dashboard/reviews',
        category: 'support',
      },
    ],
  },
  {
    id: 'settings',
    label: 'Settings',
    items: [
      {
        id: 'zones',
        label: 'Delivery Zones',
        icon: 'Map',
        href: '/dashboard/zones',
        category: 'settings',
      },
      {
        id: 'roles',
        label: 'Roles & Permissions',
        icon: 'Shield',
        href: '/dashboard/roles',
        category: 'settings',
      },
      {
        id: 'api-console',
        label: 'API Console',
        icon: 'Code',
        href: '/dashboard/api-console',
        category: 'settings',
      },
      {
        id: 'backup',
        label: 'Backup & Recovery',
        icon: 'HardDrive',
        href: '/dashboard/backup',
        category: 'settings',
      },
      {
        id: 'audit',
        label: 'Activity Logs',
        icon: 'FileText',
        href: '/dashboard/audit',
        category: 'settings',
      },
      {
        id: 'mobile-preview',
        label: 'Mobile Preview',
        icon: 'Smartphone',
        href: '/dashboard/mobile-preview',
        category: 'settings',
      },
      {
        id: 'training',
        label: 'Video Tutorials',
        icon: 'PlayCircle',
        href: '/dashboard/training',
        category: 'settings',
      },
      {
        id: 'settings',
        label: 'Advanced Settings',
        icon: 'Settings',
        href: '/dashboard/settings',
        category: 'settings',
      },
    ],
  },
] as const;

// Default Chart Colors
export const CHART_COLORS = [
  '#ff7300', // Primary Orange
  '#10b981', // Success Green
  '#3b82f6', // Info Blue
  '#f59e0b', // Warning Yellow
  '#8b5cf6', // Purple
  '#ec4899', // Pink
  '#14b8a6', // Teal
  '#f97316', // Dark Orange
] as const;

// Achievement Definitions
export const ACHIEVEMENTS = [
  {
    id: 'first_approval',
    name: 'First Approval',
    description: 'Approve your first application',
    icon: '🏆',
    points: 50,
    category: 'approvals',
  },
  {
    id: '100_approvals',
    name: 'Century of Approvals',
    description: 'Approve 100 applications',
    icon: '🏆',
    points: 100,
    category: 'approvals',
  },
  {
    id: 'speed_demon',
    name: 'Speed Demon',
    description: 'Process requests in record time',
    icon: '⚡',
    points: 150,
    category: 'speed',
  },
  {
    id: 'customer_hero',
    name: 'Customer Hero',
    description: 'Resolve 50 support tickets',
    icon: '🎖️',
    points: 200,
    category: 'support',
  },
  {
    id: 'master_admin',
    name: 'Master Admin',
    description: 'Complete all onboarding',
    icon: '👑',
    points: 500,
    category: 'leadership',
  },
] as const;

// Level Definitions
export const LEVELS = [
  { level: 1, name: 'Novice Admin', minPoints: 0, maxPoints: 100, rewards: ['Basic Dashboard'] },
  { level: 2, name: 'Rising Star', minPoints: 100, maxPoints: 300, rewards: ['Advanced Filters'] },
  { level: 3, name: 'Pro Administrator', minPoints: 300, maxPoints: 600, rewards: ['Custom Reports'] },
  { level: 4, name: 'Expert Manager', minPoints: 600, maxPoints: 1000, rewards: ['AI Insights'] },
  { level: 5, name: 'Master Operator', minPoints: 1000, maxPoints: 1500, rewards: ['Full System Access'] },
  { level: 6, name: 'Elite Director', minPoints: 1500, maxPoints: 2500, rewards: ['Strategic Analytics'] },
  { level: 7, name: 'Legend Admin', minPoints: 2500, maxPoints: 5000, rewards: ['System Configuration'] },
  { level: 8, name: 'God Mode', minPoints: 5000, maxPoints: Infinity, rewards: ['Ultimate Control'] },
] as const;

// Zone Pricing Templates
export const ZONE_PRICING_TEMPLATES = {
  downtown: { baseFee: 2.99, perMile: 0.50, minimumOrder: 15, peakSurcharge: 1.50 },
  northSide: { baseFee: 3.99, perMile: 0.45, minimumOrder: 20, peakSurcharge: 1.00 },
  suburbs: { baseFee: 5.99, perMile: 0.40, minimumOrder: 25, peakSurcharge: 0.50 },
  rural: { baseFee: 8.99, perMile: 0.35, minimumOrder: 30, peakSurcharge: 0.00 },
} as const;

// Error Messages
export const ERROR_MESSAGES = {
  NETWORK_ERROR: 'Network error. Please check your connection.',
  UNAUTHORIZED: 'You are not authorized to access this resource.',
  FORBIDDEN: 'Access denied. Insufficient permissions.',
  NOT_FOUND: 'Resource not found.',
  SERVER_ERROR: 'Server error. Please try again later.',
  VALIDATION_ERROR: 'Please check your input and try again.',
  FILE_TOO_LARGE: 'File size exceeds the maximum allowed limit.',
  INVALID_FILE_TYPE: 'Invalid file type. Please upload an allowed file type.',
} as const;

// Success Messages
export const SUCCESS_MESSAGES = {
  SAVED: 'Changes saved successfully!',
  DELETED: 'Item deleted successfully!',
  APPROVED: 'Application approved successfully!',
  REJECTED: 'Application rejected successfully!',
  SENT: 'Message sent successfully!',
  UPDATED: 'Information updated successfully!',
  CREATED: 'Item created successfully!',
} as const;