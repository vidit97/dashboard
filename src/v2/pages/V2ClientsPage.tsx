import React, { useState, useEffect, useCallback } from 'react'
import { useGlobalState } from '../hooks/useGlobalState'
import { MetricCard } from '../../ui/StatCards'
import { GreApiService } from '../../services/greApi'
import { Session, Client, Subscription } from '../../types/api'

interface ClientWithSession extends Client {
  session_state: 'open' | 'closed'
  last_seen: string
  ip_port: string
  protocol_ver: string | null
  keepalive: number | null
  subs_count: number
  pubs_24h: number
  bytes_24h: number
  drops_24h: number
  current_session?: Session
  active_subscriptions?: Subscription[]
}

export const V2ClientsPage: React.FC = () => {
  const { state } = useGlobalState()
  const [connectedUsersCount, setConnectedUsersCount] = useState(0)
  const [topUsers, setTopUsers] = useState<Array<[string, number]>>([])
  const [clients, setClients] = useState<ClientWithSession[]>([])
  const [filteredClients, setFilteredClients] = useState<ClientWithSession[]>([])
  const [selectedClient, setSelectedClient] = useState<ClientWithSession | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)
  const [totalClientsCount, setTotalClientsCount] = useState(0)

  // Filter states
  const [searchText, setSearchText] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | 'open' | 'closed'>('all')
  const [currentPage, setCurrentPage] = useState(0)
  const [pageSize] = useState(20)

  // Optimized approach: Load metrics first, then paginated table data
  const fetchMetricsData = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

      // Get all active sessions for metrics only
      const activeSessionsResult = await GreApiService.getSessionsPaginated({
        limit: 10000,
        offset: 0,
        filters: { 'end_ts': 'is.null' }
      })

      // Calculate connected users stats from active sessions
      const uniqueUsers = new Set(activeSessionsResult.data.map(s => s.username).filter(Boolean))
      setConnectedUsersCount(uniqueUsers.size)

      // Calculate user breakdown from active sessions only
      const userBreakdown = activeSessionsResult.data.reduce((acc: Record<string, number>, session) => {
        const username = session.username || 'Unknown'
        acc[username] = (acc[username] || 0) + 1
        return acc
      }, {} as Record<string, number>)

      const sortedUsers = Object.entries(userBreakdown)
        .sort(([, a], [, b]) => (b as number) - (a as number))
        .slice(0, 5)

      setTopUsers(sortedUsers)
      setLastUpdated(new Date())
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to fetch metrics data'
      setError(errorMsg)
      console.error('Error fetching metrics data:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  // Load paginated clients with lazy session/subscription loading
  const loadClientsPage = useCallback(async (page: number = 0) => {
    try {
      setLoading(true)
      
      const offset = page * pageSize
      
      // Get paginated clients
      const clientsResult = await GreApiService.getClientsPaginated({
        limit: pageSize,
        offset: offset
      })

      // Get client IDs for this page
      const clientIds = clientsResult.data.map(c => c.client)
      
      // Fetch sessions only for these clients using PostgREST 'in' filter
      const sessionsResult = await GreApiService.getSessionsPaginated({
        limit: 1000, // Should be enough for current page clients
        offset: 0,
        filters: { 
          'end_ts': 'is.null', // Only active sessions
          'client': `in.(${clientIds.join(',')})` // Only for current page clients
        }
      })

      // Fetch subscriptions only for these clients
      const subscriptionsResult = await GreApiService.getSubscriptionsPaginated({
        limit: 1000,
        offset: 0,
        filters: { 
          'active': 'eq.true',
          'client': `in.(${clientIds.join(',')})` // Only for current page clients
        }
      })

      // Create lookup maps for current page
      const sessionsMap = new Map<string, Session>()
      sessionsResult.data.forEach(session => {
        sessionsMap.set(session.client, session)
      })

      const clientSubscriptionsMap = new Map<string, Subscription[]>()
      subscriptionsResult.data.forEach(subscription => {
        if (!clientSubscriptionsMap.has(subscription.client)) {
          clientSubscriptionsMap.set(subscription.client, [])
        }
        clientSubscriptionsMap.get(subscription.client)?.push(subscription)
      })

      // Build enhanced clients for current page
      const enhancedClients: ClientWithSession[] = clientsResult.data.map(client => {
        const session = sessionsMap.get(client.client)
        const clientSubscriptions = clientSubscriptionsMap.get(client.client) || []

        return {
          ...client,
          session_state: session ? 'open' : 'closed',
          last_seen: client.last_seen,
          ip_port: session ? `${session.ip_address || 'N/A'}:${session.port || 'N/A'}` : 'N/A',
          protocol_ver: session?.protocol_version || 'N/A',
          keepalive: session?.keepalive || null,
          subs_count: clientSubscriptions.length,
          pubs_24h: 0,
          bytes_24h: 0,
          drops_24h: 0,
          current_session: session,
          active_subscriptions: clientSubscriptions
        }
      })

      setClients(enhancedClients)
      setTotalClientsCount(clientsResult.totalCount)
      
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to fetch clients page data'
      setError(errorMsg)
      console.error('Error fetching clients page:', err)
    } finally {
      setLoading(false)
    }
  }, [pageSize])

  // Load detailed client data when client is selected
  const loadClientDetails = useCallback(async (clientId: string) => {
    try {
      // Get current session for this client
      const sessionResult = await GreApiService.getSessionsPaginated({
        limit: 1,
        offset: 0,
        filters: { 
          'end_ts': 'is.null',
          'client': `eq.${clientId}`
        }
      })

      // Get all subscriptions for this client
      const subscriptionsResult = await GreApiService.getSubscriptionsPaginated({
        limit: 1000, // Get all subscriptions for this client
        offset: 0,
        filters: { 
          'active': 'eq.true',
          'client': `eq.${clientId}`
        }
      })

      // Update the selected client with fresh data
      const currentSession = sessionResult.data[0] || undefined
      const activeSubscriptions = subscriptionsResult.data || []

      setSelectedClient(prev => {
        if (prev && prev.client === clientId) {
          return {
            ...prev,
            current_session: currentSession,
            active_subscriptions: activeSubscriptions,
            subs_count: activeSubscriptions.length,
            session_state: currentSession ? 'open' : 'closed',
            ip_port: currentSession ? `${currentSession.ip_address || 'N/A'}:${currentSession.port || 'N/A'}` : 'N/A',
            protocol_ver: currentSession?.protocol_version || 'N/A',
            keepalive: currentSession?.keepalive || null
          }
        }
        return prev
      })

    } catch (err) {
      console.error('Error loading client details:', err)
    }
  }, [])

  // Combined data fetching
  const fetchClientsData = useCallback(async () => {
    await Promise.all([
      fetchMetricsData(),
      loadClientsPage(currentPage)
    ])
  }, [fetchMetricsData, loadClientsPage, currentPage])

  // With new pagination approach, we manage filtered clients differently
  // For now, we'll keep this simple and not implement client-side filtering
  // since we're loading data per page. Future enhancement could add server-side filtering.
  useEffect(() => {
    setFilteredClients(clients)
  }, [clients])

  useEffect(() => {
    fetchClientsData()

    // Only set up interval if auto-refresh is enabled
    if (state.autoRefresh) {
      const interval = setInterval(fetchClientsData, state.refreshInterval * 1000)
      return () => clearInterval(interval)
    }
  }, [fetchClientsData, state.autoRefresh, state.refreshInterval])

  // Handle page changes
  const handlePageChange = (newPage: number) => {
    setCurrentPage(newPage)
    loadClientsPage(newPage)
  }

  const totalPages = Math.ceil(totalClientsCount / pageSize)
  const startIndex = currentPage * pageSize
  // Since we're loading per page, clients array is already the current page
  const paginatedClients = clients

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
          Clients
        </h1>
        <p style={{
          fontSize: '16px',
          color: '#6b7280',
          margin: 0
        }}>
          Find clients and drill into activity
        </p>
      </div>

      {/* Connected Users Metric */}
      <div style={{ marginBottom: '24px' }}>
        <MetricCard
          label="Connected Users"
          value={connectedUsersCount.toString()}
          loading={loading}
          color="#10b981"
          unit="users"
        />
      </div>

      {/* Top Users Section */}
      {!loading && topUsers.length > 0 && (
        <div style={{
          background: 'white',
          borderRadius: '12px',
          border: '1px solid #e5e7eb',
          padding: '20px',
          marginBottom: '24px'
        }}>
          <h3 style={{
            margin: '0 0 16px 0',
            fontSize: '18px',
            fontWeight: '600',
            color: '#374151'
          }}>
            Top Users (Connected Sessions)
          </h3>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {topUsers.map(([username, count]) => (
              <div key={username} style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '12px',
                background: '#f9fafb',
                borderRadius: '8px',
                border: '1px solid #f3f4f6'
              }}>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  flex: 1
                }}>
                  <span style={{
                    fontWeight: '500',
                    color: '#374151',
                    minWidth: '120px'
                  }}>
                    {username}
                  </span>
                  <div style={{
                    flex: 1,
                    height: '8px',
                    background: '#e5e7eb',
                    borderRadius: '4px',
                    overflow: 'hidden'
                  }}>
                    <div
                      style={{
                        width: `${(count / Math.max(...topUsers.map(([, c]) => c))) * 100}%`,
                        height: '100%',
                        background: 'linear-gradient(90deg, #10b981, #059669)',
                        borderRadius: '4px'
                      }}
                    />
                  </div>
                </div>
                <span style={{
                  fontWeight: '600',
                  color: '#10b981',
                  minWidth: '40px',
                  textAlign: 'right'
                }}>
                  {count}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

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
            Error loading clients data
          </div>
          <div style={{ color: '#7f1d1d', fontSize: '14px' }}>
            {error}
          </div>
          <button
            onClick={fetchClientsData}
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

      {/* Filters */}
      <div style={{
        background: 'white',
        borderRadius: '12px',
        border: '1px solid #e5e7eb',
        padding: '20px',
        marginBottom: '24px',
        display: 'flex',
        gap: '16px',
        alignItems: 'center',
        flexWrap: 'wrap'
      }}>
        <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
          <input
            type="text"
            placeholder="Search clients, usernames..."
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            style={{
              padding: '8px 16px',
              paddingRight: searchText ? '40px' : '16px',
              border: '1px solid #d1d5db',
              borderRadius: '8px',
              fontSize: '14px',
              minWidth: '300px'
            }}
          />
          {searchText && (
            <button
              onClick={() => setSearchText('')}
              style={{
                position: 'absolute',
                right: '8px',
                background: 'none',
                border: 'none',
                color: '#6b7280',
                cursor: 'pointer',
                fontSize: '16px',
                padding: '2px'
              }}
              title="Clear search"
            >
              ×
            </button>
          )}
        </div>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as 'all' | 'open' | 'closed')}
          style={{
            padding: '8px 16px',
            border: '1px solid #d1d5db',
            borderRadius: '8px',
            fontSize: '14px'
          }}
        >
          <option value="all">All Status</option>
          <option value="open">Open Sessions</option>
          <option value="closed">Closed Sessions</option>
        </select>

        <div style={{ fontSize: '14px', color: '#6b7280' }}>
          {totalClientsCount} client{totalClientsCount !== 1 ? 's' : ''} total
          {/* Note: Search filtering would need to be implemented server-side for this optimized approach */}
        </div>
      </div>

      <div style={{
        display: 'grid',
        gridTemplateColumns: selectedClient ? '1fr 400px' : '1fr',
        gap: '24px'
      }}>
        {/* Main Client Table */}
        <div style={{
          background: 'white',
          borderRadius: '12px',
          border: '1px solid #e5e7eb',
          overflow: 'hidden'
        }}>
          <div style={{ padding: '20px', borderBottom: '1px solid #e5e7eb' }}>
            <h2 style={{ margin: 0, fontSize: '20px', fontWeight: '600' }}>
              Clients ({totalClientsCount})
            </h2>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#f8fafc' }}>
                  <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: '600', textTransform: 'uppercase', color: '#6b7280' }}>Client</th>
                  <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: '600', textTransform: 'uppercase', color: '#6b7280' }}>Username</th>
                  <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: '600', textTransform: 'uppercase', color: '#6b7280' }}>Status</th>
                  <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: '600', textTransform: 'uppercase', color: '#6b7280' }}>Last Seen</th>
                  <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: '600', textTransform: 'uppercase', color: '#6b7280' }}>IP:Port</th>
                  <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: '600', textTransform: 'uppercase', color: '#6b7280' }}>Protocol</th>
                  <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: '600', textTransform: 'uppercase', color: '#6b7280' }}>Subs</th>
                  <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: '600', textTransform: 'uppercase', color: '#6b7280' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={8} style={{ padding: '32px', textAlign: 'center', color: '#6b7280' }}>
                      Loading clients...
                    </td>
                  </tr>
                ) : paginatedClients.length === 0 ? (
                  <tr>
                    <td colSpan={8} style={{ padding: '32px', textAlign: 'center', color: '#6b7280' }}>
                      No clients found
                    </td>
                  </tr>
                ) : (
                  paginatedClients.map((client) => (
                    <tr
                      key={client.client}
                      style={{
                        borderBottom: '1px solid #f1f5f9',
                        background: selectedClient?.client === client.client ? '#eff6ff' : 'white'
                      }}
                    >
                      <td style={{ padding: '16px', fontWeight: '500', color: '#1f2937', maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {client.client}
                      </td>
                      <td style={{ padding: '16px', color: '#6b7280' }}>
                        {client.username || '-'}
                      </td>
                      <td style={{ padding: '16px' }}>
                        <span style={{
                          padding: '4px 8px',
                          borderRadius: '12px',
                          fontSize: '12px',
                          fontWeight: '500',
                          background: client.session_state === 'open' ? '#d1fae5' : '#fee2e2',
                          color: client.session_state === 'open' ? '#065f46' : '#991b1b'
                        }}>
                          {client.session_state}
                        </span>
                      </td>
                      <td style={{ padding: '16px', color: '#6b7280', fontSize: '14px' }}>
                        {formatTimestamp(client.last_seen)}
                      </td>
                      <td style={{ padding: '16px', color: '#6b7280', fontSize: '14px' }}>
                        {client.ip_port}
                      </td>
                      <td style={{ padding: '16px', color: '#6b7280', fontSize: '14px' }}>
                        {client.protocol_ver || '-'}
                      </td>
                      <td style={{ padding: '16px', color: '#6b7280' }}>
                        {client.subs_count}
                      </td>
                      <td style={{ padding: '16px' }}>
                        <button
                          onClick={() => {
                            if (selectedClient?.client === client.client) {
                              setSelectedClient(null)
                            } else {
                              setSelectedClient(client)
                              loadClientDetails(client.client)
                            }
                          }}
                          style={{
                            padding: '6px 12px',
                            background: '#3b82f6',
                            color: 'white',
                            border: 'none',
                            borderRadius: '6px',
                            fontSize: '12px',
                            cursor: 'pointer'
                          }}
                        >
                          View Details
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {!loading && totalClientsCount > pageSize && (
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '16px 20px',
              borderTop: '1px solid #e5e7eb',
              background: '#f8f9fa'
            }}>
              <div style={{ fontSize: '14px', color: '#6b7280' }}>
                Showing {startIndex + 1}-{Math.min(startIndex + pageSize, totalClientsCount)} of {totalClientsCount}
              </div>

              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  onClick={() => handlePageChange(Math.max(0, currentPage - 1))}
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
                  onClick={() => handlePageChange(Math.min(totalPages - 1, currentPage + 1))}
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

        {/* Right Drawer - Client Details */}
        {selectedClient && (
          <div style={{
            background: 'white',
            borderRadius: '12px',
            border: '1px solid #e5e7eb',
            overflow: 'hidden',
            height: 'fit-content'
          }}>
            <div style={{
              padding: '20px',
              borderBottom: '1px solid #e5e7eb',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              background: '#f8f9fa'
            }}>
              <h2 style={{ margin: 0, fontSize: '18px', fontWeight: '600' }}>
                Client Details
              </h2>
              <button
                onClick={() => setSelectedClient(null)}
                style={{
                  background: 'none',
                  border: 'none',
                  fontSize: '20px',
                  cursor: 'pointer',
                  color: '#6b7280'
                }}
              >
                ×
              </button>
            </div>

            <div style={{ padding: '20px' }}>
              {/* Identity Section */}
              <div style={{ marginBottom: '24px' }}>
                <h3 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '12px', color: '#374151' }}>
                  Identity
                </h3>
                <div style={{ background: '#f9fafb', padding: '16px', borderRadius: '8px' }}>
                  <div style={{ marginBottom: '8px', fontSize: '14px' }}>
                    <strong>Client:</strong> <span style={{ color: '#6b7280', fontSize: '13px' }}>{selectedClient.client}</span>
                  </div>
                  <div style={{ marginBottom: '8px', fontSize: '14px' }}>
                    <strong>Username:</strong> <span style={{ color: '#6b7280' }}>{selectedClient.username || 'N/A'}</span>
                  </div>
                  <div style={{ fontSize: '14px' }}>
                    <strong>First Seen:</strong> <span style={{ color: '#6b7280' }}>{formatTimestamp(selectedClient.first_seen)}</span>
                  </div>
                </div>
              </div>

              {/* Current Session */}
              <div style={{ marginBottom: '24px' }}>
                <h3 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '12px', color: '#374151' }}>
                  Current Session
                </h3>
                <div style={{ background: '#f9fafb', padding: '16px', borderRadius: '8px' }}>
                  {selectedClient.current_session ? (
                    <>
                      <div style={{ marginBottom: '8px', fontSize: '14px' }}>
                        <strong>Start Time:</strong> <span style={{ color: '#6b7280' }}>{formatTimestamp(selectedClient.current_session.start_ts)}</span>
                      </div>
                      <div style={{ marginBottom: '8px', fontSize: '14px' }}>
                        <strong>IP Address:</strong> <span style={{ color: '#6b7280' }}>{selectedClient.current_session.ip_address || 'N/A'}</span>
                      </div>
                      <div style={{ marginBottom: '8px', fontSize: '14px' }}>
                        <strong>Port:</strong> <span style={{ color: '#6b7280' }}>{selectedClient.current_session.port || 'N/A'}</span>
                      </div>
                      <div style={{ marginBottom: '8px', fontSize: '14px' }}>
                        <strong>Protocol:</strong> <span style={{ color: '#6b7280' }}>{selectedClient.current_session.protocol_version || 'N/A'}</span>
                      </div>
                      <div style={{ fontSize: '14px' }}>
                        <strong>Keepalive:</strong> <span style={{ color: '#6b7280' }}>{selectedClient.current_session.keepalive ? `${selectedClient.current_session.keepalive}s` : 'N/A'}</span>
                      </div>
                    </>
                  ) : (
                    <div style={{ color: '#6b7280', fontSize: '14px' }}>No active session</div>
                  )}
                </div>
              </div>

              {/* Active Subscriptions */}
              <div style={{ marginBottom: '24px' }}>
                <h3 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '12px', color: '#374151' }}>
                  Active Subscriptions ({selectedClient.active_subscriptions?.length || 0})
                </h3>
                <div style={{ background: '#f9fafb', padding: '16px', borderRadius: '8px', maxHeight: '200px', overflow: 'auto' }}>
                  {selectedClient.active_subscriptions && selectedClient.active_subscriptions.length > 0 ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      {selectedClient.active_subscriptions.slice(0, 10).map((sub, index) => (
                        <div key={sub.id} style={{
                          padding: '8px',
                          background: 'white',
                          borderRadius: '4px',
                          border: '1px solid #e5e7eb'
                        }}>
                          <div style={{ fontSize: '13px', fontWeight: '500', color: '#374151', marginBottom: '4px' }}>
                            {sub.topic}
                          </div>
                          <div style={{ fontSize: '12px', color: '#6b7280' }}>
                            QoS: {sub.qos} | Created: {formatTimestamp(sub.created_at)}
                          </div>
                        </div>
                      ))}
                      {selectedClient.active_subscriptions.length > 10 && (
                        <div style={{ fontSize: '12px', color: '#6b7280', textAlign: 'center', marginTop: '8px' }}>
                          ... and {selectedClient.active_subscriptions.length - 10} more
                        </div>
                      )}
                    </div>
                  ) : (
                    <div style={{ color: '#6b7280', fontSize: '14px' }}>No active subscriptions</div>
                  )}
                </div>
              </div>

              {/* 24h Stats */}
              <div>
                <h3 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '12px', color: '#374151' }}>
                  24h Statistics
                </h3>
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(2, 1fr)',
                  gap: '12px'
                }}>
                  <div style={{ background: '#f0f9ff', padding: '12px', borderRadius: '8px', textAlign: 'center' }}>
                    <div style={{ fontSize: '18px', fontWeight: '700', color: '#0369a1' }}>
                      {selectedClient.pubs_24h.toLocaleString()}
                    </div>
                    <div style={{ fontSize: '11px', color: '#6b7280' }}>Publications</div>
                  </div>
                  <div style={{ background: '#f0fdf4', padding: '12px', borderRadius: '8px', textAlign: 'center' }}>
                    <div style={{ fontSize: '18px', fontWeight: '700', color: '#166534' }}>
                      {(selectedClient.bytes_24h / 1024).toFixed(1)}KB
                    </div>
                    <div style={{ fontSize: '11px', color: '#6b7280' }}>Bytes</div>
                  </div>
                  <div style={{ background: '#fef3c7', padding: '12px', borderRadius: '8px', textAlign: 'center' }}>
                    <div style={{ fontSize: '18px', fontWeight: '700', color: '#92400e' }}>
                      {selectedClient.subs_count}
                    </div>
                    <div style={{ fontSize: '11px', color: '#6b7280' }}>Subscriptions</div>
                  </div>
                  <div style={{ background: '#fee2e2', padding: '12px', borderRadius: '8px', textAlign: 'center' }}>
                    <div style={{ fontSize: '18px', fontWeight: '700', color: '#991b1b' }}>
                      {selectedClient.drops_24h}
                    </div>
                    <div style={{ fontSize: '11px', color: '#6b7280' }}>Drops</div>
                  </div>
                </div>
              </div>
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