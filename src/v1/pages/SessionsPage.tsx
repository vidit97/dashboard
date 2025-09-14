import React, { useState, useEffect, useCallback } from 'react'
import { useGlobalState } from '../hooks/useGlobalState'
import { GreApiService } from '../../services/greApi'
import { Session, Event } from '../../types/api'
// Reusing existing GRE components
import SessionReliability from '../../components/SessionReliability'
import RecentSessions from '../../components/RecentSessions'
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

export const SessionsPage: React.FC = () => {
  const { state } = useGlobalState()
  const [sessions, setSessions] = useState<SessionWithDuration[]>([])
  const [filteredSessions, setFilteredSessions] = useState<SessionWithDuration[]>([])
  const [chartData, setChartData] = useState<SessionChartData[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)

  // Filter states
  const [openOnly, setOpenOnly] = useState(false)
  const [ipFilter, setIpFilter] = useState('')
  const [protocolFilter, setProtocolFilter] = useState('')
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

      // Fetch connection events for chart (last 24 hours)
      try {
        const yesterday = new Date()
        yesterday.setHours(yesterday.getHours() - 24)

        const eventsResult = await GreApiService.getEventsPaginated({
          limit: 10000,
          offset: 0,
          filters: {
            'action': 'in.(connected,disconnected)',
            'ts': `gte.${yesterday.toISOString()}`
          },
          sortColumn: 'ts',
          sortDirection: 'asc'
        })

        // Group events by hour for chart
        const eventsByHour = new Map<string, { connects: number; disconnects: number }>()

        eventsResult.data.forEach(event => {
          const hour = event.ts.substring(0, 13) + ':00:00' // Group by hour
          if (!eventsByHour.has(hour)) {
            eventsByHour.set(hour, { connects: 0, disconnects: 0 })
          }

          const hourData = eventsByHour.get(hour)!
          if (event.action === 'connected') {
            hourData.connects++
          } else if (event.action === 'disconnected') {
            hourData.disconnects++
          }
        })

        // Convert to chart data format
        const chartDataArray: SessionChartData[] = Array.from(eventsByHour.entries())
          .map(([time, data]) => ({
            time: new Date(time).toLocaleTimeString('en-US', {
              hour: '2-digit',
              minute: '2-digit',
              hour12: false
            }),
            connects: data.connects,
            disconnects: data.disconnects,
            net: data.connects - data.disconnects
          }))
          .sort((a, b) => a.time.localeCompare(b.time))

        setChartData(chartDataArray)
      } catch (chartError) {
        console.warn('Failed to fetch events for chart:', chartError)
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
  }, [])

  // Filter sessions based on current filters
  useEffect(() => {
    let filtered = sessions

    if (openOnly) {
      filtered = filtered.filter(session => !session.end_ts)
    }

    if (ipFilter) {
      filtered = filtered.filter(session =>
        session.ip_address && session.ip_address.includes(ipFilter)
      )
    }

    if (protocolFilter) {
      filtered = filtered.filter(session =>
        session.protocol_version && session.protocol_version.includes(protocolFilter)
      )
    }

    setFilteredSessions(filtered)
    setCurrentPage(0)
  }, [sessions, openOnly, ipFilter, protocolFilter])

  useEffect(() => {
    fetchSessionsData()

    // Only set up interval if auto-refresh is enabled
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
          <h2 style={{
            margin: '0 0 16px 0',
            fontSize: '20px',
            fontWeight: '600',
            color: '#1f2937'
          }}>
            Session Starts/Stops Rate (Last 24h)
          </h2>

          {chartData.length > 0 ? (
            <div style={{ height: '300px' }}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis
                    dataKey="time"
                    tick={{ fontSize: 12 }}
                  />
                  <YAxis tick={{ fontSize: 12 }} />
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
                    strokeDasharray="5 5"
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div style={{
              height: '200px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#6b7280'
            }}>
              {loading ? 'Loading chart data...' : 'No connection events found in the last 24 hours'}
            </div>
          )}
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
              Session History ({filteredSessions.length})
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
              <input
                type="checkbox"
                checked={openOnly}
                onChange={(e) => setOpenOnly(e.target.checked)}
              />
              Open only
            </label>

            <input
              type="text"
              placeholder="IP prefix (e.g., 192.168.1)"
              value={ipFilter}
              onChange={(e) => setIpFilter(e.target.value)}
              style={{
                padding: '6px 12px',
                border: '1px solid #d1d5db',
                borderRadius: '6px',
                fontSize: '14px',
                minWidth: '200px'
              }}
            />

            <select
              value={protocolFilter}
              onChange={(e) => setProtocolFilter(e.target.value)}
              style={{
                padding: '6px 12px',
                border: '1px solid #d1d5db',
                borderRadius: '6px',
                fontSize: '14px'
              }}
            >
              <option value="">All Protocol Versions</option>
              <option value="3.1">MQTT 3.1</option>
              <option value="3.1.1">MQTT 3.1.1</option>
              <option value="5.0">MQTT 5.0</option>
            </select>

            <div style={{ fontSize: '14px', color: '#6b7280' }}>
              {filteredSessions.length} session{filteredSessions.length !== 1 ? 's' : ''} found
            </div>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#f8fafc' }}>
                  <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: '600', textTransform: 'uppercase', color: '#6b7280' }}>Start Time</th>
                  <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: '600', textTransform: 'uppercase', color: '#6b7280' }}>End Time</th>
                  <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: '600', textTransform: 'uppercase', color: '#6b7280' }}>Duration</th>
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
                {loading ? (
                  <tr>
                    <td colSpan={10} style={{ padding: '32px', textAlign: 'center', color: '#6b7280' }}>
                      Loading sessions...
                    </td>
                  </tr>
                ) : paginatedSessions.length === 0 ? (
                  <tr>
                    <td colSpan={10} style={{ padding: '32px', textAlign: 'center', color: '#6b7280' }}>
                      No sessions found
                    </td>
                  </tr>
                ) : (
                  paginatedSessions.map((session) => (
                    <tr key={session.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <td style={{ padding: '16px', color: '#1f2937', fontSize: '14px' }}>
                        {formatTimestamp(session.start_ts)}
                      </td>
                      <td style={{ padding: '16px', fontSize: '14px' }}>
                        {session.end_ts ? (
                          <span style={{ color: '#1f2937' }}>
                            {formatTimestamp(session.end_ts)}
                          </span>
                        ) : (
                          <span style={{ color: '#10b981', fontWeight: '500' }}>
                            open
                          </span>
                        )}
                      </td>
                      <td style={{ padding: '16px', color: '#6b7280', fontSize: '14px' }}>
                        {session.duration}
                      </td>
                      <td style={{ padding: '16px', color: '#1f2937', fontWeight: '500', maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {session.client}
                      </td>
                      <td style={{ padding: '16px', color: '#6b7280' }}>
                        {session.username || '-'}
                      </td>
                      <td style={{ padding: '16px', color: '#6b7280', fontSize: '14px' }}>
                        {session.ip_port}
                      </td>
                      <td style={{ padding: '16px', color: '#6b7280', fontSize: '14px' }}>
                        {session.protocol_version || '-'}
                      </td>
                      <td style={{ padding: '16px', color: '#6b7280', fontSize: '14px' }}>
                        {session.clean_session !== null ? (session.clean_session ? 'true' : 'false') : '-'}
                      </td>
                      <td style={{ padding: '16px', color: '#6b7280', fontSize: '14px' }}>
                        {session.keepalive ? `${session.keepalive}s` : '-'}
                      </td>
                      <td style={{ padding: '16px', color: '#6b7280', fontSize: '14px' }}>
                        {session.tls_version && session.tls_cipher
                          ? `${session.tls_version} / ${session.tls_cipher}`
                          : session.tls_version || 'None'
                        }
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