import React, { useState, useEffect, useCallback } from 'react'
import { watchMQTTService } from '../../services/api'
import { TrafficData, TimeseriesSeries } from '../../config/api'

interface TrafficTilesProps {
  broker: string
  className?: string
  refreshInterval?: number
}

// Helper function to create SVG path for sparkline
function createSparklinePath(data: number[], width: number, height: number): string {
  if (data.length < 2) return ''
  
  const maxValue = Math.max(...data)
  const minValue = Math.min(...data)
  const range = maxValue - minValue || 1
  
  let path = ''
  
  data.forEach((value, index) => {
    const x = (index / (data.length - 1)) * (width - 10) + 5
    const y = height - 5 - ((value - minValue) / range) * (height - 10)
    
    if (index === 0) {
      path += `M ${x} ${y}`
    } else {
      path += ` L ${x} ${y}`
    }
  })
  
  return path
}

// Helper function to format values
const formatValue = (value: number, type: 'messages' | 'bytes'): string => {
  if (type === 'bytes') {
    if (value >= 1024 * 1024) return `${(value / (1024 * 1024)).toFixed(1)}MB/s`
    if (value >= 1024) return `${(value / 1024).toFixed(1)}KB/s`
    return `${value.toFixed(1)}B/s`
  } else {
    if (value >= 1000) return `${(value / 1000).toFixed(1)}k/s`
    return `${value.toFixed(1)}/s`
  }
}

// Helper function to get last 5 data points from timeseries (filtering from 15s intervals)
const getLastFivePoints = (series: TimeseriesSeries[]): { [key: string]: number[] } => {
  const result: { [key: string]: number[] } = {}
  
  series.forEach(s => {
    // Take every 4th point (since data comes every 15s, we want roughly 1 minute intervals)
    // For 5 minutes of data, we want 5 points
    const points = s.points
    if (points.length >= 5) {
      const step = Math.max(1, Math.floor(points.length / 5))
      const selectedPoints = []
      for (let i = 0; i < 5; i++) {
        const index = Math.min(i * step, points.length - 1)
        selectedPoints.push(points[index][1])
      }
      result[s.name] = selectedPoints
    } else {
      result[s.name] = points.map(p => p[1])
    }
  })
  
  return result
}

// Individual tile component
interface TrafficTileProps {
  title: string
  value: number
  unit: 'messages' | 'bytes'
  trendData: number[]
  color: string
}

const TrafficTile: React.FC<TrafficTileProps> = ({ title, value, unit, trendData, color }) => {
  return (
    <div style={{
      padding: '20px',
      background: '#ffffff',
      borderRadius: '12px',
      border: '1px solid #e5e7eb',
      boxShadow: '0 2px 4px rgba(0, 0, 0, 0.05)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      minHeight: '100px'
    }}>
      <div style={{ flex: 1 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
          <span style={{ fontSize: '14px', fontWeight: '600', color: '#374151' }}>{title}</span>
        </div>
        <div style={{ fontSize: '24px', fontWeight: '700', color: '#111827', marginBottom: '4px' }}>
          {formatValue(value, unit)}
        </div>
        <div style={{ fontSize: '12px', color: '#6b7280' }}>
          Last 5 minutes
        </div>
      </div>
      
      {/* Trend sparkline */}
      {trendData.length > 1 && (
        <div style={{ width: '80px', height: '40px', marginLeft: '16px' }}>
          <svg width="80" height="40" viewBox="0 0 80 40">
            <defs>
              <linearGradient id={`gradient-${title.replace(/\s+/g, '')}`} x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor={color} stopOpacity="0.6"/>
                <stop offset="100%" stopColor={color} stopOpacity="0.1"/>
              </linearGradient>
            </defs>
            <path
              d={createSparklinePath(trendData, 80, 40)}
              fill="none"
              stroke={color}
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <path
              d={createSparklinePath(trendData, 80, 40) + ` L 75 35 L 5 35 Z`}
              fill={`url(#gradient-${title.replace(/\s+/g, '')})`}
              opacity="0.3"
            />
            {trendData.map((value, index) => {
              const x = (index / Math.max(trendData.length - 1, 1)) * 70 + 5
              const maxValue = Math.max(...trendData)
              const minValue = Math.min(...trendData)
              const range = maxValue - minValue || 1
              const y = 35 - ((value - minValue) / range) * 30
              return (
                <circle
                  key={index}
                  cx={x}
                  cy={y}
                  r="2"
                  fill={color}
                />
              )
            })}
          </svg>
        </div>
      )}
    </div>
  )
}

export const TrafficTiles: React.FC<TrafficTilesProps> = ({ broker, className, refreshInterval = 30 }) => {
  const [trafficData, setTrafficData] = useState<TrafficData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchTrafficData = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      console.log('TrafficTiles: Fetching timeseries data for broker:', broker)
      const data = await watchMQTTService.getTrafficTimeseries(broker, 5) // Last 5 minutes
      console.log('TrafficTiles: API Response:', data)
      setTrafficData(data)
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to fetch traffic data'
      setError(errorMsg)
      console.error('TrafficTiles: Error fetching data:', err)
    } finally {
      setLoading(false)
    }
  }, [broker])

  useEffect(() => {
    fetchTrafficData()
    // NO AUTO-REFRESH - only fetch once on mount
  }, [fetchTrafficData])

  if (loading) {
    return (
      <div className={className} style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
        gap: '16px'
      }}>
        {[1, 2, 3, 4].map(i => (
          <div key={i} style={{
            padding: '20px',
            background: '#f9fafb',
            borderRadius: '12px',
            border: '1px solid #e5e7eb',
            minHeight: '100px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#6b7280'
          }}>
            Loading...
          </div>
        ))}
      </div>
    )
  }

  if (error) {
    return (
      <div className={className} style={{
        padding: '20px',
        background: '#fef2f2',
        borderRadius: '12px',
        border: '1px solid #fecaca',
        color: '#dc2626'
      }}>
        Error loading traffic data: {error}
      </div>
    )
  }

  if (!trafficData || !trafficData.series) {
    return (
      <div className={className} style={{
        padding: '20px',
        background: '#f9fafb',
        borderRadius: '12px',
        border: '1px solid #e5e7eb',
        color: '#6b7280',
        textAlign: 'center'
      }}>
        No traffic data available
      </div>
    )
  }

  // Process the data to get trend data and current values
  const trendData = getLastFivePoints(trafficData.series)
  
  // Get current values (latest point from each series)
  const getCurrentValue = (seriesName: string): number => {
    const series = trafficData.series.find(s => s.name === seriesName)
    if (!series || series.points.length === 0) return 0
    return series.points[series.points.length - 1][1]
  }

  const tiles = [
    {
      title: 'Messages Sent',
      value: getCurrentValue('messages_sent_per_sec_1m'),
      unit: 'messages' as const,
      trendData: trendData['messages_sent_per_sec_1m'] || [],
      color: '#3b82f6'
    },
    {
      title: 'Messages Received',
      value: getCurrentValue('messages_received_per_sec_1m'),
      unit: 'messages' as const,
      trendData: trendData['messages_received_per_sec_1m'] || [],
      color: '#10b981'
    },
    {
      title: 'Bytes Sent',
      value: getCurrentValue('bytes_sent_per_sec_1m'),
      unit: 'bytes' as const,
      trendData: trendData['bytes_sent_per_sec_1m'] || [],
      color: '#f59e0b'
    },
    {
      title: 'Bytes Received',
      value: getCurrentValue('bytes_received_per_sec_1m'),
      unit: 'bytes' as const,
      trendData: trendData['bytes_received_per_sec_1m'] || [],
      color: '#ef4444'
    }
  ]

  return (
    <div className={className} style={{
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
      gap: '16px'
    }}>
      {tiles.map((tile, index) => (
        <TrafficTile
          key={index}
          title={tile.title}
          value={tile.value}
          unit={tile.unit}
          trendData={tile.trendData}
          color={tile.color}
        />
      ))}
    </div>
  )
}

export default TrafficTiles