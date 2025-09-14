import React, { useState, useEffect } from 'react'
import { useGlobalState } from '../hooks/useGlobalState'

// Mock data for demonstration - in real app this would come from API
const mockBrokerData = {
  status: 'healthy',
  uptime: '15d 7h 23m',
  version: 'v5.0.4',
  totalConnections: 1247,
  activeClients: 892,
  sessionsRate: { current: 45, trend: 'up' },
  messageRate: { publish: 2847, subscribe: 5693, trend: 'stable' },
  throughput: { inbound: '2.4 MB/s', outbound: '5.1 MB/s' },
  topics: { active: 156, subscribed: 1893 },
  storage: { used: '847 MB', total: '2 GB', percentage: 42 },
  memory: { used: '1.2 GB', total: '4 GB', percentage: 30 },
  alerts: [
    { id: 1, severity: 'warning', message: 'High memory usage on node-2', since: '5m ago' },
    { id: 2, severity: 'info', message: 'Backup completed successfully', since: '1h ago' }
  ],
  recentActivity: [
    { id: 1, type: 'connect', client: 'sensor_device_001', timestamp: new Date(Date.now() - 30000) },
    { id: 2, type: 'publish', client: 'mobile_app_007', topic: 'alerts/motion', timestamp: new Date(Date.now() - 45000) },
    { id: 3, type: 'subscribe', client: 'dashboard_client', topic: 'sensors/+/temperature', timestamp: new Date(Date.now() - 67000) },
    { id: 4, type: 'disconnect', client: 'sensor_device_023', timestamp: new Date(Date.now() - 89000) },
    { id: 5, type: 'publish', client: 'weather_station', topic: 'weather/outdoor/humidity', timestamp: new Date(Date.now() - 112000) }
  ]
}

export const OverviewPage: React.FC = () => {
  const { state } = useGlobalState()
  const [currentTime, setCurrentTime] = useState(new Date())

  // Update time every second for real-time feel
  useEffect(() => {
    const interval = setInterval(() => setCurrentTime(new Date()), 1000)
    return () => clearInterval(interval)
  }, [])

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy': return '#10b981'
      case 'warning': return '#f59e0b'
      case 'critical': return '#ef4444'
      default: return '#6b7280'
    }
  }

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'connect': return '🔌'
      case 'disconnect': return '🔌'
      case 'publish': return '📤'
      case 'subscribe': return '📥'
      default: return '•'
    }
  }

  const formatTimeAgo = (timestamp: Date) => {
    const seconds = Math.floor((currentTime.getTime() - timestamp.getTime()) / 1000)
    if (seconds < 60) return `${seconds}s ago`
    const minutes = Math.floor(seconds / 60)
    if (minutes < 60) return `${minutes}m ago`
    const hours = Math.floor(minutes / 60)
    return `${hours}h ago`
  }

  return (
    <div style={{ maxWidth: '1600px', margin: '0 auto', padding: '0 16px' }}>
      {/* Hero Status Section */}
      <div style={{
        background: '#1f2937',
        borderRadius: '12px',
        padding: '32px',
        marginBottom: '32px',
        color: 'white',
        position: 'relative',
        border: '1px solid #374151'
      }}>
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
                  backgroundColor: getStatusColor(mockBrokerData.status)
                }} />
                <span style={{ fontWeight: '500', textTransform: 'capitalize', color: '#e5e7eb' }}>{mockBrokerData.status}</span>
              </div>
              <span>•</span>
              <span>Uptime: {mockBrokerData.uptime}</span>
              <span>•</span>
              <span>Version {mockBrokerData.version}</span>
            </div>
          </div>
        </div>

        {/* Key Metrics Row */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '24px' }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '28px', fontWeight: '600', marginBottom: '4px', color: '#ffffff' }}>
              {mockBrokerData.totalConnections.toLocaleString()}
            </div>
            <div style={{ color: '#9ca3af', fontSize: '14px' }}>Total Connections</div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '28px', fontWeight: '600', marginBottom: '4px', color: '#ffffff' }}>
              {mockBrokerData.activeClients.toLocaleString()}
            </div>
            <div style={{ color: '#9ca3af', fontSize: '14px' }}>Active Clients</div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '24px', fontWeight: '600', marginBottom: '4px', color: '#ffffff' }}>
              {mockBrokerData.messageRate.publish}/s
            </div>
            <div style={{ color: '#9ca3af', fontSize: '14px' }}>Publish Rate</div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '24px', fontWeight: '600', marginBottom: '4px', color: '#ffffff' }}>
              {mockBrokerData.throughput.inbound}
            </div>
            <div style={{ color: '#9ca3af', fontSize: '14px' }}>Inbound Traffic</div>
          </div>
        </div>
      </div>

      {/* Main Content Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '32px', marginBottom: '32px' }}>
        {/* Left Column - Metrics */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {/* Performance Metrics */}
          <div style={{
            background: 'white',
            borderRadius: '16px',
            padding: '24px',
            border: '1px solid #e5e7eb',
            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
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
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
              {/* Message Flow */}
              <div style={{ 
                padding: '20px',
                background: '#ffffff',
                borderRadius: '8px',
                border: '1px solid #e5e7eb'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                  <span style={{ fontSize: '14px', fontWeight: '600', color: '#374151' }}>Message Flow</span>
                  <div style={{ width: '32px', height: '32px', background: '#f3f4f6', borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px' }}>
                    📊
                  </div>
                </div>
                <div style={{ fontSize: '28px', fontWeight: '700', color: '#111827', marginBottom: '8px' }}>
                  {(mockBrokerData.messageRate.publish + mockBrokerData.messageRate.subscribe).toLocaleString()}/s
                </div>
                <div style={{ fontSize: '13px', color: '#6b7280' }}>
                  {mockBrokerData.messageRate.publish}/s publish • {mockBrokerData.messageRate.subscribe}/s subscribe
                </div>
              </div>

              {/* Topics */}
              <div style={{ 
                padding: '20px',
                background: '#ffffff',
                borderRadius: '8px',
                border: '1px solid #e5e7eb'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                  <span style={{ fontSize: '14px', fontWeight: '600', color: '#374151' }}>Active Topics</span>
                  <div style={{ width: '32px', height: '32px', background: '#f3f4f6', borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px' }}>
                    📝
                  </div>
                </div>
                <div style={{ fontSize: '28px', fontWeight: '700', color: '#111827', marginBottom: '8px' }}>
                  {mockBrokerData.topics.active}
                </div>
                <div style={{ fontSize: '13px', color: '#6b7280' }}>
                  {mockBrokerData.topics.subscribed} total subscriptions
                </div>
              </div>

              {/* Storage */}
              <div style={{ 
                padding: '20px',
                background: '#ffffff',
                borderRadius: '8px',
                border: '1px solid #e5e7eb'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                  <span style={{ fontSize: '14px', fontWeight: '600', color: '#374151' }}>Storage</span>
                  <div style={{ width: '32px', height: '32px', background: '#f3f4f6', borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px' }}>
                    💽
                  </div>
                </div>
                <div style={{ fontSize: '28px', fontWeight: '700', color: '#111827', marginBottom: '12px' }}>
                  {mockBrokerData.storage.used}
                </div>
                <div style={{
                  width: '100%',
                  height: '6px',
                  backgroundColor: '#f3f4f6',
                  borderRadius: '3px',
                  marginBottom: '8px'
                }}>
                  <div style={{
                    width: `${mockBrokerData.storage.percentage}%`,
                    height: '100%',
                    backgroundColor: '#111827',
                    borderRadius: '3px'
                  }} />
                </div>
                <div style={{ fontSize: '13px', color: '#6b7280' }}>
                  {mockBrokerData.storage.percentage}% of {mockBrokerData.storage.total}
                </div>
              </div>

              {/* Memory */}
              <div style={{ 
                padding: '20px',
                background: '#ffffff',
                borderRadius: '8px',
                border: '1px solid #e5e7eb'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                  <span style={{ fontSize: '14px', fontWeight: '600', color: '#374151' }}>Memory Usage</span>
                  <div style={{ width: '32px', height: '32px', background: '#f3f4f6', borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px' }}>
                    🧠
                  </div>
                </div>
                <div style={{ fontSize: '28px', fontWeight: '700', color: '#111827', marginBottom: '12px' }}>
                  {mockBrokerData.memory.used}
                </div>
                <div style={{
                  width: '100%',
                  height: '6px',
                  backgroundColor: '#f3f4f6',
                  borderRadius: '3px',
                  marginBottom: '8px'
                }}>
                  <div style={{
                    width: `${mockBrokerData.memory.percentage}%`,
                    height: '100%',
                    backgroundColor: '#111827',
                    borderRadius: '3px'
                  }} />
                </div>
                <div style={{ fontSize: '13px', color: '#6b7280' }}>
                  {mockBrokerData.memory.percentage}% of {mockBrokerData.memory.total}
                </div>
              </div>
            </div>
          </div>

          {/* Alerts Section */}
          {mockBrokerData.alerts.length > 0 && (
            <div style={{
              background: 'white',
              borderRadius: '8px',
              padding: '24px',
              border: '1px solid #e5e7eb'
            }}>
              <h3 style={{ 
                margin: '0 0 16px 0', 
                fontSize: '18px', 
                fontWeight: '600',
                color: '#111827',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}>
                Active Alerts ({mockBrokerData.alerts.length})
              </h3>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {mockBrokerData.alerts.map((alert) => (
                  <div key={alert.id} style={{
                    padding: '16px',
                    borderRadius: '6px',
                    border: '1px solid #e5e7eb',
                    background: alert.severity === 'warning' ? '#fef3c7' : '#f9fafb'
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <div style={{
                          width: '6px',
                          height: '6px',
                          borderRadius: '50%',
                          backgroundColor: alert.severity === 'warning' ? '#f59e0b' : '#6b7280'
                        }} />
                        <span style={{ fontWeight: '500', color: '#111827' }}>{alert.message}</span>
                      </div>
                      <span style={{ fontSize: '12px', color: '#6b7280' }}>{alert.since}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right Column - Activity Stream */}
        <div style={{
          background: 'white',
          borderRadius: '8px',
          padding: '24px',
          border: '1px solid #e5e7eb',
          height: 'fit-content',
          position: 'sticky',
          top: '20px'
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
            Live Activity
          </h3>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', maxHeight: '600px', overflowY: 'auto' }}>
            {mockBrokerData.recentActivity.map((activity) => (
              <div key={activity.id} style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: '12px',
                padding: '12px',
                borderRadius: '6px',
                background: '#f9fafb',
                border: '1px solid #e5e7eb'
              }}>
                <div style={{ 
                  width: '32px', 
                  height: '32px', 
                  background: '#f3f4f6', 
                  borderRadius: '6px', 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center', 
                  fontSize: '14px',
                  flexShrink: 0
                }}>
                  {getActivityIcon(activity.type)}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: '500', fontSize: '14px', color: '#111827', marginBottom: '4px' }}>
                    {activity.type === 'connect' && 'Client connected'}
                    {activity.type === 'disconnect' && 'Client disconnected'}
                    {activity.type === 'publish' && 'Message published'}
                    {activity.type === 'subscribe' && 'Topic subscribed'}
                  </div>
                  <div style={{ fontSize: '13px', color: '#6b7280', marginBottom: '6px' }}>
                    <span style={{ fontFamily: 'monospace', background: '#ffffff', padding: '2px 6px', borderRadius: '4px', border: '1px solid #e5e7eb' }}>
                      {activity.client}
                    </span>
                    {'topic' in activity && (
                      <>
                        <span style={{ margin: '0 6px', color: '#9ca3af' }}>→</span>
                        <span style={{ fontFamily: 'monospace', background: '#ffffff', padding: '2px 6px', borderRadius: '4px', border: '1px solid #e5e7eb' }}>
                          {activity.topic}
                        </span>
                      </>
                    )}
                  </div>
                  <div style={{ fontSize: '12px', color: '#9ca3af' }}>
                    {formatTimeAgo(activity.timestamp)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div style={{
        background: 'white',
        borderRadius: '8px',
        padding: '24px',
        border: '1px solid #e5e7eb',
        marginBottom: '32px'
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