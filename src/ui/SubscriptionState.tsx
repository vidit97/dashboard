import React, { useState, useEffect } from 'react'
import { GreApiService } from '../services/greApi'
import type { Subscription, TopicSubscription } from '../config/greApi'
import SearchFilterTable from '../components/SearchFilterTable'

interface SubscriptionStateProps {
  className?: string
}

export const SubscriptionState = ({ className }: SubscriptionStateProps) => {
  const [data, setData] = useState({
    activeSubscriptions: [],
    topicBreakdown: []
  })
  const [page, setPage] = useState(0)
  const [pageSize, setPageSize] = useState(10)
  const [total, setTotal] = useState(0)
  const [topN, setTopN] = useState(10)
  const [availableFilterData, setAvailableFilterData] = useState<{ client: string[] }>({ client: [] })
  const [selectedFilters, setSelectedFilters] = useState<Record<string, string[]>>({ client: [] })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [selectedTopic, setSelectedTopic] = useState(null)

  const fetchData = async () => {
    try {
      setLoading(true)
      setError(null)
      // Prepare server-side filters
      const baseFilters: Record<string, string> = { 'active': 'is.true', 'order': 'updated_at.desc' }
      if (selectedTopic) baseFilters['topic'] = `eq.${selectedTopic}`
      if (selectedFilters.client && selectedFilters.client.length > 0) {
        baseFilters['client'] = `in.(${selectedFilters.client.join(',')})`
      }

      // Fetch paginated subscriptions for table and full topic breakdown for chart
      const [paged, full] = await Promise.all([
        GreApiService.getSubscriptionsPaginated({ limit: pageSize, offset: page * pageSize, filters: baseFilters }),
        GreApiService.getActiveSubscriptions()
      ])

      // populate available clients for the client selector
      const clients = Array.from(new Set((full.subscriptions || []).map((s: Subscription) => s.client))).sort()
      setAvailableFilterData({ client: clients })

      setData({
        activeSubscriptions: paged.data,
        topicBreakdown: full.topicBreakdown
      })
      setTotal(paged.totalCount)
    } catch (err) {
      console.error('Error fetching subscription state:', err)
      setError(err instanceof Error ? err.message : 'Unknown error')
      // Mock data for demo purposes
      setData({
        activeSubscriptions: [
          { id: '1', client: 'client-sensor-01', topic: 'sensor/temperature', qos: 1, active: true, created_at: '2024-01-15T10:30:00Z', updated_at: '2024-01-15T10:30:00Z' },
          { id: '2', client: 'client-dashboard', topic: 'sensor/temperature', qos: 2, active: true, created_at: '2024-01-15T11:00:00Z', updated_at: '2024-01-15T11:00:00Z' },
          { id: '3', client: 'client-mobile-app', topic: 'alerts/critical', qos: 2, active: true, created_at: '2024-01-15T09:45:00Z', updated_at: '2024-01-15T09:45:00Z' },
          { id: '4', client: 'client-logger', topic: 'logs/system', qos: 0, active: true, created_at: '2024-01-15T08:20:00Z', updated_at: '2024-01-15T08:20:00Z' }
        ],
        topicBreakdown: [
          { topic: 'sensor/temperature', count: 2, qos_breakdown: { '1': 1, '2': 1 }, clients: ['client-sensor-01', 'client-dashboard'] },
          { topic: 'alerts/critical', count: 1, qos_breakdown: { '2': 1 }, clients: ['client-mobile-app'] },
          { topic: 'logs/system', count: 1, qos_breakdown: { '0': 1 }, clients: ['client-logger'] }
        ]
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
  fetchData()
  }, [])

  // refetch when page, pageSize, selectedTopic, or selectedFilters change
  useEffect(() => {
    const load = async () => {
      setLoading(true)
      try {
        const baseFilters: Record<string, string> = { 'active': 'is.true', 'order': 'updated_at.desc' }
        if (selectedTopic) baseFilters['topic'] = `eq.${selectedTopic}`
        if (selectedFilters.client && selectedFilters.client.length > 0) {
          baseFilters['client'] = `in.(${selectedFilters.client.join(',')})`
        }

        const paged = await GreApiService.getSubscriptionsPaginated({ limit: pageSize, offset: page * pageSize, filters: baseFilters })
        setData(prev => ({ ...prev, activeSubscriptions: paged.data }))
        setTotal(paged.totalCount)
      } catch (err) {
        console.error('Error fetching paged subscriptions:', err)
        setError(err instanceof Error ? err.message : 'Unknown error')
      } finally {
        setLoading(false)
      }
    }
    // avoid initial double-fetch
    if (!loading) load()
  }, [page, pageSize, selectedTopic, selectedFilters])

  const qosColors = {
    0: '#10b981', // emerald
    1: '#f59e0b', // amber
    2: '#ef4444'  // red
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
          className="text-xs font-medium rounded-full text-white cursor-help"
          style={{ backgroundColor: color, width: 56, height: 22, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', borderRadius: 12 }}
        >
          QoS {qos}
        </span>
      </div>
    )
  }

  const filteredSubscriptions = data.activeSubscriptions

  const formatDateTime = (dateString: string) => {
    try {
      return new Date(dateString).toLocaleString()
    } catch {
      return dateString
    }
  }

  if (loading) {
    return (
      <div className={`bg-white rounded-lg shadow p-6 ${className}`}>
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="h-48 bg-gray-200 rounded"></div>
        </div>
      </div>
    )
  }

  return (
    <div className={`bg-white rounded-lg shadow p-6 ${className}`}>
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold text-gray-900">Subscription State</h3>
        <div className="flex items-center gap-4">
          <select
            value={selectedTopic || ''}
            onChange={(e) => setSelectedTopic(e.target.value || null)}
            className="border border-gray-300 rounded px-3 py-1 text-sm"
          >
            <option value="">All Topics</option>
            {data.topicBreakdown.map((topic) => (
              <option key={topic.topic} value={topic.topic}>
                {topic.topic} ({topic.count})
              </option>
            ))}
          </select>
          <button
            onClick={fetchData}
            className="px-3 py-1 bg-blue-500 text-white text-sm rounded hover:bg-blue-600"
          >
            Refresh
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded text-red-700 text-sm">
          {error}
        </div>
      )}

    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-blue-50 rounded-lg p-4">
      <div className="text-2xl font-bold text-blue-600">{total}</div>
          <div className="text-sm text-blue-800">Total Active Subscriptions</div>
        </div>
        <div className="bg-green-50 rounded-lg p-4">
          <div className="text-2xl font-bold text-green-600">{data.topicBreakdown.length}</div>
          <div className="text-sm text-green-800">Active Topics</div>
        </div>
        <div className="bg-purple-50 rounded-lg p-4">
          <div className="text-2xl font-bold text-purple-600">
            {new Set(data.activeSubscriptions.map(s => s.client)).size}
          </div>
          <div className="text-sm text-purple-800">Unique Clients</div>
        </div>
      </div>

      <div className="mb-6">
        <h4 className="text-md font-medium text-gray-700 mb-3">
          QoS Distribution {selectedTopic && `for ${selectedTopic}`}
        </h4>
        <div className="flex gap-2 flex-wrap">
          {Object.entries(
            filteredSubscriptions.reduce((acc, sub) => {
              acc[sub.qos] = (acc[sub.qos] || 0) + 1
              return acc
            }, {} as Record<number, number>)
          ).map(([qos, count]) => (
            <div key={qos} className="flex items-center gap-2 bg-gray-50 rounded-lg p-3">
              {getQosBadge(Number(qos))}
              <span className="text-sm font-medium">{count} subscription{count !== 1 ? 's' : ''}</span>
            </div>
          ))}
        </div>
      </div>

      <div>
        <h4 className="text-md font-medium text-gray-700 mb-3">
          Active Subscriptions {selectedTopic && `for ${selectedTopic}`} ({filteredSubscriptions.length})
        </h4>

        <SearchFilterTable
          title="Active Subscriptions"
          data={filteredSubscriptions}
          totalCount={total}
          loading={loading}
          error={error}
          currentPage={page + 1}
          totalPages={Math.max(1, Math.ceil(total / pageSize))}
          pageSize={pageSize}
          columns={[
            { key: 'client', label: 'Client ID', render: (value: any) => <div className="max-w-xs truncate" title={value}>{value}</div> },
            { key: 'topic', label: 'Topic', render: (value: any) => <div className="max-w-xs truncate" title={value}>{value}</div> },
            { key: 'qos', label: 'QoS', render: (value: any, row: any) => getQosBadge(row.qos) },
            { key: 'created_at', label: 'Created', render: (value: any) => formatDateTime(value) },
            { key: 'updated_at', label: 'Last Updated', render: (value: any) => formatDateTime(value) }
          ]}
          filterConfigs={[
            { key: 'client', label: 'Client IDs', searchable: true, type: 'multiselect' }
          ]}
          availableFilterData={{ ...availableFilterData }}
          selectedFilters={selectedFilters}
          onFilterChange={(filters) => { setSelectedFilters(filters); setPage(0) }}
          onPageChange={(newPage) => { setPage(Math.max(0, newPage - 1)); window.scrollTo({ top: 0, behavior: 'smooth' }) }}
          onRefresh={() => fetchData()}
          onClearFilters={() => { setSelectedFilters({ client: [] }); setPage(0); fetchData() }}
          className="subscriptions-table"
        />
      </div>

      {filteredSubscriptions.length === 0 && !loading && (
        <div className="text-center py-8 text-gray-500">
          {selectedTopic ? `No active subscriptions found for ${selectedTopic}` : 'No active subscriptions found'}
        </div>
      )}
    </div>
  )
}
