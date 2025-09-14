import React, { useState, useMemo } from 'react'
import { useGlobalState } from '../hooks/useGlobalState'

interface Event {
  ts: string
  action: 'connected' | 'disconnected' | 'subscribe' | 'unsubscribe' | 'publish' | 'drop' | 'will'
  client: string
  topic?: string
  qos?: number
  retain?: boolean
  payload_size?: number
  username?: string
  broker: string
}

export const EventsPage: React.FC = () => {
  const { state } = useGlobalState()
  const [actionFilter, setActionFilter] = useState<string>('all')
  const [topicFilter, setTopicFilter] = useState('')
  const [clientFilter, setClientFilter] = useState('')
  const [qosFilter, setQosFilter] = useState<string>('all')
  const [retainFilter, setRetainFilter] = useState(false)
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize] = useState(50)
  const [savedViews, setSavedViews] = useState<Array<{name: string, filters: any}>>([])

  // Mock events data - in real implementation this would use virtualization for large datasets
  const mockEvents: Event[] = [
    {
      ts: '2024-01-15T10:30:15.123Z',
      action: 'connected',
      client: 'sensor_001',
      username: 'iot_device',
      broker: 'local'
    },
    {
      ts: '2024-01-15T10:30:12.456Z',
      action: 'subscribe',
      client: 'dashboard_client',
      topic: 'alerts/#',
      qos: 2,
      username: 'admin',
      broker: 'local'
    },
    {
      ts: '2024-01-15T10:30:10.789Z',
      action: 'publish',
      client: 'sensor_001',
      topic: 'sensors/temperature/room1',
      qos: 1,
      retain: true,
      payload_size: 45,
      username: 'iot_device',
      broker: 'local'
    },
    {
      ts: '2024-01-15T10:30:08.234Z',
      action: 'disconnected',
      client: 'mobile_app_xyz',
      username: 'user123',
      broker: 'local'
    },
    {
      ts: '2024-01-15T10:30:05.567Z',
      action: 'drop',
      client: 'sensor_002',
      topic: 'sensors/pressure/room2',
      qos: 0,
      payload_size: 32,
      username: 'iot_device',
      broker: 'local'
    }
  ]

  // Filter events
  const filteredEvents = useMemo(() => {
    return mockEvents.filter(event => {
      if (actionFilter !== 'all' && event.action !== actionFilter) return false
      if (topicFilter && (!event.topic || !event.topic.toLowerCase().includes(topicFilter.toLowerCase()))) return false
      if (clientFilter && !event.client.toLowerCase().includes(clientFilter.toLowerCase())) return false
      if (qosFilter !== 'all' && event.qos?.toString() !== qosFilter) return false
      if (retainFilter && !event.retain) return false
      return true
    })
  }, [actionFilter, topicFilter, clientFilter, qosFilter, retainFilter, mockEvents])

  // Pagination
  const totalPages = Math.ceil(filteredEvents.length / pageSize)
  const paginatedEvents = filteredEvents.slice((currentPage - 1) * pageSize, currentPage * pageSize)

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
        filters: { actionFilter, topicFilter, clientFilter, qosFilter, retainFilter }
      }])
    }
  }

  const loadSavedView = (view: {name: string, filters: any}) => {
    setActionFilter(view.filters.actionFilter)
    setTopicFilter(view.filters.topicFilter)
    setClientFilter(view.filters.clientFilter)
    setQosFilter(view.filters.qosFilter)
    setRetainFilter(view.filters.retainFilter)
    setCurrentPage(1)
  }

  const exportToCsv = () => {
    const csv = [
      ['Timestamp', 'Action', 'Client', 'Topic', 'QoS', 'Retain', 'Payload Size', 'Username', 'Broker'].join(','),
      ...filteredEvents.map(event => [
        event.ts,
        event.action,
        event.client,
        event.topic || '',
        event.qos || '',
        event.retain || false,
        event.payload_size || '',
        event.username || '',
        event.broker
      ].join(','))
    ].join('\n')
    
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `events-${new Date().toISOString().split('T')[0]}.csv`
    a.click()
  }

  return (
    <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
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
          style={{
            padding: '8px 16px',
            background: '#10b981',
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
          📁 Export CSV
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

        <div style={{ marginLeft: 'auto', fontSize: '14px', color: '#6b7280' }}>
          {filteredEvents.length} event{filteredEvents.length !== 1 ? 's' : ''} found
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
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
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

      {/* Events Table */}
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
              {paginatedEvents.map((event, index) => (
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
        
        {/* Pagination */}
        <div style={{
          padding: '16px 20px',
          borderTop: '1px solid #e5e7eb',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          background: '#f8fafc'
        }}>
          <div style={{ fontSize: '14px', color: '#6b7280' }}>
            Showing {((currentPage - 1) * pageSize) + 1} to {Math.min(currentPage * pageSize, filteredEvents.length)} of {filteredEvents.length} events
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
              disabled={currentPage === totalPages}
              style={{
                padding: '6px 12px',
                border: '1px solid #d1d5db',
                borderRadius: '6px',
                fontSize: '14px',
                background: currentPage === totalPages ? '#f9fafb' : 'white',
                cursor: currentPage === totalPages ? 'not-allowed' : 'pointer',
                color: currentPage === totalPages ? '#9ca3af' : '#374151'
              }}
            >
              Next
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}