import React, { useState, useEffect, useCallback } from 'react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { MetricCard } from '../ui/StatCards'
import { GreApiService, formatDuration } from '../services/greApi'
import { SessionDuration } from '../config/greApi'

interface SessionReliabilityProps {
  className?: string
  refreshInterval?: number
}

interface HistogramBin {
  range: string
  count: number
  minDuration: number
  maxDuration: number
}

// Mock data for fallback
const MOCK_SESSION_DATA: SessionDuration[] = [
  { duration: 5, client: 'client-1', username: 'testUser' },
  { duration: 15, client: 'client-2', username: 'testUser' },
  { duration: 25, client: 'client-3', username: 'greAgent' },
  { duration: 45, client: 'client-4', username: 'greAgent' },
  { duration: 60, client: 'client-5', username: 'testUser' },
  { duration: 120, client: 'client-6', username: 'greAgent' },
]

export default function SessionReliability({ className, refreshInterval = 300 }: SessionReliabilityProps) {
  const [sessionData, setSessionData] = useState<SessionDuration[]>([])
  const [histogramData, setHistogramData] = useState<HistogramBin[]>([])
  const [stats, setStats] = useState({
    median: 0,
    percentile95: 0,
    average: 0,
    total: 0
  })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)
  const [useMockData, setUseMockData] = useState(false)

  const processSessionData = useCallback((sessions: SessionDuration[]) => {
    if (sessions.length === 0) {
      setStats({ median: 0, percentile95: 0, average: 0, total: 0 })
      setHistogramData([])
      return
    }

    // Calculate statistics
    const durations = sessions.map(s => s.duration).sort((a, b) => a - b)
    const median = durations[Math.floor(durations.length / 2)]
    const percentile95 = durations[Math.floor(durations.length * 0.95)]
    const average = durations.reduce((a, b) => a + b, 0) / durations.length
    
    setStats({
      median,
      percentile95,
      average,
      total: durations.length
    })

    // Create histogram bins - ensure we have valid data
    const maxDuration = Math.max(...durations)
    const minDuration = Math.min(...durations)
    const binCount = Math.min(10, Math.max(3, Math.ceil(Math.sqrt(durations.length))))
    const binSize = Math.max(1, Math.ceil((maxDuration - minDuration) / binCount))
    
    const bins: HistogramBin[] = []
    for (let i = 0; i < binCount; i++) {
      const binMin = minDuration + (i * binSize)
      const binMax = minDuration + ((i + 1) * binSize)
      const count = durations.filter(d => 
        i === binCount - 1 ? d >= binMin : d >= binMin && d < binMax
      ).length
      
      if (count > 0 || bins.length === 0) { // Always include at least one bin
        bins.push({
          range: i === binCount - 1 && maxDuration > binMax
            ? `${formatDuration(binMin)}+` 
            : `${formatDuration(binMin)}-${formatDuration(binMax)}`,
          count,
          minDuration: binMin,
          maxDuration: binMax
        })
      }
    }
    
    setHistogramData(bins)
  }, [])

  const fetchSessionData = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      
      if (useMockData) {
        // Use mock data
        setSessionData(MOCK_SESSION_DATA)
        processSessionData(MOCK_SESSION_DATA)
      } else {
        // Try to fetch real data
        const sessions = await GreApiService.getSessionsLast7Days()
        setSessionData(sessions)
        processSessionData(sessions)
      }
      
      setLastUpdated(new Date())
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to fetch session data'
      setError(errorMsg)
      console.error('Error fetching session data:', err)
      
      // Fallback to mock data if API fails
      if (!useMockData) {
        console.log('Falling back to mock data')
        setSessionData(MOCK_SESSION_DATA)
        processSessionData(MOCK_SESSION_DATA)
      }
    } finally {
      setLoading(false)
    }
  }, [useMockData, processSessionData])

  useEffect(() => {
    fetchSessionData()
    
    const interval = setInterval(fetchSessionData, refreshInterval * 1000)
    return () => clearInterval(interval)
  }, [fetchSessionData, refreshInterval])

  return (
    <div className={`chart-section ${className || ''}`}>
      <div className="chart-header">
        <h2 className="chart-title">Session Reliability (Last 7 Days)</h2>
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

      {/* Statistics Cards */}
      <div className="reliability-stats">
        <MetricCard
          label="Total Sessions"
          value={stats.total.toString()}
          loading={loading}
          color="#3b82f6"
          unit="sessions"
        />
        <MetricCard
          label="Median Duration"
          value={formatDuration(stats.median)}
          loading={loading}
          color="#10b981"
        />
        <MetricCard
          label="95th Percentile"
          value={formatDuration(stats.percentile95)}
          loading={loading}
          color="#f59e0b"
        />
        <MetricCard
          label="Average Duration"
          value={formatDuration(stats.average)}
          loading={loading}
          color="#8b5cf6"
        />
      </div>

      {/* Histogram Chart */}
      {!loading && histogramData.length > 0 && (
        <div className="session-histogram">
          <h3 className="breakdown-title">Session Duration Distribution</h3>
          <div className="chart-container">
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={histogramData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis 
                  dataKey="range" 
                  stroke="#6b7280"
                  fontSize={12}
                  angle={-45}
                  textAnchor="end"
                  height={80}
                />
                <YAxis stroke="#6b7280" fontSize={12} />
                <Tooltip 
                  formatter={(value: number, name: string) => [`${value} sessions`, name]}
                  labelFormatter={(label: string) => `Duration: ${label}`}
                  contentStyle={{
                    backgroundColor: '#ffffff',
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px',
                    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                  }}
                />
                <Bar 
                  dataKey="count" 
                  fill="#3b82f6"
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {!loading && sessionData.length === 0 && !useMockData && (
        <div className="no-data">
          No session data available for the last 7 days
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
