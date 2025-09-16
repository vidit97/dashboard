import React, { useState, useEffect, useCallback, useRef } from 'react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import { watchMQTTService } from '../services/api'
import { StorageData, API_CONFIG } from '../config/api'

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

  const formatTimestamp = (timestamp: number): string => {
    return new Date(timestamp * 1000).toLocaleTimeString('en-US', {
      hour12: false,
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    })
  }

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
        messages_dropped_per_sec: 0
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

  const generateMockStorageData = (): ChartDataPoint[] => {
    const now = Math.floor(Date.now() / 1000)
    const points: ChartDataPoint[] = []
    
    // Generate 60 data points (15 minutes of data with 15s intervals)
    for (let i = 59; i >= 0; i--) {
      const timestamp = now - (i * 15) // 15 second intervals
      const time = formatTimestamp(timestamp)
      
      // Generate realistic mock data with some variation
      const baseTime = (60 - i) / 60 // 0 to 1 over time
      const variation = Math.sin(baseTime * Math.PI * 4) * 0.3 + Math.random() * 0.2 - 0.1
      
      points.push({
        timestamp,
        time,
        messages_stored: Math.max(0, Math.floor(100 + variation * 20 + Math.sin(baseTime * Math.PI * 2) * 10)),
        store_messages_bytes: Math.max(0, Math.floor(400 + variation * 50 + Math.cos(baseTime * Math.PI * 3) * 30)),
        messages_dropped_per_sec: Math.max(0, Math.random() * 2) // Usually 0-2 drops per second
      })
    }
    
    return points
  }

  const fetchStorageData = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      
      // Calculate time range for API call
      const now = Math.floor(Date.now() / 1000)
      const from = now - (selectedTimeRange.minutes * 60)
      const to = now
      
      console.log(`Fetching storage data for broker: ${broker}, from: ${from}, to: ${to} (${selectedTimeRange.label})`)
      
      const data = await watchMQTTService.getStorage(broker, from, to)
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
        point.messages_dropped_per_sec > 0
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
    return `${value.toFixed(0)}B`
  }

  const formatNumber = (value: number): string => {
    if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`
    if (value >= 1000) return `${(value / 1000).toFixed(1)}K`
    return value.toFixed(0)
  }

  const customTickFormatter = (value: number): string => {
    // Check if storage bytes series is visible
    const hasBytesSeries = visibleSeries['store_messages_bytes']
    
    if (hasBytesSeries && value >= 1024) {
      return formatBytes(value)
    }
    return formatNumber(value)
  }

  const customTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="chart-tooltip">
          <p className="tooltip-label">{`Time: ${label}`}</p>
          {payload.map((entry: any, index: number) => (
            <p key={index} style={{ color: entry.color }}>
              {`${entry.name}: ${
                entry.dataKey === 'store_messages_bytes' 
                  ? `${(entry.value / 1024).toFixed(1)}KB`
                  : entry.value
              }`}
            </p>
          ))}
        </div>
      )
    }
    return null
  }

  return (
    <div style={{
      background: 'white',
      borderRadius: '12px',
      border: '1px solid #e5e7eb',
      padding: '20px',
      boxShadow: '0 2px 4px rgba(0, 0, 0, 0.05)',
      minHeight: '500px'
    }}>
      <div className="chart-header">
        <h2 className="chart-title">Storage Metrics</h2>
        <div className="chart-controls">
          <select 
            className="select"
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
          
          <button onClick={fetchStorageData} disabled={loading} className="button-secondary">
            {loading ? 'Loading...' : 'Fetch Data'}
          </button>
          
          <div className="series-toggles">
            {STORAGE_SERIES_CONFIG.map(series => (
              <label key={series.key} className="series-toggle">
                <input
                  type="checkbox"
                  checked={visibleSeries[series.key]}
                  onChange={() => toggleSeries(series.key)}
                />
                <span 
                  className="series-color-indicator" 
                  style={{ backgroundColor: series.color }}
                />
                {series.name}
              </label>
            ))}
          </div>
        </div>
      </div>

      {error && (
        <div className="error-message">
          Error: {error}
        </div>
      )}

      <div className="chart-container" style={{ marginTop: '20px' }}>
        {storageData.length > 0 ? (
          <ResponsiveContainer width="100%" height={450}>
            <LineChart data={storageData} margin={{ top: 10, right: 20, left: 60, bottom: 60 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis 
                dataKey="time"
                tick={{ fontSize: 11 }}
                interval={Math.max(0, Math.floor(storageData.length / 6))}
                angle={-45}
                textAnchor="end"
                height={55}
                axisLine={{ stroke: '#d1d5db' }}
                tickLine={{ stroke: '#d1d5db' }}
                label={{ value: 'Time', position: 'insideBottom', offset: -10 }}
              />
              <YAxis 
                tick={{ fontSize: 11 }}
                tickFormatter={customTickFormatter}
                domain={['dataMin - 5%', 'dataMax + 5%']}
                allowDataOverflow={false}
                width={55}
                axisLine={{ stroke: '#d1d5db' }}
                tickLine={{ stroke: '#d1d5db' }}
                label={{ value: 'Count/Bytes', angle: -90, position: 'insideLeft' }}
              />
              <Tooltip content={customTooltip} />
              
              {STORAGE_SERIES_CONFIG.map(series => (
                visibleSeries[series.key] && (
                  <Line
                    key={series.key}
                    type="monotone"
                    dataKey={series.key}
                    stroke={series.color}
                    strokeWidth={2}
                    dot={false}
                    activeDot={{ r: 4, stroke: series.color, strokeWidth: 2 }}
                    connectNulls={false}
                  />
                )
              ))}
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <div className="chart-placeholder">
            {loading ? 'Loading storage data...' : 'No storage data available'}
          </div>
        )}
      </div>
    </div>
  )
}
