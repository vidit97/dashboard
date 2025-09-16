import React, { useState, useEffect } from 'react'
import { GreApiService } from '../services/greApi'

interface ClientTopicFootprintProps {
  className?: string
  clientId?: string
}

interface ClientTopic {
  topic: string
  qos: number
  updated_at: string
  total_clients_on_topic: number
}

export const ClientTopicFootprintChart = ({ className, clientId }: ClientTopicFootprintProps) => {
  const [clientTopics, setClientTopics] = useState<ClientTopic[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedClient, setSelectedClient] = useState(clientId || 'auto-1D04687D-950A-A897-CE91-58A608CFC0CD')
  const [availableClients, setAvailableClients] = useState<string[]>([])

  const fetchClientData = async (client: string) => {
    if (!client) return
    
    try {
      setLoading(true)
      setError(null)
      
      // Get client's active subscriptions
      const clientSubs = await GreApiService.getSubscriptionsPaginated({
        offset: 0,
        limit: 1000,
        filters: {
          client: `eq.${client}`,
          active: 'is.true'
        }
      })
      
      // Get total client count for each topic
      const allSubs = await GreApiService.getSubscriptionsPaginated({
        offset: 0,
        limit: 10000,
        filters: { active: 'is.true' }
      })
      
      // Count clients per topic
      const topicClientCounts = new Map<string, number>()
      allSubs.data.forEach(sub => {
        const count = topicClientCounts.get(sub.topic) || 0
        topicClientCounts.set(sub.topic, count + 1)
      })
      
      // Combine data
      const topics = clientSubs.data.map(sub => ({
        topic: sub.topic,
        qos: sub.qos,
        updated_at: sub.updated_at,
        total_clients_on_topic: topicClientCounts.get(sub.topic) || 1
      })).sort((a, b) => a.topic.localeCompare(b.topic))
      
      setClientTopics(topics)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load data')
    } finally {
      setLoading(false)
    }
  }

  const fetchAvailableClients = async () => {
    try {
      const result = await GreApiService.getSubscriptionsPaginated({
        offset: 0,
        limit: 1000,
        filters: { active: 'is.true' }
      })
      
      const clients = [...new Set(result.data.map(sub => sub.og_client || sub.client))].sort()
      setAvailableClients(clients)
    } catch (err) {
      console.error('Error fetching clients:', err)
    }
  }

  useEffect(() => {
    fetchAvailableClients()
  }, [])

  useEffect(() => {
    if (selectedClient) {
      fetchClientData(selectedClient)
    }
  }, [selectedClient])

  const qosColors = {
    0: '#10b981', // emerald
    1: '#f59e0b', // amber  
    2: '#ef4444'  // red
  }

  const getQosBadge = (qos: number) => {
    const color = qosColors[qos as keyof typeof qosColors] || '#6b7280'
    return (
      <span 
        style={{ 
          backgroundColor: color,
          color: 'white',
          padding: '2px 8px',
          borderRadius: '12px',
          fontSize: '11px',
          fontWeight: '500'
        }}
      >
        QoS {qos}
      </span>
    )
  }

  const formatDateTime = (dateString: string) => {
    try {
      return new Date(dateString).toLocaleString()
    } catch {
      return dateString
    }
  }

  // Calculate bubble size based on client count - reasonable sizes
  const maxClients = Math.max(...clientTopics.map(t => t.total_clients_on_topic), 1)
  const getBubbleSize = (clientCount: number) => {
    // Scale from 60px to 120px for reasonable bubble sizes
    const scale = Math.sqrt(clientCount / maxClients)
    const baseSize = 60
    const maxSize = 120
    const size = baseSize + (scale * (maxSize - baseSize))
    return `${Math.max(size, baseSize)}px`
  }

  if (loading) {
    return (
      <div className={`chart-section ${className}`}>
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-1/3 mb-4"></div>
          <div className="h-32 bg-gray-200 rounded"></div>
        </div>
      </div>
    )
  }

  return (
    <div className={`chart-section ${className}`}>
      <div className="chart-header">
        <h2 className="chart-title">Per-Client Topic Footprint</h2>
        <div className="chart-controls">
          <select
            value={selectedClient}
            onChange={(e) => setSelectedClient(e.target.value)}
            className="select"
          >
            {availableClients.map((client) => (
              <option key={client} value={client}>
                {client}
              </option>
            ))}
          </select>
          <button
            onClick={() => fetchClientData(selectedClient)}
            className="button button-primary"
          >
            Refresh
          </button>
        </div>
      </div>

      {error && (
        <div className="error-message">
          {error}
        </div>
      )}

      {/* Stats Cards */}
      <div className="overview-cards">
        <div className="metric-card">
          <div className="metric-value">{clientTopics.length}</div>
          <div className="metric-label">Active Subscriptions</div>
        </div>
        <div className="metric-card">
          <div className="metric-value">
            {clientTopics.reduce((sum, t) => sum + t.total_clients_on_topic, 0)}
          </div>
          <div className="metric-label">Total Subscribers</div>
        </div>
        <div className="metric-card">
          <div className="metric-value">
            {Math.max(...clientTopics.map(t => t.total_clients_on_topic), 0)}
          </div>
          <div className="metric-label">Max Topic Popularity</div>
        </div>
      </div>

      {/* Bubble Chart */}
      <div style={{ marginTop: '24px' }}>
        <h3 className="breakdown-title">Topic Distribution - Bubble Visualization</h3>
        <div style={{ 
          background: '#f8fafc', 
          padding: '16px', 
          borderRadius: '8px', 
          marginBottom: '20px',
          border: '1px solid #e5e7eb',
          fontSize: '14px',
          color: '#374151'
        }}>
          <strong>Bubble row: one bubble per topic (size = #active clients on that topic; highlight this client)</strong>
          <br />
          <span style={{ fontSize: '12px', color: '#6b7280' }}>
            Each bubble represents a topic this client subscribes to. Bubble size indicates total clients on that topic.
          </span>
        </div>
        
        {clientTopics.length === 0 ? (
          <div className="chart-placeholder">
            No active subscriptions found for this client
          </div>
        ) : (
          <div className="chart-container">
            <div style={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: '20px',
              justifyContent: 'center',
              alignItems: 'center',
              padding: '40px 20px',
              minHeight: '300px'
            }}>
              {clientTopics.map((topic) => {
                const bubbleSize = getBubbleSize(topic.total_clients_on_topic)
                const sizeValue = parseInt(bubbleSize.replace('px', ''))
                
                return (
                  <div 
                    key={topic.topic}
                    style={{
                      textAlign: 'center',
                      margin: '10px'
                    }}
                  >
                    {/* Bubble */}
                    <div
                      style={{
                        width: bubbleSize,
                        height: bubbleSize,
                        borderRadius: '50%',
                        background: '#3b82f6',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: 'white',
                        fontWeight: 'bold',
                        fontSize: sizeValue > 80 ? '16px' : '14px',
                        cursor: 'pointer',
                        transition: 'transform 0.2s ease',
                        position: 'relative',
                        border: '3px solid #fbbf24',
                        boxShadow: '0 4px 12px rgba(59, 130, 246, 0.3)'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.transform = 'scale(1.1)'
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.transform = 'scale(1)'
                      }}
                      title={`${topic.topic}: ${topic.total_clients_on_topic} clients`}
                    >
                      <div style={{ textAlign: 'center' }}>
                        <div>{topic.total_clients_on_topic}</div>
                        <div style={{ fontSize: '10px', opacity: 0.9 }}>
                          CLIENT{topic.total_clients_on_topic !== 1 ? 'S' : ''}
                        </div>
                      </div>
                      
                      {/* Star indicator */}
                      <div style={{
                        position: 'absolute',
                        top: '-8px',
                        right: '-8px',
                        width: '24px',
                        height: '24px',
                        background: '#fbbf24',
                        borderRadius: '50%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '12px',
                        border: '2px solid white'
                      }}>
                        ⭐
                      </div>
                    </div>
                    
                    {/* Topic label */}
                    <div style={{ 
                      marginTop: '8px',
                      fontSize: '12px',
                      fontWeight: '500',
                      color: '#374151',
                      maxWidth: bubbleSize,
                      wordBreak: 'break-word'
                    }}>
                      {topic.topic}
                    </div>
                    
                    {/* QoS badge */}
                    <div style={{ marginTop: '4px' }}>
                      {getQosBadge(topic.qos)}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </div>

      {/* Details Table */}
      {clientTopics.length > 0 && (
        <div style={{ marginTop: '24px' }}>
          <h3 className="breakdown-title">Subscription Details for {selectedClient}</h3>
          <table className="data-table">
            <thead>
              <tr>
                <th>Topic</th>
                <th>QoS</th>
                <th>Total Clients</th>
                <th>Last Updated</th>
              </tr>
            </thead>
            <tbody>
              {clientTopics.map((topic, index) => (
                <tr key={topic.topic}>
                  <td>{topic.topic}</td>
                  <td>{getQosBadge(topic.qos)}</td>
                  <td>{topic.total_clients_on_topic}</td>
                  <td>{formatDateTime(topic.updated_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
