import React, { useState, useEffect, useCallback } from 'react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
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

  const totalConnections = tcpData.reduce((sum, item) => sum + item.count, 0)
  const avgConnectionsPerInterval = tcpData.length > 0 ? (totalConnections / tcpData.length).toFixed(1) : '0'

  return (
    <div className={`chart-section ${className || ''}`}>
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

      {/* TCP Stats */}
      <div className="tcp-summary">
        <div className="tcp-stats">
          <div className="stat-card">
            <div className="stat-label">Total Connections</div>
            <div className="stat-value">{totalConnections}</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">Avg per 5min</div>
            <div className="stat-value">{avgConnectionsPerInterval}</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">Time Periods</div>
            <div className="stat-value">{tcpData.length}</div>
          </div>
        </div>
      </div>

      {/* TCP Connection Chart */}
      {!loading && tcpData.length > 0 && (
        <div className="tcp-chart">
          <h3 className="breakdown-title">Connection Activity (5-min intervals)</h3>
          <div className="chart-container">
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={tcpData} margin={{ top: 10, right: 30, left: 10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis 
                  dataKey="timeWindow" 
                  stroke="#6b7280"
                  fontSize={12}
                  interval="preserveStartEnd"
                />
                <YAxis stroke="#6b7280" fontSize={12} />
                <Tooltip 
                  formatter={(value, name) => [value, 'New Connections']}
                  labelFormatter={(label) => `Time: ${label}`}
                  contentStyle={{
                    backgroundColor: '#ffffff',
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px',
                    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                  }}
                />
                <Line 
                  type="monotone" 
                  dataKey="count" 
                  stroke="#3b82f6" 
                  strokeWidth={2}
                  dot={{ fill: '#3b82f6', r: 4 }}
                  activeDot={{ r: 6 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Data Table */}
      {!loading && tcpData.length > 0 && (
        <div className="tcp-table-container">
          <h3 className="breakdown-title">Connection Details</h3>
          <div className="data-table-container" style={{ maxHeight: '200px', overflowY: 'auto' }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Time</th>
                  <th>Connections</th>
                  <th>Timestamp</th>
                </tr>
              </thead>
              <tbody>
                {tcpData.slice(-10).reverse().map((connection) => (
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
        </div>
      )}

      {!loading && tcpData.length === 0 && !useMockData && (
        <div className="no-data">
          No TCP connection data available for the selected time range
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
