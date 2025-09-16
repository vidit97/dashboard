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


      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
        {/* Messages Sent */}
        <div style={{
          padding: '20px',
          background: '#f9fafb',
          borderRadius: '12px',
          border: '1px solid #e5e7eb',
          textAlign: 'center'
        }}>
          <div style={{ fontSize: '24px', fontWeight: '700', color: '#111827', marginBottom: '8px' }}>
            {rollupLoading ? '--' : rollupData ? formatLargeNumber(rollupData.msgs_sent_total_24h) : '--'}
          </div>
          <div style={{ fontSize: '14px', color: '#6b7280', fontWeight: '500' }}>
            24h Messages Sent
          </div>
        </div>

        {/* Messages Received */}
        <div style={{
          padding: '20px',
          background: '#f9fafb',
          borderRadius: '12px',
          border: '1px solid #e5e7eb',
          textAlign: 'center'
        }}>
          <div style={{ fontSize: '24px', fontWeight: '700', color: '#111827', marginBottom: '8px' }}>
            {rollupLoading ? '--' : rollupData ? formatLargeNumber(rollupData.msgs_received_total_24h) : '--'}
          </div>
          <div style={{ fontSize: '14px', color: '#6b7280', fontWeight: '500' }}>
            24h Messages Received
          </div>
        </div>

        {/* Bytes Sent */}
        <div style={{
          padding: '20px',
          background: '#f9fafb',
          borderRadius: '12px',
          border: '1px solid #e5e7eb',
          textAlign: 'center'
        }}>
          <div style={{ fontSize: '24px', fontWeight: '700', color: '#111827', marginBottom: '8px' }}>
            {rollupLoading ? '--' : rollupData ? formatMetric(rollupData.bytes_sent_total_24h, 'bytes') : '--'}
          </div>
          <div style={{ fontSize: '14px', color: '#6b7280', fontWeight: '500' }}>
            24h Data Sent
          </div>
        </div>

        {/* Bytes Received */}
        <div style={{
          padding: '20px',
          background: '#f9fafb',
          borderRadius: '12px',
          border: '1px solid #e5e7eb',
          textAlign: 'center'
        }}>
          <div style={{ fontSize: '24px', fontWeight: '700', color: '#111827', marginBottom: '8px' }}>
            {rollupLoading ? '--' : rollupData ? formatMetric(rollupData.bytes_received_total_24h, 'bytes') : '--'}
          </div>
          <div style={{ fontSize: '14px', color: '#6b7280', fontWeight: '500' }}>
            24h Data Received
          </div>
        </div>
      </div>
    </>
  )
}
