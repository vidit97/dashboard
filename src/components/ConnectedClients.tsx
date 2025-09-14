import React, { useState, useEffect, useCallback } from 'react'
import { MetricCard } from '../ui/StatCards'
import { GreApiService, formatTimestamp } from '../services/greApi'
import { ConnectedClient } from '../config/greApi'
import { Session } from '../types/api'
import SearchFilterTable from './SearchFilterTable'

interface ConnectedClientsProps {
  className?: string
  refreshInterval?: number
}

// Mock data for fallback
const MOCK_CONNECTED_CLIENTS: ConnectedClient[] = [
  {
    client: 'auto-2FA7DDFC-CF8E-93A9-C123-F5F5BCD0277F',
    username: 'greAgent',
    start_ts: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(), // 2 hours ago
    session_id: 6
  },
  {
    client: 'auto-65EED061-83DD-66CA-E7DD-85CFA285C1A1',
    username: 'testClient',
    start_ts: new Date(Date.now() - 30 * 60 * 1000).toISOString(), // 30 minutes ago
    session_id: 7
  },
  {
    client: 'auto-EEEC9676-7E77-58B0-E53B-061F8DA9C6E6',
    username: 'testClient',
    start_ts: new Date(Date.now() - 10 * 60 * 1000).toISOString(), // 10 minutes ago
    session_id: 8
  }
]

export default function ConnectedClients({ className, refreshInterval = 30 }: ConnectedClientsProps) {
  const [connectedClients, setConnectedClients] = useState<ConnectedClient[]>(MOCK_CONNECTED_CLIENTS)
  const [loading, setLoading] = useState<boolean>(true)
  const [error, setError] = useState<string | null>(null)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)
  const [useMockData, setUseMockData] = useState<boolean>(false)
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize] = useState(10)
  const [totalClients, setTotalClients] = useState(0)
  const [totalPages, setTotalPages] = useState(0)
  const [totalActiveClients, setTotalActiveClients] = useState(0) // Unfiltered total count
  const [totalActiveUsers, setTotalActiveUsers] = useState(0) // Unfiltered unique username count
  
  // Search and filter state for SearchFilterTable
  type FilterValues = { client: string[]; username: string[] }
  const [selectedFilters, setSelectedFilters] = useState<FilterValues>({
    client: [],
    username: []
  })
  const [availableFilterData, setAvailableFilterData] = useState<FilterValues>({
    client: [],
    username: []
  })
  
  // Active sessions from API (using Session type for pagination compatibility)
  const [activeSessions, setActiveSessions] = useState<Session[]>([])
  
  // All unfiltered active sessions for top users calculation
  const [allActiveSessions, setAllActiveSessions] = useState<Session[]>([])

  const fetchAvailableFilterData = useCallback(async () => {
    try {
      if (useMockData) {
        const usernames = [...new Set(MOCK_CONNECTED_CLIENTS.map(c => c.username))]
        const clientIds = [...new Set(MOCK_CONNECTED_CLIENTS.map(c => c.client))]
        setAvailableFilterData({
          client: clientIds.sort(),
          username: usernames.sort()
        })
      } else {
        // Get all active sessions to extract unique usernames and client IDs
        const result = await GreApiService.getSessionsPaginated({ 
          limit: 1000, 
          filters: { 'end_ts': 'is.null' } 
        })
        const usernames = [...new Set(result.data.map(s => s.username || 'Unknown'))]
        const clientIds = [...new Set(result.data.map(s => s.client))]
        setAvailableFilterData({
          client: clientIds.sort(),
          username: usernames.sort()
        })
      }
    } catch (err) {
      console.error('Error fetching filter data:', err)
      const usernames = [...new Set(MOCK_CONNECTED_CLIENTS.map(c => c.username))]
      const clientIds = [...new Set(MOCK_CONNECTED_CLIENTS.map(c => c.client))]
      setAvailableFilterData({
        client: clientIds.sort(),
        username: usernames.sort()
      })
    }
  }, [useMockData])

  const fetchConnectedClients = useCallback(async (page = 1, resetData = true) => {
    try {
      setLoading(true)
      setError(null)
      
      if (useMockData) {
        // Apply tag-based filters to mock data
        let filteredData = MOCK_CONNECTED_CLIENTS
        
        if (selectedFilters.client.length > 0) {
          filteredData = filteredData.filter(c => selectedFilters.client.includes(c.client))
        }
        
        if (selectedFilters.username.length > 0) {
          filteredData = filteredData.filter(c => {
            const uname = c.username || 'Unknown'
            return selectedFilters.username.includes(uname)
          })
        }
        
        setConnectedClients(filteredData)
        setActiveSessions([]) // Mock data uses different structure
        setTotalClients(filteredData.length)
        setTotalPages(1)
        setCurrentPage(1)
        setTotalActiveClients(MOCK_CONNECTED_CLIENTS.length) // Always show total unfiltered count
        // count unique usernames in mock
        setTotalActiveUsers([...new Set(MOCK_CONNECTED_CLIENTS.map(c => c.username))].filter(Boolean as any).length)
      } else {
        // First, get total unfiltered count for the "Connected Now" metric
        if (resetData) { // Only fetch total count when resetting data, not during pagination
          const totalResult = await GreApiService.getSessionsPaginated({
            limit: 1,
            offset: 0,
            filters: { 'end_ts': 'is.null' } // Only active sessions
          })
          setTotalActiveClients(totalResult.totalCount)
          
          // Also fetch all unfiltered sessions for top users calculation
          const allSessionsResult = await GreApiService.getSessionsPaginated({
            limit: 10000, // Get a large number to capture all active sessions
            offset: 0,
            filters: { 'end_ts': 'is.null' } // Only active sessions, no other filters
          })
          setAllActiveSessions(allSessionsResult.data)
          // compute unique usernames from the fetched sessions
          const uniqueUsers = new Set(allSessionsResult.data.map(s => s.username).filter(Boolean))
          setTotalActiveUsers(uniqueUsers.size)
        }
        
        // Build filters for active sessions (end_ts is null)
        const filters: Record<string, string> = {
          'end_ts': 'is.null'
        }
        
        // Apply tag-based filters for client IDs
        if (selectedFilters.client.length > 0) {
          filters['client'] = `in.(${selectedFilters.client.join(',')})`
        }
        
        // Apply tag-based filters for usernames, support 'Unknown' -> username is null
        if (selectedFilters.username.length > 0) {
          const usernameFilters = selectedFilters.username
          const unknownSelected = usernameFilters.includes('Unknown')
          const otherNames = usernameFilters.filter((n: string) => n !== 'Unknown')

          if (unknownSelected && otherNames.length === 0) {
            // only Unknown selected -> match rows where username IS NULL
            filters['username'] = 'is.null'
          } else if (unknownSelected && otherNames.length > 0) {
            // mix of Unknown and specific usernames -> use OR grouping
            // e.g. or=(username.is.null,username.in.(user1,user2))
            filters['or'] = `(username.is.null,username.in.(${otherNames.join(',')}))`
          } else if (otherNames.length > 0) {
            // only specific usernames
            filters['username'] = `in.(${otherNames.join(',')})`
          }
        }
        
        // Fetch paginated active sessions
        const offset = (page - 1) * pageSize
        const result = await GreApiService.getSessionsPaginated({
          limit: pageSize,
          offset,
          filters
        })
        
        setActiveSessions(result.data)
        setConnectedClients([]) // Clear old format data
        setTotalClients(result.totalCount)
        setTotalPages(Math.ceil(result.totalCount / pageSize))
        setCurrentPage(page)
      }
      
      setLastUpdated(new Date())
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to fetch connected clients'
      setError(errorMsg)
      console.error('Error fetching connected clients:', err)
      
      // Fallback to mock data if API fails
      if (!useMockData && resetData) {
        console.log('Falling back to mock data')
        setConnectedClients(MOCK_CONNECTED_CLIENTS)
        setTotalClients(MOCK_CONNECTED_CLIENTS.length)
        setTotalPages(1)
        setCurrentPage(1)
      }
    } finally {
      setLoading(false)
    }
  }, [useMockData, pageSize, selectedFilters])

  const handleSearch = () => {
    setCurrentPage(1)
    fetchConnectedClients(1, true)
  }

  const handlePageChange = (newPage: number) => {
    console.log('Page change requested:', { currentPage, newPage, totalPages })
    if (newPage >= 1 && newPage <= totalPages) {
      setCurrentPage(newPage) // Update state first
      fetchConnectedClients(newPage, false)
    }
  }

  const clearAllFilters = () => {
    setSelectedFilters({
      client: [],
      username: []
    })
    setCurrentPage(1)
    fetchConnectedClients(1, true)
  }

  useEffect(() => {
    fetchAvailableFilterData()
    fetchConnectedClients(1, true) // Always start from page 1 on mount
    
    const interval = setInterval(() => {
      fetchConnectedClients(currentPage, false)
    }, refreshInterval * 1000)
    return () => clearInterval(interval)
  }, [fetchConnectedClients, fetchAvailableFilterData, refreshInterval]) // Removed currentPage dependency

  // Separate effect for when currentPage changes (for manual page navigation)
  useEffect(() => {
    if (currentPage > 1) { // Only fetch if not on first page
      fetchConnectedClients(currentPage, false)
    }
  }, [currentPage, fetchConnectedClients])

  // Calculate user breakdown for top 5 display using unfiltered data
  const userBreakdownData = useMockData ? connectedClients : allActiveSessions
  const userBreakdown = userBreakdownData.reduce((acc: Record<string, number>, client: any) => {
    const username = (useMockData ? client.username : client.username) || 'Unknown'
    acc[username] = (acc[username] || 0) + 1
    return acc
  }, {} as Record<string, number>)

  const topUsers = Object.entries(userBreakdown)
    .sort(([, a], [, b]) => (b as number) - (a as number))
    .slice(0, 5)

  return (
    <div className={`chart-section ${className || ''}`}>
      <div className="chart-header">
        <h2 className="chart-title">Connected Clients</h2>
        <div className="chart-controls">
          <button onClick={() => fetchConnectedClients(1, true)} disabled={loading} className="button-secondary">
            {loading ? 'Loading...' : 'Refresh'}
          </button>
          <label className="mock-data-toggle">
            <input
              type="checkbox"
              checked={useMockData}
              onChange={(e) => setUseMockData(e.target.checked)}
            />
            Use Mock Data
          </label>
        </div>
      </div>

      {/* KPI Card - Total Active Sessions (Unfiltered) */}
      <div style={{ marginBottom: '24px' }}>
        <MetricCard
          label="Connected Users"
          value={totalActiveUsers.toString()}
          loading={loading}
          color="#10b981"
          unit="users"
        />
      </div>

      {error && !useMockData && (
        <div className="error-message">
          Error: {error}
          <button 
            onClick={() => setUseMockData(true)}
            style={{ marginLeft: '8px', fontSize: '12px', padding: '4px 8px' }}
          >
            Use Mock Data
          </button>
        </div>
      )}

      {/* User Breakdown */}
      {!loading && (
        <div className="connected-clients-breakdown">
          <h3 className="breakdown-title">Top Users (Connected Sessions)</h3>
          {topUsers.length > 0 ? (
            <div className="user-bars">
              {topUsers.map(([username, count]) => (
                <div key={username} className="user-bar">
                  <div className="user-bar-info">
                    <span className="username">{username}</span>
                    <span className="count">{count as number}</span>
                  </div>
                  <div className="user-bar-visual">
                    <div 
                      className="user-bar-fill"
                      style={{
                        width: `${((count as number) / Math.max(...topUsers.map(([, c]) => c as number))) * 100}%`
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="no-data">No connected clients</div>
          )}
        </div>
      )}

      {/* SearchFilterTable Component */}
      <SearchFilterTable
        title="Active Sessions"
        data={useMockData ? connectedClients : activeSessions}
        totalCount={totalClients}
        loading={loading}
        error={error}
        currentPage={currentPage}
        totalPages={totalPages}
        pageSize={pageSize}
        columns={[
          { key: 'client', label: 'Client ID' },
          { key: 'username', label: 'Username', render: (value: any) => value || 'Unknown' },
          { 
            key: 'start_ts', 
            label: 'Connected Since',
            render: (value: any) => {
              if (!value) return 'Unknown'
              const date = new Date(value)
              return `${date.toLocaleDateString()}, ${date.toLocaleTimeString()}`
            }
          },
          { 
            key: 'duration', 
            label: 'Duration',
            render: (_: any, row: any) => {
              const startTime = useMockData ? row.start_ts : row.start_ts
              if (!startTime) return '0m'
              const duration = Math.floor((Date.now() - new Date(startTime).getTime()) / 60000)
              return `${duration}m`
            }
          }
        ]}
        filterConfigs={[
          { key: 'client', label: 'Client IDs', searchable: true, type: 'multiselect' },
          { key: 'username', label: 'Usernames', searchable: true, type: 'multiselect' }
        ]}
        availableFilterData={availableFilterData}
        selectedFilters={selectedFilters}
        onFilterChange={setSelectedFilters}
        onPageChange={handlePageChange}
        onRefresh={() => fetchConnectedClients(currentPage, false)}
        onClearFilters={clearAllFilters}
        className="connected-clients-section"
      />

      {lastUpdated && (
        <div className="last-updated" style={{ marginTop: '16px', fontSize: '12px', color: '#6b7280' }}>
          Last updated: {lastUpdated.toLocaleString()}
          {useMockData && <span style={{ color: '#f59e0b' }}> (Using Mock Data)</span>}
        </div>
      )}
    </div>
  )
}
