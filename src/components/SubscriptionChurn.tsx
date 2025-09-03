import React, { useState, useEffect, useCallback } from 'react'
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { GreApiService, formatShortTime } from '../services/greApi'
import { SubscriptionEvent } from '../config/greApi'

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

// Mock data for fallback
const MOCK_CHURN_DATA: ChurnData[] = [
  { timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(), time: '10:00', subscribes: 5, unsubscribes: 2, netChange: 3 },
  { timestamp: new Date(Date.now() - 1.5 * 60 * 60 * 1000).toISOString(), time: '10:30', subscribes: 3, unsubscribes: 1, netChange: 2 },
  { timestamp: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString(), time: '11:00', subscribes: 8, unsubscribes: 4, netChange: 4 },
  { timestamp: new Date(Date.now() - 0.5 * 60 * 60 * 1000).toISOString(), time: '11:30', subscribes: 2, unsubscribes: 6, netChange: -4 },
  { timestamp: new Date().toISOString(), time: '12:00', subscribes: 6, unsubscribes: 3, netChange: 3 }
]

export default function SubscriptionChurn({ className, refreshInterval = 120 }: SubscriptionChurnProps) {
  const [churnData, setChurnData] = useState(MOCK_CHURN_DATA)
  const [timeRange, setTimeRange] = useState('24h')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [lastUpdated, setLastUpdated] = useState(null)
  const [useMockData, setUseMockData] = useState(false)

  const processChurnData = useCallback((events: SubscriptionEvent[]) => {
    // Group events by 5-minute buckets and aggregate
    const buckets = new Map()
    
    events.forEach(event => {
      const eventTime = new Date(event.ts)
      const bucketTime = new Date(
        eventTime.getFullYear(),
        eventTime.getMonth(),
        eventTime.getDate(),
        eventTime.getHours(),
        Math.floor(eventTime.getMinutes() / 5) * 5
      )
      
      const bucketKey = bucketTime.toISOString()
      
      if (!buckets.has(bucketKey)) {
        buckets.set(bucketKey, {
          timestamp: bucketKey,
          time: formatShortTime(bucketKey),
          subscribes: 0,
          unsubscribes: 0,
          netChange: 0
        })
      }
      
      const bucket = buckets.get(bucketKey)
      if (event.action === 'subscribe') {
        bucket.subscribes += event.count
      } else if (event.action === 'unsubscribe') {
        bucket.unsubscribes += event.count
      }
      bucket.netChange = bucket.subscribes - bucket.unsubscribes
    })

    return Array.from(buckets.values()).sort((a, b) => 
      new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    )
  }, [])

  const fetchChurnData = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      
      if (useMockData) {
        setChurnData(MOCK_CHURN_DATA)
      } else {
        const hoursBack = timeRange === '24h' ? 24 : 168
        const events = await GreApiService.getSubscriptionChurn(hoursBack)
        const processed = processChurnData(events)
        setChurnData(processed)
      }
      
      setLastUpdated(new Date())
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to fetch subscription churn data'
      setError(errorMsg)
      console.error('Error fetching churn data:', err)
      
      if (!useMockData) {
        console.log('Falling back to mock data')
        setChurnData(MOCK_CHURN_DATA)
      }
    } finally {
      setLoading(false)
    }
  }, [timeRange, useMockData, processChurnData])

  useEffect(() => {
    fetchChurnData()
    
    const interval = setInterval(fetchChurnData, refreshInterval * 1000)
    return () => clearInterval(interval)
  }, [fetchChurnData, refreshInterval])

  const totalSubscribes = churnData.reduce((sum, item) => sum + item.subscribes, 0)
  const totalUnsubscribes = churnData.reduce((sum, item) => sum + item.unsubscribes, 0)
  const netChange = totalSubscribes - totalUnsubscribes

  return (
    <div className={`chart-section ${className || ''}`}>
      <div className="chart-header">
        <h2 className="chart-title">Subscription Churn</h2>
        <div className="chart-controls">
          <select 
            className="select"
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value)}
          >
            <option value="24h">Last 24 Hours</option>
            <option value="7d">Last 7 Days</option>
          </select>
          <button onClick={fetchChurnData} disabled={loading} className="button-secondary">
            {loading ? 'Loading...' : 'Refresh'}
          </button>
          <label className="mock-data-toggle">
            <input
              type="checkbox"
              checked={useMockData}
              onChange={(e) => setUseMockData(e.target.checked)}
            />
            Use Mock Data
          </label>
        </div>
      </div>

      {error && !useMockData && (
        <div className="error-message">
          Error: {error}
          <button 
            onClick={() => setUseMockData(true)}
            style={{ marginLeft: '8px', fontSize: '12px', padding: '4px 8px' }}
          >
            Use Mock Data
          </button>
        </div>
      )}

      {/* Summary Cards */}
      <div className="churn-summary">
        <div className="churn-card">
          <div className="churn-card-label">Total Subscribes</div>
          <div className="churn-card-value" style={{ color: '#10b981' }}>
            {totalSubscribes}
          </div>
        </div>
        <div className="churn-card">
          <div className="churn-card-label">Total Unsubscribes</div>
          <div className="churn-card-value" style={{ color: '#ef4444' }}>
            {totalUnsubscribes}
          </div>
        </div>
        <div className="churn-card">
          <div className="churn-card-label">Net Change</div>
          <div className="churn-card-value" style={{ color: netChange >= 0 ? '#10b981' : '#ef4444' }}>
            {netChange >= 0 ? '+' : ''}{netChange}
          </div>
        </div>
      </div>

      {/* Churn Chart */}
      {!loading && churnData.length > 0 && (
        <div className="churn-chart">
          <h3 className="breakdown-title">Subscription Activity (5-min intervals)</h3>
          <div className="chart-container">
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={churnData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis 
                  dataKey="time" 
                  stroke="#6b7280"
                  fontSize={12}
                  interval="preserveStartEnd"
                />
                <YAxis stroke="#6b7280" fontSize={12} />
                <Tooltip 
                  formatter={(value, name) => [value, name]}
                  labelFormatter={(label) => `Time: ${label}`}
                  contentStyle={{
                    backgroundColor: '#ffffff',
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px',
                    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                  }}
                />
                <Area 
                  type="monotone" 
                  dataKey="subscribes" 
                  stackId="1"
                  stroke="#10b981" 
                  fill="#10b981"
                  fillOpacity={0.6}
                  name="Subscribes"
                />
                <Area 
                  type="monotone" 
                  dataKey="unsubscribes" 
                  stackId="1"
                  stroke="#ef4444" 
                  fill="#ef4444"
                  fillOpacity={0.6}
                  name="Unsubscribes"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {!loading && churnData.length === 0 && !useMockData && (
        <div className="no-data">
          No subscription activity data available for the selected time range
        </div>
      )}

      {lastUpdated && (
        <div className="last-updated">
          Last updated: {lastUpdated.toLocaleString()}
          {useMockData && <span style={{ color: '#f59e0b' }}> (Using Mock Data)</span>}
        </div>
      )}
    </div>
  )
}
