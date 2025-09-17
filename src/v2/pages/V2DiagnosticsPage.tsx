import React, { useState, useEffect } from 'react'
import { useGlobalState } from '../hooks/useGlobalState'
import { healthApiService, HealthData, getMetricStatus, formatMetricValue, getMetricDescription } from '../../services/healthApi'

interface HealthMetric {
  key: keyof HealthData
  label: string
  value: number
  status: 'ok' | 'warning' | 'error'
  formattedValue: string
  description: string
}

export const V2DiagnosticsPage: React.FC = () => {
  const { state } = useGlobalState()
  const [healthData, setHealthData] = useState<HealthData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [lastUpdated, setLastUpdated] = useState<string>('')

  const fetchHealthData = async () => {
    try {
      setLoading(true)
      setError(null)
      const data = await healthApiService.getHealthData('watchmqtt')
      setHealthData(data)
      setLastUpdated(new Date().toLocaleString())
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch health data')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchHealthData()
    
    // Auto-refresh every 30 seconds
    const interval = setInterval(fetchHealthData, 30000)
    return () => clearInterval(interval)
  }, [])

  const getOverallStatus = (metrics: HealthMetric[]): 'ok' | 'warning' | 'error' => {
    if (metrics.some(m => m.status === 'error')) return 'error'
    if (metrics.some(m => m.status === 'warning')) return 'warning'
    return 'ok'
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'ok': return '✅'
      case 'warning': return '⚠️'
      case 'error': return '❌'
      default: return '❓'
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ok': return '#10b981'
      case 'warning': return '#f59e0b'
      case 'error': return '#ef4444'
      default: return '#6b7280'
    }
  }

  if (loading) {
    return (
      <div style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px'
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>⏳</div>
          <div style={{ fontSize: '18px', color: '#6b7280' }}>Loading health data...</div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px'
      }}>
        <div style={{ textAlign: 'center', maxWidth: '500px' }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>❌</div>
          <div style={{ fontSize: '18px', color: '#ef4444', marginBottom: '12px' }}>
            Failed to load health data
          </div>
          <div style={{ fontSize: '14px', color: '#6b7280', marginBottom: '24px' }}>
            {error}
          </div>
          <button
            onClick={fetchHealthData}
            style={{
              padding: '8px 16px',
              background: '#3b82f6',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '14px'
            }}
          >
            Retry
          </button>
        </div>
      </div>
    )
  }

  if (!healthData) return null

  // Create metrics array for display
  const metrics: HealthMetric[] = [
    {
      key: 'pg_up',
      label: 'PostgreSQL',
      value: healthData.pg_up,
      status: getMetricStatus(healthData.pg_up, 'pg_up'),
      formattedValue: formatMetricValue(healthData.pg_up, 'pg_up'),
      description: getMetricDescription('pg_up')
    },
    {
      key: 'pg_exporter_last_scrape_success',
      label: 'PostgreSQL Exporter',
      value: healthData.pg_exporter_last_scrape_success,
      status: getMetricStatus(healthData.pg_exporter_last_scrape_success, 'pg_exporter_last_scrape_success'),
      formattedValue: formatMetricValue(healthData.pg_exporter_last_scrape_success, 'pg_exporter_last_scrape_success'),
      description: getMetricDescription('pg_exporter_last_scrape_success')
    },
    {
      key: 'prom_ready',
      label: 'Prometheus',
      value: healthData.prom_ready,
      status: getMetricStatus(healthData.prom_ready, 'prom_ready'),
      formattedValue: formatMetricValue(healthData.prom_ready, 'prom_ready'),
      description: getMetricDescription('prom_ready')
    },
    {
      key: 'prom_targets_up',
      label: 'Prometheus Targets',
      value: healthData.prom_targets_up,
      status: getMetricStatus(healthData.prom_targets_up, 'prom_targets_up'),
      formattedValue: `${healthData.prom_targets_up}/${healthData.prom_targets_total}`,
      description: getMetricDescription('prom_targets_up')
    },
    {
      key: 'watchmqtt_up_targets',
      label: 'WatchMQTT Targets',
      value: healthData.watchmqtt_up_targets,
      status: getMetricStatus(healthData.watchmqtt_up_targets, 'watchmqtt_up_targets'),
      formattedValue: healthData.watchmqtt_up_targets.toString(),
      description: getMetricDescription('watchmqtt_up_targets')
    }
  ]

  const performanceMetrics: HealthMetric[] = [
    {
      key: 'pg_exporter_last_scrape_duration_seconds',
      label: 'Scrape Duration',
      value: healthData.pg_exporter_last_scrape_duration_seconds,
      status: getMetricStatus(healthData.pg_exporter_last_scrape_duration_seconds, 'pg_exporter_last_scrape_duration_seconds'),
      formattedValue: formatMetricValue(healthData.pg_exporter_last_scrape_duration_seconds, 'pg_exporter_last_scrape_duration_seconds'),
      description: getMetricDescription('pg_exporter_last_scrape_duration_seconds')
    },
    {
      key: 'pg_locks_total',
      label: 'Database Locks',
      value: healthData.pg_locks_total,
      status: getMetricStatus(healthData.pg_locks_total, 'pg_locks_total'),
      formattedValue: healthData.pg_locks_total.toString(),
      description: getMetricDescription('pg_locks_total')
    },
    {
      key: 'pg_database_size_bytes',
      label: 'Database Size',
      value: healthData.pg_database_size_bytes,
      status: 'ok', // Size is informational
      formattedValue: formatMetricValue(healthData.pg_database_size_bytes, 'pg_database_size_bytes'),
      description: getMetricDescription('pg_database_size_bytes')
    }
  ]

  const overallStatus = getOverallStatus([...metrics, ...performanceMetrics])

  return (
    <div style={{
      width: '100%',
      height: '100%',
      display: 'flex',
      flexDirection: 'column',
      gap: '24px',
      padding: '24px'
    }}>
      {/* Page Header */}
      <div>
        <h1 style={{
          fontSize: '28px',
          fontWeight: '700',
          color: '#1f2937',
          margin: '0 0 8px 0'
        }}>
          Database Health
        </h1>
        <p style={{
          fontSize: '16px',
          color: '#6b7280',
          margin: 0
        }}>
          Real-time health monitoring for {healthData.datname} database and related services
        </p>
      </div>

      {/* Overall Status Card */}
      <div style={{
        background: 'white',
        borderRadius: '12px',
        border: '1px solid #e5e7eb',
        padding: '24px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '16px' }}>
          <div style={{ fontSize: '32px' }}>{getStatusIcon(overallStatus)}</div>
          <div>
            <h2 style={{ 
              margin: 0, 
              fontSize: '24px', 
              fontWeight: '700',
              color: getStatusColor(overallStatus)
            }}>
              {overallStatus === 'ok' ? 'All Systems Operational' : 
               overallStatus === 'warning' ? 'Some Issues Detected' : 
               'Critical Issues Detected'}
            </h2>
            <p style={{ margin: '4px 0 0 0', fontSize: '14px', color: '#6b7280' }}>
              Last updated: {lastUpdated}
            </p>
          </div>
          <div style={{ marginLeft: 'auto' }}>
            <button
              onClick={fetchHealthData}
              disabled={loading}
              style={{
                padding: '8px 16px',
                background: '#3b82f6',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                cursor: loading ? 'not-allowed' : 'pointer',
                fontSize: '14px',
                opacity: loading ? 0.6 : 1
              }}
            >
              {loading ? 'Refreshing...' : 'Refresh'}
            </button>
          </div>
        </div>
      </div>

      {/* Service Status */}
      <div style={{
        background: 'white',
        borderRadius: '12px',
        border: '1px solid #e5e7eb',
        overflow: 'hidden'
      }}>
        <div style={{ padding: '20px', borderBottom: '1px solid #e5e7eb' }}>
          <h2 style={{ margin: 0, fontSize: '20px', fontWeight: '600' }}>
            Service Status
          </h2>
        </div>

        <div style={{ padding: '20px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '16px' }}>
            {metrics.map((metric) => (
              <div
                key={metric.key}
                style={{
                  border: '1px solid #e5e7eb',
                  borderRadius: '8px',
                  padding: '16px',
                  background: '#f8fafc'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '16px' }}>{getStatusIcon(metric.status)}</span>
                    <span style={{ fontWeight: '600', color: '#1f2937' }}>{metric.label}</span>
                  </div>
                  <span style={{ 
                    fontWeight: '700', 
                    color: getStatusColor(metric.status),
                    fontSize: '14px'
                  }}>
                    {metric.formattedValue}
                  </span>
                </div>
                <div style={{ fontSize: '12px', color: '#6b7280' }}>
                  {metric.description}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Performance Metrics */}
      <div style={{
        background: 'white',
        borderRadius: '12px',
        border: '1px solid #e5e7eb',
        overflow: 'hidden'
      }}>
        <div style={{ padding: '20px', borderBottom: '1px solid #e5e7eb' }}>
          <h2 style={{ margin: 0, fontSize: '20px', fontWeight: '600' }}>
            Performance Metrics
          </h2>
        </div>

        <div style={{ padding: '20px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '16px' }}>
            {performanceMetrics.map((metric) => (
              <div
                key={metric.key}
                style={{
                  border: '1px solid #e5e7eb',
                  borderRadius: '8px',
                  padding: '16px',
                  background: '#f8fafc'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '16px' }}>{getStatusIcon(metric.status)}</span>
                    <span style={{ fontWeight: '600', color: '#1f2937' }}>{metric.label}</span>
                  </div>
                  <span style={{ 
                    fontWeight: '700', 
                    color: getStatusColor(metric.status),
                    fontSize: '14px'
                  }}>
                    {metric.formattedValue}
                  </span>
                </div>
                <div style={{ fontSize: '12px', color: '#6b7280' }}>
                  {metric.description}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}