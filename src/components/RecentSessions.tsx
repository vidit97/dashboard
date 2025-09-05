import React, { useState, useEffect, useCallback } from 'react'
import { GreApiService, formatTimestamp } from '../services/greApi'
import { SessionTimelineEntry } from '../config/greApi'

interface RecentSessionsProps {
  className?: string
  refreshInterval?: number
  limit?: number
}

// Mock data for fallback
const MOCK_SESSION_DATA: SessionTimelineEntry[] = [
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

export default function RecentSessions({ className, refreshInterval = 60, limit = 20 }: RecentSessionsProps) {
  const [sessionEntries, setSessionEntries] = useState(MOCK_SESSION_DATA)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [lastUpdated, setLastUpdated] = useState(null)
  const [useMockData, setUseMockData] = useState(false)

  const fetchSessionData = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      
      if (useMockData) {
        setSessionEntries(MOCK_SESSION_DATA)
      } else {
        // Get recent sessions (last 24 hours)
        const sessions = await GreApiService.getSessionTimeline(24)
        setSessionEntries(sessions)
      }
      
      setLastUpdated(new Date())
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to fetch session data'
      setError(errorMsg)
      console.error('Error fetching session data:', err)
      
      // Fallback to mock data if API fails
      if (!useMockData) {
        console.log('Falling back to mock data')
        setSessionEntries(MOCK_SESSION_DATA)
      }
    } finally {
      setLoading(false)
    }
  }, [useMockData])

  useEffect(() => {
    fetchSessionData()
    
    const interval = setInterval(fetchSessionData, refreshInterval * 1000)
    return () => clearInterval(interval)
  }, [fetchSessionData, refreshInterval])

  return (
    <div className={`chart-section ${className || ''}`}>
      <div className="chart-header">
        <h2 className="chart-title">Recent Sessions</h2>
        <div className="chart-controls">
          <button onClick={fetchSessionData} disabled={loading} className="button-secondary">
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

      {/* Recent Sessions Table */}
      {!loading && sessionEntries.length > 0 && (
        <div className="recent-sessions-table">
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
                {sessionEntries.slice(0, limit).map((entry, index) => (
                  <tr key={index}>
                    <td>{entry.client}</td>
                    <td>{entry.username || 'Unknown'}</td>
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
          No recent session data available
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
