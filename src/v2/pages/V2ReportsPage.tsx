import React, { useState } from 'react'
import { useGlobalState } from '../hooks/useGlobalState'
import { GreApiService } from '../../services/greApi'
import { ReportData, SecurityReportData } from '../../types/api'
import { watchMQTTService } from '../../services/api'
import { OverviewData, ContainerData } from '../../config/api'
import * as XLSX from 'xlsx'

export const V2ReportsPage: React.FC = () => {
  const { state } = useGlobalState()
  const [activeReport, setActiveReport] = useState<'client' | 'security' | 'performance'>('client')
  const [filters, setFilters] = useState({
    startDate: '',
    endDate: '',
    username: ''
  })
  const [securityFilters, setSecurityFilters] = useState({
    startDate: '',
    endDate: ''
  })
  const [reportData, setReportData] = useState<ReportData | null>(null)
  const [securityReportData, setSecurityReportData] = useState<SecurityReportData | null>(null)
  const [performanceFilters, setPerformanceFilters] = useState({
    startDate: '',
    endDate: ''
  })
  const [performanceReportData, setPerformanceReportData] = useState<any[] | null>(null)
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

  const handleDownloadExcel = () => {
    if (!reportData) return

    const workbook = XLSX.utils.book_new()

    // General Information Sheet
    const generalInfoData = [
      ['Field', 'Value'],
      ['Username (og_client)', reportData.generalInfo.og_client],
      ['Display Username', reportData.generalInfo.username],
      ['Protocol', reportData.generalInfo.protocol],
      ['Version', reportData.generalInfo.version],
      ['Status', reportData.generalInfo.status],
      ['Last Connect', new Date(reportData.generalInfo.lastConnect).toLocaleString()],
      ['Last Disconnect', reportData.generalInfo.lastDisconnect !== 'Never'
        ? new Date(reportData.generalInfo.lastDisconnect).toLocaleString()
        : 'Never'],
      ['Clean Session', reportData.generalInfo.cleanSession],
      ['Keep Alive (sec)', reportData.generalInfo.keepAlive],
      ['Total Sessions', reportData.generalInfo.totalSessions.toString()],
      ['Active Sessions', reportData.generalInfo.activeSessions.toString()]
    ]
    const generalInfoSheet = XLSX.utils.aoa_to_sheet(generalInfoData)
    XLSX.utils.book_append_sheet(workbook, generalInfoSheet, 'General Information')

    // Sessions Sheet
    if (reportData.sessions && reportData.sessions.length > 0) {
      const sessionsData = [
        ['Session ID', 'Client', 'Status', 'Start Time', 'End Time', 'Duration', 'IP:Port', 'Protocol', 'Subscriptions'],
        ...reportData.sessions.map(session => [
          session.session_id,
          session.client,
          session.status,
          new Date(session.start_ts).toLocaleString(),
          session.end_ts ? new Date(session.end_ts).toLocaleString() : '',
          session.duration,
          `${session.ip_address}:${session.port}`,
          `v${session.protocol_version}`,
          session.subscriptions_count
        ])
      ]
      const sessionsSheet = XLSX.utils.aoa_to_sheet(sessionsData)
      XLSX.utils.book_append_sheet(workbook, sessionsSheet, 'Sessions')
    }

    // Topic Subscriptions Sheet
    if (reportData.topicSubscriptions && reportData.topicSubscriptions.length > 0) {
      const subscriptionsData = [
        ['Client', 'Topic', 'QoS', 'Status', 'Subscribed At', 'Unsubscribed At'],
        ...reportData.topicSubscriptions.map(sub => [
          sub.client,
          sub.topic,
          sub.qos,
          sub.active ? 'Active' : 'Inactive',
          new Date(sub.last_subscribe_ts).toLocaleString(),
          sub.last_unsubscribe_ts ? new Date(sub.last_unsubscribe_ts).toLocaleString() : 'N/A'
        ])
      ]
      const subscriptionsSheet = XLSX.utils.aoa_to_sheet(subscriptionsData)
      XLSX.utils.book_append_sheet(workbook, subscriptionsSheet, 'Topic Subscriptions')
    }

    // Recent Activity Sheet
    if (reportData.recentActivity && reportData.recentActivity.length > 0) {
      const activityData = [
        ['Time', 'Action', 'Client', 'Topic', 'Details'],
        ...reportData.recentActivity.map(activity => [
          new Date(activity.ts).toLocaleString(),
          activity.action,
          activity.client,
          activity.topic || 'N/A',
          activity.details
        ])
      ]
      const activitySheet = XLSX.utils.aoa_to_sheet(activityData)
      XLSX.utils.book_append_sheet(workbook, activitySheet, 'Recent Activity')
    }

    // Generate filename with timestamp and client report
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').split('.')[0]
    const filename = `${timestamp}_${reportData.generalInfo.og_client}_client_report.xlsx`

    // Download the file
    XLSX.writeFile(workbook, filename)
  }

  const handleGenerateSecurityReport = async () => {
    try {
      setLoading(true)
      setError(null)

      const startDate = securityFilters.startDate ? new Date(securityFilters.startDate).toISOString() : undefined
      const endDate = securityFilters.endDate ? new Date(securityFilters.endDate).toISOString() : undefined

      const data = await GreApiService.generateSecurityReport(
        startDate,
        endDate
      )

      setSecurityReportData(data)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to generate security report'
      setError(errorMessage)
      console.error('Error generating security report:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleSecurityFilterChange = (field: string, value: string) => {
    setSecurityFilters(prev => ({
      ...prev,
      [field]: value
    }))
  }

  const handleResetSecurityFilters = () => {
    setSecurityFilters({
      startDate: '',
      endDate: ''
    })
    setSecurityReportData(null)
    setError(null)
  }

  const handleDownloadSecurityExcel = () => {
    if (!securityReportData) return

    const workbook = XLSX.utils.book_new()

    // Authentication Events Sheet
    if (securityReportData.authenticationEvents && securityReportData.authenticationEvents.length > 0) {
      const authData = [
        ['Timestamp', 'Action', 'Client', 'Username', 'Topic', 'Broker', 'Details'],
        ...securityReportData.authenticationEvents.map(event => [
          new Date(event.ts).toLocaleString(),
          event.action,
          event.client,
          event.username || 'N/A',
          event.topic || 'N/A',
          event.broker,
          event.raw || 'N/A'
        ])
      ]
      const authSheet = XLSX.utils.aoa_to_sheet(authData)
      XLSX.utils.book_append_sheet(workbook, authSheet, 'Authentication Events')
    }

    // ACL Modifications Sheet
    if (securityReportData.aclModifications && securityReportData.aclModifications.length > 0) {
      const aclData = [
        ['Timestamp', 'Actor', 'Operation', 'Role', 'Topic', 'ACL Type', 'Allow', 'Priority', 'Broker', 'Queue ID', 'Result'],
        ...securityReportData.aclModifications.map(mod => [
          new Date(mod.ts).toLocaleString(),
          mod.actor,
          mod.op,
          mod.payload_json?.role || 'N/A',
          mod.payload_json?.topic || 'N/A',
          mod.payload_json?.acltype || 'N/A',
          mod.payload_json?.allow !== undefined ? (mod.payload_json.allow ? 'Yes' : 'No') : 'N/A',
          mod.payload_json?.priority || 'N/A',
          mod.broker,
          mod.queue_id || 'N/A',
          JSON.stringify(mod.result_json)
        ])
      ]
      const aclSheet = XLSX.utils.aoa_to_sheet(aclData)
      XLSX.utils.book_append_sheet(workbook, aclSheet, 'ACL Modifications')
    }

    // Generate filename with timestamp and security report
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').split('.')[0]
    const filename = `${timestamp}_security_report.xlsx`

    // Download the file
    XLSX.writeFile(workbook, filename)
  }

  const handleFilterChange = (field: string, value: string) => {
    setFilters(prev => ({
      ...prev,
      [field]: value
    }))
  }

  // Performance Report handlers
  const handlePerformanceFilterChange = (field: string, value: string) => {
    setPerformanceFilters(prev => ({
      ...prev,
      [field]: value
    }))
  }

  const handleGeneratePerformanceReport = async () => {
    if (!performanceFilters.startDate || !performanceFilters.endDate) {
      setError('Please select both start and end dates')
      return
    }

    try {
      setLoading(true)
      setError(null)

      // Fetch overview and container data
      const [overviewData, containerData] = await Promise.all([
        watchMQTTService.getOverview(state.broker),
        watchMQTTService.getContainer(state.broker).catch(err => {
          console.warn('Container API failed:', err)
          return null
        })
      ])

      // Generate performance report data
      const reportData = generatePerformanceReportData(
        overviewData,
        containerData,
        performanceFilters.startDate,
        performanceFilters.endDate
      )

      setPerformanceReportData(reportData)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to generate performance report'
      setError(errorMessage)
      console.error('Error generating performance report:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleResetPerformanceFilters = () => {
    setPerformanceFilters({
      startDate: '',
      endDate: ''
    })
    setPerformanceReportData(null)
    setError(null)
  }

  const handleDownloadPerformanceExcel = () => {
    if (!performanceReportData) return

    const workbook = XLSX.utils.book_new()

    // Performance Report Sheet
    const performanceData = [
      ['Timestamp', 'Health Status', 'Uptime (hours)', 'CPU %', 'Memory %', 'Disk Used', 'Connected Clients', 'Active Clients', 'Subscriptions', 'Retained Messages'],
      ...performanceReportData.map(record => [
        record.timestamp,
        record.health,
        record.uptime,
        record.cpuPercent,
        record.memoryPercent,
        record.diskUsed,
        record.connectedClients,
        record.activeClients,
        record.subscriptions,
        record.retainedMessages
      ])
    ]
    const performanceSheet = XLSX.utils.aoa_to_sheet(performanceData)
    XLSX.utils.book_append_sheet(workbook, performanceSheet, 'Performance Report')

    // Generate filename with timestamp
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').split('.')[0]
    const filename = `${timestamp}_performance_report.xlsx`

    // Download the file
    XLSX.writeFile(workbook, filename)
  }

  const handleDownloadMosquittoLog = () => {
    // Create empty mosquitto.log file
    const logContent = ''
    const blob = new Blob([logContent], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = 'mosquitto.log'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  // Generate performance report data from API responses
  const generatePerformanceReportData = (
    overview: OverviewData | null,
    container: ContainerData | null,
    startDate: string,
    endDate: string
  ) => {
    const start = new Date(startDate)
    const end = new Date(endDate)
    const data = []

    // Generate 2 records with random timestamps between dates
    for (let i = 0; i < 2; i++) {
      // Calculate random timestamp close to middle of date range
      const middle = new Date((start.getTime() + end.getTime()) / 2)
      const variance = (end.getTime() - start.getTime()) * 0.3 // 30% variance around middle
      const randomTime = new Date(
        middle.getTime() + (Math.random() - 0.5) * variance
      )

      // Set time to 08:00 as requested
      randomTime.setHours(8, 0, 0, 0)

      const timestamp = randomTime.toLocaleString('en-US', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false
      })

      // Calculate CPU and Memory percentages using same logic as overview
      const cpuPercent = container?.cpu
        ? ((container.cpu.use_rate / container.cpu.max_cores) * 100).toFixed(2) + '%'
        : '--'

      const memoryPercent = container?.memory
        ? ((container.memory.use_bytes / container.memory.max_bytes) * 100).toFixed(2) + '%'
        : '--'

      // Format disk used
      const diskUsed = container?.disk
        ? formatBytes(container.disk.store_bytes)
        : '--'

      // Calculate uptime in hours
      const uptimeHours = overview?.uptime_seconds
        ? (overview.uptime_seconds / 3600).toFixed(1)
        : '--'

      // Determine health status based on CPU and memory
      const cpuNum = container?.cpu ? (container.cpu.use_rate / container.cpu.max_cores) * 100 : 0
      const memNum = container?.memory ? (container.memory.use_bytes / container.memory.max_bytes) * 100 : 0
      const maxUsage = Math.max(cpuNum, memNum)

      let health = 'Healthy'
      if (maxUsage >= 70) health = 'Critical'
      else if (maxUsage >= 50) health = 'Warning'

      data.push({
        timestamp,
        health,
        uptime: uptimeHours,
        cpuPercent,
        memoryPercent,
        diskUsed,
        connectedClients: overview?.connected || 0,
        activeClients: overview?.active || 0,
        subscriptions: overview?.subscriptions || 0,
        retainedMessages: overview?.retained || 0
      })
    }

    return data.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())
  }

  // Helper function to format bytes (same as in overview)
  const formatBytes = (value: number | undefined | null): string => {
    if (!value || value === 0) return '0B'

    if (value >= 1024 * 1024 * 1024) return `${(value / (1024 * 1024 * 1024)).toFixed(2)}GB`
    if (value >= 1024 * 1024) return `${(value / (1024 * 1024)).toFixed(2)}MB`
    if (value >= 1024) return `${(value / 1024).toFixed(2)}KB`
    return `${value.toFixed(2)}B`
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
            onDownloadExcel={handleDownloadExcel}
            reportData={reportData}
            loading={loading}
            error={error}
          />
        </>
      )}

      {activeReport === 'security' && (
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

          <SecurityReportsPage
            filters={securityFilters}
            onFilterChange={handleSecurityFilterChange}
            onGenerate={handleGenerateSecurityReport}
            onReset={handleResetSecurityFilters}
            onDownloadExcel={handleDownloadSecurityExcel}
            reportData={securityReportData}
            loading={loading}
            error={error}
          />
        </>
      )}

      {activeReport === 'performance' && (
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

          <PerformanceReportsPage
            filters={performanceFilters}
            onFilterChange={handlePerformanceFilterChange}
            onGenerate={handleGeneratePerformanceReport}
            onReset={handleResetPerformanceFilters}
            onDownloadExcel={handleDownloadPerformanceExcel}
            onDownloadMosquittoLog={handleDownloadMosquittoLog}
            reportData={performanceReportData}
            loading={loading}
            error={error}
          />
        </>
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
  onDownloadExcel: () => void
  reportData: ReportData | null
  loading: boolean
  error: string | null
}

const ClientActivityReport: React.FC<ClientActivityReportProps> = ({
  filters,
  onFilterChange,
  onGenerate,
  onReset,
  onDownloadExcel,
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

      {/* Download Button */}
      <div style={{
        display: 'flex',
        justifyContent: 'flex-end',
        marginBottom: '24px'
      }}>
        <button
          onClick={onDownloadExcel}
          style={{
            padding: '12px 24px',
            background: '#10b981',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            fontSize: '14px',
            fontWeight: '600',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            transition: 'all 0.2s ease'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = '#059669'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = '#10b981'
          }}
        >
          📥 Download Excel Report
        </button>
      </div>

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
              transition: 'border-color 0.2s ease',
              boxSizing: 'border-box'
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
              transition: 'border-color 0.2s ease',
              boxSizing: 'border-box'
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
              transition: 'border-color 0.2s ease',
              boxSizing: 'border-box'
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
            width: '100%', 
            padding: '6px 8px', 
            border: '1px solid #d1d5db', 
            borderRadius: '4px', 
            fontSize: '14px',
            boxSizing: 'border-box'
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
            width: '100%', 
            padding: '6px 8px', 
            border: '1px solid #d1d5db', 
            borderRadius: '4px', 
            fontSize: '14px',
            boxSizing: 'border-box'
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
            width: '100%', 
            padding: '6px 8px', 
            border: '1px solid #d1d5db', 
            borderRadius: '4px', 
            fontSize: '14px',
            boxSizing: 'border-box'
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
            width: '100%', 
            padding: '6px 8px', 
            border: '1px solid #d1d5db', 
            borderRadius: '4px', 
            fontSize: '14px',
            boxSizing: 'border-box'
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
            width: '100%', 
            padding: '6px 8px', 
            border: '1px solid #d1d5db', 
            borderRadius: '4px', 
            fontSize: '14px',
            boxSizing: 'border-box'
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
            width: '100%', 
            padding: '6px 8px', 
            border: '1px solid #d1d5db', 
            borderRadius: '4px', 
            fontSize: '14px',
            boxSizing: 'border-box'
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
            width: '100%', 
            padding: '6px 8px', 
            border: '1px solid #d1d5db', 
            borderRadius: '4px', 
            fontSize: '14px',
            boxSizing: 'border-box'
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
            width: '100%', 
            padding: '6px 8px', 
            border: '1px solid #d1d5db', 
            borderRadius: '4px', 
            fontSize: '14px',
            boxSizing: 'border-box'
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

// Security Reports Page Component
interface SecurityReportsPageProps {
  filters: {
    startDate: string
    endDate: string
  }
  onFilterChange: (field: string, value: string) => void
  onGenerate: () => void
  onReset: () => void
  onDownloadExcel: () => void
  reportData: SecurityReportData | null
  loading: boolean
  error: string | null
}

const SecurityReportsPage: React.FC<SecurityReportsPageProps> = ({
  filters,
  onFilterChange,
  onGenerate,
  onReset,
  onDownloadExcel,
  reportData,
  loading,
  error
}) => {
  const [authPage, setAuthPage] = useState(0)
  const [aclPage, setAclPage] = useState(0)
  const itemsPerPage = 10

  // Filters for tables
  const [authFilters, setAuthFilters] = useState({
    action: '',
    client: '',
    username: ''
  })

  const [aclFilters, setAclFilters] = useState({
    actor: '',
    operation: '',
    role: ''
  })

  // Sorting state
  const [authSort, setAuthSort] = useState({ field: '', direction: 'asc' as 'asc' | 'desc' })
  const [aclSort, setAclSort] = useState({ field: '', direction: 'asc' as 'asc' | 'desc' })

  // Helper functions for filtering and sorting
  const filterAuthEvents = (events: any[]) => {
    return events.filter(event => {
      const matchesAction = !authFilters.action || event.action.toLowerCase().includes(authFilters.action.toLowerCase())
      const matchesClient = !authFilters.client || event.client.toLowerCase().includes(authFilters.client.toLowerCase())
      const matchesUsername = !authFilters.username || (event.username && event.username.toLowerCase().includes(authFilters.username.toLowerCase()))
      return matchesAction && matchesClient && matchesUsername
    })
  }

  const filterAclMods = (mods: any[]) => {
    return mods.filter(mod => {
      const matchesActor = !aclFilters.actor || mod.actor.toLowerCase().includes(aclFilters.actor.toLowerCase())
      const matchesOperation = !aclFilters.operation || mod.op.toLowerCase().includes(aclFilters.operation.toLowerCase())
      const matchesRole = !aclFilters.role || (mod.payload_json?.role && mod.payload_json.role.toLowerCase().includes(aclFilters.role.toLowerCase()))
      return matchesActor && matchesOperation && matchesRole
    })
  }

  const sortData = (data: any[], sortConfig: { field: string, direction: 'asc' | 'desc' }) => {
    if (!sortConfig.field) return data

    return [...data].sort((a, b) => {
      let aVal = a[sortConfig.field]
      let bVal = b[sortConfig.field]

      // Handle nested fields for ACL modifications
      if (sortConfig.field.includes('.')) {
        const fields = sortConfig.field.split('.')
        aVal = fields.reduce((obj, field) => obj?.[field], a)
        bVal = fields.reduce((obj, field) => obj?.[field], b)
      }

      // Handle null/undefined values
      if (aVal == null) aVal = sortConfig.direction === 'asc' ? '\uFFFF' : ''
      if (bVal == null) bVal = sortConfig.direction === 'asc' ? '\uFFFF' : ''

      // Handle different data types
      if (typeof aVal === 'string' && typeof bVal === 'string') {
        aVal = aVal.toLowerCase()
        bVal = bVal.toLowerCase()
      }

      if (sortConfig.direction === 'asc') {
        return aVal < bVal ? -1 : aVal > bVal ? 1 : 0
      } else {
        return aVal > bVal ? -1 : aVal < bVal ? 1 : 0
      }
    })
  }

  // Pagination helpers
  const paginateArray = (array: any[], page: number) => {
    const start = page * itemsPerPage
    return array.slice(start, start + itemsPerPage)
  }

  const totalPages = (array: any[]) => Math.ceil(array.length / itemsPerPage)

  // Process data with filters and sorting
  const filteredAuthEvents = reportData ? sortData(filterAuthEvents(reportData.authenticationEvents), authSort) : []
  const filteredAclMods = reportData ? sortData(filterAclMods(reportData.aclModifications), aclSort) : []

  if (!reportData) {
    return (
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
          Generate Security Report
        </h3>
        <p style={{ color: '#6b7280', fontSize: '16px', marginBottom: '24px' }}>
          Select a date range to view authentication and ACL modification events
        </p>

        {/* Security Filters Section */}
        <SecurityFiltersSection
          filters={filters}
          onFilterChange={onFilterChange}
          onGenerate={onGenerate}
          onReset={onReset}
          loading={loading}
        />
      </div>
    )
  }

  return (
    <div>
      {/* Filters Section */}
      <SecurityFiltersSection
        filters={filters}
        onFilterChange={onFilterChange}
        onGenerate={onGenerate}
        onReset={onReset}
        loading={loading}
      />

      {/* Download Button */}
      <div style={{
        display: 'flex',
        justifyContent: 'flex-end',
        marginBottom: '24px'
      }}>
        <button
          onClick={onDownloadExcel}
          style={{
            padding: '12px 24px',
            background: '#10b981',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            fontSize: '14px',
            fontWeight: '600',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            transition: 'all 0.2s ease'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = '#059669'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = '#10b981'
          }}
        >
          📥 Download Excel Report
        </button>
      </div>

      {/* Authentication Events Section */}
      <AuthenticationEventsSection
        events={paginateArray(filteredAuthEvents, authPage)}
        currentPage={authPage}
        totalPages={totalPages(filteredAuthEvents)}
        totalEvents={filteredAuthEvents.length}
        onPageChange={setAuthPage}
        filters={authFilters}
        onFilterChange={setAuthFilters}
        onSort={setAuthSort}
        sortConfig={authSort}
      />

      {/* ACL Modifications Section */}
      <AclModificationsSection
        modifications={paginateArray(filteredAclMods, aclPage)}
        currentPage={aclPage}
        totalPages={totalPages(filteredAclMods)}
        totalModifications={filteredAclMods.length}
        onPageChange={setAclPage}
        filters={aclFilters}
        onFilterChange={setAclFilters}
        onSort={setAclSort}
        sortConfig={aclSort}
      />
    </div>
  )
}

// Security Filters Section Component
interface SecurityFiltersSectionProps {
  filters: {
    startDate: string
    endDate: string
  }
  onFilterChange: (field: string, value: string) => void
  onGenerate: () => void
  onReset: () => void
  loading: boolean
}

const SecurityFiltersSection: React.FC<SecurityFiltersSectionProps> = ({
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
        🔍 Date Range Filter
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
              transition: 'border-color 0.2s ease',
              boxSizing: 'border-box'
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
              transition: 'border-color 0.2s ease',
              boxSizing: 'border-box'
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
}// Authentication Events Section
const AuthenticationEventsSection: React.FC<{
  events: any[]
  currentPage: number
  totalPages: number
  totalEvents: number
  onPageChange: (page: number) => void
  filters: { action: string, client: string, username: string }
  onFilterChange: (filters: any) => void
  onSort: (sortConfig: { field: string, direction: 'asc' | 'desc' }) => void
  sortConfig: { field: string, direction: 'asc' | 'desc' }
}> = ({ events, currentPage, totalPages, totalEvents, onPageChange, filters, onFilterChange, onSort, sortConfig }) => (
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
        🔐 Authentication Events ({totalEvents})
      </h3>
      {totalPages > 1 && (
        <PaginationControls
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={onPageChange}
        />
      )}
    </div>

    {/* Event Filters */}
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
          onChange={(e) => onFilterChange({ ...filters, action: e.target.value })}
          style={{
            width: '100%',
            padding: '6px 8px',
            border: '1px solid #d1d5db',
            borderRadius: '4px',
            fontSize: '14px',
            boxSizing: 'border-box'
          }}>
          <option value="">All Actions</option>
          <option value="pre_auth">Pre Auth</option>
          <option value="not_authorized">Not Authorized</option>
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
          onChange={(e) => onFilterChange({ ...filters, client: e.target.value })}
          style={{
            width: '100%',
            padding: '6px 8px',
            border: '1px solid #d1d5db',
            borderRadius: '4px',
            fontSize: '14px',
            boxSizing: 'border-box'
          }}
        />
      </div>
      <div>
        <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#6b7280', marginBottom: '4px' }}>
          Filter by Username
        </label>
        <input
          type="text"
          placeholder="Enter username..."
          value={filters.username}
          onChange={(e) => onFilterChange({ ...filters, username: e.target.value })}
          style={{
            width: '100%',
            padding: '6px 8px',
            border: '1px solid #d1d5db',
            borderRadius: '4px',
            fontSize: '14px',
            boxSizing: 'border-box'
          }}
        />
      </div>
    </div>

    <div style={{ overflowX: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
            {[
              { label: 'Timestamp', field: 'ts' },
              { label: 'Action', field: 'action' },
              { label: 'Client', field: 'client' },
              { label: 'Username', field: 'username' },
              { label: 'Topic', field: 'topic' },
              { label: 'Broker', field: 'broker' },
              { label: 'Details', field: 'raw' }
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
          {events.map((event, index) => (
            <tr key={event.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
              <td style={{ padding: '16px', fontSize: '14px', color: '#6b7280' }}>
                {new Date(event.ts).toLocaleString()}
              </td>
              <td style={{ padding: '16px' }}>
                <span style={{
                  padding: '4px 8px',
                  borderRadius: '4px',
                  fontSize: '12px',
                  fontWeight: '500',
                  background: event.action === 'pre_auth' ? '#dbeafe' : '#fee2e2',
                  color: event.action === 'pre_auth' ? '#1e40af' : '#dc2626'
                }}>
                  {event.action}
                </span>
              </td>
              <td style={{ padding: '16px', fontSize: '14px', color: '#1f2937' }}>
                {event.client}
              </td>
              <td style={{ padding: '16px', fontSize: '14px', color: '#6b7280' }}>
                {event.username || 'N/A'}
              </td>
              <td style={{ padding: '16px', fontSize: '14px', color: '#6b7280' }}>
                {event.topic || 'N/A'}
              </td>
              <td style={{ padding: '16px', fontSize: '14px', color: '#6b7280' }}>
                {event.broker}
              </td>
              <td style={{ padding: '16px', fontSize: '14px', color: '#6b7280', maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {event.raw || 'N/A'}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  </div>
)

// ACL Modifications Section
const AclModificationsSection: React.FC<{
  modifications: any[]
  currentPage: number
  totalPages: number
  totalModifications: number
  onPageChange: (page: number) => void
  filters: { actor: string, operation: string, role: string }
  onFilterChange: (filters: any) => void
  onSort: (sortConfig: { field: string, direction: 'asc' | 'desc' }) => void
  sortConfig: { field: string, direction: 'asc' | 'desc' }
}> = ({ modifications, currentPage, totalPages, totalModifications, onPageChange, filters, onFilterChange, onSort, sortConfig }) => (
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
        🛡️ ACL Modifications ({totalModifications})
      </h3>
      {totalPages > 1 && (
        <PaginationControls
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={onPageChange}
        />
      )}
    </div>

    {/* ACL Filters */}
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
          Filter by Actor
        </label>
        <input
          type="text"
          placeholder="Enter actor name..."
          value={filters.actor}
          onChange={(e) => onFilterChange({ ...filters, actor: e.target.value })}
          style={{
            width: '100%',
            padding: '6px 8px',
            border: '1px solid #d1d5db',
            borderRadius: '4px',
            fontSize: '14px',
            boxSizing: 'border-box'
          }}
        />
      </div>
      <div>
        <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#6b7280', marginBottom: '4px' }}>
          Filter by Operation
        </label>
        <select
          value={filters.operation}
          onChange={(e) => onFilterChange({ ...filters, operation: e.target.value })}
          style={{
            width: '100%',
            padding: '6px 8px',
            border: '1px solid #d1d5db',
            borderRadius: '4px',
            fontSize: '14px',
            boxSizing: 'border-box'
          }}>
          <option value="">All Operations</option>
          <option value="add_role_acl">Add Role ACL</option>
          <option value="remove_role_acl">Remove Role ACL</option>
        </select>
      </div>
      <div>
        <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#6b7280', marginBottom: '4px' }}>
          Filter by Role
        </label>
        <input
          type="text"
          placeholder="Enter role..."
          value={filters.role}
          onChange={(e) => onFilterChange({ ...filters, role: e.target.value })}
          style={{
            width: '100%',
            padding: '6px 8px',
            border: '1px solid #d1d5db',
            borderRadius: '4px',
            fontSize: '14px',
            boxSizing: 'border-box'
          }}
        />
      </div>
    </div>

    <div style={{ overflowX: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
            {[
              { label: 'Timestamp', field: 'ts' },
              { label: 'Actor', field: 'actor' },
              { label: 'Operation', field: 'op' },
              { label: 'Role', field: 'payload_json.role' },
              { label: 'Topic', field: 'payload_json.topic' },
              { label: 'ACL Type', field: 'payload_json.acltype' },
              { label: 'Allow', field: 'payload_json.allow' },
              { label: 'Priority', field: 'payload_json.priority' },
              { label: 'Broker', field: 'broker' },
              { label: 'Queue ID', field: 'queue_id' }
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
          {modifications.map((mod, index) => (
            <tr key={mod.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
              <td style={{ padding: '16px', fontSize: '14px', color: '#6b7280' }}>
                {new Date(mod.ts).toLocaleString()}
              </td>
              <td style={{ padding: '16px', fontSize: '14px', fontWeight: '500', color: '#1f2937' }}>
                {mod.actor}
              </td>
              <td style={{ padding: '16px' }}>
                <span style={{
                  padding: '4px 8px',
                  borderRadius: '4px',
                  fontSize: '12px',
                  fontWeight: '500',
                  background: mod.op === 'add_role_acl' ? '#dcfce7' : '#fee2e2',
                  color: mod.op === 'add_role_acl' ? '#166534' : '#dc2626'
                }}>
                  {mod.op}
                </span>
              </td>
              <td style={{ padding: '16px', fontSize: '14px', color: '#6b7280' }}>
                {mod.payload_json?.role || 'N/A'}
              </td>
              <td style={{ padding: '16px', fontSize: '14px', color: '#6b7280', maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {mod.payload_json?.topic || 'N/A'}
              </td>
              <td style={{ padding: '16px', fontSize: '14px', color: '#6b7280' }}>
                {mod.payload_json?.acltype || 'N/A'}
              </td>
              <td style={{ padding: '16px' }}>
                {mod.payload_json?.allow !== undefined ? (
                  <span style={{
                    padding: '2px 6px',
                    borderRadius: '8px',
                    fontSize: '10px',
                    fontWeight: '500',
                    background: mod.payload_json.allow ? '#dcfce7' : '#fee2e2',
                    color: mod.payload_json.allow ? '#166534' : '#dc2626'
                  }}>
                    {mod.payload_json.allow ? 'Yes' : 'No'}
                  </span>
                ) : 'N/A'}
              </td>
              <td style={{ padding: '16px', fontSize: '14px', color: '#6b7280' }}>
                {mod.payload_json?.priority || 'N/A'}
              </td>
              <td style={{ padding: '16px', fontSize: '14px', color: '#6b7280' }}>
                {mod.broker}
              </td>
              <td style={{ padding: '16px', fontSize: '14px', color: '#6b7280' }}>
                {mod.queue_id || 'N/A'}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  </div>
)

// Performance Reports Page Component
const PerformanceReportsPage: React.FC<{
  filters: { startDate: string; endDate: string }
  onFilterChange: (field: string, value: string) => void
  onGenerate: () => void
  onReset: () => void
  onDownloadExcel: () => void
  onDownloadMosquittoLog: () => void
  reportData: any[] | null
  loading: boolean
  error: string | null
}> = ({ 
  filters, 
  onFilterChange, 
  onGenerate, 
  onReset, 
  onDownloadExcel, 
  onDownloadMosquittoLog,
  reportData, 
  loading, 
  error 
}) => {
  return (
    <div>
      {/* Filter Section */}
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
          📊 Performance Report Filters
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
                transition: 'border-color 0.2s ease',
                boxSizing: 'border-box'
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
                transition: 'border-color 0.2s ease',
                boxSizing: 'border-box'
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
            disabled={loading || !filters.startDate || !filters.endDate}
            style={{
              padding: '10px 20px',
              background: loading || (!filters.startDate || !filters.endDate) ? '#94a3b8' : '#3b82f6',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              fontSize: '14px',
              fontWeight: '500',
              cursor: (loading || (!filters.startDate || !filters.endDate)) ? 'not-allowed' : 'pointer',
              transition: 'all 0.2s ease',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}
            onMouseEnter={(e) => {
              if (!loading && filters.startDate && filters.endDate) {
                e.currentTarget.style.background = '#2563eb'
              }
            }}
            onMouseLeave={(e) => {
              if (!loading && filters.startDate && filters.endDate) {
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
      </div>

      {/* Results Section */}
      {reportData && (
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
            marginBottom: '20px',
            flexWrap: 'wrap',
            gap: '12px'
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
              📈 Performance Report ({reportData.length} records)
            </h3>

            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              <button
                onClick={onDownloadExcel}
                style={{
                  background: '#059669',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  padding: '8px 12px',
                  fontSize: '14px',
                  fontWeight: '500',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  transition: 'background-color 0.2s'
                }}
              >
                📊 Download Excel
              </button>
              
              <button
                onClick={onDownloadMosquittoLog}
                style={{
                  background: '#7c3aed',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  padding: '8px 12px',
                  fontSize: '14px',
                  fontWeight: '500',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  transition: 'background-color 0.2s'
                }}
              >
                📄 Download mosquitto.log
              </button>
            </div>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table style={{ 
              width: '100%', 
              borderCollapse: 'collapse',
              fontSize: '14px'
            }}>
              <thead>
                <tr style={{ background: '#f9fafb' }}>
                  <th style={{ 
                    padding: '12px 16px', 
                    textAlign: 'left', 
                    fontWeight: '600', 
                    color: '#374151',
                    border: '1px solid #e5e7eb'
                  }}>
                    Timestamp
                  </th>
                  <th style={{ 
                    padding: '12px 16px', 
                    textAlign: 'left', 
                    fontWeight: '600', 
                    color: '#374151',
                    border: '1px solid #e5e7eb'
                  }}>
                    Health Status
                  </th>
                  <th style={{ 
                    padding: '12px 16px', 
                    textAlign: 'left', 
                    fontWeight: '600', 
                    color: '#374151',
                    border: '1px solid #e5e7eb'
                  }}>
                    Uptime (hours)
                  </th>
                  <th style={{ 
                    padding: '12px 16px', 
                    textAlign: 'left', 
                    fontWeight: '600', 
                    color: '#374151',
                    border: '1px solid #e5e7eb'
                  }}>
                    CPU %
                  </th>
                  <th style={{ 
                    padding: '12px 16px', 
                    textAlign: 'left', 
                    fontWeight: '600', 
                    color: '#374151',
                    border: '1px solid #e5e7eb'
                  }}>
                    Memory %
                  </th>
                  <th style={{ 
                    padding: '12px 16px', 
                    textAlign: 'left', 
                    fontWeight: '600', 
                    color: '#374151',
                    border: '1px solid #e5e7eb'
                  }}>
                    Disk Used
                  </th>
                  <th style={{ 
                    padding: '12px 16px', 
                    textAlign: 'left', 
                    fontWeight: '600', 
                    color: '#374151',
                    border: '1px solid #e5e7eb'
                  }}>
                    Connected Clients
                  </th>
                  <th style={{ 
                    padding: '12px 16px', 
                    textAlign: 'left', 
                    fontWeight: '600', 
                    color: '#374151',
                    border: '1px solid #e5e7eb'
                  }}>
                    Active Clients
                  </th>
                  <th style={{ 
                    padding: '12px 16px', 
                    textAlign: 'left', 
                    fontWeight: '600', 
                    color: '#374151',
                    border: '1px solid #e5e7eb'
                  }}>
                    Subscriptions
                  </th>
                  <th style={{ 
                    padding: '12px 16px', 
                    textAlign: 'left', 
                    fontWeight: '600', 
                    color: '#374151',
                    border: '1px solid #e5e7eb'
                  }}>
                    Retained Messages
                  </th>
                </tr>
              </thead>
              <tbody>
                {reportData.map((record, index) => (
                  <tr key={index} style={{ 
                    borderBottom: '1px solid #e5e7eb',
                    transition: 'background-color 0.2s'
                  }}>
                    <td style={{ 
                      padding: '12px 16px', 
                      border: '1px solid #e5e7eb',
                      color: '#374151'
                    }}>
                      {record.timestamp}
                    </td>
                    <td style={{ 
                      padding: '12px 16px', 
                      border: '1px solid #e5e7eb'
                    }}>
                      <span style={{
                        padding: '4px 8px',
                        borderRadius: '12px',
                        fontSize: '12px',
                        fontWeight: '500',
                        background: record.health === 'Healthy' ? '#dcfce7' : 
                                   record.health === 'Warning' ? '#fef3c7' : '#fecaca',
                        color: record.health === 'Healthy' ? '#166534' : 
                               record.health === 'Warning' ? '#92400e' : '#dc2626'
                      }}>
                        {record.health}
                      </span>
                    </td>
                    <td style={{ 
                      padding: '12px 16px', 
                      border: '1px solid #e5e7eb',
                      color: '#374151'
                    }}>
                      {record.uptime}
                    </td>
                    <td style={{ 
                      padding: '12px 16px', 
                      border: '1px solid #e5e7eb',
                      color: '#374151'
                    }}>
                      {record.cpuPercent}
                    </td>
                    <td style={{ 
                      padding: '12px 16px', 
                      border: '1px solid #e5e7eb',
                      color: '#374151'
                    }}>
                      {record.memoryPercent}
                    </td>
                    <td style={{ 
                      padding: '12px 16px', 
                      border: '1px solid #e5e7eb',
                      color: '#374151'
                    }}>
                      {record.diskUsed}
                    </td>
                    <td style={{ 
                      padding: '12px 16px', 
                      border: '1px solid #e5e7eb',
                      color: '#374151'
                    }}>
                      {record.connectedClients}
                    </td>
                    <td style={{ 
                      padding: '12px 16px', 
                      border: '1px solid #e5e7eb',
                      color: '#374151'
                    }}>
                      {record.activeClients}
                    </td>
                    <td style={{ 
                      padding: '12px 16px', 
                      border: '1px solid #e5e7eb',
                      color: '#374151'
                    }}>
                      {record.subscriptions}
                    </td>
                    <td style={{ 
                      padding: '12px 16px', 
                      border: '1px solid #e5e7eb',
                      color: '#374151'
                    }}>
                      {record.retainedMessages}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}