import React, { useState, useEffect } from 'react'
import { ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts'
import { GreApiService } from '../services/greApi'
import type { ClientTopicFootprint as ClientTopicFootprintType } from '../config/greApi'

interface ClientTopicFootprintProps {
  className?: string
}

export const ClientTopicFootprintChart = ({ className }: ClientTopicFootprintProps) => {
  const [data, setData] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [selectedClient, setSelectedClient] = useState(null)
  const [viewMode, setViewMode] = useState('bubble') // 'bubble' or 'table'

  const fetchData = async () => {
    try {
      setLoading(true)
      setError(null)
      const result = await GreApiService.getClientTopicFootprints()
      setData(result)
    } catch (err) {
      console.error('Error fetching client topic footprints:', err)
      setError(err instanceof Error ? err.message : 'Unknown error')
      // Mock data for demo purposes
      setData([
        {
          client: 'sensor-controller-01',
          topics: [
            { topic: 'sensor/temperature', qos: 1, total_clients_on_topic: 5, created_at: '2024-01-15T10:30:00Z' },
            { topic: 'sensor/humidity', qos: 1, total_clients_on_topic: 3, created_at: '2024-01-15T10:31:00Z' },
            { topic: 'alerts/critical', qos: 2, total_clients_on_topic: 8, created_at: '2024-01-15T10:32:00Z' }
          ]
        },
        {
          client: 'dashboard-main',
          topics: [
            { topic: 'sensor/temperature', qos: 2, total_clients_on_topic: 5, created_at: '2024-01-15T11:00:00Z' },
            { topic: 'system/status', qos: 1, total_clients_on_topic: 2, created_at: '2024-01-15T11:01:00Z' }
          ]
        },
        {
          client: 'mobile-app-user123',
          topics: [
            { topic: 'alerts/critical', qos: 2, total_clients_on_topic: 8, created_at: '2024-01-15T09:45:00Z' }
          ]
        }
      ])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [])

  // Prepare bubble chart data
  const bubbleData = data.flatMap((client, clientIndex) =>
    client.topics.map((topic, topicIndex) => ({
      x: clientIndex,
      y: topicIndex,
      z: topic.total_clients_on_topic,
      client: client.client,
      topic: topic.topic,
      qos: topic.qos,
      total_clients: topic.total_clients_on_topic,
      created_at: topic.created_at
    }))
  )

  const qosColors = {
    0: '#10b981', // emerald
    1: '#f59e0b', // amber
    2: '#ef4444'  // red
  }

  const getQosBadge = (qos) => {
    const color = qosColors[qos] || '#6b7280'
    return (
      <span 
        className="px-2 py-1 text-xs font-medium rounded-full text-white"
        style={{ backgroundColor: color }}
      >
        QoS {qos}
      </span>
    )
  }

  const formatDateTime = (dateString) => {
    try {
      return new Date(dateString).toLocaleString()
    } catch {
      return dateString
    }
  }

  const filteredData = selectedClient 
    ? data.filter(client => client.client === selectedClient)
    : data

  if (loading) {
    return (
      <div className={`bg-white rounded-lg shadow p-6 ${className}`}>
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="h-48 bg-gray-200 rounded"></div>
        </div>
      </div>
    )
  }

  return (
    <div className={`bg-white rounded-lg shadow p-6 ${className}`}>
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold text-gray-900">Per-Client Topic Footprint</h3>
        <div className="flex items-center gap-4">
          <select
            value={viewMode}
            onChange={(e) => setViewMode(e.target.value)}
            className="border border-gray-300 rounded px-3 py-1 text-sm"
          >
            <option value="bubble">Bubble Chart</option>
            <option value="table">Table View</option>
          </select>
          <select
            value={selectedClient || ''}
            onChange={(e) => setSelectedClient(e.target.value || null)}
            className="border border-gray-300 rounded px-3 py-1 text-sm"
          >
            <option value="">All Clients</option>
            {data.map((client) => (
              <option key={client.client} value={client.client}>
                {client.client} ({client.topics.length} topics)
              </option>
            ))}
          </select>
          <button
            onClick={fetchData}
            className="px-3 py-1 bg-blue-500 text-white text-sm rounded hover:bg-blue-600"
          >
            Refresh
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded text-red-700 text-sm">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-blue-50 rounded-lg p-4">
          <div className="text-2xl font-bold text-blue-600">{data.length}</div>
          <div className="text-sm text-blue-800">Active Clients</div>
        </div>
        <div className="bg-green-50 rounded-lg p-4">
          <div className="text-2xl font-bold text-green-600">
            {data.reduce((total, client) => total + client.topics.length, 0)}
          </div>
          <div className="text-sm text-green-800">Total Subscriptions</div>
        </div>
        <div className="bg-purple-50 rounded-lg p-4">
          <div className="text-2xl font-bold text-purple-600">
            {new Set(data.flatMap(client => client.topics.map(t => t.topic))).size}
          </div>
          <div className="text-sm text-purple-800">Unique Topics</div>
        </div>
      </div>

      {viewMode === 'bubble' && (
        <div className="mb-6">
          <h4 className="text-md font-medium text-gray-700 mb-3">
            Topic Distribution Visualization
          </h4>
          <div className="text-sm text-gray-600 mb-3">
            Bubble size represents the total number of clients subscribed to each topic
          </div>
          <div style={{ width: '100%', height: '400px' }}>
            <ResponsiveContainer>
              <ScatterChart margin={{ top: 20, right: 20, bottom: 60, left: 100 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  type="number" 
                  dataKey="x"
                  domain={[0, Math.max(1, data.length - 1)]}
                  tickFormatter={(value) => {
                    const client = data[value]
                    return client ? (client.client.length > 15 ? client.client.substring(0, 15) + '...' : client.client) : ''
                  }}
                  interval={0}
                  angle={-45}
                  textAnchor="end"
                  height={80}
                />
                <YAxis 
                  type="number" 
                  dataKey="y"
                  tickFormatter={(value) => `Topic ${value + 1}`}
                />
                <Tooltip 
                  formatter={(value, name) => {
                    if (name === 'z') return [value, 'Total Clients on Topic']
                    return [value, name]
                  }}
                  labelFormatter={(label, payload) => {
                    if (payload && payload[0]) {
                      const data = payload[0].payload
                      return `${data.client} → ${data.topic}`
                    }
                    return label
                  }}
                  content={({ active, payload }) => {
                    if (active && payload && payload[0]) {
                      const data = payload[0].payload
                      return (
                        <div className="bg-white p-3 border border-gray-200 rounded shadow">
                          <div className="font-medium">{data.client}</div>
                          <div className="text-sm text-gray-600">Topic: {data.topic}</div>
                          <div className="text-sm text-gray-600">QoS: {data.qos}</div>
                          <div className="text-sm text-gray-600">Total clients on this topic: {data.total_clients}</div>
                          <div className="text-sm text-gray-600">Subscribed: {formatDateTime(data.created_at)}</div>
                        </div>
                      )
                    }
                    return null
                  }}
                />
                <Scatter dataKey="z" data={bubbleData}>
                  {bubbleData.map((entry, index) => (
                    <Cell 
                      key={`cell-${index}`} 
                      fill={qosColors[entry.qos] || '#6b7280'} 
                    />
                  ))}
                </Scatter>
              </ScatterChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      <div>
        <h4 className="text-md font-medium text-gray-700 mb-3">
          Client Details {selectedClient && `for ${selectedClient}`}
        </h4>
        <div className="space-y-4">
          {filteredData.map((client) => (
            <div key={client.client} className="border border-gray-200 rounded-lg p-4">
              <div className="flex justify-between items-center mb-3">
                <h5 className="font-medium text-gray-900">{client.client}</h5>
                <span className="text-sm text-gray-500">{client.topics.length} topic{client.topics.length !== 1 ? 's' : ''}</span>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Topic</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">QoS</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Total Clients</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Subscribed</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {client.topics.map((topic, index) => (
                      <tr key={`${client.client}-${topic.topic}`} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                        <td className="px-4 py-2 text-sm text-gray-900">
                          <div className="max-w-xs truncate" title={topic.topic}>
                            {topic.topic}
                          </div>
                        </td>
                        <td className="px-4 py-2 text-sm text-gray-500">
                          {getQosBadge(topic.qos)}
                        </td>
                        <td className="px-4 py-2 text-sm text-gray-500">
                          <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs">
                            {topic.total_clients_on_topic} client{topic.total_clients_on_topic !== 1 ? 's' : ''}
                          </span>
                        </td>
                        <td className="px-4 py-2 text-sm text-gray-500">
                          {formatDateTime(topic.created_at)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
        </div>
      </div>

      {filteredData.length === 0 && !loading && (
        <div className="text-center py-8 text-gray-500">
          {selectedClient ? `No subscription data found for ${selectedClient}` : 'No client subscription data found'}
        </div>
      )}
    </div>
  )
}
