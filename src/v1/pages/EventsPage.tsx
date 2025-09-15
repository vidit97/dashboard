import React, { useState, useEffect, useCallback, useMemo } from 'react'
import axios from 'axios'
import { useGlobalState } from '../hooks/useGlobalState'
import { Event as ApiEvent } from '../../types/api'

// Get API base URL
const API_BASE_URL = (import.meta as any).env?.VITE_GRE_API_BASE_URL || 'http://localhost:3001'

// Use the ApiEvent type from our API types
type Event = ApiEvent

export const EventsPage: React.FC = () => {
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

    const targetTime = new Date(now.getTime() - (hoursAgo * 60 * 60 * 1000))
    return targetTime.toISOString().slice(0, 19)
  }

  // Fetch events from real API
  const fetchEvents = useCallback(async (page: number = 1) => {
    try {
      setLoading(true)
      setError(null)

      // Clean the base URL
      const cleanBaseUrl = API_BASE_URL.replace(/\/$/, '')

      // Build base query parameters
      const baseParams = new URLSearchParams()

      // Time range filter
      const timeFilter = getTimeRangeFilter(timeRangeFilter)
      if (timeFilter) {
        baseParams.append('ts', `gte.${timeFilter}`)
      }

      // Action filter
      if (actionFilter !== 'all') {
        baseParams.append('action', `eq.${actionFilter}`)
      }

      // Search filters
      if (topicFilter.trim()) {
        baseParams.append('topic', `like.*${topicFilter.trim()}*`)
      }

      if (clientFilter.trim()) {
        baseParams.append('client', `like.*${clientFilter.trim()}*`)
      }

      if (usernameFilter.trim()) {
        baseParams.append('username', `like.*${usernameFilter.trim()}*`)
      }

      // QoS filter
      if (qosFilter !== 'all') {
        baseParams.append('qos', `eq.${qosFilter}`)
      }

      // Retain filter
      if (retainFilter) {
        baseParams.append('retain', 'eq.true')
      }

      // Step 1: Get total count
      const countUrl = `${cleanBaseUrl}/events?${baseParams.toString()}`
      const countResponse = await axios.get(countUrl, {
        headers: {
          'Content-Type': 'application/json',
          'Prefer': 'count=exact'
        },
        timeout: 30000
      })

      // Extract total count from Content-Range header
      const contentRange = countResponse.headers['content-range']
      const totalCount = contentRange ? parseInt(contentRange.split('/')[1] || '0') : 0

      // Step 2: Get actual paginated data
      const dataParams = new URLSearchParams(baseParams)
      dataParams.append('offset', ((page - 1) * pageSize).toString())
      dataParams.append('limit', pageSize.toString())
      dataParams.append('order', 'ts.desc')
      dataParams.append('select', 'id,ts,action,client,topic,qos,retain,payload_size,username')

      const dataUrl = `${cleanBaseUrl}/events?${dataParams.toString()}`
      const dataResponse = await axios.get<Event[]>(dataUrl, {
        headers: {
          'Content-Type': 'application/json'
        },
        timeout: 30000
      })

      const eventData = dataResponse.data

      setEvents(eventData)
      setTotalItems(totalCount)
      setTotalPages(Math.ceil(totalCount / pageSize))
      setCurrentPage(page)
      setLastUpdated(new Date())

    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to fetch events'
      console.error('Error fetching events:', err)
      if (axios.isAxiosError(err)) {
        console.error('Axios error details:', {
          status: err.response?.status,
          statusText: err.response?.statusText,
          data: err.response?.data
        })
      }
      setError(`API Error: ${errorMsg}`)
      setEvents([])
    } finally {
      setLoading(false)
    }
  }, [actionFilter, topicFilter, clientFilter, usernameFilter, qosFilter, retainFilter, timeRangeFilter, pageSize])

  // Load data on mount and when filters change
  useEffect(() => {
    fetchEvents(1)
  }, [actionFilter, topicFilter, clientFilter, usernameFilter, qosFilter, retainFilter, timeRangeFilter])

  // Pagination
  useEffect(() => {
    if (currentPage > 1) {
      fetchEvents(currentPage)
    }
  }, [currentPage])

  const getActionIcon = (action: string) => {
    const icons = {
      connected: '🟢',
      disconnected: '🔴',
      subscribe: '📝',
      unsubscribe: '❌',
      publish: '📤',
      drop: '⚠️',
      will: '💀'
    }
    return icons[action as keyof typeof icons] || '❓'
  }

  const getActionColor = (action: string) => {
    const colors = {
      connected: '#10b981',
      disconnected: '#ef4444',
      subscribe: '#3b82f6',
      unsubscribe: '#f59e0b',
      publish: '#8b5cf6',
      drop: '#f97316',
      will: '#6b7280'
    }
    return colors[action as keyof typeof colors] || '#6b7280'
  }

  const saveCurrentView = () => {
    const filterName = prompt('Enter name for this saved view:')
    if (filterName) {
      setSavedViews(prev => [...prev, {
        name: filterName,
        filters: { actionFilter, topicFilter, clientFilter, usernameFilter, qosFilter, retainFilter, timeRangeFilter }
      }])
    }
  }

  const loadSavedView = (view: {name: string, filters: any}) => {
    setActionFilter(view.filters.actionFilter || 'all')
    setTopicFilter(view.filters.topicFilter || '')
    setClientFilter(view.filters.clientFilter || '')
    setUsernameFilter(view.filters.usernameFilter || '')
    setQosFilter(view.filters.qosFilter || 'all')
    setRetainFilter(view.filters.retainFilter || false)
    setTimeRangeFilter(view.filters.timeRangeFilter || '24h')
    setCurrentPage(1)
  }

  const exportToCsv = async () => {
    try {
      // Fetch all events with current filters (no pagination limit)
      const cleanBaseUrl = API_BASE_URL.replace(/\/$/, '')
      const baseParams = new URLSearchParams()

      // Apply same filters as the main query
      const timeFilter = getTimeRangeFilter(timeRangeFilter)
      if (timeFilter) {
        baseParams.append('ts', `gte.${timeFilter}`)
      }
      if (actionFilter !== 'all') {
        baseParams.append('action', `eq.${actionFilter}`)
      }
      if (topicFilter.trim()) {
        baseParams.append('topic', `like.*${topicFilter.trim()}*`)
      }
      if (clientFilter.trim()) {
        baseParams.append('client', `like.*${clientFilter.trim()}*`)
      }
      if (usernameFilter.trim()) {
        baseParams.append('username', `like.*${usernameFilter.trim()}*`)
      }
      if (qosFilter !== 'all') {
        baseParams.append('qos', `eq.${qosFilter}`)
      }
      if (retainFilter) {
        baseParams.append('retain', 'eq.true')
      }

      baseParams.append('order', 'ts.desc')
      baseParams.append('select', 'id,ts,action,client,topic,qos,retain,payload_size,username')

      const exportUrl = `${cleanBaseUrl}/events?${baseParams.toString()}`
      const response = await axios.get<Event[]>(exportUrl, {
        headers: { 'Content-Type': 'application/json' },
        timeout: 60000 // Longer timeout for export
      })

      const allEvents = response.data

      const csv = [
        ['Timestamp', 'Action', 'Client', 'Topic', 'QoS', 'Retain', 'Payload Size', 'Username'].join(','),
        ...allEvents.map(event => [
          event.ts,
          event.action,
          event.client || '',
          event.topic || '',
          event.qos || '',
          event.retain || false,
          event.payload_size || '',
          event.username || ''
        ].join(','))
      ].join('\n')

      const blob = new Blob([csv], { type: 'text/csv' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `events-${new Date().toISOString().split('T')[0]}.csv`
      a.click()
      URL.revokeObjectURL(url)
    } catch (err) {
      console.error('Error exporting CSV:', err)
      alert('Failed to export CSV. Please try again.')
    }
  }

  return (
    <div style={{
      width: '100%',
      padding: '16px',
      minHeight: '100%',
      boxSizing: 'border-box'
    }}>
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
          Fast filterable audit trail for {state.broker} broker
        </p>
      </div>

      {/* Actions Bar */}
      <div style={{
        background: 'white',
        padding: '16px 20px',
        borderRadius: '12px',
        border: '1px solid #e5e7eb',
        marginBottom: '24px',
        display: 'flex',
        gap: '12px',
        alignItems: 'center',
        flexWrap: 'wrap'
      }}>
        <button
          onClick={exportToCsv}
          disabled={loading}
          style={{
            padding: '8px 16px',
            background: loading ? '#9ca3af' : '#10b981',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            fontSize: '14px',
            fontWeight: '500',
            cursor: loading ? 'not-allowed' : 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '6px'
          }}
        >
          📁 {loading ? 'Loading...' : 'Export CSV'}
        </button>
        
        <button
          onClick={saveCurrentView}
          style={{
            padding: '8px 16px',
            background: '#3b82f6',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            fontSize: '14px',
            fontWeight: '500',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '6px'
          }}
        >
          📌 Save View
        </button>

        {savedViews.length > 0 && (
          <select
            onChange={(e) => {
              const view = savedViews.find(v => v.name === e.target.value)
              if (view) loadSavedView(view)
            }}
            style={{
              padding: '8px 12px',
              border: '1px solid #d1d5db',
              borderRadius: '6px',
              fontSize: '14px'
            }}
          >
            <option value="">Load Saved View...</option>
            {savedViews.map((view, index) => (
              <option key={index} value={view.name}>{view.name}</option>
            ))}
          </select>
        )}

        <button
          onClick={() => fetchEvents(currentPage)}
          disabled={loading}
          style={{
            padding: '8px 16px',
            background: loading ? '#f9fafb' : '#f3f4f6',
            color: loading ? '#9ca3af' : '#374151',
            border: '1px solid #d1d5db',
            borderRadius: '6px',
            fontSize: '14px',
            fontWeight: '500',
            cursor: loading ? 'not-allowed' : 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '6px'
          }}
        >
          🔄 {loading ? 'Loading...' : 'Refresh'}
        </button>

        <button
          onClick={() => {
            setActionFilter('all')
            setTopicFilter('')
            setClientFilter('')
            setUsernameFilter('')
            setQosFilter('all')
            setRetainFilter(false)
            setTimeRangeFilter('24h')
            setCurrentPage(1)
          }}
          style={{
            padding: '8px 16px',
            background: '#f3f4f6',
            color: '#374151',
            border: '1px solid #d1d5db',
            borderRadius: '6px',
            fontSize: '14px',
            fontWeight: '500',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '6px'
          }}
        >
          🗑️ Clear Filters
        </button>

        <div style={{ marginLeft: 'auto', fontSize: '14px', color: '#6b7280' }}>
          {totalItems} event{totalItems !== 1 ? 's' : ''} found
        </div>
      </div>

      {/* Filters */}
      <div style={{
        background: 'white',
        padding: '16px 20px',
        borderRadius: '12px',
        border: '1px solid #e5e7eb',
        marginBottom: '24px'
      }}>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
          gap: '16px',
          alignItems: 'end'
        }}>
          <div>
            <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', marginBottom: '6px', color: '#374151' }}>
              Action Type
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
              <option value="subscribe">Subscribe</option>
              <option value="unsubscribe">Unsubscribe</option>
              <option value="publish">Publish</option>
              <option value="drop">Drop</option>
              <option value="will">Will</option>
            </select>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', marginBottom: '6px', color: '#374151' }}>
              Topic Prefix
            </label>
            <input
              type="text"
              value={topicFilter}
              onChange={(e) => setTopicFilter(e.target.value)}
              placeholder="e.g., sensors/"
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
            <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', marginBottom: '6px', color: '#374151' }}>
              Client
            </label>
            <input
              type="text"
              value={clientFilter}
              onChange={(e) => setClientFilter(e.target.value)}
              placeholder="Client ID..."
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
            <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', marginBottom: '6px', color: '#374151' }}>
              Username
            </label>
            <input
              type="text"
              value={usernameFilter}
              onChange={(e) => setUsernameFilter(e.target.value)}
              placeholder="Username..."
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
            <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', marginBottom: '6px', color: '#374151' }}>
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

          <div>
            <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', marginBottom: '6px', color: '#374151' }}>
              Time Range
            </label>
            <select
              value={timeRangeFilter}
              onChange={(e) => setTimeRangeFilter(e.target.value)}
              style={{
                width: '100%',
                padding: '8px 12px',
                border: '1px solid #d1d5db',
                borderRadius: '6px',
                fontSize: '14px'
              }}
            >
              <option value="1h">Last 1 Hour</option>
              <option value="6h">Last 6 Hours</option>
              <option value="24h">Last 24 Hours</option>
              <option value="7d">Last 7 Days</option>
              <option value="30d">Last 30 Days</option>
              <option value="all">All Time</option>
            </select>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', height: '38px' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px' }}>
              <input
                type="checkbox"
                checked={retainFilter}
                onChange={(e) => setRetainFilter(e.target.checked)}
              />
              Retained only
            </label>
          </div>
        </div>
      </div>

      {/* Loading State */}
      {loading && events.length === 0 && (
        <div style={{
          background: 'white',
          borderRadius: '12px',
          border: '1px solid #e5e7eb',
          padding: '48px',
          textAlign: 'center',
          color: '#6b7280'
        }}>
          Loading events...
        </div>
      )}

      {/* Error State */}
      {error && (
        <div style={{
          background: 'white',
          borderRadius: '12px',
          border: '1px solid #e5e7eb',
          padding: '24px',
          marginBottom: '24px'
        }}>
          <div style={{
            background: '#fef2f2',
            color: '#dc2626',
            padding: '12px',
            borderRadius: '8px',
            border: '1px solid #fecaca',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            <span>⚠️</span>
            <span>{error}</span>
            <button
              onClick={() => fetchEvents(1)}
              style={{
                marginLeft: 'auto',
                padding: '4px 8px',
                background: '#dc2626',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                fontSize: '12px',
                cursor: 'pointer'
              }}
            >
              Retry
            </button>
          </div>
        </div>
      )}

      {/* Events Table */}
      {!loading || events.length > 0 ? (
        <div style={{
          background: 'white',
          borderRadius: '12px',
          border: '1px solid #e5e7eb',
          overflow: 'hidden'
        }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#f8fafc' }}>
                <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: '600', textTransform: 'uppercase', color: '#6b7280' }}>Timestamp</th>
                <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: '600', textTransform: 'uppercase', color: '#6b7280' }}>Action</th>
                <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: '600', textTransform: 'uppercase', color: '#6b7280' }}>Client</th>
                <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: '600', textTransform: 'uppercase', color: '#6b7280' }}>Topic</th>
                <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: '600', textTransform: 'uppercase', color: '#6b7280' }}>QoS</th>
                <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: '600', textTransform: 'uppercase', color: '#6b7280' }}>Retain</th>
                <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: '600', textTransform: 'uppercase', color: '#6b7280' }}>Size</th>
                <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: '600', textTransform: 'uppercase', color: '#6b7280' }}>Username</th>
              </tr>
            </thead>
            <tbody>
              {events.map((event, index) => (
                <tr 
                  key={index}
                  style={{ 
                    borderBottom: '1px solid #f1f5f9',
                    ':hover': { background: '#f8fafc' }
                  }}
                >
                  <td style={{ padding: '12px 16px', fontSize: '13px', fontFamily: 'monospace', color: '#1f2937' }}>
                    {new Date(event.ts).toLocaleString()}
                  </td>
                  <td style={{ padding: '12px 16px' }}>
                    <span style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      padding: '4px 8px',
                      borderRadius: '12px',
                      fontSize: '12px',
                      fontWeight: '500',
                      background: `${getActionColor(event.action)}15`,
                      color: getActionColor(event.action),
                      width: 'fit-content'
                    }}>
                      {getActionIcon(event.action)}
                      {event.action}
                    </span>
                  </td>
                  <td style={{ padding: '12px 16px', fontFamily: 'monospace', fontSize: '13px', color: '#1f2937' }}>
                    {event.client}
                  </td>
                  <td style={{ 
                    padding: '12px 16px', 
                    fontFamily: 'monospace', 
                    fontSize: '12px', 
                    color: '#6b7280',
                    maxWidth: '200px',
                    wordBreak: 'break-all'
                  }}>
                    {event.topic || '-'}
                  </td>
                  <td style={{ padding: '12px 16px', textAlign: 'center', color: '#6b7280' }}>
                    {event.qos !== undefined ? event.qos : '-'}
                  </td>
                  <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                    {event.retain ? (
                      <span style={{ color: '#059669', fontSize: '14px' }}>✓</span>
                    ) : (
                      <span style={{ color: '#d1d5db' }}>-</span>
                    )}
                  </td>
                  <td style={{ padding: '12px 16px', color: '#6b7280', fontSize: '13px' }}>
                    {event.payload_size ? `${event.payload_size}B` : '-'}
                  </td>
                  <td style={{ padding: '12px 16px', color: '#6b7280', fontSize: '13px' }}>
                    {event.username || '-'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Empty State */}
        {events.length === 0 && !loading && !error && (
          <div style={{
            padding: '48px',
            textAlign: 'center',
            color: '#6b7280'
          }}>
            <svg style={{ width: '48px', height: '48px', margin: '0 auto 16px', color: '#d1d5db' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <h3 style={{ margin: '0 0 8px 0', fontSize: '16px', fontWeight: '500', color: '#374151' }}>
              No events found
            </h3>
            <p style={{ margin: 0, fontSize: '14px' }}>
              Try adjusting your filters or selecting a different time range.
            </p>
          </div>
        )}

        {/* Pagination */}
        {events.length > 0 && (
          <div style={{
            padding: '16px 20px',
            borderTop: '1px solid #e5e7eb',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            background: '#f8fafc'
          }}>
            <div style={{ fontSize: '14px', color: '#6b7280' }}>
              Showing {((currentPage - 1) * pageSize) + 1} to {Math.min(currentPage * pageSize, totalItems)} of {totalItems} events
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                disabled={currentPage === 1}
                style={{
                  padding: '6px 12px',
                  border: '1px solid #d1d5db',
                  borderRadius: '6px',
                  fontSize: '14px',
                  background: currentPage === 1 ? '#f9fafb' : 'white',
                  cursor: currentPage === 1 ? 'not-allowed' : 'pointer',
                  color: currentPage === 1 ? '#9ca3af' : '#374151'
                }}
              >
                Previous
              </button>
              <span style={{
                padding: '6px 12px',
                fontSize: '14px',
                color: '#374151',
                display: 'flex',
                alignItems: 'center'
              }}>
                Page {currentPage} of {totalPages}
              </span>
              <button
                onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                disabled={currentPage >= totalPages}
                style={{
                  padding: '6px 12px',
                  border: '1px solid #d1d5db',
                  borderRadius: '6px',
                  fontSize: '14px',
                  background: currentPage >= totalPages ? '#f9fafb' : 'white',
                  cursor: currentPage >= totalPages ? 'not-allowed' : 'pointer',
                  color: currentPage >= totalPages ? '#9ca3af' : '#374151'
                }}
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
      ) : null}

      {/* Footer */}
      {lastUpdated && (
        <div style={{
          textAlign: 'center',
          marginTop: '16px',
          fontSize: '12px',
          color: '#9ca3af'
        }}>
          Last updated: {lastUpdated.toLocaleString()}
        </div>
      )}
    </div>
  )
}