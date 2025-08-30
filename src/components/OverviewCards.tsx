import React from 'react'
import { MetricCard } from '../ui/StatCards'
import { OverviewData } from '../config/api'
import { formatUptime, formatMetric } from '../services/api'

interface OverviewCardsProps {
  overview: OverviewData | null
  loading: boolean
}

export function OverviewCards({ overview, loading }: OverviewCardsProps) {
  const getConnectionStatus = () => {
    if (!overview) return { status: 'Unknown', color: '#6b7280' }
    
    // Debug logging
    console.log('Overview data for status calculation:', overview)
    
    // If we have connected clients, show healthy status
    // Based on the API response: connected: 4, disconnected: 0
    if (overview.connected > 0 && overview.disconnected === 0) {
      return { status: 'Healthy', color: '#059669' }
    }
    
    const total = overview.connected + overview.disconnected
    if (total === 0) return { status: 'No Clients', color: '#6b7280' }
    
    const connectedRatio = overview.connected / total
    console.log(`Connected: ${overview.connected}, Disconnected: ${overview.disconnected}, Ratio: ${connectedRatio}`)
    
    if (connectedRatio >= 0.9) return { status: 'Healthy', color: '#059669' }
    if (connectedRatio >= 0.7) return { status: 'Warning', color: '#d97706' }
    return { status: 'Critical', color: '#dc2626' }
  }

  const connectionStatus = getConnectionStatus()

  return (
    <div className="overview-cards">
      <MetricCard
        label="Connection Status"
        value={connectionStatus.status}
        color={connectionStatus.color}
        loading={loading}
      />
      
      <MetricCard
        label="Connected Clients"
        value={overview?.connected || 0}
        loading={loading}
        color="#3b82f6"
      />
      
      <MetricCard
        label="Active Clients"
        value={overview?.active || 0}
        loading={loading}
        color="#059669"
      />
      
      <MetricCard
        label="Subscriptions"
        value={overview?.subscriptions || 0}
        loading={loading}
        color="#7c3aed"
      />
      
      <MetricCard
        label="Retained Messages"
        value={overview?.retained || 0}
        loading={loading}
        color="#dc2626"
      />
      
      <MetricCard
        label="Messages/sec"
        value={overview?.messages_sent_per_sec_1m ? formatMetric(overview.messages_sent_per_sec_1m, 'rate') : '0'}
        loading={loading}
        color="#f59e0b"
      />
      
      <MetricCard
        label="Bytes/sec"
        value={overview?.bytes_sent_per_sec_1m ? formatMetric(overview.bytes_sent_per_sec_1m, 'bytes') + '/s' : '0'}
        loading={loading}
        color="#06b6d4"
      />
      
      <MetricCard
        label="Uptime"
        value={overview ? formatUptime(overview.uptime_seconds) : '0s'}
        loading={loading}
        color="#84cc16"
      />
    </div>
  )
}
