'use client'

import React, { useState, useEffect } from 'react'
import { Package, AlertTriangle, TrendingUp, TrendingDown, Truck, BarChart3, Filter, Search, Download, RefreshCw, Eye, Edit, Plus, Minus, Bell, DollarSign, Zap, Activity, Clock, CheckCircle, AlertCircle, ShoppingCart } from 'lucide-react'
import { DataTable, StatCard, Badge, Modal, FilterDropdown, SearchBar, ChartContainer } from '@/components/shared'
import { useRealTimeData, useNotifications } from '@/lib/hooks'
import { formatDate, formatCurrency, formatNumber, calculatePercentage } from '@/lib/utils'
import { Product, Inventory } from '@/lib/types'

// Mock inventory data
const mockInventory: Inventory[] = [
  {
    id: 'INV-001',
    productId: 'PROD-001',
    productName: 'Organic Bananas',
    vendorId: 'VEND-001',
    vendorName: 'Fresh Bakery Co',
    category: 'produce',
    currentStock: 150,
    minimumStock: 20,
    maximumStock: 500,
    reorderPoint: 50,
    unitCost: 0.75,
    unitPrice: 2.99,
    totalValue: 448.50,
    lastRestockDate: new Date('2025-01-10T14:30:00Z'),
    location: 'Main Warehouse - Zone A',
    sku: 'ORG-BANANA-001',
    status: 'in_stock',
    vendor: {
      id: 'VEND-001',
      businessName: 'Fresh Bakery Co',
      email: 'orders@freshbakery.com',
      phone: '+1-555-123-4567',
      rating: 4.7,
      activeProducts: 45
      address: '123 Main St, City, State 12345'
    },
    forecast: {
      demand7Days: 320,
      demand30Days: 1450,
      reorderLeadTime: 3,
      monthlyVariation: 15.2
    }
  },
  {
    id: 'INV-002',
    productId: 'PROD-002',
    productName: 'Whole Wheat Bread',
    vendorId: 'VEND-002',
    vendorName: 'Artisan Bread Shop',
    category: 'bakery',
    currentStock: 45,
    minimumStock: 15,
    maximumStock: 200,
    reorderPoint: 30,
    unitCost: 1.25,
    unitPrice: 4.50,
    totalValue: 202.50,
    lastRestockDate: new Date('2025-01-12T10:15:00Z'),
    location: 'Store Front - Zone B',
    sku: 'ART-BREAD-WHOLE-002',
    status: 'low_stock',
    vendor: {
      id: 'VEND-002',
      businessName: 'Artisan Bread Shop',
      email: 'hello@artisanbread.com',
      phone: '+1-555-987-6543',
      rating: 4.9,
      activeProducts: 28,
      address: '456 Oak Ave, City, State 12345'
    },
    forecast: {
      demand7Days: 180,
      demand30Days: 780,
      reorderLeadTime: 2,
      monthlyVariation: 8.5
    }
  },
  {
    id: 'INV-003',
    productId: 'PROD-003',
    productName: 'Premium Coffee Beans',
    vendorId: 'VEND-003',
    vendorName: 'Coffee Roasters Inc',
    category: 'beverages',
    currentStock: 5,
    minimumStock: 25,
    maximumStock: 100,
    reorderPoint: 50,
    unitCost: 8.50,
    unitPrice: 15.99,
    totalValue: 79.95,
    lastRestockDate: new Date('2025-01-08T11:20:00Z'),
    location: 'Storage Room - Zone C',
    sku: 'PREM-COFFEE-BEANS-003',
    status: 'critical',
    vendor: {
      id: 'VEND-003',
      businessName: 'Coffee Roasters Inc',
      email: 'wholesale@coffeeroasters.com',
      phone: '+1-555-555-1234',
      rating: 4.5,
      activeProducts: 15,
      address: '789 Industrial Dr, City, State 12345'
    },
    forecast: {
      demand7Days: 95,
      demand30Days: 420,
      reorderLeadTime: 5,
      monthlyVariation: 22.3
    }
  }
]

export default function InventoryManagement() {
  const [inventory, setInventory] = useState<Inventory[]>(mockInventory)
  const [selectedProduct, setSelectedProduct] = useState<Inventory | null>(null)
  const [showBulkModal, setShowBulkModal] = useState(false)
  const [selectedProducts, setSelectedProducts] = useState<string[]>([])
  const [filters, setFilters] = useState({
    status: 'all',
    vendor: 'all',
    category: 'all',
    location: 'all'
  })
  const [searchQuery, setSearchQuery] = useState('')
  const [alertConfig, setAlertConfig] = useState({
    lowStockThreshold: 20,
    criticalThreshold: 10,
    emailNotifications: true,
    smsNotifications: false
  })
  const { addNotification } = useNotifications()

  // Real-time updates simulation
  useEffect(() => {
    const interval = setInterval(() => {
      // Simulate stock changes
      setInventory(prev => prev.map(item => {
        const stockChange = Math.floor(Math.random() * 10) - 5
        const newStock = Math.max(0, item.currentStock + stockChange)
        
        let newStatus: 'in_stock'
        if (newStock === 0) {
          newStatus = 'out_of_stock'
        } else if (newStock <= item.minimumStock) {
          newStatus = 'low_stock'
        } else if (newStock <= item.minimumStock / 2) {
          newStatus = 'critical'
        }

        return {
          ...item,
          currentStock: newStock,
          status: newStatus,
          totalValue: newStock * item.unitPrice,
          updatedAt: new Date()
        }
      }))
    }, 7000) // Update every 7 seconds

    return () => clearInterval(interval)
  }, [])

  // Calculate metrics
  const totalProducts = inventory.length
  const inStockCount = inventory.filter(item => item.status === 'in_stock').length
  const lowStockCount = inventory.filter(item => item.status === 'low_stock').length
  const criticalCount = inventory.filter(item => item.status === 'critical').length
  const totalValue = inventory.reduce((sum, item) => sum + item.totalValue, 0)
  const averageTurnover = inventory.reduce((sum, item) => sum + (item.forecast.demand30Days / 30), 0) / inventory.length

  // Filter inventory
  const filteredInventory = inventory.filter(item => {
    const matchesSearch = item.productName.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         item.sku.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         item.vendorName.toLowerCase().includes(searchQuery.toLowerCase())

    const matchesStatus = filters.status === 'all' || item.status === filters.status
    const matchesVendor = filters.vendor === 'all' || item.vendorId === filters.vendor
    const matchesCategory = filters.category === 'all' || item.category === filters.category
    const matchesLocation = filters.location === 'all' || item.location.includes(filters.location)

    return matchesSearch && matchesStatus && matchesVendor && matchesCategory && matchesLocation
  })

  const getStockStatusBadge = (status: string) => {
    const statusConfig = {
      in_stock: { color: 'green', icon: CheckCircle, label: 'In Stock' },
      low_stock: { color: 'yellow', icon: AlertTriangle, label: 'Low Stock' },
      critical: { color: 'red', icon: AlertCircle, label: 'Critical' },
      out_of_stock: { color: 'gray', icon: XCircle, label: 'Out of Stock' }
    }

    const config = statusConfig[status as keyof typeof statusConfig]
    return (
      <Badge variant={config.color as any}>
        <config.icon className="w-3 h-3 mr-1" />
        {config.label}
      </Badge>
    )
  }

  const getStockPercentage = (item: Inventory) => {
    return Math.round((item.currentStock / item.maximumStock) * 100)
  }

  const handleBulkSelection = (productId: string) => {
    setSelectedProducts(prev => 
      prev.includes(productId) 
        ? prev.filter(id => id !== productId)
        : [...prev, productId]
    )
  }

  const handleBulkAction = (action: 'restock' | 'adjust' | 'delete') => {
    if (selectedProducts.length === 0) return

    switch (action) {
      case 'restock':
        setInventory(prev => prev.map(item => {
          if (selectedProducts.includes(item.id)) {
            const restockAmount = item.maximumStock - item.currentStock
            return {
              ...item,
              currentStock: item.maximumStock,
              status: 'in_stock',
              lastRestockDate: new Date(),
              updatedAt: new Date()
            }
          }
          return item
        }))
        addNotification({
          type: 'success',
          title: 'Bulk Restock Complete',
          message: `${selectedProducts.length} products have been restocked`
        })
        break

      case 'adjust':
        // Show adjustment modal
        break

      case 'delete':
        setInventory(prev => prev.filter(item => !selectedProducts.includes(item.id)))
        addNotification({
          type: 'info',
          title: 'Products Deleted',
          message: `${selectedProducts.length} products have been removed from inventory`
        })
        setShowBulkModal(false)
        setSelectedProducts([])
        break
    }
  }

  const handleExportInventory = () => {
    addNotification({
      type: 'info',
      title: 'Export Started',
      message: 'Inventory data is being exported to CSV'
    })
  }

  // Inventory trends data
  const inventoryTrendsData = [
    { date: '2025-01-10', inStock: 28, lowStock: 5, critical: 1, totalValue: 12450.78 },
    { date: '2025-01-11', inStock: 26, lowStock: 6, critical: 2, totalValue: 11890.45 },
    { date: '2025-01-12', inStock: 30, lowStock: 4, critical: 1, totalValue: 13245.67 },
    { date: '2025-01-13', inStock: 25, lowStock: 7, critical: 3, totalValue: 10987.23 },
    { date: '2025-01-14', inStock: 28, lowStock: 8, critical: 2, totalValue: 14320.11 },
    { date: '2025-01-15', inStock: 32, lowStock: 5, critical: 1, totalValue: 15678.90 },
    { date: '2025-01-16', inStock: 29, lowStock: 6, critical: 2, totalValue: 16789.34 },
    { date: '2025-01-17', inStock: 31, lowStock: 4, critical: 3, totalValue: 17234.56 }
  ]

  // Category distribution
  const categoryDistributionData = [
    { category: 'Produce', count: 15, percentage: 35.7 },
    { category: 'Bakery', count: 18, percentage: 42.9 },
    { category: 'Beverages', count: 8, percentage: 19.0 },
    { category: 'Dairy', count: 5, percentage: 11.9 }
  ]

  // Vendor performance data
  const vendorPerformanceData = [
    {
      vendorId: 'VEND-001',
      vendorName: 'Fresh Bakery Co',
      totalProducts: 12,
      averageStock: 145,
      lowStockItems: 2,
      turnoverRate: 4.2,
      reliabilityScore: 96.5
    },
    {
      vendorId: 'VEND-002',
      vendorName: 'Artisan Bread Shop',
      totalProducts: 8,
      averageStock: 52,
      lowStockItems: 3,
      turnoverRate: 3.8,
      reliabilityScore: 94.2
    },
    {
      vendorId: 'VEND-003',
      vendorName: 'Coffee Roasters Inc',
      totalProducts: 5,
      averageStock: 18,
      lowStockItems: 4,
      turnoverRate: 2.1,
      reliabilityScore: 87.8
    }
  ]

  // Table columns
  const columns = [
    {
      key: 'productName',
      header: 'Product',
      render: (value: string, record: Inventory) => (
        <div>
          <div className="font-medium text-gray-900">{value}</div>
          <div className="text-sm text-gray-500">SKU: {record.sku}</div>
          <div className="text-xs text-gray-400">{record.category}</div>
        </div>
      )
    },
    {
      key: 'vendorName',
      header: 'Vendor',
      render: (value: string) => (
        <div className="font-medium text-gray-900">{value}</div>
      )
    },
    {
      key: 'currentStock',
      header: 'Current Stock',
      render: (value: number, record: Inventory) => (
        <div>
          <div className="flex items-center">
            <span className="font-medium mr-2">{value}</span>
            <div className="flex-1 bg-gray-200 rounded-full h-2">
              <div 
                className="bg-blue-500 h-2 rounded-full transition-all"
                style={{ width: `${getStockPercentage(record)}%` }}
              />
            </div>
            <span className="ml-2 text-sm text-gray-600">{getStockPercentage(record)}%</span>
          </div>
          <div className="text-xs text-gray-500">
            Min: {record.minimumStock} | Max: {record.maximumStock}
          </div>
        </div>
      )
    },
    {
      key: 'status',
      header: 'Status',
      render: (value: string) => getStockStatusBadge(value)
    },
    {
      key: 'unitPrice',
      header: 'Unit Price',
      render: (value: number) => formatCurrency(value)
    },
    {
      key: 'totalValue',
      header: 'Total Value',
      render: (value: number) => formatCurrency(value)
    },
    {
      key: 'location',
      header: 'Location',
      render: (value: string) => (
        <div className="text-sm">
          <div className="text-gray-600">📍</div>
          <span>{value}</span>
        </div>
      )
    },
    {
      key: 'reorderPoint',
      header: 'Reorder Point',
      render: (value: number) => value
      }
    },
    {
      key: 'actions',
      header: 'Actions',
      render: (_: any, record: Inventory) => (
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setSelectedProduct(record)}
            className="p-1 text-blue-600 hover:bg-blue-50 rounded"
            title="View Details"
          >
            <Eye className="w-4 h-4" />
          </button>
          <button
            onClick={() => handleBulkAction('restock')}
            className="p-1 text-green-600 hover:bg-green-50 rounded"
            title="Restock"
            disabled={record.status === 'in_stock'}
          >
            <RefreshCw className="w-4 h-4" />
          </button>
          <input
            type="checkbox"
            checked={selectedProducts.includes(record.id)}
            onChange={() => handleBulkSelection(record.id)}
            className="rounded border-gray-300"
          />
        </div>
      )
    }
  ]

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Inventory Management</h1>
        <p className="text-gray-600">Real-time stock level intelligence across all vendors</p>
      </div>

      {/* Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Products"
          value={formatNumber(totalProducts)}
          icon={Package}
          color="blue"
          trend={{ value: 8.2, direction: 'up' }}
        />
        <StatCard
          title="In Stock"
          value={formatNumber(inStockCount)}
          icon={CheckCircle}
          color="green"
          trend={{ value: calculatePercentage(inStockCount, totalProducts), direction: 'down' }}
        />
        <StatCard
          title="Low Stock Alerts"
          value={formatNumber(lowStockCount)}
          icon={AlertTriangle}
          color="yellow"
          trend={{ value: 12.5, direction: 'up' }}
        />
        <StatCard
          title="Total Inventory Value"
          value={formatCurrency(totalValue)}
          icon={DollarSign}
          color="purple"
          trend={{ value: 15.3, direction: 'up' }}
        />
      </div>

      {/* Analytics Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Inventory Trends */}
        <ChartContainer
          title="Inventory Trends"
          subtitle="Stock levels and alerts over time"
          type="line"
          data={inventoryTrendsData}
          lines={[
            { key: 'inStock', name: 'In Stock', color: '#10b981' },
            { key: 'lowStock', name: 'Low Stock', color: '#f59e0b' },
            { key: 'critical', name: 'Critical', color: '#ef4444' },
            { key: 'totalValue', name: 'Total Value ($)', color: '#3b82f6' }
          ]}
          xAxisKey="date"
          height={300}
        />

        {/* Category Distribution */}
        <ChartContainer
          title="Category Distribution"
          subtitle="Product distribution by category"
          type="pie"
          data={categoryDistributionData}
          colors={['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#6366f1']}
          height={300}
        />

        {/* Vendor Performance */}
        <ChartContainer
          title="Vendor Performance"
          subtitle="Stock levels and turnover by vendor"
          type="bar"
          data={vendorPerformanceData}
          bars={[
            { key: 'averageStock', name: 'Avg Stock', color: '#3b82f6' },
            { key: 'turnoverRate', name: 'Turnover Rate', color: '#10b981' },
            { key: 'reliabilityScore', name: 'Reliability %', color: '#22c55e' }
          ]}
          xAxisKey="vendorName"
          height={300}
        />
      </div>

      {/* Low Stock Alert Configuration */}
      <div className="bg-gradient-to-r from-yellow-50 to-red-50 rounded-lg p-6 border border-yellow-200">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900 flex items-center">
            <Bell className="w-5 h-5 mr-2 text-yellow-600" />
            Low Stock Alert Configuration
          </h3>
          <Badge variant="red" className="flex items-center">
            <AlertCircle className="w-3 h-3 mr-1" />
            {criticalCount + lowStockCount} Active Alerts
          </Badge>
        </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
          <div>
            <label className="block text-gray-700 mb-2">Low Stock Threshold</label>
            <div className="flex items-center space-x-2">
              <input
                type="number"
                value={alertConfig.lowStockThreshold}
                onChange={(e) => setAlertConfig(prev => ({ ...prev, lowStockThreshold: parseInt(e.target.value) }))}
                className="w-24 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
              <span className="text-gray-600">units</span>
            </div>
          </div>
          <div>
            <label className="block text-gray-700 mb-2">Critical Threshold</label>
            <div className="flex items-center space-x-2">
              <input
                type="number"
                value={alertConfig.criticalThreshold}
                onChange={(e) => setAlertConfig(prev => ({ ...prev, criticalThreshold: parseInt(e.target.value) }))}
                className="w-24 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
              <span className="text-gray-600">units</span>
            </div>
          </div>
          <div>
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={alertConfig.emailNotifications}
                onChange={(e) => setAlertConfig(prev => ({ ...prev, emailNotifications: e.target.checked }))}
                className="mr-2"
              />
              <span className="text-gray-700">Email Notifications</span>
            </label>
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={alertConfig.smsNotifications}
                onChange={(e) => setAlertConfig(prev => ({ ...prev, smsNotifications: e.target.checked }))}
                className="mr-2"
              />
              <span className="text-gray-700">SMS Notifications</span>
            </label>
          </div>
        </div>
      </div>

      {/* Filters and Search */}
      <div className="flex flex-col sm:flex-row gap-4">
        <SearchBar
          value={searchQuery}
          onChange={setSearchQuery}
          placeholder="Search products by name, SKU, or vendor..."
          className="flex-1"
        />
        <div className="flex gap-2">
          <FilterDropdown
            value={filters.status}
            onChange={(value) => setFilters(prev => ({ ...prev, status: value }))}
            options={[
              { value: 'all', label: 'All Status' },
              { value: 'in_stock', label: 'In Stock' },
              { value: 'low_stock', label: 'Low Stock' },
              { value: 'critical', label: 'Critical' },
              { value: 'out_of_stock', label: 'Out of Stock' }
            ]}
          />
          <FilterDropdown
            value={filters.vendor}
            onChange={(value) => setFilters(prev => ({ ...prev, vendor: value }))}
            options={[
              { value: 'all', label: 'All Vendors' },
              { value: 'VEND-001', label: 'Fresh Bakery Co' },
              { value: 'VEND-002', label: 'Artisan Bread Shop' },
              { value: 'VEND-003', label: 'Coffee Roasters Inc' }
            ]}
          />
          <FilterDropdown
            value={filters.category}
            onChange={(value) => setFilters(prev => ({ ...prev, category: value }))}
            options={[
              { value: 'all', label: 'All Categories' },
              { value: 'produce', label: 'Produce' },
              { value: 'bakery', label: 'Bakery' },
              { value: 'beverages', label: 'Beverages' },
              { value: 'dairy', label: 'Dairy' }
            ]}
          />
          <FilterDropdown
            value={filters.location}
            onChange={(value) => setFilters(prev => ({ ...prev, location: value }))}
            options={[
              { value: 'all', label: 'All Locations' },
              { value: 'Zone A', label: 'Zone A' },
              { value: 'Zone B', label: 'Zone B' },
              { value: 'Zone C', label: 'Zone C' }
            ]}
          />
        </div>
      </div>

      {/* Bulk Actions */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-2">
          <span className="text-sm text-gray-600">
            <input
              type="checkbox"
              checked={selectedProducts.length === filteredInventory.length}
              onChange={(e) => {
                if (e.target.checked) {
                  setSelectedProducts(filteredInventory.map(item => item.id))
                } else {
                  setSelectedProducts([])
                }
              }}
              className="rounded border-gray-300"
            />
            </span>
          <span className="text-sm font-medium">Select All ({selectedProducts.length} selected)</span>
        </div>
        <div className="flex items-center space-x-2">
          {selectedProducts.length > 0 && (
            <>
              <button
                onClick={() => handleBulkAction('restock')}
                className="px-4 py-2 text-green-700 bg-green-50 border border-green-200 rounded-lg hover:bg-green-100"
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Restock Selected
              </button>
              <button
                onClick={() => setShowBulkModal(true)}
                className="px-4 py-2 text-blue-700 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100"
              >
                <Edit className="w-4 h-4 mr-2" />
                Adjust Stock
              </button>
            </>
          )}
          <button
            onClick={handleExportInventory}
            className="px-4 py-2 text-gray-700 bg-gray-50 border border-gray-200 rounded-lg hover:bg-gray-100"
          >
            <Download className="w-4 h-4 mr-2" />
            Export to CSV
          </button>
        </div>
      </div>

      {/* Inventory Table */}
      <DataTable
        columns={columns}
        data={filteredInventory}
        key="id"
        searchable={false}
        pagination={{ pageSize: 25 }}
        emptyMessage="No inventory items found"
      />

      {/* Product Detail Modal */}
      {selectedProduct && (
        <Modal
          isOpen={!!selectedProduct}
          onClose={() => setSelectedProduct(null)}
          title={`Product Details - ${selectedProduct.productName}`}
          size="lg"
        >
          <div className="space-y-6">
            {/* Basic Information */}
            <div>
              <h4 className="font-semibold text-gray-900 mb-3">Product Information</h4>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-gray-600">Product ID:</span>
                  <div className="font-medium">{selectedProduct.productId}</div>
                </div>
                <div>
                  <span className="text-gray-600">SKU:</span>
                  <div className="font-medium">{selectedProduct.sku}</div>
                </div>
                <div>
                  <span className="text-gray-600">Name:</span>
                  <div className="font-medium">{selectedProduct.productName}</div>
                </div>
                <div>
                  <span className="text-gray-600">Category:</span>
                  <div className="font-medium">{selectedProduct.category}</div>
                </div>
                <div>
                  <span className="text-gray-600">Status:</span>
                  <div>{getStockStatusBadge(selectedProduct.status)}</div>
                </div>
              </div>
            </div>

            {/* Stock Information */}
            <div>
              <h4 className="font-semibold text-gray-900 mb-3">Stock Information</h4>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-gray-600">Current Stock:</span>
                  <div className="font-medium">{selectedProduct.currentStock}</div>
                </div>
                <div>
                  <span className="text-gray-600">Min Stock Level:</span>
                  <div className="font-medium">{selectedProduct.minimumStock}</div>
                </div>
                <div>
                  <span className="text-gray-600">Max Stock Level:</span>
                  <div className="font-medium">{selectedProduct.maximumStock}</div>
                </div>
                <div>
                  <span className="text-gray-600">Reorder Point:</span>
                  <div className="font-medium">{selectedProduct.reorderPoint}</div>
                </div>
                <div>
                  <span className="text-gray-600">Last Restock:</span>
                  <div className="font-medium">{formatDate(selectedProduct.lastRestockDate)}</div>
                </div>
              </div>
            </div>

            {/* Pricing Information */}
            <div>
              <h4 className="font-semibold text-gray-900 mb-3">Pricing Information</h4>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-gray-600">Unit Cost:</span>
                  <div className="font-medium">{formatCurrency(selectedProduct.unitCost)}</div>
                </div>
                <div>
                  <span className="text-gray-600">Unit Price:</span>
                  <div className="font-medium">{formatCurrency(selectedProduct.unitPrice)}</div>
                </div>
                <div>
                  <span className="text-gray-600">Total Value:</span>
                  <div className="font-medium text-green-600">{formatCurrency(selectedProduct.totalValue)}</div>
                </div>
                <div>
                  <span className="text-gray-600">Turnover Rate:</span>
                  <div className="font-medium">{selectedProduct.forecast.turnoverRate.toFixed(1)}x/month</div>
                </div>
              </div>
            </div>

            {/* Vendor Information */}
            <div>
              <h4 className="font-semibold text-gray-900 mb-3">Vendor Information</h4>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-gray-600">Vendor Name:</span>
                  <div className="font-medium">{selectedProduct.vendorName}</div>
                </div>
                <div>
                  <span className="text-gray-600">Email:</span>
                  <div className="font-medium">{selectedProduct.vendor.email}</div>
                </div>
                <div>
                  <span className="text-gray-600">Phone:</span>
                  <div className="font-medium">{selectedProduct.vendor.phone}</div>
                </div>
                <div>
                  <span className="text-gray-600">Rating:</span>
                  <div className="font-medium">{selectedProduct.vendor.rating}/5.0</div>
                </div>
                <div>
                  <span className="text-gray-600">Active Products:</span>
                  <div className="font-medium">{selectedProduct.vendor.activeProducts}</div>
                </div>
                <div>
                  <span className="text-gray-600">Address:</span>
                  <div className="font-medium">{selectedProduct.vendor.address}</div>
                </div>
              </div>
            </div>

            {/* Forecast Information */}
            <div>
              <h4 className="font-semibold text-gray-900 mb-3">Demand Forecast</h4>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-gray-600">7-Day Demand:</span>
                  <div className="font-medium">{selectedProduct.forecast.demand7Days} units</div>
                </div>
                <div>
                  <span className="text-gray-600">30-Day Demand:</span>
                  <div className="font-medium">{selectedProduct.forecast.demand30Days} units</div>
                </div>
                <div>
                  <span className="text-600">Reorder Lead Time:</span>
                  <div className="font-medium">{selectedProduct.forecast.reorderLeadTime} days</div>
                </div>
                <div>
                  <span className="text-gray-600">Monthly Variation:</span>
                  <div className="font-medium">±{selectedProduct.forecast.monthlyVariation}%</div>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => handleBulkAction('restock')}
                className="px-4 py-2 text-green-700 bg-green-50 border border-green-200 rounded-lg hover:bg-green-100"
                disabled={selectedProduct.status === 'in_stock'}
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Restock to Max
              </button>
              <button
                onClick={() => setSelectedProduct(null)}
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