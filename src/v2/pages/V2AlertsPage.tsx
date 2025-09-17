import React, { useState, useEffect } from 'react'
import { useGlobalState } from '../hooks/useGlobalState'
import { ApiTable } from '../../components/ApiTable'
import { healthApiService, HealthData, getMetricStatus, formatMetricValue, getMetricDescription } from '../../services/healthApi'

interface HealthMetric {
  key: keyof HealthData
  label: string
  value: number
  status: 'ok' | 'warning' | 'error'
  formattedValue: string
  description: string
}

export const V2AlertsPage: React.FC = () => {
  const { state } = useGlobalState()

  // DB Health state
  const [healthData, setHealthData] = useState<HealthData | null>(null)
  const [healthLoading, setHealthLoading] = useState(true)
  const [healthError, setHealthError] = useState<string | null>(null)
  const [lastUpdated, setLastUpdated] = useState<string>('')

  const fetchHealthData = async () => {
    try {
      setHealthLoading(true)
      setHealthError(null)
      const data = await healthApiService.getHealthData('watchmqtt')
      setHealthData(data)
      setLastUpdated(new Date().toLocaleString())
    } catch (err) {
      setHealthError(err instanceof Error ? err.message : 'Failed to fetch health data')
    } finally {
      setHealthLoading(false)
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

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical':
      case 'error': return '#ef4444'
      case 'warning': return '#f59e0b'
      case 'info':
      case 'ok': return '#10b981'
      default: return '#6b7280'
    }
  }

  const getSeverityBgColor = (severity: string) => {
    switch (severity) {
      case 'critical':
      case 'error': return '#fee2e2'
      case 'warning': return '#fef3c7'
      case 'info':
      case 'ok': return '#dcfce7'
      default: return '#f3f4f6'
    }
  }

  // Create health metrics
  let healthMetrics: HealthMetric[] = []
  let healthAlerts: any[] = []

  if (healthData) {
    healthMetrics = [
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
      },
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

    // Convert health issues to alert format
    healthAlerts = healthMetrics
      .filter(metric => metric.status !== 'ok')
      .map((metric, index) => ({
        id: `health_${index}`,
        rule: `${metric.label} Health Check`,
        severity: metric.status === 'error' ? 'critical' : 'warning',
        since: lastUpdated,
        description: `${metric.description} (Current: ${metric.formattedValue})`,
        status: 'active'
      }))
  }

  const overallStatus = healthData ? getOverallStatus(healthMetrics) : 'warning'
  const healthAlertsCount = healthAlerts.length

  return (
    <div style={{
      width: '100%',
      padding: '24px',
      gap: '24px',
      display: 'flex',
      flexDirection: 'column'
    }}>
      {/* Page Header */}
      <div>
        <h1 style={{
          fontSize: '32px',
          fontWeight: '700',
          color: '#1f2937',
          margin: '0 0 8px 0'
        }}>
          Alerts & Health
        </h1>
        <p style={{
          fontSize: '16px',
          color: '#6b7280',
          margin: 0
        }}>
          System health monitoring and MQTT will messages for {state.broker || 'Local'} broker
        </p>
      </div>

      {/* DB Health Status Tiles */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
        gap: '16px'
      }}>
        <div style={{
          background: 'white',
          padding: '20px',
          borderRadius: '12px',
          border: '1px solid #e5e7eb',
          textAlign: 'center'
        }}>
          <div style={{ fontSize: '24px', fontWeight: '700', color: getSeverityColor(overallStatus === 'error' ? 'critical' : overallStatus) }}>
            {healthAlertsCount}
          </div>
          <div style={{ fontSize: '14px', color: '#6b7280', marginTop: '4px' }}>Health Issues</div>
        </div>

        <div style={{
          background: 'white',
          padding: '20px',
          borderRadius: '12px',
          border: '1px solid #e5e7eb',
          textAlign: 'center'
        }}>
          <div style={{ fontSize: '24px', fontWeight: '700', color: getSeverityColor(overallStatus) }}>
            {overallStatus === 'ok' ? '✓' : overallStatus === 'warning' ? '⚠️' : '❌'}
          </div>
          <div style={{ fontSize: '14px', color: '#6b7280', marginTop: '4px' }}>Overall Status</div>
        </div>

        <div style={{
          background: 'white',
          padding: '20px',
          borderRadius: '12px',
          border: '1px solid #e5e7eb',
          textAlign: 'center'
        }}>
          <div style={{ fontSize: '24px', fontWeight: '700', color: '#10b981' }}>
            {healthData ? `${healthData.prom_targets_up}/${healthData.prom_targets_total}` : '0/0'}
          </div>
          <div style={{ fontSize: '14px', color: '#6b7280', marginTop: '4px' }}>Prom Targets</div>
        </div>

        <div style={{
          background: 'white',
          padding: '20px',
          borderRadius: '12px',
          border: '1px solid #e5e7eb',
          textAlign: 'center'
        }}>
          <div style={{ fontSize: '24px', fontWeight: '700', color: '#3b82f6' }}>
            {healthData ? healthData.watchmqtt_up_targets : 0}
          </div>
          <div style={{ fontSize: '14px', color: '#6b7280', marginTop: '4px' }}>MQTT Targets</div>
        </div>

        <div style={{
          background: 'white',
          padding: '20px',
          borderRadius: '12px',
          border: '1px solid #e5e7eb',
          textAlign: 'center'
        }}>
          <div style={{ fontSize: '20px', fontWeight: '700', color: '#6b7280' }}>
            {healthData ? (healthData.pg_database_size_bytes / (1024 * 1024 * 1024)).toFixed(1) : '0'} GB
          </div>
          <div style={{ fontSize: '14px', color: '#6b7280', marginTop: '4px' }}>DB Size</div>
        </div>

        <div style={{
          background: 'white',
          padding: '20px',
          borderRadius: '12px',
          border: '1px solid #e5e7eb',
          textAlign: 'center'
        }}>
          <div style={{ fontSize: '24px', fontWeight: '700', color: healthData && healthData.pg_locks_total > 10 ? '#f59e0b' : '#10b981' }}>
            {healthData ? healthData.pg_locks_total : 0}
          </div>
          <div style={{ fontSize: '14px', color: '#6b7280', marginTop: '4px' }}>DB Locks</div>
        </div>

        <div style={{
          background: 'white',
          padding: '20px',
          borderRadius: '12px',
          border: '1px solid #e5e7eb',
          textAlign: 'center'
        }}>
          <div style={{ fontSize: '20px', fontWeight: '700', color: healthData && healthData.pg_exporter_last_scrape_duration_seconds > 1 ? '#f59e0b' : '#10b981' }}>
            {healthData ? (healthData.pg_exporter_last_scrape_duration_seconds * 1000).toFixed(0) : 0}ms
          </div>
          <div style={{ fontSize: '14px', color: '#6b7280', marginTop: '4px' }}>Scrape Time</div>
        </div>

        <div style={{
          background: 'white',
          padding: '20px',
          borderRadius: '12px',
          border: '1px solid #e5e7eb',
          textAlign: 'center'
        }}>
          <div style={{ fontSize: '24px', fontWeight: '700', color: '#10b981' }}>
            {lastUpdated ? '✓' : '⏳'}
          </div>
          <div style={{ fontSize: '14px', color: '#6b7280', marginTop: '4px' }}>
            {lastUpdated ? 'Data Fresh' : 'Loading...'}
          </div>
        </div>
      </div>

      {/* DB Health Alerts Table */}
      {healthData && healthAlerts.length > 0 && (
        <div style={{
          background: 'white',
          borderRadius: '12px',
          border: '1px solid #e5e7eb',
          overflow: 'hidden'
        }}>
          <div style={{ padding: '20px', borderBottom: '1px solid #e5e7eb' }}>
            <h2 style={{ margin: 0, fontSize: '20px', fontWeight: '600' }}>
              Database Health Alerts
            </h2>
          </div>

          <div style={{ overflowY: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead style={{ position: 'sticky', top: 0, background: '#f8fafc', zIndex: 1 }}>
                <tr>
                  <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: '600', textTransform: 'uppercase', color: '#6b7280' }}>Severity</th>
                  <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: '600', textTransform: 'uppercase', color: '#6b7280' }}>Service</th>
                  <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: '600', textTransform: 'uppercase', color: '#6b7280' }}>Description</th>
                  <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: '600', textTransform: 'uppercase', color: '#6b7280' }}>Since</th>
                  <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: '600', textTransform: 'uppercase', color: '#6b7280' }}>Status</th>
                  <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: '600', textTransform: 'uppercase', color: '#6b7280' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {healthAlerts.map((alert) => (
                  <tr
                    key={alert.id}
                    style={{ borderBottom: '1px solid #f1f5f9' }}
                  >
                    <td style={{ padding: '16px' }}>
                      <span style={{
                        padding: '4px 8px',
                        borderRadius: '12px',
                        fontSize: '12px',
                        fontWeight: '600',
                        background: getSeverityBgColor(alert.severity),
                        color: getSeverityColor(alert.severity),
                        textTransform: 'uppercase'
                      }}>
                        {alert.severity}
                      </span>
                    </td>
                    <td style={{ padding: '16px', fontWeight: '500', color: '#1f2937' }}>
                      {alert.rule}
                    </td>
                    <td style={{ padding: '16px', color: '#6b7280', fontSize: '14px', maxWidth: '300px' }}>
                      {alert.description}
                    </td>
                    <td style={{ padding: '16px', color: '#6b7280', fontSize: '14px' }}>
                      {alert.since}
                    </td>
                    <td style={{ padding: '16px' }}>
                      <span style={{
                        padding: '4px 8px',
                        borderRadius: '12px',
                        fontSize: '12px',
                        fontWeight: '500',
                        background: '#fee2e2',
                        color: '#991b1b'
                      }}>
                        {alert.status}
                      </span>
                    </td>
                    <td style={{ padding: '16px' }}>
                      <div style={{ display: 'flex', gap: '4px' }}>
                        <button
                          onClick={fetchHealthData}
                          style={{
                            padding: '4px 8px',
                            background: '#3b82f6',
                            color: 'white',
                            border: 'none',
                            borderRadius: '4px',
                            fontSize: '12px',
                            cursor: 'pointer'
                          }}
                        >
                          Refresh
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}


      {/* Will Messages Table */}
      <div style={{
        background: 'white',
        borderRadius: '12px',
        border: '1px solid #e5e7eb',
        overflow: 'hidden'
      }}>
        <div style={{ padding: '20px', borderBottom: '1px solid #e5e7eb' }}>
          <h2 style={{ margin: 0, fontSize: '20px', fontWeight: '600' }}>
            Will Messages
          </h2>
          <p style={{ margin: '4px 0 0 0', fontSize: '14px', color: '#6b7280' }}>
            Last will and testament messages from disconnected MQTT clients
          </p>
        </div>
        <div className="api-table-content">
          <ApiTable apiType="wills" />
        </div>
      </div>
    </div>
  )
}