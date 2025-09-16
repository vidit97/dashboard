import React, { useState, useEffect, useCallback } from 'react'
import { watchMQTTService } from '../../services/api'
import { TrafficData, TimeseriesSeries } from '../../config/api'

interface ToggleReceivedTileProps {
  broker: string
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

// Helper function to get last 5 data points from timeseries
const getLastFivePoints = (series: TimeseriesSeries[]): { [key: string]: number[] } => {
  const result: { [key: string]: number[] } = {}

  series.forEach(s => {
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

export const ToggleReceivedTile: React.FC<ToggleReceivedTileProps> = ({ broker }) => {
  const [trafficData, setTrafficData] = useState<TrafficData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeMode, setActiveMode] = useState<'messages' | 'bytes'>('messages') // Toggle state
  const [showTooltip, setShowTooltip] = useState(false)

  const fetchTrafficData = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      console.log('ToggleReceivedTile: Fetching timeseries data for broker:', broker)
      const data = await watchMQTTService.getTrafficTimeseries(broker, 5) // Last 5 minutes
      console.log('ToggleReceivedTile: API Response:', data)
      setTrafficData(data)
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to fetch traffic data'
      setError(errorMsg)
      console.error('ToggleReceivedTile: Error fetching data:', err)
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
      <div style={{
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
    )
  }

  if (error) {
    return (
      <div style={{
        padding: '20px',
        background: '#fef2f2',
        borderRadius: '12px',
        border: '1px solid #fecaca',
        color: '#dc2626'
      }}>
        Error: {error}
      </div>
    )
  }

  if (!trafficData || !trafficData.series) {
    return (
      <div style={{
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

  // Get current values
  const getCurrentValue = (seriesName: string): number => {
    const series = trafficData.series.find(s => s.name === seriesName)
    if (!series || series.points.length === 0) return 0
    return series.points[series.points.length - 1][1]
  }

  const currentData = {
    messages: {
      title: 'Subscription Rate',
      value: getCurrentValue('messages_received_per_sec_1m'),
      trendData: trendData['messages_received_per_sec_1m'] || [],
      color: '#10b981',
      tooltip: 'Messages received per second'
    },
    bytes: {
      title: 'Inbound Traffic',
      value: getCurrentValue('bytes_received_per_sec_1m'),
      trendData: trendData['bytes_received_per_sec_1m'] || [],
      color: '#8b5cf6',
      tooltip: 'Bytes received per second'
    }
  }

  const activeData = currentData[activeMode]

  return (
    <div style={{
      padding: '20px',
      background: '#ffffff',
      borderRadius: '12px',
      border: '1px solid #e5e7eb',
      boxShadow: '0 2px 4px rgba(0, 0, 0, 0.05)',
      minHeight: '100px'
    }}>
      {/* Header with title, info icon, and compact toggle */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', position: 'relative' }}>
          <span style={{ fontSize: '14px', fontWeight: '600', color: '#374151' }}>{activeData.title}</span>
          <div
            style={{
              width: '14px',
              height: '14px',
              borderRadius: '50%',
              background: '#e5e7eb',
              color: '#6b7280',
              fontSize: '10px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'help',
              position: 'relative'
            }}
            onMouseEnter={() => setShowTooltip(true)}
            onMouseLeave={() => setShowTooltip(false)}
          >
            i
            {showTooltip && (
              <div style={{
                position: 'absolute',
                bottom: '18px',
                left: '50%',
                transform: 'translateX(-50%)',
                background: '#1f2937',
                color: 'white',
                padding: '6px 8px',
                borderRadius: '4px',
                fontSize: '11px',
                whiteSpace: 'nowrap',
                zIndex: 1000,
                boxShadow: '0 2px 8px rgba(0, 0, 0, 0.15)'
              }}>
                {activeData.tooltip}
                <div style={{
                  position: 'absolute',
                  top: '100%',
                  left: '50%',
                  transform: 'translateX(-50%)',
                  width: 0,
                  height: 0,
                  borderLeft: '4px solid transparent',
                  borderRight: '4px solid transparent',
                  borderTop: '4px solid #1f2937'
                }} />
              </div>
            )}
          </div>
        </div>
        <div style={{
          display: 'flex',
          background: '#f3f4f6',
          borderRadius: '4px',
          padding: '1px'
        }}>
          <button
            onClick={() => setActiveMode('messages')}
            style={{
              padding: '3px 8px',
              fontSize: '11px',
              fontWeight: '500',
              border: 'none',
              borderRadius: '3px',
              cursor: 'pointer',
              background: activeMode === 'messages' ? '#10b981' : 'transparent',
              color: activeMode === 'messages' ? 'white' : '#6b7280',
              transition: 'all 0.2s ease'
            }}
          >
            Sub
          </button>
          <button
            onClick={() => setActiveMode('bytes')}
            style={{
              padding: '3px 8px',
              fontSize: '11px',
              fontWeight: '500',
              border: 'none',
              borderRadius: '3px',
              cursor: 'pointer',
              background: activeMode === 'bytes' ? '#8b5cf6' : 'transparent',
              color: activeMode === 'bytes' ? 'white' : '#6b7280',
              transition: 'all 0.2s ease'
            }}
          >
            In
          </button>
        </div>
      </div>

      {/* Value */}
      <div style={{ marginBottom: '20px' }}>
        <div style={{ fontSize: '28px', fontWeight: '700', color: '#111827' }}>
          {formatValue(activeData.value, activeMode)}
        </div>
      </div>

      {/* Larger trend sparkline */}
      {activeData.trendData.length > 1 && (
        <div style={{ width: '100%', height: '100px' }}>
          <svg width="100%" height="100" viewBox="0 0 300 100" preserveAspectRatio="xMidYMid meet">
            <defs>
              <linearGradient id={`gradient-received-${activeMode}`} x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor={activeData.color} stopOpacity="0.6"/>
                <stop offset="100%" stopColor={activeData.color} stopOpacity="0.1"/>
              </linearGradient>
            </defs>
            <path
              d={createSparklinePath(activeData.trendData, 300, 100)}
              fill="none"
              stroke={activeData.color}
              strokeWidth="4"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <path
              d={createSparklinePath(activeData.trendData, 300, 100) + ` L 295 90 L 5 90 Z`}
              fill={`url(#gradient-received-${activeMode})`}
              opacity="0.3"
            />
            {activeData.trendData.map((value, index) => {
              const x = (index / Math.max(activeData.trendData.length - 1, 1)) * 290 + 5
              const maxValue = Math.max(...activeData.trendData)
              const minValue = Math.min(...activeData.trendData)
              const range = maxValue - minValue || 1
              const y = 90 - ((value - minValue) / range) * 80
              return (
                <circle
                  key={index}
                  cx={x}
                  cy={y}
                  r="3.5"
                  fill={activeData.color}
                />
              )
            })}
          </svg>
        </div>
      )}
    </div>
  )
}

export default ToggleReceivedTile