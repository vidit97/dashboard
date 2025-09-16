import React, { useState, useEffect, useCallback } from 'react'
import { useGlobalState } from '../hooks/useGlobalState'
import { watchMQTTService } from '../../services/api'
import { OverviewData, API_CONFIG } from '../../config/api'
import { formatUptime, formatMetric } from '../../services/api'
import TrafficChart from '../../ui/TrafficChart'
import ConnectionsChart from '../../ui/ConnectionsChart'
import StorageChart from '../../ui/StorageChart'
import TrafficConnectionsChart from '../../ui/TrafficConnectionsChart'
import { SummaryCards } from '../../components/SummaryCards'
import { DetailedActivityFeed } from '../../v1/components/DetailedActivityFeed'

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
    <div>
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
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '24px', fontWeight: '600', marginBottom: '4px', color: '#ffffff' }}>
              {loading ? '--' : overview?.messages_sent_per_sec_1m ? formatMetric(overview.messages_sent_per_sec_1m, 'rate') : '0'}
            </div>
            <div style={{ color: '#9ca3af', fontSize: '14px' }}>Publish Rate</div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '24px', fontWeight: '600', marginBottom: '4px', color: '#ffffff' }}>
              {loading ? '--' : overview?.bytes_sent_per_sec_1m ? formatBytes(overview.bytes_sent_per_sec_1m) + '/s' : '0/s'}
            </div>
            <div style={{ color: '#9ca3af', fontSize: '14px' }}>Inbound Traffic</div>
          </div>
        </div>
      </div>

      {/* Main Content Grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: '2fr 1fr',
        gap: '28px',
        marginBottom: '40px'
      }}>
        {/* Left Column - Metrics */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {/* Performance Metrics */}
          <div style={{
            background: 'white',
            borderRadius: '16px',
            padding: '28px',
            border: '1px solid #e5e7eb',
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.08)'
          }}>
            <h3 style={{
              margin: '0 0 20px 0',
              fontSize: '20px',
              fontWeight: '600',
              color: '#1f2937',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}>
              ⚡ Real-time Metrics
            </h3>

            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
              gap: '16px'
            }}>
              {/* Message Flow */}
              <div style={{
                padding: '20px',
                background: '#ffffff',
                borderRadius: '8px',
                border: '1px solid #e5e7eb'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                  <span style={{ fontSize: '14px', fontWeight: '600', color: '#374151' }}>Messages/sec</span>
                  <div style={{ width: '32px', height: '32px', background: '#f3f4f6', borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px' }}>
                    📊
                  </div>
                </div>
                <div style={{ fontSize: '28px', fontWeight: '700', color: '#111827', marginBottom: '8px' }}>
                  {loading ? '--' : overview?.messages_sent_per_sec_1m ? formatMetric(overview.messages_sent_per_sec_1m, 'rate') : '0'}
                </div>
                <div style={{ fontSize: '13px', color: '#6b7280' }}>
                  Sent: {loading ? '--' : overview?.messages_sent_per_sec_1m ? formatMetric(overview.messages_sent_per_sec_1m, 'rate') : '0'} • Recv: {loading ? '--' : overview?.messages_received_per_sec_1m ? formatMetric(overview.messages_received_per_sec_1m, 'rate') : '0'}
                </div>
              </div>

              {/* Bytes/sec */}
              <div style={{
                padding: '20px',
                background: '#ffffff',
                borderRadius: '8px',
                border: '1px solid #e5e7eb'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                  <span style={{ fontSize: '14px', fontWeight: '600', color: '#374151' }}>Bytes/sec</span>
                  <div style={{ width: '32px', height: '32px', background: '#f3f4f6', borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px' }}>
                    🌐
                  </div>
                </div>
                <div style={{ fontSize: '28px', fontWeight: '700', color: '#111827', marginBottom: '8px' }}>
                  {loading ? '--' : overview?.bytes_sent_per_sec_1m ? formatBytes(overview.bytes_sent_per_sec_1m) + '/s' : '0/s'}
                </div>
                <div style={{ fontSize: '13px', color: '#6b7280' }}>
                  Sent: {loading ? '--' : overview?.bytes_sent_per_sec_1m ? formatBytes(overview.bytes_sent_per_sec_1m) + '/s' : '0/s'} • Recv: {loading ? '--' : overview?.bytes_received_per_sec_1m ? formatBytes(overview.bytes_received_per_sec_1m) + '/s' : '0/s'}
                </div>
              </div>

              {/* Subscriptions */}
              <div style={{
                padding: '20px',
                background: '#ffffff',
                borderRadius: '8px',
                border: '1px solid #e5e7eb'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                  <span style={{ fontSize: '14px', fontWeight: '600', color: '#374151' }}>Subscriptions</span>
                  <div style={{ width: '32px', height: '32px', background: '#f3f4f6', borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px' }}>
                    👥
                  </div>
                </div>
                <div style={{ fontSize: '28px', fontWeight: '700', color: '#111827', marginBottom: '8px' }}>
                  {loading ? '--' : overview?.subscriptions?.toLocaleString() || '0'}
                </div>
                <div style={{ fontSize: '13px', color: '#6b7280' }}>
                  Active subscriptions
                </div>
              </div>

              {/* Retained Messages */}
              <div style={{
                padding: '20px',
                background: '#ffffff',
                borderRadius: '8px',
                border: '1px solid #e5e7eb'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                  <span style={{ fontSize: '14px', fontWeight: '600', color: '#374151' }}>Retained Messages</span>
                  <div style={{ width: '32px', height: '32px', background: '#f3f4f6', borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px' }}>
                    💾
                  </div>
                </div>
                <div style={{ fontSize: '28px', fontWeight: '700', color: '#111827', marginBottom: '8px' }}>
                  {loading ? '--' : overview?.retained?.toLocaleString() || '0'}
                </div>
                <div style={{ fontSize: '13px', color: '#6b7280' }}>
                  Messages in storage
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column - Activity Stream */}
        <div style={{
          background: 'white',
          borderRadius: '16px',
          padding: '28px',
          border: '1px solid #e5e7eb',
          height: 'fit-content',
          position: 'sticky',
          top: '20px',
          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.08)'
        }}>
          <h3 style={{
            margin: '0 0 20px 0',
            fontSize: '18px',
            fontWeight: '600',
            color: '#111827',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            📈 Latest Events (ts, action, client)
          </h3>

          <DetailedActivityFeed
            refreshInterval={state.autoRefresh ? 30 : 0}
          />
        </div>
      </div>

      {/* Charts Section */}
      <div style={{ marginBottom: '32px' }}>
        {/* Top Row - Combined Chart Full Width */}
        <div style={{
          background: 'white',
          borderRadius: '12px',
          border: '1px solid #e5e7eb',
          padding: '20px',
          boxShadow: '0 2px 4px rgba(0, 0, 0, 0.05)',
          minHeight: '650px',
          marginBottom: '24px'
        }}>
          <TrafficConnectionsChart
            broker={state.broker}
            refreshInterval={30}
            autoRefresh={false}
            className=""
          />
        </div>

        {/* Second Row - Two Charts Side by Side */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(500px, 1fr))',
          gap: '24px',
          marginBottom: '24px'
        }}>
          <div style={{
            background: 'white',
            borderRadius: '12px',
            border: '1px solid #e5e7eb',
            padding: '20px',
            boxShadow: '0 2px 4px rgba(0, 0, 0, 0.05)',
            minHeight: '300px'
          }}>
            <TrafficChart
              broker={state.broker}
              refreshInterval={30}
              autoRefresh={false}
              className=""
            />
          </div>
          <div style={{
            background: 'white',
            borderRadius: '12px',
            border: '1px solid #e5e7eb',
            padding: '20px',
            boxShadow: '0 2px 4px rgba(0, 0, 0, 0.05)',
            minHeight: '300px'
          }}>
            <ConnectionsChart
              broker={state.broker}
              refreshInterval={30}
              autoRefresh={false}
              className=""
            />
          </div>
        </div>

        {/* Bottom Row - Third Chart Full Width */}
        <div style={{
          background: 'white',
          borderRadius: '12px',
          border: '1px solid #e5e7eb',
          padding: '20px',
          boxShadow: '0 2px 4px rgba(0, 0, 0, 0.05)',
          minHeight: '300px'
        }}>
          <StorageChart
            broker={state.broker}
            refreshInterval={30}
            autoRefresh={false}
            className=""
          />
        </div>
      </div>

      {/* 24h Summary Section */}
      <div style={{
        background: 'white',
        borderRadius: '16px',
        padding: '32px',
        border: '1px solid #e5e7eb',
        marginBottom: '40px',
        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.08)'
      }}>
        <h3 style={{
          margin: '0 0 20px 0',
          fontSize: '20px',
          fontWeight: '600',
          color: '#1f2937',
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}>
          📊 24h Summary
        </h3>
        <SummaryCards loading={loading} broker={state.broker} />
      </div>

      {/* Quick Actions */}
      <div style={{
        background: 'white',
        borderRadius: '16px',
        padding: '28px',
        border: '1px solid #e5e7eb',
        marginBottom: '40px',
        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.08)'
      }}>
        <h3 style={{
          margin: '0 0 16px 0',
          fontSize: '18px',
          fontWeight: '600',
          color: '#111827'
        }}>
          Quick Actions
        </h3>
        <div style={{
          display: 'flex',
          gap: '12px',
          flexWrap: 'wrap'
        }}>
          <button style={{
            padding: '12px 20px',
            background: '#111827',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            fontSize: '14px',
            fontWeight: '500',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            transition: 'all 0.2s ease'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = '#1f2937'
            e.currentTarget.style.transform = 'translateY(-1px)'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = '#111827'
            e.currentTarget.style.transform = 'translateY(0px)'
          }}>
            📋 Copy Endpoint
          </button>
          <button style={{
            padding: '12px 20px',
            background: '#f9fafb',
            color: '#111827',
            border: '1px solid #e5e7eb',
            borderRadius: '6px',
            fontSize: '14px',
            fontWeight: '500',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            transition: 'all 0.2s ease'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = '#f3f4f6'
            e.currentTarget.style.transform = 'translateY(-1px)'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = '#f9fafb'
            e.currentTarget.style.transform = 'translateY(0px)'
          }}>
            💾 Export Data
          </button>
          <button style={{
            padding: '12px 20px',
            background: '#f9fafb',
            color: '#111827',
            border: '1px solid #e5e7eb',
            borderRadius: '6px',
            fontSize: '14px',
            fontWeight: '500',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            transition: 'all 0.2s ease'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = '#f3f4f6'
            e.currentTarget.style.transform = 'translateY(-1px)'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = '#f9fafb'
            e.currentTarget.style.transform = 'translateY(0px)'
          }}>
            🔧 Configure
          </button>
        </div>
      </div>
    </div>
  )
}