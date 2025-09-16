import React, { useState, useEffect, useCallback } from 'react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { GreApiService } from '../services/greApi'
import type { Subscription, TopicSubscription } from '../config/greApi'

interface ActiveSubscriptionsProps {
  className?: string
  refreshTrigger?: number // Used to trigger refresh from parent
}

export const ActiveSubscriptions = ({ className, refreshTrigger }: ActiveSubscriptionsProps) => {
  const [data, setData] = useState({
    subscriptions: [] as Subscription[],
    topicBreakdown: [] as TopicSubscription[],
    totalCount: 0
  })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showTopN, setShowTopN] = useState(10)

  // Topic selection state
  const [displayMode, setDisplayMode] = useState<'topN' | 'custom'>('topN')
  const [selectedTopics, setSelectedTopics] = useState<string[]>([])
  const [topicSearchInput, setTopicSearchInput] = useState('')
  const [showTopicDropdown, setShowTopicDropdown] = useState(false)

  const fetchData = useCallback(async (forceRefresh = false) => {
    try {
      setLoading(true)
      setError(null)
      const result = await GreApiService.getActiveSubscriptions(undefined, forceRefresh)
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

  // Listen for refresh trigger changes
  useEffect(() => {
    if (refreshTrigger && refreshTrigger > 0) {
      fetchData(true) // Force refresh when trigger changes
    }
  }, [refreshTrigger, fetchData])

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (!(event.target as Element)?.closest('.topic-selector-dropdown')) {
        setShowTopicDropdown(false)
      }
    }

    if (showTopicDropdown) {
      document.addEventListener('click', handleClickOutside)
      return () => document.removeEventListener('click', handleClickOutside)
    }
  }, [showTopicDropdown])

  // Compute chart data based on display mode
  const chartData = React.useMemo(() => {
    let filteredTopics: TopicSubscription[] = []

    if (displayMode === 'topN') {
      filteredTopics = data.topicBreakdown.slice(0, showTopN)
    } else {
      // Custom selection mode - show only selected topics in their original order
      filteredTopics = selectedTopics
        .map(topicName => data.topicBreakdown.find(t => t.topic === topicName))
        .filter(Boolean) as TopicSubscription[]
    }

    return filteredTopics.map(item => ({
      topic: item.topic.length > 25 ? item.topic.substring(0, 25) + '...' : item.topic,
      fullTopic: item.topic,
      count: item.count,
      clients: item.clients.length
    }))
  }, [data.topicBreakdown, displayMode, showTopN, selectedTopics])

  // Available topics for selection (filtered by search)
  const availableTopics = React.useMemo(() => {
    return data.topicBreakdown
      .filter(topic =>
        topicSearchInput === '' ||
        topic.topic.toLowerCase().includes(topicSearchInput.toLowerCase())
      )
      .filter(topic => !selectedTopics.includes(topic.topic))
      .slice(0, 20) // Limit dropdown size
  }, [data.topicBreakdown, topicSearchInput, selectedTopics])

  // Handle topic selection
  const handleAddTopic = (topicName: string) => {
    if (!selectedTopics.includes(topicName) && selectedTopics.length < 10) {
      setSelectedTopics(prev => [...prev, topicName])
      setTopicSearchInput('')
      setShowTopicDropdown(false)
    }
  }

  const handleRemoveTopic = (topicName: string) => {
    setSelectedTopics(prev => prev.filter(t => t !== topicName))
  }

  const handleModeChange = (mode: 'topN' | 'custom') => {
    setDisplayMode(mode)
    if (mode === 'custom' && selectedTopics.length === 0) {
      // Auto-select top 5 topics when switching to custom mode
      setSelectedTopics(data.topicBreakdown.slice(0, 5).map(t => t.topic))
    }
  }

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
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            {/* Display Mode Toggle */}
            <div style={{ display: 'flex', background: '#f3f4f6', borderRadius: '6px', padding: '2px' }}>
              <button
                onClick={() => handleModeChange('topN')}
                style={{
                  padding: '4px 8px',
                  background: displayMode === 'topN' ? '#3b82f6' : 'transparent',
                  color: displayMode === 'topN' ? 'white' : '#374151',
                  border: 'none',
                  borderRadius: '4px',
                  fontSize: '12px',
                  cursor: 'pointer',
                  fontWeight: displayMode === 'topN' ? '500' : 'normal'
                }}
              >
                Top N
              </button>
              <button
                onClick={() => handleModeChange('custom')}
                style={{
                  padding: '4px 8px',
                  background: displayMode === 'custom' ? '#3b82f6' : 'transparent',
                  color: displayMode === 'custom' ? 'white' : '#374151',
                  border: 'none',
                  borderRadius: '4px',
                  fontSize: '12px',
                  cursor: 'pointer',
                  fontWeight: displayMode === 'custom' ? '500' : 'normal'
                }}
              >
                Custom
              </button>
            </div>

            {/* Top N Selector */}
            {displayMode === 'topN' && (
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
            )}

            {/* Custom Topic Selector */}
            {displayMode === 'custom' && (
              <div className="topic-selector-dropdown" style={{ position: 'relative', minWidth: '200px' }}>
                <input
                  type="text"
                  placeholder="Search and add topics..."
                  value={topicSearchInput}
                  onChange={(e) => setTopicSearchInput(e.target.value)}
                  onFocus={() => setShowTopicDropdown(true)}
                  style={{
                    padding: '6px 8px',
                    border: '1px solid #d1d5db',
                    borderRadius: '4px',
                    fontSize: '12px',
                    width: '100%'
                  }}
                />

                {/* Topic Dropdown */}
                {showTopicDropdown && availableTopics.length > 0 && (
                  <div style={{
                    position: 'absolute',
                    top: '100%',
                    left: 0,
                    right: 0,
                    backgroundColor: 'white',
                    border: '1px solid #d1d5db',
                    borderRadius: '4px',
                    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                    zIndex: 1000,
                    maxHeight: '200px',
                    overflowY: 'auto'
                  }}>
                    {availableTopics.map((topic) => (
                      <div
                        key={topic.topic}
                        onClick={() => handleAddTopic(topic.topic)}
                        style={{
                          padding: '8px',
                          cursor: 'pointer',
                          borderBottom: '1px solid #f3f4f6',
                          fontSize: '12px'
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f9fafb'}
                        onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'white'}
                      >
                        <div style={{ fontWeight: '500' }}>{topic.topic}</div>
                        <div style={{ color: '#6b7280', fontSize: '11px' }}>
                          {topic.count} subscriptions, {topic.clients.length} clients
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            <button
              onClick={() => fetchData(true)}
              disabled={loading}
              className={`control-button ${loading ? 'disabled' : ''}`}
            >
              {loading ? 'Refreshing...' : 'Refresh'}
            </button>
          </div>
        </div>

        {/* Selected Topics Display (only in custom mode) */}
        {displayMode === 'custom' && selectedTopics.length > 0 && (
          <div style={{ marginTop: '12px' }}>
            <div style={{ fontSize: '12px', fontWeight: '500', color: '#374151', marginBottom: '6px' }}>
              Selected Topics ({selectedTopics.length}/10):
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
              {selectedTopics.map((topic) => {
                const topicData = data.topicBreakdown.find(t => t.topic === topic)
                return (
                  <div
                    key={topic}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      backgroundColor: '#dbeafe',
                      color: '#1e40af',
                      padding: '4px 8px',
                      borderRadius: '4px',
                      fontSize: '12px',
                      fontWeight: '500',
                      gap: '4px',
                      maxWidth: '200px'
                    }}
                  >
                    <span style={{
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                      flex: 1
                    }} title={topic}>
                      {topic}
                    </span>
                    {topicData && (
                      <span style={{ fontSize: '10px', opacity: 0.8 }}>
                        ({topicData.count})
                      </span>
                    )}
                    <button
                      onClick={() => handleRemoveTopic(topic)}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: 'inherit',
                        cursor: 'pointer',
                        padding: '0',
                        fontSize: '14px',
                        fontWeight: 'bold',
                        lineHeight: 1,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}
                    >
                      ×
                    </button>
                  </div>
                )
              })}
            </div>
          </div>
        )}
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
            {displayMode === 'topN'
              ? `Subscriptions by Topic (Top ${showTopN})`
              : `Subscriptions by Topic (${selectedTopics.length} selected)`
            }
          </h4>
          <div style={{ width: '100%', height: '400px' }}>
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
                    name === 'count' ? 'Active Subscriptions' : 'Unique Devices'
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
                  <th>Unique Devices</th>
                  <th>QoS Distribution</th>
                </tr>
              </thead>
              <tbody>
                {(displayMode === 'topN'
                  ? data.topicBreakdown.slice(0, showTopN)
                  : selectedTopics.map(topicName => data.topicBreakdown.find(t => t.topic === topicName)).filter(Boolean) as TopicSubscription[]
                ).map((topic, index) => (
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
