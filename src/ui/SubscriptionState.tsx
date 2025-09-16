import React, { useState, useEffect, useCallback } from 'react'
import { GreApiService } from '../services/greApi'
import type { Subscription, TopicSubscription } from '../config/greApi'

interface SubscriptionStateProps {
  className?: string
  refreshTrigger?: number // Used to trigger refresh from parent
}

interface ClientSubscription {
  client: string
  qos: number
  created_at: string
  session_id: number | null
}

export const SubscriptionState = ({ className, refreshTrigger }: SubscriptionStateProps) => {
  const [data, setData] = useState({
    topicBreakdown: [] as TopicSubscription[],
    totalCount: 0
  })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedTopic, setSelectedTopic] = useState<string | null>(null)
  const [clientSearch, setClientSearch] = useState('')
  const [loadingClients, setLoadingClients] = useState(false)
  const [topicClients, setTopicClients] = useState<ClientSubscription[]>([])

  const fetchData = useCallback(async (forceRefresh = false) => {
    try {
      setLoading(true)
      setError(null)
      const result = await GreApiService.getActiveSubscriptions(undefined, forceRefresh)

      setData({
        topicBreakdown: result.topicBreakdown,
        totalCount: result.totalCount
      })
    } catch (err) {
      console.error('Error fetching subscription data:', err)
      setError(err instanceof Error ? err.message : 'Failed to load data')
    } finally {
      setLoading(false)
    }
  }, [])

  const fetchTopicClients = useCallback(async (topic: string) => {
    try {
      setLoadingClients(true)
      // Fetch detailed subscriptions for the selected topic
      const subscriptions = await GreApiService.getSubscriptionsPaginated({
        limit: 1000,
        offset: 0,
        filters: {
          topic: `eq.${topic}`,
          active: 'eq.true'
        }
      })

      const clients: ClientSubscription[] = subscriptions.data.map(sub => ({
        client: sub.og_client || sub.client,
        qos: sub.qos,
        created_at: sub.created_at,
        session_id: sub.session_id
      }))

      setTopicClients(clients)
    } catch (err) {
      console.error('Error fetching topic clients:', err)
      setTopicClients([])
    } finally {
      setLoadingClients(false)
    }
  }, [])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  // Listen for refresh trigger changes
  useEffect(() => {
    if (refreshTrigger && refreshTrigger > 0) {
      fetchData(true) // Force refresh when trigger changes
    }
  }, [refreshTrigger, fetchData])

  useEffect(() => {
    if (selectedTopic) {
      fetchTopicClients(selectedTopic)
    } else {
      setTopicClients([])
    }
  }, [selectedTopic, fetchTopicClients])

  const handleRefresh = useCallback(async () => {
    await fetchData(true) // Force refresh when user clicks refresh button
    if (selectedTopic) {
      await fetchTopicClients(selectedTopic)
    }
  }, [fetchData, selectedTopic, fetchTopicClients])

  const filteredClients = topicClients.filter(client =>
    clientSearch === '' || 
    client.client.toLowerCase().includes(clientSearch.toLowerCase())
  )

  if (loading && data.topicBreakdown.length === 0) {
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
    <div className={`chart-section ${className || ''}`}>
      {/* Header */}
      <div className="chart-header">
        <div>
          <h3 className="chart-title">Subscription State</h3>
          <p className="chart-subtitle">
            Filter by topic to view unique devices and their subscription details
          </p>
        </div>
        <div className="chart-controls">
          <button
            onClick={handleRefresh}
            disabled={loading}
            className="button-secondary"
          >
            {loading ? 'Refreshing...' : 'Refresh'}
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="chart-content">
        {error && (
          <div className="error-message">
            <strong>Error loading data:</strong> {error}
          </div>
        )}

        {/* Total Topics Available Tile */}
        <div className="metric-card" style={{ marginBottom: '16px', borderLeftColor: '#3b82f6' }}>
          <div className="metric-label">Total Topics Available</div>
          <div className="metric-value">{data.topicBreakdown.length.toLocaleString()}</div>
        </div>

        {/* Filter by Topic */}
        <div style={{ marginBottom: '16px' }}>
          <label htmlFor="topic-filter" className="form-label">
            Filter by Topic
          </label>
          <select
            id="topic-filter"
            value={selectedTopic || ''}
            onChange={(e) => setSelectedTopic(e.target.value || null)}
            className="select"
            style={{ width: '100%' }}
          >
            <option value="">Select a topic to view its clients...</option>
            {data.topicBreakdown.map((topic) => (
              <option key={topic.topic} value={topic.topic}>
                {topic.topic} ({topic.clients.length} unique devices)
              </option>
            ))}
          </select>
        </div>

        {/* Topic Details and Clients Table */}
        {selectedTopic && (
          <>
            {/* Topic Statistics */}
            <div className="summary-cards" style={{ marginBottom: '16px' }}>
              <div className="metric-card" style={{ borderLeftColor: '#0369a1' }}>
                <div className="metric-label">Active Subscriptions</div>
                <div className="metric-value">
                  {data.topicBreakdown.find(t => t.topic === selectedTopic)?.count || 0}
                </div>
              </div>
              <div className="metric-card" style={{ borderLeftColor: '#7c3aed' }}>
                <div className="metric-label">Unique Devices</div>
                <div className="metric-value">
                  {data.topicBreakdown.find(t => t.topic === selectedTopic)?.clients.length || 0}
                </div>
              </div>
              <div className="metric-card" style={{ borderLeftColor: '#d97706' }}>
                <div className="metric-label">Selected Topic</div>
                <div className="metric-value" style={{ fontSize: '0.875rem', fontFamily: 'monospace' }}>
                  {selectedTopic.length > 25 ? `${selectedTopic.substring(0, 25)}...` : selectedTopic}
                </div>
              </div>
            </div>

            {/* Client Search */}
            <div style={{ marginBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <input
                  type="text"
                  placeholder="Search clients by name..."
                  value={clientSearch}
                  onChange={(e) => setClientSearch(e.target.value)}
                  className="text-input"
                  style={{ flex: 1 }}
                />
                <span className="text-muted" style={{ fontSize: '0.875rem' }}>
                  {filteredClients.length} of {topicClients.length} clients
                </span>
              </div>
            </div>

            {/* Clients Table */}
            <div className="table-container">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Client ID</th>
                    <th>Session ID</th>
                    <th>QoS Level</th>
                    <th>Created At</th>
                  </tr>
                </thead>
                <tbody>
                  {loadingClients ? (
                    <tr>
                      <td colSpan={4} className="text-center text-muted">
                        Loading clients...
                      </td>
                    </tr>
                  ) : filteredClients.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="text-center text-muted">
                        {clientSearch ? 'No clients match your search' : 'No clients found for this topic'}
                      </td>
                    </tr>
                  ) : (
                    filteredClients.map((client, index) => (
                      <tr key={`${client.client}-${index}`}>
                        <td style={{ fontFamily: 'monospace', fontWeight: '500' }}>
                          {client.client}
                        </td>
                        <td className="text-muted">
                          {client.session_id || '-'}
                        </td>
                        <td>
                          <span className={`status-badge status-qos-${client.qos}`}>
                            QoS {client.qos}
                          </span>
                        </td>
                        <td className="text-muted">
                          {new Date(client.created_at).toLocaleString()}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </>
        )}

        {/* Empty State */}
        {!selectedTopic && (
          <div className="no-data">
            <p>Select a topic from the dropdown above to view its unique clients and subscription details.</p>
          </div>
        )}
      </div>
    </div>
  )
}
