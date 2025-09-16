import React, { useState, useEffect, useCallback, useRef } from 'react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import { watchMQTTService } from '../services/api'
import { ConnectionsData, API_CONFIG } from '../config/api'
import { calculateOptimalStep } from '../utils/prometheusStep'
import { CHART_MARGINS, CHART_HEIGHTS, AXIS_STYLES, AXIS_DIMENSIONS, AXIS_LABELS, AXIS_DOMAIN, formatTimestamp, CHART_STYLES } from '../config/chartConfig'

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

  const fetchConnectionsData = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      
      // Calculate time range and optimal step for API call
      const now = Math.floor(Date.now() / 1000)
      const from = now - (selectedTimeRange.minutes * 60)
      const to = now
      const step = calculateOptimalStep(selectedTimeRange.minutes)
      
      console.log(`Fetching connections data for broker: ${broker}, from: ${from}, to: ${to}, step: ${step}s (${selectedTimeRange.label})`)
      
      const data = await watchMQTTService.getConnections(broker, from, to, step)
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
              {`${entry.name}: ${entry.value}`}
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
          Connections
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
            onClick={fetchConnectionsData} 
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
        {CONNECTIONS_SERIES_CONFIG.map(series => (
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
        {connectionsData.length > 0 ? (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={connectionsData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="time" />
              <YAxis tickFormatter={formatNumber} />
              <Tooltip content={customTooltip} />
              
              {CONNECTIONS_SERIES_CONFIG.map(series => (
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
            {loading ? 'Loading connections data...' : 'No connections data available'}
          </div>
        )}
      </div>
    </>
  )
}