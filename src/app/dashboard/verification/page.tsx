'use client'

import React, { useState, useEffect } from 'react'
import { Search, Filter, FileText, Check, X, Clock, AlertCircle, Eye, Download, RefreshCw, Calendar, Globe, Shield, User, Zap, BarChart3, TrendingUp, Star, Award, Target, Activity } from 'lucide-react'
import { DataTable, StatCard, Badge, Modal, FilterDropdown, SearchBar, ChartContainer } from '@/components/shared'
import { useRealTimeData, useNotifications } from '@/lib/hooks'
import { formatDate, formatCurrency, formatNumber, calculatePercentage } from '@/lib/utils'
import { 
  DocumentType, 
  VerificationStatus, 
  Country, 
  VerificationApplication,
  DocumentAnalysis 
} from '@/lib/types'

// Mock verification applications data
const mockApplications: VerificationApplication[] = [
  {
    id: 'VER-001',
    applicantName: 'Sarah Johnson',
    applicantType: 'driver',
    email: 'sarah.j@email.com',
    country: 'US',
    documents: [
      {
        id: 'DOC-001',
        type: 'drivers_license',
        fileName: 'license_front.jpg',
        fileSize: 2456789,
        uploadDate: new Date('2025-01-15T10:30:00Z'),
        status: 'approved',
        aiScore: 94,
        analysis: {
          confidence: 94,
          authenticityScore: 92,
          expiryDate: new Date('2028-05-15'),
          flaggedFields: []
        }
      },
      {
        id: 'DOC-002',
        type: 'vehicle_registration',
        fileName: 'registration.pdf',
        fileSize: 1234567,
        uploadDate: new Date('2025-01-15T10:32:00Z'),
        status: 'pending',
        aiScore: 88,
        analysis: {
          confidence: 88,
          authenticityScore: 91,
          expiryDate: new Date('2026-01-20'),
          flaggedFields: ['registration_number']
        }
      }
    ],
    overallScore: 91,
    status: 'pending_review',
    submittedDate: new Date('2025-01-15T10:30:00Z'),
    lastUpdated: new Date('2025-01-15T14:45:00Z'),
    reviewerId: null,
    priority: 'medium'
  },
  {
    id: 'VER-002',
    applicantName: 'Maria Rodriguez',
    applicantType: 'vendor',
    email: 'maria@freshbakery.com',
    country: 'CA',
    documents: [
      {
        id: 'DOC-003',
        type: 'business_license',
        fileName: 'business_license.pdf',
        fileSize: 3456789,
        uploadDate: new Date('2025-01-14T15:20:00Z'),
        status: 'approved',
        aiScore: 96,
        analysis: {
          confidence: 96,
          authenticityScore: 98,
          expiryDate: new Date('2027-12-31'),
          flaggedFields: []
        }
      }
    ],
    overallScore: 96,
    status: 'approved',
    submittedDate: new Date('2025-01-14T15:20:00Z'),
    lastUpdated: new Date('2025-01-15T09:30:00Z'),
    reviewerId: 'REV-001',
    priority: 'low'
  },
  {
    id: 'VER-003',
    applicantName: 'James Wilson',
    applicantType: 'driver',
    email: 'jwilson@email.com',
    country: 'UK',
    documents: [
      {
        id: 'DOC-004',
        type: 'insurance_certificate',
        fileName: 'insurance_doc.jpg',
        fileSize: 1567890,
        uploadDate: new Date('2025-01-16T11:15:00Z'),
        status: 'rejected',
        aiScore: 42,
        analysis: {
          confidence: 42,
          authenticityScore: 38,
          expiryDate: new Date('2025-06-30'),
          flaggedFields: ['policy_number', 'coverage_amount', 'document_authenticity']
        }
      }
    ],
    overallScore: 42,
    status: 'rejected',
    submittedDate: new Date('2025-01-16T11:15:00Z'),
    lastUpdated: new Date('2025-01-16T16:20:00Z'),
    reviewerId: 'REV-002',
    priority: 'high',
    rejectionReason: 'Document appears to be altered. Policy number format is invalid.'
  }
]

export default function VerificationCenter() {
  const [applications, setApplications] = useState<VerificationApplication[]>(mockApplications)
  const [selectedApplication, setSelectedApplication] = useState<VerificationApplication | null>(null)
  const [showDocumentModal, setShowDocumentModal] = useState(false)
  const [selectedDocument, setSelectedDocument] = useState<any>(null)
  const [filters, setFilters] = useState({
    status: 'all',
    country: 'all',
    documentType: 'all',
    scoreRange: 'all'
  })
  const [searchQuery, setSearchQuery] = useState('')
  const { addNotification } = useNotifications()

  // Real-time updates simulation
  useEffect(() => {
    const interval = setInterval(() => {
      // Simulate new applications arriving
      const newApplication: VerificationApplication = {
        id: `VER-${Date.now()}`,
        applicantName: ['John Doe', 'Jane Smith', 'Mike Johnson'][Math.floor(Math.random() * 3)],
        applicantType: Math.random() > 0.5 ? 'driver' : 'vendor',
        email: `user${Date.now()}@example.com`,
        country: ['US', 'CA', 'UK', 'AU', 'ZA'][Math.floor(Math.random() * 5)],
        documents: [{
          id: `DOC-${Date.now()}`,
          type: ['drivers_license', 'business_license', 'insurance_certificate'][Math.floor(Math.random() * 3)],
          fileName: `document_${Date.now()}.pdf`,
          fileSize: Math.floor(Math.random() * 5000000) + 1000000,
          uploadDate: new Date(),
          status: 'pending',
          aiScore: Math.floor(Math.random() * 100),
          analysis: {
            confidence: Math.floor(Math.random() * 100),
            authenticityScore: Math.floor(Math.random() * 100),
            expiryDate: new Date(Date.now() + Math.random() * 365 * 24 * 60 * 60 * 1000),
            flaggedFields: []
          }
        }],
        overallScore: Math.floor(Math.random() * 100),
        status: 'pending_review',
        submittedDate: new Date(),
        lastUpdated: new Date(),
        reviewerId: null,
        priority: ['low', 'medium', 'high'][Math.floor(Math.random() * 3)]
      }

      setApplications(prev => [newApplication, ...prev.slice(0, 49)])
    }, 15000) // New application every 15 seconds

    return () => clearInterval(interval)
  }, [])

  // Calculate metrics
  const totalApplications = applications.length
  const pendingApplications = applications.filter(app => app.status === 'pending_review').length
  const approvedApplications = applications.filter(app => app.status === 'approved').length
  const rejectedApplications = applications.filter(app => app.status === 'rejected').length
  const averageAIScore = applications.reduce((sum, app) => sum + app.overallScore, 0) / applications.length

  // Filter applications
  const filteredApplications = applications.filter(app => {
    const matchesSearch = app.applicantName.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         app.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         app.id.toLowerCase().includes(searchQuery.toLowerCase())
    
    const matchesStatus = filters.status === 'all' || app.status === filters.status
    const matchesCountry = filters.country === 'all' || app.country === filters.country
    
    const matchesScoreRange = filters.scoreRange === 'all' || 
      (filters.scoreRange === 'high' && app.overallScore >= 80) ||
      (filters.scoreRange === 'medium' && app.overallScore >= 50 && app.overallScore < 80) ||
      (filters.scoreRange === 'low' && app.overallScore < 50)

    return matchesSearch && matchesStatus && matchesCountry && matchesScoreRange
  })

  const handleApproveApplication = (applicationId: string) => {
    setApplications(prev => prev.map(app => 
      app.id === applicationId 
        ? { ...app, status: 'approved', reviewerId: 'CURRENT_USER', lastUpdated: new Date() }
        : app
    ))
    addNotification({
      type: 'success',
      title: 'Application Approved',
      message: `Application ${applicationId} has been approved successfully`
    })
  }

  const handleRejectApplication = (applicationId: string, reason: string) => {
    setApplications(prev => prev.map(app => 
      app.id === applicationId 
        ? { ...app, status: 'rejected', rejectionReason: reason, reviewerId: 'CURRENT_USER', lastUpdated: new Date() }
        : app
    ))
    addNotification({
      type: 'error',
      title: 'Application Rejected',
      message: `Application ${applicationId} has been rejected: ${reason}`
    })
  }

  const handleViewDocument = (application: VerificationApplication, document: any) => {
    setSelectedApplication(application)
    setSelectedDocument(document)
    setShowDocumentModal(true)
  }

  const getStatusBadge = (status: VerificationStatus) => {
    const statusConfig = {
      pending_review: { color: 'yellow', icon: Clock, label: 'Pending Review' },
      approved: { color: 'green', icon: Check, label: 'Approved' },
      rejected: { color: 'red', icon: X, label: 'Rejected' }
    }

    const config = statusConfig[status]
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

  const getDocumentTypeLabel = (type: DocumentType) => {
    const typeLabels = {
      drivers_license: 'Driver License',
      business_license: 'Business License',
      tax_document: 'Tax Document',
      insurance_certificate: 'Insurance Certificate',
      vehicle_registration: 'Vehicle Registration',
      government_id: 'Government ID'
    }
    return typeLabels[type] || type
  }

  // Table columns
  const columns = [
    {
      key: 'id',
      header: 'Application ID',
      render: (value: string) => (
        <span className="font-mono text-sm">{value}</span>
      )
    },
    {
      key: 'applicantName',
      header: 'Applicant',
      render: (value: string, record: VerificationApplication) => (
        <div>
          <div className="font-medium text-gray-900">{value}</div>
          <div className="text-sm text-gray-500">{record.email}</div>
          <div className="text-xs text-gray-400 capitalize">{record.applicantType}</div>
        </div>
      )
    },
    {
      key: 'country',
      header: 'Country',
      render: (value: string) => (
        <div className="flex items-center">
          <span className="text-lg mr-2">{Country[value].flag}</span>
          <span>{Country[value].name}</span>
        </div>
      )
    },
    {
      key: 'overallScore',
      header: 'AI Score',
      render: (value: number) => (
        <div className="flex items-center">
          <div className={`w-2 h-2 rounded-full mr-2 ${
            value >= 80 ? 'bg-green-500' : value >= 50 ? 'bg-yellow-500' : 'bg-red-500'
          }`} />
          <span className="font-mono">{value}%</span>
        </div>
      )
    },
    {
      key: 'status',
      header: 'Status',
      render: (value: VerificationStatus) => getStatusBadge(value)
    },
    {
      key: 'priority',
      header: 'Priority',
      render: (value: string) => getPriorityBadge(value)
    },
    {
      key: 'submittedDate',
      header: 'Submitted',
      render: (value: Date) => formatDate(value, 'short')
    },
    {
      key: 'actions',
      header: 'Actions',
      render: (_: any, record: VerificationApplication) => (
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setSelectedApplication(record)}
            className="p-1 text-blue-600 hover:bg-blue-50 rounded"
            title="View Application"
          >
            <Eye className="w-4 h-4" />
          </button>
          {record.documents.map((doc, idx) => (
            <button
              key={idx}
              onClick={() => handleViewDocument(record, doc)}
              className="p-1 text-gray-600 hover:bg-gray-50 rounded"
              title="View Document"
            >
              <FileText className="w-4 h-4" />
            </button>
          ))}
          {record.status === 'pending_review' && (
            <>
              <button
                onClick={() => handleApproveApplication(record.id)}
                className="p-1 text-green-600 hover:bg-green-50 rounded"
                title="Approve"
              >
                <Check className="w-4 h-4" />
              </button>
              <button
                onClick={() => handleRejectApplication(record.id, 'Manual review rejection')}
                className="p-1 text-red-600 hover:bg-red-50 rounded"
                title="Reject"
              >
                <X className="w-4 h-4" />
              </button>
            </>
          )}
        </div>
      )
    }
  ]

  // Verification trends chart data
  const verificationTrendsData = [
    { date: '2025-01-10', pending: 45, approved: 120, rejected: 15 },
    { date: '2025-01-11', pending: 52, approved: 135, rejected: 18 },
    { date: '2025-01-12', pending: 48, approved: 142, rejected: 12 },
    { date: '2025-01-13', pending: 38, approved: 158, rejected: 20 },
    { date: '2025-01-14', pending: 42, approved: 165, rejected: 14 },
    { date: '2025-01-15', pending: 35, approved: 172, rejected: 16 },
    { date: '2025-01-16', pending: 40, approved: 178, rejected: 13 },
    { date: '2025-01-17', pending: 44, approved: 185, rejected: 11 }
  ]

  // Country distribution data
  const countryDistributionData = Object.keys(Country).map(country => ({
    country: Country[country].name,
    applications: applications.filter(app => app.country === country).length,
    approved: applications.filter(app => app.country === country && app.status === 'approved').length
  }))

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Verification Center</h1>
        <p className="text-gray-600">AI-powered document processing and application management</p>
      </div>

      {/* Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Applications"
          value={formatNumber(totalApplications)}
          icon={FileText}
          color="blue"
          trend={{ value: calculatePercentage(applications.slice(-10).length, applications.slice(-20).length), direction: 'up' }}
        />
        <StatCard
          title="Pending Review"
          value={formatNumber(pendingApplications)}
          icon={Clock}
          color="yellow"
          trend={{ value: calculatePercentage(pendingApplications, totalApplications), direction: 'up' }}
        />
        <StatCard
          title="Approved"
          value={formatNumber(approvedApplications)}
          icon={Check}
          color="green"
          trend={{ value: calculatePercentage(approvedApplications, totalApplications), direction: 'up' }}
        />
        <StatCard
          title="Avg AI Score"
          value={`${Math.round(averageAIScore)}%`}
          icon={Shield}
          color="purple"
          trend={{ value: 2.3, direction: 'up' }}
        />
      </div>

      {/* Analytics Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Verification Trends */}
        <ChartContainer
          title="Verification Trends"
          subtitle="Application status over time"
          type="line"
          data={verificationTrendsData}
          lines={[
            { key: 'pending', name: 'Pending', color: '#f59e0b' },
            { key: 'approved', name: 'Approved', color: '#10b981' },
            { key: 'rejected', name: 'Rejected', color: '#ef4444' }
          ]}
          xAxisKey="date"
          height={300}
        />

        {/* Country Distribution */}
        <ChartContainer
          title="Applications by Country"
          subtitle="Distribution across supported regions"
          type="bar"
          data={countryDistributionData}
          bars={[
            { key: 'applications', name: 'Total Applications', color: '#3b82f6' },
            { key: 'approved', name: 'Approved', color: '#10b981' }
          ]}
          xAxisKey="country"
          height={300}
        />
      </div>

      {/* AI Processing Status */}
      <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg p-6 border border-blue-200">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900 flex items-center">
            <Zap className="w-5 h-5 mr-2 text-blue-600" />
            AI Processing Status
          </h3>
          <Badge variant="green" className="flex items-center">
            <Activity className="w-3 h-3 mr-1" />
            Active
          </Badge>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
          <div>
            <div className="text-gray-600">Documents Processed Today</div>
            <div className="text-xl font-bold text-gray-900">1,247</div>
            <div className="text-green-600">↑ 15% from yesterday</div>
          </div>
          <div>
            <div className="text-gray-600">Average Processing Time</div>
            <div className="text-xl font-bold text-gray-900">2.3s</div>
            <div className="text-green-600">↓ 0.5s improvement</div>
          </div>
          <div>
            <div className="text-gray-600">Accuracy Rate</div>
            <div className="text-xl font-bold text-gray-900">96.7%</div>
            <div className="text-green-600">↑ 2.1% this week</div>
          </div>
        </div>
      </div>

      {/* Filters and Search */}
      <div className="flex flex-col sm:flex-row gap-4">
        <SearchBar
          value={searchQuery}
          onChange={setSearchQuery}
          placeholder="Search applications by name, email, or ID..."
          className="flex-1"
        />
        <div className="flex gap-2">
          <FilterDropdown
            value={filters.status}
            onChange={(value) => setFilters(prev => ({ ...prev, status: value }))}
            options={[
              { value: 'all', label: 'All Status' },
              { value: 'pending_review', label: 'Pending Review' },
              { value: 'approved', label: 'Approved' },
              { value: 'rejected', label: 'Rejected' }
            ]}
          />
          <FilterDropdown
            value={filters.country}
            onChange={(value) => setFilters(prev => ({ ...prev, country: value }))}
            options={[
              { value: 'all', label: 'All Countries' },
              ...Object.keys(Country).map(key => ({
                value: key,
                label: Country[key].name
              }))
            ]}
          />
          <FilterDropdown
            value={filters.scoreRange}
            onChange={(value) => setFilters(prev => ({ ...prev, scoreRange: value }))}
            options={[
              { value: 'all', label: 'All Scores' },
              { value: 'high', label: 'High Score (80-100%)' },
              { value: 'medium', label: 'Medium Score (50-79%)' },
              { value: 'low', label: 'Low Score (0-49%)' }
            ]}
          />
        </div>
      </div>

      {/* Applications Table */}
      <DataTable
        columns={columns}
        data={filteredApplications}
        key="id"
        searchable={false}
        pagination={{ pageSize: 25 }}
        emptyMessage="No verification applications found"
      />

      {/* Application Detail Modal */}
      {selectedApplication && (
        <Modal
          isOpen={!!selectedApplication}
          onClose={() => setSelectedApplication(null)}
          title={`Application Details - ${selectedApplication.id}`}
          size="lg"
        >
          <div className="space-y-6">
            {/* Applicant Information */}
            <div>
              <h4 className="font-semibold text-gray-900 mb-3">Applicant Information</h4>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-gray-600">Name:</span>
                  <div className="font-medium">{selectedApplication.applicantName}</div>
                </div>
                <div>
                  <span className="text-gray-600">Email:</span>
                  <div className="font-medium">{selectedApplication.email}</div>
                </div>
                <div>
                  <span className="text-gray-600">Type:</span>
                  <div className="font-medium capitalize">{selectedApplication.applicantType}</div>
                </div>
                <div>
                  <span className="text-gray-600">Country:</span>
                  <div className="font-medium flex items-center">
                    <span className="mr-2">{Country[selectedApplication.country].flag}</span>
                    {Country[selectedApplication.country].name}
                  </div>
                </div>
              </div>
            </div>

            {/* Documents */}
            <div>
              <h4 className="font-semibold text-gray-900 mb-3">Documents</h4>
              <div className="space-y-3">
                {selectedApplication.documents.map((doc, index) => (
                  <div key={index} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center">
                        <FileText className="w-4 h-4 mr-2 text-gray-600" />
                        <span className="font-medium">{getDocumentTypeLabel(doc.type)}</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <span className="text-sm text-gray-600">AI Score: {doc.aiScore}%</span>
                        <button
                          onClick={() => handleViewDocument(selectedApplication, doc)}
                          className="p-1 text-blue-600 hover:bg-blue-50 rounded"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                    <div className="text-sm text-gray-600">
                      {doc.fileName} • {(doc.fileSize / 1024 / 1024).toFixed(2)} MB
                    </div>
                    <div className="mt-2">
                      {getStatusBadge(doc.status)}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Actions */}
            {selectedApplication.status === 'pending_review' && (
              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => {
                    handleRejectApplication(selectedApplication.id, 'Manual review rejection')
                    setSelectedApplication(null)
                  }}
                  className="px-4 py-2 text-red-700 bg-red-50 border border-red-200 rounded-lg hover:bg-red-100"
                >
                  Reject Application
                </button>
                <button
                  onClick={() => {
                    handleApproveApplication(selectedApplication.id)
                    setSelectedApplication(null)
                  }}
                  className="px-4 py-2 text-green-700 bg-green-50 border border-green-200 rounded-lg hover:bg-green-100"
                >
                  Approve Application
                </button>
              </div>
            )}
          </div>
        </Modal>
      )}

      {/* Document Preview Modal */}
      {showDocumentModal && selectedDocument && (
        <Modal
          isOpen={showDocumentModal}
          onClose={() => setShowDocumentModal(false)}
          title={`Document Preview - ${selectedDocument.fileName}`}
          size="xl"
        >
          <div className="space-y-4">
            {/* Document Info */}
            <div className="grid grid-cols-3 gap-4 text-sm">
              <div>
                <span className="text-gray-600">Type:</span>
                <div className="font-medium">{getDocumentTypeLabel(selectedDocument.type)}</div>
              </div>
              <div>
                <span className="text-gray-600">AI Score:</span>
                <div className="font-medium flex items-center">
                  {selectedDocument.aiScore}%
                  <div className={`w-2 h-2 rounded-full ml-2 ${
                    selectedDocument.aiScore >= 80 ? 'bg-green-500' : 
                    selectedDocument.aiScore >= 50 ? 'bg-yellow-500' : 'bg-red-500'
                  }`} />
                </div>
              </div>
              <div>
                <span className="text-gray-600">Size:</span>
                <div className="font-medium">{(selectedDocument.fileSize / 1024 / 1024).toFixed(2)} MB</div>
              </div>
            </div>

            {/* AI Analysis */}
            {selectedDocument.analysis && (
              <div>
                <h4 className="font-semibold text-gray-900 mb-2">AI Analysis Results</h4>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-gray-600">Confidence Score:</span>
                    <div className="font-medium">{selectedDocument.analysis.confidence}%</div>
                  </div>
                  <div>
                    <span className="text-gray-600">Authenticity Score:</span>
                    <div className="font-medium">{selectedDocument.analysis.authenticityScore}%</div>
                  </div>
                  {selectedDocument.analysis.expiryDate && (
                    <div>
                      <span className="text-gray-600">Expiry Date:</span>
                      <div className="font-medium">{formatDate(selectedDocument.analysis.expiryDate)}</div>
                    </div>
                  )}
                  <div>
                    <span className="text-gray-600">Flagged Fields:</span>
                    <div className="font-medium">
                      {selectedDocument.analysis.flaggedFields.length > 0 
                        ? selectedDocument.analysis.flaggedFields.join(', ')
                        : 'None'
                      }
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Document Preview (placeholder) */}
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
              <FileText className="w-12 h-12 text-gray-400 mx-auto mb-2" />
              <p className="text-gray-600">Document Preview</p>
              <p className="text-sm text-gray-500 mt-1">In production, this would display the actual document with zoom, rotate, and annotation tools</p>
            </div>

            {/* Actions */}
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setShowDocumentModal(false)}
                className="px-4 py-2 text-gray-700 bg-gray-50 border border-gray-200 rounded-lg hover:bg-gray-100"
              >
                Close
              </button>
              <button className="px-4 py-2 text-blue-700 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 flex items-center">
                <Download className="w-4 h-4 mr-2" />
                Download Document
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}