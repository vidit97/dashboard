import React, { useState, useEffect, useCallback } from 'react'
import { GreApiService } from '../services/greApi'
import type { Subscription, TopicSubscription } from '../config/greApi'
import SearchFilterTable from '../components/SearchFilterTable'

interface SubscriptionStateProps {
  className?: string
}

export const SubscriptionState = ({ className }: SubscriptionStateProps) => {
  const [data, setData] = useState({
    activeSubscriptions: [] as Subscription[],
    topicBreakdown: [] as TopicSubscription[],
    totalCount: 0
  })
  const [page, setPage] = useState(0)
  const [pageSize, setPageSize] = useState(25)
  const [availableFilterData, setAvailableFilterData] = useState<{ client: string[] }>({ client: [] })
  const [selectedFilters, setSelectedFilters] = useState<Record<string, string[]>>({ client: [] })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedTopic, setSelectedTopic] = useState<string | null>(null)

  const fetchFullData = useCallback(async () => {
    try {
      setError(null)
      const full = await GreApiService.getActiveSubscriptions()
      
      // Populate available clients for the client selector
      const clients = Array.from(new Set((full.subscriptions || []).map((s: Subscription) => s.client))).sort()
      setAvailableFilterData({ client: clients })

      setData(prev => ({
        ...prev,
        topicBreakdown: full.topicBreakdown,
        totalCount: full.totalCount
      }))
    } catch (err) {
      console.error('Error fetching full subscription data:', err)
      setError(err instanceof Error ? err.message : 'Failed to load data')
    }
  }, [])

  const fetchPagedData = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      
      // Prepare server-side filters
      const baseFilters: Record<string, string> = { 
        'active': 'is.true', 
        'order': 'updated_at.desc' 
      }
      
      if (selectedTopic) baseFilters['topic'] = `eq.${selectedTopic}`
      if (selectedFilters.client && selectedFilters.client.length > 0) {
        baseFilters['client'] = `in.(${selectedFilters.client.join(',')})`
      }

      const paged = await GreApiService.getSubscriptionsPaginated({ 
        limit: pageSize, 
        offset: page * pageSize, 
        filters: baseFilters 
      })
      
      setData(prev => ({ 
        ...prev, 
        activeSubscriptions: paged.data,
        totalCount: paged.totalCount
      }))
    } catch (err) {
      console.error('Error fetching paged subscriptions:', err)
      setError(err instanceof Error ? err.message : 'Failed to load subscriptions')
    } finally {
      setLoading(false)
    }
  }, [page, pageSize, selectedTopic, selectedFilters])

  // Initial load - get both full data for filters and first page
  useEffect(() => {
    const initialLoad = async () => {
      try {
        setLoading(true)
        await Promise.all([fetchFullData(), fetchPagedData()])
      } finally {
        setLoading(false)
      }
    }
    initialLoad()
  }, [])

  // Reload paged data when filters change
  useEffect(() => {
    if (!loading) {
      fetchPagedData()
    }
  }, [page, pageSize, selectedTopic, selectedFilters])

  const qosColors = {
    0: '#10b981', // emerald-500
    1: '#f59e0b', // amber-500
    2: '#ef4444'  // red-500
  }

  const qosDescriptions = {
    0: 'At most once',
    1: 'At least once', 
    2: 'Exactly once'
  }

  const getQosBadge = (qos: number) => {
    const color = qosColors[qos as keyof typeof qosColors] || '#6b7280'
    const description = qosDescriptions[qos as keyof typeof qosDescriptions] || 'Unknown'
    return (
      <div title={description} style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
        <span 
          className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium text-white"
          style={{ backgroundColor: color }}
        >
          QoS {qos}
        </span>
      </div>
    )
  }

  const formatDateTime = (dateString: string) => {
    try {
      return new Date(dateString).toLocaleString()
    } catch {
      return dateString
    }
  }

  const handleRefresh = useCallback(async () => {
    await Promise.all([fetchFullData(), fetchPagedData()])
  }, [fetchFullData, fetchPagedData])

  const totalUniqueClients = new Set(data.activeSubscriptions.map(s => s.client)).size
  const qosDistribution = data.activeSubscriptions.reduce((acc, sub) => {
    acc[sub.qos] = (acc[sub.qos] || 0) + 1
    return acc
  }, {} as Record<number, number>)

  if (loading && data.activeSubscriptions.length === 0) {
    return (
      <div className={`bg-white rounded-lg shadow-sm border p-6 ${className}`}>
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 rounded w-1/3 mb-4"></div>
          <div className="h-4 bg-gray-200 rounded w-1/4 mb-6"></div>
          <div className="h-32 bg-gray-200 rounded mb-6"></div>
          <div className="h-64 bg-gray-200 rounded"></div>
        </div>
      </div>
    )
  }

  return (
    <div className={`bg-white rounded-lg shadow-sm border ${className}`}>
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-xl font-semibold text-gray-900">Subscription State</h3>
            <p className="mt-1 text-sm text-gray-500">
              Detailed view of active MQTT subscriptions with filtering and pagination
            </p>
          </div>
          <div className="chart-controls">
            <label htmlFor="topic-filter" className="sr-only">Filter by topic</label>
            <select
              id="topic-filter"
              value={selectedTopic || ''}
              onChange={(e) => { setSelectedTopic(e.target.value || null); setPage(0) }}
              className="select"
            >
              <option value="">All Topics ({data.topicBreakdown.length})</option>
              {data.topicBreakdown.map((topic) => (
                <option key={topic.topic} value={topic.topic}>
                  {topic.topic.length > 40 ? topic.topic.substring(0, 40) + '...' : topic.topic} ({topic.count})
                </option>
              ))}
            </select>
            <button
              onClick={handleRefresh}
              disabled={loading}
              className="button-secondary"
            >
              {loading ? 'Refreshing...' : 'Refresh'}
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-6">
        {error && (
          <div className="mb-6 rounded-md bg-red-50 p-4 border border-red-200">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-red-800">Error loading data</h3>
                <div className="mt-2 text-sm text-red-700">{error}</div>
              </div>
            </div>
          </div>
        )}

        {/* Statistics Cards (compact summary style) */}
        <div className="churn-summary mb-8 grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="churn-card bg-blue-50 rounded-lg p-4 border border-blue-200">
            <div className="churn-card-value text-2xl font-bold text-blue-700">{data.totalCount.toLocaleString()}</div>
            <div className="churn-card-label text-sm text-blue-600 font-medium">
              Total Active Subscriptions
              {selectedTopic && ` for ${selectedTopic.substring(0, 20)}${selectedTopic.length > 20 ? '...' : ''}`}
            </div>
          </div>
          <div className="churn-card bg-green-50 rounded-lg p-4 border border-green-200">
            <div className="churn-card-value text-2xl font-bold text-green-700">{data.topicBreakdown.length.toLocaleString()}</div>
            <div className="churn-card-label text-sm text-green-600 font-medium">Active Topics</div>
          </div>
          <div className="churn-card bg-purple-50 rounded-lg p-4 border border-purple-200">
            <div className="churn-card-value text-2xl font-bold text-purple-700">{totalUniqueClients.toLocaleString()}</div>
            <div className="churn-card-label text-sm text-purple-600 font-medium">Unique Clients{selectedTopic ? ' (current page)' : ''}</div>
          </div>
          <div className="churn-card bg-amber-50 rounded-lg p-4 border border-amber-200">
            <div className="churn-card-value text-2xl font-bold text-amber-700">{data.topicBreakdown.length > 0 ? (data.totalCount / data.topicBreakdown.length).toFixed(1) : '0'}</div>
            <div className="churn-card-label text-sm text-amber-600 font-medium">Avg Subs per Topic</div>
          </div>
        </div>

        {/* QoS Distribution (card-style) */}
        {data.activeSubscriptions.length > 0 && (
          <div className="mb-8">
            <h4 className="text-lg font-medium text-gray-900 mb-4">QoS Distribution {selectedTopic && `for ${selectedTopic}`}</h4>
            <div className="churn-summary grid grid-cols-1 md:grid-cols-3 gap-4">
              {[0, 1, 2].map((q) => {
                const count = qosDistribution[q] || 0
                const pct = data.activeSubscriptions.length > 0 ? ((count / data.activeSubscriptions.length) * 100).toFixed(1) : '0.0'
                return (
                  <div key={q} className="churn-card bg-gray-50 rounded-lg p-4 border border-gray-200">
                    <div className="flex items-center space-x-3">
                      {getQosBadge(q)}
                      <div>
                        <div className="text-lg font-semibold text-gray-900">{count}</div>
                        <div className="text-sm text-gray-600">subscription{count !== 1 ? 's' : ''} ({pct}%)</div>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Subscriptions Table */}
        <div>
          <h4 className="text-lg font-medium text-gray-900 mb-4">
            Active Subscriptions {selectedTopic && `for ${selectedTopic}`}
          </h4>

          <SearchFilterTable
            title="Active Subscriptions"
            data={data.activeSubscriptions}
            totalCount={data.totalCount}
            loading={loading}
            error={error}
            currentPage={page + 1}
            totalPages={Math.max(1, Math.ceil(data.totalCount / pageSize))}
            pageSize={pageSize}
            columns={[
              { key: 'client', label: 'Client ID', render: (value: any) => 
                <div className="text-sm font-medium text-gray-900 max-w-xs truncate" title={value}>{value}</div> 
              },
              { key: 'topic', label: 'Topic', render: (value: any) => 
                <div className="text-sm text-gray-900 max-w-xs truncate" title={value}>{value}</div> 
              },
              { key: 'qos', label: 'QoS', render: (value: any, row: any) => getQosBadge(row.qos) },
              { key: 'created_at', label: 'Created', render: (value: any) => 
                <div className="text-sm text-gray-500">{formatDateTime(value)}</div>
              },
              { key: 'updated_at', label: 'Last Updated', render: (value: any) => 
                <div className="text-sm text-gray-500">{formatDateTime(value)}</div>
              }
            ]}
            filterConfigs={[
              { key: 'client', label: 'Client IDs', searchable: true, type: 'multiselect' }
            ]}
            availableFilterData={{ ...availableFilterData }}
            selectedFilters={selectedFilters}
            onFilterChange={(filters) => { setSelectedFilters(filters); setPage(0) }}
            onPageChange={(newPage) => { setPage(Math.max(0, newPage - 1)) }}
            onRefresh={handleRefresh}
            onClearFilters={() => { setSelectedFilters({ client: [] }); setPage(0) }}
            className="subscriptions-table"
          />
        </div>

        {data.activeSubscriptions.length === 0 && !loading && !error && (
          <div className="text-center py-12">
            <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2M4 13h2m13-8V4a1 1 0 00-1-1H7a1 1 0 00-1 1v1" />
            </svg>
            <h3 className="mt-2 text-sm font-medium text-gray-900">No active subscriptions found</h3>
            <p className="mt-1 text-sm text-gray-500">
              {selectedTopic 
                ? `No active subscriptions found for ${selectedTopic}` 
                : 'There are currently no active MQTT subscriptions.'
              }
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
