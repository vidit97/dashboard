import React, { useState, useEffect, useCallback } from 'react'
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { GreApiService, formatTimestamp, formatShortTime } from '../services/greApi'
import { SessionTimelineEntry } from '../config/greApi'

interface SessionTimelineProps {
  className?: string
  refreshInterval?: number
}

interface TimelineData {
  timestamp: string
  time: string
  activeConnections: number
  newConnections: number
  disconnections: number
}

// Mock data for fallback
const MOCK_TIMELINE_DATA: SessionTimelineEntry[] = [
  {
    client: 'auto-2FA7DDFC-CF8E-93A9-C123-F5F5BCD0277F',
    username: 'greAgent',
    start_ts: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(),
    end_ts: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    duration: 120,
    isActive: false
  },
  {
    client: 'auto-65EED061-83DD-66CA-E7DD-85CFA285C1A1',
    username: 'testClient',
    start_ts: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(),
    end_ts: null,
    duration: 180,
    isActive: true
  },
  {
    client: 'auto-EEEC9676-7E77-58B0-E53B-061F8DA9C6E6',
    username: 'testClient',
    start_ts: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString(),
    end_ts: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
    duration: 30,
    isActive: false
  }
]

export default function SessionTimeline({ className, refreshInterval = 60 }: SessionTimelineProps) {
  const [timelineData, setTimelineData] = useState([])
  const [sessionEntries, setSessionEntries] = useState(MOCK_TIMELINE_DATA)
  const [timeRange, setTimeRange] = useState('24h')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [lastUpdated, setLastUpdated] = useState(null)
  const [useMockData, setUseMockData] = useState(false)

  const processTimelineData = useCallback((entries: SessionTimelineEntry[]) => {
    // Create 5-minute buckets for the chart
    const bucketSizeMinutes = 5
    const hoursBack = timeRange === '24h' ? 24 : 168 // 7 days
    const bucketsCount = (hoursBack * 60) / bucketSizeMinutes
    
    const now = new Date()
    const startTime = new Date(now.getTime() - hoursBack * 60 * 60 * 1000)
    
    const buckets: TimelineData[] = []
    
    for (let i = 0; i < bucketsCount; i++) {
      const bucketStart = new Date(startTime.getTime() + i * bucketSizeMinutes * 60 * 1000)
      const bucketEnd = new Date(bucketStart.getTime() + bucketSizeMinutes * 60 * 1000)
      
      let activeConnections = 0
      let newConnections = 0
      let disconnections = 0
      
      entries.forEach(entry => {
        const sessionStart = new Date(entry.start_ts)
        const sessionEnd = entry.end_ts ? new Date(entry.end_ts) : new Date()
        
        // Check if session was active during this bucket
        if (sessionStart <= bucketEnd && sessionEnd >= bucketStart) {
          activeConnections++
        }
        
        // Check if session started in this bucket
        if (sessionStart >= bucketStart && sessionStart < bucketEnd) {
          newConnections++
        }
        
        // Check if session ended in this bucket
        if (entry.end_ts && sessionEnd >= bucketStart && sessionEnd < bucketEnd) {
          disconnections++
        }
      })
      
      buckets.push({
        timestamp: bucketStart.toISOString(),
        time: formatShortTime(bucketStart.toISOString()),
        activeConnections,
        newConnections,
        disconnections
      })
    }
    
    return buckets
  }, [timeRange])

  const fetchTimelineData = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      
      const hoursBack = timeRange === '24h' ? 24 : 168
      
      if (useMockData) {
        setSessionEntries(MOCK_TIMELINE_DATA)
        const chartData = processTimelineData(MOCK_TIMELINE_DATA)
        setTimelineData(chartData)
      } else {
        const timeline = await GreApiService.getSessionTimeline(hoursBack)
        setSessionEntries(timeline)
        const chartData = processTimelineData(timeline)
        setTimelineData(chartData)
      }
      
      setLastUpdated(new Date())
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to fetch timeline data'
      setError(errorMsg)
      console.error('Error fetching timeline data:', err)
      
      if (!useMockData) {
        console.log('Falling back to mock data')
        setSessionEntries(MOCK_TIMELINE_DATA)
        const chartData = processTimelineData(MOCK_TIMELINE_DATA)
        setTimelineData(chartData)
      }
    } finally {
      setLoading(false)
    }
  }, [timeRange, useMockData, processTimelineData])

  useEffect(() => {
    fetchTimelineData()
    
    const interval = setInterval(fetchTimelineData, refreshInterval * 1000)
    return () => clearInterval(interval)
  }, [fetchTimelineData, refreshInterval])

  return (
    <div className={`chart-section ${className || ''}`}>
      <div className="chart-header">
        <h2 className="chart-title">Session Timeline</h2>
        <div className="chart-controls">
          <select 
            className="select"
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value)}
          >
            <option value="24h">Last 24 Hours</option>
            <option value="7d">Last 7 Days</option>
          </select>
          <button onClick={fetchTimelineData} disabled={loading} className="button-secondary">
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

      {/* Connection Activity Chart */}
      {!loading && timelineData.length > 0 && (
        <div className="timeline-chart">
          <h3 className="breakdown-title">Connection Activity Over Time</h3>
          <div className="chart-container">
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={timelineData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
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
                  dataKey="activeConnections" 
                  stackId="1"
                  stroke="#3b82f6" 
                  fill="#3b82f6"
                  fillOpacity={0.6}
                  name="Active Connections"
                />
                <Area 
                  type="monotone" 
                  dataKey="newConnections" 
                  stackId="2"
                  stroke="#10b981" 
                  fill="#10b981"
                  fillOpacity={0.6}
                  name="New Connections"
                />
                <Area 
                  type="monotone" 
                  dataKey="disconnections" 
                  stackId="3"
                  stroke="#ef4444" 
                  fill="#ef4444"
                  fillOpacity={0.6}
                  name="Disconnections"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Session Details Table */}
      {!loading && sessionEntries.length > 0 && (
        <div className="session-details-table">
          <h3 className="breakdown-title">Recent Sessions</h3>
          <div className="table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Client</th>
                  <th>Username</th>
                  <th>Start Time</th>
                  <th>End Time</th>
                  <th>Duration</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {sessionEntries.slice(0, 20).map((entry, index) => (
                  <tr key={index}>
                    <td>{entry.client}</td>
                    <td>{entry.username}</td>
                    <td>{formatTimestamp(entry.start_ts)}</td>
                    <td>{entry.end_ts ? formatTimestamp(entry.end_ts) : 'Still connected'}</td>
                    <td>{Math.round(entry.duration)}m</td>
                    <td>
                      <span className={`status-badge ${entry.isActive ? 'status-active' : 'status-ended'}`}>
                        {entry.isActive ? 'Active' : 'Ended'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {!loading && sessionEntries.length === 0 && !useMockData && (
        <div className="no-data">
          No session data available for the selected time range
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
