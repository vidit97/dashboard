import React, { useState, useEffect, useCallback, useMemo } from 'react'
import axios from 'axios'
import { useGlobalState } from '../hooks/useGlobalState'
import { Event as ApiEvent } from '../../types/api'

// Get API base URL
const API_BASE_URL = (import.meta as any).env?.VITE_GRE_API_BASE_URL || 'http://localhost:3001'

// Use the ApiEvent type from our API types
type Event = ApiEvent

export const V2EventsPage: React.FC = () => {
  const { state } = useGlobalState()
  const [events, setEvents] = useState<Event[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)

  // Filter states
  const [actionFilter, setActionFilter] = useState<string>('all')
  const [topicFilter, setTopicFilter] = useState('')
  const [clientFilter, setClientFilter] = useState('')
  const [usernameFilter, setUsernameFilter] = useState('')
  const [qosFilter, setQosFilter] = useState<string>('all')
  const [retainFilter, setRetainFilter] = useState(false)
  const [timeRangeFilter, setTimeRangeFilter] = useState<string>('24h')

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize] = useState(50)
  const [totalItems, setTotalItems] = useState(0)
  const [totalPages, setTotalPages] = useState(0)

  // Saved views
  const [savedViews, setSavedViews] = useState<Array<{name: string, filters: any}>>([])

  // Helper function to calculate timestamp for time range filters
  const getTimeRangeFilter = (timeRange: string): string | null => {
    const now = new Date()
    let hoursAgo: number

    switch (timeRange) {
      case '1h': hoursAgo = 1; break
      case '6h': hoursAgo = 6; break
      case '24h': hoursAgo = 24; break
      case '7d': hoursAgo = 24 * 7; break
      case '30d': hoursAgo = 24 * 30; break
      default: return null
    }

    const timeAgo = new Date(now.getTime() - hoursAgo * 60 * 60 * 1000)
    return timeAgo.toISOString()
  }

  // Fetch events data using real PostgREST API with proper filters
  const fetchEvents = useCallback(async (page: number = 1) => {
    try {
      setLoading(true)
      setError(null)

      // Build query parameters
      const params = new URLSearchParams()

      // Pagination
      const limit = pageSize
      const offset = (page - 1) * pageSize
      params.append('limit', limit.toString())
      params.append('offset', offset.toString())

      // Sorting
      params.append('order', 'ts.desc') // Latest events first

      // Filters
      if (actionFilter && actionFilter !== 'all') {
        params.append('action', `eq.${actionFilter}`)
      }

      if (topicFilter.trim()) {
        params.append('topic', `ilike.*${topicFilter.trim()}*`)
      }

      if (clientFilter.trim()) {
        params.append('client', `ilike.*${clientFilter.trim()}*`)
      }

      if (usernameFilter.trim()) {
        params.append('username', `ilike.*${usernameFilter.trim()}*`)
      }

      if (qosFilter && qosFilter !== 'all') {
        params.append('qos', `eq.${qosFilter}`)
      }

      if (retainFilter) {
        params.append('retain', 'eq.true')
      }

      // Time range filter
      const timeRangeTimestamp = getTimeRangeFilter(timeRangeFilter)
      if (timeRangeTimestamp) {
        params.append('ts', `gte.${timeRangeTimestamp}`)
      }

      // Add count header to get total
      const headers = {
        'Prefer': 'count=exact'
      }

      // Make API request
      const response = await axios.get(`${API_BASE_URL}/events?${params.toString()}`, { headers })

      const eventData = response.data as Event[]
      const totalCountHeader = response.headers['content-range']

      // Parse total count from content-range header (format: "0-49/total")
      let totalCount = eventData.length
      if (totalCountHeader) {
        const match = totalCountHeader.match(/\/(\d+)$/)
        if (match) {
          totalCount = parseInt(match[1], 10)
        }
      }

      setEvents(eventData)
      setTotalItems(totalCount)
      setTotalPages(Math.ceil(totalCount / pageSize))
      setCurrentPage(page)
      setLastUpdated(new Date())

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch events'
      setError(errorMessage)
      console.error('Error fetching events:', err)
    } finally {
      setLoading(false)
    }
  }, [actionFilter, topicFilter, clientFilter, usernameFilter, qosFilter, retainFilter, timeRangeFilter, pageSize])

  // Load events on mount and when filters change
  useEffect(() => {
    fetchEvents(1) // Reset to page 1 when filters change
  }, [actionFilter, topicFilter, clientFilter, usernameFilter, qosFilter, retainFilter, timeRangeFilter])

  // Load events when page changes
  useEffect(() => {
    if (currentPage > 1) {
      fetchEvents(currentPage)
    }
  }, [currentPage, fetchEvents])

  // Auto-refresh
  useEffect(() => {
    if (state.autoRefresh) {
      const interval = setInterval(() => fetchEvents(currentPage), state.refreshInterval * 1000)
      return () => clearInterval(interval)
    }
  }, [fetchEvents, currentPage, state.autoRefresh, state.refreshInterval])

  // Clear filters
  const clearFilters = () => {
    setActionFilter('all')
    setTopicFilter('')
    setClientFilter('')
    setUsernameFilter('')
    setQosFilter('all')
    setRetainFilter(false)
    setTimeRangeFilter('24h')
  }

  // Save current view
  const saveCurrentView = () => {
    const viewName = prompt('Enter a name for this view:')
    if (viewName) {
      const filters = {
        actionFilter,
        topicFilter,
        clientFilter,
        usernameFilter,
        qosFilter,
        retainFilter,
        timeRangeFilter
      }
      setSavedViews(prev => [...prev, { name: viewName, filters }])
    }
  }

  // Load saved view
  const loadSavedView = (filters: any) => {
    setActionFilter(filters.actionFilter || 'all')
    setTopicFilter(filters.topicFilter || '')
    setClientFilter(filters.clientFilter || '')
    setUsernameFilter(filters.usernameFilter || '')
    setQosFilter(filters.qosFilter || 'all')
    setRetainFilter(filters.retainFilter || false)
    setTimeRangeFilter(filters.timeRangeFilter || '24h')
  }

  // Export events as CSV
  const exportToCsv = async () => {
    try {
      setError(null)

      // Build query for export (get all matching records)
      const params = new URLSearchParams()
      params.append('order', 'ts.desc')

      // Apply same filters as current view
      if (actionFilter && actionFilter !== 'all') {
        params.append('action', `eq.${actionFilter}`)
      }
      if (topicFilter.trim()) {
        params.append('topic', `ilike.*${topicFilter.trim()}*`)
      }
      if (clientFilter.trim()) {
        params.append('client', `ilike.*${clientFilter.trim()}*`)
      }
      if (usernameFilter.trim()) {
        params.append('username', `ilike.*${usernameFilter.trim()}*`)
      }
      if (qosFilter && qosFilter !== 'all') {
        params.append('qos', `eq.${qosFilter}`)
      }
      if (retainFilter) {
        params.append('retain', 'eq.true')
      }
      const timeRangeTimestamp = getTimeRangeFilter(timeRangeFilter)
      if (timeRangeTimestamp) {
        params.append('ts', `gte.${timeRangeTimestamp}`)
      }

      const response = await axios.get(`${API_BASE_URL}/events?${params.toString()}`)
      const allEvents = response.data as Event[]

      // Convert to CSV
      const headers = ['Timestamp', 'Action', 'Client', 'Username', 'Topic', 'QoS', 'Retain', 'Payload Size']
      const csvRows = [
        headers.join(','),
        ...allEvents.map(event => [
          event.ts,
          event.action,
          event.client || '',
          event.username || '',
          event.topic || '',
          event.qos?.toString() || '',
          event.retain?.toString() || 'false',
          event.payload_size?.toString() || '0'
        ].map(field => `"${field.replace(/"/g, '""')}"`).join(','))
      ]

      // Download CSV
      const csvContent = csvRows.join('\n')
      const blob = new Blob([csvContent], { type: 'text/csv' })
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `events_${timeRangeFilter}_${new Date().toISOString().split('T')[0]}.csv`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      window.URL.revokeObjectURL(url)

    } catch (err) {
      console.error('Export failed:', err)
      alert('Failed to export CSV. Please try again.')
    }
  }

  const formatTimestamp = (timestamp: string) => {
    return new Date(timestamp).toLocaleString('en-US', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false
    })
  }

  const formatPayloadSize = (size: number | null | undefined) => {
    if (!size) return '0B'
    if (size < 1024) return `${size}B`
    if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)}KB`
    return `${(size / (1024 * 1024)).toFixed(1)}MB`
  }

  return (
    <div>
      {/* Page Header */}
      <div style={{ marginBottom: '32px' }}>
        <h1 style={{
          fontSize: '32px',
          fontWeight: '700',
          color: '#1f2937',
          margin: '0 0 8px 0'
        }}>
          Events
        </h1>
        <p style={{
          fontSize: '16px',
          color: '#6b7280',
          margin: 0
        }}>
          Real-time event monitoring and historical analysis
        </p>
      </div>

      {/* Error Display */}
      {error && (
        <div style={{
          background: '#fef2f2',
          border: '1px solid #fecaca',
          borderRadius: '8px',
          padding: '16px',
          marginBottom: '24px'
        }}>
          <div style={{ color: '#dc2626', fontWeight: '500', marginBottom: '8px' }}>
            Error loading events data
          </div>
          <div style={{ color: '#7f1d1d', fontSize: '14px' }}>
            {error}
          </div>
          <button
            onClick={() => fetchEvents(currentPage)}
            style={{
              marginTop: '12px',
              padding: '8px 16px',
              background: '#dc2626',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              fontSize: '14px',
              cursor: 'pointer'
            }}
          >
            Retry
          </button>
        </div>
      )}

      {/* Controls */}
      <div style={{
        background: 'white',
        borderRadius: '12px',
        border: '1px solid #e5e7eb',
        padding: '20px',
        marginBottom: '24px'
      }}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '16px'
        }}>
          <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '600' }}>
            Event Filters
          </h3>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              onClick={saveCurrentView}
              style={{
                padding: '6px 12px',
                background: '#3b82f6',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                fontSize: '14px',
                cursor: 'pointer'
              }}
            >
              Save View
            </button>
            <button
              onClick={exportToCsv}
              style={{
                padding: '6px 12px',
                background: '#10b981',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                fontSize: '14px',
                cursor: 'pointer'
              }}
            >
              Export CSV
            </button>
            <button
              onClick={clearFilters}
              style={{
                padding: '6px 12px',
                background: '#6b7280',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                fontSize: '14px',
                cursor: 'pointer'
              }}
            >
              Clear Filters
            </button>
          </div>
        </div>

        {/* Time Range Filter */}
        <div style={{ marginBottom: '16px' }}>
          <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', marginBottom: '8px', color: '#374151' }}>
            Time Range
          </label>
          <div style={{ display: 'flex', gap: '8px' }}>
            {['1h', '6h', '24h', '7d', '30d', 'all'].map((range) => (
              <button
                key={range}
                onClick={() => setTimeRangeFilter(range)}
                style={{
                  padding: '6px 12px',
                  background: timeRangeFilter === range ? '#3b82f6' : '#f3f4f6',
                  color: timeRangeFilter === range ? 'white' : '#374151',
                  border: '1px solid #d1d5db',
                  borderRadius: '6px',
                  fontSize: '14px',
                  cursor: 'pointer'
                }}
              >
                {range === 'all' ? 'All Time' : range.toUpperCase()}
              </button>
            ))}
          </div>
        </div>

        {/* Filter Inputs */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '16px'
        }}>
          <div>
            <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', marginBottom: '4px', color: '#374151' }}>
              Action
            </label>
            <select
              value={actionFilter}
              onChange={(e) => setActionFilter(e.target.value)}
              style={{
                width: '100%',
                padding: '8px 12px',
                border: '1px solid #d1d5db',
                borderRadius: '6px',
                fontSize: '14px'
              }}
            >
              <option value="all">All Actions</option>
              <option value="connected">Connected</option>
              <option value="disconnected">Disconnected</option>
              <option value="publish">Publish</option>
              <option value="subscribe">Subscribe</option>
              <option value="unsubscribe">Unsubscribe</option>
            </select>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', marginBottom: '4px', color: '#374151' }}>
              Client
            </label>
            <input
              type="text"
              placeholder="Filter by client..."
              value={clientFilter}
              onChange={(e) => setClientFilter(e.target.value)}
              style={{
                width: '100%',
                padding: '8px 12px',
                border: '1px solid #d1d5db',
                borderRadius: '6px',
                fontSize: '14px'
              }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', marginBottom: '4px', color: '#374151' }}>
              Username
            </label>
            <input
              type="text"
              placeholder="Filter by username..."
              value={usernameFilter}
              onChange={(e) => setUsernameFilter(e.target.value)}
              style={{
                width: '100%',
                padding: '8px 12px',
                border: '1px solid #d1d5db',
                borderRadius: '6px',
                fontSize: '14px'
              }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', marginBottom: '4px', color: '#374151' }}>
              Topic
            </label>
            <input
              type="text"
              placeholder="Filter by topic..."
              value={topicFilter}
              onChange={(e) => setTopicFilter(e.target.value)}
              style={{
                width: '100%',
                padding: '8px 12px',
                border: '1px solid #d1d5db',
                borderRadius: '6px',
                fontSize: '14px'
              }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', marginBottom: '4px', color: '#374151' }}>
              QoS
            </label>
            <select
              value={qosFilter}
              onChange={(e) => setQosFilter(e.target.value)}
              style={{
                width: '100%',
                padding: '8px 12px',
                border: '1px solid #d1d5db',
                borderRadius: '6px',
                fontSize: '14px'
              }}
            >
              <option value="all">All QoS</option>
              <option value="0">QoS 0</option>
              <option value="1">QoS 1</option>
              <option value="2">QoS 2</option>
            </select>
          </div>

          <div style={{ display: 'flex', alignItems: 'end' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px', marginBottom: '8px' }}>
              <input
                type="checkbox"
                checked={retainFilter}
                onChange={(e) => setRetainFilter(e.target.checked)}
              />
              Retained only
            </label>
          </div>
        </div>

        {/* Saved Views */}
        {savedViews.length > 0 && (
          <div style={{ marginTop: '16px' }}>
            <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', marginBottom: '8px', color: '#374151' }}>
              Saved Views
            </label>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              {savedViews.map((view, index) => (
                <button
                  key={index}
                  onClick={() => loadSavedView(view.filters)}
                  style={{
                    padding: '4px 8px',
                    background: '#e0e7ff',
                    color: '#3730a3',
                    border: '1px solid #c7d2fe',
                    borderRadius: '4px',
                    fontSize: '12px',
                    cursor: 'pointer'
                  }}
                >
                  {view.name}
                </button>
              ))}
            </div>
          </div>
        )}

        <div style={{ marginTop: '16px', fontSize: '14px', color: '#6b7280' }}>
          {totalItems.toLocaleString()} events found | Page {currentPage} of {totalPages}
        </div>
      </div>

      {/* Events Table */}
      <div style={{
        background: 'white',
        borderRadius: '12px',
        border: '1px solid #e5e7eb',
        overflow: 'hidden'
      }}>
        <div style={{ padding: '20px', borderBottom: '1px solid #e5e7eb' }}>
          <h2 style={{ margin: 0, fontSize: '20px', fontWeight: '600' }}>
            Events ({totalItems.toLocaleString()})
          </h2>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#f8fafc' }}>
                <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: '600', textTransform: 'uppercase', color: '#6b7280' }}>Timestamp</th>
                <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: '600', textTransform: 'uppercase', color: '#6b7280' }}>Action</th>
                <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: '600', textTransform: 'uppercase', color: '#6b7280' }}>Client</th>
                <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: '600', textTransform: 'uppercase', color: '#6b7280' }}>Username</th>
                <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: '600', textTransform: 'uppercase', color: '#6b7280' }}>Topic</th>
                <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: '600', textTransform: 'uppercase', color: '#6b7280' }}>QoS</th>
                <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: '600', textTransform: 'uppercase', color: '#6b7280' }}>Retain</th>
                <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: '600', textTransform: 'uppercase', color: '#6b7280' }}>Size</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={8} style={{ padding: '32px', textAlign: 'center', color: '#6b7280' }}>
                    Loading events...
                  </td>
                </tr>
              ) : events.length === 0 ? (
                <tr>
                  <td colSpan={8} style={{ padding: '32px', textAlign: 'center', color: '#6b7280' }}>
                    No events found
                  </td>
                </tr>
              ) : (
                events.map((event) => (
                  <tr
                    key={event.id}
                    style={{ borderBottom: '1px solid #f1f5f9' }}
                  >
                    <td style={{ padding: '16px', color: '#6b7280', fontSize: '13px', fontFamily: 'monospace' }}>
                      {formatTimestamp(event.ts)}
                    </td>
                    <td style={{ padding: '16px' }}>
                      <span style={{
                        padding: '4px 8px',
                        borderRadius: '12px',
                        fontSize: '12px',
                        fontWeight: '500',
                        background:
                          event.action === 'connected' ? '#d1fae5' :
                          event.action === 'disconnected' ? '#fee2e2' :
                          event.action === 'publish' ? '#dbeafe' :
                          event.action === 'subscribe' ? '#fef3c7' :
                          event.action === 'unsubscribe' ? '#f3e8ff' : '#f3f4f6',
                        color:
                          event.action === 'connected' ? '#065f46' :
                          event.action === 'disconnected' ? '#991b1b' :
                          event.action === 'publish' ? '#1e40af' :
                          event.action === 'subscribe' ? '#92400e' :
                          event.action === 'unsubscribe' ? '#6b21a8' : '#374151'
                      }}>
                        {event.action}
                      </span>
                    </td>
                    <td style={{ padding: '16px', fontWeight: '500', color: '#1f2937' }}>
                      {event.client}
                    </td>
                    <td style={{ padding: '16px', color: '#6b7280' }}>
                      {event.username || '-'}
                    </td>
                    <td style={{
                      padding: '16px',
                      color: '#1f2937',
                      fontFamily: 'monospace',
                      fontSize: '13px',
                      maxWidth: '200px',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap'
                    }}>
                      {event.topic || '-'}
                    </td>
                    <td style={{ padding: '16px', color: '#6b7280' }}>
                      {event.qos !== null && event.qos !== undefined ? event.qos : '-'}
                    </td>
                    <td style={{ padding: '16px' }}>
                      {event.retain ? (
                        <span style={{
                          padding: '2px 6px',
                          borderRadius: '8px',
                          fontSize: '10px',
                          fontWeight: '500',
                          background: '#fef3c7',
                          color: '#92400e'
                        }}>
                          Yes
                        </span>
                      ) : '-'}
                    </td>
                    <td style={{ padding: '16px', color: '#6b7280', fontSize: '13px' }}>
                      {formatPayloadSize(event.payload_size)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {!loading && totalPages > 1 && (
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '16px 20px',
            borderTop: '1px solid #e5e7eb',
            background: '#f8f9fa'
          }}>
            <div style={{ fontSize: '14px', color: '#6b7280' }}>
              Showing {((currentPage - 1) * pageSize) + 1}-{Math.min(currentPage * pageSize, totalItems)} of {totalItems.toLocaleString()}
            </div>

            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                disabled={currentPage === 1}
                style={{
                  padding: '6px 12px',
                  background: currentPage === 1 ? '#f3f4f6' : '#fff',
                  border: '1px solid #d1d5db',
                  borderRadius: '4px',
                  fontSize: '14px',
                  cursor: currentPage === 1 ? 'not-allowed' : 'pointer'
                }}
              >
                Previous
              </button>

              <span style={{ padding: '6px 12px', fontSize: '14px', color: '#6b7280' }}>
                Page {currentPage} of {totalPages}
              </span>

              <button
                onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                disabled={currentPage === totalPages}
                style={{
                  padding: '6px 12px',
                  background: currentPage === totalPages ? '#f3f4f6' : '#fff',
                  border: '1px solid #d1d5db',
                  borderRadius: '4px',
                  fontSize: '14px',
                  cursor: currentPage === totalPages ? 'not-allowed' : 'pointer'
                }}
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Last Updated */}
      {lastUpdated && (
        <div style={{
          fontSize: '12px',
          color: '#6b7280',
          textAlign: 'center',
          marginTop: '16px'
        }}>
          Last updated: {lastUpdated.toLocaleString()}
        </div>
      )}
    </div>
  )
}