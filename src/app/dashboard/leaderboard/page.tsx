'use client'

import React, { useState, useEffect } from 'react'
import { Trophy, Star, Medal, Award, TrendingUp, Users, Target, Zap, Crown, Gem, Flame, Calendar, Filter, Search, BarChart3, Activity, CheckCircle } from 'lucide-react'
import { DataTable, StatCard, Badge, FilterDropdown, SearchBar, ChartContainer } from '@/components/shared'
import { useRealTimeData, useNotifications } from '@/lib/hooks'
import { formatDate, formatNumber, formatCurrency } from '@/lib/utils'
import { User, Achievement } from '@/lib/types'

// Mock leaderboard data
const mockDriverLeaderboard = [
  {
    id: 'DRV-001',
    name: 'Michael Chen',
    avatar: '/avatars/michael.jpg',
    rating: 4.98,
    deliveries: 1847,
    earnings: 23450.89,
    avgDeliveryTime: 18.5,
    acceptanceRate: 98.7,
    rank: 1,
    rankChange: 0,
    badges: ['Top Performer', 'Speed Demon', 'Customer Favorite'],
    points: 2847,
    level: 15,
    streak: 23
  },
  {
    id: 'DRV-002',
    name: 'Sarah Johnson',
    avatar: '/avatars/sarah.jpg',
    rating: 4.96,
    deliveries: 1723,
    earnings: 21450.67,
    avgDeliveryTime: 19.2,
    acceptanceRate: 97.3,
    rank: 2,
    rankChange: 1,
    badges: ['Rising Star', 'Reliable Driver'],
    points: 2698,
    level: 14,
    streak: 15
  },
  {
    id: 'DRV-003',
    name: 'James Rodriguez',
    avatar: '/avatars/james.jpg',
    rating: 4.95,
    deliveries: 1654,
    earnings: 20890.45,
    avgDeliveryTime: 20.1,
    acceptanceRate: 96.8,
    rank: 3,
    rankChange: -1,
    badges: ['Consistency King', 'Weekend Warrior'],
    points: 2567,
    level: 14,
    streak: 8
  }
]

const mockVendorLeaderboard = [
  {
    id: 'VEND-001',
    businessName: 'Fresh Bakery Co',
    ownerName: 'Maria Garcia',
    rating: 4.92,
    orders: 3421,
    revenue: 89760.45,
    avgOrderTime: 12.3,
    completionRate: 99.2,
    rank: 1,
    rankChange: 0,
    badges: ['Excellence Award', 'Customer Choice'],
    points: 3456,
    level: 18,
    streak: 31
  },
  {
    id: 'VEND-002',
    businessName: 'Quick Pizza Express',
    ownerName: 'John Smith',
    rating: 4.89,
    orders: 2987,
    revenue: 76450.89,
    avgOrderTime: 15.6,
    completionRate: 98.7,
    rank: 2,
    rankChange: 2,
    badges: ['Fast Service', 'Popular Choice'],
    points: 3123,
    level: 16,
    streak: 19
  }
]

const mockAdminLeaderboard = [
  {
    id: 'ADM-001',
    name: 'Alex Thompson',
    avatar: '/avatars/alex.jpg',
    role: 'Senior Admin',
    approvals: 456,
    disputesResolved: 234,
    tasksCompleted: 789,
    efficiency: 96.8,
    rank: 1,
    rankChange: 0,
    badges: ['Master Admin', 'Problem Solver', 'Team Leader'],
    points: 4567,
    level: 20,
    streak: 45
  },
  {
    id: 'ADM-002',
    name: 'Emily Chen',
    avatar: '/avatars/emily.jpg',
    role: 'Operations Manager',
    approvals: 398,
    disputesResolved: 189,
    tasksCompleted: 672,
    efficiency: 94.5,
    rank: 2,
    rankChange: 1,
    badges: ['Efficiency Expert', 'Customer Hero'],
    points: 4234,
    level: 19,
    streak: 32
  }
]

const mockAchievements = [
  {
    id: 'ACH-001',
    name: '100 Approvals',
    description: 'Approve 100 applications',
    icon: CheckCircle,
    points: 100,
    category: 'approval',
    level: 'bronze',
    progress: 45,
    totalRequired: 100,
    unlocked: false
  },
  {
    id: 'ACH-002',
    name: 'Speed Demon',
    description: 'Process requests in record time',
    icon: Zap,
    points: 150,
    category: 'efficiency',
    level: 'silver',
    progress: 89,
    totalRequired: 100,
    unlocked: false
  },
  {
    id: 'ACH-003',
    name: 'Customer Hero',
    description: 'Resolve 50 support tickets',
    icon: Star,
    points: 200,
    category: 'support',
    level: 'gold',
    progress: 50,
    totalRequired: 50,
    unlocked: true,
    unlockedDate: new Date('2025-01-10')
  },
  {
    id: 'ACH-004',
    name: 'Master Admin',
    description: 'Complete all onboarding',
    icon: Crown,
    points: 500,
    category: 'milestone',
    level: 'platinum',
    progress: 28,
    totalRequired: 30,
    unlocked: false
  }
]

export default function PerformanceLeaderboard() {
  const [activeTab, setActiveTab] = useState<'drivers' | 'vendors' | 'admins'>('drivers')
  const [timeFilter, setTimeFilter] = useState<'daily' | 'weekly' | 'monthly'>('weekly')
  const [categoryFilter, setCategoryFilter] = useState<'all' | 'performance' | 'revenue' | 'efficiency'>('all')
  const [selectedAchievement, setSelectedAchievement] = useState<Achievement | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const { addNotification } = useNotifications()

  // Get current leaderboard data based on active tab
  const getCurrentLeaderboard = () => {
    switch (activeTab) {
      case 'drivers':
        return mockDriverLeaderboard
      case 'vendors':
        return mockVendorLeaderboard
      case 'admins':
        return mockAdminLeaderboard
      default:
        return mockDriverLeaderboard
    }
  }

  const currentLeaderboard = getCurrentLeaderboard()

  // Filter leaderboard data
  const filteredLeaderboard = currentLeaderboard.filter(item => {
    const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         (item.businessName && item.businessName.toLowerCase().includes(searchQuery.toLowerCase())) ||
                         (item.ownerName && item.ownerName.toLowerCase().includes(searchQuery.toLowerCase()))
    
    return matchesSearch
  })

  // Calculate rank icon
  const getRankIcon = (rank: number) => {
    switch (rank) {
      case 1:
        return <Trophy className="w-6 h-6 text-yellow-500" />
      case 2:
        return <Medal className="w-6 h-6 text-gray-400" />
      case 3:
        return <Award className="w-6 h-6 text-orange-600" />
      default:
        return <div className="w-8 h-8 flex items-center justify-center text-sm font-bold text-gray-600">#{rank}</div>
    }
  }

  // Calculate rank change indicator
  const getRankChangeIndicator = (change: number) => {
    if (change > 0) {
      return (
        <div className="flex items-center text-green-600 text-sm">
          <TrendingUp className="w-4 h-4 mr-1" />
          +{change}
        </div>
      )
    } else if (change < 0) {
      return (
        <div className="flex items-center text-red-600 text-sm">
          <TrendingUp className="w-4 h-4 mr-1 rotate-180" />
          {change}
        </div>
      )
    }
    return <div className="text-gray-400 text-sm">—</div>
  }

  // Get achievement level badge
  const getAchievementLevelBadge = (level: string) => {
    const levelConfig = {
      bronze: { color: 'orange', label: 'Bronze' },
      silver: { color: 'gray', label: 'Silver' },
      gold: { color: 'yellow', label: 'Gold' },
      platinum: { color: 'purple', label: 'Platinum' }
    }

    const config = levelConfig[level as keyof typeof levelConfig]
    return <Badge variant={config.color as any}>{config.label}</Badge>
  }

  // Table columns based on active tab
  const getTableColumns = () => {
    const baseColumns = [
      {
        key: 'rank',
        header: 'Rank',
        render: (_: any, record: any) => (
          <div className="flex items-center">
            {getRankIcon(record.rank)}
            <div className="ml-3">
              {getRankChangeIndicator(record.rankChange)}
            </div>
          </div>
        )
      },
      {
        key: 'name',
        header: activeTab === 'vendors' ? 'Business' : 'Name',
        render: (value: string, record: any) => (
          <div>
            <div className="font-medium text-gray-900">{value}</div>
            {activeTab === 'vendors' && record.ownerName && (
              <div className="text-sm text-gray-500">{record.ownerName}</div>
            )}
            {activeTab === 'admins' && (
              <div className="text-sm text-gray-500">{record.role}</div>
            )}
          </div>
        )
      },
      {
        key: 'rating',
        header: 'Rating',
        render: (value: number) => (
          <div className="flex items-center">
            <Star className="w-4 h-4 text-yellow-400 mr-1" />
            <span className="font-medium">{value.toFixed(2)}</span>
          </div>
        )
      }
    ]

    const tabSpecificColumns = {
      drivers: [
        {
          key: 'deliveries',
          header: 'Deliveries',
          render: (value: number) => formatNumber(value)
        },
        {
          key: 'earnings',
          header: 'Earnings',
          render: (value: number) => formatCurrency(value)
        },
        {
          key: 'avgDeliveryTime',
          header: 'Avg Time',
          render: (value: number) => `${value.toFixed(1)} min`
        }
      ],
      vendors: [
        {
          key: 'orders',
          header: 'Orders',
          render: (value: number) => formatNumber(value)
        },
        {
          key: 'revenue',
          header: 'Revenue',
          render: (value: number) => formatCurrency(value)
        },
        {
          key: 'avgOrderTime',
          header: 'Avg Time',
          render: (value: number) => `${value.toFixed(1)} min`
        }
      ],
      admins: [
        {
          key: 'approvals',
          header: 'Approvals',
          render: (value: number) => formatNumber(value)
        },
        {
          key: 'disputesResolved',
          header: 'Disputes',
          render: (value: number) => formatNumber(value)
        },
        {
          key: 'efficiency',
          header: 'Efficiency',
          render: (value: number) => `${value.toFixed(1)}%`
        }
      ]
    }

    const commonColumns = [
      {
        key: 'points',
        header: 'Points',
        render: (value: number, record: any) => (
          <div className="text-right">
            <div className="font-bold text-blue-600">{formatNumber(value)}</div>
            <div className="text-xs text-gray-500">Level {record.level}</div>
          </div>
        )
      },
      {
        key: 'badges',
        header: 'Badges',
        render: (badges: string[]) => (
          <div className="flex flex-wrap gap-1">
            {badges.slice(0, 2).map((badge, index) => (
              <Badge key={index} variant="blue" className="text-xs">
                {badge}
              </Badge>
            ))}
            {badges.length > 2 && (
              <Badge variant="gray" className="text-xs">
                +{badges.length - 2}
              </Badge>
            )}
          </div>
        )
      }
    ]

    return [...baseColumns, ...tabSpecificColumns[activeTab], ...commonColumns]
  }

  // Performance trends data
  const performanceTrendsData = [
    { date: '2025-01-10', drivers: 89.2, vendors: 92.1, admins: 94.5 },
    { date: '2025-01-11', drivers: 90.1, vendors: 91.8, admins: 95.2 },
    { date: '2025-01-12', drivers: 91.3, vendors: 93.4, admins: 94.8 },
    { date: '2025-01-13', drivers: 89.8, vendors: 92.9, admins: 95.8 },
    { date: '2025-01-14', drivers: 92.4, vendors: 94.1, admins: 96.2 },
    { date: '2025-01-15', drivers: 93.1, vendors: 93.7, admins: 96.8 },
    { date: '2025-01-16', drivers: 94.2, vendors: 95.3, admins: 97.1 },
    { date: '2025-01-17', drivers: 95.6, vendors: 95.8, admins: 97.5 }
  ]

  // Achievement progress data
  const achievementProgressData = mockAchievements.map(achievement => ({
    name: achievement.name,
    progress: (achievement.progress / achievement.totalRequired) * 100,
    points: achievement.points,
    category: achievement.category
  }))

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Performance Leaderboard</h1>
        <p className="text-gray-600">Gamified performance tracking for drivers, vendors, and admins</p>
      </div>

      {/* Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Active Participants"
          value={formatNumber(currentLeaderboard.length)}
          icon={Users}
          color="blue"
          trend={{ value: 8.2, direction: 'up' }}
        />
        <StatCard
          title="Avg Performance Score"
          value="92.3%"
          icon={BarChart3}
          color="green"
          trend={{ value: 2.7, direction: 'up' }}
        />
        <StatCard
          title="Achievements Unlocked"
          value={formatNumber(mockAchievements.filter(a => a.unlocked).length)}
          icon={Trophy}
          color="purple"
          trend={{ value: 12.5, direction: 'up' }}
        />
        <StatCard
          title="Current Competitions"
          value="3"
          icon={Target}
          color="orange"
          trend={{ value: 1, direction: 'up' }}
        />
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          {[
            { id: 'drivers', label: 'Driver Rankings', icon: Users },
            { id: 'vendors', label: 'Vendor Rankings', icon: Award },
            { id: 'admins', label: 'Admin Rankings', icon: Crown }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === tab.id
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <tab.icon className="w-4 h-4 mr-2" />
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Analytics Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Performance Trends */}
        <ChartContainer
          title="Performance Trends"
          subtitle="Average performance scores over time"
          type="line"
          data={performanceTrendsData}
          lines={[
            { key: 'drivers', name: 'Drivers', color: '#3b82f6' },
            { key: 'vendors', name: 'Vendors', color: '#10b981' },
            { key: 'admins', name: 'Admins', color: '#8b5cf6' }
          ]}
          xAxisKey="date"
          height={300}
        />

        {/* Achievement Progress */}
        <ChartContainer
          title="Achievement Progress"
          subtitle="Progress towards completing achievements"
          type="bar"
          data={achievementProgressData}
          bars={[
            { key: 'progress', name: 'Completion %', color: '#f59e0b' }
          ]}
          xAxisKey="name"
          height={300}
        />
      </div>

      {/* User Level Progress (Current User) */}
      <div className="bg-gradient-to-r from-purple-50 to-blue-50 rounded-lg p-6 border border-purple-200">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900 flex items-center">
            <Crown className="w-5 h-5 mr-2 text-purple-600" />
            Your Achievement Progress
          </h3>
          <Badge variant="purple" className="flex items-center">
            <Gem className="w-3 h-3 mr-1" />
            Level 12
          </Badge>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <div className="text-gray-600 text-sm">Current Points</div>
            <div className="text-2xl font-bold text-gray-900">2,850</div>
            <div className="text-purple-600 text-sm">95% to next level</div>
          </div>
          <div>
            <div className="text-gray-600 text-sm">Current Streak</div>
            <div className="text-2xl font-bold text-gray-900 flex items-center">
              7
              <Flame className="w-5 h-5 ml-2 text-orange-500" />
            </div>
            <div className="text-orange-600 text-sm">Keep it going!</div>
          </div>
          <div>
            <div className="text-gray-600 text-sm">Achievements</div>
            <div className="text-2xl font-bold text-gray-900">12/25</div>
            <div className="text-blue-600 text-sm">48% completed</div>
          </div>
        </div>
      </div>

      {/* Filters and Search */}
      <div className="flex flex-col sm:flex-row gap-4">
        <SearchBar
          value={searchQuery}
          onChange={setSearchQuery}
          placeholder={`Search ${activeTab} by name or business...`}
          className="flex-1"
        />
        <div className="flex gap-2">
          <FilterDropdown
            value={timeFilter}
            onChange={(value) => setTimeFilter(value as any)}
            options={[
              { value: 'daily', label: 'Daily' },
              { value: 'weekly', label: 'Weekly' },
              { value: 'monthly', label: 'Monthly' }
            ]}
          />
          <FilterDropdown
            value={categoryFilter}
            onChange={(value) => setCategoryFilter(value as any)}
            options={[
              { value: 'all', label: 'All Categories' },
              { value: 'performance', label: 'Performance' },
              { value: 'revenue', label: 'Revenue' },
              { value: 'efficiency', label: 'Efficiency' }
            ]}
          />
        </div>
      </div>

      {/* Leaderboard Table */}
      <DataTable
        columns={getTableColumns()}
        data={filteredLeaderboard}
        key="id"
        searchable={false}
        pagination={{ pageSize: 25 }}
        emptyMessage={`No ${activeTab} found`}
      />

      {/* Achievements Section */}
      <div className="bg-gray-50 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Achievement System</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {mockAchievements.map((achievement) => (
            <div
              key={achievement.id}
              className={`bg-white rounded-lg p-4 border-2 transition-all cursor-pointer hover:shadow-md ${
                achievement.unlocked ? 'border-green-200' : 'border-gray-200'
              }`}
              onClick={() => setSelectedAchievement(achievement)}
            >
              <div className="flex items-center justify-between mb-3">
                <achievement.icon className={`w-8 h-8 ${
                  achievement.unlocked ? 'text-green-600' : 'text-gray-400'
                }`} />
                {getAchievementLevelBadge(achievement.level)}
              </div>
              <h4 className="font-medium text-gray-900 mb-1">{achievement.name}</h4>
              <p className="text-sm text-gray-600 mb-3">{achievement.description}</p>
              
              {/* Progress Bar */}
              <div className="mb-2">
                <div className="flex justify-between text-xs text-gray-600 mb-1">
                  <span>Progress</span>
                  <span>{achievement.progress}/{achievement.totalRequired}</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className={`h-2 rounded-full transition-all ${
                      achievement.unlocked ? 'bg-green-500' : 'bg-blue-500'
                    }`}
                    style={{ width: `${(achievement.progress / achievement.totalRequired) * 100}%` }}
                  />
                </div>
              </div>
              
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium text-blue-600">{achievement.points} pts</span>
                {achievement.unlocked && (
                  <Badge variant="green" className="text-xs">
                    <CheckCircle className="w-3 h-3 mr-1" />
                    Unlocked
                  </Badge>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Achievement Detail Modal */}
      {selectedAchievement && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <selectedAchievement.icon className={`w-12 h-12 ${
                selectedAchievement.unlocked ? 'text-green-600' : 'text-gray-400'
              }`} />
              <button
                onClick={() => setSelectedAchievement(null)}
                className="text-gray-400 hover:text-gray-600"
              >
                ×
              </button>
            </div>
            
            <h3 className="text-lg font-semibold text-gray-900 mb-2">{selectedAchievement.name}</h3>
            <p className="text-gray-600 mb-4">{selectedAchievement.description}</p>
            
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <span className="text-gray-600 text-sm">Points Reward</span>
                <div className="font-semibold text-blue-600">{selectedAchievement.points} pts</div>
              </div>
              <div>
                <span className="text-gray-600 text-sm">Level</span>
                <div>{getAchievementLevelBadge(selectedAchievement.level)}</div>
              </div>
            </div>
            
            {/* Progress */}
            <div className="mb-4">
              <div className="flex justify-between text-sm text-gray-600 mb-2">
                <span>Progress</span>
                <span>{selectedAchievement.progress}/{selectedAchievement.totalRequired}</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-3">
                <div
                  className={`h-3 rounded-full transition-all ${
                    selectedAchievement.unlocked ? 'bg-green-500' : 'bg-blue-500'
                  }`}
                  style={{ width: `${(selectedAchievement.progress / selectedAchievement.totalRequired) * 100}%` }}
                />
              </div>
            </div>
            
            {selectedAchievement.unlocked && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-3 mb-4">
                <div className="flex items-center text-green-800">
                  <CheckCircle className="w-4 h-4 mr-2" />
                  <span className="text-sm">Unlocked on {formatDate(selectedAchievement.unlockedDate!)}</span>
                </div>
              </div>
            )}
            
            <div className="flex justify-end">
              <button
                onClick={() => setSelectedAchievement(null)}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}