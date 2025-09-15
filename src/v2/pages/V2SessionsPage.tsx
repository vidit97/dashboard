import React, { useState, useEffect, useCallback } from 'react'
import { useGlobalState } from '../hooks/useGlobalState'
import { GreApiService } from '../../services/greApi'
import { Session, Event } from '../../types/api'
// Reusing existing GRE components
import SessionReliability from '../../components/SessionReliability'
import RecentConnectDisconnects from '../../components/RecentConnectDisconnects'
import ClientGantt from '../../components/ClientGantt'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'

interface SessionWithDuration extends Session {
  duration?: string
  ip_port: string
}

interface SessionChartData {
  time: string
  connects: number
  disconnects: number
  net: number
}

interface TimeRange {
  label: string
  hours: number
  granularityMinutes: number
}

const TIME_RANGES: TimeRange[] = [
  { label: '1h', hours: 1, granularityMinutes: 5 },
  { label: '6h', hours: 6, granularityMinutes: 15 },
  { label: '24h', hours: 24, granularityMinutes: 60 },
  { label: '7d', hours: 168, granularityMinutes: 60 }
]

export const V2SessionsPage: React.FC = () => {
  const { state } = useGlobalState()
  const [sessions, setSessions] = useState<SessionWithDuration[]>([])
  const [filteredSessions, setFilteredSessions] = useState<SessionWithDuration[]>([])
  const [chartData, setChartData] = useState<SessionChartData[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)
  const [selectedTimeRange, setSelectedTimeRange] = useState<TimeRange>(TIME_RANGES[2])

  // Filter states
  const [openOnly, setOpenOnly] = useState(false)
  const [ipFilter, setIpFilter] = useState('')
  const [protocolFilter, setProtocolFilter] = useState('')
  const [clientFilter, setClientFilter] = useState('')
  const [usernameFilter, setUsernameFilter] = useState('')
  const [sessionTimeRange, setSessionTimeRange] = useState('all') // all, 1h, 24h, 7d
  const [sessionStatus, setSessionStatus] = useState('all') // all, active, ended
  const [currentPage, setCurrentPage] = useState(0)
  const [pageSize] = useState(20)

  // Fetch sessions and events data
  const fetchSessionsData = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

      // Get sessions data
      const sessionsResult = await GreApiService.getSessionsPaginated({
        limit: 10000, // Increased limit to get all sessions
        offset: 0,
        sortColumn: 'start_ts',
        sortDirection: 'desc'
      })

      // Enhance sessions with duration and ip_port
      const enhancedSessions: SessionWithDuration[] = sessionsResult.data.map(session => {
        let duration = 'ongoing'
        if (session.end_ts) {
          const startTime = new Date(session.start_ts).getTime()
          const endTime = new Date(session.end_ts).getTime()
          const durationMs = endTime - startTime
          const minutes = Math.floor(durationMs / 60000)
          const seconds = Math.floor((durationMs % 60000) / 1000)
          duration = minutes > 0 ? `${minutes}m ${seconds}s` : `${seconds}s`
        }

        return {
          ...session,
          duration,
          ip_port: `${session.ip_address || 'N/A'}:${session.port || 'N/A'}`
        }
      })

      setSessions(enhancedSessions)

      // Fetch connection events for chart based on selected time range
      try {
        const endTime = new Date()
        const startTime = new Date()
        startTime.setHours(startTime.getHours() - selectedTimeRange.hours)

        const eventsResult = await GreApiService.getEventsPaginated({
          limit: 10000,
          offset: 0,
          filters: {
            'ts': `gte.${startTime.toISOString()}`,
            'action': 'in.(connected,disconnected)'
          },
          sortColumn: 'ts',
          sortDirection: 'asc'
        })

        // Process events into chart data
        const intervals = Math.ceil(selectedTimeRange.hours * 60 / selectedTimeRange.granularityMinutes)
        const chartDataPoints: SessionChartData[] = []

        for (let i = 0; i < intervals; i++) {
          const intervalStart = new Date(startTime.getTime() + i * selectedTimeRange.granularityMinutes * 60000)
          const intervalEnd = new Date(intervalStart.getTime() + selectedTimeRange.granularityMinutes * 60000)

          const intervalEvents = eventsResult.data.filter(event => {
            const eventTime = new Date(event.ts).getTime()
            return eventTime >= intervalStart.getTime() && eventTime < intervalEnd.getTime()
          })

          const connects = intervalEvents.filter(e => e.action === 'connected').length
          const disconnects = intervalEvents.filter(e => e.action === 'disconnected').length

          chartDataPoints.push({
            time: intervalStart.toLocaleTimeString('en-US', {
              hour: '2-digit',
              minute: '2-digit',
              hour12: false
            }),
            connects,
            disconnects,
            net: connects - disconnects
          })
        }

        setChartData(chartDataPoints)
      } catch (chartError) {
        console.error('Error fetching chart data:', chartError)
        setChartData([])
      }

      setLastUpdated(new Date())
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to fetch sessions data'
      setError(errorMsg)
      console.error('Error fetching sessions data:', err)
    } finally {
      setLoading(false)
    }
  }, [selectedTimeRange])

  // Apply filters to sessions
  useEffect(() => {
    let filtered = [...sessions]

    if (openOnly) {
      filtered = filtered.filter(session => !session.end_ts)
    }

    if (sessionStatus !== 'all') {
      if (sessionStatus === 'active') {
        filtered = filtered.filter(session => !session.end_ts)
      } else if (sessionStatus === 'ended') {
        filtered = filtered.filter(session => session.end_ts)
      }
    }

    if (sessionTimeRange !== 'all') {
      const now = new Date()
      let timeLimit: Date

      switch (sessionTimeRange) {
        case '1h':
          timeLimit = new Date(now.getTime() - 60 * 60 * 1000)
          break
        case '24h':
          timeLimit = new Date(now.getTime() - 24 * 60 * 60 * 1000)
          break
        case '7d':
          timeLimit = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
          break
        default:
          timeLimit = new Date(0)
      }

      filtered = filtered.filter(session => new Date(session.start_ts) >= timeLimit)
    }

    if (ipFilter.trim()) {
      const ipSearch = ipFilter.toLowerCase().trim()
      filtered = filtered.filter(session =>
        (session.ip_address || '').toLowerCase().includes(ipSearch)
      )
    }

    if (protocolFilter.trim()) {
      const protocolSearch = protocolFilter.toLowerCase().trim()
      filtered = filtered.filter(session =>
        (session.protocol_version || '').toLowerCase().includes(protocolSearch)
      )
    }

    if (clientFilter.trim()) {
      const clientSearch = clientFilter.toLowerCase().trim()
      filtered = filtered.filter(session =>
        session.client.toLowerCase().includes(clientSearch)
      )
    }

    if (usernameFilter.trim()) {
      const usernameSearch = usernameFilter.toLowerCase().trim()
      filtered = filtered.filter(session =>
        (session.username || '').toLowerCase().includes(usernameSearch)
      )
    }

    setFilteredSessions(filtered)
    setCurrentPage(0)
  }, [sessions, openOnly, ipFilter, protocolFilter, clientFilter, usernameFilter, sessionTimeRange, sessionStatus])

  useEffect(() => {
    fetchSessionsData()

    if (state.autoRefresh) {
      const interval = setInterval(fetchSessionsData, state.refreshInterval * 1000)
      return () => clearInterval(interval)
    }
  }, [fetchSessionsData, state.autoRefresh, state.refreshInterval])

  const totalPages = Math.ceil(filteredSessions.length / pageSize)
  const startIndex = currentPage * pageSize
  const paginatedSessions = filteredSessions.slice(startIndex, startIndex + pageSize)

  const formatTimestamp = (timestamp: string) => {
    return new Date(timestamp).toLocaleString('en-US', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false
    })
  }

  return (
    <div>
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

      {/* Error Display */}
      {error && (
        <div style={{
          background: '#fef2f2',
          border: '1px solid #fecaca',
          borderRadius: '8px',
          padding: '16px',
          marginBottom: '24px'
        }}>
          <div style={{ color: '#dc2626', fontWeight: '500', marginBottom: '8px' }}>
            Error loading sessions data
          </div>
          <div style={{ color: '#7f1d1d', fontSize: '14px' }}>
            {error}
          </div>
          <button
            onClick={fetchSessionsData}
            style={{
              marginTop: '12px',
              padding: '8px 16px',
              background: '#dc2626',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              fontSize: '14px',
              cursor: 'pointer'
            }}
          >
            Retry
          </button>
        </div>
      )}

      {/* Session Starts/Stops Chart */}
      <div style={{ marginBottom: '32px' }}>
        <div style={{
          background: 'white',
          borderRadius: '12px',
          padding: '24px',
          border: '1px solid #e5e7eb',
          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)'
        }}>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '16px'
          }}>
            <h2 style={{
              margin: 0,
              fontSize: '20px',
              fontWeight: '600',
              color: '#1f2937'
            }}>
              Session Starts/Stops Rate (Last {selectedTimeRange.label})
            </h2>

            <div style={{ display: 'flex', gap: '8px' }}>
              {TIME_RANGES.map((range) => (
                <button
                  key={range.label}
                  onClick={() => setSelectedTimeRange(range)}
                  style={{
                    padding: '6px 12px',
                    background: selectedTimeRange.label === range.label ? '#3b82f6' : '#f3f4f6',
                    color: selectedTimeRange.label === range.label ? 'white' : '#374151',
                    border: '1px solid #d1d5db',
                    borderRadius: '6px',
                    fontSize: '14px',
                    cursor: 'pointer'
                  }}
                >
                  {range.label}
                </button>
              ))}
            </div>
          </div>

          <div style={{ height: '300px' }}>
            {chartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="time" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="connects"
                    stroke="#10b981"
                    strokeWidth={2}
                    name="Connects"
                  />
                  <Line
                    type="monotone"
                    dataKey="disconnects"
                    stroke="#ef4444"
                    strokeWidth={2}
                    name="Disconnects"
                  />
                  <Line
                    type="monotone"
                    dataKey="net"
                    stroke="#3b82f6"
                    strokeWidth={2}
                    name="Net Change"
                  />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div style={{
                height: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#6b7280'
              }}>
                {loading ? 'Loading chart data...' : 'No chart data available'}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Session Components Row */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))',
        gap: '24px',
        marginBottom: '32px'
      }}>
        <SessionReliability
          className="session-reliability-chart"
          refreshInterval={120}
        />
        <RecentConnectDisconnects
          className="recent-connects-chart"
          refreshInterval={60}
        />
      </div>

      {/* Client Gantt Chart */}
      <div style={{ marginBottom: '32px' }}>
        <div style={{
          background: 'white',
          borderRadius: '12px',
          padding: '24px',
          border: '1px solid #e5e7eb',
          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)'
        }}>
          <ClientGantt
            className="client-gantt-chart"
            refreshInterval={30}
          />
        </div>
      </div>

      {/* Filters */}
      <div style={{
        background: 'white',
        borderRadius: '12px',
        border: '1px solid #e5e7eb',
        padding: '20px',
        marginBottom: '24px'
      }}>
        <h3 style={{ margin: '0 0 16px 0', fontSize: '18px', fontWeight: '600' }}>
          Session Filters
        </h3>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '16px',
          marginBottom: '16px'
        }}>
          <input
            type="text"
            placeholder="Filter by client..."
            value={clientFilter}
            onChange={(e) => setClientFilter(e.target.value)}
            style={{
              padding: '8px 12px',
              border: '1px solid #d1d5db',
              borderRadius: '6px',
              fontSize: '14px'
            }}
          />

          <input
            type="text"
            placeholder="Filter by username..."
            value={usernameFilter}
            onChange={(e) => setUsernameFilter(e.target.value)}
            style={{
              padding: '8px 12px',
              border: '1px solid #d1d5db',
              borderRadius: '6px',
              fontSize: '14px'
            }}
          />

          <input
            type="text"
            placeholder="Filter by IP..."
            value={ipFilter}
            onChange={(e) => setIpFilter(e.target.value)}
            style={{
              padding: '8px 12px',
              border: '1px solid #d1d5db',
              borderRadius: '6px',
              fontSize: '14px'
            }}
          />

          <input
            type="text"
            placeholder="Filter by protocol..."
            value={protocolFilter}
            onChange={(e) => setProtocolFilter(e.target.value)}
            style={{
              padding: '8px 12px',
              border: '1px solid #d1d5db',
              borderRadius: '6px',
              fontSize: '14px'
            }}
          />

          <select
            value={sessionTimeRange}
            onChange={(e) => setSessionTimeRange(e.target.value)}
            style={{
              padding: '8px 12px',
              border: '1px solid #d1d5db',
              borderRadius: '6px',
              fontSize: '14px'
            }}
          >
            <option value="all">All Time</option>
            <option value="1h">Last Hour</option>
            <option value="24h">Last 24 Hours</option>
            <option value="7d">Last 7 Days</option>
          </select>

          <select
            value={sessionStatus}
            onChange={(e) => setSessionStatus(e.target.value)}
            style={{
              padding: '8px 12px',
              border: '1px solid #d1d5db',
              borderRadius: '6px',
              fontSize: '14px'
            }}
          >
            <option value="all">All Sessions</option>
            <option value="active">Active Only</option>
            <option value="ended">Ended Only</option>
          </select>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px' }}>
            <input
              type="checkbox"
              checked={openOnly}
              onChange={(e) => setOpenOnly(e.target.checked)}
            />
            Show open sessions only
          </label>

          <div style={{ fontSize: '14px', color: '#6b7280' }}>
            {filteredSessions.length} session{filteredSessions.length !== 1 ? 's' : ''} found
          </div>
        </div>
      </div>

      {/* Sessions Table */}
      <div style={{
        background: 'white',
        borderRadius: '12px',
        border: '1px solid #e5e7eb',
        overflow: 'hidden'
      }}>
        <div style={{ padding: '20px', borderBottom: '1px solid #e5e7eb' }}>
          <h2 style={{ margin: 0, fontSize: '20px', fontWeight: '600' }}>
            Session Details ({filteredSessions.length})
          </h2>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#f8fafc' }}>
                <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: '600', textTransform: 'uppercase', color: '#6b7280' }}>Client</th>
                <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: '600', textTransform: 'uppercase', color: '#6b7280' }}>Username</th>
                <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: '600', textTransform: 'uppercase', color: '#6b7280' }}>IP:Port</th>
                <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: '600', textTransform: 'uppercase', color: '#6b7280' }}>Protocol</th>
                <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: '600', textTransform: 'uppercase', color: '#6b7280' }}>Start Time</th>
                <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: '600', textTransform: 'uppercase', color: '#6b7280' }}>End Time</th>
                <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: '600', textTransform: 'uppercase', color: '#6b7280' }}>Duration</th>
                <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: '600', textTransform: 'uppercase', color: '#6b7280' }}>Status</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={8} style={{ padding: '32px', textAlign: 'center', color: '#6b7280' }}>
                    Loading sessions...
                  </td>
                </tr>
              ) : paginatedSessions.length === 0 ? (
                <tr>
                  <td colSpan={8} style={{ padding: '32px', textAlign: 'center', color: '#6b7280' }}>
                    No sessions found
                  </td>
                </tr>
              ) : (
                paginatedSessions.map((session) => (
                  <tr
                    key={session.id}
                    style={{ borderBottom: '1px solid #f1f5f9' }}
                  >
                    <td style={{ padding: '16px', fontWeight: '500', color: '#1f2937' }}>
                      {session.client}
                    </td>
                    <td style={{ padding: '16px', color: '#6b7280' }}>
                      {session.username || '-'}
                    </td>
                    <td style={{ padding: '16px', color: '#6b7280', fontFamily: 'monospace', fontSize: '13px' }}>
                      {session.ip_port}
                    </td>
                    <td style={{ padding: '16px', color: '#6b7280' }}>
                      {session.protocol_version || '-'}
                    </td>
                    <td style={{ padding: '16px', color: '#6b7280', fontSize: '14px' }}>
                      {formatTimestamp(session.start_ts)}
                    </td>
                    <td style={{ padding: '16px', color: '#6b7280', fontSize: '14px' }}>
                      {session.end_ts ? formatTimestamp(session.end_ts) : '-'}
                    </td>
                    <td style={{ padding: '16px', color: '#6b7280' }}>
                      {session.duration}
                    </td>
                    <td style={{ padding: '16px' }}>
                      <span style={{
                        padding: '4px 8px',
                        borderRadius: '12px',
                        fontSize: '12px',
                        fontWeight: '500',
                        background: session.end_ts ? '#fee2e2' : '#d1fae5',
                        color: session.end_ts ? '#991b1b' : '#065f46'
                      }}>
                        {session.end_ts ? 'Ended' : 'Active'}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {!loading && filteredSessions.length > pageSize && (
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '16px 20px',
            borderTop: '1px solid #e5e7eb',
            background: '#f8f9fa'
          }}>
            <div style={{ fontSize: '14px', color: '#6b7280' }}>
              Showing {startIndex + 1}-{Math.min(startIndex + pageSize, filteredSessions.length)} of {filteredSessions.length}
            </div>

            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                onClick={() => setCurrentPage(Math.max(0, currentPage - 1))}
                disabled={currentPage === 0}
                style={{
                  padding: '6px 12px',
                  background: currentPage === 0 ? '#f3f4f6' : '#fff',
                  border: '1px solid #d1d5db',
                  borderRadius: '4px',
                  fontSize: '14px',
                  cursor: currentPage === 0 ? 'not-allowed' : 'pointer'
                }}
              >
                Previous
              </button>

              <span style={{ padding: '6px 12px', fontSize: '14px', color: '#6b7280' }}>
                Page {currentPage + 1} of {totalPages}
              </span>

              <button
                onClick={() => setCurrentPage(Math.min(totalPages - 1, currentPage + 1))}
                disabled={currentPage >= totalPages - 1}
                style={{
                  padding: '6px 12px',
                  background: currentPage >= totalPages - 1 ? '#f3f4f6' : '#fff',
                  border: '1px solid #d1d5db',
                  borderRadius: '4px',
                  fontSize: '14px',
                  cursor: currentPage >= totalPages - 1 ? 'not-allowed' : 'pointer'
                }}
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Last Updated */}
      {lastUpdated && (
        <div style={{
          fontSize: '12px',
          color: '#6b7280',
          textAlign: 'center',
          marginTop: '16px'
        }}>
          Last updated: {lastUpdated.toLocaleString()}
        </div>
      )}
    </div>
  )
}