import React, { useState, useEffect, useCallback } from 'react'
import { GreApiService } from '../services/greApi'

interface ConnectDisconnectProps {
  className?: string
  refreshInterval?: number
}

export default function RecentConnectDisconnects({ className, refreshInterval = 120 }: ConnectDisconnectProps) {
  const [timeRange, setTimeRange] = useState<'24h' | '7d'>('24h')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)
  const [useMockData, setUseMockData] = useState(false)

  const [totalConnects, setTotalConnects] = useState<number | null>(null)
  const [totalDisconnects, setTotalDisconnects] = useState<number | null>(null)

  const hoursBack = timeRange === '24h' ? 24 : 168

  const fetchTotals = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

      if (useMockData) {
        setTotalConnects(123)
        setTotalDisconnects(98)
        setLastUpdated(new Date())
        return
      }

      // Use the efficient count endpoints implemented in GreApiService
      const [connects, disconnects] = await Promise.all([
        GreApiService.getConnectCount(hoursBack),
        GreApiService.getDisconnectCount(hoursBack)
      ])

      setTotalConnects(connects)
      setTotalDisconnects(disconnects)
      setLastUpdated(new Date())
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to fetch totals'
      setError(msg)
      console.error('RecentConnectDisconnects fetchTotals error:', err)
      // keep nulls so UI can show fallback
      setTotalConnects(null)
      setTotalDisconnects(null)
    } finally {
      setLoading(false)
    }
  }, [timeRange, useMockData, hoursBack])

  useEffect(() => {
    fetchTotals()
    const interval = setInterval(fetchTotals, refreshInterval * 1000)
    return () => clearInterval(interval)
  }, [fetchTotals, refreshInterval])

  const netChange = (totalConnects ?? 0) - (totalDisconnects ?? 0)

  return (
    <div className={`chart-section ${className || ''}`}>
      <div className="chart-header">
        <h2 className="chart-title">Recent Connects/Disconnects</h2>
        <div className="chart-controls">
          <select 
            className="select"
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value as '24h' | '7d')}
          >
            <option value="24h">Last 24 Hours</option>
            <option value="7d">Last 7 Days</option>
          </select>
          <button onClick={fetchTotals} disabled={loading} className="button-secondary">
            {loading ? 'Loading...' : 'Refresh'}
          </button>
          <label className="mock-data-toggle" style={{ marginLeft: 8 }}>
            <input
              type="checkbox"
              checked={useMockData}
              onChange={(e) => setUseMockData(e.target.checked)}
            />
            Use Mock Data
          </label>
        </div>
      </div>

      {error && (
        <div className="error-message">
          Error: {error}
        </div>
      )}

      <div className="churn-summary" style={{ display: 'flex', gap: 12, marginTop: 12 }}>
        <div className="churn-card" style={{ flex: 1, padding: 12, borderRadius: 8, background: '#fff', border: '1px solid #e5e7eb' }}>
          <div className="churn-card-label">Total Connects</div>
          <div className="churn-card-value" style={{ color: '#10b981', fontSize: 20, fontWeight: 600 }}>
            {totalConnects === null ? (loading ? 'Loading…' : '—') : totalConnects}
          </div>
        </div>
        <div className="churn-card" style={{ flex: 1, padding: 12, borderRadius: 8, background: '#fff', border: '1px solid #e5e7eb' }}>
          <div className="churn-card-label">Total Disconnects</div>
          <div className="churn-card-value" style={{ color: '#ef4444', fontSize: 20, fontWeight: 600 }}>
            {totalDisconnects === null ? (loading ? 'Loading…' : '—') : totalDisconnects}
          </div>
        </div>
        <div className="churn-card" style={{ flex: 1, padding: 12, borderRadius: 8, background: '#fff', border: '1px solid #e5e7eb' }}>
          <div className="churn-card-label">Net Change</div>
          <div className="churn-card-value" style={{ color: netChange >= 0 ? '#10b981' : '#ef4444', fontSize: 20, fontWeight: 600 }}>
            {(totalConnects === null || totalDisconnects === null) ? (loading ? 'Loading…' : '—') : `${netChange >= 0 ? '+' : ''}${netChange}`}
          </div>
        </div>
      </div>

      {lastUpdated && (
        <div className="last-updated" style={{ marginTop: 8, color: '#6b7280', fontSize: 12 }}>
          Last updated: {lastUpdated.toLocaleString()}
          {useMockData && <span style={{ color: '#f59e0b' }}> (Using Mock Data)</span>}
        </div>
      )}
    </div>
  )
}
