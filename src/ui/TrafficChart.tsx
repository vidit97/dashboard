import React, { useState, useEffect, useCallback, useRef } from 'react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import { watchMQTTService } from '../services/api'
import { TrafficData, API_CONFIG } from '../config/api'
import { calculateOptimalStep } from '../utils/prometheusStep'
import { transformTimeSeriesWithCompleteAxis, getTimeRangeParams } from '../utils/timeSeriesUtils'
import { CHART_MARGINS, CHART_HEIGHTS, AXIS_STYLES, AXIS_DIMENSIONS, AXIS_LABELS, AXIS_DOMAIN, formatTimestamp, CHART_STYLES } from '../config/chartConfig'

interface TrafficChartProps {
  broker: string
  refreshInterval?: number
  autoRefresh?: boolean
  className?: string
}

interface ChartDataPoint {
  timestamp: number
  time: string
  messages_sent_per_sec_1m: number
  messages_received_per_sec_1m: number
  bytes_sent_per_sec_1m: number
  bytes_received_per_sec_1m: number
}

interface TimeRange {
  label: string
  minutes: number
}

const TIME_RANGES: TimeRange[] = [
  { label: 'Last 5m', minutes: 5 },
  { label: 'Last 15m', minutes: 15 },
  { label: 'Last 30m', minutes: 30 },
  { label: 'Last 1h', minutes: 60 },
  { label: 'Last 3h', minutes: 180 },
  { label: 'Last 6h', minutes: 360 },
  { label: 'Last 24h', minutes: 1440 },
]

const TRAFFIC_SERIES_CONFIG = [
  {
    key: 'messages_sent_per_sec_1m',
    name: 'Messages Sent/sec',
    color: '#3b82f6',
    visible: true
  },
  {
    key: 'messages_received_per_sec_1m', 
    name: 'Messages Received/sec',
    color: '#10b981',
    visible: true
  },
  {
    key: 'bytes_sent_per_sec_1m',
    name: 'Bytes Sent/sec',
    color: '#f59e0b',
    visible: true
  },
  {
    key: 'bytes_received_per_sec_1m',
    name: 'Bytes Received/sec',
    color: '#ef4444',
    visible: false
  }
]

export default function TrafficChart({ broker, refreshInterval = 30, autoRefresh = false, className }: TrafficChartProps) {
  const [trafficData, setTrafficData] = useState<ChartDataPoint[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [selectedTimeRange, setSelectedTimeRange] = useState<TimeRange>(TIME_RANGES[1]) // Default to 15m
  const [lastFetchTime, setLastFetchTime] = useState<Date | null>(null)
  const intervalRef = useRef<number | null>(null)
  const [visibleSeries, setVisibleSeries] = useState<Record<string, boolean>>(
    TRAFFIC_SERIES_CONFIG.reduce((acc, series) => {
      acc[series.key] = series.visible
      return acc
    }, {} as Record<string, boolean>)
  )


  const transformTrafficData = (data: TrafficData, from: number, to: number, step: number): ChartDataPoint[] => {
    console.log('Transforming data with series:', data.series?.map(s => s.name) || [])

    // CREATE FULL TIMELINE FIRST (like drawing the graph paper)
    const fullTimeline: ChartDataPoint[] = []
    for (let timestamp = from; timestamp <= to; timestamp += step) {
      fullTimeline.push({
        timestamp,
        time: formatTimestamp(timestamp),
        messages_sent_per_sec_1m: null,
        messages_received_per_sec_1m: null,
        bytes_sent_per_sec_1m: null,
        bytes_received_per_sec_1m: null
      })
    }

    console.log(`Created full timeline: ${fullTimeline.length} points from ${formatTimestamp(from)} to ${formatTimestamp(to)}`)

    // Now fill in data where it exists
    if (data.series && data.series.length > 0) {
      data.series.forEach(series => {
        if (series.points && Array.isArray(series.points)) {
          series.points.forEach(([timestamp, value]) => {
            // Find the timeline point for this timestamp
            const timelinePoint = fullTimeline.find(point => point.timestamp === timestamp)
            if (timelinePoint && series.name in timelinePoint) {
              ;(timelinePoint as any)[series.name] = typeof value === 'number' ? value : null
            }
          })
        }
      })
    }

    console.log(`Filled in data at ${data.series?.[0]?.points?.length || 0} timestamps`)
    return fullTimeline
  }

  const fetchTrafficData = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

      const { from, to, step } = getTimeRangeParams(selectedTimeRange.minutes)

      console.log(`🔥 API CALL: ${selectedTimeRange.label}`)
      console.log(`- Minutes: ${selectedTimeRange.minutes}`)
      console.log(`- From: ${from} (${new Date(from * 1000).toISOString()})`)
      console.log(`- To: ${to} (${new Date(to * 1000).toISOString()})`)
      console.log(`- Step: ${step}s (${step/60}min)`)
      console.log(`- Duration: ${(to - from) / 3600} hours`)

      const data = await watchMQTTService.getTraffic(broker, from, to, step)

      console.log(`🔥 API RESPONSE:`)
      console.log(`- Series count: ${data.series?.length || 0}`)
      if (data.series?.[0]?.points) {
        console.log(`- First timestamp: ${data.series[0].points[0]?.[0]} (${new Date(data.series[0].points[0]?.[0] * 1000).toISOString()})`)
        console.log(`- Last timestamp: ${data.series[0].points[data.series[0].points.length-1]?.[0]} (${new Date(data.series[0].points[data.series[0].points.length-1]?.[0] * 1000).toISOString()})`)
        console.log(`- Total points: ${data.series[0].points.length}`)
      }

      const transformedData = transformTrafficData(data, from, to, step)

      setTrafficData(transformedData)
      setLastFetchTime(new Date())

      // Check if data is all zeros and inform user
      const hasNonZeroData = transformedData.some(point =>
        point.messages_sent_per_sec_1m > 0 ||
        point.messages_received_per_sec_1m > 0 ||
        point.bytes_sent_per_sec_1m > 0 ||
        point.bytes_received_per_sec_1m > 0
      )

      if (!hasNonZeroData && transformedData.length > 0) {
        console.log('API returned valid data structure but all values are zero')
      }

    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to fetch traffic data'
      setError(errorMsg)
      console.error('Error fetching traffic data:', err)
    } finally {
      setLoading(false)
    }
  }, [broker, selectedTimeRange])

  // Fetch data on component mount and when time range changes
  useEffect(() => {
    fetchTrafficData()
  }, [fetchTrafficData])

  // Clear any existing intervals when component unmounts
  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
    }
  }, [])

  const toggleSeries = (seriesKey: string) => {
    setVisibleSeries(prev => ({
      ...prev,
      [seriesKey]: !prev[seriesKey]
    }))
  }

  const formatBytes = (value: number): string => {
    if (value >= 1024 * 1024 * 1024) return `${(value / (1024 * 1024 * 1024)).toFixed(1)}GB`
    if (value >= 1024 * 1024) return `${(value / (1024 * 1024)).toFixed(1)}MB`
    if (value >= 1024) return `${(value / 1024).toFixed(1)}KB`
    if (value >= 1) return `${value.toFixed(1)}B`
    if (value > 0) return `${value.toFixed(2)}B`
    return '0B'
  }

  const formatNumber = (value: number): string => {
    if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`
    if (value >= 1000) return `${(value / 1000).toFixed(1)}K`
    if (value >= 1) return value.toFixed(1)
    if (value >= 0.1) return value.toFixed(2)
    if (value > 0) return value.toFixed(3)
    return '0'
  }

  const customTickFormatter = (value: number): string => {
    // Check if any byte series are visible
    const hasBytesSeries = visibleSeries['bytes_sent_per_sec_1m'] || visibleSeries['bytes_received_per_sec_1m']
    
    if (hasBytesSeries && value >= 1024) {
      return formatBytes(value)
    }
    
    // For small values, show more precision
    if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`
    if (value >= 1000) return `${(value / 1000).toFixed(1)}K`
    if (value >= 1) return value.toFixed(1)
    if (value >= 0.1) return value.toFixed(2)
    if (value > 0) return value.toFixed(3)
    return '0'
  }

  const customTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div style={CHART_STYLES.tooltip}>
          <p style={CHART_STYLES.tooltipLabel}>{`Time: ${label}`}</p>
          {payload.map((entry: any, index: number) => (
            <p key={index} style={{ color: entry.color, ...CHART_STYLES.tooltipValue }}>
              {`${entry.name}: ${entry.value.toFixed(2)}`}
            </p>
          ))}
        </div>
      )
    }
    return null
  }

  // REMOVED the outer container - this component now returns ONLY the content
  // The parent will handle the container styling
  return (
    <>
      {/* Header with title and controls */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: '20px',
        flexWrap: 'wrap',
        gap: '16px'
      }}>
        <h2 style={{
          fontSize: '18px',
          fontWeight: '600',
          margin: 0,
          color: '#1f2937'
        }}>
          Traffic (Messages + Bytes)
        </h2>
        
        <div style={{
          display: 'flex',
          gap: '12px',
          alignItems: 'center',
          flexWrap: 'wrap'
        }}>
          <select 
            style={{
              padding: '6px 12px',
              borderRadius: '6px',
              border: '1px solid #d1d5db',
              fontSize: '14px',
              backgroundColor: 'white',
              cursor: 'pointer'
            }}
            value={selectedTimeRange.label}
            onChange={(e) => {
              const range = TIME_RANGES.find(r => r.label === e.target.value)
              if (range) setSelectedTimeRange(range)
            }}
          >
            {TIME_RANGES.map(range => (
              <option key={range.label} value={range.label}>
                {range.label}
              </option>
            ))}
          </select>
          
          <button 
            onClick={fetchTrafficData} 
            disabled={loading}
            style={{
              padding: '6px 16px',
              borderRadius: '6px',
              border: '1px solid #d1d5db',
              fontSize: '14px',
              backgroundColor: loading ? '#f9fafb' : '#ffffff',
              color: loading ? '#6b7280' : '#374151',
              cursor: loading ? 'not-allowed' : 'pointer',
              transition: 'all 0.2s',
              fontWeight: '500'
            }}
            onMouseEnter={(e) => {
              if (!loading) {
                e.currentTarget.style.backgroundColor = '#f3f4f6'
                e.currentTarget.style.borderColor = '#9ca3af'
              }
            }}
            onMouseLeave={(e) => {
              if (!loading) {
                e.currentTarget.style.backgroundColor = '#ffffff'
                e.currentTarget.style.borderColor = '#d1d5db'
              }
            }}
          >
            {loading ? 'Loading...' : 'Fetch Data'}
          </button>
        </div>
      </div>

      {/* Series toggles */}
      <div style={{
        display: 'flex',
        gap: '16px',
        marginBottom: '20px',
        flexWrap: 'wrap'
      }}>
        {TRAFFIC_SERIES_CONFIG.map(series => (
          <label 
            key={series.key} 
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              cursor: 'pointer',
              fontSize: '14px',
              color: '#4b5563'
            }}
          >
            <input
              type="checkbox"
              checked={visibleSeries[series.key]}
              onChange={() => toggleSeries(series.key)}
              style={{ cursor: 'pointer' }}
            />
            <span 
              style={{
                width: '12px',
                height: '12px',
                borderRadius: '2px',
                backgroundColor: series.color,
                flexShrink: 0
              }}
            />
            <span>{series.name}</span>
          </label>
        ))}
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

      {/* Chart */}
      <div style={{ width: '100%', height: '300px' }}>
        {trafficData.length > 0 ? (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={trafficData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="time" />
              <YAxis tickFormatter={customTickFormatter} />
              <Tooltip content={customTooltip} />
              
              {TRAFFIC_SERIES_CONFIG.map(series => (
                visibleSeries[series.key] && (
                  <Line
                    key={series.key}
                    type="monotone"
                    dataKey={series.key}
                    stroke={series.color}
                    strokeWidth={2}
                    name={series.name}
                    dot={false}
                    connectNulls={false}
                  />
                )
              ))}
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            height: '100%',
            color: '#6b7280'
          }}>
            {loading ? 'Loading traffic data...' : 'No traffic data available'}
          </div>
        )}
      </div>
    </>
  )
}