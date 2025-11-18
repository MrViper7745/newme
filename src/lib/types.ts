// Core User Types
export interface User {
  id: string;
  name: string;
  email: string;
  role: 'super_admin' | 'manager' | 'support_agent' | 'analyst';
  permissions: Permission[];
  lastLogin: Date;
  avatar?: string;
}

export interface Customer {
  id: string;
  name: string;
  email: string;
  phone: string;
  orders: Order[];
  lifetimeValue: number;
  favoriteVendors: string[];
  addresses: Address[];
  paymentMethods: PaymentMethod[];
  subscriptionStatus?: 'active' | 'inactive' | 'cancelled';
}

export interface Vendor {
  id: string;
  businessName: string;
  email: string;
  rating: number;
  revenue: number;
  products: Product[];
  status: 'active' | 'suspended' | 'pending';
  commissionRate: number;
  totalOrders: number;
  complianceDocuments: Document[];
}

export interface Driver {
  id: string;
  name: string;
  email: string;
  rating: number;
  deliveries: number;
  vehicleInfo: VehicleInfo;
  currentLocation?: Location;
  status: 'online' | 'offline' | 'busy';
  earnings: Earnings;
  availability: ShiftSchedule[];
}

// Order & Operations Types
export interface Order {
  id: string;
  customerId: string;
  vendorId: string;
  driverId?: string;
  status: 'pending' | 'accepted' | 'picked_up' | 'delivering' | 'delivered' | 'cancelled';
  total: number;
  items: OrderItem[];
  deliveryAddress: Address;
  createdAt: Date;
  estimatedDelivery?: Date;
  specialInstructions?: string;
}

export interface Dispute {
  id: string;
  orderId: string;
  type: DisputeType;
  status: 'open' | 'in_progress' | 'resolved' | 'closed';
  priority: 'high' | 'medium' | 'low';
  description: string;
  resolution?: Resolution;
  createdAt: Date;
  resolvedAt?: Date;
}

export interface Promotion {
  id: string;
  code: string;
  type: 'percentage' | 'fixed' | 'free_shipping';
  value: number;
  usage: number;
  maxUses: number;
  expiration: Date;
  targetAudience: 'all_users' | 'new_users' | 'vip_users' | 'custom';
  minimumOrder?: number;
  restrictions?: string[];
}

// Analytics & Metrics Types
export interface Metric {
  id: string;
  name: string;
  value: number | string;
  change?: number;
  trend: 'up' | 'down' | 'neutral';
  timestamp: Date;
  category: 'revenue' | 'orders' | 'users' | 'performance';
}

export interface Zone {
  id: string;
  name: string;
  boundaries: ZoneBoundary;
  pricing: ZonePricing;
  driverCount: number;
  orderDensity: number;
  averageDeliveryTime: number;
}

// Support & Review Types
export interface SupportTicket {
  id: string;
  customerId: string;
  subject: string;
  description: string;
  type: TicketType;
  priority: 'high' | 'medium' | 'low';
  status: 'open' | 'in_progress' | 'resolved';
  assignedTo?: string;
  createdAt: Date;
  resolvedAt?: Date;
  satisfactionRating?: number;
}

export interface Review {
  id: string;
  customerId: string;
  targetId: string;
  targetType: 'vendor' | 'driver' | 'order';
  rating: number;
  comment: string;
  photos?: string[];
  verified: boolean;
  helpful: number;
  createdAt: Date;
  response?: string;
}

// Configuration & System Types
export interface Permission {
  id: string;
  name: string;
  resource: string;
  action: 'view' | 'edit' | 'delete' | 'approve';
  scope: string[];
}

export interface APIKey {
  id: string;
  name: string;
  key: string;
  permissions: Permission[];
  rateLimit: number;
  usage: number;
  lastUsed: Date;
  expiresAt?: Date;
  createdAt: Date;
}

export interface Backup {
  id: string;
  name: string;
  size: number;
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
  createdAt: Date;
  completedAt?: Date;
  retentionDays: number;
  encryptionEnabled: boolean;
}

// Gamification Types
export interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: string;
  points: number;
  category: 'approvals' | 'speed' | 'support' | 'leadership';
  unlocked: boolean;
  unlockedAt?: Date;
}

export interface Level {
  level: number;
  name: string;
  minPoints: number;
  maxPoints: number;
  rewards: string[];
}

// Helper Types
export type DisputeType = 'wrong_items' | 'late_delivery' | 'missing_items' | 'quality_issue' | 'payment_issue';
export type TicketType = 'order_issue' | 'payment_problem' | 'account_management' | 'technical_support' | 'general_inquiry';
export type Resolution = 'full_refund' | 'partial_refund' | 'store_credit' | 'redelivery' | 'penalty';

export interface OrderItem {
  id: string;
  productId: string;
  name: string;
  quantity: number;
  price: number;
  modifications?: string[];
}

export interface Product {
  id: string;
  name: string;
  price: number;
  description: string;
  category: string;
  inStock: boolean;
  stockLevel: number;
  images: string[];
}

export interface Address {
  street: string;
  city: string;
  state: string;
  zipCode: string;
  country: string;
  coordinates?: {
    lat: number;
    lng: number;
  };
}

export interface VehicleInfo {
  type: 'car' | 'motorcycle' | 'bicycle' | 'scooter';
  make: string;
  model: string;
  year: number;
  licensePlate: string;
  insurance: boolean;
}

export interface Location {
  lat: number;
  lng: number;
  address?: string;
  timestamp: Date;
}

export interface Earnings {
  today: number;
  week: number;
  month: number;
  year: number;
  lifetime: number;
}

export interface ShiftSchedule {
  id: string;
  startTime: string;
  endTime: string;
  days: string[];
  recurring: boolean;
}

export interface PaymentMethod {
  id: string;
  type: 'card' | 'bank' | 'digital';
  last4: string;
  expiry?: string;
  isDefault: boolean;
}

export interface Document {
  id: string;
  type: 'license' | 'insurance' | 'registration' | 'tax_doc' | 'id';
  url: string;
  status: 'pending' | 'approved' | 'rejected';
  uploadedAt: Date;
  expiresAt?: Date;
}

export interface ZoneBoundary {
  type: 'polygon' | 'circle';
  coordinates: [number, number][];
  center?: [number, number];
  radius?: number;
}

export interface ZonePricing {
  baseFee: number;
  perMile: number;
  minimumOrder: number;
  peakSurcharge: number;
}

// UI/State Types
export interface AppState {
  user: User | null;
  theme: 'light' | 'dark';
  sidebarCollapsed: boolean;
  notifications: Notification[];
  language: 'en' | 'es' | 'fr' | 'ar';
  activeModule: string;
}

export interface Notification {
  id: string;
  type: 'info' | 'success' | 'warning' | 'error';
  title: string;
  message: string;
  timestamp: Date;
  read: boolean;
  action?: {
    label: string;
    url: string;
  };
}

export interface AIRecommendation {
  id: string;
  type: 'route_optimization' | 'driver_matching' | 'pricing' | 'capacity';
  title: string;
  description: string;
  impact: 'high' | 'medium' | 'low';
  action: {
    label: string;
    onClick: () => void;
  };
  metrics?: {
    timeSavings?: string;
    costSavings?: string;
    efficiencyGain?: string;
  };
  createdAt: Date;
  applied: boolean;
}

// Chart Data Types
export interface ChartData {
  name: string;
  value: number;
  change?: number;
  date?: string;
}

export interface HeatmapData {
  x: number;
  y: number;
  value: number;
  zone: string;
}

export interface RadarData {
  metric: string;
  value: number;
  fullMark: number;
}

// Navigation Types
export interface NavigationItem {
  id: string;
  label: string;
  icon: string;
  href: string;
  badge?: number;
  category: 'dashboard' | 'operations' | 'management' | 'analytics' | 'marketing' | 'support' | 'settings';
  requiredRole?: string[];
}

export interface NavigationCategory {
  id: string;
  label: string;
  items: NavigationItem[];
}

// Export commonly used type unions
export type UserRole = User['role'];
export type OrderStatus = Order['status'];
export type DisputeStatus = Dispute['status'];
export type Theme = AppState['theme'];
export type Language = AppState['language'];