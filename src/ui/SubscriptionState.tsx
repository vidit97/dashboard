import React, { useState, useEffect } from 'react'
import { GreApiService } from '../services/greApi'
import type { Subscription, TopicSubscription } from '../config/greApi'

interface SubscriptionStateProps {
  className?: string
}

export const SubscriptionState = ({ className }: SubscriptionStateProps) => {
  const [data, setData] = useState({
    activeSubscriptions: [],
    topicBreakdown: []
  })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [selectedTopic, setSelectedTopic] = useState(null)

  const fetchData = async () => {
    try {
      setLoading(true)
      setError(null)
      const result = await GreApiService.getSubscriptionState()
      setData(result)
    } catch (err) {
      console.error('Error fetching subscription state:', err)
      setError(err instanceof Error ? err.message : 'Unknown error')
      // Mock data for demo purposes
      setData({
        activeSubscriptions: [
          { id: '1', client: 'client-sensor-01', topic: 'sensor/temperature', qos: 1, active: true, created_at: '2024-01-15T10:30:00Z', updated_at: '2024-01-15T10:30:00Z' },
          { id: '2', client: 'client-dashboard', topic: 'sensor/temperature', qos: 2, active: true, created_at: '2024-01-15T11:00:00Z', updated_at: '2024-01-15T11:00:00Z' },
          { id: '3', client: 'client-mobile-app', topic: 'alerts/critical', qos: 2, active: true, created_at: '2024-01-15T09:45:00Z', updated_at: '2024-01-15T09:45:00Z' },
          { id: '4', client: 'client-logger', topic: 'logs/system', qos: 0, active: true, created_at: '2024-01-15T08:20:00Z', updated_at: '2024-01-15T08:20:00Z' }
        ],
        topicBreakdown: [
          { topic: 'sensor/temperature', count: 2, qos_breakdown: { '1': 1, '2': 1 }, clients: ['client-sensor-01', 'client-dashboard'] },
          { topic: 'alerts/critical', count: 1, qos_breakdown: { '2': 1 }, clients: ['client-mobile-app'] },
          { topic: 'logs/system', count: 1, qos_breakdown: { '0': 1 }, clients: ['client-logger'] }
        ]
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [])

  const qosColors = {
    0: '#10b981', // emerald
    1: '#f59e0b', // amber
    2: '#ef4444'  // red
  }

  const qosDescriptions = {
    0: 'At most once',
    1: 'At least once', 
    2: 'Exactly once'
  }

  const getQosBadge = (qos: number) => {
    const color = qosColors[qos as keyof typeof qosColors] || '#6b7280'
    const description = qosDescriptions[qos as keyof typeof qosDescriptions] || 'Unknown'
    return (
      <span 
        className="px-2 py-1 text-xs font-medium rounded-full text-white cursor-help"
        style={{ backgroundColor: color }}
        title={description}
      >
        QoS {qos}
      </span>
    )
  }

  const filteredSubscriptions = selectedTopic 
    ? data.activeSubscriptions.filter(sub => sub.topic === selectedTopic)
    : data.activeSubscriptions

  const formatDateTime = (dateString: string) => {
    try {
      return new Date(dateString).toLocaleString()
    } catch {
      return dateString
    }
  }

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
        <h3 className="text-lg font-semibold text-gray-900">Subscription State</h3>
        <div className="flex items-center gap-4">
          <select
            value={selectedTopic || ''}
            onChange={(e) => setSelectedTopic(e.target.value || null)}
            className="border border-gray-300 rounded px-3 py-1 text-sm"
          >
            <option value="">All Topics</option>
            {data.topicBreakdown.map((topic) => (
              <option key={topic.topic} value={topic.topic}>
                {topic.topic} ({topic.count})
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
          <div className="text-2xl font-bold text-blue-600">{data.activeSubscriptions.length}</div>
          <div className="text-sm text-blue-800">Total Active Subscriptions</div>
        </div>
        <div className="bg-green-50 rounded-lg p-4">
          <div className="text-2xl font-bold text-green-600">{data.topicBreakdown.length}</div>
          <div className="text-sm text-green-800">Active Topics</div>
        </div>
        <div className="bg-purple-50 rounded-lg p-4">
          <div className="text-2xl font-bold text-purple-600">
            {new Set(data.activeSubscriptions.map(s => s.client)).size}
          </div>
          <div className="text-sm text-purple-800">Unique Clients</div>
        </div>
      </div>

      <div className="mb-6">
        <h4 className="text-md font-medium text-gray-700 mb-3">
          QoS Distribution {selectedTopic && `for ${selectedTopic}`}
        </h4>
        <div className="flex gap-2 flex-wrap">
          {Object.entries(
            filteredSubscriptions.reduce((acc, sub) => {
              acc[sub.qos] = (acc[sub.qos] || 0) + 1
              return acc
            }, {} as Record<number, number>)
          ).map(([qos, count]) => (
            <div key={qos} className="flex items-center gap-2 bg-gray-50 rounded-lg p-3">
              {getQosBadge(Number(qos))}
              <span className="text-sm font-medium">{count} subscription{count !== 1 ? 's' : ''}</span>
            </div>
          ))}
        </div>
      </div>

      <div>
        <h4 className="text-md font-medium text-gray-700 mb-3">
          Active Subscriptions {selectedTopic && `for ${selectedTopic}`} ({filteredSubscriptions.length})
        </h4>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Client ID
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Topic
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  QoS
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Created
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Last Updated
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredSubscriptions.map((subscription, index) => (
                <tr key={subscription.id} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    <div className="max-w-xs truncate" title={subscription.client}>
                      {subscription.client}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    <div className="max-w-xs truncate" title={subscription.topic}>
                      {subscription.topic}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {getQosBadge(subscription.qos)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {formatDateTime(subscription.created_at)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {formatDateTime(subscription.updated_at)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {filteredSubscriptions.length === 0 && !loading && (
        <div className="text-center py-8 text-gray-500">
          {selectedTopic ? `No active subscriptions found for ${selectedTopic}` : 'No active subscriptions found'}
        </div>
      )}
    </div>
  )
}
