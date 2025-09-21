import React, { useState, useEffect, useCallback } from 'react'
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { GreApiService, formatShortTime } from '../services/greApi'
import { SubscriptionEvent } from '../config/greApi'
import { CHART_MARGINS, CHART_HEIGHTS, AXIS_STYLES, AXIS_DIMENSIONS, AXIS_LABELS, AXIS_DOMAIN, CHART_STYLES } from '../config/chartConfig'

interface SubscriptionChurnProps {
  className?: string
  refreshInterval?: number
}

interface ChurnData {
  timestamp: string
  time: string
  subscribes: number
  unsubscribes: number
  netChange: number
}

// Mock data removed per user request

export default function SubscriptionChurn({ className, refreshInterval = 120 }: SubscriptionChurnProps) {
  const [churnData, setChurnData] = useState<ChurnData[]>([])
  const [timeRange, setTimeRange] = useState('24h')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)

  const processChurnData = useCallback((events: SubscriptionEvent[]) => {
    if (timeRange === '7d') {
      // FOR 7D: Use continuous interval generation (like Sessions chart)
      const bucketMinutes = 180 // 3 hours
      const hoursBack = 168 // 7 days
      
      const endTime = new Date()
      const startTime = new Date()
      startTime.setHours(startTime.getHours() - hoursBack)
      
      const intervals = Math.ceil(hoursBack * 60 / bucketMinutes)
      const chartDataPoints: ChurnData[] = []
      
      // Create buckets for events
      const eventBuckets = new Map()
      
      events.forEach(event => {
        const eventTime = new Date(event.ts)
        // For 7d: group by 3-hour intervals
        const bucketTime = new Date(
          eventTime.getFullYear(),
          eventTime.getMonth(),
          eventTime.getDate(),
          Math.floor(eventTime.getHours() / 3) * 3,
          0,
          0,
          0
        )

        const bucketKey = bucketTime.toISOString()

        if (!eventBuckets.has(bucketKey)) {
          eventBuckets.set(bucketKey, {
            subscribes: 0,
            unsubscribes: 0
          })
        }

        const bucket = eventBuckets.get(bucketKey)
        if (event.action === 'subscribe') {
          bucket.subscribes += event.count
        } else if (event.action === 'unsubscribe') {
          bucket.unsubscribes += event.count
        }
      })

      // Generate continuous intervals for 7d
      for (let i = 0; i < intervals; i++) {
        const intervalStart = new Date(startTime.getTime() + i * bucketMinutes * 60000)
        
        // Align to 3-hour boundaries
        const normalizedInterval = new Date(
          intervalStart.getFullYear(),
          intervalStart.getMonth(),
          intervalStart.getDate(),
          Math.floor(intervalStart.getHours() / 3) * 3,
          0,
          0,
          0
        )
        
        const normalizedKey = normalizedInterval.toISOString()
        
        // Get event data for this normalized interval, or default to 0
        const eventData = eventBuckets.get(normalizedKey) || { subscribes: 0, unsubscribes: 0 }
        
        chartDataPoints.push({
          timestamp: normalizedKey,
          time: formatShortTime(normalizedKey), // Will be updated below
          subscribes: eventData.subscribes,
          unsubscribes: eventData.unsubscribes,
          netChange: eventData.subscribes - eventData.unsubscribes
        })
      }

      return chartDataPoints
    } else {
      // FOR 24H: Use continuous intervals with 30-minute buckets (48 data points total)
      const bucketMinutes = 30 // 30 minutes for better balance
      const hoursBack = 24
      
      const endTime = new Date()
      const startTime = new Date()
      startTime.setHours(startTime.getHours() - hoursBack)
      
      const intervals = Math.ceil(hoursBack * 60 / bucketMinutes)
      const chartDataPoints: ChurnData[] = []
      
      // Create buckets for events
      const eventBuckets = new Map()
      
      events.forEach(event => {
        const eventTime = new Date(event.ts)
        // For 24h: group by 30-minute intervals
        const bucketTime = new Date(
          eventTime.getFullYear(),
          eventTime.getMonth(),
          eventTime.getDate(),
          eventTime.getHours(),
          Math.floor(eventTime.getMinutes() / 30) * 30,
          0,
          0
        )

        const bucketKey = bucketTime.toISOString()

        if (!eventBuckets.has(bucketKey)) {
          eventBuckets.set(bucketKey, {
            subscribes: 0,
            unsubscribes: 0
          })
        }

        const bucket = eventBuckets.get(bucketKey)
        if (event.action === 'subscribe') {
          bucket.subscribes += event.count
        } else if (event.action === 'unsubscribe') {
          bucket.unsubscribes += event.count
        }
      })

      // Generate continuous intervals for 24h
      for (let i = 0; i < intervals; i++) {
        const intervalStart = new Date(startTime.getTime() + i * bucketMinutes * 60000)
        
        // Align to 30-minute boundaries
        const normalizedInterval = new Date(
          intervalStart.getFullYear(),
          intervalStart.getMonth(),
          intervalStart.getDate(),
          intervalStart.getHours(),
          Math.floor(intervalStart.getMinutes() / 30) * 30,
          0,
          0
        )
        
        const normalizedKey = normalizedInterval.toISOString()
        
        // Get event data for this normalized interval, or default to 0
        const eventData = eventBuckets.get(normalizedKey) || { subscribes: 0, unsubscribes: 0 }
        
        chartDataPoints.push({
          timestamp: normalizedKey,
          time: formatShortTime(normalizedKey),
          subscribes: eventData.subscribes,
          unsubscribes: eventData.unsubscribes,
          netChange: eventData.subscribes - eventData.unsubscribes
        })
      }

      return chartDataPoints
    }
  }, [timeRange])

  // Apply date labeling for 7d data after processing
  const applyDateLabeling = useCallback((data: ChurnData[]) => {
    if (timeRange === '7d' && data.length > 0) {
      data.forEach((item, index) => {
        const intervalStart = new Date(item.timestamp)
        const currentDay = intervalStart.getUTCDate()
        const previousInterval = index > 0 ? new Date(data[index - 1].timestamp) : null
        const previousDay = previousInterval ? previousInterval.getUTCDate() : null
        
        // Show date when day changes or for the first data point (SAME LOGIC AS SESSIONS)
        if (index === 0 || currentDay !== previousDay) {
          item.time = intervalStart.toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            timeZone: 'UTC'
          })
        } else {
          // Show only time for other intervals
          item.time = intervalStart.toLocaleTimeString('en-US', {
            hour: '2-digit',
            minute: '2-digit',
            hour12: false,
            timeZone: 'UTC'
          })
        }
      })
    }
    return data
  }, [timeRange])

  const fetchChurnData = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      
      const hoursBack = timeRange === '24h' ? 24 : 168
      const events = await GreApiService.getSubscriptionChurn(hoursBack)
      const processed = processChurnData(events)
      const withDateLabels = applyDateLabeling(processed)
      setChurnData(withDateLabels)
      
      setLastUpdated(new Date())
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to fetch subscription churn data'
      setError(errorMsg)
      console.error('Error fetching churn data:', err)
    } finally {
      setLoading(false)
    }
  }, [timeRange, processChurnData])

  useEffect(() => {
    fetchChurnData()
    
    const interval = setInterval(fetchChurnData, refreshInterval * 1000)
    return () => clearInterval(interval)
  }, [fetchChurnData, refreshInterval])

  const totalSubscribes = churnData.reduce((sum, item) => sum + item.subscribes, 0)
  const totalUnsubscribes = churnData.reduce((sum, item) => sum + item.unsubscribes, 0)
  const netChange = totalSubscribes - totalUnsubscribes

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
          Subscription Churn
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
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value)}
          >
            <option value="24h">Last 24 Hours</option>
            <option value="7d">Last 7 Days</option>
          </select>

          <button
            onClick={fetchChurnData}
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

      {/* Summary Cards */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
        gap: '16px',
        marginBottom: '20px'
      }}>
        <div style={{
          padding: '16px',
          backgroundColor: '#f9fafb',
          borderRadius: '8px',
          border: '1px solid #e5e7eb',
          textAlign: 'center'
        }}>
          <div style={{
            fontSize: '12px',
            color: '#6b7280',
            fontWeight: '500',
            marginBottom: '8px',
            textTransform: 'uppercase'
          }}>
            Total Subscribes
          </div>
          <div style={{
            fontSize: '24px',
            fontWeight: '700',
            color: '#10b981'
          }}>
            {totalSubscribes}
          </div>
        </div>

        <div style={{
          padding: '16px',
          backgroundColor: '#f9fafb',
          borderRadius: '8px',
          border: '1px solid #e5e7eb',
          textAlign: 'center'
        }}>
          <div style={{
            fontSize: '12px',
            color: '#6b7280',
            fontWeight: '500',
            marginBottom: '8px',
            textTransform: 'uppercase'
          }}>
            Total Unsubscribes
          </div>
          <div style={{
            fontSize: '24px',
            fontWeight: '700',
            color: '#ef4444'
          }}>
            {totalUnsubscribes}
          </div>
        </div>

        <div style={{
          padding: '16px',
          backgroundColor: '#f9fafb',
          borderRadius: '8px',
          border: '1px solid #e5e7eb',
          textAlign: 'center'
        }}>
          <div style={{
            fontSize: '12px',
            color: '#6b7280',
            fontWeight: '500',
            marginBottom: '8px',
            textTransform: 'uppercase'
          }}>
            Net Change
          </div>
          <div style={{
            fontSize: '24px',
            fontWeight: '700',
            color: netChange >= 0 ? '#10b981' : '#ef4444'
          }}>
            {netChange >= 0 ? '+' : ''}{netChange}
          </div>
        </div>
      </div>

      {/* Chart */}
      {!loading && churnData.length > 0 && (
        <>
          <h3 style={{
            fontSize: '16px',
            fontWeight: '600',
            color: '#1f2937',
            marginBottom: '16px',
            marginTop: '0'
          }}>
            Subscription Activity ({timeRange === '7d' ? '3-hour intervals' : '30-min intervals'})
          </h3>

          <div style={{ width: '100%', height: CHART_HEIGHTS.container }}>
            <ResponsiveContainer width="100%" height={CHART_HEIGHTS.responsive}>
              <AreaChart
                data={churnData}
                margin={{ top: 10, right: 30, left: 20, bottom: 60 }}
              >
                <CartesianGrid strokeDasharray={CHART_STYLES.cartesianGrid.strokeDasharray} stroke={CHART_STYLES.cartesianGrid.stroke} />
                <XAxis
                  dataKey="time"
                  interval={0}
                  angle={-45}
                  textAnchor="end"
                  height={AXIS_DIMENSIONS.xAxisHeight}
                  axisLine={AXIS_STYLES.axisLine}
                  tickLine={AXIS_STYLES.tickLine}
                  tick={(props) => {
                    const { x, y, payload } = props
                    const value = payload.value
                    const isDate = !value.includes(':')

                    if (timeRange === '7d') {
                      const index = payload.index

                      if (isDate) {
                        // ALWAYS show date labels - never filter them out
                        return (
                          <g transform={`translate(${x},${y})`}>
                            <text
                              x={0}
                              y={0}
                              dy={16}
                              textAnchor="end"
                              fill="#1f2937"
                              fontSize={13}
                              fontWeight={600}
                              transform="rotate(-45)"
                            >
                              {value}
                            </text>
                          </g>
                        )
                      } else {
                        // For time labels with 3-hour intervals, show every 2nd (every 6 hours) to reduce clutter
                        const isEvery2nd = index % 2 === 0
                        if (!isEvery2nd) return null

                        return (
                          <g transform={`translate(${x},${y})`}>
                            <text
                              x={0}
                              y={0}
                              dy={16}
                              textAnchor="end"
                              fill="#6b7280"
                              fontSize={12}
                              fontWeight={400}
                              transform="rotate(-45)"
                            >
                              {value}
                            </text>
                          </g>
                        )
                      }
                    } else {
                      // For 24h view, show every 4th label (every 2 hours for 30-min intervals)
                      const index = payload.index
                      const isEvery4th = index % 4 === 0
                      if (!isEvery4th) return null
                    }

                    // For 24h view, use default styling
                    return (
                      <g transform={`translate(${x},${y})`}>
                        <text
                          x={0}
                          y={0}
                          dy={16}
                          textAnchor="end"
                          fill="#374151"
                          fontSize={12}
                          fontWeight={400}
                          transform="rotate(-45)"
                        >
                          {value}
                        </text>
                      </g>
                    )
                  }}
                />
                <YAxis
                  tick={AXIS_STYLES.tick}
                  width={AXIS_DIMENSIONS.yAxisWidth}
                  axisLine={AXIS_STYLES.axisLine}
                  tickLine={AXIS_STYLES.tickLine}
                  domain={AXIS_DOMAIN}
                />
                <Tooltip
                  formatter={(value, name) => [value, name]}
                  labelFormatter={(label) => `Time: ${label}`}
                  content={({ active, payload, label }) => {
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
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="subscribes"
                  stroke="#10b981"
                  fill="#10b981"
                  fillOpacity={0.3}
                  name="Subscribes"
                />
                <Area
                  type="monotone"
                  dataKey="unsubscribes"
                  stroke="#ef4444"
                  fill="#ef4444"
                  fillOpacity={0.3}
                  name="Unsubscribes"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </>
      )}

      {!loading && churnData.length === 0 && (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          height: '200px',
          color: '#6b7280',
          fontSize: '16px'
        }}>
          No subscription activity data available for the selected time range
        </div>
      )}
    </>
  )
}
