import React, { useState, useEffect, useCallback, useRef } from 'react'
import { LineChart, BarChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import { watchMQTTService } from '../services/api'
import { TrafficData, ConnectionsData, API_CONFIG } from '../config/api'
import { calculateOptimalStep } from '../utils/prometheusStep'

// Simple timestamp formatter
const formatTimestamp = (timestamp: number): string => {
  return new Date(timestamp * 1000).toLocaleTimeString('en-US', {
    hour12: false,
    hour: '2-digit',
    minute: '2-digit'
  })
}

interface TrafficConnectionsChartProps {
  broker: string
  refreshInterval?: number
  autoRefresh?: boolean
  className?: string
}

interface ChartDataPoint {
  timestamp: number
  time: string
  // Traffic data (for lines)
  messages_sent_per_sec_1m: number
  messages_received_per_sec_1m: number
  bytes_sent_per_sec_1m: number
  bytes_received_per_sec_1m: number
  // Connection data (for stacked bars)
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
  }
]

const CONNECTION_SERIES_CONFIG = [
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
  }
]

export default function TrafficConnectionsChart({ broker, refreshInterval = 30, autoRefresh = false, className }: TrafficConnectionsChartProps) {
  const [chartData, setChartData] = useState<ChartDataPoint[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [selectedTimeRange, setSelectedTimeRange] = useState<TimeRange>(TIME_RANGES[1]) // Default to 15m
  const [lastFetchTime, setLastFetchTime] = useState<Date | null>(null)
  const intervalRef = useRef<number | null>(null)
  const [visibleTrafficSeries, setVisibleTrafficSeries] = useState<Record<string, boolean>>(
    TRAFFIC_SERIES_CONFIG.reduce((acc, series) => {
      acc[series.key] = series.visible
      return acc
    }, {} as Record<string, boolean>)
  )
  const [visibleConnectionSeries, setVisibleConnectionSeries] = useState<Record<string, boolean>>(
    CONNECTION_SERIES_CONFIG.reduce((acc, series) => {
      acc[series.key] = series.visible
      return acc
    }, {} as Record<string, boolean>)
  )


  const combineData = (trafficData: TrafficData, connectionsData: ConnectionsData): ChartDataPoint[] => {
    if (!trafficData.series || !connectionsData.series || 
        trafficData.series.length === 0 || connectionsData.series.length === 0) {
      console.log('No series data available for combined chart')
      return []
    }

    console.log('Combining traffic and connections data')
    
    // Get all unique timestamps from both datasets
    const timestamps = new Set<number>()
    
    trafficData.series.forEach(series => {
      if (series.points && Array.isArray(series.points)) {
        series.points.forEach(([timestamp]) => {
          if (typeof timestamp === 'number') {
            timestamps.add(timestamp)
          }
        })
      }
    })
    
    connectionsData.series.forEach(series => {
      if (series.points && Array.isArray(series.points)) {
        series.points.forEach(([timestamp]) => {
          if (typeof timestamp === 'number') {
            timestamps.add(timestamp)
          }
        })
      }
    })

    // Convert to sorted array
    const sortedTimestamps = Array.from(timestamps).sort((a, b) => a - b)
    
    console.log(`Combined chart: Processing ${sortedTimestamps.length} timestamps`)

    // Create data points
    const dataPoints: ChartDataPoint[] = sortedTimestamps.map(timestamp => {
      const dataPoint: ChartDataPoint = {
        timestamp,
        time: formatTimestamp(timestamp),
        // Initialize traffic data
        messages_sent_per_sec_1m: 0,
        messages_received_per_sec_1m: 0,
        bytes_sent_per_sec_1m: 0,
        bytes_received_per_sec_1m: 0,
        // Initialize connection data
        clients_connected: 0,
        clients_disconnected: 0,
        connections_avg_1m: 0,
        connections_avg_5m: 0,
        connections_avg_15m: 0
      }

      // Fill in traffic data
      trafficData.series.forEach(series => {
        const point = series.points?.find(([ts]) => ts === timestamp)
        if (point && point.length >= 2) {
          const value = point[1]
          if (typeof value === 'number' && !isNaN(value)) {
            switch (series.name) {
              case 'messages_sent_per_sec_1m':
                dataPoint.messages_sent_per_sec_1m = value
                break
              case 'messages_received_per_sec_1m':
                dataPoint.messages_received_per_sec_1m = value
                break
              case 'bytes_sent_per_sec_1m':
                dataPoint.bytes_sent_per_sec_1m = value
                break
              case 'bytes_received_per_sec_1m':
                dataPoint.bytes_received_per_sec_1m = value
                break
            }
          }
        }
      })

      // Fill in connections data
      connectionsData.series.forEach(series => {
        const point = series.points?.find(([ts]) => ts === timestamp)
        if (point && point.length >= 2) {
          const value = point[1]
          if (typeof value === 'number' && !isNaN(value)) {
            switch (series.name) {
              case 'clients_connected':
                dataPoint.clients_connected = value
                break
              case 'clients_disconnected':
                dataPoint.clients_disconnected = value
                break
              case 'connections_avg_1m':
                dataPoint.connections_avg_1m = value
                break
              case 'connections_avg_5m':
                dataPoint.connections_avg_5m = value
                break
              case 'connections_avg_15m':
                dataPoint.connections_avg_15m = value
                break
            }
          }
        }
      })

      return dataPoint
    })

    console.log(`Combined chart: Generated ${dataPoints.length} data points`)
    return dataPoints
  }

  const fetchData = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      
      const now = Math.floor(Date.now() / 1000)
      const from = now - (selectedTimeRange.minutes * 60)
      const to = now
      const step = calculateOptimalStep(selectedTimeRange.minutes)

      console.log(`Combined chart: Fetching data for broker ${broker} from ${from} to ${to}, step: ${step}s`)
      
      // Fetch both traffic and connections data in parallel with optimal step
      const [trafficData, connectionsData] = await Promise.all([
        watchMQTTService.getTraffic(broker, from, to, step),
        watchMQTTService.getConnections(broker, from, to, step)
      ])
      
      console.log('Combined chart: Traffic data received:', trafficData)
      console.log('Combined chart: Connections data received:', connectionsData)
      
      const combinedData = combineData(trafficData, connectionsData)
      setChartData(combinedData)
      setLastFetchTime(new Date())
      
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to fetch combined chart data'
      setError(errorMsg)
      console.error('Combined chart: Error fetching data:', err)
    } finally {
      setLoading(false)
    }
  }, [broker, selectedTimeRange])

  // Auto-refresh effect
  useEffect(() => {
    fetchData() // Initial fetch
    
    if (autoRefresh && refreshInterval > 0) {
      intervalRef.current = window.setInterval(fetchData, refreshInterval * 1000)
    }
    
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
    }
  }, [fetchData, autoRefresh, refreshInterval])

  const toggleTrafficSeries = (seriesKey: string) => {
    setVisibleTrafficSeries(prev => ({
      ...prev,
      [seriesKey]: !prev[seriesKey]
    }))
  }

  const toggleConnectionSeries = (seriesKey: string) => {
    setVisibleConnectionSeries(prev => ({
      ...prev,
      [seriesKey]: !prev[seriesKey]
    }))
  }

  // Custom tooltip
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div style={{
          background: 'white',
          padding: '12px',
          border: '1px solid #e5e7eb',
          borderRadius: '6px',
          boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
        }}>
          <p style={{ margin: '0 0 8px 0', fontWeight: '600', fontSize: '14px' }}>
            {label}
          </p>
          <div style={{ fontSize: '13px', lineHeight: '1.4' }}>
            {payload.map((entry: any, index: number) => (
              <div key={index} style={{ 
                color: entry.color, 
                margin: '2px 0',
                display: 'flex',
                justifyContent: 'space-between',
                minWidth: '200px'
              }}>
                <span>{entry.name}:</span>
                <span style={{ fontWeight: '600', marginLeft: '8px' }}>
                  {typeof entry.value === 'number' ? entry.value.toFixed(2) : entry.value}
                  {entry.dataKey.includes('messages') ? '/s' : ''}
                  {entry.dataKey.includes('bytes') ? '/s' : ''}
                </span>
              </div>
            ))}
          </div>
        </div>
      )
    }
    return null
  }

  return (
    <div className={className} style={{ width: '100%' }}>
      {/* Header */}
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center', 
        marginBottom: '16px',
        flexWrap: 'wrap',
        gap: '12px'
      }}>
        <div>
          <h3 style={{ 
            margin: '0 0 4px 0', 
            fontSize: '18px', 
            fontWeight: '600', 
            color: '#111827' 
          }}>
            Traffic & Connections Combined
          </h3>
          <div style={{ 
            fontSize: '14px', 
            color: '#6b7280',
            display: 'flex',
            alignItems: 'center',
            gap: '12px'
          }}>
            <span>Broker: {broker}</span>
            {lastFetchTime && (
              <span>Last updated: {lastFetchTime.toLocaleTimeString()}</span>
            )}
            {loading && <span>Loading...</span>}
          </div>
        </div>

        {/* Time Range Selector */}
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <span style={{ fontSize: '14px', color: '#6b7280' }}>Range:</span>
          {TIME_RANGES.map((range) => (
            <button
              key={range.label}
              onClick={() => setSelectedTimeRange(range)}
              style={{
                padding: '6px 12px',
                fontSize: '13px',
                border: '1px solid #d1d5db',
                borderRadius: '4px',
                background: selectedTimeRange.label === range.label ? '#111827' : 'white',
                color: selectedTimeRange.label === range.label ? 'white' : '#374151',
                cursor: 'pointer',
                transition: 'all 0.2s ease'
              }}
            >
              {range.label}
            </button>
          ))}
          <button
            onClick={fetchData}
            disabled={loading}
            style={{
              padding: '6px 12px',
              fontSize: '13px',
              border: '1px solid #d1d5db',
              borderRadius: '4px',
              background: '#f9fafb',
              color: '#374151',
              cursor: loading ? 'not-allowed' : 'pointer',
              opacity: loading ? 0.5 : 1
            }}
          >
            🔄 Refresh
          </button>
        </div>
      </div>

      {/* Legend Controls */}
      <div style={{ 
        marginBottom: '16px',
        display: 'flex',
        flexWrap: 'wrap',
        gap: '16px',
        padding: '12px',
        background: '#f9fafb',
        borderRadius: '6px',
        border: '1px solid #e5e7eb'
      }}>
        <div>
          <span style={{ fontSize: '13px', fontWeight: '600', color: '#374151', marginRight: '8px' }}>
            Traffic (Lines):
          </span>
          {TRAFFIC_SERIES_CONFIG.map((series) => (
            <button
              key={series.key}
              onClick={() => toggleTrafficSeries(series.key)}
              style={{
                marginRight: '8px',
                padding: '4px 8px',
                fontSize: '12px',
                border: '1px solid #d1d5db',
                borderRadius: '4px',
                background: visibleTrafficSeries[series.key] ? series.color : 'white',
                color: visibleTrafficSeries[series.key] ? 'white' : '#374151',
                cursor: 'pointer'
              }}
            >
              {series.name}
            </button>
          ))}
        </div>
        <div>
          <span style={{ fontSize: '13px', fontWeight: '600', color: '#374151', marginRight: '8px' }}>
            Connections (Bars):
          </span>
          {CONNECTION_SERIES_CONFIG.map((series) => (
            <button
              key={series.key}
              onClick={() => toggleConnectionSeries(series.key)}
              style={{
                marginRight: '8px',
                padding: '4px 8px',
                fontSize: '12px',
                border: '1px solid #d1d5db',
                borderRadius: '4px',
                background: visibleConnectionSeries[series.key] ? series.color : 'white',
                color: visibleConnectionSeries[series.key] ? 'white' : '#374151',
                cursor: 'pointer'
              }}
            >
              {series.name}
            </button>
          ))}
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div style={{
          padding: '12px',
          background: '#fef2f2',
          color: '#dc2626',
          border: '1px solid #fecaca',
          borderRadius: '6px',
          marginBottom: '16px',
          fontSize: '14px'
        }}>
          ⚠️ {error}
        </div>
      )}

      {/* Chart */}
      <div style={{ height: '450px', width: '100%' }}>
        {/* Traffic Chart - Top */}
        <div style={{ height: '45%', width: '100%', marginBottom: '20px' }}>
          <h4 style={{ 
            margin: '0 0 10px 0', 
            fontSize: '14px', 
            fontWeight: '600', 
            color: '#374151',
            textAlign: 'center'
          }}>
            Message Traffic (per second)
          </h4>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="time" hide={true} />
              <YAxis />
              <Tooltip content={<CustomTooltip />} />
              
              {/* Lines for traffic */}
              {visibleTrafficSeries.messages_sent_per_sec_1m && (
                <Line
                  type="monotone"
                  dataKey="messages_sent_per_sec_1m"
                  stroke="#3b82f6"
                  strokeWidth={2}
                  dot={false}
                  name="Messages Sent/sec"
                />
              )}
              {visibleTrafficSeries.messages_received_per_sec_1m && (
                <Line
                  type="monotone"
                  dataKey="messages_received_per_sec_1m"
                  stroke="#10b981"
                  strokeWidth={2}
                  dot={false}
                  name="Messages Received/sec"
                />
              )}
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Separator */}
        <div style={{ 
          height: '1px', 
          background: '#e5e7eb', 
          margin: '10px 0',
          width: '100%'
        }} />

        {/* Connections Chart - Bottom */}
        <div style={{ height: '45%', width: '100%', marginTop: '20px' }}>
          <h4 style={{ 
            margin: '0 0 10px 0', 
            fontSize: '14px', 
            fontWeight: '600', 
            color: '#374151',
            textAlign: 'center'
          }}>
            Client Connections
          </h4>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="time" />
              <YAxis />
              <Tooltip content={<CustomTooltip />} />
              
              {/* Stacked bars for connections */}
              {visibleConnectionSeries.clients_connected && (
                <Bar
                  dataKey="clients_connected"
                  stackId="connections"
                  fill="#10b981"
                  name="Connected Clients"
                />
              )}
              {visibleConnectionSeries.clients_disconnected && (
                <Bar
                  dataKey="clients_disconnected"
                  stackId="connections"
                  fill="#ef4444"
                  name="Disconnected Clients"
                />
              )}
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Data Summary */}
      {chartData.length > 0 && (
        <div style={{
          marginTop: '16px',
          padding: '12px',
          background: '#f9fafb',
          borderRadius: '6px',
          border: '1px solid #e5e7eb',
          fontSize: '13px',
          color: '#6b7280'
        }}>
          <div style={{ display: 'flex', gap: '24px', flexWrap: 'wrap' }}>
            <span>Data points: {chartData.length}</span>
            <span>Time range: {selectedTimeRange.label}</span>
            {chartData.length > 0 && (
              <>
                <span>
                  Avg Messages Sent: {(chartData.reduce((sum, d) => sum + d.messages_sent_per_sec_1m, 0) / chartData.length).toFixed(1)}/s
                </span>
                <span>
                  Avg Connected: {(chartData.reduce((sum, d) => sum + d.clients_connected, 0) / chartData.length).toFixed(1)}
                </span>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}