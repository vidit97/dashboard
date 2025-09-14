import React from 'react'
import { useGlobalState } from '../hooks/useGlobalState'
// Reusing existing GRE components
import SessionReliability from '../../components/SessionReliability'
import RecentSessions from '../../components/RecentSessions'
import RecentConnectDisconnects from '../../components/RecentConnectDisconnects'
import ClientGantt from '../../components/ClientGantt'

export const SessionsPage: React.FC = () => {
  const { state } = useGlobalState()

  return (
    <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
      {/* Page Header */}
      <div style={{ marginBottom: '32px' }}>
        <h1 style={{ 
          fontSize: '32px', 
          fontWeight: '700', 
          color: '#1f2937',
          margin: '0 0 8px 0'
        }}>
          Sessions
        </h1>
        <p style={{ 
          fontSize: '16px', 
          color: '#6b7280', 
          margin: 0 
        }}>
          Session lifecycle and IP/protocol intelligence
        </p>
      </div>

      {/* Session Starts/Stops Chart */}
      <div style={{ marginBottom: '32px' }}>
        <div style={{
          background: 'white',
          borderRadius: '12px',
          padding: '24px',
          border: '1px solid #e5e7eb',
          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)'
        }}>
          <h2 style={{ 
            margin: '0 0 16px 0', 
            fontSize: '20px', 
            fontWeight: '600',
            color: '#1f2937'
          }}>
            Session Starts/Stops Rate
          </h2>
          <RecentConnectDisconnects 
            className="chart-full-width"
            refreshInterval={state.refreshInterval}
          />
        </div>
      </div>

      {/* Top Row: Session Reliability + Recent Sessions */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(500px, 1fr))',
        gap: '24px',
        marginBottom: '32px'
      }}>
        <div style={{
          background: 'white',
          borderRadius: '12px',
          padding: '24px',
          border: '1px solid #e5e7eb',
          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)'
        }}>
          <SessionReliability 
            className="chart-half-width"
            refreshInterval={300}
          />
        </div>

        <div style={{
          background: 'white',
          borderRadius: '12px',
          padding: '24px',
          border: '1px solid #e5e7eb',
          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)'
        }}>
          <RecentSessions 
            className="chart-half-width"
            refreshInterval={60}
            limit={10}
          />
        </div>
      </div>

      {/* Sessions Table */}
      <div style={{ marginBottom: '32px' }}>
        <div style={{
          background: 'white',
          borderRadius: '12px',
          border: '1px solid #e5e7eb',
          overflow: 'hidden'
        }}>
          <div style={{ padding: '20px', borderBottom: '1px solid #e5e7eb' }}>
            <h2 style={{ margin: 0, fontSize: '20px', fontWeight: '600' }}>
              Session History
            </h2>
          </div>
          
          {/* Filters */}
          <div style={{
            padding: '16px 20px',
            background: '#f8fafc',
            borderBottom: '1px solid #e5e7eb',
            display: 'flex',
            gap: '16px',
            alignItems: 'center',
            flexWrap: 'wrap'
          }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px' }}>
              <input type="checkbox" defaultChecked />
              Open only
            </label>
            
            <input
              type="text"
              placeholder="IP prefix (e.g., 192.168.1)"
              style={{
                padding: '6px 12px',
                border: '1px solid #d1d5db',
                borderRadius: '6px',
                fontSize: '14px',
                minWidth: '200px'
              }}
            />
            
            <select style={{
              padding: '6px 12px',
              border: '1px solid #d1d5db',
              borderRadius: '6px',
              fontSize: '14px'
            }}>
              <option value="">All Protocol Versions</option>
              <option value="3.1">MQTT 3.1</option>
              <option value="3.1.1">MQTT 3.1.1</option>
              <option value="5.0">MQTT 5.0</option>
            </select>
          </div>
          
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#f8fafc' }}>
                  <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: '600', textTransform: 'uppercase', color: '#6b7280' }}>Start Time</th>
                  <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: '600', textTransform: 'uppercase', color: '#6b7280' }}>End Time</th>
                  <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: '600', textTransform: 'uppercase', color: '#6b7280' }}>Client</th>
                  <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: '600', textTransform: 'uppercase', color: '#6b7280' }}>Username</th>
                  <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: '600', textTransform: 'uppercase', color: '#6b7280' }}>IP:Port</th>
                  <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: '600', textTransform: 'uppercase', color: '#6b7280' }}>Protocol</th>
                  <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: '600', textTransform: 'uppercase', color: '#6b7280' }}>Clean Session</th>
                  <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: '600', textTransform: 'uppercase', color: '#6b7280' }}>Keepalive</th>
                  <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: '600', textTransform: 'uppercase', color: '#6b7280' }}>TLS</th>
                </tr>
              </thead>
              <tbody>
                {/* Mock data */}
                <tr style={{ borderBottom: '1px solid #f1f5f9' }}>
                  <td style={{ padding: '16px', color: '#1f2937' }}>2024-01-15 10:30:15</td>
                  <td style={{ padding: '16px', color: '#10b981', fontWeight: '500' }}>open</td>
                  <td style={{ padding: '16px', color: '#1f2937', fontWeight: '500' }}>sensor_001</td>
                  <td style={{ padding: '16px', color: '#6b7280' }}>iot_device</td>
                  <td style={{ padding: '16px', color: '#6b7280' }}>192.168.1.100:54321</td>
                  <td style={{ padding: '16px', color: '#6b7280' }}>MQTT 3.1.1</td>
                  <td style={{ padding: '16px', color: '#6b7280' }}>true</td>
                  <td style={{ padding: '16px', color: '#6b7280' }}>60s</td>
                  <td style={{ padding: '16px', color: '#6b7280' }}>TLS 1.2 / AES256</td>
                </tr>
                <tr style={{ borderBottom: '1px solid #f1f5f9' }}>
                  <td style={{ padding: '16px', color: '#1f2937' }}>2024-01-15 10:25:30</td>
                  <td style={{ padding: '16px', color: '#1f2937' }}>2024-01-15 10:28:45</td>
                  <td style={{ padding: '16px', color: '#1f2937', fontWeight: '500' }}>dashboard_client</td>
                  <td style={{ padding: '16px', color: '#6b7280' }}>admin</td>
                  <td style={{ padding: '16px', color: '#6b7280' }}>192.168.1.50:43210</td>
                  <td style={{ padding: '16px', color: '#6b7280' }}>MQTT 5.0</td>
                  <td style={{ padding: '16px', color: '#6b7280' }}>false</td>
                  <td style={{ padding: '16px', color: '#6b7280' }}>30s</td>
                  <td style={{ padding: '16px', color: '#6b7280' }}>TLS 1.3 / ChaCha20</td>
                </tr>
                <tr style={{ borderBottom: '1px solid #f1f5f9' }}>
                  <td style={{ padding: '16px', color: '#1f2937' }}>2024-01-15 10:20:00</td>
                  <td style={{ padding: '16px', color: '#1f2937' }}>2024-01-15 10:24:30</td>
                  <td style={{ padding: '16px', color: '#1f2937', fontWeight: '500' }}>mobile_app_xyz</td>
                  <td style={{ padding: '16px', color: '#6b7280' }}>user123</td>
                  <td style={{ padding: '16px', color: '#6b7280' }}>10.0.1.45:39842</td>
                  <td style={{ padding: '16px', color: '#6b7280' }}>MQTT 3.1.1</td>
                  <td style={{ padding: '16px', color: '#6b7280' }}>true</td>
                  <td style={{ padding: '16px', color: '#6b7280' }}>120s</td>
                  <td style={{ padding: '16px', color: '#6b7280' }}>None</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Client Timeline Gantt */}
      <div>
        <div style={{
          background: 'white',
          borderRadius: '12px',
          padding: '24px',
          border: '1px solid #e5e7eb',
          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)'
        }}>
          <ClientGantt 
            className="chart-full-width"
            refreshInterval={300}
          />
        </div>
      </div>
    </div>
  )
}