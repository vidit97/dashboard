import React, { useEffect, useState, useCallback } from 'react'
import { MetricCard } from '../ui/StatCards'
import { watchMQTTService, formatMetric } from '../services/api'
import { Rollups24hData } from '../config/api'

interface SummaryCardsProps {
  loading: boolean
  broker: string
}

export function SummaryCards({ loading, broker }: SummaryCardsProps) {
  const [rollupData, setRollupData] = useState<Rollups24hData | null>(null)
  const [rollupLoading, setRollupLoading] = useState(false)
  const [rollupError, setRollupError] = useState<string | null>(null)
  const [lastFetched, setLastFetched] = useState<Date | null>(null)

  const fetchRollupData = useCallback(async () => {
    try {
      setRollupLoading(true)
      setRollupError(null)
      console.log('Fetching 24h rollup data for broker:', broker)
      const data = await watchMQTTService.getRollups24h(broker)
      console.log('24h rollup API response:', data)
      setRollupData(data)
      setLastFetched(new Date())
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to fetch 24h rollup data'
      setRollupError(errorMsg)
      console.error('Error fetching 24h rollup data:', err)
    } finally {
      setRollupLoading(false)
    }
  }, [broker])

  // Fetch rollup data on component mount and when broker changes
  useEffect(() => {
    fetchRollupData()
    
    // Auto-refresh every 5 minutes for 24h summary data
    const interval = setInterval(fetchRollupData, 5 * 60 * 1000)
    return () => clearInterval(interval)
  }, [fetchRollupData])

  const formatLargeNumber = (value: number | undefined): string => {
    if (!value || value === 0) return '0'
    
    if (value >= 1000000000) return `${(value / 1000000000).toFixed(1)}B`
    if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`
    if (value >= 1000) return `${(value / 1000).toFixed(1)}K`
    return Math.round(value).toString()
  }

  return (
    <>
      {rollupError && (
        <div style={{ 
          background: '#fef2f2', 
          color: '#dc2626', 
          padding: '12px', 
          borderRadius: '8px', 
          marginBottom: '16px',
          border: '1px solid #fecaca'
        }}>
          24h Summary Error: {rollupError}
        </div>
      )}

      {lastFetched && (
        <div style={{ 
          textAlign: 'center', 
          marginBottom: '16px', 
          color: '#6b7280', 
          fontSize: '14px' 
        }}>
          24h Summary last fetched: {lastFetched.toLocaleString()}
        </div>
      )}

      <div className="summary-cards">
        <MetricCard
          label="24h Messages Sent"
          value={rollupData ? formatLargeNumber(rollupData.msgs_sent_total_24h) : 'Loading...'}
          loading={rollupLoading}
          color="#3b82f6"
        />
        
        <MetricCard
          label="24h Messages Received"
          value={rollupData ? formatLargeNumber(rollupData.msgs_received_total_24h) : 'Loading...'}
          loading={rollupLoading}
          color="#059669"
        />
        
        <MetricCard
          label="24h Bytes Sent"
          value={rollupData ? formatMetric(rollupData.bytes_sent_total_24h, 'bytes') : 'Loading...'}
          loading={rollupLoading}
          color="#7c3aed"
        />
        
        <MetricCard
          label="24h Bytes Received"
          value={rollupData ? formatMetric(rollupData.bytes_received_total_24h, 'bytes') : 'Loading...'}
          loading={rollupLoading}
          color="#dc2626"
        />

        <MetricCard
          label="Avg Connections (24h)"
          value={rollupData ? rollupData.avg_connections_24h.toFixed(1) : 'Loading...'}
          loading={rollupLoading}
          color="#f59e0b"
        />
        
        <MetricCard
          label="Peak Connections (24h)"
          value={rollupData ? rollupData.peak_connections_24h.toString() : 'Loading...'}
          loading={rollupLoading}
          color="#06b6d4"
        />
      </div>
    </>
  )
}
