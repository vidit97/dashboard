import React, { useState, useEffect, useCallback } from 'react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { GreApiService } from '../services/greApi'
import type { Subscription, TopicSubscription } from '../config/greApi'

interface ActiveSubscriptionsProps {
  className?: string
}

export const ActiveSubscriptions = ({ className }: ActiveSubscriptionsProps) => {
  const [data, setData] = useState({
    subscriptions: [] as Subscription[],
    topicBreakdown: [] as TopicSubscription[],
    totalCount: 0
  })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showTopN, setShowTopN] = useState(10)

  const fetchData = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const result = await GreApiService.getActiveSubscriptions()
      setData(result)
    } catch (err) {
      console.error('Error fetching active subscriptions:', err)
      setError(err instanceof Error ? err.message : 'Failed to load subscriptions data')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const chartData = data.topicBreakdown
    .slice(0, showTopN)
    .map(item => ({
      topic: item.topic.length > 25 ? item.topic.substring(0, 25) + '...' : item.topic,
      fullTopic: item.topic,
      count: item.count,
      clients: item.clients.length
    }))

  const qosColors = {
    0: '#10b981', // emerald-500
    1: '#f59e0b', // amber-500
    2: '#ef4444'  // red-500
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
        className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium text-white"
        style={{ backgroundColor: color }}
        title={description}
      >
        QoS {qos}
      </span>
    )
  }


  if (loading) {
    return (
      <div className={`bg-white rounded-lg shadow-sm border p-6 ${className}`}>
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 rounded w-1/3 mb-4"></div>
          <div className="h-4 bg-gray-200 rounded w-1/4 mb-6"></div>
          <div className="h-64 bg-gray-200 rounded mb-6"></div>
          <div className="h-32 bg-gray-200 rounded"></div>
        </div>
      </div>
    )
  }

  return (
    <div className={`bg-white rounded-lg shadow-sm border ${className}`}>
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-xl font-semibold text-gray-900">Active Subscriptions</h3>
            <p className="mt-1 text-sm text-gray-500">
              Real-time view of active MQTT subscriptions by topic
            </p>
          </div>
          <div className="chart-controls">
            <label htmlFor="topN-select" className="sr-only">Show top</label>
            <select
              id="topN-select"
              value={showTopN}
              onChange={(e) => setShowTopN(Number(e.target.value))}
              className="select"
            >
              <option value={5}>5</option>
              <option value={10}>10</option>
              <option value={20}>20</option>
              <option value={50}>50</option>
            </select>
            <button
              onClick={fetchData}
              disabled={loading}
              className="button-secondary"
            >
              {loading ? 'Refreshing...' : 'Refresh'}
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-6">
        {error && (
          <div className="mb-6 rounded-md bg-red-50 p-4 border border-red-200">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-red-800">Error loading data</h3>
                <div className="mt-2 text-sm text-red-700">{error}</div>
              </div>
            </div>
          </div>
        )}

  {/* Statistics moved to SubscriptionState to avoid duplication */}

        {/* Chart Section */}
        <div className="mb-8">
          <h4 className="text-lg font-medium text-gray-900 mb-4">
            Subscriptions by Topic (Top {showTopN})
          </h4>
          <div className="bg-gray-50 rounded-lg p-4" style={{ height: '400px' }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 80 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis 
                  dataKey="topic" 
                  angle={-45}
                  textAnchor="end"
                  height={80}
                  interval={0}
                  fontSize={11}
                  stroke="#6b7280"
                />
                <YAxis fontSize={11} stroke="#6b7280" />
                <Tooltip 
                  formatter={(value, name) => [
                    typeof value === 'number' ? value.toLocaleString() : value,
                    name === 'count' ? 'Active Subscriptions' : 'Unique Clients'
                  ]}
                  labelFormatter={(label) => {
                    const item = chartData.find(d => d.topic === label)
                    return item ? `Topic: ${item.fullTopic}` : label
                  }}
                  contentStyle={{
                    backgroundColor: '#f9fafb',
                    border: '1px solid #e5e7eb',
                    borderRadius: '6px'
                  }}
                />
                <Bar dataKey="count" fill="#3b82f6" radius={[2, 2, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Topic Details Table */}
        <div>
          <h4 className="text-lg font-medium text-gray-900 mb-4">Topic Details</h4>
          <div className="overflow-hidden shadow ring-1 ring-black ring-opacity-5 rounded-lg">
            <table className="min-w-full divide-y divide-gray-300">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Topic
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Active Subscriptions
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
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900 max-w-xs truncate" title={topic.topic}>
                        {topic.topic}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900 font-medium">{topic.count}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{topic.clients.length}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex gap-2 flex-wrap">
                        {Object.entries(topic.qos_breakdown).map(([qos, count]) => (
                          <div key={qos} className="flex items-center space-x-1">
                            {getQosBadge(Number(qos))}
                            <span className="text-xs text-gray-500">({count})</span>
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

        {data.topicBreakdown.length === 0 && !loading && !error && (
          <div className="text-center py-12">
            <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2M4 13h2m13-8V4a1 1 0 00-1-1H7a1 1 0 00-1 1v1" />
            </svg>
            <h3 className="mt-2 text-sm font-medium text-gray-900">No active subscriptions</h3>
            <p className="mt-1 text-sm text-gray-500">There are currently no active MQTT subscriptions.</p>
          </div>
        )}
      </div>
    </div>
  )
}
