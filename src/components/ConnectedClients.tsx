import React, { useState, useEffect, useCallback } from 'react'
import { MetricCard } from '../ui/StatCards'
import { GreApiService, formatTimestamp } from '../services/greApi'
import { ConnectedClient } from '../config/greApi'

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
  const [connectedClients, setConnectedClients] = useState(MOCK_CONNECTED_CLIENTS)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [lastUpdated, setLastUpdated] = useState(null)
  const [useMockData, setUseMockData] = useState(false)
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(0)
  const [pageSize] = useState(10)
  const [totalClients, setTotalClients] = useState(0)
  const [hasMore, setHasMore] = useState(false)
  const [loadingMore, setLoadingMore] = useState(false)

  const fetchConnectedClients = useCallback(async (page = 0, append = false) => {
    try {
      if (append) {
        setLoadingMore(true)
      } else {
        setLoading(true)
        setCurrentPage(0)
      }
      setError(null)
      
      if (useMockData) {
        // Use mock data
        if (append) {
          // For mock data, don't append - just show the same data
          setHasMore(false)
        } else {
          setConnectedClients(MOCK_CONNECTED_CLIENTS)
          setTotalClients(MOCK_CONNECTED_CLIENTS.length)
          setHasMore(false)
        }
      } else {
        // Fetch real paginated data
        const offset = page * pageSize
        const result = await GreApiService.getConnectedClientsPaginated(pageSize, offset)
        
        if (append) {
          // Append new data to existing
          setConnectedClients(prev => [...prev, ...result.clients])
        } else {
          // Replace with fresh data
          setConnectedClients(result.clients)
        }
        
        setTotalClients(result.total)
        setHasMore(result.hasMore)
        setCurrentPage(page)
      }
      
      setLastUpdated(new Date())
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to fetch connected clients'
      setError(errorMsg)
      console.error('Error fetching connected clients:', err)
      
      // Fallback to mock data if API fails
      if (!useMockData && !append) {
        console.log('Falling back to mock data')
        setConnectedClients(MOCK_CONNECTED_CLIENTS)
        setTotalClients(MOCK_CONNECTED_CLIENTS.length)
        setHasMore(false)
      }
    } finally {
      setLoading(false)
      setLoadingMore(false)
    }
  }, [useMockData, pageSize])

  const loadMore = () => {
    if (!loadingMore && hasMore) {
      fetchConnectedClients(currentPage + 1, true)
    }
  }

  useEffect(() => {
    fetchConnectedClients()
    
    const interval = setInterval(fetchConnectedClients, refreshInterval * 1000)
    return () => clearInterval(interval)
  }, [fetchConnectedClients, refreshInterval])

  // Calculate user breakdown for top 5 display
  const userBreakdown = connectedClients.reduce((acc, client) => {
    acc[client.username] = (acc[client.username] || 0) + 1
    return acc
  }, {})

  const topUsers = Object.entries(userBreakdown)
    .sort(([, a], [, b]) => (b as number) - (a as number))
    .slice(0, 5)

  return (
    <div className={`chart-section ${className || ''}`}>
      <div className="chart-header">
        <h2 className="chart-title">Connected Clients</h2>
        <div className="chart-controls">
          <button onClick={fetchConnectedClients} disabled={loading} className="button-secondary">
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

      {/* KPI Card */}
      <div style={{ marginBottom: '24px' }}>
        <MetricCard
          label="Connected Now"
          value={totalClients.toString()}
          loading={loading}
          color="#10b981"
          unit="clients"
        />
      </div>

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

      {/* Connected Clients Table */}
      {!loading && connectedClients.length > 0 && (
        <div className="connected-clients-table">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h3 className="breakdown-title">Active Sessions</h3>
            <div style={{ fontSize: '14px', color: '#6b7280' }}>
              Showing {connectedClients.length} of {totalClients} sessions
            </div>
          </div>
          <div className="table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Client ID</th>
                  <th>Username</th>
                  <th>Connected Since</th>
                  <th>Duration</th>
                </tr>
              </thead>
              <tbody>
                {connectedClients.map((client) => {
                  const duration = client.start_ts 
                    ? Math.floor((Date.now() - new Date(client.start_ts).getTime()) / 60000)
                    : 0
                  
                  return (
                    <tr key={client.session_id}>
                      <td>{client.client}</td>
                      <td>{client.username}</td>
                      <td>{client.start_ts ? formatTimestamp(client.start_ts) : 'Unknown'}</td>
                      <td>{duration > 0 ? `${duration}m` : 'Just now'}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
          
          {/* Pagination Controls */}
          {hasMore && (
            <div style={{ 
              display: 'flex', 
              justifyContent: 'center', 
              marginTop: '16px', 
              padding: '16px',
              borderTop: '1px solid #e5e7eb'
            }}>
              <button
                onClick={loadMore}
                disabled={loadingMore}
                className="button-secondary"
                style={{
                  padding: '8px 16px',
                  backgroundColor: loadingMore ? '#f3f4f6' : '#3b82f6',
                  color: loadingMore ? '#6b7280' : '#ffffff',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: loadingMore ? 'not-allowed' : 'pointer'
                }}
              >
                {loadingMore ? 'Loading...' : `Load More (${totalClients - connectedClients.length} remaining)`}
              </button>
            </div>
          )}
        </div>
      )}

      {lastUpdated && (
        <div className="last-updated">
          Last updated: {lastUpdated.toLocaleString()}
          {useMockData && <span style={{ color: '#f59e0b' }}> (Using Mock Data)</span>}
        </div>
      )}
    </div>
  )
}
