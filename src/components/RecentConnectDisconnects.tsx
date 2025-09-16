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

  const [totalConnects, setTotalConnects] = useState<number | null>(null)
  const [totalDisconnects, setTotalDisconnects] = useState<number | null>(null)

  const hoursBack = timeRange === '24h' ? 24 : 168

  const fetchTotals = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

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
  }, [hoursBack])

  useEffect(() => {
    fetchTotals()
    const interval = setInterval(fetchTotals, refreshInterval * 1000)
    return () => clearInterval(interval)
  }, [fetchTotals, refreshInterval])

  const netChange = (totalConnects ?? 0) - (totalDisconnects ?? 0)

  return (
    <>
      {/* Header with title and controls */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: '16px',
        flexWrap: 'wrap',
        gap: '12px'
      }}>
        <h2 style={{
          fontSize: '18px',
          fontWeight: '600',
          margin: 0,
          color: '#1f2937'
        }}>
          Recent Connects/Disconnects
        </h2>

        <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
          <select 
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value as '24h' | '7d')}
            style={{
              padding: '6px 12px',
              border: '1px solid #d1d5db',
              borderRadius: '6px',
              fontSize: '14px',
              backgroundColor: 'white',
              cursor: 'pointer'
            }}
          >
            <option value="24h">Last 24 Hours</option>
            <option value="7d">Last 7 Days</option>
          </select>
          <button onClick={fetchTotals} disabled={loading} style={{
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
          }}>
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

      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', 
        gap: '16px'
      }}>
        <div style={{ 
          padding: '16px', 
          borderRadius: '8px', 
          background: '#fff', 
          border: '1px solid #e5e7eb',
          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)'
        }}>
          <div style={{ 
            fontSize: '14px', 
            color: '#6b7280', 
            marginBottom: '8px',
            fontWeight: '500'
          }}>
            Total Connects
          </div>
          <div style={{ 
            color: '#10b981', 
            fontSize: '24px', 
            fontWeight: '600',
            lineHeight: '1'
          }}>
            {totalConnects === null ? (loading ? 'Loading...' : '—') : totalConnects.toLocaleString()}
          </div>
        </div>
        
        <div style={{ 
          padding: '16px', 
          borderRadius: '8px', 
          background: '#fff', 
          border: '1px solid #e5e7eb',
          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)'
        }}>
          <div style={{ 
            fontSize: '14px', 
            color: '#6b7280', 
            marginBottom: '8px',
            fontWeight: '500'
          }}>
            Total Disconnects
          </div>
          <div style={{ 
            color: '#ef4444', 
            fontSize: '24px', 
            fontWeight: '600',
            lineHeight: '1'
          }}>
            {totalDisconnects === null ? (loading ? 'Loading...' : '—') : totalDisconnects.toLocaleString()}
          </div>
        </div>
        
        <div style={{ 
          padding: '16px', 
          borderRadius: '8px', 
          background: '#fff', 
          border: '1px solid #e5e7eb',
          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)'
        }}>
          <div style={{ 
            fontSize: '14px', 
            color: '#6b7280', 
            marginBottom: '8px',
            fontWeight: '500'
          }}>
            Net Change
          </div>
          <div style={{ 
            color: netChange >= 0 ? '#10b981' : '#ef4444', 
            fontSize: '24px', 
            fontWeight: '600',
            lineHeight: '1'
          }}>
            {(totalConnects === null || totalDisconnects === null) ? (loading ? 'Loading...' : '—') : `${netChange >= 0 ? '+' : ''}${netChange.toLocaleString()}`}
          </div>
        </div>
      </div>

      {lastUpdated && (
        <div style={{
          fontSize: '12px',
          color: '#6b7280',
          textAlign: 'center',
          marginTop: '16px'
        }}>
          Last updated: {lastUpdated.toLocaleString()}
        </div>
      )}
    </>
  )
}
