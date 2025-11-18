import { 
  User, Customer, Vendor, Driver, Order, Dispute, Promotion,
  Metric, Zone, SupportTicket, Review, APIKey, Backup,
  Achievement, Level, AIRecommendation, Notification,
  OrderItem, Product, Address, VehicleInfo, Location,
  Earnings, PaymentMethod, Document, HeatmapData,
  RadarData, ChartData
} from './types';

// Helper function to generate random data
const random = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min;
const randomFloat = (min: number, max: number) => Math.random() * (max - min) + min;
const randomChoice = <T>(array: T[]): T => array[Math.floor(Math.random() * array.length)];
const randomDate = (start: Date, end: Date) => new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
const randomId = () => Math.random().toString(36).substr(2, 9);

// Mock Users
export const mockUsers: User[] = [
  {
    id: 'user_001',
    name: 'Sarah Johnson',
    email: 'sarah.johnson@needster.com',
    role: 'super_admin',
    permissions: [],
    lastLogin: new Date('2025-01-17T10:30:00Z'),
    avatar: 'https://api.dicebear.com/7.x/png?seed=sarah'
  },
  {
    id: 'user_002',
    name: 'Michael Chen',
    email: 'michael.chen@needster.com',
    role: 'manager',
    permissions: [],
    lastLogin: new Date('2025-01-17T09:15:00Z'),
    avatar: 'https://api.dicebear.com/7.x/png?seed=michael'
  },
  {
    id: 'user_003',
    name: 'Emily Rodriguez',
    email: 'emily.rodriguez@needster.com',
    role: 'support_agent',
    permissions: [],
    lastLogin: new Date('2025-01-17T08:45:00Z'),
    avatar: 'https://api.dicebear.com/7.x/png?seed=emily'
  },
  {
    id: 'user_004',
    name: 'David Thompson',
    email: 'david.thompson@needster.com',
    role: 'analyst',
    permissions: [],
    lastLogin: new Date('2025-01-17T07:20:00Z'),
    avatar: 'https://api.dicebear.com/7.x/png?seed=david'
  }
];

// Mock Customers
export const mockCustomers: Customer[] = Array.from({ length: 100 }, (_, i) => ({
  id: `customer_${String(i + 1).padStart(3, '0')}`,
  name: randomChoice([
    'John Smith', 'Maria Garcia', 'James Wilson', 'Lisa Anderson', 'Robert Martinez',
    'Jennifer Taylor', 'William Brown', 'Patricia Davis', 'Christopher Miller', 'Linda Jones'
  ]),
  email: `customer${i + 1}@email.com`,
  phone: `+1${random(100, 999)}${random(100, 999)}${random(1000, 9999)}`,
  orders: [],
  lifetimeValue: randomFloat(50, 2500),
  favoriteVendors: Array.from({ length: random(1, 5) }, () => `vendor_${random(1, 50)}`),
  addresses: Array.from({ length: random(1, 3) }, (_, addrIndex) => ({
    street: `${random(100, 9999)} ${randomChoice(['Main St', 'Oak Ave', 'Park Dr', 'Elm St', 'First Ave'])}`,
    city: randomChoice(['New York', 'Los Angeles', 'Chicago', 'Houston', 'Phoenix', 'Philadelphia']),
    state: randomChoice(['NY', 'CA', 'IL', 'TX', 'AZ', 'PA']),
    zipCode: String(random(10000, 99999)),
    country: 'US'
  })),
  paymentMethods: Array.from({ length: random(1, 3) }, (_, pmIndex) => ({
    id: `pm_${i}_${pmIndex}`,
    type: randomChoice(['card', 'bank', 'digital']),
    last4: String(random(1000, 9999)),
    expiry: pmIndex === 0 ? '12/26' : undefined,
    isDefault: pmIndex === 0
  })),
  subscriptionStatus: randomChoice(['active', 'inactive', 'cancelled', undefined])
}));

// Mock Vendors
export const mockVendors: Vendor[] = Array.from({ length: 50 }, (_, i) => ({
  id: `vendor_${String(i + 1).padStart(2, '0')}`,
  businessName: randomChoice([
    'Fresh Bakery Co', 'Quick Mart', 'Gourmet Kitchen', 'Super Pizza', 'Healthy Bowl',
    'Coffee House', 'Sushi Master', 'Burger Palace', 'Taco Fiesta', 'Asian Fusion'
  ]) + ` #${i + 1}`,
  email: `vendor${i + 1}@business.com`,
  rating: randomFloat(3.5, 5.0),
  revenue: randomFloat(1000, 10000),
  status: randomChoice(['active', 'suspended', 'pending']),
  commissionRate: randomFloat(0.05, 0.15),
  totalOrders: random(50, 500),
  products: []
}));

// Mock Drivers
export const mockDrivers: Driver[] = Array.from({ length: 75 }, (_, i) => ({
  id: `driver_${String(i + 1).padStart(3, '0')}`,
  name: randomChoice([
    'Alex Kumar', 'Sofia Martinez', 'Jamal Williams', 'Yuki Tanaka', 'Mateo Silva',
    'Emma Johnson', 'Carlos Rodriguez', 'Priya Patel', 'Ahmed Hassan', 'Olivia Brown'
  ]),
  email: `driver${i + 1}@delivery.com`,
  rating: randomFloat(3.8, 5.0),
  deliveries: random(20, 300),
  vehicleInfo: {
    type: randomChoice(['car', 'motorcycle', 'bicycle', 'scooter']),
    make: randomChoice(['Toyota', 'Honda', 'Ford', 'BMW', 'Tesla']),
    model: randomChoice(['Camry', 'Civic', 'Focus', 'X5', 'Model 3']),
    year: random(2015, 2024),
    licensePlate: `${randomChoice(['ABC', 'XYZ', 'LMN'])}${random(100, 999)}`,
    insurance: true
  },
  currentLocation: i < 347 ? {
    lat: randomFloat(40.7, 40.8),
    lng: randomFloat(-74.0, -73.9),
    address: `${random(100, 999)} ${randomChoice(['Main St', 'Oak Ave'])}, ${randomChoice(['NYC', 'Brooklyn'])}`,
    timestamp: new Date()
  } : undefined,
  status: i < 347 ? randomChoice(['online', 'busy']) : 'offline',
  earnings: {
    today: randomFloat(50, 200),
    week: randomFloat(500, 1500),
    month: randomFloat(2000, 6000),
    year: randomFloat(25000, 80000),
    lifetime: randomFloat(50000, 200000)
  },
  availability: []
}));

// Mock Products
export const mockProducts: Product[] = [
  { id: 'prod_001', name: 'Margherita Pizza', price: 12.99, description: 'Classic pizza with tomato sauce, mozzarella, and basil', category: 'Pizza', inStock: true, stockLevel: 50, images: [] },
  { id: 'prod_002', name: 'Caesar Salad', price: 8.99, description: 'Fresh romaine lettuce with caesar dressing and croutons', category: 'Salads', inStock: true, stockLevel: 30, images: [] },
  { id: 'prod_003', name: 'Beef Burger', price: 14.99, description: 'Angus beef patty with lettuce, tomato, and special sauce', category: 'Burgers', inStock: true, stockLevel: 25, images: [] },
  { id: 'prod_004', name: 'Sushi Roll Set', price: 18.99, description: 'Assorted sushi rolls with wasabi and ginger', category: 'Sushi', inStock: true, stockLevel: 15, images: [] },
  { id: 'prod_005', name: 'Chicken Pad Thai', price: 13.99, description: 'Stir-fried rice noodles with chicken and peanuts', category: 'Asian', inStock: false, stockLevel: 0, images: [] }
];

// Mock Orders
export const mockOrders: Order[] = Array.from({ length: 200 }, (_, i) => {
  const status = randomChoice(['pending', 'accepted', 'picked_up', 'delivering', 'delivered', 'cancelled']);
  const createdAt = randomDate(new Date('2025-01-15'), new Date());
  const estimatedDelivery = new Date(createdAt.getTime() + random(30, 90) * 60000);
  
  return {
    id: `order_${String(i + 1).padStart(4, '0')}`,
    customerId: `customer_${random(1, 100)}`,
    vendorId: `vendor_${random(1, 50)}`,
    driverId: status !== 'pending' ? `driver_${random(1, 75)}` : undefined,
    status,
    total: randomFloat(15, 150),
    items: Array.from({ length: random(1, 5) }, (_, itemIndex) => ({
      id: `item_${i}_${itemIndex}`,
      productId: randomChoice(['prod_001', 'prod_002', 'prod_003', 'prod_004', 'prod_005']),
      name: randomChoice(['Margherita Pizza', 'Caesar Salad', 'Beef Burger', 'Sushi Roll Set', 'Chicken Pad Thai']),
      quantity: random(1, 3),
      price: randomFloat(8.99, 18.99)
    })),
    deliveryAddress: {
      street: `${random(100, 9999)} ${randomChoice(['Main St', 'Oak Ave', 'Park Dr'])}`,
      city: randomChoice(['New York', 'Los Angeles', 'Chicago']),
      state: randomChoice(['NY', 'CA', 'IL']),
      zipCode: String(random(10000, 99999)),
      country: 'US'
    },
    createdAt,
    estimatedDelivery: status !== 'cancelled' ? estimatedDelivery : undefined,
    specialInstructions: randomChoice(['', 'Leave at door', 'Ring bell', 'Call upon arrival'])
  };
});

// Mock Disputes
export const mockDisputes: Dispute[] = [
  {
    id: 'dispute_001',
    orderId: 'order_0001',
    type: 'late_delivery',
    status: 'open',
    priority: 'high',
    description: 'Order was delivered 45 minutes late, food was cold',
    createdAt: new Date('2025-01-17T14:30:00Z')
  },
  {
    id: 'dispute_002',
    orderId: 'order_0002',
    type: 'wrong_items',
    status: 'in_progress',
    priority: 'medium',
    description: 'Received wrong items - ordered vegetarian but got meat dishes',
    createdAt: new Date('2025-01-17T12:15:00Z')
  },
  {
    id: 'dispute_003',
    orderId: 'order_0003',
    type: 'quality_issue',
    status: 'resolved',
    priority: 'low',
    description: 'Food quality was below expectations',
    createdAt: new Date('2025-01-16T18:45:00Z'),
    resolvedAt: new Date('2025-01-17T10:20:00Z')
  }
];

// Mock Support Tickets
export const mockSupportTickets: SupportTicket[] = Array.from({ length: 25 }, (_, i) => ({
  id: `ticket_${String(i + 1).padStart(3, '0')}`,
  customerId: `customer_${random(1, 100)}`,
  subject: randomChoice([
    'Order not delivered',
    'Payment declined',
    'Can\'t log in',
    'App crashing',
    'Wrong order delivered',
    'Account hacked',
    'Refund request',
    'Vendor complaint'
  ]),
  description: randomChoice([
    'My order hasn\'t arrived and it\'s been over an hour',
    'My credit card is being declined but it works elsewhere',
    'I keep getting invalid password error',
    'The app crashes every time I try to place an order',
    'I received the wrong items from my order',
    'Someone accessed my account without permission',
    'I need a refund for a cancelled order'
  ]),
  type: randomChoice(['order_issue', 'payment_problem', 'account_management', 'technical_support', 'general_inquiry']),
  priority: randomChoice(['high', 'medium', 'low']),
  status: randomChoice(['open', 'in_progress', 'resolved']),
  assignedTo: random(0, 3) === 0 ? undefined : `user_00${random(1, 4)}`,
  createdAt: randomDate(new Date('2025-01-10'), new Date()),
  resolvedAt: random(0, 2) === 0 ? new Date() : undefined,
  satisfactionRating: random(0, 2) === 0 ? randomFloat(1, 5) : undefined
}));

// Mock Reviews
export const mockReviews: Review[] = Array.from({ length: 150 }, (_, i) => ({
  id: `review_${String(i + 1).padStart(3, '0')}`,
  customerId: `customer_${random(1, 100)}`,
  targetId: randomChoice([`vendor_${random(1, 50)}`, `driver_${random(1, 75)}`]),
  targetType: randomChoice(['vendor', 'driver', 'order']),
  rating: randomFloat(1, 5),
  comment: randomChoice([
    'Excellent service! Fast delivery and great food quality.',
    'Driver was very professional and courteous.',
    'Food arrived cold and was late.',
    'Amazing experience! Will definitely order again.',
    'Average service, nothing special.',
    'Best delivery service in the city!',
    'Had some issues with the order but customer service helped.',
    'Quick delivery and hot food!',
    'Driver went above and beyond to help me.'
  ]),
  verified: random(0, 4) === 0,
  helpful: random(0, 50),
  createdAt: randomDate(new Date('2025-01-01'), new Date()),
  response: random(0, 2) === 0 ? 'Thank you for your feedback! We\'re glad you enjoyed our service.' : undefined
}));

// Mock Promotions
export const mockPromotions: Promotion[] = [
  {
    id: 'promo_001',
    code: 'SUMMER25',
    type: 'percentage',
    value: 25,
    usage: 145,
    maxUses: 500,
    expiration: new Date('2025-02-28T23:59:59Z'),
    targetAudience: 'all_users',
    minimumOrder: 20
  },
  {
    id: 'promo_002',
    code: 'FREESHIP',
    type: 'free_shipping',
    value: 5.99,
    usage: 89,
    maxUses: 200,
    expiration: new Date('2025-01-31T23:59:59Z'),
    targetAudience: 'new_users',
    minimumOrder: 15
  },
  {
    id: 'promo_003',
    code: 'NEWUSER',
    type: 'percentage',
    value: 15,
    usage: 67,
    maxUses: 300,
    expiration: new Date('2025-03-15T23:59:59Z'),
    targetAudience: 'new_users',
    minimumOrder: 25
  }
];

// Mock Metrics
export const mockMetrics: Metric[] = [
  {
    id: 'metric_001',
    name: 'Total Revenue',
    value: 135000,
    change: 22.8,
    trend: 'up',
    timestamp: new Date(),
    category: 'revenue'
  },
  {
    id: 'metric_002',
    name: 'Active Orders',
    value: 234,
    change: 12.5,
    trend: 'up',
    timestamp: new Date(),
    category: 'orders'
  },
  {
    id: 'metric_003',
    name: 'Total Users',
    value: 8590,
    change: 8.3,
    trend: 'up',
    timestamp: new Date(),
    category: 'users'
  },
  {
    id: 'metric_004',
    name: 'System Health',
    value: '99.9%',
    change: 0.1,
    trend: 'neutral',
    timestamp: new Date(),
    category: 'performance'
  },
  {
    id: 'metric_005',
    name: 'Average Order Value',
    value: 45.80,
    change: -2.1,
    trend: 'down',
    timestamp: new Date(),
    category: 'revenue'
  }
];

// Mock Zones
export const mockZones: Zone[] = [
  {
    id: 'zone_001',
    name: 'Downtown',
    boundaries: {
      type: 'polygon',
      coordinates: [[40.7589, -73.9851], [40.7489, -73.9851], [40.7489, -73.9751], [40.7589, -73.9751]]
    },
    pricing: { baseFee: 2.99, perMile: 0.50, minimumOrder: 15, peakSurcharge: 1.50 },
    driverCount: 45,
    orderDensity: 40,
    averageDeliveryTime: 18
  },
  {
    id: 'zone_002',
    name: 'North Side',
    boundaries: {
      type: 'polygon',
      coordinates: [[40.7689, -73.9751], [40.7589, -73.9751], [40.7589, -73.9651], [40.7689, -73.9651]]
    },
    pricing: { baseFee: 3.99, perMile: 0.45, minimumOrder: 20, peakSurcharge: 1.00 },
    driverCount: 32,
    orderDensity: 25,
    averageDeliveryTime: 22
  },
  {
    id: 'zone_003',
    name: 'Suburbs',
    boundaries: {
      type: 'polygon',
      coordinates: [[40.7789, -73.9951], [40.7689, -73.9951], [40.7689, -73.9851], [40.7789, -73.9851]]
    },
    pricing: { baseFee: 5.99, perMile: 0.40, minimumOrder: 25, peakSurcharge: 0.50 },
    driverCount: 28,
    orderDensity: 15,
    averageDeliveryTime: 30
  }
];

// Mock AI Recommendations
export const mockAIRecommendations: AIRecommendation[] = [
  {
    id: 'ai_001',
    type: 'route_optimization',
    title: 'Optimize Downtown Routes',
    description: 'Route A → B → C saves 15% time during peak hours',
    impact: 'high',
    action: {
      label: 'Apply Optimization',
      onClick: () => console.log('Route optimization applied')
    },
    metrics: { timeSavings: '15%', costSavings: '$120/day', efficiencyGain: '25%' },
    createdAt: new Date(),
    applied: false
  },
  {
    id: 'ai_002',
    type: 'driver_matching',
    title: 'Assign James Wilson to High-Priority Order',
    description: '98% match based on location, rating, and availability',
    impact: 'high',
    action: {
      label: 'Assign Driver',
      onClick: () => console.log('Driver assigned')
    },
    metrics: { timeSavings: '8 min', efficiencyGain: '95%' },
    createdAt: new Date(),
    applied: false
  },
  {
    id: 'ai_003',
    type: 'pricing',
    title: 'Increase Downtown Fee During Peak Hours',
    description: 'Demand indicates optimal fee is $3.49 (currently $2.99)',
    impact: 'medium',
    action: {
      label: 'Adjust Pricing',
      onClick: () => console.log('Pricing adjusted')
    },
    metrics: { costSavings: '$450/day', revenueGain: '18%' },
    createdAt: new Date(),
    applied: false
  }
];

// Mock Notifications
export const mockNotifications: Notification[] = [
  {
    id: 'notif_001',
    type: 'warning',
    title: 'High Volume Alert',
    message: 'Order volume is 40% above average for this time',
    timestamp: new Date('2025-01-17T15:30:00Z'),
    read: false,
    action: { label: 'View Orders', url: '/dashboard/orders' }
  },
  {
    id: 'notif_002',
    type: 'success',
    title: 'System Update Complete',
    message: 'Platform has been successfully updated to version 2.1.0',
    timestamp: new Date('2025-01-17T14:15:00Z'),
    read: true
  },
  {
    id: 'notif_003',
    type: 'error',
    title: 'Payment Gateway Issue',
    message: 'Stripe API experiencing intermittent issues',
    timestamp: new Date('2025-01-17T13:45:00Z'),
    read: false,
    action: { label: 'Check Status', url: '/dashboard/system-status' }
  },
  {
    id: 'notif_004',
    type: 'info',
    title: 'New Support Ticket',
    message: 'High priority ticket received from customer #1234',
    timestamp: new Date('2025-01-17T12:20:00Z'),
    read: false,
    action: { label: 'View Ticket', url: '/dashboard/support' }
  }
];

// Mock Achievements
export const mockAchievements: Achievement[] = [
  {
    id: 'achieve_001',
    name: 'First Approval',
    description: 'Approve your first application',
    icon: '🏆',
    points: 50,
    category: 'approvals',
    unlocked: true,
    unlockedAt: new Date('2025-01-10T10:30:00Z')
  },
  {
    id: 'achieve_002',
    name: 'Century of Approvals',
    description: 'Approve 100 applications',
    icon: '🏆',
    points: 100,
    category: 'approvals',
    unlocked: false
  },
  {
    id: 'achieve_003',
    name: 'Speed Demon',
    description: 'Process requests in record time',
    icon: '⚡',
    points: 150,
    category: 'speed',
    unlocked: true,
    unlockedAt: new Date('2025-01-12T15:45:00Z')
  },
  {
    id: 'achieve_004',
    name: 'Customer Hero',
    description: 'Resolve 50 support tickets',
    icon: '🎖️',
    points: 200,
    category: 'support',
    unlocked: false
  },
  {
    id: 'achieve_005',
    name: 'Master Admin',
    description: 'Complete all onboarding',
    icon: '👑',
    points: 500,
    category: 'leadership',
    unlocked: false
  }
];

// Mock Levels
export const mockLevels: Level[] = [
  { level: 1, name: 'Novice Admin', minPoints: 0, maxPoints: 100, rewards: ['Basic Dashboard'] },
  { level: 2, name: 'Rising Star', minPoints: 100, maxPoints: 300, rewards: ['Advanced Filters'] },
  { level: 3, name: 'Pro Administrator', minPoints: 300, maxPoints: 600, rewards: ['Custom Reports'] },
  { level: 4, name: 'Expert Manager', minPoints: 600, maxPoints: 1000, rewards: ['AI Insights'] },
  { level: 5, name: 'Master Operator', minPoints: 1000, maxPoints: 1500, rewards: ['Full System Access'] },
  { level: 6, name: 'Elite Director', minPoints: 1500, maxPoints: 2500, rewards: ['Strategic Analytics'] },
  { level: 7, name: 'Legend Admin', minPoints: 2500, maxPoints: 5000, rewards: ['System Configuration'] },
  { level: 8, name: 'God Mode', minPoints: 5000, maxPoints: Infinity, rewards: ['Ultimate Control'] }
];

// Chart Data for Analytics
export const mockChartData = {
  revenue: [
    { name: 'Jan', value: 125000, date: '2025-01-01' },
    { name: 'Feb', value: 132000, date: '2025-02-01' },
    { name: 'Mar', value: 145000, date: '2025-03-01' },
    { name: 'Apr', value: 138000, date: '2025-04-01' },
    { name: 'May', value: 152000, date: '2025-05-01' },
    { name: 'Jun', value: 165000, date: '2025-06-01' }
  ],
  orders: [
    { name: 'Mon', value: 245, date: '2025-01-13' },
    { name: 'Tue', value: 312, date: '2025-01-14' },
    { name: 'Wed', value: 289, date: '2025-01-15' },
    { name: 'Thu', value: 356, date: '2025-01-16' },
    { name: 'Fri', value: 423, date: '2025-01-17' },
    { name: 'Sat', value: 398, date: '2025-01-18' },
    { name: 'Sun', value: 267, date: '2025-01-19' }
  ],
  customers: [
    { name: 'New', value: 450, change: 15 },
    { name: 'Returning', value: 4050, change: 8 },
    { name: 'VIP', value: 890, change: 22 }
  ]
};

// Heatmap Data
export const mockHeatmapData: HeatmapData[] = Array.from({ length: 20 }, (_, i) => ({
  x: random(0, 10),
  y: random(0, 10),
  value: random(5, 50),
  zone: randomChoice(['Downtown', 'North Side', 'Suburbs'])
}));

// Radar Data
export const mockRadarData: RadarData[] = [
  { metric: 'Speed', value: 85, fullMark: 100 },
  { metric: 'Quality', value: 92, fullMark: 100 },
  { metric: 'Reliability', value: 88, fullMark: 100 },
  { metric: 'Cost', value: 78, fullMark: 100 },
  { metric: 'Satisfaction', value: 95, fullMark: 100 }
];

// API Keys
export const mockAPIKeys: APIKey[] = [
  {
    id: 'api_key_001',
    name: 'Mobile App Production',
    key: 'nk_live_51H7k8j9m2p3...',
    permissions: [],
    rateLimit: 100,
    usage: 45678,
    lastUsed: new Date('2025-01-17T14:30:00Z'),
    expiresAt: new Date('2025-06-17T23:59:59Z'),
    createdAt: new Date('2025-01-17T10:30:00Z')
  },
  {
    id: 'api_key_002',
    name: 'Vendor Integration',
    key: 'nk_live_49G6k7i0n3q4...',
    permissions: [],
    rateLimit: 50,
    usage: 12345,
    lastUsed: new Date('2025-01-17T12:15:00Z'),
    expiresAt: undefined,
    createdAt: new Date('2025-01-10T09:45:00Z')
  }
];

// Backups
export const mockBackups: Backup[] = [
  {
    id: 'backup_001',
    name: 'Daily Automated Backup',
    size: 2.3 * 1024 * 1024 * 1024, // 2.3GB
    status: 'completed',
    createdAt: new Date('2025-01-10T03:00:00Z'),
    completedAt: new Date('2025-01-10T03:45:00Z'),
    retentionDays: 30,
    encryptionEnabled: true
  },
  {
    id: 'backup_002',
    name: 'Weekly Full Backup',
    size: 8.7 * 1024 * 1024 * 1024, // 8.7GB
    status: 'completed',
    createdAt: new Date('2025-01-07T02:00:00Z'),
    completedAt: new Date('2025-01-07T03:20:00Z'),
    retentionDays: 90,
    encryptionEnabled: true
  },
  {
    id: 'backup_003',
    name: 'Emergency Backup',
    size: 0,
    status: 'in_progress',
    createdAt: new Date('2025-01-17T15:00:00Z'),
    retentionDays: 180,
    encryptionEnabled: true
  }
];

// Dynamic update simulation functions
export const simulateRealtimeUpdates = () => {
  // Simulate new orders
  const newOrder: Order = {
    id: `order_${Date.now()}`,
    customerId: `customer_${random(1, 100)}`,
    vendorId: `vendor_${random(1, 50)}`,
    status: 'pending',
    total: randomFloat(15, 150),
    items: [{
      id: `item_${Date.now()}`,
      productId: 'prod_001',
      name: 'Margherita Pizza',
      quantity: 1,
      price: 12.99
    }],
    deliveryAddress: {
      street: `${random(100, 9999)} Main St`,
      city: 'New York',
      state: 'NY',
      zipCode: '10001',
      country: 'US'
    },
    createdAt: new Date()
  };

  // Simulate driver location updates
  const driverLocationUpdate = {
    driverId: `driver_${random(1, 75)}`,
    location: {
      lat: randomFloat(40.7, 40.8),
      lng: randomFloat(-74.0, -73.9),
      address: `${random(100, 999)} ${randomChoice(['Main St', 'Oak Ave'])}, NYC`,
      timestamp: new Date()
    }
  };

  return {
    newOrder,
    driverLocationUpdate,
    metricsUpdate: {
      activeOrders: random(200, 300),
      onlineDrivers: random(320, 380),
      systemHealth: `${randomFloat(99.0, 99.9)}%`
    }
  };
};

// Export all mock data collections
export const mockData = {
  users: mockUsers,
  customers: mockCustomers,
  vendors: mockVendors,
  drivers: mockDrivers,
  orders: mockOrders,
  disputes: mockDisputes,
  supportTickets: mockSupportTickets,
  reviews: mockReviews,
  promotions: mockPromotions,
  metrics: mockMetrics,
  zones: mockZones,
  aiRecommendations: mockAIRecommendations,
  notifications: mockNotifications,
  achievements: mockAchievements,
  levels: mockLevels,
  chartData: mockChartData,
  heatmapData: mockHeatmapData,
  radarData: mockRadarData,
  apiKeys: mockAPIKeys,
  backups: mockBackups,
  products: mockProducts
};