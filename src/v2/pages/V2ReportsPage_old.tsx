import React, { useState } from 'react'
import { useGlobalState } from '../hooks/useGlobalState'
import { GreApiService } from '../../services/greApi'
import { ReportData } from '../../types/api'

export const V2ReportsPage: React.FC = () => {
  const { state } = useGlobalState()
  const [activeReport, setActiveReport] = useState<'client' | 'security' | 'performance'>('client')
  const [filters, setFilters] = useState({
    startDate: '',
    endDate: '', 
    username: ''
  })
  const [reportData, setReportData] = useState<ReportData | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const reportTabs = [
    { id: 'client', label: 'Client Activity Reports', icon: '👤' },
    { id: 'security', label: 'Security Reports', icon: '🔒' },
    { id: 'performance', label: 'Performance Reports', icon: '📊' }
  ]

  const handleGenerate = async () => {
    if (!filters.username) {
      setError('Please enter a username')
      return
    }

    try {
      setLoading(true)
      setError(null)
      
      const startDate = filters.startDate ? new Date(filters.startDate).toISOString() : undefined
      const endDate = filters.endDate ? new Date(filters.endDate).toISOString() : undefined
      
      const data = await GreApiService.generateClientReport(
        filters.username,
        startDate,
        endDate
      )
      
      setReportData(data)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to generate report'
      setError(errorMessage)
      console.error('Error generating report:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleReset = () => {
    setFilters({
      startDate: '',
      endDate: '',
      username: ''
    })
    setReportData(null)
    setError(null)
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
        <>
          {error && (
            <div style={{
              background: '#fef2f2',
              border: '1px solid #fecaca',
              borderRadius: '12px',
              padding: '16px',
              marginBottom: '24px',
              color: '#dc2626',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}>
              <span style={{ fontSize: '20px' }}>⚠️</span>
              {error}
            </div>
          )}
          
          <ClientActivityReport 
            filters={filters}
            onFilterChange={handleFilterChange}
            onGenerate={handleGenerate}
            onReset={handleReset}
            reportData={reportData}
            loading={loading}
            error={error}
          />
        </>
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
  reportData: ReportData | null
  loading: boolean
  error: string | null
}

const ClientActivityReport: React.FC<ClientActivityReportProps> = ({
  filters,
  onFilterChange,
  onGenerate,
  onReset,
  reportData,
  loading,
  error
}) => {
  const [sessionsPage, setSessionsPage] = useState(0)
  const [subscriptionsPage, setSubscriptionsPage] = useState(0)
  const [eventsPage, setEventsPage] = useState(0)
  const itemsPerPage = 10

  if (!reportData) {
    return (
      <div style={{
        background: 'white',
        borderRadius: '12px',
        border: '1px solid #e5e7eb',
        padding: '40px',
        textAlign: 'center'
      }}>
        <div style={{ fontSize: '48px', marginBottom: '16px' }}>📋</div>
        <h3 style={{ 
          fontSize: '24px', 
          fontWeight: '600', 
          color: '#1f2937',
          marginBottom: '8px'
        }}>
          Generate Client Activity Report
        </h3>
        <p style={{ color: '#6b7280', fontSize: '16px', marginBottom: '24px' }}>
          Enter a username and date range, then click Generate to view comprehensive client activity data
        </p>
        
        {/* Filters Section */}
        <FiltersSection 
          filters={filters}
          onFilterChange={onFilterChange}
          onGenerate={onGenerate}
          onReset={onReset}
          loading={loading}
        />
      </div>
    )
  }

  // Pagination helpers
  const paginateArray = (array: any[], page: number) => {
    const start = page * itemsPerPage
    return array.slice(start, start + itemsPerPage)
  }

  const totalPages = (array: any[]) => Math.ceil(array.length / itemsPerPage)

  return (
    <div>
      {/* Filters Section */}
      <FiltersSection 
        filters={filters}
        onFilterChange={onFilterChange}
        onGenerate={onGenerate}
        onReset={onReset}
        loading={loading}
      />

      {/* General Information */}
      <GeneralInfoSection reportData={reportData} />

      {/* Sessions Section with Pagination */}
      <SessionsSection 
        sessions={paginateArray(reportData.sessions, sessionsPage)}
        currentPage={sessionsPage}
        totalPages={totalPages(reportData.sessions)}
        totalSessions={reportData.sessions.length}
        onPageChange={setSessionsPage}
      />

      {/* Topic Subscriptions Section with Pagination */}
      <SubscriptionsSection 
        subscriptions={paginateArray(reportData.topicSubscriptions, subscriptionsPage)}
        currentPage={subscriptionsPage}
        totalPages={totalPages(reportData.topicSubscriptions)}
        totalSubscriptions={reportData.topicSubscriptions.length}
        onPageChange={setSubscriptionsPage}
      />

      {/* Published/Subscribed Data Information */}
      <PublishedDataSection reportData={reportData} />

      {/* Recent Activity Section with Pagination */}
      <ActivitySection 
        activities={paginateArray(reportData.recentActivity, eventsPage)}
        currentPage={eventsPage}
        totalPages={totalPages(reportData.recentActivity)}
        totalActivities={reportData.recentActivity.length}
        onPageChange={setEventsPage}
      />
    </div>
  )
}

// Filters Section Component
interface FiltersSectionProps {
  filters: {
    startDate: string
    endDate: string
    username: string
  }
  onFilterChange: (field: string, value: string) => void
  onGenerate: () => void
  onReset: () => void
  loading: boolean
}

const FiltersSection: React.FC<FiltersSectionProps> = ({
  filters,
  onFilterChange,
  onGenerate,
  onReset,
  loading
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
              Username (og_client) <span style={{ color: '#ef4444' }}>*</span>
            </label>
            <input
              type="text"
              placeholder="Enter username (e.g., admin)"
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
            disabled={loading}
            style={{
              padding: '10px 20px',
              background: loading ? '#f3f4f6' : '#f9fafb',
              color: loading ? '#9ca3af' : '#374151',
              border: '1px solid #d1d5db',
              borderRadius: '6px',
              fontSize: '14px',
              fontWeight: '500',
              cursor: loading ? 'not-allowed' : 'pointer',
              transition: 'all 0.2s ease'
            }}
            onMouseEnter={(e) => {
              if (!loading) e.currentTarget.style.background = '#f3f4f6'
            }}
            onMouseLeave={(e) => {
              if (!loading) e.currentTarget.style.background = '#f9fafb'
            }}
          >
            Reset
          </button>
          <button
            onClick={onGenerate}
            disabled={loading || !filters.username}
            style={{
              padding: '10px 20px',
              background: loading || !filters.username ? '#9ca3af' : '#3b82f6',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              fontSize: '14px',
              fontWeight: '500',
              cursor: loading || !filters.username ? 'not-allowed' : 'pointer',
              transition: 'all 0.2s ease',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}
            onMouseEnter={(e) => {
              if (!loading && filters.username) e.currentTarget.style.background = '#2563eb'
            }}
            onMouseLeave={(e) => {
              if (!loading && filters.username) e.currentTarget.style.background = '#3b82f6'
            }}
          >
            {loading && (
              <div style={{
                width: '16px',
                height: '16px',
                border: '2px solid transparent',
                borderTop: '2px solid white',
                borderRadius: '50%',
                animation: 'spin 1s linear infinite'
              }}></div>
            )}
            {loading ? 'Generating...' : 'Generate Report'}
          </button>
        </div>
      </div>

      {/* Report Results */}
      {reportData && (
        <>
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
                'Username (og_client)': reportData.generalInfo.og_client,
                'Display Username': reportData.generalInfo.username,
                'Protocol': reportData.generalInfo.protocol,
                'Version': reportData.generalInfo.version,
                'Status': reportData.generalInfo.status,
                'Last Connect': new Date(reportData.generalInfo.lastConnect).toLocaleString(),
                'Last Disconnect': reportData.generalInfo.lastDisconnect !== 'Never' 
                  ? new Date(reportData.generalInfo.lastDisconnect).toLocaleString() 
                  : 'Never',
                'Clean Session': reportData.generalInfo.cleanSession,
                'Keep Alive (sec)': reportData.generalInfo.keepAlive,
                'Total Sessions': reportData.generalInfo.totalSessions.toString(),
                'Active Sessions': reportData.generalInfo.activeSessions.toString()
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

          {/* Sessions Information */}
          {reportData.sessions.length > 0 && (
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
                � Sessions ({reportData.sessions.length})
              </h3>

              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                      {['Client', 'Status', 'Start Time', 'Duration', 'IP:Port', 'Protocol', 'Subscriptions'].map(header => (
                        <th key={header} style={{
                          padding: '12px 16px',
                          textAlign: 'left',
                          fontSize: '12px',
                          fontWeight: '600',
                          textTransform: 'uppercase',
                          color: '#6b7280'
                        }}>
                          {header}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {reportData.sessions.slice(0, 10).map((session, index) => (
                      <tr key={index} style={{ borderBottom: '1px solid #f1f5f9' }}>
                        <td style={{ padding: '16px', fontSize: '14px', fontFamily: 'monospace' }}>
                          {session.client.substring(0, 20)}...
                        </td>
                        <td style={{ padding: '16px', fontSize: '14px' }}>
                          <span style={{
                            padding: '4px 8px',
                            borderRadius: '4px',
                            fontSize: '12px',
                            fontWeight: '500',
                            background: session.status === 'Active' ? '#dcfce7' : '#f3f4f6',
                            color: session.status === 'Active' ? '#166534' : '#6b7280'
                          }}>
                            {session.status}
                          </span>
                        </td>
                        <td style={{ padding: '16px', fontSize: '14px' }}>
                          {new Date(session.start_ts).toLocaleString()}
                        </td>
                        <td style={{ padding: '16px', fontSize: '14px' }}>
                          {session.duration}
                        </td>
                        <td style={{ padding: '16px', fontSize: '14px', fontFamily: 'monospace' }}>
                          {session.ip_address}:{session.port}
                        </td>
                        <td style={{ padding: '16px', fontSize: '14px' }}>
                          v{session.protocol_version}
                        </td>
                        <td style={{ padding: '16px', fontSize: '14px' }}>
                          {session.subscriptions_count}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Topic Subscriptions */}
          {reportData.topicSubscriptions.length > 0 && (
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
                � Topic Subscriptions ({reportData.topicSubscriptions.length})
              </h3>

              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                      {['Client', 'Topic', 'QoS', 'Status', 'Subscribed At'].map(header => (
                        <th key={header} style={{
                          padding: '12px 16px',
                          textAlign: 'left',
                          fontSize: '12px',
                          fontWeight: '600',
                          textTransform: 'uppercase',
                          color: '#6b7280'
                        }}>
                          {header}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {reportData.topicSubscriptions.slice(0, 20).map((sub, index) => (
                      <tr key={index} style={{ borderBottom: '1px solid #f1f5f9' }}>
                        <td style={{ padding: '16px', fontSize: '14px', fontFamily: 'monospace' }}>
                          {sub.client.substring(0, 20)}...
                        </td>
                        <td style={{ padding: '16px', fontSize: '14px', fontFamily: 'monospace' }}>
                          {sub.topic}
                        </td>
                        <td style={{ padding: '16px', fontSize: '14px' }}>
                          {sub.qos}
                        </td>
                        <td style={{ padding: '16px', fontSize: '14px' }}>
                          <span style={{
                            padding: '4px 8px',
                            borderRadius: '4px',
                            fontSize: '12px',
                            fontWeight: '500',
                            background: sub.active ? '#dcfce7' : '#fee2e2',
                            color: sub.active ? '#166534' : '#dc2626'
                          }}>
                            {sub.active ? 'Active' : 'Inactive'}
                          </span>
                        </td>
                        <td style={{ padding: '16px', fontSize: '14px' }}>
                          {new Date(sub.last_subscribe_ts).toLocaleString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

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
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
              gap: '16px'
            }}>
              {Object.entries({
                'Monitoring Duration': reportData.publishedData.monitoringDuration,
                'Packets Published': reportData.publishedData.packetsPublished.toLocaleString(),
                'Subscribed Packets Delivered': reportData.publishedData.subscribedPacketsDelivered.toLocaleString(),
                'Packets Dropped': reportData.publishedData.packetsDropped.toLocaleString(),
                'Bytes Published': (reportData.publishedData.bytesPublished / 1024).toFixed(1) + ' KB',
                'Bytes Subscribed': (reportData.publishedData.bytesSubscribed / 1024).toFixed(1) + ' KB'
              }).map(([key, value]) => (
                <div key={key} style={{
                  padding: '16px',
                  background: '#f8fafc',
                  borderRadius: '6px',
                  border: '1px solid #e2e8f0',
                  textAlign: 'center'
                }}>
                  <div style={{
                    fontSize: '24px',
                    fontWeight: '700',
                    color: '#1f2937',
                    marginBottom: '4px'
                  }}>
                    {value}
                  </div>
                  <div style={{
                    fontSize: '12px',
                    fontWeight: '500',
                    color: '#6b7280',
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em'
                  }}>
                    {key}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Recent Activity */}
          {reportData.recentActivity.length > 0 && (
            <div style={{
              background: 'white',
              borderRadius: '12px',
              border: '1px solid #e5e7eb',
              padding: '24px',
              marginTop: '24px'
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
                🔄 Recent Activity ({reportData.recentActivity.length})
              </h3>

              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                      {['Time', 'Action', 'Client', 'Details'].map(header => (
                        <th key={header} style={{
                          padding: '12px 16px',
                          textAlign: 'left',
                          fontSize: '12px',
                          fontWeight: '600',
                          textTransform: 'uppercase',
                          color: '#6b7280'
                        }}>
                          {header}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {reportData.recentActivity.slice(0, 10).map((activity) => (
                      <tr key={activity.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                        <td style={{ padding: '16px', fontSize: '14px' }}>
                          {new Date(activity.ts).toLocaleString()}
                        </td>
                        <td style={{ padding: '16px', fontSize: '14px' }}>
                          <span style={{
                            padding: '4px 8px',
                            borderRadius: '4px',
                            fontSize: '12px',
                            fontWeight: '500',
                            background: activity.action === 'connected' ? '#dcfce7' : 
                                       activity.action === 'disconnected' ? '#fee2e2' : '#f3f4f6',
                            color: activity.action === 'connected' ? '#166534' : 
                                   activity.action === 'disconnected' ? '#dc2626' : '#6b7280'
                          }}>
                            {activity.action}
                          </span>
                        </td>
                        <td style={{ padding: '16px', fontSize: '14px', fontFamily: 'monospace' }}>
                          {activity.client.substring(0, 20)}...
                        </td>
                        <td style={{ padding: '16px', fontSize: '14px' }}>
                          {activity.details}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}

      {/* No Data Message */}
      {!loading && !reportData && !error && (
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
            Generate Client Report
          </h3>
          <p style={{ color: '#6b7280', fontSize: '16px' }}>
            Enter a username and optional date range to generate a comprehensive activity report
          </p>
        </div>
      )}

      <style>
        {`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}
      </style>
    </div>
  )
}

// Component sections
const GeneralInfoSection: React.FC<{ reportData: ReportData }> = ({ reportData }) => (
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
        'Username (og_client)': reportData.generalInfo.og_client,
        'Display Username': reportData.generalInfo.username,
        'Protocol': reportData.generalInfo.protocol,
        'Version': reportData.generalInfo.version,
        'Status': reportData.generalInfo.status,
        'Last Connect': new Date(reportData.generalInfo.lastConnect).toLocaleString(),
        'Last Disconnect': reportData.generalInfo.lastDisconnect !== 'Never'
          ? new Date(reportData.generalInfo.lastDisconnect).toLocaleString()
          : 'Never',
        'Clean Session': reportData.generalInfo.cleanSession,
        'Keep Alive (sec)': reportData.generalInfo.keepAlive,
        'Total Sessions': reportData.generalInfo.totalSessions.toString(),
        'Active Sessions': reportData.generalInfo.activeSessions.toString()
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
)

const SessionsSection: React.FC<{
  sessions: any[]
  currentPage: number
  totalPages: number
  totalSessions: number
  onPageChange: (page: number) => void
}> = ({ sessions, currentPage, totalPages, totalSessions, onPageChange }) => (
  <div style={{
    background: 'white',
    borderRadius: '12px',
    border: '1px solid #e5e7eb',
    padding: '24px',
    marginBottom: '24px'
  }}>
    <div style={{
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: '20px'
    }}>
      <h3 style={{
        fontSize: '18px',
        fontWeight: '600',
        color: '#1f2937',
        margin: 0,
        display: 'flex',
        alignItems: 'center',
        gap: '8px'
      }}>
        🔗 Sessions ({totalSessions})
      </h3>
      {totalPages > 1 && (
        <PaginationControls
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={onPageChange}
        />
      )}
    </div>

    <div style={{ overflowX: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
            {['Session ID', 'Client', 'Status', 'Start Time', 'End Time', 'Duration', 'IP:Port', 'Protocol', 'Subscriptions'].map(header => (
              <th key={header} style={{
                padding: '12px 16px',
                textAlign: 'left',
                fontSize: '12px',
                fontWeight: '600',
                textTransform: 'uppercase',
                color: '#6b7280'
              }}>
                {header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {sessions.map((session, index) => (
            <tr key={session.session_id} style={{ borderBottom: '1px solid #f1f5f9' }}>
              <td style={{ padding: '16px', fontSize: '14px', fontWeight: '500', color: '#1f2937' }}>
                {session.session_id}
              </td>
              <td style={{ padding: '16px', fontSize: '14px', color: '#6b7280' }}>
                {session.client}
              </td>
              <td style={{ padding: '16px' }}>
                <span style={{
                  padding: '4px 8px',
                  borderRadius: '4px',
                  fontSize: '12px',
                  fontWeight: '500',
                  background: session.status === 'Active' ? '#dcfce7' : '#f3f4f6',
                  color: session.status === 'Active' ? '#166534' : '#6b7280'
                }}>
                  {session.status}
                </span>
              </td>
              <td style={{ padding: '16px', fontSize: '14px', color: '#6b7280' }}>
                {new Date(session.start_ts).toLocaleString()}
              </td>
              <td style={{ padding: '16px', fontSize: '14px', color: '#6b7280' }}>
                {session.end_ts ? new Date(session.end_ts).toLocaleString() : 'Active'}
              </td>
              <td style={{ padding: '16px', fontSize: '14px', color: '#6b7280' }}>
                {session.duration}
              </td>
              <td style={{ padding: '16px', fontSize: '14px', color: '#6b7280' }}>
                {session.ip_address}:{session.port}
              </td>
              <td style={{ padding: '16px', fontSize: '14px', color: '#6b7280' }}>
                v{session.protocol_version}
              </td>
              <td style={{ padding: '16px', fontSize: '14px', color: '#6b7280' }}>
                {session.subscriptions_count}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  </div>
)

const SubscriptionsSection: React.FC<{
  subscriptions: any[]
  currentPage: number
  totalPages: number
  totalSubscriptions: number
  onPageChange: (page: number) => void
}> = ({ subscriptions, currentPage, totalPages, totalSubscriptions, onPageChange }) => (
  <div style={{
    background: 'white',
    borderRadius: '12px',
    border: '1px solid #e5e7eb',
    padding: '24px',
    marginBottom: '24px'
  }}>
    <div style={{
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: '20px'
    }}>
      <h3 style={{
        fontSize: '18px',
        fontWeight: '600',
        color: '#1f2937',
        margin: 0,
        display: 'flex',
        alignItems: 'center',
        gap: '8px'
      }}>
        📝 Topic Subscriptions ({totalSubscriptions})
      </h3>
      {totalPages > 1 && (
        <PaginationControls
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={onPageChange}
        />
      )}
    </div>

    <div style={{ overflowX: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
            {['Client', 'Topic', 'QoS', 'Status', 'Subscribed At', 'Unsubscribed At'].map(header => (
              <th key={header} style={{
                padding: '12px 16px',
                textAlign: 'left',
                fontSize: '12px',
                fontWeight: '600',
                textTransform: 'uppercase',
                color: '#6b7280'
              }}>
                {header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {subscriptions.map((sub, index) => (
            <tr key={`${sub.client}-${sub.topic}-${index}`} style={{ borderBottom: '1px solid #f1f5f9' }}>
              <td style={{ padding: '16px', fontSize: '14px', fontWeight: '500', color: '#1f2937' }}>
                {sub.client}
              </td>
              <td style={{ padding: '16px', fontSize: '14px', color: '#6b7280' }}>
                {sub.topic}
              </td>
              <td style={{ padding: '16px', fontSize: '14px', color: '#6b7280' }}>
                {sub.qos}
              </td>
              <td style={{ padding: '16px' }}>
                <span style={{
                  padding: '4px 8px',
                  borderRadius: '4px',
                  fontSize: '12px',
                  fontWeight: '500',
                  background: sub.active ? '#dcfce7' : '#fee2e2',
                  color: sub.active ? '#166534' : '#dc2626'
                }}>
                  {sub.active ? 'Active' : 'Inactive'}
                </span>
              </td>
              <td style={{ padding: '16px', fontSize: '14px', color: '#6b7280' }}>
                {new Date(sub.last_subscribe_ts).toLocaleString()}
              </td>
              <td style={{ padding: '16px', fontSize: '14px', color: '#6b7280' }}>
                {sub.last_unsubscribe_ts ? new Date(sub.last_unsubscribe_ts).toLocaleString() : 'N/A'}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  </div>
)

const PublishedDataSection: React.FC<{ reportData: ReportData }> = ({ reportData }) => (
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
      📊 Published/Subscribed Data Information
    </h3>

    <div style={{ overflowX: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
            {['OG Client', 'Monitoring Duration', 'Packets Published', 'Subscribed Packets Delivered', 'Packets Dropped', 'Bytes Published', 'Bytes Subscribed'].map(header => (
              <th key={header} style={{
                padding: '12px 16px',
                textAlign: 'left',
                fontSize: '12px',
                fontWeight: '600',
                textTransform: 'uppercase',
                color: '#6b7280'
              }}>
                {header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          <tr style={{ borderBottom: '1px solid #f1f5f9' }}>
            <td style={{ padding: '16px', fontSize: '14px', fontWeight: '500', color: '#1f2937' }}>
              {reportData.publishedData.og_client}
            </td>
            <td style={{ padding: '16px', fontSize: '14px', color: '#6b7280' }}>
              {reportData.publishedData.monitoringDuration}
            </td>
            <td style={{ padding: '16px', fontSize: '14px', color: '#6b7280' }}>
              {reportData.publishedData.packetsPublished.toLocaleString()}
            </td>
            <td style={{ padding: '16px', fontSize: '14px', color: '#6b7280' }}>
              {reportData.publishedData.subscribedPacketsDelivered.toLocaleString()}
            </td>
            <td style={{ padding: '16px', fontSize: '14px', color: '#6b7280' }}>
              {reportData.publishedData.packetsDropped.toLocaleString()}
            </td>
            <td style={{ padding: '16px', fontSize: '14px', color: '#6b7280' }}>
              {reportData.publishedData.bytesPublished.toLocaleString()}
            </td>
            <td style={{ padding: '16px', fontSize: '14px', color: '#6b7280' }}>
              {reportData.publishedData.bytesSubscribed.toLocaleString()}
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
)

const ActivitySection: React.FC<{
  activities: any[]
  currentPage: number
  totalPages: number
  totalActivities: number
  onPageChange: (page: number) => void
}> = ({ activities, currentPage, totalPages, totalActivities, onPageChange }) => (
  <div style={{
    background: 'white',
    borderRadius: '12px',
    border: '1px solid #e5e7eb',
    padding: '24px'
  }}>
    <div style={{
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: '20px'
    }}>
      <h3 style={{
        fontSize: '18px',
        fontWeight: '600',
        color: '#1f2937',
        margin: 0,
        display: 'flex',
        alignItems: 'center',
        gap: '8px'
      }}>
        📋 Recent Activity ({totalActivities})
      </h3>
      {totalPages > 1 && (
        <PaginationControls
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={onPageChange}
        />
      )}
    </div>

    <div style={{ overflowX: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
            {['Time', 'Action', 'Client', 'Topic', 'Details'].map(header => (
              <th key={header} style={{
                padding: '12px 16px',
                textAlign: 'left',
                fontSize: '12px',
                fontWeight: '600',
                textTransform: 'uppercase',
                color: '#6b7280'
              }}>
                {header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {activities.map((activity) => (
            <tr key={activity.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
              <td style={{ padding: '16px', fontSize: '14px', color: '#6b7280' }}>
                {new Date(activity.ts).toLocaleString()}
              </td>
              <td style={{ padding: '16px' }}>
                <span style={{
                  padding: '4px 8px',
                  borderRadius: '4px',
                  fontSize: '12px',
                  fontWeight: '500',
                  background: getActionColor(activity.action).bg,
                  color: getActionColor(activity.action).text
                }}>
                  {activity.action}
                </span>
              </td>
              <td style={{ padding: '16px', fontSize: '14px', color: '#6b7280' }}>
                {activity.client}
              </td>
              <td style={{ padding: '16px', fontSize: '14px', color: '#6b7280' }}>
                {activity.topic || 'N/A'}
              </td>
              <td style={{ padding: '16px', fontSize: '14px', color: '#6b7280' }}>
                {activity.details}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  </div>
)

const PaginationControls: React.FC<{
  currentPage: number
  totalPages: number
  onPageChange: (page: number) => void
}> = ({ currentPage, totalPages, onPageChange }) => (
  <div style={{
    display: 'flex',
    alignItems: 'center',
    gap: '8px'
  }}>
    <button
      onClick={() => onPageChange(Math.max(0, currentPage - 1))}
      disabled={currentPage === 0}
      style={{
        padding: '8px 12px',
        background: currentPage === 0 ? '#f3f4f6' : '#3b82f6',
        color: currentPage === 0 ? '#9ca3af' : 'white',
        border: 'none',
        borderRadius: '6px',
        fontSize: '14px',
        fontWeight: '500',
        cursor: currentPage === 0 ? 'not-allowed' : 'pointer'
      }}
    >
      Previous
    </button>
    <span style={{
      padding: '8px 12px',
      fontSize: '14px',
      color: '#6b7280'
    }}>
      Page {currentPage + 1} of {totalPages}
    </span>
    <button
      onClick={() => onPageChange(Math.min(totalPages - 1, currentPage + 1))}
      disabled={currentPage >= totalPages - 1}
      style={{
        padding: '8px 12px',
        background: currentPage >= totalPages - 1 ? '#f3f4f6' : '#3b82f6',
        color: currentPage >= totalPages - 1 ? '#9ca3af' : 'white',
        border: 'none',
        borderRadius: '6px',
        fontSize: '14px',
        fontWeight: '500',
        cursor: currentPage >= totalPages - 1 ? 'not-allowed' : 'pointer'
      }}
    >
      Next
    </button>
  </div>
)

const getActionColor = (action: string) => {
  switch (action) {
    case 'connected':
      return { bg: '#dcfce7', text: '#166534' }
    case 'disconnected':
      return { bg: '#fee2e2', text: '#dc2626' }
    case 'subscribe':
      return { bg: '#dbeafe', text: '#1e40af' }
    case 'unsubscribe':
      return { bg: '#fef3c7', text: '#d97706' }
    case 'publish':
      return { bg: '#e0e7ff', text: '#5b21b6' }
    default:
      return { bg: '#f3f4f6', text: '#6b7280' }
  }
}