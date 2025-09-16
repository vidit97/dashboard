import React, { useState, useEffect, useCallback, useRef } from 'react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import { watchMQTTService } from '../services/api'
import { ConnectionsData, API_CONFIG } from '../config/api'

interface ConnectionsChartProps {
  broker: string
  refreshInterval?: number
  autoRefresh?: boolean
  className?: string
}

interface ChartDataPoint {
  timestamp: number
  time: string
  clients_connected: number
  clients_disconnected: number
  connections_avg_1m: number
  connections_avg_5m: number
  connections_avg_15m: number
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

const CONNECTIONS_SERIES_CONFIG = [
  {
    key: 'clients_connected',
    name: 'Connected Clients',
    color: '#10b981',
    visible: true
  },
  {
    key: 'clients_disconnected', 
    name: 'Disconnected Clients',
    color: '#ef4444',
    visible: true
  },
  {
    key: 'connections_avg_1m',
    name: '1m Average',
    color: '#3b82f6',
    visible: true
  },
  {
    key: 'connections_avg_5m',
    name: '5m Average',
    color: '#f59e0b',
    visible: true
  },
  {
    key: 'connections_avg_15m',
    name: '15m Average',
    color: '#8b5cf6',
    visible: false
  }
]

export default function ConnectionsChart({ broker, refreshInterval = 30, autoRefresh = false, className }: ConnectionsChartProps) {
  const [connectionsData, setConnectionsData] = useState<ChartDataPoint[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [selectedTimeRange, setSelectedTimeRange] = useState<TimeRange>(TIME_RANGES[1]) // Default to 15m
  const [lastFetchTime, setLastFetchTime] = useState<Date | null>(null)
  const intervalRef = useRef<number | null>(null)
  const [visibleSeries, setVisibleSeries] = useState<Record<string, boolean>>(
    CONNECTIONS_SERIES_CONFIG.reduce((acc, series) => {
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

  const transformConnectionsData = (data: ConnectionsData): ChartDataPoint[] => {
    if (!data.series || data.series.length === 0) {
      console.log('No connections series data available')
      return []
    }

    console.log('Transforming connections data with series:', data.series.map(s => s.name))
    
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
      console.log('No valid timestamps found in connections data')
      return []
    }

    // Create data points for each timestamp
    const sortedTimestamps = Array.from(timestamps).sort()
    console.log(`Processing ${sortedTimestamps.length} connection timestamps`)
    
    return sortedTimestamps.map(timestamp => {
      const dataPoint: ChartDataPoint = {
        timestamp,
        time: formatTimestamp(timestamp),
        clients_connected: 0,
        clients_disconnected: 0,
        connections_avg_1m: 0,
        connections_avg_5m: 0,
        connections_avg_15m: 0
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

  const generateMockConnectionsData = (): ChartDataPoint[] => {
    const now = Math.floor(Date.now() / 1000)
    const points: ChartDataPoint[] = []
    
    // Generate 60 data points (15 minutes of data with 15s intervals)
    for (let i = 59; i >= 0; i--) {
      const timestamp = now - (i * 15) // 15 second intervals
      const time = formatTimestamp(timestamp)
      
      // Generate realistic mock data with some variation
      const baseTime = (60 - i) / 60 // 0 to 1 over time
      const variation = Math.sin(baseTime * Math.PI * 4) * 0.3 + Math.random() * 0.2 - 0.1
      
      const connected = Math.max(0, Math.floor(20 + variation * 10 + Math.sin(baseTime * Math.PI * 2) * 5))
      const disconnected = Math.max(0, Math.floor(2 + Math.random() * 3))
      
      points.push({
        timestamp,
        time,
        clients_connected: connected,
        clients_disconnected: disconnected,
        connections_avg_1m: connected + Math.floor(Math.random() * 3 - 1),
        connections_avg_5m: connected + Math.floor(Math.random() * 5 - 2),
        connections_avg_15m: connected + Math.floor(Math.random() * 7 - 3)
      })
    }
    
    return points
  }

  const fetchConnectionsData = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      
      // Calculate time range for API call
      const now = Math.floor(Date.now() / 1000)
      const from = now - (selectedTimeRange.minutes * 60)
      const to = now
      
      console.log(`Fetching connections data for broker: ${broker}, from: ${from}, to: ${to} (${selectedTimeRange.label})`)
      
      const data = await watchMQTTService.getConnections(broker, from, to)
      console.log('Raw connections API response:', data)
      
      const transformedData = transformConnectionsData(data)
      console.log('Transformed connections chart data:', transformedData)
      
      // Always show the data, even if it's all zeros (real API response)
      setConnectionsData(transformedData)
      setLastFetchTime(new Date())
      
      // Check if data is all zeros and inform user
      const hasNonZeroData = transformedData.some(point => 
        point.clients_connected > 0 || 
        point.clients_disconnected > 0 || 
        point.connections_avg_1m > 0 ||
        point.connections_avg_5m > 0 ||
        point.connections_avg_15m > 0
      )
      
      if (!hasNonZeroData && transformedData.length > 0) {
        console.log('Connections API returned valid data structure but all values are zero')
      }
      
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to fetch connections data'
      setError(errorMsg)
      console.error('Error fetching connections data:', err)
    } finally {
      setLoading(false)
    }
  }, [broker, selectedTimeRange])

  // Manual refresh only - no auto-refresh to avoid excessive API calls
  useEffect(() => {
    // Only fetch on component mount
    fetchConnectionsData()
  }, []) // Empty dependency array - only runs once

  // Fetch data when time range changes
  useEffect(() => {
    if (selectedTimeRange !== TIME_RANGES[1]) { // Only if not initial value
      fetchConnectionsData()
    }
  }, [selectedTimeRange, fetchConnectionsData])

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

  const formatNumber = (value: number): string => {
    if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`
    if (value >= 1000) return `${(value / 1000).toFixed(1)}K`
    return value.toFixed(0)
  }

  const customTickFormatter = (value: number): string => {
    return formatNumber(value)
  }

  const customTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="chart-tooltip">
          <p className="tooltip-label">{`Time: ${label}`}</p>
          {payload.map((entry: any, index: number) => (
            <p key={index} style={{ color: entry.color }}>
              {`${entry.name}: ${entry.value}`}
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
        <h2 className="chart-title">Connections</h2>
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
          
          <button onClick={fetchConnectionsData} disabled={loading} className="button-secondary">
            {loading ? 'Loading...' : 'Fetch Data'}
          </button>
          
          <div className="series-toggles">
            {CONNECTIONS_SERIES_CONFIG.map(series => (
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
        {connectionsData.length > 0 ? (
          <ResponsiveContainer width="100%" height={480}>
            <LineChart data={connectionsData} margin={{ top: 10, right: 20, left: 60, bottom: 60 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis 
                dataKey="time"
                tick={{ fontSize: 11 }}
                interval={Math.max(0, Math.floor(connectionsData.length / 6))}
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
                label={{ value: 'Clients', angle: -90, position: 'insideLeft' }}
              />
              <Tooltip content={customTooltip} />
              
              {CONNECTIONS_SERIES_CONFIG.map(series => (
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
            {loading ? 'Loading connections data...' : 'No connections data available'}
          </div>
        )}
      </div>
    </div>
  )
}
