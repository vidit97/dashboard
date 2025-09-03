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

  const fetchConnectedClients = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      
      if (useMockData) {
        // Use mock data
        setConnectedClients(MOCK_CONNECTED_CLIENTS)
      } else {
        // Try to fetch real data
        const clients = await GreApiService.getConnectedClients()
        setConnectedClients(clients)
      }
      
      setLastUpdated(new Date())
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to fetch connected clients'
      setError(errorMsg)
      console.error('Error fetching connected clients:', err)
      
      // Fallback to mock data if API fails
      if (!useMockData) {
        console.log('Falling back to mock data')
        setConnectedClients(MOCK_CONNECTED_CLIENTS)
      }
    } finally {
      setLoading(false)
    }
  }, [useMockData])

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
          value={connectedClients.length.toString()}
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
          <h3 className="breakdown-title">Active Sessions</h3>
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
