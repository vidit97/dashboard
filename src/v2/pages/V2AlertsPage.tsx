import React, { useState } from 'react'

interface Alert {
  id: number
  rule: string
  severity: 'critical' | 'warning' | 'info'
  since: string
  description: string
  status: 'active' | 'acknowledged' | 'resolved'
}

interface V2AlertsPageProps {
  globalState: any
  updateState: (updates: any) => void
}

export const V2AlertsPage: React.FC<V2AlertsPageProps> = ({ globalState, updateState }) => {
  const [severityFilter, setSeverityFilter] = useState<string>('all')
  const [statusFilter, setStatusFilter] = useState<string>('active')

  const mockAlerts: Alert[] = [
    {
      id: 1,
      rule: 'High Message Drop Rate',
      severity: 'critical',
      since: '2024-01-15T09:45:00Z',
      description: 'Message drop rate exceeded 5% threshold for 10 minutes',
      status: 'active'
    },
    {
      id: 2,
      rule: 'Client Connection Threshold',
      severity: 'warning',
      since: '2024-01-15T10:15:00Z',
      description: 'Connected clients approaching maximum limit (450/500)',
      status: 'acknowledged'
    },
    {
      id: 3,
      rule: 'Disk Space Low',
      severity: 'warning',
      since: '2024-01-15T08:30:00Z',
      description: 'Available disk space below 20% on broker storage',
      status: 'active'
    }
  ]

  const filteredAlerts = mockAlerts.filter(alert => {
    if (severityFilter !== 'all' && alert.severity !== severityFilter) return false
    if (statusFilter !== 'all' && alert.status !== statusFilter) return false
    return true
  })

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return '#ef4444'
      case 'warning': return '#f59e0b'
      case 'info': return '#3b82f6'
      default: return '#6b7280'
    }
  }

  const getSeverityBgColor = (severity: string) => {
    switch (severity) {
      case 'critical': return '#fee2e2'
      case 'warning': return '#fef3c7'
      case 'info': return '#dbeafe'
      default: return '#f3f4f6'
    }
  }

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
          Alerts & Health
        </h1>
        <p style={{
          fontSize: '16px',
          color: '#6b7280',
          margin: 0
        }}>
          Active problems and system health monitoring for {globalState.broker || 'Local'} broker
        </p>
      </div>

      {/* Status Tiles */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: '16px'
      }}>
        <div style={{
          background: 'white',
          padding: '20px',
          borderRadius: '12px',
          border: '1px solid #e5e7eb',
          textAlign: 'center'
        }}>
          <div style={{ fontSize: '24px', fontWeight: '700', color: '#ef4444' }}>
            {filteredAlerts.filter(a => a.severity === 'critical').length}
          </div>
          <div style={{ fontSize: '14px', color: '#6b7280', marginTop: '4px' }}>Critical Alerts</div>
        </div>
        <div style={{
          background: 'white',
          padding: '20px',
          borderRadius: '12px',
          border: '1px solid #e5e7eb',
          textAlign: 'center'
        }}>
          <div style={{ fontSize: '24px', fontWeight: '700', color: '#f59e0b' }}>
            {filteredAlerts.filter(a => a.severity === 'warning').length}
          </div>
          <div style={{ fontSize: '14px', color: '#6b7280', marginTop: '4px' }}>Warning Alerts</div>
        </div>
        <div style={{
          background: 'white',
          padding: '20px',
          borderRadius: '12px',
          border: '1px solid #e5e7eb',
          textAlign: 'center'
        }}>
          <div style={{ fontSize: '24px', fontWeight: '700', color: '#10b981' }}>2m ago</div>
          <div style={{ fontSize: '14px', color: '#6b7280', marginTop: '4px' }}>Last Rule Eval</div>
        </div>
        <div style={{
          background: 'white',
          padding: '20px',
          borderRadius: '12px',
          border: '1px solid #e5e7eb',
          textAlign: 'center'
        }}>
          <div style={{ fontSize: '24px', fontWeight: '700', color: '#10b981' }}>✓</div>
          <div style={{ fontSize: '14px', color: '#6b7280', marginTop: '4px' }}>Scrape OK</div>
        </div>
      </div>

      {/* Charts Row */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))',
        gap: '24px'
      }}>
        <div style={{
          background: 'white',
          borderRadius: '12px',
          padding: '24px',
          border: '1px solid #e5e7eb'
        }}>
          <h3 style={{ margin: '0 0 16px 0', fontSize: '18px', fontWeight: '600' }}>
            Drops/Min
          </h3>
          <div style={{
            height: '200px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: '#f9fafb',
            borderRadius: '8px',
            color: '#6b7280'
          }}>
            Drops per minute chart
          </div>
        </div>

        <div style={{
          background: 'white',
          borderRadius: '12px',
          padding: '24px',
          border: '1px solid #e5e7eb'
        }}>
          <h3 style={{ margin: '0 0 16px 0', fontSize: '18px', fontWeight: '600' }}>
            Exporter Status
          </h3>
          <div style={{
            height: '200px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: '#f9fafb',
            borderRadius: '8px',
            color: '#6b7280'
          }}>
            Exporter up() status chart
          </div>
        </div>
      </div>

      {/* Alerts Table */}
      <div style={{
        background: 'white',
        borderRadius: '12px',
        border: '1px solid #e5e7eb',
        overflow: 'hidden',
        flex: 1,
        display: 'flex',
        flexDirection: 'column'
      }}>
        <div style={{ padding: '20px', borderBottom: '1px solid #e5e7eb' }}>
          <h2 style={{ margin: 0, fontSize: '20px', fontWeight: '600' }}>
            Active Alerts
          </h2>
        </div>

        <div style={{
          padding: '16px 20px',
          background: '#f8fafc',
          borderBottom: '1px solid #e5e7eb',
          display: 'flex',
          gap: '16px',
          alignItems: 'center',
          flexWrap: 'wrap'
        }}>
          <select
            value={severityFilter}
            onChange={(e) => setSeverityFilter(e.target.value)}
            style={{
              padding: '8px 16px',
              border: '1px solid #d1d5db',
              borderRadius: '6px',
              fontSize: '14px'
            }}
          >
            <option value="all">All Severities</option>
            <option value="critical">Critical</option>
            <option value="warning">Warning</option>
            <option value="info">Info</option>
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            style={{
              padding: '8px 16px',
              border: '1px solid #d1d5db',
              borderRadius: '6px',
              fontSize: '14px'
            }}
          >
            <option value="all">All Status</option>
            <option value="active">Active</option>
            <option value="acknowledged">Acknowledged</option>
            <option value="resolved">Resolved</option>
          </select>

          <div style={{ fontSize: '14px', color: '#6b7280' }}>
            {filteredAlerts.length} alert{filteredAlerts.length !== 1 ? 's' : ''}
          </div>
        </div>

        <div style={{ flex: 1, overflowY: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead style={{ position: 'sticky', top: 0, background: '#f8fafc', zIndex: 1 }}>
              <tr>
                <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: '600', textTransform: 'uppercase', color: '#6b7280' }}>Severity</th>
                <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: '600', textTransform: 'uppercase', color: '#6b7280' }}>Rule</th>
                <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: '600', textTransform: 'uppercase', color: '#6b7280' }}>Description</th>
                <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: '600', textTransform: 'uppercase', color: '#6b7280' }}>Since</th>
                <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: '600', textTransform: 'uppercase', color: '#6b7280' }}>Status</th>
                <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: '600', textTransform: 'uppercase', color: '#6b7280' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredAlerts.map((alert) => (
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
                    {new Date(alert.since).toLocaleString()}
                  </td>
                  <td style={{ padding: '16px' }}>
                    <span style={{
                      padding: '4px 8px',
                      borderRadius: '12px',
                      fontSize: '12px',
                      fontWeight: '500',
                      background: alert.status === 'active' ? '#fee2e2' : alert.status === 'acknowledged' ? '#fef3c7' : '#d1fae5',
                      color: alert.status === 'active' ? '#991b1b' : alert.status === 'acknowledged' ? '#92400e' : '#065f46'
                    }}>
                      {alert.status}
                    </span>
                  </td>
                  <td style={{ padding: '16px' }}>
                    <div style={{ display: 'flex', gap: '4px' }}>
                      {alert.status === 'active' && (
                        <button style={{
                          padding: '4px 8px',
                          background: '#f59e0b',
                          color: 'white',
                          border: 'none',
                          borderRadius: '4px',
                          fontSize: '12px',
                          cursor: 'pointer'
                        }}>
                          Acknowledge
                        </button>
                      )}
                      <button style={{
                        padding: '4px 8px',
                        background: '#6b7280',
                        color: 'white',
                        border: 'none',
                        borderRadius: '4px',
                        fontSize: '12px',
                        cursor: 'pointer'
                      }}>
                        Details
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Recent Rule Changes */}
      <div style={{
        background: 'white',
        borderRadius: '12px',
        border: '1px solid #e5e7eb',
        overflow: 'hidden'
      }}>
        <div style={{ padding: '20px', borderBottom: '1px solid #e5e7eb' }}>
          <h2 style={{ margin: 0, fontSize: '20px', fontWeight: '600' }}>
            Recent Rule Changes
          </h2>
        </div>

        <div style={{
          height: '200px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#f9fafb',
          color: '#6b7280'
        }}>
          Recent alert rule modifications and updates
        </div>
      </div>
    </div>
  )
}