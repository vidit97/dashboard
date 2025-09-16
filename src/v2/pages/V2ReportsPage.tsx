import React, { useState } from 'react'
import { useGlobalState } from '../hooks/useGlobalState'

export const V2ReportsPage: React.FC = () => {
  const { state } = useGlobalState()
  const [activeReport, setActiveReport] = useState<'client' | 'security' | 'performance'>('client')
  const [filters, setFilters] = useState({
    startDate: '',
    endDate: '', 
    username: ''
  })

  // Mock data for demonstration
  const [reportData, setReportData] = useState({
    generalInfo: {
      clientId: 'CL123',
      username: 'john_doe',
      subjectDn: 'CN=John Doe',
      protocol: 'MQTT',
      version: '3.1.1',
      status: 'Connected',
      lastConnect: '2023-06-24 09:00 AM',
      lastDisconnect: '2023-06-24 05:00 PM',
      cleanSession: 'Yes',
      keepAlive: '60'
    },
    topicSubscriptions: [
      {
        clientId: 'CL123',
        topic: 'home/temperature/+',
        subscriptions: '3 topics'
      }
    ],
    publishedData: {
      clientId: 'CL123',
      monitoringDuration: '2 days 4 hours',
      packetsPublished: '3524',
      subscribedPacketsDelivered: '680',
      packetsDropped: '12',
      bytesPublished: '200000',
      bytesSubscribed: '197000'
    }
  })

  const reportTabs = [
    { id: 'client', label: 'Client Activity Reports', icon: '👤' },
    { id: 'security', label: 'Security Reports', icon: '🔒' },
    { id: 'performance', label: 'Performance Reports', icon: '📊' }
  ]

  const handleGenerate = () => {
    console.log('Generating report with filters:', filters)
    // TODO: Implement report generation logic
  }

  const handleReset = () => {
    setFilters({
      startDate: '',
      endDate: '',
      username: ''
    })
  }

  const handleFilterChange = (field: string, value: string) => {
    setFilters(prev => ({
      ...prev,
      [field]: value
    }))
  }

  return (
    <div>
      {/* Page Header */}
      <div style={{
        background: '#1f2937',
        borderRadius: '16px',
        padding: '32px',
        marginBottom: '32px',
        color: 'white'
      }}>
        <h1 style={{
          fontSize: '32px',
          fontWeight: '700',
          margin: '0 0 8px 0'
        }}>
          📊 Reports Dashboard
        </h1>
        <p style={{
          fontSize: '16px',
          color: '#d1d5db',
          margin: 0
        }}>
          Generate comprehensive reports for client activity, security, and performance analysis
        </p>
      </div>

      {/* Report Type Tabs */}
      <div style={{
        background: 'white',
        borderRadius: '12px',
        border: '1px solid #e5e7eb',
        marginBottom: '24px',
        overflow: 'hidden'
      }}>
        <div style={{
          display: 'flex',
          borderBottom: '1px solid #e5e7eb'
        }}>
          {reportTabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveReport(tab.id as any)}
              style={{
                flex: 1,
                padding: '20px 24px',
                background: activeReport === tab.id ? '#eff6ff' : 'white',
                border: 'none',
                borderBottom: activeReport === tab.id ? '3px solid #3b82f6' : '3px solid transparent',
                color: activeReport === tab.id ? '#3b82f6' : '#64748b',
                fontSize: '16px',
                fontWeight: '600',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                transition: 'all 0.2s ease'
              }}
              onMouseEnter={(e) => {
                if (activeReport !== tab.id) {
                  e.currentTarget.style.background = '#f8fafc'
                }
              }}
              onMouseLeave={(e) => {
                if (activeReport !== tab.id) {
                  e.currentTarget.style.background = 'white'
                }
              }}
            >
              <span style={{ fontSize: '20px' }}>{tab.icon}</span>
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Content based on active report type */}
      {activeReport === 'client' && (
        <ClientActivityReport 
          filters={filters}
          onFilterChange={handleFilterChange}
          onGenerate={handleGenerate}
          onReset={handleReset}
          reportData={reportData}
        />
      )}

      {activeReport === 'security' && (
        <div style={{
          background: 'white',
          borderRadius: '12px',
          border: '1px solid #e5e7eb',
          padding: '40px',
          textAlign: 'center'
        }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>🔒</div>
          <h3 style={{ 
            fontSize: '24px', 
            fontWeight: '600', 
            color: '#1f2937',
            marginBottom: '8px'
          }}>
            Security Reports
          </h3>
          <p style={{ color: '#6b7280', fontSize: '16px' }}>
            Security reporting features coming soon...
          </p>
        </div>
      )}

      {activeReport === 'performance' && (
        <div style={{
          background: 'white',
          borderRadius: '12px',
          border: '1px solid #e5e7eb',
          padding: '40px',
          textAlign: 'center'
        }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>📊</div>
          <h3 style={{ 
            fontSize: '24px', 
            fontWeight: '600', 
            color: '#1f2937',
            marginBottom: '8px'
          }}>
            Performance Reports
          </h3>
          <p style={{ color: '#6b7280', fontSize: '16px' }}>
            Performance reporting features coming soon...
          </p>
        </div>
      )}
    </div>
  )
}

// Client Activity Report Component
interface ClientActivityReportProps {
  filters: {
    startDate: string
    endDate: string
    username: string
  }
  onFilterChange: (field: string, value: string) => void
  onGenerate: () => void
  onReset: () => void
  reportData: any
}

const ClientActivityReport: React.FC<ClientActivityReportProps> = ({
  filters,
  onFilterChange,
  onGenerate,
  onReset,
  reportData
}) => {
  return (
    <div>
      {/* Filters Section */}
      <div style={{
        background: 'white',
        borderRadius: '12px',
        border: '1px solid #e5e7eb',
        padding: '24px',
        marginBottom: '24px'
      }}>
        <h3 style={{
          fontSize: '18px',
          fontWeight: '600',
          color: '#1f2937',
          marginBottom: '20px',
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}>
          🔍 Filters
        </h3>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '16px',
          marginBottom: '20px'
        }}>
          <div>
            <label style={{
              display: 'block',
              fontSize: '14px',
              fontWeight: '500',
              color: '#374151',
              marginBottom: '6px'
            }}>
              Start Date
            </label>
            <input
              type="date"
              value={filters.startDate}
              onChange={(e) => onFilterChange('startDate', e.target.value)}
              style={{
                width: '100%',
                padding: '10px 12px',
                border: '1px solid #d1d5db',
                borderRadius: '6px',
                fontSize: '14px',
                outline: 'none',
                transition: 'border-color 0.2s ease'
              }}
              onFocus={(e) => e.target.style.borderColor = '#3b82f6'}
              onBlur={(e) => e.target.style.borderColor = '#d1d5db'}
            />
          </div>

          <div>
            <label style={{
              display: 'block',
              fontSize: '14px',
              fontWeight: '500',
              color: '#374151',
              marginBottom: '6px'
            }}>
              End Date
            </label>
            <input
              type="date"
              value={filters.endDate}
              onChange={(e) => onFilterChange('endDate', e.target.value)}
              style={{
                width: '100%',
                padding: '10px 12px',
                border: '1px solid #d1d5db',
                borderRadius: '6px',
                fontSize: '14px',
                outline: 'none',
                transition: 'border-color 0.2s ease'
              }}
              onFocus={(e) => e.target.style.borderColor = '#3b82f6'}
              onBlur={(e) => e.target.style.borderColor = '#d1d5db'}
            />
          </div>

          <div>
            <label style={{
              display: 'block',
              fontSize: '14px',
              fontWeight: '500',
              color: '#374151',
              marginBottom: '6px'
            }}>
              Username
            </label>
            <input
              type="text"
              placeholder="Enter username"
              value={filters.username}
              onChange={(e) => onFilterChange('username', e.target.value)}
              style={{
                width: '100%',
                padding: '10px 12px',
                border: '1px solid #d1d5db',
                borderRadius: '6px',
                fontSize: '14px',
                outline: 'none',
                transition: 'border-color 0.2s ease'
              }}
              onFocus={(e) => e.target.style.borderColor = '#3b82f6'}
              onBlur={(e) => e.target.style.borderColor = '#d1d5db'}
            />
          </div>
        </div>

        <div style={{
          display: 'flex',
          gap: '12px',
          justifyContent: 'flex-end'
        }}>
          <button
            onClick={onReset}
            style={{
              padding: '10px 20px',
              background: '#f9fafb',
              color: '#374151',
              border: '1px solid #d1d5db',
              borderRadius: '6px',
              fontSize: '14px',
              fontWeight: '500',
              cursor: 'pointer',
              transition: 'all 0.2s ease'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = '#f3f4f6'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = '#f9fafb'
            }}
          >
            Reset
          </button>
          <button
            onClick={onGenerate}
            style={{
              padding: '10px 20px',
              background: '#3b82f6',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              fontSize: '14px',
              fontWeight: '500',
              cursor: 'pointer',
              transition: 'all 0.2s ease'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = '#2563eb'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = '#3b82f6'
            }}
          >
            Generate
          </button>
        </div>
      </div>

      {/* General Information */}
      <div style={{
        background: 'white',
        borderRadius: '12px',
        border: '1px solid #e5e7eb',
        padding: '24px',
        marginBottom: '24px'
      }}>
        <h3 style={{
          fontSize: '18px',
          fontWeight: '600',
          color: '#1f2937',
          marginBottom: '20px',
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}>
          ℹ️ General Information
        </h3>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
          gap: '16px'
        }}>
          {Object.entries({
            'Client ID': reportData.generalInfo.clientId,
            'Username': reportData.generalInfo.username,
            'Subject DN': reportData.generalInfo.subjectDn,
            'Protocol': reportData.generalInfo.protocol,
            'Version': reportData.generalInfo.version,
            'Status': reportData.generalInfo.status,
            'Last Connect': reportData.generalInfo.lastConnect,
            'Last Disconnect': reportData.generalInfo.lastDisconnect,
            'Clean Session': reportData.generalInfo.cleanSession,
            'Keep Alive (sec)': reportData.generalInfo.keepAlive
          }).map(([key, value]) => (
            <div key={key} style={{
              padding: '12px',
              background: '#f8fafc',
              borderRadius: '6px',
              border: '1px solid #e2e8f0'
            }}>
              <div style={{
                fontSize: '12px',
                fontWeight: '600',
                color: '#6b7280',
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                marginBottom: '4px'
              }}>
                {key}
              </div>
              <div style={{
                fontSize: '14px',
                fontWeight: '500',
                color: '#1f2937'
              }}>
                {value}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Topic Subscriptions */}
      <div style={{
        background: 'white',
        borderRadius: '12px',
        border: '1px solid #e5e7eb',
        padding: '24px',
        marginBottom: '24px'
      }}>
        <h3 style={{
          fontSize: '18px',
          fontWeight: '600',
          color: '#1f2937',
          marginBottom: '20px',
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}>
          📝 Topic Subscriptions
        </h3>

        <div style={{
          overflowX: 'auto'
        }}>
          <table style={{
            width: '100%',
            borderCollapse: 'collapse'
          }}>
            <thead>
              <tr style={{
                background: '#f8fafc',
                borderBottom: '1px solid #e2e8f0'
              }}>
                <th style={{
                  padding: '12px 16px',
                  textAlign: 'left',
                  fontSize: '12px',
                  fontWeight: '600',
                  textTransform: 'uppercase',
                  color: '#6b7280'
                }}>
                  Client ID
                </th>
                <th style={{
                  padding: '12px 16px',
                  textAlign: 'left',
                  fontSize: '12px',
                  fontWeight: '600',
                  textTransform: 'uppercase',
                  color: '#6b7280'
                }}>
                  Subscription
                </th>
              </tr>
            </thead>
            <tbody>
              {reportData.topicSubscriptions.map((sub: any, index: number) => (
                <tr key={index} style={{
                  borderBottom: '1px solid #f1f5f9'
                }}>
                  <td style={{
                    padding: '16px',
                    fontSize: '14px',
                    fontWeight: '500',
                    color: '#1f2937'
                  }}>
                    {sub.clientId}
                  </td>
                  <td style={{
                    padding: '16px',
                    fontSize: '14px',
                    color: '#6b7280'
                  }}>
                    <div style={{ marginBottom: '4px' }}>{sub.topic}</div>
                    <div style={{ 
                      fontSize: '12px', 
                      color: '#9ca3af',
                      fontStyle: 'italic'
                    }}>
                      {sub.subscriptions}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Published/Subscribed Data Information */}
      <div style={{
        background: 'white',
        borderRadius: '12px',
        border: '1px solid #e5e7eb',
        padding: '24px'
      }}>
        <h3 style={{
          fontSize: '18px',
          fontWeight: '600',
          color: '#1f2937',
          marginBottom: '20px',
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}>
          📊 Published/Subscribed Data Information
        </h3>

        <div style={{
          overflowX: 'auto'
        }}>
          <table style={{
            width: '100%',
            borderCollapse: 'collapse'
          }}>
            <thead>
              <tr style={{
                background: '#f8fafc',
                borderBottom: '1px solid #e2e8f0'
              }}>
                <th style={{
                  padding: '12px 16px',
                  textAlign: 'left',
                  fontSize: '12px',
                  fontWeight: '600',
                  textTransform: 'uppercase',
                  color: '#6b7280'
                }}>
                  Client ID
                </th>
                <th style={{
                  padding: '12px 16px',
                  textAlign: 'left',
                  fontSize: '12px',
                  fontWeight: '600',
                  textTransform: 'uppercase',
                  color: '#6b7280'
                }}>
                  Monitoring Duration
                </th>
                <th style={{
                  padding: '12px 16px',
                  textAlign: 'left',
                  fontSize: '12px',
                  fontWeight: '600',
                  textTransform: 'uppercase',
                  color: '#6b7280'
                }}>
                  Packets Published
                </th>
                <th style={{
                  padding: '12px 16px',
                  textAlign: 'left',
                  fontSize: '12px',
                  fontWeight: '600',
                  textTransform: 'uppercase',
                  color: '#6b7280'
                }}>
                  Subscribed Packets Delivered
                </th>
                <th style={{
                  padding: '12px 16px',
                  textAlign: 'left',
                  fontSize: '12px',
                  fontWeight: '600',
                  textTransform: 'uppercase',
                  color: '#6b7280'
                }}>
                  Packets Dropped
                </th>
                <th style={{
                  padding: '12px 16px',
                  textAlign: 'left',
                  fontSize: '12px',
                  fontWeight: '600',
                  textTransform: 'uppercase',
                  color: '#6b7280'
                }}>
                  Bytes Published
                </th>
                <th style={{
                  padding: '12px 16px',
                  textAlign: 'left',
                  fontSize: '12px',
                  fontWeight: '600',
                  textTransform: 'uppercase',
                  color: '#6b7280'
                }}>
                  Bytes Subscribed
                </th>
              </tr>
            </thead>
            <tbody>
              <tr style={{
                borderBottom: '1px solid #f1f5f9'
              }}>
                <td style={{
                  padding: '16px',
                  fontSize: '14px',
                  fontWeight: '500',
                  color: '#1f2937'
                }}>
                  {reportData.publishedData.clientId}
                </td>
                <td style={{
                  padding: '16px',
                  fontSize: '14px',
                  color: '#6b7280'
                }}>
                  {reportData.publishedData.monitoringDuration}
                </td>
                <td style={{
                  padding: '16px',
                  fontSize: '14px',
                  color: '#6b7280'
                }}>
                  {reportData.publishedData.packetsPublished}
                </td>
                <td style={{
                  padding: '16px',
                  fontSize: '14px',
                  color: '#6b7280'
                }}>
                  {reportData.publishedData.subscribedPacketsDelivered}
                </td>
                <td style={{
                  padding: '16px',
                  fontSize: '14px',
                  color: '#6b7280'
                }}>
                  {reportData.publishedData.packetsDropped}
                </td>
                <td style={{
                  padding: '16px',
                  fontSize: '14px',
                  color: '#6b7280'
                }}>
                  {reportData.publishedData.bytesPublished}
                </td>
                <td style={{
                  padding: '16px',
                  fontSize: '14px',
                  color: '#6b7280'
                }}>
                  {reportData.publishedData.bytesSubscribed}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}