import React, { useState, useEffect, useCallback } from 'react'
import { GreApiService, formatTimestamp } from '../services/greApi'
import { CheckpointEvent } from '../config/greApi'

interface BrokerCheckpointsProps {
  className?: string
  refreshInterval?: number
}

// Mock data for fallback
const MOCK_CHECKPOINT_DATA: CheckpointEvent[] = [
  {
    id: 1,
    ts: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(),
    action: 'checkpoint',
    raw: 'Saving in-memory database to /mosquitto/data//mosquitto.db.'
  },
  {
    id: 2,
    ts: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(),
    action: 'checkpoint',
    raw: 'Database checkpoint completed successfully.'
  },
  {
    id: 3,
    ts: new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString(),
    action: 'checkpoint',
    raw: 'Periodic database save initiated.'
  }
]

export default function BrokerCheckpoints({ className, refreshInterval = 300 }: BrokerCheckpointsProps) {
  const [checkpoints, setCheckpoints] = useState(MOCK_CHECKPOINT_DATA)
  const [timeRange, setTimeRange] = useState('24h')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [lastUpdated, setLastUpdated] = useState(null)
  const [useMockData, setUseMockData] = useState(false)

  const fetchCheckpoints = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      
      if (useMockData) {
        setCheckpoints(MOCK_CHECKPOINT_DATA)
      } else {
        const hoursBack = timeRange === '24h' ? 24 : 168
        const data = await GreApiService.getCheckpointEvents(hoursBack)
        setCheckpoints(data)
      }
      
      setLastUpdated(new Date())
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to fetch checkpoint data'
      setError(errorMsg)
      console.error('Error fetching checkpoints:', err)
      
      if (!useMockData) {
        console.log('Falling back to mock data')
        setCheckpoints(MOCK_CHECKPOINT_DATA)
      }
    } finally {
      setLoading(false)
    }
  }, [timeRange, useMockData])

  useEffect(() => {
    fetchCheckpoints()
    
    const interval = setInterval(fetchCheckpoints, refreshInterval * 1000)
    return () => clearInterval(interval)
  }, [fetchCheckpoints, refreshInterval])

  return (
    <div className={`chart-section ${className || ''}`}>
      <div className="chart-header">
        <h2 className="chart-title">
          💾 Broker Checkpoints 
          <span className="checkpoint-count">({checkpoints.length})</span>
        </h2>
        <div className="chart-controls">
          <select 
            className="select"
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value)}
          >
            <option value="24h">Last 24 Hours</option>
            <option value="7d">Last 7 Days</option>
          </select>
          <button onClick={fetchCheckpoints} disabled={loading} className="button-secondary">
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

      {/* Checkpoint Summary */}
      <div className="checkpoint-summary">
        <div className="checkpoint-stats">
          <div className="stat-item">
            <span className="stat-label">Total Checkpoints:</span>
            <span className="stat-value">{checkpoints.length}</span>
          </div>
          {checkpoints.length > 0 && (
            <div className="stat-item">
              <span className="stat-label">Last Checkpoint:</span>
              <span className="stat-value">{formatTimestamp(checkpoints[0]?.ts)}</span>
            </div>
          )}
        </div>
      </div>

      {/* Timeline Markers */}
      {!loading && checkpoints.length > 0 && (
        <div className="checkpoint-timeline">
          <h3 className="breakdown-title">Checkpoint Timeline</h3>
          <div className="timeline-container">
            {checkpoints.slice(0, 10).map((checkpoint, index) => (
              <div key={checkpoint.id} className="checkpoint-marker">
                <div className="marker-dot">💾</div>
                <div className="marker-details">
                  <div className="marker-time">{formatTimestamp(checkpoint.ts)}</div>
                  <div className="marker-description">
                    {checkpoint.raw || 'Database checkpoint saved'}
                  </div>
                </div>
              </div>
            ))}
          </div>
          
          {checkpoints.length > 10 && (
            <div className="timeline-overflow">
              <span>... and {checkpoints.length - 10} more checkpoints</span>
            </div>
          )}
        </div>
      )}

      {!loading && checkpoints.length === 0 && !useMockData && (
        <div className="no-data">
          No checkpoint events found for the selected time range
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
