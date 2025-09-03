import React, { useState, useEffect, useCallback } from 'react'
import { GreApiService, formatShortTime, formatDuration } from '../services/greApi'
import { ClientGanttEntry } from '../config/greApi'

interface ClientGanttProps {
  className?: string
  refreshInterval?: number
}

// Mock data for fallback
const MOCK_GANTT_DATA: ClientGanttEntry[] = [
  {
    client: 'auto-CA38A491-521C-B190-632A-60779B1E4E8F',
    username: 'greAgent',
    sessions: [
      {
        start: new Date(Date.now() - 8 * 60 * 60 * 1000).toISOString(),
        end: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(),
        duration: 120,
        isActive: false
      },
      {
        start: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
        end: null,
        duration: 0,
        isActive: true
      }
    ]
  },
  {
    client: 'auto-02170251-989E-5A88-E25B-EE6556F570FD',
    username: 'mqttClient',
    sessions: [
      {
        start: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(),
        end: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString(),
        duration: 180,
        isActive: false
      }
    ]
  }
]

export default function ClientGantt({ className, refreshInterval = 300 }: ClientGanttProps) {
  const [ganttData, setGanttData] = useState(MOCK_GANTT_DATA)
  const [timeRange, setTimeRange] = useState('24h')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [lastUpdated, setLastUpdated] = useState(null)
  const [useMockData, setUseMockData] = useState(false)

  const fetchGanttData = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      
      if (useMockData) {
        setGanttData(MOCK_GANTT_DATA)
      } else {
        const hoursBack = timeRange === '24h' ? 24 : 168
        const data = await GreApiService.getClientGantt(hoursBack)
        setGanttData(data)
      }
      
      setLastUpdated(new Date())
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to fetch client gantt data'
      setError(errorMsg)
      console.error('Error fetching gantt data:', err)
      
      if (!useMockData) {
        console.log('Falling back to mock data')
        setGanttData(MOCK_GANTT_DATA)
      }
    } finally {
      setLoading(false)
    }
  }, [timeRange, useMockData])

  useEffect(() => {
    fetchGanttData()
    
    const interval = setInterval(fetchGanttData, refreshInterval * 1000)
    return () => clearInterval(interval)
  }, [fetchGanttData, refreshInterval])

  const getTimelineWidth = () => {
    const hours = timeRange === '24h' ? 24 : 168
    return hours * 60 // minutes
  }

  const getSessionPosition = (session: ClientGanttEntry['sessions'][0]) => {
    const now = Date.now()
    const timelineWidth = getTimelineWidth()
    const timelineStart = now - (timelineWidth * 60 * 1000)
    
    const sessionStart = new Date(session.start).getTime()
    const sessionEnd = session.end ? new Date(session.end).getTime() : now
    
    const leftPercent = Math.max(0, ((sessionStart - timelineStart) / (timelineWidth * 60 * 1000)) * 100)
    const widthPercent = Math.min(100 - leftPercent, ((sessionEnd - sessionStart) / (timelineWidth * 60 * 1000)) * 100)
    
    return { left: leftPercent, width: Math.max(0.5, widthPercent) }
  }

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
          <button onClick={fetchGanttData} disabled={loading} className="button-secondary">
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

      {/* Gantt Chart */}
      {!loading && ganttData.length > 0 && (
        <div className="gantt-container">
          <div className="gantt-header">
            <div className="gantt-time-axis">
              {timeRange === '24h' ? (
                Array.from({ length: 25 }, (_, i) => (
                  <div key={i} className="time-tick">
                    {String(i).padStart(2, '0')}:00
                  </div>
                ))
              ) : (
                Array.from({ length: 8 }, (_, i) => (
                  <div key={i} className="time-tick">
                    Day {i + 1}
                  </div>
                ))
              )}
            </div>
          </div>
          
          <div className="gantt-body">
            {ganttData.map((client, index) => (
              <div key={client.client} className="gantt-row">
                <div className="gantt-row-label">
                  <div className="client-name">{client.client.substring(0, 20)}...</div>
                  <div className="client-username">{client.username}</div>
                </div>
                <div className="gantt-timeline">
                  {client.sessions.map((session, sessionIndex) => {
                    const position = getSessionPosition(session)
                    return (
                      <div
                        key={sessionIndex}
                        className={`gantt-bar ${session.isActive ? 'active' : 'inactive'}`}
                        style={{
                          left: `${position.left}%`,
                          width: `${position.width}%`
                        }}
                        title={`${formatShortTime(session.start)} - ${
                          session.end ? formatShortTime(session.end) : 'Active'
                        } (${session.isActive ? 'Active' : formatDuration(session.duration)})`}
                      >
                        <span className="gantt-bar-content">
                          {session.isActive ? '●' : ''}
                        </span>
                      </div>
                    )
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {!loading && ganttData.length === 0 && !useMockData && (
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
