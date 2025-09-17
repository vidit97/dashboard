import React, { useState, useEffect, useCallback, useRef } from 'react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import { watchMQTTService } from '../services/api'
import { StorageData, API_CONFIG } from '../config/api'
import { calculateOptimalStep } from '../utils/prometheusStep'
import { CHART_MARGINS, CHART_HEIGHTS, AXIS_STYLES, AXIS_DIMENSIONS, AXIS_LABELS, AXIS_DOMAIN, formatTimestamp, CHART_STYLES } from '../config/chartConfig'

interface StorageChartProps {
  broker: string
  refreshInterval?: number
  autoRefresh?: boolean
  className?: string
}

interface ChartDataPoint {
  timestamp: number
  time: string
  messages_stored: number
  store_messages_bytes: number
  messages_dropped_per_sec: number
  drops_last_minute_packets: number
  drops_last_minute_bytes: number
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

const STORAGE_SERIES_CONFIG = [
  {
    key: 'messages_stored',
    name: 'Messages Stored',
    color: '#10b981',
    visible: true
  },
  {
    key: 'store_messages_bytes',
    name: 'Storage Bytes',
    color: '#3b82f6',
    visible: true
  },
  {
    key: 'messages_dropped_per_sec',
    name: 'Dropped Messages/sec',
    color: '#ef4444',
    visible: false
  },
  {
    key: 'drops_last_minute_packets',
    name: 'Drops Last Min (Packets)',
    color: '#f59e0b',
    visible: false
  },
  {
    key: 'drops_last_minute_bytes',
    name: 'Drops Last Min (Bytes)',
    color: '#8b5cf6',
    visible: false
  }
]

export default function StorageChart({ broker, refreshInterval = 30, autoRefresh = false, className }: StorageChartProps) {
  const [storageData, setStorageData] = useState<ChartDataPoint[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [selectedTimeRange, setSelectedTimeRange] = useState<TimeRange>(TIME_RANGES[1]) // Default to 15m
  const [lastFetchTime, setLastFetchTime] = useState<Date | null>(null)
  const intervalRef = useRef<number | null>(null)
  const [visibleSeries, setVisibleSeries] = useState<Record<string, boolean>>(
    STORAGE_SERIES_CONFIG.reduce((acc, series) => {
      acc[series.key] = series.visible
      return acc
    }, {} as Record<string, boolean>)
  )


  const transformStorageData = (data: StorageData): ChartDataPoint[] => {
    if (!data.series || data.series.length === 0) {
      console.log('No storage series data available')
      return []
    }

    console.log('Transforming storage data with series:', data.series.map(s => s.name))
    
    // Get all unique timestamps from all series
    const timestamps = new Set<number>()
    data.series.forEach(series => {
      if (series.points && Array.isArray(series.points)) {
        series.points.forEach(([timestamp]) => {
          if (typeof timestamp === 'number') {
            timestamps.add(timestamp)
          }
        })
      }
    })

    if (timestamps.size === 0) {
      console.log('No valid timestamps found in storage data')
      return []
    }

    // Create data points for each timestamp
    const sortedTimestamps = Array.from(timestamps).sort()
    console.log(`Processing ${sortedTimestamps.length} storage timestamps`)
    
    return sortedTimestamps.map(timestamp => {
      const dataPoint: ChartDataPoint = {
        timestamp,
        time: formatTimestamp(timestamp),
        messages_stored: 0,
        store_messages_bytes: 0,
        messages_dropped_per_sec: 0,
        drops_last_minute_packets: 0,
        drops_last_minute_bytes: 0
      }

      // Fill in values from each series
      data.series.forEach(series => {
        if (series.points && Array.isArray(series.points)) {
          const point = series.points.find(([ts]) => ts === timestamp)
          if (point && series.name in dataPoint) {
            const value = typeof point[1] === 'number' ? point[1] : 0
            ;(dataPoint as any)[series.name] = value
          }
        }
      })

      return dataPoint
    })
  }


  const fetchStorageData = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      
      // Calculate time range and optimal step for API call
      const now = Math.floor(Date.now() / 1000)
      const from = now - (selectedTimeRange.minutes * 60)
      const to = now
      const step = calculateOptimalStep(selectedTimeRange.minutes)
      
      console.log(`Fetching storage data for broker: ${broker}, from: ${from}, to: ${to}, step: ${step}s (${selectedTimeRange.label})`)
      
      const data = await watchMQTTService.getStorage(broker, from, to, step)
      console.log('Raw storage API response:', data)
      
      const transformedData = transformStorageData(data)
      console.log('Transformed storage chart data:', transformedData)
      
      // Always show the data, even if it's all zeros (real API response)
      setStorageData(transformedData)
      setLastFetchTime(new Date())
      
      // Check if data is all zeros and inform user
      const hasNonZeroData = transformedData.some(point =>
        point.messages_stored > 0 ||
        point.store_messages_bytes > 0 ||
        point.messages_dropped_per_sec > 0 ||
        point.drops_last_minute_packets > 0 ||
        point.drops_last_minute_bytes > 0
      )
      
      if (!hasNonZeroData && transformedData.length > 0) {
        console.log('Storage API returned valid data structure but all values are zero')
      }
      
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to fetch storage data'
      setError(errorMsg)
      console.error('Error fetching storage data:', err)
    } finally {
      setLoading(false)
    }
  }, [broker, selectedTimeRange])

  // Manual refresh only - no auto-refresh to avoid excessive API calls
  useEffect(() => {
    // Only fetch on component mount
    fetchStorageData()
  }, []) // Empty dependency array - only runs once

  // Fetch data when time range changes
  useEffect(() => {
    if (selectedTimeRange !== TIME_RANGES[1]) { // Only if not initial value
      fetchStorageData()
    }
  }, [selectedTimeRange, fetchStorageData])

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
    // Check if any bytes series is visible
    const hasBytesSeries = visibleSeries['store_messages_bytes'] || visibleSeries['drops_last_minute_bytes']

    if (hasBytesSeries && value >= 1024) {
      return formatBytes(value)
    }
    return formatNumber(value)
  }

  const customTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div style={CHART_STYLES.tooltip}>
          <p style={CHART_STYLES.tooltipLabel}>{`Time: ${label}`}</p>
          {payload.map((entry: any, index: number) => (
            <p key={index} style={{ color: entry.color, ...CHART_STYLES.tooltipValue }}>
              {`${entry.name}: ${
                entry.dataKey === 'store_messages_bytes' || entry.dataKey === 'drops_last_minute_bytes'
                  ? formatBytes(entry.value)
                  : entry.value
              }`}
            </p>
          ))}
        </div>
      )
    }
    return null
  }

  // REMOVED the outer container - returning ONLY the content
  // The parent component handles the container styling
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
          Storage Metrics
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
            onClick={fetchStorageData}
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
        {STORAGE_SERIES_CONFIG.map(series => (
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
        {storageData.length > 0 ? (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={storageData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="time" />
              <YAxis tickFormatter={customTickFormatter} />
              <Tooltip content={customTooltip} />

              {STORAGE_SERIES_CONFIG.map(series => (
                visibleSeries[series.key] && (
                  <Line
                    key={series.key}
                    type="monotone"
                    dataKey={series.key}
                    stroke={series.color}
                    strokeWidth={2}
                    name={series.name}
                    dot={false}
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
            {loading ? 'Loading storage data...' : 'No storage data available'}
          </div>
        )}
      </div>
    </>
  )
}
