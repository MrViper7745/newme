'use client'

import React, { useState, useEffect } from 'react'
import { MessageCircle, AlertTriangle, Clock, CheckCircle, XCircle, DollarSign, Package, Calendar, Filter, Search, BarChart3, TrendingUp, TrendingDown, Eye, Mail, Phone, CreditCard, RefreshCw, Download, Star, Users } from 'lucide-react'
import { DataTable, StatCard, Badge, Modal, FilterDropdown, SearchBar, ChartContainer } from '@/components/shared'
import { useRealTimeData, useNotifications } from '@/lib/hooks'
import { formatDate, formatCurrency, formatNumber, calculatePercentage } from '@/lib/utils'
import { Dispute, User, Order } from '@/lib/types'

// Mock dispute data
const mockDisputes: Dispute[] = [
  {
    id: 'DSP-001',
    orderId: 'ORD-12345',
    customerId: 'CUST-001',
    vendorId: 'VEND-001',
    driverId: 'DRV-001',
    type: 'wrong_items',
    status: 'open',
    priority: 'high',
    subject: 'Wrong items delivered',
    description: 'Customer ordered chicken sandwich but received beef burger instead. Customer has chicken allergy.',
    orderValue: 45.89,
    requestedResolution: 'full_refund',
    assignedAgentId: 'AGT-001',
    createdAt: new Date('2025-01-17T14:30:00Z'),
    updatedAt: new Date('2025-01-17T16:45:00Z'),
    resolutionDeadline: new Date('2025-01-18T14:30:00Z'),
    customerSatisfaction: null,
    tags: ['allergy', 'urgent', 'food_safety']
  },
  {
    id: 'DSP-002',
    orderId: 'ORD-12346',
    customerId: 'CUST-002',
    vendorId: 'VEND-002',
    driverId: 'DRV-002',
    type: 'late_delivery',
    status: 'in_progress',
    priority: 'medium',
    subject: 'Delivery arrived 45 minutes late',
    description: 'Food was cold due to significant delay. Estimated time was 30 minutes, actual time was 75 minutes.',
    orderValue: 32.50,
    requestedResolution: 'partial_refund',
    assignedAgentId: 'AGT-002',
    createdAt: new Date('2025-01-16T11:20:00Z'),
    updatedAt: new Date('2025-01-17T09:15:00Z'),
    resolutionDeadline: new Date('2025-01-17T11:20:00Z'),
    customerSatisfaction: null,
    resolution: {
      type: 'partial_refund',
      amount: 15.00,
      reason: 'Compensation for late delivery',
      processedAt: new Date('2025-01-17T09:15:00Z'),
      processedBy: 'AGT-002'
    },
    tags: ['delay', 'cold_food']
  },
  {
    id: 'DSP-003',
    orderId: 'ORD-12347',
    customerId: 'CUST-003',
    vendorId: 'VEND-003',
    driverId: 'DRV-003',
    type: 'missing_items',
    status: 'resolved',
    priority: 'low',
    subject: 'Missing side orders',
    description: 'Ordered 2 side dishes but only received main course. Missing fries and coleslaw.',
    orderValue: 28.75,
    requestedResolution: 'store_credit',
    assignedAgentId: 'AGT-003',
    createdAt: new Date('2025-01-15T18:45:00Z'),
    updatedAt: new Date('2025-01-16T10:30:00Z'),
    resolvedAt: new Date('2025-01-16T10:30:00Z'),
    customerSatisfaction: 4,
    resolution: {
      type: 'store_credit',
      amount: 12.50,
      reason: 'Missing items compensation',
      processedAt: new Date('2025-01-16T10:30:00Z'),
      processedBy: 'AGT-003'
    },
    tags: ['missing_items', 'partial_order']
  }
]

// Mock resolution templates
const resolutionTemplates = [
  {
    id: 'TPL-001',
    name: 'Wrong Items - Full Refund',
    disputeType: 'wrong_items',
    resolutionType: 'full_refund',
    template: 'We sincerely apologize for receiving the wrong items. A full refund of {amount} has been processed to your original payment method. This should reflect in your account within 3-5 business days.'
  },
  {
    id: 'TPL-002',
    name: 'Late Delivery - Partial Refund',
    disputeType: 'late_delivery',
    resolutionType: 'partial_refund',
    template: 'We apologize for the delay in your delivery. As compensation, we have issued a partial refund of {amount} for the inconvenience caused.'
  },
  {
    id: 'TPL-003',
    name: 'Missing Items - Store Credit',
    disputeType: 'missing_items',
    resolutionType: 'store_credit',
    template: 'We apologize for the missing items from your order. We have added {amount} in store credit to your account for immediate use on your next order.'
  }
]

// Mock agent performance data
const mockAgentPerformance = [
  {
    agentId: 'AGT-001',
    agentName: 'Sarah Johnson',
    activeDisputes: 8,
    resolvedToday: 12,
    averageResolutionTime: 2.3, // hours
    customerSatisfactionScore: 4.7,
    escalationRate: 5.2 // percentage
  },
  {
    agentId: 'AGT-002',
    agentName: 'Mike Chen',
    activeDisputes: 6,
    resolvedToday: 15,
    averageResolutionTime: 1.8,
    customerSatisfactionScore: 4.8,
    escalationRate: 3.1
  }
]

export default function DisputeManagement() {
  const [disputes, setDisputes] = useState<Dispute[]>(mockDisputes)
  const [selectedDispute, setSelectedDispute] = useState<Dispute | null>(null)
  const [showResolutionModal, setShowResolutionModal] = useState(false)
  const [filters, setFilters] = useState({
    status: 'all',
    priority: 'all',
    type: 'all',
    agent: 'all'
  })
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedTemplate, setSelectedTemplate] = useState<any>(null)
  const [resolutionAmount, setResolutionAmount] = useState('')
  const [resolutionReason, setResolutionReason] = useState('')
  const { addNotification } = useNotifications()

  // Real-time updates simulation
  useEffect(() => {
    const interval = setInterval(() => {
      // Simulate new disputes arriving
      const disputeTypes = ['wrong_items', 'late_delivery', 'missing_items', 'quality_concerns', 'payment_issues']
      const priorities = ['low', 'medium', 'high']
      const resolutions = ['full_refund', 'partial_refund', 'store_credit', 'redelivery']
      
      const newDispute: Dispute = {
        id: `DSP-${Date.now()}`,
        orderId: `ORD-${Math.floor(Math.random() * 99999)}`,
        customerId: `CUST-${Math.floor(Math.random() * 9999)}`,
        vendorId: `VEND-${Math.floor(Math.random() * 999)}`,
        driverId: `DRV-${Math.floor(Math.random() * 999)}`,
        type: disputeTypes[Math.floor(Math.random() * disputeTypes.length)] as any,
        status: 'open',
        priority: priorities[Math.floor(Math.random() * 3)] as any,
        subject: `New dispute ${Date.now()}`,
        description: 'Auto-generated dispute for testing',
        orderValue: Math.random() * 100 + 10,
        requestedResolution: resolutions[Math.floor(Math.random() * resolutions.length)] as any,
        assignedAgentId: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        resolutionDeadline: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
        customerSatisfaction: null,
        tags: ['auto_generated']
      }

      setDisputes(prev => [newDispute, ...prev.slice(0, 99)])
    }, 30000) // New dispute every 30 seconds

    return () => clearInterval(interval)
  }, [])

  // Calculate metrics
  const totalDisputes = disputes.length
  const openDisputes = disputes.filter(d => d.status === 'open').length
  const inProgressDisputes = disputes.filter(d => d.status === 'in_progress').length
  const resolvedDisputes = disputes.filter(d => d.status === 'resolved').length
  const averageResolutionTime = 2.4 // hours
  const customerSatisfactionScore = 4.6

  // Filter disputes
  const filteredDisputes = disputes.filter(dispute => {
    const matchesSearch = dispute.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         dispute.orderId.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         dispute.subject.toLowerCase().includes(searchQuery.toLowerCase())
    
    const matchesStatus = filters.status === 'all' || dispute.status === filters.status
    const matchesPriority = filters.priority === 'all' || dispute.priority === filters.priority
    const matchesType = filters.type === 'all' || dispute.type === filters.type
    const matchesAgent = filters.agent === 'all' || dispute.assignedAgentId === filters.agent

    return matchesSearch && matchesStatus && matchesPriority && matchesType && matchesAgent
  })

  const handleResolveDispute = (disputeId: string) => {
    const resolution = {
      type: selectedTemplate.resolutionType,
      amount: parseFloat(resolutionAmount),
      reason: resolutionReason,
      processedAt: new Date(),
      processedBy: 'CURRENT_USER'
    }

    setDisputes(prev => prev.map(dispute => 
      dispute.id === disputeId 
        ? { 
            ...dispute, 
            status: 'resolved', 
            resolution,
            resolvedAt: new Date(),
            updatedAt: new Date()
          }
        : dispute
    ))

    addNotification({
      type: 'success',
      title: 'Dispute Resolved',
      message: `Dispute ${disputeId} has been resolved successfully`
    })

    setShowResolutionModal(false)
    setSelectedDispute(null)
    setSelectedTemplate(null)
    setResolutionAmount('')
    setResolutionReason('')
  }

  const handleAssignToAgent = (disputeId: string, agentId: string) => {
    setDisputes(prev => prev.map(dispute => 
      dispute.id === disputeId 
        ? { ...dispute, assignedAgentId: agentId, updatedAt: new Date() }
        : dispute
    ))

    addNotification({
      type: 'info',
      title: 'Dispute Assigned',
      message: `Dispute ${disputeId} assigned to agent ${agentId}`
    })
  }

  const getDisputeTypeLabel = (type: string) => {
    const typeLabels = {
      wrong_items: 'Wrong Items',
      late_delivery: 'Late Delivery',
      missing_items: 'Missing Items',
      quality_concerns: 'Quality Concerns',
      payment_issues: 'Payment Issues'
    }
    return typeLabels[type as keyof typeof typeLabels] || type
  }

  const getResolutionTypeLabel = (type: string) => {
    const resolutionLabels = {
      full_refund: 'Full Refund',
      partial_refund: 'Partial Refund',
      store_credit: 'Store Credit',
      redelivery: 'Re-delivery'
    }
    return resolutionLabels[type as keyof typeof resolutionLabels] || type
  }

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      open: { color: 'red', icon: AlertTriangle, label: 'Open' },
      in_progress: { color: 'yellow', icon: Clock, label: 'In Progress' },
      resolved: { color: 'green', icon: CheckCircle, label: 'Resolved' },
      closed: { color: 'gray', icon: XCircle, label: 'Closed' }
    }

    const config = statusConfig[status as keyof typeof statusConfig]
    return (
      <Badge variant={config.color as any}>
        <config.icon className="w-3 h-3 mr-1" />
        {config.label}
      </Badge>
    )
  }

  const getPriorityBadge = (priority: string) => {
    const priorityConfig = {
      low: { color: 'gray', label: 'Low' },
      medium: { color: 'yellow', label: 'Medium' },
      high: { color: 'red', label: 'High' }
    }

    const config = priorityConfig[priority as keyof typeof priorityConfig]
    return <Badge variant={config.color as any}>{config.label}</Badge>
  }

  // Dispute trends data
  const disputeTrendsData = [
    { date: '2025-01-10', open: 12, resolved: 8, escalated: 2 },
    { date: '2025-01-11', open: 15, resolved: 10, escalated: 3 },
    { date: '2025-01-12', open: 18, resolved: 14, escalated: 1 },
    { date: '2025-01-13', open: 14, resolved: 16, escalated: 2 },
    { date: '2025-01-14', open: 20, resolved: 18, escalated: 3 },
    { date: '2025-01-15', open: 16, resolved: 22, escalated: 1 },
    { date: '2025-01-16', open: 22, resolved: 19, escalated: 4 },
    { date: '2025-01-17', open: 25, resolved: 21, escalated: 2 }
  ]

  // Dispute type distribution
  const disputeTypeData = [
    { type: 'Wrong Items', count: 34, percentage: 28.3 },
    { type: 'Late Delivery', count: 29, percentage: 24.2 },
    { type: 'Missing Items', count: 25, percentage: 20.8 },
    { type: 'Quality Concerns', count: 18, percentage: 15.0 },
    { type: 'Payment Issues', count: 14, percentage: 11.7 }
  ]

  // Resolution time data
  const resolutionTimeData = [
    { agent: 'Sarah Johnson', avgTime: 2.3, disputesResolved: 145 },
    { agent: 'Mike Chen', avgTime: 1.8, disputesResolved: 178 },
    { agent: 'Emily Davis', avgTime: 3.1, disputesResolved: 124 },
    { agent: 'James Wilson', avgTime: 2.7, disputesResolved: 156 }
  ]

  // Table columns
  const columns = [
    {
      key: 'id',
      header: 'Dispute ID',
      render: (value: string) => (
        <span className="font-mono text-sm">{value}</span>
      )
    },
    {
      key: 'orderId',
      header: 'Order ID',
      render: (value: string) => (
        <span className="font-mono text-sm text-blue-600">{value}</span>
      )
    },
    {
      key: 'subject',
      header: 'Subject',
      render: (value: string, record: Dispute) => (
        <div>
          <div className="font-medium text-gray-900 max-w-xs truncate">{value}</div>
          <div className="text-sm text-gray-500">{getDisputeTypeLabel(record.type)}</div>
        </div>
      )
    },
    {
      key: 'orderValue',
      header: 'Order Value',
      render: (value: number) => formatCurrency(value)
    },
    {
      key: 'priority',
      header: 'Priority',
      render: (value: string) => getPriorityBadge(value)
    },
    {
      key: 'status',
      header: 'Status',
      render: (value: string) => getStatusBadge(value)
    },
    {
      key: 'createdAt',
      header: 'Created',
      render: (value: Date) => formatDate(value, 'short')
    },
    {
      key: 'resolutionDeadline',
      header: 'SLA Deadline',
      render: (value: Date, record: Dispute) => {
        const isOverdue = new Date() > value && record.status !== 'resolved'
        return (
          <div className={`text-sm ${isOverdue ? 'text-red-600 font-medium' : 'text-gray-600'}`}>
            {formatDate(value, 'short')}
          </div>
        )
      }
    },
    {
      key: 'actions',
      header: 'Actions',
      render: (_: any, record: Dispute) => (
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setSelectedDispute(record)}
            className="p-1 text-blue-600 hover:bg-blue-50 rounded"
            title="View Details"
          >
            <Eye className="w-4 h-4" />
          </button>
          {record.status === 'open' && (
            <button
              onClick={() => {
                setSelectedDispute(record)
                setShowResolutionModal(true)
              }}
              className="p-1 text-green-600 hover:bg-green-50 rounded"
              title="Resolve Dispute"
            >
              <CheckCircle className="w-4 h-4" />
            </button>
          )}
          {record.assignedAgentId && (
            <button
              className="p-1 text-gray-600 hover:bg-gray-50 rounded"
              title="Contact Agent"
            >
              <MessageCircle className="w-4 h-4" />
            </button>
          )}
        </div>
      )
    }
  ]

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dispute & Refund Management</h1>
        <p className="text-gray-600">Comprehensive dispute resolution system with automated workflows</p>
      </div>

      {/* Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Open Disputes"
          value={formatNumber(openDisputes)}
          icon={AlertTriangle}
          color="red"
          trend={{ value: calculatePercentage(openDisputes, totalDisputes), direction: 'up' }}
        />
        <StatCard
          title="In Progress"
          value={formatNumber(inProgressDisputes)}
          icon={Clock}
          color="yellow"
          trend={{ value: calculatePercentage(inProgressDisputes, totalDisputes), direction: 'down' }}
        />
        <StatCard
          title="Avg Resolution Time"
          value={`${averageResolutionTime}h`}
          icon={TrendingDown}
          color="green"
          trend={{ value: -0.3, direction: 'up' }}
        />
        <StatCard
          title="Customer Satisfaction"
          value={customerSatisfactionScore.toFixed(1)}
          icon={Star}
          color="purple"
          trend={{ value: 0.2, direction: 'up' }}
        />
      </div>

      {/* Analytics Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Dispute Trends */}
        <ChartContainer
          title="Dispute Trends"
          subtitle="Daily dispute volume and resolution"
          type="line"
          data={disputeTrendsData}
          lines={[
            { key: 'open', name: 'Opened', color: '#ef4444' },
            { key: 'resolved', name: 'Resolved', color: '#10b981' },
            { key: 'escalated', name: 'Escalated', color: '#f59e0b' }
          ]}
          xAxisKey="date"
          height={300}
        />

        {/* Dispute Types */}
        <ChartContainer
          title="Dispute Types"
          subtitle="Distribution by category"
          type="pie"
          data={disputeTypeData}
          colors={['#3b82f6', '#ef4444', '#f59e0b', '#10b981', '#8b5cf6']}
          height={300}
        />

        {/* Agent Performance */}
        <ChartContainer
          title="Agent Performance"
          subtitle="Average resolution time by agent"
          type="bar"
          data={resolutionTimeData}
          bars={[
            { key: 'avgTime', name: 'Avg Hours', color: '#3b82f6' }
          ]}
          xAxisKey="agent"
          height={300}
        />
      </div>

      {/* Agent Performance Summary */}
      <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg p-6 border border-blue-200">
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
          <Users className="w-5 h-5 mr-2 text-blue-600" />
          Agent Performance Overview
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {mockAgentPerformance.map((agent) => (
            <div key={agent.agentId} className="bg-white rounded-lg p-4 border border-gray-200">
              <div className="font-medium text-gray-900 mb-2">{agent.agentName}</div>
              <div className="space-y-1 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Active:</span>
                  <span className="font-medium">{agent.activeDisputes}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Resolved Today:</span>
                  <span className="font-medium text-green-600">{agent.resolvedToday}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Avg Time:</span>
                  <span className="font-medium">{agent.averageResolutionTime}h</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Satisfaction:</span>
                  <div className="flex items-center">
                    <Star className="w-3 h-3 text-yellow-400 mr-1" />
                    <span className="font-medium">{agent.customerSatisfactionScore}</span>
                  </div>
                </div>
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
          placeholder="Search disputes by ID, order, or subject..."
          className="flex-1"
        />
        <div className="flex gap-2">
          <FilterDropdown
            value={filters.status}
            onChange={(value) => setFilters(prev => ({ ...prev, status: value }))}
            options={[
              { value: 'all', label: 'All Status' },
              { value: 'open', label: 'Open' },
              { value: 'in_progress', label: 'In Progress' },
              { value: 'resolved', label: 'Resolved' },
              { value: 'closed', label: 'Closed' }
            ]}
          />
          <FilterDropdown
            value={filters.priority}
            onChange={(value) => setFilters(prev => ({ ...prev, priority: value }))}
            options={[
              { value: 'all', label: 'All Priorities' },
              { value: 'high', label: 'High' },
              { value: 'medium', label: 'Medium' },
              { value: 'low', label: 'Low' }
            ]}
          />
          <FilterDropdown
            value={filters.type}
            onChange={(value) => setFilters(prev => ({ ...prev, type: value }))}
            options={[
              { value: 'all', label: 'All Types' },
              { value: 'wrong_items', label: 'Wrong Items' },
              { value: 'late_delivery', label: 'Late Delivery' },
              { value: 'missing_items', label: 'Missing Items' },
              { value: 'quality_concerns', label: 'Quality Concerns' },
              { value: 'payment_issues', label: 'Payment Issues' }
            ]}
          />
        </div>
      </div>

      {/* Disputes Table */}
      <DataTable
        columns={columns}
        data={filteredDisputes}
        key="id"
        searchable={false}
        pagination={{ pageSize: 25 }}
        emptyMessage="No disputes found"
      />

      {/* Dispute Detail Modal */}
      {selectedDispute && (
        <Modal
          isOpen={!!selectedDispute}
          onClose={() => setSelectedDispute(null)}
          title={`Dispute Details - ${selectedDispute.id}`}
          size="lg"
        >
          <div className="space-y-6">
            {/* Basic Information */}
            <div>
              <h4 className="font-semibold text-gray-900 mb-3">Dispute Information</h4>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-gray-600">Dispute ID:</span>
                  <div className="font-medium">{selectedDispute.id}</div>
                </div>
                <div>
                  <span className="text-gray-600">Order ID:</span>
                  <div className="font-medium text-blue-600">{selectedDispute.orderId}</div>
                </div>
                <div>
                  <span className="text-gray-600">Type:</span>
                  <div className="font-medium">{getDisputeTypeLabel(selectedDispute.type)}</div>
                </div>
                <div>
                  <span className="text-gray-600">Priority:</span>
                  <div>{getPriorityBadge(selectedDispute.priority)}</div>
                </div>
                <div>
                  <span className="text-gray-600">Order Value:</span>
                  <div className="font-medium">{formatCurrency(selectedDispute.orderValue)}</div>
                </div>
                <div>
                  <span className="text-gray-600">Requested Resolution:</span>
                  <div className="font-medium">{getResolutionTypeLabel(selectedDispute.requestedResolution)}</div>
                </div>
                <div>
                  <span className="text-gray-600">Created:</span>
                  <div className="font-medium">{formatDate(selectedDispute.createdAt)}</div>
                </div>
                <div>
                  <span className="text-gray-600">Status:</span>
                  <div>{getStatusBadge(selectedDispute.status)}</div>
                </div>
              </div>
            </div>

            {/* Subject and Description */}
            <div>
              <h4 className="font-semibold text-gray-900 mb-2">Subject</h4>
              <p className="text-gray-700 mb-4">{selectedDispute.subject}</p>
              
              <h4 className="font-semibold text-gray-900 mb-2">Description</h4>
              <p className="text-gray-700">{selectedDispute.description}</p>
            </div>

            {/* Resolution Information */}
            {selectedDispute.resolution && (
              <div>
                <h4 className="font-semibold text-gray-900 mb-3">Resolution Details</h4>
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-gray-600">Resolution Type:</span>
                      <div className="font-medium">{getResolutionTypeLabel(selectedDispute.resolution.type)}</div>
                    </div>
                    <div>
                      <span className="text-gray-600">Amount:</span>
                      <div className="font-medium">{formatCurrency(selectedDispute.resolution.amount)}</div>
                    </div>
                    <div>
                      <span className="text-gray-600">Reason:</span>
                      <div className="font-medium">{selectedDispute.resolution.reason}</div>
                    </div>
                    <div>
                      <span className="text-gray-600">Processed At:</span>
                      <div className="font-medium">{formatDate(selectedDispute.resolution.processedAt)}</div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="flex justify-end space-x-3">
              {selectedDispute.status === 'open' && (
                <button
                  onClick={() => {
                    setShowResolutionModal(true)
                  }}
                  className="px-4 py-2 text-green-700 bg-green-50 border border-green-200 rounded-lg hover:bg-green-100"
                >
                  Resolve Dispute
                </button>
              )}
              <button
                onClick={() => setSelectedDispute(null)}
                className="px-4 py-2 text-gray-700 bg-gray-50 border border-gray-200 rounded-lg hover:bg-gray-100"
              >
                Close
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Resolution Modal */}
      {showResolutionModal && selectedDispute && (
        <Modal
          isOpen={showResolutionModal}
          onClose={() => setShowResolutionModal(false)}
          title={`Resolve Dispute - ${selectedDispute.id}`}
          size="md"
        >
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Resolution Template</label>
              <select
                value={selectedTemplate?.id || ''}
                onChange={(e) => {
                  const template = resolutionTemplates.find(t => t.id === e.target.value)
                  setSelectedTemplate(template)
                  if (template) {
                    setResolutionReason(template.template.replace('{amount}', formatCurrency(selectedDispute.orderValue)))
                  }
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">Select a template...</option>
                {resolutionTemplates
                  .filter(template => template.disputeType === selectedDispute.type)
                  .map(template => (
                    <option key={template.id} value={template.id}>
                      {template.name}
                    </option>
                  ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Resolution Amount</label>
              <div className="relative">
                <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="number"
                  value={resolutionAmount}
                  onChange={(e) => setResolutionAmount(e.target.value)}
                  placeholder="0.00"
                  className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Resolution Reason</label>
              <textarea
                value={resolutionReason}
                onChange={(e) => setResolutionReason(e.target.value)}
                rows={4}
                placeholder="Enter resolution reason..."
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <div className="flex justify-end space-x-3">
              <button
                onClick={() => {
                  setShowResolutionModal(false)
                  setSelectedTemplate(null)
                  setResolutionAmount('')
                  setResolutionReason('')
                }}
                className="px-4 py-2 text-gray-700 bg-gray-50 border border-gray-200 rounded-lg hover:bg-gray-100"
              >
                Cancel
              </button>
              <button
                onClick={() => handleResolveDispute(selectedDispute.id)}
                disabled={!resolutionAmount || !resolutionReason}
                className="px-4 py-2 text-green-700 bg-green-50 border border-green-200 rounded-lg hover:bg-green-100 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Process Resolution
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}