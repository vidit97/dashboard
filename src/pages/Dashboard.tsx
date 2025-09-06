import React, { useEffect, useState, useCallback } from 'react'
import { Header } from '../components/Header'
import { OverviewCards } from '../components/OverviewCards'
import { PlaceholderChart } from '../components/PlaceholderChart'
import { SummaryCards } from '../components/SummaryCards'
import TrafficChart from '../ui/TrafficChart'
import ConnectionsChart from '../ui/ConnectionsChart'
import StorageChart from '../ui/StorageChart'
import { watchMQTTService } from '../services/api'
import { OverviewData, API_CONFIG } from '../config/api'

export default function Dashboard() {
  const [overview, setOverview] = useState<OverviewData | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [selectedBroker, setSelectedBroker] = useState(API_CONFIG.DEFAULT_BROKER)
  const [refreshInterval, setRefreshInterval] = useState(API_CONFIG.REFRESH_INTERVALS.OVERVIEW / 1000)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)

  const fetchOverview = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      console.log('Fetching overview for broker:', selectedBroker)
      const data = await watchMQTTService.getOverview(selectedBroker)
      console.log('API Response:', data)
      setOverview(data)
      setLastUpdated(new Date())
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to fetch data'
      setError(errorMsg)
      console.error('Error fetching overview:', err)
    } finally {
      setLoading(false)
    }
  }, [selectedBroker])

  // Auto-refresh effect
  useEffect(() => {
    fetchOverview()
    const interval = setInterval(fetchOverview, refreshInterval * 1000)
    return () => clearInterval(interval)
  }, [fetchOverview, refreshInterval])

  const handleTestAPI = async () => {
    try {
      const response = await fetch('https://78e8ca98575f.ngrok-free.app/api/v1/overview?broker=local', {
        headers: { 'ngrok-skip-browser-warning': 'true' }
      })
      const data = await response.json()
      console.log('Direct fetch result:', data)
      alert(`Direct API test - Connected: ${data.connected}, Active: ${data.active}`)
    } catch (e) {
      console.error('Direct fetch failed:', e)
      alert('Direct API test failed: ' + e)
    }
  }

  return (
    <div className="container">
      {/* Header */}
      <Header
        selectedBroker={selectedBroker}
        onBrokerChange={setSelectedBroker}
        refreshInterval={refreshInterval}
        onRefreshIntervalChange={setRefreshInterval}
        loading={loading}
        onRefresh={fetchOverview}
        onTestAPI={handleTestAPI}
      />

      {/* Error Display */}
      {error && (
        <div style={{ 
          background: '#fef2f2', 
          color: '#dc2626', 
          padding: '12px', 
          borderRadius: '8px', 
          marginBottom: '24px',
          border: '1px solid #fecaca'
        }}>
          Error: {error}
        </div>
      )}

      {/* Overview KPI Cards */}
      <OverviewCards overview={overview} loading={loading} />

      {/* Charts in rows */}
      <div className="charts-row">
        <TrafficChart 
          broker={selectedBroker} 
          refreshInterval={Math.max(refreshInterval, 30)}
          autoRefresh={false}
        />
        <ConnectionsChart 
          broker={selectedBroker} 
          refreshInterval={Math.max(refreshInterval, 30)}
          autoRefresh={false}
        />
      </div>

      <div className="charts-row">
        <StorageChart 
          broker={selectedBroker} 
          refreshInterval={Math.max(refreshInterval, 30)}
          autoRefresh={false}
        />
        <div className="chart-section">
          <h2 className="chart-title">Performance</h2>
          <div className="chart-placeholder">
            Additional performance metrics
          </div>
        </div>
      </div>

      {/* 24h Summary Cards */}
      <SummaryCards loading={loading} broker={selectedBroker} />

      {/* Footer */}
      {lastUpdated && (
        <div style={{ 
          textAlign: 'center', 
          marginTop: '32px', 
          color: '#6b7280', 
          fontSize: '14px' 
        }}>
          Last updated: {lastUpdated.toLocaleString()}
        </div>
      )}
    </div>
  )
}
 