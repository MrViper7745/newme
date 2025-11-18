'use client'

import React, { useState, useEffect } from 'react'
import { Tag, TrendingUp, Users, Target, Calendar, DollarSign, Clock, CheckCircle, XCircle, BarChart3, PieChart, Gift, Zap, Award, Filter, Search, Plus, Edit, Trash2, Copy, Eye, Download, Mail, Smartphone } from 'lucide-react'
import { DataTable, StatCard, Badge, Modal, FilterDropdown, SearchBar, ChartContainer } from '@/components/shared'
import { useRealTimeData, useNotifications } from '@/lib/hooks'
import { formatDate, formatCurrency, formatNumber, calculatePercentage } from '@/lib/utils'
import { Promotion, Customer } from '@/lib/types'

// Mock promotions data
const mockPromotions = [
  {
    id: 'PROMO-001',
    name: 'SUMMER25',
    type: 'percentage',
    value: 25,
    description: 'Summer sale - 25% off all orders',
    status: 'active',
    startDate: new Date('2025-01-01T00:00:00Z'),
    endDate: new Date('2025-01-31T23:59:59Z'),
    usageLimit: 500,
    usageCount: 145,
    minOrderValue: 20.00,
    maxDiscountAmount: 50.00,
    applicableProducts: [],
    excludedProducts: [],
    customerSegments: ['all'],
    geographicTargets: ['US', 'CA', 'UK'],
    firstTimeOnly: false,
    stackable: false,
    revenueGenerated: 8970.45,
    conversionRate: 12.3,
    createdAt: new Date('2025-01-01T10:00:00Z'),
    updatedAt: new Date('2025-01-17T15:30:00Z'),
    createdBy: 'ADMIN-001'
  },
  {
    id: 'PROMO-002',
    name: 'FREESHIP',
    type: 'free_shipping',
    value: 5.99,
    description: 'Free delivery on all orders',
    status: 'active',
    startDate: new Date('2025-01-10T00:00:00Z'),
    endDate: new Date('2025-02-10T23:59:59Z'),
    usageLimit: 1000,
    usageCount: 678,
    minOrderValue: 15.00,
    maxDiscountAmount: null,
    applicableProducts: [],
    excludedProducts: ['alcohol'],
    customerSegments: ['all'],
    geographicTargets: ['US', 'CA'],
    firstTimeOnly: false,
    stackable: true,
    revenueGenerated: 12450.89,
    conversionRate: 8.7,
    createdAt: new Date('2025-01-10T09:30:00Z'),
    updatedAt: new Date('2025-01-16T14:20:00Z'),
    createdBy: 'ADMIN-002'
  },
  {
    id: 'PROMO-003',
    name: 'NEWUSER15',
    type: 'percentage',
    value: 15,
    description: 'Welcome offer - 15% off first order',
    status: 'active',
    startDate: new Date('2025-01-01T00:00:00Z'),
    endDate: new Date('2025-12-31T23:59:59Z'),
    usageLimit: null,
    usageCount: 234,
    minOrderValue: 10.00,
    maxDiscountAmount: 25.00,
    applicableProducts: [],
    excludedProducts: [],
    customerSegments: ['new_users'],
    geographicTargets: ['US', 'CA', 'UK', 'AU', 'ZA'],
    firstTimeOnly: true,
    stackable: false,
    revenueGenerated: 6780.23,
    conversionRate: 34.5,
    createdAt: new Date('2025-01-01T08:00:00Z'),
    updatedAt: new Date('2025-01-15T11:45:00Z'),
    createdBy: 'ADMIN-001'
  },
  {
    id: 'PROMO-004',
    name: 'FLASH20',
    type: 'percentage',
    value: 20,
    description: 'Flash sale - 20% off for 2 hours only',
    status: 'scheduled',
    startDate: new Date('2025-01-18T18:00:00Z'),
    endDate: new Date('2025-01-18T20:00:00Z'),
    usageLimit: 100,
    usageCount: 0,
    minOrderValue: 25.00,
    maxDiscountAmount: 30.00,
    applicableProducts: [],
    excludedProducts: [],
    customerSegments: ['all'],
    geographicTargets: ['US', 'CA'],
    firstTimeOnly: false,
    stackable: false,
    revenueGenerated: 0,
    conversionRate: 0,
    createdAt: new Date('2025-01-17T16:20:00Z'),
    updatedAt: new Date('2025-01-17T16:20:00Z'),
    createdBy: 'ADMIN-003'
  }
]

// Mock customer segments
const mockCustomerSegments = [
  { id: 'all', name: 'All Customers', count: 45890 },
  { id: 'new_users', name: 'New Users', count: 3450 },
  { id: 'vip', name: 'VIP Customers', count: 1250 },
  { id: 'regular', name: 'Regular Customers', count: 28450 },
  { id: 'inactive', name: 'Inactive Customers', count: 12740 }
]

// Mock campaign analytics
const mockCampaignAnalytics = [
  {
    promotionId: 'PROMO-001',
    date: '2025-01-10',
    views: 1250,
    clicks: 340,
    conversions: 42,
    revenue: 1456.78,
    customers: 38
  },
  {
    promotionId: 'PROMO-001',
    date: '2025-01-11',
    views: 1180,
    clicks: 310,
    conversions: 38,
    revenue: 1234.56,
    customers: 35
  }
]

export default function PromotionManagement() {
  const [promotions, setPromotions] = useState<Promotion[]>(mockPromotions)
  const [selectedPromotion, setSelectedPromotion] = useState<Promotion | null>(null)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [filters, setFilters] = useState({
    status: 'all',
    type: 'all',
    segment: 'all'
  })
  const [searchQuery, setSearchQuery] = useState('')
  const [campaignData, setCampaignData] = useState({
    name: '',
    type: 'percentage',
    value: 10,
    description: '',
    startDate: '',
    endDate: '',
    usageLimit: '',
    minOrderValue: '',
    maxDiscountAmount: '',
    customerSegments: [],
    geographicTargets: [],
    firstTimeOnly: false,
    stackable: false
  })
  const { addNotification } = useNotifications()

  // Real-time updates simulation
  useEffect(() => {
    const interval = setInterval(() => {
      // Simulate promotion usage updates
      setPromotions(prev => prev.map(promotion => {
        if (promotion.status === 'active' && Math.random() > 0.7) {
          const newUsageCount = Math.min(
            promotion.usageCount + Math.floor(Math.random() * 3) + 1,
            promotion.usageLimit || Infinity
          )
          const additionalRevenue = (newUsageCount - promotion.usageCount) * (promotion.minOrderValue || 25) * (promotion.value / 100)
          
          return {
            ...promotion,
            usageCount: newUsageCount,
            revenueGenerated: promotion.revenueGenerated + additionalRevenue,
            updatedAt: new Date()
          }
        }
        return promotion
      }))
    }, 8000) // Update every 8 seconds

    return () => clearInterval(interval)
  }, [])

  // Calculate metrics
  const totalPromotions = promotions.length
  const activePromotions = promotions.filter(p => p.status === 'active').length
  const totalUsage = promotions.reduce((sum, p) => sum + p.usageCount, 0)
  const totalRevenue = promotions.reduce((sum, p) => sum + p.revenueGenerated, 0)
  const averageConversionRate = promotions.reduce((sum, p) => sum + p.conversionRate, 0) / promotions.length

  // Filter promotions
  const filteredPromotions = promotions.filter(promotion => {
    const matchesSearch = promotion.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         promotion.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         promotion.id.toLowerCase().includes(searchQuery.toLowerCase())
    
    const matchesStatus = filters.status === 'all' || promotion.status === filters.status
    const matchesType = filters.type === 'all' || promotion.type === filters.type
    const matchesSegment = filters.segment === 'all' || 
                          (filters.segment === 'new_users' && promotion.firstTimeOnly) ||
                          (filters.segment !== 'new_users' && !promotion.firstTimeOnly)

    return matchesSearch && matchesStatus && matchesType && matchesSegment
  })

  const handleCreatePromotion = () => {
    const newPromotion: Promotion = {
      id: `PROMO-${Date.now()}`,
      name: campaignData.name,
      type: campaignData.type as any,
      value: campaignData.value,
      description: campaignData.description,
      status: 'draft',
      startDate: new Date(campaignData.startDate),
      endDate: new Date(campaignData.endDate),
      usageLimit: campaignData.usageLimit ? parseInt(campaignData.usageLimit) : null,
      usageCount: 0,
      minOrderValue: campaignData.minOrderValue ? parseFloat(campaignData.minOrderValue) : null,
      maxDiscountAmount: campaignData.maxDiscountAmount ? parseFloat(campaignData.maxDiscountAmount) : null,
      applicableProducts: [],
      excludedProducts: [],
      customerSegments: campaignData.customerSegments as any[],
      geographicTargets: campaignData.geographicTargets as any[],
      firstTimeOnly: campaignData.firstTimeOnly,
      stackable: campaignData.stackable,
      revenueGenerated: 0,
      conversionRate: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
      createdBy: 'CURRENT_USER'
    }

    setPromotions(prev => [newPromotion, ...prev])
    addNotification({
      type: 'success',
      title: 'Promotion Created',
      message: `Promotion ${newPromotion.name} has been created successfully`
    })

    setShowCreateModal(false)
    resetCampaignData()
  }

  const handleUpdatePromotion = (promotionId: string, updates: Partial<Promotion>) => {
    setPromotions(prev => prev.map(promotion => 
      promotion.id === promotionId 
        ? { ...promotion, ...updates, updatedAt: new Date() }
        : promotion
    ))

    addNotification({
      type: 'success',
      title: 'Promotion Updated',
      message: `Promotion ${promotionId} has been updated successfully`
    })
  }

  const handleDeletePromotion = (promotionId: string) => {
    setPromotions(prev => prev.filter(promotion => promotion.id !== promotionId))
    addNotification({
      type: 'info',
      title: 'Promotion Deleted',
      message: `Promotion ${promotionId} has been deleted`
    })
  }

  const handleDuplicatePromotion = (promotion: Promotion) => {
    const duplicatedPromotion: Promotion = {
      ...promotion,
      id: `PROMO-${Date.now()}`,
      name: `${promotion.name} (Copy)`,
      status: 'draft',
      usageCount: 0,
      revenueGenerated: 0,
      conversionRate: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
      createdBy: 'CURRENT_USER'
    }

    setPromotions(prev => [duplicatedPromotion, ...prev])
    addNotification({
      type: 'success',
      title: 'Promotion Duplicated',
      message: `Promotion ${promotion.name} has been duplicated`
    })
  }

  const resetCampaignData = () => {
    setCampaignData({
      name: '',
      type: 'percentage',
      value: 10,
      description: '',
      startDate: '',
      endDate: '',
      usageLimit: '',
      minOrderValue: '',
      maxDiscountAmount: '',
      customerSegments: [],
      geographicTargets: [],
      firstTimeOnly: false,
      stackable: false
    })
  }

  const getPromotionTypeLabel = (type: string) => {
    const typeLabels = {
      percentage: 'Percentage',
      fixed_amount: 'Fixed Amount',
      free_shipping: 'Free Shipping'
    }
    return typeLabels[type as keyof typeof typeLabels] || type
  }

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      draft: { color: 'gray', icon: Edit, label: 'Draft' },
      active: { color: 'green', icon: CheckCircle, label: 'Active' },
      paused: { color: 'yellow', icon: Clock, label: 'Paused' },
      expired: { color: 'red', icon: XCircle, label: 'Expired' },
      scheduled: { color: 'blue', icon: Calendar, label: 'Scheduled' }
    }

    const config = statusConfig[status as keyof typeof statusConfig]
    return (
      <Badge variant={config.color as any}>
        <config.icon className="w-3 h-3 mr-1" />
        {config.label}
      </Badge>
    )
  }

  // Performance trends data
  const performanceTrendsData = [
    { date: '2025-01-10', revenue: 4560.78, usage: 234, conversions: 28 },
    { date: '2025-01-11', revenue: 5234.56, usage: 267, conversions: 34 },
    { date: '2025-01-12', revenue: 4890.23, usage: 245, conversions: 31 },
    { date: '2025-01-13', revenue: 6123.89, usage: 312, conversions: 41 },
    { date: '2025-01-14', revenue: 5678.45, usage: 289, conversions: 37 },
    { date: '2025-01-15', revenue: 7234.12, usage: 367, conversions: 48 },
    { date: '2025-01-16', revenue: 6890.34, usage: 345, conversions: 44 },
    { date: '2025-01-17', revenue: 8456.78, usage: 423, conversions: 56 }
  ]

  // Promotion type distribution
  const typeDistributionData = [
    { type: 'Percentage Discounts', count: 45, percentage: 56.3 },
    { type: 'Fixed Amount', count: 22, percentage: 27.5 },
    { type: 'Free Shipping', count: 13, percentage: 16.2 }
  ]

  // Customer segment performance
  const segmentPerformanceData = [
    { segment: 'New Users', usage: 1234, conversion: 34.5, revenue: 15670.45 },
    { segment: 'VIP Customers', usage: 892, conversion: 28.7, revenue: 22340.89 },
    { segment: 'Regular', usage: 2341, conversion: 18.2, revenue: 44560.23 },
    { segment: 'Inactive', usage: 567, conversion: 8.9, revenue: 8923.45 }
  ]

  // Table columns
  const columns = [
    {
      key: 'name',
      header: 'Campaign',
      render: (value: string, record: Promotion) => (
        <div>
          <div className="font-medium text-gray-900">{value}</div>
          <div className="text-sm text-gray-500 max-w-xs truncate">{record.description}</div>
        </div>
      )
    },
    {
      key: 'type',
      header: 'Type',
      render: (value: string, record: Promotion) => (
        <div>
          <div className="font-medium">{getPromotionTypeLabel(value)}</div>
          <div className="text-sm text-gray-500">
            {value === 'percentage' ? `${record.value}% off` :
             value === 'fixed_amount' ? formatCurrency(record.value) :
             'Free Delivery'}
          </div>
        </div>
      )
    },
    {
      key: 'status',
      header: 'Status',
      render: (value: string) => getStatusBadge(value)
    },
    {
      key: 'usage',
      header: 'Usage',
      render: (_: any, record: Promotion) => (
        <div>
          <div className="font-medium">{formatNumber(record.usageCount)}</div>
          {record.usageLimit && (
            <div className="text-sm text-gray-500">
              of {formatNumber(record.usageLimit)} ({Math.round((record.usageCount / record.usageLimit) * 100)}%)
            </div>
          )}
        </div>
      )
    },
    {
      key: 'revenueGenerated',
      header: 'Revenue',
      render: (value: number) => formatCurrency(value)
    },
    {
      key: 'conversionRate',
      header: 'Conversion',
      render: (value: number) => `${value.toFixed(1)}%`
    },
    {
      key: 'endDate',
      header: 'Ends',
      render: (value: Date, record: Promotion) => {
        const isExpired = new Date() > value && record.status === 'active'
        return (
          <div className={`text-sm ${isExpired ? 'text-red-600 font-medium' : 'text-gray-600'}`}>
            {formatDate(value, 'short')}
          </div>
        )
      }
    },
    {
      key: 'actions',
      header: 'Actions',
      render: (_: any, record: Promotion) => (
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setSelectedPromotion(record)}
            className="p-1 text-blue-600 hover:bg-blue-50 rounded"
            title="View Details"
          >
            <Eye className="w-4 h-4" />
          </button>
          <button
            onClick={() => {
              setSelectedPromotion(record)
              setShowEditModal(true)
            }}
            className="p-1 text-gray-600 hover:bg-gray-50 rounded"
            title="Edit"
          >
            <Edit className="w-4 h-4" />
          </button>
          <button
            onClick={() => handleDuplicatePromotion(record)}
            className="p-1 text-purple-600 hover:bg-purple-50 rounded"
            title="Duplicate"
          >
            <Copy className="w-4 h-4" />
          </button>
          <button
            onClick={() => handleDeletePromotion(record.id)}
            className="p-1 text-red-600 hover:bg-red-50 rounded"
            title="Delete"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      )
    }
  ]

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Promotion & Discount Management</h1>
          <p className="text-gray-600">Drive sales with intelligent promotional campaigns</p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center"
        >
          <Plus className="w-4 h-4 mr-2" />
          Create Campaign
        </button>
      </div>

      {/* Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Active Campaigns"
          value={formatNumber(activePromotions)}
          icon={Target}
          color="green"
          trend={{ value: calculatePercentage(activePromotions, totalPromotions), direction: 'up' }}
        />
        <StatCard
          title="Total Usage"
          value={formatNumber(totalUsage)}
          icon={Tag}
          color="blue"
          trend={{ value: 15.3, direction: 'up' }}
        />
        <StatCard
          title="Revenue Generated"
          value={formatCurrency(totalRevenue)}
          icon={DollarSign}
          color="purple"
          trend={{ value: 23.7, direction: 'up' }}
        />
        <StatCard
          title="Avg Conversion Rate"
          value={`${averageConversionRate.toFixed(1)}%`}
          icon={TrendingUp}
          color="orange"
          trend={{ value: 2.1, direction: 'up' }}
        />
      </div>

      {/* Analytics Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Performance Trends */}
        <ChartContainer
          title="Performance Trends"
          subtitle="Revenue and usage over time"
          type="line"
          data={performanceTrendsData}
          lines={[
            { key: 'revenue', name: 'Revenue ($)', color: '#10b981' },
            { key: 'conversions', name: 'Conversions', color: '#3b82f6' }
          ]}
          xAxisKey="date"
          height={300}
        />

        {/* Promotion Types */}
        <ChartContainer
          title="Campaign Types"
          subtitle="Distribution by promotion type"
          type="pie"
          data={typeDistributionData}
          colors={['#3b82f6', '#f59e0b', '#10b981']}
          height={300}
        />

        {/* Segment Performance */}
        <ChartContainer
          title="Segment Performance"
          subtitle="Conversion rates by customer segment"
          type="bar"
          data={segmentPerformanceData}
          bars={[
            { key: 'conversion', name: 'Conversion %', color: '#8b5cf6' }
          ]}
          xAxisKey="segment"
          height={300}
        />
      </div>

      {/* Top Performing Campaigns */}
      <div className="bg-gradient-to-r from-green-50 to-blue-50 rounded-lg p-6 border border-green-200">
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
          <Award className="w-5 h-5 mr-2 text-green-600" />
          Top Performing Campaigns
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {promotions
            .filter(p => p.status === 'active')
            .sort((a, b) => b.revenueGenerated - a.revenueGenerated)
            .slice(0, 3)
            .map((promotion, index) => (
              <div key={promotion.id} className="bg-white rounded-lg p-4 border border-gray-200">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-lg font-bold text-gray-900">#{index + 1}</span>
                  <Badge variant={index === 0 ? 'yellow' : index === 1 ? 'gray' : 'orange'}>
                    {index === 0 ? 'Gold' : index === 1 ? 'Silver' : 'Bronze'}
                  </Badge>
                </div>
                <div className="font-medium text-gray-900 mb-1">{promotion.name}</div>
                <div className="text-sm text-gray-600 mb-2">{getPromotionTypeLabel(promotion.type)}</div>
                <div className="flex justify-between text-sm">
                  <span>Usage:</span>
                  <span className="font-medium">{formatNumber(promotion.usageCount)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Revenue:</span>
                  <span className="font-medium text-green-600">{formatCurrency(promotion.revenueGenerated)}</span>
                </div>
              </div>
            ))}
        </div>
      </div>

      {/* Filters and Search */}
      <div className="flex flex-col sm:flex-row gap-4">
        <SearchBar
          value={searchQuery}
          onChange={setSearchQuery}
          placeholder="Search campaigns by name or description..."
          className="flex-1"
        />
        <div className="flex gap-2">
          <FilterDropdown
            value={filters.status}
            onChange={(value) => setFilters(prev => ({ ...prev, status: value }))}
            options={[
              { value: 'all', label: 'All Status' },
              { value: 'active', label: 'Active' },
              { value: 'draft', label: 'Draft' },
              { value: 'paused', label: 'Paused' },
              { value: 'expired', label: 'Expired' },
              { value: 'scheduled', label: 'Scheduled' }
            ]}
          />
          <FilterDropdown
            value={filters.type}
            onChange={(value) => setFilters(prev => ({ ...prev, type: value }))}
            options={[
              { value: 'all', label: 'All Types' },
              { value: 'percentage', label: 'Percentage' },
              { value: 'fixed_amount', label: 'Fixed Amount' },
              { value: 'free_shipping', label: 'Free Shipping' }
            ]}
          />
          <FilterDropdown
            value={filters.segment}
            onChange={(value) => setFilters(prev => ({ ...prev, segment: value }))}
            options={[
              { value: 'all', label: 'All Segments' },
              { value: 'new_users', label: 'New Users Only' },
              { value: 'existing', label: 'Existing Customers' }
            ]}
          />
        </div>
      </div>

      {/* Campaigns Table */}
      <DataTable
        columns={columns}
        data={filteredPromotions}
        key="id"
        searchable={false}
        pagination={{ pageSize: 25 }}
        emptyMessage="No campaigns found"
      />

      {/* Create Campaign Modal */}
      {showCreateModal && (
        <Modal
          isOpen={showCreateModal}
          onClose={() => {
            setShowCreateModal(false)
            resetCampaignData()
          }}
          title="Create New Campaign"
          size="lg"
        >
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Campaign Name</label>
                <input
                  type="text"
                  value={campaignData.name}
                  onChange={(e) => setCampaignData(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="e.g., SUMMER25"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Promotion Type</label>
                <select
                  value={campaignData.type}
                  onChange={(e) => setCampaignData(prev => ({ ...prev, type: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="percentage">Percentage Discount</option>
                  <option value="fixed_amount">Fixed Amount</option>
                  <option value="free_shipping">Free Shipping</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
              <textarea
                value={campaignData.description}
                onChange={(e) => setCampaignData(prev => ({ ...prev, description: e.target.value }))}
                rows={3}
                placeholder="Describe your promotion..."
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {campaignData.type === 'percentage' ? 'Discount Percentage' : 
                   campaignData.type === 'fixed_amount' ? 'Discount Amount' :
                   'Shipping Discount'}
                </label>
                <div className="relative">
                  {campaignData.type === 'fixed_amount' && (
                    <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                  )}
                  {campaignData.type === 'percentage' && (
                    <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400">%</span>
                  )}
                  <input
                    type="number"
                    value={campaignData.value}
                    onChange={(e) => setCampaignData(prev => ({ ...prev, value: parseFloat(e.target.value) || 0 }))}
                    placeholder="0"
                    className={`w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                      campaignData.type !== 'free_shipping' ? (campaignData.type === 'fixed_amount' ? 'pl-10' : 'pl-10') : ''
                    }`}
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Usage Limit</label>
                <input
                  type="number"
                  value={campaignData.usageLimit}
                  onChange={(e) => setCampaignData(prev => ({ ...prev, usageLimit: e.target.value }))}
                  placeholder="Unlimited"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Start Date</label>
                <input
                  type="datetime-local"
                  value={campaignData.startDate}
                  onChange={(e) => setCampaignData(prev => ({ ...prev, startDate: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">End Date</label>
                <input
                  type="datetime-local"
                  value={campaignData.endDate}
                  onChange={(e) => setCampaignData(prev => ({ ...prev, endDate: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Min Order Value</label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="number"
                    value={campaignData.minOrderValue}
                    onChange={(e) => setCampaignData(prev => ({ ...prev, minOrderValue: e.target.value }))}
                    placeholder="0.00"
                    className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Max Discount Amount</label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="number"
                    value={campaignData.maxDiscountAmount}
                    onChange={(e) => setCampaignData(prev => ({ ...prev, maxDiscountAmount: e.target.value }))}
                    placeholder="No limit"
                    className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={campaignData.firstTimeOnly}
                  onChange={(e) => setCampaignData(prev => ({ ...prev, firstTimeOnly: e.target.checked }))}
                  className="mr-2"
                />
                <span className="text-sm text-gray-700">First-time customers only</span>
              </label>
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={campaignData.stackable}
                  onChange={(e) => setCampaignData(prev => ({ ...prev, stackable: e.target.checked }))}
                  className="mr-2"
                />
                <span className="text-sm text-gray-700">Can be combined with other offers</span>
              </label>
            </div>

            <div className="flex justify-end space-x-3">
              <button
                onClick={() => {
                  setShowCreateModal(false)
                  resetCampaignData()
                }}
                className="px-4 py-2 text-gray-700 bg-gray-50 border border-gray-200 rounded-lg hover:bg-gray-100"
              >
                Cancel
              </button>
              <button
                onClick={handleCreatePromotion}
                disabled={!campaignData.name || !campaignData.description}
                className="px-4 py-2 text-green-700 bg-green-50 border border-green-200 rounded-lg hover:bg-green-100 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Create Campaign
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Campaign Detail Modal */}
      {selectedPromotion && (
        <Modal
          isOpen={!!selectedPromotion}
          onClose={() => setSelectedPromotion(null)}
          title={`Campaign Details - ${selectedPromotion.name}`}
          size="lg"
        >
          <div className="space-y-6">
            {/* Basic Information */}
            <div>
              <h4 className="font-semibold text-gray-900 mb-3">Campaign Information</h4>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-gray-600">Campaign ID:</span>
                  <div className="font-medium">{selectedPromotion.id}</div>
                </div>
                <div>
                  <span className="text-gray-600">Status:</span>
                  <div>{getStatusBadge(selectedPromotion.status)}</div>
                </div>
                <div>
                  <span className="text-gray-600">Type:</span>
                  <div className="font-medium">{getPromotionTypeLabel(selectedPromotion.type)}</div>
                </div>
                <div>
                  <span className="text-gray-600">Value:</span>
                  <div className="font-medium">
                    {selectedPromotion.type === 'percentage' ? `${selectedPromotion.value}%` :
                     selectedPromotion.type === 'fixed_amount' ? formatCurrency(selectedPromotion.value) :
                     'Free Delivery'}
                  </div>
                </div>
              </div>
            </div>

            {/* Performance Metrics */}
            <div>
              <h4 className="font-semibold text-gray-900 mb-3">Performance Metrics</h4>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-gray-600">Usage Count:</span>
                  <div className="font-medium">{formatNumber(selectedPromotion.usageCount)}</div>
                  {selectedPromotion.usageLimit && (
                    <div className="text-xs text-gray-500">
                      of {formatNumber(selectedPromotion.usageLimit)} ({Math.round((selectedPromotion.usageCount / selectedPromotion.usageLimit) * 100)}%)
                    </div>
                  )}
                </div>
                <div>
                  <span className="text-gray-600">Revenue Generated:</span>
                  <div className="font-medium text-green-600">{formatCurrency(selectedPromotion.revenueGenerated)}</div>
                </div>
                <div>
                  <span className="text-gray-600">Conversion Rate:</span>
                  <div className="font-medium">{selectedPromotion.conversionRate.toFixed(1)}%</div>
                </div>
                <div>
                  <span className="text-gray-600">Period:</span>
                  <div className="font-medium">
                    {formatDate(selectedPromotion.startDate)} - {formatDate(selectedPromotion.endDate)}
                  </div>
                </div>
              </div>
            </div>

            {/* Customer Targeting */}
            <div>
              <h4 className="font-semibold text-gray-900 mb-3">Customer Targeting</h4>
              <div className="space-y-2 text-sm">
                <div>
                  <span className="text-gray-600">Customer Segments:</span>
                  <div className="font-medium">
                    {selectedPromotion.firstTimeOnly ? 'New customers only' : 'All customers'}
                  </div>
                </div>
                <div>
                  <span className="text-gray-600">Geographic Targets:</span>
                  <div className="font-medium">
                    {selectedPromotion.geographicTargets.length > 0 
                      ? selectedPromotion.geographicTargets.join(', ')
                      : 'All regions'
                    }
                  </div>
                </div>
                <div>
                  <span className="text-gray-600">Stackable:</span>
                  <div className="font-medium">{selectedPromotion.stackable ? 'Yes' : 'No'}</div>
                </div>
              </div>
            </div>

            <div className="flex justify-end">
              <button
                onClick={() => setSelectedPromotion(null)}
                className="px-4 py-2 text-gray-700 bg-gray-50 border border-gray-200 rounded-lg hover:bg-gray-100"
              >
                Close
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}