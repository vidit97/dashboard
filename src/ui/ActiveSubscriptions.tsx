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

  const qosDescriptions = {
    0: 'At most once',
    1: 'At least once', 
    2: 'Exactly once'
  }

  const getQosBadge = (qos: number) => {
    const description = qosDescriptions[qos as keyof typeof qosDescriptions] || 'Unknown'
    return (
      <span 
        className={`status-badge status-qos-${qos}`}
        title={description}
      >
        QoS {qos}
      </span>
    )
  }


  if (loading) {
    return (
      <div className={`chart-section ${className}`}>
        <div className="loading-placeholder">
          <div className="skeleton-text skeleton-large"></div>
          <div className="skeleton-text skeleton-medium"></div>
          <div className="skeleton-chart"></div>
          <div className="skeleton-table"></div>
        </div>
      </div>
    )
  }

  return (
    <div className={`chart-section ${className}`}>
      {/* Header */}
      <div className="chart-header">
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}>
          <div>
            <h3 className="chart-title">
              Active Subscriptions
            </h3>
            <p className="chart-subtitle">
              Real-time view of active MQTT subscriptions by topic
            </p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <select
              value={showTopN}
              onChange={(e) => setShowTopN(Number(e.target.value))}
              className="control-select"
            >
              <option value={5}>Top 5</option>
              <option value={10}>Top 10</option>
              <option value={20}>Top 20</option>
              <option value={50}>Top 50</option>
            </select>
            <button
              onClick={fetchData}
              disabled={loading}
              className={`control-button ${loading ? 'disabled' : ''}`}
            >
              {loading ? 'Refreshing...' : 'Refresh'}
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="chart-content">
        {error && (
          <div className="error-message">
            <div className="error-icon">
              <svg viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            </div>
            <div>
              <h3 className="error-title">Error loading data</h3>
              <div className="error-details">{error}</div>
            </div>
          </div>
        )}

        {/* Chart Section */}
        <div style={{ marginBottom: '20px' }}>
          <h4 className="section-title">
            Subscriptions by Topic (Top {showTopN})
          </h4>
          <div className="chart-container">
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
          <h4 className="section-title">
            Topic Details
          </h4>
          <div className="table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Topic</th>
                  <th>Active Subscriptions</th>
                  <th>Unique Clients</th>
                  <th>QoS Distribution</th>
                </tr>
              </thead>
              <tbody>
                {data.topicBreakdown.slice(0, showTopN).map((topic, index) => (
                  <tr key={topic.topic}>
                    <td>
                      <div className="topic-name" title={topic.topic}>
                        {topic.topic}
                      </div>
                    </td>
                    <td className="text-center">
                      <div className="metric-value-small">
                        {topic.count}
                      </div>
                    </td>
                    <td className="text-center">
                      <div className="text-default">
                        {topic.clients.length}
                      </div>
                    </td>
                    <td>
                      <div className="qos-badges">
                        {Object.entries(topic.qos_breakdown).map(([qos, count]) => (
                          <div key={qos} className="qos-item">
                            {getQosBadge(Number(qos))}
                            <span className="qos-count">({count})</span>
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
          <div className="no-data">
            <svg className="no-data-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2M4 13h2m13-8V4a1 1 0 00-1-1H7a1 1 0 00-1 1v1" />
            </svg>
            <h3 className="no-data-title">No active subscriptions</h3>
            <p className="no-data-text">
              There are currently no active MQTT subscriptions.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
