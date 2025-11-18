'use client';

import React from 'react';
import { TrendingUp, TrendingDown, Users, Package, ShoppingCart, DollarSign, Activity, Clock, AlertTriangle, Target, Brain } from 'lucide-react';
import { StatCard } from '@/components/shared/StatCard';
import { DataTable } from '@/components/shared/DataTable';
import { Badge } from '@/components/shared/Badge';
import { useRealTimeData, useAIRecommendations, useMockData } from '@/lib/hooks';
import { formatCurrency, formatDate, formatPercentage, getStatusColor } from '@/lib/utils';
import { ChartContainer } from '@/components/shared';

interface OverviewPageProps {}

export default function OverviewPage({}: OverviewPageProps) {
  const { data: metricsData, loading: metricsLoading } = useRealTimeData('metrics');
  const { data: aiData } = useAIRecommendations();
  const { data: ordersData, loading: ordersLoading } = useRealTimeData('orders');
  const { data: usersData } = useRealTimeData('users');
  const mockTasks = [
    { id: '1', title: 'Approve 3 vendor applications', status: 'pending', points: 50 },
    { id: '2', title: 'Review dashboard performance', status: 'completed', points: 25 },
    { id: '3', title: 'Check system health', status: 'completed', points: 10 },
  ];

  const metrics = metricsData || [
    {
      id: 'revenue',
      title: 'Total Revenue',
      value: 135000,
      change: 22.8,
      trend: 'up',
      color: 'green',
      icon: <DollarSign className="h-6 w-6" />
    },
    {
      id: 'orders',
      title: 'Active Orders',
      value: 234,
      change: 12.5,
      trend: 'up',
      color: 'blue',
      icon: <ShoppingCart className="h-6 w-6" />
    },
    {
      id: 'users',
      title: 'Total Users',
      value: 8590,
      change: 8.3,
      trend: 'up',
      color: 'orange',
      icon: <Users className="h-6 w-6" />
    },
    {
      id: 'health',
      title: 'System Health',
      value: '99.9%',
      trend: 'neutral',
      color: 'success',
      icon: <Activity className="h-6 w-6" />
    },
    {
      id: 'avgOrderValue',
      title: 'Avg Order Value',
      value: 45.80,
      change: -2.1,
      trend: 'down',
      color: 'red',
      icon: <Package className="h-6 w-6" />
    },
  ];

  const recommendations = aiData || [
    {
      id: 'ai_001',
      type: 'route_optimization',
      title: 'Optimize Downtown Routes',
      description: 'Route A → B → C saves 15% time during peak hours',
      impact: 'high',
      metrics: { timeSavings: '15%', costSavings: '$120/day', efficiencyGain: '25%' },
    },
    {
      id: 'ai_002',
      type: 'driver_matching',
      title: 'Assign Best Driver to Order',
      description: 'James Wilson: 98% match based on location, rating, and availability',
      impact: 'high',
      metrics: { timeSavings: '8 min', efficiencyGain: '95%' },
    },
    {
      id: 'ai_003',
      type: 'pricing',
      title: 'Increase Peak Hour Pricing',
      description: 'Demand indicates optimal fee is $3.49 for downtown area',
      impact: 'medium',
      metrics: { costSavings: '$450/day', revenueGain: '18%' },
    },
  ];

  return (
    <div className="space-y-6 p-6">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Dashboard Overview</h1>
        <p className="text-gray-600">Real-time platform monitoring and AI-powered insights</p>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {metrics.map((metric) => (
          <StatCard
            key={metric.id}
            title={metric.title}
            value={metric.value}
            change={metric.change}
            trend={metric.trend}
            color={metric.color}
            icon={metric.icon}
            loading={metricsLoading}
          />
        ))}
      </div>

      {/* AI Recommendations */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-gray-900">
            <Brain className="h-5 w-5 mr-2" />
            AI Recommendations
          </h2>
          <Badge variant="info" size="sm">
            {recommendations.length}
          </Badge>
        </div>
        
        <div className="space-y-3">
          {recommendations.map((rec) => (
            <div key={rec.id} className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-start justify-between mb-2">
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-gray-900">{rec.title}</h3>
                  <Badge variant={rec.impact === 'high' ? 'error' : rec.impact === 'medium' ? 'warning' : 'info'} size="sm">
                    {rec.impact.toUpperCase()}
                  </Badge>
                </div>
                <button
                  onClick={() => console.log('Applied recommendation:', rec.id)}
                  className="px-3 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm font-medium"
                >
                  {rec.action.label}
                </button>
              </div>
              <p className="text-sm text-gray-600 mt-2">{rec.description}</p>
              {rec.metrics && (
                <div className="mt-3 grid grid-cols-3 gap-2 text-xs">
                  {rec.metrics.timeSavings && (
                    <div className="text-center">
                      <div className="font-bold text-green-600">{rec.metrics.timeSavings}</div>
                      <div className="text-gray-500">Time saved</div>
                    </div>
                  )}
                  {rec.metrics.costSavings && (
                    <div className="text-center">
                      <div className="font-bold text-green-600">{rec.metrics.costSavings}</div>
                      <div className="text-gray-500">Cost saved</div>
                    </div>
                  )}
                  {rec.metrics.efficiencyGain && (
                    <div className="text-center">
                      <div className="font-bold text-green-600">{rec.metrics.efficiencyGain}</div>
                      <div className="text-gray-500">Efficiency gain</div>
                    </div>
                  )}
                </div>
              )}
            </div>
            </div>
          ))}
        </div>
      </div>

      {/* Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Orders */}
        <div className="lg:col-span-2">
          <ChartContainer title="Recent Orders" loading={ordersLoading}>
            <div className="h-4 text-gray-700 mb-4">Recent orders (Last 7 days)</div>
            <div className="h-64">
              {/* Placeholder for orders chart */}
              <div className="flex items-center justify-center h-full">
                <Target className="h-8 w-8 text-gray-400" />
                <div className="text-center">
                  <p className="text-gray-500 mb-2">Orders visualization</p>
                  <p className="text-xs text-gray-400">Chart would show order trends</p>
                </div>
              </div>
            </div>
          </ChartContainer>
        </div>

        {/* User Activity */}
        <div className="lg:col-span-1">
          <ChartContainer title="User Activity" loading={usersLoading}>
            <div className="h-4 text-gray-700 mb-4">User registration trends</div>
            <div className="h-64">
              {/* Placeholder for user activity chart */}
              <div className="flex items-center justify-center h-full">
                <Users className="h-8 w-8 text-gray-400" />
                <div className="text-center">
                  <p className="text-gray-500 mb-2">User activity visualization</p>
                  <p className="text-xs text-gray-400">Chart would show new vs returning users</p>
                </div>
              </div>
            </div>
          </ChartContainer>
        </div>

        {/* Quick Actions */}
        <div className="lg:col-span-1">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
          <div className="grid grid-cols-1 gap-4">
            <button className="p-4 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 hover:shadow-md transition-all">
              <div className="flex items-center justify-center mb-2">
                <div className="h-8 w-8 bg-blue-600 rounded-full flex items-center justify-center">
                  <Plus className="h-4 w-4 text-white" />
                </div>
              </div>
              <p className="text-sm font-medium text-gray-700">New Vendor</p>
              <p className="text-xs text-gray-500">Quick setup</p>
            </button>

            <button className="p-4 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 hover:shadow-md transition-all">
              <div className="flex items-center justify-center mb-2">
                <div className="h-8 w-8 bg-green-600 rounded-full flex items-center justify-center">
                  <Users className="h-4 w-4 text-white" />
                </div>
              </div>
              <p className="text-sm font-medium text-gray-700">View Support Tickets</p>
              <p className="text-xs text-gray-500">Priority queue</p>
            </button>

            <button className="p-4 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 hover:shadow-md transition-all">
              <div className="flex items-center justify-center mb-2">
                <div className="h-8 w-8 bg-orange-600 rounded-full flex items-center justify-center">
                  <AlertTriangle className="h-4 w-4 text-white" />
                </div>
              </div>
              <p className="text-sm font-medium text-gray-700">System Alert</p>
              <p className="text-xs text-gray-500">Broadcast message</p>
            </button>

            <button className="p-4 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 hover:shadow-md transition-all">
              <div className="flex items-center justify-center mb-2">
                <div className="h-8 w-8 bg-purple-600 rounded-full flex items-center justify-center">
                  <Brain className="h-4 w-4 text-white" />
                </div>
              </div>
              <p className="text-sm font-medium text-gray-700">Generate Report</p>
              <p className="text-xs text-gray-500">Monthly analysis</p>
            </button>
          </div>
        </div>

        {/* Tasks */}
        <div className="lg:col-span-1 row-span-2">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Tasks</h3>
          <div className="space-y-3">
            {mockTasks.map((task) => (
              <div key={task.id} className="bg-white border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-all">
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      checked={task.status === 'completed'}
                      className="h-4 w-4 text-blue-600 rounded"
                      readOnly
                    />
                    <div className="ml-3">
                      <span className={`text-sm font-medium ${
                        task.status === 'completed' ? 'text-green-600 line-through' : 'text-gray-700'
                      }`}>
                        {task.title}
                      </span>
                    </div>
                  </div>
                  <Badge variant={task.status === 'completed' ? 'success' : 'warning'} size="sm">
                    {task.points} pts
                  </Badge>
                </div>
              </div>
              <p className="text-sm text-gray-600 mt-2">{task.description}</p>
            </div>
          ))}
          </div>
        </div>
      </div>

      {/* Live Map Placeholder */}
      <div className="grid grid-cols-1 lg:col-span-3">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Live Operations</h3>
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <div className="flex items-center justify-center h-48 bg-gray-100 rounded-lg">
            <Map className="h-12 w-12 text-gray-400" />
            <div className="text-center text-gray-500">
              <p className="text-lg font-medium mb-2">Live Map View</p>
              <p className="text-sm text-gray-400">Real-time tracking of drivers and orders</p>
              </div>
          </div>
        </div>
      </div>

      {/* Notifications */}
      <div className="grid grid-cols-1 lg:col-span-2">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">System Notifications</h3>
        <div className="space-y-2">
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <div className="flex items-center">
              <AlertTriangle className="h-5 w-5 text-yellow-600" />
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-900">High Volume Alert</p>
                <p className="text-xs text-gray-600">Order volume 40% above average</p>
              </div>
            </div>
          </div>

          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <div className="flex items-center">
              <CheckCircle className="h-5 w-5 text-green-600" />
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-900">System Update Complete</p>
                <p className="text-xs text-gray-600">Platform updated to v2.1.0</p>
              </div>
            </div>
          </div>
        </div>
      </div>
      </div>
    </div>

      {/* Recent Activity Table */}
      <div className="mt-8">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Recent Activity</h2>
        <DataTable
          data={ordersData || []}
          loading={ordersLoading}
          columns={[
            {
              key: 'id',
              label: 'Order ID',
              sortable: true,
              width: 'w-20'
            },
            {
              key: 'customer',
              label: 'Customer',
              sortable: true,
              width: 'w-32'
            },
            {
              key: 'vendor',
              label: 'Vendor',
              sortable: true,
              width: 'w-32'
            },
            {
              key: 'driver',
              label: 'Driver',
              sortable: true,
              width: 'w-32'
            },
            {
              key: 'status',
              label: 'Status',
              sortable: true,
              width: 'w-24',
              render: (value: any) => {
                const status = String(value);
                const color = getStatusColor(status);
                return (
                  <Badge 
                    variant={status === 'delivered' ? 'success' : status === 'cancelled' ? 'error' : 'warning'}
                    size="sm"
                  >
                    {status.charAt(0).toUpperCase() + status.slice(1)}
                  </Badge>
                );
              }
            },
            {
              key: 'total',
              label: 'Total',
              sortable: true,
              width: 'w-24',
              render: (value: any) => formatCurrency(value)
              }
            },
            {
              key: 'createdAt',
              label: 'Created',
              sortable: true,
              width: 'w-32',
              render: (value: any) => formatDate(value, 'MM/dd/yyyy')
              }
            }
          ]}
          pageSize={10}
          selectable
          onRowClick={(row) => console.log('Order clicked:', row)}
        />
      </div>
    </div>
  );
}