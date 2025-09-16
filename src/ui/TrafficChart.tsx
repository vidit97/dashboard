import React, { useState, useEffect, useCallback, useRef } from 'react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import { watchMQTTService } from '../services/api'
import { TrafficData, API_CONFIG } from '../config/api'

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

  const formatTimestamp = (timestamp: number): string => {
    return new Date(timestamp * 1000).toLocaleTimeString('en-US', {
      hour12: false,
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    })
  }

  const transformTrafficData = (data: TrafficData): ChartDataPoint[] => {
    if (!data.series || data.series.length === 0) {
      console.log('No series data available')
      return []
    }

    console.log('Transforming data with series:', data.series.map(s => s.name))
    
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
      console.log('No valid timestamps found')
      return []
    }

    // Create data points for each timestamp
    const sortedTimestamps = Array.from(timestamps).sort()
    console.log(`Processing ${sortedTimestamps.length} timestamps`)
    
    return sortedTimestamps.map(timestamp => {
      const dataPoint: ChartDataPoint = {
        timestamp,
        time: formatTimestamp(timestamp),
        messages_sent_per_sec_1m: 0,
        messages_received_per_sec_1m: 0,
        bytes_sent_per_sec_1m: 0,
        bytes_received_per_sec_1m: 0
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

  const generateMockData = (): ChartDataPoint[] => {
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
        messages_sent_per_sec_1m: Math.max(0, 50 + variation * 30 + Math.sin(baseTime * Math.PI * 2) * 20),
        messages_received_per_sec_1m: Math.max(0, 45 + variation * 25 + Math.cos(baseTime * Math.PI * 3) * 15),
        bytes_sent_per_sec_1m: Math.max(0, 1500 + variation * 500 + Math.sin(baseTime * Math.PI * 1.5) * 300),
        bytes_received_per_sec_1m: Math.max(0, 1200 + variation * 400 + Math.cos(baseTime * Math.PI * 2.5) * 250)
      })
    }
    
    return points
  }

  const fetchTrafficData = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      
      // Calculate time range for API call
      const now = Math.floor(Date.now() / 1000)
      const from = now - (selectedTimeRange.minutes * 60)
      const to = now
      
      console.log(`Fetching traffic data for broker: ${broker}, from: ${from}, to: ${to} (${selectedTimeRange.label})`)
      
      const data = await watchMQTTService.getTraffic(broker, from, to)
      console.log('Raw traffic API response:', data)
      
      const transformedData = transformTrafficData(data)
      console.log('Transformed chart data:', transformedData)
      
      // Always show the data, even if it's all zeros (real API response)
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

  // Manual refresh only - no auto-refresh to avoid excessive API calls
  useEffect(() => {
    // Only fetch on component mount
    fetchTrafficData()
  }, []) // Empty dependency array - only runs once

  // Fetch data when time range changes
  useEffect(() => {
    if (selectedTimeRange !== TIME_RANGES[1]) { // Only if not initial value
      fetchTrafficData()
    }
  }, [selectedTimeRange, fetchTrafficData])

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
    // Check if any byte series are visible
    const hasBytesSeries = visibleSeries['bytes_sent_per_sec_1m'] || visibleSeries['bytes_received_per_sec_1m']
    
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
              {`${entry.name}: ${entry.value.toFixed(2)}`}
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
      width: '100%',
      height: '600px',
      overflow: 'hidden',
      boxSizing: 'border-box'
    }}>
      <div className="chart-header">
        <h2 className="chart-title">Traffic (Messages + Bytes)</h2>
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
          
          <button onClick={fetchTrafficData} disabled={loading} className="button-secondary">
            {loading ? 'Loading...' : 'Fetch Data'}
          </button>
          
          <div className="series-toggles">
            {TRAFFIC_SERIES_CONFIG.map(series => (
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

      <div className="chart-container" style={{ marginTop: '20px', width: '100%', height: '480px', overflow: 'hidden' }}>
        {trafficData.length > 0 ? (
          <ResponsiveContainer width="100%" height={480}>
            <LineChart data={trafficData} margin={{ top: 10, right: 20, left: 60, bottom: 60 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis 
                dataKey="time"
                tick={{ fontSize: 11 }}
                interval={Math.max(0, Math.floor(trafficData.length / 6))}
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
                label={{ value: 'Rate', angle: -90, position: 'insideLeft' }}
              />
              <Tooltip content={customTooltip} />
              
              {TRAFFIC_SERIES_CONFIG.map(series => (
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
            {loading ? 'Loading traffic data...' : 'No traffic data available'}
          </div>
        )}
      </div>
    </div>
  )
}
