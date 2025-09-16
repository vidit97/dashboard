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

  // Table filters state
  const [sessionFilters, setSessionFilters] = useState({
    status: '',
    client: '',
    sessionId: ''
  })
  
  const [subscriptionFilters, setSubscriptionFilters] = useState({
    topic: '',
    qos: '',
    status: ''
  })
  
  const [activityFilters, setActivityFilters] = useState({
    action: '',
    client: ''
  })

  // Sorting state
  const [sessionSort, setSessionSort] = useState({ field: '', direction: 'asc' as 'asc' | 'desc' })
  const [subscriptionSort, setSubscriptionSort] = useState({ field: '', direction: 'asc' as 'asc' | 'desc' })
  const [activitySort, setActivitySort] = useState({ field: '', direction: 'asc' as 'asc' | 'desc' })

  // Helper functions for filtering and sorting
  const filterSessions = (sessions: any[]) => {
    return sessions.filter(session => {
      const matchesStatus = !sessionFilters.status || session.status.toLowerCase().includes(sessionFilters.status.toLowerCase())
      const matchesClient = !sessionFilters.client || session.client.toLowerCase().includes(sessionFilters.client.toLowerCase())
      const matchesSessionId = !sessionFilters.sessionId || session.session_id.toString().includes(sessionFilters.sessionId)
      return matchesStatus && matchesClient && matchesSessionId
    })
  }

  const filterSubscriptions = (subscriptions: any[]) => {
    return subscriptions.filter(sub => {
      const matchesTopic = !subscriptionFilters.topic || sub.topic.toLowerCase().includes(subscriptionFilters.topic.toLowerCase())
      const matchesQos = !subscriptionFilters.qos || sub.qos.toString() === subscriptionFilters.qos
      const statusText = sub.active ? 'Active' : 'Inactive'
      const matchesStatus = !subscriptionFilters.status || statusText.toLowerCase().includes(subscriptionFilters.status.toLowerCase())
      return matchesTopic && matchesQos && matchesStatus
    })
  }

  const filterActivities = (activities: any[]) => {
    return activities.filter(activity => {
      const matchesAction = !activityFilters.action || activity.action.toLowerCase().includes(activityFilters.action.toLowerCase())
      const matchesClient = !activityFilters.client || activity.client.toLowerCase().includes(activityFilters.client.toLowerCase())
      return matchesAction && matchesClient
    })
  }

  const sortData = (data: any[], sortConfig: { field: string, direction: 'asc' | 'desc' }) => {
    if (!sortConfig.field) return data

    return [...data].sort((a, b) => {
      let aVal = a[sortConfig.field]
      let bVal = b[sortConfig.field]

      // Handle null, undefined, and empty values - put them at the end
      if (aVal == null || aVal === '' || aVal === 'N/A') aVal = sortConfig.direction === 'asc' ? '\uFFFF' : ''
      if (bVal == null || bVal === '' || bVal === 'N/A') bVal = sortConfig.direction === 'asc' ? '\uFFFF' : ''

      // Handle different data types
      if (typeof aVal === 'string' && typeof bVal === 'string') {
        aVal = aVal.toLowerCase()
        bVal = bVal.toLowerCase()
      }

      // Handle dates specifically
      if (sortConfig.field.includes('ts') || sortConfig.field.includes('time') || sortConfig.field.includes('Time')) {
        // Convert to timestamps for proper date sorting
        const aTime = aVal === '\uFFFF' || aVal === '' ? (sortConfig.direction === 'asc' ? Infinity : -Infinity) : new Date(aVal).getTime()
        const bTime = bVal === '\uFFFF' || bVal === '' ? (sortConfig.direction === 'asc' ? Infinity : -Infinity) : new Date(bVal).getTime()

        if (sortConfig.direction === 'asc') {
          return aTime < bTime ? -1 : aTime > bTime ? 1 : 0
        } else {
          return aTime > bTime ? -1 : aTime < bTime ? 1 : 0
        }
      }

      if (sortConfig.direction === 'asc') {
        return aVal < bVal ? -1 : aVal > bVal ? 1 : 0
      } else {
        return aVal > bVal ? -1 : aVal < bVal ? 1 : 0
      }
    })
  }

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

  // Pagination helpers with filtering and sorting
  const paginateArray = (array: any[], page: number) => {
    const start = page * itemsPerPage
    return array.slice(start, start + itemsPerPage)
  }

  const totalPages = (array: any[]) => Math.ceil(array.length / itemsPerPage)

  // Process data with filters and sorting
  const filteredSessions = reportData ? sortData(filterSessions(reportData.sessions), sessionSort) : []
  const filteredSubscriptions = reportData ? sortData(filterSubscriptions(reportData.topicSubscriptions), subscriptionSort) : []
  const filteredActivities = reportData ? sortData(filterActivities(reportData.recentActivity), activitySort) : []

  // Handle filter changes for sessions
  const handleSessionFilterChange = (field: string, value: string) => {
    setSessionFilters(prev => ({
      ...prev,
      [field]: value
    }))
  }

  // Handle filter changes for subscriptions
  const handleSubscriptionFilterChange = (field: string, value: string) => {
    setSubscriptionFilters(prev => ({
      ...prev,
      [field]: value
    }))
  }

  // Handle filter changes for activities
  const handleActivityFilterChange = (field: string, value: string) => {
    setActivityFilters(prev => ({
      ...prev,
      [field]: value
    }))
  }

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
        sessions={paginateArray(filteredSessions, sessionsPage)}
        currentPage={sessionsPage}
        totalPages={totalPages(filteredSessions)}
        totalSessions={filteredSessions.length}
        onPageChange={setSessionsPage}
        filters={sessionFilters}
        onFilterChange={handleSessionFilterChange}
        onSort={setSessionSort}
        sortConfig={sessionSort}
      />

      {/* Topic Subscriptions Section with Pagination */}
      <SubscriptionsSection
        subscriptions={paginateArray(filteredSubscriptions, subscriptionsPage)}
        currentPage={subscriptionsPage}
        totalPages={totalPages(filteredSubscriptions)}
        totalSubscriptions={filteredSubscriptions.length}
        onPageChange={setSubscriptionsPage}
        filters={subscriptionFilters}
        onFilterChange={handleSubscriptionFilterChange}
        onSort={setSubscriptionSort}
        sortConfig={subscriptionSort}
      />

      {/* Recent Activity Section with Pagination */}
      <ActivitySection
        activities={paginateArray(filteredActivities, eventsPage)}
        currentPage={eventsPage}
        totalPages={totalPages(filteredActivities)}
        totalActivities={filteredActivities.length}
        onPageChange={setEventsPage}
        filters={activityFilters}
        onFilterChange={handleActivityFilterChange}
        onSort={setActivitySort}
        sortConfig={activitySort}
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
        gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
        gap: '20px',
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
            Username (og_client)
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
            if (!loading) {
              e.currentTarget.style.background = '#f3f4f6'
            }
          }}
          onMouseLeave={(e) => {
            if (!loading) {
              e.currentTarget.style.background = '#f9fafb'
            }
          }}
        >
          Reset
        </button>
        <button
          onClick={onGenerate}
          disabled={loading}
          style={{
            padding: '10px 20px',
            background: loading ? '#94a3b8' : '#3b82f6',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            fontSize: '14px',
            fontWeight: '500',
            cursor: loading ? 'not-allowed' : 'pointer',
            transition: 'all 0.2s ease',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}
          onMouseEnter={(e) => {
            if (!loading) {
              e.currentTarget.style.background = '#2563eb'
            }
          }}
          onMouseLeave={(e) => {
            if (!loading) {
              e.currentTarget.style.background = '#3b82f6'
            }
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
            }} />
          )}
          Generate
        </button>
      </div>

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
  filters: { status: string, client: string, sessionId: string }
  onFilterChange: (field: string, value: string) => void
  onSort: (sortConfig: { field: string, direction: 'asc' | 'desc' }) => void
  sortConfig: { field: string, direction: 'asc' | 'desc' }
}> = ({ sessions, currentPage, totalPages, totalSessions, onPageChange, filters, onFilterChange, onSort, sortConfig }) => (
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

    {/* Sessions Filters */}
    <div style={{
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
      gap: '12px',
      marginBottom: '16px',
      padding: '16px',
      background: '#f8fafc',
      borderRadius: '8px',
      border: '1px solid #e2e8f0'
    }}>
      <div>
        <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#6b7280', marginBottom: '4px' }}>
          Filter by Status
        </label>
        <select
          value={filters.status}
          onChange={(e) => onFilterChange('status', e.target.value)}
          style={{
            width: '100%', padding: '6px 8px', border: '1px solid #d1d5db', borderRadius: '4px', fontSize: '14px'
          }}>
          <option value="">All Status</option>
          <option value="active">Active</option>
          <option value="ended">Ended</option>
        </select>
      </div>
      <div>
        <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#6b7280', marginBottom: '4px' }}>
          Filter by Client
        </label>
        <input
          type="text"
          placeholder="Enter client name..."
          value={filters.client}
          onChange={(e) => onFilterChange('client', e.target.value)}
          style={{
            width: '100%', padding: '6px 8px', border: '1px solid #d1d5db', borderRadius: '4px', fontSize: '14px'
          }}
        />
      </div>
      <div>
        <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#6b7280', marginBottom: '4px' }}>
          Filter by Session ID
        </label>
        <input
          type="text"
          placeholder="Enter session ID..."
          value={filters.sessionId}
          onChange={(e) => onFilterChange('sessionId', e.target.value)}
          style={{
            width: '100%', padding: '6px 8px', border: '1px solid #d1d5db', borderRadius: '4px', fontSize: '14px'
          }}
        />
      </div>
    </div>

    <div style={{ overflowX: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
            {[
              { label: 'Session ID', field: 'session_id' },
              { label: 'Client', field: 'client' },
              { label: 'Status', field: 'status' },
              { label: 'Start Time', field: 'start_ts' },
              { label: 'End Time', field: 'end_ts' },
              { label: 'Duration', field: 'duration' },
              { label: 'IP:Port', field: 'ip_address' },
              { label: 'Protocol', field: 'protocol_version' },
              { label: 'Subscriptions', field: 'subscriptions_count' }
            ].map(({ label, field }) => (
              <th key={field} style={{
                padding: '12px 16px',
                textAlign: 'left',
                fontSize: '12px',
                fontWeight: '600',
                textTransform: 'uppercase',
                color: '#6b7280',
                cursor: 'pointer',
                userSelect: 'none',
                position: 'relative'
              }}
              onClick={() => {
                const newDirection = sortConfig.field === field && sortConfig.direction === 'asc' ? 'desc' : 'asc'
                onSort({ field, direction: newDirection })
              }}
              onMouseEnter={(e) => e.currentTarget.style.background = '#e2e8f0'}
              onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
              >
                {label} {sortConfig.field === field ? (sortConfig.direction === 'asc' ? '↑' : '↓') : '⇅'}
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
                {session.end_ts ? new Date(session.end_ts).toLocaleString() : ''}
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
  filters: { topic: string, qos: string, status: string }
  onFilterChange: (field: string, value: string) => void
  onSort: (sortConfig: { field: string, direction: 'asc' | 'desc' }) => void
  sortConfig: { field: string, direction: 'asc' | 'desc' }
}> = ({ subscriptions, currentPage, totalPages, totalSubscriptions, onPageChange, filters, onFilterChange, onSort, sortConfig }) => (
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

    {/* Subscriptions Filters */}
    <div style={{
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
      gap: '12px',
      marginBottom: '16px',
      padding: '16px',
      background: '#f8fafc',
      borderRadius: '8px',
      border: '1px solid #e2e8f0'
    }}>
      <div>
        <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#6b7280', marginBottom: '4px' }}>
          Filter by Topic
        </label>
        <input
          type="text"
          placeholder="Enter topic pattern..."
          value={filters.topic}
          onChange={(e) => onFilterChange('topic', e.target.value)}
          style={{
            width: '100%', padding: '6px 8px', border: '1px solid #d1d5db', borderRadius: '4px', fontSize: '14px'
          }}
        />
      </div>
      <div>
        <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#6b7280', marginBottom: '4px' }}>
          Filter by QoS
        </label>
        <select
          value={filters.qos}
          onChange={(e) => onFilterChange('qos', e.target.value)}
          style={{
            width: '100%', padding: '6px 8px', border: '1px solid #d1d5db', borderRadius: '4px', fontSize: '14px'
          }}>
          <option value="">All QoS</option>
          <option value="0">QoS 0</option>
          <option value="1">QoS 1</option>
          <option value="2">QoS 2</option>
        </select>
      </div>
      <div>
        <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#6b7280', marginBottom: '4px' }}>
          Filter by Status
        </label>
        <select
          value={filters.status}
          onChange={(e) => onFilterChange('status', e.target.value)}
          style={{
            width: '100%', padding: '6px 8px', border: '1px solid #d1d5db', borderRadius: '4px', fontSize: '14px'
          }}>
          <option value="">All Status</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </select>
      </div>
    </div>

    <div style={{ overflowX: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
            {[
              { label: 'Client', field: 'client' },
              { label: 'Topic', field: 'topic' },
              { label: 'QoS', field: 'qos' },
              { label: 'Status', field: 'active' },
              { label: 'Subscribed At', field: 'last_subscribe_ts' },
              { label: 'Unsubscribed At', field: 'last_unsubscribe_ts' }
            ].map(({ label, field }) => (
              <th key={field} style={{
                padding: '12px 16px',
                textAlign: 'left',
                fontSize: '12px',
                fontWeight: '600',
                textTransform: 'uppercase',
                color: '#6b7280',
                cursor: 'pointer',
                userSelect: 'none'
              }}
              onClick={() => {
                const newDirection = sortConfig.field === field && sortConfig.direction === 'asc' ? 'desc' : 'asc'
                onSort({ field, direction: newDirection })
              }}
              onMouseEnter={(e) => e.currentTarget.style.background = '#e2e8f0'}
              onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
              >
                {label} {sortConfig.field === field ? (sortConfig.direction === 'asc' ? '↑' : '↓') : '⇅'}
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

const ActivitySection: React.FC<{
  activities: any[]
  currentPage: number
  totalPages: number
  totalActivities: number
  onPageChange: (page: number) => void
  filters: { action: string, client: string }
  onFilterChange: (field: string, value: string) => void
  onSort: (sortConfig: { field: string, direction: 'asc' | 'desc' }) => void
  sortConfig: { field: string, direction: 'asc' | 'desc' }
}> = ({ activities, currentPage, totalPages, totalActivities, onPageChange, filters, onFilterChange, onSort, sortConfig }) => (
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

    {/* Activity Filters */}
    <div style={{
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
      gap: '12px',
      marginBottom: '16px',
      padding: '16px',
      background: '#f8fafc',
      borderRadius: '8px',
      border: '1px solid #e2e8f0'
    }}>
      <div>
        <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#6b7280', marginBottom: '4px' }}>
          Filter by Action
        </label>
        <select
          value={filters.action}
          onChange={(e) => onFilterChange('action', e.target.value)}
          style={{
            width: '100%', padding: '6px 8px', border: '1px solid #d1d5db', borderRadius: '4px', fontSize: '14px'
          }}>
          <option value="">All Actions</option>
          <option value="connected">Connected</option>
          <option value="disconnected">Disconnected</option>
          <option value="subscribe">Subscribe</option>
          <option value="unsubscribe">Unsubscribe</option>
          <option value="publish">Publish</option>
        </select>
      </div>
      <div>
        <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#6b7280', marginBottom: '4px' }}>
          Filter by Client
        </label>
        <input
          type="text"
          placeholder="Enter client name..."
          value={filters.client}
          onChange={(e) => onFilterChange('client', e.target.value)}
          style={{
            width: '100%', padding: '6px 8px', border: '1px solid #d1d5db', borderRadius: '4px', fontSize: '14px'
          }}
        />
      </div>
    </div>

    <div style={{ overflowX: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
            {[
              { label: 'Time', field: 'ts' },
              { label: 'Action', field: 'action' },
              { label: 'Client', field: 'client' },
              { label: 'Topic', field: 'topic' },
              { label: 'Details', field: 'details' }
            ].map(({ label, field }) => (
              <th key={field} style={{
                padding: '12px 16px',
                textAlign: 'left',
                fontSize: '12px',
                fontWeight: '600',
                textTransform: 'uppercase',
                color: '#6b7280',
                cursor: 'pointer',
                userSelect: 'none'
              }}
              onClick={() => {
                const newDirection = sortConfig.field === field && sortConfig.direction === 'asc' ? 'desc' : 'asc'
                onSort({ field, direction: newDirection })
              }}
              onMouseEnter={(e) => e.currentTarget.style.background = '#e2e8f0'}
              onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
              >
                {label} {sortConfig.field === field ? (sortConfig.direction === 'asc' ? '↑' : '↓') : '⇅'}
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