import React, { useState, useEffect, useCallback } from 'react'
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { GreApiService, formatShortTime } from '../services/greApi'
import { SubscriptionEvent } from '../config/greApi'
import type { Event } from '../types/api'

interface ConnectDisconnectProps {
  className?: string
  refreshInterval?: number
}

interface ConnectDisconnectData {
  timestamp: string
  time: string
  connects: number
  disconnects: number
  netChange: number
}

// Mock data for fallback
const MOCK_CONNECT_DISCONNECT_DATA: ConnectDisconnectData[] = [
  { timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(), time: '10:00', connects: 5, disconnects: 2, netChange: 3 },
  { timestamp: new Date(Date.now() - 1.5 * 60 * 60 * 1000).toISOString(), time: '10:30', connects: 3, disconnects: 1, netChange: 2 },
  { timestamp: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString(), time: '11:00', connects: 8, disconnects: 4, netChange: 4 },
  { timestamp: new Date(Date.now() - 0.5 * 60 * 60 * 1000).toISOString(), time: '11:30', connects: 2, disconnects: 6, netChange: -4 },
  { timestamp: new Date().toISOString(), time: '12:00', connects: 6, disconnects: 3, netChange: 3 }
]

export default function RecentConnectDisconnects({ className, refreshInterval = 120 }: ConnectDisconnectProps) {
  const [connectDisconnectData, setConnectDisconnectData] = useState(MOCK_CONNECT_DISCONNECT_DATA)
  const [timeRange, setTimeRange] = useState('24h')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [lastUpdated, setLastUpdated] = useState(null)
  const [useMockData, setUseMockData] = useState(false)
  const [recentEvents, setRecentEvents] = useState<Event[] | null>(null)

  const processConnectionData = useCallback((events: SubscriptionEvent[]) => {
    // Group events into buckets of variable size (server may already bucket, but handle raw events too)
    const buckets = new Map<string, any>()

    events.forEach(event => {
      const eventTime = new Date(event.ts)
      // Use the event.ts as-is (server may provide bucketed timestamps). Round down to nearest minute
      const bucketTime = new Date(
        eventTime.getFullYear(),
        eventTime.getMonth(),
        eventTime.getDate(),
        eventTime.getHours(),
        eventTime.getMinutes(),
        0
      )

      const bucketKey = bucketTime.toISOString()

      if (!buckets.has(bucketKey)) {
        buckets.set(bucketKey, {
          timestamp: bucketKey,
          time: formatShortTime(bucketKey),
          connects: 0,
          disconnects: 0,
          netChange: 0
        })
      }

      const bucket = buckets.get(bucketKey)
      if (event.action === 'subscribe') {
        bucket.connects += event.count || 0
      } else if (event.action === 'unsubscribe') {
        bucket.disconnects += event.count || 0
      }
      bucket.netChange = bucket.connects - bucket.disconnects
    })

    return Array.from(buckets.values()).sort((a, b) => 
      new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    )
  }, [])

  const fetchConnectionData = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      
      if (useMockData) {
        setConnectDisconnectData(MOCK_CONNECT_DISCONNECT_DATA)
      } else {
        const hoursBack = timeRange === '24h' ? 24 : 168
        // Adaptive bucket size: 5 minutes for 24h, 60 minutes for 7d
        const bucketSize = timeRange === '24h' ? 5 : 60
        console.log(`Fetching connection data for last ${hoursBack} hours (${timeRange}), bucketSize=${bucketSize}m`)

        // Ask the service to aggregate into the chosen bucket size when possible
        const events = await GreApiService.getConnectionChurn(hoursBack, bucketSize)
        console.log(`Received ${events.length} connection event entries`)

        const processed = processConnectionData(events)
        console.log(`Processed into ${processed.length} time buckets`)
        setConnectDisconnectData(processed)

        // Also fetch recent raw events for the feed/table (latest 50) and filter to connects/disconnects
        try {
          const raw = await GreApiService.getAllEvents(50)
          const feed = raw.filter(e => e.action === 'connected' || e.action === 'disconnected')
            .sort((a, b) => new Date(b.ts).getTime() - new Date(a.ts).getTime())
          setRecentEvents(feed)
        } catch (fe) {
          console.warn('Failed to fetch recent events feed:', fe)
          setRecentEvents([])
        }
      }
      
      setLastUpdated(new Date())
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to fetch connection activity data'
      setError(errorMsg)
      console.error('Error fetching connection data:', err)
      
      if (!useMockData) {
        console.log('Falling back to mock data')
        setConnectDisconnectData(MOCK_CONNECT_DISCONNECT_DATA)
      }
    } finally {
      setLoading(false)
    }
  }, [timeRange, useMockData, processConnectionData])

  useEffect(() => {
    fetchConnectionData()
    
    const interval = setInterval(fetchConnectionData, refreshInterval * 1000)
    return () => clearInterval(interval)
  }, [fetchConnectionData, refreshInterval])

  const totalConnects = connectDisconnectData.reduce((sum, item) => sum + item.connects, 0)
  const totalDisconnects = connectDisconnectData.reduce((sum, item) => sum + item.disconnects, 0)
  const netChange = totalConnects - totalDisconnects

  return (
    <div className={`chart-section ${className || ''}`}>
      <div className="chart-header">
        <h2 className="chart-title">Recent Connects/Disconnects</h2>
        <div className="chart-controls">
          <select 
            className="select"
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value)}
          >
            <option value="24h">Last 24 Hours</option>
            <option value="7d">Last 7 Days</option>
          </select>
          <button onClick={fetchConnectionData} disabled={loading} className="button-secondary">
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

      {error && !useMockData && (
        <div className="error-message">
          Error: {error}
          <button 
            onClick={() => setUseMockData(true)}
            style={{ marginLeft: '8px', fontSize: '12px', padding: '4px 8px' }}
          >
            Use Mock Data
          </button>
        </div>
      )}

      {/* Summary Cards */}
      <div className="churn-summary">
        <div className="churn-card">
          <div className="churn-card-label">Total Connects</div>
          <div className="churn-card-value" style={{ color: '#10b981' }}>
            {totalConnects}
          </div>
        </div>
        <div className="churn-card">
          <div className="churn-card-label">Total Disconnects</div>
          <div className="churn-card-value" style={{ color: '#ef4444' }}>
            {totalDisconnects}
          </div>
        </div>
        <div className="churn-card">
          <div className="churn-card-label">Net Change</div>
          <div className="churn-card-value" style={{ color: netChange >= 0 ? '#10b981' : '#ef4444' }}>
            {netChange >= 0 ? '+' : ''}{netChange}
          </div>
        </div>
      </div>

      {/* Connection Chart */}
      {!loading && connectDisconnectData.length > 0 && (
        <div className="churn-chart">
          <h3 className="breakdown-title">Connection Activity (5-min intervals)</h3>
          <div className="chart-container">
            <ResponsiveContainer width="100%" height={500}>
              <AreaChart data={connectDisconnectData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis 
                  dataKey="time" 
                  stroke="#6b7280"
                  fontSize={12}
                  interval="preserveStartEnd"
                />
                <YAxis stroke="#6b7280" fontSize={12} />
                <Tooltip 
                  formatter={(value, name) => [value, name]}
                  labelFormatter={(label) => `Time: ${label}`}
                  contentStyle={{
                    backgroundColor: '#ffffff',
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px',
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
                  name="Connects"
                />
                <Area 
                  type="monotone" 
                  dataKey="disconnects" 
                  stackId="1"
                  stroke="#ef4444" 
                  fill="#ef4444"
                  fillOpacity={0.6}
                  name="Disconnects"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Recent events feed table */}
      {!loading && recentEvents && recentEvents.length > 0 && (
        <div style={{ marginTop: '20px' }}>
          <h3 className="breakdown-title">Recent Connect/Disconnect Events</h3>
          <div style={{ overflowX: 'auto', border: '1px solid #e5e7eb', borderRadius: '8px', background: '#fff' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead style={{ background: '#f9fafb' }}>
                <tr>
                  <th style={{ padding: '12px', textAlign: 'left', borderBottom: '1px solid #e5e7eb' }}>Time</th>
                  <th style={{ padding: '12px', textAlign: 'left', borderBottom: '1px solid #e5e7eb' }}>Action</th>
                  <th style={{ padding: '12px', textAlign: 'left', borderBottom: '1px solid #e5e7eb' }}>Client</th>
                  <th style={{ padding: '12px', textAlign: 'left', borderBottom: '1px solid #e5e7eb' }}>Username</th>
                </tr>
              </thead>
              <tbody>
                {recentEvents.map((ev, idx) => (
                  <tr key={ev.id} style={{ borderBottom: idx < recentEvents.length - 1 ? '1px solid #f3f4f6' : 'none' }}>
                    <td style={{ padding: '12px' }}>{new Date(ev.ts).toLocaleString()}</td>
                    <td style={{ padding: '12px' }}>{ev.action}</td>
                    <td style={{ padding: '12px' }}>{ev.client}</td>
                    <td style={{ padding: '12px' }}>{ev.username || ''}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {!loading && connectDisconnectData.length === 0 && !useMockData && (
        <div className="no-data">
          No connection activity data available for the selected time range
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
