import React, { useState, useEffect } from 'react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { GreApiService } from '../services/greApi'
import type { Subscription, TopicSubscription } from '../config/greApi'

interface ActiveSubscriptionsProps {
  className?: string
}

export const ActiveSubscriptions = ({ className }: ActiveSubscriptionsProps) => {
  const [data, setData] = useState({
    subscriptions: [],
    topicBreakdown: []
  })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [showTopN, setShowTopN] = useState(10)

  const fetchData = async () => {
    try {
      setLoading(true)
      setError(null)
      const result = await GreApiService.getActiveSubscriptions()
      setData(result)
    } catch (err) {
      console.error('Error fetching active subscriptions:', err)
      setError(err instanceof Error ? err.message : 'Unknown error')
      // Mock data for demo purposes
      setData({
        subscriptions: [
          { id: '1', client: 'client1', topic: 'sensor/temperature', qos: 1, active: true, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
          { id: '2', client: 'client2', topic: 'sensor/humidity', qos: 2, active: true, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
          { id: '3', client: 'client3', topic: 'sensor/temperature', qos: 0, active: true, created_at: new Date().toISOString(), updated_at: new Date().toISOString() }
        ],
        topicBreakdown: [
          { topic: 'sensor/temperature', count: 2, qos_breakdown: { '0': 1, '1': 1 }, clients: ['client1', 'client3'] },
          { topic: 'sensor/humidity', count: 1, qos_breakdown: { '2': 1 }, clients: ['client2'] }
        ]
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [])

  const chartData = data.topicBreakdown
    .slice(0, showTopN)
    .map(item => ({
      topic: item.topic.length > 20 ? item.topic.substring(0, 20) + '...' : item.topic,
      fullTopic: item.topic,
      count: item.count,
      clients: item.clients.length
    }))

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

  if (loading) {
    return (
      <div className={`chart-section ${className}`}>
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="h-48 bg-gray-200 rounded"></div>
        </div>
      </div>
    )
  }

  return (
    <div className={`chart-section ${className}`}>
      <div className="chart-header">
        <h3 className="text-lg font-semibold text-gray-900">Active Subscriptions</h3>
        <div className="flex items-center gap-4">
          <select
            value={showTopN}
            onChange={(e) => setShowTopN(Number(e.target.value))}
            className="border border-gray-300 rounded px-3 py-1 text-sm"
          >
            <option value={5}>Top 5</option>
            <option value={10}>Top 10</option>
            <option value={20}>Top 20</option>
            <option value={50}>Top 50</option>
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

      <div className="mb-6">
        <h4 className="text-md font-medium text-gray-700 mb-3">Subscriptions by Topic (Top {showTopN})</h4>
        <div style={{ width: '100%', height: '300px' }}>
          <ResponsiveContainer>
            <BarChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 60 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis 
                dataKey="topic" 
                angle={-45}
                textAnchor="end"
                height={80}
                interval={0}
                fontSize={12}
              />
              <YAxis />
              <Tooltip 
                formatter={(value, name) => [
                  typeof value === 'number' ? value.toLocaleString() : value,
                  name === 'count' ? 'Active Subscriptions' : 'Unique Clients'
                ]}
                labelFormatter={(label) => {
                  const item = chartData.find(d => d.topic === label)
                  return item ? `Topic: ${item.fullTopic}` : label
                }}
              />
              <Bar dataKey="count" fill="#3b82f6" name="count" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div>
        <h4 className="text-md font-medium text-gray-700 mb-3">Topic Details</h4>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Topic
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Active Subs
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Unique Clients
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  QoS Distribution
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {data.topicBreakdown.slice(0, showTopN).map((topic, index) => (
                <tr key={topic.topic} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    <div className="max-w-xs truncate" title={topic.topic}>
                      {topic.topic}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {topic.count}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {topic.clients.length}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    <div className="flex gap-1 flex-wrap">
                      {Object.entries(topic.qos_breakdown).map(([qos, count]) => (
                        <div key={qos} className="flex items-center gap-1">
                          {getQosBadge(Number(qos))}
                          <span className="text-xs text-gray-600">({count})</span>
                        </div>
                      ))}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="mt-4 text-sm text-gray-600">
        Total active subscriptions: {data.subscriptions.length} across {data.topicBreakdown.length} topics
      </div>
    </div>
  )
}
