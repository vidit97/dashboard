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
  const [selectedClient, setSelectedClient] = useState(clientId || 'auto-00BDE9A5-F3A6-8B05-6A76-72A207C1DE3F')
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
      
      const clients = [...new Set(result.data.map(sub => sub.client))].sort()
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
        className="px-2 py-1 text-xs font-medium rounded-full text-white"
        style={{ backgroundColor: color }}
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

  // Calculate bubble size based on client count (better scaling for rows)
  const maxClients = Math.max(...clientTopics.map(t => t.total_clients_on_topic), 1)
  const getBubbleSize = (clientCount: number) => {
    // Scale from 60px to 120px based on popularity
    const scale = Math.sqrt(clientCount / maxClients) // Use square root for better visual scaling
    return `${60 + scale * 60}px` // 60px to 120px
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
        <h3 className="text-lg font-semibold text-gray-900">Per-Client Topic Footprint</h3>
        <div className="flex items-center gap-3">
          <select
            value={selectedClient}
            onChange={(e) => setSelectedClient(e.target.value)}
            className="border border-gray-300 rounded-md px-3 py-1.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {availableClients.map((client) => (
              <option key={client} value={client}>
                {client}
              </option>
            ))}
          </select>
          <button
            onClick={() => fetchClientData(selectedClient)}
            className="px-3 py-1.5 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700 transition-colors"
          >
            Refresh
          </button>
        </div>
      </div>
        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md text-red-700 text-sm">
            {error}
          </div>
        )}

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="bg-blue-50 rounded-lg border border-blue-200 p-4 text-center">
            <div className="text-2xl font-bold text-blue-700">{clientTopics.length}</div>
            <div className="text-sm text-blue-600">Active Subscriptions</div>
          </div>
          <div className="bg-green-50 rounded-lg border border-green-200 p-4 text-center">
            <div className="text-2xl font-bold text-green-700">
              {clientTopics.reduce((sum, t) => sum + t.total_clients_on_topic, 0)}
            </div>
            <div className="text-sm text-green-600">Total Subscribers</div>
          </div>
          <div className="bg-purple-50 rounded-lg border border-purple-200 p-4 text-center">
            <div className="text-2xl font-bold text-purple-700">
              {Math.max(...clientTopics.map(t => t.total_clients_on_topic), 0)}
            </div>
            <div className="text-sm text-purple-600">Max Topic Popularity</div>
          </div>
        </div>

        {/* Topic Bubbles */}
        <div className="mb-8">
          <h4 className="text-lg font-semibold text-gray-800 mb-4 border-b-2 border-blue-200 pb-3">
            Topic Distribution
          </h4>
          <div className="text-sm text-gray-600 mb-6 bg-blue-50 p-3 rounded-lg border border-blue-200">
            <strong>Bubble row: one bubble per topic (size = #active clients on that topic; highlight this client).</strong>
          </div>
          
          {clientTopics.length === 0 ? (
            <div className="text-center py-12 text-gray-500 bg-gray-50 rounded-xl border-2 border-dashed border-gray-300">
              <div className="text-lg font-medium mb-2">No active subscriptions found</div>
              <div className="text-sm">This client is not subscribed to any topics</div>
            </div>
          ) : (
            <div className="space-y-6">
              {clientTopics.map((topic) => {
                const bubbleSize = getBubbleSize(topic.total_clients_on_topic)
                return (
                  <div key={topic.topic} className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg">
                    {/* Topic Label */}
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-gray-900 truncate" title={topic.topic}>
                        {topic.topic}
                      </div>
                      <div className="text-sm text-gray-500">
                        QoS: {getQosBadge(topic.qos)} • Last updated: {formatDateTime(topic.updated_at)}
                      </div>
                    </div>
                    
                    {/* Bubble */}
                    <div className="flex items-center justify-center">
                      <div
                        className="rounded-full bg-blue-500 border-4 border-blue-700 flex items-center justify-center text-white font-bold shadow-lg hover:scale-110 transition-transform cursor-pointer"
                        style={{
                          width: bubbleSize,
                          height: bubbleSize,
                          minWidth: '60px',
                          minHeight: '60px'
                        }}
                        title={`${topic.total_clients_on_topic} total clients on topic: ${topic.topic}`}
                      >
                        <div className="text-center">
                          <div className="text-xs leading-tight">
                            {topic.total_clients_on_topic}
                          </div>
                          <div className="text-xs leading-tight opacity-80">
                            clients
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Details Table */}
        {clientTopics.length > 0 && (
          <div className="border border-gray-200 rounded-lg overflow-hidden">
            <div className="bg-gray-50 px-4 py-3 border-b border-gray-200">
              <h4 className="text-md font-medium text-gray-700">
                Subscription Details for {selectedClient}
              </h4>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Topic</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">QoS</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Total Clients</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Last Updated</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {clientTopics.map((topic, index) => (
                    <tr key={topic.topic} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                      <td className="px-4 py-3 text-sm font-medium text-gray-900">
                        {topic.topic}
                      </td>
                      <td className="px-4 py-3 text-sm">
                        {getQosBadge(topic.qos)}
                      </td>
                      <td className="px-4 py-3 text-sm">
                        <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs font-medium">
                          {topic.total_clients_on_topic} client{topic.total_clients_on_topic !== 1 ? 's' : ''}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-500">
                        {formatDateTime(topic.updated_at)}
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
