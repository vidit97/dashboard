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
import { CHART_STYLES } from '../config/chartConfig'

interface SessionReliabilityProps {
  className?: string
  refreshInterval?: number
  timeRange?: '1h' | '6h' | '24h' | '7d' | '30d' | 'all'
}

type TimePeriod = '1h' | '6h' | '24h' | '7d' | '30d' | 'all'

const TIME_PERIOD_LABELS: Record<TimePeriod, string> = {
  '1h': '1 Hour',
  '6h': '6 Hours',
  '24h': '24 Hours',
  '7d': '7 Days',
  '30d': '30 Days',
  'all': 'All Time'
}

interface HistogramBin {
  range: string
  count: number
  minDuration: number
  maxDuration: number
}

// Mock data removed - using real API data only

export default function SessionReliability({ className, refreshInterval = 180, timeRange = '7d' }: SessionReliabilityProps) {
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

      console.log(`Fetching session data from API for period: ${timeRange}`)
      const sessions = await GreApiService.getSessionsByTimeRange(timeRange)
      console.log(`Fetched ${sessions.length} sessions`)
      setSessionData(sessions)
      processSessionData(sessions)
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to fetch session data'
      setError(errorMsg)
      console.error('Error fetching session data:', err)
    } finally {
      setLoading(false)
    }
  }, [processSessionData, timeRange])

  useEffect(() => {
    fetchSessionData()
    
    const interval = setInterval(fetchSessionData, refreshInterval * 1000)
    return () => clearInterval(interval)
  }, [fetchSessionData, refreshInterval])

  // REMOVED the outer container - returning ONLY the content
  // The parent component handles the container styling
  return (
    <>
      {/* Header with title and controls */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: '16px',
        flexWrap: 'wrap',
        gap: '12px'
      }}>
        <h2 style={{
          fontSize: '18px',
          fontWeight: '600',
          margin: 0,
          color: '#1f2937'
        }}>
          Session Reliability ({TIME_PERIOD_LABELS[timeRange]})
        </h2>

        <button
          onClick={fetchSessionData}
          disabled={loading}
          style={{
            padding: '8px 16px',
            borderRadius: '6px',
            border: '1px solid #6b7280',
            fontSize: '14px',
            fontWeight: '500',
            backgroundColor: loading ? '#f3f4f6' : '#ffffff',
            color: loading ? '#9ca3af' : '#374151',
            cursor: loading ? 'not-allowed' : 'pointer',
            transition: 'all 0.2s'
          }}
          onMouseEnter={(e) => {
            if (!loading) {
              e.currentTarget.style.backgroundColor = '#f3f4f6'
              e.currentTarget.style.borderColor = '#374151'
            }
          }}
          onMouseLeave={(e) => {
            if (!loading) {
              e.currentTarget.style.backgroundColor = '#ffffff'
              e.currentTarget.style.borderColor = '#6b7280'
            }
          }}
        >
          {loading ? 'Loading...' : 'Refresh'}
        </button>
      </div>

      {error && (
        <div style={{
          backgroundColor: '#fef2f2',
          color: '#dc2626',
          padding: '12px',
          borderRadius: '6px',
          marginBottom: '16px',
          border: '1px solid #fecaca'
        }}>
          Error: {error}
        </div>
      )}

      {/* Chart - Moved to top */}
      {!loading && histogramData.length > 0 && (
        <>
          <h3 style={{
            fontSize: '16px',
            fontWeight: '600',
            color: '#1f2937',
            marginBottom: '16px',
            marginTop: '0'
          }}>
            Session Duration Distribution
          </h3>

          <div style={{ width: '100%', height: '350px', marginBottom: '20px' }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={histogramData}
                margin={{ top: 10, right: 30, left: 20, bottom: 60 }}
                barCategoryGap="20%"
              >
                <CartesianGrid strokeDasharray={CHART_STYLES.cartesianGrid.strokeDasharray} stroke={CHART_STYLES.cartesianGrid.stroke} />
                <XAxis
                  dataKey="range"
                  tick={{ fontSize: 11 }}
                  angle={-45}
                  textAnchor="end"
                  height={60}
                  interval={0}
                  axisLine={{ stroke: '#d1d5db' }}
                  tickLine={{ stroke: '#d1d5db' }}
                />
                <YAxis
                  tick={{ fontSize: 11 }}
                  allowDecimals={false}
                  domain={['dataMin - 10%', 'dataMax + 15%']}
                  width={50}
                  axisLine={{ stroke: '#d1d5db' }}
                  tickLine={{ stroke: '#d1d5db' }}
                />
                <Tooltip
                  formatter={(value: number, name: string) => [`${value} sessions`, name]}
                  labelFormatter={(label: string) => `Duration: ${label}`}
                  content={({ active, payload, label }) => {
                    if (active && payload && payload.length) {
                      return (
                        <div style={CHART_STYLES.tooltip}>
                          <p style={CHART_STYLES.tooltipLabel}>{`Duration: ${label}`}</p>
                          {payload.map((entry: any, index: number) => (
                            <p key={index} style={{ color: entry.color, ...CHART_STYLES.tooltipValue }}>
                              {`${entry.value} sessions`}
                            </p>
                          ))}
                        </div>
                      )
                    }
                    return null
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
        </>
      )}

      {/* Statistics Cards - Moved after chart */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
        gap: '12px',
        marginBottom: '16px'
      }}>
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

      {!loading && sessionData.length === 0 && (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          height: '200px',
          color: '#6b7280',
          fontSize: '16px'
        }}>
          No session data available for {TIME_PERIOD_LABELS[timeRange].toLowerCase()}
        </div>
      )}
    </>
  )
}
