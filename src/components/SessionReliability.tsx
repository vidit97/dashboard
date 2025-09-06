import React, { useState, useEffect, useCallback } from 'react'
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer 
} from 'recharts'
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

// Mock data removed - using real API data only

export default function SessionReliability({ className, refreshInterval = 180 }: SessionReliabilityProps) {
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

    // Create smart histogram bins based on actual data distribution
    const maxDuration = Math.max(...durations)
    const minDuration = Math.min(...durations)
    
    console.log(`Duration range: ${minDuration.toFixed(2)} - ${maxDuration.toFixed(2)} minutes`)
    
    let bins: HistogramBin[] = []
    
    // For very short sessions (most MQTT sessions), use second-based bins
    if (maxDuration < 1) {
      // Use seconds for bins when all durations are under 1 minute
      const ranges = [
        { min: 0, max: 0.0167, label: '0-1s' },      // 0-1 second
        { min: 0.0167, max: 0.0833, label: '1-5s' }, // 1-5 seconds
        { min: 0.0833, max: 0.25, label: '5-15s' },  // 5-15 seconds
        { min: 0.25, max: 0.5, label: '15-30s' },    // 15-30 seconds
        { min: 0.5, max: 1, label: '30s-1m' }        // 30s-1min
      ]
      
      bins = ranges.map(range => {
        const count = durations.filter(d => d >= range.min && d < range.max).length
        return {
          range: range.label,
          count,
          minDuration: range.min,
          maxDuration: range.max
        }
      }).filter(bin => bin.count > 0)
      
    } else if (maxDuration < 60) {
      // Use minute-based bins for sessions under 1 hour
      const ranges = [
        { min: 0, max: 0.25, label: '0-15s' },
        { min: 0.25, max: 1, label: '15s-1m' },
        { min: 1, max: 5, label: '1-5m' },
        { min: 5, max: 15, label: '5-15m' },
        { min: 15, max: 30, label: '15-30m' },
        { min: 30, max: 60, label: '30m-1h' }
      ]
      
      bins = ranges.map(range => {
        const count = durations.filter(d => d >= range.min && d < range.max).length
        return {
          range: range.label,
          count,
          minDuration: range.min,
          maxDuration: range.max
        }
      }).filter(bin => bin.count > 0)
      
    } else {
      // Use hour-based bins for longer sessions
      const ranges = [
        { min: 0, max: 1, label: '0-1m' },
        { min: 1, max: 15, label: '1-15m' },
        { min: 15, max: 60, label: '15m-1h' },
        { min: 60, max: 240, label: '1-4h' },
        { min: 240, max: 720, label: '4-12h' },
        { min: 720, max: Infinity, label: '12h+' }
      ]
      
      bins = ranges.map(range => {
        const count = durations.filter(d => d >= range.min && (range.max === Infinity ? true : d < range.max)).length
        return {
          range: range.label,
          count,
          minDuration: range.min,
          maxDuration: range.max === Infinity ? maxDuration : range.max
        }
      }).filter(bin => bin.count > 0)
    }
    
    setHistogramData(bins)
  }, [])

  const fetchSessionData = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      
      console.log('Fetching session data from API...')
      const sessions = await GreApiService.getSessionsLast7Days()
      console.log(`Fetched ${sessions.length} sessions`)
      setSessionData(sessions)
      processSessionData(sessions)
      setLastUpdated(new Date())
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to fetch session data'
      setError(errorMsg)
      console.error('Error fetching session data:', err)
    } finally {
      setLoading(false)
    }
  }, [processSessionData])

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
        </div>
      </div>

      {error && (
        <div className="error-message">
          Error: {error}
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
              <BarChart 
                data={histogramData} 
                margin={{ top: 20, right: 30, left: 20, bottom: 80 }}
                barCategoryGap="20%"
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis 
                  dataKey="range" 
                  stroke="#6b7280"
                  fontSize={12}
                  angle={-45}
                  textAnchor="end"
                  height={80}
                  interval={0}
                />
                <YAxis 
                  stroke="#6b7280" 
                  fontSize={12}
                  allowDecimals={false}
                  domain={[0, 'dataMax']}
                />
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
                  maxBarSize={60}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {!loading && sessionData.length === 0 && (
        <div className="no-data">
          No session data available for the last 7 days
        </div>
      )}

      {lastUpdated && (
        <div className="last-updated">
          Last updated: {lastUpdated.toLocaleString()}
          {sessionData.length > 0 && (
            <span style={{ color: '#10b981', marginLeft: '8px' }}>
              • {sessionData.length} sessions analyzed
            </span>
          )}
        </div>
      )}
    </div>
  )
}
