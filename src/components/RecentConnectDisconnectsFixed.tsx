import React, { useState, useEffect, useCallback } from 'react'
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'

interface ConnectDisconnectEvent {
  id: number
  ts: string
  action: 'connect' | 'disconnect'
  clientId?: string
  username?: string
  raw?: string
}

interface ConnectDisconnectProps {
  className?: string
  refreshInterval?: number
}

interface ChartDataPoint {
  time_bucket: string
  connects: number
  disconnects: number
  total: number
}

// Mock data for fallback
const MOCK_CONNECT_DISCONNECT_DATA = [
  { id: 1, ts: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(), action: 'connect', clientId: 'client-001', username: 'admin' },
  { id: 2, ts: new Date(Date.now() - 1.8 * 60 * 60 * 1000).toISOString(), action: 'disconnect', clientId: 'client-002', username: 'user1' },
  { id: 3, ts: new Date(Date.now() - 1.5 * 60 * 60 * 1000).toISOString(), action: 'connect', clientId: 'client-003', username: 'admin' },
  { id: 4, ts: new Date(Date.now() - 1.2 * 60 * 60 * 1000).toISOString(), action: 'connect', clientId: 'client-004', username: 'user2' },
  { id: 5, ts: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString(), action: 'disconnect', clientId: 'client-001', username: 'admin' },
  { id: 6, ts: new Date(Date.now() - 0.8 * 60 * 60 * 1000).toISOString(), action: 'connect', clientId: 'client-005', username: 'sysExporter' },
  { id: 7, ts: new Date(Date.now() - 0.5 * 60 * 60 * 1000).toISOString(), action: 'disconnect', clientId: 'client-003', username: 'admin' },
  { id: 8, ts: new Date(Date.now() - 0.2 * 60 * 60 * 1000).toISOString(), action: 'connect', clientId: 'client-006', username: 'user3' },
]

// Helper function to create time buckets for stacked area chart
function createConnectDisconnectBuckets(events, hoursBack) {
  const buckets = {}
  const bucketSize = 5 // 5 minutes
  
  // Create time buckets
  const now = new Date()
  const startTime = new Date(now.getTime() - hoursBack * 60 * 60 * 1000)
  
  for (let i = 0; i < (hoursBack * 60) / bucketSize; i++) {
    const bucketTime = new Date(startTime.getTime() + i * bucketSize * 60 * 1000)
    const bucketKey = bucketTime.toISOString().slice(0, 16) + ':00'
    
    buckets[bucketKey] = {
      time_bucket: bucketKey,
      connects: 0,
      disconnects: 0,
      total: 0
    }
  }
  
  // Fill buckets with event data
  events.forEach(event => {
    const eventTime = new Date(event.ts)
    const bucketTime = new Date(Math.floor(eventTime.getTime() / (bucketSize * 60 * 1000)) * bucketSize * 60 * 1000)
    const bucketKey = bucketTime.toISOString().slice(0, 16) + ':00'
    
    if (buckets[bucketKey]) {
      if (event.action === 'connect') {
        buckets[bucketKey].connects++
      } else if (event.action === 'disconnect') {
        buckets[bucketKey].disconnects++
      }
      buckets[bucketKey].total = buckets[bucketKey].connects + buckets[bucketKey].disconnects
    }
  })
  
  return Object.values(buckets).sort((a, b) => a.time_bucket.localeCompare(b.time_bucket))
}

function formatTimestamp(timestamp) {
  return new Date(timestamp).toLocaleString()
}

export default function RecentConnectDisconnects({ className, refreshInterval = 300 }) {
  const [events, setEvents] = useState(MOCK_CONNECT_DISCONNECT_DATA)
  const [chartData, setChartData] = useState([])
  const [timeRange, setTimeRange] = useState('24h')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [lastUpdated, setLastUpdated] = useState(null)
  const [useMockData, setUseMockData] = useState(true)
  const [filterAction, setFilterAction] = useState('all')

  const fetchConnectDisconnectEvents = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      
      // For now, always use mock data
      setEvents(MOCK_CONNECT_DISCONNECT_DATA)
      const hoursBack = timeRange === '24h' ? 24 : 168
      const buckets = createConnectDisconnectBuckets(MOCK_CONNECT_DISCONNECT_DATA, hoursBack)
      setChartData(buckets)
      
      setLastUpdated(new Date())
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to fetch connect/disconnect events'
      setError(errorMsg)
      console.error('Error fetching connect/disconnect events:', err)
    } finally {
      setLoading(false)
    }
  }, [timeRange])

  useEffect(() => {
    fetchConnectDisconnectEvents()
    
    const interval = setInterval(fetchConnectDisconnectEvents, refreshInterval * 1000)
    return () => clearInterval(interval)
  }, [fetchConnectDisconnectEvents, refreshInterval])

  // Filter events based on selected action
  const filteredEvents = events.filter(event => 
    filterAction === 'all' || event.action === filterAction
  )

  // Calculate summary stats
  const totalConnects = events.filter(e => e.action === 'connect').length
  const totalDisconnects = events.filter(e => e.action === 'disconnect').length

  return (
    <div className={`chart-section ${className || ''}`}>
      <div className="chart-header">
        <h2 className="chart-title">🔄 Recent Connects/Disconnects</h2>
        <div className="chart-controls">
          <select 
            className="select"
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value)}
          >
            <option value="24h">Last 24 Hours</option>
            <option value="7d">Last 7 Days</option>
          </select>
          <button onClick={fetchConnectDisconnectEvents} disabled={loading} className="button-secondary">
            {loading ? 'Loading...' : 'Refresh'}
          </button>
          <label className="mock-data-toggle">
            <input
              type="checkbox"
              checked={useMockData}
              onChange={(e) => setUseMockData(e.target.checked)}
            />
            Use Mock Data
          </label>
        </div>
      </div>

      {error && (
        <div className="error-message">
          Error: {error}
        </div>
      )}

      {/* Summary Stats */}
      <div className="connect-disconnect-summary">
        <div className="cd-stats">
          <div className="cd-stat">
            <div className="stat-label">Total Connects:</div>
            <div className="stat-value connect">{totalConnects}</div>
          </div>
          <div className="cd-stat">
            <div className="stat-label">Total Disconnects:</div>
            <div className="stat-value disconnect">{totalDisconnects}</div>
          </div>
          <div className="cd-stat">
            <div className="stat-label">Net Change:</div>
            <div className={`stat-value ${totalConnects >= totalDisconnects ? 'positive' : 'negative'}`}>
              {totalConnects >= totalDisconnects ? '+' : ''}{totalConnects - totalDisconnects}
            </div>
          </div>
        </div>
      </div>

      {/* Stacked Area Chart */}
      {!loading && chartData.length > 0 && (
        <div className="stacked-area-container">
          <h3 className="breakdown-title">Connection Activity (5-minute buckets)</h3>
          <div className="chart-container">
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 60 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis 
                  dataKey="time_bucket" 
                  stroke="#888"
                  fontSize={12}
                  tickFormatter={(value) => {
                    const date = new Date(value)
                    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                  }}
                  angle={-45}
                  textAnchor="end"
                  height={80}
                />
                <YAxis 
                  stroke="#888"
                  fontSize={12}
                />
                <Tooltip 
                  labelFormatter={(value) => {
                    const date = new Date(value)
                    return `Time: ${date.toLocaleString()}`
                  }}
                  formatter={(value, name) => [value, name === 'connects' ? 'Connects' : 'Disconnects']}
                  contentStyle={{
                    background: '#ffffff',
                    border: '1px solid #e5e7eb',
                    borderRadius: '6px',
                    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                  }}
                />
                <Area 
                  type="monotone" 
                  dataKey="connects" 
                  stackId="1"
                  stroke="#10b981" 
                  fill="#10b981"
                  fillOpacity={0.6}
                />
                <Area 
                  type="monotone" 
                  dataKey="disconnects" 
                  stackId="1"
                  stroke="#ef4444" 
                  fill="#ef4444"
                  fillOpacity={0.6}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Event Table with Filtering */}
      {!loading && events.length > 0 && (
        <div className="connect-disconnect-table-container">
          <div className="table-header">
            <h3 className="breakdown-title">Event Feed</h3>
            <div className="table-filter">
              <label>Filter by action:</label>
              <select 
                className="select"
                value={filterAction}
                onChange={(e) => setFilterAction(e.target.value)}
              >
                <option value="all">All Events</option>
                <option value="connect">Connects Only</option>
                <option value="disconnect">Disconnects Only</option>
              </select>
            </div>
          </div>
          
          <div className="data-table-container" style={{ maxHeight: '400px', overflowY: 'auto' }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Timestamp</th>
                  <th>Action</th>
                  <th>Client ID</th>
                  <th>Username</th>
                  <th>Details</th>
                </tr>
              </thead>
              <tbody>
                {filteredEvents.slice(0, 50).map((event) => (
                  <tr key={event.id}>
                    <td style={{ fontSize: '12px', color: '#6b7280' }}>
                      {formatTimestamp(event.ts)}
                    </td>
                    <td>
                      <span className={`action-badge ${event.action}`}>
                        {event.action === 'connect' ? '🔗 Connect' : '❌ Disconnect'}
                      </span>
                    </td>
                    <td style={{ fontSize: '13px', fontFamily: 'monospace' }}>
                      {event.clientId || 'N/A'}
                    </td>
                    <td style={{ fontSize: '13px' }}>
                      {event.username || 'N/A'}
                    </td>
                    <td style={{ fontSize: '12px', color: '#6b7280' }}>
                      {event.raw || `Client ${event.action}ed`}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          
          {filteredEvents.length > 50 && (
            <div className="table-overflow">
              <span>Showing latest 50 of {filteredEvents.length} {filterAction !== 'all' ? filterAction : ''} events</span>
            </div>
          )}
        </div>
      )}

      {!loading && events.length === 0 && (
        <div className="no-data">
          No connect/disconnect events found for the selected time range
        </div>
      )}

      {lastUpdated && (
        <div className="last-updated">
          Last updated: {lastUpdated.toLocaleString()}
          {useMockData && <span style={{ color: '#f59e0b' }}> (Using Mock Data)</span>}
        </div>
      )}
    </div>
  )
}
