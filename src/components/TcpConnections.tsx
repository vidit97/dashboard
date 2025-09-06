import React, { useState, useEffect, useCallback } from 'react'
import { GreApiService } from '../services/greApi'
import { ConnectionInfoEvent } from '../config/greApi'

interface TcpConnectionsProps {
  className?: string
  refreshInterval?: number
}

// Mock data for fallback
const MOCK_TCP_DATA: ConnectionInfoEvent[] = [
  { id: 1, ts: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(), action: 'conn_info', count: 3, timeWindow: '10:00' },
  { id: 2, ts: new Date(Date.now() - 1.5 * 60 * 60 * 1000).toISOString(), action: 'conn_info', count: 1, timeWindow: '10:30' },
  { id: 3, ts: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString(), action: 'conn_info', count: 5, timeWindow: '11:00' },
  { id: 4, ts: new Date(Date.now() - 0.5 * 60 * 60 * 1000).toISOString(), action: 'conn_info', count: 2, timeWindow: '11:30' },
  { id: 5, ts: new Date().toISOString(), action: 'conn_info', count: 4, timeWindow: '12:00' }
]

// Helper function to create SVG path for sparkline
function createSparklinePath(data: number[], width: number, height: number): string {
  if (data.length < 2) return ''
  
  const maxValue = Math.max(...data)
  const minValue = Math.min(...data)
  const range = maxValue - minValue || 1
  
  let path = ''
  
  data.forEach((value, index) => {
    const x = (index / (data.length - 1)) * (width - 10) + 5
    const y = height - 5 - ((value - minValue) / range) * (height - 10)
    
    if (index === 0) {
      path += `M ${x} ${y}`
    } else {
      path += ` L ${x} ${y}`
    }
  })
  
  return path
}

export default function TcpConnections({ className, refreshInterval = 180 }: TcpConnectionsProps) {
  const [tcpData, setTcpData] = useState(MOCK_TCP_DATA)
  const [timeRange, setTimeRange] = useState('24h')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [lastUpdated, setLastUpdated] = useState(null)
  const [useMockData, setUseMockData] = useState(false)

  const fetchTcpData = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      
      if (useMockData) {
        setTcpData(MOCK_TCP_DATA)
      } else {
        const hoursBack = timeRange === '24h' ? 24 : 168
        const data = await GreApiService.getConnectionInfoEvents(hoursBack)
        setTcpData(data)
      }
      
      setLastUpdated(new Date())
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to fetch TCP connection data'
      setError(errorMsg)
      console.error('Error fetching TCP data:', err)
      
      if (!useMockData) {
        console.log('Falling back to mock data')
        setTcpData(MOCK_TCP_DATA)
      }
    } finally {
      setLoading(false)
    }
  }, [timeRange, useMockData])

  useEffect(() => {
    fetchTcpData()
    
    const interval = setInterval(fetchTcpData, refreshInterval * 1000)
    return () => clearInterval(interval)
  }, [fetchTcpData, refreshInterval])

  // Calculate summary stats
  const totalConnections = tcpData.reduce((sum, item) => sum + item.count, 0)
  const avgConnectionsPerInterval = tcpData.length > 0 ? (totalConnections / tcpData.length).toFixed(1) : '0'
  const maxConnections = tcpData.length > 0 ? Math.max(...tcpData.map(item => item.count)) : 0
  
  // Prepare data for tiny sparkline - last 12 data points
  const sparklineData = tcpData.slice(-12).map(item => item.count)

  return (
    <div className={`chart-section ${className || ''}`} style={{ minHeight: 'auto' }}>
      <div className="chart-header">
        <h2 className="chart-title">🔗 TCP Connections</h2>
        <div className="chart-controls">
          <select 
            className="select"
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value)}
          >
            <option value="24h">Last 24 Hours</option>
            <option value="7d">Last 7 Days</option>
          </select>
          <button onClick={fetchTcpData} disabled={loading} className="button-secondary">
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

      {/* Compact TCP Summary */}
      <div className="tcp-compact-summary">
        <div className="compact-tcp-stats">
          <div className="compact-stat">
            <div className="stat-label">Avg:</div>
            <div className="stat-value">{avgConnectionsPerInterval}/5min</div>
          </div>
          <div className="compact-stat">
            <div className="stat-label">Peak:</div>
            <div className="stat-value">{maxConnections}</div>
          </div>
          <div className="compact-stat">
            <div className="stat-label">Total:</div>
            <div className="stat-value">{totalConnections}</div>
          </div>
        </div>

        {/* Enhanced Diagnostic Sparkline */}
        {!loading && sparklineData.length > 0 && (
          <div className="tcp-sparkline-container">
            <div className="sparkline-label">Activity Trend:</div>
            <div className="tcp-sparkline-enhanced">
              <svg width="300" height="100" viewBox="0 0 300 100">
                <defs>
                  <linearGradient id="tcpSparklineGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.8"/>
                    <stop offset="100%" stopColor="#3b82f6" stopOpacity="0.2"/>
                  </linearGradient>
                </defs>
                {sparklineData.length > 1 && (
                  <>
                    <path
                      d={createSparklinePath(sparklineData, 200, 60)}
                      fill="none"
                      stroke="#3b82f6"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                    <path
                      d={createSparklinePath(sparklineData, 200, 60) + ` L ${190} 55 L 10 55 Z`}
                      fill="url(#tcpSparklineGradient)"
                      opacity="0.3"
                    />
                  </>
                )}
                {sparklineData.map((value, index) => {
                  const x = (index / Math.max(sparklineData.length - 1, 1)) * 180 + 10
                  const maxValue = Math.max(...sparklineData)
                  const minValue = Math.min(...sparklineData)
                  const range = maxValue - minValue || 1
                  const y = 50 - ((value - minValue) / range) * 40
                  return (
                    <circle
                      key={index}
                      cx={x}
                      cy={y}
                      r="2.5"
                      fill="#3b82f6"
                      className="sparkline-dot"
                      title={`${value} connections`}
                    />
                  )
                })}
              </svg>
            </div>
          </div>
        )}
      </div>

      {/* TCP Connection Data Table */}
      {!loading && tcpData.length > 0 && (
        <div className="tcp-table-container">
          <h3 className="breakdown-title">Connection Activity Details</h3>
          <div className="data-table-container" style={{ maxHeight: '400px', overflowY: 'auto' }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Time Window</th>
                  <th>Connections</th>
                  <th>Timestamp</th>
                </tr>
              </thead>
              <tbody>
                {tcpData.slice(-15).reverse().map((connection) => (
                  <tr key={connection.id}>
                    <td>{connection.timeWindow}</td>
                    <td>
                      <span className="connection-count">{connection.count}</span>
                    </td>
                    <td style={{ fontSize: '12px', color: '#6b7280' }}>
                      {new Date(connection.ts).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          
          {tcpData.length > 15 && (
            <div className="table-overflow">
              <span>Showing latest 15 of {tcpData.length} total time periods</span>
            </div>
          )}
        </div>
      )}

      {!loading && tcpData.length === 0 && !useMockData && (
        <div className="no-data-compact">
          No TCP connection data available for the selected time range
        </div>
      )}

      {lastUpdated && (
        <div className="last-updated" style={{ fontSize: '11px', margin: '8px 0 0 0' }}>
          Last updated: {lastUpdated.toLocaleString()}
          {useMockData && <span style={{ color: '#f59e0b' }}> (Using Mock Data)</span>}
        </div>
      )}
    </div>
  )
}
