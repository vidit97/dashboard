import React, { useState, useEffect, useCallback } from 'react'
import { useGlobalState } from '../hooks/useGlobalState'
import { useManualRefresh } from '../hooks/useManualRefresh'
import { watchMQTTService } from '../../services/api'
import { OverviewData, API_CONFIG } from '../../config/api'
import { formatUptime, formatMetric } from '../../services/api'
import TrafficChart from '../../ui/TrafficChart'
import ConnectionsChart from '../../ui/ConnectionsChart'
import StorageChart from '../../ui/StorageChart'
import TrafficConnectionsChart from '../../ui/TrafficConnectionsChart'
import { SummaryCards } from '../../components/SummaryCards'
import { DetailedActivityFeed } from '../../v1/components/DetailedActivityFeed'
import ToggleTrafficTile from '../components/ToggleTrafficTile'
import ToggleReceivedTile from '../components/ToggleReceivedTile'

export const V2OverviewPage: React.FC = () => {
  const { state } = useGlobalState()
  const [currentTime, setCurrentTime] = useState(new Date())
  const [overview, setOverview] = useState<OverviewData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Fetch overview data from the main API
  const fetchOverview = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      console.log('V2 Overview: Fetching data for broker:', state.broker)
      const data = await watchMQTTService.getOverview(state.broker)
      console.log('V2 Overview: API Response:', data)
      setOverview(data)
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to fetch overview data'
      setError(errorMsg)
      console.error('V2 Overview: Error fetching data:', err)
    } finally {
      setLoading(false)
    }
  }, [state.broker])

  // Auto-refresh effect - only when checkbox is enabled
  useEffect(() => {
    // Always fetch on mount
    fetchOverview()

    // Only set up interval if auto-refresh is enabled
    if (state.autoRefresh) {
      const interval = setInterval(fetchOverview, state.refreshInterval * 1000)
      return () => clearInterval(interval)
    }
  }, [fetchOverview, state.refreshInterval, state.autoRefresh])

  // Listen for manual refresh events
  useManualRefresh(fetchOverview, 'Overview')

  // Update time every second for real-time feel
  useEffect(() => {
    const interval = setInterval(() => setCurrentTime(new Date()), 1000)
    return () => clearInterval(interval)
  }, [])

  const getConnectionStatus = () => {
    if (!overview) return { status: 'Unknown', color: '#6b7280' }

    if (overview.connected > 0 && overview.disconnected === 0) {
      return { status: 'Healthy', color: '#10b981' }
    }

    const total = overview.connected + overview.disconnected
    if (total === 0) return { status: 'No Clients', color: '#6b7280' }

    const connectedRatio = overview.connected / total
    if (connectedRatio >= 0.9) return { status: 'Healthy', color: '#10b981' }
    if (connectedRatio >= 0.7) return { status: 'Warning', color: '#f59e0b' }
    return { status: 'Critical', color: '#ef4444' }
  }

  // Custom formatter for bytes with 2 decimal places max
  const formatBytes = (value: number | undefined | null): string => {
    if (!value || value === 0) return '0B'

    if (value >= 1024 * 1024 * 1024) return `${(value / (1024 * 1024 * 1024)).toFixed(2)}GB`
    if (value >= 1024 * 1024) return `${(value / (1024 * 1024)).toFixed(2)}MB`
    if (value >= 1024) return `${(value / 1024).toFixed(2)}KB`
    return `${value.toFixed(2)}B`
  }

  return (
    <div style={{ width: '100%', overflow: 'hidden' }}>
      {/* Hero Status Section */}
      <div style={{
        background: '#1f2937',
        borderRadius: '16px',
        padding: '40px',
        marginBottom: '40px',
        color: 'white',
        position: 'relative',
        border: '1px solid #374151'
      }}>
        {error && (
          <div style={{
            background: '#fef2f2',
            color: '#dc2626',
            padding: '12px',
            borderRadius: '8px',
            marginBottom: '16px',
            border: '1px solid #fecaca'
          }}>
            Error: {error}
          </div>
        )}

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
          <div>
            <h1 style={{
              fontSize: '32px',
              fontWeight: '700',
              margin: '0 0 8px 0',
              color: '#ffffff'
            }}>
              {state.broker.charAt(0).toUpperCase() + state.broker.slice(1)} Broker
            </h1>
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px', fontSize: '16px', color: '#9ca3af' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{
                  width: '10px',
                  height: '10px',
                  borderRadius: '50%',
                  backgroundColor: loading ? '#6b7280' : getConnectionStatus().color
                }} />
                <span style={{ fontWeight: '500', textTransform: 'capitalize', color: '#e5e7eb' }}>
                  {loading ? 'Loading...' : getConnectionStatus().status}
                </span>
              </div>
              <span>•</span>
              <span>Uptime: {loading ? '--' : overview ? formatUptime(overview.uptime_seconds) : '--'}</span>
              <span>•</span>
              <span>Version v5.0.4</span>
            </div>
          </div>
        </div>

        {/* Key Metrics Row */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '20px'
        }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '28px', fontWeight: '600', marginBottom: '4px', color: '#ffffff' }}>
              {loading ? '--' : overview?.connected?.toLocaleString() || '0'}
            </div>
            <div style={{ color: '#9ca3af', fontSize: '14px' }}>Connected Clients</div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '28px', fontWeight: '600', marginBottom: '4px', color: '#ffffff' }}>
              {loading ? '--' : overview?.active?.toLocaleString() || '0'}
            </div>
            <div style={{ color: '#9ca3af', fontSize: '14px' }}>Active Clients</div>
          </div>
        </div>
      </div>

      {/* Real Time Metrics - Full Width */}
      <div style={{
        background: 'white',
        borderRadius: '16px',
        padding: '28px',
        border: '1px solid #e5e7eb',
        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.08)',
        marginBottom: '40px'
      }}>
        <h3 style={{
          margin: '0 0 24px 0',
          fontSize: '20px',
          fontWeight: '600',
          color: '#1f2937'
        }}>
          ⚡ Real Time Metrics
        </h3>

        {/* Top Row - Toggle Tiles - FIXED RESPONSIVE GRID */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 400px), 1fr))',
          gap: '24px',
          marginBottom: '32px'
        }}>
          <ToggleTrafficTile broker={state.broker} />
          <ToggleReceivedTile broker={state.broker} />
        </div>

        {/* 24h Summary */}
        <div style={{ marginBottom: '32px' }}>
          <SummaryCards loading={loading} broker={state.broker} />
        </div>

        {/* Bottom Row - Additional Metrics */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '20px'
        }}>
          {/* Subscriptions */}
          <div style={{
            padding: '20px',
            background: '#f9fafb',
            borderRadius: '12px',
            border: '1px solid #e5e7eb',
            textAlign: 'center'
          }}>
            <div style={{ fontSize: '24px', fontWeight: '700', color: '#111827', marginBottom: '8px' }}>
              {loading ? '--' : overview?.subscriptions?.toLocaleString() || '0'}
            </div>
            <div style={{ fontSize: '14px', color: '#6b7280', fontWeight: '500' }}>
              Subscriptions
            </div>
          </div>

          {/* Retained Messages */}
          <div style={{
            padding: '20px',
            background: '#f9fafb',
            borderRadius: '12px',
            border: '1px solid #e5e7eb',
            textAlign: 'center'
          }}>
            <div style={{ fontSize: '24px', fontWeight: '700', color: '#111827', marginBottom: '8px' }}>
              {loading ? '--' : overview?.retained?.toLocaleString() || '0'}
            </div>
            <div style={{ fontSize: '14px', color: '#6b7280', fontWeight: '500' }}>
              Retained Messages
            </div>
          </div>
        </div>
      </div>

      {/* Charts Section */}
      <div style={{ marginBottom: '40px', width: '100%' }}>
        {/* Charts Row - Two Charts Side by Side */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 500px), 1fr))',
          gap: '24px',
          marginBottom: '24px',
          width: '100%'
        }}>
          {/* Traffic Chart Container */}
          <div style={{
            background: 'white',
            borderRadius: '12px',
            border: '1px solid #e5e7eb',
            boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
            padding: '24px'
          }}>
            <TrafficChart
              broker={state.broker}
              refreshInterval={30}
              autoRefresh={false}
              className=""
            />
          </div>
          
          {/* Connections Chart Container */}
          <div style={{
            background: 'white',
            borderRadius: '12px',
            border: '1px solid #e5e7eb',
            boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
            padding: '24px'
          }}>
            <ConnectionsChart
              broker={state.broker}
              refreshInterval={30}
              autoRefresh={false}
              className=""
            />
          </div>
        </div>

        {/* Storage Chart Row */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 500px), 1fr))',
          gap: '24px',
          width: '100%'
        }}>
          {/* Storage Chart Container */}
          <div style={{
            background: 'white',
            borderRadius: '12px',
            border: '1px solid #e5e7eb',
            boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
            padding: '24px'
          }}>
            <StorageChart
              broker={state.broker}
              refreshInterval={30}
              autoRefresh={false}
              className=""
            />
          </div>

          {/* Invisible placeholder box for grid consistency */}
          <div style={{
            visibility: 'hidden'
          }} />
        </div>
      </div>

      {/* Latest Events - Full Width */}
      <div style={{
        background: 'white',
        borderRadius: '16px',
        padding: '28px',
        border: '1px solid #e5e7eb',
        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.08)',
        marginBottom: '40px'
      }}>
        <h3 style={{
          margin: '0 0 20px 0',
          fontSize: '20px',
          fontWeight: '600',
          color: '#1f2937'
        }}>
          📈 Latest Events (ts, action, client)
        </h3>

        <DetailedActivityFeed
          refreshInterval={state.autoRefresh ? 30 : 0}
        />
      </div>
    </div>
  )
}